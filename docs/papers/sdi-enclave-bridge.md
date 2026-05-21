---
title: "SDI-EB: Secure Semantic Data Injection over Enclave Bridge (OSC 7777 v3)"
parent: "Papers"
nav_order: 19
---

# SDI-EB: Secure Semantic Data Injection over Enclave Bridge — A Unified Replication-Grade Specification (OSC 7777 v3)

**Authors:** Jessica Mulein
**Status:** Proposal / Draft Standard, replication-grade
**Version:** 3.0 (SDI-EB / OSC 7777 v3)
**Date:** May 2026
**Forked from:** `rfc-sdi-osc7777.md` (v1) and `rfc-sdi-osc7777-v2.md` (v2). Built on top of [Enclave Bridge Protocol (EBP/1)](enclave-bridge-protocol).

> **Relationship to prior versions.** This document is a forked successor to v1 and v2, not a patch. v1 remains valid for any deployment that does not require agent-to-shell traffic. v2 remains valid for deployments that want bidirectional traffic on top of an X25519/HKDF agent. **v3 (this document) makes the SDI agent a thin layer on top of an Enclave Bridge process**, anchoring session establishment to the device's Secure Enclave (Apple Silicon) or to an EBP/1-compatible bridge, and replacing the v1/v2 X25519 handshake with an ECIES-based registration envelope addressed to the bridge's persistent secp256k1 key. All bidirectional-envelope properties of v2 (per-direction counters, AAD-bound `dir_tag`, geographic-context payload type, advisory pre-exec semantics, override helper, BrightDate timestamps) are preserved with byte-for-byte fidelity at the OSC 7777 wire layer; only the registration handshake and the storage of `K_session` change. v1, v2, and v3 sessions are distinguishable on the wire via the registration handshake (§4.2). New implementations should target v3 wherever an Enclave Bridge is available and SHOULD fall back to v2 where it is not.

> **Scope.** SDI-EB covers (a) the SDI transport protocol over OSC 7777, (b) the registration extension to EBP/1 that turns the Enclave Bridge into the SDI agent, (c) every payload type defined by v1 and v2 (`ephemeral-auth`, `db-connection`, `geo-context`), (d) the geographic-context extension with zones, allowlist, audit, presence, advisory pre-exec, and override helper, and (e) integration with the BrightDate / BrightSpace / BrightSpaceTime stack. Earlier drafts split this into two documents; this one merges them so a reader sees one coherent specification with intra-document cross-references.

---

## 1. Abstract

Modern terminal workflows routinely interact with, generate, and process multi-field, highly structured ephemeral data — dynamic test credentials, cloud session authentication elements, complex infrastructure connection contexts, and location fixes that drive zone-aware automation. The protocol layer interfacing terminal emulator tasks with the host operating system has historically been restricted to flat text streaming or unsecured single-value clipboards; v1 and v2 of this RFC introduced an OSC 7777 envelope to fix that, with v2 adding bidirectional traffic and a `geo-context` payload type.

This document — **SDI-EB / OSC 7777 v3** — re-grounds that envelope on the [Enclave Bridge Protocol (EBP/1)](enclave-bridge-protocol). Instead of running an X25519 daemon next to bsh, the SDI agent role is delegated to an EBP/1-compatible bridge (the SwiftUI Enclave Bridge app on macOS Apple Silicon is the reference); the bridge already brokers a host-resident secp256k1 ECIES key and hardware-anchored P-256 signing through Apple's Secure Enclave. v3 reuses that machinery for SDI session establishment, gaining defense-in-depth (hardware-anchored signing of the registration transcript, optional TOTP-gated key export, two-tier on-disk key custody via `SecureEnclaveKeyring`) and shedding a daemon (one socket, one running app, one set of menu-bar controls). All v2 OSC 7777 wire-level guarantees survive: AES-256-GCM with per-direction monotonic counters, AAD-bound direction tag, length-prefixed AAD construction, BrightDate-anchored expiry, replay-window validation, and fail-closed injection. All v2 payload types and the entire geographic-context surface (zones, transitions, advisory pre-exec, override, allowlist, audit, presence) are carried forward unchanged at the user-visible layer.

**Keywords:** OSC 7777, Apple Secure Enclave, ECIES, secp256k1, P-256, AES-256-GCM, HKDF, BrightDate, BrightSpace, terminal protocol, SDI, geo-context, replay protection, advisory enforcement.

---

## 2. The Problem & The Vulnerability Vector

### 2.1 Limitations of the System Clipboard

Passing rich structural schemas (such as a username, password, and seed phrase simultaneously) via the native OS clipboard forces an unideal developer compromise: either concatenating strings into fragile formats, manually copying individual fields iteratively, or leaking sensitive credentials to local background clipboard manager histories.

### 2.2 Terminal Line Hijacking & Rogue Code Execution

Relying on standard unauthenticated Operating System Commands (OSC) to communicate with native desktop applications poses a severe security hazard. If a terminal environment blindly parses and acts upon plaintext escape sequences embedded within standard output, any untrusted asset — such as a malicious repository file evaluated via `cat`, a deceptive git commit log, or an unvetted server Message of the Day (MOTD) — can forge sequences to inject structural data or trigger unintended desktop-agent side-effects.

### 2.3 Daemon Sprawl and Trust Surface

v2 ran SDI traffic through a dedicated `SDIAgent` daemon next to whatever cryptographic services the host already provided. On macOS that meant two long-running user-space services (the SDI agent and the Enclave Bridge) when the bridge already owned all the cryptographic primitives the SDI agent needed. v3 collapses the two: the bridge becomes the SDI agent. The user runs one menu-bar process and grants it one capability surface. Session establishment piggybacks on the bridge's existing public-key surface, so SDI inherits the bridge's hardware anchoring and access-control flags rather than reinventing them.

---

## 3. Architecture Overview

```
┌──────────────────────┐                     ┌──────────────────────────────────┐
│ Terminal emulator    │   PTY (OSC 7777)    │ Enclave Bridge / SDI Agent       │
│  ┌────────────────┐  │  ◄────────────────► │  (SwiftUI menu-bar, Apple        │
│  │ bsh shell +    │  │                     │   Silicon; or compatible impl)   │
│  │ bsh-inject /   │  │                     │                                  │
│  │ bsh-geo /      │  │                     │  ┌────────────────────────────┐  │
│  │ bsh-geo-       │  │                     │  │ EBP/1 surface (§EBP/1):    │  │
│  │ override       │  │                     │  │  HEARTBEAT, GET_PUBLIC_KEY │  │
│  └────────────────┘  │                     │  │  ENCLAVE_SIGN/_DECRYPT,    │  │
└──────────────────────┘                     │  │  ENABLE_TOTP, EXPORT_KEY,  │  │
            ▲ ▲                              │  │  LIST_KEYS …               │  │
            │ │ Unix socket                  │  ├────────────────────────────┤  │
            │ │ (EBP/1 registration          │  │ SDI extensions (§4.5–4.7): │  │
            │ │  envelope, geo socket)       │  │  SDI_REGISTER, SDI_PUSH,   │  │
            │ ▼                              │  │  SDI_GEO_GET / _STATUS /   │  │
            │ ┌────────────────────────────┐ │  │  _REFRESH / _AUDIT         │  │
            └─┤ enclave-bridge-client +    │ │  └────────────────────────────┘  │
              │ SecureEnclaveKeyring       │ │  ┌────────────────────────────┐  │
              └────────────────────────────┘ │  │ TOTPManager, AppState,     │  │
                                             │  │ SocketServer, ECIES,       │  │
                                             │  │ SecureEnclaveKeyManager    │  │
                                             │  └────────────────────────────┘  │
                                             └──────────────────────────────────┘
                                                          │
                                                          ▼
                                                ┌───────────────────────────────┐
                                                │ Apple Secure Enclave (P-256)  │
                                                │ secp256k1 priv (~/.enclave)   │
                                                │ TOTP config (~/.enclave)      │
                                                └───────────────────────────────┘
```

The bridge keeps its EBP/1 command surface unchanged; SDI-EB adds new commands inside that envelope (`SDI_REGISTER`, `SDI_PUSH`, the geo-socket subset). A v3-aware client library MAY expose them through the same `EnclaveBridgeClient` class that already speaks EBP/1, or through a sibling class. v2-only clients keep working against an EBP/1 bridge that doesn't advertise SDI extensions; the bridge merely returns `Unknown command` for unimplemented v3 commands.

---

## 4. Architecture Specification

The Secure SDI standard introduces a distinct decoupled separation between the **Transport Vector** (the PTY text pipeline carrying OSC 7777 sequences) and the **Authentication Control Layer** (an out-of-band IPC handshake to the Enclave Bridge). v3 binds the Authentication Control Layer to EBP/1 — the registration handshake is itself an EBP/1 command pair, encrypted under the bridge's persistent secp256k1 key and signed with the device's Secure Enclave P-256 key.

### 4.1 Out-of-Band Cryptographic Registration

Before any data injection takes place, an interactive shell session registers itself with a localized, user-restricted Enclave Bridge (the v3 SDI agent) running on the host system.

1. **Local Channel.** The bridge hosts an `AF_UNIX`/`SOCK_STREAM` socket exclusively accessible by the local user (filesystem permissions enforced by macOS). The path is discovered by the EBP/1 socket-path-discovery procedure (`enclave-bridge-protocol.md` §2.2): the client tries the sandboxed-app path, the non-sandboxed `~/.enclave/enclave-bridge.sock`, and finally the legacy `/tmp/enclave-bridge.sock` in that order. The bridge's socket is **not** namespaced per shell session; multiple concurrent SDI sessions multiplex on the same socket as separate EBP/1 connections, each holding its own per-connection state (§4.3).

2. **Ephemeral Exchange.** The shell connects to the EBP/1 socket during its initialization phase and performs the `SDI_REGISTER` exchange defined in §4.5. The exchange yields a unique 32-byte session key ($K_{session}$) and a 16-byte transient Session-ID, both bound to the Enclave Bridge's P-256 signature over the registration transcript. The handshake never transmits $K_{session}$ in cleartext: client → bridge contributions arrive inside an ECIES envelope addressed to the bridge's persistent secp256k1 public key (`GET_PUBLIC_KEY`), and the bridge's contribution is returned inside an ECIES envelope addressed to the client's ephemeral secp256k1 key from the same handshake.

3. **Memory Residence.** $K_{session}$ resides strictly within the active memory space of that specific shell process and the bridge. Both ends destroy their copies on session expiry, on agent restart, and on explicit teardown.

4. **Session Expiry.** Sessions have a maximum lifetime of **8 hours** regardless of activity, identical to v1/v2. The bridge MUST refuse to decrypt OSC 7777 sequences for expired sessions (§4.6), MUST refuse to push for expired sessions (§4.7), and MUST log the attempt. Shells that outlive their session must re-register.

5. **Squatting Defense.** The bridge already refuses to start if its primary Unix socket is occupied (EBP/1 §2.1 binds after `unlink(2)`-ing any prior file; SDI-EB additionally requires that the bridge log a fatal error and abort if it observes an unexpected non-socket file at the discovered path). New v3 implementations MUST verify that no file exists at the chosen socket path before binding for the first time after install, and MUST abort with a fatal error rather than overwriting an unexpected file.

6. **No Daemon Plurality.** Unlike v2, no second daemon is run. The Enclave Bridge fulfils the SDI agent role. Implementations targeting platforms without a Secure Enclave SHOULD provide an EBP/1-compatible bridge that uses an OS keyring (e.g. `keytar`, libsecret, DPAPI) for secp256k1 key custody and either a TPM or software signing for the registration transcript; such implementations are still wire-compatible with this RFC at the SDI layer.

### 4.2 Wire-Level Distinguishability of Versions

Three SDI session shapes coexist in the wild:

| Version | Registration transport | HKDF info string | Notes |
| --- | --- | --- | --- |
| v1 | 48-byte raw frame on dedicated socket | `"sdi-session-key"` | Single direction, single counter. |
| v2 | 49-byte raw frame on dedicated socket; first byte `0x01` | `"sdi-session-key-v2"` | Bidirectional, per-direction counters. |
| **v3 (this document)** | EBP/1 `SDI_REGISTER` JSON command (§4.5) | `"sdi-session-key-v3"` | Bidirectional, per-direction counters, ECIES-anchored, P-256-signed transcript. |

v3 sessions are distinguishable on the wire because the registration goes through an EBP/1 command rather than a dedicated raw-binary handshake. A v1 or v2 client MUST NOT speak v3 framing; a v3 client MUST NOT speak v1 or v2 framing. **Mixed-version sessions are not supported.** A v3 bridge that receives a v1 or v2 raw handshake on its EBP/1 socket will fail to parse the bytes as JSON and return `{"error":"Invalid request format"}` (per EBP/1 §4 error envelope), at which point the client SHOULD interpret the rejection as "no v3 here" and either downgrade to v2 against a separate SDI agent or fail closed. A v3 client that receives `{"error":"Unknown command: SDI_REGISTER"}` knows it is talking to an EBP/1 bridge that has not implemented the SDI-EB extension; it MUST then either use only EBP/1 commands (no OSC 7777) or fall back to a v2 SDI agent if one exists.

The HKDF info string `"sdi-session-key-v3"` domain-separates v3 keys from v1 (`"sdi-session-key"`) and v2 (`"sdi-session-key-v2"`) so an accidental version mismatch produces incompatible keys rather than silent cross-version traffic.

### 4.3 Concurrency, Lifetime, and Per-Session State

- A single bridge instance serves multiple concurrent client connections; each connection runs an independent EBP/1 `BridgeProtocolHandler` with its own `peerPublicKey` slot (per EBP/1 §2.3).
- Each client connection MAY register at most one SDI-EB session via `SDI_REGISTER`. Re-issuing `SDI_REGISTER` on the same connection invalidates any prior session bound to that connection (the bridge wipes the prior `K_session` and `Session-ID` from memory) and returns the new identifiers.
- A client connection MAY send EBP/1 commands (e.g. `HEARTBEAT`, `ENCLAVE_SIGN`, `LIST_KEYS`) interleaved with SDI traffic on the same socket. SDI traffic itself uses two paths: the OSC 7777 wire (§4.4) and the bridge-side push command `SDI_PUSH` (§4.7), neither of which clobbers the EBP/1 request/response correlation rules.
- Either side MAY close the connection at any time. The reference client treats EOF as a normal close, fires the `disconnect` event, and (if `autoReconnect` is enabled) schedules an exponential-backoff reconnect (per EBP/1 §8.5). On disconnect, the bridge MUST destroy any `K_session` bound to that connection.
- Bridge restart destroys all SDI sessions. Clients MUST detect the restart (via `ECONNREFUSED` on a queued request, or via missing `HEARTBEAT` responses) and re-register lazily on the next emit attempt. Until re-registration completes, the client MUST treat the session as having no current fix (for `geo-context`) and as unable to emit OSC 7777 sequences.

### 4.4 Rate Limiting

The bridge MUST enforce a rate limit of no more than **10 failed `SDI_REGISTER` attempts per minute per connecting PID**. Exceeding this threshold causes the bridge to close the connection and log a warning. This mitigates local brute-force enumeration of registration parameters. Failed `SDI_PUSH` and OSC 7777 verifications are tracked separately and SHOULD be limited to **30 failures per minute per session**, after which the bridge MUST tear down the session and require re-registration.

### 4.5 The `SDI_REGISTER` EBP/1 Command

This section defines the new EBP/1 command that establishes a v3 SDI session. It plugs into EBP/1 §4 alongside `HEARTBEAT`, `ENCLAVE_SIGN`, etc.

**Purpose.** Establish a fresh `(Session-ID, K_session)` pair bound to the bridge's hardware identity and to the client's ephemeral keypair, deliver `K_session` to the client, and provide the client with a verifiable transcript signature so the client knows it is talking to the same Secure Enclave it expects.

**Request.**

```json
{
  "cmd": "SDI_REGISTER",
  "protocolVersion": 3,
  "clientNonce": "<base64 16 bytes>",
  "envelope":    "<base64 ECIES envelope, see below>"
}
```

| Field | Type | Description |
| --- | --- | --- |
| `protocolVersion` | integer | MUST be `3`. The bridge MUST reject other values with `{"error":"Unsupported SDI protocol version"}`. |
| `clientNonce` | base64-string | 16 cryptographically random bytes generated by the client. Used as part of the HKDF `salt` (§4.5.2). |
| `envelope` | base64-string | An EBP/1-format ECIES envelope (`enclave-bridge-protocol.md` §5.6) addressed to the bridge's persistent secp256k1 public key (the one returned by `GET_PUBLIC_KEY`), encrypting a JSON object whose schema is defined in §4.5.1. The bridge decrypts this envelope using the same internal pathway as `ENCLAVE_DECRYPT`. |

