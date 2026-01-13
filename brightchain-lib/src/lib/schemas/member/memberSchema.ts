import {
  base64ToUint8Array,
  EmailString,
  uint8ArrayToBase64,
  uint8ArrayToHex,
  hexToUint8Array,
} from '@digitaldefiance/ecies-lib';
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
    serialize: (value: Uint8Array): string =>
      uint8ArrayToHex(value),
    hydrate: (value: string): Uint8Array => {
      if (!isString(value)) throw new Error('Invalid ID format');
      return hexToUint8Array(value);
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
    serialize: (value: Uint8Array): string => uint8ArrayToBase64(value),
    hydrate: (value: string): Uint8Array => {
      if (!isString(value)) throw new Error('Invalid public key format');
      return base64ToUint8Array(value);
    },
  },
  votingPublicKey: {
    type: Object,
    required: true,
    serialize: (value: Uint8Array): string => uint8ArrayToBase64(value),
    hydrate: (value: string): Uint8Array => {
      if (!isString(value)) throw new Error('Invalid voting public key format');
      return base64ToUint8Array(value);
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
    serialize: (value: Uint8Array): string =>
      uint8ArrayToHex(value),
    hydrate: (value: string): Uint8Array => {
      if (!isString(value)) throw new Error('Invalid ID format');
      return hexToUint8Array(value);
    },
  },
  contactEmail: {
    type: Object,
    required: true,
    serialize: (value: EmailString): string => value.toString(),
    hydrate: (value: string): EmailString => {
      if (!isString(value)) throw new Error('Invalid email format');
      return new EmailString(value);
    },
  },
  recoveryData: {
    type: Object,
    required: false,
    serialize: (value: Uint8Array | undefined): string | null =>
      value ? uint8ArrayToBase64(value) : null,
    hydrate: (value: string): Uint8Array | undefined => {
      if (value === null || value === undefined) return undefined;
      if (!isString(value)) throw new Error('Invalid recovery data format');
      return base64ToUint8Array(value);
    },
  },
  trustedPeers: {
    type: Array,
    required: true,
    serialize: (value: Uint8Array[]): string[] =>
      value.map((v) => uint8ArrayToHex(v)),
    hydrate: (value: string): Uint8Array[] => {
      if (!isStringArray(value))
        throw new Error('Invalid trusted peers format');
      return value.map((v) => hexToUint8Array(v));
    },
  },
  blockedPeers: {
    type: Array,
    required: true,
    serialize: (value: Uint8Array[]): string[] =>
      value.map((v) => uint8ArrayToHex(v)),
    hydrate: (value: string): Uint8Array[] => {
      if (!isStringArray(value))
        throw new Error('Invalid blocked peers format');
      return value.map((v) => hexToUint8Array(v));
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
