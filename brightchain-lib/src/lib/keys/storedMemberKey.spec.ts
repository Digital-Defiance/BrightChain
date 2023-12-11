import { StaticHelpersKeyPair } from "../staticHelpers.keypair";
import { MemberKeyUse } from "../enumerations/memberKeyUse";
import { StoredMemberKey } from "./storedMemberKey";
import { generateRandomString } from '../test/testUtils';
import { ISigningKeyPrivateKeyInfo } from "../interfaces/signgingKeyPrivateKeyInfo";
import { ISimpleKeyPairBuffer } from "../interfaces/simpleKeyPairBuffer";

describe('StoredMemberKey', () => {
    it('should create an authentication key', () => {
        const newAuthenticationKey: ISigningKeyPrivateKeyInfo = StaticHelpersKeyPair.generateSigningKeyPair();
        const storedMemberKey: StoredMemberKey = StoredMemberKey.newAuthenticationKey(
            newAuthenticationKey.publicKey,
            newAuthenticationKey.privateKey);
        const storedPrivateKey = storedMemberKey.privateKey;
        expect(storedMemberKey).toBeTruthy();
        expect(storedMemberKey).toBeInstanceOf(StoredMemberKey);
        expect(storedMemberKey.is(MemberKeyUse.Authentication)).toBeTruthy();
        expect(storedPrivateKey).toBeTruthy();
        expect(storedPrivateKey).toEqual(newAuthenticationKey.privateKey);
    });
    it('should create an encryption key', () => {
        // generate a random string to use as a password
        const newPassword = Buffer.from(generateRandomString(32));
        const newEncryptionKey: ISimpleKeyPairBuffer = StaticHelpersKeyPair.generateDataKeyPair(newPassword);
        const storedMemberKey = StoredMemberKey.newEncryptionKey(
            newEncryptionKey.publicKey,
            newEncryptionKey.privateKey);
        expect(storedMemberKey).toBeTruthy();
        expect(storedMemberKey).toBeInstanceOf(StoredMemberKey);
        expect(storedMemberKey.is(MemberKeyUse.Encryption)).toBeTruthy();
        expect(storedMemberKey.privateKey).toBeTruthy();
        expect(storedMemberKey.privateKey).toEqual(newEncryptionKey.privateKey);
    });
});