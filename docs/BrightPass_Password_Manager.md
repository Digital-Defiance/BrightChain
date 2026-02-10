# BrightPass Password Manager

## Overview

BrightPass is a next-generation password keychain system built on BrightChain's encrypted block storage infrastructure. It delivers 1Password-competitive features—vault management, credential storage, password generation, TOTP/2FA, breach detection, and emergency access—while leveraging BrightChain's Owner-Free Filesystem, ECIES encryption (AES-256-GCM), BIP39/32 key derivation, Shamir's Secret Sharing, and Quorum governance.

The core innovation is the **VCBL (Vault Constituent Block List)**, which extends BrightChain's ExtendedCBL with a vault header and a parallel array of Entry Property Records. This design enables vault listing, searching, and filtering by reading only the VCBL—individual entry blocks are decrypted on demand.

## Architecture

### Storage Model

BrightPass uses a two-tier storage architecture:

1. **VCBL Block** - The vault index/manifest containing:
   - Vault header (name, owner, creation date, share list)
   - Entry Property Records array (title, type, tags, URLs)
   - Block ID array (addresses of encrypted entry blocks)

2. **Entry Blocks** - Individual encrypted blocks containing:
   - Full credential data (passwords, card numbers, notes)
   - TOTP secrets
   - Attachment references

```mermaid
graph TB
    subgraph "VCBL Block (Encrypted)"
        VH[Vault Header<br/>name, owner, shares]
        PR[Property Records<br/>titles, tags, URLs]
        BA[Block ID Array<br/>entry addresses]
    end

    subgraph "Entry Blocks (Encrypted)"
        E1[Login Entry<br/>username, password, TOTP]
        E2[Credit Card<br/>number, CVV, expiry]
        E3[Secure Note<br/>content, attachments]
    end

    BA -->|blockIds[0]| E1
    BA -->|blockIds[1]| E2
    BA -->|blockIds[2]| E3
    PR -->|propertyRecords[0]| E1
    PR -->|propertyRecords[1]| E2
    PR -->|propertyRecords[2]| E3
```

### VCBL Structure

The VCBL extends BrightChain's ExtendedCBL with additional sections:

```
┌─────────────────────────────────────┐
│ Structured Prefix (4B)              │ Magic, BlockType, Version, CRC8
├─────────────────────────────────────┤
│ CBL Base Header                     │ CreatorId, Date, AddressCount
│                                     │ TupleSize, DataLength, Checksum
├─────────────────────────────────────┤
│ Extended Header                     │ FileName, MimeType
├─────────────────────────────────────┤
│ Vault Header (NEW)                  │ VaultName, OwnerMemberId
│                                     │ CreatedAt, ModifiedAt
│                                     │ SharedMemberIds[]
├─────────────────────────────────────┤
│ Entry Property Records (NEW)        │ [Record₀][Record₁]...[Recordₙ]
│                                     │ type, title, tags, favorite
│                                     │ createdAt, updatedAt, siteUrl
├─────────────────────────────────────┤
│ Creator Signature                   │ ECDSA signature
├─────────────────────────────────────┤
│ Block ID Array                      │ [BlockId₀][BlockId₁]...[BlockIdₙ]
├─────────────────────────────────────┤
│ Padding                             │ Align to block size
└─────────────────────────────────────┘
```

### Index Alignment

The VCBL maintains 1:1 alignment between property records and block IDs:

```
propertyRecords[0] ──→ blockIds[0] ──→ Entry Block 0
propertyRecords[1] ──→ blockIds[1] ──→ Entry Block 1
propertyRecords[2] ──→ blockIds[2] ──→ Entry Block 2
```

This enables:
- **Fast listing**: Read VCBL only, no entry decryption
- **Efficient search**: Filter property records by title, tags, type, URL
- **Lazy loading**: Decrypt individual entries on demand
- **Atomic updates**: Add/remove entry + property record in single operation

## Core Features

### Vault Management

**Create Vault:**
- Derive vault key from Member's BIP39 seed + master password
- Create encrypted VCBL with empty entry arrays
- Store VCBL block in block store

**Open Vault:**
- Decrypt VCBL with master password
- Return vault metadata and property records
- Entries decrypted on demand

**List Vaults:**
- Return vault metadata from VCBL headers
- No entry decryption required

**Delete Vault:**
- Remove VCBL block
- Remove all entry blocks
- Remove all attachment blocks

### Entry Types

**Login Credentials:**
- Site URL, username, password
- Optional TOTP secret for 2FA
- Tags and favorite flag

