/* eslint-disable @nx/enforce-module-boundaries */
import { SecureString } from '@brightchain/brightchain-lib';
import { KeyWrappingService } from './keyWrapping';

describe('Authentication Unit Tests', () => {
  let keyWrappingService: KeyWrappingService;
  beforeAll(() => {
    keyWrappingService = new KeyWrappingService();
  });
  describe('KeyWrappingService', () => {
    it('should wrap and unwrap master key correctly', () => {
      const password = new SecureString('Testpassword123!');
      const { masterKey, wrappedKey } =
        keyWrappingService.wrapNewMasterKey(password);

      expect(wrappedKey.salt).toBeTruthy();
      expect(wrappedKey.iv).toBeTruthy();
      expect(wrappedKey.authTag).toBeTruthy();
      expect(wrappedKey.encryptedMasterKey).toBeTruthy();
      expect(wrappedKey.iterations).toBeGreaterThan(0);

      const unwrapped = keyWrappingService.unwrapMasterKey(
        wrappedKey,
        password,
      );
      expect(unwrapped.value).toEqual(masterKey.value);

      password.dispose();
      masterKey.dispose();
      unwrapped.dispose();
    });

    it('should fail with wrong password', () => {
      const correctPassword = new SecureString('Testpassword123!');
      const wrongPassword = new SecureString('wrong123');
      const { masterKey, wrappedKey } =
        keyWrappingService.wrapNewMasterKey(correctPassword);

      expect(() => {
        keyWrappingService.unwrapMasterKey(wrappedKey, wrongPassword);
      }).toThrow();

      correctPassword.dispose();
      wrongPassword.dispose();
      masterKey.dispose();
    });

    it('should handle password change', () => {
      const oldPassword = new SecureString('Testpassword123!');
      const newPassword = new SecureString('Testpassword234!');
      const { masterKey, wrappedKey } =
        keyWrappingService.wrapNewMasterKey(oldPassword);

      const newWrappedKey = keyWrappingService.changePassword(
        wrappedKey,
        oldPassword,
        newPassword,
      );

      // Should unwrap with new password
      const unwrapped = keyWrappingService.unwrapMasterKey(
        newWrappedKey,
        newPassword,
      );
      expect(unwrapped.value).toEqual(masterKey.value);

      // Should fail with old password
      expect(() => {
        keyWrappingService.unwrapMasterKey(newWrappedKey, oldPassword);
      }).toThrow();

      oldPassword.dispose();
      newPassword.dispose();
      masterKey.dispose();
      unwrapped.dispose();
    });
  });

  // SecureString and SecureBuffer are comprehensively tested in their own test files
  // secure-string.spec.ts and secure-buffer.spec.ts
});
