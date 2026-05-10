/**
 * BurnbagApiClient — HTTP client for all Digital Burnbag API endpoints.
 *
 * Wraps fetch() calls to /burnbag/* endpoints mounted on the API server.
 * All methods handle auth via cookies/headers from the existing AuthProvider.
 */

import type {
  IAggregateStats,
  IComparisonDataset,
  IHeatmapDay,
  IStreakInfo,
  ITimeBucket,
} from '@brightchain/digitalburnbag-lib';

// ---------------------------------------------------------------------------
// Response / DTO types (lightweight, frontend-only)
// ---------------------------------------------------------------------------

export interface IApiFileDTO {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  ownerId: string;
  folderId: string;
  tags: string[];
  deletedAt?: string;
  scheduledDestructionAt?: string;
  modifiedAt: string;
  createdAt: string;
  watermarkEnabled?: boolean;
  approvalGoverned?: boolean;
}

export interface IApiFileVersionDTO {
  id: string;
  fileId: string;
  versionNumber: number;
  sizeBytes: number;
  uploaderId: string;
  createdAt: string;
}

export interface IApiFolderDTO {
  id: string;
  name: string;
  ownerId: string;
  parentFolderId: string | null;
  createdAt: string;
}

export interface IApiFolderContentsDTO {
  folder: IApiFolderDTO;
  files: IApiFileDTO[];
  subfolders: IApiFolderDTO[];
}

export interface IApiBreadcrumbDTO {
  id: string;
  name: string;
}

export interface IApiTrashItemDTO {
  id: string;
  name: string;
  type: 'file' | 'folder';
  originalPath: string;
  deletedAt: string;
  autoPurgeAt: string;
}

export interface IApiUploadSessionDTO {
  sessionId: string;
  chunkSize: number;
  totalChunks: number;
}

export interface IApiUploadProgressDTO {
  chunkIndex: number;
  progress: number;
}

export interface IApiShareLinkDTO {
  id: string;
  token: string;
  url: string;
  fileId: string;
  scope: string;
  encryptionMode: string;
  expiresAt?: string;
  maxAccessCount?: number;
  blockDownload?: boolean;
  createdAt: string;
}

export interface IApiSharedItemDTO {
  id: string;
  name: string;
  type: 'file' | 'folder';
  sharedBy: string;
  permission: string;
  sharedAt: string;
}

