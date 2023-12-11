# Implementation Plan: Vault Access Audit Logging

## Overview

This plan implements systematic audit logging for every vault file access across the BrightChain platform. The implementation proceeds bottom-up: shared enumerations and interfaces in `digitalburnbag-lib` first, then the rate limiter utility, the core middleware factory, and finally route integration in `brightchain-api-lib`. Property-based tests validate each correctness property from the design, and unit tests cover edge cases and error handling.

## Tasks

- [x] 1. Add new enumerations and extend FileAuditOperationType in digitalburnbag-lib
  - [x] 1.1 Create the AccessorType enum
    - Create `digitalburnbag-lib/src/lib/enumerations/accessor-type.ts` with values `Authenticated = 'authenticated'` and `Anonymous = 'anonymous'`
    - Export from `digitalburnbag-lib/src/lib/enumerations/index.ts`
    - _Requirements: 1.3, 1.4, 1.5, 2.1, 3.1, 11.4_
  - [x] 1.2 Create the AccessOutcome enum
    - Create `digitalburnbag-lib/src/lib/enumerations/access-outcome.ts` with values `Success = 'success'`, `Denied = 'denied'`, `NotFound = 'not_found'`, `Error = 'error'`
    - Export from `digitalburnbag-lib/src/lib/enumerations/index.ts`
    - _Requirements: 1.7, 4.1, 4.2, 4.3, 4.4_
  - [x] 1.3 Add VaultFileAccessed to FileAuditOperationType
    - Add `VaultFileAccessed = 'vault_file_accessed'` to the existing `FileAuditOperationType` enum in `digitalburnbag-lib/src/lib/enumerations/file-audit-operation-type.ts`
    - _Requirements: 6.2, 11.1_

