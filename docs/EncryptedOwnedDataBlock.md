# EncryptedOwnedDataBlock

## Overview

The `EncryptedOwnedDataBlock` class represents an encrypted block owned by a specific member. These blocks are always in-memory and ephemeral and should never be committed to disk. This class extends the `EncryptedBlock` class and adds specific functionalities for owned encrypted data blocks.

## Methods

### from

- **Purpose**: Creates an instance of `EncryptedOwnedDataBlock`.
- **Parameters**:
  - `type` (BlockType): The type of the block.
  - `dataType` (BlockDataType): The type of data in the block.
  - `blockSize` (BlockSize): The size of the block.
  - `data` (Buffer): The encrypted data.
  - `checksum` (ChecksumBuffer): The checksum of the data.
  - `creator` (BrightChainMember | GuidV4): The creator of the block.
  - `dateCreated` (Date): The date the block was created.
  - `lengthBeforeEncryption` (number): The actual data length before encryption.
  - `canRead` (boolean): Whether the block can be read.
  - `canPersist` (boolean): Whether the block can be persisted.
- **Returns**: A new `EncryptedOwnedDataBlock` instance.
- **Example**:
  ```typescript
  const block = await EncryptedOwnedDataBlock.from(
    BlockType.EncryptedOwnedData,
    BlockDataType.EncryptedData,
    BlockSize.Small,
    Buffer.from('encrypted data'),
    StaticHelpersChecksum.calculateChecksum(Buffer.from('encrypted data')),
    creator,
  );
  ```

### constructor

- **Purpose**: Creates an instance of `EncryptedOwnedDataBlock`.
- **Parameters**:
  - `type` (BlockType): The type of the block.
  - `dataType` (BlockDataType): The type of data in the block.
  - `blockSize` (BlockSize): The size of the block.
  - `data` (Buffer): The encrypted data.
  - `checksum` (ChecksumBuffer): The checksum of the data.
  - `dateCreated` (Date): The date the block was created.
  - `metadata` (IEncryptedBlockMetadata): The block metadata.
  - `canRead` (boolean): Whether the block can be read.
  - `canPersist` (boolean): Whether the block can be persisted.
- **Example**:
  ```typescript
  const block = new EncryptedOwnedDataBlock(
    BlockType.EncryptedOwnedData,
    BlockDataType.EncryptedData,
    BlockSize.Small,
    Buffer.from('encrypted data'),
    StaticHelpersChecksum.calculateChecksum(Buffer.from('encrypted data')),
    new Date(),
    metadata,
  );
  ```

### canEncrypt

- **Purpose**: Whether the block can be encrypted.
- **Type**: Getter.
- **Returns**: Always returns false since this block is already encrypted.
- **Example**:
  ```typescript
  console.log(block.canEncrypt);
  ```

### canDecrypt

- **Purpose**: Whether the block can be decrypted.
- **Type**: Getter.
- **Returns**: True if the block has a `BrightChainMember` creator, false otherwise.
- **Example**:
  ```typescript
  console.log(block.canDecrypt);
  ```

### encryptedLength

- **Purpose**: The length of the encrypted data.
- **Type**: Getter.
- **Returns**: The length of the encrypted data.
- **Example**:
  ```typescript
  console.log(block.encryptedLength);
  ```

### validateAsync

- **Purpose**: Override validateAsync to handle encrypted data properly.
- **Returns**: A promise that resolves when the validation is complete.
- **Example**:
  ```typescript
  await block.validateAsync();
  ```

## Conclusion

The `EncryptedOwnedDataBlock` class provides essential utilities for handling encrypted data blocks owned by specific members, ensuring data integrity and security in the Owner Free File System.
