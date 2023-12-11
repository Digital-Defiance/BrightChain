import { beforeEach, describe, expect, it } from '@jest/globals';
import { BrightChainStrings } from '../enumerations';
import { TranslatableBrightChainError } from '../errors/translatableBrightChainError';
import {
  getGlobalServiceProvider,
  setGlobalServiceProvider,
} from './globalServiceProvider';
import { ServiceProvider } from './service.provider';

describe('GlobalServiceProvider', () => {
  beforeEach(() => {
    // Reset both ServiceProvider and the global service provider
    ServiceProvider.resetInstance();
    // Manually reset the global service provider by setting it to null
    setGlobalServiceProvider(null);
  });

  describe('Error Internationalization', () => {
    it('should throw TranslatableBrightChainError when service provider is not initialized', () => {
      expect(() => getGlobalServiceProvider()).toThrow(
        TranslatableBrightChainError,
      );

      try {
        getGlobalServiceProvider();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(TranslatableBrightChainError);
        const translatableError = error as TranslatableBrightChainError;

        // Verify the string key is correct
        expect(translatableError.stringKey).toBe(
          BrightChainStrings.GlobalServiceProvider_NotInitialized,
        );

        // Verify the error message exists and is not empty
        expect(translatableError.message).toBeDefined();
        expect(translatableError.message.length).toBeGreaterThan(0);

        // Verify the message contains either:
        // 1. The actual translated text (production)
        // 2. The string key format (test environment where i18n may not be fully initialized)
        const message = translatableError.message;
        const hasTranslatedContent =
          message.includes('ServiceProvider') ||
          message.includes('initialized') ||
          message.includes('not');

        const hasStringKeyFormat =
          message.includes('Error_ServiceProvider_NotInitialized') ||
          message.includes('brightchain.strings');

        // At least one of these should be true
        expect(hasTranslatedContent || hasStringKeyFormat).toBe(true);
      }
    });

    it('should have correct string key for not initialized error', () => {
      try {
        getGlobalServiceProvider();
      } catch (error) {
        const translatableError = error as TranslatableBrightChainError;

        // Verify the string key is correct
        expect(translatableError.stringKey).toBe(
          BrightChainStrings.GlobalServiceProvider_NotInitialized,
        );
      }
    });

    it('should not throw error after service provider is set', () => {
      const provider = ServiceProvider.getInstance();

      // ServiceProvider.getInstance() automatically sets the global service provider
      expect(() => getGlobalServiceProvider()).not.toThrow();

      const retrievedProvider = getGlobalServiceProvider();
      expect(retrievedProvider).toBe(provider);
    });

    it('should allow manual setting of service provider', () => {
      const mockProvider = { test: 'mock' };
      setGlobalServiceProvider(mockProvider);

      expect(() => getGlobalServiceProvider()).not.toThrow();
      const retrievedProvider = getGlobalServiceProvider();
      expect(retrievedProvider).toBe(mockProvider);
    });
  });
});
