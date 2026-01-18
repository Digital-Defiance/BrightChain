import { BlockAccessErrorType } from '../../enumerations/blockAccessErrorType';
import { StringNames } from '../../enumerations/stringNames';
import { TypedWithReasonError } from '../typedWithReasonError';

export class BlockAccessError extends TypedWithReasonError<BlockAccessErrorType> {
  public readonly file?: string;
  public get reasonMap(): Record<BlockAccessErrorType, StringNames> {
    return {
      [BlockAccessErrorType.BlockAlreadyExists]:
        StringNames.Error_BlockAccessErrorBlockAlreadyExists,
      [BlockAccessErrorType.BlockFileNotFound]:
        StringNames.Error_BlockAccessErrorBlockFileNotFoundTemplate,
      [BlockAccessErrorType.BlockIsNotPersistable]:
        StringNames.Error_BlockAccessErrorBlockIsNotPersistable,
      [BlockAccessErrorType.BlockIsNotReadable]:
        StringNames.Error_BlockAccessErrorBlockIsNotReadable,
      [BlockAccessErrorType.CBLCannotBeEncrypted]:
        StringNames.Error_BlockAccessCBLCannotBeEncrypted,
      [BlockAccessErrorType.CreatorMustBeProvided]:
        StringNames.Error_BlockAccessErrorCreatorMustBeProvided,
    };
  }
  constructor(type: BlockAccessErrorType, file?: string, _language?: string) {
    super(
      StringNames.Error_BlockAccessTemplate,
      type,
      file ? { FILE: file } : {},
    );
    this.name = 'BlockAccessError';
    this.file = file;
  }
}
