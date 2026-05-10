/**
 * @fileoverview AssetsSubsystemPlugin — `IAppSubsystemPlugin` implementation
 * that wires the programmable-asset-ledger layer into a BrightChain application.
 *
 * Responsibilities:
 *  1. Gate on `BRIGHTCHAIN_ASSETS_ENABLED` — do nothing when falsy (Req 7.2).
 *  2. Instantiate `SnapshotService`, `BalanceProjectionService`, and
 *     `SubmissionService`.
 *  3. Register services on `context.services`.
 *  4. Mount the asset-ledger Express router on `context.apiRouter` (or
 *     `context.expressApp` as fallback), prefixed by `routePrefix`.
 *
 * The plugin accepts an `IAssetLedgerWriter` (ledger) and `ILedgerSigner`
 * as constructor arguments because they carry private-key material and
 * infrastructure dependencies that must be supplied by the host application.
 *
 * @see Requirements 7.1, 7.2
 */

import type {
  AuthorizedSignerSet,
  IAppSubsystemPlugin,
  ILedgerSigner,
  ISubsystemContext,
} from '@brightchain/brightchain-lib';
import { BalanceProjectionService } from './balanceProjection.js';
import { createAssetsRouter } from './controllers/assetsRouter.js';
import { assetsCapabilityGate } from './middleware/assetsCapabilityGate.js';
import { MemorySnapshotStore, SnapshotService } from './snapshot.js';
import {
  SubmissionService,
  type IAssetLedgerWriter,
  type ISubmissionServiceOptions,
} from './submissionService.js';
import { AssetActionValidator } from './validator.js';

// ── Re-exports for integration tests and downstream consumers ─────────────────
export {
  AssetActionValidator,
  BalanceProjectionService,
  MemorySnapshotStore,
  SnapshotService,
  SubmissionService,
};

// ── Plugin options ────────────────────────────────────────────────────────────

/**
 * Constructor options for `AssetsSubsystemPlugin`.
 */
export interface IAssetsSubsystemPluginOptions {
  /**
   * Route prefix under which all asset-ledger endpoints will be mounted.
   * Defaults to `/v1/asset-ledger`.
   */
  readonly routePrefix?: string;

  /**
   * How many entries between automatic snapshots.
   * Passed to `SnapshotService`.  Defaults to 1000.
   */
  readonly snapshotIntervalEntries?: number;

  /**
   * Options forwarded to `SubmissionService` (size cap, rate limit).
   */
  readonly submissionOptions?: ISubmissionServiceOptions;

  /**
   * System-level `AuthorizedSignerSet` used to authorise `OperatorFreezeAction`
   * submissions.  REQUIRED when `BRIGHTCHAIN_ASSETS_ENABLED` is set (Req 7.3).
   *
   * The plugin will throw during `initialize()` if this is absent while the
   * capability flag is active.
   */
  readonly systemSignerSet?: AuthorizedSignerSet;

  /**
   * Human-readable message returned in HTTP 451 responses for redacted entries.
   * Defaults to a generic unavailability notice.
   */
  readonly redactionMessage?: string;
}

// ── Service container keys ────────────────────────────────────────────────────

/** Key used to register/resolve `BalanceProjectionService` in the service container. */
export const PROJECTION_SERVICE_KEY = 'brightledger-assets.projectionService';

/** Key used to register/resolve `SubmissionService` in the service container. */
export const SUBMISSION_SERVICE_KEY = 'brightledger-assets.submissionService';

// ── Plugin ────────────────────────────────────────────────────────────────────

/**
 * BrightChain app subsystem plugin for the programmable asset ledger.
 */
export class AssetsSubsystemPlugin implements IAppSubsystemPlugin {
  public readonly name = 'brightledger-assets';
  public readonly isOptional = true;

