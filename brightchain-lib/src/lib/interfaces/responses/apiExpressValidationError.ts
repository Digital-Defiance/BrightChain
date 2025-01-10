import { Result, ValidationError } from 'express-validator';
import { IApiMessageResponse } from './apiMessage';

export interface IApiExpressValidationErrorResponse
  extends IApiMessageResponse {
  errors: ValidationError[] | Result<ValidationError>;
  errorType?: string;
}
