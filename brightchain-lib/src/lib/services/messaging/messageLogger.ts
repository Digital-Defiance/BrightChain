export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface IMessageLogger {
  logMessageCreated(messageId: string, senderId: string, recipientCount: number): void;
  logRoutingDecision(messageId: string, strategy: string, recipientCount: number): void;
  logDeliveryFailure(messageId: string, recipientId: string, error: string): void;
  logEncryptionFailure(error: string): void;
  logSlowQuery(queryType: string, durationMs: number): void;
}

export class MessageLogger implements IMessageLogger {
  constructor(
    private readonly minLevel: LogLevel = LogLevel.INFO,
    private readonly logger: (level: LogLevel, message: string, data?: Record<string, unknown>) => void = console.log
  ) {}

  logMessageCreated(messageId: string, senderId: string, recipientCount: number): void {
    this.log(LogLevel.INFO, 'Message created', { messageId, senderId, recipientCount });
  }

  logRoutingDecision(messageId: string, strategy: string, recipientCount: number): void {
    this.log(LogLevel.DEBUG, 'Routing decision', { messageId, strategy, recipientCount });
  }

  logDeliveryFailure(messageId: string, recipientId: string, error: string): void {
    this.log(LogLevel.ERROR, 'Delivery failure', { messageId, recipientId, error });
  }

  logEncryptionFailure(error: string): void {
    this.log(LogLevel.ERROR, 'Encryption failure', { error });
  }

  logSlowQuery(queryType: string, durationMs: number): void {
    this.log(LogLevel.WARN, 'Slow query detected', { queryType, durationMs });
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog(level)) {
      this.logger(level, message, data);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }
}
