/**
 * @fileoverview Governance payload serializer for the blockchain ledger.
 *
 * Handles deterministic binary serialization of governance payloads,
 * including the 0x01 type prefix that distinguishes governance entries
 * from regular (0x00) entries.
 *
 * Binary format (after 0x01 type prefix):
 * - 1 byte: subtype (0x00 = genesis, 0x01 = amendment)
 * - For genesis: quorum policy + initial signer list
 * - 2 bytes: actionCount (uint16 BE)
 * - variable: serialized actions
 * - 2 bytes: cosignatureCount (uint16 BE)
 * - variable: cosignatures
 *
 * @see Design: Governance Payload Serialization Format
 * @see Requirements 13.9
 */

import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import {
  LedgerSerializationError,
  LedgerSerializationErrorType,
} from '../errors/ledgerSerializationError';
import { IAuthorizedSigner } from '../interfaces/ledger/authorizedSigner';
import {
  IBrightTrustPolicy,
  QuorumType,
} from '../interfaces/ledger/brightTrustPolicy';
import {
  GovernanceActionType,
  IGovernanceAction,
} from '../interfaces/ledger/governanceAction';
import { IGovernancePayload } from '../interfaces/ledger/governancePayload';
import { SignerRole } from '../interfaces/ledger/signerRole';
import { SignerStatus } from '../interfaces/ledger/signerStatus';

/** Governance payload type prefix byte. */
const GOVERNANCE_PREFIX = 0x01;

/** Subtype bytes. */
const SUBTYPE_GENESIS = 0x00;
const SUBTYPE_AMENDMENT = 0x01;

/** Action type byte mapping. */
const ACTION_TYPE_BYTES: Record<GovernanceActionType, number> = {
  [GovernanceActionType.AddSigner]: 0x00,
  [GovernanceActionType.RemoveSigner]: 0x01,
  [GovernanceActionType.ChangeRole]: 0x02,
  [GovernanceActionType.UpdateQuorum]: 0x03,
  [GovernanceActionType.SuspendSigner]: 0x04,
  [GovernanceActionType.ReactivateSigner]: 0x05,
  [GovernanceActionType.SetMemberData]: 0x06,
};

/** Reverse mapping from byte to action type. */
const BYTE_TO_ACTION_TYPE: Record<number, GovernanceActionType> = {};
for (const [key, value] of Object.entries(ACTION_TYPE_BYTES)) {
  BYTE_TO_ACTION_TYPE[value] = key as GovernanceActionType;
}

/** Role byte mapping. */
const ROLE_BYTES: Record<SignerRole, number> = {
  [SignerRole.Admin]: 0x00,
  [SignerRole.Writer]: 0x01,
  [SignerRole.Reader]: 0x02,
};

const BYTE_TO_ROLE: Record<number, SignerRole> = {
  0x00: SignerRole.Admin,
  0x01: SignerRole.Writer,
  0x02: SignerRole.Reader,
};

/** Status byte mapping. */
const STATUS_BYTES: Record<SignerStatus, number> = {
  [SignerStatus.Active]: 0x00,
  [SignerStatus.Suspended]: 0x01,
  [SignerStatus.Retired]: 0x02,
};

const BYTE_TO_STATUS: Record<number, SignerStatus> = {
  0x00: SignerStatus.Active,
  0x01: SignerStatus.Suspended,
  0x02: SignerStatus.Retired,
};

/** Quorum type byte mapping. */
const QUORUM_TYPE_BYTES: Record<QuorumType, number> = {
  [QuorumType.Unanimous]: 0x00,
  [QuorumType.Majority]: 0x01,
  [QuorumType.Threshold]: 0x02,
};

const BYTE_TO_QUORUM_TYPE: Record<number, QuorumType> = {
  0x00: QuorumType.Unanimous,
  0x01: QuorumType.Majority,
  0x02: QuorumType.Threshold,
};

/** Text encoder/decoder for UTF-8 string serialization. */
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Genesis initialization data embedded in the genesis governance payload.
 */
