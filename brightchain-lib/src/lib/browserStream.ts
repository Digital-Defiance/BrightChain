/**
 * Minimal browser-compatible stream implementation
 */

export class Readable {
  protected _data: Uint8Array;
  protected _position = 0;
  protected _listeners: { [event: string]: ((...args: any[]) => void)[] } = {};
  protected _readableBuffer: Uint8Array[] = [];

  constructor(data?: Uint8Array) {
    this._data = data || new Uint8Array(0);
  }

  read(size?: number): Uint8Array | null {
    if (this._position >= this._data.length) {
      return null;
    }
    
    const end = size ? Math.min(this._position + size, this._data.length) : this._data.length;
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
      listeners.forEach(listener => listener(...args));
      return true;
    }
    return false;
  }

  // Pipe method for Node.js compatibility
  pipe<T extends Transform>(destination: T): T {
    // Simple pipe implementation - read all data and write to destination
    const processData = () => {
      let chunk: Uint8Array | null;
      while ((chunk = this.read()) !== null) {
        destination.write(chunk);
      }
      destination.end();
    };
    
    // Process immediately or on next tick
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _transform(chunk: any, encoding: string, callback: TransformCallback): void {
    // Override in subclasses
    this.push(chunk);
    callback();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const cb = callback || (() => {});
    this._transform(chunk, encoding || 'buffer', cb);
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
  override read(size?: number): Uint8Array | null {
    if (this._transformBuffer.length === 0) {
      return null;
    }
    
    const chunk = this._transformBuffer.shift();
    return chunk || null;
  }
}