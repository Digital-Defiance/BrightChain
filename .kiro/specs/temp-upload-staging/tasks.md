# Implementation Plan: Temporary Upload Staging System

## Overview

This plan implements a filesystem-based temporary upload staging layer that sits between client uploads and the permanent Digital Burnbag vault system. Files are uploaded to a local staging directory, served back for preview via commit-token-based URLs, and only promoted into a vault container when the caller explicitly commits. The implementation is split across `brightchain-lib` (shared interfaces) and `brightchain-api-lib` (Node.js service, controller, cleanup scheduler, image processing).

## Tasks

- [x] 1. Define shared staging interfaces in brightchain-lib
  - [x] 1.1 Create `IStagedFileRecord<TId>` interface
    - Create `brightchain-lib/src/lib/interfaces/staging/stagedFileRecord.ts`
    - Define the generic interface with fields: `commitToken`, `originalFilename`, `mimeType`, `sizeBytes`, `uploadedAt`, `expiresAt`, `uploaderId`
    - `TId` defaults to `string`
    - _Requirements: 8.1, 1.7_

  - [x] 1.2 Create `ITempUploadResponse` interface
    - Create `brightchain-lib/src/lib/interfaces/staging/tempUploadResponse.ts`
    - Define fields: `commitToken`, `previewUrl`, `expiresAt`, `originalFilename`, `mimeType`, `sizeBytes`
    - _Requirements: 8.2, 1.10_

  - [x] 1.3 Create `IProcessingParams` interface
    - Create `brightchain-lib/src/lib/interfaces/staging/processingParams.ts`
    - Define optional fields: `width`, `height`, `format` (`'png' | 'jpeg' | 'webp'`), `stripExif`
    - _Requirements: 8.4, 6.1, 6.2, 6.3_

  - [x] 1.4 Create `ICommitRequest<TId>` interface
    - Create `brightchain-lib/src/lib/interfaces/staging/commitRequest.ts`
    - Define fields: `vaultContainerId?`, `targetFolderId?`, `createContainer?`, `processingParams?`
    - Import `IProcessingParams` and `VaultVisibility` from existing types
    - _Requirements: 8.3, 3.1, 3.2, 3.3_

  - [x] 1.5 Create `ICommitResponse<TId>` interface
    - Create `brightchain-lib/src/lib/interfaces/staging/commitResponse.ts`
    - Define fields: `fileId`, `vaultContainerId`, `fileName`, `mimeType`, `sizeBytes`
    - _Requirements: 8.5, 3.6_

  - [x] 1.6 Create `IStagingConfig` interface and defaults
    - Create `brightchain-lib/src/lib/interfaces/staging/stagingConfig.ts`
    - Define `IStagingConfig` with fields: `stagingDir`, `defaultTtlSeconds`, `maxTtlSeconds`, `maxFileSizeBytes`, `cleanupIntervalMs`
    - Export `DEFAULT_STAGING_CONFIG` constant with sensible defaults
    - _Requirements: 7.1, 7.2, 5.3, 1.5, 1.6, 1.8_

  - [x] 1.7 Create barrel export for staging interfaces
    - Create `brightchain-lib/src/lib/interfaces/staging/index.ts`
    - Re-export all staging interfaces using `export type *` pattern
    - Add staging barrel to the parent `brightchain-lib/src/lib/interfaces/index.ts` barrel
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 2. Implement StagingService core lifecycle
  - [x] 2.1 Create `StagingService` class with `IStagingServiceDeps` injection
    - Create `brightchain-api-lib/src/lib/services/staging/stagingService.ts`
    - Define `IStagingServiceDeps` interface with `generateToken` and `now` functions
    - Implement constructor accepting `IStagingConfig` and `IStagingServiceDeps`
    - Implement `initialize()` — ensure staging directory exists and is writable (recursive `mkdir`)
    - Implement `stage()` — generate UUID v4 token, compute `expiresAt` with TTL capping (`min(requestedTtl, maxTtl)`), write raw file bytes to `{stagingDir}/{commitToken}`, write sidecar JSON atomically (write to temp file then rename), return `IStagedFileRecord`
    - Implement `getRecord()` — read and parse `{commitToken}.meta.json`, return `null` if not found
    - Implement `readFile()` — read raw file bytes from `{stagingDir}/{commitToken}`
    - Implement `remove()` — delete both the raw file and `.meta.json` sidecar, handle missing files gracefully
    - Implement `findExpired()` — scan staging directory for `.meta.json` files, parse each, filter by `expiresAt < now()`
    - Implement `isExpired()` — compare `expiresAt` against `now()`
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 4.1, 5.1, 7.3, 7.4, 7.5, 7.6_

  - [x] 2.2 Write property test: staging round-trip preserves file data and metadata
    - **Property 1: Staging round-trip preserves file data and metadata**
    - Create `brightchain-api-lib/src/lib/services/staging/__tests__/stagingService.property.spec.ts`
    - Use `fast-check` to generate arbitrary file buffers, filenames, MIME types, and uploader IDs
    - Assert: `commitToken` is valid UUID v4, `originalFilename` matches input, `mimeType` matches input, `sizeBytes` equals buffer length, `uploaderId` matches input, both raw file and `.meta.json` exist on disk
    - Minimum 100 iterations
    - **Validates: Requirements 1.1, 1.2, 1.7, 1.10, 7.4, 7.5**

  - [x] 2.3 Write property test: preview URL derived from commit token
    - **Property 2: Preview URL derived from commit token**
    - In the same property spec file
    - Assert: preview URL equals `/api/temp-upload/${commitToken}/preview`
    - Minimum 100 iterations
    - **Validates: Requirements 1.3, 2.6**

  - [x] 2.4 Write property test: preview returns original staged bytes
    - **Property 3: Preview returns original staged bytes**
    - Stage a file, then read it back via `readFile()`, assert byte-for-byte equality with original buffer
    - Minimum 100 iterations
    - **Validates: Requirements 2.1**

  - [x] 2.5 Write property test: TTL is capped at configured maximum
    - **Property 4: TTL is capped at the configured maximum**
    - Generate arbitrary TTL values (including above, below, and equal to max), assert effective TTL equals `min(requestedTtl, maxTtlSeconds)`, and when no TTL provided, equals `defaultTtlSeconds`
    - Assert `expiresAt === uploadedAt + effectiveTtl`
    - Minimum 100 iterations
    - **Validates: Requirements 1.5, 1.6**

  - [x] 2.6 Write property test: file size boundary validation
    - **Property 5: File size boundary validation**
    - Generate arbitrary file sizes around the `maxFileSizeBytes` boundary
    - Assert: files ≤ max are accepted, files > max are rejected
    - Minimum 100 iterations
    - **Validates: Requirements 1.8**

  - [x] 2.7 Write property test: owner-only authorization for commit and discard
    - **Property 6: Owner-only authorization for commit and discard**
    - Generate arbitrary uploader IDs and requesting user IDs
    - Assert: operations succeed when IDs match, return 403 when they don't
    - Minimum 100 iterations
    - **Validates: Requirements 3.9, 3.10, 4.4, 4.5**

  - [x] 2.8 Write property test: discard removes staged file and sidecar
    - **Property 10: Discard removes staged file and sidecar**
    - Stage a file, discard it, assert both raw file and `.meta.json` are gone, `getRecord()` returns null
    - Minimum 100 iterations
    - **Validates: Requirements 4.1**

  - [x] 2.9 Write unit tests for StagingService
    - Create `brightchain-api-lib/src/lib/services/staging/__tests__/stagingService.spec.ts`
    - Test: `initialize()` creates directory if missing
    - Test: `stage()` → `getRecord()` → `readFile()` → `remove()` lifecycle
    - Test: `getRecord()` returns `null` for unknown token
    - Test: `isExpired()` boundary — exactly at expiry time
    - Test: `findExpired()` with mixed expired/valid files
    - Test: atomic sidecar write (temp file + rename)
    - Test: orphaned file handling (sidecar missing, raw file missing)
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.7, 4.1, 7.3, 7.4, 7.5_

