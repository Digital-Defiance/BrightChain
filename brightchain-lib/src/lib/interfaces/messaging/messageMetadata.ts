import type { PlatformID } from '@digitaldefiance/ecies-lib';

import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import type { BlockId } from '../branded/primitives/blockId';
import { IBlockMetadata } from '../storage/blockMetadata';

/**
 * Extended block metadata for message blocks.
 *
 * @remarks
 * Extends standard block metadata with message-specific fields for
 * routing, delivery tracking, and encryption.
 *
 * Messages can use any BlockSize (Small, Medium, Large, Huge) depending on
 * the message content size. The size field from IBlockMetadata determines
 * the actual block size used for storage.
 *
 * For messages larger than a single block, isCBL will be true and cblBlockIds
 * will contain the constituent block IDs for reconstruction.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility.
 *   Defaults to `string` for backward compatibility. Backend code can use
 *   `IMessageMetadata<GuidV4Uint8Array>` while frontend uses `IMessageMetadata<string>`.
 *
 * @see Requirements 1.3, 1.4, 1.5, 2.1, 3.5, 6.3, 10.2
 */
export interface IMessageMetadata<TID extends PlatformID = string>
  extends IBlockMetadata {
  /** Application-defined message type */
  messageType: string;

  /** Node ID of sender */
  senderId: TID;

  /** Recipient node IDs (empty = broadcast) */
  recipients: TID[];

  /** Message priority level */
  priority: MessagePriority;

  /** Delivery status per recipient */
  deliveryStatus: Map<TID, DeliveryStatus>;

  /** Acknowledgment timestamps per recipient */
  acknowledgments: Map<TID, Date>;

  /** Encryption scheme used */
  encryptionScheme: MessageEncryptionScheme;

  /** True if message spans multiple blocks */
  isCBL: boolean;

  /** Block IDs for CBL reconstruction */
  cblBlockIds?: BlockId[];
}