**Secure Notes:**
- Encrypted text content
- File attachments
- Tags and favorite flag

**Credit Cards:**
- Cardholder name, card number
- Expiration date, CVV
- Tags and favorite flag

**Identity Documents:**
- Name, email, phone, address
- Custom fields
- Tags and favorite flag

### Password Generation

Cryptographically secure password generation with:

- **Length**: 8-128 characters
- **Character Sets**: Uppercase, lowercase, digits, special characters
- **Constraints**: Minimum counts per character type
- **Entropy Source**: Node.js `crypto.randomBytes`
- **Algorithm**: Fisher-Yates shuffle with cryptographic randomness

**Example:**
```typescript
{
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  specialChars: true,
  minUppercase: 2,
  minDigits: 2,
  minSpecialChars: 2
}
// → "K9#mPx2$vLqRtNwYzA!h"
```

### TOTP/2FA Support

Time-Based One-Time Password support using trusted libraries:

- **Library**: `otpauth` (RFC 6238/4226 compliant)
- **QR Codes**: `qrcode` library for authenticator enrollment
- **Algorithms**: SHA1 (default), SHA256, SHA512
- **Time Step**: 30 seconds (RFC 6238 standard)
- **Validation Window**: ±1 step (configurable)

**Features:**
- Store TOTP secrets encrypted in login entries
- Generate 6-digit codes on demand
- Create `otpauth://` URIs for authenticator apps
- Generate QR codes for easy enrollment

### Breach Detection

Password breach checking using k-anonymity:

- **Service**: Have I Been Pwned Passwords API
- **Privacy**: Only first 5 characters of SHA-1 hash transmitted
- **Algorithm**:
  1. Hash password with SHA-1
  2. Send first 5 chars to API
  3. Compare remaining 35 chars locally
  4. Return breach count or "not found"

**Privacy Guarantee**: Full password and full hash never leave the system.

### Audit Logging

Append-only audit trail stored as encrypted blocks:

**Logged Actions:**
- `VAULT_CREATED` - New vault created
- `VAULT_OPENED` - Vault unlocked
- `VAULT_DELETED` - Vault removed
- `VAULT_SHARED` - Vault shared with members
- `VAULT_SHARE_REVOKED` - Share access revoked
- `ENTRY_CREATED` - New entry added
- `ENTRY_READ` - Entry decrypted
- `ENTRY_UPDATED` - Entry modified
- `ENTRY_DELETED` - Entry removed
- `EMERGENCY_CONFIGURED` - Emergency access setup
- `EMERGENCY_RECOVERED` - Vault recovered via shares

**Log Entry:**
```typescript
{
  id: string;
  vaultId: string;
  memberId: string;
  action: AuditAction;
  timestamp: Date;
  metadata?: Record<string, string>;
}
```

### Emergency Access

Vault recovery using Shamir's Secret Sharing:

**Setup:**
1. Split vault key into N shares with threshold T
2. Encrypt each share with trustee's ECIES public key
3. Distribute encrypted shares to trustees

**Recovery:**
1. Collect T or more shares from trustees
2. Decrypt shares with trustees' private keys
3. Reconstruct vault key
4. Grant access to vault

**Security:**
- Sub-threshold reconstruction fails
- Revocation invalidates all previous shares
- New shares generated with different polynomial

### Vault Sharing

Multi-member vault access using ECIES encryption:

**Share Vault:**
- Re-encrypt vault key for each recipient's public key
- Update VCBL vault header with shared member IDs
- Recipients decrypt with their private keys

**Revoke Access:**
- Generate new vault key
- Re-encrypt vault with new key
- Update VCBL to remove revoked member
- Distribute new key only to remaining members

**Quorum Governance:**
- Configurable threshold for vault access
- Requires T of N member approvals
- Enforced via BrightChain's Quorum system

## Encryption Model

### Key Derivation

Vault keys derived from Member identity + master password:

```
Member BIP39 Seed + Master Password
         ↓
    HKDF-SHA256 (with vault ID as info)
         ↓
   32-byte AES-256 Key
```

**Properties:**
- Deterministic: Same inputs → same key
- Domain separation: Vault ID prevents key reuse
- Forward secrecy: Master password change → new key

### Encryption Layers

**VCBL Encryption:**
- Entire VCBL encrypted with vault key
- AES-256-GCM authenticated encryption
- Includes header, property records, block IDs

**Entry Encryption:**
- Each entry encrypted as separate block
- AES-256-GCM with vault key
- Enables lazy loading and selective decryption

