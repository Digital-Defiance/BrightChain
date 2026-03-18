---
title: "How to Join BrightChain"
parent: "Guides"
nav_order: 1
permalink: /guides/01-how-to-join-brightchain/
---
# How to Join BrightChain

This is the definitive guide for anyone who wants to participate in the BrightChain network. It covers every level of participation, from running a storage node to becoming a BrightTrust member, and explains what you can and cannot do at each level.

## Two-Tier Identity Model

BrightChain separates network-layer identity from application-layer identity:

- **Peer identity** (network layer): Every node gets this automatically on startup. A peer has a cryptographic key pair, a node ID, and can store and serve blocks. No registration, no approval, no application-layer account required.
- **Member identity** (application layer): This is optional and requires explicit registration. A member has a BrightPass account, BrightMail inbox, energy account, and can participate in governance. Every member also has a peer identity — membership is an upgrade, not a replacement.

You can contribute meaningful storage to the network as a peer-only node without ever registering as a member. The network doesn't care whether you have a BrightPass or a BrightMail inbox — it cares that you store and serve blocks reliably.

## Participation Levels

BrightChain has a layered participation model. You can contribute meaningfully at any level without needing access to the levels above it.

| Level | What You Do | Identity Required | Open to Anyone? | How You Get In |
|-------|-------------|-------------------|-----------------|----------------|
| 1. Peer Node Operator | Run a node, store and serve blocks in the main pool | Peer only | Yes | Install, configure, start |
| 2. BrightChain Member | BrightPass, BrightMail, BrightDB, energy account, content authorship | Member (peer + member) | Yes (self-register or BrightTrust-admitted) | Explicit registration |
| 3. Storage Pool Member | Participate in private, access-controlled pools (BrightDB-backed) | Peer or Member | Per-pool ACL | Pool admin adds you |
| 4. dApp Builder | Build applications on BrightStack (BrightDB, Express, React, Node) | Peer or Member | Yes | Use the SDK |
| 5. BrightTrust Member | Govern the network, hold sealed document shares | Member | By invitation only | Existing members vote you in |

Most participants will be Level 1 or Level 3. That's by design. The network's value comes from widespread storage contribution, not from BrightTrust membership or application-layer features.

## Level 1: Running a Peer Node (Storage Only)

### What You Need

- Node.js 20+
- Yarn
- 10 GB disk minimum (500 GB+ recommended for production)
- A network connection (UPnP-capable router or manual port forwarding)

### What Happens When You Start

1. Your node generates a cryptographic identity (BIP39 mnemonic → ECDSA key pair on secp256k1)
2. A `PeerRecord` is created automatically — this is your network-layer identity
3. It contacts bootstrap nodes and announces itself via a `NodeAdvertisement`
4. It joins the main pool (`BrightChain`) automatically — any active, non-banned peer has implicit Read/Write/Replicate access for raw block operations
5. It begins exchanging Bloom filters with peers for block discovery
6. It starts storing, serving, and replicating whitened TUPLE blocks

You are now contributing storage. There is no application process, no waiting period, no approval. No `Member` record is created — you are a peer-only node. The network is open at this layer.

### What You Can Do (Peer Only)

- Store and serve whitened TUPLE blocks in the main pool
- Replicate blocks to and from peers
- Discover blocks via the gossip and discovery protocols
- Participate in gossip (receive and relay announcements)
- Build and run dApps on BrightStack

### What You Cannot Do (Peer Only)

- Use BrightPass, BrightMail, or energy accounts (requires member registration)
- Author content with identity attribution (requires member registration)
- Access private storage pools (requires pool admin to add your peer ID or member ID)
- Vote on governance proposals (requires BrightTrust membership)
- Propose bans or policy changes (requires BrightTrust membership)
- Hold shares of sealed documents (requires BrightTrust membership)

### Opting Out of Storage Contribution

You can reduce or stop your storage contribution at any time:

- Set `totalSpace` to 0 in your node configuration to stop accepting new blocks
- Disable `autoReplication` to stop accepting incoming replication requests
- Shut down your node — there is no penalty for going offline, though your reliability score will decrease over time

Blocks you already store will remain until they are replicated elsewhere and your node is no longer needed as a replica. The network handles this gracefully through the reconciliation protocol.

## Level 2: Becoming a BrightChain Member

Member registration is an explicit, optional step that unlocks application-layer features. Your peer identity is preserved — membership is an upgrade, not a replacement.

### What You Get

- **BrightPass**: Decentralized identity and authentication
- **BrightMail**: Encrypted messaging
- **Energy account**: Joule-based economy for tracking storage contribution and spending
- **Content authorship**: Ability to author content with identity attribution
- **BrightTrust eligibility**: Only members can be proposed for BrightTrust admission

### How to Register

Registration is a separate action from starting your node. Depending on the network's configuration, you either self-register or are admitted by the BrightTrust:

```typescript
// Self-registration (if the network allows it)
await memberInitService.registerAsMember({
  name: 'Your Name',
  email: 'you@example.com',
  memberType: MemberType.User,
});
```

