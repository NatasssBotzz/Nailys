import { randomBytes } from 'crypto'
import { proto } from '../../WAProto/index.js'

export type NatasssButton = {
	id: string
	text: string
	type?: number
}

export type NatasssNewsletterForwardInfo = {
	newsletterJid: string
	newsletterName?: string
	serverMessageId?: number | string
	contentType?: number
	accessibilityText?: string
}

export const normalizePairingCode = (code?: string | null, length = 8) => {
	if (!code) return undefined
	const normalized = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '')
	if (normalized.length !== length) {
		throw new Error(`Custom pairing code must be exactly ${length} alphanumeric chars`)
	}
	return normalized
}

export const generateCustomPairingCode = (length = 8) => {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
	const bytes = randomBytes(length)
	return Array.from(bytes as Uint8Array, (byte: number) => alphabet[byte % alphabet.length]).join('')
}

export const isNewsletterJid = (jid?: string | null) => typeof jid === 'string' && /@newsletter$/i.test(jid)

export const normalizeNewsletterJid = (jid?: string | number | null) => {
	const raw = String(jid ?? '').trim()
	if (!raw) throw new Error('newsletter jid/id is required')
	return raw.endsWith('@newsletter') ? raw : `${raw.replace(/@+$/, '')}@newsletter`
}

export const makeForwardedNewsletterContext = (info: NatasssNewsletterForwardInfo): proto.IContextInfo => {
	const serverMessageId = Number(info.serverMessageId ?? 0) || undefined
	return {
		isForwarded: true,
		forwardingScore: 999,
		forwardedNewsletterMessageInfo: {
			newsletterJid: normalizeNewsletterJid(info.newsletterJid),
			newsletterName: info.newsletterName || undefined,
			serverMessageId,
			contentType: info.contentType ?? 1,
			accessibilityText: info.accessibilityText || undefined
		}
	}
}

export const makeLegacyButtonsMessage = ({
	text,
	footer,
	buttons,
	contextInfo
}: {
	text: string
	footer?: string
	buttons: NatasssButton[]
	contextInfo?: proto.IContextInfo
}): proto.IMessage => {
	if (!Array.isArray(buttons) || buttons.length === 0) {
		throw new Error('buttons must contain at least one button')
	}

	return proto.Message.create({
		buttonsMessage: {
			contentText: text || ' ',
			footerText: footer || undefined,
			headerType: 1,
			buttons: buttons.map((button, index) => ({
				buttonId: String(button.id || `btn_${index + 1}`),
				buttonText: { displayText: String(button.text || button.id || `Button ${index + 1}`) },
				type: button.type ?? 1
			})),
			contextInfo
		} as any
	})
}
