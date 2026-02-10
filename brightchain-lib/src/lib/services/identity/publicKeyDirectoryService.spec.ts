/**
 * Unit tests for PublicKeyDirectoryService.
 *
 * Validates Requirements 5.1, 5.2, 5.3, 5.5, 5.6, 5.9, 5.10
 */

import { ProofPlatform } from '../../enumerations/proofPlatform';
import { VerificationStatus } from '../../enumerations/verificationStatus';
import { IIdentityProof } from '../../interfaces/identity/identityProof';
import { IPublicProfile } from '../../interfaces/identity/publicProfile';
import {
  InvalidProfileError,
  ProfileNotFoundError,
  PublicKeyDirectoryService,
} from './publicKeyDirectoryService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeProof(overrides: Partial<IIdentityProof> = {}): IIdentityProof {
  return {
    id: 'proof-1',
    memberId: 'member-1',
    platform: ProofPlatform.GITHUB,
    username: 'octocat',
    proofUrl: 'https://gist.github.com/octocat/abc',
    signedStatement: 'I am octocat on github...',
    signature: 'deadbeef',
    createdAt: new Date(),
    verificationStatus: VerificationStatus.VERIFIED,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<IPublicProfile> = {}): IPublicProfile {
  return {
    memberId: 'member-1',
    displayName: 'Alice',
    publicKey: '04abcdef1234567890',
    identityProofs: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    privacyMode: false,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PublicKeyDirectoryService', () => {
  let directory: PublicKeyDirectoryService;

  beforeEach(() => {
    directory = new PublicKeyDirectoryService();
  });

  // ── updateProfile ───────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('should add a new profile to the directory', () => {
      const profile = makeProfile();
      directory.updateProfile(profile);

      expect(directory.size).toBe(1);
      expect(directory.hasProfile('member-1')).toBe(true);
    });

    it('should replace an existing profile and update updatedAt', () => {
      const original = makeProfile({ displayName: 'Alice' });
      directory.updateProfile(original);

      const originalStored = directory.getProfile('member-1');
      const originalUpdatedAt = originalStored.updatedAt;

      // Small delay to ensure timestamp differs
      const updated = makeProfile({ displayName: 'Alice B.' });
      directory.updateProfile(updated);

      const result = directory.getProfile('member-1');
      expect(result.displayName).toBe('Alice B.');
      expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      );
    });

    it('should preserve createdAt when updating an existing profile', () => {
      const original = makeProfile();
      const originalCreatedAt = original.createdAt;
      directory.updateProfile(original);

      const updated = makeProfile({
        displayName: 'Alice Updated',
        createdAt: new Date(Date.now() + 100000),
      });
      directory.updateProfile(updated);

      const result = directory.getProfile('member-1');
      expect(result.createdAt).toBe(originalCreatedAt);
    });

    it('should throw InvalidProfileError for empty memberId', () => {
      const profile = makeProfile({ memberId: '' });
      expect(() => directory.updateProfile(profile)).toThrow(
        InvalidProfileError,
      );
    });

    it('should throw InvalidProfileError for empty displayName', () => {
      const profile = makeProfile({ displayName: '   ' });
      expect(() => directory.updateProfile(profile)).toThrow(
        InvalidProfileError,
      );
    });

    it('should throw InvalidProfileError for empty publicKey', () => {
      const profile = makeProfile({ publicKey: '' });
      expect(() => directory.updateProfile(profile)).toThrow(
        InvalidProfileError,
      );
    });
  });

  // ── getProfile ──────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('should return a stored profile by member ID', () => {
      directory.updateProfile(makeProfile({ memberId: 'member-abc' }));

      const result = directory.getProfile('member-abc');
      expect(result.memberId).toBe('member-abc');
    });

    it('should return profiles in privacy mode (direct access allowed)', () => {
      directory.updateProfile(
        makeProfile({ memberId: 'private-member', privacyMode: true }),
      );

      const result = directory.getProfile('private-member');
      expect(result.privacyMode).toBe(true);
    });

    it('should throw ProfileNotFoundError for unknown member', () => {
      expect(() => directory.getProfile('nonexistent')).toThrow(
        ProfileNotFoundError,
      );
    });
  });

  // ── togglePrivacyMode ───────────────────────────────────────────────────

  describe('togglePrivacyMode', () => {
    it('should toggle privacy mode from false to true', () => {
      directory.updateProfile(makeProfile({ privacyMode: false }));

      const result = directory.togglePrivacyMode('member-1');
      expect(result).toBe(true);
      expect(directory.getProfile('member-1').privacyMode).toBe(true);
    });

    it('should toggle privacy mode from true to false', () => {
      directory.updateProfile(makeProfile({ privacyMode: true }));

      const result = directory.togglePrivacyMode('member-1');
      expect(result).toBe(false);
      expect(directory.getProfile('member-1').privacyMode).toBe(false);
    });

    it('should update the updatedAt timestamp', () => {
      const profile = makeProfile();
      directory.updateProfile(profile);
      const before = directory.getProfile('member-1').updatedAt;

      directory.togglePrivacyMode('member-1');

      const after = directory.getProfile('member-1').updatedAt;
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should throw ProfileNotFoundError for unknown member', () => {
      expect(() => directory.togglePrivacyMode('nonexistent')).toThrow(
        ProfileNotFoundError,
      );
    });
  });

  // ── search ──────────────────────────────────────────────────────────────

  describe('search', () => {
    it('should return empty results for empty query', () => {
      directory.updateProfile(makeProfile());

      const result = directory.search('');
      expect(result.results).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should return empty results for whitespace-only query', () => {
      directory.updateProfile(makeProfile());

      const result = directory.search('   ');
      expect(result.results).toHaveLength(0);
    });

    it('should match by display name (case-insensitive)', () => {
      directory.updateProfile(makeProfile({ displayName: 'Alice' }));

      const result = directory.search('alice');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].profile.displayName).toBe('Alice');
    });

    it('should match by display name prefix', () => {
      directory.updateProfile(makeProfile({ displayName: 'Alice Wonderland' }));

      const result = directory.search('Ali');
      expect(result.results).toHaveLength(1);
    });

    it('should match by display name substring', () => {
      directory.updateProfile(makeProfile({ displayName: 'Alice Wonderland' }));

      const result = directory.search('Wonder');
      expect(result.results).toHaveLength(1);
    });

    it('should match by member ID', () => {
      directory.updateProfile(makeProfile({ memberId: 'member-xyz-123' }));

      const result = directory.search('member-xyz-123');
      expect(result.results).toHaveLength(1);
    });

    it('should match by social username from verified proofs', () => {
      const proof = makeProof({
        username: 'octocat',
        verificationStatus: VerificationStatus.VERIFIED,
      });
      directory.updateProfile(makeProfile({ identityProofs: [proof] }));

      const result = directory.search('octocat');
      expect(result.results).toHaveLength(1);
    });

    it('should NOT match by social username from unverified proofs', () => {
      const proof = makeProof({
        username: 'octocat',
        verificationStatus: VerificationStatus.PENDING,
      });
      directory.updateProfile(
        makeProfile({
          displayName: 'Bob',
          memberId: 'member-bob',
          identityProofs: [proof],
        }),
      );

      // Search for the username — should not match since proof is pending
      const result = directory.search('octocat');
      expect(result.results).toHaveLength(0);
    });

    it('should exclude profiles in privacy mode from search results', () => {
      directory.updateProfile(
        makeProfile({ memberId: 'public', displayName: 'Public User' }),
      );
      directory.updateProfile(
        makeProfile({
          memberId: 'private',
          displayName: 'Private User',
          privacyMode: true,
        }),
      );

      const result = directory.search('User');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].profile.memberId).toBe('public');
    });

    it('should return results with relevance scores', () => {
      directory.updateProfile(
        makeProfile({ memberId: 'member-1', displayName: 'Alice' }),
      );

      const result = directory.search('Alice');
      expect(result.results[0].relevanceScore).toBeGreaterThan(0);
    });

    it('should rank exact display name match higher than substring match', () => {
      directory.updateProfile(
        makeProfile({ memberId: 'member-1', displayName: 'Alice' }),
      );
      directory.updateProfile(
        makeProfile({ memberId: 'member-2', displayName: 'Alice Wonderland' }),
      );

      const result = directory.search('Alice');
      expect(result.results[0].profile.memberId).toBe('member-1');
      expect(result.results[0].relevanceScore).toBeGreaterThan(
        result.results[1].relevanceScore,
      );
    });

    it('should rank exact member ID match highest', () => {
      directory.updateProfile(
        makeProfile({ memberId: 'alice', displayName: 'alice' }),
      );
      directory.updateProfile(
        makeProfile({ memberId: 'bob', displayName: 'alice-fan' }),
      );

      const result = directory.search('alice');
      // The exact member ID match should rank first
      expect(result.results[0].profile.memberId).toBe('alice');
    });

    it('should give bonus score for verified proofs', () => {
      const proofVerified = makeProof({
        verificationStatus: VerificationStatus.VERIFIED,
      });
      directory.updateProfile(
        makeProfile({
          memberId: 'member-verified',
          displayName: 'TestUser',
          identityProofs: [proofVerified],
        }),
      );
      directory.updateProfile(
        makeProfile({
          memberId: 'member-noproofs',
          displayName: 'TestUser2',
          identityProofs: [],
        }),
      );

      const result = directory.search('TestUser');
      // Both match, but verified one should have higher score
      const verifiedResult = result.results.find(
        (r) => r.profile.memberId === 'member-verified',
      );
      const noProofsResult = result.results.find(
        (r) => r.profile.memberId === 'member-noproofs',
      );
      expect(verifiedResult!.relevanceScore).toBeGreaterThan(
        noProofsResult!.relevanceScore,
      );
    });

    it('should not return profiles that do not match the query', () => {
      directory.updateProfile(
        makeProfile({ memberId: 'member-1', displayName: 'Alice' }),
      );

      const result = directory.search('Zephyr');
      expect(result.results).toHaveLength(0);
    });
  });

  // ── search pagination ─────────────────────────────────────────────────

  describe('search pagination', () => {
    beforeEach(() => {
      // Add 5 profiles that all match "User"
      for (let i = 0; i < 5; i++) {
        directory.updateProfile(
          makeProfile({
            memberId: `member-${i}`,
            displayName: `User ${i}`,
            publicKey: `key-${i}`,
          }),
        );
      }
    });

    it('should respect limit option', () => {
      const result = directory.search('User', { limit: 2 });
      expect(result.results).toHaveLength(2);
      expect(result.totalCount).toBe(5);
      expect(result.hasMore).toBe(true);
    });

    it('should respect offset option', () => {
      const result = directory.search('User', { limit: 2, offset: 3 });
      expect(result.results).toHaveLength(2);
      expect(result.totalCount).toBe(5);
      expect(result.hasMore).toBe(false);
    });

    it('should return hasMore=false when all results fit', () => {
      const result = directory.search('User', { limit: 10 });
      expect(result.results).toHaveLength(5);
      expect(result.hasMore).toBe(false);
    });

    it('should default to limit=20', () => {
      // All 5 fit within default limit
      const result = directory.search('User');
      expect(result.results).toHaveLength(5);
    });
  });

  // ── search platform filter ────────────────────────────────────────────

  describe('search platform filter', () => {
    it('should filter by verified platform', () => {
      const githubProof = makeProof({
        platform: ProofPlatform.GITHUB,
        verificationStatus: VerificationStatus.VERIFIED,
      });
      const twitterProof = makeProof({
        id: 'proof-2',
        platform: ProofPlatform.TWITTER,
        username: 'alice_tw',
        verificationStatus: VerificationStatus.VERIFIED,
      });

      directory.updateProfile(
        makeProfile({
          memberId: 'github-user',
          displayName: 'Dev Alice',
          identityProofs: [githubProof],
        }),
      );
      directory.updateProfile(
        makeProfile({
          memberId: 'twitter-user',
          displayName: 'Dev Bob',
          identityProofs: [twitterProof],
        }),
      );

      const result = directory.search('Dev', {
        platformFilter: ProofPlatform.GITHUB,
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].profile.memberId).toBe('github-user');
    });

    it('should not include profiles with unverified proofs on filtered platform', () => {
      const pendingProof = makeProof({
        platform: ProofPlatform.GITHUB,
        verificationStatus: VerificationStatus.PENDING,
      });
      directory.updateProfile(
        makeProfile({
          displayName: 'Dev Charlie',
          identityProofs: [pendingProof],
        }),
      );

      const result = directory.search('Dev', {
        platformFilter: ProofPlatform.GITHUB,
      });
      expect(result.results).toHaveLength(0);
    });
  });

  // ── removeProfile / hasProfile / clear ────────────────────────────────

  describe('removeProfile', () => {
    it('should remove an existing profile', () => {
      directory.updateProfile(makeProfile());

      const removed = directory.removeProfile('member-1');
      expect(removed).toBe(true);
      expect(directory.hasProfile('member-1')).toBe(false);
    });

    it('should return false for non-existent profile', () => {
      expect(directory.removeProfile('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all profiles', () => {
      directory.updateProfile(makeProfile({ memberId: 'a' }));
      directory.updateProfile(makeProfile({ memberId: 'b' }));

      directory.clear();
      expect(directory.size).toBe(0);
    });
  });
});
