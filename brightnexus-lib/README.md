# BrightNexus Lib (`@brightchain/brightnexus-lib`)

Shared types and helpers for the **Bright Spacetime Location Protocol (BSLP)** — the decentralized geo-IP registry used by BrightNexus DHT lookups and the Bright Utils suite (`bcurl`, `bping`, `btraceroute`).

## Contents

- **BSLP data model** — `IBrightSpacetimeVector`, Heisenberg privacy metadata, publish/lookup DTOs
- **Validation** — coordinate bounds, IP format, Heisenberg consistency rules
- **DNS TXT** — `formatBrightDnsTxt` / `parseBrightDnsTxt` for `_bright` records
- **Well-known manifest** — `/.well-known/bright-spacetime.json` shape

## BrightDB shard

Registry documents live in pool `brightnexus` (see `BrightNexusBrightDBPoolID`).
