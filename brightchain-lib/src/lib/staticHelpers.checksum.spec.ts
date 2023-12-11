import { StaticHelpersChecksum } from './staticHelpers.checksum';

describe('brightchain staticHelpers.checksum', () => {
  it('should generate the same checksum for the same data', () => {
    const data = Buffer.from('hello world');
    const checksum = StaticHelpersChecksum.calculateChecksum(data);
    expect(StaticHelpersChecksum.validateChecksum(data, checksum)).toBe(true);
    const data2 = Buffer.from('goodbye world');
    const checksum2 = StaticHelpersChecksum.calculateChecksum(data2);
    expect(StaticHelpersChecksum.validateChecksum(data, checksum2)).toBe(false);
  });
});
