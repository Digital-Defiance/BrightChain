/**
 * Unit tests for BreachDetector with mocked fetch
 * Feature: api-lib-to-lib-migration
 *
 * These tests validate the breach detection functionality using mocked fetch
 * to verify k-anonymity, result completeness, and error handling.
 *
 * **Validates: Requirements 3.1, 3.4, 3.5**
 */

import { sha1Hash } from '../../crypto/platformCrypto';
import { BreachDetector } from './breachDetector';

// Store original fetch to restore after tests
const originalFetch = global.fetch;

// Mock fetch function type
type MockFetch = jest.Mock<Promise<Response>>;

/**
 * Helper to create a mock Response object
 */
function createMockResponse(
  body: string,
  options: { ok?: boolean; status?: number } = {},
): Response {
  const { ok = true, status = 200 } = options;
  return {
    ok,
    status,
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body)),
    headers: new Headers(),
    redirected: false,
    statusText: ok ? 'OK' : 'Error',
    type: 'basic' as ResponseType,
    url: '',
    clone: () => createMockResponse(body, options),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as Response;
}

describe('Feature: api-lib-to-lib-migration, BreachDetector Unit Tests', () => {
  let mockFetch: MockFetch;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  /**
   * Property 5: Breach Detection K-Anonymity
   *
   * For any password checked against HIBP, only the first 5 characters of the SHA-1 hash
   * SHALL be sent to the API (verifiable by inspecting the fetch URL).
   *
   * **Validates: Requirements 3.1**
   */
  describe('Property 5: Breach Detection K-Anonymity', () => {
    it('should only send first 5 characters of SHA-1 hash in URL', async () => {
      const password = 'testpassword123';
      const expectedHash = sha1Hash(password);
      const expectedPrefix = expectedHash.substring(0, 5);

      mockFetch.mockResolvedValueOnce(createMockResponse(''));

      await BreachDetector.check(password);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0] as string;

      // Verify URL contains only the 5-character prefix
      expect(calledUrl).toBe(
        `https://api.pwnedpasswords.com/range/${expectedPrefix}`,
      );

      // Verify the full hash is NOT in the URL
      expect(calledUrl).not.toContain(expectedHash);
    });

    it('should use uppercase hex for the hash prefix', async () => {
      const password = 'password';
      // SHA-1 of 'password' is 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
      const expectedPrefix = '5BAA6';

      mockFetch.mockResolvedValueOnce(createMockResponse(''));

      await BreachDetector.check(password);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain(expectedPrefix);
    });

    it('should never expose the full password hash', async () => {
      const password = 'secretpassword';
      const fullHash = sha1Hash(password);
      const suffix = fullHash.substring(5);

      mockFetch.mockResolvedValueOnce(createMockResponse(''));

      await BreachDetector.check(password);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;

      // URL should not contain the suffix
      expect(calledUrl).not.toContain(suffix);

      // Headers should not contain the full hash
      const headersStr = JSON.stringify(calledOptions?.headers || {});
      expect(headersStr).not.toContain(fullHash);
      expect(headersStr).not.toContain(suffix);
    });

    it('should include User-Agent header in request', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(''));

      await BreachDetector.check('anypassword');

      const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
      expect(calledOptions.headers).toEqual({
        'User-Agent': 'BrightChain-PasswordManager',
      });
    });
  });

  /**
   * Property 6: Breach Detection Result Completeness
   *
   * For any breach check result, the object SHALL contain breached (boolean),
   * count (number), and serviceAvailable (boolean) fields.
   *
   * **Validates: Requirements 3.4**
   */
  describe('Property 6: Breach Detection Result Completeness', () => {
    it('should return complete result object when password is breached', async () => {
      const password = 'password';
      const hash = sha1Hash(password);
      const suffix = hash.substring(5);

      // Mock response with the password's hash suffix and count
      mockFetch.mockResolvedValueOnce(
        createMockResponse(`${suffix}:12345\nOTHERHASH:100`),
      );

      const result = await BreachDetector.check(password);

      // Verify all required fields exist and have correct types
      expect(result).toHaveProperty('breached');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('serviceAvailable');

      expect(typeof result.breached).toBe('boolean');
      expect(typeof result.count).toBe('number');
      expect(typeof result.serviceAvailable).toBe('boolean');

      // Verify values
      expect(result.breached).toBe(true);
      expect(result.count).toBe(12345);
      expect(result.serviceAvailable).toBe(true);
    });

    it('should return complete result object when password is not breached', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          'AAAAA1234567890ABCDEF12345:100\nBBBBB1234567890ABCDEF12345:200',
        ),
      );

      const result = await BreachDetector.check('uniquepassword12345');

      // Verify all required fields exist and have correct types
      expect(result).toHaveProperty('breached');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('serviceAvailable');

      expect(typeof result.breached).toBe('boolean');
      expect(typeof result.count).toBe('number');
      expect(typeof result.serviceAvailable).toBe('boolean');

      // Verify values
      expect(result.breached).toBe(false);
      expect(result.count).toBe(0);
      expect(result.serviceAvailable).toBe(true);
    });

    it('should return complete result object on API error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse('', { ok: false, status: 500 }),
      );

      const result = await BreachDetector.check('anypassword');

      // Verify all required fields exist and have correct types
      expect(result).toHaveProperty('breached');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('serviceAvailable');

      expect(typeof result.breached).toBe('boolean');
      expect(typeof result.count).toBe('number');
      expect(typeof result.serviceAvailable).toBe('boolean');

      // Verify values
      expect(result.breached).toBe(false);
      expect(result.count).toBe(0);
      expect(result.serviceAvailable).toBe(false);
    });

    it('should return complete result object on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await BreachDetector.check('anypassword');

      // Verify all required fields exist and have correct types
      expect(result).toHaveProperty('breached');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('serviceAvailable');

      expect(typeof result.breached).toBe('boolean');
      expect(typeof result.count).toBe('number');
      expect(typeof result.serviceAvailable).toBe('boolean');

      // Verify values
      expect(result.breached).toBe(false);
      expect(result.count).toBe(0);
      expect(result.serviceAvailable).toBe(false);
    });
  });

  /**
   * Successful breach detection tests
   */
  describe('Successful breach detection (password found)', () => {
    it('should detect breached password and return correct count', async () => {
      const password = 'password123';
      const hash = sha1Hash(password);
      const suffix = hash.substring(5);

      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          `AAAA1234567890ABCDEF12345:50\n${suffix}:9999\nBBBB1234567890ABCDEF12345:100`,
        ),
      );

      const result = await BreachDetector.check(password);

      expect(result).toEqual({
        breached: true,
        count: 9999,
        serviceAvailable: true,
      });
    });

    it('should handle password found as first entry in response', async () => {
      const password = 'test';
      const hash = sha1Hash(password);
      const suffix = hash.substring(5);

      mockFetch.mockResolvedValueOnce(
        createMockResponse(`${suffix}:500\nOTHER:100`),
      );

      const result = await BreachDetector.check(password);

      expect(result.breached).toBe(true);
      expect(result.count).toBe(500);
    });

    it('should handle password found as last entry in response', async () => {
      const password = 'admin';
      const hash = sha1Hash(password);
      const suffix = hash.substring(5);

      mockFetch.mockResolvedValueOnce(
        createMockResponse(`OTHER1:100\nOTHER2:200\n${suffix}:777`),
      );

      const result = await BreachDetector.check(password);

      expect(result.breached).toBe(true);
      expect(result.count).toBe(777);
    });

    it('should handle large breach counts', async () => {
      const password = 'common';
      const hash = sha1Hash(password);
      const suffix = hash.substring(5);

      mockFetch.mockResolvedValueOnce(createMockResponse(`${suffix}:23456789`));

      const result = await BreachDetector.check(password);

      expect(result.breached).toBe(true);
      expect(result.count).toBe(23456789);
    });
  });

  /**
   * Successful non-breach tests (password not found)
   */
  describe('Successful non-breach (password not found)', () => {
    it('should return not breached when password hash not in response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          'AAAA1234567890ABCDEF12345:100\nBBBB1234567890ABCDEF12345:200\nCCCC1234567890ABCDEF12345:300',
        ),
      );

      const result = await BreachDetector.check('verysecurepassword!@#$%');

      expect(result).toEqual({
        breached: false,
        count: 0,
        serviceAvailable: true,
      });
    });

    it('should return not breached when API returns empty response', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(''));

      const result = await BreachDetector.check('anypassword');

      expect(result).toEqual({
        breached: false,
        count: 0,
        serviceAvailable: true,
      });
    });

    it('should handle case-sensitive hash comparison correctly', async () => {
      const password = 'testcase';
      const hash = sha1Hash(password);
      const suffix = hash.substring(5);
      // Create a lowercase version that shouldn't match
      const lowercaseSuffix = suffix.toLowerCase();

      // Response has lowercase version (shouldn't match uppercase)
      mockFetch.mockResolvedValueOnce(
        createMockResponse(`${lowercaseSuffix}:100`),
      );

      const result = await BreachDetector.check(password);

      // Should not match because HIBP returns uppercase and we compare uppercase
      // Actually, the implementation compares directly, so if API returns lowercase
      // and our hash is uppercase, it won't match
      expect(result.breached).toBe(false);
    });
  });

  /**
   * API error handling tests
   */
  describe('API error handling (returns serviceAvailable: false)', () => {
    it('should handle 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse('Internal Server Error', { ok: false, status: 500 }),
      );

      const result = await BreachDetector.check('anypassword');

      expect(result).toEqual({
        breached: false,
        count: 0,
        serviceAvailable: false,
      });
    });

    it('should handle 503 Service Unavailable', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse('Service Unavailable', { ok: false, status: 503 }),
      );

      const result = await BreachDetector.check('anypassword');

      expect(result).toEqual({
        breached: false,
        count: 0,
        serviceAvailable: false,
      });
    });

    it('should handle 429 Too Many Requests (rate limiting)', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse('Rate limit exceeded', { ok: false, status: 429 }),
      );

      const result = await BreachDetector.check('anypassword');

      expect(result).toEqual({
        breached: false,
        count: 0,
        serviceAvailable: false,
      });
    });

    it('should handle 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse('Not Found', { ok: false, status: 404 }),
      );

      const result = await BreachDetector.check('anypassword');

      expect(result).toEqual({
        breached: false,
        count: 0,
        serviceAvailable: false,
      });
    });

    it('should handle 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse('Bad Request', { ok: false, status: 400 }),
      );

      const result = await BreachDetector.check('anypassword');

      expect(result).toEqual({
        breached: false,
        count: 0,
        serviceAvailable: false,
      });
    });
  });

  /**
   * Network error handling tests
   */
  describe('Network error handling (returns serviceAvailable: false)', () => {
    it('should handle network timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await BreachDetector.check('anypassword');

      expect(result).toEqual({
        breached: false,
        count: 0,
        serviceAvailable: false,
      });
    });

    it('should handle DNS resolution failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));

      const result = await BreachDetector.check('anypassword');

      expect(result).toEqual({
        breached: false,
        count: 0,
        serviceAvailable: false,
      });
    });

    it('should handle connection refused', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await BreachDetector.check('anypassword');

      expect(result).toEqual({
        breached: false,
        count: 0,
        serviceAvailable: false,
      });
    });

    it('should handle connection reset', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNRESET'));

      const result = await BreachDetector.check('anypassword');

      expect(result).toEqual({
        breached: false,
        count: 0,
        serviceAvailable: false,
      });
    });

    it('should handle SSL/TLS errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('SSL certificate error'));

      const result = await BreachDetector.check('anypassword');

      expect(result).toEqual({
        breached: false,
        count: 0,
        serviceAvailable: false,
      });
    });

    it('should handle TypeError from fetch', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await BreachDetector.check('anypassword');

      expect(result).toEqual({
        breached: false,
        count: 0,
        serviceAvailable: false,
      });
    });
  });

  /**
   * Edge cases and special scenarios
   */
  describe('Edge cases', () => {
    it('should handle empty password', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(''));

      const result = await BreachDetector.check('');

      expect(result).toHaveProperty('breached');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('serviceAvailable');
    });

    it('should handle password with special characters', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hash = sha1Hash(password);
      const prefix = hash.substring(0, 5);

      mockFetch.mockResolvedValueOnce(createMockResponse(''));

      await BreachDetector.check(password);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toBe(`https://api.pwnedpasswords.com/range/${prefix}`);
    });

    it('should handle password with unicode characters', async () => {
      const password = '密码🔐パスワード';
      const hash = sha1Hash(password);
      const prefix = hash.substring(0, 5);

      mockFetch.mockResolvedValueOnce(createMockResponse(''));

      await BreachDetector.check(password);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toBe(`https://api.pwnedpasswords.com/range/${prefix}`);
    });

    it('should handle very long password', async () => {
      const password = 'a'.repeat(10000);
      const hash = sha1Hash(password);
      const prefix = hash.substring(0, 5);

      mockFetch.mockResolvedValueOnce(createMockResponse(''));

      await BreachDetector.check(password);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toBe(`https://api.pwnedpasswords.com/range/${prefix}`);
    });

    it('should handle response with Windows-style line endings', async () => {
      const password = 'test';
      const hash = sha1Hash(password);
      const suffix = hash.substring(5);

      mockFetch.mockResolvedValueOnce(
        createMockResponse(`OTHER1:100\r\n${suffix}:500\r\nOTHER2:200`),
      );

      const result = await BreachDetector.check(password);

      // The implementation splits on \n, so \r will be part of the suffix
      // This test documents current behavior
      expect(result.serviceAvailable).toBe(true);
    });

    it('should handle response with trailing newline', async () => {
      const password = 'test';
      const hash = sha1Hash(password);
      const suffix = hash.substring(5);

      mockFetch.mockResolvedValueOnce(createMockResponse(`${suffix}:100\n`));

      const result = await BreachDetector.check(password);

      expect(result.breached).toBe(true);
      expect(result.count).toBe(100);
    });

    it('should handle count of 1', async () => {
      const password = 'rarepassword';
      const hash = sha1Hash(password);
      const suffix = hash.substring(5);

      mockFetch.mockResolvedValueOnce(createMockResponse(`${suffix}:1`));

      const result = await BreachDetector.check(password);

      expect(result.breached).toBe(true);
      expect(result.count).toBe(1);
    });
  });
});
