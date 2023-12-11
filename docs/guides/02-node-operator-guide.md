---
title: "Node Operator Guide"
parent: "Guides"
nav_order: 2
permalink: /guides/02-node-operator-guide/
---
# Node Operator Guide

This guide covers the day-to-day operations of running a BrightChain node: setup, monitoring, storage management, pool operations, and graceful shutdown.

## Peer vs. Member: What Kind of Node Are You?

BrightChain uses a two-tier identity model. Understanding which tier you're operating at determines what your node can do:

| | Peer-Only Node | Member Node |
|---|---|---|
| Identity | `PeerRecord` (automatic on startup) | `PeerRecord` + `Member` record (explicit registration) |
| Main pool access | Yes — read and replicate raw blocks. Write access requires node admission. | Yes — same as peer, plus energy tracking |
| Gossip participation | Yes | Yes |
| Private pool access | Yes (if pool admin adds your peer ID) | Yes (if pool admin adds your member ID) |
| BrightPass / BrightMail | No | Yes |
| Energy account (Joules) | No | Yes |
| Content authorship with identity | No | Yes |
| BrightTrust eligibility | No | Yes |

Most of this guide applies equally to both tiers. Sections that are member-only are marked.

## Initial Setup

### 1. Generate Your Identity

Your node's identity is a BIP39 mnemonic that derives an ECDSA key pair (secp256k1). On first startup, a `PeerRecord` is created automatically — this is your network-layer identity. No member registration is needed to start contributing storage.

```typescript
// On first startup, the node generates its identity automatically:
// - BIP39 mnemonic → secp256k1 key pair
// - PeerRecord created in the peer registry
// - Node ID (GuidV4) assigned
// SAVE THE MNEMONIC SECURELY — it is your only recovery path
```

If you want application-layer features (BrightPass, BrightMail, energy account), you can register as a member separately:

```typescript
// Optional: register as a BrightChain member
await memberInitService.registerAsMember({
  name: 'Your Node Name',
  email: 'operator@example.com',
  memberType: MemberType.User,
});
// Your PeerRecord.isMember is now true
// A Member record exists in the BrightChain member DB
```

### 2. Configure Your Node

```typescript
const nodeConfig = {
  // Bootstrap nodes — your entry point to the network
  bootstrapNodes: [
    'https://bootstrap1.brightchain.io:3000',
    'https://bootstrap2.brightchain.io:3000',
  ],

  // Storage allocation
  storage: {
    totalSpace: 500 * 1024 * 1024 * 1024, // 500 GB
    dataDirectory: './brightchain-data',
  },

  // Network settings
  discoveryInterval: 60000,  // peer discovery every 60s
  syncInterval: 30000,       // sync with peers every 30s
  maxConnections: 50,        // max simultaneous peer connections
};
```

### 3. Start Your Node

```bash
npx nx serve brightchain-api
```

> **Production deployment?** For production nodes, consider using Docker — see the [Docker Node Setup](../guides/docker-node-setup) guide.

Your node will:
1. Contact bootstrap nodes and announce itself
2. Create a `PeerRecord` in the peer registry (automatic — no user action)
3. Receive a list of known peers
4. Begin exchanging Bloom filters for block discovery
5. Start participating in gossip (block announcements, pool announcements)
6. Join the main `BrightChain` pool automatically (read access is immediate; write access requires node admission — see [Member Pool Security](../architecture/member-pool-security))

### 4. Verify Connectivity

```typescript
const health = await node.getHealth();
console.log('Status:', health.status);       // 'online'
console.log('Peers:', health.metrics.peers);  // connected peer count
console.log('Uptime:', health.metrics.uptime);
```

If peers is 0: check bootstrap node URLs, firewall rules, and UPnP/port forwarding.

## Storage Management

### Contributing Storage

Storage contribution is automatic once your node is online. The network uses your node as a replication target for blocks that need more copies.

```typescript
const memberSettings = {
  autoReplication: true,   // accept incoming replication requests
  minRedundancy: 3,        // ensure blocks have 3+ copies across the network
  preferredRegions: [],    // no region preference
};
```

### Monitoring Your Contribution

> **Member-only**: The energy account (Joules) requires member registration. Peer-only nodes contribute storage but don't have an energy balance.

```typescript
// Requires member registration
const account = await node.getEnergyAccount();
console.log(`Balance: ${account.balance} Joules`);
console.log(`Earned: ${account.earned} Joules`);
console.log(`Spent: ${account.spent} Joules`);
```

Peer-only nodes can still monitor their storage contribution through node health metrics (block count, storage used, replication queue).

### Adjusting Storage Allocation

Increase or decrease your contribution at any time:

```typescript
// Increase storage
nodeConfig.storage.totalSpace = 1024 * 1024 * 1024 * 1024; // 1 TB

// Decrease storage — existing blocks are retained until replicated elsewhere
nodeConfig.storage.totalSpace = 100 * 1024 * 1024 * 1024; // 100 GB
```

### Stopping Storage Contribution

To stop accepting new blocks without going offline:

```typescript
memberSettings.autoReplication = false;
nodeConfig.storage.totalSpace = 0;
```

Your node remains connected and can still read/serve existing blocks, but won't accept new replication requests.

## Pool Operations

### Joining a Private Pool

Pool ACLs support both peer IDs and member IDs. You don't need to be a member to join a private pool — the pool admin just needs to add your peer ID with the `identityType: 'peer'` designation.

