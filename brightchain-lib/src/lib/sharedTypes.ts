import { Request, RequestHandler, Response } from 'express';
import { ValidationChain } from 'express-validator';
import { Document } from './documents/document';
import MemberType from './enumerations/memberType';
import { StringLanguages } from './enumerations/stringLanguages';
import { StringNames } from './enumerations/stringNames';
import { IApiErrorResponse } from './interfaces/responses/apiError';
import { IApiExpressValidationErrorResponse } from './interfaces/responses/apiExpressValidationError';
import { IApiMessageResponse } from './interfaces/responses/apiMessage';
import { IStatusCodeResponse } from './interfaces/responses/statusCode';
import { ChecksumString } from './types';

export type DefaultIdType = ChecksumString;

export type LanguageContext = 'admin' | 'user';

/**
 * Validated body for express-validator
 */
export type ValidatedBody<T extends string> = {
  [K in T]: unknown;
};

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

export interface TypedHandlers<T extends ApiResponse> {
  [key: string]: ApiRequestHandler<T>;
}

export type RouteHandlers = Record<string, ApiRequestHandler<ApiResponse>>;

export interface RouteConfig<
  T extends ApiResponse,
  H extends TypedHandlers<T>,
> {
  method: HttpMethod;
  path: string;
  handlerKey: keyof H;
  handlerArgs?: Array<unknown>;
  useAuthentication: boolean;
  middleware?: RequestHandler[];
  validation?: FlexibleValidationChain;
  rawJsonHandler?: boolean;
  authFailureStatusCode?: number;
}

export const routeConfig = <T extends ApiResponse, H extends TypedHandlers<T>>(
  method: HttpMethod,
  path: string,
  config: Omit<RouteConfig<T, H>, 'method' | 'path'>,
): RouteConfig<T, H> => ({
  ...config,
  method,
  path,
});

export type FlexibleValidationChain =
  | ValidationChain[]
  | ((lang: StringLanguages) => ValidationChain[]);

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

/**
 * Response type for API requests
 */
export type ApiRequestHandler<T extends ApiResponse> = (
  req: Request,
  ...args: Array<unknown>
) => Promise<IStatusCodeResponse<T>>;

export type StringsCollection = { [key in StringNames]: string };
export type MasterStringsCollection = {
  [key in StringLanguages]: StringsCollection;
};

export type LanguageFlagCollection = { [key in StringLanguages]: string };

export type LanguageCodeCollection = { [key in StringLanguages]: string };

export const DefaultLanguage: StringLanguages = StringLanguages.EnglishUS;

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

export type CurrencyPosition = 'prefix' | 'postfix' | 'infix';
