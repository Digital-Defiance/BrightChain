/**
 * @fileoverview createAssetsRouter — Express Router factory for the
 * programmable-asset-ledger REST API.
 *
 * Routes mounted on the returned router:
 *   GET  /assets                                — list all registered assets
 *   GET  /assets/:assetId                       — single asset descriptor
 *   GET  /assets/:assetId/supply                — supply totals
 *   GET  /accounts/:account/balances            — all balances for an account
 *   GET  /accounts/:account/balances/:assetId   — single balance
 *   GET  /accounts/:account/history             — paginated entry history
 *   GET  /entries/:entryHash/proof              — inclusion proof
 *   GET  /shards/:shardId/settlement            — shard settlement status
 *   GET  /head                                  — ledger head info
 *   POST /submit                                — enqueue an action
 *
 * The router is prefixed with the `prefix` argument (default: `''` — callers
 * typically mount the whole router under `/v1/assets-ledger`).
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.6
 */

import type { AuthorizedSignerSet } from '@brightchain/brightchain-lib';
import { Router, type Request, type Response } from 'express';
import type { BalanceProjectionService } from '../balanceProjection.js';
import type {
  IAssetLedgerWriter,
  ISubmissionReceipt,
  ISubmissionRejection,
  SubmissionService,
} from '../submissionService.js';
import { AssetValidationErrorCode } from '../validationResult.js';
import type { ILedgerContext } from '../validator.js';

// ── HTTP status map ───────────────────────────────────────────────────────────

/**
 * Maps `AssetValidationErrorCode` strings (and a small set of SubmissionService
 * code strings) to their canonical HTTP status codes.
 *
 * A single switch is intentional per the spec's error-handling section.
 */
function validationCodeToStatus(code: string): number {
  switch (
    code as
      | AssetValidationErrorCode
      | 'MALFORMED'
      | 'OVERSIZED'
      | 'RATE_LIMIT'
      | 'ASSET_DISABLED'
      | 'REDACTED'
  ) {
    case AssetValidationErrorCode.AssetRetired:
      return 409;
    case AssetValidationErrorCode.AssetNotFound:
      return 404;
    case AssetValidationErrorCode.AssetAlreadyRegistered:
      return 409;
    case AssetValidationErrorCode.InsufficientBalance:
      return 422;
    case AssetValidationErrorCode.NonceMismatch:
      return 409;
    case AssetValidationErrorCode.Expired:
      return 410;
    case AssetValidationErrorCode.AccountFrozen:
      return 423;
    case AssetValidationErrorCode.WhitelistViolation:
      return 403;
    case AssetValidationErrorCode.QuorumNotSatisfied:
      return 403;
    case AssetValidationErrorCode.SupplyPolicyViolation:
      return 422;
    case AssetValidationErrorCode.InvalidDecimals:
      return 400;
    case AssetValidationErrorCode.MemoTooLong:
      return 413;
    case AssetValidationErrorCode.ConservationViolation:
      return 500;
    case AssetValidationErrorCode.ShardUnknown:
      return 404;
    case AssetValidationErrorCode.ShardSeqGap:
      return 409;
    case AssetValidationErrorCode.ShardSeqOverlap:
      return 409;
    case AssetValidationErrorCode.ProcessKeyExpired:
      return 403;
    case AssetValidationErrorCode.ProcessKeyRevoked:
      return 403;
    case AssetValidationErrorCode.ProcessKeyDuplicate:
      return 409;
    case AssetValidationErrorCode.DeltaOrderViolation:
      return 422;
    case AssetValidationErrorCode.DisputeWindowClosed:
      return 410;
    case AssetValidationErrorCode.DisputeDuplicate:
      return 409;
    case AssetValidationErrorCode.SignerMismatch:
      return 403;
    case AssetValidationErrorCode.SystemPolicyNotSatisfied:
      return 403;
    case AssetValidationErrorCode.BurnNotAllowed:
      return 422;
    case AssetValidationErrorCode.DisputeNotFound:
      return 404;
    case 'MALFORMED':
      return 400;
    case 'OVERSIZED':
      return 413;
    case 'RATE_LIMIT':
      return 429;
    case 'ASSET_DISABLED':
      return 404;
    case 'REDACTED':
      return 451;
    default:
      return 400;
  }
}

// ── Dependency injection bag ──────────────────────────────────────────────────

/**
 * Dependencies injected into every route handler.
 */
