---
title: "BrightChain Crypto Sessions"
parent: "Papers"
nav_order: 11
---

# BrightChain Crypto Sessions: Server-Side Key Custody for End-to-End Encrypted Suites

**Authors:** Digital Defiance
**Version:** 0.1.0 (draft)
**Date:** 2026
**License:** MIT

---

## Abstract

End-to-end encrypted productivity suites face a recurring usability tax: every operation that must touch ciphertext requires the user to re-supply credentials sufficient to derive their private key. State-of-the-art deployments such as Proton, Tutanota, and Apple Advanced Data Protection mitigate this by holding the unlocked key in client memory for the lifetime of a browser session, which trades server trust for cross-site-scripting (XSS) exposure. This paper describes BrightChain's alternative: a sliding-TTL, in-process server-side **crypto session** that holds the unlocked `BackendMember` (secp256k1 private key plus wallet) bound to the JWT identity. We present the threat model, the API surface (`useSessionEstablish`, `useSessionUnlock`), the binding rules that prevent session-id replay across accounts, the disposal protocol that zeroes key material on revocation or expiry, and the migration path to a sealed Redis-backed multi-node deployment. The design is purely additive: existing per-request `authenticateCrypto` flows continue to work unchanged.

**Keywords:** end-to-end encryption, secp256k1, ECIES, session management, key custody, sliding TTL, zero-knowledge, threat model

---

## I. Introduction

The BrightChain suite (BrightCal, BrightDB, BrightMail, BrightPass, BrightChat, BrightHub, BrightLedger, BrightChart, Digital Burnbag) shares a single cryptographic identity per user: a BIP-39 mnemonic that deterministically derives a secp256k1 keypair via [`@digitaldefiance/node-ecies-lib`](ecies-lib). Every encrypted artifact in the suite — calendar event payload, mailbox blob, password vault entry, ledger transcript line — is wrapped under that key (directly for self-only data, or via per-recipient ECIES envelopes for shared data).

The naïve integration requires the user to re-enter their mnemonic on every API call that needs to decrypt or sign. This is unacceptable for an interactive productivity suite, where a single page load may issue tens of requests across multiple products.

The classic mitigation — keeping the unlocked key in browser memory — has well-known downsides. A stored-XSS, malicious browser extension, or compromised CDN-hosted dependency can exfiltrate the live private key. Subresource integrity, content security policy, and isolated workers reduce but do not eliminate this risk class.

BrightChain Crypto Sessions take the opposite trade-off: the unlocked key never leaves the server. The client receives an opaque, HttpOnly, SameSite=Strict cookie. Every API request that needs cryptographic capability resolves the cookie against an in-process session map, and the resolved `BackendMember` is attached to the request handler's `req.eciesUser`. The cookie is meaningless to a JavaScript attacker — its only privilege is "ask the BrightChain backend, while authenticated as user X, to perform a crypto operation on user X's behalf." This is the same shape of authority a successful CSRF would already grant; the additional XSS exposure surface for key material is zero.

The contributions of this paper are:

1. A clear articulation of the trade-off space between client-memory and server-memory key custody for E2EE suites, and an argument for the latter under BrightChain's threat model.
2. The concrete `CryptoSessionStore` data structure and lifecycle, including sliding TTL, absolute cap, and per-user concurrent-session ceiling.
3. The `useSessionEstablish` / `useSessionUnlock` middleware contract and its interaction with the existing `authenticateCrypto` and `cleanupCrypto` middlewares.
4. A threat model and a deployment guide covering single-node, sticky-session, and Redis-sealed configurations.

## II. Threat Model

We adopt the following threat model.

**In scope:**

- Network adversary on any path between the client and the BrightChain origin (TLS-protected; assumes a sound HTTPS deployment).
- Cross-site request forgery from arbitrary third-party origins.
- Stored or reflected XSS in any product surface that ships browser code (client-rendered React).
- Theft of a single client-side artifact (cookie jar, localStorage, IndexedDB).
- Theft of an opaque session id by an authenticated peer attempting to act as a different user.
- Process crash / restart leaking key material.

