# Implementation Plan: BrightChat Server Icon Upload

## Overview

This plan implements server icon upload using the **Temporary Upload Staging System**. The frontend stages files via `/api/temp-upload`, previews via the staging preview URL, and on confirmation the server controller commits the staged file to a permanent vault container with 256×256 PNG processing. The POST `/:serverId/icon` endpoint accepts `{ commitToken }` JSON (not multipart). The server handler uses `StagingService` and `processImage()` directly — no HTTP round-trip to the staging API.

Work proceeds bottom-up: data model → backend processing → API endpoints → frontend components → integration, ensuring each step builds on the previous.

## Tasks

- [x] 1. Extend server data model with icon storage fields
  - [x] 1.1 Add `iconAssetId` and `iconVaultContainerId` to `IServer`
    - Modify `brightchain-lib/src/lib/interfaces/communication/server.ts`
    - Add `iconAssetId?: TId` field to `IServer<TId, TData>`
    - Add `iconVaultContainerId?: TId` field to `IServer<TId, TData>`
    - Add `iconAssetId?: string` and `iconVaultContainerId?: string` to `IServerUpdate`
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 1.2 Create server icon configuration interface
    - Add `brightchain-lib/src/lib/interfaces/communication/serverIconConfig.ts`
    - Define `IServerIconConfig` with `maxFileSizeBytes`, `outputSizePx`, `allowedMimeTypes`, `outputMimeType`
    - Define `DEFAULT_SERVER_ICON_CONFIG` constant (5MB max, 256px, PNG output)
    - Export validation helper functions: `isAllowedIconMimeType(mimeType)`, `isAllowedIconFileSize(sizeBytes)`
    - Export from barrel
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 1.3 Add server icon response types
    - Add `IUploadServerIconResponse` and `IDeleteServerIconResponse` type aliases to `brightchain-lib/src/lib/interfaces/responses/communicationResponses.ts`
    - Export from barrel
    - _Requirements: 2.8, 4.3_

  - [x] 1.4 Write property tests for icon validation helpers (Properties 2, 3)
    - **Property 2: Icon MIME type validation** — `isAllowedIconMimeType` accepts exactly the four allowed types
    - **Property 3: Icon file size validation** — `isAllowedIconFileSize` accepts sizes ≤ 5MB, rejects larger
    - Use `fast-check` with string and integer arbitraries
    - Tag: `Feature: brightchat-server-icon-upload, Property 2/3`
    - _Validates: Requirements 2.2, 2.3_

- [x] 2. Add `sharp` dependency and image processing utility
  - [x] 2.1 Install `sharp` in brightchain-api-lib
    - Add `sharp` (pinned version) to `brightchain-api-lib/package.json` dependencies
    - Add `@types/sharp` to devDependencies if needed
    - Run `yarn install`
    - _Requirements: 2.4_

  - [x] 2.2 Create image processing utility
    - Add `brightchain-api-lib/src/lib/utils/imageProcessing.ts`
    - Implement `processServerIcon(buffer: Buffer): Promise<Buffer>` — resize to 256×256 cover-fit, convert to PNG, strip EXIF
    - Implement `getServerIconVaultName(serverId: string): string` — returns `brightchat-server-{serverId}-assets`
    - _Requirements: 2.4, 2.5_

  - [x] 2.3 Write unit tests for image processing
    - Test `processServerIcon` produces 256×256 PNG from various input formats (PNG, JPEG, WebP)
    - Test `processServerIcon` handles non-square inputs (landscape, portrait)
    - Test `getServerIconVaultName` naming convention
    - **Property 9: Processed image dimensions** — for any valid image buffer, output is 256×256 PNG
    - **Property 10: Vault container naming convention** — for any serverId string, name matches pattern
    - _Validates: Requirements 2.4, 2.5_

