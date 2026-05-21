# DD-ECIES: Digital Defiance Elliptic Curve Integrated Encryption Scheme

**Version:** 1.0
**Status:** Draft
**Date:** 2025-07-15
**Author:** Digital Defiance
**Document Identifier:** DD-ECIES-SPEC-v1.0

---

## Abstract

This document specifies the Digital Defiance Elliptic Curve Integrated Encryption Scheme (DD-ECIES), a hybrid encryption protocol suite built on the secp256k1 elliptic curve. DD-ECIES combines Elliptic Curve Diffie-Hellman (ECDH) key agreement with HKDF-SHA256 key derivation and AES-256-GCM authenticated encryption to provide confidentiality, integrity, and authenticity for single-recipient and multi-recipient message encryption.

The specification covers key generation from BIP39 mnemonics via BIP32/BIP44 hierarchical deterministic derivation, ECDSA digital signatures with deterministic nonce generation (RFC 6979), three message framing modes (Basic, WithLength, and Multiple), checksum operations, PBKDF2 password hashing profiles, and a Paillier homomorphic encryption subsystem for privacy-preserving voting.

This specification is language-agnostic. A conforming implementation MAY be written in any programming language, provided it produces byte-identical outputs for the wire formats and cryptographic operations defined herein. All normative requirements use RFC 2119 key words.

---

## Table of Contents

