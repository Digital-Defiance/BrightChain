---
title: "BrightPass API Reference"
parent: "API Reference"
nav_order: 9
permalink: /api-reference/brightpass-api/
---

# BrightPass API Reference

Complete HTTP API reference for the BrightPass password manager. All endpoints are prefixed with `/api/brightpass` and require JWT authentication.

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/vaults` | Create a new vault |
| GET | `/vaults` | List all vaults for the authenticated member |
| POST | `/vaults/:vaultId/open` | Open (unlock) a vault |
| DELETE | `/vaults/:vaultId` | Delete a vault |
| POST | `/vaults/:vaultId/entries` | Add an entry to a vault |
| GET | `/vaults/:vaultId/entries` | List entry property records in a vault |
| GET | `/vaults/:vaultId/entries/:entryId` | Get a specific entry |
| PUT | `/vaults/:vaultId/entries/:entryId` | Update an entry |
| DELETE | `/vaults/:vaultId/entries/:entryId` | Delete an entry |
| POST | `/vaults/:vaultId/search` | Search entries in a vault |
| POST | `/generate-password` | Generate a secure password |
| POST | `/totp/generate` | Generate a TOTP code |
| POST | `/totp/validate` | Validate a TOTP code |
| POST | `/breach-check` | Check if a password has been breached |
| POST | `/vaults/:vaultId/autofill` | Get autofill payload for a site URL |
| GET | `/vaults/:vaultId/audit-log` | Get vault audit log |
| POST | `/vaults/:vaultId/share` | Share a vault with other members |
| POST | `/vaults/:vaultId/revoke-share` | Revoke a member's vault access |
| POST | `/vaults/:vaultId/emergency-access` | Configure Shamir emergency access |
| POST | `/vaults/:vaultId/emergency-recover` | Recover a vault with emergency shares |
| POST | `/vaults/:vaultId/import` | Import entries from another password manager |

All endpoints require `Authorization: Bearer {token}`.

---

## POST /vaults

Create a new encrypted vault. The vault key is derived from the member's BIP39 seed combined with the provided master password using HKDF-SHA256.

**Request:**
```json
{
  "name": "Personal",
  "masterPassword": "VaultMaster123!"
}
```

**200 Response:**
```json
{
  "success": true,
  "data": {
    "vault": {
      "id": "vault-uuid",
      "name": "Personal",
      "ownerId": "member-uuid",
      "createdAt": "2026-03-01T12:00:00.000Z",
      "modifiedAt": "2026-03-01T12:00:00.000Z",
      "entryCount": 0,
      "sharedWith": []
    }
  }
}
```

On creation, the server generates a vault-specific BIP39 seed, derives a 32-byte AES-256 key via HKDF-SHA256 (using the vault ID as the info parameter), and creates an encrypted VCBL (Vault Constituent Block List) with empty entry arrays.

**Errors:**
- `400` — Missing required fields (`name`, `masterPassword`)
- `401` — Not authenticated

---

## GET /vaults

List all vaults owned by or shared with the authenticated member. Returns vault metadata only; no entry decryption is performed.

**200 Response:**
```json
{
  "success": true,
  "data": {
    "vaults": [
      {
        "id": "vault-uuid",
        "name": "Personal",
        "ownerId": "member-uuid",
        "createdAt": "2026-03-01T12:00:00.000Z",
        "modifiedAt": "2026-03-10T08:30:00.000Z",
        "entryCount": 42,
        "sharedWith": ["member-uuid-2"]
      }
    ]
  }
}
```

**Errors:**
- `401` — Not authenticated

---

## POST /vaults/:vaultId/open

Unlock a vault by providing the master password. The server derives the vault key, decrypts the VCBL, and returns vault metadata along with entry property records (titles, types, tags, URLs). Individual entry contents are not decrypted until explicitly requested.

**Request:**
```json
{
  "masterPassword": "VaultMaster123!"
}
```

**200 Response:**
```json
{
  "success": true,
  "data": {
    "vault": {
      "metadata": {
        "id": "vault-uuid",
        "name": "Personal",
        "ownerId": "member-uuid",
        "createdAt": "2026-03-01T12:00:00.000Z",
        "updatedAt": "2026-03-10T08:30:00.000Z",
        "entryCount": 1,
        "sharedWith": [],
        "vcblBlockId": "hex-encoded-block-id"
      },
      "propertyRecords": [
        {
          "id": "entry-uuid-1",
          "entryType": "login",
          "title": "GitHub",
          "tags": ["dev", "work"],
          "favorite": true,
          "siteUrl": "https://github.com",
          "createdAt": "2026-02-01T10:00:00.000Z",
          "updatedAt": "2026-03-05T14:00:00.000Z"
        }
      ]
    }
  }
}
```

The master password is verified using bcrypt (12 rounds, constant-time comparison). The vault key is held in memory (IKeyring) for the duration of the session.

**Errors:**
- `400` — Missing required field (`masterPassword`)
- `401` — Incorrect master password
- `404` — Vault not found

---

## GET /vaults/:vaultId/entries

List entry property records for an open vault. Returns metadata about each entry (title, type, tags, URL, favorite status) without decrypting entry contents.

**200 Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "entry-uuid-1",
        "entryType": "login",
        "title": "GitHub",
        "tags": ["dev", "work"],
        "favorite": true,
        "siteUrl": "https://github.com",
        "createdAt": "2026-02-01T10:00:00.000Z",
        "updatedAt": "2026-03-05T14:00:00.000Z"
      }
    ]
  }
}
```

