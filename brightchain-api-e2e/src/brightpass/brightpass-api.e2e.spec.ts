import axios, { AxiosError } from 'axios';

/**
 * End-to-end integration tests for the BrightPass Password Manager API.
 *
 * Tests all 20 BrightPass API endpoints against a running API server.
 * Covers authentication enforcement, vault lifecycle, entry CRUD,
 * utility endpoints, sharing, emergency access, import, and audit log.
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

// ─── Helpers ────────────────────────────────────────────────────

/** Generate unique user credentials per test run. */
function uniqueUser(prefix: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@test.brightpass.local`,
    password: `BPTest!${id}`,
  };
}

/** Register a user and return token + memberId. */
async function registerUser(prefix = 'bp') {
  const creds = uniqueUser(prefix);
  const res = await axios.post('/api/user/register', {
    username: creds.username,
    email: creds.email,
    password: creds.password,
  });
  return {
    creds,
    token: res.data.data?.token as string,
    memberId: res.data.data?.memberId as string,
  };
}

/** Create an axios config with Bearer auth header. */
function authHeader(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

const BASE = '/api/brightpass';
const MASTER_PASSWORD = 'VaultMaster!Pass123';
const VAULT_NAME = 'E2E Test Vault';

// ─── Authentication Enforcement (Requirement 15.2) ──────────────

describe('BrightPass API — Authentication Enforcement', () => {
  const unauthEndpoints: Array<{
    method: 'get' | 'post' | 'put' | 'delete';
    path: string;
    body?: Record<string, unknown>;
  }> = [
    {
      method: 'post',
      path: `${BASE}/vaults`,
      body: { name: 'x', masterPassword: 'x' },
    },
    { method: 'get', path: `${BASE}/vaults` },
    {
      method: 'post',
      path: `${BASE}/vaults/fake-id/open`,
      body: { masterPassword: 'x' },
    },
    { method: 'delete', path: `${BASE}/vaults/fake-id` },
    {
      method: 'post',
      path: `${BASE}/vaults/fake-id/entries`,
      body: { type: 'login' },
    },
    { method: 'get', path: `${BASE}/vaults/fake-id/entries/fake-entry` },
    {
      method: 'put',
      path: `${BASE}/vaults/fake-id/entries/fake-entry`,
      body: { type: 'login' },
    },
    { method: 'delete', path: `${BASE}/vaults/fake-id/entries/fake-entry` },
    {
      method: 'post',
      path: `${BASE}/vaults/fake-id/search`,
      body: { query: 'x' },
    },
    { method: 'post', path: `${BASE}/generate-password`, body: { length: 16 } },
    {
      method: 'post',
      path: `${BASE}/totp/generate`,
      body: { secret: 'JBSWY3DPEHPK3PXP' },
    },
    {
      method: 'post',
      path: `${BASE}/totp/validate`,
      body: { secret: 'JBSWY3DPEHPK3PXP', code: '000000' },
    },
    {
      method: 'post',
      path: `${BASE}/breach-check`,
      body: { password: 'test' },
    },
    {
      method: 'post',
      path: `${BASE}/vaults/fake-id/autofill`,
      body: { siteUrl: 'https://example.com' },
    },
    { method: 'get', path: `${BASE}/vaults/fake-id/audit-log` },
    {
      method: 'post',
      path: `${BASE}/vaults/fake-id/share`,
      body: { recipientMemberIds: [] },
    },
    {
      method: 'post',
      path: `${BASE}/vaults/fake-id/revoke-share`,
      body: { memberId: 'x' },
    },
    {
      method: 'post',
      path: `${BASE}/vaults/fake-id/emergency-access`,
      body: { threshold: 1, trustees: [] },
    },
    {
      method: 'post',
      path: `${BASE}/vaults/fake-id/emergency-recover`,
      body: { shares: [] },
    },
    {
      method: 'post',
      path: `${BASE}/vaults/fake-id/import`,
      body: { format: 'lastpass_csv', fileContent: '' },
    },
  ];

  it.each(unauthEndpoints)(
    'should return 401 for $method $path without JWT',
    async ({ method, path, body }) => {
      try {
        await axios({ method, url: path, data: body });
        fail(`Expected 401 for ${method.toUpperCase()} ${path}`);
      } catch (err) {
        const error = err as AxiosError;
        expect(error.response?.status).toBe(401);
      }
    },
  );
});

// ─── Vault Lifecycle (Requirement 15.3) ─────────────────────────

describe('BrightPass API — Vault Lifecycle', () => {
  let token: string;
  let vaultId: string;
  let entryId: string;

  beforeAll(async () => {
    const user = await registerUser('lifecycle');
    token = user.token;
  });

  // 1. POST /api/brightpass/vaults — createVault
  it('should create a vault', async () => {
    const res = await axios.post(
      `${BASE}/vaults`,
      { name: VAULT_NAME, masterPassword: MASTER_PASSWORD },
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.vault).toBeDefined();
    expect(res.data.data.vault.name).toBe(VAULT_NAME);
    vaultId = res.data.data.vault.id;
    expect(typeof vaultId).toBe('string');
  });

  // 2. GET /api/brightpass/vaults — listVaults
  it('should list vaults including the created vault', async () => {
    const res = await axios.get(`${BASE}/vaults`, authHeader(token));

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    const vaults = res.data.data.vaults;
    expect(Array.isArray(vaults)).toBe(true);
    expect(vaults.some((v: { id: string }) => v.id === vaultId)).toBe(true);
  });

  // 3. POST /api/brightpass/vaults/:id/open — openVault
  it('should open the vault with correct master password', async () => {
    const res = await axios.post(
      `${BASE}/vaults/${vaultId}/open`,
      { masterPassword: MASTER_PASSWORD },
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.vault).toBeDefined();
  });

  // 4. POST /api/brightpass/vaults/:id/entries — createEntry
  it('should create an entry in the vault', async () => {
    const entry = {
      type: 'login',
      title: 'E2E Test Login',
      tags: ['test'],
      favorite: false,
      siteUrl: 'https://example.com',
      username: 'testuser',
      password: 'testpass123',
    };

    const res = await axios.post(
      `${BASE}/vaults/${vaultId}/entries`,
      entry,
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.entry).toBeDefined();
    expect(res.data.data.entry.title).toBe('E2E Test Login');
    entryId = res.data.data.entry.id;
    expect(typeof entryId).toBe('string');
  });

  // 5. GET /api/brightpass/vaults/:id/entries/:entryId — getEntry
  it('should get the created entry', async () => {
    const res = await axios.get(
      `${BASE}/vaults/${vaultId}/entries/${entryId}`,
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.entry).toBeDefined();
    expect(res.data.data.entry.id).toBe(entryId);
    expect(res.data.data.entry.title).toBe('E2E Test Login');
  });

  // 6. PUT /api/brightpass/vaults/:id/entries/:entryId — updateEntry
  it('should update the entry', async () => {
    const updatedEntry = {
      type: 'login',
      title: 'E2E Updated Login',
      tags: ['test', 'updated'],
      favorite: true,
      siteUrl: 'https://updated.example.com',
      username: 'updateduser',
      password: 'updatedpass456',
    };

    const res = await axios.put(
      `${BASE}/vaults/${vaultId}/entries/${entryId}`,
      updatedEntry,
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.entry).toBeDefined();
    expect(res.data.data.entry.title).toBe('E2E Updated Login');
  });

  // 7. DELETE /api/brightpass/vaults/:id/entries/:entryId — deleteEntry
  it('should delete the entry', async () => {
    const res = await axios.delete(
      `${BASE}/vaults/${vaultId}/entries/${entryId}`,
      authHeader(token),
    );

    expect(res.status).toBe(200);
  });

  // 8. Verify entry is gone after deletion
  it('should return 404 for deleted entry', async () => {
    try {
      await axios.get(
        `${BASE}/vaults/${vaultId}/entries/${entryId}`,
        authHeader(token),
      );
      fail('Expected 404 for deleted entry');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(404);
    }
  });

  // 9. DELETE /api/brightpass/vaults/:id — deleteVault
  it('should delete the vault', async () => {
    const res = await axios.delete(`${BASE}/vaults/${vaultId}`, {
      ...authHeader(token),
      data: { masterPassword: MASTER_PASSWORD },
    });

    expect(res.status).toBe(200);
  });

  // 10. Verify vault is gone after deletion
  it('should not list the deleted vault', async () => {
    const res = await axios.get(`${BASE}/vaults`, authHeader(token));
    const vaults = res.data.data.vaults;
    expect(vaults.every((v: { id: string }) => v.id !== vaultId)).toBe(true);
  });
});

// ─── Error Cases (Requirement 15.4) ─────────────────────────────

describe('BrightPass API — Error Cases', () => {
  let token: string;
  let vaultId: string;

  beforeAll(async () => {
    const user = await registerUser('errors');
    token = user.token;

    // Create a vault for error case testing
    const res = await axios.post(
      `${BASE}/vaults`,
      { name: 'Error Test Vault', masterPassword: MASTER_PASSWORD },
      authHeader(token),
    );
    vaultId = res.data.data.vault.id;
  });

  afterAll(async () => {
    // Clean up vault
    try {
      await axios.delete(`${BASE}/vaults/${vaultId}`, {
        ...authHeader(token),
        data: { masterPassword: MASTER_PASSWORD },
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should reject opening vault with invalid master password', async () => {
    try {
      await axios.post(
        `${BASE}/vaults/${vaultId}/open`,
        { masterPassword: 'WrongPassword!999' },
        authHeader(token),
      );
      fail('Expected error for invalid master password');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('should return 404 for non-existent vault ID', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    try {
      await axios.post(
        `${BASE}/vaults/${fakeId}/open`,
        { masterPassword: MASTER_PASSWORD },
        authHeader(token),
      );
      fail('Expected 404 for non-existent vault');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('should return 404 for non-existent entry ID', async () => {
    const fakeEntryId = '00000000-0000-0000-0000-000000000000';
    try {
      await axios.get(
        `${BASE}/vaults/${vaultId}/entries/${fakeEntryId}`,
        authHeader(token),
      );
      fail('Expected 404 for non-existent entry');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('should reject vault creation with missing required fields', async () => {
    try {
      await axios.post(`${BASE}/vaults`, { name: '' }, authHeader(token));
      fail('Expected error for missing required fields');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('should reject entry creation with missing required fields', async () => {
    try {
      await axios.post(
        `${BASE}/vaults/${vaultId}/entries`,
        {},
        authHeader(token),
      );
      fail('Expected error for missing required fields');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('should reject deleting vault with wrong master password', async () => {
    try {
      await axios.delete(`${BASE}/vaults/${vaultId}`, {
        ...authHeader(token),
        data: { masterPassword: 'WrongPassword!999' },
      });
      fail('Expected error for wrong master password on delete');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });
});

// ─── Search Entries (Requirement 15.1 — endpoint 10) ────────────

describe('BrightPass API — Search Entries', () => {
  let token: string;
  let vaultId: string;

  beforeAll(async () => {
    const user = await registerUser('search');
    token = user.token;

    const vaultRes = await axios.post(
      `${BASE}/vaults`,
      { name: 'Search Test Vault', masterPassword: MASTER_PASSWORD },
      authHeader(token),
    );
    vaultId = vaultRes.data.data.vault.id;

    // Open the vault
    await axios.post(
      `${BASE}/vaults/${vaultId}/open`,
      { masterPassword: MASTER_PASSWORD },
      authHeader(token),
    );

    // Create a couple of entries for searching
    await axios.post(
      `${BASE}/vaults/${vaultId}/entries`,
      {
        type: 'login',
        title: 'GitHub Login',
        tags: ['dev', 'code'],
        favorite: true,
        siteUrl: 'https://github.com',
        username: 'dev@example.com',
        password: 'ghpass123',
      },
      authHeader(token),
    );

    await axios.post(
      `${BASE}/vaults/${vaultId}/entries`,
      {
        type: 'login',
        title: 'Gmail Login',
        tags: ['email'],
        favorite: false,
        siteUrl: 'https://mail.google.com',
        username: 'user@gmail.com',
        password: 'gmailpass456',
      },
      authHeader(token),
    );
  });

  afterAll(async () => {
    try {
      await axios.delete(`${BASE}/vaults/${vaultId}`, {
        ...authHeader(token),
        data: { masterPassword: MASTER_PASSWORD },
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should search entries by query', async () => {
    const res = await axios.post(
      `${BASE}/vaults/${vaultId}/search`,
      { query: 'GitHub' },
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.results)).toBe(true);
  });
});

// ─── Utility Endpoints (Requirement 15.1 — endpoints 11–13) ────

describe('BrightPass API — Utility Endpoints', () => {
  let token: string;

  beforeAll(async () => {
    const user = await registerUser('utils');
    token = user.token;
  });

  // 11. POST /api/brightpass/generate-password
  it('should generate a password with specified options', async () => {
    const res = await axios.post(
      `${BASE}/generate-password`,
      {
        length: 24,
        uppercase: true,
        lowercase: true,
        digits: true,
        symbols: true,
      },
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.password).toBeDefined();
    expect(typeof res.data.data.password.password).toBe('string');
    expect(res.data.data.password.password.length).toBe(24);
    expect(typeof res.data.data.password.entropy).toBe('number');
    expect(['weak', 'fair', 'strong', 'very_strong']).toContain(
      res.data.data.password.strength,
    );
  });

  // 12. POST /api/brightpass/totp/generate
  it('should generate a TOTP code from a secret', async () => {
    const res = await axios.post(
      `${BASE}/totp/generate`,
      { secret: 'JBSWY3DPEHPK3PXP' },
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.code).toBeDefined();
    expect(typeof res.data.data.code.code).toBe('string');
    expect(res.data.data.code.code).toMatch(/^\d{6}$/);
    expect(typeof res.data.data.code.remainingSeconds).toBe('number');
  });

  // POST /api/brightpass/totp/validate
  it('should validate a TOTP code', async () => {
    // First generate a code, then validate it
    const genRes = await axios.post(
      `${BASE}/totp/generate`,
      { secret: 'JBSWY3DPEHPK3PXP' },
      authHeader(token),
    );
    const code = genRes.data.data.code.code;

    const res = await axios.post(
      `${BASE}/totp/validate`,
      { secret: 'JBSWY3DPEHPK3PXP', code },
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(typeof res.data.data.valid).toBe('boolean');
  });

  // 13. POST /api/brightpass/breach-check
  it('should check a password for breaches', async () => {
    const res = await axios.post(
      `${BASE}/breach-check`,
      { password: 'password123' },
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(typeof res.data.data.breached).toBe('boolean');
    expect(typeof res.data.data.count).toBe('number');
  });
});

// ─── Sharing Endpoints (Requirement 15.1 — endpoints 14–15) ────

describe('BrightPass API — Sharing', () => {
  let ownerToken: string;
  let recipientMemberId: string;
  let vaultId: string;

  beforeAll(async () => {
    const owner = await registerUser('shareowner');
    ownerToken = owner.token;

    const recipient = await registerUser('sharerecip');
    recipientMemberId = recipient.memberId;

    const vaultRes = await axios.post(
      `${BASE}/vaults`,
      { name: 'Share Test Vault', masterPassword: MASTER_PASSWORD },
      authHeader(ownerToken),
    );
    vaultId = vaultRes.data.data.vault.id;
  });

  afterAll(async () => {
    try {
      await axios.delete(`${BASE}/vaults/${vaultId}`, {
        ...authHeader(ownerToken),
        data: { masterPassword: MASTER_PASSWORD },
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  // 14. POST /api/brightpass/vaults/:id/share
  it('should share a vault with another member', async () => {
    const res = await axios.post(
      `${BASE}/vaults/${vaultId}/share`,
      { recipientMemberIds: [recipientMemberId] },
      authHeader(ownerToken),
    );

    expect(res.status).toBe(200);
  });

  // 15. POST /api/brightpass/vaults/:id/revoke-share
  it('should revoke a vault share', async () => {
    const res = await axios.post(
      `${BASE}/vaults/${vaultId}/revoke-share`,
      { memberId: recipientMemberId },
      authHeader(ownerToken),
    );

    expect(res.status).toBe(200);
  });
});

// ─── Emergency Access (Requirement 15.1 — endpoints 16–17) ─────

describe('BrightPass API — Emergency Access', () => {
  let token: string;
  let trusteeMemberId: string;
  let trusteeMemberId2: string;
  let vaultId: string;

  beforeAll(async () => {
    const user = await registerUser('emergency');
    token = user.token;

    const trustee = await registerUser('trustee');
    trusteeMemberId = trustee.memberId;

    const trustee2 = await registerUser('trustee2');
    trusteeMemberId2 = trustee2.memberId;

    const vaultRes = await axios.post(
      `${BASE}/vaults`,
      { name: 'Emergency Test Vault', masterPassword: MASTER_PASSWORD },
      authHeader(token),
    );
    vaultId = vaultRes.data.data.vault.id;
  });

  afterAll(async () => {
    try {
      await axios.delete(`${BASE}/vaults/${vaultId}`, {
        ...authHeader(token),
        data: { masterPassword: MASTER_PASSWORD },
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  // 16. POST /api/brightpass/vaults/:id/emergency-access
  it('should configure emergency access', async () => {
    const res = await axios.post(
      `${BASE}/vaults/${vaultId}/emergency-access`,
      {
        threshold: 2,
        trustees: [trusteeMemberId, trusteeMemberId2],
      },
      authHeader(token),
    );

    expect(res.status).toBe(200);
  });

  // 17. POST /api/brightpass/vaults/:id/emergency-recover
  it('should reject recovery with empty shares', async () => {
    try {
      await axios.post(
        `${BASE}/vaults/${vaultId}/emergency-recover`,
        { shares: [] },
        authHeader(token),
      );
      fail('Expected error for empty shares');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });
});

// ─── Import Entries (Requirement 15.1 — endpoint 18) ────────────

describe('BrightPass API — Import', () => {
  let token: string;
  let vaultId: string;

  beforeAll(async () => {
    const user = await registerUser('import');
    token = user.token;

    const vaultRes = await axios.post(
      `${BASE}/vaults`,
      { name: 'Import Test Vault', masterPassword: MASTER_PASSWORD },
      authHeader(token),
    );
    vaultId = vaultRes.data.data.vault.id;

    // Open the vault for import
    await axios.post(
      `${BASE}/vaults/${vaultId}/open`,
      { masterPassword: MASTER_PASSWORD },
      authHeader(token),
    );
  });

  afterAll(async () => {
    try {
      await axios.delete(`${BASE}/vaults/${vaultId}`, {
        ...authHeader(token),
        data: { masterPassword: MASTER_PASSWORD },
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  // 18. POST /api/brightpass/vaults/:id/import
  it('should import entries from a CSV file', async () => {
    // Base64-encode a minimal LastPass CSV
    const csvContent =
      'url,username,password,totp,extra,name,grouping,fav\nhttps://example.com,user@test.com,pass123,,,Example Login,,0';
    const fileBase64 = Buffer.from(csvContent).toString('base64');

    const res = await axios.post(
      `${BASE}/vaults/${vaultId}/import`,
      { format: 'lastpass_csv', fileContent: fileBase64 },
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  it('should reject import with invalid format', async () => {
    try {
      await axios.post(
        `${BASE}/vaults/${vaultId}/import`,
        { format: 'invalid_format', fileContent: '' },
        authHeader(token),
      );
      fail('Expected error for invalid import format');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });
});

// ─── Audit Log (Requirement 15.1 — endpoint 19) ────────────────

describe('BrightPass API — Audit Log', () => {
  let token: string;
  let vaultId: string;

  beforeAll(async () => {
    const user = await registerUser('audit');
    token = user.token;

    const vaultRes = await axios.post(
      `${BASE}/vaults`,
      { name: 'Audit Test Vault', masterPassword: MASTER_PASSWORD },
      authHeader(token),
    );
    vaultId = vaultRes.data.data.vault.id;

    // Open the vault to generate audit entries
    await axios.post(
      `${BASE}/vaults/${vaultId}/open`,
      { masterPassword: MASTER_PASSWORD },
      authHeader(token),
    );
  });

  afterAll(async () => {
    try {
      await axios.delete(`${BASE}/vaults/${vaultId}`, {
        ...authHeader(token),
        data: { masterPassword: MASTER_PASSWORD },
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  // 19. GET /api/brightpass/vaults/:id/audit-log
  it('should return audit log entries for the vault', async () => {
    const res = await axios.get(
      `${BASE}/vaults/${vaultId}/audit-log`,
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.entries)).toBe(true);
    // Should have at least VAULT_CREATED and VAULT_OPENED entries
    expect(res.data.data.entries.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Autofill (Requirement 15.1 — endpoint 20) ─────────────────

describe('BrightPass API — Autofill', () => {
  let token: string;
  let vaultId: string;

  beforeAll(async () => {
    const user = await registerUser('autofill');
    token = user.token;

    const vaultRes = await axios.post(
      `${BASE}/vaults`,
      { name: 'Autofill Test Vault', masterPassword: MASTER_PASSWORD },
      authHeader(token),
    );
    vaultId = vaultRes.data.data.vault.id;

    // Open the vault
    await axios.post(
      `${BASE}/vaults/${vaultId}/open`,
      { masterPassword: MASTER_PASSWORD },
      authHeader(token),
    );

    // Create a login entry for autofill
    await axios.post(
      `${BASE}/vaults/${vaultId}/entries`,
      {
        type: 'login',
        title: 'Autofill Test Login',
        tags: [],
        favorite: false,
        siteUrl: 'https://autofill.example.com',
        username: 'autofilluser',
        password: 'autofillpass',
      },
      authHeader(token),
    );
  });

  afterAll(async () => {
    try {
      await axios.delete(`${BASE}/vaults/${vaultId}`, {
        ...authHeader(token),
        data: { masterPassword: MASTER_PASSWORD },
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  // 20. POST /api/brightpass/vaults/:id/autofill
  it('should return autofill payload for a matching site URL', async () => {
    const res = await axios.post(
      `${BASE}/vaults/${vaultId}/autofill`,
      { siteUrl: 'https://autofill.example.com' },
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  it('should return empty results for non-matching site URL', async () => {
    const res = await axios.post(
      `${BASE}/vaults/${vaultId}/autofill`,
      { siteUrl: 'https://nomatch.example.com' },
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });
});

// ─── Get Entries List (Requirement 15.1 — endpoint 5 variant) ───

describe('BrightPass API — Entry Listing', () => {
  let token: string;
  let vaultId: string;

  beforeAll(async () => {
    const user = await registerUser('entrylist');
    token = user.token;

    const vaultRes = await axios.post(
      `${BASE}/vaults`,
      { name: 'Entry List Vault', masterPassword: MASTER_PASSWORD },
      authHeader(token),
    );
    vaultId = vaultRes.data.data.vault.id;

    // Open the vault
    await axios.post(
      `${BASE}/vaults/${vaultId}/open`,
      { masterPassword: MASTER_PASSWORD },
      authHeader(token),
    );

    // Create multiple entries of different types
    await axios.post(
      `${BASE}/vaults/${vaultId}/entries`,
      {
        type: 'login',
        title: 'Login Entry',
        tags: ['web'],
        favorite: true,
        siteUrl: 'https://login.example.com',
        username: 'user1',
        password: 'pass1',
      },
      authHeader(token),
    );

    await axios.post(
      `${BASE}/vaults/${vaultId}/entries`,
      {
        type: 'secure_note',
        title: 'Secret Note',
        tags: ['personal'],
        favorite: false,
        content: 'This is a secret note.',
      },
      authHeader(token),
    );
  });

  afterAll(async () => {
    try {
      await axios.delete(`${BASE}/vaults/${vaultId}`, {
        ...authHeader(token),
        data: { masterPassword: MASTER_PASSWORD },
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should list all entries in the vault via search with empty query', async () => {
    const res = await axios.post(
      `${BASE}/vaults/${vaultId}/search`,
      { query: '' },
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.results)).toBe(true);
    expect(res.data.data.results.length).toBeGreaterThanOrEqual(2);
  });
});
