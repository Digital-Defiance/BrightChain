import { ChecksumString, MemberType } from '@digitaldefiance/ecies-lib';
import { Request } from 'express';

export type DefaultIdType = ChecksumString;

export type BlocksApiRequest = Request<
  {
    blockId?: string;
  },
  Record<string, unknown>,
  {
    cblData?: string;
    shouldEncrypt?: boolean;
    shouldPersist?: boolean;
    encryptorId?: string;
  },
  {
    decryptorId?: string;
  }
>;

export type MemberApiRequest = Request<
  {
    memberId?: string;
  },
  Record<string, unknown>,
  {
    name: string;
    email: string;
    memberType: MemberType;
    passphrase?: string;
  },
  {
    passphrase?: string;
  }
>;

// Re-export schema types from separate file to avoid circular dependencies
export type {
  DocumentType,
  InstanceMethods,
  SchemaDefinition,
  SchemaType,
  SchemaTypeOptions,
  SerializedValue,
  StaticMethods,
  ValidatorFunction,
} from './types/schema';

export const DefaultCurrencyCode = 'USD';
