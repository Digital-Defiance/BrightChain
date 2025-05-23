import { createECDH, randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { EmailString } from '../emailString';
import { BlockDataType } from '../enumerations/blockDataType';
import { lengthToClosestBlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { MemberType } from '../enumerations/memberType';
import { GuidV4 } from '../guid';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { StaticHelpersVoting } from '../staticHelpers.voting';
import { MultiEncryptedBlock } from './multiEncrypted';

describe('MultiEncryptedBlock', () => {
  it('should calculate and validate checksum', async () => {
    // Create a test recipient with proper key pair
    const ecdh = createECDH('secp256k1');
    ecdh.generateKeys();
    const publicKey = ecdh.getPublicKey();
    const privateKey = ecdh.getPrivateKey();

    const votingKeyPair = await StaticHelpersVoting.generateVotingKeyPair();
    const recipient = new BrightChainMember(
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
      publicKey,
      votingKeyPair.publicKey,
      privateKey, // Include private key for decryption
      undefined, // no wallet
      GuidV4.new(), // Use GuidV4.new() to generate GUID
    );

    // Create test data
    const data = Buffer.from('test data');

    // Encrypt the data for the recipient
    const encryptedResult = StaticHelpersECIES.encryptMultiple(
      [recipient],
      data,
    );
    const encryptedBuffer =
      StaticHelpersECIES.multipleEncryptResultsToBuffer(encryptedResult);

    // Calculate the minimum block size needed for our data
    const blockSize = lengthToClosestBlockSize(encryptedBuffer.data.length);

    // Create a padded buffer with random data
    const paddedData = randomBytes(blockSize);
    // Copy data into the final buffer, preserving the full block size
    encryptedBuffer.data.copy(
      paddedData,
      0,
      0,
      Math.min(encryptedBuffer.data.length, blockSize),
    );

    // Calculate checksum of the padded data
    const calculatedChecksum =
      await StaticHelpersChecksum.calculateChecksumAsync(paddedData);

    // Create the block with encrypted data
    const block = await MultiEncryptedBlock.from(
      BlockType.MultiEncryptedBlock,
      BlockDataType.EncryptedData,
      blockSize,
      paddedData, // Use the padded data that matches our checksum
      calculatedChecksum, // Pass the pre-calculated checksum
      recipient,
      undefined,
      data.length,
    );

    // The block's checksum should match what we calculated
    expect(block.idChecksum).toEqual(calculatedChecksum);

    // Calculate new checksum from block data without padding
    await expect(block.validateAsync()).resolves.toBeUndefined();
  });
});
