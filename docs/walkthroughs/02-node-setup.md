---
title: "Node Setup"
parent: "Walkthroughs"
nav_order: 3
permalink: /walkthroughs/02-node-setup/
---
# Node Setup

| Field          | Value                                                        |
|----------------|--------------------------------------------------------------|
| Prerequisites  | [Quickstart](./01-quickstart) completed, Node.js 20+, Yarn |
| Estimated Time | 30 minutes                                                   |
| Difficulty     | Intermediate                                                 |

## Introduction

This guide walks you through configuring and starting a BrightChain node. You will learn the difference between the two node types — Regular Storage Nodes and BrightTrust Nodes — configure each one, understand the node lifecycle states, set up network accessibility via UPnP, and perform a graceful shutdown. By the end you will have a running node ready to participate in the BrightChain network.

## Prerequisites

- Completed the [Quickstart](./01-quickstart) guide (repository cloned, dependencies installed, tests passing)
- Node.js 20+ and Yarn installed
- Familiarity with the [Architecture Overview](./00-architecture-overview), especially the Foundation and Communication layers
- Sufficient disk space for block storage (minimum depends on block size — see Step 2)

## Steps

### Step 1: Understand the Two Node Types

BrightChain has two node types, each with a distinct role in the network.

#### Regular Storage Node

- Stores Owner-Free Filesystem (OFF) blocks
- Maintains high availability for data retrieval
- Earns credits through storage contribution
- Participates in data replication across the network

Regular Storage Nodes form the backbone of the network. Every node operator starts here.

#### BrightTrust Node

- Operates at a higher trust level than regular nodes
- Stores sensitive data (e.g., sealed identity shards)
- Participates in governance decisions and voting
- Handles identity management operations

BrightTrust Nodes require additional configuration (threshold settings) and are typically run by established, trusted operators. You can upgrade a Regular Storage Node to a BrightTrust Node later.

### Step 2: Configure and Start a Regular Storage Node

#### Choose a Block Size

BrightChain supports six standard block sizes. Pick the one that best matches your expected workload:

| Name      | Size   | Best For                                      |
|-----------|--------|-----------------------------------------------|
| `Message` | 512 B  | Small messages, configuration data, metadata   |
| `Tiny`    | 1 KB   | Small files, configuration files               |
| `Small`   | 4 KB   | Small-to-medium files, page-aligned disk I/O   |
| `Medium`  | 1 MB   | General-purpose — good default for most nodes  |
| `Large`   | 64 MB  | Large files, streaming, high throughput         |
| `Huge`    | 256 MB | Very large files, maximum throughput            |

For most operators, `Small` (4 KB) or `Medium` (1 MB) is a sensible starting point. Larger block sizes reduce per-block overhead but consume more memory per operation.

#### Allocate Storage

Decide how much disk space to dedicate to block storage. The node tracks three storage metrics:

- **totalSpace** — maximum bytes the node will use
- **usedSpace** — bytes currently occupied by stored blocks
- **reservedSpace** — bytes reserved for in-flight replication jobs

A reasonable starting allocation is 10–50 GB for a development node and 500 GB+ for a production node.

#### Create the Node Configuration

Create a configuration file (e.g., `node-config.ts`) in your project:

```typescript
import { BlockSize } from '@brightchain/brightchain-lib';

const nodeConfig = {
  // Node identity
  nodeId: undefined, // auto-generated on first start

  // Storage settings
  blockSize: BlockSize.Small,
  storage: {
    totalSpace: 10 * 1024 * 1024 * 1024, // 10 GB
    dataDirectory: './brightchain-data',
  },

  // Network settings
  httpPort: 3000,
  websocketPort: 3000,
};

export default nodeConfig;
```

#### Start the Node

Launch the API server, which acts as the node process:

```bash
npx nx serve brightchain-api
```

You should see log output confirming the node is online:

```
[BrightChain] Node starting...
[BrightChain] Block size: Small (4096 bytes)
[BrightChain] Storage directory: ./brightchain-data
[BrightChain] HTTP listening on port 3000
[BrightChain] Node state: ONLINE
```

### Step 3: Configure and Start a BrightTrust Node

A BrightTrust Node extends a Regular Storage Node with governance capabilities. Start with the regular node configuration from Step 2, then add BrightTrust-specific settings.

#### Configure the BrightTrust Threshold

The threshold determines how many BrightTrust members must agree for a governance action to pass:

