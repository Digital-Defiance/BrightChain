/**
 * BrightPass API E2E Tests
 *
 * HTTP-level tests for the BrightPass password manager API routes.
 * Uses axios directly against the running server (same pattern as
 * user-management.e2e.spec.ts in brightchain-api-e2e).
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9
 */
import { expect, test } from '@playwright/test';
import axios from 'axios';
import fc from 'fast-check';
import { registerViaApi, type AuthResult } from './fixtures';

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3000';

/** Create an axios config with Bearer auth header. */
function authHeader(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

// ─── Vault CRUD Lifecycle ───────────────────────────────────────────────────

test.describe('BrightPass Vault CRUD Lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  let auth: AuthResult;
  let vaultId: string;
  const vaultName = `e2e-vault-${Date.now()}`;
  const masterPassword = 'MasterPass!123';

  test.beforeAll(async () => {
    auth = await registerViaApi(BASE_URL);
  });

  test('should create a vault (POST /api/brightpass/vaults)', async () => {
    const res = await axios.post(
      `${BASE_URL}/api/brightpass/vaults`,
      { name: vaultName, masterPassword },
      authHeader(auth.token),
    );
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.vault).toBeDefined();
    vaultId = res.data.data.vault.id;
    expect(typeof vaultId).toBe('string');
    expect(vaultId.length).toBeGreaterThan(0);
  });

  test('should list vaults and include the created vault (GET /api/brightpass/vaults)', async () => {
    const res = await axios.get(
      `${BASE_URL}/api/brightpass/vaults`,
      authHeader(auth.token),
    );
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    const vaults = res.data.data.vaults as Array<{ id: string; name: string }>;
    expect(Array.isArray(vaults)).toBe(true);
    const found = vaults.find((v) => v.id === vaultId);
    expect(found).toBeDefined();
    expect(found?.name).toBe(vaultName);
  });

  test('should open the vault with correct master password (POST /api/brightpass/vaults/:vaultId/open)', async () => {
    const res = await axios.post(
      `${BASE_URL}/api/brightpass/vaults/${vaultId}/open`,
      { masterPassword },
      authHeader(auth.token),
    );
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  test('should delete the vault (DELETE /api/brightpass/vaults/:vaultId)', async () => {
    const res = await axios.delete(
      `${BASE_URL}/api/brightpass/vaults/${vaultId}`,
      {
        ...authHeader(auth.token),
        data: { masterPassword },
      },
    );
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  test('should return not-found for deleted vault (GET /api/brightpass/vaults after delete)', async () => {
    const res = await axios.get(
      `${BASE_URL}/api/brightpass/vaults`,
      authHeader(auth.token),
    );
    expect(res.status).toBe(200);
    const vaults = res.data.data.vaults as Array<{ id: string }>;
    const found = vaults.find((v) => v.id === vaultId);
    expect(found).toBeUndefined();
  });
});

// ─── Entry CRUD Lifecycle ───────────────────────────────────────────────────

test.describe('BrightPass Entry CRUD Lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  let auth: AuthResult;
  let vaultId: string;
  let entryId: string;
  const masterPassword = 'MasterPass!456';
  const entryData = {
    type: 'login' as const,
    title: 'E2E Test Entry',
    siteUrl: 'https://example.com',
    username: 'testuser',
    password: 'entryPass!789',
    favorite: false,
  };

  test.beforeAll(async () => {
    auth = await registerViaApi(BASE_URL);
    // Create and open a vault for entry tests
    const createRes = await axios.post(
      `${BASE_URL}/api/brightpass/vaults`,
      { name: `entry-test-vault-${Date.now()}`, masterPassword },
      authHeader(auth.token),
    );
    vaultId = createRes.data.data.vault.id;
    await axios.post(
      `${BASE_URL}/api/brightpass/vaults/${vaultId}/open`,
      { masterPassword },
      authHeader(auth.token),
    );
  });

  test('should create an entry (POST /api/brightpass/vaults/:vaultId/entries)', async () => {
    const res = await axios.post(
      `${BASE_URL}/api/brightpass/vaults/${vaultId}/entries`,
      entryData,
      authHeader(auth.token),
    );
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.entry).toBeDefined();
    entryId = res.data.data.entry.id;
    expect(typeof entryId).toBe('string');
  });

  test('should get the entry and verify data matches (GET /api/brightpass/vaults/:vaultId/entries/:entryId)', async () => {
    const res = await axios.get(
      `${BASE_URL}/api/brightpass/vaults/${vaultId}/entries/${entryId}`,
      authHeader(auth.token),
    );
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    const entry = res.data.data.entry;
    expect(entry.id).toBe(entryId);
    expect(entry.type).toBe('login');
    expect(entry.title).toBe(entryData.title);
    expect(entry.siteUrl).toBe(entryData.siteUrl);
    expect(entry.username).toBe(entryData.username);
    expect(entry.password).toBe(entryData.password);
  });

  test('should update the entry (PUT /api/brightpass/vaults/:vaultId/entries/:entryId)', async () => {
    const res = await axios.put(
      `${BASE_URL}/api/brightpass/vaults/${vaultId}/entries/${entryId}`,
      { title: 'Updated Entry', password: 'newPass!999' },
      authHeader(auth.token),
    );
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  test('should get the updated entry and verify changes (GET after update)', async () => {
    const res = await axios.get(
      `${BASE_URL}/api/brightpass/vaults/${vaultId}/entries/${entryId}`,
      authHeader(auth.token),
    );
    expect(res.status).toBe(200);
    const entry = res.data.data.entry;
    expect(entry.title).toBe('Updated Entry');
    expect(entry.password).toBe('newPass!999');
  });

  test('should delete the entry (DELETE /api/brightpass/vaults/:vaultId/entries/:entryId)', async () => {
    const res = await axios.delete(
      `${BASE_URL}/api/brightpass/vaults/${vaultId}/entries/${entryId}`,
      authHeader(auth.token),
    );
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  test('should return not-found for deleted entry', async () => {
    try {
      await axios.get(
        `${BASE_URL}/api/brightpass/vaults/${vaultId}/entries/${entryId}`,
        authHeader(auth.token),
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        expect(err.response?.status).toBe(404);
      } else {
        throw err;
      }
    }
  });
});

// ─── Password Generation ────────────────────────────────────────────────────

test.describe('BrightPass Password Generation', () => {
  let auth: AuthResult;

  test.beforeAll(async () => {
    auth = await registerViaApi(BASE_URL);
  });

  test('should generate a non-empty password (POST /api/brightpass/generate-password)', async () => {
    const res = await axios.post(
      `${BASE_URL}/api/brightpass/generate-password`,
      {
        length: 16,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
      },
      authHeader(auth.token),
    );
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    // API returns { password: { password: string, entropy, strength } }
    expect(typeof res.data.data.password.password).toBe('string');
    expect(res.data.data.password.password.length).toBeGreaterThan(0);
  });
});

// ─── Property-Based Tests ───────────────────────────────────────────────────

test.describe('BrightPass Property Tests', () => {
  // Feature: comprehensive-e2e-tests, Property 3: Vault CRUD round-trip
  test('Property 3: Vault CRUD round-trip — create, list, open for arbitrary names and passwords', async () => {
    /**
     * For any valid vault name and master password, creating a vault via
     * POST /api/brightpass/vaults should return a vault ID, and subsequently
     * listing vaults should include that vault, and opening it with the same
     * master password should succeed.
     *
     * **Validates: Requirements 4.1, 4.2, 4.3**
     */
    const auth = await registerViaApi(BASE_URL);

    await fc.assert(
      fc.asyncProperty(
        // Vault names: non-empty alphanumeric strings (avoid special chars that might cause issues)
        fc.stringMatching(/^[a-zA-Z0-9 _-]{1,50}$/),
        // Master passwords: at least 8 chars with mixed content
        fc
          .string({ minLength: 8, maxLength: 64 })
          .filter((s) => s.trim().length >= 8),
        async (vaultName: string, masterPassword: string) => {
          // Create vault
          const createRes = await axios.post(
            `${BASE_URL}/api/brightpass/vaults`,
            { name: vaultName, masterPassword },
            authHeader(auth.token),
          );
          expect(createRes.status).toBe(200);
          expect(createRes.data.success).toBe(true);
          const createdVaultId = createRes.data.data.vault.id;
          expect(typeof createdVaultId).toBe('string');

          // List vaults — should include the created vault
          const listRes = await axios.get(
            `${BASE_URL}/api/brightpass/vaults`,
            authHeader(auth.token),
          );
          expect(listRes.status).toBe(200);
          const vaults = listRes.data.data.vaults as Array<{ id: string }>;
          const found = vaults.find((v) => v.id === createdVaultId);
          expect(found).toBeDefined();

          // Open vault with same master password
          const openRes = await axios.post(
            `${BASE_URL}/api/brightpass/vaults/${createdVaultId}/open`,
            { masterPassword },
            authHeader(auth.token),
          );
          expect(openRes.status).toBe(200);
          expect(openRes.data.success).toBe(true);

          // Cleanup: delete the vault
          await axios.delete(
            `${BASE_URL}/api/brightpass/vaults/${createdVaultId}`,
            { ...authHeader(auth.token), data: { masterPassword } },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: comprehensive-e2e-tests, Property 4: Entry CRUD round-trip
  test('Property 4: Entry CRUD round-trip — create, get, update, get for arbitrary entry data', async () => {
    /**
     * For any valid entry data (site URL, username, password), creating an entry
     * in an open vault should return an entry ID, and subsequently retrieving that
     * entry should return data matching the original input, and updating the entry
     * via PUT then retrieving again should return the updated data.
     *
     * **Validates: Requirements 4.4, 4.5, 4.6**
     */
    const auth = await registerViaApi(BASE_URL);
    const masterPassword = 'PropTestMaster!1';

    // Create and open a vault for entry property tests
    const vaultRes = await axios.post(
      `${BASE_URL}/api/brightpass/vaults`,
      { name: `prop4-vault-${Date.now()}`, masterPassword },
      authHeader(auth.token),
    );
    const propVaultId = vaultRes.data.data.vault.id;
    await axios.post(
      `${BASE_URL}/api/brightpass/vaults/${propVaultId}/open`,
      { masterPassword },
      authHeader(auth.token),
    );

    await fc.assert(
      fc.asyncProperty(
        // Site URLs: simple valid-looking URLs
        fc.webUrl(),
        // Usernames: non-empty alphanumeric
        fc.stringMatching(/^[a-zA-Z0-9_]{1,30}$/),
        // Passwords: non-empty strings
        fc
          .string({ minLength: 1, maxLength: 64 })
          .filter((s) => s.trim().length > 0),
        // Entry titles: non-empty strings
        fc.stringMatching(/^[a-zA-Z0-9 _-]{1,50}$/),
        async (
          siteUrl: string,
          username: string,
          password: string,
          title: string,
        ) => {
          // Create entry
          const createRes = await axios.post(
            `${BASE_URL}/api/brightpass/vaults/${propVaultId}/entries`,
            {
              type: 'login',
              title,
              siteUrl,
              username,
              password,
              favorite: false,
            },
            authHeader(auth.token),
          );
          expect(createRes.status).toBe(200);
          const createdEntryId = createRes.data.data.entry.id;

          // Get entry — verify data matches
          const getRes = await axios.get(
            `${BASE_URL}/api/brightpass/vaults/${propVaultId}/entries/${createdEntryId}`,
            authHeader(auth.token),
          );
          expect(getRes.status).toBe(200);
          const entry = getRes.data.data.entry;
          expect(entry.title).toBe(title);
          expect(entry.siteUrl).toBe(siteUrl);
          expect(entry.username).toBe(username);
          expect(entry.password).toBe(password);

          // Update entry
          const newTitle = `updated-${title}`;
          const newPassword = `updated-${password}`;
          const updateRes = await axios.put(
            `${BASE_URL}/api/brightpass/vaults/${propVaultId}/entries/${createdEntryId}`,
            { title: newTitle, password: newPassword },
            authHeader(auth.token),
          );
          expect(updateRes.status).toBe(200);

          // Get updated entry — verify changes
          const getUpdatedRes = await axios.get(
            `${BASE_URL}/api/brightpass/vaults/${propVaultId}/entries/${createdEntryId}`,
            authHeader(auth.token),
          );
          expect(getUpdatedRes.status).toBe(200);
          const updatedEntry = getUpdatedRes.data.data.entry;
          expect(updatedEntry.title).toBe(newTitle);
          expect(updatedEntry.password).toBe(newPassword);

          // Cleanup
          await axios.delete(
            `${BASE_URL}/api/brightpass/vaults/${propVaultId}/entries/${createdEntryId}`,
            authHeader(auth.token),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: comprehensive-e2e-tests, Property 5: Resource deletion prevents subsequent reads
  test('Property 5: Resource deletion prevents subsequent reads', async () => {
    /**
     * For any created vault or entry, deleting it via the corresponding DELETE
     * endpoint should cause subsequent GET requests for that resource to return
     * a not-found error response.
     *
     * **Validates: Requirements 4.7, 4.8**
     */
    const auth = await registerViaApi(BASE_URL);

    await fc.assert(
      fc.asyncProperty(
        // Vault names
        fc.stringMatching(/^[a-zA-Z0-9 _-]{1,30}$/),
        // Master passwords
        fc
          .string({ minLength: 8, maxLength: 32 })
          .filter((s) => s.trim().length >= 8),
        async (vaultName: string, masterPassword: string) => {
          // Create and open a vault
          const createRes = await axios.post(
            `${BASE_URL}/api/brightpass/vaults`,
            { name: vaultName, masterPassword },
            authHeader(auth.token),
          );
          const vid = createRes.data.data.vault.id;
          await axios.post(
            `${BASE_URL}/api/brightpass/vaults/${vid}/open`,
            { masterPassword },
            authHeader(auth.token),
          );

          // Create an entry in the vault
          const entryRes = await axios.post(
            `${BASE_URL}/api/brightpass/vaults/${vid}/entries`,
            {
              type: 'login',
              title: 'del-test',
              siteUrl: 'https://del.test',
              username: 'u',
              password: 'p',
              favorite: false,
            },
            authHeader(auth.token),
          );
          const eid = entryRes.data.data.entry.id;

          // Delete the entry
          await axios.delete(
            `${BASE_URL}/api/brightpass/vaults/${vid}/entries/${eid}`,
            authHeader(auth.token),
          );

          // Subsequent GET for the entry should return 404
          try {
            await axios.get(
              `${BASE_URL}/api/brightpass/vaults/${vid}/entries/${eid}`,
              authHeader(auth.token),
            );
            expect(true).toBe(false); // Should not reach here
          } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
              expect(err.response?.status).toBe(404);
            } else {
              throw err;
            }
          }

          // Delete the vault
          await axios.delete(`${BASE_URL}/api/brightpass/vaults/${vid}`, {
            ...authHeader(auth.token),
            data: { masterPassword },
          });

          // Subsequent listing should not include the vault
          const listRes = await axios.get(
            `${BASE_URL}/api/brightpass/vaults`,
            authHeader(auth.token),
          );
          const vaults = listRes.data.data.vaults as Array<{ id: string }>;
          expect(vaults.find((v) => v.id === vid)).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: comprehensive-e2e-tests, Property 6: Password generation returns non-empty string
  test('Property 6: Password generation returns non-empty string', async () => {
    /**
     * For any call to POST /api/brightpass/generate-password, the response
     * should contain a non-empty password string.
     *
     * **Validates: Requirements 4.9**
     */
    const auth = await registerViaApi(BASE_URL);

    await fc.assert(
      fc.asyncProperty(
        // Password length between 8 and 128
        fc.integer({ min: 8, max: 128 }),
        // Boolean flags for character sets (at least one must be true)
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        async (
          length: number,
          uppercase: boolean,
          lowercase: boolean,
          numbers: boolean,
          symbols: boolean,
        ) => {
          // Ensure at least one character set is enabled
          if (!uppercase && !lowercase && !numbers && !symbols) {
            lowercase = true;
          }

          const res = await axios.post(
            `${BASE_URL}/api/brightpass/generate-password`,
            { length, uppercase, lowercase, numbers, symbols },
            authHeader(auth.token),
          );
          expect(res.status).toBe(200);
          expect(res.data.success).toBe(true);
          // API returns { password: { password: string, entropy, strength } }
          expect(typeof res.data.data.password.password).toBe('string');
          expect(res.data.data.password.password.length).toBeGreaterThan(0);
          expect(res.data.data.password.password.length).toBe(length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
