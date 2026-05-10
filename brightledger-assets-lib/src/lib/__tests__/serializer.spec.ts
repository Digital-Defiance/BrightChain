/**
 * @fileoverview Roundtrip + property tests for AssetActionSerializer.
 *
 * Tests:
 *  - serialize → deserialize roundtrip for all 18 action kinds
 *  - Version-byte rejection (version 0x00 and 0x02 throw)
 *  - Magic-byte rejection
 *  - Buffer-too-short rejection
 *  - peekVersion / peekKind helpers
 *  - fast-check property: roundtrip(action) deep-equals action for every kind
 */

import {
  QuorumType,
  SignerRole,
  SignerStatus,
} from '@brightchain/brightchain-lib';
import type { GuidV7Uint8Array } from '@digitaldefiance/ecies-lib';
import * as fc from 'fast-check';
import { deriveAssetId } from '../assetId.js';
import { AssetErrorCode, MalformedActionError } from '../errors.js';
import { ACTION_KIND_CODE, ActionKind } from '../payloads/actionKind.js';
import type {
  IAssetAction,
  IAttestationAction,
  IBatchChallengeAction,
  IBatchSettlementAction,
  IBatchSettlementResolutionAction,
  IBurnAction,
  IFreezeAccountAction,
  IIssueAssetAction,
  IMintAction,
  IMultiTransferAction,
  IOperatorFreezeAction,
  IProcessKeyCertAction,
  IProcessKeyRevokeAction,
  IRetireAssetAction,
  IRotateIssuerSetAction,
  ITransferAction,
  IUnfreezeAccountAction,
  IWhitelistAddAction,
  IWhitelistRemoveAction,
} from '../payloads/index.js';
import { AssetActionSerializer } from '../serializer.js';

// ─── shared fixtures ──────────────────────────────────────────────────────────

const PUB_KEY = new Uint8Array(33).fill(0x01);
const ACCOUNT = new Uint8Array(32).fill(0x02);
const TO = new Uint8Array(32).fill(0x03);
const ENTRY_HASH = new Uint8Array(32).fill(0x04);
const SIG = new Uint8Array(64).fill(0x05);
const CLAIM_HASH = new Uint8Array(32).fill(0x06);
const TIP_HASH = new Uint8Array(32).fill(0x07);
const ITEMS_ROOT = new Uint8Array(32).fill(0x08);
const REASON = new Uint8Array(10).fill(0x09);
const ASSET_ID = deriveAssetId(PUB_KEY, ENTRY_HASH);
const SIGNER = {
  publicKey: PUB_KEY,
  role: SignerRole.Admin,
  status: SignerStatus.Active,
  metadata: new Map<string, string>(),
};
const POLICY = { type: QuorumType.Majority };
const PROCESS_KEY_FP = new Uint8Array(32).fill(0x0a);
const SHARD_ID = (() => {
  const b = new Uint8Array(16).fill(0x0b);
  // RFC 9562 UUIDv7: version nibble (byte 6) = 0x7, variant bits (byte 8) = 0b10
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  return b as unknown as GuidV7Uint8Array;
})();

// ─── action factories ─────────────────────────────────────────────────────────

const ISSUE_ASSET: IIssueAssetAction = {
  kind: ActionKind.IssueAsset,
  symbol: 'TEST',
  displayName: 'Test Asset',
  decimals: 6,
  supplyPolicy: 'fixed',
  transferPolicy: 'open',
  freezable: true,
  burnable: false,
  initialIssuerSet: [SIGNER],
  initialBrightTrustPolicy: POLICY,
};

const MINT: IMintAction = {
  kind: ActionKind.Mint,
  assetId: ASSET_ID,
  to: TO,
  amount: 1_000_000n,
  nonce: 1n,
};

const BURN: IBurnAction = {
  kind: ActionKind.Burn,
  assetId: ASSET_ID,
  from: ACCOUNT,
  amount: 500_000n,
  nonce: 2n,
  memo: new Uint8Array([0xde, 0xad]),
};

