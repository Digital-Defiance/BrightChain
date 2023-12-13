import * as uuid from 'uuid';
import { BrightChainMember } from './brightChainMember';
import { EmailString } from './emailString';
import { MemberType } from './enumerations/memberType';
import { EthereumECIES } from './ethereumECIES';
import { faker } from '@faker-js/faker';
import { ShortHexGuid } from './types';
describe('brightchain', () => {
  let alice: BrightChainMember, bob: BrightChainMember, noKeyCharlie: BrightChainMember;
  beforeEach(() => {
    alice = BrightChainMember.newMember(
      MemberType.User,
      'Alice Smith',
      new EmailString('alice@example.com')
    );
    bob = BrightChainMember.newMember(
      MemberType.User,
      'Bob Smith',
      new EmailString('bob@example.com')
    );
    noKeyCharlie = BrightChainMember.newMember(
      MemberType.User,
      'Charlie Smith',
      new EmailString('charlie@example.com')
    );
    noKeyCharlie.unloadWalletAndPrivateKey();
  });
  it('should sign and verify a message for a member', () => {
    const message = Buffer.from('hello world');
    const signature = alice.sign(message);
    const verified = alice.verify(signature, message);
    expect(verified).toBeTruthy();
    expect(alice.verify(signature, Buffer.from('hello worldx'))).toBeFalsy();
  });
  it('should fail to create with an invalid id', () => {
    const mnemonic = EthereumECIES.generateNewMnemonic();
    const { wallet } = EthereumECIES.walletAndSeedFromMnemonic(mnemonic);
    const keyPair = EthereumECIES.walletToSimpleKeyPairBuffer(wallet);
    expect(
      () =>
        new BrightChainMember(
          MemberType.User,
          'alice',
          new EmailString('alice@example.com'),
          keyPair.publicKey,
          undefined,
          undefined,
          'x' as ShortHexGuid
        )
    ).toThrow('Invalid member ID');
  });
  it('should fail to sign when there is no signing key', () => {
    expect(() => noKeyCharlie.sign(Buffer.from(faker.lorem.sentence()))).toThrow(
      'No key pair'
    );
  });
  it('should fail to verify when there is no signing key', () => {
    expect(() => {
      const message = Buffer.from(faker.lorem.sentence());
      const signature = alice.sign(message);
      noKeyCharlie.verify(signature, message);
    }).toThrow('No key pair');
  });
  it('should unload a private key when called', () => {
    const dwight = BrightChainMember.newMember(
      MemberType.User,
      'Dwight Smith',
      new EmailString('dwight@example.com')
    );
    expect(dwight.hasPrivateKey).toBeTruthy();
    dwight.unloadWalletAndPrivateKey();
    expect(dwight.hasPrivateKey).toBeFalsy();
  });
  it('should fail to create with a made up id', () => {
    const mnemonic = EthereumECIES.generateNewMnemonic();
    const { wallet } = EthereumECIES.walletAndSeedFromMnemonic(mnemonic);
    const keyPair = EthereumECIES.walletToSimpleKeyPairBuffer(wallet);
    expect(
      () =>
        new BrightChainMember(
          MemberType.User,
          'alice',
          new EmailString('alice@example.com'),
          keyPair.publicKey,
          undefined,
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
  it('should check whether a user has a private key', () => {
    expect(bob.hasPrivateKey).toEqual(true);
    expect(noKeyCharlie.hasPrivateKey).toEqual(false);
  });
});
