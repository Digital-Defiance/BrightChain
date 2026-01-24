import express, { Express } from 'express';
import fc from 'fast-check';
import request from 'supertest';
import { createMessageRouter } from '../routers/messageRouter';
import { MessagePassingService } from '../services/messagePassingService';

/**
 * Property tests for invalid message payload rejection
 * Validates Requirement 12.6
 */
describe('Feature: message-passing-and-events, Property: Invalid Message Payload Rejection', () => {
  let app: Express;
  let mockService: jest.Mocked<MessagePassingService>;

  beforeEach(() => {
    mockService = {
      sendMessage: jest.fn(),
      getMessage: jest.fn(),
      queryMessages: jest.fn(),
      deleteMessage: jest.fn(),
    } as unknown as jest.Mocked<MessagePassingService>;

    app = express();
    app.use(express.json());
    app.use(createMessageRouter(mockService));
  });

  /**
   * Property 31a: Missing required fields rejected with 400
   * Any payload missing content, senderId, or messageType should return 400
   */
  it('Property 31a: should reject payloads missing required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          content: fc.option(fc.string(), { nil: undefined }),
          senderId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          messageType: fc.option(fc.string({ minLength: 1 }), {
            nil: undefined,
          }),
        }),
        async (payload) => {
          // Only test when at least one required field is missing
          if (!payload.content || !payload.senderId || !payload.messageType) {
            const response = await request(app).post('/messages').send(payload);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Missing required fields');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 31b: Empty string fields rejected with 400
   * Empty strings for required fields should be rejected
   */
  it('Property 31b: should reject empty string required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('content', 'senderId', 'messageType'),
        async (emptyField) => {
          const payload: Record<string, string> = {
            content: Buffer.from('test').toString('base64'),
            senderId: 'sender-1',
            messageType: 'test',
          };
          payload[emptyField] = '';

          const response = await request(app).post('/messages').send(payload);

          expect(response.status).toBe(400);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 31c: Invalid JSON body handled
   * Malformed requests should be handled gracefully
   */
  it('Property 31c: should handle malformed requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 32 }),
        async (senderId) => {
          const response = await request(app)
            .post('/messages')
            .send({
              content: 123, // Invalid type
              senderId,
              messageType: 'test',
            })
            .timeout(1000);

          // Express may return 400 or 500 depending on how it handles the type error
          expect([400, 500]).toContain(response.status);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 31d: Service errors return 500
   * Any service error should return 500 status
   */
  it('Property 31d: should return 500 for service errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorMessage) => {
          mockService.sendMessage.mockRejectedValue(new Error(errorMessage));

          const response = await request(app)
            .post('/messages')
            .send({
              content: Buffer.from('test').toString('base64'),
              senderId: 'sender-1',
              messageType: 'test',
            });

          expect(response.status).toBe(500);
          expect(response.body.error).toBe(errorMessage);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 31e: Valid payloads accepted
   * Any payload with all required fields should be accepted
   */
  it('Property 31e: should accept valid payloads', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        async (content, senderId, messageType) => {
          mockService.sendMessage.mockResolvedValue({
            messageId: 'msg-123',
            magnetUrl: 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc&b2=def',
          });

          const response = await request(app)
            .post('/messages')
            .send({
              content: Buffer.from(content).toString('base64'),
              senderId,
              messageType,
            });

          expect(response.status).toBe(201);
          expect(response.body.messageId).toBe('msg-123');
        },
      ),
      { numRuns: 100, endOnFailure: true },
    );
  });
});
