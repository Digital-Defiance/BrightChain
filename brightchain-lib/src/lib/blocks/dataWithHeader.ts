import { randomBytes } from 'crypto';
import { BlockSize, blockSizeToLength } from '../enumerations/blockSizes';
import { GuidBrandType } from '../enumerations/guidBrandType';
import { EthereumECIES } from '../ethereumECIES';
import { GuidV4 } from '../guid';
import { ChecksumBuffer, RawGuidBuffer } from '../types';
import { EphemeralBlock } from './ephemeral';
import { BlockType } from '../enumerations/blockType';
/**
 * Data block with a header containing creator ID, creator signature, data length, and date created
 * Not used with CBL blocks
 */
export class DataWithHeaderBlock extends EphemeralBlock {
  public override readonly blockType: BlockType = BlockType.OwnedDataBlock;

  public static makeDataHeader(creatorId: RawGuidBuffer, creatorSignature: ChecksumBuffer, blockDataLength: number, dataLength: bigint, dateCreated: Date): Buffer {
    if (creatorId.length !== GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer)) {
      throw new Error('Creator ID must be a raw guid buffer');
    }
    if (creatorSignature.length != EthereumECIES.signatureLength) {
      throw new Error('Creator signature must be a valid signature');
    }
    const blockDataLengthBuffer = Buffer.alloc(4);
    blockDataLengthBuffer.writeUInt32BE(blockDataLength);
    const dataLengthBuffer = Buffer.alloc(8);
    dataLengthBuffer.writeBigInt64BE(dataLength);
    const dateCreatedBuffer = Buffer.alloc(8);
    dateCreatedBuffer.writeBigInt64BE(BigInt(dateCreated.getTime()));
    const isCbl = Buffer.alloc(1);
    isCbl.writeUInt8(0);
    return Buffer.concat([
      creatorId, // 16 bytes
      creatorSignature, // 65 bytes
      blockDataLengthBuffer, // 4 bytes
      dataLengthBuffer, // 8 bytes
      dateCreatedBuffer, // 8 bytes
      isCbl // 1 byte
    ]); // 102 bytes
  }

  public static makeData(blockSize: BlockSize, header: Buffer, data: Buffer): Buffer {
    const blockLength = blockSizeToLength(blockSize);
    const headerLength = header.length;
    const dataLength = data.length;
    if (headerLength + dataLength > blockLength) {
      throw new Error('Header and data length cannot exceed block length');
    }
    const paddingLength = blockLength - dataLength - headerLength;
    const padding = randomBytes(paddingLength);
    return Buffer.concat([header, data, padding]);
  }

  public static readDataHeader(data: Buffer): { creatorId: RawGuidBuffer, creatorSignature: ChecksumBuffer, blockDataLength: number, dataLength: bigint, dateCreated: Date, isCbl: boolean, data: Buffer } {
    let offset = 0;
    const creatorLength = GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer);
    const creatorId = data.subarray(offset, creatorLength) as RawGuidBuffer;
    offset += creatorLength;
    const creatorSignature = data.subarray(offset, offset + EthereumECIES.signatureLength) as ChecksumBuffer;
    offset += EthereumECIES.signatureLength;
    const blockDataLength = data.readUInt32BE(offset);
    offset += 4;
    const dataLength = data.readBigInt64BE(offset);
    offset += 8;
    const dateCreated = new Date(Number(data.readBigInt64BE(offset)));
    const isCbl: boolean = data.readUInt8(offset) == 1;
    offset += 1;
    const actualData = data.subarray(offset, offset + Number(dataLength));
    return { creatorId, creatorSignature, blockDataLength, dataLength, dateCreated, isCbl, data: actualData };
  }
}