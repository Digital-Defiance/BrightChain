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

**Request:**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "SecurePass123!"
}
```

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
    "roles": [],
    "rolePrivileges": { "admin": false, "member": true, "child": false, "system": false },
    "emailVerified": true,
    "timezone": "UTC",
    "siteLanguage": "en",
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
    "roles": ["member"],
    "rolePrivileges": { "admin": false, "member": true, "child": false, "system": false },
    "emailVerified": true,
    "timezone": "America/New_York",
    "siteLanguage": "en",
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
