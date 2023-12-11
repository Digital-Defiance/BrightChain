---
layout: default
title: "BrightPass: A Decentralized Password Manager with VCBL Architecture on Privacy-Preserving Block Storage"
parent: "Papers"
---
# BrightPass: A Decentralized Password Manager with VCBL Architecture on Privacy-Preserving Block Storage

**Jessica Mulein**
Digital Defiance
jessica@digitaldefiance.org

**Abstract.** We present BrightPass, a decentralized password manager built on the BrightChain Owner-Free Filesystem that introduces the Vault Constituent Block List (VCBL) — a novel block-level data structure that embeds credential vault metadata, per-entry property records, and access control directly into the content-addressed block store. Unlike conventional password managers that rely on centralized cloud synchronization with server-side encryption (1Password, Bitwarden) or local-only encrypted databases (KeePass), BrightPass stores all credential data as XOR-whitened TUPLE blocks providing plausible deniability at the storage layer, encrypts vault contents using HKDF-SHA256 key derivation from independent per-vault BIP39 seeds combined with a master password, and distributes encrypted blocks across a decentralized gossip network with no single point of compromise. The VCBL extends BrightChain's Constituent Block List hierarchy with a deterministic binary serialization format that co-locates vault header data (owner identity, shared member list, timestamps) and per-entry property records (entry type, title, tags, site URL, favorite status) alongside the block address list, enabling O(1) metadata access without decrypting entry payloads. BrightPass supports four entry types (login credentials with TOTP, secure notes, credit cards, and identity documents), k-anonymity breach detection via the Have I Been Pwned API, cryptographically secure password generation with Fisher-Yates shuffling, RFC 6238 TOTP two-factor authentication, Shamir's Secret Sharing-based emergency access, comprehensive audit logging, and import from nine major password manager formats. The system is implemented as a production TypeScript library with browser compatibility via the Web Crypto API and platform-agnostic cryptographic abstractions.

**Keywords:** password manager, VCBL, Constituent Block List, Owner-Free Filesystem, ECIES, HKDF, plausible deniability, k-anonymity, breach detection, TOTP, Shamir's Secret Sharing, decentralized storage


---

## 1. Introduction

Password managers have become essential infrastructure for digital security, yet the dominant architectures present a fundamental tension between usability and trust. Cloud-based managers such as 1Password [1], LastPass [2], and Bitwarden [3] synchronize encrypted vaults through centralized servers, providing seamless multi-device access at the cost of a single point of compromise — as demonstrated by the 2022 LastPass breach, where encrypted vault data for millions of users was exfiltrated from cloud storage [4]. Local-only managers such as KeePass [5] avoid the centralization risk but sacrifice synchronization, requiring users to manually transfer database files between devices. Browser-integrated managers (Chrome, Firefox) offer convenience but store credentials within the browser's profile directory, tying security to the operating system's user account rather than independent cryptographic protection.

BrightPass takes a fundamentally different approach. Rather than building a standalone encrypted database that must be synchronized through a trusted intermediary, BrightPass stores credential vaults directly in BrightChain's Owner-Free Filesystem [6] — a decentralized block store where all data is XOR-whitened into TUPLE blocks that are individually indistinguishable from random data. This provides a property no existing password manager offers: *plausible deniability at the storage layer*. A node operator storing BrightPass vault blocks cannot determine whether any given block contains password data, file data, message data, or random whitening material.

The key technical contribution is the Vault Constituent Block List (VCBL), a novel extension of BrightChain's CBL hierarchy that embeds vault-specific metadata directly into the block structure. A VCBL block contains three regions: (1) the standard CBL header with block addresses pointing to encrypted entry payloads, (2) a vault header encoding the vault name, owner identity, creation and modification timestamps, and shared member list, and (3) a per-entry property record array that stores searchable metadata (entry type, title, tags, site URL, favorite status) alongside the address list. This co-location enables the password manager to perform vault listing, entry search, and metadata display operations by reading only the VCBL block itself, without decrypting the individual entry payloads stored in the referenced TUPLE blocks.

This paper makes the following contributions:

1. **VCBL Block Architecture.** We describe the Vault Constituent Block List, a deterministic binary format that extends BrightChain's CBL hierarchy with vault header data and per-entry property records, enabling O(1) metadata access without payload decryption (Section 3).

