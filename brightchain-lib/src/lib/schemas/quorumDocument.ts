import { BrightChainMember } from '../brightChainMember';
import { IQuorumDocument } from '../documents/quorumDocument';
import { EmailString } from '../emailString';
import { MemberType } from '../enumerations/memberType';
import { NotImplementedError } from '../errors/notImplemented';
import { GuidV4 } from '../guid';
import { QuorumDataRecord } from '../quorumDataRecord';
import { ServiceProvider } from '../services/service.provider';
import { SchemaDefinition, SerializedValue } from '../sharedTypes';
import {
  ChecksumUint8Array,
  ShortHexGuid,
  SignatureUint8Array,
} from '../types';

const isString = (value: unknown): value is string => typeof value === 'string';
const isShortHexGuidArray = (value: unknown): value is ShortHexGuid[] =>
  Array.isArray(value) &&
  value.every((v) => isString(v) && /^[0-9a-f]{32}$/i.test(v));

// Function to fetch member by ID using the member service
const fetchMember = (memberId: ShortHexGuid): BrightChainMember => {
  // For now, create a placeholder member that will be hydrated later
  // The actual member data will be loaded when needed through the load() method
  const { publicKey } =
    ServiceProvider.getInstance().votingService.generateVotingKeyPair();
  return new BrightChainMember(
    MemberType.User, // memberType
    'Placeholder', // name
    new EmailString('placeholder@example.com'), // contactEmail
    Buffer.alloc(0), // publicKey
    publicKey, // votingPublicKey
    undefined, // privateKey
    undefined, // wallet
    new GuidV4(memberId), // id
  );
};

export const QuorumDocumentSchema: SchemaDefinition<IQuorumDocument> = {
  checksum: {
    type: Object,
    required: true,
    serialize: (value: ChecksumUint8Array): string => value.toString('hex'),
    hydrate: (value: unknown): ChecksumUint8Array => {
      if (!isString(value)) throw new Error('Invalid checksum format');
      return Buffer.from(value, 'hex') as ChecksumUint8Array;
    },
  },
  creatorId: {
    type: Object,
    required: true,
    serialize: (value: ChecksumUint8Array): string => value.toString('hex'),
    hydrate: (value: unknown): ChecksumUint8Array => {
      if (!isString(value)) throw new Error('Invalid creator ID format');
      return Buffer.from(value, 'hex') as ChecksumUint8Array;
    },
  },
  creator: {
    type: Object,
    required: false,
    serialize: (): null => null,
    hydrate: (): BrightChainMember => {
      throw new NotImplementedError();
    },
  },
  signature: {
    type: Object,
    required: true,
    serialize: (value: SignatureUint8Array): string => value.toString('hex'),
    hydrate: (value: unknown): SignatureUint8Array => {
      if (!isString(value)) throw new Error('Invalid signature format');
      return Buffer.from(value, 'hex') as SignatureUint8Array;
    },
  },
  memberIDs: {
    type: Array,
    required: true,
    serialize: (value: GuidV4[]): string[] =>
      value.map((id) => id.asShortHexGuid),
    hydrate: (value: unknown): GuidV4[] => {
      if (!isShortHexGuidArray(value))
        throw new Error('Invalid member IDs format');
      return value.map((id) => new GuidV4(id));
    },
  },
  sharesRequired: {
    type: Number,
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
  encryptedData: {
    type: Object,
    required: false,
    serialize: (
      value: QuorumDataRecord | undefined,
    ): SerializedValue | null => {
      if (!value) return null;
      const json = value.toJson();
      return JSON.parse(json);
    },
    hydrate: (value: unknown): QuorumDataRecord | undefined => {
      if (value === null || value === undefined) return undefined;
      if (!isString(value) && typeof value !== 'object')
        throw new Error('Invalid encrypted data format');
      return QuorumDataRecord.fromJson(
        typeof value === 'string' ? value : JSON.stringify(value),
        fetchMember,
      );
    },
  },
};
