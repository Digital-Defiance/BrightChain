import { BrightChainMember } from '../../brightChainMember';
import { NetworkDocument } from '../../documents/network/networkDocument';
import StringNames from '../../enumerations/stringNames';
import { FailedToHydrateError } from '../../errors/failedToHydrate';
import { FailedToSerializeError } from '../../errors/failedToSerialize';
import { InvalidIDFormatError } from '../../errors/invalidIDFormat';
import { GuidV4 } from '../../guid';
import { translate } from '../../i18n';
import { ECIESService } from '../../services/ecies.service'; // Added import
import { VotingService } from '../../services/voting.service'; // Added import
import { SchemaDefinition, SerializedValue } from '../../sharedTypes';
import { ChecksumBuffer, SignatureBuffer } from '../../types';

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
    serialize: (value: GuidV4): string => value.serialize(),
    hydrate: (value: unknown): GuidV4 => {
      if (!isString(value)) throw new InvalidIDFormatError();
      return GuidV4.hydrate(value);
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
    serialize: (value: BrightChainMember): SerializedValue => {
      try {
        const json = value.toJson();
        return JSON.parse(json);
      } catch (error) {
        throw new FailedToSerializeError(
          translate(StringNames.Error_InvalidCreator),
        );
      }
    },
    hydrate: (value: unknown): BrightChainMember => {
      if (!isString(value) && typeof value !== 'object')
        throw new FailedToHydrateError(
          translate(StringNames.Error_InvalidCreator),
        );
      // Instantiate required services
      const eciesService = new ECIESService();
      const votingService = new VotingService(eciesService); // Pass eciesService
      return BrightChainMember.fromJson(
        typeof value === 'string' ? value : JSON.stringify(value),
        eciesService,
        votingService,
      );
    },
  },
  signature: {
    type: Object,
    required: true,
    serialize: (value: SignatureBuffer): string => value.toString('base64'),
    hydrate: (value: unknown): SignatureBuffer => {
      if (!isString(value))
        throw new FailedToHydrateError(
          translate(StringNames.Error_InvalidSignature),
        );
      return Buffer.from(value, 'base64') as SignatureBuffer;
    },
  },
  checksum: {
    type: Object,
    required: true,
    serialize: (value: ChecksumBuffer): string => value.toString('base64'),
    hydrate: (value: unknown): ChecksumBuffer => {
      if (!isString(value))
        throw new FailedToHydrateError(
          translate(StringNames.Error_InvalidChecksum),
        );
      return Buffer.from(value, 'base64') as ChecksumBuffer;
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
    serialize: (value: GuidV4[] | undefined): string[] | null =>
      value?.map((v) => v.serialize()) ?? null,
    hydrate: (value: unknown): GuidV4[] | undefined => {
      if (value === null || value === undefined) return undefined;
      if (!isStringArray(value))
        throw new FailedToHydrateError(
          translate(StringNames.Error_InvalidReferences),
        );
      return value.map((v) => GuidV4.hydrate(v));
    },
  },
};

/**
 * Export the schema
 */
export default NetworkDocumentSchema;
