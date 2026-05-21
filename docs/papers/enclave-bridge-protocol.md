---
title: "Enclave Bridge Protocol (EBP/1) — Replication-Grade Specification"
parent: "Papers"
nav_order: 18
---

# Enclave Bridge Protocol (EBP/1) — A Replication-Grade Specification of the Apple Secure Enclave Bridge, Client, and Keyring

**Authors:** Digital Defiance
**Status:** Informational specification, replication-grade
**Version:** 1.0 (EBP/1)
**Date:** 2026
**Companion artifacts:**

- Server reference implementation: `Enclave Bridge` (SwiftUI macOS status bar app, Apple Silicon)
- Client reference implementation: `@digitaldefiance/enclave-bridge-client` (TypeScript, Node.js ≥18)
- Consumer reference: `brightchain-api-lib/src/lib/secureEnclaveKeyring.ts`
- Wire-compatible cipher: `@digitaldefiance/node-ecies-lib`
- Companion paper: [ECIES-Lib](ecies-lib)

---

## Abstract

This document specifies the Enclave Bridge Protocol (EBP/1), a JSON-over-Unix-domain-socket protocol that exposes a subset of Apple Secure Enclave operations (P-256 hardware-backed signing) and a host-resident secp256k1 key (used for ECIES encryption/decryption compatible with `@digitaldefiance/node-ecies-lib`) to local Node.js clients on macOS Apple Silicon. The specification covers, in normative detail: the transport, the message framing, the complete command set, every request and response field, the cryptographic primitives (curves, key formats, KDF parameters, AAD construction, AES-GCM nonce/tag widths), the binary ECIES wire format expected by `ENCLAVE_DECRYPT`, the on-disk persistence of both the secp256k1 private key and the TOTP configuration, the Secure Enclave key access-control flags, the optional TOTP 2FA layer (RFC 6238 with this server's specific parameters), and the consumer-side double-encryption scheme used by `SecureEnclaveKeyring` in `brightchain-api-lib`. The document is intended to be sufficient for a third party to write an interoperable client or server from scratch.

**Keywords:** Apple Secure Enclave, ECIES, secp256k1, P-256, AES-256-GCM, HKDF, Unix domain socket, TOTP, scrypt, Node.js, Swift, BrightChain.

---

## 1. Introduction

Apple Silicon devices ship a Secure Enclave coprocessor capable of generating and using non-extractable P-256 (secp256r1) private keys. Apple's CryptoKit `SecureEnclave.P256.Signing.PrivateKey` exposes those keys for ECDSA signatures, and the underlying SEP also supports key agreement; however, the key material never leaves the enclave and is bound to the device. There is no Apple-provided IPC surface that lets a Node.js process drive the enclave directly.

The **Enclave Bridge** is a small SwiftUI status-bar application that opens a Unix domain socket on macOS, advertises a JSON command protocol, and proxies a curated subset of cryptographic operations: it can sign with the enclave's P-256 key and decrypt ECIES messages addressed to a host-resident secp256k1 key. The matching **enclave-bridge-client** is a TypeScript library that speaks this protocol from Node.js. On top of those two, **`SecureEnclaveKeyring`** in `brightchain-api-lib` layers password-based AES-256-GCM and ECIES-to-the-bridge encryption to produce a defense-in-depth, hardware-anchored key store usable by the rest of the BrightChain stack.

This paper documents all three components in enough detail to re-implement the protocol or replace any of the parties.

### 1.1 Conventions

- The keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are interpreted as in RFC 2119.
- Multi-byte integers on the wire are big-endian (network order) where they appear; this document calls them out explicitly.
- "secp256k1" refers to the Bitcoin curve. "P-256" and "secp256r1" are used interchangeably and refer to the NIST P-256 curve used by the Secure Enclave.
- All hexadecimal byte values are written `0xNN`.
- Byte buffers in transit (over JSON) are encoded as **standard Base64 with padding** (`Data.base64EncodedString()` on the Swift side, `Buffer.toString('base64')` in Node).

### 1.2 Component overview

```
┌──────────────────────┐    Unix socket            ┌────────────────────────────┐
│ Node.js application  │  /tmp/enclave-bridge.sock │  Enclave Bridge (SwiftUI)  │
│                      │  ───────────────────────► │                            │
│  ┌────────────────┐  │   JSON requests           │  BridgeProtocolHandler     │
│  │ EnclaveBridge  │  │                           │  ├─ ECIESKeyManager        │
│  │ Client         │  │   JSON responses          │  │  (secp256k1 priv on FS) │
│  └────────────────┘  │  ◄───────────────────────│  ├─ SecureEnclaveKeyManager │
│  ┌────────────────┐  │                           │  │  (P-256 in SEP)         │
│  │ node-ecies-lib │  │                           │  ├─ TOTPManager (RFC 6238) │
│  └────────────────┘  │                           │  └─ AppState / SocketServer│
│  ┌────────────────┐  │                           │                            │
│  │SecureEnclave-  │  │                           │                            │
│  │Keyring         │  │                           │                            │
│  └────────────────┘  │                           │                            │
└──────────────────────┘                           └────────────────────────────┘
```

The protocol surface (what a third-party client or server MUST implement) is the JSON command set in §4 plus the binary ECIES wire format in §5.

---

## 2. Transport

### 2.1 Socket type

The server **MUST** create an `AF_UNIX`, `SOCK_STREAM` socket and **MUST** `listen(2)` with a backlog of at least 5. The reference server uses `backlog = 5`. The server accepts connections concurrently and dispatches each accepted file descriptor to its own `DispatchQueue`.

### 2.2 Socket path discovery

Clients **MUST** locate the socket by trying these absolute paths in order and using the first one that exists and is accessible (`fs.access(F_OK)`):

1. `${HOME}/Library/Containers/com.JessicaMulein.EnclaveBridge/Data/.enclave/enclave-bridge.sock` — sandboxed (Mac App Store) install.
2. `${HOME}/.enclave/enclave-bridge.sock` — direct (non-sandboxed) install.
3. `/tmp/enclave-bridge.sock` — legacy/default fallback. This is also the value of `EnclaveBridgeClient.DEFAULT_SOCKET_PATH`.

If none of those exist, the client **MUST** treat the bridge as unavailable. Implementations MAY accept an explicit override path.

### 2.3 Concurrency and lifetime

- The server accepts multiple simultaneous client connections; each connection has its own `BridgeProtocolHandler` instance and therefore its own `peerPublicKey` slot.
- A connection may issue any number of sequential commands; the server returns exactly one JSON response per request.
- Either side MAY close the connection at any time. The reference client treats EOF as a normal close, fires the `disconnect` event, and (if `autoReconnect` is enabled) schedules an exponential-backoff reconnect.

### 2.4 Read buffer sizing

The reference server reads in 4096-byte chunks (`bufferSize = 4096`) and accumulates them into a per-connection `dataBuffer`. There is no length-prefix; framing is recovered as described in §3.

---

## 3. Message framing

### 3.1 Wire format

Messages are **UTF-8-encoded JSON objects**, written back-to-back on the stream with **no delimiter, no newline, and no length prefix**. A request is one JSON object; a response is one JSON object. Both ends MUST parse complete JSON objects out of the byte stream.

### 3.2 Server framing rule (reference behavior)

The reference server uses a **byte-equality match on `}` (0x7D)** to terminate a message: each time it reads bytes, it scans the connection buffer for `0x7D`, slices everything up to and including the first `0x7D` as one message, parses it as JSON, and dispatches. This works because no current command has a nested object in its request — every request is a flat object whose only `}` is the terminator.

> **Implementation note.** A new client that needs to send a command containing a nested JSON object would break the reference server's framer. Until the server is updated to count braces, **clients MUST NOT send nested JSON objects in requests**. Strings, numbers, booleans, and Base64-encoded byte strings are sufficient for every command in this specification.

### 3.3 Client framing rule (reference behavior)

The reference client implements a brace-counting parser that:

1. Skips ahead to the next `{`.
2. Walks the buffer character by character, tracking a string-mode flag (toggled by unescaped `"`), an escape flag (set after `\` while in string mode and cleared on the next character), and a brace counter incremented on `{` and decremented on `}` outside strings.
3. Treats `braceCount == 0` as the end of one complete JSON object.
4. Holds incomplete tail bytes in `responseBuffer` until more data arrives.

This parser correctly handles nested objects, embedded `}` inside strings, and escaped quotes in responses. Reimplementations MAY use a streaming JSON parser instead.

### 3.4 Request/response correlation

The reference protocol is strictly **request-response, in-order, per connection**: every request from the client elicits exactly one response, and the server answers in the order it received the requests on a given connection. There is no request ID. The reference client enforces this by tracking a queue of in-flight requests (`requestQueue`) and resolving the oldest "sent" entry when a complete JSON response is parsed. Re-implementations that allow request pipelining MUST preserve FIFO ordering on the wire.

### 3.5 Encoding of binary fields

All binary fields carried inside JSON (public keys, signatures, ciphertexts, plaintext output) are **standard Base64 with padding**. Implementations MUST use `Data.base64EncodedString()` (Swift) or `Buffer.from(value, 'base64') / Buffer.toString('base64')` (Node) semantics. Hex is **not** used on the wire.

---

## 4. Command set (EBP/1)

Every request is a JSON object with at least a `cmd` string field and zero or more typed parameters. Every response is a JSON object that is either a success object (command-specific shape) **or** an error object of the form:

```json
{ "error": "<human-readable reason>" }
```

If JSON parsing fails or `cmd` is missing/non-string, the server **MUST** return `{"error":"Invalid request format"}`. If the command is unknown, the server **MUST** return `{"error":"Unknown command: <cmd>"}`.

The command alphabet defined by EBP/1 is exactly:

| # | Command | Purpose |
|---|---|---|
| 1 | `HEARTBEAT` | Liveness probe with timestamp |
| 2 | `VERSION` (alias `INFO`) | App version, build, platform, uptime |
| 3 | `STATUS` | Peer-key flag, enclave availability |
| 4 | `METRICS` | Service uptime and (reserved) counters |
| 5 | `GET_PUBLIC_KEY` | Bridge's secp256k1 public key (for ECIES) |
| 6 | `GET_ENCLAVE_PUBLIC_KEY` | Secure Enclave P-256 public key |
| 7 | `SET_PEER_PUBLIC_KEY` | Cache a peer's secp256k1 public key on the connection |
| 8 | `LIST_KEYS` | Enumerate keys with TOTP status |
| 9 | `ENCLAVE_SIGN` | ECDSA-SHA256 over P-256 in SEP |
| 10 | `ENCLAVE_DECRYPT` | ECIES decrypt with the bridge secp256k1 private key |
| 11 | `ENCLAVE_GENERATE_KEY` | (Reserved; returns error in EBP/1) |
| 12 | `ENCLAVE_ROTATE_KEY` | (Reserved; returns error in EBP/1) |
| 13 | `ENABLE_TOTP` | Enable per-key TOTP and emit provisioning URI |
| 14 | `EXPORT_KEY` | Export public key, gated by TOTP if enabled |

Commands 1–12 form the core protocol. Commands 13–14 form the TOTP 2FA extension, which is part of EBP/1 (the reference server implements it; clients SHOULD implement it but MAY treat it as optional).

### 4.1 `HEARTBEAT`

**Request**

```json
{ "cmd": "HEARTBEAT" }
```

**Response**

```json
{
  "ok": true,
  "timestamp": "2026-05-20T17:02:11Z",
  "service": "enclave-bridge"
}
```

- `timestamp` is an ISO-8601 timestamp produced by `ISO8601DateFormatter` (UTC, second resolution).
- `service` is the literal string `"enclave-bridge"`.
- The server does not error on this command; clients SHOULD treat any successful JSON response with `ok=true` as a positive liveness signal.

### 4.2 `VERSION` / `INFO`

`INFO` and `VERSION` are aliases.

**Request**

```json
{ "cmd": "VERSION" }
```

**Response**

```json
{
  "appVersion": "1.0",
  "build": "12",
  "platform": "macOS",
  "uptimeSeconds": 4231
}
```

- `appVersion` comes from `Bundle.main.infoDictionary["CFBundleShortVersionString"]`. If unavailable, the server returns the literal `"unknown"`.
- `build` comes from `CFBundleVersion` (same fallback).
- `platform` is always `"macOS"` for EBP/1.
- `uptimeSeconds` is the integer number of seconds since the static `BridgeProtocolHandler.startTime` was initialised at process start.

### 4.3 `STATUS`

**Request**

```json
{ "cmd": "STATUS" }
```

**Response**

```json
{
  "ok": true,
  "peerPublicKeySet": false,
  "enclaveKeyAvailable": true
}
```

- `peerPublicKeySet` is `true` iff `SET_PEER_PUBLIC_KEY` has been called on **this connection**. The peer key is per-connection state; new connections start with `peerPublicKeySet=false`.
- `enclaveKeyAvailable` is `true` iff a successful call to `SecureEnclaveKeyManager.getPublicKeyData()` returned a non-empty `x963Representation`. A `false` value indicates the SEP is unreachable, the device lacks a Secure Enclave, or the key has not been provisioned yet.

### 4.4 `METRICS`

**Request**

```json
{ "cmd": "METRICS" }
```

**Response**

```json
{
  "service": "enclave-bridge",
  "uptimeSeconds": 4231,
  "requestCounters": {}
}
```

`requestCounters` is reserved. The reference server currently returns an empty object; future versions MAY populate it with per-command counters. Clients MUST tolerate any string→number map and MUST NOT assume any specific keys.

### 4.5 `GET_PUBLIC_KEY`

Returns the **bridge's persistent secp256k1 public key** used as the recipient key for ECIES (i.e. the key whose private half decrypts payloads sent to `ENCLAVE_DECRYPT`).

**Request**

```json
{ "cmd": "GET_PUBLIC_KEY" }
```

**Success response**

```json
{ "publicKey": "BCsf...==" }
```

- `publicKey` is **Base64 of the 65-byte uncompressed SEC1 encoding** of the secp256k1 public key (`0x04 || X(32) || Y(32)`).
- The reference server obtains the bytes via `P256K.KeyAgreement.PrivateKey.publicKey.dataRepresentation`, which always emits the uncompressed form.
- The private half is persisted to disk; see §6.1 for the file path and permissions. Subsequent calls MUST return the same key for the lifetime of that file.

**Error response (example)**

```json
{ "error": "Failed to get ECIES public key: <reason>" }
```

### 4.6 `GET_ENCLAVE_PUBLIC_KEY`

Returns the **Secure Enclave P-256 public key**.

**Request**

```json
{ "cmd": "GET_ENCLAVE_PUBLIC_KEY" }
```

**Success response**

```json
{ "publicKey": "BNK1...==" }
```

- `publicKey` is **Base64 of the 65-byte uncompressed X9.63 encoding** (`SecureEnclave.P256.Signing.PublicKey.x963Representation`), which is `0x04 || X(32) || Y(32)`.
- The bridge generates the SEP key on first request (see §6.2). Once generated, the public key is stable for that device user.
- The corresponding private key is **non-extractable**; this command exposes only the public half.

### 4.7 `SET_PEER_PUBLIC_KEY`

Caches a peer's secp256k1 public key in the **per-connection** `peerPublicKey` slot. The reference server retains this for use by future protocol extensions (e.g. server-initiated ECIES outputs) and for `STATUS.peerPublicKeySet`. It is not currently consumed by `ENCLAVE_DECRYPT`, which uses the ephemeral key carried in the ciphertext header.

**Request**

```json
{
  "cmd": "SET_PEER_PUBLIC_KEY",
  "publicKey": "<base64-secp256k1-pubkey>"
}
```

The server **MUST** accept either format on the wire (Base64-decoded byte length 33 compressed or 65 uncompressed). The reference server stores the bytes verbatim without re-validation; clients SHOULD send the **uncompressed** form to match the rest of the protocol.

**Success**

```json
{ "ok": true }
```

**Errors**

- `{"error":"Missing or invalid publicKey"}` — `publicKey` field is missing or not Base64-decodable.

### 4.8 `LIST_KEYS`

Enumerates the keys known to the bridge along with their TOTP state.

**Request**

```json
{ "cmd": "LIST_KEYS" }
```

**Response**

```json
{
  "keys": [
    {
      "id": "ecies-secp256k1",
      "type": "secp256k1",
      "publicKeyFingerprint": "AB:CD:EF:01:23:45:67:89",
      "isSecureEnclave": false,
      "totpEnabled": true,
      "totpProvisioningURI": "otpauth://totp/EnclaveBridge:user@example.com?secret=...&issuer=EnclaveBridge&algorithm=SHA1&digits=6&period=30"
    },
    {
      "id": "secure-enclave-p256",
      "type": "Secure Enclave (P-256)",
      "publicKeyFingerprint": "12:34:56:78:9A:BC:DE:F0",
      "isSecureEnclave": true,
      "totpEnabled": false,
      "totpProvisioningURI": ""
    }
  ]
}
```

Field semantics:

- `id` — stable identifier. The two reserved IDs are `"ecies-secp256k1"` and `"secure-enclave-p256"`. All TOTP-gated commands take an `id` from this set.
- `type` — one of `"secp256k1"` or `"Secure Enclave (P-256)"` (see `KeyInfo.KeyType` in `AppState.swift`).
- `publicKeyFingerprint` — uppercase, colon-separated, **first 8 bytes of SHA-256** over the public key bytes (formatted `%02X` per byte, joined with `:`).
- `isSecureEnclave` — `true` iff the key is hardware-backed.
- `totpEnabled` — `true` iff a TOTP secret is recorded for this `id` in the on-disk TOTP config (see §6.3).
- `totpProvisioningURI` — present and non-empty iff `totpEnabled` is `true`. Empty string otherwise (the field is always present).

### 4.9 `ENCLAVE_SIGN`

Computes an ECDSA signature over the supplied data using the Secure Enclave P-256 private key. Apple's CryptoKit takes care of hashing inside the SEP; the input bytes are passed to `priv.signature(for:)` which performs SHA-256 internally before signing.

**Request**

```json
{
  "cmd": "ENCLAVE_SIGN",
  "data": "<base64-bytes-to-sign>"
}
```

- `data` is Base64 of arbitrary bytes. The reference implementation imposes no length cap; in practice, any size that fits in one socket message is acceptable.

**Success response**

```json
{ "signature": "MEUCIQ...==" }
```

- `signature` is Base64 of the **DER-encoded ECDSA signature** (`P256.Signing.ECDSASignature.derRepresentation`). Verifiers MUST decode the DER `SEQUENCE { INTEGER r, INTEGER s }` to recover `(r, s)`. The reference client's `verifyP256Signature` helper feeds this DER blob into Node's `crypto.createVerify('SHA256')`.

> **Important:** The signature is computed by passing the raw `data` to `priv.signature(for:)`, which **internally SHA-256-hashes** before applying ECDSA. A verifier that recomputes the digest itself MUST therefore SHA-256 the **same bytes** before calling `verify`. The reference client does this:
>
> ```ts
> const hash = createHash('sha256').update(dataBuffer).digest();
> const verify = createVerify('SHA256');
> verify.update(hash);
> verify.verify(pemKey, signature);
> ```
>
> This double-hash construction (verifier hashes, then `createVerify('SHA256')` hashes again) is consistent with the reference behaviour shipped today; replicators MUST mirror it for compatibility, or use a verifier that calls a low-level ECDSA verify with `(SHA256(data), signature, pubKey)` directly.

**Errors**

- `{"error":"Missing or invalid data to sign"}` — missing or non-Base64 `data`.
- `{"error":"Signing failed: <reason>"}` — SEP refused or returned an error.

### 4.10 `ENCLAVE_DECRYPT`

Decrypts an ECIES envelope addressed to the bridge's persistent secp256k1 public key (the one returned by `GET_PUBLIC_KEY`). The wire format of the ciphertext is specified in §5.

**Request**

```json
{
  "cmd": "ENCLAVE_DECRYPT",
  "data": "<base64 ECIES envelope>"
}
```

**Success**

```json
{ "plaintext": "<base64 plaintext>" }
```

**Errors**

- `{"error":"Missing or invalid data to decrypt"}` — missing/non-Base64 input.
- `{"error":"Encrypted data too short"}` — fewer than 64 bytes (header floor).
- `{"error":"Invalid ephemeral public key format"}` — header byte after the 3-byte preamble is not `0x02`, `0x03`, or `0x04`, or there are not enough trailing bytes for a 33- or 65-byte key.
- `{"error":"Missing length field"}` / `{"error":"Ciphertext length mismatch"}` — only for `WithLength` envelopes (type `0x42`).
- `{"error":"ECDH failed: empty shared secret"}` — peer ephemeral key did not yield a shared point.
- `{"error":"Decryption failed"}` — AES-GCM tag verification failed.
- `{"error":"ECDH failed: <reason>"}` — `P256K` raised an exception while loading the ephemeral key or computing the shared secret.

### 4.11 `ENCLAVE_GENERATE_KEY` (reserved)

Returns `{"error":"ENCLAVE_GENERATE_KEY not implemented"}` in EBP/1. The bridge auto-creates its keys on first use (see §6); this command is reserved for future multi-key support. Clients MUST handle the error gracefully and SHOULD NOT treat it as a fatal condition.

### 4.12 `ENCLAVE_ROTATE_KEY` (reserved)

Returns `{"error":"ENCLAVE_ROTATE_KEY not supported on this platform"}` in EBP/1. Apple's APIs do not currently support replacing a Secure Enclave key in place while preserving its access-control metadata. Reserved for future use.

### 4.13 `ENABLE_TOTP` (TOTP extension)

Generates a fresh TOTP secret for the named key, writes it to the on-disk TOTP config (§6.3), refreshes `AppState.keys`, and returns the provisioning URI suitable for QR-encoding into Google Authenticator, Authy, 1Password, etc.

**Request**

```json
{
  "cmd": "ENABLE_TOTP",
  "keyId": "ecies-secp256k1",
  "account": "alice@example.com",
  "issuer": "EnclaveBridge"
}
```

- `keyId` MUST be one of the documented IDs (`ecies-secp256k1` or `secure-enclave-p256`). The reference server does not currently validate the ID against the actual key set; future revisions MAY reject unknown IDs.
- `account` and `issuer` are arbitrary strings; they appear in the provisioning URI as `issuer:account`.

**Success**

```json
{
  "provisioningURI": "otpauth://totp/EnclaveBridge:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=EnclaveBridge&algorithm=SHA1&digits=6&period=30"
}
```

The URI parameters are fixed by the server: `algorithm=SHA1`, `digits=6`, `period=30`. The `secret` is a fresh 20-byte CSPRNG output, RFC 4648 Base32-encoded (uppercase alphabet `A–Z 2–7`). See §6.3 for the on-disk format and §7 for the TOTP algorithm.

**Errors**

- `{"error":"Missing keyId, account, or issuer"}` — any of the three fields missing or non-string.
- `{"error":"Failed to enable TOTP for key"}` — disk write failed.

### 4.14 `EXPORT_KEY` (TOTP extension)

Exports the **public** half of a named key, gated by TOTP if and only if TOTP is enabled for that key.

**Request**

```json
{
  "cmd": "EXPORT_KEY",
  "keyId": "ecies-secp256k1",
  "totpCode": "493017"
}
```

- `totpCode` MUST be supplied if TOTP has been enabled for `keyId`; the field MUST be omitted (or any value) otherwise. The reference server's `validateTOTP` implementation returns `true` immediately when no TOTP secret is recorded for the key, regardless of whether `totpCode` is present.

**Success** (same shape as `GET_PUBLIC_KEY` / `GET_ENCLAVE_PUBLIC_KEY`)

```json
{ "publicKey": "<base64 SEC1 pub key>" }
```

The returned public key:

- For `keyId="ecies-secp256k1"`: 65-byte uncompressed secp256k1, identical to `GET_PUBLIC_KEY`.
- For `keyId="secure-enclave-p256"`: 65-byte uncompressed P-256 X9.63, identical to `GET_ENCLAVE_PUBLIC_KEY`.

**Errors**

- `{"error":"Missing keyId"}` — `keyId` field absent or non-string.
- `{"error":"TOTP code required or invalid for this key"}` — TOTP is enabled and the provided code did not validate within the ±30 s window.
- `{"error":"Unknown keyId"}` — `keyId` not in the reserved set.
- `{"error":"Failed to export ECIES public key: <reason>"}` / `{"error":"Failed to export Secure Enclave public key: <reason>"}` — underlying key access failed.

### 4.15 Error envelope summary

All error responses are JSON objects with a single `error` field of type string. Implementations MUST NOT return `error` together with a success field. Implementations MUST close the connection only on hard transport failures; protocol-level errors leave the connection open and ready for the next request.

---

## 5. Cryptography

### 5.1 Curves and key formats

| Algorithm | Curve | Public key encoding | Compressed accepted | Notes |
|---|---|---|---|---|
| ECIES (bridge persistent key) | secp256k1 | SEC1 uncompressed (`0x04 \|\| X(32) \|\| Y(32)`, 65 B) | Yes (33 B, `0x02`/`0x03`) inside ciphertext header only | secp256k1.swift / `P256K.KeyAgreement.PrivateKey` |
| ECIES (ephemeral, per message) | secp256k1 | **33 B compressed** in the canonical `@digitaldefiance/ecies-lib` v4.0 wire format. The reference server additionally accepts 65 B uncompressed for legacy interop. | Yes | Format detected from header byte (see §5.4) |
| Signing (Secure Enclave) | NIST P-256 | X9.63 uncompressed (65 B), with `0x04` prefix | No | `SecureEnclave.P256.Signing.PrivateKey` |

The bridge **public-key endpoints** (`GET_PUBLIC_KEY`, `GET_ENCLAVE_PUBLIC_KEY`, `EXPORT_KEY`) ALWAYS emit the **65-byte uncompressed** form. A 33-byte compressed form appears as the **ephemeral** key inside an ECIES envelope.

> **Canonical encoding for new senders.** The `@digitaldefiance/ecies-lib` v4.0 protocol — the binding reference for all wire-level details (constant `ECIES.PUBLIC_KEY_LENGTH = 33`) — emits **only 33-byte compressed** ephemeral keys. New senders MUST emit 33-byte compressed; the 65-byte branch in the reference server's `ENCLAVE_DECRYPT` parser is a **legacy-tolerance** path retained only so existing clients that produced uncompressed envelopes continue to work. A future bridge revision MAY reject 65-byte ephemeral keys; replicators of either side SHOULD therefore treat 33 bytes as the wire format and 65 bytes as a deprecated grace window.

### 5.2 Symmetric cipher

- Algorithm: **AES-256-GCM**.
- Symmetric key length: **32 bytes** (256 bits).
- IV length: **12 bytes**, randomly chosen per message (`SecRandomCopyBytes` on the server side; `crypto.randomBytes(12)` on the client side). This matches the canonical `@digitaldefiance/ecies-lib` constant `ECIES.IV_SIZE = 12`.

> **The 16-byte-IV helper is non-conformant; do not use it.** The Swift `eciesEncrypt` helper in `BridgeProtocolHandler` (used only for hypothetical server-originated outputs) generates a **16-byte** IV. This is a residual artefact of an early specification draft and is **not** part of EBP/1 nor part of the canonical `ecies-lib` v4.0 wire format. All inbound ciphertexts that the bridge MUST decrypt use **12-byte** IVs. Replicators MUST always use 12-byte IVs; a future revision of the reference server will remove the 16-byte helper.

- Tag length: **16 bytes** (full GCM tag), matching `ECIES.AUTH_TAG_SIZE = 16`.
- AAD: see §5.5.

### 5.3 Key derivation (HKDF)

Both sides derive the AES-256 key from the ECDH shared secret with HKDF-SHA-256 (RFC 5869):

- `IKM` = the 32-byte x-coordinate of the ECDH point (see §5.4 for how it is extracted).
- `salt` = empty (zero-length).
- `info` = the UTF-8 bytes of the literal string `"ecies-v2-key-derivation"` (23 bytes).
- `L` = 32 (output bytes).

The resulting 32-byte key is the AES-256-GCM key for the message. There is no separate MAC key; integrity is provided by GCM's tag.

### 5.4 ECDH shared-secret extraction

The reference server uses `P256K.KeyAgreement.PrivateKey.sharedSecretFromKeyAgreement(with:)`, whose Swift wrapper around libsecp256k1 returns a **33-byte serialized compressed point** (the shared point `S = priv * peerPub`, encoded as `0x02|0x03 || X(32)`). The server then strips the prefix byte and uses the **32-byte x-coordinate** as the HKDF `IKM`. This matches `node-ecies-lib`, which feeds `Buffer` of length 32 into HKDF.

If the underlying secp256k1 library returns a 32-byte x-coordinate directly, that bytestring is the `IKM` unchanged. Implementations MUST NOT include the curve-point prefix byte, MUST NOT use SHA-256 over the full point, and MUST NOT pad/truncate to a different length.

### 5.5 AAD construction

The Additional Authenticated Data fed to AES-256-GCM is the byte concatenation:

```
AAD = version(1) || cipherSuite(1) || type(1) || ephemeralPublicKey(33 or 65)
```

Where:

- `version` is the wire-byte `0x01`.
- `cipherSuite` is `0x01`.
- `type` is the encryption-type byte from the header (see §5.6).
- `ephemeralPublicKey` is exactly the bytes that appear on the wire — either 33 bytes compressed (with `0x02`/`0x03` prefix) or 65 bytes uncompressed (with `0x04` prefix). Implementations MUST NOT canonicalise: the AAD includes the same encoding the sender used.

If a sender includes an outer `preamble`, it is prepended to AAD as the first segment. EBP/1 uses no preamble; implementations MUST send `preamble == empty`.

### 5.6 ECIES wire format expected by `ENCLAVE_DECRYPT`

The bridge accepts `node-ecies-lib`-format envelopes. Concretely:

```
+--------+--------+------+----------------------+--------+--------+----------+--------------+
| ver(1) | cs(1)  | t(1) | ephemeralPub (33|65) | iv(12) | tag(16)| len(8)*  | ciphertext   |
+--------+--------+------+----------------------+--------+--------+----------+--------------+
* len(8) is present only when type == 0x42 (WithLength)
```

Field-by-field:

| Field | Size (bytes) | Value(s) | Notes |
|---|---|---|---|
| `version` | 1 | `0x01` | Currently the only defined value |
| `cipherSuite` | 1 | `0x01` | secp256k1 + AES-256-GCM + SHA-256 |
| `type` | 1 | `0x21` (33), `0x42` (66), `0x63` (99) | "Basic", "WithLength", "Multiple" — see below |
| `ephemeralPublicKey` | 33 or 65 | secp256k1 SEC1 | First byte determines format: `0x02`/`0x03` ⇒ 33 B compressed; `0x04` ⇒ 65 B uncompressed |
| `iv` | 12 | random | AES-GCM nonce |
| `authTag` | 16 | GCM tag | Computed over ciphertext + AAD |
| `length` | 8 | big-endian `uint64` | Present **only** if `type == 0x42`; equals the ciphertext length |
| `ciphertext` | variable | AES-256-GCM output | For `0x42`, exactly `length` bytes; for `0x21`, the rest of the buffer |

**Decryption type detection:**

- `0x21` (Basic): the ciphertext consumes everything from the end of the tag to the end of the buffer.
- `0x42` (WithLength): an 8-byte big-endian `uint64` length follows the tag; the ciphertext is exactly that many bytes.
- `0x63` (Multiple): the **client** library defines this as multi-recipient; the **server's** `ENCLAVE_DECRYPT` does **not** implement multi-recipient extraction in EBP/1. Senders MUST therefore use `0x21` or `0x42` when targeting the bridge. Multi-recipient envelopes are produced/consumed only at the `node-ecies-lib` layer and are not part of the bridge's wire surface.

**Minimum length:** With a compressed ephemeral key, a Basic envelope is at least `1+1+1+33+12+16 = 64` bytes plus ciphertext. The reference server enforces `> 64` bytes.

**Compressed vs uncompressed key on the wire:** The server's parser chooses based on the byte immediately following the type byte: `0x04` ⇒ read 65 bytes; `0x02`/`0x03` ⇒ read 33 bytes. Anything else is an `Invalid ephemeral public key format` error.

### 5.7 Decryption procedure (server)

Given the parsed envelope and the bridge's persistent secp256k1 private key `d`:

1. Reconstruct AAD = `version || cipherSuite || type || ephemeralPub`.
2. Parse `ephemeralPub` into a `P256K.KeyAgreement.PublicKey`, choosing `.compressed` or `.uncompressed` based on length/prefix.
3. Compute `S = d * ephemeralPub`. Strip the leading prefix byte to obtain the 32-byte x-coordinate.
4. `K = HKDF-SHA256(IKM=x, salt="", info="ecies-v2-key-derivation", L=32)`.
5. `plaintext = AES-256-GCM-Decrypt(K, IV=iv, AAD=AAD, Ciphertext=ciphertext, Tag=authTag)`.
6. Return `{"plaintext": base64(plaintext)}`.

### 5.8 Encryption procedure (client / sender, for completeness)

A sender producing ciphertext that the bridge can decrypt MUST:

1. Acquire the bridge's persistent secp256k1 public key via `GET_PUBLIC_KEY`.
2. Generate an ephemeral secp256k1 keypair `(e, E)`. Encode `E` as 33-byte compressed form (`node-ecies-lib` default) or 65-byte uncompressed.
3. Compute `S = e * P_bridge`, take the 32-byte x-coordinate.
4. `K = HKDF-SHA256(IKM=x, salt="", info="ecies-v2-key-derivation", L=32)`.
5. Choose 12 random bytes as `iv`.
6. Build AAD = `0x01 || 0x01 || type || E_bytes` where `type ∈ {0x21, 0x42}`.
7. `(ciphertext, tag) = AES-256-GCM-Encrypt(K, IV=iv, AAD=AAD, Plaintext=plaintext)`.
8. Concatenate `0x01 || 0x01 || type || E_bytes || iv || tag || [length(8)] || ciphertext` and send Base64-encoded as `data` in `ENCLAVE_DECRYPT`.

The `@digitaldefiance/node-ecies-lib` library does all of this internally for clients; reimplementations MUST replicate the byte layout exactly to interoperate.

---

## 6. Server-side state and persistence

This section documents every piece of on-disk state the reference server creates and the access-control flags it sets.

### 6.1 secp256k1 private key file

- **Path:** `~/.enclave/ecies-privkey.bin` (computed via `FileManager.default.homeDirectoryForCurrentUser`).
- **Layout:** raw 32 bytes, no header, no encoding.
- **Generation:** on first call to `ECIESKeyManager.getOrCreateSecp256k1PrivateKey()`, the server fills 32 bytes from `SecRandomCopyBytes(kSecRandomDefault, 32, ...)`, writes them atomically (`Data.write(to:options:.atomic)`), and then calls `chmod(path, 0o600)` to restrict the file to the owning user.
- **Lifetime:** persistent across restarts. There is **no rotation** in EBP/1; deleting the file before next startup rotates the bridge's persistent secp256k1 identity (and consequently invalidates any ECIES envelopes targeted at the old public key).
- **Threat model note:** the file is at rest in the user's home directory, protected only by POSIX permissions. Consumers that need defense in depth should layer additional encryption above the bridge; `SecureEnclaveKeyring` (§9) does exactly this.

> The reference `ECIESKeyManager.swift` also defines a constant `keyTag = "com.enclave.ecieskey"`, which is reserved for a future Keychain-backed implementation. EBP/1 does not store the private key in the Keychain.

### 6.2 Secure Enclave (P-256) signing key

- **Storage:** in the Secure Enclave coprocessor, indexed in the macOS Keychain by `kSecAttrApplicationTag = "com.enclave.secureenclavekey"`.
- **Class/type:** `kSecClassKey`, `kSecAttrKeyType = kSecAttrKeyTypeECSECPrimeRandom`, `kSecAttrKeyClass = kSecAttrKeyClassPrivate`.
- **Access control flags:** the key is created with `SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, .privateKeyUsage, nil)`. Concretely:
  - **Accessibility:** only when the device is unlocked, never synced to iCloud Keychain (`...ThisDeviceOnly`).
  - **Usage:** the key is usable as a private key (`.privateKeyUsage`); no biometric/device-passcode prompt is required.
- **Generation:** on first call to `getOrCreatePrivateKey()`, the server constructs `SecureEnclave.P256.Signing.PrivateKey(compactRepresentable: true, accessControl: ...)`. Apple's CryptoKit places the key in the SEP and returns a wrapper that can sign but never expose private bytes.
- **Reload behaviour:** the reference implementation has a known limitation: if a key already exists for the application tag, `getOrCreatePrivateKey()` throws `Unable to load Secure Enclave key with CryptoKit on this platform` because `SecureEnclave.P256.Signing.PrivateKey(secKey:)` is not exposed by the deployed SDK. In practice the server is expected to keep the same key for the application's lifetime; future revisions may use lower-level `SecKey` APIs to support reload across restarts.
- **Public-key bytes:** `getPublicKeyData()` returns `priv.publicKey.x963Representation`, i.e. 65 bytes `0x04 || X || Y`.
- **Signing:** `priv.signature(for:)` produces a `P256.Signing.ECDSASignature`; the server returns `.derRepresentation`.
- **Decrypt:** the SEP P-256 key is **signing-only**; ECIES decryption is performed with the host-resident secp256k1 key (§6.1), not the SEP key.

### 6.3 TOTP configuration file

- **Path:** `~/.enclave/totp-config.json`.
- **Format:** a JSON object mapping `keyId → {"secret": <base32>, "uri": <provisioningURI>}`.

Example contents:

```json
{
  "ecies-secp256k1": {
    "secret": "JBSWY3DPEHPK3PXP",
    "uri": "otpauth://totp/EnclaveBridge:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=EnclaveBridge&algorithm=SHA1&digits=6&period=30"
  }
}
```

- **Permissions:** the reference server writes via `Data.write(to:)` without an explicit `chmod`. It inherits the user's umask. Replicators SHOULD apply `0o600` for parity with the secp256k1 file.
- **Read on startup:** `AppState.loadKeys()` reads this file and merges TOTP fields into the in-memory `KeyInfo` records returned by `LIST_KEYS`.
- **Write on `ENABLE_TOTP`:** the server reads the existing file (if any), upserts the `keyId` entry, and writes the JSON back with `JSONSerialization.data(... .prettyPrinted)`.

### 6.4 Per-process state

| Field | Type | Scope | Notes |
|---|---|---|---|
| `BridgeProtocolHandler.startTime` | `Date` (static) | per-process | Initialised at first reference; used for `uptimeSeconds`. |
| `peerPublicKey` | `Data?` | per-connection | Set by `SET_PEER_PUBLIC_KEY`; reflected by `STATUS.peerPublicKeySet`. |
| `AppState.connections` | `[ClientConnection]` | per-process | Tracks `id`, fd, connected-at, last-activity, request count. |
| `AppState.keys` | `[KeyInfo]` | per-process | Refreshed from disk on `ENABLE_TOTP`. |
| `AppState.totalRequestsHandled` | `Int` | per-process | Incremented on every `updateConnectionActivity`. Not currently surfaced in `METRICS`. |

---

## 7. TOTP algorithm (RFC 6238 with EBP/1 parameters)

The bridge implements RFC 6238 / RFC 4226 with the following fixed parameters:

| Parameter | Value |
|---|---|
| Hash | HMAC-SHA1 |
| Time step | 30 seconds |
| Digits | 6 |
| Counter encoding | 8-byte big-endian Unix-time / 30 |
| Window | ±1 step (i.e. accept codes for `t-30`, `t`, `t+30`) |
| Secret length | 20 bytes (160 bits) of CSPRNG output |
| Secret encoding (provisioning, on disk) | RFC 4648 Base32, uppercase, alphabet `ABCDEFGHIJKLMNOPQRSTUVWXYZ234567`, no `=` padding |
| Provisioning URI scheme | `otpauth://totp/` |

