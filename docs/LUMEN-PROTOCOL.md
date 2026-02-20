# BrightChain Client Protocol — Lumen Implementation Guide

> This document tells the Lumen client team everything needed to connect to, authenticate with, and consume the BrightChain node API. It is the contract between the two sides being developed in parallel.

---

## What Lumen Should Build Right Now

Lumen needs to implement these layers, roughly in this order:

1. **Auth layer** — login/register, store JWT, attach to all requests, handle refresh
2. **REST client** — typed service that calls each `/api/introspection/*` endpoint
3. **WebSocket client** — connect to `/ws/client`, manage subscriptions, handle events
4. **Shared types** — import `@brightchain/brightchain-lib` interfaces (already published)

All shared TypeScript types are in `@brightchain/brightchain-lib`. Lumen uses `TID = string` everywhere (UUIDs as plain strings). The backend uses `TID = GuidV4Buffer` internally but serializes to strings over the wire.

---

## 1. Connecting to the Node

**Default development URL:** `http://localhost:3000`

| Protocol | URL | Purpose |
|----------|-----|---------|
| HTTP | `http://{host}:{port}/api/*` | REST endpoints |
| WebSocket | `ws://{host}:{port}/ws/client?token={jwt}` | Real-time event stream |

In production with TLS enabled, use `https://` and `wss://` respectively.

The port defaults to `3000`. The host and port are configured server-side via environment variables.

---

## 2. Authentication

### 2.1 Register a New Account

```
POST /api/user/register
Content-Type: application/json
```

**Request body** (`IRegistrationRequest` from `@brightchain/brightchain-lib`):
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "securepassword123"
}
```

**Success response** (200 OK) — `IAuthResponse<string>`:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "memberId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "energyBalance": 1000
}
```

**Error responses:**
- `400` — validation error (missing fields, invalid email format)
- `409` — email already registered

### 2.2 Log In

```
POST /api/user/login
Content-Type: application/json
```

**Request body** (`ILoginRequest` from `@brightchain/brightchain-lib`):
```json
{
  "username": "alice",
  "password": "securepassword123"
}
```

**Success response** (200 OK) — `IAuthResponse<string>`:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "memberId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "energyBalance": 750
}
```

**Error responses:**
- `401` — invalid credentials (wrong username or password)

### 2.3 JWT Token Details

| Field | Value |
|-------|-------|
| Algorithm | HS256 |
| Expiry | 7 days from issue |
| Issuer | BrightChain node |

**Token payload** (`ITokenPayload`):
```json
{
  "memberId": "a1b2c3d4-...",
  "username": "alice",
  "type": "User",
  "iat": 1739750400,
  "exp": 1740355200
}
```

`type` is one of: `"User"`, `"Admin"`, `"System"`.

### 2.4 Attaching the Token

**For REST requests** — send as a Bearer token:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**For WebSocket** — pass as a query parameter on the upgrade URL:
```
ws://localhost:3000/ws/client?token=eyJhbGciOiJIUzI1NiIs...
```

### 2.5 Token Lifecycle

- Store the token in memory (or secure storage on mobile via Capacitor)
- Attach it to every REST request and WebSocket connection
- When the WebSocket sends an `auth:token_expiring` event, call `/api/user/login` again to get a fresh token, then reconnect the WebSocket
- If any REST call returns `401`, the token has expired — re-login and retry

### 2.6 Member Types and Access Tiers

| MemberType | Value in JWT `type` | What They Can Access |
|------------|--------------------|-----------------------|
| User | `"User"` | Public endpoints, own energy account, pools they have Read ACL on |
| Admin | `"Admin"` | Everything — all endpoints, all pools, all members' data |
| System | `"System"` | Same as Admin (service accounts) |

---

## 3. REST API — Introspection Endpoints

All endpoints below are under `/api/introspection`. All require a valid JWT in the `Authorization` header.

Every successful response wraps data in a standard envelope:
```json
{
  "success": true,
  "message": "OK",
  "data": { ... }
}
```

Every error response uses the same envelope:
```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

### 3.1 GET /api/introspection/status

**Access:** Any authenticated member

Returns the node's health, uptime, and capabilities.

