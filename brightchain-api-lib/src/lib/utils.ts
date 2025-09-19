/// <reference path="./types.d.ts" />
import {
  getLengthEncodingTypeForLength,
  getLengthEncodingTypeFromValue,
  getLengthForLengthType,
  GuidV4,
  HandleableError,
  IApiErrorResponse,
  LengthEncodingType,
  StringName,
  TranslatableError,
  translate,
} from '@brightchain/brightchain-lib';
import { NextFunction, Request, Response } from 'express';
import { Result, ValidationError } from 'express-validator';
import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { z, ZodType } from 'zod';
import { BackupCode } from './backupCode';
import { ExpressValidationError } from './errors/express-validation';
import { MissingValidatedDataError } from './errors/missing-validated-data';
import { MongooseValidationError } from './errors/mongoose-validation';
import { IApiExpressValidationErrorResponse } from './interfaces/api-express-validation-error-response';
import { IApiMongoValidationErrorResponse } from './interfaces/api-mongo-validation-error-response';
import { IMongoErrors } from './interfaces/mongo-errors';
import { ApiResponse, SendFunction } from './shared-types';

export type DEBUG_TYPE = 'error' | 'warn' | 'log';

/**
 * Optionally prints certain debug messages
 * @param debug Whether to print debug messages
 * @param type What type of message to print
 * @param args Any args to print
 */
