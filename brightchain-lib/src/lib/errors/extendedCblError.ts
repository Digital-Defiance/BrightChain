import { BlockSize } from '../enumerations/blockSizes';
import {
  ExtendedCblErrorType,
  ExtendedCblErrorTypes,
} from '../enumerations/extendedCblErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class ExtendedCblError extends HandleableError {
  public readonly reason: ExtendedCblErrorType;
  public readonly blockSize?: BlockSize;
  public readonly dataSize?: number;
  public readonly error?: string;
  constructor(
    reason: ExtendedCblErrorType,
    blockSize?: BlockSize,
    dataSize?: number,
    error?: string,
    language?: StringLanguages,
  ) {
    super(
      translate(ExtendedCblErrorTypes[reason], language, {
        ...(blockSize ? { BLOCK_SIZE: blockSize as number } : {}),
        ...(dataSize ? { DATA_SIZE: dataSize } : {}),
        ...(error ? { ERROR: error } : {}),
      }),
    );
    this.name = 'ExtendedCblError';
    this.reason = reason;
    this.blockSize = blockSize;
    this.dataSize = dataSize;
  }
}
