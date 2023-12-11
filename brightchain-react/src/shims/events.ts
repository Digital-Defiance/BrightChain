/**
 * Browser shim for Node's 'events' module.
 * Provides a minimal EventEmitter that satisfies @ethereumjs/util's
 * AsyncEventEmitter which extends EventEmitter.
 */

type Listener = (...args: unknown[]) => void;

export class EventEmitter {
  private _events: Record<string, Listener[]> = {};
  private _maxListeners = 10;

  addListener(event: string, listener: Listener): this {
    return this.on(event, listener);
  }

  on(event: string, listener: Listener): this {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(listener);
    return this;
  }

  once(event: string, listener: Listener): this {
    const wrapped = (...args: unknown[]) => {
      this.removeListener(event, wrapped);
      listener(...args);
    };
    return this.on(event, wrapped);
  }

  removeListener(event: string, listener: Listener): this {
    const listeners = this._events[event];
    if (listeners) {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    }
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const listeners = this._events[event];
    if (!listeners || listeners.length === 0) return false;
    for (const listener of [...listeners]) {
      listener(...args);
    }
    return true;
  }

  listenerCount(event: string): number {
    return this._events[event]?.length ?? 0;
  }

  listeners(event: string): Listener[] {
    return [...(this._events[event] ?? [])];
  }

  eventNames(): string[] {
    return Object.keys(this._events);
  }

  setMaxListeners(n: number): this {
    this._maxListeners = n;
    return this;
  }

  getMaxListeners(): number {
    return this._maxListeners;
  }

  prependListener(event: string, listener: Listener): this {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].unshift(listener);
    return this;
  }

  prependOnceListener(event: string, listener: Listener): this {
    const wrapped = (...args: unknown[]) => {
      this.removeListener(event, wrapped);
      listener(...args);
    };
    return this.prependListener(event, wrapped);
  }
}

export default EventEmitter;
