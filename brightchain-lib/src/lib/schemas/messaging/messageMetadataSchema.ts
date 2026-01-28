import { BrightChainStrings } from '../../enumerations';
import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { TranslatableBrightChainError } from '../../errors/translatableBrightChainError';
import { IMessageMetadata } from '../../interfaces/messaging/messageMetadata';
import { SchemaDefinition } from '../../sharedTypes';

/**
 * Schema for message metadata storage.
 *
 * @remarks
 * Defines serialization/hydration for message-specific fields.
 * Base block metadata fields are handled by parent schema.
 *
 * @see Requirements 1.3, 9.1, 9.2, 9.3, 10.2
 */
export const MessageMetadataSchema: Partial<
  SchemaDefinition<IMessageMetadata>
> = {
  messageType: {
    type: String,
    required: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  recipients: {
    type: Array,
    required: true,
    serialize: (value: string[]): string[] => value,
    hydrate: (value: unknown): string[] => {
      if (!Array.isArray(value))
        throw new TranslatableBrightChainError(
          BrightChainStrings.Error_MessageMetadataSchema_InvalidRecipientsFormat,
        );
      return value;
    },
  },
  priority: {
    type: Number,
    required: true,
    serialize: (value: MessagePriority): number => value,
    hydrate: (value: unknown): MessagePriority => {
      if (typeof value !== 'number')
        throw new TranslatableBrightChainError(
          BrightChainStrings.Error_MessageMetadataSchema_InvalidPriorityFormat,
        );
      return value as MessagePriority;
    },
  },
  deliveryStatus: {
    type: Object,
    required: true,
    serialize: (
      value: Map<string, MessageDeliveryStatus>,
    ): Record<string, string> => Object.fromEntries(value),
    hydrate: (value: unknown): Map<string, MessageDeliveryStatus> => {
      if (typeof value !== 'object' || value === null)
        throw new TranslatableBrightChainError(
          BrightChainStrings.Error_MessageMetadataSchema_InvalidDeliveryStatusFormat,
        );
      return new Map(
        Object.entries(value as Record<string, MessageDeliveryStatus>),
      );
    },
  },
  acknowledgments: {
    type: Object,
    required: true,
    serialize: (value: Map<string, Date>): Record<string, string> =>
      Object.fromEntries(
        Array.from(value.entries()).map(([k, v]) => [k, v.toISOString()]),
      ),
    hydrate: (value: unknown): Map<string, Date> => {
      if (typeof value !== 'object' || value === null)
        throw new TranslatableBrightChainError(
          BrightChainStrings.Error_MessageMetadataSchema_InvalidAcknowledgementsFormat,
        );
      return new Map(
        Object.entries(value as Record<string, string>).map(([k, v]) => [
          k,
          new Date(v),
        ]),
      );
    },
  },
  encryptionScheme: {
    type: String,
    required: true,
    serialize: (value: MessageEncryptionScheme): string => value,
    hydrate: (value: unknown): MessageEncryptionScheme => {
      if (typeof value !== 'string')
        throw new TranslatableBrightChainError(
          BrightChainStrings.Error_MessageMetadataSchema_InvalidEncryptionSchemeFormat,
        );
      return value as MessageEncryptionScheme;
    },
  },
  isCBL: {
    type: Boolean,
    required: true,
  },
  cblBlockIds: {
    type: Array,
    required: false,
    serialize: (value: string[] | undefined): string[] | null => value ?? null,
    hydrate: (value: unknown): string[] | undefined => {
      if (value === undefined || value === null) return undefined;
      if (!Array.isArray(value))
        throw new TranslatableBrightChainError(
          BrightChainStrings.Error_MessageMetadataSchema_InvalidCBLBlockIDsFormat,
        );
      return value;
    },
  },
};

export default MessageMetadataSchema;
