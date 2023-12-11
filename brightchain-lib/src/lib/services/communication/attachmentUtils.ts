/**
 * Shared attachment validation and processing utilities for chat services.
 *
 * Validates attachment size/count limits and converts IChatAttachmentInput[]
 * into IChatAttachmentMetadata[] for storage on messages.
 *
 * Requirements: 11.1, 11.2, 11.4, 11.5
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AttachmentTooLargeError,
  TooManyAttachmentsError,
} from '../../errors/encryptionErrors';
import {
  DEFAULT_ATTACHMENT_CONFIG,
  IAttachmentConfig,
  IChatAttachmentInput,
  IChatAttachmentMetadata,
} from '../../interfaces/communication';

/**
 * Validate attachment limits and produce metadata entries.
 *
 * Checks count limit first, then per-file size limit.
 * Returns an array of IChatAttachmentMetadata with generated assetIds.
 *
 * @throws TooManyAttachmentsError if attachments.length > config.maxAttachmentsPerMessage
 * @throws AttachmentTooLargeError if any attachment exceeds config.maxFileSizeBytes
 */
export function validateAndPrepareAttachments(
  attachments: IChatAttachmentInput[],
  config: IAttachmentConfig = DEFAULT_ATTACHMENT_CONFIG,
): IChatAttachmentMetadata[] {
  if (attachments.length > config.maxAttachmentsPerMessage) {
    throw new TooManyAttachmentsError(
      attachments.length,
      config.maxAttachmentsPerMessage,
    );
  }

  const metadata: IChatAttachmentMetadata[] = [];

  for (const att of attachments) {
    if (att.content.length > config.maxFileSizeBytes) {
      throw new AttachmentTooLargeError(
        att.fileName,
        att.content.length,
        config.maxFileSizeBytes,
      );
    }

    metadata.push({
      assetId: uuidv4(),
      fileName: att.fileName,
      mimeType: att.mimeType,
      encryptedSize: att.content.length, // placeholder — real encryption may change size
      originalSize: att.content.length,
    });
  }

  return metadata;
}