**Response `data`** — `INodeStatus<string>`:
```json
{
  "nodeId": "a1b2c3d4-...",
  "healthy": true,
  "uptime": 86400,
  "version": "1.0.0",
  "capabilities": ["gossip", "replication", "encryption"],
  "partitionMode": false
}
```

When `partitionMode` is `true`:
- **Admin/System** members also get `"disconnectedPeers": ["peer-uuid-1", "peer-uuid-2"]`
- **User** members see `partitionMode: true` but `disconnectedPeers` is omitted

### 3.2 GET /api/introspection/peers

**Access:** Admin/System only (User gets 403)

Returns the network topology visible from this node.

**Response `data`** — `INetworkTopology<string>`:
```json
{
  "localNodeId": "a1b2c3d4-...",
  "peers": [
    {
      "nodeId": "peer-uuid-1",
      "connected": true,
      "lastSeen": "2026-02-16T12:00:00.000Z",
      "latencyMs": 42
    }
  ],
  "totalConnected": 1
}
```

Returns `200` with empty `peers: []` and `totalConnected: 0` if no peers are connected.

### 3.3 GET /api/introspection/pools

**Access:** Any authenticated member (results filtered by Pool ACL)

Returns pools active on the local node.

**Response `data`** — `IPoolInfo<string>[]`:
```json
[
  {
    "poolId": "pool-abc",
    "blockCount": 1500,
    "totalSize": 15728640,
    "memberCount": 3,
    "encrypted": true,
    "publicRead": false,
    "publicWrite": false,
    "hostingNodes": ["node-uuid-1"]
  }
]
```

- **User** members see only pools where they have Read permission via Pool ACL
- **Admin/System** members see all pools regardless of ACL

### 3.4 GET /api/introspection/pools/:poolId

**Access:** Any authenticated member (ACL-checked per pool)

Returns full details for a specific pool.

**Response `data`** — `IPoolDetail<string>`:
```json
{
  "poolId": "pool-abc",
  "blockCount": 1500,
  "totalSize": 15728640,
  "memberCount": 3,
  "encrypted": true,
  "publicRead": false,
  "publicWrite": false,
  "hostingNodes": ["node-uuid-1"],
  "owner": "owner-uuid",
  "aclSummary": {
    "memberCount": 3,
    "adminCount": 1,
    "publicRead": false,
    "publicWrite": false,
    "currentUserPermissions": ["Read", "Write"]
  }
}
```

**Error responses:**
- `403` — member lacks Read permission and is not Admin/System
- `404` — pool does not exist

### 3.5 GET /api/introspection/stats

**Access:** Admin/System only (User gets 403)

Returns block store capacity and usage metrics.

**Response `data`** — `IBlockStoreStats`:
```json
{
  "totalCapacity": 1073741824,
  "currentUsage": 536870912,
  "availableSpace": 536870912,
  "blockCounts": {
    "DataBlock": 500,
    "RandomBlock": 200,
    "EncryptedBlock": 300
  },
  "totalBlocks": 1000
}
```

### 3.6 GET /api/introspection/energy

**Access:** Any authenticated member (returns own account only)

Returns the requesting member's energy account.

**Response `data`** — `IEnergyAccountStatus<string>`:
```json
{
  "memberId": "own-uuid",
  "balance": 750,
  "availableBalance": 700,
  "earned": 1000,
  "spent": 250,
  "reserved": 50
}
```

### 3.7 GET /api/introspection/energy/:memberId

**Access:** Admin/System only (User gets 403)

Same response shape as 3.6 but for the specified member.

### 3.8 POST /api/introspection/discover-pools

**Access:** Admin/System only (User gets 403)

Triggers a network-wide pool discovery across all connected peers.

**Request body:** None (empty POST)

**Response `data`** — `IPoolDiscoveryResult<string>`:
```json
{
  "pools": [
    {
      "poolId": "pool-xyz",
      "blockCount": 800,
      "totalSize": 8388608,
      "memberCount": 5,
      "encrypted": false,
      "publicRead": true,
      "publicWrite": false,
      "hostingNodes": ["node-1", "node-2"]
    }
  ],
  "queriedPeers": ["peer-1", "peer-2", "peer-3"],
  "unreachablePeers": ["peer-3"],
  "timestamp": "2026-02-16T12:00:00.000Z"
}
```

