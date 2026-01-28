import { BrightChainStrings } from '../enumerations';
import { TranslatableBrightChainError } from '../errors/translatableBrightChainError';
import { translate } from '../i18n';
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
        translate(
          BrightChainStrings.Security_DOS_InputSizeExceedsLimitErrorTemplate,
          {
            SIZE: size,
            MAX_SIZE: limits.maxInputSize,
            OPERATION: operation,
          },
        ),
        { operation, identifier, size, limit: limits.maxInputSize },
      );
      throw new TranslatableBrightChainError(
        BrightChainStrings.Security_DOS_InputSizeExceedsLimitErrorTemplate,
        { SIZE: size, MAX_SIZE: limits.maxInputSize, OPERATION: operation },
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
            translate(
              BrightChainStrings.Security_DOS_OperationExceededTimeLimitErrorTemplate,
              {
                OPERATION: operation,
                MAX_TIME: limits.maxOperationTime,
              },
            ),
            { operation, identifier, timeout: limits.maxOperationTime },
          );
          reject(
            new TranslatableBrightChainError(
              BrightChainStrings.Security_DOS_OperationExceededTimeLimitErrorTemplate,
              {
                OPERATION: operation,
                MAX_TIME: limits.maxOperationTime,
              },
            ),
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
