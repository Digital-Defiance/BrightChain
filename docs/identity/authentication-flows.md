---
title: "Authentication Flows"
parent: "Identity & Keybase"
nav_order: 2
permalink: /identity/authentication-flows/
---

# Authentication Flows

This document describes the end-to-end authentication flows in BrightChain from both the browser (React) and API (Express) perspectives. For the raw HTTP endpoint reference, see [Authentication API Reference](../api-reference/authentication-api).

## System Overview

BrightChain authentication combines several mechanisms:

- JWT tokens (HS256, 7-day expiry) for stateless API auth
- ECIES challenge-response for passwordless login
- Mnemonic phrases for account recovery
- Argon2id + ECIES backup codes for emergency recovery
- Server-side sessions via `BrightChainSessionAdapter` for logout invalidation
- Role-based access control via middleware

### Component Map

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| Frontend | `authService` (`brightchain-react/src/services/auth.ts`) | Login, register, logout, verify, refresh, change password |
| Frontend | `authenticatedApi` (`brightchain-react/src/services/authenticatedApi.ts`) | Axios client with automatic Bearer token injection |
| Frontend | `api` (`brightchain-react/src/services/api.ts`) | Base Axios client with Accept-Language header |
| Frontend | `AuthProvider` (from `express-suite-react-components`) | React context for auth state, wraps the app |
| Frontend | `useAuth` hook | Access `userData`, `isAuthenticated`, auth functions |
| Backend | `BrightDbUserController` (`brightchain-node-express-suite`) | Base controller with all auth routes |
| Backend | `UserController` (`brightchain-api-lib`) | Extends base with direct-challenge and backup code routes |
| Backend | `AuthService` (`brightchain-api-lib`) | ECIES challenge verification |
| Backend | `BrightDbAuthService` (`brightchain-node-express-suite`) | Register, login, password change, mnemonic recovery, token signing |
| Backend | `createJwtAuthMiddleware` | JWT verification, attaches `memberContext` to request |
| Backend | `createRoleMiddleware` | RBAC enforcement |
| Backend | `BrightChainSessionAdapter` | Server-side session management for logout |
| Shared | `IRequestUser`, `ITokenPayload`, `Member` (`brightchain-lib`) | Shared identity types |

---

## Flow 1: Registration

```
Browser                          API
  │                               │
  │  POST /user/register          │
  │  { username, email, password, │
  │    mnemonic? }                │
  │──────────────────────────────>│
  │                               │── validate fields
  │                               │── if mnemonic provided:
  │                               │     validate format (MnemonicRegex)
  │                               │     compute HMAC, check uniqueness
  │                               │     create Member with forceMnemonic
  │                               │── else:
  │                               │     create Member (server-generated)
  │                               │── hash password (bcrypt)
  │                               │── create EnergyAccount (1000J trial)
  │                               │── create BrightHub social profile
  │                               │── sign JWT
  │                               │
  │  201 { token, memberId,       │
  │        energyBalance }        │
  │<──────────────────────────────│
  │                               │
  │── (app does NOT auto-login    │
  │    after register; user is    │
  │    redirected to login page)  │
```

The mnemonic is generated during member creation (or provided by the user) and should be displayed to the user once for safekeeping. It is the only way to recover the account if the password is lost (aside from backup codes).

Optionally, the user can supply their own BIP39 mnemonic phrase (12, 15, 18, 21, or 24 words). When provided, the server validates the format against `MnemonicRegex`, checks HMAC-based uniqueness (to prevent two accounts sharing the same mnemonic), and passes it to `Member.newMember` via the `forceMnemonic` parameter to derive the user's cryptographic identity deterministically. If the mnemonic's HMAC already exists, registration is rejected with a `Validation_MnemonicInUse` error.

### Frontend code path

```typescript
// brightchain-react/src/services/auth.ts
const result = await api.post('/user/register', {
  username, email, password, timezone,
  ...(mnemonic ? { mnemonic } : {}),
});
// Returns { success: true, message } on 201
// Returns { error, errorType? } on failure
```

---

## Flow 2: Password Login

```
Browser                          API
  │                               │
  │  POST /user/login             │
  │  { username, password }       │
  │──────────────────────────────>│
  │                               │── validate fields
  │                               │── look up user by username
  │                               │── verify password hash
  │                               │── get energy balance
  │                               │── sign JWT
  │                               │
  │  200 { token, memberId,       │
  │        energyBalance }        │
  │<──────────────────────────────│
  │                               │
  │── store token in localStorage │
  │── store user in localStorage  │
  │── setUser() via AuthProvider  │
```

The frontend `login()` function accepts an `isEmail` flag. When true, the identifier is sent as `email` instead of `username`.

### Frontend code path