The envelope's plaintext is a JSON object so the client and bridge can extend the registration handshake later without re-issuing a new EBP/1 command.

> **Implementation note — two HKDF invocations.** Registration involves **two independent HKDF-SHA256 calls** with **different info strings**, and these are the most common source of porting bugs. Both ends MUST use the exact UTF-8 byte values shown:
>
> 1. **Outer envelope key derivation** (the ECIES key that protects the §4.5.1 plaintext on the wire): `info = "ecies-v2-key-derivation"` (23 bytes), `salt = empty`, per EBP/1 §5.3 and matching `@digitaldefiance/ecies-lib` / `@digitaldefiance/node-ecies-lib` byte-for-byte. Any divergence here — including UTF-8 encoding mistakes, accidental NUL termination, an extra/missing hyphen, or use of `"v1"` instead of `"v2"` — causes the bridge to derive a different AES-256-GCM key and `ENCLAVE_DECRYPT` returns `{"error":"Decryption failed"}` with no further diagnostic, even though the rest of the request looks valid.
> 2. **Session-key derivation** (the AES-256-GCM key that protects subsequent OSC 7777 traffic): `info = "sdi-session-key-v3"` (18 bytes), `salt = clientNonce ‖ sessionId`, per §4.5.2 below. This MUST be `"sdi-session-key-v3"` with no version-byte mistake; v1 and v2 used `"sdi-session-key"` and `"sdi-session-key-v2"` respectively (see §4.2 and Appendix B.2), so a copy-paste from a v2 implementation will derive a different key and every OSC 7777 sequence will fail GCM tag verification at the receiver.
>
> A useful self-check: byte-dump the `info` argument as the implementation passes it to `HKDF.deriveKey` and compare to the literal `b"ecies-v2-key-derivation"` (`65 63 69 65 73 2D 76 32 2D 6B 65 79 2D 64 65 72 69 76 61 74 69 6F 6E`) and `b"sdi-session-key-v3"` (`73 64 69 2D 73 65 73 73 69 6F 6E 2D 6B 65 79 2D 76 33`). Cross-implementation interop tests SHOULD include a known-answer vector for each derivation so a divergence is caught at CI rather than at first real registration attempt.

#### 4.5.0 Pinning to DD-ECIES (Normative)

The outer envelope used by `SDI_REGISTER` MUST be byte-identical to what the **DD-ECIES** specification (`DD-ECIES-SPEC-v1.0`, the canonical specification of `@digitaldefiance/ecies-lib` and `@digitaldefiance/node-ecies-lib`) defines for **Basic mode** (encryption type `0x21`, version `0x01`, cipher suite `0x01 = Secp256k1_Aes256Gcm_Sha256`). A v3 implementation that builds an envelope from scratch (rather than calling the library) MUST replicate every byte of the format below; a single-byte deviation will fail to decrypt and produce no useful diagnostic on the bridge side.

The DD-ECIES specification is the single authoritative source for the outer envelope. This section restates the values that affect SDI-EB so a replicator can avoid round-tripping through the larger document, but DD-ECIES wins on every disagreement (see "Conflict resolution" at the end of this subsection).

**Cryptographic parameters (DD-ECIES §5, §8, §9):**

| Parameter | Value | DD-ECIES section |
| --- | --- | --- |
| Curve | secp256k1 (SEC 2 §2.4.1) | §5.1 |
| Symmetric algorithm | AES-256-GCM | §9.1 |
| Symmetric key size | 32 bytes (256 bits) | §9.1 |
| IV size | **12 bytes** | §9.2 |
| Auth tag size | 16 bytes | §9.3 |
| HKDF hash | SHA-256 | §8.2 |
| HKDF salt | **empty** (`new Uint8Array(0)` / `Buffer.alloc(0)`) | §8.2 |
| HKDF info | `b"ecies-v2-key-derivation"` (23 bytes UTF-8) | §8.2 |
| HKDF output length | 32 bytes | §8.2 |
| ECDH shared-secret representation fed to HKDF | **32-byte x-coordinate** of the shared point (the `0x04` uncompressed prefix and the y-coordinate are stripped before HKDF) | §8.1 |

**Wire-format constants (DD-ECIES §5, §10, §17):**

| Constant | Value | DD-ECIES section |
| --- | --- | --- |
| Public key length on the wire | **33 bytes (compressed)**, prefix `0x02` or `0x03` | §5.2, §10.2.3 |
| Version byte | `0x01` (the only registered version) | §17.1 |
| Cipher-suite byte | `0x01` (`Secp256k1_Aes256Gcm_Sha256`, the only registered suite) | §17.2 |
| Encryption type — Basic | `0x21` (decimal 33) | §17.3, §10.2 |
| Encryption type — WithLength | `0x42` (decimal 66) | §17.3, §10.3 |
| Encryption type — Multiple | `0x63` (decimal 99) | §17.3, §11 |
| Basic-mode fixed overhead | 64 bytes | §10.2.4 |
| WithLength-mode fixed overhead | 72 bytes | §10.3.5 |

**Backward-compat acceptance (DD-ECIES §5.3) — decoders only.** A DD-ECIES-conformant **decoder** MUST accept ephemeral keys in 33-byte compressed (canonical), 65-byte uncompressed, or 64-byte raw form, and MUST normalize them to 33-byte compressed before any cryptographic operation. **Senders, including SDI-EB clients, MUST emit only the 33-byte compressed canonical form.** This means the `SDI_REGISTER` outer envelope as transmitted contains exactly 33 ephemeral-key bytes; the 64- and 65-byte variants exist only as legacy inputs a decoder must tolerate, never as an output a sender may produce.

**Basic-mode wire format (the form `SDI_REGISTER` uses):**

```
Offset  Size  Field
------  ----  -----------------------------------------------------------
0       1     version            (0x01)
1       1     cipherSuite        (0x01)
2       1     encryptionType     (0x21 for Basic)
3       33    ephemeralPublicKey (33-byte compressed; first byte 0x02 or 0x03)
36      12    iv                 (12 bytes, random per envelope, from CSPRNG)
48      16    authTag            (AES-256-GCM 16-byte tag)
64      …     ciphertext         (length = total envelope length − 64)
```

Total fixed overhead: **64 bytes**. Implementations MUST NOT emit a 65-byte uncompressed ephemeral key in this envelope.

**AAD construction (DD-ECIES §10.2.5; matches `single-recipient.ts:97–116`):**

```
AAD = preamble ‖ versionByte ‖ cipherSuiteByte ‖ encryptionTypeByte ‖ ephemeralPublicKey
```

Where:

- `preamble` is a zero-length `Uint8Array` for v3 `SDI_REGISTER` envelopes. SDI-EB does not exercise the DD-ECIES preamble facility; implementations MUST set `preamble = empty`.
- The four single-byte fields are appended in the order shown.
- `ephemeralPublicKey` is exactly the 33 bytes that appear on the wire at offset 3.

The AES-256-GCM AEAD is then invoked with `key = K`, `iv = iv`, `aad = AAD`, where:

```
ECDH_x32 = ECDH(d_e, Q_bridge)            // 32-byte x-coordinate of shared point
K        = HKDF-SHA256(IKM = ECDH_x32,
                       salt = empty,
                       info = "ecies-v2-key-derivation",
                       L = 32)
```

Both ends produce the same 32-byte key only if they agree on every parameter. In particular, the IV must be **12 bytes** (Web Crypto's `AES-GCM` default and Node's `crypto.createCipheriv('aes-256-gcm', ...)` 12-byte nonce match); a 16-byte IV will fail GCM tag verification with no useful diagnostic.

**WithLength and Multiple modes are not used by `SDI_REGISTER`.** They are defined by DD-ECIES §10.3 and §11 respectively and may be used by other layers (e.g. the `SecureEnclaveKeyring` consumer in EBP/1 §9 may store payloads in WithLength mode). `SDI_REGISTER` envelopes MUST be Basic mode (`0x21`); a bridge that receives a WithLength or Multiple envelope inside `SDI_REGISTER` MUST return `{"error":"Decryption failed"}` after AES-GCM tag verification fails, or, if the bridge wants to be more helpful, MAY return `{"error":"Invalid envelope plaintext"}` after detecting the wrong type byte before attempting decrypt.

**Reproducible interop test vector (from DD-ECIES §18.6).** A conforming SDI-EB sender that uses the following deterministic inputs MUST produce a 94-byte Basic-mode envelope that decrypts to the literal plaintext `DD-ECIES test vector plaintext`:

```
recipientPubHex   = 02dc286c821c7490afbe20a79d13123b9f41f3d7ef21e4a9caacd22f5983b28eca
ephemeralPrivHex  = bc4313f0c6e23ae0366e40d80387f49a2e4f64069dcb5a447f22dabefb79dc2f
ephemeralPubHex   = 02fbb6f2f3ee200f9cd9f33b86e7de3412eb9aee09f6b10709a595f5ede231494b
ivHex             = 31fe1b062e5639622cfc0439

Expected wire (94 bytes):
01012102fbb6f2f3ee200f9cd9f33b86e7de3412eb9aee09f6b10709a595f5ede231494b
31fe1b062e5639622cfc0439e6dbf735d3ef9a4235d5513f9e8829cef3c70450f1ac074e
93508eb3caed91a900ebc463d4eaa78c4c56389f36ee
```

CI for any from-scratch SDI-EB implementation SHOULD include this test vector as a known-answer test for the outer envelope, alongside the second HKDF derivation's vector (built from `clientShare`, `bridgeShare`, `clientNonce`, and `sessionId` by the implementation under test).

**Conflict resolution.**

1. If this paper and DD-ECIES disagree on any wire-level value, **DD-ECIES wins**. File a bug against this document.
2. If DD-ECIES and the live `ecies-lib` source disagree, **the source wins** and DD-ECIES is the bug to fix.
3. The constants binding SDI-EB are: `IV_SIZE = 12`, `AUTH_TAG_SIZE = 16`, `PUBLIC_KEY_LENGTH = 33` on the wire (decoders accept 33/65/64 inputs per DD-ECIES §5.3 but normalize to 33 before crypto), `SYMMETRIC.KEY_SIZE = 32`, `BASIC.FIXED_OVERHEAD_SIZE = 64`, `info = "ecies-v2-key-derivation"`, version `0x01`, cipher suite `0x01`, type `0x21`.

> **Source-comment caveat.** As of the time this RFC was written, `ecies-lib/src/constants.ts` lines 192, 200, and 208 contain inline comments that read `// ... + IV (16) + auth tag (16)`. The IV-size figure in those comments is **wrong** (the actual `expectedBasicOverhead` computation just above uses `ECIES_IV_SIZE = 12`, and the totals add up to 64 = `1+1+1+33+12+16` only when IV = 12). The DD-ECIES specification, the live runtime behaviour, and SDI-EB all agree on **12-byte IV**; the source comments are scheduled to be corrected. Replicators who read the source comments rather than the spec MUST trust the spec.

#### 4.5.1 Envelope Plaintext Schema

```json
{
  "v": 3,
  "clientPub":   "<base64 65-byte uncompressed secp256k1>",
  "clientShare": "<base64 32 bytes>",
  "issuedAtBd":  9626.531421,
  "ttlSeconds":  28800,
  "agent": {
    "name":    "bsh",
    "version": "1.4.2",
    "platform":"darwin-arm64"
  }
}
```

| Field | Notes |
| --- | --- |
| `v` | MUST equal `3`. |
| `clientPub` | The client's **ephemeral** secp256k1 public key (uncompressed, 65 bytes). This is independent of the ephemeral key used inside the ECIES envelope itself. The bridge will use this key as the recipient when ECIES-encrypting its half of the handshake (see §4.5.3). |
| `clientShare` | 32 cryptographically random bytes generated by the client. Used as half of the input keying material to HKDF (§4.5.2). |
| `issuedAtBd` | BrightDate scalar (days since J2000.0), produced by the client's clock. The bridge MUST reject sessions whose `issuedAtBd` is more than 60 seconds in the future (a defence against rolled-back clocks; the in-the-past direction is bounded only by `ttlSeconds`, since a stale registration is equivalent to a fresh one with a short `ttlSeconds`). |
| `ttlSeconds` | Requested session lifetime. The bridge MUST cap this at 28 800 seconds (8 h) and MAY cap lower. The actual lifetime is communicated back in the bridge's response. |
| `agent.{name,version,platform}` | Free-form strings identifying the client. Recorded in the bridge audit log. Maximum 64 chars each. |

#### 4.5.2 Session-Key Derivation

The bridge generates a 32-byte `bridgeShare` from `SecRandomCopyBytes`, a 16-byte `sessionId`, and an 8-byte counter `bridgeIssuedAtUnix` (Unix seconds, big-endian). The session key is then derived bilaterally:

```
IKM   = clientShare || bridgeShare                      # 64 bytes
salt  = clientNonce || sessionId                         # 32 bytes
info  = b"sdi-session-key-v3"                            # 18 bytes (UTF-8)
K_session = HKDF-SHA256(IKM = IKM, salt = salt, info = info, L = 32)
```

The use of HKDF here is identical in spirit to v1/v2 but the IKM is the concatenation of two random shares (not the X25519 ECDH point) and the HKDF `salt` includes both the client nonce and the bridge-generated `sessionId`. Cross-version reuse of `K_session` between v1/v2 and v3 is prevented by the `info` string difference and by the salt structure.

The bilateral-share construction means:

- An attacker who learns only `clientShare` (e.g. by compromising the client process before the envelope is sent) still cannot derive `K_session` without also learning `bridgeShare`.
- An attacker who learns only `bridgeShare` (e.g. by compromising the bridge process after envelope decryption) still cannot derive `K_session` without also learning `clientShare`.
- The bridge's secp256k1 private key (used to decrypt the registration envelope) is in a separate trust domain from the SEP P-256 key (used to sign the transcript). A compromise of one does not enable forging both halves of the handshake.

#### 4.5.3 Bridge Response

The bridge returns an EBP/1 success envelope:

```json
{
  "ok": true,
  "sessionId":         "<base64 16 bytes>",
  "bridgeIssuedAtUnix": 1747800000,
  "ttlSeconds":         28800,
  "responseEnvelope":  "<base64 ECIES envelope, see below>",
  "transcriptSig":     "<base64 DER ECDSA signature over P-256>"
}
```

| Field | Notes |
| --- | --- |
| `sessionId` | The 16-byte session identifier the client will encode in the OSC 7777 wire. Generated fresh by the bridge. |
| `bridgeIssuedAtUnix` | Bridge's clock at issue time. Unix seconds. Used by the client to detect clock skew. |
| `ttlSeconds` | The actual session lifetime granted (≤ requested, ≤ 28 800). |
| `responseEnvelope` | ECIES envelope addressed to `clientPub` (from §4.5.1). The plaintext is `bridgeShare` (raw 32 bytes). The client decrypts using its ephemeral secp256k1 private key — the same key it included as `clientPub`. |
| `transcriptSig` | DER-encoded ECDSA signature, produced by the bridge's Secure Enclave P-256 key (`SecureEnclaveKeyManager.sign`), over the canonical transcript bytes defined below. The client MUST verify this signature against the bridge's SEP public key (`GET_ENCLAVE_PUBLIC_KEY`) before accepting the session. |

The **canonical transcript** to be hashed-then-signed is the concatenation:

```
T = "SDI-EB v3 transcript\0"                            # 21 bytes (NUL-terminated literal)
 || LE32(len(clientNonce))   || clientNonce             # 4 + 16 = 20 bytes
 || LE32(len(clientPub))     || clientPub               # 4 + 65 = 69 bytes
 || LE32(len(clientShare))   || clientShare             # 4 + 32 = 36 bytes
 || LE32(len(sessionId))     || sessionId               # 4 + 16 = 20 bytes
 || LE32(len(bridgeShare))   || bridgeShare             # 4 + 32 = 36 bytes
 || LE32(8)                  || u64_be(issuedAtBd*86400) # 4 + 8 = 12 bytes
                              # issuedAtBd is rounded to nearest second
 || LE32(8)                  || u64_be(bridgeIssuedAtUnix) # 4 + 8 = 12 bytes
 || LE32(4)                  || u32_be(ttlSeconds)      # 4 + 4 = 8 bytes
```

Total: 234 bytes. `LE32(n)` is a 4-byte little-endian length prefix (matching the AAD-construction convention of v2 §3.4). `u64_be` and `u32_be` are big-endian unsigned integers.

The bridge passes `T` to `ENCLAVE_SIGN` (which internally SHA-256-hashes and signs with the SEP P-256 key, per EBP/1 §4.9). The client verifies the resulting DER signature against the SEP public key it has previously cached (or fetches via `GET_ENCLAVE_PUBLIC_KEY` and trust-on-first-use pins; see §4.5.5). On signature failure the client MUST destroy `K_session`, treat the registration as failed, and emit a security event to its local log.

