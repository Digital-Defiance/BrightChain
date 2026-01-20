import { MemberType } from '@digitaldefiance/ecies-lib';
import * as fs from 'fs';
import * as path from 'path';
import { initializeBrightChain, resetInitialization } from '../init';
import { IMemberStorageData } from '../interfaces/member/storage';
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
    // Reset and initialize BrightChain with browser configuration for each test
    resetInitialization();
    initializeBrightChain();

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
    const idProvider = ServiceProvider.getInstance().idProvider;
    const idHex = idProvider.idToString(member.id);
    const filePath = path.join(cacheDir, `${idHex}.json`);
    const documentJson = document.toPublicJson();

    // Write the JSON string directly (don't double-stringify)
    fs.writeFileSync(filePath, documentJson);

    // Read document back
    const storedJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const restoredData: IMemberStorageData = storedJson;

    // Verify restored document matches original
    expect(restoredData.id).toBe(idProvider.idToString(member.id));
    expect(restoredData.name).toBe(member.name);
    expect(restoredData.email).toBe(member.email.toString());
    expect(restoredData.type).toBe(member.type);

    // Clean up test file
    fs.unlinkSync(filePath);
  });
});
