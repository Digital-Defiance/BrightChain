/**
 * @fileoverview Admin-only Express router that exposes the FakeEmailService
 * captured email store for inspection and clearing. Mounted at
 * /admin/emails on the API sub-router when EMAIL_SERVICE=fake or
 * DISABLE_EMAIL_SEND=true. Requires authenticated admin or system member.
 * @module routers/adminEmailRouter
 */

import { MemberType } from '@digitaldefiance/ecies-lib';
import { Request, Response, Router } from 'express';
import { requireAuthWithMemberTypes } from '../middlewares/authentication';
import { FakeEmailService } from '@digitaldefiance/node-express-suite';

/**
 * Creates an Express router that exposes the FakeEmailService captured email
 * store for admin inspection and management.
 *
 * This router uses relative paths and must be mounted at /admin/emails on
 * the /api sub-router (i.e. router.use('/admin/emails', createAdminEmailRouter(...))).
 *
 * Effective routes (all require admin or system member auth):
 *   GET    /api/admin/emails           — list all recipients with email counts
 *   GET    /api/admin/emails/:address  — get all captured emails for an address
 *   DELETE /api/admin/emails           — clear all captured emails
 *
 * @param jwtSecret - JWT secret used to verify the Bearer token
 */
export function createAdminEmailRouter(jwtSecret: string): Router {
  const router = Router();
  const requireAdmin = requireAuthWithMemberTypes(
    jwtSecret,
    MemberType.Admin,
    MemberType.System,
  );

  /**
   * GET / — list all recipients and email counts
   */
  router.get(
    '/',
    ...requireAdmin,
    (_req: Request, res: Response): void => {
      const service = FakeEmailService.getInstance();
      const recipients = service.getAllRecipients().map((address) => ({
        address,
        count: service.getEmails(address).length,
      }));
      res.json({ recipients });
    },
  );

  /**
   * GET /:address — retrieve captured emails for a recipient
   */
  router.get(
    '/:address',
    ...requireAdmin,
    (req: Request, res: Response): void => {
      const address = req.params['address'];
      if (typeof address !== 'string' || address.trim() === '') {
        res.status(400).json({ error: 'Invalid address parameter' });
        return;
      }
      const emails = FakeEmailService.getInstance().getEmails(address);
      res.json(emails);
    },
  );

  /**
   * DELETE / — clear all captured emails
   */
  router.delete(
    '/',
    ...requireAdmin,
    (_req: Request, res: Response): void => {
      FakeEmailService.getInstance().clear();
      res.json({ success: true });
    },
  );

  return router;
}
