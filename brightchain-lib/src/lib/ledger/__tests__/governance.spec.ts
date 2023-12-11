/**
 * Unit tests for governance-integrated Ledger.
 * @see Requirements 12.1–12.8, 13.1–13.9, 14.1–14.7, 15.1–15.5, 17.1–17.9, 18.1–18.8
 */
import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { LedgerError, LedgerErrorType } from '../../errors/ledgerError';
import { QuorumType } from '../../interfaces/ledger/brightTrustPolicy';
import { GovernanceActionType } from '../../interfaces/ledger/governanceAction';
import { ILedgerSigner } from '../../interfaces/ledger/ledgerSigner';
import { SignerRole } from '../../interfaces/ledger/signerRole';
import { SignerStatus } from '../../interfaces/ledger/signerStatus';
import { ChecksumService } from '../../services/checksum.service';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { GovernancePayloadSerializer } from '../governancePayloadSerializer';
import { Ledger } from '../ledger';
import { LedgerEntrySerializer } from '../ledgerEntrySerializer';

/** Create a mock signer with a deterministic public key. */
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

/** Create a governance-enabled ledger with a genesis entry. */
async function createGovernanceLedger(opts?: {
  quorumType?: QuorumType;
  threshold?: number;
  extraSigners?: { seed: number; role: SignerRole }[];
}) {
  const store = new MemoryBlockStore(BlockSize.Small);
  const serializer = new LedgerEntrySerializer(new ChecksumService());
  const govSerializer = new GovernancePayloadSerializer();

  const adminSigner = makeSigner(1);
  const signers = [
    {
      publicKey: adminSigner.publicKey,
      role: SignerRole.Admin,
      status: SignerStatus.Active,
      metadata: new Map<string, string>(),
    },
  ];

  // Add extra signers if specified
  const extraSignerInstances: ILedgerSigner[] = [];
  if (opts?.extraSigners) {
    for (const es of opts.extraSigners) {
      const s = makeSigner(es.seed);
      signers.push({
        publicKey: s.publicKey,
        role: es.role,
        status: SignerStatus.Active,
        metadata: new Map<string, string>(),
      });
      extraSignerInstances.push(s);
    }
  }

  const brightTrustPolicy =
    opts?.quorumType === QuorumType.Threshold
      ? { type: QuorumType.Threshold as const, threshold: opts.threshold ?? 1 }
      : opts?.quorumType === QuorumType.Majority
        ? { type: QuorumType.Majority as const }
        : opts?.quorumType === QuorumType.Unanimous
          ? { type: QuorumType.Unanimous as const }
          : { type: QuorumType.Threshold as const, threshold: 1 };

  const genesisPayload = govSerializer.serializeGenesis({
    brightTrustPolicy: brightTrustPolicy,
    signers,
  });

  const ledger = new Ledger(
    store,
    BlockSize.Small,
    serializer,
    'gov-ledger',
    govSerializer,
  );

  await ledger.append(genesisPayload, adminSigner);

  return {
    store,
    serializer,
    govSerializer,
    ledger,
    adminSigner,
    extraSignerInstances,
  };
}

