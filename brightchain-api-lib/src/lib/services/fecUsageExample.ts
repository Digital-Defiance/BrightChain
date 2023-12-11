import { ParityData } from '@brightchain/brightchain-lib';
import { WasmFecService } from './fec';

/**
 * Example usage of the adapted FEC service for filesystem/S3 objects
 */
export class FecUsageExample {
  private fecService = new WasmFecService();

  /**
   * Example: Create parity data for a file and store it separately
   */
  async createFileWithParity(fileData: Buffer, parityCount: number = 2) {
    // Create parity data
    const parityData = await this.fecService.createParityData(
      fileData,
      parityCount,
    );

    // In a real implementation, you would:
    // 1. Store the original file (e.g., to S3 as "file.dat")
    // 2. Store each parity data separately (e.g., "file.dat.parity.0", "file.dat.parity.1")
    // 3. Store metadata about the original file size

    return {
      originalData: fileData,
      parityData,
      originalSize: fileData.length,
    };
  }

  /**
   * Example: Recover a corrupted file using parity data
   */
  async recoverCorruptedFile(parityData: ParityData[], originalSize: number) {
    // Attempt recovery (pass null for corrupted data)
    const result = await this.fecService.recoverFileData(
      null, // corrupted data
      parityData,
      originalSize,
    );

    if (result.recovered) {
      console.log('File successfully recovered!');
      return result.data;
    } else {
      throw new Error('File recovery failed');
    }
  }

  /**
   * Example: Verify file integrity using parity data
   */
  async verifyFile(
    fileData: Buffer,
    parityData: ParityData[],
  ): Promise<boolean> {
    return await this.fecService.verifyFileIntegrity(fileData, parityData);
  }

  /**
   * Complete example workflow
   */
  async demonstrateWorkflow() {
    // Original file data
    const originalFile = Buffer.from(
      'This is important file data that needs protection!',
    );

    // Step 1: Create parity data
    console.log('Creating parity data...');
    const { parityData, originalSize } = await this.createFileWithParity(
      originalFile,
      2,
    );

    // Step 2: Verify integrity
    console.log('Verifying file integrity...');
    const isValid = await this.verifyFile(originalFile, parityData);
    console.log('File integrity check:', isValid ? 'PASSED' : 'FAILED');

    // Step 3: Simulate file corruption and recovery
    console.log('Simulating file corruption and recovery...');
    const recoveredFile = await this.recoverCorruptedFile(
      parityData,
      originalSize,
    );

    // Step 4: Verify recovery
    const recoverySuccessful = originalFile.equals(
      Buffer.isBuffer(recoveredFile)
        ? recoveredFile
        : Buffer.from(recoveredFile),
    );
    console.log('Recovery successful:', recoverySuccessful ? 'YES' : 'NO');

    return {
      originalFile,
      recoveredFile,
      parityData,
      recoverySuccessful,
    };
  }
}
