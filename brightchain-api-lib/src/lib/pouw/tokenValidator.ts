import { createHmac, timingSafeEqual } from 'crypto';

import { IChallengeToken } from '@brightchain/brightchain-lib';

/**
 * Tracks a consumed challenge token for replay prevention.
 */
interface IConsumedToken {
  workUnitId: string;
  consumedAt: number;
  /** Expires at the same time as the original token */
  expiresAt: number;
}

/**
 * Result of a token validation check.
 */
export interface TokenValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Creates, signs, and validates HMAC-signed challenge tokens.
 * Tracks consumed tokens to prevent replay attacks.
 *
 * Uses Node.js `crypto.createHmac('sha512', secret)` for HMAC signing
 * and `crypto.timingSafeEqual` for constant-time signature comparison.
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
export class TokenValidator {
  private readonly hmacSecret: string;
  private readonly tokenTtlSeconds: number;
  private readonly consumedTokens = new Map<string, IConsumedToken>();

  constructor(hmacSecret: string, tokenTtlSeconds: number) {
    this.hmacSecret = hmacSecret;
    this.tokenTtlSeconds = tokenTtlSeconds;
  }

  /**
   * Create and sign a new challenge token.
   *
   * 1. Build the token payload with workUnitId, clientId, issuedAt, expiresAt
   * 2. Compute HMAC-SHA512 of the payload fields
   * 3. Return the signed IChallengeToken
   *
   * @param workUnitId - The work unit this token is bound to
   * @param clientId - The client identifier this token is bound to
   * @returns A signed IChallengeToken
   */
  createToken(workUnitId: string, clientId: string): IChallengeToken {
    const now = Date.now();
    const issuedAt = now;
    const expiresAt = now + this.tokenTtlSeconds * 1000;

    const signature = this.computeHmac(
      workUnitId,
      clientId,
      issuedAt,
      expiresAt,
    );

    return {
      workUnitId,
      clientId,
      issuedAt,
      expiresAt,
      signature,
    };
  }

  /**
   * Serialize a token to a base64 string for HTTP transport.
   *
   * @param token - The challenge token to encode
   * @returns Base64-encoded JSON string
   */
  encodeToken(token: IChallengeToken): string {
    return Buffer.from(JSON.stringify(token)).toString('base64');
  }

  /**
   * Validate a token: checks HMAC, expiration, client binding, and replay.
   *
   * Validation order:
   * 1. Base64-decode and JSON.parse
   * 2. Check expiration
   * 3. Check client binding
   * 4. Recompute and verify HMAC signature (constant-time comparison)
   * 5. Check replay (consumed tokens map)
   *
   * @param encodedToken - Base64-encoded token string
   * @param clientId - The client identifier to validate against
   * @returns Validation result with valid flag and optional reason
   */
  validateToken(encodedToken: string, clientId: string): TokenValidationResult {
    let token: IChallengeToken;
    try {
      const json = Buffer.from(encodedToken, 'base64').toString('utf-8');
      token = JSON.parse(json) as IChallengeToken;
    } catch {
      return { valid: false, reason: 'Invalid token encoding' };
    }

    // Check expiration
    if (token.expiresAt < Date.now()) {
      return { valid: false, reason: 'Token expired' };
    }

    // Check client binding
    if (token.clientId !== clientId) {
      return { valid: false, reason: 'Client mismatch' };
    }

    // Recompute HMAC and compare using constant-time comparison
    const expectedSignature = this.computeHmac(
      token.workUnitId,
      token.clientId,
      token.issuedAt,
      token.expiresAt,
    );

    const sigBuffer = Buffer.from(token.signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    // Guard against length mismatch (would throw in timingSafeEqual)
    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, reason: 'Invalid signature' };
    }

    if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, reason: 'Invalid signature' };
    }

    // Check replay
    if (this.consumedTokens.has(token.workUnitId)) {
      return { valid: false, reason: 'Token already consumed' };
    }

    return { valid: true };
  }

  /**
   * Mark a token as consumed for replay prevention.
   *
   * @param workUnitId - The work unit ID to mark as consumed
   * @param expiresAt - Optional expiration timestamp; defaults to now + tokenTtlSeconds
   */
  consumeToken(workUnitId: string, expiresAt?: number): void {
    this.consumedTokens.set(workUnitId, {
      workUnitId,
      consumedAt: Date.now(),
      expiresAt: expiresAt ?? Date.now() + this.tokenTtlSeconds * 1000,
    });
  }

  /**
   * Periodic cleanup of expired consumed-token entries.
   * Removes entries whose expiresAt is in the past.
   */
  cleanupConsumed(): void {
    const now = Date.now();
    for (const [key, entry] of this.consumedTokens.entries()) {
      if (entry.expiresAt < now) {
        this.consumedTokens.delete(key);
      }
    }
  }

  /**
   * Compute HMAC-SHA512 of the token payload fields.
   *
   * @returns Hex string of the HMAC digest
   */
  private computeHmac(
    workUnitId: string,
    clientId: string,
    issuedAt: number,
    expiresAt: number,
  ): string {
    const payload = JSON.stringify({
      workUnitId,
      clientId,
      issuedAt,
      expiresAt,
    });
    return createHmac('sha512', this.hmacSecret).update(payload).digest('hex');
  }
}
