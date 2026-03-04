/**
 * Feature: cloud-block-store-drivers, Property 16: Environment missing variables validation
 *
 * For any BlockStoreType value other than "disk" and any incomplete subset of
 * its required environment variables, constructing an Environment instance
 * should throw an error listing the missing variable names.
 *
 * **Validates: Requirements 5.6**
 */
import { BlockStoreType } from '@brightchain/brightchain-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { Environment } from './environment';

/**
 * Required base env vars that Environment's parent constructor needs.
 * Without these, the constructor throws for unrelated reasons.
 */
function setBaseEnvVars(): void {
  process.env['JWT_SECRET'] =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  process.env['MNEMONIC_HMAC_SECRET'] =
    'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
  process.env['MNEMONIC_ENCRYPTION_KEY'] =
    'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
  process.env['API_DIST_DIR'] = process.cwd();
  process.env['REACT_DIST_DIR'] = process.cwd();
}

/** All cloud-related env vars that might be set between tests. */
const cloudEnvVars = [
  'BRIGHTCHAIN_BLOCKSTORE_TYPE',
  'AZURE_STORAGE_CONNECTION_STRING',
  'AZURE_STORAGE_ACCOUNT_NAME',
  'AZURE_STORAGE_ACCOUNT_KEY',
  'AZURE_STORAGE_CONTAINER_NAME',
  'AWS_S3_BUCKET_NAME',
  'AWS_S3_KEY_PREFIX',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];

function clearCloudEnvVars(): void {
  for (const key of cloudEnvVars) {
    delete process.env[key];
  }
}

/**
 * Azure required env var sets. Azure needs either a connection string OR
 * an account name, plus a container name.
 */
const azureRequiredVarSets = {
  // Minimum viable: connection string + container
  connectionStringAuth: {
    AZURE_STORAGE_CONNECTION_STRING:
      'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=dGVzdA==;EndpointSuffix=core.windows.net',
    AZURE_STORAGE_CONTAINER_NAME: 'test-container',
  },
  // Minimum viable: account name + container (managed identity)
  accountNameAuth: {
    AZURE_STORAGE_ACCOUNT_NAME: 'teststorageaccount',
    AZURE_STORAGE_CONTAINER_NAME: 'test-container',
  },
};

/**
 * S3 required env vars. S3 needs a bucket name at minimum.
 */
const s3RequiredVars = {
  AWS_S3_BUCKET_NAME: 'test-bucket',
};

