/**
 * Property-Based Tests for Message Operations
 *
 * Feature: api-server-operations
 * Property 1: Message Round-Trip Consistency
 * Property 2: Message Query Filter Correctness
 * Property 3: Message Deletion Removes Access
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 *
 * Property 1: For any valid message content, senderId, and messageType, storing the message
 * via POST /api/messages and then retrieving it via GET /api/messages/:id SHALL return
 * the same content (base64 decoded).
 *
 * Property 2: For any set of stored messages and any filter criteria (recipientId, senderId,
 * messageType), querying GET /api/messages with those filters SHALL return only messages
 * that match ALL specified filter criteria.
 *
 * Property 3: For any stored message, after DELETE /api/messages/:id returns 204,
 * subsequent GET /api/messages/:id SHALL return 404.
 */

import {
  DurabilityLevel,
  IMessageMetadata,
  MessageEncryptionScheme,
  MessagePriority,
  ReplicationStatus,
} from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import { IBrightChainApplication } from '../../interfaces';
import { MessagePassingService } from '../../services/messagePassingService';
import { MessagesController } from './messages';

// Mock application for testing
const createMockApplication = () => {
  return {
    db: {
      connection: {
        readyState: 1,
      },
    },
    environment: {
      mongo: {
        useTransactions: false,
      },
      debug: false,
    },
    constants: {},
    ready: true,
    services: new Map(),
    plugins: {},
    getModel: () => {
      throw new Error('not implemented');
    },
    getController: () => {
      throw new Error('not implemented');
    },
    setController: () => {},
    start: async () => {},
  } as unknown as IBrightChainApplication;
};

// Type for accessing private handlers
interface MessagesControllerHandlers {
  handlers: {
    sendMessage: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: unknown }>;
    getMessage: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: unknown }>;
    queryMessages: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: unknown }>;
    deleteMessage: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: unknown }>;
  };
}

// In-memory message store for testing
class InMemoryMessageStore {
  private messages: Map<
    string,
    { content: Buffer; metadata: IMessageMetadata }
  > = new Map();
  private messageCounter = 0;

  async sendMessage(
    content: Buffer,
    senderId: string,
    options: {
      recipients: string[];
      messageType: string;
      priority: MessagePriority;
      senderId: string;
      encryptionScheme: unknown;
    },
  ): Promise<{ messageId: string; magnetUrl: string }> {
    const messageId = `msg-${++this.messageCounter}`;
    const magnetUrl = `magnet:?xt=urn:brightchain:cbl&id=${messageId}`;
    const now = new Date();

    const metadata: IMessageMetadata = {
      // IBlockMetadata fields
      blockId: messageId,
      createdAt: now,
      expiresAt: null,
      durabilityLevel: DurabilityLevel.Standard,
      parityBlockIds: [],
      accessCount: 0,
      lastAccessedAt: now,
      replicationStatus: ReplicationStatus.Pending,
      targetReplicationFactor: 0,
      replicaNodeIds: [],
      size: content.length,
      checksum: messageId,
      // IMessageMetadata fields
      messageType: options.messageType,
      senderId: options.senderId,
      recipients: options.recipients,
      priority: options.priority,
      deliveryStatus: new Map(),
      acknowledgments: new Map(),
      encryptionScheme:
        (options.encryptionScheme as MessageEncryptionScheme) ||
        MessageEncryptionScheme.NONE,
      isCBL: false,
    };

    this.messages.set(messageId, { content, metadata });
    return { messageId, magnetUrl };
  }

  async getMessage(messageId: string): Promise<Buffer | null> {
    const message = this.messages.get(messageId);
    return message ? message.content : null;
  }

  async queryMessages(
    query: Record<string, unknown>,
  ): Promise<IMessageMetadata[]> {
    const results: IMessageMetadata[] = [];

    for (const [, { metadata }] of this.messages) {
      let matches = true;

      if (query['senderId'] && metadata.senderId !== query['senderId']) {
        matches = false;
      }
      if (
        query['recipientId'] &&
        !metadata.recipients.includes(query['recipientId'] as string)
      ) {
        matches = false;
      }
      if (
        query['messageType'] &&
        metadata.messageType !== query['messageType']
      ) {
        matches = false;
      }

      if (matches) {
        results.push(metadata);
      }
    }

    return results;
  }

