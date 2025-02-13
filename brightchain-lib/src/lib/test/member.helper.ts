import { faker } from '@faker-js/faker';
import { BrightChainMember } from '../brightChainMember';
import { EmailString } from '../emailString';
import MemberType from '../enumerations/memberType';
import { ECIESService } from '../services/ecies.service'; // Added import
import { VotingService } from '../services/voting.service'; // Added import

/**
 * Pre-generated test members with consistent keys for testing
 */
export class TestMembers {
  private static members: {
    [key: string]: BrightChainMember;
  } = {};

  /**
   * Initialize test members if not already done
   */
  private static initialize() {
    if (Object.keys(this.members).length > 0) return;

    // Create a set of members with different roles
    const memberConfigs = [
      {
        key: 'admin',
        type: MemberType.Admin,
        name: 'Test Admin',
        email: 'admin@test.com',
      },
      {
        key: 'system',
        type: MemberType.System,
        name: 'Test System',
        email: 'system@test.com',
      },
      {
        key: 'user1',
        type: MemberType.User,
        name: 'Test User 1',
        email: 'user1@test.com',
      },
      {
        key: 'user2',
        type: MemberType.User,
        name: 'Test User 2',
        email: 'user2@test.com',
      },
      {
        key: 'user3',
        type: MemberType.User,
        name: 'Test User 3',
        email: 'user3@test.com',
      },
    ];

    // Create members with deterministic seeds for consistent keys
    const eciesService = new ECIESService(); // Instantiate service
    const votingService = new VotingService(eciesService); // Pass eciesService
    memberConfigs.forEach((config) => {
      const { member } = BrightChainMember.newMember(
        eciesService,
        votingService,
        config.type,
        config.name,
        new EmailString(config.email),
      );
      this.members[config.key] = member;
    });
  }

  /**
   * Get a specific pre-generated member
   */
  public static getMember(
    key: 'admin' | 'system' | 'user1' | 'user2' | 'user3',
  ): BrightChainMember {
    this.initialize();
    return this.members[key];
  }

  /**
   * Get all pre-generated members
   */
  public static getAllMembers(): BrightChainMember[] {
    this.initialize();
    return Object.values(this.members);
  }

  /**
   * Create a new random member for tests that need unique members
   */
  public static createRandomMember(
    type: MemberType = MemberType.User,
  ): BrightChainMember {
    const eciesService = new ECIESService(); // Instantiate service
    const votingService = new VotingService(eciesService); // Pass eciesService
    const { member } = BrightChainMember.newMember(
      eciesService,
      votingService,
      type,
      faker.person.fullName(),
      new EmailString(faker.internet.email()),
    );
    return member;
  }
}
