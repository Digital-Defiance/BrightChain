import { IConstants as IBaseConstants } from '@digitaldefiance/node-express-suite';
import { IApiConstants } from './api-constants';

describe('IApiConstants Interface Structure', () => {
  describe('Interface Extension', () => {
    it('should extend IConstants from @digitaldefiance/node-express-suite', () => {
      // This test verifies that IApiConstants extends IBaseConstants
      // by checking that a mock object satisfying IApiConstants also satisfies IBaseConstants
      const mockApiConstants: IApiConstants = {} as IApiConstants;
      const mockBaseConstants: IBaseConstants = mockApiConstants;
      
      // If this compiles, it means IApiConstants extends IBaseConstants
      expect(mockBaseConstants).toBeDefined();
    });
  });

  describe('Duplicate Interfaces Removed', () => {
    it('should not have local checksum-consts.ts file', () => {
      // Verify that the duplicate interface file has been removed
      expect(() => {
        // This will throw if the file doesn't exist
        require('./checksum-consts');
      }).toThrow();
    });

    it('should not have local encryption-consts.ts file', () => {
      // Verify that the duplicate interface file has been removed
      expect(() => {
        require('./encryption-consts');
      }).toThrow();
    });

    it('should not have local fec-consts.ts file', () => {
      // Verify that the duplicate interface file has been removed
      expect(() => {
        require('./fec-consts');
      }).toThrow();
    });

    it('should not have local keyring-consts.ts file', () => {
      // Verify that the duplicate interface file has been removed
      expect(() => {
        require('./keyring-consts');
      }).toThrow();
    });

    it('should not have local wrapped-key-consts.ts file', () => {
      // Verify that the duplicate interface file has been removed
      expect(() => {
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

    it('should have access to OBJECT_ID_LENGTH from upstream', () => {
      const mockConstants: Partial<IApiConstants> = {
        OBJECT_ID_LENGTH: 12,
      };
      
      expect(mockConstants.OBJECT_ID_LENGTH).toBeDefined();
    });

    it('should have access to KEYRING_ALGORITHM_CONFIGURATION from upstream', () => {
      const mockConstants: Partial<IApiConstants> = {
        KEYRING_ALGORITHM_CONFIGURATION: 'aes-256-gcm',
      };
      
      expect(mockConstants.KEYRING_ALGORITHM_CONFIGURATION).toBeDefined();
    });
  });
});