  async deleteMessage(messageId: string): Promise<void> {
    this.messages.delete(messageId);
  }

  clear(): void {
    this.messages.clear();
    this.messageCounter = 0;
  }
}

// Helper to create a controller instance with mocked service
const createTestController = (store: InMemoryMessageStore) => {
  const mockApp = createMockApplication();
  const controller = new MessagesController(mockApp as never);

  // Create a mock service that uses the in-memory store
  const mockService = {
    sendMessage: store.sendMessage.bind(store),
    getMessage: store.getMessage.bind(store),
    queryMessages: store.queryMessages.bind(store),
    deleteMessage: store.deleteMessage.bind(store),
  } as unknown as MessagePassingService;

  controller.setMessageService(mockService);
  return controller;
};

// Arbitrary generators for message data
const messageContentArb = fc.string({ minLength: 1, maxLength: 1000 });
const senderIdArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);
const messageTypeArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);
const recipientIdArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

describe('Message Operations Property Tests', () => {
  let store: InMemoryMessageStore;

  beforeEach(() => {
    store = new InMemoryMessageStore();
  });

  afterEach(() => {
    store.clear();
  });

  describe('Property 1: Message Round-Trip Consistency', () => {
    /**
     * Property 1: For any valid message content, senderId, and messageType,
     * storing the message via POST /api/messages and then retrieving it via
     * GET /api/messages/:id SHALL return the same content (base64 decoded).
     *
     * **Validates: Requirements 1.1, 1.2**
     */
    it('Property 1: Message round-trip preserves content', async () => {
      await fc.assert(
        fc.asyncProperty(
          messageContentArb,
          senderIdArb,
          messageTypeArb,
          async (content, senderId, messageType) => {
            // Feature: api-server-operations, Property 1: Message Round-Trip Consistency
            const controller = createTestController(store);
            const handlers = (
              controller as unknown as MessagesControllerHandlers
            ).handlers;

            // Store the message
            const sendRequest = {
              body: {
                content: Buffer.from(content).toString('base64'),
                senderId,
                messageType,
                recipients: [],
              },
            };

            const sendResult = await handlers.sendMessage(sendRequest);
            expect(sendResult.statusCode).toBe(201);

            const sendResponse = sendResult.response as {
              messageId: string;
              magnetUrl: string;
            };
            expect(sendResponse.messageId).toBeDefined();
            expect(sendResponse.magnetUrl).toBeDefined();

            // Retrieve the message
            const getRequest = {
              params: { id: sendResponse.messageId },
            };

            const getResult = await handlers.getMessage(getRequest);
            expect(getResult.statusCode).toBe(200);

            const getResponse = getResult.response as { content: string };
            const retrievedContent = Buffer.from(
              getResponse.content,
              'base64',
            ).toString();

            // Verify content matches
            expect(retrievedContent).toBe(content);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 1b: Message round-trip works with binary content
     */
    it('Property 1b: Message round-trip preserves binary content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 500 }),
          senderIdArb,
          messageTypeArb,
          async (binaryContent, senderId, messageType) => {
            // Feature: api-server-operations, Property 1: Message Round-Trip Consistency
            const controller = createTestController(store);
            const handlers = (
              controller as unknown as MessagesControllerHandlers
            ).handlers;

            const contentBuffer = Buffer.from(binaryContent);

            // Store the message
            const sendRequest = {
              body: {
                content: contentBuffer.toString('base64'),
                senderId,
                messageType,
                recipients: [],
              },
            };

            const sendResult = await handlers.sendMessage(sendRequest);
            expect(sendResult.statusCode).toBe(201);

            const sendResponse = sendResult.response as { messageId: string };

            // Retrieve the message
            const getRequest = {
              params: { id: sendResponse.messageId },
            };

            const getResult = await handlers.getMessage(getRequest);
            expect(getResult.statusCode).toBe(200);

            const getResponse = getResult.response as { content: string };
            const retrievedBuffer = Buffer.from(getResponse.content, 'base64');

            // Verify binary content matches
            expect(retrievedBuffer.equals(contentBuffer)).toBe(true);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 2: Message Query Filter Correctness', () => {
    /**
     * Property 2: For any set of stored messages and any filter criteria
     * (recipientId, senderId, messageType), querying GET /api/messages with
     * those filters SHALL return only messages that match ALL specified filter criteria.
     *
     * **Validates: Requirements 1.3**
     */
    it('Property 2: Query filters return only matching messages', async () => {
      // Generate pools of IDs to use for both messages and filters
      const senderPool = fc.constantFrom('sender-a', 'sender-b', 'sender-c');
      const typePool = fc.constantFrom('type-x', 'type-y', 'type-z');

      await fc.assert(
        fc.asyncProperty(
          // Generate a pool of recipient IDs to use
          fc.array(recipientIdArb, { minLength: 3, maxLength: 5 }),
          fc.array(
            fc.record({
              content: messageContentArb,
              senderId: senderPool,
              messageType: typePool,
              recipientIndices: fc.array(fc.integer({ min: 0, max: 4 }), {
                minLength: 0,
                maxLength: 3,
              }),
            }),
            { minLength: 1, maxLength: 10 },
          ),
          // Generate filter criteria
          fc.record({
            senderId: fc.option(senderPool, { nil: undefined }),
            messageType: fc.option(typePool, { nil: undefined }),
            recipientIndex: fc.option(fc.integer({ min: 0, max: 4 }), {
              nil: undefined,
            }),
          }),
          async (recipientPool, messages, filters) => {
            // Map recipient indices to actual recipient IDs
            const messagesWithRecipients = messages.map((msg) => ({
              ...msg,
              recipients: msg.recipientIndices
                .filter((i: number) => i < recipientPool.length)
                .map((i: number) => recipientPool[i]),
            }));

            const filterRecipientId =
              filters.recipientIndex !== undefined &&
              filters.recipientIndex < recipientPool.length
                ? recipientPool[filters.recipientIndex]
                : undefined;

            // Feature: api-server-operations, Property 2: Message Query Filter Correctness
            store.clear();
            const controller = createTestController(store);
            const handlers = (
              controller as unknown as MessagesControllerHandlers
            ).handlers;

            // Store all messages
            const storedMessages: Array<{
              messageId: string;
              senderId: string;
              messageType: string;
              recipients: string[];
            }> = [];

            for (const msg of messagesWithRecipients) {
              const sendRequest = {
                body: {
                  content: Buffer.from(msg.content).toString('base64'),
                  senderId: msg.senderId,
                  messageType: msg.messageType,
                  recipients: msg.recipients,
                },
              };

              const sendResult = await handlers.sendMessage(sendRequest);
              const sendResponse = sendResult.response as { messageId: string };
              storedMessages.push({
                messageId: sendResponse.messageId,
                senderId: msg.senderId,
                messageType: msg.messageType,
                recipients: msg.recipients,
              });
            }

            // Query with filters
            const queryRequest = {
              query: {
                senderId: filters.senderId,
                messageType: filters.messageType,
                recipientId: filterRecipientId,
              },
            };

            const queryResult = await handlers.queryMessages(queryRequest);
            expect(queryResult.statusCode).toBe(200);

            const queryResponse = queryResult.response as {
              messages: IMessageMetadata[];
            };

            // Verify all returned messages match ALL filter criteria
            for (const metadata of queryResponse.messages) {
              if (filters.senderId) {
                expect(metadata.senderId).toBe(filters.senderId);
              }
              if (filters.messageType) {
                expect(metadata.messageType).toBe(filters.messageType);
              }
              if (filterRecipientId) {
                expect(metadata.recipients).toContain(filterRecipientId);
              }
            }

            // Verify no matching messages were excluded
            const expectedCount = storedMessages.filter((msg) => {
              if (filters.senderId && msg.senderId !== filters.senderId)
                return false;
              if (
                filters.messageType &&
                msg.messageType !== filters.messageType
              )
                return false;
              if (
                filterRecipientId &&
                !msg.recipients.includes(filterRecipientId)
              )
                return false;
              return true;
            }).length;

            expect(queryResponse.messages.length).toBe(expectedCount);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 2b: Empty filters return all messages
     */
    it('Property 2b: Empty filters return all messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              content: messageContentArb,
              senderId: senderIdArb,
              messageType: messageTypeArb,
            }),
            { minLength: 1, maxLength: 5 },
          ),
          async (messages) => {
            // Feature: api-server-operations, Property 2: Message Query Filter Correctness
            store.clear();
            const controller = createTestController(store);
            const handlers = (
              controller as unknown as MessagesControllerHandlers
            ).handlers;

            // Store all messages
            for (const msg of messages) {
              const sendRequest = {
                body: {
                  content: Buffer.from(msg.content).toString('base64'),
                  senderId: msg.senderId,
                  messageType: msg.messageType,
                  recipients: [],
                },
              };
              await handlers.sendMessage(sendRequest);
            }

            // Query with no filters
            const queryRequest = { query: {} };
            const queryResult = await handlers.queryMessages(queryRequest);
            expect(queryResult.statusCode).toBe(200);

            const queryResponse = queryResult.response as {
              messages: IMessageMetadata[];
            };

            // All messages should be returned
            expect(queryResponse.messages.length).toBe(messages.length);

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 3: Message Deletion Removes Access', () => {
    /**
     * Property 3: For any stored message, after DELETE /api/messages/:id returns 204,
     * subsequent GET /api/messages/:id SHALL return 404.
     *
     * **Validates: Requirements 1.4**
     */
    it('Property 3: Deleted messages are no longer accessible', async () => {
      await fc.assert(
        fc.asyncProperty(
          messageContentArb,
          senderIdArb,
          messageTypeArb,
          async (content, senderId, messageType) => {
            // Feature: api-server-operations, Property 3: Message Deletion Removes Access
            const controller = createTestController(store);
            const handlers = (
              controller as unknown as MessagesControllerHandlers
            ).handlers;

            // Store a message
            const sendRequest = {
              body: {
                content: Buffer.from(content).toString('base64'),
                senderId,
                messageType,
                recipients: [],
              },
            };

            const sendResult = await handlers.sendMessage(sendRequest);
            const sendResponse = sendResult.response as { messageId: string };
            const messageId = sendResponse.messageId;

            // Verify message exists
            const getRequest = { params: { id: messageId } };
            const getResult = await handlers.getMessage(getRequest);
            expect(getResult.statusCode).toBe(200);

            // Delete the message
            const deleteRequest = { params: { id: messageId } };
            const deleteResult = await handlers.deleteMessage(deleteRequest);
            expect(deleteResult.statusCode).toBe(204);

            // Verify message is no longer accessible
            const getAfterDeleteResult = await handlers.getMessage(getRequest);
            expect(getAfterDeleteResult.statusCode).toBe(404);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 3b: Deleting a message removes it from query results
     */
    it('Property 3b: Deleted messages are excluded from query results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              content: messageContentArb,
              senderId: senderIdArb,
              messageType: messageTypeArb,
            }),
            { minLength: 2, maxLength: 5 },
          ),
          fc.integer({ min: 0 }),
          async (messages, deleteIndexSeed) => {
            // Feature: api-server-operations, Property 3: Message Deletion Removes Access
            store.clear();
            const controller = createTestController(store);
            const handlers = (
              controller as unknown as MessagesControllerHandlers
            ).handlers;

            // Store all messages
            const messageIds: string[] = [];
            for (const msg of messages) {
              const sendRequest = {
                body: {
                  content: Buffer.from(msg.content).toString('base64'),
                  senderId: msg.senderId,
                  messageType: msg.messageType,
                  recipients: [],
                },
              };
              const sendResult = await handlers.sendMessage(sendRequest);
              const sendResponse = sendResult.response as { messageId: string };
              messageIds.push(sendResponse.messageId);
            }

            // Delete one message
            const deleteIndex = deleteIndexSeed % messages.length;
            const deleteRequest = { params: { id: messageIds[deleteIndex] } };
            await handlers.deleteMessage(deleteRequest);

            // Query all messages
            const queryRequest = { query: {} };
            const queryResult = await handlers.queryMessages(queryRequest);
            const queryResponse = queryResult.response as {
              messages: IMessageMetadata[];
            };

            // Verify deleted message is not in results
            expect(queryResponse.messages.length).toBe(messages.length - 1);
            const returnedIds = queryResponse.messages.map((m) => m.blockId);
            expect(returnedIds).not.toContain(messageIds[deleteIndex]);

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
