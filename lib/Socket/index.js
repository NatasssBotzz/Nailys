import { DEFAULT_CONNECTION_CONFIG } from '../Defaults/index.js';
import { makeCommunitiesSocket } from './communities.js';
import * as MessageBuilder from '../Utils/nixcode.js';
// export the last socket layer
const makeWASocket = (config) => {
    const newConfig = {
        ...DEFAULT_CONNECTION_CONFIG,
        ...config
    };
    const sock = makeCommunitiesSocket(newConfig);
    const ext = {
        sendSwgc: (target, input, options) => MessageBuilder.sendSwgc(sock, target, input, options),
        upch: (target, input, options) => MessageBuilder.upch(sock, target, input, options),
        groupStatus: (groupJid, content, options) => MessageBuilder.groupStatus(sock, groupJid, content, options),
        sendCarouselWithLimitOffer: (jid, options) => MessageBuilder.sendCarouselWithLimitOffer(sock, jid, options),
        Button: () => new MessageBuilder.Button(sock),
        ButtonV2: () => new MessageBuilder.ButtonV2(sock),
        Carousel: () => new MessageBuilder.Carousel(sock),
        AIRich: () => new MessageBuilder.AIRich(sock),
        Swgc: () => new MessageBuilder.Swgc(sock)
    };
    return Object.assign(sock, ext);
};
export default makeWASocket;
//# sourceMappingURL=index.js.map