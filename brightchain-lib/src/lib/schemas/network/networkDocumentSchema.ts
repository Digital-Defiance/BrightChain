import {
  ChecksumUint8Array,
  Guid,
  Member,
  SignatureUint8Array,
} from '@digitaldefiance/ecies-lib';
import { NetworkDocument } from '../../documents/network/networkDocument';
import StringNames from '../../enumerations/stringNames';
import { FailedToHydrateError } from '../../errors/failedToHydrate';
import { FailedToSerializeError } from '../../errors/failedToSerialize';
import { InvalidIDFormatError } from '../../errors/invalidIDFormat';
import { translate } from '../../i18n';
import { SchemaDefinition, SerializedValue } from '../../sharedTypes';

const isString = (value: unknown): value is string => typeof value === 'string';
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

/**
 * Schema for network documents
 */
export const NetworkDocumentSchema: SchemaDefinition<NetworkDocument> = {
  id: {
    type: Object,
    required: true,
    serialize: (value: Uint8Array): string =>
      Buffer.from(value).toString('hex'),
    hydrate: (value: string): Uint8Array => {
      if (!isString(value)) throw new InvalidIDFormatError();
      return new Uint8Array(Buffer.from(value, 'hex'));
    },
  },
  type: {
    type: String,
    required: true,
  },
  version: {
    type: Number,
    required: true,
  },
  created: {
    type: Date,
    required: true,
  },
  updated: {
    type: Date,
    required: true,
  },
  creator: {
    type: Object,
    required: true,
    serialize: (value: Member): SerializedValue => {
      try {
        const json = value.toJson();
        return JSON.parse(json);
      } catch {
        throw new FailedToSerializeError(
          translate(StringNames.Error_InvalidCreator),
        );
      }
    },
    hydrate: (value: string): Member => {
      if (!isString(value) && typeof value !== 'object')
        throw new FailedToHydrateError(
          translate(StringNames.Error_InvalidCreator),
        );
      return Member.fromJson(
        typeof value === 'string' ? value : JSON.stringify(value),
      );
    },
  },
  signature: {
    type: Object,
    required: true,
    serialize: (value: SignatureUint8Array): string =>
      Buffer.from(value).toString('base64'),
    hydrate: (value: string): SignatureUint8Array => {
      if (!isString(value))
        throw new FailedToHydrateError(
          translate(StringNames.Error_InvalidSignature),
        );
      return Buffer.from(value, 'base64') as unknown as SignatureUint8Array;
    },
  },
  checksum: {
    type: Object,
    required: true,
    serialize: (value: ChecksumUint8Array): string =>
      Buffer.from(value).toString('base64'),
    hydrate: (value: string): ChecksumUint8Array => {
      if (!isString(value))
        throw new FailedToHydrateError(
          translate(StringNames.Error_InvalidChecksum),
        );
      return Buffer.from(value, 'base64') as unknown as ChecksumUint8Array;
    },
  },
  ttl: {
    type: Number,
    required: false,
  },
  replicationFactor: {
    type: Number,
    required: false,
  },
  priority: {
    type: String,
    required: false,
  },
  tags: {
    type: Array,
    required: false,
  },
  references: {
    type: Array,
    required: false,
    serialize: (value: Guid[] | undefined): string[] | null =>
      value?.map((v) => v.serialize()) ?? null,
    hydrate: (value: string): Guid[] | undefined => {
      if (value === null || value === undefined) return undefined;
      if (!isStringArray(value))
        throw new FailedToHydrateError(
          translate(StringNames.Error_InvalidReferences),
        );
      return value.map((v) => Guid.hydrate(v) as Guid);
    },
  },
};

/**
 * Export the schema
 */
export default NetworkDocumentSchema;