- [x] 3. Checkpoint — Ensure staging service tests pass
  - Ensure all tests pass (`npx nx test brightchain-api-lib --testPathPatterns="stagingService"`), ask the user if questions arise.

- [x] 4. Implement StagingCleanupScheduler
  - [x] 4.1 Create `StagingCleanupScheduler` class
    - Create `brightchain-api-lib/src/lib/services/staging/stagingCleanupScheduler.ts`
    - Extend `EventEmitter`, follow the `IdentityExpirationScheduler` pattern
    - Define `StagingCleanupEvent` enum: `FILE_CLEANED`, `BATCH_CLEANED`, `ERROR`, `STARTED`, `STOPPED`
    - Implement `start()` / `stop()` / `get isRunning` / `async tick()`
    - `tick()`: call `findExpired()`, remove each, emit events, log cleanup actions, continue on individual failures
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 4.2 Write property test: cleanup removes exactly the expired files
    - **Property 11: Cleanup removes exactly the expired files**
    - Create `brightchain-api-lib/src/lib/services/staging/__tests__/stagingCleanupScheduler.property.spec.ts`
    - Stage multiple files with various expiry timestamps, run `tick()` at a fixed time, assert exactly the expired files are removed and non-expired files remain
    - Minimum 100 iterations
    - **Validates: Requirements 5.1, 5.2**

  - [x] 4.3 Write property test: cleanup continues on individual file deletion failure
    - **Property 12: Cleanup continues on individual file deletion failure**
    - Mock `remove()` to fail for specific tokens, run `tick()`, assert remaining expired files are still cleaned
    - Minimum 100 iterations
    - **Validates: Requirements 5.5**

  - [x] 4.4 Write unit tests for StagingCleanupScheduler
    - Create `brightchain-api-lib/src/lib/services/staging/__tests__/stagingCleanupScheduler.spec.ts`
    - Test: `start()` / `stop()` lifecycle and `isRunning` state
    - Test: `tick()` with no expired files returns 0
    - Test: `tick()` with mixed expired/valid files removes only expired
    - Test: event emission (`FILE_CLEANED`, `BATCH_CLEANED`, `ERROR`)
    - Test: `tick()` logs each cleanup action (commit token, filename, age)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Implement image processing for staging commits
  - [x] 5.1 Create `stagingImageProcessor` utility
    - Create `brightchain-api-lib/src/lib/utils/stagingImageProcessor.ts`
    - Implement `isSupportedImageType(mimeType)` — check against `['image/png', 'image/jpeg', 'image/gif', 'image/webp']`
    - Implement `processImage(buffer, params)` — use `sharp` to resize (cover-fit, centre), convert format, strip EXIF; return `{ buffer, mimeType }`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 5.2 Write property test: image processing produces correct output
    - **Property 8: Image processing produces correct output**
    - Create `brightchain-api-lib/src/lib/utils/__tests__/stagingImageProcessor.property.spec.ts`
    - Generate arbitrary image dimensions, formats, and `IProcessingParams`
    - Assert: output dimensions match requested width/height, format matches requested format, no EXIF when `stripExif` is true
    - Minimum 100 iterations
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 5.3 Write property test: processing rejected for non-image MIME types
    - **Property 9: Processing rejected for non-image MIME types**
    - In the same property spec file
    - Generate arbitrary non-image MIME types, assert `isSupportedImageType()` returns false
    - Minimum 100 iterations
    - **Validates: Requirements 6.4**

  - [x] 5.4 Write unit tests for stagingImageProcessor
    - Create `brightchain-api-lib/src/lib/utils/__tests__/stagingImageProcessor.spec.ts`
    - Test: specific dimension/format combinations (256×256 PNG, 800×600 JPEG, etc.)
    - Test: corrupt input handling (should throw)
    - Test: `isSupportedImageType()` for each supported type and common non-image types
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 6. Checkpoint — Ensure cleanup and image processing tests pass
  - Ensure all tests pass (`npx nx test brightchain-api-lib --testPathPatterns="staging"`), ask the user if questions arise.

