/**
 * @fileoverview Phase 6 tests — IAssetTransaction shape, EnergyTransaction alias,
 * IAssetTransactionMetadata backward-compat alias, and OperationCost bigint conversion.
 *
 * Req 6.1: IAssetTransaction has assetId: string and amount: bigint.
 * Req 6.2: EnergyTransaction narrows IAssetTransaction to assetId: 'joule'.
 * Req 6.3: IEnergyTransactionMetadata re-exported as alias for IAssetTransactionMetadata.
 * Req 6.4: assetId is part of the transaction payload (replay-prevention).
 * Req 1.7: OperationCost fields are bigint microunits.
 */

import { OperationType } from '../../enumerations/operationType';
import { OperationCost } from '../../operationCost';
import { Checksum } from '../../types/checksum';
import {
  EnergyTransaction,
  IAssetTransaction,
  IAssetTransactionMetadata,
  IEnergyTransactionMetadata,
} from '../energyTransaction';

// ── Helpers ──────────────────────────────────────────────────────────────────

const HEX_A = 'a'.repeat(128);
const HEX_B = 'b'.repeat(128);
const checksumA = (): Checksum => Checksum.fromHex(HEX_A);
const checksumB = (): Checksum => Checksum.fromHex(HEX_B);

/** Build a minimal IAssetTransaction for a given assetId and amount. */
function makeAssetTx(assetId: string, amount: bigint): IAssetTransaction {
  const meta: IAssetTransactionMetadata = { dataSize: 1024, redundancy: 3 };
  return {
    id: checksumA(),
    timestamp: new Date(0),
    source: checksumA(),
    destination: checksumB(),
    assetId,
    amount,
    operationType: OperationType.BLOCK_STORE,
    metadata: meta,
    signature: new Uint8Array(64),
  };
}

// ── IAssetTransactionMetadata ─────────────────────────────────────────────────

describe('IAssetTransactionMetadata', () => {
  it('accepts optional numeric fields', () => {
    const m: IAssetTransactionMetadata = {
      dataSize: 512,
      duration: 30,
      redundancy: 3,
      proofOfWork: 8,
    };
    expect(m.dataSize).toBe(512);
    expect(m.duration).toBe(30);
    expect(m.redundancy).toBe(3);
    expect(m.proofOfWork).toBe(8);
  });

  it('allows all fields to be omitted', () => {
    const m: IAssetTransactionMetadata = {};
    expect(m.dataSize).toBeUndefined();
  });
});

// ── IEnergyTransactionMetadata backward-compat alias (req 6.3) ───────────────

describe('IEnergyTransactionMetadata alias', () => {
  it('is structurally identical to IAssetTransactionMetadata', () => {
    // A value typed as one is assignable to the other at compile time.
    const asm: IAssetTransactionMetadata = { dataSize: 100 };
    const etm: IEnergyTransactionMetadata = asm; // assignment must compile
    expect(etm.dataSize).toBe(100);
  });
});

// ── IAssetTransaction (req 6.1, 6.4) ─────────────────────────────────────────

describe('IAssetTransaction', () => {
  it('carries assetId as part of the record (replay-prevention payload)', () => {
    const tx = makeAssetTx('joule', 500_000n);
    expect(tx.assetId).toBe('joule');
  });

  it('amount is bigint microunits', () => {
    const tx = makeAssetTx('postage', 1_000_000n);
    expect(typeof tx.amount).toBe('bigint');
    expect(tx.amount).toBe(1_000_000n);
  });

  it('different assetIds on the same payload are distinguishable', () => {
    const joule = makeAssetTx('joule', 100n);
    const postage = makeAssetTx('postage', 100n);
    expect(joule.assetId).not.toBe(postage.assetId);
  });

  it('blockId is optional', () => {
    const tx = makeAssetTx('joule', 0n);
    expect(tx.blockId).toBeUndefined();
  });
});

// ── EnergyTransaction alias (req 6.2) ─────────────────────────────────────────

