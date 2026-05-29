import { randomBytes, randomUUID } from 'crypto'
import sharp from 'sharp'
import { proto } from '../../WAProto/index.js'
import { generateWAMessageContent, generateWAMessageFromContent, getContentType, prepareWAMessageMedia } from './messages.js'
import { downloadContentFromMessage } from './messages-media.js'

export const NIXCODE_VERSION = 'naileys-1.0.0'

type PlainObject = Record<string, any>

const nativeFlowAdditionalNodes = [
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
]

const emptyText = ''

const isObject = (value: any): value is PlainObject => {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const streamToBuffer = async (stream: any): Promise<Buffer> => {
	const chunks: Buffer[] = []
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
	}
	return Buffer.concat(chunks)
}

const fetchBuffer = async (url: string, options: any = {}, config: any = {}): Promise<Buffer> => {
	try {
		const response = await fetch(url, options)
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`)
		}
		return Buffer.from(await response.arrayBuffer())
	} catch (error) {
		if (config.silent) {
			return Buffer.alloc(0)
		}
		throw error
	}
}

const resolveBuffer = async (input: any): Promise<Buffer> => {
	if (Buffer.isBuffer(input)) {
		return input
	}
	if (input instanceof Uint8Array) {
		return Buffer.from(input)
	}
	if (typeof input === 'string' && /^https?:\/\//i.test(input)) {
		return await fetchBuffer(input)
	}
	if (typeof input === 'string') {
		const fs = await import('fs')
		return fs.readFileSync(input)
	}
	if (input?.url) {
		return await fetchBuffer(String(input.url))
	}
	return Buffer.alloc(0)
}

const dummyPngBuffer = (): Buffer => {
	return Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
		'base64'
	)
}

const resolveJpegThumbnail = async (input: any): Promise<Buffer> => {
	const buffer = await resolveBuffer(input).catch(() => Buffer.alloc(0))
	const source = buffer.length ? buffer : dummyPngBuffer()
	return await sharp(source).resize(300, 300, { fit: 'cover', position: 'center' }).jpeg({ quality: 80 }).toBuffer()
}

const formatButtonParams = (params: any): string => {
	return typeof params === 'string' ? params : JSON.stringify(params || {})
}

const buildLimitedOfferParam = (input: PlainObject = {}): PlainObject => {
	const expiresAt = input.expiresAt || input.expires_at || input.expires || input.expiration_time
	const offer: PlainObject = {
		text: String(input.text ?? input.display_text ?? ''),
		url: String(input.url ?? input.link ?? ''),
		copy_code: String(input.copy_code ?? input.code ?? '')
	}
	if (input.thumbnailUrl || input.thumbnail_url) {
		offer.thumbnail_url = String(input.thumbnailUrl || input.thumbnail_url)
	}
	if (!input.noExpiration && !input.hideExpiration && expiresAt) {
		let expiryMs = 0
		if (expiresAt instanceof Date) {
			expiryMs = expiresAt.getTime()
		} else if (typeof expiresAt === 'number') {
			expiryMs = expiresAt < 10_000_000_000 ? expiresAt * 1000 : expiresAt
		} else {
			const numeric = Number(expiresAt)
			if (Number.isFinite(numeric)) {
				expiryMs = numeric < 10_000_000_000 ? numeric * 1000 : numeric
			} else {
				const date = new Date(String(expiresAt))
				if (!Number.isNaN(date.getTime())) {
					expiryMs = date.getTime()
				}
			}
		}
		if (expiryMs) {
			offer.expiration_time = expiryMs
		}
	}
	return offer
}

const buildBookingConfirmationParams = (input: PlainObject = {}): PlainObject => {
	const now = Date.now()
	const start = input.start_datetime || input.startDatetime || input.start || new Date(now + 60_000).toISOString()
	const end = input.end_datetime || input.endDatetime || input.end || new Date(now + 660_000).toISOString()
	const display = input.display_content || {}
	return {
		start_datetime: String(start),
		end_datetime: String(end),
		location: String(input.location || ''),
		booking_url: String(input.booking_url || input.bookingUrl || input.url || ''),
		phone_number: String(input.phone_number || input.phoneNumber || input.number || ''),
		booking_management_url: String(input.booking_management_url || input.bookingManagementUrl || input.management_url || ''),
		description: String(input.description || ''),
		email: String(input.email || ''),
		display_text: String(input.display_text || input.displayText || input.text || ''),
		display_content: {
			display_language: String(display.display_language || input.displayLanguage || 'id'),
			display_meeting_type: String(display.display_meeting_type || input.meetingType || ''),
			display_bottom_sheet_header: String(display.display_bottom_sheet_header || input.bottomSheetHeader || ''),
			display_add_to_calendar_cta_text: String(display.display_add_to_calendar_cta_text || input.addToCalendarText || 'CALENDAR'),
			display_view_on_maps_cta_text: String(display.display_view_on_maps_cta_text || input.viewOnMapsText || ''),
			display_manage_booking_cta_text: String(display.display_manage_booking_cta_text || input.manageBookingText || ''),
			display_manage_booking_not_supported_text: String(
				display.display_manage_booking_not_supported_text || input.manageBookingNotSupportedText || ''
			),
			display_read_more: String(display.display_read_more || input.readMoreText || '')
		}
	}
}

class BaseBuilder {
	protected _title = ''
	protected _subtitle = ''
	protected _body = ''
	protected _footer = ''
	protected _contextInfo: PlainObject = {}
	protected _extraPayload: PlainObject = {}

	setTitle(title: string) {
		this._title = String(title ?? '')
		return this
	}

	setSubtitle(subtitle: string) {
		this._subtitle = String(subtitle ?? '')
		return this
	}

	setBody(body: string) {
		this._body = String(body ?? '')
		return this
	}

	setFooter(footer: string) {
		this._footer = String(footer ?? '')
		return this
	}

	setContextInfo(obj: PlainObject) {
		if (!isObject(obj)) {
			throw new TypeError('ContextInfo must be a plain object')
		}
		this._contextInfo = obj
		return this
	}

	addPayload(obj: PlainObject) {
		if (!isObject(obj)) {
			throw new TypeError('Payload must be a plain object')
		}
		Object.assign(this._extraPayload, obj)
		return this
	}

	static async resize(buffer: Buffer, x: number, y: number, fit = 'cover') {
		return await sharp(buffer)
			.resize(x, y, { fit: fit as any, position: 'center', background: { r: 0, g: 0, b: 0, alpha: 0 } })
			.png()
			.toBuffer()
	}

	static async fetchBuffer(url: string, options: any = {}, config: any = {}) {
		return await fetchBuffer(url, options, config)
	}
}






export class Message extends BaseBuilder {
	private client: any
	private data: any
	private params: PlainObject = {}
	
	// Button state
	private buttons: any[] = []
	private currentSelectionIndex = -1
	private currentSectionIndex = -1

	// ButtonV2 state
	private legacyButtons: any[] = []
	private image: any

	// AIRich state
	private aiSubmessages: any[] = []
	private aiSections: any[] = []
	private richResponseSources: any[] = []

	constructor(client: any) {
		super()
		if (!client) {
			throw new Error('Socket is required')
		}
		this.client = client
	}

	// --- Common Media/Options ---

	setVideo(input: any, options: PlainObject = {}) {
		this.data = Buffer.isBuffer(input) ? { video: input, ...options } : { video: { url: input }, ...options }
		return this
	}

	setImage(input: any, options: PlainObject = {}) {
		this.data = Buffer.isBuffer(input) ? { image: input, ...options } : { image: { url: input }, ...options }
		return this
	}

	setDocument(input: any, options: PlainObject = {}) {
		this.data = Buffer.isBuffer(input) ? { document: input, ...options } : { document: { url: input }, ...options }
		return this
	}

	setMedia(obj: PlainObject) {
		if (!isObject(obj)) {
			throw new TypeError('Media must be a plain object')
		}
		this.data = obj
		return this
	}

	setThumbnail(input: any) {
		this.image = input
		return this
	}

	// --- Button / ButtonV2 ---

	clearButtons() {
		this.buttons = []
		this.legacyButtons = []
		return this
	}

	setParams(obj: PlainObject) {
		this.params = obj || {}
		return this
	}

	setLimitedOffer(input: PlainObject = {}) {
		this.params = { ...this.params, limited_time_offer: buildLimitedOfferParam(input) }
		return this
	}

	clearLimitedOffer() {
		const { limited_time_offer, ...rest } = this.params
		this.params = rest
		return this
	}

	addButton(name: string, params: any = {}, type?: string) {
		if (params === 'old' || type === 'old' || params?.type === 'old') {
			this.legacyButtons.push({ buttonId: typeof params === 'string' && params !== 'old' ? params : randomUUID(), buttonText: { displayText: name }, type: 1 })
			return this
		}
		this.buttons.push({ name, buttonParamsJson: formatButtonParams(params) })
		return this
	}

	addbutton(name: string, params: any = {}, type?: string) {
		return this.addButton(name, params, type)
	}

	addRawButton(obj: PlainObject) {
		if (!isObject(obj)) {
			throw new TypeError('Buttons must be a plain object')
		}
		this.legacyButtons.push(obj)
		return this
	}

	addReply(display_text = '', id = randomUUID(), options: PlainObject = {}) {
		return this.addButton('quick_reply', { display_text, id, ...options })
	}

	addCall(display_text = '', id = '', options: PlainObject = {}) {
		return this.addButton('cta_call', { display_text, id, ...options })
	}

	addReminder(display_text = '', id = '', options: PlainObject = {}) {
		return this.addButton('cta_reminder', { display_text, id, ...options })
	}

	addCancelReminder(display_text = '', id = '', options: PlainObject = {}) {
		return this.addButton('cta_cancel_reminder', { display_text, id, ...options })
	}

	addAddress(display_text = '', id = '', options: PlainObject = {}) {
		return this.addButton('address_message', { display_text, id, ...options })
	}

	addLocation(options: PlainObject = {}) {
		return this.addButton('send_location', options)
	}

	addUrl(display_text = '', url = '', webview_interaction = false, options: PlainObject = {}) {
		return this.addButton('cta_url', { display_text, url, webview_interaction, merchant_url: options.merchant_url || url, ...options })
	}

	addCopy(display_text = '', copy_code = '', options: PlainObject = {}) {
		return this.addButton('cta_copy', { display_text, copy_code, ...options })
	}

	addBookingConfirmation(params: PlainObject = {}) {
		return this.addButton('booking_confirmation', buildBookingConfirmationParams(params))
	}

	addBooking(params: PlainObject = {}) {
		return this.addBookingConfirmation(params)
	}

	addSelection(title: string, options: PlainObject = {}) {
		this.buttons.push({ ...options, name: 'single_select', buttonParamsJson: JSON.stringify({ title, sections: [] }) })
		this.currentSelectionIndex = this.buttons.length - 1
		this.currentSectionIndex = -1
		return this
	}

	makeSection(title = '', highlight_label = '') {
		if (this.currentSelectionIndex === -1) {
			throw new Error('You need to create a selection first')
		}
		const buttonParams = JSON.parse(this.buttons[this.currentSelectionIndex].buttonParamsJson)
		buttonParams.sections.push({ title, highlight_label, rows: [] })
		this.currentSectionIndex = buttonParams.sections.length - 1
		this.buttons[this.currentSelectionIndex].buttonParamsJson = JSON.stringify(buttonParams)
		return this
	}

	makeSections(title = '', highlight_label = '') {
		return this.makeSection(title, highlight_label)
	}

	makeRow(header = '', title = '', description = '', id = randomUUID()) {
		if (this.currentSelectionIndex === -1 || this.currentSectionIndex === -1) {
			throw new Error('You need to create a selection and a section first')
		}
		const buttonParams = JSON.parse(this.buttons[this.currentSelectionIndex].buttonParamsJson)
		buttonParams.sections[this.currentSectionIndex].rows.push({ header, title, description, id })
		this.buttons[this.currentSelectionIndex].buttonParamsJson = JSON.stringify(buttonParams)
		return this
	}

	async toCard() {
		const header = {
			title: this._title,
			subtitle: this._subtitle,
			hasMediaAttachment: !!this.data,
			...(this.data ? await prepareWAMessageMedia(this.data, { upload: this.client.waUploadToServer }) : {})
		}
		return {
			body: { text: this._body },
			footer: { text: this._footer },
			header,
			nativeFlowMessage: {
				messageParamsJson: JSON.stringify(this.params),
				buttons: this.buttons
			}
		}
	}

	// --- AIRich ---

	addText(text: string) {
		this.aiSubmessages.push({ messageType: 2, messageText: text })
		this.aiSections.push({
			view_model: {
				primitive: { text, __typename: 'GenAIMarkdownTextUXPrimitive' },
				__typename: 'GenAISingleLayoutViewModel'
			}
		})
		return this
	}

	addCode(language: string, code: string) {
		this.aiSubmessages.push({
			messageType: 5,
			codeMetadata: {
				codeLanguage: language,
				codeBlocks: [{ codeContent: code, highlightType: 0 }]
			}
		})
		this.aiSections.push({
			view_model: {
				primitive: {
					language,
					code_blocks: [{ content: code, type: 'DEFAULT' }],
					__typename: 'GenAICodeUXPrimitive'
				},
				__typename: 'GenAISingleLayoutViewModel'
			}
		})
		return this
	}

	addTable(table: string[][]) {
		const rows = table.map((items: string[], index: number) => ({ items, ...(index === 0 ? { isHeading: true } : {}) }))
		this.aiSubmessages.push({ messageType: 4, tableMetadata: { title: '', rows } })
		this.aiSections.push({
			view_model: {
				primitive: {
					rows: table.map((cells: string[], index: number) => ({ is_header: index === 0, cells })),
					__typename: 'GenATableUXPrimitive'
				},
				__typename: 'GenAISingleLayoutViewModel'
			}
		})
		return this
	}

	addSource(sources: string[][] = []) {
		const source = sources.map(([profile_url, url, text]) => ({
			source_type: 'THIRD_PARTY',
			source_display_name: text || '',
			source_subtitle: 'AI',
			source_url: url || '',
			favicon: { url: profile_url || '', mime_type: 'image/jpeg', width: 16, height: 16 }
		}))
		this.aiSections.push({
			view_model: {
				primitive: { sources: source, __typename: 'GenAISearchResultPrimitive' },
				__typename: 'GenAISingleLayoutViewModel'
			}
		})
		return this
	}

	addImage(imageUrl: string | string[]) {
		const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl]
		this.aiSubmessages.push({
			messageType: 1,
			gridImageMetadata: {
				gridImageUrl: { imagePreviewUrl: urls[0] },
				imageUrls: urls.map(url => ({ imagePreviewUrl: url, imageHighResUrl: url, sourceUrl: url }))
			}
		})
		for (const url of urls) {
			this.aiSections.push({
				view_model: {
					primitive: {
						media: { url, mime_type: 'image/jpeg' },
						imagine_type: 3,
						status: { status: 'READY' },
						__typename: 'GenAIImaginePrimitive'
					},
					__typename: 'GenAISingleLayoutViewModel'
				}
			})
		}
		return this
	}

	addReels(items: PlainObject[] = []) {
		this.aiSubmessages.push({
			messageType: 9,
			contentItemsMetadata: {
				contentType: 1,
				itemsMetadata: items.map(item => ({
					reelItem: {
						title: item.title || '',
						profileIconUrl: item.profileIconUrl || '',
						thumbnailUrl: item.thumbnailUrl || '',
						videoUrl: item.videoUrl || ''
					}
				}))
			}
		})
		items.forEach((item, idx) => {
			this.richResponseSources.push({
				provider: 'NIXCODE',
				thumbnailCDNURL: item.thumbnailUrl || '',
				sourceProviderURL: item.videoUrl || '',
				sourceQuery: '',
				faviconCDNURL: item.profileIconUrl || '',
				citationNumber: idx + 1,
				sourceTitle: item.title || ''
			})
		})
		return this
	}

	// --- Build and Send ---

	async build(jid: string, options: PlainObject = {}) {
		if (this.aiSubmessages.length > 0) {
			const forwarded = options.forwarded !== false
			const includesUnifiedResponse = options.includesUnifiedResponse !== false
			const contextInfo = forwarded
				? { forwardingScore: 1, isForwarded: true, forwardedAiBotMessageInfo: { botJid: '0@bot' }, forwardOrigin: 4, ...this._contextInfo }
				: this._contextInfo
			return {
				messageContextInfo: {
					deviceListMetadata: {},
					deviceListMetadataVersion: 2,
					botMetadata: {
						messageDisclaimerText: this._title,
						richResponseSourcesMetadata: { sources: this.richResponseSources }
					}
				},
				botForwardedMessage: {
					message: {
						richResponseMessage: {
							messageType: 1,
							submessages: this.aiSubmessages,
							unifiedResponse: {
								data: includesUnifiedResponse
									? Buffer.from(JSON.stringify({ response_id: randomUUID(), sections: this.aiSections })).toString('base64')
									: ''
							},
							contextInfo
						}
					}
				}
			}
		} else if (this.legacyButtons.length > 0) {
			const thumbnail = this.image ? await resolveJpegThumbnail(this.image) : undefined
			return generateWAMessageFromContent(
				jid,
				{
					...this._extraPayload,
					buttonsMessage: {
						contentText: this._body,
						footerText: this._footer,
						...(this.data || {
							headerType: 6,
							locationMessage: {
								degreesLatitude: 0,
								degreesLongitude: 0,
								name: this._title,
								address: this._subtitle,
								jpegThumbnail: thumbnail
							}
						}),
						viewOnce: true,
						contextInfo: this._contextInfo,
						buttons: [...this.legacyButtons]
					}
				},
				options as any
			)
		} else {
			const message = await this.toCard()
			return generateWAMessageFromContent(
				jid,
				{
					...this._extraPayload,
					interactiveMessage: {
						...message,
						contextInfo: this._contextInfo
					}
				},
				options as any
			)
		}
	}

	async send(jid: string, options: PlainObject = {}) {
		if (this.aiSubmessages.length > 0) {
			return await this.client.relayMessage(jid, await this.build(jid, options), options)
		} else {
			const msg = (await this.build(jid, options)) as any
			await this.client.relayMessage(msg.key.remoteJid, msg.message, {
				messageId: msg.key.id,
				additionalNodes: nativeFlowAdditionalNodes,
				...options
			})
			return msg
		}
	}
}

// Aliases for backward compatibility
export const Button = Message
export const ButtonV2 = Message
export const AIRich = Message

export class Carousel extends BaseBuilder {
	private client: any
	private cards: any[] = []

	constructor(client: any) {
		super()
		if (!client) {
			throw new Error('Socket is required')
		}
		this.client = client
	}

	addCard(card: any | any[]) {
		if (Array.isArray(card)) {
			this.cards.push(...card)
		} else {
			this.cards.push(card)
		}
		return this
	}

	build(jid: string, options: PlainObject = {}) {
		return generateWAMessageFromContent(
			jid,
			{
				...this._extraPayload,
				interactiveMessage: {
					header: { hasMediaAttachment: false },
					body: { text: this._body },
					footer: { text: this._footer },
					contextInfo: this._contextInfo,
					carouselMessage: { cards: this.cards }
				}
			},
			options as any
		)
	}

	async send(jid: string, options: PlainObject = {}) {
		const msg = this.build(jid, options)
		await this.client.relayMessage(msg.key.remoteJid, msg.message, {
			messageId: msg.key.id,
			additionalNodes: nativeFlowAdditionalNodes,
			...options
		})
		return msg
	}
}

const unwrapMessage = (message: any): any => {
	let msg = message?.message || message || {}
	for (let i = 0; i < 12; i++) {
		if (msg?.ephemeralMessage?.message) {
			msg = msg.ephemeralMessage.message
			continue
		}
		if (msg?.viewOnceMessage?.message) {
			msg = msg.viewOnceMessage.message
			continue
		}
		if (msg?.viewOnceMessageV2?.message) {
			msg = msg.viewOnceMessageV2.message
			continue
		}
		if (msg?.viewOnceMessageV2Extension?.message) {
			msg = msg.viewOnceMessageV2Extension.message
			continue
		}
		if (msg?.documentWithCaptionMessage?.message) {
			msg = msg.documentWithCaptionMessage.message
			continue
		}
		break
	}
	return msg || {}
}

const findContextInfo = (obj: any, depth = 0): any => {
	if (!obj || typeof obj !== 'object' || depth > 15) {
		return null
	}
	if (obj.contextInfo && typeof obj.contextInfo === 'object') {
		return obj.contextInfo
	}
	for (const value of Object.values(obj)) {
		const found = findContextInfo(value, depth + 1)
		if (found) {
			return found
		}
	}
	return null
}

const quotedMessage = (message: any): any => {
	const raw = unwrapMessage(message?.message || message || {})
	const ctx = findContextInfo(raw)
	return ctx?.quotedMessage ? unwrapMessage(ctx.quotedMessage) : null
}

const pickMedia = (message: any): { kind: 'image' | 'video' | 'audio'; node: any } | null => {
	const raw = unwrapMessage(message)
	if (raw.imageMessage) {
		return { kind: 'image', node: raw.imageMessage }
	}
	if (raw.videoMessage) {
		return { kind: 'video', node: raw.videoMessage }
	}
	if (raw.audioMessage) {
		return { kind: 'audio', node: raw.audioMessage }
	}
	return null
}

const downloadMediaBuffer = async (node: any, kind: 'image' | 'video' | 'audio'): Promise<Buffer> => {
	const stream = await downloadContentFromMessage(node, kind)
	return await streamToBuffer(stream)
}

const textFromMessage = (message: any): string => {
	const raw = unwrapMessage(message?.message || message || {})
	return (
		raw.conversation ||
		raw.extendedTextMessage?.text ||
		raw.imageMessage?.caption ||
		raw.videoMessage?.caption ||
		raw.documentMessage?.caption ||
		''
	)
}

export const createStatusPayloadFromInput = async (message: any, text = ''): Promise<PlainObject | null> => {
	const inputText = String(text || '').trim()
	const direct = pickMedia(unwrapMessage(message?.message || message || {}))
	const quoted = pickMedia(quotedMessage(message))
	const media = direct || quoted
	if (media) {
		const buffer = await downloadMediaBuffer(media.node, media.kind)
		const caption = inputText || String(media.node?.caption || '').trim()
		if (media.kind === 'image') {
			return { type: 'image', buffer, caption }
		}
		if (media.kind === 'video') {
			return { type: 'video', buffer, caption, mimetype: media.node?.mimetype || 'video/mp4', seconds: media.node?.seconds }
		}
		return {
			type: 'audio',
			buffer,
			mimetype: media.node?.mimetype || 'audio/ogg; codecs=opus',
			seconds: media.node?.seconds,
			ptt: !!media.node?.ptt
		}
	}
	if (inputText) {
		return { type: 'text', text: inputText }
	}
	return null
}

export const payloadToStatusContent = (payload: PlainObject, config: PlainObject = {}): PlainObject => {
	if (payload.type === 'text') {
		return { text: payload.text, backgroundColor: config.textStatusBackground || '#0b141a' }
	}
	if (payload.type === 'image') {
		return { image: payload.buffer, caption: payload.caption || '' }
	}
	if (payload.type === 'video') {
		return { video: payload.buffer, caption: payload.caption || '', mimetype: payload.mimetype || 'video/mp4' }
	}
	if (payload.type === 'audio') {
		return {
			audio: payload.buffer,
			mimetype: payload.mimetype || 'audio/ogg; codecs=opus',
			seconds: payload.seconds,
			ptt: !!payload.ptt
		}
	}
	throw new Error('Invalid SWGC payload')
}

const setGroupStatusContext = (inside: any): any => {
	const type = getContentType(inside)
	if (type && inside?.[type] && typeof inside[type] === 'object') {
		inside[type].contextInfo = { ...(inside[type].contextInfo || {}), isGroupStatus: true }
	}
	return inside
}

export const groupStatus = async (sock: any, groupJid: string, content: PlainObject, options: PlainObject = {}) => {
	if (!String(groupJid || '').endsWith('@g.us')) {
		throw new Error('Target must be a group jid')
	}
	const cloned = { ...content }
	const backgroundColor = cloned.backgroundColor
	delete cloned.backgroundColor
	const inside = await generateWAMessageContent(cloned as any, {
		upload: sock.waUploadToServer,
		backgroundColor,
		logger: sock.logger
	} as any)
	setGroupStatusContext(inside)
	const messageSecret = randomBytes(32)
	const msg = generateWAMessageFromContent(
		groupJid,
		{
			messageContextInfo: { messageSecret },
			groupStatusMessageV2: {
				message: {
					...inside,
					messageContextInfo: { messageSecret }
				}
			}
		},
		{ userJid: sock.user?.id, logger: sock.logger } as any
	)
	await sock.relayMessage(groupJid, msg.message, { messageId: msg.key.id, ...options })
	return msg
}

export const sendPayloadToGroupStatus = async (sock: any, groupJid: string, payload: PlainObject, options: PlainObject = {}) => {
	return await groupStatus(sock, groupJid, payloadToStatusContent(payload, options), options)
}

export const sendSwgc = async (sock: any, groupJid: string, input: any, options: PlainObject = {}) => {
	let payload: PlainObject | null = null
	if (typeof input === 'string') {
		payload = { type: 'text', text: input }
	} else if (Buffer.isBuffer(input)) {
		payload = { type: options.type || options.kind || 'image', buffer: input, caption: options.caption || '', mimetype: options.mimetype }
	} else if (input?.type && (input.buffer || input.text)) {
		payload = input
	} else if (input?.image || input?.video || input?.audio || input?.text) {
		const kind = input.image ? 'image' : input.video ? 'video' : input.audio ? 'audio' : 'text'
		payload =
			kind === 'text'
				? { type: 'text', text: input.text }
				: { type: kind, buffer: input[kind], caption: input.caption || '', mimetype: input.mimetype, seconds: input.seconds, ptt: input.ptt }
	} else {
		payload = await createStatusPayloadFromInput(input, options.text || options.caption || '')
	}
	if (!payload) {
		throw new Error('Invalid SWGC input')
	}
	return await sendPayloadToGroupStatus(sock, groupJid, payload, options)
}

export class Swgc {
	private client: any
	private targetJid = ''
	private payload: any
	private options: PlainObject = {}

	constructor(client: any) {
		if (!client) {
			throw new Error('Socket is required')
		}
		this.client = client
	}

	target(jid: string) {
		this.targetJid = jid
		return this
	}

	setTarget(jid: string) {
		return this.target(jid)
	}

	text(value: string) {
		this.payload = { type: 'text', text: value }
		return this
	}

	image(buffer: Buffer, caption = '') {
		this.payload = { type: 'image', buffer, caption }
		return this
	}

	video(buffer: Buffer, caption = '') {
		this.payload = { type: 'video', buffer, caption, mimetype: 'video/mp4' }
		return this
	}

	audio(buffer: Buffer, options: PlainObject = {}) {
		this.payload = { type: 'audio', buffer, ...options }
		return this
	}

	async fromInput(message: any, text = '') {
		this.payload = await createStatusPayloadFromInput(message, text)
		return this
	}

	async send(targetJid = '', options: PlainObject = {}) {
		return await sendSwgc(this.client, targetJid || this.targetJid, this.payload, { ...this.options, ...options })
	}
}

export const extractChannelInviteCode = (input: string): string => {
	const raw = String(input || '').trim()
	const match = raw.match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)/i) || raw.match(/channel\/([A-Za-z0-9]+)/i)
	return match?.[1] || ''
}

export const resolveChannelJid = async (sock: any, target: string): Promise<string> => {
	const raw = String(target || '').trim()
	if (!raw) {
		throw new Error('Channel target is empty')
	}
	if (raw.endsWith('@newsletter')) {
		return raw
	}
	if (/^\d+$/.test(raw)) {
		return `${raw}@newsletter`
	}
	const inviteCode = extractChannelInviteCode(raw)
	if (inviteCode) {
		if (typeof sock.newsletterMetadata !== 'function') {
			throw new Error('Socket does not expose newsletterMetadata')
		}
		const metadata = await sock.newsletterMetadata('invite', inviteCode)
		const jid = metadata?.id || metadata?.jid
		if (!jid) {
			throw new Error('Unable to resolve channel jid')
		}
		return jid.endsWith('@newsletter') ? jid : `${jid}@newsletter`
	}
	throw new Error('Invalid channel target')
}

const contentFromChannelInput = async (input: any, options: PlainObject = {}): Promise<PlainObject> => {
	if (typeof input === 'string') {
		return { text: input }
	}
	if (Buffer.isBuffer(input)) {
		const kind = options.type || options.kind || 'image'
		return kind === 'video'
			? { video: input, caption: options.caption || '', mimetype: options.mimetype || 'video/mp4' }
			: kind === 'audio'
				? { audio: input, mimetype: options.mimetype || 'audio/ogg; codecs=opus', ptt: !!options.ptt }
				: { image: input, caption: options.caption || '' }
	}
	if (input?.image || input?.video || input?.audio || input?.document || input?.sticker || input?.text) {
		return input
	}
	const media = pickMedia(unwrapMessage(input?.message || input || {})) || pickMedia(quotedMessage(input))
	if (media) {
		const buffer = await downloadMediaBuffer(media.node, media.kind)
		if (media.kind === 'image') {
			return { image: buffer, caption: options.caption || media.node?.caption || '' }
		}
		if (media.kind === 'video') {
			return { video: buffer, caption: options.caption || media.node?.caption || '', mimetype: media.node?.mimetype || 'video/mp4' }
		}
		return { audio: buffer, mimetype: media.node?.mimetype || 'audio/ogg; codecs=opus', ptt: !!media.node?.ptt }
	}
	const text = options.text || options.caption || textFromMessage(input)
	if (text) {
		return { text }
	}
	throw new Error('Invalid channel input')
}

export const upch = async (sock: any, target: string, input: any, options: PlainObject = {}) => {
	const jid = await resolveChannelJid(sock, target)
	const content = await contentFromChannelInput(input, options)
	return await sock.sendMessage(jid, content, options)
}

export const sendToChannel = upch
export const sendChannel = upch

export const sendCarouselWithLimitOffer = async (sock: any, jid: string, content: PlainObject = {}, options: PlainObject = {}) => {
	const carousel = new Carousel(sock)
		.setBody(String(content.body ?? content.text ?? ''))
		.setFooter(String(content.footer ?? ''))
	for (const card of content.cards || []) {
		const builder = new Button(sock)
			.setTitle(String(card.title || ''))
			.setSubtitle(String(card.subtitle || ''))
			.setBody(String(card.body || card.text || ''))
			.setFooter(String(card.footer || ''))
		const image = card.image || card.thumbnail || card.thumbnailUrl
		const video = card.video
		if (video) {
			builder.setVideo(video, { mimetype: card.mimetype || 'video/mp4' })
		} else {
			builder.setImage(image || dummyPngBuffer(), { mimetype: card.mimetype || 'image/jpeg' })
		}
		if (card.limitOffer || card.offer || card.limit_offer || options.limitOffer) {
			builder.setLimitedOffer(card.limitOffer || card.offer || card.limit_offer || options.limitOffer)
		}
		for (const button of card.buttons || []) {
			builder.addButton(button.name, button.buttonParamsJson ?? button.params ?? button)
		}
		carousel.addCard(await builder.toCard())
	}
	return await carousel.send(jid, options)
}

export const sendInteractiveCardLimitOffer = sendCarouselWithLimitOffer
export const normalizeLimitOfferInput = buildLimitedOfferParam
export { buildLimitedOfferParam, buildBookingConfirmationParams, nativeFlowAdditionalNodes }
