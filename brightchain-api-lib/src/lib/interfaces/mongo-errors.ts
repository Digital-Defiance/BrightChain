import { Error } from 'mongoose';

export interface IMongoErrors {
  [key: string]: Error.ValidatorError | Error.CastError;
}
