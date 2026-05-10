/**
 * Best-effort secure memory erasure for Uint8Array buffers.
 *
 * JavaScript cannot guarantee memory erasure (GC may copy buffers),
 * but we apply best-effort: overwrite with random bytes to destroy
 * the original pattern, then zero-fill to leave a clean state.
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 12.2, 12.3
 */
export class MemoryEraser {
  /**
   * Overwrite buffer with random bytes, then zero it.
   * No-op if buffer is null, undefined, or zero-length.
   */
  static wipe(buffer: Uint8Array | null | undefined): void {
    if (!buffer || buffer.length === 0) return;
    crypto.getRandomValues(buffer);
    buffer.fill(0);
  }

  /** Wipe multiple buffers. */
  static wipeAll(...buffers: (Uint8Array | null | undefined)[]): void {
    for (const buf of buffers) {
      MemoryEraser.wipe(buf);
    }
  }
}
