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
import { createRequire } from 'module'

const _require = createRequire(import.meta.url)

// ── Main libsignal exports ─────────────────────────────────────
const _libsignal = _require('libsignal')

export const ProtocolAddress: typeof _libsignal.ProtocolAddress = _libsignal.ProtocolAddress
export const SessionCipher: typeof _libsignal.SessionCipher = _libsignal.SessionCipher
export const SessionRecord: typeof _libsignal.SessionRecord = _libsignal.SessionRecord
export const SessionBuilder: typeof _libsignal.SessionBuilder = _libsignal.SessionBuilder

export type SignalStorage = {
	loadSession(id: string): Promise<InstanceType<typeof SessionRecord> | null>
	storeSession(id: string, session: InstanceType<typeof SessionRecord>): Promise<void>
	isTrustedIdentity(id: string, publicKey: Uint8Array): boolean
	loadPreKey(id: number | string): Promise<{ privKey: Buffer; pubKey: Buffer } | undefined>
	removePreKey(id: number): Promise<void>
	loadSignedPreKey(): { privKey: Buffer; pubKey: Buffer }
	getOurRegistrationId(): number
	getOurIdentity(): { privKey: Buffer; pubKey: Buffer }
}

// ── Crypto exports ─────────────────────────────────────────────
const _crypto = _require('libsignal/src/crypto')

export const decrypt: typeof _crypto.decrypt = _crypto.decrypt
export const encrypt: typeof _crypto.encrypt = _crypto.encrypt
export const calculateMAC: typeof _crypto.calculateMAC = _crypto.calculateMAC
export const deriveSecrets: typeof _crypto.deriveSecrets = _crypto.deriveSecrets

// ── Curve exports ──────────────────────────────────────────────
const _curve = _require('libsignal/src/curve')

export const generateKeyPair: typeof _curve.generateKeyPair = _curve.generateKeyPair
export const calculateAgreement: typeof _curve.calculateAgreement = _curve.calculateAgreement
export const calculateSignature: typeof _curve.calculateSignature = _curve.calculateSignature
export const verifySignature: typeof _curve.verifySignature = _curve.verifySignature

// ── Protobufs exports ──────────────────────────────────────────
const _protobufs = _require('libsignal/src/protobufs')

export const PreKeyWhisperMessage: typeof _protobufs.PreKeyWhisperMessage = _protobufs.PreKeyWhisperMessage

// ── Re-export as namespaced objects for drop-in replacement ────
export const curve = {
	generateKeyPair,
	calculateAgreement,
	calculateSignature,
	verifySignature
} as const

export const crypto = {
	decrypt,
	encrypt,
	calculateMAC,
	deriveSecrets
} as const

export const protobufs = {
	PreKeyWhisperMessage
} as const


