// @ts-nocheck
// ============================================================
// Naileys.ts — Semua builder class & patch functions
// Dipindahkan dari bot/lib/*.js ke dalam source Baileys
// ============================================================
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _UpchBuilder_sock, _UpchBuilder_media, _UpchBuilder_caption, _UpchBuilder_ptv, _UpchBuilder_type, _AIRich_client, _ButtonV2_client, _InteractiveBuilder_instances, _InteractiveBuilder_sock, _InteractiveBuilder_title, _InteractiveBuilder_body, _InteractiveBuilder_footer, _InteractiveBuilder_buttons, _InteractiveBuilder_bottomSheet, _InteractiveBuilder_contextInfo, _InteractiveBuilder_offer, _InteractiveBuilder_parseBtnArgs, _CarouselCardBuilder_instances, _CarouselCardBuilder_sock, _CarouselCardBuilder_title, _CarouselCardBuilder_subtitle, _CarouselCardBuilder_body, _CarouselCardBuilder_footer, _CarouselCardBuilder_media, _CarouselCardBuilder_buttons, _CarouselCardBuilder_offer, _CarouselCardBuilder_parseBtnArgs, _CarouselBuilder_sock, _CarouselBuilder_body, _CarouselBuilder_footer, _CarouselBuilder_cards, _CarouselBuilder_offer, _CarouselBuilder_contextInfo, _OrderBuilder_sock, _OrderBuilder_state, _LinkPreviewBuilder_sock, _LinkPreviewBuilder_imageInput, _LinkPreviewBuilder_text, _LinkPreviewBuilder_title, _LinkPreviewBuilder_description, _LinkPreviewBuilder_link, _LinkPreviewBuilder_previewType;
// ── Node built-ins ──────────────────────────────────────────
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'node:readline';
import { execFile } from 'child_process';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { PassThrough, Readable } from 'stream';
import { createRequire } from 'module';
// ── External packages (lazy-loaded for optional dependencies) ─
const _require = createRequire(import.meta.url);
function loadSharp() {
    try {
        return _require('sharp');
    }
    catch {
        return null;
    }
}
function loadFluentFfmpeg() {
    try {
        return _require('fluent-ffmpeg');
    }
    catch {
        return null;
    }
}
function loadWebpmux() {
    try {
        const m = _require('node-webpmux');
        return m?.default || m;
    }
    catch {
        return null;
    }
}
function loadArchiver() {
    try {
        const a = _require('archiver');
        if (a) {
            if (typeof a === 'function')
                return a;
            const Ctor = a.default || a.ZipArchive;
            if (Ctor && typeof Ctor === 'function') {
                return function (format, options) { return new Ctor(options); };
            }
        }
        return a;
    }
    catch {
        return null;
    }
}
function loadJSZip() {
    try {
        return _require('jszip');
    }
    catch {
        return null;
    }
}
import $protobuf from 'protobufjs/minimal.js';
// ── Baileys internal imports ────────────────────────────────
import { proto } from '../WAProto/index.js';
import { prepareWAMessageMedia, generateWAMessageFromContent, generateWAMessageContent, generateWAMessage, downloadMediaMessage } from './Utils/messages.js';
import { downloadContentFromMessage, encryptedStream } from './Utils/messages-media.js';
import { getContentType } from './Utils/messages.js';
import { generateMessageIDV2 } from './Utils/generics.js';
import { jidEncode, jidNormalizedUser, S_WHATSAPP_NET, isJidNewsletter, isPnUser, isLidUser } from './WABinary/jid-utils.js';
// ── Helpers ─────────────────────────────────────────────────
const { subtle } = crypto.webcrypto || crypto;
const execFileAsync = promisify(execFile);
const $Writer = $protobuf.Writer;
const $Reader = $protobuf.Reader;
const STICKER_PACK_MAX_ITEMS = 30;
// ============================================================
// PAIRING
// (dipindahkan dari lib/pairing.js)
// ============================================================
const CROCKFORD_CHARACTERS = '123456789ABCDEFGHJKLMNPQRSTVWXYZ';
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
    if (clean.length !== length)
        throw new Error(`Custom pairing code harus tepat ${length} karakter. Sekarang: ${clean.length}`);
    return clean;
}
export function formatPairingCode(code = '') {
    const clean = String(code || '').replace(/-/g, '').toUpperCase();
    return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}
