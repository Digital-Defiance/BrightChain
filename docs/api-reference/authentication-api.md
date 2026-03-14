---
title: "Authentication API Reference"
parent: "API Reference"
nav_order: 8
permalink: /api-reference/authentication-api/
---

# Authentication API Reference

Complete HTTP API reference for all authentication and user management endpoints. All endpoints are prefixed with `/api/user`.

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Create a new account |
| POST | `/login` | No | Password-based login |
| POST | `/request-direct-login` | No | Get an ECIES challenge for passwordless login |
| POST | `/direct-challenge` | No | Submit a signed ECIES challenge to log in |
| GET | `/verify` | Yes | Validate a token and get user data |
| GET | `/profile` | Yes | Get full user profile with energy account |
| PUT | `/profile` | Yes | Update member settings (replication, storage) |
| POST | `/change-password` | Yes | Change password |
| POST | `/recover` | No | Recover account with mnemonic |
| POST | `/logout` | Yes | Invalidate server-side session |
| GET | `/refresh-token` | Yes | Get a fresh JWT |
| GET | `/settings` | Yes | Get user preferences |
| POST | `/settings` | Yes | Update user preferences |
| POST | `/backup-codes` | Yes | Generate backup codes |
| GET | `/backup-codes` | Yes | Get remaining backup code count |
| PUT | `/backup-codes` | Yes | Regenerate backup codes |
| POST | `/recover-backup` | Yes | Recover account with a backup code |

---

## POST /register

Create a new user account. On success, returns a JWT token and the member's recovery mnemonic.

Optionally accepts a user-provided BIP39 mnemonic phrase. When provided, the server validates its format (must be 12, 15, 18, 21, or 24 words), checks HMAC-based uniqueness, and derives the user's cryptographic identity deterministically from it. When omitted, the server generates a new mnemonic automatically.