const TRANSFER: ITransferAction = {
  kind: ActionKind.Transfer,
  assetId: ASSET_ID,
  from: ACCOUNT,
  to: TO,
  amount: 200_000n,
  nonce: 3n,
  expiry: 9999999999,
};

const MULTI_TRANSFER: IMultiTransferAction = {
  kind: ActionKind.MultiTransfer,
  legs: [TRANSFER],
  signature: SIG,
};

const FREEZE: IFreezeAccountAction = {
  kind: ActionKind.FreezeAccount,
  assetId: ASSET_ID,
  account: ACCOUNT,
  reason: REASON,
};

const UNFREEZE: IUnfreezeAccountAction = {
  kind: ActionKind.UnfreezeAccount,
  assetId: ASSET_ID,
  account: ACCOUNT,
  reason: REASON,
};

const WHITELIST_ADD: IWhitelistAddAction = {
  kind: ActionKind.WhitelistAdd,
  assetId: ASSET_ID,
  account: ACCOUNT,
};

const WHITELIST_REMOVE: IWhitelistRemoveAction = {
  kind: ActionKind.WhitelistRemove,
  assetId: ASSET_ID,
  account: ACCOUNT,
};

const ROTATE_ISSUER_SET: IRotateIssuerSetAction = {
  kind: ActionKind.RotateIssuerSet,
  assetId: ASSET_ID,
  newIssuerSet: [SIGNER],
  newBrightTrustPolicy: POLICY,
  effectiveAtSeq: 100n,
};

const RETIRE_ASSET: IRetireAssetAction = {
  kind: ActionKind.RetireAsset,
  assetId: ASSET_ID,
  reason: REASON,
};

const ATTESTATION: IAttestationAction = {
  kind: ActionKind.Attestation,
  assetId: ASSET_ID,
  subject: ACCOUNT,
  claimHash: CLAIM_HASH,
  expiresAt: null,
};

const OPERATOR_FREEZE: IOperatorFreezeAction = {
  kind: ActionKind.OperatorFreeze,
  account: ACCOUNT,
  frozen: true,
  reason: REASON,
};

const BATCH_SETTLEMENT: IBatchSettlementAction = {
  kind: ActionKind.BatchSettlement,
  shardId: SHARD_ID,
  fromSeq: 0n,
  toSeq: 99n,
  memberDeltas: [{ memberKey: ACCOUNT, delta: 42n }],
  tipHash: TIP_HASH,
  itemsRoot: ITEMS_ROOT,
  processKeyFingerprint: PROCESS_KEY_FP,
  signature: SIG,
};

const PROCESS_KEY_CERT: IProcessKeyCertAction = {
  kind: ActionKind.ProcessKeyCert,
  processPublicKey: PUB_KEY,
  notBefore: 1_700_000_000_000,
  notAfter: 1_700_000_000_000 + 3 * 24 * 60 * 60 * 1000,
  shardIds: ['shard-01', 'shard-02'],
};

const PROCESS_KEY_REVOKE: IProcessKeyRevokeAction = {
  kind: ActionKind.ProcessKeyRevoke,
  processKeyFingerprint: PROCESS_KEY_FP,
  reason: 'rotation',
};

const BATCH_CHALLENGE: IBatchChallengeAction = {
  kind: ActionKind.BatchChallenge,
  shardId: SHARD_ID,
  settlementSeq: 50n,
  claimedTipHash: TIP_HASH,
  challengerKey: PUB_KEY,
  signature: SIG,
};

const BATCH_SETTLEMENT_RESOLUTION: IBatchSettlementResolutionAction = {
  kind: ActionKind.BatchSettlementResolution,
  shardId: SHARD_ID,
  settlementSeq: 50n,
  challengeSeq: 51n,
  outcome: 'rejected',
  correctedDeltas: [{ memberKey: ACCOUNT, delta: 30n }],
  reason: REASON,
};

// ─── all fixtures ─────────────────────────────────────────────────────────────

