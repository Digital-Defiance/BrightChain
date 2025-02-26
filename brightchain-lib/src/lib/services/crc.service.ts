import { crc16ccitt, crc32, crc8 } from 'crc';
import { Readable } from 'stream';

export class CrcService {
  /**
   * Perform a CRC8 checksum on the data
   * @param data - The data to checksum
   * @returns The CRC8 checksum as a Buffer
   */
  public static crc8(data: Buffer): Buffer {
    const crc8buf = Buffer.alloc(1);
    const crc8value = crc8(data);
    crc8buf.writeUInt8(crc8value);
    return crc8buf;
  }
  /**
   * Calculates the CRC8 of a buffer or readable stream
   * @param input - The buffer or readable stream to calculate the CRC8 of
   * @returns The CRC8 as a Buffer
   */
  public static async crc8Async(input: Buffer | Readable): Promise<Buffer> {
    if (Buffer.isBuffer(input)) {
      return Promise.resolve(CrcService.crc8(input));
    }

    return new Promise((resolve, reject) => {
      let crc8value = crc8(Buffer.alloc(0)); // Initialize with empty buffer

      input.on('data', (chunk: Buffer) => {
        const tempBuf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        crc8value = crc8(tempBuf, crc8value);
      });

      input.on('end', () => {
        const crc8buf = Buffer.alloc(1);
        crc8buf.writeUInt8(crc8value);
        resolve(crc8buf);
      });

      input.on('error', (error) => {
        reject(error);
      });
    });
  }
  /**
   * Verify a CRC8 checksum on the data
   * @param data - The data to verify
   * @param expectedCrc - The expected CRC8 checksum
   * @returns True if the checksum matches, false otherwise
   */
  public static verifyCrc8(
    data: Buffer,
    expectedCrc: Buffer | number,
  ): boolean {
    const crc8value = crc8(data);
    if (typeof expectedCrc === 'number') {
      return crc8value === expectedCrc;
    } else {
      const expectedCrc8 = expectedCrc.readUInt8();
      return crc8value === expectedCrc8;
    }
  }
  /**
   * Validates a CRC8 against a buffer or readable stream
   * @param data The data to validate
   * @param expectedCrc8 The CRC8 to validate against
   * @returns True if the CRC8 is valid, false otherwise
   */
  public static async verifyCrc8Async(
    data: Buffer | Readable,
    expectedCrc8: Buffer,
  ): Promise<boolean> {
    const calculatedCrc8 = await CrcService.crc8Async(data);
    return calculatedCrc8.equals(expectedCrc8);
  }
  /**
   * Perform a CRC16 checksum on the data
   * @param data - The data to checksum
   * @returns The CRC16 checksum as a Buffer
   */
  public static crc16(data: Buffer): Buffer {
    const crc16buf = Buffer.alloc(2);
    const crc16value = crc16ccitt(data); // For CRC16-CCITT-FALSE
    crc16buf.writeUInt16BE(crc16value);
    return crc16buf;
  }
  /**
   * Calculates the CRC16 of a buffer or readable stream
   * @param input - The buffer or readable stream to calculate the CRC16 of
   * @returns The CRC16 as a Buffer
   */
  public static async crc16Async(input: Buffer | Readable): Promise<Buffer> {
    if (Buffer.isBuffer(input)) {
      return Promise.resolve(CrcService.crc16(input));
    }

    return new Promise((resolve, reject) => {
      let crc16value = crc16ccitt(Buffer.alloc(0)); // Initialize with empty buffer

      input.on('data', (chunk: Buffer) => {
        const tempBuf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        crc16value = crc16ccitt(tempBuf, crc16value);
      });

      input.on('end', () => {
        const crc16buf = Buffer.alloc(2);
        crc16buf.writeUInt16BE(crc16value);
        resolve(crc16buf);
      });

      input.on('error', (error) => {
        reject(error);
      });
    });
  }
  /**
   * Verify a CRC16 checksum on the data
   * @param data - The data to verify
   * @param expectedCrc - The expected CRC16 checksum
   * @returns True if the checksum matches, false otherwise
   */
  public static verifyCrc16(
    data: Buffer,
    expectedCrc: Buffer | number,
  ): boolean {
    const crc16value = crc16ccitt(data); // For CRC16-CCITT-FALSE
    if (typeof expectedCrc === 'number') {
      return crc16value === expectedCrc;
    } else {
      const expectedCrc16 = expectedCrc.readUInt16BE();
      return crc16value === expectedCrc16;
    }
  }
  /**
   * Validates a CRC16 against a buffer or readable stream
   * @param data The data to validate
   * @param expectedCrc16 The CRC16 to validate against
   * @returns True if the CRC16 is valid, false otherwise
   */
  public static async verifyCrc16Async(
    data: Buffer | Readable,
    expectedCrc16: Buffer,
  ): Promise<boolean> {
    const calculatedCrc16 = await CrcService.crc16Async(data);
    return calculatedCrc16.equals(expectedCrc16);
  }
  /**
   * Perform a CRC32 checksum on the data
   * @param data - The data to checksum
   * @returns The CRC32 checksum as a Buffer
   */
  public static crc32(data: Buffer): Buffer {
    const crc32value = crc32(data);
    const crc32buf = Buffer.alloc(4);
    crc32buf.writeUInt32BE(crc32value);
    return crc32buf;
  }
  /**
   * Calculates the CRC32 of a buffer or readable stream
   * @param input - The buffer or readable stream to calculate the CRC32 of
   * @returns The CRC32 as a number
   */
  /**
   * Calculates the CRC32 of a buffer or readable stream
   * @param input - The buffer or readable stream to calculate the CRC32 of
   * @returns The CRC32 as a Buffer
   */
  public static async crc32Async(input: Buffer | Readable): Promise<Buffer> {
    if (Buffer.isBuffer(input)) {
      return Promise.resolve(CrcService.crc32(input));
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      input.on('data', (chunk: Buffer) => {
        const tempBuf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(tempBuf);
      });

      input.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        resolve(CrcService.crc32(fullBuffer));
      });

      input.on('error', (error) => {
        reject(error);
      });
    });
  }
  /**
   * Verify a CRC32 checksum on the data
   * @param data - The data to verify
   * @param expectedCrc - The expected CRC32 checksum
   * @returns True if the checksum matches, false otherwise
   */
  public static verifyCrc32(
    data: Buffer,
    expectedCrc: Buffer | number,
  ): boolean {
    const crc32value = crc32(data);
    if (typeof expectedCrc === 'number') {
      return crc32value === expectedCrc;
    } else {
      const expectedCrc32 = expectedCrc.readUInt32BE();
      return crc32value === expectedCrc32;
    }
  }
  /**
   * Validates a CRC32 against a buffer or readable stream
   * @param data The data to validate
   * @param expectedCrc32 The CRC32 to validate against
   * @returns True if the CRC32 is valid, false otherwise
   */
  public static async verifyCrc32Async(
    data: Buffer | Readable,
    expectedCrc32: Buffer,
  ): Promise<boolean> {
    const calculatedCrc32 = await CrcService.crc32Async(data);
    return calculatedCrc32.equals(expectedCrc32);
  }
}
