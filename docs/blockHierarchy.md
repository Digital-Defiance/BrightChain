# Block Hierarchy for BrightChain

BrightChain has concepts for a few different block types. Blocks on disk have no inherent meaning, but at various phases of certain processes, they may have temporary meaning like whether the source is a random block or a reused block as a whitener. Ephemeral blocks in memory can have several different meanings, and should never be committed to disk.

## Core Blocks

### BaseBlock (abstract)

- Core block functionality
- Size, type, checksum
- Header/payload structure
- Basic validation

### RawDataBlock extends BaseBlock

- Simple data storage
- No encryption/metadata
- Used for basic disk storage
- Minimal overhead

## File System Blocks

### ConstituentBlockListBlock extends EphemeralBlock

- Stores block references
- Creator signature
- Block reconstruction info
- Can be persisted to disk
- Structure:
  ```
  [Base Header]
  [Creator ID]
  [Date Created]
  [Address Count]
  [Original Length]
  [Tuple Size]
  [Creator Signature]
  [Block References]
  [Padding]
  ```

### EncryptedBlock extends EphemeralBlock

- ECIES encryption header
- Encrypted payload
- Structure:
  ```
  [Base Header]
  [Public Key]
  [IV]
  [Auth Tag]
  [Encrypted Data]
  [Padding]
  ```

### EncryptedCBL extends EncryptedBlock

- Encrypted version of CBL
- Protects block references
- Structure:
  ```
  [Base Header]
  [Encryption Header]
  [Encrypted CBL Data]
  [Padding]
  ```

### MultiEncryptedConstituentBlockListBlock extends MultiEncryptedBlock

- CBL encrypted for multiple recipients
- Allows sharing block references with multiple users
- Structure:
  ```
  [Base Header]
  [Block Type (1 byte)]
  [IV (16 bytes)]
  [Auth Tag (16 bytes)]
  [Data Length (8 bytes)]
  [Recipient Count (2 bytes)]
  [Recipient IDs]
  [Encrypted Keys]
  [Encrypted CBL Data]
  [Padding]
  ```

## Design Principles

1. Minimal Inheritance

   - Each layer adds specific functionality
   - No redundant abstractions
   - Clear responsibilities

2. Clear Data Layout

   - Headers at start of block
   - Signatures before data they protect
   - Encryption wraps entire payload

3. Flexible Storage

   - All blocks can be persisted
   - No ephemeral-only blocks
   - Consistent disk format

4. Owner Free Design
   - No user-specific blocks
   - All blocks sharable
   - Encryption for privacy

## Implementation Notes

1. Remove EphemeralBlock

   - Move functionality to BaseBlock
   - All blocks support disk storage
   - Simplify inheritance chain

2. Simplify Encryption

   - Single encryption layer
   - No owned data concept
   - Encryption wraps entire payload

3. Remove ExtendedCBL

   - CBL handles all metadata
   - No separate file properties
   - Keep block structure simple

4. Consistent Headers
   - Base header first
   - Layer headers sequential
   - Signatures before data
   - Encryption header last

This structure better supports the Owner Free File System by:

- Minimizing complexity
- Ensuring consistent storage
- Supporting proper encryption
- Maintaining data integrity

# Diagrams

## Block Inheritance

```mermaid
classDiagram
    %% Base Inheritance
    BaseBlock <|-- RawDataBlock
    BaseBlock <|-- EphemeralBlock
    RawDataBlock <|-- ParityBlock
    RawDataBlock <|-- RandomBlock
    RawDataBlock <|-- WhitenedBlock
    EphemeralBlock <|-- EncryptedBlock
    EphemeralBlock <|-- ConstituentBlockListBlock
    EncryptedBlock <|-- MultiEncryptedBlock
    EncryptedBlock <|-- SingleEncryptedBlock
    EncryptedBlock <|-- MultiEncryptedBlock
    EncryptedBlock <|-- EncryptedCBL
    ConstituentBlockListBlock <|-- ExtendedCBL
    MultiEncryptedBlock <|-- MultiEncryptedConstituentBlockListBlock

    %% Encryption Capabilities
    ConstituentBlockListBlock ..> EncryptedCBL: can be encrypted as
    ConstituentBlockListBlock ..> MultiEncryptedConstituentBlockListBlock: can be multi-encrypted as
    ExtendedCBL ..> EncryptedCBL: can be encrypted as
    RawDataBlock ..> EncryptedBlock: can be encrypted as

    class BaseBlock {
        +blockSize: BlockSize
        +blockType: BlockType
        +blockDataType: BlockDataType
        +idChecksum: ChecksumBuffer
        +layerHeaderData: Buffer
        +validateSync()
    }

    class RawDataBlock {
        +data: Buffer
        +payload: Buffer
        +overhead: 0 bytes
    }

    class EphemeralBlock {
        +encrypted: boolean
        +canEncrypt: boolean
        +canDecrypt: boolean
    }

    class EncryptedBlock {
        +ephemeralPublicKey: Buffer[65]
        +iv: Buffer[16]
        +authTag: Buffer[16]
        +overhead: 98 bytes
    }

    class ConstituentBlockListBlock {
        +creatorId: GuidV4
        +dateCreated: Date
        +addressCount: number
        +signature: Buffer
        +overhead: 170 bytes
    }

    class ExtendedCBL {
        +fileName: string
        +mimeType: string
        +overhead: varies
    }

    class MultiEncryptedBlock {
        +recipients: Member[]
        +encryptedKeys: Buffer[]
        +overhead: varies
    }

    class MultiEncryptedConstituentBlockListBlock {
        +encrypted CBL data
        +multiple recipients
        +overhead: varies
    }

    class ParityBlock {
        +FEC data
        +overhead: 0 bytes
    }

    class RandomBlock {
        +random data
        +overhead: 0 bytes
    }

    class WhitenedBlock {
        +whiteningData: Buffer
        +overhead: 0 bytes
    }

    class EncryptedCBL {
        +encrypted CBL data
        +overhead: 98 + 170 bytes
    }

    %% Note
    note for EncryptedBlock "Any block can be encrypted for privacy and security"
```

## Block Overhead

```mermaid
flowchart TD
    subgraph Any Block
        subgraph Encryption [+98 bytes when encrypted]
            subgraph MultiEncryption [+varies for multi-encrypted]
                subgraph Specific Block Header
                    subgraph Content
                        payload["Payload Data"]
                    end

                    class payload default

                    RawData["RawDataBlock<br>+0 bytes"]
                    CBL["ConstituentBlockListBlock<br>+102 bytes"]
                    ECBL["ExtendedCBL<br>+512 bytes"]
                end
            end
        end
    end

    classDef default fill:#f5f5f5,stroke:#333,color:#000
    classDef header fill:#d5f5e3,stroke:#196f3d,color:#000
    classDef encrypt fill:#fdebd0,stroke:#9c640c,color:#000
    classDef multiencrypt fill:#d6eaf8,stroke:#2874a6,color:#000

    class RawData,CBL,ECBL header
    class Encryption encrypt
    class MultiEncryption multiencrypt
```
