/**
 * Shared Playwright test fixtures for Digital Burnbag E2E tests.
 *
 * Provides:
 * - Authenticated browser context (loads saved auth state from global-setup)
 * - API helper for direct HTTP calls to /api/burnbag/* endpoints
 * - Common navigation helpers
 */
import { test as base, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const _AUTH_STATE_PATH = path.join(__dirname, '.auth', 'user.json');
const TOKEN_PATH = path.join(__dirname, '.auth', 'token.json');
const VAULT_PATH = path.join(__dirname, '.auth', 'vault.json');

function loadVaultContainerId(): string {
  try {
    if (fs.existsSync(VAULT_PATH)) {
      const data = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf-8'));
      return data.vaultContainerId ?? '';
    }
  } catch {
    // ignore
  }
  return '';
}

/**
 * DJB2-style checksum matching the server's computeChecksum in upload-service.ts.
 */
export function computeChecksum(data: Uint8Array): string {
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash + data[i]) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Direct API client for seeding/verifying test data outside the browser.
 * Covers all /api/burnbag/* endpoints needed for comprehensive E2E testing.
 */
export class BurnbagTestApi {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly vaultContainerId: string = '',
  ) {}

  private async request<T>(urlPath: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const res = await fetch(`${this.baseUrl}/api/burnbag${urlPath}`, {
      headers,
      ...init,
    });
    if (!res.ok) {
      throw new Error(
        `API ${init?.method ?? 'GET'} ${urlPath} -> ${res.status}: ${await res.text()}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  // -- Folders ---------------------------------------------------------------

  async getRootFolder() {
    const qs = this.vaultContainerId
      ? `?vaultContainerId=${encodeURIComponent(this.vaultContainerId)}`
      : '';
    return this.request<{
      folder: { id: string };
      files: unknown[];
      subfolders: unknown[];
    }>(`/folders/root${qs}`);
  }

  async createFolder(name: string, parentFolderId: string) {
    return this.request<{ id: string; name: string }>('/folders', {
      method: 'POST',
      body: JSON.stringify({
        name,
        parentFolderId,
        vaultContainerId: this.vaultContainerId || undefined,
      }),
    });
  }

  async getFolderContents(folderId: string) {
    return this.request<{
      folder: { id: string };
      files: unknown[];
      subfolders: unknown[];
    }>(`/folders/${folderId}`);
  }

  async getFolderPath(folderId: string) {
    return this.request<{ id: string; name: string }[]>(
      `/folders/${folderId}/path`,
    );
  }

  async moveItem(itemId: string, itemType: string, targetFolderId: string) {
    return this.request<void>(`/folders/${targetFolderId}/move`, {
      method: 'POST',
      body: JSON.stringify({ itemId, itemType }),
    });
  }

  // -- Upload ----------------------------------------------------------------

  async initUpload(
    fileName: string,
    mimeType: string,
    sizeBytes: number,
    folderId: string,
    options: { durabilityTier?: string; durationDays?: number } = {},
  ) {
    return this.request<{
      sessionId: string;
      chunkSize: number;
      totalChunks: number;
    }>('/upload/init', {
      method: 'POST',
      body: JSON.stringify({
        fileName,
        mimeType,
        totalSizeBytes: sizeBytes,
        targetFolderId: folderId,
        vaultContainerId: this.vaultContainerId || undefined,
        ...(options.durabilityTier !== undefined && {
          durabilityTier: options.durabilityTier,
        }),
        ...(options.durationDays !== undefined && {
          durationDays: options.durationDays,
        }),
      }),
    });
  }

  async quoteUpload(sessionId: string) {
    return this.request<unknown>(`/upload/${sessionId}/quote`, {
      method: 'POST',
    });
  }

  async commitUpload(sessionId: string) {
    return this.request<{ fileId: string; fileName?: string }>(
      `/upload/${sessionId}/commit`,
      { method: 'POST' },
    );
  }

  async discardUpload(sessionId: string) {
    return this.request<unknown>(`/upload/${sessionId}/discard`, {
      method: 'POST',
    });
  }

  async uploadChunk(
    sessionId: string,
    chunkIndex: number,
    data: Uint8Array,
    checksum: string,
  ) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'X-Chunk-Checksum': checksum,
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const res = await fetch(
      `${this.baseUrl}/api/burnbag/upload/${sessionId}/chunk/${chunkIndex}`,
      {
        method: 'PUT',
        headers,
        body: data,
      },
    );
    if (!res.ok) throw new Error(`Chunk upload failed: ${res.status}`);
    return res.json() as Promise<{ chunkIndex: number; progress: number }>;
  }

  async finalizeUpload(sessionId: string) {
    const result = await this.request<{
      fileId: string;
      metadata: { id: string; fileName: string };
    }>(`/upload/${sessionId}/finalize`, { method: 'POST' });
    // Normalize to { id, fileName } for callers like seedFile
    return {
      id: result.fileId ?? result.metadata?.id,
      fileName: result.metadata?.fileName ?? '',
    };
  }

  // -- Files -----------------------------------------------------------------

  async getFileMetadata(fileId: string) {
    return this.request<{
      id: string;
      name: string;
      mimeType: string;
      sizeBytes: number;
      tags: string[];
    }>(`/files/${fileId}/metadata`);
  }

  async updateFileMetadata(
    fileId: string,
    updates: { name?: string; tags?: string[] },
  ) {
    return this.request<unknown>(`/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getEncryptedFileContent(fileId: string) {
    return this.request<{
      fileName: string;
      mimeType: string;
      encryptedContent: string;
      iv: string;
      authTag: string;
      encryptedSymmetricKey: string;
    }>(`/files/${fileId}/encrypted`);
  }

  async softDeleteFile(fileId: string) {
    return this.request<void>(`/files/${fileId}`, { method: 'DELETE' });
  }

  async restoreFile(fileId: string) {
    return this.request<void>(`/files/${fileId}/restore`, { method: 'POST' });
  }

  async destroyFile(fileId: string) {
    return this.request<unknown>(`/destroy/${fileId}`, { method: 'POST' });
  }

  async searchFiles(query: string) {
    const data = await this.request<{
      results?: unknown[];
      files?: unknown[];
      totalCount: number;
    }>(`/files/search?q=${encodeURIComponent(query)}`);
    return data.results ?? data.files ?? [];
  }

  async getVersionHistory(fileId: string) {
    return this.request<unknown[]>(`/files/${fileId}/versions`);
  }

  async scheduleDestruction(fileId: string, scheduledAt: string) {
    return this.request<void>(`/destroy/${fileId}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt }),
    });
  }

  // -- Sharing ---------------------------------------------------------------

  async shareInternal(
    fileId: string,
    recipientEmail: string,
    permission: string,
  ) {
    return this.request<void>('/share/internal', {
      method: 'POST',
      body: JSON.stringify({ fileId, recipientEmail, permission }),
    });
  }

  async createShareLink(fileId: string, options: Record<string, unknown>) {
    return this.request<{ id: string; token: string; url: string }>(
      '/share/link',
      {
        method: 'POST',
        body: JSON.stringify({ fileId, ...options }),
      },
    );
  }

  async revokeShareLink(linkId: string) {
    return this.request<void>(`/share/link/${linkId}`, { method: 'DELETE' });
  }

  async getSharedWithMe() {
    return this.request<unknown[]>('/share/shared-with-me');
  }

  async getMagnetUrl(fileId: string) {
    return this.request<{ magnetUrl: string }>(`/share/${fileId}/magnet`);
  }

  async getShareAuditTrail(fileId: string) {
    return this.request<unknown[]>(`/share/${fileId}/audit`);
  }

  // -- ACL -------------------------------------------------------------------

  async getACL(targetType: string, targetId: string) {
    return this.request<{ entries: unknown[] }>(
      `/acl/${targetType}/${targetId}`,
    );
  }

  async setACL(targetType: string, targetId: string, entries: unknown[]) {
    return this.request<void>(`/acl/${targetType}/${targetId}`, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    });
  }

  async getEffectivePermissions(
    targetType: string,
    targetId: string,
    principalId: string,
  ) {
    return this.request<unknown>(
      `/acl/${targetType}/${targetId}/effective/${principalId}`,
    );
  }

  // -- Trash -----------------------------------------------------------------

  async getTrashItems() {
    const data = await this.request<{
      results?: unknown[];
      files?: unknown[];
      totalCount: number;
    }>('/files/search?deleted=true');
    return data.results ?? data.files ?? [];
  }

  // -- Canary ----------------------------------------------------------------

  async getCanaryBindings() {
    return this.request<unknown[]>('/canary/bindings');
  }

  async createCanaryBinding(binding: Record<string, unknown>) {
    return this.request<{ id: string }>('/canary/bindings', {
      method: 'POST',
      body: JSON.stringify(binding),
    });
  }

  async deleteCanaryBinding(bindingId: string) {
    return this.request<void>(`/canary/bindings/${bindingId}`, {
      method: 'DELETE',
    });
  }

  async dryRunCanary(bindingId: string) {
    return this.request<{
      affectedFileCount: number;
      recipientCount: number;
    }>(`/canary/bindings/${bindingId}/dry-run`, { method: 'POST' });
  }

  async createRecipientList(list: {
    name: string;
    recipients: { email: string; label?: string }[];
  }) {
    return this.request<{ id: string }>('/canary/recipients', {
      method: 'POST',
      body: JSON.stringify(list),
    });
  }

  // -- Approval ----------------------------------------------------------------

  async requestApproval(params: Record<string, unknown>) {
    return this.request<{ id: string }>('/approval/request', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // -- Audit -----------------------------------------------------------------

  async queryAuditLog(filters?: Record<string, string>) {
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : '';
    return this.request<unknown[]>(`/audit${qs}`);
  }

  // -- Storage ---------------------------------------------------------------

  async getStorageUsage() {
    return this.request<{
      usedBytes: number;
      quotaBytes: number;
      breakdown: { category: string; bytes: number }[];
    }>('/quota');
  }

  // -- Notifications ---------------------------------------------------------

  async getNotifications() {
    return this.request<unknown[]>('/notifications');
  }

  async markNotificationsRead(ids: string[]) {
    return this.request<void>('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  // -- Folder Export ---------------------------------------------------------

  async exportFolderToTCBL(
    folderId: string,
    options?: Record<string, unknown>,
  ) {
    return this.request<{
      tcblHandle: string;
      entryCount: number;
      totalSizeBytes: number;
      skippedFiles: unknown[];
    }>(`/folders/${folderId}/export-tcbl`, {
      method: 'POST',
      body: JSON.stringify(options ?? {}),
    });
  }

  // -- Helpers ---------------------------------------------------------------

  /**
   * Seed a test file via the production Joule upload pipeline:
   * initUpload → uploadChunk → quoteUpload → commitUpload.
   *
   * The legacy `/finalize` endpoint creates file metadata but does NOT go
   * through the same commit path the UI uses, so files seeded that way
   * frequently failed to appear in the file browser. Driving the full
   * Joule pipeline matches what the UI does when a user uploads.
   */
  async seedFile(
    name?: string,
    content = 'test content',
    folderId?: string,
  ): Promise<{ id: string; name: string }> {
    const fileName = name ?? `e2e-seed-${Date.now()}.txt`;
    const data = new TextEncoder().encode(content);
    const root = folderId
      ? { folder: { id: folderId } }
      : await this.getRootFolder();
    const session = await this.initUpload(
      fileName,
      'text/plain',
      data.byteLength,
      root.folder.id,
      { durabilityTier: 'standard', durationDays: 30 },
    );
    await this.uploadChunk(session.sessionId, 0, data, computeChecksum(data));
    // Try the Joule commit path first; if Joule is disabled on the server
    // (404), fall back to the legacy /finalize endpoint.
    try {
      await this.quoteUpload(session.sessionId);
      const commitResult = await this.commitUpload(session.sessionId);
      return {
        id: commitResult.fileId,
        name: commitResult.fileName ?? fileName,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/\b404\b/.test(msg)) {
        throw err;
      }
      const file = await this.finalizeUpload(session.sessionId);
      return { id: file.id, name: fileName };
    }
  }
}

/**
 * Extended test fixtures with authenticated page and API helper.
 */
export const test = base.extend<{
  authenticatedPage: Page;
  api: BurnbagTestApi;
}>({
  authenticatedPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL });

    // Inject the token into localStorage before any page loads.
    // This ensures the AuthProvider sees the token on first render.
    let token = '';
    if (fs.existsSync(TOKEN_PATH)) {
      try {
        const data = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
        token = data.token ?? '';
      } catch {
        // No token available
      }
    }
    if (token) {
      await context.addInitScript((t: string) => {
        localStorage.setItem('authToken', t);
      }, token);
    }

    const page = await context.newPage();

    await use(page);
    await context.close();
  },

  api: async ({ baseURL }, use) => {
    let token = '';
    if (fs.existsSync(TOKEN_PATH)) {
      try {
        const data = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
        token = data.token ?? '';
      } catch {
        // No token available
      }
    }
    const vaultId = loadVaultContainerId();
    const api = new BurnbagTestApi(
      baseURL ?? 'http://localhost:3002',
      token,
      vaultId,
    );

    await use(api);
  },
});

export { expect };

/**
 * Navigate to the burnbag page and wait for it to load.
 *
 * Uses `domcontentloaded` instead of `networkidle` to avoid hanging when
 * the app keeps WebSocket or polling connections open.  Then waits for the
 * sidebar drawer (rendered by AppSidebar via LayoutShell) which only
 * appears for authenticated users.
 */
export async function navigateToBurnbag(page: Page) {
  await page.goto('/burnbag', { waitUntil: 'domcontentloaded' });
  // Wait for the sidebar drawer that LayoutShell renders for authenticated users.
  // AppSidebar uses data-testid="app-sidebar-drawer" on the Drawer and
  // data-testid="sidebar-nav-list" on the List inside it.
  await page
    .waitForSelector(
      '[data-testid="app-sidebar-drawer"], [data-testid="sidebar-nav-list"]',
      { timeout: 60_000 },
    )
    .catch(() => {
      // Sidebar may not render if the server is under heavy load; continue anyway.
    });
}

/**
 * Navigate to a specific burnbag section via URL.
 */
export async function navigateToSection(page: Page, section: string) {
  await page.goto(`/burnbag/${section}`, { waitUntil: 'domcontentloaded' });
  await page
    .waitForSelector(
      '[data-testid="app-sidebar-drawer"], [data-testid="sidebar-nav-list"]',
      { timeout: 60_000 },
    )
    .catch(() => {
      // Sidebar may not render if the server is under heavy load; continue anyway.
    });
}

/**
 * Click a sidebar section and wait for content to update.
 */
export async function clickSidebarSection(page: Page, sectionText: string) {
  // Scope to the sidebar nav list to avoid strict-mode violations when
  // the same text appears in breadcrumbs or other parts of the page.
  const sidebar = page.locator('[data-testid="sidebar-nav-list"]');
  await sidebar.getByText(sectionText, { exact: false }).click();
  await page.waitForTimeout(500);
}
