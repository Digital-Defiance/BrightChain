/**
 * Backward-compatibility integration test — Phase 8.1
 *
 * Requirement 2.5 / 2.6: Legacy DTOs (missing assetId, number balance) MUST
 * hydrate correctly when loaded through EnergyAccountStore.loadFromStore(),
 * and the next write MUST persist the upgraded shape.
 */

import { EnergyAccount } from '../../energyAccount';
import { IEnergyAccountDto } from '../../interfaces/energyAccount';
import {
  ITypedCollection,
  ITypedCursor,
} from '../../interfaces/storage/documentStore';
import { EnergyAccountStore } from '../../stores/energyAccountStore';
import { Checksum } from '../../types/checksum';

const HEX = 'c'.repeat(128);
const memberId = (): Checksum => Checksum.fromHex(HEX);

// ---------------------------------------------------------------------------
// Minimal in-memory ITypedCollection that holds raw objects (no hydration) and
// exposes them as EnergyAccount instances via AssetAccount.fromDto.
// ---------------------------------------------------------------------------

interface LegacyLike {
  memberId: string;
  assetId?: string;
  balance: number | string;
  earned: number | string;
  spent: number | string;
  reserved: number | string;
  reputation?: number;
  createdAt?: string;
  lastUpdated?: string;
}

function legacyToEnergyAccount(raw: LegacyLike): EnergyAccount {
  return EnergyAccount.fromDto(raw as unknown as Record<string, unknown>);
}

function legacyFromEnergyAccount(account: EnergyAccount): IEnergyAccountDto {
  return account.toDto() as IEnergyAccountDto;
}

class InMemoryLegacyCollection
  implements ITypedCollection<IEnergyAccountDto, EnergyAccount>
{
  public readonly written: IEnergyAccountDto[] = [];

  constructor(private readonly seed: LegacyLike[]) {}

  find(_filter?: Partial<IEnergyAccountDto>): ITypedCursor<EnergyAccount> {
    const hydrated = this.seed.map(legacyToEnergyAccount);
    return { toArray: () => Promise.resolve(hydrated) };
  }

  findOne(_filter?: Partial<IEnergyAccountDto>): Promise<EnergyAccount | null> {
    return Promise.resolve(null);
  }

  async replaceOne(
    _filter: Partial<IEnergyAccountDto>,
    replacement: EnergyAccount,
    _options?: { upsert?: boolean },
  ): Promise<unknown> {
    this.written.push(legacyFromEnergyAccount(replacement));
    return { acknowledged: true };
  }

  deleteOne(_filter: Partial<IEnergyAccountDto>): Promise<unknown> {
    return Promise.resolve({ deletedCount: 1 });
  }

  dehydrate(typed: EnergyAccount): IEnergyAccountDto {
    return legacyFromEnergyAccount(typed);
  }

  hydrate(stored: IEnergyAccountDto): EnergyAccount {
    return legacyToEnergyAccount(stored as unknown as LegacyLike);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EnergyAccountStore backward-compatibility (Phase 8.1)', () => {
  it('assetId defaults to "joule" when loading a legacy DTO with no assetId', async () => {
    const legacy: LegacyLike = {
      memberId: HEX,
      // assetId intentionally absent
      balance: '5000000', // already-migrated string form
      earned: '5000000',
      spent: '0',
      reserved: '0',
      reputation: 0.5,
      createdAt: new Date(0).toISOString(),
      lastUpdated: new Date(0).toISOString(),
    };
    const collection = new InMemoryLegacyCollection([legacy]);
    const store = new EnergyAccountStore(collection);

    await store.loadFromStore();

    const account = store.get(memberId());
    expect(account).toBeDefined();
    expect(account!.assetId).toBe('joule');
  });

  it('balance upgrades from number joules to bigint microjoules on load', async () => {
    const legacy: LegacyLike = {
      memberId: HEX,
      balance: 5, // 5 J → 5_000_000 µJ
      earned: 5,
      spent: 0,
      reserved: 0,
      reputation: 0.5,
      createdAt: new Date(0).toISOString(),
      lastUpdated: new Date(0).toISOString(),
    };
    const collection = new InMemoryLegacyCollection([legacy]);
    const store = new EnergyAccountStore(collection);

    await store.loadFromStore();

    const account = store.get(memberId());
    expect(account).toBeDefined();
    expect(account!.balance).toBe(5_000_000n);
    expect(account!.earned).toBe(5_000_000n);
    expect(account!.spent).toBe(0n);
    expect(account!.reserved).toBe(0n);
  });

  it('next write persists the upgraded DTO shape (bigint-as-string, assetId present)', async () => {
    const legacy: LegacyLike = {
      memberId: HEX,
      // no assetId, number balance
      balance: 3,
      earned: 3,
      spent: 0,
      reserved: 0,
      reputation: 0,
      createdAt: new Date(0).toISOString(),
      lastUpdated: new Date(0).toISOString(),
    };
    const collection = new InMemoryLegacyCollection([legacy]);
    const store = new EnergyAccountStore(collection);

    await store.loadFromStore();

    // Trigger a write by crediting the account
    const account = store.get(memberId()) as EnergyAccount;
    expect(account).toBeDefined();
    account.credit(1_000_000n);
    await store.set(memberId(), account);

    expect(collection.written.length).toBeGreaterThanOrEqual(1);
    const persisted = collection.written[collection.written.length - 1];

    // Upgraded shape: assetId present, balance is bigint-as-string
    expect(persisted.assetId).toBe('joule');
    expect(typeof persisted.balance).toBe('string');
    expect(BigInt(persisted.balance)).toBe(4_000_000n); // 3 J migrated + 1 µJ credit = 4_000_000 µJ
  });

  it('loadFromStore is a no-op when no typed collection is configured', async () => {
    const store = new EnergyAccountStore(); // no collection
    await expect(store.loadFromStore()).resolves.toBeUndefined();
  });
});
