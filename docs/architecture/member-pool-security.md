---
title: "Member Pool Security"
parent: "Architecture & Design"
nav_order: 12
permalink: /docs/architecture/member-pool-security/
---
# Member Pool Security

The BrightChain member pool stores the shared user registry, RBAC documents, and member data replicated across all nodes. This document describes the security model that protects the pool from unauthorized writes, tampering, and malicious nodes.

## Security Model: Public-Read / Private-Write

The member pool uses a **public-read, private-write** model:

- **Any node** can read the member registry (user lookup, authentication, recipient verification)
- **Only ACL'd nodes** can write (user registration, profile updates, RBAC changes)
- **Writes are cryptographically signed** — every write includes an ECDSA signature from the writing node's system user
- **Tampering is detectable** — invalid signatures are rejected, and the audit ledger provides a hash-chained history

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BrightDB Write Path                      │
│                                                             │
│  Collection.insertOne() → store block → setHead()           │
│                                          │                  │
│                              ┌───────────▼──────────────┐   │
│                              │ AuthorizedHeadRegistry    │   │
│                              │                          │   │
│                              │ 1. Auto-sign (local)     │   │
│                              │    OR verify (remote)    │   │
│                              │ 2. Check ACL             │   │
│                              │ 3. Reject if unauthorized│   │
│                              │ 4. Fire onWrite callback │   │
│                              └───────────┬──────────────┘   │
│                                          │                  │
│                              ┌───────────▼──────────────┐   │
│                              │ Audit Ledger             │   │
│                              │ (signed, hash-chained)   │   │
│                              └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components

### Pool ACL (Access Control List)

The pool ACL is a signed document (`IAclDocument`) that lists:
- **Authorized writers** — nodes whose system user public keys can write to the pool
- **ACL administrators** — nodes that can modify the ACL itself
- **Write mode** — `Restricted` (requires signed proof) or `Open` (no auth)

The ACL signature covers the full document content (writers list, admins list, scope, version, mode) using `computeAclContentHash()`. This prevents an attacker from modifying the writers list without invalidating the signature.

### AuthorizedHeadRegistry

A decorator around the head registry that enforces write authorization:
- **Local writes** are auto-signed using the `ILocalSigner` (system user's key pair)
- **Remote writes** (gossip head updates) must include a `IWriteProof` with a valid signature
- **Unauthorized writes** throw `WriteAuthorizationError`

### WriteAclManager

Manages the ACL cache and provides:
- Write proof verification (`verifyWriteProof()`)
- ACL mutation with admin signature verification (`setAcl()`, `addWriter()`, `removeWriter()`)
- Last-administrator protection (can't remove the last admin)
- Pool encryption member validation

### Audit Ledger

An append-only blockchain ledger (`Ledger` from `brightchain-lib`) that records every write to the member pool:
- Each entry is signed by the writing node's system user
- Entries are hash-chained (each links to the previous via SHA3-512)
- A Merkle tree provides O(log N) inclusion proofs
- Consistency proofs verify the append-only property between two states

## Node Admission Flow

```
New Node                    Admin Node
   │                            │
   │── pool_join_request ──────>│  (via gossip)
   │                            │  Admin reviews
   │<── pool_join_approved ─────│  (signed ACL update)
   │                            │
   │  (triggers reconciliation to sync pool data)
```

1. New node sends a `pool_join_request` via gossip
2. Admin reviews and approves via the admin API (`POST /admin/pool/approve-node`)
3. Admin adds the new node to the ACL, signs the update, gossips the approval
4. New node receives the approval and triggers reconciliation

## Ban Enforcement

When a BrightTrust ban is enacted:
1. The banned node is removed from the pool ACL
2. The updated ACL is signed and gossiped
3. All nodes update their local ban list cache
4. Gossip from the banned node is filtered
5. Reconciliation skips the banned peer
6. WebSocket connections from the banned node are refused

Ban configuration:
- **Supermajority threshold**: 75% of BrightTrust admins (minimum 67%)
- **Cooling period**: 72 hours (minimum 1 hour)
- **Unban cooling period**: 48 hours

## Private Encrypted Pools

For sensitive data (BrightPass, BrightMail, admin databases), pools use `EncryptionMode.PoolShared`:
- A random AES-256 symmetric key is generated per pool
- The key is ECIES-encrypted for each member's public key
- Data is encrypted with AES-256-GCM before storage
- Key rotation occurs when a member is removed (new key, re-encrypted for remaining members)
- Old data remains readable with old key versions

## Security Properties (Proven by 57 Adversarial Tests)

| Property | Enforcement | Test Count |
|----------|-------------|------------|
| Authorized writes succeed | AuthorizedHeadRegistry + auto-signing | 2 |
| Unauthorized writes rejected | WriteAclManager ACL check | 4 |
| Forged signatures rejected | ECDSA verification | 2 |
| Tampered payloads rejected | SHA-256 content hash | 2 |
| Replayed proofs rejected | Block-specific payload binding | 1 |
| ACL tampering detected | Full content hash signature | 2 |
| Read access unrestricted | No auth on reads | 1 |
| Multiple authorized nodes | ACL supports multiple writers | 1 |
| Removed node loses access | ACL update + re-verification | 1 |
| Gossip head updates verified | Write proof in announcement | 2 |
| Node admission flow | Request → approve → write | 5 |
| Ban enforcement | ACL removal + gossip filter + connection refusal | 8 |
| Private pool encryption | AES-256-GCM + ECIES key wrapping | 7 |
| Audit ledger integrity | Signed entries + hash chain + Merkle proofs | 10 |
| WebSocket authentication | ECDSA challenge-response + ban check + timeout | 5 |
| BrightTrust policy | Supermajority + cooling period + minimum thresholds | 4 |

## Related Documentation

- [Block Chain Ledger](./blockchain-ledger.md) — Ledger architecture and Merkle proofs
- [Docker Node Setup](../guides/docker-node-setup.md) — Production deployment
- [Node Operator Guide](../guides/02-node-operator-guide.md) — Day-to-day operations
- [Email Gateway Configuration](../messaging/email-gateway-configuration.md) — Email security
