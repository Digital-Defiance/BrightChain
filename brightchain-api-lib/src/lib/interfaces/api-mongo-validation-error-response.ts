import { IApiMessageResponse } from '@brightchain/brightchain-lib';
import { IMongoErrors } from './mongo-errors';

export interface IApiMongoValidationErrorResponse extends IApiMessageResponse {
  errors: IMongoErrors;
}
