import request from 'supertest';
import express, { Express } from 'express';
import { createMessageRouter } from './messageRouter';
import { MessagePassingService } from '../services/messagePassingService';
import { MessagePriority } from '@brightchain/brightchain-lib';

describe('Message Router API Endpoints', () => {
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

  describe('Task 13.1: POST /messages - Send message', () => {
    it('should send message with valid payload', async () => {
      mockService.sendMessage.mockResolvedValue('msg-123');

      const response = await request(app)
        .post('/messages')
        .send({
          content: Buffer.from('test content').toString('base64'),
          senderId: 'sender-1',
          messageType: 'test',
          recipients: ['recipient-1'],
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ messageId: 'msg-123' });
      expect(mockService.sendMessage).toHaveBeenCalled();
    });

    it('should return 400 for missing content', async () => {
      const response = await request(app)
        .post('/messages')
        .send({
          senderId: 'sender-1',
          messageType: 'test',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should return 400 for missing senderId', async () => {
      const response = await request(app)
        .post('/messages')
        .send({
          content: Buffer.from('test').toString('base64'),
          messageType: 'test',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should return 400 for missing messageType', async () => {
      const response = await request(app)
        .post('/messages')
        .send({
          content: Buffer.from('test').toString('base64'),
          senderId: 'sender-1',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should use default priority if not provided', async () => {
      mockService.sendMessage.mockResolvedValue('msg-123');

      await request(app)
        .post('/messages')
        .send({
          content: Buffer.from('test').toString('base64'),
          senderId: 'sender-1',
          messageType: 'test',
        });

      expect(mockService.sendMessage).toHaveBeenCalledWith(
        expect.any(Buffer),
        'sender-1',
        expect.objectContaining({
          priority: MessagePriority.NORMAL,
        })
      );
    });

    it('should handle service errors', async () => {
      mockService.sendMessage.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/messages')
        .send({
          content: Buffer.from('test').toString('base64'),
          senderId: 'sender-1',
          messageType: 'test',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Service error');
    });
  });

  describe('Task 13.2: GET /messages/:id - Retrieve message', () => {
    it('should retrieve existing message', async () => {
      const content = Buffer.from('test content');
      mockService.getMessage.mockResolvedValue(content);

      const response = await request(app).get('/messages/msg-123');

      expect(response.status).toBe(200);
      expect(response.body.content).toBe(content.toString('base64'));
      expect(mockService.getMessage).toHaveBeenCalledWith('msg-123');
    });

    it('should return 404 for non-existent message', async () => {
      mockService.getMessage.mockResolvedValue(null);

      const response = await request(app).get('/messages/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Message not found');
    });

    it('should handle service errors', async () => {
      mockService.getMessage.mockRejectedValue(new Error('Service error'));

      const response = await request(app).get('/messages/msg-123');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Service error');
    });
  });

  describe('Task 13.3: GET /messages - Query messages', () => {
    it('should query messages with filters', async () => {
      const mockResults = {
        messages: [{ id: 'msg-1' }, { id: 'msg-2' }],
        total: 2,
        page: 1,
        pageSize: 50,
      };
      mockService.queryMessages.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/messages')
        .query({
          recipientId: 'recipient-1',
          senderId: 'sender-1',
          messageType: 'test',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResults);
      expect(mockService.queryMessages).toHaveBeenCalledWith({
        recipientId: 'recipient-1',
        senderId: 'sender-1',
        messageType: 'test',
        page: 1,
        pageSize: 50,
      });
    });

    it('should use default pagination values', async () => {
      mockService.queryMessages.mockResolvedValue({
        messages: [],
        total: 0,
        page: 1,
        pageSize: 50,
      });

      await request(app).get('/messages');

      expect(mockService.queryMessages).toHaveBeenCalledWith({
        recipientId: undefined,
        senderId: undefined,
        messageType: undefined,
        page: 1,
        pageSize: 50,
      });
    });

    it('should accept custom pagination', async () => {
      mockService.queryMessages.mockResolvedValue({
        messages: [],
        total: 0,
        page: 2,
        pageSize: 10,
      });

      await request(app).get('/messages').query({ page: '2', pageSize: '10' });

      expect(mockService.queryMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          pageSize: 10,
        })
      );
    });

    it('should handle service errors', async () => {
      mockService.queryMessages.mockRejectedValue(new Error('Service error'));

      const response = await request(app).get('/messages');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Service error');
    });
  });

  describe('Task 13.4: DELETE /messages/:id - Delete message', () => {
    it('should delete existing message', async () => {
      mockService.deleteMessage.mockResolvedValue(undefined);

      const response = await request(app).delete('/messages/msg-123');

      expect(response.status).toBe(204);
      expect(mockService.deleteMessage).toHaveBeenCalledWith('msg-123');
    });

    it('should return 404 for non-existent message', async () => {
      mockService.deleteMessage.mockRejectedValue(new Error('Not found'));

      const response = await request(app).delete('/messages/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Message not found');
    });
  });
});