export interface IApiAuditEntryDTO {
  id: string;
  operationType: string;
  actorId: string;
  targetId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface IApiCanaryBindingDTO {
  id: string;
  condition: string;
  provider: string;
  action: string;
  targetDescription: string;
}

export interface IApiRecipientListDTO {
  id: string;
  name: string;
  recipientCount: number;
}

export interface IApiDryRunReportDTO {
  actionsDescription: string[];
  affectedFileCount: number;
  recipientCount: number;
}

export interface IApiNotificationDTO {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface IApiPresenceUserDTO {
  userId: string;
  username: string;
  avatarUrl?: string;
}

export interface IApiACLEntryDTO {
  principalId: string;
  principalType: 'user' | 'group' | 'share_link';
  permissionLevel: string;
  flags: string[];
  ipRange?: string;
  timeWindow?: { start: string; end: string };
  expiresAt?: string;
}

export interface IApiStorageUsageDTO {
  usedBytes: number;
  quotaBytes: number;
  breakdown: { category: string; bytes: number }[];
}

export interface IApiSearchResultsDTO {
  files: IApiFileDTO[];
  totalCount: number;
}

export interface IApiResolvedPathDTO {
  folders: IApiFolderDTO[];
  file: IApiFileDTO | null;
}

export interface IApiVaultContainerDTO {
  id: string;
  name: string;
  description: string | null;
  state: string;
  rootFolderId: string;
  usedBytes?: number;
  quotaBytes?: number | null;
  createdAt: string;
}

export interface IApiVaultContainerSummaryDTO {
  id: string;
  name: string;
  description: string | null;
  state: string;
  visibility?: 'private' | 'unlisted' | 'public';
  sealedAt?: string;
  sealHash?: string;
  fileCount: number;
  folderCount: number;
  sealStatus: {
    allPristine: boolean;
    sealedCount: number;
    accessedCount: number;
    totalFiles: number;
  };
  usedBytes: number;
  quotaBytes: number | null;
  createdAt: string;
}

export interface IApiApprovalRequestDTO {
  id: string;
  operationType: string;
  targetId: string;
  requesterId: string;
  status: string;
  approvals: number;
  required: number;
  createdAt: string;
}

export interface IApiDestructionProofDTO {
  fileId: string;
  proofHash: string;
  ledgerEntryHash: string;
  destroyedAt: string;
}

// -- Provider Registration DTOs --

export interface IApiMultiCanaryBindingDTO {
  id: string;
  name: string;
  providerConnectionIds: string[];
  redundancyPolicy: string;
  providerWeights?: Record<string, number>;
  weightedThresholdPercent?: number;
  protocolAction: string;
  canaryCondition: string;
  absenceThresholdHours: number;
  aggregateStatus: string;
  providerSignals?: Record<string, string>;
  targetNames: string[];
  providerCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IApiWebhookEndpointDTO {
  id: string;
  connectionId: string;
  providerId: string;
  providerName: string;
  webhookUrl: string;
  secret: string;
  isActive: boolean;
  isDisabledByFailures: boolean;
  ipAllowlist: string[];
  rateLimitPerMinute: number;
  stats: IApiWebhookDeliveryStatsDTO;
  lastReceivedAt?: string;
  createdAt: string;
}

export interface IApiWebhookDeliveryStatsDTO {
  totalReceived: number;
  successfullyProcessed: number;
  failedValidation: number;
  lastReceivedAt?: string;
  lastSuccessAt?: string;
}

export interface IApiProviderDisplayInfoDTO {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  brandColor?: string;
  requiresOAuth: boolean;
  supportsApiKey: boolean;
  supportsWebhook: boolean;
  requestedScopes: string[];
  dataAccessDescription: string;
  privacyPolicyUrl?: string;
  appSettingsUrl?: string;
  isBuiltIn: boolean;
  recommendedCheckInterval: string;
  minCheckIntervalMs: number;
  isAvailable: boolean;
  unavailableReason?: string;
}

export interface IApiProviderConnectionDTO {
  id: string;
  userId: string;
  providerId: string;
  status: string;
  providerUserId?: string;
  providerUsername?: string;
  providerDisplayName?: string;
  providerAvatarUrl?: string;
  connectedAt?: string;
  lastValidatedAt?: string;
  lastCheckedAt?: string;
  lastCheckResult?: 'presence' | 'absence' | 'duress' | 'error';
  errorMessage?: string;
  tokenExpiresAt?: string;
  isEnabled: boolean;
  checkIntervalMs?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IApiProviderConnectionsSummaryDTO {
  connectedCount: number;
  healthyCount: number;
  needsAttentionCount: number;
  lastHeartbeatAt?: string;
  overallStatus: 'healthy' | 'degraded' | 'critical' | 'none';
}

export interface IApiInitiateOAuthResponseDTO {
  authorizationUrl: string;
  state: string;
}

export interface IApiCompleteOAuthResponseDTO {
  success: boolean;
  connection?: IApiProviderConnectionDTO;
  error?: string;
  returnUrl: string;
}

export interface IApiSetupWebhookResponseDTO {
  webhookUrl: string;
  webhookSecret: string;
  instructions: string;
}

export interface IApiTestConnectionResponseDTO {
  success: boolean;
  status: string;
  providerUserInfo?: {
    userId: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
  error?: string;
  responseTimeMs: number;
}

export interface IApiProvidersByCategoryDTO {
  category: string;
  categoryName: string;
  categoryDescription: string;
  providers: IApiProviderDisplayInfoDTO[];
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class BurnbagApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken?: () => string | null,
  ) {}

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const authHeaders: Record<string, string> = {};
    const token = this.getToken?.();
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
    }
    if (process.env.NODE_ENV !== 'production' && !token) {
      console.warn('[BurnbagApiClient] request without token:', url);
    }
    // Destructure headers out of options so the final ...rest spread
    // doesn't clobber the merged headers object.
    const { headers: optionHeaders, ...restOptions } = options;
    const res = await fetch(url, {
      credentials: 'include',
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...((optionHeaders as Record<string, string>) ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      let message: string;
      try {
        const json = JSON.parse(body);
        message = json.message ?? json.error ?? res.statusText;
      } catch {
        message = body || res.statusText;
      }
      throw new ApiError(res.status, message);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  // -- Folders ---------------------------------------------------------------

  async getRootFolder(
    vaultContainerId?: string,
  ): Promise<IApiFolderContentsDTO> {
    const qs = vaultContainerId
      ? `?vaultContainerId=${encodeURIComponent(vaultContainerId)}`
      : '';
    return this.request(`/folders/root${qs}`);
  }

  async getFolderContents(
    folderId: string,
    sort?: { field: string; direction: string },
  ): Promise<IApiFolderContentsDTO> {
    const params = new URLSearchParams();
    if (sort) {
      params.set('sortField', sort.field);
      params.set('sortDirection', sort.direction);
    }
    const qs = params.toString();
    return this.request(`/folders/${folderId}${qs ? `?${qs}` : ''}`);
  }

  async getFolderPath(folderId: string): Promise<IApiBreadcrumbDTO[]> {
    return this.request(`/folders/${folderId}/path`);
  }

  /**
   * Resolve a virtual path (e.g. "my-folder/test/blah") to folder chain + optional file.
   */
  async resolvePath(pathSegments: string[]): Promise<IApiResolvedPathDTO> {
    const encoded = pathSegments.map(encodeURIComponent).join('/');
    return this.request(`/folders/resolve/${encoded}`);
  }

  async createFolder(
    name: string,
    parentFolderId: string,
    vaultContainerId?: string,
  ): Promise<IApiFolderDTO> {
    return this.request('/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parentFolderId, vaultContainerId }),
    });
  }

  async moveItem(
    itemId: string,
    itemType: 'file' | 'folder',
    newParentId: string,
  ): Promise<void> {
    return this.request(`/folders/${newParentId}/move`, {
      method: 'POST',
      body: JSON.stringify({ itemId, itemType }),
    });
  }

  // -- Files -----------------------------------------------------------------

  async getFileMetadata(fileId: string): Promise<IApiFileDTO> {
    return this.request(`/files/${fileId}/metadata`);
  }

  async updateFileMetadata(
    fileId: string,
    updates: Partial<Pick<IApiFileDTO, 'name' | 'tags' | 'folderId'>>,
  ): Promise<IApiFileDTO> {
    return this.request(`/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async softDeleteFile(fileId: string): Promise<void> {
    return this.request(`/files/${fileId}`, { method: 'DELETE' });
  }

  async softDeleteFolder(folderId: string): Promise<void> {
    return this.request(`/folders/${folderId}`, { method: 'DELETE' });
  }

  async restoreFile(fileId: string): Promise<void> {
    return this.request(`/files/${fileId}/restore`, { method: 'POST' });
  }

  async getVersionHistory(fileId: string): Promise<IApiFileVersionDTO[]> {
    return this.request(`/files/${fileId}/versions`);
  }

  async restoreVersion(fileId: string, versionId: string): Promise<void> {
    return this.request(`/files/${fileId}/versions/${versionId}/restore`, {
      method: 'POST',
    });
  }

  async search(
    query: string,
    filters?: Record<string, string>,
  ): Promise<IApiSearchResultsDTO> {
    const params = new URLSearchParams({ q: query, ...filters });
    const data = await this.request<{
      results?: IApiFileDTO[];
      files?: IApiFileDTO[];
      totalCount: number;
    }>(`/files/search?${params}`);
    return {
      files: data.results ?? data.files ?? [],
      totalCount: data.totalCount,
    };
  }

  getDownloadUrl(fileId: string): string {
    return `${this.baseUrl}/files/${fileId}`;
  }

  getPreviewUrl(fileId: string): string {
    return `${this.baseUrl}/files/${fileId}/preview`;
  }

  getVersionDownloadUrl(fileId: string, versionId: string): string {
    return `${this.baseUrl}/files/${fileId}/versions/${versionId}/download`;
  }

  /**
   * Fetch a file endpoint with authentication and return a blob URL.
   * Use this for preview/download where the browser needs a URL but
   * the endpoint requires a Bearer token.
   */
  async fetchBlobUrl(path: string): Promise<string> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {};
    const token = this.getToken?.();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { credentials: 'include', headers });
    if (!res.ok) {
      throw new ApiError(res.status, res.statusText);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  /** Authenticated blob URL for file preview. */
  async getPreviewBlobUrl(fileId: string): Promise<string> {
    return this.fetchBlobUrl(`/files/${fileId}/preview`);
  }

  /** Authenticated blob URL for file download. */
  async getDownloadBlobUrl(fileId: string): Promise<string> {
    return this.fetchBlobUrl(`/files/${fileId}`);
  }

  /**
   * Fetch encrypted file content for client-side E2EE decryption.
   * Returns base64-encoded ciphertext components and the ECIES-wrapped
   * symmetric key for the requesting user.
   */
  async getEncryptedFileContent(fileId: string): Promise<{
    fileName: string;
    mimeType: string;
    encryptedContent: string;
    iv: string;
    authTag: string;
    encryptedSymmetricKey: string;
  }> {
    return this.request(`/files/${fileId}/encrypted`);
  }

  async getNonAccessProof(fileId: string): Promise<unknown> {
    return this.request(`/files/${fileId}/non-access-proof`);
  }

  // -- Upload ----------------------------------------------------------------

  async initUpload(
    fileName: string,
    mimeType: string,
    sizeBytes: number,
    folderId: string,
    vaultContainerId?: string,
    durabilityTier?: import('@brightchain/digitalburnbag-lib').BurnbagStorageTier,
    durationDays?: number,
    preEncryptedMeta?: {
      wrappedKeyB64: string;
      ivB64: string;
      authTagB64: string;
    },
  ): Promise<IApiUploadSessionDTO> {
    return this.request('/upload/init', {
      method: 'POST',
      body: JSON.stringify({
        fileName,
        mimeType,
        totalSizeBytes: sizeBytes,
        targetFolderId: folderId,
        vaultContainerId,
        ...(durabilityTier !== undefined && { durabilityTier }),
        ...(durationDays !== undefined && { durationDays }),
        ...(preEncryptedMeta !== undefined && {
          wrappedKeyB64: preEncryptedMeta.wrappedKeyB64,
          ivB64: preEncryptedMeta.ivB64,
          authTagB64: preEncryptedMeta.authTagB64,
        }),
      }),
    });
  }

  async uploadChunk(
    sessionId: string,
    chunkIndex: number,
    data: ArrayBuffer,
    checksum: string,
  ): Promise<IApiUploadProgressDTO> {
    return this.request(`/upload/${sessionId}/chunk/${chunkIndex}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Chunk-Checksum': checksum,
      },
      body: data,
    });
  }

