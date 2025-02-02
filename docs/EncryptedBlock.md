# EncryptedBlock

## Overview

The `EncryptedBlock` class represents an encrypted block. It extends the `EphemeralBlock` class and adds encryption-specific header data and overhead calculations. This class is used to handle encrypted data blocks in the Owner Free File System.

## Methods

### from

- **Purpose**: Creates an instance of `EncryptedBlock`.
- **Parameters**:
  - `type` (BlockType): The type of the block.
  - `dataType` (BlockDataType): The type of data in the block.
  - `blockSize` (BlockSize): The size of the block.
  - `data` (Buffer): The encrypted data.
  - `checksum` (ChecksumBuffer): The checksum of the data.
  - `creator` (BrightChainMember | GuidV4): The creator of the block.
  - `dateCreated` (Date): The date the block was created.
  - `actualDataLength` (number): The actual data length before encryption.
  - `canRead` (boolean): Whether the block can be read.
  - `canPersist` (boolean): Whether the block can be persisted.
- **Returns**: A new `EncryptedBlock` instance.
- **Example**:
  ```typescript
  const block = await EncryptedBlock.from(
    BlockType.Encrypted,
    BlockDataType.EncryptedData,
    BlockSize.Small,
    Buffer.from('encrypted data'),
    StaticHelpersChecksum.calculateChecksum(Buffer.from('encrypted data')),
    creator,
  );
  ```

### constructor

- **Purpose**: Creates an instance of `EncryptedBlock`.
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
  const block = new EncryptedBlock(
    BlockType.Encrypted,
    BlockDataType.EncryptedData,
    BlockSize.Small,
    Buffer.from('encrypted data'),
    StaticHelpersChecksum.calculateChecksum(Buffer.from('encrypted data')),
    new Date(),
    metadata,
  );
  ```

### ephemeralPublicKey

- **Purpose**: The ephemeral public key used to encrypt the data.
- **Type**: Getter.
- **Returns**: The ephemeral public key.
- **Example**:
  ```typescript
  console.log(block.ephemeralPublicKey);
  ```

### iv

- **Purpose**: The initialization vector used to encrypt the data.
- **Type**: Getter.
- **Returns**: The initialization vector.
- **Example**:
  ```typescript
  console.log(block.iv);
  ```

### authTag

- **Purpose**: The authentication tag used to encrypt the data.
- **Type**: Getter.
- **Returns**: The authentication tag.
- **Example**:
  ```typescript
  console.log(block.authTag);
  ```

### totalOverhead

- **Purpose**: The total overhead of the block, including encryption overhead.
- **Type**: Getter.
- **Returns**: The total overhead.
- **Example**:
  ```typescript
  console.log(block.totalOverhead);
  ```

### layerHeaderData

- **Purpose**: Get this layer's header data (encryption metadata).
- **Type**: Getter.
- **Returns**: This layer's header data.
- **Example**:
  ```typescript
  console.log(block.layerHeaderData);
  ```

### payload

- **Purpose**: Get the encrypted payload data (excluding the encryption header).
- **Type**: Getter.
- **Returns**: The encrypted payload data.
- **Example**:
  ```typescript
  console.log(block.payload);
  ```

### payloadLength

- **Purpose**: Get the length of the payload.
- **Type**: Getter.
- **Returns**: The length of the payload.
- **Example**:
  ```typescript
  console.log(block.payloadLength);
  ```

### capacity

- **Purpose**: Get the usable capacity after accounting for overhead.
- **Type**: Getter.
- **Returns**: The usable capacity.
- **Example**:
  ```typescript
  console.log(block.capacity);
  ```

### validateAsync

- **Purpose**: Override validateAsync to handle encrypted data properly.
- **Returns**: A promise that resolves when the validation is complete.
- **Example**:
  ```typescript
  await block.validateAsync();
  ```

## Conclusion

The `EncryptedBlock` class provides essential utilities for handling encrypted data blocks in the Owner Free File System, ensuring data integrity and security through encryption-specific header data and overhead calculations.
