---
title: "ECIES-Lib: Cross-Platform ECIES Library"
parent: "Papers"
nav_order: 6
---

# ECIES-Lib: A Cross-Platform Elliptic Curve Integrated Encryption Scheme Library with Homomorphic Voting Extensions

**Authors:** Digital Defiance  
**Version:** 5.1.2  
**Date:** 2026  
**License:** MIT  

---

## Abstract

This paper presents the design, architecture, and implementation of `@digitaldefiance/ecies-lib` and its Node.js counterpart `@digitaldefiance/node-ecies-lib`, a pair of binary-compatible TypeScript libraries implementing the Elliptic Curve Integrated Encryption Scheme (ECIES) protocol version 4.0. The libraries provide enterprise-grade cryptographic services including single- and multi-recipient encryption using secp256k1 with AES-256-GCM, HKDF-SHA256 key derivation, streaming encryption for large payloads, a pluggable identity provider system, and a comprehensive homomorphic voting subsystem based on the Paillier cryptosystem. The dual-library architecture ensures identical binary wire formats across browser (Web Crypto API) and server (Node.js crypto) environments, enabling seamless cross-platform encrypted communication. We describe the protocol design decisions, the layered service architecture, the multi-recipient optimization strategy, the identity provider abstraction, and the government-grade voting system with 17 supported methods. The libraries are validated by over 4,300 combined test cases including property-based tests using fast-check.

**Keywords:** ECIES, elliptic curve cryptography, AES-GCM, HKDF, multi-recipient encryption, Paillier homomorphic encryption, cross-platform cryptography, TypeScript, Web Crypto API

---

## I. Introduction

The Elliptic Curve Integrated Encryption Scheme (ECIES) is a hybrid encryption framework that combines the asymmetric properties of elliptic curve Diffie-Hellman (ECDH) key agreement with the efficiency of symmetric authenticated encryption [1]. While ECIES is well-established in the cryptographic literature, practical implementations that operate identically across heterogeneous runtime environments remain challenging. Browser environments rely on the Web Crypto API with its asynchronous, promise-based interface, while server environments leverage Node.js's synchronous crypto module with Buffer-based I/O. Achieving binary compatibility between these two worlds requires careful protocol specification and disciplined implementation.

This paper describes `ecies-lib` (the browser-compatible core) and `node-ecies-lib` (the Node.js extension), collectively referred to as the ECIES-Lib system. The system is developed as part of the BrightChain ecosystem [2], where it serves as the foundational cryptographic layer for the Owner-Free File System (OFFS), encrypted block storage, ledger signature verification, and a distributed voting system.

The contributions of this work are:

1. A fully specified ECIES v4.0 protocol with HKDF key derivation and AAD binding that produces identical ciphertext formats on browser and server.
2. An optimized multi-recipient encryption scheme that uses a single ephemeral key pair per message, reducing per-recipient overhead to 60 bytes.
3. A pluggable identity provider system that decouples cryptographic operations from identifier formats (ObjectId, GUID, UUID, or custom).
4. A government-grade homomorphic voting system supporting 17 voting methods with Paillier encryption, threshold decryption, and immutable audit logging.
5. A streaming encryption architecture that processes arbitrarily large files with bounded memory consumption.

---

## II. Related Work

ECIES was first formalized by Abdalla, Bellare, and Rogaway [3] and later standardized in IEEE 1363a and ANSI X9.63. The scheme combines ECDH key agreement with a key derivation function (KDF) and a symmetric cipher to produce a hybrid encryption system. Modern implementations typically use AES-GCM for authenticated encryption, providing both confidentiality and integrity in a single pass [4].

Several open-source ECIES implementations exist. The `eccrypto` library for Node.js provides basic ECIES with secp256k1 but lacks multi-recipient support and browser compatibility. The `eth-crypto` package wraps Ethereum key operations but is tightly coupled to the Ethereum ecosystem. The Web3.js library includes encryption utilities but does not provide a standalone ECIES service. None of these libraries offer binary-compatible cross-platform operation, pluggable identity systems, or integrated voting capabilities.

The Paillier cryptosystem [5], used in the voting subsystem, is an additively homomorphic encryption scheme where the product of two ciphertexts decrypts to the sum of the plaintexts. This property enables encrypted vote tallying without decrypting individual ballots, a critical requirement for verifiable electronic voting [6].

---

## III. Protocol Specification

### A. ECIES v4.0 Protocol Overview

The ECIES v4.0 protocol implemented by this library operates in three encryption modes: Basic, WithLength, and Multiple. All modes share a common key derivation and symmetric encryption core but differ in their header formats and overhead characteristics.

