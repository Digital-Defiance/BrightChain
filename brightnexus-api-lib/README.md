# BrightNexus API Lib (`@brightchain/brightnexus-api-lib`)

Express controllers and BrightDB-backed services for the BrightNexus geo-IP / BST registry (BSLP DHT tier).

## API (mounted at `/api/brightnexus/location`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | JWT | Publish IP → BST + Heisenberg metadata |
| GET | `/mine` | JWT | List your announcements |
| DELETE | `/:ip` | JWT | Revoke announcement for IP |
| GET | `/lookup/:ip` | Public | DHT registry lookup for `bcurl` / Brightdate-rust |

Responses include derived `dnsTxt` and `wellKnown` manifest fragments for self-hosting.
