import { Constants } from './constants';
import { IApiConstants } from './interfaces/api-constants';

// Get WRAPPED_KEY from Constants
const WRAPPED_KEY = Constants.WRAPPED_KEY;

describe('API Constants Implementation', () => {
  describe('Constants Object Structure', () => {
    it('should be defined', () => {
      expect(Constants).toBeDefined();
    });

    it('should satisfy IApiConstants interface', () => {
      // Type check - if this compiles, Constants satisfies IApiConstants
      const constants: IApiConstants = Constants;
      expect(constants).toBeDefined();
    });
  });

  describe('Upstream Constants Included', () => {
    it('should include PBKDF2 from upstream', () => {
      expect(Constants.PBKDF2).toBeDefined();
      expect(Constants.PBKDF2.ALGORITHM).toBeDefined();
      expect(Constants.PBKDF2.SALT_BYTES).toBeDefined();
      expect(Constants.PBKDF2.ITERATIONS_PER_SECOND).toBeDefined();
    });

    it('should include CHECKSUM from upstream', () => {
      expect(Constants.CHECKSUM).toBeDefined();
      expect(Constants.CHECKSUM.SHA3_DEFAULT_HASH_BITS).toBeDefined();
      expect(Constants.CHECKSUM.SHA3_BUFFER_LENGTH).toBeDefined();
      expect(Constants.CHECKSUM.ALGORITHM).toBeDefined();
      expect(Constants.CHECKSUM.ENCODING).toBeDefined();
    });

    it('should include FEC from upstream', () => {
      expect(Constants.FEC).toBeDefined();
      expect(Constants.FEC.MAX_SHARD_SIZE).toBeDefined();
    });

    it('should include KEYRING from upstream', () => {
      expect(Constants.KEYRING).toBeDefined();
      expect(Constants.KEYRING.ALGORITHM).toBeDefined();
      expect(Constants.KEYRING.KEY_BITS).toBeDefined();
      expect(Constants.KEYRING.MODE).toBeDefined();
    });

    it('should include ENCRYPTION from upstream', () => {
      expect(Constants.ENCRYPTION).toBeDefined();
      expect(Constants.ENCRYPTION.ENCRYPTION_TYPE_SIZE).toBeDefined();
      expect(Constants.ENCRYPTION.RECIPIENT_ID_SIZE).toBeDefined();
    });

    it('should include KEYRING_ALGORITHM_CONFIGURATION from upstream', () => {
      expect(Constants.KEYRING_ALGORITHM_CONFIGURATION).toBeDefined();
      expect(typeof Constants.KEYRING_ALGORITHM_CONFIGURATION).toBe('string');
    });

    it('should include MEMBER_ID_LENGTH from upstream', () => {
      expect(Constants.MEMBER_ID_LENGTH).toBeDefined();
      expect(typeof Constants.MEMBER_ID_LENGTH).toBe('number');
    });
  });

  describe('WRAPPED_KEY Constants', () => {
    it('should be defined', () => {
      expect(WRAPPED_KEY).toBeDefined();
    });

    it('should have SALT_SIZE of 32', () => {
      expect(WRAPPED_KEY.SALT_SIZE).toBe(32);
    });

    it('should have IV_SIZE of 16', () => {
      expect(WRAPPED_KEY.IV_SIZE).toBe(16);
    });

    it('should have MASTER_KEY_SIZE of 32', () => {
      expect(WRAPPED_KEY.MASTER_KEY_SIZE).toBe(32);
    });

    it('should have MIN_ITERATIONS of 100000', () => {
      expect(WRAPPED_KEY.MIN_ITERATIONS).toBe(100000);
    });

    it('should be included in Constants object', () => {
      expect(Constants.WRAPPED_KEY).toBeDefined();
      expect(Constants.WRAPPED_KEY).toEqual(WRAPPED_KEY);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain the same constant names as before refactoring', () => {
      // Verify that all expected constant names are accessible
      expect(Constants.PBKDF2).toBeDefined();
      expect(Constants.WRAPPED_KEY).toBeDefined();
      expect(Constants.CHECKSUM).toBeDefined();
      expect(Constants.FEC).toBeDefined();
      expect(Constants.KEYRING).toBeDefined();
      expect(Constants.ENCRYPTION).toBeDefined();
      expect(Constants.KEYRING_ALGORITHM_CONFIGURATION).toBeDefined();
    });

    it('should maintain the same constant values as before refactoring', () => {
      // Verify critical constant values haven't changed
      expect(Constants.WRAPPED_KEY.SALT_SIZE).toBe(32);
      expect(Constants.WRAPPED_KEY.IV_SIZE).toBe(16);
      expect(Constants.WRAPPED_KEY.MASTER_KEY_SIZE).toBe(32);
      expect(Constants.WRAPPED_KEY.MIN_ITERATIONS).toBe(100000);
    });

    it('should maintain nested property access', () => {
      // Verify nested properties are accessible
      expect(Constants.PBKDF2.ALGORITHM).toBeDefined();
      expect(Constants.CHECKSUM.ALGORITHM).toBeDefined();
      expect(Constants.KEYRING.ALGORITHM).toBeDefined();
      expect(Constants.WRAPPED_KEY.SALT_SIZE).toBeDefined();
    });
  });

  describe('Constants from createExpressConstants', () => {
    it('should use createExpressConstants with correct domain', () => {
      // Verify that constants created by createExpressConstants are present
      // These should include JWT, Site, and other Express-specific constants
      expect(Constants.JWT).toBeDefined();
      expect(Constants.Site).toBeDefined();
    });

    it('should have site name set to BrightChain', () => {
      expect(Constants.Site).toBe('BrightChain');
    });

    it('should have site hostname set to brightchain.org', () => {
      expect(Constants.SiteHostname).toBe('brightchain.org');
    });

    it('should have site email domain set to brightchain.org', () => {
      expect(Constants.SiteEmailDomain).toBe('brightchain.org');
    });
  });
});