**Errors:**
- `404` — Vault not found

---

## DELETE /vaults/:vaultId

Permanently delete a vault, all its entry blocks, and all attachment blocks. Requires the master password for confirmation.

**Request:**
```json
{
  "masterPassword": "VaultMaster123!"
}
```

**200 Response:**
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

**Errors:**
- `400` — Missing required field (`masterPassword`)
- `401` — Incorrect master password or not authenticated
- `404` — Vault not found

---

## POST /vaults/:vaultId/entries

Add a new entry to an open vault. The entry is encrypted as a separate block using AES-256-GCM with the vault key, and the VCBL is updated atomically with both the new property record and block ID.

**Request (login entry):**
```json
{
  "type": "login",
  "title": "GitHub",
  "username": "alice",
  "password": "SecurePass123!",
  "siteUrl": "https://github.com",
  "totpSecret": "JBSWY3DPEHPK3PXP",
  "tags": ["dev", "work"],
  "favorite": true
}
```

**Request (credit card entry):**
```json
{
  "type": "credit_card",
  "title": "Visa ending 4242",
  "cardholderName": "Alice Smith",
  "cardNumber": "4242424242424242",
  "expirationDate": "12/28",
  "cvv": "123",
  "tags": ["finance"]
}
```

**Request (secure note):**
```json
{
  "type": "secure_note",
  "title": "Recovery Codes",
  "content": "Backup codes for various services...",
  "tags": ["recovery"]
}
```

The `type` and `title` fields are required for all entry types.

**200 Response:**
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": "entry-uuid",
      "type": "login",
      "title": "GitHub",
      "createdAt": "2026-03-13T10:00:00.000Z",
      "updatedAt": "2026-03-13T10:00:00.000Z"
    }
  }
}
```

**Errors:**
- `400` — Missing required fields (`type`, `title`)
- `404` — Vault not found

---

## GET /vaults/:vaultId/entries/:entryId

Retrieve and decrypt a specific entry from an open vault. This is the only operation that decrypts the full entry content (lazy loading).

**200 Response:**
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": "entry-uuid",
      "type": "login",
      "title": "GitHub",
      "username": "alice",
      "password": "SecurePass123!",
      "siteUrl": "https://github.com",
      "totpSecret": "JBSWY3DPEHPK3PXP",
      "tags": ["dev", "work"],
      "favorite": true,
      "createdAt": "2026-02-01T10:00:00.000Z",
      "updatedAt": "2026-03-05T14:00:00.000Z"
    }
  }
}
```

