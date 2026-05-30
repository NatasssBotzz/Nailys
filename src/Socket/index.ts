import { DEFAULT_CONNECTION_CONFIG } from '../Defaults'
import type { UserFacingSocketConfig } from '../Types'
import { makeCommunitiesSocket } from './communities'
import * as MessageBuilder from '../Utils/nixcode'
import * as ChannelHelper from '../Utils/channel'
import { pairing as pairingHelper, requestCustomPairingCode as requestCustomPairingCodeHelper, waitForQrPairing as waitForQrPairingHelper } from '../Utils/pairing'

// export the last socket layer
const makeWASocket = (config: UserFacingSocketConfig) => {
	const newConfig = {
		...DEFAULT_CONNECTION_CONFIG,
		...config
	}

	const sock = makeCommunitiesSocket(newConfig)

	try { MessageBuilder.patchSocketStickerPack?.(sock) } catch {}
	try { MessageBuilder.patchSocketSwgc?.(sock) } catch {}
	try { ChannelHelper.attachNewsletterFeatures?.(sock) } catch {}

	const ext = {
		pairing: (type: number | any = 0, options?: any) => pairingHelper(sock, type, options),
		// One-call helpers so consumers never need to reimplement the pairing flow
		// or ship a separate "pairhelper" library. Both delegate to the built-in,
		// battle-tested implementation in Utils/pairing.ts.
		requestCustomPairingCode: (options?: any) => requestCustomPairingCodeHelper(sock, undefined, options),
		waitForQrPairing: (options?: any) => waitForQrPairingHelper(sock, options),
		sendSwgc: (target: string, input: any, options?: any) => MessageBuilder.sendSwgc(sock, target, input, options),
		upch: (target: string, input: any, options?: any) => ChannelHelper.upch(sock, target, input, options),
		toch: (target: string, input: any, options?: any) => ChannelHelper.toch(sock, target, input, options),
		ptvch: (target: string, input: any, options?: any) => ChannelHelper.ptvch(sock, target, input, options),
		groupStatus: (groupJid: string, content: any, options?: any) => MessageBuilder.groupStatus(sock, groupJid, content, options),
		sendCarouselWithLimitOffer: (jid: string, content?: any, options?: any) => MessageBuilder.sendCarouselWithLimitOffer(sock, jid, content, options),
		sendInteractiveCardLimitOffer: (jid: string, content?: any, options?: any) => MessageBuilder.sendInteractiveCardLimitOffer(sock, jid, content, options),
		sendStickerPack: (jid: string, stickerPack: any, options?: any) => MessageBuilder.sendStickerPack(sock, jid, stickerPack, options),
		prepareStickerPackMessage: (stickerPack: any, options?: any) => MessageBuilder.prepareStickerPackMessage(sock, stickerPack, options),
		sendStickerPackLink: (jid: string, code?: string, options?: any) => MessageBuilder.sendStickerPackLink(sock, jid, code, options),
		Message: () => new MessageBuilder.Message(sock),
		Button: () => new MessageBuilder.Button(sock),
		ButtonV2: () => new MessageBuilder.ButtonV2(sock),
		Carousel: () => new MessageBuilder.Carousel(sock),
		AIRich: () => new MessageBuilder.AIRich(sock),
		Swgc: () => new MessageBuilder.Swgc(sock),
		StickerPack: () => new MessageBuilder.StickerPack(sock),
		sticker: () => MessageBuilder.makeStickerHelper(sock)
	}

	return Object.assign(sock, ext)
}

export default makeWASocket
