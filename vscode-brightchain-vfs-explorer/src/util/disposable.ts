/**
 * Disposable management helper.
 *
 * Collects VS Code Disposable instances and disposes them all at once,
 * useful for classes that register multiple event listeners or providers.
 */

import type { Disposable } from 'vscode';

export class DisposableStore implements Disposable {
  private readonly _disposables: Disposable[] = [];
  private _isDisposed = false;

  /** Register a disposable to be cleaned up later. Returns the disposable for chaining. */
  add<T extends Disposable>(disposable: T): T {
    if (this._isDisposed) {
      disposable.dispose();
      return disposable;
    }
    this._disposables.push(disposable);
    return disposable;
  }

  /** Dispose all registered disposables and mark the store as disposed. */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables.length = 0;
  }

  /** Whether this store has already been disposed. */
  get isDisposed(): boolean {
    return this._isDisposed;
  }
}
