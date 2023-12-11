/**
 * Unit tests for multipart/signed assembly and GPG/S/MIME send flow integration.
 *
 * Tests:
 * - assembleMultipartSigned produces correct MIME structure for GPG (RFC 3156)
 * - assembleMultipartSigned produces correct MIME structure for S/MIME (RFC 5751)
 * - Send flow with GPG signing and encryption
 * - Send flow with S/MIME signing and encryption
 * - Sign-before-encrypt ordering
 *
 * @see Requirements 3.1, 3.3, 4.1, 4.2, 4.4, 7.1, 7.3, 8.1, 8.2, 8.4
 */
import 'reflect-metadata';

import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import type { IGossipService } from '../../interfaces/availability/gossipService';
import { createMailbox } from '../../interfaces/messaging/emailAddress';
import type { IEmailMetadata } from '../../interfaces/messaging/emailMetadata';
import {
  ContentTransferEncoding,
  createContentType,
  type IMimePart,
} from '../../interfaces/messaging/mimePart';
import { EmailEncryptionService } from './emailEncryptionService';
import {
  EmailMessageService,
  type IEmailInput,
  type IEmailMetadataStore,
} from './emailMessageService';
import type { MessageCBLService } from './messageCBLService';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('./emailEncryptionService');

const MockedEmailEncryptionService = EmailEncryptionService as jest.MockedClass<
  typeof EmailEncryptionService
>;

// ─── Test Helpers ───────────────────────────────────────────────────────────

const mockMessageCBLService = {} as MessageCBLService;

const mockGossipService = {
  announceBlock: jest.fn(),
  announceRemoval: jest.fn(),
  handleAnnouncement: jest.fn(),
  onAnnouncement: jest.fn(),
  offAnnouncement: jest.fn(),
  getPendingAnnouncements: jest.fn().mockReturnValue([]),
  flushAnnouncements: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  getConfig: jest.fn(),
  announceMessage: jest.fn().mockResolvedValue(undefined),
  sendDeliveryAck: jest.fn(),
  onMessageDelivery: jest.fn(),
  offMessageDelivery: jest.fn(),
  onDeliveryAck: jest.fn(),
  offDeliveryAck: jest.fn(),
} as unknown as IGossipService;

