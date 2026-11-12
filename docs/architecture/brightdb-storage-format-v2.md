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
| `0x02` | Collection root | `version generation` · `ref primary` · `ref indexes` |
| `0x03` | Branch | `u16 bitmap` · one `u64 recordBytes` and `digest` per set bit, in ascending bit order |
| `0x04` | Primary leaf | `u16 count` · `count` primary records |
| `0x05` | Catalog leaf | `u16 count` · `count` catalog records |
| `0x06` | Index definitions | `u16 count` · `count` index definitions in ascending name order (section 7) |
| `0x07` | Index leaf | `u16 count` · `count` index keys, each `u16 byteLength \| bytes`, in ascending byte order |
| `0x08` | Index branch | `u16 skipNibbles` · `ceil(skipNibbles / 2)` packed prefix bytes · `u16 bitmap` · one `u64 entryBytes` and `digest` per set bit |
| `0x09` | Blob manifest | `u64 size` · `u8 depth` · `u16 entryCount` · `entryCount` `digest`s (section 8) |

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
- Merge catalog records by name. The greater version wins. At an identical version a tombstone wins over a live record. Two live entries at the same version refer to the same generation, so merge their primary trees and their index definitions. Definitions merge by name. A name defined on one side only is kept, and its index is rebuilt from the merged documents if the other side lacks it. A name defined on both sides with different field lists keeps the list that is greater when its field paths are joined with NUL bytes and compared bytewise, on both sides, and its index is rebuilt if the loser's definition was local. A dropped or recreated generation cannot absorb records from an earlier generation.
- Merging is commutative, associative and idempotent: replicas that have exchanged the same set of commits in any order and direction reach equal roots. The merged result takes records and collection roots unchanged from one side or the other, so it never needs a new version, and a replica that already holds everything the other has is left unchanged.
- Use the maximum clock of the merged roots. Preserve record versions during merge. Do not use arrival time as a tie-breaker. Do not remove tombstones by age alone. Pruning requires a separate replication agreement that prevents stale peers from reintroducing retired records or generations.

The existing BrightChain gossip, ACL, backup, and recovery paths need adapters that understand the v2 graph before cluster support can be enabled. The v2 graph includes index trees and attachment blocks reachable from collection roots and `_files` references. The transport and retention protocol are outside this draft.

## 7. Secondary indexes

A collection can have named secondary indexes. An index is derived data: every entry follows from a live document and the index definition, so replicas merge primary records first and then repair index entries for documents whose records changed. Index changes are published in the same database commit as the document changes that cause them.

**Definitions.** A collection root's `indexes` ref names an index-definitions block, or is absent when the collection has no indexes. A definition is `key name · u8 fieldCount · fieldCount × key fieldPath · ref root`. Names are 1–1024 bytes of UTF-8 and unique, and definitions appear in ascending name order. An index has 1–8 distinct fields. A field path is 1–256 bytes of UTF-8 holding dot-separated property names. `root` is the root of the index's entry tree, absent while the index has no entries. An index-definitions block has at least one definition, and the whole block must fit the 4096-byte limit.

**Values.** A path is resolved through plain objects only. A missing path or an empty array indexes as the *absent* value. A scalar indexes as itself. An array indexes one entry per distinct scalar element, so a document can have several entries. An object, or an array element that is an object or array, cannot be indexed and fails the write before publication. A document that produces more than 1,024 entries for one index, or an entry longer than 2,048 bytes, also fails the write.

**Entry keys.** An entry key is the encoded value of each indexed field in order, followed by the encoded document `_id`. Each value has a one-byte tag followed by a self-delimiting body, and bytewise order of the encoding is the index order.

| Value | Tag | Body |
| --- | --- | --- |
| Absent | `0x08` | none |
| `null` | `0x10` | none |
| `false` / `true` | `0x20` / `0x21` | none |
| Number | `0x30` | 8 bytes: the IEEE 754 binary64 bits of the value with `-0` as `0`. If the sign bit is set, invert all 64 bits. Otherwise set the sign bit. |
| String | `0x40` | The UTF-8 bytes with each `0x00` written as `0x00 0xFF`, then `0x00`. The `_id` uses this encoding. |

Types order as absent, null, false, true, numbers, strings. Numbers order by value. Strings order by UTF-8 bytes. No entry key is a prefix of another because every body is self-delimiting and every key ends with a document `_id`.

**Entry tree.** Entries are stored in an ordered, path-compressed 16-way trie over the nibbles of the key, high nibble first. Its shape is determined by the key set alone. Let `bytes` of a set of keys be the sum of `2 + length` over its keys, and let the prefix of a subtree at depth `d` be the first `d` nibbles shared by its keys.

1. Use an absent reference for no keys.
2. Use one index leaf when `7 + bytes <= 4096`. Its keys are in ascending order.
3. Otherwise let `s` be the number of nibbles after depth `d` that are shared by all keys. Encode an index branch whose `skipNibbles` is `s`, whose prefix holds those nibbles (an odd final nibble is padded with a zero nibble that decoders must check), and whose children are the subtrees for each value of the nibble at depth `d + s`, built at depth `d + s + 1`. A branch has at least two children and its `entryBytes` are the child byte counts. A branch whose `bytes` fit a leaf must collapse into a leaf.