2. **Vault Key Derivation.** We present an HKDF-SHA256 key derivation scheme that combines independent per-vault BIP39 seeds with a master password, providing vault isolation (compromise of one vault's seed does not affect others) and seed regeneration without re-encrypting the master identity (Section 4).

3. **k-Anonymity Breach Detection.** We describe a privacy-preserving breach detection mechanism that checks credentials against the Have I Been Pwned database using only the first 5 characters of a SHA-1 hash, ensuring the full password hash is never transmitted (Section 5).

4. **Emergency Access via Shamir's Secret Sharing.** We formalize a threshold-based emergency access protocol where a vault's decryption capability is split among designated trustees, requiring k-of-n cooperation to recover access (Section 6).

5. **Cross-Platform Import.** We describe a parser architecture supporting nine import formats from major password managers, with type inference from field analysis and graceful error handling for malformed records (Section 7).

The remainder of this paper is organized as follows. Section 2 surveys related work. Section 3 describes the VCBL block architecture. Section 4 presents the vault key derivation scheme. Section 5 describes the password generation and breach detection subsystems. Section 6 presents the emergency access protocol. Section 7 describes the TOTP engine and import system. Section 8 presents the audit logging architecture. Section 9 presents the core algorithms in pseudocode. Section 10 describes the storage integration pipeline. Section 11 details the vault sharing protocol. Section 12 analyzes security properties with formal claims. Section 13 presents machine-verifiable correctness properties. Section 14 discusses the implementation. Section 15 discusses limitations and future work. Section 16 concludes.

---

## 2. Related Work

### 2.1 Cloud-Based Password Managers

1Password [1] uses a dual-key architecture combining a master password with a 128-bit Secret Key, deriving encryption keys via SRP (Secure Remote Password) for authentication and AES-256-GCM for vault encryption. Vaults are synchronized through 1Password's servers, which store only encrypted data. Bitwarden [3] uses PBKDF2-SHA256 (or Argon2id) to derive a master key from the master password, encrypts vault items with AES-256-CBC + HMAC-SHA256, and synchronizes through its cloud infrastructure (with an optional self-hosted server). LastPass [2] employed a similar PBKDF2-based derivation but suffered a catastrophic breach in 2022 where encrypted vault backups were exfiltrated from cloud storage [4], demonstrating that centralized storage — even of encrypted data — creates a high-value target.

All three systems share a common architectural assumption: encrypted vault data must be stored on (or synchronized through) servers operated by the password manager vendor or the user's organization. BrightPass eliminates this assumption entirely. Vault data is stored as TUPLE blocks in a decentralized network where no single operator possesses the complete vault, and the XOR whitening ensures that individual blocks are indistinguishable from random data.

### 2.2 Local-Only Password Managers

KeePass [5] stores credentials in a local KDBX file encrypted with AES-256 or ChaCha20, using Argon2 for key derivation. The database file must be manually copied or synchronized via third-party cloud storage (Dropbox, Google Drive, etc.), reintroducing the centralization risk that local storage was meant to avoid. Pass (the standard Unix password manager) [7] stores each credential as a separate GPG-encrypted file in a directory tree, using Git for synchronization. While this provides per-entry encryption granularity, it leaks metadata (file names, directory structure, modification times) that reveals which services a user has accounts with.

BrightPass provides the per-entry encryption granularity of Pass without the metadata leakage, because the VCBL's property records are themselves stored within the whitened block, and the individual entry payloads are stored as separate TUPLE blocks whose content-addressed IDs reveal nothing about their contents.

### 2.3 Decentralized Credential Storage

LessPass [8] takes a stateless approach, deterministically generating passwords from a master password, site name, and username using PBKDF2. This eliminates storage entirely but sacrifices the ability to store arbitrary credentials, TOTP secrets, secure notes, or credit card information. Padloc [9] provides end-to-end encrypted credential storage with a self-hostable server, but the architecture still requires a synchronization server.

To our knowledge, BrightPass is the first password manager to store credentials in a plausibly deniable, decentralized block store where the storage layer itself provides information-theoretic privacy guarantees independent of the application-layer encryption.

### 2.4 Breach Detection

Troy Hunt's Have I Been Pwned (HIBP) service [10] pioneered the k-anonymity model for breach checking: clients send only the first 5 characters of a SHA-1 hash to the API, which returns all matching suffixes. The client performs the final comparison locally, ensuring the full hash is never transmitted. This model has been adopted by 1Password (Watchtower), Bitwarden, Firefox Monitor, and others. BrightPass integrates the same k-anonymity model with platform-agnostic SHA-1 hashing via the @noble/hashes library, ensuring identical behavior in browser and Node.js environments.

### 2.5 Comparative Summary

| Capability | 1Password | Bitwarden | KeePass | Pass | LessPass | **BrightPass** |
|---|---|---|---|---|---|---|
| Plausible deniability | No | No | No | No | No | **Yes (XOR whitening)** |
| Decentralized storage | No | No (self-host option) | No | No (Git) | Stateless | **Yes (gossip network)** |
| No single point of compromise | No | No | Yes (local) | Partial | Yes | **Yes** |
| Per-entry encryption | Yes | Yes | No (whole DB) | Yes (per-file) | N/A | **Yes (per-TUPLE)** |
| Metadata privacy | Partial | Partial | Yes (local) | No (filenames) | Yes | **Yes (VCBL in TUPLE)** |
| Emergency access | Yes (family) | Yes (org) | No | No | No | **Yes (Shamir SSS)** |
| Breach detection | Yes | Yes | Plugin | No | No | **Yes (k-anonymity)** |
| TOTP integration | Yes | Yes | Plugin | Plugin | No | **Yes (RFC 6238)** |
| Multi-format import | Yes | Yes | Yes | No | No | **Yes (9 formats)** |
| Browser + Node.js | Browser ext. | Browser ext. | Desktop | CLI | Browser | **Both (Web Crypto)** |


---

## 3. VCBL Block Architecture

### 3.1 Design Motivation

BrightChain's Constituent Block List (CBL) records the "recipe" for reconstructing a file: an ordered list of SHA3-512 block identifiers. An Extended CBL adds a file name and MIME type to the header. However, a password vault requires richer metadata than a file name — it needs vault ownership, sharing information, timestamps, and per-entry searchable properties. Storing this metadata in a separate data structure would require additional block lookups and create a two-tier system where some metadata is accessible without the vault key and some is not.

The VCBL solves this by embedding all vault metadata directly into the CBL block structure. A single VCBL block contains everything needed to display a vault's contents in a user interface — entry titles, types, tags, site URLs, and favorite status — without decrypting any of the referenced entry payloads. The entry payloads (containing the actual passwords, credit card numbers, secure note contents, etc.) are stored as separate TUPLE blocks referenced by the address list.

### 3.2 Block Structure

A VCBL block consists of four contiguous regions within a single BrightChain block:

```
┌─────────────────────────────────────────────────────────┐
│  Region 1: Extended CBL Header                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │ CBL magic · version · block size · encryption   │    │
│  │ type · creator ID · date created · address      │    │
│  │ count · file data length · tuple count ·        │    │
│  │ file name length · file name · MIME type        │    │
│  │ length · MIME type · ECDSA signature            │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  Region 2: Address List                                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │ SHA3-512 hash₀ · SHA3-512 hash₁ · ... · hashₙ  │    │
│  │ (64 bytes per address, n = entry count)         │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  Region 3: Vault Header                                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │ vault name length (2B) · vault name (UTF-8)     │    │
│  │ owner member ID (platform-specific length)      │    │
│  │ created timestamp (8B, ms since epoch)          │    │
│  │ modified timestamp (8B, ms since epoch)         │    │
│  │ shared member count (2B)                        │    │
│  │ shared member ID₀ · ... · shared member IDₘ    │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  Region 4: Property Records                             │
│  ┌─────────────────────────────────────────────────┐    │
│  │ record₀ · record₁ · ... · recordₙ              │    │
│  │ (one per address, variable length)              │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

The Extended CBL header is signed with the creator's ECDSA key (secp256k1), covering the header bytes and address list. The vault header and property records extend beyond the signed region, allowing vault metadata updates without re-signing the CBL structure. The MIME type is fixed as `application/x-brightchain-vcbl`, enabling block-level type detection.

### 3.3 Vault Header Binary Format

The vault header uses big-endian byte ordering throughout:

```
Offset  Size        Field              Description
──────  ──────────  ─────────────────  ──────────────────────────────────
0       2           vaultNameLength    Length of vault name in bytes
2       variable    vaultName          UTF-8 encoded vault name (1-255 chars)
var     platformLen ownerMemberId      Owner's member ID (platform-specific)
var     8           createdAt          Creation timestamp (ms since epoch)
var     8           modifiedAt         Modification timestamp (ms since epoch)
var     2           sharedMemberCount  Number of shared members
var     N×platLen   sharedMemberIds    Array of shared member IDs
```

The `platformLen` (platform-specific member ID length) is determined by the `CBLService.creatorLength` property, which varies by platform — 16 bytes for GuidV4 in the Node.js backend, variable for other platform ID types. This design follows the workspace convention of generic `<TID extends PlatformID>` type parameters, allowing the same binary format to serve both backend (`GuidV4Buffer`) and frontend (`string`-based) implementations.

### 3.4 Property Record Binary Format

Each property record is serialized as a variable-length binary structure:

```
Offset  Size      Field       Type     Description
──────  ────────  ──────────  ───────  ──────────────────────────────
0       2         idLength    uint16   Length of entry ID string
2       variable  id          UTF-8    Entry identifier
var     1         entryType   uint8    0=login, 1=secure_note, 2=credit_card, 3=identity
var     2         titleLen    uint16   Length of title string
var     variable  title       UTF-8    Entry title
var     2         tagsLen     uint16   Length of comma-separated tags
var     variable  tags        UTF-8    Comma-separated tag list
var     1         favorite    uint8    0=false, 1=true
var     8         createdAt   uint64   Creation timestamp (ms since epoch)
var     8         updatedAt   uint64   Modification timestamp (ms since epoch)
var     2         siteUrlLen  uint16   Length of site URL string
var     variable  siteUrl     UTF-8    Associated site URL
```

The entry type is encoded as a single byte with a fixed mapping: `login=0`, `secure_note=1`, `credit_card=2`, `identity=3`. This compact encoding enables efficient type filtering during search operations.

**Index Alignment Invariant.** The number of property records must exactly equal the number of addresses in the address list. This invariant is enforced during both construction (`makeVcblHeader` validates `propertyRecords.length === expectedAddressCount`) and parsing (`VCBLBlock.validateSync` checks alignment). A violation raises a `CblError` with type `InvalidStructure`. This alignment ensures a 1:1 correspondence between each property record and the TUPLE block containing its encrypted entry payload.

### 3.5 Capacity Planning

The VCBL's capacity — the maximum number of entries a single VCBL block can hold — depends on the block size, encryption type, vault name length, shared member count, and average property record size. The `VCBLService.calculateVcblCapacity` method computes this by:

1. Computing the base CBL address capacity for the given block size and encryption type
2. Estimating the vault header size from the vault name and shared member count
3. Estimating the total property records size (using actual records or an average of 100 bytes per record)
4. Subtracting the vault-specific overhead (in units of SHA3-512 address slots) from the base capacity

The `recommendBlockSize` method iterates through available block sizes (Small/1KB, Medium/64KB, Large/1MB) and returns the smallest size that can accommodate the desired entry count. For a typical vault with a short name, no shared members, and 100-byte average property records:

- **Small (1 KB):** ~4-6 entries
- **Medium (64 KB):** ~400-500 entries
- **Large (1 MB):** ~7,000-8,000 entries

When a vault exceeds the capacity of a single VCBL block, BrightChain's Super CBL hierarchy can be employed, with a top-level VCBL referencing sub-VCBLs that each contain a partition of the vault's entries.


---

## 4. Vault Key Derivation

### 4.1 Design Goals

BrightPass's key derivation scheme must satisfy three properties:

1. **Vault isolation.** Compromise of one vault's key material must not affect other vaults or the member's BrightChain identity.
2. **Seed independence.** Each vault has its own BIP39 seed that can be regenerated (cycled) without affecting the member's master mnemonic or other vaults.
3. **Master password binding.** The vault encryption key must depend on both the vault seed and a master password, so that possession of the seed alone is insufficient for decryption.

### 4.2 Derivation Scheme

The vault encryption key is derived using HKDF-SHA256 (RFC 5869) with the following parameters:

```
VaultKey = HKDF-SHA256(
    IKM  = VaultSeed ‖ MasterPassword,
    salt = empty,
    info = UTF-8(VaultId),
    L    = 32
)
```

Where:

- **VaultSeed** is a 64-byte BIP39 seed unique to this vault, generated from a dedicated 24-word mnemonic. This seed is independent of the member's identity mnemonic — it is generated specifically for the vault and stored (encrypted) as part of the vault's metadata.
- **MasterPassword** is the user's master password, encoded as UTF-8 bytes.
- **VaultId** is the vault's unique identifier string, used as the HKDF `info` parameter for domain separation. This ensures that even if two vaults somehow shared the same seed and master password, they would derive different encryption keys.
- **L = 32** produces a 32-byte (256-bit) key suitable for AES-256-GCM encryption.

The concatenation of VaultSeed and MasterPassword as the Input Key Material (IKM) means that an attacker must possess both the vault seed *and* the master password to derive the encryption key. The vault seed provides 512 bits of entropy (from the BIP39 mnemonic), while the master password provides additional entropy that varies with password strength.

### 4.3 Seed Lifecycle

Each vault's BIP39 seed can be independently regenerated without affecting other vaults or the member's identity:

1. **Generation.** When a vault is created, a new BIP39 mnemonic is generated and converted to a 64-byte seed. The mnemonic is displayed to the user for backup and then discarded from memory.
2. **Storage.** The vault seed is encrypted under the member's ECIES public key and stored as part of the vault's metadata in the VCBL block.
3. **Regeneration.** The `VAULT_SEED_REGENERATED` audit action records seed cycling events. When a seed is regenerated, all entry payloads must be re-encrypted with the new derived key and new TUPLE blocks must be created. The old TUPLE blocks become unreachable (their addresses are no longer referenced by any CBL) and will eventually be garbage collected by the storage layer.
4. **Recovery.** If the user has backed up the vault's BIP39 mnemonic, they can regenerate the vault seed and, combined with their master password, derive the vault encryption key to recover access.

### 4.4 Comparison with Other Derivation Schemes

| Property | 1Password (SRP + Secret Key) | Bitwarden (PBKDF2/Argon2) | KeePass (Argon2) | **BrightPass (HKDF)** |
|---|---|---|---|---|
| Per-vault isolation | No (one key) | No (one key) | No (one DB) | **Yes (per-vault seed)** |
| Independent seed cycling | No | No | No | **Yes** |
| Hardware-backed entropy | Secret Key (128-bit) | No | Key file (optional) | **BIP39 seed (512-bit)** |
| Domain separation | No | No | No | **Yes (vault ID as info)** |
| Key derivation cost | SRP (server-side) | PBKDF2/Argon2 (tunable) | Argon2 (tunable) | **HKDF (fast, entropy-preserving)** |

BrightPass uses HKDF rather than a slow key derivation function (PBKDF2, Argon2) because the input key material already has high min-entropy (512 bits from the BIP39 seed). Slow KDFs are designed to compensate for low-entropy inputs (human-chosen passwords); when the input already has sufficient entropy, HKDF's extract-then-expand construction is the appropriate primitive, as recommended by RFC 5869.

---

## 5. Password Generation and Breach Detection

### 5.1 Cryptographically Secure Password Generation

BrightPass generates passwords using a three-phase algorithm:

**Phase 1: Minimum requirement satisfaction.** For each enabled character set (uppercase, lowercase, digits, symbols) with a configured minimum count, the required number of characters is drawn from that specific character set using cryptographically secure random selection.

**Phase 2: Remaining fill.** The remaining positions (up to the target length) are filled with characters drawn uniformly from the combined character set of all enabled categories.

**Phase 3: Fisher-Yates shuffle.** The complete character array is shuffled using the Fisher-Yates algorithm with cryptographically secure random indices, ensuring that the minimum-requirement characters are not clustered at predictable positions.

The random index generation uses platform-agnostic cryptographic random bytes (`getRandomBytes(4)` from the `platformCrypto` abstraction), interpreted as a 32-bit unsigned integer via `DataView.getUint32()`, and reduced modulo the target range. This provides uniform distribution for ranges up to 2^32.

**Validation constraints:**
- Password length must be between 8 and 128 characters
- At least one character set must be enabled
- The sum of all minimum counts must not exceed the password length

The character sets are:
- Uppercase: `ABCDEFGHIJKLMNOPQRSTUVWXYZ` (26 characters)
- Lowercase: `abcdefghijklmnopqrstuvwxyz` (26 characters)
- Digits: `0123456789` (10 characters)
- Symbols: `!@#$%^&*()_+-=[]{}|;:,.<>?` (27 characters)

A password using all four character sets has a per-character entropy of log₂(89) ≈ 6.47 bits. A 16-character password with all sets enabled provides approximately 103.6 bits of entropy.

### 5.2 k-Anonymity Breach Detection

BrightPass checks passwords against the Have I Been Pwned (HIBP) Passwords API using the k-anonymity model:

```
FUNCTION CheckBreach(password: string) → BreachCheckResult
  hash ← SHA-1(password)                    // uppercase hex string
  prefix ← hash[0..4]                       // first 5 hex characters
  suffix ← hash[5..]                        // remaining 35 hex characters

  response ← HTTP-GET("https://api.pwnedpasswords.com/range/" + prefix)

  IF response fails THEN
    RETURN {breached: false, count: 0, serviceAvailable: false}

  FOR EACH line IN response.split('\n') DO
    (hashSuffix, countStr) ← line.split(':')
    IF hashSuffix = suffix THEN
      RETURN {breached: true, count: parseInt(countStr), serviceAvailable: true}

  RETURN {breached: false, count: 0, serviceAvailable: true}
```

**Privacy guarantee.** The HIBP API receives only the first 5 characters of the SHA-1 hash (the prefix). The API returns approximately 500-800 hash suffixes matching that prefix. The client performs the final comparison locally. An eavesdropper observing the API request learns only the 5-character prefix, which matches approximately 2^20 / 16^5 ≈ 1 possible password hash out of every ~1 million — providing no meaningful information about the actual password.

**Graceful degradation.** If the HIBP API is unreachable (network error, timeout, non-200 response), the breach check returns `serviceAvailable: false` without throwing an exception, allowing the application to inform the user that breach checking is temporarily unavailable rather than blocking vault operations.

**Platform compatibility.** SHA-1 hashing uses the `@noble/hashes` library's `sha1Hash` function, which provides identical output in both browser and Node.js environments. The HTTP request uses the native `fetch` API, available in modern browsers and Node.js 18+.


---

## 6. Emergency Access

### 6.1 Threat Model

Emergency access addresses the scenario where a vault owner becomes incapacitated (medical emergency, death, prolonged absence) and designated trustees need to recover access to the vault's contents. The protocol must satisfy two competing requirements:

1. **No unilateral access.** No single trustee should be able to access the vault independently.
2. **Threshold recovery.** A configurable subset of trustees (k out of n) should be able to collectively recover access.

### 6.2 Protocol

BrightPass uses Shamir's Secret Sharing [11] to split the vault's decryption capability among designated trustees:

**Configuration:**

```
FUNCTION ConfigureEmergencyAccess(vaultId, threshold, totalShares, trustees)
  REQUIRE threshold ≤ totalShares
  REQUIRE totalShares = |trustees|

  vaultKey ← DeriveVaultKey(vaultSeed, masterPassword, vaultId)
  shares ← ShamirSplit(vaultKey, threshold, totalShares)

  FOR i ← 0 TO totalShares - 1 DO
    trusteePubKey ← LookupPublicKey(trustees[i])
    encryptedShare ← ECIES.Encrypt(trusteePubKey, shares[i])
    StoreEncryptedShare(trustees[i], encryptedShare)

  EraseFromMemory(vaultKey, shares)
  AuditLog(vaultId, EMERGENCY_CONFIGURED, {threshold, totalShares})
```

Each share is encrypted under the respective trustee's ECIES public key (secp256k1) before storage, ensuring that shares are confidential even within the block store. The encrypted shares are stored as `EncryptedShare` records containing the trustee's member ID and the ECIES ciphertext.

**Recovery:**

```
FUNCTION RecoverEmergencyAccess(vaultId, decryptedShares[])
  REQUIRE |decryptedShares| ≥ threshold

  vaultKey ← ShamirRecombine(decryptedShares)
  // vaultKey can now decrypt the vault's entry payloads

  AuditLog(vaultId, EMERGENCY_RECOVERED, {sharesUsed: |decryptedShares|})
  RETURN vaultKey
```

Each participating trustee decrypts their share using their ECIES private key and submits the plaintext share to the recovery process. Once the threshold number of shares is collected, Shamir recombination produces the original vault encryption key.

### 6.3 Integration with BrightTrust

When BrightPass is deployed within a BrightChain network with BrightTrust governance, the emergency access protocol can be integrated with the BrightTrust consensus mechanism. The `BRIGHT_TRUST_CONFIGURED` audit action records when a vault's emergency access is bound to a BrightTrust quorum rather than individually designated trustees. In this configuration, the BrightTrust members serve as the trustees, and the threshold is determined by the BrightTrust consensus rules (typically >50% of members).

---

## 7. TOTP Engine and Import System

### 7.1 RFC 6238 TOTP

BrightPass provides integrated Time-based One-Time Password (TOTP) support for two-factor authentication, compliant with RFC 6238 [12]. The TOTP engine supports:

- **Secret generation.** Cryptographically secure random secrets encoded in base32 format, compatible with all major authenticator apps (Google Authenticator, Authy, Microsoft Authenticator).
- **Code generation.** Standard 6-digit TOTP codes with configurable period (default 30 seconds) and algorithm (SHA1, SHA256, SHA512). SHA1 is the default for maximum compatibility with existing authenticator apps.
- **Code validation.** Validation with configurable time window tolerance (default ±1 period) to account for clock drift between the client and the authenticator app.
- **URI generation.** Standard `otpauth://totp/` URIs following the Google Authenticator Key URI Format, encoding the issuer, label, secret, algorithm, digits, and period.
- **QR code generation.** Data URL-encoded QR code images suitable for direct embedding in HTML `<img>` elements, enabling authenticator app configuration via camera scanning.

The complete setup flow generates a secret, constructs the otpauth URI, and renders the QR code in a single operation:

```
FUNCTION SetupTOTP(issuer, label, algorithm?, digits?, period?)
  secret ← GenerateRandomBase32Secret()
  uri ← FormatOtpauthUri(secret, issuer, label, algorithm, digits, period)
  qrCode ← RenderQRCodeAsDataUrl(uri)
  RETURN {secret, uri, qrCode}
```

TOTP secrets are stored as part of the `LoginEntry` type's `totpSecret` field, encrypted alongside the password within the entry's TUPLE block payload.

### 7.2 Multi-Format Import

BrightPass supports importing credentials from nine password manager export formats:

| Format | Source | File Type | Parser Strategy |
|---|---|---|---|
| `1password_1pux` | 1Password | JSON (1PUX) | Nested accounts/vaults/items traversal |
| `1password_csv` | 1Password | CSV | Generic CSV with header mapping |
| `lastpass_csv` | LastPass | CSV | Custom field mapping (grouping→folder, extra→notes, fav→favorite) |
| `bitwarden_json` | Bitwarden | JSON | Typed items with login/card/identity sub-objects |
| `bitwarden_csv` | Bitwarden | CSV | Generic CSV with header mapping |
| `chrome_csv` | Chrome | CSV | Browser CSV (name, url, username, password) |
| `firefox_csv` | Firefox | CSV | Browser CSV (origin_url variant) |
| `keepass_xml` | KeePass | XML | Regex-based Entry/String/Key/Value extraction |
| `dashlane_json` | Dashlane | JSON | AUTHENTIFIANT/credentials array mapping |

**Type inference.** The import parser determines the entry type from available fields:

1. If `cardNumber` is present and ≥13 characters → `credit_card`
2. If `firstName` and `lastName` are present without `password` or `url` → `identity`
3. If `url`, `username`, or `password` is present → `login`
4. Otherwise → `secure_note` (fallback, with available fields concatenated into the note content)

**CSV parsing.** The CSV parser handles quoted fields containing commas (RFC 4180 compliance), escaped quotes (`""` within quoted fields), and mixed quoting (quoted fields preserve exact content, unquoted fields are trimmed).

**Error handling.** Each record is parsed independently. Failed records are captured in an errors array with the record index and error message, while successfully parsed records are returned normally. This allows partial imports where some records may be malformed without blocking the entire import operation.

**Input compatibility.** The parser accepts both `string` and `ArrayBuffer` inputs, using `TextDecoder` for `ArrayBuffer` conversion. This enables direct integration with the browser's `FileReader` API (`readAsArrayBuffer`) and Node.js file reading (`fs.readFile`).

---

## 8. Audit Logging

### 8.1 Architecture

BrightPass maintains a comprehensive audit trail of all vault and entry operations. The audit logger uses dependency injection via the `IAuditLogStorage` interface, decoupling the logging logic from the storage backend. Implementations can use IndexedDB (browser), the BrightChain block store (decentralized), in-memory storage (testing), or any other backend without modifying the logger.

### 8.2 Audit Actions

The following operations are recorded:

| Action | Trigger | Metadata |
|---|---|---|
| `VAULT_CREATED` | New vault creation | — |
| `VAULT_OPENED` | Vault decryption and access | — |
| `VAULT_DELETED` | Vault destruction | — |
| `VAULT_SHARED` | Vault shared with member | Recipient member ID |
| `VAULT_SHARE_REVOKED` | Sharing permission removed | Revoked member ID |
| `VAULT_UPDATED` | Vault metadata modification | — |
| `VAULT_SEED_REGENERATED` | Vault BIP39 seed cycling | — |
| `ENTRY_CREATED` | New entry added to vault | Entry type |
| `ENTRY_READ` | Entry payload decrypted | Entry ID |
| `ENTRY_UPDATED` | Entry content modified | Entry ID |
| `ENTRY_DELETED` | Entry removed from vault | Entry ID |
| `EMERGENCY_CONFIGURED` | Emergency access setup | Threshold, total shares |
| `EMERGENCY_RECOVERED` | Emergency access exercised | Shares used |
| `BRIGHT_TRUST_CONFIGURED` | BrightTrust binding | — |

### 8.3 Entry Structure

Each audit log entry contains:

- **id**: UUID v4 identifier for the log entry
- **vaultId**: The vault this operation pertains to
- **memberId**: The member who performed the operation
- **action**: One of the `AuditAction` enumeration values
- **timestamp**: UTC timestamp of the operation
- **metadata**: Optional key-value pairs with action-specific details

Audit entries are serialized via the `VaultSerializer` with proper Date-to-ISO-string conversion for JSON compatibility, and deserialized with ISO-string-to-Date reconstruction. The serializer validates required fields (`id`, `vaultId`, `memberId`, `action`) during deserialization, rejecting malformed entries.



---

## 9. Algorithms

This section presents the core algorithms of the BrightPass system in pseudocode. Each algorithm corresponds directly to a production TypeScript implementation and is validated by the correctness properties in Section 13.

### Algorithm 1: Vault Key Derivation

```
FUNCTION DeriveVaultKey(vaultSeed: bytes[64], masterPassword: string,
                        vaultId: string) → bytes[32]
  // Step 1: Encode master password as UTF-8
  passwordBytes ← UTF8.Encode(masterPassword)

  // Step 2: Concatenate vault seed and password as IKM
  ikm ← new bytes[|vaultSeed| + |passwordBytes|]
  ikm[0 .. |vaultSeed|-1] ← vaultSeed
  ikm[|vaultSeed| ..] ← passwordBytes

  // Step 3: Encode vault ID as domain separation info
  info ← UTF8.Encode(vaultId)

  // Step 4: Derive 32-byte key via HKDF-SHA256 (RFC 5869)
  //   Extract: PRK = HMAC-SHA256(key=0x00*32, data=ikm)
  //   Expand:  OKM = HMAC-SHA256(key=PRK, data=info ‖ 0x01)[0..31]
  key ← HKDF(SHA256, ikm, salt=undefined, info, L=32)

  RETURN key    // 32-byte AES-256 key
```

*Implementation: `VaultKeyDerivation.deriveVaultKey()` in `services/brightpass/vaultKeyDerivation.ts`.*

### Algorithm 2: Property Record Serialization

```
FUNCTION SerializePropertyRecord(record: EntryPropertyRecord) → bytes[]
  encoder ← new TextEncoder()
  idBytes ← encoder.encode(record.id ?? "")
  titleBytes ← encoder.encode(record.title)
  tagsBytes ← encoder.encode(record.tags.join(","))
  siteUrlBytes ← encoder.encode(record.siteUrl)

  size ← 2 + |idBytes|           // id length + id
       + 1                        // entryType
       + 2 + |titleBytes|         // title length + title
       + 2 + |tagsBytes|          // tags length + tags
       + 1                        // favorite
       + 8                        // createdAt
       + 8                        // updatedAt
       + 2 + |siteUrlBytes|       // siteUrl length + siteUrl

  buffer ← new bytes[size]
  view ← new DataView(buffer)
  offset ← 0

  // id (2 bytes length prefix + UTF-8 data)
  view.setUint16(offset, |idBytes|, bigEndian)
  offset ← offset + 2
  buffer.set(idBytes, offset)
  offset ← offset + |idBytes|

  // entryType (1 byte: login=0, secure_note=1, credit_card=2, identity=3)
  buffer[offset] ← TypeMap[record.entryType]
  offset ← offset + 1

  // title (2 bytes length prefix + UTF-8 data)
  view.setUint16(offset, |titleBytes|, bigEndian)
  offset ← offset + 2
  buffer.set(titleBytes, offset)
  offset ← offset + |titleBytes|

  // tags (2 bytes length prefix + comma-separated UTF-8)
  view.setUint16(offset, |tagsBytes|, bigEndian)
  offset ← offset + 2
  buffer.set(tagsBytes, offset)
  offset ← offset + |tagsBytes|

  // favorite (1 byte boolean)
  buffer[offset] ← record.favorite ? 1 : 0
  offset ← offset + 1

  // createdAt (8 bytes, milliseconds since epoch)
  view.setBigUint64(offset, BigInt(record.createdAt.getTime()), bigEndian)
  offset ← offset + 8

  // updatedAt (8 bytes, milliseconds since epoch)
  view.setBigUint64(offset, BigInt(record.updatedAt.getTime()), bigEndian)
  offset ← offset + 8

  // siteUrl (2 bytes length prefix + UTF-8 data)
  view.setUint16(offset, |siteUrlBytes|, bigEndian)
  offset ← offset + 2
  buffer.set(siteUrlBytes, offset)

  RETURN buffer
```

*Implementation: `VCBLService.serializePropertyRecord()` in `services/vcblService.ts`.*

### Algorithm 3: Property Record Deserialization

```
FUNCTION DeserializePropertyRecord(data: bytes[], offset: int)
    → {record: EntryPropertyRecord, bytesRead: int}
  REQUIRE offset < |data|
  view ← new DataView(data)
  decoder ← new TextDecoder()
  start ← offset

  // id
  idLength ← view.getUint16(offset, bigEndian)
  offset ← offset + 2
  REQUIRE offset + idLength ≤ |data|
  id ← idLength > 0 ? decoder.decode(data[offset .. offset+idLength-1]) : undefined
  offset ← offset + idLength

  // entryType
  typeValue ← data[offset]
  REQUIRE typeValue ≤ 3
  entryType ← ["login", "secure_note", "credit_card", "identity"][typeValue]
  offset ← offset + 1

  // title
  titleLength ← view.getUint16(offset, bigEndian)
  offset ← offset + 2
  REQUIRE offset + titleLength ≤ |data|
  title ← decoder.decode(data[offset .. offset+titleLength-1])
  offset ← offset + titleLength

  // tags
  tagsLength ← view.getUint16(offset, bigEndian)
  offset ← offset + 2
  REQUIRE offset + tagsLength ≤ |data|
  tagsStr ← decoder.decode(data[offset .. offset+tagsLength-1])
  tags ← tagsStr ? tagsStr.split(",") : []
  offset ← offset + tagsLength

  // favorite
  favorite ← data[offset] = 1
  offset ← offset + 1

  // createdAt
  REQUIRE offset + 8 ≤ |data|
  createdAt ← new Date(Number(view.getBigUint64(offset, bigEndian)))
  offset ← offset + 8

  // updatedAt
  REQUIRE offset + 8 ≤ |data|
  updatedAt ← new Date(Number(view.getBigUint64(offset, bigEndian)))
  offset ← offset + 8

  // siteUrl
  siteUrlLength ← view.getUint16(offset, bigEndian)
  offset ← offset + 2
  REQUIRE offset + siteUrlLength ≤ |data|
  siteUrl ← decoder.decode(data[offset .. offset+siteUrlLength-1])
  offset ← offset + siteUrlLength

  RETURN {
    record: {id, entryType, title, tags, favorite, createdAt, updatedAt, siteUrl},
    bytesRead: offset - start
  }
```

*Implementation: `VCBLService.deserializePropertyRecord()` in `services/vcblService.ts`.*

### Algorithm 4: VCBL Header Construction

```
FUNCTION MakeVcblHeader(creator: Member, vaultName: string,
                        sharedMemberIds: MemberId[],
                        propertyRecords: EntryPropertyRecord[],
                        addressList: bytes[],
                        blockSize: BlockSize,
                        encryptionType: BlockEncryptionType)
    → {headerData: bytes[], signature: SignatureBytes}

  // Validation
  REQUIRE 1 ≤ |vaultName| ≤ 255
  expectedAddressCount ← |addressList| / SHA3_BUFFER_LENGTH
  REQUIRE |propertyRecords| = expectedAddressCount

  encoder ← new TextEncoder()
  vaultNameBytes ← encoder.encode(vaultName)
  ownerIdBytes ← creator.idBytes
  now ← Date.now()

  // Build vault header
  vaultHeaderSize ← 2 + |vaultNameBytes|           // vault name
                   + |ownerIdBytes|                  // owner ID
                   + 8                               // createdAt
                   + 8                               // modifiedAt
                   + 2                               // shared member count
                   + |sharedMemberIds| × |ownerIdBytes|  // shared IDs

  vaultHeader ← new bytes[vaultHeaderSize]
  view ← new DataView(vaultHeader)
  offset ← 0

  // Vault name (length-prefixed UTF-8)
  view.setUint16(offset, |vaultNameBytes|, bigEndian)
  offset ← offset + 2
  vaultHeader.set(vaultNameBytes, offset)
  offset ← offset + |vaultNameBytes|

  // Owner member ID
  vaultHeader.set(ownerIdBytes, offset)
  offset ← offset + |ownerIdBytes|

  // Timestamps
  view.setBigUint64(offset, BigInt(now), bigEndian)
  offset ← offset + 8
  view.setBigUint64(offset, BigInt(now), bigEndian)
  offset ← offset + 8

  // Shared members
  view.setUint16(offset, |sharedMemberIds|, bigEndian)
  offset ← offset + 2
  FOR EACH memberId IN sharedMemberIds DO
    memberIdBytes ← idProvider.toBytes(memberId)
    vaultHeader.set(memberIdBytes, offset)
    offset ← offset + |memberIdBytes|

  // Serialize property records
  propertyRecordsData ← SerializePropertyRecords(propertyRecords)

  // Create Extended CBL header (delegates to CBLService)
  (cblHeaderData, signature) ← CBLService.makeCblHeader(
    creator, new Date(now), expectedAddressCount, 0,
    addressList, blockSize, encryptionType,
    {fileName: vaultName, mimeType: "application/x-brightchain-vcbl"},
    TUPLE_SIZE, lax=true)

  // Assemble: CBL header + address list + vault header + property records
  totalSize ← |cblHeaderData| + |addressList| + |vaultHeader| + |propertyRecordsData|
  result ← new bytes[totalSize]
  resultOffset ← 0
  result.set(cblHeaderData, resultOffset);  resultOffset ← resultOffset + |cblHeaderData|
  result.set(addressList, resultOffset);    resultOffset ← resultOffset + |addressList|
  result.set(vaultHeader, resultOffset);    resultOffset ← resultOffset + |vaultHeader|
  result.set(propertyRecordsData, resultOffset)

  RETURN {headerData: result, signature}
```

*Implementation: `VCBLService.makeVcblHeader()` in `services/vcblService.ts`.*

### Algorithm 5: Password Generation

```
FUNCTION GeneratePassword(options: PasswordGeneratorOptions) → string
  // Validation
  REQUIRE 8 ≤ options.length ≤ 128
  REQUIRE options.uppercase OR options.lowercase OR options.numbers OR options.symbols
  minTotal ← (options.minUppercase ?? 0) + (options.minLowercase ?? 0)
           + (options.minNumbers ?? 0) + (options.minSymbols ?? 0)
  REQUIRE minTotal ≤ options.length

  // Build combined charset
  charset ← ""
  IF options.uppercase THEN charset ← charset + "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  IF options.lowercase THEN charset ← charset + "abcdefghijklmnopqrstuvwxyz"
  IF options.numbers   THEN charset ← charset + "0123456789"
  IF options.symbols   THEN charset ← charset + "!@#$%^&*()_+-=[]{}|;:,.<>?"

  result ← []

  // Phase 1: Satisfy minimum requirements from specific charsets
  IF options.minUppercase THEN
    FOR i ← 0 TO options.minUppercase - 1 DO
      result.append(RandomChar(UPPERCASE))
  IF options.minLowercase THEN
    FOR i ← 0 TO options.minLowercase - 1 DO
      result.append(RandomChar(LOWERCASE))
  IF options.minNumbers THEN
    FOR i ← 0 TO options.minNumbers - 1 DO
      result.append(RandomChar(NUMBERS))
  IF options.minSymbols THEN
    FOR i ← 0 TO options.minSymbols - 1 DO
      result.append(RandomChar(SYMBOLS))

  // Phase 2: Fill remaining positions from combined charset
  WHILE |result| < options.length DO
    result.append(RandomChar(charset))

  // Phase 3: Fisher-Yates shuffle with cryptographic randomness
  FOR i ← |result| - 1 DOWNTO 1 DO
    j ← CryptoRandomInt(i + 1)
    SWAP(result[i], result[j])

  RETURN result.join("")

FUNCTION CryptoRandomInt(max: int) → int
  bytes ← getRandomBytes(4)                 // platform-agnostic CSPRNG
  value ← DataView(bytes).getUint32(0)      // big-endian 32-bit unsigned
  RETURN value MOD max
```

*Implementation: `PasswordGenerator.generate()` in `services/brightpass/passwordGenerator.ts`.*

### Algorithm 6: Import Type Inference

```
FUNCTION InferEntryType(raw: RawRecord) → VaultEntry
  now ← new Date()
  title ← raw.title ?? raw.name ?? "Imported Entry"
  isFavorite ← raw.favorite ∈ {true, "1", "true"}
  tags ← raw.folder ? [raw.folder] : undefined
  base ← {id: UUID(), title, notes: raw.notes, tags, createdAt: now,
           updatedAt: now, favorite: isFavorite}

  // Rule 1: Credit card (card number ≥ 13 digits)
  IF raw.cardNumber AND |raw.cardNumber| ≥ 13 THEN
    RETURN CreditCardEntry{...base, type: "credit_card",
      cardholderName: raw.cardholderName, cardNumber: raw.cardNumber,
      expirationDate: raw.expirationDate, cvv: raw.cvv}

  // Rule 2: Identity (name fields without credentials)
  IF raw.firstName AND raw.lastName AND NOT raw.password AND NOT raw.url THEN
    RETURN IdentityEntry{...base, type: "identity",
      firstName: raw.firstName, lastName: raw.lastName,
      email: raw.email, phone: raw.phone, address: raw.address}

  // Rule 3: Login (any credential-like fields)
  IF raw.url OR raw.username OR raw.password THEN
    RETURN LoginEntry{...base, type: "login",
      siteUrl: raw.url, username: raw.username,
      password: raw.password, totpSecret: raw.totp}

  // Rule 4: Fallback to secure note
  content ← Concatenate(raw.notes, raw.username, raw.password)
  RETURN SecureNoteEntry{...base, type: "secure_note", content}
```

*Implementation: `ImportParser.mapToEntries()` in `services/brightpass/importParser.ts`.*


---

## 10. Storage Integration

### 10.1 Entry-to-TUPLE Pipeline

When a user creates or updates a vault entry, the entry payload must be transformed from an application-layer object into plausibly deniable blocks in the Owner-Free Filesystem. This pipeline proceeds through five stages:

```
VaultEntry → JSON Serialization → AES-256-GCM Encryption → Block Padding
    → TUPLE Whitening → Pool-Scoped Block Store
```

**Stage 1: Serialization.** The `VaultSerializer.serializeEntry()` method converts the typed `VaultEntry` object to a JSON string with explicit Date-to-ISO-string conversion. This produces a deterministic string representation suitable for encryption.

**Stage 2: Encryption.** The serialized JSON is encrypted with AES-256-GCM using the vault key derived by Algorithm 1. The encryption produces a ciphertext, a 12-byte initialization vector (IV), and a 16-byte authentication tag. The IV is generated from the platform CSPRNG for each encryption operation, ensuring that encrypting the same entry twice produces different ciphertexts.

**Stage 3: Block Padding.** The encrypted payload is padded to the nearest BrightChain block size boundary using the `BlockPaddingTransform`. This ensures that all entry blocks are uniform in size, preventing an observer from inferring entry type or content length from block size.

**Stage 4: TUPLE Whitening.** The padded encrypted block D is XOR-whitened with two cryptographically random blocks R₁ and R₂ of the same size:

```
W = D ⊕ R₁ ⊕ R₂
```

The triple (W, R₁, R₂) is stored as a TUPLE. The original encrypted block D is discarded. To reconstruct: D = W ⊕ R₁ ⊕ R₂.

**Stage 5: Pool-Scoped Storage.** All three TUPLE components are stored in the same storage pool, ensuring pool-scoped whitening isolation. The TUPLE's block IDs (SHA3-512 hashes of each component) are recorded in the VCBL's address list.

### 10.2 Entry Retrieval Pipeline

Retrieval reverses the pipeline:

```
FUNCTION RetrieveEntry(vcblBlock: VCBLBlock, entryIndex: int,
                       vaultKey: bytes[32]) → VaultEntry
  // Step 1: Get the TUPLE block ID from the VCBL address list
  tupleBlockId ← vcblBlock.getAddress(entryIndex)

  // Step 2: Retrieve TUPLE components from block store
  (W, R₁, R₂) ← BlockStore.getTuple(tupleBlockId)

  // Step 3: Reconstruct encrypted block via XOR
  encryptedBlock ← W ⊕ R₁ ⊕ R₂

  // Step 4: Remove padding
  encryptedPayload ← RemovePadding(encryptedBlock)

  // Step 5: Decrypt with vault key
  (iv, ciphertext, authTag) ← ParseEncryptedPayload(encryptedPayload)
  jsonString ← AES-256-GCM.Decrypt(ciphertext, vaultKey, iv, authTag)

  // Step 6: Deserialize
  entry ← VaultSerializer.deserializeEntry(jsonString)

  RETURN entry
```

### 10.3 Storage Cost Analysis

Each vault entry requires one TUPLE (3 blocks) for the entry payload. The VCBL block itself is also stored as a TUPLE (3 blocks). For a vault with N entries:

- **Entry storage:** N × 3 blocks (one TUPLE per entry)
- **VCBL storage:** 1 × 3 blocks (the VCBL itself as a TUPLE)
- **Total blocks:** 3N + 3

With BrightChain's default Medium block size (64 KB), a vault with 100 entries requires 303 blocks × 64 KB = ~19.5 MB of raw storage. This is approximately 5× the storage of an equivalent unwhitened, unencrypted database — the same overhead ratio as all BrightChain TUPLE storage, which is a deliberate tradeoff of cheap storage bytes for plausible deniability.

### 10.4 Metadata-Only Access Pattern

A critical performance property of the VCBL architecture is that vault listing and entry search operations do not require retrieving or decrypting entry payloads. The VCBL block contains all property records inline, so the following operations require only the VCBL block itself:

- **List all entries:** Parse the property records array from the VCBL block
- **Search by title/tag/type:** Filter property records in memory
- **Display favorites:** Filter property records where `favorite = 1`
- **Sort by date:** Sort property records by `createdAt` or `updatedAt`

Only when the user explicitly opens an entry (to view or copy a password, credit card number, or secure note) does the system retrieve and decrypt the corresponding TUPLE block. This lazy decryption pattern minimizes the attack surface — entry payloads are decrypted only on demand and can be erased from memory immediately after use.

---

## 11. Vault Sharing Protocol

### 11.1 Multi-Recipient Key Wrapping

BrightPass supports sharing vaults with other BrightChain members. The sharing protocol uses ECIES key wrapping to distribute the vault encryption key to authorized recipients without re-encrypting the vault contents:

```
FUNCTION ShareVault(vaultId: string, vaultKey: bytes[32],
                    recipientMemberIds: MemberId[],
                    ownerPrivateKey: bytes[32]) → void

  FOR EACH recipientId IN recipientMemberIds DO
    recipientPubKey ← LookupPublicKey(recipientId)

    // Wrap the vault key under the recipient's ECIES public key
    wrappedKey ← ECIES.Encrypt(recipientPubKey, vaultKey)

    // Store the wrapped key as a block in the vault's storage pool
    StoreWrappedKey(vaultId, recipientId, wrappedKey)

    // Update the VCBL's shared member list
    AddSharedMember(vaultId, recipientId)

    AuditLog(vaultId, VAULT_SHARED, {recipientId})

  // Regenerate the VCBL block with updated shared member list
  RegenerateVcblBlock(vaultId)
```

**Key wrapping properties:**
- The vault contents are encrypted once; only the 32-byte vault key is re-encrypted per recipient
- Each recipient's wrapped key is encrypted under their unique ECIES public key
- Revoking access requires regenerating the vault key (seed cycling) and re-wrapping for remaining authorized members

### 11.2 Access Revocation

When a member's access is revoked, the vault seed must be regenerated to prevent the revoked member from using their previously obtained vault key:

```
FUNCTION RevokeAccess(vaultId: string, revokedMemberId: MemberId,
                      ownerPrivateKey: bytes[32],
                      masterPassword: string) → void

  // Step 1: Generate new vault seed
  newMnemonic ← BIP39.GenerateMnemonic(256)
  newVaultSeed ← BIP39.MnemonicToSeed(newMnemonic)

  // Step 2: Derive new vault key
  newVaultKey ← DeriveVaultKey(newVaultSeed, masterPassword, vaultId)

  // Step 3: Re-encrypt all entry payloads with new key
  FOR EACH entry IN vault.entries DO
    plaintext ← DecryptEntry(entry, oldVaultKey)
    newCiphertext ← AES-256-GCM.Encrypt(plaintext, newVaultKey)
    StoreTuple(newCiphertext)

  // Step 4: Re-wrap key for remaining authorized members (excluding revoked)
  FOR EACH memberId IN vault.sharedWith WHERE memberId ≠ revokedMemberId DO
    recipientPubKey ← LookupPublicKey(memberId)
    wrappedKey ← ECIES.Encrypt(recipientPubKey, newVaultKey)
    StoreWrappedKey(vaultId, memberId, wrappedKey)

  // Step 5: Update VCBL with new addresses and remove revoked member
  RemoveSharedMember(vaultId, revokedMemberId)
  RegenerateVcblBlock(vaultId)

  AuditLog(vaultId, VAULT_SHARE_REVOKED, {revokedMemberId})
  AuditLog(vaultId, VAULT_SEED_REGENERATED)

  EraseFromMemory(oldVaultKey, newVaultKey, newVaultSeed)
```

The revocation protocol is necessarily expensive (O(N) re-encryption for N entries) because the revoked member may have cached the old vault key. This is the same cost model as key rotation in any shared-secret system.

---

## 12. Security Analysis

### 12.1 Storage Layer: Plausible Deniability

All BrightPass data — VCBL blocks, entry payload blocks, and their randomizer blocks — is stored as XOR-whitened TUPLEs in the BrightChain block store. Per BrightChain's Theorem 1 (Plausible Deniability), for any whitened block W and any candidate plaintext D', there exist randomizer blocks R₁', R₂' such that D' ⊕ R₁' ⊕ R₂' = W. This means a node operator cannot prove that any block in their storage contains password data, even under compulsion.

**Claim 1 (Block-Level Indistinguishability).** An adversary with access to the block store cannot distinguish BrightPass vault blocks from any other BrightChain blocks (file storage, messages, governance data, random whitening material).

*Argument.* All blocks in the store are the output of XOR whitening with cryptographically random components. The SHA3-512 block IDs are computed from the whitened content, which is indistinguishable from random data under the assumption that the randomizer blocks are drawn from a CSPRNG. The MIME type `application/x-brightchain-vcbl` is embedded within the encrypted VCBL block content, not in any external metadata visible to the storage layer.

### 12.2 Vault Key Security

**Claim 2 (Vault Key Unrecoverability).** An attacker who obtains the encrypted vault (VCBL block and referenced TUPLE blocks) but not the vault seed or master password cannot derive the vault key.

*Argument.* The vault key is derived as `VaultKey = HKDF-SHA256(VaultSeed ‖ MasterPassword, ∅, VaultId, 32)`. The attacker must either:

1. **Recover the VaultSeed** (512 bits of entropy from BIP39) from the ECIES-encrypted seed stored in the vault metadata. This requires solving the Elliptic Curve Discrete Logarithm Problem on secp256k1, which requires ~2^128 operations.
2. **Brute-force the HKDF output.** The output is a 256-bit key; exhaustive search requires 2^256 operations.
3. **Invert HKDF.** HKDF is a PRF under the assumption that HMAC-SHA256 is a PRF [13]. Inverting HKDF requires inverting HMAC, which is infeasible under the PRF assumption.
4. **Obtain both inputs** through non-cryptographic means (social engineering, device compromise, etc.).

### 12.3 Vault Isolation

**Claim 3 (Cross-Vault Independence).** Compromise of vault A's seed reveals no information about vault B's seed or key.

*Argument.* Each vault's BIP39 seed is generated from an independent invocation of the CSPRNG (256 bits of entropy → 24-word mnemonic → 64-byte seed). The seeds share no algebraic relationship. Even if an attacker recovers vault A's seed and master password, they obtain only `HKDF(SeedA ‖ Password, ∅, VaultIdA, 32)`. The domain separation via the `info` parameter ensures that this reveals nothing about `HKDF(SeedB ‖ Password, ∅, VaultIdB, 32)`, because HKDF outputs for different `info` values are computationally independent under the PRF assumption.

### 12.4 Breach Detection Privacy

**Claim 4 (k-Anonymity of Breach Checks).** The HIBP API operator learns at most a 5-character SHA-1 hash prefix from each breach check, which is consistent with approximately 2^35 / 16^5 ≈ 2^15 possible passwords.

*Argument.* The SHA-1 hash space is 160 bits (2^160 possible hashes). The 5-character hex prefix partitions this space into 16^5 = 2^20 buckets, each containing approximately 2^140 possible hashes. The API operator learns which bucket the password falls into but cannot determine the specific hash (let alone the password) from the prefix alone. The remaining 35 hex characters (140 bits) are compared locally and never transmitted.

### 12.5 Emergency Access Security

**Claim 5 (Threshold Security of Emergency Access).** Any set of fewer than k shares reveals zero information about the vault key.

*Argument.* Shamir's Secret Sharing [11] provides information-theoretic security: the secret is encoded as the constant term of a degree-(k-1) polynomial over a finite field, and any k-1 or fewer points on the polynomial are consistent with every possible value of the constant term. This guarantee holds regardless of the attacker's computational resources — it is unconditional, not dependent on any hardness assumption.

**Claim 6 (Share Confidentiality).** An attacker who obtains encrypted shares from the block store cannot recover the plaintext shares without the trustees' ECIES private keys.

*Argument.* Each share is encrypted under the trustee's ECIES public key (secp256k1 + AES-256-GCM). Recovering the plaintext share requires either the trustee's private key or solving the ECDLP on secp256k1 (~2^128 operations). The combination of information-theoretic threshold security (Claim 5) and computational share confidentiality (Claim 6) provides defense in depth.

### 12.6 TOTP Security

**Claim 7 (TOTP Secret Confidentiality).** TOTP secrets are protected by the same encryption and plausible deniability guarantees as all other vault entry data.

*Argument.* TOTP secrets are stored as the `totpSecret` field within `LoginEntry` objects, which are serialized, encrypted with AES-256-GCM under the vault key, padded, and whitened into TUPLEs. An attacker must break the vault key derivation (Claim 2) to access the TOTP secret. The TOTP validation window of ±1 period (default) limits the time window for code reuse to approximately 90 seconds.

### 12.7 Password Generation Security

**Claim 8 (Uniform Distribution of Generated Passwords).** The Fisher-Yates shuffle with cryptographic random indices produces a uniform distribution over all permutations of the character array.

*Argument.* The Fisher-Yates shuffle is a well-known algorithm that produces each of the n! permutations with equal probability, provided the random index selection is uniform [15]. BrightPass uses `getRandomBytes(4)` from the platform CSPRNG, interpreted as a 32-bit unsigned integer. For the character set sizes used (maximum 128 characters), the modular reduction `uint32 % max` introduces a bias of at most `max / 2^32 < 128 / 2^32 ≈ 2^-25`, which is negligible for password generation purposes.

### 12.8 Import Security

**Claim 9 (No Credential Persistence During Import).** Imported credentials exist in plaintext memory only during the import operation and are encrypted into TUPLE blocks before the import function returns.

*Argument.* The `ImportParser.parse()` function returns `VaultEntry` objects in memory. The calling code is responsible for encrypting each entry via the entry-to-TUPLE pipeline (Section 10.1) and erasing the plaintext from memory. The import parser itself does not persist any data — it is a pure transformation from input format to `VaultEntry` objects.

---

## 13. Correctness Properties

We define 18 machine-verifiable correctness properties organized into five categories. Each property maps to one or more algorithms from Section 9 and corresponds to test implementations in the production codebase.

### 13.1 Serialization Round-Trip Properties (Properties 1-4)

*Algorithms validated: 2 (SerializePropertyRecord), 3 (DeserializePropertyRecord), 4 (MakeVcblHeader). Test files: `vcblService.property.spec.ts`, `vaultSerializer.spec.ts`.*

**Property 1 (Property Record Round-Trip).** For any valid `EntryPropertyRecord`, serializing (Algorithm 2) and deserializing (Algorithm 3) produces an equivalent record with identical field values.

**Property 2 (Entry Serialization Round-Trip).** For any valid `VaultEntry`, `VaultSerializer.serializeEntry()` followed by `VaultSerializer.deserializeEntry()` produces an equivalent entry with Date fields correctly reconstructed from ISO strings.

**Property 3 (Audit Log Serialization Round-Trip).** For any valid `AuditLogEntry`, `VaultSerializer.serializeAuditLog()` followed by `VaultSerializer.deserializeAuditLog()` produces an equivalent entry.

**Property 4 (Index Alignment Enforcement).** For any VCBL construction where `|propertyRecords| ≠ |addressList| / SHA3_BUFFER_LENGTH`, Algorithm 4 raises a `CblError` with type `InvalidStructure`.

### 13.2 Key Derivation Properties (Properties 5-8)

*Algorithms validated: 1 (DeriveVaultKey). Test files: `vaultKeyDerivation.property.spec.ts`.*

**Property 5 (Deterministic Derivation).** For any fixed (vaultSeed, masterPassword, vaultId), Algorithm 1 always produces the same 32-byte key.

**Property 6 (Domain Separation).** For any fixed (vaultSeed, masterPassword) and two distinct vault IDs, Algorithm 1 produces distinct keys.

**Property 7 (Seed Independence).** For any two distinct vault seeds with the same master password and vault ID, Algorithm 1 produces distinct keys.

**Property 8 (Password Binding).** For any fixed (vaultSeed, vaultId) and two distinct master passwords, Algorithm 1 produces distinct keys.

### 13.3 Password Generation Properties (Properties 9-12)

*Algorithms validated: 5 (GeneratePassword). Test files: `passwordGenerator.property.spec.ts`, `passwordGenerator.spec.ts`.*

**Property 9 (Length Compliance).** For any valid options, Algorithm 5 produces a password of exactly `options.length` characters.

**Property 10 (Minimum Requirements Satisfaction).** For any valid options with minimum counts, Algorithm 5 produces a password containing at least the specified number of characters from each required character set.

**Property 11 (Validation Rejection).** Algorithm 5 rejects options with length < 8, length > 128, no enabled character sets, or minimum counts exceeding length.

**Property 12 (Non-Determinism).** Two successive calls to Algorithm 5 with identical options produce different passwords (with overwhelming probability, since the CSPRNG produces distinct random bytes).

### 13.4 Import Properties (Properties 13-16)

*Algorithms validated: 6 (InferEntryType). Test files: `importParser.property.spec.ts`.*

**Property 13 (Type Inference Correctness).** Records with `cardNumber.length ≥ 13` are classified as `credit_card`. Records with `firstName` and `lastName` but no `password` or `url` are classified as `identity`. Records with `url`, `username`, or `password` are classified as `login`. All other records are classified as `secure_note`.

**Property 14 (Partial Import Resilience).** For any input containing both valid and malformed records, the parser returns all successfully parsed entries alongside an errors array for failed records, without aborting the entire import.

**Property 15 (CSV Quoted Field Handling).** CSV fields containing commas, when enclosed in double quotes, are parsed as single fields with the commas preserved in the field value.

**Property 16 (Format Coverage).** Each of the nine supported import formats (`1password_1pux`, `1password_csv`, `lastpass_csv`, `bitwarden_json`, `bitwarden_csv`, `chrome_csv`, `firefox_csv`, `keepass_xml`, `dashlane_json`) produces valid `VaultEntry` arrays from well-formed input.

### 13.5 TOTP Properties (Properties 17-18)

*Algorithms validated: TOTPEngine methods. Test files: `totpEngine.property.spec.ts`.*

**Property 17 (TOTP Generation-Validation Round-Trip).** For any secret generated by `TOTPEngine.createSecret()`, a code generated by `TOTPEngine.generate(secret)` is accepted by `TOTPEngine.validate(code, secret)` within the same time period.

**Property 18 (TOTP Window Rejection).** A code generated for time T is rejected by `TOTPEngine.validate()` when validated at time T + (window + 1) × period, where window and period are the configured tolerance and period values.


---

## 14. Implementation

### 14.1 Architecture

BrightPass is implemented as a set of TypeScript modules distributed across the BrightChain monorepo, following the workspace convention of separating shared interfaces from platform-specific implementations:

| Module | Package | Files | Responsibility |
|---|---|---|---|
| Interfaces | `brightchain-lib/interfaces/brightpass/` | 11 | Type definitions: VaultEntry (4 types), VaultMetadata, EntryPropertyRecord, AuditLog, BreachCheck, PasswordGeneration, TOTP, EmergencyAccess, ImportTypes, BrightPassError |
| Services | `brightchain-lib/services/brightpass/` | 7 | VaultKeyDerivation, VaultSerializer, PasswordGenerator, TOTPEngine, BreachDetector, AuditLogger, ImportParser |
| Block Types | `brightchain-lib/blocks/vcbl.ts` | 1 | VCBLBlock class extending ExtendedCBL |
| VCBL Service | `brightchain-lib/services/vcblService.ts` | 1 | Binary serialization, capacity calculation, block size recommendation |
| Enumerations | `brightpass-lib/enumerations/` | varies | BrightPass-specific enum types |
| i18n | `brightpass-lib/i18n/` | varies | Internationalization strings |

### 14.2 Class Hierarchy

The VCBL block type extends BrightChain's block hierarchy:

```
BaseBlock
  └── ConstituentBlockListBlock (CBL)
        └── ExtendedCBL (adds fileName, mimeType)
              └── VCBLBlock (adds vault header, property records)
```

The `VCBLBlock` class overrides `validateSync()` and `validateAsync()` to enforce the index alignment invariant (Property 4) and VCBL-specific structural validation. It delegates vault header and property record parsing to the `VCBLService`, maintaining separation between the block abstraction and the serialization logic.

### 14.3 Platform Compatibility

All BrightPass modules are designed for cross-platform operation:

- **Cryptography**: Uses `@noble/hashes` for SHA-1 (breach detection) and SHA-256 (HKDF), and the `platformCrypto` abstraction for random byte generation, providing identical behavior in browser and Node.js environments. The `platformCrypto` module delegates to `crypto.getRandomValues()` (browser Web Crypto API) or `crypto.randomBytes()` (Node.js), with a unified `getRandomBytes(n)` interface.
- **TOTP**: Uses the `otpauth` library for RFC 6238 operations and `qrcode` for QR code generation, both of which are browser-compatible.
- **Import parsing**: Accepts `ArrayBuffer | string` inputs with `TextDecoder` for browser `FileReader` compatibility. The KeePass XML parser uses regex-based extraction rather than a DOM parser to avoid browser/Node.js XML API differences.
- **Serialization**: Uses `JSON.stringify`/`JSON.parse` with explicit Date-to-ISO-string conversion, avoiding Node.js-specific APIs. Binary serialization uses `Uint8Array` and `DataView` exclusively (no Node.js `Buffer`).
- **Audit storage**: The `IAuditLogStorage` interface enables pluggable backends (IndexedDB for browser, BrightDB for decentralized, in-memory for testing) via constructor injection.

### 14.4 Entry Types

BrightPass supports four entry types, each with type-specific fields:

- **Login** (`LoginEntry`): Site URL, username, password, optional TOTP secret, plus base fields (title, notes, tags, favorite, attachments, timestamps).
- **Secure Note** (`SecureNoteEntry`): Free-form text content.
- **Credit Card** (`CreditCardEntry`): Cardholder name, card number, expiration date, CVV.
- **Identity** (`IdentityEntry`): First name, last name, optional email, phone, address.

All entry types share a common base (`VaultEntryBase`) with id, type discriminator, title, notes, tags, timestamps, favorite flag, and optional attachment references. Attachments are stored as separate blocks in the block store, referenced by `BlockId` with a boolean `isCbl` flag indicating whether the attachment is a single block or a CBL (for large attachments exceeding a single block size).

### 14.5 Generic Type Parameters

Following the workspace convention for frontend/backend type compatibility, BrightPass interfaces use generic type parameters:

```typescript
interface IDecryptedVault<TID = string> {
  metadata: {
    id: TID;
    name: string;
    ownerId: TID;
    // ...
  };
  propertyRecords: EntryPropertyRecord[];
}

interface IAutofillPayload<TID = string> {
  vaultId: TID;
  entries: Array<{
    entryId: TID;
    // ...
  }>;
}
```

The frontend uses `IDecryptedVault<string>` (default), while the backend uses `IDecryptedVault<GuidV4Buffer>`. This pattern, consistent with the workspace's `IBaseData<TData>` convention, enables a single interface definition to serve both environments without runtime type conversion at the API boundary.

### 14.6 Dependencies

The cryptographic foundation relies on audited, well-maintained libraries:

- `@noble/hashes` (SHA-1, SHA-256, HKDF) — pure JavaScript, no native dependencies, audited by Cure53
- `@digitaldefiance/ecies-lib` — ECIES, AES-GCM, platform ID types built on the Noble suite
- `otpauth` — RFC 6238 TOTP implementation
- `qrcode` — QR code generation for TOTP setup
- `uuid` — UUID v4 generation for entry and audit log identifiers

### 14.7 Testing Infrastructure

The test suite comprises unit tests and property-based tests:

- **Property-based tests:** 18 properties (Section 13), each running multiple iterations via `fast-check`, covering all algorithms from Section 9
- **Unit tests:** Edge cases (empty vaults, maximum-length vault names, boundary block sizes), error conditions (invalid entry types, malformed CSV, corrupted binary data), and service-level tests (VaultKeyDerivation, VaultSerializer, PasswordGenerator, TOTPEngine, BreachDetector, AuditLogger, ImportParser, VCBLService)
- **Integration tests:** End-to-end vault lifecycle tests exercising creation, entry addition, VCBL construction, TUPLE whitening, retrieval, and decryption using live cryptographic implementations

---

## 15. Limitations and Future Work

### 15.1 Current Limitations

**Key derivation cost.** BrightPass uses HKDF-SHA256 rather than a memory-hard KDF (Argon2id) for vault key derivation. This is appropriate when the vault seed provides sufficient entropy (512 bits from BIP39), but if a user's master password is weak and the vault seed is compromised, the fast HKDF derivation does not provide the brute-force resistance that Argon2id would. A future version could optionally layer Argon2id on top of HKDF for users who prefer defense-in-depth against partial key material compromise.

**Offline breach detection.** The current breach detection requires network access to the HIBP API. A future version could maintain a local Bloom filter of known breached password hashes (the HIBP database is available for download), enabling offline breach checking with a configurable false positive rate. The Bloom filter could be stored as a BrightChain block and updated via the gossip protocol.

**Conflict resolution.** When multiple devices modify the same vault concurrently, the current architecture relies on BrightChain's block-level conflict resolution (last-write-wins at the VCBL level). A future version could implement CRDT-based (Conflict-free Replicated Data Type) merge strategies for concurrent entry additions and modifications, using the entry ID as the merge key and timestamp-based last-writer-wins for individual field conflicts.

**Modular arithmetic bias.** The password generator's `randomInt(max)` function uses `uint32 % max`, which introduces a slight bias when `max` does not evenly divide 2^32. For the character set sizes used (26, 10, 27, 89), the bias is negligible (< 2^-25), but a future version could use rejection sampling for perfect uniformity.

**JavaScript memory erasure.** Like all JavaScript-based cryptographic applications, BrightPass cannot guarantee that sensitive data (vault keys, decrypted passwords) is erased from memory after use. The garbage collector may copy buffers before they are overwritten. WebAssembly-based secure memory or integration with hardware-backed key storage (WebAuthn, platform secure enclaves) could provide stronger guarantees.

### 15.2 Future Work

**Passkey/WebAuthn integration.** Storing and managing FIDO2 passkeys alongside traditional credentials, enabling BrightPass to serve as a unified credential manager for both password-based and passwordless authentication.

**Secure entry-level sharing.** A protocol for sharing individual entries (rather than entire vaults) with non-BrightChain users via ephemeral ECIES key pairs and time-limited access tokens, with URL-fragment key transport (the decryption key is placed in the URL fragment, which is never sent to the server).

**Vault versioning.** Maintaining a history of vault states as a chain of VCBL blocks, enabling point-in-time recovery and entry-level undo. Each VCBL block would reference its predecessor, forming an append-only history that inherits the plausible deniability of the underlying TUPLE storage.

**Hardware security module integration.** Storing vault seeds in HSMs or secure enclaves (TPM, Apple Secure Enclave, Android Keystore) rather than software-encrypted storage, providing hardware-backed protection against memory extraction attacks.

**Formal verification.** The 18 correctness properties are validated through property-based testing, but formal machine-checked proofs (e.g., in Coq or Lean) would provide stronger guarantees. The HKDF key derivation and VCBL serialization are particularly amenable to formal verification due to their deterministic, pure-function nature.

**Breach detection integration with Digital Burnbag.** Combining BrightPass breach detection with Digital Burnbag's canary protocol engine to automatically trigger vault key rotation when a breach is detected for a stored credential's associated service.

---

## 16. Conclusion

BrightPass demonstrates that a full-featured password manager can be built on a privacy-preserving decentralized block store without sacrificing the usability features users expect from commercial alternatives. The VCBL block architecture — a novel extension of BrightChain's Constituent Block List hierarchy — provides efficient O(1) metadata access without payload decryption by co-locating vault header data and per-entry property records alongside the block address list in a deterministic binary format. The per-vault HKDF-SHA256 key derivation from independent BIP39 seeds provides cryptographic isolation between vaults, seed cycling without identity re-keying, and domain separation via vault ID binding. The integration with BrightChain's TUPLE storage model provides plausible deniability at the storage layer — a property no existing password manager offers.

The system supports the complete feature set expected of modern password managers: four credential entry types with TOTP two-factor authentication, k-anonymity breach detection preserving password privacy, cryptographically secure password generation with Fisher-Yates shuffling, Shamir's Secret Sharing-based emergency access with ECIES-encrypted share distribution, comprehensive audit logging with pluggable storage backends, and import from nine major password manager formats with graceful partial-failure handling. The vault sharing protocol enables multi-recipient access via ECIES key wrapping without re-encrypting vault contents, and the access revocation protocol provides forward secrecy through seed regeneration.

The 18 correctness properties formalized in Section 13, validated through property-based testing, provide empirical evidence that the serialization, key derivation, password generation, import, and TOTP subsystems behave correctly across their input domains. The 9 security claims in Section 12, grounded in the hardness of the ECDLP, the PRF assumption for HMAC-SHA256, and the information-theoretic security of Shamir's Secret Sharing, establish that BrightPass provides defense in depth from the storage layer (plausible deniability) through the encryption layer (AES-256-GCM with HKDF-derived keys) to the application layer (per-entry isolation, breach detection, emergency access).

BrightPass stores all credential data in a decentralized network where no single operator can access, correlate, or be compelled to produce user credentials. In a landscape where centralized password manager breaches have exposed millions of encrypted vaults to offline attack, this architectural property is not merely a theoretical advantage — it is a practical necessity.

---

## References

[1] AgileBits, "1Password Security Design," https://1passwordstatic.com/files/security/1password-white-paper.pdf, 2023.

[2] LogMeIn, "LastPass Technical Whitepaper," https://www.lastpass.com/security, 2022.

[3] Bitwarden, "Bitwarden Security Whitepaper," https://bitwarden.com/help/bitwarden-security-white-paper/, 2024.

[4] K. Toubba, "Notice of Recent Security Incident," LastPass Blog, December 2022.

[5] D. Reichl, "KeePass Password Safe," https://keepass.info/, 2003-2024.

[6] J. Mulein, "BrightChain: A Unified Cryptographic Platform for Privacy-Preserving Decentralized Applications," Digital Defiance, 2025.

[7] J. A. Donenfeld, "pass: The Standard Unix Password Manager," https://www.passwordstore.org/, 2012.

[8] G. Music, "LessPass: Stateless Password Manager," https://www.lesspass.com/, 2016.

[9] Padloc, "Padloc: Open Source Password Manager," https://padloc.app/, 2020.

[10] T. Hunt, "Have I Been Pwned: Pwned Passwords," https://haveibeenpwned.com/Passwords, 2017.

[11] A. Shamir, "How to Share a Secret," Communications of the ACM, vol. 22, no. 11, pp. 612-613, 1979.

[12] D. M'Raihi, S. Machani, M. Pei, and J. Rydell, "TOTP: Time-Based One-Time Password Algorithm," RFC 6238, IETF, May 2011.

[13] H. Krawczyk and P. Eronen, "HMAC-based Extract-and-Expand Key Derivation Function (HKDF)," RFC 5869, IETF, May 2010.

[14] NIST, "Recommendation for Key Management: Part 1 — General," NIST Special Publication 800-57, May 2020.

[15] R. Durstenfeld, "Algorithm 235: Random Permutation," Communications of the ACM, vol. 7, no. 7, p. 420, 1964.

[16] The Owner-Free Filesystem Project, "OFF System," https://offsystem.sourceforge.net, 2006.