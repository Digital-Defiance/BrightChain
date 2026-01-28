import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BrightChainStrings } from '../enumerations';
import { TranslatableBrightChainError } from '../errors/translatableBrightChainError';
import { IBlockStore } from '../interfaces/storage/blockStore';
import { TupleStorageService } from './tupleStorageService';

/**
 * Unit tests for Tuple Storage Service error internationalization
 *
 * Feature: error-message-internationalization
 * Validates: Requirements 7.2
 */
describe('TupleStorageService Error Internationalization', () => {
  let mockBlockStore: jest.Mocked<IBlockStore>;
  let service: TupleStorageService;

  beforeEach(() => {
    // Create a mock block store
    mockBlockStore = {
      blockSize: 1024,
      setData: jest.fn(),
      getData: jest.fn(),
      generateParityBlocks: jest.fn(),
      recoverBlock: jest.fn(),
    } as unknown as jest.Mocked<IBlockStore>;

    service = new TupleStorageService(mockBlockStore);
  });

  describe('storeTuple error handling', () => {
    it('should throw TranslatableBrightChainError when data exceeds block size', async () => {
      // Create data larger than block size
      const largeData = new Uint8Array(2048); // Larger than blockSize (1024)

      await expect(service.storeTuple(largeData)).rejects.toThrow(
        TranslatableBrightChainError,
      );

      try {
        await service.storeTuple(largeData);
      } catch (error) {
        expect(error).toBeInstanceOf(TranslatableBrightChainError);
        const translatableError = error as TranslatableBrightChainError;

        // Verify the string key is correct
        expect(translatableError.stringKey).toBe(
          BrightChainStrings.Error_TupleStorage_DataExceedsBlockSizeTemplate,
        );

        // Verify the error message contains the translated text
        expect(translatableError.message).toBeDefined();
        expect(translatableError.message.length).toBeGreaterThan(0);

        // Verify the message contains either:
        // 1. The actual translated text with substituted values (production)
        // 2. The string key format (test environment where i18n may not be fully initialized)
        const message = translatableError.message;
        const hasTranslatedContent =
          message.includes('2048') ||
          message.includes('1024') ||
          message.includes('Data size') ||
          message.includes('exceeds') ||
          message.includes('block size');

        const hasStringKeyFormat =
          message.includes('Error_TupleStorage_DataExceedsBlockSizeTemplate') ||
          message.includes('brightchain.strings');

        // At least one of these should be true
        expect(hasTranslatedContent || hasStringKeyFormat).toBe(true);
      }
    });
  });

  describe('parseTupleMagnetUrl error handling', () => {
    it('should throw TranslatableBrightChainError for invalid protocol', () => {
      const invalidUrl =
        'http://example.com?xt=urn:brightchain:tuple&bs=1024&d=abc&r1=def&r2=ghi';

      expect(() => service.parseTupleMagnetUrl(invalidUrl)).toThrow(
        TranslatableBrightChainError,
      );

      try {
        service.parseTupleMagnetUrl(invalidUrl);
      } catch (error) {
        expect(error).toBeInstanceOf(TranslatableBrightChainError);
        const translatableError = error as TranslatableBrightChainError;

        // Verify the string key is correct
        expect(translatableError.stringKey).toBe(
          BrightChainStrings.Error_TupleStorage_InvalidMagnetProtocol,
        );

        // Verify the error message contains the translated text
        expect(translatableError.message).toBeDefined();
        expect(translatableError.message.length).toBeGreaterThan(0);

        // Verify the message contains either:
        // 1. The actual translated text (production)
        // 2. The string key format (test environment where i18n may not be fully initialized)
        const message = translatableError.message;
        const hasTranslatedContent =
          message.includes('magnet') ||
          message.includes('protocol') ||
          message.includes('Invalid');

        const hasStringKeyFormat =
          message.includes('Error_TupleStorage_InvalidMagnetProtocol') ||
          message.includes('brightchain.strings');

        // At least one of these should be true
        expect(hasTranslatedContent || hasStringKeyFormat).toBe(true);
      }
    });

    it('should throw TranslatableBrightChainError for invalid magnet type', () => {
      const invalidUrl =
        'magnet:?xt=urn:brightchain:invalid&bs=1024&d=abc&r1=def&r2=ghi';

      expect(() => service.parseTupleMagnetUrl(invalidUrl)).toThrow(
        TranslatableBrightChainError,
      );

      try {
        service.parseTupleMagnetUrl(invalidUrl);
      } catch (error) {
        expect(error).toBeInstanceOf(TranslatableBrightChainError);
        const translatableError = error as TranslatableBrightChainError;

        // Verify the string key is correct
        expect(translatableError.stringKey).toBe(
          BrightChainStrings.Error_TupleStorage_InvalidMagnetType,
        );

        // Verify the error message contains the translated text
        expect(translatableError.message).toBeDefined();
        expect(translatableError.message.length).toBeGreaterThan(0);

        // Verify the message contains either:
        // 1. The actual translated text (production)
        // 2. The string key format (test environment where i18n may not be fully initialized)
        const message = translatableError.message;
        const hasTranslatedContent =
          message.includes('tuple') ||
          message.includes('type') ||
          message.includes('Invalid') ||
          message.includes('Expected');

        const hasStringKeyFormat =
          message.includes('Error_TupleStorage_InvalidMagnetType') ||
          message.includes('brightchain.strings');

        // At least one of these should be true
        expect(hasTranslatedContent || hasStringKeyFormat).toBe(true);
      }
    });

    it('should throw TranslatableBrightChainError for missing magnet parameters', () => {
      const invalidUrl = 'magnet:?xt=urn:brightchain:tuple&bs=1024';

      expect(() => service.parseTupleMagnetUrl(invalidUrl)).toThrow(
        TranslatableBrightChainError,
      );

      try {
        service.parseTupleMagnetUrl(invalidUrl);
      } catch (error) {
        expect(error).toBeInstanceOf(TranslatableBrightChainError);
        const translatableError = error as TranslatableBrightChainError;

        // Verify the string key is correct
        expect(translatableError.stringKey).toBe(
          BrightChainStrings.Error_TupleStorage_MissingMagnetParameters,
        );

        // Verify the error message contains the translated text
        expect(translatableError.message).toBeDefined();
        expect(translatableError.message.length).toBeGreaterThan(0);

        // Verify the message contains either:
        // 1. The actual translated text (production)
        // 2. The string key format (test environment where i18n may not be fully initialized)
        const message = translatableError.message;
        const hasTranslatedContent =
          message.includes('parameter') ||
          message.includes('Missing') ||
          message.includes('required') ||
          message.includes('magnet');

        const hasStringKeyFormat =
          message.includes('Error_TupleStorage_MissingMagnetParameters') ||
          message.includes('brightchain.strings');

        // At least one of these should be true
        expect(hasTranslatedContent || hasStringKeyFormat).toBe(true);
      }
    });
  });

  describe('error message translation verification', () => {
    it('should have non-empty translated messages for all Tuple Storage errors', () => {
      const tupleStorageErrors = [
        BrightChainStrings.Error_TupleStorage_DataExceedsBlockSizeTemplate,
        BrightChainStrings.Error_TupleStorage_InvalidMagnetProtocol,
        BrightChainStrings.Error_TupleStorage_InvalidMagnetType,
        BrightChainStrings.Error_TupleStorage_MissingMagnetParameters,
      ];

      tupleStorageErrors.forEach((errorKey) => {
        const error = new TranslatableBrightChainError(errorKey, {
          DATA_SIZE: 100,
          BLOCK_SIZE: 50,
        });

        // Verify the error message is defined and not empty
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);

        // Verify the message is not just the key name
        expect(error.message).not.toBe(errorKey);
      });
    });
  });
});
