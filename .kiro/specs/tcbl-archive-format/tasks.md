# Tasks: TCBL Archive Format

## Task 1: Block Type Registration and Enumerations

- [ ] 1. Register TCBL block types in the type system
  - [ ] 1.1 Add `TarballCBL = 0x07` to `StructuredBlockType` enum in `brightchain-lib/src/lib/constants.ts` (Req 1.1)
  - [ ] 1.2 Add `TarballConstituentBlockList = 23` and `EncryptedTarballConstituentBlockListBlock = 35` to `BlockType` enum in `brightchain-lib/src/lib/enumerations/blockType.ts` (Req 1.2)
  - [ ] 1.3 Add `BlockType.TarballConstituentBlockList` to the `EphemeralBlockTypes` array (Req 1.3)
  - [ ] 1.4 Add `BlockType.EncryptedTarballConstituentBlockListBlock` to the `EncryptedBlockTypes` array (Req 1.4)

## Task 2: Block Type Translations

- [ ] 2. Add human-readable names for TCBL block types
  - [ ] 2.1 Add translations for `BlockType.TarballConstituentBlockList` and `BlockType.EncryptedTarballConstituentBlockListBlock` to all language entries in `brightchain-lib/src/lib/enumeration-translations/blockType.ts` (Req 1.5)

## Task 3: TCBL Error Types

- [ ] 3. Create TCBL-specific error types
  - [ ] 3.1 Create `TcblErrorType` enum in `brightchain-lib/src/lib/enumerations/tcblErrorType.ts` — include: `InvalidHeader`, `ManifestChecksumMismatch`, `ManifestCountMismatch`, `ManifestCorrupted`, `ManifestTruncated`, `EntryNotFound`, `FileNameTooLong`, `MimeTypeTooLong`, `PathTraversal`, `DecompressionFailed`, `DecryptionFailed`, `InvalidManifestVersion` (Req 10, 11)
  - [ ] 3.2 Create `TcblError` class extending `Error` in `brightchain-lib/src/lib/errors/tcblError.ts` with `errorType: TcblErrorType` and optional `details` map (Req 10)
  - [ ] 3.3 Export new error types from `brightchain-lib/src/lib/errors/index.ts` and `brightchain-lib/src/lib/enumerations/index.ts`

## Task 4: TCBL Manifest Interfaces

- [ ] 4. Define manifest data model interfaces
  - [ ] 4.1 Create `ITcblEntryDescriptor` interface in `brightchain-lib/src/lib/interfaces/tcbl/tcblEntryDescriptor.ts` — fields: `fileName: string`, `mimeType: string`, `originalDataLength: number`, `cblAddress: Checksum` (Req 2.3)
  - [ ] 4.2 Create `ITcblManifest` interface in `brightchain-lib/src/lib/interfaces/tcbl/tcblManifest.ts` — fields: `version: number`, `entryCount: number`, `entries: ITcblEntryDescriptor[]`, `checksum: Checksum` (Req 2.1, 2.2, 2.4, 2.5)
  - [ ] 4.3 Create `ITcblArchiveOptions` interface in `brightchain-lib/src/lib/interfaces/tcbl/tcblArchiveOptions.ts` — fields: `compress?: boolean`, `encrypt?: boolean`, `recipientPublicKeys?: Uint8Array[]` (Req 7)
  - [ ] 4.4 Create `ITcblEntryInput` interface in `brightchain-lib/src/lib/interfaces/tcbl/tcblEntryInput.ts` — fields: `fileName: string`, `mimeType: string`, `data: Uint8Array` (Req 4.1)
  - [ ] 4.5 Create barrel export at `brightchain-lib/src/lib/interfaces/tcbl/index.ts` and add to `brightchain-lib/src/lib/interfaces/index.ts`

## Checkpoint A: Types & Enumerations Build Verification

- [ ] A. Verify all new enums, error types, and interfaces compile and lint cleanly
  - [ ] A.1 Run `NX_TUI=false npx nx run brightchain-lib:build --outputStyle=stream` — fix any compilation errors
  - [ ] A.2 Run `NX_TUI=false npx nx run brightchain-lib:lint --outputStyle=stream` — fix any lint violations
  - [ ] A.3 Run `NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream` — verify no regressions from enum/type additions