**Attachment Encryption:**
- Large files stored as CBLs (multiple blocks)
- Each block encrypted with vault key
- Supports arbitrary file sizes

### Multi-Recipient Encryption

For shared vaults:

```
Vault Key (symmetric)
    ↓
ECIES Encrypt for each recipient
    ↓
Recipient A: ECIES(VaultKey, PubKeyA)
Recipient B: ECIES(VaultKey, PubKeyB)
Recipient C: ECIES(VaultKey, PubKeyC)
```

Each recipient decrypts vault key with their private key, then decrypts vault contents.

## API Design

### REST Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/brightpass/vaults` | POST | Create vault |
| `/api/brightpass/vaults` | GET | List vaults |
| `/api/brightpass/vaults/:id` | GET | Open vault |
| `/api/brightpass/vaults/:id` | DELETE | Delete vault |
| `/api/brightpass/vaults/:id/entries` | POST | Add entry |
| `/api/brightpass/vaults/:id/entries/:entryId` | GET | Get entry |
| `/api/brightpass/vaults/:id/entries/:entryId` | PUT | Update entry |
| `/api/brightpass/vaults/:id/entries/:entryId` | DELETE | Delete entry |
| `/api/brightpass/vaults/:id/entries/search` | POST | Search entries |
| `/api/brightpass/generate-password` | POST | Generate password |
| `/api/brightpass/totp/generate` | POST | Generate TOTP code |
| `/api/brightpass/totp/validate` | POST | Validate TOTP code |
| `/api/brightpass/breach-check` | POST | Check password breach |
| `/api/brightpass/autofill` | POST | Get autofill payload |
| `/api/brightpass/vaults/:id/audit-log` | GET | Get audit log |
| `/api/brightpass/vaults/:id/share` | POST | Share vault |
| `/api/brightpass/vaults/:id/share/:memberId` | DELETE | Revoke share |
| `/api/brightpass/vaults/:id/emergency` | POST | Configure emergency access |
| `/api/brightpass/vaults/:id/recover` | POST | Recover with shares |
| `/api/brightpass/vaults/:id/import` | POST | Import from other managers |

### Authentication

All endpoints require JWT authentication:

- **Header**: `Authorization: Bearer <token>`
- **Validation**: JWT verified against Member identity
- **Failure**: 401 Unauthorized

### Response Format

Consistent JSON envelope:

```typescript
{
  status: 'success' | 'error',
  data?: T,
  error?: {
    code: string,
    message: string,
    details?: Record<string, string[]>
  }
}
```

## Import Support

BrightPass supports importing from major password managers:

| Manager | Formats |
|---------|---------|
| **1Password** | 1PUX, CSV |
| **LastPass** | CSV |
| **Bitwarden** | JSON, CSV |
| **Chrome/Chromium** | CSV |
| **Firefox** | CSV |
| **KeePass** | XML (KDBX export) |
| **Dashlane** | JSON |

**Import Process:**
1. Parse export file format
2. Map records to BrightPass entry types
3. Create encrypted entry blocks
4. Update VCBL with property records
5. Return import summary (success/error counts)

**Type Mapping:**
- Login records → Login entries
- Card records → Credit card entries
- Note records → Secure note entries
- Unknown types → Secure note entries (preserve all fields)

## VCBL Capacity Calculation

### Block Overhead

VCBL overhead consists of:

1. **Structured Prefix**: 4 bytes
2. **CBL Base Header**: Dynamic (creator ID, dates, counts)
3. **Extended Header**: FileName + MimeType lengths
4. **Vault Header**: VaultName + owner + timestamps + shared member IDs
5. **Property Records**: Sum of all entry property record sizes
6. **Signature**: ECDSA signature size

### Capacity Formula

```
Available Space = Block Size - Total Overhead
Address Count = Available Space / (Address Size × Tuple Size)
```

Aligned to tuple size (minimum 4 addresses).

### Block Size Recommendation

`VCBLService.recommendBlockSize()` finds smallest block size that fits desired entry count:

1. Estimate vault header size (name + shared members)
2. Estimate property records size (count × average record size)
3. Try Small → Medium → Large block sizes
4. Return first size where capacity ≥ desired count
5. Return null if no size is sufficient

## Browser Extension Integration

BrightPass API designed for browser extension autofill:

**Autofill Flow:**
1. Extension detects login form on page
2. Extract site URL from current tab
3. POST to `/api/brightpass/autofill` with URL
4. Receive matching login entries
5. Generate TOTP codes if configured
6. Present autofill options to user
7. Fill form fields on selection

