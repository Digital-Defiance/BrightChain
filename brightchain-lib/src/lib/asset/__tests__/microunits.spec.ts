import { InvalidAmountError } from '../../errors/asset/invalidAmountError';
import {
  JOULE_ASSET_ID,
  JOULE_DECIMALS,
  JOULE_MICROUNITS_PER_UNIT,
  JOULE_SYMBOL,
} from '../jouleConstants';
import { joulesToMicrojoules, microjoulesToJoules } from '../microunits';

describe('joule constants', () => {
  it('JOULE_MICROUNITS_PER_UNIT is 1_000_000n', () => {
    expect(JOULE_MICROUNITS_PER_UNIT).toBe(1_000_000n);
  });

  it('JOULE_DECIMALS matches microunit scale', () => {
    expect(BigInt(10) ** BigInt(JOULE_DECIMALS)).toBe(
      JOULE_MICROUNITS_PER_UNIT,
    );
  });

  it('JOULE_SYMBOL and JOULE_ASSET_ID are stable', () => {
    expect(JOULE_SYMBOL).toBe('J');
    expect(JOULE_ASSET_ID).toBe('joule');
  });
});

describe('joulesToMicrojoules', () => {
  it('converts whole joules to microjoules', () => {
    expect(joulesToMicrojoules(1)).toBe(1_000_000n);
    expect(joulesToMicrojoules(0)).toBe(0n);
    expect(joulesToMicrojoules(2.5)).toBe(2_500_000n);
  });

  it('rounds sub-microjoule fractions to nearest microjoule', () => {
    expect(joulesToMicrojoules(0.0000004)).toBe(0n);
    expect(joulesToMicrojoules(0.0000006)).toBe(1n);
    expect(joulesToMicrojoules(0.0000015)).toBe(2n);
  });

  it('throws InvalidAmountError on negative input', () => {
    expect(() => joulesToMicrojoules(-1)).toThrow(InvalidAmountError);
  });

  it('throws InvalidAmountError on non-finite input', () => {
    expect(() => joulesToMicrojoules(Number.NaN)).toThrow(InvalidAmountError);
    expect(() => joulesToMicrojoules(Number.POSITIVE_INFINITY)).toThrow(
      InvalidAmountError,
    );
  });

  it('throws InvalidAmountError on non-number input', () => {
    expect(() => joulesToMicrojoules('1' as unknown as number)).toThrow(
      InvalidAmountError,
    );
  });
});

describe('microjoulesToJoules', () => {
  it('converts microjoules to joules for display', () => {
    expect(microjoulesToJoules(1_000_000n)).toBe(1);
    expect(microjoulesToJoules(0n)).toBe(0);
    expect(microjoulesToJoules(2_500_000n)).toBe(2.5);
  });

  it('round-trips small joule values losslessly', () => {
    for (const j of [0, 0.5, 1, 2.5, 10, 1234.56789]) {
      expect(microjoulesToJoules(joulesToMicrojoules(j))).toBeCloseTo(j, 6);
    }
  });
});