- [x] 3. Create `IServerIconUploadRequest` interface and add new i18n keys
  - [x] 3.1 Create `IServerIconUploadRequest` interface
    - Add `brightchain-lib/src/lib/interfaces/communication/serverIconRequest.ts`
    - Define `IServerIconUploadRequest` with `commitToken: string` field
    - Export from `brightchain-lib/src/lib/interfaces/communication/index.ts` barrel
    - _Requirements: 2.1, 2.8_

  - [x] 3.2 Add i18n string keys to BrightChatStrings enum
    - Add keys to `brightchat-lib/src/lib/enumerations/brightChatStrings.ts`:
      `Server_Icon_Upload`, `Server_Icon_Change`, `Server_Icon_Remove`, `Server_Icon_RemoveConfirm`, `Server_Icon_RemoveConfirmTitle`, `Server_Icon_Uploading`, `Server_Icon_UploadFailed`, `Server_Icon_UploadSuccess`, `Server_Icon_FileTooLarge`, `Server_Icon_InvalidType`, `Server_Icon_CropTitle`, `Server_Icon_CropConfirm`, `Server_Icon_CropCancel`, `Server_Icon_ZoomLabel`, `Server_Icon_PreviewAlt`, `Server_Icon_UploadLabel`, `Server_Icon_DropOrBrowse`, `Server_Icon_StagingFailed`, `Server_Icon_StagingExpired`
    - _Requirements: 8.1_

  - [x] 3.3 Add English (US) translations
    - Add translations to `brightchat-lib/src/lib/i18n/strings/englishUs.ts`
    - _Requirements: 8.2_

  - [x] 3.4 Add translations for all other supported languages
    - Add translations to: `spanish.ts`, `french.ts`, `german.ts`, `japanese.ts`, `mandarin.ts`, `ukrainian.ts`
    - _Requirements: 8.2_

- [x] 4. Implement server icon API endpoints (staging-based)
  - [x] 4.1 Add icon upload route to ServerController (POST with commitToken)
    - Add `POST /:serverId/icon` route to `ServerController`
    - Accept JSON body `{ commitToken: string }` (IServerIconUploadRequest) — NOT multipart
    - Validate owner/admin role on the server
    - Validate commitToken is present and non-empty
    - Call `StagingService.getRecord(commitToken)` — return 404 if not found, 410 if expired, 403 if `record.uploaderId !== req.user.id`
    - Validate `record.mimeType` ∈ `DEFAULT_SERVER_ICON_CONFIG.allowedMimeTypes` — return 400 INVALID_FILE_TYPE if not
    - Validate `record.sizeBytes` ≤ `DEFAULT_SERVER_ICON_CONFIG.maxFileSizeBytes` — return 400 FILE_TOO_LARGE if not
    - Call `StagingService.readFile(commitToken)` to get raw buffer
    - Call `processImage(buffer, { width: 256, height: 256, format: 'png', stripExif: true })` from `stagingImageProcessor.ts`
    - Create or reuse vault container via `IVaultContainerService` (name from `getServerIconVaultName(serverId)`, visibility: Public)
    - Store processed image via `IUploadService` (createSession → receiveChunk → finalize)
    - Call `StagingService.remove(commitToken)` only after successful vault upload
    - Update server record with `iconAssetId`, `iconVaultContainerId`, `iconUrl = /api/servers/${serverId}/icon`
    - Return updated `IServer` in `IApiEnvelope`
    - If processing or vault upload fails, do NOT remove staged file (user can retry)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [x] 4.2 Add icon serving route to ServerController
    - Add `GET /:serverId/icon` route (no authentication required)
    - Look up server, check `iconAssetId` exists (404 if not)
    - Check `If-None-Match` header against ETag (`iconAssetId`) → 304 if match
    - Read file content from vault via `IFileService`
    - Return image bytes with headers: `Content-Type: image/png`, `Cache-Control: public, max-age=86400, immutable`, `ETag: "{iconAssetId}"`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.3 Add icon removal route to ServerController
    - Add `DELETE /:serverId/icon` route
    - Validate owner/admin role
    - Check `iconAssetId` exists (404 if not)
    - Delete file from vault via `IFileService`
    - Clear `iconAssetId`, `iconVaultContainerId`, `iconUrl` on server record
    - Return updated `IServer`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.4 Write unit tests for icon API handlers
    - Test upload with valid commitToken → 200 with updated server
    - Test upload with missing commitToken → 400
    - Test upload with expired commitToken → 410
    - Test upload with uploader mismatch → 403
    - Test upload with invalid MIME type in staged file → 400
    - Test upload with oversized staged file → 400
    - Test upload by non-admin → 403
    - Test serve with icon → 200 with correct headers
    - Test serve without icon → 404
    - Test serve with matching ETag → 304
    - Test delete with icon → 200 with cleared fields
    - Test delete without icon → 404
    - Test delete by non-admin → 403
    - _Validates: Requirements 2.1–2.9, 3.1–3.6, 4.1–4.5_

  - [x] 4.5 Write property tests for icon API handlers
    - **Property 1: Icon upload produces valid serving URL**
    - **Validates: Requirements 1.3, 1.5, 2.6**
    - **Property 4: Icon removal clears all icon fields**
    - **Validates: Requirements 4.1, 4.3**
    - **Property 5: Icon upload and removal authorization**
    - **Validates: Requirements 2.1, 2.9, 4.4**
    - **Property 6: Icon endpoints return 404 for servers without icons**
    - **Validates: Requirements 3.4, 4.5**
    - **Property 7: ETag-based conditional request**
    - **Validates: Requirements 3.3, 3.6**
    - **Property 11: Icon upload idempotency**
    - **Validates: Requirements 2.7**
    - Use `fast-check` with appropriate arbitraries
    - Tag: `Feature: brightchat-server-icon-upload, Property N`
    - _Validates: Requirements 1.3, 1.5, 2.1, 2.6, 2.7, 2.9, 3.3, 3.4, 3.6, 4.1, 4.3, 4.4, 4.5_

