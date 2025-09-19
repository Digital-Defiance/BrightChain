import { NextFunction, Request, Response } from 'express';

/**
 * Middleware to clean up crypto resources after request completion
 * Should be used after crypto operations to ensure private keys are disposed
 */
export function cleanupCrypto(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Store original end function
  const originalEnd = res.end;

  // Override end function to cleanup before response
  const wrappedEnd = function (this: Response, ...args: unknown[]) {
    // Cleanup burnbagUser if it exists
    if (req.burnbagUser) {
      try {
        // Dispose of sensitive cryptographic material
        req.burnbagUser.dispose();
        req.burnbagUser = undefined;
      } catch (error) {
        console.error('Error cleaning up crypto resources:', error);
      }
    }
    // Do not dispose system user here; it may be a process-wide singleton

    // Call original end function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalEnd as unknown as (...a: any[]) => Response).apply(
      this,
      args,
    );
  } as unknown as typeof res.end;

  res.end = wrappedEnd;

  next();
}
