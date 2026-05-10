/**
 * @fileoverview DeletionService — orchestrates vault container deletion,
 * certificate generation, and disown/cool-down workflows.
 *
 * Behavior depends on vault visibility:
 * - **Private / Unlisted**: immediate cascade destruction. If the vault is
 *   sealed and non-access is confirmed, a Certificate of Destruction is
 *   generated, signed, and persisted.
 * - **Public**: a mandatory cool-down period is scheduled. The actual
 *   destruction is executed later by a background job via
 *   `executePendingDeletions()`.
 *
 * Validates: Requirements 1, 2, 5, 6
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';
import { DISOWNED_OWNER_SENTINEL } from '../constants';
import { VaultContainerState } from '../enumerations/vault-container-state';
import { VaultVisibility } from '../enumerations/vault-visibility';
import {
  DeletionAlreadyScheduledError,
  DisownRequiresPublicVisibilityError,
  InvalidStateTransitionError,
  VaultAlreadyDisownedError,
} from '../errors';
import type {
  ICertificateFileDestructionProof,
  ICertificateNonAccessVerification,
  ICertificateOfDestruction,
} from '../interfaces/bases/certificate-of-destruction';
import type { IVaultContainerBase } from '../interfaces/bases/vault-container';
import type { ICertificateRepository } from '../interfaces/services/certificate-repository';
import type {
  ICooldownExpiryResult,
  IDeletionService,
  IImmediateDeletionResult,
  IPendingDeletionResult,
  IVaultDeletionResult,
} from '../interfaces/services/deletion-service';
import type { IVaultContainerService } from '../interfaces/services/vault-container-service';
import { assertValidTransition } from './state-transition-validator';

/**
 * Dependencies injected into DeletionService from other services.
 *
 * Follows the same constructor-injection pattern as
 * `VaultContainerServiceDeps` and `DestructionServiceDeps`.
 */
export interface IDeletionServiceDeps<TID extends PlatformID> {
  /** Record a container-level event on the ledger. Returns the ledger entry hash. */
  recordOnLedger: (metadata: Record<string, unknown>) => Promise<Uint8Array>;

  /**
   * Sign a certificate payload with the operator's private key.
   * Returns the certificate with the `signature` field populated.
   */
  signCertificate: (
    certificate: Omit<ICertificateOfDestruction, 'signature'>,
  ) => ICertificateOfDestruction;

  /** Hex-encoded compressed secp256k1 operator public key. */
  operatorPublicKey: string;

  /** Cool-down period in days for public vault deletion. */
  cooldownDays: number;

  /**
   * Query vault containers in PendingDeletion state whose
   * `pendingDeletionAt` timestamp has expired (i.e. <= now).
   */
  getExpiredPendingDeletions: () => Promise<IVaultContainerBase<TID>[]>;

  /**
   * System-level requester ID used by the background job when
   * executing pending deletions (no human requester).
   */
  systemRequesterId: TID;

  /**
   * Low-level container update that bypasses the VaultContainerService's
   * `IVaultContainerUpdate` restriction. Used for state transitions and
   * setting fields like `pendingDeletionAt`, `previousState`, `disownedAt`,
   * `disownedBy`, and `ownerId` that are not part of the user-facing
   * update interface.
   */
  updateContainerRaw: (
    containerId: TID,
    updates: Partial<IVaultContainerBase<TID>>,
  ) => Promise<IVaultContainerBase<TID>>;
}

/**
 * Orchestrates vault container deletion, certificate generation,
 * and the disown/cool-down workflow for public vaults.
 *
 * Generic over `TID` (extends `PlatformID`) to match the existing
 * service pattern used throughout digitalburnbag-lib.
 */