export function debugLog(
  debug: boolean,
  type: DEBUG_TYPE = 'log',
  ...args: any[]
): void {
  if (!debug) return;

  switch (type) {
    case 'error':
      console.error(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'log':
      console.log(...args);
      break;
  }
}

// Helper: get value at a dotted path from an object
export function getValueAtPath(obj: unknown, path: (string | number)[]) {
  return path.reduce<any>((acc, key) => {
    if (acc == null) return undefined;
    try {
      return (acc as any)[key as any];
    } catch {
      return undefined;
    }
  }, obj);
}

// Helper: map Zod issues to express-validator ValidationError[]
export function mapZodIssuesToValidationErrors(
  issues: z.ZodError<unknown>['issues'],
  source: unknown,
  location: 'body' | 'cookies' | 'headers' | 'params' | 'query' = 'body',
): ValidationError[] {
  return issues.map((issue) => ({
    type: 'field',
    location,
    path: issue.path
      .filter((p) => typeof p === 'string' || typeof p === 'number')
      .join('.'),
    value: getValueAtPath(source, issue.path as (string | number)[]),
    msg: issue.message,
  }));
}

/**
 * Verifies the required fields were validated by express-validator and sends an error response if not or calls the callback if they are
 * @param req The request object
 * @param fields The fields to check
 * @param callback The callback to call if the fields are valid
 * @returns The result of the callback
 */
export async function requireValidatedFieldsAsync<
  T extends ZodType<any, any, any>,
  TResult = void,
>(
  req: Request,
  schema: T,
  callback: (data: z.output<T>) => Promise<TResult>,
): Promise<TResult> {
  if (req.validatedBody === undefined) {
    throw new MissingValidatedDataError();
  }

  try {
    const validatedData = schema.parse(req.validatedBody) as z.output<T>;
    return await callback(validatedData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ExpressValidationError(
        mapZodIssuesToValidationErrors(
          error.issues,
          req.validatedBody ?? {},
          'body',
        ),
      );
    }
    throw error;
  }
}

/**
 * Verifies at least one of the required fields were validated by express-validator and sends an error response if not or calls the callback if they are
 * @param req The request object
 * @param fields The fields to check
 * @param callback The callback to call if the fields are valid
 * @returns The result of the callback
 */
export async function requireOneOfValidatedFieldsAsync<T = void>(
  req: Request,
  fields: string[],
  callback: () => Promise<T>,
): Promise<T> {
  if (req.validatedBody === undefined) {
    throw new MissingValidatedDataError();
  }
  const validatedBody = req.validatedBody;
  if (!fields.some((field) => validatedBody?.[field] !== undefined)) {
    throw new MissingValidatedDataError(fields);
  }
  return await callback();
}

/**
 * Verifies the required fields were validated by express-validator and throws an error if not or calls the callback if they are
 * @param req The request object
 * @param fields The fields to check
 * @param callback The callback to call if the fields are valid
 * @returns The result of the callback
 */
export function requireValidatedFieldsOrThrow<T = void>(
  req: Request,
  fields: string[],
  callback: () => T,
): T {
  if (req.validatedBody === undefined) {
    throw new MissingValidatedDataError();
  }
  const validatedBody = req.validatedBody;
  fields.forEach((field) => {
    if (validatedBody[field] === undefined) {
      throw new MissingValidatedDataError(field);
    }
  });
  return callback();
}

/**
 * Checks if the given id is a valid string id
 * @param id The id to check
 * @returns True if the id is a valid string id
 */
export function isValidStringId(id: unknown): boolean {
  return typeof id === 'string' && GuidV4.isValid(id);
}

/**
 * The default number of retry attempts for transactions
 */
export const DEFAULT_RETRY_ATTEMPTS = 3;
/**
 * The base delay for retry attempts in transactions
 */
export const BASE_DELAY = 100; // Start with 100ms delay
/**
 * The default transaction timeout in milliseconds
 */
export const DEFAULT_TRANSACTION_TIMEOUT = 60000; // 60 seconds

/**
 * The default transaction lock request timeout in milliseconds
 */
export const DEFAULT_TRANSACTION_LOCK_REQUEST_TIMEOUT = 30000; // 30 seconds

export interface TransactionOptions {
  timeoutMs?: number;
  retryAttempts?: number;
}

/**
 * Wraps a callback in a transaction if necessary
 * @param connection The mongoose connection
 * @param useTransaction Whether to use a transaction
 * @param session The session to use
 * @param callback The callback to wrap
 * @param options Transaction options including timeout and retry attempts
 * @param args The arguments to pass to the callback
 * @returns The result of the callback
 */
export async function withTransaction<T>(
  connection: Connection,
  useTransaction: boolean,
  session: ClientSession | undefined,
  callback: TransactionCallback<T>,
  options: TransactionOptions = {},
  ...args: any
): Promise<T> {
  const {
    timeoutMs = DEFAULT_TRANSACTION_TIMEOUT,
    retryAttempts = DEFAULT_RETRY_ATTEMPTS,
  } = options;
  if (!useTransaction) {
    return await callback(session, undefined, ...args);
  }
  const needSession = useTransaction && session === undefined;
  const client = connection.getClient();
  if (!client) {
    // If no client is available, fall back to non-transactional execution
    console.warn(
      translate(
        StringName.Admin_NoMongoDbClientFoundFallingBack,
        undefined,
        undefined,
        'admin',
      ),
    );
    return await callback(session, undefined, ...args);
  }

  let attempt = 0;
  while (attempt < retryAttempts) {
    const s = needSession ? await client.startSession() : session;
    try {
      if (needSession && s !== undefined) {
        await s.startTransaction({
          maxCommitTimeMS: timeoutMs,
        });
      }

      // Race the callback against the timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              translate(
                StringName.Admin_TransactionTimeoutTemplate,
                { timeMs: timeoutMs },
                undefined,
                'admin',
              ),
            ),
          );
        }, timeoutMs);
      });

      const result = await Promise.race([callback(s, ...args), timeoutPromise]);

      if (needSession && s !== undefined) await s.commitTransaction();
      return result;
    } catch (error: any) {
      if (needSession && s !== undefined && s.inTransaction())
        await s.abortTransaction();

      // Check if this is a transient transaction error that can be retried
      const isTransientError =
        error?.errorLabelSet?.has('TransientTransactionError') ||
        error?.errorLabelSet?.has('UnknownTransactionCommitResult') ||
        error?.code === 251 || // NoSuchTransaction
        error?.code === 112 || // WriteConflict
        error?.code === 11000 || // DuplicateKey
        error?.code === 16500 || // TransactionAborted
        error?.code === 244 || // TransactionTooOld
        error?.code === 246 || // ExceededTimeLimit
        error?.message?.includes('Transaction') ||
        error?.message?.includes('aborted') ||
        error?.message?.includes('WriteConflict') ||
        error?.message?.includes('NoSuchTransaction') ||
        error?.message?.includes('TransactionTooOld') ||
        error?.message?.includes('ExceededTimeLimit');

      if (isTransientError && attempt < retryAttempts - 1) {
        attempt++;
        const jitter = Math.random() * 0.3; // Add 30% jitter to reduce collision probability
        const delay = Math.floor(
          BASE_DELAY * Math.pow(2, attempt - 1) * (1 + jitter),
        ); // Exponential backoff with jitter
        console.warn(
          translate(
            StringName.Admin_TransactionFailedTransientTemplate,
            {
              delayMs: delay,
              attempt,
              attempts: retryAttempts,
            },
            undefined,
            'admin',
          ),
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    } finally {
      if (needSession && s !== undefined) await s.endSession();
    }
  }

  throw new Error('Transaction failed after maximum retry attempts');
}

/**
 * Sends an API response with the given status and response object.
 * @param status
 * @param response
 * @param res
 */
export function sendApiMessageResponse<T extends ApiResponse>(
  status: number,
  response: T,
  res: Response<T>,
): void {
  res.status(status).json(response);
}

/**
 * Sends an API response with the given status, message, and error.
 * @param status
 * @param message
 * @param error
 * @param res
 */
