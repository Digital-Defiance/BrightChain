/**
 * Property-based tests for governance-integrated Ledger.
 * Properties 11–15, 17, 18 from the design document.
 */
import * as fc from 'fast-check';
import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { LedgerError, LedgerErrorType } from '../../errors/ledgerError';
import {
  GovernanceActionType,
  IGovernanceAction,
} from '../../interfaces/ledger/governanceAction';
import { ILedgerSigner } from '../../interfaces/ledger/ledgerSigner';
import { QuorumType } from '../../interfaces/ledger/quorumPolicy';
import { SignerRole } from '../../interfaces/ledger/signerRole';
import { SignerStatus } from '../../interfaces/ledger/signerStatus';
import { ChecksumService } from '../../services/checksum.service';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { GovernancePayloadSerializer } from '../governancePayloadSerializer';
import { Ledger } from '../ledger';
import { LedgerEntrySerializer } from '../ledgerEntrySerializer';

// ── Helpers ─────────────────────────────────────────────────────────

function makeSigner(seed: number): ILedgerSigner {
  const pk = new Uint8Array(33);
  pk[0] = 0x02;
  pk[1] = seed;
  return {
    publicKey: pk,
    sign: (_data: Uint8Array) =>
      new Uint8Array(64).fill(seed) as SignatureUint8Array,
  };
}

async function createLedger(
  adminSeeds: number[],
  writerSeeds: number[] = [],
  readerSeeds: number[] = [],
  quorumThreshold = 1,
) {
  const store = new MemoryBlockStore(BlockSize.Small);
  const serializer = new LedgerEntrySerializer(new ChecksumService());
  const govSerializer = new GovernancePayloadSerializer();

  const signers = [
    ...adminSeeds.map((s) => ({
      publicKey: makeSigner(s).publicKey,
      role: SignerRole.Admin as const,
      status: SignerStatus.Active as const,
      metadata: new Map<string, string>(),
    })),
    ...writerSeeds.map((s) => ({
      publicKey: makeSigner(s).publicKey,
      role: SignerRole.Writer as const,
      status: SignerStatus.Active as const,
      metadata: new Map<string, string>(),
    })),
    ...readerSeeds.map((s) => ({
      publicKey: makeSigner(s).publicKey,
      role: SignerRole.Reader as const,
      status: SignerStatus.Active as const,
      metadata: new Map<string, string>(),
    })),
  ];

  const genesisPayload = govSerializer.serializeGenesis({
    quorumPolicy: { type: QuorumType.Threshold, threshold: quorumThreshold },
    signers,
  });

  const ledger = new Ledger(
    store,
    BlockSize.Small,
    serializer,
    'pbt-ledger',
    govSerializer,
  );
  const primaryAdmin = makeSigner(adminSeeds[0]);
  await ledger.append(genesisPayload, primaryAdmin);

  return { store, serializer, govSerializer, ledger, primaryAdmin };
}

// ── Arbitraries ─────────────────────────────────────────────────────

/** Arbitrary seed in range [1, 200] for unique signers. */
const arbSeed = fc.integer({ min: 1, max: 200 });

/** Arbitrary role. */
const arbRole = fc.constantFrom(
  SignerRole.Admin,
  SignerRole.Writer,
  SignerRole.Reader,
);

/** Arbitrary non-admin role. */
const arbNonAdminRole = fc.constantFrom(SignerRole.Writer, SignerRole.Reader);

/** Arbitrary payload bytes. */
const arbPayload = fc.uint8Array({ minLength: 1, maxLength: 64 });

