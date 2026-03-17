/**
 * Unit tests for GovernancePayloadSerializer.
 * @see Requirements 13.9
 */
import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import {
  LedgerSerializationError,
  LedgerSerializationErrorType,
} from '../../errors/ledgerSerializationError';
import {
  GovernanceActionType,
  IGovernanceAction,
} from '../../interfaces/ledger/governanceAction';
import { IGovernancePayload } from '../../interfaces/ledger/governancePayload';
import { QuorumType } from '../../interfaces/ledger/quorumPolicy';
import { SignerRole } from '../../interfaces/ledger/signerRole';
import { SignerStatus } from '../../interfaces/ledger/signerStatus';
import {
  GovernancePayloadSerializer,
  IGenesisPayloadData,
} from '../governancePayloadSerializer';

const SIG_LEN = 64;

describe('GovernancePayloadSerializer', () => {
  let serializer: GovernancePayloadSerializer;

  function makeSig(fill: number): SignatureUint8Array {
    return new Uint8Array(SIG_LEN).fill(fill) as SignatureUint8Array;
  }

  function makePk(fill: number): Uint8Array {
    return new Uint8Array(33).fill(fill);
  }

  beforeEach(() => {
    serializer = new GovernancePayloadSerializer();
  });

  // ── Genesis ─────────────────────────────────────────────────────────

  describe('genesis payload', () => {
    it('round-trips single admin + unanimous quorum', () => {
      const g: IGenesisPayloadData = {
        quorumPolicy: { type: QuorumType.Unanimous },
        signers: [
          { publicKey: makePk(0x02), role: SignerRole.Admin, status: SignerStatus.Active, metadata: new Map() },
        ],
      };
      const s = serializer.serializeGenesis(g);
      expect(s[0]).toBe(0x01);
      expect(s[1]).toBe(0x00);
      const d = serializer.deserialize(s);
      expect(d.genesis).toBeDefined();
      expect(d.genesis!.quorumPolicy.type).toBe(QuorumType.Unanimous);
      expect(d.genesis!.signers).toHaveLength(1);
      expect(d.genesis!.signers[0].role).toBe(SignerRole.Admin);
      expect(d.genesis!.signers[0].status).toBe(SignerStatus.Active);
      expect(new Uint8Array(d.genesis!.signers[0].publicKey)).toEqual(makePk(0x02));
      expect(d.actions).toHaveLength(0);
      expect(d.cosignatures).toHaveLength(0);
    });

    it('round-trips multiple signers, threshold quorum, and metadata', () => {
      const g: IGenesisPayloadData = {
        quorumPolicy: { type: QuorumType.Threshold, threshold: 2 },
        signers: [
          {
            publicKey: makePk(0x01),
            role: SignerRole.Admin,
            status: SignerStatus.Active,
            metadata: new Map([['org', 'Acme Corp'], ['node', 'node-1']]),
          },
          {
            publicKey: makePk(0x02),
            role: SignerRole.Admin,
            status: SignerStatus.Active,
            metadata: new Map([['org', 'Beta Inc']]),
          },
          {
            publicKey: makePk(0x03),
            role: SignerRole.Writer,
            status: SignerStatus.Active,
            metadata: new Map(),
          },
          {
            publicKey: makePk(0x04),
            role: SignerRole.Reader,
            status: SignerStatus.Active,
            metadata: new Map(),
          },
        ],
      };
      const d = serializer.deserialize(serializer.serializeGenesis(g));
      expect(d.genesis).toBeDefined();
      expect(d.genesis!.quorumPolicy.type).toBe(QuorumType.Threshold);
      expect(d.genesis!.quorumPolicy.threshold).toBe(2);
      expect(d.genesis!.signers).toHaveLength(4);
      expect(d.genesis!.signers[0].role).toBe(SignerRole.Admin);
      expect(d.genesis!.signers[2].role).toBe(SignerRole.Writer);
      expect(d.genesis!.signers[3].role).toBe(SignerRole.Reader);
      expect(d.genesis!.signers[0].metadata.get('org')).toBe('Acme Corp');
      expect(d.genesis!.signers[0].metadata.get('node')).toBe('node-1');
      expect(d.genesis!.signers[1].metadata.get('org')).toBe('Beta Inc');
      expect(d.genesis!.signers[2].metadata.size).toBe(0);
    });

    it('round-trips majority quorum', () => {
      const g: IGenesisPayloadData = {
        quorumPolicy: { type: QuorumType.Majority },
        signers: [
          { publicKey: makePk(0x01), role: SignerRole.Admin, status: SignerStatus.Active, metadata: new Map() },
        ],
      };
      const d = serializer.deserialize(serializer.serializeGenesis(g));
      expect(d.genesis!.quorumPolicy.type).toBe(QuorumType.Majority);
    });
  });

  // ── Each action type ────────────────────────────────────────────────

  describe('amendment payloads', () => {
    it('round-trips add_signer', () => {
      const p: IGovernancePayload = {
        actions: [
          { type: GovernanceActionType.AddSigner, publicKey: makePk(0x05), role: SignerRole.Writer, metadata: new Map([['name', 'W']]) },
        ],
        cosignatures: [],
      };
      const s = serializer.serialize(p);
      expect(s[0]).toBe(0x01);
      expect(s[1]).toBe(0x01);
      const d = serializer.deserialize(s);
      expect(d.actions).toHaveLength(1);
      const a = d.actions[0] as Extract<IGovernanceAction, { type: GovernanceActionType.AddSigner }>;
      expect(new Uint8Array(a.publicKey)).toEqual(makePk(0x05));
      expect(a.role).toBe(SignerRole.Writer);
      expect(a.metadata!.get('name')).toBe('W');
    });

    it('round-trips add_signer without metadata', () => {
      const p: IGovernancePayload = {
        actions: [{ type: GovernanceActionType.AddSigner, publicKey: makePk(0x05), role: SignerRole.Reader }],
        cosignatures: [],
      };
      const d = serializer.deserialize(serializer.serialize(p));
      const a = d.actions[0] as Extract<IGovernanceAction, { type: GovernanceActionType.AddSigner }>;
      expect(a.role).toBe(SignerRole.Reader);
      expect(a.metadata!.size).toBe(0);
    });

    it('round-trips remove_signer', () => {
      const p: IGovernancePayload = {
        actions: [{ type: GovernanceActionType.RemoveSigner, publicKey: makePk(0x06) }],
        cosignatures: [],
      };
      const d = serializer.deserialize(serializer.serialize(p));
      const a = d.actions[0] as Extract<IGovernanceAction, { type: GovernanceActionType.RemoveSigner }>;
      expect(new Uint8Array(a.publicKey)).toEqual(makePk(0x06));
    });

    it('round-trips change_role', () => {
      const p: IGovernancePayload = {
        actions: [{ type: GovernanceActionType.ChangeRole, publicKey: makePk(0x07), newRole: SignerRole.Admin }],
        cosignatures: [],
      };
      const d = serializer.deserialize(serializer.serialize(p));
      const a = d.actions[0] as Extract<IGovernanceAction, { type: GovernanceActionType.ChangeRole }>;
      expect(new Uint8Array(a.publicKey)).toEqual(makePk(0x07));
      expect(a.newRole).toBe(SignerRole.Admin);
    });

    it('round-trips update_quorum (unanimous)', () => {
      const p: IGovernancePayload = {
        actions: [{ type: GovernanceActionType.UpdateQuorum, newPolicy: { type: QuorumType.Unanimous } }],
        cosignatures: [],
      };
      const a = serializer.deserialize(serializer.serialize(p)).actions[0] as Extract<IGovernanceAction, { type: GovernanceActionType.UpdateQuorum }>;
      expect(a.newPolicy.type).toBe(QuorumType.Unanimous);
    });

    it('round-trips update_quorum (threshold)', () => {
      const p: IGovernancePayload = {
        actions: [{ type: GovernanceActionType.UpdateQuorum, newPolicy: { type: QuorumType.Threshold, threshold: 3 } }],
        cosignatures: [],
      };
      const a = serializer.deserialize(serializer.serialize(p)).actions[0] as Extract<IGovernanceAction, { type: GovernanceActionType.UpdateQuorum }>;
      expect(a.newPolicy.type).toBe(QuorumType.Threshold);
      expect(a.newPolicy.threshold).toBe(3);
    });

    it('round-trips update_quorum (majority)', () => {
      const p: IGovernancePayload = {
        actions: [{ type: GovernanceActionType.UpdateQuorum, newPolicy: { type: QuorumType.Majority } }],
        cosignatures: [],
      };
      const a = serializer.deserialize(serializer.serialize(p)).actions[0] as Extract<IGovernanceAction, { type: GovernanceActionType.UpdateQuorum }>;
      expect(a.newPolicy.type).toBe(QuorumType.Majority);
    });

    it('round-trips suspend_signer', () => {
      const p: IGovernancePayload = {
        actions: [{ type: GovernanceActionType.SuspendSigner, publicKey: makePk(0x08) }],
        cosignatures: [],
      };
      const a = serializer.deserialize(serializer.serialize(p)).actions[0] as Extract<IGovernanceAction, { type: GovernanceActionType.SuspendSigner }>;
      expect(new Uint8Array(a.publicKey)).toEqual(makePk(0x08));
    });

    it('round-trips reactivate_signer', () => {
      const p: IGovernancePayload = {
        actions: [{ type: GovernanceActionType.ReactivateSigner, publicKey: makePk(0x09) }],
        cosignatures: [],
      };
      const a = serializer.deserialize(serializer.serialize(p)).actions[0] as Extract<IGovernanceAction, { type: GovernanceActionType.ReactivateSigner }>;
      expect(new Uint8Array(a.publicKey)).toEqual(makePk(0x09));
    });

    it('round-trips set_member_data', () => {
      const md = new Map([['org', 'X'], ['contact', 'y@z.com']]);
      const p: IGovernancePayload = {
        actions: [{ type: GovernanceActionType.SetMemberData, publicKey: makePk(0x0a), metadata: md }],
        cosignatures: [],
      };
      const a = serializer.deserialize(serializer.serialize(p)).actions[0] as Extract<IGovernanceAction, { type: GovernanceActionType.SetMemberData }>;
      expect(a.metadata.get('org')).toBe('X');
      expect(a.metadata.get('contact')).toBe('y@z.com');
    });
  });

  // ── Cosignatures ────────────────────────────────────────────────────

  describe('cosignatures', () => {
    it('round-trips multiple cosignatures', () => {
      const p: IGovernancePayload = {
        actions: [
          { type: GovernanceActionType.AddSigner, publicKey: makePk(0x10), role: SignerRole.Writer },
        ],
        cosignatures: [
          { signerPublicKey: makePk(0x01), signature: makeSig(0xaa) },
          { signerPublicKey: makePk(0x02), signature: makeSig(0xbb) },
        ],
      };
      const d = serializer.deserialize(serializer.serialize(p));
      expect(d.cosignatures).toHaveLength(2);
      expect(new Uint8Array(d.cosignatures[0].signerPublicKey)).toEqual(makePk(0x01));
      expect(new Uint8Array(d.cosignatures[0].signature)).toEqual(makeSig(0xaa));
      expect(new Uint8Array(d.cosignatures[1].signerPublicKey)).toEqual(makePk(0x02));
      expect(new Uint8Array(d.cosignatures[1].signature)).toEqual(makeSig(0xbb));
    });
  });

  // ── Metadata edge cases ─────────────────────────────────────────────

  describe('metadata', () => {
    it('handles empty metadata', () => {
      const p: IGovernancePayload = {
        actions: [
          { type: GovernanceActionType.AddSigner, publicKey: makePk(0x20), role: SignerRole.Admin, metadata: new Map() },
        ],
        cosignatures: [],
      };
      const a = serializer.deserialize(serializer.serialize(p)).actions[0] as Extract<IGovernanceAction, { type: GovernanceActionType.AddSigner }>;
      expect(a.metadata!.size).toBe(0);
    });

    it('handles unicode metadata', () => {
      const p: IGovernancePayload = {
        actions: [
          {
            type: GovernanceActionType.SetMemberData,
            publicKey: makePk(0x21),
            metadata: new Map([['name', '日本語'], ['emoji', '🔐']]),
          },
        ],
        cosignatures: [],
      };
      const a = serializer.deserialize(serializer.serialize(p)).actions[0] as Extract<IGovernanceAction, { type: GovernanceActionType.SetMemberData }>;
      expect(a.metadata.get('name')).toBe('日本語');
      expect(a.metadata.get('emoji')).toBe('🔐');
    });
  });

  // ── Multiple actions ────────────────────────────────────────────────

  describe('multiple actions', () => {
    it('round-trips mixed actions', () => {
      const p: IGovernancePayload = {
        actions: [
          { type: GovernanceActionType.AddSigner, publicKey: makePk(0x30), role: SignerRole.Writer },
          { type: GovernanceActionType.ChangeRole, publicKey: makePk(0x31), newRole: SignerRole.Admin },
          { type: GovernanceActionType.SuspendSigner, publicKey: makePk(0x32) },
        ],
        cosignatures: [],
      };
      const d = serializer.deserialize(serializer.serialize(p));
      expect(d.actions).toHaveLength(3);
      expect(d.actions[0].type).toBe(GovernanceActionType.AddSigner);
      expect(d.actions[1].type).toBe(GovernanceActionType.ChangeRole);
      expect(d.actions[2].type).toBe(GovernanceActionType.SuspendSigner);
    });
  });

  // ── Error cases ─────────────────────────────────────────────────────

  describe('error cases', () => {
    it('rejects invalid prefix (not 0x01)', () => {
      expect(() => serializer.deserialize(new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x00]))).toThrow(LedgerSerializationError);
      try {
        serializer.deserialize(new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x00]));
      } catch (e) {
        expect((e as LedgerSerializationError).errorType).toBe(LedgerSerializationErrorType.InvalidMagic);
      }
    });

    it('rejects data shorter than 4 bytes', () => {
      expect(() => serializer.deserialize(new Uint8Array([0x01, 0x01]))).toThrow(LedgerSerializationError);
      try {
        serializer.deserialize(new Uint8Array([0x01, 0x01]));
      } catch (e) {
        expect((e as LedgerSerializationError).errorType).toBe(LedgerSerializationErrorType.DataTooShort);
      }
    });

    it('rejects truncated amendment', () => {
      expect(() => serializer.deserialize(new Uint8Array([0x01, 0x01, 0x00, 0x02]))).toThrow(LedgerSerializationError);
    });

    it('rejects truncated genesis', () => {
      expect(() => serializer.deserialize(new Uint8Array([0x01, 0x00]))).toThrow(LedgerSerializationError);
    });

    it('rejects unknown subtype', () => {
      expect(() => serializer.deserialize(new Uint8Array([0x01, 0xff, 0x00, 0x00, 0x00, 0x00]))).toThrow(LedgerSerializationError);
      try {
        serializer.deserialize(new Uint8Array([0x01, 0xff, 0x00, 0x00, 0x00, 0x00]));
      } catch (e) {
        expect((e as LedgerSerializationError).errorType).toBe(LedgerSerializationErrorType.UnsupportedVersion);
      }
    });
  });

  // ── isGovernancePayload ─────────────────────────────────────────────

  describe('isGovernancePayload', () => {
    it('returns true for governance payloads', () => {
      const p: IGovernancePayload = {
        actions: [{ type: GovernanceActionType.RemoveSigner, publicKey: makePk(0x01) }],
        cosignatures: [],
      };
      expect(GovernancePayloadSerializer.isGovernancePayload(serializer.serialize(p))).toBe(true);
    });

    it('returns false for 0x00 prefix', () => {
      expect(GovernancePayloadSerializer.isGovernancePayload(new Uint8Array([0x00, 0x01]))).toBe(false);
    });

    it('returns false for empty', () => {
      expect(GovernancePayloadSerializer.isGovernancePayload(new Uint8Array(0))).toBe(false);
    });

    it('returns true for genesis payloads', () => {
      const g: IGenesisPayloadData = {
        quorumPolicy: { type: QuorumType.Unanimous },
        signers: [
          { publicKey: makePk(0x01), role: SignerRole.Admin, status: SignerStatus.Active, metadata: new Map() },
        ],
      };
      expect(GovernancePayloadSerializer.isGovernancePayload(serializer.serializeGenesis(g))).toBe(true);
    });
  });

  // ── serializeActionsForSigning ──────────────────────────────────────

  describe('serializeActionsForSigning', () => {
    it('is deterministic', () => {
      const actions: IGovernanceAction[] = [
        { type: GovernanceActionType.AddSigner, publicKey: makePk(0x40), role: SignerRole.Writer },
        { type: GovernanceActionType.UpdateQuorum, newPolicy: { type: QuorumType.Majority } },
      ];
      const r1 = serializer.serializeActionsForSigning(actions);
      const r2 = serializer.serializeActionsForSigning(actions);
      expect(new Uint8Array(r1)).toEqual(new Uint8Array(r2));
    });

    it('differs for different actions', () => {
      const r1 = serializer.serializeActionsForSigning([
        { type: GovernanceActionType.RemoveSigner, publicKey: makePk(0x50) },
      ]);
      const r2 = serializer.serializeActionsForSigning([
        { type: GovernanceActionType.RemoveSigner, publicKey: makePk(0x51) },
      ]);
      expect(new Uint8Array(r1)).not.toEqual(new Uint8Array(r2));
    });

    it('starts with action count as uint16 BE', () => {
      const actions: IGovernanceAction[] = [
        { type: GovernanceActionType.SuspendSigner, publicKey: makePk(0x60) },
        { type: GovernanceActionType.ReactivateSigner, publicKey: makePk(0x61) },
      ];
      const r = serializer.serializeActionsForSigning(actions);
      const v = new DataView(r.buffer, r.byteOffset, r.byteLength);
      expect(v.getUint16(0, false)).toBe(2);
    });
  });
});