export function sendApiErrorResponse(
  status: number,
  message: string,
  error: unknown,
  res: Response,
): void {
  sendApiMessageResponse<IApiErrorResponse>(status, { message, error }, res);
}

/**
 * Sends an API response with the given status and validation errors.
 * @param status
 * @param errors
 * @param res
 */
export function sendApiExpressValidationErrorResponse(
  status: number,
  errors: ValidationError[],
  res: Response,
): void {
  sendApiMessageResponse<IApiExpressValidationErrorResponse>(
    status,
    { message: translate(StringName.ValidationError), errors },
    res,
  );
}

/**
 * Sends an API response with the given status, message, and MongoDB validation errors.
 * @param status
 * @param message
 * @param errors
 * @param res
 */
export function sendApiMongoValidationErrorResponse(
  status: number,
  message: string,
  errors: IMongoErrors,
  res: Response,
): void {
  sendApiMessageResponse<IApiMongoValidationErrorResponse>(
    status,
    { message, errors },
    res,
  );
}

/**
 * Sends a raw JSON response with the given status and response object.
 * @param status The status code
 * @param response The response data
 * @param res The response object
 */
export function sendRawJsonResponse<T>(
  status: number,
  response: T,
  res: Response<T>,
) {
  res.status(status).json(response);
}

function isRecursiveError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    '_handlingInProgress' in error &&
    !!(error as any)._handlingInProgress
  );
}

function markErrorAsHandling(error: unknown): void {
  if (error && typeof error === 'object') {
    (error as { _handlingInProgress?: boolean })._handlingInProgress = true;
  }
}

function getSafeErrorMessage(message?: string): string {
  if (message && typeof message === 'string' && message.trim() !== '') {
    return message;
  }
  try {
    const translated = translate(StringName.Common_UnexpectedError);
    return translated &&
      typeof translated === 'string' &&
      translated.trim() !== ''
      ? translated
      : 'An unexpected error occurred';
  } catch {
    return 'An unexpected error occurred';
  }
}

function convertToHandleableError(error: unknown): {
  handleableError: HandleableError;
  alreadyHandled: boolean;
  errorType: string;
} {
  if (error instanceof ExpressValidationError) {
    return {
      handleableError: error,
      alreadyHandled: !!(error as any).handled,
      errorType: error.name,
    };
  }
  if (error instanceof MongooseValidationError) {
    return {
      handleableError: error,
      alreadyHandled: !!(error as any).handled,
      errorType: error.name,
    };
  }
  if (error instanceof HandleableError) {
    return {
      handleableError: error,
      alreadyHandled: !!(error as any).handled,
      errorType: error.name,
    };
  }
  if (error instanceof Error) {
    const errorMessage = getSafeErrorMessage(error.message);
    return {
      handleableError: new HandleableError(errorMessage, {
        cause: error,
        handled: true,
      }),
      alreadyHandled: false,
      errorType: error.name,
    };
  }

  const unknownMessage =
    typeof error === 'object' &&
    error !== null &&
    'message' in (error as object)
      ? ((error as Record<string, unknown>)['message'] as string | undefined)
      : undefined;
  const errorMessage = getSafeErrorMessage(unknownMessage);
  return {
    handleableError: new HandleableError(errorMessage, { sourceData: error }),
    alreadyHandled: false,
    errorType: 'UnexpectedError',
  };
}

function sendErrorResponse(
  error: unknown,
  handleableError: HandleableError,
  errorType: string,
  send: SendFunction<
    | IApiErrorResponse
    | IApiExpressValidationErrorResponse
    | IApiMongoValidationErrorResponse
  >,
  res: Response,
): void {
  if (error instanceof ExpressValidationError) {
    send(
      handleableError.statusCode,
      {
        message: translate(StringName.ValidationError),
        errors:
          error.errors instanceof Result ? error.errors.array() : error.errors,
        errorType: 'ExpressValidationError',
      },
      res,
    );
  } else if (error instanceof MongooseValidationError) {
    send(
      handleableError.statusCode,
      {
        message: translate(StringName.ValidationError),
        errors: error.errors,
        errorType: 'MongooseValidationError',
      },
      res,
    );
  } else {
    send(
      handleableError.statusCode,
      {
        message: handleableError.message,
        error: handleableError,
        errorType: errorType,
      },
      res,
    );
  }
}