  private readonly _ledger: IAssetLedgerWriter;
  private readonly _ledgerId: string;
  private readonly _signer: ILedgerSigner;
  private readonly _routePrefix: string;
  private readonly _snapshotIntervalEntries: number;
  private readonly _submissionOptions: ISubmissionServiceOptions | undefined;
  private readonly _systemSignerSet: AuthorizedSignerSet | undefined;
  private readonly _redactionMessage: string | undefined;

  private _submissionService: SubmissionService | undefined;
  private _projectionService: BalanceProjectionService | undefined;
  private _snapshotService: SnapshotService | undefined;

  constructor(
    ledger: IAssetLedgerWriter,
    ledgerId: string,
    signer: ILedgerSigner,
    options?: IAssetsSubsystemPluginOptions,
  ) {
    this._ledger = ledger;
    this._ledgerId = ledgerId;
    this._signer = signer;
    this._routePrefix = options?.routePrefix ?? '/v1/asset-ledger';
    this._snapshotIntervalEntries = options?.snapshotIntervalEntries ?? 1000;
    this._submissionOptions = options?.submissionOptions;
    this._systemSignerSet = options?.systemSignerSet;
    this._redactionMessage = options?.redactionMessage;
  }

  // ── IAppSubsystemPlugin ───────────────────────────────────────────────────

  public async initialize(context: ISubsystemContext): Promise<void> {
    if (!process.env['BRIGHTCHAIN_ASSETS_ENABLED']) {
      // Plugin registered but feature flag is off — do nothing.
      return;
    }

    // Req 7.3: a system-quorum signer set is required for OperatorFreezeAction.
    if (this._systemSignerSet === undefined) {
      throw new Error(
        'AssetsSubsystemPlugin: system-quorum policy for OperatorFreezeAction is required but not configured. ' +
          'Supply a `systemSignerSet` in the plugin options.',
      );
    }

    // ── Services ────────────────────────────────────────────────────────────
    const snapshotStore = new MemorySnapshotStore();
    const snapshotService = new SnapshotService(
      snapshotStore,
      this._snapshotIntervalEntries,
    );
    const projectionService = new BalanceProjectionService(snapshotService);
    const validator = new AssetActionValidator();
    const submissionService = new SubmissionService(
      this._ledger,
      this._ledgerId,
      projectionService,
      this._signer,
      validator,
      this._submissionOptions,
    );
    this._submissionService = submissionService;
    this._projectionService = projectionService;
    this._snapshotService = snapshotService;

    // ── Register in service container ───────────────────────────────────────
    context.services.register<BalanceProjectionService>(
      PROJECTION_SERVICE_KEY,
      () => projectionService,
    );
    context.services.register<SubmissionService>(
      SUBMISSION_SERVICE_KEY,
      () => submissionService,
    );

    // ── Mount Express router ────────────────────────────────────────────────
    const assetsRouter = createAssetsRouter({
      projectionService,
      submissionService,
      ledger: this._ledger,
      ledgerId: this._ledgerId,
      systemSignerSet: this._systemSignerSet,
      ...(this._redactionMessage !== undefined
        ? { redactionMessage: this._redactionMessage }
        : {}),
    });

    // Resolve the underlying express router/app to mount onto.

    const mountTarget =
      (context.apiRouter as any)?.router ?? context.expressApp;

    // Apply capability gate first, then the asset routes.
    mountTarget.use(this._routePrefix, assetsCapabilityGate, assetsRouter);
  }

  public async stop(): Promise<void> {
    // Drain the submission queue before snapshotting so the final state
    // includes all in-flight entries.
    if (this._submissionService !== undefined) {
      await this._submissionService.drain();
    }

    // Write a final snapshot so the next boot can restore state quickly.
    if (
      this._snapshotService !== undefined &&
      this._projectionService !== undefined
    ) {
      await this._snapshotService.save(
        this._ledgerId,
        this._projectionService.state,
      );
    }

    this._submissionService = undefined;
    this._projectionService = undefined;
    this._snapshotService = undefined;
  }
}