- [x] 5. Checkpoint — Ensure all backend tests pass
  - Run `npx nx run brightchain-lib:test` and `npx nx run brightchain-api-lib:test`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Install `react-easy-crop` and extend chatApi client
  - [x] 6.1 Install `react-easy-crop` in brightchat-react-components
    - Add `react-easy-crop` (pinned version) to `brightchat-react-components/package.json` dependencies
    - Run `yarn install`
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 6.2 Add staging and icon API methods to createChatApiClient
    - Add `stageFile(file: File): Promise<ITempUploadResponse>` — constructs `FormData` with the file, POSTs to `/api/temp-upload`, returns staging response with commitToken and previewUrl
    - Add `uploadServerIcon(serverId: string, commitToken: string): Promise<IServer>` — sends JSON `{ commitToken }` body to `POST /api/servers/{serverId}/icon`
    - Add `removeServerIcon(serverId: string): Promise<IServer>` — sends DELETE to `/api/servers/{serverId}/icon`
    - Add `getServerIconUrl(serverId: string): string` — returns URL string `/api/servers/{serverId}/icon` (no API call)
    - Import `ITempUploadResponse`, `IUploadServerIconResponse`, `IDeleteServerIconResponse`, `IServer` as needed
    - _Requirements: 2.1, 4.1_

  - [x] 6.3 Write unit tests for new chatApi methods
    - Test `stageFile` constructs FormData correctly and POSTs to `/api/temp-upload`
    - Test `uploadServerIcon` sends JSON `{ commitToken }` to correct endpoint
    - Test `removeServerIcon` sends DELETE to correct endpoint
    - Test `getServerIconUrl` returns correct URL pattern
    - _Validates: Requirements 2.1, 4.1_