export function handleError(
  error: unknown,
  res: Response,
  send: SendFunction<
    | IApiErrorResponse
    | IApiExpressValidationErrorResponse
    | IApiMongoValidationErrorResponse
  >,
  next: NextFunction,
): void {
  if (isRecursiveError(error)) {
    const fallbackError = new HandleableError(
      'Recursive error handling detected',
    );
    send(
      fallbackError.statusCode,
      {
        message: fallbackError.message,
        error: fallbackError,
        errorType: 'RecursiveError',
      },
      res,
    );
    return;
  }

  markErrorAsHandling(error);
  const { handleableError, alreadyHandled, errorType } =
    convertToHandleableError(error);

  if (!(error instanceof ExpressValidationError)) {
    console.error(
      '[handleError]',
      errorType,
      handleableError.statusCode,
      handleableError.message,
    );
  }

  if (!res.headersSent) {
    sendErrorResponse(error, handleableError, errorType, send, res);
    handleableError.handled = true;
  }

  if (!alreadyHandled) {
    handleableError.handled = true;
    next(handleableError);
  }
}

export function locatePEMRoot(devRootDir: string): string | undefined {
  try {
    const files = readdirSync(devRootDir);
    const pemFiles = files.filter(
      (file: string) =>
        file.match(/localhost\+\d+-key\.pem$/) ||
        file.match(/localhost\+\d+\.pem$/),
    );
    if (pemFiles.length < 2) {
      return undefined;
    }
    const roots = pemFiles.map((file: string) => {
      const result = /(.*)\/(localhost\+\d+)(.*)\.pem/.exec(
        resolve(devRootDir, file),
      );
      return result ? `${result[1]}/${result[2]}` : undefined;
    });
    if (roots.some((root) => root !== roots[0])) {
      return undefined;
    }
    if (!existsSync(roots[0] + '.pem') || !existsSync(roots[0] + '-key.pem')) {
      return undefined;
    }
    return roots[0]!;
  } catch {
    return undefined;
  }
}

/**
 * Encodes the length of the data in the buffer
 * @param buffer The buffer to encode
 * @returns The encoded buffer
 */
export function lengthEncodeData(buffer: Buffer): Buffer {
  const lengthType: LengthEncodingType = getLengthEncodingTypeForLength(
    buffer.length,
  );
  const lengthTypeSize: number = getLengthForLengthType(lengthType);
  const result: Buffer = Buffer.alloc(1 + lengthTypeSize + buffer.length);
  result.writeUInt8(lengthType, 0);
  switch (lengthType) {
    case LengthEncodingType.UInt8:
      result.writeUInt8(buffer.length, 1);
      break;
    case LengthEncodingType.UInt16:
      result.writeUInt16BE(buffer.length, 1);
      break;
    case LengthEncodingType.UInt32:
      result.writeUInt32BE(buffer.length, 1);
      break;
    case LengthEncodingType.UInt64:
      result.writeBigUInt64BE(BigInt(buffer.length), 1);
      break;
  }
  buffer.copy(result, 1 + lengthTypeSize);
  return result;
}

export function decodeLengthEncodedData(buffer: Buffer): {
  data: Buffer;
  totalLength: number;
} {
  if (buffer.length < 1) {
    throw new RangeError('Buffer is too short to read length type.');
  }
  const lengthType: LengthEncodingType = getLengthEncodingTypeFromValue(
    buffer.readUint8(0),
  );
  const lengthTypeSize: number = getLengthForLengthType(lengthType);

  if (buffer.length < 1 + lengthTypeSize) {
    throw new RangeError('Buffer is too short to read the full length value.');
  }

  let length: number | BigInt;
  switch (lengthType) {
    case LengthEncodingType.UInt8:
      length = buffer.readUint8(1);
      break;
    case LengthEncodingType.UInt16:
      length = buffer.readUint16BE(1);
      break;
    case LengthEncodingType.UInt32:
      length = buffer.readUint32BE(1);
      break;
    case LengthEncodingType.UInt64:
      length = buffer.readBigUInt64BE(1);
      if (Number(length) > Number.MAX_SAFE_INTEGER) {
        throw new RangeError('Length exceeds maximum safe integer value');
      }
      break;
    default:
      throw new TranslatableError(StringName.Error_LengthIsInvalidType);
  }

  const totalLength = 1 + lengthTypeSize + Number(length);
  if (totalLength > buffer.length) {
    throw new RangeError('Buffer is too short for declared data length');
  }
  return {
    data: buffer.subarray(1 + lengthTypeSize, totalLength),
    totalLength,
  };
}

export function parseBackupCodes(
  user: 'admin' | 'member' | 'system',
  environment: object,
): BackupCode[] {
  const envVar =
    user === 'admin'
      ? 'ADMIN_BACKUP_CODES'
      : user === 'member'
        ? 'MEMBER_BACKUP_CODES'
        : 'SYSTEM_BACKUP_CODES';
  const backupCodes =
    (environment as any)[envVar]
      ?.split(',')
      .map((code: string) => new BackupCode(code.trim())) || [];
  return backupCodes;
}
