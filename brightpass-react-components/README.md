# @brightchain/brightpass-react-components

BrightPass React UI components for the BrightChain password manager.

This library contains all BrightPass frontend components including views, widgets, dialogs, hooks, services, and context providers.

## Installation

```bash
yarn add @brightchain/brightpass-react-components
```

## Peer Dependencies

- `@brightchain/brightchain-lib`
- `@digitaldefiance/express-suite-react-components`
- `@mui/material` / `@mui/icons-material`
- `react` / `react-dom`
- `react-router-dom`

## Usage

```tsx
import { BrightPassRoutes } from '@brightchain/brightpass-react-components';

// In your router:
<Route path="/brightpass/*" element={<BrightPassRoutes />} />
```
