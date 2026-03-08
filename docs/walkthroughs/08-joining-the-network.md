---
title: "Joining the BrightChain Network"
parent: "Walkthroughs"
nav_order: 9
permalink: /walkthroughs/08-joining-the-network/
---
# Joining the BrightChain Network

| Field          | Value                                                                          |
|----------------|--------------------------------------------------------------------------------|
| Prerequisites  | [Quickstart](./01-quickstart) completed, [Node Setup](./02-node-setup) read   |
| Estimated Time | 45 minutes                                                                     |
| Difficulty     | Intermediate                                                                   |

## Introduction

This guide is for prospective node operators who want to run a BrightChain node and participate in the network. It covers what you need before you start, how to spin up a node and connect to existing peers, what happens once you're connected, how to optionally register as a full member, and — if you're interested — how Quorum membership works and why it's a separate, invitation-based process.

BrightChain uses a two-tier identity model:
- **Peer identity** (network layer): Automatic on startup. Store and serve blocks, participate in gossip, join pools.
- **Member identity** (application layer): Optional, explicit registration. BrightPass, BrightMail, energy account, content authorship, quorum eligibility.

By the end you'll have a running node that is discoverable by other peers, contributing storage to the network, and ready to join storage pools — all without needing to register as a member.

## Prerequisites

- Completed the [Quickstart](./01-quickstart) guide (repository cloned, dependencies installed, tests passing)
- Read the [Architecture Overview](./00-architecture-overview) to understand the layered design, TUPLE storage model, and node roles
- Read the [Node Setup](./02-node-setup) guide to understand the two node types (Regular Storage Node vs. Quorum Node), configuration options, and lifecycle states
- A machine with:
  - Node.js 20+
  - Yarn
  - Sufficient disk space (10 GB minimum for development, 500 GB+ recommended for production)
  - A network connection reachable by other nodes (or UPnP-capable router)

## Steps

### Step 1: Understand What Joining Means

BrightChain is an open-participation network at the storage layer. Any operator can spin up a node and begin contributing to the network using only a peer identity — no member registration required. There is no central authority that approves or denies your node's connection.

That said, "joining" involves several distinct layers of participation, each with different identity and access requirements:

| Layer | Identity Required | Open to anyone? | How you get access |
|-------|-------------------|------------------|--------------------|
| Network connectivity | Peer | Yes | Configure bootstrap nodes, start your node |
| Peer discovery and gossip | Peer | Yes | Automatic once connected |
| Main pool (`BrightChain`) | Peer | Yes | Automatic — any active, non-banned peer has implicit access |
| BrightPass / BrightMail / Energy | Member | Yes (self-register) | Explicit member registration |
| Private storage pools | Peer or Member | No — per-pool ACL | An existing pool admin adds your peer or member ID |
| Quorum membership | Member | No — by invitation | Existing quorum members vote to admit you |
| Network enforcement (bans) | N/A | N/A — quorum-governed | 75% supermajority vote with cooling period (see Step 10) |

You can be a fully productive network participant — storing blocks, joining pools, building dApps — without ever registering as a member or joining a Quorum. Most node operators are peer-only nodes that store and replicate blocks in the main pool.

### Step 2: Generate Your Node Identity

Every BrightChain node has a cryptographic identity derived from a BIP39 mnemonic and BIP32 key derivation path. This identity is how other nodes recognize and authenticate you.

On first startup, the system automatically generates:

- A unique node ID (GuidV4)
- An ECDSA key pair (secp256k1) — your public key is your network identity
- A BIP39 mnemonic phrase for recovery
- A `PeerRecord` in the peer registry — your network-layer identity

No `Member` record is created at this point. You are a peer-only node. This is all you need to start contributing storage.

```typescript
// On first startup, the node generates its identity automatically:
// - BIP39 mnemonic → secp256k1 key pair
// - PeerRecord created in the peer registry
// - Node ID (GuidV4) assigned

// The system outputs the mnemonic — store this securely
console.log('Node ID:', nodeId);
console.log('Public Key:', publicKey);
console.log('Mnemonic (SAVE THIS):', mnemonic);
```

