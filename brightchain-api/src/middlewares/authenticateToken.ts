import { NextFunction, Request, Response } from 'express';
import { IApplication } from '../interfaces/application';

/**
 * Middleware to authenticate JWT tokens
 */
export async function authenticateToken(
  application: IApplication,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  // Temporary implementation - just pass through
  // TODO: Implement proper JWT authentication
  next();
}
