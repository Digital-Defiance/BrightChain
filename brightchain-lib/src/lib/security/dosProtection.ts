/**
 * DoS protection limits
 */
export interface DosLimits {
  maxInputSize: number;
  maxOperationTime: number;
  maxMemoryUsage: number;
}

/**
 * Default DoS protection limits
 */
export const DEFAULT_DOS_LIMITS: Record<string, DosLimits> = {
  blockCreation: {
    maxInputSize: 10 * 1024 * 1024, // 10MB
    maxOperationTime: 5000, // 5 seconds
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  },
  encryption: {
    maxInputSize: 5 * 1024 * 1024, // 5MB
    maxOperationTime: 3000, // 3 seconds
    maxMemoryUsage: 25 * 1024 * 1024, // 25MB
  },
  decryption: {
    maxInputSize: 5 * 1024 * 1024, // 5MB
    maxOperationTime: 3000, // 3 seconds
    maxMemoryUsage: 25 * 1024 * 1024, // 25MB
  },
  signatureValidation: {
    maxInputSize: 1024 * 1024, // 1MB
    maxOperationTime: 1000, // 1 second
    maxMemoryUsage: 10 * 1024 * 1024, // 10MB
  },
};
