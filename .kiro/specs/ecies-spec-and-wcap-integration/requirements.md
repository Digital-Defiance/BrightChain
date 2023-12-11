# Requirements Document

## Introduction

This document specifies the requirements for two related deliverables:

1. **DD-ECIES Specification** — A formal, language-agnostic specification document for the Digital Defiance ECIES (Elliptic Curve Integrated Encryption Scheme) library. The specification formalizes the existing `ecies-lib` implementation so that a developer could build a compatible implementation in any language without reading the TypeScript source.

2. **WCAP Algorithm Suite Registration** — Updates to the existing Web Content Authenticity Protocol (WCAP) specification to support pluggable algorithm suites (modeled after TLS cipher suites), with the DD-ECIES suite registered as the first non-default suite alongside the existing ECDSA-P256-SHA256 default.

Digital Defiance is the owner and publisher of the ECIES library. BrightChain is a consumer of this library, not the owner of the specification.

## Glossary

- **DD-ECIES**: Digital Defiance Elliptic Curve Integrated Encryption Scheme — the cryptographic protocol suite specified in this document.
- **Spec_Document**: The formal DD-ECIES specification document to be authored as a Markdown file.
- **WCAP_Spec**: The existing Web Content Authenticity Protocol specification document at `WCAP/Web Content Authenticity Protocol (WCAP).md`.
- **Algorithm_Suite**: A named combination of cryptographic algorithms (curve, KDF, symmetric cipher, hash) that WCAP signers and verifiers negotiate, analogous to a TLS cipher suite.
- **Cipher_Suite_Identifier**: A short string token identifying an Algorithm_Suite in the WCAP `Content-Signature` header's `alg` parameter (e.g., `ecdsa-p256-sha256`, `dd-ecies-secp256k1-sha256`).
- **ECIES**: Elliptic Curve Integrated Encryption Scheme — a hybrid encryption scheme combining ECDH key agreement with symmetric encryption.
- **secp256k1**: The elliptic curve used by DD-ECIES, defined in SEC 2 (Standards for Efficient Cryptography).
- **HKDF**: HMAC-based Key Derivation Function (RFC 5869).
- **AES-256-GCM**: Advanced Encryption Standard with 256-bit keys in Galois/Counter Mode, providing authenticated encryption with associated data (AEAD).
- **BIP39**: Bitcoin Improvement Proposal 39 — mnemonic code for generating deterministic keys.
- **BIP32**: Bitcoin Improvement Proposal 32 — hierarchical deterministic wallets.
- **BIP44**: Bitcoin Improvement Proposal 44 — multi-account hierarchy for deterministic wallets.
- **Paillier_Encryption**: A probabilistic asymmetric encryption scheme with additive homomorphic properties, used in the DD-ECIES voting subsystem.
- **Encryption_Type**: One of three message framing modes: Basic (0x21), WithLength (0x42), or Multiple (0x63).
- **Ephemeral_Key_Pair**: A one-time-use secp256k1 key pair generated per encryption operation.
- **AAD**: Additional Authenticated Data — data authenticated but not encrypted by AES-GCM.
- **DRBG**: Deterministic Random Bit Generator — used in the voting subsystem for reproducible prime generation.

## Requirements

### Requirement 1: DD-ECIES Specification Document Structure

**User Story:** As a cryptographic library implementer, I want a well-structured specification document with clearly delineated sections, so that I can navigate and implement each subsystem independently.

#### Acceptance Criteria

1. THE Spec_Document SHALL contain the following top-level sections in order: Abstract, Introduction, Terminology, Notation, Elliptic Curve Parameters, Key Management, Signature Scheme, Symmetric Encryption, ECIES Encryption (Single Recipient), ECIES Encryption (Multi-Recipient), Message Framing and Wire Format, Checksum Operations, PBKDF2 Password Hashing Profiles, Voting Subsystem (Paillier), Security Considerations, IANA-Style Registries, and References.
2. THE Spec_Document SHALL use RFC 2119 key words (MUST, SHALL, SHOULD, MAY) consistently throughout all normative sections.
3. THE Spec_Document SHALL be authored as a Markdown file located at `express-suite/packages/digitaldefiance-ecies-lib/docs/DD-ECIES-SPECIFICATION.md` (canonical location within the ecies-lib package).
4. THE Spec_Document SHALL include a version number and draft status in its header metadata.
5. A copy of the Spec_Document SHALL be placed at `docs/DD-ECIES-SPECIFICATION.md` (BrightChain project-level docs) with a header note indicating it is a copy and referencing the canonical location.
6. THE ecies-lib README at `express-suite/packages/digitaldefiance-ecies-lib/README.md` SHALL include a prominent link to the Spec_Document with a brief description of what it covers.

