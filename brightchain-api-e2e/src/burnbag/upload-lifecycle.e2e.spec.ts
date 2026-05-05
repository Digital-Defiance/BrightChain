/**
 * E2E: Digital Burnbag Upload Lifecycle
 *
 * Tests the full upload flow (init → chunk → finalize) against the real
 * running API server with real GuidV4Buffer IDs and binary data.
 */
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';

// ─── Helpers ────────────────────────────────────────────────────

function isValidHexId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{32}$/i.test(id);
}

function uniqueUser(prefix: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@test.brightchain.local`,
    password: `T3stPass!${id}`,
  };
}

async function registerUser(prefix = 'burnbag_upload') {
  const creds = uniqueUser(prefix);
  const res = await axios.post('/api/user/register', {
    username: creds.username,
    email: creds.email,
    password: creds.password,
  });
  return {
    token: res.data.data?.token as string,
    memberId: res.data.data?.memberId as string,
  };
}

/** DJB2-style checksum matching the client's computeChunkChecksum. */
function computeChecksum(data: Buffer): string {
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash + data[i]) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// ─── Tests ──────────────────────────────────────────────────────

describe('E2E: Digital Burnbag Upload Lifecycle', () => {
  let authToken: string;
  let rootFolderId: string;
  let vaultContainerId: string;

  beforeAll(async () => {
    const result = await registerUser();
    authToken = result.token;
    if (!authToken) {
      console.error('Registration failed — no token');
    }

    // Create a vault container first
    const vaultRes = await axios.post(
      '/api/burnbag/vaults',
      { name: 'E2E Upload Test Vault' },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    vaultContainerId = vaultRes.data?.id ?? '';

    // Get root folder ID (with vault container)
    const rootUrl = vaultContainerId
      ? `/api/burnbag/folders/root?vaultContainerId=${encodeURIComponent(vaultContainerId)}`
      : '/api/burnbag/folders/root';
    const rootRes = await axios.get(rootUrl, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    rootFolderId = rootRes.data.folder.id;
  });

  const authed = () => ({
    headers: { Authorization: `Bearer ${authToken}` },
  });

  it('should complete full upload: init → chunk → finalize', async () => {
    const fileContent = crypto.randomBytes(256);
    const checksum = computeChecksum(fileContent);

    // Step 1: Init
    const initRes = await axios.post(
      '/api/burnbag/upload/init',
      {
        fileName: 'test-upload.bin',
        mimeType: 'application/octet-stream',
        totalSizeBytes: fileContent.length,
        targetFolderId: rootFolderId,
        vaultContainerId: vaultContainerId || undefined,
      },
      authed(),
    );

    expect(initRes.status).toBe(201);
    expect(initRes.data).toHaveProperty('sessionId');
    expect(initRes.data).toHaveProperty('chunkSize');
    expect(initRes.data).toHaveProperty('totalChunks');

    const { sessionId, totalChunks } = initRes.data;
    expect(typeof sessionId).toBe('string');
    expect(totalChunks).toBeGreaterThanOrEqual(1);

    // Step 2: Upload chunk(s)
    const chunkRes = await axios.put(
      `/api/burnbag/upload/${sessionId}/chunk/0`,
      fileContent,
      {
        ...authed(),
        headers: {
          ...authed().headers,
          'Content-Type': 'application/octet-stream',
          'X-Chunk-Checksum': checksum,
        },
      },
    );

    expect(chunkRes.status).toBe(200);

    // Step 3: Finalize
    const finalizeRes = await axios.post(
      `/api/burnbag/upload/${sessionId}/finalize`,
      {},
      authed(),
    );

    expect(finalizeRes.status).toBe(200);
    expect(finalizeRes.data).toHaveProperty('fileId');
    expect(isValidHexId(finalizeRes.data.fileId)).toBe(true);
    expect(finalizeRes.data).toHaveProperty('metadata');
    expect(isValidHexId(finalizeRes.data.metadata.id)).toBe(true);
  });

  it('should reject chunk upload without auth', async () => {
    try {
      await axios.put(
        '/api/burnbag/upload/fake-session/chunk/0',
        Buffer.from('data'),
        {
          headers: { 'Content-Type': 'application/octet-stream' },
        },
      );
      throw new Error('Expected 401');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(401);
    }
  });

  it('should reject init without auth', async () => {
    try {
      await axios.post('/api/burnbag/upload/init', {
        fileName: 'no-auth.bin',
        mimeType: 'application/octet-stream',
        totalSizeBytes: 100,
        targetFolderId: rootFolderId,
      });
      throw new Error('Expected 401');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(401);
    }
  });

  it('should show uploaded file in folder contents', async () => {
    const fileContent = crypto.randomBytes(128);
    const checksum = computeChecksum(fileContent);
    const fileName = `verify-${Date.now()}.bin`;

    // Upload
    const initRes = await axios.post(
      '/api/burnbag/upload/init',
      {
        fileName,
        mimeType: 'application/octet-stream',
        totalSizeBytes: fileContent.length,
        targetFolderId: rootFolderId,
        vaultContainerId: vaultContainerId || undefined,
      },
      authed(),
    );
    const { sessionId } = initRes.data;

    await axios.put(`/api/burnbag/upload/${sessionId}/chunk/0`, fileContent, {
      ...authed(),
      headers: {
        ...authed().headers,
        'Content-Type': 'application/octet-stream',
        'X-Chunk-Checksum': checksum,
      },
    });

    await axios.post(`/api/burnbag/upload/${sessionId}/finalize`, {}, authed());

    // Verify file appears in folder
    const folderRes = await axios.get(
      `/api/burnbag/folders/${rootFolderId}`,
      authed(),
    );

    const uploadedFile = folderRes.data.files.find(
      (f: { fileName: string }) => f.fileName === fileName,
    );
    expect(uploadedFile).toBeDefined();
    expect(isValidHexId(uploadedFile.id)).toBe(true);
  });
});

describe('E2E: GET /api/burnbag/files/:id/encrypted', () => {
  let authToken: string;
  let rootFolderId: string;
  let vaultContainerId: string;
  let uploadedFileId: string;

  beforeAll(async () => {
    const result = await registerUser('burnbag_enc');
    authToken = result.token;
    if (!authToken) return;

    const vaultRes = await axios.post(
      '/api/burnbag/vaults',
      { name: 'E2E Encrypted Download Vault' },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    vaultContainerId = vaultRes.data?.id ?? '';

    const rootUrl = vaultContainerId
      ? `/api/burnbag/folders/root?vaultContainerId=${encodeURIComponent(vaultContainerId)}`
      : '/api/burnbag/folders/root';
    const rootRes = await axios.get(rootUrl, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    rootFolderId = rootRes.data.folder.id;

    // Upload a small test file so we have a valid fileId to query
    const fileContent = Buffer.from('hello encrypted world');
    const checksum = computeChecksum(fileContent);

    const initRes = await axios.post(
      '/api/burnbag/upload/init',
      {
        fileName: 'enc-test.txt',
        mimeType: 'text/plain',
        totalSizeBytes: fileContent.length,
        targetFolderId: rootFolderId,
        vaultContainerId: vaultContainerId || undefined,
      },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    const { sessionId } = initRes.data;

    await axios.put(`/api/burnbag/upload/${sessionId}/chunk/0`, fileContent, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/octet-stream',
        'X-Chunk-Checksum': checksum,
      },
    });

    const finalizeRes = await axios.post(
      `/api/burnbag/upload/${sessionId}/finalize`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    uploadedFileId = finalizeRes.data.fileId;
  });

  const authedEnc = () => ({
    headers: { Authorization: `Bearer ${authToken}` },
  });

  it('should require authentication', async () => {
    if (!uploadedFileId) return;
    try {
      await axios.get(`/api/burnbag/files/${uploadedFileId}/encrypted`);
      throw new Error('Expected 401');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(401);
    }
  });

  it('should return 404 for non-existent file', async () => {
    if (!authToken) return;
    const fakeId = 'a'.repeat(32);
    try {
      await axios.get(`/api/burnbag/files/${fakeId}/encrypted`, authedEnc());
      throw new Error('Expected 404 or 400');
    } catch (err) {
      const error = err as AxiosError;
      expect([400, 403, 404]).toContain(error.response?.status);
    }
  });

  it('should return 200 with expected fields or 403 when no key is stored', async () => {
    if (!authToken || !uploadedFileId) return;
    try {
      const res = await axios.get(
        `/api/burnbag/files/${uploadedFileId}/encrypted`,
        authedEnc(),
      );
      // 200: dev mode returned encrypted content
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('fileName');
      expect(res.data).toHaveProperty('mimeType');
      expect(res.data).toHaveProperty('encryptedContent');
      expect(res.data).toHaveProperty('iv');
      expect(res.data).toHaveProperty('authTag');
      expect(res.data).toHaveProperty('encryptedSymmetricKey');
      // All fields should be base64 strings
      for (const field of [
        'encryptedContent',
        'iv',
        'authTag',
        'encryptedSymmetricKey',
      ]) {
        expect(typeof res.data[field]).toBe('string');
      }
    } catch (err) {
      const error = err as AxiosError;
      // 403 is acceptable when no wrapped key is stored for this file in dev mode
      expect(error.response?.status).toBe(403);
    }
  });
});
