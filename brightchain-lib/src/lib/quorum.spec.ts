import { BrightChainMember } from './brightChainMember';
import { EmailString } from './emailString';
import { MemberType } from './enumerations/memberType';
import { BrightChainQuorum } from './quorum';
describe('quorum', () => {
  it('should create a quorum', () => {
    const nodeOwner = BrightChainMember.newMember(
      MemberType.System,
      'Node Owner',
      new EmailString('owner@example.com')
    );
    const quorum = new BrightChainQuorum(nodeOwner, 'Test Quorum');
    expect(quorum).toBeTruthy();
    expect(quorum.name).toEqual('Test Quorum');
  });
});
