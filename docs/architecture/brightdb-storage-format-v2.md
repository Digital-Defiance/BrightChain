---
title: "BrightDB Storage Format v2"
parent: "Architecture & Design"
nav_order: 13
permalink: /docs/architecture/brightdb-storage-format-v2/
---

# BrightDB Storage Format v2

**Status:** Draft. TypeScript is the reference implementation. The C++ port follows the TypeScript format and behavior defined here.

This specification defines the BrightDB content-addressed format and a portable local disk layout. Develop the reference codec, disk adapter, and fixtures in the TypeScript repository. A document lookup follows one path through the collection's primary index. A write replaces only the affected pages and publishes a single database root, even when a transaction changes several collections. A conforming C++ port can then read and write the same directory in a separate process.

Version 2 is a breaking format change. Create v2 stores in a new directory. A v2 reader must report an unsupported format when opening a v1 store or encountering an unknown format version. Data worth keeping can be exported from v1 and imported as a new v2 database. The current TypeScript and C++ implementations have different legacy head layouts and block-size directory names, so neither legacy directory layout is the v2 contract.

## 1. Common encoding

- Integers are unsigned and big-endian. `u8`, `u16`, and `u64` occupy 1, 2, and 8 bytes respectively. TypeScript must use exact integer arithmetic for `u64` values.
- A `digest` is 64 raw bytes of [SHA3-512](https://csrc.nist.gov/pubs/fips/202/final) computed over the entire unpadded block payload. Text references use exactly 128 lowercase hexadecimal digits. File paths, framing provided by a block-store adapter, and sidecars are outside the digest.
- A `ref` is a `u8` presence tag. `0` has no following bytes and `1` is followed by a `digest`. Other tags are invalid.
- A `key` is `u16 byteLength | UTF-8 bytes`. Document IDs and collection names are 1–1024 bytes of well-formed UTF-8. Preserve spelling, case, and Unicode code points. Reject malformed UTF-8 and unpaired UTF-16 surrogates at the API boundary. Compare keys lexicographically as unsigned UTF-8 bytes, with shorter prefixes ordered first.
- A `version` is `u64 counter | 16-byte writer ID`. Counters start at 1. Compare by counter, then lexicographically by unsigned writer ID bytes. A writer ID is a persistent random 128-bit value assigned at initialization or when explicitly creating a writable replica. The all-zero ID is reserved.

Each metadata block begins with the four ASCII bytes `BDB2` (`42 44 42 32`) and one `u8` kind. A complete metadata block is at most **4096 bytes**, including its header. A decoder must reject unknown kinds, invalid fields, out-of-range lengths, trailing bytes, and digest mismatches. A block reference to a known digest that is absent is a missing-block error. An absent optional reference represents an empty tree.

Document blocks contain UTF-8 JSON objects serialized with the [JSON Canonicalization Scheme (RFC 8785)](https://www.rfc-editor.org/rfc/rfc8785). The document's `_id` must be a valid string key and equal the corresponding primary index key. Numbers use finite IEEE 754 binary64. Integral values must be in the inclusive range `[-9007199254740991, 9007199254740991]`. Reject out-of-range integers before a lossy conversion. Applications can represent larger exact values as strings. The portable disk profile caps document payloads at 1,048,576 bytes. A write that exceeds a format limit fails before publication.

## 2. Metadata blocks

The table describes the bytes after the `BDB2` header and kind byte. Fields appear in the listed order.

| Kind | Block | Payload |
| --- | --- | --- |
| `0x01` | Database root | `16-byte database ID` · `u64 clock` · `ref catalog` |
| `0x02` | Collection root | `version generation` · `ref primary` |
| `0x03` | Branch | `u16 bitmap` · one `u64 recordBytes` and `digest` per set bit, in ascending bit order |
| `0x04` | Primary leaf | `u16 count` · `count` primary records |
| `0x05` | Catalog leaf | `u16 count` · `count` catalog records |

The database ID is assigned at initialization and stays fixed for all replicas of that database. The database clock starts at 0 and records the highest counter observed by the database. It must be at least as high as every counter in its catalog and primary trees.

Primary and catalog records have the same byte layout.

| Field | Encoding |
| --- | --- |
| Record key | `key` |
| Record version | `version` |
| State | `u8`. `0` is a tombstone and `1` is live. |
| Target | `digest` for a live record. A tombstone has no target bytes. |

A primary record maps a document `_id` to its document block. A catalog record maps a collection name to its collection root. For a live catalog record, its version identifies the collection generation and must equal the generation in the referenced root. Document mutations update the referenced collection root while keeping the catalog record's generation. Dropping a collection publishes a catalog tombstone with a new version. Recreating it publishes an empty collection root with a new generation. A primary record's version must be newer than its collection generation. A transaction that creates a collection and inserts records into it must allocate the generation first and a greater counter for the records.

## 3. Canonical page tree

Both trees use a 16-way trie. The key's route is the SHA3-512 digest of its raw UTF-8 bytes. At depth 0 use the high nibble of the first byte, then the low nibble, continuing through all 128 nibbles. A branch's bit `n` names nibble `n`, with bit 0 the least significant bit of the decoded bitmap. An unset bit is an empty child. A branch must have at least one child.

For a subtree, `recordBytes` is the sum of the encoded lengths of its records, excluding all page headers and leaf counts. A leaf contains at least one record, with unique keys in ascending key order. The canonical shape at each prefix is determined as follows.

1. Use an absent reference for zero records.
2. Use one leaf when `7 + recordBytes <= 4096`.
3. Otherwise split by the next nibble and encode a branch. If all nibbles have been consumed and the records still exceed the limit, fail with a hash-collision capacity error before publishing.

Each branch stores the `recordBytes` of each child. These counts let a writer decide whether to split or collapse a subtree without scanning the entire tree. Child counts must be positive, and their sum must fit `u64`. A branch must collapse to a leaf whenever its aggregate record bytes fit the leaf budget. A nonempty leaf has no child references. A branch at depth 128 is invalid. A validator checks that records follow the expected path, that a leaf's kind matches its tree, that child counts agree with referenced pages, and that the tree obeys the split rules. Verify paths and references as pages are read. Fully validate untrusted imported or replicated roots before publication.

Given the same records and versions, conforming encoders must produce the same tree bytes and digest regardless of insertion order. Equal database IDs, clocks, and catalog digests produce equal database roots. A point lookup fetches only the database root, the catalog path, the collection root, the primary path, and the requested document. A mutation writes changed leaves and ancestors while reusing untouched digests.

## 4. Commit and recovery

Readers pin the published database root for the lifetime of an operation or transaction. All reads in that operation resolve against that root. A local writer acquires the write lock or uses an equivalent atomic compare-and-swap, reads the current root, and stages all changes against it. Local versions use counters greater than the root clock. A commit may share a counter across distinct records, with a greater counter for successive changes to the same record. If the counter would overflow, fail the commit. Transaction conflict checks must use the current root under the lock or retry from the new root after a failed compare-and-swap.

1. Write and verify the document blocks and all new metadata blocks, with children available before parents.
2. Make those blocks durable before publishing the new database root digest as the head.
3. Replace the head atomically. Acknowledge success and emit commit notifications after durable head publication.

An atomic transaction advances the database head once, including when it changes multiple collections. A bulk API that promises partial success must explicitly stage the successful records according to its ordered or unordered behavior before publication. If staging fails before publication, the old root remains authoritative. An error after the head may have been replaced yields an unknown commit outcome. Reopen before recovery. Retry only when the outcome can be established or the operation is idempotent.

An absent or invalid head in an initialized store, unreadable blocks, and format errors must surface as errors. A reader must never expose a partially loaded root as an empty database. Garbage collection, if enabled, must retain everything reachable from published, pinned, or explicitly retained roots, including in-flight commits and roots needed by replication. Portable v2 implementations may leave unreachable blocks in place until a collector exists.

## 5. Portable local disk profile

The TypeScript implementation defines the reference behavior for this profile. A port must pass the handoff tests before claiming shared-directory interoperability. Each directory holds one database. Paths below are relative to its root. `\n` means one ASCII LF byte.

| Path | Contents |
| --- | --- |
| `FORMAT` | Exactly `BrightDB storage 2\n` in ASCII |
| `HEAD` | Published database-root digest as 128 lowercase hexadecimal digits followed by LF |
| `WRITER` | Persistent local writer ID as 32 lowercase hexadecimal digits followed by LF |
| `LOCK` | A stable lock file. Its contents carry no format meaning. |
| `blocks/<hh>/<digest>` | Exact raw payload. `<hh>` is the first two lowercase hexadecimal digits of the digest. |

Initialize only in a new or empty directory. Finish initialization and make it durable before reporting success. An initialized directory must have the required entries above. Opening a malformed or partially initialized store fails explicitly. Copying a store for independent writes requires an explicit fork operation that keeps the database ID and assigns a new writer ID. A sequential handoff between runtimes preserves the writer ID.

On POSIX, writers acquire an exclusive `flock` on `LOCK` before reading the head for a write and hold it through publication. All writers use the same file and leave it in place. A process exit releases the lock. Additional platform-specific locking profiles require a separate interoperability definition.

Install a block from a temporary file in the same directory after writing and syncing its payload. Verify any existing block before reusing it. Sync the affected directories, including parents of newly created directories, before publishing a reference to those blocks. Publish `HEAD` by writing and syncing a temporary file in the root directory, renaming it over `HEAD`, and syncing the root directory. A durable commit requires a local filesystem that provides these atomic replacement and sync semantics. Portable readers resolve blocks by digest and require no sidecar files.

## 6. Replica merge semantics

Replication of v2 is a separate capability from local format interoperability. A v2 replication implementation must retain divergent heads until it has verified and merged them. A collection-wide or database-wide timestamp comparison cannot discard a divergent root. Peers must agree on the database ID and format version. Validate authorization and fetch the referenced blocks before making a remote root visible. Retain the last verified root while dependencies are missing and retry when they arrive.

- Skip matching digests and descend into changed subtrees. If one side has a branch and the other a leaf, merge the records covered by that prefix and rebuild its canonical shape.
- Merge primary records by key. The greater version wins. For identical versions, a tombstone wins over a live record. Between live records with identical versions, the lexicographically greater raw digest wins.
- Merge catalog records by name. The greater version wins. At an identical version a tombstone wins over a live record. Two live entries at the same version refer to the same generation, so merge their primary trees. A dropped or recreated generation cannot absorb records from an earlier generation.
- Use the maximum clock of the merged roots. Preserve record versions during merge. Do not use arrival time as a tie-breaker. Do not remove tombstones by age alone. Pruning requires a separate replication agreement that prevents stale peers from reintroducing retired records or generations.

The existing BrightChain gossip, ACL, backup, and recovery paths need adapters that understand the v2 graph before cluster support can be enabled. The transport and retention protocol are outside this draft.

## 7. Secondary indexes

This draft standardizes the catalog, primary index, document bytes, and commit boundary. Portable v2 stores use primary lookups and scans. A secondary-index extension must specify a new root format, ordered compound fields, cross-language value comparison and key encoding, and uniqueness behavior during replica merge. Publish secondary-index changes with the same database commit as their document changes. An implementation may use a disposable local query cache keyed by the root digest. Such a cache is derived data and never required to open a portable store.

## 8. Conformance and release order

Land the codec, portable disk adapter, golden fixtures, and local conformance tests in TypeScript first. TypeScript can release the local format once those tests pass. The C++ port consumes the same fixtures and runs the two-way production API handoff before advertising v2 interoperability. Treat a byte or behavior discrepancy as a conformance issue against this spec and the TypeScript fixtures. Any incompatible format revision requires a new format marker and new fixtures in the TypeScript repository.

| Test | Required result |
| --- | --- |
| Golden encoding | The TypeScript reference encoder matches the published bytes and SHA3-512 digests. The C++ encoder independently encodes the same logical inputs and matches those fixtures. Include UTF-8 keys, tombstones, large counters, canonical JSON numbers, and branch bit order. |
| Shape and limits | Different insertion orders for the same versioned records give the same digest. Split and collapse at the exact 4096-byte limit. Reject duplicate and misplaced keys, malformed UTF-8, invalid references, unsupported versions, and trailing bytes. |
| Directory handoff | Use production APIs to write with TypeScript, reopen and write with C++, then reopen in TypeScript. Repeat with C++ as the first writer. Check documents, head bytes, and tombstones. Run each leg in a separate process. |
| Commit failures | Interrupt a write before and around head publication. A fresh process reads either the previous complete transaction or the new complete transaction. An acknowledged commit survives a supported durable-disk restart. Inject a missing block and check for an error. |
| Scaling | Load at least 100,000 live documents on the portable disk profile. A cold `_id` lookup reads only the needed paths. Updating one document leaves unrelated page digests unchanged. Record metadata bytes per update, p95 write latency, and cold lookup block reads at 1k, 10k, and 100k documents. |
| Replica merge | With independent stores, merge partitioned writes in both orders and check identical roots. Cover equal versions, out-of-order delivery, missing child pages, and deletes followed by stale writes or stale collection roots. Required before enabling v2 replication. |

The previous native design and its vectors describe the flat metadata format. The handoff tests must call the production APIs in both implementations. A fixture that pre-serializes a block and has both runtimes hash it exercises checksum agreement only.

## Appendix A. Encoding vectors

The writer ID is `000102030405060708090a0b0c0d0e0f` and the database ID is `101112131415161718191a1b1c1d1e1f`. The populated database has collection `docs` at generation counter 1. Its primary leaf contains a tombstone for U+E000 at counter `9007199254740992` and a live record for U+10000 at counter `9007199254740993`. Both use the fixture writer. The live document has `_id` U+10000 and number `n` equal to 1. The populated database clock is `9007199254740993`. The empty database uses the same database ID and clock 0.

Each vector lists its name, exact payload in hexadecimal, and the SHA3-512 digest. The standalone branch vector tests the codec only. Its child digests are placeholders consisting of 64 `11` bytes and 64 `22` bytes. Its bitmap contains bits 0 and 15 and the corresponding record byte counts are 4090 and 100.

```text
document
7b225f6964223a22f0908080222c226e223a317d
be7a0f1f31764111a07a8c1d8d808bc84fa4a9b1124f4f08a766b11f22f49350fc971468353b26e494eb4b4c728c3dda2ee62e69df81fd25852372991c055f4d

primary
424442320400020003ee80800020000000000000000102030405060708090a0b0c0d0e0f000004f09080800020000000000001000102030405060708090a0b0c0d0e0f01be7a0f1f31764111a07a8c1d8d808bc84fa4a9b1124f4f08a766b11f22f49350fc971468353b26e494eb4b4c728c3dda2ee62e69df81fd25852372991c055f4d
2fc9a7a4140d71aa2e71df22d555a8ef04423613985454c890926d4ff7741b0b70f3e3c2a51c580e360c1b6a9ec2bc558e1a4cd1442a5ad9697c35ed075f5518

collection
42444232020000000000000001000102030405060708090a0b0c0d0e0f012fc9a7a4140d71aa2e71df22d555a8ef04423613985454c890926d4ff7741b0b70f3e3c2a51c580e360c1b6a9ec2bc558e1a4cd1442a5ad9697c35ed075f5518
ac260b09cab9545121ee96d90d7cc34d431f3c3298c5d72b080334fbf315196e14967641b19f2376b61da54e0149b7394433ea1b7762f6020c08c5ebb8c86534

catalog
424442320500010004646f63730000000000000001000102030405060708090a0b0c0d0e0f01ac260b09cab9545121ee96d90d7cc34d431f3c3298c5d72b080334fbf315196e14967641b19f2376b61da54e0149b7394433ea1b7762f6020c08c5ebb8c86534
92721b9f0ab545100bd247c4b31895e31f0fdfb72fbeab8d39aabbbc785a5043da7568aeaa7fe3961e465f78d0355a17e2f559d9433dafa4545bfe1a07c9e831

database
4244423201101112131415161718191a1b1c1d1e1f00200000000000010192721b9f0ab545100bd247c4b31895e31f0fdfb72fbeab8d39aabbbc785a5043da7568aeaa7fe3961e465f78d0355a17e2f559d9433dafa4545bfe1a07c9e831
8877bb85ff7aa992697d53b4d623912a9eb7e351ee70228bcb83e7a79fbda378f87d0a0ca6bd435fbbab6a80acf2eba818af3f716b653c808299c9c46efaecbf

empty
4244423201101112131415161718191a1b1c1d1e1f000000000000000000
b1652c6a4b05f13c3b451ab6ca4f4680bd0541e3427a3125c3af8330af5cfa8fc5e92faa17f11171e300d1283c6ce4b2c2bf25aa65aebb903a24202e2bfabf87

branch
424442320380010000000000000ffa11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111000000000000006422222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222
4f26b9189ac8b8af0dd491789a771fa7fe47bdc8e4b2f4135eeeb95bd6a088ab87907df2d40d236c6ceb6d3e5ae1ee47d76bb949fa4909071bac5b33fd897f27
```
