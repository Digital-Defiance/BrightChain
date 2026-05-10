# brightledger-assets-api-lib

Validator, reducer, and projected state engine for the BrightChain programmable asset ledger (Layer 3).

## Overview

This package provides:

- **`IAssetProjectedState`** — read-only in-memory view of all asset balances, nonces, frozen flags, whitelists, issuer sets, and settlement state
- **`AssetActionValidator`** — pure, I/O-free validation of every action kind against current projected state; enforces conservation, quorum, nonce ordering, and all business rules from the spec
- **`AssetStateReducer`** — pure state transition; assumes pre-validation; returns a new `IAssetProjectedState`

## Architecture

```
IAssetAction  ──►  AssetActionValidator  ──►  valid / error
                                         │
                                         ▼ (on valid)
                                   AssetStateReducer
                                         │
                                         ▼
                               IAssetProjectedState (new)
```

Both classes perform no I/O and have no side effects. They are designed for use in the `SubmissionService` pipeline and are fully testable in isolation.

## Peer Dependencies

- `@brightchain/brightchain-lib` — `AuthorizedSignerSet`, `IBrightTrustPolicy`, `QuorumType`, `SignerRole`
- `@brightchain/brightledger-assets-lib` — all payload types, `AssetErrorCode`, `ActionKind`, `AssetIdBuffer`
