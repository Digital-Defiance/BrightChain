import { StringNames } from './stringNames';

export enum InvalidEmailErrorType {
  Invalid = 'Invalid',
  Missing = 'Missing',
  Whitespace = 'Whitespace',
}

export const InvalidEmailErrorTypes: {
  [key in InvalidEmailErrorType]: StringNames;
} = {
  [InvalidEmailErrorType.Invalid]: StringNames.Error_InvalidEmail,
  [InvalidEmailErrorType.Missing]: StringNames.Error_InvalidEmailMissing,
  [InvalidEmailErrorType.Whitespace]: StringNames.Error_InvalidEmailWhitespace,
};