```typescript
const response = await api.post('/user/login', {
  [isEmail ? 'email' : 'username']: identifier,
  password,
});
// On success: { token: response.data.token }
// Also calls setUser(response.data.user) if user data is present
localStorage.setItem('authToken', token);
```

---

## Flow 3: ECIES Challenge Login (Passwordless)

This is a two-step flow. The client first requests a challenge, then signs it with the member's private key.

```
Browser                          API
  │                               │
  │  POST /user/request-direct-   │
  │  login                        │
  │──────────────────────────────>│
  │                               │── generate timestamp (8 bytes)
  │                               │── generate nonce (32 bytes)
  │                               │── sign(timestamp ‖ nonce) with system key
  │                               │── concat: timestamp ‖ nonce ‖ signature
  │                               │
  │  200 { challenge,             │
  │        serverPublicKey }      │
  │<──────────────────────────────│
  │                               │
  │── sign challenge with member  │
  │   private key                 │
  │                               │
  │  POST /user/direct-challenge  │
  │  { challenge, signature,      │
  │    username }                 │
  │──────────────────────────────>│
  │                               │── parse challenge buffer
  │                               │── verify timestamp not expired (<5min)
  │                               │── verify server signature
  │                               │── look up member
  │                               │── verify member signature
  │                               │── check nonce not reused (replay guard)
  │                               │── store nonce in UsedDirectLoginToken
  │                               │── sign JWT
  │                               │
  │  200 { token, user,           │
  │        serverPublicKey }      │
  │<──────────────────────────────│
  │                               │
  │── store token + user          │
```

### Challenge buffer layout

```
Offset  Length   Content
0       8        Timestamp (big-endian uint64, ms since epoch)
8       32       Random nonce
40      64       Server ECIES signature over bytes [0..40)
```

---

## Flow 4: App Load / Token Verification

When the app loads, the `AuthProvider` checks for a stored token and verifies it.

```
Browser                          API
  │                               │
  │── read authToken from         │
  │   localStorage                │
  │                               │
  │  GET /user/verify             │
  │  Authorization: Bearer {tok}  │
  │──────────────────────────────>│
  │                               │── JWT middleware verifies token
  │                               │── build user DTO from decoded token
  │                               │
  │  200 { user }                 │
  │<──────────────────────────────│
  │                               │
  │── setUser(user)               │
  │── setIsAuthenticated(true)    │
```

### Frontend code path

```typescript
const response = await api.get('/user/verify', {
  headers: { Authorization: `Bearer ${token}` },
});
return response.data.user; // IRequestUser
```

If the token is expired or invalid, the frontend clears localStorage and shows the login page.

---

## Flow 5: Authenticated API Requests

All authenticated requests use the `authenticatedApi` Axios instance, which is created by `createAuthenticatedApiClient` from `express-suite-react-components`. It automatically reads the token from localStorage and injects the `Authorization: Bearer` header.

```typescript
import authenticatedApi from './authenticatedApi';

// Token is injected automatically
const response = await authenticatedApi.get('/user/profile');
```

The base `api` instance (used for unauthenticated calls like login/register) adds an `Accept-Language` header from localStorage.

---

## Flow 6: Token Refresh

```
Browser                          API
  │                               │
  │  GET /user/refresh-token      │
  │  Authorization: Bearer {tok}  │
  │──────────────────────────────>│
  │                               │── verify current JWT
  │                               │── re-sign with fresh expiry
  │                               │
  │  200 { token, user }          │
  │  Authorization: Bearer {new}  │
  │<──────────────────────────────│
  │                               │
  │── update authToken in         │
  │   localStorage                │
  │── update user in localStorage │
  │── setUser(updatedUser)        │
```

### Frontend code path

```typescript
const refreshResponse = await authenticatedApi.get('/user/refresh-token');
const newToken = refreshResponse.headers['authorization'];
if (newToken?.startsWith('Bearer ')) {
  localStorage.setItem('authToken', newToken.slice(7));
}
if (refreshResponse.data.user) {
  localStorage.setItem('user', JSON.stringify(refreshResponse.data.user));
}
```

---

## Flow 7: Password Change

```
Browser                          API
  │                               │
  │  POST /user/change-password   │
  │  Authorization: Bearer {tok}  │
  │  { currentPassword,           │
  │    newPassword }              │
  │──────────────────────────────>│
  │                               │── validate fields
  │                               │── verify current password
  │                               │── hash new password
  │                               │── update member record
  │                               │
  │  200 { memberId, success }    │
  │<──────────────────────────────│
```

---

## Flow 8: Account Recovery (Mnemonic)