### Requirement 2: Elliptic Curve Parameters

**User Story:** As a cryptographic library implementer, I want the exact elliptic curve parameters specified, so that I can reproduce the same key generation and point arithmetic.

#### Acceptance Criteria

1. THE Spec_Document SHALL specify secp256k1 as the mandatory elliptic curve, referencing SEC 2 section 2.4.1.
2. THE Spec_Document SHALL specify that public keys MUST use the 33-byte compressed format with a 0x02 or 0x03 prefix byte.
3. THE Spec_Document SHALL specify that private keys MUST be 32-byte scalars in the range [1, n-1] where n is the secp256k1 curve order.
4. THE Spec_Document SHALL specify that implementations MUST accept 65-byte uncompressed public keys (0x04 prefix) and 64-byte raw public keys (no prefix) for backward compatibility, normalizing them internally.
5. THE Spec_Document SHALL specify the secp256k1 curve order value explicitly as `0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141`.

### Requirement 3: Key Derivation from Mnemonics

**User Story:** As a cryptographic library implementer, I want the key derivation path from mnemonic phrases fully specified, so that I can derive identical key pairs from the same mnemonic across implementations.

#### Acceptance Criteria

1. THE Spec_Document SHALL specify that mnemonic phrases MUST conform to BIP39 using the English wordlist with 256-bit entropy (24 words).
2. THE Spec_Document SHALL specify that the mnemonic-to-seed conversion MUST use the BIP39 `mnemonicToSeed` function with no passphrase (empty string).
3. THE Spec_Document SHALL specify that the HD key derivation path MUST be `m/44'/60'/0'/0/0` following BIP32/BIP44.
4. THE Spec_Document SHALL specify that the derived private key MUST be used to compute a compressed secp256k1 public key.
5. THE Spec_Document SHALL include at least one test vector consisting of a mnemonic phrase, the derived private key (hex), and the derived compressed public key (hex).

### Requirement 4: ECDSA Signature Scheme

**User Story:** As a cryptographic library implementer, I want the signature scheme fully specified including the hash function, deterministic nonce generation, and output format, so that I can produce and verify compatible signatures.

#### Acceptance Criteria

1. THE Spec_Document SHALL specify that signatures MUST use ECDSA over secp256k1 with SHA-256 as the message digest.
2. THE Spec_Document SHALL specify that signature nonce generation MUST be deterministic per RFC 6979.
3. THE Spec_Document SHALL specify that signatures MUST be encoded in 64-byte compact format as the concatenation `r(32 bytes) || s(32 bytes)` with no DER encoding.
4. THE Spec_Document SHALL specify that the signing process MUST compute `hash = SHA-256(message)` and then sign the hash (not the raw message).
5. THE Spec_Document SHALL specify that verification MUST accept the 64-byte compact signature format and parse it into (r, s) components before verification.
6. THE Spec_Document SHALL include at least one test vector consisting of a private key, a message, and the expected 64-byte signature (hex).

### Requirement 5: ECDH Shared Secret and Key Derivation

**User Story:** As a cryptographic library implementer, I want the shared secret computation and symmetric key derivation fully specified, so that I can derive identical symmetric keys for encryption.

#### Acceptance Criteria

1. THE Spec_Document SHALL specify that ECDH shared secret computation MUST use the x-coordinate of the shared point (first 32 bytes after the 0x04 prefix of the uncompressed shared point).
2. THE Spec_Document SHALL specify that symmetric key derivation MUST use HKDF-SHA256 (RFC 5869) with an empty salt, the info string `ecies-v2-key-derivation` encoded as UTF-8, and an output length of 32 bytes.
3. THE Spec_Document SHALL include at least one test vector consisting of an ephemeral private key, a recipient public key, the computed shared secret (hex), and the derived symmetric key (hex).

### Requirement 6: AES-256-GCM Symmetric Encryption

**User Story:** As a cryptographic library implementer, I want the symmetric encryption parameters fully specified, so that I can encrypt and decrypt data compatibly.

#### Acceptance Criteria

