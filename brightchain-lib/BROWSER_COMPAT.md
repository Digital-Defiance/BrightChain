# Browser Compatibility Guide — `brightchain-lib`

`brightchain-lib` is the shared library used by both frontend (`brightchain-react`) and backend (`brightchain-api-lib`, `brightchain-db`) packages. It should remain browser-compatible wherever possible so that types, interfaces, and core logic can be consumed by web applications without Node.js polyfills.

## Platform Detection Boundary Pattern

When Node.js-specific code is unavoidable, `brightchain-lib` uses a **platform detection boundary** to isolate it. The canonical example is [`src/lib/crypto/platformCrypto.ts`](src/lib/crypto/platformCrypto.ts):

```typescript
import { isBrowserEnvironment } from './platformCrypto';

if (isBrowserEnvironment()) {
  // Use Web Crypto API (window.crypto.getRandomValues)
} else {
  // Lazy-load Node.js crypto via require('crypto')
}
```

Key rules for this pattern:

1. **Never import Node.js modules at the top level.** Use dynamic `require()` inside a runtime branch so bundlers can tree-shake the Node.js path.
2. **Detect the environment at call time**, not at module load time. Use `isBrowserEnvironment()` / `isNodeEnvironment()` from `platformCrypto.ts`.
3. **Prefer cross-platform libraries** (`@noble/hashes`, `@noble/curves`, `TextEncoder`/`TextDecoder`) over platform-specific APIs when performance is acceptable.

## Known Platform-Specific Files

| File                                        | Node.js Dependency                             | Why It Exists                                                                                                       | Notes                                                                                                                         |
| ------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/crypto/platformCrypto.ts`          | `require('crypto')` (lazy)                     | `getRandomBytes()` needs a CSPRNG; Web Crypto API has a 65 KB limit per call                                        | Already behind platform detection boundary — the correct pattern                                                              |
| `src/lib/services/messaging/emailParser.ts` | `Buffer.from()`                                | Base64/quoted-printable decoding and charset conversion (ISO-8859-1, ASCII, etc.) in RFC 2047 encoded-word handling | Could be replaced with `TextDecoder` + `atob()` for browser use, or moved to `brightchain-api-lib`                            |
| `src/lib/types/checksum.ts`                 | `Buffer` type in `fromBuffer()` / `toBuffer()` | Convenience methods for Node.js callers                                                                             | Both methods are **deprecated** — use `fromUint8Array()` / `toUint8Array()` instead. Internal storage is already `Uint8Array` |

## Guidelines for Contributors

### Do

- Use `Uint8Array` in all new interfaces and shared types. `Buffer` is a Node.js-only global.
- Use `TextEncoder` / `TextDecoder` for string ↔ bytes conversion.
- Use `@noble/hashes` and `@noble/curves` for cryptographic operations (already project dependencies).
- Use `crypto.getRandomValues()` (Web Crypto API) for random bytes in browser-targeted code.
- Mark any unavoidable Node.js code with `@platform Node.js` in its JSDoc.

### Don't

- Import `fs`, `path`, `crypto`, `os`, `net`, `child_process`, or `buffer` at the top level of any file in `brightchain-lib`.
- Use `Buffer` in interface definitions — use `Uint8Array` with a generic type parameter (`<TData>`) if backend code needs `Buffer`.
- Add Node.js-only dependencies to `brightchain-lib`'s `package.json`. If a dependency requires Node.js, the code belongs in `brightchain-api-lib` or `brightchain-db`.

### When Node.js Code Is Unavoidable

1. Isolate it behind the platform detection boundary (see pattern above).
2. Add a `@platform Node.js` JSDoc tag explaining what Node.js API is used and why.
3. Add an entry to the table in this file.
4. Consider whether the code should live in `brightchain-api-lib` instead.
