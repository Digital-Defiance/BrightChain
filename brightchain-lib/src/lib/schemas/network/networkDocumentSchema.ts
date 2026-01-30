import {
  ChecksumUint8Array,
  GuidUint8Array,
  hexToUint8Array,
  Member,
  SignatureUint8Array,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { base64ToUint8Array, uint8ArrayToBase64 } from '../../bufferUtils';
import { NetworkDocument } from '../../documents/network/networkDocument';
import { BrightChainStrings, BrightChainStringKey } from '../../enumerations/brightChainStrings';
import { FailedToHydrateError } from '../../errors/failedToHydrate';
import { FailedToSerializeError } from '../../errors/failedToSerialize';
import { InvalidIDFormatError } from '../../errors/invalidIDFormat';
import { translate } from '../../i18n';
import { ServiceProvider } from '../../services/service.provider';
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
    serialize: (value: Uint8Array): string => uint8ArrayToHex(value),
    hydrate: (value: string): Uint8Array => {
      if (!isString(value)) throw new InvalidIDFormatError();
      return hexToUint8Array(value);
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
          translate(BrightChainStrings.Error_Creator_Invalid),
        );
      }
    },
    hydrate: (value: string): Member => {
      if (!isString(value) && typeof value !== 'object')
        throw new FailedToHydrateError(
          translate(BrightChainStrings.Error_Creator_Invalid),
        );
      return Member.fromJson(
        typeof value === 'string' ? value : JSON.stringify(value),
        ServiceProvider.getInstance().eciesService,
      );
    },
  },
  signature: {
    type: Object,
    required: true,
    serialize: (value: SignatureUint8Array): string =>
      uint8ArrayToBase64(value),
    hydrate: (value: string): SignatureUint8Array => {
      if (!isString(value))
        throw new FailedToHydrateError(
          translate(BrightChainStrings.Error_Signature_Invalid),
        );
      return base64ToUint8Array(value) as unknown as SignatureUint8Array;
    },
  },
  checksum: {
    type: Object,
    required: true,
    serialize: (value: ChecksumUint8Array): string => uint8ArrayToBase64(value),
    hydrate: (value: string): ChecksumUint8Array => {
      if (!isString(value))
        throw new FailedToHydrateError(
          translate(BrightChainStrings.Error_Checksum_Invalid),
        );
      return base64ToUint8Array(value) as unknown as ChecksumUint8Array;
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
    serialize: (value: GuidUint8Array[] | undefined): string[] | null =>
      value?.map((v) => v.asShortHexGuid) ?? null,
    hydrate: (value: string): GuidUint8Array[] | undefined => {
      if (value === null || value === undefined) return undefined;
      if (!isStringArray(value))
        throw new FailedToHydrateError(
          translate(BrightChainStrings.Error_References_Invalid),
        );
      return value.map((v) => GuidUint8Array.hydrate(v) as GuidUint8Array);
    },
  },
};

/**
 * Export the schema
 */
export default NetworkDocumentSchema;
