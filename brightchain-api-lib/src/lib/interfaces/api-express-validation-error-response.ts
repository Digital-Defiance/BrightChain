import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';
import { Result, ValidationError } from 'express-validator';

export interface IApiExpressValidationErrorResponse
  extends IApiMessageResponse {
  errors: ValidationError[] | Result<ValidationError>;
  errorType?: string;
}
