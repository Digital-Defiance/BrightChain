# Requirements Document

## Introduction

The BrightChain platform currently routes all file uploads directly into permanent Digital Burnbag vault containers. This means uploaded blocks enter circulation (replication, availability tracking) immediately — even when the user has not yet confirmed the action. This is problematic for preview-before-commit workflows: a BrightChat user who crops a server icon but cancels has already polluted the permanent storage layer; a BrightHub author who inlines images into a draft post and then discards the draft has created orphaned permanent blocks.

This feature introduces a Temporary Upload Staging System — an escrow-style intermediate storage layer that sits between the client upload and the permanent vault system. Files are uploaded to a staging area, served back for preview via temporary URLs, and only promoted into a vault container when the user explicitly commits. Staged files that are discarded or that exceed their time-to-live are cleaned up without ever touching the permanent storage layer. The system is designed as shared infrastructure consumed by BrightChat, BrightHub, and any future BrightChain application that needs preview-before-commit semantics.

## Glossary

- **Staging_Service**: The core service responsible for accepting temporary uploads, storing them in the Staging_Store, issuing Commit_Tokens, and managing the lifecycle (commit, discard, expiry) of staged files. Implemented in `brightchain-api-lib`.
- **Staging_Store**: The underlying storage backend for staged files. Uses the local filesystem (a configurable directory) rather than vault containers, keeping staged data entirely outside the permanent storage layer. Must support multi-instance deployments via a shared filesystem or equivalent.
- **Commit_Token**: A cryptographically random, unguessable string (UUID v4) returned when a file is staged. Acts as both an identifier and a bearer credential for preview, commit, and discard operations on that staged file.
- **Staged_File_Record**: Metadata tracked for each staged file: Commit_Token, original filename, MIME type, size in bytes, storage path in the Staging_Store, upload timestamp, TTL expiry timestamp, and uploader identity.
- **TTL**: Time-to-live for a staged file. Defaults to 1 hour. Configurable per upload. After expiry the file is eligible for automatic cleanup.
- **Commit_Flow**: The process of promoting a staged file into a permanent Digital Burnbag vault container. Includes optional image processing (resize, format conversion, EXIF stripping) applied at commit time, vault container creation if needed, and cleanup of the staged copy.
- **Discard_Flow**: Explicit cleanup of a staged file before its TTL expires. Deletes the file from the Staging_Store and removes the Staged_File_Record.
- **Cleanup_Job**: A periodic background task that scans for staged files past their TTL and deletes them from the Staging_Store. Ensures no orphaned temporary data accumulates.
- **Processing_Params**: An optional set of image transformation parameters (target width/height, format, EXIF strip flag) that can be supplied at commit time. Processing is deferred to commit so the same staged file can be committed with different transformations depending on the consuming application.
- **Temp_Upload_API**: The set of REST endpoints under `/api/temp-upload` that expose staging, preview, commit, and discard operations.
- **Vault_Container**: A permanent Digital Burnbag organizational unit (`IVaultContainerBase`) that holds files. The commit flow's target — staged files are promoted into a vault container.
- **IVaultContainerService**: The existing service interface for vault container lifecycle management (create, get, list, update, lock, destroy).
- **IUploadService**: The existing service interface for chunked file uploads into vault containers. The Staging_Service bypasses this for the staging phase but may delegate to it during commit.

## Requirements

### Requirement 1: Temporary File Upload (Staging)

**User Story:** As a BrightChain application developer, I want to upload a file to a temporary staging area that does not touch the permanent vault system, so that users can preview content before committing it to permanent storage.

#### Acceptance Criteria