describe('Governance-integrated Ledger', () => {
  // ── Genesis entry ───────────────────────────────────────────────────

  describe('genesis entry', () => {
    it('creates a ledger with genesis entry containing initial signer set', async () => {
      const { ledger, adminSigner } = await createGovernanceLedger();
      expect(ledger.length).toBe(1);
      const signers = ledger.getAuthorizedSigners();
      expect(signers).toHaveLength(1);
      expect(signers[0].role).toBe(SignerRole.Admin);
      expect(signers[0].status).toBe(SignerStatus.Active);
      expect(new Uint8Array(signers[0].publicKey)).toEqual(
        adminSigner.publicKey,
      );
    });

    it('rejects genesis entry that is not a governance payload', async () => {
      const store = new MemoryBlockStore(BlockSize.Small);
      const serializer = new LedgerEntrySerializer(new ChecksumService());
      const govSerializer = new GovernancePayloadSerializer();
      const ledger = new Ledger(
        store,
        BlockSize.Small,
        serializer,
        'bad-genesis',
        govSerializer,
      );
      const signer = makeSigner(1);
      await expect(
        ledger.append(new Uint8Array([0x00, 0x01, 0x02]), signer),
      ).rejects.toThrow(LedgerError);
    });
  });

  // ── Authorization ───────────────────────────────────────────────────

  describe('authorization', () => {
    it('authorized writer can append regular entries', async () => {
      const writerSigner = makeSigner(2);
      const { ledger, adminSigner } = await createGovernanceLedger();

      // Add a writer via governance
      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.AddSigner,
            publicKey: writerSigner.publicKey,
            role: SignerRole.Writer,
          },
        ],
        adminSigner,
      );

      // Writer can append
      await ledger.append(new Uint8Array([0xaa]), writerSigner);
      expect(ledger.length).toBe(3);
    });

    it('unauthorized signer (not in set) is rejected', async () => {
      const { ledger } = await createGovernanceLedger();
      const unknownSigner = makeSigner(99);

      await expect(
        ledger.append(new Uint8Array([0x01]), unknownSigner),
      ).rejects.toThrow(LedgerError);

      try {
        await ledger.append(new Uint8Array([0x01]), unknownSigner);
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(
          LedgerErrorType.UnauthorizedSigner,
        );
      }
    });

    it('reader role is rejected for append', async () => {
      const readerSigner = makeSigner(3);
      const { ledger, adminSigner } = await createGovernanceLedger();

      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.AddSigner,
            publicKey: readerSigner.publicKey,
            role: SignerRole.Reader,
          },
        ],
        adminSigner,
      );

      await expect(
        ledger.append(new Uint8Array([0x01]), readerSigner),
      ).rejects.toThrow(LedgerError);
    });

    it('suspended signer is rejected for append', async () => {
      const writerSigner = makeSigner(2);
      const { ledger, adminSigner } = await createGovernanceLedger();

      // Add then suspend
      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.AddSigner,
            publicKey: writerSigner.publicKey,
            role: SignerRole.Writer,
          },
        ],
        adminSigner,
      );
      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.SuspendSigner,
            publicKey: writerSigner.publicKey,
          },
        ],
        adminSigner,
      );

      await expect(
        ledger.append(new Uint8Array([0x01]), writerSigner),
      ).rejects.toThrow(LedgerError);
    });
  });

  // ── Governance actions ──────────────────────────────────────────────

  describe('governance actions', () => {
    it('admin can append governance entry to add a new writer', async () => {
      const { ledger, adminSigner } = await createGovernanceLedger();
      const newWriter = makeSigner(5);

      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.AddSigner,
            publicKey: newWriter.publicKey,
            role: SignerRole.Writer,
          },
        ],
        adminSigner,
      );

      const info = ledger.getSignerInfo(newWriter.publicKey);
      expect(info).toBeDefined();
      expect(info!.role).toBe(SignerRole.Writer);
      expect(info!.status).toBe(SignerStatus.Active);
    });

    it('writer cannot append governance entry', async () => {
      const writerSigner = makeSigner(2);
      const { ledger, adminSigner } = await createGovernanceLedger();

      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.AddSigner,
            publicKey: writerSigner.publicKey,
            role: SignerRole.Writer,
          },
        ],
        adminSigner,
      );

      await expect(
        ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.AddSigner,
              publicKey: makeSigner(10).publicKey,
              role: SignerRole.Writer,
            },
          ],
          writerSigner,
        ),
      ).rejects.toThrow(LedgerError);

      try {
        await ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.AddSigner,
              publicKey: makeSigner(11).publicKey,
              role: SignerRole.Writer,
            },
          ],
          writerSigner,
        );
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(
          LedgerErrorType.UnauthorizedGovernance,
        );
      }
    });

    it('add_signer makes new signer available for subsequent appends', async () => {
      const newWriter = makeSigner(6);
      const { ledger, adminSigner } = await createGovernanceLedger();

      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.AddSigner,
            publicKey: newWriter.publicKey,
            role: SignerRole.Writer,
          },
        ],
        adminSigner,
      );

      // New writer can now append
      await ledger.append(new Uint8Array([0xbb]), newWriter);
      expect(ledger.length).toBe(3);
    });

    it('remove_signer prevents subsequent appends by that signer', async () => {
      const { ledger, adminSigner } = await createGovernanceLedger({
        extraSigners: [{ seed: 2, role: SignerRole.Admin }],
      });
      const admin2 = makeSigner(2);

      // Remove admin2
      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.RemoveSigner,
            publicKey: admin2.publicKey,
          },
        ],
        adminSigner,
      );

      // admin2 can no longer append
      await expect(
        ledger.append(new Uint8Array([0x01]), admin2),
      ).rejects.toThrow(LedgerError);
    });

    it('suspend_signer prevents appends; reactivate_signer re-enables', async () => {
      const writerSigner = makeSigner(7);
      const { ledger, adminSigner } = await createGovernanceLedger();

      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.AddSigner,
            publicKey: writerSigner.publicKey,
            role: SignerRole.Writer,
          },
        ],
        adminSigner,
      );

      // Suspend
      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.SuspendSigner,
            publicKey: writerSigner.publicKey,
          },
        ],
        adminSigner,
      );
      await expect(
        ledger.append(new Uint8Array([0x01]), writerSigner),
      ).rejects.toThrow(LedgerError);

      // Reactivate
      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.ReactivateSigner,
            publicKey: writerSigner.publicKey,
          },
        ],
        adminSigner,
      );
      await ledger.append(new Uint8Array([0xcc]), writerSigner);
      expect(ledger.length).toBe(5); // genesis + add + suspend + reactivate + data
    });

    it('change_role from writer to admin grants governance capability', async () => {
      const writerSigner = makeSigner(8);
      const { ledger, adminSigner } = await createGovernanceLedger();

      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.AddSigner,
            publicKey: writerSigner.publicKey,
            role: SignerRole.Writer,
          },
        ],
        adminSigner,
      );

      // Writer can't do governance
      await expect(
        ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.AddSigner,
              publicKey: makeSigner(20).publicKey,
              role: SignerRole.Reader,
            },
          ],
          writerSigner,
        ),
      ).rejects.toThrow(LedgerError);

      // Promote to admin
      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.ChangeRole,
            publicKey: writerSigner.publicKey,
            newRole: SignerRole.Admin,
          },
        ],
        adminSigner,
      );

      // Now can do governance
      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.AddSigner,
            publicKey: makeSigner(20).publicKey,
            role: SignerRole.Reader,
          },
        ],
        writerSigner,
      );
      // genesis(1) + add writer(2) + promote(3) + add reader(4)
      expect(ledger.length).toBe(4);
    });

    it('update_quorum changes required signatures', async () => {
      const { ledger, adminSigner } = await createGovernanceLedger({
        extraSigners: [{ seed: 2, role: SignerRole.Admin }],
      });

      expect(ledger.brightTrustPolicy!.type).toBe(QuorumType.Threshold);

      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.UpdateQuorum,
            newPolicy: { type: QuorumType.Majority },
          },
        ],
        adminSigner,
      );

      expect(ledger.brightTrustPolicy!.type).toBe(QuorumType.Majority);
    });
  });

  // ── Quorum enforcement ──────────────────────────────────────────────

  describe('quorum enforcement', () => {
    it('multi-signature governance entry with majority quorum', async () => {
      const admin2 = makeSigner(2);
      const _admin3 = makeSigner(3);
      const { ledger, adminSigner, govSerializer } =
        await createGovernanceLedger({
          quorumType: QuorumType.Majority,
          extraSigners: [
            { seed: 2, role: SignerRole.Admin },
            { seed: 3, role: SignerRole.Admin },
          ],
        });

      // Majority of 3 = 2 signatures needed
      const actions = [
        {
          type: GovernanceActionType.AddSigner as const,
          publicKey: makeSigner(10).publicKey,
          role: SignerRole.Writer as const,
        },
      ];
      const actionsForSigning =
        govSerializer.serializeActionsForSigning(actions);
      const cosig2 = admin2.sign(actionsForSigning);

      await ledger.appendGovernance(actions, adminSigner, [
        { signer: admin2, signature: cosig2 },
      ]);

      expect(ledger.length).toBe(2);
    });

    it('governance entry rejected when quorum not met', async () => {
      const { ledger, adminSigner } = await createGovernanceLedger({
        quorumType: QuorumType.Unanimous,
        extraSigners: [
          { seed: 2, role: SignerRole.Admin },
          { seed: 3, role: SignerRole.Admin },
        ],
      });

      // Unanimous requires all 3 admins, but only 1 is signing
      await expect(
        ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.AddSigner,
              publicKey: makeSigner(10).publicKey,
              role: SignerRole.Writer,
            },
          ],
          adminSigner,
        ),
      ).rejects.toThrow(LedgerError);

      try {
        await ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.AddSigner,
              publicKey: makeSigner(11).publicKey,
              role: SignerRole.Writer,
            },
          ],
          adminSigner,
        );
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(LedgerErrorType.QuorumNotMet);
      }
    });
  });

  // ── Safety constraints ──────────────────────────────────────────────

  describe('safety constraints', () => {
    it('cannot remove last active admin', async () => {
      const { ledger, adminSigner } = await createGovernanceLedger();

      await expect(
        ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.RemoveSigner,
              publicKey: adminSigner.publicKey,
            },
          ],
          adminSigner,
        ),
      ).rejects.toThrow(LedgerError);
    });

    it('cannot suspend last active admin', async () => {
      const { ledger, adminSigner } = await createGovernanceLedger();

      await expect(
        ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.SuspendSigner,
              publicKey: adminSigner.publicKey,
            },
          ],
          adminSigner,
        ),
      ).rejects.toThrow(LedgerError);
    });

    it('cannot set quorum threshold above active admin count', async () => {
      const { ledger, adminSigner } = await createGovernanceLedger();

      await expect(
        ledger.appendGovernance(
          [
            {
              type: GovernanceActionType.UpdateQuorum,
              newPolicy: { type: QuorumType.Threshold, threshold: 5 },
            },
          ],
          adminSigner,
        ),
      ).rejects.toThrow(LedgerError);
    });
  });

  // ── Member metadata ─────────────────────────────────────────────────

  describe('member metadata', () => {
    it('set_member_data updates metadata, retrievable via getSignerInfo', async () => {
      const { ledger, adminSigner } = await createGovernanceLedger();

      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.SetMemberData,
            publicKey: adminSigner.publicKey,
            metadata: new Map([
              ['org', 'TestOrg'],
              ['role_desc', 'Lead Admin'],
            ]),
          },
        ],
        adminSigner,
      );

      const info = ledger.getSignerInfo(adminSigner.publicKey);
      expect(info).toBeDefined();
      expect(info!.metadata.get('org')).toBe('TestOrg');
      expect(info!.metadata.get('role_desc')).toBe('Lead Admin');
    });
  });

  // ── Load and replay ─────────────────────────────────────────────────

  describe('load and replay', () => {
    it('load() reconstructs authorized signer set from governance entries', async () => {
      const writerSigner = makeSigner(4);
      const { store, serializer, govSerializer, ledger, adminSigner } =
        await createGovernanceLedger();

      // Add a writer
      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.AddSigner,
            publicKey: writerSigner.publicKey,
            role: SignerRole.Writer,
          },
        ],
        adminSigner,
      );

      // Set metadata
      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.SetMemberData,
            publicKey: adminSigner.publicKey,
            metadata: new Map([['org', 'Loaded']]),
          },
        ],
        adminSigner,
      );

      // Load from store
      const loaded = await Ledger.load(
        store,
        BlockSize.Small,
        serializer,
        'gov-ledger',
        govSerializer,
      );

      expect(loaded.length).toBe(3);

      // Signer set should be reconstructed
      const signers = loaded.getAuthorizedSigners();
      expect(signers).toHaveLength(2);

      // Writer should be present
      const writerInfo = loaded.getSignerInfo(writerSigner.publicKey);
      expect(writerInfo).toBeDefined();
      expect(writerInfo!.role).toBe(SignerRole.Writer);

      // Metadata should be present
      const adminInfo = loaded.getSignerInfo(adminSigner.publicKey);
      expect(adminInfo).toBeDefined();
      expect(adminInfo!.metadata.get('org')).toBe('Loaded');

      // Writer can still append after load
      await loaded.append(new Uint8Array([0xdd]), writerSigner);
      expect(loaded.length).toBe(4);
    });

    it('getAuthorizedSigners() returns current state', async () => {
      const { ledger, adminSigner } = await createGovernanceLedger({
        extraSigners: [{ seed: 2, role: SignerRole.Writer }],
      });

      const signers = ledger.getAuthorizedSigners();
      expect(signers).toHaveLength(2);

      const admin = signers.find((s) => s.role === SignerRole.Admin);
      const writer = signers.find((s) => s.role === SignerRole.Writer);
      expect(admin).toBeDefined();
      expect(writer).toBeDefined();

      // Remove writer
      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.RemoveSigner,
            publicKey: makeSigner(2).publicKey,
          },
        ],
        adminSigner,
      );

      const updated = ledger.getAuthorizedSigners();
      const retired = updated.find(
        (s) =>
          new Uint8Array(s.publicKey).toString() ===
          makeSigner(2).publicKey.toString(),
      );
      expect(retired).toBeDefined();
      expect(retired!.status).toBe(SignerStatus.Retired);
    });
  });
});