A decoder rejects unsorted, duplicate or prefix-overlapping keys, keys outside 1–2,048 bytes, a branch with fewer than two children or an oversize skip, unknown padding, and child counts that disagree with their pages. Keys must match the path to the page that holds them.

**Queries.** A query names an index and fixes some leading fields to exact values. It can bound the next field with `gt`, `gte`, `lt`, `lte`, or select strings with a given prefix, and it can ask for descending order and a limit. The reader derives a byte range from the encoded values and walks only the pages that can overlap it. A one-sided bound stays within the bound's type. A string equal to an equality value never matches a longer string that begins with the same bytes, so the upper end of a range that follows a string value is the value's encoding followed by `0xFF`. A document found through several entries is returned once.

**Maintenance and merge.** A writer computes a document's old and new entries and applies only the difference. Creating an index scans the documents visible in the commit and adds all their entries. Dropping an index removes its definition. A merge applies section 6 to the primary trees and then, for each changed `_id` from the diff of the merged and original primary trees, replaces its old entries with entries from its merged document. Two replicas with equal primary trees and definitions therefore have equal index roots. An index definition conflicts only by name, and the greater collection generation wins.

## 8. Attachments

A document can reference binary files of any size stored as blocks. The file's bytes are split into chunks of exactly 1,048,576 bytes, except the last, which holds the remainder. Each chunk is stored as a raw block named by its SHA3-512 digest. Blob manifest blocks (`0x09`) form a tree over the chunks, in the same way a super block list does: a manifest of `depth` 0 lists chunk digests, and a manifest of `depth` _n_ greater than 0 lists manifests of depth _n_ - 1. A manifest holds at most 63 entries.

Let `childSpan(depth)` be 1,048,576 × 63^`depth` bytes. A manifest's `size` is the number of file bytes beneath it, and every entry but the last covers exactly `childSpan(depth)` bytes. A manifest must have `entryCount` equal to `ceil(size / childSpan(depth))`, a `depth` of at most 7, and, when `depth` is greater than 0, a `size` greater than `childSpan(depth)`, so the tree is as shallow as it can be. A file of size 0 is a depth 0 manifest with no entries. The file's reference is the digest of its root manifest. Writing builds the tree bottom-up: chunk digests go into depth 0 manifests of 63 entries, those manifests into depth 1 manifests of 63 entries, and so on until one manifest remains. The same bytes therefore always give the same root digest.