1. WHEN a POST request with a `multipart/form-data` body containing a file is sent to `/api/temp-upload`, THE Temp_Upload_API SHALL accept the upload and store the file in the Staging_Store
2. WHEN the upload is accepted, THE Staging_Service SHALL generate a cryptographically random Commit_Token (UUID v4) and return it in the response body
3. WHEN the upload is accepted, THE Staging_Service SHALL return a preview URL in the format `/api/temp-upload/{commitToken}/preview` in the response body
4. THE Staging_Service SHALL store the uploaded file outside the permanent vault system, using the Staging_Store (local filesystem directory)
5. WHEN no custom TTL is provided in the request, THE Staging_Service SHALL assign a default TTL of 1 hour to the Staged_File_Record
6. WHEN a custom TTL (in seconds) is provided in the request body, THE Staging_Service SHALL use that value, capped at a configurable maximum (default: 24 hours)
7. THE Staging_Service SHALL record a Staged_File_Record containing: Commit_Token, original filename, MIME type, size in bytes, storage path, upload timestamp, TTL expiry timestamp, and uploader user ID
8. THE Temp_Upload_API SHALL reject uploads where the file size exceeds a configurable maximum (default: 50 MB) and return a 413 Payload Too Large response
9. THE Temp_Upload_API SHALL require authentication for the upload endpoint (the uploader's identity is recorded in the Staged_File_Record)
10. THE response body SHALL include: `commitToken`, `previewUrl`, `expiresAt` (ISO 8601 timestamp), `originalFilename`, `mimeType`, and `sizeBytes`

### Requirement 2: Staged File Preview

**User Story:** As a BrightChain application user, I want to preview a staged file via a temporary URL, so that I can see the content before deciding to commit or discard it.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/temp-upload/{commitToken}/preview`, THE Temp_Upload_API SHALL return the staged file bytes with the correct `Content-Type` header matching the file's MIME type
2. THE preview endpoint SHALL NOT require authentication — the Commit_Token acts as a bearer credential
3. THE preview endpoint SHALL set `Cache-Control: private, no-store` to prevent caching of temporary content
4. IF the Commit_Token does not match any Staged_File_Record, THE Temp_Upload_API SHALL return a 404 Not Found response
5. IF the staged file has expired (current time is past the TTL expiry), THE Temp_Upload_API SHALL return a 410 Gone response
6. THE Commit_Token SHALL be a cryptographically random UUID v4, making staged files not publicly discoverable by enumeration

### Requirement 3: Commit Staged File to Vault

**User Story:** As a BrightChain application developer, I want to commit a staged file into a permanent vault container with optional processing, so that the file enters the permanent storage layer only when the user confirms the action.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/temp-upload/{commitToken}/commit` with a JSON body specifying `vaultContainerId` and `targetFolderId`, THE Staging_Service SHALL move the staged file into the specified vault container via the permanent upload pipeline
2. WHEN the commit request includes a `createContainer` object (with `name`, `ownerId`, and optional `visibility`), THE Staging_Service SHALL create a new vault container using IVaultContainerService and use it as the target
3. WHEN the commit request includes `processingParams` (width, height, format, stripExif), THE Staging_Service SHALL apply the specified image transformations to the file before storing it in the vault
4. WHEN processing is not requested, THE Staging_Service SHALL commit the original file bytes without modification
5. WHEN the commit succeeds, THE Staging_Service SHALL delete the staged file from the Staging_Store and remove the Staged_File_Record
6. WHEN the commit succeeds, THE Temp_Upload_API SHALL return the permanent file metadata: `fileId`, `vaultContainerId`, `fileName`, `mimeType`, and `sizeBytes`
7. IF the Commit_Token does not match any Staged_File_Record, THE Temp_Upload_API SHALL return a 404 Not Found response
8. IF the staged file has expired, THE Temp_Upload_API SHALL return a 410 Gone response
9. THE commit endpoint SHALL require authentication, and the requesting user SHALL match the original uploader recorded in the Staged_File_Record
10. IF the requesting user does not match the original uploader, THE Temp_Upload_API SHALL return a 403 Forbidden response

### Requirement 4: Discard Staged File

**User Story:** As a BrightChain application user, I want to explicitly discard a staged file I no longer need, so that temporary storage is freed immediately without waiting for TTL expiry.

#### Acceptance Criteria

1. WHEN a DELETE request is sent to `/api/temp-upload/{commitToken}`, THE Staging_Service SHALL delete the staged file from the Staging_Store and remove the Staged_File_Record
2. WHEN the discard succeeds, THE Temp_Upload_API SHALL return a 204 No Content response
3. IF the Commit_Token does not match any Staged_File_Record, THE Temp_Upload_API SHALL return a 404 Not Found response
4. THE discard endpoint SHALL require authentication, and the requesting user SHALL match the original uploader recorded in the Staged_File_Record
5. IF the requesting user does not match the original uploader, THE Temp_Upload_API SHALL return a 403 Forbidden response

### Requirement 5: Automatic Cleanup of Expired Staged Files

**User Story:** As a platform operator, I want expired staged files to be automatically cleaned up, so that temporary storage does not grow unbounded and orphaned files never enter the permanent storage layer.

#### Acceptance Criteria

1. THE Cleanup_Job SHALL periodically scan all Staged_File_Records and identify files whose TTL expiry timestamp is in the past
2. WHEN an expired staged file is found, THE Cleanup_Job SHALL delete the file from the Staging_Store and remove the Staged_File_Record
3. THE Cleanup_Job SHALL run at a configurable interval (default: every 5 minutes)
4. THE Cleanup_Job SHALL log each cleanup action, including the Commit_Token, original filename, and age of the expired file
5. IF a file deletion fails (e.g., file already removed), THE Cleanup_Job SHALL log the error and continue processing remaining expired files without aborting
6. THE Cleanup_Job SHALL NOT interact with the permanent vault system — expired staged files are deleted without entering circulation

### Requirement 6: Image Processing at Commit Time

**User Story:** As a BrightChain application developer, I want to specify image processing parameters at commit time, so that the same staging system can serve different use cases (icon upload needs 256×256 PNG, post images need different dimensions).

#### Acceptance Criteria

1. WHEN `processingParams` is included in the commit request body, THE Staging_Service SHALL resize the image to the specified `width` and `height` (in pixels, cover-fit, center gravity)
2. WHEN `processingParams.format` is specified (one of `png`, `jpeg`, `webp`), THE Staging_Service SHALL convert the image to the requested format
3. WHEN `processingParams.stripExif` is true, THE Staging_Service SHALL strip all EXIF metadata from the image before storing
4. IF the staged file is not a supported image type (not `image/png`, `image/jpeg`, `image/gif`, `image/webp`) and `processingParams` is provided, THE Staging_Service SHALL return a 422 Unprocessable Entity response indicating that processing is only supported for image files
5. IF image processing fails (e.g., corrupt image data), THE Staging_Service SHALL return a 422 Unprocessable Entity response with a descriptive error message
6. THE Staging_Service SHALL use the `sharp` library for all image processing operations, consistent with existing platform conventions

### Requirement 7: Staging Store Configuration and Multi-Instance Support

**User Story:** As a platform operator, I want to configure the staging storage location and have it work across multiple API server instances, so that the system scales horizontally.

#### Acceptance Criteria

1. THE Staging_Service SHALL read the staging directory path from the `TEMP_UPLOAD_STAGING_DIR` environment variable
2. IF the `TEMP_UPLOAD_STAGING_DIR` environment variable is not set, THE Staging_Service SHALL fall back to a default directory (`{process.cwd()}/tmp/staging`)
3. WHEN the Staging_Service starts, THE Staging_Service SHALL verify the staging directory exists and is writable, creating it if necessary
4. THE Staging_Store SHALL use a flat file layout with the Commit_Token as the filename, avoiding directory nesting that complicates cleanup
5. THE Staged_File_Record metadata SHALL be stored in a JSON sidecar file alongside each staged file (named `{commitToken}.meta.json`), enabling stateless operation without a database dependency
6. THE Staging_Service SHALL support multiple API server instances sharing the same staging directory (e.g., via a shared filesystem mount), with no instance-local state beyond the filesystem

### Requirement 8: Shared Interfaces in brightchain-lib

**User Story:** As a BrightChain platform developer, I want the staging system's data interfaces to be defined in `brightchain-lib` so that both frontend and backend consumers can use them with appropriate type parameters.

#### Acceptance Criteria

1. THE staging system SHALL define `IStagedFileRecord<TId>` in `brightchain-lib` with fields: `commitToken` (string), `originalFilename` (string), `mimeType` (string), `sizeBytes` (number), `uploadedAt` (Date | string), `expiresAt` (Date | string), and `uploaderId` (TId)
2. THE staging system SHALL define `ITempUploadResponse` in `brightchain-lib` with fields: `commitToken` (string), `previewUrl` (string), `expiresAt` (string), `originalFilename` (string), `mimeType` (string), and `sizeBytes` (number)
3. THE staging system SHALL define `ICommitRequest<TId>` in `brightchain-lib` with fields: `vaultContainerId` (optional TId), `targetFolderId` (optional TId), `createContainer` (optional object with `name`, `ownerId`, `visibility`), and `processingParams` (optional IProcessingParams)
4. THE staging system SHALL define `IProcessingParams` in `brightchain-lib` with fields: `width` (optional number), `height` (optional number), `format` (optional `'png' | 'jpeg' | 'webp'`), and `stripExif` (optional boolean)
5. THE staging system SHALL define `ICommitResponse<TId>` in `brightchain-lib` with fields: `fileId` (TId), `vaultContainerId` (TId), `fileName` (string), `mimeType` (string), and `sizeBytes` (number)
6. ALL shared interfaces SHALL follow the existing generic type parameter convention (`TId` defaults to `string` for frontend, `GuidV4Buffer` for backend)

### Requirement 9: API Response Interfaces in brightchain-api-lib

**User Story:** As a backend developer, I want Express-specific API response types for the staging endpoints, so that route handlers have type-safe response objects consistent with the rest of the API.

#### Acceptance Criteria

1. THE staging system SHALL define `ITempUploadApiResponse` in `brightchain-api-lib` extending Express `Response` with `body: ITempUploadResponse`
2. THE staging system SHALL define `ICommitApiResponse` in `brightchain-api-lib` extending Express `Response` with `body: ICommitResponse<string>`
3. THE API response interfaces SHALL import their body types from `brightchain-lib`, following the existing pattern where shared data structures live in `brightchain-lib` and Express-specific wrappers live in `brightchain-api-lib`
