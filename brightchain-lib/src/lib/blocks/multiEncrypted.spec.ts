import { createECDH, randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { EmailString } from '../emailString';
import { BlockDataType } from '../enumerations/blockDataType';
import { lengthToClosestBlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { MemberType } from '../enumerations/memberType';
import { GuidV4 } from '../guid';
import { ChecksumService } from '../services/checksum.service';
import { ECIESService } from '../services/ecies.service';
import { ServiceProvider } from '../services/service.provider';
import { VotingService } from '../services/voting.service';
import { MultiEncryptedBlock } from './multiEncrypted';

describe('MultiEncryptedBlock', () => {
  let eciesService: ECIESService;
  let checksumService: ChecksumService;
  let votingService: VotingService;

  beforeEach(() => {
    eciesService = ServiceProvider.getInstance().eciesService;
    checksumService = ServiceProvider.getInstance().checksumService;
    votingService = ServiceProvider.getInstance().votingService;
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  it('should calculate and validate checksum', async () => {
    // Create a test recipient with proper key pair
    const ecdh = createECDH('secp256k1');
    ecdh.generateKeys();
    const publicKey = ecdh.getPublicKey();
    const privateKey = ecdh.getPrivateKey();

    const votingKeyPair = votingService.generateVotingKeyPair();
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

    // Create test data and encrypt it
    const data = Buffer.from('test data');
    const encryptedResult = eciesService.encryptMultiple([recipient], data);

    // Use the actual encryptedMessage directly
    const formattedData = Buffer.concat([
      encryptedResult.encryptedMessage,
      Buffer.alloc(0), // No additional data needed
    ]);

    // Calculate the minimum block size needed for our data
    const blockSize = lengthToClosestBlockSize(formattedData.length);

    // Create a padded buffer with random data
    const paddedData = randomBytes(blockSize);
    // Copy data into the final buffer, preserving the full block size
    formattedData.copy(
      paddedData,
      0,
      0,
      Math.min(formattedData.length, blockSize),
    );

    // Calculate checksum of the padded data
    const calculatedChecksum = checksumService.calculateChecksum(paddedData);

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
