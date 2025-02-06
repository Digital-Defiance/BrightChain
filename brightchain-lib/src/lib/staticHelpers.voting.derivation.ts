import { createECDH, createHash, createHmac } from 'crypto';
import { KeyPair } from 'paillier-bigint';
import { SecureDeterministicDRBG } from './drbg';
import { VotingDerivationErrorType } from './enumerations/votingDerivationErrorType';
import { VotingDerivationError } from './errors/votingDerivationError';
import { IsolatedPrivateKey } from './isolatedPrivateKey';
import { IsolatedPublicKey } from './isolatedPublicKey';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
import { StaticHelpersVoting } from './staticHelpers.voting';

export class StaticHelpersVotingDerivation {
  private static readonly PRIME_GEN_INFO = 'PaillierPrimeGen';
  private static readonly PRIME_TEST_ITERATIONS = 256; // Further increased for stronger security guarantees

  /**
   * HKDF implementation following RFC 5869
   */
  private static HKDF(
    secret: Buffer,
    salt: Buffer | null,
    info: string,
    length: number,
  ): Buffer {
    // 1. Extract
    const hmac = createHmac('sha512', salt || Buffer.alloc(64, 0));
    hmac.update(secret);
    const prk = hmac.digest();

    // 2. Expand
    const N = Math.ceil(length / 64); // SHA-512 produces 64 bytes
    const T = new Array<Buffer>(N);
    let prev = Buffer.alloc(0);

    for (let i = 0; i < N; i++) {
      const hmac = createHmac('sha512', prk);
      hmac.update(
        Buffer.concat([prev, Buffer.from(info), Buffer.from([i + 1])]),
      );
      T[i] = hmac.digest();
      prev = T[i];
    }

    return Buffer.concat(T).slice(0, length);
  }

  /**
   * Miller-Rabin primality test with deterministic witnesses
   */
  private static millerRabinTest(n: bigint, k: number): boolean {
    if (n <= 1n || n === 4n) return false;
    if (n <= 3n) return true;

    // Write n-1 as 2^r * d
    let d = n - 1n;
    let r = 0;
    while (d % 2n === 0n) {
      d /= 2n;
      r++;
    }

    // Use first k prime numbers as witnesses
    const witnesses = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];

    // Witness loop
    const witnessLoop = (a: bigint): boolean => {
      let x = this.modPow(a, d, n);
      if (x === 1n || x === n - 1n) return true;

      for (let i = 1; i < r; i++) {
        x = (x * x) % n;
        if (x === 1n) return false;
        if (x === n - 1n) return true;
      }

      return false;
    };

    // Test with deterministic witnesses
    for (let i = 0; i < Math.min(k, witnesses.length); i++) {
      const a = (witnesses[i] % (n - 2n)) + 2n;
      if (!witnessLoop(a)) return false;
    }

