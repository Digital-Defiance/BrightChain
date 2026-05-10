# brightledger-assets-lib

Browser-safe domain library for the BrightLedger programmable asset layer.

Provides typed action payloads, a canonical CBOR serializer, Asset ID derivation, and SDK constructors. Designed for use in both browser and Node.js environments.

## Features

- **Typed payloads** — All 18 asset action kinds with discriminated-union `IAssetAction`
- **Serializer** — `AssetActionSerializer`: versioned CBOR encoding / decoding with `MalformedActionError` on invalid input
- **Asset ID derivation** — `deriveAssetId(issuerPublicKey, issuanceEntryHash)` using SHA-256 (browser-safe via `@noble/hashes`)

## Installation

```bash
yarn add @brightchain/brightledger-assets-lib
```

## Usage

```typescript
import { AssetActionSerializer, deriveAssetId, ActionKind } from '@brightchain/brightledger-assets-lib';

const assetId = deriveAssetId(issuerPublicKey, issuanceEntryHash);

const action: IIssueAssetAction = {
  kind: ActionKind.IssueAsset,
  symbol: 'TKN',
  // ...
};

const bytes = AssetActionSerializer.serialize(action);
const decoded = AssetActionSerializer.deserialize(bytes);
```
