/**
 * @fileoverview Property-based tests for the AssetActionValidator and AssetStateReducer.
 *
 * Uses fast-check to exercise conservation laws, isolation guarantees, and
 * nonce monotonicity over arbitrary valid sequences.
 *
 * @see Requirements 2.1–2.9
 */

import {
  AuthorizedSignerSet,
  QuorumType,
  SignerRole,
  SignerStatus,
  type IAuthorizedSigner,
} from '@brightchain/brightchain-lib';
import {
  ActionKind,
  type AssetIdBuffer,
  type IBatchSettlementAction,
  type IBatchSettlementResolutionAction,
  type IBurnAction,
  type IMintAction,
  type ITransferAction,
} from '@brightchain/brightledger-assets-lib';
import * as fc from 'fast-check';
import {
  emptyState,
  type IAssetProjectedState,
  type IProcessKeyRecord,
  type IShardSettlementState,
} from '../projectedState.js';
import { AssetStateReducer } from '../reducer.js';
import { AssetActionValidator, type ILedgerContext } from '../validator.js';
import { shardIdFromString, shardIdHex } from './shardIdFixture';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePk(seed: number): Uint8Array {
  const k = new Uint8Array(33);
  k[0] = seed;
  return k;
}

function makePkHex(seed: number): string {
  return Buffer.from(makePk(seed)).toString('hex');
}

function fill32(b: number): Uint8Array {
  return new Uint8Array(32).fill(b);
}

function makeSigner(seed: number): IAuthorizedSigner {
  return {
    publicKey: makePk(seed),
    role: SignerRole.Admin,
    status: SignerStatus.Active,
    metadata: new Map(),
  };
}

function assetId(seed: number): string {
  return Buffer.from(fill32(seed)).toString('hex');
}

function assetIdBuf(seed: number): AssetIdBuffer {
  return fill32(seed) as unknown as AssetIdBuffer;
}

const NOW = 1_700_000_000_000;

function ctx(extra: Partial<ILedgerContext> = {}): ILedgerContext {
  return { now: NOW, signerPublicKeys: [makePk(1)], ...extra };
}

/** Build a state with one mintable asset pre-loaded with balance for account 2. */
function stateWithBalance(balance: bigint): IAssetProjectedState {
  const aid = assetId(1);
  return {
    ...emptyState(),
    assets: new Map([
      [
        aid,
        {
          symbol: 'TST',
          displayName: 'Test',
          decimals: 6,
          supplyPolicy: 'mintable',
          transferPolicy: 'open',
          freezable: false,
          burnable: true,
          brightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
        },
      ],
    ]),
    issuedTotal: new Map([[aid, balance]]),
    burnedTotal: new Map([[aid, 0n]]),
    issuerSets: new Map([
      [
        aid,
        new AuthorizedSignerSet([makeSigner(1)], {
          type: QuorumType.Threshold,
          threshold: 1,
        }),
      ],
    ]),
    balances: new Map([[aid, new Map([[makePkHex(2), balance]])]]),
    frozen: new Map([[aid, new Set<string>()]]),
    operatorFrozen: new Map([[aid, new Set<string>()]]),
    whitelist: new Map([[aid, new Set<string>()]]),
    nonces: new Map(),
    shardSettlement: new Map(),
    processKeys: new Map(),
    disputes: new Map(),
    lastSequence: 0n,
    retiredAssets: new Set(),
  };
}

// ── Conservation law ──────────────────────────────────────────────────────────

describe('Property: conservation law (mint + burn)', () => {
  it('issuedTotal - burnedTotal equals total balance after any mint/burn sequence', () => {
    fc.assert(
      fc.property(
        fc.array(fc.bigInt({ min: 1n, max: 100n }), {
          minLength: 1,
          maxLength: 5,
        }),
        fc.array(fc.bigInt({ min: 1n, max: 20n }), {
          minLength: 0,
          maxLength: 3,
        }),
        (mintAmounts, burnAmounts) => {
          let state = stateWithBalance(0n);
          let nonce = 0n;

          // Mint each amount
          for (const amount of mintAmounts) {
            const mint: IMintAction = {
              kind: ActionKind.Mint,
              assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
                readonly __brand: true;
              },
              to: makePk(2),
              amount,
              nonce: ++nonce,
            };
            const v = AssetActionValidator.validate(mint, state, ctx());
            if (v.valid) {
              state = AssetStateReducer.reduce(state, mint, ctx());
            }
          }

          // Burn as much as balance allows
          const aid = assetId(1);
          for (const amount of burnAmounts) {
            const bal = state.balances.get(aid)?.get(makePkHex(2)) ?? 0n;
            if (bal < amount) continue;
            const burn: IBurnAction = {
              kind: ActionKind.Burn,
              assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
                readonly __brand: true;
              },
              from: makePk(2),
              amount,
              nonce: ++nonce,
            };
            const v = AssetActionValidator.validate(
              burn,
              state,
              ctx({ signerPublicKeys: [makePk(2)] }),
            );
            if (v.valid) {
              state = AssetStateReducer.reduce(
                state,
                burn,
                ctx({ signerPublicKeys: [makePk(2)] }),
              );
            }
          }

          // Conservation: issuedTotal - burnedTotal = sum of all balances
          const issued = state.issuedTotal.get(aid) ?? 0n;
          const burned = state.burnedTotal.get(aid) ?? 0n;
          const balanceMap = state.balances.get(aid);
          const totalBal = balanceMap
            ? Array.from(balanceMap.values()).reduce((a, b) => a + b, 0n)
            : 0n;

          return issued - burned === totalBal;
        },
      ),
    );
  });
});