export class DeletionService<TID extends PlatformID>
  implements IDeletionService<TID>
{
  constructor(
    private readonly vaultContainerService: IVaultContainerService<TID>,
    private readonly certificateRepository: ICertificateRepository,
    private readonly deps: IDeletionServiceDeps<TID>,
  ) {}

  // ── deleteVaultContainer ────────────────────────────────────────

  async deleteVaultContainer(
    containerId: TID,
    requesterId: TID,
  ): Promise<IVaultDeletionResult<TID>> {
    const container = await this.vaultContainerService.getContainer(
      containerId,
      requesterId,
    );

    // Public vaults go through the cool-down scheduling flow
    if (container.visibility === VaultVisibility.Public) {
      return this.schedulePublicDeletion(container, requesterId);
    }

    // Private / Unlisted → immediate destruction
    return this.executeImmediateDeletion(container, requesterId);
  }

  // ── disownVaultContainer ────────────────────────────────────────

  async disownVaultContainer(
    containerId: TID,
    requesterId: TID,
  ): Promise<IVaultContainerBase<TID>> {
    const container = await this.vaultContainerService.getContainer(
      containerId,
      requesterId,
    );

    // Only public vaults can be disowned
    if (container.visibility !== VaultVisibility.Public) {
      throw new DisownRequiresPublicVisibilityError(String(containerId));
    }

    // Cannot disown an already-disowned vault
    if (container.state === VaultContainerState.Disowned) {
      throw new VaultAlreadyDisownedError(String(containerId));
    }

    // Validate state transition
    assertValidTransition(container.state, VaultContainerState.Disowned);

    const now = new Date().toISOString();

    // Record ledger entry
    await this.deps.recordOnLedger({
      operation: 'vault_container_disowned',
      containerId: String(containerId),
      disownedBy: String(requesterId),
      previousState: container.state,
      timestamp: now,
    });

    // Transition state and set sentinel owner
    return this.deps.updateContainerRaw(containerId, {
      state: VaultContainerState.Disowned,
      ownerId: DISOWNED_OWNER_SENTINEL as unknown as TID,
      disownedAt: now,
      disownedBy: requesterId,
      updatedBy: requesterId,
      updatedAt: now,
    } as Partial<IVaultContainerBase<TID>>);
  }

  // ── cancelPendingDeletion ───────────────────────────────────────

  async cancelPendingDeletion(
    containerId: TID,
    requesterId: TID,
  ): Promise<IVaultContainerBase<TID>> {
    const container = await this.vaultContainerService.getContainer(
      containerId,
      requesterId,
    );

    // Must be in PendingDeletion state
    if (container.state !== VaultContainerState.PendingDeletion) {
      throw new InvalidStateTransitionError(
        container.state,
        'cancel-pending-deletion',
      );
    }

    // Restore previous state
    const restoredState =
      container.previousState ?? VaultContainerState.Active;

    // Validate the restoration transition
    assertValidTransition(
      VaultContainerState.PendingDeletion,
      restoredState,
    );

    const now = new Date().toISOString();

    // Record ledger entry
    await this.deps.recordOnLedger({
      operation: 'vault_container_deletion_cancelled',
      containerId: String(containerId),
      cancelledBy: String(requesterId),
      restoredState,
      timestamp: now,
    });

    // Clear pending deletion fields and restore state
    return this.deps.updateContainerRaw(containerId, {
      state: restoredState,
      pendingDeletionAt: undefined,
      previousState: undefined,
      updatedBy: requesterId,
      updatedAt: now,
    } as Partial<IVaultContainerBase<TID>>);
  }

  // ── executePendingDeletions ─────────────────────────────────────

  async executePendingDeletions(): Promise<ICooldownExpiryResult> {
    const expiredContainers = await this.deps.getExpiredPendingDeletions();

    let vaultsDestroyed = 0;
    let certificatesGenerated = 0;
    let failures = 0;

    for (const container of expiredContainers) {
      try {
        const result = await this.executeImmediateDeletion(
          container,
          this.deps.systemRequesterId,
        );

        if (result.type === 'immediate') {
          vaultsDestroyed++;
          if (result.certificate) {
            certificatesGenerated++;
          }
        }
      } catch {
        failures++;
      }
    }

    return { vaultsDestroyed, certificatesGenerated, failures };
  }

  // ── getCertificate ──────────────────────────────────────────────

  async getCertificate(
    containerId: TID,
    _requesterId: TID,
  ): Promise<ICertificateOfDestruction | null> {
    return this.certificateRepository.getCertificateByContainerId(
      String(containerId),
    );
  }

  // ── Private helpers ─────────────────────────────────────────────

  /**
   * Execute immediate destruction for a private/unlisted vault (or an
   * expired pending-deletion vault). If the vault is sealed and non-access
   * is confirmed, generates and persists a Certificate of Destruction.
   */
  private async executeImmediateDeletion(
    container: IVaultContainerBase<TID>,
    requesterId: TID,
  ): Promise<IImmediateDeletionResult<TID>> {
    const containerId = container.id;

    // If vault is sealed, verify non-access first
    let nonAccessResult:
      | Awaited<
          ReturnType<IVaultContainerService<TID>['verifyNonAccess']>
        >
      | undefined;
    let certificate: ICertificateOfDestruction | undefined;
    let certificateOmittedReason:
      | 'NOT_SEALED'
      | 'SEAL_BROKEN'
      | undefined;
    let accessedFileIds: string[] | undefined;

    if (container.state === VaultContainerState.Sealed) {
      nonAccessResult = await this.vaultContainerService.verifyNonAccess(
        containerId,
        requesterId,
      );
    }

    // Validate state transition to Destroyed
    assertValidTransition(container.state, VaultContainerState.Destroyed);

    // Execute cascade destruction
    const destructionResult =
      await this.vaultContainerService.destroyContainer(
        containerId,
        requesterId,
      );

    // Generate certificate if vault was sealed and non-access confirmed
    if (container.state === VaultContainerState.Sealed) {
      if (nonAccessResult && nonAccessResult.nonAccessConfirmed) {
        certificate = await this.generateAndPersistCertificate(
          container,
          nonAccessResult,
          destructionResult,
        );
      } else {
        certificateOmittedReason = 'SEAL_BROKEN';
        accessedFileIds = nonAccessResult
          ? nonAccessResult.accessedFileIds.map(String)
          : [];
      }
    } else {
      certificateOmittedReason = 'NOT_SEALED';
    }

    const result: IImmediateDeletionResult<TID> = {
      type: 'immediate',
      destructionResult,
    };

    if (certificate) {
      result.certificate = certificate;
    }
    if (certificateOmittedReason) {
      result.certificateOmittedReason = certificateOmittedReason;
    }
    if (accessedFileIds) {
      result.accessedFileIds = accessedFileIds;
    }

    return result;
  }

  /**
   * Schedule a public vault for cool-down deletion.
   */
  private async schedulePublicDeletion(
    container: IVaultContainerBase<TID>,
    requesterId: TID,
  ): Promise<IPendingDeletionResult> {
    const containerId = container.id;

    // If already pending deletion, throw
    if (container.state === VaultContainerState.PendingDeletion) {
      throw new DeletionAlreadyScheduledError(
        String(containerId),
        container.pendingDeletionAt ?? '',
      );
    }

    // Validate state transition
    assertValidTransition(
      container.state,
      VaultContainerState.PendingDeletion,
    );

    // Calculate pending deletion timestamp
    const now = new Date();
    const pendingDeletionAt = new Date(
      now.getTime() + this.deps.cooldownDays * 24 * 60 * 60 * 1000,
    );
    const pendingDeletionAtISO = pendingDeletionAt.toISOString();
    const nowISO = now.toISOString();

    // Record ledger entry
    await this.deps.recordOnLedger({
      operation: 'vault_container_deletion_scheduled',
      containerId: String(containerId),
      scheduledBy: String(requesterId),
      pendingDeletionAt: pendingDeletionAtISO,
      previousState: container.state,
      timestamp: nowISO,
    });

    // Transition state to PendingDeletion
    await this.deps.updateContainerRaw(containerId, {
      state: VaultContainerState.PendingDeletion,
      pendingDeletionAt: pendingDeletionAtISO,
      previousState: container.state,
      updatedBy: requesterId,
      updatedAt: nowISO,
    } as Partial<IVaultContainerBase<TID>>);

    return {
      type: 'pending',
      pendingDeletionAt: pendingDeletionAtISO,
    };
  }

  /**
   * Generate a Certificate of Destruction, sign it, and persist it.
   */
  private async generateAndPersistCertificate(
    container: IVaultContainerBase<TID>,
    nonAccessResult: Awaited<
      ReturnType<IVaultContainerService<TID>['verifyNonAccess']>
    >,
    destructionResult: Awaited<
      ReturnType<IVaultContainerService<TID>['destroyContainer']>
    >,
  ): Promise<ICertificateOfDestruction> {
    const now = new Date().toISOString();

    // Build serializable non-access verification
    const nonAccessVerification: ICertificateNonAccessVerification = {
      containerId: String(container.id),
      nonAccessConfirmed: nonAccessResult.nonAccessConfirmed,
      accessedFileIds: nonAccessResult.accessedFileIds.map(String),
      inconsistentFileIds: nonAccessResult.inconsistentFileIds.map(String),
      totalFilesChecked: nonAccessResult.totalFilesChecked,
    };

    // Build serializable file destruction proofs
    const fileDestructionProofs: ICertificateFileDestructionProof[] =
      destructionResult.succeeded.map((entry) => ({
        fileId: String(entry.fileId),
        destructionHash: Buffer.from(entry.proof.destructionHash).toString(
          'hex',
        ),
        ledgerEntryHash: Buffer.from(entry.proof.ledgerEntryHash).toString(
          'hex',
        ),
        timestamp: entry.proof.timestamp.toISOString(),
      }));

    // Build the unsigned certificate payload
    const payload: Omit<ICertificateOfDestruction, 'signature'> = {
      version: 1,
      containerId: String(container.id),
      containerName: container.name,
      sealHash: container.sealHash ?? '',
      sealedAt: container.sealedAt ?? '',
      destroyedAt: now,
      nonAccessVerification,
      fileDestructionProofs,
      containerLedgerEntryHash: Buffer.from(
        destructionResult.containerLedgerEntryHash,
      ).toString('hex'),
      operatorPublicKey: this.deps.operatorPublicKey,
    };

    // Sign the certificate
    const signedCertificate = this.deps.signCertificate(payload);

    // Persist the certificate
    await this.certificateRepository.storeCertificate(signedCertificate);

    return signedCertificate;
  }
}
