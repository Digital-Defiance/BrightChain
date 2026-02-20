# Lumen–BrightChain Client Protocol

## Overview

The Lumen–BrightChain Client Protocol is the communication layer between the Lumen GUI client (`@brightchain/lumen-gui`) and a BrightChain node (`brightchain-api`). It provides:

- REST endpoints for node introspection (health, peers, pools, storage, energy)
- A JWT-authenticated WebSocket channel for real-time event subscriptions
- Pool discovery across connected peer nodes
- Role-based access control tiered by `MemberType` (User, Admin, System)

This protocol is purpose-built for BrightChain's semantics. It does not emulate MongoDB's wire protocol.

## Prerequisites

### What Needs to Be Running

For a Lumen client to connect to a BrightChain node, the following must be operational:

1. **BrightChain API Server** (`brightchain-api`)
   - Start via `npx nx serve brightchain-api` (development) or run the built binary
   - Listens on the port configured in `.env` (default: 3000)
   - Serves both REST endpoints and WebSocket connections

2. **Environment Configuration** (`brightchain-api/src/.env`)
   - `JWT_SECRET` — shared secret for signing/verifying JWT tokens (required)
   - `SERVER_URL` — the public URL of the node
   - See `brightchain-api/src/.env.example` for all options

3. **Services Wired at Startup** (handled automatically by the `App` class):
   - `WebSocketMessageServer` — node-to-node gossip on `/ws/node/:nodeId`
   - `ClientWebSocketServer` — client events on `/ws/client`
   - `GossipService` — pool announcements between peers
   - `AvailabilityService` — node health, statistics, partition detection
   - `PoolACLStore` — authorization checks for pool access
   - `PoolEncryptionService` — encrypted pool metadata handling
   - `PoolDiscoveryService` — cross-node pool discovery
   - `EventNotificationSystem` — bridges internal events to WebSocket broadcasts
   - `IntrospectionController` — REST endpoint handlers

No additional database or external service setup is required beyond what the BrightChain node already needs.

## Authentication

### User Registration and Login

Lumen authenticates against the existing user API:

```
POST /api/user/register
Body: { "username": "...", "email": "...", "password": "..." }
Response: { "token": "<jwt>", "memberId": "<guid>", "energyBalance": <number> }

POST /api/user/login
Body: { "username": "...", "password": "..." }
Response: { "token": "<jwt>", "memberId": "<guid>", "energyBalance": <number> }
```

The returned JWT contains the member's `MemberType` (User, Admin, or System) in its payload, which determines access to protocol endpoints.

### JWT Usage

All introspection endpoints require a valid JWT bearer token:

```
Authorization: Bearer <jwt-token>
```

The server uses the existing `requireAuth` middleware to validate tokens. Admin endpoints additionally use `requireMemberTypes(MemberType.Admin, MemberType.System)`.

### Token Lifecycle

- Tokens have an expiration time set by the server
- When a token nears expiration during an active WebSocket session, the server sends a `TokenExpiring` event
- The client should re-authenticate (login again) to obtain a fresh token
- Expired tokens on REST requests return `401 Unauthorized`
- Expired tokens on WebSocket connections trigger close code `4002`

## REST API — Node Introspection

All endpoints are mounted at `/api/introspection`.

### Public Endpoints

Accessible to any authenticated member (User, Admin, or System).

#### GET /api/introspection/status

Returns node health, uptime, software version, and capabilities.

```json
{
  "message": "...",
  "data": {
    "nodeId": "<guid>",
    "healthy": true,
    "uptime": 86400,
    "version": "0.16.0",
    "capabilities": ["blocks", "pools", "gossip"],
    "partitionMode": false,
    "disconnectedPeers": ["<guid>", "..."]
  }
}
```

- `disconnectedPeers` is only populated for Admin/System members when `partitionMode` is `true`
- User members see `partitionMode` but `disconnectedPeers` is omitted

#### GET /api/introspection/pools

Returns pools on the local node that the requesting member has Read permission on.

```json
{
  "message": "...",
  "data": [
    {
      "poolId": "<id>",
      "blockCount": 1024,
      "totalSize": 1073741824,
      "memberCount": 5,
      "encrypted": true,
      "publicRead": false,
      "publicWrite": false,
      "hostingNodes": ["<guid>"]
    }
  ]
}
```

- Admin/System members see all pools regardless of ACL membership

#### GET /api/introspection/pools/:poolId

Returns detailed metadata for a specific pool including ACL summary.

```json
{
  "message": "...",
  "data": {
    "poolId": "<id>",
    "blockCount": 1024,
    "totalSize": 1073741824,
    "memberCount": 5,
    "encrypted": true,
    "publicRead": false,
    "publicWrite": false,
    "hostingNodes": ["<guid>"],
    "owner": "<guid>",
    "aclSummary": {
      "memberCount": 5,
      "adminCount": 2,
      "publicRead": false,
      "publicWrite": false,
      "currentUserPermissions": ["Read", "Write"]
    }
  }
}
```