**Request:**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "SecurePass123!",
  "mnemonic": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
}
```

The `mnemonic` field is optional. Omit it to have the server generate one for you.

**201 Response:**
```json
{
  "message": "Registration successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "memberId": "member-uuid",
    "energyBalance": 1000
  }
}
```

Validation is performed on all fields before processing. After creating the member, the server creates an EnergyAccount with trial credits and calls `onPostRegister` which creates a BrightHub social profile.

**Errors:**
- `400` — Validation failure (missing fields, weak password, invalid email)
- `400` — Username or email already taken
- `400` — Invalid mnemonic format (not a valid BIP39 phrase of 12, 15, 18, 21, or 24 words)
- `400` — Mnemonic already in use (HMAC uniqueness collision)

---

## POST /login

Authenticate with username and password.

**Request:**
```json
{
  "username": "alice",
  "password": "SecurePass123!"
}
```

**200 Response:**
```json
{
  "message": "Logged in successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "memberId": "member-uuid",
    "energyBalance": 1000
  }
}
```

The `energyBalance` field reflects the member's current energy account balance.

**Errors:**
- `400` — Missing or invalid fields
- `401` — Invalid credentials

---

## POST /request-direct-login

Generate a server-signed challenge for ECIES-based passwordless login. This is the first step of the two-step direct challenge flow.

**Request:** Empty body (no parameters required).

**200 Response:**
```json
{
  "challenge": "hex-encoded-challenge-buffer",
  "message": "Challenge generated",
  "serverPublicKey": "hex-encoded-server-public-key"
}
```

**Challenge buffer layout (hex-decoded):**

| Offset | Length | Content |
|--------|--------|---------|
| 0 | 8 bytes | Timestamp (big-endian uint64, milliseconds) |
| 8 | 32 bytes | Random nonce |
| 40 | 64 bytes | Server ECIES signature over `timestamp ‖ nonce` |

The client must sign this challenge with their member private key and submit it to `/direct-challenge` before the challenge expires (default: 5 minutes).

---

## POST /direct-challenge

Submit a signed ECIES challenge to authenticate without a password. Requires a challenge obtained from `/request-direct-login`.

**Request:**
```json
{
  "challenge": "hex-encoded-challenge-buffer",
  "signature": "hex-encoded-member-signature",
  "username": "alice"
}
```

Either `username` or `email` may be provided to identify the member.

**200 Response:**
```json
{
  "message": "Logged in successfully",
  "user": {
    "id": "member-uuid",
    "username": "alice",
    "email": "alice@example.com",
    "roles": [
      {
        "_id": "role-member-uuid",
        "name": "User",
        "admin": false,
        "member": true,
        "child": false,
        "system": false,
        "createdAt": "2026-03-01T12:00:00.000Z",
        "updatedAt": "2026-03-01T12:00:00.000Z",
        "createdBy": "member-uuid",
        "updatedBy": "member-uuid"
      }
    ],
    "rolePrivileges": { "admin": false, "member": true, "child": false, "system": false },
    "emailVerified": true,
    "timezone": "UTC",
    "siteLanguage": "en-US",
    "darkMode": false,
    "currency": "USD",
    "directChallenge": false
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "serverPublicKey": "hex-encoded-server-public-key"
}
```

**Verification steps performed server-side:**
1. Parse the challenge buffer
2. Verify the timestamp has not expired
3. Verify the server's ECIES signature on `timestamp ‖ nonce`
4. Look up the member by username or email
5. Verify the member's ECIES signature on the full challenge
6. Check the nonce has not been used before (replay prevention)
7. Store the nonce in `UsedDirectLoginToken` collection

**Errors:**
- `401` — Challenge expired, invalid challenge, invalid credentials, or challenge already used
- `500` — Unexpected server error

---

## GET /verify

Validate the current JWT and return the authenticated user's data. Used by the frontend on app load to check if a stored token is still valid.

**Headers:** `Authorization: Bearer {token}`

**200 Response:**
```json
{
  "message": "Token is valid",
  "user": {
    "id": "member-uuid",
    "username": "alice",
    "email": "alice@example.com",
    "roles": [
      {
        "_id": "role-member-uuid",
        "name": "User",
        "admin": false,
        "member": true,
        "child": false,
        "system": false,
        "createdAt": "2026-01-15T10:00:00.000Z",
        "updatedAt": "2026-01-15T10:00:00.000Z",
        "createdBy": "member-uuid",
        "updatedBy": "member-uuid"
      }
    ],
    "rolePrivileges": { "admin": false, "member": true, "child": false, "system": false },
    "emailVerified": true,
    "timezone": "America/New_York",
    "siteLanguage": "en-US",
    "darkMode": false,
    "currency": "USD",
    "directChallenge": false,
    "lastLogin": "2026-03-01T12:00:00.000Z"
  }
}
```

**Errors:**
- `401` — Missing, invalid, or expired token

---

## GET /profile

Get the authenticated user's full profile including energy account data and optional member store metadata.

**Headers:** `Authorization: Bearer {token}`

**200 Response:**
```json
{
  "message": "Retrieved successfully",
  "data": {
    "memberId": "member-uuid",
    "username": "alice",
    "email": "alice@example.com",
    "energyBalance": 1000,
    "availableBalance": 950,
    "earned": 200,
    "spent": 50,
    "reserved": 50,
    "reputation": 100,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "lastUpdated": "2026-03-10T08:30:00.000Z",
    "profile": {
      "status": "active",
      "storageQuota": "10737418240",
      "storageUsed": "1073741824",
      "lastActive": "2026-03-10T08:30:00.000Z",
      "dateCreated": "2026-01-15T10:00:00.000Z"
    }
  }
}
```

The `profile` field is only present if the member store has public profile data available.

**Errors:**
- `401` — Not authenticated
- `500` — Server error

---

## PUT /profile

Update the member's replication and storage settings in the member store.

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "settings": {
    "autoReplication": true,
    "minRedundancy": 3,
    "preferredRegions": ["us-east-1", "eu-west-1"]
  }
}
```

**200 Response:** Same shape as `GET /profile` — returns the updated profile with energy account data.

**Errors:**
- `401` — Not authenticated
- `500` — Server error

---

## POST /change-password

Change the authenticated user's password.

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**200 Response:**
```json
{
  "message": "Password changed successfully",
  "data": {
    "memberId": "member-uuid",
    "success": true
  }
}
```

**Errors:**
- `400` — Validation failure (missing fields, weak new password)
- `401` — Current password is incorrect
- `500` — Server error

---

## POST /recover

Recover an account using the mnemonic phrase provided at registration.

**Request:**
```json
{
  "email": "alice@example.com",
  "mnemonic": "word1 word2 word3 ... word12",
  "newPassword": "NewPass789!"
}
```

**200 Response:**
```json
{
  "message": "Account recovered successfully",
  "data": { ... }
}
```

**Errors:**
- `400` — Validation failure
- `401` — Invalid credentials or invalid mnemonic
- `500` — Server error

---

## POST /logout

Invalidate the server-side session associated with the current token.

**Headers:** `Authorization: Bearer {token}`

**200 Response:**
```json
{
  "message": "Success"
}
```

The server validates the token via the `BrightChainSessionAdapter`, looks up the associated session, and deletes it. The client should also clear `authToken` and `user` from localStorage.

**Errors:**
- `401` — Missing or invalid token
- `500` — Server error

---

## GET /refresh-token

Exchange a valid JWT for a fresh one with a new expiration. Also returns the current user DTO and server public key.

**Headers:** `Authorization: Bearer {token}`

**200 Response:**
```json
{
  "message": "Success",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "serverPublicKey": "hex-encoded-server-public-key"
}
```

The new token is also returned in the `Authorization` response header as `Bearer {new-token}`.

**Errors:**
- `401` — Missing or invalid token
- `500` — Server error

---

## GET /settings

Get the authenticated user's display preferences.

**Headers:** `Authorization: Bearer {token}`

**200 Response:**
```json
{
  "message": "Settings retrieved",
  "settings": {
    "email": "alice@example.com",
    "timezone": "America/New_York",
    "currency": "USD",
    "siteLanguage": "en",
    "darkMode": false,
    "directChallenge": false
  }
}
```

**Errors:**
- `401` — Not authenticated

---

## POST /settings

Update the authenticated user's display preferences. Only provided fields are updated; omitted fields are left unchanged. Settings are persisted to the `user_settings` collection.

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "timezone": "Europe/London",
  "darkMode": true,
  "siteLanguage": "fr",
  "currency": "EUR",
  "directChallenge": true
}
```

All fields are optional.

**200 Response:**
```json
{
  "message": "Settings saved",
  "user": { ... }
}
```

Returns the full updated user DTO.

**Errors:**
- `401` — Not authenticated
- `500` — Server error

---

## POST /backup-codes

Generate a new set of 10 backup recovery codes. Codes are encrypted with ECIES and hashed with Argon2id before storage.

**Headers:** `Authorization: Bearer {token}`

**200 Response:**
```json
{
  "message": "Your new backup codes",
  "backupCodes": ["code1", "code2", "...", "code10"]
}
```

These codes are displayed once. The user must store them securely.

**Errors:**
- `401` — Not authenticated
- `500` — Generation failed

---

## GET /backup-codes

Get the number of remaining unused backup codes.

**Headers:** `Authorization: Bearer {token}`

**200 Response:**
```json
{
  "message": "Backup codes retrieved",
  "codeCount": 8
}
```

**Errors:**
- `401` — Not authenticated
- `500` — Retrieval failed

---

## PUT /backup-codes

Regenerate all backup codes, invalidating any previously generated codes.

**Headers:** `Authorization: Bearer {token}`

**200 Response:** Same shape as `POST /backup-codes`.

**Errors:**
- `401` — Not authenticated
- `500` — Generation failed

---

## POST /recover-backup

Recover account access using a backup code. Optionally set a new password.

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "backupCode": "abc123def456",
  "newPassword": "OptionalNewPass!"
}
```