#### 4.5.4 Client-Side Procedure

A v3 client implements the following `SDI_REGISTER` flow:

1. Discover and connect to the bridge socket (EBP/1 §2.2).
2. Verify the bridge is responsive: `HEARTBEAT` SHOULD succeed.
3. Fetch the bridge's persistent secp256k1 public key: `GET_PUBLIC_KEY`. Cache.
4. Fetch (or use a previously-pinned) Secure Enclave P-256 public key: `GET_ENCLAVE_PUBLIC_KEY`.
5. Generate `clientNonce` (16 random bytes), `clientShare` (32 random bytes), and an ephemeral secp256k1 keypair `(d_c, Q_c)`.
6. Build the §4.5.1 plaintext object. ECIES-encrypt it (Basic mode, `0x21`) to the bridge's persistent secp256k1 public key using `node-ecies-lib` (or any binary-compatible implementation).
7. Send the `SDI_REGISTER` request with `protocolVersion: 3`, `clientNonce`, and `envelope`.
8. On success response: ECIES-decrypt `responseEnvelope` using `d_c` to recover `bridgeShare` (32 bytes).
9. Compute `K_session` via the §4.5.2 derivation.
10. Reconstruct the transcript `T` using the values it sent and the values returned. Compute SHA-256 over `T` (the SEP signs the SHA-256 of input, so the verifier hashes too — see EBP/1 §4.9 caveat). Verify `transcriptSig` against the cached SEP public key.
11. On verification success, store `(sessionId, K_session, expiresAtUnix = bridgeIssuedAtUnix + ttlSeconds)` and zeroize `clientShare`, `bridgeShare`, `d_c`. The client MUST also zeroize the plaintext of the request envelope.
12. Begin emitting OSC 7777 sequences (§4.6) and listening for `SDI_PUSH`-relayed pushes (§4.7).

#### 4.5.5 Trust on First Use vs Pinning the SEP Key

The bridge's SEP P-256 key is stable for the lifetime of the device user. Clients SHOULD pin the public key on first registration and refuse to register if the public key changes thereafter (TOFU + pinning). Implementations MAY surface a UI prompt when the SEP key first appears or when it changes, similar to OpenSSH's host-key prompts.

If the client cannot pin (e.g. running ephemerally in CI), it MUST verify `transcriptSig` is well-formed but MAY accept any SEP key returned by `GET_ENCLAVE_PUBLIC_KEY`. Clients running in this mode MUST log this fact and SHOULD warn the user, because such a client cannot distinguish a real bridge from an impostor that has compromised the local user account and is running its own bridge against a spoofed socket path.

#### 4.5.6 Errors

| Error | Condition |
| --- | --- |
| `{"error":"Unsupported SDI protocol version"}` | `protocolVersion` ≠ 3. |
| `{"error":"Missing clientNonce"}` | `clientNonce` missing or not Base64-decodable to 16 bytes. |
| `{"error":"Missing envelope"}` | `envelope` missing or not Base64-decodable. |
| `{"error":"Decryption failed"}` | Envelope ECIES decryption failed (same as `ENCLAVE_DECRYPT` failure, EBP/1 §4.10). |
| `{"error":"Invalid envelope plaintext"}` | Plaintext failed JSON parse or schema validation. |
| `{"error":"Stale registration"}` | `issuedAtBd` was more than 60 seconds in the future of the bridge clock. |
| `{"error":"Session limit exceeded"}` | The bridge has hit its concurrent-session ceiling (default: 64). |

### 4.6 OSC 7777 Wire Format (Identical to v2 §3.3)

When a utility or process inside the shell wants to broadcast structured semantic data, or when the bridge wants to push state to a registered shell, the sender wraps the payload in an encrypted OSC 7777 macro structure. **The wire encoding is byte-for-byte identical to v2** so existing terminal emulators and middleware that already understand v2 OSC 7777 require no changes.

```
\e]7777;<session-id-hex>;<base64-counter>;<type>;<base64-context>;<base64-nonce>;<base64-ciphertext>;<base64-auth-tag>\a
```

| Field | Encoding | Description |
| --- | --- | --- |
| `session-id-hex` | 32-char lowercase hex | Maps the sequence to a registered v3 session key. The 16-byte raw `sessionId` returned by `SDI_REGISTER` is encoded as 32 lowercase hex characters. |
| `base64-counter` | standard Base64 | 8-byte big-endian unsigned monotonic sequence counter (per direction; see §4.6.3). |
| `type` | plaintext ASCII | Payload schema identifier (e.g. `ephemeral-auth`, `db-connection`, `geo-context`). |
| `base64-context` | standard Base64 | Routing context (e.g. API URL, zone name); Base64 to avoid semicolon collisions. |
| `base64-nonce` | standard Base64 | 12-byte AES-GCM initialization vector. |
| `base64-ciphertext` | standard Base64 | AES-256-GCM encrypted JSON payload. |
| `base64-auth-tag` | standard Base64 | 16-byte GCM authentication tag. |

`\a` (BEL, 0x07) is the sequence terminator. Direction is **not encoded on the wire**; it is determined by the receiver (§4.6.1).

#### 4.6.1 Direction Determination

