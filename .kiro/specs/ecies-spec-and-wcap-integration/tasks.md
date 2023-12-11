# Implementation Plan: DD-ECIES Specification & WCAP Algorithm Suite Integration

## Overview

This plan creates the DD-ECIES formal specification document (broken into logical authoring sections), updates the WCAP spec with an algorithm suite registry, updates the ecies-lib README, creates the BrightChain docs copy, and adds validation tests. All deliverables are Markdown documents. The implementation language for tests is TypeScript using Jest and fast-check.

## Tasks

- [x] 1. Create DD-ECIES specification document — front matter and foundational sections
  - [x] 1.1 Create the spec file at `express-suite/packages/digitaldefiance-ecies-lib/docs/DD-ECIES-SPECIFICATION.md` with Abstract, Introduction, Terminology, and Notation sections
    - Include version number (1.0) and draft status in header metadata
    - Use RFC 2119 key words consistently throughout normative text
    - Define all glossary terms from the requirements (DD-ECIES, ECIES, secp256k1, HKDF, AES-256-GCM, BIP39, BIP32, BIP44, Paillier, Encryption_Type, Ephemeral_Key_Pair, AAD, DRBG, etc.)
    - Define notation conventions for byte sequences, concatenation operator (||), hex literals, and big-endian integer encoding
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Write the Elliptic Curve Parameters section
    - Specify secp256k1 as mandatory curve, referencing SEC 2 section 2.4.1
    - State curve order explicitly: `0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141`
    - Specify 33-byte compressed public key format (0x02/0x03 prefix)
    - Specify 32-byte private key scalar range [1, n-1]
    - Specify backward compatibility: MUST accept 65-byte uncompressed (0x04) and 64-byte raw keys, normalizing internally
    - Extract values from `constants.ts`: `ECIES.CURVE_NAME`, `PUBLIC_KEY_LENGTH` (33), `RAW_PUBLIC_KEY_LENGTH` (32), `PUBLIC_KEY_MAGIC` (0x02)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.3 Write the Key Management section (BIP39/BIP32/BIP44 derivation)
    - Specify BIP39 with English wordlist, 256-bit entropy (24 words)
    - Specify mnemonic-to-seed with no passphrase (empty string)
    - Specify HD derivation path `m/44'/60'/0'/0/0` per BIP32/BIP44
    - Specify derived private key → compressed secp256k1 public key
    - Include at least one test vector: mnemonic → private key (hex) → compressed public key (hex)
    - Source: `ECIES.PRIMARY_KEY_DERIVATION_PATH`, `ECIES.MNEMONIC_STRENGTH` from `constants.ts`; `walletAndSeedFromMnemonic()` from `crypto-core.ts`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. DD-ECIES specification — cryptographic operations sections
  - [x] 2.1 Write the Signature Scheme (ECDSA) section
    - Specify ECDSA over secp256k1 with SHA-256 digest
    - Specify deterministic nonce generation per RFC 6979
    - Specify 64-byte compact format: `r(32) || s(32)`, no DER
    - Specify signing: `hash = SHA-256(message)`, then sign hash
    - Specify verification: accept 64-byte compact, parse into (r, s)
    - Include at least one test vector: private key, message, expected 64-byte signature (hex)
    - Source: `signature.ts` — `signMessage()`, `verifyMessage()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.2 Write the ECDH Shared Secret and Key Derivation section
    - Specify ECDH shared secret = x-coordinate of shared point (first 32 bytes after 0x04 prefix)
    - Specify HKDF-SHA256 (RFC 5869): empty salt, info = `ecies-v2-key-derivation` (UTF-8), output = 32 bytes
    - Include at least one test vector: ephemeral private key, recipient public key, shared secret (hex), derived symmetric key (hex)
    - Source: `crypto-core.ts` — `computeSharedSecret()`, `deriveSharedKey()`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 2.3 Write the Symmetric Encryption (AES-256-GCM) section
    - Specify AES-256-GCM with 256-bit key
    - Specify 12-byte IV from CSPRNG
    - Specify 16-byte (128-bit) authentication tag
    - Specify AAD requirements (defined per Encryption_Type)
    - Specify ciphertext and auth tag are separate in wire format
    - Source: `constants.ts` — `ECIES.SYMMETRIC`, `IV_SIZE` (12), `AUTH_TAG_SIZE` (16)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Checkpoint — Review foundational and crypto sections
  - Ensure all sections written so far are internally consistent
  - Verify all parameter values match `constants.ts` and source code
  - Ask the user if questions arise.

- [x] 4. DD-ECIES specification — encryption modes and wire format sections
  - [x] 4.1 Write the ECIES Encryption (Single Recipient) section — Basic Mode (0x21)
    - Specify type byte 0x21, no data length prefix
    - Specify wire format: `[preamble] || version(1) || cipherSuite(1) || type(1) || ephemeralPublicKey(33) || iv(12) || authTag(16) || ciphertext(variable)`
    - Specify AAD: `preamble || version || cipherSuite || type || ephemeralPublicKey`
    - Specify fixed overhead: 64 bytes (1+1+1+33+12+16) excluding preamble
    - Specify preamble handling when provided
    - Include wire format diagram (ASCII art, RFC-style)
    - Source: `single-recipient.ts`, `constants.ts` — `ECIES.BASIC.FIXED_OVERHEAD_SIZE`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 4.2 Write the ECIES Encryption (Single Recipient) section — WithLength Mode (0x42)
    - Specify type byte 0x42, extends Basic with 8-byte big-endian data length after auth tag
    - Specify wire format: `[preamble] || version(1) || cipherSuite(1) || type(1) || ephemeralPublicKey(33) || iv(12) || authTag(16) || dataLength(8) || ciphertext(variable)`
    - Specify fixed overhead: 72 bytes (64 + 8) excluding preamble
    - Specify AAD identical to Basic mode (data length NOT in AAD)
    - Source: `constants.ts` — `ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 4.3 Write the ECIES Encryption (Multi-Recipient) section (0x63)
    - Specify type byte 0x63, single random symmetric key encrypted per-recipient
    - Specify header wire format: `version(1) || cipherSuite(1) || type(1) || ephemeralPublicKey(33) || dataLength(8) || recipientCount(2) || recipientIds(idSize * count) || encryptedKeys(60 * count)`
    - Specify dataLength encoding: MSB = recipientIdSize, lower 56 bits = plaintext length, big-endian 64-bit
    - Specify encrypted key block: 60 bytes = `iv(12) || authTag(16) || encryptedSymKey(32)`
    - Specify recipient count: 2-byte big-endian, max 65535
    - Specify message ciphertext: `[preamble] || iv(12) || authTag(16) || ciphertext(variable)`
    - Specify header bytes as AAD for message encryption
    - Specify recipient ID bytes as AAD for per-recipient key encryption
    - Include wire format diagram
    - Source: `multi-recipient.ts`, `constants.ts` — `ECIES.MULTIPLE.*`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [x] 4.4 Write the Message Framing and Wire Format summary section
    - Create byte offset summary table for all three Encryption_Types
    - Specify canonical serialization for each type (parse → re-serialize = identity)
    - Specify exact byte offsets and field sizes in a summary table
    - _Requirements: 19.1, 19.2, 19.3_

