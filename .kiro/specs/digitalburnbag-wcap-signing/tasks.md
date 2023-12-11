# Implementation Plan: Digital Burnbag WCAP Signing

## Overview

This plan implements WCAP (Web Content Authenticity Protocol) signing for the Digital Burnbag's file-serving pipeline. The implementation adds a `Content-Signature` header to file download/preview responses, signed with the authenticated member's secp256k1 identity key. The work is organized into four component groups matching the design: shared interfaces and header utilities in `digitalburnbag-lib`, then the signing middleware, PEM utilities, public key controller, and route wiring in `digitalburnbag-api-lib`.

## Tasks

- [x] 1. Create shared WCAP interfaces and header utilities in digitalburnbag-lib
  - [x] 1.1 Create `IWcapConfig` interface and `WCAP_DEFAULTS` constant
    - Create `digitalburnbag-lib/src/lib/interfaces/wcap-config.ts`
    - Define `IWcapConfig` with fields: `algorithmSuite` (string), `keyUriPath` (string), `kid` (optional string), `enabled` (boolean), `policy` (optional string — WCAP signing policy token per Section 13)
    - Define `WCAP_DEFAULTS` frozen object with default values: `algorithmSuite: 'dd-ecies-secp256k1-sha256'`, `keyUriPath: '/.well-known/wcap-public-key-secp256k1.pem'`, `enabled: true`
    - Export from `digitalburnbag-lib/src/lib/interfaces/index.ts`
    - _Requirements: 4.1, 10.1, 12.1_

  - [x] 1.2 Create Content-Signature header serialization and parsing utilities
    - Create `digitalburnbag-lib/src/lib/interfaces/wcap-header.ts`
    - Define `IContentSignatureParams` interface with fields: `alg`, `key_uri`, `sig` (all required strings), `kid` (optional string), `policy` (optional string)
    - Implement `serializeContentSignature(params)`: produces `alg=<alg>; key_uri=<key_uri>; sig=<sig>[; kid=<kid>][; policy=<policy>]`
    - Implement `parseContentSignature(header)`: splits on `; `, extracts `key=value` pairs, returns `IContentSignatureParams | undefined` for malformed input
    - Export from `digitalburnbag-lib/src/lib/interfaces/index.ts`
    - _Requirements: 1.3, 1.4, 7.1, 7.2, 7.5, 11.1, 11.2, 11.3, 12.5_

  - [x] 1.3 Write unit tests for header serialization and parsing
    - Create `digitalburnbag-lib/src/lib/__tests__/wcap-header.spec.ts`
    - Test happy path: serialize known params, verify exact string output
    - Test with `kid` present and absent
    - Test parsing a valid header string back to params
    - Test parsing malformed headers returns `undefined`
    - Test empty string, missing fields, extra semicolons
    - _Requirements: 7.1, 7.5, 11.1_

  - [x] 1.4 Write property test for Content-Signature header round-trip (Property 2)
    - Create `digitalburnbag-lib/src/lib/__tests__/wcap-header.property.spec.ts`
    - **Property 2: Content-Signature header serialization round-trip**
    - **Validates: Requirements 1.3, 1.4, 7.1, 7.2, 7.5, 11.1, 11.2, 11.3, 12.5**
    - Generate random `IContentSignatureParams` with `alg` and `key_uri` as non-empty ASCII strings excluding `=`, `;`, and space; `sig` as base64 of random 64-byte buffer; optional `kid`; optional `policy` as non-empty ASCII string excluding `=`, `;`, and space
    - Assert `parseContentSignature(serializeContentSignature(params))` produces identical field values
    - Use `fast-check` with minimum 100 iterations

- [x] 2. Checkpoint — Verify shared interfaces and header utilities
  - Ensure `yarn nx test digitalburnbag-lib --testPathPatterns=wcap-header` passes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement PEM encoding utilities in digitalburnbag-api-lib
  - [x] 3.1 Create `compressedKeyToPem` and `pemToCompressedKey` functions
    - Create `digitalburnbag-api-lib/src/lib/middleware/compressed-key-to-pem.ts`
    - Implement `compressedKeyToPem(compressedKey: Uint8Array): string` — concatenate the fixed 26-byte DER prefix for secp256k1 SubjectPublicKeyInfo with the 33-byte compressed key, base64-encode, wrap at 64 chars, add PEM armor
    - Implement `pemToCompressedKey(pem: string): Uint8Array | undefined` — strip PEM armor, base64-decode, verify 59-byte DER length and secp256k1 OID prefix, extract last 33 bytes
    - Validate input: `compressedKeyToPem` should verify key is 33 bytes with 0x02 or 0x03 prefix
    - _Requirements: 3.2, 8.1, 8.2, 8.3_

  - [x] 3.2 Write property test for PEM encoding round-trip (Property 4)
    - Create `digitalburnbag-api-lib/src/lib/__tests__/middleware/compressed-key-to-pem.property.spec.ts`
    - **Property 4: Public key PEM encoding round-trip**
    - **Validates: Requirements 3.2, 8.1, 8.2, 8.3**
    - Generate random 33-byte arrays with first byte constrained to 0x02 or 0x03
    - Assert `pemToCompressedKey(compressedKeyToPem(key))` produces byte-identical output
    - Use `fast-check` with minimum 100 iterations

