import { ChecksumString } from './types';
import { Request, Response, NextFunction } from 'express';
import { Document } from './documents/document';
import MemberType from './enumerations/memberType';

export type DefaultIdType = ChecksumString;

// Re-export from i18n-lib for backward compatibility
export type { LanguageContextSpace as LanguageContext } from '@digitaldefiance/i18n-lib';

// API types
export type JsonResponse = Record<string, unknown>;
export type ApiResponse = JsonResponse;

export type ApiRequestHandler<T extends ApiResponse = ApiResponse> = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<T> | T;

export interface TypedHandlers<T extends ApiResponse> {
  [key: string]: ApiRequestHandler<T>;
}

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

export type ValidatorFunction = (value: unknown) => boolean;

export type SchemaType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ObjectConstructor
  | ArrayConstructor
  | DateConstructor
  | ValidatorFunction;

export type SerializedValue =
  | string
  | number
  | boolean
  | null
  | SerializedValue[]
  | { [key: string]: SerializedValue };

export type SchemaTypeOptions<T> = {
  type: SchemaType;
  required?: boolean;
  default?: T;
  serialize?: (value: T) => SerializedValue;
  hydrate?: (value: unknown) => T;
};

export type SchemaDefinition<T> = {
  [K in keyof T]:
    | SchemaTypeOptions<T[K]>
    | SchemaTypeOptions<T[K]>[]
    | SchemaDefinition<T[K]>;
};

export type InstanceMethods<T> = {
  [key: string]: (this: Document<T>, ...args: unknown[]) => unknown;
};

export type StaticMethods<T> = {
  [key: string]: (
    this: typeof Document,
    ...args: unknown[]
  ) => Document<T> | Promise<Document<T>> | unknown;
};

export const DefaultCurrencyCode = 'USD';
