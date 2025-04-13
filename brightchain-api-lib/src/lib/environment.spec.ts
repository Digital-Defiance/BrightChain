import { Environment as BaseEnvironment } from '@digitaldefiance/node-express-suite';
import { Environment } from './environment';
import { IEnvironment } from './interfaces/environment';

describe('Environment Class', () => {
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
  });

  // Clean up after all tests
  afterAll(() => {
    delete process.env['JWT_SECRET'];
    delete process.env['MNEMONIC_HMAC_SECRET'];
    delete process.env['MNEMONIC_ENCRYPTION_KEY'];
    delete process.env['API_DIST_DIR'];
    delete process.env['REACT_DIST_DIR'];
  });

  describe('Class Structure', () => {
    it('should extend BaseEnvironment', () => {
      const env = new Environment(undefined, true);
      expect(env).toBeInstanceOf(BaseEnvironment);
    });

    it('should implement IEnvironment interface', () => {
      const env = new Environment(undefined, true);
      // Type check - if this compiles, Environment implements IEnvironment
      const envInterface: IEnvironment = env;
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

  describe('adminId and idAdapter', () => {
    it('should have adminId property', () => {
      const env = new Environment(undefined, true);
      expect(env.adminId).toBeUndefined();
    });

    it('should allow setting adminId', () => {
      const env = new Environment(undefined, true);
      const testId = 'test-admin-id';
      env.adminId = testId;
      expect(env.adminId).toBe(testId);
    });

    it('should have idAdapter function', () => {
      const env = new Environment(undefined, true);
      expect(typeof env.idAdapter).toBe('function');
    });
  });
});