  async finalizeUpload(sessionId: string): Promise<IApiFileDTO> {
    return this.request(`/upload/${sessionId}/finalize`, { method: 'POST' });
  }

  // -- Joule upload billing --------------------------------------------------

  async quoteUpload(
    sessionId: string,
  ): Promise<import('@brightchain/digitalburnbag-lib').IUploadCostQuoteDTO> {
    return this.request(`/upload/${sessionId}/quote`, { method: 'POST' });
  }

  async commitUpload(
    sessionId: string,
  ): Promise<import('@brightchain/digitalburnbag-lib').IUploadCommitResultDTO> {
    return this.request(`/upload/${sessionId}/commit`, { method: 'POST' });
  }

  async discardUpload(sessionId: string): Promise<void> {
    return this.request(`/upload/${sessionId}/discard`, { method: 'POST' });
  }

  async initUploadNewVersion(
    fileId: string,
    mimeType: string,
    sizeBytes: number,
    fileName?: string,
    preEncryptedMeta?: {
      wrappedKeyB64: string;
      ivB64: string;
      authTagB64: string;
    },
  ): Promise<IApiUploadSessionDTO> {
    return this.request('/upload/new-version', {
      method: 'POST',
      body: JSON.stringify({
        fileId,
        fileName,
        mimeType,
        totalSizeBytes: sizeBytes,
        ...(preEncryptedMeta !== undefined && {
          wrappedKeyB64: preEncryptedMeta.wrappedKeyB64,
          ivB64: preEncryptedMeta.ivB64,
          authTagB64: preEncryptedMeta.authTagB64,
        }),
      }),
    });
  }