- [x] 7. Implement IconCropDialog component (staging-based)
  - [x] 7.1 Create IconCropDialog component
    - Add `brightchat-react-components/src/lib/IconCropDialog.tsx`
    - Props: `open`, `onClose`, `onImageStaged(commitToken, previewUrl)`, `onCropComplete(commitToken)`, `initialPreviewUrl?`, `initialCommitToken?`
    - File selection via hidden `<input type="file" accept="image/png,image/jpeg,image/gif,image/webp">`
    - Client-side file size validation (5MB max via `isAllowedIconFileSize`) before staging
    - **On file select**: immediately upload raw file to `POST /api/temp-upload` via `chatApi.stageFile()`, get back `commitToken` + `previewUrl`
    - **Crop preview**: load image from staging `previewUrl` (no vault blocks in circulation)
    - Use `react-easy-crop` `<Cropper>` with `cropShape="round"` and `aspect={1}` (1:1 square lock)
    - Zoom slider (`<Slider>`) with range 1–3
    - Circular preview at 48px (matching ServerRail icon size)
    - On confirm: pass `commitToken` to parent via `onCropComplete` — server-side handles final 256×256 resize
    - On cancel: optionally call `DELETE /api/temp-upload/:token` for immediate cleanup, or let TTL handle it
    - Loading state during staging upload
    - Error display for validation failures and staging errors (using `Server_Icon_StagingFailed` i18n key)
    - All text via i18n string lookups
    - Keyboard support: Enter to confirm, Escape to cancel
    - `aria-label` on file picker, `alt` on preview, `aria-live` on status messages
    - Export from barrel
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 9.1, 9.2, 9.3, 9.4, 9.6_

  - [x] 7.2 Write unit tests for IconCropDialog
    - Test file picker opens on button click
    - Test file size rejection (>5MB) shows client-side error
    - Test file selection triggers `chatApi.stageFile()` call
    - Test crop area renders with staged preview URL
    - Test zoom slider changes zoom level
    - Test confirm calls `onCropComplete` with commitToken
    - Test cancel closes without calling `onCropComplete`
    - Test staging failure shows `Server_Icon_StagingFailed` error inline
    - Test keyboard navigation (Enter, Escape)
    - **Property 8: Crop aspect ratio lock** — crop output always has equal width and height
    - **Validates: Requirements 5.1–5.10, 9.1–9.6**

- [x] 8. Implement ServerIconUploadArea component (staging-based)
  - [x] 8.1 Create ServerIconUploadArea component
    - Add `brightchat-react-components/src/lib/ServerIconUploadArea.tsx`
    - Props: `currentIconUrl?`, `serverName`, `serverId?`, `onIconUploaded?(server)`, `onIconRemove?()`, `hasIcon`, `uploading?`, `error?`, `disabled?`
    - Circular avatar display (current icon or letter fallback)
    - "Upload Icon" / "Change Icon" button (opens IconCropDialog)
    - "Remove Icon" button (visible when `hasIcon` is true)
    - Manages staging lifecycle: opens IconCropDialog → receives commitToken → calls `chatApi.uploadServerIcon(serverId, commitToken)` → calls `onIconUploaded`
    - Shows upload progress during the commit call
    - Displays `Server_Icon_StagingExpired` error if commit returns 410
    - Upload progress indicator with `aria-live="polite"`
    - Inline error message display
    - Disabled state support
    - All text via i18n string lookups
    - Export from barrel
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 9.1, 9.4_

  - [x] 8.2 Write unit tests for ServerIconUploadArea
    - Test renders letter avatar when no icon
    - Test renders image avatar when icon URL provided
    - Test "Change Icon" button opens crop dialog
    - Test "Remove Icon" button visible only when `hasIcon`
    - Test uploading state shows progress indicator
    - Test error state shows error message
    - Test disabled state disables buttons
    - Test staging expiry error (410) shows `Server_Icon_StagingExpired` message
    - _Validates: Requirements 6.1–6.3, 7.1–7.3_

- [x] 9. Modify CreateServerDialog to use staging-based icon upload
  - [x] 9.1 Replace iconUrl text field with ServerIconUploadArea
    - Modify `brightchat-react-components/src/lib/CreateServerDialog.tsx`
    - Remove `iconUrl` state and `<TextField>` for icon URL
    - Add `commitToken: string | null` state (instead of Blob or URL string)
    - Add `<ServerIconUploadArea>` with letter avatar preview based on current name input
    - On file select + crop: store `commitToken` in local state
    - On submit: create server without icon first, then call `chatApi.uploadServerIcon(newServerId, commitToken)` if a token is present
    - If server creation succeeds but icon commit fails: close dialog, show warning toast, navigate to server
    - If commit fails with 410 (staging expired): show `Server_Icon_StagingExpired` message
    - Icon remains optional
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 9.2 Update CreateServerDialog tests
    - Update existing tests to work with new icon upload area instead of text field
    - Add test: server creation with commitToken triggers icon upload
    - Add test: server creation succeeds, icon upload fails → warning shown
    - Add test: server creation without icon still works
    - _Validates: Requirements 6.1–6.6_

