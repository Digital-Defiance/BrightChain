import { BrightChainMember } from '../brightChainMember';
import { MemberDocument } from '../documents/memberDocument';
import { EmailString } from '../emailString';
import { MemberType } from '../enumerations/memberType';
import { SecureString } from '../secureString';
import { ECIESService } from '../services/ecies.service';

/**
 * Pre-generated test members with consistent keys for testing
 */
export class TestMembers {
  private static readonly eciesService = new ECIESService();
  private static readonly members = new Map<
    string,
    {
      member: BrightChainMember;
      mnemonic: SecureString;
      document: MemberDocument;
    }
  >();

  /**
   * Initialize test members if not already done
   */
  private static initialize() {
    if (this.members.size > 0) return;

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
    memberConfigs.forEach((config) => {
      // Generate mnemonic with deterministic seed
      const mnemonic = this.eciesService.generateNewMnemonic();
      const { member: newMember } = BrightChainMember.newMember(
        config.type,
        config.name,
        new EmailString(config.email),
      );

      // Create document to store member data
      const document = new MemberDocument(newMember, mnemonic);

      // Store member info
      this.members.set(config.key, {
        member: newMember,
        mnemonic,
        document,
      });
    });
  }

  /**
   * Get a specific pre-generated member
   */
  public static getMember(
    key: 'admin' | 'system' | 'user1' | 'user2' | 'user3',
  ): BrightChainMember {
    this.initialize();
    const memberInfo = this.members.get(key);
    if (!memberInfo) {
      throw new Error(`Member ${key} not found`);
    }
    return memberInfo.member;
  }

  /**
   * Get a specific pre-generated member's document
   */
  public static getMemberDocument(
    key: 'admin' | 'system' | 'user1' | 'user2' | 'user3',
  ): MemberDocument {
    this.initialize();
    const memberInfo = this.members.get(key);
    if (!memberInfo) {
      throw new Error(`Member ${key} not found`);
    }
    return memberInfo.document;
  }

  /**
   * Get a specific pre-generated member's mnemonic
   */
  public static getMemberMnemonic(
    key: 'admin' | 'system' | 'user1' | 'user2' | 'user3',
  ): SecureString {
    this.initialize();
    const memberInfo = this.members.get(key);
    if (!memberInfo) {
      throw new Error(`Member ${key} not found`);
    }
    return memberInfo.mnemonic;
  }

  /**
   * Get all pre-generated members
   */
  public static getAllMembers(): BrightChainMember[] {
    this.initialize();
    return Array.from(this.members.values()).map((info) => info.member);
  }

  /**
   * Create a new random member for tests that need unique members
   */
  public static createRandomMember(
    type: MemberType = MemberType.User,
    name = 'Random User',
    email = 'random@test.com',
  ): {
    member: BrightChainMember;
    mnemonic: SecureString;
    document: MemberDocument;
  } {
    const mnemonic = this.eciesService.generateNewMnemonic();
    const { member } = BrightChainMember.newMember(
      type,
      name,
      new EmailString(email),
    );
    const document = new MemberDocument(member, mnemonic);
    return { member, mnemonic, document };
  }
}