- Returns `403 Forbidden` if the member lacks Read permission and is not Admin/System

#### GET /api/introspection/energy

Returns the requesting member's energy account.

```json
{
  "message": "...",
  "data": {
    "memberId": "<guid>",
    "balance": 1000,
    "availableBalance": 800,
    "earned": 1500,
    "spent": 500,
    "reserved": 200
  }
}
```

### Admin Endpoints

Restricted to members with `MemberType` Admin or System. User members receive `403 Forbidden`.

#### GET /api/introspection/peers

Returns connected peer nodes with connection status and latency.

```json
{
  "message": "...",
  "data": {
    "localNodeId": "<guid>",
    "peers": [
      {
        "nodeId": "<guid>",
        "connected": true,
        "lastSeen": "2026-02-17T10:00:00.000Z",
        "latencyMs": 42
      }
    ],
    "totalConnected": 3
  }
}
```

- Returns an empty peers array with `200 OK` if no peers are connected

#### GET /api/introspection/stats

Returns block store statistics.

```json
{
  "message": "...",
  "data": {
    "totalCapacity": 107374182400,
    "currentUsage": 53687091200,
    "availableSpace": 53687091200,
    "blockCounts": {
      "InMemory": 100,
      "RawData": 500,
      "Encrypted": 200
    },
    "totalBlocks": 800
  }
}
```

#### GET /api/introspection/energy/:memberId

Returns any member's energy account (admin override).

- Same response shape as `GET /energy`
- User members requesting another member's account receive `403 Forbidden`

#### POST /api/introspection/discover-pools

Queries connected peers for their pool lists and aggregates results.

```json
{
  "message": "...",
  "data": {
    "pools": [
      {
        "poolId": "<id>",
        "blockCount": 512,
        "totalSize": 536870912,
        "memberCount": 3,
        "encrypted": false,
        "publicRead": true,
        "publicWrite": false,
        "hostingNodes": ["<guid-a>", "<guid-b>"]
      }
    ],
    "queriedPeers": ["<guid-a>", "<guid-b>", "<guid-c>"],
    "unreachablePeers": ["<guid-c>"],
    "timestamp": "2026-02-17T10:00:00.000Z"
  }
}
```

- Pools are deduplicated across peers; `hostingNodes` lists all nodes hosting each pool
- Only pools the requesting member is authorized to see are included
- Encrypted pools the member cannot decrypt are excluded
- Unreachable peers are reported but do not cause an error (partial results returned)

## Error Responses

All errors follow the `IApiMessageResponse` envelope:

| Status | Meaning | When |
|--------|---------|------|
| 401 | Unauthorized | Missing, malformed, or expired JWT |
| 403 | Forbidden | User accessing Admin endpoint, or unauthorized pool access |
| 404 | Not Found | Pool ID does not exist |
| 500 | Internal Error | Unexpected server failure |

## WebSocket Channel — Real-Time Events

### Connection

Connect to `ws://<host>:<port>/ws/client?token=<jwt>`.

This is a separate path from the node-to-node gossip WebSocket (`/ws/node/:nodeId`), which uses ECIES authentication. The client channel uses JWT authentication.

If the token is invalid or expired, the connection is rejected with close code `4001`.

### Subscription

After connecting, subscribe to event types by sending a JSON message:

```json
{
  "action": "subscribe",
  "eventTypes": [
    "pool:changed",
    "pool:created",
    "pool:deleted",
    "energy:updated",
    "storage:alert",
    "peer:connected",
    "peer:disconnected"
  ]
}
```

Unsubscribe with:

```json
{
  "action": "unsubscribe",
  "eventTypes": ["storage:alert"]
}
```

### Event Types

| Event Type | Access Tier | Description |
|------------|-------------|-------------|
| `peer:connected` | Admin | A peer node connected |
| `peer:disconnected` | Admin | A peer node disconnected |
| `pool:changed` | Pool-Scoped | Pool metadata or membership changed |
| `pool:created` | Pool-Scoped | A new pool was created |
| `pool:deleted` | Pool-Scoped | A pool was deleted |
| `energy:updated` | Member-Scoped | The member's energy balance changed |
| `storage:alert` | Admin | Block store usage crossed a threshold |
| `auth:token_expiring` | Member-Scoped | JWT token is about to expire |

### Access Tier Filtering

Events are only delivered to sessions authorized to receive them:

- **Public** — delivered to all subscribers
- **Admin** — delivered only to Admin/System members
- **Pool-Scoped** — delivered only to members with Read permission on the target pool
- **Member-Scoped** — delivered only to the specific target member