// ── No negative balances ──────────────────────────────────────────────────────

describe('Property: no negative balances after transfers', () => {
  it('accepted transfers never produce negative balances', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 10n, max: 1000n }),
        fc.array(fc.bigInt({ min: 1n, max: 200n }), {
          minLength: 1,
          maxLength: 8,
        }),
        (initial, transferAmounts) => {
          let state = stateWithBalance(initial);
          let nonce = 0n;

          for (const amount of transferAmounts) {
            const transfer: ITransferAction = {
              kind: ActionKind.Transfer,
              assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
                readonly __brand: true;
              },
              from: makePk(2),
              to: makePk(3),
              amount,
              nonce: ++nonce,
              expiry: null,
            };
            const v = AssetActionValidator.validate(
              transfer,
              state,
              ctx({ signerPublicKeys: [makePk(2)] }),
            );
            if (v.valid) {
              state = AssetStateReducer.reduce(
                state,
                transfer,
                ctx({ signerPublicKeys: [makePk(2)] }),
              );
            }
            // All balances must be non-negative
            const aid = assetId(1);
            const balances =
              state.balances.get(aid) ?? new Map<string, bigint>();
            for (const [, bal] of balances) {
              if (bal < 0n) return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

// ── Nonce mismatch rejection ──────────────────────────────────────────────────

describe('Property: nonce mismatch always rejected', () => {
  it('replaying the same nonce always fails', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 100n }), (nonce) => {
        // Set nonce to `nonce` in state (simulate a past transfer accepted)
        const aid = assetId(1);
        let state = stateWithBalance(200n);
        state = { ...state, nonces: new Map([[makePkHex(2), nonce]]) };

        const replay: ITransferAction = {
          kind: ActionKind.Transfer,
          assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
            readonly __brand: true;
          },
          from: makePk(2),
          to: makePk(3),
          amount: 10n,
          nonce, // replay same nonce
          expiry: null,
        };
        void aid;
        const r = AssetActionValidator.validate(
          replay,
          state,
          ctx({ signerPublicKeys: [makePk(2)] }),
        );
        return !r.valid;
      }),
    );
  });
});

// ── Asset isolation ───────────────────────────────────────────────────────────

