/**
 * Error hierarchy for the Digital Burnbag library.
 *
 * All errors extend BurnBagError for consistent handling.
 * Error messages MUST NOT leak sensitive material (tree seed, keys).
 */

export class BurnBagError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'BurnBagError';
  }
}

export class VaultDestroyedError extends BurnBagError {
  constructor() {
    super('Vault has been destroyed', 'VAULT_DESTROYED');
  }
}

export class DecryptionError extends BurnBagError {
  constructor(detail?: string) {
    super(
      `Decryption failed${detail ? ': ' + detail : ''}`,
      'DECRYPTION_FAILED',
    );
  }
}

export class ChainVerificationError extends BurnBagError {
  constructor(detail: string) {
    super(detail, 'TREE_VERIFICATION_FAILED');
  }
}

export class TreeDepthError extends BurnBagError {
  constructor(depth: number) {
    super(`Tree depth ${depth} is below minimum of 8`, 'TREE_DEPTH_INVALID');
  }
}

export class SignatureVerificationError extends BurnBagError {
  constructor() {
    super('Invalid signature', 'SIGNATURE_INVALID');
  }
}

export class SerializationError extends BurnBagError {
  constructor(detail: string) {
    super(detail, 'SERIALIZATION_FAILED');
  }
}

export class DeserializationError extends BurnBagError {
  constructor(detail: string) {
    super(detail, 'DESERIALIZATION_FAILED');
  }
}

export class TimestampError extends BurnBagError {
  constructor() {
    super('Destruction proof timestamp is in the future', 'TIMESTAMP_FUTURE');
  }
}

export class LedgerWriteError extends BurnBagError {
  constructor(detail?: string) {
    super(
      `Ledger write failed${detail ? ': ' + detail : ''}`,
      'LEDGER_WRITE_FAILED',
    );
  }
}

export class CustodialKeyReleaseError extends BurnBagError {
  constructor(detail?: string) {
    super(
      `Custodial key release failed${detail ? ': ' + detail : ''}`,
      'CUSTODIAL_KEY_RELEASE_FAILED',
    );
  }
}

export class SealLedgerInconsistencyError extends BurnBagError {
  constructor(detail?: string) {
    super(
      `Seal and ledger are inconsistent — possible tampering${detail ? ': ' + detail : ''}`,
      'SEAL_LEDGER_INCONSISTENCY',
    );
  }
}

export class QuotaExceededError extends BurnBagError {
  constructor(
    public readonly currentUsageBytes: number,
    public readonly quotaBytes: number,
    public readonly additionalBytes: number,
  ) {
    super(
      `Storage quota exceeded: ${currentUsageBytes + additionalBytes} bytes would exceed quota of ${quotaBytes} bytes (current usage: ${currentUsageBytes})`,
      'QUOTA_EXCEEDED',
    );
  }
}

export class QuotaNotFoundError extends BurnBagError {
  constructor(detail?: string) {
    super(
      `No quota record found${detail ? ': ' + detail : ''}`,
      'QUOTA_NOT_FOUND',
    );
  }
}

export class UnauthorizedError extends BurnBagError {
  constructor(detail?: string) {
    super(`Unauthorized${detail ? ': ' + detail : ''}`, 'UNAUTHORIZED');
  }
}

export class DuplicateFolderNameError extends BurnBagError {
  constructor(name: string, parentFolderId: string) {
    super(
      `A folder named "${name}" already exists in parent folder ${parentFolderId}`,
      'DUPLICATE_FOLDER_NAME',
    );
  }
}

export class FolderNotFoundError extends BurnBagError {
  constructor(folderId: string) {
    super(`Folder not found: ${folderId}`, 'FOLDER_NOT_FOUND');
  }
}

export class InvalidMoveError extends BurnBagError {
  constructor(detail: string) {
    super(detail, 'INVALID_MOVE');
  }
}

export class ACLNotFoundError extends BurnBagError {
  constructor(targetId: string, targetType: string) {
    super(`No ACL found for ${targetType} ${targetId}`, 'ACL_NOT_FOUND');
  }
}

export class IPConstraintViolationError extends BurnBagError {
  constructor(ipAddress: string, allowedRange: string) {
    super(
      `Access denied: IP address ${ipAddress} is outside the allowed range ${allowedRange}`,
      'IP_CONSTRAINT_VIOLATION',
    );
  }
}

