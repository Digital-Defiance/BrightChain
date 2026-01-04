import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';
import { IMongoErrors } from './mongo-errors';

export interface IApiMongoValidationErrorResponse extends IApiMessageResponse {
  errors: IMongoErrors;
}
