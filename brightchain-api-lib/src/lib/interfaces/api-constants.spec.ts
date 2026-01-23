import { IConstants as IBrightChainConstants } from '@brightchain/brightchain-lib';
import { IConstants as IExpressConstants } from '@digitaldefiance/node-express-suite';
import { IApiConstants } from './api-constants';

describe('IApiConstants Type Structure', () => {
  describe('Type Composition', () => {
    it('should include all properties from IExpressConstants', () => {
      // This test verifies that IApiConstants includes IExpressConstants properties
      const mockApiConstants: IApiConstants = {} as IApiConstants;
      const mockExpressConstants: IExpressConstants = mockApiConstants;

      // If this compiles, it means IApiConstants includes IExpressConstants
      expect(mockExpressConstants).toBeDefined();
    });

    it('should include BrightChain-specific properties (excluding PBKDF2_PROFILES)', () => {
      // This test verifies that IApiConstants includes IBrightChainConstants properties
      // Note: PBKDF2_PROFILES is omitted due to type conflict between the two interfaces
      const mockApiConstants: IApiConstants = {} as IApiConstants;

      // Check that BrightChain-specific properties are accessible
      // These are from IBrightChainConstants (via Omit)
      type HasCBL = IApiConstants extends { CBL: unknown } ? true : false;
      type HasTuple = IApiConstants extends { TUPLE: unknown } ? true : false;
      type HasSealing = IApiConstants extends { SEALING: unknown } ? true : false;

      const hasCBL: HasCBL = true;
      const hasTuple: HasTuple = true;
      const hasSealing: HasSealing = true;

      expect(hasCBL).toBe(true);
      expect(hasTuple).toBe(true);
      expect(hasSealing).toBe(true);
      expect(mockApiConstants).toBeDefined();
    });
  });

  describe('Duplicate Interfaces Removed', () => {
    it('should not have local checksum-consts.ts file', () => {
      // Verify that the duplicate interface file has been removed
      expect(() => {
        // This will throw if the file doesn't exist
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./checksum-consts');
      }).toThrow();
    });

    it('should not have local encryption-consts.ts file', () => {
      // Verify that the duplicate interface file has been removed
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./encryption-consts');
      }).toThrow();
    });

    it('should not have local fec-consts.ts file', () => {
      // Verify that the duplicate interface file has been removed
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./fec-consts');
      }).toThrow();
    });

    it('should not have local keyring-consts.ts file', () => {
      // Verify that the duplicate interface file has been removed
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./keyring-consts');
      }).toThrow();
    });

    it('should not have local wrapped-key-consts.ts file', () => {
      // Verify that the duplicate interface file has been removed
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./wrapped-key-consts');
      }).toThrow();
    });
  });

  describe('Upstream Properties Available', () => {
    it('should have access to PBKDF2 from upstream', () => {
      // Verify that properties from upstream are accessible
      const mockConstants: Partial<IApiConstants> = {
        PBKDF2: {
          ALGORITHM: 'pbkdf2',
          SALT_BYTES: 32,
          ITERATIONS_PER_SECOND: 100000,
        },
      };

      expect(mockConstants.PBKDF2).toBeDefined();
      expect(mockConstants.PBKDF2?.ALGORITHM).toBe('pbkdf2');
    });

    it('should have access to CHECKSUM from upstream', () => {
      const mockConstants: Partial<IApiConstants> = {
        CHECKSUM: {
          SHA3_DEFAULT_HASH_BITS: 256,
          SHA3_BUFFER_LENGTH: 32,
          ALGORITHM: 'sha3-256',
          ENCODING: 'hex',
        },
      };

      expect(mockConstants.CHECKSUM).toBeDefined();
    });

    it('should have access to FEC from upstream', () => {
      const mockConstants: Partial<IApiConstants> = {
        FEC: {
          MAX_SHARD_SIZE: 1048576,
        },
      };

      expect(mockConstants.FEC).toBeDefined();
    });

    it('should have access to KEYRING from upstream', () => {
      const mockConstants: Partial<IApiConstants> = {
        KEYRING: {
          ALGORITHM: 'aes-256-gcm',
          KEY_BITS: 256,
          MODE: 'gcm',
        },
      };

      expect(mockConstants.KEYRING).toBeDefined();
    });

    it('should have access to ENCRYPTION from upstream', () => {
      const mockConstants: Partial<IApiConstants> = {
        ENCRYPTION: {
          ENCRYPTION_TYPE_SIZE: 1,
          RECIPIENT_ID_SIZE: 32,
        },
      };

      expect(mockConstants.ENCRYPTION).toBeDefined();
    });

    it('should have access to WRAPPED_KEY from upstream', () => {
      const mockConstants: Partial<IApiConstants> = {
        WRAPPED_KEY: {
          SALT_SIZE: 32,
          IV_SIZE: 16,
          MASTER_KEY_SIZE: 32,
          MIN_ITERATIONS: 100000,
        },
      };

      expect(mockConstants.WRAPPED_KEY).toBeDefined();
    });

    it('should have access to KEYRING_ALGORITHM_CONFIGURATION from upstream', () => {
      const mockConstants: Partial<IApiConstants> = {
        KEYRING_ALGORITHM_CONFIGURATION: 'aes-256-gcm',
      };

      expect(mockConstants.KEYRING_ALGORITHM_CONFIGURATION).toBeDefined();
    });
  });
});
