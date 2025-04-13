/* eslint-disable @typescript-eslint/no-explicit-any */
import { HexString as EciesHexString } from '@digitaldefiance/ecies-lib';
import {
  ChecksumBuffer as NodeEciesChecksumBuffer,
  ChecksumString as NodeEciesChecksumString,
  DataBuffer as NodeEciesDataBuffer,
  KeyPairBufferWithUnEncryptedPrivateKey as NodeEciesKeyPairBufferWithUnEncryptedPrivateKey,
  SignatureBuffer as NodeEciesSignatureBuffer,
  SignatureString as NodeEciesSignatureString,
  SigningKeyPrivateKeyInfo as NodeEciesSigningKeyPrivateKeyInfo,
  SimpleKeyPair as NodeEciesSimpleKeyPair,
  SimpleKeyPairBuffer as NodeEciesSimpleKeyPairBuffer,
  SimplePublicKeyOnly as NodeEciesSimplePublicKeyOnly,
  SimplePublicKeyOnlyBuffer as NodeEciesSimplePublicKeyOnlyBuffer,
} from '@digitaldefiance/node-ecies-lib';
import {
  ISchema,
  ApiErrorResponse as NodeExpressSuiteApiErrorResponse,
  ApiRequestHandler as NodeExpressSuiteApiRequestHandler,
  ApiResponse as NodeExpressSuiteApiResponse,
  FlexibleValidationChain as NodeExpressSuiteFlexibleValidationChain,
  HttpMethod as NodeExpressSuiteHttpMethod,
  JsonPrimitive as NodeExpressSuiteJsonPrimitive,
  JsonResponse as NodeExpressSuiteJsonResponse,
  RouteConfig as NodeExpressSuiteRouteConfig,
  routeConfig as nodeExpressSuiteRouteConfig,
  SendFunction as NodeExpressSuiteSendFunction,
  TypedHandlers as NodeExpressSuiteTypedHandlers,
  ValidatedBody as NodeExpressSuiteValidatedBody,
} from '@digitaldefiance/node-express-suite';
import type { IEmailTokenDocument } from './documents/email-token';
import type { IMnemonicDocument } from './documents/mnemonic';
import type { IRoleDocument } from './documents/role';
import { IUsedDirectLoginTokenDocument } from './documents/used-direct-login-token';
import type { IUserDocument } from './documents/user';
import type { IUserRoleDocument } from './documents/user-role';
// import { ObjectIdString } from '@digitaldefiance/ecies-lib';
export type ObjectIdString = any;

// Database-agnostic type aliases (mongo removed)
/* eslint-disable @typescript-eslint/no-explicit-any */
export type ClientSession = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

// Use ObjectIdString as the default backend ID type
// This bridges BSON ObjectIds with the branded type system
export type DefaultBackendIdType = ObjectIdString;

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

export type HexString = EciesHexString;
export type SignatureBuffer = NodeEciesSignatureBuffer;
export type SignatureString = NodeEciesSignatureString;
export type ChecksumBuffer = NodeEciesChecksumBuffer;
export type ChecksumString = NodeEciesChecksumString;
export type DataBuffer = NodeEciesDataBuffer;
export type KeyPairBufferWithUnEncryptedPrivateKey =
  NodeEciesKeyPairBufferWithUnEncryptedPrivateKey;
export type SigningKeyPrivateKeyInfo = NodeEciesSigningKeyPrivateKeyInfo;
export type SimpleKeyPair = NodeEciesSimpleKeyPair;
export type SimpleKeyPairBuffer = NodeEciesSimpleKeyPairBuffer;
export type SimplePublicKeyOnly = NodeEciesSimplePublicKeyOnly;
export type SimplePublicKeyOnlyBuffer = NodeEciesSimplePublicKeyOnlyBuffer;

export type ApiErrorResponse = NodeExpressSuiteApiErrorResponse;
/* eslint-disable @typescript-eslint/no-explicit-any */
export type ApiRequestHandler<T extends NodeExpressSuiteApiResponse = any> =
  NodeExpressSuiteApiRequestHandler<T>;
export type ApiResponse = NodeExpressSuiteApiResponse;
export type FlexibleValidationChain<TLanguage extends string = string> =
  NodeExpressSuiteFlexibleValidationChain<TLanguage>;
export type HttpMethod = NodeExpressSuiteHttpMethod;
export type JsonPrimitive = NodeExpressSuiteJsonPrimitive;
export type JsonResponse = NodeExpressSuiteJsonResponse;
export type RouteConfig<
  T extends object,
  TLanguage extends string = string,
> = NodeExpressSuiteRouteConfig<T, TLanguage>;
export const routeConfig = nodeExpressSuiteRouteConfig;
export type SendFunction<T extends NodeExpressSuiteApiResponse> =
  NodeExpressSuiteSendFunction<T>;
export type TypedHandlers = NodeExpressSuiteTypedHandlers;
export type ValidatedBody<T extends string> = NodeExpressSuiteValidatedBody<T>;
