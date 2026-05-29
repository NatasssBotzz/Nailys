import { DEFAULT_CONNECTION_CONFIG } from '../Defaults'
import type { UserFacingSocketConfig } from '../Types'
import { makeCommunitiesSocket } from './communities'
import * as MessageBuilder from '../Utils/nixcode'

// export the last socket layer
const makeWASocket = (config: UserFacingSocketConfig) => {
	const newConfig = {
		...DEFAULT_CONNECTION_CONFIG,
		...config
	}

	const sock = makeCommunitiesSocket(newConfig)

	const ext = {
		sendSwgc: (target: string, input: any, options?: any) => MessageBuilder.sendSwgc(sock, target, input, options),
		upch: (target: string, input: any, options?: any) => MessageBuilder.upch(sock, target, input, options),
		groupStatus: (groupJid: string, content: any, options?: any) => MessageBuilder.groupStatus(sock, groupJid, content, options),
		sendCarouselWithLimitOffer: (jid: string, options?: any) => MessageBuilder.sendCarouselWithLimitOffer(sock, jid, options),
		Button: () => new MessageBuilder.Button(sock),
		ButtonV2: () => new MessageBuilder.ButtonV2(sock),
		Carousel: () => new MessageBuilder.Carousel(sock),
		AIRich: () => new MessageBuilder.AIRich(sock),
		Swgc: () => new MessageBuilder.Swgc(sock)
	}

	return Object.assign(sock, ext)
}

export default makeWASocket
