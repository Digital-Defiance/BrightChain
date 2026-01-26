import { DEFAULT_DOS_LIMITS, DosLimits } from './dosProtection';
import { SecurityAuditLogger } from './securityAuditLogger';
import { SecurityEventSeverity, SecurityEventType } from './securityEvent';

/**
 * DoS protection validator
 */
export class DosProtectionValidator {
  private static instance: DosProtectionValidator;
  private limits = new Map<string, DosLimits>();

  private constructor() {
    Object.entries(DEFAULT_DOS_LIMITS).forEach(([operation, limits]) => {
      this.limits.set(operation, limits);
    });
  }

  public static getInstance(): DosProtectionValidator {
    if (!DosProtectionValidator.instance) {
      DosProtectionValidator.instance = new DosProtectionValidator();
    }
    return DosProtectionValidator.instance;
  }

  /**
   * Validate input size
   */
  public validateInputSize(
    operation: string,
    size: number,
    identifier?: string,
  ): void {
    const limits =
      this.limits.get(operation) || DEFAULT_DOS_LIMITS['blockCreation'];

    if (size > limits.maxInputSize) {
      SecurityAuditLogger.getInstance().log(
        SecurityEventType.InvalidInput,
        SecurityEventSeverity.Warning,
        `Input size ${size} exceeds limit ${limits.maxInputSize} for ${operation}`,
        { operation, identifier, size, limit: limits.maxInputSize },
      );
      throw new Error(
        `Input size ${size} exceeds maximum allowed ${limits.maxInputSize} bytes`,
      );
    }
  }

  /**
   * Create timeout promise for operation
   */
  public withTimeout<T>(
    operation: string,
    promise: Promise<T>,
    identifier?: string,
  ): Promise<T> {
    const limits =
      this.limits.get(operation) || DEFAULT_DOS_LIMITS['blockCreation'];

    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => {
          SecurityAuditLogger.getInstance().log(
            SecurityEventType.SuspiciousActivity,
            SecurityEventSeverity.Warning,
            `Operation ${operation} exceeded timeout ${limits.maxOperationTime}ms`,
            { operation, identifier, timeout: limits.maxOperationTime },
          );
          reject(
            new Error(`Operation timeout after ${limits.maxOperationTime}ms`),
          );
        }, limits.maxOperationTime),
      ),
    ]);
  }

  /**
   * Set custom limits for an operation
   */
  public setLimits(operation: string, limits: DosLimits): void {
    this.limits.set(operation, limits);
  }

  /**
   * Get limits for an operation
   */
  public getLimits(operation: string): DosLimits {
    return this.limits.get(operation) || DEFAULT_DOS_LIMITS['blockCreation'];
  }
}
