import type {
  AESGCMService,
  ECIESService,
  Pbkdf2Service,
} from '@digitaldefiance/ecies-lib';
import { VaultState } from '../enumerations/vault-state';
import type {
  ICustodian,
  IRecipe,
  IVaultCreationResult,
  IVaultFactoryConfig,
  IVaultInternals,
} from '../interfaces';
import type { LedgerGateway } from '../ledger/ledger-gateway';
import { RecipeSerializer } from '../serialization/recipe-serializer';
import { AccessSeal } from './access-seal';
import { BloomWitness } from './bloom-witness';
import { MemoryEraser } from './memory-eraser';
import { MerkleCommitmentTree } from './merkle-commitment-tree';
import { Vault } from './vault';

const DEFAULT_CONFIG: IVaultFactoryConfig = {
  treeDepth: 10,
  bloomFalsePositiveRate: 0.001,
  pbkdf2Iterations: 100000,
};

/**
 * Constructs Vaults: generates tree seed, derives leaves, builds Merkle
 * commitment tree, derives access seal, encrypts payload, encrypts tree
 * seed under custodian key, records creation on ledger, builds bloom
 * witness, assembles verification bundle.
 *
 * Validates: Requirements 1.1–1.6, 7.1, 7.2, 12.1–12.3, 13.1, 14.1, 14.5, 16.6
 */
export class VaultFactory {
  private readonly config: IVaultFactoryConfig;

  constructor(
    private readonly eciesService: ECIESService,
    private readonly aesGcmService: AESGCMService,
    private readonly pbkdf2Service: Pbkdf2Service,
    private readonly ledgerGateway: LedgerGateway,
    private readonly custodian: ICustodian,
    config?: Partial<IVaultFactoryConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create a new Vault.
   *
   * Protocol:
   * 1. Generate 32-byte random treeSeed
   * 2. Build Merkle commitment tree
   * 3. Derive pristine access seal
   * 4. Derive AES key from treeSeed via PBKDF2
   * 5. Serialize and encrypt payload
   * 6. Encrypt treeSeed under custodian's ECIES key
   * 7. Record creation on ledger
   * 8. Build BloomWitness
   * 9. Assemble Vault and VerificationBundle
   * 10. Erase sensitive material
   */
  async create(
    encryptionKey: Uint8Array,
    recipe: IRecipe,
    creatorPrivateKey: Uint8Array,
  ): Promise<IVaultCreationResult> {
    // 1. Generate 32-byte random treeSeed
    const treeSeed = new Uint8Array(32);
    crypto.getRandomValues(treeSeed);

    let derivedKey: Uint8Array | null = null;

    try {
      // 2. Build Merkle commitment tree
      const tree = MerkleCommitmentTree.build(treeSeed, this.config.treeDepth);

      // 3. Derive pristine access seal
      const accessSeal = AccessSeal.derive(
        treeSeed,
        AccessSeal.PRISTINE_DOMAIN,
      );

      // 4. Derive AES key from treeSeed via PBKDF2
      const pbkdf2Result =
        await this.pbkdf2Service.deriveKeyFromPasswordAsync(treeSeed);
      derivedKey = pbkdf2Result.hash;
      const pbkdf2Salt = pbkdf2Result.salt;

      // 5. Serialize recipe, build payload, encrypt
      const serializedRecipe = RecipeSerializer.serialize(recipe);
      const payloadLen = 4 + encryptionKey.length + serializedRecipe.length;
      const payload = new Uint8Array(payloadLen);
      const pView = new DataView(payload.buffer);
      pView.setUint32(0, encryptionKey.length, false);
      payload.set(encryptionKey, 4);
      payload.set(serializedRecipe, 4 + encryptionKey.length);

      const encrypted = await this.aesGcmService.encrypt(
        payload,
        derivedKey,
        true,
      );

      // 6. Encrypt treeSeed under custodian's ECIES public key
      const custodialResult = await this.custodian.encryptTreeSeed(treeSeed);

      // 7. Record creation on ledger
      const creatorPublicKey =
        this.eciesService.getPublicKey(creatorPrivateKey);
      const creationLedgerEntryHash = await this.ledgerGateway.recordCreation(
        tree.root,
        creatorPublicKey,
      );

      // 8. Build BloomWitness from all tree nodes
      const allNodes = tree.allNodes();
      const bloomWitness = BloomWitness.create(
        allNodes,
        this.config.bloomFalsePositiveRate,
      );

      // 9. Assemble Vault internals
      const internals: IVaultInternals = {
        encryptedPayload: encrypted.encrypted,
        iv: encrypted.iv,
        authTag: encrypted.tag!,
        pbkdf2Salt,
        encryptedTreeSeed: custodialResult.encryptedTreeSeed,
        custodialPublicKey: custodialResult.custodialPublicKey,
        creationLedgerEntryHash,
        merkleRoot: tree.root,
        treeDepth: this.config.treeDepth,
        accessSeal: new Uint8Array(accessSeal),
        state: VaultState.Sealed,
      };

      const vault = new Vault(
        internals,
        this.ledgerGateway,
        this.custodian,
        this.aesGcmService,
        this.pbkdf2Service,
      );

      const verificationBundle = {
        version: 1,
        merkleRoot: tree.root,
        accessSeal: new Uint8Array(accessSeal),
        creatorPublicKey,
        bloomWitness: bloomWitness.serialize(),
        treeDepth: this.config.treeDepth,
      };

      return { vault, verificationBundle };
    } finally {
      // 10. Erase sensitive material
      MemoryEraser.wipeAll(treeSeed, derivedKey);
    }
  }
}