1. THE Spec_Document SHALL specify that symmetric encryption MUST use AES-256-GCM with a 256-bit key.
2. THE Spec_Document SHALL specify that the initialization vector (IV) MUST be 12 bytes generated from a cryptographically secure random source.
3. THE Spec_Document SHALL specify that the authentication tag MUST be 16 bytes (128 bits).
4. THE Spec_Document SHALL specify that Additional Authenticated Data (AAD) MUST be provided when encrypting ECIES messages, and SHALL define the AAD composition for each Encryption_Type.
5. THE Spec_Document SHALL specify that the encrypted output MUST separate the ciphertext and authentication tag (tag is not appended to ciphertext in the wire format).

### Requirement 7: Single-Recipient ECIES Encryption (Basic Mode)

**User Story:** As a cryptographic library implementer, I want the Basic encryption mode wire format fully specified byte-by-byte, so that I can produce and parse compatible encrypted messages.

#### Acceptance Criteria

1. THE Spec_Document SHALL specify that Basic mode (type byte 0x21) encrypts a message for a single recipient without a data length prefix.
2. THE Spec_Document SHALL specify the Basic mode wire format as: `[preamble] || version(1) || cipherSuite(1) || type(1) || ephemeralPublicKey(33) || iv(12) || authTag(16) || ciphertext(variable)`.
3. THE Spec_Document SHALL specify that the AAD for Basic mode MUST be the concatenation: `preamble || version || cipherSuite || type || ephemeralPublicKey`.
4. THE Spec_Document SHALL specify that the fixed overhead for Basic mode is 64 bytes (1+1+1+33+12+16) excluding any preamble.
5. WHEN a preamble is provided, THE Spec_Document SHALL specify that the preamble MUST be prepended to the wire format and included in the AAD.

### Requirement 8: Single-Recipient ECIES Encryption (WithLength Mode)

**User Story:** As a cryptographic library implementer, I want the WithLength encryption mode wire format fully specified, so that I can parse messages that include an explicit plaintext length.

#### Acceptance Criteria

1. THE Spec_Document SHALL specify that WithLength mode (type byte 0x42) extends Basic mode by inserting an 8-byte big-endian unsigned integer representing the original plaintext length after the authentication tag.
2. THE Spec_Document SHALL specify the WithLength mode wire format as: `[preamble] || version(1) || cipherSuite(1) || type(1) || ephemeralPublicKey(33) || iv(12) || authTag(16) || dataLength(8) || ciphertext(variable)`.
3. THE Spec_Document SHALL specify that the fixed overhead for WithLength mode is 72 bytes (64 + 8) excluding any preamble.
4. THE Spec_Document SHALL specify that the AAD for WithLength mode MUST be identical to Basic mode AAD (the data length field is NOT included in the AAD).

### Requirement 9: Multi-Recipient ECIES Encryption

**User Story:** As a cryptographic library implementer, I want the multi-recipient encryption scheme fully specified, so that I can encrypt a single message for up to 65535 recipients efficiently.

#### Acceptance Criteria

1. THE Spec_Document SHALL specify that multi-recipient mode (type byte 0x63) encrypts a message with a single random symmetric key, then encrypts that symmetric key individually for each recipient using ECIES key encapsulation with a shared Ephemeral_Key_Pair.
2. THE Spec_Document SHALL specify the multi-recipient header wire format as: `version(1) || cipherSuite(1) || type(1) || ephemeralPublicKey(33) || dataLength(8) || recipientCount(2) || recipientIds(recipientIdSize * count) || encryptedKeys(60 * count)`.
3. THE Spec_Document SHALL specify that the dataLength field encodes the recipient ID size in the most significant byte (bits 63-56) and the plaintext data length in the lower 56 bits, stored as a big-endian 64-bit unsigned integer.
4. THE Spec_Document SHALL specify that each encrypted key block is 60 bytes: `iv(12) || authTag(16) || encryptedSymKey(32)`.
5. THE Spec_Document SHALL specify that the recipient count MUST be stored as a 2-byte big-endian unsigned integer with a maximum value of 65535.
6. THE Spec_Document SHALL specify that the message ciphertext MUST be stored as: `[preamble] || iv(12) || authTag(16) || ciphertext(variable)`, appended after the header.
7. THE Spec_Document SHALL specify that the complete header bytes MUST be used as AAD when encrypting the message with the symmetric key.
8. THE Spec_Document SHALL specify that each recipient's ID bytes MUST be used as AAD when encrypting the symmetric key for that recipient.

