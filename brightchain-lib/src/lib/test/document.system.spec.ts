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

  beforeEach(() => {
    // Ensure cache directory exists before each test
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  });

  it('should successfully store and restore a member document', async () => {
    // Create a test member
    const { member, document } = await TestMembers.createRandomMember(
      MemberType.User,
      'Test Store User',
      'store@test.com',
    );

    // Store document to file - use hex string for filename to avoid invalid characters
    const idHex = member.id.toString('hex');
    const filePath = path.join(cacheDir, `${idHex}.json`);
    const documentJson = document.toJson();
    fs.writeFileSync(filePath, JSON.stringify(documentJson, null, 2));

    // Read document back
    const storedJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const restoredDocument = MemberDocument.fromJson<MemberData>(storedJson);

    // Verify restored document matches original
    expect(restoredDocument.get('id').toString()).toBe(member.id.toString());
    expect(restoredDocument.get('name')).toBe(member.name);
    expect(restoredDocument.get('email').toString()).toBe(
      member.email.toString(),
    );
    expect(restoredDocument.get('type')).toBe(member.type);

    // Clean up test file
    fs.unlinkSync(filePath);
  });
});
