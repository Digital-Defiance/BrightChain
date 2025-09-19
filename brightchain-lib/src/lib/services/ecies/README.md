# Browser-Compatible ECIES Service

This directory contains a web-based implementation of the ECIES (Elliptic Curve Integrated Encryption Scheme) service that mirrors the functionality of the server-side implementation but uses browser-compatible libraries.

## Overview

The browser ECIES service provides the same cryptographic functionality as the server-side version, including:

- **Mnemonic generation and wallet derivation** using BIP39/BIP32
- **ECDH key exchange** using secp256k1 curve
- **AES-GCM encryption** using Web Crypto API
- **ECDSA signatures** using secp256k1
- **Single and simple recipient encryption modes**
- **CRC16 validation** for data integrity

## Dependencies

The service uses the following browser-compatible libraries:

- `@scure/bip39` - BIP39 mnemonic generation and validation
- `@scure/bip32` - BIP32 hierarchical deterministic key derivation
- `@noble/curves` - Elliptic curve cryptography (secp256k1)
- `@noble/hashes` - Cryptographic hash functions
- Web Crypto API - Native browser AES-GCM encryption

## Architecture

### Core Components

1. **`crypto-core.ts`** - Core cryptographic operations (key generation, ECDH)
2. **`single-recipient.ts`** - Single recipient encryption/decryption
3. **`signature.ts`** - ECDSA signature operations
4. **`service.ts`** - Main service that integrates all components
5. **`utils.ts`** - Utility functions (CRC16, hex conversion, etc.)
6. **`constants.ts`** - Cryptographic constants matching server-side
7. **`interfaces.ts`** - TypeScript interfaces

### Encryption Modes

- **Simple Mode**: Basic encryption without CRC or length prefix
- **Single Mode**: Encryption with data length and CRC16 validation
- **Multiple Mode**: Multi-recipient encryption (planned for future implementation)

## Usage

### Basic Example

```typescript
import { ECIESService } from './services/ecies';

// Create service instance
const ecies = new ECIESService();

// Generate mnemonic and derive keys
const mnemonic = ecies.generateNewMnemonic();
const { privateKey, publicKey } = ecies.mnemonicToSimpleKeyPair(mnemonic);

// Encrypt a message
const message = new TextEncoder().encode('Hello, World!');
const encrypted = await ecies.encryptSimpleOrSingle(false, publicKey, message);

// Decrypt the message
const decrypted = await ecies.decryptSimpleOrSingleWithHeader(false, privateKey, encrypted);
const result = new TextDecoder().decode(decrypted);
```

### Wallet Derivation

```typescript
// Generate new mnemonic
const mnemonic = ecies.generateNewMnemonic();

// Derive wallet from mnemonic
const wallet = ecies.walletAndSeedFromMnemonic(mnemonic);
console.log('Seed:', wallet.seed);
console.log('Private Key:', wallet.privateKey);
console.log('Public Key:', wallet.publicKey);
```

### Digital Signatures

```typescript
// Sign a message
const message = new TextEncoder().encode('Message to sign');
const signature = ecies.signMessage(privateKey, message);

// Verify signature
const isValid = ecies.verifyMessage(publicKey, message, signature);
```

### Simple vs Single Mode

```typescript
// Simple mode (no CRC, smaller overhead)
const simpleEncrypted = await ecies.encryptSimpleOrSingle(true, publicKey, message);
const simpleDecrypted = await ecies.decryptSimpleOrSingleWithHeader(true, privateKey, simpleEncrypted);

// Single mode (with CRC and length validation)
const singleEncrypted = await ecies.encryptSimpleOrSingle(false, publicKey, message);
const singleDecrypted = await ecies.decryptSimpleOrSingleWithHeader(false, privateKey, singleEncrypted);
```

## Compatibility

This implementation is designed to be fully compatible with the server-side ECIES service:

- Uses the same cryptographic constants and algorithms
- Produces identical encrypted output format
- Supports the same key derivation paths
- Implements the same CRC16 algorithm for data integrity

## Security Considerations

- All cryptographic operations use well-established, audited libraries
- Private keys are handled as Uint8Array and should be properly secured
- The Web Crypto API provides secure random number generation
- ECDH shared secrets are properly derived using secp256k1

## Testing

Run the examples to test the functionality:

```typescript
import { runAllExamples } from './services/ecies/example';

// Run all examples in browser console
runAllExamples();
```

## Future Enhancements

- Multi-recipient encryption support
- Key caching and management
- Integration with browser storage APIs
- Performance optimizations for large messages

## Error Handling

The service throws descriptive errors for:

- Invalid mnemonics
- Malformed public/private keys
- Encryption/decryption failures
- CRC validation errors
- Invalid encryption types

Always wrap cryptographic operations in try-catch blocks for proper error handling.