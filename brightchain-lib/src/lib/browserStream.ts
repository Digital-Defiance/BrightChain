/**
 * Minimal browser-compatible stream implementation
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export class Readable {
  protected _data: Uint8Array;
  protected _position = 0;
  protected _listeners: { [event: string]: ((...args: any[]) => void)[] } = {};
  protected _readableBuffer: Uint8Array[] = [];

  constructor(data?: Uint8Array) {
    this._data = data || new Uint8Array(0);
  }

  read(size?: number): Uint8Array | null {
    // Trigger _read if it exists (for subclasses like CblStream)
    if (typeof (this as any)._read === 'function') {
      setTimeout(() => {
        (this as any)._read(size || 0);
      }, 0);
      return null; // Return null initially, data will come via events
    }

    if (this._position >= this._data.length) {
      return null;
    }

    const end = size
      ? Math.min(this._position + size, this._data.length)
      : this._data.length;
    const chunk = this._data.slice(this._position, end);
    this._position = end;
    return chunk;
  }

  push(chunk: any): boolean {
    if (chunk !== null) {
      this.emit('data', chunk);
    } else {
      this.emit('end');
    }
    return true;
  }

  static from(data: Uint8Array): Readable {
    return new Readable(data);
  }

  // Event emitter methods
  on(event: string, listener: (...args: any[]) => void): this {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this._listeners[event];
    if (listeners) {
      listeners.forEach((listener) => listener(...args));
      return true;
    }
    return false;
  }

  // Pipe method for Node.js compatibility
  pipe<T extends Transform>(destination: T): T {
    // Simple pipe implementation - read all data and write to destination
    const processData = () => {
      // Emit data events to trigger the destination's processing
      this.emit('data', this._data);
      this.emit('end');
    };

    // Set up event listeners
    this.on('data', (chunk) => {
      destination.write(chunk);
    });

    this.on('end', () => {
      destination.end();
    });

    this.on('error', (error) => {
      destination.destroy(error);
    });

    // Process immediately
    setTimeout(processData, 0);
    return destination;
  }

  // Async iterator support for compatibility
  async *[Symbol.asyncIterator](): AsyncIterableIterator<Uint8Array> {
    let chunk: Uint8Array | null;
    while ((chunk = this.read()) !== null) {
      yield chunk;
    }
  }
}

export interface TransformCallback {
  (error?: Error | null): void;
}

export interface TransformOptions {
  objectMode?: boolean;
}

export class Transform extends Readable {
  protected _transformBuffer: Uint8Array[] = [];
  protected _objectMode: boolean;
  protected _ended = false;

  constructor(options?: TransformOptions) {
    super();
    this._objectMode = options?.objectMode || false;
  }

  _transform(chunk: any, _encoding: string, callback: TransformCallback): void {
    // Override in subclasses
    this.push(chunk);
    callback();
  }

  _flush(callback: TransformCallback): void {
    // Override in subclasses
    callback();
  }

  override push(chunk: any): boolean {
    if (chunk !== null) {
      if (this._objectMode) {
        // In object mode, emit data events directly
        this.emit('data', chunk);
      } else {
        // In buffer mode, emit data events directly too
        this.emit('data', chunk);
      }
    } else {
      // null means end of stream
      this.emit('end');
    }
    return true;
  }

  // Add write method for compatibility
  write(chunk: any, encoding?: string, callback?: TransformCallback): boolean {
    const cb = (error?: Error | null) => {
      if (error) {
        setTimeout(() => {
          this.emit('error', error);
        }, 0);
      }
      if (callback) callback(error);
    };

    try {
      this._transform(chunk, encoding || 'buffer', cb);
    } catch (error) {
      // Emit error immediately if _transform throws synchronously
      setTimeout(() => {
        this.emit('error', error);
      }, 0);
    }
    return true;
  }

  // Add end method for compatibility
  end(chunk?: any, encoding?: string, callback?: TransformCallback): void {
    if (chunk) {
      this.write(chunk, encoding);
    }
    this._ended = true;
    this._flush(() => {
      this.push(null);
      if (callback) callback();
    });
  }

  destroy(error?: Error): void {
    if (error) {
      this.emit('error', error);
    }
  }

  override pipe<T extends Transform>(destination: T): T {
    this.on('data', (chunk) => {
      destination.write(chunk);
    });

    this.on('end', () => {
      destination.end();
    });

    this.on('error', (error) => {
      destination.destroy(error);
    });

    return destination;
  }

  // Override read to return buffered data
  override read(_size?: number): Uint8Array | null {
    if (this._transformBuffer.length === 0) {
      return null;
    }

    const chunk = this._transformBuffer.shift();
    return chunk || null;
  }
}