export interface IAssetsDeps {
  readonly projectionService: BalanceProjectionService;
  readonly submissionService: SubmissionService;
  readonly ledger: IAssetLedgerWriter;
  /** Ledger identifier string (e.g., a UUID or well-known name). */
  readonly ledgerId: string;
  /**
   * Factory that produces an `ILedgerContext` for a given request, allowing
   * callers to inject auth-derived signer keys, now-clock, etc.
   *
   * If omitted, a minimal context with `now = Date.now()` is used and signer
   * public keys are extracted from the `X-Signer-Public-Key` header
   * (hex-encoded, comma-separated).
   */
  readonly contextFactory?: (req: Request) => ILedgerContext;
  /**
   * System-level `AuthorizedSignerSet` required to authorise
   * `OperatorFreezeAction` submissions.  When supplied it is injected into
   * the `ILedgerContext` produced by the default context factory.
   */
  readonly systemSignerSet?: AuthorizedSignerSet;
  /**
   * Human-readable message returned in 451 responses for redacted entries.
   * Defaults to a generic unavailability message.
   */
  readonly redactionMessage?: string;
}

// ── Shared utilities ──────────────────────────────────────────────────────────

/** Convert any serialisable bigint values to strings for JSON responses. */
function bigintReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

/** Send a JSON response that handles bigint serialisation. */
function sendJson(res: Response, status: number, body: unknown): void {
  res.status(status).type('json').end(JSON.stringify(body, bigintReplacer));
}

/** Build a default `ILedgerContext` from request headers. */
function defaultContextFactory(req: Request): ILedgerContext {
  const raw = (req.headers['x-signer-public-key'] as string | undefined) ?? '';
  const signerPublicKeys = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((hex) => Buffer.from(hex, 'hex') as Uint8Array);
  const derivedAssetId = req.headers['x-asset-id'] as string | undefined;
  return {
    now: Date.now(),
    signerPublicKeys,
    ...(derivedAssetId !== undefined ? { derivedAssetId } : {}),
  };
}

// ── Router factory ────────────────────────────────────────────────────────────

/**
 * Create an Express `Router` with all asset-ledger REST endpoints.
 *
 * @param deps - Injected services.
 * @param prefix - Optional path prefix applied to all routes (default: `''`).
 */
