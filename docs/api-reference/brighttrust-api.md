---
title: "BrightTrust API Reference"
parent: "API Reference"
nav_order: 16
permalink: /api-reference/brighttrust-api/
---
# BrightTrust API Reference

Base path: `/api/brightTrust`

All endpoints require session authentication (`useAuthentication: true`). The `Authorization: Bearer <token>` header must be present on every request.

BrightTrust is the cryptographic quorum system built on **Shamir's Secret Sharing** and **ECIES** (Elliptic-Curve Integrated Encryption Scheme). It is entirely separate from the burnbag approval workflow.

---

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/members` | Add a new member |
| `GET` | `/members` | List all active members |
| `DELETE` | `/members/:memberId` | Remove (deactivate) a member |
| `POST` | `/documents/seal` | Seal a document with Shamir's Secret Sharing |
| `POST` | `/documents/:documentId/unseal` | Unseal a document using member mnemonics |
| `GET` | `/documents/:documentId` | Get document metadata |
| `GET` | `/documents/:documentId/can-unlock` | Check if member set can unlock a document |
| `POST` | `/proposals` | Submit a governance proposal |
| `GET` | `/proposals/:proposalId` | Get proposal status and votes |
| `GET` | `/metrics` | Get BrightTrust operational metrics |
| `GET` | `/epochs/:number` | Get epoch details by number |
| `GET` | `/status` | Get current mode, epoch, member count |
| `GET` | `/audit/verify` | Trigger audit chain integrity verification |
| `GET` | `/aliases/:name` | Check alias availability or resolve alias |

---

## Member Management

### `POST /api/brightTrust/members`

Add a new member to the BrightTrust. Generates a new ECIES key pair and returns a mnemonic phrase the member must store to recover their private key.

**Request body**

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "role": "admin"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Display name |
| `email` | string | no | Contact email |
| `role` | string | no | Role label (stored in metadata) |

**Response `201`**

```json
{
  "message": "Member added successfully",
  "member": {
    "id": "abc123...",
    "publicKey": "04...",
    "metadata": { "name": "Alice", "email": "alice@example.com", "role": "admin" },
    "isActive": true,
    "createdAt": "2025-01-16T10:00:00Z",
    "updatedAt": "2025-01-16T10:00:00Z"
  },
  "mnemonic": "word1 word2 word3..."
}
```

> **Important:** The `mnemonic` is returned only once. The member must store it securely — it is the only way to recover the private key needed for unsealing documents.

---

### `GET /api/brightTrust/members`

List all active members. Inactive (removed) members are excluded.

**Response `200`**

```json
{
  "message": "Members retrieved successfully",
  "members": [
    {
      "id": "abc123...",
      "publicKey": "04...",
      "metadata": { "name": "Alice", "role": "admin" },
      "isActive": true,
      "createdAt": "2025-01-16T10:00:00Z",
      "updatedAt": "2025-01-16T10:00:00Z"
    }
  ]
}
```

---

### `DELETE /api/brightTrust/members/:memberId`

Deactivate a member. Their shares in existing documents are preserved, but they cannot be added to new documents.

**Path parameters**

| Parameter | Description |
|-----------|-------------|
| `memberId` | Hex-encoded member ID |

**Response `200`**

```json
{
  "message": "Member removed successfully",
  "success": true,
  "memberId": "abc123..."
}
```

**Error `404`** — member not found.

---

## Document Sealing / Unsealing

### `POST /api/brightTrust/documents/seal`

Seal a document using Shamir's Secret Sharing. The document is encrypted with a random AES key, which is split into shares and each share is ECIES-encrypted for the corresponding member.

The authenticated caller (`req.member`) is recorded as the creator.

**Request body**

```json
{
  "document": { "secret": "data", "value": 42 },
  "memberIds": ["member1...", "member2...", "member3..."],
  "sharesRequired": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document` | any | yes | Arbitrary JSON payload to seal |
| `memberIds` | string[] | yes | At least 2 member IDs (hex) |
| `sharesRequired` | number | no | Minimum shares to unseal (defaults to threshold; must be ≥ 2 and ≤ `memberIds.length`) |

**Response `201`**

```json
{
  "message": "Document sealed successfully",
  "documentId": "doc123...",
  "memberIds": ["member1...", "member2...", "member3..."],
  "sharesRequired": 2,
  "createdAt": "2025-01-16T10:00:00Z"
}
```

**Error `400`** — invalid member count or threshold.  
**Error `401`** — caller is not an authenticated member.

---

### `POST /api/brightTrust/documents/:documentId/unseal`

Unseal a document by providing mnemonic phrases for enough members to meet the share threshold. The mnemonics are used to recover private keys, which decrypt the shares and reconstruct the original document.

**Path parameters**

| Parameter | Description |
|-----------|-------------|
| `documentId` | Hex-encoded document ID |

**Request body**

```json
{
  "memberCredentials": [
    { "memberId": "member1...", "mnemonic": "word1 word2 word3..." },
    { "memberId": "member2...", "mnemonic": "word4 word5 word6..." }
  ]
}
```

**Response `200`**

```json
{
  "message": "Document unsealed successfully",
  "document": { "secret": "data", "value": 42 }
}
```

**Error `400`** — insufficient shares, mnemonic does not match member, or document not in memory.  
**Error `404`** — document not found.

---

### `GET /api/brightTrust/documents/:documentId`

Get metadata for a sealed document (members, threshold, timestamps). Does not return the encrypted content.

**Response `200`**

```json
{
  "message": "Document retrieved successfully",
  "document": {
    "id": "doc123...",
    "memberIds": ["member1...", "member2...", "member3..."],
    "sharesRequired": 2,
    "createdAt": "2025-01-16T10:00:00Z",
    "creatorId": "creator..."
  }
}
```

**Error `404`** — document not found.

---

### `GET /api/brightTrust/documents/:documentId/can-unlock`

Check whether a given set of members has enough shares to unseal a document without actually unsealing it.

**Query parameters**

| Parameter | Description |
|-----------|-------------|
| `memberIds` | Comma-separated list of member IDs (hex) |

**Example:** `GET /api/brightTrust/documents/doc123.../can-unlock?memberIds=member1,member2`

**Response `200`**

```json
{
  "message": "Can-unlock check completed",
  "canUnlock": true,
  "sharesProvided": 2,
  "sharesRequired": 2,
  "missingMembers": []
}
```

---

## Governance Proposals

### `POST /api/brightTrust/proposals`

Submit a governance proposal for BrightTrust voting (e.g. adding/removing members, changing threshold, identity disclosure).

**Request body**

```json
{
  "description": "Add new custodian Alice",
  "actionType": "ADD_MEMBER",
  "actionPayload": { "memberId": "abc123..." },
  "expiresAt": "2025-02-01T00:00:00Z",
  "attachmentCblId": "optional-cbl-id"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | yes | Human-readable description (max 4096 chars) |
| `actionType` | `ProposalActionType` | yes | One of the valid `ProposalActionType` enum values |
| `actionPayload` | object | yes | Action-specific payload |
| `expiresAt` | ISO 8601 string | yes | Proposal expiry timestamp |
| `attachmentCblId` | string | no | Optional CBL ID for supporting material |

**Response `201`**

```json
{
  "message": "Proposal submitted successfully",
  "proposal": {
    "id": "prop123...",
    "description": "Add new custodian Alice",
    "actionType": "ADD_MEMBER",
    "actionPayload": { "memberId": "abc123..." },
    "proposerMemberId": "member1...",
    "status": "pending",
    "requiredThreshold": 3,
    "expiresAt": "2025-02-01T00:00:00Z",
    "createdAt": "2025-01-16T10:00:00Z",
    "epochNumber": 1
  }
}
```

**Error `503`** — state machine not initialized.

---

### `GET /api/brightTrust/proposals/:proposalId`

Get the current status and vote tally for a proposal.

**Response `200`**

```json
{
  "message": "Proposal retrieved successfully",
  "proposal": {
    "id": "prop123...",
    "description": "Add new custodian Alice",
    "actionType": "ADD_MEMBER",
    "actionPayload": { "memberId": "abc123..." },
    "proposerMemberId": "member1...",
    "status": "pending",
    "requiredThreshold": 3,
    "expiresAt": "2025-02-01T00:00:00Z",
    "createdAt": "2025-01-16T10:00:00Z",
    "epochNumber": 1
  },
  "votes": []
}
```

> **Note:** Votes array is currently empty. Direct vote retrieval via the state machine is a known limitation pending a `getVotesForProposal` method.

**Error `404`** — proposal not found.

---

## Operational Endpoints

### `GET /api/brightTrust/metrics`

Return operational metrics from the BrightTrust state machine.

**Response `200`**

```json
{
  "message": "Metrics retrieved successfully",
  "metrics": { ... }
}
```

**Error `503`** — state machine not initialized.

---

### `GET /api/brightTrust/epochs/:number`

Get details for a specific epoch (membership snapshot, threshold, mode).

**Path parameters**

| Parameter | Description |
|-----------|-------------|
| `number` | Epoch number (positive integer) |

**Response `200`**

```json
{
  "message": "Epoch retrieved successfully",
  "epoch": {
    "epochNumber": 1,
    "memberIds": ["member1...", "member2..."],
    "threshold": 2,
    "mode": "active",
    "createdAt": "2025-01-01T00:00:00Z",
    "previousEpochNumber": null,
    "innerBrightTrustMemberIds": []
  }
}
```

**Error `404`** — epoch not found.

---

### `GET /api/brightTrust/status`

Get the current operational mode, epoch number, member count, and threshold.

**Response `200`**

```json
{
  "message": "Status retrieved successfully",
  "status": {
    "mode": "active",
    "epochNumber": 3,
    "memberCount": 5,
    "threshold": 3
  }
}
```

---

### `GET /api/brightTrust/audit/verify`

Trigger audit chain integrity verification. Returns a count of verified entries and any chain errors.

**Response `200`**

```json
{
  "message": "Audit verification completed",
  "verification": {
    "valid": true,
    "entriesVerified": 0,
    "error": null
  }
}
```

> **Note:** Full chain verification requires the audit log service to be initialized and the complete entry set to be loaded. `entriesVerified: 0` indicates the service is available but a full database scan has not been performed.

**Error `503`** — audit log service not initialized.

---

### `GET /api/brightTrust/aliases/:name`

Check alias name availability (public) or resolve an alias to a real identity (requires an approved `IDENTITY_DISCLOSURE` proposal).

**Path parameters**

| Parameter | Description |
|-----------|-------------|
| `name` | Alias name to check or resolve |

**Response `200`**

```json
{
  "message": "Alias check completed",
  "alias": {
    "aliasName": "alice",
    "available": true
  }
}
```

> **Note:** Full alias resolution to a real identity is gated behind a BrightTrust `IDENTITY_DISCLOSURE` governance proposal and vote. Availability checking is immediate.

---

## Error Responses

All error responses follow a consistent envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Validation error or insufficient shares |
| `401` | Not authenticated |
| `404` | Resource not found |
| `503` | State machine or service not initialized |

---

## Architecture Notes

- **Shamir's Secret Sharing:** Documents are encrypted with a random AES key. The key is split into `n` shares (one per member). Any `k` shares (the threshold) can reconstruct the key.
- **ECIES:** Each share is individually encrypted with the target member's ECIES public key. Only that member's private key (recoverable from their mnemonic) can decrypt their share.
- **Epochs:** Membership changes are tracked as epochs. Each epoch captures a snapshot of the member set and the current threshold.
- **Proposals:** Governance changes (member add/remove, threshold change, identity disclosure) go through a structured vote. The proposal requires at least `requiredThreshold` approvals before the action executes.
- **Mnemonics:** Private keys are never stored server-side. Each member's private key is derived from a BIP-39 mnemonic that is generated at member creation time and returned once. Loss of the mnemonic means loss of the ability to contribute shares for unsealing.
