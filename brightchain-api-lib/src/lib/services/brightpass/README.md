# BrightPass Password Manager

BrightPass is an enterprise-grade password keychain system built on BrightChain's encrypted block storage infrastructure. It provides vault management, credential CRUD, password generation, TOTP/2FA, breach detection, audit logging, emergency access, and import from popular password managers.

## Architecture

```
BrightPassController (API Layer)
  └── BrightPassService (Core Logic)
        ├── IBlockStore (swappable storage backend)
        ├── VCBLService (VCBL operations)
        ├── VaultEncryption (AES-256-GCM encryption)
        ├── VaultKeyDerivation (BIP39 + HKDF-SHA256)
        ├── VaultSerializer (JSON serialization/validation)
        ├── PasswordGenerator (cryptographic password generation)
        ├── TOTPEngine (TOTP codes via otpauth + QR via qrcode)
        ├── BreachDetector (HIBP k-anonymity check)
        ├── AuditLogger (append-only encrypted audit trail)
        └── ImportParser (multi-format import)
```

### Block Store Integration

BrightPass uses BrightChain's `IBlockStore` interface for persistent storage:

```typescript
// Testing (in-memory)
const blockStore = new MemoryBlockStore(BlockSize.Small);
const service = new BrightPassService(blockStore, vcblService, blockService, member);

// Production (disk-based) - drop-in replacement
const blockStore = new DiskBlockAsyncStore('/path/to/storage', BlockSize.Small);
const service = new BrightPassService(blockStore, vcblService, blockService, member);
```

### VCBL Storage Model

Storage uses the VCBL (Vault Constituent Block List), extending BrightChain's `ExtendedCBL` with a vault header and parallel `EntryPropertyRecord` array. This enables vault listing, searching, and filtering without decrypting individual entries.

- **VCBL Block**: Contains vault header, property records, and entry block addresses
- **Entry Blocks**: Individual encrypted blocks containing full credential data
- **Attachment Blocks**: Large files stored as encrypted blocks or CBLs

## Security Model

### Encryption (Hybrid Model - Industry Standard)

BrightPass uses the same hybrid encryption model as 1Password and Bitwarden:

**Symmetric (AES-256-GCM)**: Used for vault entries
- 12-byte IV (NIST SP 800-38D compliant)
- 16-byte authentication tag
- Fast and efficient for bulk data

**Asymmetric (ECIES)**: Used for key sharing and audit logs
- Vault key wrapped with recipient's public key when sharing
- Audit logs encrypted with system member's public key

### Key Derivation

Each vault has its own independent BIP39 mnemonic (24 words, 256-bit entropy):

```
Vault BIP39 Seed + Master Password
         ↓
    HKDF-SHA256 (with vault ID as info)
         ↓
   32-byte AES-256 Key
```

**Security Properties:**
- Independent: Each vault has its own BIP39 mnemonic
- Rotatable: `regenerateVaultSeed()` creates new mnemonic and re-encrypts all entries
- Domain separation: Vault ID prevents key reuse
- Forward secrecy: Master password change → new key derivation

### Password Hashing

Master passwords are hashed using bcrypt with 12 rounds (~300ms per hash):
- Constant-time comparison via `bcrypt.compare()`
- Salt automatically included by bcrypt
- Resistant to brute-force attacks

## API Endpoints

All endpoints are mounted under `/brightpass` and require JWT authentication.

### Vault CRUD

| Method | Path | Description |
|--------|------|-------------|
| POST | `/vaults` | Create a new vault |
| GET | `/vaults` | List all vaults for the authenticated member |
| POST | `/vaults/:vaultId/open` | Open (decrypt) a vault |
| DELETE | `/vaults/:vaultId` | Delete a vault and all its entries |

### Entry CRUD

| Method | Path | Description |
|--------|------|-------------|
| POST | `/vaults/:vaultId/entries` | Add an entry to a vault |
| GET | `/vaults/:vaultId/entries/:entryId` | Get a specific entry |
| PUT | `/vaults/:vaultId/entries/:entryId` | Update an entry |
| DELETE | `/vaults/:vaultId/entries/:entryId` | Delete an entry |
| POST | `/vaults/:vaultId/search` | Search entries by title, type, tags, URL |

### Utilities

| Method | Path | Description |
|--------|------|-------------|
| POST | `/generate-password` | Generate a password with configurable options |
| POST | `/totp/generate` | Generate a TOTP code from a secret |
| POST | `/totp/validate` | Validate a TOTP code |
| POST | `/breach-check` | Check a password against HIBP (k-anonymity) |
| POST | `/vaults/:vaultId/autofill` | Get autofill payload for a site URL |
| GET | `/vaults/:vaultId/audit-log` | Get vault audit log entries |

### Sharing

| Method | Path | Description |
|--------|------|-------------|
| POST | `/vaults/:vaultId/share` | Share vault with other members |
| POST | `/vaults/:vaultId/revoke-share` | Revoke a member's vault access |

### Emergency Access

| Method | Path | Description |
|--------|------|-------------|
| POST | `/vaults/:vaultId/emergency-access` | Configure Shamir secret sharing |
| POST | `/vaults/:vaultId/emergency-recover` | Recover vault with threshold shares |

### Import

