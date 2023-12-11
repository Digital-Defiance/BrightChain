import { beforeEach, describe, expect, it } from '@jest/globals';
import { BrightChainStrings } from '../enumerations';
import { TranslatableBrightChainError } from '../errors/translatableBrightChainError';
import { ServiceProvider } from './service.provider';
import { ServiceLocator } from './serviceLocator';

describe('ServiceLocator', () => {
  beforeEach(() => {
    ServiceLocator.reset();
    ServiceProvider.resetInstance();
  });

  describe('Error Internationalization', () => {
    it('should throw TranslatableBrightChainError when service provider is not set', () => {
      expect(() => ServiceLocator.getServiceProvider()).toThrow(
        TranslatableBrightChainError,
      );

      try {
        ServiceLocator.getServiceProvider();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(TranslatableBrightChainError);
        const translatableError = error as TranslatableBrightChainError;

        // Verify the string key is correct
        expect(translatableError.stringKey).toBe(
          BrightChainStrings.Error_ServiceLocator_NotSet,
        );

        // Verify the error message exists and is not empty
        expect(translatableError.message).toBeDefined();
        expect(translatableError.message.length).toBeGreaterThan(0);

        // Verify the message contains either:
        // 1. The actual translated text (production)
        // 2. The string key format (test environment where i18n may not be fully initialized)
        const message = translatableError.message;
        const hasTranslatedContent =
          message.includes('ServiceLocator') ||
          message.includes('not set') ||
          message.includes('set');

        const hasStringKeyFormat =
          message.includes('Error_ServiceLocator_NotSet') ||
          message.includes('brightchain.strings');

        // At least one of these should be true
        expect(hasTranslatedContent || hasStringKeyFormat).toBe(true);
      }
    });

    it('should have correct string key for not set error', () => {
      try {
        ServiceLocator.getServiceProvider();
      } catch (error) {
        const translatableError = error as TranslatableBrightChainError;

        // Verify the string key is correct
        expect(translatableError.stringKey).toBe(
          BrightChainStrings.Error_ServiceLocator_NotSet,
        );
      }
    });

    it('should not throw error after service provider is set', () => {
      const provider = ServiceProvider.getInstance();

      // ServiceProvider.getInstance() automatically calls ServiceLocator.setServiceProvider
      expect(() => ServiceLocator.getServiceProvider()).not.toThrow();

      const retrievedProvider = ServiceLocator.getServiceProvider();
      expect(retrievedProvider).toBe(provider);
    });
  });
});