- [x] 5. DD-ECIES specification — registries, utilities, and subsystems
  - [x] 5.1 Write the Version, Cipher Suite, and Encryption Type Registries section
    - Define Version Registry: Version 1 = 0x01
    - Define Cipher Suite Registry: `Secp256k1_Aes256Gcm_Sha256` = 0x01
    - Define Encryption Type Registry: Basic = 0x21, WithLength = 0x42, Multiple = 0x63
    - Specify that unrecognized values MUST cause rejection with descriptive error
    - Source: enum files — `EciesVersionEnum`, `EciesCipherSuiteEnum`, `EciesEncryptionTypeEnum`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 5.2 Write the Checksum Operations section
    - Specify SHA3-512, 64-byte (512-bit) digest
    - Specify lowercase hexadecimal encoding
    - Source: `constants.ts` — `CHECKSUM.ALGORITHM`, `CHECKSUM.SHA3_BUFFER_LENGTH`, `CHECKSUM.ENCODING`
    - _Requirements: 11.1, 11.2_

  - [x] 5.3 Write the PBKDF2 Password Hashing Profiles section
    - Define BROWSER_PASSWORD: hashBytes=32, saltBytes=64, iterations=2000000, algorithm=SHA-512
    - Define HIGH_SECURITY: hashBytes=64, saltBytes=32, iterations=5000000, algorithm=SHA-256
    - Define TEST_FAST: hashBytes=32, saltBytes=64, iterations=1000, algorithm=SHA-512
    - Specify salt from CSPRNG
    - Specify TEST_FAST MUST NOT be used in production
    - Source: `constants.ts` — `PBKDF2_PROFILES`
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 5.4 Write the Voting Subsystem (Paillier Homomorphic Encryption) section
    - Specify Paillier 3072-bit key pair
    - Specify deterministic derivation from ECDH shared secret via HKDF-SHA512, info = `PaillierPrimeGen`
    - Specify HMAC-DRBG with SHA-512, Miller-Rabin 256 iterations
    - Specify serialized key format: magic `BCVK`, version 2, key ID (32 bytes), instance ID (32 bytes), SHA-256 checksum (32 bytes)
    - Specify public key offset: 768 bytes
    - Source: `constants.ts` — `VOTING.*`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 6. DD-ECIES specification — security, test vectors, and references
  - [x] 6.1 Write the Security Considerations section
    - Cover: key management best practices, IV reuse risks for AES-GCM, ephemeral key generation requirements, side-channel resistance recommendations, secp256k1 curve choice implications
    - Specify MUST use CSPRNG for all random values (IVs, ephemeral keys, symmetric keys)
    - Specify MUST validate public keys lie on secp256k1 curve before use
    - Specify MUST reject private keys that are zero or ≥ n
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 6.2 Write the Test Vectors appendix
    - Include vectors for: mnemonic-to-key derivation, ECDSA signing/verification, ECDH shared secret, HKDF key derivation, AES-256-GCM encrypt/decrypt, Basic mode ECIES, WithLength mode ECIES
    - All random values (IV, ephemeral keys) provided as fixed inputs for deterministic reproducibility
    - Generate vectors by running actual `ecies-lib` implementation with fixed inputs
    - _Requirements: 17.1, 17.2, 17.3_

  - [x] 6.3 Write the References section
    - Include references to: SEC 2, RFC 5869 (HKDF), RFC 6979, BIP39, BIP32, BIP44, AES-GCM (NIST SP 800-38D), SHA-256/SHA-512, SHA3-512
    - _Requirements: 1.1_

