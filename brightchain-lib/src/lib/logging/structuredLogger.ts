/**
 * Log levels for structured logging
 */
export enum LogLevel {
  Debug = 'DEBUG',
  Info = 'INFO',
  Warning = 'WARNING',
  Error = 'ERROR',
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  operation: string;
  message: string;
  metadata?: Record<string, unknown>;
  error?: Error;
}

/**
 * Structured logger for BrightChain operations
 */
export class StructuredLogger {
  private static instance: StructuredLogger;
  private logs: LogEntry[] = [];
  private maxLogs = 10000;
  private minLevel: LogLevel = LogLevel.Info;

  private constructor() {}

  public static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  public setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public debug(
    operation: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.log(LogLevel.Debug, operation, message, metadata);
  }

  public info(
    operation: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.log(LogLevel.Info, operation, message, metadata);
  }

  public warn(
    operation: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.log(LogLevel.Warning, operation, message, metadata);
  }

  public error(
    operation: string,
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void {
    this.log(LogLevel.Error, operation, message, {
      ...metadata,
      error: error?.message,
    });
  }

  private log(
    level: LogLevel,
    operation: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (this.shouldLog(level)) {
      const entry: LogEntry = {
        timestamp: new Date(),
        level,
        operation,
        message,
        metadata,
      };

      this.logs.push(entry);

      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }

      this.output(entry);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.Debug,
      LogLevel.Info,
      LogLevel.Warning,
      LogLevel.Error,
    ];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private output(entry: LogEntry): void {
    const msg = `[${entry.level}][${entry.operation}] ${entry.message}`;

    switch (entry.level) {
      case LogLevel.Error:
        console.error(msg, entry.metadata);
        break;
      case LogLevel.Warning:
        console.warn(msg, entry.metadata);
        break;
      default:
        console.log(msg, entry.metadata);
    }
  }

  public getLogs(limit?: number): LogEntry[] {
    return limit ? this.logs.slice(-limit) : [...this.logs];
  }

  public clear(): void {
    this.logs = [];
  }
}
