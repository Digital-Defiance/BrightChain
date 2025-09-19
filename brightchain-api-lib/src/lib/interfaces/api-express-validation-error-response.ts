import { IApiMessageResponse } from '@brightchain/brightchain-lib';
import { Result, ValidationError } from 'express-validator';

export interface IApiExpressValidationErrorResponse
  extends IApiMessageResponse {
  errors: ValidationError[] | Result<ValidationError>;
  errorType?: string;
}
