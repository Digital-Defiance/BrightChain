import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { ICertificateOfDestruction } from '../bases/certificate-of-destruction';
import type { IContainerDestructionResult } from '../params/vault-container-params';
import type { IVaultContainerBase } from '../bases/vault-container';

/**
 * Service interface for vault container deletion orchestration.
 *
 * Handles three visibility-dependent deletion workflows:
 * - **Private / Unlisted**: immediate cascade destruction
 * - **Public**: cool-down period scheduling, then background destruction
 *
 * Also manages the disown workflow (public vaults only) and
 * Certificate of Destruction retrieval.
 */
export interface IDeletionService<TID extends PlatformID> {
  /**
   * Delete a vault container. Behavior depends on visibility:
   * - private/unlisted: immediate cascade destruction
   * - public: schedule cool-down period
   *
   * Returns the destruction result (immediate) or pending-deletion info (public).
   */
  deleteVaultContainer(
    containerId: TID,
    requesterId: TID,
  ): Promise<IVaultDeletionResult<TID>>;

  /**
   * Disown a public vault — remove owner, make read-only.
   */
  disownVaultContainer(
    containerId: TID,
    requesterId: TID,
  ): Promise<IVaultContainerBase<TID>>;

  /**
   * Cancel a pending public vault deletion.
   */
  cancelPendingDeletion(
    containerId: TID,
    requesterId: TID,
  ): Promise<IVaultContainerBase<TID>>;

  /**
   * Execute all pending deletions whose cool-down has expired.
   * Called by the background job.
   */
  executePendingDeletions(): Promise<ICooldownExpiryResult>;

  /**
   * Retrieve a stored Certificate of Destruction.
   */
  getCertificate(
    containerId: TID,
    requesterId: TID,
  ): Promise<ICertificateOfDestruction | null>;
}

/**
 * Discriminated union for vault deletion results.
 * - `immediate`: private/unlisted vault was destroyed right away
 * - `pending`: public vault was scheduled for cool-down deletion
 */
export type IVaultDeletionResult<TID extends PlatformID> =
  | IImmediateDeletionResult<TID>
  | IPendingDeletionResult;

/**
 * Result returned when a private or unlisted vault is immediately destroyed.
 * Includes the cascade destruction result and, for sealed vaults with
 * confirmed non-access, a Certificate of Destruction.
 */
export interface IImmediateDeletionResult<TID extends PlatformID> {
  type: 'immediate';
  destructionResult: IContainerDestructionResult<TID>;
  /** Certificate of Destruction, present only for sealed vaults with confirmed non-access. */
  certificate?: ICertificateOfDestruction;
  /** Reason the certificate was omitted, if applicable. */
  certificateOmittedReason?: 'NOT_SEALED' | 'SEAL_BROKEN';
  /** IDs of files that were accessed before destruction (when seal was broken). */
  accessedFileIds?: string[];
}

/**
 * Result returned when a public vault deletion is scheduled
 * with a mandatory cool-down period.
 */
export interface IPendingDeletionResult {
  type: 'pending';
  /** ISO-8601 timestamp when the vault will be destroyed after the cool-down period. */
  pendingDeletionAt: string;
}

/**
 * Summary result from the background cool-down expiry job.
 * Reports how many vaults were processed and any failures.
 */
export interface ICooldownExpiryResult {
  /** Number of vaults successfully destroyed. */
  vaultsDestroyed: number;
  /** Number of Certificates of Destruction generated (sealed + pristine vaults). */
  certificatesGenerated: number;
  /** Number of vaults that failed to destroy. */
  failures: number;
}
