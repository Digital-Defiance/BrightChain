import { StringNames } from './stringNames';

export enum Pbkdf2ErrorType {
  InvalidSaltLength = 'InvalidSaltLength',
  InvalidHashLength = 'InvalidHashLength',
}

export const Pbkdf2ErrorTypes: { [key in Pbkdf2ErrorType]: StringNames } = {
  [Pbkdf2ErrorType.InvalidSaltLength]:
    StringNames.Error_Pbkdf2InvalidSaltLength,
  [Pbkdf2ErrorType.InvalidHashLength]:
    StringNames.Error_Pbkdf2InvalidHashLength,
};
