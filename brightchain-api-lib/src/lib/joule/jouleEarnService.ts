/**
 * @fileoverview JouleEarnService — submits `OperatorGrantAction` payloads to
 * the Layer 3 asset ledger to credit Joule to member accounts.
 *
 * This service is intentionally thin: it validates inputs, builds the
 * ledger payload, and delegates persistence to the `ILedgerGrantWriter`
 * duck-typed interface.  The caller is responsible for supplying valid
 * operator quorum signatures.
 *
 * @see joule-resource-credits spec, Requirements 4.1, 4.4
 */

import { JOULE_ASSET_ID } from '@brightchain/brightchain-lib';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Duck-typed ledger grant writer (avoids direct dep on brightledger-assets-lib)
// ---------------------------------------------------------------------------

/**
 * Minimal duck-typed shape of the `IOperatorGrantAction` payload.
 * Mirrors `brightledger-assets-lib/src/lib/payloads/operatorGrantAction.ts`.
 */
export interface IOperatorGrantPayload {
  readonly kind: 'OperatorGrant';
  readonly assetId: Uint8Array;
  readonly to: Uint8Array;
  readonly microJoules: bigint;
  readonly reason: string;
  readonly quorumSignatures: ReadonlyArray<Uint8Array>;
  readonly nonce: bigint;
  readonly memo?: Uint8Array;
}

/**
 * Duck-typed writer for Layer 3 grant actions.
 *
 * Production code implements this by delegating to the real ledger shard.
 * Tests can supply a simple mock.
 */
export interface ILedgerGrantWriter {
  /**
   * Submit a grant action to the Layer 3 ledger.
   *
   * @returns A transaction identifier for the submitted action.
   */
  submitGrant(payload: IOperatorGrantPayload): Promise<string>;
}

// ---------------------------------------------------------------------------
// Validation errors
// ---------------------------------------------------------------------------

export type JouleGrantValidationError =
  | { code: 'AMOUNT_MUST_BE_POSITIVE'; microJoules: bigint }
  | { code: 'REASON_EMPTY' }
  | { code: 'REASON_TOO_LONG'; length: number; max: number }
  | { code: 'NO_SIGNATURES' };

/** Maximum allowed length of `reason` in UTF-16 code units. */
export const JOULE_GRANT_REASON_MAX_LENGTH = 256;

export class JouleGrantValidationError_ extends Error {
  constructor(public readonly errors: JouleGrantValidationError[]) {
    super(`Invalid OperatorGrant: ${errors.map((e) => e.code).join(', ')}`);
    this.name = 'JouleGrantValidationError';
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/** Options for `JouleEarnService`. */
export interface IJouleEarnServiceOptions {
  /** Nonce supplier; defaults to a random bigint derived from `uuidv4()`. */
  nonceProvider?: () => bigint;
}

/**
 * Service responsible for issuing Joule credits via operator-quorum grants.
 *
 * ### Usage
 *
 * ```ts
 * const earn = new JouleEarnService(ledgerWriter);
 * const txId = await earn.grant(
 *   memberIdBytes,
 *   500_000n,
 *   'Beta pilot promotional credit',
 *   [sig1, sig2],
 * );
 * ```
 */
export class JouleEarnService {
  private readonly nonceProvider: () => bigint;

  constructor(
    private readonly ledger: ILedgerGrantWriter,
    opts: IJouleEarnServiceOptions = {},
  ) {
    this.nonceProvider =
      opts.nonceProvider ??
      (() => {
        // Generate a unique nonce from a UUID by hashing its bytes.
        const id = uuidv4().replace(/-/g, '');
        return BigInt('0x' + id);
      });
  }

  /**
   * Issue a Joule grant to `memberId`.
   *
   * - Validates `microJoules > 0`, `reason` is 1–256 chars, and at least
   *   one quorum signature is present.
   * - Builds an `IOperatorGrantPayload` and submits it to the ledger.
   *
   * @param memberIdBytes  Raw public-key bytes of the recipient member.
   * @param microJoules    Amount to grant in µJ (must be > 0).
   * @param reason         Human-readable reason (1–256 chars, stored on-ledger).
   * @param quorumSigs     At least one operator quorum signature.
   * @returns Transaction ID returned by the ledger.
   *
   * @throws {JouleGrantValidationError_} on input validation failure.
   */
  async grant(
    memberIdBytes: Uint8Array,
    microJoules: bigint,
    reason: string,
    quorumSigs: ReadonlyArray<Uint8Array>,
    memo?: Uint8Array,
  ): Promise<string> {
    const errors = this.validate(microJoules, reason, quorumSigs);
    if (errors.length > 0) {
      throw new JouleGrantValidationError_(errors);
    }

    // Encode the canonical JOULE_ASSET_ID as a UTF-8 Uint8Array.
    const assetIdBytes = new TextEncoder().encode(JOULE_ASSET_ID);

    const payload: IOperatorGrantPayload = {
      kind: 'OperatorGrant',
      assetId: assetIdBytes,
      to: memberIdBytes,
      microJoules,
      reason,
      quorumSignatures: quorumSigs,
      nonce: this.nonceProvider(),
      memo,
    };

    return this.ledger.submitGrant(payload);
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  private validate(
    microJoules: bigint,
    reason: string,
    quorumSigs: ReadonlyArray<Uint8Array>,
  ): JouleGrantValidationError[] {
    const errors: JouleGrantValidationError[] = [];

    if (microJoules <= 0n) {
      errors.push({ code: 'AMOUNT_MUST_BE_POSITIVE', microJoules });
    }

    if (!reason || reason.trim().length === 0) {
      errors.push({ code: 'REASON_EMPTY' });
    } else if (reason.length > JOULE_GRANT_REASON_MAX_LENGTH) {
      errors.push({
        code: 'REASON_TOO_LONG',
        length: reason.length,
        max: JOULE_GRANT_REASON_MAX_LENGTH,
      });
    }

    if (!quorumSigs || quorumSigs.length === 0) {
      errors.push({ code: 'NO_SIGNATURES' });
    }

    return errors;
  }
}