```
Browser                          API
  │                               │
  │  POST /user/recover           │
  │  { email, mnemonic,           │
  │    newPassword }              │
  │──────────────────────────────>│
  │                               │── validate fields
  │                               │── look up user by email
  │                               │── verify mnemonic
  │                               │── set new password
  │                               │
  │  200 { data }                 │
  │<──────────────────────────────│
```

Returns `401` if the mnemonic is invalid or credentials don't match.

---

## Flow 9: Backup Code Recovery

Backup codes provide an alternative recovery path. Each user can generate 10 codes, encrypted with ECIES and hashed with Argon2id.

```
Browser                          API
  │                               │
  │  POST /user/backup-codes      │
  │──────────────────────────────>│── generate 10 codes
  │  200 { backupCodes: [...] }   │
  │<──────────────────────────────│
  │                               │
  │  (user stores codes safely)   │
  │                               │
  │  POST /user/recover-backup    │
  │  { backupCode, newPassword? } │
  │──────────────────────────────>│── verify code against stored hashes
  │                               │── consume code (one-time use)
  │                               │── optionally set new password
  │  200 { codeCount: 9 }        │
  │<──────────────────────────────│
```

Additional backup code endpoints:
- `GET /user/backup-codes` — returns `{ codeCount }` (remaining unused codes)
- `PUT /user/backup-codes` — regenerates all codes, invalidating old ones

---

## Flow 10: Logout

Logout is both client-side and server-side. The server invalidates the session via `BrightChainSessionAdapter`.

```
Browser                          API
  │                               │
  │  POST /user/logout            │
  │  Authorization: Bearer {tok}  │
  │──────────────────────────────>│
  │                               │── validate token via session adapter
  │                               │── delete session record
  │                               │
  │  200 { message: "Success" }   │
  │<──────────────────────────────│
  │                               │
  │── localStorage.removeItem     │
  │   ('authToken')               │
  │── localStorage.removeItem     │
  │   ('user')                    │
  │── setUser(null)               │
  │── navigate('/login')          │
```

---

## Flow 11: User Settings

Settings are user-facing preferences (timezone, dark mode, language, currency, direct challenge toggle). They are stored in the `user_settings` MongoDB collection, separate from the member store's replication settings.

- `GET /user/settings` — returns current preferences
- `POST /user/settings` — partial update (only provided fields change)

---

## Security Summary

| Concern | Implementation |
|---------|---------------|
| Password storage | bcrypt (10 salt rounds) |
| Token algorithm | HS256 (HMAC-SHA256) |
| Token expiry | 7 days |
| Token storage (client) | localStorage |
| Challenge expiry | 5 minutes |
| Replay prevention | Nonce stored in `UsedDirectLoginToken` |
| Backup codes | Argon2id hash + ECIES encryption |
| Session invalidation | Server-side via `BrightChainSessionAdapter` |
| RBAC | Middleware checks `MemberType` and role arrays |
| Request language | `Accept-Language` header from localStorage |

### Token storage note

Tokens are stored in `localStorage`, which is accessible to any JavaScript running on the page (XSS risk). For production hardening, consider migrating to `httpOnly` cookies with `SameSite=Strict`.

---

## Configuration

### Environment Variables

```bash
JWT_SECRET=your-jwt-secret
MNEMONIC_HMAC_SECRET=your-hmac-secret
MNEMONIC_ENCRYPTION_KEY=your-encryption-key
```

### Constants

```typescript
ECIES.SIGNATURE_SIZE = 64;           // bytes
LoginChallengeExpiration = 300000;   // 5 minutes in ms
```

---

## File Map

```
brightchain-node-express-suite/src/lib/
├── controllers/user.ts              # Base controller (register, login, profile, settings, etc.)
├── services/auth.ts                 # BrightDbAuthService (register, login, token, recovery)
├── services/sessionAdapter.ts       # BrightChainSessionAdapter (session management)
└── validation/userValidation.ts     # Input validation

brightchain-api-lib/src/lib/
├── controllers/api/user.ts          # Extended controller (direct-challenge, backup codes)
├── services/auth.ts                 # AuthService (ECIES challenge verification)
├── middlewares/authentication.ts    # JWT + RBAC middleware
└── auth/
    ├── aclDocumentStore.ts
    ├── ecdsaNodeAuthenticator.ts
    └── poolAclStore.ts

brightchain-react/src/
├── services/auth.ts                 # Frontend auth service
├── services/api.ts                  # Base Axios instance
├── services/authenticatedApi.ts     # Token-injecting Axios instance
└── app/app.tsx                      # AuthProvider setup
```

## Related Documentation

- [Authentication API Reference](../api-reference/authentication-api)
- [Security Analysis](../guides/04-security-analysis)
- [Email Gateway Configuration](../messaging/email-gateway-configuration)
- [BrightPass Password Manager](../identity/brightpass-password-manager)