- Pools are deduplicated across peers; `hostingNodes` lists every node hosting each pool
- Pools the requester can't access (no ACL Read, or encrypted without keys) are excluded
- Unreachable peers are listed separately; you still get partial results from reachable peers

---

## 4. WebSocket — Real-Time Event Channel

### 4.1 Connecting

```
ws://localhost:3000/ws/client?token=eyJhbGciOiJIUzI1NiIs...
```

- Path: `/ws/client` (this is separate from the node-to-node gossip socket at `/ws/node/:nodeId`)
- Auth: JWT in the `token` query parameter
- On success: connection established, no initial server message
- On failure: connection rejected immediately

**Rejection close codes:**
| Code | Reason |
|------|--------|
| `4001` | `"Authentication failed"` — invalid or malformed JWT |
| `4001` | `"Token expired"` — JWT has expired |

### 4.2 Subscribing to Events

Once connected, send a JSON message to subscribe:

```json
{
  "action": "subscribe",
  "eventTypes": [
    "peer:connected",
    "peer:disconnected",
    "pool:changed",
    "pool:created",
    "pool:deleted",
    "energy:updated",
    "storage:alert",
    "auth:token_expiring"
  ]
}
```

To unsubscribe from specific events:
```json
{
  "action": "unsubscribe",
  "eventTypes": ["storage:alert"]
}
```

You only receive events you've subscribed to AND that your access tier permits.

### 4.3 Event Envelope Format

All events arrive as `IClientEvent<string>`:

```json
{
  "eventType": "pool:changed",
  "accessTier": "pool-scoped",
  "payload": { "poolId": "pool-abc", "blockCount": 1501 },
  "timestamp": "2026-02-16T12:05:00.000Z",
  "correlationId": "evt-abc-123",
  "targetPoolId": "pool-abc"
}
```

| Field | Type | Always Present | Description |
|-------|------|----------------|-------------|
| `eventType` | `ClientEventType` (string enum) | Yes | Which event occurred |
| `accessTier` | `ClientEventAccessTier` (string enum) | Yes | Who can see this event |
| `payload` | `unknown` (JSON object) | Yes | Event-specific data |
| `timestamp` | `string` (ISO 8601) | Yes | When the event occurred |
| `correlationId` | `string` | Yes | Unique event ID for deduplication/tracing |
| `targetPoolId` | `string` | Only for pool-scoped events | Which pool this event relates to |
| `targetMemberId` | `string` | Only for member-scoped events | Which member this event is for |

### 4.4 Event Types Reference

| `eventType` value | `accessTier` | When it fires | Payload shape |
|-------------------|-------------|---------------|---------------|
| `peer:connected` | `admin` | A peer node connects | `{ nodeId: string }` |
| `peer:disconnected` | `admin` | A peer node disconnects | `{ nodeId: string }` |
| `pool:changed` | `pool-scoped` | Pool metadata updated | `{ poolId: string, blockCount: number, totalSize: number }` |
| `pool:created` | `pool-scoped` | New pool created | `{ poolId: string }` |
| `pool:deleted` | `pool-scoped` | Pool deleted | `{ poolId: string }` |
| `energy:updated` | `member-scoped` | Energy balance changed | `{ memberId: string, balance: number, availableBalance: number }` |
| `storage:alert` | `admin` | Storage threshold crossed | `{ currentUsage: number, totalCapacity: number, thresholdPercent: number }` |
| `auth:token_expiring` | `member-scoped` | JWT about to expire | `{ expiresAt: string }` |

### 4.5 Access Tier Filtering

The server only delivers events that match your member type and permissions:

| Access Tier | Who Receives It |
|-------------|----------------|
| `public` | All authenticated subscribers |
| `admin` | Only Admin or System members |
| `pool-scoped` | Only members with Read permission on `targetPoolId` |
| `member-scoped` | Only the specific member identified by `targetMemberId` |

If you're a `User` and subscribe to `peer:connected` (which is `admin` tier), you simply won't receive those events. No error — they're silently filtered.

### 4.6 Token Expiration Handling

When your JWT is about to expire, the server sends:
```json
{
  "eventType": "auth:token_expiring",
  "accessTier": "member-scoped",
  "payload": { "expiresAt": "2026-02-23T12:00:00.000Z" },
  "timestamp": "2026-02-16T11:55:00.000Z",
  "correlationId": "evt-token-exp-456",
  "targetMemberId": "your-member-uuid"
}
```

