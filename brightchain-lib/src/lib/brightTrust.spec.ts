import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { BrightChainBrightTrust } from './brightTrust';
import { ServiceProvider } from './services/service.provider';

describe('brightTrust', () => {
  it('should create a BrightTrust', () => {
    const nodeOwner = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.System,
      'Node Owner',
      new EmailString('owner@example.com'),
    );
    const brightTrust = new BrightChainBrightTrust(
      nodeOwner.member,
      'Test BrightTrust',
    );
    expect(brightTrust).toBeTruthy();
    expect(brightTrust.name).toEqual('Test BrightTrust');
  });
});