function bytesToCrockford(buffer) {
    let value = 0;
    let bitCount = 0;
    const out = [];
    for (const byte of buffer) {
        value = (value << 8) | (byte & 0xff);
        bitCount += 8;
        while (bitCount >= 5) {
            out.push(CROCKFORD_CHARACTERS.charAt((value >>> (bitCount - 5)) & 31));
            bitCount -= 5;
        }
    }
    if (bitCount > 0)
        out.push(CROCKFORD_CHARACTERS.charAt((value << (5 - bitCount)) & 31));
    return out.join('');
}
async function derivePairingCodeKey(pairingCode, salt) {
    const encoder = new TextEncoder();
    const pairingCodeBuffer = encoder.encode(pairingCode);
    const saltBuffer = new Uint8Array(salt);
    const keyMaterial = await subtle.importKey('raw', pairingCodeBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);
    const derivedBits = await subtle.deriveBits({ name: 'PBKDF2', salt: saltBuffer, iterations: (2 << 16), hash: 'SHA-256' }, keyMaterial, 32 * 8);
    return Buffer.from(derivedBits);
}
function aesEncryptCTR(plaintext, key, iv) {
    const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
    return Buffer.concat([cipher.update(plaintext), cipher.final()]);
}
function question(text) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(text, (answer) => {
        rl.close();
        resolve(answer);
    }));
}
export function patchPairing(sock) {
    if (!sock)
        return sock;
    const originalRequestPairingCode = sock.requestPairingCode?.bind(sock);
    sock.requestCustomPairingCode = async (phoneNumber, customPairingCode = DEFAULT_CUSTOM_PAIRING_CODE) => {
        phoneNumber = normalizePhoneNumber(phoneNumber);
        const pairingCode = normalizeCustomPairingCode(customPairingCode || bytesToCrockford(crypto.randomBytes(5)));
        if (!phoneNumber)
            throw new Error('Nomor bot kosong');
        try {
            if (originalRequestPairingCode && originalRequestPairingCode.length >= 2) {
                return await originalRequestPairingCode(phoneNumber, pairingCode);
            }
        }
        catch (e) {
            console.log('[custom pairing] native gagal, pakai manual:', e?.message || e);
        }
        if (!sock.authState?.creds?.pairingEphemeralKeyPair?.public) {
            if (originalRequestPairingCode)
                return await originalRequestPairingCode(phoneNumber);
            throw new Error('pairingEphemeralKeyPair tidak tersedia');
        }
        sock.authState.creds.pairingCode = pairingCode;
        sock.authState.creds.me = {
            id: jidEncode(phoneNumber, 's.whatsapp.net'),
            name: '~'
        };
        sock.ev.emit('creds.update', sock.authState.creds);
        const generatePairingKey = async () => {
            const salt = crypto.randomBytes(32);
            const randomIv = crypto.randomBytes(16);
            const key = await derivePairingCodeKey(pairingCode, salt);
            const ciphered = aesEncryptCTR(sock.authState.creds.pairingEphemeralKeyPair.public, key, randomIv);
            return Buffer.concat([salt, randomIv, ciphered]);
        };
        await sock.query({
            tag: 'iq',
            attrs: { to: S_WHATSAPP_NET, type: 'set', id: sock.generateMessageTag(), xmlns: 'md' },
            content: [
                {
                    tag: 'link_code_companion_reg',
                    attrs: {
                        jid: sock.authState.creds.me.id,
                        stage: 'companion_hello',
                        should_show_push_notification: 'true'
                    },
                    content: [
                        {
                            tag: 'link_code_pairing_wrapped_companion_ephemeral_pub',
                            attrs: {},
                            content: await generatePairingKey()
                        },
                        { tag: 'companion_server_auth_key_pub', attrs: {}, content: sock.authState.creds.noiseKey.public },
                        { tag: 'companion_platform_id', attrs: {}, content: '1' },
                        { tag: 'companion_platform_display', attrs: {}, content: 'Chrome (Linux)' },
                        { tag: 'link_code_pairing_nonce', attrs: {}, content: '0' }
                    ]
                }
            ]
        });
        return pairingCode;
    };
    sock.requestPairingCode = async (phoneNumber, customPairingCode) => {
        if (customPairingCode)
            return await sock.requestCustomPairingCode(phoneNumber, customPairingCode);
        if (originalRequestPairingCode)
            return await originalRequestPairingCode(normalizePhoneNumber(phoneNumber));
        return await sock.requestCustomPairingCode(phoneNumber, bytesToCrockford(crypto.randomBytes(5)) || 'NATASSBZ');
    };
    sock.pairing = async (type = 0, options = {}) => {
        if (typeof type === 'object') {
            options = type;
            type = options.type ?? 0;
        }
        if (Number(type) === 1)
            throw new Error('QR pairing tidak diaktifkan di patch ini');
        const phoneNumber = normalizePhoneNumber(options.phoneNumber || options.PhoneNumber || options.number || '') ||
            normalizePhoneNumber(await question('Nomor bot: '));
        const customCode = options.CustomCode || options.customCode || options.code || options.pairingCode || DEFAULT_CUSTOM_PAIRING_CODE;
        return await sock.requestCustomPairingCode(phoneNumber, customCode);
    };
    return sock;
}
// ============================================================
// SWGC — WhatsApp Status Group Content
// (dipindahkan dari lib/swgc.js)
// ============================================================
let _patched = false;
export function patch_proto() {
    if (_patched)
        return;
    _patched = true;
    const sam = proto?.ContextInfo?.StatusAudienceMetadata;
    if (!sam)
        return;
    const at = sam.AudienceType || {};
    at[0] = 'UNKNOWN';
    at['UNKNOWN'] = 0;
    at[1] = 'CLOSE_FRIENDS';
    at['CLOSE_FRIENDS'] = 1;
    at[2] = 'CUSTOM_LIST';
    at['CUSTOM_LIST'] = 2;
    sam.AudienceType = at;
    sam.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.audienceType != null && Object.hasOwnProperty.call(m, 'audienceType'))
            w.uint32(8).int32(m.audienceType);
        if (m.listName != null && Object.hasOwnProperty.call(m, 'listName'))
            w.uint32(18).string(m.listName);
        if (m.listEmoji != null && Object.hasOwnProperty.call(m, 'listEmoji'))
            w.uint32(26).string(m.listEmoji);
        return w;
    };
    sam.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        const c = l === undefined ? r.len : r.pos + l;
        const m = sam.create();
        while (r.pos < c) {
            const t = r.uint32();
            switch (t >>> 3) {
                case 1:
                    m.audienceType = r.int32();
                    break;
                case 2:
                    m.listName = r.string();
                    break;
                case 3:
                    m.listEmoji = r.string();
                    break;
                default:
                    r.skipType(t & 7);
            }
        }
        return m;
    };
    sam.fromObject = function fromObject(d) {
        if (d instanceof sam)
            return d;
        const m = sam.create();
        if (d.audienceType != null) {
            switch (d.audienceType) {
                case 'CLOSE_FRIENDS':
                case 1:
                    m.audienceType = 1;
                    break;
                case 'CUSTOM_LIST':
                case 2:
                    m.audienceType = 2;
                    break;
                default:
                    m.audienceType = typeof d.audienceType === 'number' ? d.audienceType : 0;
            }
        }
        if (d.listName != null)
            m.listName = String(d.listName);
        if (d.listEmoji != null)
            m.listEmoji = String(d.listEmoji);
        return m;
    };
    sam.create = function create(p) {
        const m = Object.create(sam.prototype || {});
        if (p)
            Object.assign(m, p);
        return m;
    };
}
export const COLORS = {
    putih: 0xffffffff,
    hitam: 0xff000000,
    merah: 0xffff0000,
    hijau: 0xff00ff00,
    biru: 0xff0000ff,
    kuning: 0xffffff00,
    pink: 0xffff69b4,
    ungu: 0xff800080,
    orange: 0xffffa500,
    abu: 0xff808080,
    cyan: 0xff00ffff,
    tosca: 0xff008080,
    coklat: 0xff8b4513,
    emas: 0xffffd700,
    silver: 0xffc0c0c0,
    merahtua: 0xff8b0000,
    birutua: 0xff00008b,
    hijautua: 0xff006400,
    lavender: 0xffe6e6fa
};
const FONTS = { sans: 1, serif: 2, mono: 3, cursive: 4, fancy: 5 };
export function resolveColor(input) {
    if (!input)
        return null;
    const str = input.trim().toLowerCase().replace('#', '');
    if (COLORS[str] !== undefined)
        return COLORS[str];
    if (/^[0-9a-f]{6}$/i.test(str))
        return parseInt('FF' + str, 16);
    if (/^[0-9a-f]{8}$/i.test(str))
        return parseInt(str, 16);
    return isNaN(parseInt(str)) ? null : parseInt(str);
}
export function resolveFont(input) {
    const str = String(input || '').trim().toLowerCase();
    return FONTS[str] || parseInt(str) || 5;
}
function contentTypeOfSwgc(message = {}) {
    return getContentType?.(message) || Object.keys(message || {}).find(k => k !== 'messageContextInfo') || '';
}
function pickMediaFromMessageSwgc(message = {}) {
    const msg = unwrapMessageSwgc(message);
    const type = contentTypeOfSwgc(msg);
    const map = { imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio' };
    return map[type] && msg?.[type] ? { kind: map[type], type, node: msg[type], message: msg } : null;
}
function pickQuotedMediaSwgc(m = {}) {
    if (m?.quoted) {
        if (m.quoted.msg && m.quoted.mtype) {
            const map = { imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio' };
            if (map[m.quoted.mtype])
                return {
                    kind: map[m.quoted.mtype],
                    type: m.quoted.mtype,
                    node: m.quoted.msg,
                    message: { [m.quoted.mtype]: m.quoted.msg },
                    download: m.quoted.download
                };
        }
        const media = pickMediaFromMessageSwgc(m.quoted.message || m.quoted.msg || {});
        if (media)
            return { ...media, download: m.quoted.download };
    }
    const q = m?.msg?.contextInfo?.quotedMessage || m?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    return q ? pickMediaFromMessageSwgc(q) : null;
}
function unwrapMessageSwgc(message = {}) {
    let msg = message || {};
    const targets = [
        'ephemeralMessage',
        'viewOnceMessage',
        'viewOnceMessageV2',
        'viewOnceMessageV2Extension',
        'documentWithCaptionMessage',
        'groupStatusMessageV2',
        'groupStatusMessage'
    ];
    for (let i = 0; i < 15; i++) {
        const found = targets.find(t => msg?.[t]?.message);
        if (!found)
            break;
        msg = msg[found].message;
    }
    return msg;
}
async function streamToBufferSwgc(stream) {
    const chunks = [];
    for await (const chunk of stream)
        chunks.push(chunk);
    return Buffer.concat(chunks);
}
async function downloadMediaSourceSwgc(source = {}) {
    if (!source?.node)
        throw new Error('Media node kosong');
    if (typeof source.download === 'function') {
        const buffer = await source.download();
        if (buffer?.length)
            return Buffer.from(buffer);
    }
    return streamToBufferSwgc(await downloadContentFromMessage(source.node, source.kind));
}
export function notifySwgcEcho(sock, msg = {}) {
    const id = msg?.key?.id;
    const env = msg?.message?.groupStatusMessageV2 ||
        msg?.message?.groupStatusMessage ||
        msg?.groupStatusMessageV2 ||
        msg?.groupStatusMessage;
    if (!id || !env || !sock.__swgcWaiters)
        return false;
    const key1 = `${msg.key.remoteJid}|${id}`;
    const key2 = `${msg.key.participant}|${id}`;
    const waiter = sock.__swgcWaiters.get(key1) || sock.__swgcWaiters.get(key2);
    if (!waiter)
        return false;
    clearTimeout(waiter.timer);
    sock.__swgcWaiters.delete(key1);
    sock.__swgcWaiters.delete(key2);
    waiter.resolve({ ok: true, message: msg });
    return true;
}
export function waitForSwgcEcho(sock, groupJid, messageId, timeoutMs = 10000) {
    return new Promise(resolve => {
        if (!sock.__swgcWaiters)
            sock.__swgcWaiters = new Map();
        const key = `${groupJid}|${messageId}`;
        const timer = setTimeout(() => {
            sock.__swgcWaiters.delete(key);
            resolve({ ok: false, timeout: true });
        }, Math.max(1500, timeoutMs));
        sock.__swgcWaiters.set(key, { resolve, timer });
    });
}
export const resolve_audience = (audience) => {
    if (!audience)
        return undefined;
    if (audience === 'close_friends')
        return { audienceType: 1 };
    if (typeof audience !== 'object')
        return undefined;
    if (audience.type === 'close_friends' || audience.type === 1)
        return { audienceType: 1 };
    if (audience.type === 'custom' || audience.type === 2 || audience.name || audience.emoji) {
        return {
            audienceType: 2,
            ...(audience.name ? { listName: audience.name } : {}),
            ...(audience.emoji ? { listEmoji: audience.emoji } : {})
        };
    }
    return undefined;
};
export async function createStatusPayloadFromInput(m, text = '') {
    const source = pickQuotedMediaSwgc(m) || pickMediaFromMessageSwgc(m?.message || m?.msg || {});
    const rawText = String(text || '').trim();
    const cleanText = rawText === '.swgc' ? '' : rawText;
    let audience_data = undefined;
    let mainText = cleanText;
    if (source?.node) {
        if (cleanText.includes('|')) {
            const parts = cleanText.split('|').map((p) => p.trim());
            mainText = parts[0] || '';
            const audienceType = parts[1] ? (isNaN(parseInt(parts[1])) ? parts[1] : parseInt(parts[1])) : undefined;
            if (audienceType) {
                audience_data = {
                    type: audienceType,
                    name: parts[2] || undefined,
                    emoji: parts[3] || undefined
                };
            }
        }
        const srcCaption = String(source.node?.caption || '').trim();
        const finalCaption = mainText || (srcCaption === '.swgc' ? '' : srcCaption);
        const buffer = await downloadMediaSourceSwgc(source);
        const payload = { type: source.kind, buffer, caption: finalCaption, audience: audience_data };
        if (source.kind === 'video' || source.kind === 'audio') {
            payload.mimetype = source.node?.mimetype || `${source.kind}/mp4`;
            payload.seconds = source.node?.seconds;
            if (source.kind === 'audio')
                payload.ptt = false;
        }
        return payload;
    }
    if (cleanText.includes('|')) {
        const parts = cleanText.split('|').map((p) => p.trim());
        mainText = parts[0] || '';
        const audienceType = parts[4] ? (isNaN(parseInt(parts[4])) ? parts[4] : parseInt(parts[4])) : undefined;
        if (audienceType) {
            audience_data = {
                type: audienceType,
                name: parts[5] || undefined,
                emoji: parts[6] || undefined
            };
        }
        return {
            type: 'text',
            text: mainText,
            textArgb: resolveColor(parts[1]) ?? 4294967040,
            backgroundArgb: resolveColor(parts[2]) ?? 4280669030,
            font: resolveFont(parts[3]),
            audience: audience_data
        };
    }
    if (mainText) {
        return { type: 'text', text: mainText, audience: audience_data };
    }
    return null;
}
export function payloadToStatusContent(p, opt = {}) {
    if (!p)
        return null;
    const audience_meta = resolve_audience(p.audience || opt.audience);
    const ctx_info = {
        forwardingScore: 0,
        featureEligibilities: { canBeReshared: true, canReceiveMultiReact: true },
        statusSourceType: 4,
        statusAttributions: [{ type: 10 }],
        statusAudienceMetadata: audience_meta || { audienceType: 1 }
    };
    if (p.type === 'text') {
        if (p.textArgb !== undefined || p.backgroundArgb !== undefined) {
            return {
                extendedTextMessage: {
                    text: p.text || opt.text || '',
                    textArgb: p.textArgb,
                    backgroundArgb: p.backgroundArgb,
                    font: p.font ?? 5,
                    previewType: 0,
                    contextInfo: ctx_info,
                    inviteLinkGroupTypeV2: 0
                }
            };
        }
        return {
            text: p.text || opt.text || '',
            backgroundColor: opt.textStatusBackground || p.backgroundColor || '#0b141a',
            contextInfo: ctx_info
        };
    }
    return {
        [p.type]: p.buffer,
        caption: p.caption || '',
        mimetype: p.mimetype,
        seconds: p.seconds,
        ptt: p.ptt,
        contextInfo: ctx_info
    };
}
export async function groupStatus(sock, jid, content, options = {}) {
    patch_proto();
    if (!sock?.relayMessage || !String(jid || '').endsWith('@g.us'))
        throw new Error('Socket/JID Grup tidak valid');
    let inside = content?.extendedTextMessage ? content : null;
    if (!inside) {
        const cloned = { ...content };
        const bg = cloned.backgroundColor;
        delete cloned.backgroundColor;
        const ctx = cloned.contextInfo;
        delete cloned.contextInfo;
        inside = await generateWAMessageContent(cloned, { upload: sock.waUploadToServer, backgroundColor: bg });
        if (inside && !inside.extendedTextMessage) {
            const t = contentTypeOfSwgc(inside);
            if (inside[t]) {
                ;
                inside[t].contextInfo = { ...(inside[t].contextInfo || {}), isGroupStatus: true, ...(ctx || {}) };
            }
        }
    }
    else {
        if (content.extendedTextMessage.contextInfo && inside.extendedTextMessage) {
            ;
            inside.extendedTextMessage.contextInfo = {
                ...inside.extendedTextMessage.contextInfo,
                ...content.extendedTextMessage.contextInfo
            };
        }
    }
    const secret = options.messageSecret || crypto.randomBytes(32);
    const key = options.v1 ? 'groupStatusMessage' : 'groupStatusMessageV2';
    const msg = generateWAMessageFromContent(jid, {
        messageContextInfo: { messageSecret: secret },
        [key]: { message: { ...inside, messageContextInfo: { messageSecret: secret } } }
    }, { userJid: sock.user?.id, logger: sock.logger });
    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
    if (options.verifyEcho)
        msg.swgcEcho = await waitForSwgcEcho(sock, jid, msg.key.id, options.verifyTimeoutMs);
    return msg;
}
export async function sendSwgc(sock, jid, input, opt = {}) {
    const p = input?.type
        ? input
        : Buffer.isBuffer(input)
            ? { type: opt.type || 'image', buffer: input, ...opt }
            : { type: 'text', text: String(input || '') };
    return groupStatus(sock, jid, payloadToStatusContent(p, opt), opt);
}
export function patchSwgc(sock) {
    if (!sock || sock.swgc)
        return sock;
    const run = (jid, input, opt = {}) => sendSwgc(sock, jid, input, opt);
    run.from = (m) => ({
        async fromInput(msg, tx = '') {
            return sendSwgc(sock, m?.chat || m?.key?.remoteJid || '', await createStatusPayloadFromInput(msg, tx));
        }
    });
    sock.swgc = sock.sendSwgc = sock.groupStatus = run;
    sock.COLORS = COLORS;
    sock.resolveColor = resolveColor;
    sock.resolveFont = resolveFont;
    sock.createStatusPayloadFromInput = createStatusPayloadFromInput;
    sock.swgcBuilder = (jid) => new SwgcBuilder(sock, jid);
    if (sock.ev && !sock.__swgcEvPatched) {
        sock.__swgcEvPatched = true;
        sock.ev.on('messages.upsert', ({ messages }) => {
            for (const msg of messages || [])
                notifySwgcEcho(sock, msg);
        });
    }
    return sock;
}
export class SwgcBuilder {
    constructor(sock, jid) {
        this.sock = sock;
        this.jid = jid;
        this.payload = { type: 'text' };
        this.options = {};
    }
    text(txt) {
        this.payload = { type: 'text', text: txt };
        return this;
    }
    color(c) {
        this.payload.textArgb = resolveColor(c);
        return this;
    }
    bgcolor(c) {
        this.payload.backgroundArgb = resolveColor(c);
        return this;
    }
    font(f) {
        this.payload.font = resolveFont(f);
        return this;
    }
    audience(type, name, emoji) {
        if (type)
            this.payload.audience = { type, name, emoji };
        return this;
    }
    image(buffer, mimetype = 'image/jpeg') {
        this.payload = { type: 'image', buffer, mimetype };
        return this;
    }
    video(buffer, mimetype = 'video/mp4', options = {}) {
        const isAudio = options.ptt === true || mimetype.startsWith('audio/');
        this.payload = {
            type: isAudio ? 'audio' : 'video',
            buffer,
            mimetype: isAudio ? mimetype || 'audio/ogg; codecs=opus' : mimetype,
            ptt: isAudio
        };
        return this;
    }
    caption(txt) {
        this.payload.caption = txt;
        return this;
    }
    setOptions(opt) {
        this.options = { ...this.options, ...opt };
        return this;
    }
    async send() {
        return sendSwgc(this.sock, this.jid, this.payload, this.options);
    }
}
// ============================================================
// LID-TO-PN mapping
// Menggunakan sock.signalRepository.lidMapping (Baileys internal store, in-memory only)
// Fokus ke PN — semua JID diresolve ke @s.whatsapp.net
// ============================================================
function normalizeJid(jid = '') {
    return String(jid || '').split(':')[0].replace(/\s+/g, '');
}
/** Extract lid+pn pair from contact/participant object, feed to Baileys internal store */
function feedStore(store, obj = {}) {
    const ids = [obj.id, obj.jid, obj.pn, obj.phoneNumber, obj.lid]
        .filter(Boolean)
        .map(normalizeJid);
    const pn = ids.find(isPnUser);
    const lid = ids.find(isLidUser);
    if (pn && lid) {
        // fire-and-forget ke Baileys internal store (async, in-memory only, no file write)
        store.storeLIDPNMappings([{ lid, pn }]).catch(() => { });
    }
}
const learnedGroups = new Set();
async function tryLearnGroup(sock, jid) {
    if (!String(jid || '').endsWith('@g.us') || learnedGroups.has(jid))
        return;
    learnedGroups.add(jid);
    try {
        const metadata = await sock.groupMetadata(jid);
        const store = sock.signalRepository?.lidMapping;
        if (!store)
            return;
        const pairs = [];
        for (const p of metadata?.participants || []) {
            const ids = [p.id, p.jid, p.pn, p.phoneNumber, p.lid]
                .filter(Boolean)
                .map(normalizeJid);
            const pn = ids.find(isPnUser);
            const lid = ids.find(isLidUser);
            if (pn && lid)
                pairs.push({ lid, pn });
        }
        if (pairs.length)
            await store.storeLIDPNMappings(pairs);
    }
    catch {
        learnedGroups.delete(jid);
    }
}
export function patchLidToPn(sock, _options = {}) {
    // Gunakan Baileys internal LIDMappingStore (in-memory, no file/database)
    const store = sock.signalRepository?.lidMapping;
    if (!store) {
        // Fallback: kalau signalRepository belum siap, skip — gak bikin apa-apa
        console.debug('[lidtopn] signalRepository.lidMapping belum tersedia, skip patch');
        return sock;
    }
    // Expose untuk backward compatibility
    sock.lidMapping = store;
    const learnManyContacts = (contacts) => {
        for (const contact of contacts || [])
            feedStore(store, contact);
    };
    sock.ev?.on?.('contacts.upsert', learnManyContacts);
    sock.ev?.on?.('contacts.update', learnManyContacts);
    sock.ev?.on?.('messaging-history.set', ({ contacts, chats }) => {
        learnManyContacts(contacts);
        for (const chat of chats || [])
            feedStore(store, chat);
    });
    sock.ev?.on?.('groups.update', (groups) => {
        for (const group of groups || []) {
            for (const p of group?.participants || [])
                feedStore(store, p);
        }
    });
    sock.ev?.on?.('group-participants.update', (update) => {
        for (const p of update?.participants || [])
            feedStore(store, p);
    });
    sock.ev?.on?.('messages.upsert', ({ messages }) => {
        for (const m of messages || []) {
            if (!m?.key)
                continue;
            const sender = m.key.participant || m.key.remoteJid;
            const alt = m.key.participantAlt || m.participantAltJid || m.key.remoteJidAlt;
            if (sender && alt) {
                feedStore(store, { id: sender, lid: alt });
                feedStore(store, { id: alt, lid: sender });
            }
        }
    });
    sock.learnLidPn = (data) => {
        if (Array.isArray(data))
            data.forEach((v) => feedStore(store, v));
        else
            feedStore(store, data);
        return store;
    };
    // ── Resolver: fokus ke PN ──────────────────────────
    sock.resolveLidToPn = async (jid) => {
        jid = normalizeJid(jid);
        if (!jid)
            return jid;
        if (isPnUser(jid))
            return jid;
        // Me mapping: kalau jid == me.lid, return me.id
        const meLid = normalizeJid(sock.authState?.creds?.me?.lid || '');
        const meId = normalizeJid(sock.authState?.creds?.me?.id ? `${sock.authState.creds.me.id.split(':')[0]}@s.whatsapp.net` : '');
        if (meLid && jid === meLid && meId) {
            store.storeLIDPNMappings([{ lid: meLid, pn: meId }]).catch(() => { });
            return meId;
        }
        if (isLidUser(jid)) {
            const pn = await store.getPNForLID(jid);
            return pn || jid;
        }
        return jid;
    };
    sock.resolvePnToLid = async (jid) => {
        jid = normalizeJid(jid);
        if (!jid)
            return jid;
        if (isLidUser(jid))
            return jid;
        const meLid = normalizeJid(sock.authState?.creds?.me?.lid || '');
        const meId = normalizeJid(sock.authState?.creds?.me?.id ? `${sock.authState.creds.me.id.split(':')[0]}@s.whatsapp.net` : '');
        if (meId && jid === meId && meLid) {
            store.storeLIDPNMappings([{ lid: meLid, pn: meId }]).catch(() => { });
            return meLid;
        }
        if (isPnUser(jid)) {
            const lid = await store.getLIDForPN(jid);
            return lid || jid;
        }
        return jid;
    };
    sock.toPn = sock.resolveLidToPn;
    sock.toLid = sock.resolvePnToLid;
    sock.resolveAnyJidToPn = async (jid, chatJid = '') => {
        jid = normalizeJid(jid);
        if (!jid || isPnUser(jid))
            return jid;
        // Coba dari cache Baileys
        const cachedPn = await store.getPNForLID(jid);
        if (cachedPn)
            return cachedPn;
        // Coba belajar dari grup
        await tryLearnGroup(sock, chatJid);
        return await sock.resolveLidToPn(jid);
    };
    return sock;
}
// ============================================================
// STICKER
// (dipindahkan dari lib/sticker.js, tanpa disk-patch)
// ============================================================
const _webpmux = loadWebpmux();
const { Image } = _webpmux?.default || _webpmux || {};
function tmpFile(ext = '') {
    return path.join(os.tmpdir(), `natass-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
}
async function streamToBufferSticker(stream) {
    const chunks = [];
    for await (const chunk of stream)
        chunks.push(chunk);
    return Buffer.concat(chunks);
}
function safeJsonParse(s) {
    try {
        return JSON.parse(s);
    }
    catch {
        return null;
    }
}
function normalizeTrigger(input) {
    const s = String(input || '').trim();
    if (!s)
        return '';
    if (s.startsWith('.') || s.startsWith('#') || s.startsWith('/'))
        return s;
    return '.' + s;
}
async function ffmpegConvert(inputPath, outputPath, extraArgs = []) {
    await execFileAsync('ffmpeg', ['-y', '-i', inputPath, ...extraArgs, outputPath]);
}
export async function imageToWebp(buffer) {
    const input = tmpFile('.png');
    const output = tmpFile('.webp');
    try {
        const pngBuf = await loadSharp()(buffer)
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer();
        fs.writeFileSync(input, pngBuf);
        await ffmpegConvert(input, output, [
            '-vcodec',
            'libwebp',
            '-lossless',
            '1',
            '-preset',
            'picture',
            '-loop',
            '0',
            '-an',
            '-vsync',
            '0'
        ]);
        return fs.readFileSync(output);
    }
    finally {
        if (fs.existsSync(input))
            fs.unlinkSync(input);
        if (fs.existsSync(output))
            fs.unlinkSync(output);
    }
}
export async function videoToWebp(buffer) {
    const input = tmpFile('.mp4');
    const output = tmpFile('.webp');
    try {
        fs.writeFileSync(input, buffer);
        await ffmpegConvert(input, output, [
            '-ss',
            '0',
            '-t',
            '15',
            '-vf',
            'fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
            '-vcodec',
            'libwebp_anim',
            '-loop',
            '0',
            '-an',
            '-preset',
            'default',
            '-vsync',
            '0',
            '-pix_fmt',
            'yuva420p'
        ]);
        return fs.readFileSync(output);
    }
    finally {
        if (fs.existsSync(input))
            fs.unlinkSync(input);
        if (fs.existsSync(output))
            fs.unlinkSync(output);
    }
}
export function buildStickerExif(metadata) {
    const json = Buffer.from(JSON.stringify(metadata), 'utf-8');
    const exif = Buffer.concat([
        Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00]),
        Buffer.alloc(4),
        Buffer.from([0x16, 0x00, 0x00, 0x00]),
        json
    ]);
    exif.writeUInt32LE(json.length, 14);
    return exif;
}
async function writeWebpExifJson(webpBuffer, jsonObj) {
    if (!jsonObj['sticker-pack-id'])
        jsonObj['sticker-pack-id'] = `com.natass.sticker.${crypto.randomBytes(4).toString('hex')}`;
    if (!jsonObj['emojis'])
        jsonObj['emojis'] = [''];
    const img = new Image();
    await img.load(webpBuffer);
    img.exif = buildStickerExif(jsonObj);
    return await img.save(null);
}
export async function readWebpExifJson(webpBuffer) {
    try {
        const img = new Image();
        await img.load(webpBuffer);
        if (!img.exif)
            return null;
        const str = img.exif.toString('utf-8');
        const start = str.indexOf('{');
        if (start === -1)
            return null;
        return safeJsonParse(str.slice(start));
    }
    catch {
        return null;
    }
}
export async function writeExif(webpBuffer, wm = {}, extra = {}) {
    const exifJson = (await readWebpExifJson(webpBuffer)) || {};
    const packname = wm?.packname
        ? String(wm.packname)
        : exifJson['sticker-pack-name'] || exifJson.packname || 'Sticker';
    const author = wm?.author ? String(wm.author) : exifJson['sticker-pack-publisher'] || exifJson.author || '';
    exifJson['sticker-pack-name'] = packname;
    exifJson['sticker-pack-publisher'] = author;
    exifJson.packname = packname;
    exifJson.author = author;
    if (Array.isArray(extra.emojis))
        exifJson.emojis = extra.emojis;
    const type = Number(extra.type) || 1;
    if (type === 2) {
        exifJson['sticker-pack-id'] = exifJson['sticker-pack-id'] || '2be7e369-b5ce-4706-a3d4-f78805a20328';
        exifJson['accessibility-text'] = 'MR ALOC';
        exifJson['android-app-store-link'] = 'https://whatsapp.com';
        exifJson['ios-app-store-link'] = 'https://whatsapp.com/ios';
        exifJson['is-from-sticker-maker'] = 0;
        exifJson['is-avatar-sticker'] = 1;
        exifJson['avatar-sticker-template-id'] = 'whatsapp';
        exifJson['is-avatar-country-sticker'] = 1;
        exifJson['is-avatar-instant-sticker'] = 1;
        exifJson['sticker-maker-source-type'] = 4;
        exifJson['is-avatar-social-sticker'] = 1;
        exifJson['avatar-sticker-style'] = 'whatsapp';
        exifJson['avatar-sticker-revision-id'] = '2026';
        exifJson['is-from-user-created-pack'] = 1;
        exifJson['origin-pack-id'] = 'whatsapp';
        exifJson['is-text-sticker'] = 1;
        if (!extra.emojis)
            exifJson.emojis = ['🦸', '😴', '😌'];
    }
    else if (type === 3) {
        exifJson['sticker-pack-id'] = exifJson['sticker-pack-id'] || 'premium-' + Date.now();
        exifJson['accessibility-text'] = 'VIP Premium Sticker';
        exifJson['is-avatar-sticker'] = 0;
        exifJson['is-avatar-social-sticker'] = 1;
        exifJson['premium'] = 1;
        if (!extra.emojis)
            exifJson.emojis = ['⭐', '👑', '✨'];
    }
    if (extra.ai) {
        exifJson['is-ai-sticker'] = 1;
        exifJson.isAiGenerated = true;
        exifJson.aiEngine = 'NatasssBotzz_AI';
    }
    else if (type === 2) {
        exifJson['is-ai-sticker'] = 1;
    }
    if (extra.trigger) {
        exifJson.natass =
            exifJson.natass && typeof exifJson.natass === 'object' ? exifJson.natass : {};
        exifJson.natass.trigger = normalizeTrigger(extra.trigger);
        exifJson.trigger = normalizeTrigger(extra.trigger);
    }
    return await writeWebpExifJson(webpBuffer, exifJson);
}
export async function writeExifImg(buffer, wm = {}, extra = {}) {
    return writeExif(await imageToWebp(buffer), wm, extra);
}
export async function writeExifVid(buffer, wm = {}, extra = {}) {
    return writeExif(await videoToWebp(buffer), wm, extra);
}
export async function getStickerTriggerFromMessage(m) {
    const msg = m?.message || {};
    const sticker = msg?.stickerMessage ||
        msg?.ephemeralMessage?.message?.stickerMessage ||
        msg?.viewOnceMessage?.message?.stickerMessage ||
        msg?.viewOnceMessageV2?.message?.stickerMessage ||
        msg?.viewOnceMessageV2Extension?.message?.stickerMessage;
    if (!sticker)
        return '';
    const webpBuffer = await streamToBufferSticker(await downloadContentFromMessage(sticker, 'sticker'));
    const exifJson = await readWebpExifJson(webpBuffer);
    if (!exifJson)
        return '';
    return normalizeTrigger(exifJson?.natass?.trigger || exifJson?.trigger || '');
}
export async function setStickerTrigger(webpBuffer, trigger, wm = {}) {
    const trig = normalizeTrigger(trigger);
    if (!trig)
        return webpBuffer;
    const exifJson = (await readWebpExifJson(webpBuffer)) || {};
    const packname = wm?.packname
        ? String(wm.packname)
        : exifJson['sticker-pack-name'] || exifJson.packname || 'Sticker';
    const author = wm?.author ? String(wm.author) : exifJson['sticker-pack-publisher'] || exifJson.author || '';
    exifJson['sticker-pack-name'] = packname;
    exifJson['sticker-pack-publisher'] = author;
    exifJson.packname = packname;
    exifJson.author = author;
    exifJson.natass =
        exifJson.natass && typeof exifJson.natass === 'object' ? exifJson.natass : {};
    exifJson.natass.trigger = trig;
    exifJson.trigger = trig;
    return await writeWebpExifJson(webpBuffer, exifJson);
}
export async function updateStickerWmOnly(webpBuffer, wm = {}) {
    const exifJson = (await readWebpExifJson(webpBuffer)) || {};
    const packname = wm?.packname
        ? String(wm.packname)
        : exifJson['sticker-pack-name'] || exifJson.packname || 'Sticker';
    const author = wm?.author ? String(wm.author) : exifJson['sticker-pack-publisher'] || exifJson.author || '';
    exifJson['sticker-pack-name'] = packname;
    exifJson['sticker-pack-publisher'] = author;
    exifJson.packname = packname;
    exifJson.author = author;
    return await writeWebpExifJson(webpBuffer, exifJson);
}
export function detectAlbumMessage(target) {
    const msg = target?.message || target || {};
    if (msg?.albumMessage)
        return true;
    if (msg?.ephemeralMessage?.message?.albumMessage)
        return true;
    if (msg?.viewOnceMessage?.message?.albumMessage)
        return true;
    if (msg?.viewOnceMessageV2?.message?.albumMessage)
        return true;
    if (target?.type === 'albumMessage')
        return true;
    if (target?.raw?.albumMessage)
        return true;
    return false;
}
export function isAlbumReply(m) {
    const q = m?.quoted;
    if (!q)
        return false;
    return detectAlbumMessage(q);
}
export function getAlbumKeyInfo(m) {
    const q = m?.quoted;
    if (!q)
        return null;
    return {
        stanzaId: q?.quotedMeta?.stanzaId || q?.key?.id || null,
        participant: q?.quotedMeta?.participant || q?.key?.participant || q?.sender || null,
        remoteJid: q?.quotedMeta?.remoteJid || q?.key?.remoteJid || null
    };
}
function isAnimatedWebp(buffer) {
    try {
        if (!Buffer.isBuffer(buffer) || buffer.length < 16)
            return false;
        const riff = buffer.subarray(0, 4).toString('ascii');
        const webp = buffer.subarray(8, 12).toString('ascii');
        if (riff !== 'RIFF' || webp !== 'WEBP')
            return false;
        const ascii = buffer.toString('ascii');
        if (ascii.includes('ANMF') || ascii.includes('ANIM'))
            return true;
        const vp8xPos = ascii.indexOf('VP8X');
        if (vp8xPos >= 0 && buffer.length >= vp8xPos + 9)
            return (buffer[vp8xPos + 8] & 0x02) === 0x02;
    }
    catch { }
    return false;
}
function toBufferBytes(value) {
    if (!value)
        return undefined;
    if (Buffer.isBuffer(value))
        return value;
    if (value instanceof Uint8Array)
        return Buffer.from(value);
    if (Array.isArray(value))
        return Buffer.from(value);
    if (typeof value === 'string') {
        try {
            return Buffer.from(value, 'base64');
        }
        catch { }
    }
    return undefined;
}
function normalizeEmojiList(value) {
    if (!Array.isArray(value))
        return [''];
    const out = value.map((v) => String(v || '').trim()).filter(Boolean);
    return out.length ? out : [''];
}
function randomStickerFileName(ext = '.webp') {
    return `sticker-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}
function detectBufferKind(buffer = Buffer.alloc(0)) {
    if (!Buffer.isBuffer(buffer))
        return 'unknown';
    if (buffer.length >= 12) {
        const riff = buffer.subarray(0, 4).toString('ascii');
        const webp = buffer.subarray(8, 12).toString('ascii');
        if (riff === 'RIFF' && webp === 'WEBP')
            return 'webp';
    }
    if (buffer.length >= 8 && buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a')
        return 'png';
    if (buffer.length >= 3 && buffer.subarray(0, 3).toString('hex') === 'ffd8ff')
        return 'jpeg';
    if (buffer.length >= 6) {
        const head6 = buffer.subarray(0, 6).toString('ascii');
        if (head6 === 'GIF87a' || head6 === 'GIF89a')
            return 'gif';
    }
    if (buffer.length >= 12 && buffer.subarray(4, 12).toString('ascii').includes('ftyp'))
        return 'video';
    if (buffer.length >= 2 && buffer.subarray(0, 2).toString('hex') === '1f8b')
        return 'tgs';
    return 'unknown';
}
function guessSourceExt(source = {}) {
    const candidates = [source?.fileName, source?.path, source?.url]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
    for (const value of candidates) {
        const clean = value.split('?')[0].split('#')[0];
        const m = clean.match(/\.([a-z0-9]+)$/i);
        if (m?.[1])
            return '.' + m[1].toLowerCase();
    }
    return '';
}
function makeStickerPackItemName(buffer, index = 0, ext = '.webp') {
    const hashB64 = crypto.createHash('sha256').update(buffer).digest('base64');
    return `${String(index).padStart(2, '0')}_${encodeURIComponent(hashB64)}${ext}`;
}
function toHexSha256(buffer) {
    if (!buffer)
        return '';
    return crypto.createHash('sha256').update(buffer).digest('hex');
}
function toB64(value) {
    if (!value)
        return '';
    if (Buffer.isBuffer(value))
        return value.toString('base64');
    if (value instanceof Uint8Array)
        return Buffer.from(value).toString('base64');
    if (Array.isArray(value))
        return Buffer.from(value).toString('base64');
    return String(value);
}
async function bufferToWebpWithHint(buffer, extHint = '.bin', animated = false) {
    const input = tmpFile(extHint || '.bin');
    const output = tmpFile('.webp');
    try {
        fs.writeFileSync(input, buffer);
        if (animated) {
            await ffmpegConvert(input, output, [
                '-ss',
                '0',
                '-t',
                '8',
                '-vf',
                'fps=15,scale=512:512:force_original_aspect_ratio=increase,crop=512:512:exact=1',
                '-vcodec',
                'libwebp_anim',
                '-loop',
                '0',
                '-an',
                '-preset',
                'default',
                '-vsync',
                '0'
            ]);
        }
        else {
            await ffmpegConvert(input, output, [
                '-vf',
                'scale=512:512:force_original_aspect_ratio=increase,crop=512:512',
                '-vcodec',
                'libwebp',
                '-lossless',
                '0',
                '-q:v',
                '75',
                '-preset',
                'picture',
                '-loop',
                '0',
                '-an',
                '-vsync',
                '0'
            ]);
        }
        return fs.readFileSync(output);
    }
    finally {
        try {
            if (fs.existsSync(input))
                fs.unlinkSync(input);
        }
        catch { }
        try {
            if (fs.existsSync(output))
                fs.unlinkSync(output);
        }
        catch { }
    }
}
export async function resolveMediaToBuffer(media) {
    if (!media)
        throw new Error('Media input kosong');
    if (Buffer.isBuffer(media) || media instanceof Uint8Array)
        return Buffer.from(media);
    if (typeof media === 'string') {
        if (/^https?:\/\//i.test(media)) {
            const res = await fetch(media);
            return Buffer.from(await res.arrayBuffer());
        }
        if (fs.existsSync(media))
            return fs.readFileSync(media);
        return Buffer.from(media, 'base64');
    }
    if (media && typeof media === 'object') {
        let msg = media.message || media;
        if (msg.extendedTextMessage?.contextInfo?.quotedMessage) {
            msg = msg.extendedTextMessage.contextInfo.quotedMessage;
        }
        let msgType = Object.keys(msg).find(k => k.endsWith('Message'));
        if (msgType === 'viewOnceMessage' || msgType === 'viewOnceMessageV2') {
            msg = msg[msgType].message;
            msgType = Object.keys(msg).find(k => k.endsWith('Message'));
        }
        else if (msgType === 'ephemeralMessage') {
            msg = msg.ephemeralMessage.message;
            msgType = Object.keys(msg).find(k => k.endsWith('Message'));
        }
        if (msgType && ['imageMessage', 'videoMessage', 'stickerMessage'].includes(msgType)) {
            const stream = await downloadContentFromMessage(msg[msgType], msgType.replace('Message', ''));
            const chunks = [];
            for await (const chunk of stream)
                chunks.push(chunk);
            return Buffer.concat(chunks);
        }
    }
    throw new Error('Format media tidak valid atau tidak didukung');
}
async function normalizeStickerEntry(item, index = 0, defaultWm = {}, defaultType = 1, defaultAi = false) {
    const source = item && typeof item === 'object' ? item : { media: typeof item === 'string' ? item : '' };
    const inputBuffer = await resolveMediaToBuffer(source.media || source.url || source.buffer || source);
    const extHint = guessSourceExt(source) || '.bin';
    const detected = detectBufferKind(inputBuffer);
    const forceAnimated = Boolean(source?.isAnimated);
    const isLottie = Boolean(source?.isLottie) || detected === 'tgs' || /tgs/i.test(String(source?.mimetype || ''));
    const accessibilityLabel = source?.accessibilityLabel ? String(source.accessibilityLabel) : '';
    let buffer = inputBuffer;
    let mimetype = 'image/webp';
    let isAnimated = false;
    let fileExt = '.webp';
    if (isLottie) {
        mimetype = 'application/x-tgsticker';
        isAnimated = true;
        fileExt = '.tgs';
    }
    else if (detected === 'webp') {
        isAnimated = isAnimatedWebp(buffer);
    }
    else if (detected === 'gif' || detected === 'video' || forceAnimated) {
        buffer = await bufferToWebpWithHint(inputBuffer, extHint, true);
        isAnimated = true;
    }
    else {
        buffer = await bufferToWebpWithHint(inputBuffer, extHint, false);
    }
    if (!isLottie && buffer && buffer.length > 0) {
        const wm = {
            packname: source?.packname || defaultWm.packname || 'Sticker Pack',
            author: source?.author || defaultWm.author || ''
        };
        try {
            buffer = await writeExif(buffer, wm, {
                emojis: normalizeEmojiList(source?.emojis),
                type: source?.type || defaultType,
                ai: source?.ai !== undefined ? source.ai : defaultAi
            });
        }
        catch (e) { }
    }
    const fileName = String(source?.fileName || makeStickerPackItemName(buffer, index, fileExt) || randomStickerFileName(fileExt));
    return {
        index,
        buffer,
        fileName,
        isAnimated,
        isLottie,
        mimetype,
        emojis: normalizeEmojiList(source?.emojis),
        accessibilityLabel
    };
}
async function makeTrayWebp(buffer) {
    const sharp = loadSharp();
    if (!sharp)
        throw new Error('sharp tidak terinstall');
    return sharp(buffer, { animated: false })
        .resize(252, 252, { fit: 'cover' })
        .webp()
        .toBuffer();
}
async function makeThumbnailJpeg(buffer) {
    const sharp = loadSharp();
    if (!sharp)
        throw new Error('sharp tidak terinstall');
    return sharp(buffer)
        .resize(252, 252, { fit: 'cover' })
        .jpeg()
        .toBuffer();
}
async function uploadToServer(sock, buffer, opts) {
    const mediaKey = opts.mediaKey || crypto.randomBytes(32);
    const expanded = Buffer.from(crypto.hkdfSync('sha256', mediaKey, Buffer.alloc(32), Buffer.from(opts.hkdf), 112));
    const iv = expanded.subarray(0, 16);
    const cipherKey = expanded.subarray(16, 48);
    const macKey = expanded.subarray(48, 80);
    const cipher = crypto.createCipheriv('aes-256-cbc', cipherKey, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const mac = crypto.createHmac('sha256', macKey)
        .update(iv).update(encrypted).digest().subarray(0, 10);
    const encBuffer = Buffer.concat([encrypted, mac]);
    const fileSha256 = crypto.createHash('sha256').update(buffer).digest();
    const fileEncSha256 = crypto.createHash('sha256').update(encBuffer).digest();
    const iq = await sock.query({
        tag: 'iq',
        attrs: {
            id: sock.generateMessageTag?.() || `IQ-${Date.now()}`,
            to: 's.whatsapp.net',
            type: 'set',
            xmlns: 'w:m'
        },
        content: [{ tag: 'media_conn', attrs: {} }]
    });
    const mediaConn = iq?.content?.find((v) => v?.tag === 'media_conn');
    if (!mediaConn)
        throw new Error('media_conn tidak ditemukan');
    const auth = mediaConn.attrs?.auth;
    if (!auth)
        throw new Error('auth media_conn tidak ditemukan');
    const hosts = (mediaConn.content || [])
        .filter((v) => v?.tag === 'host')
        .map((v) => v?.attrs?.hostname)
        .filter(Boolean);
    if (!hosts.length)
        throw new Error('host upload tidak ditemukan');
    const tokenB64 = fileEncSha256.toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+\$/g, '');
    const token = encodeURIComponent(tokenB64);
    let lastError;
    for (const host of hosts) {
        try {
            const json = await new Promise((resolve, reject) => {
                const https = _require('https');
                const url = new URL(`https://${host}${opts.mediaPath}/${token}?auth=${encodeURIComponent(auth)}&token=${token}`);
                const req = https.request({
                    hostname: url.hostname,
                    port: 443,
                    path: url.pathname + url.search,
                    method: 'POST',
                    headers: {
                        'Origin': 'https://web.whatsapp.com',
                        'Referer': 'https://web.whatsapp.com/',
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': encBuffer.length
                    }
                }, (res) => {
                    let body = '';
                    res.on('data', (c) => body += c);
                    res.on('end', () => {
                        if (res.statusCode < 200 || res.statusCode >= 300)
                            return reject(new Error(`Upload gagal ${res.statusCode}: ${body}`));
                        try {
                            resolve(JSON.parse(body));
                        }
                        catch {
                            reject(new Error(`Response bukan JSON: ${body}`));
                        }
                    });
                });
                req.on('error', reject);
                req.write(encBuffer);
                req.end();
            });
            const directPath = json.direct_path ?? json.directPath ?? json.url ?? json.path;
            if (!directPath)
                throw new Error('directPath tidak ditemukan');
            return { mediaKey, fileLength: buffer.length, fileSha256, fileEncSha256, directPath, ...json };
        }
        catch (e) {
            lastError = e;
        }
    }
    throw lastError ?? new Error('Semua host upload gagal');
}
async function buildStickerPackThumbnail(stickerBuffer) {
    const png = await loadSharp()(stickerBuffer, { animated: true, pages: 1 })
        .resize(96, 96, { fit: 'cover' })
        .png()
        .toBuffer();
    return { buffer: png, width: 96, height: 96 };
}
async function buildStickerPackZip(entries = [], trayThumb = null) {
    const JSZip = loadJSZip();
    if (!JSZip)
        throw new Error('JSZip tidak terinstall. npm install jszip');
    const zip = new JSZip();
    for (const entry of entries)
        zip.file(entry.fileName, entry.buffer);
    if (trayThumb?.buffer)
        zip.file('tray.png', trayThumb.buffer);
    return await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
}
function extractUploadedMessage(media = {}) {
    return (media?.imageMessage ||
        media?.documentMessage ||
        media?.videoMessage ||
        media?.audioMessage ||
        media?.stickerMessage ||
        media?.message?.imageMessage ||
        media?.message?.documentMessage ||
        media?.message?.videoMessage ||
        media?.message?.audioMessage ||
        media?.message?.stickerMessage ||
        null);
}
async function uploadStickerPackBlob(buffer, ctx = {}, fileName = 'sticker-pack.zip') {
    const sock = ctx?.sock;
    if (!sock)
        throw new Error('sock diperlukan untuk upload');
    return await uploadToServer(sock, buffer, {
        hkdf: 'WhatsApp Sticker Pack Keys',
        mediaPath: '/mms/sticker-pack'
    });
}
function normalizeStickerPackInput(input = {}) {
    const src = input?.stickerPack && typeof input.stickerPack === 'object' ? input.stickerPack : input;
    const packname = String(src?.packname || src?.name || src?.title || 'Sticker Pack').trim() || 'Sticker Pack';
    const author = String(src?.author || src?.publisher || '').trim();
    const caption = src?.caption ? String(src.caption) : '';
    const packDescription = src?.packDescription
        ? String(src.packDescription)
        : src?.description
            ? String(src.description)
            : '';
    const stickers = Array.isArray(src?.stickers) ? src.stickers.filter(Boolean) : [];
    return {
        ...src,
        packname,
        author,
        caption,
        packDescription,
        cover: src?.cover || src?.thumbnail || null,
        stickerPackOrigin: src?.stickerPackOrigin,
        stickers,
        type: src?.type || 1,
        ai: Boolean(src?.ai)
    };
}
async function buildSingleStickerPackMessage(stickerPack, ctx = {}) {
    const upload = ctx?.upload || ctx?.sock?.waUploadToServer;
    if (typeof upload !== 'function')
        throw new Error('upload/waUploadToServer tidak tersedia untuk sticker pack');
    const normalized = normalizeStickerPackInput(stickerPack);
    if (!normalized.stickers.length)
        throw new Error('Sticker pack minimal memiliki 1 sticker');
    const defaultWm = { packname: normalized.packname, author: normalized.author };
    const defaultType = normalized.type || 1;
    const defaultAi = Boolean(normalized.ai);
    const entries = [];
    for (let i = 0; i < normalized.stickers.length; i += 1) {
        entries.push(await normalizeStickerEntry(normalized.stickers[i], i, defaultWm, defaultType, defaultAi));
    }
    const coverSource = normalized.cover || entries[0].buffer;
    const coverBuffer = await resolveMediaToBuffer(coverSource.media || coverSource.url || coverSource.buffer || coverSource).catch(() => entries[0].buffer);
    const trayThumb = await buildStickerPackThumbnail(coverBuffer);
    const zipBuffer = await buildStickerPackZip(entries, trayThumb);
    const stickerPackId = normalized.stickerPackId || `com.natasssbotzz.stickercontentprovider ${crypto.randomUUID()}`;
    const packMedia = await uploadStickerPackBlob(zipBuffer, { ...ctx, upload, sock: ctx?.sock }, `${stickerPackId}.zip`);
    const thumbMedia = extractUploadedMessage(await prepareWAMessageMedia({ image: trayThumb.buffer }, {
        upload,
        mediaUploadTimeoutMs: ctx?.mediaUploadTimeoutMs,
        logger: ctx?.logger,
        options: ctx?.options
    }));
    const payload = {
        stickerPackId,
        name: normalized.name || normalized.packname,
        publisher: normalized.publisher || normalized.author,
        stickers: entries.map((entry) => ({
            fileName: entry.fileName,
            isAnimated: entry.isAnimated,
            emojis: entry.emojis,
            accessibilityLabel: entry.accessibilityLabel,
            isLottie: entry.isLottie,
            mimetype: entry.mimetype
        })),
        fileLength: packMedia?.fileLength || zipBuffer.length,
        fileSha256: toBufferBytes(packMedia?.fileSha256) || crypto.randomBytes(32),
        fileEncSha256: toBufferBytes(packMedia?.fileEncSha256) || crypto.randomBytes(32),
        mediaKey: toBufferBytes(packMedia?.mediaKey) || crypto.randomBytes(32),
        directPath: packMedia?.directPath || '',
        caption: normalized.caption || '',
        contextInfo: normalized.contextInfo || {},
        packDescription: normalized.packDescription || '',
        mediaKeyTimestamp: packMedia?.mediaKeyTimestamp || Math.floor(Date.now() / 1000),
        trayIconFileName: `${stickerPackId}.png`,
        thumbnailDirectPath: thumbMedia?.directPath || '',
        thumbnailSha256: toBufferBytes(thumbMedia?.fileSha256) || crypto.randomBytes(32),
        thumbnailEncSha256: toBufferBytes(thumbMedia?.fileEncSha256) || crypto.randomBytes(32),
        thumbnailHeight: Number(thumbMedia?.height || trayThumb.height || 96),
        thumbnailWidth: Number(thumbMedia?.width || trayThumb.width || 96),
        imageDataHash: crypto.createHash("sha256").update(trayThumb.buffer).digest().toString("base64"),
        stickerPackSize: zipBuffer.length,
        stickerPackOrigin: Number.isFinite(Number(normalized.stickerPackOrigin))
            ? Number(normalized.stickerPackOrigin)
            : 1
    };
    return {
        stickerPackMessage: proto.Message.StickerPackMessage.fromObject(payload),
        meta: { stickerPackId, zipBuffer, trayThumb, entries, uploadedPack: packMedia, uploadedThumb: thumbMedia }
    };
}
export async function prepareStickerPackMessage(arg1, arg2 = {}, arg3 = {}) {
    const usingSockFirst = arg1 &&
        typeof arg1 === 'object' &&
        (typeof arg1.waUploadToServer === 'function' ||
            typeof arg1.relayMessage === 'function' ||
            typeof arg1.sendMessage === 'function');
    const sock = usingSockFirst ? arg1 : arg2?.sock;
    const stickerPack = usingSockFirst ? arg2 : arg1;
    const ctx = usingSockFirst ? arg3 || {} : arg2 || {};
    const normalized = normalizeStickerPackInput(stickerPack);
    if (!normalized.stickers.length)
        throw new Error('Sticker pack minimal memiliki 1 sticker');
    const chunks = [];
    for (let i = 0; i < normalized.stickers.length; i += STICKER_PACK_MAX_ITEMS) {
        chunks.push(normalized.stickers.slice(i, i + STICKER_PACK_MAX_ITEMS));
    }
    const prepared = [];
    for (let i = 0; i < chunks.length; i += 1) {
        const suffix = chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : '';
        prepared.push(await buildSingleStickerPackMessage({ ...normalized, packname: `${normalized.packname}${suffix}`, stickers: chunks[i] }, { ...ctx, sock, upload: ctx?.upload || sock?.waUploadToServer }));
    }
    if (prepared.length === 1)
        return { isBatched: false, stickerPackMessage: prepared[0].stickerPackMessage, meta: prepared[0].meta };
    return {
        isBatched: true,
        stickerPackMessage: prepared.map((i) => i.stickerPackMessage),
        meta: prepared.map((i) => i.meta)
    };
}
export function patchSocketStickerPack(sock) {
    if (!sock || sock.__stickerPackPatched)
        return sock;
    sock.sendSticker = async (jid, options = {}) => {
        const buffer = await resolveMediaToBuffer(options.media);
        const detected = detectBufferKind(buffer);
        let webpBuffer;
        if (detected === 'webp') {
            webpBuffer = buffer;
        }
        else if (detected === 'video' || detected === 'gif') {
            webpBuffer = await videoToWebp(buffer);
        }
        else {
            webpBuffer = await imageToWebp(buffer);
        }
        const type = Number(options.type) || 1;
        const ai = Boolean(options.ai);
        const finalSticker = await writeExif(webpBuffer, {
            packname: options.packname || 'Sticker',
            author: options.author || ''
        }, { type, ai });
        const media = await prepareWAMessageMedia({ sticker: finalSticker }, {
            upload: sock.waUploadToServer
        });
        const msgContent = {
            stickerMessage: {
                ...media.stickerMessage,
                isAnimated: isAnimatedWebp(finalSticker) || false
            }
        };
        if (type === 2) {
            msgContent.messageContextInfo = {
                limitSharingV2: {
                    sharingLimited: true,
                    trigger: 'CHAT_SETTING',
                    limitSharingSettingTimestamp: Date.now().toString(),
                    initiatedByMe: true
                }
            };
            msgContent.stickerMessage.isAvatar = true;
            msgContent.stickerMessage.isLottie = false;
        }
        if (ai || type === 2) {
            msgContent.stickerMessage.isAiSticker = true;
        }
        const userJid = sock.user?.id || sock.authState?.creds?.me?.id || '0@s.whatsapp.net';
        const msg = generateWAMessageFromContent(jid, msgContent, {
            userJid,
            quoted: options.quoted
        });
        await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
        return msg;
    };
    sock.sendStickerPack = async (jid, options = {}) => {
        const JSZip = loadJSZip();
        if (!JSZip)
            throw new Error('JSZip tidak terinstall. Install dengan: npm install jszip');
        const zip = new JSZip();
        const stickersMetadata = [];
        const buffers = [];
        for (const sticker of (options.stickers || [])) {
            const inputBuffer = await resolveMediaToBuffer(sticker.media || sticker.url || sticker.buffer || sticker);
            let finalBuffer = inputBuffer;
            let isAnimated = false;
            let isLottie = Boolean(sticker?.isLottie);
            let mimetype = 'image/webp';
            if (!isLottie) {
                const detected = detectBufferKind(inputBuffer);
                if (detected === 'webp') {
                    isAnimated = isAnimatedWebp(inputBuffer);
                    finalBuffer = inputBuffer;
                }
                else if (detected === 'gif' || detected === 'video') {
                    finalBuffer = await bufferToWebpWithHint(inputBuffer, guessSourceExt(sticker), true);
                    isAnimated = true;
                }
                else {
                    finalBuffer = await bufferToWebpWithHint(inputBuffer, guessSourceExt(sticker), false);
                }
            }
            // Rewrite EXIF metadata with packname/author/type/ai from options
            const wm = {
                packname: options.packname || options.name || 'Sticker',
                author: options.author || options.publisher || ''
            };
            const exifOpts = {
                type: Number(options.type) || 1,
                ai: Boolean(options.ai)
            };
            finalBuffer = await writeExif(finalBuffer, wm, exifOpts);
            const hashB64 = crypto.createHash('sha256').update(finalBuffer).digest('base64')
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+\$/g, '');
            const fileName = `${hashB64}.webp`;
            zip.file(fileName, finalBuffer);
            buffers.push(finalBuffer);
            stickersMetadata.push({
                fileName,
                isAnimated,
                emojis: [''],
                accessibilityLabel: sticker.accessibilityLabel || '',
                isLottie,
                mimetype
            });
        }
        if (buffers.length === 0)
            throw new Error('Tidak ada sticker valid dalam pack');
        const trayBuffer = await makeTrayWebp(buffers[0]);
        const trayIconFileName = 'tray_icon.webp';
        zip.file(trayIconFileName, trayBuffer);
        const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
        const packUpload = await uploadToServer(sock, archive, {
            hkdf: 'WhatsApp Sticker Pack Keys',
            mediaPath: '/mms/sticker-pack'
        });
        const thumbnailBuffer = await makeThumbnailJpeg(trayBuffer);
        const thumbUpload = await uploadToServer(sock, thumbnailBuffer, {
            hkdf: 'WhatsApp Sticker Pack Thumbnail Keys',
            mediaPath: '/mms/thumbnail-sticker-pack',
            mediaKey: packUpload.mediaKey
        });
        const msgId = sock.generateMessageTag?.() || `3EB0${crypto.randomBytes(9).toString('hex').toUpperCase()}`;
        await sock.relayMessage(jid, {
            messageContextInfo: { messageSecret: crypto.randomBytes(32) },
            stickerPackMessage: {
                stickerPackId: 'Pack_' + crypto.randomBytes(8).toString('hex'),
                name: options.name || options.packname || 'Sticker Pack',
                publisher: options.publisher || options.author || '',
                packDescription: options.packDescription || '',
                stickers: stickersMetadata,
                fileLength: packUpload.fileLength,
                fileSha256: packUpload.fileSha256,
                fileEncSha256: packUpload.fileEncSha256,
                mediaKey: packUpload.mediaKey,
                directPath: packUpload.directPath,
                mediaKeyTimestamp: Math.floor(Date.now() / 1000),
                stickerPackSize: packUpload.fileLength,
                stickerPackOrigin: Number.isFinite(Number(options.stickerPackOrigin))
                    ? Number(options.stickerPackOrigin)
                    : 2,
                trayIconFileName,
                thumbnailDirectPath: thumbUpload.directPath,
                thumbnailSha256: thumbUpload.fileSha256,
                thumbnailEncSha256: thumbUpload.fileEncSha256,
                thumbnailHeight: 252,
                thumbnailWidth: 252,
                imageDataHash: thumbUpload.fileSha256.toString('base64')
            }
        }, { messageId: msgId, quoted: options.quoted });
        return { key: { id: msgId, remoteJid: jid }, message: null };
    };
    sock.__stickerPackPatched = true;
    return sock;
}
export async function downloadStickerBuffer(stickerMessage) {
    const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}
// ============================================================
// NEWSLETTER / UPCH
// (dipindahkan dari lib/newsletter.js, tanpa disk-patch)
// ============================================================
export const NEWSLETTER_QUERY_IDS = {
    JOB_MUTATION: '7150902998257522',
    METADATA: '6620195908089573',
    UNFOLLOW: '7238632346214362',
    FOLLOW: '7871414976211147',
    UNMUTE: '7337137176362961',
    MUTE: '25151904754424642',
    CREATE: '6996806640408138',
    ADMIN_COUNT: '7130823597031706',
    CHANGE_OWNER: '7341777602580933',
    DELETE: '8316537688363079',
    DEMOTE: '6551828931592903'
};
function cleanInviteKey(value = '') {
    return String(value || '')
        .trim()
        .replace(/https?:\/\/(www\.)?whatsapp\.com\/channel\//i, '')
        .split(/[?#]/)[0];
}
function getEncoder() {
    if (globalThis.TextEncoder)
        return new TextEncoder();
    return new (_require('util').TextEncoder)();
}
function getBinaryNodeChildLocal(node, childTag) {
    return (node?.content || []).find((item) => item?.tag === childTag);
}
function pickTag(sock) {
    if (typeof sock?.generateMessageTag === 'function')
        return () => sock.generateMessageTag();
    if (typeof sock?.generateMessageID === 'function')
        return () => sock.generateMessageID();
    return () => `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}
function parseMexResult(result) {
    const resultNode = getBinaryNodeChildLocal(result, 'result');
    const raw = resultNode?.content?.toString();
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        const data = parsed?.data || parsed;
        const newsletter = data?.xwa2_newsletter || data?.xwa2_newsletter_create || parsed;
        const tm = newsletter?.thread_metadata || newsletter?.metadata || newsletter;
        if (!tm)
            return parsed;
        return {
            id: newsletter?.id || tm?.id,
            state: newsletter?.state?.type || newsletter?.state,
            name: tm?.name?.text || tm?.name || newsletter?.name,
            description: tm?.description?.text || tm?.description || newsletter?.description,
            invite: tm?.invite || newsletter?.invite,
            handle: tm?.handle || newsletter?.handle,
            picture: tm?.picture?.direct_path || tm?.picture || newsletter?.picture,
            preview: tm?.preview?.direct_path || tm?.preview || newsletter?.preview,
            subscribers: +(tm?.subscribers_count || tm?.subscribers || newsletter?.subscribers || 0),
            verification: tm?.verification || newsletter?.verification,
            viewer_metadata: newsletter?.viewer_metadata || tm?.viewer_metadata,
            raw: parsed
        };
    }
    catch {
        return null;
    }
}
function unwrapMessageNewsletter(message = {}) {
    let msg = message || {};
    for (let i = 0; i < 15; i++) {
        if (msg?.ephemeralMessage?.message) {
            msg = msg.ephemeralMessage.message;
            continue;
        }
        if (msg?.viewOnceMessage?.message) {
            msg = msg.viewOnceMessage.message;
            continue;
        }
        if (msg?.viewOnceMessageV2?.message) {
            msg = msg.viewOnceMessageV2.message;
            continue;
        }
        if (msg?.viewOnceMessageV2Extension?.message) {
            msg = msg.viewOnceMessageV2Extension.message;
            continue;
        }
        if (msg?.documentWithCaptionMessage?.message) {
            msg = msg.documentWithCaptionMessage.message;
            continue;
        }
        if (msg?.groupStatusMessageV2?.message) {
            msg = msg.groupStatusMessageV2.message;
            continue;
        }
        if (msg?.groupStatusMessage?.message) {
            msg = msg.groupStatusMessage.message;
            continue;
        }
        break;
    }
    return msg;
}
function contentTypeOfNewsletter(message = {}) {
    const keys = Object.keys(message || {}).filter(v => v !== 'messageContextInfo');
    return keys[0] || '';
}
function mediaKindFromMessageType(type = '') {
    if (type === 'imageMessage')
        return 'image';
    if (type === 'videoMessage')
        return 'video';
    if (type === 'audioMessage')
        return 'audio';
    if (type === 'stickerMessage')
        return 'sticker';
    if (type === 'documentMessage')
        return 'document';
    return '';
}
function nodeOf(message = {}) {
    const msg = unwrapMessageNewsletter(message);
    const type = contentTypeOfNewsletter(msg);
    return { msg, type, node: type ? msg?.[type] : null };
}
function contextInfoOf(message = {}) {
    const { msg, node } = nodeOf(message);
    return (node?.contextInfo ||
        msg?.extendedTextMessage?.contextInfo ||
        msg?.imageMessage?.contextInfo ||
        msg?.videoMessage?.contextInfo ||
        msg?.audioMessage?.contextInfo ||
        msg?.documentMessage?.contextInfo ||
        msg?.stickerMessage?.contextInfo ||
        {});
}
function getQuotedMessageObject(m = {}) {
    if (m?.quoted?.message)
        return unwrapMessageNewsletter(m.quoted.message);
    if (m?.quoted?.msg && m?.quoted?.mtype)
        return unwrapMessageNewsletter({ [m.quoted.mtype]: m.quoted.msg });
    if (m?.quoted?.msg)
        return unwrapMessageNewsletter(m.quoted.msg);
    const ctx = contextInfoOf(m?.message || m?.msg || {});
    return unwrapMessageNewsletter(ctx?.quotedMessage || null);
}
function pickMediaFromMessageNewsletter(message = {}) {
    const { msg, type, node } = nodeOf(message);
    const kind = mediaKindFromMessageType(type);
    if (!kind || !node)
        return null;
    return { kind, type, node, message: msg };
}
function pickQuotedMediaNewsletter(m = {}) {
    if (m?.quoted) {
        if (m.quoted.msg && m.quoted.mtype) {
            const kind = mediaKindFromMessageType(m.quoted.mtype);
            if (kind)
                return {
                    kind,
                    type: m.quoted.mtype,
                    node: m.quoted.msg,
                    message: { [m.quoted.mtype]: m.quoted.msg },
                    download: m.quoted.download
                };
        }
        const fromQuoted = pickMediaFromMessageNewsletter(m.quoted.message || m.quoted.msg || {});
        if (fromQuoted)
            return { ...fromQuoted, download: m.quoted.download };
    }
    return pickMediaFromMessageNewsletter(getQuotedMessageObject(m));
}
async function streamToBufferNewsletter(stream) {
    const chunks = [];
    for await (const chunk of stream)
        chunks.push(chunk);
    return Buffer.concat(chunks);
}
async function downloadMediaSourceNewsletter(source = {}) {
    if (!source?.node)
        throw new Error('Media node kosong');
    if (typeof source.download === 'function') {
        const buffer = await source.download();
        if (buffer?.length)
            return Buffer.from(buffer);
    }
    const stream = await downloadContentFromMessage(source.node, source.kind);
    return await streamToBufferNewsletter(stream);
}
function getFfmpegBin() {
    const tries = [];
    try {
        const ffmpegStatic = _require('ffmpeg-static');
        if (ffmpegStatic)
            tries.push(ffmpegStatic);
    }
    catch { }
    try {
        const installer = _require('@ffmpeg-installer/ffmpeg');
        if (installer?.path)
            tries.push(installer.path);
    }
    catch { }
    tries.push(process.env.FFMPEG_PATH || '', 'ffmpeg');
    for (const bin of tries.filter(Boolean)) {
        try {
            if (bin === 'ffmpeg')
                return bin;
            if (fs.existsSync(bin)) {
                try {
                    fs.chmodSync(bin, 0o755);
                }
                catch { }
                return bin;
            }
        }
        catch { }
    }
    return 'ffmpeg';
}
function getFfprobeBin() {
    return 'ffprobe';
}
function audioExtFromMime(mime = '') {
    const m = String(mime || '').toLowerCase();
    if (m.includes('ogg'))
        return 'ogg';
    if (m.includes('opus'))
        return 'opus';
    if (m.includes('mp4') || m.includes('m4a') || m.includes('aac'))
        return 'm4a';
    if (m.includes('mpeg') || m.includes('mp3'))
        return 'mp3';
    if (m.includes('wav'))
        return 'wav';
    return 'mp3';
}
function makeWaveformNewsletter() {
    return Buffer.from(Array.from({ length: 64 }, (_, i) => {
        const v = Math.round(32 + Math.sin(i / 4) * 18 + Math.sin(i / 9) * 8);
        return Math.max(0, Math.min(63, v));
    }));
}
async function convertAudioToOggOpus(buffer, inputExt = 'mp3', ptt = false) {
    if (!buffer?.length)
        throw new Error('Buffer audio kosong');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'upch-audio-'));
    const inFile = path.join(dir, `input.${inputExt || 'mp3'}`);
    const s1 = path.join(dir, 's1.mp3');
    const s2 = path.join(dir, 's2.opus');
    const s3 = path.join(dir, 's3.mp3');
    const outFile = path.join(dir, 'output.ogg');
    const ffmpegBin = getFfmpegBin();
    const run = (args) => new Promise((resolve, reject) => {
        const p = spawn(ffmpegBin, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
        let err = '';
        p.stderr.on('data', d => {
            err += d.toString();
        });
        p.on('close', code => (code === 0 ? resolve() : reject(new Error(err))));
        p.on('error', reject);
    });
    try {
        fs.writeFileSync(inFile, buffer);
        console.log('[UPCH] Step 1: to mp3');
        await run(['-i', inFile, '-vn', s1]);
        console.log('[UPCH] Step 2: to opus');
        await run(['-i', s1, '-vn', '-c:a', 'libopus', s2]);
        console.log('[UPCH] Step 3: to mp3');
        await run(['-i', s2, '-vn', s3]);
        console.log('[UPCH] Step 4: to final opus');
        await run([
            '-i',
            s3,
            '-vn',
            ...(ptt ? ['-ac', '1'] : ['-ac', '2']),
            '-ar',
            '48000',
            '-c:a',
            'libopus',
            '-b:a',
            '64k',
            '-application',
            ptt ? 'voip' : 'audio',
            '-f',
            'ogg',
            outFile
        ]);
        if (!fs.existsSync(outFile))
            throw new Error('Output file tidak ditemukan');
        const out = fs.readFileSync(outFile);
        if (!out?.length)
            throw new Error('Output OGG Opus kosong');
        return out;
    }
    catch (e) {
        throw new Error(`Gagal transcode audio (4-step): ${e?.message || e}`);
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
async function probeAudioSeconds(buffer, inputExt = 'ogg') {
    if (!buffer?.length)
        return undefined;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'upch-probe-'));
    const inFile = path.join(dir, `input.${inputExt || 'ogg'}`);
    try {
        fs.writeFileSync(inFile, buffer);
        const out = await new Promise(resolve => {
            const p = spawn(getFfprobeBin(), [
                '-v',
                'error',
                '-show_entries',
                'format=duration',
                '-of',
                'default=noprint_wrappers=1:nokey=1',
                inFile
            ]);
            let stdout = '';
            p.stdout.on('data', d => {
                stdout += d.toString();
            });
            p.on('close', code => resolve(code === 0 ? stdout : ''));
            p.on('error', () => resolve(''));
        });
        const n = Math.ceil(Number(String(out || '').trim()));
        return Number.isFinite(n) && n > 0 ? n : undefined;
    }
    catch {
        return undefined;
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function parseUpchMode(text = '') {
    const raw = String(text || '').trim();
    const first = raw.split(/\s+/)[0]?.toLowerCase() || '';
    const isVn = ['vn', 'voice', 'ptt', 'voice-note', 'voicenote'].includes(first);
    const isAudio = ['audio', 'lagu', 'music', 'musik', 'mp3'].includes(first);
    return {
        mode: isVn ? 'vn' : isAudio ? 'audio' : '',
        text: (isVn || isAudio) ? raw.split(/\s+/).slice(1).join(' ').trim() : raw
    };
}
async function sourceToNewsletterPayload(source, text = '') {
    const parsed = parseUpchMode(text);
    const caption = String(parsed.text || text || '').trim();
    if (source.kind === 'audio') {
        const buffer = await downloadMediaSourceNewsletter(source);
        const isVn = parsed.mode === 'vn' || source.node?.ptt === true;
        const out = await convertAudioToOggOpus(buffer, audioExtFromMime(source.node?.mimetype), isVn);
        return {
            type: 'audio',
            buffer: out,
            ptt: isVn,
            mimetype: 'audio/ogg; codecs=opus',
            seconds: await probeAudioSeconds(out, 'ogg')
        };
    }
    const buffer = await downloadMediaSourceNewsletter(source);
    if (source.kind === 'image') {
        return { type: 'image', buffer, caption: caption || source.node?.caption || '' };
    }
    if (source.kind === 'video') {
        return {
            type: 'video',
            buffer,
            caption: caption || source.node?.caption || '',
            mimetype: source.node?.mimetype || 'video/mp4',
            seconds: source.node?.seconds
        };
    }
    if (source.kind === 'sticker') {
        return { type: 'sticker', buffer, mimetype: 'image/webp' };
    }
    if (source.kind === 'document') {
        throw new Error('Channel/newsletter tidak support document. Gunakan image, video, audio, sticker, atau text.');
    }
    return null;
}
export async function createNewsletterContentFromInput(m, text = '') {
    const quoted = pickQuotedMediaNewsletter(m);
    const direct = pickMediaFromMessageNewsletter(m?.message || m?.msg || {});
    const source = quoted || direct;
    const caption = String(text || '').trim();
    if (source?.node)
        return await sourceToNewsletterPayload(source, caption);
    if (caption)
        return { type: 'text', text: caption };
    return null;
}
export function normalizeNewsletterJid(id) {
    const v = String(id || '').trim();
    if (!v)
        return '';
    if (v.endsWith('@newsletter'))
        return v;
    if (v.includes('/channel/'))
        return `${v.split('/channel/').pop().split(/[?#]/)[0]}@newsletter`;
    if (v.includes('@'))
        return v;
    return `${v}@newsletter`;
}
function buildNewsletterMediaInput(payload = {}, options = {}) {
    if (payload.type === 'audioRaw' || payload.audioMessage) {
        return {
            audioRaw: payload.audioMessage || payload.rawAudioMessage,
            upchMode: payload._upchAudioMode ||
                ((payload.audioMessage || payload.rawAudioMessage)?.ptt ? 'vn' : 'audio'),
            originalMime: payload._originalMime || (payload.audioMessage || payload.rawAudioMessage)?.mimetype || ''
        };
    }
    if (payload.type === 'image' || payload.image) {
        return {
            image: payload.buffer || payload.image,
            caption: payload.caption || options.caption || '',
            mimetype: payload.mimetype,
            jpegThumbnail: payload.jpegThumbnail
        };
    }
    if (payload.type === 'video' || payload.video) {
        return {
            video: payload.buffer || payload.video,
            caption: payload.caption || options.caption || '',
            mimetype: payload.mimetype || options.mimetype || 'video/mp4',
            gifPlayback: !!payload.gifPlayback,
            jpegThumbnail: payload.jpegThumbnail
        };
    }
    if (payload.type === 'audio' || payload.audio) {
        const ptt = typeof payload.ptt === 'boolean' ? payload.ptt : false;
        return {
            audio: payload.buffer || payload.audio,
            ptt,
            mimetype: payload.mimetype || options.mimetype || 'audio/ogg; codecs=opus',
            seconds: payload.seconds,
            waveform: ptt ? payload.waveform || makeWaveformNewsletter() : undefined
        };
    }
    if (payload.type === 'sticker' || payload.sticker) {
        return {
            sticker: payload.buffer || payload.sticker,
            mimetype: payload.mimetype || 'image/webp'
        };
    }
    return null;
}
function generateWaMessageIdLocal() {
    return `3EB0${crypto.randomBytes(9).toString('hex').toUpperCase()}`;
}
function cloneAudioMessageForNewsletter(audio = {}) {
    const cloned = { ...audio };
    if (!cloned.contextInfo) {
        cloned.contextInfo = {
            mentionedJid: [],
            groupMentions: [],
            statusAttributions: []
        };
    }
    return cloned;
}
export function makeNewsletterHelper(sock) {
    const encoder = getEncoder();
    const genTag = pickTag(sock);
    const newsletterWMexQuery = async (newsletterId, queryId, variables = {}) => {
        const jid = newsletterId ? normalizeNewsletterJid(newsletterId) : undefined;
        return sock.query({
            tag: 'iq',
            attrs: { id: genTag(), type: 'get', xmlns: 'w:mex', to: S_WHATSAPP_NET },
            content: [
                {
                    tag: 'query',
                    attrs: { query_id: queryId },
                    content: encoder.encode(JSON.stringify({ variables: { newsletter_id: jid, ...variables } }))
                }
            ]
        });
    };
    const newsletterMetadata = async (type, key, role = 'GUEST') => {
        const cleaned = cleanInviteKey(key);
        const mode = String(type || 'INVITE').toUpperCase();
        const result = await newsletterWMexQuery(undefined, NEWSLETTER_QUERY_IDS.METADATA, {
            input: { key: cleaned, type: mode, view_role: role },
            fetch_viewer_metadata: true,
            fetch_full_image: true,
            fetch_creation_time: true
        });
        return parseMexResult(result);
    };
    const relayNewsletter = async (jid, message, options = {}) => {
        const target = normalizeNewsletterJid(jid);
        const messageId = options.messageId || genTag();
        await sock.relayMessage(target, message, {
            messageId,
            additionalAttributes: { ...(options.additionalAttributes || {}), newsletter: 'true' },
            ...options.relay
        });
        return { key: { id: messageId, remoteJid: target }, message };
    };
    async function sendViaSockSendMessage(target, payload, options = {}) {
        if (typeof sock?.sendMessage !== 'function')
            throw new Error('sock.sendMessage tidak tersedia');
        const sendOptions = options.sendOptions || {};
        const res = await sock.sendMessage(target, payload, sendOptions);
        return {
            ok: true,
            jid: target,
            type: payload?.text
                ? 'text'
                : payload?.image
                    ? 'image'
                    : payload?.video
                        ? 'video'
                        : payload?.audio
                            ? 'audio'
                            : payload?.sticker
                                ? 'sticker'
                                : 'unknown',
            mode: 'sock.sendMessage',
            key: res?.key,
            message: res?.message,
            result: res
        };
    }
    const sendNewsletterText = async (jid, text, options = {}) => {
        const target = normalizeNewsletterJid(jid);
        const payload = { text: text || ' ' };
        try {
            return await sendViaSockSendMessage(target, payload, options);
        }
        catch (sendErr) {
            console.error('[UPCH] sock.sendMessage text gagal, fallback relay:', sendErr?.message || sendErr);
            const msg = generateWAMessageFromContent(target, {
                extendedTextMessage: {
                    text: text || ' ',
                    contextInfo: options.contextInfo || {}
                }
            }, { userJid: sock.user?.id, logger: sock.logger });
            const rel = await relayNewsletter(target, msg.message, {
                ...options,
                messageId: options.messageId || msg.key.id
            });
            return {
                ok: true,
                jid: target,
                type: 'text',
                mode: 'relayMessage.generated',
                key: rel?.key,
                message: rel?.message,
                result: rel
            };
        }
    };
    const sendNewsletterMediaPayload = async (jid, payload, options = {}) => {
        const target = normalizeNewsletterJid(jid);
        const input = buildNewsletterMediaInput(payload, options);
        if (!input)
            throw new Error('Payload media channel tidak valid / document tidak didukung');
        if (input.audioRaw) {
            const audioMessage = cloneAudioMessageForNewsletter(input.audioRaw);
            const message = {
                audioMessage,
                messageContextInfo: {
                    threadId: [],
                    botMetadata: {}
                }
            };
            const messageId = options.messageId || generateWaMessageIdLocal();
            const rel = await relayNewsletter(target, message, {
                ...options,
                messageId,
                additionalAttributes: {
                    ...(options.additionalAttributes || {})
                }
            });
            return {
                ok: true,
                jid: target,
                type: 'audio',
                mode: audioMessage.ptt ? 'relayMessage.raw-clone-vn' : 'relayMessage.raw-clone-audio',
                key: rel?.key || { id: messageId, remoteJid: target },
                message: rel?.message || message,
                result: rel,
                audioInfo: {
                    mimetype: audioMessage.mimetype || '-',
                    ptt: !!audioMessage.ptt,
                    seconds: audioMessage.seconds || '-',
                    bytes: audioMessage.fileLength?.low || audioMessage.fileLength || '-',
                    directPath: audioMessage.directPath ? 'yes' : 'no',
                    mediaUrl: audioMessage.url ? 'yes' : 'no',
                    mediaKey: audioMessage.mediaKey ? 'yes' : 'no',
                    fileEncSha256: audioMessage.fileEncSha256 ? 'yes' : 'no',
                    upchMode: input.upchMode || (audioMessage.ptt ? 'vn' : 'audio')
                }
            };
        }
        try {
            const sent = await sendViaSockSendMessage(target, input, options);
            if (input.audio) {
                ;
                sent.audioInfo = {
                    mimetype: input.mimetype,
                    ptt: !!input.ptt,
                    seconds: input.seconds,
                    bytes: input.audio?.length,
                    waveform: !!input.waveform
                };
            }
            return sent;
        }
        catch (sendErr) {
            console.error('[UPCH] sock.sendMessage media gagal, fallback generate+relay:', sendErr?.message || sendErr);
            const waMsg = await generateWAMessage(target, input, {
                logger: sock.logger,
                userJid: sock.user?.id,
                ...options,
                upload: (stream, opts) => sock.waUploadToServer(stream, { ...opts, newsletter: true })
            });
            const rel = await relayNewsletter(target, waMsg.message, {
                ...options,
                messageId: options.messageId || waMsg.key.id
            });
            return {
                ok: true,
                jid: target,
                type: payload?.type || Object.keys(input)[0] || 'media',
                mode: 'relayMessage.generated',
                key: rel?.key,
                message: rel?.message,
                result: rel
            };
        }
    };
    const sendNewsletterMessage = async (jid, content, options = {}) => {
        if (typeof content === 'string')
            return await sendNewsletterText(jid, content, options);
        if (content?.type === 'text' ||
            (content?.text && !content.image && !content.video && !content.audio && !content.sticker && !content.buffer)) {
            return await sendNewsletterText(jid, content.text || '', options);
        }
        return await sendNewsletterMediaPayload(jid, content, options);
    };
    const targetBuilder = (jid) => {
        const target = normalizeNewsletterJid(jid);
        return {
            text: (text) => ({ send: (opts) => sendNewsletterText(target, text, opts) }),
            image: (image, caption = '') => ({
                send: (opts) => sendNewsletterMessage(target, { type: 'image', buffer: image, caption }, opts)
            }),
            video: (video, caption = '') => ({
                send: (opts) => sendNewsletterMessage(target, { type: 'video', buffer: video, caption, mimetype: opts?.mimetype || 'video/mp4' }, opts)
            }),
            audio: (audio, ptt = false) => ({
                send: (opts = {}) => sendNewsletterMessage(target, {
                    type: 'audio',
                    buffer: audio,
                    mimetype: opts.mimetype || 'audio/ogg; codecs=opus',
                    ptt: ptt === true
                }, opts)
            }),
            sticker: (sticker) => ({
                send: (opts) => sendNewsletterMessage(target, { type: 'sticker', buffer: sticker }, opts)
            }),
            send: (content, opts) => sendNewsletterMessage(target, content, opts)
        };
    };
    return {
        newsletterWMexQuery,
        newsletterMetadata,
        sendNewsletterMessage,
        sendNewsletterText,
        sendNewsletterMediaPayload,
        relayNewsletterMessage: relayNewsletter,
        normalizeNewsletterJid,
        upch: { target: targetBuilder },
        toch: { target: targetBuilder }
    };
}
export class UpchBuilder {
    constructor(sock) {
        _UpchBuilder_sock.set(this, void 0);
        _UpchBuilder_media.set(this, null);
        _UpchBuilder_caption.set(this, '');
        _UpchBuilder_ptv.set(this, false);
        _UpchBuilder_type.set(this, 'text');
        if (!sock)
            throw new Error('Socket is required');
        __classPrivateFieldSet(this, _UpchBuilder_sock, sock, "f");
    }
    image(input) {
        if (!input)
            return this;
        __classPrivateFieldSet(this, _UpchBuilder_type, 'image', "f");
        __classPrivateFieldSet(this, _UpchBuilder_media, input, "f");
        return this;
    }
    video(input, opts = {}) {
        if (!input)
            return this;
        __classPrivateFieldSet(this, _UpchBuilder_type, 'video', "f");
        __classPrivateFieldSet(this, _UpchBuilder_media, input, "f");
        __classPrivateFieldSet(this, _UpchBuilder_ptv, opts?.ptv === true, "f");
        return this;
    }
    audio(input) {
        if (!input)
            return this;
        __classPrivateFieldSet(this, _UpchBuilder_type, 'audio', "f");
        __classPrivateFieldSet(this, _UpchBuilder_media, input, "f");
        return this;
    }
    caption(text = '') {
        __classPrivateFieldSet(this, _UpchBuilder_caption, String(text ?? ''), "f");
        if (__classPrivateFieldGet(this, _UpchBuilder_type, "f") === 'text' && __classPrivateFieldGet(this, _UpchBuilder_caption, "f"))
            __classPrivateFieldSet(this, _UpchBuilder_type, 'caption', "f");
        return this;
    }
    ptv(val = true) {
        __classPrivateFieldSet(this, _UpchBuilder_ptv, Boolean(val), "f");
        if (__classPrivateFieldGet(this, _UpchBuilder_type, "f") === 'video')
            __classPrivateFieldSet(this, _UpchBuilder_type, 'video', "f");
        return this;
    }
    async sendch(target, options = {}) {
        const jid = typeof target === 'string' ? target : target?.remoteJid || target?.jid || target;
        if (!jid)
            throw new Error('Target JID channel required');
        const newsletterJid = normalizeNewsletterJid(jid);
        if (__classPrivateFieldGet(this, _UpchBuilder_media, "f") && __classPrivateFieldGet(this, _UpchBuilder_type, "f") !== 'text') {
            if (__classPrivateFieldGet(this, _UpchBuilder_type, "f") === 'audio' && Buffer.isBuffer(__classPrivateFieldGet(this, _UpchBuilder_media, "f"))) {
                const ext = audioExtFromMime('');
                const out = await convertAudioToOggOpus(__classPrivateFieldGet(this, _UpchBuilder_media, "f"), ext, false);
                const seconds = await probeAudioSeconds(out, 'ogg');
                const payload = {
                    type: 'audio',
                    buffer: out,
                    ptt: false,
                    mimetype: 'audio/ogg; codecs=opus',
                    seconds
                };
                return __classPrivateFieldGet(this, _UpchBuilder_sock, "f").sendNewsletterMessage(newsletterJid, payload, options);
            }
            const payload = {
                type: __classPrivateFieldGet(this, _UpchBuilder_type, "f"),
                buffer: __classPrivateFieldGet(this, _UpchBuilder_media, "f"),
                caption: __classPrivateFieldGet(this, _UpchBuilder_caption, "f"),
                ...(__classPrivateFieldGet(this, _UpchBuilder_type, "f") === 'video' ? { ptv: __classPrivateFieldGet(this, _UpchBuilder_ptv, "f") } : {}),
                ...(__classPrivateFieldGet(this, _UpchBuilder_type, "f") === 'audio' ? { ptt: false } : {})
            };
            return __classPrivateFieldGet(this, _UpchBuilder_sock, "f").sendNewsletterMessage(newsletterJid, payload, options);
        }
        if (options.quotedMessage && !__classPrivateFieldGet(this, _UpchBuilder_media, "f")) {
            const content = await createNewsletterContentFromInput(options.quotedMessage, __classPrivateFieldGet(this, _UpchBuilder_caption, "f"));
            if (content)
                return __classPrivateFieldGet(this, _UpchBuilder_sock, "f").sendNewsletterMessage(newsletterJid, content, options);
        }
        if (__classPrivateFieldGet(this, _UpchBuilder_caption, "f")) {
            return __classPrivateFieldGet(this, _UpchBuilder_sock, "f").sendNewsletterMessage(newsletterJid, { type: 'text', text: __classPrivateFieldGet(this, _UpchBuilder_caption, "f") }, options);
        }
        throw new Error('Tidak ada konten untuk dikirim. Gunakan .image(), .video(), .audio(), .caption(), atau reply media.');
    }
    async send(jid, options = {}) {
        if (!jid)
            throw new Error('Target JID required');
        if (__classPrivateFieldGet(this, _UpchBuilder_type, "f") === 'video' && __classPrivateFieldGet(this, _UpchBuilder_ptv, "f") && __classPrivateFieldGet(this, _UpchBuilder_media, "f")) {
            const msgContent = {
                video: __classPrivateFieldGet(this, _UpchBuilder_media, "f"),
                ptv: true,
                caption: __classPrivateFieldGet(this, _UpchBuilder_caption, "f") || undefined
            };
            return __classPrivateFieldGet(this, _UpchBuilder_sock, "f").sendMessage(jid, msgContent, { quoted: options.quoted });
        }
        if (__classPrivateFieldGet(this, _UpchBuilder_media, "f") && __classPrivateFieldGet(this, _UpchBuilder_type, "f") !== 'text') {
            const msgContent = {
                [__classPrivateFieldGet(this, _UpchBuilder_type, "f")]: __classPrivateFieldGet(this, _UpchBuilder_media, "f"),
                caption: __classPrivateFieldGet(this, _UpchBuilder_caption, "f") || undefined
            };
            if (__classPrivateFieldGet(this, _UpchBuilder_type, "f") === 'video')
                msgContent.ptv = __classPrivateFieldGet(this, _UpchBuilder_ptv, "f");
            return __classPrivateFieldGet(this, _UpchBuilder_sock, "f").sendMessage(jid, msgContent, { quoted: options.quoted });
        }
        if (__classPrivateFieldGet(this, _UpchBuilder_caption, "f")) {
            return __classPrivateFieldGet(this, _UpchBuilder_sock, "f").sendMessage(jid, { text: __classPrivateFieldGet(this, _UpchBuilder_caption, "f") }, { quoted: options.quoted });
        }
        throw new Error('Tidak ada konten. Gunakan .image(), .video(), .audio(), atau .caption()');
    }
}
_UpchBuilder_sock = new WeakMap(), _UpchBuilder_media = new WeakMap(), _UpchBuilder_caption = new WeakMap(), _UpchBuilder_ptv = new WeakMap(), _UpchBuilder_type = new WeakMap();
export function createUpchBuilder(sock) {
    return new UpchBuilder(sock);
}
export const patchUpchBuilder = (sock) => {
    if (!sock || sock.__upchBuilderPatched)
        return sock;
    sock.upch = () => createUpchBuilder(sock);
    sock.UpchBuilder = UpchBuilder;
    sock.__upchBuilderPatched = true;
    return sock;
};
export const patchNewsletter = (sock) => {
    const helper = makeNewsletterHelper(sock);
    Object.assign(sock, helper);
    patchUpchBuilder(sock);
    // ── Non-chain convenience method ─────────────────────
    sock.sendUpch = async (jid, payload = {}, options = {}) => {
        const u = new UpchBuilder(sock);
        if (payload.type === 'image' || payload.image) {
            u.image(payload.image || payload.buffer);
            if (payload.caption)
                u.caption(payload.caption);
            return u.sendch(jid, options);
        }
        if (payload.type === 'video' || payload.video) {
            u.video(payload.video || payload.buffer, { ptv: payload.ptv });
            if (payload.caption)
                u.caption(payload.caption);
            return payload.ptv ? u.send(jid, options) : u.sendch(jid, options);
        }
        if (payload.type === 'audio' || payload.audio) {
            u.audio(payload.audio || payload.buffer);
            if (payload.caption)
                u.caption(payload.caption);
            if (payload.ptv)
                u.ptv();
            return payload.ptv ? u.send(jid, options) : u.sendch(jid, options);
        }
        if (payload.type === 'sticker' || payload.sticker) {
            // sticker via sendMessage
            return sock.sendMessage(jid, { sticker: payload.sticker || payload.buffer }, options);
        }
        // text fallback
        return sock.sendMessage(jid, { text: String(payload.text || payload.caption || '') }, options);
    };
    return sock;
};
// ============================================================
// AI RICH
// (dipindahkan dari lib/airich.js)
// ============================================================
const VERSION = '4.6';
function extractIE(text, { extract = true, hyperlink = true, citation = true, latex = true } = {}) {
    if (!extract || !text || typeof text !== 'string' || !text.includes('[')) {
        return {
            text,
            ie: [],
            inline_entities: []
        };
    }
    const createIE = (type, ie) => {
        if (type == 'hyperlink') {
            return {
                key: ie.key,
                metadata: {
                    display_name: ie.text,
                    is_trusted: ie.is_trusted,
                    url: ie.url,
                    __typename: 'GenAIInlineLinkItem'
                }
            };
        }
        if (type == 'citation') {
            return {
                key: ie.key,
                metadata: {
                    reference_id: ie.reference_id,
                    reference_url: ie.url,
                    reference_title: ie.url,
                    reference_display_name: ie.url,
                    sources: [],
                    __typename: 'GenAISearchCitationItem'
                }
            };
        }
        if (type == 'latex') {
            return {
                key: ie.key,
                metadata: {
                    latex_expression: ie.text,
                    latex_image: {
                        url: ie.url,
                        width: Number(ie.width) || 100,
                        height: Number(ie.height) || 100
                    },
                    font_height: Number(ie.font_height) || 83.333333333333,
                    padding: Number(ie.padding) || 15,
                    __typename: 'GenAILatexItem'
                }
            };
        }
    };
    let ie = [];
    let inline_entities = [];
    let result = '';
    let last = 0;
    let citation_index = 1;
    let hyperlink_index = 0;
    let latex_index = 0;
    let stack = [];
    for (let i = 0; i < text.length; i++) {
        if (text[i] == '[' && text[i - 1] != '\\') {
            stack.push(i);
        }
        else if (text[i] == ']' && (text[i + 1] == '(' || text[i + 1] == '<')) {
            let start = stack.pop();
            if (start == null)
                continue;
            let open = text[i + 1];
            let close = open == '(' ? ')' : '>';
            let type = open == '(' ? 'link' : 'latex';
            let end = i + 2;
            let depth = 1;
            while (end < text.length && depth) {
                if (text[end] == open && text[end - 1] != '\\')
                    depth++;
                else if (text[end] == close && text[end - 1] != '\\')
                    depth--;
                end++;
            }
            if (depth)
                continue;
            let raw = text.slice(start + 1, i).trim();
            let url = text.slice(i + 2, end - 1).trim();
            let key;
            let tag;
            let data;
            if (type == 'latex') {
                if (!latex)
                    continue;
                let [txt = '', width = null, height = null, font_height = null, padding = null] = raw.split('|');
                key = `NIXEL_LATEX_${latex_index++}`;
                tag = `{{${key}}}${txt || 'image'}{{/${key}}}`;
                data = {
                    type: 'latex',
                    ie: {
                        key,
                        text: txt,
                        url,
                        width,
                        height,
                        font_height,
                        padding
                    }
                };
            }
            else if (raw) {
                if (!hyperlink)
                    continue;
                const trusted = !url.startsWith('!');
                if (!trusted) {
                    url = url.slice(1);
                }
                key = `NIXEL_HYPERLINK_${hyperlink_index++}`;
                tag = `{{${key}}}${url}{{/${key}}}`;
                data = {
                    type: 'hyperlink',
                    ie: {
                        key,
                        text: raw,
                        url,
                        is_trusted: trusted
                    }
                };
            }
            else {
                if (!citation)
                    continue;
                key = `NIXEL_CITATION_${citation_index - 1}`;
                tag = `{{${key}}}${url}{{/${key}}}`;
                data = {
                    type: 'citation',
                    ie: {
                        reference_id: citation_index++,
                        key,
                        text: '',
                        url
                    }
                };
            }
            result += text.slice(last, start) + tag;
            last = end;
            ie.push(data);
            const entity = createIE(data.type, data.ie);
            if (entity) {
                inline_entities.push(entity);
            }
            i = end - 1;
        }
    }
    result += text.slice(last);
    return {
        text: result,
        ie,
        inline_entities
    };
}
async function waitAllPromises(input) {
    const isPromise = (v) => v && typeof v.then === 'function';
    const isObject = (v) => v && typeof v === 'object';
    const deep = async (v) => {
        if (isPromise(v))
            return deep(await v);
        if (Array.isArray(v))
            return Promise.all(v.map(deep));
        if (isObject(v)) {
            const entries = await Promise.all(Object.entries(v).map(async ([k, val]) => [k, await deep(val)]));
            return Object.fromEntries(entries);
        }
        return v;
    };
    return deep(await input);
}
class Toolkit {
    constructor() { }
    static extractIE(text, { extract = true, hyperlink = true, citation = true, latex = true } = {}) {
        return extractIE(text, { extract, hyperlink, citation, latex });
    }
    static async resize(buffer, x, y, fit = 'cover') {
        const s = loadSharp();
        if (!s)
            throw new Error('sharp is not installed (optional dependency)');
        return await s(buffer)
            .resize(x, y, {
            fit,
            position: 'center',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
            .png()
            .toBuffer();
    }
    static async waitAllPromises(input) {
        return await waitAllPromises(input);
    }
    static async fetchBuffer(url, options = {}, { silent = true } = {}) {
        try {
            let response = await fetch(url, options);
            if (!response.ok)
                throw Error(`HTTP ${response.status}`);
            return Buffer.from(await response.arrayBuffer());
        }
        catch (error) {
            if (silent)
                return Buffer.alloc(0);
            throw error;
        }
    }
    static async toUrl(_client, p, mediaType = 'document') {
        if (!p)
            throw new Error('Url or buffer needed');
        const media = await prepareWAMessageMedia({
            [mediaType]: Buffer.isBuffer(p) ? p : { url: p }
        }, {
            upload: _client.waUploadToServer,
            jid: '@newsletter'
        });
        return Object.values(media)[0]?.url;
    }
    static async resolveMedia(_client, media, mediaType = 'image', { resolveUrl = false, resolveWAUrl = false, result = 'url', resize = false, width = 300, height = 300 } = {}) {
        const isUrl = (str) => /^https?:\/\/.+/i.test(str);
        const isWAUrl = (str) => /^https?:\/\/[^/]*\.whatsapp\.net\//i.test(str);
        if (Array.isArray(media)) {
            return Promise.all(media.map((item) => Toolkit.resolveMedia(_client, item, mediaType, {
                resolveUrl,
                resolveWAUrl,
                result,
                resize,
                width,
                height
            })));
        }
        const originalIsBuffer = Buffer.isBuffer(media);
        if (typeof media === 'string' && isUrl(media)) {
            if (isWAUrl(media)) {
                if (resolveWAUrl) {
                    media = await Toolkit.fetchBuffer(media, {}, { silent: true });
                }
                else if (!resolveUrl) {
                    if (result === 'url')
                        return media;
                    media = await Toolkit.fetchBuffer(media, {}, { silent: true });
                }
            }
            else {
                if (!resolveUrl) {
                    if (result === 'url')
                        return media;
                    media = await Toolkit.fetchBuffer(media, {}, { silent: true });
                }
                else {
                    media = await Toolkit.fetchBuffer(media, {}, { silent: true });
                }
            }
        }
        if (typeof media === 'string' && !isUrl(media)) {
            media = Buffer.from(media, 'base64');
        }
        if (!Buffer.isBuffer(media) || !media.length) {
            return;
        }
        if (resize && Buffer.isBuffer(media)) {
            media = await Toolkit.resize(media, width, height);
        }
        if (result === 'buffer') {
            return media;
        }
        if (result === 'base64') {
            return media.toString('base64');
        }
        if (originalIsBuffer) {
            return Toolkit.toUrl(_client, media, mediaType);
        }
        return Toolkit.toUrl(_client, media, mediaType);
    }
    static getMp4Duration(buffer, { silent = true } = {}) {
        try {
            if (!Buffer.isBuffer(buffer) || buffer.length < 8) {
                if (silent)
                    return 0;
                throw new Error('Invalid buffer');
            }
            let offset = 0;
            while (offset < buffer.length - 8) {
                const size = buffer.readUInt32BE(offset);
                if (size < 8 || offset + size > buffer.length) {
                    if (silent)
                        return 0;
                    throw new Error('Invalid atom size');
                }
                const type = buffer.toString('ascii', offset + 4, offset + 8);
                if (type === 'moov') {
                    let moovOffset = offset + 8;
                    const moovEnd = offset + size;
                    while (moovOffset < moovEnd - 8) {
                        const childSize = buffer.readUInt32BE(moovOffset);
                        if (childSize < 8 || moovOffset + childSize > moovEnd) {
                            if (silent)
                                return 0;
                            throw new Error('Invalid child atom size');
                        }
                        const childType = buffer.toString('ascii', moovOffset + 4, moovOffset + 8);
                        if (childType === 'mvhd') {
                            const version = buffer.readUInt8(moovOffset + 8);
                            if (version === 0) {
                                const timescale = buffer.readUInt32BE(moovOffset + 20);
                                const duration = buffer.readUInt32BE(moovOffset + 24);
                                if (!timescale) {
                                    if (silent)
                                        return 0;
                                    throw new Error('Invalid timescale');
                                }
                                return duration / timescale;
                            }
                            if (version === 1) {
                                const timescale = buffer.readUInt32BE(moovOffset + 32);
                                const duration = Number(buffer.readBigUInt64BE(moovOffset + 36));
                                if (!timescale) {
                                    if (silent)
                                        return 0;
                                    throw new Error('Invalid timescale');
                                }
                                return duration / timescale;
                            }
                        }
                        moovOffset += childSize;
                    }
                }
                offset += size;
            }
            if (silent)
                return 0;
            throw new Error('No mvhd found!');
        }
        catch (err) {
            if (silent)
                return 0;
            throw err;
        }
    }
    static getMp4Preview(videoBuffer, { time, result = 'buffer', resize = true, width = 300, height = 300, silent = true } = {}) {
        return new Promise((resolve, reject) => {
            const fail = (err) => {
                if (silent) {
                    return resolve(result === 'base64' ? '' : Buffer.alloc(0));
                }
                return reject(err);
            };
            try {
                if (!Buffer.isBuffer(videoBuffer) || !videoBuffer.length) {
                    return fail(new Error('videoBuffer tidak valid atau kosong'));
                }
                const inputStream = new Readable({ read() { } });
                inputStream.push(videoBuffer);
                inputStream.push(null);
                const outputStream = new PassThrough();
                const chunks = [];
                outputStream.on('data', (chunk) => chunks.push(chunk));
                outputStream.on('end', async () => {
                    try {
                        let output = Buffer.concat(chunks);
                        if (!output.length) {
                            return fail(new Error('Output kosong — cek format atau timestamp video'));
                        }
                        if (resize) {
                            output = await Toolkit.resize(output, width, height);
                        }
                        return resolve(result === 'base64' ? output.toString('base64') : output);
                    }
                    catch (err) {
                        return fail(err);
                    }
                });
                outputStream.on('error', fail);
                time ?? (time = Math.min(Toolkit.getMp4Duration(videoBuffer) * 0.2, 10));
                const ff = loadFluentFfmpeg();
                ff(inputStream)
                    .outputOptions([`-ss ${time}`, '-vframes 1', '-vcodec png', '-f image2pipe'])
                    .on('error', (err) => fail(new Error(`ffmpeg error: ${err.message}`)))
                    .pipe(outputStream, { end: true });
            }
            catch (err) {
                return fail(err);
            }
        });
    }
}
class BaseBuilder {
    constructor() {
        this._title = '';
        this._subtitle = '';
        this._body = '';
        this._footer = '';
        this._contextInfo = {};
        this._extraPayload = {};
    }
    setTitle(title) {
        if (typeof title !== 'string') {
            throw new TypeError('Title must be a string');
        }
        this._title = title;
        return this;
    }
    setSubtitle(subtitle) {
        if (typeof subtitle !== 'string') {
            throw new TypeError('Subtitle must be a string');
        }
        this._subtitle = subtitle;
        return this;
    }
    setBody(body) {
        if (typeof body !== 'string') {
            throw new TypeError('Body must be a string');
        }
        this._body = body;
        return this;
    }
    setFooter(footer) {
        if (typeof footer !== 'string') {
            throw new TypeError('Footer must be a string');
        }
        this._footer = footer;
        return this;
    }
    setContextInfo(obj) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
            throw new TypeError('ContextInfo must be a plain object');
        }
        this._contextInfo = obj;
        return this;
    }
    addPayload(obj) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
            throw new TypeError('Payload must be a plain object');
        }
        Object.assign(this._extraPayload, obj);
        return this;
    }
}
class AIRich extends BaseBuilder {
    constructor(client) {
        if (!client) {
            throw new Error('Socket is required');
        }
        super();
        _AIRich_client.set(this, void 0);
        __classPrivateFieldSet(this, _AIRich_client, client, "f");
        this._contextInfo = {};
        this._submessages = [];
        this._sections = [];
        this._richResponseSources = [];
    }
    addSubmessage(submessage) {
        const items = Array.isArray(submessage) ? submessage : [submessage];
        for (const item of items) {
            if (typeof item !== 'object' || item === null || Array.isArray(item)) {
                throw new TypeError('Submessage must be a plain object or array of plain objects');
            }
            this._submessages.push(item);
        }
        return this;
    }
    addSection(section) {
        const items = Array.isArray(section) ? section : [section];
        for (const item of items) {
            if (typeof item !== 'object' || item === null || Array.isArray(item)) {
                throw new TypeError('Section must be a plain object or array of plain objects');
            }
            this._sections.push(item);
        }
        return this;
    }
    addText(text, { hyperlink = true, citation = true, latex = true } = {}) {
        if (typeof text != 'string') {
            throw new TypeError('Text must be a string');
        }
        const { text: extractedText, inline_entities } = extractIE(text, {
            hyperlink,
            citation,
            latex
        });
        this._submessages.push({
            messageType: 2,
            messageText: extractedText
        });
        this._sections.push(AIRich.newLayout('Single', {
            text: extractedText,
            ...(inline_entities.length && {
                inline_entities
            }),
            __typename: 'GenAIMarkdownTextUXPrimitive'
        }));
        return this;
    }
    addCode(language, code) {
        if (typeof language !== 'string' || typeof code !== 'string') {
            throw new TypeError('Language and code must be a string');
        }
        const meta = AIRich.tokenizer(code, language);
        this._submessages.push({
            messageType: 5,
            codeMetadata: {
                codeLanguage: language,
                codeBlocks: meta.codeBlock
            }
        });
        this._sections.push(AIRich.newLayout('Single', {
            language,
            code_blocks: meta.unified_codeBlock,
            __typename: 'GenAICodeUXPrimitive'
        }));
        return this;
    }
    addTable(table, { hyperlink = true, citation = true, latex = true } = {}) {
        if (!Array.isArray(table)) {
            throw new TypeError('Table must be an array');
        }
        const meta = AIRich.toTableMetadata(table, { hyperlink, citation, latex });
        this._submessages.push({
            messageType: 4,
            tableMetadata: {
                title: meta.title,
                rows: meta.rows
            }
        });
        this._sections.push(AIRich.newLayout('Single', {
            rows: meta.unified_rows,
            __typename: 'GenATableUXPrimitive'
        }));
        return this;
    }
    addSource(sources = []) {
        if (!(Array.isArray(sources) &&
            (sources.every((item) => typeof item === 'string') ||
                sources.every((item) => Array.isArray(item) && item.every((v) => typeof v === 'string'))))) {
            throw new TypeError('Sources must be a string array or an array of string arrays');
        }
        if (sources.every((item) => typeof item === 'string')) {
            sources = [sources];
        }
        const source = sources.map(([icon, url, text]) => ({
            source_type: 'THIRD_PARTY',
            source_display_name: text ?? '',
            source_subtitle: 'AI',
            source_url: url ?? '',
            favicon: {
                url: Toolkit.resolveMedia(__classPrivateFieldGet(this, _AIRich_client, "f"), icon ?? '', 'image'),
                mime_type: 'image/jpeg',
                width: 16,
                height: 16
            }
        }));
        this._sections.push(AIRich.newLayout('Single', {
            sources: source,
            __typename: 'GenAISearchResultPrimitive'
        }));
        return this;
    }
    addReels(reelsItems = []) {
        if (!((reelsItems && typeof reelsItems === 'object' && !Array.isArray(reelsItems)) ||
            (Array.isArray(reelsItems) &&
                reelsItems.every((item) => item && typeof item === 'object' && !Array.isArray(item))))) {
            throw new TypeError('Reels items must be an object or an array of objects');
        }
        if (!Array.isArray(reelsItems)) {
            reelsItems = [reelsItems];
        }
        const reels = reelsItems.map((item) => ({
            ...item,
            _avatar: Toolkit.resolveMedia(__classPrivateFieldGet(this, _AIRich_client, "f"), item.profileIconUrl ?? item.profile_url ?? item.profile ?? '', 'image'),
            _thumbnail: Toolkit.resolveMedia(__classPrivateFieldGet(this, _AIRich_client, "f"), item.thumbnailUrl ?? item.thumbnail ?? '', 'image')
        }));
        this._submessages.push({
            messageType: 9,
            contentItemsMetadata: {
                contentType: 1,
                itemsMetadata: reels.map((item) => ({
                    reelItem: {
                        title: item.username ?? '',
                        profileIconUrl: item._avatar,
                        thumbnailUrl: item._thumbnail,
                        videoUrl: item.videoUrl ?? item.url ?? ''
                    }
                }))
            }
        });
        reels.forEach((item, idx) => {
            this._richResponseSources.push({
                provider: 'NIXEL',
                thumbnailCDNURL: item._thumbnail,
                sourceProviderURL: item.videoUrl ?? item.url ?? '',
                sourceQuery: '',
                faviconCDNURL: item._avatar,
                citationNumber: idx + 1,
                sourceTitle: item.username ?? ''
            });
        });
        this._sections.push(AIRich.newLayout('HScroll', reels.map((item) => ({
            reels_url: item.videoUrl ?? item.url ?? '',
            thumbnail_url: item._thumbnail,
            creator: item.username ?? item.title ?? '',
            avatar_url: item._avatar,
            reels_title: item.reels_title ?? item.title ?? '',
            likes_count: item.likes_count ?? item.like ?? 0,
            shares_count: item.shares_count ?? item.share ?? 0,
            view_count: item.view_count ?? item.view ?? 0,
            reel_source: item.reel_source ?? item.source ?? 'IG',
            is_verified: !!(item.is_verified || item.verified),
            __typename: 'GenAIReelPrimitive'
        }))));
        return this;
    }
    addImage(imageUrl, { resolveUrl = false } = {}) {
        if (!(typeof imageUrl === 'string' ||
            Buffer.isBuffer(imageUrl) ||
            (Array.isArray(imageUrl) && imageUrl.every((v) => typeof v === 'string' || Buffer.isBuffer(v))))) {
            throw new TypeError('imageUrl must be string | buffer | array of string/buffer');
        }
        const list = Array.isArray(imageUrl)
            ? imageUrl.map((v) => {
                const url = Toolkit.resolveMedia(__classPrivateFieldGet(this, _AIRich_client, "f"), v, 'image', { resolveUrl });
                return {
                    imagePreviewUrl: url,
                    imageHighResUrl: url,
                    sourceUrl: url
                };
            })
            : (() => {
                const url = Toolkit.resolveMedia(__classPrivateFieldGet(this, _AIRich_client, "f"), imageUrl, 'image', { resolveUrl });
                return [
                    {
                        imagePreviewUrl: url,
                        imageHighResUrl: url,
                        sourceUrl: url
                    }
                ];
            })();
        this._submessages.push({
            messageType: 1,
            gridImageMetadata: {
                gridImageUrl: {
                    imagePreviewUrl: list[0]?.imagePreviewUrl
                },
                imageUrls: list
            }
        });
        list.forEach(({ imagePreviewUrl }) => {
            this._sections.push(AIRich.newLayout('Single', {
                media: {
                    url: imagePreviewUrl,
                    mime_type: 'image/png'
                },
                imagine_type: 'IMAGE',
                status: { status: 'READY' },
                __typename: 'GenAIImaginePrimitive'
            }));
        });
        return this;
    }
    addVideo(videoUrl, { autoFill = true } = {}) {
        const isObjectVideo = (v) => v && typeof v === 'object' && v.url;
        const isValidPrimitive = typeof videoUrl === 'string' ||
            Buffer.isBuffer(videoUrl) ||
            isObjectVideo(videoUrl) ||
            (Array.isArray(videoUrl) &&
                videoUrl.every((v) => typeof v === 'string' || Buffer.isBuffer(v) || isObjectVideo(v)));
        if (!isValidPrimitive) {
            throw new TypeError('videoUrl must be string | buffer | object | array');
        }
        const items = Array.isArray(videoUrl) ? videoUrl : [videoUrl];
        this._submessages.push({
            messageType: 2,
            messageText: '[ CANNOT_LOAD_VIDEO - NIXEL ]'
        });
        items.forEach((item) => {
            const isObject = isObjectVideo(item);
            const url = isObject
                ? Toolkit.resolveMedia(__classPrivateFieldGet(this, _AIRich_client, "f"), item.url ?? '', 'video')
                : Toolkit.resolveMedia(__classPrivateFieldGet(this, _AIRich_client, "f"), item, 'video');
            const bufferPromise = autoFill
                ? Promise.resolve(url).then((u) => Toolkit.fetchBuffer(u))
                : null;
            const file_length = isObject && item.file_length != null
                ? item.file_length
                : autoFill
                    ? bufferPromise.then((b) => b?.length ?? 0)
                    : 0;
            const duration = isObject && item.duration != null
                ? item.duration
                : autoFill
                    ? bufferPromise.then((b) => Toolkit.getMp4Duration(b, {
                        silent: true
                    }))
                    : 0;
            const thumbnail = isObject && item.thumbnail
                ? Toolkit.resolveMedia(__classPrivateFieldGet(this, _AIRich_client, "f"), item.thumbnail, 'image', {
                    result: 'base64',
                    resize: true,
                    width: 300,
                    height: 300
                })
                : autoFill
                    ? bufferPromise
                        ? bufferPromise.then((b) => Toolkit.getMp4Preview(b, {
                            time: 0,
                            result: 'base64'
                        }))
                        : null
                    : null;
            this._sections.push(AIRich.newLayout('Single', {
                media: {
                    url,
                    mime_type: isObject ? item.mime_type ?? 'video/mp4' : 'video/mp4',
                    file_length,
                    duration
                },
                imagine_type: 'ANIMATE',
                status: { status: 'READY' },
                thumbnail: {
                    raw_media: thumbnail
                },
                __typename: 'GenAIImaginePrimitive'
            }));
        });
        return this;
    }
    addProduct(data = {}) {
        if (!((data && typeof data === 'object' && !Array.isArray(data)) ||
            (Array.isArray(data) &&
                data.every((item) => item && typeof item === 'object' && !Array.isArray(item))))) {
            throw new TypeError('Product items must be an object or an array of objects');
        }
        this._submessages.push({
            messageType: 2,
            messageText: '[ CANNOT_LOAD_PRODUCT - NIXEL ]'
        });
        const items = Array.isArray(data) ? data : [data];
        const product = items.map((item) => ({
            title: item.title,
            brand: item.brand,
            price: item.price,
            sale_price: item.sale_price,
            product_url: item.product_url ?? item.url,
            image: {
                url: Toolkit.resolveMedia(__classPrivateFieldGet(this, _AIRich_client, "f"), item.image_url ?? item.image, 'image')
            },
            additional_images: [
                {
                    url: Toolkit.resolveMedia(__classPrivateFieldGet(this, _AIRich_client, "f"), item.icon_url ?? item.icon, 'image')
                }
            ],
            __typename: 'GenAIProductItemCardPrimitive'
        }));
        this._sections.push(AIRich.newLayout(Array.isArray(data) ? 'HScroll' : 'Single', Array.isArray(data) ? product : product[0]));
        return this;
    }
    addPost(data = {}) {
        if (!((data && typeof data === 'object' && !Array.isArray(data)) ||
            (Array.isArray(data) &&
                data.every((item) => item && typeof item === 'object' && !Array.isArray(item))))) {
            throw new TypeError('Post items must be an object or an array of objects');
        }
        const posts = Array.isArray(data) ? data : [data];
        this._submessages.push({
            messageType: 2,
            messageText: '[ CANNOT_LOAD_POST - NIXEL ]'
        });
        const primitives = posts.map((p) => ({
            title: p.title ?? '',
            subtitle: p.subtitle ?? '',
            username: p.username ?? '',
            profile_picture_url: Toolkit.resolveMedia(__classPrivateFieldGet(this, _AIRich_client, "f"), p.profile_picture_url ?? p.profile_url ?? p.profile ?? '', 'image'),
            is_verified: !!(p.is_verified || p.verified),
            thumbnail_url: Toolkit.resolveMedia(__classPrivateFieldGet(this, _AIRich_client, "f"), p.thumbnail_url ?? p.thumbnail ?? '', 'image'),
            post_caption: p.post_caption ?? p.caption ?? '',
            likes_count: p.likes_count ?? p.like ?? 0,
            comments_count: p.comments_count ?? p.comment ?? 0,
            shares_count: p.shares_count ?? p.share ?? 0,
            post_url: p.post_url ?? p.url ?? '',
            post_deeplink: p.post_deeplink ?? p.deeplink ?? '',
            source_app: p.source_app || p.source || 'INSTAGRAM',
            footer_label: p.footer_label ?? p.footer ?? '',
            footer_icon: Toolkit.resolveMedia(__classPrivateFieldGet(this, _AIRich_client, "f"), p.footer_icon ?? p.icon ?? '', 'image'),
            is_carousel: posts.length > 1,
            orientation: p.orientation ?? 'LANDSCAPE',
            post_type: p.post_type ?? 'VIDEO',
            __typename: 'GenAIPostPrimitive'
        }));
        this._sections.push(AIRich.newLayout('HScroll', primitives));
        return this;
    }
    addTip(text) {
        this._submessages.push({
            messageType: 2,
            messageText: text
        });
        this._sections.push(AIRich.newLayout('Single', {
            text,
            __typename: 'GenAIMetadataTextPrimitive'
        }));
        return this;
    }
    addSuggest(suggestion, { scroll = true, layout } = {}) {
        if (!(typeof suggestion === 'string' ||
            (Array.isArray(suggestion) && suggestion.every((v) => typeof v === 'string')))) {
            throw new TypeError('Suggestion must be a string or array of strings');
        }
        const suggest = Array.isArray(suggestion)
            ? suggestion.map((text) => ({
                prompt_text: text,
                prompt_type: 'SUGGESTED_PROMPT',
                __typename: 'GenAIFollowUpSuggestionPillPrimitive'
            }))
            : [
                {
                    prompt_text: suggestion,
                    prompt_type: 'SUGGESTED_PROMPT',
                    __typename: 'GenAIFollowUpSuggestionPillPrimitive'
                }
            ];
        const type = layout ?? (suggest.length === 1 ? 'Single' : scroll ? 'HScroll' : 'ActionRow');
        this._sections.push(AIRich.newLayout(type, type === 'Single' ? suggest[0] : suggest, {
            __typename: 'GenAIUnifiedResponseSection'
        }));
        return this;
    }
    async build({ forwarded = true, notification = false, includesUnifiedResponse = true, includesSubmessages = true, quoted, quotedParticipant, ...options } = {}) {
        const forward = forwarded
            ? {
                forwardingScore: 1,
                isForwarded: true,
                forwardedAiBotMessageInfo: { botJid: '0@bot' },
                forwardOrigin: 4
            }
            : {};
        const notif = notification
            ? {
                sessionTransparencyMetadata: {
                    disclaimerText: '~ Ahmad tumbuh kembang',
                    hcaId: `hca_${Date.now()}`,
                    sessionTransparencyType: 1
                }
            }
            : {};
        const qObj = quoted
            ? {
                stanzaId: quoted?.key?.id || quoted?.id,
                participant: quotedParticipant || quoted?.key?.participant || quoted?.key?.remoteJid,
                quotedType: 0,
                quotedMessage: typeof quoted === 'object' && quoted !== null ? quoted.message ?? quoted : undefined
            }
            : {};
        const sections = this._footer
            ? [
                ...(await waitAllPromises(this._sections)),
                AIRich.newLayout('Single', {
                    text: this._footer,
                    __typename: 'GenAIMetadataTextPrimitive'
                })
            ]
            : [...(await waitAllPromises(this._sections))];
        return {
            messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
                botMetadata: {
                    messageDisclaimerText: this._title,
                    richResponseSourcesMetadata: { sources: this._richResponseSources },
                    ...notif
                }
            },
            ...this._extraPayload,
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        submessages: includesSubmessages ? await waitAllPromises(this._submessages) : [],
                        unifiedResponse: {
                            data: includesUnifiedResponse
                                ? Buffer.from(JSON.stringify({ response_id: crypto.randomUUID(), sections })).toString('base64')
                                : ''
                        },
                        contextInfo: {
                            ...forward,
                            ...qObj,
                            ...this._contextInfo
                        }
                    }
                }
            }
        };
    }
    async send(jid, { forwarded, notification, includesUnifiedResponse, includesSubmessages, ...options } = {}) {
        const msg = await this.build({
            forwarded,
            notification,
            includesUnifiedResponse,
            includesSubmessages,
            ...options
        });
        return await __classPrivateFieldGet(this, _AIRich_client, "f").relayMessage(jid, msg, { ...options });
    }
    static tokenizer(code, lang = 'javascript') {
        const keywordsMap = {
            javascript: new Set([
                'break', 'case', 'catch', 'continue', 'debugger', 'delete', 'do', 'else', 'finally',
                'for', 'function', 'if', 'in', 'instanceof', 'new', 'return', 'switch', 'this',
                'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'true', 'false', 'null',
                'undefined', 'class', 'const', 'let', 'super', 'extends', 'export', 'import', 'yield',
                'static', 'constructor', 'async', 'await', 'get', 'set'
            ]),
            typescript: new Set([
                'abstract', 'any', 'as', 'asserts', 'bigint', 'boolean', 'declare', 'enum',
                'implements', 'infer', 'interface', 'is', 'keyof', 'module', 'namespace', 'never',
                'readonly', 'require', 'number', 'object', 'override', 'private', 'protected',
                'public', 'satisfies', 'string', 'symbol', 'type', 'unknown', 'using', 'from'
            ]),
            python: new Set([
                'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class',
                'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from',
                'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass',
                'raise', 'return', 'try', 'while', 'with', 'yield'
            ]),
            java: new Set([
                'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class',
                'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final',
                'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int',
                'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public',
                'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this',
                'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while'
            ]),
            golang: new Set([
                'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
                'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map',
                'package', 'range', 'return', 'select', 'struct', 'switch', 'type', 'var'
            ]),
            c: new Set([
                'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double',
                'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'int', 'long', 'register',
                'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef',
                'union', 'unsigned', 'void', 'volatile', 'while'
            ]),
            cpp: new Set([
                'alignas', 'alignof', 'and', 'auto', 'bool', 'break', 'case', 'catch', 'class',
                'const', 'constexpr', 'continue', 'delete', 'do', 'double', 'else', 'enum',
                'explicit', 'export', 'extern', 'false', 'float', 'for', 'friend', 'if', 'inline',
                'int', 'long', 'mutable', 'namespace', 'new', 'noexcept', 'nullptr', 'operator',
                'private', 'protected', 'public', 'return', 'short', 'signed', 'sizeof', 'static',
                'struct', 'switch', 'template', 'this', 'throw', 'true', 'try', 'typedef',
                'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'while'
            ]),
            php: new Set([
                'abstract', 'and', 'array', 'as', 'break', 'callable', 'case', 'catch', 'class',
                'clone', 'const', 'continue', 'declare', 'default', 'do', 'echo', 'else', 'elseif',
                'empty', 'enddeclare', 'endfor', 'endforeach', 'endif', 'endswitch', 'endwhile',
                'extends', 'final', 'finally', 'fn', 'for', 'foreach', 'function', 'global', 'goto',
                'if', 'implements', 'include', 'include_once', 'instanceof', 'interface', 'match',
                'namespace', 'new', 'null', 'or', 'private', 'protected', 'public', 'require',
                'require_once', 'return', 'static', 'switch', 'throw', 'trait', 'try', 'use', 'var',
                'while', 'yield'
            ]),
            rust: new Set([
                'as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern', 'false', 'fn',
                'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub',
                'ref', 'return', 'self', 'Self', 'static', 'struct', 'super', 'trait', 'true',
                'type', 'unsafe', 'use', 'where', 'while'
            ]),
            html: new Set([
                'html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'video', 'audio', 'script',
                'style', 'link', 'meta', 'form', 'input', 'button', 'table', 'tr', 'td', 'th', 'ul',
                'ol', 'li', 'section', 'article', 'header', 'footer', 'nav', 'main'
            ]),
            bash: new Set([
                'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac',
                'function', 'in', 'select', 'until', 'break', 'continue', 'return', 'export',
                'readonly', 'local', 'declare'
            ]),
            markdown: new Set(['#', '##', '###', '####', '#####', '######'])
        };
        if (!lang || lang === 'txt' || lang === 'text' || lang === 'plaintext') {
            return {
                codeBlock: [
                    {
                        codeContent: code,
                        highlightType: 0
                    }
                ],
                unified_codeBlock: [
                    {
                        content: code,
                        type: 'DEFAULT'
                    }
                ]
            };
        }
        const TYPE_MAP = {
            0: 'DEFAULT',
            1: 'KEYWORD',
            2: 'METHOD',
            3: 'STR',
            4: 'NUMBER',
            5: 'COMMENT'
        };
        const keywords = keywordsMap[lang.toLowerCase()] || new Set();
        const tokens = [];
        let i = 0;
        const push = (content, type) => {
            if (!content)
                return;
            const last = tokens[tokens.length - 1];
            if (last && last.highlightType === type) {
                last.codeContent += content;
            }
            else {
                tokens.push({
                    codeContent: content,
                    highlightType: type
                });
            }
        };
        const isIdentifier = (char) => {
            switch (lang.toLowerCase()) {
                case 'css':
                    return /[a-zA-Z0-9_$-]/.test(char);
                case 'html':
                    return /[a-zA-Z0-9_$:-]/.test(char);
                default:
                    return /[a-zA-Z0-9_$]/.test(char);
            }
        };
        while (i < code.length) {
            const c = code[i];
            if (/\s/.test(c)) {
                let s = i;
                while (i < code.length && /\s/.test(code[i])) {
                    i++;
                }
                push(code.slice(s, i), 0);
                continue;
            }
            if ((c === '/' && code[i + 1] === '/') || (c === '#' && ['python', 'bash'].includes(lang))) {
                let s = i;
                while (i < code.length && code[i] !== '\n') {
                    i++;
                }
                push(code.slice(s, i), 5);
                continue;
            }
            if (c === '"' || c === "'" || c === '`') {
                let s = i;
                const q = c;
                i++;
                while (i < code.length) {
                    if (code[i] === '\\' && i + 1 < code.length) {
                        i += 2;
                    }
                    else if (code[i] === q) {
                        i++;
                        break;
                    }
                    else {
                        i++;
                    }
                }
                push(code.slice(s, i), 3);
                continue;
            }
            if (/[0-9]/.test(c)) {
                let s = i;
                while (i < code.length && /[0-9._]/.test(code[i])) {
                    i++;
                }
                push(code.slice(s, i), 4);
                continue;
            }
            if (/[a-zA-Z_$]/.test(c)) {
                let s = i;
                while (i < code.length && isIdentifier(code[i])) {
                    i++;
                }
                const word = code.slice(s, i);
                let type = 0;
                if (keywords.has(word)) {
                    type = 1;
                }
                else if (lang === 'css') {
                    let j = i;
                    while (j < code.length && /\s/.test(code[j])) {
                        j++;
                    }
                    if (code[j] === ':') {
                        type = 1;
                    }
                }
                else if (lang === 'html') {
                    let p = s - 1;
                    while (p >= 0 && /\s/.test(code[p])) {
                        p--;
                    }
                    if (code[p] === '<' || (code[p] === '/' && code[p - 1] === '<')) {
                        type = 1;
                    }
                }
                if (type === 0) {
                    let j = i;
                    while (j < code.length && /\s/.test(code[j])) {
                        j++;
                    }
                    if (code[j] === '(') {
                        type = 2;
                    }
                }
                push(word, type);
                continue;
            }
            push(c, 0);
            i++;
        }
        return {
            codeBlock: tokens,
            unified_codeBlock: tokens.map((t) => ({
                content: t.codeContent,
                type: TYPE_MAP[t.highlightType]
            }))
        };
    }
    static toTableMetadata(arr, { hyperlink = true, citation = true, latex = true } = {}) {
        if (!Array.isArray(arr) ||
            !arr.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'))) {
            throw new TypeError('Table must be a nested array of strings');
        }
        const [header, ...rows] = arr;
        const maxLen = Math.max(header.length, ...rows.map((r) => r.length));
        const normalize = (r) => [...r, ...Array(maxLen - r.length).fill('')];
        const unified_rows = [
            {
                is_header: true,
                cells: normalize(header)
            },
            ...rows.map((r) => ({
                is_header: false,
                cells: normalize(r)
            }))
        ].map((row) => {
            const markdown_cells = row.cells.map((cell) => {
                const extracted = extractIE(cell, { hyperlink, citation, latex });
                return {
                    text: extracted.text,
                    ...(extracted.inline_entities.length ? { inline_entities: extracted.inline_entities } : {})
                };
            });
            return {
                ...row,
                ...(markdown_cells.some((c) => c.inline_entities?.length) ? { markdown_cells } : {})
            };
        });
        const rowsMeta = unified_rows.map((r) => ({
            items: r.cells,
            ...(r.is_header ? { isHeading: true } : {})
        }));
        return {
            title: '',
            rows: rowsMeta,
            unified_rows
        };
    }
    static newLayout(name, data, extra = {}) {
        return {
            ...extra,
            view_model: {
                [Array.isArray(data) ? 'primitives' : 'primitive']: data,
                __typename: `GenAI${name}LayoutViewModel`
            }
        };
    }
}
_AIRich_client = new WeakMap();
export function patchSocketAIRich(sock) {
    sock.AIRich = AIRich;
    sock.Toolkit = Toolkit;
    sock.airich = () => new AIRich(sock);
    sock.sendAIRich = async (jid, opts = {}) => {
        const a = new AIRich(sock);
        if (opts.prompt)
            a.setPrompt(opts.prompt);
        if (opts.system)
            a.setSystem(opts.system);
        return a.send(jid, opts);
    };
    return sock;
}
export { VERSION, AIRich, Toolkit };
// ============================================================
// BUTTON V2 (locbtn)
// (dipindahkan dari lib/buttonv2.js)
// ============================================================
async function fetchBufferBtn(url, options = {}, { silent = true } = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok)
            throw Error(`HTTP ${response.status}`);
        return Buffer.from(await response.arrayBuffer());
    }
    catch (error) {
        if (silent)
            return Buffer.alloc(0);
        throw error;
    }
}
async function makeLocationThumbnailBtn(buffer) {
    const { width, height } = await ((s) => { if (!s)
        throw new Error('sharp not installed'); return s; })(loadSharp())(buffer).metadata();
    const targetAspect = 16 / 9;
    const currentAspect = width / height;
    let cropW = width;
    let cropH = height;
    if (currentAspect > targetAspect) {
        cropW = Math.round(height * targetAspect);
    }
    else {
        cropH = Math.round(width / targetAspect);
    }
    const cropLeft = Math.round((width - cropW) / 2);
    const cropTop = Math.round((height - cropH) / 2);
    const padTotal = 300 - 169;
    const padTop = Math.floor(padTotal / 2);
    const padBottom = padTotal - padTop;
    const s3 = loadSharp();
    if (!s3)
        throw new Error('sharp not installed');
    return await s3(buffer)
        .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
        .resize(300, 169, { fit: 'fill' })
        .extend({
        top: padTop,
        bottom: padBottom,
        left: 0,
        right: 0,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
    })
        .jpeg({ quality: 80 })
        .toBuffer();
}
class ButtonV2 {
    constructor(client) {
        _ButtonV2_client.set(this, void 0);
        this._title = '';
        this._subtitle = '';
        this._body = '';
        this._footer = '';
        this._contextInfo = {};
        this._extraPayload = {};
        this._imageInput = undefined;
        this._data = undefined;
        this._buttons = [];
        this._locationMessage = {};
        this._bottomSheet = null;
        this._limitedTimeOffer = null;
        this._viewOnce = false;
        if (!client)
            throw new Error('Socket is required');
        __classPrivateFieldSet(this, _ButtonV2_client, client, "f");
    }
    setTitle(title) {
        if (typeof title !== 'string')
            throw new TypeError('Title must be a string');
        this._title = title;
        return this;
    }
    setSubtitle(subtitle) {
        if (typeof subtitle !== 'string')
            throw new TypeError('Subtitle must be a string');
        this._subtitle = subtitle;
        return this;
    }
    setBody(b) {
        this._body = String(b);
        return this;
    }
    setFooter(f) {
        this._footer = String(f);
        return this;
    }
    setContextInfo(obj) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj))
            throw new TypeError('ContextInfo must be a plain object');
        this._contextInfo = obj;
        return this;
    }
    addPayload(obj) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj))
            throw new TypeError('Payload must be a plain object');
        Object.assign(this._extraPayload, obj);
        return this;
    }
    locreply(displayText = '', buttonId = crypto.randomUUID()) {
        this._buttons.push({
            buttonId,
            buttonText: { displayText },
            type: 1
        });
        return this;
    }
    loclist(obj) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj))
            throw new TypeError('Buttons must be a plain object');
        this._buttons.push(obj);
        return this;
    }
    setThumbnail(input) {
        if (!input)
            throw new Error('URL, Buffer, or quoted message required');
        this._imageInput = input;
        return this;
    }
    setMedia(obj) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj))
            throw new TypeError('Media must be a plain object');
        this._data = obj;
        return this;
    }
    setLocationMessage(obj = {}) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj))
            throw new TypeError('LocationMessage must be a plain object');
        this._locationMessage = obj;
        return this;
    }
    setViewOnce(v = true) {
        this._viewOnce = v;
        return this;
    }
    setBottomSheet(title, buttonText, inThreadButtonsLimit = 1, dividerIndices = [1, 2]) {
        this._bottomSheet = {
            list_title: title,
            button_title: buttonText,
            in_thread_buttons_limit: inThreadButtonsLimit,
            divider_indices: dividerIndices.map(x => x - 1)
        };
        return this;
    }
    setLimitedTimeOffer(text, copyCode, url, expiryMs) {
        const offer = { text: text || '' };
        if (copyCode)
            offer.copy_code = copyCode;
        if (url)
            offer.url = url;
        if (expiryMs)
            offer.expiration_time_ms = expiryMs;
        this._limitedTimeOffer = offer;
        return this;
    }
    async build(jid, { ...options } = {}) {
        let _thumbnail = null;
        if (this._imageInput) {
            let buffer = null;
            if (Buffer.isBuffer(this._imageInput)) {
                buffer = this._imageInput;
            }
            else if (typeof this._imageInput === 'string') {
                buffer = await fetchBufferBtn(this._imageInput, {}, { silent: false });
            }
            else if (this._imageInput && typeof this._imageInput === 'object') {
                buffer = await downloadMediaMessage({ message: this._imageInput }, 'buffer');
                if (!buffer?.length)
                    buffer = null;
            }
            if (buffer) {
                _thumbnail = await makeLocationThumbnailBtn(buffer);
            }
        }
        return generateWAMessageFromContent(jid, {
            ...this._extraPayload,
            buttonsMessage: {
                contentText: this._body,
                footerText: this._footer,
                ...(this._data
                    ? this._data
                    : {
                        headerType: 6,
                        locationMessage: {
                            degreesLatitude: 0,
                            degreesLongitude: 0,
                            name: this._title,
                            address: this._subtitle,
                            url: '',
                            isLive: true,
                            comment: '',
                            ...this._locationMessage,
                            jpegThumbnail: _thumbnail
                        }
                    }),
                viewOnce: true,
                contextInfo: this._contextInfo,
                buttons: [...this._buttons]
            }
        }, { ...options });
    }
    async send(jid, { ...options } = {}) {
        if (this._buttons.length < 1)
            throw new Error('ButtonV2 requires at least one button');
        const msg = await this.build(jid, options);
        await __classPrivateFieldGet(this, _ButtonV2_client, "f").relayMessage(msg.key.remoteJid, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
                        }
                    ]
                }
            ],
            ...options
        });
        return msg;
    }
}
_ButtonV2_client = new WeakMap();
export function patchSocketButtonV2(sock) {
    sock.ButtonV2 = ButtonV2;
    sock.locbtn = () => new ButtonV2(sock);
    sock.sendLocBtn = async (jid, opts = {}) => {
        const b = new ButtonV2(sock);
        if (opts.title)
            b.setTitle(opts.title);
        if (opts.body)
            b.setBody(opts.body);
        if (opts.footer)
            b.setFooter(opts.footer);
        if (opts.subtitle)
            b.setSubtitle(opts.subtitle);
        if (opts.contextInfo)
            b.setContextInfo(opts.contextInfo);
        return b.send(jid, opts);
    };
    return sock;
}
export { ButtonV2, makeLocationThumbnailBtn as makeLocationThumbnail };
// ============================================================
// INTERACTIVE (button, carousel)
// (dipindahkan dari lib/interactive.js)
// ============================================================
function nativeMessageId(prefix = 'TITLE') {
    return `${prefix}${crypto.randomBytes(10).toString('hex').toUpperCase()}`;
}
function parseButtonParams(btn) {
    const type = String(btn.type || 'reply').toLowerCase();
    const text = (btn.text || btn.display_text || '').trim() || '\u0000';
    let res = {};
    if (['url', 'link', 'cta_url'].includes(type)) {
        res = {
            display_text: text,
            url: btn.value,
            merchant_url: btn.value,
            webview_interaction: Boolean(btn.webviewInteraction)
        };
    }
    else if (['copy', 'salin', 'cta_copy'].includes(type)) {
        res = {
            display_text: text,
            id: btn.value,
            copy_code: btn.value
        };
    }
    else if (['call', 'cta_call'].includes(type)) {
        res = { display_text: text, id: btn.value };
    }
    else if (['address', 'cta_address'].includes(type)) {
        res = { display_text: text, id: btn.value };
    }
    else if (['reminder', 'cta_reminder'].includes(type)) {
        res = { display_text: text, id: btn.value, timestamp: btn.value };
    }
    else if (['cancel_reminder', 'cta_cancel_reminder'].includes(type)) {
        res = { display_text: text, id: btn.value };
    }
    else if (['save_contact', 'cta_save_contact'].includes(type)) {
        res = { display_text: text, id: btn.value, card_content: btn.value };
    }
    else if (['booking', 'booking_confirmation'].includes(type)) {
        const now = Date.now();
        const dc = btn.display_content || {};
        res = {
            start_datetime: btn.start_datetime || new Date(now).toISOString(),
            end_datetime: btn.end_datetime || new Date(now + 10 * 60 * 1000).toISOString(),
            location: btn.location || '',
            booking_url: btn.booking_url || btn.value || '',
            phone_number: btn.phone_number || '',
            booking_management_url: btn.booking_management_url || '',
            description: btn.description || '',
            email: btn.email || '',
            display_text: text,
            display_content: {
                display_language: dc.display_language || 'en',
                display_meeting_type: dc.display_meeting_type || '',
                display_bottom_sheet_header: dc.display_bottom_sheet_header || '',
                display_add_to_calendar_cta_text: dc.display_add_to_calendar_cta_text || 'Add to Calendar',
                display_view_on_maps_cta_text: dc.display_view_on_maps_cta_text || 'View on Maps',
                display_manage_booking_cta_text: dc.display_manage_booking_cta_text || 'Manage Booking',
                display_manage_booking_not_supported_text: dc.display_manage_booking_not_supported_text || '',
                display_read_more: dc.display_read_more || 'Read more'
            }
        };
    }
    else if (['single_select', 'list'].includes(type)) {
        res = {
            title: text,
            sections: btn.sections || [{ title: text, rows: btn.rows || [] }]
        };
    }
    else if (type === 'native') {
        res = { display_text: text, id: btn.value || '' };
    }
    else {
        res = { display_text: text, id: btn.value };
    }
    if (btn.icon)
        res.icon = btn.icon;
    return res;
}
export function buildButtons(buttons = []) {
    const parsed = buttons
        .filter((b) => b && (b.text || b.display_text || b.type === 'native'))
        .map((b) => {
        const type = String(b.type || 'reply').toLowerCase();
        let name = 'quick_reply';
        if (['url', 'link', 'cta_url'].includes(type))
            name = 'cta_url';
        else if (['copy', 'salin', 'cta_copy'].includes(type))
            name = 'cta_copy';
        else if (['call', 'cta_call'].includes(type))
            name = 'cta_call';
        else if (['address', 'cta_address'].includes(type))
            name = 'cta_address';
        else if (['reminder', 'cta_reminder'].includes(type))
            name = 'cta_reminder';
        else if (['cancel_reminder', 'cta_cancel_reminder'].includes(type))
            name = 'cta_cancel_reminder';
        else if (['save_contact', 'cta_save_contact'].includes(type))
            name = 'cta_save_contact';
        else if (['booking', 'booking_confirmation'].includes(type))
            name = 'booking_confirmation';
        else if (['single_select', 'list'].includes(type))
            name = 'single_select';
        else if (type === 'native')
            name = 'quick_reply';
        return {
            name,
            buttonParamsJson: JSON.stringify(parseButtonParams(b))
        };
    });
    if (parsed.length >= 2 && parsed.length <= 4) {
        return [{}, ...parsed];
    }
    return parsed;
}
function prepareParams(params = {}) {
    const input = params.limited_time_offer;
    if (!input || typeof input !== 'object')
        return JSON.stringify(params);
    const offer = {
        text: typeof input.text === 'string'
            ? input.text
            : typeof input.display_text === 'string'
                ? input.display_text
                : '',
        url: typeof input.url === 'string' ? input.url : typeof input.link === 'string' ? input.link : ''
    };
    const copyCode = typeof input.copy_code === 'string'
        ? input.copy_code
        : typeof input.code === 'string'
            ? input.code
            : '';
    if (copyCode)
        offer.copy_code = copyCode;
    const hideExpiration = input.hideExpiration === true || input.noExpiration === true || input.expiration === false;
    const expiresAt = input.expiresAt || input.expires_at || input.expires || input.expiration_time || input.expiration_time_ms;
    let expiryMs = 0;
    if (!hideExpiration) {
        if (expiresAt instanceof Date)
            expiryMs = expiresAt.getTime();
        else if (typeof expiresAt === 'number')
            expiryMs = expiresAt < 10000000000 ? expiresAt * 1000 : expiresAt;
        else if (typeof expiresAt === 'string' && expiresAt.trim()) {
            const parsed = Number(expiresAt);
            if (Number.isFinite(parsed))
                expiryMs = parsed < 10000000000 ? parsed * 1000 : parsed;
            else {
                const date = new Date(expiresAt);
                if (!Number.isNaN(date.getTime()))
                    expiryMs = date.getTime();
            }
        }
        if (!expiryMs && typeof input.durationMs === 'number')
            expiryMs = Date.now() + input.durationMs;
        if (!expiryMs && typeof input.durationSeconds === 'number')
            expiryMs = Date.now() + input.durationSeconds * 1000;
        if (!expiryMs && typeof input.durationMinutes === 'number')
            expiryMs = Date.now() + input.durationMinutes * 60000;
        if (!expiryMs && typeof input.durationHours === 'number')
            expiryMs = Date.now() + input.durationHours * 3600000;
    }
    if (expiryMs)
        offer.expiration_time = expiryMs;
    return JSON.stringify({
        ...params,
        limited_time_offer: offer
    });
}
function parseLimitedOffer(input = {}) {
    if (!input || typeof input !== 'object')
        return undefined;
    const hideExpiration = input.hideExpiration === true || input.noExpiration === true || input.expiration === false;
    const expiresAt = input.expiresAt || input.expires_at || input.expires || input.expiration_time || input.expiration_time_ms;
    let expiryMs = 0;
    if (!hideExpiration) {
        if (expiresAt instanceof Date)
            expiryMs = expiresAt.getTime();
        else if (typeof expiresAt === 'number')
            expiryMs = expiresAt < 10000000000 ? expiresAt * 1000 : expiresAt;
        else if (typeof expiresAt === 'string' && expiresAt.trim()) {
            const parsed = Number(expiresAt);
            if (Number.isFinite(parsed))
                expiryMs = parsed < 10000000000 ? parsed * 1000 : parsed;
            else {
                const date = new Date(expiresAt);
                if (!Number.isNaN(date.getTime()))
                    expiryMs = date.getTime();
            }
        }
        if (!expiryMs && typeof input.durationMs === 'number')
            expiryMs = Date.now() + input.durationMs;
        if (!expiryMs && typeof input.durationSeconds === 'number')
            expiryMs = Date.now() + input.durationSeconds * 1000;
        if (!expiryMs && typeof input.durationMinutes === 'number')
            expiryMs = Date.now() + input.durationMinutes * 60000;
        if (!expiryMs && typeof input.durationHours === 'number')
            expiryMs = Date.now() + input.durationHours * 3600000;
    }
    return { expirationTimeMs: expiryMs };
}
export async function sendInteractiveMessage(sock, jid, content = {}, options = {}) {
    const { title, body, footer, buttons, params, contextInfo } = content;
    const payload = {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {}
        },
        interactiveMessage: {
            header: title ? { title, hasMediaAttachment: false } : undefined,
            body: body ? { text: body } : undefined,
            footer: footer ? { text: footer, hasMediaAttachment: false } : undefined,
            nativeFlowMessage: {
                buttons: buildButtons(buttons),
                messageParamsJson: prepareParams(params),
                messageVersion: 1
            },
            limitedTimeOffer: parseLimitedOffer(params?.limited_time_offer),
            contextInfo
        }
    };
    const messageId = options.messageId || nativeMessageId();
    const relayOptions = { ...options, messageId };
    delete relayOptions.quoted;
    relayOptions.additionalNodes = [
        {
            tag: 'biz',
            attrs: {},
            content: [
                {
                    tag: 'interactive',
                    attrs: { type: 'native_flow', v: '1' },
                    content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
                }
            ]
        }
    ];
    await sock.relayMessage(jid, payload, relayOptions);
    return {
        key: { id: messageId, remoteJid: jid, fromMe: true },
        message: payload
    };
}
export async function createCarouselCard(sock, content = {}) {
    const { title, subtitle, body, footer, media, buttons, params } = content;
    let headerObj = {
        title: title || undefined,
        subtitle: subtitle || undefined,
        hasMediaAttachment: !!media
    };
    if (media) {
        try {
            const mediaContent = await prepareWAMessageMedia(media, { upload: sock.waUploadToServer });
            Object.assign(headerObj, mediaContent);
        }
        catch (e) {
            if (!String(e).includes('Invalid media type'))
                throw e;
        }
    }
    return {
        body: body ? { text: body } : undefined,
        footer: footer ? { text: footer } : undefined,
        header: headerObj,
        nativeFlowMessage: {
            buttons: buildButtons(buttons),
            messageParamsJson: prepareParams(params),
            messageVersion: 1
        },
        limitedTimeOffer: parseLimitedOffer(params?.limited_time_offer)
    };
}
export async function sendCarouselMessage(sock, jid, content = {}, options = {}) {
    const { body, footer, cards = [], params, contextInfo } = content;
    if (cards.length === 0) {
        throw new Error('Carousel membutuhkan setidaknya 1 kartu');
    }
    const payload = {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {}
        },
        interactiveMessage: {
            header: { hasMediaAttachment: false },
            body: body ? { text: body } : undefined,
            footer: footer ? { text: footer } : undefined,
            carouselMessage: { cards },
            limitedTimeOffer: parseLimitedOffer(params?.limited_time_offer),
            contextInfo: contextInfo || options.contextInfo
        }
    };
    const messageId = options.messageId || nativeMessageId();
    const relayOptions = { ...options, messageId };
    delete relayOptions.quoted;
    relayOptions.additionalNodes = [
        {
            tag: 'biz',
            attrs: {},
            content: [
                {
                    tag: 'interactive',
                    attrs: { type: 'native_flow', v: '1' },
                    content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
                }
            ]
        }
    ];
    await sock.relayMessage(jid, payload, relayOptions);
    return {
        key: { id: messageId, remoteJid: jid, fromMe: true },
        message: payload
    };
}
export class InteractiveBuilder {
    constructor(sock) {
        _InteractiveBuilder_instances.add(this);
        _InteractiveBuilder_sock.set(this, void 0);
        _InteractiveBuilder_title.set(this, '');
        _InteractiveBuilder_body.set(this, '');
        _InteractiveBuilder_footer.set(this, '');
        _InteractiveBuilder_buttons.set(this, []);
        _InteractiveBuilder_bottomSheet.set(this, null);
        _InteractiveBuilder_contextInfo.set(this, null);
        _InteractiveBuilder_offer.set(this, null);
        if (!sock)
            throw new Error('Socket is required');
        __classPrivateFieldSet(this, _InteractiveBuilder_sock, sock, "f");
    }
    setTitle(t) {
        __classPrivateFieldSet(this, _InteractiveBuilder_title, String(t), "f");
        return this;
    }
    setBody(b) {
        __classPrivateFieldSet(this, _InteractiveBuilder_body, String(b), "f");
        return this;
    }
    setFooter(f) {
        __classPrivateFieldSet(this, _InteractiveBuilder_footer, String(f), "f");
        return this;
    }
    offer(...args) {
        let text = '';
        let copyCode = '';
        let url = '';
        let expOption = '';
        for (const arg of args) {
            if (typeof arg !== 'string')
                continue;
            const index = arg.indexOf(':');
            if (index === -1)
                continue;
            const key = arg.slice(0, index).trim().toLowerCase();
            const val = arg.slice(index + 1).trim();
            if (key === 'display' || key === 'text') {
                text = val;
            }
            else if (key === 'copy' || key === 'code') {
                copyCode = val;
            }
            else if (key === 'url' || key === 'link') {
                url = val;
            }
            else if (key === 'exp') {
                expOption = val;
            }
        }
        let expiryTime = undefined;
        if (expOption) {
            const now = Date.now();
            const opt = expOption.toLowerCase().trim();
            if (opt === 'day')
                expiryTime = now + 86400000;
            else if (opt === 'week')
                expiryTime = now + 86400000 * 7;
            else if (opt === 'month')
                expiryTime = now + 86400000 * 30;
            else if (opt === 'year')
                expiryTime = now + 86400000 * 365;
            else if (opt === 'exp')
                expiryTime = now - 60000;
        }
        __classPrivateFieldSet(this, _InteractiveBuilder_offer, {
            text: text || '',
            ...(copyCode ? { copy_code: copyCode } : {}),
            ...(url ? { url } : {}),
            ...(expiryTime ? { expiration_time_ms: expiryTime } : {})
        }, "f");
        return this;
    }
    bottomsheet(title, buttonText, inThreadButtonsLimit = 1, dividerIndices = [1, 2]) {
        __classPrivateFieldSet(this, _InteractiveBuilder_bottomSheet, {
            list_title: title,
            button_title: buttonText,
            in_thread_buttons_limit: inThreadButtonsLimit,
            divider_indices: dividerIndices.map(x => x - 1)
        }, "f");
        return this;
    }
    setContextInfo(ci) {
        __classPrivateFieldSet(this, _InteractiveBuilder_contextInfo, ci, "f");
        return this;
    }
    qreplybtn(...args) {
        const { text, value, icon } = __classPrivateFieldGet(this, _InteractiveBuilder_instances, "m", _InteractiveBuilder_parseBtnArgs).call(this, args, 'reply');
        __classPrivateFieldGet(this, _InteractiveBuilder_buttons, "f").push({ type: 'reply', text, value, ...(icon ? { icon } : {}) });
        return this;
    }
    urlbtn(...args) {
        const { text, value, icon } = __classPrivateFieldGet(this, _InteractiveBuilder_instances, "m", _InteractiveBuilder_parseBtnArgs).call(this, args, 'url');
        __classPrivateFieldGet(this, _InteractiveBuilder_buttons, "f").push({ type: 'url', text, value, ...(icon ? { icon } : {}) });
        return this;
    }
    copybtn(...args) {
        const { text, value, icon } = __classPrivateFieldGet(this, _InteractiveBuilder_instances, "m", _InteractiveBuilder_parseBtnArgs).call(this, args, 'copy');
        __classPrivateFieldGet(this, _InteractiveBuilder_buttons, "f").push({ type: 'copy', text, value, ...(icon ? { icon } : {}) });
        return this;
    }
    callbtn(...args) {
        const { text, value, icon } = __classPrivateFieldGet(this, _InteractiveBuilder_instances, "m", _InteractiveBuilder_parseBtnArgs).call(this, args, 'call');
        __classPrivateFieldGet(this, _InteractiveBuilder_buttons, "f").push({ type: 'call', text, value, ...(icon ? { icon } : {}) });
        return this;
    }
    bookingbtn(...args) {
        let text = '';
        let config = {};
        if (typeof args[0] === 'object' && args[0] !== null) {
            config = args[0];
            text = config.display_text || config.text || '';
        }
        else {
            const parsed = __classPrivateFieldGet(this, _InteractiveBuilder_instances, "m", _InteractiveBuilder_parseBtnArgs).call(this, [args[0]], 'booking');
            text = parsed.text;
            config = args[1] || {};
        }
        __classPrivateFieldGet(this, _InteractiveBuilder_buttons, "f").push({
            type: 'booking',
            text,
            ...config
        });
        return this;
    }
    galaxybtn(text, screen, data = {}, flowVersion = '3', flowAction = 'navigate') {
        __classPrivateFieldGet(this, _InteractiveBuilder_buttons, "f").push({
            type: 'native',
            text,
            buttonParamsJson: JSON.stringify({
                flow_cta: text,
                icon: '',
                flow_message_version: flowVersion,
                flow_action: flowAction,
                flow_action_payload: { screen, data }
            })
        });
        return this;
    }
    listbtn(...args) {
        const { text, value, icon, rows } = __classPrivateFieldGet(this, _InteractiveBuilder_instances, "m", _InteractiveBuilder_parseBtnArgs).call(this, args, 'list');
        __classPrivateFieldGet(this, _InteractiveBuilder_buttons, "f").push({ type: 'single_select', text: text || value, rows, ...(icon ? { icon } : {}) });
        return this;
    }
    async send(from, options = {}) {
        const params = { ...(options.params || {}) };
        if (__classPrivateFieldGet(this, _InteractiveBuilder_bottomSheet, "f")) {
            params.bottom_sheet = __classPrivateFieldGet(this, _InteractiveBuilder_bottomSheet, "f");
        }
        if (__classPrivateFieldGet(this, _InteractiveBuilder_offer, "f")) {
            params.limited_time_offer = __classPrivateFieldGet(this, _InteractiveBuilder_offer, "f");
        }
        return sendInteractiveMessage(__classPrivateFieldGet(this, _InteractiveBuilder_sock, "f"), from, {
            title: __classPrivateFieldGet(this, _InteractiveBuilder_title, "f"),
            body: __classPrivateFieldGet(this, _InteractiveBuilder_body, "f"),
            footer: __classPrivateFieldGet(this, _InteractiveBuilder_footer, "f"),
            buttons: __classPrivateFieldGet(this, _InteractiveBuilder_buttons, "f"),
            params,
            contextInfo: __classPrivateFieldGet(this, _InteractiveBuilder_contextInfo, "f") || options.contextInfo
        });
    }
}
_InteractiveBuilder_sock = new WeakMap(), _InteractiveBuilder_title = new WeakMap(), _InteractiveBuilder_body = new WeakMap(), _InteractiveBuilder_footer = new WeakMap(), _InteractiveBuilder_buttons = new WeakMap(), _InteractiveBuilder_bottomSheet = new WeakMap(), _InteractiveBuilder_contextInfo = new WeakMap(), _InteractiveBuilder_offer = new WeakMap(), _InteractiveBuilder_instances = new WeakSet(), _InteractiveBuilder_parseBtnArgs = function _InteractiveBuilder_parseBtnArgs(args, type) {
    let text = '';
    let value = '';
    let icon = '';
    let rows = undefined;
    const isKeyValue = args.length > 0 && typeof args[0] === 'string' && args[0].includes(':');
    if (isKeyValue) {
        for (const arg of args) {
            if (Array.isArray(arg)) {
                rows = arg;
                continue;
            }
            if (typeof arg !== 'string')
                continue;
            const index = arg.indexOf(':');
            if (index === -1)
                continue;
            const key = arg.slice(0, index).trim().toLowerCase();
            const val = arg.slice(index + 1).trim();
            if (key === 'display' || key === 'text' || key === 'title') {
                text = val;
            }
            else if (key === 'value' || key === 'url' || key === 'code' || key === 'phone' || key === 'link') {
                value = val;
            }
            else if (key === 'icon') {
                icon = val;
            }
        }
    }
    else {
        text = args[0] || '';
        if (type === 'list') {
            rows = args[1];
            icon = args[2] || '';
        }
        else {
            value = args[1] || '';
            icon = args[2] || '';
        }
    }
    return { text, value, icon, rows };
};
export class CarouselCardBuilder {
    constructor(sock) {
        _CarouselCardBuilder_instances.add(this);
        _CarouselCardBuilder_sock.set(this, void 0);
        _CarouselCardBuilder_title.set(this, '');
        _CarouselCardBuilder_subtitle.set(this, '');
        _CarouselCardBuilder_body.set(this, '');
        _CarouselCardBuilder_footer.set(this, '');
        _CarouselCardBuilder_media.set(this, null);
        _CarouselCardBuilder_buttons.set(this, []);
        _CarouselCardBuilder_offer.set(this, null);
        __classPrivateFieldSet(this, _CarouselCardBuilder_sock, sock, "f");
    }
    setTitle(t) {
        __classPrivateFieldSet(this, _CarouselCardBuilder_title, String(t), "f");
        return this;
    }
    setSubtitle(s) {
        __classPrivateFieldSet(this, _CarouselCardBuilder_subtitle, String(s), "f");
        return this;
    }
    setBody(b) {
        __classPrivateFieldSet(this, _CarouselCardBuilder_body, String(b), "f");
        return this;
    }
    setFooter(f) {
        __classPrivateFieldSet(this, _CarouselCardBuilder_footer, String(f), "f");
        return this;
    }
    setMedia(m) {
        __classPrivateFieldSet(this, _CarouselCardBuilder_media, m, "f");
        return this;
    }
    qreplybtn(...args) {
        const { text, value, icon } = __classPrivateFieldGet(this, _CarouselCardBuilder_instances, "m", _CarouselCardBuilder_parseBtnArgs).call(this, args, 'reply');
        __classPrivateFieldGet(this, _CarouselCardBuilder_buttons, "f").push({ type: 'reply', text, value, ...(icon ? { icon } : {}) });
        return this;
    }
    urlbtn(...args) {
        const { text, value, icon } = __classPrivateFieldGet(this, _CarouselCardBuilder_instances, "m", _CarouselCardBuilder_parseBtnArgs).call(this, args, 'url');
        __classPrivateFieldGet(this, _CarouselCardBuilder_buttons, "f").push({ type: 'url', text, value, ...(icon ? { icon } : {}) });
        return this;
    }
    copybtn(...args) {
        const { text, value, icon } = __classPrivateFieldGet(this, _CarouselCardBuilder_instances, "m", _CarouselCardBuilder_parseBtnArgs).call(this, args, 'copy');
        __classPrivateFieldGet(this, _CarouselCardBuilder_buttons, "f").push({ type: 'copy', text, value, ...(icon ? { icon } : {}) });
        return this;
    }
    callbtn(...args) {
        const { text, value, icon } = __classPrivateFieldGet(this, _CarouselCardBuilder_instances, "m", _CarouselCardBuilder_parseBtnArgs).call(this, args, 'call');
        __classPrivateFieldGet(this, _CarouselCardBuilder_buttons, "f").push({ type: 'call', text, value, ...(icon ? { icon } : {}) });
        return this;
    }
    listbtn(...args) {
        const { text, value, icon, rows } = __classPrivateFieldGet(this, _CarouselCardBuilder_instances, "m", _CarouselCardBuilder_parseBtnArgs).call(this, args, 'list');
        __classPrivateFieldGet(this, _CarouselCardBuilder_buttons, "f").push({ type: 'single_select', text: text || value, rows, ...(icon ? { icon } : {}) });
        return this;
    }
    offer(...args) {
        let text = '';
        let copyCode = '';
        let url = '';
        let expOption = '';
        for (const arg of args) {
            if (typeof arg !== 'string')
                continue;
            const index = arg.indexOf(':');
            if (index === -1)
                continue;
            const key = arg.slice(0, index).trim().toLowerCase();
            const val = arg.slice(index + 1).trim();
            if (key === 'display' || key === 'text') {
                text = val;
            }
            else if (key === 'copy' || key === 'code') {
                copyCode = val;
            }
            else if (key === 'url' || key === 'link') {
                url = val;
            }
            else if (key === 'exp') {
                expOption = val;
            }
        }
        let expiryTime = undefined;
        if (expOption) {
            const now = Date.now();
            const opt = expOption.toLowerCase().trim();
            if (opt === 'day')
                expiryTime = now + 86400000;
            else if (opt === 'week')
                expiryTime = now + 86400000 * 7;
            else if (opt === 'month')
                expiryTime = now + 86400000 * 30;
            else if (opt === 'year')
                expiryTime = now + 86400000 * 365;
            else if (opt === 'exp')
                expiryTime = now - 60000;
        }
        __classPrivateFieldSet(this, _CarouselCardBuilder_offer, {
            text: text || '',
            ...(copyCode ? { copy_code: copyCode } : {}),
            ...(url ? { url } : {}),
            ...(expiryTime ? { expiration_time_ms: expiryTime } : {})
        }, "f");
        return this;
    }
    async build() {
        const params = {};
        if (__classPrivateFieldGet(this, _CarouselCardBuilder_offer, "f")) {
            params.limited_time_offer = __classPrivateFieldGet(this, _CarouselCardBuilder_offer, "f");
        }
        return createCarouselCard(__classPrivateFieldGet(this, _CarouselCardBuilder_sock, "f"), {
            title: __classPrivateFieldGet(this, _CarouselCardBuilder_title, "f") || undefined,
            subtitle: __classPrivateFieldGet(this, _CarouselCardBuilder_subtitle, "f") || undefined,
            body: __classPrivateFieldGet(this, _CarouselCardBuilder_body, "f") || undefined,
            footer: __classPrivateFieldGet(this, _CarouselCardBuilder_footer, "f") || undefined,
            media: __classPrivateFieldGet(this, _CarouselCardBuilder_media, "f") || undefined,
            buttons: __classPrivateFieldGet(this, _CarouselCardBuilder_buttons, "f"),
            params
        });
    }
}
_CarouselCardBuilder_sock = new WeakMap(), _CarouselCardBuilder_title = new WeakMap(), _CarouselCardBuilder_subtitle = new WeakMap(), _CarouselCardBuilder_body = new WeakMap(), _CarouselCardBuilder_footer = new WeakMap(), _CarouselCardBuilder_media = new WeakMap(), _CarouselCardBuilder_buttons = new WeakMap(), _CarouselCardBuilder_offer = new WeakMap(), _CarouselCardBuilder_instances = new WeakSet(), _CarouselCardBuilder_parseBtnArgs = function _CarouselCardBuilder_parseBtnArgs(args, type) {
    let text = '';
    let value = '';
    let icon = '';
    let rows = undefined;
    const isKeyValue = args.length > 0 && typeof args[0] === 'string' && args[0].includes(':');
    if (isKeyValue) {
        for (const arg of args) {
            if (Array.isArray(arg)) {
                rows = arg;
                continue;
            }
            if (typeof arg !== 'string')
                continue;
            const index = arg.indexOf(':');
            if (index === -1)
                continue;
            const key = arg.slice(0, index).trim().toLowerCase();
            const val = arg.slice(index + 1).trim();
            if (key === 'display' || key === 'text' || key === 'title') {
                text = val;
            }
            else if (key === 'value' || key === 'url' || key === 'code' || key === 'phone' || key === 'link') {
                value = val;
            }
            else if (key === 'icon') {
                icon = val;
            }
        }
    }
    else {
        text = args[0] || '';
        if (type === 'list') {
            rows = args[1];
            icon = args[2] || '';
        }
        else {
            value = args[1] || '';
            icon = args[2] || '';
        }
    }
    return { text, value, icon, rows };
};
export class CarouselBuilder {
    constructor(sock) {
        _CarouselBuilder_sock.set(this, void 0);
        _CarouselBuilder_body.set(this, '');
        _CarouselBuilder_footer.set(this, '');
        _CarouselBuilder_cards.set(this, []);
        _CarouselBuilder_offer.set(this, null);
        _CarouselBuilder_contextInfo.set(this, null);
        if (!sock)
            throw new Error('Socket is required');
        __classPrivateFieldSet(this, _CarouselBuilder_sock, sock, "f");
    }
    setBody(b) {
        __classPrivateFieldSet(this, _CarouselBuilder_body, String(b), "f");
        return this;
    }
    setFooter(f) {
        __classPrivateFieldSet(this, _CarouselBuilder_footer, String(f), "f");
        return this;
    }
    setContextInfo(ci) {
        __classPrivateFieldSet(this, _CarouselBuilder_contextInfo, ci, "f");
        return this;
    }
    addCard(...cards) {
        __classPrivateFieldGet(this, _CarouselBuilder_cards, "f").push(...cards.flat());
        return this;
    }
    addcard(...cards) {
        return this.addCard(...cards);
    }
    offer(...args) {
        let text = '';
        let copyCode = '';
        let url = '';
        let expOption = '';
        for (const arg of args) {
            if (typeof arg !== 'string')
                continue;
            const index = arg.indexOf(':');
            if (index === -1)
                continue;
            const key = arg.slice(0, index).trim().toLowerCase();
            const val = arg.slice(index + 1).trim();
            if (key === 'display' || key === 'text') {
                text = val;
            }
            else if (key === 'copy' || key === 'code') {
                copyCode = val;
            }
            else if (key === 'url' || key === 'link') {
                url = val;
            }
            else if (key === 'exp') {
                expOption = val;
            }
        }
        let expiryTime = undefined;
        if (expOption) {
            const now = Date.now();
            const opt = expOption.toLowerCase().trim();
            if (opt === 'day')
                expiryTime = now + 86400000;
            else if (opt === 'week')
                expiryTime = now + 86400000 * 7;
            else if (opt === 'month')
                expiryTime = now + 86400000 * 30;
            else if (opt === 'year')
                expiryTime = now + 86400000 * 365;
            else if (opt === 'exp')
                expiryTime = now - 60000;
        }
        __classPrivateFieldSet(this, _CarouselBuilder_offer, {
            text: text || '',
            ...(copyCode ? { copy_code: copyCode } : {}),
            ...(url ? { url } : {}),
            ...(expiryTime ? { expiration_time_ms: expiryTime } : {})
        }, "f");
        return this;
    }
    async send(from, options = {}) {
        const resolvedCards = await Promise.all(__classPrivateFieldGet(this, _CarouselBuilder_cards, "f").map(async (card) => {
            if (card instanceof CarouselCardBuilder) {
                return card.build();
            }
            return card;
        }));
        const params = { ...(options.params || {}) };
        if (__classPrivateFieldGet(this, _CarouselBuilder_offer, "f")) {
            params.limited_time_offer = __classPrivateFieldGet(this, _CarouselBuilder_offer, "f");
        }
        return sendCarouselMessage(__classPrivateFieldGet(this, _CarouselBuilder_sock, "f"), from, {
            body: __classPrivateFieldGet(this, _CarouselBuilder_body, "f"),
            footer: __classPrivateFieldGet(this, _CarouselBuilder_footer, "f"),
            cards: resolvedCards,
            params,
            contextInfo: __classPrivateFieldGet(this, _CarouselBuilder_contextInfo, "f")
        }, options);
    }
}
_CarouselBuilder_sock = new WeakMap(), _CarouselBuilder_body = new WeakMap(), _CarouselBuilder_footer = new WeakMap(), _CarouselBuilder_cards = new WeakMap(), _CarouselBuilder_offer = new WeakMap(), _CarouselBuilder_contextInfo = new WeakMap();
export function patchSocketInteractive(sock) {
    sock.InteractiveBuilder = InteractiveBuilder;
    sock.CarouselBuilder = CarouselBuilder;
    sock.CarouselCardBuilder = CarouselCardBuilder;
    sock.sendButton = async (jid, opts = {}) => {
        const b = new InteractiveBuilder(sock);
        if (opts.title)
            b.setTitle(opts.title);
        if (opts.body)
            b.setBody(opts.body);
        if (opts.footer)
            b.setFooter(opts.footer);
        if (opts.buttons) {
            for (const btn of opts.buttons) {
                if (btn.type === 'url') {
                    b.urlbtn(btn.text, btn.url, btn.icon);
                }
                else if (btn.type === 'copy') {
                    b.copybtn(btn.text, btn.copyText, btn.icon);
                }
                else if (btn.type === 'call') {
                    b.callbtn(btn.text, btn.phone, btn.icon);
                }
                else if (btn.type === 'list') {
                    b.listbtn(btn.text, btn.rows, btn.icon);
                }
                else if (btn.type === 'booking') {
                    b.bookingbtn(btn.text, btn.config);
                }
                else if (btn.type === 'native') {
                    b.galaxybtn(btn.text, btn.screen, btn.data, btn.flowVersion, btn.flowAction);
                }
                else {
                    b.qreplybtn(btn.text, btn.id || btn.text, btn.icon);
                }
            }
        }
        if (opts.contextInfo)
            b.setContextInfo(opts.contextInfo);
        if (opts.offer)
            b.offer(opts.offer);
        return b.send(jid, opts);
    };
    sock.sendCarousel = async (jid, cards = [], opts = {}) => {
        const c = new CarouselBuilder(sock);
        if (opts.body)
            c.setBody(opts.body);
        if (opts.footer)
            c.setFooter(opts.footer);
        for (const card of cards)
            c.addCard(card);
        if (opts.contextInfo)
            c.setContextInfo(opts.contextInfo);
        return c.send(jid, opts);
    };
    sock.sendInteractiveMessage = sendInteractiveMessage;
    sock.sendCarouselMessage = sendCarouselMessage;
    sock.createCarouselCard = createCarouselCard;
    sock.buildButtons = buildButtons;
    sock.button = () => new InteractiveBuilder(sock);
    sock.carouselBuilder = () => new CarouselBuilder(sock);
    sock.cardBuilder = () => new CarouselCardBuilder(sock);
    return sock;
}
// ============================================================
// PAYMENT
// (dipindahkan dari lib/payment.js)
// ============================================================
const TINY_JPEG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AV//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AV//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/I/9k=';
const DEFAULT_AMOUNT = {
    value: 20000000,
    offset: 100
};
const EWALLET_PRESETS = {
    dana: {
        key: '087873384161',
        name: 'DANA',
        institution_name: 'DANA',
        full_name_on_account: 'tes',
        account_type: 'bank_account'
    },
    gopay: {
        key: '087873384161',
        name: 'GoPay',
        institution_name: 'GoPay',
        full_name_on_account: 'tes',
        account_type: 'wallet'
    },
    ovo: {
        key: '087873384161',
        name: 'OVO',
        institution_name: 'OVO',
        full_name_on_account: 'tes',
        account_type: 'wallet'
    },
    linkaja: {
        key: '087873384161',
        name: 'LinkAja',
        institution_name: 'LinkAja',
        full_name_on_account: 'tes',
        account_type: 'wallet'
    },
    seabank: {
        key: '087873384161',
        name: 'SeaBank',
        institution_name: 'SeaBank',
        full_name_on_account: 'tes',
        account_type: 'bank_account'
    }
};
const EWALLET_ALIASES = {
    shopepay: 'seabank',
    qris: 'seabank',
    sea: 'seabank',
    seabank: 'seabank'
};
const ZERO_WIDTH_FILL = '\u200B'.repeat(300);
const ORDER_STATUS = {
    PENDING: 0,
    CONFIRMED: 1,
    PROCESSING: 2,
    SHIPPED: 3,
    DELIVERED: 4,
    CANCELLED: 5
};
const ORDER_SURFACE = {
    REGULAR: 0,
    BILLING: 1
};
function makeId(prefix = 'PAY') {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}
function asText(value = 'tes') {
    const text = String(value ?? '').trim();
    return text || 'tes';
}
function asNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}
function money(value = DEFAULT_AMOUNT.value, offset = DEFAULT_AMOUNT.offset) {
    return {
        value: asNumber(value, DEFAULT_AMOUNT.value),
        offset: asNumber(offset, DEFAULT_AMOUNT.offset)
    };
}
function zeroMoney(offset = 100) {
    return {
        value: 0,
        offset: asNumber(offset, 100)
    };
}
function clonePayment(value) {
    if (Array.isArray(value))
        return value.map(clonePayment);
    if (!value || typeof value !== 'object')
        return value;
    const out = {};
    for (const [key, item] of Object.entries(value))
        out[key] = clonePayment(item);
    return out;
}
function mergeDeep(base, patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch))
        return base;
    const out = clonePayment(base);
    for (const [key, value] of Object.entries(patch)) {
        if (value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            out[key] &&
            typeof out[key] === 'object' &&
            !Array.isArray(out[key])) {
            out[key] = mergeDeep(out[key], value);
        }
        else {
            out[key] = clonePayment(value);
        }
    }
    return out;
}
export function paymentAdditionalNodes() {
    return [
        {
            tag: 'biz',
            attrs: {
                native_flow_name: 'order_details'
            }
        }
    ];
}
export function paymentKeyAdditionalNodes() {
    return [
        {
            tag: 'biz',
            attrs: {
                native_flow_name: 'payment_key_info'
            }
        }
    ];
}
function defaultReviewPayParams() {
    return {
        currency: 'IDR',
        payment_configuration: '',
        payment_type: '',
        transaction_id: '',
        total_amount: money(),
        reference_id: 'tes',
        order_request_id: 'tes',
        type: 'digital-goods',
        payment_method: '',
        payment_status: 'captured',
        payment_timestamp: Math.floor(Date.now() / 1000),
        order: {
            status: 'shipped',
            description: 'tes',
            subtotal: money(),
            tax: money(0, 100),
            discount: money(0, 100),
            shipping: money(0, 100),
            order_type: 'ORDER',
            items: [
                {
                    retailer_id: 'tes',
                    name: 'tes',
                    amount: money(20000000, 100),
                    quantity: 1
                }
            ]
        },
        additional_note: 'tes',
        native_payment_methods: [
            JSON.stringify({
                name: 'PIX',
                enabled: false
            })
        ],
        share_payment_status: true,
        is_soft_deleted: false
    };
}
function defaultEwalletParams(profile = EWALLET_PRESETS.dana) {
    return {
        currency: 'IDR',
        total_amount: zeroMoney(),
        reference_id: makeId('EWALLET'),
        type: 'physical-goods',
        order: {
            status: 'pending',
            subtotal: zeroMoney(),
            order_type: 'ORDER',
            items: [
                {
                    name: '',
                    amount: zeroMoney(),
                    quantity: 0,
                    sale_amount: zeroMoney()
                }
            ]
        },
        payment_settings: [
            {
                type: 'payment_key',
                payment_key: {
                    type: 'IDPAYMENTACCOUNT',
                    key: profile.key,
                    name: profile.name,
                    institution_name: profile.institution_name,
                    full_name_on_account: profile.full_name_on_account,
                    account_type: profile.account_type
                }
            }
        ],
        share_payment_status: false,
        is_soft_deleted: false,
        referral: 'chat_attachment'
    };
}
class BaseNativeBuilder {
    constructor(sock) {
        this.sock = sock;
        this.state = {
            header: {},
            body: {
                text: 'tes'
            },
            footer: {
                text: 'tes'
            },
            buttonName: 'review_and_pay',
            params: {},
            messageParamsJson: '',
            additionalNodes: [],
            media: null
        };
    }
    header(value = {}) {
        this.state.header = {
            ...this.state.header,
            ...value
        };
        return this;
    }
    title(text = 'tes') {
        this.state.header.title = asText(text);
        return this;
    }
    body(text = 'tes') {
        this.state.body.text = String(text ?? 'tes');
        return this;
    }
    text(text = 'tes') {
        return this.body(text);
    }
    footer(text = 'tes') {
        this.state.footer.text = String(text ?? 'tes');
        return this;
    }
    button(name = this.state.buttonName) {
        this.state.buttonName = asText(name);
        return this;
    }
    params(value = {}) {
        this.state.params = mergeDeep(this.state.params, value);
        return this;
    }
    rawParams(value = {}) {
        this.state.params = value && typeof value === 'object' ? value : {};
        return this;
    }
    messageParams(value = '') {
        this.state.messageParamsJson = typeof value === 'string' ? value : JSON.stringify(value || {});
        return this;
    }
    additionalNodes(value = []) {
        this.state.additionalNodes = Array.isArray(value) ? value : [];
        return this;
    }
    build() {
        return {
            interactiveMessage: {
                header: this.state.header,
                body: this.state.body,
                footer: this.state.footer,
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: this.state.buttonName,
                            buttonParamsJson: JSON.stringify(this.state.params)
                        }
                    ],
                    messageParamsJson: this.state.messageParamsJson
                }
            }
        };
    }
    async send(jid, options = {}) {
        if (!this.sock?.relayMessage) {
            throw new Error('relayMessage tidak tersedia');
        }
        try {
            const header = { ...this.state.header };
            if (this.state.media && this.sock.waUploadToServer) {
                try {
                    const mediaContent = await prepareWAMessageMedia(this.state.media, {
                        upload: this.sock.waUploadToServer
                    });
                    Object.assign(header, mediaContent);
                }
                catch (uploadErr) {
                    console.error('[BaseNativeBuilder.send] upload media gagal:', uploadErr.message);
                    if (!header.imageMessage && header.jpegThumbnail) {
                        const jpegThumbnail = header.jpegThumbnail;
                        delete header.jpegThumbnail;
                        header.imageMessage = { jpegThumbnail };
                    }
                }
                delete header.title;
            }
            else if (header.jpegThumbnail) {
                const jpegThumbnail = header.jpegThumbnail;
                delete header.jpegThumbnail;
                header.imageMessage = { jpegThumbnail };
            }
            delete header.hasMediaAttachment;
            delete header.jpegThumbnail;
            const interactiveMessage = {
                header: Object.keys(header).length > 0 ? header : undefined,
                body: this.state.body,
                footer: this.state.footer,
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: this.state.buttonName,
                            buttonParamsJson: JSON.stringify(this.state.params)
                        }
                    ],
                    messageParamsJson: this.state.messageParamsJson
                }
            };
            const relayOptions = {
                ...options,
                additionalNodes: options.additionalNodes || this.state.additionalNodes
            };
            return this.sock.relayMessage(jid, { interactiveMessage }, relayOptions);
        }
        catch (e) {
            console.error('[PaymentBuilder.send]', e);
            throw e;
        }
    }
}
export class PaymentBuilder extends BaseNativeBuilder {
    constructor(sock) {
        super(sock);
        this.state.header = {
            title: 'Payment',
            hasMediaAttachment: true,
            jpegThumbnail: TINY_JPEG
        };
        this.state.body = {
            text: 'tes'
        };
        this.state.footer = {
            text: 'tes'
        };
        this.state.buttonName = 'review_and_pay';
        this.state.params = defaultReviewPayParams();
        this.state.additionalNodes = paymentAdditionalNodes();
    }
    thumbnail(pathOrBuffer) {
        this.state.header.hasMediaAttachment = true;
        if (typeof pathOrBuffer === 'string' && (pathOrBuffer.startsWith('http') || pathOrBuffer.length > 500)) {
            this.state.media = {
                image: pathOrBuffer.startsWith('http') ? { url: pathOrBuffer } : Buffer.from(pathOrBuffer, 'base64')
            };
            delete this.state.header.jpegThumbnail;
        }
        else if (Buffer.isBuffer(pathOrBuffer)) {
            this.state.media = { image: pathOrBuffer };
            delete this.state.header.jpegThumbnail;
        }
        else {
            this.state.header.jpegThumbnail = String(pathOrBuffer || TINY_JPEG);
        }
        return this;
    }
    noThumbnail() {
        this.state.header = {};
        this.state.media = null;
        return this;
    }
    currency(value = 'IDR') {
        this.state.params.currency = asText(value);
        return this;
    }
    amount(value = DEFAULT_AMOUNT.value, offset = DEFAULT_AMOUNT.offset) {
        this.state.params.total_amount = money(value, offset);
        this.state.params.order.subtotal = money(value, offset);
        return this;
    }
    reference(id = 'tes') {
        this.state.params.reference_id = asText(id);
        return this;
    }
    orderRequest(id = 'tes') {
        this.state.params.order_request_id = asText(id);
        return this;
    }
    type(value = 'digital-goods') {
        this.state.params.type = asText(value);
        return this;
    }
    method(value = '') {
        this.state.params.payment_method = String(value ?? '');
        return this;
    }
    status(value = 'captured') {
        this.state.params.payment_status = asText(value);
        return this;
    }
    timestamp(value = Math.floor(Date.now() / 1000)) {
        this.state.params.payment_timestamp = asNumber(value, Math.floor(Date.now() / 1000));
        return this;
    }
    note(value = 'tes') {
        this.state.params.additional_note = asText(value);
        return this;
    }
    order(value = {}) {
        this.state.params.order = mergeDeep(this.state.params.order, value);
        return this;
    }
    orderStatus(value = 'shipped') {
        this.state.params.order.status = asText(value);
        return this;
    }
    orderDescription(value = 'tes') {
        this.state.params.order.description = asText(value);
        return this;
    }
    orderType(value = 'ORDER') {
        this.state.params.order.order_type = asText(value);
        return this;
    }
    subtotal(value = DEFAULT_AMOUNT.value, offset = DEFAULT_AMOUNT.offset) {
        this.state.params.order.subtotal = money(value, offset);
        return this;
    }
    tax(value = 0, offset = 100) {
        this.state.params.order.tax = money(value, offset);
        return this;
    }
    discount(value = 0, offset = 100) {
        this.state.params.order.discount = money(value, offset);
        return this;
    }
    shipping(value = 0, offset = 100) {
        this.state.params.order.shipping = money(value, offset);
        return this;
    }
    item(value = {}) {
        const item = {
            retailer_id: asText(value.retailer_id ?? value.retailerId ?? 'tes'),
            name: asText(value.name ?? 'tes'),
            amount: value.amount && typeof value.amount === 'object'
                ? value.amount
                : money(value.value ?? DEFAULT_AMOUNT.value, value.offset ?? DEFAULT_AMOUNT.offset),
            quantity: asNumber(value.quantity, 1)
        };
        if (value.sale_amount)
            item.sale_amount = value.sale_amount;
        if (value.description)
            item.description = asText(value.description);
        this.state.params.order.items = [item];
        return this;
    }
    addItem(value = {}) {
        const current = Array.isArray(this.state.params.order.items) ? this.state.params.order.items : [];
        this.item(value);
        const item = this.state.params.order.items[0];
        this.state.params.order.items = [...current, item];
        return this;
    }
    items(values = []) {
        this.state.params.order.items = [];
        for (const value of values)
            this.addItem(value);
        return this;
    }
    nativePaymentMethods(values = []) {
        this.state.params.native_payment_methods = values.map((item) => typeof item === 'string' ? item : JSON.stringify(item));
        return this;
    }
    paymentMethods(values = []) {
        return this.nativePaymentMethods(values);
    }
    shareStatus(value = true) {
        this.state.params.share_payment_status = Boolean(value);
        return this;
    }
    softDeleted(value = false) {
        this.state.params.is_soft_deleted = Boolean(value);
        return this;
    }
    template(value = {}) {
        if (value.header)
            this.header(value.header);
        if (value.body !== undefined)
            this.body(value.body);
        if (value.footer !== undefined)
            this.footer(value.footer);
        if (value.buttonName)
            this.button(value.buttonName);
        if (value.params)
            this.params(value.params);
        if (value.messageParams !== undefined)
            this.messageParams(value.messageParams);
        return this;
    }
}
export class EWalletBuilder extends BaseNativeBuilder {
    constructor(sock) {
        super(sock);
        this.walletName = 'dana';
        this.wallet('dana');
    }
    wallet(name = 'dana') {
        const rawKey = String(name || 'dana').toLowerCase();
        const key = EWALLET_ALIASES[rawKey] || rawKey;
        const profile = EWALLET_PRESETS[key] || EWALLET_PRESETS.dana;
        this.walletName = key;
        this.state.header = {};
        this.state.body = {};
        this.state.footer = {};
        this.state.buttonName = 'payment_key_info';
        this.state.params = defaultEwalletParams(profile);
        this.state.additionalNodes = paymentKeyAdditionalNodes();
        return this;
    }
    dana() {
        return this.wallet('dana');
    }
    gopay() {
        return this.wallet('gopay');
    }
    ovo() {
        return this.wallet('ovo');
    }
    linkaja() {
        return this.wallet('linkaja');
    }
    seabank() {
        return this.wallet('seabank');
    }
    qris() {
        return this.wallet('seabank');
    }
    shopepay() {
        return this.wallet('seabank');
    }
    currency(value = 'IDR') {
        this.state.params.currency = asText(value);
        return this;
    }
    amount(value = 0, offset = 100) {
        this.state.params.total_amount = money(value, offset);
        this.state.params.order.subtotal = money(value, offset);
        const item = this.state.params.order.items?.[0];
        if (item) {
            item.amount = money(value, offset);
            item.sale_amount = money(value, offset);
        }
        return this;
    }
    reference(value = makeId('EWALLET')) {
        this.state.params.reference_id = asText(value);
        return this;
    }
    type(value = 'physical-goods') {
        this.state.params.type = asText(value);
        return this;
    }
    order(value = {}) {
        this.state.params.order = mergeDeep(this.state.params.order, value);
        return this;
    }
    orderStatus(value = 'pending') {
        this.state.params.order.status = asText(value);
        return this;
    }
    orderType(value = 'ORDER') {
        this.state.params.order.order_type = asText(value);
        return this;
    }
    item(value = {}) {
        this.state.params.order.items = [
            {
                name: String(value.name ?? ''),
                amount: value.amount && typeof value.amount === 'object'
                    ? value.amount
                    : money(value.value ?? 0, value.offset ?? 100),
                quantity: asNumber(value.quantity, 0),
                sale_amount: value.sale_amount && typeof value.sale_amount === 'object'
                    ? value.sale_amount
                    : money(value.saleValue ?? value.value ?? 0, value.saleOffset ?? value.offset ?? 100)
            }
        ];
        return this;
    }
    key(value = 'JScraper') {
        this.state.params.payment_settings[0].payment_key.key = String(value ?? '');
        return this;
    }
    name(value = 'DANA') {
        this.state.params.payment_settings[0].payment_key.name = asText(value);
        return this;
    }
    institution(value = 'DANA') {
        this.state.params.payment_settings[0].payment_key.institution_name = asText(value);
        return this;
    }
    fullName(value = 'Donate JScraper') {
        this.state.params.payment_settings[0].payment_key.full_name_on_account = asText(value);
        return this;
    }
    accountType(value = 'wallet') {
        this.state.params.payment_settings[0].payment_key.account_type = asText(value);
        return this;
    }
    paymentKey(value = {}) {
        this.state.params.payment_settings[0].payment_key = mergeDeep(this.state.params.payment_settings[0].payment_key, value);
        return this;
    }
    paymentSettings(value = []) {
        this.state.params.payment_settings = Array.isArray(value) ? value : [];
        return this;
    }
    shareStatus(value = false) {
        this.state.params.share_payment_status = Boolean(value);
        return this;
    }
    softDeleted(value = false) {
        this.state.params.is_soft_deleted = Boolean(value);
        return this;
    }
    referral(value = 'chat_attachment') {
        this.state.params.referral = asText(value);
        return this;
    }
    template(value = {}) {
        if (value.wallet)
            this.wallet(value.wallet);
        if (value.header)
            this.header(value.header);
        if (value.title)
            this.title(value.title);
        if (value.body !== undefined)
            this.body(value.body);
        if (value.footer !== undefined)
            this.footer(value.footer);
        if (value.params)
            this.params(value.params);
        if (value.paymentKey)
            this.paymentKey(value.paymentKey);
        if (value.messageParams !== undefined)
            this.messageParams(value.messageParams);
        return this;
    }
    build() {
        return {
            interactiveMessage: {
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: this.state.buttonName,
                            buttonParamsJson: JSON.stringify(this.state.params)
                        }
                    ],
                    messageParamsJson: this.state.messageParamsJson
                }
            }
        };
    }
}
export class OrderBuilder {
    constructor(sock) {
        _OrderBuilder_sock.set(this, void 0);
        _OrderBuilder_state.set(this, {});
        if (!sock)
            throw new Error('Socket is required');
        __classPrivateFieldSet(this, _OrderBuilder_sock, sock, "f");
        this.reset();
    }
    reset() {
        __classPrivateFieldSet(this, _OrderBuilder_state, {
            orderId: `INV-${Date.now()}`,
            thumbnail: TINY_JPEG,
            itemCount: 1,
            status: ORDER_STATUS.CONFIRMED,
            surface: ORDER_SURFACE.BILLING,
            message: ZERO_WIDTH_FILL,
            orderTitle: '',
            sellerJid: '',
            token: `INV-TOKEN-${Date.now()}`,
            totalAmount1000: 0,
            totalCurrencyCode: 'IDR',
            senderKeyDistribution: null,
            contextInfo: null
        }, "f");
        return this;
    }
    orderId(val = `INV-${Date.now()}`) {
        __classPrivateFieldGet(this, _OrderBuilder_state, "f").orderId = String(val);
        return this;
    }
    thumbnail(val = TINY_JPEG) {
        __classPrivateFieldGet(this, _OrderBuilder_state, "f").thumbnail = String(val ?? TINY_JPEG);
        return this;
    }
    async thumbnailFromProfile(jid) {
        try {
            const sharpMod = (await import('sharp')).default;
            const imageUrl = await __classPrivateFieldGet(this, _OrderBuilder_sock, "f").profilePictureUrl(jid, 'image').catch(() => null);
            if (!imageUrl)
                return this;
            const response = await fetch(imageUrl);
            const arrayBuffer = await response.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);
            const thumbnailBuffer = await sharpMod(imageBuffer)
                .resize(300, 300, {
                fit: 'cover',
                position: 'centre'
            })
                .jpeg({
                quality: 85,
                progressive: true
            })
                .toBuffer();
            __classPrivateFieldGet(this, _OrderBuilder_state, "f").thumbnail = thumbnailBuffer.toString('base64');
        }
        catch (e) {
            console.error('[OrderBuilder.thumbnailFromProfile]', e.message);
        }
        return this;
    }
    itemCount(val = 1) {
        __classPrivateFieldGet(this, _OrderBuilder_state, "f").itemCount = Math.max(0, Number(val) || 0);
        return this;
    }
    status(val = ORDER_STATUS.CONFIRMED) {
        __classPrivateFieldGet(this, _OrderBuilder_state, "f").status = Number(val);
        return this;
    }
    surface(val = ORDER_SURFACE.BILLING) {
        __classPrivateFieldGet(this, _OrderBuilder_state, "f").surface = Number(val);
        return this;
    }
    message(val = ZERO_WIDTH_FILL) {
        __classPrivateFieldGet(this, _OrderBuilder_state, "f").message = val !== undefined && val !== null ? String(val) : '';
        return this;
    }
    orderTitle(val = '') {
        __classPrivateFieldGet(this, _OrderBuilder_state, "f").orderTitle = String(val ?? '');
        return this;
    }
    sellerJid(val = '') {
        __classPrivateFieldGet(this, _OrderBuilder_state, "f").sellerJid = String(val ?? '');
        return this;
    }
    token(val = `INV-TOKEN-${Date.now()}`) {
        __classPrivateFieldGet(this, _OrderBuilder_state, "f").token = String(val);
        return this;
    }
    totalAmount(val = 0, divisor = 1000) {
        __classPrivateFieldGet(this, _OrderBuilder_state, "f").totalAmount1000 = Math.round(Number(val) / divisor);
        return this;
    }
    totalAmountRaw(val = 0) {
        __classPrivateFieldGet(this, _OrderBuilder_state, "f").totalAmount1000 = Number(val) || 0;
        return this;
    }
    currency(val = 'IDR') {
        __classPrivateFieldGet(this, _OrderBuilder_state, "f").totalCurrencyCode = String(val);
        return this;
    }
    contextInfo(info = null) {
        if (info && typeof info === 'object') {
            __classPrivateFieldGet(this, _OrderBuilder_state, "f").contextInfo = {
                mentionedJid: Array.isArray(info.mentionedJid) ? info.mentionedJid : [],
                groupMentions: Array.isArray(info.groupMentions) ? info.groupMentions : [],
                ...info
            };
        }
        else {
            __classPrivateFieldGet(this, _OrderBuilder_state, "f").contextInfo = null;
        }
        return this;
    }
    mentionedJid(...jids) {
        const arr = jids
            .flat()
            .filter(Boolean)
            .map((j) => (String(j).includes('@') ? j : `${j}@s.whatsapp.net`));
        if (arr.length > 0) {
            if (!__classPrivateFieldGet(this, _OrderBuilder_state, "f").contextInfo)
                __classPrivateFieldGet(this, _OrderBuilder_state, "f").contextInfo = { mentionedJid: [], groupMentions: [], statusAttributions: [] };
            __classPrivateFieldGet(this, _OrderBuilder_state, "f").contextInfo.mentionedJid = arr;
        }
        return this;
    }
    senderKeyDistribution(groupId, axolotlKey) {
        if (groupId && axolotlKey) {
            __classPrivateFieldGet(this, _OrderBuilder_state, "f").senderKeyDistribution = {
                groupId: String(groupId),
                axolotlSenderKeyDistributionMessage: String(axolotlKey)
            };
        }
        return this;
    }
    noSenderKeyDistribution() {
        __classPrivateFieldGet(this, _OrderBuilder_state, "f").senderKeyDistribution = null;
        return this;
    }
    template(value = {}) {
        if (value.orderId)
            this.orderId(value.orderId);
        if (value.thumbnail)
            this.thumbnail(value.thumbnail);
        if (value.itemCount !== undefined)
            this.itemCount(value.itemCount);
        if (value.status !== undefined)
            this.status(value.status);
        if (value.surface !== undefined)
            this.surface(value.surface);
        if (value.message !== undefined)
            this.message(value.message);
        if (value.orderTitle)
            this.orderTitle(value.orderTitle);
        if (value.sellerJid)
            this.sellerJid(value.sellerJid);
        if (value.token)
            this.token(value.token);
        if (value.totalAmount !== undefined)
            this.totalAmountRaw(value.totalAmount);
        if (value.currency)
            this.currency(value.currency);
        if (value.contextInfo)
            this.contextInfo(value.contextInfo);
        if (value.senderKeyGroupId && value.senderKeyAxolotl) {
            this.senderKeyDistribution(value.senderKeyGroupId, value.senderKeyAxolotl);
        }
        return this;
    }
    getState() {
        return { ...__classPrivateFieldGet(this, _OrderBuilder_state, "f") };
    }
    build() {
        if (!__classPrivateFieldGet(this, _OrderBuilder_state, "f").orderTitle) {
            throw new Error('orderTitle harus diisi');
        }
        if (!__classPrivateFieldGet(this, _OrderBuilder_state, "f").sellerJid) {
            throw new Error('sellerJid harus diisi');
        }
        if (!__classPrivateFieldGet(this, _OrderBuilder_state, "f").token) {
            throw new Error('token harus diisi');
        }
        const orderMessage = {
            orderId: __classPrivateFieldGet(this, _OrderBuilder_state, "f").orderId,
            thumbnail: __classPrivateFieldGet(this, _OrderBuilder_state, "f").thumbnail,
            itemCount: __classPrivateFieldGet(this, _OrderBuilder_state, "f").itemCount,
            status: __classPrivateFieldGet(this, _OrderBuilder_state, "f").status,
            surface: __classPrivateFieldGet(this, _OrderBuilder_state, "f").surface,
            message: __classPrivateFieldGet(this, _OrderBuilder_state, "f").message,
            orderTitle: __classPrivateFieldGet(this, _OrderBuilder_state, "f").orderTitle,
            sellerJid: __classPrivateFieldGet(this, _OrderBuilder_state, "f").sellerJid,
            token: __classPrivateFieldGet(this, _OrderBuilder_state, "f").token,
            totalAmount1000: __classPrivateFieldGet(this, _OrderBuilder_state, "f").totalAmount1000,
            totalCurrencyCode: __classPrivateFieldGet(this, _OrderBuilder_state, "f").totalCurrencyCode
        };
        if (__classPrivateFieldGet(this, _OrderBuilder_state, "f").contextInfo) {
            orderMessage.contextInfo = __classPrivateFieldGet(this, _OrderBuilder_state, "f").contextInfo;
        }
        const msg = { orderMessage };
        if (__classPrivateFieldGet(this, _OrderBuilder_state, "f").senderKeyDistribution) {
            msg.senderKeyDistributionMessage = __classPrivateFieldGet(this, _OrderBuilder_state, "f").senderKeyDistribution;
        }
        return msg;
    }
    async send(jid, options = {}) {
        const msg = this.build();
        return __classPrivateFieldGet(this, _OrderBuilder_sock, "f").relayMessage(jid, msg, options);
    }
}
_OrderBuilder_sock = new WeakMap(), _OrderBuilder_state = new WeakMap();
export function createPaymentBuilder(sock) {
    return new PaymentBuilder(sock);
}
export function createEWalletBuilder(sock, wallet = 'dana') {
    return new EWalletBuilder(sock).wallet(wallet);
}
export function createOrderBuilder(sock) {
    return new OrderBuilder(sock);
}
export function usePayment(sock) {
    const version = 2;
    if (sock.__paymentBuilderVersion === version)
        return sock;
    sock.payment = () => createPaymentBuilder(sock);
    sock.ewallet = (wallet = 'dana') => createEWalletBuilder(sock, wallet);
    sock.paymentKey = (wallet = 'dana') => createEWalletBuilder(sock, wallet);
    sock.order = () => createOrderBuilder(sock);
    sock.Payment = PaymentBuilder;
    sock.EWallet = EWalletBuilder;
    sock.OrderBuilder = OrderBuilder;
    sock.paymentBuilder = createPaymentBuilder;
    sock.ewalletBuilder = createEWalletBuilder;
    sock.orderBuilder = createOrderBuilder;
    sock.paymentAdditionalNodes = paymentAdditionalNodes;
    sock.paymentKeyAdditionalNodes = paymentKeyAdditionalNodes;
    sock.__paymentBuilderVersion = version;
    sock.sendPayment = async (chatId, opts = {}) => {
        const p = new PaymentBuilder(sock, chatId);
        if (opts.amount !== undefined)
            p.amount(opts.amount, opts.offset);
        if (opts.currency)
            p.currency(opts.currency);
        if (opts.reference)
            p.reference(opts.reference);
        if (opts.note)
            p.note(opts.note);
        return sock.sendMessage(chatId, p.build(), opts);
    };
    sock.sendEWallet = async (chatId, opts = {}) => {
        const e = new EWalletBuilder(sock, chatId);
        if (opts.amount !== undefined)
            e.amount(opts.amount, opts.offset);
        if (opts.currency)
            e.currency(opts.currency);
        if (opts.reference)
            e.reference(opts.reference);
        if (opts.note)
            e.note(opts.note);
        return sock.sendMessage(chatId, e.build(), opts);
    };
    sock.sendOrder = async (chatId, opts = {}) => {
        const o = new OrderBuilder(sock, chatId);
        if (opts.orderTitle)
            o.orderTitle(opts.orderTitle);
        if (opts.sellerJid)
            o.sellerJid(opts.sellerJid);
        if (opts.token)
            o.token(opts.token);
        if (opts.orderId)
            o.orderId(opts.orderId);
        if (opts.thumbnail)
            o.thumbnail(opts.thumbnail);
        return sock.sendMessage(chatId, o.build(), opts);
    };
    return sock;
}
// ============================================================
// LINK PREVIEW
// (dipindahkan dari lib/linkpreview.js)
// ============================================================
export class LinkPreviewBuilder {
    constructor(sock) {
        _LinkPreviewBuilder_sock.set(this, void 0);
        _LinkPreviewBuilder_imageInput.set(this, null);
        _LinkPreviewBuilder_text.set(this, '');
        _LinkPreviewBuilder_title.set(this, '');
        _LinkPreviewBuilder_description.set(this, '');
        _LinkPreviewBuilder_link.set(this, '');
        _LinkPreviewBuilder_previewType.set(this, 'small');
        if (!sock)
            throw new Error('Socket is required');
        __classPrivateFieldSet(this, _LinkPreviewBuilder_sock, sock, "f");
    }
    image(input) {
        if (!input)
            return this;
        __classPrivateFieldSet(this, _LinkPreviewBuilder_imageInput, input, "f");
        return this;
    }
    text(val = '') {
        __classPrivateFieldSet(this, _LinkPreviewBuilder_text, String(val ?? ''), "f");
        return this;
    }
    title(val = '') {
        __classPrivateFieldSet(this, _LinkPreviewBuilder_title, String(val ?? ''), "f");
        return this;
    }
    description(val = '') {
        __classPrivateFieldSet(this, _LinkPreviewBuilder_description, String(val ?? ''), "f");
        return this;
    }
    link(val = '') {
        __classPrivateFieldSet(this, _LinkPreviewBuilder_link, String(val ?? ''), "f");
        return this;
    }
    type(val = 'small') {
        const t = String(val || 'small').toLowerCase();
        __classPrivateFieldSet(this, _LinkPreviewBuilder_previewType, t === 'big' ? 'big' : 'small', "f");
        return this;
    }
    async send(jid, options = {}) {
        if (!jid)
            throw new Error('Target JID required');
        const link = __classPrivateFieldGet(this, _LinkPreviewBuilder_link, "f") || 'https://example.com';
        const title = __classPrivateFieldGet(this, _LinkPreviewBuilder_title, "f") || 'Link Preview';
        const description = __classPrivateFieldGet(this, _LinkPreviewBuilder_description, "f") || '© powered by bot';
        const text = __classPrivateFieldGet(this, _LinkPreviewBuilder_text, "f").includes(link) ? __classPrivateFieldGet(this, _LinkPreviewBuilder_text, "f") : `${link}\n${__classPrivateFieldGet(this, _LinkPreviewBuilder_text, "f") || title}`;
        let buffer = null;
        if (__classPrivateFieldGet(this, _LinkPreviewBuilder_imageInput, "f")) {
            if (Buffer.isBuffer(__classPrivateFieldGet(this, _LinkPreviewBuilder_imageInput, "f"))) {
                buffer = __classPrivateFieldGet(this, _LinkPreviewBuilder_imageInput, "f");
            }
            else if (typeof __classPrivateFieldGet(this, _LinkPreviewBuilder_imageInput, "f") === 'string') {
                try {
                    const res = await fetch(__classPrivateFieldGet(this, _LinkPreviewBuilder_imageInput, "f"));
                    if (res.ok)
                        buffer = Buffer.from(await res.arrayBuffer());
                }
                catch { }
            }
        }
        if (__classPrivateFieldGet(this, _LinkPreviewBuilder_previewType, "f") === 'big' && buffer) {
            const tempPath = path.join(os.tmpdir(), `lp-hq-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`);
            try {
                fs.writeFileSync(tempPath, buffer);
                const { imageMessage } = await prepareWAMessageMedia({ image: { url: tempPath } }, {
                    upload: __classPrivateFieldGet(this, _LinkPreviewBuilder_sock, "f").waUploadToServer,
                    mediaTypeOverride: 'thumbnail-link'
                });
                return await __classPrivateFieldGet(this, _LinkPreviewBuilder_sock, "f").sendMessage(jid, {
                    text,
                    linkPreview: {
                        'matched-text': link,
                        title,
                        description,
                        jpegThumbnail: imageMessage.jpegThumbnail,
                        highQualityThumbnail: imageMessage
                    }
                }, options);
            }
            finally {
                try {
                    if (fs.existsSync(tempPath))
                        fs.unlinkSync(tempPath);
                }
                catch { }
            }
        }
        sock.sendLinkPreview = async (jid, text, url, opts = {}) => {
            const l = new LinkPreviewBuilder(sock);
            l.text(text).link(url);
            if (opts.title)
                l.title(opts.title);
            if (opts.description)
                l.description(opts.description);
            if (opts.image)
                l.image(opts.image);
            if (opts.previewType)
                l.type(opts.previewType);
            return l.send(jid, opts);
        };
        return await __classPrivateFieldGet(this, _LinkPreviewBuilder_sock, "f").sendMessage(jid, {
            text,
            linkPreview: {
                'matched-text': link,
                title,
                description,
                ...(buffer ? { jpegThumbnail: buffer } : {})
            }
        }, options);
    }
}
_LinkPreviewBuilder_sock = new WeakMap(), _LinkPreviewBuilder_imageInput = new WeakMap(), _LinkPreviewBuilder_text = new WeakMap(), _LinkPreviewBuilder_title = new WeakMap(), _LinkPreviewBuilder_description = new WeakMap(), _LinkPreviewBuilder_link = new WeakMap(), _LinkPreviewBuilder_previewType = new WeakMap();
export function createLinkPreviewBuilder(sock) {
    return new LinkPreviewBuilder(sock);
}
export const patchLinkPreview = (sock) => {
    if (!sock || sock.__linkPreviewPatched)
        return sock;
    sock.linkpreview = () => createLinkPreviewBuilder(sock);
    sock.LinkPreviewBuilder = LinkPreviewBuilder;
    sock.__linkPreviewPatched = true;
    return sock;
};
// ============================================================
// MAIN APPLY FUNCTION
// ============================================================
export function applyNaileys(sock) {
    patch_proto(); // SWGC proto patch (runtime, tidak butuh disk)
    patchPairing(sock); // pairing: sock.pairing(), sock.requestPairingCode(), dll
    patchSwgc(sock); // sock.swgc(), sock.swgcBuilder(), sock.COLORS, dll
    patchLidToPn(sock); // sock.lidToPn(), sock.pnToLid(), dll
    patchSocketStickerPack(sock); // sock.sendSticker(), sock.sendStickerPack()
    patchNewsletter(sock); // sock.upch(), sock.normalizeNewsletterJid(), dll
    patchSocketAIRich(sock); // sock.airich()
    patchSocketButtonV2(sock); // sock.locbtn()
    patchSocketInteractive(sock); // sock.button(), sock.carouselBuilder(), dll
    usePayment(sock); // sock.payment(), sock.ewallet(), sock.order()
    patchLinkPreview(sock); // sock.linkpreview()
}
//# sourceMappingURL=Naileys.js.map