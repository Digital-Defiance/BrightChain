import { AccessSeal } from '../crypto/access-seal';
import { VaultLedgerEntryType } from '../enumerations/vault-ledger-entry-type';
import { LedgerVerifier } from '../ledger/ledger-verifier';

function createMockLedger() {
  const entries: Array<{
    payload: Uint8Array;
    entryHash: Uint8Array;
    sequenceNumber: number;
  }> = [];
  let seq = 0;

  return {
    entries,
    get length() {
      return entries.length;
    },
    addEntry(payload: Uint8Array) {
      const hash = new Uint8Array(64);
      crypto.getRandomValues(hash);
      entries.push({
        payload: new Uint8Array(payload),
        entryHash: hash,
        sequenceNumber: seq++,
      });
    },
    async append(payload: Uint8Array): Promise<{ toUint8Array(): Uint8Array }> {
      const hash = new Uint8Array(64);
      crypto.getRandomValues(hash);
      entries.push({
        payload: new Uint8Array(payload),
        entryHash: hash,
        sequenceNumber: seq++,
      });
      return { toUint8Array: () => hash };
    },
    async getEntry(seqNum: number) {
      const e = entries[seqNum];
      return {
        payload: e.payload,
        entryHash: { toUint8Array: () => e.entryHash },
        sequenceNumber: e.sequenceNumber,
      };
    },
  };
}

function buildLedgerPayload(
  type: VaultLedgerEntryType,
  hash: Uint8Array,
): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const payload = new Uint8Array(typeBytes.length + hash.length);
  payload.set(typeBytes, 0);
  payload.set(hash, typeBytes.length);
  return payload;
}

describe('LedgerVerifier', () => {
  // Feature: digital-burn-bag, Property 19: Ledger-based non-access verification
  // Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5
  it('Property 19: pristine seal + no ledger access → non-access confirmed', async () => {
    const treeSeed = new Uint8Array(32);
    crypto.getRandomValues(treeSeed);
    const accessSeal = AccessSeal.derive(treeSeed, AccessSeal.PRISTINE_DOMAIN);
    const creationHash = new Uint8Array(64);
    crypto.getRandomValues(creationHash);

    // Ledger has only a vault_created entry (no reads, no key releases)
    const ledger = createMockLedger();
    ledger.addEntry(
      buildLedgerPayload(VaultLedgerEntryType.vault_created, creationHash),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const verifier = new LedgerVerifier(ledger as any);
    const result = await verifier.verifyNonAccess(
      creationHash,
      accessSeal,
      treeSeed,
    );

    expect(result.nonAccessConfirmed).toBe(true);
    expect(result.sealStatus).toBe('pristine');
    expect(result.ledgerReadCount).toBe(0);
    expect(result.ledgerKeyReleaseCount).toBe(0);
    expect(result.consistent).toBe(true);
  });

  it('Property 19: accessed seal + ledger read entries → consistent accessed result', async () => {
    const treeSeed = new Uint8Array(32);
    crypto.getRandomValues(treeSeed);
    const accessSeal = AccessSeal.derive(treeSeed, AccessSeal.ACCESSED_DOMAIN);
    const creationHash = new Uint8Array(64);
    crypto.getRandomValues(creationHash);

    const ledger = createMockLedger();
    ledger.addEntry(
      buildLedgerPayload(VaultLedgerEntryType.vault_created, creationHash),
    );
    ledger.addEntry(
      buildLedgerPayload(
        VaultLedgerEntryType.vault_read_requested,
        creationHash,
      ),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const verifier = new LedgerVerifier(ledger as any);
    const result = await verifier.verifyNonAccess(
      creationHash,
      accessSeal,
      treeSeed,
    );

    expect(result.nonAccessConfirmed).toBe(false);
    expect(result.sealStatus).toBe('accessed');
    expect(result.ledgerReadCount).toBe(1);
    expect(result.consistent).toBe(true);
  });

  // Feature: digital-burn-bag, Property 21: Snapshot-restore attack detection
  // Validates: Requirements 17.1, 17.2, 17.3, 17.4
  it('Property 21: pristine seal + ledger read entries → inconsistency detected', async () => {
    const treeSeed = new Uint8Array(32);
    crypto.getRandomValues(treeSeed);
    // Seal is pristine (simulating snapshot-restore: attacker restored seal)
    const accessSeal = AccessSeal.derive(treeSeed, AccessSeal.PRISTINE_DOMAIN);
    const creationHash = new Uint8Array(64);
    crypto.getRandomValues(creationHash);

    // But ledger has read and key_released entries (can't be erased)
    const ledger = createMockLedger();
    ledger.addEntry(
      buildLedgerPayload(VaultLedgerEntryType.vault_created, creationHash),
    );
    ledger.addEntry(
      buildLedgerPayload(
        VaultLedgerEntryType.vault_read_requested,
        creationHash,
      ),
    );
    ledger.addEntry(
      buildLedgerPayload(VaultLedgerEntryType.key_released, creationHash),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const verifier = new LedgerVerifier(ledger as any);
    const result = await verifier.verifyNonAccess(
      creationHash,
      accessSeal,
      treeSeed,
    );

    expect(result.nonAccessConfirmed).toBe(false);
    expect(result.sealStatus).toBe('pristine');
    expect(result.consistent).toBe(false);
    expect(result.ledgerReadCount).toBe(1);
    expect(result.ledgerKeyReleaseCount).toBe(1);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('pristine');
  });
});
