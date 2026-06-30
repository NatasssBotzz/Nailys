declare const _libsignal: any;
export declare const ProtocolAddress: typeof _libsignal.ProtocolAddress;
export declare const SessionCipher: typeof _libsignal.SessionCipher;
export declare const SessionRecord: typeof _libsignal.SessionRecord;
export declare const SessionBuilder: typeof _libsignal.SessionBuilder;
export type SignalStorage = {
    loadSession(id: string): Promise<InstanceType<typeof SessionRecord> | null>;
    storeSession(id: string, session: InstanceType<typeof SessionRecord>): Promise<void>;
    isTrustedIdentity(id: string, publicKey: Uint8Array): boolean;
    loadPreKey(id: number | string): Promise<{
        privKey: Buffer;
        pubKey: Buffer;
    } | undefined>;
    removePreKey(id: number): Promise<void>;
    loadSignedPreKey(): {
        privKey: Buffer;
        pubKey: Buffer;
    };
    getOurRegistrationId(): number;
    getOurIdentity(): {
        privKey: Buffer;
        pubKey: Buffer;
    };
};
declare const _crypto: any;
export declare const decrypt: typeof _crypto.decrypt;
export declare const encrypt: typeof _crypto.encrypt;
export declare const calculateMAC: typeof _crypto.calculateMAC;
export declare const deriveSecrets: typeof _crypto.deriveSecrets;
declare const _curve: any;
export declare const generateKeyPair: typeof _curve.generateKeyPair;
export declare const calculateAgreement: typeof _curve.calculateAgreement;
export declare const calculateSignature: typeof _curve.calculateSignature;
export declare const verifySignature: typeof _curve.verifySignature;
declare const _protobufs: any;
export declare const PreKeyWhisperMessage: typeof _protobufs.PreKeyWhisperMessage;
export declare const curve: {
    readonly generateKeyPair: any;
    readonly calculateAgreement: any;
    readonly calculateSignature: any;
    readonly verifySignature: any;
};
export declare const crypto: {
    readonly decrypt: any;
    readonly encrypt: any;
    readonly calculateMAC: any;
    readonly deriveSecrets: any;
};
export declare const protobufs: {
    readonly PreKeyWhisperMessage: any;
};
export {};
//# sourceMappingURL=libsignal-bridge.d.ts.map