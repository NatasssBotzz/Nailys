export declare const DEFAULT_CUSTOM_PAIRING_CODE = "NATASSBZ";
export declare function onlyNumber(value?: string): string;
export declare function normalizePhoneNumber(number?: string): string;
export declare function normalizeCustomPairingCode(code?: string, length?: number): string | null;
export declare function formatPairingCode(code?: string): string;
export declare function patchPairing(sock: any): any;
export declare function patch_proto(): void;
export declare const COLORS: Record<string, number>;
export declare function resolveColor(input: any): number | null;
export declare function resolveFont(input: any): number;
export declare function notifySwgcEcho(sock: any, msg?: any): boolean;
export declare function waitForSwgcEcho(sock: any, groupJid: string, messageId: string, timeoutMs?: number): Promise<unknown>;
export declare const resolve_audience: (audience: any) => {
    listEmoji?: any;
    listName?: any;
    audienceType: number;
} | undefined;
export declare function createStatusPayloadFromInput(m: any, text?: string): Promise<any>;
export declare function payloadToStatusContent(p: any, opt?: any): {
    extendedTextMessage: {
        text: any;
        textArgb: any;
        backgroundArgb: any;
        font: any;
        previewType: number;
        contextInfo: {
            forwardingScore: number;
            featureEligibilities: {
                canBeReshared: boolean;
                canReceiveMultiReact: boolean;
            };
            statusSourceType: number;
            statusAttributions: {
                type: number;
            }[];
            statusAudienceMetadata: {
                listEmoji?: any;
                listName?: any;
                audienceType: number;
            };
        };
        inviteLinkGroupTypeV2: number;
    };
    text?: undefined;
    backgroundColor?: undefined;
    contextInfo?: undefined;
    caption?: undefined;
    mimetype?: undefined;
    seconds?: undefined;
    ptt?: undefined;
} | {
    text: any;
    backgroundColor: any;
    contextInfo: {
        forwardingScore: number;
        featureEligibilities: {
            canBeReshared: boolean;
            canReceiveMultiReact: boolean;
        };
        statusSourceType: number;
        statusAttributions: {
            type: number;
        }[];
        statusAudienceMetadata: {
            listEmoji?: any;
            listName?: any;
            audienceType: number;
        };
    };
    extendedTextMessage?: undefined;
    caption?: undefined;
    mimetype?: undefined;
    seconds?: undefined;
    ptt?: undefined;
} | {
    [p.type]: any;
    caption: any;
    mimetype: any;
    seconds: any;
    ptt: any;
    contextInfo: {
        forwardingScore: number;
        featureEligibilities: {
            canBeReshared: boolean;
            canReceiveMultiReact: boolean;
        };
        statusSourceType: number;
        statusAttributions: {
            type: number;
        }[];
        statusAudienceMetadata: {
            listEmoji?: any;
            listName?: any;
            audienceType: number;
        };
    };
    extendedTextMessage?: undefined;
    text?: undefined;
    backgroundColor?: undefined;
} | null;
export declare function groupStatus(sock: any, jid: string, content: any, options?: any): Promise<import("./index.js").WAMessage>;
export declare function sendSwgc(sock: any, jid: string, input: any, opt?: any): Promise<import("./index.js").WAMessage>;
export declare function patchSwgc(sock: any): any;
export declare class SwgcBuilder {
    sock: any;
    jid: string;
    payload: any;
    options: any;
    constructor(sock: any, jid: string);
    text(txt: string): this;
    color(c: any): this;
    bgcolor(c: any): this;
    font(f: any): this;
    audience(type: any, name?: string, emoji?: string): this;
    image(buffer: Buffer, mimetype?: string): this;
    video(buffer: Buffer, mimetype?: string, options?: any): this;
    caption(txt: string): this;
    setOptions(opt: any): this;
    send(): Promise<import("./index.js").WAMessage>;
}
export declare function patchLidToPn(sock: any, _options?: any): any;
export declare function imageToWebp(buffer: Buffer): Promise<Buffer>;
export declare function videoToWebp(buffer: Buffer): Promise<Buffer>;
export declare function buildStickerExif(metadata: any): Buffer;
export declare function readWebpExifJson(webpBuffer: Buffer): Promise<any | null>;
export declare function writeExif(webpBuffer: Buffer, wm?: any, extra?: any): Promise<Buffer>;
export declare function writeExifImg(buffer: Buffer, wm?: any, extra?: any): Promise<Buffer>;
export declare function writeExifVid(buffer: Buffer, wm?: any, extra?: any): Promise<Buffer>;
export declare function getStickerTriggerFromMessage(m: any): Promise<string>;
export declare function setStickerTrigger(webpBuffer: Buffer, trigger: string, wm?: any): Promise<Buffer>;
export declare function updateStickerWmOnly(webpBuffer: Buffer, wm?: any): Promise<Buffer>;
export declare function detectAlbumMessage(target: any): boolean;
export declare function isAlbumReply(m: any): boolean;
export declare function getAlbumKeyInfo(m: any): any | null;
export declare function resolveMediaToBuffer(media: any): Promise<Buffer>;
export declare function prepareStickerPackMessage(arg1: any, arg2?: any, arg3?: any): Promise<any>;
export declare function patchSocketStickerPack(sock: any): any;
export declare function downloadStickerBuffer(stickerMessage: any): Promise<Buffer>;
export declare const NEWSLETTER_QUERY_IDS: {
    JOB_MUTATION: string;
    METADATA: string;
    UNFOLLOW: string;
    FOLLOW: string;
    UNMUTE: string;
    MUTE: string;
    CREATE: string;
    ADMIN_COUNT: string;
    CHANGE_OWNER: string;
    DELETE: string;
    DEMOTE: string;
};
export declare function createNewsletterContentFromInput(m: any, text?: string): Promise<{
    type: string;
    buffer: Buffer<ArrayBufferLike>;
    ptt: boolean;
    mimetype: string;
    seconds: number | undefined;
    caption?: undefined;
} | {
    type: string;
    buffer: Buffer<ArrayBufferLike>;
    caption: any;
    ptt?: undefined;
    mimetype?: undefined;
    seconds?: undefined;
} | {
    type: string;
    buffer: Buffer<ArrayBufferLike>;
    caption: any;
    mimetype: any;
    seconds: any;
    ptt?: undefined;
} | {
    type: string;
    buffer: Buffer<ArrayBufferLike>;
    mimetype: string;
    ptt?: undefined;
    seconds?: undefined;
    caption?: undefined;
} | {
    type: string;
    text: string;
} | null>;
export declare function normalizeNewsletterJid(id: any): string;
export declare function makeNewsletterHelper(sock: any): {
    newsletterWMexQuery: (newsletterId: string | undefined, queryId: string, variables?: any) => Promise<any>;
    newsletterMetadata: (type: string, key: string, role?: string) => Promise<any>;
    sendNewsletterMessage: (jid: string, content: any, options?: any) => Promise<{
        ok: boolean;
        jid: string;
        type: string;
        mode: string;
        key: any;
        message: any;
        result: any;
    } | {
        ok: boolean;
        jid: string;
        type: any;
        mode: string;
        key: {
            id: any;
            remoteJid: string;
        };
        message: any;
        result: {
            key: {
                id: any;
                remoteJid: string;
            };
            message: any;
        };
        audioInfo?: undefined;
    }>;
    sendNewsletterText: (jid: string, text: string, options?: any) => Promise<{
        ok: boolean;
        jid: string;
        type: string;
        mode: string;
        key: any;
        message: any;
        result: any;
    }>;
    sendNewsletterMediaPayload: (jid: string, payload: any, options?: any) => Promise<{
        ok: boolean;
        jid: string;
        type: string;
        mode: string;
        key: any;
        message: any;
        result: any;
    } | {
        ok: boolean;
        jid: string;
        type: string;
        mode: string;
        key: {
            id: any;
            remoteJid: string;
        };
        message: any;
        result: {
            key: {
                id: any;
                remoteJid: string;
            };
            message: any;
        };
        audioInfo: {
            mimetype: any;
            ptt: boolean;
            seconds: any;
            bytes: any;
            directPath: string;
            mediaUrl: string;
            mediaKey: string;
            fileEncSha256: string;
            upchMode: any;
        };
    } | {
        ok: boolean;
        jid: string;
        type: any;
        mode: string;
        key: {
            id: any;
            remoteJid: string;
        };
        message: any;
        result: {
            key: {
                id: any;
                remoteJid: string;
            };
            message: any;
        };
        audioInfo?: undefined;
    }>;
    relayNewsletterMessage: (jid: string, message: any, options?: any) => Promise<{
        key: {
            id: any;
            remoteJid: string;
        };
        message: any;
    }>;
    normalizeNewsletterJid: typeof normalizeNewsletterJid;
    upch: {
        target: (jid: string) => {
            text: (text: string) => {
                send: (opts: any) => Promise<{
                    ok: boolean;
                    jid: string;
                    type: string;
                    mode: string;
                    key: any;
                    message: any;
                    result: any;
                }>;
            };
            image: (image: any, caption?: string) => {
                send: (opts: any) => Promise<{
                    ok: boolean;
                    jid: string;
                    type: string;
                    mode: string;
                    key: any;
                    message: any;
                    result: any;
                } | {
                    ok: boolean;
                    jid: string;
                    type: any;
                    mode: string;
                    key: {
                        id: any;
                        remoteJid: string;
                    };
                    message: any;
                    result: {
                        key: {
                            id: any;
                            remoteJid: string;
                        };
                        message: any;
                    };
                    audioInfo?: undefined;
                }>;
            };
            video: (video: any, caption?: string) => {
                send: (opts: any) => Promise<{
                    ok: boolean;
                    jid: string;
                    type: string;
                    mode: string;
                    key: any;
                    message: any;
                    result: any;
                } | {
                    ok: boolean;
                    jid: string;
                    type: any;
                    mode: string;
                    key: {
                        id: any;
                        remoteJid: string;
                    };
                    message: any;
                    result: {
                        key: {
                            id: any;
                            remoteJid: string;
                        };
                        message: any;
                    };
                    audioInfo?: undefined;
                }>;
            };
            audio: (audio: any, ptt?: boolean) => {
                send: (opts?: any) => Promise<{
                    ok: boolean;
                    jid: string;
                    type: string;
                    mode: string;
                    key: any;
                    message: any;
                    result: any;
                } | {
                    ok: boolean;
                    jid: string;
                    type: any;
                    mode: string;
                    key: {
                        id: any;
                        remoteJid: string;
                    };
                    message: any;
                    result: {
                        key: {
                            id: any;
                            remoteJid: string;
                        };
                        message: any;
                    };
                    audioInfo?: undefined;
                }>;
            };
            sticker: (sticker: any) => {
                send: (opts: any) => Promise<{
                    ok: boolean;
                    jid: string;
                    type: string;
                    mode: string;
                    key: any;
                    message: any;
                    result: any;
                } | {
                    ok: boolean;
                    jid: string;
                    type: any;
                    mode: string;
                    key: {
                        id: any;
                        remoteJid: string;
                    };
                    message: any;
                    result: {
                        key: {
                            id: any;
                            remoteJid: string;
                        };
                        message: any;
                    };
                    audioInfo?: undefined;
                }>;
            };
            send: (content: any, opts: any) => Promise<{
                ok: boolean;
                jid: string;
                type: string;
                mode: string;
                key: any;
                message: any;
                result: any;
            } | {
                ok: boolean;
                jid: string;
                type: any;
                mode: string;
                key: {
                    id: any;
                    remoteJid: string;
                };
                message: any;
                result: {
                    key: {
                        id: any;
                        remoteJid: string;
                    };
                    message: any;
                };
                audioInfo?: undefined;
            }>;
        };
    };
    toch: {
        target: (jid: string) => {
            text: (text: string) => {
                send: (opts: any) => Promise<{
                    ok: boolean;
                    jid: string;
                    type: string;
                    mode: string;
                    key: any;
                    message: any;
                    result: any;
                }>;
            };
            image: (image: any, caption?: string) => {
                send: (opts: any) => Promise<{
                    ok: boolean;
                    jid: string;
                    type: string;
                    mode: string;
                    key: any;
                    message: any;
                    result: any;
                } | {
                    ok: boolean;
                    jid: string;
                    type: any;
                    mode: string;
                    key: {
                        id: any;
                        remoteJid: string;
                    };
                    message: any;
                    result: {
                        key: {
                            id: any;
                            remoteJid: string;
                        };
                        message: any;
                    };
                    audioInfo?: undefined;
                }>;
            };
            video: (video: any, caption?: string) => {
                send: (opts: any) => Promise<{
                    ok: boolean;
                    jid: string;
                    type: string;
                    mode: string;
                    key: any;
                    message: any;
                    result: any;
                } | {
                    ok: boolean;
                    jid: string;
                    type: any;
                    mode: string;
                    key: {
                        id: any;
                        remoteJid: string;
                    };
                    message: any;
                    result: {
                        key: {
                            id: any;
                            remoteJid: string;
                        };
                        message: any;
                    };
                    audioInfo?: undefined;
                }>;
            };
            audio: (audio: any, ptt?: boolean) => {
                send: (opts?: any) => Promise<{
                    ok: boolean;
                    jid: string;
                    type: string;
                    mode: string;
                    key: any;
                    message: any;
                    result: any;
                } | {
                    ok: boolean;
                    jid: string;
                    type: any;
                    mode: string;
                    key: {
                        id: any;
                        remoteJid: string;
                    };
                    message: any;
                    result: {
                        key: {
                            id: any;
                            remoteJid: string;
                        };
                        message: any;
                    };
                    audioInfo?: undefined;
                }>;
            };
            sticker: (sticker: any) => {
                send: (opts: any) => Promise<{
                    ok: boolean;
                    jid: string;
                    type: string;
                    mode: string;
                    key: any;
                    message: any;
                    result: any;
                } | {
                    ok: boolean;
                    jid: string;
                    type: any;
                    mode: string;
                    key: {
                        id: any;
                        remoteJid: string;
                    };
                    message: any;
                    result: {
                        key: {
                            id: any;
                            remoteJid: string;
                        };
                        message: any;
                    };
                    audioInfo?: undefined;
                }>;
            };
            send: (content: any, opts: any) => Promise<{
                ok: boolean;
                jid: string;
                type: string;
                mode: string;
                key: any;
                message: any;
                result: any;
            } | {
                ok: boolean;
                jid: string;
                type: any;
                mode: string;
                key: {
                    id: any;
                    remoteJid: string;
                };
                message: any;
                result: {
                    key: {
                        id: any;
                        remoteJid: string;
                    };
                    message: any;
                };
                audioInfo?: undefined;
            }>;
        };
    };
};
export declare class UpchBuilder {
    #private;
    constructor(sock: any);
    image(input: any): this;
    video(input: any, opts?: any): this;
    audio(input: any): this;
    caption(text?: string): this;
    ptv(val?: boolean): this;
    sendch(target: any, options?: any): Promise<any>;
    send(jid: string, options?: any): Promise<any>;
}
export declare function createUpchBuilder(sock: any): UpchBuilder;
export declare const patchUpchBuilder: (sock: any) => any;
export declare const patchNewsletter: (sock: any) => any;
declare const VERSION = "4.6";
declare class Toolkit {
    constructor();
    static extractIE(text: string, { extract, hyperlink, citation, latex }?: any): {
        text: string;
        ie: any[];
        inline_entities: any[];
    };
    static resize(buffer: Buffer, x: number, y: number, fit?: string): Promise<Buffer>;
    static waitAllPromises(input: any): Promise<any>;
    static fetchBuffer(url: string, options?: any, { silent }?: any): Promise<Buffer>;
    static toUrl(_client: any, p: any, mediaType?: string): Promise<string | undefined>;
    static resolveMedia(_client: any, media: any, mediaType?: string, { resolveUrl, resolveWAUrl, result, resize, width, height }?: any): Promise<any>;
    static getMp4Duration(buffer: Buffer, { silent }?: any): number;
    static getMp4Preview(videoBuffer: Buffer, { time, result, resize, width, height, silent }?: any): Promise<unknown>;
}
declare class BaseBuilder {
    _title: string;
    _subtitle: string;
    _body: string;
    _footer: string;
    _contextInfo: any;
    _extraPayload: any;
    constructor();
    setTitle(title: string): this;
    setSubtitle(subtitle: string): this;
    setBody(body: string): this;
    setFooter(footer: string): this;
    setContextInfo(obj: any): this;
    addPayload(obj: any): this;
}
declare class AIRich extends BaseBuilder {
    #private;
    _submessages: any[];
    _sections: any[];
    _richResponseSources: any[];
    constructor(client: any);
    addSubmessage(submessage: any): this;
    addSection(section: any): this;
    addText(text: string, { hyperlink, citation, latex }?: any): this;
    addCode(language: string, code: string): this;
    addTable(table: any[], { hyperlink, citation, latex }?: any): this;
    addSource(sources?: any[]): this;
    addReels(reelsItems?: any): this;
    addImage(imageUrl: any, { resolveUrl }?: any): this;
    addVideo(videoUrl: any, { autoFill }?: any): this;
    addProduct(data?: any): this;
    addPost(data?: any): this;
    addTip(text: string): this;
    addSuggest(suggestion: any, { scroll, layout }?: any): this;
    build({ forwarded, notification, includesUnifiedResponse, includesSubmessages, quoted, quotedParticipant, ...options }?: any): Promise<any>;
    send(jid: string, { forwarded, notification, includesUnifiedResponse, includesSubmessages, ...options }?: any): Promise<any>;
    static tokenizer(code: string, lang?: string): {
        codeBlock: any[];
        unified_codeBlock: {
            content: any;
            type: string | undefined;
        }[];
    };
    static toTableMetadata(arr: any[], { hyperlink, citation, latex }?: any): {
        title: string;
        rows: {
            isHeading?: boolean | undefined;
            items: any;
        }[];
        unified_rows: any[];
    };
    static newLayout(name: string, data: any, extra?: any): any;
}
export declare function patchSocketAIRich(sock: any): any;
export { VERSION, AIRich, Toolkit };
declare function makeLocationThumbnailBtn(buffer: Buffer): Promise<Buffer>;
declare class ButtonV2 {
    #private;
    _title: string;
    _subtitle: string;
    _body: string;
    _footer: string;
    _contextInfo: any;
    _extraPayload: any;
    _imageInput: any;
    _data: any;
    _buttons: any[];
    _locationMessage: any;
    _bottomSheet: any;
    _limitedTimeOffer: any;
    _viewOnce: boolean;
    constructor(client: any);
    setTitle(title: string): this;
    setSubtitle(subtitle: string): this;
    setBody(b: string): this;
    setFooter(f: string): this;
    setContextInfo(obj: any): this;
    addPayload(obj: any): this;
    locreply(displayText?: string, buttonId?: string): this;
    loclist(obj: any): this;
    setThumbnail(input: any): this;
    setMedia(obj: any): this;
    setLocationMessage(obj?: any): this;
    setViewOnce(v?: boolean): this;
    setBottomSheet(title: string, buttonText: string, inThreadButtonsLimit?: number, dividerIndices?: number[]): this;
    setLimitedTimeOffer(text: string, copyCode?: string, url?: string, expiryMs?: number): this;
    build(jid: string, { ...options }?: any): Promise<import("./index.js").WAMessage>;
    send(jid: string, { ...options }?: any): Promise<import("./index.js").WAMessage>;
}
export declare function patchSocketButtonV2(sock: any): any;
export { ButtonV2, makeLocationThumbnailBtn as makeLocationThumbnail };
export declare function buildButtons(buttons?: any[]): any[];
export declare function sendInteractiveMessage(sock: any, jid: string, content?: any, options?: any): Promise<{
    key: {
        id: any;
        remoteJid: string;
        fromMe: boolean;
    };
    message: {
        messageContextInfo: {
            deviceListMetadata: {};
            deviceListMetadataVersion: number;
            botMetadata: {};
        };
        interactiveMessage: {
            header: {
                title: any;
                hasMediaAttachment: boolean;
            } | undefined;
            body: {
                text: any;
            } | undefined;
            footer: {
                text: any;
                hasMediaAttachment: boolean;
            } | undefined;
            nativeFlowMessage: {
                buttons: any[];
                messageParamsJson: string;
                messageVersion: number;
            };
            limitedTimeOffer: {
                expirationTimeMs: number;
            } | undefined;
            contextInfo: any;
        };
    };
}>;
export declare function createCarouselCard(sock: any, content?: any): Promise<{
    body: {
        text: any;
    } | undefined;
    footer: {
        text: any;
    } | undefined;
    header: any;
    nativeFlowMessage: {
        buttons: any[];
        messageParamsJson: string;
        messageVersion: number;
    };
    limitedTimeOffer: {
        expirationTimeMs: number;
    } | undefined;
}>;
export declare function sendCarouselMessage(sock: any, jid: string, content?: any, options?: any): Promise<{
    key: {
        id: any;
        remoteJid: string;
        fromMe: boolean;
    };
    message: {
        messageContextInfo: {
            deviceListMetadata: {};
            deviceListMetadataVersion: number;
            botMetadata: {};
        };
        interactiveMessage: {
            header: {
                hasMediaAttachment: boolean;
            };
            body: {
                text: any;
            } | undefined;
            footer: {
                text: any;
            } | undefined;
            carouselMessage: {
                cards: any;
            };
            limitedTimeOffer: {
                expirationTimeMs: number;
            } | undefined;
            contextInfo: any;
        };
    };
}>;
export declare class InteractiveBuilder {
    #private;
    constructor(sock: any);
    setTitle(t: string): this;
    setBody(b: string): this;
    setFooter(f: string): this;
    offer(...args: any[]): this;
    bottomsheet(title: string, buttonText: string, inThreadButtonsLimit?: number, dividerIndices?: number[]): this;
    setContextInfo(ci: any): this;
    qreplybtn(...args: any[]): this;
    urlbtn(...args: any[]): this;
    copybtn(...args: any[]): this;
    callbtn(...args: any[]): this;
    bookingbtn(...args: any[]): this;
    galaxybtn(text: string, screen: string, data?: any, flowVersion?: string, flowAction?: string): this;
    listbtn(...args: any[]): this;
    send(from: string, options?: any): Promise<{
        key: {
            id: any;
            remoteJid: string;
            fromMe: boolean;
        };
        message: {
            messageContextInfo: {
                deviceListMetadata: {};
                deviceListMetadataVersion: number;
                botMetadata: {};
            };
            interactiveMessage: {
                header: {
                    title: any;
                    hasMediaAttachment: boolean;
                } | undefined;
                body: {
                    text: any;
                } | undefined;
                footer: {
                    text: any;
                    hasMediaAttachment: boolean;
                } | undefined;
                nativeFlowMessage: {
                    buttons: any[];
                    messageParamsJson: string;
                    messageVersion: number;
                };
                limitedTimeOffer: {
                    expirationTimeMs: number;
                } | undefined;
                contextInfo: any;
            };
        };
    }>;
}
export declare class CarouselCardBuilder {
    #private;
    constructor(sock: any);
    setTitle(t: string): this;
    setSubtitle(s: string): this;
    setBody(b: string): this;
    setFooter(f: string): this;
    setMedia(m: any): this;
    qreplybtn(...args: any[]): this;
    urlbtn(...args: any[]): this;
    copybtn(...args: any[]): this;
    callbtn(...args: any[]): this;
    listbtn(...args: any[]): this;
    offer(...args: any[]): this;
    build(): Promise<{
        body: {
            text: any;
        } | undefined;
        footer: {
            text: any;
        } | undefined;
        header: any;
        nativeFlowMessage: {
            buttons: any[];
            messageParamsJson: string;
            messageVersion: number;
        };
        limitedTimeOffer: {
            expirationTimeMs: number;
        } | undefined;
    }>;
}
export declare class CarouselBuilder {
    #private;
    constructor(sock: any);
    setBody(b: string): this;
    setFooter(f: string): this;
    setContextInfo(ci: any): this;
    addCard(...cards: any[]): this;
    addcard(...cards: any[]): this;
    offer(...args: any[]): this;
    send(from: string, options?: any): Promise<{
        key: {
            id: any;
            remoteJid: string;
            fromMe: boolean;
        };
        message: {
            messageContextInfo: {
                deviceListMetadata: {};
                deviceListMetadataVersion: number;
                botMetadata: {};
            };
            interactiveMessage: {
                header: {
                    hasMediaAttachment: boolean;
                };
                body: {
                    text: any;
                } | undefined;
                footer: {
                    text: any;
                } | undefined;
                carouselMessage: {
                    cards: any;
                };
                limitedTimeOffer: {
                    expirationTimeMs: number;
                } | undefined;
                contextInfo: any;
            };
        };
    }>;
}
export declare function patchSocketInteractive(sock: any): any;
export declare function paymentAdditionalNodes(): {
    tag: string;
    attrs: {
        native_flow_name: string;
    };
}[];
export declare function paymentKeyAdditionalNodes(): {
    tag: string;
    attrs: {
        native_flow_name: string;
    };
}[];
declare class BaseNativeBuilder {
    sock: any;
    state: any;
    constructor(sock: any);
    header(value?: any): this;
    title(text?: string): this;
    body(text?: string): this;
    text(text?: string): this;
    footer(text?: string): this;
    button(name?: string): this;
    params(value?: any): this;
    rawParams(value?: any): this;
    messageParams(value?: any): this;
    additionalNodes(value?: any[]): this;
    build(): {
        interactiveMessage: {
            header: any;
            body: any;
            footer: any;
            nativeFlowMessage: {
                buttons: {
                    name: any;
                    buttonParamsJson: string;
                }[];
                messageParamsJson: any;
            };
        };
    };
    send(jid: string, options?: any): Promise<any>;
}
export declare class PaymentBuilder extends BaseNativeBuilder {
    constructor(sock: any);
    thumbnail(pathOrBuffer: any): this;
    noThumbnail(): this;
    currency(value?: string): this;
    amount(value?: any, offset?: any): this;
    reference(id?: string): this;
    orderRequest(id?: string): this;
    type(value?: string): this;
    method(value?: string): this;
    status(value?: string): this;
    timestamp(value?: any): this;
    note(value?: string): this;
    order(value?: any): this;
    orderStatus(value?: string): this;
    orderDescription(value?: string): this;
    orderType(value?: string): this;
    subtotal(value?: any, offset?: any): this;
    tax(value?: any, offset?: any): this;
    discount(value?: any, offset?: any): this;
    shipping(value?: any, offset?: any): this;
    item(value?: any): this;
    addItem(value?: any): this;
    items(values?: any[]): this;
    nativePaymentMethods(values?: any[]): this;
    paymentMethods(values?: any[]): this;
    shareStatus(value?: boolean): this;
    softDeleted(value?: boolean): this;
    template(value?: any): this;
}
export declare class EWalletBuilder extends BaseNativeBuilder {
    walletName: string;
    constructor(sock: any);
    wallet(name?: string): this;
    dana(): this;
    gopay(): this;
    ovo(): this;
    linkaja(): this;
    seabank(): this;
    qris(): this;
    shopepay(): this;
    currency(value?: string): this;
    amount(value?: any, offset?: any): this;
    reference(value?: string): this;
    type(value?: string): this;
    order(value?: any): this;
    orderStatus(value?: string): this;
    orderType(value?: string): this;
    item(value?: any): this;
    key(value?: string): this;
    name(value?: string): this;
    institution(value?: string): this;
    fullName(value?: string): this;
    accountType(value?: string): this;
    paymentKey(value?: any): this;
    paymentSettings(value?: any[]): this;
    shareStatus(value?: boolean): this;
    softDeleted(value?: boolean): this;
    referral(value?: string): this;
    template(value?: any): this;
    build(): {
        interactiveMessage: {
            nativeFlowMessage: {
                buttons: {
                    name: any;
                    buttonParamsJson: string;
                }[];
                messageParamsJson: any;
            };
        };
    };
}
export declare class OrderBuilder {
    #private;
    constructor(sock: any);
    reset(): this;
    orderId(val?: string): this;
    thumbnail(val?: string): this;
    thumbnailFromProfile(jid: string): Promise<this>;
    itemCount(val?: number): this;
    status(val?: number): this;
    surface(val?: number): this;
    message(val?: string): this;
    orderTitle(val?: string): this;
    sellerJid(val?: string): this;
    token(val?: string): this;
    totalAmount(val?: number, divisor?: number): this;
    totalAmountRaw(val?: number): this;
    currency(val?: string): this;
    contextInfo(info?: any): this;
    mentionedJid(...jids: any[]): this;
    senderKeyDistribution(groupId: string, axolotlKey: string): this;
    noSenderKeyDistribution(): this;
    template(value?: any): this;
    getState(): any;
    build(): any;
    send(jid: string, options?: any): Promise<any>;
}
export declare function createPaymentBuilder(sock: any): PaymentBuilder;
export declare function createEWalletBuilder(sock: any, wallet?: string): EWalletBuilder;
export declare function createOrderBuilder(sock: any): OrderBuilder;
export declare function usePayment(sock: any): any;
export declare class LinkPreviewBuilder {
    #private;
    constructor(sock: any);
    image(input: any): this;
    text(val?: string): this;
    title(val?: string): this;
    description(val?: string): this;
    link(val?: string): this;
    type(val?: string): this;
    send(jid: string, options?: any): Promise<any>;
}
export declare function createLinkPreviewBuilder(sock: any): LinkPreviewBuilder;
export declare const patchLinkPreview: (sock: any) => any;
export declare function applyNaileys(sock: any): void;
//# sourceMappingURL=Naileys.d.ts.map