### Requirement 10: Version and Cipher Suite Registry

**User Story:** As a cryptographic library implementer, I want a formal registry of version numbers and cipher suite identifiers, so that I can correctly parse and validate message headers.

#### Acceptance Criteria

1. THE Spec_Document SHALL define a Version Registry with the initial entry: Version 1 = 0x01.
2. THE Spec_Document SHALL define a Cipher Suite Registry with the initial entry: `Secp256k1_Aes256Gcm_Sha256` = 0x01, specifying the curve, KDF, symmetric algorithm, and hash.
3. THE Spec_Document SHALL define an Encryption Type Registry with entries: Basic = 0x21, WithLength = 0x42, Multiple = 0x63.
4. IF a parser encounters an unrecognized version, cipher suite, or encryption type value, THEN THE parser SHALL reject the message with a descriptive error.

### Requirement 11: Checksum Operations

**User Story:** As a cryptographic library implementer, I want the checksum algorithm specified, so that I can compute compatible integrity checksums.

#### Acceptance Criteria

1. THE Spec_Document SHALL specify that checksums MUST use SHA3-512, producing a 64-byte (512-bit) digest.
2. THE Spec_Document SHALL specify that checksum output MUST be encoded as a lowercase hexadecimal string.

### Requirement 12: PBKDF2 Password Hashing Profiles

**User Story:** As a cryptographic library implementer, I want the PBKDF2 profiles specified with exact parameters, so that I can derive identical password hashes.

#### Acceptance Criteria

1. THE Spec_Document SHALL define the following named PBKDF2 profiles with their exact parameters:
   - `BROWSER_PASSWORD`: hashBytes=32, saltBytes=64, iterations=2000000, algorithm=SHA-512
   - `HIGH_SECURITY`: hashBytes=64, saltBytes=32, iterations=5000000, algorithm=SHA-256
   - `TEST_FAST`: hashBytes=32, saltBytes=64, iterations=1000, algorithm=SHA-512
2. THE Spec_Document SHALL specify that salt values MUST be generated from a cryptographically secure random source.
3. THE Spec_Document SHALL specify that the `TEST_FAST` profile MUST only be used in test environments and MUST NOT be used in production.

### Requirement 13: Voting Subsystem (Paillier Homomorphic Encryption)

**User Story:** As a cryptographic library implementer, I want the Paillier-based voting subsystem specified, so that I can implement compatible homomorphic vote tallying.

#### Acceptance Criteria

1. THE Spec_Document SHALL specify that the voting subsystem uses Paillier homomorphic encryption with a 3072-bit key pair.
2. THE Spec_Document SHALL specify that voting key pairs MUST be derived deterministically from an ECDH shared secret using HKDF-SHA512 with the info string `PaillierPrimeGen`.
3. THE Spec_Document SHALL specify that prime generation MUST use a deterministic DRBG (HMAC-DRBG with SHA-512) seeded from the HKDF output, with Miller-Rabin primality testing using 256 iterations.
4. THE Spec_Document SHALL specify the serialized voting key format including the magic bytes `BCVK`, key version (2), key ID (32 bytes), instance ID (32 bytes), and SHA-256 checksum (32 bytes).
5. THE Spec_Document SHALL specify that the public key offset for extracting the public key from the key pair is 768 bytes.

### Requirement 14: WCAP Algorithm Suite Registry

**User Story:** As a WCAP implementer, I want the WCAP specification updated to support multiple algorithm suites, so that I can use DD-ECIES signatures alongside the existing P-256 default.

#### Acceptance Criteria

1. THE WCAP_Spec SHALL introduce a new section titled "Algorithm Suite Registry" that defines the concept of pluggable algorithm suites analogous to TLS cipher suites.
2. THE WCAP_Spec SHALL register the existing default suite with the Cipher_Suite_Identifier `ecdsa-p256-sha256` (ECDSA with P-256 and SHA-256).
3. THE WCAP_Spec SHALL register a new suite with the Cipher_Suite_Identifier `dd-ecies-secp256k1-sha256` (ECDSA with secp256k1 and SHA-256, as defined in the DD-ECIES specification).
4. THE WCAP_Spec SHALL specify that each Algorithm_Suite entry MUST include: identifier string, curve name, signature algorithm, hash algorithm, key format, signature format, and a reference to the defining specification.
5. WHEN a verifier encounters an unrecognized `alg` value in the `Content-Signature` header, THE WCAP_Spec SHALL specify that the verifier MUST reject the signature and SHOULD report the unsupported algorithm.

