import { Transform, TransformCallback, TransformOptions } from 'stream';
import { ECIES } from '../constants';
import { BlockSize } from '../enumerations/blockSize';
import { StreamErrorType } from '../enumerations/streamErrorType';
import { StreamError } from '../errors/streamError';
import { ECIESService } from '../services/ecies.service';

export class EciesDecryptionTransform extends Transform {
  private readonly blockSize: number; // Keep for context if needed, not used for parsing
  private readonly privateKey: Buffer;
  private buffer: Buffer;
  private readonly logger: Console;
  private readonly eciesService: ECIESService;

  constructor(
    privateKey: Buffer,
    blockSize: BlockSize, // Keep blockSize parameter for consistency
    options?: TransformOptions,
    logger: Console = console,
  ) {
    super(options);
    this.logger = logger;
    this.privateKey = privateKey;
    this.blockSize = blockSize as number; // Store for context
    this.buffer = Buffer.alloc(0);
    this.eciesService = new ECIESService();
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

      const LENGTH_PREFIX_SIZE = 4;

      // Process blocks using the length prefix
      while (this.buffer.length >= LENGTH_PREFIX_SIZE) {
        // Read the length prefix
        const blockLength = this.buffer.readUInt32BE(0);

        // Check if we have the length prefix + the full block data
        const totalPrefixedBlockSize = LENGTH_PREFIX_SIZE + blockLength;
        if (this.buffer.length >= totalPrefixedBlockSize) {
          // Extract the actual encrypted block (without the length prefix)
          const encryptedBlock = this.buffer.subarray(
            LENGTH_PREFIX_SIZE,
            totalPrefixedBlockSize,
          );

          // Ensure the extracted block isn't smaller than the ECIES overhead
          if (encryptedBlock.length < ECIES.OVERHEAD_SIZE) {
            throw new StreamError(
              StreamErrorType.IncompleteEncryptedBlock,
              undefined,
              {
                blockLength: blockLength.toString(),
                requiredOverhead: ECIES.OVERHEAD_SIZE.toString(),
              },
            );
          }

          try {
            // Decrypt the extracted block
            const { decrypted, consumedBytes } =
              this.eciesService.decryptSingleWithHeaderEx(
                this.privateKey,
                encryptedBlock,
              );

            // Sanity check: The consumedBytes reported by decryptSingleWithHeader
            // should match the actual length of the encrypted block we passed in.
            if (consumedBytes !== encryptedBlock.length) {
              // This indicates an internal inconsistency or a problem with how
              // decryptSingleWithHeader determines consumed bytes for the given block.
              throw new Error(
                `Internal inconsistency: consumedBytes (${consumedBytes}) !== encryptedBlock.length (${encryptedBlock.length})`,
              );
            }

            // Push the decrypted data
            this.push(decrypted);

            // Advance the buffer past the length prefix and the processed block
            this.buffer = this.buffer.subarray(totalPrefixedBlockSize);
          } catch (decryptError) {
            // Log and halt on decryption errors
            this.logger.error('Block decryption error:', {
              error: decryptError, // The actual error object
              bufferLength: this.buffer.length,
              blockLengthFromPrefix: blockLength,
              privateKeyLength: this.privateKey.length,
            });
            callback(
              decryptError instanceof Error
                ? decryptError
                : new Error(String(decryptError)),
            );
            return; // Stop processing on error
          }
        } else {
          // Not enough data for the full block yet, wait for more.
          break; // Exit the while loop
        }
      }

      // If no error occurred during the loop, signal success for this chunk
      callback();
    } catch (error) {
      // Handle potential errors from buffer reading or other issues
      this.logger.error('Transform error details:', {
        error,
        blockSize: this.blockSize, // Keep blockSize for context
        bufferLength: this.buffer.length,
        chunkLength: chunk.length,
        privateKeyLength: this.privateKey.length,
      });
      const finalError =
        error instanceof Error ? error : new Error('Decryption failed');
      this.logger.error('Transform error:', finalError);
      callback(finalError);
    }
  }

  public override _flush(callback: TransformCallback): void {
    try {
      // Handle any remaining data in the buffer upon stream end
      if (this.buffer.length > 0) {
        const LENGTH_PREFIX_SIZE = 4;
        // Check if the remaining data is enough for a length prefix
        if (this.buffer.length < LENGTH_PREFIX_SIZE) {
          const flushError = new StreamError(
            StreamErrorType.IncompleteEncryptedBlock,
            undefined,
            {
              remainingBufferLength: this.buffer.length.toString(),
              requiredMinLength: LENGTH_PREFIX_SIZE.toString(),
            },
          );
          this.logger.error(
            'Flush error - remaining buffer too small for length prefix:',
            {
              remainingBufferLength: this.buffer.length,
              requiredMinLength: LENGTH_PREFIX_SIZE,
            },
          );
          callback(flushError);
          return;
        }

        // Read the length prefix for the final block
        const blockLength = this.buffer.readUInt32BE(0);
        const totalPrefixedBlockSize = LENGTH_PREFIX_SIZE + blockLength;

        // Check if the remaining buffer matches the expected final block size
        if (this.buffer.length !== totalPrefixedBlockSize) {
          const flushError = new StreamError(
            StreamErrorType.IncompleteEncryptedBlock,
            undefined,
            {
              remainingBufferLength: this.buffer.length.toString(),
              expectedBlockLength: totalPrefixedBlockSize.toString(),
            },
          );
          this.logger.error('Flush error - remaining buffer length mismatch:', {
            remainingBufferLength: this.buffer.length,
            expectedBlockLength: totalPrefixedBlockSize,
          });
          callback(flushError);
          return;
        }

        // Extract the final encrypted block
        const encryptedBlock = this.buffer.subarray(
          LENGTH_PREFIX_SIZE,
          totalPrefixedBlockSize,
        );

        // Ensure the final block isn't smaller than the ECIES overhead
        if (encryptedBlock.length < ECIES.OVERHEAD_SIZE) {
          throw new StreamError(
            StreamErrorType.IncompleteEncryptedBlock,
            undefined,
            {
              blockLength: blockLength.toString(),
              requiredOverhead: ECIES.OVERHEAD_SIZE.toString(),
            },
          );
        }

        // Attempt to decrypt the final remaining buffer content
        try {
          // decryptSingleWithHeaderEx returns { decrypted, consumedBytes }
          // We only need the decrypted part for the final push.
          // We also expect consumedBytes to equal encryptedBlock.length here.
          const { decrypted, consumedBytes } =
            this.eciesService.decryptSingleWithHeaderEx(
              this.privateKey,
              encryptedBlock, // Pass only the final block
            );

          // Sanity check
          if (consumedBytes !== encryptedBlock.length) {
            throw new Error(
              `Internal inconsistency during flush: consumedBytes (${consumedBytes}) !== encryptedBlock.length (${encryptedBlock.length})`,
            );
          }

          this.push(decrypted);
          this.buffer = Buffer.alloc(0); // Clear buffer after processing
        } catch (error) {
          this.logger.error('Flush decryption error:', {
            error,
            bufferLength: this.buffer.length, // Log remaining buffer before clearing attempt
            blockLengthFromPrefix: blockLength,
            blockSize: this.blockSize,
          });
          callback(error instanceof Error ? error : new Error(String(error)));
          return;
        }
      }
      // Signal successful flush if buffer is empty or was processed successfully
      callback();
    } catch (error) {
      // Catch any unexpected errors during flush logic
      this.logger.error('Flush error:', {
        // Simplified log context
        error,
      });
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
