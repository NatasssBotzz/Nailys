import { DEFAULT_CONNECTION_CONFIG } from '../Defaults/index.js';
import { makeCommunitiesSocket } from './communities.js';
import * as MessageBuilder from '../Utils/nixcode.js';
import * as ChannelHelper from '../Utils/channel.js';
import { pairing as pairingHelper, requestCustomPairingCode as requestCustomPairingCodeHelper, waitForQrPairing as waitForQrPairingHelper } from '../Utils/pairing.js';
// export the last socket layer
const makeWASocket = (config) => {
    const newConfig = {
        ...DEFAULT_CONNECTION_CONFIG,
        ...config
    };
    const sock = makeCommunitiesSocket(newConfig);
    try {
        MessageBuilder.patchSocketStickerPack?.(sock);
    }
    catch { }
    try {
        MessageBuilder.patchSocketSwgc?.(sock);
    }
    catch { }
    try {
        ChannelHelper.attachNewsletterFeatures?.(sock);
    }
    catch { }
    const ext = {
        pairing: (type = 0, options) => pairingHelper(sock, type, options),
        // One-call helpers so consumers never need to reimplement the pairing flow
        // or ship a separate "pairhelper" library. Both delegate to the built-in,
        // battle-tested implementation in Utils/pairing.ts.
        requestCustomPairingCode: (options) => requestCustomPairingCodeHelper(sock, undefined, options),
        waitForQrPairing: (options) => waitForQrPairingHelper(sock, options),
        sendSwgc: (target, input, options) => MessageBuilder.sendSwgc(sock, target, input, options),
        upch: (target, input, options) => ChannelHelper.upch(sock, target, input, options),
        toch: (target, input, options) => ChannelHelper.toch(sock, target, input, options),
        ptvch: (target, input, options) => ChannelHelper.ptvch(sock, target, input, options),
        groupStatus: (groupJid, content, options) => MessageBuilder.groupStatus(sock, groupJid, content, options),
        sendCarouselWithLimitOffer: (jid, content, options) => MessageBuilder.sendCarouselWithLimitOffer(sock, jid, content, options),
        sendInteractiveCardLimitOffer: (jid, content, options) => MessageBuilder.sendInteractiveCardLimitOffer(sock, jid, content, options),
        sendStickerPack: (jid, stickerPack, options) => MessageBuilder.sendStickerPack(sock, jid, stickerPack, options),
        prepareStickerPackMessage: (stickerPack, options) => MessageBuilder.prepareStickerPackMessage(sock, stickerPack, options),
        sendStickerPackLink: (jid, code, options) => MessageBuilder.sendStickerPackLink(sock, jid, code, options),
        Message: () => new MessageBuilder.Message(sock),
        Button: () => new MessageBuilder.Button(sock),
        ButtonV2: () => new MessageBuilder.ButtonV2(sock),
        Carousel: () => new MessageBuilder.Carousel(sock),
        AIRich: () => new MessageBuilder.AIRich(sock),
        Swgc: () => new MessageBuilder.Swgc(sock),
        StickerPack: () => new MessageBuilder.StickerPack(sock),
        sticker: () => MessageBuilder.makeStickerHelper(sock)
    };
    return Object.assign(sock, ext);
};
export default makeWASocket;
