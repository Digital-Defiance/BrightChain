/**
 * Unit tests for IdentityProofService.
 *
 * Validates Requirements 4.1, 4.2, 4.3, 4.4, 4.6, 4.9
 */

import {
  ECIESService,
  Member,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';

import { ProofPlatform } from '../../enumerations/proofPlatform';
import { VerificationStatus } from '../../enumerations/verificationStatus';
import { initializeBrightChain } from '../../init';
import { ServiceProvider } from '../service.provider';
import {
  IdentityProofService,
  ProofCreationError,
} from './identityProofService';
import { PaperKeyService } from './paperKeyService';

describe('IdentityProofService', () => {
  let eciesService: ECIESService;
  let member: Member;
  let memberId: string;

  beforeAll(() => {
    initializeBrightChain();
  });

  beforeEach(() => {
    ServiceProvider.resetInstance();
    eciesService = ServiceProvider.getInstance().eciesService;
    const paperKey = PaperKeyService.generatePaperKey(eciesService);
    member = PaperKeyService.recoverFromPaperKey(paperKey.value!, eciesService);
    memberId = uint8ArrayToHex(member.idBytes);
  });

  describe('create', () => {
    it('should create a proof with correct fields', () => {
      const proof = IdentityProofService.create(
        member,
        ProofPlatform.GITHUB,
        'octocat',
      );

      expect(proof.id).toBeDefined();
      expect(proof.memberId).toBe(memberId);
      expect(proof.platform).toBe(ProofPlatform.GITHUB);
      expect(proof.username).toBe('octocat');
      expect(proof.proofUrl).toBe('');
      expect(proof.signedStatement).toContain('I am octocat on github');
      expect(proof.signedStatement).toContain(
        `My BrightChain ID is ${memberId}`,
      );
      expect(proof.signedStatement).toContain('Timestamp:');
      expect(proof.signature).toBeDefined();
      expect(proof.signature.length).toBeGreaterThan(0);
      expect(proof.createdAt).toBeInstanceOf(Date);
      expect(proof.verificationStatus).toBe(VerificationStatus.PENDING);
    });

    it('should support all defined platforms', () => {
      for (const platform of Object.values(ProofPlatform)) {
        const proof = IdentityProofService.create(member, platform, 'testuser');
        expect(proof.platform).toBe(platform);
        expect(proof.signedStatement).toContain(`on ${platform}`);
      }
    });

    it('should trim whitespace from username', () => {
      const proof = IdentityProofService.create(
        member,
        ProofPlatform.TWITTER,
        '  spaceduser  ',
      );
      expect(proof.username).toBe('spaceduser');
      expect(proof.signedStatement).toContain('I am spaceduser on');
    });

    it('should produce unique IDs for each proof', () => {
      const proof1 = IdentityProofService.create(
        member,
        ProofPlatform.GITHUB,
        'user1',
      );
      const proof2 = IdentityProofService.create(
        member,
        ProofPlatform.GITHUB,
        'user1',
      );
      expect(proof1.id).not.toBe(proof2.id);
    });

    it('should throw ProofCreationError for empty username', () => {
      expect(() =>
        IdentityProofService.create(member, ProofPlatform.GITHUB, ''),
      ).toThrow(ProofCreationError);
    });

    it('should throw ProofCreationError for whitespace-only username', () => {
      expect(() =>
        IdentityProofService.create(member, ProofPlatform.GITHUB, '   '),
      ).toThrow(ProofCreationError);
    });

    it('should throw ProofCreationError when member has no private key', () => {
      // Unload the private key to simulate a public-only member
      member.unloadPrivateKey();

      expect(() =>
        IdentityProofService.create(member, ProofPlatform.GITHUB, 'octocat'),
      ).toThrow(ProofCreationError);
    });

    it('should follow the Requirement 4.8 statement format', () => {
      const proof = IdentityProofService.create(
        member,
        ProofPlatform.TWITTER,
        'alice',
      );

      // Format: "I am {username} on {platform}. My BrightChain ID is {memberId}. Timestamp: {ISO8601}"
      const pattern = new RegExp(
        `^I am alice on twitter\\. My BrightChain ID is ${memberId}\\. Timestamp: \\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$`,
      );
      expect(proof.signedStatement).toMatch(pattern);
    });
  });

  describe('verify', () => {
    it('should verify a valid proof with the correct public key', () => {
      const proof = IdentityProofService.create(
        member,
        ProofPlatform.GITHUB,
        'octocat',
      );

      const isValid = IdentityProofService.verify(
        proof,
        member.publicKey,
        eciesService,
      );
      expect(isValid).toBe(true);
    });

    it('should reject a proof with a different public key', () => {
      const proof = IdentityProofService.create(
        member,
        ProofPlatform.GITHUB,
        'octocat',
      );

      // Create a different member with a different key pair
      const otherPaperKey = PaperKeyService.generatePaperKey(eciesService);
      const otherMember = PaperKeyService.recoverFromPaperKey(
        otherPaperKey.value!,
        eciesService,
      );

      const isValid = IdentityProofService.verify(
        proof,
        otherMember.publicKey,
        eciesService,
      );
      expect(isValid).toBe(false);
    });

    it('should reject a proof with a tampered statement', () => {
      const proof = IdentityProofService.create(
        member,
        ProofPlatform.GITHUB,
        'octocat',
      );

      // Tamper with the signed statement
      const tamperedProof = {
        ...proof,
        signedStatement: proof.signedStatement.replace('octocat', 'mallory'),
      };

      const isValid = IdentityProofService.verify(
        tamperedProof,
        member.publicKey,
        eciesService,
      );
      expect(isValid).toBe(false);
    });

    it('should reject a proof with a tampered signature', () => {
      const proof = IdentityProofService.create(
        member,
        ProofPlatform.GITHUB,
        'octocat',
      );

      // Tamper with the signature (flip a character)
      const tamperedSig = proof.signature.replace(
        proof.signature[0],
        proof.signature[0] === 'a' ? 'b' : 'a',
      );
      const tamperedProof = { ...proof, signature: tamperedSig };

      const isValid = IdentityProofService.verify(
        tamperedProof,
        member.publicKey,
        eciesService,
      );
      expect(isValid).toBe(false);
    });

    it('should return false for malformed signature hex', () => {
      const proof = IdentityProofService.create(
        member,
        ProofPlatform.GITHUB,
        'octocat',
      );

      const badProof = { ...proof, signature: 'not-valid-hex' };
      const isValid = IdentityProofService.verify(
        badProof,
        member.publicKey,
        eciesService,
      );
      expect(isValid).toBe(false);
    });

    it('should verify proofs across all platforms', () => {
      for (const platform of Object.values(ProofPlatform)) {
        const proof = IdentityProofService.create(member, platform, 'testuser');
        const isValid = IdentityProofService.verify(
          proof,
          member.publicKey,
          eciesService,
        );
        expect(isValid).toBe(true);
      }
    });
  });

  describe('checkProofUrl', () => {
    it('should return false for empty proof URL', async () => {
      const proof = IdentityProofService.create(
        member,
        ProofPlatform.GITHUB,
        'octocat',
      );
      // proofUrl is '' by default
      const result = await IdentityProofService.checkProofUrl(proof);
      expect(result).toBe(false);
    });

    it('should return false for whitespace-only proof URL', async () => {
      const proof = IdentityProofService.create(
        member,
        ProofPlatform.GITHUB,
        'octocat',
      );
      const proofWithWhitespace = { ...proof, proofUrl: '   ' };
      const result =
        await IdentityProofService.checkProofUrl(proofWithWhitespace);
      expect(result).toBe(false);
    });

    it('should return false for unreachable URL', async () => {
      const proof = IdentityProofService.create(
        member,
        ProofPlatform.GITHUB,
        'octocat',
      );
      const proofWithBadUrl = {
        ...proof,
        proofUrl: 'https://this-domain-does-not-exist-12345.example.com/proof',
      };
      const result = await IdentityProofService.checkProofUrl(proofWithBadUrl);
      expect(result).toBe(false);
    });
  });

  describe('getInstructions', () => {
    it('should return instructions for all supported platforms', () => {
      for (const platform of Object.values(ProofPlatform)) {
        const instructions = IdentityProofService.getInstructions(platform);
        expect(instructions).toBeDefined();
        expect(instructions.length).toBeGreaterThan(0);
      }
    });

    it('should return platform-specific content', () => {
      expect(
        IdentityProofService.getInstructions(ProofPlatform.TWITTER),
      ).toContain('tweet');
      expect(
        IdentityProofService.getInstructions(ProofPlatform.GITHUB),
      ).toContain('Gist');
      expect(
        IdentityProofService.getInstructions(ProofPlatform.REDDIT),
      ).toContain('Reddit');
      expect(
        IdentityProofService.getInstructions(ProofPlatform.WEBSITE),
      ).toContain('website');
      expect(
        IdentityProofService.getInstructions(ProofPlatform.BITCOIN),
      ).toContain('Bitcoin');
      expect(
        IdentityProofService.getInstructions(ProofPlatform.ETHEREUM),
      ).toContain('Ethereum');
    });

    it('should return a default instruction for unknown platforms', () => {
      const instructions = IdentityProofService.getInstructions('mastodon');
      expect(instructions).toContain('Post the signed statement publicly');
    });
  });

  describe('buildStatement', () => {
    it('should produce the correct format per Requirement 4.8', () => {
      const timestamp = '2024-01-15T12:00:00.000Z';
      const statement = IdentityProofService.buildStatement(
        'alice',
        ProofPlatform.GITHUB,
        'abc123',
        timestamp,
      );
      expect(statement).toBe(
        'I am alice on github. My BrightChain ID is abc123. Timestamp: 2024-01-15T12:00:00.000Z',
      );
    });
  });
});
