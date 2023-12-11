import { BlockAccessErrorType } from '../../enumerations/blockAccessErrorType';
import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../../enumerations/brightChainStrings';
import { TypedWithReasonError } from '../typedWithReasonError';

export class BlockAccessError extends TypedWithReasonError<BlockAccessErrorType> {
  public readonly file?: string;
  public get reasonMap(): Record<BlockAccessErrorType, BrightChainStringKey> {
    return {
      [BlockAccessErrorType.BlockAlreadyExists]:
        BrightChainStrings.Error_BlockAccessError_BlockAlreadyExists,
      [BlockAccessErrorType.BlockFileNotFound]:
        BrightChainStrings.Error_BlockAccessError_BlockFileNotFoundTemplate,
      [BlockAccessErrorType.BlockIsNotPersistable]:
        BrightChainStrings.Error_BlockAccessError_BlockIsNotPersistable,
      [BlockAccessErrorType.BlockIsNotReadable]:
        BrightChainStrings.Error_BlockAccessError_BlockIsNotReadable,
      [BlockAccessErrorType.CBLCannotBeEncrypted]:
        BrightChainStrings.Error_BlockAccess_CBLCannotBeEncrypted,
      [BlockAccessErrorType.CreatorMustBeProvided]:
        BrightChainStrings.Error_BlockAccessError_CreatorMustBeProvided,
    };
  }
  constructor(type: BlockAccessErrorType, file?: string, _language?: string) {
    super(
      BrightChainStrings.Error_BlockAccess_Template,
      type,
      file ? { FILE: file } : {},
    );
    this.name = 'BlockAccessError';
    this.file = file;
  }
}
