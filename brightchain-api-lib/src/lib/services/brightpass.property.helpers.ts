/**
 * Shared arbitraries and helpers for BrightPass property tests.
 * Split from brightpass.property.spec.ts to avoid ts-jest compilation hang on large files.
 */
import {
  CreditCardEntry,
  IdentityEntry,
  LoginEntry,
  SecureNoteEntry,
  VaultEntry,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { BrightPassService } from './brightpass';

export const memberIdArb = fc.uuid();
export const vaultNameArb = fc
  .string({ minLength: 1, maxLength: 64 })
  .filter((s) => s.trim().length > 0);
export const masterPasswordArb = fc
  .string({ minLength: 4, maxLength: 128 })
  .filter((s) => s.trim().length > 0);

export const arbitraryLoginEntry = (): fc.Arbitrary<LoginEntry> =>
  fc.record({
    id: fc.uuid(),
    type: fc.constant('login' as const),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    tags: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 5 }),
      { nil: undefined },
    ),
    createdAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    updatedAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    favorite: fc.boolean(),
    siteUrl: fc.webUrl(),
    username: fc.string({ minLength: 1, maxLength: 100 }),
    password: fc.string({ minLength: 8, maxLength: 128 }),
    totpSecret: fc.option(fc.base64String({ minLength: 16, maxLength: 32 }), {
      nil: undefined,
    }),
  });

export const arbitrarySecureNoteEntry = (): fc.Arbitrary<SecureNoteEntry> =>
  fc.record({
    id: fc.uuid(),
    type: fc.constant('secure_note' as const),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    tags: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 5 }),
      { nil: undefined },
    ),
    createdAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    updatedAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    favorite: fc.boolean(),
    content: fc.string({ minLength: 1, maxLength: 500 }),
  });

export const arbitraryCreditCardEntry = (): fc.Arbitrary<CreditCardEntry> =>
  fc.record({
    id: fc.uuid(),
    type: fc.constant('credit_card' as const),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    tags: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 5 }),
      { nil: undefined },
    ),
    createdAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    updatedAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    favorite: fc.boolean(),
    cardholderName: fc.string({ minLength: 1, maxLength: 100 }),
    cardNumber: fc.stringMatching(/^\d{13,19}$/),
    expirationDate: fc.stringMatching(/^(0[1-9]|1[0-2])\/\d{2}$/),
    cvv: fc.stringMatching(/^\d{3,4}$/),
  });

export const arbitraryIdentityEntry = (): fc.Arbitrary<IdentityEntry> =>
  fc.record({
    id: fc.uuid(),
    type: fc.constant('identity' as const),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    tags: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 5 }),
      { nil: undefined },
    ),
    createdAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    updatedAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    favorite: fc.boolean(),
    firstName: fc.string({ minLength: 1, maxLength: 100 }),
    lastName: fc.string({ minLength: 1, maxLength: 100 }),
    email: fc.option(fc.emailAddress(), { nil: undefined }),
    phone: fc.option(fc.string({ minLength: 10, maxLength: 20 }), {
      nil: undefined,
    }),
    address: fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
      nil: undefined,
    }),
  });

export const arbitraryVaultEntry = (): fc.Arbitrary<VaultEntry> =>
  fc.oneof(
    arbitraryLoginEntry(),
    arbitrarySecureNoteEntry(),
    arbitraryCreditCardEntry(),
    arbitraryIdentityEntry(),
  );

/** Helper: create a service with a vault and return both */
export async function createServiceWithVault() {
  const service = new BrightPassService();
  const memberId = 'test-member-' + Math.random().toString(36).slice(2);
  const password = 'test-password-123';
  const metadata = await service.createVault(memberId, 'TestVault', password);
  return { service, memberId, password, vaultId: metadata.id };
}
