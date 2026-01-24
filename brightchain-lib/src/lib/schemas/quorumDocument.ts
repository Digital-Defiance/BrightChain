import {
  hexToUint8Array,
  Member,
  MemberType,
  PlatformID,
  SignatureUint8Array,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { generateRandomKeysSync } from 'paillier-bigint';
import { uint8ArrayToBase64 } from '../bufferUtils';
import { IQuorumDocument } from '../documents/quorumDocument';
import { NotImplementedError } from '../errors/notImplemented';
import { getBrightChainIdProvider } from '../init';
import { QuorumDataRecord } from '../quorumDataRecord';
import { ServiceProvider } from '../services/service.provider';
import { SchemaDefinition, SerializedValue } from '../sharedTypes';
import { Checksum } from '../types';

export class QuorumDocumentSchema<TID extends PlatformID = Uint8Array> {
  public isString(value: unknown): boolean {
    return typeof value === 'string';
  }
  public isShortHexGuidArray(value: unknown): boolean {
    return (
      Array.isArray(value) &&
      value.every((v) => this.isString(v) && /^[0-9a-f]{32}$/i.test(v))
    );
  }

  // Function to fetch member by ID using the member service
  public fetchMember(memberId: TID): Member<TID> {
    // For now, create a placeholder member that will be hydrated later
    // The actual member data will be loaded when needed through the load() method
    const { publicKey } = generateRandomKeysSync(2048);

    // Use fromJson to create member synchronously
    const storage = {
      id: memberId,
      type: MemberType.User,
      name: 'Placeholder',
      email: 'placeholder@example.com',
      publicKey: uint8ArrayToBase64(new Uint8Array(0)),
      votingPublicKey: publicKey.n.toString(16),
      creatorId: memberId,
      dateCreated: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
    };

    return Member.fromJson<TID>(
      JSON.stringify(storage),
      ServiceProvider.getInstance<TID>().eciesService,
    );
  }

  public schema: SchemaDefinition<IQuorumDocument<TID>> = {
    checksum: {
      type: Object,
      required: true,
      serialize: (value: Checksum): string => value.toHex(),
      hydrate: (value: string): Checksum => {
        if (!this.isString(value)) throw new Error('Invalid checksum format');
        return Checksum.fromHex(value as string);
      },
    },
    creatorId: {
      type: Object,
      required: true,
      serialize: (value: Checksum): string => value.toHex(),
      hydrate: (value: string): Checksum => {
        if (!this.isString(value)) throw new Error('Invalid creator ID format');
        return Checksum.fromHex(value as string);
      },
    },
    creator: {
      type: Object,
      required: false,
      serialize: (): null => null,
      hydrate: (): Member<TID> => {
        throw new NotImplementedError();
      },
    },
    signature: {
      type: Object,
      required: true,
      serialize: (value: SignatureUint8Array): string => uint8ArrayToHex(value),
      hydrate: (value: string): SignatureUint8Array => {
        if (!this.isString(value)) throw new Error('Invalid signature format');
        return hexToUint8Array(value as string) as SignatureUint8Array;
      },
    },
    memberIDs: {
      type: Array,
      required: true,
      serialize: (value: TID[]): string[] =>
        value.map((id) =>
          uint8ArrayToHex(getBrightChainIdProvider<TID>().toBytes(id)),
        ),
      hydrate: (value: string): TID[] => {
        if (!Array.isArray(value)) throw new Error('Invalid member IDs format');
        const provider = getBrightChainIdProvider<TID>();
        return value.map((id) => provider.fromBytes(hexToUint8Array(id)));
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
        value: QuorumDataRecord<TID> | undefined,
      ): SerializedValue | null => {
        if (!value) return null;
        const json = value.toJson();
        return JSON.parse(json);
      },
      hydrate: (value: string): QuorumDataRecord<TID> | undefined => {
        if (value === null || value === undefined) return undefined;
        if (!this.isString(value) && typeof value !== 'object')
          throw new Error('Invalid encrypted data format');
        return QuorumDataRecord.fromJson<TID>(
          typeof value === 'string' ? value : JSON.stringify(value),
          this.fetchMember,
        );
      },
    },
  };
}