export function createAssetsRouter(deps: IAssetsDeps, prefix = ''): Router {
  const router = Router();
  // If caller provides their own contextFactory, use it as-is.
  // Otherwise build one that merges the default header-based factory with the
  // optional systemSignerSet supplied in deps.
  const contextFactory =
    deps.contextFactory ??
    ((req: Request): ILedgerContext => ({
      ...defaultContextFactory(req),
      ...(deps.systemSignerSet !== undefined
        ? { systemSignerSet: deps.systemSignerSet }
        : {}),
    }));

  // ── GET /assets ─────────────────────────────────────────────────────────
  router.get(`${prefix}/assets`, (_req: Request, res: Response) => {
    const { assets, retiredAssets, issuedTotal, burnedTotal } =
      deps.projectionService.state;

    const result: unknown[] = [];
    for (const [assetId, descriptor] of assets) {
      result.push({
        assetId,
        ...descriptor,
        issuerPublicKey: undefined, // not stored in descriptor
        issuedTotal: issuedTotal.get(assetId) ?? 0n,
        burnedTotal: burnedTotal.get(assetId) ?? 0n,
        retired: retiredAssets.has(assetId),
      });
    }
    sendJson(res, 200, result);
  });

  // ── GET /assets/:assetId ────────────────────────────────────────────────
  router.get(`${prefix}/assets/:assetId`, (req: Request, res: Response) => {
    const { assetId } = req.params as { assetId: string };
    const { assets, retiredAssets, issuedTotal, burnedTotal } =
      deps.projectionService.state;

    const descriptor = assets.get(assetId);
    if (descriptor === undefined) {
      sendJson(res, 404, {
        code: AssetValidationErrorCode.AssetNotFound,
        error: `Asset '${assetId}' not found.`,
      });
      return;
    }

    sendJson(res, 200, {
      assetId,
      ...descriptor,
      issuedTotal: issuedTotal.get(assetId) ?? 0n,
      burnedTotal: burnedTotal.get(assetId) ?? 0n,
      retired: retiredAssets.has(assetId),
    });
  });

  // ── GET /assets/:assetId/supply ─────────────────────────────────────────
  router.get(
    `${prefix}/assets/:assetId/supply`,
    (req: Request, res: Response) => {
      const { assetId } = req.params as { assetId: string };
      const { assets, issuedTotal, burnedTotal } = deps.projectionService.state;

      if (!assets.has(assetId)) {
        sendJson(res, 404, {
          code: AssetValidationErrorCode.AssetNotFound,
          error: `Asset '${assetId}' not found.`,
        });
        return;
      }

      const issued = issuedTotal.get(assetId) ?? 0n;
      const burned = burnedTotal.get(assetId) ?? 0n;
      const circulatingSupply = issued - burned;

      sendJson(res, 200, {
        assetId,
        issuedTotal: issued,
        burnedTotal: burned,
        circulatingSupply,
      });
    },
  );

  // ── GET /accounts/:account/balances ─────────────────────────────────────
  router.get(
    `${prefix}/accounts/:account/balances`,
    (req: Request, res: Response) => {
      const { account } = req.params as { account: string };
      const { balances } = deps.projectionService.state;

      const result: Record<string, string> = {};
      for (const [assetId, accountMap] of balances) {
        const bal = accountMap.get(account);
        if (bal !== undefined && bal > 0n) {
          result[assetId] = bal.toString();
        }
      }

      sendJson(res, 200, { account, balances: result });
    },
  );

  // ── GET /accounts/:account/balances/:assetId ────────────────────────────
  router.get(
    `${prefix}/accounts/:account/balances/:assetId`,
    (req: Request, res: Response) => {
      const { account, assetId } = req.params as {
        account: string;
        assetId: string;
      };
      const { assets, balances } = deps.projectionService.state;

      if (!assets.has(assetId)) {
        sendJson(res, 404, {
          code: AssetValidationErrorCode.AssetNotFound,
          error: `Asset '${assetId}' not found.`,
        });
        return;
      }

      const bal = balances.get(assetId)?.get(account) ?? 0n;
      sendJson(res, 200, { account, assetId, balance: bal.toString() });
    },
  );

  // ── GET /accounts/:account/history ──────────────────────────────────────
  // Cursor-paginated; optional ?assetId= filter and ?cursor= for paging.
  router.get(
    `${prefix}/accounts/:account/history`,
    (_req: Request, res: Response) => {
      // History requires iterating ledger entries which is not part of the
      // projection — this is a placeholder returning an empty paginated set.
      // Full implementation requires ledger.getEntries() iteration (Phase 5+).
      sendJson(res, 200, { entries: [], cursor: null });
    },
  );

  // ── GET /entries/:entryHash/proof ───────────────────────────────────────
  router.get(
    `${prefix}/entries/:entryHash/proof`,
    (req: Request, res: Response) => {
      const { entryHash } = req.params as { entryHash: string };

      if (!/^[0-9a-fA-F]+$/.test(entryHash)) {
        sendJson(res, 400, {
          code: 'MALFORMED',
          error: 'entryHash must be a hex string.',
        });
        return;
      }

      // Operator redaction check — must come before proof lookup (Req 9.3).
      if (deps.submissionService.isRedacted(entryHash)) {
        sendJson(res, 451, {
          code: 'REDACTED',
          error:
            deps.redactionMessage ??
            'This entry has been redacted and is unavailable for legal reasons.',
        });
        return;
      }

      // The inclusion proof requires knowing the sequence number for the entry.
      // Without a hash→sequence index the ledger must be scanned, which is
      // deferred to Phase 5.  Return 501 with a meaningful body for now.
      sendJson(res, 501, {
        code: 'NOT_IMPLEMENTED',
        error:
          'Inclusion-proof lookup requires full ledger scan; available in a later phase.',
      });
    },
  );

  // ── GET /shards/:shardId/settlement ────────────────────────────────────
  // Returns the current settlement status for a shard, including the last
  // accepted tip hash, sequence cursor, and any open dispute.
  router.get(
    `${prefix}/shards/:shardId/settlement`,
    (req: Request, res: Response) => {
      const { shardId } = req.params as { shardId: string };
      const state = deps.projectionService.state;

      const shardState = state.shardSettlement.get(shardId);
      if (!shardState) {
        sendJson(res, 404, {
          code: AssetValidationErrorCode.ShardUnknown,
          error: `Shard '${shardId}' is not registered.`,
        });
        return;
      }

      // Find the active (non-revoked) process key for this shard, if any.
      let currentProcessKeyFingerprint: string | null = null;
      for (const [fp, rec] of state.processKeys) {
        if (!rec.revoked && rec.shardIds.includes(shardId)) {
          currentProcessKeyFingerprint = fp;
          break;
        }
      }

      // Determine dispute status for the most recent settlement.
      const lastSettledSeq = shardState.nextExpectedSeq - 1n;
      const disputeKey = `${shardId}:${lastSettledSeq}`;
      const dispute = state.disputes.get(disputeKey);
      let disputeStatus: 'open' | 'resolved' | null = null;
      if (dispute) {
        disputeStatus = dispute.resolved ? 'resolved' : 'open';
      }

      sendJson(res, 200, {
        shardId,
        lastSettledSeq: lastSettledSeq < 0n ? null : lastSettledSeq,
        lastTipHash: Buffer.from(shardState.lastTipHash).toString('hex'),
        lastSettledAt: shardState.lastSettledAt || null,
        currentProcessKeyFingerprint,
        disputeStatus,
      });
    },
  );

  // ── GET /head ───────────────────────────────────────────────────────────
  router.get(`${prefix}/head`, async (_req: Request, res: Response) => {
    const seqNum = deps.ledger.length - 1;
    const merkleRootChecksum =
      'merkleRoot' in deps.ledger
        ? (deps.ledger as { merkleRoot: { toUint8Array(): Uint8Array } | null })
            .merkleRoot
        : null;
    const merkleRoot = merkleRootChecksum
      ? Buffer.from(merkleRootChecksum.toUint8Array()).toString('hex')
      : null;

    // Attempt to read the latest entry timestamp; non-fatal if unavailable.
    let timestamp: number | null = null;
    if ('getLatestEntry' in deps.ledger) {
      try {
        const entry = await (
          deps.ledger as {
            getLatestEntry(): Promise<{ timestamp: number } | null>;
          }
        ).getLatestEntry();
        timestamp = entry?.timestamp ?? null;
      } catch {
        // Non-fatal: return null timestamp on error.
      }
    }

    sendJson(res, 200, {
      ledgerId: deps.ledgerId,
      sequenceNumber: Math.max(seqNum, -1),
      merkleRoot,
      timestamp,
    });
  });

  // ── PUT /operator/redaction/:entryHash ─────────────────────────────────
  // Adds an entry hash to the runtime redaction list and records a durable
  // AttestationAction on the ledger for audit purposes (Req 9.1, 9.2).
  router.put(
    `${prefix}/operator/redaction/:entryHash`,
    async (req: Request, res: Response) => {
      const { entryHash } = req.params as { entryHash: string };

      if (!/^[0-9a-fA-F]+$/.test(entryHash)) {
        sendJson(res, 400, {
          code: 'MALFORMED',
          error: 'entryHash must be a hex string.',
        });
        return;
      }

      const context = contextFactory(req);
      try {
        await deps.submissionService.recordRedaction(entryHash, context);
        sendJson(res, 200, { redacted: true, entryHash });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Internal error';
        sendJson(res, 500, { code: 'INTERNAL_ERROR', error: msg });
      }
    },
  );

  // ── DELETE /operator/redaction/:entryHash ───────────────────────────────
  // Removes an entry hash from the runtime redaction list.
  // Does NOT remove any AttestationAction already written to the ledger.
  router.delete(
    `${prefix}/operator/redaction/:entryHash`,
    (req: Request, res: Response) => {
      const { entryHash } = req.params as { entryHash: string };

      if (!/^[0-9a-fA-F]+$/.test(entryHash)) {
        sendJson(res, 400, {
          code: 'MALFORMED',
          error: 'entryHash must be a hex string.',
        });
        return;
      }

      deps.submissionService.removeRedaction(entryHash);
      sendJson(res, 200, { redacted: false, entryHash });
    },
  );

  // ── POST /submit ────────────────────────────────────────────────────────
  router.post(`${prefix}/submit`, async (req: Request, res: Response) => {
    // Accept raw binary body (Buffer) or JSON with a `payload` hex field.
    let payloadBytes: Uint8Array | undefined;

    if (Buffer.isBuffer(req.body)) {
      payloadBytes = req.body;
    } else if (req.body instanceof Uint8Array) {
      payloadBytes = req.body;
    } else if (
      req.body !== null &&
      typeof req.body === 'object' &&
      typeof (req.body as Record<string, unknown>)['payload'] === 'string'
    ) {
      const hexStr = (req.body as Record<string, unknown>)['payload'] as string;
      if (!/^[0-9a-fA-F]*$/.test(hexStr)) {
        sendJson(res, 400, {
          code: 'MALFORMED',
          error: 'payload must be a hex-encoded string.',
        });
        return;
      }
      payloadBytes = Buffer.from(hexStr, 'hex');
    } else {
      sendJson(res, 400, {
        code: 'MALFORMED',
        error:
          'Request body must be a binary buffer or JSON with a `payload` hex field.',
      });
      return;
    }

    const context = contextFactory(req);
    const result = await deps.submissionService.submit(payloadBytes, context);

    if ((result as ISubmissionRejection).rejected === true) {
      const rejection = result as ISubmissionRejection;
      sendJson(res, validationCodeToStatus(rejection.code), {
        rejected: true,
        code: rejection.code,
        error: rejection.error,
      });
      return;
    }

    const receipt = result as ISubmissionReceipt;
    sendJson(res, 202, {
      entryHash: Buffer.from(receipt.entryHash).toString('hex'),
      sequenceNumber: receipt.sequenceNumber,
      acceptedAt: receipt.acceptedAt,
    });
  });

  return router;
}
