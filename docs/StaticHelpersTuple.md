# StaticHelpersTuple

## Overview

The `StaticHelpersTuple` class provides utility functions for working with block tuples. In the Owner Free Filesystem (OFF), tuples are used to store data blocks with random blocks for privacy, store parity blocks for error correction, and store CBL blocks with their metadata.

## Methods

### toBuffer

- **Purpose**: Convert data to Buffer regardless of whether it's a Readable or Buffer.
- **Parameters**:
  - `data` (Buffer | Readable): The data to convert.
- **Returns**: The data as a Buffer.
- **Example**:
  ```typescript
  const buffer = await StaticHelpersTuple.toBuffer(data);
  ```

### xorSourceToPrimeWhitened

- **Purpose**: XOR a source block with whitening and random blocks.
- **Parameters**:
  - `sourceBlock` (BaseBlock | BlockHandle): The source block.
  - `whiteners` (WhitenedBlock[]): The whitening blocks.
  - `randomBlocks` (RandomBlock[]): The random blocks.
- **Returns**: A new `WhitenedBlock` instance.
- **Example**:
  ```typescript
  const whitenedBlock = await StaticHelpersTuple.xorSourceToPrimeWhitened(
    sourceBlock,
    whiteners,
    randomBlocks,
  );
  ```

### makeTupleFromSourceXor

- **Purpose**: Create a tuple from a source block and its whitening/random blocks.
- **Parameters**:
  - `sourceBlock` (BaseBlock | BlockHandle): The source block.
  - `whiteners` (WhitenedBlock[]): The whitening blocks.
  - `randomBlocks` (RandomBlock[]): The random blocks.
- **Returns**: A new `InMemoryBlockTuple` instance.
- **Example**:
  ```typescript
  const tuple = await StaticHelpersTuple.makeTupleFromSourceXor(
    sourceBlock,
    whiteners,
    randomBlocks,
  );
  ```

### xorDestPrimeWhitenedToOwned

- **Purpose**: XOR a whitened block with its whitening blocks to recover the original data.
- **Parameters**:
  - `creator` (Member): The creator of the block.
  - `primeWhitenedBlock` (WhitenedBlock): The whitened block.
  - `whiteners` (WhitenedBlock[]): The whitening blocks.
- **Returns**: A new `OwnedDataBlock` instance.
- **Example**:
  ```typescript
  const ownedBlock = await StaticHelpersTuple.xorDestPrimeWhitenedToOwned(
    creator,
    primeWhitenedBlock,
    whiteners,
  );
  ```

### makeTupleFromDestXor

- **Purpose**: Create a tuple from a whitened block and its whitening blocks.
- **Parameters**:
  - `creator` (Member): The creator of the block.
  - `primeWhitenedBlock` (WhitenedBlock): The whitened block.
  - `whiteners` (WhitenedBlock[]): The whitening blocks.
- **Returns**: A new `InMemoryBlockTuple` instance.
- **Example**:
  ```typescript
  const tuple = await StaticHelpersTuple.makeTupleFromDestXor(
    creator,
    primeWhitenedBlock,
    whiteners,
  );
  ```

### xorPrimeWhitenedToCbl

- **Purpose**: XOR a whitened block with its whitening blocks to recover a CBL.
- **Parameters**:
  - `creator` (Member): The creator of the block.
  - `primeWhitened` (WhitenedBlock): The whitened block.
  - `whiteners` (WhitenedBlock[]): The whitening blocks.
- **Returns**: A new `ConstituentBlockListBlock` instance.
- **Example**:
  ```typescript
  const cbl = await StaticHelpersTuple.xorPrimeWhitenedToCbl(
    creator,
    primeWhitened,
    whiteners,
  );
  ```

### xorPrimeWhitenedEncryptedToCbl

- **Purpose**: XOR an encrypted whitened block with its whitening blocks and decrypt to recover a CBL.
- **Parameters**:
  - `creator` (Member): The creator of the block.
  - `primeWhitened` (WhitenedBlock): The whitened block.
  - `whiteners` (WhitenedBlock[]): The whitening blocks.
- **Returns**: A new `ConstituentBlockListBlock` instance.
- **Example**:
  ```typescript
  const cbl = await StaticHelpersTuple.xorPrimeWhitenedEncryptedToCbl(
    creator,
    primeWhitened,
    whiteners,
  );
  ```

### dataStreamToPlaintextTuplesAndCBL

- **Purpose**: Process a data stream into tuples and create a CBL.
- **Parameters**:
  - `creator` (Member): The creator of the block.
  - `blockSize` (BlockSize): The size of the block.
  - `source` (ReadStream): The data stream.
  - `sourceLength` (bigint): The length of the data stream.
  - `whitenedBlockSource` (() => WhitenedBlock | undefined): A function to get whitening blocks.
  - `randomBlockSource` (() => RandomBlock): A function to get random blocks.
  - `persistTuple` ((tuple: InMemoryBlockTuple) => Promise<void>): A function to persist tuples.
- **Returns**: A new `InMemoryBlockTuple` instance.
- **Example**:
  ```typescript
  const tuple = await StaticHelpersTuple.dataStreamToPlaintextTuplesAndCBL(
    creator,
    blockSize,
    source,
    sourceLength,
    whitenedBlockSource,
    randomBlockSource,
    persistTuple,
  );
  ```

### dataStreamToEncryptedTuplesAndCBL

- **Purpose**: Process a data stream into encrypted tuples and create an encrypted CBL.
- **Parameters**:
  - `creator` (Member): The creator of the block.
  - `blockSize` (BlockSize): The size of the block.
  - `source` (ReadStream): The data stream.
  - `sourceLength` (bigint): The length of the data stream.
  - `whitenedBlockSource` (() => WhitenedBlock | undefined): A function to get whitening blocks.
  - `randomBlockSource` (() => RandomBlock): A function to get random blocks.
  - `persistTuple` ((tuple: InMemoryBlockTuple) => Promise<void>): A function to persist tuples.
- **Returns**: A new `InMemoryBlockTuple` instance.
- **Example**:
  ```typescript
  const tuple = await StaticHelpersTuple.dataStreamToEncryptedTuplesAndCBL(
    creator,
    blockSize,
    source,
    sourceLength,
    whitenedBlockSource,
    randomBlockSource,
    persistTuple,
  );
  ```

## Conclusion

The `StaticHelpersTuple` class provides essential utilities for working with block tuples, ensuring data integrity and security in the Owner Free Filesystem.
