import { ReadConcern } from './readConcern';

describe('ReadConcern', () => {
  it('should have exactly three values', () => {
    const values = Object.values(ReadConcern);
    expect(values).toHaveLength(3);
  });

  it('should have Local, Available, and Consistent members', () => {
    expect(ReadConcern.Local).toBe('local');
    expect(ReadConcern.Available).toBe('available');
    expect(ReadConcern.Consistent).toBe('consistent');
  });

  it('should have unique string values', () => {
    const values = Object.values(ReadConcern);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});
