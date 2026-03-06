/**
 * AuthService Recovery – Property-Based Tests.
 *
 * Feature: brightchain-user-management, Property 9: Mnemonic recovery round-trip
 *
 * Uses fast-check to validate mnemonic-recovery-related properties for the
 * AuthService and BrightChainAuthenticationProvider.
 */

import {
  BlockSize,
  EmailString,
  EnergyAccountStore,
  initializeBrightChain,
  MemberStore,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { MemberType, SecureString } from '@digitaldefiance/ecies-lib';
import { ServiceContainer } from '@digitaldefiance/node-express-suite';
import * as bcrypt from 'bcrypt';
import * as fc from 'fast-check';
import * as jwt from 'jsonwebtoken';
import { AppConstants } from '../../lib/appConstants';
import { IBrightChainApplication } from '../../lib/interfaces/application';
import { ITokenPayload } from '../../lib/interfaces/token-payload';
import { AuthService } from '../../lib/services/auth';
import { BrightChainAuthenticationProvider } from '../../lib/services/brightchain-authentication-provider';
import { EmailService } from '../../lib/services/email';

const JWT_SECRET = 'test-jwt-secret-for-recovery-pbt';

/** Arbitrary: alphanumeric username (3–20 chars) */
const usernameArb: fc.Arbitrary<string> =
  fc.stringMatching(/^[a-z0-9_-]{3,20}$/);

/** Arbitrary: simple valid email built from random local + domain parts */
const emailArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{3,12}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
  )
  .map(([local, domain]) => `${local}@${domain}.com`);

/** Arbitrary: password meeting minimum 8-char requirement (printable non-space ASCII) */
const passwordArb: fc.Arbitrary<string> = fc
  .array(fc.integer({ min: 0x21, max: 0x7e }), {
    minLength: 8,
    maxLength: 32,
  })
  .map((codes) => String.fromCharCode(...codes));

/**
 * Create a fresh AuthService (with BrightChainAuthenticationProvider) and
 * isolated in-memory stores. Returns the AuthService, MemberStore, and
 * auth provider so we can register members and capture mnemonics.
 */
function createIsolatedAuthServiceAndStore(): {
  authService: AuthService;
  memberStore: MemberStore;
  authProvider: BrightChainAuthenticationProvider;
} {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

  const blockStore = new MemoryBlockStore(BlockSize.Small);
  const memberStore = new MemberStore(blockStore);
  const energyStore = new EnergyAccountStore();

  // Build a ServiceContainer that exposes the memberStore so the
  // BrightChainAuthenticationProvider can resolve it.
  const services = new ServiceContainer();
  services.register('memberStore', () => memberStore);

  const mockApp = {
    environment: {
      mongo: { useTransactions: false },
      debug: false,
      jwtSecret: JWT_SECRET,
    },
    constants: AppConstants,
    ready: true,
    services,
    plugins: {},
    db: { connection: { readyState: 1 } },
    getModel: () => {
      throw new Error('not implemented');
    },
    getController: () => {
      throw new Error('not implemented');
    },
    setController: () => {
      /* noop */
    },
    start: async () => {
      /* noop */
    },
  } as unknown as IBrightChainApplication;

  const mockEmailService = {
    sendEmail: async () => {
      /* noop */
    },
  } as unknown as EmailService;

  const authProvider = new BrightChainAuthenticationProvider(mockApp);

  const authService = new AuthService(
    mockApp,
    memberStore,
    energyStore,
    mockEmailService,
    JWT_SECRET,
    authProvider,
  );

  return { authService, memberStore, authProvider };
}

/**
 * Register a member directly via MemberStore (to capture the mnemonic)
 * and store a password hash via AuthService.
 */
async function registerMemberWithMnemonic(
  authService: AuthService,
  memberStore: MemberStore,
  username: string,
  email: string,
  password: string,
): Promise<{ memberId: Uint8Array; mnemonic: SecureString }> {
  const { reference, mnemonic } = await memberStore.createMember({
    type: MemberType.User,
    name: username,
    contactEmail: new EmailString(email),
  });

  const memberId = reference.id as Uint8Array;
  const passwordHash = await bcrypt.hash(password, 4); // low rounds for speed
  await authService.storePasswordHash(memberId, passwordHash);

  return { memberId, mnemonic };
}

