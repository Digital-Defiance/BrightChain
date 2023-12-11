/**
 * @fileoverview Keyring Factory — auto-detects the best available key protection tier.
 *
 * Tier 1: SecureEnclaveKeyring (macOS Apple Silicon — hardware-backed)
 * Tier 2: KeytarKeyring (Linux/macOS/Windows — OS credential store)
 * Tier 3: In-memory only (fallback — key derived from SYSTEM_MNEMONIC each startup)
 *
 * @see .kiro/specs/member-pool-security/follow-up-hardening.md — Item 2
 */

import type { IKeyring } from './keyring.types';

/**
 * Detected key protection tier.
 */
export enum KeyProtectionTier {
  /** Hardware-backed Secure Enclave (macOS Apple Silicon) */
  SecureEnclave = 'secure-enclave',
  /** OS credential store via keytar */
  OsKeyring = 'os-keyring',
  /** No persistent key protection — key re-derived from mnemonic each startup */
  None = 'none',
}

/**
 * Result of keyring detection.
 */
export interface IKeyringDetectionResult {
  tier: KeyProtectionTier;
  keyring: IKeyring | null;
  reason: string;
}

/**
 * Detect and create the best available keyring for this platform.
 *
 * Tries each tier in order and returns the first one that works.
 * Never throws — returns tier=None if nothing is available.
 */
export async function detectBestKeyring(): Promise<IKeyringDetectionResult> {
  // Tier 1: Secure Enclave (macOS Apple Silicon only)
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    try {
      const { SecureEnclaveKeyring } = await import(
        './secureEnclaveKeyring.js'
      );
      const available = await SecureEnclaveKeyring.isAvailable();
      if (available) {
        const keyring = SecureEnclaveKeyring.getInstance();
        await keyring.initialize();
        return {
          tier: KeyProtectionTier.SecureEnclave,
          keyring,
          reason: 'Secure Enclave available on macOS Apple Silicon',
        };
      }
    } catch {
      // Secure Enclave not available — fall through
    }
  }

  // Tier 2: OS Keyring via keytar
  try {
    const { KeytarKeyring } = await import('./keytarKeyring.js');
    const available = await KeytarKeyring.isAvailable();
    if (available) {
      const keyring = new KeytarKeyring();
      await keyring.initialize();
      return {
        tier: KeyProtectionTier.OsKeyring,
        keyring,
        reason: 'OS keyring available via keytar',
      };
    }
  } catch {
    // keytar not available — fall through
  }

  // Tier 3: No persistent key protection
  return {
    tier: KeyProtectionTier.None,
    keyring: null,
    reason:
      'No key protection available. System user key will be re-derived from SYSTEM_MNEMONIC on each startup.',
  };
}