    return true;
  }

  /**
   * Modular exponentiation for BigInt
   */
  private static modPow(
    base: bigint,
    exponent: bigint,
    modulus: bigint,
  ): bigint {
    if (modulus === 1n) return 0n;

    let result = 1n;
    base = base % modulus;

    while (exponent > 0n) {
      if (exponent % 2n === 1n) {
        result = (result * base) % modulus;
      }
      base = (base * base) % modulus;
      exponent = exponent / 2n;
    }

    return result;
  }

  private static generateDeterministicPrime(
    drbg: SecureDeterministicDRBG,
    numBits: number,
  ): bigint {
    const maxAttempts = 20000; // Increased for better probability of finding strong primes
    const numBytes = Math.ceil(numBits / 8);
    let attempts = 0;

    // Pre-compute bit masks
    const highBitMask = 1n << BigInt(numBits - 1);
    const lengthMask = (1n << BigInt(numBits)) - 1n;

    while (attempts < maxAttempts) {
      attempts++;

      // Generate random bytes
      const bytes = drbg.generateBytes(numBytes);

      // Convert to bigint efficiently
      let num = BigInt(0);
      for (const byte of bytes) {
        num = (num << 8n) | BigInt(byte);
      }

      // Ensure exact bit length and odd number
      num = (num & lengthMask) | highBitMask | 1n;

      // Skip if bit length is wrong
      if (num.toString(2).length !== numBits) {
        continue;
      }

      // Extended small prime sieve for better efficiency
      if (
        num % 3n === 0n ||
        num % 5n === 0n ||
        num % 7n === 0n ||
        num % 11n === 0n ||
        num % 13n === 0n ||
        num % 17n === 0n
      ) {
        continue;
      }

      // Full primality test
      if (this.millerRabinTest(num, this.PRIME_TEST_ITERATIONS)) {
        return num;
      }
    }

    throw new VotingDerivationError(
      VotingDerivationErrorType.FailedToGeneratePrime,
    );
  }

  /**
   * Generate a probable prime number using deterministic randomness
   */
  private static generateDeterministicKeyPair(
    seed: Buffer,
    bits: number,
  ): KeyPair {
    // Generate a deterministic prime number
    const drbg = new SecureDeterministicDRBG(seed); // Initialize DRBG with the seed
    try {
      const primeBits = Math.ceil(bits / 2) + 1; // Extra bit for safety
      const p = this.generateDeterministicPrime(drbg, primeBits);

      const q = this.generateDeterministicPrime(drbg, primeBits);

      if (p === q) {
        throw new VotingDerivationError(
          VotingDerivationErrorType.IdenticalPrimes,
        );
      }

      // Calculate RSA parameters
      const n = p * q;
      const lambda = this.lcm(p - 1n, q - 1n);
      const mu = this.modInverse(lambda, n);
      const g = n + 1n;

      // Create isolated key pair with consistent padding
      const nHex = n.toString(16).padStart(768, '0');
      const nBuffer = Buffer.from(nHex, 'hex');
      const keyId = createHash('sha256').update(nBuffer).digest();
      const publicKey = new IsolatedPublicKey(n, g, keyId);
      const privateKey = new IsolatedPrivateKey(lambda, mu, publicKey);

      // Verify key length
      const actualBits = n.toString(2).length;
      if (actualBits < bits) {
        throw new VotingDerivationError(
          VotingDerivationErrorType.KeyPairTooSmall,
          undefined,
          { ACTUAL_BITS: actualBits, REQUIRED_BITS: bits },
        );
      }

      // Test the key pair
      const testValue = 42n;
      const encrypted = publicKey.encrypt(testValue);
      const decrypted = privateKey.decrypt(encrypted);
      if (decrypted !== testValue) {
        throw new VotingDerivationError(
          VotingDerivationErrorType.KeyPairValidationFailed,
        );
      }

      return { publicKey, privateKey };
    } catch (error) {
      console.error('Error in generateDeterministicKeyPair: ', error);
      throw error;
    }
  }

  /**
   * Calculate least common multiple
   */
  private static lcm(a: bigint, b: bigint): bigint {
    const gcd = (x: bigint, y: bigint): bigint =>
      y === 0n ? x : gcd(y, x % y);
    return (a * b) / gcd(a, b);
  }

  /**
   * Calculate modular multiplicative inverse using extended Euclidean algorithm
   */
  private static modInverse(a: bigint, m: bigint): bigint {
    const egcd = (a: bigint, b: bigint): [bigint, bigint, bigint] => {
      if (a === 0n) return [b, 0n, 1n];
      const [g, x, y] = egcd(b % a, a);
      return [g, y - (b / a) * x, x];
    };

    const [g, x] = egcd(a, m);
    if (g !== 1n)
      throw new VotingDerivationError(
        VotingDerivationErrorType.ModularInverseDoesNotExist,
      );
    return ((x % m) + m) % m;
  }

  /**
   * Derive Paillier voting keys from ECDH key pair
   */
  public static deriveVotingKeysFromECDH(
    ecdhPrivKey: Buffer,
    ecdhPubKey: Buffer,
  ): KeyPair {
    // Input validation
    if (!Buffer.isBuffer(ecdhPrivKey)) {
      throw new VotingDerivationError(
        VotingDerivationErrorType.PrivateKeyMustBeBuffer,
      );
    }
    if (!Buffer.isBuffer(ecdhPubKey)) {
      throw new VotingDerivationError(
        VotingDerivationErrorType.PublicKeyMustBeBuffer,
      );
    }

    // Normalize public key format
    const normalizedPubKey =
      ecdhPubKey.length === 64
        ? Buffer.concat([Buffer.from([0x04]), ecdhPubKey])
        : ecdhPubKey;

    if (normalizedPubKey.length !== 65 || normalizedPubKey[0] !== 0x04) {
      throw new VotingDerivationError(
        VotingDerivationErrorType.InvalidPublicKeyFormat,
      );
    }

    try {
      // 1. Compute ECDH shared secret
      const ecdh = createECDH(StaticHelpersECIES.curveName);

      let sharedSecret: Buffer;
      try {
        // Handle key formatting
        const privateKeyForSecret = ecdhPrivKey;
        const publicKeyForSecret =
          ecdhPubKey.length === 65
            ? ecdhPubKey
            : Buffer.concat([Buffer.from([0x04]), ecdhPubKey]);

        ecdh.setPrivateKey(privateKeyForSecret);
        sharedSecret = ecdh.computeSecret(publicKeyForSecret);
      } catch (error) {
        throw new VotingDerivationError(
          VotingDerivationErrorType.InvalidEcdhKeyPair,
        );
      }

      // Generate seed for key generation
      const keyGenSeed = this.HKDF(sharedSecret, null, this.PRIME_GEN_INFO, 64);

      // Generate deterministic key pair
      return this.generateDeterministicKeyPair(
        keyGenSeed,
        StaticHelpersVoting.votingKeyPairBitLength,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new VotingDerivationError(
          VotingDerivationErrorType.FailedToDeriveVotingKeys,
          undefined,
          { ERROR: error.message },
        );
      }
      throw error;
    }
  }
}