```typescript
import { BlockSize } from '@brightchain/brightchain-lib';

const BrightTrustNodeConfig = {
  // Base node settings (same as Regular Storage Node)
  blockSize: BlockSize.Small,
  storage: {
    totalSpace: 50 * 1024 * 1024 * 1024, // 50 GB — BrightTrust nodes typically need more
    dataDirectory: './brightchain-BrightTrust-data',
  },
  httpPort: 3000,
  websocketPort: 3000,

  // BrightTrust-specific settings
  BrightTrust: {
    enabled: true,
    threshold: 0.67, // 67% of BrightTrust members must agree
    votingTypes: [
      'DOCUMENT_RECONSTRUCTION',
      'MEMBER_ADDITION',
      'MEMBER_REMOVAL',
    ],
  },
};

export default BrightTrustNodeConfig;
```

#### Key BrightTrust Parameters

| Parameter | Description | Typical Value |
|-----------|-------------|---------------|
| `threshold` | Fraction of members that must approve a vote | 0.51 – 0.75 |
| `votingTypes` | Governance actions this node participates in | All three types for full participation |

#### Start the BrightTrust Node

```bash
npx nx serve brightchain-api
```

The log output will include BrightTrust-specific information:

```
[BrightChain] Node state: ONLINE
[BrightChain] BrightTrust: enabled (threshold 67%)
[BrightChain] Voting types: DOCUMENT_RECONSTRUCTION, MEMBER_ADDITION, MEMBER_REMOVAL
```

### Step 4: Understand Node Lifecycle States

Every node transitions through five lifecycle states:

```
                ┌──────────────────────────────────────────┐
                │                                          │
                ▼                                          │
┌────────┐   start   ┌────────┐  schedule  ┌────────────────────────┐
│ OFFLINE │ ───────▶  │ ONLINE │ ─────────▶ │ SCHEDULED_SHUTDOWN     │
└────────┘           └────────┘            └────────────────────────┘
    ▲                    │                          │
    │                    │ emergency                │ drain complete
    │                    ▼                          ▼
    │          ┌─────────────────────┐         ┌────────┐
    │          │ EMERGENCY_SHUTDOWN  │ ──────▶  │ OFFLINE │
    │          └─────────────────────┘         └────────┘
    │                                              │
    │                                              │ permanent
    │                                              ▼
    │                                   ┌─────────────────────┐
    └───────────────────────────────────│ PERMANENTLY_OFFLINE  │
                                        └─────────────────────┘
```

| State | Description |
|-------|-------------|
| **ONLINE** | Node is fully operational — storing blocks, serving requests, participating in replication |
| **SCHEDULED_SHUTDOWN** | Node has announced a planned shutdown. The network begins replicating its blocks to other nodes before the shutdown time arrives |
| **EMERGENCY_SHUTDOWN** | Node went offline unexpectedly (crash, power loss, network failure). The network must handle data recovery; the node's reliability score is impacted |
| **OFFLINE** | Node is not running but can be restarted. Its data is intact on disk |
| **PERMANENTLY_OFFLINE** | Node has been decommissioned. The network treats all its blocks as needing full re-replication to other nodes |

#### Transitioning Between States

- **OFFLINE → ONLINE**: Start the node process (Step 2 or Step 3 above)
- **ONLINE → SCHEDULED_SHUTDOWN**: Initiate a graceful shutdown (see Step 6)
- **SCHEDULED_SHUTDOWN → OFFLINE**: Shutdown completes after block replication drains
- **ONLINE → EMERGENCY_SHUTDOWN**: Unplanned — the node crashes or loses connectivity
- **EMERGENCY_SHUTDOWN → OFFLINE**: Automatic once the node process stops
- **OFFLINE → PERMANENTLY_OFFLINE**: Operator explicitly decommissions the node

### Step 5: Configure UPnP / NAT Traversal

If your node is behind a consumer router, you need port forwarding so other nodes can reach it. BrightChain supports automatic port forwarding via UPnP and NAT-PMP.

For the full configuration reference, see [UPnP Configuration](../UPnP_Configuration).

#### Quick UPnP Setup

1. Copy the example environment file:

```bash
cp brightchain-api/src/.env.example brightchain-api/src/.env
```

1. Enable UPnP in your `.env`:

```dotenv
UPNP_ENABLED=true
UPNP_HTTP_PORT=3000
UPNP_WEBSOCKET_PORT=3000
UPNP_TTL=3600
UPNP_PROTOCOL=auto
```

1. Start (or restart) the node:

```bash
npx nx serve brightchain-api
```

On startup you will see confirmation of the port mapping:

```
[UPnP] External IP: 203.0.113.42
[UPnP] HTTP port mapping created — external 203.0.113.42:3000 → internal :3000
```

