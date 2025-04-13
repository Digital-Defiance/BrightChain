import { EmailString, GuidV4 } from '@digitaldefiance/ecies-lib';
import {
  IPrivateMemberData,
  IPublicMemberData,
} from '../../interfaces/member/memberData';
import { SchemaDefinition, SerializedValue } from '../../sharedTypes';

const isString = (value: unknown): value is string => typeof value === 'string';
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);
const isActivityLogEntry = (
  value: unknown,
): value is {
  timestamp: string;
  action: string;
  details: Record<string, SerializedValue>;
} =>
  typeof value === 'object' &&
  value !== null &&
  'timestamp' in value &&
  'action' in value &&
  'details' in value &&
  isString((value as { timestamp: unknown }).timestamp) &&
  isString((value as { action: unknown }).action) &&
  typeof (value as { details: unknown }).details === 'object';

/**
 * Schema for public member data
 */
export const PublicMemberSchema: SchemaDefinition<IPublicMemberData> = {
  id: {
    type: Object,
    required: true,
    serialize: (value: GuidV4): string => value.serialize(),
    hydrate: (value: unknown): GuidV4 => {
      if (!isString(value)) throw new Error('Invalid ID format');
      return GuidV4.hydrate(value);
    },
  },
  type: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  dateCreated: {
    type: Date,
    required: true,
  },
  dateUpdated: {
    type: Date,
    required: true,
  },
  publicKey: {
    type: Object,
    required: true,
    serialize: (value: Buffer): string => value.toString('base64'),
    hydrate: (value: unknown): Buffer => {
      if (!isString(value)) throw new Error('Invalid public key format');
      return Buffer.from(value, 'base64');
    },
  },
  votingPublicKey: {
    type: Object,
    required: true,
    serialize: (value: Buffer): string => value.toString('base64'),
    hydrate: (value: unknown): Buffer => {
      if (!isString(value)) throw new Error('Invalid voting public key format');
      return Buffer.from(value, 'base64');
    },
  },
  status: {
    type: String,
    required: true,
  },
  lastSeen: {
    type: Date,
    required: true,
  },
  reputation: {
    type: Number,
    required: true,
  },
  storageContributed: {
    type: Number,
    required: true,
  },
  storageUsed: {
    type: Number,
    required: true,
  },
  region: {
    type: String,
    required: false,
  },
  geographicSpread: {
    type: Number,
    required: false,
  },
};

/**
 * Schema for private member data
 */
export const PrivateMemberSchema: SchemaDefinition<IPrivateMemberData> = {
  id: {
    type: Object,
    required: true,
    serialize: (value: GuidV4): string => value.serialize(),
    hydrate: (value: unknown): GuidV4 => {
      if (!isString(value)) throw new Error('Invalid ID format');
      return GuidV4.hydrate(value);
    },
  },
  contactEmail: {
    type: Object,
    required: true,
    serialize: (value: EmailString): string => value.toString(),
    hydrate: (value: unknown): EmailString => {
      if (!isString(value)) throw new Error('Invalid email format');
      return new EmailString(value);
    },
  },
  recoveryData: {
    type: Object,
    required: false,
    serialize: (value: Buffer | undefined): string | null =>
      value?.toString('base64') ?? null,
    hydrate: (value: unknown): Buffer | undefined => {
      if (value === null || value === undefined) return undefined;
      if (!isString(value)) throw new Error('Invalid recovery data format');
      return Buffer.from(value, 'base64');
    },
  },
  trustedPeers: {
    type: Array,
    required: true,
    serialize: (value: GuidV4[]): string[] => value.map((v) => v.serialize()),
    hydrate: (value: unknown): GuidV4[] => {
      if (!isStringArray(value))
        throw new Error('Invalid trusted peers format');
      return value.map((v) => GuidV4.hydrate(v));
    },
  },
  blockedPeers: {
    type: Array,
    required: true,
    serialize: (value: GuidV4[]): string[] => value.map((v) => v.serialize()),
    hydrate: (value: unknown): GuidV4[] => {
      if (!isStringArray(value))
        throw new Error('Invalid blocked peers format');
      return value.map((v) => GuidV4.hydrate(v));
    },
  },
  settings: {
    type: Object,
    required: true,
  },
  activityLog: {
    type: Array,
    required: true,
    serialize: (
      value: Array<{
        timestamp: Date;
        action: string;
        details: Record<string, unknown>;
      }>,
    ): SerializedValue[] =>
      value.map((entry) => ({
        timestamp: entry.timestamp.toISOString(),
        action: entry.action,
        details: Object.fromEntries(
          Object.entries(entry.details).map(([k, v]) => [
            k,
            typeof v === 'object' ? JSON.stringify(v) : String(v),
          ]),
        ),
      })),
    hydrate: (
      value: unknown,
    ): Array<{
      timestamp: Date;
      action: string;
      details: Record<string, unknown>;
    }> => {
      if (!Array.isArray(value) || !value.every(isActivityLogEntry)) {
        throw new Error('Invalid activity log format');
      }
      return value.map((entry) => ({
        timestamp: new Date(entry.timestamp),
        action: entry.action,
        details: entry.details,
      }));
    },
  },
};

export default {
  PublicMemberSchema,
  PrivateMemberSchema,
};