## Task 5: Manifest Serializer

- [ ] 5. Implement deterministic manifest serialization and deserialization
  - [ ] 5.1 Create `TcblManifestSerializer` class in `brightchain-lib/src/lib/blocks/tcbl/manifestSerializer.ts` (Req 3)
  - [ ] 5.2 Implement `serialize(manifest: ITcblManifest): Uint8Array` — deterministic binary encoding: version (uint16), entryCount (uint32), then for each entry: fileNameLength (uint16) + fileName (utf-8), mimeTypeLength (uint8) + mimeType (utf-8), originalDataLength (uint48/bigint), cblAddress (fixed-size checksum bytes) (Req 3.1, 3.5)
  - [ ] 5.3 Implement `deserialize(data: Uint8Array): ITcblManifest` — parse binary format back to manifest object, throw `TcblError(ManifestCorrupted)` or `TcblError(ManifestTruncated)` on malformed input (Req 3.2, 3.4)
  - [ ] 5.4 Implement manifest checksum computation using `ICBLChecksumService.calculateChecksum()` on the serialized entry data (before appending the checksum itself) (Req 2.5)
  - [ ] 5.5 Write unit tests for round-trip serialization, deterministic output, and error cases (Req 3.3, 3.4)

## Task 6: Input Validation

- [ ] 6. Implement TCBL input validation utilities
  - [ ] 6.1 Create `TcblValidator` class in `brightchain-lib/src/lib/blocks/tcbl/tcblValidator.ts` (Req 10)
  - [ ] 6.2 Implement `validateFileName(name: string)` — reject names exceeding 255 chars or containing path traversal sequences (`../`, `..\\`, leading `/` or `\\`) (Req 10.5, 10.7)
  - [ ] 6.3 Implement `validateMimeType(mimeType: string)` — reject MIME types exceeding 127 chars (Req 10.6)
  - [ ] 6.4 Implement `validateEntryInputs(entries: ITcblEntryInput[])` — validate all entries, throw `TcblError` on first violation (Req 10.5, 10.6, 10.7)
  - [ ] 6.5 Write unit tests for validation edge cases (empty names, boundary lengths, traversal patterns)

## Checkpoint B: Serializer & Validation Build Verification

- [ ] B. Verify manifest serializer and validator compile, lint, and pass tests
  - [ ] B.1 Run `NX_TUI=false npx nx run brightchain-lib:build --outputStyle=stream`
  - [ ] B.2 Run `NX_TUI=false npx nx run brightchain-lib:lint --outputStyle=stream`
  - [ ] B.3 Run `NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream`

## Task 7: TCBL Block Class

- [ ] 7. Implement the TarballConstituentBlockListBlock class
  - [ ] 7.1 Create `TarballConstituentBlockListBlock<TID>` class extending `ConstituentBlockListBlock<TID>` in `brightchain-lib/src/lib/blocks/tcbl/tcbl.ts` (Req 6.3)
  - [ ] 7.2 Constructor: accept `data`, `creator`, optional `blockSize`, optional `ICBLServices<TID>` — call `super()`, then validate structured block header (magic prefix + `StructuredBlockType.TarballCBL` type byte) (Req 6.1, 10.1)
  - [ ] 7.3 Parse and cache the compression/encryption flags from the TCBL header (Req 7.9)
  - [ ] 7.4 Implement `get manifest(): ITcblManifest` — lazily deserialize and cache the manifest from the payload using `TcblManifestSerializer`, validate manifest checksum on first access (Req 2, 10.2)
  - [ ] 7.5 Implement `get entries(): ITcblEntryDescriptor[]` — return manifest entry descriptors (Req 5.4)
  - [ ] 7.6 Implement `get isCompressed(): boolean` and `get isEncrypted(): boolean` accessors (Req 7.9)
  - [ ] 7.7 Override `validateSync()` and `validateAsync()` to include manifest count validation (Req 10.4)
  - [ ] 7.8 Export from `brightchain-lib/src/lib/blocks/tcbl/index.ts` and add `export * from './tcbl'` to `brightchain-lib/src/lib/blocks/index.ts`