### 7.1 Provisioning URI construction

```
otpauth://totp/<issuer>:<account>?secret=<base32>&issuer=<issuer>&algorithm=SHA1&digits=6&period=30
```

The reference implementation does **not** percent-encode `issuer` or `account`. Implementations targeting authenticator apps that require URL-encoded labels SHOULD percent-encode both fields.

### 7.2 Code computation

```
counter = floor(unix_time() / 30)
hmac    = HMAC-SHA1(key = base32_decode(secret), msg = uint64_be(counter))
offset  = hmac[19] & 0x0F
truncated = uint32_be(hmac[offset .. offset+4]) & 0x7FFFFFFF
code    = truncated % 1_000_000
```

The reference server validates by computing the code for `counter`, `counter-1`, and `counter+1`; if any matches, the supplied 6-digit code is accepted. Codes outside that ±30 s window are rejected with `TOTP code required or invalid for this key`.

### 7.3 Validation when TOTP is not enabled

`AppState.validateTOTP(forKeyId:code:)` returns `true` immediately when no TOTP secret exists for `keyId`, regardless of whether `code` is supplied. This means `EXPORT_KEY` for a key without TOTP behaves exactly like `GET_PUBLIC_KEY` / `GET_ENCLAVE_PUBLIC_KEY`.