### Requirement 15: WCAP Content-Signature Header Update

**User Story:** As a WCAP implementer, I want the Content-Signature header format updated to accommodate the new algorithm suite, so that I can serve and verify DD-ECIES-signed content.

#### Acceptance Criteria

1. THE WCAP_Spec SHALL update the `Content-Signature` header format documentation to list `dd-ecies-secp256k1-sha256` as a valid value for the `alg` parameter.
2. THE WCAP_Spec SHALL specify that when `alg=dd-ecies-secp256k1-sha256`, the `sig` field MUST contain a base64-encoded 64-byte compact ECDSA signature as defined in the DD-ECIES specification.
3. THE WCAP_Spec SHALL specify that when `alg=dd-ecies-secp256k1-sha256`, the public key served at `key_uri` MUST be a 33-byte compressed secp256k1 public key encoded in PEM format.
4. THE WCAP_Spec SHALL update the Quick Start section to include an example using the `dd-ecies-secp256k1-sha256` suite alongside the existing P-256 example.

### Requirement 16: WCAP Algorithm Agnosticism

**User Story:** As a protocol designer, I want WCAP to remain algorithm-agnostic with a clean extension mechanism, so that future algorithm suites can be added without modifying the core protocol.

#### Acceptance Criteria

1. THE WCAP_Spec SHALL specify that the `alg` parameter in the `Content-Signature` header is the sole mechanism for algorithm negotiation, and the core protocol logic MUST NOT contain algorithm-specific behavior.
2. THE WCAP_Spec SHALL specify that new algorithm suites MAY be registered by defining the required fields in the Algorithm Suite Registry without modifying the core protocol sections.
3. THE WCAP_Spec SHALL specify that verifiers MUST support at least the `ecdsa-p256-sha256` suite and SHOULD support `dd-ecies-secp256k1-sha256`.
4. THE WCAP_Spec SHALL add a `kid` (Key ID) parameter to the `Content-Signature` header as OPTIONAL, to support signers that publish multiple keys for different algorithm suites.

### Requirement 17: DD-ECIES Specification Test Vectors

**User Story:** As a cryptographic library implementer, I want comprehensive test vectors in the specification, so that I can validate my implementation against known-good outputs.

#### Acceptance Criteria

1. THE Spec_Document SHALL include a dedicated Test Vectors appendix.
2. THE Spec_Document SHALL include test vectors for: mnemonic-to-key derivation, ECDSA signing and verification, ECDH shared secret computation, HKDF key derivation, AES-256-GCM encryption and decryption, Basic mode ECIES encryption, and WithLength mode ECIES encryption.
3. WHEN a test vector involves randomness (IV, ephemeral keys), THE Spec_Document SHALL provide the random values as fixed inputs so that the output is fully deterministic and reproducible.

### Requirement 18: DD-ECIES Specification Security Considerations

**User Story:** As a cryptographic library implementer, I want a security considerations section that documents known risks and mitigations, so that I can implement the library safely.

#### Acceptance Criteria

1. THE Spec_Document SHALL include a Security Considerations section covering: key management best practices, IV reuse risks for AES-GCM, ephemeral key generation requirements, side-channel resistance recommendations, and the security implications of the secp256k1 curve choice.
2. THE Spec_Document SHALL specify that implementations MUST use a cryptographically secure random number generator for all random value generation (IVs, ephemeral keys, symmetric keys).
3. THE Spec_Document SHALL specify that implementations MUST validate that public keys lie on the secp256k1 curve before use in any cryptographic operation.
4. THE Spec_Document SHALL specify that implementations MUST reject private keys that are zero or outside the range [1, n-1].

### Requirement 19: DD-ECIES Pretty Printer and Round-Trip Property

**User Story:** As a specification author, I want the wire format to be fully parseable and re-serializable, so that implementations can validate round-trip correctness.

#### Acceptance Criteria

1. THE Spec_Document SHALL specify a canonical serialization for each Encryption_Type such that parsing a serialized message and re-serializing the parsed components produces byte-identical output.
2. FOR ALL valid encrypted messages, parsing then re-serializing the header fields SHALL produce an identical byte sequence to the original header (round-trip property for header serialization).
3. THE Spec_Document SHALL specify the exact byte offsets and field sizes for each Encryption_Type wire format in a summary table.