- [x] 4. Implement WCAP signing middleware in digitalburnbag-api-lib
  - [x] 4.1 Create `createWcapSigningMiddleware` factory function
    - Create `digitalburnbag-api-lib/src/lib/middleware/wcap-signing-middleware.ts`
    - Define `IWcapSigningContext` interface with `getPrivateKey`, `config`, and optional `logger`
    - Implement the factory: returns Express middleware `(req, res, next) => void`
    - If `config.enabled === false`, call `next()` immediately (no-op)
    - Wrap `res.end()` to intercept the response body buffer
    - On `res.end(buf)`: if status is 200 and body is non-empty, compute `SHA-256(buf)` via `crypto.createHash('sha256')`, sign hash with `EciesSignature.signMessage(privateKey, hash)`, serialize `Content-Signature` header via `serializeContentSignature()` including `policy` from `config.policy` if set, set header on response, call original `res.end(buf)`
    - If `getPrivateKey(req)` returns `undefined`, log warning and serve without signing
    - If signing throws, catch error, log it, and serve without signing
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 4.2, 5.1, 5.3, 5.4, 6.2, 9.1, 12.2, 12.3_

  - [x] 4.2 Write unit tests for WCAP signing middleware
    - Create `digitalburnbag-api-lib/src/lib/__tests__/middleware/wcap-signing-middleware.spec.ts`
    - Test: middleware adds `Content-Signature` header on HTTP 200 with known key pair and body
    - Test: middleware skips signing when `config.enabled === false`
    - Test: middleware skips signing when `getPrivateKey` returns `undefined`, warning logged
    - Test: middleware skips signing when `signMessage` throws, error logged
    - Test: middleware skips signing for non-200 status codes (404, 500)
    - Test: header includes `kid` when configured
    - Test: header excludes `kid` when not configured
    - Test: header includes `policy` when `config.policy` is set (e.g. `'decryption-verified'`)
    - Test: header excludes `policy` when `config.policy` is not set
    - Test: all pre-existing response headers and body bytes are preserved
    - Test: large body (>10MB) is still signed
    - _Requirements: 1.1, 1.4, 1.6, 1.7, 2.3, 4.2, 6.2, 9.2, 12.2, 12.3_

  - [x] 4.3 Write property test for sign-then-verify round-trip (Property 1)
    - Create or append to `digitalburnbag-api-lib/src/lib/__tests__/middleware/wcap-signing-middleware.property.spec.ts`
    - **Property 1: Sign-then-verify round-trip**
    - **Validates: Requirements 1.1, 1.2, 5.3**
    - Generate random body buffers (1 byte to 1 MB) and valid secp256k1 key pairs via `EciesCryptoCore`
    - Compute SHA-256 of body, sign with `EciesSignature.signMessage(privateKey, hash)`, verify with `EciesSignature.verifyMessage(publicKey, hash, signature)`
    - Assert verification returns `true`
    - Use `fast-check` with minimum 100 iterations

  - [x] 4.4 Write property test for middleware preserving response integrity (Property 3)
    - Append to `digitalburnbag-api-lib/src/lib/__tests__/middleware/wcap-signing-middleware.property.spec.ts`
    - **Property 3: Middleware preserves response integrity**
    - **Validates: Requirements 2.3**
    - Generate random pre-existing response headers (key-value string pairs), random body buffer, status 200
    - Assert all pre-existing headers, status code, and exact body bytes are preserved after middleware runs
    - Assert only addition is the `Content-Signature` header
    - Use `fast-check` with minimum 100 iterations

  - [x] 4.5 Write property test for non-200 responses not signed (Property 5)
    - Append to `digitalburnbag-api-lib/src/lib/__tests__/middleware/wcap-signing-middleware.property.spec.ts`
    - **Property 5: Non-200 responses are not signed**
    - **Validates: Requirements 6.2**
    - Generate random HTTP status codes from 100–199 and 201–599
    - Assert middleware does NOT add `Content-Signature` header
    - Use `fast-check` with minimum 100 iterations

