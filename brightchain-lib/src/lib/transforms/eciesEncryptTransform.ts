import { Transform, TransformCallback } from 'stream';
import { BlockSize } from '../enumerations/blockSize';
import { ECIESService, getNodeRuntimeConfiguration } from '@digitaldefiance/node-ecies-lib';
import { GuidV4Provider } from '@digitaldefiance/ecies-lib';
import { EciesEncryptionTypeEnum } from '@digitaldefiance/ecies-lib';

/**
 * Transform stream that encrypts data using ECIES encryption
 */
export class EciesEncryptTransform extends Transform {
  private readonly blockSize: number;
  private readonly receiverPublicKey: Buffer;
  private buffer: Buffer;
  private readonly capacityPerBlock: number;
  private readonly logger: Console;
  private readonly eciesService: ECIESService;

  constructor(
    blockSize: BlockSize,
    receiverPublicKey: Buffer,
    logger: Console = console,
    eciesService?: ECIESService,
  ) {
    super();
    this.logger = logger;
    this.blockSize = blockSize as number;
    
    // Validate public key size (should be 33 bytes for compressed or 65 bytes for uncompressed secp256k1 public key)
    if (receiverPublicKey.length !== 33 && receiverPublicKey.length !== 65) {
      throw new Error(`Invalid public key length: expected 33 or 65 bytes, got ${receiverPublicKey.length}`);
    }
    
    this.receiverPublicKey = receiverPublicKey;
    this.buffer = Buffer.alloc(0);
    
    // Use provided service or create one with GuidV4Provider config
    if (eciesService) {
      this.eciesService = eciesService;
    } else {
      const config = getNodeRuntimeConfiguration();
      this.eciesService = new ECIESService(undefined, config.ECIES);
    }

    // Calculate how much data we can encrypt per block
    const encryptedLength = this.eciesService.computeEncryptedLengthFromDataLength(
      this.blockSize,
      'simple',
    );
    // For Simple encryption, capacity = blockSize - overhead
    this.capacityPerBlock = this.blockSize - (encryptedLength - this.blockSize);
  }

  public override _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    try {
      if (chunk.length === 0) {
        callback();
        return;
      }

      // Add new chunk to buffer
      this.buffer = Buffer.concat([this.buffer, chunk]);

      // Process complete blocks
      while (this.buffer.length >= this.capacityPerBlock) {
        const blockData = this.buffer.subarray(0, this.capacityPerBlock);
        this.buffer = this.buffer.subarray(this.capacityPerBlock);

        const encryptedBlock = this.eciesService.encryptSimpleOrSingle(
          true, // encryptSimple = true
          this.receiverPublicKey,
          blockData,
        );
        this.push(encryptedBlock);
      }

      callback();
    } catch (error) {
      // Create final error with message
      const finalError =
        error instanceof Error
          ? new Error(`Encryption failed: ${error.message}`)
          : new Error('Encryption failed');

      // Log errors before emitting
      this.logger.error('Encryption error:', finalError);
      this.logger.error('Error details:', {
        error,
        publicKeyLength: this.receiverPublicKey.length,
        publicKeyPrefix: this.receiverPublicKey.subarray(0, 4),
        dataLength: chunk.length,
        blockSize: this.blockSize,
        bufferLength: this.buffer.length,
        capacityPerBlock: this.capacityPerBlock,
      });

      // Emit error event and call callback
      setImmediate(() => {
        this.emit('error', finalError);
        callback(finalError);
      });
    }
  }

  public override _flush(callback: TransformCallback): void {
    try {
      // Handle any remaining data in buffer
      if (this.buffer.length > 0) {
        const encryptedBlock = this.eciesService.encryptSimpleOrSingle(
          true, // encryptSimple = true
          this.receiverPublicKey,
          this.buffer,
        );
        this.push(encryptedBlock);
      }
      callback();
    } catch (error) {
      const finalError =
        error instanceof Error ? error : new Error('Encryption failed');
      this.logger.error('Flush error:', finalError);
      callback(finalError);
    }
  }
}
