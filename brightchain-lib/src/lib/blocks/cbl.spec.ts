import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import constants, { TUPLE_SIZE } from '../constants';
import { EmailString } from '../emailString';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize, blockSizeLengths } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import MemberType from '../enumerations/memberType';
import { GuidV4 } from '../guid';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { ConstituentBlockListBlock } from './cbl';
import { EphemeralBlock } from './ephemeral';

describe('ConstituentBlockListBlock', () => {
  let member: BrightChainMember;
  beforeAll(() => {
    member = BrightChainMember.newMember(
      MemberType.Admin,
      'test member',
      new EmailString('test@test.com'),
    );
  });

  it('should have an expected length for the header', () => {
    expect(ConstituentBlockListBlock.CblHeaderSize).toBe(
      constants.CBL_OVERHEAD_SIZE,
    );
  });
  it('should construct a CBL block correctly', () => {
    // Data to be stored.  Make it larger than one block to test splitting
    const data = randomBytes(blockSizeLengths[2] * 5);
    const blockSize = BlockSize.Large;
    const dataAddresses: Array<ChecksumBuffer> = [];
    const tupleSize = TUPLE_SIZE;

    // Generate mock checksums, simulating actual data blocks
    for (let i = 0; i < 5 * tupleSize; i++) {
      dataAddresses.push(
        StaticHelpersChecksum.calculateChecksum(
          randomBytes(blockSizeLengths[2]),
        ) as ChecksumBuffer,
      );
    }

    const cblBlock = new ConstituentBlockListBlock(
      blockSize,
      member,
      BigInt(data.length),
      dataAddresses,
    );

    expect(cblBlock.blockSize).toBe(blockSize);
    expect(cblBlock.blockType).toBe(BlockType.ConstituentBlockList);
    expect(cblBlock.blockDataType).toBe(BlockDataType.EphemeralStructuredData);
    expect(cblBlock.originalDataLength).toEqual(BigInt(data.length));
    expect(cblBlock.cblAddressCount).toBe(dataAddresses.length);
    expect(cblBlock.tupleSize).toBe(tupleSize);
    expect(cblBlock.addresses).toEqual(dataAddresses);
    expect(cblBlock.validateSignature(member)).toBeTruthy();
  });

  it('should throw if CBL address count is not a multiple of TupleSize', () => {
    const blockSize = BlockSize.Large;
    const dataAddresses: Array<ChecksumBuffer> = [
      StaticHelpersChecksum.calculateChecksum(
        randomBytes(100),
      ) as ChecksumBuffer,
    ]; // Not a multiple of TUPLE_SIZE
    const dataLength = 123n;

    expect(
      () =>
        new ConstituentBlockListBlock(
          blockSize,
          member,
          dataLength,
          dataAddresses,
        ),
    ).toThrow('CBL address count must be a multiple of TupleSize');
  });

  it('should throw if date created is in the future', () => {
    const blockSize = BlockSize.Large;
    const dataAddresses: Array<ChecksumBuffer> = [];
    for (let i = 0; i < TUPLE_SIZE; i++) {
      dataAddresses.push(
        StaticHelpersChecksum.calculateChecksum(
          randomBytes(blockSizeLengths[2]),
        ) as ChecksumBuffer,
      );
    }
    const dataLength = 123n;
    const futureDate = new Date(Date.now() + 100000);

    expect(
      () =>
        new ConstituentBlockListBlock(
          blockSize,
          member,
          dataLength,
          dataAddresses,
          futureDate,
        ),
    ).toThrow('Date created is in the future');
  });

  it('should throw if CBL address count is larger than the max for the block size', () => {
    // Create enough addresses to overflow the block, forcing an error
    const blockSize = BlockSize.Small;
    const addresses: ChecksumBuffer[] = [];
    const max = ConstituentBlockListBlock.CblBlockMaxIDCountsWithEncryption[0]; // Max for small block
    for (let i = 0; i < max + 1; i++) {
      addresses.push(
        StaticHelpersChecksum.calculateChecksum(
          randomBytes(100),
        ) as ChecksumBuffer,
      );
    }

    const cblAddressCount = addresses.length;
    const addressesBuffer = Buffer.concat(addresses);

    expect(() =>
      ConstituentBlockListBlock.makeCblHeader(
        member,
        new Date(),
        cblAddressCount,
        123n,
        addressesBuffer,
      ),
    ).toThrow('CBL address count is larger than the max for the block size');
  });

  it('should correctly read CBL header', () => {
    const blockSize = BlockSize.Large;
    const dataAddresses: Array<ChecksumBuffer> = [];
    const tupleSize = TUPLE_SIZE;

    for (let i = 0; i < tupleSize; i++) {
      dataAddresses.push(
        StaticHelpersChecksum.calculateChecksum(
          randomBytes(blockSizeLengths[2]),
        ) as ChecksumBuffer,
      );
    }

    const dataLength = 123n;
    const cblBlock = new ConstituentBlockListBlock(
      blockSize,
      member,
      dataLength,
      dataAddresses,
    );

    const header = ConstituentBlockListBlock.readCBLHeader(
      cblBlock.data,
      blockSize,
    );
    expect(header.creatorId).toEqual(member.id);
    expect(header.cblAddressCount).toBe(dataAddresses.length);
    expect(header.originalDataLength).toBe(dataLength);
    expect(header.tupleSize).toBe(tupleSize);
  });

  it('should calculate CBL address capacity correctly', () => {
    const blockSize = BlockSize.Medium;
    const capacity =
      ConstituentBlockListBlock.CalculateCBLAddressCapacity(blockSize);
    const expectedCapacity = Math.floor(
      (blockSizeLengths[1] -
        ConstituentBlockListBlock.CblHeaderSize -
        StaticHelpersECIES.eciesOverheadLength) /
        StaticHelpersChecksum.Sha3ChecksumBufferLength,
    );
    expect(capacity).toBe(expectedCapacity);
  });

  it('should correctly get the CBL block IDs', () => {
    const blockSize = BlockSize.Large;
    const dataAddresses: Array<ChecksumBuffer> = [];

    for (let i = 0; i < TUPLE_SIZE; i++) {
      dataAddresses.push(
        StaticHelpersChecksum.calculateChecksum(
          randomBytes(blockSizeLengths[2]),
        ) as ChecksumBuffer,
      );
    }

    const cblBlock = new ConstituentBlockListBlock(
      blockSize,
      member,
      BigInt(123),
      dataAddresses,
    );
    const cblBlockIds = cblBlock.getCblBlockIds();
    expect(cblBlockIds).toEqual(dataAddresses);
  });

  // Add tests for remaining methods and error conditions
  it('should correctly indicate when a block can be encrypted', () => {
    const blockSize = BlockSize.Large;
    const data = randomBytes(blockSizeLengths[2] * 5);
    const dataAddresses: Array<ChecksumBuffer> = [];

    for (let i = 0; i < 5 * TUPLE_SIZE; i++) {
      dataAddresses.push(
        StaticHelpersChecksum.calculateChecksum(
          randomBytes(blockSizeLengths[2]),
        ) as ChecksumBuffer,
      );
    }

    const cblBlock = new ConstituentBlockListBlock(
      blockSize,
      member,
      BigInt(data.length),
      dataAddresses,
    );
    expect(cblBlock.canEncrypt).toBe(true); // Should be true because mock block size is large
  });

  it('fileSizeToCBLBlockSize should return the correct block size', () => {
    const fileSize = BigInt(blockSizeLengths[1]) * 5n; // Should fit on a medium block
    const blockSize = ConstituentBlockListBlock.fileSizeToCBLBlockSize(
      fileSize,
      false,
    );
    expect(blockSize).toBe(BlockSize.Medium);
  });

  it('GetCBLAddressData should correctly get the CBL data from a block', () => {
    const blockSize = BlockSize.Large;
    const data = randomBytes(blockSizeLengths[2] * 5);
    const dataAddresses: Array<ChecksumBuffer> = [];
    const tupleSize = TUPLE_SIZE;

    for (let i = 0; i < tupleSize; i++) {
      dataAddresses.push(
        StaticHelpersChecksum.calculateChecksum(
          randomBytes(blockSizeLengths[2]),
        ) as ChecksumBuffer,
      );
    }

    const cblBlock = new ConstituentBlockListBlock(
      blockSize,
      member,
      BigInt(data.length),
      dataAddresses,
    );

    const actual = ConstituentBlockListBlock.GetCBLAddressData(cblBlock.data);
    const expected = cblBlock.data.subarray(
      ConstituentBlockListBlock.CblDataOffset,
    );
    expect(actual).toEqual(expected);
  });

  it('should have correct overhead', () => {
    // Data to be stored.  Make it larger than one block to test splitting
    const data = randomBytes(blockSizeLengths[2] * 5);
    const blockSize = BlockSize.Large;
    const dataAddresses: Array<ChecksumBuffer> = [];
    const tupleSize = TUPLE_SIZE;

    // Generate mock checksums, simulating actual data blocks
    for (let i = 0; i < 5 * tupleSize; i++) {
      dataAddresses.push(
        StaticHelpersChecksum.calculateChecksum(
          randomBytes(blockSizeLengths[2]),
        ) as ChecksumBuffer,
      );
    }

    const cblBlock = new ConstituentBlockListBlock(
      blockSize,
      member,
      BigInt(data.length),
      dataAddresses,
    );

    expect(cblBlock.overhead).toEqual(ConstituentBlockListBlock.CblHeaderSize);
    expect(cblBlock.layerOverheadData.length).toEqual(
      ConstituentBlockListBlock.CblHeaderSize,
    );
    expect(cblBlock.layerOverheadData).toEqual(
      cblBlock.data.subarray(0, ConstituentBlockListBlock.CblHeaderSize),
    );
  });

  it('should create from BaseBlock', () => {
    // Data to be stored.  Make it larger than one block to test splitting
    const blockCount = 5;
    const tupleSize = TUPLE_SIZE;
    const data = randomBytes(blockSizeLengths[2] * blockCount * tupleSize);
    const blockSize = BlockSize.Large;
    const dataAddresses: Array<ChecksumBuffer> = [];

    // Generate mock checksums, simulating actual data blocks
    for (let i = 0; i < blockCount * tupleSize; i++) {
      dataAddresses.push(
        StaticHelpersChecksum.calculateChecksum(
          data.subarray(i * blockSizeLengths[2], (i + 1) * blockSizeLengths[2]),
        ) as ChecksumBuffer,
      );
    }

    const cblBlock = new ConstituentBlockListBlock(
      blockSize,
      member,
      BigInt(data.length),
      dataAddresses,
    );

    const ephemeralBlock = new EphemeralBlock(
      BlockType.ConstituentBlockList,
      BlockDataType.EphemeralStructuredData,
      blockSize,
      cblBlock.data,
      undefined,
      member,
      undefined,
      undefined,
      true,
      false,
    );
    const fromBaseBlock =
      ConstituentBlockListBlock.fromBaseBlock(ephemeralBlock);
    expect(cblBlock.data).toEqual(fromBaseBlock.data);
    expect(cblBlock.payload).toEqual(
      fromBaseBlock.data.subarray(ConstituentBlockListBlock.CblHeaderSize),
    );
  });

  it('makeCblHeader should throw an error if creator is not a BrightChainMember and no signature is provided', () => {
    const blockSize = BlockSize.Large;
    const dataAddresses: Array<ChecksumBuffer> = [];
    const tupleSize = TUPLE_SIZE;

    for (let i = 0; i < tupleSize; i++) {
      dataAddresses.push(
        StaticHelpersChecksum.calculateChecksum(
          randomBytes(blockSizeLengths[2]),
        ) as ChecksumBuffer,
      );
    }
    const dataLength = 123n;
    const creatorId = GuidV4.new();

    expect(() =>
      ConstituentBlockListBlock.makeCblHeader(
        creatorId,
        new Date(),
        tupleSize,
        dataLength,
        Buffer.concat(dataAddresses),
      ),
    ).toThrow(
      'Creator must be a BrightChainMember or a signature must be provided',
    );
  });
});
