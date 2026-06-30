/**
 * libsignal-bridge.ts — ESM/CJS/Bun native compatibility wrapper
 *
 * The `libsignal` package is CJS-only and naileys imports from deep paths
 * like `libsignal/src/curve`, `libsignal/src/crypto`, `libsignal/src/protobufs`.
 * These deep imports break in strict ESM environments (Node ESM, Bun, bundlers).
 *
 * This bridge uses `createRequire` to load the CJS `libsignal` and re-exports
 * everything through ESM-compatible named exports, working across all runtimes.
 */
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
// ── Main libsignal exports ─────────────────────────────────────
const _libsignal = _require('libsignal');
export const ProtocolAddress = _libsignal.ProtocolAddress;
export const SessionCipher = _libsignal.SessionCipher;
export const SessionRecord = _libsignal.SessionRecord;
export const SessionBuilder = _libsignal.SessionBuilder;
// ── Crypto exports ─────────────────────────────────────────────
const _crypto = _require('libsignal/src/crypto');
export const decrypt = _crypto.decrypt;
export const encrypt = _crypto.encrypt;
export const calculateMAC = _crypto.calculateMAC;
export const deriveSecrets = _crypto.deriveSecrets;
// ── Curve exports ──────────────────────────────────────────────
const _curve = _require('libsignal/src/curve');
export const generateKeyPair = _curve.generateKeyPair;
export const calculateAgreement = _curve.calculateAgreement;
export const calculateSignature = _curve.calculateSignature;
export const verifySignature = _curve.verifySignature;
// ── Protobufs exports ──────────────────────────────────────────
const _protobufs = _require('libsignal/src/protobufs');
export const PreKeyWhisperMessage = _protobufs.PreKeyWhisperMessage;
// ── Re-export as namespaced objects for drop-in replacement ────
export const curve = {
    generateKeyPair,
    calculateAgreement,
    calculateSignature,
    verifySignature
};
export const crypto = {
    decrypt,
    encrypt,
    calculateMAC,
    deriveSecrets
};
export const protobufs = {
    PreKeyWhisperMessage
};
//# sourceMappingURL=libsignal-bridge.js.map