- [x] 7. Implement TempUploadController with all endpoints
  - [x] 7.1 Create API response interfaces in brightchain-api-lib
    - Create `brightchain-api-lib/src/lib/interfaces/responses/stagingResponses.ts`
    - Define `ITempUploadApiResponse` extending Express `Response` with `body: ITempUploadResponse`
    - Define `ICommitApiResponse` extending Express `Response` with `body: ICommitResponse<string>`
    - Import body types from `@brightchain/brightchain-lib`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 7.2 Create `TempUploadController` class
    - Create `brightchain-api-lib/src/lib/controllers/api/tempUploadController.ts`
    - Follow the `BaseController` pattern with `routeConfig` definitions
    - Define `ITempUploadControllerDeps` interface with `stagingService`, `vaultContainerService`, `uploadService`, `parseId`
    - Configure `multer` with `memoryStorage()` and `fileSize` limit from config
    - Define route definitions:
      - `POST /` — stage upload (auth required, `multer.single('file')` middleware)
      - `GET /:commitToken/preview` — preview (no auth, commit token is bearer credential)
      - `POST /:commitToken/commit` — commit to vault (auth required)
      - `DELETE /:commitToken` — discard (auth required)
    - _Requirements: 1.1, 1.8, 1.9, 2.1, 2.2, 2.3, 3.1, 3.9, 4.1, 4.4_

  - [x] 7.3 Implement stage handler (POST /)
    - Authenticate user, extract file from multer, read optional `ttlSeconds` from body
    - Call `stagingService.stage()` with file buffer, filename, MIME type, user ID, TTL
    - Return 201 with `ITempUploadResponse` body
    - Handle 413 from multer file size limit
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 1.9, 1.10_

  - [x] 7.4 Implement preview handler (GET /:commitToken/preview)
    - No authentication required
    - Call `stagingService.getRecord()`, return 404 if not found
    - Check expiry, return 410 Gone if expired
    - Call `stagingService.readFile()`, return bytes with correct `Content-Type`, `Cache-Control: private, no-store`, `Content-Disposition: inline`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 7.5 Implement commit handler (POST /:commitToken/commit)
    - Authenticate user, get record (404 if missing, 410 if expired, 403 if user mismatch)
    - Read staged file bytes
    - If `processingParams` provided: validate image type (422 if not supported), apply `processImage()`, update MIME type and size
    - Determine vault target: create container if `createContainer` provided, else use `vaultContainerId`
    - Upload to vault via `IUploadService` pipeline
    - Call `stagingService.remove()` only after successful vault upload
    - Return 200 with `ICommitResponse`
    - On processing/vault failure: do NOT delete staged file (user can retry)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 7.6 Implement discard handler (DELETE /:commitToken)
    - Authenticate user, get record (404 if missing, 403 if user mismatch)
    - Call `stagingService.remove()`
    - Return 204 No Content
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 7.7 Write property test: commit promotes file to vault and cleans up staging
    - **Property 7: Commit promotes file to vault and cleans up staging**
    - Create `brightchain-api-lib/src/lib/controllers/api/__tests__/tempUploadController.property.spec.ts`
    - Mock vault services, stage a file, commit it, assert: vault upload called with correct bytes, staged file removed, sidecar removed, response has non-empty `fileId` and `vaultContainerId`
    - Minimum 100 iterations
    - **Validates: Requirements 3.1, 3.5, 3.6**

  - [x] 7.8 Write unit tests for TempUploadController
    - Create `brightchain-api-lib/src/lib/controllers/api/__tests__/tempUploadController.spec.ts`
    - Test each endpoint's happy path (stage → 201, preview → 200, commit → 200, discard → 204)
    - Test error paths: 404 unknown token, 410 expired, 403 wrong user, 413 file too large, 422 non-image processing, 422 corrupt image
    - Test multer integration for multipart parsing
    - _Requirements: 1.1, 1.8, 1.9, 2.1, 2.4, 2.5, 3.1, 3.7, 3.8, 3.9, 3.10, 4.1, 4.3, 4.4, 4.5, 6.4, 6.5_

