---
title: "BrightNexus BSLP Geo Registry"
parent: "Networking"
nav_order: 1
permalink: /networking/brightnexus-bslp-registry/
---

# BrightNexus BSLP Geo Registry

BrightNexus implements the **P2P registry tier** (priority 2) from the Bright Spacetime Location Protocol (BSLP). Logged-in BrightChain members publish self-signed IP → BST coordinate mappings with optional **Heisenberg** privacy metadata.

> **Rust / bcurl / bwget:** See [BSLP Rust Integration Guide](./bslp-rust-integration.md) for the full API contract, data model, light-floor math, and roadmap.

## API

All paths are under `{server}/api`. Publish requires a **member ECDSA signature** (see [Rust integration guide](./bslp-rust-integration.md#signing-contract)).

### Location registry — `/api/brightnexus/location`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/` | JWT | Publish or update coordinates for an IP (signed) |
| `POST` | `/signing-payload` | JWT | Canonical bytes to sign before publish |
| `GET` | `/mine` | JWT | List your announcements |
| `DELETE` | `/:ip` | JWT | Revoke an announcement |
| `GET` | `/lookup/:ip` | Public | DHT-style lookup (rate-limited, `signatureVerified`) |

### Discovery mirrors — `/api/brightnexus/discovery`

Tier-1-shaped responses from registry data (newest entry; optional `?verifiedOnly=true`):

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/ip/:ip/manifest` | Public | Well-known JSON (`application/json`) |
| `GET` | `/ip/:ip/dns.txt` | Public | `_bright` DNS TXT value (`text/plain`) |

Publish responses include derived `dnsTxt` (`_bright` TXT format) and `wellKnown` JSON for operators who self-host `/.well-known/bright-spacetime.json` on the target host.

## Enable

Set `ENABLED_FEATURES` to include `BrightNexus`, or use the default dev set (BrightNexus is enabled by default in `Environment`).

## Monorepo packages

- `@brightchain/brightnexus-lib` — BSLP types, validation, DNS TXT helpers
- `@brightchain/brightnexus-api-lib` — Express controllers + BrightDB service
- `@brightchain/brightnexus-react-components` — Registry dApp UI at `/brightnexus`

Storage uses BrightDB pool `brightnexus` and collection `brightnexus_location_registry`. That pool replicates across nodes via the standard [pool gossip and reconciliation](../storage/storage-pools-architecture.md) stack—no separate DHT implementation is required.