- [x] 2. Create shared interfaces in digitalburnbag-lib
  - [x] 2.1 Create IHttpAccessContext interface
    - Create `digitalburnbag-lib/src/lib/interfaces/params/http-access-context.ts` extending the existing `IAccessContext` with `httpMethod`, `endpointPath`, and `userAgent` fields
    - Export from `digitalburnbag-lib/src/lib/interfaces/params/index.ts`
    - _Requirements: 1.8, 5.2, 11.1_
  - [x] 2.2 Create IVaultAccessAuditMetadata interface
    - Create `digitalburnbag-lib/src/lib/interfaces/bases/vault-access-audit-entry.ts` defining the metadata shape with `accessorType`, `accessOutcome`, `httpMethod`, `endpointPath`, `userAgent`, optional `vaultContainerId`, `fileId`, `sealBroken`, `shareLinkId`, and `skippedEntries`
    - Export from `digitalburnbag-lib/src/lib/interfaces/bases/index.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 1.8, 1.9, 6.5, 10.3_
  - [x] 2.3 Create IAuditConfiguration interfaces
    - Create `digitalburnbag-lib/src/lib/interfaces/params/audit-configuration.ts` with `IRouteAuditConfig` (enabled, failuresOnly, rateLimit) and `IGlobalAuditConfig` (enabled)
    - Export from `digitalburnbag-lib/src/lib/interfaces/params/index.ts`
    - _Requirements: 7.1, 7.2, 7.3, 10.1, 11.2_

- [x] 3. Checkpoint — Verify digitalburnbag-lib builds
  - Ensure `npx nx build digitalburnbag-lib` succeeds with the new enumerations and interfaces. Ask the user if questions arise.

- [x] 4. Implement the access outcome mapper in brightchain-api-lib
  - [x] 4.1 Create mapStatusToOutcome pure function
    - Create `brightchain-api-lib/src/lib/middlewares/access-outcome-mapper.ts` with a `mapStatusToOutcome(statusCode: number): AccessOutcome` function that maps 2xx → Success, 403 → Denied, 404 → NotFound, 5xx → Error, all others → Error
    - _Requirements: 1.7, 4.1, 4.2, 4.3, 4.4, 5.3_
  - [x] 4.2 Write property test for status code to access outcome mapping (Property 3)
    - **Property 3: Status code to access outcome mapping**
    - Create `brightchain-api-lib/src/lib/middlewares/__tests__/vault-access-audit.property.spec.ts`
    - For any HTTP status code 100–599, `mapStatusToOutcome` returns exactly one AccessOutcome: 2xx → Success, 403 → Denied, 404 → NotFound, 5xx → Error, all others → Error
    - Use `fc.integer({ min: 100, max: 599 })` generator, minimum 100 iterations
    - **Validates: Requirements 1.7, 4.1, 4.2, 4.3, 4.4, 5.3**

- [x] 5. Implement the AuditRateLimiter in brightchain-api-lib
  - [x] 5.1 Create AuditRateLimiter class
    - Create `brightchain-api-lib/src/lib/middlewares/audit-rate-limiter.ts` with `tryAcquire(routeKey, maxEntries, windowMs): boolean` and `getAndResetSkipped(routeKey): number` methods
    - Use an in-memory `Map<string, { timestamps: number[]; skippedCount: number }>` for sliding-window state
    - Include periodic cleanup of entries older than `2 * windowMs`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 5.2 Write property test for rate limiter window enforcement (Property 6)
    - **Property 6: Rate limiter enforces window limits**
    - Create `brightchain-api-lib/src/lib/middlewares/__tests__/audit-rate-limiter.property.spec.ts`
    - For any sequence of N requests with `maxEntries = M` and `windowMs = W`, the number of entries written within any window of duration W does not exceed M. When no rate limit is configured, every request produces an entry.
    - Use generators for `maxEntries` (1–100), `windowMs` (100–10000), request count (1–500), minimum 100 iterations
    - **Validates: Requirements 10.1, 10.2, 10.4**
  - [x] 5.3 Write property test for rate limiter skipped counter accuracy (Property 7)
    - **Property 7: Rate limiter skipped counter accuracy**
    - In the same test file `brightchain-api-lib/src/lib/middlewares/__tests__/audit-rate-limiter.property.spec.ts`
    - For any sequence where K requests are skipped, the next written entry reports `skippedEntries = K` and the counter resets to 0
    - Minimum 100 iterations
    - **Validates: Requirements 10.3**

- [x] 6. Implement the vault access audit middleware factory in brightchain-api-lib
  - [x] 6.1 Create the middleware factory and supporting types
    - Create `brightchain-api-lib/src/lib/middlewares/vault-access-audit.ts` with:
      - `ANONYMOUS_ACTOR_SENTINEL` constant (`'00000000-0000-0000-0000-000000000000'`)
      - `IVaultAccessAuditDeps<TID>` interface (auditService, globalConfig, parseId, logger)
      - `IVaultAuditContext` interface (fileId, vaultContainerId, sealBroken, shareLinkId)
      - `createVaultAccessAuditMiddleware<TID>(deps)` factory returning `(routeConfig?) => middleware`
    - The middleware captures request metadata before `next()`, listens on `res.on('finish', ...)` to determine outcome from `res.statusCode`, checks global/route config and rate limits, then fires-and-forgets `auditService.logOperation()` with a `.catch()` that logs errors via `deps.logger.error()`
    - Validate `deps.auditService` at factory creation time — throw if null/undefined
    - Export from `brightchain-api-lib/src/lib/middlewares/index.ts`
    - _Requirements: 1.1–1.10, 2.1–2.4, 3.1–3.3, 4.1–4.5, 5.1–5.8, 6.1–6.5, 7.1–7.5, 9.1–9.3_
  - [x] 6.2 Write property test for authentication state → accessor type and actor ID (Property 1)
    - **Property 1: Authentication state determines accessor type and actor ID**
    - In `brightchain-api-lib/src/lib/middlewares/__tests__/vault-access-audit.property.spec.ts`
    - For any request, if authenticated (user ID present), entry has `accessorType = 'authenticated'` and `actorId = userId`; if not authenticated, entry has `accessorType = 'anonymous'` and `actorId = ANONYMOUS_ACTOR_SENTINEL`
    - Use generators for random user IDs and boolean auth flag, minimum 100 iterations
    - **Validates: Requirements 1.3, 1.4, 1.5, 2.1, 3.1, 3.2**
  - [x] 6.3 Write property test for IP address passthrough (Property 2)
    - **Property 2: IP address passthrough**
    - In the same property spec file
    - For any IP address string (IPv4 or IPv6) set as `req.ip`, the audit entry's `ipAddress` field is identical with no transformation
    - Use `fc.ipV4()` and `fc.ipV6()` generators, minimum 100 iterations
    - **Validates: Requirements 1.6, 2.2, 2.4, 3.3**
  - [x] 6.4 Write property test for metadata construction (Property 4)
    - **Property 4: Metadata construction preserves request context**
    - In the same property spec file
    - For any request with arbitrary method, path, user agent, and optional vault context fields, the metadata contains all provided values unmutated and omits unprovided fields
    - Use random string generators for method/path/userAgent, optional random IDs for context, minimum 100 iterations
    - **Validates: Requirements 1.2, 1.8, 4.5, 6.5**
  - [x] 6.5 Write property test for configuration filtering (Property 5)
    - **Property 5: Configuration filtering controls audit entry creation**
    - In the same property spec file
    - For any combination of global/route config: (a) global disabled → no entry; (b) route disabled → no entry; (c) failuresOnly + 2xx → no entry; (d) both enabled + failuresOnly false → entry created
    - Use random booleans for config flags and random status codes, minimum 100 iterations
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
  - [x] 6.6 Write unit tests for middleware edge cases
    - Create `brightchain-api-lib/src/lib/middlewares/__tests__/vault-access-audit.spec.ts`
    - Test: seal broken flag in metadata when `sealBroken: true` in context (Req 1.9)
    - Test: ledger write failure logs error and does not interrupt response (Req 5.8, 9.3)
    - Test: response is sent before `logOperation` resolves — async write timing (Req 5.4, 9.1)
    - Test: factory throws on missing `auditService` dependency
    - Test: `VaultFileAccessed` operation type is used in the entry (Req 6.2)
    - Test: missing `req.ip` falls back to `'0.0.0.0'`
    - Test: missing user-agent stored as empty string
    - _Requirements: 1.9, 5.4, 5.8, 6.2, 9.1, 9.3_

- [x] 7. Checkpoint — Verify brightchain-api-lib builds and tests pass
  - Ensure `npx nx build brightchain-api-lib` succeeds and `npx nx test brightchain-api-lib --testPathPatterns="vault-access-audit|audit-rate-limiter"` passes. Ask the user if questions arise.

- [x] 8. Integrate middleware with existing routes
  - [x] 8.1 Apply middleware to server icon endpoint
    - Wire `createVaultAccessAuditMiddleware` into the server icon route (`GET /api/servers/:serverId/icon`) with appropriate `IRouteAuditConfig`
    - Ensure the route handler attaches `IVaultAuditContext` to the request with the file ID and vault container ID
    - _Requirements: 5.5, 5.2, 5.3_
  - [x] 8.2 Apply middleware to staging preview endpoint
    - Wire the middleware into the staging preview route (`GET /api/temp-upload/:token/preview`) with appropriate `IRouteAuditConfig`
    - _Requirements: 5.6_
  - [x] 8.3 Configure trust proxy setting
    - Ensure the Express application has `trust proxy` configured so `req.ip` resolves the originating client IP from `X-Forwarded-For`, falling back to TCP remote address when the header is absent
    - _Requirements: 8.1, 8.2, 8.3, 2.3_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Run `npx nx test brightchain-api-lib --testPathPatterns="vault-access-audit|audit-rate-limiter"` and `npx nx build digitalburnbag-lib`. Ensure all tests pass. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–7)
- Unit tests validate specific examples and edge cases
- All property tests use `fast-check` with minimum 100 iterations (`{ numRuns: 100 }`)
- All test files import from `@jest/globals` per workspace convention
- The middleware uses `res.on('finish', ...)` for non-blocking async ledger writes
