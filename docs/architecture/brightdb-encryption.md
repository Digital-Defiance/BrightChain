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
- **Both at once:** `BrightDb.open` takes either a `path` or a `storage` object. A storage reports `encryptsAtRest`, and combining that with `encryption` is refused with a clear error, so no one ends up with two layers by accident. Today the guard is enforced in TypeScript. The C++ port gets it when it gains a second storage kind.

## What this leaves out

- **Visible to a host:** block sizes, the number of blocks, the shape of the graph over time, and which physical names are read together. Padding blocks to size buckets reduces this at a storage cost, and BrightChain's fixed block sizes already do it.
- **Key distribution:** a standalone database has one master key supplied by the application. Wrapping that key for several members (ECIES, as pools do) is a later layer on top, not part of the profile.
- **Sync between key holders:** all replicas of one database use the same master key. Replicas with different keys cannot read each other, by design.
- **Cross-database dedup:** none, by design.

## The BrightChain adapter and encrypting pools

**Tested on cloud stores.** The same three checks (named blocks, a plain v2 database with full 1 MiB chunks, and an encrypting-pool database with sealed chunks and nothing readable in the bucket) pass against a real Azurite emulator (`conformance.v2.azure.spec.ts`) and a real LocalStack 3.8 S3 (`conformance.v2.s3.spec.ts`), as well as an in-process S3 fake. Run them with the `AZURE_CONFORMANCE_TEST` and `S3_CONFORMANCE_TEST` variables described in each spec.

`BrightChainV2Storage` (in `brightchain-db`) keeps a v2 database in a BrightChain pool. Blocks go through `IPooledBlockStore.putInPool` and come back through `getFromPool`, and the current root lives in the head registry under a pool-scoped name. A plain pool names each block by the SHA3-512 of its bytes, which is the v2 digest, so no mapping is needed. The adapter checks that the pool returns that exact name and refuses a pool that does not. `BrightChainV2Storage.joinFrom` lets a second node copy a database from any block source into its own pool, after which the nodes write independently and converge with `merge`, directly or over HTTP.

**Encrypting pools.** `putInPool` chooses a block's name itself, as the hash of whatever bytes it stored. An encrypting pool stores ciphertext, so its names are ciphertext hashes, and v2 cannot find a block from its plaintext digest alone. So `IPooledBlockStore` gained an optional `putInPoolWithId(pool, id, data)` that stores bytes under a name the caller chooses (128 lowercase hexadecimal digits). It is implemented in the memory, disk and cloud stores and passes through the ACL wrapper with the same Write check. With `poolEncryption: { key }`, the adapter seals each block with AES-256-GCM (the profile in section 10 of the format spec), stores it under the keyed name `HMAC-SHA512(nameKey, digest)`, and keeps the head in the registry sealed too, so neither a plaintext digest nor the root appears in the pool or the registry. The seal is bound to the name, so a block moved to another name fails to decrypt.

`poolEncrypts: true` without a key declares a pool that encrypts by itself and names blocks by ciphertext hash. That cannot hold a v2 database, so writes are refused with a message saying so.

**What the audit found.** A search of BrightChain for code that assumes a name equals a content hash found two places, both in `BlockFetcher`: it rejects a fetched block whose hash differs from its name, and it re-stores the block with `putInPool`, which would rename it. `BlockFetcher` now takes an optional `isPoolEncrypted(poolId)`; for those pools it skips the hash check and stores the block under the name it was fetched by, and the reader's decryption authenticates it. Sync, the Bloom filter and availability code, the CBL index, the integrity checks and block metadata do not recompute content hashes. A payload of 1 MiB plus the 29-byte seal maps to the next block size class and is stored with its exact length.

**Use a separate pool for BrightDB.** Pool-scoped whitening picks random blocks from a pool as XOR randomizers, and it can pick any block in it, including v2 blocks. Deleting or collecting a v2 block that a file depends on would break that file. Keep BrightDB databases in their own pool, away from files and block lists.

**Key rotation.** The profile uses a key ring: a name secret that never changes plus numbered data keys. Names come only from the name secret, so a rotation renames nothing. Each sealed block records the data key version that sealed it. After a rotation, new blocks and the head use the new version and old blocks stay readable while the old version is in the ring, which matches how pools keep old key versions readable. Someone holding only the old data key can still read old blocks directly, but cannot open the store, because the head is now sealed with the new version, and cannot read anything written after the rotation. To retire the old key, run `collectGarbage({ graceMs: 0 })` and then `resealBlocks()` on the rotated database. Re-sealing rewrites every block reachable from the current root (and any `keepRoots`) under the current data key. File names do not change (names come only from the name secret), each file is replaced atomically (temporary file, fsync, rename), HEAD is re-sealed last, and the run is safe to repeat or resume after a crash. Blocks no retained root reaches are not touched, which is why garbage collection comes first; `resealBlocks({ dryRun: true })` reports how many blocks would change. After it reports zero remaining, a ring with only the new version opens the whole store and the old data key can be deleted. Keep the old key if you keep older roots outside `keepRoots`. The C++ port has the same operation (`Database::resealBlocks`). Pass `{ keyRing }` instead of `{ key }` to `BrightDb.open` or as `poolEncryption`.

**In the browser.** `IndexedDbV2Storage` and `openBrowserDb` accept `encryption: { key }` or `{ keyRing }` and use WebCrypto (`BrightDbV2WebCipher`) to produce exactly the bytes of the Node and C++ ciphers: HKDF-SHA256 keys, HMAC-SHA512 names, AES-256-GCM with the digest as associated data, sealed head. IndexedDB stores the keyed name as the record key, the sealed bytes as the value, and an `encryption` marker in its metadata store. The key lives in the page, so this protects data at rest in the browser profile and not against script running in the page. Re-sealing is not available in the browser build.
