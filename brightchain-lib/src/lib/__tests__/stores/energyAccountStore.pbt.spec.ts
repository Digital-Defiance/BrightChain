/**
 * EnergyAccount – Property-Based Tests.
 *
 * Feature: brightchain-db-init-user-endpoints
 *
 * Uses fast-check to validate universal correctness properties
 * of EnergyAccount DTO serialization round-trip and store persistence.
 *
 * **Property 11: EnergyAccount serialization round-trip**
 * **Validates: Requirements 7.4**
 *
 * **Property 10: EnergyAccount store persistence round-trip**
 * **Validates: Requirements 7.1, 7.2, 7.3**
 */

import * as fc from 'fast-check';
import { EnergyAccount } from '../../energyAccount';
import { IEnergyAccountDto } from '../../interfaces/energyAccount';
import {
  ITypedCollection,
  ITypedCursor,
} from '../../interfaces/storage/documentStore';
import { EnergyAccountStore } from '../../stores/energyAccountStore';
import { Checksum } from '../../types/checksum';

// ══════════════════════════════════════════════════════════════
// Arbitraries
// ══════════════════════════════════════════════════════════════

/** SHA3-512 checksums are 64 bytes. */
const CHECKSUM_BYTE_LENGTH = 64;

/**
 * Arbitrary for a valid Checksum (64 random bytes).
 */
const checksumArb: fc.Arbitrary<Checksum> = fc
  .uint8Array({
    minLength: CHECKSUM_BYTE_LENGTH,
    maxLength: CHECKSUM_BYTE_LENGTH,
  })
  .map((bytes) => Checksum.fromUint8Array(bytes));

/**
 * Arbitrary for a valid Date within a reasonable range.
 * Avoids extreme dates that could cause precision issues in ISO string round-trips.
 */
const dateArb: fc.Arbitrary<Date> = fc
  .integer({ min: 0, max: 4_102_444_800_000 }) // 2000-01-01 to ~2100-01-01 in ms
  .map((ms) => new Date(ms));

/**
 * Arbitrary for a valid EnergyAccount with random but valid field values.
 */
