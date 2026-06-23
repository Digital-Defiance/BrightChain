/**
 * @fileoverview Test-only Express router that exposes captured emails
 * from the FakeEmailService singleton. Only mounted when
 * DISABLE_EMAIL_SEND=true (handled by application.ts).
 * @module routers/testEmailRouter
 */

import {
  FakeEmailService,
  type CapturedEmail,
} from '@digitaldefiance/node-express-suite';
import { Request, Response, Router } from 'express';

/**
 * Returns captured test emails for a recipient (same data as GET /emails/:address).
 */
export function listCapturedEmailsForAddress(address: string): CapturedEmail[] {
  return FakeEmailService.getInstance().getEmails(address);
}

/**
 * Creates an Express router that serves captured test emails.
 *
 * GET /emails/:address — returns the JSON array of
 * CapturedEmail objects stored for the given recipient address.
 *
 * This router uses relative paths and must be mounted at `/test` on
 * the `/api` sub-router (i.e. `router.use('/test', createTestEmailRouter())`).
 * The effective full path becomes `GET /api/test/emails/:address`.
 */
export function createTestEmailRouter(): Router {
  const router = Router();

  /**
   * GET /emails/:address - Retrieve captured emails for a recipient
   */
  router.get('/emails/:address', (req: Request, res: Response): void => {
    const address = req.params['address'];
    if (typeof address !== 'string') {
      res.status(400).json({ error: 'Invalid address parameter' });
      return;
    }
    res.json(listCapturedEmailsForAddress(address));
  });

  return router;
}
