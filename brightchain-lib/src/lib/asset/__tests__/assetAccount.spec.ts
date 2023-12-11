import { InsufficientAvailableBalanceError } from '../../errors/asset/insufficientAvailableBalanceError';
import { InvalidAmountError } from '../../errors/asset/invalidAmountError';
import { Checksum } from '../../types/checksum';
import { AssetAccount } from '../assetAccount';
import { JOULE_ASSET_ID } from '../jouleConstants';

const HEX = 'b'.repeat(128);
const memberId = (): Checksum => Checksum.fromHex(HEX);

describe('AssetAccount', () => {
  it('defaults to joule when assetId is omitted', () => {
    const a = new AssetAccount(memberId());
    expect(a.assetId).toBe(JOULE_ASSET_ID);
    expect(a.balance).toBe(0n);
  });

  it('rejects empty assetId', () => {
    expect(() => new AssetAccount(memberId(), '')).toThrow(InvalidAmountError);
  });

  it('rejects negative balances in constructor', () => {
    expect(
      () => new AssetAccount(memberId(), 'joule', new Date(0), -1n),
    ).toThrow(InvalidAmountError);
  });

  it('availableBalance = balance - reserved, floored at 0', () => {
    const a = new AssetAccount(
      memberId(),
      'joule',
      new Date(0),
      100n,
      0n,
      0n,
      30n,
    );
    expect(a.availableBalance).toBe(70n);
    a.reserved = 200n;
    expect(a.availableBalance).toBe(0n);
  });

  it('netAsset = earned - spent', () => {
    const a = new AssetAccount(memberId(), 'joule', new Date(0), 0n, 50n, 30n);
    expect(a.netAsset).toBe(20n);
  });

  it('canAfford respects reservation', () => {
    const a = new AssetAccount(
      memberId(),
      'joule',
      new Date(0),
      100n,
      0n,
      0n,
      30n,
    );
    expect(a.canAfford(70n)).toBe(true);
    expect(a.canAfford(71n)).toBe(false);
    expect(a.canAfford(-1n as unknown as bigint)).toBe(false);
  });

  it('reserve throws InsufficientAvailableBalanceError when over the limit', () => {
    const a = new AssetAccount(memberId(), 'joule', new Date(0), 10n);
    expect(() => a.reserve(11n)).toThrow(InsufficientAvailableBalanceError);
  });

  it('reserve / release adjust the reservation correctly', () => {
    const a = new AssetAccount(memberId(), 'joule', new Date(0), 100n);
    a.reserve(40n);
    expect(a.reserved).toBe(40n);
    a.release(10n);
    expect(a.reserved).toBe(30n);
    a.release(1000n); // floors at zero
    expect(a.reserved).toBe(0n);
  });

  it('charge deducts balance and bumps spent', () => {
    const a = new AssetAccount(memberId(), 'joule', new Date(0), 100n);
    a.charge(40n);
    expect(a.balance).toBe(60n);
    expect(a.spent).toBe(40n);
  });

  it('charge throws when insufficient balance', () => {
    const a = new AssetAccount(memberId(), 'joule', new Date(0), 5n);
    expect(() => a.charge(6n)).toThrow(InsufficientAvailableBalanceError);
  });

  it('credit adds to balance and earned', () => {
    const a = new AssetAccount(memberId(), 'joule', new Date(0), 0n);
    a.credit(100n);
    expect(a.balance).toBe(100n);
    expect(a.earned).toBe(100n);
  });

  it('updateReputation clamps to [0, 1]', () => {
    const a = new AssetAccount(memberId());
    a.updateReputation(2);
    expect(a.reputation).toBe(1);
    a.updateReputation(-1);
    expect(a.reputation).toBe(0);
    a.updateReputation(0.42);
    expect(a.reputation).toBeCloseTo(0.42);
  });

  it('updateReputation rejects non-finite numbers', () => {
    const a = new AssetAccount(memberId());
    expect(() => a.updateReputation(Number.NaN)).toThrow(InvalidAmountError);
    expect(() => a.updateReputation(Number.POSITIVE_INFINITY)).toThrow(
      InvalidAmountError,
    );
  });

  it('toDto / fromDto round-trip preserves values', () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const updated = new Date('2026-01-02T00:00:00Z');
    const a = new AssetAccount(
      memberId(),
      'joule',
      created,
      100n,
      120n,
      20n,
      5n,
      0.42,
      updated,
    );
    const dto = a.toDto();
    expect(dto.assetId).toBe('joule');
    expect(dto.balance).toBe('100');
    const b = AssetAccount.fromDto(dto);
    expect(b.balance).toBe(100n);
    expect(b.earned).toBe(120n);
    expect(b.spent).toBe(20n);
    expect(b.reserved).toBe(5n);
    expect(b.reputation).toBeCloseTo(0.42);
    expect(b.createdAt.toISOString()).toBe(created.toISOString());
    expect(b.lastUpdated.toISOString()).toBe(updated.toISOString());
    expect(b.memberId.toHex()).toBe(HEX);
  });

  it('fromDto hydrates a legacy IEnergyAccountDto-shaped record', () => {
    const legacy = {
      memberId: HEX,
      // assetId missing — defaults to joule
      balance: 5, // 5 J → 5_000_000 µJ
      earned: 5,
      spent: 0,
      reserved: 0,
      reputation: 0.5,
      createdAt: new Date(0).toISOString(),
      lastUpdated: new Date(0).toISOString(),
    };
    const a = AssetAccount.fromDto(legacy);
    expect(a.assetId).toBe('joule');
    expect(a.balance).toBe(5_000_000n);
    expect(a.earned).toBe(5_000_000n);
  });

  it('toJson / fromJson round-trip', () => {
    const a = new AssetAccount(memberId(), 'joule', new Date(0), 7n);
    const b = AssetAccount.fromJson(a.toJson());
    expect(b.balance).toBe(7n);
    expect(b.assetId).toBe('joule');
  });
});