## Task 8: TCBL Builder

- [ ] 8. Implement the TCBL archive construction workflow
  - [ ] 8.1 Create `TcblBuilder<TID>` class in `brightchain-lib/src/lib/blocks/tcbl/tcblBuilder.ts` (Req 4)
  - [ ] 8.2 Constructor: accept `creator: Member<TID>`, `blockSize: BlockSize`, `blockStore: IBlockStore`, optional `ICBLServices<TID>`, optional `ITcblArchiveOptions` (Req 4.8, 4.9)
  - [ ] 8.3 Implement `addEntry(input: ITcblEntryInput)` — validate input via `TcblValidator`, store entry data as individual CBL via block store, collect CBL address for manifest (Req 4.1, 4.2)
  - [ ] 8.4 Implement `async build(): Promise<TarballConstituentBlockListBlock<TID>>` — construct manifest from collected entries, serialize via `TcblManifestSerializer`, assemble TCBL payload (header + serialized manifest + CBL address list) (Req 4.3, 4.4)
  - [ ] 8.5 In `build()`: if `compress` option is set, bzip2-compress the assembled payload (Req 4.5, 7.1, 7.5)
  - [ ] 8.6 In `build()`: if `encrypt` option is set, ECIES-encrypt the payload (after optional compression) using `BlockECIES.encrypt()` with recipient public keys (Req 4.6, 7.3, 7.5)
  - [ ] 8.7 In `build()`: store final payload as CBL with `StructuredBlockType.TarballCBL` header, set compression/encryption flags in header (Req 4.7, 7.9)
  - [ ] 8.8 Write unit tests for builder: empty archive, single entry, multiple entries, with compression, with encryption, with both (Req 7.7, 7.8)

## Task 9: TCBL Reader

- [ ] 9. Implement the TCBL archive reading and extraction workflow
  - [ ] 9.1 Create `TcblReader<TID>` class in `brightchain-lib/src/lib/blocks/tcbl/tcblReader.ts` (Req 5)
  - [ ] 9.2 Constructor: accept a `TarballConstituentBlockListBlock<TID>` and `blockStore: IBlockStore`, optional private key for decryption
  - [ ] 9.3 Implement `async open()` — if encrypted, decrypt whole payload via `BlockECIES.decrypt()`; if compressed, decompress whole payload via bzip2; then parse manifest (Req 5.1, 5.2, 5.3, 7.6)
  - [ ] 9.4 Implement `listEntries(): ITcblEntryDescriptor[]` — return manifest entries without extracting data (Req 5.4)
  - [ ] 9.5 Implement `async getEntryByIndex(index: number): Promise<Uint8Array>` — retrieve entry CBL data from block store, throw `TcblError(EntryNotFound)` if out of range (Req 5.5, 5.7)
  - [ ] 9.6 Implement `async getEntryByName(fileName: string): Promise<Uint8Array>` — find entry by file name in manifest, retrieve CBL data, throw `TcblError(EntryNotFound)` if not found (Req 5.5, 5.7)
  - [ ] 9.7 Validate manifest checksum during `open()`, throw `TcblError(ManifestChecksumMismatch)` on failure (Req 5.6)
  - [ ] 9.8 Write unit tests for reader: list entries, get by index, get by name, checksum mismatch, not-found errors, encrypted archive, compressed archive (Req 7.7, 7.8)

## Checkpoint C: Core TCBL Classes Build Verification

- [ ] C. Verify TCBL block class, builder, and reader compile, lint, and pass tests
  - [ ] C.1 Run `NX_TUI=false npx nx run brightchain-lib:build --outputStyle=stream`
  - [ ] C.2 Run `NX_TUI=false npx nx run brightchain-lib:lint --outputStyle=stream`
  - [ ] C.3 Run `NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream`

## Task 10: Transparent Detection and Polymorphic Handling