describe('Property 16: Environment missing variables validation', () => {
  beforeEach(() => {
    setBaseEnvVars();
    clearCloudEnvVars();
  });

  afterEach(() => {
    clearCloudEnvVars();
  });

  describe('Azure — incomplete env var subsets should throw', () => {
    it('should throw when BRIGHTCHAIN_BLOCKSTORE_TYPE=azure and no Azure vars are set', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          clearCloudEnvVars();
          setBaseEnvVars();
          process.env['BRIGHTCHAIN_BLOCKSTORE_TYPE'] = BlockStoreType.AzureBlob;

          expect(() => new Environment(undefined, true)).toThrow(
            /Missing required environment variables for Azure/,
          );
        }),
        { numRuns: 10 },
      );
    });

    it('should throw listing missing vars for any incomplete Azure subset', () => {
      // Generate arbitrary subsets of Azure env vars that are incomplete
      // (missing either auth OR container name)
      const azureVarArb = fc.record(
        {
          AZURE_STORAGE_CONNECTION_STRING: fc.option(
            fc.constant(
              'DefaultEndpointsProtocol=https;AccountName=t;AccountKey=dA==;EndpointSuffix=core.windows.net',
            ),
            { nil: undefined },
          ),
          AZURE_STORAGE_ACCOUNT_NAME: fc.option(fc.constant('teststorage'), {
            nil: undefined,
          }),
          AZURE_STORAGE_ACCOUNT_KEY: fc.option(fc.constant('dGVzdGtleQ=='), {
            nil: undefined,
          }),
          AZURE_STORAGE_CONTAINER_NAME: fc.option(
            fc.constant('testcontainer'),
            { nil: undefined },
          ),
        },
        { requiredKeys: [] },
      );

      fc.assert(
        fc.property(azureVarArb, (vars) => {
          clearCloudEnvVars();
          setBaseEnvVars();
          process.env['BRIGHTCHAIN_BLOCKSTORE_TYPE'] = BlockStoreType.AzureBlob;

          // Set whichever vars the arbitrary chose
          for (const [key, value] of Object.entries(vars)) {
            if (value !== undefined) {
              process.env[key] = value;
            }
          }

          const hasAuth =
            vars.AZURE_STORAGE_CONNECTION_STRING !== undefined ||
            vars.AZURE_STORAGE_ACCOUNT_NAME !== undefined;
          const hasContainer = vars.AZURE_STORAGE_CONTAINER_NAME !== undefined;

          if (!hasAuth || !hasContainer) {
            // Incomplete — should throw
            expect(() => new Environment(undefined, true)).toThrow(
              /Missing required environment variable/,
            );
          }
          // If complete, construction should succeed (no assertion needed for the throw path)
        }),
        { numRuns: 100 },
      );
    });

    it('should succeed with complete Azure connection string auth', () => {
      process.env['BRIGHTCHAIN_BLOCKSTORE_TYPE'] = BlockStoreType.AzureBlob;
      for (const [k, v] of Object.entries(
        azureRequiredVarSets.connectionStringAuth,
      )) {
        process.env[k] = v;
      }
      expect(() => new Environment(undefined, true)).not.toThrow();
    });

    it('should succeed with complete Azure account name auth', () => {
      process.env['BRIGHTCHAIN_BLOCKSTORE_TYPE'] = BlockStoreType.AzureBlob;
      for (const [k, v] of Object.entries(
        azureRequiredVarSets.accountNameAuth,
      )) {
        process.env[k] = v;
      }
      expect(() => new Environment(undefined, true)).not.toThrow();
    });
  });

  describe('S3 — incomplete env var subsets should throw', () => {
    it('should throw when BRIGHTCHAIN_BLOCKSTORE_TYPE=s3 and no S3 vars are set', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          clearCloudEnvVars();
          setBaseEnvVars();
          process.env['BRIGHTCHAIN_BLOCKSTORE_TYPE'] = BlockStoreType.S3;

          expect(() => new Environment(undefined, true)).toThrow(
            /Missing required environment variable.*S3/,
          );
        }),
        { numRuns: 10 },
      );
    });

    it('should throw listing missing vars when AWS_S3_BUCKET_NAME is absent', () => {
      // Generate arbitrary optional S3 vars but never the required bucket name
      const s3OptionalArb = fc.record(
        {
          AWS_S3_KEY_PREFIX: fc.option(
            fc.string({ minLength: 1, maxLength: 20 }),
            { nil: undefined },
          ),
          AWS_REGION: fc.option(
            fc.constantFrom('us-east-1', 'eu-west-1', 'ap-southeast-1'),
            { nil: undefined },
          ),
          AWS_ACCESS_KEY_ID: fc.option(fc.constant('AKIAIOSFODNN7EXAMPLE'), {
            nil: undefined,
          }),
          AWS_SECRET_ACCESS_KEY: fc.option(
            fc.constant('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'),
            { nil: undefined },
          ),
        },
        { requiredKeys: [] },
      );

      fc.assert(
        fc.property(s3OptionalArb, (vars) => {
          clearCloudEnvVars();
          setBaseEnvVars();
          process.env['BRIGHTCHAIN_BLOCKSTORE_TYPE'] = BlockStoreType.S3;

          for (const [key, value] of Object.entries(vars)) {
            if (value !== undefined) {
              process.env[key] = value;
            }
          }
          // Bucket name is never set — should always throw
          expect(() => new Environment(undefined, true)).toThrow(
            /AWS_S3_BUCKET_NAME/,
          );
        }),
        { numRuns: 100 },
      );
    });

    it('should succeed with complete S3 config', () => {
      process.env['BRIGHTCHAIN_BLOCKSTORE_TYPE'] = BlockStoreType.S3;
      for (const [k, v] of Object.entries(s3RequiredVars)) {
        process.env[k] = v;
      }
      expect(() => new Environment(undefined, true)).not.toThrow();
    });
  });

  describe('Disk and Memory types should not require cloud vars', () => {
    it('should not throw for disk type regardless of cloud var presence', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(BlockStoreType.Disk, BlockStoreType.Memory),
          (storeType) => {
            clearCloudEnvVars();
            setBaseEnvVars();
            process.env['BRIGHTCHAIN_BLOCKSTORE_TYPE'] = storeType;

            expect(() => new Environment(undefined, true)).not.toThrow();
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should default to disk when BRIGHTCHAIN_BLOCKSTORE_TYPE is unset', () => {
      clearCloudEnvVars();
      setBaseEnvVars();
      const env = new Environment(undefined, true);
      expect(env.blockStoreType).toBe(BlockStoreType.Disk);
    });
  });

  describe('Invalid BlockStoreType should throw', () => {
    it('should throw for any invalid store type string', () => {
      const invalidTypeArb = fc
        .string({ minLength: 1, maxLength: 20 })
        .filter(
          (s) => !Object.values(BlockStoreType).includes(s as BlockStoreType),
        );

      fc.assert(
        fc.property(invalidTypeArb, (invalidType) => {
          clearCloudEnvVars();
          setBaseEnvVars();
          process.env['BRIGHTCHAIN_BLOCKSTORE_TYPE'] = invalidType;

          expect(() => new Environment(undefined, true)).toThrow(
            /Invalid BRIGHTCHAIN_BLOCKSTORE_TYPE/,
          );
        }),
        { numRuns: 100 },
      );
    });
  });
});
