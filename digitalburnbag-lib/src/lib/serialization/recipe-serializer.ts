import { CrcService } from '@digitaldefiance/ecies-lib';
import { DeserializationError } from '../errors';
import type { IRecipe } from '../interfaces';

const VERSION = 0x01;

/**
 * Deterministic binary serialization/deserialization of Recipe.
 * Format: version(1) | totalBlockCount(4) | blockIdCount(4) | blockIdSize(4) |
 *         blockIds(count*size) | hasErasureCoding(1) | [dataShards(4) | parityShards(4) |
 *         shardSize(4)] | crc16(2)
 *
 * Validates: Requirements 9.1–9.5
 */
export class RecipeSerializer {
  private static readonly crc = new CrcService();

  static serialize(recipe: IRecipe): Uint8Array {
    const blockIdCount = recipe.blockIds.length;
    const blockIdSize = blockIdCount > 0 ? recipe.blockIds[0].length : 0;
    const hasEC = recipe.erasureCoding != null;

    const bodyLen =
      1 + 4 + 4 + 4 + blockIdCount * blockIdSize + 1 + (hasEC ? 12 : 0);
    const buf = new Uint8Array(bodyLen + 2); // +2 for CRC-16
    const view = new DataView(buf.buffer);
    let offset = 0;

    buf[offset++] = VERSION;
    view.setUint32(offset, recipe.totalBlockCount, false);
    offset += 4;
    view.setUint32(offset, blockIdCount, false);
    offset += 4;
    view.setUint32(offset, blockIdSize, false);
    offset += 4;

    for (const id of recipe.blockIds) {
      buf.set(id, offset);
      offset += blockIdSize;
    }

    buf[offset++] = hasEC ? 0x01 : 0x00;
    if (hasEC && recipe.erasureCoding) {
      view.setUint32(offset, recipe.erasureCoding.dataShards, false);
      offset += 4;
      view.setUint32(offset, recipe.erasureCoding.parityShards, false);
      offset += 4;
      view.setUint32(offset, recipe.erasureCoding.shardSize, false);
      offset += 4;
    }

    const crc = RecipeSerializer.crc.crc16(buf.subarray(0, offset));
    buf.set(crc, offset);
    return buf;
  }

  static deserialize(data: Uint8Array): IRecipe {
    if (data.length < 16) {
      throw new DeserializationError('Recipe data too short');
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    // Verify CRC-16
    const crcOffset = data.length - 2;
    const storedCrc = data.subarray(crcOffset, crcOffset + 2);
    const computedCrc = RecipeSerializer.crc.crc16(data.subarray(0, crcOffset));
    if (storedCrc[0] !== computedCrc[0] || storedCrc[1] !== computedCrc[1]) {
      throw new DeserializationError('Recipe CRC-16 mismatch');
    }

    let offset = 0;
    const version = data[offset++];
    if (version !== VERSION) {
      throw new DeserializationError(`Unsupported recipe version: ${version}`);
    }

    const totalBlockCount = view.getUint32(offset, false);
    offset += 4;
    const blockIdCount = view.getUint32(offset, false);
    offset += 4;
    const blockIdSize = view.getUint32(offset, false);
    offset += 4;

    if (offset + blockIdCount * blockIdSize + 1 > crcOffset) {
      throw new DeserializationError('Recipe data truncated');
    }

    const blockIds: Uint8Array[] = [];
    for (let i = 0; i < blockIdCount; i++) {
      blockIds.push(data.slice(offset, offset + blockIdSize));
      offset += blockIdSize;
    }

    const hasEC = data[offset++] === 0x01;
    let erasureCoding: IRecipe['erasureCoding'];
    if (hasEC) {
      if (offset + 12 > crcOffset) {
        throw new DeserializationError('Recipe erasure coding data truncated');
      }
      erasureCoding = {
        dataShards: view.getUint32(offset, false),
        parityShards: view.getUint32(offset + 4, false),
        shardSize: view.getUint32(offset + 8, false),
      };
    }

    return { blockIds, totalBlockCount, erasureCoding };
  }
}