const ALL_ACTIONS: IAssetAction[] = [
  ISSUE_ASSET,
  MINT,
  BURN,
  TRANSFER,
  MULTI_TRANSFER,
  FREEZE,
  UNFREEZE,
  WHITELIST_ADD,
  WHITELIST_REMOVE,
  ROTATE_ISSUER_SET,
  RETIRE_ASSET,
  ATTESTATION,
  OPERATOR_FREEZE,
  BATCH_SETTLEMENT,
  PROCESS_KEY_CERT,
  PROCESS_KEY_REVOKE,
  BATCH_CHALLENGE,
  BATCH_SETTLEMENT_RESOLUTION,
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function hasMalformedActionError(err: unknown, code: AssetErrorCode): boolean {
  return err instanceof MalformedActionError && err.code === code;
}

function catchError(fn: () => unknown): unknown {
  try {
    fn();
    return undefined;
  } catch (e) {
    return e;
  }
}

// ─── roundtrip tests ──────────────────────────────────────────────────────────

describe('AssetActionSerializer – roundtrip', () => {
  test.each(ALL_ACTIONS.map((a) => [a.kind, a]))(
    'kind %s serializes and deserializes',
    (_kind, action) => {
      const bytes = AssetActionSerializer.serialize(action as IAssetAction);
      const decoded = AssetActionSerializer.deserialize(bytes);
      expect(decoded).toEqual(action);
    },
  );
});

// ─── header inspection helpers ────────────────────────────────────────────────

describe('AssetActionSerializer.peekVersion', () => {
  it('returns VERSION for a valid buffer', () => {
    const bytes = AssetActionSerializer.serialize(MINT);
    expect(AssetActionSerializer.peekVersion(bytes)).toBe(
      AssetActionSerializer.CURRENT_VERSION,
    );
  });

  it('throws BufferTooShort for a 3-byte buffer', () => {
    expect(() => AssetActionSerializer.peekVersion(new Uint8Array(3))).toThrow(
      MalformedActionError,
    );
  });
});

describe('AssetActionSerializer.peekKind', () => {
  it('returns the correct kind without full decode', () => {
    const bytes = AssetActionSerializer.serialize(BURN);
    expect(AssetActionSerializer.peekKind(bytes)).toBe(ActionKind.Burn);
  });

  it('throws UnknownActionKind for an invalid kind byte', () => {
    const bytes = AssetActionSerializer.serialize(MINT);
    const corrupted = new Uint8Array(bytes);
    corrupted[5] = 0xff; // kind byte
    expect(() => AssetActionSerializer.peekKind(corrupted)).toThrow(
      MalformedActionError,
    );
  });
});

// ─── error cases ──────────────────────────────────────────────────────────────

describe('AssetActionSerializer.deserialize – error handling', () => {
  it('throws BufferTooShort for an empty buffer', () => {
    expect(() => AssetActionSerializer.deserialize(new Uint8Array(0))).toThrow(
      expect.objectContaining({ code: AssetErrorCode.BufferTooShort }),
    );
  });

  it('throws BadMagic when magic bytes are wrong', () => {
    const bytes = AssetActionSerializer.serialize(MINT);
    const corrupted = new Uint8Array(bytes);
    corrupted[0] = 0x00;
    expect(
      hasMalformedActionError(
        catchError(() => AssetActionSerializer.deserialize(corrupted)),
        AssetErrorCode.BadMagic,
      ),
    ).toBe(true);
  });

  it('throws UnsupportedVersion for version 0x00', () => {
    const bytes = AssetActionSerializer.serialize(MINT);
    const corrupted = new Uint8Array(bytes);
    corrupted[4] = 0x00; // version byte
    expect(
      hasMalformedActionError(
        catchError(() => AssetActionSerializer.deserialize(corrupted)),
        AssetErrorCode.UnsupportedVersion,
      ),
    ).toBe(true);
  });

  it('throws UnsupportedVersion for version 0x02', () => {
    const bytes = AssetActionSerializer.serialize(MINT);
    const corrupted = new Uint8Array(bytes);
    corrupted[4] = 0x02;
    expect(
      hasMalformedActionError(
        catchError(() => AssetActionSerializer.deserialize(corrupted)),
        AssetErrorCode.UnsupportedVersion,
      ),
    ).toBe(true);
  });

  it('throws UnknownActionKind for an unknown kind byte', () => {
    const bytes = AssetActionSerializer.serialize(MINT);
    const corrupted = new Uint8Array(bytes);
    corrupted[5] = 0xfe; // unknown kind
    expect(
      hasMalformedActionError(
        catchError(() => AssetActionSerializer.deserialize(corrupted)),
        AssetErrorCode.UnknownActionKind,
      ),
    ).toBe(true);
  });

  it('throws CborDecodeFailed for a truncated payload', () => {
    const bytes = AssetActionSerializer.serialize(MINT);
    // Keep header but truncate CBOR to 2 bytes (should fail)
    const header = bytes.subarray(0, 10);
    const fake = new Uint8Array(12);
    fake.set(header, 0);
    const view = new DataView(fake.buffer);
    view.setUint32(6, 2, false); // length = 2
    fake[10] = 0xff;
    fake[11] = 0xff;
    expect(
      hasMalformedActionError(
        catchError(() => AssetActionSerializer.deserialize(fake)),
        AssetErrorCode.CborDecodeFailed,
      ),
    ).toBe(true);
  });
});

// ─── deriveAssetId ────────────────────────────────────────────────────────────

describe('deriveAssetId', () => {
  it('returns a 32-byte Uint8Array', () => {
    const id = deriveAssetId(PUB_KEY, ENTRY_HASH);
    expect(id).toBeInstanceOf(Uint8Array);
    expect(id.length).toBe(32);
  });

  it('is deterministic', () => {
    const a = deriveAssetId(PUB_KEY, ENTRY_HASH);
    const b = deriveAssetId(PUB_KEY, ENTRY_HASH);
    expect(a).toEqual(b);
  });

  it('differs when inputs differ', () => {
    const a = deriveAssetId(PUB_KEY, ENTRY_HASH);
    const b = deriveAssetId(new Uint8Array(33).fill(0x99), ENTRY_HASH);
    expect(a).not.toEqual(b);
  });
});

// ─── ACTION_KIND_CODE coverage ────────────────────────────────────────────────

describe('ACTION_KIND_CODE covers all ActionKind values', () => {
  it('has a code for each ActionKind variant', () => {
    const kinds = Object.values(ActionKind);
    for (const kind of kinds) {
      expect(ACTION_KIND_CODE[kind]).toBeDefined();
    }
  });

  it('has no duplicate code values', () => {
    const codes = Object.values(ACTION_KIND_CODE);
    const unique = new Set(codes);
    expect(codes.length).toBe(unique.size);
  });
});

// ─── fast-check property tests ────────────────────────────────────────────────

describe('AssetActionSerializer – property-based roundtrip', () => {
  it('roundtrip preserves kind for every static fixture (fc.constantFrom)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_ACTIONS), (action) => {
        const bytes = AssetActionSerializer.serialize(action);
        const decoded = AssetActionSerializer.deserialize(bytes);
        return decoded.kind === action.kind;
      }),
    );
  });

  it('serialize output always starts with ACTL magic', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_ACTIONS), (action) => {
        const bytes = AssetActionSerializer.serialize(action);
        const magic =
          (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
        return magic === 0x4143544c;
      }),
    );
  });

  it('any single-byte corruption of the magic field causes BadMagic or BufferTooShort', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ACTIONS),
        fc.integer({ min: 0, max: 3 }),
        fc.integer({ min: 0, max: 255 }),
        (action, byteIndex, replacement) => {
          const bytes = AssetActionSerializer.serialize(action);
          const original = bytes[byteIndex];
          if (replacement === original) return true; // no corruption; skip
          const corrupted = new Uint8Array(bytes);
          corrupted[byteIndex] = replacement;
          try {
            AssetActionSerializer.deserialize(corrupted);
            return false; // should never succeed with corrupted magic
          } catch (err) {
            return (
              hasMalformedActionError(err, AssetErrorCode.BadMagic) ||
              hasMalformedActionError(err, AssetErrorCode.BufferTooShort)
            );
          }
        },
      ),
    );
  });
});