| Method | Path | Description |
|--------|------|-------------|
| POST | `/vaults/:vaultId/import` | Import entries from external password manager |

## Entry Types

BrightPass supports four entry types:

- **login** — URL, username, password, optional TOTP secret
- **secure_note** — Free-form encrypted text
- **credit_card** — Cardholder name, number, expiration, CVV
- **identity** — First/last name, email, phone, address

## Password Generation

Configurable options:
- Length: 8–128 characters
- Character sets: uppercase, lowercase, digits, symbols
- Minimum counts per character set
- Fisher-Yates shuffle using `crypto.randomBytes`

## Breach Detection

Uses the Have I Been Pwned API with k-anonymity:
1. SHA-1 hash the password
2. Send only the first 5 characters of the hash to the API
3. Compare the remaining 35 characters locally
4. Gracefully handles API unavailability

## Import Formats

Supported formats: 1Password (1PUX, CSV), LastPass CSV, Bitwarden (JSON, CSV), Chrome CSV, Firefox CSV, KeePass XML, Dashlane JSON.

Records are mapped to entry types based on their fields:
- Records with URL + username + password → `login`
- Records with card number + CVV → `credit_card`
- Records with first/last name → `identity`
- Everything else → `secure_note`

## Emergency Access

Uses Shamir's Secret Sharing (`@digitaldefiance/secrets`) to split the vault key into N shares with a configurable threshold T:

- Minimum threshold: 2 (enforced for security)
- Constant-time comparison for share verification
- Revocation invalidates all existing shares
- New shares generated with different polynomial

## BrightTrust Governance

Shared vaults can optionally require BrightTrust governance. When configured with threshold T, opening the vault requires T member approvals before access is granted.

## Audit Logging

All vault operations are recorded in an append-only audit log stored as encrypted blocks:

- Vault created/opened/deleted/shared
- Entries created/read/updated/deleted
- Emergency access configured/recovered
- BrightTrust governance configured

Audit logs are encrypted with the system member's public key using ECIES.

## Testing

The implementation includes 80+ property-based tests validating correctness properties across all subsystems:

```bash
NX_TUI=false npx nx run brightchain-api-lib:test --outputStyle=stream
```

### Test Suites

- `brightpass.property.spec.ts` (25 tests) - Core vault and entry operations
- `vaultEncryption.property.spec.ts` (13 tests) - AES-256-GCM encryption
- `auditLogger.property.spec.ts` (9 tests) - Encrypted audit logging
- `totpEngine.property.spec.ts` - TOTP generation and validation
- `vaultSerializer.property.spec.ts` - JSON serialization
- `vaultSerializer.malformed.property.spec.ts` - Malformed input handling
- `importParser.property.spec.ts` - Multi-format import
- `passwordGenerator.property.spec.ts` - Password generation
- `vaultKeyDerivation.property.spec.ts` - Key derivation
- `breachDetector.property.spec.ts` - Breach detection
- `brightpass.controller.property.spec.ts` - API controller

## File Structure

```
brightchain-api-lib/src/lib/
├── controllers/api/brightpass.ts          # API controller
├── services/
│   ├── brightpass.ts                      # Core service (~1800 lines)
│   └── brightpass/
│       ├── auditLogger.ts                 # Encrypted audit logging
│       ├── breachDetector.ts              # HIBP breach check
│       ├── importParser.ts                # Multi-format import
│       ├── passwordGenerator.ts           # Password generation
│       ├── totpEngine.ts                  # TOTP/QR codes
│       ├── vaultEncryption.ts             # AES-256-GCM encryption
│       ├── vaultKeyDerivation.ts          # BIP39 + HKDF key derivation
│       └── vaultSerializer.ts             # JSON serialization

brightchain-lib/src/lib/
├── blocks/vcbl.ts                         # VCBLBlock class
├── services/vcblService.ts                # VCBL binary serialization
├── stores/
│   ├── memoryBlockStore.ts                # In-memory block store
│   └── diskBlockAsyncStore.ts             # Disk-based block store
└── interfaces/
    ├── blocks/entryPropertyRecord.ts      # Property record interface
    └── brightpass/auditLog.ts             # AuditAction enum
```

## 1Password Feature Parity

| Feature | 1Password | BrightPass | Status |
|---------|-----------|------------|--------|
| Master Password Hashing | Argon2id/PBKDF2 | bcrypt (12 rounds) | ✅ Equivalent |
| Key Derivation | SRP + Secret Key | BIP39 + HKDF | ✅ Equivalent |
| Entry Encryption | AES-256-GCM | AES-256-GCM | ✅ Match |
| Key Sharing | ECIES | ECIES | ✅ Match |
| Secret Sharing | Shamir | Shamir | ✅ Match |
| Audit Logging | Encrypted | Encrypted blocks | ✅ Match |
| TOTP Support | Yes | Yes (otpauth) | ✅ Match |
| Import Support | Multiple | 8 formats | ✅ Match |
| Breach Detection | HIBP | HIBP (k-anonymity) | ✅ Match |
| BrightTrust Governance | Limited | Full support | ✅ Enhanced |

## Related Documentation

- [BrightPass Architecture](../../../../../docs/BrightPass_Password_Manager.md) - Full architecture documentation
- [TUPLE Storage Architecture](../../../../../docs/TUPLE_Storage_Architecture.md) - Block storage foundation
