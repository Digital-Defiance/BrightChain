/**
 * Property-Based Tests for PublicKeyDirectoryService
 *
 * These tests validate universal properties of the public key directory
 * using fast-check for property-based testing.
 *
 * **Property 4: Public Directory Search Consistency**
 * **Validates: Requirements 5.2, 5.4, 5.9**
 *
 * @module services/identity/publicKeyDirectoryService.property.spec
 */

import * as fc from 'fast-check';

import { ProofPlatform } from '../../enumerations/proofPlatform';
import { VerificationStatus } from '../../enumerations/verificationStatus';
import { IIdentityProof } from '../../interfaces/identity/identityProof';
import { IPublicProfile } from '../../interfaces/identity/publicProfile';
import { PublicKeyDirectoryService } from './publicKeyDirectoryService';

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Arbitrary that generates a non-empty alphanumeric member ID.
 */
const arbMemberId: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-zA-Z0-9]{4,20}$/)
  .filter((s) => s.length >= 4);

/**
 * Arbitrary that generates a non-empty display name.
 */
const arbDisplayName: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{0,29}$/)
  .filter((s) => s.trim().length > 0);

/**
 * Arbitrary that generates a hex-encoded public key stub.
 */
const arbPublicKey: fc.Arbitrary<string> = fc
  .stringMatching(/^04[a-f0-9]{8,32}$/)
  .filter((s) => s.length >= 10);

/**
 * Arbitrary that picks a random ProofPlatform value.
 */
const arbPlatform = fc.constantFrom(
  ProofPlatform.TWITTER,
  ProofPlatform.GITHUB,
  ProofPlatform.REDDIT,
  ProofPlatform.WEBSITE,
  ProofPlatform.BITCOIN,
  ProofPlatform.ETHEREUM,
);

/**
 * Arbitrary that generates a non-empty alphanumeric username.
 */
const arbUsername: fc.Arbitrary<string> =
  fc.stringMatching(/^[a-zA-Z0-9]{1,30}$/);

/**
 * Arbitrary that generates a verified identity proof.
 */
function arbVerifiedProof(
  memberId: string,
  platform?: ProofPlatform,
): fc.Arbitrary<IIdentityProof> {
  return fc
    .record({
      id: arbMemberId,
      username: arbUsername,
      platform: platform ? fc.constant(platform) : arbPlatform,
    })
    .map(({ id, username, platform: plat }) => ({
      id,
      memberId,
      platform: plat,
      username,
      proofUrl: `https://example.com/${username}`,
      signedStatement: `I am ${username} on ${plat}`,
      signature: 'deadbeef',
      createdAt: new Date(),
      verifiedAt: new Date(),
      verificationStatus: VerificationStatus.VERIFIED,
    }));
}

/**
 * Arbitrary that generates a public profile with optional privacy mode.
 */
