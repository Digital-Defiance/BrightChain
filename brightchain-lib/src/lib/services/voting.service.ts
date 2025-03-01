import { createECDH, createHash, createHmac } from 'crypto';
import {
  KeyPair,
  PrivateKey,
  PublicKey,
  generateRandomKeysSync,
} from 'paillier-bigint';
import CONSTANTS, { CHECKSUM, ECIES, VOTING } from '../constants';
import { SecureDeterministicDRBG } from '../drbg';
import { VotingErrorType } from '../enumerations/votingErrorType';
import { VotingError } from '../errors/votingError';
import { IsolatedPrivateKey } from '../isolatedPrivateKey';
import { IsolatedPublicKey } from '../isolatedPublicKey';
import { ECIESService } from './ecies.service';
import { ServiceProvider } from './service.provider';

/**
 * Service for handling voting operations.
 * This service provides functionality for:
 * - Generating voting key pairs
 * - Converting keys to/from buffers
 * - Encrypting/decrypting private keys
 * - Managing voting key formats and versions
 */
export class VotingService {
  private readonly eciesService = new ECIESService();
  constructor(eciesService: ECIESService) {
    this.eciesService = eciesService;
  }

  /**
   * HKDF implementation following RFC 5869
   */
  public HKDF(
    secret: Buffer,
    salt: Buffer | null,
    info: string,
    length: number,
  ): Buffer {
    // 1. Extract
    const hmac = createHmac(
      VOTING.HMAC_ALGORITHM,
      salt || Buffer.alloc(CHECKSUM.SHA3_BUFFER_LENGTH, 0),
    );
    hmac.update(secret);
    const prk = hmac.digest();

    // 2. Expand
    const N = Math.ceil(length / CHECKSUM.SHA3_BUFFER_LENGTH); // SHA-512 produces 64 bytes
    const T = new Array<Buffer>(N);
    let prev = Buffer.alloc(0);

    for (let i = 0; i < N; i++) {
      const hmac = createHmac(VOTING.HMAC_ALGORITHM, prk);
      hmac.update(
        Buffer.concat([prev, Buffer.from(info), Buffer.from([i + 1])]),
      );
      T[i] = hmac.digest();
      prev = T[i];
    }

    return Buffer.concat(T).subarray(0, length);
  }