---

## 8. Reference client (`@digitaldefiance/enclave-bridge-client`)

This section documents the TypeScript client's externally observable behaviour. Replicators MAY choose different defaults but SHOULD preserve the wire-level semantics.

### 8.1 Defaults

| Constant | Value |
|---|---|
| `DEFAULT_SOCKET_PATH` | `/tmp/enclave-bridge.sock` |
| `DEFAULT_TIMEOUT` | 30 000 ms |
| `DEFAULT_RECONNECT_DELAY` | 1 000 ms |
| `DEFAULT_MAX_RECONNECT_DELAY` | 30 000 ms |
| `DEFAULT_MAX_RECONNECT_ATTEMPTS` | 5 |
| `DEFAULT_HEARTBEAT_INTERVAL` | 30 000 ms |
| `DEFAULT_MAX_CONCURRENT_REQUESTS` | 10 (typings); 1 (steady-state — see note below) |

> **Concurrency note.** The wire protocol supports only in-order, request-response messaging on a single connection (§3.4). The client's `maxConcurrentRequests` is enforced in code but, until the server gains correlation IDs, callers SHOULD set it to `1` per connection or use the connection pool (§8.6). The reference client's queue still honours arrival order even at higher concurrency, but pipelining beyond 1 reduces robustness against partial parses.