- [x] 10. Modify ServerSettingsPanel to use staging-based icon upload
  - [x] 10.1 Replace iconUrl text field with ServerIconUploadArea in Overview tab
    - Modify `brightchat-react-components/src/lib/ServerSettingsPanel.tsx`
    - Remove `editIconUrl` state and `<TextField>` for icon URL
    - Add `<ServerIconUploadArea>` showing current server icon
    - Wire "Change Icon" to open `IconCropDialog`, stage file, then commit via `chatApi.uploadServerIcon`
    - Wire "Remove Icon" to show confirmation dialog, then call `chatApi.removeServerIcon`
    - Update displayed icon immediately on success
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 10.2 Add remove icon confirmation dialog
    - Add a simple MUI `<Dialog>` confirmation prompt before icon removal
    - Use `Server_Icon_RemoveConfirmTitle` and `Server_Icon_RemoveConfirm` i18n keys
    - Focus trap and Escape key dismissal
    - _Requirements: 7.6, 9.5_

  - [x] 10.3 Update ServerSettingsPanel tests
    - Update existing tests to work with new icon upload area
    - Add test: icon change flow (stage → crop → commit → preview update)
    - Add test: icon remove flow (confirm → delete → letter avatar)
    - Add test: remove confirmation cancel does not delete
    - _Validates: Requirements 7.1–7.6_

- [x] 11. Update BrightChatApp wiring for icon upload
  - [x] 11.1 Wire icon upload/remove callbacks in BrightChatApp
    - Modify `brightchat-react-components/src/lib/BrightChatApp.tsx`
    - Add `handleUploadServerIcon` callback using `chatApi.uploadServerIcon`
    - Add `handleRemoveServerIcon` callback using `chatApi.removeServerIcon`
    - Pass callbacks to `ServerSettingsPanel`
    - Update `handleCreateServer` to handle post-creation icon upload via commitToken
    - _Requirements: 6.4, 7.2, 7.3_

- [x] 12. Checkpoint — Ensure all frontend tests pass
  - Run `npx nx run brightchat-react-components:test` and `npx nx run brightchat-lib:test`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Update admin chat servers controller
  - [x] 13.1 Update AdminChatServersController to handle new icon fields
    - Modify `brightchain-api-lib/src/lib/controllers/api/adminChatServers.ts`
    - Include `iconAssetId` and `iconVaultContainerId` in server list/detail responses
    - Support icon field updates in admin update endpoint
    - _Requirements: 1.1, 1.2_

- [x] 14. Final integration checkpoint
  - Run full test suite: `npx nx run-many --target=test --projects=brightchain-lib,brightchain-api-lib,brightchat-lib,brightchat-react-components`
  - Verify no regressions in existing server tests
  - Verify no regressions in existing CreateServerDialog and ServerSettingsPanel tests
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks 1.1–1.4 and 2.1–2.3 are already completed (data model extensions and image processing utility).
- The staging system (`StagingService`, `TempUploadController`, `processImage()`, `StagingCleanupScheduler`) is already built — no tasks needed for staging infrastructure.
- The `POST /:serverId/icon` endpoint accepts `{ commitToken }` JSON, NOT multipart. The server handler calls `StagingService` directly (not HTTP to the staging API) to read the staged file, process it, upload to vault, and clean up.
- The `ServerRail` component requires NO changes — it already renders `<Avatar src={server.iconUrl}>` with a letter fallback.
- The `sharp` library and `multer` are already available in the workspace.
- The `react-easy-crop` library is ~15KB gzipped and has no peer dependencies beyond React.
- The vault container is created lazily on first icon upload, not on server creation.
- Tasks marked with `*` are optional and can be skipped for faster MVP.
- Each task references specific requirements for traceability.
- Property tests validate universal correctness properties from the design document (11 properties total).
- Use `yarn` as package manager, `npx nx` to run commands.
- Jest for testing in `brightchain-lib` and `brightchain-api-lib` (import from `@jest/globals`).
- Vitest for testing in `brightchat-react-components` and `brightchat-lib`.
- `fast-check` for property-based testing across all projects.
