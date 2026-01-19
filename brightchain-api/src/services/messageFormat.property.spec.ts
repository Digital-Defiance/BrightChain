import * as fc from 'fast-check';
import { MessagePassingType } from '../enumerations/websocketMessageType';
import {
  IEventSubscribeMessage,
  IMessageAckMessage,
  IMessageQueryMessage,
  IMessageReceivedMessage,
  IMessageSendMessage,
} from '../interfaces/websocketMessages';

describe('Property 24: Message Format Consistency', () => {
  it('Property 24a: MESSAGE_SEND has required fields (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
        fc.string({ minLength: 1 }),
        (messageId, senderId, recipients, requestId) => {
          const message: IMessageSendMessage = {
            type: MessagePassingType.MESSAGE_SEND,
            payload: { messageId, senderId, recipients },
            timestamp: new Date().toISOString(),
            requestId,
          };

          expect(message.type).toBe(MessagePassingType.MESSAGE_SEND);
          expect(message.payload.messageId).toBe(messageId);
          expect(message.payload.senderId).toBe(senderId);
          expect(message.payload.recipients).toEqual(recipients);
          expect(message.requestId).toBe(requestId);
          expect(message.timestamp).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 24b: MESSAGE_RECEIVED has required fields (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (messageId, recipientId, requestId) => {
          const message: IMessageReceivedMessage = {
            type: MessagePassingType.MESSAGE_RECEIVED,
            payload: { messageId, recipientId },
            timestamp: new Date().toISOString(),
            requestId,
          };

          expect(message.type).toBe(MessagePassingType.MESSAGE_RECEIVED);
          expect(message.payload.messageId).toBe(messageId);
          expect(message.payload.recipientId).toBe(recipientId);
          expect(message.requestId).toBe(requestId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 24c: MESSAGE_ACK has required fields (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.constantFrom('DELIVERED', 'FAILED'),
        fc.string({ minLength: 1 }),
        (messageId, recipientId, status, requestId) => {
          const message: IMessageAckMessage = {
            type: MessagePassingType.MESSAGE_ACK,
            payload: { messageId, recipientId, status },
            timestamp: new Date().toISOString(),
            requestId,
          };

          expect(message.type).toBe(MessagePassingType.MESSAGE_ACK);
          expect(message.payload.messageId).toBe(messageId);
          expect(message.payload.recipientId).toBe(recipientId);
          expect(message.payload.status).toBe(status);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 24d: MESSAGE_QUERY has optional filters (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.option(fc.string({ minLength: 1 })),
        fc.option(fc.string({ minLength: 1 })),
        fc.option(fc.string({ minLength: 1 })),
        fc.string({ minLength: 1 }),
        (recipientId, senderId, messageType, requestId) => {
          const message: IMessageQueryMessage = {
            type: MessagePassingType.MESSAGE_QUERY,
            payload: {
              ...(recipientId && { recipientId }),
              ...(senderId && { senderId }),
              ...(messageType && { messageType }),
            },
            timestamp: new Date().toISOString(),
            requestId,
          };

          expect(message.type).toBe(MessagePassingType.MESSAGE_QUERY);
          if (recipientId)
            expect(message.payload.recipientId).toBe(recipientId);
          if (senderId) expect(message.payload.senderId).toBe(senderId);
          if (messageType)
            expect(message.payload.messageType).toBe(messageType);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 24e: EVENT_SUBSCRIBE has optional filters (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.option(fc.array(fc.string({ minLength: 1 }), { minLength: 1 })),
        fc.option(fc.string({ minLength: 1 })),
        fc.option(fc.string({ minLength: 1 })),
        fc.string({ minLength: 1 }),
        (types, senderId, recipientId, requestId) => {
          const message: IEventSubscribeMessage = {
            type: MessagePassingType.EVENT_SUBSCRIBE,
            payload: {
              ...(types && { types }),
              ...(senderId && { senderId }),
              ...(recipientId && { recipientId }),
            },
            timestamp: new Date().toISOString(),
            requestId,
          };

          expect(message.type).toBe(MessagePassingType.EVENT_SUBSCRIBE);
          if (types) expect(message.payload.types).toEqual(types);
          if (senderId) expect(message.payload.senderId).toBe(senderId);
          if (recipientId)
            expect(message.payload.recipientId).toBe(recipientId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 24f: All messages use message: prefix (50 iterations)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(MessagePassingType)),
        (type) => {
          expect(type).toMatch(/^message:/);
        },
      ),
      { numRuns: 50 },
    );
  });
});