### 8.2 `EnclaveBridgeClient` class — public API

| Member | Description |
|---|---|
| `new EnclaveBridgeClient(opts?)` | Construct without connecting. |
| `static isSupported(socketPath?)` | Returns `{supported, platform, socketExists, socketPath, reason?}`. Verifies macOS and `fs.access`. |
| `connect()` | Opens the socket; emits `connect`/`stateChange`. Rejects with `TimeoutError`/`ConnectionError`. |
| `disconnect()` | Manual close; suppresses auto-reconnect; clears caches. |
| `isConnected` / `connectionState` | Boolean / `'disconnected'\|'connecting'\|'connected'\|'reconnecting'\|'error'`. |
| `getPublicKey(skipCache?)` | `GET_PUBLIC_KEY`. Returns `PublicKeyInfo` with `.base64`, `.buffer`, `.hex`, `.compressed`. Caches by default. |
| `getEnclavePublicKey(skipCache?)` | `GET_ENCLAVE_PUBLIC_KEY`. Same shape; cached separately. |
| `setPeerPublicKey(key)` | `SET_PEER_PUBLIC_KEY`. Accepts hex, Base64, or Buffer; auto-detects by length. |
| `enclaveSign(data)` | `ENCLAVE_SIGN`. Returns `{base64, buffer, hex, format: 'der'}`. |
| `decrypt(buffer)` / `enclaveDecrypt(buffer)` | `ENCLAVE_DECRYPT`. Returns `{base64, buffer, text}`. |
| `encrypt(data, recipientPubKey?)` | **Local** ECIES via `node-ecies-lib`; does not touch the bridge. |
| `verifySignature(data, sig, pubKey?)` | Local P-256 verify (see §4.9 caveat). |
| `enclaveGenerateKey()` | Wraps `ENCLAVE_GENERATE_KEY` (returns server error in EBP/1). |
| `heartbeat()` | `HEARTBEAT` → `HeartbeatResponse`. |
| `getVersion()` / `getStatus()` / `getMetrics()` | `VERSION`, `STATUS`, `METRICS`. |
| `listKeys()` | `LIST_KEYS` → `{keys: KeyInfo[]}`. |
| `rotateKey()` | `ENCLAVE_ROTATE_KEY` (server returns error). |
| `enableTOTP(keyId, account, issuer)` | `ENABLE_TOTP` → provisioning URI string. |
| `exportKey(keyId, totpCode?)` | `EXPORT_KEY` → `PublicKeyInfo`. |
| `ping()` | True iff `getPublicKey()` succeeds. |
| `getHealthStatus()` / `getConnectionInfo()` | Diagnostics. |

