import Rand from 'rand-seed';
import { BrightChainMember } from './brightChainMember';
import { MemberType } from './enumerations/memberType';
import { HexString } from './types';

/**
 * @description Static helper functions for Brightchain Quorum. Encryption and other utilities.
 * - Uses secrets.js-34r7h fork of secrets.js for Shamir's Secret Sharing
 * - Uses elliptic for ECDSA
 * - Uses bip39 for BIP39 Mnemonic generation
 * - Uses crypto for AES encryption
 * - Uses crypto for RSA key generation, encryption/decryption
 */
export abstract class StaticHelpers {
  /**
   * Generates the given number of random values of the specified number of bits, with an optional seed.
   * @param n number of values
   * @param y bits per value
   * @param seed Random number generator seed
   * @returns
   */
  public static GenerateNValuesOfYBits(
    n: number,
    y: number,
    seed?: string,
  ): bigint[] {
    const rand = new Rand(seed);
    const values: bigint[] = new Array<bigint>(n);
    const maxValue = BigInt(2) ** BigInt(y) - BigInt(1);
    // 2^y - 1 = maxValue
    // 2^8 - 1 = 255
    // 2^11 - 1 = 2047
    for (let i = 0; i < n; i++) {
      values[i] = BigInt(Math.floor(rand.next() * Number(maxValue)));
    }
    return values;
  }

  /**
   * Write a number to a Buffer as a 32-bit unsigned integer. The buffer will contain 4 bytes.
   * @param value A number to write to the buffer
   * @returns A buffer containing the number
   */
  public static valueToBufferBigEndian(value: number): Buffer {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32BE(value, 0);
    return buffer;
  }

  /**
   * Read a number from a Buffer as a 32-bit unsigned integer. The buffer must contain 4 bytes.
   * @param buffer
   * @returns
   */
  public static bufferToValueBigEndian(buffer: Buffer): number {
    if (buffer.length !== 4) {
      throw new Error('Buffer length must be 4');
    }
    return buffer.readUInt32BE();
  }

  /**
   * Given an array of members, ensure all members are not system accounts
   * @param members
   * @returns
   */
  public static membersAreAllUsers(members: BrightChainMember[]): boolean {
    for (const member of members) {
      if (member.memberType == MemberType.System) {
        return false;
      }
    }
    return true;
  }

  public static bufferToHexString(buffer: Buffer): HexString {
    return buffer.toString('hex') as HexString;
  }

  public static HexStringToBuffer(hexString: HexString): Buffer {
    return Buffer.from(hexString, 'hex');
  }

  public static bigIntToLengthEncodedBuffer(bigInt: bigint): Buffer {
    const hexBuffer = Buffer.from(bigInt.toString(16), 'hex');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(hexBuffer.length);
    return Buffer.concat([lengthBuffer, hexBuffer]);
  }

  public static lengthEncodedBufferToBigInt(buffer: Buffer): bigint {
    const length = buffer.readUInt32BE(0);
    const hexString = buffer.subarray(4, 4 + length).toString('hex');
    return BigInt('0x' + hexString);
  }
}
