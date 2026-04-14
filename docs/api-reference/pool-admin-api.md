---
title: "Pool Admin API"
parent: "API Reference"
nav_order: 10
---
# Pool Admin API

REST endpoints for managing node admission to the BrightChain member pool. All endpoints require admin authentication.

## Endpoints

### GET /api/admin/pool/pending-nodes

List pending join requests from nodes wanting write access to the member pool.

**Response:**
```json
{
  "message": "OK",
  "pendingNodes": [
    {
      "nodeId": "abc123",
      "publicKey": "02a1b2c3...",
      "message": "Please let me join",
      "receivedAt": "2026-04-14T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

### POST /api/admin/pool/approve-node

Approve a pending join request. Adds the node to the pool ACL, signs the update, and gossips the approval.

**Request Body:**
```json
{
  "nodeId": "abc123"
}
```

**Response (success):**
```json
{
  "message": "Node approved",
  "nodeId": "abc123",
  "aclVersion": 2
}
```

**Response (error):**
```json
{
  "message": "No pending request from node abc123"
}
```

### POST /api/admin/pool/deny-node

Deny a pending join request. Gossips the denial and removes the request from the queue.

**Request Body:**
```json
{
  "nodeId": "abc123",
  "reason": "Not trusted"
}
```

**Response:**
```json
{
  "message": "Node denied",
  "nodeId": "abc123"
}
```

## Security

- All endpoints require admin authentication (checked via `isAdmin(req)`)
- Approval produces a signed ACL update using `computeAclContentHash()` — the signature covers the full ACL content (writers, admins, scope, version, mode)
- The updated ACL is persisted to the `__pool_security__` collection and gossiped to all pool members
- Non-admin nodes receive a 403 response

## Gossip Protocol

Node admission uses three gossip announcement types:

| Type | Direction | Description |
|------|-----------|-------------|
| `pool_join_request` | New node → network | Request to join the pool |
| `pool_join_approved` | Admin → network | Approval with signed ACL update |
| `pool_join_denied` | Admin → network | Denial with optional reason |

## Related

- [Member Pool Security Architecture](../architecture/member-pool-security.md)
- [Node Operator Guide](../guides/02-node-operator-guide.md)
