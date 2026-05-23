---
title: "BrightLink Protocol v1: Hardware-Anchored Credential Delivery for Developer Workflows"
parent: "Papers"
nav_order: 19
---

# BrightLink Protocol v1 — A Specification for Hardware-Anchored Ephemeral-Credential Delivery

**Authors:** Jessica Mulein
**Status:** Proposal / Draft Standard, replication-grade
**Version:** 1.1 (BrightLink v1 — geo, push, and cross-platform attestation)
**Date:** May 2026
**Built on:** [Enclave Bridge Protocol (EBP/1)](enclave-bridge-protocol). Coordinates expressed in [BrightSpace](bright-space-standard) and [BrightDate](brightdate-specification) units.

> **One-line pitch.** BrightLink delivers short-lived developer credentials from arbitrary CLI tools to a single hardware-anchored desktop agent (BrightNexus) over a Unix socket, and gives those tools scope-gated access to the host's spatial context. Key custody runs through whatever hardware-rooted signing facility the host provides — Apple's Secure Enclave on macOS, TPM2 (or PKCS#11, or a software fallback) on Linux. Sessions are authenticated by a bridge-signed transcript; credentials live with their declared TTL on a clean menu-bar UI; coordinates are exposed in both WGS84 and BrightSpace ECEF, gated by a five-rung scope ladder and a per-caller allowlist; nothing touches the clipboard, scrollback, history, or `~/.aws/credentials`.

> **Scope.** BrightLink covers (a) the EBP/1-extension command surface (`LINK_REGISTER`, `LINK_DELIVER`), (b) the bilateral session-key derivation, (c) the canonical bridge-signed transcript layout, (d) the AES-256-GCM length-prefixed AAD construction for delivered credentials, (e) the standardised payload schemas (`ephemeral-auth`, `db-connection`, `plaintext`, `api-token`, `cloud-session`, `ssh-credential`, `kubeconfig-context`, `totp-seed`, `mtls-cert`), (f) the geo command surface (`LINK_GEO_STATUS`, `LINK_GEO_PROXIMITY`, `LINK_GEO_ZONE`, `LINK_GEO_GET`, `LINK_GEO_REFRESH`) with WGS84 + BrightSpace dual-coordinate output, the zone shape algebra, and the scope ladder, (g) the agent-to-shell push channel `LINK_PUSH`, (h) the cross-platform `BridgeIdentity` and `PeerAttestation` interfaces, and (i) the policy controls a deployer is expected to expose (peer-attestation enforcement, credential TTL ceiling, geo ACL, prompt routing).

> **Out of scope (this revision).** `LINK_AUDIT_EMIT` (bulk audit export). The geo-audit log itself is specified (§9.7) and locally accessible; bulk export over the wire is reserved. Implementations MUST acknowledge `LINK_AUDIT_EMIT` with the suffix `"not implemented in this build"`.

---

## 1. Abstract

Modern terminal workflows generate ephemeral credentials constantly: AWS STS sessions, OAuth tokens, scratch database passwords, kubeconfig contexts. The default delivery surface is `export FOO=...` followed by a credential half-life that's whatever the developer's tmux history retention is set to. Password managers raise the floor — they ask the user for explicit consent on every read — but at the cost of an agent that owns much more than ephemeral credentials and a UI flow that's wrong for things that live for ten minutes.

BrightLink is a Unix-socket protocol between CLI tools (the **shell**) and a single resident desktop agent (the **bridge**). Each shell registers once, anchoring its session in a hardware-signed transcript that the shell verifies before trusting the bridge's identity. After registration, the shell delivers credential payloads as authenticated AES-256-GCM ciphertexts over the same socket. The bridge surfaces those credentials in a menu-bar UI scoped to their declared TTL: when the credential expires, it disappears.

BrightLink also exposes the host's spatial context through a parallel scope-gated surface — `LINK_GEO_*` and `LINK_PUSH`. Tools can ask "what zone am I in?" or subscribe to "you just entered zone X" events. Coordinates are exposed in both WGS84 (lat/lon/altitude) and BrightSpace ECEF (`x_bm, y_bm, z_bm` per the [BrightSpace standard](bright-space-standard)) — both first-class, both gated by the same scope ladder. The bridge gates each query by a per-caller policy keyed off attested code identity, with a modal user prompt for unrecognised callers.

The protocol is greenfield. There is no clipboard hop, no terminal-emulator participation, no daemon plurality, and no string-rich text format that needs to be parsed out of a stream. Everything the bridge sees is a JSON object on a Unix socket, AEAD-tagged under a session key derived from a hardware-rooted handshake.

**Keywords:** Apple Secure Enclave, TPM2, ECIES, secp256k1, P-256, AES-256-GCM, HKDF, BrightDate, BrightSpace, ITRF2020, ephemeral credentials, terminal protocol, hardware-anchored trust, peer attestation.

---

## 2. The Problem

### 2.1 Ephemeral credentials want a different home than passwords

Long-lived secrets (your GitHub PAT, your production DB password) belong in a password manager: an agent that asks for consent on every read, that the user trusts to outlive any one terminal session, and that's worth the friction of typing a master password. Ephemeral credentials are the opposite: they live for ten minutes, they need to be visible to the next `aws s3 ls`, and asking for consent on every read produces a workflow nobody will use.

The de-facto delivery vector — `export AWS_SESSION_TOKEN=...` — is fast and frictionless and also writes the secret into the environment of every child process forever. tmux scrollback, shell history, debug-mode logs, anything that snapshots `/proc/self/environ`. The credential lives wherever those things live, which is much longer than ten minutes.

### 2.2 One agent, one capability surface

BrightLink collapses credential delivery and geo mediation into one process: **BrightNexus**, a resident agent (a SwiftUI menu-bar app on macOS Apple Silicon, a system-tray app on Linux) with key custody anchored to whatever hardware-rooted signing facility the host provides — the Secure Enclave on macOS, TPM2 or PKCS#11 on Linux, with a software-key fallback when neither is available. The user runs one app, grants it one capability surface, and gets back one menu of currently-live credentials and one queue of pending geo-grant prompts.

### 2.3 Spatial awareness without surveillance

CLI tools have a recurring need for coarse spatial context: a deploy script wants to refuse to push to production from outside the office network; an SRE on-call tool wants to flip from "EU bias" to "US bias" when the on-call engineer flies; a build system wants to tag artefacts with the BrightSpace coordinate they were built at. The legacy answer is "the tool reads `/etc/timezone` and gets confused", or "the tool calls a geo-IP service over the network and tells a third party where you are".

BrightLink's geo surface gives tools a hardware-anchored alternative — the host's actual location data, mediated by the bridge — without giving every tool unrestricted access. Coarse questions ("am I in the prod-office zone?") get coarse answers without revealing coordinates. Precise questions ("what's my BrightSpace position?") require an explicit user grant, with a modal prompt that names the binary and its signature provenance. Tools that don't need precision shouldn't get it; tools that need it ask for it explicitly and the user decides.

---

## 3. Architecture Overview

```
┌──────────────────────┐                     ┌──────────────────────────────────────┐
│ Terminal             │                     │ BrightNexus (the bridge)             │
│  ┌────────────────┐  │                     │  (SwiftUI menu-bar on macOS;         │
│  │ bsh shell +    │  │                     │   GTK / Qt system tray on Linux)     │
│  │ bsh-inject     │  │                     │                                      │
│  │ bsh-geo        │  │                     │  ┌────────────────────────────────┐  │
│  │ + arbitrary    │  │                     │  │ EBP/1 surface (HEARTBEAT,      │  │
│  │ CLI tools      │  │                     │  │  GET_PUBLIC_KEY,               │  │
│  └────────────────┘  │                     │  │  ENCLAVE_SIGN/_DECRYPT, …)     │  │
└──────────────────────┘                     │  ├────────────────────────────────┤  │
            ▲                                │  │ BrightLink (§4):               │  │
            │ Unix socket                    │  │  LINK_REGISTER (§4.5)          │  │
            │ EBP/1 + BrightLink             │  │  LINK_DELIVER  (§4.6)          │  │
            │                                │  │  LINK_PUSH     (§10)           │  │
            ▼                                │  │  LINK_GEO_*    (§9)            │  │
┌──────────────────────────────┐             │  │  LINK_AUDIT_EMIT (reserved)    │  │
│ enclave-bridge-client        │             │  └────────────────────────────────┘  │
│   (TypeScript / Node)        │             │  ┌────────────────────────────────┐  │
└──────────────────────────────┘             │  │ EphemeralStore + menu-bar UI   │  │
                                             │  │ + Geo Engine + Zone Engine     │  │
                                             │  │ + ACL/Prompt Coordinator       │  │
                                             │  └────────────────────────────────┘  │
                                             │  ┌────────────────────────────────┐  │
                                             │  │ Pluggable infrastructure:      │  │
                                             │  │  ├─ BridgeIdentity (§6.1)      │  │
                                             │  │  │   • macOS: SEP P-256        │  │
                                             │  │  │   • Linux: TPM2 / file      │  │
                                             │  │  ├─ PeerAttestation (§6.2)     │  │
                                             │  │  │   • macOS: codesign         │  │
                                             │  │  │   • Linux: dpkg/rpm + IMA   │  │
                                             │  │  └─ GeoSource (§6.3)           │  │
                                             │  │      • macOS: CoreLocation     │  │
                                             │  │      • Linux: GeoClue          │  │
                                             │  └────────────────────────────────┘  │
                                             └──────────────────────────────────────┘
                                                                │
                                                                ▼
                                          ┌────────────────────────────────────────┐
                                          │ Per-user state (mode 0700):            │
                                          │  ~/.brightchain/brightnexus/           │
                                          │  ├── brightnexus.sock        (0600)    │
                                          │  ├── ecies-privkey.bin       (0600)    │
                                          │  ├── bridge-identity.{key,pub} (0600)  │
                                          │  ├── totp-config.json        (0600)    │
                                          │  ├── geo-acl.json + .sig     (0600)    │
                                          │  ├── geo-acl-session.json    (0600)    │
                                          │  ├── geo-policy.json         (0600)    │
                                          │  ├── geo-zones.json + .sig   (0600)    │
                                          │  ├── attestation-pins.json   (0600)    │
                                          │  └── geo-audit.log.{ndjson}  (0600)    │
                                          └────────────────────────────────────────┘
```

The bridge keeps its EBP/1 command surface unchanged. BrightLink adds two implemented credential commands (`LINK_REGISTER` §4.5, `LINK_DELIVER` §4.6), the geo command surface (`LINK_GEO_*` §9), and the agent-to-shell push channel (`LINK_PUSH` §10). `LINK_AUDIT_EMIT` is reserved (§11). A BrightLink-aware client speaks both EBP/1 and BrightLink through the same connection.

The bridge is **per-user**. Each user account has its own `~/.brightchain/brightnexus/` directory, its own bridge identity, its own ACL, and its own running BrightNexus instance. Bridge identities do not cross user boundaries.

Three pluggable infrastructure layers (`BridgeIdentity`, `PeerAttestation`, `GeoSource`) abstract platform differences. The protocol surface is identical across macOS and Linux; only the implementation modules differ. See §6.

---

## 4. Wire Specification

### 4.1 Out-of-Band Cryptographic Registration

Before any credential delivery takes place, a CLI session registers with the local user-restricted bridge.

1. **Local Channel.** The bridge hosts an `AF_UNIX`/`SOCK_STREAM` socket exclusively accessible by the local user (filesystem permissions enforced by the host OS). The canonical path is:

   ```
   $HOME/.brightchain/brightnexus/brightnexus.sock
   ```

   Clients MAY override via the `BRIGHTNEXUS_SOCKET` environment variable. There are no legacy fallback paths in BrightLink.

2. **Ephemeral Exchange.** The shell connects to the EBP/1 socket and performs the `LINK_REGISTER` exchange defined in §4.5. The exchange yields a unique 32-byte session key (`K_session`) and a 16-byte transient `sessionId`, both bound to the bridge's P-256 signature over the registration transcript. The handshake never transmits `K_session` in cleartext: client → bridge contributions arrive inside an ECIES envelope addressed to the bridge's persistent secp256k1 public key (from `GET_PUBLIC_KEY`); the bridge's contribution is returned inside an ECIES envelope addressed to the client's ephemeral secp256k1 key from the same handshake.

3. **Memory Residence.** `K_session` resides strictly within the active memory space of that specific shell process and the bridge. Both ends destroy their copies on session expiry, on agent restart, and on explicit teardown.

4. **Session Expiry.** Sessions have a maximum lifetime of **8 hours** regardless of activity. The bridge MUST refuse to process `LINK_DELIVER` for expired sessions and MUST log the attempt. Shells that outlive their session must re-register.

5. **Squatting Defense.** The bridge MUST verify that no file exists at the chosen socket path before binding for the first time after install, and MUST abort with a fatal error rather than overwriting an unexpected file.

6. **Single Bridge.** The bridge fulfils all roles: ECIES key custody, P-256 transcript signing, credential storage, menu-bar UI. Implementations targeting platforms without a Secure Enclave SHOULD provide an EBP/1-compatible bridge that uses an OS keyring for secp256k1 key custody and either a TPM or software signing for the registration transcript; such implementations are still wire-compatible with this RFC at the BrightLink layer.

### 4.2 Wire-Level Distinguishability

`VERSION` / `INFO` responses carry a `brightlinkProtocolVersion: 1` field. BrightLink-aware clients pin on this. EBP/1-only bridges that don't speak BrightLink return EBP/1's generic `"Unknown command: <cmd>"` for `LINK_REGISTER`; BrightLink-aware bridges that haven't yet shipped a particular reserved command return an error string ending `"not implemented in this build"`. This lets clients distinguish three regimes: not-aware, aware-but-incomplete, and aware-and-implemented.

### 4.3 Concurrency, Lifetime, and Per-Session State

- One bridge process serves many concurrent shells. Each shell holds one EBP/1 connection.
- One connection holds at most one BrightLink session at a time. Re-issuing `LINK_REGISTER` on the same connection invalidates the prior session and resets the per-session rate limiter.
- Per-connection state owned by the bridge: `K_session`, `sessionId`, `bridgeIssuedAtUnix`, `expiresAtUnix`, `lastInboundCounter`, agent-info block, deliver-failure rate-limiter state.
- Per-connection state owned by the shell: `K_session`, `sessionId`, the bridge's pinned SEP P-256 public key (TOFU), `outboundCounter`.
- Connection close wipes `K_session` on both sides. Stored credentials persist for their declared TTL regardless — closing the shell does not invalidate credentials the shell already delivered.

### 4.4 Rate Limiting

The bridge enforces a per-session **failure-only** rate limit on `LINK_DELIVER`: after **30 consecutive structural-or-decryption failures within a 60-second window**, the bridge tears down the session and requires re-registration. Successful deliveries are not rate-limited.

Rationale: a remote attacker who has somehow injected JSON onto the local socket but doesn't hold `K_session` will trip GCM authentication on every attempt. 30 failures in a minute is well above any plausible legitimate failure rate (counter races, transient JSON-construction bugs) and well below the rate at which an attacker could probe the GCM tag space.

### 4.5 The `LINK_REGISTER` Command

The handshake establishes `K_session`, derives a transcript covering every input either side contributed, and gets that transcript signed by the bridge's SEP-anchored P-256 key. The shell verifies that signature against the SEP public key (`GET_ENCLAVE_PUBLIC_KEY`) and pins it on first use.

#### 4.5.0 Pinning to DD-ECIES (Normative)

The outer envelope encryption is **strictly** DD-ECIES Basic mode (cipher-suite byte `0x21`) over secp256k1. Compressed (33-byte) ephemeral public keys only — uncompressed (65-byte) ephemerals are rejected. The §5.3 tolerance from the DD-ECIES draft is opted out for both directions of the BrightLink registration handshake.

#### 4.5.1 Envelope Plaintext Schema

The client builds, JSON-serialises, and ECIES-encrypts:

```json
{
  "v": 1,
  "clientPub": "<base64 65-byte uncompressed secp256k1>",
  "clientShare": "<base64 32 bytes>",
  "issuedAtBd": <BrightDate scalar — days since J2000.0>,
  "ttlSeconds": <int — requested session lifetime, capped at 28800>,
  "agent": { "name": "<string>", "version": "<string>", "platform": "<string>" }
}
```

`agent.*` fields default to `"unknown"` at the bridge if missing or non-string. Each field is truncated to 64 characters.

#### 4.5.2 Session-Key Derivation

Both ends compute:

```
IKM   = clientShare ‖ bridgeShare       (64 bytes)
salt  = clientNonce ‖ sessionId          (32 bytes)
info  = "brightlink-session-key-v1"      (25 bytes UTF-8)
K_session = HKDF-SHA256(IKM, salt, info, 32)
```

The HKDF info string is **case- and byte-exact**. A typo here breaks every delivery silently.

#### 4.5.3 Canonical Transcript and Bridge Response

The bridge constructs a canonical 238-byte transcript:

```
"BrightLink v1 transcript\0"                            25 bytes
LE32(len(clientNonce))   ‖ clientNonce                  4 + 16
LE32(len(clientPub))     ‖ clientPub                    4 + 65
LE32(len(clientShare))   ‖ clientShare                  4 + 32
LE32(len(sessionId))     ‖ sessionId                    4 + 16
LE32(len(bridgeShare))   ‖ bridgeShare                  4 + 32
LE32(8)                  ‖ u64_be(round(issuedAtBd*86400))
LE32(8)                  ‖ u64_be(bridgeIssuedAtUnix)
LE32(4)                  ‖ u32_be(ttlSeconds)
                                                   = 238 bytes
```

`LE32(n)` is a 4-byte little-endian length prefix. `u64_be` and `u32_be` are big-endian.

The bridge signs the transcript with its SEP P-256 key (DER-encoded ECDSA) and returns:

```json
{
  "ok": true,
  "sessionId": "<base64 16 bytes>",
  "bridgeIssuedAtUnix": <int>,
  "ttlSeconds": <int — granted, possibly clamped>,
  "responseEnvelope": "<base64 ECIES envelope to clientPub carrying bridgeShare>",
  "transcriptSig": "<base64 DER ECDSA-P256>"
}
```

#### 4.5.4 Client-Side Procedure

1. Generate `clientNonce` (16 bytes), `clientShare` (32 bytes), and an ephemeral secp256k1 keypair (`clientPub`/`clientPriv`).
2. Build the §4.5.1 plaintext, ECIES-encrypt to the bridge's `GET_PUBLIC_KEY`.
3. Send `LINK_REGISTER` with `clientNonce` (base64), `envelope` (base64), `protocolVersion: 1`.
4. Receive the response; ECIES-decrypt `responseEnvelope` with `clientPriv` to recover `bridgeShare`.
5. Reconstruct the §4.5.3 transcript from inputs the client knows + the bridge's response fields.
6. Verify `transcriptSig` against the SEP key (TOFU on first registration; pin-match on every subsequent registration).
7. Derive `K_session` via §4.5.2.
8. Wipe `clientPriv`, `clientShare`, `bridgeShare`, and any intermediate IKM. Retain only `K_session`, `sessionId`, and the SEP key pin.

#### 4.5.5 Trust on First Use vs Pinning the SEP Key

The first successful `LINK_REGISTER` on a fresh client install pins the bridge's SEP public key. Every subsequent `LINK_REGISTER` against the same bridge MUST byte-match the pinned key, or the client refuses with a TOFU-mismatch error. This bounds the "lying bridge" attack to first-install on a fresh device — a reasonable boundary for a local-developer tool.

#### 4.5.6 Errors

The bridge returns plain-string `error` fields. Clients SHOULD match on the literal English strings:

- `"Unsupported BrightLink protocol version"` — client sent `protocolVersion != 1`.
- `"Missing clientNonce"` / `"Missing envelope"` — request shape error.
- `"Decryption failed"` — outer ECIES envelope decode/AEAD failure.
- `"Invalid envelope plaintext"` — inner JSON is not the §4.5.1 schema, or `v != 1`.
- `"Stale registration"` — `issuedAtBd * 86400` more than 60s in the future.
- internal errors prefixed `"internal: "` — bridge bug; client SHOULD log and retry once.

### 4.6 The `LINK_DELIVER` Command (Shell → Agent)

After registration, the shell delivers credential payloads as JSON requests. There is no terminal-emulator path. There is no out-of-band stream filter. There is one path: a JSON object on the EBP/1 socket.

#### 4.6.1 Request

```json
{
  "cmd":        "LINK_DELIVER",
  "counter":    <uint64 — strictly greater than the last accepted>,
  "type":       "<string — one of §5 schema identifiers>",
  "context":    "<string — routing context, e.g. URL or zone name>",
  "iv":         "<base64 12 bytes>",
  "ciphertext": "<base64>",
  "authTag":    "<base64 16 bytes>"
}
```

`counter` is the shell's per-session monotonic outbound counter, starting at 1.

#### 4.6.2 Length-Prefixed AAD

The AES-256-GCM Additional Authenticated Data is constructed with length-prefixed encoding:

```
AAD = LE32(1) ‖ dir_tag                            (1 = length, dir_tag = 0x01 for shell→agent)
    ‖ LE32(8) ‖ u64_be(counter)
    ‖ LE32(len(type))    ‖ type_utf8
    ‖ LE32(len(context)) ‖ context_utf8
```

Both sides reconstruct AAD identically. A captured ciphertext cannot be replayed under a different direction, type, context, or counter even if `K_session` were extracted.

#### 4.6.3 Replay Window

The bridge maintains `lastInboundCounter` per session, initialised to 0. On receipt:

1. The bridge verifies `counter > lastInboundCounter` and `counter ≤ lastInboundCounter + 1000`.
2. If the AES-GCM authentication succeeds, the bridge sets `lastInboundCounter = counter` and stores the credential.
3. Counter values out of window are rejected with `"Counter replayed"` or `"Counter out of replay window"` and count toward §4.4 rate-limit accounting.

#### 4.6.4 Response

Successful deliveries return `{"ok": true, "type": "<echoed>", "context": "<echoed>"}`. The echo lets the shell confirm the bridge stored the credential under the expected routing context after any body-side overrides (§5).

### 4.7 Command Surface Index

| Command | Section | Status |
|---|---|---|
| `LINK_REGISTER` | §4.5 | Implemented (this RFC). |
| `LINK_DELIVER` | §4.6 | Implemented (this RFC). |
| `LINK_GEO_STATUS` | §9.1 | Implemented (this RFC). |
| `LINK_GEO_PROXIMITY` | §9.2 | Implemented (this RFC). |
| `LINK_GEO_ZONE` | §9.3 | Implemented (this RFC). |
| `LINK_GEO_GET` | §9.4 | Implemented (this RFC). |
| `LINK_GEO_REFRESH` | §9.5 | Implemented (this RFC). |
| `LINK_PUSH` | §10 | Implemented (this RFC). |
| `LINK_AUDIT_EMIT` | §11 | Reserved — returns `"LINK_AUDIT_EMIT not implemented in this build"`. |

A BrightLink-aware bridge MUST acknowledge any reserved command name with the literal `"not implemented in this build"` suffix so callers can distinguish a v1-aware bridge from one that returns the EBP/1 generic `"Unknown command: <cmd>"`.

### 4.8 Peer Attestation, TTL Clamping, and Provenance

The bridge captures the connecting peer's audit token (codesign identity, team ID) at `accept(2)` time. Two policy modes:

- **Log-only (default).** Every `LINK_DELIVER` records the attestation result alongside the stored credential. Unsigned binaries are accepted; the credential is tagged with `"unsigned"` provenance in the menu-bar UI.
- **Enforce.** `LINK_DELIVER` from a peer that fails attestation is rejected with `"Peer attestation failed"`.

The bridge also enforces a configurable per-credential TTL ceiling (default 1 hour, range 1–480 minutes). Payloads requesting a longer TTL are silently clamped at storage time; the response is unaffected. The user-facing UI displays the resolved (post-clamp) expiry.

### 4.9 Memory Hygiene

- The bridge wipes `K_session` on connection close, on session re-registration, and on rate-limit teardown. Stored payloads are wiped on TTL expiry.
- The shell wipes `K_session` on `disconnect()` and on `linkUnregister()`.
- Both ends use best-effort overwrites of intermediate IKM and share buffers; readers should assume the language runtime's GC may have aliased copies that survive the explicit clear.

---

## 5. Standardised Payload Schemas

All payloads are AES-256-GCM-sealed JSON objects. The plaintext top-level keys are common across schemas:

| Field | Type | Description |
| --- | --- | --- |
| `ttl` | `int` | Requested TTL in seconds. Clamped at the bridge's configured ceiling (§4.8). |
| `issued_at` | `int` (optional) | Unix timestamp the shell believes the credential was issued. Informational. |
| `type` | `string` (optional) | Body-side override of the wire `type`. The bridge prefers body-side. |
| `context` | `string` (optional) | Body-side override of the wire `context`. The bridge prefers body-side. |

The remaining schema-specific fields:

### 5.1 `ephemeral-auth`

```json
{ "username": "...", "password": "...", "email": "...", "ttl": 300 }
```

For dynamic test credentials, ephemeral DB users, OAuth flow scratch logins.

### 5.2 `db-connection`

```json
{ "engine": "postgres", "host": "...", "port": 5432, "user": "...", "pass": "...", "ttl": 300 }
```

For full database connection contexts. The menu-bar UI MAY render a copy-as-DSN action.

### 5.3 `api-token`

```json
{ "token": "...", "scope": ["read:repo", "write:org"], "ttl": 600 }
```

For OAuth bearer tokens, GitHub PATs, etc.

### 5.4 `cloud-session`

```json
{ "provider": "aws", "accessKeyId": "...", "secretAccessKey": "...", "sessionToken": "...", "region": "...", "ttl": 3600 }
```

For STS/AssumeRole credentials. The menu-bar UI MAY render copy-as-`aws configure` actions.

### 5.5 `ssh-credential`

```json
{ "host": "...", "user": "...", "privateKey": "...", "passphrase": "...", "ttl": 1800 }
```

Pinned to OpenSSH-format private keys.

### 5.6 `kubeconfig-context`

```json
{ "cluster": "...", "server": "...", "caCert": "...", "user": "...", "clientCert": "...", "clientKey": "...", "token": "...", "ttl": 3600 }
```

For ephemeral kubeconfig contexts (e.g. `gcloud container clusters get-credentials` output).

### 5.7 `totp-seed`

```json
{ "label": "...", "issuer": "...", "secret": "...", "algorithm": "SHA1", "digits": 6, "period": 30, "ttl": 60 }
```

Short-lived TOTP seeds (e.g. for one-shot 2FA bootstrapping).

### 5.8 `mtls-cert`

```json
{ "cert": "...", "key": "...", "caCert": "...", "ttl": 600 }
```

Client mTLS certificate + private key bundle.

### 5.9 `plaintext`

```json
{ "label": "...", "value": "...", "masked": true, "ttl": 600 }
```

Generic single-value payload — the catch-all for "credential-shaped thing the user wants in the menu bar for ten minutes." `masked: true` tells the UI to render dots until the user clicks.

---

## 6. Cross-Platform Pluggables

BrightLink is designed to run on macOS today, Linux next, and other POSIX platforms with reasonable effort. Three platform-specific concerns are abstracted behind interfaces; the protocol and the rest of the bridge are platform-agnostic.

### 6.1 `BridgeIdentity`

The bridge holds **one persistent signing keypair per install**. This key signs the §4.5 registration transcript and the §7 ACL/zone files. Its public half is what the client TOFU-pins on first registration. Its private half MUST never leave the bridge process.

```
interface BridgeIdentity {
  /// Stable identifier for this key. Stored in client-side TOFU pins;
  /// printed in audit logs. Format: `{algorithm}:{base64(SHA-256(pub))[0..16]}`.
  /// Example: "p256:7f3a8b1c4d2e0f97".
  fn keyId() -> String;

  /// 65-byte uncompressed P-256 public key (X9.63 form).
  fn publicKey() -> [u8; 65];

  /// Sign `data` with the bridge's private key. Returns DER-encoded
  /// ECDSA-P256 signature. SHA-256-prehashes internally.
  fn sign(data: &[u8]) -> Vec<u8>;
}
```

Three implementations are normative for v1.x:

| Implementation | Platform | Storage | Hardware-backed |
|---|---|---|---|
| `SepBridgeIdentity` | macOS Apple Silicon | Secure Enclave (`SecKeyCreateRandomKey` with `kSecAttrTokenIDSecureEnclave`) | yes |
| `Tpm2BridgeIdentity` | Linux with TPM2 | TPM2 NV via tpm2-tss | yes |
| `FileBridgeIdentity` | any POSIX (fallback) | `~/.brightchain/brightnexus/bridge-identity.key` mode 0600 | no |

The bridge selects an implementation at startup with this preference order: SEP (if Apple Silicon), TPM2 (if `/dev/tpm0` exists and tpm2-tss is linked), File (last resort). The selected implementation is logged at startup and stored in `~/.brightchain/brightnexus/bridge-identity.kind` so the client can be informed in the §4.5 transcript that "this bridge identity is software-backed" — useful for security-policy-aware clients to refuse software-only bridges where the user requires hardware anchoring.

The §4.5 `transcriptSig` is produced by `BridgeIdentity.sign(transcript_bytes)`. The client TOFU-pins `BridgeIdentity.publicKey()` on first registration and verifies pin-match on every subsequent one. Pins are invalidated only by user action (a "Reset BrightNexus identity" button in the GUI that wipes the bridge identity, regenerates a fresh one, and warns that all pinned clients will refuse to register until re-pinned).

### 6.2 `PeerAttestation`

The bridge identifies the connecting peer at every `accept(2)` and reports four facts about it: who it is in the kernel's view, where its executable lives, who signed it, and who its ancestors are. The `PeerAttestation` interface is platform-pluggable; the wire surface and the ACL machinery are not.

```
struct PeerAttestation {
  pid:                pid_t,
  uid:                uid_t,
  executable_path:    Option<String>,        // canonical path from kernel
  executable_hash:    Option<[u8; 32]>,      // SHA-256 of the binary
  attestation_class:  AttestationClass,
  issuer_id:          Option<String>,        // see table below
  subject_id:         Option<String>,        // see table below
  signature_valid:    bool,
  peer_lineage:       Vec<PidPathSigning>,   // ancestors, immediate-first, capped at 8
  ssh_session:        Option<SshSessionInfo>,// non-null iff sshd is in lineage
}

enum AttestationClass {
  DeveloperId,        // macOS: Apple Developer ID + Team ID
  MacAppStore,        // macOS: Mac App Store
  BshBuiltin,         // any: signed by the bsh release key
  DpkgSigned,         // Linux: Debian/Ubuntu .deb signed
  RpmSigned,          // Linux: Red Hat/Fedora .rpm signed
  FlatpakSigned,      // Linux: Flatpak signed
  Unsigned,           // any: TOFU pin by (path, hash) only
}

struct PidPathSigning {
  pid:               pid_t,
  executable_path:   Option<String>,
  attestation_class: AttestationClass,
  issuer_id:         Option<String>,
}

struct SshSessionInfo {
  source_user:  Option<String>,   // e.g. "alice"
  source_host:  Option<String>,   // e.g. "laptop.local"
  sshd_pid:     pid_t,
  session_id:   String,           // unique-per-session: "sshd:<pid>:<start_time>"
}
```

`(attestation_class, issuer_id, subject_id, executable_hash)` is the **canonical caller identity** the ACL keys off:

| Class | `issuer_id` | `subject_id` | Notes |
|---|---|---|---|
| `DeveloperId` | Apple Team ID (e.g. `WTGFXFA42L`) | Bundle/binary identifier | Strongest macOS attestation. |
| `MacAppStore` | `apple-app-store` | Bundle id | App Store-vetted. |
| `BshBuiltin` | `digitaldefiance` | Subject id from our cert | bsh, BrightNexus, our shipped tools. |
| `DpkgSigned` | Repository GPG fingerprint (e.g. Debian archive key) | Package name (e.g. `awscli`) | Trusted iff repo GPG key is installed. |
| `RpmSigned` | RPM-DB GPG key fingerprint | Package name | Same model as dpkg. |
| `FlatpakSigned` | Flathub GPG fingerprint or flatpakrepo key | Application ID (`com.example.App`) | |
| `Unsigned` | `null` | `null` | Identified by `(executable_path, executable_hash)` TOFU pair only. |

Two normative implementations:

**`MacOSPeerAttestation`** uses `getsockopt(LOCAL_PEERPID)` for pid, `proc_pidpath()` for the kernel-canonical executable path (immune to argv0 spoofing), and `SecStaticCodeCheckValidity` + `SecCodeCopySigningInformation` for the signature. Lineage walk uses `proc_pidinfo(PROC_PIDT_SHORTBSDINFO)` to read `pbsi_ppid` up the chain.

**`LinuxPeerAttestation`** uses `getsockopt(SO_PEERCRED)` for `(pid, uid, gid)`, `readlink("/proc/<pid>/exe")` for the kernel-canonical executable path (also immune to argv0 spoofing), `dpkg-query -S` (or `rpm -qf`) to map binary → package, and `dpkg-verify`/`rpm --checksig` to validate the package signature against installed repo keys. If the IMA/EVM appraisal subsystem is enabled, `IMA_DIGEST` is read from `/proc/<pid>/attr/current` for the kernel-measured hash. Lineage walk reads `/proc/<pid>/status` PPid up the chain.

Both implementations cap lineage walk at **8 ancestors** to bound work; this is plenty for `bsh-inject ← bsh ← sshd ← launchd/init` plus headroom for `tmux`/`screen`. Beyond 8, the bridge logs `lineage truncated` and proceeds.

The bridge SHOULD recognise an ancestor as `sshd` (or `mosh-server`, `tmux` running under `sshd`) by **signing identity**, not by name. On macOS this means the binary signed with Apple's `com.openssh.sshd` identifier; on Linux the binary in the `openssh-server` (or equivalent) signed package. Ancestors named `sshd` but lacking the matching signature do not populate `ssh_session`.

`SshSessionInfo.source_user` and `SshSessionInfo.source_host` come from the `SSH_CONNECTION` and `SSH_CLIENT` environment variables of the closest `sshd`-descended ancestor (typically the user's login shell). These are advisory display strings, not trust statements; the bridge MUST NOT use them as ACL keys.

### 6.3 `GeoSource`

The platform-specific source of geographic fixes.

```
interface GeoSource {
  /// Most recent fix or null if none has been obtained.
  fn currentFix() -> Option<GeoFix>;

  /// Trigger a fresh fix; returns when the fix lands or `timeout`s.
  fn requestRefresh(timeout: Duration) -> Result<GeoFix, GeoError>;

  /// Subscribe to fix updates. Caller is invoked with each new fix
  /// as long as the subscription handle is alive.
  fn subscribe(handler: Box<dyn Fn(GeoFix)>) -> SubscriptionHandle;

  /// Status of the underlying engine.
  fn status() -> GeoSourceStatus;
}

struct GeoFix {
  brightdate:        f64,                 // BrightDate at which fix was sampled
  wgs84_lat:         f64,                 // degrees
  wgs84_lon:         f64,                 // degrees
  wgs84_alt_m:       Option<f64>,         // metres above WGS84 ellipsoid
  ecef_x_m:          f64,                 // ITRF2020 ECEF X in metres
  ecef_y_m:          f64,                 // ITRF2020 ECEF Y in metres
  ecef_z_m:          f64,                 // ITRF2020 ECEF Z in metres
  accuracy_m:        f64,                 // 1-σ horizontal accuracy
  velocity_mps:      Option<EcefVector>,  // ECEF velocity m/s, if known
}
```

The internal storage form is **ECEF in metres**. WGS84 lat/lon/alt is derived (Heikkinen closed-form for ECEF→WGS84; standard ellipsoid math for WGS84→ECEF), as is BrightSpace `(x_bm, y_bm, z_bm) = (x_m, y_m, z_m) / 299_792_458`. All derivations are exact under IEEE 754 double precision at terrestrial scale.

Two normative implementations:

**`CoreLocationGeoSource`** wraps `CLLocationManager` with `kCLLocationAccuracyHundredMeters` (sufficient for zone resolution; tunable in policy). Conversion to ECEF uses the standard WGS84 ellipsoid (`a = 6_378_137.0`, `f = 1/298.257_223_563`).

**`GeoClueGeoSource`** wraps GeoClue 2.5+ over the D-Bus interface (`org.freedesktop.GeoClue2.Client`). Same ellipsoid conversion. Falls back to `IpGeoSource` (local-network IP geolocation, ±10 km accuracy) if GeoClue is paused/unavailable, with the fix marked `accuracy_m: 10000` so `geo:precise` callers know the data is coarse.

A test-only `FixedGeoSource` is provided for harness use: ships a deterministic `(lat, lon)` and the derived ECEF, no platform calls.

The `GeoSource` is **not** itself the access-control layer. ACL gating happens above this in `LinkGeoEngine` (§9). `GeoSource` only produces fixes; whether they leave the bridge is decided by §7.

---

## 7. Geo Scope Ladder, ACL, and Prompt Routing

### 7.1 The Scope Ladder

Five scopes form a strict hierarchy of information leak. A grant for a higher-rung scope implies grants for lower rungs (`geo:precise` implicitly satisfies `geo:zone`, etc.):

| Scope | What the caller learns | Wire-format response |
|---|---|---|
| `geo:status` | Geo engine alive? Has recent fix? Boolean only. | `{ok, alive, fix_age_seconds}` |
| `geo:proximity` | Yes/no answer to a specific named-zone question. | `{ok, in_zone}` |
| `geo:zone` | Current zone identifier and dwell duration. | `{ok, zone, dwell_seconds, brightdate}` |
| `geo:precise` | Full position (caller picks `wgs84`, `brightspace`, or `both`). | `{ok, position, accuracy_m, brightdate}` |
| `geo:trajectory` | Position + velocity vector. | `{ok, position, velocity, accuracy_m, brightdate}` |

The default policy for any unknown caller is `prompt` for every scope. **Unsigned binaries** (`AttestationClass::Unsigned`) are capped at `geo:proximity` regardless of any user grant — they cannot ever be granted `geo:zone`, `geo:precise`, or `geo:trajectory`. This is enforced in the bridge regardless of `geo-acl.json` contents; it is not a user-configurable cap. (Rationale: an unsigned binary's TOFU pin can be invalidated by the same attacker who owns the binary; granting it persistent location access creates a pin-rotation oracle.)

### 7.2 ACL Schema

`~/.brightchain/brightnexus/geo-acl.json` is the user's persistent allowlist. Each entry describes one caller and their per-scope policy.

```json
{
  "version": 1,
  "bridge_key_id": "p256:7f3a8b1c4d2e0f97",
  "entries": [
    {
      "id": "01HZJ7KVPM3...",
      "display_name": "bsh shell (Digital Defiance)",
      "attestation_class": "BshBuiltin",
      "issuer_id": "digitaldefiance",
      "subject_id": "org.digitaldefiance.bsh",
      "expected_path": "/opt/homebrew/bin/bsh",
      "fallback_hash": null,
      "scopes": {
        "geo:status":     "always",
        "geo:proximity":  "always",
        "geo:zone":       "always",
        "geo:precise":    "prompt",
        "geo:trajectory": "deny"
      },
      "added_at_bd":   9638.412,
      "last_used_bd":  9638.951,
      "expires_at_bd": null,
      "purpose":       "BrightSpace zone awareness for shell prompt and brightspace-tools"
    },
    {
      "id": "01HZJ7QXR2A...",
      "display_name": "AWS CLI",
      "attestation_class": "DeveloperId",
      "issuer_id": "WTGFXFA42L",
      "subject_id": "com.amazon.awscli2",
      "expected_path": "/usr/local/bin/aws",
      "fallback_hash": null,
      "scopes": {
        "geo:status":     "prompt",
        "geo:proximity":  "prompt",
        "geo:zone":       "prompt",
        "geo:precise":    "deny",
        "geo:trajectory": "deny"
      },
      "added_at_bd":   9637.553,
      "last_used_bd":  9638.105,
      "expires_at_bd": 9645.553
    }
  ]
}
```

Per-scope `policy` values: `always` (auto-allow), `prompt` (user prompt every request), `deny` (auto-deny without prompting).

The file is paired with `geo-acl.sig` — a DER-encoded ECDSA-P256 signature over the canonical-JSON encoding of `geo-acl.json`, produced by `BridgeIdentity.sign()`. On load, the bridge:

1. Reads `geo-acl.json` and `geo-acl.sig`.
2. Re-canonicalises the JSON (RFC 8785 JCS).
3. Verifies the signature against `BridgeIdentity.publicKey()`.
4. On mismatch, logs the invalidation, **rewrites the file with every entry's policy reverted to `prompt`**, and re-signs.

The user can hand-edit `geo-acl.json`. The signature becomes invalid on save. The bridge logs the invalidation, reverts every entry to `prompt`, and re-signs the file with the bridge identity. Hand-editing is deliberately a friction event: the user gets re-prompted for each binary on next access. (To make persistent changes the user uses the BrightNexus GUI's ACL editor, which signs on every change.)

The `bridge_key_id` field at the top of the ACL pins the file to a specific bridge identity. If a user moves their `geo-acl.json` between machines (or restores from backup with a different bridge identity), the `bridge_key_id` mismatch triggers full re-prompting.

### 7.3 Session-Scoped ACL Entries (SSH)

`~/.brightchain/brightnexus/geo-acl-session.json` holds **transient** grants tied to specific SSH sessions. Same schema as `geo-acl.json`, plus one extra field per entry:

```json
"ssh_session_id": "sshd:4310:1779461500"
```

The bridge clears entries from `geo-acl-session.json` when the matching `sshd_pid` no longer exists. The file is wiped on bridge restart in any case. Session-scoped grants are how `Allow For This SSH Session` is implemented (§7.5).

### 7.4 Lookup Algorithm

For a `LINK_GEO_*` request from a peer with attestation `A` and requested scope `S`:

1. Look up entries in `geo-acl-session.json` first. Match if every field of `(attestation_class, issuer_id, subject_id)` matches an entry **and** `ssh_session_id` matches the peer's current session id (if any). On match, apply that entry's `scopes[S]`.
2. If no session-scoped match, look up `geo-acl.json`. Match if every field of `(attestation_class, issuer_id, subject_id)` matches.
3. For `Unsigned` peers, the match key is `(attestation_class:Unsigned, executable_path, executable_hash)` against `attestation-pins.json`. Both path and hash MUST match exactly. Cap at `geo:proximity` regardless of stored policy.
4. For matched entries with `policy = always`, return the data immediately and update `last_used_bd`.
5. For matched entries with `policy = deny`, return `{ok:false, error:"geo: scope denied by policy"}` immediately.
6. For matched entries with `policy = prompt`, OR no match, route to the §7.5 prompt flow.

### 7.5 Prompt Routing

The bridge holds the request open while it shows a prompt. The client sees a single response when the user (or timeout) decides.

`geo-policy.json` controls routing:

```json
{
  "version": 1,
  "default_scope_policy": "prompt",
  "freshness_seconds": {
    "geo:status":      86400,
    "geo:proximity":     300,
    "geo:zone":          300,
    "geo:precise":        60,
    "geo:trajectory":     30
  },
  "request_throttle": {
    "per_pid_per_minute": 6,
    "per_subject_id_per_minute": 60
  },
  "prompt_timeout_seconds": 30,
  "prompt_route": "gui-then-tui",
  "audit_retention_bd": 30,
  "ssh_grants_enabled": true
}
```

`prompt_route` values:

- `gui-only` — requires a graphical session. SSH-only clients get `geo: prompt unavailable`.
- `gui-then-tui` (default) — GUI gets first refusal; TUI fallback when no graphics session is attached.
- `tui-only` — used in headless deployments; explicitly disables the GUI prompt.

GUI prompt: native modal (`NSAlert.runModal` on macOS, GTK `GtkDialog` MODAL on Linux). The modal shows:

```
┌─ BrightLink: Location Request ────────────────────────────────────┐
│  AWS CLI                                                          │
│  Signed by Amazon (Team WTGFXFA42L)                               │
│  /usr/local/bin/aws  (PID 4321)                                   │
│  Requesting: geo:zone                                             │
│  Purpose: Region selection awareness                              │
│                                                                   │
│  ⚠️ Running inside SSH session from alice@laptop.local             │
│                                                                   │
│   [ Allow Once ]  [ Allow For This SSH Session ]  [ Deny ]        │
│   [ Always ]  [ Never ]                                           │
└───────────────────────────────────────────────────────────────────┘
```

Buttons available depend on context:

- **Local (no `ssh_session`):** `Allow Once`, `Allow Always`, `Deny`, `Deny Always`.
- **SSH (`ssh_session` populated):** `Allow Once`, `Allow For This SSH Session`, `Deny`, `Deny Always`. **`Allow Always` is not offered** in SSH-context prompts; persistent grants require physical presence at the bridge's GUI. Users who explicitly want SSH-grantable persistence can flip `prompt_route: tui-only` (which moves the trust assumption from "GUI = physical presence" to "the user accepts SSH-grantable persistence as a trade-off").

`Allow Always` writes to `geo-acl.json`. `Allow For This SSH Session` writes to `geo-acl-session.json`. Both require re-signing the file with `BridgeIdentity.sign()`; the GUI is responsible for invoking the signer.

TUI prompt: when the GUI is unavailable and `prompt_route` allows TUI, the bridge writes a JSON frame to a subscribed `LINK_PUSH` listener inside bsh; bsh renders the prompt as a modal terminal dialog and writes the user's answer back over the same socket. The TUI path is restricted to `Allow Once` and `Deny` regardless of context — persistent grants require the GUI.

If the prompt times out (default 30s), the bridge returns `{ok:false, error:"geo: user prompt timed out"}` and records `prompt_timeout` in the audit log.

### 7.6 Throttling

The `request_throttle` settings cap concurrent inflight requests:

- `per_pid_per_minute`: prevents a single misbehaving process from spamming the user with prompts.
- `per_subject_id_per_minute`: caps an entire identity (e.g. all `aws` invocations) across pids.

When the limit is hit, the bridge returns `{ok:false, error:"geo: throttled"}` without prompting.

### 7.7 Audit Log

`~/.brightchain/brightnexus/geo-audit.log` is append-only NDJSON, mode 0600, rotated daily. Each entry:

```json
{
  "brightdate": 9638.521,
  "command": "LINK_GEO_GET",
  "scope": "geo:zone",
  "peer": {
    "pid": 4321,
    "uid": 501,
    "executable_path": "/usr/local/bin/aws",
    "executable_hash": "sha256:abcd...",
    "attestation_class": "DeveloperId",
    "issuer_id": "WTGFXFA42L",
    "subject_id": "com.amazon.awscli2",
    "signature_valid": true
  },
  "ssh_session": {
    "source_user": "alice",
    "source_host": "laptop.local",
    "session_id": "sshd:4310:1779461500"
  },
  "decision": "allowed_by_acl",
  "policy_at_decision": "always",
  "response_summary": { "zone": "zone-prod-office" }
}
```

`decision` values: `allowed_by_acl`, `allowed_by_prompt`, `denied_by_acl`, `denied_by_prompt`, `denied_unsigned_cap`, `prompt_timeout`, `throttled`, `engine_unavailable`.

Retention is `audit_retention_bd` BrightDate days (default 30). Older log files are deleted on rotation.

---

## 8. Zone Shape Algebra

A zone is a named region of physical space the user has defined. `~/.brightchain/brightnexus/geo-zones.json` is the user's zone definitions, signed by `BridgeIdentity` the same way `geo-acl.json` is.

```json
{
  "version": 1,
  "bridge_key_id": "p256:7f3a8b1c4d2e0f97",
  "zones": [
    {
      "id": "zone-prod-office",
      "display_name": "Prod Office",
      "shape": {
        "type": "circle_2d",
        "center": { "wgs84": { "lat": 47.6062, "lon": -122.3321 } },
        "radius_m": 80.0
      },
      "priority": 100
    },
    {
      "id": "zone-12th-floor",
      "display_name": "12th Floor (Prod Office)",
      "shape": {
        "type": "cylinder_3d",
        "center":         { "wgs84": { "lat": 47.6062, "lon": -122.3321 } },
        "radius_m":       40.0,
        "altitude_min_m": 36.0,
        "altitude_max_m": 42.0
      },
      "priority": 200
    },
    {
      "id": "zone-downtown-seattle",
      "display_name": "Downtown Seattle",
      "shape": {
        "type": "polygon_2d",
        "points_wgs84": [
          { "lat": 47.6020, "lon": -122.3380 },
          { "lat": 47.6020, "lon": -122.3260 },
          { "lat": 47.6100, "lon": -122.3260 },
          { "lat": 47.6100, "lon": -122.3380 }
        ]
      },
      "priority": 50
    },
    {
      "id": "zone-usa-west",
      "display_name": "USA West Coast",
      "shape": {
        "type": "bbox_2d",
        "lat_min": 32.0, "lat_max": 49.0,
        "lon_min": -125.0, "lon_max": -114.0
      },
      "priority": 10
    }
  ]
}
```

Four shape types are normative:

- `circle_2d` — `(center, radius_m)`. The default and most common. Center expressed in WGS84 or BrightSpace. The bridge converts both forms to ECEF for point-in-shape tests; the metric is Euclidean ECEF chord distance projected to the surface.
- `cylinder_3d` — `(center, radius_m, altitude_min_m, altitude_max_m)`. Adds vertical extent; for "12th floor of this building" type zones.
- `polygon_2d` — `(points_wgs84[])`. For non-circular regions like downtown areas. Point-in-polygon test runs on WGS84 lat/lon coordinates after projecting the test point. Polygons MUST be simple (non-self-intersecting); the bridge does not check.
- `bbox_2d` — `(lat_min, lat_max, lon_min, lon_max)`. For coarse country/region zones. Cheap point-in-rectangle test on WGS84.

**Most-specific match wins.** When a fix lies inside multiple zones, the highest `priority` (largest integer) zone is reported. Ties broken by `id` lexicographic order. The user controls priority through the GUI; the default for `circle_2d` and `cylinder_3d` is 100, polygons default to 50, bboxes to 10 — reflecting that more-specific shapes naturally outrank coarser ones.

When no zone matches, `LINK_GEO_ZONE` returns `{ok:true, zone:null, dwell_seconds:0}`. The caller sees explicitly that no zone is active, which is different from "geo unavailable" (which would be `{ok:false, error:...}`).

`dwell_seconds` is the duration since the bridge last observed a zone change (any zone-to-different-zone transition resets it; null-to-zone or zone-to-null are also transitions). The bridge tracks zone changes and emits `LINK_PUSH` events on each transition (§10).

---

## 9. The `LINK_GEO_*` Command Surface

Five command verbs cover the geo surface. All five take a JSON request, return a JSON response, and require a registered `LINK_REGISTER` session on the connection. Requests are NOT AEAD-encrypted under `K_session` (unlike `LINK_DELIVER`) because:

1. The connection itself is `AF_UNIX` mode 0600 — already confined to the local user.
2. The data the bridge returns is location data, which lives on the device anyway and is also not secret-from-the-user.
3. AEAD-wrapping each query and response would double the wire cost without adding any property the socket permission already gives.

The `K_session` from registration IS still used: the bridge verifies that the connection has a registered session before serving any geo command. An unregistered connection that asks for geo gets `{ok:false, error:"geo: session not registered"}`.

### 9.1 `LINK_GEO_STATUS`

```json
// Request
{ "cmd": "LINK_GEO_STATUS" }

// Response (always allowed — no scope gate beyond session existence)
{
  "ok": true,
  "alive": true,
  "engine_kind": "CoreLocationGeoSource",
  "fix_age_seconds": 12,
  "accuracy_m": 8.0
}
```

`LINK_GEO_STATUS` is the only geo command that bypasses the ACL. It carries no location data — just liveness + accuracy. Tools that want to gracefully degrade ("if geo isn't ready, skip the zone check") call this first. The `geo:status` scope still exists in the ACL but is for symmetry and audit; no entry can deny `geo:status` from a registered shell.

### 9.2 `LINK_GEO_PROXIMITY`

```json
// Request — caller names the zone they're asking about
{
  "cmd": "LINK_GEO_PROXIMITY",
  "zone": "zone-prod-office"
}

// Response (gated by geo:proximity)
{
  "ok": true,
  "in_zone": true,
  "brightdate": 9638.521
}
```

The proximity command is the **lowest-friction** zone query. The caller MUST name the zone they want to know about; the bridge does not enumerate zones in the response. A caller cannot use this to discover what zones exist — they can only confirm or deny membership in a zone they already know the name of.

### 9.3 `LINK_GEO_ZONE`

```json
// Request
{ "cmd": "LINK_GEO_ZONE" }

// Response (gated by geo:zone)
{
  "ok": true,
  "zone": "zone-prod-office",
  "dwell_seconds": 1842,
  "brightdate": 9638.521
}
```

Returns the highest-priority current zone (§8) and the duration since the last zone change. Carries no coordinates. When no zone matches, returns `zone: null`.

### 9.4 `LINK_GEO_GET`

```json
// Request
{
  "cmd": "LINK_GEO_GET",
  "format": "both"     // "wgs84" | "brightspace" | "both"  — default "both"
}

// Response (gated by geo:precise)
{
  "ok": true,
  "position": {
    "wgs84": {
      "lat": 47.6062,
      "lon": -122.3321,
      "alt_m": 39.5
    },
    "brightspace": {
      "x_bm": 0.003771855,
      "y_bm": -0.016115327,
      "z_bm": 0.013323219,
      "epoch_bd": 9638.521
    }
  },
  "accuracy_m": 8.0,
  "brightdate": 9638.521
}
```

`format` selects the coordinate space(s) included in the response. `"both"` returns both representations. `"wgs84"` returns only the WGS84 sub-object. `"brightspace"` returns only the BrightSpace sub-object. The data is identical; it's a wire-cost knob. The bridge maintains the ECEF metres internally and derives both display forms.

The BrightSpace sub-object always carries `epoch_bd` (the BrightDate at which the fix was sampled) per the [BrightSpace standard's](bright-space-standard) requirement that long-lived spatial claims record sampling epoch, so consumers can re-project through plate-motion velocity if needed.

### 9.5 `LINK_GEO_REFRESH`

```json
// Request
{ "cmd": "LINK_GEO_REFRESH", "timeout_seconds": 10 }

// Response (gated by the same scope as the caller's most recent prior get)
{
  "ok": true,
  "fix_age_seconds": 0,
  "accuracy_m": 6.0
}
```

Triggers the underlying `GeoSource` to obtain a fresh fix and waits up to `timeout_seconds` for it to land. Returns once the fresh fix is recorded. Does NOT return location data — the caller still has to issue a `LINK_GEO_GET` afterward to read the fresh position. This split exists because the freshness and the data are gated by different scopes (status vs precise) and the user's grant decision should be on the data, not the engine.

`LINK_GEO_REFRESH` is itself gated by the highest scope the caller currently holds. A caller with only `geo:status` can refresh; the data they then read with `LINK_GEO_STATUS` or `LINK_GEO_PROXIMITY` reflects the new fix.

### 9.6 SSH Session Handling

When `PeerAttestation.ssh_session` is populated, the bridge:

1. Looks up the ACL match in `geo-acl-session.json` first (keyed by `(attestation, ssh_session_id)`), then falls back to `geo-acl.json` (durable grants apply across SSH sessions too).
2. If the lookup leads to a prompt, the modal shows the SSH source (`alice@laptop.local`) prominently in the prompt body.
3. The prompt's "Allow Always" button is hidden; "Allow For This SSH Session" is offered instead. (Exception: `geo-policy.json` carries `ssh_grants_enabled:false` to disable session-scoped grants entirely, in which case the prompt only offers `Allow Once` and `Deny`.)
4. The audit log records `ssh_session.source_user`, `ssh_session.source_host`, and `ssh_session.session_id` on every entry produced under that connection.
5. `LINK_PUSH` subscriptions established under an SSH session are torn down when the SSH session ends. Push events do not survive the SSH connection's parent shell.

A connection without `ssh_session` follows the standard local-prompt path.

### 9.7 Errors

Geo command error strings the client SHOULD match on:

- `"geo: session not registered"` — connection has no registered `LINK_REGISTER` session.
- `"geo: scope denied by policy"` — ACL entry's policy is `deny` for this scope.
- `"geo: scope unavailable for unsigned binary"` — caller is `Unsigned` and asked for `geo:zone`+ (the cap rule from §7.1).
- `"geo: user prompt timed out"` — prompt timed out before user answered.
- `"geo: user denied"` — user clicked Deny in the prompt.
- `"geo: prompt unavailable"` — `prompt_route:gui-only` and no graphics session is attached.
- `"geo: throttled"` — rate limit hit (§7.6).
- `"geo: engine unavailable"` — `GeoSource` is paused, off, or has no recent fix.
- `"geo: zone not found"` — `LINK_GEO_PROXIMITY` named a zone that doesn't exist in `geo-zones.json`.
- `"geo: format invalid"` — `LINK_GEO_GET.format` was not `wgs84`, `brightspace`, or `both`.
- `"geo: refresh timed out"` — `LINK_GEO_REFRESH` exceeded its `timeout_seconds`.

---

## 10. The `LINK_PUSH` Command (Agent → Shell)

`LINK_PUSH` is the bridge-initiated channel: the bridge holds the connection open and emits event frames as state changes. The shell subscribes once and receives multiple frames over the lifetime of its session.

### 10.1 Subscribe

```json
// Request — sent once per session
{
  "cmd": "LINK_PUSH",
  "subscribe": ["zone-transition", "geo-grant-changed"]
}

// Initial response
{ "ok": true, "subscribed": ["zone-transition", "geo-grant-changed"] }
```

Subscribers can request these event types in v1.x:

- `zone-transition` — fires on any zone change observed by the bridge. Requires `geo:zone` scope; bridge silently skips frames for connections that lack the scope at delivery time.
- `geo-grant-changed` — fires when the user grants or revokes a geo scope for *this caller*. Carries no location data; allows tools to react to "you just got `geo:precise` access; here are the coordinates you can now ask for". Requires no additional scope.

Future v1.x event types will register additional names; subscribers ignore unknown names.

### 10.2 Push Event Frame

The bridge emits frames in the format:

```json
{
  "event":      "zone-transition",
  "counter":    7,
  "iv":         "<base64 12 bytes>",
  "ciphertext": "<base64>",
  "authTag":    "<base64 16 bytes>"
}
```

The `counter` is the per-session monotonic `c_agent_to_shell`, starting at 1 on subscribe and incrementing on each emit. It is independent of `LINK_DELIVER`'s `c_shell_to_agent`.

The AAD is constructed identically to §4.6.2 with `dir_tag = 0x02`:

```
AAD = LE32(1) ‖ 0x02
    ‖ LE32(8) ‖ u64_be(counter)
    ‖ LE32(len(event_name))    ‖ event_name_utf8
    ‖ LE32(0)                  ‖ ""        // empty context for push events
```

Decryption uses `K_session` from §4.5. Frames are AEAD-sealed because they may carry sensitive data (e.g., the inner zone transition references zone names that a malicious tap could otherwise read in plaintext).

The plaintext body for `zone-transition`:

```json
{
  "from":       "zone-home",
  "to":         "zone-prod-office",
  "at_bd":      9638.521
}
```

For `geo-grant-changed`:

```json
{
  "scope":  "geo:precise",
  "policy": "always",
  "by":     "user-prompt"
}
```

### 10.3 Replay Window

The shell maintains `lastInboundCounter` per session (separate from the bridge's, since they advance independently). Frames with `counter ≤ lastInboundCounter` are rejected as replay; frames within `lastInboundCounter + 1000` are accepted. Out-of-window frames advance a per-session push-failure counter; the §4.4 rate-limit machinery applies.

### 10.4 Unsubscribe and Teardown

The shell ends a subscription by closing the connection. There is no explicit `LINK_PUSH_UNSUBSCRIBE`. Connection teardown wipes the subscription. The bridge MUST NOT retain queued events for a disconnected subscriber — events are lost. Subscribers that need durability handle it client-side.

A connection MAY hold both an active `LINK_PUSH` subscription and continue to issue `LINK_DELIVER` / `LINK_GEO_*` requests; the bridge multiplexes responses on the same socket. Push frames are distinguished from request responses by the presence of the `event` field.

### 10.5 Errors

- `"push: session not registered"` — same as `LINK_GEO_*`.
- `"push: unknown event types"` — every name in `subscribe` is unrecognised; bridge will not emit any frames.
- `"push: subscribe limit"` — bridge configured to allow at most one `LINK_PUSH` subscription per session and one already exists.

---

## 11. `LINK_AUDIT_EMIT` (Reserved)

Reserved for bulk audit-log export over the wire. Returns `"LINK_AUDIT_EMIT not implemented in this build"` in v1.1. The local audit log (§7.7) IS specified and accessible via direct file read by the user; only programmatic export over the BrightLink wire is reserved.

When implemented, `LINK_AUDIT_EMIT` will require a `geo:audit` scope (a sixth scope rung above `geo:trajectory`), which is the highest-friction grant in the system — only signed binaries the user explicitly trusts as audit consumers (compliance tools, backup agents) should ever receive it. The wire shape will mirror `LINK_DELIVER` push.

---

## 12. Client Reference

A reference TypeScript client lives at `enclave-bridge-client` (npm: `@digitaldefiance/enclave-bridge-client`). The client surface:

```ts
import { EnclaveBridgeClient } from '@digitaldefiance/enclave-bridge-client';

const client = new EnclaveBridgeClient();
await client.connect();                // connects to discovered socket
await client.linkRegister();           // performs §4.5 handshake
await client.linkDeliver({              // not yet shipped; planned helper
  type: 'plaintext',
  context: 'demo',
  body: { label: 'Hello', value: 'world', ttl: 600 },
});
await client.linkGeoZone();            // returns { zone, dwell_seconds, brightdate }
await client.linkGeoGet({ format: 'both' });
await client.linkPushSubscribe(['zone-transition'], (event) => { /* ... */ });
client.linkUnregister();
await client.disconnect();
```

For `bsh`, the `bsh-inject` and `bsh-geo` builtins in the `bsh/brightlink` module wrap the same flow:

```bsh
zmodload bsh/brightlink

# Credential delivery (§4.6).
printf '{"username":"alice","password":"hunter2","ttl":600}' \
  | bsh-inject --type ephemeral-auth --context http://example.com

# Geo (§9).
bsh-geo --status
bsh-geo --zone
bsh-geo --get --format brightspace
bsh-geo --proximity --zone zone-prod-office
bsh-geo --refresh --timeout 10
```

---

## 13. Test Vectors

The repository at [github.com/BrightChain/bsh](https://github.com/BrightChain/bsh) under `test-harness/` ships:

- A spec-derived mock bridge (`mock-brightnexus`) that any client implementation can drive.
- A spec-derived mock shell (`mock-bsh-client`) that any bridge implementation can drive.
- Known-answer vectors for `K_session` derivation, the canonical transcript, and DD-ECIES encrypt/decrypt.
- Real-bridge integration tests that drive a running BrightNexus instance (Swift on macOS, Rust on Linux when the Linux port lands).
- Real-shell integration tests that drive a real bsh binary against the mock bridge.
- Geo-specific known-answer vectors: ECEF↔WGS84 conversion at the GODE reference station (per [BrightSpace §5](bright-space-standard)), zone shape membership tests, scope-ladder enforcement, ACL signature verification, attestation-class identification on both platforms, SSH-session lineage detection.

A conformant implementation MUST pass the same vectors. CI matrix runs are scripted under `test-harness/scripts/`.

---

## 14. Security Considerations

1. **Trust boundary.** A user who runs an attacker's binary on their machine has already lost; BrightLink does not defend against that. It defends against (a) credentials living longer than they should, (b) credentials reaching things that don't need to see them, and (c) location data reaching binaries the user has not explicitly authorised to read it.
2. **Local-socket adversaries.** `AF_UNIX` mode 0600 inside `~/.brightchain/brightnexus/` (mode 0700) confines reach to the local user. `K_session` never leaves the bridge or shell processes; an attacker who can read `/proc/<pid>/mem` can already read everything.
3. **Bridge-identity TOFU.** First-install pinning is a real boundary, not a perfect one. A user who runs a malicious BrightNexus build before ever running a real one is in the lying-bridge attack window. On macOS, future drafts MAY add out-of-band SEP-key publication via Apple's developer notarization records. On Linux, distribution-signed BrightNexus packages with a published bridge-identity public-key fingerprint provide a similar out-of-band channel.
4. **Software-only `BridgeIdentity`.** The `FileBridgeIdentity` fallback puts the private key on disk in mode 0600 — encrypted at rest where libsecret/GNOME Keyring is available, in plaintext otherwise. This is weaker than hardware-anchored key custody. The bridge logs `bridge identity is software-backed` at startup; clients can refuse to register against software-backed bridges (§6.1) by checking the kind. v1.x MUST NOT silently downgrade trust expectations: if hardware was promised by configuration, the bridge MUST refuse to start with `FileBridgeIdentity`.
5. **Spoofing defence.** The kernel-canonical executable path (`proc_pidpath` on macOS, `/proc/<pid>/exe` on Linux) is read from kernel state, not from peer-supplied data. argv[0] is irrelevant. A binary calling itself `bsh` cannot bypass an allowlist keyed on `(BshBuiltin, digitaldefiance, org.digitaldefiance.bsh)`; its signing identity will not match.
6. **Allowlist tampering.** `geo-acl.json` and `geo-zones.json` are signed by `BridgeIdentity`. A user (or attacker with same-uid file write) who tampers with either invalidates the signature, which the bridge detects on next read and reverts to `prompt` for every entry. This is not perfect — an attacker who can also call `BridgeIdentity.sign()` (i.e., who has compromised the bridge process) can re-sign tampered files — but it raises the bar from "edit the file" to "compromise the running bridge process".
7. **Unsigned-binary cap.** Unsigned binaries CANNOT receive `geo:zone` or higher, regardless of user grant. This is enforced in the bridge above any ACL entry. The cap exists because TOFU-pinning a hash for an unsigned binary is fragile (`brew upgrade` invalidates the pin) and trains users to dismiss re-prompt friction.
8. **SSH context.** Geo grants under SSH expire when the session ends; persistent grants cannot be issued from an SSH session under default policy. Audit-log entries record the SSH source, so the user can reconstruct "what asked for geo while I was SSH'd in from `laptop`".
9. **AES-GCM AAD construction.** The `dir_tag` byte is included in AAD with a leading `LE32(1)` length prefix on both directions, so a captured ciphertext cannot be replayed under the other direction even if `K_session` were extracted.
10. **Side channels.** AES-GCM via Apple's CryptoKit, OpenSSL, and ring is constant-time on the platforms in scope. The bridge's reads of `EphemeralStore` and the ACL may not be constant-time — implementations SHOULD prefer constant-time comparison when reading credentials by context. (The reference Swift implementation does not, currently; tracked as a known limitation.)
11. **Geo-source pollution.** `GeoSource` returns whatever the platform reports. A user running a fake VPN or a coarsened IP-geo source gets coarsened answers. The bridge does not attempt to validate that GPS/CoreLocation/GeoClue's output is "real"; it surfaces accuracy and lets callers degrade gracefully.

---

## 15. Compatibility

- **EBP/1.** BrightLink layers cleanly on top of EBP/1. An EBP/1 client that doesn't speak BrightLink ignores the extra `brightlinkProtocolVersion` field in `VERSION`.
- **Operating systems.** macOS / Apple Silicon is the reference platform. Linux ports are normative through the §6 platform pluggables: `Tpm2BridgeIdentity` + `LinuxPeerAttestation` + `GeoClueGeoSource`. Windows is out of scope for v1.x; a Windows port would land `DpapiBridgeIdentity` (or TPM2 via `tbs.h`), `WindowsPeerAttestation`, and `WindowsLocationServiceGeoSource`.
- **Languages.** The wire is JSON over Unix socket — any language with crypto primitives (AES-GCM, HKDF-SHA256, secp256k1 ECDH, P-256 ECDSA) can implement either side.
- **Architectures.** The reference Swift bridge is Apple Silicon-only because of SEP. The reference TypeScript client and the bsh C module are arch-agnostic; they have been tested on x86_64 Linux and arm64 Linux against the reference Rust bridge (when shipped).

---
---

## Acknowledgements

Built on top of EBP/1 (Enclave Bridge Protocol). Anchors trust in Apple's Secure Enclave (P-256, SEP-resident key, hardware-backed signing). Uses DD-ECIES Basic mode (cipher suite `0x21`) over secp256k1 for the registration envelope. Counter and AEAD constructions follow standard practice for AES-GCM with length-prefixed AAD; nothing novel is claimed there.
