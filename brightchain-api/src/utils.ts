import {
  ApiErrorResponse,
  ExpressValidationError,
  HandleableError,
  IApiErrorResponse,
  IApiExpressValidationErrorResponse,
  IApiMessageResponse,
  JsonResponse,
  MissingValidatedDataError,
  SendFunction,
  translate,
} from '@BrightChain/brightchain-lib';
import { StringNames } from 'brightchain-lib/src/lib/enumerations/stringNames';
import { NextFunction, Request, Response } from 'express';
import { Result, ValidationError } from 'express-validator';

/**
 * Verifies the required fields were validated by express-validator and sends an error response if not or calls the callback if they are
 * @param req The request object
 * @param res The response object
 * @param fields The fields to check
 * @param callback The callback to call if the fields are valid
 * @param errorCallback The function to call if a field is invalid
 * @returns The result of the callback
 */
export async function requireValidatedFieldsAsync<T = void>(
  req: Request,
  res: Response,
  fields: string[],
  callback: () => Promise<T>,
  errorCallback: (res: Response, field: string) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (req.validatedBody === undefined) {
      reject(new MissingValidatedDataError());
      return;
    }

    const validatedBody = req.validatedBody;
    for (const field of fields) {
      if (validatedBody[field] === undefined) {
        errorCallback(res, field);
        reject(new MissingValidatedDataError(field));
        return;
      }
    }

    // All fields are valid, call the callback
    callback().then(resolve).catch(reject);
  });
}

/**
 * Verifies at least one of the required fields were validated by express-validator and sends an error response if not or calls the callback if they are
 * @param req The request object
 * @param res The response object
 * @param fields The fields to check
 * @param callback The callback to call if the fields are valid
 * @param errorCallback The function to call if not at least one field is valid
 * @returns The result of the callback
 */
export async function requireOneOfValidatedFieldsAsync<T = Promise<void>>(
  req: Request,
  res: Response,
  fields: string[],
  callback: () => Promise<T>,
  errorCallback: (res: Response, fields: string[]) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (req.validatedBody === undefined) {
      throw new MissingValidatedDataError();
    }
    const validatedBody = req.validatedBody;
    // return 422 if none of the fields are valid
    if (!fields.some((field) => validatedBody[field] !== undefined)) {
      errorCallback(res, fields);
      reject(new MissingValidatedDataError(fields));
      return;
    }
    // All fields are valid, call the callback
    callback().then(resolve).catch(reject);
  });
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
 * Sends an API response with the given status and response object.
 * @param status
 * @param response
 * @param res
 */
export function sendApiMessageResponse<T extends IApiMessageResponse>(
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
  res: Response<IApiErrorResponse>,
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
  res: Response<IApiExpressValidationErrorResponse>,
): void {
  sendApiMessageResponse<IApiExpressValidationErrorResponse>(
    status,
    { message: translate(StringNames.Error_ValidationError), errors },
    res,
  );
}

/**
 * Sends a raw JSON response with the given status and response object.
 * @param status The status code
 * @param response The response data
 * @param res The response object
 */
export function sendRawJsonResponse(
  status: number,
  response: JsonResponse,
  res: Response<JsonResponse>,
) {
  res.status(status).json(response);
}

export function handleError(
  error: unknown,
  res: Response<ApiErrorResponse>,
  send: SendFunction<ApiErrorResponse>,
  next: NextFunction,
): void {
  let handleableError: HandleableError;
  let alreadyHandled = false;
  let errorType = 'UnexpectedError';
  if (error instanceof HandleableError) {
    handleableError = error;
    alreadyHandled = error.handled;
    errorType = error.name;
  } else if (error instanceof Error) {
    handleableError = new HandleableError(
      error.message ?? translate(StringNames.Error_UnexpectedError),
      {
        cause: error,
        handled: true,
      },
    );
    errorType = error.name;
  } else {
    handleableError = new HandleableError(
      (error as any).message ?? translate(StringNames.Error_UnexpectedError),
      { sourceData: error },
    );
  }
  if (!res.headersSent) {
    if (error instanceof ExpressValidationError) {
      send(
        handleableError.statusCode,
        {
          message: translate(StringNames.Error_ValidationError),
          errors:
            error.errors instanceof Result
              ? error.errors.array()
              : error.errors,
          errorType: 'ExpressValidationError',
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
    handleableError.handled = true;
  }
  if (!alreadyHandled) {
    handleableError.handled = true;
    next(handleableError);
  }
}