`newPassword` is optional.

**200 Response:**
```json
{
  "message": "Recovery successful",
  "codeCount": 7
}
```

Returns the remaining backup code count after consuming the used code.

**Errors:**
- `400` — Missing backup code
- `401` — Invalid backup code
- `500` — Server error

---

## Role Object

Roles in user responses are full objects, not simple strings. Each role has the following shape:

```json
{
  "_id": "role-member-uuid",
  "name": "User",
  "admin": false,
  "member": true,
  "child": false,
  "system": false,
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z",
  "createdBy": "member-uuid",
  "updatedBy": "member-uuid"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Role document ID (format: `role-{memberId}`) |
| `name` | string | Role name, derived from `MemberType` (e.g., `"User"`, `"Admin"`, `"System"`) |
| `admin` | boolean | Whether this role grants global admin privileges |
| `member` | boolean | Whether this role grants standard member privileges |
| `child` | boolean | Whether this is a child/restricted role |
| `system` | boolean | Whether this is a system-level role |
| `createdAt` | string (ISO 8601) | When the role was created |
| `updatedAt` | string (ISO 8601) | When the role was last updated |
| `createdBy` | string | Member ID of the role creator |
| `updatedBy` | string | Member ID of the last updater |

The `rolePrivileges` field on user responses is a convenience summary that combines all assigned roles into a single `{ admin, member, child, system }` object using OR logic across all roles.

---

## Cryptographic Specification

BrightChain authentication is built on ECIES (Elliptic Curve Integrated Encryption Scheme) with secp256k1. This section documents the cryptographic parameters that clients need for key derivation, signing, and encryption.

### Identity Key Derivation

Member identities are derived from a BIP39 mnemonic phrase using BIP32 hierarchical deterministic key derivation:

| Parameter | Value |
|-----------|-------|
| Mnemonic standard | BIP39 |
| Mnemonic entropy | 256 bits (24 words) |
| Elliptic curve | secp256k1 (same as Bitcoin/Ethereum) |
| Primary derivation path | `m/44'/60'/0'/0/0` (BIP44, coin type 60 = Ethereum) |
| Security level | 128-bit (ECDSA on secp256k1) |

