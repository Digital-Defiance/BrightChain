import { KeyPair } from 'paillier-bigint';

export interface IPrivateVotingDerivation {
  HKDF: (
    secret: Buffer,
    salt: Buffer | null,
    info: string,
    length: number,
  ) => Buffer;
  millerRabinTest: (n: bigint, k: number) => boolean;
  modPow: (base: bigint, exponent: bigint, modulus: bigint) => bigint;
  generateDeterministicKeyPair: (seed: Buffer, bits: number) => KeyPair;
  lcm: (a: bigint, b: bigint) => bigint;
  modInverse: (a: bigint, m: bigint) => bigint;
}
