import { BrightChainMember } from './brightChainMember';
import { EmailString } from './emailString';
import { MemberType } from './enumerations/memberType';
import { StaticHelpers } from './staticHelpers';

describe('staticHelpers', () => {
  it('should correctly write a value to a buffer 255', () => {
    const value = 0xffffffff;
    const buffer = StaticHelpers.valueToBufferBigEndian(value);
    expect(buffer).toEqual(Buffer.from([255, 255, 255, 255]));
  });
  it('should correctly write a value to a buffer random', () => {
    const randomValue = Math.floor(Math.random() * 0xffffffff);
    const buffer = StaticHelpers.valueToBufferBigEndian(randomValue);
    expect(buffer).toEqual(
      Buffer.from([
        randomValue >> 24,
        randomValue >> 16,
        randomValue >> 8,
        randomValue,
      ]),
    );
  });
  it('should correctly read a value from a buffer back to a number', () => {
    const randomValue = Math.floor(Math.random() * 0xffffffff);
    const buffer = StaticHelpers.valueToBufferBigEndian(randomValue);
    const value = StaticHelpers.bufferToValueBigEndian(buffer);
    expect(value).toEqual(randomValue);
  });
  it('should generate N values of Y bits', () => {
    const N = 10;
    const Y = 8;
    const values = StaticHelpers.GenerateNValuesOfYBits(N, Y);
    expect(values.length).toEqual(N);
    values.forEach((value) => {
      expect(value).toBeLessThanOrEqual(2 ** Y - 1);
    });
  });
  it('should flag when there is a non-user member', () => {
    const systemMember = BrightChainMember.newMember(
      MemberType.System,
      'System Member',
      new EmailString('system@example.com'),
    );
    const userMember = BrightChainMember.newMember(
      MemberType.User,
      'User Member',
      new EmailString('user@example.com'),
    );
    expect(StaticHelpers.membersAreAllUsers([userMember])).toBe(true);
    expect(StaticHelpers.membersAreAllUsers([systemMember])).toBe(false);
    expect(StaticHelpers.membersAreAllUsers([systemMember, userMember])).toBe(
      false,
    );
  });
  describe('bigIntToLengthEncodedBuffer', () => {
    it('should encode a bigint correctly', () => {
      const bigInt = BigInt(1234567890);
      const buffer = StaticHelpers.bigIntToLengthEncodedBuffer(bigInt);
      expect(buffer.length).toBeGreaterThan(4); // Ensure there is a length encoding
      const length = buffer.readUInt32BE(0);
      expect(length).toBe(buffer.length - 4); // Check length encoding correctness
    });
  });

  describe('lengthEncodedBufferToBigInt', () => {
    it('should decode a length-encoded buffer correctly', () => {
      const bigInt = BigInt(1234567890);
      const buffer = StaticHelpers.bigIntToLengthEncodedBuffer(bigInt);
      const result = StaticHelpers.lengthEncodedBufferToBigInt(buffer);
      expect(result).toBe(bigInt);
    });
  });
});