A sequence read from stdin / PTY input is `Agent → Shell` (`dir_tag = 0x02`). A sequence read from PTY stdout by the bridge (via the terminal emulator's relay) is `Shell → Agent` (`dir_tag = 0x01`). The receiver knows which direction it is reading and uses the corresponding `dir_tag` for AAD reconstruction during decryption. An attacker replaying a captured sequence cannot move it between directions because the receiver always uses its own direction tag, and a tag mismatch causes GCM authentication to fail.

> **Note on `type` field confidentiality.** The `type` field is transmitted in plaintext and will be visible to any observer of the PTY stream (e.g. terminal recordings, log captures). Implementations that consider the payload schema identifier sensitive SHOULD use a generic `type` value (e.g. `sdi-payload`) and encode the true type inside the encrypted JSON body.

#### 4.6.2 Additional Authenticated Data (AAD)

The `dir_tag`, `counter`, `type`, and `context` values are bound into the AES-256-GCM authentication tag as Additional Authenticated Data. The AAD MUST be constructed using length-prefixed encoding to prevent boundary confusion attacks:

$$\text{AAD} = \text{LE32}(1) \mathbin\| \mathit{dir\_tag} \mathbin\| \text{LE32}(\text{len}(\mathit{counter\_bytes})) \mathbin\| \mathit{counter\_bytes} \mathbin\| \text{LE32}(\text{len}(\mathit{type\_bytes})) \mathbin\| \mathit{type\_bytes} \mathbin\| \text{LE32}(\text{len}(\mathit{context\_bytes})) \mathbin\| \mathit{context\_bytes}$$

where:

- `LE32(n)` is a 4-byte little-endian encoding of `n`.
- `dir_tag` is a single byte: `0x01` for Shell → Agent, `0x02` for Agent → Shell. The leading `LE32(1)` is the length prefix of the `dir_tag` field, kept for symmetry with the rest of the length-prefixed scheme.
- `counter_bytes` is the raw 8-byte big-endian counter from the appropriate direction (§4.6.3).
- `type_bytes` is the UTF-8 encoding of the type string.
- `context_bytes` is the raw decoded bytes of the Base64 context field.

The receiver supplies all four values during decryption. If `type` or `context` is empty, its length prefix is `LE32(0)` and it contributes zero payload bytes (the length prefix itself is still included). `dir_tag` and `counter_bytes` are never absent.

This construction ensures that a captured ciphertext cannot be replayed under a different direction, type, context, or counter value even if `K_session` were somehow extracted.

#### 4.6.3 Replay Protection via Per-Direction Monotonic Counters

Each session maintains **two** independent monotonic counters, one per direction:

- `c_shell_to_agent` — incremented by the shell on every emit; validated by the bridge on receive.
- `c_agent_to_shell` — incremented by the bridge on every emit; validated by the shell on receive.

Both initialize to `0` at registration. The wire encoding (8-byte big-endian unsigned, base64) is unchanged from v2; only the per-side bookkeeping splits.

Each side MUST track:

1. Its own outbound counter for the direction it emits in (used to fill `counter_bytes` on emit, incremented by 1 per emit).
2. The highest accepted counter for the direction it receives from (used for replay-window validation).

On receipt, the receiver:

- Reconstructs AAD using its receiving direction's `dir_tag` (§4.6.2).
- Verifies the GCM authentication tag.
- If verification succeeds, applies the replay window: accepts counters in `(last_accepted + 0, last_accepted + 1000]` (i.e. strictly greater than `last_accepted`, up to a tolerance of 1000 to allow out-of-order delivery in pipelines). Rejects any counter at or below `last_accepted`, or beyond the window.
- Logs all replayed or out-of-window counter values as security events.

Because direction is bound into AAD, a captured Shell→Agent sequence cannot be replayed as Agent→Shell or vice versa: GCM tag verification fails on the wrong-direction reconstruction. The two counter namespaces are therefore independent and never collide.

This prevents replay of any captured OSC 7777 sequence in either direction, even within an active session.

### 4.7 The `SDI_PUSH` EBP/1 Command (Bridge → Shell Channel)

The bridge cannot write to the PTY directly without help from the terminal emulator: macOS does not give an arbitrary background process the file descriptor of a foreground shell's controlling terminal. v2 sidestepped this by assuming a deeply integrated terminal-emulator API. v3 makes the relay explicit and brings it into the EBP/1 surface as a **client-pulled push channel**.

The mechanism: the client opens a long-lived "push subscription" by calling `SDI_PUSH` with `op="subscribe"`. The bridge holds the connection open and writes one EBP/1 response per push event. Each event carries a fully-formed OSC 7777 sequence (encrypted under `K_session` with the `Agent → Shell` direction tag) that the client emits to its own PTY (`/dev/tty`). To the terminal emulator, the sequence is indistinguishable from one the shell itself emitted.

#### 4.7.1 Subscribe Request

```json
{
  "cmd":      "SDI_PUSH",
  "op":       "subscribe",
  "sessionId":"<base64 16 bytes>"
}
```

The bridge MUST verify that `sessionId` is bound to the connection issuing this command. If not, return `{"error":"Session not registered on this connection"}`.

#### 4.7.2 Push Event Frame

For each push event the bridge wishes to deliver, it writes a JSON object:

```json
{
  "ok":        true,
  "event":     "push",
  "sequence":  "\u001b]7777;<session-id-hex>;...\u0007"
}
```

`sequence` is the complete OSC 7777 wire string with proper escapes (`\u001b` for `\e`, `\u0007` for `\a`). The client unescapes and writes the resulting bytes to `/dev/tty` (not stdout — see EBP/1 §4.6 reasoning, mirrored in v2 §3.6). The terminal emulator then forwards the sequence in-band to anything reading the user's terminal output.

The client MUST NOT attempt to interpret `sequence` itself; it is opaque ciphertext destined for the application layer that owns the OSC 7777 dispatch (typically the shell's own input parser). The shell parses the sequence, decrypts it under `K_session`, and routes the plaintext payload to the appropriate handler.

#### 4.7.3 Unsubscribe / Teardown

To stop the push subscription, the client closes the connection. The bridge releases the per-session push queue and stops generating events for that session. Re-subscription is a fresh `SDI_PUSH` with `op="subscribe"` on the same or a new connection bound to the same `sessionId`.

The client MAY also send `{"cmd":"SDI_PUSH","op":"unsubscribe","sessionId":"..."}` to release the subscription without closing the connection (e.g. if the same connection is hosting other long-lived EBP/1 traffic). The bridge MUST respond with `{"ok":true}` and stop emitting push events for that session on that connection.

#### 4.7.4 Errors

| Error | Condition |
| --- | --- |
| `{"error":"Session not registered on this connection"}` | `sessionId` not associated with this connection. |
| `{"error":"Session expired"}` | Session has aged past `expiresAtUnix`. |
| `{"error":"Push subscription already active"}` | Connection already has an active push subscription. |
| `{"error":"Unknown op"}` | `op` not `"subscribe"` or `"unsubscribe"`. |

### 4.8 Injection Interface (Identical to v2 §3.6, with Bridge-Specific Wording)

The reference shell (`bsh`) exposes a builtin `bsh-inject` that implements the full encrypt-and-emit pipeline:

```
bsh-inject --type <type> --context <url>
```

The JSON payload is read from **stdin**. The builtin performs lazy session initialisation (§4.5 if not already registered with the bridge), increments the session counter, encrypts with `K_session`, and writes the OSC 7777 sequence **directly to `/dev/tty`** rather than stdout. This ensures the sequence reaches the terminal emulator regardless of how the caller has redirected stdout, and prevents the ciphertext from being accidentally written to files, pipes, or logs.

If stdout emission is explicitly required (e.g. for testing or piping to a custom terminal), the flag `--emit-stdout` may be passed to override this behavior. Callers using `--emit-stdout` are responsible for ensuring the sequence reaches a terminal emulator and not a log sink.

**Bridge failure behavior.** If the Enclave Bridge is unavailable (no socket discovered per EBP/1 §2.2), or `SDI_REGISTER` fails for any reason, or the session has expired and re-registration fails, `bsh-inject` MUST fail closed — it prints an error to stderr and exits non-zero. It MUST NOT fall back to emitting plaintext or unencrypted OSC sequences.

**Bridge-restart resilience.** Because the bridge restart destroys all `K_session` instances, `bsh-inject` MUST detect a stale-session error (decryption failure on the first emit attempt after a long gap, or an `ECONNREFUSED` on the persistent push subscription) and re-register transparently before retrying the emit. The retry MUST NOT loop indefinitely; after one re-registration attempt, persistent failure MUST exit non-zero with a clear stderr message.


---

## 5. Standardized Payload Schemas

To maintain universal compatibility across browser extensions, form fillers, and desktop application management panels, payloads must adhere to predictable, strongly-typed semantic JSON specifications. v3 carries forward the v1/v2 payload set unchanged at the schema level; the only differences are (a) authoritative timestamps now use BrightDate scalars where they cross the bridge boundary (matching `geo-context`), and (b) replay validation references both the `issued_at` field inside the payload and the `counter` field on the wire.

Three payload types are defined by this RFC: `ephemeral-auth` (§5.1), `db-connection` (§5.2), and `geo-context` (§5.3). Implementations MAY define additional payload types under their own namespace; consumers MUST ignore unknown types and SHOULD log them at debug level.

### 5.1 `ephemeral-auth`

Targeted at seeding short-lived accounts, hotseat multiplayer testing matrices, and web environment login flows.

```json
{
  "type": "ephemeral-auth",
  "context": "http://localhost:3005",
  "ttl": 300,
  "issued_at": 1748000000,
  "data": {
    "username": "player1",
    "password": "TemporarySecurePassword123!",
    "email": "player1@localhost.localdomain",
    "additional_fields": {
      "mnemonic": "fury appear bargain good coin load tattoo object convince render soft inside..."
    }
  }
}
```

### 5.2 `db-connection`

Targeted at dynamically focusing or pre-configuring native desktop graphic database viewers straight from an active terminal workspace context.

```json
{
  "type": "db-connection",
  "context": "development-cluster-alpha",
  "ttl": 60,
  "issued_at": 1748000000,
  "data": {
    "engine": "postgresql",
    "host": "127.0.0.1",
    "port": 5432,
    "user": "db_admin",
    "pass": "ephemeral_token_string"
  }
}
```

**Schema notes for `ephemeral-auth` and `db-connection`:**

- The `issued_at` field (Unix timestamp, seconds) is **required** in all payload schemas. Bridges MUST reject payloads whose `issued_at` is more than `ttl` seconds in the past, or more than 60 seconds in the future, as an additional defense-in-depth layer against replayed payloads that bypass counter validation.
- The `ttl` field specifies the maximum lifetime of the decrypted state in the bridge's memory. Bridges MUST purge decrypted state after `ttl` seconds regardless of other conditions.
- v3-specific addition: implementations MAY include a parallel `issued_at_bd` field carrying the same instant as a BrightDate scalar, for consumers that integrate with the BrightDate stack. When both are present and disagree by more than 2 seconds, the bridge MUST log a warning and SHOULD reject the payload.

### 5.3 `geo-context`

A bidirectional payload type carrying location fixes from the bridge (push, on zone transitions and `command_jit` triggers — see §6 and §10) and queries / acknowledgements from the shell. Unlike `ephemeral-auth` and `db-connection`, `geo-context` introduces additional machinery — zone definitions, an authorization socket for child processes, advisory pre-exec semantics, and audit logging — defined in §6 through §10.

`geo-context` uses BrightDate scalars for timestamps (not Unix epoch), exposes coordinates in three forms (geodetic / BrightSpace ECEF / BrightSpaceTime) with the geodetic form treated as the canonical input from the host OS, and is the first SDI payload type to require agent-to-shell pushes — i.e. the first user of the bidirectional envelope (§4.6) and of `SDI_PUSH` (§4.7).

#### 5.3.1 Plaintext Payload Schema (Success)

The plaintext (post-decryption) payload is JSON. The wire format mirrors the Rust struct names from `brightdate::geodesy` and `brightdate::relativity` so a Rust consumer MAY deserialize the relevant blocks directly.

```json
{
  "type": "geo-context",
  "context": "system-gps",
  "issued_at_bd": 9626.531421,
  "expires_at_bd": 9626.534893,
  "ttl_seconds": 300,

  "zones_entered": ["office"],
  "zones_exited":  [],

  "geodetic":  { "latitude": 47.3073, "longitude": -122.2285, "altitude": 64.2 },
  "ecef":      { "x": -2294592.1, "y": -3624318.9, "z": 4665842.4 },
  "spacetime": { "t": 831492283.7, "x": -7.6541e-3, "y": -1.2095e-2, "z": 1.5568e-2 },

  "altitude_assumed": false,

  "accuracy_metres": 15.0,
  "provenance": "hardware",
  "user_presence": true
}
```

**Field-by-field:**

| Field | Type | Units | Notes |
| --- | --- | --- | --- |
| `issued_at_bd` | f64 | BrightDate days since J2000.0 | Set by the bridge at emit time using its monotonic clock. Authoritative absolute timestamp for audit/log consumers. |
| `expires_at_bd` | f64 | BrightDate days since J2000.0 | Bridge stops accepting / serving this fix after this instant. |
| `ttl_seconds` | u32 | SI seconds | Convenience; equals `(expires_at_bd − issued_at_bd) × SECONDS_PER_DAY`. |
| `zones_entered` / `zones_exited` | array of string | — | Names of zones the user transitioned into/out of since the previous fix. Empty array if no transition. Zone names are matched against `~/.config/bsh/geo-zones` (§6.1). |
| `geodetic.latitude` / `.longitude` / `.altitude` | f64 | degrees, degrees, metres (WGS84 ellipsoidal) | Mirrors `brightdate::geodesy::GeodeticCoordinate`. `altitude` MAY be `null` when the OS does not report altitude. |
| `ecef.x` / `.y` / `.z` | f64 | metres | Mirrors `brightdate::geodesy::EcefCoordinate`. Computed from `geodetic` via `geodetic_to_ecef`. |
| `spacetime.t` | f64 | **Bright-Seconds since J2000.0** | Equals `issued_at_bd × SECONDS_PER_DAY`. Mirrors the `t` field of `brightdate::relativity::SpacetimeEvent`. |
| `spacetime.x` / `.y` / `.z` | f64 | **BrightMeters** | Computed as `ecef.{x,y,z} / BRIGHT_METER_M`. Mirrors `SpacetimeEvent.{x,y,z}`. Earth-scale ECEF compresses to small fractions of a BrightMeter; this is correct and intentional for c=1 work. |
| `altitude_assumed` | bool | — | `true` iff the OS did not report altitude and the bridge substituted `altitude = 0` (WGS84 ellipsoid surface) before computing `ecef` and `spacetime`. Consumers that care about Z accuracy MUST inspect this. |
| `accuracy_metres` | f64 | metres | Horizontal accuracy as reported by the OS. |
| `provenance` | enum | — | `"hardware"` (GPS/Cellular) or `"network"` (Wi-Fi/IP heuristics). |
| `user_presence` | bool | — | `true` if the bridge verified active user presence (biometric API or strict idle-time check) during this fix; `false` otherwise. See §10.3. |

**Canonical input.** The bridge receives geodetic from the host OS location service and treats it as authoritative. `ecef` and `spacetime` are derived views computed by the bridge using `brightdate::geodesy::geodetic_to_ecef` (Bowring 1985 closed-form). They MUST NOT be considered independent measurements.

**Single source of truth.** All consumers of a given fix see identical numbers across all three blocks. Bsh and `bsh-geo` are pure transport; the conversion happens once, in the bridge.

#### 5.3.2 Plaintext Payload Schema (Failure)

```json
{
  "type": "geo-context",
  "context": "system-gps",
  "issued_at_bd": 9626.531421,
  "expires_at_bd": 9626.531594,
  "error": "denied"
}
```

Failure payloads carry `expires_at_bd` (matching the success schema) so consumers know when a retry would be reasonable. A failure payload is itself short-lived: bridges SHOULD set `expires_at_bd` to roughly 15 seconds out from `issued_at_bd` so that callers retrying a failed acquisition do not hammer the bridge within that window.

`error` values:

| Value | Meaning |
| --- | --- |
| `"denied"` | The OS-level authorization (Location Services / equivalent) denied the request. |
| `"unavailable"` | Hardware/network sensor returned no fix within the configured wait window. |
| `"expired"` | A consumer requested a fix that the bridge had already aged out. (Used in §7.3 query replies; not pushed.) |
| `"presence_failed"` | The fix was acquired but `require_presence` was set and presence verification failed. |

A failure payload received over the push channel MUST cause bsh to assume the `OUTSIDE` state for all currently-defined zones, fail-closed for any in-flight `command_jit` check, and not block waiting for a TTL timeout.

---

## 6. Zone Definitions and Transitions

### 6.1 Zone File: `~/.config/bsh/geo-zones`

Zones are user-defined and user-owned. There is no `/etc/` system-wide zone file — see §11 for the rationale.

```
# zone_name  latitude,longitude  radius_metres  [options]
office       47.6062,-122.3321  120  hardware
home         47.7000,-122.2000  150
datacenter   47.3073,-122.2285   25  hardware,presence
```

**Format:**

- One zone per line. Whitespace-separated. Lines beginning with `#` are comments.
- `zone_name`: ASCII identifier, `[a-z][a-z0-9_-]*`, max 64 chars.
- `latitude,longitude`: WGS84 decimal degrees, ASCII period decimal separator, no thousands separator. Range checked: lat ∈ [−90, 90], lon ∈ [−180, 180].
- `radius_metres`: positive f64, ASCII period decimal separator. Practical range [1, 1e6].
- `options` (optional, comma-separated):
  - `hardware`: zone match requires `provenance == "hardware"`. Network-only fixes are treated as outside.
  - `presence`: zone match requires `user_presence == true` at fix time.

**Permissions.** The bridge MUST refuse to honor `~/.config/bsh/geo-zones` if it is group- or world-writable, or if its owner UID does not match the bridge's effective UID. On refusal the bridge logs a warning and serves no zones.

**Reload.** The bridge reloads the zone file on `SIGHUP` and on detected file modification. Reload is atomic: a malformed file leaves the previous zone set active and logs a parse error.

**File-state matrix.** The bridge's response to each zone-file state:

| File state | Loaded zones | Bridge log level | Effect on shells |
| --- | --- | --- | --- |
| Absent | None | info, once at startup | No zone matches; `command_jit` refusals proceed with `zone='none'`. |
| Present, permissions OK, well-formed, ≥1 zone | Parsed set | info | Normal operation. |
| Present, permissions OK, well-formed, empty (or all comments) | None | info | Same as absent. |
| Present, permissions OK, malformed | Previous set retained (or none if first load) | error | `command_jit` continues against last good set; reload retried on next SIGHUP/modification. |
| Present, group/world-writable, or wrong owner | None | warning | Treated as absent; user is notified once via OSC 7777 push (`type: "sdi-config-error"`) so they can fix the perms. |

**Matching.** The bridge does the matching. Bsh receives only zone *names*. Bsh never sees the geometry of zones the user is currently outside of. (This limits the blast radius of a bsh-side compromise: an attacker learns the names of zones the user has visited in this session, not the full set of definitions.)

**Example file.** A starter zone file SHOULD ship at `<install_prefix>/share/bsh/examples/geo-zones.example` containing two or three commented-out sample zones. Users copy it to `~/.config/bsh/geo-zones`, edit, and `chmod 0600`.

### 6.2 Transition Events

The bridge emits a `geo-context` push on the OSC 7777 channel (via `SDI_PUSH`, §4.7) whenever:

- The user enters or exits any defined zone.
- A `command_jit` trigger (§10) is fired by bsh.
- Manually requested via the bridge's IPC interface (e.g., `bsh-geo --refresh`, mapped to `SDI_GEO_REFRESH`).

The push contains the full §5.3.1 payload. `zones_entered` and `zones_exited` enumerate the deltas since the previous emitted fix on this session.

### 6.3 Shell-Side Surface

Bsh exposes the following when `setopt BSH_GEO` is enabled:

| Symbol | Type | Notes |
| --- | --- | --- |
| `$BSH_GEO_ZONE` | string | Current matched zone (newest entered). Empty if not in any zone. **Not exported** by default (`typeset -g`, not `typeset -gx`). |
| `$BSH_GEO_ZONES` | array | All zones currently matched. **Not exported** by default. |
| `$BSH_GEO_PROVENANCE` | string | `"hardware"`, `"network"`, or empty. Not exported. |
| `$BSH_GEO_SOCK` | string | Path to the bridge's geo query socket. **Exported** (this is the only geo data deliberately exposed to children, and it is just a socket path, not coordinates). See §7. |
| `bsh_geo_enter_<zone>` | function | If defined, called when `<zone>` is entered. Same dispatch model as `chpwd_functions`. |
| `bsh_geo_exit_<zone>` | function | If defined, called when `<zone>` is exited. |
| `~/.config/bsh/geo-triggers.d/*` | scripts | If executable, run on every transition. See §6.4. |

When `BSH_GEO` is not set, none of the above are populated; the geo socket is not announced to children; OSC 7777 `geo-context` pushes are silently dropped at the bsh side.

### 6.4 Trigger Scripts

Files in `~/.config/bsh/geo-triggers.d/` that are executable and match the pattern `[a-zA-Z0-9._-]+` (no leading dot beyond extensions) are invoked by bsh on every zone transition.

**Invocation:**

- Run as the user, never as root. There is no `/etc/` variant.
- A sanitized environment: only `PATH`, `HOME`, `USER`, `LANG`, `LC_*`, and `BSH_GEO_SOCK` are passed. The script can pull coordinates via `BSH_GEO_SOCK` if it is allowlisted (§7).
- Transition data is provided on **stdin** as a single JSON line:
  ```json
  {"event":"enter","zone":"office","provenance":"hardware","issued_at_bd":9626.531421}
  ```
  or
  ```json
  {"event":"exit","zone":"office","provenance":"hardware","issued_at_bd":9626.531421}
  ```
- argv carries no transition data (argv is `ps`-visible).
- Lat/lon are NOT passed to trigger scripts directly. Scripts that need coordinates use the `bsh-geo` helper, which subjects them to the allowlist check.
- Script execution timeout: 5 seconds. Hard kill on timeout. Log on timeout.
- One trigger script's failure does not affect others.

### 6.5 Advisory Pre-Exec Semantics and Overrides

This section is normative for Tier 1 implementations. It defines exactly what bsh does when a `command_jit`-fenced command is invoked outside its zone.

#### 6.5.1 Goals

The advisory check exists for one purpose: **catch honest mistakes loudly enough to be useful, with an audit trail strong enough to be reviewable, while never claiming to enforce.** A v3 implementation that prints "blocked" without an override path is annoying; one that silently allows is useless; one that pretends to enforce is dishonest.

#### 6.5.2 Required Behaviour

When bsh is about to execute a command that matches a `command_jit` rule and the current `geo-context` indicates the command is fenced and the user is outside its zone:

1. Bsh **MUST NOT** execute the command directly.
2. Bsh **MUST** print an advisory message to stderr in the form specified in §6.5.3.
3. Bsh **MUST** emit an audit event to the bridge over the persistent SDI session (encrypted via `K_session`, with `dir_tag = 0x01` shell→agent, and with `type` set to `sdi-audit`). The payload schema is `{"kind":"advisory_refusal","command":...,"argv":[...],"zone_name":...,"distance_metres":...,"accuracy_metres":...,"provenance":...,"issued_at_bd":...}`. See §10.3 for what the bridge records.
4. Bsh **MUST** return exit code `124`. (Rationale: avoids the POSIX `EX_NOPERM` 77 collision and the 126/127 shell-builtin collisions; sits in the unused 120–125 range.)
5. Bsh **MUST NOT** propose any flag, alias, or syntax that pretends to override at the level of the fenced command itself. The override is invoked through `bsh-geo-override` (§6.5.4).

#### 6.5.3 Required Advisory Format

The stderr message MUST contain, in order:

```
bsh: advisory: '<command>' is fenced to zone '<zone>'.
     Current location: <distance_metres>m from zone, <accuracy>m accuracy, provenance=<provenance>.
     This is a Tier 1 advisory check, not enforcement; see Appendix C.
     To proceed in this shell:
         bsh-geo-override --reason "<your reason>" -- <command> <args>...
     To run without geo-aware checks at all, invoke through any non-bsh shell.
```

The "see Appendix C" line is required honesty. The "any non-bsh shell" line is also required honesty: a user who reads the message learns immediately that the friction is at the bsh layer only. Hiding this would be deceptive given the threat model in §11.3.

The exact wording above is a SHOULD; implementations MAY rephrase for localization but MUST preserve all four elements (zone identification, current location summary, advisory disclaimer, override syntax) and MUST mention the non-bsh-shell escape.

#### 6.5.4 The `bsh-geo-override` Helper

Shipped alongside `bsh-geo`. Syntax:

```
bsh-geo-override [--reason "<text>"] -- <command> <args>...
```

Behaviour:

1. Allowlist check: `bsh-geo-override` MUST itself appear in `~/.config/bsh/geo-allow`. Without this it cannot read the geo-context for the audit log.
2. Read the current `geo-context` from the bridge (via the geo socket, §7).
3. Emit an audit event to the bridge with kind `advisory_override`. The event MUST include: the user-supplied `--reason` text (or empty string if absent), the resolved absolute path of `<command>` (via `realpath`, see §7.4), full argv, the active zone(s) at override time, distance from the rule's fenced zone, accuracy, and provenance.
4. `execve` `<command>` with its argv. **No further bsh involvement.** The override helper itself is not a long-running supervisor; once exec'd, the command's exit code becomes the override's exit code.

`bsh-geo-override` is **not** a privilege boundary. A malicious script that knows the override syntax can use it to bypass the advisory check. That is acceptable: per §11.3, this RFC does not defend against malicious code in the user's session. The override exists for the user's own convenience and for audit; it is not gating anything that matters.

#### 6.5.5 `--reason` Conventions

The `--reason` flag is technically optional, but `bsh-geo-override` SHOULD prompt interactively if it is missing and the standard input is a TTY:

```
$ bsh-geo-override -- kubectl-prod delete deployment/checkout
Override reason (one line): emergency rollback, on-call PagerDuty PD-12345
```

Reasons are free-form strings, capped at 280 characters by the bridge (longer reasons are truncated and a flag is set in the audit entry). They are stored verbatim in the in-memory audit log; they MUST NOT be parsed for structure by the bridge or bsh.

If neither the flag is supplied nor stdin is a TTY (e.g., the override is invoked from a script), the reason field is recorded as the empty string. The audit entry's `reason_supplied` boolean reflects this distinction.

#### 6.5.6 What This Buys You

After a month of use, `bsh-geo --audit overrides` (per §10.3) can answer:

- Which fenced commands are routinely overridden, and for what reasons → those probably shouldn't be fenced; the rule is wrong.
- Which fenced commands are rarely overridden → those rules are doing what they should.
- Which user habits trigger advisory refusals → maybe the user needs a different zone defined.

The friction itself is not the win. The data the friction generates is the win.


---

## 7. Coordinate Access for Child Processes

This section defines how a process other than bsh itself (e.g. an `iputils` helper, a deploy script, a weather utility) reads the current location.

### 7.1 Design Constraints

The data has properties that rule out the obvious approaches:

- **Cannot live in environment variables.** Children inherit indefinitely, the value cannot be revoked from already-running processes, TTL becomes a polite suggestion. Leaks into Docker/CI/sudo. Visible to *every* descendant rather than the specific consumer.
- **Cannot live in a file.** Files are readable by anything sharing the UID, persist past TTL, leave a trail.
- **Cannot live in argv.** History, `ps`, audit-log capture.

The only shape that gives real TTL, real per-program authorization, and zero ambient broadcast is **agent-as-keyserver**: a Unix-domain socket that authenticated peers query per-invocation. v3 keeps this socket distinct from the EBP/1 socket so that geo queries do not require an SDI session and so that the EBP/1 surface is not contaminated with location-specific access controls.

### 7.2 The Geo Query Socket

Distinct from the EBP/1 registration socket of §4.1. The bridge uses **two-level path indirection** so that long-running clients survive a bridge restart:

| Name | Path | Mode | Contents |
| --- | --- | --- | --- |
| **Path file** | `~/.enclave/sdi-agent.geo.path` (or sandbox-equivalent) | `0600`, owner UID | A single line: the absolute path of the live socket. Stable name across restarts. |
| **Socket** | `~/.enclave/sdi-agent-<random>.geo.sock` | `0600`, owner UID | The actual Unix-domain socket. Random component preserves the squat-resistance property of §4.1. |

Bridge startup:

1. Generate random component, choose socket path under `~/.enclave/`.
2. Verify no file exists at that socket path; fatal-abort if it does (squat defense, §4.1).
3. Bind socket.
4. Atomically write the new socket path into `<...>.geo.path` via `write` to a tempfile + `fsync` + `rename`.

Bridge shutdown:

5. Unlink socket and path file. (On crash these may persist; clients MUST be tolerant of stale path-file contents.)

`$BSH_GEO_SOCK` exported by bsh contains the **path-file path**, not the socket path. Clients (`bsh-geo` and any other) follow this protocol per request:

1. Open and read `$BSH_GEO_SOCK` (the path file). Extract the socket path.
2. Connect to the socket path.
3. On `ECONNREFUSED` / `ENOENT`, re-read the path file (the bridge may have restarted) and retry once. After a second failure, return error code 2 (bridge unreachable).

This means a long-running process whose `BSH_GEO_SOCK` was set five hours ago still works after a bridge restart, because the indirection layer absorbs the random-path change.

`$BSH_GEO_SOCK` is the only geo-related variable bsh exports by default. It contains no location data and confers no authority — peer authentication (§7.4) requires UID match and allowlist membership, neither of which the path discloses. The path is also recoverable by enumerating `~/.enclave/sdi-agent.geo.path`, so withholding it from the environment would not meaningfully improve secrecy.

A `setopt BSH_GEO_NOEXPORT` option allows users who object to even this discovery hint to keep `BSH_GEO_SOCK` as a shell parameter only; in that mode `bsh-geo` inherits a one-shot-exported copy via the same mechanism §7.7 uses, and the user's parent environment carries nothing geo-related at all. See Appendix D for open questions on this option.

### 7.3 Wire Protocol

Single request, single response, then close. JSON, line-delimited, UTF-8. **Note:** unlike the EBP/1 socket (which uses brace-terminated JSON per EBP/1 §3), the geo socket uses newline-terminated JSON, because requests are short and the exchange is trivially one round-trip.

**Request:**
```json
{"op":"get","require_altitude":false}
```

`op` values:

| Value | Behaviour |
| --- | --- |
| `"get"` | Return the current fix if available and authorized. |
| `"status"` | Return only metadata (provenance, accuracy, expires_at_bd) — does NOT consume the auth window or expose coordinates. |
| `"refresh"` | Ask the bridge to acquire a new fix (subject to §9 trigger policy). |
| `"audit"` | Return the audit log (filtered by `since` / `kind` parameters). Requires the calling executable's allowlist entry to carry `audit=true`. |

`require_altitude` (optional, default `false`): if `true`, the bridge MUST return `error: "altitude_unknown"` rather than serving a fix with `altitude_assumed: true`.

**Response (success):** The §5.3.1 payload, *minus* the `zones_entered`/`zones_exited` arrays (those are only meaningful on the push channel).

**Response (failure):** The §5.3.2 schema, with these additional `error` values:

| Value | Meaning |
| --- | --- |
| `"not_authorized"` | Caller's executable is not in the allowlist. |
| `"altitude_unknown"` | `require_altitude` was set and altitude is not known. |
| `"rate_limited"` | Caller is currently throttled. |

### 7.4 Peer Authentication

When a process connects to the geo socket, the bridge MUST:

1. **Verify peer UID** matches the bridge's effective UID via `SO_PEERCRED` (Linux), `LOCAL_PEERCRED` / `xucred` (macOS / BSD). Reject with TCP-style close on mismatch; do not respond.
2. **Resolve the peer's executable path** via `proc_pidpath(pid)` (macOS) or readlink of `/proc/<pid>/exe` (Linux). This is the **kernel's** record of the loaded executable. Argv is not consulted.
3. **Allowlist check:** the resolved path MUST appear in `~/.config/bsh/geo-allow`. If not, respond with `error: "not_authorized"` and close. Log the attempt.

   The bridge canonicalizes both the resolved peer path and each allowlist entry via `realpath(3)` before comparison, so symlinked install paths (e.g. Homebrew's `/opt/homebrew/bin/bsh-geo` → `/opt/homebrew/Cellar/bsh/X.Y.Z/bin/bsh-geo`) match correctly. An allowlist entry whose `realpath` cannot be resolved is treated as not present and logged as a warning at bridge startup and on reload.
4. **Optional integrity check:** if the allowlist entry includes a SHA-256 hash, the bridge MUST verify the hash of the resolved executable matches before serving the fix. Mismatch → `error: "not_authorized"`, log including both hashes.
5. **Per-program approval cache:** if no current approval exists for this `(uid, exe_path, exe_hash)` tuple, the bridge MAY prompt the user (Touch ID / system notification) for approval. Approval is cached in bridge memory only, with a default lifetime of 300 seconds, configurable per allowlist entry. Approval expiry forces re-prompt. v3 implementations that already have a TOTP layer for `EXPORT_KEY` (EBP/1 §4.14) MAY surface the same TOTP gate as an alternative to Touch ID for the per-program approval prompt; the user toggles the preferred mechanism in the bridge UI.
6. **Rate limit:** the bridge MUST limit any one peer PID to no more than 60 successful `get` requests per minute. Excess requests return `error: "rate_limited"`.

Permissions check on `~/.config/bsh/geo-allow` itself: same rules as §6.1 (mode no more permissive than `0600`, owner UID match, refuse otherwise).

### 7.5 Allowlist File Format

```
# absolute_exe_path  [sha256=<hex>]  [approve_ttl=<seconds>]  [audit=true]
/usr/local/bin/bsh-geo                                          audit=true
/Users/jess/bin/deploy-aware  sha256=ab12...  approve_ttl=600
/opt/iputils/bin/ping-geo
```

Lines beginning with `#` are comments. The path MUST be absolute. `audit=true` is required for entries that wish to use `op="audit"` on the geo socket.

### 7.6 The `bsh-geo` Helper

A small CLI shipped with bsh. Most callers should use this rather than speaking the raw protocol.

```
bsh-geo                    # default: ECEF, X Y Z metres, space-separated
bsh-geo --geodetic         # latitude longitude altitude (degrees, degrees, metres)
bsh-geo --bst              # BrightSpaceTime: t x y z (Bright-Seconds, BrightMeters)
bsh-geo --json             # full §5.3.1 payload (without zones_entered/exited)
bsh-geo --status           # provenance, accuracy_metres, seconds-until-expiry only
bsh-geo --refresh          # request a new fix, then return it
bsh-geo --refresh-presence # invalidate the presence cache (§10.3); does not return coords
bsh-geo --wait <seconds>   # if no current fix, wait up to <seconds> for one (max 30)
bsh-geo --require-altitude # exit 4 if altitude unknown rather than serving altitude_assumed
bsh-geo --audit [filter]   # query the bridge's audit log; see §10.3
bsh-geo --exec -- prog ... # one-shot env injection, see §7.7
```

**Output forms:**

```
$ bsh-geo
-2294592.1 -3624318.9 4665842.4

$ bsh-geo --geodetic
47.3073 -122.2285 64.2

$ bsh-geo --bst
831492283.7 -7.6541e-3 -1.2095e-2 1.5568e-2

$ bsh-geo --status
provenance=hardware accuracy_metres=15.0 expires_in_seconds=283
```

The default form is BrightSpace ECEF in plain metres. The `--bst` form mirrors `brightdate::relativity::SpacetimeEvent` field order `(t, x, y, z)`: time first, in Bright-Seconds since J2000.0; spatial components in BrightMeters. Because `BRIGHT_METER_M = SPEED_OF_LIGHT_M_PER_S ≈ 2.998 × 10⁸`, Earth-scale spatial coordinates appear as small fractions of a BrightMeter; this is correct.

**Exit codes:**

| Code | Meaning |
| --- | --- |
| `0` | Coordinates returned. |
| `1` | Currently no fix available (`error: "expired"`, `"unavailable"`, `"denied"`, `"presence_failed"`). |
| `2` | Bridge unreachable (no `BSH_GEO_SOCK`, socket connect failed, bridge crashed). |
| `3` | Caller not in allowlist (`error: "not_authorized"`). |
| `4` | Altitude unknown and `--require-altitude` was set. |
| `5` | Rate limited. |

**`bsh-geo` itself MUST be present in the user's allowlist** for any of this to work; it is the canonical proxy through which ad-hoc shell scripts read location. This is the right granularity: trust the helper, not every one-off script.

#### 7.6.1 The `bsh-geo-override` Helper

A sibling helper used to invoke a `command_jit`-fenced command outside its zone with audit. See §6.5.4 for full semantics. Synopsis:

```
bsh-geo-override [--reason "<text>"] -- <command> <args>...
```

Like `bsh-geo`, it MUST appear in `~/.config/bsh/geo-allow`. Unlike `bsh-geo` it does not return coordinates to its caller; it `execve`s the named command after recording an audit entry.

### 7.7 Single-Shot Environment Injection (Escape Hatch)

A small fraction of utilities cannot fork a helper or speak a socket protocol. For these, `bsh-geo` provides a one-shot exec wrapper:

```
bsh-geo --exec -- prog arg1 arg2
```

This:

1. Performs the standard authorization check **for `bsh-geo` itself**, not for `prog`. The user is authorizing `bsh-geo` to inject; they remain responsible for what `prog` does with the data.
2. Sets `BSH_GEO_LATITUDE`, `BSH_GEO_LONGITUDE`, `BSH_GEO_ALTITUDE`, `BSH_GEO_ECEF_X`, `BSH_GEO_ECEF_Y`, `BSH_GEO_ECEF_Z`, `BSH_GEO_ALTITUDE_ASSUMED`, `BSH_GEO_PROVENANCE`, `BSH_GEO_ISSUED_AT_BD`, `BSH_GEO_EXPIRES_AT_BD` in **the immediate child's environment only** (via the `execve` envp argument).
3. **Does NOT** modify the parent shell's environment. The variables exist for the lifetime of `prog` and any descendants of `prog`, and not in any other process.

This is documented as the escape hatch, not the primary path, and the RFC explicitly calls out its limitations: TTL of the variables is bounded by `prog`'s lifetime, not by the bridge-controlled `expires_at_bd`. Implementors and users SHOULD prefer the socket path.

> **Naming change from v2.** v2 used unqualified `BSH_LATITUDE`/`BSH_LONGITUDE`/etc. v3 namespaces under `BSH_GEO_*` to reduce collision risk and to make the geo-origin obvious in `env` listings. Implementations MAY accept either prefix at the consumer side for one release as a compatibility shim, but `bsh-geo --exec` MUST emit only the `BSH_GEO_*` form.

### 7.8 What Bsh Itself Does Not See

Bsh, when `BSH_GEO` is enabled, receives:

- **Zone names** (`$BSH_GEO_ZONE`, `$BSH_GEO_ZONES`) — yes.
- **Provenance** (`$BSH_GEO_PROVENANCE`) — yes.
- **Coordinates** (lat/lon/ECEF/BrightSpaceTime) — **no, not by default.** Bsh would have to query `BSH_GEO_SOCK` like any other client (and bsh would need to be in the allowlist to do so).

This means a compromise of bsh's process leaks the names of zones the user has visited this session, plus the provenance flag, plus the socket path (already exported, not sensitive). It does not leak coordinates or the geometry of any zone.

If a user genuinely wants coordinates in bsh-side parameters (for prompts, etc.), they MUST opt in via `setopt BSH_GEO_COORDS`. With that option set, bsh queries the socket like any other client and populates `$BSH_GEO_LATITUDE`, `$BSH_GEO_LONGITUDE`, `$BSH_GEO_ECEF_X`, etc. — which then live in the shell's parameter table but are still not exported.

### 7.9 Bridge Restart Behaviour

§4.1 defines the EBP/1 socket as accepting fresh connections after restart, with `K_session` resident in bridge memory. A bridge restart therefore destroys all SDI session keys; existing shells with cached `K_session` cannot communicate with the new bridge.

Bsh and other clients MUST detect bridge loss and re-establish:

- **Bsh side.** Bsh detects bridge loss either by an explicit OSC 7777 emit failure (the bridge's reply latency exceeds 2 seconds, or the persistent `SDI_PUSH` subscription closes with `ECONNREFUSED`) or by `bsh-geo` returning exit code 2 from any user invocation. On detection, bsh discards its cached `K_session`, marks the session invalid, and re-registers via §4.5 lazily on the next emit attempt. Until re-registration completes, bsh treats the session as having no current fix (outside all zones). User-facing behaviour: `bsh: SDI bridge restarted, re-registering...` printed once to stderr; subsequent `command_jit` rules behave as if no fix is available, leading to the §6.5 advisory refusal.
- **`bsh-geo` and other clients side.** Per §7.2, clients re-read the path file once on `ECONNREFUSED` / `ENOENT` and retry the connection. After a second failure the client returns exit code 2. Clients do NOT participate in SDI session re-registration; they speak only the unauthenticated geo socket protocol (UID + allowlist gated, but not session-keyed).

The bridge MUST NOT serve `geo-context` data (over either OSC 7777 or the geo socket) until at least one fix has been acquired post-restart. A query against a freshly-started bridge with no fix returns `error: "unavailable"`.

### 7.10 `bsh-geo --json` Output Stability

The JSON wire format and `bsh-geo --json` output are append-only across versions: implementations MAY add fields, but MUST NOT remove or rename fields, change field types, or change the meaning of existing values, without bumping the SDI protocol version. Consumers SHOULD ignore unknown fields rather than reject the payload.

The same stability guarantee applies to `--audit` JSON output (§10.3) and to the `BSH_GEO_*` environment variables set by `--exec` (§7.7).


---

## 8. EBP/1 Bridge-Side Geo Commands (Optional)

The geo socket of §7 is the canonical access path for child processes. Clients that already hold an EBP/1 connection (e.g. `bsh` itself, or applications speaking `enclave-bridge-client`) MAY additionally invoke the following EBP/1 commands directly. These are convenience extensions; they do not replace the geo socket and they are subject to identical authorization (UID match + allowlist) plus the existing EBP/1 connection's session binding.

### 8.1 `SDI_GEO_GET`

```json
{ "cmd": "SDI_GEO_GET", "sessionId": "<base64 16 bytes>", "require_altitude": false }
```

Returns the current `geo-context` success or failure payload as a JSON object directly inside the EBP/1 response (not wrapped in an OSC 7777 envelope, since the EBP/1 connection is already encrypted by virtue of being a Unix-domain socket within the user's account; for additional in-flight encryption, the consumer can use the OSC 7777 path instead).

The bridge MUST verify `sessionId` is bound to the connection issuing this command; otherwise return `{"error":"Session not registered on this connection"}`.

The bridge MUST also verify the calling client (i.e. the process that opened this EBP/1 connection) appears in `~/.config/bsh/geo-allow`. The peer-credential check uses the same `SO_PEERCRED` / `LOCAL_PEERCRED` mechanism as the geo socket (§7.4). On allowlist failure: `{"error":"Caller not in geo allowlist"}`.

### 8.2 `SDI_GEO_STATUS`

```json
{ "cmd": "SDI_GEO_STATUS", "sessionId": "<base64 16 bytes>" }
```

Returns metadata only: `{"provenance":..., "accuracy_metres":..., "expires_at_bd":...}`. Does not consume the auth approval cache and does not expose coordinates. Same `sessionId` and allowlist checks as §8.1.

### 8.3 `SDI_GEO_REFRESH`

```json
{ "cmd": "SDI_GEO_REFRESH", "sessionId": "<base64 16 bytes>", "trigger": "manual" }
```

Force-acquires a fresh fix subject to §9 trigger policy. `trigger` is a free-form label that lands in the audit log alongside the resulting fix; recommended values are `"manual"`, `"network_change"`, `"command_jit:<absolute-cmd-path>"`, or `"session_init"`. Same `sessionId` and allowlist checks.

### 8.4 `SDI_GEO_AUDIT`

```json
{
  "cmd":      "SDI_GEO_AUDIT",
  "sessionId":"<base64 16 bytes>",
  "filter":   "all" | "refusals" | "overrides" | "denials",
  "since_bd": 9626.5
}
```

Returns the in-memory audit log (per §10.3). Requires both `sessionId` binding AND that the calling client's allowlist entry carries `audit=true`. Returns:

```json
{
  "events": [
    { "kind": "advisory_override", "issued_at_bd": 9626.51, "command": "...", "argv": [...], "zone_name": "...", "reason": "...", "reason_supplied": true, "reason_truncated": false, "...": "..." },
    ...
  ]
}
```

The output is the same JSON-Lines structure as `bsh-geo --audit`, but wrapped into a single array for transport convenience inside the EBP/1 response envelope.

### 8.5 `SDI_AUDIT_EMIT`

```json
{
  "cmd":      "SDI_AUDIT_EMIT",
  "sessionId":"<base64 16 bytes>",
  "kind":     "advisory_refusal" | "advisory_override" | "<future>",
  "payload":  { ... }
}
```

The shell-to-bridge audit-event emit channel for v3. Replaces v2's "send a `type:sdi-audit` OSC 7777 sequence" pattern with a direct EBP/1 command, because audit events have no need to traverse the PTY (the bridge writes them straight to its in-memory log). The bridge appends to its rolling log subject to the field constraints of §10.3 (e.g. truncation of `reason` strings beyond 280 chars, no coordinates).

Returns `{"ok":true,"recorded_at_bd":<bd>}` on success. The bridge MAY drop audit events under memory pressure (logging the drop) and MUST NOT expose audit events of one user to another.

---

## 9. Threat Model and Enforcement Tiers

### 9.1 Tiers

The geographic context spec uses a two-tier model. v3 normatively defines **Tier 1 only.**

| Tier | What it provides | Where enforcement lives |
| --- | --- | --- |
| **Tier 1 — Advisory (this RFC)** | Friction against accidental misuse, audit trail, automation hooks, location-aware shell ergonomics. | Bsh + Enclave Bridge, user-space. |
| **Tier 2 — Authoritative (Appendix C, informational)** | Actual prevention of `execve`. | Privileged `EndpointSecurity` (macOS) / eBPF LSM (Linux) daemon, sharing this RFC's policy file format. |

### 9.2 Adversaries In Scope (Tier 1)

- **Tampered terminal stream.** A captured/forged OSC 7777 sequence in stdout (e.g. from `cat` of a hostile file). Defended by the AES-256-GCM authentication tag (§4.6) plus the bidirectional counter and AAD direction tag (§4.6.2–4.6.3).
- **Sensor-source spoofing of zone transitions on the wire.** Defended cryptographically by the encrypted SDI envelope.
- **Cross-process leakage of location data.** Defended by the agent-as-keyserver model of §7: coordinates never enter `environ`, never enter argv, never enter history.
- **Replay of captured `geo-context` sequences.** Defended by the per-direction monotonic counters (§4.6.3) and the BrightDate `issued_at`/`expires_at` window.
- **NTP rollback to resurrect expired payloads.** Defended by monotonic-clock-backed expiry on the bridge side.
- **Impostor bridge running on a spoofed socket path.** Defended by the SEP-signed registration transcript (§4.5.3) and TOFU-pinning of the SEP public key (§4.5.5). An impostor without access to the device's SEP cannot forge `transcriptSig`.

### 9.3 Adversaries Out of Scope (Tier 1)

The following are **not** defended against by this RFC. Implementors and documentation MUST NOT imply otherwise.

- The user themselves on their own machine.
- Malicious code already executing in the user's session under the user's UID.
- A user running a different shell, copying a binary, executing inside a container/VM, or booting another OS.
- OS-level compromise (kernel, signed-kext, system-level location-service tampering).
- Sensor-level spoofing (GPS spoofing, Wi-Fi BSSID spoofing). The bridge receives whatever the OS reports; this RFC does not introduce a sensor-integrity layer beyond the `provenance` field which records the OS's own classification.

The intent of Tier 1 is *automation and audit*, not *access control*. §11 states this in plain language.

### 9.4 What Hardware Anchoring Buys (And What It Doesn't)

Compared to v2's X25519/HKDF agent, v3 adds a Secure Enclave signature over the registration transcript (§4.5.3). This anchoring **does** give:

- A trust-on-first-use pin so a client can detect a **future** impostor bridge that lacks the original SEP key.
- A weak attestation that the bridge process actually has access to the SEP at registration time (a process that did not could not produce `transcriptSig`).
- A clean audit story: the bridge audit log can include the transcript signature alongside each session-init event, so a reviewer can later verify the registration integrity.

It **does not** give:

- Protection against a malicious bridge that **does** have access to the SEP. Any process running as the user can call `SecureEnclave.P256.Signing.PrivateKey(...)` for a key with the same access-control flags. Two bridge processes can hold the same logical SEP key handle (different instantiations, same backing key), and either of them can produce valid `transcriptSig` values.
- Protection against keyboard-eavesdropping malware that captures the `K_session` after derivation. Once `K_session` is in process memory it is recoverable by anyone who can read that memory.
- Protection against malware that compromises the bridge process directly. Such an adversary has both the secp256k1 private key and SEP signing access, and is therefore indistinguishable from the legitimate bridge.

The pin in §4.5.5 reduces the risk of a fresh impostor against an established user; it does not provide attestation that a particular running process has not been compromised.

---

## 10. Hardware Polling and Trigger Configuration

The bridge does not continuously poll hardware. Acquisition is event-driven, governed by `~/.config/bsh/geo-triggers`.

### 10.1 Trigger File Format

```
# event_type    target                              accuracy   ttl
session_init    *                                   network    1h
network_change  *                                   network    30m
command_jit     /usr/local/bin/kubectl-prod         hardware   120s
command_jit     /opt/aws/bin/aws-prod               network    60s
```

| Field | Values |
| --- | --- |
| `event_type` | `session_init` (one fix per shell start), `network_change` (Wi-Fi/network transition), `command_jit` (just before specified command runs). |
| `target` | Absolute command path for `command_jit`; SSID or `*` for `network_change`; ignored (use `*`) for `session_init`. |
| `accuracy` | `hardware` (force GPS), `network` (Wi-Fi/IP heuristics OK), `any`. |
| `ttl` | Duration the fix is considered current. Suffixes `s`, `m`, `h`. Max 8h (matches §4.1 session lifetime). |

Permissions: same rules as §6.1.

**`command_jit` target distribution.** The trigger file is read by the bridge, but bsh needs to know which commands to intercept *before* `execve`. To avoid duplicate parsing and config drift, the bridge sends bsh the current `command_jit` target list (resolved absolute paths only — no zones, no rules) as part of the registration handshake response **post-§4.5**, and re-pushes it via OSC 7777 (`type: "sdi-config"`, payload `{"command_jit_targets":[...]}`) on every trigger-file reload. Bsh caches this list in process memory and consults it on every command resolution. Bsh does NOT read `~/.config/bsh/geo-triggers` directly.

The list is delivered as a regular `SDI_PUSH` event (§4.7) the moment the session is established, so the client can begin honouring `command_jit` rules immediately after `SDI_REGISTER` returns. Subsequent reloads (file modification or `SIGHUP` to the bridge) emit a new `sdi-config` push that supersedes the prior list.

### 10.2 `command_jit` Behaviour

When bsh is about to execute a command matching a `command_jit` rule:

1. Bsh sends a `SDI_GEO_REFRESH` request to the bridge (over the established session; alternatively, a `geo-context` query OSC 7777 sequence with `op:"refresh"` inside the payload), naming the trigger.
2. The bridge acquires hardware as required, with a **maximum wait of 5 seconds** for `network` and **15 seconds** for `hardware`. Cold GPS can exceed 15 seconds; `hardware` callers SHOULD use `accuracy: any` for non-critical paths.
3. **During the wait**, bsh prints `bsh: acquiring location for fenced command '<cmd>'...` to stderr after 1 second of elapsed wait, and updates the line periodically. Stdin is not consumed; SIGINT is honored and aborts the acquisition (treating it as `error: "unavailable"` for §6.5 purposes).
4. On success, bridge pushes a `geo-context` payload over OSC 7777 (via `SDI_PUSH`).
5. On timeout or `error: "unavailable"`, bsh treats this as "outside all zones" and proceeds to the §6.5 advisory check, which will refuse the command (no current fix → outside fenced zone → advisory refusal). The refusal message specifies `provenance=none, distance_metres=unknown` for clarity.
6. Bsh evaluates the advisory check per §6.5. No additional pre-exec hook is defined by this RFC; users wanting custom behaviour write a wrapper script and place it on PATH ahead of the fenced binary.

### 10.3 Presence Verification

When a zone has the `presence` option (§6.1), the bridge MUST verify presence at fix time via the host's biometric API (Touch ID, Windows Hello) or, where biometrics are unavailable, an idle-time heuristic with a configurable maximum (default 30 seconds).

Presence verification is **cached for 30 seconds** by default to avoid prompt fatigue on repeated `command_jit` events. The cache lifetime is configurable via `~/.config/bsh/geo-presence-ttl` (single integer, seconds, max 300).

The cache is cleared immediately on:
- Lid close / display lock
- Explicit logout
- Bridge restart
- `bsh-geo --refresh-presence`

v3 implementations on devices with Secure Enclave SHOULD use the SEP-backed Touch ID API (`LAContext.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, ...)`) with the result bound into the same audit log entry as the fix itself, so a reviewer can later confirm not only that presence was verified but that the verification was hardware-attested. The `user_presence` payload field remains a single boolean for backward compatibility; an additional `presence_method: "biometric"` / `"idle-time"` field MAY be appended.

---

## 11. Privacy and Exfil Mitigations

### 11.1 No Ambient Broadcast

Coordinates are not in `environ`, argv, `$HISTFILE`, or any file. They live in bridge memory and are served per-request to authenticated, allowlisted peers.

### 11.2 No Persistence

The bridge stores fixes in volatile memory only. On bridge shutdown, all fixes are dropped. There is no cache file, no log file, no backup. Audit logs (§11.3) record metadata (timestamps, request counts, denial reasons) but never coordinates.

### 11.3 Audit Logging

The bridge maintains an in-memory rolling log (default 1000 entries) of:

- Geo socket connection attempts, with peer PID, peer exe path, allowlist verdict.
- Approval prompts and user responses.
- Rate-limit denials.
- Zone-file and allowlist-file permission rejections.
- **`session_init` events**: SDI registration successes and failures, with the agent identifier strings from §4.5.1, the bridge's transcript signature (truncated to first 16 bytes for log compactness), and the resulting session lifetime.
- **`session_teardown` events**: explicit teardown, expiry, or counter-failure-induced teardown.
- **`advisory_refusal` events** (per §6.5.2): bsh declined to execute a fenced command. Records `command`, `argv`, fenced `zone_name`, `distance_metres`, `accuracy_metres`, `provenance`, `issued_at_bd`.
- **`advisory_override` events** (per §6.5.4): a user invoked `bsh-geo-override` to proceed past an advisory refusal. Records all of the above plus the `--reason` text (verbatim, up to 280 chars), `reason_supplied` boolean, `reason_truncated` boolean.

The log is queryable via `bsh-geo --audit` (which itself requires allowlist membership — by default `bsh-geo` is allowlisted, and `--audit` is gated by an additional `audit=true` flag on the allowlist entry) or via the `SDI_GEO_AUDIT` EBP/1 command (§8.4).

The audit interface supports filtering by event kind:

```
bsh-geo --audit                  # all events, JSON-Lines format (one event per line)
bsh-geo --audit refusals         # advisory_refusal only
bsh-geo --audit overrides        # advisory_override only
bsh-geo --audit denials          # not_authorized + rate_limited
bsh-geo --audit sessions         # session_init + session_teardown
bsh-geo --audit --human          # human-readable rendering, one line per event with fixed columns
bsh-geo --audit --since <bd>     # events with issued_at_bd >= <bd>
```

**Output format.** The default output of `--audit` is JSON-Lines (one JSON object per line, no array wrapper, terminated by newline). This makes the audit log trivially pipeable to `jq`, `grep`, or any line-oriented analysis tool, and it is the format `bsh-geo` itself emits when invoked from automation. The `--human` flag produces a fixed-column human-readable rendering for interactive inspection. The JSON-Lines schema is subject to the §7.10 stability guarantee.

The log MUST NOT contain coordinates, zone geometry, the contents of `geo-context` payload bodies, or `K_session` bytes. It MAY contain zone names, distances, accuracies, provenance flags, transcript-signature prefixes, and SDI version numbers as listed above. The `--reason` text is the only free-form string the bridge stores; it is treated as opaque user-supplied content and is never interpreted, parsed, or matched against patterns.

Override entries are first-class: a user (or org reviewing the user's logs) can grep for them, count them, and use them as input to refining their `geo-triggers` ruleset. A rule that's overridden 30 times a week is probably the wrong rule.

### 11.4 No Wall-Clock Dependency

All timestamps on the wire are BrightDate scalars sourced from the bridge's monotonic clock conversion. An attacker capable of NTP rollback cannot resurrect an expired fix because the bridge's expiry check uses `mach_absolute_time` (or platform equivalent), not `gettimeofday`.

### 11.5 Provenance and Presence are Plaintext-Adjacent

`provenance` and `user_presence` ride inside the encrypted payload, so they are integrity-protected. However, they are **assertions by the bridge**, not independent attestations. A user-space compromise of the bridge could lie. The threat model (§9.3) excludes this case.

### 11.6 The `type` Field is Still Visible

Per §4.6, the `type` field on the OSC 7777 wire is plaintext. `geo-context` is therefore visible to any observer of the PTY stream. This RFC does not consider the *fact* that geo data is flowing to be sensitive. If you care about hiding even that, set the wire `type` to `sdi-payload` and inline `"type":"geo-context"` inside the encrypted body.

### 11.7 Defense Scope (Honesty Section)

This RFC explicitly does not defend against:

- The user themselves bypassing geo-aware checks by running `/bin/sh`, `python -c`, or any non-bsh shell.
- Malicious code already executing in the user's session under the user's UID (it can call the geo socket like any allowlisted client; allowlist defends only against unrelated processes, not co-resident malware).
- A user copying the binary they want to "fence" elsewhere or running it inside a container.
- Sensor-level spoofing (GPS spoofing, Wi-Fi BSSID spoofing). The bridge reports what the OS reports.
- OS kernel compromise.

**For genuine prevention of command execution, see Appendix C.** The shell is the wrong layer for it.

### 11.8 What the Geographic Context Is Not

In plain language, restated for emphasis because the v1 draft of the geo extension caused confusion:

- **Not access control.** Bsh refuses to run a fenced command outside a zone? The user types `/bin/sh` and runs it anyway. We make this clearer; we don't pretend otherwise.
- **Not enforcement.** No "MUST block execution" appears in this RFC. The §6.5 advisory refusal is documented as friction, not a security boundary; `bsh-geo-override` makes the bypass explicit and audited rather than hidden.
- **Not anti-coercion.** A user being held at gunpoint to run `kubectl delete` from their office, where the policy permits it, will run it.
- **Not anti-malware.** Malware running as the user can read `BSH_GEO_SOCK` from `environ`, connect, fail the allowlist check, and… still do whatever else it wanted to do anyway. Geo-aware bsh is not an anti-malware product.

What it **is**:

- An **automation surface** for legitimate location-aware shell behaviour: kubeconfig switching, prompt indicators, per-zone aliases, on-arrival/on-departure scripts.
- A **privacy-preserving plumbing layer** so scripts can read location without it sprawling through `environ` and `ps`.
- A **friction layer** that catches honest mistakes ("you typed `kubectl delete` and you're in `coffee-shop`, please confirm") with an audit trail.
- A **clean integration with the BrightDate / BrightSpace / BrightSpaceTime stack** so consumer code can deserialize geo replies directly into the canonical Rust types without conversion drift.
- A **cryptographic anchor to device-bound hardware**, so an established user gets a TOFU pin for the bridge they registered against, raising the cost of impostor attacks against future sessions.


---

## 12. Protocol Security & Threat Mitigation Profiling

This section covers SDI transport-layer threats. Geographic-context-specific privacy and exfil mitigations live in §11.

- **Rogue Injection Defense.** If an external malicious source outputs an unauthorized OSC 7777 block to stdout, the Enclave Bridge intercepts the sequence (when the terminal emulator forwards it), attempts validation via the mapped session key, and fails immediately at the AES-GCM Authentication Tag verification phase. The packet is dropped instantly with zero user impact.

- **Replay Defense.** The per-direction monotonic counters (§4.6.3), the AAD-bound `dir_tag` (§4.6.2), and the `issued_at` timestamp (§5) together ensure that a captured OSC 7777 sequence cannot be re-submitted to its receiver, cannot be cross-replayed in the opposite direction, and cannot be resurrected after expiry. Counter replay attempts are logged as security events.

- **AAD Boundary Confusion Defense.** Length-prefixed AAD encoding (§4.6.2) including the leading direction tag prevents any two distinct `(dir, counter, type, context)` tuples from producing identical AAD bytes, closing the boundary confusion attack surface present in naive concatenation.

- **Socket Squatting Defense.** Randomized geo-socket paths and pre-bind existence checks (§4.1, §7.2) prevent a malicious process from pre-occupying the socket path before the bridge starts. The EBP/1 socket itself is at a small set of well-known paths but is owned by the bridge process and inherits macOS user-account isolation; an attacker would need to race the bridge at startup and would still be visible to the SEP transcript-signature pin (§4.5.5).

- **Process Ring-Fencing.** Because session encryption keys are isolated per terminal window or tab instance, background commands running concurrently in other workspaces cannot intercept, manipulate, or extract state data crossing adjacent active streams.

- **Memory-Bound Persistence (Zero Leaks).** Decrypted states are stored exclusively within the volatile memory space of the Enclave Bridge daemon. Payloads automatically drop when their specified Time-To-Live metric expires or when the terminal session registers a clean exit sequence, avoiding long-term storage footprints. In particular, `K_session` is never persisted; bridge restart destroys all sessions.

- **Fail-Closed Injection.** `bsh-inject` writes directly to `/dev/tty` and refuses to operate if the bridge is unavailable, preventing accidental ciphertext persistence or silent fallback to unprotected channels.

- **Type Field Visibility.** Implementors are advised that the `type` field is visible in plaintext on the PTY stream. Sensitive schema classification should be encoded within the encrypted payload body (§4.6).

- **Hardware-Anchored Registration.** The §4.5.3 transcript signature, produced by the SEP P-256 key, lets clients pin "the bridge that holds this SEP key" and detect future impostor bridges that lack it. See §9.4 for the precise scope of what this anchoring buys.

- **Defense in Depth via `SecureEnclaveKeyring`.** The bridge consumer in `brightchain-api-lib` (`SecureEnclaveKeyring`, EBP/1 §9) can additionally store SDI-related secrets — including, e.g., the user's pinned SEP public-key hash — under a double-encryption envelope (password-AES-GCM inner layer, ECIES-to-the-bridge outer layer). Implementations that need to persist the pin across reinstalls SHOULD use this path.

- **TOTP-Gated Sensitive Operations.** Where the bridge already implements EBP/1 TOTP (§4.13–4.14), implementations MAY require TOTP for `SDI_REGISTER` itself, raising the cost of a malicious local process establishing a session without the user's involvement. The reference implementation does not require this by default to keep `bsh-inject` ergonomic; it is a per-deployment policy choice.

---

## 13. Implementation Ecosystem & Future Directions

The reference implementation of this protocol is actively deployed and validated inside the BSH shell engine ecosystem (`bsh`), paired with the Swift-based macOS Enclave Bridge (the SwiftUI menu-bar process whose EBP/1 surface is documented in `enclave-bridge-protocol.md`). The bridge runs as a menu-bar background process, hosts the EBP/1 Unix domain socket, hosts the geo socket of §7, and routes decrypted payloads to registered application handlers and to PTYs via the §4.7 push channel.

By standardizing structured semantic pipelines, we pave the way for downstream integrations — such as secure browser plug-ins that auto-populate active web testing fields based on localized terminal history context, and unified system tray utilities that bridge CLI development speed with the accessibility of modern desktop interface tooling.

### 13.1 Browser Extension Integration — Security Considerations

Browser extension integrations **must** be treated as a distinct, high-risk trust boundary. Browser extensions operate under a significantly weaker security model than native daemons: content scripts, extension messaging APIs, and browser-controlled sandbox policies introduce attack surfaces not present in the native IPC layer defined in this RFC. Any downstream integration that routes decrypted payloads to a browser extension **must** define its own security protocol, including:

- A separate authenticated channel between the Enclave Bridge and the extension (e.g. native messaging with explicit host manifest allowlisting).
- Strict scoping of which payload types are permitted to flow to the browser layer.
- An explicit threat model addressing extension compromise, malicious content scripts, and cross-origin message interception.

Treating browser extension delivery as a transparent extension of the native SDI pipeline is explicitly out of scope for this RFC and **must not** be assumed by implementors.

### 13.2 Non-macOS Platforms

The reference bridge is macOS Apple Silicon. A Linux or Windows port MUST:

- Provide an EBP/1-compatible socket and command surface (`HEARTBEAT`, `GET_PUBLIC_KEY`, `ENCLAVE_DECRYPT`, `ENCLAVE_SIGN`, `LIST_KEYS`, `ENABLE_TOTP`/`EXPORT_KEY`).
- Anchor signing in a hardware key store where available: TPM 2.0 (Linux/Windows), Microsoft DPAPI/CNG (Windows), or fall back to software ECDSA over secp256r1 with the private key wrapped by a platform credential store. The §4.5.3 transcript signature is curve-agnostic in spirit — any P-256 verifier suffices, since the wire format already carries the DER signature — but the public key returned by `GET_ENCLAVE_PUBLIC_KEY` MUST be P-256 to match the EBP/1 expectation.
- Implement the geo socket of §7 with the same path-indirection scheme, peer-credential check, and allowlist semantics.

A v3 client ported to a non-macOS platform MAY refuse to register if the bridge cannot produce a hardware-backed `transcriptSig`, or MAY accept software-backed signatures with a clear visual indicator. The reference `bsh-inject` accepts software-backed bridges and prints a one-time stderr notice during the first registration after install.

### 13.3 Future Directions

- **TLS-style cipher-suite negotiation in `SDI_REGISTER`.** Currently the cipher suite is fixed (secp256k1 + AES-256-GCM + SHA-256, matching EBP/1 cipher-suite byte `0x01`). A future v3.x or v4 MAY negotiate.
- **Pluggable HSM bridges.** A YubiKey- or Nitrokey-backed bridge that speaks EBP/1 over a local socket would allow v3 SDI sessions to anchor against an external token instead of the host's SEP.
- **End-to-end push relay.** v3 routes pushes through `SDI_PUSH` and the client writes them to its own PTY. Terminal emulators that wish to bypass the client (e.g. for OOB protocol updates that don't require the shell) MAY implement a direct push relay using the same OSC 7777 envelope; the cryptographic guarantees are unchanged.
- **Multi-bridge sessions.** A future revision MAY allow a single SDI session to span multiple bridges (e.g. one local SEP-backed bridge for signing, one cloud bridge for encrypted backup of audit logs). Out of scope for v3.

---

## 14. Implementer's Checklist

A new client implementation MUST:

1. Discover the bridge socket via the EBP/1 §2.2 path order.
2. Speak EBP/1 framing (one JSON object per request, brace-terminated; binary fields Base64).
3. Perform `SDI_REGISTER` per §4.5, including verifying `transcriptSig` against a pinned (or TOFU-pinned) SEP public key. The outer envelope MUST conform byte-for-byte to the **DD-ECIES** Basic-mode wire format pinned in §4.5.0: version `0x01`, cipher suite `0x01`, encryption type `0x21`, **33-byte compressed** ephemeral key on the wire, 12-byte IV, 16-byte tag, AAD = `version ‖ cipherSuite ‖ type ‖ ephemeralPublicKey` (no preamble), HKDF-SHA256 with `info = "ecies-v2-key-derivation"` and empty salt, IKM = 32-byte ECDH x-coordinate.
4. Maintain two per-direction monotonic counters (§4.6.3).
5. Construct AAD with the length-prefixed direction tag (§4.6.2). Note this is the SDI **OSC 7777** AAD; the **outer ECIES envelope** AAD is different and is defined by DD-ECIES via §4.5.0.
6. Use AES-256-GCM with 12-byte IVs and 16-byte tags throughout (both for the outer ECIES envelope and for OSC 7777 traffic).
7. Treat any `{"error": "..."}` response from the bridge as a recoverable protocol error, not a transport failure.
8. Detect bridge restart and re-register transparently (§4.8, §7.9).
9. Hash with SHA-256 before P-256 verification of `transcriptSig`, matching EBP/1 §4.9.
10. Fail closed: if the bridge is unavailable, emit no plaintext OSC 7777 sequences.
11. **Senders MUST emit only 33-byte compressed ephemeral keys** in `SDI_REGISTER` envelopes. Decoders MUST accept the DD-ECIES §5.3 backward-compat formats (33-byte compressed, 64-byte raw, 65-byte uncompressed) and normalize to 33-byte compressed before any cryptographic operation, but a sender that emits anything other than 33-byte compressed is non-conformant.
12. SHOULD link against `@digitaldefiance/ecies-lib` or `@digitaldefiance/node-ecies-lib` (the DD-ECIES reference implementations) rather than reimplementing the outer envelope. A from-scratch reimplementation MUST pass the DD-ECIES §18 test vectors (notably §18.4 ECDH+HKDF, §18.5 AES-256-GCM, and §18.6 Basic-mode envelope) as known-answer tests in CI before being considered interoperable.

A new bridge implementation MUST additionally:

1. Implement the EBP/1 commands required by §4.5–4.7 plus the optional §8 commands.
2. Bind the geo socket on a randomized path with the path-file indirection of §7.2.
3. Enforce peer-credential and allowlist checks on every geo-socket request (§7.4).
4. Maintain the audit log of §11.3 in volatile memory only.
5. Reload zone, allowlist, and trigger files on `SIGHUP` with permission validation.
6. Honour the rate limits of §4.4 and §7.4.
7. Sign every `SDI_REGISTER` transcript with the SEP P-256 key per §4.5.3.
8. Refuse to parse an SDI v1 or v2 raw handshake on its EBP/1 socket; return only the standard EBP/1 error envelope.

---

## 15. References

1. RFC 5869 — *HMAC-based Extract-and-Expand Key Derivation Function (HKDF)*.
2. RFC 6238 — *TOTP: Time-Based One-Time Password Algorithm*.
3. RFC 4226 — *HOTP: An HMAC-Based One-Time Password Algorithm*.
4. RFC 4648 — *The Base16, Base32, and Base64 Data Encodings*.
5. NIST SP 800-38D — *Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode*.
6. SEC 1 — *Elliptic Curve Cryptography*, Standards for Efficient Cryptography Group.
7. Apple, *CryptoKit* documentation — `SecureEnclave.P256.Signing.PrivateKey`, `AES.GCM`, `HKDF`.
8. Canonical specification: **[DD-ECIES Specification](dd-ecies-specification)** (`DD-ECIES-SPEC-v1.0`) — Authoritative wire-format and parameter specification for the outer envelope used by `SDI_REGISTER` (§4.5.0). When this paper and DD-ECIES disagree, DD-ECIES wins.
9. Companion paper: [Enclave Bridge Protocol (EBP/1)](enclave-bridge-protocol) — full specification of the bridge's command surface, ECIES wire format, and SEP key custody.
10. Companion paper: [ECIES-Lib](ecies-lib) — narrative description of the cross-platform `ecies-lib`/`node-ecies-lib` system whose wire format is normatively specified by reference 8.
11. Companion paper: [BrightDate Specification](brightdate-specification) — the BrightDate temporal foundation referenced by `geo-context` timestamps.
12. Companion paper: [Bright Space Standard](bright-space-standard) — the BrightSpace ECEF coordinate frame referenced by `geo-context`.
13. Companion paper: [Bright Spacetime Standard](bright-spacetime-standard) — the BrightSpaceTime mathematical framework referenced by the `spacetime` block of `geo-context`.
14. Predecessor: `rfc-sdi-osc7777.md` — SDI v1.
15. Predecessor: `rfc-sdi-osc7777-v2.md` — SDI v2.

---

## Appendix A — Summary of Security Changes from Initial Draft

| Issue | Resolution |
| --- | --- |
| No replay protection | Monotonic counter added to OSC sequence and AAD (§4.6, §4.6.3) |
| AAD boundary confusion via naive concatenation | Length-prefixed AAD encoding required (§4.6.2) |
| Predictable socket path enables squatting | Randomized socket path + pre-bind existence check required (§4.1, §7.2) |
| `bsh-inject` writes to stdout (risks log/pipe leakage) | Writes to `/dev/tty` by default; `--emit-stdout` is opt-in (§4.8) |
| No session expiry | 8-hour maximum session lifetime defined (§4.1) |
| No rate limiting on socket | 10 failed `SDI_REGISTER` attempts/min/PID limit required (§4.4); 30 failures/min/session for in-session OSC 7777 verification |
| `type` field confidentiality not addressed | Advisory note added; sensitive type should be inside encrypted body (§4.6) |
| Browser extension surface unaddressed | Explicit high-risk boundary callout with required separate protocol (§13.1) |
| No agent failure handling | Fail-closed behavior defined; no silent plaintext fallback (§4.8) |
| `issued_at` absent from schemas | Required in all payload schemas; bridge should validate against `ttl` (§5) |
| Wire protocol says "TCP connection" for a Unix socket | Corrected to "socket connection" throughout |
| No hardware anchoring of registration | SEP-signed transcript added in §4.5.3; TOFU pin recommended in §4.5.5 |
| Daemon sprawl (separate SDI agent) | Bridge fulfils SDI agent role; one menu-bar process serves both EBP/1 and SDI (§3, §4) |

## Appendix B — Changes from v1, v2, and Cross-Walk to EBP/1

This appendix tracks every cross-version delta so an implementer porting from any prior version can find every change in one place.

### B.1 v1 → v2 (carried forward unchanged in v3)

| v1 element | v2 disposition | Rationale |
| --- | --- | --- |
| Single-direction (Shell → Agent) envelope | Bidirectional: Agent → Shell pushes share the same envelope and key (§4.6). | Required by `geo-context` (push location updates) and any future agent-pushed payload type. |
| Single per-session monotonic counter | Two independent per-direction counters: `c_shell_to_agent`, `c_agent_to_shell` (§4.6.3). | A single counter with two writers cannot soundly distinguish legitimate emits from replays in the opposite direction. |
| AAD covers `(counter, type, context)` | AAD covers `(dir_tag, counter, type, context)` with `dir_tag` length-prefixed (§4.6.2). | Cross-direction replay is impossible: GCM tag verification fails when the receiver reconstructs AAD with its direction tag. |
| Handshake on dedicated SDI socket: 48 / 32 bytes | Handshake on dedicated SDI socket: 49 / 33 bytes; first byte is `protocol_version`. | Wire-level distinguishability of v1 and v2 sessions; agents could refuse mismatched versions before key derivation. |
| HKDF info string `"sdi-session-key"` | HKDF info string `"sdi-session-key-v2"`. | Domain-separates v1 and v2 keys so a version-mismatch handshake produces incompatible keys rather than silent cross-version traffic. |

### B.2 v2 → v3

| v2 element | v3 disposition | Rationale |
| --- | --- | --- |
| Dedicated SDIAgent daemon with its own X25519 socket | The Enclave Bridge is the SDI agent. Registration is an EBP/1 command (`SDI_REGISTER`, §4.5) on the bridge's existing Unix socket. | One running process instead of two; reuse the bridge's already-audited socket-discovery, sandbox containment, and TOFU surfaces. |
| X25519 ECDH + HKDF over a 48-byte raw frame | secp256k1 ECIES envelope + HKDF over two random 32-byte shares (`clientShare`, `bridgeShare`); §4.5.2 | Aligns the cryptographic substrate with EBP/1 (which already speaks secp256k1 via `node-ecies-lib`); avoids running two unrelated curve agreements in the same process. |
| No transcript authentication | SEP P-256 ECDSA over a 234-byte canonical transcript; §4.5.3 | Hardware-anchored TOFU pin against future impostor bridges; weak attestation that the bridge had SEP access at registration time. |
| HKDF info string `"sdi-session-key-v2"` | HKDF info string `"sdi-session-key-v3"` | Domain separation, same rationale as v1 → v2. |
| Push channel via direct PTY-emulator integration | Push channel via `SDI_PUSH` (§4.7), client-pulled, written to `/dev/tty` by the receiving shell | Removes the requirement that the terminal emulator have an out-of-band agent-to-PTY API; works on any terminal that forwards OSC 7777. |
| `BSH_LATITUDE`, `BSH_LONGITUDE`, etc. environment names from `--exec` | `BSH_GEO_LATITUDE`, `BSH_GEO_LONGITUDE`, etc. (§7.7) | Reduces collision risk; clarifies origin. Implementations MAY accept either prefix at consumers for one release as a compatibility shim. |
| Geo socket lives at v2-defined `/run/user/<uid>/sdi-agent...` | Geo socket lives under `~/.enclave/sdi-agent...` alongside the EBP/1 socket (§7.2) | Co-locates all bridge state under one directory; matches sandboxed-app conventions on macOS. |
| Transition events in the audit log | Same, plus `session_init`, `session_teardown`, transcript-signature prefixes (§11.3) | Lets reviewers correlate registration anomalies with later behaviour. |
| Trigger-file distribution unspecified | `command_jit` target list pushed via `SDI_PUSH` immediately after registration (§10.1) | Removes the file-read race between bridge and bsh; one source of truth. |

v3 retains all v1/v2 security properties (Appendix A) and adds the above. Implementations that do not need bridge-anchored sessions MAY continue to target v2 indefinitely; v3 is required for any scenario where the SDI agent role is consolidated with an EBP/1 bridge or where hardware anchoring is desired.

### B.3 Cross-Walk: SDI-EB ↔ EBP/1

For implementers fluent in EBP/1 who want to know exactly what SDI-EB adds, removes, or constrains:

| Aspect | EBP/1 (alone) | SDI-EB (this RFC) |
| --- | --- | --- |
| Socket location | Per EBP/1 §2.2 | Identical (uses the same socket) |
| Framing | Brace-terminated JSON | Identical |
| `HEARTBEAT`, `VERSION`, `STATUS`, `METRICS`, `LIST_KEYS` | Defined | Used unchanged |
| `GET_PUBLIC_KEY`, `GET_ENCLAVE_PUBLIC_KEY` | Defined | Used unchanged for bridge-key fetch and SEP-key pin |
| `SET_PEER_PUBLIC_KEY` | Defined; per-connection state | SDI-EB does not require it; left for non-SDI uses |
| `ENCLAVE_SIGN` | Defined | Used internally by the bridge for `transcriptSig` (§4.5.3) |
| `ENCLAVE_DECRYPT` | Defined | Used internally by the bridge for `SDI_REGISTER` envelope decryption |
| `ENABLE_TOTP`, `EXPORT_KEY` | Defined (TOTP extension) | Optional gating layer for `SDI_REGISTER` (§12) |
| `SDI_REGISTER` | — | New (§4.5) |
| `SDI_PUSH` | — | New (§4.7) |
| `SDI_GEO_GET`, `SDI_GEO_STATUS`, `SDI_GEO_REFRESH`, `SDI_GEO_AUDIT`, `SDI_AUDIT_EMIT` | — | New (§8) |
| Geo socket | — | New (§7), separate from the EBP/1 socket |
| Rate limit on `SDI_REGISTER` | — | New (§4.4) |
| Per-session memory (`K_session`, `Session-ID`) | — | New (§4.3) |
| OSC 7777 wire format | — | New, but uses the same ECIES suite values as EBP/1 (§4.6) |
| Audit log | — | New (§11.3) |

A bridge that implements EBP/1 only is **not** an SDI-EB bridge. A client that wishes to talk to such a bridge MUST handle `{"error":"Unknown command: SDI_REGISTER"}` gracefully and either (a) decline to use SDI features, or (b) fall back to a v2 SDI agent on a separate socket.

---

## Appendix C — Tier 2 Enforcement (Informational, Non-Normative)

This appendix sketches how a future privileged component would deliver actual prevention of command execution, sharing this RFC's policy file format and `geo-context` payload schema.

### C.1 macOS: EndpointSecurity Client

A separate daemon, sibling to the Enclave Bridge, registers as an EndpointSecurity client and authorizes `ES_EVENT_TYPE_AUTH_EXEC` events. On each exec:

1. ES daemon receives the event with full process metadata.
2. Daemon consults a policy file (format compatible with §6.1 zone definitions plus an `enforce-on:` clause naming executables to gate).
3. Daemon queries the Enclave Bridge (via a privileged EBP/1 connection, or via a shared-memory cache populated by the bridge) for the current `geo-context`.
4. If the policy denies, daemon returns `ES_AUTH_RESULT_DENY` and the kernel never starts the process.

This requires the `com.apple.developer.endpoint-security.client` entitlement, root privileges, system-extension installation, and notarization. Latency budget is tight (hundreds of microseconds) and fail-open vs fail-closed semantics need careful design. The Tier 2 daemon MAY use the SEP signature from `SDI_REGISTER` as evidence of a healthy bridge before trusting bridge-supplied geo data; absent a valid signature, the daemon SHOULD fail closed (deny exec) for any policy that depends on geo state.

### C.2 Linux: eBPF LSM or fanotify

An eBPF LSM program attached to `bprm_check_security` can deny `execve` based on the same policy. fanotify with `FAN_OPEN_EXEC_PERM` is a more portable alternative. Both require root / `CAP_SYS_ADMIN`.

### C.3 Windows: Kernel Mode Mini-Filter / Authentication Package

A Windows port would use a kernel-mode driver (mini-filter or process-creation callback registered via `PsSetCreateProcessNotifyRoutineEx`) to gate `CreateProcess`. The driver consults a user-mode bridge over a local pipe.

### C.4 What Tier 2 Inherits From This RFC

- The `~/.config/bsh/geo-zones` format (or a `/etc/` system equivalent for sysadmin-imposed policy).
- The `geo-context` payload schema (§5.3.1).
- The bridge's coordinate-conversion authority.
- The provenance and presence semantics.
- The §4.5.3 transcript signature, used as a "bridge health" indicator before trusting bridge-supplied state.

What changes for Tier 2:

- The policy file lives under `/etc/` and is root-owned, mode `0644`.
- The verdict applies to *every* `execve` system-wide, regardless of which shell or interpreter initiated it. Bsh becomes one consumer of the policy among many.
- `enforce-on:` clauses become real enforcement, not advisory friction.

Tier 2 is a **separate project**. Its protocol and ABI compatibility with Tier 1 are intentional design goals so that Tier 1's authoring effort is not wasted when Tier 2 ships.

---

## Appendix D — Open Questions

1. **`bsh-geo --exec` `BSH_GEO_*` env names.** v3 settled on `BSH_GEO_*` to reduce collision risk vs. v2's bare `BSH_LATITUDE` etc. Open: should we additionally prefix with `BSH_SDI_` to mark the SDI provenance? Lean: no, `BSH_GEO_*` is enough; the source is documented in this RFC and `bsh-geo --exec` is the only emitter.

2. **Multi-zone overlap.** What if the user is in `office` and `building-7` simultaneously (overlapping radii)? §6.3 says `$BSH_GEO_ZONE` is the *newest entered*; `$BSH_GEO_ZONES` enumerates all matched. Confirmed reasonable, but worth a usability pass once we have a real user.

3. **Allowlist hash algorithm agility.** §7.4 specifies SHA-256. Future-proofing against post-quantum / collision concerns suggests `algo=sha256:<hex>` syntax allowing future `sha3-256:`, `blake3:`, etc. Cheap to add now; lean toward `algo=` prefix syntax, keeping `sha256=<hex>` as a deprecated shorthand for one release.

4. **`setopt BSH_GEO_NOEXPORT` semantics.** §7.2 sketches an option to keep `BSH_GEO_SOCK` out of the exported environment entirely. Open: under that option, what happens for indirect children (e.g. a script invoked by a script that itself wasn't a direct `bsh-geo --exec` invocation)? The cleanest answer is "they don't have geo access," which is also the most surprising. Alternative: a small forwarding table keyed by session ID, served by the bridge, so any process under the user's bsh process tree can still reach the bridge if it explicitly asks. Punting until we know whether anyone actually wants this option.

5. **Trigger script PATH.** §6.4 sanitized environment passes through `PATH`. Should it instead set a known-good PATH (`/usr/local/bin:/usr/bin:/bin`)? Pro: stops `PATH` injection from a parent compromise. Con: surprises users whose triggers depend on their PATH. Lean: known-good PATH, document the override.

6. **TOTP gating of `SDI_REGISTER`.** §12 mentions TOTP-gating `SDI_REGISTER` itself as a per-deployment policy. Open: should the bridge advertise its policy via `STATUS` or `LIST_KEYS` so a client can know in advance whether to prompt the user? Lean: yes, add a `sdiRequiresTotp` boolean to `STATUS` in a future minor revision.

7. **Multi-bridge scenarios.** A laptop user on a desk with both an internal SEP bridge and an external YubiKey-backed bridge. Which one should `SDI_REGISTER` go to? Currently undefined; clients pick the first reachable socket per EBP/1 §2.2. Future revisions MAY allow the user to express preference via environment variable or config file.

These are deliberately punted to review rather than guessed at.

**Resolved during v3 review** (no longer open):

- ~~Override exit code~~ — settled at `124` in §6.5.2 (carried from v2).
- ~~`geo-context` over OSC 7777 vs registration socket~~ — pushes go over OSC 7777 with v3's bidirectional envelope, transported via `SDI_PUSH`; registration is one-shot per §4.5.
- ~~`bsh-geo --json` stability~~ — append-only across versions per §7.10.
- ~~`--audit` output format~~ — JSON-Lines by default, `--human` for interactive inspection (§11.3).
- ~~Trigger filename plurality~~ — `~/.config/bsh/geo-triggers` (plural) per §10.1.
- ~~How to deliver agent-pushed sequences~~ — `SDI_PUSH` event frames, client writes to `/dev/tty` (§4.7).
- ~~Where to store `K_session`~~ — bridge memory only, destroyed on restart or expiry (§4.1).

---

## Appendix E — Worked Examples

### E.1 End-to-end registration walkthrough

Client side, pseudocode:

```text
client_priv,  client_pub  = secp256k1.generate()        # 32 / 65 bytes
client_share = random(32)
client_nonce = random(16)

bridge_pub   = ebp1.GET_PUBLIC_KEY()                    # 65 bytes uncompressed
sep_pub      = ebp1.GET_ENCLAVE_PUBLIC_KEY()            # 65 bytes uncompressed (pinned)

plaintext = json({
  v:           3,
  clientPub:   base64(client_pub),
  clientShare: base64(client_share),
  issuedAtBd:  bd_now(),
  ttlSeconds:  28800,
  agent:       { name: "bsh", version: "1.4.2", platform: "darwin-arm64" }
})

envelope = ecies_basic_encrypt(bridge_pub, utf8(plaintext))   # node-ecies-lib

response = ebp1.send({
  cmd:             "SDI_REGISTER",
  protocolVersion: 3,
  clientNonce:     base64(client_nonce),
  envelope:        base64(envelope)
})
# response = { ok, sessionId, bridgeIssuedAtUnix, ttlSeconds, responseEnvelope, transcriptSig }

bridge_share = ecies_basic_decrypt(client_priv, base64_decode(response.responseEnvelope))
session_id   = base64_decode(response.sessionId)            # 16 bytes

# Build canonical transcript
T  = b"SDI-EB v3 transcript\0"
T += LE32(len(client_nonce))          + client_nonce
T += LE32(len(client_pub))            + client_pub
T += LE32(len(client_share))          + client_share
T += LE32(len(session_id))            + session_id
T += LE32(len(bridge_share))          + bridge_share
T += LE32(8)                          + u64_be(round(plaintext.issuedAtBd * 86400))
T += LE32(8)                          + u64_be(response.bridgeIssuedAtUnix)
T += LE32(4)                          + u32_be(response.ttlSeconds)

assert verify_p256(sep_pub, sha256(T), base64_decode(response.transcriptSig))

# Derive K_session
K_session = HKDF_SHA256(
    IKM  = client_share + bridge_share,
    salt = client_nonce + session_id,
    info = b"sdi-session-key-v3",
    L    = 32,
)

zero(client_share); zero(bridge_share); zero(client_priv)
store(session_id, K_session, expires_at = response.bridgeIssuedAtUnix + response.ttlSeconds)
```

### E.2 Emit one OSC 7777 sequence (Shell → Agent)

```text
counter_be = u64_be(c_shell_to_agent); c_shell_to_agent += 1
iv         = random(12)
type       = b"ephemeral-auth"
ctx        = b"http://localhost:3005"

aad = LE32(1)              + b"\x01"        # dir_tag = 0x01 (Shell→Agent)
   || LE32(8)              + counter_be
   || LE32(len(type))      + type
   || LE32(len(ctx))       + ctx

payload    = utf8(json({type, context, ttl, issued_at, data}))
ct, tag    = aes256_gcm_encrypt(K_session, iv, aad, payload)

# Emit on /dev/tty (NOT stdout):
write_tty( "\x1b]7777;"
         + hex(session_id) + ";"
         + base64(counter_be) + ";"
         + utf8_str(type) + ";"
         + base64(ctx) + ";"
         + base64(iv) + ";"
         + base64(ct) + ";"
         + base64(tag)
         + "\x07" )
```

### E.3 Receive a push and write it to `/dev/tty`

```text
# On the persistent SDI_PUSH subscription:
event = ebp1.recv()
if event.event == "push":
    write_tty(unescape_unicode(event.sequence))   # \u001b → ESC, \u0007 → BEL
```

The shell's own input parser then sees a normal OSC 7777 sequence and runs the §4.6 decrypt path with `dir_tag = 0x02` (Agent → Shell).

### E.4 Verify a `geo-context` push (`Agent → Shell`)

```text
parsed = parse_osc_7777(input_bytes)              # session_id_hex, counter_b64, type, ctx_b64, iv_b64, ct_b64, tag_b64

session_id = hex_decode(parsed.session_id_hex)
counter    = base64_decode(parsed.counter_b64)    # 8 bytes big-endian
ct         = base64_decode(parsed.ct_b64)
tag        = base64_decode(parsed.tag_b64)
iv         = base64_decode(parsed.iv_b64)
ctx        = base64_decode(parsed.ctx_b64)
type       = parsed.type.encode()

aad = LE32(1) + b"\x02"                           # dir_tag = 0x02 (Agent→Shell)
   || LE32(8) + counter
   || LE32(len(type)) + type
   || LE32(len(ctx))  + ctx

assert in_replay_window(c_agent_to_shell_last, big_endian_u64(counter))
plaintext = aes256_gcm_decrypt(K_session, iv, aad, ct, tag)
c_agent_to_shell_last = max(c_agent_to_shell_last, big_endian_u64(counter))

geo = json_parse(plaintext)
if geo.error: handle_failure(geo)
else: update_zone_state(geo)
```

---

## Appendix F — Reference File Map

| File | Role |
|---|---|
| `enclave/EnclaveBridge/SocketServer.swift` | EBP/1 `AF_UNIX` socket lifecycle, accept loop, framing on `}`. Hosts SDI commands. |
| `enclave/EnclaveBridge/BridgeProtocolHandler.swift` | EBP/1 command dispatch, ECIES decrypt parser, `SDI_REGISTER` / `SDI_PUSH` / `SDI_GEO_*` handlers (v3 additions). |
| `enclave/EnclaveBridge/ECIES.swift` | secp256k1 ECDH, HKDF, AES-256-GCM. Used by both EBP/1 ECIES and SDI session derivation. |
| `enclave/EnclaveBridge/SecureEnclaveKeyManager.swift` | SEP P-256 key generation and signing. Used for `transcriptSig` in `SDI_REGISTER`. |
| `enclave/EnclaveBridge/ECIESKeyManager.swift` | secp256k1 private key persistence (`~/.enclave/ecies-privkey.bin`). |
| `enclave/EnclaveBridge/TOTPManager.swift` | RFC 6238 TOTP for optional `EXPORT_KEY` / `SDI_REGISTER` gating. |
| `enclave/EnclaveBridge/AppState.swift` | Connection and key inventory state. v3 adds session inventory: `(sessionId, K_session, expiresAt)` per registered connection. |
| `enclave/EnclaveBridge/GeoSocketServer.swift` | Geo socket of §7. Path indirection, peer-credential check, allowlist. |
| `enclave/EnclaveBridge/AuditLog.swift` | In-memory rolling audit log of §11.3. |
| `enclave-bridge-client/src/index.ts` | Client class extended with `sdiRegister`, `sdiSubscribePush`, `sdiGeoGet`, etc. |
| `enclave-bridge-client/src/sdi.ts` | OSC 7777 wire helpers: serialize, parse, AAD construction, counter management. |
| `enclave-bridge-client/src/sdi-keys.ts` | `K_session` derivation per §4.5.2; transcript construction and verification per §4.5.3. |
| `bsh/builtin/inject.bsh` | The `bsh-inject` builtin (§4.8). |
| `bsh/builtin/geo.bsh` | The `bsh-geo` and `bsh-geo-override` helpers (§7.6, §6.5.4). |
| `brightchain-api-lib/src/lib/secureEnclaveKeyring.ts` | Optional persistence layer for SDI-related secrets (e.g. pinned SEP fingerprint). |

---

*This specification is informational. The reference implementations live in the `enclave/`, `enclave-bridge-client/`, and `bsh/` trees. Discrepancies between this document and the source are bugs in this document; please file an issue.*