An `ENTRY_READ` audit log event is recorded when an entry is decrypted.

**Errors:**
- `404` — Vault or entry not found

---

## PUT /vaults/:vaultId/entries/:entryId

Update an existing entry. Only provided fields are modified; omitted fields are left unchanged. The entry block is re-encrypted and the VCBL property record is updated atomically.

**Request:**
```json
{
  "password": "NewSecurePass456!",
  "tags": ["dev", "work", "updated"]
}
```

**200 Response:**
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": "entry-uuid",
      "type": "login",
      "title": "GitHub",
      "updatedAt": "2026-03-13T10:30:00.000Z"
    }
  }
}
```

**Errors:**
- `404` — Vault or entry not found

---

## DELETE /vaults/:vaultId/entries/:entryId

Delete an entry from a vault. Removes both the entry block and the corresponding property record from the VCBL atomically, maintaining index alignment.

**200 Response:**
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

**Errors:**
- `404` — Vault or entry not found

---

## POST /vaults/:vaultId/search

Search entries within an open vault by querying the VCBL property records. No entry decryption is required for search — only the VCBL index is consulted.

**Request:**
```json
{
  "query": "github",
  "type": "login",
  "tags": ["dev"],
  "favorite": true
}
```

All fields are optional. When multiple fields are provided, results must match all criteria (AND logic).

**200 Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "entry-uuid",
        "type": "login",
        "title": "GitHub",
        "tags": ["dev", "work"],
        "favorite": true,
        "siteUrl": "https://github.com"
      }
    ]
  }
}
```

**Errors:**
- `404` — Vault not found

---

## POST /generate-password

Generate a cryptographically secure password using `crypto.randomBytes` with Fisher-Yates shuffle.

**Request:**
```json
{
  "length": 20,
  "uppercase": true,
  "lowercase": true,
  "numbers": true,
  "symbols": true,
  "minUppercase": 2,
  "minDigits": 2,
  "minSpecialChars": 2
}
```

The `digits` field is accepted as an alias for `numbers` for backward compatibility.

**200 Response:**
```json
{
  "success": true,
  "data": {
    "password": {
      "password": "K9#mPx2$vLqRtNwYzA!h",
      "entropy": 131,
      "strength": "very_strong"
    }
  }
}
```

Entropy is calculated as `floor(length × log2(charsetSize))`. Strength thresholds:

| Entropy | Strength |
|---------|----------|
| < 40 | `weak` |
| 40–59 | `fair` |
| 60–79 | `strong` |
| ≥ 80 | `very_strong` |

**Errors:**
- `400` — Invalid options (e.g., length < 8 or > 128, conflicting constraints)

---

## POST /totp/generate

Generate a TOTP code from a stored secret. Uses the `otpauth` library (RFC 6238 compliant) with a 30-second time step.

