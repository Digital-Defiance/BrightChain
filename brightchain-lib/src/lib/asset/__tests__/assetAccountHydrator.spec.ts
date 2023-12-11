import { Checksum } from '../../types/checksum';
import { hydrateAssetAccountDto } from '../assetAccount';
import { JOULE_ASSET_ID, JOULE_MICROUNITS_PER_UNIT } from '../jouleConstants';

function makeChecksumHex(): string {
  // 128-char hex for SHA3-512 (64 bytes).
  return 'a'.repeat(128);
}

describe('hydrateAssetAccountDto', () => {
  it('defaults missing assetId to "joule"', () => {
    const out = hydrateAssetAccountDto({
      memberId: makeChecksumHex(),
      balance: '5000000',
      earned: '5000000',
      spent: '0',
      reserved: '0',
      reputation: 0.7,
      createdAt: new Date(0).toISOString(),
      lastUpdated: new Date(0).toISOString(),
    });
    expect(out.assetId).toBe(JOULE_ASSET_ID);
  });

  it('upgrades legacy number balance to bigint microunit string', () => {
    const out = hydrateAssetAccountDto({
      memberId: makeChecksumHex(),
      assetId: 'joule',
      balance: 5,
      earned: 10,
      spent: 3,
      reserved: 1,
      reputation: 0.5,
      createdAt: new Date(0).toISOString(),
      lastUpdated: new Date(0).toISOString(),
    });
    expect(out.balance).toBe('5000000');
    expect(out.earned).toBe('10000000');
    expect(out.spent).toBe('3000000');
    expect(out.reserved).toBe('1000000');
  });

  it('handles both legacy markers (no assetId AND number balance) in one doc', () => {
    const out = hydrateAssetAccountDto({
      memberId: makeChecksumHex(),
      balance: 2.5,
      earned: 0,
      spent: 0,
      reserved: 0,
      reputation: 0.5,
      createdAt: new Date(0).toISOString(),
      lastUpdated: new Date(0).toISOString(),
    });
    expect(out.assetId).toBe(JOULE_ASSET_ID);
    // 2.5 J → 2_500_000 µJ
    expect(out.balance).toBe(
      BigInt(Math.round(2.5 * Number(JOULE_MICROUNITS_PER_UNIT))).toString(),
    );
    expect(out.balance).toBe('2500000');
  });

  it('is idempotent: an already-upgraded DTO round-trips unchanged', () => {
    const upgraded = {
      memberId: makeChecksumHex(),
      assetId: 'joule',
      balance: '12345678',
      earned: '12345678',
      spent: '0',
      reserved: '0',
      reputation: 0.5,
      createdAt: new Date(0).toISOString(),
      lastUpdated: new Date(0).toISOString(),
    };
    const out = hydrateAssetAccountDto({ ...upgraded });
    expect(out).toEqual(upgraded);
  });

  it('coerces missing/invalid bigint fields to "0"', () => {
    const out = hydrateAssetAccountDto({
      memberId: makeChecksumHex(),
      assetId: 'joule',
      reputation: 0.5,
      createdAt: new Date(0).toISOString(),
      lastUpdated: new Date(0).toISOString(),
    });
    expect(out.balance).toBe('0');
    expect(out.earned).toBe('0');
    expect(out.spent).toBe('0');
    expect(out.reserved).toBe('0');
  });

  it('passes bigint-typed inputs through as decimal strings', () => {
    const out = hydrateAssetAccountDto({
      memberId: makeChecksumHex(),
      assetId: 'joule',
      balance: 9999n,
      earned: 0n,
      spent: 0n,
      reserved: 0n,
      reputation: 0.5,
      createdAt: new Date(0).toISOString(),
      lastUpdated: new Date(0).toISOString(),
    });
    expect(out.balance).toBe('9999');
  });

  it('preserves a non-joule assetId without rescaling number balances (legacy joule-only assumption)', () => {
    // A non-joule asset never had a legacy number balance in the wild;
    // hydrator still must not corrupt explicit assetId.
    const out = hydrateAssetAccountDto({
      memberId: makeChecksumHex(),
      assetId: 'postage',
      balance: '42',
      earned: '0',
      spent: '0',
      reserved: '0',
      reputation: 0.5,
      createdAt: new Date(0).toISOString(),
      lastUpdated: new Date(0).toISOString(),
    });
    expect(out.assetId).toBe('postage');
    expect(out.balance).toBe('42');
  });

  it('round-trips through Checksum without losing memberId', () => {
    const hex = makeChecksumHex();
    const out = hydrateAssetAccountDto({
      memberId: hex,
      balance: 1,
      earned: 0,
      spent: 0,
      reserved: 0,
      reputation: 0.5,
      createdAt: new Date(0).toISOString(),
      lastUpdated: new Date(0).toISOString(),
    });
    expect(out.memberId).toBe(hex);
    // Also exercise Checksum.fromHex on the same value.
    expect(Checksum.fromHex(hex).toHex()).toBe(hex);
  });
});
