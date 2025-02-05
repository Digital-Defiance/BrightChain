export class HandleableError extends Error {
  public readonly cause?: Error;
  public readonly statusCode: number;
  public readonly sourceData?: unknown;
  private _handled: boolean;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      handled?: boolean;
      statusCode?: number;
      sourceData?: unknown;
    },
  ) {
    super(message);
    this.name = this.constructor.name;
    this.cause = options?.cause;
    this.statusCode = options?.statusCode ?? 500;
    this._handled = options?.handled ?? false;
    this.sourceData = options?.sourceData;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // If there's a cause, append its stack to this error's stack
    if (this.cause && this.cause.stack) {
      this.stack = this.stack + '\nCaused by: ' + this.cause.stack;
    }

    Object.setPrototypeOf(this, new.target.prototype);
  }

  public get handled(): boolean {
    return this._handled;
  }

  public set handled(value: boolean) {
    this._handled = value;
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      handled: this.handled,
      stack: this.stack,
      cause:
        this.cause instanceof HandleableError
          ? this.cause.toJSON()
          : this.cause?.message,
      ...(this.sourceData ? { sourceData: this.sourceData } : {}),
    };
  }
}