**Request:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP"
}
```

**200 Response:**
```json
{
  "success": true,
  "data": {
    "code": {
      "code": "482913",
      "remainingSeconds": 17
    }
  }
}
```

The `remainingSeconds` field indicates how many seconds remain in the current 30-second period before the code rotates.

**Errors:**
- `400` — Missing required field (`secret`)

---

## POST /totp/validate

Validate a TOTP code against a secret. Supports a configurable validation window (default ±1 step) to account for clock drift.

**Request:**
```json
{
  "code": "482913",
  "secret": "JBSWY3DPEHPK3PXP",
  "window": 1
}
```

The `window` field is optional (defaults to 1).

**200 Response:**
```json
{
  "success": true,
  "data": {
    "valid": true
  }
}
```

**Errors:**
- `400` — Missing required fields (`code`, `secret`)

---

## POST /breach-check

Check whether a password has appeared in known data breaches using the Have I Been Pwned Passwords API with k-anonymity. Only the first 5 characters of the SHA-1 hash are transmitted; the full password and full hash never leave the system.

**Request:**
```json
{
  "password": "password123"
}
```

**200 Response:**
```json
{
  "success": true,
  "data": {
    "breached": true,
    "count": 247681
  }
}
```

A `count` of 0 with `breached: false` indicates the password was not found in any known breaches.

**Errors:**
- `400` — Missing required field (`password`)

---

## POST /vaults/:vaultId/autofill

Get autofill candidates for a given site URL. Searches the vault's VCBL property records for login entries matching the URL, then decrypts matching entries and generates TOTP codes if configured.

**Request:**
```json
{
  "siteUrl": "https://github.com/login"
}
```

**200 Response:**
```json
{
  "success": true,
  "data": {
    "vaultId": "vault-uuid",
    "entries": [
      {
        "entryId": "entry-uuid",
        "title": "GitHub",
        "username": "alice",
        "password": "SecurePass123!",
        "siteUrl": "https://github.com",
        "totpCode": "482913"
      }
    ]
  }
}
```

Designed for browser extension integration. The extension extracts the current tab URL, calls this endpoint, and presents matching credentials for form filling.

**Errors:**
- `400` — Missing required field (`siteUrl`)
- `404` — Vault not found

---

## GET /vaults/:vaultId/audit-log

Retrieve the append-only audit trail for a vault. Audit entries are stored as encrypted blocks and are accessible only to the vault owner.

**200 Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "log-uuid",
        "vaultId": "vault-uuid",
        "memberId": "member-uuid",
        "action": "ENTRY_CREATED",
        "timestamp": "2026-03-13T10:00:00.000Z",
        "metadata": {
          "entryTitle": "GitHub"
        }
      },
      {
        "id": "log-uuid-2",
        "vaultId": "vault-uuid",
        "memberId": "member-uuid",
        "action": "VAULT_OPENED",
        "timestamp": "2026-03-13T09:55:00.000Z"
      }
    ]
  }
}
```

**Logged actions:** `VAULT_CREATED`, `VAULT_OPENED`, `VAULT_DELETED`, `VAULT_SHARED`, `VAULT_SHARE_REVOKED`, `ENTRY_CREATED`, `ENTRY_READ`, `ENTRY_UPDATED`, `ENTRY_DELETED`, `EMERGENCY_CONFIGURED`, `EMERGENCY_RECOVERED`.

**Errors:**
- `404` — Vault not found

---

## POST /vaults/:vaultId/share

Share a vault with one or more members. The vault's symmetric key is re-encrypted with each recipient's ECIES public key and the VCBL vault header is updated with the shared member IDs.

**Request:**
```json
{
  "recipientMemberIds": ["member-uuid-2", "member-uuid-3"]
}
```

**200 Response:**
```json
{
  "success": true,
  "data": {
    "shared": true
  }
}
```

Recipients decrypt the vault key with their private key, then use it to decrypt vault contents.

**Errors:**
- `400` — Missing or invalid field (`recipientMemberIds` must be a non-empty array)

---

## POST /vaults/:vaultId/revoke-share

Revoke a member's access to a shared vault. Generates a new vault key, re-encrypts the vault, and distributes the new key only to remaining members.

**Request:**
```json
{
  "memberId": "member-uuid-2"
}
```

**200 Response:**
```json
{
  "success": true,
  "data": {
    "revoked": true
  }
}
```

**Errors:**
- `400` — Missing required field (`memberId`)

---

## POST /vaults/:vaultId/emergency-access

Configure Shamir's Secret Sharing for emergency vault recovery. The vault key is split into N shares with a threshold of T required for reconstruction. Each share is encrypted with the corresponding trustee's ECIES public key.

**Request:**
```json
{
  "threshold": 3,
  "trustees": ["member-uuid-2", "member-uuid-3", "member-uuid-4", "member-uuid-5"]
}
```

The `threshold` must be ≤ the number of `trustees`.

