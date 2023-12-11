/**
 * Unit tests for PaperKeyService.
 *
 * Validates Requirements 1.1, 1.2, 1.3, 1.4, 1.8, 1.10
 */

import { ECIESService, SecureString } from '@digitaldefiance/ecies-lib';

import { initializeBrightChain } from '../../init';
import { ServiceProvider } from '../service.provider';
import { PaperKeyService } from './paperKeyService';

describe('PaperKeyService', () => {
  let eciesService: ECIESService;

  beforeAll(() => {
    initializeBrightChain();
  });

  beforeEach(() => {
    ServiceProvider.resetInstance();
    eciesService = ServiceProvider.getInstance().eciesService;
  });

  describe('generatePaperKey', () => {
    it('should generate a SecureString mnemonic', () => {
      const paperKey = PaperKeyService.generatePaperKey(eciesService);
      expect(paperKey).toBeInstanceOf(SecureString);
      expect(paperKey.value).toBeDefined();
    });

    it('should generate a 24-word mnemonic', () => {
      const paperKey = PaperKeyService.generatePaperKey(eciesService);
      const words = paperKey.value!.trim().split(/\s+/);
      expect(words).toHaveLength(24);
    });

    it('should generate unique mnemonics on each call', () => {
      const key1 = PaperKeyService.generatePaperKey(eciesService);
      const key2 = PaperKeyService.generatePaperKey(eciesService);
      expect(key1.value).not.toBe(key2.value);
    });
  });

  describe('validatePaperKey', () => {
    it('should return true for a valid generated paper key', () => {
      const paperKey = PaperKeyService.generatePaperKey(eciesService);
      const isValid = PaperKeyService.validatePaperKey(
        paperKey.value!,
        eciesService,
      );
      expect(isValid).toBe(true);
    });

    it('should return false for an empty string', () => {
      expect(PaperKeyService.validatePaperKey('', eciesService)).toBe(false);
    });

    it('should return false for random words', () => {
      const garbage = Array.from({ length: 24 }, () => 'notaword').join(' ');
      expect(PaperKeyService.validatePaperKey(garbage, eciesService)).toBe(
        false,
      );
    });

    it('should return false for too few words', () => {
      const tooFew = 'abandon ability able about above absent';
      expect(PaperKeyService.validatePaperKey(tooFew, eciesService)).toBe(
        false,
      );
    });

    it('should return false for too many words', () => {
      const paperKey = PaperKeyService.generatePaperKey(eciesService);
      const tooMany = paperKey.value! + ' extra';
      expect(PaperKeyService.validatePaperKey(tooMany, eciesService)).toBe(
        false,
      );
    });
  });

  describe('recoverFromPaperKey', () => {
    it('should recover a Member from a valid paper key', () => {
      const paperKey = PaperKeyService.generatePaperKey(eciesService);
      const member = PaperKeyService.recoverFromPaperKey(
        paperKey.value!,
        eciesService,
      );

      expect(member).toBeDefined();
      expect(member.publicKey).toBeDefined();
      expect(member.hasPrivateKey).toBe(true);
    });

    it('should recover the same member identity from the same paper key', () => {
      const paperKey = PaperKeyService.generatePaperKey(eciesService);
      const member1 = PaperKeyService.recoverFromPaperKey(
        paperKey.value!,
        eciesService,
      );
      const member2 = PaperKeyService.recoverFromPaperKey(
        paperKey.value!,
        eciesService,
      );

      // Same mnemonic should produce the same public key
      expect(Buffer.from(member1.publicKey)).toEqual(
        Buffer.from(member2.publicKey),
      );
    });

    it('should throw for an invalid paper key', () => {
      expect(() =>
        PaperKeyService.recoverFromPaperKey('invalid mnemonic', eciesService),
      ).toThrow();
    });

    it('should use the provided name for the recovered member', () => {
      const paperKey = PaperKeyService.generatePaperKey(eciesService);
      const member = PaperKeyService.recoverFromPaperKey(
        paperKey.value!,
        eciesService,
        'Alice',
      );
      expect(member.name).toBe('Alice');
    });

    it('should default to "Recovered User" when no name is provided', () => {
      const paperKey = PaperKeyService.generatePaperKey(eciesService);
      const member = PaperKeyService.recoverFromPaperKey(
        paperKey.value!,
        eciesService,
      );
      expect(member.name).toBe('Recovered User');
    });
  });

  describe('generateTemplate', () => {
    it('should generate a template with 24 words', async () => {
      const paperKey = PaperKeyService.generatePaperKey(eciesService);
      const template = await PaperKeyService.generateTemplate(
        paperKey.value!,
        'test-member-id',
      );

      expect(template.words).toHaveLength(24);
    });

    it('should include a QR code as a data URL', async () => {
      const paperKey = PaperKeyService.generatePaperKey(eciesService);
      const template = await PaperKeyService.generateTemplate(
        paperKey.value!,
        'test-member-id',
      );

      expect(template.qrCode).toMatch(/^data:image\/png;base64,/);
      // Verify the base64 content is non-empty
      const base64Content = template.qrCode.replace(
        'data:image/png;base64,',
        '',
      );
      expect(base64Content.length).toBeGreaterThan(0);
    });

    it('should include the member ID', async () => {
      const paperKey = PaperKeyService.generatePaperKey(eciesService);
      const template = await PaperKeyService.generateTemplate(
        paperKey.value!,
        'my-member-id',
      );

      expect(template.memberId).toBe('my-member-id');
    });

    it('should include a creation date', async () => {
      const before = new Date();
      const paperKey = PaperKeyService.generatePaperKey(eciesService);
      const template = await PaperKeyService.generateTemplate(
        paperKey.value!,
        'test-member-id',
      );
      const after = new Date();

      expect(template.createdAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(template.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should include storage instructions', async () => {
      const paperKey = PaperKeyService.generatePaperKey(eciesService);
      const template = await PaperKeyService.generateTemplate(
        paperKey.value!,
        'test-member-id',
      );

      expect(template.instructions).toContain('secure location');
    });

    it('should include all required security warnings per Requirement 1.10', async () => {
      const paperKey = PaperKeyService.generatePaperKey(eciesService);
      const template = await PaperKeyService.generateTemplate(
        paperKey.value!,
        'test-member-id',
      );

      expect(template.warnings).toHaveLength(3);
      expect(template.warnings).toContain(
        'Anyone with this paper key can access your account',
      );
      expect(template.warnings).toContain(
        'Do not store digitally or photograph',
      );
      expect(template.warnings).toContain(
        'Consider splitting among trusted parties',
      );
    });
  });
});