export class TimeWindowConstraintViolationError extends BurnBagError {
  constructor(
    currentTime: string,
    windowStart: string,
    windowEnd: string,
    timezone: string,
  ) {
    super(
      `Access denied: current time ${currentTime} is outside the allowed window ${windowStart}–${windowEnd} (${timezone})`,
      'TIME_WINDOW_CONSTRAINT_VIOLATION',
    );
  }
}

export class PermissionDeniedError extends BurnBagError {
  constructor(detail?: string) {
    super(
      `Permission denied${detail ? ': ' + detail : ''}`,
      'PERMISSION_DENIED',
    );
  }
}

export class TargetNotFoundError extends BurnBagError {
  constructor(targetId: string, targetType: string) {
    super(`${targetType} not found: ${targetId}`, 'TARGET_NOT_FOUND');
  }
}

export class FileNotFoundError extends BurnBagError {
  constructor(fileId: string) {
    super(`File not found: ${fileId}`, 'FILE_NOT_FOUND');
  }
}

export class FileVersionNotFoundError extends BurnBagError {
  constructor(fileId: string, versionId: string) {
    super(
      `Version ${versionId} not found for file ${fileId}`,
      'FILE_VERSION_NOT_FOUND',
    );
  }
}

export class UploadSessionNotFoundError extends BurnBagError {
  constructor(sessionId: string) {
    super(`Upload session not found: ${sessionId}`, 'UPLOAD_SESSION_NOT_FOUND');
  }
}

export class UploadSessionExpiredError extends BurnBagError {
  constructor(sessionId: string) {
    super(`Upload session has expired: ${sessionId}`, 'UPLOAD_SESSION_EXPIRED');
  }
}

export class ChunkChecksumMismatchError extends BurnBagError {
  constructor(chunkIndex: number, expected: string, actual: string) {
    super(
      `Chunk ${chunkIndex} checksum mismatch: expected ${expected}, got ${actual}`,
      'CHUNK_CHECKSUM_MISMATCH',
    );
  }
}

export class ChunkIndexOutOfRangeError extends BurnBagError {
  constructor(chunkIndex: number, totalChunks: number) {
    super(
      `Chunk index ${chunkIndex} is out of range (0–${totalChunks - 1})`,
      'CHUNK_INDEX_OUT_OF_RANGE',
    );
  }
}

export class UploadIncompleteError extends BurnBagError {
  constructor(received: number, total: number) {
    super(
      `Cannot finalize: only ${received} of ${total} chunks received`,
      'UPLOAD_INCOMPLETE',
    );
  }
}

export class ShareLinkNotFoundError extends BurnBagError {
  constructor(detail?: string) {
    super(
      `Share link not found${detail ? ': ' + detail : ''}`,
      'SHARE_LINK_NOT_FOUND',
    );
  }
}

export class ShareLinkExpiredError extends BurnBagError {
  constructor(shareLinkId: string) {
    super(`Share link has expired: ${shareLinkId}`, 'SHARE_LINK_EXPIRED');
  }
}

export class ShareLinkRevokedError extends BurnBagError {
  constructor(shareLinkId: string) {
    super(`Share link has been revoked: ${shareLinkId}`, 'SHARE_LINK_REVOKED');
  }
}

export class ShareLinkMaxAccessError extends BurnBagError {
  constructor(shareLinkId: string) {
    super(
      `Share link has reached maximum access count: ${shareLinkId}`,
      'SHARE_LINK_MAX_ACCESS',
    );
  }
}

export class ShareLinkPasswordError extends BurnBagError {
  constructor() {
    super('Invalid share link password', 'SHARE_LINK_PASSWORD_INVALID');
  }
}

export class DestructionError extends BurnBagError {
  constructor(detail?: string) {
    super(
      `Destruction failed${detail ? ': ' + detail : ''}`,
      'DESTRUCTION_FAILED',
    );
  }
}

export class ScheduledDestructionNotFoundError extends BurnBagError {
  constructor(fileId: string) {
    super(
      `No scheduled destruction found for file: ${fileId}`,
      'SCHEDULED_DESTRUCTION_NOT_FOUND',
    );
  }
}

export class ApprovalRequiredError extends BurnBagError {
  constructor(detail: string) {
    super(`Approval required: ${detail}`, 'APPROVAL_REQUIRED');
  }
}

export class ApprovalRequestNotFoundError extends BurnBagError {
  constructor(requestId: string) {
    super(
      `Approval request not found: ${requestId}`,
      'APPROVAL_REQUEST_NOT_FOUND',
    );
  }
}