#### Key UPnP Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `UPNP_ENABLED` | `false` | Enable automatic port forwarding |
| `UPNP_HTTP_PORT` | `3000` | External port for HTTP/Express |
| `UPNP_WEBSOCKET_PORT` | `3000` | External port for WebSocket |
| `UPNP_TTL` | `3600` | Mapping lifetime in seconds |
| `UPNP_PROTOCOL` | `auto` | `upnp`, `natpmp`, or `auto` |
| `UPNP_RETRY_ATTEMPTS` | `3` | Retries on failure (1–10) |
| `UPNP_RETRY_DELAY` | `5000` | Delay between retries in ms |

If UPnP is not available on your network, the node still starts normally — you will need to configure manual port forwarding on your router. See the [UPnP Configuration guide](../UPnP_Configuration.md#manual-port-forwarding) for manual setup instructions.

### Step 6: Perform a Graceful Shutdown

A graceful shutdown ensures no data is lost by replicating the node's blocks to other nodes before going offline.

#### Initiate the Shutdown

Send a shutdown request specifying when the node should go offline:

```typescript
import { GuidV4 } from '@brightchain/brightchain-lib';

const shutdownRequest = {
  nodeId: nodeId as GuidV4,
  shutdownTime: new Date(Date.now() + 3600_000), // 1 hour from now
  expectedDuration: 86400, // seconds — expected downtime
  permanent: false,
  affectedBlocks: [], // populated automatically by the node
};
```

#### Monitor Replication Status

The node transitions to SCHEDULED_SHUTDOWN and begins replicating its blocks. Each affected block tracks its replication progress:

| Status | Meaning |
|--------|---------|
| `PENDING` | Block queued for replication |
| `IN_PROGRESS` | Block is being copied to another node |
| `COMPLETED` | Block successfully replicated — safe to shut down |

#### Verify Before Stopping

Before stopping the node process, verify that all blocks have reached `COMPLETED` status. The node will not transition to OFFLINE until replication is finished (or the shutdown deadline arrives).

```
[BrightChain] Shutdown scheduled for 2025-01-15T12:00:00Z
[BrightChain] Replicating 1,247 affected blocks...
[BrightChain] Replication progress: 1,247/1,247 COMPLETED
[BrightChain] All blocks replicated. Safe to stop.
[BrightChain] Node state: OFFLINE
```

For a permanent decommission, set `permanent: true` in the shutdown request. The node transitions to PERMANENTLY_OFFLINE and the network redistributes all its blocks.

#### Emergency Shutdown

If you must stop the node immediately (e.g., hardware failure), simply kill the process. The node enters EMERGENCY_SHUTDOWN state. The network detects the node is unreachable and begins emergency replication of its blocks. Note that this impacts the node's reliability score.

## Troubleshooting

### Port conflicts

If the node fails to start with a port-in-use error:

1. Check what is using the port: `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows)
2. Stop the conflicting process, or change `httpPort` / `UPNP_HTTP_PORT` to a different port
3. If a previous BrightChain instance left a stale UPnP mapping, remove it from your router's admin page or change the port

### Insufficient storage

If the node reports storage errors:

1. Verify available disk space: `df -h` (macOS/Linux)
2. Ensure `storage.totalSpace` in your config does not exceed available disk space
3. Consider using a smaller `blockSize` if memory is constrained
4. Clean up old data in the `dataDirectory` if the node was previously used

### Missing configuration

If the node fails to start due to missing config:

1. Ensure the `.env` file exists at `brightchain-api/src/.env` — copy from `.env.example` if needed
2. Verify all required environment variables are set (see Step 5 for UPnP variables)
3. Check that the `dataDirectory` path exists and is writable

### UPnP not working

If port mappings fail:

1. Verify UPnP is enabled on your router (check the router admin panel)
2. Try `UPNP_PROTOCOL=natpmp` for Apple AirPort or NAT-PMP routers
3. Check for double NAT (ISP modem + your router) — put the ISP modem in bridge mode
4. Increase `UPNP_RETRY_ATTEMPTS` for slow routers
5. See the full [UPnP Configuration guide](../UPnP_Configuration) for detailed troubleshooting

### Node not reachable by peers

1. Confirm the external port is open: use an online port checker or `curl` from an external machine
2. Check your OS firewall allows incoming TCP on the configured port
3. If your ISP blocks the port, try a higher port (e.g., 8080)

For more detailed troubleshooting, see the [Troubleshooting & FAQ](./06-troubleshooting-faq) guide.

## Next Steps

- [Storage Pools](./03-storage-pools) — Create and manage storage pools for data isolation.
- [BrightDB Usage](./04-brightdb-usage) — Use the MongoDB-like document database API.
- [Building a dApp](./05-building-a-dapp) — Build a full-stack decentralized application on BrightStack.