describe('Governance Property-Based Tests', () => {
  // Feature: block-chain-ledger, Property 11: Authorization Enforcement
  it('Property 11: unauthorized/reader/suspended/retired signers cannot append; active admin/writer can', async () => {
    await fc.assert(
      fc.asyncProperty(arbSeed, arbPayload, async (writerSeed, payload) => {
        // Use seeds that won't collide: admin=1, writer=writerSeed+10
        const ws = (writerSeed % 180) + 10;
        const { ledger, primaryAdmin } = await createLedger([1], [ws]);

        // Active writer can append
        const writer = makeSigner(ws);
        await ledger.append(payload, writer);

        // Active admin can append
        await ledger.append(payload, primaryAdmin);

        // Unknown signer cannot append
        const unknown = makeSigner(250);
        await expect(ledger.append(payload, unknown)).rejects.toThrow(
          LedgerError,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('Property 11b: reader/suspended signers cannot append', async () => {
    await fc.assert(
      fc.asyncProperty(arbPayload, async (payload) => {
        const { ledger, primaryAdmin } = await createLedger(
          [1],
          [],
          [50], // reader seed=50
        );

        // Reader cannot append
        const reader = makeSigner(50);
        await expect(ledger.append(payload, reader)).rejects.toThrow(
          LedgerError,
        );

        // Add a writer, then suspend them
        const writerSigner = makeSigner(60);
        await ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.AddSigner,
              publicKey: writerSigner.publicKey,
              role: SignerRole.Writer,
            },
          ],
          primaryAdmin,
        );
        await ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.SuspendSigner,
              publicKey: writerSigner.publicKey,
            },
          ],
          primaryAdmin,
        );

        // Suspended writer cannot append
        await expect(ledger.append(payload, writerSigner)).rejects.toThrow(
          LedgerError,
        );
      }),
      { numRuns: 100 },
    );
  });

  // Feature: block-chain-ledger, Property 12: Governance Actions Modify Signer Set
  it('Property 12: governance actions correctly modify the signer set', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSeed,
        arbRole,
        async (seed, role) => {
          const newSeed = (seed % 180) + 10;
          const { ledger, primaryAdmin } = await createLedger([1]);

          // Add signer
          await ledger.appendGovernance(
            [
              {
                type: GovernanceActionType.AddSigner,
                publicKey: makeSigner(newSeed).publicKey,
                role,
              },
            ],
            primaryAdmin,
          );
          const info = ledger.getSignerInfo(makeSigner(newSeed).publicKey);
          expect(info).toBeDefined();
          expect(info!.role).toBe(role);
          expect(info!.status).toBe(SignerStatus.Active);

          // If admin or writer, can append; if reader, cannot
          if (role === SignerRole.Admin || role === SignerRole.Writer) {
            await ledger.append(
              new Uint8Array([0x01]),
              makeSigner(newSeed),
            );
          } else {
            await expect(
              ledger.append(new Uint8Array([0x01]), makeSigner(newSeed)),
            ).rejects.toThrow(LedgerError);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: block-chain-ledger, Property 13: Governance Requires Admin Role
  it('Property 13: appendGovernance with non-admin signer throws UnauthorizedGovernance', async () => {
    await fc.assert(
      fc.asyncProperty(arbNonAdminRole, async (role) => {
        const { ledger, primaryAdmin } = await createLedger([1]);

        // Add a non-admin signer
        const nonAdmin = makeSigner(30);
        await ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.AddSigner,
              publicKey: nonAdmin.publicKey,
              role,
            },
          ],
          primaryAdmin,
        );

        // Non-admin cannot do governance
        try {
          await ledger.appendGovernance(
            [
              {
                type: GovernanceActionType.AddSigner,
                publicKey: makeSigner(40).publicKey,
                role: SignerRole.Reader,
              },
            ],
            nonAdmin,
          );
          fail('Expected LedgerError');
        } catch (e) {
          expect(e).toBeInstanceOf(LedgerError);
          expect((e as LedgerError).errorType).toBe(
            LedgerErrorType.UnauthorizedGovernance,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: block-chain-ledger, Property 14: Quorum Enforcement
  it('Property 14: governance with fewer than required signatures is rejected; with enough succeeds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 4 }),
        async (adminCount) => {
          const adminSeeds = Array.from(
            { length: adminCount },
            (_, i) => i + 1,
          );
          const { ledger, govSerializer } = await createLedger(
            adminSeeds,
            [],
            [],
            adminCount, // threshold = all admins
          );

          const primaryAdmin = makeSigner(1);
          const actions: IGovernanceAction[] = [
            {
              type: GovernanceActionType.AddSigner,
              publicKey: makeSigner(100).publicKey,
              role: SignerRole.Reader,
            },
          ];

          // With only primary signer (1 of adminCount), should fail
          if (adminCount > 1) {
            try {
              await ledger.appendGovernance(actions, primaryAdmin);
              fail('Expected QuorumNotMet');
            } catch (e) {
              expect((e as LedgerError).errorType).toBe(
                LedgerErrorType.QuorumNotMet,
              );
            }
          }

          // With all admins, should succeed
          const actionsForSigning =
            govSerializer.serializeActionsForSigning(actions);
          const cosigners = adminSeeds.slice(1).map((s) => ({
            signer: makeSigner(s),
            signature: makeSigner(s).sign(
              actionsForSigning,
            ) as SignatureUint8Array,
          }));

          await ledger.appendGovernance(actions, primaryAdmin, cosigners);
          expect(ledger.getSignerInfo(makeSigner(100).publicKey)).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: block-chain-ledger, Property 15: Safety Constraints
  it('Property 15: actions that would leave zero active admins or drop below quorum are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        async (extraAdmins) => {
          const adminSeeds = Array.from(
            { length: extraAdmins + 1 },
            (_, i) => i + 1,
          );
          const { ledger } = await createLedger(adminSeeds, [], [], 1);
          const primaryAdmin = makeSigner(1);

          // Remove all admins except one — should succeed
          for (let i = 1; i < adminSeeds.length; i++) {
            await ledger.appendGovernance(
              [
                {
                  type: GovernanceActionType.RemoveSigner,
                  publicKey: makeSigner(adminSeeds[i]).publicKey,
                },
              ],
              primaryAdmin,
            );
          }

          // Removing the last admin should fail
          try {
            await ledger.appendGovernance(
              [
                {
                  type: GovernanceActionType.RemoveSigner,
                  publicKey: primaryAdmin.publicKey,
                },
              ],
              primaryAdmin,
            );
            fail('Expected GovernanceSafetyViolation');
          } catch (e) {
            expect((e as LedgerError).errorType).toBe(
              LedgerErrorType.GovernanceSafetyViolation,
            );
          }

          // Suspending the last admin should also fail
          try {
            await ledger.appendGovernance(
              [
                {
                  type: GovernanceActionType.SuspendSigner,
                  publicKey: primaryAdmin.publicKey,
                },
              ],
              primaryAdmin,
            );
            fail('Expected GovernanceSafetyViolation');
          } catch (e) {
            expect((e as LedgerError).errorType).toBe(
              LedgerErrorType.GovernanceSafetyViolation,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: block-chain-ledger, Property 17: Member Metadata Persistence
  it('Property 17: metadata set via governance is retrievable and survives load()', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (key, value) => {
          const { store, serializer, govSerializer, ledger, primaryAdmin } =
            await createLedger([1]);

          // Set metadata
          await ledger.appendGovernance(
            [
              {
                type: GovernanceActionType.SetMemberData,
                publicKey: primaryAdmin.publicKey,
                metadata: new Map([[key, value]]),
              },
            ],
            primaryAdmin,
          );

          // Verify retrievable
          const info = ledger.getSignerInfo(primaryAdmin.publicKey);
          expect(info!.metadata.get(key)).toBe(value);

          // Verify survives load
          const loaded = await Ledger.load(
            store,
            BlockSize.Small,
            serializer,
            'pbt-ledger',
            govSerializer,
          );
          const loadedInfo = loaded.getSignerInfo(primaryAdmin.publicKey);
          expect(loadedInfo!.metadata.get(key)).toBe(value);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: block-chain-ledger, Property 18: Signer Lifecycle State Transitions
  it('Property 18: only valid state transitions succeed; invalid transitions throw', async () => {
    await fc.assert(
      fc.asyncProperty(arbSeed, async (seed) => {
        const ws = (seed % 180) + 10;
        const { ledger, primaryAdmin } = await createLedger([1]);
        const target = makeSigner(ws);

        // Add as writer (active)
        await ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.AddSigner,
              publicKey: target.publicKey,
              role: SignerRole.Writer,
            },
          ],
          primaryAdmin,
        );

        // active → suspended (valid)
        await ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.SuspendSigner,
              publicKey: target.publicKey,
            },
          ],
          primaryAdmin,
        );
        expect(
          ledger.getSignerInfo(target.publicKey)!.status,
        ).toBe(SignerStatus.Suspended);

        // suspended → suspended (invalid)
        try {
          await ledger.appendGovernance(
            [
              {
                type: GovernanceActionType.SuspendSigner,
                publicKey: target.publicKey,
              },
            ],
            primaryAdmin,
          );
          fail('Expected InvalidStateTransition');
        } catch (e) {
          expect((e as LedgerError).errorType).toBe(
            LedgerErrorType.InvalidStateTransition,
          );
        }

        // suspended → active (valid)
        await ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.ReactivateSigner,
              publicKey: target.publicKey,
            },
          ],
          primaryAdmin,
        );
        expect(
          ledger.getSignerInfo(target.publicKey)!.status,
        ).toBe(SignerStatus.Active);

        // active → active reactivate (invalid)
        try {
          await ledger.appendGovernance(
            [
              {
                type: GovernanceActionType.ReactivateSigner,
                publicKey: target.publicKey,
              },
            ],
            primaryAdmin,
          );
          fail('Expected InvalidStateTransition');
        } catch (e) {
          expect((e as LedgerError).errorType).toBe(
            LedgerErrorType.InvalidStateTransition,
          );
        }

        // active → retired (valid)
        await ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.RemoveSigner,
              publicKey: target.publicKey,
            },
          ],
          primaryAdmin,
        );
        expect(
          ledger.getSignerInfo(target.publicKey)!.status,
        ).toBe(SignerStatus.Retired);

        // retired → active reactivate (invalid)
        try {
          await ledger.appendGovernance(
            [
              {
                type: GovernanceActionType.ReactivateSigner,
                publicKey: target.publicKey,
              },
            ],
            primaryAdmin,
          );
          fail('Expected InvalidStateTransition');
        } catch (e) {
          expect((e as LedgerError).errorType).toBe(
            LedgerErrorType.InvalidStateTransition,
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});
