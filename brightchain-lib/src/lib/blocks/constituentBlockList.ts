import { randomBytes } from 'crypto';
import { BlockSize, CblHeaderSize, blockSizeToLength } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidBrandType } from '../enumerations/guidBrandType';
import { EthereumECIES } from '../ethereumECIES';
import { GuidV4 } from '../guid';
import { RawGuidBuffer, SignatureBuffer } from '../types';
import { EphemeralBlock } from './ephemeral';

export class ConstituentBlockListBlock extends EphemeralBlock {
  public override readonly blockType = BlockType.ConstituentBlockList;
  public override readonly reconstituted: boolean = true;
  public override readonly cbl: boolean = true;
  public override readonly hasHeader: boolean = true;
  public readonly cblIndex: number;
  public readonly cblCount: number;
  public readonly cblBlockIds: RawGuidBuffer[];
  public static makeCblHeader(
    creatorId: RawGuidBuffer,
    creatorSignature: SignatureBuffer,
    blockDataLength: number,
    dataLength: bigint,
    dateCreated: Date,
    cblIndex: number,
    cblCount: number
  ): Buffer {
    if (
      creatorId.length !== GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer)
    ) {
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
    isCbl.writeUInt8(1);
    const cblIndexBuffer = Buffer.alloc(4);
    cblIndexBuffer.writeUint32BE(cblIndex);
    const cblCountBuffer = Buffer.alloc(4);
    cblCountBuffer.writeUint32BE(cblCount);
    const header = Buffer.concat([
      creatorId, // 16 bytes
      creatorSignature, // 65 bytes
      blockDataLengthBuffer, // 4 bytes
      dataLengthBuffer, // 8 bytes
      dateCreatedBuffer, // 8 bytes
      isCbl, // 1 byte
      cblIndexBuffer, // 4 bytes
      cblCountBuffer, // 4 bytes
    ]); // 110 bytes
    if (header.length != CblHeaderSize) {
      throw new Error('Header length is incorrect');
    }
    return header;
  }
  public static makeCblBlocks(
    privateKey: Buffer,
    creatorId: RawGuidBuffer,
    blockSize: BlockSize,
    blockIds: RawGuidBuffer[],
    dateCreated?: Date
  ): ConstituentBlockListBlock[] {
    const guidLength = GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer);
    const blockLength: number = blockSizeToLength(blockSize);
    const availableLength: number =
      blockLength - CblHeaderSize;
    const maxIds: number = Math.floor(
      availableLength / guidLength
    );
    const cblCount: number = Math.ceil(blockIds.length / maxIds);
    const totalCblDataSize = BigInt(cblCount) * BigInt(guidLength);
    const cbls: ConstituentBlockListBlock[] = [];
    for (let i = 0; i < cblCount; i++) {
      const cblIndex = i;
      const cblBlockIds = blockIds.slice(i * maxIds, (i + 1) * maxIds);
      const cblData = Buffer.concat(cblBlockIds);
      const cblSignature = EthereumECIES.signMessage(privateKey, cblData);
      const cblHeader = ConstituentBlockListBlock.makeCblHeader(
        creatorId,
        cblSignature,
        cblData.length,
        totalCblDataSize,
        dateCreated ?? new Date(),
        cblIndex,
        cblCount
      );
      const paddingLength = blockLength - cblHeader.length - cblData.length;
      if (paddingLength < 0) {
        throw new Error('Padding length cannot be negative');
      }
      const padding = randomBytes(paddingLength);
      const cblBlockData = Buffer.concat([cblHeader, cblData, padding]);
      cbls.push(new ConstituentBlockListBlock(creatorId, cblSignature, cblData.length, totalCblDataSize, cblBlockData, cblIndex, cblCount, dateCreated ?? new Date()));
    }
    return cbls;
  }
  public static readCBLHeader(data: Buffer): {
    creatorId: RawGuidBuffer;
    creatorSignature: SignatureBuffer;
    blockDataLength: number;
    dataLength: bigint;
    cblIndex: number;
    cblCount: number;
    dateCreated: Date;
  } {
    let offset = 0;
    const creatorLength = GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer);
    const creatorId = data.subarray(offset, creatorLength) as RawGuidBuffer;
    offset += creatorLength;
    const creatorSignature = data.subarray(
      offset,
      offset + EthereumECIES.signatureLength
    ) as SignatureBuffer;
    offset += EthereumECIES.signatureLength;
    const blockDataLength = data.readUInt32BE(offset);
    offset += 4;
    const dataLength = data.readBigInt64BE(offset);
    offset += 8;
    const dateCreated = new Date(Number(data.readBigInt64BE(offset)));
    offset += 8;
    const isCbl: boolean = data.readUInt8(offset) == 1;
    offset += 1;
    if (!isCbl) {
      throw new Error('Not a CBL header');
    }
    const cblIndex = data.readUint32BE(offset);
    offset += 4;
    const cblCount = data.readUint32BE(offset);
    offset += 4;
    return {
      creatorId,
      creatorSignature,
      blockDataLength,
      dataLength,
      cblIndex,
      cblCount,
      dateCreated,
    };
  }
  public static newFromBuffer(data: Buffer) {
    const cblData = ConstituentBlockListBlock.readCBLHeader(data);
    const cblBlock = new ConstituentBlockListBlock(
      cblData.creatorId,
      cblData.creatorSignature,
      cblData.blockDataLength,
      cblData.dataLength,
      data,
      cblData.cblIndex,
      cblData.cblCount,
      cblData.dateCreated
    );
    return cblBlock;
  }
  constructor(creatorId: RawGuidBuffer, creatorSignature: SignatureBuffer, blockDataLength: number, dataLength: bigint, data: Buffer, cblIndex: number, cblCount: number, dateCreated?: Date) {
    super(creatorId, creatorSignature, blockDataLength, dataLength, data, true, dateCreated);
    const guidLength = GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer);
    this.cblIndex = cblIndex;
    this.cblCount = cblCount;
    const cblDataOffset = CblHeaderSize;
    this.cblBlockIds = [];
    for (
      let i = cblDataOffset;
      i < cblDataOffset + Number(dataLength);
      i += guidLength
    ) {
      const cblBlockId = data.subarray(
        i,
        i + guidLength
      ) as RawGuidBuffer;
      this.cblBlockIds.push(cblBlockId);
    }
  }
}
