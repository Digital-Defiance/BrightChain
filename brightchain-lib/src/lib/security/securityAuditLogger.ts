import {
  SecurityEvent,
  SecurityEventSeverity,
  SecurityEventType,
} from './securityEvent';

/**
 * Security audit logger for tracking security-relevant events
 */
export class SecurityAuditLogger {
  private static instance: SecurityAuditLogger;
  private events: SecurityEvent[] = [];
  private maxEvents = 10000;
  private _silent = false;

  private constructor() {}

  public static getInstance(): SecurityAuditLogger {
    if (!SecurityAuditLogger.instance) {
      SecurityAuditLogger.instance = new SecurityAuditLogger();
    }
    return SecurityAuditLogger.instance;
  }

  /**
   * Enable or disable console output (useful for tests)
   */
  public set silent(value: boolean) {
    this._silent = value;
  }

  public get silent(): boolean {
    return this._silent;
  }

  /**
   * Log a security event
   */
  public log(
    type: SecurityEventType,
    severity: SecurityEventSeverity,
    message: string,
    metadata?: {
      correlationId?: string;
      userId?: string;
      blockId?: string;
      [key: string]: unknown;
    },
  ): void {
    const event: SecurityEvent = {
      timestamp: new Date(),
      type,
      severity,
      message,
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      blockId: metadata?.blockId,
      metadata,
    };

    this.events.push(event);

    // Trim old events if exceeding max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Output to console for visibility
    this.outputEvent(event);
  }

  /**
   * Log signature validation success
   */
  public logSignatureValidation(
    success: boolean,
    blockId?: string,
    userId?: string,
  ): void {
    this.log(
      success
        ? SecurityEventType.SignatureValidationSuccess
        : SecurityEventType.SignatureValidationFailure,
      success ? SecurityEventSeverity.Info : SecurityEventSeverity.Warning,
      `Signature validation ${success ? 'succeeded' : 'failed'}`,
      { blockId, userId },
    );
  }

  /**
   * Log block creation
   */
  public logBlockCreated(blockId: string, userId?: string): void {
    this.log(
      SecurityEventType.BlockCreated,
      SecurityEventSeverity.Info,
      'Block created',
      { blockId, userId },
    );
  }

  /**
   * Log encryption operation
   */
  public logEncryption(blockId: string, recipientCount?: number): void {
    this.log(
      SecurityEventType.EncryptionPerformed,
      SecurityEventSeverity.Info,
      'Encryption performed',
      { blockId, recipientCount },
    );
  }

  /**
   * Log decryption operation
   */
  public logDecryption(
    success: boolean,
    blockId: string,
    userId?: string,
  ): void {
    this.log(
      success
        ? SecurityEventType.DecryptionPerformed
        : SecurityEventType.DecryptionFailed,
      success ? SecurityEventSeverity.Info : SecurityEventSeverity.Warning,
      `Decryption ${success ? 'succeeded' : 'failed'}`,
      { blockId, userId },
    );
  }

  /**
   * Log access denied
   */
  public logAccessDenied(resource: string, userId?: string): void {
    this.log(
      SecurityEventType.AccessDenied,
      SecurityEventSeverity.Warning,
      `Access denied to ${resource}`,
      { userId, resource },
    );
  }

  /**
   * Get recent events
   */
  public getEvents(limit?: number): SecurityEvent[] {
    return limit ? this.events.slice(-limit) : [...this.events];
  }

  /**
   * Clear all events
   */
  public clear(): void {
    this.events = [];
  }

  /**
   * Output event to console
   */
  private outputEvent(event: SecurityEvent): void {
    // Skip console output in silent mode (useful for tests)
    if (this._silent) return;

    const prefix = `[SECURITY][${event.severity}][${event.type}]`;
    const msg = `${prefix} ${event.message}`;

    switch (event.severity) {
      case SecurityEventSeverity.Critical:
      case SecurityEventSeverity.Error:
        console.error(msg, event.metadata);
        break;
      case SecurityEventSeverity.Warning:
        console.warn(msg, event.metadata);
        break;
      default:
        console.log(msg, event.metadata);
    }
  }
}
