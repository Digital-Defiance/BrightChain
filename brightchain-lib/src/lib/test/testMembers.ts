import {
  SecureString as EciesSecureString,
  EmailString,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import { MemberDocument } from '../documents/member/memberDocument';
import { initializeBrightChain } from '../init';
import { ServiceProvider } from '../services/service.provider';

/**
 * Pre-generated test members with consistent keys for testing
 */
export class TestMembers {
  private static readonly members = new Map<
    string,
    {
      member: Member;
      mnemonic: EciesSecureString;
      document: MemberDocument;
    }
  >();

  /**
   * Initialize test members if not already done
   */
  private static async initialize() {
    if (this.members.size > 0) return;

    // Initialize BrightChain with browser configuration
    initializeBrightChain();

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
    for (const config of memberConfigs) {
      // Generate mnemonic with deterministic seed
      const eciesService = ServiceProvider.getInstance().eciesService;
      const mnemonic = eciesService.generateNewMnemonic();
      const { member: newMember } = Member.newMember(
        eciesService,
        config.type,
        config.name,
        new EmailString(config.email),
      );

      // Create document to store member data using factory method
      const document = MemberDocument.create(newMember, newMember);

      // Store member info
      this.members.set(config.key, {
        member: newMember,
        mnemonic,
        document,
      });
    }
  }

  /**
   * Get a specific pre-generated member
   */
  public static async getMember(
    key: 'admin' | 'system' | 'user1' | 'user2' | 'user3',
  ): Promise<Member> {
    await this.initialize();
    const memberInfo = this.members.get(key);
    if (!memberInfo) {
      throw new Error(`Member ${key} not found`);
    }
    return memberInfo.member;
  }

  /**
   * Get a specific pre-generated member's document
   */
  public static async getMemberDocument(
    key: 'admin' | 'system' | 'user1' | 'user2' | 'user3',
  ): Promise<MemberDocument> {
    await this.initialize();
    const memberInfo = this.members.get(key);
    if (!memberInfo) {
      throw new Error(`Member ${key} not found`);
    }
    return memberInfo.document;
  }

  /**
   * Get a specific pre-generated member's mnemonic
   */
  public static async getMemberMnemonic(
    key: 'admin' | 'system' | 'user1' | 'user2' | 'user3',
  ): Promise<EciesSecureString> {
    await this.initialize();
    const memberInfo = this.members.get(key);
    if (!memberInfo) {
      throw new Error(`Member ${key} not found`);
    }
    return memberInfo.mnemonic;
  }

  /**
   * Get all pre-generated members
   */
  public static async getAllMembers(): Promise<Member[]> {
    await this.initialize();
    return Array.from(this.members.values()).map((info) => info.member);
  }

  /**
   * Create a new random member for tests that need unique members
   */
  public static async createRandomMember(
    type: MemberType = MemberType.User,
    name = 'Random User',
    email = 'random@test.com',
  ): Promise<{
    member: Member;
    mnemonic: EciesSecureString;
    document: MemberDocument;
  }> {
    // Initialize BrightChain with browser configuration
    initializeBrightChain();

    const eciesService = ServiceProvider.getInstance().eciesService;
    const mnemonic = eciesService.generateNewMnemonic();
    const { member } = Member.newMember(
      eciesService,
      type,
      name,
      new EmailString(email),
    );
    const document = MemberDocument.create(member, member);
    return { member, mnemonic, document };
  }
}
