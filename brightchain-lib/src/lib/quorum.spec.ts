import { BrightChainMember } from './brightChainMember';
import { EmailString } from './emailString';
import { MemberType } from './enumerations/memberType';
import { BrightChainQuorum } from './quorum';
import { ServiceProvider } from './services/service.provider'; // Import ServiceProvider

describe('quorum', () => {
  it('should create a quorum', () => {
    // Get injected services
    const serviceProvider = ServiceProvider.getInstance();
    const eciesService = serviceProvider.eciesService;
    const votingService = serviceProvider.votingService;
    // Pass services to newMember
    const nodeOwner = BrightChainMember.newMember(
      eciesService,
      votingService,
      MemberType.System,
      'Node Owner',
      new EmailString('owner@example.com'),
    );
    const quorum = new BrightChainQuorum(nodeOwner.member, 'Test Quorum');
    expect(quorum).toBeTruthy();
    expect(quorum.name).toEqual('Test Quorum');
  });
});
