/**
 * Browser-compatible ECIES service exports
 *
 * This module provides a web-based implementation of the ECIES (Elliptic Curve Integrated Encryption Scheme)
 * service that mirrors the functionality of the server-side implementation but uses browser-compatible libraries.
 *
 * Key features:
 * - Mnemonic generation and wallet derivation using @scure/bip39 and @scure/bip32
 * - ECDH key exchange using @noble/curves/secp256k1
 * - AES-GCM encryption using Web Crypto API
 * - ECDSA signatures using @noble/curves/secp256k1
 * - Single and simple recipient encryption modes
 * - CRC16 validation for data integrity
 *
 * Usage:
 * ```typescript
 * import { ECIESService } from './services/ecies';
 *
 * const ecies = new ECIESService();
 * const mnemonic = ecies.generateNewMnemonic();
 * const { privateKey, publicKey } = ecies.mnemonicToSimpleKeyPair(mnemonic);
 *
 * const message = new TextEncoder().encode('Hello, World!');
 * const encrypted = await ecies.encryptSimpleOrSingle(false, publicKey, message);
 * const decrypted = await ecies.decryptSimpleOrSingleWithHeader(false, privateKey, encrypted);
 * ```
 */

export * from './cryptoCore';
export * from './example';
export * from './file';
export * from './integration';
export * from './interfaces';
export * from './multiRecipient';
export * from './service';
export * from './signature';
export * from './singleRecipient';

// Main service export
export { ECIESService as default } from './service';