The protocol uses the following cryptographic primitives:

- **Elliptic Curve:** secp256k1 (256-bit)
- **Key Agreement:** ECDH with compressed 33-byte public keys
- **Key Derivation:** HKDF-SHA256 (RFC 5869) with info string `"ecies-v2-key-derivation"`
- **Symmetric Cipher:** AES-256-GCM with 12-byte IV and 16-byte authentication tag
- **Signatures:** ECDSA over secp256k1
- **Hashing:** SHA-256 and SHA-512

### B. Key Derivation

Given an ephemeral private key `e` and a recipient public key `R`, the shared secret is computed as:

```
S = ECDH(e, R) = e · R
```

The symmetric key is then derived using HKDF:

```
K = HKDF-SHA256(
    IKM = S,
    salt = empty,
    info = "ecies-v2-key-derivation",
    L = 32
)
```

This two-step derivation ensures that the symmetric key has uniform distribution even if the ECDH shared secret has structural biases, as recommended by NIST SP 800-56C [7].

### C. Encryption Modes

#### 1) Basic Mode

Basic mode provides minimal overhead encryption without a data length prefix. The ciphertext format is:

```
[Version (1B)] [CipherSuite (1B)] [Type (1B)] [EphemeralPubKey (33B)]
[IV (12B)] [AuthTag (16B)] [Ciphertext]
```

Total fixed overhead: 64 bytes. This mode is suitable for fixed-size data where the length is known a priori.

#### 2) WithLength Mode

WithLength mode extends Basic mode with an 8-byte data length prefix, enabling streaming decryption and length verification:

```
[Version (1B)] [CipherSuite (1B)] [Type (1B)] [EphemeralPubKey (33B)]
[IV (12B)] [AuthTag (16B)] [DataLength (8B)] [Ciphertext]
```

Total fixed overhead: 72 bytes. BrightChain uses this mode for single-recipient block encryption because the 8-byte overhead is negligible relative to block sizes (1 KB to 512 KB) and the length field enables integrity verification during streaming decryption.

#### 3) Multiple Recipient Mode

Multiple recipient mode encrypts a single message for up to 65,535 recipients using a shared ephemeral key pair. The protocol generates a random symmetric "message key" and encrypts it individually for each recipient:

```
[Header: Version + CipherSuite + Type + EphemeralPubKey + IV + AuthTag] (64B)
[DataLength (8B)] [RecipientCount (2B)]
[RecipientID_1 (12B)] [EncryptedKey_1 (60B)]
[RecipientID_2 (12B)] [EncryptedKey_2 (60B)]
...
[EncryptedPayload]
```

Per-recipient overhead: `RECIPIENT_ID_SIZE + ENCRYPTED_KEY_SIZE` = 12 + 60 = 72 bytes (with default 12-byte ObjectId). The encrypted key entry contains the IV (12B), AuthTag (16B), and encrypted symmetric key (32B) for that recipient.

This design avoids the naive approach of encrypting the entire message N times, reducing total ciphertext size from O(N × M) to O(N × 72 + M) where M is the message size and N is the recipient count.

### D. Additional Authenticated Data (AAD) Binding

All encryption operations bind contextual metadata as AAD to the AES-GCM cipher:

- **Key Encryption (Multi-Recipient):** The recipient's ID bytes are used as AAD when encrypting the per-recipient symmetric key. This prevents an attacker from transplanting an encrypted key entry from one recipient slot to another.
- **Message Encryption:** The message header (version, cipher suite, ephemeral public key) is used as AAD when encrypting the payload. This prevents header manipulation attacks where an attacker modifies the header metadata without detection.

---

## IV. Architecture

### A. Layered Service Design