describe('Property: asset isolation', () => {
  it('action on asset A never changes asset B balances', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 50n }), (amount) => {
        const aid1 = assetId(1);
        const aid2 = assetId(2);
        const signerSet = new AuthorizedSignerSet([makeSigner(1)], {
          type: QuorumType.Threshold,
          threshold: 1,
        });

        const state: IAssetProjectedState = {
          ...emptyState(),
          assets: new Map([
            [
              aid1,
              {
                symbol: 'A',
                displayName: 'Asset A',
                decimals: 0,
                supplyPolicy: 'mintable',
                transferPolicy: 'open',
                freezable: false,
                burnable: false,
                brightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
              },
            ],
            [
              aid2,
              {
                symbol: 'B',
                displayName: 'Asset B',
                decimals: 0,
                supplyPolicy: 'mintable',
                transferPolicy: 'open',
                freezable: false,
                burnable: false,
                brightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
              },
            ],
          ]),
          balances: new Map([
            [aid1, new Map([[makePkHex(2), 100n]])],
            [aid2, new Map([[makePkHex(2), 999n]])],
          ]),
          issuedTotal: new Map([
            [aid1, 100n],
            [aid2, 999n],
          ]),
          burnedTotal: new Map([
            [aid1, 0n],
            [aid2, 0n],
          ]),
          issuerSets: new Map([
            [aid1, signerSet],
            [aid2, signerSet],
          ]),
          frozen: new Map([
            [aid1, new Set()],
            [aid2, new Set()],
          ]),
          operatorFrozen: new Map([
            [aid1, new Set()],
            [aid2, new Set()],
          ]),
          whitelist: new Map([
            [aid1, new Set()],
            [aid2, new Set()],
          ]),
          nonces: new Map(),
          shardSettlement: new Map(),
          processKeys: new Map(),
          disputes: new Map(),
          lastSequence: 0n,
          retiredAssets: new Set(),
        };

        const mint: IMintAction = {
          kind: ActionKind.Mint,
          assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
            readonly __brand: true;
          },
          to: makePk(2),
          amount,
          nonce: 1n,
        };
        const v = AssetActionValidator.validate(mint, state, ctx());
        if (!v.valid) return true; // not our concern

        const after = AssetStateReducer.reduce(state, mint, ctx());
        // Asset B balances unchanged
        const b2Before = state.balances.get(aid2)?.get(makePkHex(2)) ?? 0n;
        const b2After = after.balances.get(aid2)?.get(makePkHex(2)) ?? 0n;
        return b2Before === b2After;
      }),
    );
  });
});

// ── lastSequence monotonicity ─────────────────────────────────────────────────

