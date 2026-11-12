---
title: "BrightDB and Encryption"
parent: "Architecture & Design"
nav_order: 14
permalink: /docs/architecture/brightdb-encryption/
---

# BrightDB and Encryption

**Status:** Accepted. The standalone profile is specified in section 10 of the [format spec](./brightdb-storage-format-v2.md) and built in TypeScript and C++ (`BrightDb.open({ path, encryption: { key } })`). The BrightChain pool adapter will use the same profile and is not built yet. It covers the v2 storage format on its own and on top of BrightChain.

## The short version

Encrypt at exactly one layer, and make that layer the block store. BrightDB keeps no cipher in its format. A small **keyed block-store profile** sits underneath BrightDB, so the same code protects a standalone database (the key comes from the user) and a BrightChain-backed one (the key comes from the pool). Nothing above the store changes: roots, diffs, indexes, attachments and sync all work on the same logical digests.

## What exists today

- **BrightChain pool encryption** (`EncryptionMode.PoolShared`) generates a random AES-256 key per pool, wraps it for each member with ECIES, and encrypts data with AES-256-GCM using a fresh random IV. Block IDs are hashes of the ciphertext, so lookups and Bloom filters work on encrypted pools. Key versions are kept so older blocks stay readable after rotation. `EncryptionAwareReplication` refuses to replicate node-specific pools and allows pool-shared ones once the key is distributed.
- **Where it applies.** The key management, encrypt and decrypt pieces live in `brightchain-api-lib` (`EncryptedPoolKeyManager`, `PoolEncryptionService`). Pool encryption is applied to the metadata fields of block-list index entries (`encryptedMetadataService`) and its key manager is used when a member's pool is created. No block store calls it on `put`, so BrightDB's v1 document blocks, written through `IBlockStore`, are not encrypted by it today. This project owns that code. It exists and is tested, but nothing uses it on the write path yet, so wiring it in is an open work item and the BrightChain adapter would be the first place it protects BrightDB data.
- **Owner-Free storage** (XOR tuples and CBL whitening) protects files and block lists. BrightDB documents do not use it today.
- **BrightDB v2** has no encryption. Blocks are named by the SHA3-512 digest of their plaintext, and the standalone disk profile stores them as plain files.

## Why not put a cipher inside the format

An in-format cipher (Fireproof's approach) names each block by the digest of its ciphertext. For v2 that has three costs.

1. Parents reference children by digest, so every root, page digest and fixture would depend on the key. Equal data would no longer give equal roots across keys, and the golden vectors would need a key.
2. Encryption must be deterministic (a synthetic IV derived from the key and the plaintext), or every rewrite of an unchanged page creates a new block and breaks content addressing. That is a subtle primitive to get right in two languages.
3. A BrightChain deployment would then encrypt twice, once in the format and once in the pool, and users would have to know which layer to configure and which one holds the key.

## The recommended profile

An `EncryptedBlockStore` wraps any store that holds `digest -> bytes`.

| Part | Rule |
| --- | --- |
| Logical name | The v2 digest of the plaintext, unchanged. Parents, roots, indexes and `_files` keep using it. |
| Physical name | `HMAC-SHA512(key, "name" \| logical digest)`, 128 hex digits, so existing paths and adapters keep working. A host cannot tell what a block is, cannot dedupe against other keys, and cannot test a guess for a known document. |
| Block bytes | `version (1) \| nonce (12) \| AES-256-GCM(ciphertext) \| tag (16)`. The associated data is the logical digest, so a block cannot be swapped for another. The nonce is random. |
| Integrity | After decrypting, the reader checks the plaintext digest, as it does today. A wrong key or a swapped block fails closed. |
| Head | `HEAD` is written through the same profile (physical name fixed, content encrypted), so the root digest is not visible. |
| Keys | Two keys derive from one 32-byte master key with HKDF (one for names, one for data). The version byte selects a key from a ring, so rotation adds a key and old blocks stay readable, as in BrightChain pools. |

Cost: 29 bytes per block, one AES-GCM pass per read or write, and about 300 lines per language. The spec gains one short appendix so TypeScript and C++ stores can share a directory. The core format, fixtures and every feature built on logical digests are untouched.

## How users meet it

- **Standalone:** `BrightDb.open({ path, encryption: { key } })`. Without `encryption` nothing changes. A directory records that it is encrypted (`FORMAT` stays the same, an `ENCRYPTION` marker file names the profile and key version), so opening it without a key fails with a clear error instead of reading garbage.
- **On BrightChain:** do not pass `encryption`. The adapter that exposes a pool as a v2 store uses the pool key and pool naming through the same wrapper. BrightDB never asks the user for a second key.
- **Both at once:** the standalone option refuses to start on a store that reports it already encrypts, so no one ends up with two layers by accident.

## What this leaves out

- **Visible to a host:** block sizes, the number of blocks, the shape of the graph over time, and which physical names are read together. Padding blocks to size buckets reduces this at a storage cost, and BrightChain's fixed block sizes already do it.
- **Key distribution:** a standalone database has one master key supplied by the application. Wrapping that key for several members (ECIES, as pools do) is a later layer on top, not part of the profile.
- **Sync between key holders:** all replicas of one database use the same master key. Replicas with different keys cannot read each other, by design.
- **Cross-database dedup:** none, by design.

## Open decision for BrightChain

Pool encryption names blocks by the hash of the ciphertext. v2 needs to look a block up by its logical digest. Before v2 runs on a BrightChain pool, its adapter must either keep a logical-to-physical mapping or adopt the HMAC naming above. The recommendation is the HMAC naming, because it needs no extra stored mapping and matches the standalone profile.