- [x] 5. Checkpoint — Verify middleware and PEM utilities
  - Ensure `yarn nx test digitalburnbag-api-lib --testPathPatterns=wcap-signing-middleware` passes
  - Ensure `yarn nx test digitalburnbag-api-lib --testPathPatterns=compressed-key-to-pem` passes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement WCAP config validation and public key controller
  - [x] 6.1 Create WCAP config validation function
    - Create `digitalburnbag-api-lib/src/lib/config/wcapConfig.ts`
    - Implement `validateWcapConfig(config: IWcapConfig, logger?)` that logs a warning if `algorithmSuite` is not `dd-ecies-secp256k1-sha256`
    - Export from `digitalburnbag-api-lib/src/lib/config/index.ts`
    - _Requirements: 4.3_

  - [x] 6.2 Write unit tests for WCAP config validation
    - Create `digitalburnbag-api-lib/src/lib/__tests__/config/wcapConfig.spec.ts`
    - Test: no warning for default algorithm suite
    - Test: warning logged for unknown algorithm suite
    - _Requirements: 4.3_

  - [x] 6.3 Create `WcapPublicKeyController`
    - Create `digitalburnbag-api-lib/src/lib/controllers/wcap-public-key-controller.ts`
    - Implement as a simple Express router (not BaseController) with a single GET handler
    - Mount at `/.well-known/wcap-public-key-secp256k1.pem`
    - No authentication required
    - Return the member's compressed secp256k1 public key in PEM format via `compressedKeyToPem()`
    - Set `Content-Type: application/x-pem-file`
    - Set `Cache-Control: public, max-age=86400`
    - Return HTTP 503 with descriptive JSON error when public key is not available
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1_

  - [x] 6.4 Write unit tests for WcapPublicKeyController
    - Create `digitalburnbag-api-lib/src/lib/__tests__/controller-integration/wcap-public-key-controller.spec.ts`
    - Test: returns valid PEM with correct Content-Type
    - Test: returns 503 when public key is not available
    - Test: sets `Cache-Control: public, max-age=86400`
    - Test: accessible without authentication
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7. Checkpoint — Verify config validation and public key controller
  - Ensure `yarn nx test digitalburnbag-api-lib --testPathPatterns=wcapConfig` passes
  - Ensure `yarn nx test digitalburnbag-api-lib --testPathPatterns=wcap-public-key-controller` passes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Wire WCAP middleware into FileController and register public key route
  - [x] 8.1 Extend `IFileControllerDeps` with optional WCAP middleware
    - Add `wcapMiddleware?: RequestHandler` to `IFileControllerDeps` in `digitalburnbag-api-lib/src/lib/controllers/file-controller.ts`
    - _Requirements: 2.4, 6.1_

  - [x] 8.2 Apply WCAP middleware to file-serving routes in `FileController.initRouteDefinitions()`
    - Add `middleware: wcapMiddleware ? [wcapMiddleware] : []` to the three file-serving route configs: `downloadFile` (`GET /:id`), `previewFile` (`GET /:id/preview`), `downloadVersion` (`GET /:id/versions/:versionId/download`)
    - Do NOT apply to non-file routes: `searchFiles`, `getFileMetadata`, `getVersionHistory`, `updateMetadata`, `deleteFile`, etc.
    - _Requirements: 1.5, 2.4, 6.1, 6.3_

  - [x] 8.3 Register `WcapPublicKeyController` route in `registerBurnbagRoutesOnRouter`
    - Import and instantiate `WcapPublicKeyController` in `digitalburnbag-api-lib/src/lib/controllers/register-routes.ts`
    - Mount the controller's router at `/.well-known` on the parent router
    - Pass WCAP config and public key provider through `IAllBurnbagControllerDeps` or a separate parameter
    - _Requirements: 3.1, 3.3_

  - [x] 8.4 Update `IAllBurnbagControllerDeps` to include WCAP dependencies
    - Add WCAP-related fields (config, middleware instance) to the deps interface
    - Update `create-burnbag-deps.ts` wiring to construct the WCAP middleware from the operator/system member context (not the end-user session)
    - Set `policy: 'decryption-verified'` in the default Burnbag WCAP config, reflecting that files are decrypted from ECIES block storage before signing
    - _Requirements: 2.4, 5.1, 5.2, 10.2, 10.3, 12.2, 12.3, 12.4_

  - [x] 8.5 Write integration tests for WCAP on file-serving routes
    - Create or extend `digitalburnbag-api-lib/src/lib/__tests__/controller-integration/wcap-file-integration.spec.ts`
    - Test: `GET /:id` (downloadFile) response includes `Content-Signature` header
    - Test: `GET /:id/preview` (previewFile) response includes `Content-Signature` header
    - Test: `GET /:id/versions/:versionId/download` (downloadVersion) response includes `Content-Signature` header
    - Test: `GET /search` does NOT include `Content-Signature` header
    - Test: `GET /:id/metadata` does NOT include `Content-Signature` header
    - _Requirements: 1.5, 6.1, 6.3_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Run `yarn nx test digitalburnbag-lib --testPathPatterns=wcap` to verify shared library tests
  - Run `yarn nx test digitalburnbag-api-lib --testPathPatterns=wcap` to verify API library tests
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each component group
- Property tests validate the 5 universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation language is TypeScript throughout, matching the design document
- Tests use Jest and fast-check, consistent with existing project conventions
- Run tests with `yarn nx test <project>` as per project conventions
