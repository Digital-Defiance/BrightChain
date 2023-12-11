---
title: "DigitalBurnbag Vault API Reference"
parent: "API Reference"
nav_order: 15
permalink: /api-reference/digitalburnbag-vault-api/
---

# DigitalBurnbag Vault API Reference

Complete HTTP API reference for the DigitalBurnbag Vault file platform. All endpoints are prefixed with `/burnbag`. The platform provides encrypted file storage organized into Vault Containers, with chunked upload, hierarchical folders, composable ACLs, cryptographic destruction with blockchain proof, external sharing, canary protocols (dead man's switch), quorum-governed operations, audit logging, and notifications.

**ID Serialization:**
All IDs in request paths and JSON bodies are hex-encoded strings. The server converts them to the internal `GuidV4Buffer` representation. Responses serialize all ID fields back to hex strings. This applies to all endpoints in this API.

## Authentication

Unless noted otherwise, every endpoint requires a valid JWT in the `Authorization: Bearer <token>` header. Unauthenticated requests receive `401`.

## API Sections

- [Vault Containers](#vault-containers-burnbagvaults) — `/burnbag/vaults`
- [Upload](#upload-burnbagupload) — `/burnbag/upload`
- [Files](#files-burnbagfiles) — `/burnbag/files`
- [Folders](#folders-burnbagfolders) — `/burnbag/folders`
- [ACL](#acl-burnbagacl) — `/burnbag/acl`
- [Sharing](#sharing-burnbagshare) — `/burnbag/share`
- [Destruction](#destruction-burnbagdestroy) — `/burnbag/destroy`
- [Canary Protocols](#canary-protocols-burnbagcanary) — `/burnbag/canary`
- [Quorum](#quorum-quorum) — `/quorum`
- [Audit](#audit-burnbagaudit) — `/burnbag/audit`
- [Folder Export](#folder-export-burnbagfolders) — `/burnbag/folders`
- [Notifications](#notifications-burnbagnotifications) — `/burnbag/notifications`
- [Storage Quota](#storage-quota-burnbagquota) — `/burnbag/quota`

---

# Vault Containers (`/burnbag/vaults`)

Vault Containers are the top-level organizational unit introduced by the multi-vault refactor. Each container holds its own root folder, file tree, quota, and seal status. Files and folders are always scoped to a container. Containers can be locked (read-only) or destroyed (all contents cryptographically erased).

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List all containers owned by the authenticated user |
| POST | `/` | Yes | Create a new container (auto-creates root folder) |
| GET | `/:id` | Yes | Get details for a specific container |
| POST | `/:id/lock` | Yes | Lock a container (read-only, no new uploads or modifications) |
| POST | `/:id/destroy` | Yes | Destroy a container and all contents (irreversible) |

All endpoints require a valid JWT in the `Authorization: Bearer <token>` header. All IDs are hex-encoded strings.

---

## GET /

List all vault containers owned by the authenticated user. Returns summary information for each container, including file/folder counts, seal status, and quota usage.

**200 Response:**

```json
[
  {
    "id": "aabbccdd...",
    "name": "Work Vault",
    "description": "Sensitive work documents",
    "state": "active",
    "fileCount": 42,
    "folderCount": 7,
    "sealStatus": {
      "allPristine": false,
      "sealedCount": 30,
      "accessedCount": 12,
      "totalFiles": 42
    },
    "usedBytes": 104857600,
    "quotaBytes": 10737418240,
    "createdAt": "2026-03-01T00:00:00.000Z"
  }
]
```

**Errors:**

- `401` — Invalid or missing authentication
- `500` — Server error
- `500` — Server error

---

## POST /

Create a new vault container. A root folder is automatically created inside the container. All fields except `name` are optional.

**Request:**

```json
{
  "name": "Work Vault",
  "description": "Sensitive work documents",
  "quotaBytes": 10737418240,
  "quorumGoverned": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Container name |
| `description` | string | No | Human-readable description |
| `quotaBytes` | number | No | Storage quota in bytes |
| `quorumGoverned` | boolean | No | Whether operations require quorum approval |

**201 Response:**

```json
{
  "id": "aabbccdd...",
  "name": "Work Vault",
  "description": "Sensitive work documents",
  "state": "active",
  "rootFolderId": "55667788...",
  "createdAt": "2026-04-10T12:00:00.000Z"
}
```

**Errors:**

- `400` — `name` is missing or invalid
- `401` — Invalid or missing authentication
- `500` — Server error

---

## GET /:id

Get detailed information about a specific vault container by its hex-encoded ID.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Container ID (hex) |

**200 Response:**

```json
{
  "id": "aabbccdd...",
  "name": "Work Vault",
  "description": "Sensitive work documents",
  "state": "active",
  "rootFolderId": "55667788...",
  "usedBytes": 104857600,
  "quotaBytes": 10737418240,
  "createdAt": "2026-03-01T00:00:00.000Z"
}
```

**Errors:**

- `400` — Invalid container ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions
- `404` — Container not found
- `500` — Server error

---

## POST /:id/lock

Lock a vault container, making it read-only. No new uploads, modifications, or deletions are permitted after locking. Existing files can still be downloaded and previewed.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Container ID (hex) |

**200 Response:**

```json
{
  "id": "aabbccdd...",
  "state": "locked"
}
```

**Errors:**

- `400` — Invalid container ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires owner)
- `404` — Container not found
- `500` — Server error

---

## POST /:id/destroy

Destroy a vault container and cryptographically erase all of its contents. This is irreversible. Each file within the container is independently destroyed.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Container ID (hex) |

**200 Response:**

```json
{
  "succeeded": 42,
  "failed": 0
}
```

**Errors:**

- `400` — Invalid container ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires owner), or quorum approval required
- `404` — Container not found
- `500` — Server error

---

# Upload (`/burnbag/upload`)

Chunked upload with server-side session management. Supports resume on unstable connections. Sessions expire to prevent orphaned chunks. Storage quota is checked before session creation.

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/init` | Yes | Initialize an upload session |
| PUT | `/:sessionId/chunk/:index` | Yes | Upload a single chunk |
| POST | `/:sessionId/finalize` | Yes | Finalize and assemble the upload |
| GET | `/:sessionId/status` | Yes | Get upload session status |

---

## POST /init

Initialize a new upload session. The server checks the user's storage quota before creating the session. Returns the session ID, recommended chunk size, and total chunk count.

**Request:**

```json
{
  "fileName": "report.pdf",
  "mimeType": "application/pdf",
  "totalSizeBytes": 10485760,
  "targetFolderId": "aabbccdd...",
  "vaultContainerId": "55667788..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileName` | string | Yes | Original file name |
| `mimeType` | string | Yes | MIME type of the file |
| `totalSizeBytes` | number | Yes | Total file size in bytes (must be > 0) |
| `targetFolderId` | string | Yes | Destination folder ID (hex) |
| `vaultContainerId` | string | Yes | Vault container ID (hex) |

**201 Response:**

```json
{
  "sessionId": "aabbccdd...",
  "chunkSize": 1048576,
  "totalChunks": 10
}
```

**Errors:**

- `400` — `totalSizeBytes` is not a positive number, or `targetFolderId`/`vaultContainerId` is missing or invalid
- `401` — Invalid or missing authentication
- `413` — Storage quota exceeded

---

## PUT /:sessionId/chunk/:index

Upload a single chunk of the file. The request body is the raw binary chunk data. Include a checksum header for integrity verification.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Upload session ID (hex) |
| `index` | number | Zero-based chunk index |

**Headers:**

| Header | Description |
|--------|-------------|
| `X-Chunk-Checksum` | Checksum of the chunk data for integrity verification |

**Request Body:** Raw binary data (`application/octet-stream`)

**200 Response:**

```json
{
  "chunkIndex": 0,
  "chunksReceived": 1,
  "totalChunks": 10
}
```

**Errors:**

- `400` — Invalid session ID format, invalid chunk index, or checksum mismatch
- `404` — Session not found or expired

---

## POST /:sessionId/finalize

Finalize the upload session. The server reassembles chunks, encrypts the file, stores encrypted blocks in the block store, creates a Vault, records the creation on the blockchain ledger, and stores file metadata in BrightDB.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Upload session ID (hex) |

**200 Response:**

```json
{
  "fileId": "aabbccdd...",
  "metadata": {
    "id": "aabbccdd...",
    "ownerId": "11223344...",
    "folderId": "55667788...",
    "fileName": "report.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 10485760,
    "currentVersionId": "99aabbcc...",
    "vaultCreationLedgerEntryHash": "deadbeef...",
    "createdAt": "2026-04-10T12:00:00.000Z",
    "updatedAt": "2026-04-10T12:00:00.000Z",
    "createdBy": "11223344...",
    "updatedBy": "11223344..."
  }
}
```

**Errors:**

- `400` — Invalid session ID format, or not all chunks received
- `404` — Session not found or expired

---

## GET /:sessionId/status

Get the current status of an upload session, including which chunks have been received.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Upload session ID (hex) |

**200 Response:**

```json
{
  "sessionId": "aabbccdd...",
  "status": "in_progress",
  "chunksReceived": 7,
  "totalChunks": 10,
  "fileName": "report.pdf",
  "totalSizeBytes": 10485760
}
```

**Errors:**

- `400` — Invalid session ID format
- `404` — Session not found or expired

---

# Files (`/burnbag/files`)

File operations including search, metadata, versioning, download, preview, non-access proofs, soft-delete, and restore. Each file version is backed by an independent Vault with its own encryption, destruction capability, and non-access proofs.

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search` | Yes | Search files with filters |
| GET | `/:id/metadata` | Yes | Get file metadata |
| GET | `/:id/versions` | Yes | Get version history |
| POST | `/:id/versions/:versionId/restore` | Yes | Restore a previous version |
| GET | `/:id/versions/:versionId/download` | Yes | Download a specific version |
| GET | `/:id/non-access-proof` | Yes | Get cryptographic non-access proof |
| GET | `/:id/preview` | Yes | Preview file content |
| GET | `/:id` | Yes | Download current version |
| PATCH | `/:id` | Yes | Update file metadata |
| DELETE | `/:id` | Yes | Soft-delete a file |
| POST | `/:id/restore` | Yes | Restore a soft-deleted file |

---

## GET /search

Search files with full-text query, tag filters, MIME type, folder scope, date range, size range, and deleted-file inclusion.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Full-text search query |
| `tags` | string or string[] | Filter by tags (repeatable) |
| `mimeType` | string | Filter by MIME type |
| `folderId` | string | Restrict to a specific folder (hex) |
| `dateFrom` | string | ISO 8601 date — files created after |
| `dateTo` | string | ISO 8601 date — files created before |
| `sizeMin` | number | Minimum file size in bytes |
| `sizeMax` | number | Maximum file size in bytes |
| `fileType` | string | File type category filter |
| `deleted` | boolean | Include soft-deleted files (`true`/`false`) |

All parameters are optional. Omitting all returns all accessible files.

**200 Response:**

```json
{
  "results": [
    {
      "id": "aabbccdd...",
      "name": "report.pdf",
      "ownerId": "11223344...",
      "folderId": "55667788...",
      "fileName": "report.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 10485760,
      "description": "Q4 financial report",
      "tags": ["finance", "quarterly"],
      "currentVersionId": "99aabbcc...",
      "deletedAt": null,
      "scheduledDestructionAt": null,
      "quorumGoverned": false,
      "visibleWatermark": false,
      "invisibleWatermark": true,
      "createdAt": "2026-04-01T08:00:00.000Z",
      "updatedAt": "2026-04-05T14:30:00.000Z",
      "modifiedAt": "2026-04-05T14:30:00.000Z"
    }
  ],
  "total": 1
}
```

**Errors:**

- `401` — Invalid or missing authentication

---

## GET /:id/metadata

Get full metadata for a single file, including vault reference and ACL information.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | File ID (hex) |

**200 Response:**

```json
{
  "id": "aabbccdd...",
  "name": "report.pdf",
  "ownerId": "11223344...",
  "folderId": "55667788...",
  "fileName": "report.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 10485760,
  "description": "Q4 financial report",
  "tags": ["finance", "quarterly"],
  "currentVersionId": "99aabbcc...",
  "vaultCreationLedgerEntryHash": "deadbeef...",
  "aclId": "eeff0011...",
  "deletedAt": null,
  "scheduledDestructionAt": null,
  "quorumGoverned": false,
  "visibleWatermark": false,
  "invisibleWatermark": true,
  "createdAt": "2026-04-01T08:00:00.000Z",
  "updatedAt": "2026-04-05T14:30:00.000Z",
  "modifiedAt": "2026-04-05T14:30:00.000Z",
  "createdBy": "11223344...",
  "updatedBy": "11223344..."
}
```

**Errors:**

- `400` — Invalid file ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions
- `404` — File not found

---

## GET /:id/versions

Get the version history for a file. Each version corresponds to an independent Vault.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | File ID (hex) |

**200 Response:**

```json
[
  {
    "versionId": "99aabbcc...",
    "versionNumber": 2,
    "sizeBytes": 10485760,
    "createdAt": "2026-04-05T14:30:00.000Z",
    "createdBy": "11223344...",
    "isCurrent": true
  },
  {
    "versionId": "88aabbcc...",
    "versionNumber": 1,
    "sizeBytes": 9437184,
    "createdAt": "2026-04-01T08:00:00.000Z",
    "createdBy": "11223344...",
    "isCurrent": false
  }
]
```

**Errors:**

- `400` — Invalid file ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions
- `404` — File not found

---

## POST /:id/versions/:versionId/restore

Restore a previous version, making it the current version. Creates a new version entry pointing to the restored vault.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | File ID (hex) |
| `versionId` | string | Version ID to restore (hex) |

**200 Response:** Updated file metadata (same shape as GET /:id/metadata).

**Errors:**

- `400` — Invalid file ID or version ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires `ManageVersions` flag)
- `404` — File or version not found

---

## GET /:id/versions/:versionId/download

Download a specific version of a file. Returns raw binary content.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | File ID (hex) |
| `versionId` | string | Version ID (hex) |

**200 Response:** Binary stream with headers:

- `Content-Type: application/octet-stream`
- `Content-Length: <size>`

**Errors:**

- `400` — Invalid file ID or version ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires `Download` flag)
- `404` — File or version not found

---

## GET /:id/non-access-proof

Generate a cryptographic non-access proof for a file. This proves that the server has not accessed the file's encrypted content. The proof is verifiable against the blockchain ledger.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | File ID (hex) |

**200 Response:**

```json
{
  "proof": {
    "bloomWitness": "...",
    "merkleRoot": "...",
    "merkleProof": ["..."],
    "timestamp": "2026-04-10T12:00:00.000Z"
  },
  "verificationBundle": {
    "ledgerEntryHash": "deadbeef...",
    "blockHeight": 42,
    "chainId": "brightchain-mainnet"
  }
}
```

**Errors:**

- `400` — Invalid file ID format
- `401` — Invalid or missing authentication
- `404` — File not found

---

## GET /:id/preview

Preview file content. Returns the decrypted file content as a binary stream with the file's actual MIME type. Access is logged in the audit trail.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | File ID (hex) |

**200 Response:** Binary stream with headers:

- `Content-Type: <file's MIME type>` (e.g. `application/pdf`, `image/png`)
- `Content-Length: <size>`
- `Content-Disposition: inline; filename="<fileName>"`

**Errors:**

- `400` — Invalid file ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires `Preview` flag)
- `404` — File not found

---

## GET /:id

Download the current version of a file. Returns the decrypted file content as a binary stream. Access is logged in the audit trail with the requester's IP address and timestamp.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | File ID (hex) |

**200 Response:** Binary stream with headers:

- `Content-Type: <file's MIME type>` (e.g. `application/pdf`, `image/png`)
- `Content-Length: <size>`
- `Content-Disposition: attachment; filename="<fileName>"`

**Errors:**

- `400` — Invalid file ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires `Download` flag)
- `404` — File not found

---

## PATCH /:id

Update file metadata fields (name, description, tags, etc.). Does not modify the file content or create a new version.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | File ID (hex) |

**Request:**

```json
{
  "fileName": "renamed-report.pdf",
  "description": "Updated Q4 financial report",
  "tags": ["finance", "quarterly", "final"]
}
```

All fields are optional — only provided fields are updated.

**200 Response:** Updated file metadata (same shape as GET /:id/metadata).

**Errors:**

- `400` — Invalid file ID format or validation failure
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires `Write` flag)
- `404` — File not found

---

## DELETE /:id

Soft-delete a file. The file is marked with a `deletedAt` timestamp and hidden from normal listings. It can be restored with POST /:id/restore. For permanent cryptographic destruction, use the Destruction API.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | File ID (hex) |

**204 Response:** *(empty body)*

**Errors:**

- `400` — Invalid file ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires `Delete` flag)
- `404` — File not found

---

## POST /:id/restore

Restore a soft-deleted file to its original location.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | File ID (hex) |

**200 Response:**

```json
{
  "restored": true
}
```

**Errors:**

- `400` — Invalid file ID format, or file is not deleted
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions
- `404` — File not found

---

# Folders (`/burnbag/folders`)

Hierarchical folder management with ACL inheritance. Every vault container has an auto-created root folder. Folders support sorting, breadcrumb path resolution, and item relocation.

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Yes | Create a folder |
| GET | `/root` | Yes | Get root folder with contents |
| GET | `/resolve/{*path}` | Yes | Resolve a virtual path to folder/file |
| GET | `/:id/path` | Yes | Get breadcrumb path to a folder |
| POST | `/:id/move` | Yes | Move a file or folder |
| GET | `/:id` | Yes | Get folder contents |
| DELETE | `/:id` | Yes | Soft-delete a folder |

---

## POST /

Create a new folder inside a parent folder within a vault container.

**Request:**

```json
{
  "name": "Project Documents",
  "parentFolderId": "55667788...",
  "vaultContainerId": "aabbccdd..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Folder name |
| `parentFolderId` | string | Yes | Parent folder ID (hex) |
| `vaultContainerId` | string | Yes | Vault container ID (hex) |

**201 Response:**

```json
{
  "id": "aabbccdd...",
  "name": "Project Documents",
  "ownerId": "11223344...",
  "parentFolderId": "55667788...",
  "quorumGoverned": false,
  "createdAt": "2026-04-10T12:00:00.000Z",
  "updatedAt": "2026-04-10T12:00:00.000Z"
}
```

**Errors:**

- `400` — `parentFolderId` or `vaultContainerId` is missing or has invalid format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions on parent folder
- `404` — Parent folder not found

---

## GET /root

Get the root folder along with its immediate contents (files and subfolders). When `vaultContainerId` is provided, returns the root folder for that specific container. Otherwise returns the user's default root folder.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vaultContainerId` | string | Vault container ID (hex). Scopes to a specific container's root folder |

**200 Response:**

```json
{
  "folder": {
    "id": "55667788...",
    "name": "Root",
    "ownerId": "11223344...",
    "parentFolderId": null,
    "quorumGoverned": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-04-10T12:00:00.000Z"
  },
  "files": [
    {
      "id": "aabbccdd...",
      "name": "report.pdf",
      "ownerId": "11223344...",
      "folderId": "55667788...",
      "fileName": "report.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 10485760,
      "description": null,
      "tags": [],
      "currentVersionId": "99aabbcc...",
      "deletedAt": null,
      "scheduledDestructionAt": null,
      "quorumGoverned": false,
      "visibleWatermark": false,
      "invisibleWatermark": false,
      "createdAt": "2026-04-01T08:00:00.000Z",
      "updatedAt": "2026-04-05T14:30:00.000Z",
      "modifiedAt": "2026-04-05T14:30:00.000Z"
    }
  ],
  "subfolders": [
    {
      "id": "eeff0011...",
      "name": "Project Documents",
      "ownerId": "11223344...",
      "parentFolderId": "55667788...",
      "quorumGoverned": false,
      "createdAt": "2026-04-10T12:00:00.000Z",
      "updatedAt": "2026-04-10T12:00:00.000Z"
    }
  ]
}
```

**Errors:**

- `400` — Invalid `vaultContainerId` format
- `401` — Invalid or missing authentication

---

## GET /resolve/{*path}

Resolve a virtual path (e.g. `/resolve/Project Documents/Q4 Reports/report.pdf`) to a folder chain and optional file. Walks the folder tree segment by segment starting from the root folder. Matching is case-insensitive. When `vaultContainerId` is provided, resolution starts from that container's root folder.

If the final segment matches a file, it is returned in the `file` field. Otherwise `file` is `null` and the full folder chain is returned.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | string | Forward-slash-separated virtual path segments (URL-encoded) |

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vaultContainerId` | string | Vault container ID (hex). Scopes resolution to a specific container |

**200 Response (folder path):**

```json
{
  "folders": [
    {
      "id": "55667788...",
      "name": "Root",
      "ownerId": "11223344...",
      "parentFolderId": null,
      "quorumGoverned": false,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-04-10T12:00:00.000Z"
    },
    {
      "id": "eeff0011...",
      "name": "Project Documents",
      "ownerId": "11223344...",
      "parentFolderId": "55667788...",
      "quorumGoverned": false,
      "createdAt": "2026-04-10T12:00:00.000Z",
      "updatedAt": "2026-04-10T12:00:00.000Z"
    }
  ],
  "file": null
}
```

**200 Response (path ending in a file):**

```json
{
  "folders": [
    { "id": "55667788...", "name": "Root", "..." : "..." },
    { "id": "eeff0011...", "name": "Project Documents", "..." : "..." }
  ],
  "file": {
    "id": "aabbccdd...",
    "name": "report.pdf",
    "ownerId": "11223344...",
    "folderId": "eeff0011...",
    "fileName": "report.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 10485760,
    "modifiedAt": "2026-04-05T14:30:00.000Z",
    "createdAt": "2026-04-01T08:00:00.000Z"
  }
}
```

**Errors:**

- `401` — Invalid or missing authentication
- `404` — Path not found (a segment did not match any folder or file)

---

## GET /:id/path

Get the breadcrumb path from the root folder to the specified folder. Returns an ordered array of `{id, name}` pairs from root to the target folder.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Folder ID (hex) |

**200 Response:**

```json
[
  { "id": "55667788...", "name": "Root" },
  { "id": "eeff0011...", "name": "Project Documents" },
  { "id": "aabb0022...", "name": "Q4 Reports" }
]
```

**Errors:**

- `400` — Invalid folder ID format
- `404` — Folder not found

---

## POST /:id/move

Move a file or folder to a new parent folder.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | ID of the item to move (hex) |

**Request:**

```json
{
  "itemType": "file",
  "newParentId": "eeff0011..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itemType` | string | Yes | `"file"` or `"folder"` |
| `newParentId` | string | Yes | Destination folder ID (hex) |

**200 Response:**

```json
{
  "moved": true
}
```

**Errors:**

- `400` — Invalid item ID or `newParentId` format, or `newParentId` missing
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions on source or destination
- `404` — Item or destination folder not found
- `409` — Circular reference (moving a folder into its own descendant)

---

## GET /:id

Get the contents of a folder (files and subfolders), with optional sorting. Also returns the folder's own metadata and breadcrumb path.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Folder ID (hex) |

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sortField` | string | Sort by: `name`, `size`, `modifiedDate`, or `type` |
| `sortDirection` | string | `asc` or `desc` (default: `asc`) |

**200 Response:**

```json
{
  "folder": {
    "id": "eeff0011...",
    "name": "Project Documents",
    "ownerId": "11223344...",
    "parentFolderId": "55667788...",
    "quorumGoverned": false,
    "createdAt": "2026-04-10T12:00:00.000Z",
    "updatedAt": "2026-04-10T12:00:00.000Z"
  },
  "files": [],
  "subfolders": []
}
```

**Errors:**

- `400` — Invalid folder ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions
- `404` — Folder not found

---

## DELETE /:id

Soft-delete a folder. The folder and its contents are marked as deleted and hidden from normal listings. Requires `Delete` permission on the folder.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Folder ID (hex) |

**204 Response:** *(empty body)*

**Errors:**

- `400` — Invalid folder ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires `Delete` flag)
- `404` — Folder not found

---

# ACL (`/burnbag/acl`)

Composable POSIX-style access control lists. Permissions are built from atomic flags composed into named Permission Sets. ACLs can be applied to files or folders, with folder ACLs cascading to descendants unless explicitly overridden.

## Permission Flags

| Flag | Description |
|------|-------------|
| `read` | View file/folder metadata |
| `write` | Modify file content or folder structure |
| `delete` | Soft-delete files or folders |
| `share` | Create share links or share internally |
| `admin` | Manage ACLs and permissions |
| `preview` | Preview file content in-browser |
| `comment` | Add comments to files |
| `download` | Download file content |
| `manage_versions` | Restore or manage file versions |

## Built-in Permission Levels

| Level | Flags |
|-------|-------|
| `viewer` | `read`, `preview`, `download` |
| `commenter` | `read`, `preview`, `download`, `comment` |
| `editor` | `read`, `write`, `preview`, `download`, `comment`, `manage_versions` |
| `owner` | All flags |

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/permission-sets` | Yes | Create a custom permission set |
| GET | `/permission-sets` | Yes | List permission sets |
| GET | `/:targetType/:targetId/effective/:principalId` | Yes | Get effective permissions |
| GET | `/:targetType/:targetId` | Yes | Get ACL for a target |
| PUT | `/:targetType/:targetId` | Yes | Set ACL for a target |

---

## POST /permission-sets

Create a custom permission set with a specific combination of flags.

**Request:**

```json
{
  "name": "Reviewer",
  "flags": ["read", "preview", "comment"],
  "organizationId": "org-uuid..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable name |
| `flags` | string[] | Yes | Array of `PermissionFlag` values |
| `organizationId` | string | No | Scope to an organization (hex) |

**201 Response:**

```json
{
  "id": "aabbccdd...",
  "name": "Reviewer",
  "flags": ["read", "preview", "comment"],
  "organizationId": "org-uuid...",
  "createdBy": "11223344..."
}
```

**Errors:**

- `400` — Invalid flags or missing name
- `401` — Invalid or missing authentication

---

## GET /permission-sets

List all available permission sets, optionally filtered by organization.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `organizationId` | string | Filter by organization ID (hex) |

**200 Response:**

```json
[
  {
    "id": "aabbccdd...",
    "name": "Reviewer",
    "flags": ["read", "preview", "comment"],
    "organizationId": "org-uuid...",
    "createdBy": "11223344..."
  }
]
```

---

## GET /:targetType/:targetId/effective/:principalId

Compute the effective permissions for a principal (user) on a target (file or folder), taking into account ACL inheritance, explicit overrides, and context (IP address, timestamp).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetType` | string | `file` or `folder` |
| `targetId` | string | Target ID (hex) |
| `principalId` | string | User ID (hex) |

**200 Response:**

```json
{
  "flags": ["read", "preview", "download"],
  "level": "viewer",
  "inherited": true,
  "source": "folder:55667788..."
}
```

**Errors:**

- `400` — Invalid target ID or principal ID format
- `404` — Target not found

---

## GET /:targetType/:targetId

Get the full ACL document for a file or folder, including all entries.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetType` | string | `file` or `folder` |
| `targetId` | string | Target ID (hex) |

**200 Response:**

```json
{
  "entries": [
    {
      "principalId": "11223344...",
      "level": "owner",
      "flags": ["read", "write", "delete", "share", "admin", "preview", "comment", "download", "manage_versions"],
      "customPermissionSetId": null
    },
    {
      "principalId": "55667788...",
      "level": "editor",
      "flags": ["read", "write", "preview", "download", "comment", "manage_versions"],
      "customPermissionSetId": null
    }
  ]
}
```

Returns `{ "entries": [] }` if no ACL document exists for the target (permissions are inherited from the parent folder).

**Errors:**

- `400` — Invalid target ID format
- `404` — Target not found

---

## PUT /:targetType/:targetId

Set or replace the ACL for a file or folder. This replaces the entire ACL document.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetType` | string | `file` or `folder` |
| `targetId` | string | Target ID (hex) |

**Request:**

```json
{
  "entries": [
    {
      "principalId": "11223344...",
      "level": "owner"
    },
    {
      "principalId": "55667788...",
      "level": "viewer"
    },
    {
      "principalId": "99aabbcc...",
      "customPermissionSetId": "aabbccdd...",
      "flags": ["read", "preview", "comment"]
    }
  ]
}
```

Each entry specifies either a built-in `level` or a `customPermissionSetId` with explicit `flags`.

**200 Response:**

```json
{
  "updated": true
}
```

**Errors:**

- `400` — Invalid target ID format or invalid ACL entries
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires `Admin` flag)
- `404` — Target not found

---

# Sharing (`/burnbag/share`)

Three-tier sharing model: internal sharing (to platform users), external share links (server-proxied, ephemeral key pair, or recipient public key), and magnet URLs. Share links support optional password protection and expiration. All sharing activity is auditable.

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/internal` | Yes | Share a file with a platform user |
| POST | `/link` | Yes | Create an external share link |
| GET | `/shared-with-me` | Yes | List files shared with the current user |
| GET | `/link/:token` | No | Access a share link |
| DELETE | `/link/:id` | Yes | Revoke a share link |
| GET | `/:fileId/audit` | Yes | Get sharing audit trail for a file |
| GET | `/:fileId/magnet` | Yes | Get a magnet URL for a file |

---

## POST /internal

Share a file with another platform user. The file's symmetric encryption key is wrapped under the recipient's ECIES public key and stored in the key wrapping table.

**Request:**

```json
{
  "fileId": "aabbccdd...",
  "recipientId": "55667788...",
  "permissionLevel": "viewer"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileId` | string | Yes | File ID (hex) |
| `recipientId` | string | Yes | Recipient user ID (hex) |
| `permissionLevel` | string | No | Permission level to grant (default: `viewer`) |

**201 Response:**

```json
{
  "shared": true
}
```

**Errors:**

- `400` — Missing required fields
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires `Share` flag)
- `404` — File or recipient not found

---

## POST /link

Create an external share link. Supports three security modes:

| Mode | Description |
|------|-------------|
| `server_proxied` | Server decrypts and re-encrypts for transport. Simplest for recipients. |
| `ephemeral_key_pair` | Server generates an ephemeral ECIES key pair. E2E encrypted without requiring recipient keys. |
| `recipient_public_key` | File key wrapped under recipient's known public key. Strongest security. |

**Request:**

```json
{
  "fileId": "aabbccdd...",
  "mode": "ephemeral_key_pair",
  "password": "optional-password",
  "expiresAt": "2026-05-01T00:00:00.000Z",
  "maxAccessCount": 10
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileId` | string | Yes | File ID (hex) |
| `mode` | string | Yes | `server_proxied`, `ephemeral_key_pair`, or `recipient_public_key` |
| `password` | string | No | Optional password protection |
| `expiresAt` | string | No | ISO 8601 expiration timestamp |
| `maxAccessCount` | number | No | Maximum number of accesses before auto-revocation |
| `recipientPublicKey` | string | No | Required for `recipient_public_key` mode (hex) |

**201 Response:**

```json
{
  "token": "share-token-string",
  "url": "https://digitalburnbag.com/s/share-token-string",
  "mode": "ephemeral_key_pair",
  "expiresAt": "2026-05-01T00:00:00.000Z",
  "maxAccessCount": 10,
  "accessCount": 0
}
```

**Errors:**

- `400` — Missing required fields or invalid mode
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires `Share` flag)
- `404` — File not found

---

## GET /shared-with-me

List all files that have been shared with the authenticated user.

**200 Response:**

```json
[
  {
    "fileId": "aabbccdd...",
    "fileName": "report.pdf",
    "sharedBy": "11223344...",
    "permissionLevel": "viewer",
    "sharedAt": "2026-04-10T12:00:00.000Z"
  }
]
```

**Errors:**

- `401` — Invalid or missing authentication

---

## GET /link/:token

Access a share link. No authentication required. If the link is password-protected, the password must be provided as a query parameter.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | string | Share link token |

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `password` | string | Required if the link is password-protected |

**200 Response:**

```json
{
  "fileId": "aabbccdd...",
  "fileName": "report.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 10485760,
  "mode": "ephemeral_key_pair",
  "ephemeralPublicKey": "04abcdef...",
  "encryptedContent": "..."
}
```

The response shape varies by mode. For `server_proxied`, the content is directly available. For `ephemeral_key_pair`, the client must decrypt using the ephemeral private key embedded in the URL fragment. For `recipient_public_key`, the client decrypts with their private key.

Access is logged with the requester's IP address and timestamp.

**Errors:**

- `401` — Incorrect password
- `404` — Share link not found, expired, or access count exceeded
- `410` — Share link has been revoked

---

## DELETE /link/:id

Revoke a share link. The link becomes immediately inaccessible.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Share link ID (hex) |

**204 Response:** *(empty body)*

**Errors:**

- `400` — Invalid share link ID format
- `401` — Invalid or missing authentication
- `403` — Not the link creator
- `404` — Share link not found

---

## GET /:fileId/audit

Get the sharing audit trail for a file, including all share link accesses and internal shares.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `fileId` | string | File ID (hex) |

**200 Response:**

```json
[
  {
    "action": "share_link_accessed",
    "token": "share-token-string",
    "ipAddress": "192.168.1.1",
    "timestamp": "2026-04-10T14:00:00.000Z"
  },
  {
    "action": "shared_internally",
    "recipientId": "55667788...",
    "permissionLevel": "viewer",
    "timestamp": "2026-04-10T12:00:00.000Z"
  }
]
```

**Errors:**

- `400` — Invalid file ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions
- `404` — File not found

---

## GET /:fileId/magnet

Get a magnet URL for a file. Magnet URLs encode the file's block store references and encryption metadata, allowing peer-to-peer retrieval.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `fileId` | string | File ID (hex) |

**200 Response:**

```json
{
  "magnetUrl": "magnet:?xt=urn:brightchain:aabbccdd...&dn=report.pdf&xs=..."
}
```

**Errors:**

- `400` — Invalid file ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions
- `404` — File not found

---

# Destruction (`/burnbag/destroy`)

Cryptographic file destruction with blockchain proof. Destruction is irreversible — the Vault's encryption keys are securely erased and a destruction proof is recorded on the blockchain ledger. Supports immediate destruction, scheduled destruction, batch operations, and independent proof verification.

Quorum-governed files require multi-party approval before destruction (see [Quorum](#quorum-burnbagquorum)).

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/batch` | Yes | Destroy multiple files at once |
| POST | `/:fileId/schedule` | Yes | Schedule future destruction |
| DELETE | `/:fileId/schedule` | Yes | Cancel scheduled destruction |
| POST | `/:fileId/verify` | Yes | Verify a destruction proof |
| POST | `/:fileId` | Yes | Immediately destroy a file |

---

## POST /batch

Destroy multiple files in a single operation. Each file is independently destroyed and receives its own destruction proof.

**Request:**

```json
{
  "fileIds": ["aabbccdd...", "eeff0011...", "22334455..."]
}
```

**200 Response:**

```json
{
  "results": [
    {
      "fileId": "aabbccdd...",
      "destroyed": true,
      "proof": { "merkleRoot": "...", "ledgerEntryHash": "..." }
    },
    {
      "fileId": "eeff0011...",
      "destroyed": true,
      "proof": { "merkleRoot": "...", "ledgerEntryHash": "..." }
    },
    {
      "fileId": "22334455...",
      "destroyed": false,
      "error": "Quorum approval required"
    }
  ]
}
```

**Errors:**

- `401` — Invalid or missing authentication
- `403` — Insufficient permissions on one or more files

---

## POST /:fileId/schedule

Schedule a file for future destruction. The file will be automatically destroyed at the specified time.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `fileId` | string | File ID (hex) |

**Request:**

```json
{
  "scheduledAt": "2026-05-01T00:00:00.000Z"
}
```

**201 Response:**

```json
{
  "scheduled": true
}
```

**Errors:**

- `400` — Invalid file ID format, or `scheduledAt` is in the past
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires `Delete` flag)
- `404` — File not found

---

## DELETE /:fileId/schedule

Cancel a previously scheduled destruction. The file's `scheduledDestructionAt` is cleared.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `fileId` | string | File ID (hex) |

**200 Response:**

```json
{
  "cancelled": true
}
```

**Errors:**

- `400` — Invalid file ID format, or no destruction is scheduled
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions
- `404` — File not found

---

## POST /:fileId/verify

Verify a destruction proof against the blockchain ledger. This endpoint can be used by any authenticated user to independently confirm that a file was cryptographically destroyed.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `fileId` | string | File ID (hex) |

**Request:**

```json
{
  "proof": {
    "merkleRoot": "...",
    "bloomWitness": "...",
    "timestamp": "2026-04-10T12:00:00.000Z"
  },
  "bundle": {
    "ledgerEntryHash": "deadbeef...",
    "blockHeight": 42,
    "chainId": "brightchain-mainnet"
  }
}
```

**200 Response:**

```json
{
  "valid": true,
  "verifiedAt": "2026-04-10T12:05:00.000Z",
  "ledgerConfirmed": true
}
```

**Errors:**

- `400` — Invalid proof or bundle format
- `401` — Invalid or missing authentication

---

## POST /:fileId

Immediately destroy a file. Erases the Vault's encryption keys, records the destruction on the blockchain ledger, and returns the destruction proof.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `fileId` | string | File ID (hex) |

**200 Response:**

```json
{
  "destroyed": true,
  "proof": {
    "merkleRoot": "...",
    "bloomWitness": "...",
    "timestamp": "2026-04-10T12:00:00.000Z"
  },
  "verificationBundle": {
    "ledgerEntryHash": "deadbeef...",
    "blockHeight": 42,
    "chainId": "brightchain-mainnet"
  }
}
```

**Errors:**

- `400` — Invalid file ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires `Delete` flag), or quorum approval required
- `404` — File not found
- `409` — File already destroyed

---

# Canary Protocols (`/burnbag/canary`)

Dead man's switch and automated fail-safe protocols. Canary bindings monitor user activity through third-party providers and trigger protocol actions (file destruction, data distribution, public disclosure) when conditions are met or not met.

## Canary Conditions

| Condition | Description |
|-----------|-------------|
| `presence` | Trigger when the signal IS present (e.g., duress code entered) |
| `duress` | Trigger when the signal indicates duress |
| `absense` | Trigger when the signal is NOT present (dead man's switch) |

## Protocol Actions

| Action | Description |
|--------|-------------|
| `DeactivateAccount` | Deactivate the user's account |
| `DeleteAccount` | Permanently delete the account |
| `DeleteFiles` | Destroy specified files |
| `DeleteFolders` | Destroy specified folders and contents |
| `EmailFilesAsAttachments` | Email files as attachments to recipients |
| `EmailFilesAsLinks` | Email share links to recipients |
| `SendSMS` | Send SMS notifications to recipients |
| `CallWebhook` | Call a custom webhook URL |
| `ReleaseToPublic` | Make files publicly accessible |
| `ReleaseToRestricted` | Release to a restricted recipient list |
| `ReleaseToPassword` | Release with password protection |
| `ReleaseToSelf` | Release back to the user (for testing) |
| `RestrictToNone` | Remove all access |
| `DeactivateProtocol` | Deactivate the current protocol |
| `EnableSecondaryProtocols` | Enable cascading secondary protocols |

## Canary Providers

Canary bindings can monitor activity from a wide range of providers:

| Category | Providers |
|----------|-----------|
| Health & Fitness | Fitbit, Strava, Apple Health, Google Fit, Garmin, Whoop, Oura |
| Social Media | Twitter/X, Facebook, Instagram, LinkedIn, Mastodon, Bluesky, Reddit |
| Developer | GitHub, GitLab, Bitbucket, Stack Overflow |
| Communication | Slack, Discord, Teams, Telegram, Signal |
| Productivity | Google, Microsoft 365, Notion, Todoist |
| Financial | Plaid |
| IoT / Smart Home | Home Assistant, SmartThings |
| Gaming | Steam, Xbox, PlayStation |
| Special | Custom Webhook, BrightChain/DigitalBurnbag, Manual Check-in, Email Ping, SMS Ping |

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/bindings` | Yes | List canary bindings |
| GET | `/recipients` | Yes | List recipient lists |
| POST | `/bindings` | Yes | Create a canary binding |
| POST | `/recipients` | Yes | Create a recipient list |
| POST | `/bindings/:id/dry-run` | Yes | Simulate a binding trigger |
| PATCH | `/bindings/:id` | Yes | Update a canary binding |
| DELETE | `/bindings/:id` | Yes | Delete a canary binding |
| PATCH | `/recipients/:id` | Yes | Update a recipient list |

---

## GET /bindings

List all canary bindings for the authenticated user.

**200 Response:**

```json
[
  {
    "id": "aabbccdd...",
    "protocolId": "11223344...",
    "protocolAction": "DeleteFiles",
    "canaryCondition": "absense",
    "canaryProvider": "github",
    "fileIds": ["eeff0011...", "22334455..."],
    "folderIds": [],
    "recipientListId": "99aabbcc...",
    "cascadeBindingIds": [],
    "enabled": true,
    "timeoutMs": 604800000,
    "lastSignalAt": "2026-04-09T08:00:00.000Z",
    "createdBy": "11223344...",
    "createdAt": "2026-03-01T00:00:00.000Z",
    "updatedAt": "2026-04-09T08:00:00.000Z"
  }
]
```

**Errors:**

- `401` — Invalid or missing authentication

---

## GET /recipients

List all recipient lists for the authenticated user.

**200 Response:**

```json
[
  {
    "id": "99aabbcc...",
    "name": "Emergency Contacts",
    "ownerId": "11223344...",
    "recipients": [
      {
        "name": "Journalist",
        "email": "journalist@example.com",
        "publicKey": "04abcdef..."
      },
      {
        "name": "Lawyer",
        "email": "lawyer@example.com"
      }
    ],
    "createdAt": "2026-03-01T00:00:00.000Z",
    "updatedAt": "2026-03-01T00:00:00.000Z"
  }
]
```

**Errors:**

- `401` — Invalid or missing authentication

---

## POST /bindings

Create a new canary binding. Accepts both service-style field names and frontend-friendly shorthand.

**Request (service-style):**

```json
{
  "protocolAction": "DeleteFiles",
  "canaryCondition": "absense",
  "canaryProvider": "github",
  "fileIds": ["eeff0011..."],
  "folderIds": [],
  "recipientListId": "99aabbcc...",
  "timeoutMs": 604800000,
  "cascadeDelayMs": [3600000]
}
```

**Request (frontend shorthand):**

```json
{
  "action": "DeleteFiles",
  "condition": "absense",
  "provider": "github",
  "targetIds": ["eeff0011..."],
  "recipientListId": "99aabbcc...",
  "timeoutMs": 604800000,
  "cascadeDelay": 3600000
}
```

| Service Field | Shorthand | Type | Required | Description |
|---------------|-----------|------|----------|-------------|
| `protocolAction` | `action` | string | Yes | Protocol action to execute |
| `canaryCondition` | `condition` | string | Yes | Trigger condition |
| `canaryProvider` | `provider` | string | Yes | Activity provider |
| `fileIds` | `targetIds` | string[] | No | File IDs to act on (hex) |
| `folderIds` | — | string[] | No | Folder IDs to act on (hex) |
| `recipientListId` | — | string | No | Recipient list ID (hex) |
| `timeoutMs` | — | number | No | Timeout in milliseconds for absence detection |
| `cascadeDelayMs` | `cascadeDelay` | number[] or number | No | Delay(s) before cascading to secondary protocols |

**201 Response:** The created binding (same shape as GET /bindings items).

**Errors:**

- `400` — Missing required fields or invalid values
- `401` — Invalid or missing authentication

---

## POST /recipients

Create a new recipient list.

**Request:**

```json
{
  "name": "Emergency Contacts",
  "recipients": [
    {
      "name": "Journalist",
      "email": "journalist@example.com",
      "publicKey": "04abcdef..."
    },
    {
      "name": "Lawyer",
      "email": "lawyer@example.com"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | List name |
| `recipients` | object[] | Yes | Array of recipient objects |
| `recipients[].name` | string | Yes | Recipient display name |
| `recipients[].email` | string | Yes | Recipient email address |
| `recipients[].publicKey` | string | No | Recipient's ECIES public key (hex) for E2E encryption |

**201 Response:** The created recipient list (same shape as GET /recipients items).

**Errors:**

- `400` — Missing required fields
- `401` — Invalid or missing authentication

---

## POST /bindings/:id/dry-run

Simulate triggering a canary binding without actually executing the protocol actions. Returns a report of what would happen.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Binding ID (hex) |

**200 Response:**

```json
{
  "bindingId": "aabbccdd...",
  "filesAffected": ["eeff0011...", "22334455..."],
  "foldersAffected": [],
  "affectedFileCount": 2,
  "recipientCount": 2,
  "actionsDescription": []
}
```

**Errors:**

- `400` — Invalid binding ID format
- `401` — Invalid or missing authentication
- `404` — Binding not found

---

## PATCH /bindings/:id

Update an existing canary binding. Only provided fields are modified.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Binding ID (hex) |

**Request:**

```json
{
  "enabled": false,
  "timeoutMs": 1209600000
}
```

**200 Response:** The updated binding (same shape as GET /bindings items).

**Errors:**

- `400` — Invalid binding ID format
- `401` — Invalid or missing authentication
- `403` — Not the binding owner
- `404` — Binding not found

---

## DELETE /bindings/:id

Delete a canary binding.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Binding ID (hex) |

**204 Response:** *(empty body)*

**Errors:**

- `400` — Invalid binding ID format
- `401` — Invalid or missing authentication
- `403` — Not the binding owner
- `404` — Binding not found

---

## PATCH /recipients/:id

Update an existing recipient list.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Recipient list ID (hex) |

**Request:**

```json
{
  "name": "Updated Emergency Contacts",
  "recipients": [
    {
      "name": "Journalist",
      "email": "journalist@example.com",
      "publicKey": "04abcdef..."
    }
  ]
}
```

**200 Response:** The updated recipient list (same shape as GET /recipients items).

**Errors:**

- `400` — Invalid recipient list ID format
- `401` — Invalid or missing authentication
- `403` — Not the list owner
- `404` — Recipient list not found

---

# Quorum (`/quorum`)

Multi-party approval for sensitive operations on quorum-governed files and folders. When a file or folder has `quorumGoverned: true`, operations like destruction, external sharing, bulk deletion, and ACL changes require approval from a configurable quorum of authorized members. Quorum is an independent BrightChain service — it is not part of the burnbag namespace, though burnbag operations may trigger quorum workflows.

## Quorum Operation Types

| Type | Description |
|------|-------------|
| `destruction` | Cryptographic file destruction |
| `external_share` | Creating external share links |
| `bulk_delete` | Batch deletion of files |
| `acl_change` | Modifying access control lists |

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/request` | Yes | Request quorum approval |
| POST | `/:requestId/approve` | Yes | Approve a quorum request |
| POST | `/:requestId/reject` | Yes | Reject a quorum request |

---

## POST /request

Submit a request for quorum approval. The request is distributed to all quorum members for voting.

**Request:**

```json
{
  "operationType": "destruction",
  "targetId": "aabbccdd...",
  "targetType": "file",
  "reason": "Scheduled data retention policy cleanup",
  "metadata": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `operationType` | string | Yes | One of: `destruction`, `external_share`, `bulk_delete`, `acl_change` |
| `targetId` | string | Yes | Target file or folder ID (hex) |
| `targetType` | string | Yes | `file` or `folder` |
| `reason` | string | No | Human-readable justification |
| `metadata` | object | No | Additional context for the operation |

**201 Response:**

```json
{
  "requestId": "aabbccdd...",
  "operationType": "destruction",
  "targetId": "eeff0011...",
  "status": "pending",
  "requiredApprovals": 3,
  "currentApprovals": 0,
  "currentRejections": 0,
  "createdAt": "2026-04-10T12:00:00.000Z",
  "expiresAt": "2026-04-17T12:00:00.000Z"
}
```

**Errors:**

- `400` — Missing required fields or invalid operation type
- `401` — Invalid or missing authentication
- `404` — Target not found or not quorum-governed

---

## POST /:requestId/approve

Approve a pending quorum request. Requires a cryptographic signature from the approving member. When the required number of approvals is reached, the operation is automatically executed.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `requestId` | string | Quorum request ID (hex) |

**Request:**

```json
{
  "signature": "3045022100..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `signature` | string | Yes | ECDSA signature over the request hash |

**200 Response:**

```json
{
  "requestId": "aabbccdd...",
  "status": "approved",
  "currentApprovals": 3,
  "requiredApprovals": 3,
  "executed": true,
  "executionResult": {
    "destroyed": true,
    "proof": { "merkleRoot": "...", "ledgerEntryHash": "..." }
  }
}
```

When `executed` is `false`, the quorum threshold has not yet been reached:

```json
{
  "requestId": "aabbccdd...",
  "status": "pending",
  "currentApprovals": 2,
  "requiredApprovals": 3,
  "executed": false
}
```

**Errors:**

- `400` — Invalid request ID format, invalid signature, or already voted
- `401` — Invalid or missing authentication
- `403` — Not a quorum member for this target
- `404` — Quorum request not found
- `410` — Quorum request expired

---

## POST /:requestId/reject

Reject a pending quorum request with an optional reason.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `requestId` | string | Quorum request ID (hex) |

**Request:**

```json
{
  "reason": "This file should be retained for legal hold"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | No | Rejection reason |

**200 Response:**

```json
{
  "requestId": "aabbccdd...",
  "status": "rejected",
  "currentApprovals": 1,
  "currentRejections": 2,
  "requiredApprovals": 3
}
```

**Errors:**

- `400` — Invalid request ID format, or already voted
- `401` — Invalid or missing authentication
- `403` — Not a quorum member for this target
- `404` — Quorum request not found
- `410` — Quorum request expired

---

# Audit (`/burnbag/audit`)

Blockchain-backed audit logging for all file operations. Every operation (upload, download, share, destroy, ACL change, etc.) is recorded as a signed, hash-chained ledger entry. The audit API supports querying, exporting, and generating compliance reports.

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | Query audit log entries |
| GET | `/export` | Yes | Export audit log (paginated) |
| POST | `/compliance-report` | Yes | Generate a compliance report |

---

## GET /

Query audit log entries with filters. Returns entries with serialized IDs and ledger hashes.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `actorId` | string | Filter by actor (user) ID (hex) |
| `targetId` | string | Filter by target (file/folder) ID (hex) |
| `operationType` | string | Filter by operation type |
| `dateFrom` | string | ISO 8601 — entries after this date |
| `dateTo` | string | ISO 8601 — entries before this date |
| `page` | number | Page number (1-based) |
| `pageSize` | number | Results per page |

All parameters are optional.

**200 Response:**

```json
[
  {
    "id": "entry-uuid",
    "actorId": "11223344...",
    "targetId": "aabbccdd...",
    "operationType": "file_download",
    "details": {
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    },
    "ledgerEntryHash": "deadbeef...",
    "timestamp": "2026-04-10T14:00:00.000Z"
  }
]
```

**Errors:**

- `401` — Invalid or missing authentication

---

## GET /export

Export audit log entries with the same filter parameters as the query endpoint. Intended for bulk export and external archival.

**Query Parameters:** Same as GET / above.

**200 Response:** Same shape as GET / above.

**Errors:**

- `401` — Invalid or missing authentication

---

## POST /compliance-report

Generate a compliance report for a date range. The report aggregates audit data into categories: access patterns, destruction events, sharing activity, and non-access proofs.

**Request:**

```json
{
  "dateFrom": "2026-01-01T00:00:00.000Z",
  "dateTo": "2026-04-01T00:00:00.000Z",
  "includeAccessPatterns": true,
  "includeDestructionEvents": true,
  "includeSharingActivity": true,
  "includeNonAccessProofs": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dateFrom` | string | Yes | ISO 8601 report start date |
| `dateTo` | string | Yes | ISO 8601 report end date |
| `includeAccessPatterns` | boolean | No | Include file access pattern analysis |
| `includeDestructionEvents` | boolean | No | Include destruction event summary |
| `includeSharingActivity` | boolean | No | Include sharing activity summary |
| `includeNonAccessProofs` | boolean | No | Include non-access proof verification summary |

**200 Response:**

```json
{
  "period": {
    "from": "2026-01-01T00:00:00.000Z",
    "to": "2026-04-01T00:00:00.000Z"
  },
  "summary": {
    "totalOperations": 1542,
    "uniqueActors": 12,
    "uniqueTargets": 87
  },
  "accessPatterns": {
    "totalAccesses": 890,
    "uniqueFiles": 45,
    "peakHour": 14,
    "topFiles": []
  },
  "destructionEvents": {
    "totalDestructions": 23,
    "scheduledDestructions": 15,
    "immediateDestructions": 8,
    "allProofsValid": true
  },
  "sharingActivity": {
    "internalShares": 67,
    "externalLinks": 12,
    "revokedLinks": 3
  },
  "nonAccessProofs": {
    "totalProofs": 200,
    "allValid": true
  }
}
```

**Errors:**

- `400` — Missing required date fields
- `401` — Invalid or missing authentication

---

# Folder Export (`/burnbag/folders`)

Export folder contents to TCBL (Turing Complete BrightChain Language) format for interoperability and archival.

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/:id/export-tcbl` | Yes | Export folder to TCBL format |

---

## POST /:id/export-tcbl

Export a folder and its contents to TCBL format. Requires `Read` permission on the folder. Supports filtering by MIME type, depth limiting, and pattern exclusion.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Folder ID (hex) |

**Request:**

```json
{
  "mimeTypeFilters": ["application/pdf", "text/plain"],
  "maxDepth": 3,
  "excludePatterns": ["*.tmp", "*.log"]
}
```

All fields are optional. Omitting all exports the entire folder tree.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mimeTypeFilters` | string[] | No | Only include files matching these MIME types |
| `maxDepth` | number | No | Maximum folder depth to traverse |
| `excludePatterns` | string[] | No | Glob patterns for files to exclude |

**200 Response:**

```json
{
  "format": "tcbl",
  "folderName": "Project Documents",
  "totalFiles": 15,
  "totalSizeBytes": 52428800,
  "data": "...",
  "skippedFiles": [
    {
      "fileId": "aabbccdd...",
      "reason": "Quorum approval required for export"
    }
  ]
}
```

**Errors:**

- `400` — Invalid folder ID format
- `401` — Invalid or missing authentication
- `403` — Insufficient permissions (requires `Read` flag)
- `404` — Folder not found
- `422` — Folder contains no exportable files

---

# Notifications (`/burnbag/notifications`)

In-app notification system for file operations, sharing events, canary alerts, quorum requests, and system messages.

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | Get queued notifications |
| POST | `/read` | Yes | Mark notifications as read |

---

## GET /

Get all queued (undelivered) notifications for the authenticated user.

**200 Response:**

```json
[
  {
    "id": "notif-uuid",
    "type": "quorum_request",
    "title": "Quorum Approval Required",
    "message": "A destruction request requires your approval",
    "targetId": "aabbccdd...",
    "targetType": "file",
    "createdAt": "2026-04-10T12:00:00.000Z",
    "read": false
  },
  {
    "id": "notif-uuid-2",
    "type": "share_received",
    "title": "File Shared With You",
    "message": "alice shared report.pdf with you",
    "targetId": "eeff0011...",
    "targetType": "file",
    "createdAt": "2026-04-10T11:00:00.000Z",
    "read": false
  }
]
```

**Errors:**

- `401` — Invalid or missing authentication

---

## POST /read

Mark one or more notifications as read (delivered).

**Request:**

```json
{
  "ids": ["notif-uuid", "notif-uuid-2"]
}
```

**204 Response:** *(empty body)*

**Errors:**

- `400` — Missing or empty `ids` array
- `401` — Invalid or missing authentication

---

# Storage Quota (`/burnbag/quota`)

Storage quota management. Quota is checked during upload initialization and enforced server-side.

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | Get current storage usage |

---

## GET /

Get the authenticated user's current storage usage, quota limit, and usage breakdown.

**200 Response:**

```json
{
  "usedBytes": 104857600,
  "quotaBytes": 10737418240,
  "breakdown": [
    {
      "category": "files",
      "usedBytes": 94371840
    },
    {
      "category": "versions",
      "usedBytes": 10485760
    }
  ]
}
```

Returns `{ "usedBytes": 0, "quotaBytes": 0, "breakdown": [] }` if no usage data exists yet.

**Errors:**

- `401` — Invalid or missing authentication

---

# Common Error Response Format

All error responses follow a consistent shape:

```json
{
  "message": "Human-readable error description",
  "error": "Error Category"
}
```

| HTTP Status | Error Category | Description |
|-------------|---------------|-------------|
| `400` | Bad Request | Validation failure, missing fields, invalid format |
| `401` | Unauthorized | Missing or invalid JWT, or invalid user ID |
| `403` | Forbidden | Insufficient permissions for the requested operation |
| `404` | Not Found | Resource does not exist |
| `409` | Conflict | Resource state conflict (e.g., already destroyed, circular move) |
| `410` | Gone | Resource has been permanently removed or expired |
| `413` | Payload Too Large | Storage quota exceeded |
| `422` | Unprocessable Entity | Request is valid but cannot be processed (e.g., no exportable files) |

---

# ID Format

All IDs in the API are hex-encoded strings representing `GuidV4Buffer` values internally. When sending IDs in requests (path parameters, query parameters, or JSON bodies), use the hex string representation.

Example: `"aabbccdd11223344556677889900aabb"` (32 hex characters = 16 bytes = UUID v4)

The server validates ID format and returns `400 Bad Request` with message `"Invalid <field> format"` for malformed IDs.

---

# Cryptographic Concepts

## Vault

Each file version is stored in an independent Vault. A Vault encapsulates:

- AES-256-GCM encrypted file blocks in the block store
- A Merkle commitment tree over the encrypted blocks
- A blockchain ledger entry recording the vault creation
- Key wrapping entries for each authorized recipient

Vaults are organized within Vault Containers, which provide top-level grouping, independent quotas, and bulk lifecycle operations (lock, destroy).

## Non-Access Proof

A cryptographic proof that the server has not accessed a file's encrypted content. Uses Bloom filter witnesses and Merkle proofs verifiable against the blockchain ledger.

## Destruction Proof

When a file is destroyed, the Vault's encryption keys are securely erased. The destruction is recorded on the blockchain ledger with a Merkle root and Bloom witness, creating an independently verifiable proof that the data can no longer be decrypted.

## Key Wrapping

Files are encrypted once with a symmetric AES-256-GCM key. That key is then wrapped (encrypted) under each authorized recipient's ECIES secp256k1 public key. Adding or revoking recipients only touches the key wrapping table, never the file blocks.