function createMockMetadataStore(): IEmailMetadataStore {
  return {
    store: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    queryInbox: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    getThread: jest.fn().mockResolvedValue([]),
    getRootMessage: jest.fn(),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('assembleMultipartSigned', () => {
  let service: EmailMessageService;

  beforeEach(() => {
    jest.clearAllMocks();
    const metadataStore = createMockMetadataStore();
    service = new EmailMessageService(
      mockMessageCBLService,
      metadataStore,
      mockGossipService,
    );
  });

  // Access private method via bracket notation for direct testing
  function callAssembleMultipartSigned(
    svc: EmailMessageService,
    bodyPart: IMimePart,
    signature: Uint8Array | string,
    scheme: MessageEncryptionScheme.GPG | MessageEncryptionScheme.S_MIME,
  ): IMimePart {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (svc as any)['assembleMultipartSigned'](
      bodyPart,
      signature,
      scheme,
    ) as IMimePart;
  }

  describe('GPG (RFC 3156)', () => {
    it('should produce multipart/signed with correct protocol and micalg for GPG', () => {
      const bodyPart: IMimePart = {
        contentType: createContentType(
          'text',
          'plain',
          new Map([['charset', 'utf-8']]),
        ),
        body: new TextEncoder().encode('Hello, World!'),
        size: 13,
      };
      const signature =
        '-----BEGIN PGP SIGNATURE-----\nfakedata\n-----END PGP SIGNATURE-----';

      const result = callAssembleMultipartSigned(
        service,
        bodyPart,
        signature,
        MessageEncryptionScheme.GPG,
      );

      // Verify multipart/signed content type
      expect(result.contentType.type).toBe('multipart');
      expect(result.contentType.subtype).toBe('signed');
      expect(result.contentType.parameters.get('protocol')).toBe(
        'application/pgp-signature',
      );
      expect(result.contentType.parameters.get('micalg')).toBe('pgp-sha256');
      expect(result.contentType.parameters.get('boundary')).toBeDefined();
    });

    it('should have two child parts: body and signature', () => {
      const bodyPart: IMimePart = {
        contentType: createContentType('text', 'plain'),
        body: new TextEncoder().encode('Test body'),
        size: 9,
      };
      const signature =
        '-----BEGIN PGP SIGNATURE-----\ndata\n-----END PGP SIGNATURE-----';

      const result = callAssembleMultipartSigned(
        service,
        bodyPart,
        signature,
        MessageEncryptionScheme.GPG,
      );

      expect(result.parts).toBeDefined();
      expect(result.parts!.length).toBe(2);

      // First part is the original body
      expect(result.parts![0]).toBe(bodyPart);

      // Second part is the signature
      const sigPart = result.parts![1];
      expect(sigPart.contentType.type).toBe('application');
      expect(sigPart.contentType.subtype).toBe('pgp-signature');
      expect(sigPart.contentType.parameters.get('name')).toBe('signature.asc');
      expect(sigPart.contentDisposition?.type).toBe('attachment');
      expect(sigPart.contentDisposition?.filename).toBe('signature.asc');
      expect(sigPart.contentTransferEncoding).toBe(
        ContentTransferEncoding.SevenBit,
      );
    });

    it('should encode string signature as Uint8Array in the signature part body', () => {
      const bodyPart: IMimePart = {
        contentType: createContentType('text', 'plain'),
        body: new TextEncoder().encode('body'),
        size: 4,
      };
      const signatureStr = 'PGP-SIG-DATA';

      const result = callAssembleMultipartSigned(
        service,
        bodyPart,
        signatureStr,
        MessageEncryptionScheme.GPG,
      );

      const sigPart = result.parts![1];
      expect(sigPart.body).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(sigPart.body!)).toBe(signatureStr);
    });
  });

  describe('S/MIME (RFC 5751)', () => {
    it('should produce multipart/signed with correct protocol and micalg for S/MIME', () => {
      const bodyPart: IMimePart = {
        contentType: createContentType(
          'text',
          'plain',
          new Map([['charset', 'utf-8']]),
        ),
        body: new TextEncoder().encode('Hello, S/MIME!'),
        size: 14,
      };
      const signature = new Uint8Array([0x30, 0x82, 0x01, 0x00]); // fake DER

      const result = callAssembleMultipartSigned(
        service,
        bodyPart,
        signature,
        MessageEncryptionScheme.S_MIME,
      );

      expect(result.contentType.type).toBe('multipart');
      expect(result.contentType.subtype).toBe('signed');
      expect(result.contentType.parameters.get('protocol')).toBe(
        'application/pkcs7-signature',
      );
      expect(result.contentType.parameters.get('micalg')).toBe('sha-256');
      expect(result.contentType.parameters.get('boundary')).toBeDefined();
    });

    it('should have signature part with pkcs7-signature content type and smime.p7s filename', () => {
      const bodyPart: IMimePart = {
        contentType: createContentType('text', 'html'),
        body: new TextEncoder().encode('<p>Hello</p>'),
        size: 12,
      };
      const signature = new Uint8Array([1, 2, 3, 4]);

      const result = callAssembleMultipartSigned(
        service,
        bodyPart,
        signature,
        MessageEncryptionScheme.S_MIME,
      );

      expect(result.parts).toBeDefined();
      expect(result.parts!.length).toBe(2);

      const sigPart = result.parts![1];
      expect(sigPart.contentType.type).toBe('application');
      expect(sigPart.contentType.subtype).toBe('pkcs7-signature');
      expect(sigPart.contentType.parameters.get('name')).toBe('smime.p7s');
      expect(sigPart.contentDisposition?.type).toBe('attachment');
      expect(sigPart.contentDisposition?.filename).toBe('smime.p7s');
      expect(sigPart.contentTransferEncoding).toBe(
        ContentTransferEncoding.Base64,
      );
    });

    it('should use Uint8Array signature directly for S/MIME', () => {
      const bodyPart: IMimePart = {
        contentType: createContentType('text', 'plain'),
        body: new TextEncoder().encode('body'),
        size: 4,
      };
      const signature = new Uint8Array([0x30, 0x82, 0x01, 0x00]);

      const result = callAssembleMultipartSigned(
        service,
        bodyPart,
        signature,
        MessageEncryptionScheme.S_MIME,
      );

      const sigPart = result.parts![1];
      expect(sigPart.body).toBe(signature);
    });
  });

  it('should compute total size from body and signature parts', () => {
    const bodyPart: IMimePart = {
      contentType: createContentType('text', 'plain'),
      body: new TextEncoder().encode('Hello'),
      size: 5,
    };
    const signature = new Uint8Array([1, 2, 3]);

    const result = callAssembleMultipartSigned(
      service,
      bodyPart,
      signature,
      MessageEncryptionScheme.GPG,
    );

    expect(result.size).toBe(5 + 3);
  });
});

describe('GPG/S/MIME send flow integration', () => {
  let service: EmailMessageService;
  let metadataStore: IEmailMetadataStore;
  let mockSignGpg: jest.Mock;
  let mockEncryptGpg: jest.Mock;
  let mockSignSmime: jest.Mock;
  let mockEncryptSmimeReal: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    metadataStore = createMockMetadataStore();
    service = new EmailMessageService(
      mockMessageCBLService,
      metadataStore,
      mockGossipService,
    );

    // Set up mocks on the EmailEncryptionService prototype
    mockSignGpg = jest.fn().mockResolvedValue({
      signature: new TextEncoder().encode('gpg-signature-data'),
      signerPublicKey: new TextEncoder().encode('gpg-signer-key-id'),
    });

    mockEncryptGpg = jest.fn().mockResolvedValue({
      encryptedContent: new TextEncoder().encode('gpg-encrypted-content'),
      encryptionMetadata: {
        scheme: MessageEncryptionScheme.GPG,
        isSigned: false,
        gpgEncryptedMessage: 'armored-encrypted-message',
      },
    });

    mockSignSmime = jest.fn().mockResolvedValue({
      signature: new Uint8Array([0x30, 0x82, 0x01]),
      signerPublicKey: new TextEncoder().encode('smime-signer-subject'),
    });

    mockEncryptSmimeReal = jest.fn().mockResolvedValue({
      encryptedContent: new Uint8Array([0x30, 0x82, 0x02]),
      encryptionMetadata: {
        scheme: MessageEncryptionScheme.S_MIME,
        isSigned: false,
        cmsEncryptedContent: new Uint8Array([0x30, 0x82, 0x02]),
      },
    });

    MockedEmailEncryptionService.prototype.signGpg = mockSignGpg;
    MockedEmailEncryptionService.prototype.encryptGpg = mockEncryptGpg;
    MockedEmailEncryptionService.prototype.signSmime = mockSignSmime;
    MockedEmailEncryptionService.prototype.encryptSmimeReal =
      mockEncryptSmimeReal;
  });

  describe('GPG send flow', () => {
    it('should call signGpg and assembleMultipartSigned when GPG signing is enabled', async () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'GPG signed',
        textBody: 'Hello GPG',
        encryptionScheme: MessageEncryptionScheme.GPG,
        signMessage: true,
        senderGpgPrivateKey:
          '-----BEGIN PGP PRIVATE KEY-----\nfake\n-----END PGP PRIVATE KEY-----',
        senderGpgPassphrase: 'passphrase123',
        recipientGpgKeys: new Map([
          [
            'recipient@example.com',
            '-----BEGIN PGP PUBLIC KEY-----\nfake\n-----END PGP PUBLIC KEY-----',
          ],
        ]),
      };

      const result = await service.sendEmail(email);
      expect(result.success).toBe(true);

      // signGpg should be called before encryptGpg
      expect(mockSignGpg).toHaveBeenCalledTimes(1);
      expect(mockEncryptGpg).toHaveBeenCalledTimes(1);

      // Verify the stored metadata has signing info
      const storedMetadata = (metadataStore.store as jest.Mock).mock
        .calls[0][0] as IEmailMetadata;
      expect(storedMetadata.isSigned).toBe(true);
      expect(storedMetadata.contentSignature).toBeDefined();

      // Verify multipart/signed structure was created
      expect(storedMetadata.parts).toBeDefined();
      expect(storedMetadata.parts!.length).toBe(1);
      const signedPart = storedMetadata.parts![0];
      expect(signedPart.contentType.type).toBe('multipart');
      expect(signedPart.contentType.subtype).toBe('signed');
      expect(signedPart.contentType.parameters.get('protocol')).toBe(
        'application/pgp-signature',
      );
    });

    it('should call encryptGpg without signing when signMessage is false', async () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'GPG encrypted only',
        textBody: 'Hello GPG',
        encryptionScheme: MessageEncryptionScheme.GPG,
        signMessage: false,
        recipientGpgKeys: new Map([
          [
            'recipient@example.com',
            '-----BEGIN PGP PUBLIC KEY-----\nfake\n-----END PGP PUBLIC KEY-----',
          ],
        ]),
      };

      const result = await service.sendEmail(email);
      expect(result.success).toBe(true);

      expect(mockSignGpg).not.toHaveBeenCalled();
      expect(mockEncryptGpg).toHaveBeenCalledTimes(1);
    });

    it('should throw when GPG encryption is selected but no recipient keys provided', async () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'GPG no keys',
        textBody: 'Hello',
        encryptionScheme: MessageEncryptionScheme.GPG,
      };

      await expect(service.sendEmail(email)).rejects.toThrow(
        'Recipient GPG public keys are required for GPG encryption',
      );
    });
  });

  describe('S/MIME send flow', () => {
    it('should call signSmime and assembleMultipartSigned when S/MIME signing is enabled', async () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'S/MIME signed',
        textBody: 'Hello S/MIME',
        encryptionScheme: MessageEncryptionScheme.S_MIME,
        signMessage: true,
        senderSmimeCert:
          '-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----',
        senderSmimePrivateKey:
          '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----',
        recipientSmimeCerts: new Map([
          [
            'recipient@example.com',
            '-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----',
          ],
        ]),
      };

      const result = await service.sendEmail(email);
      expect(result.success).toBe(true);

      expect(mockSignSmime).toHaveBeenCalledTimes(1);
      expect(mockEncryptSmimeReal).toHaveBeenCalledTimes(1);

      // Verify the stored metadata has signing info
      const storedMetadata = (metadataStore.store as jest.Mock).mock
        .calls[0][0] as IEmailMetadata;
      expect(storedMetadata.isSigned).toBe(true);

      // Verify multipart/signed structure was created
      expect(storedMetadata.parts).toBeDefined();
      expect(storedMetadata.parts!.length).toBe(1);
      const signedPart = storedMetadata.parts![0];
      expect(signedPart.contentType.type).toBe('multipart');
      expect(signedPart.contentType.subtype).toBe('signed');
      expect(signedPart.contentType.parameters.get('protocol')).toBe(
        'application/pkcs7-signature',
      );
    });

    it('should call encryptSmimeReal without signing when signMessage is false', async () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'S/MIME encrypted only',
        textBody: 'Hello S/MIME',
        encryptionScheme: MessageEncryptionScheme.S_MIME,
        signMessage: false,
        recipientSmimeCerts: new Map([
          [
            'recipient@example.com',
            '-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----',
          ],
        ]),
      };

      const result = await service.sendEmail(email);
      expect(result.success).toBe(true);

      expect(mockSignSmime).not.toHaveBeenCalled();
      expect(mockEncryptSmimeReal).toHaveBeenCalledTimes(1);
    });
  });

  describe('sign-before-encrypt ordering', () => {
    it('should call signGpg before encryptGpg for GPG', async () => {
      const callOrder: string[] = [];
      mockSignGpg.mockImplementation(async () => {
        callOrder.push('signGpg');
        return {
          signature: new TextEncoder().encode('gpg-sig'),
          signerPublicKey: new TextEncoder().encode('key-id'),
        };
      });
      mockEncryptGpg.mockImplementation(async () => {
        callOrder.push('encryptGpg');
        return {
          encryptedContent: new TextEncoder().encode('encrypted'),
          encryptionMetadata: {
            scheme: MessageEncryptionScheme.GPG,
            isSigned: false,
          },
        };
      });

      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'Sign then encrypt',
        textBody: 'Content',
        encryptionScheme: MessageEncryptionScheme.GPG,
        signMessage: true,
        senderGpgPrivateKey: 'private-key',
        senderGpgPassphrase: 'pass',
        recipientGpgKeys: new Map([['r@example.com', 'pub-key']]),
      };

      await service.sendEmail(email);

      expect(callOrder).toEqual(['signGpg', 'encryptGpg']);
    });

    it('should call signSmime before encryptSmimeReal for S/MIME', async () => {
      const callOrder: string[] = [];
      mockSignSmime.mockImplementation(async () => {
        callOrder.push('signSmime');
        return {
          signature: new Uint8Array([1, 2, 3]),
          signerPublicKey: new TextEncoder().encode('subject'),
        };
      });
      mockEncryptSmimeReal.mockImplementation(async () => {
        callOrder.push('encryptSmimeReal');
        return {
          encryptedContent: new Uint8Array([4, 5, 6]),
          encryptionMetadata: {
            scheme: MessageEncryptionScheme.S_MIME,
            isSigned: false,
          },
        };
      });

      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'Sign then encrypt',
        textBody: 'Content',
        encryptionScheme: MessageEncryptionScheme.S_MIME,
        signMessage: true,
        senderSmimeCert: 'cert-pem',
        senderSmimePrivateKey: 'key-pem',
        recipientSmimeCerts: new Map([['r@example.com', 'cert-pem']]),
      };

      await service.sendEmail(email);

      expect(callOrder).toEqual(['signSmime', 'encryptSmimeReal']);
    });
  });
});