### 8.3 Public-key info object

Every public-key method returns:

```ts
interface PublicKeyInfo {
  base64: string;   // wire form
  buffer: Buffer;   // raw bytes
  hex: string;      // hex of buffer
  compressed: boolean; // true iff buffer.length === 33
}
```

For EBP/1, **bridge endpoints always return `compressed === false`** (uncompressed 65-byte keys).

### 8.4 Error class hierarchy

```
EnclaveBridgeError (base, has .code, .details)
├── ConnectionError      code=CONNECTION_ERROR
├── TimeoutError         code=TIMEOUT, has .operation, .timeoutMs
├── DecryptionError      code=DECRYPTION_ERROR
├── EncryptionError      code=ENCRYPTION_ERROR
├── SignatureError       code=SIGNATURE_ERROR
├── InvalidOperationError code=INVALID_OPERATION
├── ProtocolError        code=PROTOCOL_ERROR
└── PlatformError        code=PLATFORM_ERROR
```

`ProtocolError` wraps both invalid JSON and `{"error":...}` server replies. `TimeoutError` carries the original operation name (e.g. `'connect'`, `'GET_PUBLIC_KEY'`).

### 8.5 Events

The client extends `EventEmitter` and emits `stateChange`, `connect`, `disconnect`, `reconnecting`, `reconnected`, `reconnectFailed`, `error`, `debug`, `beforeDisconnect`, `requestSent`, `responseReceived`. `reconnecting` carries `(attempt, maxAttempts)`. `reconnectFailed` carries an `Error`.

