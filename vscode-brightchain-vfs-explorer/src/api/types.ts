/**
 * Extension-local API request/response types.
 *
 * Placeholder DTO interfaces mirror the shapes from `digitalburnbag-lib`
 * with `string` as the TID type parameter. When the lib types become
 * available as a direct dependency these can be replaced with re-exports.
 */

// ---------------------------------------------------------------------------
// Placeholder DTO types (mirrors digitalburnbag-lib with TID = string)
// ---------------------------------------------------------------------------

/** Mirrors IFileMetadataBase<string> from digitalburnbag-lib */
export interface IFileMetadataDTO {
  id: string;
  ownerId: string;
  folderId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  description?: string;
  tags: string[];
  currentVersionId: string;
  aclId?: string;
  deletedAt?: Date | string;
  deletedFromPath?: string;
  scheduledDestructionAt?: Date | string;
  quorumGoverned: boolean;
  visibleWatermark: boolean;
  invisibleWatermark: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
  updatedBy: string;
}

/** Mirrors IFolderMetadataBase<string> from digitalburnbag-lib */
export interface IFolderMetadataDTO {
  id: string;
  ownerId: string;
  parentFolderId?: string;
  name: string;
  aclId?: string;
  deletedAt?: Date | string;
  deletedFromPath?: string;
  quorumGoverned: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
  updatedBy: string;
}

/** Mirrors IFileVersionBase<string> from digitalburnbag-lib */
export interface IFileVersionDTO {
  id: string;
  fileId: string;
  versionNumber: number;
  sizeBytes: number;
  /** Vault state: sealed, accessed, destroyed */
  vaultState: string;
  uploaderId: string;
  createdAt: Date | string;
}

// ---------------------------------------------------------------------------
// Extension-local types
// ---------------------------------------------------------------------------

/** Folder contents as returned by GET /folders/{folderId}/contents */
export interface IFolderContentsDTO {
  files: IFileMetadataDTO[];
  folders: IFolderMetadataDTO[];
}

/** Upload session initialization params */
export interface IInitUploadParams {
  fileName: string;
  fileSize: number;
  mimeType: string;
  targetFolderId: string;
}

/** Upload session response from POST /upload/init */
export interface IUploadSessionDTO {
  sessionId: string;
  chunkSize: number;
  totalChunks: number;
}

/** Chunk upload receipt */
export interface IChunkReceipt {
  chunksReceived: number;
  totalChunks: number;
}

/** Direct challenge payload sent to POST /api/user/direct-challenge */
export interface IDirectChallengePayload {
  /** hex-encoded: time(8) + nonce(32) + serverSignature */
  challenge: string;
  /** hex-encoded ECIES signature */
  signature: string;
  username?: string;
  email?: string;
}

/** Search query filters */
export interface ISearchFilters {
  mimeType?: string;
  folderId?: string;
}

/** Search results from GET /files/search */
export interface ISearchResultsDTO {
  results: IFileMetadataDTO[];
  totalCount: number;
}

/** File metadata update payload for PUT /files/{fileId} */
export interface IFileMetadataUpdate {
  fileName?: string;
  description?: string;
  tags?: string[];
  /** Move to a different folder */
  folderId?: string;
}

/** Successful login response data */
export interface ILoginResponseData {
  user: IRequestUserDTO;
  token: string;
  serverPublicKey: string;
}

/** Response from POST /api/user/request-direct-login */
export interface IChallengeResponseData {
  challenge: string;
  message: string;
  serverPublicKey: string;
}

/**
 * Placeholder for the upstream IRequestUserDTO from suite-core-lib.
 * Contains the fields the extension actually consumes.
 */
export interface IRequestUserDTO {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  emailVerified: boolean;
}
