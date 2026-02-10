/**
 * Unit tests for SplitPaperKeyService.
 *
 * Validates Requirements 2.1, 2.2, 2.3, 2.4, 2.7
 */

import { ECIESService } from '@digitaldefiance/ecies-lib';
import * as secretsModule from '@digitaldefiance/secrets';
import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

import { initializeBrightChain } from '../../init';
import { ServiceProvider } from '../service.provider';
import { PaperKeyService } from './paperKeyService';
import { SplitPaperKeyService } from './splitPaperKeyService';

// Handle both ESM default export and CommonJS module.exports patterns
const secrets =
  (secretsModule as typeof secretsModule & { default?: typeof secretsModule })
    .default ?? secretsModule;

describe('SplitPaperKeyService', () => {
  let eciesService: ECIESService;
  let validPaperKey: string;

  beforeAll(() => {
    initializeBrightChain();
    secrets.init(8, 'nodeCryptoRandomBytes');
  });

  beforeEach(() => {
    ServiceProvider.resetInstance();
    eciesService = ServiceProvider.getInstance().eciesService;
    const secureKey = PaperKeyService.generatePaperKey(eciesService);
    validPaperKey = secureKey.value!;
  });

  describe('split', () => {
    it('should split a paper key into the requested number of shares', () => {
      const shares = SplitPaperKeyService.split(validPaperKey, 5, 3);
      expect(shares).toHaveLength(5);
    });

    it('should produce shares that are non-empty word strings', () => {
      const shares = SplitPaperKeyService.split(validPaperKey, 3, 2);
      for (const share of shares) {
        const words = share.trim().split(/\s+/);
        expect(words.length).toBeGreaterThan(0);
        // Each word should be in the BIP39 wordlist
        for (const word of words) {
          expect(wordlist).toContain(word);
        }
      }
    });

    it('should produce unique shares', () => {
      const shares = SplitPaperKeyService.split(validPaperKey, 5, 3);
      const uniqueShares = new Set(shares);
      expect(uniqueShares.size).toBe(5);
    });

    it('should throw for an invalid mnemonic', () => {
      expect(() =>
        SplitPaperKeyService.split('not a valid mnemonic', 3, 2),
      ).toThrow('Invalid paper key');
    });

    it('should throw when threshold exceeds shares', () => {
      expect(() => SplitPaperKeyService.split(validPaperKey, 3, 5)).toThrow(
        'Threshold',
      );
    });

    it('should throw when shares < 2', () => {
      expect(() => SplitPaperKeyService.split(validPaperKey, 1, 1)).toThrow();
    });

    it('should throw when threshold < 2', () => {
      expect(() => SplitPaperKeyService.split(validPaperKey, 5, 1)).toThrow(
        'Threshold',
      );
    });

    it('should work with minimum parameters (2 shares, threshold 2)', () => {
      const shares = SplitPaperKeyService.split(validPaperKey, 2, 2);
      expect(shares).toHaveLength(2);
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct the original paper key from threshold shares', () => {
      const shares = SplitPaperKeyService.split(validPaperKey, 5, 3);
      const recovered = SplitPaperKeyService.reconstruct(shares.slice(0, 3), 5);
      expect(recovered).toBe(validPaperKey);
    });

    it('should reconstruct from all shares', () => {
      const shares = SplitPaperKeyService.split(validPaperKey, 5, 3);
      const recovered = SplitPaperKeyService.reconstruct(shares, 5);
      expect(recovered).toBe(validPaperKey);
    });

    it('should reconstruct from any combination of threshold shares', () => {
      const shares = SplitPaperKeyService.split(validPaperKey, 5, 3);

      // Try different combinations of 3 shares
      const combos = [
        [shares[0], shares[1], shares[2]],
        [shares[0], shares[2], shares[4]],
        [shares[1], shares[3], shares[4]],
        [shares[2], shares[3], shares[4]],
      ];

      for (const combo of combos) {
        const recovered = SplitPaperKeyService.reconstruct(combo, 5);
        expect(recovered).toBe(validPaperKey);
      }
    });

    it('should reconstruct with minimum split (2 shares, threshold 2)', () => {
      const shares = SplitPaperKeyService.split(validPaperKey, 2, 2);
      const recovered = SplitPaperKeyService.reconstruct(shares, 2);
      expect(recovered).toBe(validPaperKey);
    });

    it('should produce a valid BIP39 mnemonic on reconstruction', () => {
      const shares = SplitPaperKeyService.split(validPaperKey, 3, 2);
      const recovered = SplitPaperKeyService.reconstruct(shares.slice(0, 2), 3);
      expect(validateMnemonic(recovered, wordlist)).toBe(true);
    });

    it('should throw when fewer than 2 shares are provided', () => {
      const shares = SplitPaperKeyService.split(validPaperKey, 3, 2);
      expect(() => SplitPaperKeyService.reconstruct([shares[0]], 3)).toThrow(
        'At least 2 shares',
      );
    });

    it('should throw for empty shares array', () => {
      expect(() => SplitPaperKeyService.reconstruct([], 3)).toThrow(
        'At least 2 shares',
      );
    });
  });

  describe('generateShareTemplate', () => {
    it('should generate a template with correct share metadata', async () => {
      const shares = SplitPaperKeyService.split(validPaperKey, 5, 3);
      const template = await SplitPaperKeyService.generateShareTemplate(
        shares[0],
        1,
        5,
        3,
      );

      expect(template.shareNumber).toBe(1);
      expect(template.totalShares).toBe(5);
      expect(template.threshold).toBe(3);
    });

    it('should include the share words as an array', async () => {
      const shares = SplitPaperKeyService.split(validPaperKey, 3, 2);
      const template = await SplitPaperKeyService.generateShareTemplate(
        shares[0],
        1,
        3,
        2,
      );

      expect(Array.isArray(template.words)).toBe(true);
      expect(template.words.length).toBeGreaterThan(0);
      // Each word should be in the BIP39 wordlist
      for (const word of template.words) {
        expect(wordlist).toContain(word);
      }
    });

    it('should include a QR code as a data URL', async () => {
      const shares = SplitPaperKeyService.split(validPaperKey, 3, 2);
      const template = await SplitPaperKeyService.generateShareTemplate(
        shares[0],
        1,
        3,
        2,
      );

      expect(template.qrCode).toMatch(/^data:image\/png;base64,/);
      const base64Content = template.qrCode.replace(
        'data:image/png;base64,',
        '',
      );
      expect(base64Content.length).toBeGreaterThan(0);
    });

    it('should include a creation date', async () => {
      const before = new Date();
      const shares = SplitPaperKeyService.split(validPaperKey, 3, 2);
      const template = await SplitPaperKeyService.generateShareTemplate(
        shares[0],
        1,
        3,
        2,
      );
      const after = new Date();

      expect(template.createdAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(template.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should include instructions with share number and threshold', async () => {
      const shares = SplitPaperKeyService.split(validPaperKey, 5, 3);
      const template = await SplitPaperKeyService.generateShareTemplate(
        shares[2],
        3,
        5,
        3,
      );

      expect(template.instructions).toContain('3');
      expect(template.instructions).toContain('5');
      expect(template.instructions).toContain('share');
    });
  });

  describe('round-trip with Member recovery', () => {
    it('should reconstruct a paper key that recovers the same Member', () => {
      const member1 = PaperKeyService.recoverFromPaperKey(
        validPaperKey,
        eciesService,
      );

      const shares = SplitPaperKeyService.split(validPaperKey, 5, 3);
      const recovered = SplitPaperKeyService.reconstruct(shares.slice(0, 3), 5);

      const member2 = PaperKeyService.recoverFromPaperKey(
        recovered,
        eciesService,
      );

      expect(Buffer.from(member1.publicKey)).toEqual(
        Buffer.from(member2.publicKey),
      );
    });
  });
});
