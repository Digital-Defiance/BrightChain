/**
 * @fileoverview WCAP public key controller.
 *
 * Serves the signing member's compressed secp256k1 public key in PEM format
 * at `/.well-known/wcap-public-key-secp256k1.pem`.
 *
 * This is a simple Express Router (not BaseController) since it's a single
 * unauthenticated GET endpoint with no validation or handler pipeline.
 *
 * Requirement 3.1 — Serve public key at well-known URI
 * Requirement 3.2 — PEM-encoded compressed secp256k1 public key
 * Requirement 3.3 — Accessible without authentication
 * Requirement 3.4 — HTTP 503 when public key is not available
 * Requirement 3.5 — Cache-Control: public, max-age=86400
 * Requirement 8.1 — DER SubjectPublicKeyInfo with PEM armor
 */

import { Router } from 'express';
import { compressedKeyToPem } from '../middleware/compressed-key-to-pem';

/**
 * Creates an Express Router that serves the signing member's compressed
 * secp256k1 public key in PEM format.
 *
 * The router exposes a single GET handler at
 * `/wcap-public-key-secp256k1.pem` — mount it at `/.well-known` so the
 * full path becomes `/.well-known/wcap-public-key-secp256k1.pem`.
 *
 * @param getPublicKey - Provider function that returns the 33-byte compressed
 *   secp256k1 public key, or `undefined` when the key is not available
 *   (member not loaded or key not configured).
 * @returns Express Router with the public key GET handler
 */
export function createWcapPublicKeyRouter(
  getPublicKey: () => Uint8Array | undefined,
): Router {
  const router = Router();

  router.get('/wcap-public-key-secp256k1.pem', (_req, res) => {
    const publicKey = getPublicKey();

    if (!publicKey) {
      res.status(503).json({
        error: 'Service Unavailable',
        message:
          'WCAP signing public key is not available. The signing member may not be loaded or the key is not configured.',
      });
      return;
    }

    const pem = compressedKeyToPem(publicKey);

    res.set('Content-Type', 'application/x-pem-file');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(pem);
  });

  return router;
}
