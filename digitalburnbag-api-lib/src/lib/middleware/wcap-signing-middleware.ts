/**
 * @fileoverview WCAP signing middleware factory.
 *
 * Creates Express middleware that intercepts `res.end()` to compute a SHA-256
 * hash of the response body, sign it with the member's secp256k1 private key
 * via `EciesSignature.signMessage()`, and attach a `Content-Signature` header.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3,
 *            4.2, 5.1, 5.3, 5.4, 6.2, 9.1, 12.2, 12.3
 */

import type { IWcapConfig } from '@brightchain/digitalburnbag-lib';
import { serializeContentSignature } from '@brightchain/digitalburnbag-lib';
import { EciesCryptoCore, EciesSignature } from '@digitaldefiance/ecies-lib';
import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Context required by the WCAP signing middleware factory.
 */
export interface IWcapSigningContext {
  /**
   * Returns the signing member's secp256k1 private key bytes for the given
   * request, or `undefined` if the key is not available.
   */
  getPrivateKey: (req: Request) => Uint8Array | undefined;
  /** WCAP configuration */
  config: IWcapConfig;
  /** Optional logger — falls back to `console` when omitted */
  logger?: {
    warn: (msg: string) => void;
    error: (msg: string, err?: unknown) => void;
  };
}

/**
 * Creates Express middleware that signs HTTP 200 response bodies with a WCAP
 * `Content-Signature` header.
 *
 * The middleware wraps `res.end()` so that when the downstream handler calls
 * `res.end(buf)`:
 *
 * 1. If the status is not 200 or the body is empty, the original `res.end()`
 *    is called unchanged.
 * 2. Otherwise it computes `SHA-256(buf)`, signs the 32-byte hash with
 *    `EciesSignature.signMessage(privateKey, hash)`, serializes the
 *    `Content-Signature` header, sets it on the response, and calls the
 *    original `res.end(buf)`.
 *
 * Graceful degradation:
 * - If `config.enabled === false`, the middleware is a no-op pass-through.
 * - If `getPrivateKey(req)` returns `undefined`, a warning is logged and the
 *   response is served without signing.
 * - If signing throws, the error is logged and the response is served without
 *   signing.
 */
export function createWcapSigningMiddleware(
  context: IWcapSigningContext,
): (req: Request, res: Response, next: NextFunction) => void {
  const { config, getPrivateKey } = context;
  const log = context.logger ?? {
    warn: (msg: string) => console.warn(msg),
    error: (msg: string, err?: unknown) => console.error(msg, err),
  };

  // Create the EciesSignature instance once — it is stateless aside from its
  // EciesCryptoCore dependency.
  const eciesSignature = new EciesSignature(new EciesCryptoCore());

  return (req: Request, res: Response, next: NextFunction): void => {
    // Requirement 4.2 — no-op when signing is disabled
    if (config.enabled === false) {
      next();
      return;
    }

    // Retrieve the private key for this request
    const privateKey = getPrivateKey(req);

    if (privateKey === undefined) {
      // Requirement 1.6 — skip signing, log warning, serve without header
      log.warn(
        `[WCAP] Signing skipped: private key not available for request ${req.method} ${req.path}`,
      );
      next();
      return;
    }

    // Wrap res.end() to intercept the response body buffer
    const originalEnd = res.end.bind(res);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).end = function wrappedEnd(
      chunk?: unknown,
      encodingOrCallback?: BufferEncoding | (() => void),
      callback?: () => void,
    ): Response {
      // Normalise the overloaded arguments of res.end()
      let encoding: BufferEncoding | undefined;
      let cb: (() => void) | undefined;

      if (typeof encodingOrCallback === 'function') {
        cb = encodingOrCallback;
      } else {
        encoding = encodingOrCallback;
        cb = callback;
      }

      // Convert the chunk to a Buffer so we can hash it
      let body: Buffer | undefined;
      if (chunk != null) {
        if (Buffer.isBuffer(chunk)) {
          body = chunk;
        } else if (chunk instanceof Uint8Array) {
          body = Buffer.from(chunk);
        } else if (typeof chunk === 'string') {
          body = Buffer.from(chunk, encoding ?? 'utf8');
        }
      }

      // Requirement 6.2 — only sign HTTP 200 responses with a non-empty body
      if (res.statusCode === 200 && body && body.length > 0) {
        try {
          // Requirement 1.1, 9.1 — SHA-256 hash in a single synchronous pass
          const hash = createHash('sha256').update(body).digest();

          // Requirement 1.2, 5.3 — sign the hash with the member's private key
          const signature = eciesSignature.signMessage(
            privateKey,
            new Uint8Array(hash),
          );

          // Requirement 1.3, 12.2, 12.3 — serialize the Content-Signature header
          const headerValue = serializeContentSignature({
            alg: config.algorithmSuite,
            key_uri: config.keyUriPath,
            sig: Buffer.from(signature).toString('base64'),
            ...(config.kid !== undefined ? { kid: config.kid } : {}),
            ...(config.policy !== undefined ? { policy: config.policy } : {}),
          });

          res.setHeader('Content-Signature', headerValue);
        } catch (err: unknown) {
          // Requirement 1.7 — catch signing errors, log, serve without header
          const message = err instanceof Error ? err.message : String(err);
          log.error(
            `[WCAP] Signing failed for request ${req.method} ${req.path}: ${message}`,
            err,
          );
        }
      }

      // Call the original res.end() with the unchanged body
      if (cb !== undefined) {
        return originalEnd(chunk as never, encoding as never, cb);
      }
      if (encoding !== undefined) {
        return originalEnd(chunk as never, encoding);
      }
      return originalEnd(chunk as never);
    };

    next();
  };
}