export interface IGenesisPayloadData {
  readonly brightTrustPolicy: IBrightTrustPolicy;
  readonly signers: readonly IAuthorizedSigner[];
}

export class GovernancePayloadSerializer {
  /**
   * Check if a payload Uint8Array is a governance payload (starts with 0x01).
   */
  static isGovernancePayload(payload: Uint8Array): boolean {
    return payload.length > 0 && payload[0] === GOVERNANCE_PREFIX;
  }

  /**
   * Serialize a governance payload into a Uint8Array with 0x01 prefix.
   * This produces an amendment-subtype payload.
   */
  serialize(payload: IGovernancePayload): Uint8Array {
    const actionBytes = this.serializeActions(payload.actions);
    const cosigBytes = this.serializeCosignatures(payload.cosignatures);

    // 1 (prefix) + 1 (subtype) + 2 (actionCount) + actions + 2 (cosigCount) + cosigs
    const totalSize = 1 + 1 + 2 + actionBytes.length + 2 + cosigBytes.length;
    const result = new Uint8Array(totalSize);
    let offset = 0;

    result[offset++] = GOVERNANCE_PREFIX;
    result[offset++] = SUBTYPE_AMENDMENT;

    // Action count (uint16 BE)
    const view = new DataView(
      result.buffer,
      result.byteOffset,
      result.byteLength,
    );
    view.setUint16(offset, payload.actions.length, false);
    offset += 2;

    // Actions
    result.set(actionBytes, offset);
    offset += actionBytes.length;

    // Cosignature count (uint16 BE)
    view.setUint16(offset, payload.cosignatures.length, false);
    offset += 2;

    // Cosignatures
    result.set(cosigBytes, offset);

    return result;
  }

  /**
   * Serialize a genesis governance payload with initial signer set and quorum policy.
   */
  serializeGenesis(data: IGenesisPayloadData): Uint8Array {
    const quorumBytes = this.serializeQuorumPolicy(data.brightTrustPolicy);
    const signerBytes = this.serializeSignerList(data.signers);

    // 1 (prefix) + 1 (subtype) + quorum + 2 (signerCount) + signers + 2 (cosigCount=0)
    const totalSize = 1 + 1 + quorumBytes.length + 2 + signerBytes.length + 2;
    const result = new Uint8Array(totalSize);
    let offset = 0;

    result[offset++] = GOVERNANCE_PREFIX;
    result[offset++] = SUBTYPE_GENESIS;

    // Quorum policy
    result.set(quorumBytes, offset);
    offset += quorumBytes.length;

    // Signer count (uint16 BE)
    const view = new DataView(
      result.buffer,
      result.byteOffset,
      result.byteLength,
    );
    view.setUint16(offset, data.signers.length, false);
    offset += 2;

    // Signers
    result.set(signerBytes, offset);
    offset += signerBytes.length;

    // Cosignature count = 0 for genesis
    view.setUint16(offset, 0, false);

    return result;
  }

