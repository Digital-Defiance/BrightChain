import { KeyPair } from 'paillier-bigint';

/**
 * Interface for private voting key derivation operations.
 *
 * Uses Uint8Array for browser compatibility (Requirement 18.6).
 */
export interface IPrivateVotingDerivation {
  HKDF: (
    secret: Uint8Array,
    salt: Uint8Array | null,
    info: string,
    length: number,
  ) => Uint8Array;
  millerRabinTest: (n: bigint, k: number) => boolean;
  modPow: (base: bigint, exponent: bigint, modulus: bigint) => bigint;
  generateDeterministicKeyPair: (seed: Uint8Array, bits: number) => KeyPair;
  lcm: (a: bigint, b: bigint) => bigint;
  modInverse: (a: bigint, m: bigint) => bigint;
}
