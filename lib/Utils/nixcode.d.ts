import { proto } from '../../WAProto/index.js';
export declare const NIXCODE_VERSION = "naileys-1.0.0";
type PlainObject = Record<string, any>;
declare const nativeFlowAdditionalNodes: {
    tag: string;
    attrs: {};
    content: {
        tag: string;
        attrs: {
            type: string;
            v: string;
        };
        content: {
            tag: string;
            attrs: {
                v: string;
                name: string;
            };
        }[];
    }[];
}[];
declare const buildLimitedOfferParam: (input?: PlainObject) => PlainObject;
declare const buildBookingConfirmationParams: (input?: PlainObject) => PlainObject;
declare class BaseBuilder {
    protected _title: string;
    protected _subtitle: string;
    protected _body: string;
    protected _footer: string;
    protected _contextInfo: PlainObject;
    protected _extraPayload: PlainObject;
    setTitle(title: string): this;
    setSubtitle(subtitle: string): this;
    setBody(body: string): this;
    setFooter(footer: string): this;
    setContextInfo(obj: PlainObject): this;
    addPayload(obj: PlainObject): this;
    static resize(buffer: Buffer, x: number, y: number, fit?: string): Promise<Buffer<ArrayBufferLike>>;
    static fetchBuffer(url: string, options?: any, config?: any): Promise<Buffer<ArrayBufferLike>>;
}
export declare class Message extends BaseBuilder {
    private client;
    private data;
    private params;
    private buttons;
    private currentSelectionIndex;
    private currentSectionIndex;
    private legacyButtons;
    private image;
    private aiSubmessages;
    private aiSections;
    private richResponseSources;
    constructor(client: any);
    setVideo(input: any, options?: PlainObject): this;
    setImage(input: any, options?: PlainObject): this;
    setDocument(input: any, options?: PlainObject): this;
    setMedia(obj: PlainObject): this;
    setThumbnail(input: any): this;
    clearButtons(): this;
    setParams(obj: PlainObject): this;
    setLimitedOffer(input?: PlainObject): this;
    clearLimitedOffer(): this;
    addButton(name: string, params?: any, type?: string): this;
    addbutton(name: string, params?: any, type?: string): this;
    addRawButton(obj: PlainObject): this;
    addReply(display_text?: string, id?: `${string}-${string}-${string}-${string}-${string}`, options?: PlainObject): this;
    addCall(display_text?: string, id?: string, options?: PlainObject): this;
    addReminder(display_text?: string, id?: string, options?: PlainObject): this;
    addCancelReminder(display_text?: string, id?: string, options?: PlainObject): this;
    addAddress(display_text?: string, id?: string, options?: PlainObject): this;
    addLocation(options?: PlainObject): this;
    addUrl(display_text?: string, url?: string, webview_interaction?: boolean, options?: PlainObject): this;
    addCopy(display_text?: string, copy_code?: string, options?: PlainObject): this;
    addBookingConfirmation(params?: PlainObject): this;
    addBooking(params?: PlainObject): this;
    addSelection(title: string, options?: PlainObject): this;
    makeSection(title?: string, highlight_label?: string): this;
    makeSections(title?: string, highlight_label?: string): this;
    makeRow(header?: string, title?: string, description?: string, id?: `${string}-${string}-${string}-${string}-${string}`): this;
    toCard(): Promise<{
        body: {
            text: string;
        };
        footer: {
            text: string;
        };
        header: {
            conversation?: (string | null);
            senderKeyDistributionMessage?: (proto.Message.ISenderKeyDistributionMessage | null);
            imageMessage?: (proto.Message.IImageMessage | null);
            contactMessage?: (proto.Message.IContactMessage | null);
            locationMessage?: (proto.Message.ILocationMessage | null);
            extendedTextMessage?: (proto.Message.IExtendedTextMessage | null);
            documentMessage?: (proto.Message.IDocumentMessage | null);
            audioMessage?: (proto.Message.IAudioMessage | null);
            videoMessage?: (proto.Message.IVideoMessage | null);
            call?: (proto.Message.ICall | null);
            chat?: (proto.Message.IChat | null);
            protocolMessage?: (proto.Message.IProtocolMessage | null);
            contactsArrayMessage?: (proto.Message.IContactsArrayMessage | null);
            highlyStructuredMessage?: (proto.Message.IHighlyStructuredMessage | null);
            fastRatchetKeySenderKeyDistributionMessage?: (proto.Message.ISenderKeyDistributionMessage | null);
            sendPaymentMessage?: (proto.Message.ISendPaymentMessage | null);
            liveLocationMessage?: (proto.Message.ILiveLocationMessage | null);
            requestPaymentMessage?: (proto.Message.IRequestPaymentMessage | null);
            declinePaymentRequestMessage?: (proto.Message.IDeclinePaymentRequestMessage | null);
            cancelPaymentRequestMessage?: (proto.Message.ICancelPaymentRequestMessage | null);
            templateMessage?: (proto.Message.ITemplateMessage | null);
            stickerMessage?: (proto.Message.IStickerMessage | null);
            groupInviteMessage?: (proto.Message.IGroupInviteMessage | null);
            templateButtonReplyMessage?: (proto.Message.ITemplateButtonReplyMessage | null);
            productMessage?: (proto.Message.IProductMessage | null);
            deviceSentMessage?: (proto.Message.IDeviceSentMessage | null);
            messageContextInfo?: (proto.IMessageContextInfo | null);
            listMessage?: (proto.Message.IListMessage | null);
            viewOnceMessage?: (proto.Message.IFutureProofMessage | null);
            orderMessage?: (proto.Message.IOrderMessage | null);
            listResponseMessage?: (proto.Message.IListResponseMessage | null);
            ephemeralMessage?: (proto.Message.IFutureProofMessage | null);
            invoiceMessage?: (proto.Message.IInvoiceMessage | null);
            buttonsMessage?: (proto.Message.IButtonsMessage | null);
            buttonsResponseMessage?: (proto.Message.IButtonsResponseMessage | null);
            paymentInviteMessage?: (proto.Message.IPaymentInviteMessage | null);
            interactiveMessage?: (proto.Message.IInteractiveMessage | null);
            reactionMessage?: (proto.Message.IReactionMessage | null);
            stickerSyncRmrMessage?: (proto.Message.IStickerSyncRMRMessage | null);
            interactiveResponseMessage?: (proto.Message.IInteractiveResponseMessage | null);
            pollCreationMessage?: (proto.Message.IPollCreationMessage | null);
            pollUpdateMessage?: (proto.Message.IPollUpdateMessage | null);
            keepInChatMessage?: (proto.Message.IKeepInChatMessage | null);
            documentWithCaptionMessage?: (proto.Message.IFutureProofMessage | null);
            requestPhoneNumberMessage?: (proto.Message.IRequestPhoneNumberMessage | null);
            viewOnceMessageV2?: (proto.Message.IFutureProofMessage | null);
            encReactionMessage?: (proto.Message.IEncReactionMessage | null);
            editedMessage?: (proto.Message.IFutureProofMessage | null);
            viewOnceMessageV2Extension?: (proto.Message.IFutureProofMessage | null);
            pollCreationMessageV2?: (proto.Message.IPollCreationMessage | null);
            scheduledCallCreationMessage?: (proto.Message.IScheduledCallCreationMessage | null);
            groupMentionedMessage?: (proto.Message.IFutureProofMessage | null);
            pinInChatMessage?: (proto.Message.IPinInChatMessage | null);
            pollCreationMessageV3?: (proto.Message.IPollCreationMessage | null);
            scheduledCallEditMessage?: (proto.Message.IScheduledCallEditMessage | null);
            ptvMessage?: (proto.Message.IVideoMessage | null);
            botInvokeMessage?: (proto.Message.IFutureProofMessage | null);
            callLogMesssage?: (proto.Message.ICallLogMessage | null);
            messageHistoryBundle?: (proto.Message.IMessageHistoryBundle | null);
            encCommentMessage?: (proto.Message.IEncCommentMessage | null);
            bcallMessage?: (proto.Message.IBCallMessage | null);
            lottieStickerMessage?: (proto.Message.IFutureProofMessage | null);
            eventMessage?: (proto.Message.IEventMessage | null);
            encEventResponseMessage?: (proto.Message.IEncEventResponseMessage | null);
            commentMessage?: (proto.Message.ICommentMessage | null);
            newsletterAdminInviteMessage?: (proto.Message.INewsletterAdminInviteMessage | null);
            placeholderMessage?: (proto.Message.IPlaceholderMessage | null);
            secretEncryptedMessage?: (proto.Message.ISecretEncryptedMessage | null);
            albumMessage?: (proto.Message.IAlbumMessage | null);
            eventCoverImage?: (proto.Message.IFutureProofMessage | null);
            stickerPackMessage?: (proto.Message.IStickerPackMessage | null);
            statusMentionMessage?: (proto.Message.IFutureProofMessage | null);
            pollResultSnapshotMessage?: (proto.Message.IPollResultSnapshotMessage | null);
            pollCreationOptionImageMessage?: (proto.Message.IFutureProofMessage | null);
            associatedChildMessage?: (proto.Message.IFutureProofMessage | null);
            groupStatusMentionMessage?: (proto.Message.IFutureProofMessage | null);
            pollCreationMessageV4?: (proto.Message.IFutureProofMessage | null);
            statusAddYours?: (proto.Message.IFutureProofMessage | null);
            groupStatusMessage?: (proto.Message.IFutureProofMessage | null);
            richResponseMessage?: (proto.IAIRichResponseMessage | null);
            statusNotificationMessage?: (proto.Message.IStatusNotificationMessage | null);
            limitSharingMessage?: (proto.Message.IFutureProofMessage | null);
            botTaskMessage?: (proto.Message.IFutureProofMessage | null);
            questionMessage?: (proto.Message.IFutureProofMessage | null);
            messageHistoryNotice?: (proto.Message.IMessageHistoryNotice | null);
            groupStatusMessageV2?: (proto.Message.IFutureProofMessage | null);
            botForwardedMessage?: (proto.Message.IFutureProofMessage | null);
            statusQuestionAnswerMessage?: (proto.Message.IStatusQuestionAnswerMessage | null);
            questionReplyMessage?: (proto.Message.IFutureProofMessage | null);
            questionResponseMessage?: (proto.Message.IQuestionResponseMessage | null);
            statusQuotedMessage?: (proto.Message.IStatusQuotedMessage | null);
            statusStickerInteractionMessage?: (proto.Message.IStatusStickerInteractionMessage | null);
            pollCreationMessageV5?: (proto.Message.IPollCreationMessage | null);
            newsletterFollowerInviteMessageV2?: (proto.Message.INewsletterFollowerInviteMessage | null);
            pollResultSnapshotMessageV3?: (proto.Message.IPollResultSnapshotMessage | null);
            title: string;
            subtitle: string;
            hasMediaAttachment: boolean;
        };
        nativeFlowMessage: {
            messageParamsJson: string;
            buttons: any[];
        };
    }>;
    addText(text: string): this;
    addCode(language: string, code: string): this;
    addTable(table: string[][]): this;
    addSource(sources?: string[][]): this;
    addImage(imageUrl: string | string[]): this;
    addReels(items?: PlainObject[]): this;
    build(jid: string, options?: PlainObject): Promise<import("../index.js").WAMessage | {
        messageContextInfo: {
            deviceListMetadata: {};
            deviceListMetadataVersion: number;
            botMetadata: {
                messageDisclaimerText: string;
                richResponseSourcesMetadata: {
                    sources: any[];
                };
            };
        };
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: number;
                    submessages: any[];
                    unifiedResponse: {
                        data: string;
                    };
                    contextInfo: PlainObject;
                };
            };
        };
    }>;
    send(jid: string, options?: PlainObject): Promise<any>;
}
export declare const Button: typeof Message;
export declare const ButtonV2: typeof Message;
export declare const AIRich: typeof Message;
export declare class Carousel extends BaseBuilder {
    private client;
    private cards;
    constructor(client: any);
    addCard(card: any | any[]): this;
    build(jid: string, options?: PlainObject): import("../index.js").WAMessage;
    send(jid: string, options?: PlainObject): Promise<import("../index.js").WAMessage>;
}
export declare const createStatusPayloadFromInput: (message: any, text?: string) => Promise<PlainObject | null>;
export declare const payloadToStatusContent: (payload: PlainObject, config?: PlainObject) => PlainObject;
export declare const groupStatus: (sock: any, groupJid: string, content: PlainObject, options?: PlainObject) => Promise<import("../index.js").WAMessage>;
export declare const sendPayloadToGroupStatus: (sock: any, groupJid: string, payload: PlainObject, options?: PlainObject) => Promise<import("../index.js").WAMessage>;
export declare const sendSwgc: (sock: any, groupJid: string, input: any, options?: PlainObject) => Promise<import("../index.js").WAMessage>;
export declare class Swgc {
    private client;
    private targetJid;
    private payload;
    private options;
    constructor(client: any);
    target(jid: string): this;
    setTarget(jid: string): this;
    text(value: string): this;
    image(buffer: Buffer, caption?: string): this;
    video(buffer: Buffer, caption?: string): this;
    audio(buffer: Buffer, options?: PlainObject): this;
    fromInput(message: any, text?: string): Promise<this>;
    send(targetJid?: string, options?: PlainObject): Promise<import("../index.js").WAMessage>;
}
export declare const extractChannelInviteCode: (input: string) => string;
export declare const resolveChannelJid: (sock: any, target: string) => Promise<string>;
export declare const upch: (sock: any, target: string, input: any, options?: PlainObject) => Promise<any>;
export declare const sendToChannel: (sock: any, target: string, input: any, options?: PlainObject) => Promise<any>;
export declare const sendChannel: (sock: any, target: string, input: any, options?: PlainObject) => Promise<any>;
export declare const sendCarouselWithLimitOffer: (sock: any, jid: string, content?: PlainObject, options?: PlainObject) => Promise<import("../index.js").WAMessage>;
export declare const sendInteractiveCardLimitOffer: (sock: any, jid: string, content?: PlainObject, options?: PlainObject) => Promise<import("../index.js").WAMessage>;
export declare const normalizeLimitOfferInput: (input?: PlainObject) => PlainObject;
export { buildLimitedOfferParam, buildBookingConfirmationParams, nativeFlowAdditionalNodes };
//# sourceMappingURL=nixcode.d.ts.map