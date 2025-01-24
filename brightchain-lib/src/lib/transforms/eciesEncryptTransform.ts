import { Transform, TransformCallback } from 'stream';
import { BlockSize } from '../enumerations/blockSizes';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';

/**
 * Transform stream that encrypts data using ECIES encryption
 */
export class EciesEncryptTransform extends Transform {
  private readonly blockSize: number;
  private readonly receiverPublicKey: Buffer;
  private buffer: Buffer;
  private readonly capacityPerBlock: number;
  private readonly logger: Console;

  constructor(
    blockSize: BlockSize,
    receiverPublicKey: Buffer,
    logger: Console = console,
  ) {
    super();
    this.logger = logger;
    this.blockSize = blockSize as number;
    this.receiverPublicKey = receiverPublicKey;
    this.buffer = Buffer.alloc(0);

    // Calculate how much data we can encrypt per block
    const { capacityPerBlock } =
      StaticHelpersECIES.computeEncryptedLengthFromDataLength(
        this.blockSize,
        this.blockSize,
      );
    this.capacityPerBlock = capacityPerBlock;
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

        const encryptedBlock = StaticHelpersECIES.encrypt(
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
        const encryptedBlock = StaticHelpersECIES.encrypt(
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
