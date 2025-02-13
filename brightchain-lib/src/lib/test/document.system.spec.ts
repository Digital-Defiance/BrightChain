import * as fs from 'fs';
import * as path from 'path';
import { MemberData, MemberDocument } from '../documents/memberDocument';
import { MemberType } from '../enumerations/memberType';
import { TestMembers } from './testMembers';

describe('Document System Tests', () => {
  const cacheDir = path.join(__dirname, '../../../.cache/members');

  beforeAll(() => {
    // Ensure cache directory exists
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
    const restoredDocument = MemberDocument.fromJson<MemberData>(
      storedJson,
    ) as MemberDocument;

    // Convert document back to member
    const restoredMember = restoredDocument.toBrightChainMember();

    // Verify restored member matches original
    expect(restoredMember.id.toString()).toBe(member.id.toString());
    expect(restoredMember.name).toBe(member.name);
    expect(restoredMember.email.toString()).toBe(member.email.toString());
    expect(restoredMember.type).toBe(member.type);

    // Clean up test file
    fs.unlinkSync(filePath);
  });
});
