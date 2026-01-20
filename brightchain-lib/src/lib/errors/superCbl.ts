/**
 * Error types for Super CBL operations
 */
export enum SuperCBLErrorType {
  MAX_DEPTH_EXCEEDED = 'MAX_DEPTH_EXCEEDED',
  MISSING_SUB_CBL = 'MISSING_SUB_CBL',
  INVALID_CBL_TYPE = 'INVALID_CBL_TYPE',
  BLOCK_COUNT_MISMATCH = 'BLOCK_COUNT_MISMATCH',
  INVALID_CBL_FORMAT = 'INVALID_CBL_FORMAT',
}

/**
 * Custom error class for Super CBL operations
 */
export class SuperCBLError extends Error {
  constructor(
    public readonly type: SuperCBLErrorType,
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'SuperCBLError';
    Object.setPrototypeOf(this, SuperCBLError.prototype);
  }

  static maxDepthExceeded(
    currentDepth: number,
    maxDepth: number,
  ): SuperCBLError {
    return new SuperCBLError(
      SuperCBLErrorType.MAX_DEPTH_EXCEEDED,
      `Maximum hierarchy depth (${maxDepth}) exceeded at depth ${currentDepth}`,
      { currentDepth, maxDepth },
    );
  }

  static missingSubCBL(magnetUrl: string, cause?: Error): SuperCBLError {
    return new SuperCBLError(
      SuperCBLErrorType.MISSING_SUB_CBL,
      `Failed to retrieve sub-CBL from magnet URL: ${magnetUrl.substring(0, 50)}...${cause ? ` (${cause.message})` : ''}`,
      { magnetUrl, cause: cause?.message },
    );
  }

  static invalidCBLType(type: string): SuperCBLError {
    return new SuperCBLError(
      SuperCBLErrorType.INVALID_CBL_TYPE,
      `Unknown or invalid CBL type: ${type}`,
      { type },
    );
  }

  static blockCountMismatch(expected: number, actual: number): SuperCBLError {
    return new SuperCBLError(
      SuperCBLErrorType.BLOCK_COUNT_MISMATCH,
      `Block count mismatch: expected ${expected}, got ${actual}`,
      { expected, actual },
    );
  }

  static invalidFormat(
    reason: string,
    context?: Record<string, unknown>,
  ): SuperCBLError {
    return new SuperCBLError(
      SuperCBLErrorType.INVALID_CBL_FORMAT,
      `Invalid CBL format: ${reason}`,
      context,
    );
  }
}
