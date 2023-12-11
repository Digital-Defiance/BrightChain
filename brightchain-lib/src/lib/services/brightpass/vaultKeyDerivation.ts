import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

/**
 * VaultKeyDerivation - Derives vault encryption keys from vault seed and master password
 *
 * Uses HKDF-SHA256 to derive a 32-byte AES-256 key from:
 * - IKM (Input Key Material): vault's BIP39 seed + master password
 * - Info: vault ID (for domain separation)
 *
 * Security: Each vault has its own independent BIP39 seed that can be
 * regenerated/cycled without affecting other vaults or the member's identity.
 *
 * Requirements:
 * - 5.1: Derives 32-byte AES-256 keys using HKDF-SHA256
 * - 5.2: Combines vault seed and master password as input key material
 * - 5.3: Uses vault ID as the info parameter for domain separation
 */
export class VaultKeyDerivation {
  /**
   * Derive a vault encryption key
   * @param vaultSeed - Vault's own BIP39 seed (64 bytes) - independent of member
   * @param masterPassword - User's master password
   * @param vaultId - Unique vault identifier (used for domain separation)
   * @returns 32-byte AES-256 key
   */
  public static deriveVaultKey(
    vaultSeed: Uint8Array,
    masterPassword: string,
    vaultId: string,
  ): Uint8Array {
    // Combine vault seed + master password as IKM (Requirement 5.2)
    const passwordBytes = new TextEncoder().encode(masterPassword);
    const ikm = new Uint8Array(vaultSeed.length + passwordBytes.length);
    ikm.set(vaultSeed, 0);
    ikm.set(passwordBytes, vaultSeed.length);

    // Use vault ID as info parameter for domain separation (Requirement 5.3)
    const info = new TextEncoder().encode(vaultId);

    // Derive 32-byte key using HKDF-SHA256 (Requirement 5.1)
    return hkdf(sha256, ikm, undefined, info, 32);
  }
}
