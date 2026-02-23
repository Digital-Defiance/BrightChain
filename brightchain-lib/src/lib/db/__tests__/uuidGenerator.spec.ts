import { createDefaultUuidGenerator, UuidGenerator } from '../uuidGenerator';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidGenerator', () => {
  describe('createDefaultUuidGenerator', () => {
    it('should return a function', () => {
      const gen: UuidGenerator = createDefaultUuidGenerator();
      expect(typeof gen).toBe('function');
    });

    it('should produce a valid UUID v4 string', () => {
      const gen = createDefaultUuidGenerator();
      const uuid = gen();
      expect(uuid).toMatch(UUID_V4_REGEX);
    });

    it('should produce unique UUIDs on successive calls', () => {
      const gen = createDefaultUuidGenerator();
      const uuids = new Set(Array.from({ length: 50 }, () => gen()));
      expect(uuids.size).toBe(50);
    });
  });

  describe('fallback path', () => {
    let originalRandomUUID: typeof globalThis.crypto.randomUUID;

    beforeEach(() => {
      originalRandomUUID = globalThis.crypto.randomUUID;
    });

    afterEach(() => {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        value: originalRandomUUID,
        writable: true,
        configurable: true,
      });
    });

    it('should fall back to getRandomValues when randomUUID is unavailable', () => {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const gen = createDefaultUuidGenerator();
      const uuid = gen();
      expect(uuid).toMatch(UUID_V4_REGEX);
    });
  });

  describe('error path', () => {
    let originalCrypto: Crypto;

    beforeEach(() => {
      originalCrypto = globalThis.crypto;
    });

    afterEach(() => {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true,
      });
    });

    it('should throw a descriptive error when neither crypto API is available', () => {
      Object.defineProperty(globalThis, 'crypto', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(() => createDefaultUuidGenerator()).toThrow(
        /Unable to create a UUID generator/,
      );
    });
  });
});