export class ApprovalAlreadyResolvedError extends BurnBagError {
  constructor(requestId: string, status: string) {
    super(
      `Approval request ${requestId} is already resolved with status: ${status}`,
      'APPROVAL_ALREADY_RESOLVED',
    );
  }
}

export class AuditLogError extends BurnBagError {
  constructor(detail?: string) {
    super(`Audit log failed${detail ? ': ' + detail : ''}`, 'AUDIT_LOG_FAILED');
  }
}

export class CanaryBindingNotFoundError extends BurnBagError {
  constructor(bindingId: string) {
    super(`Canary binding not found: ${bindingId}`, 'CANARY_BINDING_NOT_FOUND');
  }
}

export class RecipientListNotFoundError extends BurnBagError {
  constructor(listId: string) {
    super(`Recipient list not found: ${listId}`, 'RECIPIENT_LIST_NOT_FOUND');
  }
}

export class CascadeNotFoundError extends BurnBagError {
  constructor(cascadeId: string) {
    super(`Cascade action not found: ${cascadeId}`, 'CASCADE_NOT_FOUND');
  }
}

export class FolderExportError extends BurnBagError {
  constructor(detail: string) {
    super(`Folder export failed: ${detail}`, 'FOLDER_EXPORT_FAILED');
  }
}

export class VaultContainerNotFoundError extends BurnBagError {
  constructor(containerId: string) {
    super(
      `Vault container not found: ${containerId}`,
      'VAULT_CONTAINER_NOT_FOUND',
    );
  }
}

export class VaultContainerDestroyedError extends BurnBagError {
  constructor(containerId: string) {
    super(
      `Vault container has been destroyed: ${containerId}`,
      'VAULT_CONTAINER_DESTROYED',
    );
  }
}

export class VaultContainerLockedError extends BurnBagError {
  constructor(containerId: string) {
    super(
      `Vault container is locked — modifications are not allowed: ${containerId}`,
      'VAULT_CONTAINER_LOCKED',
    );
  }
}

export class DuplicateVaultContainerNameError extends BurnBagError {
  constructor(name: string) {
    super(
      `A vault container named "${name}" already exists`,
      'DUPLICATE_VAULT_CONTAINER_NAME',
    );
  }
}

export class SealBreakNotConfirmedError extends BurnBagError {
  constructor(fileId: string) {
    super(
      `File ${fileId} has a pristine seal. Reading requires explicit seal-break confirmation.`,
      'SEAL_BREAK_NOT_CONFIRMED',
    );
  }
}

export class MimeTypeMismatchError extends BurnBagError {
  constructor(fileId: string, expected: string, actual: string) {
    super(
      `MIME type mismatch for file ${fileId}: expected "${expected}" but received "${actual}". ` +
        `Upload a file with the same type or create a new file instead.`,
      'MIME_TYPE_MISMATCH',
    );
  }
}

export class NewVersionUploadError extends BurnBagError {
  constructor(detail: string) {
    super(detail, 'NEW_VERSION_UPLOAD_ERROR');
  }
}

export class InvalidStateTransitionError extends BurnBagError {
  constructor(currentState: string, requestedState: string) {
    super(
      `INVALID_STATE_TRANSITION: cannot transition from '${currentState}' to '${requestedState}'`,
      'INVALID_STATE_TRANSITION',
    );
  }
}

export class VaultAlreadyDisownedError extends BurnBagError {
  constructor(containerId: string) {
    super(
      `VAULT_ALREADY_DISOWNED: vault '${containerId}' has already been disowned`,
      'VAULT_ALREADY_DISOWNED',
    );
  }
}

export class DisownRequiresPublicVisibilityError extends BurnBagError {
  constructor(containerId: string) {
    super(
      `DISOWN_REQUIRES_PUBLIC_VISIBILITY: vault '${containerId}' is not public`,
      'DISOWN_REQUIRES_PUBLIC_VISIBILITY',
    );
  }
}

export class DeletionAlreadyScheduledError extends BurnBagError {
  constructor(
    containerId: string,
    public readonly pendingDeletionAt: string,
  ) {
    super(
      `DELETION_ALREADY_SCHEDULED: vault '${containerId}' already has pending deletion at ${pendingDeletionAt}`,
      'DELETION_ALREADY_SCHEDULED',
    );
  }
}

export class CertificateNotFoundError extends BurnBagError {
  constructor(containerId: string) {
    super(
      `CERTIFICATE_NOT_FOUND: no certificate exists for vault '${containerId}'`,
      'CERTIFICATE_NOT_FOUND',
    );
  }
}
