# Member Pool Security — Requirements

## Context

The BrightChain member pool stores the shared user registry, RBAC documents, and member data replicated across all nodes. Currently created without ACLs or write protection — any node can read AND write. Reads should stay open; writes must be restricted to authorized nodes with cryptographic enforcement.

BrightDB also needs to support private encrypted pools for BrightPass, BrightMail, etc. This spec covers both the member pool (public-read/private-write) and the general pool security framework.

## Pool Security Models

| Model | Read | Write | Encryption | Use Case |
|-------|------|-------|------------|----------|
| Public | Anyone | ACL'd nodes, signed writes | None | Member registry, public keys |
| Private | ACL'd nodes (need pool key) | ACL'd nodes, signed writes | PoolShared (AES + ECIES per member) | BrightPass, BrightMail, org data |
| Node-local | Storing node only | Storing node only | NodeSpecific | Local caches, private node data |

## Phase 1 Requirements: Member Pool (Public-Read / Private-Write)

1. When `inituserdb` creates a new cluster, the member pool MUST be created with `WriteMode.Restricted` and an ACL granting the system user Admin (Read/Write/Replicate/Admin).
2. The pool ACL MUST be signed by the system user's ECDSA key so any node can verify it.
3. The `AuthorizedHeadRegistry` MUST enforce that every write to the member pool includes a valid `IWriteProof` signed by a node whose public key is in the ACL.
4. Writes without a valid proof MUST be rejected with `WriteAuthorizationError`.
5. Read operations MUST pass through without authorization checks (public read).
6. The pool ACL and write mode config MUST be persisted in a `__pool_security__` collection within the BrightDB.
7. At runtime startup, the node MUST load the pool security config and configure `AuthorizedHeadRegistry` accordingly.
8. When a node writes to the member pool (user registration, profile update, etc.), it MUST produce a `IWriteProof` signed with its system user's private key.
9. When receiving head updates via gossip, the `HeadUpdateSyncHandler` MUST verify the write proof before applying the update.

## Phase 2 Requirements: Node Admission

10. A new node MUST request pool write access from an existing Admin node.
11. The Admin MUST verify the requesting node's identity via ECDSA challenge-response.
12. Upon approval, the Admin MUST add the new node to the ACL, sign the updated ACL, and gossip it.
13. The new node MUST trigger reconciliation to sync pool data after admission.

## Phase 3 Requirements: Ban Enforcement

14. Banned nodes MUST be removed from the member pool ACL.
15. All nodes MUST reject gossip, connections, and reconciliation from banned peers.
16. The ACL update removing the banned node MUST be signed and gossiped.

## Phase 4 Requirements: Private Encrypted Pools (Future)

17. Private pools MUST use `EncryptionMode.PoolShared` with AES-256 symmetric key.
18. The pool key MUST be ECIES-encrypted per member node.
19. Key rotation MUST occur when a member is removed/banned.
20. The `AuthorizedHeadRegistry` MUST enforce signed writes for private pools too.

## Open Questions — Resolved

1. **Should the pool ACL be encrypted?** No. Signed, not encrypted. Every node needs to verify permissions without needing a key.
2. **Single admin approval vs BrightTrust vote?** Tiered: single Admin for pool read/write access, BrightTrust vote for Admin promotion.
3. **Read-only tier?** No pool-level read-only tier. The member pool is public-read. Specific services (recipient lookup) expose narrow views.

## Affected Packages

- `brightchain-api-lib` — `BrightChainMemberInitService`, `PoolSecurityService`, gossip ACL updates
- `brightchain-db` — `AuthorizedHeadRegistry` (already implemented), `WriteAclManager`
- `brightchain-inituserdb` — Pass system user keys to init, configure write mode
- `brightchain-node-express-suite` — Runtime pool security config loading
- `brightchain-lib` — Pool security config interfaces


## Phase 5 Requirements: Security Audit Fixes

21. ACL signatures MUST cover the full document content (writers list, admins list, scope, version, mode) — not just scope+version+mode. This prevents an attacker from modifying the writers list without invalidating the signature.
22. WebSocket peer connections MUST require ECDSA challenge-response authentication. The `requireAuth=false` path MUST be removed for production.
23. Security-critical gossip announcements (`pool_join_approved`, `acl_update`) MUST include a signature from the originating admin that can be verified by receiving nodes.

## Phase 6 Requirements: Ledger Integration

24. The member pool MUST maintain a `Ledger` instance as a mandatory audit trail.
25. Every write to the member pool (insert, update, delete) MUST produce a corresponding signed ledger entry.
26. ACL changes (node admission, ban) MUST be recorded as governance entries in the ledger.
27. The ledger MUST be validated on startup to detect tampering.
28. Ledger entries MUST be replicated across nodes via gossip and verified during reconciliation using consistency proofs.
29. The `auditLedger` option MUST be configurable per pool, defaulting to `true` for the member pool.
30. Ledger inclusion proofs MUST be available for any entry, enabling light client verification without the full chain.
