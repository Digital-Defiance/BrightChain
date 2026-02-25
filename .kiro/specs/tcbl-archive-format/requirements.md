# Requirements Document

## Introduction

TCBL (Tarball CBL) is a new archive/bundle block type for BrightChain that functions as a tarball-like container. It allows multiple files and data entries to be bundled into a single CBL structure. TCBL extends the existing ECBL (Encrypted CBL) infrastructure, leveraging the `contentType` field already supported by ECBLs. Like a traditional tarball, compression (bzip2) and encryption (ECIES) are applied to the whole archive rather than individual entries, keeping the design simple and consistent. This makes TCBL a flexible general-purpose container format across BrightChain — not limited to any single subsystem such as quorum proposals.

## Glossary

- **TCBL**: Tarball Constituent Block List — an archive container block type that bundles multiple file/data entries into a single CBL structure with a manifest.
- **CBL**: Constituent Block List — the base block type that stores references (addresses) to other blocks, enabling data reconstruction.
- **ECBL**: Encrypted Constituent Block List — a CBL that has been encrypted via ECIES for one or more recipients.
- **ExtendedCBL**: A CBL variant that adds file name and MIME type metadata to the base CBL header.
- **Manifest**: A table of contents embedded in the TCBL that describes all contained entries and their metadata (file name, MIME type, data length, CBL address).
- **Entry**: A single file or data item within a TCBL archive, represented by its own CBL address and associated manifest metadata.
- **ECIES**: Elliptic Curve Integrated Encryption Scheme — the asymmetric encryption system used by BrightChain for block encryption.
- **Bzip2**: A block-sorting compression algorithm used for optional whole-archive compression of a TCBL.
- **Block_Store**: The storage layer responsible for persisting and retrieving blocks, including CBL whitening operations (`storeCBLWithWhitening` / `retrieveCBL`).
- **StructuredBlockType**: An enumeration of structured block header type identifiers (second byte after the 0xBC magic prefix).
- **TID**: A generic type parameter (`TID extends PlatformID`) used throughout BrightChain for frontend/backend DTO compatibility.
- **ICBLServices**: The dependency injection interface used by CBL classes to receive checksum and CBL services without circular dependencies.
- **Manifest_Serializer**: The component responsible for serializing and deserializing the TCBL manifest to and from a binary representation.
- **TCBL_Builder**: The component responsible for constructing a TCBL from a set of input entries.
- **TCBL_Reader**: The component responsible for reading and extracting entries from an existing TCBL.

## Requirements

### Requirement 1: TCBL Block Type Registration

**User Story:** As a BrightChain developer, I want TCBL to be a recognized block type in the system, so that the block infrastructure can route, store, and validate TCBL blocks correctly.

#### Acceptance Criteria

1. THE StructuredBlockType enumeration SHALL include a `TarballCBL` entry with a unique numeric identifier.
2. THE BlockType enumeration SHALL include a `TarballConstituentBlockList` entry and an `EncryptedTarballConstituentBlockListBlock` entry with unique numeric identifiers.
3. THE EphemeralBlockTypes array SHALL include `BlockType.TarballConstituentBlockList`.
4. THE EncryptedBlockTypes array SHALL include `BlockType.EncryptedTarballConstituentBlockListBlock`.
5. THE block type translation maps SHALL include human-readable names for both TCBL block types in all supported languages.

### Requirement 2: TCBL Manifest Structure

**User Story:** As a BrightChain developer, I want a TCBL to contain a structured manifest describing all bundled entries, so that consumers can enumerate, identify, and selectively extract entries without reading the entire archive.

#### Acceptance Criteria

1. THE TCBL manifest SHALL contain a version field indicating the manifest format version.
2. THE TCBL manifest SHALL contain an ordered list of entry descriptors.
3. WHEN an entry descriptor is present, THE TCBL manifest SHALL include the entry file name, MIME type, original data length, and the CBL address referencing the entry data.
4. THE TCBL manifest SHALL include a total entry count field that equals the number of entry descriptors in the list.
5. THE TCBL manifest SHALL include a checksum of the serialized manifest data for integrity verification.

### Requirement 3: Manifest Serialization and Deserialization

**User Story:** As a BrightChain developer, I want the TCBL manifest to be reliably serialized and deserialized, so that manifest data is never corrupted or misinterpreted during storage and retrieval.