  // -- Trash -----------------------------------------------------------------

  async getTrashItems(): Promise<IApiTrashItemDTO[]> {
    // The search endpoint returns { results: IApiFileDTO[], totalCount } —
    // map the file DTOs into the trash-specific shape.
    const data = await this.request<{
      results: IApiFileDTO[];
      files?: IApiFileDTO[];
      totalCount: number;
    }>('/files/search?deleted=true');
    const files = Array.isArray(data)
      ? data
      : (data.results ?? data.files ?? []);
    return files.map((f: IApiFileDTO) => ({
      id: f.id,
      name: f.name,
      type: 'file' as const,
      originalPath: f.folderId ?? '/',
      deletedAt: f.deletedAt ?? new Date().toISOString(),
      autoPurgeAt: f.deletedAt
        ? new Date(
            new Date(f.deletedAt).getTime() + 30 * 86400000,
          ).toISOString()
        : new Date(Date.now() + 30 * 86400000).toISOString(),
    }));
  }

  // -- Share -----------------------------------------------------------------

  async shareInternal(
    fileId: string,
    email: string,
    permission: string,
  ): Promise<void> {
    return this.request('/share/internal', {
      method: 'POST',
      body: JSON.stringify({ fileId, recipientEmail: email, permission }),
    });
  }

  async createShareLink(
    fileId: string,
    options: {
      encryptionMode: string;
      scope: string;
      password?: string;
      expiresAt?: string;
      maxAccessCount?: number;
      blockDownload?: boolean;
    },
  ): Promise<IApiShareLinkDTO> {
    return this.request('/share/link', {
      method: 'POST',
      body: JSON.stringify({ fileId, ...options }),
    });
  }

  async revokeShareLink(linkId: string): Promise<void> {
    return this.request(`/share/link/${linkId}`, { method: 'DELETE' });
  }

  async getSharedWithMe(): Promise<IApiSharedItemDTO[]> {
    return this.request('/share/shared-with-me');
  }

  async getShareAuditTrail(fileId: string): Promise<IApiAuditEntryDTO[]> {
    return this.request(`/share/${fileId}/audit`);
  }

  async getMagnetUrl(
    fileId: string,
  ): Promise<{ magnetUrl: string; warning: string }> {
    return this.request(`/share/${fileId}/magnet`);
  }

  // -- ACL -------------------------------------------------------------------

  async getACL(
    targetType: string,
    targetId: string,
  ): Promise<{ entries: IApiACLEntryDTO[]; inherited: boolean }> {
    return this.request(`/acl/${targetType}/${targetId}`);
  }

  async setACL(
    targetType: string,
    targetId: string,
    entries: IApiACLEntryDTO[],
  ): Promise<void> {
    return this.request(`/acl/${targetType}/${targetId}`, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    });
  }

  // -- Destruction -----------------------------------------------------------

  async destroyFile(fileId: string): Promise<IApiDestructionProofDTO> {
    return this.request(`/destroy/${fileId}`, { method: 'POST' });
  }

  async batchDestroy(
    fileIds: string[],
  ): Promise<{ results: IApiDestructionProofDTO[]; failures: string[] }> {
    return this.request('/destroy/batch', {
      method: 'POST',
      body: JSON.stringify({ fileIds }),
    });
  }