function arbProfile(privacyMode = false): fc.Arbitrary<IPublicProfile> {
  return fc
    .record({
      memberId: arbMemberId,
      displayName: arbDisplayName,
      publicKey: arbPublicKey,
    })
    .chain(({ memberId, displayName, publicKey }) =>
      fc
        .array(arbVerifiedProof(memberId), { minLength: 0, maxLength: 3 })
        .map((proofs) => ({
          memberId,
          displayName,
          publicKey,
          identityProofs: proofs,
          createdAt: new Date(),
          updatedAt: new Date(),
          privacyMode,
        })),
    );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PublicKeyDirectoryService - Property Tests', () => {
  let directory: PublicKeyDirectoryService;

  beforeEach(() => {
    directory = new PublicKeyDirectoryService();
  });

  describe('Property 4: Public Directory Search Consistency', () => {
    /**
     * Property 4a: Search by Display Name
     *
     * For any profile added to the directory with privacyMode=false,
     * searching by the exact display name SHALL return that profile
     * in the results.
     *
     * **Validates: Requirements 5.2**
     */
    it('should find profiles by their exact display name', () => {
      fc.assert(
        fc.property(arbProfile(false), (profile: IPublicProfile) => {
          directory.clear();
          directory.updateProfile(profile);

          const response = directory.search(profile.displayName);

          expect(response.totalCount).toBeGreaterThanOrEqual(1);
          const memberIds = response.results.map((r) => r.profile.memberId);
          expect(memberIds).toContain(profile.memberId);
        }),
        { numRuns: 15 },
      );
    });

    /**
     * Property 4b: Privacy Mode Exclusion
     *
     * For any profile with privacyMode=true, searching by any query
     * SHALL NOT return that profile in the results.
     *
     * **Validates: Requirements 5.9**
     */
    it('should exclude private profiles from search results', () => {
      fc.assert(
        fc.property(arbProfile(true), (profile: IPublicProfile) => {
          directory.clear();
          directory.updateProfile(profile);

          // Search by display name
          const byName = directory.search(profile.displayName);
          const nameIds = byName.results.map((r) => r.profile.memberId);
          expect(nameIds).not.toContain(profile.memberId);

          // Search by member ID
          const byId = directory.search(profile.memberId);
          const idIds = byId.results.map((r) => r.profile.memberId);
          expect(idIds).not.toContain(profile.memberId);
        }),
        { numRuns: 15 },
      );
    });

    /**
     * Property 4c: Only Verified Proofs Contribute to Username Search
     *
     * For any profile, only verified identity proofs' usernames
     * SHALL be searchable. Unverified proof usernames SHALL NOT
     * produce matches.
     *
     * **Validates: Requirements 5.4**
     */
    it('should only match on verified proof usernames', () => {
      // Use a fixed, long unique username that won't appear in
      // generated member IDs or display names by coincidence.
      const fixedUsername = 'xyzproofuser42test';

      fc.assert(
        fc.property(
          arbMemberId,
          arbPublicKey,
          arbPlatform,
          (memberId: string, publicKey: string, platform: ProofPlatform) => {
            directory.clear();

            // Ensure the member ID and display name do NOT contain
            // the fixed username as a substring.
            const lowerUsername = fixedUsername.toLowerCase();
            if (memberId.toLowerCase().includes(lowerUsername)) {
              return; // skip this run — extremely unlikely
            }

            const safeDisplayName = 'SafeName1234';

            // Create a profile with a PENDING (unverified) proof
            const unverifiedProof: IIdentityProof = {
              id: 'proof-1',
              memberId,
              platform,
              username: fixedUsername,
              proofUrl: `https://example.com/${fixedUsername}`,
              signedStatement: `I am ${fixedUsername} on ${platform}`,
              signature: 'deadbeef',
              createdAt: new Date(),
              verificationStatus: VerificationStatus.PENDING,
            };

            const profile: IPublicProfile = {
              memberId,
              displayName: safeDisplayName,
              publicKey,
              identityProofs: [unverifiedProof],
              createdAt: new Date(),
              updatedAt: new Date(),
              privacyMode: false,
            };

            directory.updateProfile(profile);

            // Searching by the unverified username should NOT match
            const response = directory.search(fixedUsername);
            const memberIds = response.results.map((r) => r.profile.memberId);
            expect(memberIds).not.toContain(memberId);
          },
        ),
        { numRuns: 15 },
      );
    });

    /**
     * Property 4d: Search Results Are Ordered by Relevance
     *
     * For any set of profiles, search results SHALL be returned in
     * descending order of relevance score.
     *
     * **Validates: Requirements 5.2, 5.3**
     */
    it('should return results in descending relevance order', () => {
      fc.assert(
        fc.property(
          fc.array(arbProfile(false), { minLength: 2, maxLength: 10 }),
          fc.stringMatching(/^[a-zA-Z]{1,5}$/),
          (profiles: IPublicProfile[], query: string) => {
            directory.clear();

            // Deduplicate by memberId
            const seen = new Set<string>();
            for (const p of profiles) {
              if (!seen.has(p.memberId)) {
                seen.add(p.memberId);
                directory.updateProfile(p);
              }
            }

            const response = directory.search(query);

            // Verify descending relevance order
            for (let i = 1; i < response.results.length; i++) {
              expect(
                response.results[i - 1].relevanceScore,
              ).toBeGreaterThanOrEqual(response.results[i].relevanceScore);
            }
          },
        ),
        { numRuns: 15 },
      );
    });

    /**
     * Property 4e: Privacy Mode Toggle Consistency
     *
     * Toggling privacy mode twice SHALL restore the original state,
     * and the profile SHALL reappear in search results.
     *
     * **Validates: Requirements 5.6, 5.9**
     */
    it('should restore searchability after double privacy toggle', () => {
      fc.assert(
        fc.property(arbProfile(false), (profile: IPublicProfile) => {
          directory.clear();
          directory.updateProfile(profile);

          // Initially searchable
          const before = directory.search(profile.displayName);
          const beforeIds = before.results.map((r) => r.profile.memberId);
          expect(beforeIds).toContain(profile.memberId);

          // Toggle to private — should disappear
          directory.togglePrivacyMode(profile.memberId);
          const hidden = directory.search(profile.displayName);
          const hiddenIds = hidden.results.map((r) => r.profile.memberId);
          expect(hiddenIds).not.toContain(profile.memberId);

          // Toggle back to public — should reappear
          directory.togglePrivacyMode(profile.memberId);
          const after = directory.search(profile.displayName);
          const afterIds = after.results.map((r) => r.profile.memberId);
          expect(afterIds).toContain(profile.memberId);
        }),
        { numRuns: 15 },
      );
    });
  });
});
