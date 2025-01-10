import { Request, RequestHandler, Response } from 'express';
import { ValidationChain } from 'express-validator';
import { StringLanguages } from './enumerations/stringLanguages';
import { StringNames } from './enumerations/stringNames';
import { IApiErrorResponse } from './interfaces/responses/apiError';
import { IApiExpressValidationErrorResponse } from './interfaces/responses/apiExpressValidationError';
import { IApiMessageResponse } from './interfaces/responses/apiMessage';
import { IStatusCodeResponse } from './interfaces/responses/statusCode';
import { ChecksumString } from './types';

export type DefaultIdType = ChecksumString;

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