### Event Envelope

Every event delivered over the WebSocket has this shape:

```json
{
  "eventType": "pool:changed",
  "accessTier": "pool-scoped",
  "payload": { ... },
  "timestamp": "2026-02-17T10:00:00.000Z",
  "correlationId": "abc-123",
  "targetPoolId": "<pool-id>",
  "targetMemberId": "<member-id>"
}
```

- `targetPoolId` is present for pool-scoped events
- `targetMemberId` is present for member-scoped events
- `correlationId` is always a non-empty string

### Connection Lifecycle

- **Ping/Pong**: The server sends periodic ping frames. If no pong is received within the timeout, the connection is closed.
- **Token Expiration**: When the JWT expires, the server sends an `auth:token_expiring` event, then closes the connection with code `4002` after a grace period.
- **Reconnection**: The client should implement exponential backoff reconnection. On auth-related closes (4001, 4002), re-authenticate before reconnecting.

### WebSocket Close Codes

| Code | Meaning |
|------|---------|
| 1000 | Normal close |
| 1001 | Server shutting down |
| 4001 | Authentication failed (invalid/expired token on connect) |
| 4002 | Token expired during session |

## Shared Type Interfaces

All protocol data structures are defined as generic `<TID>` interfaces in `@brightchain/brightchain-lib` under `interfaces/clientProtocol/`. The frontend uses `TID = string`, the backend uses `TID = GuidV4Buffer`.

| Interface | Package | Purpose |
|-----------|---------|---------|
| `INodeStatus<TID>` | brightchain-lib | Node health response |
| `IPeerInfo<TID>` | brightchain-lib | Single peer entry |
| `INetworkTopology<TID>` | brightchain-lib | Peers list response |
| `IPoolInfo<TID>` | brightchain-lib | Pool summary |
| `IPoolDetail<TID>` | brightchain-lib | Pool with ACL summary |
| `IPoolAclSummary<TID>` | brightchain-lib | ACL metadata |
| `IPoolDiscoveryResult<TID>` | brightchain-lib | Discovery response |
| `IBlockStoreStats` | brightchain-lib | Storage metrics |
| `IEnergyAccountStatus<TID>` | brightchain-lib | Energy account |
| `IClientEvent<TID>` | brightchain-lib | WebSocket event envelope |
| `ClientEventType` | brightchain-lib | Event type enum |
| `ClientEventAccessTier` | brightchain-lib | Access tier enum |
| `ISubscriptionMessage` | brightchain-lib | Subscribe/unsubscribe message |

API response wrappers (extending `IApiMessageResponse`) are in `@brightchain/brightchain-api-lib` under `interfaces/introspectionApiResponses.ts`.

## Pool Discovery via Gossip

Nodes announce their pools to connected peers using the gossip protocol:

- `POOL_ANNOUNCEMENT` — broadcast when a pool is created or updated
- `POOL_REMOVAL` — broadcast when a pool is deleted

The `PoolDiscoveryService` maintains a cache of remote pool metadata received via gossip. When a Lumen client triggers pool discovery (`POST /discover-pools`), the service queries connected peers, filters results by ACL and encryption, deduplicates across nodes, and returns the aggregated result.

Encrypted pool announcements use `PoolEncryptionService` so that only members with valid pool keys can read the metadata.

## Quick Start — Connecting Lumen to a Node

1. Start the BrightChain API server:
   ```bash
   npx nx serve brightchain-api
   ```

2. Register or log in via the Lumen UI (or directly):
   ```bash
   curl -X POST http://localhost:3000/api/user/login \
     -H "Content-Type: application/json" \
     -d '{"username": "alice", "password": "secret"}'
   ```

3. Use the returned JWT for REST calls:
   ```bash
   curl http://localhost:3000/api/introspection/status \
     -H "Authorization: Bearer <token>"
   ```

4. Open a WebSocket for real-time events:
   ```
   ws://localhost:3000/ws/client?token=<token>
   ```

5. Subscribe to events:
   ```json
   {"action": "subscribe", "eventTypes": ["pool:changed", "energy:updated"]}
   ```

## Architecture Summary

```
Lumen Client (React/MUI/Capacitor)
  │
  ├── REST + JWT ──► /api/introspection/* ──► IntrospectionController
  │                                              ├── AvailabilityService
  │                                              ├── PoolACLStore
  │                                              ├── PoolDiscoveryService
  │                                              └── HeartbeatMonitor
  │
  └── WebSocket + JWT ──► /ws/client ──► ClientWebSocketServer
                                            ├── EventNotificationSystem
                                            └── Access tier filtering

Peer Nodes
  │
  └── WebSocket + ECIES ──► /ws/node/:nodeId ──► WebSocketMessageServer
                                                    └── GossipService
                                                         └── PoolDiscoveryService (cache)
```
