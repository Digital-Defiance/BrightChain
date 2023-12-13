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
      ])
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
    const alice = BrightChainMember.newMember(
      MemberType.User,
      'alice',
      new EmailString('alice@example.com')
    );
    const bob = BrightChainMember.newMember(
      MemberType.Admin,
      'bob',
      new EmailString('bob@example.com')
    );
    const charlie = BrightChainMember.newMember(
      MemberType.System,
      'charlie',
      new EmailString('charlie@example.com')
    );

    expect(StaticHelpers.membersAreAllUsers([alice, bob])).toEqual(true);

    expect(StaticHelpers.membersAreAllUsers([alice, bob, charlie])).toEqual(
      false
    );
  });
});