After a grace period, the server closes the connection with code `4002`.

**What Lumen should do:**
1. Listen for `auth:token_expiring`
2. Call `POST /api/user/login` to get a fresh token
3. Open a new WebSocket connection with the new token
4. Re-send subscription messages
5. Close the old connection (or let the server close it)

### 4.7 Keepalive

The server sends WebSocket ping frames periodically. The browser's WebSocket API handles pong automatically. If the server doesn't receive a pong within its timeout, it closes the connection.

If Lumen detects the connection dropped, reconnect with the current token (or re-login if expired).

### 4.8 Close Codes Summary

| Code | Meaning | Lumen Action |
|------|---------|-------------|
| `1000` | Normal closure | No action needed |
| `1001` | Server shutting down | Retry connection after delay |
| `4001` | Auth failed on connect | Re-login, then reconnect |
| `4002` | Token expired during session | Re-login, then reconnect |

---

## 5. HTTP Error Codes Reference

| Status | Meaning | When |
|--------|---------|------|
| `200` | Success | Request processed normally |
| `400` | Bad Request | Malformed request body, validation failure |
| `401` | Unauthorized | Missing, malformed, or expired JWT |
| `403` | Forbidden | Valid JWT but wrong MemberType or missing Pool ACL permission |
| `404` | Not Found | Pool or member does not exist |
| `500` | Internal Server Error | Unexpected server failure |

---

## 6. Shared Types — What to Import

All types come from `@brightchain/brightchain-lib`. Lumen should use `TID = string` (the default).

```typescript
// Auth types
import type {
  ILoginRequest,
  IRegistrationRequest,
  IAuthResponse,
} from '@brightchain/brightchain-lib';

// Introspection data types
import type {
  INodeStatus,
  IPeerInfo,
  INetworkTopology,
  IPoolInfo,
  IPoolDetail,
  IPoolAclSummary,
  IPoolDiscoveryResult,
  IBlockStoreStats,
  IEnergyAccountStatus,
} from '@brightchain/brightchain-lib';

// WebSocket event types
import {
  ClientEventType,       // enum — runtime value
  ClientEventAccessTier, // enum — runtime value
} from '@brightchain/brightchain-lib';
import type {
  IClientEvent,
  ISubscriptionMessage,
} from '@brightchain/brightchain-lib';
```

All interfaces use `<TID = string>` by default, so Lumen doesn't need to pass the generic explicitly.

---

## 7. Recommended Lumen Implementation Order

1. **Auth service** — `login()`, `register()`, token storage, auto-refresh
2. **HTTP client wrapper** — attaches Bearer token, handles 401 → re-login
3. **Introspection service** — typed methods for each endpoint:
   - `getStatus(): Promise<INodeStatus>`
   - `getPeers(): Promise<INetworkTopology>`
   - `getPools(): Promise<IPoolInfo[]>`
   - `getPoolDetails(poolId: string): Promise<IPoolDetail>`
   - `getStats(): Promise<IBlockStoreStats>`
   - `getEnergy(): Promise<IEnergyAccountStatus>`
   - `getMemberEnergy(memberId: string): Promise<IEnergyAccountStatus>`
   - `discoverPools(): Promise<IPoolDiscoveryResult>`
4. **WebSocket manager** — connect, subscribe, event dispatch, reconnect logic
5. **UI integration** — wire services into React components/stores

### Minimal Smoke Test

Once the BrightChain server is running (`npx nx serve brightchain-api`):

```typescript
// 1. Register or login
const res = await fetch('http://localhost:3000/api/user/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'alice', password: 'password123' }),
});
const { token } = await res.json();

// 2. Check node status
const status = await fetch('http://localhost:3000/api/introspection/status', {
  headers: { Authorization: `Bearer ${token}` },
});
console.log(await status.json());

// 3. Open WebSocket
const ws = new WebSocket(`ws://localhost:3000/ws/client?token=${token}`);
ws.onopen = () => {
  ws.send(JSON.stringify({
    action: 'subscribe',
    eventTypes: ['pool:changed', 'energy:updated'],
  }));
};
ws.onmessage = (evt) => console.log('Event:', JSON.parse(evt.data));
```
