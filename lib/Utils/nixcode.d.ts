declare const VERSION = "4.4";
declare const NIXCODE_VERSION = "4.4";
import { proto } from '../../WAProto/index.js';
declare function sendButtons(sock: any, toJid: any, content?: {}, options?: {}): Promise<import("../index.js").WAMessage>;
declare function patchBaileysForSwgc(): boolean;
declare function getBodyText(m?: {}): any;
declare function createStatusPayloadFromInput(m: any, text?: string): Promise<{
    type: string;
    buffer: Buffer<ArrayBuffer>;
    caption: string;
    mimetype?: undefined;
    seconds?: undefined;
    ptt?: undefined;
    text?: undefined;
} | {
    type: string;
    buffer: Buffer<ArrayBuffer>;
    caption: string;
    mimetype: any;
    seconds: any;
    ptt?: undefined;
    text?: undefined;
} | {
    type: string;
    buffer: Buffer<ArrayBuffer>;
    mimetype: any;
    seconds: any;
    ptt: boolean;
    caption?: undefined;
    text?: undefined;
} | {
    type: string;
    text: string;
    buffer?: undefined;
    caption?: undefined;
    mimetype?: undefined;
    seconds?: undefined;
    ptt?: undefined;
} | null>;
declare function payloadToStatusContent(payload: any, config?: {}): {
    text: any;
    backgroundColor: any;
    image?: undefined;
    caption?: undefined;
    video?: undefined;
    mimetype?: undefined;
    audio?: undefined;
    seconds?: undefined;
    ptt?: undefined;
} | {
    image: any;
    caption: any;
    text?: undefined;
    backgroundColor?: undefined;
    video?: undefined;
    mimetype?: undefined;
    audio?: undefined;
    seconds?: undefined;
    ptt?: undefined;
} | {
    video: any;
    caption: any;
    mimetype: any;
    text?: undefined;
    backgroundColor?: undefined;
    image?: undefined;
    audio?: undefined;
    seconds?: undefined;
    ptt?: undefined;
} | {
    audio: any;
    mimetype: any;
    seconds: any;
    ptt: any;
    text?: undefined;
    backgroundColor?: undefined;
    image?: undefined;
    caption?: undefined;
    video?: undefined;
} | null;
declare function hasGroupStatusEnvelope(message?: {}): boolean;
declare function notifySwgcEcho(sock: any, msg?: {}): boolean;
declare function waitForSwgcEcho(sock: any, groupJid: any, messageId: any, timeoutMs?: number): Promise<unknown>;
declare function groupStatus(sock: any, jid: any, content: any, options?: {}): Promise<import("../index.js").WAMessage>;
declare function sendPayloadToGroupStatus(sock: any, targetJid: any, payload: any, config?: {}): Promise<import("../index.js").WAMessage>;
declare function buildGroupList(sock: any): Promise<{
    id: any;
    subject: any;
}[]>;
declare function makeGroupListText(groups?: never[], limit?: number): string;
declare function resolveGroupTarget(sock: any, input?: string, groups?: never[]): Promise<any>;
declare function splitTargetAndContent(text?: string): {
    targetText: string;
    contentText: string;
};
declare function isGroupAdmin(groupMetadata?: {}, senderJid?: string): any;
declare function sendSwgc(sock: any, targetJid: any, input: any, options?: {}): Promise<import("../index.js").WAMessage>;
declare function patchSocketSwgc(sock: any): any;
declare class Swgc {
    #private;
    constructor(client: any);
    target(jid?: string): this;
    setTarget(jid?: string): this;
    text(value?: string): this;
    media(buffer: any, type?: string, options?: {}): this;
    image(buffer: any, caption?: string): this;
    video(buffer: any, caption?: string): this;
    audio(buffer: any, options?: {}): this;
    fromInput(msg: any, text?: string): Promise<this>;
    swgc(input: any, targetJid?: string, options?: {}): this;
    send(targetJid?: string, options?: {}): Promise<import("../index.js").WAMessage>;
}
declare class BaseBuilder {
    constructor();
    setTitle(title: any): this;
    setSubtitle(subtitle: any): this;
    setBody(body: any): this;
    setFooter(footer: any): this;
    setContextInfo(obj: any): this;
    addPayload(obj: any): this;
    static resize(buffer: any, x: any, y: any, fit?: string): Promise<any>;
    static fetchBuffer(url: any, options?: {}, config?: {}): Promise<Buffer<ArrayBuffer>>;
}
declare function buildBookingConfirmationParams(input?: {}): {
    start_datetime: string;
    end_datetime: string;
    location: string;
    booking_url: string;
    phone_number: string;
    booking_management_url: string;
    description: string;
    email: string;
    display_text: string;
    display_content: {
        display_language: string;
        display_meeting_type: string;
        display_bottom_sheet_header: string;
        display_add_to_calendar_cta_text: string;
        display_view_on_maps_cta_text: string;
        display_manage_booking_cta_text: string;
        display_manage_booking_not_supported_text: string;
        display_read_more: string;
    };
};
declare class Button extends BaseBuilder {
    #private;
    constructor(client: any);
    setVideo(path: any, options?: {}): this;
    setImage(path: any, options?: {}): this;
    setDocument(path: any, options?: {}): this;
    addHeader(type?: string, options?: {}): this;
    addheader(type?: string, options?: {}): this;
    setMedia(obj: any): this;
    clearButtons(): this;
    setParams(obj?: {}): this;
    setLimitedOffer(input?: {}): this;
    clearLimitedOffer(): this;
    addButton(name: any, params?: {}): this;
    addbutton(name: any, params?: {}): this;
    addBookingConfirmation(params?: {}): this;
    addBooking(params?: {}): this;
    makeRow(header?: string, title?: string, description?: string, id?: string): this;
    makeSection(title?: string, highlight_label?: string): this;
    makeSections(title?: string, highlight_label?: string): this;
    addSelection(title: any, options?: {}): this;
    addReply(display_text?: string, id?: string, options?: {}): this;
    addCall(display_text?: string, id?: string, options?: {}): this;
    addReminder(display_text?: string, id?: string, options?: {}): this;
    addCancelReminder(display_text?: string, id?: string, options?: {}): this;
    addAddress(display_text?: string, id?: string, options?: {}): this;
    addLocation(options?: {}): this;
    addUrl(display_text?: string, url?: string, webview_interaction?: boolean, options?: {}): this;
    addCopy(display_text?: string, copy_code?: string, options?: {}): this;
    static paramsList: {
        limited_time_offer: {
            text: string;
            url: string;
            copy_code: string;
            expiration_time: string;
        };
        bottom_sheet: {
            in_thread_buttons_limit: string;
            divider_indices: string[];
            list_title: string;
            button_title: string;
        };
        tap_target_configuration: {
            title: string;
            description: string;
            canonical_url: string;
            domain: string;
            buttonIndex: string;
        };
    };
    toCard(): Promise<{
        body: {
            text: any;
        };
        footer: {
            text: any;
        };
        header: any;
        nativeFlowMessage: {
            messageParamsJson: string;
            buttons: any;
        };
    }>;
    build(jid: any, { ...options }?: {}): Promise<import("../index.js").WAMessage>;
    send(jid: any, { ...options }?: {}): Promise<import("../index.js").WAMessage>;
}
declare class ButtonV2 extends BaseBuilder {
    #private;
    constructor(client: any);
    addButton(displayText?: string, buttonId?: `${string}-${string}-${string}-${string}-${string}`, options?: {}): this;
    addRawButton(obj: any): this;
    setParams(obj?: {}): this;
    addNativeButton(name: any, params?: {}): this;
    addNativeReply(display_text?: string, id?: `${string}-${string}-${string}-${string}-${string}`): this;
    addUrl(display_text?: string, url?: string, webview_interaction?: boolean): this;
    addCopy(display_text?: string, copy_code?: string, id?: `${string}-${string}-${string}-${string}-${string}`): this;
    addCall(display_text?: string, id?: `${string}-${string}-${string}-${string}-${string}`): this;
    addLocation(display_text?: string, id?: `${string}-${string}-${string}-${string}-${string}`): this;
    addSelection(title?: string, sections?: never[], id?: `${string}-${string}-${string}-${string}-${string}`, displayText?: string): this;
    addBottomSheet(displayText?: string, title?: string, sections?: never[], id?: `${string}-${string}-${string}-${string}-${string}`): this;
    setThumbnail(path: any): this;
    setLocationMessage(obj?: {}): this;
    setMedia(obj: any): this;
    buildNative(jid: any, { ...options }?: {}): Promise<import("../index.js").WAMessage>;
    buildOld(jid: any, { ...options }?: {}): Promise<import("../index.js").WAMessage>;
    build(jid: any, { ...options }?: {}): Promise<import("../index.js").WAMessage>;
    send(jid: any, { ...options }?: {}): Promise<import("../index.js").WAMessage>;
}
declare function normalizeLimitOfferInput(input?: {}): {
    text: any;
    url: any;
    copy_code: any;
    expiresAt: any;
    thumbnailUrl: any;
    noExpiration: boolean;
} | null;
declare function buildLimitedOfferParam(input?: {}): {
    text: any;
    url: any;
    copy_code: any;
} | null;
declare class Carousel extends BaseBuilder {
    #private;
    constructor(client: any);
    addCard(card: any): this;
    build(jid: any, { ...options }?: {}): import("../index.js").WAMessage;
    send(jid: any, { ...options }?: {}): Promise<import("../index.js").WAMessage>;
}
declare function sendCarouselWithLimitOffer(sock: any, jid: any, content?: {}, options?: {}): Promise<import("../index.js").WAMessage>;
declare const sendInteractiveCardLimitOffer: typeof sendCarouselWithLimitOffer;
declare class AIRich {
    #private;
    constructor(client: any);
    setTitle(title: any): this;
    addText(text: any, { hyperlink, citation, latex }?: {
        hyperlink?: boolean | undefined;
        citation?: boolean | undefined;
        latex?: boolean | undefined;
    }): this;
    addLatex(text: any, items?: never[]): this;
    addCode(language: any, code: any): this;
    addTable(table: any): this;
    addSource(sources?: never[]): this;
    addReels(reelsItems?: never[]): this;
    addImage(imageUrl: any): this;
    build({ forwarded, includesUnifiedResponse, ...options }?: {
        forwarded?: boolean | undefined;
        includesUnifiedResponse?: boolean | undefined;
    }): {
        messageContextInfo: {
            deviceListMetadata: {};
            deviceListMetadataVersion: number;
            botMetadata: {
                messageDisclaimerText: any;
                richResponseSourcesMetadata: {
                    sources: any;
                };
            };
        };
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: number;
                    submessages: any;
                    unifiedResponse: {
                        data: string;
                    };
                    contextInfo: {
                        forwardingScore: number;
                        isForwarded: boolean;
                        forwardedAiBotMessageInfo: {
                            botJid: string;
                        };
                        forwardOrigin: number;
                    } | {
                        forwardingScore?: undefined;
                        isForwarded?: undefined;
                        forwardedAiBotMessageInfo?: undefined;
                        forwardOrigin?: undefined;
                    };
                };
            };
        };
    };
    send(jid: any, { forwarded, includesUnifiedResponse, ...options }?: {}): Promise<any>;
    static tokenizer(code: any, lang?: string): {
        codeBlock: any[];
        unified_codeBlock: {
            content: any;
            type: any;
        }[];
    };
    static toTableMetadata(arr: any): {
        title: string;
        rows: {
            isHeading?: boolean | undefined;
            items: any[];
        }[];
        unified_rows: {
            is_header: boolean;
            cells: any[];
        }[];
    };
}
declare function patchBaileysStickerPackMediaRc13_FORCE(): {
    ok: boolean;
    reason: string;
    tried: {
        target: string;
        err: string;
    }[] | undefined;
    root?: undefined;
    used?: undefined;
    results?: undefined;
} | {
    ok: boolean;
    reason: string;
    root: string;
    used: string;
    tried?: undefined;
    results?: undefined;
} | {
    ok: boolean;
    used: string;
    root: string;
    results: ({
        file: string;
        ok: boolean;
        reason: string;
        changed?: undefined;
        alreadyPatched?: undefined;
    } | {
        file: string;
        ok: boolean;
        changed: boolean;
        alreadyPatched: boolean;
        reason?: undefined;
    })[];
    reason?: undefined;
    tried?: undefined;
};
declare function autoPatchBaileysStickerPackMediaRc13_FORCE(): {
    ok: boolean;
    reason: string;
    tried: {
        target: string;
        err: string;
    }[] | undefined;
    root?: undefined;
    used?: undefined;
    results?: undefined;
} | {
    ok: boolean;
    reason: string;
    root: string;
    used: string;
    tried?: undefined;
    results?: undefined;
} | {
    ok: boolean;
    used: string;
    root: string;
    results: ({
        file: string;
        ok: boolean;
        reason: string;
        changed?: undefined;
        alreadyPatched?: undefined;
    } | {
        file: string;
        ok: boolean;
        changed: boolean;
        alreadyPatched: boolean;
        reason?: undefined;
    })[];
    reason?: undefined;
    tried?: undefined;
} | {
    ok: boolean;
    skipped: boolean;
    reason: string;
} | {
    ok: boolean;
    reason: string;
    skipped?: undefined;
};
declare function imageToWebp(buffer: any): Promise<NonSharedBuffer>;
declare function videoToWebp(buffer: any): Promise<NonSharedBuffer>;
declare function writeExif(webpBuffer: any, wm?: {}, extra?: {}): Promise<any>;
declare function writeExifImg(buffer: any, wm?: {}, extra?: {}): Promise<any>;
declare function writeExifVid(buffer: any, wm?: {}, extra?: {}): Promise<any>;
declare function getStickerTriggerFromMessage(m: any): Promise<string>;
declare function setStickerTrigger(webpBuffer: any, trigger: any, wm?: {}): Promise<any>;
declare function updateStickerWmOnly(webpBuffer: any, wm?: {}): Promise<any>;
declare function detectAlbumMessage(target: any): boolean;
declare function isAlbumReply(m: any): boolean;
declare function getAlbumKeyInfo(m: any): {
    stanzaId: any;
    participant: any;
    remoteJid: any;
} | null;
declare function prepareStickerPackMessage(arg1: any, arg2?: {}, arg3?: {}): Promise<{
    isBatched: boolean;
    stickerPackMessage: proto.Message.StickerPackMessage;
    meta: {
        stickerPackId: any;
        zipBuffer: unknown;
        trayThumb: {
            buffer: any;
            width: number;
            height: number;
        };
        entries: {
            index: number;
            buffer: Buffer<any>;
            fileName: string;
            isAnimated: boolean;
            isLottie: boolean;
            mimetype: string;
            emojis: string[];
            accessibilityLabel: string;
        }[];
        uploadedPack: {
            url: any;
            directPath: any;
            handle: any;
            mediaKey: NonSharedBuffer;
            fileEncSha256: NonSharedBuffer;
            fileSha256: NonSharedBuffer;
            fileLength: number;
            fileName: string;
            mediaKeyTimestamp: number;
        };
        uploadedThumb: any;
    };
} | {
    isBatched: boolean;
    stickerPackMessage: proto.Message.StickerPackMessage[];
    meta: {
        stickerPackId: any;
        zipBuffer: unknown;
        trayThumb: {
            buffer: any;
            width: number;
            height: number;
        };
        entries: {
            index: number;
            buffer: Buffer<any>;
            fileName: string;
            isAnimated: boolean;
            isLottie: boolean;
            mimetype: string;
            emojis: string[];
            accessibilityLabel: string;
        }[];
        uploadedPack: {
            url: any;
            directPath: any;
            handle: any;
            mediaKey: NonSharedBuffer;
            fileEncSha256: NonSharedBuffer;
            fileSha256: NonSharedBuffer;
            fileLength: number;
            fileName: string;
            mediaKeyTimestamp: number;
        };
        uploadedThumb: any;
    }[];
}>;
declare function sendStickerPack(sock: any, jid: any, stickerPack: any, options?: {}): Promise<import("../index.js").WAMessage | null>;
declare function patchSocketStickerPack(sock: any): any;
declare function makeStickerHelper(sock: any): {
    send: (jid: any, stickerPack: any, options?: {}) => Promise<import("../index.js").WAMessage | null>;
    prepare: (stickerPack: any, options?: {}) => Promise<{
        isBatched: boolean;
        stickerPackMessage: proto.Message.StickerPackMessage;
        meta: {
            stickerPackId: any;
            zipBuffer: unknown;
            trayThumb: {
                buffer: any;
                width: number;
                height: number;
            };
            entries: {
                index: number;
                buffer: Buffer<any>;
                fileName: string;
                isAnimated: boolean;
                isLottie: boolean;
                mimetype: string;
                emojis: string[];
                accessibilityLabel: string;
            }[];
            uploadedPack: {
                url: any;
                directPath: any;
                handle: any;
                mediaKey: NonSharedBuffer;
                fileEncSha256: NonSharedBuffer;
                fileSha256: NonSharedBuffer;
                fileLength: number;
                fileName: string;
                mediaKeyTimestamp: number;
            };
            uploadedThumb: any;
        };
    } | {
        isBatched: boolean;
        stickerPackMessage: proto.Message.StickerPackMessage[];
        meta: {
            stickerPackId: any;
            zipBuffer: unknown;
            trayThumb: {
                buffer: any;
                width: number;
                height: number;
            };
            entries: {
                index: number;
                buffer: Buffer<any>;
                fileName: string;
                isAnimated: boolean;
                isLottie: boolean;
                mimetype: string;
                emojis: string[];
                accessibilityLabel: string;
            }[];
            uploadedPack: {
                url: any;
                directPath: any;
                handle: any;
                mediaKey: NonSharedBuffer;
                fileEncSha256: NonSharedBuffer;
                fileSha256: NonSharedBuffer;
                fileLength: number;
                fileName: string;
                mediaKeyTimestamp: number;
            };
            uploadedThumb: any;
        }[];
    }>;
    patch: () => any;
    normalizeInput: (input: any) => any;
};
declare function sendStickerPackLink(sock: any, jid: any, code?: string, options?: {}): Promise<{
    extendedTextMessage: {
        text: string;
        matchedText: string;
        title: any;
        description: any;
        previewType: string;
        jpegThumbnail: any;
        inviteLinkGroupTypeV2: string;
    };
}>;
declare class StickerPack extends BaseBuilder {
    #private;
    constructor(client: any);
    setPackName(name?: string): this;
    setPackname(name?: string): this;
    setName(name?: string): this;
    setAuthor(author?: string): this;
    setPublisher(author?: string): this;
    setDescription(description?: string): this;
    setCaption(caption?: string): this;
    setCover(cover?: null): this;
    setThumbnail(thumbnail?: null): this;
    addSticker(input: any, options?: {}): this;
    addStickers(stickers?: never[]): this;
    setStickers(stickers?: never[]): this;
    addImage(input: any, options?: {}): this;
    addVideo(input: any, options?: {}): this;
    addAnimated(input: any, options?: {}): this;
    setOrigin(value?: number): this;
    toJSON(): any;
    prepare(options?: {}): Promise<{
        isBatched: boolean;
        stickerPackMessage: proto.Message.StickerPackMessage;
        meta: {
            stickerPackId: any;
            zipBuffer: unknown;
            trayThumb: {
                buffer: any;
                width: number;
                height: number;
            };
            entries: {
                index: number;
                buffer: Buffer<any>;
                fileName: string;
                isAnimated: boolean;
                isLottie: boolean;
                mimetype: string;
                emojis: string[];
                accessibilityLabel: string;
            }[];
            uploadedPack: {
                url: any;
                directPath: any;
                handle: any;
                mediaKey: NonSharedBuffer;
                fileEncSha256: NonSharedBuffer;
                fileSha256: NonSharedBuffer;
                fileLength: number;
                fileName: string;
                mediaKeyTimestamp: number;
            };
            uploadedThumb: any;
        };
    } | {
        isBatched: boolean;
        stickerPackMessage: proto.Message.StickerPackMessage[];
        meta: {
            stickerPackId: any;
            zipBuffer: unknown;
            trayThumb: {
                buffer: any;
                width: number;
                height: number;
            };
            entries: {
                index: number;
                buffer: Buffer<any>;
                fileName: string;
                isAnimated: boolean;
                isLottie: boolean;
                mimetype: string;
                emojis: string[];
                accessibilityLabel: string;
            }[];
            uploadedPack: {
                url: any;
                directPath: any;
                handle: any;
                mediaKey: NonSharedBuffer;
                fileEncSha256: NonSharedBuffer;
                fileSha256: NonSharedBuffer;
                fileLength: number;
                fileName: string;
                mediaKeyTimestamp: number;
            };
            uploadedThumb: any;
        }[];
    }>;
    send(jid: any, options?: {}): Promise<import("../index.js").WAMessage | null>;
}
declare const Message: typeof Button;
declare const NativeButton: typeof Button;
export { VERSION, NIXCODE_VERSION, Message, NativeButton, Button, ButtonV2, Carousel, AIRich, sendButtons, StickerPack, imageToWebp, videoToWebp, writeExif, writeExifImg, writeExifVid, getStickerTriggerFromMessage, setStickerTrigger, updateStickerWmOnly, detectAlbumMessage, isAlbumReply, getAlbumKeyInfo, prepareStickerPackMessage, sendStickerPack, patchSocketStickerPack, makeStickerHelper, sendStickerPackLink, patchBaileysStickerPackMediaRc13_FORCE, autoPatchBaileysStickerPackMediaRc13_FORCE, Swgc, patchBaileysForSwgc, patchSocketSwgc, sendSwgc, createStatusPayloadFromInput, payloadToStatusContent, sendPayloadToGroupStatus, groupStatus, notifySwgcEcho, waitForSwgcEcho, hasGroupStatusEnvelope, buildGroupList, makeGroupListText, resolveGroupTarget, splitTargetAndContent, isGroupAdmin, getBodyText, normalizeLimitOfferInput, buildLimitedOfferParam, sendCarouselWithLimitOffer, sendInteractiveCardLimitOffer, buildBookingConfirmationParams };