- [x] 7. Checkpoint — Review complete DD-ECIES specification
  - Verify all 17 top-level sections present in correct order per Requirement 1.1
  - Verify RFC 2119 key words used consistently
  - Verify all parameter values match `constants.ts`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create BrightChain docs copy and update ecies-lib README
  - [x] 8.1 Create the BrightChain docs copy at `docs/DD-ECIES-SPECIFICATION.md`
    - Copy the canonical spec from `express-suite/packages/digitaldefiance-ecies-lib/docs/DD-ECIES-SPECIFICATION.md`
    - Add header note: "This is a copy of the canonical specification at `express-suite/packages/digitaldefiance-ecies-lib/docs/DD-ECIES-SPECIFICATION.md`. If they differ, the canonical version takes precedence."
    - _Requirements: 1.5_

  - [x] 8.2 Update the ecies-lib README with a link to the DD-ECIES specification
    - Add a prominent section/link in `express-suite/packages/digitaldefiance-ecies-lib/README.md` pointing to `docs/DD-ECIES-SPECIFICATION.md`
    - Include a brief description of what the spec covers (formal, language-agnostic specification for building compatible implementations)
    - _Requirements: 1.6_

- [x] 9. Update WCAP specification with algorithm suite registry and header changes
  - [x] 9.1 Add the Algorithm Suite Registry section to the WCAP spec
    - Insert new section (Section 12) in `WCAP/Web Content Authenticity Protocol (WCAP).md`
    - Define the concept of pluggable algorithm suites analogous to TLS cipher suites
    - Register `ecdsa-p256-sha256` as the existing default suite with all required fields (identifier, curve, signature algorithm, hash, key format, signature format, reference)
    - Register `dd-ecies-secp256k1-sha256` as a new suite with all required fields, referencing the DD-ECIES specification
    - Specify that unrecognized `alg` values MUST cause rejection, SHOULD report unsupported algorithm
    - Specify `alg` parameter is the sole negotiation mechanism; core protocol MUST NOT contain algorithm-specific behavior
    - Specify new suites MAY be registered without modifying core protocol
    - Specify verifiers MUST support `ecdsa-p256-sha256`, SHOULD support `dd-ecies-secp256k1-sha256`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 16.1, 16.2, 16.3_

  - [x] 9.2 Update the Content-Signature header documentation in the WCAP spec
    - List `dd-ecies-secp256k1-sha256` as valid `alg` value in Section 6.3
    - Specify that `sig` field MUST contain base64-encoded 64-byte compact ECDSA signature when using DD-ECIES suite
    - Specify that `key_uri` public key MUST be 33-byte compressed secp256k1 in PEM format when using DD-ECIES suite
    - Add `kid` (Key ID) parameter as OPTIONAL to the header format
    - _Requirements: 15.1, 15.2, 15.3, 16.4_

  - [x] 9.3 Update the Quick Start section in the WCAP spec
    - Add a DD-ECIES example alongside the existing P-256 example in Section 4
    - Show key generation, signing, and Content-Signature header with `alg=dd-ecies-secp256k1-sha256`
    - _Requirements: 15.4_