**Out of scope (explicit non-goals):**

- A malicious BrightChain server operator with root and live RAM access. BrightChain is not zero-knowledge with respect to the server; it is zero-knowledge with respect to *block storage* and *cold storage*. Users who require zero-server-trust must run the open-source backend themselves.
- Compromise of the user's mnemonic at rest (paper, KeePass, etc.).
- Side-channel attacks against the host OS kernel.

**Security goals:**

1. The user's mnemonic is presented to the server at most once per session (typically once per workday).
2. A stolen client cookie is unusable after the sliding TTL elapses or the absolute cap is reached, whichever comes first.
3. A stolen cookie used by a session whose JWT belongs to a different account is rejected before any crypto operation runs.
4. Logout, password rotation, and account-compromise notification can revoke every live session in O(sessions-per-user) time.
5. At process shutdown all live private-key material is zeroed.

## III. Architecture

### A. Components

```
Client                                Server
──────                                ──────
                                      ┌──────────────────────────┐
                                      │ CryptoSessionStore       │
                                      │  Map<sid, Entry>         │
                                      │  Map<userId, Set<sid>>   │
                                      │  sweep(): every 60s      │
                                      └──────────┬───────────────┘
                                                 │ owns
                                                 ▼
  ┌──────────┐  POST /auth/session/establish     ┌──────────────────┐
  │ Browser  │ ──────────────────────────────▶  │ useSessionEstab  │
  │          │   { mnemonic | password }         │  ─ verify creds  │
  │          │                                   │  ─ unlock Member │
  │          │ ◀──────────────────────────────   │  ─ store.estab() │
  │          │   Set-Cookie: bc_session=…        │  ─ set cookie    │
  │          │                                   └──────────────────┘
  │          │
  │          │  GET /api/calendars  (Cookie)     ┌──────────────────┐
  │          │ ──────────────────────────────▶  │ useSessionUnlock │
  │          │                                   │  ─ store.touch() │
  │          │                                   │  ─ req.eciesUser │
  │          │                                   └──────────────────┘
  └──────────┘
```

### B. Session Establishment (`useSessionEstablish`)

The establish endpoint is protected by the JWT middleware and the body must carry either the user's mnemonic or password. The middleware:

1. Loads the user via `application.authProvider.findUserById` and verifies `accountStatus === Active` and `id === req.user.id`.
2. Calls `authenticateWithMnemonic` or `authenticateWithPassword` on the provider, obtaining an `ICryptoAuthResult` containing the unlocked `BackendMember`.
3. Calls `store.establish(userId, member)`, receiving an opaque base64url-encoded 256-bit session id.
4. Sets `Set-Cookie: bc_session=<sid>; HttpOnly; Secure; SameSite=Strict; Path=/` and the `X-BC-Session: <sid>` response header for non-browser clients (CLI, mobile WebView).
5. Calls `next()` so that the upstream login response is sent normally.

### C. Per-Request Resolution (`useSessionUnlock`)

The unlock middleware is mounted globally after JWT auth and before any controller. For every request:

1. If `req.user` is absent, pass through (anonymous routes are never crypto-bound).
2. Read the session id from `cookies.bc_session` or `X-BC-Session` header. If absent, pass through.
3. Call `store.touch(sid, req.user.id)`. The store rejects mismatched user ids in constant time and returns `undefined`. On hit, the entry's `expiresAt` is updated to `min(now + slidingTtl, absoluteExpiresAt)`.
4. Attach the resolved `BackendMember` to `req.eciesUser` and tag the request with the symbol `CRYPTO_SESSION_OWNED`.

The tag is consumed by `cleanupCrypto`, which now skips disposal whenever it is present — the session store, not the request, owns the lifecycle of session-resolved members.

### D. Session Lifecycle

Each `CryptoSessionEntry` records:

| Field                | Purpose                                                              |
|----------------------|----------------------------------------------------------------------|
| `sessionId`          | 256-bit cryptographic random, base64url-encoded.                     |
| `userId`             | The string id of the bound JWT identity.                             |
| `member`             | The unlocked `BackendMember<TID>` (private key in process memory).   |
| `createdAt`          | Absolute start time, used by the per-user concurrency cap.           |
| `expiresAt`          | Sliding deadline, refreshed on every successful `touch`.             |
| `absoluteExpiresAt`  | Hard deadline, never extended.                                       |

**Defaults:**

- Sliding TTL: 15 minutes.
- Absolute cap: 8 hours.
- Per-user concurrent sessions: 10 (oldest by `createdAt` evicted first).
- Sweep cadence: 60 seconds (`unref`'d so it never keeps a process alive on its own).

A process `shutdown()` method clears the sweep interval and disposes every live entry. Servers should call this from their `SIGTERM` handler.

### E. Key Disposal

`BackendMember.dispose()` zeroes the wallet seed, the secp256k1 private scalar, and any cached symmetric subkeys. Disposal happens in three places, and only three:

1. Inside `CryptoSessionStore.destroyEntry()` when a session expires, is revoked, or is evicted.
2. Inside `CryptoSessionStore.shutdown()` for every live entry.
3. Inside `cleanupCrypto` for `BackendMember` instances that were *not* attached by the session middleware (e.g. the legacy `authenticateCrypto` per-request unlock path).

Disposing a session-owned member from the request middleware would corrupt every subsequent request on the same session. The `CRYPTO_SESSION_OWNED` symbol exists precisely to prevent that bug class.

## IV. Comparison to Prior Art

| System                      | Key residence       | Re-auth cadence            | XSS exposure of key       | Server trust required |
|-----------------------------|---------------------|----------------------------|---------------------------|-----------------------|
| Proton Mail                 | Browser memory      | Per browser session        | High (stored-XSS exfil.)  | None for ciphertext   |
| Tutanota                    | Browser memory      | Per browser session        | High                      | None for ciphertext   |
| Apple ADP                   | Device Secure Enclave | Per device boot          | None (HW-protected)       | None for ciphertext   |
| Signal Desktop              | OS keychain         | Per device install         | Low (Electron, no DOM)    | None                  |
| 1Password 8                 | OS keychain         | Per device install + lock  | Low (native app)          | None for blob         |
| Matrix (Element web)        | Browser IndexedDB   | Per device, megolm rotation | High                     | None for E2EE rooms   |
| **BrightChain Crypto Session** | **Server RAM**   | **Per sliding TTL**        | **None (HttpOnly cookie)** | **Medium (live RAM)** |

BrightChain accepts a higher *server* trust requirement than the zero-knowledge ideal. The trade is deliberate: BrightChain users self-host or trust the BrightChain Foundation operator under a published threat model. In exchange, the suite gains immunity to a class of stored-XSS attacks that has repeatedly compromised webmail vendors operating under the zero-knowledge banner.

## V. Deployment Topologies

**Single node (default).** The store is a `Map` in a single Node.js process. No external dependencies. Restart loses every session — users must re-establish.

**Multi-node, sticky.** The L7 load balancer is configured to pin clients to a single backend by `bc_session` cookie. Every session is still in-process; failure of the pinned node forces re-establish on the user's next action. This is the recommended production configuration.

**Multi-node, Redis-sealed (future).** A drop-in `RedisCryptoSessionStore` wraps each `BackendMember` serialization in an ECIES sealed-box keyed to a per-process boot key, which itself lives only in process memory. A node that doesn't hold the boot key cannot read the key material; the session is effectively pinned but failover is possible if and only if the new node holds the same boot key (via a sealed key-distribution channel). This is left as future work.

## VI. Failure Modes and Mitigations

| Failure                                          | Mitigation                                                  |
|--------------------------------------------------|-------------------------------------------------------------|
| Process killed (`SIGKILL`) leaves keys in core dump | Run with `setrlimit(RLIMIT_CORE, 0)` on production hosts. |
| Heap snapshot exfiltration                       | Production builds disable `--inspect`; container hardening blocks `ptrace`. |
| Session id leaked via referrer / log             | Cookie is `HttpOnly` + `SameSite=Strict`; `X-BC-Session` header is never logged at proxy layer. |
| Session id replayed by different user            | `store.touch(sid, req.user.id)` enforces JWT-binding.       |
| User re-establishes from a new device            | Old sessions remain valid up to the per-user cap; on cap-exceed, oldest is evicted. |
| Catastrophic key compromise                      | `revokeAllForUser(userId)` on password rotation invalidates every live session and disposes all member instances. |
| Long-lived login (laptop left open)              | Absolute cap (default 8 hours) forces re-unlock once per day. |

## VII. Extensions and Future Work

- **`brightchain-keywrap`.** A universal `EncryptedEnvelope` library that wraps an AES-256-GCM data-encryption key under an ECIES envelope per recipient. The crypto session is the natural unwrap context — `req.eciesUser` is exactly what `keywrap.unwrap` needs.
- **Redis-sealed multi-node store.** As above.
- **Hardware-backed unlock.** WebAuthn / passkey resident credentials can replace the mnemonic / password for `useSessionEstablish` once the `IAuthenticationProvider` grows an `authenticateWithAttestation` method.
- **Cross-tab session inheritance.** Today each tab inherits the cookie automatically. A `BroadcastChannel` heartbeat is a candidate optimization to avoid every tab triggering its own slide-touch.
- **Audit log.** `establish`, `touch`, `revoke`, `evict`, and `expire` are all observable inflection points. A pluggable observer hook is a natural addition.

## VIII. Conclusion

BrightChain Crypto Sessions deliver per-session crypto-grade UX without holding the user's private key in the browser. The design is intentionally simple: an in-memory map, two middlewares, an explicit ownership symbol, and a sliding-with-cap TTL. It composes cleanly with the existing JWT and `authenticateCrypto` middlewares — neither is changed, and a single deployment can mix per-request and session-based crypto unlock as needs evolve. The threat model is honest about its server-trust assumption, and the deployment guide is explicit about the configurations under which that assumption holds.

---

## Appendix A — Public API

```ts
// services/crypto-session-store.ts
class CryptoSessionStore<TID extends PlatformID = Buffer> {
  constructor(options?: CryptoSessionStoreOptions);
  establish(userId: string, member: BackendMember<TID>): string;
  touch(sessionId: string, expectedUserId: string): BackendMember<TID> | undefined;
  revoke(sessionId: string): void;
  revokeAllForUser(userId: string): void;
  shutdown(): void;
  readonly size: number;
}

// middlewares/session-unlock.ts
function useSessionEstablish<TID, TStatus>(
  application: IApplication<TID>,
  options: SessionMiddlewareOptions<TID>,
): RequestHandler;

function useSessionUnlock<TID>(
  options: SessionMiddlewareOptions<TID>,
): RequestHandler;
```

## Appendix B — Default Constants

| Constant                | Default               |
|-------------------------|-----------------------|
| `slidingTtlMs`          | 15 × 60 × 1000        |
| `absoluteTtlMs`         | 8 × 60 × 60 × 1000    |
| `sweepIntervalMs`       | 60 × 1000             |
| `maxSessionsPerUser`    | 10                    |
| Cookie name             | `bc_session`          |
| Header name             | `X-BC-Session`        |
| Cookie attributes       | `HttpOnly; Secure; SameSite=Strict; Path=/` |

## References

1. ECIES-Lib: Cross-Platform ECIES Library — `docs/papers/ecies-lib.md`.
2. BrightChain Platform Paper — `docs/papers/brightchain.md`.
3. OWASP Application Security Verification Standard v4.0.3, §3 (Session Management) and §6 (Stored Cryptography).
4. Proton Technologies AG. *Mail Security Architecture*. 2023.
5. Tutao GmbH. *Tutanota Encryption Whitepaper*. 2022.
6. Apple Inc. *Advanced Data Protection for iCloud*. 2022.