- [ ] 10. Add TCBL detection to block loading infrastructure
  - [ ] 10.1 Update block type detection logic (wherever blocks are instantiated from raw data) to recognize `StructuredBlockType.TarballCBL` and instantiate `TarballConstituentBlockListBlock` (Req 6.2)
  - [ ] 10.2 Add `isTcbl(block: ConstituentBlockListBlock): block is TarballConstituentBlockListBlock` type guard function in `brightchain-lib/src/lib/blocks/tcbl/tcbl.ts` (Req 6.4)
  - [ ] 10.3 Ensure existing CBL consumers continue to work unchanged when receiving a TCBL (polymorphic via inheritance) (Req 6.5)
  - [ ] 10.4 Write unit tests: detect TCBL from raw data, type guard returns true/false correctly, CBL consumer accepts TCBL transparently

## Task 11: Storage Integration

- [ ] 11. Verify TCBL works with existing block store operations
  - [ ] 11.1 Verify `storeCBLWithWhitening` accepts TCBL data without modification (Req 8.1, 8.3)
  - [ ] 11.2 Verify `retrieveCBL` returns TCBL data that can be parsed by `TcblReader` (Req 8.2, 8.4)
  - [ ] 11.3 Write integration tests: store a TCBL via whitening, retrieve it, parse manifest, extract entries

## Checkpoint D: Detection & Storage Build Verification

- [ ] D. Verify detection, storage integration compile, lint, and pass tests
  - [ ] D.1 Run `NX_TUI=false npx nx run brightchain-lib:build --outputStyle=stream`
  - [ ] D.2 Run `NX_TUI=false npx nx run brightchain-lib:lint --outputStyle=stream`
  - [ ] D.3 Run `NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream`

## Task 12: Quorum Proposal Integration Point

- [ ] 12. Ensure proposal attachment field accepts TCBL transparently
  - [ ] 12.1 Verify `Proposal.attachmentCblId` (from quorum-bootstrap-redesign spec) accepts both CBL and TCBL identifiers without type discrimination — the field is a `Checksum` so no code change needed, just document the contract (Req 9.1)
  - [ ] 12.2 Add utility function `async enumerateAttachmentEntries(attachmentCblId, blockStore)` that detects TCBL and returns entry list, or returns single-entry list for plain CBL (Req 9.2, 9.3)
  - [ ] 12.3 Write unit tests for the utility: TCBL attachment returns all entries, plain CBL attachment returns single entry

## Task 13: End-to-End Round-Trip Tests

- [ ] 13. Write comprehensive round-trip and integration tests
  - [ ] 13.1 Test: build TCBL with multiple entries → store → retrieve → read → extract all entries → verify data matches originals
  - [ ] 13.2 Test: build TCBL with bzip2 compression → store → retrieve → decompress → verify round-trip (Req 7.7)
  - [ ] 13.3 Test: build TCBL with ECIES encryption → store → retrieve → decrypt → verify round-trip (Req 7.8)
  - [ ] 13.4 Test: build TCBL with compression + encryption → store → retrieve → decrypt → decompress → verify round-trip (Req 7.5, 7.6)
  - [ ] 13.5 Test: manifest serialization round-trip property across varied entry counts and metadata (Req 3.3)

## Checkpoint E: Full Test Suite Verification

- [ ] E. Verify all TCBL tests pass end-to-end
  - [ ] E.1 Run `NX_TUI=false npx nx run brightchain-lib:build --outputStyle=stream`
  - [ ] E.2 Run `NX_TUI=false npx nx run brightchain-lib:lint --outputStyle=stream`
  - [ ] E.3 Run `NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream`

## Task 14: Barrel Exports and Documentation

- [ ] 14. Finalize exports and update documentation
  - [ ] 14.1 Verify all new TCBL types, classes, and utilities are exported from `brightchain-lib/src/lib/blocks/index.ts` and `brightchain-lib/src/lib/index.ts`
  - [ ] 14.2 Ensure all public APIs have JSDoc comments with `@typeParam TID` documentation
  - [ ] 14.3 Update README or relevant docs to describe the TCBL archive format, usage examples for `TcblBuilder` and `TcblReader`

## Checkpoint F: Final Build Verification

- [ ] F. Final clean build, lint, and full test pass
  - [ ] F.1 Run `NX_TUI=false npx nx run brightchain-lib:build --outputStyle=stream`
  - [ ] F.2 Run `NX_TUI=false npx nx run brightchain-lib:lint --outputStyle=stream`
  - [ ] F.3 Run `NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream`
