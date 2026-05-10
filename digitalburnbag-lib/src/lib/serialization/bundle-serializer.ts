import { CrcService } from '@digitaldefiance/ecies-lib';
import { DeserializationError } from '../errors';
import type { IDestructionProof, IVerificationBundle } from '../interfaces';

const VERSION = 0x01;

/**
 * Deterministic binary serialization/deserialization of VerificationBundle.
 * Format: version(1) | merkleRoot(64) | accessSeal(64) | creatorPublicKey(33) |
 *         treeDepth(4) | bloomWitnessLength(4) | bloomWitness(var) |
 *         hasDestructionProof(1) | [destructionProof(var)] | crc16(2)
 *
 * Validates: Requirements 8.1–8.6
 */
export class BundleSerializer {
  private static readonly crc = new CrcService();

  static serialize(bundle: IVerificationBundle): Uint8Array {
    const hasProof = bundle.destructionProof != null;
    let proofBytes: Uint8Array | null = null;
    if (hasProof && bundle.destructionProof) {
      proofBytes = BundleSerializer.serializeProof(bundle.destructionProof);
    }

    const bodyLen =
      1 +
      64 +
      64 +
      33 +
      4 +
      4 +
      bundle.bloomWitness.length +
      1 +
      (proofBytes ? proofBytes.length : 0);
    const buf = new Uint8Array(bodyLen + 2);
    const view = new DataView(buf.buffer);
    let offset = 0;

    buf[offset++] = VERSION;
    buf.set(bundle.merkleRoot, offset);
    offset += 64;
    buf.set(bundle.accessSeal, offset);
    offset += 64;
    buf.set(bundle.creatorPublicKey, offset);
    offset += 33;
    view.setUint32(offset, bundle.treeDepth, false);
    offset += 4;
    view.setUint32(offset, bundle.bloomWitness.length, false);
    offset += 4;
    buf.set(bundle.bloomWitness, offset);
    offset += bundle.bloomWitness.length;
    buf[offset++] = hasProof ? 0x01 : 0x00;
    if (proofBytes) {
      buf.set(proofBytes, offset);
      offset += proofBytes.length;
    }

    const crc = BundleSerializer.crc.crc16(buf.subarray(0, offset));
    buf.set(crc, offset);
    return buf;
  }

  static deserialize(data: Uint8Array): IVerificationBundle {
    if (data.length < 173) {
      // minimum: 1+64+64+33+4+4+0+1+2
      throw new DeserializationError('Bundle data too short');
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    // Verify CRC-16
    const crcOffset = data.length - 2;
    const storedCrc = data.subarray(crcOffset, crcOffset + 2);
    const computedCrc = BundleSerializer.crc.crc16(data.subarray(0, crcOffset));
    if (storedCrc[0] !== computedCrc[0] || storedCrc[1] !== computedCrc[1]) {
      throw new DeserializationError('Bundle CRC-16 mismatch');
    }

    let offset = 0;
    const version = data[offset++];
    if (version !== VERSION) {
      throw new DeserializationError(`Unsupported bundle version: ${version}`);
    }

    const merkleRoot = data.slice(offset, offset + 64);
    offset += 64;
    const accessSeal = data.slice(offset, offset + 64);
    offset += 64;
    const creatorPublicKey = data.slice(offset, offset + 33);
    offset += 33;
    const treeDepth = view.getUint32(offset, false);
    offset += 4;
    const bwLen = view.getUint32(offset, false);
    offset += 4;

    if (offset + bwLen + 1 > crcOffset) {
      throw new DeserializationError('Bundle data truncated');
    }
    const bloomWitness = data.slice(offset, offset + bwLen);
    offset += bwLen;
    const hasProof = data[offset++] === 0x01;

    let destructionProof: IDestructionProof | undefined;
    if (hasProof) {
      destructionProof = BundleSerializer.deserializeProof(
        data,
        offset,
        crcOffset,
      );
    }

    return {
      version: VERSION,
      merkleRoot,
      accessSeal,
      creatorPublicKey,
      bloomWitness,
      treeDepth,
      destructionProof,
    };
  }

  private static serializeProof(proof: IDestructionProof): Uint8Array {
    const len = 32 + 32 + 8 + 1 + proof.signature.length + 33;
    const buf = new Uint8Array(len);
    const view = new DataView(buf.buffer);
    let offset = 0;
    buf.set(proof.treeSeed, offset);
    offset += 32;
    buf.set(proof.nonce, offset);
    offset += 32;
    view.setBigUint64(offset, BigInt(proof.timestamp), false);
    offset += 8;
    buf[offset++] = proof.signature.length;
    buf.set(proof.signature, offset);
    offset += proof.signature.length;
    buf.set(proof.creatorPublicKey, offset);
    return buf;
  }

  private static deserializeProof(
    data: Uint8Array,
    start: number,
    end: number,
  ): IDestructionProof {
    let offset = start;
    if (offset + 32 + 32 + 8 + 1 > end) {
      throw new DeserializationError('Destruction proof truncated');
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const treeSeed = data.slice(offset, offset + 32);
    offset += 32;
    const nonce = data.slice(offset, offset + 32);
    offset += 32;
    const timestamp = Number(view.getBigUint64(offset, false));
    offset += 8;
    const sigLen = data[offset++];
    if (offset + sigLen + 33 > end) {
      throw new DeserializationError('Destruction proof signature truncated');
    }
    const signature = data.slice(offset, offset + sigLen);
    offset += sigLen;
    const creatorPublicKey = data.slice(offset, offset + 33);
    return { treeSeed, nonce, timestamp, signature, creatorPublicKey };
  }
}
