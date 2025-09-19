import {
  GuidV4,
  IApiErrorResponse,
  IApiMessageResponse,
  StringLanguage,
} from '@brightchain/brightchain-lib';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ValidationChain } from 'express-validator';
import { Brand } from 'ts-brand';
import type { IEmailTokenDocument } from './documents/email-token';
import type { IMnemonicDocument } from './documents/mnemonic';
import type { IRoleDocument } from './documents/role';
import { IUsedDirectLoginTokenDocument } from './documents/used-direct-login-token';
import type { IUserDocument } from './documents/user';
import type { IUserRoleDocument } from './documents/user-role';
import { IApiExpressValidationErrorResponse } from './interfaces/api-express-validation-error-response';
import { IKeyPairBufferWithUnEncryptedPrivateKey } from './interfaces/keypair-buffer-with-un-encrypted-private-key';
import { ISchema } from './interfaces/schema';
import { ISigningKeyPrivateKeyInfo } from './interfaces/signing-key-private-key-info';
import { ISimpleKeyPairBuffer } from './interfaces/simple-keypair-buffer';
import { ISimplePublicKeyOnly } from './interfaces/simple-public-key-only';
import { ISimplePublicKeyOnlyBuffer } from './interfaces/simple-public-key-only-buffer';
import { IStatusCodeResponse } from './interfaces/status-code-response';

export type DefaultBackendIdType = GuidV4;

/**
 * Validated body for express-validator
 */
export type ValidatedBody<T extends string> = {
  [K in T]: unknown;
};

/**
 * Schema map interface
 */
type ModelDocMap = {
  EmailToken: IEmailTokenDocument;
  Mnemonic: IMnemonicDocument;
  Role: IRoleDocument;
  UsedDirectLoginToken: IUsedDirectLoginTokenDocument;
  User: IUserDocument;
  UserRole: IUserRoleDocument;
};

export type SchemaMap = {
  /**
   * For each model name, contains the corresponding schema and model
   */
  [K in keyof ModelDocMap]: ISchema<ModelDocMap[K]>;
};

export type ApiRequestHandler<T extends ApiResponse> = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<IStatusCodeResponse<T>>;

export type TypedHandlers = {
  [key: string]: ApiRequestHandler<ApiResponse>;
};

export interface IRouteDefinition<T extends TypedHandlers> {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  options: {
    handlerKey: keyof T;
    validation?: (validationLanguage: StringLanguage) => ValidationChain[];
    useAuthentication: boolean;
    useCryptoAuthentication: boolean;
  };
}

export type RouteHandlers = Record<string, ApiRequestHandler<ApiResponse>>;

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

export interface RouteConfig<H extends object> {
  method: HttpMethod;
  path: string;
  handlerKey: keyof H;
  handlerArgs?: Array<unknown>;
  useAuthentication: boolean;
  useCryptoAuthentication: boolean;
  middleware?: RequestHandler[];
  validation?: FlexibleValidationChain;
  rawJsonHandler?: boolean;
  authFailureStatusCode?: number;
}

export function routeConfig<T extends object>(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string,
  options: {
    handlerKey: keyof T;
    validation?: (validationLanguage: StringLanguage) => ValidationChain[];
    useAuthentication: boolean;
    useCryptoAuthentication: boolean;
  },
): RouteConfig<T> {
  return {
    method,
    path,
    handlerKey: options.handlerKey,
    validation: options.validation,
    useAuthentication: options.useAuthentication,
    useCryptoAuthentication: options.useCryptoAuthentication,
  };
}

export type THandlerArgs<T extends Array<unknown>> = T;

export type FlexibleValidationChain =
  | ValidationChain[]
  | ((lang: StringLanguage) => ValidationChain[]);

export type JsonPrimitive = string | number | boolean | null | undefined;

export type JsonResponse =
  | JsonPrimitive
  | { [key: string]: JsonResponse }
  | JsonResponse[];

export type ApiErrorResponse =
  | IApiErrorResponse
  | IApiExpressValidationErrorResponse;

export type ApiResponse = IApiMessageResponse | ApiErrorResponse | JsonResponse;

export type SendFunction<T extends ApiResponse> = (
  statusCode: number,
  data: T,
  res: Response<T>,
) => void;

export type KeyPairBufferWithUnEncryptedPrivateKey = Brand<
  IKeyPairBufferWithUnEncryptedPrivateKey,
  'KeyPairBufferWithUnEncryptedPrivateKey'
>;
export type SigningKeyPrivateKeyInfo = Brand<
  ISigningKeyPrivateKeyInfo,
  'SigningKeyPrivateKeyInfo'
>;
export type SimpleKeyPair = Brand<SimplePublicKeyOnly, 'SimpleKeyPair'>;
export type SimplePublicKeyOnly = Brand<
  ISimplePublicKeyOnly,
  'SimplePublicKeyOnly'
>;
export type SimpleKeyPairBuffer = Brand<
  ISimpleKeyPairBuffer,
  'SimpleKeyPairBuffer'
>;
export type SimplePublicKeyOnlyBuffer = Brand<
  ISimplePublicKeyOnlyBuffer,
  'SimplePublicKeyOnlyBuffer'
>;
export type HexString = Brand<string, 'HexString'>;
export type SignatureString = Brand<HexString, 'SignatureString'>;
export type SignatureBuffer = Buffer & Brand<Buffer, 'SignatureBuffer'>;
export type ChecksumBuffer = Buffer &
  Brand<Buffer, 'Sha3Checksum', 'ChecksumBuffer'>;
export type ChecksumString = Brand<HexString, 'Sha3Checksum', 'ChecksumString'>;

/**
 * Extended Buffer type for data
 */
export type DataBuffer = Buffer & {
  toBuffer(): Buffer;
  toHex(): string;
};