**200 Response:**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "threshold": 3,
    "totalShares": 4,
    "trustees": ["member-uuid-2", "member-uuid-3", "member-uuid-4", "member-uuid-5"]
  }
}
```

Reconfiguring emergency access invalidates all previously distributed shares (new polynomial generated).

**Errors:**
- `400` — Missing required fields (`threshold`, `trustees`), or threshold > trustees count

---

## POST /vaults/:vaultId/emergency-recover

Recover a vault using Shamir shares collected from trustees. Requires at least `threshold` shares for successful reconstruction.

**Request:**
```json
{
  "shares": [
    {
      "trusteeId": "member-uuid-2",
      "encryptedShare": "hex-encoded-encrypted-share-data"
    },
    {
      "trusteeId": "member-uuid-3",
      "encryptedShare": "hex-encoded-encrypted-share-data"
    },
    {
      "trusteeId": "member-uuid-4",
      "encryptedShare": "hex-encoded-encrypted-share-data"
    }
  ]
}
```

**200 Response:**
```json
{
  "success": true,
  "data": {
    "vault": {
      "id": "vault-uuid",
      "name": "Personal",
      "recovered": true
    }
  }
}
```

Sub-threshold reconstruction (fewer shares than the configured threshold) will fail.

**Errors:**
- `400` — Missing or invalid field (`shares` must be an array), or insufficient shares
- `404` — Vault not found

---

## POST /vaults/:vaultId/import

Import entries from another password manager. The file content is provided as a base64-encoded string. Parsed records are mapped to BrightPass entry types, encrypted, and added to the vault.

**Request:**
```json
{
  "format": "1password_csv",
  "fileContent": "base64-encoded-file-content"
}
```

**Supported formats:**

| Format Key | Source |
|------------|--------|
| `1password_1pux` | 1Password (1PUX export) |
| `1password_csv` | 1Password (CSV export) |
| `lastpass_csv` | LastPass (CSV) |
| `bitwarden_json` | Bitwarden (JSON) |
| `bitwarden_csv` | Bitwarden (CSV) |
| `chrome_csv` | Chrome/Chromium (CSV) |
| `firefox_csv` | Firefox (CSV) |
| `keepass_xml` | KeePass (KDBX XML export) |
| `dashlane_json` | Dashlane (JSON) |

**200 Response:**
```json
{
  "success": true,
  "data": {
    "imported": 45,
    "skipped": 2,
    "errors": [
      {
        "row": 12,
        "reason": "Missing required field: title"
      }
    ]
  }
}
```

**Type mapping:** Login records become login entries, card records become credit card entries, note records become secure note entries, and unrecognized types are stored as secure notes with all original fields preserved.

**Errors:**
- `400` — Missing required fields (`format`, `fileContent`), or unsupported format

---

## Encryption Model

### Vault Key Derivation

```
Vault BIP39 Seed (24 words, 256-bit entropy) + Master Password
         ↓
    HKDF-SHA256 (info = vault ID)
         ↓
   32-byte AES-256 Key
```

Each vault has its own BIP39 mnemonic, providing independence and rotatability. The master password is hashed with bcrypt (12 rounds) for verification.

### Encryption Layers

| Layer | Algorithm | Scope |
|-------|-----------|-------|
| VCBL | AES-256-GCM | Vault header, property records, block IDs |
| Entry blocks | AES-256-GCM | Individual credential data |
| Attachments | AES-256-GCM | Large files stored as CBLs |
| Shared vault keys | ECIES (secp256k1) | Per-recipient vault key encryption |
| Emergency shares | Shamir + ECIES | Per-trustee share encryption |

### VCBL Structure

The VCBL (Vault Constituent Block List) extends BrightChain's ExtendedCBL with a vault header and parallel entry property records array. Property records maintain 1:1 alignment with block IDs, enabling fast listing and search without decrypting individual entries.

---

## Standard Response Format

All BrightPass responses use a consistent envelope:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VAULT_NOT_FOUND",
    "message": "Vault not found"
  }
}
```

| HTTP Status | Condition |
|-------------|-----------|
| `200` | Success |
| `400` | Validation failure |
| `401` | Not authenticated or incorrect master password |
| `404` | Vault or entry not found |
| `500` | Server error |

---

## Related Documentation

- [BrightPass Password Manager Architecture](../identity/brightpass-password-manager)
- [Authentication API Reference](./authentication-api)
- [Security Analysis](../guides/04-security-analysis)
