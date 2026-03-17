/**
 * Unit tests for AuthorizedSignerSet.
 * @see Requirements 12.3-12.8, 14.1-14.7, 15.1-15.5, 17.1-17.9, 18.1-18.8
 */
import { AuthorizedSignerSet } from '../authorizedSignerSet';
import { IAuthorizedSigner } from '../../interfaces/ledger/authorizedSigner';
import { GovernanceActionType } from '../../interfaces/ledger/governanceAction';
import { QuorumType } from '../../interfaces/ledger/quorumPolicy';
import { SignerRole } from '../../interfaces/ledger/signerRole';
import { SignerStatus } from '../../interfaces/ledger/signerStatus';
import { LedgerError, LedgerErrorType } from '../../errors/ledgerError';

function makePk(seed: number): Uint8Array {
  const key = new Uint8Array(33);
  key[0] = seed;
  return key;
}

function makeSigner(
  seed: number,
  role: SignerRole = SignerRole.Admin,
  status: SignerStatus = SignerStatus.Active,
  metadata: Map<string, string> = new Map(),
): IAuthorizedSigner {
  return { publicKey: makePk(seed), role, status, metadata };
}

describe('AuthorizedSignerSet', () => {
  // ── Initialization ──────────────────────────────────────────────────

  describe('initialization', () => {
    it('initializes with single admin', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      expect(set.activeAdminCount).toBe(1);
      expect(set.getAllSigners()).toHaveLength(1);
    });

    it('initializes with multiple admins and writers', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2), makeSigner(3, SignerRole.Writer)],
        { type: QuorumType.Majority },
      );
      expect(set.activeAdminCount).toBe(2);
      expect(set.getAllSigners()).toHaveLength(3);
    });
  });

  // ── canAppend ───────────────────────────────────────────────────────

  describe('canAppend', () => {
    it('returns true for active admin', () => {
      const set = new AuthorizedSignerSet([makeSigner(1)], { type: QuorumType.Threshold, threshold: 1 });
      expect(set.canAppend(makePk(1))).toBe(true);
    });

    it('returns true for active writer', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2, SignerRole.Writer)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      expect(set.canAppend(makePk(2))).toBe(true);
    });

    it('returns false for reader', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2, SignerRole.Reader)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      expect(set.canAppend(makePk(2))).toBe(false);
    });

    it('returns false for suspended signer', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2, SignerRole.Writer, SignerStatus.Suspended)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      expect(set.canAppend(makePk(2))).toBe(false);
    });

    it('returns false for retired signer', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2, SignerRole.Admin, SignerStatus.Retired)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      expect(set.canAppend(makePk(2))).toBe(false);
    });

    it('returns false for unknown key', () => {
      const set = new AuthorizedSignerSet([makeSigner(1)], { type: QuorumType.Threshold, threshold: 1 });
      expect(set.canAppend(makePk(99))).toBe(false);
    });
  });

  // ── isActiveAdmin ───────────────────────────────────────────────────

  describe('isActiveAdmin', () => {
    it('returns true only for active admins', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2, SignerRole.Writer), makeSigner(3, SignerRole.Reader)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      expect(set.isActiveAdmin(makePk(1))).toBe(true);
      expect(set.isActiveAdmin(makePk(2))).toBe(false);
      expect(set.isActiveAdmin(makePk(3))).toBe(false);
    });
  });

  // ── applyAction: happy paths ────────────────────────────────────────

  describe('applyAction happy paths', () => {
    it('add_signer adds a new active signer', () => {
      const set = new AuthorizedSignerSet([makeSigner(1)], { type: QuorumType.Threshold, threshold: 1 });
      set.applyAction({ type: GovernanceActionType.AddSigner, publicKey: makePk(2), role: SignerRole.Writer });
      expect(set.canAppend(makePk(2))).toBe(true);
      expect(set.getSigner(makePk(2))!.status).toBe(SignerStatus.Active);
    });

    it('add_signer with metadata', () => {
      const set = new AuthorizedSignerSet([makeSigner(1)], { type: QuorumType.Threshold, threshold: 1 });
      set.applyAction({
        type: GovernanceActionType.AddSigner,
        publicKey: makePk(2),
        role: SignerRole.Writer,
        metadata: new Map([['org', 'Test']]),
      });
      expect(set.getSigner(makePk(2))!.metadata.get('org')).toBe('Test');
    });

    it('remove_signer retires the signer', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      set.applyAction({ type: GovernanceActionType.RemoveSigner, publicKey: makePk(2) });
      expect(set.getSigner(makePk(2))!.status).toBe(SignerStatus.Retired);
      expect(set.canAppend(makePk(2))).toBe(false);
    });

    it('change_role updates the role', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2, SignerRole.Writer)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      set.applyAction({ type: GovernanceActionType.ChangeRole, publicKey: makePk(2), newRole: SignerRole.Admin });
      expect(set.getSigner(makePk(2))!.role).toBe(SignerRole.Admin);
      expect(set.activeAdminCount).toBe(2);
    });

    it('update_quorum changes the policy', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      set.applyAction({ type: GovernanceActionType.UpdateQuorum, newPolicy: { type: QuorumType.Majority } });
      expect(set.quorumPolicy.type).toBe(QuorumType.Majority);
    });

    it('suspend_signer transitions active to suspended', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2, SignerRole.Writer)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      set.applyAction({ type: GovernanceActionType.SuspendSigner, publicKey: makePk(2) });
      expect(set.getSigner(makePk(2))!.status).toBe(SignerStatus.Suspended);
      expect(set.canAppend(makePk(2))).toBe(false);
    });

    it('reactivate_signer transitions suspended to active', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2, SignerRole.Writer, SignerStatus.Suspended)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      set.applyAction({ type: GovernanceActionType.ReactivateSigner, publicKey: makePk(2) });
      expect(set.getSigner(makePk(2))!.status).toBe(SignerStatus.Active);
      expect(set.canAppend(makePk(2))).toBe(true);
    });

    it('set_member_data updates metadata', () => {
      const set = new AuthorizedSignerSet([makeSigner(1)], { type: QuorumType.Threshold, threshold: 1 });
      set.applyAction({
        type: GovernanceActionType.SetMemberData,
        publicKey: makePk(1),
        metadata: new Map([['org', 'NewOrg']]),
      });
      expect(set.getSigner(makePk(1))!.metadata.get('org')).toBe('NewOrg');
    });
  });

  // ── applyAction: error paths ────────────────────────────────────────

  describe('applyAction error paths', () => {
    it('add_signer rejects duplicate non-retired key', () => {
      const set = new AuthorizedSignerSet([makeSigner(1)], { type: QuorumType.Threshold, threshold: 1 });
      expect(() =>
        set.applyAction({ type: GovernanceActionType.AddSigner, publicKey: makePk(1), role: SignerRole.Writer }),
      ).toThrow(LedgerError);
      try {
        set.applyAction({ type: GovernanceActionType.AddSigner, publicKey: makePk(1), role: SignerRole.Writer });
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(LedgerErrorType.InvalidStateTransition);
      }
    });

    it('add_signer allows re-adding a retired key', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      set.applyAction({ type: GovernanceActionType.RemoveSigner, publicKey: makePk(2) });
      expect(set.getSigner(makePk(2))!.status).toBe(SignerStatus.Retired);
      // Re-add should succeed
      set.applyAction({ type: GovernanceActionType.AddSigner, publicKey: makePk(2), role: SignerRole.Writer });
      expect(set.getSigner(makePk(2))!.status).toBe(SignerStatus.Active);
    });

    it('remove_signer rejects when would leave zero active admins', () => {
      const set = new AuthorizedSignerSet([makeSigner(1)], { type: QuorumType.Threshold, threshold: 1 });
      expect(() =>
        set.applyAction({ type: GovernanceActionType.RemoveSigner, publicKey: makePk(1) }),
      ).toThrow(LedgerError);
      try {
        set.applyAction({ type: GovernanceActionType.RemoveSigner, publicKey: makePk(1) });
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(LedgerErrorType.GovernanceSafetyViolation);
      }
    });

    it('remove_signer rejects when would drop below quorum threshold', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2)],
        { type: QuorumType.Threshold, threshold: 2 },
      );
      expect(() =>
        set.applyAction({ type: GovernanceActionType.RemoveSigner, publicKey: makePk(2) }),
      ).toThrow(LedgerError);
      try {
        set.applyAction({ type: GovernanceActionType.RemoveSigner, publicKey: makePk(2) });
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(LedgerErrorType.GovernanceSafetyViolation);
      }
    });

    it('change_role rejects demoting last active admin', () => {
      const set = new AuthorizedSignerSet([makeSigner(1)], { type: QuorumType.Threshold, threshold: 1 });
      expect(() =>
        set.applyAction({ type: GovernanceActionType.ChangeRole, publicKey: makePk(1), newRole: SignerRole.Writer }),
      ).toThrow(LedgerError);
      try {
        set.applyAction({ type: GovernanceActionType.ChangeRole, publicKey: makePk(1), newRole: SignerRole.Writer });
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(LedgerErrorType.GovernanceSafetyViolation);
      }
    });

    it('update_quorum rejects threshold > active admin count', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      expect(() =>
        set.applyAction({ type: GovernanceActionType.UpdateQuorum, newPolicy: { type: QuorumType.Threshold, threshold: 5 } }),
      ).toThrow(LedgerError);
      try {
        set.applyAction({ type: GovernanceActionType.UpdateQuorum, newPolicy: { type: QuorumType.Threshold, threshold: 5 } });
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(LedgerErrorType.GovernanceSafetyViolation);
      }
    });

    it('suspend_signer rejects already-suspended signer', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2, SignerRole.Writer, SignerStatus.Suspended)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      expect(() =>
        set.applyAction({ type: GovernanceActionType.SuspendSigner, publicKey: makePk(2) }),
      ).toThrow(LedgerError);
      try {
        set.applyAction({ type: GovernanceActionType.SuspendSigner, publicKey: makePk(2) });
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(LedgerErrorType.InvalidStateTransition);
      }
    });

    it('suspend_signer rejects when would leave zero active admins', () => {
      const set = new AuthorizedSignerSet([makeSigner(1)], { type: QuorumType.Threshold, threshold: 1 });
      expect(() =>
        set.applyAction({ type: GovernanceActionType.SuspendSigner, publicKey: makePk(1) }),
      ).toThrow(LedgerError);
      try {
        set.applyAction({ type: GovernanceActionType.SuspendSigner, publicKey: makePk(1) });
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(LedgerErrorType.GovernanceSafetyViolation);
      }
    });

    it('reactivate_signer rejects active signer', () => {
      const set = new AuthorizedSignerSet([makeSigner(1)], { type: QuorumType.Threshold, threshold: 1 });
      expect(() =>
        set.applyAction({ type: GovernanceActionType.ReactivateSigner, publicKey: makePk(1) }),
      ).toThrow(LedgerError);
      try {
        set.applyAction({ type: GovernanceActionType.ReactivateSigner, publicKey: makePk(1) });
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(LedgerErrorType.InvalidStateTransition);
      }
    });

    it('reactivate_signer rejects retired signer', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      set.applyAction({ type: GovernanceActionType.RemoveSigner, publicKey: makePk(2) });
      expect(() =>
        set.applyAction({ type: GovernanceActionType.ReactivateSigner, publicKey: makePk(2) }),
      ).toThrow(LedgerError);
      try {
        set.applyAction({ type: GovernanceActionType.ReactivateSigner, publicKey: makePk(2) });
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(LedgerErrorType.InvalidStateTransition);
      }
    });

    it('set_member_data rejects retired signer', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      set.applyAction({ type: GovernanceActionType.RemoveSigner, publicKey: makePk(2) });
      expect(() =>
        set.applyAction({ type: GovernanceActionType.SetMemberData, publicKey: makePk(2), metadata: new Map() }),
      ).toThrow(LedgerError);
      try {
        set.applyAction({ type: GovernanceActionType.SetMemberData, publicKey: makePk(2), metadata: new Map() });
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(LedgerErrorType.InvalidGovernanceTarget);
      }
    });

    it('set_member_data rejects unknown signer', () => {
      const set = new AuthorizedSignerSet([makeSigner(1)], { type: QuorumType.Threshold, threshold: 1 });
      expect(() =>
        set.applyAction({ type: GovernanceActionType.SetMemberData, publicKey: makePk(99), metadata: new Map() }),
      ).toThrow(LedgerError);
    });
  });

  // ── verifyQuorum ──────────────────────────────────────────────────

  describe('verifyQuorum', () => {
    it('unanimous: requires all active admins', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2), makeSigner(3)],
        { type: QuorumType.Unanimous },
      );
      expect(set.verifyQuorum([makePk(1), makePk(2), makePk(3)])).toBe(true);
      expect(set.verifyQuorum([makePk(1), makePk(2)])).toBe(false);
      expect(set.verifyQuorum([makePk(1)])).toBe(false);
      expect(set.verifyQuorum([])).toBe(false);
    });

    it('majority: requires >50% of active admins', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2), makeSigner(3)],
        { type: QuorumType.Majority },
      );
      // 3 admins → majority = floor(3/2)+1 = 2
      expect(set.verifyQuorum([makePk(1), makePk(2)])).toBe(true);
      expect(set.verifyQuorum([makePk(1), makePk(2), makePk(3)])).toBe(true);
      expect(set.verifyQuorum([makePk(1)])).toBe(false);
    });

    it('threshold: requires at least N active admins', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2), makeSigner(3)],
        { type: QuorumType.Threshold, threshold: 2 },
      );
      expect(set.verifyQuorum([makePk(1), makePk(2)])).toBe(true);
      expect(set.verifyQuorum([makePk(1)])).toBe(false);
    });

    it('ignores non-admin signers in quorum count', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2, SignerRole.Writer), makeSigner(3)],
        { type: QuorumType.Threshold, threshold: 2 },
      );
      // pk(2) is a writer, not counted
      expect(set.verifyQuorum([makePk(1), makePk(2)])).toBe(false);
      expect(set.verifyQuorum([makePk(1), makePk(3)])).toBe(true);
    });

    it('ignores suspended admins in quorum count', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2, SignerRole.Admin, SignerStatus.Suspended), makeSigner(3)],
        { type: QuorumType.Threshold, threshold: 2 },
      );
      expect(set.verifyQuorum([makePk(1), makePk(2)])).toBe(false);
      expect(set.verifyQuorum([makePk(1), makePk(3)])).toBe(true);
    });
  });

  // ── clone ─────────────────────────────────────────────────────────

  describe('clone', () => {
    it('produces an independent copy', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      const cloned = set.clone();
      // Mutate original
      set.applyAction({ type: GovernanceActionType.RemoveSigner, publicKey: makePk(2) });
      // Clone should be unaffected
      expect(cloned.getSigner(makePk(2))!.status).toBe(SignerStatus.Active);
      expect(cloned.activeAdminCount).toBe(2);
      expect(set.getSigner(makePk(2))!.status).toBe(SignerStatus.Retired);
    });

    it('preserves quorum policy', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2)],
        { type: QuorumType.Majority },
      );
      const cloned = set.clone();
      expect(cloned.quorumPolicy.type).toBe(QuorumType.Majority);
    });
  });

  // ── activeAdminCount tracking ─────────────────────────────────────

  describe('activeAdminCount tracking', () => {
    it('decrements on remove_signer of admin', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2), makeSigner(3)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      expect(set.activeAdminCount).toBe(3);
      set.applyAction({ type: GovernanceActionType.RemoveSigner, publicKey: makePk(2) });
      expect(set.activeAdminCount).toBe(2);
    });

    it('decrements on suspend_signer of admin', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      set.applyAction({ type: GovernanceActionType.SuspendSigner, publicKey: makePk(2) });
      expect(set.activeAdminCount).toBe(1);
    });

    it('increments on reactivate_signer of admin', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2, SignerRole.Admin, SignerStatus.Suspended)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      expect(set.activeAdminCount).toBe(1);
      set.applyAction({ type: GovernanceActionType.ReactivateSigner, publicKey: makePk(2) });
      expect(set.activeAdminCount).toBe(2);
    });

    it('increments on add_signer with admin role', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      set.applyAction({ type: GovernanceActionType.AddSigner, publicKey: makePk(2), role: SignerRole.Admin });
      expect(set.activeAdminCount).toBe(2);
    });

    it('does not change on add_signer with writer role', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      set.applyAction({ type: GovernanceActionType.AddSigner, publicKey: makePk(2), role: SignerRole.Writer });
      expect(set.activeAdminCount).toBe(1);
    });

    it('adjusts on change_role admin→writer and writer→admin', () => {
      const set = new AuthorizedSignerSet(
        [makeSigner(1), makeSigner(2), makeSigner(3, SignerRole.Writer)],
        { type: QuorumType.Threshold, threshold: 1 },
      );
      expect(set.activeAdminCount).toBe(2);
      // Demote admin → writer
      set.applyAction({ type: GovernanceActionType.ChangeRole, publicKey: makePk(2), newRole: SignerRole.Writer });
      expect(set.activeAdminCount).toBe(1);
      // Promote writer → admin
      set.applyAction({ type: GovernanceActionType.ChangeRole, publicKey: makePk(3), newRole: SignerRole.Admin });
      expect(set.activeAdminCount).toBe(2);
    });
  });
});
