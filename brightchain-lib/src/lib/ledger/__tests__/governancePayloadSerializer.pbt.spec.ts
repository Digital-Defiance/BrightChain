/**
 * Property-based tests for GovernancePayloadSerializer.
 *
 * Feature: block-chain-ledger, Property 16: Governance Payload Serialization Round-Trip
 *
 * For any valid IGovernancePayload (with arbitrary actions and cosignatures),
 * serializing via serialize() and deserializing via deserialize() should
 * produce an identical payload with the same actions and cosignatures.
 *
 * **Validates: Requirements 13.9**
 */
import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

import {
  GovernanceActionType,
  IGovernanceAction,
} from '../../interfaces/ledger/governanceAction';
import { IGovernancePayload } from '../../interfaces/ledger/governancePayload';
import { QuorumType, IQuorumPolicy } from '../../interfaces/ledger/quorumPolicy';
import { SignerRole } from '../../interfaces/ledger/signerRole';
import { SignerStatus } from '../../interfaces/ledger/signerStatus';
import { IAuthorizedSigner } from '../../interfaces/ledger/authorizedSigner';
import {
  GovernancePayloadSerializer,
  IGenesisPayloadData,
} from '../governancePayloadSerializer';

jest.setTimeout(60_000);

const SIGNATURE_LENGTH = 64;

// ---------------------------------------------------------------------------
// Custom Generators
// ---------------------------------------------------------------------------

function arbPubKey(): fc.Arbitrary<Uint8Array> {
  return fc
    .array(fc.integer({ min: 0, max: 255 }), {
      minLength: 33,
      maxLength: 65,
    })
    .map((arr) => new Uint8Array(arr));
}

function arbSignature(): fc.Arbitrary<SignatureUint8Array> {
  return fc
    .array(fc.integer({ min: 0, max: 255 }), {
      minLength: SIGNATURE_LENGTH,
      maxLength: SIGNATURE_LENGTH,
    })
    .map((arr) => new Uint8Array(arr) as SignatureUint8Array);
}

function arbSignerRole(): fc.Arbitrary<SignerRole> {
  return fc.constantFrom(SignerRole.Admin, SignerRole.Writer, SignerRole.Reader);
}

function arbSignerStatus(): fc.Arbitrary<SignerStatus> {
  return fc.constantFrom(
    SignerStatus.Active,
    SignerStatus.Suspended,
    SignerStatus.Retired,
  );
}

function arbQuorumPolicy(): fc.Arbitrary<IQuorumPolicy> {
  return fc.oneof(
    fc.constant({ type: QuorumType.Unanimous } as IQuorumPolicy),
    fc.constant({ type: QuorumType.Majority } as IQuorumPolicy),
    fc
      .integer({ min: 1, max: 100 })
      .map((t) => ({ type: QuorumType.Threshold, threshold: t }) as IQuorumPolicy),
  );
}

function arbMemberMetadata(): fc.Arbitrary<Map<string, string>> {
  return fc
    .array(
      fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 0, maxLength: 50 }),
      ),
      { minLength: 0, maxLength: 5 },
    )
    .map((entries) => new Map(entries));
}

function arbGovernanceAction(): fc.Arbitrary<IGovernanceAction> {
  return fc.oneof(
    fc
      .tuple(arbPubKey(), arbSignerRole(), arbMemberMetadata())
      .map(
        ([publicKey, role, metadata]) =>
          ({
            type: GovernanceActionType.AddSigner,
            publicKey,
            role,
            metadata,
          }) as IGovernanceAction,
      ),
    arbPubKey().map(
      (publicKey) =>
        ({
          type: GovernanceActionType.RemoveSigner,
          publicKey,
        }) as IGovernanceAction,
    ),
    fc
      .tuple(arbPubKey(), arbSignerRole())
      .map(
        ([publicKey, newRole]) =>
          ({
            type: GovernanceActionType.ChangeRole,
            publicKey,
            newRole,
          }) as IGovernanceAction,
      ),
    arbQuorumPolicy().map(
      (newPolicy) =>
        ({
          type: GovernanceActionType.UpdateQuorum,
          newPolicy,
        }) as IGovernanceAction,
    ),
    arbPubKey().map(
      (publicKey) =>
        ({
          type: GovernanceActionType.SuspendSigner,
          publicKey,
        }) as IGovernanceAction,
    ),
    arbPubKey().map(
      (publicKey) =>
        ({
          type: GovernanceActionType.ReactivateSigner,
          publicKey,
        }) as IGovernanceAction,
    ),
    fc
      .tuple(arbPubKey(), arbMemberMetadata())
      .map(
        ([publicKey, metadata]) =>
          ({
            type: GovernanceActionType.SetMemberData,
            publicKey,
            metadata,
          }) as IGovernanceAction,
      ),
  );
}

function arbCosignature(): fc.Arbitrary<{
  signerPublicKey: Uint8Array;
  signature: SignatureUint8Array;
}> {
  return fc.tuple(arbPubKey(), arbSignature()).map(([pk, sig]) => ({
    signerPublicKey: pk,
    signature: sig,
  }));
}

function arbGovernancePayload(): fc.Arbitrary<IGovernancePayload> {
  return fc
    .tuple(
      fc.array(arbGovernanceAction(), { minLength: 1, maxLength: 5 }),
      fc.array(arbCosignature(), { minLength: 0, maxLength: 3 }),
    )
    .map(([actions, cosignatures]) => ({ actions, cosignatures }));
}