#### Acceptance Criteria

1. THE Manifest_Serializer SHALL serialize a TCBL manifest into a binary `Uint8Array` representation.
2. THE Manifest_Serializer SHALL deserialize a binary `Uint8Array` back into a TCBL manifest object.
3. FOR ALL valid TCBL manifest objects, serializing then deserializing SHALL produce an equivalent manifest object (round-trip property).
4. IF the binary data provided to the Manifest_Serializer is malformed or truncated, THEN THE Manifest_Serializer SHALL throw a descriptive error indicating the nature of the corruption.
5. THE Manifest_Serializer SHALL use a deterministic encoding so that identical manifest objects always produce identical binary output.

### Requirement 4: TCBL Construction (Building Archives)

**User Story:** As a BrightChain user, I want to bundle multiple files into a single TCBL, so that I can store and transmit related data as one unit.

#### Acceptance Criteria

1. THE TCBL_Builder SHALL accept an ordered list of entries, where each entry consists of a file name, MIME type, and data payload (`Uint8Array`).
2. THE TCBL_Builder SHALL store each entry as an individual CBL via the Block_Store and record the resulting CBL address in the manifest.
3. THE TCBL_Builder SHALL construct the manifest from all entry descriptors and serialize the manifest using the Manifest_Serializer.
4. THE TCBL_Builder SHALL assemble the complete TCBL payload (serialized manifest plus entry CBL addresses).
5. WHEN whole-archive bzip2 compression is requested, THE TCBL_Builder SHALL compress the assembled TCBL payload before storing it as a CBL.
6. WHEN whole-archive ECIES encryption is requested, THE TCBL_Builder SHALL encrypt the TCBL payload (after optional compression) using BrightChain ECIES infrastructure with the specified recipient public keys.
7. THE TCBL_Builder SHALL store the final TCBL payload as a single CBL with `StructuredBlockType.TarballCBL` in the header.
8. THE TCBL_Builder SHALL use the `TID` generic type parameter for frontend/backend DTO compatibility, consistent with existing CBL classes.
9. THE TCBL_Builder SHALL accept an `ICBLServices<TID>` parameter for dependency injection, consistent with existing CBL constructor patterns.

### Requirement 5: TCBL Reading and Extraction

**User Story:** As a BrightChain user, I want to read and extract individual entries from a TCBL, so that I can access specific files from the archive.

#### Acceptance Criteria

1. WHEN the TCBL payload is encrypted, THE TCBL_Reader SHALL decrypt the whole archive using BrightChain ECIES infrastructure before parsing.
2. WHEN the TCBL payload is compressed, THE TCBL_Reader SHALL decompress the whole archive using bzip2 after decryption (if applicable) before parsing.
3. THE TCBL_Reader SHALL parse the TCBL header and deserialize the manifest using the Manifest_Serializer.
4. THE TCBL_Reader SHALL provide a method to enumerate all entry descriptors from the manifest without extracting entry data.
5. WHEN a specific entry is requested by index or file name, THE TCBL_Reader SHALL retrieve the entry CBL data from the Block_Store using the address recorded in the manifest.
6. IF the manifest checksum does not match the computed checksum of the manifest data, THEN THE TCBL_Reader SHALL throw an integrity error.
7. IF a requested entry index or file name does not exist in the manifest, THEN THE TCBL_Reader SHALL throw a descriptive not-found error.

### Requirement 6: Transparent Detection and Polymorphic Handling

**User Story:** As a BrightChain consumer, I want to transparently detect whether a CBL is a regular CBL or a TCBL, so that my code can handle both formats seamlessly without special-casing.

#### Acceptance Criteria

1. THE TCBL header SHALL use the 0xBC magic prefix followed by the `StructuredBlockType.TarballCBL` type byte, consistent with existing structured block header conventions.
2. WHEN a block is loaded from the Block_Store, THE block detection logic SHALL identify a TCBL by inspecting the magic prefix and structured type byte.
3. THE TCBL class SHALL extend `ConstituentBlockListBlock<TID>` (or the appropriate CBL base), so that any code accepting a CBL reference can also accept a TCBL reference.
4. WHEN a consumer retrieves a CBL that is a TCBL, THE system SHALL allow the consumer to upcast the CBL to a TCBL and access manifest and entry operations.
5. WHEN a consumer retrieves a CBL that is not a TCBL, THE system SHALL continue to handle the CBL using existing CBL logic without modification.