const energyAccountArb: fc.Arbitrary<EnergyAccount> = fc
  .record({
    memberId: checksumArb,
    createdAt: dateArb,
    balance: fc.double({
      min: 0,
      max: 1_000_000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    earned: fc.double({
      min: 0,
      max: 1_000_000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    spent: fc.double({
      min: 0,
      max: 1_000_000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    reserved: fc.double({
      min: 0,
      max: 1_000_000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    reputation: fc.double({
      min: 0,
      max: 1,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    lastUpdated: dateArb,
  })
  .map(
    ({
      memberId,
      createdAt,
      balance,
      earned,
      spent,
      reserved,
      reputation,
      lastUpdated,
    }) =>
      new EnergyAccount(
        memberId,
        createdAt,
        balance,
        earned,
        spent,
        reserved,
        reputation,
        lastUpdated,
      ),
  );

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════

describe('EnergyAccount Serialization Property-Based Tests', () => {
  /**
   * Property 11: EnergyAccount serialization round-trip
   *
   * For any valid EnergyAccount object, calling toDto() then
   * EnergyAccount.fromDto() shall produce an EnergyAccount with equivalent
   * memberId, balance, earned, spent, reserved, reputation, createdAt,
   * and lastUpdated values.
   *
   * **Validates: Requirements 7.4**
   */
  it('Property 11: EnergyAccount serialization round-trip', () => {
    fc.assert(
      fc.property(energyAccountArb, (account) => {
        const dto = account.toDto();
        const restored = EnergyAccount.fromDto(dto);

        // memberId round-trips through hex encoding
        expect(restored.memberId.equals(account.memberId)).toBe(true);

        // Numeric fields are preserved exactly
        expect(restored.balance).toBe(account.balance);
        expect(restored.earned).toBe(account.earned);
        expect(restored.spent).toBe(account.spent);
        expect(restored.reserved).toBe(account.reserved);
        expect(restored.reputation).toBe(account.reputation);

        // Date fields round-trip through ISO string (millisecond precision)
        expect(restored.createdAt.getTime()).toBe(account.createdAt.getTime());
        expect(restored.lastUpdated.getTime()).toBe(
          account.lastUpdated.getTime(),
        );
      }),
      { numRuns: 100 },
    );
  });
});

// ══════════════════════════════════════════════════════════════
// In-Memory ITypedCollection for Testing
// ══════════════════════════════════════════════════════════════

/**
 * In-memory implementation of ITypedCollection for testing.
 *
 * Stores documents as IEnergyAccountDto (the stored form) and
 * hydrates/dehydrates using EnergyAccount.fromDto/toDto, mirroring
 * what the real Model does.
 */
class InMemoryTypedCollection
  implements ITypedCollection<IEnergyAccountDto, EnergyAccount>
{
  private docs: IEnergyAccountDto[] = [];

  find(filter?: Partial<IEnergyAccountDto>): ITypedCursor<EnergyAccount> {
    const filterKeys = filter
      ? (Object.keys(filter) as (keyof IEnergyAccountDto)[])
      : [];
    const matched =
      filterKeys.length === 0
        ? [...this.docs]
        : this.docs.filter((doc) =>
            filterKeys.every((k) => doc[k] === filter![k]),
          );
    return {
      toArray: async () => matched.map((d) => EnergyAccount.fromDto(d)),
    };
  }

  async findOne(
    filter?: Partial<IEnergyAccountDto>,
  ): Promise<EnergyAccount | null> {
    const results = await this.find(filter).toArray();
    return results.length > 0 ? results[0] : null;
  }

  async replaceOne(
    filter: Partial<IEnergyAccountDto>,
    replacement: EnergyAccount,
    options?: { upsert?: boolean },
  ): Promise<unknown> {
    const dto = replacement.toDto();
    const filterKeys = Object.keys(filter) as (keyof IEnergyAccountDto)[];
    const idx = this.docs.findIndex((d) =>
      filterKeys.every((k) => d[k] === filter[k]),
    );
    if (idx >= 0) {
      this.docs[idx] = dto;
    } else if (options?.upsert) {
      this.docs.push(dto);
    }
    return {};
  }

  async deleteOne(filter: Partial<IEnergyAccountDto>): Promise<unknown> {
    const filterKeys = Object.keys(filter) as (keyof IEnergyAccountDto)[];
    const idx = this.docs.findIndex((d) =>
      filterKeys.every((k) => d[k] === filter[k]),
    );
    if (idx >= 0) {
      this.docs.splice(idx, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  dehydrate(typed: EnergyAccount): IEnergyAccountDto {
    return typed.toDto();
  }

  hydrate(stored: IEnergyAccountDto): EnergyAccount {
    return EnergyAccount.fromDto(stored);
  }
}

// ══════════════════════════════════════════════════════════════
// Property 10 – Persistence Round-Trip
// ══════════════════════════════════════════════════════════════

describe('EnergyAccountStore Persistence Property-Based Tests', () => {
  /**
   * Property 10: EnergyAccount store persistence round-trip
   *
   * For any set of EnergyAccount objects stored via EnergyAccountStore.set(),
   * creating a new EnergyAccountStore instance backed by the same
   * ITypedCollection and calling loadFromStore() shall recover all accounts
   * with equivalent field values.
   *
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */
  it('Property 10: EnergyAccount store persistence round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate 1–10 unique EnergyAccounts with distinct memberIds
        fc.uniqueArray(energyAccountArb, {
          minLength: 1,
          maxLength: 10,
          comparator: (a, b) => a.memberId.equals(b.memberId),
        }),
        async (accounts) => {
          // ── Phase 1: Store accounts via the first store ──
          const backingCollection = new InMemoryTypedCollection();
          const store1 = new EnergyAccountStore(backingCollection);

          for (const account of accounts) {
            await store1.set(account.memberId, account);
          }

          // ── Phase 2: Create a fresh store from the same backing ──
          const store2 = new EnergyAccountStore(backingCollection);
          await store2.loadFromStore();

          // ── Phase 3: Verify all accounts recovered ──
          expect(store2.size).toBe(accounts.length);

          for (const original of accounts) {
            const recovered = store2.get(original.memberId);
            expect(recovered).toBeDefined();

            // memberId equivalence
            expect(recovered!.memberId.equals(original.memberId)).toBe(true);

            // Numeric fields preserved
            expect(recovered!.balance).toBe(original.balance);
            expect(recovered!.earned).toBe(original.earned);
            expect(recovered!.spent).toBe(original.spent);
            expect(recovered!.reserved).toBe(original.reserved);
            expect(recovered!.reputation).toBe(original.reputation);

            // Date fields preserved (millisecond precision via ISO string)
            expect(recovered!.createdAt.getTime()).toBe(
              original.createdAt.getTime(),
            );
            expect(recovered!.lastUpdated.getTime()).toBe(
              original.lastUpdated.getTime(),
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
