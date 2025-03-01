import { BlockSize, blockSizeToSizeString } from '../../enumerations/blockSize';
import { StringLanguages } from '../../enumerations/stringLanguages';
import { StringNames } from '../../enumerations/stringNames';
import { translate } from '../../i18n';
import { HandleableError } from '../handleable';

export class BlockCapacityError extends HandleableError {
  constructor(
    blockSize: BlockSize,
    dataLength: number,
    language?: StringLanguages,
  ) {
    super(
      translate(StringNames.Error_BlockCapacityTemplate, language, {
        BLOCK_SIZE: blockSizeToSizeString(blockSize),
        DATA_LENGTH: dataLength,
      }),
    );
    this.name = 'BlockCapacityError';
  }
}
