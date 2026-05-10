# brightledger-assets-react-components

React UI components for the BrightChain Programmable Asset Ledger.

## Components

- **AssetRegistryView** — table of all registered assets (symbol, display name, decimals, supply policy)
- **WalletBalances** — per-account balances per asset
- **TransferComposer** — compose and submit transfer actions
- **IssuerAdminPanel** — issuer-level governance (issue new asset, mint units)
- **AuditTrailView** — entry history with attestation visibility

## Usage

```tsx
import {
  AssetRegistryView,
  WalletBalances,
  TransferComposer,
  IssuerAdminPanel,
  AuditTrailView,
} from '@brightchain/brightledger-assets-react-components';
```

## Vocabulary

All identifiers and string literals in this package must follow approved
vocabulary: `issue`, `transfer`, `burn`, `freeze`, `attest`, `asset`,
`account`, `balance`, `entry`, `receipt`. See `scripts/check-assets-vocabulary.sh`.
