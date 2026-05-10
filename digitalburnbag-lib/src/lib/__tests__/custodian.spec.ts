import { ECIESService } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import { VaultLedgerEntryType } from '../enumerations/vault-ledger-entry-type';
import { CustodialKeyReleaseError } from '../errors';
import { LedgerQuorumCustodian } from '../ledger/ledger-quorum-custodian';

// Shared ECIESService instance
const ecies = new ECIESService();

// Mock Ledger
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
    async append(
      payload: Uint8Array,
      _signer: unknown,
    ): Promise<{ toUint8Array(): Uint8Array }> {
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

describe('LedgerQuorumCustodian', () => {
  // Feature: digital-burn-bag, Property 17: Custodial key release round-trip
  // Validates: Requirements 14.1, 14.2, 14.3, 14.5
  it('Property 17: encrypting tree seed and requesting release returns original seed with ledger record', async () => {
    // Generate custodian and admin key pairs once (expensive)
    const custodianPrivateKey = ecies.core.generatePrivateKey();
    const adminPrivateKey = ecies.core.generatePrivateKey();
    const adminPublicKey = ecies.getPublicKey(adminPrivateKey);
    const requesterPrivateKey = ecies.core.generatePrivateKey();
    const requesterPublicKey = ecies.getPublicKey(requesterPrivateKey);

    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        fc.uint8Array({ minLength: 64, maxLength: 64 }),
        async (treeSeed, creationLedgerEntryHash) => {
          const ledger = createMockLedger();
          const custodian = new LedgerQuorumCustodian(
            ecies,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ledger as any,
            custodianPrivateKey,
          );

          // Encrypt tree seed
          const encResult = await custodian.encryptTreeSeed(treeSeed);
          expect(encResult.encryptedTreeSeed).toBeInstanceOf(Uint8Array);
          expect(encResult.encryptedTreeSeed.length).toBeGreaterThan(0);
          expect(encResult.custodialPublicKey).toBeInstanceOf(Uint8Array);
          expect(encResult.custodialPublicKey.length).toBe(33);

          // Create admin signature over the creationLedgerEntryHash
          const adminSignature = ecies.signMessage(
            adminPrivateKey,
            creationLedgerEntryHash,
          );

          // Request key release
          const releasedSeed = await custodian.requestKeyRelease(
            creationLedgerEntryHash,
            encResult.encryptedTreeSeed,
            requesterPublicKey,
            [{ signerPublicKey: adminPublicKey, signature: adminSignature }],
          );

          // Verify round-trip: released seed matches original
          expect(releasedSeed).toBeInstanceOf(Uint8Array);
          expect(releasedSeed.length).toBe(treeSeed.length);
          for (let i = 0; i < treeSeed.length; i++) {
            expect(releasedSeed[i]).toBe(treeSeed[i]);
          }

          // Verify ledger contains a key_released entry
          expect(ledger.entries.length).toBe(1);
          const entryPayload = new TextDecoder().decode(
            ledger.entries[0].payload.subarray(
              0,
              VaultLedgerEntryType.key_released.length,
            ),
          );
          expect(entryPayload).toBe(VaultLedgerEntryType.key_released);

          // Verify hasKeyReleaseRecord returns true
          const hasRecord = await custodian.hasKeyReleaseRecord(
            creationLedgerEntryHash,
          );
          expect(hasRecord).toBe(true);
        },
      ),
      { numRuns: 20 }, // Reduced runs due to ECIES overhead
    );
  });

  // Feature: digital-burn-bag, Property 18: Vault read fails without custodial release
  // Validates: Requirements 14.4
  it('Property 18: key release fails without admin quorum signatures', async () => {
    const custodianPrivateKey = ecies.core.generatePrivateKey();
    const requesterPrivateKey = ecies.core.generatePrivateKey();
    const requesterPublicKey = ecies.getPublicKey(requesterPrivateKey);

    const ledger = createMockLedger();
    const custodian = new LedgerQuorumCustodian(
      ecies,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ledger as any,
      custodianPrivateKey,
    );

    const treeSeed = new Uint8Array(32);
    crypto.getRandomValues(treeSeed);
    const encResult = await custodian.encryptTreeSeed(treeSeed);
    const creationHash = new Uint8Array(64);
    crypto.getRandomValues(creationHash);

    // No admin signatures → should fail
    await expect(
      custodian.requestKeyRelease(
        creationHash,
        encResult.encryptedTreeSeed,
        requesterPublicKey,
        [],
      ),
    ).rejects.toThrow(CustodialKeyReleaseError);

    // Undefined admin signatures → should fail
    await expect(
      custodian.requestKeyRelease(
        creationHash,
        encResult.encryptedTreeSeed,
        requesterPublicKey,
        undefined,
      ),
    ).rejects.toThrow(CustodialKeyReleaseError);

    // Invalid admin signature → should fail
    const fakeSignature = new Uint8Array(64);
    crypto.getRandomValues(fakeSignature);
    const fakePublicKey = ecies.getPublicKey(ecies.core.generatePrivateKey());

    await expect(
      custodian.requestKeyRelease(
        creationHash,
        encResult.encryptedTreeSeed,
        requesterPublicKey,
        [{ signerPublicKey: fakePublicKey, signature: fakeSignature }],
      ),
    ).rejects.toThrow(CustodialKeyReleaseError);

    // No requester public key → should fail
    await expect(
      custodian.requestKeyRelease(
        creationHash,
        encResult.encryptedTreeSeed,
        new Uint8Array(0),
        [{ signerPublicKey: fakePublicKey, signature: fakeSignature }],
      ),
    ).rejects.toThrow(CustodialKeyReleaseError);

    // Ledger should have NO entries (all requests failed before ledger write)
    expect(ledger.entries.length).toBe(0);
  });

  // Feature: digital-burn-bag, Property 26: Custodial bypass rejection
  // Validates: Requirements 22.1, 22.2, 22.3, 22.4
  it('Property 26: signature from wrong admin key is rejected', async () => {
    const custodianPrivateKey = ecies.core.generatePrivateKey();
    const requesterPublicKey = ecies.getPublicKey(
      ecies.core.generatePrivateKey(),
    );

    const ledger = createMockLedger();
    const custodian = new LedgerQuorumCustodian(
      ecies,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ledger as any,
      custodianPrivateKey,
    );

    const treeSeed = new Uint8Array(32);
    crypto.getRandomValues(treeSeed);
    const encResult = await custodian.encryptTreeSeed(treeSeed);
    const creationHash = new Uint8Array(64);
    crypto.getRandomValues(creationHash);

    // Sign with one key but present a different public key
    const realAdminPrivateKey = ecies.core.generatePrivateKey();
    const fakeAdminPublicKey = ecies.getPublicKey(
      ecies.core.generatePrivateKey(),
    );
    const signature = ecies.signMessage(realAdminPrivateKey, creationHash);

    await expect(
      custodian.requestKeyRelease(
        creationHash,
        encResult.encryptedTreeSeed,
        requesterPublicKey,
        [{ signerPublicKey: fakeAdminPublicKey, signature }],
      ),
    ).rejects.toThrow(CustodialKeyReleaseError);

    // Ledger should have NO entries
    expect(ledger.entries.length).toBe(0);
  });
});
