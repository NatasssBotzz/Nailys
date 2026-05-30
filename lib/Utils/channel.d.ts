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
export declare const XWA_PATHS: {
    PROMOTE: string;
    DEMOTE: string;
    ADMIN_COUNT: string;
    CREATE: string;
    NEWSLETTER: string;
    METADATA_UPDATE: string;
};
export declare function isJidNewsletter(jid: any): boolean;
export declare function normalizeNewsletterJid(id: any): string;
export declare function extractNewsletterMetadata(node: any, isCreate?: boolean): {
    id: any;
    state: any;
    creation_time: number;
    name: any;
    nameTime: number;
    description: any;
    descriptionTime: number;
    invite: any;
    handle: any;
    picture: any;
    preview: any;
    reaction_codes: any;
    subscribers: number;
    verification: any;
    viewer_metadata: any;
} | null;
export declare function normalizeNewsletterMsg(msg?: {}): {};
export declare function patchSocketNewsletterEvents(sock: any): any;
export declare function makeNewsletterHelper(sock: any): {
    newsletterQuery: (to: any, type: any, content: any) => Promise<any>;
    newsletterWMexQuery: (newsletterId: any, query_id: any, variables?: {}) => Promise<any>;
    isFollowingNewsletter: (jid: any) => Promise<boolean>;
    subscribeNewsletterUpdates: (jid: any) => Promise<{
        [key: string]: string;
    } | undefined>;
    newsletterReactionMode: (jid: any, mode: any) => Promise<void>;
    newsletterUpdateDescription: (jid: any, description: any) => Promise<void>;
    newsletterUpdateName: (jid: any, name: any) => Promise<void>;
    newsletterUpdatePicture: (jid: any, content: any) => Promise<void>;
    newsletterRemovePicture: (jid: any) => Promise<void>;
    newsletterUnfollow: (jid: any) => Promise<void>;
    newsletterFollow: (jid: any) => Promise<void>;
    newsletterUnmute: (jid: any) => Promise<void>;
    newsletterMute: (jid: any) => Promise<void>;
    newsletterCreate: (name: any, description?: null, picture?: null) => Promise<{
        id: any;
        state: any;
        creation_time: number;
        name: any;
        nameTime: number;
        description: any;
        descriptionTime: number;
        invite: any;
        handle: any;
        picture: any;
        preview: any;
        reaction_codes: any;
        subscribers: number;
        verification: any;
        viewer_metadata: any;
    } | null>;
    newsletterMetadata: (type: any, key: any, role?: string) => Promise<{
        id: any;
        state: any;
        creation_time: number;
        name: any;
        nameTime: number;
        description: any;
        descriptionTime: number;
        invite: any;
        handle: any;
        picture: any;
        preview: any;
        reaction_codes: any;
        subscribers: number;
        verification: any;
        viewer_metadata: any;
    } | null>;
    newsletterAdminCount: (jid: any) => Promise<any>;
    newsletterChangeOwner: (jid: any, user_lid: any) => Promise<void>;
    newsletterDemote: (jid: any, user_lid: any) => Promise<void>;
    newsletterDelete: (jid: any) => Promise<void>;
    newsletterReactMessage: (jid: any, server_id: any, code: any) => Promise<void>;
    newsletterFetchMessages: (type: any, key: any, count: any, after: any) => Promise<{
        server_id: string | undefined;
        views: number;
        reactions: {
            count: number;
            code: string | undefined;
        }[];
    }[]>;
    newsletterFetchUpdates: (jid: any, count: any, after: any, since: any) => Promise<{
        server_id: string | undefined;
        views: number;
        reactions: {
            count: number;
            code: string | undefined;
        }[];
    }[]>;
    sendNewsletterMessage: (type: any, newsletterId: any, buffer: any, options?: {}) => Promise<any>;
    sendNewsletterVoice: (newsletterId: any, buffer: any, options?: {}) => Promise<any>;
    sendNewsletterText: (newsletterId: any, text: any, options?: {}) => Promise<any>;
    relayNewsletterMessage: (newsletterId: any, message: any, relayOptions?: {}) => Promise<any>;
    sendNewsletterTextLegacy: (newsletterId: any, text: any, options?: {}) => Promise<any>;
};
export declare function patchBaileysNewsletterMediaRc13_FORCE(): {
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
        patched?: undefined;
        patchedBlocks?: undefined;
        beforeNewsletterBlocks?: undefined;
        afterNewsletterBlocks?: undefined;
        beforeWAProtoCount?: undefined;
        afterWAProtoCount?: undefined;
        safeNow?: undefined;
    } | {
        file: string;
        ok: boolean;
        patched: boolean;
        patchedBlocks: number;
        beforeNewsletterBlocks: number;
        afterNewsletterBlocks: number;
        beforeWAProtoCount: any;
        afterWAProtoCount: any;
        safeNow: boolean;
        reason?: undefined;
    })[];
    reason?: undefined;
    tried?: undefined;
};
export declare function isNewsletterJid(value?: string): boolean;
export declare function extractInviteCode(input?: string): string;
export declare function getOwnerChannelLink(): string;
export declare function getOwnerChannelJidFallback(): string;
export declare function getNewsletterHelper(sock: any): any;
export declare function attachNewsletterFeatures(sock: any): any;
export declare function resolveChannelTarget(sock: any, input: any, newsletter: any): Promise<any>;
export declare function resolveOwnerChannelJid(sock: any, newsletter: any): Promise<any>;
export declare function clearChannelTargetCache(): void;
export declare function sendInteractive(sock: any, toJid: any, content?: {}, options?: {}): Promise<import("../index.js").WAMessage>;
export declare const sendButtons: typeof sendInteractive;
export declare function unwrapChannelMessage(message: any): any;
export declare function getQuotedAndContextInfo(m: any): {
    quoted: {
        message: any;
        key: {
            remoteJid: any;
            fromMe: boolean;
            id: any;
            participant: any;
        };
    } | null;
    ci: any;
};
export declare function handleIdChannel(ctx: any): Promise<void>;
export declare function handleListChannel(ctx: any): Promise<void>;
export declare function handleToChannel(ctx: any): Promise<void>;
export declare function handlePtvChannel(ctx: any): Promise<void>;
export declare function handleUpChannel(ctx: any): Promise<void>;
export declare function upch(sock: any, target: any, input: any, options?: {}): Promise<any>;
export declare function toch(sock: any, target: any, input: any, options?: {}): Promise<any>;
export declare function ptvch(sock: any, target: any, input: any, options?: {}): Promise<any>;