**Keep your mnemonic safe.** It is the only way to recover your node identity if you lose your keys. Anyone with your mnemonic can impersonate your node.

### Step 3: Configure Bootstrap Nodes

Bootstrap nodes are your entry point into the network. They are well-known, long-running nodes that help new nodes discover peers. You configure them in your node configuration:

```typescript
const nodeConfig = {
  // ... storage and port settings from the Node Setup guide ...

  // Bootstrap nodes — at least one must be reachable
  bootstrapNodes: [
    'https://bootstrap1.brightchain.io:3000',
    'https://bootstrap2.brightchain.io:3000',
  ],

  // Discovery settings
  discoveryInterval: 60000,  // re-discover peers every 60 seconds
  syncInterval: 30000,       // sync with peers every 30 seconds
  maxConnections: 50,        // maximum simultaneous peer connections
};
```

When your node starts, it contacts the bootstrap nodes, announces itself via a `NodeAdvertisement` (containing your ID, public key, capabilities, endpoints, and version), and begins discovering other peers through the gossip protocol.

If you're running a private or development network, you can point `bootstrapNodes` at your own nodes instead.

### Step 4: Start Your Node and Verify Connectivity

Follow the [Node Setup](./02-node-setup) guide (Step 2) to start your node:

```bash
npx nx serve brightchain-api
```

Once online, your node will:

1. Contact bootstrap nodes and announce itself
2. Create a `PeerRecord` in the peer registry (automatic — no user action needed)
3. Receive a list of known peers
4. Begin exchanging Bloom filters with peers for efficient block discovery
5. Start participating in the gossip protocol (block announcements, pool announcements)
6. Join the main `BrightChain` pool automatically (any active, non-banned peer has implicit Read/Write/Replicate access)

Verify your node is connected and discovering peers:

```typescript
// Check node health
const health = await node.getHealth();
console.log('Status:', health.status);       // 'online'
console.log('Peers:', health.metrics.peers);  // number of connected peers
console.log('Uptime:', health.metrics.uptime);

// Discover peers
const peers = await node.findPeers();
console.log(`Found ${peers.length} peers on the network`);
```

If `peers` is 0, check:
- At least one bootstrap node is reachable
- Your firewall allows outbound connections on the configured ports
- UPnP is enabled or ports are manually forwarded (see [Node Setup](./02-node-setup), Step 5)

### Step 5: Share Your Storage with the Network

One of BrightChain's core goals is making it easy to contribute storage — and the good news is that your node is already doing it.

#### You're Already in the Main Pool

Every BrightChain node initializes into the main network pool (named `BrightChain` by default, configured via the `MEMBER_POOL_NAME` environment variable). This isn't an optional pool you discover and join — it's the shared namespace that makes the Owner-Free Filesystem work. When your node starts, it's already part of it.

```dotenv
# In your .env — this is the default, you don't need to change it
MEMBER_POOL_NAME=BrightChain
```

The main pool is where whitened TUPLE blocks live. Every piece of data stored on BrightChain is XOR'd into three blocks and distributed across nodes in this pool. Your node stores blocks, serves them to peers who request them, and replicates blocks from other nodes. That's the core of the network — and you're participating from the moment you come online.

#### What Happens Automatically

Once your node is online and connected to peers:

- The gossip protocol announces your node's presence and available resources
- Other nodes begin including yours as a replication target for blocks that need more copies
- When you store data, your whitened blocks are announced to the network and replicated to other nodes
- The reconciliation service periodically syncs your node with peers to fill any gaps
- Your `storageContributed` metric increases as you store and serve blocks

You don't need to write any code or flip any switches. Storage contribution is the default behavior.

#### Tune Your Contribution

You can control how much you contribute through your node configuration and member settings:

