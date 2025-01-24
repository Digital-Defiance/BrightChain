import { Blake2bCTX, blake2bFinal, blake2bInit, blake2bUpdate } from 'blakejs';

export class SecureDeterministicDRBG {
  private state: Blake2bCTX;
  private counter: bigint;
  private lastOutput: Buffer;

  constructor(seed: Uint8Array) {
    this.state = blake2bInit(64); // Initialize with output length of 64 bytes
    this.counter = 0n;
    this.lastOutput = Buffer.alloc(0);
    this.reseed(seed);
  }

  /** Reseed the DRBG with new seed material
   * @param seed - The seed material
   * @returns void
   */
  reseed(seed: Uint8Array): void {
    this.state = blake2bInit(64);
    blake2bUpdate(this.state, seed);
    this.counter = 0n;
    // Generate initial state
    const initialState = blake2bFinal(this.state);
    this.lastOutput = Buffer.from(initialState);
    this.state = blake2bInit(64);
    blake2bUpdate(this.state, this.lastOutput);
  }

  generateBytes(length: number): Uint8Array {
    if (length <= 0) {
      return new Uint8Array(0);
    }

    const output = new Uint8Array(length);
    let offset = 0;

    while (offset < length) {
      // Update state with counter
      const counterBytes = this.bigIntToUint8Array(this.counter, 8);
      const newState = blake2bInit(64);
      blake2bUpdate(newState, this.lastOutput);
      blake2bUpdate(newState, counterBytes);

      // Generate new block
      const block = blake2bFinal(newState);

      // Copy to output
      const bytesToCopy = Math.min(length - offset, block.length);
      output.set(new Uint8Array(block).subarray(0, bytesToCopy), offset);
      offset += bytesToCopy;

      // Update state for next iteration
      this.lastOutput = Buffer.from(block);
      this.counter++;
    }

    return output;
  }

  private bigIntToUint8Array(bigInt: bigint, lengthBytes: number): Uint8Array {
    const hexString = bigInt.toString(16).padStart(lengthBytes * 2, '0');
    const byteArray = new Uint8Array(lengthBytes);

    for (let i = 0; i < lengthBytes; i++) {
      byteArray[i] = parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
    }

    return byteArray;
  }
}
