import fc from 'fast-check';
import { VaultLedgerEntryType } from '../enumerations/vault-ledger-entry-type';
import { LedgerWriteError } from '../errors';
import { LedgerGateway } from '../ledger/ledger-gateway';

// Mock Ledger and ILedgerSigner
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

function createMockSigner(): {
  publicKey: Uint8Array;
  sign(data: Uint8Array): Uint8Array;
} {
  return {
    publicKey: new Uint8Array(33).fill(0x02),
    sign: (_data: Uint8Array) => new Uint8Array(64).fill(0xab),
  };
}

describe('LedgerGateway', () => {
  // Feature: digital-burn-bag, Property 15: Ledger records all operations
  // Validates: Requirements 13.1, 13.2, 13.3, 13.5
  it('Property 15: every vault operation produces a ledger entry of the correct type', () => {
    fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 64, maxLength: 64 }),
        fc.uint8Array({ minLength: 33, maxLength: 33 }),
        async (merkleRoot, creatorPubKey) => {
          const ledger = createMockLedger();
          const signer = createMockSigner();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const gw = new LedgerGateway(ledger as any, signer as any);

          // Record creation
          const createHash = await gw.recordCreation(merkleRoot, creatorPubKey);
          expect(createHash).toBeInstanceOf(Uint8Array);
          expect(createHash.length).toBe(64);

          // Verify the payload starts with vault_created
          const createPayload = new TextDecoder().decode(
            ledger.entries[0].payload.subarray(
              0,
              VaultLedgerEntryType.vault_created.length,
            ),
          );
          expect(createPayload).toBe(VaultLedgerEntryType.vault_created);

          // Record read
          await gw.recordRead(createHash);
          const readPayload = new TextDecoder().decode(
            ledger.entries[1].payload.subarray(
              0,
              VaultLedgerEntryType.vault_read_requested.length,
            ),
          );
          expect(readPayload).toBe(VaultLedgerEntryType.vault_read_requested);

          // Record destruction
          await gw.recordDestruction(createHash);
          const destroyPayload = new TextDecoder().decode(
            ledger.entries[2].payload.subarray(
              0,
              VaultLedgerEntryType.vault_destroyed.length,
            ),
          );
          expect(destroyPayload).toBe(VaultLedgerEntryType.vault_destroyed);

          expect(ledger.entries.length).toBe(3);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: digital-burn-bag, Property 16: Vault refuses operation without ledger
  // Validates: Requirements 13.4
  it('Property 16: ledger append failure throws LedgerWriteError', async () => {
    const failingLedger = {
      length: 0,
      async append() {
        throw new Error('connection lost');
      },
      async getEntry() {
        throw new Error('not found');
      },
    };
    const signer = createMockSigner();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gw = new LedgerGateway(failingLedger as any, signer as any);

    await expect(
      gw.recordCreation(new Uint8Array(64), new Uint8Array(33)),
    ).rejects.toThrow(LedgerWriteError);

    await expect(gw.recordRead(new Uint8Array(64))).rejects.toThrow(
      LedgerWriteError,
    );

    await expect(gw.recordDestruction(new Uint8Array(64))).rejects.toThrow(
      LedgerWriteError,
    );
  });
});