  async scheduleDestruction(
    fileId: string,
    scheduledAt: string,
  ): Promise<void> {
    return this.request(`/destroy/${fileId}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt }),
    });
  }

  async cancelScheduledDestruction(fileId: string): Promise<void> {
    return this.request(`/destroy/${fileId}/schedule`, { method: 'DELETE' });
  }

  // -- Canary ----------------------------------------------------------------

  async getCanaryBindings(): Promise<IApiCanaryBindingDTO[]> {
    return this.request('/canary/bindings');
  }

  async createCanaryBinding(binding: {
    condition: string;
    provider: string;
    action: string;
    targetIds: string[];
    recipientListId?: string;
    cascadeDelay?: number;
  }): Promise<IApiCanaryBindingDTO> {
    return this.request('/canary/bindings', {
      method: 'POST',
      body: JSON.stringify(binding),
    });
  }

  async updateCanaryBinding(
    bindingId: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    return this.request(`/canary/bindings/${bindingId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteCanaryBinding(bindingId: string): Promise<void> {
    return this.request(`/canary/bindings/${bindingId}`, { method: 'DELETE' });
  }

  async dryRunCanary(bindingId: string): Promise<IApiDryRunReportDTO> {
    return this.request(`/canary/bindings/${bindingId}/dry-run`, {
      method: 'POST',
    });
  }

  async getRecipientLists(): Promise<IApiRecipientListDTO[]> {
    return this.request('/canary/recipients');
  }

  async createRecipientList(list: {
    name: string;
    recipients: { email: string; label?: string; pgpKey?: string }[];
  }): Promise<IApiRecipientListDTO> {
    return this.request('/canary/recipients', {
      method: 'POST',
      body: JSON.stringify(list),
    });
  }

  async updateRecipientList(
    listId: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    return this.request(`/canary/recipients/${listId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // -- Provider Registration ------------------------------------------------

  /**
   * Get all available providers grouped by category.
   */
  async getAvailableProviders(): Promise<IApiProvidersByCategoryDTO[]> {
    return this.request('/canary/providers');
  }

  /**
   * Get a specific provider's display info.
   */
  async getProviderInfo(
    providerId: string,
  ): Promise<IApiProviderDisplayInfoDTO> {
    return this.request(`/canary/providers/${providerId}`);
  }

  /**
   * Get the current user's provider connections.
   */
  async getMyConnections(): Promise<IApiProviderConnectionDTO[]> {
    return this.request('/canary/connections');
  }

  /**
   * Get a summary of the user's provider connections.
   */
  async getConnectionsSummary(): Promise<IApiProviderConnectionsSummaryDTO> {
    return this.request('/canary/connections/summary');
  }

  /**
   * Get a specific connection's details.
   */
  async getConnection(
    connectionId: string,
  ): Promise<IApiProviderConnectionDTO> {
    return this.request(`/canary/connections/${connectionId}`);
  }

  /**
   * Initiate OAuth flow for a provider.
   */
  async initiateOAuth(
    providerId: string,
    returnUrl: string,
  ): Promise<IApiInitiateOAuthResponseDTO> {
    return this.request('/canary/connections/oauth/initiate', {
      method: 'POST',
      body: JSON.stringify({ providerId, returnUrl }),
    });
  }

  /**
   * Complete OAuth flow after callback.
   */
  async completeOAuth(
    providerId: string,
    code: string,
    state: string,
  ): Promise<IApiCompleteOAuthResponseDTO> {
    return this.request('/canary/connections/oauth/complete', {
      method: 'POST',
      body: JSON.stringify({ providerId, code, state }),
    });
  }

  /**
   * Connect a provider using an API key.
   */
  async connectWithApiKey(
    providerId: string,
    apiKey: string,
    providerUserId?: string,
  ): Promise<IApiProviderConnectionDTO> {
    return this.request('/canary/connections/api-key', {
      method: 'POST',
      body: JSON.stringify({ providerId, apiKey, providerUserId }),
    });
  }

  /**
   * Set up a webhook connection for a provider.
   */
  async setupWebhook(providerId: string): Promise<IApiSetupWebhookResponseDTO> {
    return this.request('/canary/connections/webhook', {
      method: 'POST',
      body: JSON.stringify({ providerId }),
    });
  }

  /**
   * Test a provider connection.
   */
  async testConnection(
    connectionId: string,
  ): Promise<IApiTestConnectionResponseDTO> {
    return this.request(`/canary/connections/${connectionId}/test`, {
      method: 'POST',
    });
  }

  /**
   * Disconnect (remove) a provider connection.
   * Deletes credentials, removes from all multi-canary bindings, archives status history.
   */
  async disconnectProvider(connectionId: string): Promise<void> {
    return this.request(`/canary/connections/${connectionId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Pause a provider connection.
   * Stops heartbeat checks, excludes from aggregation, preserves credentials.
   * Requirements: 16.2
   */
  async pauseProvider(connectionId: string): Promise<IApiProviderConnectionDTO> {
    return this.request(`/canary/connections/${connectionId}/pause`, {
      method: 'POST',
    });
  }

  /**
   * Resume a paused provider connection.
   * Restarts heartbeat checks and re-includes in aggregation.
   * Requirements: 16.2
   */
  async resumeProvider(connectionId: string): Promise<IApiProviderConnectionDTO> {
    return this.request(`/canary/connections/${connectionId}/resume`, {
      method: 'POST',
    });
  }

  /**
   * Get the impact report for disconnecting a provider.
   * Returns which multi-canary bindings would be affected and whether any
   * would fall below the minimum provider count.
   * Requirements: 16.5, 16.6
   */
  async getDisconnectImpact(connectionId: string): Promise<{
    affectedBindings: Array<{ id: string; name: string; providerCount: number }>;
    bindingsReducedBelowMinimum: Array<{ id: string; name: string; providerCount: number }>;
    bindingsStillValid: Array<{ id: string; name: string; providerCount: number }>;
  }> {
    return this.request(`/canary/connections/${connectionId}/disconnect-impact`, {
      method: 'GET',
    });
  }

  /**
   * Update a provider connection's settings.
   */
  async updateConnectionSettings(
    connectionId: string,
    settings: {
      isEnabled?: boolean;
      checkIntervalMs?: number;
      absenceConfig?: {
        thresholdDays: number;
        gracePeriodHours: number;
        sendWarnings: boolean;
        warningDays: number[];
      };
      duressConfig?: {
        enabled: boolean;
        keywords: string[];
        patterns: string[];
      };
    },
  ): Promise<IApiProviderConnectionDTO> {
    return this.request(`/canary/connections/${connectionId}`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  /**
   * Trigger an immediate heartbeat check for a connection.
   */
  async checkConnectionNow(
    connectionId: string,
  ): Promise<IApiTestConnectionResponseDTO> {
    return this.request(`/canary/connections/${connectionId}/check`, {
      method: 'POST',
    });
  }

  // -- Approval ----------------------------------------------------------------

  async requestApproval(params: {
    operationType: string;
    targetId: string;
  }): Promise<IApiApprovalRequestDTO> {
    return this.request('/approval/request', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async approveRequest(requestId: string): Promise<void> {
    return this.request(`/approval//approve`, { method: 'POST' });
  }

  async rejectRequest(requestId: string, reason: string): Promise<void> {
    return this.request(`/approval//reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // -- Audit -----------------------------------------------------------------

  async queryAuditLog(
    filters?: Record<string, string>,
  ): Promise<IApiAuditEntryDTO[]> {
    const params = new URLSearchParams(filters);
    return this.request(`/audit?${params}`);
  }

  async exportAuditLog(
    filters?: Record<string, string>,
  ): Promise<{ entries: IApiAuditEntryDTO[]; proofs: unknown[] }> {
    const params = new URLSearchParams(filters);
    return this.request(`/audit/export?${params}`);
  }

  // -- Storage ---------------------------------------------------------------

  async getStorageUsage(): Promise<IApiStorageUsageDTO> {
    const data = await this.request<IApiStorageUsageDTO>('/quota');
    return {
      usedBytes: data.usedBytes ?? 0,
      quotaBytes: data.quotaBytes ?? 0,
      breakdown: data.breakdown ?? [],
    };
  }

  // -- Notifications ---------------------------------------------------------

  async getNotifications(): Promise<IApiNotificationDTO[]> {
    return this.request('/notifications');
  }

  async markNotificationsRead(ids: string[]): Promise<void> {
    return this.request('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  // -- Vault Containers ------------------------------------------------------

  async listVaultContainers(): Promise<IApiVaultContainerSummaryDTO[]> {
    return this.request('/vaults');
  }

  async listPublicVaultContainers(opts?: {
    search?: string;
    sortBy?: 'name' | 'createdAt' | 'fileCount';
    sortDir?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{
    total: number;
    limit: number;
    offset: number;
    items: Array<{
      id: string;
      name: string;
      description: string | null;
      visibility: string;
      fileCount: number;
      folderCount: number;
      ownerId: string;
      createdAt: string;
      pathUrl: string;
    }>;
  }> {
    const params = new URLSearchParams();
    if (opts?.search) params.set('search', opts.search);
    if (opts?.sortBy) params.set('sortBy', opts.sortBy);
    if (opts?.sortDir) params.set('sortDir', opts.sortDir);
    if (opts?.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts?.offset !== undefined) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return this.request(`/vaults/public${qs ? `?${qs}` : ''}`);
  }

  async createVaultContainer(params: {
    name: string;
    description?: string;
    visibility?: string;
  }): Promise<IApiVaultContainerDTO> {
    return this.request('/vaults', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getVaultContainer(containerId: string): Promise<IApiVaultContainerDTO> {
    return this.request(`/vaults/${containerId}`);
  }

  async lockVaultContainer(
    containerId: string,
  ): Promise<{ id: string; state: string }> {
    return this.request(`/vaults/${containerId}/lock`, { method: 'POST' });
  }

  async sealVaultContainer(containerId: string): Promise<{
    id: string;
    state: string;
    sealedAt: string;
    sealHash: string;
  }> {
    return this.request(`/vaults/${containerId}/seal`, { method: 'POST' });
  }

  async destroyVaultContainer(
    containerId: string,
  ): Promise<{ succeeded: number; failed: number }> {
    return this.request(`/vaults/${containerId}/destroy`, { method: 'POST' });
  }

  // -- Storage Contracts -----------------------------------------------------

  async getStorageContractForFile(fileId: string): Promise<{
    contractId: string;
    fileId: string;
    ownerId: string;
    createdAt: string;
    expiresAt: string;
    committedDays: number;
    bytes: string;
    tier: string;
    rsK: number;
    rsM: number;
    upfrontMicroJoules: string;
    dailyMicroJoules: string;
    remainingCreditMicroJoules: string;
    autoRenew: boolean;
    providerNodeIds: string[];
    status: string;
    lastSettledAt: string;
  } | null> {
    try {
      return await this.request(
        `/me/burnbag/storage-contracts?fileId=${encodeURIComponent(fileId)}`,
      );
    } catch {
      return null;
    }
  }

  // -- Folder Export ---------------------------------------------------------

  async exportFolderToTCBL(
    folderId: string,
    options?: {
      mimeTypeFilters?: string[];
      maxDepth?: number;
      excludePatterns?: string[];
    },
  ): Promise<{
    tcblHandle: string;
    entryCount: number;
    totalSizeBytes: number;
    skippedFiles: unknown[];
  }> {
    return this.request(`/folders/${folderId}/export-tcbl`, {
      method: 'POST',
      body: JSON.stringify(options ?? {}),
    });
  }

  // -- User Search (via BrightHub) -------------------------------------------

  /**
   * Search users via the BrightHub user profile search endpoint.
   * Derives the BrightHub API base from the burnbag base URL.
   */
  async searchUsers(query: string): Promise<
    Array<{
      id: string;
      username: string;
      displayName: string;
      profilePictureUrl?: string;
    }>
  > {
    const hubBase = this.baseUrl.replace(/\/burnbag\/?$/, '/brighthub');
    const url = `${hubBase}/search?type=users&q=${encodeURIComponent(query)}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { credentials: 'include', headers });
    if (!res.ok) return [];
    const json = await res.json();
    const users = json.data?.users ?? json.users ?? [];
    return users.map(
      (u: {
        _id: string;
        username: string;
        displayName: string;
        profilePictureUrl?: string;
      }) => ({
        id: u._id,
        username: u.username,
        displayName: u.displayName,
        profilePictureUrl: u.profilePictureUrl,
      }),
    );
  }

  // -- Analytics --------------------------------------------------------------

  /**
   * Fetch time-series buckets for a provider connection.
   */
  async getTimeSeries(
    connectionId: string,
    since: Date,
    until: Date,
  ): Promise<ITimeBucket[]> {
    const params = new URLSearchParams({
      since: since.toISOString(),
      until: until.toISOString(),
    });
    return this.request(
      `/providers/connections/${connectionId}/analytics/timeseries?${params}`,
    );
  }

  /**
   * Fetch aggregate statistics for a provider connection.
   */
  async getAggregateStats(
    connectionId: string,
    since: Date,
    until: Date,
  ): Promise<IAggregateStats> {
    const params = new URLSearchParams({
      since: since.toISOString(),
      until: until.toISOString(),
    });
    return this.request(
      `/providers/connections/${connectionId}/analytics/stats?${params}`,
    );
  }

  /**
   * Fetch heatmap day data for a provider connection.
   */
  async getHeatmap(
    connectionId: string,
    since: Date,
    until: Date,
  ): Promise<IHeatmapDay[]> {
    const params = new URLSearchParams({
      since: since.toISOString(),
      until: until.toISOString(),
    });
    return this.request(
      `/providers/connections/${connectionId}/analytics/heatmap?${params}`,
    );
  }

  /**
   * Fetch streak and duration info for a provider connection.
   */
  async getStreakInfo(connectionId: string): Promise<IStreakInfo> {
    return this.request(
      `/providers/connections/${connectionId}/analytics/streak`,
    );
  }

  /**
   * Fetch comparison data for multiple provider connections.
   */
  async getComparison(
    connectionIds: string[],
    since: Date,
    until: Date,
  ): Promise<IComparisonDataset[]> {
    const params = new URLSearchParams({
      connectionIds: connectionIds.join(','),
      since: since.toISOString(),
      until: until.toISOString(),
    });
    return this.request(`/providers/analytics/compare?${params}`);
  }

  /**
   * Export history for a provider connection, triggering a browser download.
   */
  async exportHistory(
    connectionId: string,
    format: 'csv' | 'json',
    since?: Date,
    until?: Date,
    signalTypes?: string[],
  ): Promise<void> {
    const params = new URLSearchParams({ format });
    if (since) params.set('since', since.toISOString());
    if (until) params.set('until', until.toISOString());
    if (signalTypes?.length) params.set('signalTypes', signalTypes.join(','));

    const url = `${this.baseUrl}/providers/connections/${connectionId}/history/export?${params}`;
    const headers: Record<string, string> = {};
    const token = this.getToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { credentials: 'include', headers });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new ApiError(res.status, body || res.statusText);
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition');
    const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
    const filename =
      filenameMatch?.[1] ??
      `history-export.${format === 'csv' ? 'csv' : 'json'}`;

    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);
  }

  // -- Multi-Canary Bindings -------------------------------------------------

  /**
   * Get all multi-canary bindings for the current user.
   */
  async getMultiCanaryBindings(): Promise<IApiMultiCanaryBindingDTO[]> {
    return this.request('/multi-canary-bindings');
  }

  /**
   * Get a specific multi-canary binding by ID.
   */
  async getMultiCanaryBinding(bindingId: string): Promise<IApiMultiCanaryBindingDTO> {
    return this.request(`/multi-canary-bindings/${bindingId}`);
  }

  /**
   * Create a new multi-canary binding.
   */
  async createMultiCanaryBinding(params: {
    name: string;
    providerConnectionIds: string[];
    targetIds: string[];
    redundancyPolicy: string;
    providerWeights?: Record<string, number>;
    weightedThresholdPercent?: number;
    protocolAction: string;
    canaryCondition: string;
    absenceThresholdHours: number;
  }): Promise<IApiMultiCanaryBindingDTO> {
    return this.request('/multi-canary-bindings', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Update a multi-canary binding.
   */
  async updateMultiCanaryBinding(
    bindingId: string,
    updates: Record<string, unknown>,
  ): Promise<IApiMultiCanaryBindingDTO> {
    return this.request(`/multi-canary-bindings/${bindingId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a multi-canary binding.
   */
  async deleteMultiCanaryBinding(bindingId: string): Promise<void> {
    return this.request(`/multi-canary-bindings/${bindingId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get multi-canary bindings for a specific target.
   */
  async getMultiCanaryBindingsForTarget(targetId: string): Promise<IApiMultiCanaryBindingDTO[]> {
    return this.request(`/multi-canary-bindings/target/${targetId}`);
  }

  // -- Webhook Endpoints -----------------------------------------------------

  /**
   * Get all webhook endpoints for the current user.
   */
  async getWebhookEndpoints(): Promise<IApiWebhookEndpointDTO[]> {
    return this.request('/webhook-endpoints');
  }

  /**
   * Create a webhook endpoint for a provider connection.
   */
  async createWebhookEndpoint(connectionId: string): Promise<IApiWebhookEndpointDTO> {
    return this.request('/webhook-endpoints', {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    });
  }

  /**
   * Rotate the secret for a webhook endpoint.
   */
  async rotateWebhookSecret(
    endpointId: string,
    gracePeriodMs?: number,
  ): Promise<{ newSecret: string }> {
    return this.request(`/webhook-endpoints/${endpointId}/rotate-secret`, {
      method: 'PUT',
      body: JSON.stringify({ gracePeriodMs }),
    });
  }

  /**
   * Update the IP allowlist for a webhook endpoint.
   */
  async updateWebhookIpAllowlist(
    endpointId: string,
    cidrs: string[],
  ): Promise<void> {
    return this.request(`/webhook-endpoints/${endpointId}/ip-allowlist`, {
      method: 'PUT',
      body: JSON.stringify({ cidrs }),
    });
  }

  /**
   * Send a test webhook to an endpoint.
   */
  async sendTestWebhook(
    endpointId: string,
  ): Promise<{ success: boolean; error?: string; processingTimeMs: number }> {
    return this.request(`/webhook-endpoints/${endpointId}/test`, {
      method: 'POST',
    });
  }

  /**
   * Get delivery stats for a webhook endpoint.
   */
  async getWebhookDeliveryStats(endpointId: string): Promise<IApiWebhookDeliveryStatsDTO> {
    return this.request(`/webhook-endpoints/${endpointId}/stats`);
  }

  // -- Provider Catalog (Expansion) ------------------------------------------

  /**
   * Get the full provider catalog with optional filters.
   */
  async getProviderCatalog(filters?: {
    category?: string;
    authType?: string;
    supportsWebhooks?: boolean;
    searchQuery?: string;
  }): Promise<IApiProviderDisplayInfoDTO[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.authType) params.set('authType', filters.authType);
    if (filters?.supportsWebhooks !== undefined) params.set('supportsWebhooks', String(filters.supportsWebhooks));
    if (filters?.searchQuery) params.set('q', filters.searchQuery);
    const qs = params.toString();
    return this.request(`/canary/providers/catalog${qs ? `?${qs}` : ''}`);
  }

  /**
   * Get recommended providers from the catalog.
   */
  async getRecommendedProviders(): Promise<IApiProviderDisplayInfoDTO[]> {
    return this.request('/canary/providers/catalog/recommended');
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