### 8.6 Connection pool

`ConnectionPool` (`pool.ts`) maintains a fixed-size set of independent `EnclaveBridgeClient` instances (default `poolSize = 3`, `acquireTimeout = 5000` ms) and serialises `acquire`/`release` semantics. Use it when an application needs more than one in-flight request at a time.

### 8.7 Streaming helpers

`streaming.ts` exposes `encryptStream`, `decryptStream`, `encryptFile`, `decryptToFile`. These are **chunked** wrappers: they split a buffer into `chunkSize`-byte windows (default 65 536) and call the underlying `client.encrypt` / `client.decrypt` for each chunk. Each chunk produces an independent ECIES envelope; there is **no streaming AEAD construction**. Recipients reassemble by concatenating decrypted chunks in order.

---

## 9. The `SecureEnclaveKeyring` consumer

`brightchain-api-lib/src/lib/secureEnclaveKeyring.ts` is the highest-level consumer of EBP/1 in the BrightChain stack. It exposes the `IKeyring` contract used by `keyringFactory.detectBestKeyring()` (Tier 1 of three: Secure Enclave > OS Keyring > none).

### 9.1 `IKeyring` interface

```ts
export interface IKeyring {
  storeKey(id: string, data: Uint8Array, password: string): Promise<void>;
  retrieveKey(id: string, password: string): Promise<Uint8Array>;
  initialize(): Promise<void>;
  rotateKey(id: string, oldPassword: string, newPassword: string): Promise<void>;
}
```

`SecureEnclaveKeyring` additionally provides `deleteKey`, `hasKey`, `listKeys`, `signWithEnclave`, and `getEnclavePublicKey`.

### 9.2 Activation guard

`SecureEnclaveKeyring.isAvailable(debug=false)` is the gate the factory consults. It does **not** simply check for the socket file; it performs a full live handshake:

1. Verify `process.platform === 'darwin'` and `process.arch === 'arm64'`. Otherwise return `false` (or throw if `process.env.REQUIRE_SECURE_ENCLAVE === 'true'`).
2. Run §2.2 socket discovery. Fail if no path is reachable.
3. Dynamically `import('@digitaldefiance/enclave-bridge-client')` (it is an ESM module; the keyring is CJS-friendly via `await import`). Construct a client with `timeout: 5000`.
4. `client.connect()`. Verify `client.isConnected`.
5. `client.ping()` — actually `client.getPublicKey()` under the hood.
6. `client.getPublicKey()`. Verify the returned buffer is non-empty. If `length === 33`, verify the prefix is `0x02` or `0x03` (compressed). The keyring deliberately does **not** restrict to uncompressed even though EBP/1 always returns 65 bytes — this leaves room for future bridges.
7. `client.getEnclavePublicKey()`. Verify non-empty.
8. `client.enclaveSign(Buffer.from('enclave-availability-test'))`. Verify the returned signature is non-empty.
9. `client.disconnect()`.

If any step fails:

- If `REQUIRE_SECURE_ENCLAVE === 'true'`, the helper **throws** an `Error` describing the failure.
- Otherwise it returns `false`.

This live-handshake gate exists because a stale socket file on disk does not imply a working bridge.

### 9.3 Storage layout

- **Directory:** `${HOME}/.brightchain-enclave-keys/` (Unix) or `${USERPROFILE}/.brightchain-enclave-keys/` (Windows fallback path; not actually reachable on Apple Silicon but kept for code symmetry). Created with `mkdir -p, mode=0o700`.
- **Per-key file:** `<sanitisedId>.enclave`. The sanitiser replaces every character outside `[A-Za-z0-9_-]` with `_`, preventing path traversal.
- **File mode:** `0o600`.

### 9.4 Double-encryption envelope

For each key the keyring stores **a single binary blob** representing two layers of encryption:

#### 9.4.1 Inner layer — password-AES-GCM

```
salt(32) || iv(12) || authTag(16) || ciphertext(N)
```

- `salt` — 32 random bytes from `crypto.randomBytes`.
- `iv` — 12 random bytes.
- `authTag` — 16-byte AES-GCM tag.
- `ciphertext` — output of AES-256-GCM.

The symmetric key `K_pwd` is derived from the user-supplied password and the salt:

```
K_pwd = scrypt(password, salt, length=32, N=2^14, r=8, p=1)
```

(`crypto.scrypt` in Node, callback form; the keyring awaits the result via a `Promise`.)

#### 9.4.2 Outer layer — ECIES to the bridge

The 60-byte-prefix-plus-ciphertext blob from §9.4.1 is treated as plaintext and encrypted with ECIES (Basic mode, `0x21`) to the bridge's persistent secp256k1 public key, using `@digitaldefiance/node-ecies-lib`'s `ECIESService.encryptBasic`. The result is the bytes written to disk.

#### 9.4.3 On-disk file = outer ECIES envelope

The wire layout from §5.6 (Basic mode), but the "ciphertext" carries the inner password-AES-GCM blob.

### 9.5 Operations

#### `initialize()`