After registration, your `PeerRecord.isMember` flag is set to `true`, and a `Member` record is created in the BrightChain member database. Your peer ID and member ID are the same — same identity, two layers.

### What Changes

Your node continues to do everything it did as a peer-only node, plus:

- You earn Joules tracked in your energy account
- You can use BrightPass for authentication
- You can send and receive BrightMail
- You can author content with your identity attached
- You become eligible for BrightTrust membership proposals

## Level 3: Joining a Private Storage Pool

Private pools provide access-controlled, optionally encrypted namespaces for specific applications or organizations. Pool ACLs can reference either peer IDs (for peer-only nodes) or member IDs (for full members).

### How to Join

1. Share your node ID and public key with the pool admin (this is the same whether you're a peer-only node or a member)
2. The admin adds you to the pool's ACL with specific permissions (Read, Write, Replicate, Admin) and specifies your identity type (`peer` or `member`)
3. For encrypted pools (`PoolShared` mode), the admin encrypts the pool's symmetric key with your public key
4. Your node authenticates via ECDSA challenge-response when connecting to the pool

### Creating Your Own Pool

Any node operator can create a storage pool:

```typescript
const poolConfig = {
  encryptionMode: EncryptionMode.PoolShared, // or None, NodeSpecific
  searchableMetadataFields: ['blockSize', 'createdAt'],
};
await pooledBlockStore.createPool('my-pool', poolConfig);
```

You become the pool's first admin. You control who joins and what permissions they have. Pool ACL changes require >50% of pool admins to approve.

### Leaving a Pool

Remove yourself from the pool's ACL or simply stop connecting to it. Your blocks in the pool will be replicated to other pool members through reconciliation.

## Level 4: Building a dApp

BrightStack is the dApp development paradigm: BrightDB + Express + React + Node.js. If you've built a MERN app, you already know most of what you need.

See the [Building a dApp](../walkthroughs/05-building-a-dapp) walkthrough for a complete tutorial.

Key points:
- BrightDB provides a MongoDB-like API backed by the Owner-Free Filesystem
- Authentication uses BIP39/32 key derivation instead of passwords
- Data isolation uses Storage Pools with optional encryption
- Replication is decentralized via gossip and reconciliation

## Level 5: BrightTrust Membership

The BrightTrust is BrightChain's governance layer. It handles sealed identity recovery, document reconstruction, network policy, and the ban mechanism.

### Why It's Restricted

Adding a BrightTrust member triggers a full share redistribution across all sealed documents (Shamir's Secret Sharing). This is expensive and security-critical. Admitting an untrustworthy member could compromise sealed documents. Removing a bad actor is equally costly.

### How to Get In

1. Run a storage node reliably for a sustained period
2. Participate actively in storage pools
3. Build trust with existing BrightTrust members through the community
4. An existing member proposes your admission (`ADD_MEMBER` proposal)
5. Active BrightTrust members vote — the proposal must reach the configured threshold (typically 51–75%)
6. If approved, a new epoch is created and all sealed documents have their shares redistributed to include you

### What BrightTrust Members Do

- Vote on governance proposals (add/remove members, policy changes, bans)
- Hold shares of sealed documents (identity recovery records, sensitive data)
- Participate in document reconstruction when the threshold is met
- Run BrightTrust Nodes with the `BRIGHT_TRUST` capability enabled

See the [BrightTrust Member/Operator Guide](./03-BrightTrust-member-guide.md) for the full details.

## Quick Reference: Can I Do X Without Member Registration?

| Action | Peer Only? | Requires Member? | Requires BrightTrust? |
|--------|-----------|-------------------|-------------------|
| Run a node and contribute storage | Yes | No | No |
| Store and serve blocks in the main pool | Yes | No | No |
| Discover and replicate blocks | Yes | No | No |
| Participate in gossip | Yes | No | No |
| Join private storage pools | Yes (with pool admin approval) | No | No |
| Create your own storage pool | Yes | No | No |
| Build and deploy dApps | Yes | No | No |
| Earn Joules (energy account) | No | Yes | No |
| Use BrightPass | No | Yes | No |
| Use BrightMail | No | Yes | No |
| Author content with identity | No | Yes | No |
| Store your own data with energy tracking | No | Yes | No |
| Vote on governance proposals | No | No | Yes |
| Propose bans | No | No | Yes |
| Hold sealed document shares | No | No | Yes |
| Participate in identity recovery | No | No | Yes |

## Next Steps

- [Node Operator Guide](./02-node-operator-guide.md) — Day-to-day operations, monitoring, maintenance
- [BrightTrust Member/Operator Guide](./03-BrightTrust-member-guide.md) — Governance, voting, sealed documents
- [Building a dApp](../walkthroughs/05-building-a-dapp) — Full-stack development on BrightStack
- [Storage Pools](../walkthroughs/03-storage-pools) — Pool creation, encryption, cross-node coordination
