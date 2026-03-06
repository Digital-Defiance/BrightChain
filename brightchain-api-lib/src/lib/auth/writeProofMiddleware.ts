/**
 * @fileoverview ACL middleware for extracting Write_Proof from data route requests.
 *
 * Extracts the `X-Write-Proof` header (JSON-serialized IWriteProof) on
 * existing data routes and passes the write proof through to collection
 * operations for head registry enforcement.
 *
 * @see BrightDB Write ACLs design, ACL Express Middleware section
 * @see Requirements 5.5, 3.1
 */

import type { IWriteProof } from '@brightchain/brightchain-lib';
import type { NextFunction, Request, Response } from 'express';

/**
 * Key used to attach the parsed write proof to the Express request object.
 */
export const WRITE_PROOF_KEY = 'writeProof';

/**
 * Augment Express Request to carry an optional write proof.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      writeProof?: IWriteProof;
    }
  }
}

/**
 * Express middleware that extracts a Write_Proof from the `X-Write-Proof`
 * request header. If the header is present, it is parsed from JSON and
 * attached to `req.writeProof`. If the header is absent, the request
 * proceeds without a proof (Open_Mode collections don't require one).
 *
 * Binary fields (`signerPublicKey`, `signature`) are expected as hex strings
 * in the JSON and are converted to Uint8Array.
 *
 * @see Requirements 5.5, 3.1
 */
export function extractWriteProof(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers['x-write-proof'] as string | undefined;

  if (!header) {
    // No write proof provided — this is fine for Open_Mode
    next();
    return;
  }

  try {
    const parsed = JSON.parse(header) as Record<string, unknown>;

    const proof: IWriteProof = {
      signerPublicKey: Uint8Array.from(
        Buffer.from((parsed['signerPublicKey'] as string) ?? '', 'hex'),
      ),
      signature: Uint8Array.from(
        Buffer.from((parsed['signature'] as string) ?? '', 'hex'),
      ),
      dbName: (parsed['dbName'] as string) ?? '',
      collectionName: (parsed['collectionName'] as string) ?? '',
      blockId: (parsed['blockId'] as string) ?? '',
    };

    req.writeProof = proof;
    next();
  } catch {
    res.status(400).json({
      error: 'Invalid Write_Proof',
      message:
        'X-Write-Proof header must contain valid JSON-serialized IWriteProof',
    });
  }
}
