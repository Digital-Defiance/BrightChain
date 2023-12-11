import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { Environment as BaseEnvironment } from '@digitaldefiance/node-express-suite';
import { Environment } from './environment';
import { IEnvironment } from './interfaces/environment';

describe('Environment Class', () => {
  // Capture any env vars Nx auto-loads from the workspace `.env` so we
  // can restore them after this suite runs. The "default value" tests
  // below assume these are unset.
  const leakedKeys = [
    'EMAIL_SENDER',
    'SERVER_URL',
    'FONTAWESOME_KIT_ID',
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
  ] as const;
  const originalLeaked: Record<string, string | undefined> = {};

  // Set up required environment variables before all tests
  beforeAll(() => {
    // All secrets must be 64-character hexadecimal strings
    process.env['JWT_SECRET'] =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env['MNEMONIC_HMAC_SECRET'] =
      'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    process.env['MNEMONIC_ENCRYPTION_KEY'] =
      'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    // Use actual directories that exist
    process.env['API_DIST_DIR'] = process.cwd();
    process.env['REACT_DIST_DIR'] = process.cwd();

    for (const key of leakedKeys) {
      originalLeaked[key] = process.env[key];
      delete process.env[key];
    }
  });

  // Clean up after all tests
  afterAll(() => {
    delete process.env['JWT_SECRET'];
    delete process.env['MNEMONIC_HMAC_SECRET'];
    delete process.env['MNEMONIC_ENCRYPTION_KEY'];
    delete process.env['API_DIST_DIR'];
    delete process.env['REACT_DIST_DIR'];

    for (const key of leakedKeys) {
      const v = originalLeaked[key];
      if (v === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = v;
      }
    }
  });

  describe('Class Structure', () => {
    it('should extend BaseEnvironment', () => {
      const env = new Environment(undefined, true);
      expect(env).toBeInstanceOf(BaseEnvironment);
    });

    it('should implement IEnvironment interface', () => {
      const env = new Environment(undefined, true);
      // Type check - if this compiles, Environment implements IEnvironment
      const envInterface: IEnvironment<PlatformID> = env;
      expect(envInterface).toBeDefined();
    });
  });

  describe('Constructor', () => {
    it('should pass Constants to super constructor', () => {
      const env = new Environment(undefined, true);
      // Verify that constants from the base environment are accessible
      expect(env.jwtSecret).toBeDefined();
      expect(env.emailSender).toBeDefined();
    });

    it('should initialize with default values when env vars are not set', () => {
      const env = new Environment(undefined, true);
      expect(env.fontAwesomeKitId).toBe('');
      expect(env.aws).toBeDefined();
      expect(env.aws.region).toBe('us-east-1');
    });
  });

  describe('BrightChain-Specific Environment Variables', () => {
    it('should load fontAwesomeKitId from environment', () => {
      process.env['FONTAWESOME_KIT_ID'] = 'test-kit-id';
      const env = new Environment(undefined, true);
      expect(env.fontAwesomeKitId).toBe('test-kit-id');
      delete process.env['FONTAWESOME_KIT_ID'];
    });

    it('should load AWS configuration from environment', () => {
      process.env['AWS_ACCESS_KEY_ID'] = 'test-access-key';
      process.env['AWS_SECRET_ACCESS_KEY'] = 'test-secret-key';
      process.env['AWS_REGION'] = 'us-west-2';

      const env = new Environment(undefined, true);

      expect(env.aws).toBeDefined();
      expect(env.aws.accessKeyId.value).toBe('test-access-key');
      expect(env.aws.secretAccessKey.value).toBe('test-secret-key');
      expect(env.aws.region).toBe('us-west-2');

      delete process.env['AWS_ACCESS_KEY_ID'];
      delete process.env['AWS_SECRET_ACCESS_KEY'];
      delete process.env['AWS_REGION'];
    });

    it('should use default AWS region when not specified', () => {
      const env = new Environment(undefined, true);
      expect(env.aws.region).toBe('us-east-1');
    });
  });

  describe('Environment Variable Overrides', () => {
    it('should use provided JWT secret', () => {
      const env = new Environment(undefined, true);
      expect(env.jwtSecret).toBe(
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      );
    });

    it('should set default email sender when not provided', () => {
      const env = new Environment(undefined, true);
      expect(env.emailSender).toBe('noreply@brightchain.org');
    });

    it('should set production server URL when in production mode', () => {
      const originalNodeEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'production';
      const env = new Environment(undefined, true);
      expect(env.serverUrl).toBe('https://brightchain.org');
      if (originalNodeEnv) {
        process.env['NODE_ENV'] = originalNodeEnv;
      } else {
        delete process.env['NODE_ENV'];
      }
    });

    it('should use provided API dist directory', () => {
      const env = new Environment(undefined, true);
      expect(env.apiDistDir).toBe(process.cwd());
    });

    it('should use provided React dist directory', () => {
      const env = new Environment(undefined, true);
      expect(env.reactDistDir).toBe(process.cwd());
    });
  });

  describe('Inherited BaseEnvironment Functionality', () => {
    it('should have access to base environment properties', () => {
      const env = new Environment(undefined, true);
      expect(env.host).toBeDefined();
      expect(env.port).toBeDefined();
      expect(env.basePath).toBeDefined();
    });

    it('should have access to base environment methods', () => {
      const env = new Environment(undefined, true);
      expect(typeof env.has).toBe('function');
      expect(typeof env.get).toBe('function');
      expect(typeof env.setEnvironment).toBe('function');
      expect(typeof env.getObject).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing optional environment variables gracefully', () => {
      delete process.env['FONTAWESOME_KIT_ID'];
      delete process.env['AWS_ACCESS_KEY_ID'];
      delete process.env['AWS_SECRET_ACCESS_KEY'];

      expect(() => {
        const env = new Environment(undefined, true);
        expect(env.fontAwesomeKitId).toBe('');
        expect(env.aws.accessKeyId.value).toBeNull();
        expect(env.aws.secretAccessKey.value).toBeNull();
      }).not.toThrow();
    });
  });

  describe('BrightHub Profile Environment Variables', () => {
    // Keys to save/restore around each test
    const profileKeys = [
      'BRIGHTHUB_PROFILE_LENGTH',
      'BRIGHTHUB_PROFILE_PINNED_POST',
    ] as const;
    const savedProfile: Record<string, string | undefined> = {};

    beforeEach(() => {
      for (const key of profileKeys) {
        savedProfile[key] = process.env[key];
        delete process.env[key];
      }
    });

    afterEach(() => {
      for (const key of profileKeys) {
        const v = savedProfile[key];
        if (v === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = v;
        }
      }
    });

    describe('BRIGHTHUB_PROFILE_LENGTH', () => {
      it('should parse a valid positive integer string correctly', () => {
        process.env['BRIGHTHUB_PROFILE_LENGTH'] = '500';
        const env = new Environment(undefined, true);
        expect(env.profileLength).toBe(500);
      });

      it('should default to 2000 when the variable is unset', () => {
        // BRIGHTHUB_PROFILE_LENGTH is deleted in beforeEach
        const env = new Environment(undefined, true);
        expect(env.profileLength).toBe(2000);
      });

      it('should fall back to 2000 for a non-numeric value "abc"', () => {
        process.env['BRIGHTHUB_PROFILE_LENGTH'] = 'abc';
        const env = new Environment(undefined, true);
        expect(env.profileLength).toBe(2000);
      });

      it('should fall back to 2000 for a negative value "-5"', () => {
        process.env['BRIGHTHUB_PROFILE_LENGTH'] = '-5';
        const env = new Environment(undefined, true);
        expect(env.profileLength).toBe(2000);
      });

      it('should fall back to 2000 for zero "0"', () => {
        process.env['BRIGHTHUB_PROFILE_LENGTH'] = '0';
        const env = new Environment(undefined, true);
        expect(env.profileLength).toBe(2000);
      });
    });

    describe('BRIGHTHUB_PROFILE_PINNED_POST', () => {
      it('should return true when set to "true"', () => {
        process.env['BRIGHTHUB_PROFILE_PINNED_POST'] = 'true';
        const env = new Environment(undefined, true);
        expect(env.profilePinnedPostEnabled).toBe(true);
      });

      it('should return true when the variable is unset (feature enabled by default)', () => {
        // BRIGHTHUB_PROFILE_PINNED_POST is deleted in beforeEach
        const env = new Environment(undefined, true);
        expect(env.profilePinnedPostEnabled).toBe(true);
      });

      it('should return false when set to "false"', () => {
        process.env['BRIGHTHUB_PROFILE_PINNED_POST'] = 'false';
        const env = new Environment(undefined, true);
        expect(env.profilePinnedPostEnabled).toBe(false);
      });
    });
  });

  // Property 10: Environment variable profile length parsing
  // Tag: Feature: brighthub-profile-enhancements, Property 10: Environment variable profile length parsing
  // Validates: Requirements 7.1, 7.6
  describe('Property 10: Environment variable profile length parsing', () => {
    // Keys to save/restore around each test
    const savedProfileLength: { value: string | undefined } = {
      value: undefined,
    };

    beforeEach(() => {
      savedProfileLength.value = process.env['BRIGHTHUB_PROFILE_LENGTH'];
      delete process.env['BRIGHTHUB_PROFILE_LENGTH'];
    });

    afterEach(() => {
      if (savedProfileLength.value === undefined) {
        delete process.env['BRIGHTHUB_PROFILE_LENGTH'];
      } else {
        process.env['BRIGHTHUB_PROFILE_LENGTH'] = savedProfileLength.value;
      }
    });

    it('should parse valid positive integers and fall back to 2000 for invalid values', () => {
      const fc = require('fast-check');

      // Generator for valid positive integer strings (1 to 9999)
      const validPositiveIntString = fc
        .integer({ min: 1, max: 9999 })
        .map((n: number) => String(n));

      // Generator for invalid strings: negative integers, zero, non-numeric strings
      const negativeIntString = fc
        .integer({ min: -9999, max: -1 })
        .map((n: number) => String(n));
      const zeroString = fc.constant('0');
      const nonNumericString = fc
        .string({ minLength: 1, maxLength: 20 })
        .filter(
          (s: string) =>
            !/^\d+$/.test(s) && s.trim() !== '' && isNaN(Number(s)),
        );

      const invalidString = fc.oneof(
        negativeIntString,
        zeroString,
        nonNumericString,
      );

      // Property: valid positive integer strings are parsed correctly
      fc.assert(
        fc.property(validPositiveIntString, (rawValue: string) => {
          process.env['BRIGHTHUB_PROFILE_LENGTH'] = rawValue;
          const env = new Environment(undefined, true);
          const expected = parseInt(rawValue, 10);
          return env.profileLength === expected;
        }),
        { numRuns: 100 },
      );

      // Property: invalid strings fall back to 2000
      fc.assert(
        fc.property(invalidString, (rawValue: string) => {
          process.env['BRIGHTHUB_PROFILE_LENGTH'] = rawValue;
          const env = new Environment(undefined, true);
          return env.profileLength === 2000;
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('adminId and idAdapter', () => {
    it('should have adminId property initialised from parent', () => {
      const env = new Environment(undefined, true);
      // BaseEnvironment generates a fresh GUID when ADMIN_ID is not in env
      expect(env.adminId).toBeDefined();
    });

    it('should allow setting adminId', () => {
      const env = new Environment(undefined, true);
      // Setting to undefined should work (the setter accepts TID | undefined)
      env.adminId = undefined;
      expect(env.adminId).toBeUndefined();
      // Re-assign a value to confirm round-trip
      const original = new Environment(undefined, true).adminId;
      env.adminId = original;
      expect(env.adminId).toBe(original);
    });

    it('should have idAdapter function', () => {
      const env = new Environment(undefined, true);
      expect(typeof env.idAdapter).toBe('function');
    });
  });
});
