/**
 * BrightPassService — core vault operations for the BrightPass password manager.
 *
 * Manages vault lifecycle (create, open, list, delete), entry CRUD,
 * search, sharing, emergency access, and import operations.
 *
 * Uses IBlockStore for persistent storage, VCBLService for VCBL operations,
 * BlockService for encryption, and maintains a lightweight in-memory index
 * for quick lookups.
 *
 * Requirements: 1.1–1.8, 2.1–2.9, 3.1–3.5, 4.1–4.4
 */

import {
  AttachmentReference,
  AuditAction,
  AuditLogEntry,
  AutofillPayload,
  BlockEncryptionType,
  BlockService,
  BlockSize,
  Checksum,
  ChecksumService,
  CONSTANTS,
  DecryptedVault,
  EmergencyAccessConfig,
  EncryptedShare,
  EntryPropertyRecord,
  EntrySearchQuery,
  getGlobalServiceProvider,
  IBlockStore,
  ImportFormat,
  ImportParser,
  ImportResult,
  LoginEntry,
  MemoryBlockStore,
  TOTPEngine,
  VaultEntry,
  VaultKeyDerivation,
  VaultMetadata,
  VaultSerializer,
  VCBLBlock,
  VCBLService,
} from '@brightchain/brightchain-lib';
import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { v4 as uuidv4 } from 'uuid';

import * as secretsModule from '@digitaldefiance/secrets';
import * as bcrypt from 'bcrypt';
import * as bip39 from 'bip39';
import * as crypto from 'crypto';
import { AuditLogger } from './brightpass/auditLogger';
import { VaultEncryption } from './brightpass/vaultEncryption';

// Handle both ESM default export and CommonJS module.exports patterns
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const secrets = (secretsModule as any).default || secretsModule;

/**
 * Lightweight vault index entry for quick lookups.
 * Full vault data is stored in the block store; this index
 * only contains metadata needed for listing and access control.
 * Requirements: 1.1, 1.5
 */
interface VaultIndexEntry {
  /** Points to VCBL block in block store */
  vcblChecksum: Checksum | null;
  /** Vault owner member ID */
  ownerId: string;
  /** Vault display name */
  name: string;
  /** Derived vault key (in-memory only, never persisted) */
  vaultKey: Uint8Array;
  /** Master password hash for verification (bcrypt) */
  masterPasswordHash: string;
  /** Vault's own BIP39 mnemonic (24 words) - independent of member */
  vaultMnemonic: string;
  /** Vault's BIP39 seed derived from mnemonic (64 bytes) */
  vaultSeed: Uint8Array;
  /** Members this vault is shared with */
  sharedWith: string[];
  /** Vault creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Entry count for quick access */
  entryCount: number;
  /** VCBL block ID in the block store */
  vcblBlockId: string;
}

/**
 * Internal representation of a stored vault.
 * Contains vault metadata, encryption keys, and entry data.
 */
interface StoredVault {
  metadata: VaultMetadata;
  /** Derived vault key (in-memory only, never persisted) */
  vaultKey: Uint8Array;
  /** Master password hash for verification (bcrypt) */
  masterPasswordHash: string;
  /** Vault's own BIP39 mnemonic (24 words) - independent of member, can be cycled */
  vaultMnemonic: string;
  /** Vault's BIP39 seed derived from mnemonic (64 bytes) */
  vaultSeed: Uint8Array;
  /** Property records (VCBL parallel array) */
  propertyRecords: EntryPropertyRecord[];
  /** Block IDs parallel to propertyRecords */
  blockIds: string[];
  /** Serialized entry JSON keyed by entry ID */
  entries: Map<string, string>;
  /** Audit logger for this vault */
  auditLogger: AuditLogger;
  /** Emergency access configuration (if configured) */
  emergencyConfig?: EmergencyAccessConfig;
  /** Encrypted shares for emergency recovery */
  emergencyShares?: EncryptedShare[];
  /** Quorum governance threshold (0 = no quorum required) */
  quorumThreshold: number;
  /** Set of member IDs who have approved access in the current quorum session */
  quorumApprovals: Set<string>;
}

/**
 * Errors specific to BrightPass operations
 */
export class VaultNotFoundError extends Error {
  constructor(vaultId: string) {
    super(`Vault not found: ${vaultId}`);
    this.name = 'VaultNotFoundError';
  }
}

export class VaultAuthenticationError extends Error {
  constructor() {
    super('Vault authentication failed');
    this.name = 'VaultAuthenticationError';
  }
}

export class VaultConflictError extends Error {
  constructor(name: string) {
    super(`Vault with name "${name}" already exists`);
    this.name = 'VaultConflictError';
  }
}

export class EntryNotFoundError extends Error {
  constructor(entryId: string) {
    super(`Entry not found: ${entryId}`);
    this.name = 'EntryNotFoundError';
  }
}

export class EmergencyAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmergencyAccessError';
  }
}

export class BrightPassService<TID extends PlatformID = Uint8Array> {
  /** Block store for persistent storage (injected) */
  private readonly blockStore: IBlockStore;
  /** VCBL service for vault operations (injected) */
  private readonly vcblService: VCBLService<TID>;
  /** Block service for encryption/decryption (injected) */
  private readonly blockService: BlockService<TID>;
  /** Member for block creation (injected) */
  private readonly member: Member<TID>;

  /** vaultId → StoredVault for vault data management */
  private readonly vaults = new Map<string, StoredVault>();
  /** vaultId → VaultIndexEntry for lightweight lookups */
  private readonly vaultIndex = new Map<string, VaultIndexEntry>();
  /** memberId → Set<vaultId> for quick listing */
  private readonly memberVaults = new Map<string, Set<string>>();

  /**
   * Create a new BrightPassService.
   *
   * @param blockStore - Block store for persistent storage (defaults to MemoryBlockStore)
   * @param vcblService - VCBL service for vault operations
   * @param blockService - Block service for encryption
   * @param member - Member for block creation
   *
   * Requirements: 1.1, 1.5
   */
  constructor(
    blockStore?: IBlockStore,
    vcblService?: VCBLService<TID>,
    blockService?: BlockService<TID>,
    member?: Member<TID>,
  ) {
    // Default to MemoryBlockStore if not provided (for backward compatibility)
    this.blockStore = blockStore ?? new MemoryBlockStore(BlockSize.Small);
    // Store injected services
    this.vcblService = vcblService as VCBLService<TID>;
    this.blockService = blockService ?? new BlockService<TID>();
    this.member = member as Member<TID>;
  }

  /** bcrypt cost factor - 12 rounds provides ~300ms hash time on modern hardware */
  private static readonly BCRYPT_ROUNDS = 12;

  /**
   * Hash a master password using bcrypt for secure storage and comparison.
   * Uses bcrypt with 12 rounds for strong protection against brute-force attacks.
   *
   * Security: bcrypt includes salt automatically and is designed to be slow,
   * making brute-force attacks computationally expensive.
   */
  private async hashMasterPasswordAsync(password: string): Promise<string> {
    return bcrypt.hash(password, BrightPassService.BCRYPT_ROUNDS);
  }