function arbAuthorizedSigner(): fc.Arbitrary<IAuthorizedSigner> {
  return fc
    .tuple(arbPubKey(), arbSignerRole(), arbSignerStatus(), arbMemberMetadata())
    .map(([publicKey, role, status, metadata]) => ({
      publicKey,
      role,
      status,
      metadata,
    }));
}

function arbGenesisPayloadData(): fc.Arbitrary<IGenesisPayloadData> {
  return fc
    .tuple(
      arbQuorumPolicy(),
      fc.array(arbAuthorizedSigner(), { minLength: 1, maxLength: 5 }),
    )
    .map(([quorumPolicy, signers]) => ({ quorumPolicy, signers }));
}

// ---------------------------------------------------------------------------
// Comparison helpers
// ---------------------------------------------------------------------------

function actionsEqual(
  a: readonly IGovernanceAction[],
  b: readonly IGovernanceAction[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!actionEqual(a[i], b[i])) return false;
  }
  return true;
}

function actionEqual(a: IGovernanceAction, b: IGovernanceAction): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case GovernanceActionType.AddSigner: {
      const bb = b as typeof a;
      return (
        uint8Equal(a.publicKey, bb.publicKey) &&
        a.role === bb.role &&
        mapsEqual(a.metadata ?? new Map(), bb.metadata ?? new Map())
      );
    }
    case GovernanceActionType.RemoveSigner:
    case GovernanceActionType.SuspendSigner:
    case GovernanceActionType.ReactivateSigner: {
      const bb = b as typeof a;
      return uint8Equal(a.publicKey, bb.publicKey);
    }
    case GovernanceActionType.ChangeRole: {
      const bb = b as typeof a;
      return uint8Equal(a.publicKey, bb.publicKey) && a.newRole === bb.newRole;
    }
    case GovernanceActionType.UpdateQuorum: {
      const bb = b as typeof a;
      return (
        a.newPolicy.type === bb.newPolicy.type &&
        a.newPolicy.threshold === bb.newPolicy.threshold
      );
    }
    case GovernanceActionType.SetMemberData: {
      const bb = b as typeof a;
      return (
        uint8Equal(a.publicKey, bb.publicKey) &&
        mapsEqual(a.metadata, bb.metadata)
      );
    }
    default:
      return false;
  }
}

function uint8Equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function mapsEqual(
  a: ReadonlyMap<string, string>,
  b: ReadonlyMap<string, string>,
): boolean {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    if (b.get(key) !== value) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('GovernancePayloadSerializer Property Tests', () => {
  const serializer = new GovernancePayloadSerializer();

  // Feature: block-chain-ledger, Property 16: Governance Payload Serialization Round-Trip
  it('Property 16: amendment payload round-trip preserves actions and cosignatures', () => {
    fc.assert(
      fc.property(arbGovernancePayload(), (payload) => {
        const serialized = serializer.serialize(payload);

        // Must start with governance prefix
        expect(serialized[0]).toBe(0x01);
        expect(GovernancePayloadSerializer.isGovernancePayload(serialized)).toBe(
          true,
        );

        const deserialized = serializer.deserialize(serialized);

        // Actions round-trip
        expect(actionsEqual(payload.actions, deserialized.actions)).toBe(true);

        // Cosignatures round-trip
        expect(deserialized.cosignatures.length).toBe(
          payload.cosignatures.length,
        );
        for (let i = 0; i < payload.cosignatures.length; i++) {
          expect(
            uint8Equal(
              deserialized.cosignatures[i].signerPublicKey,
              payload.cosignatures[i].signerPublicKey,
            ),
          ).toBe(true);
          expect(
            uint8Equal(
              new Uint8Array(deserialized.cosignatures[i].signature),
              new Uint8Array(payload.cosignatures[i].signature),
            ),
          ).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: block-chain-ledger, Property 16 (genesis variant): Genesis payload round-trip
  it('Property 16 (genesis): genesis payload round-trip preserves quorum and signers', () => {
    fc.assert(
      fc.property(arbGenesisPayloadData(), (genesisData) => {
        const serialized = serializer.serializeGenesis(genesisData);

        expect(serialized[0]).toBe(0x01);
        expect(serialized[1]).toBe(0x00); // genesis subtype

        const deserialized = serializer.deserialize(serialized);
        expect(deserialized.genesis).toBeDefined();

        const g = deserialized.genesis!;

        // Quorum policy round-trip
        expect(g.quorumPolicy.type).toBe(genesisData.quorumPolicy.type);
        if (genesisData.quorumPolicy.type === QuorumType.Threshold) {
          expect(g.quorumPolicy.threshold).toBe(
            genesisData.quorumPolicy.threshold,
          );
        }

        // Signers round-trip
        expect(g.signers.length).toBe(genesisData.signers.length);
        for (let i = 0; i < genesisData.signers.length; i++) {
          expect(
            uint8Equal(g.signers[i].publicKey, genesisData.signers[i].publicKey),
          ).toBe(true);
          expect(g.signers[i].role).toBe(genesisData.signers[i].role);
          expect(g.signers[i].status).toBe(genesisData.signers[i].status);
          expect(
            mapsEqual(g.signers[i].metadata, genesisData.signers[i].metadata),
          ).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: block-chain-ledger, Property 16 (determinism): serializeActionsForSigning is deterministic
  it('Property 16 (determinism): serializeActionsForSigning produces same bytes for same actions', () => {
    fc.assert(
      fc.property(
        fc.array(arbGovernanceAction(), { minLength: 1, maxLength: 5 }),
        (actions) => {
          const result1 = serializer.serializeActionsForSigning(actions);
          const result2 = serializer.serializeActionsForSigning(actions);
          expect(uint8Equal(result1, result2)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
