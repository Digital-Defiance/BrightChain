import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
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
      if (!Array.isArray(value)) throw new Error('Invalid recipients format');
      return value;
    },
  },
  priority: {
    type: Number,
    required: true,
    serialize: (value: MessagePriority): number => value,
    hydrate: (value: unknown): MessagePriority => {
      if (typeof value !== 'number') throw new Error('Invalid priority format');
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
        throw new Error('Invalid delivery status format');
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
        throw new Error('Invalid acknowledgments format');
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
        throw new Error('Invalid encryption scheme format');
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
        throw new Error('Invalid CBL block IDs format');
      return value;
    },
  },
};

export default MessageMetadataSchema;
