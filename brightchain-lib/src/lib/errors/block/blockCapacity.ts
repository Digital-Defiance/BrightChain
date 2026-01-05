import { HandleableError } from '@digitaldefiance/i18n-lib';
import { BlockSize, blockSizeToSizeString } from '../../enumerations/blockSize';
import { StringLanguages } from '../../enumerations/stringLanguages';
import { StringNames } from '../../enumerations/stringNames';
import { translate } from '../../i18n';

export class BlockCapacityError extends HandleableError {
  constructor(
    blockSize: BlockSize,
    dataLength: number,
    _language?: StringLanguages,
  ) {
    super(
      new Error(
        translate(StringNames.Error_BlockCapacityTemplate, {
          BLOCK_SIZE: blockSizeToSizeString(blockSize),
          DATA_LENGTH: dataLength,
        }),
      ),
    );
  }
}
