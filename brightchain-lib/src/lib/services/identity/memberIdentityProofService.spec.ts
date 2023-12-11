/**
 * Unit tests for MemberIdentityProofService.
 *
 * Tests the companion service that manages identity proofs
 * associated with BrightChain members.
 *
 * Requirements: 4.5, 4.7
 */

import { ProofPlatform } from '../../enumerations/proofPlatform';
import { VerificationStatus } from '../../enumerations/verificationStatus';
import { IIdentityProof } from '../../interfaces/identity/identityProof';
import {
  MemberIdentityProofService,
  ProofAlreadyRevokedError,
  ProofNotFoundError,
} from './memberIdentityProofService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeProof(overrides: Partial<IIdentityProof> = {}): IIdentityProof {
  return {
    id: overrides.id ?? 'proof-1',
    memberId: overrides.memberId ?? 'member-1',
    platform: overrides.platform ?? ProofPlatform.GITHUB,
    username: overrides.username ?? 'testuser',
    proofUrl: overrides.proofUrl ?? 'https://gist.github.com/testuser/abc',
    signedStatement: overrides.signedStatement ?? 'I am testuser on github',
    signature: overrides.signature ?? 'deadbeef',
    createdAt: overrides.createdAt ?? new Date(),
    verificationStatus:
      overrides.verificationStatus ?? VerificationStatus.PENDING,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('MemberIdentityProofService', () => {
  let service: MemberIdentityProofService;

  beforeEach(() => {
    service = new MemberIdentityProofService();
  });

  describe('addProof', () => {
    it('should add a proof for a member', () => {
      const proof = makeProof();
      service.addProof('member-1', proof);

      const proofs = service.getProofs('member-1');
      expect(proofs).toHaveLength(1);
      expect(proofs[0].id).toBe('proof-1');
    });

    it('should add multiple proofs for the same member', () => {
      service.addProof('member-1', makeProof({ id: 'proof-1' }));
      service.addProof(
        'member-1',
        makeProof({ id: 'proof-2', platform: ProofPlatform.TWITTER }),
      );

      const proofs = service.getProofs('member-1');
      expect(proofs).toHaveLength(2);
    });

    it('should keep proofs separate between members', () => {
      service.addProof('member-1', makeProof({ id: 'proof-1' }));
      service.addProof(
        'member-2',
        makeProof({ id: 'proof-2', memberId: 'member-2' }),
      );

      expect(service.getProofs('member-1')).toHaveLength(1);
      expect(service.getProofs('member-2')).toHaveLength(1);
    });

    it('should create an audit entry when adding a proof', () => {
      service.addProof('member-1', makeProof());

      const log = service.getAuditLog('member-1');
      expect(log).toHaveLength(1);
      expect(log[0].action).toBe('added');
      expect(log[0].proofId).toBe('proof-1');
    });
  });

  describe('revokeProof', () => {
    it('should revoke a proof', () => {
      service.addProof('member-1', makeProof());
      service.revokeProof('member-1', 'proof-1', 'Compromised');

      const proof = service.getProof('member-1', 'proof-1');
      expect(proof.verificationStatus).toBe(VerificationStatus.REVOKED);
      expect(proof.revokedAt).toBeDefined();
    });

    it('should throw ProofNotFoundError for non-existent proof', () => {
      expect(() => service.revokeProof('member-1', 'nonexistent')).toThrow(
        ProofNotFoundError,
      );
    });

    it('should throw ProofAlreadyRevokedError for already-revoked proof', () => {
      service.addProof('member-1', makeProof());
      service.revokeProof('member-1', 'proof-1');

      expect(() => service.revokeProof('member-1', 'proof-1')).toThrow(
        ProofAlreadyRevokedError,
      );
    });

    it('should create an audit entry when revoking', () => {
      service.addProof('member-1', makeProof());
      service.revokeProof('member-1', 'proof-1', 'Test reason');

      const log = service.getAuditLog('member-1');
      const revokeEntry = log.find((e) => e.action === 'revoked');
      expect(revokeEntry).toBeDefined();
      expect(revokeEntry?.reason).toBe('Test reason');
    });
  });

  describe('updateVerificationStatus', () => {
    it('should mark a proof as verified', () => {
      service.addProof('member-1', makeProof());
      service.updateVerificationStatus('member-1', 'proof-1', true);

      const proof = service.getProof('member-1', 'proof-1');
      expect(proof.verificationStatus).toBe(VerificationStatus.VERIFIED);
      expect(proof.verifiedAt).toBeDefined();
      expect(proof.lastCheckedAt).toBeDefined();
    });

    it('should mark a proof as failed', () => {
      service.addProof('member-1', makeProof());
      service.updateVerificationStatus('member-1', 'proof-1', false);

      const proof = service.getProof('member-1', 'proof-1');
      expect(proof.verificationStatus).toBe(VerificationStatus.FAILED);
      expect(proof.lastCheckedAt).toBeDefined();
    });

    it('should not update a revoked proof', () => {
      service.addProof('member-1', makeProof());
      service.revokeProof('member-1', 'proof-1');
      service.updateVerificationStatus('member-1', 'proof-1', true);

      const proof = service.getProof('member-1', 'proof-1');
      expect(proof.verificationStatus).toBe(VerificationStatus.REVOKED);
    });

    it('should create audit entries for verification updates', () => {
      service.addProof('member-1', makeProof());
      service.updateVerificationStatus('member-1', 'proof-1', true);

      const log = service.getAuditLog('member-1');
      const verifiedEntry = log.find((e) => e.action === 'verified');
      expect(verifiedEntry).toBeDefined();
    });
  });

  describe('getVerifiedProofs', () => {
    it('should return only verified proofs', () => {
      service.addProof('member-1', makeProof({ id: 'proof-1' }));
      service.addProof(
        'member-1',
        makeProof({
          id: 'proof-2',
          verificationStatus: VerificationStatus.VERIFIED,
        }),
      );
      service.addProof(
        'member-1',
        makeProof({
          id: 'proof-3',
          verificationStatus: VerificationStatus.FAILED,
        }),
      );

      const verified = service.getVerifiedProofs('member-1');
      expect(verified).toHaveLength(1);
      expect(verified[0].id).toBe('proof-2');
    });

    it('should return empty array for member with no proofs', () => {
      expect(service.getVerifiedProofs('nonexistent')).toHaveLength(0);
    });
  });

  describe('getProofCount', () => {
    it('should return total count without filter', () => {
      service.addProof('member-1', makeProof({ id: 'proof-1' }));
      service.addProof('member-1', makeProof({ id: 'proof-2' }));

      expect(service.getProofCount('member-1')).toBe(2);
    });

    it('should return filtered count with status', () => {
      service.addProof('member-1', makeProof({ id: 'proof-1' }));
      service.addProof(
        'member-1',
        makeProof({
          id: 'proof-2',
          verificationStatus: VerificationStatus.VERIFIED,
        }),
      );

      expect(
        service.getProofCount('member-1', VerificationStatus.VERIFIED),
      ).toBe(1);
      expect(
        service.getProofCount('member-1', VerificationStatus.PENDING),
      ).toBe(1);
    });

    it('should return 0 for member with no proofs', () => {
      expect(service.getProofCount('nonexistent')).toBe(0);
    });
  });

  describe('isRevoked', () => {
    it('should return false for non-revoked proof', () => {
      service.addProof('member-1', makeProof());
      expect(service.isRevoked('member-1', 'proof-1')).toBe(false);
    });

    it('should return true for revoked proof', () => {
      service.addProof('member-1', makeProof());
      service.revokeProof('member-1', 'proof-1');
      expect(service.isRevoked('member-1', 'proof-1')).toBe(true);
    });

    it('should throw for non-existent proof', () => {
      expect(() => service.isRevoked('member-1', 'nonexistent')).toThrow(
        ProofNotFoundError,
      );
    });
  });

  describe('clearMemberData', () => {
    it('should remove all proofs and audit log for a member', () => {
      service.addProof('member-1', makeProof());
      service.clearMemberData('member-1');

      expect(service.getProofs('member-1')).toHaveLength(0);
      expect(service.getAuditLog('member-1')).toHaveLength(0);
    });

    it('should not affect other members', () => {
      service.addProof('member-1', makeProof({ id: 'proof-1' }));
      service.addProof(
        'member-2',
        makeProof({ id: 'proof-2', memberId: 'member-2' }),
      );
      service.clearMemberData('member-1');

      expect(service.getProofs('member-1')).toHaveLength(0);
      expect(service.getProofs('member-2')).toHaveLength(1);
    });
  });

  describe('getProofs', () => {
    it('should return empty array for unknown member', () => {
      expect(service.getProofs('unknown')).toHaveLength(0);
    });
  });

  describe('getAuditLog', () => {
    it('should return empty array for unknown member', () => {
      expect(service.getAuditLog('unknown')).toHaveLength(0);
    });

    it('should maintain chronological order', () => {
      service.addProof('member-1', makeProof({ id: 'proof-1' }));
      service.addProof('member-1', makeProof({ id: 'proof-2' }));
      service.revokeProof('member-1', 'proof-1');

      const log = service.getAuditLog('member-1');
      expect(log).toHaveLength(3);
      expect(log[0].action).toBe('added');
      expect(log[1].action).toBe('added');
      expect(log[2].action).toBe('revoked');
    });
  });
});