describe('AuthService Recovery Property-Based Tests', () => {
  // Feature: brightchain-user-management, Property 9: Mnemonic recovery round-trip
  /**
   * Property 9: Mnemonic recovery round-trip
   *
   * For any registered member, `recoverWithMnemonic(email, mnemonic, newPassword)`
   * returns a valid JWT token, the correct memberId, `passwordReset: true`,
   * and the new password verifies against the stored hash.
   *
   * **Validates: Requirements 3.1, 3.2, 3.5**
   */
  describe('Property 9: Mnemonic recovery round-trip', () => {
    it('recoverWithMnemonic returns valid JWT, correct memberId, passwordReset true, and new password verifies', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          passwordArb,
          passwordArb,
          async (username, email, originalPassword, newPassword) => {
            // Ensure original and new passwords differ
            fc.pre(originalPassword !== newPassword);

            const { authService, memberStore } =
              createIsolatedAuthServiceAndStore();

            // Register a member directly to capture the mnemonic
            const { memberId, mnemonic } = await registerMemberWithMnemonic(
              authService,
              memberStore,
              username,
              email,
              originalPassword,
            );

            // Recover with the mnemonic and a new password
            const result = await authService.recoverWithMnemonic(
              email,
              mnemonic,
              newPassword,
            );

            // 1. passwordReset should be true (we provided a new password)
            expect(result.passwordReset).toBe(true);

            // 2. memberId should match the registered member (UUID string via idToString)
            const sp = ServiceProvider.getInstance();
            const typedId = sp.idProvider.fromBytes(memberId);
            const expectedMemberId = sp.idProvider.idToString(typedId);
            expect(result.memberId).toBe(expectedMemberId);

            // 3. token should be a valid JWT with the correct memberId
            const decoded = jwt.verify(
              result.token,
              JWT_SECRET,
            ) as ITokenPayload;
            expect(decoded.memberId).toBe(expectedMemberId);

            // 4. The new password should verify against the stored hash
            const storedHash = await authService.getPasswordHash(memberId);
            const matches = await bcrypt.compare(newPassword, storedHash);
            expect(matches).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    }, 600_000);
  });
});

// Feature: brightchain-user-management, Property 10: Invalid mnemonic rejected
describe('AuthService Recovery Property-Based Tests – Property 10', () => {
  /**
   * Property 10: Invalid mnemonic rejected
   *
   * For any registered member and any mnemonic phrase that is not the member's
   * actual mnemonic, calling `recoverWithMnemonic(email, wrongMnemonic)` should
   * throw an error (e.g. "Invalid credentials", "Invalid mnemonic", or
   * "Invalid wallet mnemonic").
   *
   * **Validates: Requirements 3.3**
   */
  describe('Property 10: Invalid mnemonic rejected', () => {
    /**
     * Arbitrary: a 12-word phrase built from the BIP39 English wordlist.
     * These are syntactically valid BIP39 mnemonics but will almost certainly
     * differ from the real mnemonic generated during registration.
     */
    const bip39Words = [
      'abandon',
      'ability',
      'able',
      'about',
      'above',
      'absent',
      'absorb',
      'abstract',
      'absurd',
      'abuse',
      'access',
      'accident',
      'account',
      'accuse',
      'achieve',
      'acid',
      'acoustic',
      'acquire',
      'across',
      'act',
      'action',
      'actor',
      'actress',
      'actual',
      'adapt',
      'add',
      'addict',
      'address',
      'adjust',
      'admit',
      'adult',
      'advance',
      'advice',
      'aerobic',
      'affair',
      'afford',
      'afraid',
      'again',
      'age',
      'agent',
      'agree',
      'ahead',
      'aim',
      'air',
      'airport',
      'aisle',
      'alarm',
      'album',
      'alcohol',
      'alert',
      'alien',
      'all',
      'alley',
      'allow',
      'almost',
      'alone',
      'alpha',
      'already',
      'also',
      'alter',
      'always',
      'amateur',
      'amazing',
      'among',
      'amount',
      'amused',
      'analyst',
      'anchor',
      'ancient',
      'anger',
      'angle',
      'angry',
      'animal',
      'ankle',
      'announce',
      'annual',
      'another',
      'answer',
      'antenna',
      'antique',
      'anxiety',
      'apart',
      'apology',
      'appear',
      'apple',
      'approve',
      'april',
      'arch',
      'arctic',
      'area',
      'arena',
      'argue',
      'arm',
      'armed',
      'armor',
      'army',
    ];

    const wrongMnemonicArb: fc.Arbitrary<string> = fc
      .array(fc.integer({ min: 0, max: bip39Words.length - 1 }), {
        minLength: 12,
        maxLength: 12,
      })
      .map((indices) => indices.map((i) => bip39Words[i]).join(' '));

    it('recoverWithMnemonic throws for any wrong mnemonic', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          passwordArb,
          wrongMnemonicArb,
          async (username, email, password, wrongMnemonicPhrase) => {
            const { authService, memberStore } =
              createIsolatedAuthServiceAndStore();

            // Register a member and capture the real mnemonic
            const { mnemonic: realMnemonic } = await registerMemberWithMnemonic(
              authService,
              memberStore,
              username,
              email,
              password,
            );

            // Ensure the wrong mnemonic differs from the real one
            const realMnemonicValue = realMnemonic.value;
            fc.pre(wrongMnemonicPhrase !== realMnemonicValue);

            // Attempt recovery with the wrong mnemonic — should throw
            const wrongMnemonic = new SecureString(wrongMnemonicPhrase);
            await expect(
              authService.recoverWithMnemonic(email, wrongMnemonic),
            ).rejects.toThrow(
              /Invalid credentials|Invalid mnemonic|Invalid wallet mnemonic/,
            );
          },
        ),
        { numRuns: 100 },
      );
    }, 600_000);
  });
});