1. Get your node ID and public key to the pool admin
2. The admin adds you to the pool ACL (specifying `identityType: 'peer'` or `'member'`)
3. Authenticate via challenge-response:

```typescript
const challenge = await remoteNode.requestPoolChallenge('pool-name');
const signature = await localNode.sign(challenge.nonce);
const auth = await remoteNode.authenticateForPool('pool-name', localNode.nodeId, signature);
```

### Creating a Pool

```typescript
await pooledBlockStore.createPool('my-pool', {
  encryptionMode: EncryptionMode.PoolShared,
  searchableMetadataFields: ['blockSize', 'createdAt'],
});
```

You are the first admin. Add other nodes (peer-only or member):

```typescript
await pooledBlockStore.addToPoolACL('my-pool', peerNodeId, peerPublicKey, {
  permissions: ['Read', 'Write', 'Replicate'],
  identityType: 'peer', // or 'member'
});
```

### Leaving a Pool

Remove yourself from the ACL or stop connecting. Reconciliation handles block redistribution.

### Monitoring Pool Health

```typescript
const stats = await pooledBlockStore.getPoolStats('my-pool');
console.log('Block count:', stats.blockCount);
console.log('Total size:', stats.totalSize);
console.log('Replication factor:', stats.replicationFactor);
```

## Network Participation

### Gossip Protocol

Your node automatically participates in gossip:
- Receives and forwards block announcements
- Receives and forwards pool announcements
- Receives ban list updates (signed by the BrightTrust)
- Propagates peer discovery information

You don't need to configure anything — gossip participation is automatic.

### Discovery Protocol

Your node exchanges Bloom filters with peers to efficiently locate blocks without downloading them. This is how the network knows which node has which blocks.

### Reconciliation

Periodic sync with peers to fill gaps in your block store:

```typescript
// Manual reconciliation with a specific peer
await reconciliationService.reconcileWithPeer(peerId, {
  poolId: 'BrightChain',
  fullSync: false, // incremental
});
```

Reconciliation runs automatically on the configured `syncInterval`.

## Upgrading from Peer to Member

If you've been running as a peer-only node and want to unlock application-layer features, you can register as a member at any time. This is non-destructive — your peer identity, stored blocks, pool memberships, and network connections are all preserved.

```typescript
await memberInitService.registerAsMember({
  name: 'Your Organization',
  email: 'admin@example.com',
  memberType: MemberType.User,
});
```

After registration:
- Your `PeerRecord.isMember` flag becomes `true`
- A `Member` record is created in the BrightChain member DB
- You gain access to BrightPass, BrightMail, energy account, and content authorship
- You become eligible for BrightTrust membership proposals
- Your peer ID and member ID are the same — no identity change

## Graceful Shutdown

### Planned Shutdown

1. Announce your planned downtime to the network:

```typescript
const shutdownRequest = {
  nodeId: localNode.nodeId,
  shutdownTime: new Date(),
  expectedDuration: 3600000, // 1 hour in ms
  permanent: false,
};
```

2. The network begins replicating your blocks to other nodes to maintain redundancy
3. Once replication is complete, shut down safely

### Emergency Shutdown

If you need to shut down immediately, just stop the process. The network will detect your absence and replicate your blocks to maintain redundancy. Your reliability score will take a hit, but there's no penalty beyond that.

### Permanent Shutdown

If you're leaving the network permanently:

```typescript
const shutdownRequest = {
  nodeId: localNode.nodeId,
  shutdownTime: new Date(),
  permanent: true,
};
```

The network will prioritize replicating all your blocks before your node goes offline.

## Monitoring and Health

### Key Metrics to Watch

| Metric | What It Means | Action If Abnormal |
|--------|--------------|-------------------|
| Peer count | Number of connected peers | Check network/firewall if 0 |
| Uptime | How long your node has been online | Restart if crashed |
| Storage used/total | Disk utilization | Increase allocation or reduce |
| Replication queue | Blocks waiting to be replicated | Check bandwidth/connectivity |
| Gossip message rate | Network activity level | Normal variance expected |
| Energy balance | Joules earned vs spent | Positive = net contributor |

### Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| No peers | Bootstrap nodes unreachable | Check URLs, firewall, DNS |
| Slow replication | Bandwidth constrained | Check network, reduce maxConnections |
| High disk usage | Storage allocation too generous | Reduce totalSpace |
| Authentication failures | Key mismatch | Verify public key in ACL matches your node |
| Ban list sync failures | Signature verification failing | Ensure your node's clock is synchronized |

## Security Best Practices

1. Keep your mnemonic offline and secure — it's your node's master key
2. Keep your node software updated
3. Monitor your node's logs for unusual activity
4. Use UPnP or manual port forwarding — don't expose unnecessary ports
5. Run behind a firewall that allows only the configured BrightChain ports
6. If you suspect your mnemonic is compromised, generate a new identity and re-register with any pools you belong to

## Next Steps

- [How to Join BrightChain](./01-how-to-join-brightchain) — Overview of all participation levels
- [Docker Node Setup](./docker-node-setup) — Run a production node with Docker
- [BrightTrust Member/Operator Guide](./03-BrightTrust-member-guide) — If you're interested in governance
- [Storage Pools](../walkthroughs/03-storage-pools) — Deep dive into pool management
- [Building a dApp](../walkthroughs/05-building-a-dapp) — Build applications on BrightStack
