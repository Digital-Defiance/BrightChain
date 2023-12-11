import { formatAssetAmount } from '../formatAssetAmount';

describe('formatAssetAmount — joule', () => {
  it('formats whole joule with default 6-decimal precision', () => {
    expect(formatAssetAmount(1_000_000n, 'joule')).toBe('1.000000 J');
  });

  it('formats fractional joule', () => {
    expect(formatAssetAmount(1_234_567n, 'joule')).toBe('1.234567 J');
  });

  it('formats zero', () => {
    expect(formatAssetAmount(0n, 'joule')).toBe('0.000000 J');
  });

  it('formats sub-joule microunits with leading-zero padding', () => {
    expect(formatAssetAmount(1n, 'joule')).toBe('0.000001 J');
    expect(formatAssetAmount(42n, 'joule')).toBe('0.000042 J');
  });

  it('formats negative amounts', () => {
    expect(formatAssetAmount(-1_500_000n, 'joule')).toBe('-1.500000 J');
  });

  it('truncates with custom precision below 6', () => {
    expect(formatAssetAmount(1_234_567n, 'joule', { precision: 2 })).toBe(
      '1.23 J',
    );
    expect(formatAssetAmount(1_234_567n, 'joule', { precision: 0 })).toBe(
      '1 J',
    );
  });

  it('pads with zeros for precision above 6', () => {
    expect(formatAssetAmount(1_234_567n, 'joule', { precision: 9 })).toBe(
      '1.234567000 J',
    );
  });

  it('falls back to raw output for unknown asset and never throws', () => {
    expect(formatAssetAmount(42n, 'postage')).toBe('42 postage');
    expect(() => formatAssetAmount(1n, 'unknown-asset')).not.toThrow();
  });

  it('respects locale grouping for the integer part when supplied', () => {
    const out = formatAssetAmount(1_234_567_000_000n, 'joule', {
      locale: 'en-US',
    });
    // 1_234_567 J with grouping
    expect(out).toMatch(/^1,234,567\.000000 J$/);
  });

  it('falls back gracefully on an invalid locale rather than throwing', () => {
    expect(() =>
      formatAssetAmount(1_000_000n, 'joule', { locale: 'not-a-locale' }),
    ).not.toThrow();
  });
});
