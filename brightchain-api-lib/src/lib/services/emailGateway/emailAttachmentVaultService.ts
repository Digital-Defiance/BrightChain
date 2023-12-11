/**
 * EmailAttachmentVaultService
 *
 * Creates a private Digital Burnbag vault container for each inbound email
 * that carries attachments, uploads each attachment into the vault, and
 * returns the vault container ID plus per-file IDs so that InboundProcessor
 * can store them on the email metadata.
 *
 * The vault is named `Email: <subject> (<date>)` and is set to
 * `VaultVisibility.Private` so only explicitly granted principals can access it.
 *
 * Upload flow (non-Joule path):
 *   1. vaultContainerService.createContainer()  — creates vault + root folder
 *   2. For each attachment:
 *      a. uploadService.createSession()
 *      b. uploadService.receiveChunk(0, bytes, sha256hex)
 *      c. uploadService.finalize()   →  IFileMetadataBase with .id
 */

import { sha256 } from '@noble/hashes/sha256';

import type {
  IUploadService,
  IVaultContainerService,
} from '@brightchain/digitalburnbag-lib';
import { VaultVisibility } from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';

// ─── Public interface ────────────────────────────────────────────────────────

/**
 * Describes a single attachment upload result.
 */
export interface IVaultFileResult {
  /** Original filename supplied by the caller */
  filename: string;
  /** File ID assigned by the Digital Burnbag vault */
  vaultFileId: string;
}

/**
 * Return value of `IEmailAttachmentVaultService.createVaultForEmail()`.
 */
export interface IEmailVaultResult {
  /** The newly-created vault container ID (stringified TID) */
  vaultContainerId: string;
  /** Per-attachment upload results in the same order as the input array */
  files: IVaultFileResult[];
}

/**
 * Attachment descriptor passed to `createVaultForEmail`.
 */
export interface IEmailAttachment {
  filename: string;
  mimeType: string;
  content: Uint8Array;
}

/**
 * Thin interface for creating an email-scoped private vault and uploading
 * files into it.
 */
export interface IEmailAttachmentVaultService {
  /**
   * Create a private vault for a single email and upload each attachment.
   *
   * @param emailId   - Unique identifier for the email (e.g. messageId).
   *                    Used in the vault name to aid in human identification.
   * @param subject   - Email subject (may be undefined for anonymous emails).
   * @param date      - Email date used in the vault name.
   * @param ownerId   - Platform ID (as string) of the vault owner.
   * @param attachments - Non-empty array of attachment descriptors.
   * @returns vault container ID and per-file upload results.
   */
  createVaultForEmail(
    emailId: string,
    subject: string | undefined,
    date: Date,
    ownerId: string,
    attachments: IEmailAttachment[],
  ): Promise<IEmailVaultResult>;
}

// ─── Implementation ──────────────────────────────────────────────────────────

/**
 * Concrete implementation of `IEmailAttachmentVaultService` that delegates
 * to the Digital Burnbag `IVaultContainerService` and `IUploadService`.
 */
export class EmailAttachmentVaultService<TID extends PlatformID>
  implements IEmailAttachmentVaultService
{
  constructor(
    private readonly vaultContainerService: IVaultContainerService<TID>,
    private readonly uploadService: IUploadService<TID>,
    private readonly parseId: (idString: string) => TID,
    private readonly idToString: (id: TID) => string,
  ) {}

  async createVaultForEmail(
    emailId: string,
    subject: string | undefined,
    date: Date,
    ownerIdStr: string,
    attachments: IEmailAttachment[],
  ): Promise<IEmailVaultResult> {
    const ownerId = this.parseId(ownerIdStr);

    // Build a human-friendly vault name from the email subject + date.
    const dateLabel = date.toISOString().slice(0, 10); // YYYY-MM-DD
    const subjectLabel = subject
      ? subject.slice(0, 80).replace(/[<>:"/\\|?*]/g, '_')
      : '(no subject)';
    const vaultName = `Email: ${subjectLabel} (${dateLabel})`;

    // 1. Create the private vault container.
    const container = await this.vaultContainerService.createContainer({
      name: vaultName,
      description: `Attachments for email ${emailId}`,
      ownerId,
      visibility: VaultVisibility.Private,
    });

    const vaultContainerId = this.idToString(container.id);
    const rootFolderId = container.rootFolderId;

    // 2. Upload each attachment into the vault's root folder.
    const fileResults: IVaultFileResult[] = await Promise.all(
      attachments.map(async (att) => {
        // Compute SHA-256 checksum (hex) for the chunk receipt.
        const hashBytes = sha256(att.content);
        const checksum = Array.from(hashBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        // 2a. Create upload session.
        const session = await this.uploadService.createSession({
          userId: ownerId,
          fileName: att.filename,
          mimeType: att.mimeType,
          totalSizeBytes: att.content.length,
          targetFolderId: rootFolderId,
          vaultContainerId: container.id,
        });

        // 2b. Deliver the single chunk (index 0).
        await this.uploadService.receiveChunk(
          session.id,
          0,
          att.content,
          checksum,
        );

        // 2c. Finalize — encrypts, stores blocks, creates file record.
        const fileMeta = await this.uploadService.finalize(session.id);

        return {
          filename: att.filename,
          vaultFileId: this.idToString(fileMeta.id),
        };
      }),
    );

    return { vaultContainerId, files: fileResults };
  }
}
