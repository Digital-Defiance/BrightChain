import {
  EciesError,
  EmailString,
  IECIESConfig,
  MemberType,
  SecureBuffer,
} from '@brightchain/brightchain-lib';
import { Wallet } from '@ethereumjs/wallet';
import { BackendBurnbagMember } from '../../backend-burnbag-member';
import { EciesCryptoCore } from './crypto-core';
import { EciesMultiRecipient } from './multiRecipient';
import { ECIESService } from './service';

describe('EciesMultiRecipient', () => {
  let cryptoCore: EciesCryptoCore;
  let eciesMultiRecipient: EciesMultiRecipient;
  let recipients: BackendBurnbagMember[];
  const message = Buffer.from('This is a secret message');
  let eciesService: ECIESService;

  beforeAll(() => {
    // This is a mock configuration. In a real scenario, this would be properly configured.
    const config: IECIESConfig = {
      curveName: 'secp256k1',
      primaryKeyDerivationPath: "m/44'/60'/0'/0/0",
      mnemonicStrength: 128,
      symmetricAlgorithm: 'aes-256-gcm',
      symmetricKeyBits: 256,
      symmetricKeyMode: 'gcm',
    };
    cryptoCore = new EciesCryptoCore(config);
    eciesService = new ECIESService(config);
    eciesMultiRecipient = new EciesMultiRecipient(cryptoCore);

    // Create some mock recipients
    const wallet1 = Wallet.generate();
    const wallet2 = Wallet.generate();
    const wallet3 = Wallet.generate();
    recipients = [
      new BackendBurnbagMember(
        eciesService,
        MemberType.User,
        'Recipient 1',
        new EmailString('recipient1@example.com'),
        Buffer.from(wallet1.getPublicKey()),
        new SecureBuffer(wallet1.getPrivateKey()),
        wallet1,
      ),
      new BackendBurnbagMember(
        eciesService,
        MemberType.User,
        'Recipient 2',
        new EmailString('recipient2@example.com'),
        Buffer.from(wallet2.getPublicKey()),
        new SecureBuffer(wallet2.getPrivateKey()),
        wallet2,
      ),
      new BackendBurnbagMember(
        eciesService,
        MemberType.User,
        'Recipient 3',
        new EmailString('recipient3@example.com'),
        Buffer.from(wallet3.getPublicKey()),
        new SecureBuffer(wallet3.getPrivateKey()),
        wallet3,
      ),
    ];
  });

  it('should encrypt a message for multiple recipients', async () => {
    const encryptedMessage = await eciesMultiRecipient.encryptMultiple(
      recipients,
      message,
    );

    expect(encryptedMessage).toBeDefined();
    expect(encryptedMessage.recipientCount).toBe(recipients.length);
    expect(encryptedMessage.recipientIds.length).toBe(recipients.length);
    expect(encryptedMessage.recipientKeys.length).toBe(recipients.length);
    expect(encryptedMessage.dataLength).toBe(message.length);
    expect(encryptedMessage.encryptedMessage).toBeInstanceOf(Buffer);
  });

  it('should decrypt a message for a recipient', async () => {
    // First, encrypt the message
    const encryptedMessage = await eciesMultiRecipient.encryptMultiple(
      recipients,
      message,
    );

    // Pick one recipient to decrypt the message for
    const recipient = recipients[1];

    // Decrypt the message
    const decryptedMessage =
      await eciesMultiRecipient.decryptMultipleECIEForRecipient(
        encryptedMessage,
        recipient,
      );

    expect(decryptedMessage).toBeInstanceOf(Buffer);
    expect(decryptedMessage.toString()).toEqual(message.toString());
  });

  it('should throw an error if recipient is not in the list', async () => {
    // First, encrypt the message
    const encryptedMessage = await eciesMultiRecipient.encryptMultiple(
      recipients,
      message,
    );

    // Create a new recipient that was not part of the original encryption
    const wallet = Wallet.generate();
    const outsider = new BackendBurnbagMember(
      eciesService,
      MemberType.User,
      'Outsider',
      new EmailString('outsider@example.com'),
      Buffer.from(wallet.getPublicKey()),
      new SecureBuffer(wallet.getPrivateKey()),
      wallet,
    );

    // Try to decrypt the message for the outsider
    try {
      await eciesMultiRecipient.decryptMultipleECIEForRecipient(
        encryptedMessage,
        outsider,
      );
      fail('Expected EciesError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EciesError);
    }
  });

  it('should throw an error if private key is not loaded for recipient', async () => {
    const encryptedMessage = await eciesMultiRecipient.encryptMultiple(
      recipients,
      message,
    );

    const recipientWithNoKey = new BackendBurnbagMember(
      eciesService,
      recipients[0].type,
      recipients[0].name,
      recipients[0].email,
      recipients[0].publicKey,
      undefined,
      undefined,
      recipients[0].id,
    );

    try {
      await eciesMultiRecipient.decryptMultipleECIEForRecipient(
        encryptedMessage,
        recipientWithNoKey,
      );
      fail('Expected EciesError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EciesError);
    }
  });

  it('encryptMultiple and decryptMultipleECIEForRecipient should be compatible', async () => {
    const originalMessage = Buffer.from(
      'A very secret message for testing compatibility',
    );

    const encrypted = await eciesMultiRecipient.encryptMultiple(
      recipients,
      originalMessage,
    );

    for (const recipient of recipients) {
      const decryptedMessage =
        await eciesMultiRecipient.decryptMultipleECIEForRecipient(
          encrypted,
          recipient,
        );
      expect(decryptedMessage.toString()).toEqual(originalMessage.toString());
    }
  });
});