A document references files through the reserved `_files` property, an object whose values each have a `digest` (128 lowercase hexadecimal digits naming a root manifest), a `size` (a non-negative safe integer equal to the root manifest's size) and an optional `type` (a string of up to 255 bytes). A write that sets `_files` fails before publication unless every referenced manifest and chunk block already exists in the store and the sizes agree. A reader fetches manifests and chunks on demand and verifies every digest and length. The blocks reachable from a published root through `_files` are live data for garbage collection, replication and sync. Blocks written for a file that no document references yet are not reachable and can be collected.

## 9. Conformance and release order

Land the codec, portable disk adapter, golden fixtures, and local conformance tests in TypeScript first. TypeScript can release the local format once those tests pass. The C++ port consumes the same fixtures and runs the two-way production API handoff before advertising v2 interoperability. Treat a byte or behavior discrepancy as a conformance issue against this spec and the TypeScript fixtures. Any incompatible format revision requires a new format marker and new fixtures in the TypeScript repository.

| Test | Required result |
| --- | --- |
| Golden encoding | The TypeScript reference encoder matches the published bytes and SHA3-512 digests. The C++ encoder independently encodes the same logical inputs and matches those fixtures. Include UTF-8 keys, tombstones, large counters, canonical JSON numbers, and branch bit order. |
| Shape and limits | Different insertion orders for the same versioned records give the same digest. Split and collapse at the exact 4096-byte limit. Reject duplicate and misplaced keys, malformed UTF-8, invalid references, unsupported versions, and trailing bytes. |
| Directory handoff | Use production APIs to write with TypeScript, reopen and write with C++, then reopen in TypeScript. Repeat with C++ as the first writer. Check documents, head bytes, and tombstones. Run each leg in a separate process. |
| Commit failures | Interrupt a write before and around head publication. A fresh process reads either the previous complete transaction or the new complete transaction. An acknowledged commit survives a supported durable-disk restart. Inject a missing block and check for an error. |
| Scaling | Load at least 100,000 live documents on the portable disk profile. A cold `_id` lookup reads only the needed paths. Updating one document leaves unrelated page digests unchanged. Record metadata bytes per update, p95 write latency, and cold lookup block reads at 1k, 10k, and 100k documents. |
| Index keys and trees | The TypeScript encoder matches the published value encodings, entry keys, query ranges, and index-tree roots and pages. The C++ encoder independently matches them. Insertion order, batched updates and removals never change a root. |
| Index maintenance | A store written by one runtime with several indexes (including compound, multikey and dotted paths) answers the recorded queries in the other runtime. Writes that fail on an unindexable value publish nothing. |
| Attachments | Both runtimes produce identical manifest and chunk digests for the same bytes, reject `_files` references to missing blocks or wrong sizes, and read each other's files. |
| Encrypted profile | The published known-answer vectors (key derivation inputs, physical names, sealed blocks and sealed head) decrypt and re-derive identically in both runtimes. A store written under a key by one runtime opens in the other. A missing key, a wrong key, a changed block and a swapped block each fail with an error. |
| Replica merge | With independent stores, merge partitioned writes in both orders and check identical roots. Cover equal versions, out-of-order delivery, missing child pages, and deletes followed by stale writes or stale collection roots. Required before enabling v2 replication. |

The previous native design and its vectors describe the flat metadata format. The handoff tests must call the production APIs in both implementations. A fixture that pre-serializes a block and has both runtimes hash it exercises checksum agreement only.

## 10. Encrypted block-store profile

An optional profile encrypts every block at rest without changing any digest in the graph. Roots, pages, document references, index roots and `_files` references all keep naming blocks by the SHA3-512 digest of their plaintext. Only the portable disk profile's file names and file contents change. Use it for a standalone store. A storage that already encrypts beneath BrightDB, such as a BrightChain pool, must not enable it: an implementation reports whether its storage encrypts at rest and refuses to combine that with this profile.

A store using the profile has an `ENCRYPTION` file holding exactly `BrightDB encryption 1\n`. A reader without a key rejects such a directory, and a reader with a key rejects a directory without the file. The `FORMAT`, `WRITER` and `LOCK` files keep their meaning and stay unencrypted.

**Keys.** One 32-byte master key is the only secret. Two keys derive from it with HKDF-SHA256 using the salt `BrightDB v2 encryption` (ASCII) and the info strings `name` and `data`, each producing 32 bytes.

**Names.** A block with logical digest `D` is stored at `blocks/<hh>/<name>`, where `name` is the lowercase hexadecimal HMAC-SHA512 under the name key of the ASCII bytes `brightdb-v2-name` followed by the 64 raw bytes of `D`, and `<hh>` is the first two digits of `name`.

**Blocks.** The file holds `0x01 | nonce (12 bytes) | ciphertext | tag (16 bytes)`. The cipher is AES-256-GCM under the data key with a fresh random nonce for every write. The associated data is the ASCII bytes `BDB2-block` followed by the 64 raw bytes of `D`. Decoders reject any other first byte. After decrypting, a reader still checks that the plaintext's SHA3-512 equals `D`, so a wrong key, a changed block and a block moved to another name all fail closed.

**Head.** `HEAD` holds the same layout with the 64 raw bytes of the head digest as plaintext and the associated data `BDB2-head`, so the root digest is not visible. It is replaced atomically as in section 5.

**Merge and fork.** Blocks cross between replicas as plaintext, so each side seals them under its own key. A fork keeps the source's key.

**Not hidden.** Block sizes, block counts, access patterns and the `FORMAT`, `WRITER` and `LOCK` files are visible to whoever holds the directory.

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
42444232020000000000000001000102030405060708090a0b0c0d0e0f012fc9a7a4140d71aa2e71df22d555a8ef04423613985454c890926d4ff7741b0b70f3e3c2a51c580e360c1b6a9ec2bc558e1a4cd1442a5ad9697c35ed075f551800
b5b7f590726a6081a407075830e6a2b629e7e2f69a460405b2890472344545f096940173a5a3ec2865883c483fd24c29cb19afd5cfc074ff88d0a6192163c213

catalog
424442320500010004646f63730000000000000001000102030405060708090a0b0c0d0e0f01b5b7f590726a6081a407075830e6a2b629e7e2f69a460405b2890472344545f096940173a5a3ec2865883c483fd24c29cb19afd5cfc074ff88d0a6192163c213
5ec7acc134ff4101a62c3a1ecf5a259b456fc33c10da83ca9e435f3ad7c7d3bbc0645d0d3ba78d4cbaa336b0e805116b8a3216a7c95c90e6d835aa68ebc44ec3

database
4244423201101112131415161718191a1b1c1d1e1f0020000000000001015ec7acc134ff4101a62c3a1ecf5a259b456fc33c10da83ca9e435f3ad7c7d3bbc0645d0d3ba78d4cbaa336b0e805116b8a3216a7c95c90e6d835aa68ebc44ec3
956ccf999210e2745290763780edd7151bd25460df70ab59875eb2f9c30bd5cd50a45452e16f02e5b95d985caf4babdd709c13190cfb5739064c7a90f1855be2

empty
4244423201101112131415161718191a1b1c1d1e1f000000000000000000
b1652c6a4b05f13c3b451ab6ca4f4680bd0541e3427a3125c3af8330af5cfa8fc5e92faa17f11171e300d1283c6ce4b2c2bf25aa65aebb903a24202e2bfabf87

branch
424442320380010000000000000ffa11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111000000000000006422222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222
4f26b9189ac8b8af0dd491789a771fa7fe47bdc8e4b2f4135eeeb95bd6a088ab87907df2d40d236c6ceb6d3e5ae1ee47d76bb949fa4909071bac5b33fd897f27
```
