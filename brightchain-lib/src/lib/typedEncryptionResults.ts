import { ISealResults } from "./interfaces/sealResults";
import { StaticHelpersKeyPair } from "./staticHelpers.keypair";

export class TypedEncryptionResult<T> implements ISealResults {
    public readonly encryptedData: Buffer;
    public readonly encryptedKey: Buffer;
    constructor(encryptedData: Buffer, encryptedKey: Buffer) {
        this.encryptedData = encryptedData;
        this.encryptedKey = encryptedKey;
    }
    public static seal<T>(data: T, publicKey: Buffer): ISealResults {
        const sealed: ISealResults = StaticHelpersKeyPair.seal(data, publicKey);
        return new TypedEncryptionResult<T>(sealed.encryptedData, sealed.encryptedKey);
    }
    public unseal(privateKey: Buffer): T {
        return StaticHelpersKeyPair.unseal<T>(this, privateKey);
    }
}