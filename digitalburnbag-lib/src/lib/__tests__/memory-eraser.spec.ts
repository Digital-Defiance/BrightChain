import fc from 'fast-check';
import { MemoryEraser } from '../crypto/memory-eraser';

describe('MemoryEraser', () => {
  // Feature: digital-burn-bag, Property 13: Memory wipe zeros buffer
  // Validates: Requirements 10.1, 10.2, 10.3
  it('Property 13: wipe zeros any non-empty buffer', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1, maxLength: 1024 }), (data) => {
        const buffer = new Uint8Array(data);
        MemoryEraser.wipe(buffer);
        for (let i = 0; i < buffer.length; i++) {
          expect(buffer[i]).toBe(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('wipe is a no-op for null', () => {
    expect(() => MemoryEraser.wipe(null)).not.toThrow();
  });

  it('wipe is a no-op for undefined', () => {
    expect(() => MemoryEraser.wipe(undefined)).not.toThrow();
  });

  it('wipe is a no-op for zero-length buffer', () => {
    const empty = new Uint8Array(0);
    expect(() => MemoryEraser.wipe(empty)).not.toThrow();
  });

  it('wipeAll zeros multiple buffers', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5, 6, 7]);
    MemoryEraser.wipeAll(a, null, b, undefined);
    expect(a.every((v) => v === 0)).toBe(true);
    expect(b.every((v) => v === 0)).toBe(true);
  });
});
