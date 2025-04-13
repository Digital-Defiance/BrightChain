import { EmailString } from '@digitaldefiance/ecies-lib';
import { Member } from '@digitaldefiance/ecies-lib';
import { MemberType } from './enumerations/memberType';
import { BrightChainQuorum } from './quorum';
import { ServiceProvider } from './services/service.provider';

describe('quorum', () => {
  it('should create a quorum', () => {
    const nodeOwner = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.System,
      'Node Owner',
      new EmailString('owner@example.com'),
    );
    const quorum = new BrightChainQuorum(nodeOwner.member, 'Test Quorum');
    expect(quorum).toBeTruthy();
    expect(quorum.name).toEqual('Test Quorum');
  });
});
