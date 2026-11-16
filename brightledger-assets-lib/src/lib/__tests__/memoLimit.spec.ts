/**
 * @fileoverview Memo size cap for the payload-level validators of
 * OperatorGrant and RateTableUpdate, plus the codec's no-decode-rejection
 * guarantee (existing ledger entries must keep decoding).
 */
import {
  BOOTSTRAP_RATE_TABLE,
  type IRateTable,
} from '@brightchain/brightchain-lib';
import { deriveAssetId } from '../assetId.js';
import { ActionKind } from '../payloads/actionKind.js';
import { MEMO_MAX_BYTES } from '../payloads/memoLimits.js';
import { validateOperatorGrant } from '../payloads/operatorGrantAction.js';
import { validateRateTableUpdate } from '../payloads/rateTableUpdateAction.js';
import type { ITransferAction } from '../payloads/transferAction.js';
import { AssetActionSerializer } from '../serializer.js';

const grant = {
  microJoules: 1n,
  reason: 'ok',
  quorumSignatures: [new Uint8Array(64)],
};

const futureTable: IRateTable = {
  ...BOOTSTRAP_RATE_TABLE,
  version: 2,
  effectiveAt: 2_000,
  signedBy: [],
};

describe('memo cap — payload validators', () => {
  it('MEMO_MAX_BYTES is 256', () => {
    expect(MEMO_MAX_BYTES).toBe(256);
  });

  it('validateOperatorGrant accepts a 256-byte memo and rejects 257', () => {
    expect(
      validateOperatorGrant({ ...grant, memo: new Uint8Array(256) }),
    ).toEqual([]);
    expect(
      validateOperatorGrant({ ...grant, memo: new Uint8Array(257) }),
    ).toEqual([{ code: 'MEMO_TOO_LONG', length: 257, max: 256 }]);
  });

  it('validateRateTableUpdate accepts a 256-byte memo and rejects 257', () => {
    expect(
      validateRateTableUpdate(futureTable, 1, 1_000, {
        memo: new Uint8Array(256),
      }),
    ).toEqual([]);
    expect(
      validateRateTableUpdate(futureTable, 1, 1_000, {
        memo: new Uint8Array(257),
      }),
    ).toEqual([{ code: 'MEMO_TOO_LONG', length: 257, max: 256 }]);
  });

  it('validateRateTableUpdate without a memo is unchanged', () => {
    expect(validateRateTableUpdate(futureTable, 1, 1_000, {})).toEqual([]);
  });
});

describe('memo cap — codec does not reject on decode', () => {
  it('round-trips a transfer with a 300-byte memo', () => {
    const action: ITransferAction = {
      kind: ActionKind.Transfer,
      assetId: deriveAssetId(new Uint8Array(33), new Uint8Array(32)),
      from: new Uint8Array(33).fill(1),
      to: new Uint8Array(33).fill(2),
      amount: 1n,
      nonce: 1n,
      expiry: null,
      memo: new Uint8Array(300).fill(0x61),
    };
    const decoded = AssetActionSerializer.deserialize(
      AssetActionSerializer.serialize(action),
    ) as ITransferAction;
    expect(decoded.memo?.length).toBe(300);
  });
});
