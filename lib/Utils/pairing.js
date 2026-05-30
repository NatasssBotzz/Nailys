// @ts-nocheck
import readline from 'node:readline';
export const DEFAULT_CUSTOM_PAIRING_CODE = 'NATASSBZ';
export function onlyNumber(value = '') {
    return String(value || '').replace(/\D/g, '');
}
export function normalizePhoneNumber(number = '') {
    const clean = onlyNumber(number);
    if (!clean)
        return '';
    if (clean.startsWith('0'))
        return `62${clean.slice(1)}`;
    if (clean.startsWith('8'))
        return `62${clean}`;
    return clean;
}
export function normalizeCustomPairingCode(code = DEFAULT_CUSTOM_PAIRING_CODE, length = 8) {
    const clean = String(code || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, length);
    if (!clean)
        return null;
    if (clean.length !== length) {
        throw new Error(`Custom pairing code harus tepat ${length} huruf/angka. Sekarang: ${clean.length}`);
    }
    return clean;
}
export function formatPairingCode(code = '') {
    const clean = String(code || '').replace(/-/g, '').toUpperCase();
    return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}
export function sleep(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function createQuestioner() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return {
        question(text) {
            return new Promise(resolve => rl.question(text, resolve));
        },
        close() {
            try {
                rl.close();
            }
            catch { }
        }
    };
}
function logWith(logger, method, ...args) {
    if (typeof logger?.[method] === 'function')
        return logger[method](...args);
    if (method === 'ok' && typeof logger?.log === 'function')
        return logger.log(...args);
    if (typeof logger?.log === 'function')
        return logger.log(...args);
}
function pickOption(options = {}, ...keys) {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(options, key) && options[key] !== undefined)
            return options[key];
    }
    return undefined;
}
export async function requestCustomPairingCode(sock, state = null, options = {}) {
    if (state && !state.creds && !state.authState && typeof state === 'object' && Object.keys(options || {}).length === 0) {
        options = state;
        state = null;
    }
    const creds = state?.creds || state?.authState?.creds || sock?.authState?.creds;
    if (creds?.registered)
        return null;
    if (!sock?.requestPairingCode)
        throw new Error('Socket Naileys tidak mendukung requestPairingCode().');
    const logger = pickOption(options, 'logger', 'Logger') || console;
    const delayMs = Number(pickOption(options, 'delayMs', 'DelayMs', 'delay') ?? 3000);
    const custom = pickOption(options, 'custom', 'Custom') !== false;
    const rawCustomCode = pickOption(options, 'CustomCode', 'customCode', 'code', 'pairingCode') || DEFAULT_CUSTOM_PAIRING_CODE;
    const rawPairingNumber = pickOption(options, 'phoneNumber', 'PhoneNumber', 'pairingNumber', 'PairingNumber', 'number', 'Number') || '';
    const input = createQuestioner();
    try {
        const rawPhone = rawPairingNumber || await input.question('Masukkan nomor bot tanpa + (contoh 628xxxx): ');
        const phoneNumber = normalizePhoneNumber(rawPhone);
        if (!phoneNumber) {
            logWith(logger, 'warn', 'Nomor kosong, QR akan dipakai jika tersedia.');
            return null;
        }
        const pairingCode = custom ? normalizeCustomPairingCode(rawCustomCode) : null;
        if (delayMs > 0)
            await sleep(delayMs);
        logWith(logger, 'info', '==========================================');
        logWith(logger, 'info', '             PAIRING NAILEYS              ');
        logWith(logger, 'info', '==========================================');
        logWith(logger, 'info', `Nomor bot : ${phoneNumber}`);
        logWith(logger, 'info', `Mode      : ${pairingCode ? 'CUSTOM' : 'RANDOM/AUTO'}`);
        if (pairingCode)
            logWith(logger, 'info', `Custom    : ${pairingCode}`);
        const result = pairingCode
            ? await sock.requestPairingCode(phoneNumber, pairingCode)
            : await sock.requestPairingCode(phoneNumber);
        const finalCode = result || pairingCode;
        logWith(logger, 'ok', `[OK] Pairing Code : ${formatPairingCode(finalCode)}`);
        logWith(logger, 'ok', `[OK] Tanpa strip  : ${String(finalCode || '').replace(/-/g, '')}`);
        logWith(logger, 'info', 'Buka WhatsApp utama > Perangkat tertaut > Tautkan dengan nomor telepon.');
        logWith(logger, 'info', 'Ketik kode TANPA tanda strip. Contoh: NATASSBZ, bukan NATA-SSBZ.');
        logWith(logger, 'info', '==========================================');
        return finalCode;
    }
    finally {
        input.close();
    }
}
export const requestNatasssPairingCode = requestCustomPairingCode;
export function waitForQrPairing(sock, options = {}) {
    const logger = pickOption(options, 'logger', 'Logger') || console;
    const timeoutMs = Number(pickOption(options, 'timeoutMs', 'TimeoutMs') ?? 120000);
    const printQR = pickOption(options, 'printQR', 'PrintQR') === true;
    const onQR = pickOption(options, 'onQR', 'OnQR');
    return new Promise((resolve, reject) => {
        let done = false;
        let timer = null;
        const cleanup = () => {
            if (timer)
                clearTimeout(timer);
            try {
                sock?.ev?.off?.('connection.update', handler);
            }
            catch { }
        };
        const finish = (err, value) => {
            if (done)
                return;
            done = true;
            cleanup();
            err ? reject(err) : resolve(value);
        };
        const handler = async (update) => {
            const qr = update?.qr;
            if (!qr)
                return;
            try {
                if (typeof onQR === 'function')
                    onQR(qr, update);
                if (printQR) {
                    try {
                        const qrcode = await import('qrcode-terminal');
                        qrcode.default?.generate ? qrcode.default.generate(qr, { small: true }) : qrcode.generate(qr, { small: true });
                    }
                    catch {
                        logWith(logger, 'info', qr);
                    }
                }
                else {
                    logWith(logger, 'info', 'QR pairing tersedia. Gunakan callback onQR/OnQR untuk menampilkannya.');
                }
                finish(null, qr);
            }
            catch (error) {
                finish(error);
            }
        };
        sock?.ev?.on?.('connection.update', handler);
        if (timeoutMs > 0)
            timer = setTimeout(() => finish(new Error('Timeout menunggu QR pairing.')), timeoutMs);
    });
}
export async function pairing(sock, type = 0, options = {}) {
    if (!sock)
        throw new Error('Socket Naileys diperlukan untuk pairing().');
    if (typeof type === 'object' && type !== null) {
        options = type;
        type = pickOption(options, 'type', 'Type', 'mode', 'Mode') ?? 0;
    }
    const mode = Number(type);
    if (mode === 1)
        return await waitForQrPairing(sock, options);
    if (mode === 0)
        return await requestCustomPairingCode(sock, sock.authState, options);
    throw new Error('Tipe pairing tidak dikenal. Gunakan 0 untuk kode, 1 untuk QR.');
}
export default pairing;
