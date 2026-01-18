import { Router, Request, Response } from 'express';
import { MessagePassingService } from '../services/messagePassingService';
import { MessagePriority } from '@brightchain/brightchain-lib';

export function createMessageRouter(service: MessagePassingService): Router {
  const router = Router();

  /**
   * POST /messages - Send a message
   */
  router.post('/messages', async (req: Request, res: Response): Promise<void> => {
    try {
      const { content, senderId, recipients, messageType, priority, encryptionScheme } = req.body;

      if (!content || !senderId || !messageType) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const contentBuffer = Buffer.from(content, 'base64');
      const messageId = await service.sendMessage(contentBuffer, senderId, {
        recipients: recipients || [],
        messageType,
        priority: priority || MessagePriority.NORMAL,
        senderId,
        encryptionScheme: encryptionScheme || 0,
      });

      res.status(201).json({ messageId });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * GET /messages/:id - Get a message
   */
  router.get('/messages/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const content = await service.getMessage(req.params['id'] as string);
      
      if (!content) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      res.json({ content: content.toString('base64') });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * GET /messages - Query messages
   */
  router.get('/messages', async (req: Request, res: Response) => {
    try {
      const query = {
        recipientId: req.query['recipientId'] as string,
        senderId: req.query['senderId'] as string,
        messageType: req.query['messageType'] as string,
        page: parseInt(req.query['page'] as string) || 1,
        pageSize: parseInt(req.query['pageSize'] as string) || 50,
      };

      const results = await service.queryMessages(query);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * DELETE /messages/:id - Delete a message
   */
  router.delete('/messages/:id', async (req: Request, res: Response) => {
    try {
      await service.deleteMessage(req.params['id'] as string);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: 'Message not found' });
    }
  });

  return router;
}