The mnemonic produces a seed via `bip39.mnemonicToSeedSync()`, which feeds into `HDKey.fromMasterSeed()` for BIP32 derivation. The derived key pair is the member's identity: the public key is their network identity, and the private key is used for signing and decryption.

### Key Derivation Paths

BrightChain uses the BIP44 `change` field to separate key purposes:

| Purpose | Derivation Path | Description |
|---------|----------------|-------------|
| Primary identity / wallet | `m/44'/60'/0'/0/0` | Member's main key pair |
| Device provisioning | `m/44'/60'/0'/1/<index>` | Per-device keys (index increments per device) |
| Git signing | `m/44'/60'/0'/2/0` | Commit and tag signing |

All purpose-level paths use hardened derivation (`'`) to prevent child key compromise from leaking parent keys.

### ECDSA Signing

| Parameter | Value |
|-----------|-------|
| Algorithm | ECDSA |
| Curve | secp256k1 |
| Signature size | 64 bytes (r: 32 bytes, s: 32 bytes) |
| Public key (uncompressed) | 65 bytes (0x04 prefix + 64 bytes) |
| Public key (compressed) | 33 bytes (0x02/0x03 prefix + 32 bytes) |
| Public key magic byte | `0x04` (uncompressed format) |

Signatures are used for:
- Direct challenge authentication (member signs the server's challenge buffer)
- Block and CBL creator signatures
- Identity proofs (self-verifying, no server trust required)

### Symmetric Encryption (ECIES Payload)

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-256-GCM |
| Key size | 256 bits (32 bytes) |
| IV size | 16 bytes |
| Authentication tag size | 16 bytes |

ECIES combines ECDH key agreement (on secp256k1) with AES-256-GCM for authenticated encryption. The ephemeral public key, IV, auth tag, and ciphertext are packed into the encrypted message.

### Password-Based Key Wrapping

When a user registers with a password, the member's private key is wrapped (encrypted) using a key derived from the password:

| Parameter | Value |
|-----------|-------|
| KDF | PBKDF2 |
| Salt size | 32 bytes |
| IV size | 16 bytes |
| Master key size | 32 bytes (256 bits) |
| Minimum iterations | 100,000 |
| Wrapping algorithm | AES-256-GCM |

### Mnemonic HMAC (Uniqueness Check)

When a user provides their own mnemonic during registration, the server computes an HMAC to check uniqueness without storing the plaintext:

| Parameter | Value |
|-----------|-------|
| Algorithm | HMAC-SHA256 |
| Secret | `MNEMONIC_HMAC_SECRET` environment variable (hex-encoded) |
| Input | UTF-8 encoded mnemonic string |
| Output | 64-character hex string |

Only the HMAC is stored. The plaintext mnemonic is never persisted.

### Mnemonic Format (BIP39)

Valid mnemonics must match the `MnemonicRegex` pattern from `@digitaldefiance/ecies-lib`:

| Word count | Entropy bits | Checksum bits |
|------------|-------------|---------------|
| 12 words | 128 | 4 |
| 15 words | 160 | 5 |
| 18 words | 192 | 6 |
| 21 words | 224 | 7 |
| 24 words | 256 | 8 |

BrightChain generates 24-word mnemonics (256-bit entropy) by default.

### Multi-Recipient Encryption

For encrypting data to multiple recipients (e.g., shared vaults, group messages):

| Parameter | Value |
|-----------|-------|
| Max recipients | 255 |
| Encrypted key size per recipient | 48 bytes (IV + auth tag + symmetric key) |
| Recipient ID size | 12 bytes |

Each recipient's copy of the symmetric key is encrypted with their ECIES public key.

### Test Vectors

These test vectors are sourced from the cross-platform test suites in `brightchain-cpp`, `brightchain-apple`, and `brightpass-apple`. They can be used to verify that any client implementation produces identical results.

#### Key Derivation (BIP39 → secp256k1)

**Vector 1** — Standard BIP39 test mnemonic (12 words):

| Field | Value |
|-------|-------|
| Mnemonic | `abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about` |
| Derivation path | `m/44'/60'/0'/0/0` |
| Private key | `1ab42cc412b618bdea3a599e3c9bae199ebf030895b039e9db1e30dafb12b727` |
| Public key (compressed) | `0237b0bb7a8288d38ed49a524b5dc98cff3eb5ca824c9f9dc0dfdb3d9cd600f299` |

**Vector 2** — Second BIP39 test mnemonic (12 words):

| Field | Value |
|-------|-------|
| Mnemonic | `legal winner thank year wave sausage worth useful legal winner thank yellow` |
| Derivation path | `m/44'/60'/0'/0/0` |
| Private key | `33fa40f84e854b941c2b0436dd4a256e1df1cb41b9c1c0ccc8446408c19b8bf9` |
| Public key (compressed) | `03a70d1ef368ad99e90d509496e9888ee7404e4f4d360376bf521d769cf0c4de46` |

#### ECDSA Signing

Using Vector 1's key pair:

| Field | Value |
|-------|-------|
| Data (hex) | `deadbeef` |
| Signature (hex, 64 bytes) | `1b2becafb75effaa2d4e4ad33876310a7b7190f9b0fe4c48de00abb7fac27ec1087d1c0c45dd1567233f5eb3fae458347cd4bd5eab7c506ceb3858daf69c336d` |

Verify by recovering the public key from the signature over `deadbeef` and comparing to Vector 1's public key.

#### ECIES Encryption

Cross-member encryption test: Vector 1 encrypts to Vector 2's public key.

| Field | Value |
|-------|-------|
| Sender | Vector 1 (private key `1ab42c...`) |
| Recipient | Vector 2 (public key `03a70d...`) |
| Plaintext | `Hello from TypeScript!` (UTF-8) |

ECIES encryption is non-deterministic (uses an ephemeral key pair), so ciphertext will differ on each run. To verify:
1. Encrypt the plaintext using Vector 2's public key
2. Decrypt using Vector 2's private key
3. Confirm the decrypted output matches the original plaintext

The ECIES implementation supports two modes:
- **basic** — standard ECIES (ephemeral key + ECDH + AES-256-GCM)
- **withLength** — prepends a 4-byte big-endian length prefix to the plaintext before encryption, enabling streaming/chunked decryption

#### SHA3 Hash Vectors

BrightChain uses SHA3-512 (Keccak) for content-addressable block hashing. Vectors sourced from `brightchain-cpp/tests/test_vectors_sha3.json`.

| Input | SHA3-512 Hash (hex, 128 chars) |
|-------|-------------------------------|
| `""` (empty) | `a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26` |
| `"Hello, World!"` | `38e05c33d7b067127f217d8c856e554fcff09c9320b8a5979ce2ff5d95dd27ba35d1fba50c562dfd1d6cc48bc9c5baa4390894418cc942d968f97bcb659419ed` |
| `"1234567890"` | `36dde7d288a2166a651d51ec6ded9e70e72cf6b366293d6f513c75393c57d6f33b949879b9d5e7f7c21cd8c02ede75e74fc54ea15bd043b4df008533fc68ae69` |
| JSON object `{"id":"test-123",...}` | `3f13be01f1841deb0fe1240085313035408253105aa88847d8cab4554570d61477cd8340bb63399d25636a4024f332030d3240004be60bb3b7e7f54ca7569ae5` |

Block-size vectors (for verifying block hashing at various sizes):

| Input | SHA3-512 Hash (hex) |
|-------|---------------------|
| 512 bytes (`0xaa` repeated) | `a238645e984279b4fad65f1490a5fa8d7143e60c0e4b14dfdcd3ad982da028acb28caef01f04dfcb58cd6b18986cbe4df29d53edd013be10d57b223c0a8a0c5b` |
| 1 KB (`0xbb` repeated) | `2221bd465137f2c3ff2db524a0f391585ca3d4f82a6a61860f848da8007bf1ea434057ce1e4568081734df7a9be81173f2cdce04ea9e6c98510a7707c009a0ef` |
| 1 MB (`0xcc` repeated) | `345f55104ed3566d0d5d6fe60d859d09819b528231e20ac0df33d3b08512873a51501c069dd8e904c19be41c250adad69bc716402c327e1aed0a00d1fb46ca4b` |

### Related Documentation

For deeper coverage of specific cryptographic subsystems:
- [Keybase-Inspired Features Architecture](../identity/keybase-features-architecture.md) — device provisioning, identity proofs, Ethereum wallet derivation, git signing
- [Security Analysis](../guides/04-security-analysis.md) — threat model and adversarial review
- [BrightPass Password Manager](../identity/brightpass-password-manager.md) — vault encryption model, Shamir's Secret Sharing for emergency access

---

## JWT Token Structure

**Algorithm:** HS256 (HMAC-SHA256)
**Expiration:** 7 days from issuance

**Payload:**
```json
{
  "memberId": "member-uuid",
  "username": "alice",
  "type": "member",
  "iat": 1741564800,
  "exp": 1742169600
}
```

The `type` field corresponds to `MemberType` from `@digitaldefiance/ecies-lib`.

---

## Authentication Middleware

All endpoints marked "Auth: Yes" are protected by `createJwtAuthMiddleware`. The middleware:

1. Extracts the token from the `Authorization` header (supports `Bearer {token}` and raw token formats)
2. Verifies the signature and expiration using `jsonwebtoken`
3. Attaches an `IMemberContext` to `req.memberContext` containing `memberId`, `username`, `type`, `iat`, `exp`
4. Also sets `req.user` for backward compatibility

For optional authentication (e.g., public endpoints that behave differently for logged-in users), pass `optional: true` to allow requests without tokens to proceed.

### Role-Based Access Control

Apply after the JWT middleware:

```typescript
createRoleMiddleware({
  requiredRoles: ['admin'],
  requiredTypes: [MemberType.ADMIN],
  requireAll: false  // OR logic (any match grants access)
})
```

Convenience helpers: `requireAuth()`, `optionalAuth()`, `requireRoles()`, `requireAllRoles()`, `requireMemberTypes()`, `requireAuthWithRoles()`, `requireAuthWithMemberTypes()`.

---

## Standard Error Response

```json
{
  "message": "Human-readable error description",
  "error": "Technical error detail"
}
```

Some validation errors include an `errors` array with per-field details. Errors from `HandleableError` include a `statusCode` that maps to the HTTP response code.

---

## Related Documentation

- [Authentication Flows (Browser + API)](../identity/authentication-flows.md)
- [Security Analysis](../guides/04-security-analysis.md)
- [BrightPass Password Manager](../identity/brightpass-password-manager.md)