- Runs the §9.2 availability check **only** when `REQUIRE_SECURE_ENCLAVE === 'true'`.
- Creates the storage directory.
- Connects to the bridge once via the discovered socket and caches `clientPublicKey` (the bridge's secp256k1 public key) in memory.
- Disconnects.

#### `storeKey(id, data, password)`

1. Generate `salt`, `iv`.
2. Derive `K_pwd` via scrypt.
3. AES-256-GCM-encrypt `data` with `K_pwd`, `iv` ⇒ `(passwordEncrypted, authTag)`.
4. Build the inner blob `salt || iv || authTag || passwordEncrypted`.
5. ECIES-encrypt the inner blob to `clientPublicKey` ⇒ outer envelope.
6. Write the outer envelope to `<keyDir>/<safeId>.enclave` with `mode 0o600`.
7. Zero the in-memory copies of `K_pwd`, the inner ciphertext, and the inner blob.

#### `retrieveKey(id, password)`

1. Read `<keyDir>/<safeId>.enclave`.
2. Connect to the bridge; call `client.decrypt(envelope)` (i.e. `ENCLAVE_DECRYPT`) to peel off the outer ECIES layer. Disconnect.
3. Slice the inner blob: `salt = [0..32)`, `iv = [32..44)`, `authTag = [44..60)`, `passwordEncrypted = [60..)`.
4. Derive `K_pwd` via scrypt.
5. AES-256-GCM-decrypt with `K_pwd`, `iv`, `authTag`. Failures bubble up as `Error('Decryption failed: invalid password or corrupted data')`.
6. Zero `K_pwd` and the inner blob; return the recovered `Uint8Array`.

#### `rotateKey(id, oldPassword, newPassword)`

`retrieveKey` followed by `storeKey`. Plaintext is held only inside the call.

#### `deleteKey(id)`

1. Read the file size.
2. Overwrite the file with random bytes of equal size (best-effort secure erase on filesystems without copy-on-write).
3. `unlink`.
4. Silently ignore `ENOENT`.

#### `hasKey(id)` / `listKeys()`

`hasKey` is `fs.access(F_OK)`. `listKeys` is `fs.readdir` filtered to `.enclave` suffix, with the suffix stripped.

#### `signWithEnclave(data)` and `getEnclavePublicKey()`

Pass-through to the bridge's `ENCLAVE_SIGN` and `GET_ENCLAVE_PUBLIC_KEY`. Each call opens a fresh connection, performs the operation, and disconnects. Use sparingly; for chatty workloads, prefer holding a single client connection at the application layer.

### 9.6 Properties

Given the bridge cannot decrypt without the SEP-resident keypair-wrapper (the bridge's secp256k1 private key file's bytes are accessed only from the bridge process under POSIX `0o600`), and given the password is required to open the inner AES-GCM layer:

- An attacker with **read access to the keyring directory only** sees outer ECIES envelopes; without the bridge's secp256k1 private key bytes (hostile read of `~/.enclave/ecies-privkey.bin`) they cannot recover even the inner blob.
- An attacker with **read access to both** the keyring directory and `~/.enclave/ecies-privkey.bin` recovers the inner password-AES-GCM blob but still needs the password (gated by scrypt) to recover plaintext.
- The bridge's running state adds a behavioural barrier: the keyring must successfully `connect()` and complete `decrypt`. A user can revoke decrypt access by quitting the menu-bar app; persisted ciphertexts remain readable only after the bridge resumes.
- Forward secrecy is **not** provided: rotating the bridge's secp256k1 key (by deleting `ecies-privkey.bin` before next start) makes all stored envelopes undecryptable, so administrators MUST re-run `rotateKey` for every stored item before rotating the bridge identity.

---

## 10. End-to-end examples

### 10.1 Hand-crafted JSON over `nc -U`

```bsh
$ printf '%s' '{"cmd":"HEARTBEAT"}' | nc -U /tmp/enclave-bridge.sock
{"ok":true,"timestamp":"2026-05-20T17:02:11Z","service":"enclave-bridge"}
```

```bsh
$ printf '%s' '{"cmd":"GET_PUBLIC_KEY"}' | nc -U /tmp/enclave-bridge.sock
{"publicKey":"BCsf...=="}
```

### 10.2 Encrypt in Node, decrypt via the bridge

```ts
import { EnclaveBridgeClient } from '@digitaldefiance/enclave-bridge-client';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';

const client = new EnclaveBridgeClient();
await client.connect();

const { buffer: bridgePub } = await client.getPublicKey();   // 65-byte uncompressed
const ecies = new ECIESService();
const envelope = ecies.encryptBasic(bridgePub, Buffer.from('hello, enclave'));

const { text } = await client.decrypt(envelope);
console.log(text); // "hello, enclave"

await client.disconnect();
```

### 10.3 Sign and verify

```ts
const client = new EnclaveBridgeClient();
await client.connect();

const message = Buffer.from('audit-log-entry-#42');
const { buffer: sigDer } = await client.enclaveSign(message);
const { buffer: enclavePub } = await client.getEnclavePublicKey();

// Local verify (uses the §4.9 caveat: hash-then-verify(SHA256))
const valid = await client.verifySignature(message, sigDer, enclavePub);
console.log(valid); // true

await client.disconnect();
```

### 10.4 Enable TOTP and gated export

```ts
const uri = await client.enableTOTP('ecies-secp256k1', 'alice@example.com', 'EnclaveBridge');
console.log(uri); // QR-code this in Authy/Google Authenticator

// Later, with a fresh authenticator code:
const { buffer } = await client.exportKey('ecies-secp256k1', '493017');
```

### 10.5 Storing a master secret with `SecureEnclaveKeyring`

```ts
import { SecureEnclaveKeyring } from '@brightchain/api-lib';

const kr = SecureEnclaveKeyring.getInstance();
await kr.initialize();

await kr.storeKey('system-user-mnemonic',
                  Buffer.from('seed words go here'),
                  'long-passphrase');

const recovered = await kr.retrieveKey('system-user-mnemonic', 'long-passphrase');
```

---

## 11. Test vectors

These vectors are illustrative of the byte layout and should be regenerated by implementations as part of CI.

### 11.1 ECIES Basic envelope to the bridge

- Bridge public key (65 B uncompressed):
  `04 79 BE 66 7E F9 DC BB AC 55 A0 62 95 CE 87 0B 07 02 9B FC DB 2D CE 28 D9 59 F2 81 5B 16 F8 17 98 48 3A DA 77 26 A3 C4 65 5D A4 FB FC 0E 11 08 A8 FD 17 B4 48 A6 85 54 19 9C 47 D0 8F FB 10 D4 B8`
- Plaintext: `48 65 6C 6C 6F` (`"Hello"`)
- Ephemeral secp256k1 keypair (compressed): random per envelope.
- Suite bytes: `01 01 21` (Basic).
- IV: 12 random bytes.
- AAD = `01 01 21 || ephemeralPubCompressed(33B)`.
- Ciphertext + tag computed by AES-256-GCM with HKDF-SHA256-derived key (info `"ecies-v2-key-derivation"`).
- On-the-wire envelope: `01 01 21 || ephemeralPubCompressed(33B) || iv(12) || tag(16) || ciphertext(5)` ⇒ 67 bytes total.

A WithLength variant differs only in the type byte (`42` instead of `21`) and the inserted `00 00 00 00 00 00 00 05` length field before the 5-byte ciphertext.

### 11.2 Public-key fingerprint

Given a SEC1-uncompressed key beginning `04 79 BE 66 7E F9 DC BB AC 55 ...`, SHA-256 the **full 65 bytes**, take the first 8 bytes of the digest, format as uppercase hex separated by `:`:

```
fingerprint = SHA256(pub)[0..8]
            = E2 79 B1 47 22 96 87 D6   (example only)
LIST_KEYS publicKeyFingerprint = "E2:79:B1:47:22:96:87:D6"
```

### 11.3 TOTP

- Secret: `JBSWY3DPEHPK3PXP` (Base32 of `Hello!\xDE\xAD\xBE\xEF`, illustrative).
- Time: `1750000000` (Unix seconds).
- Counter: `1750000000 / 30 = 58333333`.
- HMAC-SHA1 over big-endian `00 00 00 00 03 7A 6A 95` ⇒ 20-byte digest; offset `digest[19] & 0x0F`; truncated `uint32_be(digest[offset..offset+4]) & 0x7FFFFFFF`; code = truncated `mod 1_000_000`.

Implementations MUST generate codes that the reference server accepts within ±30 s of its own clock.

---

## 12. Security considerations

### 12.1 Trust boundaries

- The Unix socket is only accessible to processes running as the same macOS user; macOS enforces this through filesystem permissions on the socket file and the containing directory.
- The reference server sets no per-message authentication. Any local process that can `connect(2)` to the socket can issue any command. Sensitive operations should be guarded with TOTP (§7) or by quitting the menu-bar app when not in use.
- The Secure Enclave private key is non-extractable: even root cannot read its bytes. A compromised app running as the user can, however, ask the bridge to **sign or decrypt** arbitrary inputs while the bridge is running. TOTP gating on `EXPORT_KEY` is the only command-level barrier in EBP/1.

### 12.2 Replay and freshness

- The protocol has no nonces or sequence numbers at the JSON layer. Replays of `ENCLAVE_DECRYPT` simply re-decrypt the same envelope; AES-GCM ensures integrity but provides no replay defence.
- TOTP codes are single-use within the ±30 s window in spirit; the reference server does **not** maintain a "burned codes" set. A code remains valid for the full window. Implementations needing strict single-use semantics MUST add a server-side cache of recently-accepted (keyId, code) pairs.

### 12.3 Side channels and persistence

- The host secp256k1 private key on disk (§6.1) inherits filesystem semantics: copy-on-write snapshots, Time Machine backups, and SSD wear-levelling may all retain stale copies. Treat the bridge identity as device-bound but not durably destroyable without disk-level secure-erase.
- The TOTP config file (§6.3) carries the shared secret in cleartext. An attacker who reads it can produce valid codes. Permissions SHOULD be `0o600`; the keyring file in `SecureEnclaveKeyring` is created with `0o700` directory and `0o600` files, which is the recommended baseline.
- Memory zeroisation in the keyring uses `Buffer.fill(0)`. JIT-cached strings, V8 internal buffers, and OS swap may still retain copies; this is best-effort.

### 12.4 Misuse

- Sending a 16-byte IV to `ENCLAVE_DECRYPT` will fail integrity verification because AES-GCM expects a 12-byte nonce. The bridge will return `Decryption failed`.
- Sending a `Multiple` (`0x63`) envelope to `ENCLAVE_DECRYPT` is unsupported in EBP/1 and will fall into the `else` branch (treated as Basic), almost certainly failing the GCM check.
- The `SET_PEER_PUBLIC_KEY` cache is per-connection; reusing a single connection for multi-tenant use is explicitly discouraged.

### 12.5 Threat model summary

| Adversary capability | Outcome |
|---|---|
| Network-only | Out of scope (no network surface). |
| Unprivileged local process, different user | Cannot connect; macOS filesystem permissions block. |
| Local process, same user, bridge running, no TOTP | Can sign and decrypt arbitrarily via the bridge. |
| Local process, same user, bridge running, TOTP on key | Can call `EXPORT_KEY` only with a valid 6-digit code; `ENCLAVE_SIGN`/`ENCLAVE_DECRYPT` are not gated by TOTP in EBP/1. |
| Local user, bridge stopped | Cannot use the SEP key at all. Stored `SecureEnclaveKeyring` data is at rest behind two encryption layers. |
| Disk-image exfiltration | Reveals secp256k1 private key file, TOTP secrets, keyring envelopes. SEP key remains inaccessible (device-bound). |

---

## 13. Compatibility and versioning

- The protocol identifier for this document is **EBP/1**.
- All commands MUST be backwards-compatible within EBP/1: future revisions MAY add fields to responses but MUST NOT change existing field semantics. Clients MUST ignore unknown fields.
- New commands SHOULD follow the existing UPPER_SNAKE_CASE naming convention.
- A future EBP/2 SHOULD adopt a length-prefixed framing scheme (§3.2's brace-terminator framer is a known limitation) and MAY introduce request IDs for true pipelining.

---

## 14. Implementer's checklist

A new client implementation MUST:

1. Discover the socket via the §2.2 path order.
2. Send each request as a single UTF-8 JSON object with no newline.
3. Parse responses with a brace-counting parser that respects strings and escapes.
4. Encode/decode all binary fields as standard Base64.
5. Treat any `{"error": "..."}` response as a recoverable protocol error, not a transport failure.
6. For ECIES, use **secp256k1 + AES-256-GCM(IV=12, Tag=16) + HKDF-SHA256(info="ecies-v2-key-derivation")** with the AAD construction in §5.5 and the wire layout in §5.6.
7. Hash with SHA-256 before P-256 verification, as documented in §4.9.

A new server implementation MUST additionally:

1. Persist the secp256k1 private key at `~/.enclave/ecies-privkey.bin` with `0o600`, generated from `SecRandomCopyBytes` or a CSPRNG of equivalent strength.
2. Provision the SEP key with the access-control flags in §6.2.
3. Track `peerPublicKey` per connection.
4. Implement the TOTP algorithm with the parameters in §7 and the on-disk format in §6.3.
5. Reject `Multiple`-mode (`0x63`) envelopes for `ENCLAVE_DECRYPT` and return a clean error for `ENCLAVE_GENERATE_KEY` / `ENCLAVE_ROTATE_KEY` until those are specified by a future revision.

---

## 15. References

1. RFC 5869 — *HMAC-based Extract-and-Expand Key Derivation Function (HKDF)*.
2. RFC 6238 — *TOTP: Time-Based One-Time Password Algorithm*.
3. RFC 4226 — *HOTP: An HMAC-Based One-Time Password Algorithm*.
4. RFC 4648 — *The Base16, Base32, and Base64 Data Encodings*.
5. NIST SP 800-38D — *Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode*.
6. SEC 1 — *Elliptic Curve Cryptography*, Standards for Efficient Cryptography Group.
7. Apple, *CryptoKit* documentation — `SecureEnclave.P256.Signing.PrivateKey`, `AES.GCM`, `HKDF`.
8. GigaBitcoin, *secp256k1.swift* — Swift wrapper around libsecp256k1, used by the reference server.
9. Companion paper: [ECIES-Lib](ecies-lib) — full specification of the v4.0 ECIES wire format used by `node-ecies-lib`.
10. Companion paper: [BrightChain](brightchain) — the consuming platform.

---

## Appendix A — Reference file map

| File | Role |
|---|---|
| `enclave/EnclaveBridge/SocketServer.swift` | `AF_UNIX` socket lifecycle, accept loop, framing on `}`. |
| `enclave/EnclaveBridge/BridgeProtocolHandler.swift` | Command dispatch and ECIES decrypt parser. |
| `enclave/EnclaveBridge/ECIES.swift` | secp256k1 ECDH, HKDF, AES-256-GCM. |
| `enclave/EnclaveBridge/ECIESKeyManager.swift` | secp256k1 private key persistence. |
| `enclave/EnclaveBridge/SecureEnclaveKeyManager.swift` | SEP P-256 key generation and signing. |
| `enclave/EnclaveBridge/TOTPManager.swift` | Base32, HOTP/TOTP, provisioning URI. |
| `enclave/EnclaveBridge/AppState.swift` | Connection and key inventory state. |
| `enclave-bridge-client/src/index.ts` | Client class, framing, queue, reconnect. |
| `enclave-bridge-client/src/types.ts` | Request/response types. |
| `enclave-bridge-client/src/ecies.ts` | Wire-format helpers (parse/serialise). |
| `enclave-bridge-client/src/crypto.ts` | Local ECIES encrypt + P-256 verify. |
| `enclave-bridge-client/src/errors.ts` | Custom error classes. |
| `enclave-bridge-client/src/pool.ts` | Connection pool. |
| `enclave-bridge-client/src/streaming.ts` | Chunked encrypt/decrypt helpers. |
| `brightchain-api-lib/src/lib/secureEnclaveKeyring.ts` | `IKeyring` consumer with double encryption. |
| `brightchain-api-lib/src/lib/keyringFactory.ts` | Tiered keyring auto-selection. |
| `brightchain-api-lib/src/lib/keyring.types.ts` | `IKeyring` interface. |

## Appendix B — Worked decryption walkthrough (server pseudocode)

```text
input: encryptedData (Base64-decoded), bridge secp256k1 private key d
require: encryptedData.length > 64

version      = encryptedData[0]                    # 0x01
cipherSuite  = encryptedData[1]                    # 0x01
type         = encryptedData[2]                    # 0x21 or 0x42
prefixByte   = encryptedData[3]
if prefixByte == 0x04:    ephLen = 65
elif prefixByte in (0x02,0x03): ephLen = 33
else: error "Invalid ephemeral public key format"

ephPub = encryptedData[3 : 3 + ephLen]
o      = 3 + ephLen
iv     = encryptedData[o : o+12];  o += 12
tag    = encryptedData[o : o+16];  o += 16

if type == 0x42:
    length     = uint64_be(encryptedData[o : o+8]); o += 8
    ciphertext = encryptedData[o : o+length]
else:
    ciphertext = encryptedData[o : ]

aad = bytes([version, cipherSuite, type]) + ephPub
S   = ECDH(d, ephPub)              # 33-byte compressed point
x   = S[1:33]                      # strip prefix → 32-byte x-coord
K   = HKDF_SHA256(IKM=x, salt=b"", info=b"ecies-v2-key-derivation", L=32)
plaintext = AES_256_GCM_decrypt(key=K, nonce=iv, aad=aad,
                                ciphertext=ciphertext, tag=tag)
return {"plaintext": base64(plaintext)}
```

## Appendix C — Worked decryption walkthrough (client pseudocode for `SecureEnclaveKeyring.retrieveKey`)

```text
envelope     = read_file("<keyDir>/<safeId>.enclave")
inner        = bridge.ENCLAVE_DECRYPT(envelope)         # outer ECIES peeled
salt         = inner[0:32]
iv           = inner[32:44]
authTag      = inner[44:60]
pwdEncrypted = inner[60:]
K_pwd        = scrypt(password, salt, 32, N=2^14, r=8, p=1)
plaintext    = AES_256_GCM_decrypt(K_pwd, iv, authTag, pwdEncrypted)
zero(K_pwd); zero(inner)
return plaintext
```

---

*This specification is informational. The reference implementations live in the `enclave/`, `enclave-bridge-client/`, and `brightchain-api-lib/` trees. Discrepancies between this document and the source are bugs in this document; please file an issue.*