### Requirement 7: Whole-Archive Compression and Encryption

**User Story:** As a BrightChain user, I want optional bzip2 compression and ECIES encryption applied to the entire TCBL archive (like a traditional tarball), so that the design stays simple and all entries are uniformly protected or compressed.

#### Acceptance Criteria

1. WHEN whole-archive compression is enabled, THE TCBL_Builder SHALL compress the entire assembled TCBL payload using bzip2 before storage.
2. WHEN whole-archive compression is disabled, THE TCBL_Builder SHALL store the TCBL payload uncompressed.
3. WHEN whole-archive encryption is enabled, THE TCBL_Builder SHALL encrypt the entire TCBL payload (after optional compression) using BrightChain ECIES infrastructure with the specified recipient public keys.
4. WHEN whole-archive encryption is disabled, THE TCBL_Builder SHALL store the TCBL payload in plaintext (or compressed plaintext if compression is enabled).
5. WHEN both compression and encryption are enabled, THE TCBL_Builder SHALL compress first, then encrypt (compress-then-encrypt order).
6. WHEN both compression and encryption are enabled for retrieval, THE TCBL_Reader SHALL decrypt first, then decompress (decrypt-then-decompress order).
7. FOR ALL TCBLs where compression is enabled, compressing then decompressing the archive payload SHALL produce data identical to the original payload (round-trip property).
8. FOR ALL TCBLs where encryption is enabled, encrypting then decrypting the archive payload SHALL produce data identical to the pre-encryption payload (round-trip property).
9. THE TCBL header SHALL include flags indicating whether the archive is compressed and/or encrypted, so that the TCBL_Reader knows which operations to apply during retrieval.

### Requirement 8: TCBL Storage and Retrieval

**User Story:** As a BrightChain developer, I want TCBLs to integrate with the existing block storage infrastructure, so that TCBLs can be stored, whitened, and retrieved using the same patterns as regular CBLs.

#### Acceptance Criteria

1. THE Block_Store SHALL support storing a TCBL using the existing `storeCBLWithWhitening` operation.
2. THE Block_Store SHALL support retrieving a TCBL using the existing `retrieveCBL` operation.
3. WHEN a TCBL is stored, THE Block_Store SHALL treat the TCBL data identically to any other CBL data for whitening and parity purposes.
4. WHEN a TCBL is retrieved, THE Block_Store SHALL return the raw TCBL data, allowing the TCBL_Reader to parse the manifest and entries.

### Requirement 9: Quorum Proposal Integration Point

**User Story:** As a quorum system developer, I want the proposal attachment field to accept either a regular CBL or a TCBL transparently, so that proposals can attach multi-file bundles without changes to the proposal interface.

#### Acceptance Criteria

1. THE proposal attachment CBL identifier field SHALL accept both regular CBL identifiers and TCBL identifiers without type discrimination.
2. WHEN a proposal attachment is a TCBL, THE system SHALL allow consumers to enumerate and display all contained entries from the manifest.
3. WHEN a proposal attachment is a regular CBL, THE system SHALL continue to handle the attachment using existing CBL logic.

### Requirement 10: Validation and Error Handling

**User Story:** As a BrightChain developer, I want TCBL validation to catch structural errors early, so that corrupted or malformed TCBLs are rejected before they propagate through the system.

#### Acceptance Criteria

1. THE TCBL class SHALL validate the structured block header (magic prefix and type byte) during construction.
2. THE TCBL class SHALL validate the manifest checksum during construction.
3. IF the TCBL header is missing or has an incorrect magic prefix, THEN THE TCBL class SHALL throw a typed error indicating an invalid TCBL header.
4. IF the manifest entry count does not match the actual number of entry descriptors, THEN THE TCBL class SHALL throw a typed error indicating a manifest count mismatch.
5. IF an entry file name exceeds `CBL.MAX_FILE_NAME_LENGTH` (255 characters), THEN THE TCBL_Builder SHALL throw a validation error.
6. IF an entry MIME type exceeds `CBL.MAX_MIME_TYPE_LENGTH` (127 characters), THEN THE TCBL_Builder SHALL throw a validation error.
7. IF an entry file name contains path traversal sequences, THEN THE TCBL_Builder SHALL throw a validation error.
