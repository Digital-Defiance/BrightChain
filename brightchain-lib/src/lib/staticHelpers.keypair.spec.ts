import { mnemonicToEntropy, validateMnemonic } from 'bip39';
import { BrightChainMember } from './brightChainMember';
import { StaticHelpersKeyPair } from './staticHelpers.keypair';
import { ec as EC } from 'elliptic';
import { MemberType } from './enumerations/memberType';
import { MemberKeyUse } from './enumerations/memberKeyUse';
import { EmailString } from './emailString';

describe('brightchain staticHelpers.keyPair', () => {
  it('should generate a keypair and seed', () => {
    const keyPair = StaticHelpersKeyPair.generateSigningKeyPair();
    expect(keyPair.privateKey).toBeTruthy();
    expect(keyPair.publicKey).toBeTruthy();
    expect(keyPair.seedHex).toBeTruthy();
    expect(keyPair.mnemonic).toBeTruthy();
    expect(keyPair.entropy).toBeTruthy();
    expect(validateMnemonic(keyPair.mnemonic)).toBeTruthy();

    // now regenerate from the same mnemonic again
    const regeneratedKeyPair = StaticHelpersKeyPair.regenerateSigningKeyPairFromMnemonic(
      keyPair.mnemonic
    );
    expect(regeneratedKeyPair.privateKey).toBeTruthy();
    expect(regeneratedKeyPair.publicKey).toBeTruthy();
    expect(regeneratedKeyPair.seedHex).toBeTruthy();
    expect(regeneratedKeyPair.mnemonic).toBeTruthy();
    expect(regeneratedKeyPair.entropy).toBeTruthy();
    expect(validateMnemonic(regeneratedKeyPair.mnemonic)).toBeTruthy();
    expect(regeneratedKeyPair.privateKey).toEqual(keyPair.privateKey);
    expect(regeneratedKeyPair.publicKey).toEqual(keyPair.publicKey);
    expect(regeneratedKeyPair.mnemonic).toEqual(keyPair.mnemonic);
    expect(regeneratedKeyPair.seedHex).toEqual(keyPair.seedHex);

    // regenerate once more and verify
    const regeneratedKeyPair2 = StaticHelpersKeyPair.regenerateSigningKeyPairFromMnemonic(
      keyPair.mnemonic
    );
    expect(regeneratedKeyPair2.privateKey).toBeTruthy();
    expect(regeneratedKeyPair2.publicKey).toBeTruthy();
    expect(regeneratedKeyPair2.seedHex).toBeTruthy();
    expect(regeneratedKeyPair2.mnemonic).toBeTruthy();
    expect(regeneratedKeyPair2.entropy).toBeTruthy();
    expect(validateMnemonic(regeneratedKeyPair2.mnemonic)).toBeTruthy();
    expect(regeneratedKeyPair2.privateKey).toEqual(keyPair.privateKey);
    expect(regeneratedKeyPair2.publicKey).toEqual(keyPair.publicKey);
    expect(regeneratedKeyPair2.mnemonic).toEqual(keyPair.mnemonic);
    expect(regeneratedKeyPair2.seedHex).toEqual(keyPair.seedHex);
  });
  it('should matter what password you use', () => {
    // generate a password
    const password: string =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    const keyPair = StaticHelpersKeyPair.generateSigningKeyPair(password);
    expect(keyPair.privateKey).toBeTruthy();
    expect(keyPair.publicKey).toBeTruthy();
    expect(keyPair.seedHex).toBeTruthy();
    expect(keyPair.mnemonic).toBeTruthy();
    expect(keyPair.entropy).toBeTruthy();
    expect(validateMnemonic(keyPair.mnemonic)).toBeTruthy();

    // regenerate without the password
    const regeneratedKeyPair = StaticHelpersKeyPair.regenerateSigningKeyPairFromMnemonic(
      keyPair.mnemonic
    );
    // expect the private key to be different
    expect(regeneratedKeyPair.privateKey).not.toEqual(keyPair.privateKey);

    // regenerate with the password
    const regeneratedKeyPair2 = StaticHelpersKeyPair.regenerateSigningKeyPairFromMnemonic(
      keyPair.mnemonic,
      password
    );
    // expect the private key to be the same
    expect(regeneratedKeyPair2.privateKey).toEqual(keyPair.privateKey);
  });

  it('should try the new test', () => {
    // https://medium.com/@alexberegszaszi/why-do-my-bip32-wallets-disagree-6f3254cc5846#.6tqszlvf4
    const mnemonic = 'radar blur cabbage chef fix engine embark joy scheme fiction master release';
    const entropy = 'b0a30c7e93a58094d213c4c0aaba22da';
    const seed =
      'ed37b3442b3d550d0fbb6f01f20aac041c245d4911e13452cac7b1676a070eda66771b71c0083b34cc57ca9c327c459a0ec3600dbaf7f238ff27626c8430a806';
    const privateKeyEd25519 =
      '0cc231ef00b5ba07d2871c8b9bb98e2c015d38ba0e0b0ca4b8caba2f27671e0e';

    const testKeyPair = StaticHelpersKeyPair.regenerateSigningKeyPairFromMnemonic(mnemonic);
    expect(testKeyPair.seedHex).toEqual(seed);

    const recoveredEntropy = mnemonicToEntropy(mnemonic);
    expect(recoveredEntropy).toEqual(entropy);
    expect(testKeyPair.privateKey.toString('hex')).toEqual(privateKeyEd25519);
  });
  it('should encrypt and decrypt an rsa private key', () => {
    const password = Buffer.from('password');
    const keyPair = StaticHelpersKeyPair.generateDataKeyPair(password);
    const decryptedKey = StaticHelpersKeyPair.decryptDataPrivateKey(
      keyPair.privateKey,
      password
    );
    expect(decryptedKey).toBeTruthy();
  });
  it('should generate an rsa keypair and then challenge the key', () => {
    const password = Buffer.from('password');
    const keyPair = StaticHelpersKeyPair.generateDataKeyPair(password);
    expect(
      StaticHelpersKeyPair.challengeDataKeyPair(keyPair, password)
    ).toBeTruthy();
  });
  it("should throw an error when trying to get a key when we don't have one", () => {
    const member = new BrightChainMember(
      MemberType.User,
      'alice',
      new EmailString('alice@example.com')
    );
    const authenticationKeyPair = member.getKey(MemberKeyUse.Authentication);
    const dataKeyPair = member.getKey(MemberKeyUse.Encryption);
    const signingKeyPair = member.getKey(MemberKeyUse.Signing);
    expect(authenticationKeyPair).toBeUndefined();
    expect(dataKeyPair).toBeUndefined();
    expect(signingKeyPair).toBeUndefined();
  });
  it('should fail to get the signing private key when we have a public key only', () => {
    const alice = BrightChainMember.newMember(
      MemberType.User,
      'alice',
      new EmailString('alice@example.com')
    );
    const curve = new EC(StaticHelpersKeyPair.DefaultECMode);
    const signgingKeyPair = alice.getKey(MemberKeyUse.Signing);
    expect(signgingKeyPair).toBeTruthy();
    const publicKey: Buffer | undefined = signgingKeyPair?.publicKey;
    expect(signgingKeyPair?.publicKey).toBeTruthy();
    expect(signgingKeyPair?.privateKey).toBeTruthy();
    if (publicKey === undefined) {
      throw new Error('public key is undefined');
    }
    // make a keypair from public only
    const pubOnly = curve.keyFromPublic(publicKey, 'hex');
    // take a perfectly good user and make her bad. remove her signing private key
    const simpleKeyPair =
      StaticHelpersKeyPair.convertECKeyPairToISimpleKeyPairBuffer(pubOnly);
    simpleKeyPair.privateKey = Buffer.alloc(0);
    expect(() => alice.loadSigningKeyPair(simpleKeyPair)).toThrow('');
  });
  it('should fail to get the data private key when we have a public key only', () => {
    const alice = BrightChainMember.newMember(
      MemberType.User,
      'alice',
      new EmailString('alice@example.com')
    );
    const signgingKeyPair = alice.getKey(MemberKeyUse.Signing);
    const publicKey: Buffer | undefined = signgingKeyPair?.publicKey;
    expect(signgingKeyPair?.publicKey).toBeTruthy();
    expect(signgingKeyPair?.privateKey).toBeTruthy();
    if (publicKey === undefined) {
      throw new Error('public key is undefined');
    }
    // make a keypair from public only
    const curve = new EC(StaticHelpersKeyPair.DefaultECMode);
    const pubOnly = curve.keyFromPublic(publicKey, 'hex');
    // take a perfectly good user and make her bad. remove her data private key
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const simpleKeyPair =
      StaticHelpersKeyPair.convertECKeyPairToISimpleKeyPairBuffer(pubOnly);
    expect(() => alice.loadSigningKeyPair(simpleKeyPair)).toThrow('Private key provided but zero length');
  });
});
