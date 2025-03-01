import * as fs from 'fs';
import * as path from 'path';
import { BrightChainMember } from '../brightChainMember';
import { MemberData, MemberDocument } from '../documents/memberDocument';
import { EmailString } from '../emailString';
import { MemberType } from '../enumerations/memberType';
import { GuidV4 } from '../guid';
import { ServiceProvider } from '../services/service.provider';
import { TestMembers } from './testMembers';

describe('Document System Tests', () => {
  const cacheDir = path.join(__dirname, '../../../.cache/members');

  beforeAll(() => {
    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Ensure cache directory exists before each test
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  });

  it('should successfully store and restore a member document', async () => {
    // Create a test member
    const { member, document } = TestMembers.createRandomMember(
      MemberType.User,
      'Test Store User',
      'store@test.com',
    );

    // Store document to file
    const filePath = path.join(cacheDir, `${member.id}.json`);
    const documentJson = document.toJson();
    fs.writeFileSync(filePath, JSON.stringify(documentJson, null, 2));

    // Read document back
    const storedJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const restoredDocument = MemberDocument.fromJson<MemberData>(storedJson);

    // Create a new BrightChainMember from the document data
    const id = new GuidV4(restoredDocument.get('id'));
    const type = restoredDocument.get('type') as MemberType;
    const name = restoredDocument.get('name');
    const email = new EmailString(restoredDocument.get('email'));
    const publicKey = Buffer.from(restoredDocument.get('publicKey'), 'base64');
    const privateKey = Buffer.from(
      restoredDocument.get('privateKey'),
      'base64',
    );

    // Get the voting service to convert the voting public key
    const votingService = ServiceProvider.getInstance().votingService;
    const votingPublicKey = votingService.bufferToVotingPublicKey(
      Buffer.from(restoredDocument.get('votingPublicKey'), 'base64'),
    );

    // Create the member directly
    const restoredMember = new BrightChainMember(
      type,
      name,
      email,
      publicKey,
      votingPublicKey,
      privateKey,
      undefined, // wallet
      id,
    );

    // Verify restored member matches original
    expect(restoredMember.id.toString()).toBe(member.id.toString());
    expect(restoredMember.name).toBe(member.name);
    expect(restoredMember.email.toString()).toBe(member.email.toString());
    expect(restoredMember.type).toBe(member.type);

    // Clean up test file
    fs.unlinkSync(filePath);
  });
});
