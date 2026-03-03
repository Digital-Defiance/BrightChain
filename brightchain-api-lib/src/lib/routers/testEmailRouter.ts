/**
 * @fileoverview Test-only Express router that exposes captured emails
 * from the FakeEmailService singleton. Only mounted when
 * DISABLE_EMAIL_SEND=true (handled by application.ts).
 * @module routers/testEmailRouter
 */

import { Request, Response, Router } from 'express';
import { FakeEmailService } from '../services/fakeEmailService';

/**
 * Creates an Express router that serves captured test emails.
 *
 * GET /api/test/emails/:address — returns the JSON array of
 * CapturedEmail objects stored for the given recipient address.
 */
export function createTestEmailRouter(): Router {
  const router = Router();

  /**
   * GET /api/test/emails/:address - Retrieve captured emails for a recipient
   */
  router.get(
    '/api/test/emails/:address',
    (req: Request, res: Response): void => {
      const address = req.params['address'];
      if (typeof address !== 'string') {
        res.status(400).json({ error: 'Invalid address parameter' });
        return;
      }
      const emails = FakeEmailService.getInstance().getEmails(address);
      res.json(emails);
    },
  );

  return router;
}
