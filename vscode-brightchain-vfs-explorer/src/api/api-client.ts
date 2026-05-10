/**
 * ApiClient — HTTP client for the Digital Burnbag File Platform API.
 *
 * Handles:
 *   - Auth header injection (Bearer token from AuthManager)
 *   - Exponential backoff for 5xx errors (max 2 retries)
 *   - Retry-After handling for 429 rate-limit responses
 *   - 401 delegation to AuthManager.handleUnauthorized()
 *   - Chunked upload with higher retry limit (3)
 *
 * Also implements IAuthApiDelegate so it can be set on AuthManager
 * for the direct-challenge and password login flows.
 */

import * as vscode from 'vscode';
import type { AuthManager, IAuthApiDelegate } from '../auth/auth-manager';
import type { SettingsManager } from '../services/settings-manager';
import type {
  IChallengeResponseData,
  IChunkReceipt,
  IDirectChallengePayload,
  IFileMetadataDTO,
  IFileMetadataUpdate,
  IFileVersionDTO,
  IFolderContentsDTO,
  IFolderMetadataDTO,
  IInitUploadParams,
  ILoginResponseData,
  ISearchFilters,
  ISearchResultsDTO,
  IUploadSessionDTO,
} from './types';

/** Options for the internal request method. */
export interface IRequestOptions {
  body?: unknown;
  /** Raw binary body (used for chunk uploads). */
  binaryBody?: Uint8Array;
  headers?: Record<string, string>;
  /** Override the default max retries for this request. */
  maxRetries?: number;
  /** When true, return the raw response bytes instead of parsed JSON. */
  rawResponse?: boolean;
  /** Query string parameters. */
  query?: Record<string, string>;
}