- [x] 10. Checkpoint — Review all document deliverables
  - Verify DD-ECIES spec at canonical location is complete
  - Verify BrightChain docs copy matches canonical with header note
  - Verify ecies-lib README has spec link
  - Verify WCAP spec has algorithm suite registry, updated header, Quick Start example, and kid parameter
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Write validation tests for document content and implementation conformance
  - [x] 11.1 Write document structure validation tests
    - Create test file in the ecies-lib test directory
    - Test that DD-ECIES spec exists at canonical path
    - Test that all 17 required top-level sections are present in correct order (Req 1.1)
    - Test that RFC 2119 key words appear in normative sections (Req 1.2)
    - Test that BrightChain docs copy exists with canonical reference header (Req 1.5)
    - Test that ecies-lib README contains link to DD-ECIES spec (Req 1.6)
    - Test that WCAP spec contains Algorithm Suite Registry section (Req 14.1)
    - Test that WCAP spec lists both `ecdsa-p256-sha256` and `dd-ecies-secp256k1-sha256` (Req 14.2, 14.3)
    - Test that WCAP spec Content-Signature header includes `kid` parameter (Req 16.4)
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 14.1, 14.2, 14.3, 16.4_

  - [x] 11.2 Write parameter consistency tests
    - Verify all cryptographic parameter values in the DD-ECIES spec match `constants.ts`
    - Check: curve name, public key length (33), raw public key length (32), signature size (64), symmetric key size (32), IV size (12), auth tag size (16), derivation path, mnemonic strength (256)
    - Check: PBKDF2 profile values match `PBKDF2_PROFILES`
    - Check: Voting subsystem values match `VOTING` constants
    - Check: Wire format overhead values match `ECIES.BASIC.FIXED_OVERHEAD_SIZE` (64) and `ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE` (72)
    - _Requirements: 2.1–2.5, 6.1–6.3, 10.1–10.3, 12.1, 13.1–13.5_

  - [x] 11.3 Write property test: Wire Format Header Round-Trip (Property 1)
    - **Property 1: Wire Format Header Round-Trip**
    - **Validates: Requirements 19.1, 19.2**
    - Generate random valid headers for Basic, WithLength, and Multiple modes with valid version (0x01), cipher suite (0x01), encryption type, random 33-byte compressed public key, random 12-byte IV, random 16-byte auth tag
    - Parse serialized header bytes and re-serialize; assert byte-identical output
    - Use `fast-check` with minimum 100 iterations

  - [x] 11.4 Write property test: DD-ECIES Registry Value Rejection (Property 2)
    - **Property 2: DD-ECIES Registry Value Rejection**
    - **Validates: Requirements 10.4**
    - Generate random byte values not in valid sets: Version ∉ {0x01}, CipherSuite ∉ {0x01}, EncryptionType ∉ {0x21, 0x42, 0x63}
    - Assert parser rejects with descriptive error
    - Use `fast-check` with minimum 100 iterations

  - [x] 11.5 Write property test: WCAP Unrecognized Algorithm Suite Rejection (Property 3)
    - **Property 3: WCAP Unrecognized Algorithm Suite Rejection**
    - **Validates: Requirements 14.5**
    - Generate random ASCII strings ≠ `ecdsa-p256-sha256` and ≠ `dd-ecies-secp256k1-sha256`
    - Assert verifier rejects and reports unsupported algorithm
    - Use `fast-check` with minimum 100 iterations

  - [x] 11.6 Write test vector validation tests
    - Run each test vector from the DD-ECIES spec through `ecies-lib` functions
    - Verify mnemonic-to-key derivation output matches spec vector
    - Verify ECDSA signing output matches spec vector
    - Verify ECDH shared secret matches spec vector
    - Verify HKDF key derivation matches spec vector
    - Verify AES-256-GCM encryption/decryption matches spec vector
    - _Requirements: 17.1, 17.2, 17.3_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Run all validation tests
  - Verify all document deliverables are complete and consistent
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation of the large specification document
- Property tests validate universal correctness properties from the design document
- The DD-ECIES spec is intentionally broken into logical authoring sections (curve params, signatures, wire formats, etc.) rather than one monolithic task
- Test vectors in section 6.2 should be generated by running the actual ecies-lib with fixed inputs to ensure accuracy
- All document changes are additive to the WCAP spec — no existing content is removed
