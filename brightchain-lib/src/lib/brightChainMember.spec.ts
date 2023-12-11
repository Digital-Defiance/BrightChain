import * as uuid from 'uuid';
import { BrightChainMember } from './brightChainMember';
import { EmailString } from './emailString';
import { GuidV4, ShortHexGuid } from './guid';
import { MemberKeyUse } from './enumerations/memberKeyUse';
import { StoredMemberKey } from './keys/storedMemberKey';
import { MemberType } from './enumerations/memberType';
import { StaticHelpersKeyPair } from './staticHelpers.keypair';
import { MemberKeyStore } from './stores/memberKeyStore';
describe('brightchain', () => {
  const alice = BrightChainMember.newMember(
    MemberType.User,
    'Alice Smith',
    new EmailString('alice@example.com')
  );
  const bob = BrightChainMember.newMember(
    MemberType.User,
    'Bob Smith',
    new EmailString('bob@example.com')
  );
  const noKeyCharlie = new BrightChainMember(
    MemberType.User,
    'Charlie Smith',
    new EmailString('charlie@example.com')
  );
  it('should sign and verify a message for a member', () => {
    const message = Buffer.from('hello world');
    const signature = alice.sign(message);
    const verified = alice.verify(signature, message);
    expect(verified).toBeTruthy();
    expect(alice.verify(signature, Buffer.from('hello worldx'))).toBeFalsy();
  });
  it('should fail to create with an invalid id', () => {
    expect(
      () =>
        new BrightChainMember(
          MemberType.User,
          'alice',
          new EmailString('alice@example.com'),
          undefined,
          'x' as ShortHexGuid
        )
    ).toThrow('Invalid member ID');
  });
  it('should fail to sign when there is no signing key', () => {
    expect(() => noKeyCharlie.sign(Buffer.from('hello world'))).toThrow(
      'No key pair'
    );
  });
  it('should fail to verify when there is no signing key', () => {
    expect(() => {
      const signature = alice.sign(Buffer.from('hello world'));
      noKeyCharlie.verify(signature, Buffer.from('hello world'));
    }).toThrow('No key pair');
  });
  it('should unload a data keypair or signing keypair when called', () => {
    const dwight = BrightChainMember.newMember(
      MemberType.User,
      'Dwight Smith',
      new EmailString('dwight@example.com')
    );
    expect(dwight.hasKey(MemberKeyUse.Encryption)).toBeTruthy();
    dwight.unloadKeyPair(MemberKeyUse.Encryption);
    expect(dwight.hasKey(MemberKeyUse.Encryption)).toBeFalsy();
    expect(dwight.getKey(MemberKeyUse.Encryption)).toBeUndefined();
    expect(dwight.hasKey(MemberKeyUse.Signing)).toBeTruthy();
    dwight.unloadKeyPair(MemberKeyUse.Signing);
    expect(dwight.hasKey(MemberKeyUse.Signing)).toBeFalsy();
  });
  it('should fail if we swap out the signing keys without re-encrypting the data key', () => {
    const edith = BrightChainMember.newMember(
      MemberType.User,
      'Edith Smith',
      new EmailString('edith@example.com')
    );

    const newSigningKeyPair = StaticHelpersKeyPair.generateSigningKeyPair();
    edith.loadSigningKeyPair(newSigningKeyPair);
    const edithKey = edith.getKey(MemberKeyUse.Encryption);
    expect(edithKey).toBeInstanceOf(StoredMemberKey);
    if (!(edithKey instanceof StoredMemberKey)) {
      throw new Error('Not a StoredMemberKey');
    }
    expect(() => edith.loadDataKeyPair(edithKey)).toThrow(
      'Unable to challenge data key pair with mneomonic from signing key pair'
    );
  });
  it('should verify that the data passphrase is the same between successive signatures', () => {
    const frank = BrightChainMember.newMember(
      MemberType.User,
      'Frank Smith',
      new EmailString('frank@example.com')
    );
    const test1 = StaticHelpersKeyPair.signingKeyPairToDataKeyPassphraseFromMember(frank);
    const test2 = StaticHelpersKeyPair.signingKeyPairToDataKeyPassphraseFromMember(frank);
    expect(test1).toEqual(test2);
  });
  it('should recover the data key from the signing key', () => {
    const newId = new GuidV4(uuid.v4()).asShortHexGuid;
    const keyPair = StaticHelpersKeyPair.generateMemberKeyPairs(newId);
    const keyStore = new MemberKeyStore();
    keyStore.set(
      MemberKeyUse.Signing,
      StoredMemberKey.newSigningKey(
        Buffer.from(keyPair.signing.getPublic('hex'), 'hex'),
        Buffer.from(keyPair.signing.getPrivate('hex'), 'hex')
      )
    );
    keyStore.set(
      MemberKeyUse.Encryption,
      StoredMemberKey.newEncryptionKey(
        keyPair.data.publicKey,
        keyPair.data.privateKey
      )
    );
    const frank = new BrightChainMember(
      MemberType.User,
      'Frank Smith',
      new EmailString('frank@example.com'),
      keyStore,
      newId,
      undefined,
      undefined,
      newId
    );
    const recoveredKey = StaticHelpersKeyPair.recoverDataKeyFromSigningKey(frank);
    const dataKeyPassphrase = StaticHelpersKeyPair.signingKeyPairToDataKeyPassphraseFromMember(frank);
    const decryptedPrivateKey = StaticHelpersKeyPair.decryptDataPrivateKey(keyPair.data.privateKey, Buffer.from(dataKeyPassphrase))
    expect(recoveredKey).toEqual(decryptedPrivateKey);
  });
  it('should let us swap out the signing keys and still decrypt data with the re-encrypted data key', () => {
    // Create a new user with new signing and data keys
    const user = BrightChainMember.newMember(
      MemberType.User,
      'Test User',
      new EmailString('test@example.com')
    );

    const originalPassphrase = StaticHelpersKeyPair.signingKeyPairToDataKeyPassphraseFromMember(user);

    // Encrypt some data with the data key
    const testData = Buffer.from('test data');
    const encryptedData = user.encryptData(testData); // Assuming encryptData is a method for encryption using the data key

    // Create a new signing key and update the data key
    const newSigningKeyPair = user.rekeySigningKeyPair();

    // Decrypt the test data with the updated data key
    const decryptedData = user.decryptData(encryptedData); // Assuming decryptData is a method for decryption using the data key

    // Check if decrypted data matches original data
    expect(decryptedData).toEqual(testData);

    // Additional checks
    const updatedSigningKey = user.getKey(MemberKeyUse.Signing);
    expect(updatedSigningKey).not.toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(updatedSigningKey!.toECKeyPair()).toEqual(newSigningKeyPair.keyPair);

    // Check if the data key passphrase is derived from the new signing key
    const newPassphrase = StaticHelpersKeyPair.signingKeyPairToDataKeyPassphraseFromMember(user);
    expect(newPassphrase).not.toEqual(originalPassphrase); // Assuming originalPassphrase was stored earlier
  });
  it('should fail to create with a made up id', () => {
    expect(
      () =>
        new BrightChainMember(
          MemberType.User,
          'alice',
          new EmailString('alice@example.com'),
          undefined,
          'x' as ShortHexGuid
        )
    ).toThrow('Invalid member ID');
  });
  it('should fail to create a user with no name', () => {
    expect(() =>
      BrightChainMember.newMember(
        MemberType.User,
        '',
        new EmailString('alice@example.com')
      )
    ).toThrow('Member name missing');
  });
  it('should fail to create a user with whitespace at the start or end of their name', () => {
    expect(() =>
      BrightChainMember.newMember(
        MemberType.User,
        'alice ',
        new EmailString('alice@example.com')
      )
    ).toThrow('Member name has leading or trailing spaces');
    expect(() =>
      BrightChainMember.newMember(
        MemberType.User,
        ' alice',
        new EmailString('alice@example.com')
      )
    ).toThrow('Member name has leading or trailing spaces');
  });
  it('should fail to create a user with no email', () => {
    expect(() =>
      BrightChainMember.newMember(MemberType.User, 'alice', new EmailString(''))
    ).toThrow('Email missing');
  });
  it('should fail to create a user with an email that has whitespace at the start or end', () => {
    expect(() =>
      BrightChainMember.newMember(
        MemberType.User,
        'alice',
        new EmailString(' alice@example.com')
      )
    ).toThrow('Email has leading or trailing spaces');
    expect(() =>
      BrightChainMember.newMember(
        MemberType.User,
        'alice',
        new EmailString('alice@example.com ')
      )
    ).toThrow('Email has leading or trailing spaces');
  });
  it('should fail to create a user with an invalid email', () => {
    expect(() => {
      BrightChainMember.newMember(MemberType.User, 'Nope', new EmailString('x!foo'));
    }).toThrow('Email is invalid');
  });
  it('should check whether a user has a data key pair', () => {
    expect(bob.hasKey(MemberKeyUse.Encryption)).toEqual(true);
    expect(bob.hasPrivateKey(MemberKeyUse.Encryption)).toEqual(true);
    expect(noKeyCharlie.hasKey(MemberKeyUse.Encryption)).toEqual(false);
    expect(noKeyCharlie.hasPrivateKey(MemberKeyUse.Encryption)).toEqual(false);
  });
  it('should check whether a user has a signing key pair', () => {
    expect(alice.hasKey(MemberKeyUse.Encryption)).toEqual(true);
    expect(alice.hasPrivateKey(MemberKeyUse.Encryption)).toEqual(true);
    expect(noKeyCharlie.hasKey(MemberKeyUse.Signing)).toEqual(false);
    expect(noKeyCharlie.hasPrivateKey(MemberKeyUse.Signing)).toEqual(false);
  });
});
