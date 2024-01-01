import { Transform, TransformCallback } from "stream";
import { EthereumECIES } from "../ethereumECIES";
import { BlockSize } from "../enumerations/blockSizes";
import { randomBytes } from "crypto";

/**
 * Given encrypt the incoming stream in chunks of blocksize - ecieOverheadLength
 */
export class EciesEncryptionTransform extends Transform {
    private readonly chunkSize: number;
    private readonly receiverPublicKey: Buffer;
    constructor(blockSize: BlockSize, receiverPublicKey: Buffer) {
        super();
        this.chunkSize = (blockSize as number) - EthereumECIES.ecieOverheadLength;
        this.receiverPublicKey = receiverPublicKey;
    }
    // gather data until we have a chunkSize worth, then encrypt it and push it out
    private buffer: Buffer = Buffer.alloc(0);
    public override _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        while (this.buffer.length >= this.chunkSize) {
            const chunkToEncrypt = this.buffer.subarray(0, this.chunkSize);
            this.buffer = this.buffer.subarray(this.chunkSize);
            const encryptedChunk = EthereumECIES.encrypt(this.receiverPublicKey, chunkToEncrypt);
            this.push(encryptedChunk);
        }
        callback();
    }

    public override _flush(callback: TransformCallback): void {
        while (this.buffer.length > 0) {
            if (this.buffer.length >= this.chunkSize) {
                // Process a full chunk
                const chunkToEncrypt = this.buffer.subarray(0, this.chunkSize);
                this.buffer = this.buffer.subarray(this.chunkSize);
                const encryptedChunk = EthereumECIES.encrypt(this.receiverPublicKey, chunkToEncrypt);
                this.push(encryptedChunk);
            } else {
                // Handle the last chunk which might be smaller than chunkSize
                const padding = randomBytes(this.chunkSize - this.buffer.length);
                const finalChunkToEncrypt = Buffer.concat([this.buffer, padding]);
                const encryptedChunk = EthereumECIES.encrypt(this.receiverPublicKey, finalChunkToEncrypt);
                this.push(encryptedChunk);
                break; // Exit the loop as this is the last chunk
            }
        }
        callback();
    }
}