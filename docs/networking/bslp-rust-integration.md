---
title: "BSLP Rust Integration Guide"
parent: "Networking"
nav_order: 2
permalink: /networking/bslp-rust-integration/
---

# BSLP integration guide for `brightdate-rust`, `bcurl`, and `bwget`

This document describes what BrightChain implements today for the **Bright Spacetime Location Protocol (BSLP)** and how Rust tools should consume it. It complements the design narrative in [The Blueprint for bcurl / bwget](https://github.com/Digital-Defiance/brightdate-rust) (brightdate-rust repo) and the in-repo [BrightNexus BSLP Geo Registry](./brightnexus-bslp-registry.md).

## What we built

BrightNexus is the **tier-2 (P2P registry)** source in the BSLP lookup fallback matrix. Logged-in BrightChain members publish **IP → BrightSpacetime (BST) coordinates** plus optional **Heisenberg** privacy metadata. Tools such as `bcurl` and `bwget` use the result to compute **light-floor** latency and transfer efficiency.

Implementation is an Nx slice of the monorepo:

| Package | Role |
|---------|------|
| `@brightchain/brightnexus-lib` | Protocol types, validation, DNS TXT format/parse, well-known JSON shape |
| `@brightchain/brightnexus-api-lib` | `LocationRegistryService` (BrightDB) + HTTP controller |
| `@brightchain/brightnexus-react-components` | dApp at `/brightnexus` (publish UI) |

Subsystem: `BrightNexusSubsystemPlugin` mounts routes when `BrightNexus` is in `ENABLED_FEATURES`.

---

## Lookup fallback matrix (client responsibility)

`bcurl` / `bwget` should resolve a target’s BST coordinates in this order:

| Priority | Source | Mechanism | Pedigree tag |
|----------|--------|-----------|--------------|
| 1 | Target host | DNS TXT at `_bright.<hostname>` | `DNS` |
| 1b | Target host | `GET /.well-known/bright-spacetime.json` | `WELL_KNOWN` |
| 2 | BrightNexus registry | `GET /api/brightnexus/location/lookup/{ip}` | `DHT` |
| 2b | BrightNexus discovery (optional) | `GET /api/brightnexus/discovery/ip/{ip}/manifest` or `.../dns.txt` | `DHT` |
| 3 | Legacy GeoIP | Local MaxMind-style DB (optional) | `GEO` |

**Tier 1 on the target host:** DNS TXT and `/.well-known/bright-spacetime.json` are normally hosted by the **target** operator. BrightChain does not configure their DNS zone. The publish API returns `dnsTxt` and `wellKnown` for paste/deploy.

**Tier 2b:** When tier 1 is unavailable, clients may use BrightNexus **discovery mirrors** (same data as lookup, single best entry, well-known or TXT shape). Prefer `lookup` when you need all publishers or `signatureVerified` per entry.

---

## Storage and replication

Registry documents live in a **dedicated BrightDB shard**:

| Constant | Value |
|----------|--------|
| BrightDB name | `brightnexus` |
| Pool ID | `brightnexus` |
| Collection | `brightnexus_location_registry` |
| Unique key | `(memberIdHex, ipAddress)` per publisher |

**Replication:** No separate “BrightNexus DHT” layer is required. The `brightnexus` pool participates in the same **pool-scoped gossip, reconciliation, and discovery** as other BrightChain pools. When nodes share the pool, registry blocks and collection head state replicate like any other BrightDB data. See [Storage Pools Architecture](../storage/storage-pools-architecture.md) and [Storage Pools walkthrough](../walkthroughs/03-storage-pools.md).

**Semantics:**

- Upsert per member + IP (one announcement per publisher per IP).
- Multiple members may announce the same IP; lookup returns all entries, newest `updatedAt` first.
- Revoke deletes only the authenticated member’s row.

---

## Data model

### `BrightSpacetimeVector`

```json
{
  "lat": 47.1996,
  "lon": -122.2531,
  "alt": 140,
  "epoch": "J2000.0"
}
```

Validation (publish): `lat` ∈ [−90, 90], `lon` ∈ [−180, 180], `alt` ∈ [−500, 100_000], non-empty `epoch` (default `J2000.0`).

### `BrightSpacetimePrivacy`

```json
{
  "mode": "heisenberg",
  "injectedDelayMd": 0.005,
  "fuzzRadiusKm": 50
}
```

| `mode` | Rules |
|--------|--------|
| `exact` | `injectedDelayMd === 0` and `fuzzRadiusKm === 0` |
| `heisenberg` | `fuzzRadiusKm > 0`, `injectedDelayMd ≥ 0` |

**Heisenberg** = declared temporal noise (millidays). Auditors subtract `injectedDelayMd` from measured RTT before comparing to the physical light-floor (fair audit; cannot spoof “closer than physics allows”).

### Lookup entry (public)

```json
{
  "memberIdHex": "<hex>",
  "ipAddress": "203.0.113.42",
  "vector": { "lat": 47.1996, "lon": -122.2531, "alt": 140, "epoch": "J2000.0" },
  "privacy": { "mode": "heisenberg", "injectedDelayMd": 0.005, "fuzzRadiusKm": 50 },
  "signature": "<hex, no 0x prefix required>",
  "signatureVerified": true,
  "updatedAt": "2026-06-02T12:00:00.000Z",
  "lookupSource": "DHT"
}
```

`signatureVerified` is computed by the node: ECDSA verify of `signature` over the canonical publish payload using the member's stored secp256k1 public key. Use `?verifiedOnly=true` on lookup/discovery to ignore failed entries.

TypeScript enums: `BslpPrivacyMode` (`exact` | `heisenberg`), `LocationLookupSource` (`DHT` | `DNS` | `WELL_KNOWN` | `GEO`).

---

## Signing contract

Publish **requires** `signature` (hex). Algorithm matches BrightChain member auth: **ECDSA secp256k1** via DD-ECIES (`member.sign` / `verifyMessage`).

### Signable payload (JSON object before hashing/signing)

Fields (no `signature` key):

| Field | Value |
|-------|--------|
| `protocol` | `"bright-spacetime"` |
| `version` | `"1.0"` |
| `ipAddress` | Trimmed IP string from publish body |
| `nodeId` | Publisher `memberIdHex` (same as JWT subject id string) |
| `vector` | Normalized vector (`epoch` default `J2000.0` if empty) |
| `privacy` | Exact copy from publish body |

### Canonical JSON

1. Build the object above (`buildBslpSignablePayload` in TypeScript).
2. Recursively sort **object** keys alphabetically at every level (arrays keep element order).
3. `JSON.stringify` with no extra whitespace.
4. Sign the **UTF-8 bytes** of that string with the member private key.
5. Send signature as **hex** (optional `0x` prefix accepted on verify).

Reference: `brightnexus-lib/src/lib/bslp/signing.ts` — `canonicalBslpSignPayloadJson`, `canonicalBslpSignPayloadBytes`, `canonicalBslpSignPayloadHex`.

### Rust implementation notes

- Reproduce canonical JSON exactly; any key-order or whitespace drift breaks verification.
- To obtain bytes without publishing: `POST /api/brightnexus/location/signing-payload` (JWT) with `{ ipAddress, vector, privacy }` → `{ payloadHex, canonicalJson, memberIdHex }`.
- TypeScript test helper: `signBslpPublishBody(mnemonic, username, email, memberIdHex, body)` in `@brightchain/brightnexus-api-lib` (uses `Member.sign` on canonical bytes).

---

## HTTP API

Base: `{server}/api/brightnexus/location`

### Publish (JWT required)

```http
POST /api/brightnexus/location
Authorization: Bearer <jwt>
Content-Type: application/json
```

Body: `ipAddress`, `vector`, `privacy`, **`signature` (required, hex)**.

Signatures use ECDSA secp256k1 over the canonical JSON from `buildBslpSignablePayload(memberIdHex, body)` (`brightnexus-lib` → `canonicalBslpSignPayloadJson`). The server verifies against the member's stored public key; invalid signatures are rejected with HTTP 400.

**Signing helper (TypeScript / tests):** `signBslpPublishBody` in `@brightchain/brightnexus-api-lib` (mnemonic + username + email + `memberId`).

**Preview bytes to sign (JWT):**

```http
POST /api/brightnexus/location/signing-payload
```

Returns `{ payloadHex, canonicalJson, memberIdHex }`.

Response includes `record`, `dnsTxt`, `wellKnown` for tier-1 self-hosting.

### List mine (JWT required)

```http
GET /api/brightnexus/location/mine
```

### Public lookup — primary Rust integration point

```http
GET /api/brightnexus/location/lookup/{ip}?verifiedOnly=true
```

No authentication. Rate-limited (120 req/min/IP, `X-RateLimit-*` headers). URL-encode IPv6.

Query `verifiedOnly=true` returns only entries whose signature verifies against the publisher's public key.

Each entry includes `signatureVerified: boolean`.

Response shape:

```json
{
  "message": "OK",
  "ipAddress": "203.0.113.42",
  "entries": [ /* IBrightNexusLocationLookupEntry[], newest first */ ]
}
```

Empty `entries` ⇒ no announcements on this node for that IP (try peers or tier 3).

### Discovery mirrors (tier-1 from registry)

Served from BrightNexus when operators have not yet self-hosted DNS / well-known:

| Path | Content-Type |
|------|----------------|
| `GET /api/brightnexus/discovery/ip/{ip}/manifest` | `application/json` (well-known shape) |
| `GET /api/brightnexus/discovery/ip/{ip}/dns.txt` | `text/plain` (`_bright` TXT value) |

Optional `?verifiedOnly=true` on both. Same rate limits as lookup.

### Revoke (JWT required)

```http
DELETE /api/brightnexus/location/{ip}
```

---

## Tier 1: DNS TXT (`_bright`)

**Name:** `_bright.<hostname>` (e.g. `_bright.example.com`)

**Value:**

```text
bst=<lat>,<lon>,<alt>m;epoch=<epoch>;[heisenberg=<delay>md];[fuzz=<radius>km]
```

**Example:**

```text
bst=47.1996,-122.2531,140m;epoch=J2000.0;heisenberg=0.005md;fuzz=50km
```

Reference implementation: `brightnexus-lib` → `formatBrightDnsTxt` / `parseBrightDnsTxt`.

---

## Tier 1: Well-known HTTP

**Path:** `/.well-known/bright-spacetime.json`

```json
{
  "protocol": "bright-spacetime",
  "version": "1.0",
  "nodeId": "optional-node-id",
  "vector": { "lat": 47.1996, "lon": -122.2531, "alt": 140, "epoch": "J2000.0" },
  "privacy": { "mode": "heisenberg", "injectedDelayMd": 0.005, "fuzzRadiusKm": 50 },
  "signature": "0x..."
}
```

---

## Light-floor and efficiency (Rust)

Physical constants (from BSLP / Bright Utils blueprint):

| Constant | Value | Use |
|----------|--------|-----|
| c (vacuum) | 299 792.458 km/s | Absolute limit |
| c_fiber | ~200 000 km/s | Default terrestrial fiber baseline |
| Milliday (md) | 86.4 s | Bright suite time unit |
| Microday (µd) | 86.4 ms | Fine RTT sampling |

Suggested client logic:

```text
distance_km   = geodesic(observer_bst, target_bst)   // Haversine or ECEF
floor_seconds = distance_km / 200_000.0 * 1000.0
floor_md      = floor_seconds / 86.4

adjusted_rtt_md = rtt_best_md
if target.privacy.mode == heisenberg:
    adjusted_rtt_md -= target.privacy.injected_delay_md

// Impossible if adjusted_rtt_md < floor_md (lying or bad clocks)
efficiency = floor_md / adjusted_rtt_md   when adjusted_rtt_md > 0
```

Display pedigree in UI: `[BST]` / `[DHT]` / `[GEO]` (bold/cyan for verified tiers, dim for `GEO`).

---

## Suggested Rust module layout

```rust
// Resolution (fallback matrix)
pub async fn resolve_bst(host_or_ip: &str, api_base: &str) -> ResolvedCoordinates;

// Tier 2
pub async fn lookup_brightnexus_dht(
    api_base: &str,
    ip: &str,
    verified_only: bool,
) -> Vec<LocationEntry>;

pub async fn fetch_discovery_manifest(
    api_base: &str,
    ip: &str,
    verified_only: bool,
) -> Option<WellKnownManifest>;

pub async fn fetch_discovery_dns_txt(
    api_base: &str,
    ip: &str,
    verified_only: bool,
) -> Option<String>;

// Tier 1 (target host)
pub fn parse_bright_dns_txt(txt: &str) -> Option<ParsedBst>;
pub async fn fetch_well_known(url: &Url) -> Option<WellKnownManifest>;

// Signing (publishers)
pub fn canonical_bslp_sign_json(member_id_hex: &str, body: &PublishBody) -> String;
pub fn sign_bslp_publish(member_key: &MemberKey, payload_json: &str) -> String;

// Physics
pub fn light_floor_md(observer: &Bst, target: &Bst) -> f64;
pub fn adjusted_rtt_md(rtt_best_md: f64, privacy: &Privacy) -> f64;
```

Default `api_base`: `http://127.0.0.1:3001/api` (or `APP_CONFIG.apiUrl` equivalent).

---

## Server status vs Rust work

### Implemented on BrightChain (today)

| Item | Notes |
|------|--------|
| BrightDB pool `brightnexus` + gossip replication | Multi-node registry consistency |
| Publish / mine / revoke / public lookup | JWT + signed publish |
| Signature verify on publish | Invalid signatures → HTTP 400 |
| `signatureVerified` on lookup | Per-entry; `?verifiedOnly=true` |
| Public lookup + discovery rate limits | 120 req/min/IP |
| Discovery mirrors | `/api/brightnexus/discovery/ip/{ip}/manifest` and `.../dns.txt` |
| `POST .../signing-payload` | Canonical bytes for external signers |

### Rust repo (`brightdate-rust`, `bcurl`, `bwget`) — handoff focus

| Item | Priority | Notes |
|------|----------|--------|
| **Resolver + fallback matrix** | **P0** | DNS → target well-known → lookup → discovery → GeoIP |
| **Canonical signing + verify** | **P0** | Match `signing.ts`; required to publish from Rust/CLI |
| **Light-floor + Heisenberg adjust** | **P0** | See formulas below |
| **Prefer `verifiedOnly` for trust** | **P1** | Treat unverified DHT entries as untrusted hints |

### Not implemented (either side)

| Item | Notes |
|------|--------|
| Multilateration / physicality audit | Observer mesh / `bping`; not registry v1 |
| BrightLink local-socket geo IPC | Separate from this HTTP registry; see `docs/papers/brightlink.md` |
| Auto DNS on target zones | Operators deploy `dnsTxt` from publish response |
| Congestion floor (historical RTT) | Future diagnostic |
| Node serves `/.well-known` on **target** hostname | Target operator responsibility; tier 2b mirrors are on BrightChain API only |

---

## Enable on a node

```bash
ENABLED_FEATURES=...,BrightNexus
```

Default dev `Environment` includes `BrightNexus`. React dApp: `/brightnexus`.

---

## Tests

| Target | Command |
|--------|---------|
| Lib | `yarn nx test brightnexus-lib` |
| API lib | `yarn nx test brightnexus-api-lib` |
| E2E | `yarn nx e2e brightchain-api-e2e --testPathPatterns=brightnexus-location` |

E2E covers: register (mnemonic) → sign → publish → `mine` → public lookup (`signatureVerified`) → discovery manifest → revoke.

---

## Source files (TypeScript)

| Area | Path |
|------|------|
| Types & validation | `brightnexus-lib/src/lib/` |
| DNS / well-known / signing | `brightnexus-lib/src/lib/bslp/` (`signing.ts`, `dns-txt.ts`, `well-known.ts`) |
| Client signing helper | `brightnexus-api-lib/src/lib/bslp-client-signing.ts` |
| Signature verify | `brightnexus-api-lib/src/lib/services/bslp-signature-verifier.ts` |
| Registry service | `brightnexus-api-lib/src/lib/services/location-registry-service.ts` |
| HTTP location routes | `brightnexus-api-lib/src/lib/controllers/location-controller.ts` |
| HTTP discovery routes | `brightnexus-api-lib/src/lib/controllers/discovery-routes.ts` |
| Route registration | `brightnexus-api-lib/src/lib/controllers/register-routes.ts` |
| Plugin wiring | `brightchain-api-lib/src/lib/plugins/subsystems/brightNexusSubsystemPlugin.ts` |
| Lookup rate limit | `brightchain-api-lib/src/lib/middlewares/brightnexus-lookup-rate-limiter.ts` |
| Operator doc | `docs/networking/brightnexus-bslp-registry.md` |

---

## Related docs

- [BrightNexus BSLP Geo Registry](./brightnexus-bslp-registry.md) — operator-focused summary
- [Storage Pools Architecture](../storage/storage-pools-architecture.md) — replication model
- [Gossip Delivery Protocol](../networking/gossip-delivery-protocol.md) — announcements