The library follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────┐
│           ECIESService (Facade)             │
├─────────────────────────────────────────────┤
│  EciesSingleRecipient  │ EciesMultiRecipient│
├─────────────────────────────────────────────┤
│  EciesCryptoCore  │  EciesSignature         │
├─────────────────────────────────────────────┤
│  AESGCMService  │  VotingService            │
├─────────────────────────────────────────────┤
│  Web Crypto API / @noble/curves             │
└─────────────────────────────────────────────┘
```

The `ECIESService` class serves as the primary facade, delegating to specialized components:

- **EciesCryptoCore:** Low-level cryptographic primitives including key generation, ECDH, public key normalization, mnemonic generation (BIP39), and HD wallet derivation (BIP32/BIP44).
- **EciesSingleRecipient:** Handles Basic and WithLength encryption modes with header parsing and component-level decryption.
- **EciesMultiRecipient:** Manages multi-recipient encryption including per-recipient key encryption, header construction, and recipient-specific decryption.
- **EciesSignature:** ECDSA signature creation and verification using secp256k1.
- **AESGCMService:** Symmetric AES-256-GCM encryption and decryption with support for authentication tags, AAD, and JSON serialization.
- **VotingService:** Paillier key derivation, homomorphic operations, and deterministic prime generation.

### B. Generic Type System

The `ECIESService` is parameterized by a generic type `TID extends PlatformID` where:

```typescript
type PlatformID = Uint8Array | Guid | ObjectId | string;
```

This type parameter flows through the entire service stack, ensuring type consistency between the service, members, and multi-recipient operations. Construction-time validation verifies that the configured `IIdProvider<TID>` produces IDs of the correct byte length and passes round-trip serialization tests.

### C. Configuration and Constants Registry

The library uses an immutable, deeply-frozen configuration object (`IConstants`) that encapsulates all cryptographic parameters. The `ConstantsRegistry` provides a named configuration store with provenance tracking:

```typescript
const config = createRuntimeConfiguration({
    idProvider: new GuidV4Provider()
});
// Automatically updates MEMBER_ID_LENGTH, RECIPIENT_ID_SIZE, etc.
```

Configuration checksums are computed at creation time to detect accidental mutation. The registry supports multiple named configurations for dependency injection and testing scenarios.

### D. Cross-Platform Binary Compatibility

The dual-library architecture achieves binary compatibility through several mechanisms:

1. **Shared Constants:** Both libraries import `IECIESConstants` from the same interface definition, ensuring identical header sizes, field offsets, and overhead calculations.
2. **Identical Wire Format:** The byte-level layout of encrypted messages is specified by the protocol, not by platform-specific serialization.
3. **Web Crypto API Alignment:** The browser library uses `crypto.subtle` for all symmetric operations, while the Node.js library wraps `crypto.createCipheriv` to produce identical output.
4. **Buffer/Uint8Array Normalization:** The Node.js library accepts both `Buffer` and `Uint8Array` inputs and normalizes internally, while the browser library operates exclusively on `Uint8Array`.

Binary compatibility is verified through cross-platform E2E test suites that encrypt on one platform and decrypt on the other.

---

## V. Identity Provider System

### A. Design Rationale

Cryptographic systems frequently need to associate identifiers with keys and encrypted messages. Rather than hardcoding a specific ID format, the library abstracts identity through the `IIdProvider<TID>` interface:

```typescript
interface IIdProvider<TID extends PlatformID> {
    readonly name: string;
    readonly byteLength: number;
    generate(): Uint8Array;
    serialize(id: Uint8Array): string;
    deserialize(str: string): Uint8Array;
    validate(id: Uint8Array): boolean;
    toBytes(id: TID): Uint8Array;
    fromBytes(bytes: Uint8Array): TID;
}
```

### B. Built-in Providers

Four providers are included:

| Provider | Byte Length | Serialization | Use Case |
|----------|------------|---------------|----------|
| ObjectIdProvider | 12 | 24-char hex | MongoDB integration |
| GuidV4Provider | 16 | 24-char base64 | Windows/.NET systems |
| UuidProvider | 16 | 36-char dashed | Standard UUID format |
| CustomIdProvider | 1-255 | Hex | Legacy/specialized |

When a provider is configured, the library automatically updates `MEMBER_ID_LENGTH` and `ECIES.MULTIPLE.RECIPIENT_ID_SIZE` to match, ensuring that multi-recipient headers correctly size recipient ID fields.

---

## VI. Streaming Encryption

### A. Chunk-Based Processing

For large files, the library provides a `ChunkProcessor` that segments data into fixed-size chunks, encrypts each chunk independently, and prepends a 32-byte chunk header:

```
[Magic (4B)] [Version (2B)] [Index (4B)] [OriginalSize (4B)]
[EncryptedSize (4B)] [Flags (2B)] [Reserved (12B)]
[EncryptedChunkData] [Optional SHA-256 Checksum (32B)]
```

Flags indicate whether the chunk is the last in the sequence and whether a checksum is appended. Checksums use constant-time comparison to prevent timing attacks during verification.

### B. Transform Streams

The Node.js library provides `Transform` stream implementations for pipeline integration:

- `EciesEncryptTransform`: Encrypts data chunks as they flow through the stream.
- `EciesDecryptTransform`: Decrypts and reassembles chunks.
- `ChecksumTransform`: Computes CRC checksums over streaming data.
- `XorTransform` / `XorMultipleTransform`: XOR cipher operations for BrightChain's OFFS whitening.

The browser library provides equivalent functionality using the Web Streams API (`ReadableStream` / `WritableStream`), maintaining the same chunk format for cross-platform compatibility.

### C. Memory Efficiency

The streaming architecture maintains bounded memory usage regardless of file size. The `EncryptionStream` service processes one chunk at a time, with a `ProgressTracker` reporting completion percentage. Empirical testing confirms less than 10 MB of memory usage for files of arbitrary size.

---

## VII. Homomorphic Voting System

### A. Overview

The voting subsystem implements a complete electronic voting system using the Paillier cryptosystem for additively homomorphic encryption. The system supports 17 voting methods classified into three security tiers:

- **Fully Homomorphic (8 methods):** Plurality, Approval, Weighted, Borda Count, Score, Yes/No, Yes/No/Abstain, Supermajority. These methods can be tallied entirely in the encrypted domain.
- **Multi-Round (4 methods):** Ranked Choice (IRV), Two-Round, STAR, STV. These require intermediate decryption between elimination rounds.
- **Insecure (3 methods):** Quadratic, Consensus, Consent-Based. These require non-homomorphic operations and are provided for completeness with explicit security warnings.

### B. Key Derivation from ECDH

Paillier key pairs are derived deterministically from ECDH shared secrets using a custom DRBG (Deterministic Random Bit Generator) based on HMAC-SHA512:

1. An ECDH shared secret is computed between two parties.
2. HKDF-SHA256 expands the shared secret into seed material.
3. A `SecureDeterministicDRBG` (HMAC-DRBG per NIST SP 800-90A) generates candidate primes.
4. Miller-Rabin primality testing (40 rounds) validates candidates.
5. Two primes `p` and `q` are combined to form the Paillier modulus `n = p × q`.

This derivation ensures that the same ECDH key exchange reproducibly generates the same Paillier key pair, enabling key recovery from mnemonics.

### C. Vote Encoding and Tallying

Votes are encoded as Paillier ciphertexts using the `VoteEncoder` class. For a plurality vote among `k` candidates, the encoder creates a vector of `k` ciphertexts where position `i` contains `E(1)` if the voter selected candidate `i` and `E(0)` otherwise. The homomorphic property allows the `Poll` to aggregate votes by multiplying ciphertexts:

```
Tally_i = ∏_j Vote_j_i = E(∑_j v_j_i)
```

The `PollTallier`, which holds the Paillier private key, decrypts the aggregated ciphertexts only after the poll is closed, enforcing temporal separation between vote collection and result computation.

### D. Security Architecture

The voting system enforces role separation:

- **Poll (Aggregator):** Holds only the Paillier public key. Can encrypt and aggregate votes but cannot decrypt them.
- **PollTallier:** Holds the Paillier private key. Can decrypt aggregated results only after poll closure.
- **Voter (Member):** Holds EC key pair for receipt verification and voting public key for vote encryption.

Additional security features include:

- **Immutable Audit Log:** A cryptographic hash chain records all operations with tamper detection.
- **Public Bulletin Board:** An append-only structure with Merkle tree integrity for transparent vote publication.
- **Verifiable Receipts:** ECDSA-signed confirmations that voters can independently verify.
- **Double-Vote Prevention:** Cryptographic enforcement that each voter can cast exactly one ballot.
- **Threshold Decryption:** Distributed trust with k-of-n Guardians for key splitting and collaborative decryption.

### E. Threshold Voting

The threshold voting extension distributes the Paillier private key among `n` Guardians using Shamir's Secret Sharing, requiring `k` of `n` to collaborate for decryption. The `CeremonyCoordinator` manages the key generation ceremony, the `GuardianRegistry` tracks guardian status, and the `DecryptionCombiner` reconstructs partial decryptions. An `IntervalScheduler` enables configurable real-time tally updates during voting, and a `TallyVerifier` provides zero-knowledge proofs of correct decryption.

---

## VIII. Secure Memory Management

The library provides `SecureBuffer` and `SecureString` classes for handling sensitive data in memory:

- **XOR Obfuscation:** Sensitive data is stored XOR'd with a random mask, preventing direct memory inspection.
- **Explicit Disposal:** The `dispose()` method zeros both the data and mask buffers.
- **Serialization Protection:** `toString()`, `toJSON()`, and `inspect()` are overridden to prevent accidental leakage through logging or serialization.
- **Auto-Zeroing:** Finalizers ensure memory is cleared when objects are garbage collected.

These primitives are used throughout the library for private keys, mnemonics, and symmetric keys.

---

## IX. Internationalization

Error messages are fully internationalized using the `@digitaldefiance/i18n-lib` engine. The library ships with translations in 8 languages: English (US/GB), French, Spanish, German, Chinese (Simplified), Japanese, and Ukrainian. Error classes use lazy i18n initialization to avoid circular dependencies during module loading.

The `EciesStringKey` branded enum provides compile-time safety for translation keys, and helper functions (`getEciesTranslation`, `safeEciesTranslation`) offer both throwing and fallback translation modes.

---

## X. Integration with BrightChain

Within the BrightChain ecosystem, the ECIES-Lib system serves several roles:

1. **Block Encryption:** The `BlockECIES` class in `brightchain-lib` wraps `ECIESService` to encrypt and decrypt storage blocks using WithLength mode.
2. **Ledger Signatures:** The `EciesSignatureVerifier` implements `ILedgerSignatureVerifier` for verifying SECP256k1 signatures on ledger entries.
3. **Multi-Recipient Blocks:** Encrypted blocks can target multiple recipients, with per-recipient key entries stored in the block header.
4. **Overhead Calculations:** `calculateSingleRecipientOverhead` and `calculateECIESMultipleRecipientOverhead` compute exact byte overheads for block capacity planning.
5. **Browser Compatibility:** The `createECIESService` factory in `browserConfig.ts` provides browser-compatible service instances using `GuidV4Provider`.

---

## XI. Testing and Validation

The combined test suite exceeds 4,300 test cases:

- **ecies-lib:** 2,429 passing tests covering browser-compatible encryption, decryption, key management, voting, and i18n.
- **node-ecies-lib:** 1,953 passing tests covering Node.js-specific operations, Buffer handling, streaming, and cross-platform compatibility.

Property-based testing with `fast-check` validates cryptographic invariants including:

- Encryption round-trip correctness for arbitrary byte sequences.
- Signature verification consistency.
- Multi-recipient encrypt/decrypt for variable recipient counts.
- ID provider serialization round-trips.

Cross-platform E2E tests verify that data encrypted by the browser library can be decrypted by the Node.js library and vice versa.

---

## XII. Conclusion

The ECIES-Lib system provides a comprehensive, cross-platform cryptographic toolkit built on well-established primitives (secp256k1, AES-256-GCM, HKDF-SHA256) with practical extensions for multi-recipient messaging, streaming encryption, pluggable identity, and homomorphic voting. The dual-library architecture with binary compatibility enables unified encrypted communication across browser and server environments. The system is actively deployed as the cryptographic foundation of the BrightChain ecosystem and is available as open-source software under the MIT license.

---

## References

[1] V. Shoup, "A Proposal for an ISO Standard for Public Key Encryption," Cryptology ePrint Archive, Report 2001/112, 2001.

[2] Digital Defiance, "BrightChain: Owner-Free File System with Cryptographic Governance," https://github.com/Digital-Defiance/BrightChain, 2024.

[3] M. Abdalla, M. Bellare, and P. Rogaway, "DHAES: An Encryption Scheme Based on the Diffie-Hellman Problem," Cryptology ePrint Archive, Report 1999/007, 1999.

[4] D. McGrew and J. Viega, "The Galois/Counter Mode of Operation (GCM)," NIST, 2005.

[5] P. Paillier, "Public-Key Cryptosystems Based on Composite Degree Residuosity Classes," in Advances in Cryptology — EUROCRYPT '99, Springer, 1999, pp. 223-238.

[6] R. Cramer, R. Gennaro, and B. Schoenmakers, "A Secure and Optimally Efficient Multi-Authority Election Scheme," in Advances in Cryptology — EUROCRYPT '97, Springer, 1997, pp. 103-118.

[7] NIST, "Recommendation for Key-Derivation Methods in Key-Establishment Schemes," SP 800-56C Rev. 2, 2020.

[8] NIST, "Recommendation for Random Number Generation Using Deterministic Random Bit Generators," SP 800-90A Rev. 1, 2015.

[9] IEEE, "Standard Specifications for Public-Key Cryptography," IEEE Std 1363a-2004, 2004.

[10] D. Johnson, A. Menezes, and S. Vanstone, "The Elliptic Curve Digital Signature Algorithm (ECDSA)," International Journal of Information Security, vol. 1, no. 1, pp. 36-63, 2001.