  /**
   * Deserialize a Uint8Array (with 0x01 prefix) back into an IGovernancePayload.
   * For genesis payloads, also returns the genesis data.
   */
  deserialize(
    data: Uint8Array,
  ): IGovernancePayload & { genesis?: IGenesisPayloadData } {
    if (data.length < 4) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.DataTooShort,
        'Governance payload too short',
      );
    }

    if (data[0] !== GOVERNANCE_PREFIX) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.InvalidMagic,
        `Expected governance prefix 0x01, got 0x${data[0].toString(16).padStart(2, '0')}`,
      );
    }

    const subtype = data[1];
    let offset = 2;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    if (subtype === SUBTYPE_GENESIS) {
      return this.deserializeGenesis(data, offset, view);
    } else if (subtype === SUBTYPE_AMENDMENT) {
      return this.deserializeAmendment(data, offset, view);
    } else {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.UnsupportedVersion,
        `Unknown governance subtype: 0x${subtype.toString(16).padStart(2, '0')}`,
      );
    }
  }

  /**
   * Serialize the governance actions only (without cosignatures) for hashing/signing by co-signers.
   */
  serializeActionsForSigning(
    actions: readonly IGovernanceAction[],
  ): Uint8Array {
    const actionBytes = this.serializeActions(actions);
    // 2 (actionCount) + actions
    const result = new Uint8Array(2 + actionBytes.length);
    const view = new DataView(
      result.buffer,
      result.byteOffset,
      result.byteLength,
    );
    view.setUint16(0, actions.length, false);
    result.set(actionBytes, 2);
    return result;
  }

  // ---- Private serialization helpers ----

  private serializeActions(actions: readonly IGovernanceAction[]): Uint8Array {
    const parts: Uint8Array[] = [];
    for (const action of actions) {
      parts.push(this.serializeAction(action));
    }
    return concatUint8Arrays(parts);
  }

  private serializeAction(action: IGovernanceAction): Uint8Array {
    const parts: Uint8Array[] = [];

    // Action type byte
    parts.push(new Uint8Array([ACTION_TYPE_BYTES[action.type]]));

    switch (action.type) {
      case GovernanceActionType.AddSigner: {
        parts.push(serializePubKey(action.publicKey));
        parts.push(new Uint8Array([ROLE_BYTES[action.role]]));
        parts.push(this.serializeMetadata(action.metadata ?? new Map()));
        break;
      }
      case GovernanceActionType.RemoveSigner:
      case GovernanceActionType.SuspendSigner:
      case GovernanceActionType.ReactivateSigner: {
        parts.push(serializePubKey(action.publicKey));
        break;
      }
      case GovernanceActionType.ChangeRole: {
        parts.push(serializePubKey(action.publicKey));
        parts.push(new Uint8Array([ROLE_BYTES[action.newRole]]));
        break;
      }
      case GovernanceActionType.UpdateQuorum: {
        parts.push(this.serializeQuorumPolicy(action.newPolicy));
        break;
      }
      case GovernanceActionType.SetMemberData: {
        parts.push(serializePubKey(action.publicKey));
        parts.push(this.serializeMetadata(action.metadata));
        break;
      }
    }

    return concatUint8Arrays(parts);
  }

  private serializeQuorumPolicy(policy: IBrightTrustPolicy): Uint8Array {
    if (policy.type === QuorumType.Threshold) {
      const result = new Uint8Array(5);
      result[0] = QUORUM_TYPE_BYTES[policy.type];
      const view = new DataView(
        result.buffer,
        result.byteOffset,
        result.byteLength,
      );
      view.setUint32(1, policy.threshold ?? 1, false);
      return result;
    }
    return new Uint8Array([QUORUM_TYPE_BYTES[policy.type]]);
  }

  private serializeMetadata(metadata: ReadonlyMap<string, string>): Uint8Array {
    const parts: Uint8Array[] = [];
    // Entry count (uint16 BE)
    const countBuf = new Uint8Array(2);
    new DataView(countBuf.buffer).setUint16(0, metadata.size, false);
    parts.push(countBuf);

    // Sort keys for deterministic serialization
    const sortedEntries = [...metadata.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    );

    for (const [key, value] of sortedEntries) {
      const keyBytes = textEncoder.encode(key);
      const valueBytes = textEncoder.encode(value);

      const keyLenBuf = new Uint8Array(2);
      new DataView(keyLenBuf.buffer).setUint16(0, keyBytes.length, false);
      parts.push(keyLenBuf);
      parts.push(keyBytes);

      const valueLenBuf = new Uint8Array(2);
      new DataView(valueLenBuf.buffer).setUint16(0, valueBytes.length, false);
      parts.push(valueLenBuf);
      parts.push(valueBytes);
    }

    return concatUint8Arrays(parts);
  }

  private serializeSignerList(
    signers: readonly IAuthorizedSigner[],
  ): Uint8Array {
    const parts: Uint8Array[] = [];
    for (const signer of signers) {
      parts.push(serializePubKey(signer.publicKey));
      parts.push(new Uint8Array([ROLE_BYTES[signer.role]]));
      parts.push(new Uint8Array([STATUS_BYTES[signer.status]]));
      parts.push(this.serializeMetadata(signer.metadata));
    }
    return concatUint8Arrays(parts);
  }

  private serializeCosignatures(
    cosignatures: IGovernancePayload['cosignatures'],
  ): Uint8Array {
    const parts: Uint8Array[] = [];
    for (const cosig of cosignatures) {
      parts.push(serializePubKey(cosig.signerPublicKey));
      parts.push(new Uint8Array(cosig.signature));
    }
    return concatUint8Arrays(parts);
  }

  // ---- Private deserialization helpers ----

  private deserializeGenesis(
    data: Uint8Array,
    offset: number,
    view: DataView,
  ): IGovernancePayload & { genesis: IGenesisPayloadData } {
    // Quorum policy
    const { policy: brightTrustPolicy, bytesRead: quorumBytes } =
      this.deserializeQuorumPolicy(data, offset, view);
    offset += quorumBytes;

    // Signer count
    this.ensureBytes(data, offset, 2, 'signer count');
    const signerCount = view.getUint16(offset, false);
    offset += 2;

    // Signers
    const signers: IAuthorizedSigner[] = [];
    for (let i = 0; i < signerCount; i++) {
      const { signer, bytesRead } = this.deserializeSigner(data, offset, view);
      signers.push(signer);
      offset += bytesRead;
    }

    // Cosignature count
    this.ensureBytes(data, offset, 2, 'cosignature count');
    const cosigCount = view.getUint16(offset, false);
    offset += 2;

    const cosignatures = this.deserializeCosignatures(
      data,
      offset,
      view,
      cosigCount,
    );

    return {
      actions: [],
      cosignatures: cosignatures.cosigs,
      genesis: { brightTrustPolicy: brightTrustPolicy, signers },
    };
  }

  private deserializeAmendment(
    data: Uint8Array,
    offset: number,
    view: DataView,
  ): IGovernancePayload {
    // Action count
    this.ensureBytes(data, offset, 2, 'action count');
    const actionCount = view.getUint16(offset, false);
    offset += 2;

    // Actions
    const actions: IGovernanceAction[] = [];
    for (let i = 0; i < actionCount; i++) {
      const { action, bytesRead } = this.deserializeAction(data, offset, view);
      actions.push(action);
      offset += bytesRead;
    }

    // Cosignature count
    this.ensureBytes(data, offset, 2, 'cosignature count');
    const cosigCount = view.getUint16(offset, false);
    offset += 2;

    const cosignatures = this.deserializeCosignatures(
      data,
      offset,
      view,
      cosigCount,
    );

    return { actions, cosignatures: cosignatures.cosigs };
  }

  private deserializeAction(
    data: Uint8Array,
    offset: number,
    view: DataView,
  ): { action: IGovernanceAction; bytesRead: number } {
    const startOffset = offset;

    this.ensureBytes(data, offset, 1, 'action type');
    const actionTypeByte = data[offset++];
    const actionType = BYTE_TO_ACTION_TYPE[actionTypeByte];
    if (actionType === undefined) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.FieldOverflow,
        `Unknown action type byte: 0x${actionTypeByte.toString(16).padStart(2, '0')}`,
      );
    }

    switch (actionType) {
      case GovernanceActionType.AddSigner: {
        const { publicKey, bytesRead: pkBytes } = deserializePubKey(
          data,
          offset,
          view,
        );
        offset += pkBytes;
        this.ensureBytes(data, offset, 1, 'role');
        const role = BYTE_TO_ROLE[data[offset++]];
        if (role === undefined) {
          throw new LedgerSerializationError(
            LedgerSerializationErrorType.FieldOverflow,
            'Invalid role byte',
          );
        }
        const { metadata, bytesRead: metaBytes } = this.deserializeMetadata(
          data,
          offset,
          view,
        );
        offset += metaBytes;
        return {
          action: { type: actionType, publicKey, role, metadata },
          bytesRead: offset - startOffset,
        };
      }
      case GovernanceActionType.RemoveSigner:
      case GovernanceActionType.SuspendSigner:
      case GovernanceActionType.ReactivateSigner: {
        const { publicKey, bytesRead: pkBytes } = deserializePubKey(
          data,
          offset,
          view,
        );
        offset += pkBytes;
        return {
          action: { type: actionType, publicKey } as IGovernanceAction,
          bytesRead: offset - startOffset,
        };
      }
      case GovernanceActionType.ChangeRole: {
        const { publicKey, bytesRead: pkBytes } = deserializePubKey(
          data,
          offset,
          view,
        );
        offset += pkBytes;
        this.ensureBytes(data, offset, 1, 'new role');
        const newRole = BYTE_TO_ROLE[data[offset++]];
        if (newRole === undefined) {
          throw new LedgerSerializationError(
            LedgerSerializationErrorType.FieldOverflow,
            'Invalid role byte',
          );
        }
        return {
          action: { type: actionType, publicKey, newRole },
          bytesRead: offset - startOffset,
        };
      }
      case GovernanceActionType.UpdateQuorum: {
        const { policy, bytesRead: qBytes } = this.deserializeQuorumPolicy(
          data,
          offset,
          view,
        );
        offset += qBytes;
        return {
          action: { type: actionType, newPolicy: policy },
          bytesRead: offset - startOffset,
        };
      }
      case GovernanceActionType.SetMemberData: {
        const { publicKey, bytesRead: pkBytes } = deserializePubKey(
          data,
          offset,
          view,
        );
        offset += pkBytes;
        const { metadata, bytesRead: metaBytes } = this.deserializeMetadata(
          data,
          offset,
          view,
        );
        offset += metaBytes;
        return {
          action: { type: actionType, publicKey, metadata },
          bytesRead: offset - startOffset,
        };
      }
      default:
        throw new LedgerSerializationError(
          LedgerSerializationErrorType.FieldOverflow,
          `Unhandled action type: ${actionType}`,
        );
    }
  }

  private deserializeQuorumPolicy(
    data: Uint8Array,
    offset: number,
    view: DataView,
  ): { policy: IBrightTrustPolicy; bytesRead: number } {
    this.ensureBytes(data, offset, 1, 'quorum type');
    const quorumTypeByte = data[offset];
    const quorumType = BYTE_TO_QUORUM_TYPE[quorumTypeByte];
    if (quorumType === undefined) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.FieldOverflow,
        `Unknown quorum type byte: 0x${quorumTypeByte.toString(16).padStart(2, '0')}`,
      );
    }

    if (quorumType === QuorumType.Threshold) {
      this.ensureBytes(data, offset, 5, 'quorum threshold');
      const threshold = view.getUint32(offset + 1, false);
      return { policy: { type: quorumType, threshold }, bytesRead: 5 };
    }

    return { policy: { type: quorumType }, bytesRead: 1 };
  }

  private deserializeMetadata(
    data: Uint8Array,
    offset: number,
    view: DataView,
  ): { metadata: Map<string, string>; bytesRead: number } {
    const startOffset = offset;

    this.ensureBytes(data, offset, 2, 'metadata entry count');
    const entryCount = view.getUint16(offset, false);
    offset += 2;

    const metadata = new Map<string, string>();
    for (let i = 0; i < entryCount; i++) {
      // Key
      this.ensureBytes(data, offset, 2, 'metadata key length');
      const keyLen = view.getUint16(offset, false);
      offset += 2;
      this.ensureBytes(data, offset, keyLen, 'metadata key');
      const key = textDecoder.decode(data.subarray(offset, offset + keyLen));
      offset += keyLen;

      // Value
      this.ensureBytes(data, offset, 2, 'metadata value length');
      const valueLen = view.getUint16(offset, false);
      offset += 2;
      this.ensureBytes(data, offset, valueLen, 'metadata value');
      const value = textDecoder.decode(
        data.subarray(offset, offset + valueLen),
      );
      offset += valueLen;

      metadata.set(key, value);
    }

    return { metadata, bytesRead: offset - startOffset };
  }

  private deserializeSigner(
    data: Uint8Array,
    offset: number,
    view: DataView,
  ): { signer: IAuthorizedSigner; bytesRead: number } {
    const startOffset = offset;

    const { publicKey, bytesRead: pkBytes } = deserializePubKey(
      data,
      offset,
      view,
    );
    offset += pkBytes;

    this.ensureBytes(data, offset, 1, 'signer role');
    const role = BYTE_TO_ROLE[data[offset++]];
    if (role === undefined) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.FieldOverflow,
        'Invalid role byte in signer list',
      );
    }

    this.ensureBytes(data, offset, 1, 'signer status');
    const status = BYTE_TO_STATUS[data[offset++]];
    if (status === undefined) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.FieldOverflow,
        'Invalid status byte in signer list',
      );
    }

    const { metadata, bytesRead: metaBytes } = this.deserializeMetadata(
      data,
      offset,
      view,
    );
    offset += metaBytes;

    return {
      signer: { publicKey, role, status, metadata },
      bytesRead: offset - startOffset,
    };
  }

  private deserializeCosignatures(
    data: Uint8Array,
    offset: number,
    view: DataView,
    count: number,
  ): { cosigs: IGovernancePayload['cosignatures']; bytesRead: number } {
    const startOffset = offset;
    const cosigs: {
      signerPublicKey: Uint8Array;
      signature: SignatureUint8Array;
    }[] = [];

    for (let i = 0; i < count; i++) {
      const { publicKey, bytesRead: pkBytes } = deserializePubKey(
        data,
        offset,
        view,
      );
      offset += pkBytes;

      this.ensureBytes(data, offset, 64, 'cosignature');
      const signature = new Uint8Array(
        data.buffer,
        data.byteOffset + offset,
        64,
      ) as SignatureUint8Array;
      offset += 64;

      cosigs.push({
        signerPublicKey: publicKey,
        signature: new Uint8Array(signature) as SignatureUint8Array,
      });
    }

    return { cosigs, bytesRead: offset - startOffset };
  }

  private ensureBytes(
    data: Uint8Array,
    offset: number,
    needed: number,
    fieldName: string,
  ): void {
    if (offset + needed > data.length) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.FieldOverflow,
        `Not enough bytes for ${fieldName}: need ${needed} at offset ${offset}, have ${data.length - offset}`,
      );
    }
  }
}

// ---- Module-level utility functions ----

function serializePubKey(publicKey: Uint8Array): Uint8Array {
  const result = new Uint8Array(4 + publicKey.length);
  const view = new DataView(
    result.buffer,
    result.byteOffset,
    result.byteLength,
  );
  view.setUint32(0, publicKey.length, false);
  result.set(publicKey, 4);
  return result;
}

function deserializePubKey(
  data: Uint8Array,
  offset: number,
  view: DataView,
): { publicKey: Uint8Array; bytesRead: number } {
  if (offset + 4 > data.length) {
    throw new LedgerSerializationError(
      LedgerSerializationErrorType.FieldOverflow,
      'Not enough bytes for public key length',
    );
  }
  const keyLen = view.getUint32(offset, false);
  offset += 4;
  if (offset + keyLen > data.length) {
    throw new LedgerSerializationError(
      LedgerSerializationErrorType.FieldOverflow,
      `Not enough bytes for public key: need ${keyLen}, have ${data.length - offset}`,
    );
  }
  const publicKey = new Uint8Array(data.subarray(offset, offset + keyLen));
  return { publicKey, bytesRead: 4 + keyLen };
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
