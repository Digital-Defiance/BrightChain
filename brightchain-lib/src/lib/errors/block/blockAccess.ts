import { BlockAccessErrorType } from '../../enumerations/blockAccessErrorType';
import { BrightChainStrings } from '../../enumerations/brightChainStrings';
import { TypedWithReasonError } from '../typedWithReasonError';

export class BlockAccessError extends TypedWithReasonError<BlockAccessErrorType> {
  public readonly file?: string;
  public get reasonMap(): Record<BlockAccessErrorType, BrightChainStrings> {
    return {
      [BlockAccessErrorType.BlockAlreadyExists]:
        BrightChainStrings.Error_BlockAccessErrorBlockAlreadyExists,
      [BlockAccessErrorType.BlockFileNotFound]:
        BrightChainStrings.Error_BlockAccessErrorBlockFileNotFoundTemplate,
      [BlockAccessErrorType.BlockIsNotPersistable]:
        BrightChainStrings.Error_BlockAccessErrorBlockIsNotPersistable,
      [BlockAccessErrorType.BlockIsNotReadable]:
        BrightChainStrings.Error_BlockAccessErrorBlockIsNotReadable,
      [BlockAccessErrorType.CBLCannotBeEncrypted]:
        BrightChainStrings.Error_BlockAccessCBLCannotBeEncrypted,
      [BlockAccessErrorType.CreatorMustBeProvided]:
        BrightChainStrings.Error_BlockAccessErrorCreatorMustBeProvided,
    };
  }
  constructor(type: BlockAccessErrorType, file?: string, _language?: string) {
    super(
      BrightChainStrings.Error_BlockAccessTemplate,
      type,
      file ? { FILE: file } : {},
    );
    this.name = 'BlockAccessError';
    this.file = file;
  }
}