```typescript
// Node configuration — how much storage to dedicate
const nodeConfig = {
  storage: {
    totalSpace: 50 * 1024 * 1024 * 1024, // 50 GB dedicated to BrightChain
    dataDirectory: './brightchain-data',
  },
};

// Member settings — replication behavior
const memberSettings = {
  autoReplication: true,   // accept incoming replication requests (default)
  minRedundancy: 3,        // ensure blocks have at least 3 copies across the network
  preferredRegions: [],    // no region preference — accept from anywhere
};
```

Nodes with more available storage, better bandwidth, and higher reliability scores are preferred as replication targets. Simply keeping your node online and responsive earns you a good reputation over time.

#### What You Earn

> **Note**: The energy account (Joules) requires member registration. If you're running as a peer-only node, you still contribute storage and build reputation, but Joule tracking is not active until you register as a member (see Step 6).

BrightChain tracks contributions in Joules — a unit tied to real-world energy costs, not market speculation. There is no cryptocurrency and no mining. Once you register as a member, your energy account reflects:

| Metric | Description |
|--------|-------------|
| `earned` | Joules earned from storage contribution and serving blocks |
| `spent` | Joules consumed by storing your own data on the network |
| `balance` | Net Joules available |
| `availableBalance` | Balance minus reserved amounts |

```typescript
// Requires member registration
const account = await node.getEnergyAccount();
console.log(`Balance: ${account.balance} Joules`);
console.log(`Earned: ${account.earned} Joules (from storage contribution)`);
console.log(`Spent: ${account.spent} Joules (from storing your data)`);
```

The more storage you contribute and the longer you stay online, the more Joules you earn — which you can then spend to store your own data on the network.

### Step 6: (Optional) Register as a BrightChain Member

Everything up to this point works with just a peer identity. If you want application-layer features, you can optionally register as a full BrightChain member. This is a separate, explicit action — not part of node startup.

#### What Member Registration Unlocks

| Feature | Peer Only | Member |
|---------|-----------|--------|
| Store/serve blocks in main pool | Yes | Yes |
| Gossip participation | Yes | Yes |
| Join private pools (with ACL) | Yes | Yes |
| Energy account (Joules) | No | Yes |
| BrightPass (decentralized identity) | No | Yes |
| BrightMail (encrypted messaging) | No | Yes |
| Content authorship with identity | No | Yes |
| Quorum eligibility | No | Yes |

#### How to Register

```typescript
// Optional: register as a BrightChain member
await memberInitService.registerAsMember({
  name: 'Your Name',
  email: 'you@example.com',
  memberType: MemberType.User,
});
```

After registration:
- Your `PeerRecord.isMember` flag is set to `true`
- A `Member` record is created in the BrightChain member database
- Your peer ID and member ID are the same — same identity, two layers
- Your node continues to do everything it did before, plus the application-layer features above

You can register at any time — there's no deadline or window. Your peer identity, stored blocks, pool memberships, and network connections are all preserved.

### Step 7: Understand What Your Node Can Do

Once connected, your node participates in the network through the main `BrightChain` pool:

**Available immediately as a peer (no member registration needed):**
- Store and serve whitened TUPLE blocks in the main pool
- Replicate blocks to and from other nodes
- Discover blocks on other nodes via the discovery protocol
- Receive and propagate gossip messages (block announcements, pool announcements)
- Respond to peer queries ("do you have block X?")
- Advertise your node's capabilities and resources to the network

**Requires member registration:**
- Earn Joules tracked in your energy account
- Use BrightPass for decentralized identity and authentication
- Send and receive BrightMail
- Author content with your identity attached

**Requires additional authorization:**
- Reading/writing blocks in a private storage pool — requires an admin of that pool to add your peer ID or member ID to the pool's ACL (see [Storage Pools](./03-storage-pools), Step 4)
- Participating in quorum governance — requires member registration first, then existing quorum members to vote you in (see Step 9 below)

### Step 8: Join a Private Storage Pool

Private storage pools are where access-controlled work happens. Unlike the main pool, these require an admin to explicitly add your node. Pool ACLs support both peer IDs and member IDs — you don't need to be a member to join a private pool.

