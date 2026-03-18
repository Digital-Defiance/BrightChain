/**
 * @fileoverview In-memory state tracker for the authorized signer set.
 *
 * Maintains the current set of authorized signers, their roles, lifecycle
 * statuses, and metadata. Reconstructed during load() by replaying
 * governance entries from genesis to head.
 *
 * @see Design: AuthorizedSignerSet
 * @see Requirements 12.2-12.8, 14.1-14.7, 15.1-15.5, 17.1-17.9, 18.1-18.8
 */

import { LedgerError, LedgerErrorType } from '../errors/ledgerError';
import { IAuthorizedSigner } from '../interfaces/ledger/authorizedSigner';
import {
  IBrightTrustPolicy,
  QuorumType,
} from '../interfaces/ledger/brightTrustPolicy';
import {
  GovernanceActionType,
  IGovernanceAction,
} from '../interfaces/ledger/governanceAction';
import { SignerRole } from '../interfaces/ledger/signerRole';
import { SignerStatus } from '../interfaces/ledger/signerStatus';

/**
 * Convert a Uint8Array public key to a hex string for use as a Map key.
 */
function pubKeyToHex(publicKey: Uint8Array): string {
  return Array.from(publicKey)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export class AuthorizedSignerSet {
  private signers: Map<string, IAuthorizedSigner>;
  private _brightTrustPolicy: IBrightTrustPolicy;
  private _activeAdminCount: number;

  constructor(
    initialSigners: IAuthorizedSigner[],
    initialQuorum: IBrightTrustPolicy,
  ) {
    this.signers = new Map();
    this._activeAdminCount = 0;
    for (const signer of initialSigners) {
      const hex = pubKeyToHex(signer.publicKey);
      this.signers.set(hex, {
        publicKey: new Uint8Array(signer.publicKey),
        role: signer.role,
        status: signer.status,
        metadata: new Map(signer.metadata),
      });
      if (
        signer.status === SignerStatus.Active &&
        signer.role === SignerRole.Admin
      ) {
        this._activeAdminCount++;
      }
    }
    this._brightTrustPolicy = { ...initialQuorum };
  }

  /** Check if a public key is authorized to append (active + admin or writer). */
  canAppend(publicKey: Uint8Array): boolean {
    const signer = this.signers.get(pubKeyToHex(publicKey));
    if (!signer) return false;
    return (
      signer.status === SignerStatus.Active &&
      (signer.role === SignerRole.Admin || signer.role === SignerRole.Writer)
    );
  }

  /** Check if a public key is an active admin. */
  isActiveAdmin(publicKey: Uint8Array): boolean {
    const signer = this.signers.get(pubKeyToHex(publicKey));
    if (!signer) return false;
    return (
      signer.status === SignerStatus.Active && signer.role === SignerRole.Admin
    );
  }

  /** Get signer info by public key, or undefined if not found. */
  getSigner(publicKey: Uint8Array): IAuthorizedSigner | undefined {
    return this.signers.get(pubKeyToHex(publicKey));
  }

  /** Get all signers (all statuses). */
  getAllSigners(): IAuthorizedSigner[] {
    return Array.from(this.signers.values());
  }

  /** Get current active admin count. */
  get activeAdminCount(): number {
    return this._activeAdminCount;
  }

  /** Get current quorum policy. */
  get brightTrustPolicy(): IBrightTrustPolicy {
    return this._brightTrustPolicy;
  }

  /** Compute the required number of signatures for governance. */
  get requiredSignatures(): number {
    switch (this._brightTrustPolicy.type) {
      case QuorumType.Unanimous:
        return this._activeAdminCount;
      case QuorumType.Majority:
        return Math.floor(this._activeAdminCount / 2) + 1;
      case QuorumType.Threshold:
        return this._brightTrustPolicy.threshold ?? 1;
      default: {
        const _exhaustive: never = this._brightTrustPolicy.type;
        throw new Error(`Unknown quorum type: ${_exhaustive}`);
      }
    }
  }

  /** Validate and apply a governance action. Throws LedgerError on safety violation. */
  applyAction(action: IGovernanceAction): void {
    switch (action.type) {
      case GovernanceActionType.AddSigner:
        this.applyAddSigner(action);
        break;
      case GovernanceActionType.RemoveSigner:
        this.applyRemoveSigner(action);
        break;
      case GovernanceActionType.ChangeRole:
        this.applyChangeRole(action);
        break;
      case GovernanceActionType.UpdateQuorum:
        this.applyUpdateQuorum(action);
        break;
      case GovernanceActionType.SuspendSigner:
        this.applySuspendSigner(action);
        break;
      case GovernanceActionType.ReactivateSigner:
        this.applyReactivateSigner(action);
        break;
      case GovernanceActionType.SetMemberData:
        this.applySetMemberData(action);
        break;
    }
  }

  /** Verify that a set of cosigner public keys satisfies the current quorum. */
  verifyQuorum(signerPublicKeys: Uint8Array[]): boolean {
    let validCount = 0;
    for (const pk of signerPublicKeys) {
      if (this.isActiveAdmin(pk)) {
        validCount++;
      }
    }
    return validCount >= this.requiredSignatures;
  }

  /** Clone the current state (for speculative validation). */
  clone(): AuthorizedSignerSet {
    const clonedSigners: IAuthorizedSigner[] = [];
    for (const signer of this.signers.values()) {
      clonedSigners.push({
        publicKey: new Uint8Array(signer.publicKey),
        role: signer.role,
        status: signer.status,
        metadata: new Map(signer.metadata),
      });
    }
    const cloned = new AuthorizedSignerSet(clonedSigners, {
      ...this._brightTrustPolicy,
    });
    return cloned;
  }

  // ── Private action handlers ─────────────────────────────────────

  private applyAddSigner(
    action: Extract<
      IGovernanceAction,
      { type: GovernanceActionType.AddSigner }
    >,
  ): void {
    const hex = pubKeyToHex(action.publicKey);
    const existing = this.signers.get(hex);
    if (existing && existing.status !== SignerStatus.Retired) {
      throw new LedgerError(
        LedgerErrorType.InvalidStateTransition,
        `Signer ${hex} already exists and is not retired`,
      );
    }
    const newSigner: IAuthorizedSigner = {
      publicKey: new Uint8Array(action.publicKey),
      role: action.role,
      status: SignerStatus.Active,
      metadata: new Map(action.metadata ?? []),
    };
    this.signers.set(hex, newSigner);
    if (action.role === SignerRole.Admin) {
      this._activeAdminCount++;
    }
  }

  private applyRemoveSigner(
    action: Extract<
      IGovernanceAction,
      { type: GovernanceActionType.RemoveSigner }
    >,
  ): void {
    const hex = pubKeyToHex(action.publicKey);
    const signer = this.signers.get(hex);
    if (!signer) {
      throw new LedgerError(
        LedgerErrorType.InvalidGovernanceTarget,
        `Signer ${hex} not found`,
      );
    }
    if (signer.status === SignerStatus.Retired) {
      throw new LedgerError(
        LedgerErrorType.InvalidStateTransition,
        `Signer ${hex} is already retired`,
      );
    }
    // Safety: check if removing an active admin
    if (
      signer.status === SignerStatus.Active &&
      signer.role === SignerRole.Admin
    ) {
      if (this._activeAdminCount - 1 < 1) {
        throw new LedgerError(
          LedgerErrorType.GovernanceSafetyViolation,
          'Cannot remove the last active admin',
        );
      }
      if (this._activeAdminCount - 1 < this.requiredSignatures) {
        throw new LedgerError(
          LedgerErrorType.GovernanceSafetyViolation,
          'Removing this admin would drop below quorum threshold',
        );
      }
      this._activeAdminCount--;
    }
    this.signers.set(hex, {
      ...signer,
      publicKey: new Uint8Array(signer.publicKey),
      metadata: new Map(signer.metadata),
      status: SignerStatus.Retired,
    });
  }

  private applyChangeRole(
    action: Extract<
      IGovernanceAction,
      { type: GovernanceActionType.ChangeRole }
    >,
  ): void {
    const hex = pubKeyToHex(action.publicKey);
    const signer = this.signers.get(hex);
    if (!signer || signer.status === SignerStatus.Retired) {
      throw new LedgerError(
        LedgerErrorType.InvalidGovernanceTarget,
        `Signer ${hex} not found or retired`,
      );
    }
    // Safety: demoting the last active admin
    if (
      signer.status === SignerStatus.Active &&
      signer.role === SignerRole.Admin &&
      action.newRole !== SignerRole.Admin
    ) {
      if (this._activeAdminCount - 1 < 1) {
        throw new LedgerError(
          LedgerErrorType.GovernanceSafetyViolation,
          'Cannot demote the last active admin',
        );
      }
      if (this._activeAdminCount - 1 < this.requiredSignatures) {
        throw new LedgerError(
          LedgerErrorType.GovernanceSafetyViolation,
          'Demoting this admin would drop below quorum threshold',
        );
      }
      this._activeAdminCount--;
    } else if (
      signer.status === SignerStatus.Active &&
      signer.role !== SignerRole.Admin &&
      action.newRole === SignerRole.Admin
    ) {
      this._activeAdminCount++;
    }
    this.signers.set(hex, {
      ...signer,
      publicKey: new Uint8Array(signer.publicKey),
      metadata: new Map(signer.metadata),
      role: action.newRole,
    });
  }

  private applyUpdateQuorum(
    action: Extract<
      IGovernanceAction,
      { type: GovernanceActionType.UpdateQuorum }
    >,
  ): void {
    const newPolicy = action.newPolicy;
    if (newPolicy.type === QuorumType.Threshold) {
      if ((newPolicy.threshold ?? 1) > this._activeAdminCount) {
        throw new LedgerError(
          LedgerErrorType.GovernanceSafetyViolation,
          `Threshold ${newPolicy.threshold} exceeds active admin count ${this._activeAdminCount}`,
        );
      }
    }
    this._brightTrustPolicy = { ...newPolicy };
  }

  private applySuspendSigner(
    action: Extract<
      IGovernanceAction,
      { type: GovernanceActionType.SuspendSigner }
    >,
  ): void {
    const hex = pubKeyToHex(action.publicKey);
    const signer = this.signers.get(hex);
    if (!signer) {
      throw new LedgerError(
        LedgerErrorType.InvalidGovernanceTarget,
        `Signer ${hex} not found`,
      );
    }
    if (signer.status !== SignerStatus.Active) {
      throw new LedgerError(
        LedgerErrorType.InvalidStateTransition,
        `Signer ${hex} is not active (status: ${signer.status})`,
      );
    }
    // Safety: suspending an active admin
    if (signer.role === SignerRole.Admin) {
      if (this._activeAdminCount - 1 < 1) {
        throw new LedgerError(
          LedgerErrorType.GovernanceSafetyViolation,
          'Cannot suspend the last active admin',
        );
      }
      if (this._activeAdminCount - 1 < this.requiredSignatures) {
        throw new LedgerError(
          LedgerErrorType.GovernanceSafetyViolation,
          'Suspending this admin would drop below quorum threshold',
        );
      }
      this._activeAdminCount--;
    }
    this.signers.set(hex, {
      ...signer,
      publicKey: new Uint8Array(signer.publicKey),
      metadata: new Map(signer.metadata),
      status: SignerStatus.Suspended,
    });
  }

  private applyReactivateSigner(
    action: Extract<
      IGovernanceAction,
      { type: GovernanceActionType.ReactivateSigner }
    >,
  ): void {
    const hex = pubKeyToHex(action.publicKey);
    const signer = this.signers.get(hex);
    if (!signer) {
      throw new LedgerError(
        LedgerErrorType.InvalidGovernanceTarget,
        `Signer ${hex} not found`,
      );
    }
    if (signer.status !== SignerStatus.Suspended) {
      throw new LedgerError(
        LedgerErrorType.InvalidStateTransition,
        `Signer ${hex} is not suspended (status: ${signer.status})`,
      );
    }
    this.signers.set(hex, {
      ...signer,
      publicKey: new Uint8Array(signer.publicKey),
      metadata: new Map(signer.metadata),
      status: SignerStatus.Active,
    });
    if (signer.role === SignerRole.Admin) {
      this._activeAdminCount++;
    }
  }

  private applySetMemberData(
    action: Extract<
      IGovernanceAction,
      { type: GovernanceActionType.SetMemberData }
    >,
  ): void {
    const hex = pubKeyToHex(action.publicKey);
    const signer = this.signers.get(hex);
    if (!signer || signer.status === SignerStatus.Retired) {
      throw new LedgerError(
        LedgerErrorType.InvalidGovernanceTarget,
        `Signer ${hex} not found or retired`,
      );
    }
    this.signers.set(hex, {
      ...signer,
      publicKey: new Uint8Array(signer.publicKey),
      metadata: new Map(action.metadata),
    });
  }
}