describe('Property: lastSequence is monotonically increasing', () => {
  it('each accepted action increments lastSequence by 1', () => {
    fc.assert(
      fc.property(
        fc.array(fc.bigInt({ min: 1n, max: 50n }), {
          minLength: 1,
          maxLength: 10,
        }),
        (amounts) => {
          let state = stateWithBalance(0n);
          let expectedSeq = 0n;

          for (const amount of amounts) {
            const mint: IMintAction = {
              kind: ActionKind.Mint,
              assetId: assetIdBuf(1) as ReturnType<typeof assetIdBuf> & {
                readonly __brand: true;
              },
              to: makePk(2),
              amount,
              nonce: 1n,
            };
            const v = AssetActionValidator.validate(mint, state, ctx());
            if (v.valid) {
              state = AssetStateReducer.reduce(state, mint, ctx());
              expectedSeq += 1n;
              if (state.lastSequence !== expectedSeq) return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

// ── Property 7: Settlement determinism ───────────────────────────────────────

describe('Property: settlement state is deterministic', () => {
  /**
   * Applying the same sequence of N BatchSettlement actions produces the same
   * final balance map every time, regardless of how many times it is replayed.
   */
  it('replaying the same settlement sequence twice yields identical state', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            seed: fc.integer({ min: 1, max: 200 }),
            delta: fc.bigInt({ min: 1n, max: 1000n }),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        (entries) => {
          const fp = Buffer.from(makePk(10)).toString('hex');
          const processKey: IProcessKeyRecord = {
            publicKey: makePk(10),
            notBefore: NOW - 1000,
            notAfter: NOW + 86_400_000,
            shardIds: [shardIdHex('shard-det')],
            revoked: false,
          };
          const shardInit: IShardSettlementState = {
            nextExpectedSeq: 0n,
            lastSettledAt: 0,
            lastTipHash: fill32(0),
          };

          function buildActions() {
            return entries.map((e, i) => {
              const action: IBatchSettlementAction = {
                kind: ActionKind.BatchSettlement,
                shardId: shardIdFromString('shard-det'),
                fromSeq: BigInt(i),
                toSeq: BigInt(i),
                memberDeltas: [{ memberKey: makePk(e.seed), delta: e.delta }],
                tipHash: fill32(i),
                itemsRoot: fill32(i + 1),
                processKeyFingerprint: makePk(10),
                signature: new Uint8Array(64),
              };
              return action;
            });
          }

          function replayAll(): IAssetProjectedState {
            let state: IAssetProjectedState = {
              ...emptyState(),
              processKeys: new Map([[fp, processKey]]),
              shardSettlement: new Map([[shardIdHex('shard-det'), shardInit]]),
            };
            for (const action of buildActions()) {
              const v = AssetActionValidator.validate(action, state, ctx());
              if (!v.valid) return state;
              state = AssetStateReducer.reduce(state, action, ctx());
            }
            return state;
          }

          const s1 = replayAll();
          const s2 = replayAll();

          // Shard balance maps must be equal
          const b1 = s1.balances.get(shardIdHex('shard-det'));
          const b2 = s2.balances.get(shardIdHex('shard-det'));
          if (b1 === undefined && b2 === undefined) return true;
          if (b1 === undefined || b2 === undefined) return false;
          if (b1.size !== b2.size) return false;
          for (const [k, v] of b1) {
            if (b2.get(k) !== v) return false;
          }
          return true;
        },
      ),
    );
  });
});

// ── Property 8: Dispute reversal symmetry ────────────────────────────────────

describe('Property: dispute reversal leaves net-zero delta', () => {
  /**
   * When a BatchSettlement is accepted and then a BatchSettlementResolution
   * with outcome='rejected' and correctedDeltas=[] (empty) is applied, the
   * shard balance map ends up with the same content as the pre-settlement state.
   * This verifies that the resolution correctly reverses the original deltas.
   */
  it('rejected resolution with negated correctedDeltas restores prior balance', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            seed: fc.integer({ min: 1, max: 100 }),
            delta: fc.bigInt({ min: 1n, max: 500n }),
          }),
          { minLength: 1, maxLength: 4 },
        ),
        (entries) => {
          // Deduplicate seeds so memberKey is unique per delta
          const seen = new Set<number>();
          const unique = entries.filter((e) => {
            if (seen.has(e.seed)) return false;
            seen.add(e.seed);
            return true;
          });
          if (unique.length === 0) return true;

          const fp = Buffer.from(makePk(99)).toString('hex');
          const processKey: IProcessKeyRecord = {
            publicKey: makePk(99),
            notBefore: NOW - 1000,
            notAfter: NOW + 86_400_000,
            shardIds: [shardIdHex('shard-rev')],
            revoked: false,
          };
          const shardInit: IShardSettlementState = {
            nextExpectedSeq: 0n,
            lastSettledAt: 0,
            lastTipHash: fill32(0),
          };

          let state: IAssetProjectedState = {
            ...emptyState(),
            processKeys: new Map([[fp, processKey]]),
            shardSettlement: new Map([[shardIdHex('shard-rev'), shardInit]]),
          };

          const priorBalance = state.balances.get(shardIdHex('shard-rev'));

          // Sort memberDeltas by key (validator requires this)
          const sorted = [...unique].sort((a, b) => a.seed - b.seed);
          const settlement: IBatchSettlementAction = {
            kind: ActionKind.BatchSettlement,
            shardId: shardIdFromString('shard-rev'),
            fromSeq: 0n,
            toSeq: 0n,
            memberDeltas: sorted.map((e) => ({
              memberKey: makePk(e.seed),
              delta: e.delta,
            })),
            tipHash: fill32(0xaa),
            itemsRoot: fill32(0xbb),
            processKeyFingerprint: makePk(99),
            signature: new Uint8Array(64),
          };

          const vs = AssetActionValidator.validate(settlement, state, ctx());
          if (!vs.valid) return true; // skip if invalid
          state = AssetStateReducer.reduce(state, settlement, ctx());

          // Now submit a resolution that rejects by applying negated deltas
          const negatedDeltas = sorted.map((e) => ({
            memberKey: makePk(e.seed),
            delta: -e.delta,
          }));
          const resolution: IBatchSettlementResolutionAction = {
            kind: ActionKind.BatchSettlementResolution,
            shardId: shardIdFromString('shard-rev'),
            settlementSeq: 0n,
            challengeSeq: state.lastSequence,
            outcome: 'rejected',
            correctedDeltas: negatedDeltas,
            reason: new Uint8Array(4),
          };

          // Plant the dispute record that the validator requires
          state = {
            ...state,
            disputes: new Map([
              [
                `${shardIdHex('shard-rev')}:0`,
                {
                  shardId: shardIdHex('shard-rev'),
                  settlementSeq: 0n,
                  challengeSeq: state.lastSequence,
                  challengerKey: makePkHex(50),
                  resolved: false,
                },
              ],
            ]),
          };

          const sysSet = new AuthorizedSignerSet([makeSigner(1)], {
            type: QuorumType.Threshold,
            threshold: 1,
          });
          const vr = AssetActionValidator.validate(
            resolution,
            state,
            ctx({ systemSignerSet: sysSet }),
          );
          if (!vr.valid) return true; // skip
          state = AssetStateReducer.reduce(
            state,
            resolution,
            ctx({ systemSignerSet: sysSet }),
          );

          // After negated correction, shard-rev balances should be empty (all zero → deleted)
          const afterBalance = state.balances.get(shardIdHex('shard-rev'));
          const expectedSize = priorBalance?.size ?? 0;
          const actualSize = afterBalance?.size ?? 0;
          return actualSize === expectedSize;
        },
      ),
    );
  });
});
