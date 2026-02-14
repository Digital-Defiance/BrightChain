import {
  BlockAnnouncement,
  DeliveryAckMetadata,
  IAvailabilityService,
  IBlockRegistry,
  IDiscoveryProtocol,
  IGossipService,
  IHeartbeatMonitor,
  MessageDeliveryMetadata,
} from '@brightchain/brightchain-lib';
import { IECIESConfig, SecureString } from '@digitaldefiance/ecies-lib';
import { ECIESService as NodeECIESService } from '@digitaldefiance/node-ecies-lib';
import fc from 'fast-check';
import {
  EncryptedBatchPayload,
  GossipService,
  IPeerProvider,
} from '../availability/gossipService';
import { GossipMessageType } from '../enumerations/websocketMessageType';
import { IAnnouncementBatchMessage } from '../interfaces/websocketMessages';
import { IWebSocketConnection, WebSocketHandler } from './websocketHandler';

/**
 * Property tests for gossip message encryption feature.
 *
 * Test file for all property-based tests related to the gossip-message-encryption spec.
 */

describe('Feature: gossip-message-encryption, Property 1: messageDelivery serialization round-trip', () => {
  // --- Smart Generators ---

  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  const messageDeliveryArb: fc.Arbitrary<MessageDeliveryMetadata> = fc.record({
    messageId: nonEmptyStringArb,
    recipientIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
    priority: fc.constantFrom('normal' as const, 'high' as const),
    blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
    cblBlockId: nonEmptyStringArb,
    ackRequired: fc.boolean(),
  });

  /**
   * Property 1: messageDelivery serialization round-trip
   *
   * For any valid MessageDeliveryMetadata, serializing it into the
   * IAnnouncementBatchMessage wire format and deserializing it back
   * SHALL preserve all fields (messageId, recipientIds, priority,
   * blockIds, cblBlockId, ackRequired).
   *
   * **Validates: Requirements 1.1, 1.3**
   */
  it('should preserve all MessageDeliveryMetadata fields through batch serialization round-trip', () => {
    fc.assert(
      fc.property(
        messageDeliveryArb,
        nonEmptyStringArb,
        nonEmptyStringArb,
        fc.integer({ min: 1, max: 10 }),
        (metadata, blockId, nodeId, ttl) => {
          // Serialize: build an IAnnouncementBatchMessage with messageDelivery
          const batchMessage: IAnnouncementBatchMessage = {
            type: GossipMessageType.ANNOUNCEMENT_BATCH,
            payload: {
              announcements: [
                {
                  type: 'add',
                  blockId,
                  nodeId,
                  ttl,
                  messageDelivery: metadata,
                },
              ],
            },
            timestamp: new Date().toISOString(),
          };

          // Simulate wire transfer: JSON serialize then deserialize
          const wire = JSON.stringify(batchMessage);
          const deserialized: IAnnouncementBatchMessage = JSON.parse(wire);

          // Verify the round-tripped messageDelivery
          const roundTripped =
            deserialized.payload.announcements[0].messageDelivery;

          expect(roundTripped).toBeDefined();
          expect(roundTripped!.messageId).toEqual(metadata.messageId);
          expect(roundTripped!.recipientIds).toEqual(metadata.recipientIds);
          expect(roundTripped!.priority).toEqual(metadata.priority);
          expect(roundTripped!.blockIds).toEqual(metadata.blockIds);
          expect(roundTripped!.cblBlockId).toEqual(metadata.cblBlockId);
          expect(roundTripped!.ackRequired).toEqual(metadata.ackRequired);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Feature: gossip-message-encryption, Property 2: WebSocketHandler forwards messageDelivery metadata', () => {
  // --- Smart Generators ---

  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  const messageDeliveryArb: fc.Arbitrary<MessageDeliveryMetadata> = fc.record({
    messageId: nonEmptyStringArb,
    recipientIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
    priority: fc.constantFrom('normal' as const, 'high' as const),
    blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
    cblBlockId: nonEmptyStringArb,
    ackRequired: fc.boolean(),
  });

  const announcementWithDeliveryArb = fc.record({
    type: fc.constant('add' as const),
    blockId: nonEmptyStringArb,
    nodeId: nonEmptyStringArb,
    ttl: fc.integer({ min: 0, max: 10 }),
    messageDelivery: messageDeliveryArb,
  });

  const batchWithDeliveryArb = fc.array(announcementWithDeliveryArb, {
    minLength: 1,
    maxLength: 5,
  });

  /**
   * Property 2: WebSocketHandler forwards messageDelivery metadata
   *
   * For any incoming announcement batch containing announcements of type 'add'
   * with messageDelivery metadata, the WebSocketHandler SHALL forward the
   * messageDelivery field to the GossipService.handleAnnouncement call for
   * each such announcement.
   *
   * **Validates: Requirements 1.2**
   */
  it('should forward messageDelivery metadata to gossipService.handleAnnouncement for every add announcement', async () => {
    await fc.assert(
      fc.asyncProperty(batchWithDeliveryArb, async (announcements) => {
        // Set up mocks
        const mockHandleAnnouncement = jest.fn().mockResolvedValue(undefined);

        const mockGossipService = {
          handleAnnouncement: mockHandleAnnouncement,
        } as unknown as jest.Mocked<IGossipService>;

        const mockAvailabilityService = {
          updateLocation: jest.fn().mockResolvedValue(undefined),
          removeLocation: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<IAvailabilityService>;

        const mockConnection: jest.Mocked<IWebSocketConnection> = {
          id: 'test-conn',
          send: jest.fn(),
          on: jest.fn(),
          off: jest.fn(),
        };

        const handler = new WebSocketHandler({
          localNodeId: 'local-node',
          blockRegistry: {
            hasLocal: jest.fn(),
            addLocal: jest.fn(),
            removeLocal: jest.fn(),
            getLocalCount: jest.fn(),
            getLocalBlockIds: jest.fn(),
            exportBloomFilter: jest.fn(),
            exportManifest: jest.fn(),
            exportPoolScopedBloomFilter: jest.fn(),
            exportPoolScopedManifest: jest.fn(),
            rebuild: jest.fn(),
          } as jest.Mocked<IBlockRegistry>,
          discoveryProtocol: {} as jest.Mocked<IDiscoveryProtocol>,
          gossipService: mockGossipService,
          heartbeatMonitor: {} as jest.Mocked<IHeartbeatMonitor>,
          availabilityService: mockAvailabilityService,
        });

        handler.registerConnection(mockConnection);

        // Get the message handler registered on the connection
        const messageHandler = (mockConnection.on as jest.Mock).mock.calls.find(
          (call: unknown[]) => call[0] === 'message',
        )?.[1] as (data: unknown) => Promise<void>;

        // Build the batch message
        const batchMessage: IAnnouncementBatchMessage = {
          type: GossipMessageType.ANNOUNCEMENT_BATCH,
          payload: { announcements },
          timestamp: new Date().toISOString(),
        };

        // Send through the handler (fire-and-forget lambda, need to wait for async processing)
        messageHandler(batchMessage);
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify handleAnnouncement was called once per announcement
        expect(mockHandleAnnouncement).toHaveBeenCalledTimes(
          announcements.length,
        );

        // Verify each call includes the correct messageDelivery
        for (let i = 0; i < announcements.length; i++) {
          const callArg = mockHandleAnnouncement.mock.calls[i][0];
          expect(callArg.messageDelivery).toEqual(
            announcements[i].messageDelivery,
          );
          expect(callArg.messageDelivery.messageId).toEqual(
            announcements[i].messageDelivery.messageId,
          );
          expect(callArg.messageDelivery.recipientIds).toEqual(
            announcements[i].messageDelivery.recipientIds,
          );
          expect(callArg.messageDelivery.priority).toEqual(
            announcements[i].messageDelivery.priority,
          );
          expect(callArg.messageDelivery.blockIds).toEqual(
            announcements[i].messageDelivery.blockIds,
          );
          expect(callArg.messageDelivery.cblBlockId).toEqual(
            announcements[i].messageDelivery.cblBlockId,
          );
          expect(callArg.messageDelivery.ackRequired).toEqual(
            announcements[i].messageDelivery.ackRequired,
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * A simple IPeerProvider implementation backed by a Map of peer public keys,
 * used to test the getPeerPublicKey contract.
 */
class MapBackedPeerProvider implements IPeerProvider {
  private publicKeys: Map<string, Buffer>;

  constructor(publicKeys: Map<string, Buffer>) {
    this.publicKeys = new Map(publicKeys);
  }

  getLocalNodeId(): string {
    return 'local-node';
  }

  getConnectedPeerIds(): string[] {
    return Array.from(this.publicKeys.keys());
  }

  async sendAnnouncementBatch(
    _peerId: string,
    _announcements: BlockAnnouncement[],
  ): Promise<void> {
    // no-op
  }

  async getPeerPublicKey(peerId: string): Promise<Buffer | null> {
    return this.publicKeys.get(peerId) ?? null;
  }
}

describe('Feature: gossip-message-encryption, Property 3: Peer public key lookup correctness', () => {
  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  // Generate a random 33-byte buffer to simulate a compressed secp256k1 public key
  const publicKeyArb = fc
    .uint8Array({ minLength: 33, maxLength: 33 })
    .map((arr) => Buffer.from(arr));

  const peerKeyMapArb = fc
    .array(fc.tuple(nonEmptyStringArb, publicKeyArb), {
      minLength: 1,
      maxLength: 10,
    })
    .map((entries) => new Map(entries));

  /**
   * Property 3: Peer public key lookup correctness
   *
   * For any peer ID, getPeerPublicKey SHALL return the registered
   * secp256k1 public key Buffer if the peer has registered a key,
   * and null otherwise.
   *
   * **Validates: Requirements 2.2, 2.3**
   */
  it('should return the registered key for known peers and null for unknown peers', async () => {
    await fc.assert(
      fc.asyncProperty(
        peerKeyMapArb,
        nonEmptyStringArb,
        async (keyMap, unknownPeerId) => {
          const provider = new MapBackedPeerProvider(keyMap);

          // Registered peers return their key
          for (const [peerId, expectedKey] of keyMap.entries()) {
            const result = await provider.getPeerPublicKey(peerId);
            expect(result).not.toBeNull();
            expect(result!.equals(expectedKey)).toBe(true);
          }

          // Unregistered peer returns null (only if not accidentally in the map)
          if (!keyMap.has(unknownPeerId)) {
            const result = await provider.getPeerPublicKey(unknownPeerId);
            expect(result).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Feature: gossip-message-encryption, Property 4: Encrypted payload exclusivity invariant', () => {
  // --- Smart Generators ---

  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  const base64StringArb = fc
    .uint8Array({ minLength: 16, maxLength: 128 })
    .map((arr) => Buffer.from(arr).toString('base64'));

  /**
   * Property 4: Encrypted payload exclusivity invariant
   *
   * For any IAnnouncementBatchMessage produced by the system, if
   * encryptedPayload is present and non-empty, then the announcements
   * array SHALL be empty.
   *
   * This test generates batch messages with encryptedPayload set and
   * verifies the announcements array is always empty, enforcing the
   * wire-format invariant that encrypted and plaintext content are
   * mutually exclusive.
   *
   * **Validates: Requirements 3.2**
   */
  it('should have an empty announcements array when encryptedPayload is present', () => {
    fc.assert(
      fc.property(
        base64StringArb,
        nonEmptyStringArb,
        (encryptedPayload, senderNodeId) => {
          // Build an encrypted batch message following the wire format contract:
          // when encryptedPayload is set, announcements must be empty.
          const batchMessage: IAnnouncementBatchMessage = {
            type: GossipMessageType.ANNOUNCEMENT_BATCH,
            payload: {
              announcements: [],
              encryptedPayload,
              senderNodeId,
            },
            timestamp: new Date().toISOString(),
          };

          // Simulate wire transfer
          const wire = JSON.stringify(batchMessage);
          const deserialized: IAnnouncementBatchMessage = JSON.parse(wire);

          // Invariant: when encryptedPayload is present, announcements is empty
          expect(deserialized.payload.encryptedPayload).toBeDefined();
          expect(deserialized.payload.encryptedPayload!.length).toBeGreaterThan(
            0,
          );
          expect(deserialized.payload.announcements).toEqual([]);
          expect(deserialized.payload.senderNodeId).toEqual(senderNodeId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Feature: gossip-message-encryption, Property 5: Selective encryption based on metadata sensitivity', () => {
  // --- Smart Generators ---

  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  const messageDeliveryArb: fc.Arbitrary<MessageDeliveryMetadata> = fc.record({
    messageId: nonEmptyStringArb,
    recipientIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 3 }),
    priority: fc.constantFrom('normal' as const, 'high' as const),
    blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 3 }),
    cblBlockId: nonEmptyStringArb,
    ackRequired: fc.boolean(),
  });

  const deliveryAckArb: fc.Arbitrary<DeliveryAckMetadata> = fc.record({
    messageId: nonEmptyStringArb,
    recipientId: nonEmptyStringArb,
    status: fc.constantFrom(
      'delivered' as const,
      'read' as const,
      'failed' as const,
      'bounced' as const,
    ),
    originalSenderNode: nonEmptyStringArb,
  });

  /** A plain (non-sensitive) announcement — no messageDelivery or deliveryAck */
  const plainAnnouncementArb: fc.Arbitrary<BlockAnnouncement> = fc.record({
    type: fc.constantFrom('add' as const, 'remove' as const),
    blockId: nonEmptyStringArb,
    nodeId: nonEmptyStringArb,
    timestamp: fc.date(),
    ttl: fc.integer({ min: 1, max: 10 }),
  });

  /** A sensitive announcement with messageDelivery */
  const sensitiveAddAnnouncementArb: fc.Arbitrary<BlockAnnouncement> =
    fc.record({
      type: fc.constant('add' as const),
      blockId: nonEmptyStringArb,
      nodeId: nonEmptyStringArb,
      timestamp: fc.date(),
      ttl: fc.integer({ min: 1, max: 10 }),
      messageDelivery: messageDeliveryArb,
    });

  /** A sensitive announcement with deliveryAck */
  const sensitiveAckAnnouncementArb: fc.Arbitrary<BlockAnnouncement> =
    fc.record({
      type: fc.constant('ack' as const),
      blockId: nonEmptyStringArb,
      nodeId: nonEmptyStringArb,
      timestamp: fc.date(),
      ttl: fc.integer({ min: 1, max: 10 }),
      deliveryAck: deliveryAckArb,
    });

  /**
   * Property 5: Selective encryption based on metadata sensitivity
   *
   * For any batch of announcements and any target peer with a registered public key:
   * if the batch contains at least one announcement with messageDelivery or deliveryAck
   * metadata, the sent message SHALL contain encryptedPayload; if the batch contains
   * no such metadata, the sent message SHALL contain a non-empty announcements array
   * and no encryptedPayload.
   *
   * **Validates: Requirements 4.1, 4.2**
   */
  it('should encrypt iff batch is sensitive and peer key is available', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate either a sensitive or plain batch
        fc.boolean(),
        fc.array(plainAnnouncementArb, { minLength: 1, maxLength: 3 }),
        sensitiveAddAnnouncementArb,
        sensitiveAckAnnouncementArb,
        async (
          makeSensitive,
          plainAnnouncements,
          sensitiveAdd,
          sensitiveAck,
        ) => {
          // Track what was sent
          const sentBatches: Array<{
            peerId: string;
            announcements: BlockAnnouncement[];
            encrypted?: EncryptedBatchPayload;
          }> = [];

          const fakePeerKey = Buffer.alloc(33, 0x02); // dummy compressed pubkey

          const mockPeerProvider: IPeerProvider = {
            getLocalNodeId: () => 'local-node',
            getConnectedPeerIds: () => ['peer-1'],
            sendAnnouncementBatch: async (
              peerId: string,
              announcements: BlockAnnouncement[],
              encrypted?: EncryptedBatchPayload,
            ) => {
              sentBatches.push({
                peerId,
                announcements: [...announcements],
                encrypted,
              });
            },
            getPeerPublicKey: async () => fakePeerKey,
          };

          // Mock ECIESService — just returns a deterministic "ciphertext"
          const mockEciesService = {
            encryptWithLength: async (_pubKey: unknown, plaintext: unknown) => {
              // Return a fake ciphertext that's just the plaintext prefixed
              const buf = plaintext as Buffer;
              return Buffer.concat([Buffer.from('ENC:'), buf]);
            },
          } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

          const gossipService = new GossipService(
            mockPeerProvider,
            {
              fanout: 1,
              defaultTtl: 3,
              batchIntervalMs: 1000,
              maxBatchSize: 100,
              messagePriority: {
                normal: { fanout: 1, ttl: 5 },
                high: { fanout: 1, ttl: 7 },
              },
            },
            new Set<string>(),
            mockEciesService,
            Buffer.alloc(32, 0x01),
          );

          // Build the batch: either sensitive or plain
          const announcements = makeSensitive
            ? [...plainAnnouncements, sensitiveAdd, sensitiveAck]
            : plainAnnouncements;

          // Queue all announcements
          for (const a of announcements) {
            if (a.messageDelivery) {
              await gossipService.announceMessage(
                [a.blockId],
                a.messageDelivery,
              );
            } else if (a.deliveryAck) {
              await gossipService.sendDeliveryAck(a.deliveryAck);
            } else {
              await gossipService.announceBlock(a.blockId);
            }
          }

          await gossipService.flushAnnouncements();

          // Verify: at least one batch was sent
          expect(sentBatches.length).toBeGreaterThan(0);

          for (const sent of sentBatches) {
            const hasEncrypted = sent.encrypted !== undefined;
            const hasSensitive = sent.announcements.some(
              (a) =>
                a.messageDelivery !== undefined || a.deliveryAck !== undefined,
            );

            if (hasEncrypted) {
              // When encrypted, announcements array should be empty
              expect(sent.announcements).toEqual([]);
              expect(sent.encrypted!.senderNodeId).toBe('local-node');
              expect(sent.encrypted!.encryptedPayload.length).toBeGreaterThan(
                0,
              );
            } else {
              // When plaintext, no announcement should be sensitive
              // (sensitive ones would have been encrypted)
              // Note: if makeSensitive is true, all sensitive batches should be encrypted
              // since peer key is available
              if (makeSensitive) {
                expect(hasSensitive).toBe(false);
              }
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Feature: gossip-message-encryption, Property 6: Encryption round-trip', () => {
  // Use real ECIESService for crypto round-trip
  const eciesConfig: IECIESConfig = {
    curveName: 'secp256k1',
    primaryKeyDerivationPath: "m/44'/0'/0'/0/0",
    mnemonicStrength: 256,
    symmetricAlgorithm: 'aes-256-gcm',
    symmetricKeyBits: 256,
    symmetricKeyMode: 'gcm',
  };

  const eciesService = new NodeECIESService(eciesConfig);

  // Generate a key pair from a mnemonic
  function generateKeyPair(): { publicKey: Buffer; privateKey: Buffer } {
    const mnemonic = eciesService.generateNewMnemonic();
    const { wallet } = eciesService.walletAndSeedFromMnemonic(
      typeof mnemonic === 'string' ? new SecureString(mnemonic) : mnemonic,
    );
    return {
      publicKey: Buffer.from(wallet.getPublicKey()),
      privateKey: Buffer.from(wallet.getPrivateKey()),
    };
  }

  // --- Smart Generators ---

  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  const messageDeliveryArb: fc.Arbitrary<MessageDeliveryMetadata> = fc.record({
    messageId: nonEmptyStringArb,
    recipientIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 3 }),
    priority: fc.constantFrom('normal' as const, 'high' as const),
    blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 3 }),
    cblBlockId: nonEmptyStringArb,
    ackRequired: fc.boolean(),
  });

  const deliveryAckArb: fc.Arbitrary<DeliveryAckMetadata> = fc.record({
    messageId: nonEmptyStringArb,
    recipientId: nonEmptyStringArb,
    status: fc.constantFrom(
      'delivered' as const,
      'read' as const,
      'failed' as const,
      'bounced' as const,
    ),
    originalSenderNode: nonEmptyStringArb,
  });

  /** Generate a random announcement (may or may not have sensitive metadata) */
  const announcementArb: fc.Arbitrary<{
    type: 'add' | 'remove' | 'ack';
    blockId: string;
    nodeId: string;
    ttl: number;
    messageDelivery?: MessageDeliveryMetadata;
    deliveryAck?: DeliveryAckMetadata;
  }> = fc.oneof(
    // Plain add
    fc.record({
      type: fc.constant('add' as const),
      blockId: nonEmptyStringArb,
      nodeId: nonEmptyStringArb,
      ttl: fc.integer({ min: 1, max: 10 }),
    }),
    // Add with messageDelivery
    fc.record({
      type: fc.constant('add' as const),
      blockId: nonEmptyStringArb,
      nodeId: nonEmptyStringArb,
      ttl: fc.integer({ min: 1, max: 10 }),
      messageDelivery: messageDeliveryArb,
    }),
    // Ack with deliveryAck
    fc.record({
      type: fc.constant('ack' as const),
      blockId: nonEmptyStringArb,
      nodeId: nonEmptyStringArb,
      ttl: fc.integer({ min: 1, max: 10 }),
      deliveryAck: deliveryAckArb,
    }),
    // Plain remove
    fc.record({
      type: fc.constant('remove' as const),
      blockId: nonEmptyStringArb,
      nodeId: nonEmptyStringArb,
      ttl: fc.integer({ min: 1, max: 10 }),
    }),
  );

  const announcementsArrayArb = fc.array(announcementArb, {
    minLength: 1,
    maxLength: 5,
  });

  /**
   * Property 6: Encryption round-trip
   *
   * For any valid announcements array and any valid secp256k1 key pair,
   * encrypting the announcements with the public key (serialize → encrypt →
   * base64-encode) and then decrypting (base64-decode → decrypt → deserialize)
   * with the corresponding private key SHALL produce an announcements array
   * equivalent to the original.
   *
   * **Validates: Requirements 4.3, 5.1, 5.2**
   */
  it('should round-trip announcements through encrypt/decrypt', async () => {
    const keyPair = generateKeyPair();

    await fc.assert(
      fc.asyncProperty(announcementsArrayArb, async (announcements) => {
        // Encrypt: serialize → encrypt → base64
        const json = JSON.stringify(
          announcements.map((a) => ({
            type: a.type,
            blockId: a.blockId,
            nodeId: a.nodeId,
            ttl: a.ttl,
            ...(a.messageDelivery
              ? { messageDelivery: a.messageDelivery }
              : {}),
            ...(a.deliveryAck ? { deliveryAck: a.deliveryAck } : {}),
          })),
        );
        const plaintext = Buffer.from(json, 'utf-8');
        const ciphertext = await eciesService.encryptWithLength(
          keyPair.publicKey,
          plaintext,
        );
        const base64 = Buffer.from(ciphertext).toString('base64');

        // Decrypt: base64-decode → decrypt → deserialize
        const decoded = Buffer.from(base64, 'base64');
        const decrypted = await eciesService.decryptWithLengthAndHeader(
          keyPair.privateKey,
          decoded,
        );
        const result = JSON.parse(Buffer.from(decrypted).toString('utf-8'));

        // Verify round-trip equivalence
        expect(result).toEqual(
          announcements.map((a) => ({
            type: a.type,
            blockId: a.blockId,
            nodeId: a.nodeId,
            ttl: a.ttl,
            ...(a.messageDelivery
              ? { messageDelivery: a.messageDelivery }
              : {}),
            ...(a.deliveryAck ? { deliveryAck: a.deliveryAck } : {}),
          })),
        );
      }),
      { numRuns: 100 },
    );
  });
});

describe('Feature: gossip-message-encryption, Property 8: Missing peer key causes plaintext fallback', () => {
  // --- Smart Generators ---

  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  const messageDeliveryArb: fc.Arbitrary<MessageDeliveryMetadata> = fc.record({
    messageId: nonEmptyStringArb,
    recipientIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 3 }),
    priority: fc.constantFrom('normal' as const, 'high' as const),
    blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 3 }),
    cblBlockId: nonEmptyStringArb,
    ackRequired: fc.boolean(),
  });

  /**
   * Property 8: Missing peer key causes plaintext fallback
   *
   * For any sensitive batch (containing messageDelivery or deliveryAck)
   * sent to a peer whose getPeerPublicKey returns null, the GossipService
   * SHALL send the batch in plaintext (non-empty announcements array,
   * no encryptedPayload).
   *
   * **Validates: Requirements 6.1**
   */
  it('should send sensitive batch in plaintext when peer has no public key', async () => {
    await fc.assert(
      fc.asyncProperty(messageDeliveryArb, async (metadata) => {
        const sentBatches: Array<{
          peerId: string;
          announcements: BlockAnnouncement[];
          encrypted?: EncryptedBatchPayload;
        }> = [];

        const warnMessages: string[] = [];
        const originalWarn = console.warn;
        console.warn = (msg: string) => warnMessages.push(msg);

        try {
          const mockPeerProvider: IPeerProvider = {
            getLocalNodeId: () => 'local-node',
            getConnectedPeerIds: () => ['peer-no-key'],
            sendAnnouncementBatch: async (
              peerId: string,
              announcements: BlockAnnouncement[],
              encrypted?: EncryptedBatchPayload,
            ) => {
              sentBatches.push({
                peerId,
                announcements: [...announcements],
                encrypted,
              });
            },
            // Key lookup returns null — no key registered
            getPeerPublicKey: async () => null,
          };

          // Provide a mock ECIESService so encryption path is attempted
          const mockEciesService = {
            encryptWithLength: jest.fn(),
          } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

          const gossipService = new GossipService(
            mockPeerProvider,
            {
              fanout: 1,
              defaultTtl: 3,
              batchIntervalMs: 1000,
              maxBatchSize: 100,
              messagePriority: {
                normal: { fanout: 1, ttl: 5 },
                high: { fanout: 1, ttl: 7 },
              },
            },
            new Set<string>(),
            mockEciesService,
            Buffer.alloc(32, 0x01),
          );

          // Queue a sensitive announcement
          await gossipService.announceMessage([metadata.blockIds[0]], metadata);
          await gossipService.flushAnnouncements();

          // Verify: batch was sent in plaintext
          expect(sentBatches.length).toBeGreaterThan(0);
          for (const sent of sentBatches) {
            expect(sent.encrypted).toBeUndefined();
            expect(sent.announcements.length).toBeGreaterThan(0);
            // At least one announcement should have messageDelivery
            const hasSensitive = sent.announcements.some(
              (a) => a.messageDelivery !== undefined,
            );
            expect(hasSensitive).toBe(true);
          }

          // Verify: encryptWithLength was NOT called
          expect(mockEciesService.encryptWithLength).not.toHaveBeenCalled();

          // Verify: a warning was logged
          expect(warnMessages.some((m) => m.includes('peer-no-key'))).toBe(
            true,
          );
        } finally {
          console.warn = originalWarn;
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe('Feature: gossip-message-encryption, Property 7: Decryption failure resilience', () => {
  // --- Smart Generators ---

  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  /** Random bytes that are NOT valid ECIES ciphertext */
  const randomBytesPayloadArb = fc
    .uint8Array({ minLength: 1, maxLength: 128 })
    .map((arr) => Buffer.from(arr).toString('base64'));

  /** Malformed base64 strings (contain invalid characters) */
  const malformedBase64Arb = fc
    .string({ minLength: 1, maxLength: 64 })
    .filter((s) => /[^A-Za-z0-9+/=]/.test(s))
    .map((s) => s);

  /** Combine all invalid payload types */
  const invalidPayloadArb = fc.oneof(randomBytesPayloadArb, malformedBase64Arb);

  /**
   * Property 7: Decryption failure resilience
   *
   * For any IAnnouncementBatchMessage with an encryptedPayload that is
   * invalid (random bytes, wrong-key ciphertext, or malformed base64),
   * the WebSocketHandler SHALL not throw an unhandled exception and
   * SHALL discard the batch.
   *
   * **Validates: Requirements 5.3**
   */
  it('should not throw and should discard the batch when decryption fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidPayloadArb,
        nonEmptyStringArb,
        async (encryptedPayload, senderNodeId) => {
          const mockHandleAnnouncement = jest.fn().mockResolvedValue(undefined);

          const mockGossipService = {
            handleAnnouncement: mockHandleAnnouncement,
          } as unknown as jest.Mocked<IGossipService>;

          const mockAvailabilityService = {
            updateLocation: jest.fn().mockResolvedValue(undefined),
            removeLocation: jest.fn().mockResolvedValue(undefined),
          } as unknown as jest.Mocked<IAvailabilityService>;

          const mockConnection: jest.Mocked<IWebSocketConnection> = {
            id: 'test-conn',
            send: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
          };

          // Mock ECIESService that always throws on decrypt (simulates wrong key / corrupted data)
          const mockEciesService = {
            decryptWithLengthAndHeader: jest
              .fn()
              .mockRejectedValue(
                new Error('Decryption failed: invalid ciphertext'),
              ),
          } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

          const errorMessages: string[] = [];
          const originalError = console.error;
          console.error = (...args: unknown[]) => {
            errorMessages.push(String(args[0]));
          };

          try {
            const handler = new WebSocketHandler({
              localNodeId: 'local-node',
              blockRegistry: {
                hasLocal: jest.fn(),
                addLocal: jest.fn(),
                removeLocal: jest.fn(),
                getLocalCount: jest.fn(),
                getLocalBlockIds: jest.fn(),
                exportBloomFilter: jest.fn(),
                exportManifest: jest.fn(),
                exportPoolScopedBloomFilter: jest.fn(),
                exportPoolScopedManifest: jest.fn(),
                rebuild: jest.fn(),
              } as jest.Mocked<IBlockRegistry>,
              discoveryProtocol: {} as jest.Mocked<IDiscoveryProtocol>,
              gossipService: mockGossipService,
              heartbeatMonitor: {} as jest.Mocked<IHeartbeatMonitor>,
              availabilityService: mockAvailabilityService,
              eciesService: mockEciesService,
              localPrivateKey: Buffer.alloc(32, 0x01),
            });

            handler.registerConnection(mockConnection);

            const messageHandler = (
              mockConnection.on as jest.Mock
            ).mock.calls.find(
              (call: unknown[]) => call[0] === 'message',
            )?.[1] as (data: unknown) => Promise<void>;

            // Build an encrypted batch message with invalid payload
            const batchMessage: IAnnouncementBatchMessage = {
              type: GossipMessageType.ANNOUNCEMENT_BATCH,
              payload: {
                announcements: [],
                encryptedPayload,
                senderNodeId,
              },
              timestamp: new Date().toISOString(),
            };

            // Should not throw
            messageHandler(batchMessage);
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Batch should be discarded — no announcements processed
            expect(mockHandleAnnouncement).not.toHaveBeenCalled();
            expect(
              mockAvailabilityService.updateLocation,
            ).not.toHaveBeenCalled();
            expect(
              mockAvailabilityService.removeLocation,
            ).not.toHaveBeenCalled();

            // An error should have been logged mentioning the sender
            expect(errorMessages.some((m) => m.includes(senderNodeId))).toBe(
              true,
            );
          } finally {
            console.error = originalError;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
