/**
 * @fileoverview Governance action types for the blockchain ledger.
 *
 * Defines the seven governance action types and the discriminated
 * union type for governance actions.
 *
 * @see Requirements 13.1, 17.3-17.4, 18.3
 */

import { IBrightTrustPolicy } from './brightTrustPolicy';
import { SignerRole } from './signerRole';

export enum GovernanceActionType {
  AddSigner = 'add_signer',
  RemoveSigner = 'remove_signer',
  ChangeRole = 'change_role',
  UpdateQuorum = 'update_quorum',
  SuspendSigner = 'suspend_signer',
  ReactivateSigner = 'reactivate_signer',
  SetMemberData = 'set_member_data',
}

export type IGovernanceAction =
  | {
      readonly type: GovernanceActionType.AddSigner;
      readonly publicKey: Uint8Array;
      readonly role: SignerRole;
      readonly metadata?: ReadonlyMap<string, string>;
    }
  | {
      readonly type: GovernanceActionType.RemoveSigner;
      readonly publicKey: Uint8Array;
    }
  | {
      readonly type: GovernanceActionType.ChangeRole;
      readonly publicKey: Uint8Array;
      readonly newRole: SignerRole;
    }
  | {
      readonly type: GovernanceActionType.UpdateQuorum;
      readonly newPolicy: IBrightTrustPolicy;
    }
  | {
      readonly type: GovernanceActionType.SuspendSigner;
      readonly publicKey: Uint8Array;
    }
  | {
      readonly type: GovernanceActionType.ReactivateSigner;
      readonly publicKey: Uint8Array;
    }
  | {
      readonly type: GovernanceActionType.SetMemberData;
      readonly publicKey: Uint8Array;
      readonly metadata: ReadonlyMap<string, string>;
    };
