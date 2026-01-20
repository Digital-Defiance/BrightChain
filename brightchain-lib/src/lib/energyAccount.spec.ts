import { EnergyAccount } from './energyAccount';
import { ENERGY } from './energyConsts';
import { EnergyAccountStore } from './stores/energyAccountStore';
import { Checksum } from './types/checksum';

describe('EnergyAccount', () => {
  let memberId: Checksum;

  beforeEach(() => {
    memberId = Checksum.fromUint8Array(
      crypto.getRandomValues(new Uint8Array(64)),
    );
  });

  describe('creation', () => {
    it('should create account with trial credits', () => {
      const account = EnergyAccount.createWithTrialCredits(memberId);

      expect(account.memberId).toBe(memberId);
      expect(account.balance).toBe(ENERGY.TRIAL_CREDITS);
      expect(account.earned).toBe(0);
      expect(account.spent).toBe(0);
      expect(account.reserved).toBe(0);
      expect(account.reputation).toBe(0.5);
    });

    it('should have correct available balance', () => {
      const account = EnergyAccount.createWithTrialCredits(memberId);
      expect(account.availableBalance).toBe(ENERGY.TRIAL_CREDITS);
    });
  });

  describe('operations', () => {
    let account: EnergyAccount;

    beforeEach(() => {
      account = EnergyAccount.createWithTrialCredits(memberId);
    });

    it('should reserve energy', () => {
      account.reserve(100);
      expect(account.reserved).toBe(100);
      expect(account.availableBalance).toBe(ENERGY.TRIAL_CREDITS - 100);
    });

    it('should release reserved energy', () => {
      account.reserve(100);
      account.release(50);
      expect(account.reserved).toBe(50);
      expect(account.availableBalance).toBe(ENERGY.TRIAL_CREDITS - 50);
    });

    it('should charge energy', () => {
      account.charge(100);
      expect(account.balance).toBe(ENERGY.TRIAL_CREDITS - 100);
      expect(account.spent).toBe(100);
    });

    it('should credit energy', () => {
      account.credit(500);
      expect(account.balance).toBe(ENERGY.TRIAL_CREDITS + 500);
      expect(account.earned).toBe(500);
    });

    it('should throw on insufficient balance', () => {
      expect(() => account.charge(ENERGY.TRIAL_CREDITS + 1)).toThrow();
    });

    it('should update reputation', () => {
      account.updateReputation(0.8);
      expect(account.reputation).toBe(0.8);
    });

    it('should clamp reputation to 0-1', () => {
      account.updateReputation(1.5);
      expect(account.reputation).toBe(1.0);

      account.updateReputation(-0.5);
      expect(account.reputation).toBe(0.0);
    });
  });

  describe('serialization', () => {
    it('should convert to/from DTO', () => {
      const account = EnergyAccount.createWithTrialCredits(memberId);
      account.charge(100);
      account.credit(50);

      const dto = account.toDto();
      const restored = EnergyAccount.fromDto(dto);

      expect(restored.memberId.equals(account.memberId)).toBe(true);
      expect(restored.balance).toBe(account.balance);
      expect(restored.earned).toBe(account.earned);
      expect(restored.spent).toBe(account.spent);
    });

    it('should convert to/from JSON', () => {
      const account = EnergyAccount.createWithTrialCredits(memberId);
      const json = account.toJson();
      const restored = EnergyAccount.fromJson(json);

      expect(restored.memberId.equals(account.memberId)).toBe(true);
      expect(restored.balance).toBe(account.balance);
    });
  });
});

describe('EnergyAccountStore', () => {
  let store: EnergyAccountStore;
  let memberId: Checksum;

  beforeEach(() => {
    store = new EnergyAccountStore();
    memberId = Checksum.fromUint8Array(
      crypto.getRandomValues(new Uint8Array(64)),
    );
  });

  it('should store and retrieve accounts', async () => {
    const account = EnergyAccount.createWithTrialCredits(memberId);
    await store.set(memberId, account);

    const retrieved = store.get(memberId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.memberId.equals(memberId)).toBe(true);
  });

  it('should get or create account', async () => {
    expect(store.has(memberId)).toBe(false);

    const account = await store.getOrCreate(memberId);
    expect(account.balance).toBe(ENERGY.TRIAL_CREDITS);
    expect(store.has(memberId)).toBe(true);
  });

  it('should delete accounts', async () => {
    const account = EnergyAccount.createWithTrialCredits(memberId);
    await store.set(memberId, account);

    expect(store.has(memberId)).toBe(true);
    store.delete(memberId);
    expect(store.has(memberId)).toBe(false);
  });

  it('should get all accounts', async () => {
    const id1 = Checksum.fromUint8Array(
      crypto.getRandomValues(new Uint8Array(64)),
    );
    const id2 = Checksum.fromUint8Array(
      crypto.getRandomValues(new Uint8Array(64)),
    );

    await store.set(id1, EnergyAccount.createWithTrialCredits(id1));
    await store.set(id2, EnergyAccount.createWithTrialCredits(id2));

    const all = store.getAll();
    expect(all.length).toBe(2);
  });
});
