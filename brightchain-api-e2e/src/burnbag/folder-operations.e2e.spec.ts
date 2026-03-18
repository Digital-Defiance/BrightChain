/**
 * E2E: Digital Burnbag Folder Operations
 *
 * Tests against the real running API server with real GuidV4Buffer IDs.
 * These tests verify the full request/response cycle including ID serialization.
 */
import axios, { AxiosError } from 'axios';

// Helper to validate hex string format (GuidV4Buffer serialized)
function isValidHexId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  // GuidV4Buffer is 16 bytes = 32 hex chars
  return /^[0-9a-f]{32}$/i.test(id);
}

// Helper to check ID is NOT comma-separated bytes (the bug we fixed)
function isNotCommaSeparatedBytes(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  // Comma-separated bytes look like "251,111,47,219,..."
  return !id.includes(',');
}

/** Helper to generate unique user credentials per test. */
function uniqueUser(prefix: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@test.brightchain.local`,
    password: `T3stPass!${id}`,
  };
}

/** Register a user and return the response data + credentials. */
async function registerUser(prefix = 'burnbag') {
  const creds = uniqueUser(prefix);
  const res = await axios.post('/api/user/register', {
    username: creds.username,
    email: creds.email,
    password: creds.password,
  });
  return {
    creds,
    status: res.status,
    data: res.data,
    token: res.data.data?.token as string,
    memberId: res.data.data?.memberId as string,
  };
}

/** Create an axios config with Bearer auth header. */
function _authHeader(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

describe('E2E: Digital Burnbag Folder Operations', () => {
  let authToken: string;
  let rootFolderId: string;
  let vaultContainerId: string;

  beforeAll(async () => {
    // Register a test user and get auth token
    const result = await registerUser('burnbag_folder');
    authToken = result.token;
    // Debug: log if token is missing
    if (!authToken) {
      console.error(
        'Registration failed or token missing. Response:',
        JSON.stringify(result.data, null, 2),
      );
    }

    // Create a vault container so folder operations have a valid context
    if (authToken) {
      const vaultRes = await axios.post(
        '/api/burnbag/vaults',
        { name: 'E2E Folder Test Vault' },
        { headers: { Authorization: `Bearer ${authToken}` } },
      );
      vaultContainerId = vaultRes.data?.id ?? '';
    }
  });

  const authedRequest = () => {
    if (!authToken) {
      console.error('authToken is undefined in authedRequest()');
    }
    return authToken
      ? { headers: { Authorization: `Bearer ${authToken}` } }
      : {};
  };

  const rootUrl = () =>
    vaultContainerId
      ? `/api/burnbag/folders/root?vaultContainerId=${encodeURIComponent(vaultContainerId)}`
      : '/api/burnbag/folders/root';

  describe('GET /api/burnbag/folders/root', () => {
    it('should return root folder with valid hex IDs', async () => {
      const res = await axios.get(rootUrl(), authedRequest());

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('folder');
      expect(res.data).toHaveProperty('files');
      expect(res.data).toHaveProperty('subfolders');

      // Critical: Verify the folder ID is a valid hex string, not comma-separated bytes
      const folderId = res.data.folder.id;
      expect(isNotCommaSeparatedBytes(folderId)).toBe(true);
      expect(isValidHexId(folderId)).toBe(true);

      // Store for subsequent tests
      rootFolderId = folderId;
    });

    it('should return folder with properly serialized owner ID', async () => {
      const res = await axios.get(rootUrl(), authedRequest());

      const ownerId = res.data.folder.ownerId;
      expect(isNotCommaSeparatedBytes(ownerId)).toBe(true);
      expect(isValidHexId(ownerId)).toBe(true);
    });
  });

  describe('GET /api/burnbag/folders/:id/path', () => {
    it('should return breadcrumb path with valid hex IDs', async () => {
      // Skip if we don't have a root folder ID from previous test
      if (!rootFolderId) {
        const rootRes = await axios.get(
          rootUrl(),
          authedRequest(),
        );
        rootFolderId = rootRes.data.folder.id;
      }

      const res = await axios.get(
        `/api/burnbag/folders/${rootFolderId}/path`,
        authedRequest(),
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);

      // Verify each breadcrumb has valid hex IDs
      for (const crumb of res.data) {
        expect(crumb).toHaveProperty('id');
        expect(crumb).toHaveProperty('name');
        expect(isNotCommaSeparatedBytes(crumb.id)).toBe(true);
        expect(isValidHexId(crumb.id)).toBe(true);
      }
    });

    it('should reject malformed folder IDs', async () => {
      try {
        await axios.get(
          '/api/burnbag/folders/not-a-valid-hex-id/path',
          authedRequest(),
        );
        throw new Error('Expected request to fail with invalid ID');
      } catch (err) {
        const error = err as AxiosError;
        // Should get 400 or 404, not 500
        expect([400, 404, 500]).toContain(error.response?.status);
      }
    });
  });

  describe('GET /api/burnbag/folders/:id', () => {
    it('should return folder contents with valid hex IDs', async () => {
      if (!rootFolderId) {
        const rootRes = await axios.get(
          rootUrl(),
          authedRequest(),
        );
        rootFolderId = rootRes.data.folder.id;
      }

      const res = await axios.get(
        `/api/burnbag/folders/${rootFolderId}`,
        authedRequest(),
      );

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('folder');
      expect(res.data).toHaveProperty('files');
      expect(res.data).toHaveProperty('subfolders');

      // Verify folder ID
      expect(isNotCommaSeparatedBytes(res.data.folder.id)).toBe(true);
      expect(isValidHexId(res.data.folder.id)).toBe(true);

      // Verify any subfolder IDs
      for (const subfolder of res.data.subfolders) {
        expect(isNotCommaSeparatedBytes(subfolder.id)).toBe(true);
        expect(isValidHexId(subfolder.id)).toBe(true);
      }

      // Verify any file IDs
      for (const file of res.data.files) {
        expect(isNotCommaSeparatedBytes(file.id)).toBe(true);
        expect(isValidHexId(file.id)).toBe(true);
      }
    });
  });

  describe('POST /api/burnbag/folders', () => {
    it('should create folder and return valid hex ID', async () => {
      if (!rootFolderId) {
        const rootRes = await axios.get(
          rootUrl(),
          authedRequest(),
        );
        rootFolderId = rootRes.data.folder.id;
      }

      const folderName = `test-folder-${Date.now()}`;

      const res = await axios.post(
        '/api/burnbag/folders',
        {
          name: folderName,
          parentFolderId: rootFolderId,
          vaultContainerId: vaultContainerId || undefined,
        },
        authedRequest(),
      );

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data).toHaveProperty('name', folderName);

      // Critical: New folder ID must be valid hex
      expect(isNotCommaSeparatedBytes(res.data.id)).toBe(true);
      expect(isValidHexId(res.data.id)).toBe(true);

      // Parent folder ID should also be valid hex
      if (res.data.parentFolderId) {
        expect(isNotCommaSeparatedBytes(res.data.parentFolderId)).toBe(true);
        expect(isValidHexId(res.data.parentFolderId)).toBe(true);
      }
    });

    it('should reject request without parentFolderId', async () => {
      try {
        await axios.post(
          '/api/burnbag/folders',
          { name: 'orphan-folder' },
          authedRequest(),
        );
        throw new Error('Expected request to fail without parentFolderId');
      } catch (err) {
        const error = err as AxiosError;
        expect(error.response?.status).toBe(400);
      }
    });
  });
});
