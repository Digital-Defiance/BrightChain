# StaticHelpersCRC

## Overview

The `StaticHelpersCRC` class provides static helper functions for CRC (Cyclic Redundancy Check) calculations. It includes methods for CRC8, CRC16, and CRC32 checksums, both synchronous and asynchronous.

## Methods

### crc8

- **Purpose**: Perform a CRC8 checksum on the data.
- **Parameters**:
  - `data` (Buffer): The data to checksum.
- **Returns**: The CRC8 checksum as a Buffer.
- **Example**:
  ```typescript
  const data = Buffer.from('hello world');
  const crc8Checksum = StaticHelpersCRC.crc8(data);
  ```

### crc8Async

- **Purpose**: Calculates the CRC8 of a buffer or readable stream.
- **Parameters**:
  - `input` (Buffer | Readable): The buffer or readable stream to calculate the CRC8 of.
- **Returns**: The CRC8 as a Buffer.
- **Example**:
  ```typescript
  const data = Buffer.from('hello world');
  const crc8Checksum = await StaticHelpersCRC.crc8Async(data);
  ```

### verifyCrc8

- **Purpose**: Verify a CRC8 checksum on the data.
- **Parameters**:
  - `data` (Buffer): The data to verify.
  - `expectedCrc` (Buffer | number): The expected CRC8 checksum.
- **Returns**: True if the checksum matches, false otherwise.
- **Example**:
  ```typescript
  const data = Buffer.from('hello world');
  const crc8Checksum = StaticHelpersCRC.crc8(data);
  const isValid = StaticHelpersCRC.verifyCrc8(data, crc8Checksum);
  ```

### verifyCrc8Async

- **Purpose**: Validates a CRC8 against a buffer or readable stream.
- **Parameters**:
  - `data` (Buffer | Readable): The data to validate.
  - `expectedCrc8` (Buffer): The CRC8 to validate against.
- **Returns**: True if the CRC8 is valid, false otherwise.
- **Example**:
  ```typescript
  const data = Buffer.from('hello world');
  const crc8Checksum = await StaticHelpersCRC.crc8Async(data);
  const isValid = await StaticHelpersCRC.verifyCrc8Async(data, crc8Checksum);
  ```

### crc16

- **Purpose**: Perform a CRC16 checksum on the data.
- **Parameters**:
  - `data` (Buffer): The data to checksum.
- **Returns**: The CRC16 checksum as a Buffer.
- **Example**:
  ```typescript
  const data = Buffer.from('hello world');
  const crc16Checksum = StaticHelpersCRC.crc16(data);
  ```

### crc16Async

- **Purpose**: Calculates the CRC16 of a buffer or readable stream.
- **Parameters**:
  - `input` (Buffer | Readable): The buffer or readable stream to calculate the CRC16 of.
- **Returns**: The CRC16 as a Buffer.
- **Example**:
  ```typescript
  const data = Buffer.from('hello world');
  const crc16Checksum = await StaticHelpersCRC.crc16Async(data);
  ```

### verifyCrc16

- **Purpose**: Verify a CRC16 checksum on the data.
- **Parameters**:
  - `data` (Buffer): The data to verify.
  - `expectedCrc` (Buffer | number): The expected CRC16 checksum.
- **Returns**: True if the checksum matches, false otherwise.
- **Example**:
  ```typescript
  const data = Buffer.from('hello world');
  const crc16Checksum = StaticHelpersCRC.crc16(data);
  const isValid = StaticHelpersCRC.verifyCrc16(data, crc16Checksum);
  ```

### verifyCrc16Async

- **Purpose**: Validates a CRC16 against a buffer or readable stream.
- **Parameters**:
  - `data` (Buffer | Readable): The data to validate.
  - `expectedCrc16` (Buffer): The CRC16 to validate against.
- **Returns**: True if the CRC16 is valid, false otherwise.
- **Example**:
  ```typescript
  const data = Buffer.from('hello world');
  const crc16Checksum = await StaticHelpersCRC.crc16Async(data);
  const isValid = await StaticHelpersCRC.verifyCrc16Async(data, crc16Checksum);
  ```

### crc32

- **Purpose**: Perform a CRC32 checksum on the data.
- **Parameters**:
  - `data` (Buffer): The data to checksum.
- **Returns**: The CRC32 checksum as a Buffer.
- **Example**:
  ```typescript
  const data = Buffer.from('hello world');
  const crc32Checksum = StaticHelpersCRC.crc32(data);
  ```

### crc32Async

- **Purpose**: Calculates the CRC32 of a buffer or readable stream.
- **Parameters**:
  - `input` (Buffer | Readable): The buffer or readable stream to calculate the CRC32 of.
- **Returns**: The CRC32 as a Buffer.
- **Example**:
  ```typescript
  const data = Buffer.from('hello world');
  const crc32Checksum = await StaticHelpersCRC.crc32Async(data);
  ```

### verifyCrc32

- **Purpose**: Verify a CRC32 checksum on the data.
- **Parameters**:
  - `data` (Buffer): The data to verify.
  - `expectedCrc` (Buffer | number): The expected CRC32 checksum.
- **Returns**: True if the checksum matches, false otherwise.
- **Example**:
  ```typescript
  const data = Buffer.from('hello world');
  const crc32Checksum = StaticHelpersCRC.crc32(data);
  const isValid = StaticHelpersCRC.verifyCrc32(data, crc32Checksum);
  ```

### verifyCrc32Async

- **Purpose**: Validates a CRC32 against a buffer or readable stream.
- **Parameters**:
  - `data` (Buffer | Readable): The data to validate.
  - `expectedCrc32` (Buffer): The CRC32 to validate against.
- **Returns**: True if the CRC32 is valid, false otherwise.
- **Example**:
  ```typescript
  const data = Buffer.from('hello world');
  const crc32Checksum = await StaticHelpersCRC.crc32Async(data);
  const isValid = await StaticHelpersCRC.verifyCrc32Async(data, crc32Checksum);
  ```

## Conclusion

The `StaticHelpersCRC` class provides essential utilities for CRC checksum calculations, ensuring data integrity and reliability in various applications.
