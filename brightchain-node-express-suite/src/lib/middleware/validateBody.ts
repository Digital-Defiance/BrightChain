import {
  BrandedInterfaceDefinition,
  safeParseInterface,
} from '@digitaldefiance/branded-interface';
import type { NextFunction, Request, Response } from 'express';

/**
 * Express middleware factory that validates the request body against a
 * BrandedInterfaceDefinition using safeParseInterface().
 *
 * On success: attaches the branded instance to `req.brandedBody` and calls `next()`.
 * On failure: responds with HTTP 400 and a JSON error body.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function validateBody<T extends Record<string, unknown>>(
  definition: BrandedInterfaceDefinition<T>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      res
        .status(400)
        .json({ error: 'Request body is missing or not an object' });
      return;
    }
    const result = safeParseInterface(req.body, definition);
    if (!result.success) {
      res.status(400).json({
        error: result.error.message,
        code: result.error.code,
        fieldErrors: result.error.fieldErrors ?? [],
      });
      return;
    }
    (req as Request & { brandedBody: unknown }).brandedBody = result.value;
    next();
  };
}