- [x] 8. Wire components together and register routes
  - [x] 8.1 Create staging service barrel export
    - Create `brightchain-api-lib/src/lib/services/staging/index.ts`
    - Re-export `StagingService`, `IStagingServiceDeps`, `StagingCleanupScheduler`, `StagingCleanupEvent`
    - _Requirements: 7.6_

  - [x] 8.2 Register TempUploadController in the API router
    - Mount `TempUploadController` at `/api/temp-upload` in the Express app router
    - Instantiate `StagingService` with config from environment variables (`TEMP_UPLOAD_STAGING_DIR`, `TEMP_UPLOAD_DEFAULT_TTL`, `TEMP_UPLOAD_MAX_TTL`, `TEMP_UPLOAD_MAX_FILE_SIZE`, `TEMP_UPLOAD_CLEANUP_INTERVAL`)
    - Call `stagingService.initialize()` at startup
    - Instantiate and start `StagingCleanupScheduler` with the staging service and configured interval
    - Wire `ITempUploadControllerDeps` with existing `vaultContainerService` and `uploadService` from the application
    - _Requirements: 1.1, 5.3, 7.1, 7.2, 7.3_

  - [x] 8.3 Write integration tests for full staging lifecycle
    - Create `brightchain-api-lib/src/lib/controllers/api/__tests__/tempUploadController.integration.spec.ts`
    - Test: upload → preview → commit → verify vault entry
    - Test: upload → preview → discard → verify cleanup
    - Test: upload with short TTL → verify 410 on preview after expiry
    - Test: stage multiple files with different TTLs → run cleanup → verify correct files removed
    - _Requirements: 1.1, 2.1, 3.1, 3.5, 4.1, 5.1, 5.2_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass (`npx nx test brightchain-api-lib --testPathPatterns="staging|tempUpload|stagingImageProcessor"`), ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — no language selection needed
- Use `import { describe, it, expect } from '@jest/globals'` in all test files (not vitest)
- Use `fast-check` (`import * as fc from 'fast-check'`) for property-based tests
- Use `yarn` as the package manager and `npx nx` to run nx commands
- `sharp` and `multer` are already available in the workspace