/** Error thrown when an API request fails after all retries. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const DEFAULT_MAX_RETRIES = 2;
const CHUNK_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

export class ApiClient extends vscode.Disposable implements IAuthApiDelegate {
  private readonly baseRetryDelayMs: number;

  constructor(
    private readonly settings: SettingsManager,
    private readonly auth: AuthManager,
    baseRetryDelayMs = DEFAULT_BASE_DELAY_MS,
  ) {
    super(() => {
      /* no-op disposal */
    });
    this.baseRetryDelayMs = baseRetryDelayMs;
  }

  // ---------------------------------------------------------------------------
  // Internal HTTP request with retry, rate-limit, and auth header injection
  // ---------------------------------------------------------------------------

  /**
   * Core HTTP method. Every public method delegates here.
   *
   * 1. Injects `Authorization: Bearer <token>` when a token exists.
   * 2. Retries on 5xx with exponential backoff (delay = baseDelayMs * 2^attempt).
   * 3. Respects `Retry-After` header on 429 responses.
   * 4. Delegates 401 to `auth.handleUnauthorized()` — does NOT retry.
   * 5. All other errors are thrown immediately.
   */
  async request<T>(
    method: string,
    path: string,
    options: IRequestOptions = {},
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const url = this.buildUrl(path, options.query);
      const headers: Record<string, string> = {
        ...options.headers,
      };

      // Auth header injection
      const token = await this.auth.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Content-Type for JSON bodies
      if (options.body !== undefined && !options.binaryBody) {
        headers['Content-Type'] = 'application/json';
      }

      const fetchOptions: RequestInit = {
        method,
        headers,
      };

      if (options.binaryBody) {
        // Cast needed: Node 18+ fetch accepts Uint8Array at runtime
        // but the TS lib types for BodyInit are overly restrictive.
        (fetchOptions as Record<string, unknown>)['body'] = options.binaryBody;
      } else if (options.body !== undefined) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      let response: Response;
      try {
        response = await fetch(url, fetchOptions);
      } catch (err) {
        // Network error — no retry, throw immediately
        throw new ApiError(
          `Network error: ${err instanceof Error ? err.message : String(err)}`,
          0,
        );
      }

      // 401 — delegate to auth, do NOT retry
      if (response.status === 401) {
        await this.auth.handleUnauthorized();
        const body = await this.safeReadBody(response);
        throw new ApiError('Unauthorized', 401, body);
      }

      // 429 — rate limited, wait for Retry-After then retry
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter ? parseFloat(retryAfter) * 1000 : 1000;
        await this.delay(waitMs);
        continue;
      }

      // 5xx — retry with exponential backoff
      if (response.status >= 500 && response.status < 600) {
        const body = await this.safeReadBody(response);
        lastError = new ApiError(
          `Server error: ${response.status}`,
          response.status,
          body,
        );
        if (attempt < maxRetries) {
          const delayMs = this.baseRetryDelayMs * Math.pow(2, attempt);
          await this.delay(delayMs);
          continue;
        }
        throw lastError;
      }

      // Any other non-2xx — throw immediately
      if (!response.ok) {
        const body = await this.safeReadBody(response);
        throw new ApiError(
          `API error: ${response.status} ${response.statusText}`,
          response.status,
          body,
        );
      }

      // Success — parse response
      if (options.rawResponse) {
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer) as unknown as T;
      }

      // 204 No Content
      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return (await response.json()) as T;
    }

    // Should not reach here, but just in case
    throw lastError ?? new ApiError('Request failed after retries', 0);
  }

  // ---------------------------------------------------------------------------
  // File operations
  // ---------------------------------------------------------------------------

  async getFileContent(fileId: string): Promise<Uint8Array> {
    return this.request<Uint8Array>('GET', `/files/${fileId}`, {
      rawResponse: true,
    });
  }

  async getFileMetadata(fileId: string): Promise<IFileMetadataDTO> {
    return this.request<IFileMetadataDTO>('GET', `/files/${fileId}/metadata`);
  }

  async updateFile(
    fileId: string,
    updates: Partial<IFileMetadataUpdate>,
  ): Promise<IFileMetadataDTO> {
    return this.request<IFileMetadataDTO>('PUT', `/files/${fileId}`, {
      body: updates,
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    return this.request<void>('DELETE', `/files/${fileId}`);
  }

  // ---------------------------------------------------------------------------
  // Folder operations
  // ---------------------------------------------------------------------------

  async getFolderContents(folderId: string): Promise<IFolderContentsDTO> {
    return this.request<IFolderContentsDTO>(
      'GET',
      `/folders/${folderId}/contents`,
    );
  }

  async getFolderPath(folderId: string): Promise<IFolderMetadataDTO[]> {
    return this.request<IFolderMetadataDTO[]>(
      'GET',
      `/folders/${folderId}/path`,
    );
  }

  async createFolder(
    parentFolderId: string,
    name: string,
  ): Promise<IFolderMetadataDTO> {
    return this.request<IFolderMetadataDTO>('POST', '/folders', {
      body: { parentFolderId, name },
    });
  }

  async moveItem(itemId: string, newParentFolderId: string): Promise<void> {
    return this.request<void>('POST', `/folders/${itemId}/move`, {
      body: { newParentFolderId },
    });
  }

  // ---------------------------------------------------------------------------
  // Chunked upload
  // ---------------------------------------------------------------------------

  async initUpload(params: IInitUploadParams): Promise<IUploadSessionDTO> {
    return this.request<IUploadSessionDTO>('POST', '/upload/init', {
      body: params,
    });
  }

  async uploadChunk(
    sessionId: string,
    index: number,
    data: Uint8Array,
    checksum: string,
  ): Promise<IChunkReceipt> {
    return this.request<IChunkReceipt>(
      'PUT',
      `/upload/${sessionId}/chunk/${index}`,
      {
        binaryBody: data,
        headers: { 'X-Chunk-Checksum': checksum },
        maxRetries: CHUNK_MAX_RETRIES,
      },
    );
  }

  async finalizeUpload(sessionId: string): Promise<IFileMetadataDTO> {
    return this.request<IFileMetadataDTO>(
      'POST',
      `/upload/${sessionId}/finalize`,
    );
  }

  // ---------------------------------------------------------------------------
  // Versions
  // ---------------------------------------------------------------------------

  async getVersions(fileId: string): Promise<IFileVersionDTO[]> {
    return this.request<IFileVersionDTO[]>('GET', `/files/${fileId}/versions`);
  }

  async restoreVersion(
    fileId: string,
    versionId: string,
  ): Promise<IFileMetadataDTO> {
    return this.request<IFileMetadataDTO>(
      'POST',
      `/files/${fileId}/versions/${versionId}/restore`,
    );
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  async searchFiles(
    query: string,
    filters?: ISearchFilters,
  ): Promise<ISearchResultsDTO> {
    const queryParams: Record<string, string> = { q: query };
    if (filters?.mimeType) {
      queryParams['mimeType'] = filters.mimeType;
    }
    if (filters?.folderId) {
      queryParams['folderId'] = filters.folderId;
    }
    return this.request<ISearchResultsDTO>('GET', '/files/search', {
      query: queryParams,
    });
  }

  // ---------------------------------------------------------------------------
  // Auth endpoints (IAuthApiDelegate)
  // ---------------------------------------------------------------------------

  async requestDirectLogin(): Promise<IChallengeResponseData> {
    return this.request<IChallengeResponseData>(
      'POST',
      '/api/user/request-direct-login',
    );
  }

  async directChallenge(
    payload: IDirectChallengePayload,
  ): Promise<ILoginResponseData> {
    return this.request<ILoginResponseData>(
      'POST',
      '/api/user/direct-challenge',
      { body: payload },
    );
  }

  async passwordLogin(
    username: string,
    password: string,
  ): Promise<ILoginResponseData> {
    return this.request<ILoginResponseData>('POST', '/api/user/login', {
      body: { username, password },
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private buildUrl(path: string, query?: Record<string, string>): string {
    const base = this.settings.apiHostUrl.replace(/\/+$/, '');
    const url = new URL(path, base);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  /** Read response body as text, swallowing errors. */
  private async safeReadBody(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }

  /** Promise-based delay for retry waits. Exposed for testing. */
  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