1. [Abstract](#abstract)
2. [Introduction](#introduction)
3. [Terminology](#terminology)
4. [Notation](#notation)
5. [Elliptic Curve Parameters](#5-elliptic-curve-parameters)
6. [Key Management](#6-key-management)
7. [Signature Scheme](#7-signature-scheme)
8. [ECDH Shared Secret and Key Derivation](#8-ecdh-shared-secret-and-key-derivation)
9. [Symmetric Encryption](#9-symmetric-encryption)
10. [ECIES Encryption (Single Recipient)](#10-ecies-encryption-single-recipient)
11. [ECIES Encryption (Multi-Recipient)](#11-ecies-encryption-multi-recipient)
12. [Message Framing and Wire Format](#12-message-framing-and-wire-format)
13. [Checksum Operations](#13-checksum-operations)
14. [PBKDF2 Password Hashing Profiles](#14-pbkdf2-password-hashing-profiles)
15. [Voting Subsystem (Paillier)](#15-voting-subsystem-paillier)
16. [Security Considerations](#16-security-considerations)
17. [IANA-Style Registries](#17-iana-style-registries)
18. [Test Vectors](#18-test-vectors)
19. [References](#19-references)

---

## Introduction

### Purpose

This document provides a complete, formal specification of the DD-ECIES cryptographic protocol suite. The specification is intended to enable any developer to build a fully compatible implementation in any programming language without access to the reference TypeScript implementation.

### Scope

The DD-ECIES protocol suite encompasses the following subsystems:

- **Key Generation**: Deterministic key derivation from BIP39 mnemonic phrases through BIP32/BIP44 hierarchical deterministic paths, producing secp256k1 key pairs.
- **Digital Signatures**: ECDSA signatures over secp256k1 with SHA-256 message digests and deterministic nonce generation per RFC 6979.
- **Key Agreement**: ECDH shared secret computation and symmetric key derivation via HKDF-SHA256.
- **Symmetric Encryption**: AES-256-GCM authenticated encryption with associated data (AEAD).
- **Message Framing**: Three encryption modes — Basic (single recipient, no length prefix), WithLength (single recipient, explicit plaintext length), and Multiple (multi-recipient key encapsulation).
- **Checksum Operations**: SHA3-512 integrity checksums.
- **Password Hashing**: Named PBKDF2 profiles with specified parameters.
- **Voting**: Paillier homomorphic encryption for privacy-preserving vote tallying.

### Conformance

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

A conforming implementation MUST implement all normative requirements (those using MUST, SHALL, or REQUIRED) for the subsystems it claims to support. An implementation MAY support a subset of subsystems (e.g., single-recipient encryption only), but each supported subsystem MUST be implemented in its entirety.

### Document Organization

This specification is organized into self-contained sections. Each section specifies one subsystem of the DD-ECIES protocol suite. Cross-references between sections are explicit. Implementers MAY implement sections independently, subject to the dependency ordering described in each section's preamble.

---

## Terminology

The following terms are used throughout this specification with the precise meanings defined below.

| Term | Definition |
|------|------------|
| **DD-ECIES** | Digital Defiance Elliptic Curve Integrated Encryption Scheme — the cryptographic protocol suite specified in this document. |
| **ECIES** | Elliptic Curve Integrated Encryption Scheme — a hybrid encryption scheme combining elliptic curve key agreement with symmetric encryption. DD-ECIES is a specific instantiation of ECIES. |
| **secp256k1** | The elliptic curve used by DD-ECIES for all asymmetric cryptographic operations, as defined in SEC 2 (Standards for Efficient Cryptography), section 2.4.1. This is the same curve used by Bitcoin and Ethereum. |
| **HKDF** | HMAC-based Key Derivation Function, as specified in RFC 5869. DD-ECIES uses HKDF with SHA-256 (HKDF-SHA256) for symmetric key derivation from ECDH shared secrets. |
| **AES-256-GCM** | Advanced Encryption Standard with 256-bit keys in Galois/Counter Mode. An authenticated encryption with associated data (AEAD) cipher providing both confidentiality and integrity. |
| **BIP39** | Bitcoin Improvement Proposal 39 — a standard for encoding cryptographic seeds as mnemonic phrases (sequences of human-readable words). DD-ECIES uses the English wordlist with 256-bit entropy (24 words). |
| **BIP32** | Bitcoin Improvement Proposal 32 — a standard for hierarchical deterministic (HD) key derivation, allowing a tree of key pairs to be derived from a single seed. |
| **BIP44** | Bitcoin Improvement Proposal 44 — a standard for multi-account hierarchy in HD wallets, defining the derivation path structure `m/purpose'/coin_type'/account'/change/address_index`. |
| **Paillier Encryption** | A probabilistic asymmetric encryption scheme with additive homomorphic properties. In DD-ECIES, Paillier encryption is used in the voting subsystem for privacy-preserving vote tallying with 3072-bit key pairs. |
| **Encryption_Type** | One of three message framing modes supported by DD-ECIES: Basic (`0x21`), WithLength (`0x42`), or Multiple (`0x63`). Each mode defines a distinct wire format for encrypted messages. |
| **Ephemeral_Key_Pair** | A one-time-use secp256k1 key pair generated per encryption operation. The ephemeral public key is included in the encrypted message so the recipient can reconstruct the shared secret. Ephemeral private keys MUST be securely discarded after use. |
| **AAD** | Additional Authenticated Data — data that is authenticated (integrity-protected) by AES-GCM but not encrypted. In DD-ECIES, the AAD composition varies by Encryption_Type and typically includes the message header fields. |
| **DRBG** | Deterministic Random Bit Generator — a pseudorandom number generator that produces a deterministic sequence from a seed. DD-ECIES uses HMAC-DRBG with SHA-512 in the voting subsystem for reproducible prime generation. |
| **ECDH** | Elliptic Curve Diffie-Hellman — a key agreement protocol that allows two parties, each having an elliptic curve key pair, to establish a shared secret over an insecure channel. |
| **ECDSA** | Elliptic Curve Digital Signature Algorithm — a digital signature scheme using elliptic curve cryptography. DD-ECIES uses ECDSA over secp256k1 with SHA-256 digests. |
| **CSPRNG** | Cryptographically Secure Pseudo-Random Number Generator — a random number generator suitable for cryptographic use. All random values in DD-ECIES (IVs, ephemeral keys, symmetric keys, salts) MUST be generated from a CSPRNG. |
| **IV** | Initialization Vector — a random value used to ensure that encrypting the same plaintext with the same key produces different ciphertext. DD-ECIES uses 12-byte IVs for AES-256-GCM. |
| **Authentication Tag** | A cryptographic checksum produced by AES-GCM that authenticates both the ciphertext and the AAD. DD-ECIES uses 16-byte (128-bit) authentication tags. |
| **Compressed Public Key** | A 33-byte encoding of a secp256k1 public key point, consisting of a prefix byte (`0x02` for even y-coordinate, `0x03` for odd y-coordinate) followed by the 32-byte x-coordinate. This is the canonical public key format in DD-ECIES. |
| **Uncompressed Public Key** | A 65-byte encoding of a secp256k1 public key point, consisting of the prefix byte `0x04` followed by the 32-byte x-coordinate and 32-byte y-coordinate. Implementations MUST accept this format for backward compatibility. |
| **Raw Public Key** | A 64-byte encoding of a secp256k1 public key point without any prefix byte, consisting of the 32-byte x-coordinate followed by the 32-byte y-coordinate. Implementations MUST accept this format for backward compatibility. |
| **Curve Order (n)** | The order of the base point of the secp256k1 curve. All private keys MUST be in the range [1, n-1]. |
| **Preamble** | An OPTIONAL variable-length byte sequence prepended to an encrypted message. When present, the preamble is included in the AAD for authentication but is not encrypted. |
| **Wire Format** | The byte-level serialization of an encrypted DD-ECIES message, including all header fields, ciphertext, and authentication data. |
| **Cipher Suite** | A named combination of cryptographic algorithms (curve, KDF, symmetric cipher, hash) identified by a single byte in the DD-ECIES wire format. |
| **PBKDF2** | Password-Based Key Derivation Function 2 — a key derivation function used for password hashing. DD-ECIES defines named profiles with specific iteration counts and algorithms. |
| **HD Derivation Path** | A hierarchical deterministic key derivation path following BIP32/BIP44 conventions. DD-ECIES uses the path `m/44'/60'/0'/0/0`. |
| **HMAC-DRBG** | A deterministic random bit generator based on HMAC, used in the DD-ECIES voting subsystem for reproducible prime generation from a seed. |
| **Miller-Rabin** | A probabilistic primality test used in the voting subsystem to verify candidate primes. DD-ECIES requires 256 iterations for sufficient confidence. |

---

## Notation

This section defines the notation conventions used throughout this specification.

### Byte Sequences

Byte sequences are the fundamental data unit in DD-ECIES wire formats. The following conventions apply:

- A **byte** is an 8-bit unsigned integer with values in the range [0, 255] (equivalently, [0x00, 0xFF]).
- Byte sequences are written as ordered tuples. A sequence of *k* bytes is denoted as `B[0], B[1], ..., B[k-1]`, where `B[0]` is the first (leftmost) byte.
- The **length** of a byte sequence is the number of bytes it contains, denoted `|B|` or stated explicitly (e.g., "33 bytes").
- Field sizes in wire format descriptions are given in bytes unless otherwise noted. For example, `ephemeralPublicKey(33)` denotes a 33-byte field.

### Hexadecimal Literals

- Hexadecimal byte values are prefixed with `0x`. For example, `0x21` represents the decimal value 33.
- Multi-byte hexadecimal values are written with the `0x` prefix followed by an even number of hexadecimal digits. For example, `0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141` represents the secp256k1 curve order as a 256-bit unsigned integer.
- Hexadecimal strings (e.g., checksum output) use lowercase letters: `a`–`f`.

### Concatenation Operator

- The concatenation of two byte sequences *A* and *B* is denoted `A || B`. The result is a byte sequence of length `|A| + |B|`, where the bytes of *A* appear first, followed by the bytes of *B*.
- Concatenation is associative: `A || B || C` is equivalent to `(A || B) || C`.
- Example: If `A = [0x01, 0x02]` and `B = [0x03]`, then `A || B = [0x01, 0x02, 0x03]`.

### Integer Encoding

- Multi-byte integers in wire formats are encoded in **big-endian** (network byte order) unless otherwise specified. The most significant byte appears first.
- Integer sizes are explicitly stated. For example:
  - A **2-byte big-endian unsigned integer** encodes values in the range [0, 65535].
  - An **8-byte big-endian unsigned integer** encodes values in the range [0, 2^64 - 1].
- Example: The decimal value 256 is encoded as the 2-byte sequence `[0x01, 0x00]` in big-endian.

### String Encoding

- All strings used as cryptographic inputs (e.g., HKDF info strings) MUST be encoded as **UTF-8** byte sequences unless otherwise specified.
- Example: The info string `ecies-v2-key-derivation` is encoded as its UTF-8 byte representation (23 bytes, all ASCII).

### Field Notation in Wire Formats

- Wire format fields are described using the notation `fieldName(size)`, where *size* is the field length in bytes. For example, `version(1)` denotes a 1-byte version field.
- Variable-length fields are denoted `fieldName(variable)`.
- Optional fields are enclosed in square brackets: `[preamble]`.
- The wire format for a message is written as a concatenation of its fields: `version(1) || cipherSuite(1) || type(1) || ...`.

### Cryptographic Notation

- `SHA-256(m)` denotes the SHA-256 hash of message *m*, producing a 32-byte digest.
- `SHA-512(m)` denotes the SHA-512 hash of message *m*, producing a 64-byte digest.
- `SHA3-512(m)` denotes the SHA3-512 hash of message *m*, producing a 64-byte digest.
- `HKDF-SHA256(salt, ikm, info, len)` denotes HKDF (RFC 5869) using HMAC-SHA256, with the given salt, input keying material (ikm), info string, and output length in bytes.
- `AES-256-GCM(key, iv, aad, plaintext)` denotes AES-256-GCM encryption, returning `(ciphertext, authTag)`.
- `ECDH(privKey, pubKey)` denotes the ECDH shared secret computation, returning the x-coordinate of the shared point.
- `ECDSA-Sign(privKey, hash)` denotes ECDSA signature generation with deterministic nonce (RFC 6979), returning a 64-byte compact signature `r || s`.
- `ECDSA-Verify(pubKey, hash, sig)` denotes ECDSA signature verification, returning a boolean.

---

## 5. Elliptic Curve Parameters

This section specifies the elliptic curve, key formats, and validation rules for all asymmetric cryptographic operations in DD-ECIES.

### 5.1 Curve Selection

All DD-ECIES asymmetric operations MUST use the **secp256k1** elliptic curve as defined in [SEC 2: Recommended Elliptic Curve Domain Parameters](https://www.secg.org/sec2-v2.pdf), section 2.4.1.

The secp256k1 curve is defined over the prime field *F_p* where:

- **p** = `0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F`

The curve order (the number of points on the curve) is:

- **n** = `0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141`

Implementations MUST NOT substitute a different curve. The curve name in the reference implementation is identified by the constant `ECIES.CURVE_NAME = 'secp256k1'`.

### 5.2 Public Key Format

The canonical public key format in DD-ECIES is the **33-byte compressed** encoding:

| Byte Offset | Length | Description |
|-------------|--------|-------------|
| 0 | 1 | Prefix byte: `0x02` if the y-coordinate is even, `0x03` if odd |
| 1 | 32 | The x-coordinate of the curve point, big-endian |

- Public keys MUST be 33 bytes in their canonical (compressed) form.
- The prefix byte MUST be `0x02` or `0x03`. The reference implementation uses `ECIES.PUBLIC_KEY_MAGIC = 0x02` as the default prefix for even y-coordinates.
- The compressed public key length is defined by the constant `ECIES.PUBLIC_KEY_LENGTH = 33`.
- The raw x-coordinate length (without prefix) is defined by the constant `ECIES.RAW_PUBLIC_KEY_LENGTH = 32`.
- The relationship `PUBLIC_KEY_LENGTH = RAW_PUBLIC_KEY_LENGTH + 1` MUST hold.

### 5.3 Backward Compatibility: Accepted Public Key Formats

For backward compatibility, implementations MUST accept public keys in the following additional formats and MUST normalize them internally to the 33-byte compressed format before use in any cryptographic operation:

| Format | Length | Prefix | Description |
|--------|--------|--------|-------------|
| Compressed | 33 bytes | `0x02` or `0x03` | Canonical format. No normalization needed. |
| Uncompressed | 65 bytes | `0x04` | Full point encoding: `0x04 \|\| x(32) \|\| y(32)`. MUST be compressed to 33 bytes internally. |
| Raw | 64 bytes | None | Raw point coordinates: `x(32) \|\| y(32)` with no prefix byte. MUST be compressed to 33 bytes internally. |

Implementations MUST reject public keys that do not match any of the three accepted lengths (33, 64, or 65 bytes) with a descriptive format error.

When normalizing uncompressed (65-byte) or raw (64-byte) keys:

1. Extract the x-coordinate (bytes 1–32 for uncompressed, bytes 0–31 for raw) and y-coordinate (bytes 33–64 for uncompressed, bytes 32–63 for raw).
2. Determine the prefix byte: `0x02` if the y-coordinate is even, `0x03` if the y-coordinate is odd.
3. Produce the 33-byte compressed key: `prefix(1) || x(32)`.

### 5.4 Private Key Format

Private keys MUST be **32-byte scalars** representing an integer in the range **[1, n-1]**, where *n* is the secp256k1 curve order:

```
n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
```

- Private keys MUST be exactly 32 bytes, stored as a big-endian unsigned integer.
- Implementations MUST reject private keys with a value of zero (`0x00...00`).
- Implementations MUST reject private keys with a value greater than or equal to *n*.
- Private keys SHOULD be stored in memory-protected buffers and securely erased when no longer needed.

### 5.5 Public Key Validation

Before using any public key in a cryptographic operation (ECDH, signature verification, or encryption), implementations MUST validate that the decoded point lies on the secp256k1 curve. Specifically:

1. Decode the public key to obtain the point coordinates *(x, y)*.
2. Verify that the point satisfies the curve equation: *y² ≡ x³ + 7 (mod p)*.
3. Verify that the point is not the point at infinity.

If validation fails, the implementation MUST reject the public key with a descriptive error before performing any cryptographic operation.

### 5.6 Summary of Constants

The following table summarizes the elliptic curve constants as defined in the reference implementation (`constants.ts`):

| Constant | Value | Description |
|----------|-------|-------------|
| `ECIES.CURVE_NAME` | `'secp256k1'` | Elliptic curve identifier (SEC 2 §2.4.1) |
| `ECIES.PUBLIC_KEY_LENGTH` | `33` | Compressed public key length in bytes |
| `ECIES.RAW_PUBLIC_KEY_LENGTH` | `32` | Raw x-coordinate length in bytes (no prefix) |
| `ECIES.PUBLIC_KEY_MAGIC` | `0x02` | Default compressed key prefix (even y-coordinate) |
| Curve order (*n*) | `0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141` | Number of points on the secp256k1 curve |

---

## 6. Key Management

This section specifies how DD-ECIES key pairs are derived from mnemonic phrases using the BIP39, BIP32, and BIP44 standards. The derivation is fully deterministic: given the same mnemonic, any conforming implementation MUST produce the same private key and public key.

**Dependencies:** This section depends on Section 5 (Elliptic Curve Parameters) for the secp256k1 curve definition and key format requirements.

### 6.1 Mnemonic Generation (BIP39)

Mnemonic phrases MUST conform to [BIP39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) with the following parameters:

| Parameter | Value | Reference Constant |
|-----------|-------|--------------------|
| Wordlist | English (2048 words) | BIP39 English wordlist |
| Entropy | 256 bits | `ECIES.MNEMONIC_STRENGTH = 256` |
| Mnemonic length | 24 words | Determined by 256-bit entropy per BIP39 |
| Checksum | 8 bits (SHA-256 of entropy) | BIP39 §Generating the mnemonic |

- Implementations MUST use the BIP39 English wordlist. Other language wordlists are NOT supported.
- The entropy MUST be 256 bits, producing a 24-word mnemonic phrase. Shorter mnemonics (12, 15, 18, or 21 words) MUST NOT be generated by conforming implementations, although implementations MAY accept them for backward compatibility with external systems.
- The entropy MUST be generated from a CSPRNG (see Section 16, Security Considerations).
- The 24 words MUST be separated by single ASCII space characters (`0x20`).

### 6.2 Mnemonic-to-Seed Conversion

The mnemonic phrase MUST be converted to a 64-byte (512-bit) seed using the BIP39 `mnemonicToSeed` function with the following parameters:

| Parameter | Value |
|-----------|-------|
| Mnemonic | The 24-word mnemonic phrase (UTF-8 encoded) |
| Passphrase | Empty string (`""`) |
| KDF | PBKDF2-HMAC-SHA512 |
| Iterations | 2048 |
| Output length | 64 bytes (512 bits) |

- The passphrase MUST be the empty string. DD-ECIES does NOT support BIP39 passphrases for mnemonic-to-seed conversion.
- The salt for PBKDF2 is `"mnemonic" || passphrase` as specified by BIP39. Since the passphrase is empty, the salt is the UTF-8 encoding of the string `"mnemonic"` (8 bytes).
- The output is a 64-byte seed used as input to HD key derivation.

### 6.3 HD Key Derivation (BIP32/BIP44)

The 64-byte seed MUST be used to derive a secp256k1 private key via hierarchical deterministic (HD) key derivation following [BIP32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki) and [BIP44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki).

#### 6.3.1 Derivation Path

The HD derivation path MUST be:

```
m/44'/60'/0'/0/0
```

This path follows the BIP44 structure `m/purpose'/coin_type'/account'/change/address_index`:

| Level | Value | Meaning |
|-------|-------|---------|
| `m` | — | Master key (derived from seed) |
| `44'` | Hardened | BIP44 purpose |
| `60'` | Hardened | Ethereum coin type (registered in SLIP-44) |
| `0'` | Hardened | Account 0 |
| `0` | Normal | External chain (non-change) |
| `0` | Normal | Address index 0 |

The derivation path is defined by the constant `ECIES.PRIMARY_KEY_DERIVATION_PATH = "m/44'/60'/0'/0/0"`.

- The apostrophe (`'`) denotes hardened derivation as specified in BIP32.
- Implementations MUST use this exact path. Alternative paths MUST NOT be used for DD-ECIES key derivation.

#### 6.3.2 Master Key Generation

The master key is derived from the 64-byte seed per BIP32:

1. Compute `I = HMAC-SHA512(Key = "Bitcoin seed", Data = seed)`.
2. Split `I` into two 32-byte halves: `I_L` (master private key) and `I_R` (master chain code).
3. If `I_L` is zero or ≥ *n* (the secp256k1 curve order), the seed is invalid and MUST be rejected.

#### 6.3.3 Child Key Derivation

Each level of the derivation path produces a child key from its parent using the BIP32 child key derivation function (CKDpriv for private keys). Hardened derivation (indicated by `'`) uses the parent private key as input; normal derivation uses the parent public key.

The final derived key at path `m/44'/60'/0'/0/0` is a 32-byte private key scalar.

### 6.4 Key Pair Computation

The derived 32-byte private key MUST be used to compute a compressed secp256k1 public key:

1. Validate that the private key is in the range [1, n-1] as specified in Section 5.4.
2. Compute the public key point: `Q = privKey × G`, where `G` is the secp256k1 generator point.
3. Encode the public key in 33-byte compressed format as specified in Section 5.2.

The resulting key pair (private key, compressed public key) is the DD-ECIES identity key pair for the given mnemonic.

### 6.5 Key Derivation Procedure Summary

The complete key derivation procedure from mnemonic to key pair is:

```
mnemonic (24 words)
    │
    ▼
mnemonicToSeed(mnemonic, passphrase="")     ── BIP39 PBKDF2-HMAC-SHA512
    │
    ▼
seed (64 bytes)
    │
    ▼
HDKey.fromMasterSeed(seed)                  ── BIP32 master key generation
    │
    ▼
hdKey.derive("m/44'/60'/0'/0/0")            ── BIP32/BIP44 child key derivation
    │
    ▼
privateKey (32 bytes)
    │
    ▼
secp256k1.getPublicKey(privateKey, true)    ── Compressed public key computation
    │
    ▼
publicKey (33 bytes, compressed)
```

### 6.6 Test Vector: Mnemonic-to-Key Derivation

The following test vector uses the well-known BIP39 test mnemonic (24 words with 256-bit entropy). A conforming implementation MUST produce the exact private key and public key shown below when given this mnemonic.

**Input:**

| Field | Value |
|-------|-------|
| Mnemonic | `abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art` |
| Passphrase | `""` (empty string) |
| Derivation Path | `m/44'/60'/0'/0/0` |

**Intermediate Value:**

| Field | Value (hex) |
|-------|-------------|
| Seed (64 bytes) | `408b285c123836004f4b8842c89324c1f01382450c0d439af345ba7fc49acf705489c6fc77dbd4e3dc1dd8cc6bc9f043db8ada1e243c4a0eafb290d399480840` |

**Output:**

| Field | Value (hex) |
|-------|-------------|
| Private Key (32 bytes) | `1053fae1b3ac64f178bcc21026fd06a3f4544ec2f35338b001f02d1d8efa3d5f` |
| Compressed Public Key (33 bytes) | `02dc286c821c7490afbe20a79d13123b9f41f3d7ef21e4a9caacd22f5983b28eca` |

**Verification:** The compressed public key begins with `0x02` (even y-coordinate) and is exactly 33 bytes. The private key is a 32-byte scalar in the valid range [1, n-1].

### 6.7 Summary of Constants

The following table summarizes the key management constants as defined in the reference implementation (`constants.ts`):

| Constant | Value | Description |
|----------|-------|-------------|
| `ECIES.MNEMONIC_STRENGTH` | `256` | Entropy bits for BIP39 mnemonic generation (produces 24 words) |
| `ECIES.PRIMARY_KEY_DERIVATION_PATH` | `"m/44'/60'/0'/0/0"` | BIP32/BIP44 HD derivation path |
| BIP39 wordlist | English | The only supported wordlist |
| BIP39 passphrase | `""` (empty) | No passphrase is used for mnemonic-to-seed conversion |

---

## 7. Signature Scheme

This section specifies the digital signature scheme used by DD-ECIES for message authentication and integrity verification. The signature scheme is independent of the ECIES encryption modes and MAY be used standalone.

**Dependencies:** This section depends on Section 5 (Elliptic Curve Parameters) for the secp256k1 curve definition and key format requirements.

### 7.1 Algorithm Selection

DD-ECIES signatures MUST use the **Elliptic Curve Digital Signature Algorithm (ECDSA)** over the **secp256k1** curve with **SHA-256** as the message digest algorithm.

| Parameter | Value |
|-----------|-------|
| Signature Algorithm | ECDSA |
| Curve | secp256k1 (SEC 2 §2.4.1) |
| Hash Function | SHA-256 (FIPS 180-4), producing a 32-byte digest |
| Nonce Generation | Deterministic per RFC 6979 |
| Output Format | 64-byte compact: `r(32) \|\| s(32)` |

Implementations MUST NOT use any other curve or hash function for DD-ECIES signatures. Implementations MUST NOT use DER-encoded signatures.

### 7.2 Deterministic Nonce Generation (RFC 6979)

Signature nonce generation MUST be **deterministic** as specified in [RFC 6979](https://www.rfc-editor.org/rfc/rfc6979). Deterministic nonces eliminate the catastrophic risk of nonce reuse, which would leak the private key in ECDSA.

- The nonce `k` MUST be derived from the private key and the message hash using the HMAC-DRBG construction defined in RFC 6979, Section 3.2.
- Implementations MUST NOT use random nonce generation for ECDSA signatures.
- Implementations MUST NOT inject additional entropy into the nonce generation process. The `extraEntropy` parameter (if supported by the underlying library) MUST be set to `false` or equivalent.

The deterministic nonce ensures that signing the same message with the same private key always produces the same signature, enabling reproducible test vectors.

### 7.3 Signature Format

DD-ECIES signatures MUST use the **64-byte compact format**, consisting of the concatenation of the `r` and `s` components of the ECDSA signature:

```
signature = r(32 bytes) || s(32 bytes)
```

| Byte Offset | Length | Description |
|-------------|--------|-------------|
| 0 | 32 | `r` component — big-endian unsigned integer |
| 32 | 32 | `s` component — big-endian unsigned integer |

- The total signature length MUST be exactly **64 bytes**. This is defined by the constant `ECIES.SIGNATURE_SIZE = 64`.
- Both `r` and `s` MUST be encoded as 32-byte big-endian unsigned integers, zero-padded on the left if necessary.
- Implementations MUST NOT use DER encoding (as used in Bitcoin transactions and X.509 certificates). DER-encoded signatures are variable-length (typically 70–72 bytes) and MUST be rejected.
- Implementations MUST NOT include a recovery byte (`v`) in the signature output. The 65-byte `(r, s, v)` format used by Ethereum (`eth_sign`) is NOT the DD-ECIES signature format.

### 7.4 Signing Procedure

To sign a message, an implementation MUST perform the following steps:

1. **Hash the message**: Compute `hash = SHA-256(message)`, where `message` is the raw byte sequence to be signed. The output is a 32-byte digest.

2. **Sign the hash**: Compute the ECDSA signature over `hash` (not the raw message) using the signer's secp256k1 private key and a deterministic nonce per RFC 6979. The signing function takes the pre-computed hash as input with `prehash = false` (the hash is already computed).

3. **Encode the signature**: Extract the `r` and `s` components from the ECDSA signature and encode them as a 64-byte compact byte sequence: `r(32) || s(32)`.

In notation:

```
hash      = SHA-256(message)
(r, s)    = ECDSA-Sign(privateKey, hash)       // RFC 6979 deterministic nonce
signature = r(32 bytes) || s(32 bytes)          // 64-byte compact format
```

**Important:** The signing function operates on the SHA-256 hash of the message, not the raw message bytes. Implementations that pass the raw message to a signing function with internal hashing (`prehash = true`) MUST ensure the internal hash function is SHA-256. However, the RECOMMENDED approach is to compute the hash explicitly and pass it with `prehash = false` to avoid ambiguity.

### 7.5 Verification Procedure

To verify a signature, an implementation MUST perform the following steps:

1. **Validate the signature length**: The signature MUST be exactly 64 bytes. If the signature length is not 64 bytes, the implementation MUST reject it immediately and return `false`.

2. **Parse the signature**: Split the 64-byte signature into its `r` and `s` components:
   - `r` = bytes [0, 32) — the first 32 bytes
   - `s` = bytes [32, 64) — the last 32 bytes

3. **Normalize the public key**: If the public key is in uncompressed (65-byte) or raw (64-byte) format, normalize it to the 33-byte compressed format as specified in Section 5.3.

4. **Hash the message**: Compute `hash = SHA-256(message)` using the same raw message bytes that were signed.

5. **Verify the signature**: Perform ECDSA verification using the normalized public key, the hash, and the parsed `(r, s)` components. Return `true` if the signature is valid, `false` otherwise.

In notation:

```
if |signature| ≠ 64:
    return false

r         = signature[0..32)
s         = signature[32..64)
pubKey    = normalizePublicKey(publicKey)       // Section 5.3
hash      = SHA-256(message)
result    = ECDSA-Verify(pubKey, hash, (r, s))  // true or false
```

**Error handling:** If any step fails (invalid public key, point not on curve, `r` or `s` out of range), the implementation MUST return `false` rather than throwing an exception. Signature verification MUST NOT leak information about the failure mode to callers beyond the boolean result.

### 7.6 Test Vector: ECDSA Signing and Verification

The following test vector uses the private key from Section 6.6 (Key Management). A conforming implementation MUST produce the exact signature shown below when signing the given message.

**Input:**

| Field | Value |
|-------|-------|
| Private Key (32 bytes, hex) | `1053fae1b3ac64f178bcc21026fd06a3f4544ec2f35338b001f02d1d8efa3d5f` |
| Public Key (33 bytes, hex) | `02dc286c821c7490afbe20a79d13123b9f41f3d7ef21e4a9caacd22f5983b28eca` |
| Message (UTF-8) | `DD-ECIES signature test vector` |
| Message (hex) | `44442d4543494553207369676e6174757265207465737420766563746f72` |

**Intermediate Value:**

| Field | Value (hex) |
|-------|-------------|
| SHA-256 Hash (32 bytes) | `a1fc0896b3b1a9b1e0eaf1434a04d26e679a422a8d21a9104f458bb7bf6a2d2e` |

**Output:**

| Field | Value (hex) |
|-------|-------------|
| Signature (64 bytes) | `6596fb18720a906b5b20eaaa259bfecaef35555208c15c61022216f373a306f90deb13d6cfd91e73b405a46a131fc98f13e410c1c89d3a960ee29f489da25e9d` |
| `r` (32 bytes) | `6596fb18720a906b5b20eaaa259bfecaef35555208c15c61022216f373a306f9` |
| `s` (32 bytes) | `0deb13d6cfd91e73b405a46a131fc98f13e410c1c89d3a960ee29f489da25e9d` |

**Verification:** Calling `ECDSA-Verify(publicKey, hash, signature)` with the above values MUST return `true`.

### 7.7 Summary of Constants

The following table summarizes the signature-related constants as defined in the reference implementation (`constants.ts` and `signature.ts`):

| Constant | Value | Description |
|----------|-------|-------------|
| `ECIES.SIGNATURE_SIZE` | `64` | Signature length in bytes (compact format) |
| Hash algorithm | SHA-256 | Message digest algorithm (32-byte output) |
| Nonce generation | RFC 6979 | Deterministic nonce derivation |
| `extraEntropy` | `false` | No additional entropy in nonce generation |
| `prehash` | `false` | Hash is computed externally, not by the signing function |

---

## 8. ECDH Shared Secret and Key Derivation

This section specifies the Elliptic Curve Diffie-Hellman (ECDH) shared secret computation and the HKDF-based symmetric key derivation used by DD-ECIES. These two operations form the key agreement mechanism that allows an encryptor (using an ephemeral key pair) and a recipient (using their long-term key pair) to derive a shared symmetric key without transmitting it directly.

**Dependencies:** This section depends on Section 5 (Elliptic Curve Parameters) for the secp256k1 curve definition and key format requirements.

### 8.1 ECDH Shared Secret Computation

The ECDH shared secret is computed by performing elliptic curve scalar multiplication of one party's private key with the other party's public key. Both parties arrive at the same shared point on the secp256k1 curve.

#### 8.1.1 Procedure

Given an ephemeral private key `d_e` (32-byte scalar) and a recipient public key `Q_r` (secp256k1 point), the shared secret is computed as follows:

1. **Normalize the recipient public key**: If the recipient public key is in uncompressed (65-byte) or raw (64-byte) format, normalize it to a format accepted by the elliptic curve library as specified in Section 5.3.

2. **Compute the shared point**: Perform ECDH scalar multiplication to obtain the shared point in **uncompressed** form:

   ```
   sharedPoint = ECDH(d_e, Q_r)    // returns 0x04 || x(32) || y(32)
   ```

   The result is a 65-byte uncompressed point: the prefix byte `0x04` followed by the 32-byte x-coordinate and 32-byte y-coordinate.

3. **Extract the x-coordinate**: The shared secret is the **x-coordinate** of the shared point — the first 32 bytes after the `0x04` prefix:

   ```
   sharedSecret = sharedPoint[1..33)    // bytes at offsets 1 through 32 (inclusive)
   ```

   The shared secret is exactly **32 bytes**.

#### 8.1.2 Shared Secret Properties

- The shared secret MUST be the x-coordinate of the ECDH shared point, extracted as the first 32 bytes after the `0x04` uncompressed point prefix.
- The y-coordinate of the shared point MUST be discarded and MUST NOT be used in any subsequent derivation.
- Both parties MUST arrive at the same shared secret: `ECDH(d_e, Q_r) = ECDH(d_r, Q_e)`, where `d_r` is the recipient's private key and `Q_e` is the ephemeral public key. This is the fundamental ECDH property.
- Implementations MUST validate the recipient public key (Section 5.5) before computing the shared secret. Using an invalid public key in ECDH MAY leak information about the private key.

#### 8.1.3 Notation

In the cryptographic notation defined in Section 4 (Notation):

```
sharedSecret = ECDH(ephemeralPrivateKey, recipientPublicKey)
```

This notation returns the 32-byte x-coordinate directly.

### 8.2 Symmetric Key Derivation (HKDF-SHA256)

The raw ECDH shared secret MUST NOT be used directly as a symmetric encryption key. Instead, it MUST be processed through HKDF (HMAC-based Key Derivation Function) as specified in [RFC 5869](https://www.rfc-editor.org/rfc/rfc5869) to derive a cryptographically suitable symmetric key.

#### 8.2.1 HKDF Parameters

DD-ECIES uses HKDF with the following fixed parameters:

| Parameter | Value | Description |
|-----------|-------|-------------|
| Hash Function | SHA-256 | HMAC-SHA256 for both Extract and Expand phases |
| Input Keying Material (IKM) | ECDH shared secret (32 bytes) | The x-coordinate from Section 8.1 |
| Salt | Empty (zero-length byte string) | No salt is used |
| Info | `ecies-v2-key-derivation` (UTF-8, 23 bytes) | Context and application-specific info string |
| Output Length (L) | 32 bytes | 256-bit symmetric key for AES-256-GCM |

#### 8.2.2 Derivation Procedure

The symmetric key derivation follows the two-phase HKDF construction from RFC 5869:

**Phase 1 — Extract:**

```
PRK = HMAC-SHA256(salt, IKM)
```

Where:
- `salt` = empty byte string (when salt is empty, HKDF uses a string of `HashLen` zero bytes as the salt, per RFC 5869 §2.2)
- `IKM` = the 32-byte ECDH shared secret

**Phase 2 — Expand:**

```
OKM = HKDF-Expand(PRK, info, L)
```

Where:
- `PRK` = the pseudorandom key from the Extract phase
- `info` = the UTF-8 encoding of the string `ecies-v2-key-derivation` (23 bytes: `0x65 0x63 0x69 0x65 0x73 0x2d 0x76 0x32 0x2d 0x6b 0x65 0x79 0x2d 0x64 0x65 0x72 0x69 0x76 0x61 0x74 0x69 0x6f 0x6e`)
- `L` = 32 (output length in bytes)

The combined operation in the notation from Section 4:

```
symmetricKey = HKDF-SHA256(salt=empty, ikm=sharedSecret, info="ecies-v2-key-derivation", len=32)
```

#### 8.2.3 Requirements

- Implementations MUST use HKDF-SHA256 (HMAC-SHA256) for key derivation. Other hash functions (e.g., SHA-512) MUST NOT be substituted.
- The salt MUST be an empty byte string (zero length). Implementations MUST NOT use a non-empty salt.
- The info string MUST be the exact UTF-8 encoding of `ecies-v2-key-derivation`. Implementations MUST NOT alter, omit, or substitute this string.
- The output length MUST be 32 bytes (256 bits), matching the AES-256-GCM key size specified in Section 9.
- The derived symmetric key SHOULD be stored in memory-protected buffers and securely erased when no longer needed.

### 8.3 Complete Key Agreement Flow

The complete key agreement flow for DD-ECIES encryption is:

```
ephemeralKeyPair = generateEphemeralKeyPair()       // Section 5, CSPRNG
    │
    ▼
sharedSecret = ECDH(ephemeralKeyPair.privateKey,    // Section 8.1
                     recipientPublicKey)
    │
    ▼
symmetricKey = HKDF-SHA256(                         // Section 8.2
    salt   = empty,
    ikm    = sharedSecret,
    info   = "ecies-v2-key-derivation",
    len    = 32
)
    │
    ▼
(ciphertext, authTag) = AES-256-GCM(               // Section 9
    key       = symmetricKey,
    iv        = randomIV(12),
    aad       = <per Encryption_Type>,
    plaintext = message
)
```

The ephemeral public key is included in the encrypted message header so the recipient can reconstruct the same shared secret using their private key:

```
sharedSecret = ECDH(recipientPrivateKey, ephemeralPublicKey)
symmetricKey = HKDF-SHA256(salt=empty, ikm=sharedSecret, info="ecies-v2-key-derivation", len=32)
plaintext    = AES-256-GCM-Decrypt(key=symmetricKey, iv, aad, ciphertext, authTag)
```

### 8.4 Test Vector: ECDH Shared Secret and Key Derivation

The following test vector demonstrates the complete key agreement flow. The recipient key pair is from Section 6.6 (the `abandon...art` mnemonic). The ephemeral private key is derived deterministically as `SHA-256("DD-ECIES-ECDH-test-vector-ephemeral")` for reproducibility.

A conforming implementation MUST produce the exact shared secret and derived symmetric key shown below when given these inputs.

**Ephemeral Key Pair:**

| Field | Value (hex) |
|-------|-------------|
| Ephemeral Private Key (32 bytes) | `bc4313f0c6e23ae0366e40d80387f49a2e4f64069dcb5a447f22dabefb79dc2f` |
| Ephemeral Public Key (33 bytes, compressed) | `02fbb6f2f3ee200f9cd9f33b86e7de3412eb9aee09f6b10709a595f5ede231494b` |

**Recipient Key Pair (from Section 6.6):**

| Field | Value (hex) |
|-------|-------------|
| Recipient Private Key (32 bytes) | `1053fae1b3ac64f178bcc21026fd06a3f4544ec2f35338b001f02d1d8efa3d5f` |
| Recipient Public Key (33 bytes, compressed) | `02dc286c821c7490afbe20a79d13123b9f41f3d7ef21e4a9caacd22f5983b28eca` |

**ECDH Shared Secret:**

| Field | Value (hex) |
|-------|-------------|
| Shared Secret (x-coordinate, 32 bytes) | `0933f1546610b5bdbe4349b25b783d07fd5185b84b3efee2e92dc9bf2a034a11` |

**HKDF-SHA256 Key Derivation:**

| Parameter | Value |
|-----------|-------|
| IKM | `0933f1546610b5bdbe4349b25b783d07fd5185b84b3efee2e92dc9bf2a034a11` (shared secret) |
| Salt | (empty) |
| Info (UTF-8) | `ecies-v2-key-derivation` |
| Info (hex) | `65636965732d76322d6b65792d64657269766174696f6e` |
| Output Length | 32 bytes |

| Field | Value (hex) |
|-------|-------------|
| Derived Symmetric Key (32 bytes) | `7c4fd382f540c37c6bee1e9c24a5d15e8a7a8f474a4882f4c8606520f2b801ab` |

**Verification:** Computing `ECDH(recipientPrivateKey, ephemeralPublicKey)` MUST produce the same shared secret as `ECDH(ephemeralPrivateKey, recipientPublicKey)`. Applying HKDF-SHA256 to either shared secret with the parameters above MUST produce the same derived symmetric key.

### 8.5 Summary of Constants

The following table summarizes the ECDH and key derivation constants:

| Constant | Value | Description |
|----------|-------|-------------|
| ECDH output | 32 bytes | x-coordinate of the shared point |
| HKDF hash | SHA-256 | HMAC-SHA256 for Extract and Expand |
| HKDF salt | empty | Zero-length byte string |
| HKDF info | `ecies-v2-key-derivation` (UTF-8) | Application-specific context string |
| HKDF output length | 32 bytes | AES-256 key size |
| Symmetric key size | 32 bytes (256 bits) | Matches `ECIES.SYMMETRIC.KEY_SIZE` |

---

## 9. Symmetric Encryption

This section specifies the symmetric encryption algorithm, parameters, and data handling used by DD-ECIES for authenticated encryption of message payloads. DD-ECIES uses AES-256-GCM, an Authenticated Encryption with Associated Data (AEAD) cipher that provides both confidentiality and integrity in a single operation.

**Dependencies:** This section depends on Section 8 (ECDH Shared Secret and Key Derivation) for the 32-byte symmetric key input. The AAD composition rules reference Section 10 (ECIES Encryption — Single Recipient) and Section 11 (ECIES Encryption — Multi-Recipient) for the per-mode definitions.

### 9.1 Algorithm Selection

DD-ECIES symmetric encryption MUST use **AES-256-GCM** (Advanced Encryption Standard with 256-bit keys in Galois/Counter Mode) as specified in [NIST SP 800-38D](https://csrc.nist.gov/publications/detail/sp/800-38d/final).

| Parameter | Value | Reference Constant |
|-----------|-------|--------------------|
| Algorithm | AES | `ECIES.SYMMETRIC.ALGORITHM = 'aes'` |
| Mode | GCM (Galois/Counter Mode) | `ECIES.SYMMETRIC.MODE = 'gcm'` |
| Key Size | 256 bits (32 bytes) | `ECIES.SYMMETRIC.KEY_BITS = 256`, `ECIES.SYMMETRIC.KEY_SIZE = 32` |
| Configuration String | `aes-256-gcm` | `ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION = 'aes-256-gcm'` |

- Implementations MUST use AES with a 256-bit key. Shorter key sizes (128-bit, 192-bit) MUST NOT be used for DD-ECIES message encryption.
- Implementations MUST use GCM mode. Other modes (CBC, CTR, CCM) MUST NOT be substituted.
- The relationship `SYMMETRIC.KEY_SIZE = SYMMETRIC.KEY_BITS / 8` MUST hold (i.e., 32 = 256 / 8).

### 9.2 Initialization Vector (IV)

The initialization vector (IV), also called a nonce in the context of GCM, MUST conform to the following requirements:

| Parameter | Value | Reference Constant |
|-----------|-------|--------------------|
| IV Length | 12 bytes (96 bits) | `ECIES.IV_SIZE = 12` |
| Generation | CSPRNG | `crypto.getRandomValues()` or equivalent |

- The IV MUST be exactly **12 bytes** (96 bits). This is the RECOMMENDED IV length for AES-GCM per NIST SP 800-38D, Section 8.2. Using a 12-byte IV avoids the additional GHASH computation required for other IV lengths and provides optimal performance.
- Each IV MUST be generated from a **Cryptographically Secure Pseudo-Random Number Generator (CSPRNG)**. Implementations MUST use a platform-provided CSPRNG (e.g., `crypto.getRandomValues()` in Web Crypto API, `crypto.randomBytes()` in Node.js, or `/dev/urandom` on POSIX systems).
- A unique IV MUST be generated for **each encryption operation**. Reusing an IV with the same key is catastrophic for AES-GCM security — it allows an attacker to recover the authentication key and forge messages. See Section 16 (Security Considerations) for details on IV reuse risks.
- Implementations MUST NOT use deterministic or counter-based IV generation unless the counter mechanism can guarantee uniqueness across all encryption operations for a given key. Random generation from a CSPRNG is the RECOMMENDED approach.

### 9.3 Authentication Tag

AES-GCM produces an authentication tag that provides integrity and authenticity for both the ciphertext and the Additional Authenticated Data (AAD).

| Parameter | Value | Reference Constant |
|-----------|-------|--------------------|
| Tag Length | 16 bytes (128 bits) | `ECIES.AUTH_TAG_SIZE = 16` |

- The authentication tag MUST be exactly **16 bytes** (128 bits). This is the maximum tag length supported by AES-GCM and provides the strongest integrity guarantee.
- Implementations MUST NOT use shorter tag lengths (e.g., 12 bytes, 8 bytes). Truncated tags reduce the security margin against forgery attacks.
- During encryption, the tag length MUST be specified as 128 bits (16 × 8) to the underlying AES-GCM implementation.
- During decryption, the implementation MUST verify the authentication tag before returning any plaintext. If tag verification fails, the implementation MUST reject the message and MUST NOT return any decrypted data. This prevents release of unauthenticated plaintext.

### 9.4 Additional Authenticated Data (AAD)

AES-GCM supports Additional Authenticated Data (AAD) — data that is integrity-protected by the authentication tag but is not encrypted. In DD-ECIES, the AAD binds the ciphertext to its message header, preventing an attacker from transplanting ciphertext between messages or altering header fields without detection.

#### 9.4.1 AAD Requirement

When encrypting ECIES messages, implementations MUST provide AAD to the AES-GCM encryption function. The AAD composition is defined per Encryption_Type:

| Encryption_Type | AAD Composition | Reference |
|-----------------|-----------------|-----------|
| Basic (`0x21`) | `preamble \|\| version \|\| cipherSuite \|\| type \|\| ephemeralPublicKey` | Section 10 |
| WithLength (`0x42`) | `preamble \|\| version \|\| cipherSuite \|\| type \|\| ephemeralPublicKey` (identical to Basic; the data length field is NOT included in the AAD) | Section 10 |
| Multiple (`0x63`) — message encryption | Complete header bytes (version through encrypted key blocks) | Section 11 |
| Multiple (`0x63`) — per-recipient key encryption | Recipient's ID bytes | Section 11 |

- When no preamble is provided, the AAD begins with the version byte.
- The AAD MUST be the exact byte sequence as specified for each Encryption_Type. Implementations MUST NOT omit, reorder, or add fields to the AAD.
- The same AAD MUST be provided during both encryption and decryption. If the AAD provided during decryption does not match the AAD used during encryption, the authentication tag verification will fail and the message MUST be rejected.

#### 9.4.2 AAD for Non-ECIES Usage

When AES-256-GCM is used outside of the ECIES message framing (e.g., for encrypting stored data such as private keys), the AAD parameter is OPTIONAL. If no AAD is required, implementations MAY pass an empty byte sequence or omit the AAD parameter, depending on the platform API.

### 9.5 Ciphertext and Authentication Tag Separation

In the DD-ECIES wire format, the ciphertext and authentication tag MUST be stored as **separate fields** at distinct byte offsets. They MUST NOT be concatenated into a single opaque blob in the wire format.

#### 9.5.1 Wire Format Layout

For all Encryption_Types, the authentication tag and ciphertext occupy separate, well-defined positions in the wire format:

- **Authentication tag**: Stored at a fixed byte offset in the message header, immediately after the IV field (for Basic and WithLength modes) or at a defined position within each encrypted key block (for Multiple mode per-recipient key encryption).
- **Ciphertext**: Stored after all fixed-size header fields (and after the data length field in WithLength mode), extending to the end of the message.

This separation allows parsers to extract the authentication tag by byte offset without needing to know the ciphertext length, and enables streaming decryption where the tag can be read before processing the ciphertext.

#### 9.5.2 Implementation Note

Many AES-GCM implementations (including the Web Crypto API `SubtleCrypto.encrypt()`) return the authentication tag appended to the ciphertext as a single buffer. Conforming DD-ECIES implementations MUST split this combined output into separate ciphertext and authentication tag components before assembling the wire format:

1. Perform AES-256-GCM encryption, obtaining the combined output.
2. Extract the authentication tag: the last `AUTH_TAG_SIZE` (16) bytes of the combined output.
3. Extract the ciphertext: all bytes of the combined output except the last `AUTH_TAG_SIZE` (16) bytes.
4. Place the authentication tag and ciphertext at their respective positions in the wire format as defined in Sections 10 and 11.

During decryption, the reverse process applies:

1. Extract the authentication tag and ciphertext from their respective wire format positions.
2. Recombine them (ciphertext followed by authentication tag) into the format expected by the platform's AES-GCM decryption API.
3. Perform AES-256-GCM decryption with the recombined data, the IV, the symmetric key, and the reconstructed AAD.

### 9.6 Encryption Procedure

To encrypt a plaintext message using AES-256-GCM, an implementation MUST perform the following steps:

1. **Obtain the symmetric key**: Derive the 32-byte symmetric key via ECDH and HKDF-SHA256 as specified in Section 8, or use a pre-established symmetric key (for multi-recipient message encryption where the symmetric key is randomly generated).

2. **Generate the IV**: Generate a 12-byte IV from a CSPRNG (Section 9.2).

3. **Construct the AAD**: Assemble the AAD byte sequence as defined for the applicable Encryption_Type (Section 9.4).

4. **Encrypt**: Invoke AES-256-GCM encryption with the symmetric key, IV, AAD, and plaintext:

   ```
   (ciphertext, authTag) = AES-256-GCM(key=symmetricKey, iv=iv, aad=aad, plaintext=message)
   ```

5. **Separate outputs**: Split the ciphertext and 16-byte authentication tag into separate byte sequences (Section 9.5.2).

6. **Assemble wire format**: Place the IV, authentication tag, and ciphertext at their defined positions in the wire format for the applicable Encryption_Type.

### 9.7 Decryption Procedure

To decrypt an AES-256-GCM encrypted message, an implementation MUST perform the following steps:

1. **Parse the wire format**: Extract the IV, authentication tag, and ciphertext from their defined byte offsets in the wire format.

2. **Reconstruct the AAD**: Assemble the AAD byte sequence from the parsed header fields, using the same composition rules as encryption (Section 9.4).

3. **Obtain the symmetric key**: Derive the symmetric key via ECDH and HKDF-SHA256 using the ephemeral public key from the message header and the recipient's private key (Section 8), or decrypt the per-recipient encrypted key block (for multi-recipient mode).

4. **Recombine for decryption**: Concatenate the ciphertext and authentication tag in the order expected by the platform's AES-GCM API (typically `ciphertext || authTag`).

5. **Decrypt and verify**: Invoke AES-256-GCM decryption with the symmetric key, IV, AAD, and recombined ciphertext+tag:

   ```
   plaintext = AES-256-GCM-Decrypt(key=symmetricKey, iv=iv, aad=aad, ciphertext || authTag)
   ```

6. **Handle verification failure**: If the authentication tag verification fails, the implementation MUST reject the message with a descriptive error and MUST NOT return any decrypted data. Tag verification failure indicates that the ciphertext, AAD, or both have been tampered with.

### 9.8 Summary of Constants

The following table summarizes the symmetric encryption constants as defined in the reference implementation (`constants.ts`):

| Constant | Value | Description |
|----------|-------|-------------|
| `ECIES.SYMMETRIC.ALGORITHM` | `'aes'` | Symmetric encryption algorithm |
| `ECIES.SYMMETRIC.MODE` | `'gcm'` | Block cipher mode of operation |
| `ECIES.SYMMETRIC.KEY_BITS` | `256` | Symmetric key size in bits |
| `ECIES.SYMMETRIC.KEY_SIZE` | `32` | Symmetric key size in bytes (KEY_BITS / 8) |
| `ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION` | `'aes-256-gcm'` | Full algorithm configuration string |
| `ECIES.IV_SIZE` | `12` | Initialization vector length in bytes |
| `ECIES.AUTH_TAG_SIZE` | `16` | Authentication tag length in bytes (128 bits) |

---

## 10. ECIES Encryption (Single Recipient)

This section specifies the two single-recipient ECIES encryption modes: **Basic** (type byte `0x21`) and **WithLength** (type byte `0x42`). Both modes encrypt a message for exactly one recipient using an ephemeral key pair, ECDH key agreement, HKDF key derivation, and AES-256-GCM authenticated encryption. The modes differ only in whether an explicit plaintext length field is included in the wire format.

**Dependencies:** This section depends on Section 5 (Elliptic Curve Parameters), Section 8 (ECDH Shared Secret and Key Derivation), and Section 9 (Symmetric Encryption).

### 10.1 Overview

Single-recipient ECIES encryption produces a self-contained encrypted message that can be decrypted only by the holder of the recipient's private key. The encryption process:

1. Generates an ephemeral secp256k1 key pair (Section 5).
2. Computes a shared secret via ECDH between the ephemeral private key and the recipient's public key (Section 8.1).
3. Derives a symmetric key via HKDF-SHA256 (Section 8.2).
4. Encrypts the plaintext with AES-256-GCM using the derived symmetric key, a random IV, and mode-specific AAD (Section 9).
5. Assembles the wire format with the ephemeral public key, IV, authentication tag, and ciphertext.

The ephemeral private key MUST be securely discarded immediately after the shared secret is computed. It MUST NOT be stored, logged, or reused.

### 10.2 Basic Mode (0x21)

Basic mode is the simplest single-recipient encryption mode. It does NOT include a data length prefix in the wire format. The plaintext length is implicit — the recipient determines it by decrypting the ciphertext.

#### 10.2.1 Type Byte

Basic mode is identified by the Encryption_Type byte `0x21` (decimal 33). This value is defined in the Encryption Type Registry (Section 17).

#### 10.2.2 Wire Format

The Basic mode wire format is the concatenation of the following fields:

```
[preamble] || version(1) || cipherSuite(1) || type(1) || ephemeralPublicKey(33) || iv(12) || authTag(16) || ciphertext(variable)
```

The following diagram shows the byte-level layout. Byte offsets are relative to the start of the version field (i.e., after any preamble). The preamble, if present, precedes byte 0.

```
                        1                   2                   3
    0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |    Version    |  CipherSuite  |     Type      |               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +              Ephemeral Public Key (33 bytes)                  +
   |                                                               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +                                                               +
   |                                                               |
   +                       IV (12 bytes)                           +
   |                                                               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +                                                               +
   |                                                               |
   +                  Auth Tag (16 bytes)                          +
   |                                                               |
   +                                                               +
   |                                                               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +                 Ciphertext (variable length)                  +
   |                              ...                              |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

#### 10.2.3 Field Descriptions

The following table describes each field in the Basic mode wire format. Byte offsets are relative to the start of the version field (after any preamble).

| Byte Offset | Length (bytes) | Field | Description |
|-------------|----------------|-------|-------------|
| 0 | 1 | `version` | Protocol version. MUST be `0x01` (Version 1). See Section 17. |
| 1 | 1 | `cipherSuite` | Cipher suite identifier. MUST be `0x01` (`Secp256k1_Aes256Gcm_Sha256`). See Section 17. |
| 2 | 1 | `type` | Encryption type. MUST be `0x21` (Basic). See Section 17. |
| 3 | 33 | `ephemeralPublicKey` | The ephemeral public key in 33-byte compressed format (Section 5.2). The recipient uses this key with their private key to reconstruct the shared secret via ECDH (Section 8.1). |
| 36 | 12 | `iv` | The initialization vector for AES-256-GCM, generated from a CSPRNG (Section 9.2). |
| 48 | 16 | `authTag` | The AES-256-GCM authentication tag (Section 9.3). Authenticates both the ciphertext and the AAD. |
| 64 | variable | `ciphertext` | The AES-256-GCM encrypted plaintext. Length equals the plaintext length (AES-GCM in CTR mode does not pad). |

#### 10.2.4 Fixed Overhead

The fixed overhead for Basic mode is **64 bytes**, computed as:

```
version(1) + cipherSuite(1) + type(1) + ephemeralPublicKey(33) + iv(12) + authTag(16) = 64
```

This value is defined by the constant `ECIES.BASIC.FIXED_OVERHEAD_SIZE = 64`.

The total encrypted message size (excluding any preamble) is:

```
totalSize = 64 + |plaintext|
```

The preamble, if present, is prepended to the wire format and adds `|preamble|` bytes to the total message size. The preamble length is NOT encoded in the wire format — it MUST be known to both the encryptor and decryptor through an out-of-band mechanism.

#### 10.2.5 AAD Composition

The Additional Authenticated Data (AAD) for Basic mode MUST be the concatenation of the preamble (if any) and the first three header fields plus the ephemeral public key:

```
AAD = preamble || version || cipherSuite || type || ephemeralPublicKey
```

In terms of byte lengths:

```
|AAD| = |preamble| + 1 + 1 + 1 + 33 = |preamble| + 36
```

When no preamble is provided (zero-length preamble), the AAD consists of exactly 36 bytes: the version, cipher suite, type, and ephemeral public key fields.

The AAD binds the ciphertext to its header fields. Any modification to the version, cipher suite, type, or ephemeral public key will cause the AES-GCM authentication tag verification to fail during decryption, ensuring tamper detection.

#### 10.2.6 Preamble Handling

The preamble is an OPTIONAL variable-length byte sequence that precedes the version field in the wire format:

- When a preamble is provided, it MUST be prepended to the wire format before the version byte.
- The preamble MUST be included in the AAD (as the first component of the AAD concatenation).
- The preamble is authenticated (integrity-protected) by the AES-GCM authentication tag but is NOT encrypted.
- The preamble length is NOT encoded in the wire format. The decryptor MUST know the preamble size through an out-of-band mechanism (e.g., a fixed application-level convention or a framing protocol).
- When no preamble is used, the preamble is a zero-length byte sequence and the wire format begins directly with the version byte.

#### 10.2.7 Encryption Procedure

To encrypt a plaintext message in Basic mode, an implementation MUST perform the following steps:

1. **Generate an ephemeral key pair**: Generate a random secp256k1 private key from a CSPRNG and compute the corresponding 33-byte compressed public key (Section 5).

2. **Compute the shared secret**: Perform ECDH between the ephemeral private key and the recipient's public key to obtain the 32-byte shared secret (Section 8.1).

3. **Derive the symmetric key**: Apply HKDF-SHA256 to the shared secret with an empty salt, the info string `ecies-v2-key-derivation`, and an output length of 32 bytes (Section 8.2).

4. **Construct the AAD**: Concatenate the preamble (if any), version byte (`0x01`), cipher suite byte (`0x01`), type byte (`0x21`), and the ephemeral public key (33 bytes).

5. **Generate the IV**: Generate a 12-byte IV from a CSPRNG (Section 9.2).

6. **Encrypt**: Invoke AES-256-GCM encryption with the derived symmetric key, IV, AAD, and plaintext (Section 9.6). Obtain the ciphertext and 16-byte authentication tag as separate outputs.

7. **Assemble the wire format**: Concatenate the fields in order:

   ```
   result = [preamble] || version(0x01) || cipherSuite(0x01) || type(0x21)
            || ephemeralPublicKey(33) || iv(12) || authTag(16) || ciphertext
   ```

8. **Discard the ephemeral private key**: Securely erase the ephemeral private key from memory.

In notation:

```
(ephPriv, ephPub)  = generateEphemeralKeyPair()
sharedSecret       = ECDH(ephPriv, recipientPubKey)
symKey             = HKDF-SHA256(salt=empty, ikm=sharedSecret,
                                  info="ecies-v2-key-derivation", len=32)
aad                = preamble || 0x01 || 0x01 || 0x21 || ephPub
iv                 = CSPRNG(12)
(ct, tag)          = AES-256-GCM(key=symKey, iv=iv, aad=aad, plaintext=msg)
result             = preamble || 0x01 || 0x01 || 0x21 || ephPub || iv || tag || ct
secureErase(ephPriv)
```

#### 10.2.8 Decryption Procedure

To decrypt a Basic mode message, an implementation MUST perform the following steps:

1. **Parse the wire format**: Extract the preamble (if the preamble size is known), version, cipher suite, type, ephemeral public key, IV, authentication tag, and ciphertext from their byte offsets as defined in Section 10.2.3.

2. **Validate header fields**:
   - The version byte MUST be `0x01`. If not, reject the message with a descriptive error.
   - The cipher suite byte MUST be `0x01`. If not, reject the message with a descriptive error.
   - The type byte MUST be `0x21`. If not, reject the message with a descriptive error.
   - The message length MUST be at least `ECIES.BASIC.FIXED_OVERHEAD_SIZE` (64) bytes (plus the preamble size). If not, reject the message as too short.

3. **Validate the ephemeral public key**: Verify that the ephemeral public key is a valid point on the secp256k1 curve (Section 5.5). If validation fails, reject the message.

4. **Compute the shared secret**: Perform ECDH between the recipient's private key and the ephemeral public key (Section 8.1).

5. **Derive the symmetric key**: Apply HKDF-SHA256 to the shared secret with the same parameters used during encryption (Section 8.2).

6. **Reconstruct the AAD**: Concatenate the preamble (if any), version, cipher suite, type, and ephemeral public key — the same AAD used during encryption.

7. **Decrypt and verify**: Invoke AES-256-GCM decryption with the derived symmetric key, IV, AAD, ciphertext, and authentication tag (Section 9.7). If the authentication tag verification fails, reject the message — the ciphertext or header has been tampered with.

8. **Return the plaintext**: If decryption succeeds, return the decrypted plaintext.

### 10.3 WithLength Mode (0x42)

WithLength mode extends Basic mode (Section 10.2) by inserting an **8-byte big-endian unsigned integer** representing the original plaintext length between the authentication tag and the ciphertext. All other aspects — key agreement, key derivation, AAD composition, and preamble handling — are identical to Basic mode.

The data length field enables recipients to pre-allocate buffers and detect truncation without decrypting the ciphertext. It is particularly useful for streaming decryption and for protocols that need to know the plaintext size before processing.

#### 10.3.1 Type Byte

WithLength mode is identified by the Encryption_Type byte `0x42` (decimal 66). This value is defined in the Encryption Type Registry (Section 17).

#### 10.3.2 Wire Format

The WithLength mode wire format is the concatenation of the following fields:

```
[preamble] || version(1) || cipherSuite(1) || type(1) || ephemeralPublicKey(33) || iv(12) || authTag(16) || dataLength(8) || ciphertext(variable)
```

The following diagram shows the byte-level layout. Byte offsets are relative to the start of the version field (i.e., after any preamble). The preamble, if present, precedes byte 0. Fields shared with Basic mode (Section 10.2.2) are identical; only the `dataLength` field and the shifted ciphertext offset differ.

```
                        1                   2                   3
    0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |    Version    |  CipherSuite  |     Type      |               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +              Ephemeral Public Key (33 bytes)                  +
   |                                                               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +                                                               +
   |                                                               |
   +                       IV (12 bytes)                           +
   |                                                               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +                                                               +
   |                                                               |
   +                  Auth Tag (16 bytes)                          +
   |                                                               |
   +                                                               +
   |                                                               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +              Data Length (8 bytes, big-endian)                 +
   |                                                               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +                 Ciphertext (variable length)                  +
   |                              ...                              |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

#### 10.3.3 Field Descriptions

The following table describes each field in the WithLength mode wire format. Byte offsets are relative to the start of the version field (after any preamble). Fields at offsets 0–63 are identical to Basic mode (Section 10.2.3).

| Byte Offset | Length (bytes) | Field | Description |
|-------------|----------------|-------|-------------|
| 0 | 1 | `version` | Protocol version. MUST be `0x01` (Version 1). See Section 17. |
| 1 | 1 | `cipherSuite` | Cipher suite identifier. MUST be `0x01` (`Secp256k1_Aes256Gcm_Sha256`). See Section 17. |
| 2 | 1 | `type` | Encryption type. MUST be `0x42` (WithLength). See Section 17. |
| 3 | 33 | `ephemeralPublicKey` | The ephemeral public key in 33-byte compressed format (Section 5.2). The recipient uses this key with their private key to reconstruct the shared secret via ECDH (Section 8.1). |
| 36 | 12 | `iv` | The initialization vector for AES-256-GCM, generated from a CSPRNG (Section 9.2). |
| 48 | 16 | `authTag` | The AES-256-GCM authentication tag (Section 9.3). Authenticates both the ciphertext and the AAD. |
| 64 | 8 | `dataLength` | The original plaintext length in bytes, encoded as an 8-byte big-endian unsigned integer. See Section 10.3.4. |
| 72 | variable | `ciphertext` | The AES-256-GCM encrypted plaintext. Length equals the plaintext length (AES-GCM in CTR mode does not pad). |

#### 10.3.4 Data Length Field

The `dataLength` field is an **8-byte big-endian unsigned integer** that records the length of the original plaintext in bytes, before encryption.

- The value MUST be encoded in big-endian (network byte order), with the most significant byte at offset 64 and the least significant byte at offset 71.
- The value MUST equal the length of the plaintext that was encrypted. After decryption, the decrypted output length MUST match the `dataLength` value. If they differ, the implementation MUST reject the message with a descriptive error indicating a data length mismatch.
- The maximum representable value is 2^64 - 1. In practice, implementations MAY impose a lower limit (e.g., `MAX_RAW_DATA_SIZE = 2^53 - 1` for JavaScript safe integer compatibility).

#### 10.3.5 Fixed Overhead

The fixed overhead for WithLength mode is **72 bytes**, computed as:

```
version(1) + cipherSuite(1) + type(1) + ephemeralPublicKey(33) + iv(12) + authTag(16) + dataLength(8) = 72
```

Equivalently:

```
BASIC.FIXED_OVERHEAD_SIZE(64) + DATA_LENGTH_SIZE(8) = 72
```

This value is defined by the constant `ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE = 72`.

The total encrypted message size (excluding any preamble) is:

```
totalSize = 72 + |plaintext|
```

The preamble, if present, is prepended to the wire format and adds `|preamble|` bytes to the total message size. The preamble length is NOT encoded in the wire format — it MUST be known to both the encryptor and decryptor through an out-of-band mechanism.

#### 10.3.6 AAD Composition

The AAD for WithLength mode MUST be **identical** to the Basic mode AAD (Section 10.2.5). The `dataLength` field is NOT included in the AAD:

```
AAD = preamble || version || cipherSuite || type || ephemeralPublicKey
```

In terms of byte lengths:

```
|AAD| = |preamble| + 1 + 1 + 1 + 33 = |preamble| + 36
```

The data length field is intentionally excluded from the AAD. The ciphertext integrity is already protected by the AES-GCM authentication tag, and the data length can be validated after decryption by comparing it to the actual decrypted plaintext length. Including the data length in the AAD would provide no additional security benefit while adding complexity.

#### 10.3.7 Preamble Handling

Preamble handling for WithLength mode is identical to Basic mode (Section 10.2.6). When a preamble is provided, it MUST be prepended to the wire format and included as the first component of the AAD.

#### 10.3.8 Encryption Procedure

To encrypt a plaintext message in WithLength mode, an implementation MUST perform the following steps. Steps 1–6 are identical to Basic mode (Section 10.2.7); only step 4 (type byte) and step 7 (wire format assembly) differ.

1. **Generate an ephemeral key pair**: Generate a random secp256k1 private key from a CSPRNG and compute the corresponding 33-byte compressed public key (Section 5).

2. **Compute the shared secret**: Perform ECDH between the ephemeral private key and the recipient's public key to obtain the 32-byte shared secret (Section 8.1).

3. **Derive the symmetric key**: Apply HKDF-SHA256 to the shared secret with an empty salt, the info string `ecies-v2-key-derivation`, and an output length of 32 bytes (Section 8.2).

4. **Construct the AAD**: Concatenate the preamble (if any), version byte (`0x01`), cipher suite byte (`0x01`), type byte (`0x42`), and the ephemeral public key (33 bytes). Note: the type byte is `0x42`, not `0x21`.

5. **Generate the IV**: Generate a 12-byte IV from a CSPRNG (Section 9.2).

6. **Encrypt**: Invoke AES-256-GCM encryption with the derived symmetric key, IV, AAD, and plaintext (Section 9.6). Obtain the ciphertext and 16-byte authentication tag as separate outputs.

7. **Encode the data length**: Encode the plaintext length as an 8-byte big-endian unsigned integer.

8. **Assemble the wire format**: Concatenate the fields in order:

   ```
   result = [preamble] || version(0x01) || cipherSuite(0x01) || type(0x42)
            || ephemeralPublicKey(33) || iv(12) || authTag(16)
            || dataLength(8) || ciphertext
   ```

9. **Discard the ephemeral private key**: Securely erase the ephemeral private key from memory.

In notation:

```
(ephPriv, ephPub)  = generateEphemeralKeyPair()
sharedSecret       = ECDH(ephPriv, recipientPubKey)
symKey             = HKDF-SHA256(salt=empty, ikm=sharedSecret,
                                  info="ecies-v2-key-derivation", len=32)
aad                = preamble || 0x01 || 0x01 || 0x42 || ephPub
iv                 = CSPRNG(12)
(ct, tag)          = AES-256-GCM(key=symKey, iv=iv, aad=aad, plaintext=msg)
dataLen            = bigEndianUint64(|msg|)
result             = preamble || 0x01 || 0x01 || 0x42 || ephPub
                     || iv || tag || dataLen || ct
secureErase(ephPriv)
```

#### 10.3.9 Decryption Procedure

To decrypt a WithLength mode message, an implementation MUST perform the following steps. The procedure is identical to Basic mode decryption (Section 10.2.8) with the addition of data length extraction and validation.

1. **Parse the wire format**: Extract the preamble (if the preamble size is known), version, cipher suite, type, ephemeral public key, IV, authentication tag, data length, and ciphertext from their byte offsets as defined in Section 10.3.3.

2. **Validate header fields**:
   - The version byte MUST be `0x01`. If not, reject the message with a descriptive error.
   - The cipher suite byte MUST be `0x01`. If not, reject the message with a descriptive error.
   - The type byte MUST be `0x42`. If not, reject the message with a descriptive error.
   - The message length MUST be at least `ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE` (72) bytes (plus the preamble size). If not, reject the message as too short.

3. **Extract the data length**: Read the 8-byte big-endian unsigned integer at offset 64. This is the expected plaintext length.

4. **Validate the ephemeral public key**: Verify that the ephemeral public key is a valid point on the secp256k1 curve (Section 5.5). If validation fails, reject the message.

5. **Compute the shared secret**: Perform ECDH between the recipient's private key and the ephemeral public key (Section 8.1).

6. **Derive the symmetric key**: Apply HKDF-SHA256 to the shared secret with the same parameters used during encryption (Section 8.2).

7. **Reconstruct the AAD**: Concatenate the preamble (if any), version, cipher suite, type, and ephemeral public key — the same AAD used during encryption. The data length field is NOT included in the AAD.

8. **Decrypt and verify**: Invoke AES-256-GCM decryption with the derived symmetric key, IV, AAD, ciphertext, and authentication tag (Section 9.7). If the authentication tag verification fails, reject the message — the ciphertext or header has been tampered with.

9. **Validate the data length**: Compare the decrypted plaintext length to the `dataLength` value extracted in step 3. If they do not match, the implementation MUST reject the message with a descriptive error indicating a data length mismatch. This check detects truncation or padding attacks that might not be caught by the authentication tag alone (e.g., if the data length field was modified before encryption by a compromised sender).

10. **Return the plaintext**: If decryption and data length validation both succeed, return the decrypted plaintext.

### 10.4 Summary of Constants

The following table summarizes the single-recipient encryption constants as defined in the reference implementation:

| Constant | Value | Description |
|----------|-------|-------------|
| `ECIES.ENCRYPTION_TYPE.BASIC` | `0x21` (33) | Basic mode type byte — no data length prefix |
| `ECIES.ENCRYPTION_TYPE.WITH_LENGTH` | `0x42` (66) | WithLength mode type byte — includes 8-byte data length |
| `ECIES.BASIC.FIXED_OVERHEAD_SIZE` | `64` | Fixed overhead in bytes for Basic mode (version + cipherSuite + type + ephPubKey + iv + authTag) |
| `ECIES.BASIC.DATA_LENGTH_SIZE` | `0` | No data length field in Basic mode |
| `ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE` | `72` | Fixed overhead in bytes for WithLength mode (Basic overhead + 8-byte data length) |
| `ECIES.WITH_LENGTH.DATA_LENGTH_SIZE` | `8` | Data length field size in bytes (big-endian uint64) |

---

## 11. ECIES Encryption (Multi-Recipient)

This section specifies the multi-recipient ECIES encryption mode (type byte `0x63`), which encrypts a single message for multiple recipients efficiently. Rather than performing a full ECIES encryption per recipient, multi-recipient mode generates a single random symmetric key, encrypts the message once with that key, and then encrypts the symmetric key individually for each recipient using ECIES key encapsulation with a shared ephemeral key pair.

**Dependencies:** This section depends on Section 5 (Elliptic Curve Parameters), Section 8 (ECDH Shared Secret and Key Derivation), and Section 9 (Symmetric Encryption).

### 11.1 Overview

Multi-recipient ECIES encryption addresses the common scenario where a single plaintext message must be delivered confidentially to multiple recipients. The naive approach — encrypting the entire message separately for each recipient — is wasteful because it multiplies the ciphertext size by the recipient count. Multi-recipient mode avoids this by separating the message encryption from the key distribution:

1. Generate a single random 32-byte symmetric key from a CSPRNG.
2. Generate a single ephemeral secp256k1 key pair shared across all recipients.
3. For each recipient, encrypt the symmetric key using ECDH key agreement between the shared ephemeral private key and the recipient's public key, followed by HKDF key derivation and AES-256-GCM encryption. Each recipient's ID bytes are used as AAD for their key encryption, binding the encrypted key to the intended recipient.
4. Encrypt the plaintext message once with the random symmetric key using AES-256-GCM, using the complete header bytes as AAD.
5. Assemble the header (containing the ephemeral public key, data length, recipient IDs, and per-recipient encrypted key blocks) and append the encrypted message payload.

Each recipient can independently decrypt the message by:

1. Locating their encrypted key block in the header by matching their recipient ID.
2. Decrypting the symmetric key using their private key and the shared ephemeral public key.
3. Decrypting the message ciphertext with the recovered symmetric key.

### 11.2 Type Byte

Multi-recipient mode is identified by the Encryption_Type byte `0x63` (decimal 99). This value is defined in the Encryption Type Registry (Section 17).

### 11.3 Header Wire Format

The multi-recipient header contains all metadata required to identify recipients and decrypt the symmetric key. The header is a contiguous byte sequence used as AAD for the message encryption, binding the header integrity to the ciphertext.

The header wire format is the concatenation of the following fields:

```
version(1) || cipherSuite(1) || type(1) || ephemeralPublicKey(33) || dataLength(8) || recipientCount(2) || recipientIds(recipientIdSize * count) || encryptedKeys(60 * count)
```

The following diagram shows the byte-level layout of the header. Byte offsets are relative to the start of the header (the version field).

```
                        1                   2                   3
    0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |    Version    |  CipherSuite  |     Type      |               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +              Ephemeral Public Key (33 bytes)                  +
   |                                                               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +              Data Length (8 bytes, big-endian)                 +
   |  [MSB = recipientIdSize | lower 56 bits = plaintext length]   |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |     Recipient Count (2 bytes, big-endian)    |                |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+               +
   |                                                               |
   +          Recipient ID #1 (recipientIdSize bytes)              +
   |                                                               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +          Recipient ID #2 (recipientIdSize bytes)              +
   |                                                               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                              ...                              |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +          Recipient ID #N (recipientIdSize bytes)              +
   |                                                               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +                                                               +
   |                                                               |
   +          Encrypted Key Block #1 (60 bytes)                    +
   |            iv(12) || authTag(16) || encSymKey(32)              |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +          Encrypted Key Block #2 (60 bytes)                    +
   |            iv(12) || authTag(16) || encSymKey(32)              |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                              ...                              |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +          Encrypted Key Block #N (60 bytes)                    +
   |            iv(12) || authTag(16) || encSymKey(32)              |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

#### 11.3.1 Field Descriptions

The following table describes each field in the multi-recipient header. Byte offsets for the fixed-size fields are relative to the start of the header. Offsets for the variable-length fields (recipient IDs and encrypted keys) depend on the recipient count and recipient ID size.

| Byte Offset | Length (bytes) | Field | Description |
|-------------|----------------|-------|-------------|
| 0 | 1 | `version` | Protocol version. MUST be `0x01` (Version 1). See Section 17. |
| 1 | 1 | `cipherSuite` | Cipher suite identifier. MUST be `0x01` (`Secp256k1_Aes256Gcm_Sha256`). See Section 17. |
| 2 | 1 | `type` | Encryption type. MUST be `0x63` (Multiple). See Section 17. |
| 3 | 33 | `ephemeralPublicKey` | The shared ephemeral public key in 33-byte compressed format (Section 5.2). All recipients use this single ephemeral key with their private key to reconstruct the shared secret via ECDH (Section 8.1). |
| 36 | 8 | `dataLength` | Combined field encoding both the recipient ID size and the plaintext data length. See Section 11.3.2. |
| 44 | 2 | `recipientCount` | The number of recipients, encoded as a 2-byte big-endian unsigned integer. See Section 11.3.3. |
| 46 | `recipientIdSize * count` | `recipientIds` | Concatenated recipient ID bytes. Each recipient ID is `recipientIdSize` bytes. The IDs appear in the same order as the corresponding encrypted key blocks. |
| 46 + `recipientIdSize * count` | `60 * count` | `encryptedKeys` | Concatenated per-recipient encrypted key blocks. Each block is exactly 60 bytes. See Section 11.3.4. |

#### 11.3.2 Data Length Field Encoding

The `dataLength` field is an **8-byte (64-bit) big-endian unsigned integer** that encodes two values in a single field:

- **Most Significant Byte (bits 63–56):** The recipient ID size in bytes. This value MUST be in the range [1, 255]. Storing the recipient ID size in the header allows parsers to decode the header without prior knowledge of the configured ID provider.
- **Lower 56 bits (bits 55–0):** The original plaintext data length in bytes, before encryption.

The combined value is computed as:

```
combinedLength = (recipientIdSize << 56) | dataLength
```

Where:
- `recipientIdSize` is a single byte (0–255) shifted to the most significant byte position.
- `dataLength` is the plaintext length, which MUST NOT exceed 2^56 - 1 (approximately 72 petabytes). In practice, the reference implementation limits this to `MAX_RAW_DATA_SIZE = 2^53 - 1` for JavaScript safe integer compatibility.

The combined value is stored as a big-endian 64-bit unsigned integer.

**Parsing:** To extract the two values from the combined field:

```
storedRecipientIdSize = combinedLength >> 56          // top 8 bits
dataLength            = combinedLength & 0x00FFFFFFFFFFFFFF  // lower 56 bits
```

If `storedRecipientIdSize` is zero, the parser SHOULD fall back to the configured default recipient ID size for backward compatibility with legacy messages that did not encode the ID size.

#### 11.3.3 Recipient Count

The `recipientCount` field is a **2-byte big-endian unsigned integer** specifying the number of recipients in the message.

- The value MUST be in the range [1, 65535]. A multi-recipient message with zero recipients is invalid and MUST be rejected.
- The maximum value of 65535 is defined by the constant `ECIES.MULTIPLE.MAX_RECIPIENTS = 65535`.
- The recipient count determines the size of the variable-length portions of the header: the recipient IDs block (`recipientIdSize * recipientCount` bytes) and the encrypted keys block (`60 * recipientCount` bytes).

#### 11.3.4 Encrypted Key Block Format

Each recipient has a corresponding encrypted key block that contains the random symmetric key encrypted specifically for that recipient. The encrypted key block is exactly **60 bytes** and has the following internal structure:

```
iv(12) || authTag(16) || encryptedSymKey(32)
```

| Byte Offset (within block) | Length (bytes) | Field | Description |
|-----------------------------|----------------|-------|-------------|
| 0 | 12 | `iv` | The initialization vector for the per-recipient AES-256-GCM key encryption, generated from a CSPRNG (Section 9.2). Each recipient's key encryption uses a unique IV. |
| 12 | 16 | `authTag` | The AES-256-GCM authentication tag for the per-recipient key encryption (Section 9.3). Authenticates the encrypted symmetric key and the recipient's ID bytes (used as AAD). |
| 28 | 32 | `encryptedSymKey` | The 32-byte random symmetric key encrypted with AES-256-GCM using the ECDH-derived key for this recipient. |

The encrypted key block size is defined by the constant `ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE = 60`, computed as:

```
ENCRYPTED_KEY_SIZE = IV_SIZE(12) + AUTH_TAG_SIZE(16) + SYMMETRIC.KEY_SIZE(32) = 60
```

The encrypted key blocks appear in the same order as the recipient IDs. That is, `encryptedKeys[i]` corresponds to `recipientIds[i]`.

### 11.4 Per-Recipient Key Encryption

For each recipient, the random symmetric key is encrypted using ECIES key encapsulation with the shared ephemeral key pair. The process for recipient *i* is:

1. **Compute the shared secret**: Perform ECDH between the shared ephemeral private key and recipient *i*'s public key (Section 8.1):

   ```
   sharedSecret_i = ECDH(ephemeralPrivateKey, recipientPublicKey_i)
   ```

2. **Derive the per-recipient symmetric key**: Apply HKDF-SHA256 to the shared secret with an empty salt, the info string `ecies-v2-key-derivation`, and an output length of 32 bytes (Section 8.2):

   ```
   derivedKey_i = HKDF-SHA256(salt=empty, ikm=sharedSecret_i,
                               info="ecies-v2-key-derivation", len=32)
   ```

3. **Construct the per-recipient AAD**: The AAD for per-recipient key encryption MUST be the recipient's ID bytes. This binds the encrypted key to the intended recipient, preventing an attacker from transplanting an encrypted key block from one recipient slot to another:

   ```
   aad_i = recipientId_i    // recipientIdSize bytes
   ```

4. **Generate a per-recipient IV**: Generate a 12-byte IV from a CSPRNG. Each recipient's key encryption MUST use a unique IV.

5. **Encrypt the symmetric key**: Invoke AES-256-GCM encryption with the derived key, IV, AAD, and the random symmetric key as plaintext:

   ```
   (encSymKey_i, authTag_i) = AES-256-GCM(key=derivedKey_i, iv=iv_i,
                                            aad=recipientId_i,
                                            plaintext=symmetricKey)
   ```

6. **Assemble the encrypted key block**: Concatenate the IV, authentication tag, and encrypted symmetric key:

   ```
   encryptedKeyBlock_i = iv_i(12) || authTag_i(16) || encSymKey_i(32)
   ```

**Important:** All recipients share the same ephemeral key pair. The ephemeral private key MUST be securely discarded after all per-recipient key encryptions are complete. It MUST NOT be stored, logged, or reused.

### 11.5 Message Ciphertext

The message ciphertext is appended after the header and contains the AES-256-GCM encrypted plaintext. The message payload wire format is:

```
[preamble] || iv(12) || authTag(16) || ciphertext(variable)
```

The following diagram shows the byte-level layout of the message payload. Byte offsets are relative to the start of the message payload (after the header). The preamble, if present, precedes the IV.

```
                        1                   2                   3
    0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |              [Optional Preamble (variable)]                   |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +                                                               +
   |                                                               |
   +                       IV (12 bytes)                           +
   |                                                               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +                                                               +
   |                                                               |
   +                  Auth Tag (16 bytes)                          +
   |                                                               |
   +                                                               +
   |                                                               |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |                                                               |
   +                 Ciphertext (variable length)                  +
   |                              ...                              |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

| Byte Offset (within payload) | Length (bytes) | Field | Description |
|------------------------------|----------------|-------|-------------|
| 0 | variable | `preamble` | OPTIONAL. Application-defined preamble bytes. When present, prepended before the IV. Not encrypted, not included in AAD for message encryption (the header serves as AAD). |
| 0 or `\|preamble\|` | 12 | `iv` | The initialization vector for the message AES-256-GCM encryption, generated from a CSPRNG (Section 9.2). |
| 12 or `\|preamble\| + 12` | 16 | `authTag` | The AES-256-GCM authentication tag for the message encryption (Section 9.3). Authenticates both the ciphertext and the header bytes (used as AAD). |
| 28 or `\|preamble\| + 28` | variable | `ciphertext` | The AES-256-GCM encrypted plaintext. Length equals the plaintext length. |

### 11.6 AAD Composition

Multi-recipient mode uses two distinct AAD compositions — one for the message encryption and one for each per-recipient key encryption.

#### 11.6.1 Message Encryption AAD

The AAD for the message encryption MUST be the **complete header bytes** — the entire contiguous byte sequence from the version field through the last encrypted key block:

```
messageAAD = version(1) || cipherSuite(1) || type(1) || ephemeralPublicKey(33)
             || dataLength(8) || recipientCount(2)
             || recipientIds(recipientIdSize * count)
             || encryptedKeys(60 * count)
```

This binds the message ciphertext to the complete header, ensuring that any modification to the header fields (including recipient IDs, encrypted key blocks, or the data length) will cause the AES-GCM authentication tag verification to fail during message decryption.

The header bytes used as AAD MUST be constructed before the message is encrypted, since the AAD is an input to the AES-256-GCM encryption function.

#### 11.6.2 Per-Recipient Key Encryption AAD

The AAD for each per-recipient key encryption MUST be the **recipient's ID bytes**:

```
keyAAD_i = recipientId_i    // recipientIdSize bytes
```

This binds each encrypted key block to its intended recipient. If an attacker attempts to swap encrypted key blocks between recipients (e.g., replacing recipient A's encrypted key with recipient B's), the AES-GCM authentication tag verification will fail because the AAD (recipient ID) will not match.

### 11.7 Header Size Computation

The total header size in bytes is computed as:

```
headerSize = VERSION_SIZE(1) + CIPHER_SUITE_SIZE(1) + ENCRYPTION_TYPE_SIZE(1)
             + PUBLIC_KEY_LENGTH(33) + DATA_LENGTH_SIZE(8) + RECIPIENT_COUNT_SIZE(2)
             + (recipientIdSize * recipientCount)
             + (ENCRYPTED_KEY_SIZE(60) * recipientCount)
```

Simplifying the fixed portion:

```
headerSize = 46 + recipientCount * (recipientIdSize + 60)
```

For the default recipient ID size of 12 bytes (MongoDB ObjectID):

```
headerSize = 46 + recipientCount * 72
```

**Examples:**

| Recipient Count | Recipient ID Size | Header Size (bytes) |
|-----------------|-------------------|---------------------|
| 1 | 12 | 118 |
| 2 | 12 | 190 |
| 10 | 12 | 766 |
| 100 | 12 | 7246 |
| 1 | 16 | 122 |
| 1 | 32 | 138 |

### 11.8 Encryption Procedure

To encrypt a plaintext message in multi-recipient mode, an implementation MUST perform the following steps:

1. **Validate the recipient count**: The number of recipients MUST be at least 1 and MUST NOT exceed `ECIES.MULTIPLE.MAX_RECIPIENTS` (65535). If the count is out of range, reject the operation with a descriptive error.

2. **Generate the random symmetric key**: Generate a 32-byte symmetric key from a CSPRNG:

   ```
   symmetricKey = CSPRNG(32)
   ```

3. **Generate the shared ephemeral key pair**: Generate a single random secp256k1 key pair from a CSPRNG (Section 5). This key pair is shared across all recipients:

   ```
   (ephPriv, ephPub) = generateEphemeralKeyPair()
   ```

4. **Encrypt the symmetric key for each recipient**: For each recipient *i* (where *i* ranges from 0 to `recipientCount - 1`), perform the per-recipient key encryption as specified in Section 11.4. Collect the recipient IDs and encrypted key blocks in order.

5. **Build the header**: Assemble the header byte sequence as specified in Section 11.3, including the version, cipher suite, type, ephemeral public key, data length (with recipient ID size encoded in the MSB), recipient count, recipient IDs, and encrypted key blocks.

6. **Generate the message IV**: Generate a 12-byte IV from a CSPRNG for the message encryption.

7. **Encrypt the message**: Invoke AES-256-GCM encryption with the random symmetric key, the message IV, the complete header bytes as AAD, and the plaintext:

   ```
   (ct, tag) = AES-256-GCM(key=symmetricKey, iv=msgIV,
                             aad=headerBytes, plaintext=message)
   ```

8. **Assemble the message payload**: Concatenate the preamble (if any), message IV, authentication tag, and ciphertext:

   ```
   messagePayload = [preamble] || msgIV(12) || tag(16) || ct
   ```

9. **Discard sensitive material**: Securely erase the ephemeral private key and the random symmetric key from memory.

In notation:

```
symmetricKey       = CSPRNG(32)
(ephPriv, ephPub)  = generateEphemeralKeyPair()

for each recipient i:
    sharedSecret_i = ECDH(ephPriv, recipientPubKey_i)
    derivedKey_i   = HKDF-SHA256(salt=empty, ikm=sharedSecret_i,
                                  info="ecies-v2-key-derivation", len=32)
    iv_i           = CSPRNG(12)
    (encKey_i, tag_i) = AES-256-GCM(key=derivedKey_i, iv=iv_i,
                                      aad=recipientId_i,
                                      plaintext=symmetricKey)
    encKeyBlock_i  = iv_i || tag_i || encKey_i

headerBytes = 0x01 || 0x01 || 0x63 || ephPub
              || dataLength(8) || recipientCount(2)
              || recipientId_0 || ... || recipientId_N
              || encKeyBlock_0 || ... || encKeyBlock_N

msgIV              = CSPRNG(12)
(ct, msgTag)       = AES-256-GCM(key=symmetricKey, iv=msgIV,
                                   aad=headerBytes, plaintext=message)
messagePayload     = [preamble] || msgIV || msgTag || ct

secureErase(ephPriv)
secureErase(symmetricKey)
```

### 11.9 Decryption Procedure

To decrypt a multi-recipient message for a specific recipient, an implementation MUST perform the following steps:

1. **Parse the header**: Extract the version, cipher suite, type, ephemeral public key, data length (including recipient ID size), recipient count, recipient IDs, and encrypted key blocks from the header as specified in Section 11.3.

2. **Validate header fields**:
   - The version byte MUST be `0x01`. If not, reject the message with a descriptive error.
   - The cipher suite byte MUST be `0x01`. If not, reject the message with a descriptive error.
   - The type byte MUST be `0x63`. If not, reject the message with a descriptive error.
   - The recipient count MUST be in the range [1, 65535]. If not, reject the message.
   - The data length (lower 56 bits) MUST be greater than zero and MUST NOT exceed `MAX_RAW_DATA_SIZE`. If not, reject the message.

3. **Validate the ephemeral public key**: Verify that the ephemeral public key is a valid point on the secp256k1 curve (Section 5.5). If validation fails, reject the message.

4. **Locate the recipient's encrypted key block**: Search the recipient IDs for a match with the decrypting recipient's ID. If the recipient ID is not found, the implementation MUST reject the message with a descriptive error indicating that the recipient was not found.

5. **Decrypt the symmetric key**: Using the matched recipient's encrypted key block, perform the reverse of the per-recipient key encryption (Section 11.4):

   a. Extract the IV (12 bytes), authentication tag (16 bytes), and encrypted symmetric key (32 bytes) from the encrypted key block.

   b. Compute the shared secret via ECDH between the recipient's private key and the ephemeral public key.

   c. Derive the per-recipient symmetric key via HKDF-SHA256.

   d. Decrypt the encrypted symmetric key using AES-256-GCM with the derived key, IV, and the recipient's ID bytes as AAD. If the authentication tag verification fails, reject the message.

   e. Validate that the decrypted symmetric key is exactly 32 bytes.

6. **Rebuild the header bytes**: Reconstruct the complete header byte sequence from the parsed fields. This is needed as AAD for the message decryption.

7. **Parse the message payload**: Extract the preamble (if known), IV (12 bytes), authentication tag (16 bytes), and ciphertext from the message payload.

8. **Decrypt the message**: Invoke AES-256-GCM decryption with the recovered symmetric key, the message IV, the header bytes as AAD, the ciphertext, and the authentication tag. If the authentication tag verification fails, reject the message.

9. **Validate the data length**: Compare the decrypted plaintext length to the `dataLength` value from the header. If they do not match, reject the message with a descriptive error.

10. **Return the plaintext**: If all validations pass, return the decrypted plaintext.

### 11.10 Sign-Then-Encrypt (Optional)

Multi-recipient mode supports an OPTIONAL sign-then-encrypt pattern for sender authentication. When a sender private key is provided:

**Encryption:** The sender signs the plaintext message using ECDSA (Section 7), then prepends the 64-byte signature to the plaintext before encryption:

```
messageToEncrypt = signature(64) || plaintext
```

The `dataLength` field in the header records the length of `messageToEncrypt` (i.e., 64 + |plaintext|).

**Decryption:** When a sender public key is provided, the decryptor extracts the first 64 bytes of the decrypted data as the signature and the remainder as the plaintext. The signature is verified against the plaintext using ECDSA verification (Section 7). If verification fails, the implementation MUST reject the message.

This pattern is OPTIONAL. When no sender key is provided, the plaintext is encrypted directly without a signature prefix.

### 11.11 Summary of Constants

The following table summarizes the multi-recipient encryption constants as defined in the reference implementation (`constants.ts`):

| Constant | Value | Description |
|----------|-------|-------------|
| `ECIES.ENCRYPTION_TYPE.MULTIPLE` | `0x63` (99) | Multi-recipient mode type byte |
| `ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE` | `60` | Per-recipient encrypted key block size in bytes (IV + AuthTag + EncSymKey) |
| `ECIES.MULTIPLE.MAX_RECIPIENTS` | `65535` | Maximum number of recipients (2-byte unsigned integer maximum) |
| `ECIES.MULTIPLE.MAX_DATA_SIZE` | `1048576` | Maximum payload size guardrail for multi-recipient messages (1 MB) |
| `ECIES.MULTIPLE.RECIPIENT_ID_SIZE` | `12` | Default recipient ID size in bytes (MongoDB ObjectID). Configurable via ID provider. |
| `ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE` | `2` | Recipient count field size in bytes (big-endian uint16) |
| `ECIES.MULTIPLE.DATA_LENGTH_SIZE` | `8` | Data length field size in bytes (big-endian uint64) |
| `ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE` | `64` | Fixed overhead for the per-message encryption portion (version + cipherSuite + type + ephPubKey + IV + authTag) |

---

## 12. Message Framing and Wire Format

This section provides a consolidated summary of the wire formats for all three DD-ECIES Encryption_Types. The detailed field descriptions, encryption procedures, and decryption procedures for each mode are specified in Section 10 (Single Recipient) and Section 11 (Multi-Recipient). This section serves as a quick reference for implementers and specifies the canonical serialization (round-trip) property that all conforming implementations MUST satisfy.

**Dependencies:** This section depends on Section 10 (ECIES Encryption — Single Recipient) and Section 11 (ECIES Encryption — Multi-Recipient).

### 12.1 Byte Offset Summary — Basic Mode (0x21)

The Basic mode wire format is the simplest single-recipient format. It does NOT include a data length prefix. All byte offsets are relative to the start of the version field (after any optional preamble). See Section 10.2 for the full specification.

| Byte Offset | End Offset | Length (bytes) | Field | Value / Encoding |
|-------------|------------|----------------|-------|------------------|
| 0 | 0 | 1 | `version` | `0x01` |
| 1 | 1 | 1 | `cipherSuite` | `0x01` |
| 2 | 2 | 1 | `type` | `0x21` |
| 3 | 35 | 33 | `ephemeralPublicKey` | Compressed secp256k1 point (0x02/0x03 prefix) |
| 36 | 47 | 12 | `iv` | CSPRNG-generated initialization vector |
| 48 | 63 | 16 | `authTag` | AES-256-GCM authentication tag |
| 64 | variable | variable | `ciphertext` | AES-256-GCM encrypted plaintext |

**Fixed overhead:** 64 bytes (`ECIES.BASIC.FIXED_OVERHEAD_SIZE`).
**Total message size:** `64 + |plaintext|` bytes (excluding preamble).
**AAD:** `preamble || version || cipherSuite || type || ephemeralPublicKey` (36 bytes + preamble length).

### 12.2 Byte Offset Summary — WithLength Mode (0x42)

The WithLength mode extends Basic mode by inserting an 8-byte big-endian data length field between the authentication tag and the ciphertext. All other fields are identical to Basic mode. See Section 10.3 for the full specification.

| Byte Offset | End Offset | Length (bytes) | Field | Value / Encoding |
|-------------|------------|----------------|-------|------------------|
| 0 | 0 | 1 | `version` | `0x01` |
| 1 | 1 | 1 | `cipherSuite` | `0x01` |
| 2 | 2 | 1 | `type` | `0x42` |
| 3 | 35 | 33 | `ephemeralPublicKey` | Compressed secp256k1 point (0x02/0x03 prefix) |
| 36 | 47 | 12 | `iv` | CSPRNG-generated initialization vector |
| 48 | 63 | 16 | `authTag` | AES-256-GCM authentication tag |
| 64 | 71 | 8 | `dataLength` | Plaintext length, big-endian uint64 |
| 72 | variable | variable | `ciphertext` | AES-256-GCM encrypted plaintext |

**Fixed overhead:** 72 bytes (`ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE`).
**Total message size:** `72 + |plaintext|` bytes (excluding preamble).
**AAD:** `preamble || version || cipherSuite || type || ephemeralPublicKey` (36 bytes + preamble length). The `dataLength` field is NOT included in the AAD.

### 12.3 Byte Offset Summary — Multiple Mode (0x63) Header

The Multiple mode header contains all metadata for multi-recipient key encapsulation. The header size is variable, depending on the recipient count and recipient ID size. See Section 11 for the full specification.

| Byte Offset | End Offset | Length (bytes) | Field | Value / Encoding |
|-------------|------------|----------------|-------|------------------|
| 0 | 0 | 1 | `version` | `0x01` |
| 1 | 1 | 1 | `cipherSuite` | `0x01` |
| 2 | 2 | 1 | `type` | `0x63` |
| 3 | 35 | 33 | `ephemeralPublicKey` | Compressed secp256k1 point (0x02/0x03 prefix) |
| 36 | 43 | 8 | `dataLength` | Combined: MSB = recipientIdSize, lower 56 bits = plaintext length (big-endian uint64) |
| 44 | 45 | 2 | `recipientCount` | Number of recipients, big-endian uint16 (max 65535) |
| 46 | 46 + (idSize × count) − 1 | idSize × count | `recipientIds` | Concatenated recipient IDs, each `recipientIdSize` bytes |
| 46 + (idSize × count) | 46 + (idSize × count) + (60 × count) − 1 | 60 × count | `encryptedKeys` | Concatenated per-recipient encrypted key blocks |

Where `idSize` = `recipientIdSize` (extracted from the MSB of the `dataLength` field) and `count` = `recipientCount`.

**Each encrypted key block** (60 bytes) has the internal structure:

| Block Offset | Length (bytes) | Field |
|--------------|----------------|-------|
| 0 | 12 | `iv` — per-recipient CSPRNG-generated IV |
| 12 | 16 | `authTag` — per-recipient AES-256-GCM authentication tag |
| 28 | 32 | `encryptedSymKey` — the random symmetric key encrypted for this recipient |

**Header size:** `46 + (recipientIdSize × recipientCount) + (60 × recipientCount)` bytes.

The message payload follows the header:

| Field | Length (bytes) | Description |
|-------|----------------|-------------|
| `preamble` (optional) | variable | Application-defined preamble, if present |
| `iv` | 12 | CSPRNG-generated IV for message encryption |
| `authTag` | 16 | AES-256-GCM authentication tag for the message ciphertext |
| `ciphertext` | variable | AES-256-GCM encrypted plaintext |

**Message AAD:** The complete header bytes (from `version` through the last encrypted key block).
**Per-recipient key AAD:** The recipient's ID bytes.

### 12.4 Mode Comparison

The following table summarizes the key differences between the three Encryption_Types.

| Property | Basic (0x21) | WithLength (0x42) | Multiple (0x63) |
|----------|-------------|-------------------|-----------------|
| Type byte | `0x21` (33) | `0x42` (66) | `0x63` (99) |
| Recipients | 1 | 1 | 1–65535 |
| Data length field | No | Yes (8 bytes, big-endian uint64) | Yes (8 bytes, combined with recipientIdSize) |
| Fixed header overhead | 64 bytes | 72 bytes | 46 bytes (fixed portion) + variable per-recipient data |
| Ephemeral key pair | Per-message | Per-message | Per-message (shared across all recipients) |
| Symmetric key | Derived via ECDH + HKDF | Derived via ECDH + HKDF | Random, then encrypted per-recipient |
| AAD for message encryption | `preamble \|\| version \|\| cipherSuite \|\| type \|\| ephPubKey` | Same as Basic (dataLength excluded) | Complete header bytes |
| Preamble support | Yes (optional, variable-length) | Yes (optional, variable-length) | Yes (optional, in message payload only) |
| Use case | Simple single-recipient encryption | Single-recipient with pre-allocatable buffers | Efficient multi-recipient broadcast |

### 12.5 Canonical Serialization (Round-Trip Property)

A conforming implementation MUST satisfy the following canonical serialization property for each Encryption_Type:

> **Round-Trip Property:** For all valid DD-ECIES encrypted messages, parsing the serialized byte sequence into its constituent fields and re-serializing those fields in the order and encoding specified by the wire format MUST produce a byte sequence identical to the original input.

Formally, let `serialize(fields)` denote the function that assembles a set of parsed header and payload fields into a wire-format byte sequence according to the rules in Sections 10 and 11, and let `parse(bytes)` denote the function that extracts the individual fields from a wire-format byte sequence. Then for all valid encrypted messages `M`:

```
serialize(parse(M)) = M
```

This property MUST hold for:

1. **Basic mode (0x21):** Parsing the version, cipher suite, type, ephemeral public key, IV, authentication tag, and ciphertext fields from the wire format and re-serializing them in the order specified in Section 10.2.2 MUST produce byte-identical output. If a preamble is present, it MUST be preserved exactly.

2. **WithLength mode (0x42):** Parsing the version, cipher suite, type, ephemeral public key, IV, authentication tag, data length, and ciphertext fields from the wire format and re-serializing them in the order specified in Section 10.3.2 MUST produce byte-identical output. The data length field MUST be re-encoded as an 8-byte big-endian unsigned integer. If a preamble is present, it MUST be preserved exactly.

3. **Multiple mode (0x63):** Parsing the header fields (version, cipher suite, type, ephemeral public key, data length, recipient count, recipient IDs, and encrypted key blocks) and the message payload fields (preamble, IV, authentication tag, and ciphertext) from the wire format and re-serializing them in the order specified in Sections 11.3 and 11.5 MUST produce byte-identical output. The data length combined encoding (recipientIdSize in MSB, plaintext length in lower 56 bits) MUST be preserved exactly. Recipient IDs and encrypted key blocks MUST appear in the same order as the original.

#### 12.5.1 Requirements for Canonical Serialization

To ensure the round-trip property holds, implementations MUST observe the following rules:

- **No field reordering:** Fields MUST be serialized in the exact order specified by the wire format for each Encryption_Type. Implementations MUST NOT reorder fields during serialization.
- **No padding or alignment:** Implementations MUST NOT insert padding bytes between fields. All fields are packed contiguously with no gaps.
- **Exact integer encoding:** All multi-byte integer fields (data length, recipient count) MUST be encoded in big-endian byte order with the exact number of bytes specified (8 bytes for data length, 2 bytes for recipient count). Leading zero bytes MUST NOT be stripped.
- **Exact public key encoding:** The ephemeral public key MUST be serialized in the 33-byte compressed format. Implementations MUST NOT expand it to uncompressed format during re-serialization.
- **Recipient order preservation:** In Multiple mode, the order of recipient IDs and their corresponding encrypted key blocks MUST be preserved exactly. Implementations MUST NOT sort or reorder recipients during re-serialization.
- **Preamble preservation:** If a preamble is present in the original message, it MUST be preserved byte-for-byte during re-serialization. Implementations MUST NOT modify, truncate, or extend the preamble.

#### 12.5.2 Minimum Message Sizes

A conforming parser MUST reject messages that are shorter than the minimum size for their declared Encryption_Type. The minimum sizes (excluding any preamble) are:

| Encryption_Type | Minimum Size (bytes) | Derivation |
|-----------------|---------------------|------------|
| Basic (0x21) | 64 | Fixed overhead only (zero-length plaintext) |
| WithLength (0x42) | 72 | Fixed overhead only (zero-length plaintext) |
| Multiple (0x63) | 108 | 46 (fixed header) + 1 × recipientIdSize + 60 (one encrypted key block) + 0 (zero-length payload possible) |

For Multiple mode, the exact minimum depends on the `recipientIdSize` extracted from the `dataLength` field. With the default `recipientIdSize` of 12 bytes, the minimum header size for one recipient is `46 + 12 + 60 = 118` bytes, plus the message payload (at minimum 28 bytes for IV + authTag with zero-length ciphertext), totaling **146 bytes**.

If the message is shorter than the minimum size for its declared type, the parser MUST reject it with a descriptive error indicating that the data is too short for the declared Encryption_Type.

### 12.6 Summary of Wire Format Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `ECIES.BASIC.FIXED_OVERHEAD_SIZE` | `64` | Fixed overhead for Basic mode (bytes) |
| `ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE` | `72` | Fixed overhead for WithLength mode (bytes) |
| `ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE` | `64` | Fixed overhead for the per-message encryption portion in Multiple mode (bytes) |
| `ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE` | `60` | Per-recipient encrypted key block size (bytes) |
| `ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE` | `2` | Recipient count field size (bytes) |
| `ECIES.MULTIPLE.DATA_LENGTH_SIZE` | `8` | Data length field size (bytes) |
| `ECIES.MULTIPLE.RECIPIENT_ID_SIZE` | `12` | Default recipient ID size (bytes) |
| `ECIES.PUBLIC_KEY_LENGTH` | `33` | Compressed ephemeral public key size (bytes) |
| `ECIES.IV_SIZE` | `12` | Initialization vector size (bytes) |
| `ECIES.AUTH_TAG_SIZE` | `16` | AES-256-GCM authentication tag size (bytes) |
| `ECIES.SYMMETRIC.KEY_SIZE` | `32` | Symmetric key size (bytes) |

---

## 13. Checksum Operations

This section specifies the checksum algorithm used by DD-ECIES for data integrity verification. Checksums provide a fixed-length digest of arbitrary data, enabling implementations to detect accidental corruption or modification.

**Dependencies:** This section is self-contained and does not depend on other sections.

### 13.1 Algorithm

DD-ECIES checksums MUST use the **SHA3-512** hash function as defined in [FIPS 202: SHA-3 Standard](https://csrc.nist.gov/publications/detail/fips/202/final).

| Parameter | Value | Reference Constant |
|-----------|-------|--------------------|
| Algorithm | SHA3-512 | `CHECKSUM.ALGORITHM = 'sha3-512'` |
| Hash output size | 512 bits | `CHECKSUM.SHA3_DEFAULT_HASH_BITS = 512` |
| Digest length | 64 bytes | `CHECKSUM.SHA3_BUFFER_LENGTH = 64` |

- The hash function MUST be SHA3-512 (Keccak-based). Implementations MUST NOT substitute SHA-512 (SHA-2 family) or any other hash function.
- The digest output MUST be exactly 64 bytes (512 bits). The relationship `SHA3_BUFFER_LENGTH = SHA3_DEFAULT_HASH_BITS / 8` MUST hold.

### 13.2 Computation Procedure

To compute a checksum over an input byte sequence, an implementation MUST perform the following steps:

1. **Hash the input**: Compute `digest = SHA3-512(input)`, where `input` is the raw byte sequence to be checksummed. The output is a 64-byte digest.

2. **Encode the digest**: Convert the 64-byte digest to a **lowercase hexadecimal string**. Each byte is represented as exactly two hexadecimal characters using the digits `0`–`9` and lowercase letters `a`–`f`.

In notation:

```
digest    = SHA3-512(input)                    // 64-byte (512-bit) digest
checksum  = hex_encode_lower(digest)           // 128-character lowercase hex string
```

### 13.3 Output Encoding

Checksum output MUST be encoded as a **lowercase hexadecimal string**.

| Parameter | Value | Reference Constant |
|-----------|-------|--------------------|
| Encoding | Hexadecimal (lowercase) | `CHECKSUM.ENCODING = 'hex'` |
| Output string length | 128 characters | 64 bytes × 2 hex chars per byte |

- Each byte of the 64-byte digest MUST be encoded as exactly two hexadecimal characters, zero-padded on the left if necessary. For example, the byte `0x0A` MUST be encoded as `"0a"`, not `"a"`.
- The hexadecimal output MUST use lowercase letters (`a`–`f`). Uppercase letters (`A`–`F`) MUST NOT be used.
- The resulting checksum string is exactly 128 characters long.

### 13.4 Example

**Input:** The UTF-8 encoding of the string `"hello"` (5 bytes: `0x68 0x65 0x6C 0x6C 0x6F`).

**Computation:**

```
digest   = SHA3-512("hello")
checksum = hex_encode_lower(digest)
```

**Output (128-character lowercase hex string):**

```
75d527c368f2efe848ecf6b073a36767800805e9eef2b1857d5f984f036eb6df891d75f72d9b154518c1cd58835286d1da9a38deba3de98b5a53e5ed78a84976
```

A conforming implementation MUST produce this exact checksum string when given the input `"hello"`.

### 13.5 Summary of Constants

The following table summarizes the checksum constants as defined in the reference implementation (`constants.ts`):

| Constant | Value | Description |
|----------|-------|-------------|
| `CHECKSUM.ALGORITHM` | `'sha3-512'` | Hash algorithm identifier |
| `CHECKSUM.SHA3_DEFAULT_HASH_BITS` | `512` | Hash output size in bits |
| `CHECKSUM.SHA3_BUFFER_LENGTH` | `64` | Hash output size in bytes (512 / 8) |
| `CHECKSUM.ENCODING` | `'hex'` | Output encoding (lowercase hexadecimal) |

---

## 14. PBKDF2 Password Hashing Profiles

This section specifies the named PBKDF2 (Password-Based Key Derivation Function 2) profiles used by DD-ECIES for password hashing. Each profile defines a fixed set of parameters that control the security/performance tradeoff of the key derivation. Implementations MUST use the exact parameter values specified for each profile to ensure cross-implementation compatibility.

**Dependencies:** This section is self-contained and does not depend on other sections.

### 14.1 Overview

DD-ECIES defines three named PBKDF2 profiles, each targeting a different use case:

| Profile Name | Use Case | Security Level |
|-------------|----------|----------------|
| `BROWSER_PASSWORD` | Password hashing in browser environments | Production — balanced security and performance for interactive login |
| `HIGH_SECURITY` | Password hashing requiring maximum security | Production — high iteration count for sensitive operations |
| `TEST_FAST` | Unit and integration testing only | **Non-production** — low iteration count for fast test execution |

Implementations MUST support all three profiles. The profile name is used as a key to look up the corresponding parameter set. Profile names are case-sensitive and MUST match exactly as specified (e.g., `BROWSER_PASSWORD`, not `browser_password`).

### 14.2 Profile Parameters

Each PBKDF2 profile specifies the following parameters:

| Parameter | Description |
|-----------|-------------|
| `hashBytes` | The length of the derived key output in bytes. |
| `saltBytes` | The length of the salt in bytes. The salt MUST be generated from a CSPRNG (see Section 14.3). |
| `iterations` | The number of PBKDF2 iterations. Higher values increase computational cost and resistance to brute-force attacks. |
| `algorithm` | The HMAC hash function used by PBKDF2 (e.g., SHA-256, SHA-512). |

### 14.3 Salt Generation

Salt values MUST be generated from a **cryptographically secure pseudo-random number generator (CSPRNG)**. The salt length is specified by the `saltBytes` parameter of the selected profile.

- Implementations MUST NOT use predictable, static, or user-derived salt values.
- Implementations MUST NOT reuse salt values across different password hashing operations.
- The salt MUST be stored alongside the derived key output so that the same derivation can be reproduced during password verification.

### 14.4 Profile Definitions

The following subsections define the exact parameters for each named profile. All values are taken from the reference implementation (`constants.ts` — `PBKDF2_PROFILES`).

#### 14.4.1 BROWSER_PASSWORD

The `BROWSER_PASSWORD` profile is designed for password hashing in browser-based applications. It provides a balance between security and interactive performance, targeting approximately 1–3 seconds of computation time in modern browsers.

| Parameter | Value |
|-----------|-------|
| `hashBytes` | `32` |
| `saltBytes` | `64` |
| `iterations` | `2000000` (2,000,000) |
| `algorithm` | `SHA-512` |

- This profile SHOULD be used for user login and password change operations in browser environments.
- The 2,000,000 iteration count provides strong resistance to offline brute-force attacks while remaining feasible for interactive use.

**Source:** `PBKDF2_PROFILES[Pbkdf2ProfileEnum.BROWSER_PASSWORD]`

#### 14.4.2 HIGH_SECURITY

The `HIGH_SECURITY` profile is designed for operations requiring maximum password hashing security, such as master key derivation or high-value account protection. It uses a higher iteration count and produces a longer derived key.

| Parameter | Value |
|-----------|-------|
| `hashBytes` | `64` |
| `saltBytes` | `32` |
| `iterations` | `5000000` (5,000,000) |
| `algorithm` | `SHA-256` |

- This profile SHOULD be used when the computational cost of password hashing is acceptable (e.g., server-side operations, infrequent key derivation).
- The 5,000,000 iteration count provides significantly stronger resistance to brute-force attacks compared to `BROWSER_PASSWORD`, at the cost of longer computation time.
- The 64-byte derived key output provides additional key material for applications that require it.

**Source:** `PBKDF2_PROFILES[Pbkdf2ProfileEnum.HIGH_SECURITY]`

#### 14.4.3 TEST_FAST

The `TEST_FAST` profile is designed exclusively for use in test environments. It uses a minimal iteration count to enable fast test execution.

| Parameter | Value |
|-----------|-------|
| `hashBytes` | `32` |
| `saltBytes` | `64` |
| `iterations` | `1000` |
| `algorithm` | `SHA-512` |

> **WARNING:** The `TEST_FAST` profile MUST NOT be used in production environments. Its low iteration count (1,000) provides negligible resistance to brute-force attacks and is cryptographically insufficient for protecting real passwords. This profile exists solely to avoid the multi-second delays that production-grade iteration counts would impose on automated test suites.

- Implementations SHOULD enforce this restriction programmatically (e.g., by checking an environment variable or build flag) when feasible.
- If an implementation detects the use of `TEST_FAST` in a production context, it SHOULD log a warning or raise an error.

**Source:** `PBKDF2_PROFILES[Pbkdf2ProfileEnum.TEST_FAST]`

### 14.5 PBKDF2 Computation Procedure

To derive a key from a password using a named profile, an implementation MUST perform the following steps:

1. **Select the profile**: Look up the named profile (e.g., `BROWSER_PASSWORD`) to obtain the `hashBytes`, `saltBytes`, `iterations`, and `algorithm` parameters.

2. **Generate the salt**: Generate a random salt of `saltBytes` bytes from a CSPRNG (Section 14.3).

3. **Derive the key**: Compute the PBKDF2 output:

   ```
   derivedKey = PBKDF2(password, salt, iterations, hashBytes, algorithm)
   ```

   Where:
   - `password` is the user's password encoded as a UTF-8 byte sequence.
   - `salt` is the CSPRNG-generated salt.
   - `iterations` is the profile's iteration count.
   - `hashBytes` is the desired output length in bytes.
   - `algorithm` is the HMAC hash function (e.g., `SHA-512` for `BROWSER_PASSWORD`).

4. **Store the result**: Store the derived key, the salt, and the profile name. All three values are needed to verify the password later.

### 14.6 Profile Summary Table

The following table consolidates all profile parameters for quick reference:

| Profile | `hashBytes` | `saltBytes` | `iterations` | `algorithm` | Production Use |
|---------|-------------|-------------|--------------|-------------|----------------|
| `BROWSER_PASSWORD` | 32 | 64 | 2,000,000 | SHA-512 | Yes |
| `HIGH_SECURITY` | 64 | 32 | 5,000,000 | SHA-256 | Yes |
| `TEST_FAST` | 32 | 64 | 1,000 | SHA-512 | **No** — testing only |

### 14.7 Summary of Constants

The following table summarizes the PBKDF2 profile constants as defined in the reference implementation (`constants.ts`):

| Constant Path | Value | Description |
|---------------|-------|-------------|
| `PBKDF2_PROFILES.BROWSER_PASSWORD.hashBytes` | `32` | Derived key length (bytes) |
| `PBKDF2_PROFILES.BROWSER_PASSWORD.saltBytes` | `64` | Salt length (bytes) |
| `PBKDF2_PROFILES.BROWSER_PASSWORD.iterations` | `2000000` | PBKDF2 iteration count |
| `PBKDF2_PROFILES.BROWSER_PASSWORD.algorithm` | `'SHA-512'` | HMAC hash function |
| `PBKDF2_PROFILES.HIGH_SECURITY.hashBytes` | `64` | Derived key length (bytes) |
| `PBKDF2_PROFILES.HIGH_SECURITY.saltBytes` | `32` | Salt length (bytes) |
| `PBKDF2_PROFILES.HIGH_SECURITY.iterations` | `5000000` | PBKDF2 iteration count |
| `PBKDF2_PROFILES.HIGH_SECURITY.algorithm` | `'SHA-256'` | HMAC hash function |
| `PBKDF2_PROFILES.TEST_FAST.hashBytes` | `32` | Derived key length (bytes) |
| `PBKDF2_PROFILES.TEST_FAST.saltBytes` | `64` | Salt length (bytes) |
| `PBKDF2_PROFILES.TEST_FAST.iterations` | `1000` | PBKDF2 iteration count |
| `PBKDF2_PROFILES.TEST_FAST.algorithm` | `'SHA-512'` | HMAC hash function |

---

## 15. Voting Subsystem (Paillier)

This section specifies the Paillier homomorphic encryption subsystem used by DD-ECIES for privacy-preserving voting. The Paillier cryptosystem provides additive homomorphic properties, allowing encrypted votes to be tallied without decrypting individual ballots.

**Dependencies:** This section depends on Section 5 (Elliptic Curve Parameters) for the secp256k1 curve definition and Section 8 (ECDH Shared Secret and Key Derivation) for shared secret computation.

### 15.1 Overview

The voting subsystem bridges ECDH key pairs (secp256k1) to Paillier homomorphic encryption key pairs (3072-bit) through a deterministic derivation chain. Given the same ECDH private key and public key, any conforming implementation MUST produce the same Paillier key pair.

The derivation chain is:

```
ECDH shared secret (65 bytes, uncompressed)
    │
    ▼
HKDF-SHA512(secret, salt=null, info="PaillierPrimeGen", len=64)
    │
    ▼
seed (64 bytes)
    │
    ▼
HMAC-DRBG(seed, algorithm=SHA-512)
    │
    ▼
generateDeterministicPrime(drbg, 1536 bits) → p
generateDeterministicPrime(drbg, 1536 bits) → q
    │
    ▼
Paillier key pair: n = p × q (3072 bits)
```

The security level is approximately 128 bits, equivalent to 3072-bit RSA as recommended by NIST.

### 15.2 Paillier Key Pair Parameters

The Paillier key pair MUST use the following parameters:

| Parameter | Value | Reference Constant |
|-----------|-------|--------------------|
| Key length | 3072 bits | `VOTING.KEYPAIR_BIT_LENGTH = 3072` |
| Prime size | 1536 bits each (half of key length) | Derived from `KEYPAIR_BIT_LENGTH / 2` |
| Security level | ~128 bits (NIST recommended for 3072-bit modulus) | — |

The Paillier public key consists of:

- **n**: The modulus, computed as `n = p × q`, where `p` and `q` are 1536-bit primes.
- **g**: The generator, computed as `g = n + 1` (simplified Paillier form).

The Paillier private key consists of:

- **λ (lambda)**: Computed as `λ = lcm(p - 1, q - 1)`.
- **μ (mu)**: Computed as `μ = L(g^λ mod n²)^(-1) mod n`, where `L(x) = (x - 1) / n`.

Implementations MUST verify the following safety conditions during key generation:

1. `p ≠ q` — The two primes MUST be distinct.
2. `|p - q| ≥ 2^768` — The primes MUST NOT be too close (to resist Fermat factoring).
3. `gcd(n, λ) = 1` — Required for Paillier correctness.
4. A test encryption/decryption round-trip MUST succeed before the key pair is accepted.

### 15.3 Deterministic Key Derivation from ECDH

Voting key pairs MUST be derived deterministically from an ECDH shared secret. The derivation procedure is:

#### 15.3.1 Shared Secret Computation

1. Compute the ECDH shared secret using the sender's private key and the recipient's public key on the secp256k1 curve.
2. The shared secret MUST be the **full uncompressed point** (65 bytes with `0x04` prefix), including both x-coordinate and y-coordinate. This provides maximum entropy for key derivation.

#### 15.3.2 HKDF Key Derivation

The shared secret MUST be processed through HKDF to produce a seed for the DRBG:

| Parameter | Value | Reference Constant |
|-----------|-------|--------------------|
| Algorithm | HKDF-SHA512 (RFC 5869 with HMAC-SHA512) | `VOTING.HMAC_ALGORITHM = 'sha512'` |
| Input Keying Material (IKM) | ECDH shared secret (65 bytes, uncompressed) | — |
| Salt | `null` (defaults to a string of 64 zero bytes per RFC 5869) | — |
| Info | `PaillierPrimeGen` (UTF-8 encoded, 16 bytes) | `VOTING.PRIME_GEN_INFO = 'PaillierPrimeGen'` |
| Output Length | 64 bytes | `VOTING.HKDF_LENGTH = 64` |

The info string `PaillierPrimeGen` provides domain separation, ensuring that the derived seed is cryptographically bound to the voting key generation purpose.

When the salt is `null` or empty, implementations MUST use a zero-filled byte array of length equal to the hash output size (64 bytes for SHA-512) as specified in RFC 5869.

#### 15.3.3 HMAC-DRBG Initialization

The 64-byte HKDF output MUST be used to seed an HMAC-DRBG (Deterministic Random Bit Generator) conforming to NIST SP 800-90A:

| Parameter | Value |
|-----------|-------|
| HMAC Algorithm | SHA-512 |
| Hash Length | 64 bytes |
| Initial V | 64 bytes of `0x01` |
| Initial K | 64 bytes of `0x00` |
| Seed Material | 64-byte HKDF output |

The DRBG initialization procedure is:

1. Set `V = 0x01 0x01 ... 0x01` (64 bytes).
2. Set `K = 0x00 0x00 ... 0x00` (64 bytes).
3. Update with seed: `K = HMAC-SHA512(K, V || 0x00 || seed)`.
4. Update V: `V = HMAC-SHA512(K, V)`.
5. Update with seed again: `K = HMAC-SHA512(K, V || 0x01 || seed)`.
6. Update V: `V = HMAC-SHA512(K, V)`.

The DRBG `generate(numBytes)` function produces output by iteratively computing `V = HMAC-SHA512(K, V)` and concatenating the results until the requested number of bytes is produced, followed by an internal state update.

### 15.4 Prime Generation

Each prime (`p` and `q`) MUST be generated using the seeded HMAC-DRBG with the following procedure:

1. Generate `ceil(1536 / 8) = 192` random bytes from the DRBG.
2. Set the top bit to ensure the candidate has exactly 1536 bits.
3. Set the bottom bit to ensure the candidate is odd.
4. Convert the byte sequence to a big integer.
5. Perform a trial division check against small primes (2, 3, 5, 7, ..., 251) to quickly eliminate composites.
6. If the candidate passes trial division, perform the Miller-Rabin primality test.
7. If the candidate is not prime, repeat from step 1.

#### 15.4.1 Miller-Rabin Primality Testing

The Miller-Rabin primality test MUST use **256 iterations** as specified by the constant `VOTING.PRIME_TEST_ITERATIONS = 256`. With 256 rounds, the probability of a composite number passing the test is less than `2^(-512)`, providing an extremely high confidence level.

The maximum number of DRBG attempts for generating a single prime is defined by the constant `VOTING.DRBG_PRIME_ATTEMPTS = 20000`. If a prime is not found within this limit, the implementation MUST raise an error.

### 15.5 Serialized Key Format

Voting keys MUST be serialized using the following binary format for storage and transmission. The format includes a magic identifier, version number, key identifiers, and an integrity checksum.

#### 15.5.1 Public Key Serialization

The serialized public key format is:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     Magic ("BCVK", 4 bytes)                   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Version(1)  |                                               |
+-+-+-+-+-+-+-+-+                                               +
|                       Key ID (32 bytes)                       |
+                                                               +
|                          (SHA-256)                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    n_length (4 bytes, big-endian)              |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                  n value (variable length)                     |
|              (hex-encoded UTF-8 string, padded to             |
|               PUB_KEY_OFFSET = 768 characters)                |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                 SHA-256 Checksum (32 bytes)                    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

| Field | Offset | Length | Description |
|-------|--------|--------|-------------|
| Magic | 0 | 4 bytes | ASCII string `BCVK` (BrightChain Voting Key) |
| Version | 4 | 1 byte | Key format version, currently `2` |
| Key ID | 5 | 32 bytes | SHA-256 hash of the hex-encoded `n` value (UTF-8 bytes) |
| n_length | 37 | 4 bytes | Length of the `n` value field in bytes (big-endian uint32) |
| n value | 41 | variable | The Paillier modulus `n`, hex-encoded as a UTF-8 string, zero-padded on the left to `PUB_KEY_OFFSET` (768) characters |
| Checksum | 41 + n_length | 32 bytes | SHA-256 hash of all preceding bytes (magic through n value) |

**Key ID Computation:** The key ID MUST be computed as `SHA-256(UTF8_ENCODE(hex(n)))`, where `hex(n)` is the hexadecimal string representation of `n` zero-padded to 768 characters. The SHA-256 input is the UTF-8 byte encoding of this hex string, NOT the raw binary representation of the hex digits.

**Public Key Offset:** The constant `VOTING.PUB_KEY_OFFSET = 768` specifies the minimum character width for hex-encoded key components. The `n` value MUST be zero-padded on the left to this width.

#### 15.5.2 Private Key Serialization

The serialized private key format is:

```
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     Magic ("BCVK", 4 bytes)                   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Version(1)  |                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                lambda_length (4 bytes, big-endian)             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                lambda value (variable length)                  |
|              (hex-encoded UTF-8 string, padded to             |
|               PUB_KEY_OFFSET = 768 characters)                |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                  mu_length (4 bytes, big-endian)               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                   mu value (variable length)                   |
|              (hex-encoded UTF-8 string, padded to             |
|               PUB_KEY_OFFSET = 768 characters)                |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                 SHA-256 Checksum (32 bytes)                    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

| Field | Offset | Length | Description |
|-------|--------|--------|-------------|
| Magic | 0 | 4 bytes | ASCII string `BCVK` |
| Version | 4 | 1 byte | Key format version, currently `2` |
| lambda_length | 5 | 4 bytes | Length of the lambda value field in bytes (big-endian uint32) |
| lambda value | 9 | variable | The Paillier `λ` value, hex-encoded as a UTF-8 string, zero-padded to 768 characters |
| mu_length | 9 + lambda_length | 4 bytes | Length of the mu value field in bytes (big-endian uint32) |
| mu value | 13 + lambda_length | variable | The Paillier `μ` value, hex-encoded as a UTF-8 string, zero-padded to 768 characters |
| Checksum | 13 + lambda_length + mu_length | 32 bytes | SHA-256 hash of all preceding bytes |

**Security Warning:** Private keys MUST be kept secret. Serialized private keys SHOULD be encrypted before storage or transmission.

#### 15.5.3 Key Format Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `VOTING.KEY_MAGIC` | `'BCVK'` | Magic identifier for voting keys (4 ASCII bytes) |
| `VOTING.KEY_VERSION` | `2` | Current key serialization format version |
| `VOTING.KEY_ID_LENGTH` | `32` | Key ID length in bytes (SHA-256 output) |
| `VOTING.INSTANCE_ID_LENGTH` | `32` | Instance ID length in bytes |
| `VOTING.CHECKSUM_LENGTH` | `32` | SHA-256 checksum length in bytes |
| `VOTING.PUB_KEY_OFFSET` | `768` | Minimum hex character width for key components |

#### 15.5.4 Deserialization and Validation

When deserializing a voting key, implementations MUST perform the following validation steps:

1. **Magic verification**: The first 4 bytes MUST be the ASCII string `BCVK`. If not, the implementation MUST reject the buffer.
2. **Version check**: The version byte MUST equal `2` (the current version). Unrecognized versions MUST be rejected.
3. **Checksum verification**: Compute `SHA-256` over all bytes preceding the checksum field and compare with the stored checksum. If they do not match, the implementation MUST reject the buffer as corrupted.
4. **Key ID verification** (public keys only): Recompute the key ID from the deserialized `n` value and compare with the stored key ID. If they do not match, the implementation MUST reject the key.

### 15.6 Serialization Encoding

All large integer values (`n`, `λ`, `μ`) MUST be serialized using the following encoding:

| Parameter | Value | Reference Constant |
|-----------|-------|--------------------|
| Radix | 16 (hexadecimal) | `VOTING.KEY_RADIX = 16` |
| Format | Hexadecimal string encoded as UTF-8 bytes | `VOTING.KEY_FORMAT = 'hex'` |
| Padding | Zero-padded on the left to 768 characters | `VOTING.PUB_KEY_OFFSET = 768` |
| Bits radix | 2 (binary, for bit-length calculations) | `VOTING.BITS_RADIX = 2` |
| Digest format | Hexadecimal | `VOTING.DIGEST_FORMAT = 'hex'` |

### 15.7 Homomorphic Properties

The Paillier cryptosystem provides the following additive homomorphic property that the voting subsystem relies upon:

Given ciphertexts `c₁ = Encrypt(m₁)` and `c₂ = Encrypt(m₂)`:

```
Decrypt(c₁ × c₂ mod n²) = m₁ + m₂
```

This property allows encrypted votes to be multiplied together (modulo `n²`) to produce an encryption of the sum of the votes, without ever decrypting individual ballots.

### 15.8 Key Derivation Procedure Summary

The complete procedure for deriving a Paillier voting key pair from an ECDH key pair is:

1. Compute the ECDH shared secret (65 bytes, uncompressed) from the private key and public key on secp256k1.
2. Derive a 64-byte seed using HKDF-SHA512 with info string `PaillierPrimeGen` and null salt.
3. Initialize an HMAC-DRBG (SHA-512) with the 64-byte seed.
4. Generate the first 1536-bit prime `p` using the DRBG with 256-round Miller-Rabin testing.
5. Generate the second 1536-bit prime `q` using the same DRBG with 256-round Miller-Rabin testing.
6. Validate that `p ≠ q` and `|p - q| ≥ 2^768`.
7. Compute `n = p × q`, `λ = lcm(p - 1, q - 1)`, `g = n + 1`, `μ = L(g^λ mod n²)^(-1) mod n`.
8. Validate that `gcd(n, λ) = 1`.
9. Perform a test encryption/decryption round-trip to verify correctness.
10. Return the Paillier key pair: public key `(n, g)`, private key `(λ, μ)`.

### 15.9 Summary of Constants

The following table summarizes all voting subsystem constants as defined in the reference implementation (`constants.ts` — `VOTING`):

| Constant | Value | Description |
|----------|-------|-------------|
| `VOTING.KEYPAIR_BIT_LENGTH` | `3072` | Paillier key pair bit length |
| `VOTING.PRIME_GEN_INFO` | `'PaillierPrimeGen'` | HKDF info string for domain separation |
| `VOTING.PRIME_TEST_ITERATIONS` | `256` | Miller-Rabin primality test iterations |
| `VOTING.PUB_KEY_OFFSET` | `768` | Public key hex padding width / extraction offset |
| `VOTING.HKDF_LENGTH` | `64` | HKDF output length in bytes |
| `VOTING.HMAC_ALGORITHM` | `'sha512'` | HMAC algorithm for HKDF and DRBG |
| `VOTING.HASH_ALGORITHM` | `'sha256'` | Hash algorithm for key ID and checksum |
| `VOTING.KEY_MAGIC` | `'BCVK'` | Magic bytes for serialized voting keys |
| `VOTING.KEY_VERSION` | `2` | Current key serialization format version |
| `VOTING.KEY_ID_LENGTH` | `32` | Key ID length in bytes (SHA-256 output) |
| `VOTING.INSTANCE_ID_LENGTH` | `32` | Instance ID length in bytes |
| `VOTING.CHECKSUM_LENGTH` | `32` | SHA-256 checksum length in bytes |
| `VOTING.DRBG_PRIME_ATTEMPTS` | `20000` | Maximum DRBG attempts per prime |
| `VOTING.BITS_RADIX` | `2` | Radix for bit-string representation |
| `VOTING.KEY_RADIX` | `16` | Radix for key serialization (hexadecimal) |
| `VOTING.KEY_FORMAT` | `'hex'` | Key serialization format |
| `VOTING.DIGEST_FORMAT` | `'hex'` | Digest output format |

---

## 16. Security Considerations

This section documents the security properties, known risks, and required mitigations for conforming DD-ECIES implementations. Implementers MUST read this section in its entirety before deploying a DD-ECIES implementation in any environment handling real user data.

### 16.1 Cryptographically Secure Random Number Generation

All random values generated by a DD-ECIES implementation MUST be produced by a Cryptographically Secure Pseudo-Random Number Generator (CSPRNG). This requirement applies to, but is not limited to, the following:

| Random Value | Size | Usage |
|-------------|------|-------|
| Initialization Vectors (IVs) | 12 bytes | AES-256-GCM encryption (Section 9) |
| Ephemeral private keys | 32 bytes | Per-encryption ECDH key agreement (Sections 10, 11) |
| Symmetric keys | 32 bytes | Multi-recipient message encryption (Section 11) |
| PBKDF2 salts | 32 or 64 bytes | Password hashing (Section 14) |
| BIP39 mnemonic entropy | 32 bytes (256 bits) | Key generation (Section 6) |

- Implementations MUST use the operating system's CSPRNG facility. Examples include `crypto.randomBytes()` (Node.js), `crypto.getRandomValues()` (Web Crypto API), `/dev/urandom` (Linux/macOS), and `BCryptGenRandom` (Windows).
- Implementations MUST NOT use non-cryptographic random number generators (e.g., `Math.random()` in JavaScript, `rand()` in C, or `java.util.Random` in Java) for any value that enters a cryptographic operation.
- Implementations MUST NOT use a fixed or predictable seed for random value generation outside of test environments. The `TEST_FAST` PBKDF2 profile (Section 14) is the only context where reduced security parameters are permitted, and even then, salts MUST still be generated from a CSPRNG.
- If the CSPRNG is unavailable or fails (e.g., insufficient entropy at system startup), the implementation MUST abort the operation rather than falling back to a weaker source of randomness.

### 16.2 Key Management Best Practices

#### 16.2.1 Private Key Protection

Private keys are the most sensitive values in the DD-ECIES system. Compromise of a private key allows an attacker to decrypt all messages encrypted to the corresponding public key and to forge signatures.

- Private keys SHOULD be stored in memory-protected buffers that are excluded from core dumps and swap files where the platform supports it.
- Private keys MUST be securely erased (overwritten with zeros or random bytes) from memory as soon as they are no longer needed. Language runtimes with garbage collection MAY make this difficult; implementations SHOULD use platform-specific secure memory facilities (e.g., `sodium_memzero`, `SecureString`, or manual buffer zeroing) where available.
- Private keys MUST NOT be logged, serialized to unencrypted storage, or transmitted in cleartext over any channel.
- Private keys MUST be validated upon loading: the value MUST be a 32-byte scalar in the range [1, n-1], where *n* is the secp256k1 curve order (see Section 5.4). Implementations MUST reject private keys with a value of zero or a value greater than or equal to *n*.

#### 16.2.2 Public Key Validation

Before using any public key in a cryptographic operation (ECDH key agreement, signature verification, or ECIES encryption), implementations MUST validate that the public key represents a point on the secp256k1 curve:

1. Decode the public key to obtain the point coordinates *(x, y)* (see Section 5.3 for accepted formats).
2. Verify that the point satisfies the curve equation: *y² ≡ x³ + 7 (mod p)*.
3. Verify that the point is not the point at infinity.

Failure to validate public keys exposes the implementation to **invalid curve attacks**, where an attacker supplies a point on a different (weaker) curve to extract the private key through repeated interactions. This is a critical vulnerability in any ECDH-based protocol.

- Implementations MUST reject invalid public keys with a descriptive error before performing any cryptographic operation.
- Implementations MUST NOT assume that public keys received from external sources are valid. All public keys — whether from key servers, message headers, or peer exchanges — MUST be validated.

#### 16.2.3 Mnemonic Phrase Security

BIP39 mnemonic phrases (Section 6) encode the root secret from which all DD-ECIES keys are derived. The security of the entire key hierarchy depends on the secrecy of the mnemonic.

- Mnemonic phrases SHOULD be generated in a secure environment and displayed to the user only once for backup.
- Mnemonic phrases MUST NOT be stored in plaintext on disk or in application databases.
- Implementations SHOULD encourage users to store mnemonic phrases offline (e.g., written on paper or engraved on metal) in a physically secure location.
- The mnemonic entropy MUST be generated from a CSPRNG (see Section 16.1).

### 16.3 IV Reuse Risks for AES-GCM

AES-GCM (Section 9) is an authenticated encryption mode that is **catastrophically vulnerable to IV (nonce) reuse**. If the same IV is used with the same key to encrypt two different plaintexts, an attacker can:

1. **Recover the XOR of the two plaintexts**, completely breaking confidentiality.
2. **Forge authentication tags**, completely breaking integrity and authenticity.
3. **Recover the GHASH authentication key**, enabling unlimited forgeries for that key.

These attacks are practical and require only the two ciphertexts encrypted under the reused IV — no knowledge of the key is needed.

#### 16.3.1 Mitigation: Random IVs with Ephemeral Keys

DD-ECIES mitigates IV reuse risk through two complementary mechanisms:

1. **Random IV generation**: Every AES-GCM encryption operation MUST use a fresh 12-byte IV generated from a CSPRNG (Section 16.1). With 96-bit random IVs, the probability of a collision after *q* encryptions under the same key is approximately *q² / 2^96*. For a single ephemeral key used once, this probability is zero.

2. **Ephemeral keys**: In single-recipient modes (Basic and WithLength), each encryption operation generates a fresh ephemeral key pair, producing a unique symmetric key via ECDH + HKDF. Since each message uses a different symmetric key, IV reuse across messages does not compromise security.

In multi-recipient mode (Section 11), a single random symmetric key encrypts the message, and each recipient's copy of that key is encrypted with a per-recipient ephemeral ECDH derivation. The message IV MUST be unique for the message symmetric key. Since the symmetric key is randomly generated per message, the risk of IV reuse under the same key is negligible.

#### 16.3.2 IV Reuse Boundaries

The following table summarizes the IV uniqueness requirements for each encryption context:

| Context | Key Scope | IV Requirement |
|---------|-----------|----------------|
| Single-recipient (Basic/WithLength) | Unique per message (ephemeral ECDH) | MUST be random; collision risk is negligible due to unique key |
| Multi-recipient message encryption | Unique per message (random symmetric key) | MUST be random; collision risk is negligible due to unique key |
| Multi-recipient per-recipient key encryption | Unique per recipient (ephemeral ECDH + recipient public key) | MUST be random; each recipient derives a different key |

- Implementations MUST NOT reuse an IV with the same symmetric key under any circumstances.
- Implementations MUST NOT use a counter-based IV scheme unless the counter state can be guaranteed to persist across process restarts and never repeat. Random IVs are RECOMMENDED for all DD-ECIES operations.

### 16.4 Ephemeral Key Generation Requirements

Ephemeral key pairs are central to the forward secrecy properties of DD-ECIES. Each encryption operation (single-recipient or multi-recipient) MUST generate a fresh ephemeral secp256k1 key pair.

- The ephemeral private key MUST be generated from a CSPRNG and MUST be in the valid range [1, n-1] (Section 5.4).
- The ephemeral private key MUST be securely erased from memory immediately after the ECDH shared secret has been computed. Retaining ephemeral private keys beyond their immediate use negates the forward secrecy benefit.
- The ephemeral public key is included in the encrypted message header (Sections 10, 11) so the recipient can reconstruct the shared secret. The ephemeral public key is not secret.
- Implementations MUST NOT reuse ephemeral key pairs across multiple encryption operations. Each call to an encryption function MUST generate a new ephemeral key pair.
- Implementations MUST NOT derive ephemeral keys deterministically from the plaintext, recipient public key, or any other message-dependent value. Ephemeral keys MUST be independently random.

#### 16.4.1 Forward Secrecy

The use of ephemeral keys provides **forward secrecy** (also called perfect forward secrecy): if a recipient's long-term private key is compromised at some future time, an attacker who has recorded past ciphertexts cannot decrypt them, because the ephemeral private keys needed to reconstruct the shared secrets have been erased.

Forward secrecy holds only if:

1. Ephemeral private keys are generated from a CSPRNG (not derived from long-term keys).
2. Ephemeral private keys are securely erased after use.
3. The CSPRNG state at the time of key generation is not recoverable by the attacker.

Implementations SHOULD document their ephemeral key lifecycle to assure auditors that forward secrecy is maintained.

### 16.5 Side-Channel Resistance

Side-channel attacks exploit information leaked through implementation artifacts (timing, power consumption, cache access patterns, electromagnetic emissions) rather than through the cryptographic algorithm itself. DD-ECIES implementations SHOULD take the following precautions:

#### 16.5.1 Timing Attacks

- ECDSA signature generation and ECDH shared secret computation SHOULD use constant-time implementations of scalar multiplication and modular arithmetic. Variable-time implementations may leak the private key through timing measurements.
- Implementations SHOULD use well-audited cryptographic libraries (e.g., `@noble/secp256k1`, `libsecp256k1`, OpenSSL, BoringSSL) that provide constant-time guarantees for secp256k1 operations.
- AES-GCM implementations SHOULD use hardware-accelerated AES instructions (AES-NI on x86, ARMv8 Crypto Extensions) where available, as software AES table lookups are vulnerable to cache-timing attacks.
- Authentication tag comparison MUST use a constant-time comparison function (e.g., `crypto.timingSafeEqual` in Node.js, `CRYPTO_memcmp` in OpenSSL). Byte-by-byte comparison with early exit leaks information about the tag value.

#### 16.5.2 Memory Safety

- Implementations in memory-unsafe languages (C, C++, Rust with `unsafe`) MUST take care to avoid buffer overflows, use-after-free, and uninitialized memory reads in cryptographic code paths.
- Sensitive values (private keys, shared secrets, symmetric keys, plaintext) SHOULD be stored in memory regions that are locked against swapping to disk (e.g., `mlock` on POSIX systems).
- Implementations SHOULD overwrite sensitive buffers with zeros before deallocation. In garbage-collected languages, this may require using typed arrays or platform-specific secure memory APIs.

#### 16.5.3 Fault Attacks

- Implementations SHOULD verify the output of critical operations where feasible. For example, after computing a public key from a private key, verify that the public key lies on the curve. After ECDSA signing, verify the signature against the public key before returning it.
- These verification steps protect against fault injection attacks that could cause incorrect computations, potentially leaking private key material.

### 16.6 secp256k1 Curve Choice Implications

DD-ECIES uses the secp256k1 elliptic curve for all asymmetric operations. This section documents the security implications of this choice.

#### 16.6.1 Curve Security Level

secp256k1 provides approximately **128 bits of security** against the best-known classical attacks (Pollard's rho algorithm for the elliptic curve discrete logarithm problem). This security level is considered adequate for current applications but does not provide resistance against quantum computers running Shor's algorithm.

| Property | Value |
|----------|-------|
| Field size | 256 bits |
| Classical security level | ~128 bits |
| Quantum security level | ~0 bits (vulnerable to Shor's algorithm) |
| Curve structure | Koblitz curve (*a* = 0, *b* = 7) |
| Cofactor | 1 (prime-order group) |

#### 16.6.2 Comparison with NIST P-256

secp256k1 and NIST P-256 (secp256r1) both provide ~128 bits of classical security. The key differences relevant to DD-ECIES are:

| Aspect | secp256k1 | NIST P-256 |
|--------|-----------|------------|
| Origin | Certicom/SEC, deterministic parameters | NIST, parameters from unexplained seed |
| Adoption | Bitcoin, Ethereum, cryptocurrency ecosystem | TLS, X.509, government standards |
| Endomorphism | GLV endomorphism available (faster scalar multiplication) | No efficient endomorphism |
| Parameter transparency | Fully verifiable (Koblitz curve, *a* = 0) | Seed origin not publicly explained |
| Hardware support | Limited (primarily software implementations) | Broad (hardware security modules, secure enclaves) |

DD-ECIES chose secp256k1 for its parameter transparency, its wide adoption in the cryptocurrency ecosystem (enabling interoperability with Bitcoin and Ethereum key infrastructure), and the availability of the GLV endomorphism for efficient implementation.

Implementations SHOULD be aware that secp256k1 has less hardware support than P-256. In environments where hardware security modules (HSMs) or secure enclaves are required, P-256 may be more practical. DD-ECIES does not support P-256; a separate algorithm suite would be needed.

#### 16.6.3 Quantum Computing Considerations

All elliptic curve cryptography, including secp256k1, is vulnerable to quantum computers running Shor's algorithm. A sufficiently large quantum computer could solve the elliptic curve discrete logarithm problem in polynomial time, breaking ECDH key agreement and ECDSA signatures.

- DD-ECIES does NOT provide post-quantum security.
- Implementations SHOULD monitor developments in post-quantum cryptography (PQC) and be prepared to migrate to quantum-resistant algorithms when standardized alternatives become available (e.g., NIST PQC standards such as ML-KEM for key encapsulation).
- The DD-ECIES cipher suite registry (Section 17) is designed to accommodate future algorithm suites, including potential post-quantum suites, without modifying the core protocol.

### 16.7 Additional Security Requirements

#### 16.7.1 Authentication Tag Verification

AES-GCM authentication tag verification MUST be performed before any decrypted plaintext is returned to the caller or acted upon. If the authentication tag does not match, the implementation MUST reject the message and MUST NOT return any portion of the decrypted plaintext.

- Implementations MUST NOT expose partial decryption results for messages that fail authentication.
- The authentication tag comparison MUST be performed in constant time (see Section 16.5.1).

#### 16.7.2 Error Message Confidentiality

Error messages produced during decryption SHOULD NOT reveal information that could help an attacker distinguish between different failure modes (e.g., padding oracle attacks). While AES-GCM is not vulnerable to classical padding oracle attacks, implementations SHOULD use generic error messages for decryption failures:

- RECOMMENDED: "Decryption failed: authentication tag verification failed."
- NOT RECOMMENDED: Separate error messages for "wrong key", "corrupted ciphertext", "invalid IV length", etc., when these could be triggered by an attacker manipulating ciphertext.

Parsing errors (invalid version, cipher suite, or encryption type) MAY use descriptive error messages as specified in Section 17.4, since these fields are not encrypted and do not reveal information about the key or plaintext.

#### 16.7.3 Denial of Service Considerations

Implementations SHOULD impose reasonable limits on input sizes to prevent denial-of-service attacks:

- The recipient count in multi-recipient mode (Section 11) is limited to 65535 by the 2-byte field size. Implementations MAY impose a lower application-specific limit.
- Implementations SHOULD validate the data length field (in WithLength and Multiple modes) against the actual ciphertext length before attempting decryption.
- Implementations SHOULD set timeouts or resource limits for Paillier key generation (Section 15), which is computationally expensive due to the 3072-bit prime generation.

### 16.8 Summary of Normative Security Requirements

The following table consolidates all MUST-level security requirements from this section:

| Requirement | Section | Description |
|-------------|---------|-------------|
| CSPRNG for all random values | 16.1 | All IVs, ephemeral keys, symmetric keys, salts, and mnemonic entropy MUST be generated from a CSPRNG |
| Reject zero private keys | 16.2.1 | Private keys with value zero MUST be rejected |
| Reject out-of-range private keys | 16.2.1 | Private keys with value ≥ *n* (secp256k1 curve order) MUST be rejected |
| Validate public keys on curve | 16.2.2 | Public keys MUST be validated to lie on the secp256k1 curve before use in any cryptographic operation |
| No IV reuse | 16.3 | The same IV MUST NOT be used with the same symmetric key for two different encryptions |
| Fresh ephemeral keys | 16.4 | Each encryption operation MUST generate a new ephemeral key pair from a CSPRNG |
| Erase ephemeral private keys | 16.4 | Ephemeral private keys MUST be securely erased after ECDH computation |
| Constant-time tag comparison | 16.5.1 | Authentication tag comparison MUST use a constant-time function |
| Verify tag before returning plaintext | 16.7.1 | Decrypted plaintext MUST NOT be returned if the authentication tag verification fails |

---

## 17. IANA-Style Registries

This section defines the registries for protocol version numbers, cipher suite identifiers, and encryption type codes used in DD-ECIES wire format headers. Each registry assigns numeric byte values to named entries. Implementations MUST validate these fields during message parsing and MUST reject messages containing unrecognized values.

**Source:** The registry values are defined in the reference implementation by the enumerations `EciesVersionEnum`, `EciesCipherSuiteEnum`, and `EciesEncryptionTypeEnum`.

### 17.1 Version Registry

The Version Registry defines the protocol version byte that appears at byte offset 0 of every DD-ECIES encrypted message header (see Section 12, Message Framing and Wire Format).

| Version Name | Byte Value | Decimal | Description |
|-------------|------------|---------|-------------|
| V1 | `0x01` | 1 | Version 1 of the DD-ECIES protocol. This is the current and only defined version. |

- The version field MUST be exactly 1 byte.
- Implementations MUST set the version field to `0x01` when producing DD-ECIES messages.
- Values `0x00` and `0x02`–`0xFF` are reserved for future use and MUST NOT be used.

**Source:** `EciesVersionEnum.V1 = 1` (file: `enumerations/ecies-version.ts`)

### 17.2 Cipher Suite Registry

The Cipher Suite Registry defines the cipher suite byte that appears at byte offset 1 of every DD-ECIES encrypted message header. Each cipher suite specifies the complete set of cryptographic algorithms used for key agreement, key derivation, symmetric encryption, and hashing.

| Cipher Suite Name | Byte Value | Decimal | Curve | KDF | Symmetric Cipher | Hash |
|-------------------|------------|---------|-------|-----|------------------|------|
| `Secp256k1_Aes256Gcm_Sha256` | `0x01` | 1 | secp256k1 (SEC 2 §2.4.1) | HKDF-SHA256 (RFC 5869) | AES-256-GCM (NIST SP 800-38D) | SHA-256 (FIPS 180-4) |

- The cipher suite field MUST be exactly 1 byte.
- Implementations MUST set the cipher suite field to `0x01` when producing DD-ECIES messages.
- Values `0x00` and `0x02`–`0xFF` are reserved for future cipher suite registrations and MUST NOT be used.
- Future cipher suites MAY be registered by assigning an unused byte value and specifying the complete set of algorithms (curve, KDF, symmetric cipher, hash). Existing cipher suite values MUST NOT be reassigned.

**Source:** `EciesCipherSuiteEnum.Secp256k1_Aes256Gcm_Sha256 = 1` (file: `enumerations/ecies-cipher-suite.ts`)

### 17.3 Encryption Type Registry

The Encryption Type Registry defines the encryption type byte that appears at byte offset 2 of every DD-ECIES encrypted message header. The encryption type determines the message framing mode and wire format layout (see Section 10, Section 11, and Section 12).

| Encryption Type Name | Byte Value | Decimal | Description | Wire Format Reference |
|---------------------|------------|---------|-------------|-----------------------|
| Basic | `0x21` | 33 | Single-recipient encryption without a data length prefix. The simplest framing mode. | Section 10.2 |
| WithLength | `0x42` | 66 | Single-recipient encryption with an 8-byte big-endian data length field after the authentication tag. | Section 10.3 |
| Multiple | `0x63` | 99 | Multi-recipient encryption using key encapsulation. A single random symmetric key is encrypted individually for each recipient. | Section 11 |

- The encryption type field MUST be exactly 1 byte.
- Implementations MUST set the encryption type field to one of the three registered values (`0x21`, `0x42`, or `0x63`) when producing DD-ECIES messages.
- All other byte values (`0x00`–`0x20`, `0x22`–`0x41`, `0x43`–`0x62`, `0x64`–`0xFF`) are reserved and MUST NOT be used.
- The string-to-enum mapping is: `'basic'` → `0x21`, `'withLength'` → `0x42`, `'multiple'` → `0x63`.

**Source:** `EciesEncryptionTypeEnum` — `Basic = 33`, `WithLength = 66`, `Multiple = 99` (file: `enumerations/ecies-encryption-type.ts`)

### 17.4 Handling of Unrecognized Registry Values

When parsing a DD-ECIES encrypted message, an implementation MUST validate the version, cipher suite, and encryption type fields against their respective registries. If any field contains an unrecognized value, the implementation MUST reject the message immediately with a descriptive error. Silent acceptance or best-effort processing of unrecognized values is NOT permitted.

The following table specifies the required behavior for each registry field:

| Field | Valid Values | Error Condition | Required Behavior |
|-------|-------------|-----------------|-------------------|
| Version | `0x01` | Any value other than `0x01` | MUST reject with an error indicating the unrecognized version byte and its value |
| Cipher Suite | `0x01` | Any value other than `0x01` | MUST reject with an error indicating the unrecognized cipher suite byte and its value |
| Encryption Type | `0x21`, `0x42`, `0x63` | Any value not in {`0x21`, `0x42`, `0x63`} | MUST reject with an error indicating the unrecognized encryption type byte and its value |

Error messages SHOULD include:

1. The name of the field that failed validation (e.g., "version", "cipher suite", or "encryption type").
2. The actual byte value encountered (in hexadecimal).
3. The set of valid values for that field.

**Example error messages:**

- `"Unrecognized DD-ECIES version: 0x02. Expected: 0x01."`
- `"Unrecognized DD-ECIES cipher suite: 0x00. Expected: 0x01."`
- `"Unrecognized DD-ECIES encryption type: 0x10. Expected one of: 0x21 (Basic), 0x42 (WithLength), 0x63 (Multiple)."`

Implementations MUST NOT attempt to decrypt or process any portion of a message that fails registry validation. The rejection MUST occur before any cryptographic operations (ECDH, HKDF, AES-GCM decryption) are performed.

### 17.5 Registry Summary

The following consolidated table lists all registered values across the three registries:

| Registry | Name | Byte Value | Decimal | Hex |
|----------|------|------------|---------|-----|
| Version | V1 | `0x01` | 1 | `01` |
| Cipher Suite | Secp256k1_Aes256Gcm_Sha256 | `0x01` | 1 | `01` |
| Encryption Type | Basic | `0x21` | 33 | `21` |
| Encryption Type | WithLength | `0x42` | 66 | `42` |
| Encryption Type | Multiple | `0x63` | 99 | `63` |

### 17.6 Extensibility

New entries MAY be added to any registry in future versions of this specification. The following rules govern registry extensibility:

- New version numbers MUST be assigned sequentially starting from `0x02`.
- New cipher suite identifiers SHOULD be assigned sequentially starting from `0x02`, but MAY use non-sequential values if needed to avoid conflicts with other protocols.
- New encryption type identifiers SHOULD use values that do not collide with existing entries. The current values (`0x21`, `0x42`, `0x63`) were chosen to be visually distinct in hexadecimal dumps.
- Existing registry entries MUST NOT be removed or reassigned. Deprecation of an entry SHOULD be indicated by a note in the registry table, but the byte value MUST remain reserved.
- Implementations SHOULD be designed to gracefully handle the addition of new registry entries by rejecting unrecognized values (as specified in Section 17.4) rather than by hardcoding assumptions about the total number of valid entries.

---

## 18. Test Vectors

This appendix provides comprehensive test vectors for validating a DD-ECIES implementation. All random values (IVs, ephemeral keys) are provided as fixed inputs so that every output is fully deterministic and reproducible. These vectors were generated by running the reference `ecies-lib` implementation with the fixed inputs shown below.

A conforming implementation MUST produce byte-identical outputs for all test vectors in this section when given the same inputs.

### 18.1 Common Test Parameters

The following parameters are shared across multiple test vectors in this section and in earlier sections of this specification.

#### 18.1.1 Identity Key Pair (from Section 6.6)

Derived from the well-known BIP39 test mnemonic using the derivation path `m/44'/60'/0'/0/0`:

| Field | Value |
|-------|-------|
| Mnemonic | `abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art` |
| Private Key (32 bytes, hex) | `1053fae1b3ac64f178bcc21026fd06a3f4544ec2f35338b001f02d1d8efa3d5f` |
| Compressed Public Key (33 bytes, hex) | `02dc286c821c7490afbe20a79d13123b9f41f3d7ef21e4a9caacd22f5983b28eca` |

Full derivation details are in Section 6.6.

#### 18.1.2 Ephemeral Key Pair (from Section 8.4)

The ephemeral private key is derived deterministically as `SHA-256("DD-ECIES-ECDH-test-vector-ephemeral")`:

| Field | Value (hex) |
|-------|-------------|
| Ephemeral Private Key (32 bytes) | `bc4313f0c6e23ae0366e40d80387f49a2e4f64069dcb5a447f22dabefb79dc2f` |
| Ephemeral Public Key (33 bytes, compressed) | `02fbb6f2f3ee200f9cd9f33b86e7de3412eb9aee09f6b10709a595f5ede231494b` |

#### 18.1.3 Derived Symmetric Key (from Section 8.4)

Computed via ECDH + HKDF-SHA256 between the ephemeral and identity key pairs:

| Field | Value (hex) |
|-------|-------------|
| ECDH Shared Secret (32 bytes) | `0933f1546610b5bdbe4349b25b783d07fd5185b84b3efee2e92dc9bf2a034a11` |
| HKDF Info (UTF-8) | `ecies-v2-key-derivation` |
| HKDF Salt | (empty) |
| Derived Symmetric Key (32 bytes) | `7c4fd382f540c37c6bee1e9c24a5d15e8a7a8f474a4882f4c8606520f2b801ab` |

Full derivation details are in Section 8.4.

#### 18.1.4 Fixed IV

For deterministic reproducibility, the IV used in the AES-256-GCM, Basic mode, and WithLength mode test vectors is derived as the first 12 bytes of `SHA-256("DD-ECIES-AES-GCM-test-vector-iv")`:

| Field | Value (hex) |
|-------|-------------|
| SHA-256("DD-ECIES-AES-GCM-test-vector-iv") | `31fe1b062e5639622cfc0439f1f977a01ed98049aaa0fbd2d4fe9c464cb80c14` |
| Fixed IV (first 12 bytes) | `31fe1b062e5639622cfc0439` |

#### 18.1.5 Common Plaintext

| Field | Value |
|-------|-------|
| Plaintext (UTF-8) | `DD-ECIES test vector plaintext` |
| Plaintext (hex) | `44442d4543494553207465737420766563746f7220706c61696e74657874` |
| Plaintext Length | 30 bytes |

---

### 18.2 Test Vector: Mnemonic-to-Key Derivation

See Section 6.6 for the complete test vector. The mnemonic `abandon...art` (24 words) with empty passphrase and derivation path `m/44'/60'/0'/0/0` MUST produce:

| Field | Value (hex) |
|-------|-------------|
| Seed (64 bytes) | `408b285c123836004f4b8842c89324c1f01382450c0d439af345ba7fc49acf705489c6fc77dbd4e3dc1dd8cc6bc9f043db8ada1e243c4a0eafb290d399480840` |
| Private Key (32 bytes) | `1053fae1b3ac64f178bcc21026fd06a3f4544ec2f35338b001f02d1d8efa3d5f` |
| Compressed Public Key (33 bytes) | `02dc286c821c7490afbe20a79d13123b9f41f3d7ef21e4a9caacd22f5983b28eca` |

---

### 18.3 Test Vector: ECDSA Signing and Verification

See Section 7.6 for the complete test vector. Signing the message `DD-ECIES signature test vector` with the identity private key MUST produce:

| Field | Value (hex) |
|-------|-------------|
| Private Key (32 bytes) | `1053fae1b3ac64f178bcc21026fd06a3f4544ec2f35338b001f02d1d8efa3d5f` |
| Message (UTF-8) | `DD-ECIES signature test vector` |
| Message (hex) | `44442d4543494553207369676e6174757265207465737420766563746f72` |
| SHA-256 Hash (32 bytes) | `a1fc0896b3b1a9b1e0eaf1434a04d26e679a422a8d21a9104f458bb7bf6a2d2e` |
| Signature (64 bytes) | `6596fb18720a906b5b20eaaa259bfecaef35555208c15c61022216f373a306f90deb13d6cfd91e73b405a46a131fc98f13e410c1c89d3a960ee29f489da25e9d` |

Verification: `ECDSA-Verify(publicKey, hash, signature)` MUST return `true`.

---

### 18.4 Test Vector: ECDH Shared Secret and HKDF Key Derivation

See Section 8.4 for the complete test vector. Computing the ECDH shared secret between the ephemeral private key and the recipient public key, then deriving a symmetric key via HKDF-SHA256, MUST produce:

| Field | Value (hex) |
|-------|-------------|
| Ephemeral Private Key (32 bytes) | `bc4313f0c6e23ae0366e40d80387f49a2e4f64069dcb5a447f22dabefb79dc2f` |
| Recipient Public Key (33 bytes) | `02dc286c821c7490afbe20a79d13123b9f41f3d7ef21e4a9caacd22f5983b28eca` |
| Shared Secret (32 bytes) | `0933f1546610b5bdbe4349b25b783d07fd5185b84b3efee2e92dc9bf2a034a11` |
| HKDF Info (UTF-8) | `ecies-v2-key-derivation` |
| HKDF Info (hex) | `65636965732d76322d6b65792d64657269766174696f6e` |
| HKDF Salt | (empty) |
| Derived Symmetric Key (32 bytes) | `7c4fd382f540c37c6bee1e9c24a5d15e8a7a8f474a4882f4c8606520f2b801ab` |

---

### 18.5 Test Vector: AES-256-GCM Encrypt/Decrypt

This test vector validates standalone AES-256-GCM encryption using the derived symmetric key, fixed IV, and the AAD composition for Basic mode (used here as a representative AAD).

**Input:**

| Field | Value (hex) |
|-------|-------------|
| Key (32 bytes) | `7c4fd382f540c37c6bee1e9c24a5d15e8a7a8f474a4882f4c8606520f2b801ab` |
| IV (12 bytes) | `31fe1b062e5639622cfc0439` |
| Plaintext (30 bytes) | `44442d4543494553207465737420766563746f7220706c61696e74657874` |
| AAD | `01012102fbb6f2f3ee200f9cd9f33b86e7de3412eb9aee09f6b10709a595f5ede231494b` |

The AAD is composed as: `version(0x01) || cipherSuite(0x01) || type(0x21) || ephemeralPublicKey(33 bytes)` — the standard Basic mode AAD with no preamble.

**Output:**

| Field | Value (hex) |
|-------|-------------|
| Ciphertext (30 bytes) | `f3c70450f1ac074e93508eb3caed91a900ebc463d4eaa78c4c56389f36ee` |
| Auth Tag (16 bytes) | `e6dbf735d3ef9a4235d5513f9e8829ce` |

**Verification:** Decrypting the ciphertext with the same key, IV, AAD, and auth tag MUST produce the original plaintext. If the auth tag does not verify, decryption MUST fail.

---

### 18.6 Test Vector: Basic Mode (0x21) ECIES Encryption

This test vector validates the complete Basic mode ECIES encryption flow, from key agreement through wire format assembly.

**Input:**

| Field | Value (hex) |
|-------|-------------|
| Recipient Public Key (33 bytes) | `02dc286c821c7490afbe20a79d13123b9f41f3d7ef21e4a9caacd22f5983b28eca` |
| Ephemeral Private Key (32 bytes) | `bc4313f0c6e23ae0366e40d80387f49a2e4f64069dcb5a447f22dabefb79dc2f` |
| Ephemeral Public Key (33 bytes) | `02fbb6f2f3ee200f9cd9f33b86e7de3412eb9aee09f6b10709a595f5ede231494b` |
| Plaintext (UTF-8) | `DD-ECIES test vector plaintext` |
| Plaintext (hex, 30 bytes) | `44442d4543494553207465737420766563746f7220706c61696e74657874` |
| Fixed IV (12 bytes) | `31fe1b062e5639622cfc0439` |
| Preamble | (empty) |

**Intermediate Values:**

| Field | Value (hex) |
|-------|-------------|
| ECDH Shared Secret (32 bytes) | `0933f1546610b5bdbe4349b25b783d07fd5185b84b3efee2e92dc9bf2a034a11` |
| Derived Symmetric Key (32 bytes) | `7c4fd382f540c37c6bee1e9c24a5d15e8a7a8f474a4882f4c8606520f2b801ab` |
| AAD (36 bytes) | `01012102fbb6f2f3ee200f9cd9f33b86e7de3412eb9aee09f6b10709a595f5ede231494b` |

The AAD is: `version(0x01) || cipherSuite(0x01) || type(0x21) || ephemeralPublicKey(33 bytes)`.

**Output:**

| Field | Value (hex) |
|-------|-------------|
| Auth Tag (16 bytes) | `e6dbf735d3ef9a4235d5513f9e8829ce` |
| Ciphertext (30 bytes) | `f3c70450f1ac074e93508eb3caed91a900ebc463d4eaa78c4c56389f36ee` |

**Wire Format (94 bytes):**

```
01012102fbb6f2f3ee200f9cd9f33b86e7de3412eb9aee09f6b10709a595f5ede231494b
31fe1b062e5639622cfc0439e6dbf735d3ef9a4235d5513f9e8829cef3c70450f1ac074e
93508eb3caed91a900ebc463d4eaa78c4c56389f36ee
```

**Wire Format Field Breakdown:**

| Offset | Length | Field | Value (hex) |
|--------|--------|-------|-------------|
| 0 | 1 | Version | `01` |
| 1 | 1 | Cipher Suite | `01` |
| 2 | 1 | Encryption Type | `21` |
| 3 | 33 | Ephemeral Public Key | `02fbb6f2f3ee200f9cd9f33b86e7de3412eb9aee09f6b10709a595f5ede231494b` |
| 36 | 12 | IV | `31fe1b062e5639622cfc0439` |
| 48 | 16 | Auth Tag | `e6dbf735d3ef9a4235d5513f9e8829ce` |
| 64 | 30 | Ciphertext | `f3c70450f1ac074e93508eb3caed91a900ebc463d4eaa78c4c56389f36ee` |

**Total:** 64 bytes (fixed overhead) + 30 bytes (ciphertext) = 94 bytes.

**Verification:** Decrypting this wire format with the recipient's private key (`1053fae1b3ac64f178bcc21026fd06a3f4544ec2f35338b001f02d1d8efa3d5f`) MUST produce the original plaintext `DD-ECIES test vector plaintext`.

---

### 18.7 Test Vector: WithLength Mode (0x42) ECIES Encryption

This test vector validates the complete WithLength mode ECIES encryption flow. The same key material and plaintext as the Basic mode vector are used, but the encryption type byte changes to `0x42` and an 8-byte data length field is included.

**Input:**

| Field | Value (hex) |
|-------|-------------|
| Recipient Public Key (33 bytes) | `02dc286c821c7490afbe20a79d13123b9f41f3d7ef21e4a9caacd22f5983b28eca` |
| Ephemeral Private Key (32 bytes) | `bc4313f0c6e23ae0366e40d80387f49a2e4f64069dcb5a447f22dabefb79dc2f` |
| Ephemeral Public Key (33 bytes) | `02fbb6f2f3ee200f9cd9f33b86e7de3412eb9aee09f6b10709a595f5ede231494b` |
| Plaintext (UTF-8) | `DD-ECIES test vector plaintext` |
| Plaintext (hex, 30 bytes) | `44442d4543494553207465737420766563746f7220706c61696e74657874` |
| Fixed IV (12 bytes) | `31fe1b062e5639622cfc0439` |
| Preamble | (empty) |

**Intermediate Values:**

| Field | Value (hex) |
|-------|-------------|
| ECDH Shared Secret (32 bytes) | `0933f1546610b5bdbe4349b25b783d07fd5185b84b3efee2e92dc9bf2a034a11` |
| Derived Symmetric Key (32 bytes) | `7c4fd382f540c37c6bee1e9c24a5d15e8a7a8f474a4882f4c8606520f2b801ab` |
| AAD (36 bytes) | `01014202fbb6f2f3ee200f9cd9f33b86e7de3412eb9aee09f6b10709a595f5ede231494b` |

The AAD is: `version(0x01) || cipherSuite(0x01) || type(0x42) || ephemeralPublicKey(33 bytes)`. Note that the AAD uses the WithLength type byte (`0x42`) but does NOT include the data length field — this is identical in structure to Basic mode AAD.

**Output:**

| Field | Value (hex) |
|-------|-------------|
| Auth Tag (16 bytes) | `bff70cfe6ac4c0df708859336ef6763c` |
| Data Length (8 bytes, big-endian) | `000000000000001e` |
| Ciphertext (30 bytes) | `f3c70450f1ac074e93508eb3caed91a900ebc463d4eaa78c4c56389f36ee` |

The data length field encodes the plaintext length (30 = `0x1e`) as an 8-byte big-endian unsigned integer.

**Important:** The ciphertext is identical to the Basic mode vector because the same key, IV, and plaintext are used. However, the auth tag differs because the AAD contains a different type byte (`0x42` vs `0x21`).

**Wire Format (102 bytes):**

```
01014202fbb6f2f3ee200f9cd9f33b86e7de3412eb9aee09f6b10709a595f5ede231494b
31fe1b062e5639622cfc0439bff70cfe6ac4c0df708859336ef6763c000000000000001e
f3c70450f1ac074e93508eb3caed91a900ebc463d4eaa78c4c56389f36ee
```

**Wire Format Field Breakdown:**

| Offset | Length | Field | Value (hex) |
|--------|--------|-------|-------------|
| 0 | 1 | Version | `01` |
| 1 | 1 | Cipher Suite | `01` |
| 2 | 1 | Encryption Type | `42` |
| 3 | 33 | Ephemeral Public Key | `02fbb6f2f3ee200f9cd9f33b86e7de3412eb9aee09f6b10709a595f5ede231494b` |
| 36 | 12 | IV | `31fe1b062e5639622cfc0439` |
| 48 | 16 | Auth Tag | `bff70cfe6ac4c0df708859336ef6763c` |
| 64 | 8 | Data Length | `000000000000001e` |
| 72 | 30 | Ciphertext | `f3c70450f1ac074e93508eb3caed91a900ebc463d4eaa78c4c56389f36ee` |

**Total:** 72 bytes (fixed overhead) + 30 bytes (ciphertext) = 102 bytes.

**Verification:** Decrypting this wire format with the recipient's private key (`1053fae1b3ac64f178bcc21026fd06a3f4544ec2f35338b001f02d1d8efa3d5f`) MUST produce the original plaintext `DD-ECIES test vector plaintext`. The decoded data length field MUST equal 30 (the plaintext length).

---

### 18.8 Test Vector Summary

The following table summarizes all test vectors and their locations in this specification:

| Vector | Operation | Section |
|--------|-----------|---------|
| 18.2 | Mnemonic-to-Key Derivation (BIP39/BIP32/BIP44) | Also in Section 6.6 |
| 18.3 | ECDSA Signing and Verification (RFC 6979) | Also in Section 7.6 |
| 18.4 | ECDH Shared Secret + HKDF-SHA256 Key Derivation | Also in Section 8.4 |
| 18.5 | AES-256-GCM Encrypt/Decrypt (standalone) | This section only |
| 18.6 | Basic Mode (0x21) ECIES — full encrypt/decrypt | This section only |
| 18.7 | WithLength Mode (0x42) ECIES — full encrypt/decrypt | This section only |

### 18.9 Reproducibility Notes

All test vectors in this section are fully deterministic. To reproduce them:

1. **Identity key pair**: Derive from the `abandon...art` mnemonic using BIP39 (no passphrase) → BIP32/BIP44 path `m/44'/60'/0'/0/0`.
2. **Ephemeral key pair**: Compute `SHA-256("DD-ECIES-ECDH-test-vector-ephemeral")` to obtain the ephemeral private key. Derive the compressed public key from it.
3. **Fixed IV**: Compute `SHA-256("DD-ECIES-AES-GCM-test-vector-iv")` and take the first 12 bytes.
4. **Shared secret and symmetric key**: Follow the ECDH + HKDF procedure in Section 8 with the ephemeral and identity key pairs.
5. **AES-256-GCM encryption**: Use the derived symmetric key, fixed IV, and the appropriate AAD for the encryption mode.

No random values are used in any test vector. All "random" inputs (ephemeral keys, IVs) are derived deterministically from fixed seed strings using SHA-256.

---

## 19. References

This section lists the normative and informative references cited throughout this specification. Normative references are required for conforming implementations. Informative references provide additional context and background.

### 19.1 Normative References

- **[SEC2]** Certicom Research, "SEC 2: Recommended Elliptic Curve Domain Parameters," Version 2.0, Standards for Efficient Cryptography Group, January 2010. Available at: https://www.secg.org/sec2-v2.pdf
  *Defines the secp256k1 elliptic curve parameters used by DD-ECIES (Section 2.4.1).*

- **[RFC5869]** H. Krawczyk and P. Eronen, "HMAC-based Extract-and-Expand Key Derivation Function (HKDF)," RFC 5869, Internet Engineering Task Force, May 2010. Available at: https://www.rfc-editor.org/rfc/rfc5869
  *Specifies the HKDF construction used by DD-ECIES for symmetric key derivation from ECDH shared secrets (HKDF-SHA256).*

- **[RFC6979]** T. Pornin, "Deterministic Usage of the Digital Signature Algorithm (DSA) and Elliptic Curve Digital Signature Algorithm (ECDSA)," RFC 6979, Internet Engineering Task Force, August 2013. Available at: https://www.rfc-editor.org/rfc/rfc6979
  *Specifies deterministic nonce generation for ECDSA signatures, eliminating the risk of private key leakage from nonce reuse.*

- **[BIP39]** M. Palatinus, P. Rusnak, A. Voisine, and S. Bowe, "Mnemonic code for generating deterministic keys," Bitcoin Improvement Proposal 39, September 2013. Available at: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
  *Specifies the mnemonic phrase encoding used by DD-ECIES for key generation (256-bit entropy, English wordlist, 24 words).*

- **[BIP32]** P. Wuille, "Hierarchical Deterministic Wallets," Bitcoin Improvement Proposal 32, February 2012. Available at: https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki
  *Specifies the hierarchical deterministic key derivation used by DD-ECIES to derive child keys from a master seed.*

- **[BIP44]** M. Palatinus and P. Rusnak, "Multi-Account Hierarchy for Deterministic Wallets," Bitcoin Improvement Proposal 44, April 2014. Available at: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
  *Specifies the multi-account derivation path structure used by DD-ECIES (`m/44'/60'/0'/0/0`).*

- **[NIST-SP-800-38D]** M. Dworkin, "Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC," NIST Special Publication 800-38D, National Institute of Standards and Technology, November 2007. Available at: https://csrc.nist.gov/pubs/sp/800/38/d/final
  *Specifies the AES-GCM authenticated encryption mode used by DD-ECIES with 256-bit keys, 12-byte IVs, and 16-byte authentication tags.*

- **[FIPS180-4]** National Institute of Standards and Technology, "Secure Hash Standard (SHS)," FIPS PUB 180-4, August 2015. Available at: https://csrc.nist.gov/pubs/fips/180-4/upd1/final
  *Specifies the SHA-256 and SHA-512 hash functions used by DD-ECIES for message digests, HKDF, PBKDF2, and HMAC constructions.*

- **[FIPS202]** National Institute of Standards and Technology, "SHA-3 Standard: Permutation-Based Hash and Extendable-Output Functions," FIPS PUB 202, August 2015. Available at: https://csrc.nist.gov/pubs/fips/202/final
  *Specifies the SHA3-512 hash function used by DD-ECIES for checksum operations (64-byte digest, lowercase hexadecimal encoding).*

- **[RFC2119]** S. Bradner, "Key words for use in RFCs to Indicate Requirement Levels," RFC 2119, Internet Engineering Task Force, March 1997. Available at: https://www.rfc-editor.org/rfc/rfc2119
  *Defines the normative key words (MUST, SHALL, SHOULD, MAY, etc.) used throughout this specification.*

### 19.2 Informative References

- **[SEC1]** Certicom Research, "SEC 1: Elliptic Curve Cryptography," Version 2.0, Standards for Efficient Cryptography Group, May 2009. Available at: https://www.secg.org/sec1-v2.pdf
  *Provides general background on elliptic curve cryptography, including ECDH key agreement and ECIES encryption schemes.*

- **[FIPS197]** National Institute of Standards and Technology, "Advanced Encryption Standard (AES)," FIPS PUB 197, November 2001. Available at: https://csrc.nist.gov/pubs/fips/197/final
  *Specifies the AES block cipher underlying AES-256-GCM.*

- **[FIPS186-4]** National Institute of Standards and Technology, "Digital Signature Standard (DSS)," FIPS PUB 186-4, July 2013. Available at: https://csrc.nist.gov/pubs/fips/186-4/final
  *Specifies the ECDSA digital signature algorithm used by DD-ECIES over secp256k1.*

- **[NIST-SP-800-90A]** E. Barker and J. Kelsey, "Recommendation for Random Number Generation Using Deterministic Random Bit Generators," NIST Special Publication 800-90A Revision 1, National Institute of Standards and Technology, June 2015. Available at: https://csrc.nist.gov/pubs/sp/800/90/a/r1/final
  *Specifies the HMAC-DRBG construction used in the DD-ECIES voting subsystem for deterministic prime generation.*

- **[NIST-SP-800-132]** M. Turan, E. Barker, W. Burr, and L. Chen, "Recommendation for Password-Based Key Derivation, Part 1: Storage Applications," NIST Special Publication 800-132, National Institute of Standards and Technology, December 2010. Available at: https://csrc.nist.gov/pubs/sp/800/132/final
  *Provides guidance on PBKDF2 parameter selection relevant to the DD-ECIES password hashing profiles.*

- **[RFC8017]** K. Moriarty, B. Kaliski, J. Jonsson, and A. Rusch, "PKCS #1: RSA Cryptography Specifications Version 2.2," RFC 8017, Internet Engineering Task Force, November 2016. Available at: https://www.rfc-editor.org/rfc/rfc8017
  *Provides background on the Paillier cryptosystem's relationship to RSA-family schemes, relevant to the voting subsystem.*

- **[Paillier99]** P. Paillier, "Public-Key Cryptosystems Based on Composite Degree Residuosity Classes," in Advances in Cryptology — EUROCRYPT '99, Lecture Notes in Computer Science, vol. 1592, pp. 223–238, Springer, 1999.
  *The original paper defining the Paillier homomorphic encryption scheme used in the DD-ECIES voting subsystem.*

- **[SLIP44]** SatoshiLabs, "Registered coin types for BIP-0044," SLIP-0044. Available at: https://github.com/satoshilabs/slips/blob/master/slip-0044.md
  *Defines the coin type registry for BIP44 derivation paths. DD-ECIES uses coin type 60 (Ethereum).*

- **[RFC8439]** Y. Nir and A. Langley, "ChaCha20 and Poly1305 for IETF Protocols," RFC 8439, Internet Engineering Task Force, June 2018. Available at: https://www.rfc-editor.org/rfc/rfc8439
  *Provides background on AEAD construction patterns relevant to understanding AES-GCM usage in DD-ECIES.*