  /**
   * Miller-Rabin primality test with deterministic witnesses
   */
  public millerRabinTest(n: bigint, k: number): boolean {
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
  public modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
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

  /**
   * Calculate least common multiple
   */
  public lcm(a: bigint, b: bigint): bigint {
    const gcd = (x: bigint, y: bigint): bigint =>
      y === 0n ? x : gcd(y, x % y);
    return (a * b) / gcd(a, b);
  }

  /**
   * Calculate modular multiplicative inverse using extended Euclidean algorithm
   */
  public modInverse(a: bigint, m: bigint): bigint {
    const egcd = (a: bigint, b: bigint): [bigint, bigint, bigint] => {
      if (a === 0n) return [b, 0n, 1n];
      const [g, x, y] = egcd(b % a, a);
      return [g, y - (b / a) * x, x];
    };

    const [g, x] = egcd(a, m);
    if (g !== 1n)
      throw new VotingError(VotingErrorType.ModularInverseDoesNotExist);
    return ((x % m) + m) % m;
  }

  /**
   * Derive Paillier voting keys from ECDH key pair
   */
  public deriveVotingKeysFromECDH(
    ecdhPrivKey: Buffer,
    ecdhPubKey: Buffer,
  ): KeyPair {
    // Input validation
    if (!Buffer.isBuffer(ecdhPrivKey)) {
      throw new VotingError(VotingErrorType.PrivateKeyMustBeBuffer);
    }
    if (!Buffer.isBuffer(ecdhPubKey)) {
      throw new VotingError(VotingErrorType.PublicKeyMustBeBuffer);
    }

    // Normalize public key format
    const normalizedPubKey =
      ecdhPubKey.length === ECIES.RAW_PUBLIC_KEY_LENGTH
        ? Buffer.concat([Buffer.from([ECIES.PUBLIC_KEY_MAGIC]), ecdhPubKey])
        : ecdhPubKey;

    if (
      normalizedPubKey.length !== ECIES.PUBLIC_KEY_LENGTH ||
      normalizedPubKey[0] !== ECIES.PUBLIC_KEY_MAGIC
    ) {
      throw new VotingError(VotingErrorType.InvalidPublicKeyFormat);
    }

    try {
      // 1. Compute ECDH shared secret
      const ecdh = createECDH(ECIES.CURVE_NAME);

      let sharedSecret: Buffer;
      try {
        // Handle key formatting
        const privateKeyForSecret = ecdhPrivKey;
        const publicKeyForSecret =
          ecdhPubKey.length === ECIES.PUBLIC_KEY_LENGTH
            ? ecdhPubKey
            : Buffer.concat([
                Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
                ecdhPubKey,
              ]);

        ecdh.setPrivateKey(privateKeyForSecret);
        sharedSecret = ecdh.computeSecret(publicKeyForSecret);
      } catch (error) {
        throw new VotingError(VotingErrorType.InvalidEcdhKeyPair);
      }

      // Generate seed for key generation
      const keyGenSeed = this.HKDF(
        sharedSecret,
        null,
        VOTING.PRIME_GEN_INFO,
        CHECKSUM.SHA3_BUFFER_LENGTH,
      );

      // Generate deterministic key pair
      return this.generateDeterministicKeyPair(
        keyGenSeed,
        VOTING.KEYPAIR_BIT_LENGTH,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new VotingError(
          VotingErrorType.FailedToDeriveVotingKeys,
          undefined,
          { ERROR: error.message },
        );
      }
      throw error;
    }
  }

  /**
   * Generate a deterministic prime number using deterministic randomness
   */
  public generateDeterministicPrime(
    drbg: SecureDeterministicDRBG,
    numBits: number,
  ): bigint {
    const maxAttempts = VOTING.DRBG_PRIME_ATTEMPTS;
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
      if (num.toString(VOTING.BITS_RADIX).length !== numBits) {
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
      if (this.millerRabinTest(num, VOTING.PRIME_TEST_ITERATIONS)) {
        return num;
      }
    }

    throw new VotingError(VotingErrorType.FailedToGeneratePrime);
  }

  /**
   * Generate a deterministic key pair using a seed
   */
  public generateDeterministicKeyPair(seed: Buffer, bits: number): KeyPair {
    // Generate a deterministic prime number
    const drbg = new SecureDeterministicDRBG(seed); // Initialize DRBG with the seed
    try {
      const primeBits = Math.ceil(bits / 2) + 1; // Extra bit for safety
      const p = this.generateDeterministicPrime(drbg, primeBits);
      const q = this.generateDeterministicPrime(drbg, primeBits);

      if (p === q) {
        throw new VotingError(VotingErrorType.IdenticalPrimes);
      }

      // Calculate RSA parameters
      const n = p * q;
      const lambda = this.lcm(p - 1n, q - 1n);
      const g = n + 1n;

      // First create base paillier keys
      const basePublicKey = new PublicKey(n, g);
      const basePrivateKey = new PrivateKey(
        lambda,
        this.modInverse(lambda, n),
        basePublicKey,
      );

      // Test the base key pair
      const testValue = 42n;
      const encrypted = basePublicKey.encrypt(testValue);
      const decrypted = basePrivateKey.decrypt(encrypted);
      if (decrypted !== testValue) {
        throw new VotingError(VotingErrorType.KeyPairValidationFailed);
      }

      // Verify key length
      const actualBits = n.toString(VOTING.BITS_RADIX).length;
      if (actualBits < bits) {
        throw new VotingError(VotingErrorType.KeyPairTooSmall, undefined, {
          ACTUAL_BITS: actualBits,
          REQUIRED_BITS: bits,
        });
      }

      // Create isolated key pair with consistent padding
      const nHex = n
        .toString(VOTING.KEY_RADIX)
        .padStart(VOTING.PUB_KEY_OFFSET, '0');
      const nBuffer = Buffer.from(nHex, VOTING.KEY_FORMAT);
      const keyId = createHash(VOTING.HASH_ALGORITHM).update(nBuffer).digest();

      // Create isolated keys from the validated base keys
      const publicKey = new IsolatedPublicKey(
        basePublicKey.n,
        basePublicKey.g,
        keyId,
      );
      const privateKey = new IsolatedPrivateKey(
        basePrivateKey.lambda,
        basePrivateKey.mu,
        publicKey,
      );

      return { publicKey, privateKey };
    } catch (error) {
      console.error('Error in generateDeterministicKeyPair: ', error);
      throw error;
    }
  }

  /**
   * Generate a new voting key pair
   * @returns KeyPair containing isolated public and private keys
   */
  public generateVotingKeyPair(): KeyPair {
    const keyPair = generateRandomKeysSync(VOTING.KEYPAIR_BIT_LENGTH);

    // Create isolated public key with consistent padding
    const nHex = keyPair.publicKey.n
      .toString(VOTING.KEY_RADIX)
      .padStart(VOTING.PUB_KEY_OFFSET, '0');
    const nBuffer = Buffer.from(nHex, VOTING.KEY_FORMAT);
    const keyId = createHash(VOTING.HASH_ALGORITHM).update(nBuffer).digest();
    const isolatedPublicKey = new IsolatedPublicKey(
      keyPair.publicKey.n,
      keyPair.publicKey.g,
      keyId,
    );

    // Create isolated private key
    const isolatedPrivateKey = new IsolatedPrivateKey(
      keyPair.privateKey.lambda,
      keyPair.privateKey.mu,
      isolatedPublicKey,
    );

    return { publicKey: isolatedPublicKey, privateKey: isolatedPrivateKey };
  }

  /**
   * Convert a key pair to an encrypted private key
   * @param keyPair The key pair to convert
   * @param walletPublicKey The wallet public key to encrypt with
   * @returns Encrypted private key as a Buffer
   */
  public keyPairToEncryptedPrivateKey(
    keyPair: KeyPair,
    walletPublicKey: Buffer,
  ): Buffer {
    if (!(keyPair.publicKey instanceof IsolatedPublicKey)) {
      throw new VotingError(VotingErrorType.InvalidKeyPairPublicKeyNotIsolated);
    }
    if (!(keyPair.privateKey instanceof IsolatedPrivateKey)) {
      throw new VotingError(
        VotingErrorType.InvalidKeyPairPrivateKeyNotIsolated,
      );
    }

    // Convert lambda and mu to hex buffers, padding with zeros if needed
    const lambda = Buffer.from(
      keyPair.privateKey.lambda
        .toString(VOTING.KEY_RADIX)
        .padStart(VOTING.PUB_KEY_OFFSET, '0'),
      VOTING.KEY_FORMAT,
    );
    const mu = Buffer.from(
      keyPair.privateKey.mu
        .toString(VOTING.KEY_RADIX)
        .padStart(VOTING.PUB_KEY_OFFSET, '0'),
      VOTING.KEY_FORMAT,
    );

    // Create length buffers
    const lambdaLengthBuffer = Buffer.alloc(CONSTANTS.UINT32_SIZE);
    lambdaLengthBuffer.writeUInt32BE(lambda.length);
    const muLengthBuffer = Buffer.alloc(CONSTANTS.UINT32_SIZE);
    muLengthBuffer.writeUInt32BE(mu.length);

    // Always strip 0x04 prefix if present since we expect raw public key
    const publicKeyForEncryption =
      walletPublicKey[0] === ECIES.PUBLIC_KEY_MAGIC
        ? walletPublicKey.subarray(1)
        : walletPublicKey;

    // Pass public key directly to encrypt which will handle prefix
    return ServiceProvider.getInstance().eciesService.encrypt(
      publicKeyForEncryption,
      Buffer.concat([lambdaLengthBuffer, lambda, muLengthBuffer, mu]),
    );
  }

  /**
   * Convert an encrypted private key back to a key pair
   * @param encryptedPrivateKey The encrypted private key
   * @param walletPrivateKey The wallet private key to decrypt with
   * @param votingPublicKey The corresponding voting public key
   * @returns The decrypted private key
   */
  public encryptedPrivateKeyToKeyPair(
    encryptedPrivateKey: Buffer,
    walletPrivateKey: Buffer,
    votingPublicKey: PublicKey,
  ): PrivateKey {
    if (!(votingPublicKey instanceof IsolatedPublicKey)) {
      throw new VotingError(VotingErrorType.InvalidPublicKeyNotIsolated);
    }

    // If private key has 0x04 prefix, remove it since ECDH expects raw private key
    const privateKeyForDecryption =
      walletPrivateKey[0] === ECIES.PUBLIC_KEY_MAGIC
        ? walletPrivateKey.subarray(1)
        : walletPrivateKey;

    const decryptedPrivateKeyBuffer =
      ServiceProvider.getInstance().eciesService.decryptWithHeader(
        privateKeyForDecryption,
        encryptedPrivateKey,
      );

    // Read lambda length and extract lambda buffer
    const lambdaLength = decryptedPrivateKeyBuffer.readUInt32BE(0);
    const lambdaBuffer = decryptedPrivateKeyBuffer.subarray(
      CONSTANTS.UINT32_SIZE,
      CONSTANTS.UINT32_SIZE + lambdaLength,
    );

    // Read mu length and extract mu buffer
    const muLength = decryptedPrivateKeyBuffer.readUInt32BE(
      CONSTANTS.UINT32_SIZE + lambdaLength,
    );
    const muBuffer = decryptedPrivateKeyBuffer.subarray(
      CONSTANTS.UINT32_SIZE + CONSTANTS.UINT32_SIZE + lambdaLength,
      CONSTANTS.UINT32_SIZE + CONSTANTS.UINT32_SIZE + lambdaLength + muLength,
    );

    // Convert buffers to BigInts, preserving leading zeros
    const lambda = BigInt(
      '0x' +
        lambdaBuffer
          .toString(VOTING.KEY_FORMAT)
          .padStart(VOTING.PUB_KEY_OFFSET, '0'),
    );
    const mu = BigInt(
      '0x' +
        muBuffer
          .toString(VOTING.KEY_FORMAT)
          .padStart(VOTING.PUB_KEY_OFFSET, '0'),
    );

    return new IsolatedPrivateKey(
      lambda,
      mu,
      votingPublicKey as IsolatedPublicKey,
    );
  }

  /**
   * Convert a voting public key to a buffer
   * @param votingPublicKey The public key to convert
   * @returns Buffer containing the serialized public key
   */
  public votingPublicKeyToBuffer(votingPublicKey: PublicKey): Buffer {
    if (!(votingPublicKey instanceof IsolatedPublicKey)) {
      throw new VotingError(VotingErrorType.InvalidPublicKeyNotIsolated);
    }

    const nHex = votingPublicKey.n
      .toString(VOTING.KEY_RADIX)
      .padStart(VOTING.PUB_KEY_OFFSET, '0');
    const nBuffer = Buffer.from(nHex, VOTING.KEY_FORMAT);
    const keyId = (votingPublicKey as IsolatedPublicKey).getKeyId();
    const instanceId = (votingPublicKey as IsolatedPublicKey).getInstanceId();

    const nLengthBuffer = Buffer.alloc(CONSTANTS.UINT32_SIZE);
    nLengthBuffer.writeUInt32BE(nBuffer.length);

    const header = Buffer.concat([
      Buffer.from(VOTING.KEY_MAGIC),
      Buffer.from([VOTING.KEY_VERSION]),
    ]);

    return Buffer.concat([header, keyId, instanceId, nLengthBuffer, nBuffer]);
  }

  /**
   * Convert a voting private key to a buffer
   * @param votingPrivateKey The private key to convert
   * @returns Buffer containing the serialized private key
   */
  public votingPrivateKeyToBuffer(votingPrivateKey: PrivateKey): Buffer {
    if (!(votingPrivateKey instanceof IsolatedPrivateKey)) {
      throw new VotingError(
        VotingErrorType.InvalidKeyPairPrivateKeyNotIsolated,
      );
    }

    // Convert lambda and mu to hex buffers, padding with zeros if needed
    const lambda = Buffer.from(
      votingPrivateKey.lambda
        .toString(VOTING.KEY_RADIX)
        .padStart(VOTING.PUB_KEY_OFFSET, '0'),
      VOTING.KEY_FORMAT,
    );
    const mu = Buffer.from(
      votingPrivateKey.mu
        .toString(VOTING.KEY_RADIX)
        .padStart(VOTING.PUB_KEY_OFFSET, '0'),
      VOTING.KEY_FORMAT,
    );

    // Create length buffers
    const lambdaLengthBuffer = Buffer.alloc(CONSTANTS.UINT32_SIZE);
    lambdaLengthBuffer.writeUInt32BE(lambda.length);
    const muLengthBuffer = Buffer.alloc(CONSTANTS.UINT32_SIZE);
    muLengthBuffer.writeUInt32BE(mu.length);

    // Create header
    const header = Buffer.concat([
      Buffer.from(VOTING.KEY_MAGIC),
      Buffer.from([VOTING.KEY_VERSION]),
    ]);

    return Buffer.concat([
      header,
      lambdaLengthBuffer,
      lambda,
      muLengthBuffer,
      mu,
    ]);
  }

  /**
   * Convert a buffer back to a voting private key
   * @param buffer The buffer containing the serialized private key
   * @param votingPublicKey The corresponding voting public key
   * @returns The deserialized private key
   */
  public bufferToVotingPrivateKey(
    buffer: Buffer,
    votingPublicKey: PublicKey,
  ): IsolatedPrivateKey {
    if (!(votingPublicKey instanceof IsolatedPublicKey)) {
      throw new VotingError(VotingErrorType.InvalidPublicKeyNotIsolated);
    }

    // Minimum buffer length check (magic + version + lambdaLength = 9 bytes)
    if (buffer.length < 9) {
      throw new VotingError(VotingErrorType.InvalidPrivateKeyBufferTooShort);
    }

    // Verify magic
    const magic = buffer.subarray(0, VOTING.KEY_MAGIC.length);
    if (!magic.equals(Buffer.from(VOTING.KEY_MAGIC))) {
      throw new VotingError(VotingErrorType.InvalidPrivateKeyBufferWrongMagic);
    }

    // Read version
    const version = buffer[VOTING.KEY_MAGIC.length];
    if (version !== VOTING.KEY_VERSION) {
      throw new VotingError(VotingErrorType.UnsupportedPrivateKeyVersion);
    }

    // Read lambda length and value
    const lambdaLength = buffer.readUInt32BE(5);
    if (buffer.length < 9 + lambdaLength) {
      throw new VotingError(
        VotingErrorType.InvalidPrivateKeyBufferIncompleteLambda,
      );
    }
    const lambdaBuffer = buffer.subarray(9, 9 + lambdaLength);

    // Read mu length and value
    if (buffer.length < 13 + lambdaLength) {
      throw new VotingError(
        VotingErrorType.InvalidPrivateKeyBufferIncompleteMuLength,
      );
    }
    const muLength = buffer.readUInt32BE(9 + lambdaLength);
    if (buffer.length < 13 + lambdaLength + muLength) {
      throw new VotingError(
        VotingErrorType.InvalidPrivateKeyBufferIncompleteMu,
      );
    }
    const muBuffer = buffer.subarray(
      13 + lambdaLength,
      13 + lambdaLength + muLength,
    );

    // Convert to BigInts with consistent padding
    let lambda: bigint;
    let mu: bigint;
    try {
      lambda = BigInt(
        '0x' +
          lambdaBuffer
            .toString(VOTING.KEY_FORMAT)
            .padStart(VOTING.PUB_KEY_OFFSET, '0'),
      );
      mu = BigInt(
        '0x' +
          muBuffer
            .toString(VOTING.KEY_FORMAT)
            .padStart(VOTING.PUB_KEY_OFFSET, '0'),
      );
    } catch (error) {
      throw new VotingError(
        VotingErrorType.InvalidPrivateKeyBufferFailedToParse,
        undefined,
        { ERROR: error instanceof Error ? error.message : String(error) },
      );
    }

    // Create and validate the private key
    try {
      return new IsolatedPrivateKey(
        lambda,
        mu,
        votingPublicKey as IsolatedPublicKey,
      );
    } catch (error) {
      throw new VotingError(
        VotingErrorType.InvalidPrivateKeyBufferFailedToCreate,
        undefined,
        { ERROR: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Convert a buffer back to a voting public key
   * @param buffer The buffer containing the serialized public key
   * @returns The deserialized public key
   */
  public bufferToVotingPublicKey(buffer: Buffer): IsolatedPublicKey {
    // Minimum buffer length check (magic + version + keyId + instanceId + nLength = 73 bytes)
    if (buffer.length < 73) {
      throw new VotingError(VotingErrorType.InvalidPublicKeyBufferTooShort);
    }

    // Verify magic
    const magic = buffer.subarray(0, VOTING.KEY_MAGIC.length);
    if (!magic.equals(Buffer.from(VOTING.KEY_MAGIC))) {
      throw new VotingError(VotingErrorType.InvalidPublicKeyBufferWrongMagic);
    }

    // Read version
    const version = buffer[VOTING.KEY_MAGIC.length];
    if (version !== VOTING.KEY_VERSION) {
      throw new VotingError(VotingErrorType.UnsupportedPublicKeyVersion);
    }

    // Read key ID
    const storedKeyId = buffer.subarray(5, 37);

    // Read n length and value
    const nLength = buffer.readUInt32BE(69);
    if (buffer.length < 73 + nLength) {
      throw new VotingError(VotingErrorType.InvalidPublicKeyBufferIncompleteN);
    }
    const nBuffer = buffer.subarray(73, 73 + nLength);

    // Convert to BigInt with consistent padding and error handling
    const nHex = nBuffer
      .toString(VOTING.KEY_FORMAT)
      .padStart(VOTING.PUB_KEY_OFFSET, '0');
    let n: bigint;
    try {
      n = BigInt('0x' + nHex);
    } catch (error) {
      throw new VotingError(
        VotingErrorType.InvalidPublicKeyBufferFailedToParseN,
        undefined,
        { ERROR: error instanceof Error ? error.message : String(error) },
      );
    }

    const g = n + 1n; // In Paillier, g is always n + 1

    // Verify key ID
    const computedKeyId = createHash(VOTING.HASH_ALGORITHM)
      .update(nBuffer)
      .digest();
    if (!computedKeyId.equals(storedKeyId)) {
      throw new VotingError(VotingErrorType.InvalidPublicKeyIdMismatch);
    }

    // Create and validate the public key
    try {
      // Create a new public key and update its instance ID
      const publicKey = new IsolatedPublicKey(n, g, storedKeyId);
      publicKey.updateInstanceId(); // Generate a new instance ID for the recovered key
      return publicKey;
    } catch (error) {
      throw new VotingError(
        VotingErrorType.InvalidPublicKeyBufferFailedToParseN,
        undefined,
        { ERROR: error instanceof Error ? error.message : String(error) },
      );
    }
  }
}
