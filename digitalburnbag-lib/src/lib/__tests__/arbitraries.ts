import fc from 'fast-check';
import { EciesCryptoCore } from '@digitaldefiance/ecies-lib';
import type { ICertificateOfDestruction } from '../interfaces/bases/certificate-of-destruction';
import { VaultContainerState } from '../enumerations/vault-container-state';
import { VaultLedgerEntryType } from '../enumerations/vault-ledger-entry-type';
import { VaultState } from '../enumerations/vault-state';

/** Arbitrary 32-byte encryption key */
export const arbEncryptionKey = fc.uint8Array({
  minLength: 32,
  maxLength: 32,
});

/** Arbitrary Recipe with 1–4 block IDs of 16 bytes each */
export const arbRecipe = fc.record({
  blockIds: fc.array(fc.uint8Array({ minLength: 16, maxLength: 16 }), {
    minLength: 1,
    maxLength: 4,
  }),
  totalBlockCount: fc.integer({ min: 1, max: 100 }),
});

/** Arbitrary valid tree depth (8–12 for test speed) */
export const arbTreeDepth = fc.integer({ min: 8, max: 10 });

/** Arbitrary 32-byte tree seed */
export const arbTreeSeed = fc.uint8Array({
  minLength: 32,
  maxLength: 32,
});

/** Arbitrary leaf index for depth 8 (0–255) */
export const arbLeafIndex = fc.integer({ min: 0, max: 255 });

/** Arbitrary VaultState */
export const arbVaultState = fc.constantFrom(
  VaultState.Sealed,
  VaultState.Accessed,
  VaultState.Destroyed,
);

/** Arbitrary VaultContainerState (all possible lifecycle states) */
export const arbVaultContainerState: fc.Arbitrary<VaultContainerState> =
  fc.constantFrom(
    VaultContainerState.Active,
    VaultContainerState.Sealed,
    VaultContainerState.Locked,
    VaultContainerState.Destroyed,
    VaultContainerState.Disowned,
    VaultContainerState.PendingDeletion,
  );

/** Arbitrary VaultLedgerEntryType */
export const arbVaultLedgerEntryType = fc.constantFrom(
  VaultLedgerEntryType.vault_created,
  VaultLedgerEntryType.vault_read_requested,
  VaultLedgerEntryType.vault_destroyed,
  VaultLedgerEntryType.key_released,
);

/** Arbitrary operation sequence for state machine testing */
export const arbOperationSequence = fc.array(
  fc.constantFrom('read', 'destroy'),
  { minLength: 1, maxLength: 5 },
);

/** Arbitrary proof field mutation target */
export const arbProofFieldMutation = fc.constantFrom(
  'treeSeed',
  'nonce',
  'timestamp',
  'signature',
);

// ── Certificate of Destruction generators ───────────────────────────

const cryptoCore = new EciesCryptoCore();

/**
 * Generates a valid secp256k1 key pair using EciesCryptoCore.
 * Each iteration gets a fresh key pair so the property holds across
 * many different keys.
 */
export const arbSecp256k1KeyPair: fc.Arbitrary<{
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}> = fc.noShrink(
  fc.constant(null).map(() => {
    const privateKey = cryptoCore.generatePrivateKey();
    const publicKey = cryptoCore.getPublicKey(privateKey);
    return { privateKey, publicKey };
  }),
);

/** Arbitrary hex string of a given byte length */
const arbHexString = (byteLength: number): fc.Arbitrary<string> =>
  fc
    .uint8Array({ minLength: byteLength, maxLength: byteLength })
    .map((bytes) => Buffer.from(bytes).toString('hex'));

/** Arbitrary ISO-8601 timestamp */
const arbIsoTimestamp: fc.Arbitrary<string> = fc
  .integer({
    min: new Date('2020-01-01T00:00:00Z').getTime(),
    max: new Date('2030-12-31T23:59:59Z').getTime(),
  })
  .map((ms) => new Date(ms).toISOString());

/** Arbitrary non-empty alphanumeric string (1–30 chars) */
const arbAlphanumericString: fc.Arbitrary<string> = fc
  .array(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(
        '',
      ),
    ),
    { minLength: 1, maxLength: 30 },
  )
  .map((chars) => chars.join(''));

/** Arbitrary file destruction proof */
const arbFileDestructionProof = fc.record({
  fileId: arbAlphanumericString,
  destructionHash: arbHexString(32),
  ledgerEntryHash: arbHexString(32),
  timestamp: arbIsoTimestamp,
});

/** Arbitrary non-access verification */
const arbNonAccessVerification = fc.record({
  containerId: arbAlphanumericString,
  nonAccessConfirmed: fc.constant(true),
  accessedFileIds: fc.constant([] as string[]),
  inconsistentFileIds: fc.constant([] as string[]),
  totalFilesChecked: fc.integer({ min: 1, max: 100 }),
});

/**
 * Generates a random ICertificateOfDestruction payload (without signature).
 * The signature field is set to an empty string — it will be populated
 * by signCertificate during testing.
 */
export const arbCertificatePayload: fc.Arbitrary<
  Omit<ICertificateOfDestruction, 'signature'>
> = fc.record({
  version: fc.constant(1),
  containerId: arbAlphanumericString,
  containerName: arbAlphanumericString,
  sealHash: arbHexString(32),
  sealedAt: arbIsoTimestamp,
  destroyedAt: arbIsoTimestamp,
  nonAccessVerification: arbNonAccessVerification,
  fileDestructionProofs: fc.array(arbFileDestructionProof, {
    minLength: 1,
    maxLength: 5,
  }),
  containerLedgerEntryHash: arbHexString(32),
  operatorPublicKey: arbSecp256k1KeyPair.map(({ publicKey }) =>
    Buffer.from(publicKey).toString('hex'),
  ),
});

/**
 * Generates a random byte index for tamper detection testing.
 * The index is within a reasonable range for serialized certificate payloads.
 * The actual clamping to the payload length is done in the test.
 */
export const arbByteFlipIndex: fc.Arbitrary<number> = fc.integer({
  min: 0,
  max: 4095,
});