describe('EnergyTransaction alias', () => {
  it('is a narrowing of IAssetTransaction to assetId: "joule"', () => {
    const tx: EnergyTransaction = {
      id: checksumA(),
      timestamp: new Date(0),
      source: checksumA(),
      destination: checksumB(),
      assetId: 'joule',
      amount: 250_000n,
      operationType: OperationType.BLOCK_RETRIEVE,
      metadata: {},
      signature: new Uint8Array(64),
    };
    // assetId must be 'joule' to satisfy the narrowed type
    expect(tx.assetId).toBe('joule');
    expect(tx.amount).toBe(250_000n);
  });

  it('is assignable to IAssetTransaction (widening)', () => {
    const et: EnergyTransaction = {
      id: checksumA(),
      timestamp: new Date(0),
      source: checksumA(),
      destination: checksumB(),
      assetId: 'joule',
      amount: 1n,
      operationType: OperationType.BLOCK_STORE,
      metadata: {},
      signature: new Uint8Array(0),
    };
    const iat: IAssetTransaction = et; // must compile
    expect(iat.assetId).toBe('joule');
  });
});

// ── OperationCost bigint fields (req 1.7) ─────────────────────────────────────

describe('OperationCost', () => {
  describe('constructor', () => {
    it('stores bigint fields', () => {
      const c = new OperationCost(100n, 200n, 300n, 50n);
      expect(c.computation).toBe(100n);
      expect(c.storage).toBe(200n);
      expect(c.network).toBe(300n);
      expect(c.proofOfWork).toBe(50n);
    });

    it('defaults proofOfWork to 0n', () => {
      const c = new OperationCost(1n, 2n, 3n);
      expect(c.proofOfWork).toBe(0n);
    });
  });

  describe('totalMicrojoules', () => {
    it('sums all four fields', () => {
      const c = new OperationCost(100n, 200n, 300n, 50n);
      expect(c.totalMicrojoules).toBe(650n);
    });

    it('is 0n for zero cost', () => {
      expect(OperationCost.zero().totalMicrojoules).toBe(0n);
    });
  });

  describe('totalJoules (deprecated alias)', () => {
    it('returns the same value as totalMicrojoules', () => {
      const c = new OperationCost(1_000n, 2_000n, 3_000n, 500n);

      expect(c.totalJoules).toBe(c.totalMicrojoules);
    });

    it('returns bigint (not number)', () => {
      const c = new OperationCost(1n, 1n, 1n);

      expect(typeof c.totalJoules).toBe('bigint');
    });
  });

  describe('zero()', () => {
    it('all fields are 0n', () => {
      const z = OperationCost.zero();
      expect(z.computation).toBe(0n);
      expect(z.storage).toBe(0n);
      expect(z.network).toBe(0n);
      expect(z.proofOfWork).toBe(0n);
      expect(z.totalMicrojoules).toBe(0n);
    });
  });

  describe('add()', () => {
    it('sums corresponding fields', () => {
      const a = new OperationCost(10n, 20n, 30n, 5n);
      const b = new OperationCost(1n, 2n, 3n, 1n);
      const sum = a.add(b);
      expect(sum.computation).toBe(11n);
      expect(sum.storage).toBe(22n);
      expect(sum.network).toBe(33n);
      expect(sum.proofOfWork).toBe(6n);
      expect(sum.totalMicrojoules).toBe(72n);
    });

    it('adding zero leaves value unchanged', () => {
      const c = new OperationCost(100n, 200n, 300n, 0n);
      expect(c.add(OperationCost.zero()).totalMicrojoules).toBe(
        c.totalMicrojoules,
      );
    });

    it('is commutative', () => {
      const a = new OperationCost(1n, 2n, 3n, 4n);
      const b = new OperationCost(5n, 6n, 7n, 8n);
      expect(a.add(b).totalMicrojoules).toBe(b.add(a).totalMicrojoules);
    });
  });
});