**Autofill Payload:**
```typescript
{
  vaultId: string,
  entries: [{
    entryId: string,
    title: string,
    username: string,
    password: string,
    siteUrl: string,
    totpCode?: string  // Generated on demand
  }]
}
```

## Security Properties

### Correctness Properties

BrightPass implements 35 correctness properties verified through property-based testing:

**Key Properties:**
1. Vault create-open round-trip preserves metadata
2. Wrong master password rejection
3. VCBL index alignment invariant (property records ↔ block IDs)
4. Entry add-retrieve round-trip preserves all fields
5. Entry deletion shrinks both arrays atomically
6. Key derivation determinism
7. Master password change re-keys vault
8. Shared vault recipient access
9. Share revocation denies access
10. Quorum threshold enforcement
11. Password generation satisfies all constraints
12. TOTP generate-validate round-trip
13. Breach check k-anonymity (only 5 chars transmitted)
14. Audit log append-only invariant
15. Shamir split-reconstruct round-trip
16. Sub-threshold reconstruction rejection
17. JSON serialization round-trip
18. VCBL binary serialization round-trip
19. VCBL capacity bounded by ExtendedCBL capacity
20. Block size recommendation returns smallest sufficient size

### Privacy Guarantees

**Master Password:**
- Never stored in plaintext
- Never transmitted over network
- Used only for key derivation

**Vault Key:**
- Derived on demand
- Stored only in memory (IKeyring)
- Cleared after session

**Breach Checking:**
- Only 5-char hash prefix transmitted
- Full password never leaves system
- k-anonymity prevents enumeration

**Audit Logs:**
- Encrypted at rest
- Append-only (no modification)
- Accessible only to vault owner

## Testing Strategy

### Property-Based Testing

Using `fast-check` with minimum 100 iterations per property:

**Test Coverage:**
- All 35 correctness properties
- Round-trip serialization (JSON, binary)
- Encryption/decryption cycles
- Key derivation determinism
- VCBL index alignment
- Password generation constraints
- TOTP validation windows
- Shamir threshold enforcement

**Test Organization:**
```
brightchain-lib/src/lib/blocks/vcbl.property.spec.ts
brightchain-lib/src/lib/services/vcblService.property.spec.ts
brightchain-api-lib/src/lib/services/brightpass.property.spec.ts
brightchain-api-lib/src/lib/services/brightpass/passwordGenerator.property.spec.ts
brightchain-api-lib/src/lib/services/brightpass/totpEngine.spec.ts
brightchain-api-lib/src/lib/services/brightpass/auditLogger.property.spec.ts
```

### Unit Testing

Complementary unit tests for:
- Specific entry type examples
- Edge cases (empty vaults, boundary lengths)
- Error conditions (malformed JSON, invalid options)
- Import format parsing
- API endpoint integration

## Development Status

BrightPass is currently in the design phase with partial implementation:

**Completed:**
- ✅ VCBL block structure design
- ✅ Entry property record format
- ✅ Encryption model specification
- ✅ API endpoint design
- ✅ Audit logger implementation (refactored to use real block store)
- ✅ Service architecture

**In Progress:**
- ⚠️ VCBL block implementation
- ⚠️ VCBLService implementation
- ⚠️ Entry operations (add/update/delete)
- ⚠️ Attachment handling

**Planned:**
- 🔲 Password generator
- 🔲 TOTP engine
- 🔲 Breach detector
- 🔲 Import parsers
- 🔲 Browser extension
- 🔲 CLI tool

## Future Enhancements

Potential additions to BrightPass:

- **Biometric Unlock**: Touch ID/Face ID for vault access
- **Hardware Key Support**: YubiKey/FIDO2 integration
- **Secure Password Sharing**: Time-limited, single-use credential sharing
- **Password Health Dashboard**: Weak/reused/old password detection
- **Auto-Change Passwords**: Automated password rotation for supported sites
- **Travel Mode**: Temporarily hide sensitive vaults
- **Watchtower**: Proactive breach monitoring and alerts
- **Custom Fields**: User-defined fields for any entry type
- **Folders/Collections**: Hierarchical vault organization
- **Tags Autocomplete**: Smart tag suggestions

## Related Documentation

- [TUPLE Storage Architecture](./TUPLE_Storage_Architecture.md) - Block storage foundation
- [Owner-Free File System Comparison](./OFF_System_Comparison_Analysis.md) - OFF compliance analysis
- [BrightChain Summary](./BrightChain%20Summary.md) - Overall system overview
- [Implementation Roadmap](./ImplementationRoadmap.md) - Development timeline
