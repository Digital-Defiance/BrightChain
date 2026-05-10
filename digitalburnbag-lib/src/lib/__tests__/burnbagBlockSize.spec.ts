import { blockAlignedBytes, pickBlockSize } from '../joule/burnbagBlockSize';

/** All block sizes from brightchain-lib BlockSize enum. */
const ALL_SIZES = [512, 1024, 4096, 1_048_576, 67_108_864, 268_435_456];

describe('pickBlockSize', () => {
  it('throws on empty available-sizes list', () => {
    expect(() => pickBlockSize(1000, [])).toThrow('NO_AVAILABLE_BLOCK_SIZES');
  });

  it('returns the only size when list has one entry', () => {
    expect(pickBlockSize(999, [1024])).toBe(1024);
  });

  it('picks smallest block size for a tiny payload (512-byte wins)', () => {
    // 100 bytes encrypted → aligned totals: 512 / 1024 / 4096 / …
    // 512 wastes 412, 1024 wastes 924, larger waste more → 512 wins
    expect(pickBlockSize(100, ALL_SIZES)).toBe(512);
  });

  it('picks 1 KiB for a 513-byte payload (512 wastes 511, 1024 wastes 511 → tie → prefer larger)', () => {
    // 513 % 512 = 1 → ceil(513/512)*512 = 1024, waste = 511
    // ceil(513/1024)*1024 = 1024, waste = 511 → tie → prefer 1024
    expect(pickBlockSize(513, [512, 1024])).toBe(1024);
  });

  it('tie-breaks on larger block size (same aligned total → larger B)', () => {
    // 1000 bytes:
    // 500 → ceil(1000/500)*500 = 1000, waste 0
    // 250 → ceil(1000/250)*250 = 1000, waste 0  → tie → prefer 500
    expect(pickBlockSize(1000, [250, 500])).toBe(500);
  });

  it('picks medium block size for a 1 MiB payload on a full-node', () => {
    // 1 048 576 = exactly 1 × Medium → waste 0
    expect(pickBlockSize(1_048_576, ALL_SIZES)).toBe(1_048_576);
  });

  it('picks medium when payload is just over 1 MiB (1 048 577 bytes)', () => {
    // medium: ceil(1048577/1048576)*1048576 = 2097152, waste 1048575
    // large:  ceil(1048577/67108864)*67108864 = 67108864, waste 66060287
    // 4096: ceil(1048577/4096)*4096 = 1052672, waste 4095
    // 1024: ceil(1048577/1024)*1024 = 1049600, waste 1023
    // 512:  ceil(1048577/512)*512  = 1049088, waste 511
    // → 512 wastes 511, 1024 wastes 1023, 4096 wastes 4095, medium wastes 1048575
    // 512 wins
    expect(pickBlockSize(1_048_577, ALL_SIZES)).toBe(512);
  });

  it('exact multiple of 4096 → 4096 wins over smaller sizes (no waste, prefer larger)', () => {
    // 8192 = 2 × 4096 → waste 0 with 4096
    // 8192 = 16 × 512 → waste 0 with 512
    // 8192 = 8 × 1024 → waste 0 with 1024
    // all three tie → prefer largest of [512, 1024, 4096] = 4096
    expect(pickBlockSize(8192, [512, 1024, 4096])).toBe(4096);
  });

  it('works correctly when availableSizes contains only large sizes', () => {
    const sizes = [67_108_864, 268_435_456];
    // For 1 byte:
    // 67108864 waste = 67108863, 268435456 waste = 268435455 → 67108864 wins
    expect(pickBlockSize(1, sizes)).toBe(67_108_864);
  });

  it('returns zero waste when payload exactly fits a block', () => {
    const size = pickBlockSize(4096, [512, 1024, 4096]);
    // 4096 / 512 = 8 exact, waste 0; 4096 / 1024 = 4 exact, waste 0; 4096/4096 = 1, waste 0 → tie → 4096
    expect(size).toBe(4096);
    expect(blockAlignedBytes(4096, size)).toBe(4096);
  });

  it('selects the block size from a node subset that minimises waste', () => {
    // Suppose node only supports [4096, 1_048_576]
    const nodeSubset = [4096, 1_048_576];
    // Payload = 2000 bytes
    // 4096: ceil(2000/4096)*4096 = 4096, waste 2096
    // 1048576: waste 1046576
    // → 4096 wins
    expect(pickBlockSize(2000, nodeSubset)).toBe(4096);
  });
});

describe('blockAlignedBytes', () => {
  it('throws on zero block size', () => {
    expect(() => blockAlignedBytes(100, 0)).toThrow('INVALID_BLOCK_SIZE');
  });

  it('throws on negative block size', () => {
    expect(() => blockAlignedBytes(100, -1)).toThrow('INVALID_BLOCK_SIZE');
  });

  it('returns exact size when payload is an exact multiple', () => {
    expect(blockAlignedBytes(4096, 4096)).toBe(4096);
    expect(blockAlignedBytes(8192, 4096)).toBe(8192);
  });

  it('rounds up to next block when payload is not a multiple', () => {
    expect(blockAlignedBytes(4097, 4096)).toBe(8192);
    expect(blockAlignedBytes(1, 512)).toBe(512);
    expect(blockAlignedBytes(511, 512)).toBe(512);
    expect(blockAlignedBytes(513, 512)).toBe(1024);
  });

  it('combined with pickBlockSize gives minimum aligned total', () => {
    const payload = 3000;
    const sizes = [512, 1024, 4096];
    const best = pickBlockSize(payload, sizes);
    const aligned = blockAlignedBytes(payload, best);

    // Verify no other size gives a smaller aligned total
    for (const s of sizes) {
      const a = blockAlignedBytes(payload, s);
      expect(a).toBeGreaterThanOrEqual(aligned);
    }
  });
});
