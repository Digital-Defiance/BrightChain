/**
 * Property-Based Tests: Frontend POST body mnemonic inclusion
 *
 * Feature: user-provided-mnemonic-brightchain, Property 7: Frontend POST body mnemonic inclusion
 *
 * Tests that when a non-empty mnemonic is passed to register, the POST body
 * contains mnemonic equal to that string; when omitted, the body has no
 * mnemonic field.
 *
 * **Validates: Requirements 7.2, 7.3**
 */

// Mock brightchain-lib to prevent ECIESService initialization
jest.mock('@brightchain/brightchain-lib', () => ({
  BrightChainStrings: {},
  translate: (s: string) => s,
}));

jest.mock('@digitaldefiance/i18n-lib', () => ({
  LanguageCodes: { EN_US: 'en-US' },
  createI18nStringKeys: () => ({}),
}));

jest.mock('@digitaldefiance/ecies-lib', () => ({}));

jest.mock('@digitaldefiance/express-suite-react-components', () => ({}));

// Mock the api module to capture POST body
jest.mock('../api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock('../authenticatedApi', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));

// Import after mocking
import fc from 'fast-check';
import api from '../api';
import authService from '../auth';

const mockPost = api.post as jest.Mock;

describe('Property 7: Frontend POST body mnemonic inclusion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes mnemonic in POST body when provided', async () => {
    const nonEmptyStringArb = fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(nonEmptyStringArb, async (mnemonic) => {
        mockPost.mockClear();
        mockPost.mockResolvedValue({
          status: 201,
          data: { message: 'ok' },
        });

        await authService.register(
          'user',
          'u@test.com',
          'pass',
          'UTC',
          mnemonic,
        );

        expect(mockPost).toHaveBeenCalledTimes(1);
        const [, body] = mockPost.mock.calls[0];
        expect(body.mnemonic).toBe(mnemonic);
      }),
      { numRuns: 100 },
    );
  });

  it('omits mnemonic from POST body when not provided', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        mockPost.mockClear();
        mockPost.mockResolvedValue({
          status: 201,
          data: { message: 'ok' },
        });

        await authService.register('user', 'u@test.com', 'pass', 'UTC');

        expect(mockPost).toHaveBeenCalledTimes(1);
        const [, body] = mockPost.mock.calls[0];
        expect(body).not.toHaveProperty('mnemonic');
      }),
      { numRuns: 100 },
    );
  });
});