1. **Share your node ID and public key** with the pool admin (same whether you're peer-only or a member)
2. **The admin adds you to the pool's ACL** with appropriate permissions (Read, Write, Replicate, or Admin) and specifies your identity type (`peer` or `member`)
3. **For encrypted pools (PoolShared mode):** the admin encrypts the pool's symmetric key with your public key and sends it to you
4. **Authenticate via challenge-response:** when you first connect to the pool, the remote node issues a challenge nonce; your node signs it with your private key to prove identity

```typescript
// Once the admin has added you, connect to the pool
const challenge = await remoteNode.requestPoolChallenge('shared_catalog');
const signature = await localNode.sign(challenge.nonce);
const auth = await remoteNode.authenticateForPool(
  'shared_catalog',
  localNode.nodeId,
  signature,
);
// auth.authenticated === true
```

After authentication, your node can read, write, and replicate blocks within the pool according to your ACL permissions. The reconciliation service will sync any blocks you're missing.

For full details on pool creation, encryption modes, and cross-node coordination, see the [Storage Pools](./03-storage-pools) guide.

### Step 9: Understand Quorum Membership (Invitation Only)

Quorum membership is fundamentally different from network participation. The Quorum is BrightChain's governance layer — it handles sealed identity recovery, document reconstruction, and network policy decisions using Shamir's Secret Sharing.

**Quorum membership is not open.** You cannot join the Quorum by simply running a node. You must first be a registered member (Step 6) — peer-only nodes are not eligible for quorum admission. Here's why and how it works:

#### Why Quorum Membership Is Restricted

When a document is sealed by the Quorum, it is split into cryptographic shares using Shamir's Secret Sharing. Each quorum member receives a share. Reconstructing the document requires a threshold number of members to contribute their shares. Adding or removing a member means every sealed document must have its shares redistributed — this is an expensive, security-critical operation called a "transition ceremony."

Because of this:
- Adding a member triggers a full share redistribution across all sealed documents
- Removing a member also triggers redistribution (to ensure the removed member's shares are invalidated)
- The threshold (minimum members needed to reconstruct) must be maintained at all times

Admitting an untrustworthy member could compromise sealed documents. Removing a bad actor is costly. The stakes are high, so admission is deliberate.

#### How Admission Works

1. **An existing quorum member submits a proposal** to add you, via the proposal/vote system:

```typescript
const proposal = await quorumStateMachine.submitProposal({
  action: ProposalActionType.ADD_MEMBER,
  proposerId: existingMember.id,
  targetMemberId: yourMember.id,
  metadata: { name: 'Your Name', email: 'you@example.com', role: 'operator' },
});
```

2. **Active quorum members vote** on the proposal. The proposal must reach the configured vote threshold (typically 51–75% of active members):

```typescript
await quorumStateMachine.submitVote({
  proposalId: proposal.id,
  voterId: votingMember.id,
  approve: true,
});
```

3. **If approved, the system adds you** and triggers share redistribution. A new epoch is created, and all existing sealed documents have their shares re-split to include you:

```typescript
// This happens automatically when the vote threshold is reached
// A new QuorumEpoch is created with the updated member set
// All documents are re-sealed with shares distributed to the new member set
```

4. **The transition is atomic.** If redistribution fails partway through, the system rolls back using journal entries — no documents are left in a partially-redistributed state.

#### What Quorum Members Do

- Participate in governance votes (add/remove members, policy changes)
- Hold shares of sealed documents (identity recovery records, sensitive data)
- Participate in document reconstruction when the threshold is met
- Run Quorum Nodes with the `QUORUM` capability enabled

#### How to Express Interest

If you want to become a quorum member:

1. Register as a BrightChain member (Step 6) — peer-only nodes cannot be proposed for quorum admission
2. Run a storage node reliably for a sustained period — demonstrate uptime and good behavior
3. Participate actively in storage pools
4. Contact existing quorum members or the BrightChain community
5. An existing member can then propose your admission

There is no automated application process. Trust is built through participation.

### Step 10: Trust Model and Network Safety

BrightChain includes a quorum-governed ban mechanism to protect the network from bad actors. The ban mechanism covers both peer-only nodes and full members. Understanding how it works should give you confidence that the network is safe to join — and that no single member can abuse the system.

#### How Bans Work

If a node operator behaves maliciously (corrupting blocks, spamming gossip, attempting unauthorized access), any established quorum member can propose a ban. Bans can target either a peer ID (for peer-only nodes) or a member ID (which also bans the associated peer identity):

1. A quorum member submits a `BAN_MEMBER` proposal identifying the target, specifying `targetType: 'peer'` or `'member'`, and providing a reason
2. A **75% supermajority** of quorum members must vote to approve (not a simple majority)
3. Even after the vote threshold is reached, a **72-hour cooling period** must elapse before the ban takes effect — giving the community time to reconsider
4. Once enacted, the ban record is signed by the approving quorum members and propagated to all nodes via gossip

Unbanning follows the same process: a proposal, a 75% supermajority vote, and a 48-hour cooling period.

#### What Happens to a Banned Node

A banned node is cut off from network participation:

- Gossip messages from the banned node are dropped
- Peer discovery excludes the banned node
- Block reconciliation refuses to sync with the banned node
- Block store writes from the banned node are rejected
- Active connections are torn down within 60 seconds

The ban is enforced locally by every node using a verified ban list cache. Each node independently verifies the quorum signatures on the ban record before enforcing it.

#### Sybil Attack Protections

A natural concern: what if someone joins the quorum and immediately tries to ban the founding members? BrightChain has two protections against this:

1. **Epoch restriction**: Members admitted in the current epoch cannot propose bans. You must have been a member for at least one full epoch transition before you can propose banning anyone. This prevents a new member from immediately weaponizing the ban system.

2. **Proposer-ally vote filtering**: When tallying votes on a ban proposal, votes from members who were admitted by the ban proposer are excluded. This prevents a single member from admitting a group of allies and using their votes to ban others.

Combined with the 75% supermajority requirement, these protections mean that a small group of colluding members cannot successfully ban established nodes. The math simply doesn't work — you'd need to control three-quarters of the quorum, and your allies' votes wouldn't even count on your proposals.

#### Your Data After a Ban

Blocks already stored on the network are not deleted when a node is banned. The TUPLE storage model means your data is XOR'd and distributed — no single node holds a complete copy. Banning a node removes its ability to participate going forward, but doesn't retroactively destroy data that was legitimately stored.

## Troubleshooting

### Node starts but finds no peers

- Verify at least one bootstrap node URL is correct and reachable
- Check your network allows outbound HTTPS connections
- If behind NAT, enable UPnP or configure manual port forwarding (see [Node Setup](./02-node-setup), Step 5)
- Try increasing `discoveryInterval` if your network is slow

### Authentication fails when joining a pool

- Confirm the pool admin added your correct node ID and public key to the ACL
- Verify your node's private key matches the public key registered in the ACL
- If you regenerated your node identity, the admin needs to update the ACL with your new public key

### "Insufficient members" error on quorum operations

- The quorum requires a minimum number of active members to operate
- If members have gone offline, the system may be in Bootstrap mode with reduced thresholds
- This is not something a new member can fix — existing quorum members need to address it

### Node is connected but can't access any data

- Network connectivity alone doesn't grant access to pool data
- You need to be added to specific pool ACLs by their admins
- Unpooled blocks in the `default` pool may have different access rules

For more detailed troubleshooting, see the [Troubleshooting & FAQ](./06-troubleshooting-faq) guide.

## Next Steps

- [Storage Pools](./03-storage-pools) — Create your own pool or join an existing one
- [Node Setup](./02-node-setup) — Detailed node configuration, lifecycle states, and UPnP setup
- [Building a dApp](./05-building-a-dapp) — Build a full-stack decentralized application on BrightStack
- [Architecture Overview](./00-architecture-overview) — Review the full system architecture