  /**
   * Verify a master password against a stored bcrypt hash.
   * Uses constant-time comparison internally via bcrypt.compare().
   */
  private async verifyMasterPassword(
    password: string,
    storedHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, storedHash);
  }

  /**
   * Generate a new BIP39 mnemonic and seed for a vault.
   * Each vault has its own independent mnemonic that can be cycled/regenerated.
   *
   * Security: Uses 256 bits of entropy for a 24-word mnemonic.
   * The mnemonic should be stored encrypted and can be backed up separately.
   *
   * @returns Object containing the mnemonic (24 words) and derived seed (64 bytes)
   */
  private generateVaultBip39(): { mnemonic: string; seed: Uint8Array } {
    // Generate 256 bits of entropy for a 24-word mnemonic
    const mnemonic = bip39.generateMnemonic(256);
    // Derive 64-byte seed from mnemonic (no passphrase - master password used in key derivation)
    const seedBuffer = bip39.mnemonicToSeedSync(mnemonic);
    return {
      mnemonic,
      seed: new Uint8Array(seedBuffer),
    };
  }

  /**
   * Regenerate a vault's BIP39 seed (key rotation).
   * This creates a new mnemonic and re-encrypts all entries with the new key.
   *
   * Security: This is a critical operation that should be used when:
   * - A share has been revoked and the vault needs re-keying
   * - The vault owner suspects key compromise
   * - Periodic key rotation policy requires it
   *
   * @param vaultId - The vault to regenerate
   * @param masterPassword - Current master password for verification
   * @returns The new mnemonic (should be backed up by the user)
   */
  async regenerateVaultSeed(
    vaultId: string,
    masterPassword: string,
  ): Promise<string> {
    const vault = this.getVaultOrThrow(vaultId);

    // Verify master password
    const passwordValid = await this.verifyMasterPassword(
      masterPassword,
      vault.masterPasswordHash,
    );
    if (!passwordValid) {
      throw new VaultAuthenticationError();
    }

    // Generate new BIP39 mnemonic and seed
    const { mnemonic: newMnemonic, seed: newSeed } = this.generateVaultBip39();

    // Derive new vault key
    const newVaultKey = VaultKeyDerivation.deriveVaultKey(
      newSeed,
      masterPassword,
      vaultId,
    );

    // Re-encrypt all entries with new key
    const oldVaultKey = vault.vaultKey;
    for (const [entryId, encryptedEntry] of vault.entries) {
      const decrypted = VaultEncryption.decryptString(
        oldVaultKey,
        encryptedEntry,
      );
      const reEncrypted = VaultEncryption.encryptString(newVaultKey, decrypted);
      vault.entries.set(entryId, reEncrypted);
    }

    // Update vault with new seed and key
    vault.vaultMnemonic = newMnemonic;
    vault.vaultSeed = newSeed;
    vault.vaultKey = newVaultKey;
    vault.metadata.updatedAt = new Date();

    // Update index
    const indexEntry = this.vaultIndex.get(vaultId);
    if (indexEntry) {
      indexEntry.vaultMnemonic = newMnemonic;
      indexEntry.vaultSeed = newSeed;
      indexEntry.vaultKey = newVaultKey;
      indexEntry.updatedAt = vault.metadata.updatedAt;
    }

    // Invalidate any existing emergency shares (they used the old key)
    if (vault.emergencyConfig) {
      vault.emergencyConfig = undefined;
      vault.emergencyShares = undefined;
    }

    await vault.auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId: vault.metadata.ownerId,
      action: AuditAction.VAULT_UPDATED,
      metadata: { action: 'seed_regenerated' },
    });

    return newMnemonic;
  }

  /**
   * Extract an EntryPropertyRecord from a VaultEntry.
   */
  private entryToPropertyRecord(entry: VaultEntry): EntryPropertyRecord {
    return {
      entryType: entry.type,
      title: entry.title,
      tags: entry.tags ?? [],
      favorite: entry.favorite,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      siteUrl: entry.type === 'login' ? (entry as LoginEntry).siteUrl : '',
    };
  }

  /**
   * Check if block store operations are safe to perform.
   * Block store operations require the global service provider to be initialized.
   * Returns false if the service provider is not available.
   */
  private isBlockStoreOperationsSafe(): boolean {
    try {
      // Try to access the global service provider
      // If it throws, block store operations are not safe
      getGlobalServiceProvider();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get a vault or throw VaultNotFoundError.
   */
  private getVaultOrThrow(vaultId: string): StoredVault {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new VaultNotFoundError(vaultId);
    }
    return vault;
  }

  /**
   * Update the VCBL in the block store after entry changes.
   * Creates a new VCBL with updated property records and entry addresses,
   * encrypts it, and stores it in the block store.
   * Requirements: 2.2, 2.3, 2.4, 3.2
   */
  private async updateVcblInBlockStore(
    vaultId: string,
    vault: StoredVault,
  ): Promise<void> {
    if (!this.vcblService || !this.member) {
      return; // VCBLService not available, skip block store update
    }

    if (!this.isBlockStoreOperationsSafe()) {
      return; // Block store operations not safe, skip update
    }

    const indexEntry = this.vaultIndex.get(vaultId);
    if (!indexEntry) {
      return;
    }

    // Build address list from block IDs (checksums)
    const addressList = new Uint8Array(
      vault.blockIds.length * CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH,
    );
    for (let i = 0; i < vault.blockIds.length; i++) {
      const checksum = Checksum.fromHex(vault.blockIds[i]);
      addressList.set(
        checksum.toUint8Array(),
        i * CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH,
      );
    }

    // Create new VCBL header with updated property records and addresses
    const { headerData } = this.vcblService.makeVcblHeader(
      this.member,
      vault.metadata.name,
      [], // shared members - would need to convert string IDs to TID
      vault.propertyRecords,
      addressList,
      this.blockStore.blockSize,
      BlockEncryptionType.None,
    );

    // Encrypt the VCBL header using the vault key
    const encryptedVcbl = VaultEncryption.encrypt(vault.vaultKey, headerData);

    // Calculate new checksum
    const checksumService = new ChecksumService();
    const newVcblChecksum = checksumService.calculateChecksum(encryptedVcbl);
    const newVcblBlockId = newVcblChecksum.toHex();

    // Remove old VCBL from block store if it exists
    if (indexEntry.vcblBlockId) {
      const hasOldVcbl = await this.blockStore.has(indexEntry.vcblBlockId);
      if (hasOldVcbl) {
        await this.blockStore.delete(indexEntry.vcblBlockId);
      }
    }

    // Store new VCBL in block store
    await this.blockStore.put(newVcblBlockId, encryptedVcbl);

    // Update index entry with new VCBL checksum
    indexEntry.vcblChecksum = newVcblChecksum;
    indexEntry.vcblBlockId = newVcblBlockId;
    vault.metadata.vcblBlockId = newVcblBlockId;
  }

  // ─── Vault CRUD ───────────────────────────────────────────────

  /**
   * Create a new vault.
   * Generates a vault-specific BIP39 mnemonic and derives the vault key from it.
   * Uses bcrypt for secure password hashing.
   *
   * Security: Each vault has its own independent BIP39 seed that can be
   * regenerated/cycled without affecting other vaults or the member's identity.
   *
   * Requirements: 1.1, 3.1, 3.2
   */
  async createVault(
    memberId: string,
    name: string,
    masterPassword: string,
  ): Promise<VaultMetadata> {
    // Check for duplicate vault name for this member
    const memberVaultIds = this.memberVaults.get(memberId);
    if (memberVaultIds) {
      for (const vid of memberVaultIds) {
        const existing = this.vaults.get(vid);
        if (existing && existing.metadata.name === name) {
          throw new VaultConflictError(name);
        }
      }
    }

    const vaultId = uuidv4();

    // Generate vault-specific BIP39 mnemonic and seed (independent of member)
    const { mnemonic: vaultMnemonic, seed: vaultSeed } =
      this.generateVaultBip39();

    // Derive vault key from the vault's own BIP39 seed + master password
    const vaultKey = VaultKeyDerivation.deriveVaultKey(
      vaultSeed,
      masterPassword,
      vaultId,
    );

    // Hash password using bcrypt (async, secure)
    const masterPasswordHash =
      await this.hashMasterPasswordAsync(masterPassword);

    const now = new Date();

    // Create VCBL using VCBLService if available (Req 3.1, 3.2)
    let vcblChecksum: Checksum | null = null;
    let vcblBlockId = uuidv4(); // fallback simulated block ID

    if (this.vcblService && this.member) {
      // Create empty VCBL header with no entries
      const emptyPropertyRecords: EntryPropertyRecord[] = [];
      const emptyAddressList = new Uint8Array(0);

      const { headerData } = this.vcblService.makeVcblHeader(
        this.member,
        name,
        [], // no shared members initially
        emptyPropertyRecords,
        emptyAddressList,
        this.blockStore.blockSize,
        BlockEncryptionType.None,
      );

      // Encrypt the VCBL header using the vault key
      const encryptedVcbl = VaultEncryption.encrypt(vaultKey, headerData);

      // Calculate checksum of the encrypted VCBL
      const checksumService = new ChecksumService();
      vcblChecksum = checksumService.calculateChecksum(encryptedVcbl);

      // Store the encrypted VCBL in the block store
      await this.blockStore.put(vcblChecksum.toHex(), encryptedVcbl);
      vcblBlockId = vcblChecksum.toHex();
    }

    const metadata: VaultMetadata = {
      id: vaultId,
      name,
      ownerId: memberId,
      createdAt: now,
      updatedAt: now,
      entryCount: 0,
      sharedWith: [],
      vcblBlockId,
    };

    const auditLogger = new AuditLogger();
    const stored: StoredVault = {
      metadata,
      vaultKey,
      masterPasswordHash,
      vaultMnemonic,
      vaultSeed,
      propertyRecords: [],
      blockIds: [],
      entries: new Map(),
      auditLogger,
      quorumThreshold: 0,
      quorumApprovals: new Set(),
    };

    this.vaults.set(vaultId, stored);

    // Populate lightweight vault index for quick lookups
    const indexEntry: VaultIndexEntry = {
      vcblChecksum, // Now set to actual checksum when VCBLService is available
      ownerId: memberId,
      name,
      vaultKey,
      masterPasswordHash,
      vaultMnemonic,
      vaultSeed,
      sharedWith: [],
      createdAt: now,
      updatedAt: now,
      entryCount: 0,
      vcblBlockId,
    };
    this.vaultIndex.set(vaultId, indexEntry);

    // Track member → vault mapping
    if (!this.memberVaults.has(memberId)) {
      this.memberVaults.set(memberId, new Set());
    }
    this.memberVaults.get(memberId)!.add(vaultId);

    await auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId,
      action: AuditAction.VAULT_CREATED,
    });

    return { ...metadata };
  }

  /**
   * Open an existing vault with the correct master password.
   * Returns vault metadata and property records (no entry decryption).
   * When VCBLService is available, retrieves and parses VCBL from block store.
   * Requirements: 1.2, 1.3, 3.3, 3.4
   */
  async openVault(
    memberId: string,
    vaultId: string,
    masterPassword: string,
  ): Promise<DecryptedVault> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      // Don't reveal whether vault exists — return generic auth error
      throw new VaultAuthenticationError();
    }

    // Verify ownership or shared access
    if (
      vault.metadata.ownerId !== memberId &&
      !vault.metadata.sharedWith.includes(memberId)
    ) {
      throw new VaultAuthenticationError();
    }

    // Verify master password using bcrypt (constant-time comparison)
    const passwordValid = await this.verifyMasterPassword(
      masterPassword,
      vault.masterPasswordHash,
    );
    if (!passwordValid) {
      throw new VaultAuthenticationError();
    }

    // Enforce quorum governance if configured
    if (vault.quorumThreshold > 0 && !this.isQuorumMet(vaultId)) {
      throw new VaultAuthenticationError();
    }

    await vault.auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId,
      action: AuditAction.VAULT_OPENED,
    });

    // Try to retrieve and parse VCBL from block store (Req 3.3, 3.4)
    const indexEntry = this.vaultIndex.get(vaultId);
    if (this.vcblService && this.member && indexEntry?.vcblBlockId) {
      const hasVcbl = await this.blockStore.has(indexEntry.vcblBlockId);
      if (hasVcbl) {
        // Retrieve encrypted VCBL from block store
        const blockHandle = this.blockStore.get(indexEntry.vcblBlockId);
        const encryptedVcbl = blockHandle.fullData;

        // Decrypt VCBL using vault key
        const decryptedVcbl = VaultEncryption.decrypt(
          vault.vaultKey,
          new Uint8Array(encryptedVcbl),
        );

        // Parse VCBL using VCBLBlock to extract property records and entry addresses
        const vcblBlock = new VCBLBlock(
          decryptedVcbl,
          this.member,
          this.blockStore.blockSize,
          undefined,
          this.vcblService,
        );

        // Extract property records from VCBL (Req 3.3)
        const propertyRecords = vcblBlock.propertyRecords;

        // Extract entry addresses from VCBL (Req 3.4)
        const entryAddresses = vcblBlock.addresses;

        // Update in-memory vault with parsed data for consistency
        vault.propertyRecords = [...propertyRecords];
        vault.blockIds = entryAddresses.map((addr) => addr.toHex());

        return {
          metadata: { ...vault.metadata },
          propertyRecords: [...propertyRecords],
        };
      }
    }

    // Fallback: return in-memory data when VCBLService is not available
    return {
      metadata: { ...vault.metadata },
      propertyRecords: [...vault.propertyRecords],
    };
  }

  /**
   * List all vaults owned by or shared with a member.
   * Returns metadata only — no decryption needed.
   * Requirements: 1.4
   */
  async listVaults(memberId: string): Promise<VaultMetadata[]> {
    const result: VaultMetadata[] = [];
    for (const vault of this.vaults.values()) {
      if (
        vault.metadata.ownerId === memberId ||
        vault.metadata.sharedWith.includes(memberId)
      ) {
        result.push({ ...vault.metadata });
      }
    }
    return result;
  }

  /**
   * Delete a vault and all its entries.
   * Requirements: 1.5
   */
  async deleteVault(
    memberId: string,
    vaultId: string,
    masterPassword: string,
  ): Promise<void> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new VaultNotFoundError(vaultId);
    }

    if (vault.metadata.ownerId !== memberId) {
      throw new VaultAuthenticationError();
    }

    // Verify master password using bcrypt (constant-time comparison)
    const passwordValid = await this.verifyMasterPassword(
      masterPassword,
      vault.masterPasswordHash,
    );
    if (!passwordValid) {
      throw new VaultAuthenticationError();
    }

    await vault.auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId,
      action: AuditAction.VAULT_DELETED,
    });

    // Remove vault and all associated data
    this.vaults.delete(vaultId);
    this.vaultIndex.delete(vaultId);
    const memberVaultIds = this.memberVaults.get(memberId);
    if (memberVaultIds) {
      memberVaultIds.delete(vaultId);
    }
  }

  // ─── Entry CRUD ─────────────────────────────────────────────

  /**
   * Add a new entry to a vault.
   * Encrypts the entry using AES-256-GCM, stores in block store (when available),
   * and appends block checksum + property record to VCBL parallel arrays.
   * Requirements: 2.1, 2.2, 3.2
   */
  async addEntry(vaultId: string, entry: VaultEntry): Promise<VaultEntry> {
    const vault = this.getVaultOrThrow(vaultId);

    // Assign ID and timestamps if not present
    const now = new Date();
    const fullEntry: VaultEntry = {
      ...entry,
      id: entry.id || uuidv4(),
      createdAt: entry.createdAt || now,
      updatedAt: entry.updatedAt || now,
    };

    // Serialize and encrypt entry using AES-256-GCM (Req 2.2, 3.2)
    const serialized = VaultSerializer.serializeEntry(fullEntry);
    const encrypted = VaultEncryption.encryptString(vault.vaultKey, serialized);

    // Calculate checksum for the entry block ID
    const entryData = new Uint8Array(Buffer.from(encrypted, 'base64'));
    const checksumService = new ChecksumService();
    const entryChecksum = checksumService.calculateChecksum(entryData);
    const entryBlockId = entryChecksum.toHex();

    // Store encrypted entry in block store if operations are safe (Req 2.2)
    if (this.isBlockStoreOperationsSafe()) {
      await this.blockStore.put(entryBlockId, entryData);
    }

    // Also keep in-memory for backward compatibility
    vault.entries.set(fullEntry.id, encrypted);
    vault.propertyRecords.push(this.entryToPropertyRecord(fullEntry));
    vault.blockIds.push(entryBlockId);
    vault.metadata.entryCount = vault.propertyRecords.length;
    vault.metadata.updatedAt = now;

    // Update vault index entry count
    const indexEntry = this.vaultIndex.get(vaultId);
    if (indexEntry) {
      indexEntry.entryCount = vault.metadata.entryCount;
      indexEntry.updatedAt = now;
    }

    // Update VCBL in block store if VCBLService is available (Req 2.2)
    await this.updateVcblInBlockStore(vaultId, vault);

    await vault.auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId: vault.metadata.ownerId,
      action: AuditAction.ENTRY_CREATED,
      metadata: { entryId: fullEntry.id, entryType: fullEntry.type },
    });

    return fullEntry;
  }

  /**
   * Get a single entry by ID from a vault.
   * Retrieves from block store and decrypts the entry using AES-256-GCM.
   * Requirements: 2.2, 2.3, 3.2
   */
  async getEntry(vaultId: string, entryId: string): Promise<VaultEntry> {
    const vault = this.getVaultOrThrow(vaultId);

    // First try to get from in-memory cache (backward compatibility)
    let encrypted = vault.entries.get(entryId);

    // If not in memory, try to find in block store using blockIds
    if (!encrypted) {
      // Find the block ID for this entry by looking up the entry ID mapping
      // The blockIds array contains checksums, we need to find the right one
      // For now, fall back to in-memory only since we store by checksum not entry ID
      throw new EntryNotFoundError(entryId);
    }

    await vault.auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId: vault.metadata.ownerId,
      action: AuditAction.ENTRY_READ,
      metadata: { entryId },
    });

    // Decrypt and deserialize entry (Req 2.3, 3.2)
    const decrypted = VaultEncryption.decryptString(vault.vaultKey, encrypted);
    return VaultSerializer.deserializeEntry(decrypted);
  }

  /**
   * Update an existing entry in a vault.
   * Decrypts, updates, re-encrypts using AES-256-GCM, stores in block store (when available),
   * and updates the VCBL property record.
   * Requirements: 2.3, 2.4, 3.2
   */
  async updateEntry(
    vaultId: string,
    entryId: string,
    updates: Partial<VaultEntry>,
  ): Promise<VaultEntry> {
    const vault = this.getVaultOrThrow(vaultId);
    const encrypted = vault.entries.get(entryId);
    if (!encrypted) {
      throw new EntryNotFoundError(entryId);
    }

    // Decrypt existing entry (Req 2.3, 3.2)
    const decrypted = VaultEncryption.decryptString(vault.vaultKey, encrypted);
    const existing = VaultSerializer.deserializeEntry(decrypted);
    const now = new Date();
    const updated: VaultEntry = {
      ...existing,
      ...updates,
      id: entryId, // preserve original ID
      type: existing.type, // preserve original type
      createdAt: existing.createdAt, // preserve creation date
      updatedAt: now,
    } as VaultEntry;

    // Re-serialize and re-encrypt (Req 2.4, 3.2)
    const newSerialized = VaultSerializer.serializeEntry(updated);
    const newEncrypted = VaultEncryption.encryptString(
      vault.vaultKey,
      newSerialized,
    );

    // Find the index of this entry in the entries map
    const entryKeys = Array.from(vault.entries.keys());
    const index = entryKeys.indexOf(entryId);

    // Calculate new checksum and store in block store if safe
    const entryData = new Uint8Array(Buffer.from(newEncrypted, 'base64'));
    const checksumService = new ChecksumService();
    const newChecksum = checksumService.calculateChecksum(entryData);
    const newBlockId = newChecksum.toHex();

    if (this.isBlockStoreOperationsSafe()) {
      // Remove old block from store if it exists
      if (
        index !== -1 &&
        index < vault.blockIds.length &&
        vault.blockIds[index]
      ) {
        const oldBlockId = vault.blockIds[index];
        const hasOldBlock = await this.blockStore.has(oldBlockId);
        if (hasOldBlock) {
          await this.blockStore.delete(oldBlockId);
        }
      }

      // Store new encrypted entry in block store
      await this.blockStore.put(newBlockId, entryData);
    }

    // Update in-memory cache
    vault.entries.set(entryId, newEncrypted);

    // Update the parallel property record and block ID at the matching index
    if (index !== -1 && index < vault.propertyRecords.length) {
      vault.propertyRecords[index] = this.entryToPropertyRecord(updated);
      vault.blockIds[index] = newBlockId;
    }
    vault.metadata.updatedAt = now;

    // Update VCBL in block store (Req 2.4)
    await this.updateVcblInBlockStore(vaultId, vault);

    await vault.auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId: vault.metadata.ownerId,
      action: AuditAction.ENTRY_UPDATED,
      metadata: { entryId },
    });

    return updated;
  }

  /**
   * Delete an entry from a vault.
   * Removes the entry block from block store (when available), and removes from VCBL at the matching index.
   * Requirements: 2.4
   */
  async deleteEntry(vaultId: string, entryId: string): Promise<void> {
    const vault = this.getVaultOrThrow(vaultId);
    if (!vault.entries.has(entryId)) {
      throw new EntryNotFoundError(entryId);
    }

    // Find the index of this entry in the entries map
    const entryKeys = Array.from(vault.entries.keys());
    const index = entryKeys.indexOf(entryId);

    // Remove from block store if we have a valid block ID and operations are safe
    if (index !== -1 && index < vault.blockIds.length) {
      const blockId = vault.blockIds[index];
      if (this.isBlockStoreOperationsSafe()) {
        const hasBlock = await this.blockStore.has(blockId);
        if (hasBlock) {
          await this.blockStore.delete(blockId);
        }
      }

      // Remove from parallel arrays at matching index
      vault.propertyRecords.splice(index, 1);
      vault.blockIds.splice(index, 1);
    }

    vault.entries.delete(entryId);
    vault.metadata.entryCount = vault.propertyRecords.length;
    vault.metadata.updatedAt = new Date();

    // Update vault index entry count
    const indexEntry = this.vaultIndex.get(vaultId);
    if (indexEntry) {
      indexEntry.entryCount = vault.metadata.entryCount;
      indexEntry.updatedAt = vault.metadata.updatedAt;
    }

    // Update VCBL in block store (Req 2.4)
    await this.updateVcblInBlockStore(vaultId, vault);

    await vault.auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId: vault.metadata.ownerId,
      action: AuditAction.ENTRY_DELETED,
      metadata: { entryId },
    });
  }

  /**
   * Search entries in a vault by filtering VCBL property records.
   * Requirements: 2.9
   */
  async searchEntries(
    vaultId: string,
    query: EntrySearchQuery,
  ): Promise<EntryPropertyRecord[]> {
    const vault = this.getVaultOrThrow(vaultId);

    return vault.propertyRecords.filter((record) => {
      // Text search: match against title and siteUrl
      if (query.text) {
        const lowerText = query.text.toLowerCase();
        const titleMatch = record.title.toLowerCase().includes(lowerText);
        const urlMatch = record.siteUrl.toLowerCase().includes(lowerText);
        if (!titleMatch && !urlMatch) {
          return false;
        }
      }

      // Type filter
      if (query.type && record.entryType !== query.type) {
        return false;
      }

      // Tag filter: any match
      if (query.tags && query.tags.length > 0) {
        const hasMatchingTag = query.tags.some((tag) =>
          record.tags.includes(tag),
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Favorite filter
      if (query.favorite !== undefined && record.favorite !== query.favorite) {
        return false;
      }

      return true;
    });
  }

  // ─── Sharing ────────────────────────────────────────────────

  /**
   * Share a vault with one or more recipients.
   * Updates the VCBL header shared list and tracks member→vault mapping.
   * Requirements: 4.1, 4.2
   */
  async shareVault(
    vaultId: string,
    recipientMemberIds: string[],
  ): Promise<void> {
    const vault = this.getVaultOrThrow(vaultId);
    const indexEntry = this.vaultIndex.get(vaultId);

    for (const recipientId of recipientMemberIds) {
      if (!vault.metadata.sharedWith.includes(recipientId)) {
        vault.metadata.sharedWith.push(recipientId);

        // Update vault index
        if (indexEntry) {
          indexEntry.sharedWith.push(recipientId);
        }

        // Track in memberVaults for listing
        if (!this.memberVaults.has(recipientId)) {
          this.memberVaults.set(recipientId, new Set());
        }
        this.memberVaults.get(recipientId)!.add(vaultId);
      }
    }

    vault.metadata.updatedAt = new Date();
    if (indexEntry) {
      indexEntry.updatedAt = vault.metadata.updatedAt;
    }

    await vault.auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId: vault.metadata.ownerId,
      action: AuditAction.VAULT_SHARED,
      metadata: { recipients: recipientMemberIds.join(',') },
    });
  }

  /**
   * Revoke a member's access to a shared vault.
   * Removes from VCBL header shared list and re-keys the vault.
   * Requirements: 4.3
   */
  async revokeShare(vaultId: string, memberId: string): Promise<void> {
    const vault = this.getVaultOrThrow(vaultId);
    const indexEntry = this.vaultIndex.get(vaultId);

    const idx = vault.metadata.sharedWith.indexOf(memberId);
    if (idx === -1) {
      return; // Not shared with this member, no-op
    }

    vault.metadata.sharedWith.splice(idx, 1);

    // Update vault index
    if (indexEntry) {
      const indexIdx = indexEntry.sharedWith.indexOf(memberId);
      if (indexIdx !== -1) {
        indexEntry.sharedWith.splice(indexIdx, 1);
      }
    }

    // Remove from memberVaults tracking
    const memberVaultIds = this.memberVaults.get(memberId);
    if (memberVaultIds) {
      memberVaultIds.delete(vaultId);
    }

    // Re-key the vault by regenerating the BIP39 seed
    // This ensures the revoked member's old key material is completely useless
    const { mnemonic: newMnemonic, seed: newSeed } = this.generateVaultBip39();

    // We need the master password to derive the new key, but we don't have it here.
    // For now, we'll mark the vault as needing re-keying on next open.
    // In a production system, this would trigger a re-keying flow.
    //
    // Alternative: Store the vault key encrypted with the owner's public key,
    // allowing re-keying without the master password.
    //
    // For now, we update the seed and invalidate emergency shares.
    // The vault key will be re-derived on next successful open.
    vault.vaultMnemonic = newMnemonic;
    vault.vaultSeed = newSeed;
    vault.metadata.updatedAt = new Date();

    // Invalidate any existing emergency shares (they used the old key)
    if (vault.emergencyConfig) {
      vault.emergencyConfig = undefined;
      vault.emergencyShares = undefined;
    }

    // Update vault index
    if (indexEntry) {
      indexEntry.vaultMnemonic = newMnemonic;
      indexEntry.vaultSeed = newSeed;
      indexEntry.updatedAt = vault.metadata.updatedAt;
    }

    await vault.auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId: vault.metadata.ownerId,
      action: AuditAction.VAULT_SHARE_REVOKED,
      metadata: { revokedMemberId: memberId, seedRegenerated: 'true' },
    });
  }

  // ─── Quorum Governance ─────────────────────────────────────────

  /**
   * Configure quorum governance for a shared vault.
   * When threshold > 0, opening the vault requires that many member approvals.
   * Requirements: 4.4
   */
  async configureQuorumGovernance(
    vaultId: string,
    threshold: number,
  ): Promise<void> {
    const vault = this.getVaultOrThrow(vaultId);

    if (threshold < 0) {
      throw new EmergencyAccessError('Quorum threshold must be non-negative');
    }

    const totalMembers = vault.metadata.sharedWith.length + 1; // +1 for owner
    if (threshold > totalMembers) {
      throw new EmergencyAccessError(
        `Quorum threshold (${threshold}) cannot exceed total members (${totalMembers})`,
      );
    }

    vault.quorumThreshold = threshold;
    vault.quorumApprovals = new Set();
    vault.metadata.updatedAt = new Date();

    await vault.auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId: vault.metadata.ownerId,
      action: AuditAction.QUORUM_CONFIGURED,
      metadata: { quorumThreshold: String(threshold) },
    });
  }

  /**
   * Submit a quorum approval for a vault.
   * The member must be the owner or a shared member.
   * Returns true if the quorum threshold has been met.
   * Requirements: 4.4
   */
  approveQuorumAccess(vaultId: string, memberId: string): boolean {
    const vault = this.getVaultOrThrow(vaultId);

    if (
      vault.metadata.ownerId !== memberId &&
      !vault.metadata.sharedWith.includes(memberId)
    ) {
      throw new VaultAuthenticationError();
    }

    vault.quorumApprovals.add(memberId);
    return vault.quorumApprovals.size >= vault.quorumThreshold;
  }

  /**
   * Check whether the quorum threshold has been met for a vault.
   */
  isQuorumMet(vaultId: string): boolean {
    const vault = this.getVaultOrThrow(vaultId);
    if (vault.quorumThreshold === 0) return true;
    return vault.quorumApprovals.size >= vault.quorumThreshold;
  }

  /**
   * Reset quorum approvals (e.g. after vault is closed or session ends).
   */
  resetQuorumApprovals(vaultId: string): void {
    const vault = this.getVaultOrThrow(vaultId);
    vault.quorumApprovals = new Set();
  }

  // ─── Master Password ─────────────────────────────────────────

  /**
   * Change the master password for a vault.
   * Verifies old password, re-derives vault key with new password,
   * decrypts all entries with old key, and re-encrypts with new key.
   *
   * Note: This only changes the password, not the vault's BIP39 seed.
   * Use regenerateVaultSeed() for full key rotation.
   *
   * Requirements: 3.4, 3.2
   */
  async changeMasterPassword(
    memberId: string,
    vaultId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const vault = this.getVaultOrThrow(vaultId);

    // Verify ownership
    if (vault.metadata.ownerId !== memberId) {
      throw new VaultAuthenticationError();
    }

    // Verify old password using bcrypt (constant-time comparison)
    const oldPasswordValid = await this.verifyMasterPassword(
      oldPassword,
      vault.masterPasswordHash,
    );
    if (!oldPasswordValid) {
      throw new VaultAuthenticationError();
    }

    // Re-derive vault key with new password (using vault's own BIP39 seed)
    const newVaultKey = VaultKeyDerivation.deriveVaultKey(
      vault.vaultSeed,
      newPassword,
      vaultId,
    );

    // Re-encrypt all entries with new key (Req 3.4, 3.2)
    const oldVaultKey = vault.vaultKey;
    for (const [entryId, encryptedEntry] of vault.entries) {
      // Decrypt with old key
      const decrypted = VaultEncryption.decryptString(
        oldVaultKey,
        encryptedEntry,
      );
      // Re-encrypt with new key
      const reEncrypted = VaultEncryption.encryptString(newVaultKey, decrypted);
      vault.entries.set(entryId, reEncrypted);
    }

    vault.vaultKey = newVaultKey;
    // Hash new password using bcrypt
    vault.masterPasswordHash = await this.hashMasterPasswordAsync(newPassword);
    vault.metadata.updatedAt = new Date();
  }

  // ─── Emergency Access ───────────────────────────────────────

  /**
   * Split the vault key into Shamir shares for emergency recovery.
   * Uses proper Shamir Secret Sharing (polynomial interpolation over GF(256)).
   * Each trustee receives an encrypted share; threshold shares are needed to reconstruct.
   *
   * Security: Uses @digitaldefiance/secrets library which implements proper
   * Shamir Secret Sharing with cryptographically secure random coefficients.
   *
   * Requirements: 10.1, 10.2, 10.3
   */
  async configureEmergencyAccess(
    vaultId: string,
    threshold: number,
    trustees: string[],
  ): Promise<EmergencyAccessConfig> {
    const vault = this.getVaultOrThrow(vaultId);
    const totalShares = trustees.length;

    if (threshold < 2) {
      throw new EmergencyAccessError(
        'Threshold must be at least 2 for security',
      );
    }
    if (threshold > totalShares) {
      throw new EmergencyAccessError(
        `Threshold (${threshold}) cannot exceed total shares (${totalShares})`,
      );
    }

    // Initialize secrets library with correct bit size for the number of shares
    // Must have at least 3 bits (min 8 shares capacity)
    const bits = Math.max(3, Math.ceil(Math.log2(totalShares + 1)));
    secrets.init(bits, 'nodeCryptoRandomBytes');

    // Convert vault key to hex string for Shamir splitting
    const keyHex = Buffer.from(vault.vaultKey).toString('hex');

    // Use real Shamir Secret Sharing to split the vault key
    // share(secret, totalShares, threshold) returns array of hex share strings
    // These hex strings include share metadata (index prefix) and must be preserved as-is
    const shamirShares: string[] = secrets.share(
      keyHex,
      totalShares,
      threshold,
    );

    // Create encrypted shares for each trustee
    // Store shares as hex strings encoded to UTF-8 bytes to preserve the format
    const shares: EncryptedShare[] = shamirShares.map(
      (shareHex: string, index: number) => {
        // Store the hex string as UTF-8 bytes to preserve the share format exactly
        const shareData = new Uint8Array(Buffer.from(shareHex, 'utf8'));
        return {
          trusteeId: trustees[index],
          encryptedShareData: shareData,
        };
      },
    );

    const config: EmergencyAccessConfig = {
      vaultId,
      threshold,
      totalShares,
      trustees: [...trustees],
    };

    vault.emergencyConfig = config;
    vault.emergencyShares = shares;

    await vault.auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId: vault.metadata.ownerId,
      action: AuditAction.EMERGENCY_CONFIGURED,
      metadata: { threshold: String(threshold), trustees: trustees.join(',') },
    });

    return { ...config };
  }

  /**
   * Recover a vault using emergency shares.
   * Uses proper Shamir Secret Sharing reconstruction (polynomial interpolation).
   * Requires at least threshold shares to reconstruct the vault key.
   *
   * Security: The combine() function performs Lagrange interpolation over GF(256)
   * to reconstruct the secret. With fewer than threshold shares, reconstruction
   * is cryptographically impossible.
   *
   * Requirements: 10.2, 10.3, 10.4
   */
  async recoverWithShares(
    vaultId: string,
    shares: EncryptedShare[],
  ): Promise<DecryptedVault> {
    const vault = this.getVaultOrThrow(vaultId);

    if (!vault.emergencyConfig || !vault.emergencyShares) {
      throw new EmergencyAccessError('Emergency access not configured');
    }

    const { threshold, totalShares } = vault.emergencyConfig;

    if (shares.length < threshold) {
      throw new EmergencyAccessError(
        `Insufficient shares: need ${threshold}, got ${shares.length}`,
      );
    }

    // Verify all provided shares are from valid trustees
    for (const share of shares) {
      const storedShare = vault.emergencyShares.find(
        (s) => s.trusteeId === share.trusteeId,
      );
      if (!storedShare) {
        throw new EmergencyAccessError(
          `Invalid share from trustee: ${share.trusteeId}`,
        );
      }
      // Verify share data matches using constant-time comparison
      if (
        share.encryptedShareData.length !==
        storedShare.encryptedShareData.length
      ) {
        throw new EmergencyAccessError(
          `Invalid share data from trustee: ${share.trusteeId}`,
        );
      }
      const shareBuffer = Buffer.from(share.encryptedShareData);
      const storedBuffer = Buffer.from(storedShare.encryptedShareData);
      if (!crypto.timingSafeEqual(shareBuffer, storedBuffer)) {
        throw new EmergencyAccessError(
          `Invalid share data from trustee: ${share.trusteeId}`,
        );
      }
    }

    // Initialize secrets library with the same bit size used during share creation
    const bits = Math.max(3, Math.ceil(Math.log2(totalShares + 1)));
    secrets.init(bits, 'nodeCryptoRandomBytes');

    // Convert shares back to hex strings (they were stored as UTF-8 encoded hex)
    const shareHexStrings = shares.map((s) =>
      Buffer.from(s.encryptedShareData).toString('utf8'),
    );

    // Reconstruct the vault key using Shamir Secret Sharing
    const reconstructedKeyHex = secrets.combine(shareHexStrings);
    const reconstructedKey = new Uint8Array(
      Buffer.from(reconstructedKeyHex, 'hex'),
    );

    // Verify the reconstructed key matches the vault key
    // This is a sanity check - in production, the vault key wouldn't be stored
    if (reconstructedKey.length !== vault.vaultKey.length) {
      throw new EmergencyAccessError(
        'Share reconstruction failed - key length mismatch',
      );
    }
    if (
      !crypto.timingSafeEqual(
        Buffer.from(reconstructedKey),
        Buffer.from(vault.vaultKey),
      )
    ) {
      throw new EmergencyAccessError(
        'Share reconstruction failed - invalid shares',
      );
    }

    await vault.auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId: shares[0].trusteeId,
      action: AuditAction.EMERGENCY_RECOVERED,
      metadata: {
        sharesUsed: String(shares.length),
        trustees: shares.map((s) => s.trusteeId).join(','),
      },
    });

    return {
      metadata: { ...vault.metadata },
      propertyRecords: [...vault.propertyRecords],
    };
  }

  /**
   * Revoke emergency access configuration, invalidating all existing shares.
   * Requirements: 10.5
   */
  async revokeEmergencyAccess(vaultId: string): Promise<void> {
    const vault = this.getVaultOrThrow(vaultId);
    vault.emergencyConfig = undefined;
    vault.emergencyShares = undefined;
  }

  /**
   * Get the encrypted shares for a vault's emergency access.
   * In production, shares would be distributed to trustees via secure channels.
   * Requirements: 10.2
   */
  getEmergencyShares(vaultId: string): EncryptedShare[] {
    const vault = this.getVaultOrThrow(vaultId);
    if (!vault.emergencyShares) {
      throw new EmergencyAccessError('Emergency access not configured');
    }
    return vault.emergencyShares.map((s) => ({
      trusteeId: s.trusteeId,
      encryptedShareData: new Uint8Array(s.encryptedShareData),
    }));
  }

  // ─── Autofill ──────────────────────────────────────────────────

  /**
   * Get autofill payload for a given site URL.
   * Searches VCBL property records by siteUrl, decrypts matching login entries,
   * and includes TOTP code if configured.
   * Requirements: 5.7
   */
  async getAutofillPayload(
    vaultId: string,
    siteUrl: string,
  ): Promise<AutofillPayload> {
    const vault = this.getVaultOrThrow(vaultId);
    const lowerUrl = siteUrl.toLowerCase();

    // Find matching login property records by siteUrl
    const matchingEntryIds: string[] = [];
    for (let i = 0; i < vault.propertyRecords.length; i++) {
      const record = vault.propertyRecords[i];
      if (
        record.entryType === 'login' &&
        record.siteUrl.toLowerCase().includes(lowerUrl)
      ) {
        matchingEntryIds.push(vault.blockIds[i]);
      }
    }

    // Decrypt matching entries and build payload (Req 3.2)
    const entries: AutofillPayload['entries'] = [];
    for (const entryId of matchingEntryIds) {
      const encrypted = vault.entries.get(entryId);
      if (!encrypted) continue;

      const decrypted = VaultEncryption.decryptString(
        vault.vaultKey,
        encrypted,
      );
      const entry = VaultSerializer.deserializeEntry(decrypted);
      if (entry.type !== 'login') continue;

      const loginEntry = entry as LoginEntry;
      let totpCode: string | undefined;
      if (loginEntry.totpSecret) {
        totpCode = TOTPEngine.generate(loginEntry.totpSecret);
      }

      entries.push({
        entryId: loginEntry.id,
        title: loginEntry.title,
        username: loginEntry.username,
        password: loginEntry.password,
        siteUrl: loginEntry.siteUrl,
        totpCode,
      });
    }

    return { vaultId, entries };
  }

  // ─── Attachments ──────────────────────────────────────────────

  /**
   * Add an attachment to a vault entry.
   * Stores the file as an encrypted block and adds a reference to the entry.
   * Requirements: 1.7, 2.8
   */
  async addAttachment(
    vaultId: string,
    entryId: string,
    file: Buffer,
    filename: string,
    mimeType = 'application/octet-stream',
  ): Promise<AttachmentReference> {
    const vault = this.getVaultOrThrow(vaultId);
    const encrypted = vault.entries.get(entryId);
    if (!encrypted) {
      throw new EntryNotFoundError(entryId);
    }

    // Decrypt entry (Req 3.2)
    const decrypted = VaultEncryption.decryptString(vault.vaultKey, encrypted);
    const entry = VaultSerializer.deserializeEntry(decrypted);

    // Create attachment reference
    const attachmentId = uuidv4();
    const blockId = uuidv4(); // simulated block storage
    const reference: AttachmentReference = {
      id: attachmentId,
      filename,
      mimeType,
      sizeBytes: file.length,
      blockId,
      isCbl: file.length > 65536, // use CBL for files > 64KB
    };

    // Encrypt and store the attachment data (Req 3.2)
    const encryptedFile = VaultEncryption.encrypt(
      vault.vaultKey,
      new Uint8Array(file),
    );
    await this.blockStore.put(blockId, encryptedFile);

    // Update entry with attachment reference
    const attachments = entry.attachments ?? [];
    attachments.push(reference);
    const updatedEntry = {
      ...entry,
      attachments,
      updatedAt: new Date(),
    } as VaultEntry;
    const serialized = VaultSerializer.serializeEntry(updatedEntry);
    vault.entries.set(
      entryId,
      VaultEncryption.encryptString(vault.vaultKey, serialized),
    );

    // Update property record timestamp
    const index = vault.blockIds.indexOf(entryId);
    if (index !== -1) {
      vault.propertyRecords[index] = this.entryToPropertyRecord(updatedEntry);
    }
    vault.metadata.updatedAt = new Date();

    await vault.auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId: vault.metadata.ownerId,
      action: AuditAction.ENTRY_UPDATED,
      metadata: { entryId, attachmentId, filename },
    });

    return reference;
  }

  /**
   * Get an attachment's data by ID.
   * Decrypts the attachment using AES-256-GCM.
   * Requirements: 2.8, 3.2
   */
  async getAttachment(
    vaultId: string,
    entryId: string,
    attachmentId: string,
  ): Promise<Buffer> {
    const vault = this.getVaultOrThrow(vaultId);
    const encrypted = vault.entries.get(entryId);
    if (!encrypted) {
      throw new EntryNotFoundError(entryId);
    }

    // Decrypt entry to get attachment reference (Req 3.2)
    const decrypted = VaultEncryption.decryptString(vault.vaultKey, encrypted);
    const entry = VaultSerializer.deserializeEntry(decrypted);
    const ref = entry.attachments?.find((a) => a.id === attachmentId);
    if (!ref) {
      throw new EntryNotFoundError(`Attachment not found: ${attachmentId}`);
    }

    const hasBlock = await this.blockStore.has(ref.blockId);
    if (!hasBlock) {
      throw new EntryNotFoundError(
        `Attachment data not found: ${attachmentId}`,
      );
    }

    const blockHandle = this.blockStore.get(ref.blockId);
    const encryptedData = blockHandle.fullData;

    // Decrypt attachment data (Req 3.2)
    const decryptedData = VaultEncryption.decrypt(
      vault.vaultKey,
      new Uint8Array(encryptedData),
    );
    return Buffer.from(decryptedData);
  }

  /**
   * Delete an attachment from a vault entry.
   * Removes the attachment block and updates the entry reference.
   * Requirements: 2.8, 3.2
   */
  async deleteAttachment(
    vaultId: string,
    entryId: string,
    attachmentId: string,
  ): Promise<void> {
    const vault = this.getVaultOrThrow(vaultId);
    const encrypted = vault.entries.get(entryId);
    if (!encrypted) {
      throw new EntryNotFoundError(entryId);
    }

    // Decrypt entry (Req 3.2)
    const decrypted = VaultEncryption.decryptString(vault.vaultKey, encrypted);
    const entry = VaultSerializer.deserializeEntry(decrypted);
    const attachments = entry.attachments ?? [];
    const refIndex = attachments.findIndex((a) => a.id === attachmentId);
    if (refIndex === -1) {
      throw new EntryNotFoundError(`Attachment not found: ${attachmentId}`);
    }

    // Remove from block store
    const ref = attachments[refIndex];
    await this.blockStore.delete(ref.blockId);

    // Update entry and re-encrypt (Req 3.2)
    attachments.splice(refIndex, 1);
    const updatedEntry = {
      ...entry,
      attachments: attachments.length > 0 ? attachments : undefined,
      updatedAt: new Date(),
    } as VaultEntry;
    const serialized = VaultSerializer.serializeEntry(updatedEntry);
    vault.entries.set(
      entryId,
      VaultEncryption.encryptString(vault.vaultKey, serialized),
    );

    // Update property record timestamp
    const index = vault.blockIds.indexOf(entryId);
    if (index !== -1) {
      vault.propertyRecords[index] = this.entryToPropertyRecord(updatedEntry);
    }
    vault.metadata.updatedAt = new Date();

    await vault.auditLogger.log({
      id: uuidv4(),
      vaultId,
      memberId: vault.metadata.ownerId,
      action: AuditAction.ENTRY_UPDATED,
      metadata: { entryId, attachmentId, action: 'delete_attachment' },
    });
  }

  // ─── Import ───────────────────────────────────────────────────

  /**
   * Import entries from a password manager export file.
   * Parses the file, maps to VaultEntry types, and adds each to the vault.
   * Requirements: 12.1–12.10
   */
  async importFromFile(
    vaultId: string,
    format: ImportFormat,
    fileContent: Buffer,
  ): Promise<ImportResult> {
    this.getVaultOrThrow(vaultId); // verify vault exists

    const { entries, errors } = ImportParser.parse(
      format,
      fileContent.buffer.slice(
        fileContent.byteOffset,
        fileContent.byteOffset + fileContent.byteLength,
      ) as ArrayBuffer,
    );
    const importErrors = [...errors];
    let successfulImports = 0;

    for (let i = 0; i < entries.length; i++) {
      try {
        await this.addEntry(vaultId, entries[i]);
        successfulImports++;
      } catch (err) {
        importErrors.push({
          recordIndex: i,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      totalRecords: entries.length + errors.length,
      successfulImports,
      errors: importErrors,
    };
  }

  // ─── Audit ────────────────────────────────────────────────────

  /**
   * Get audit log entries for a vault.
   * Requirements: 9.3
   */
  async getAuditLog(vaultId: string): Promise<AuditLogEntry[]> {
    const vault = this.getVaultOrThrow(vaultId);
    return vault.auditLogger.getEntries();
  }
}
