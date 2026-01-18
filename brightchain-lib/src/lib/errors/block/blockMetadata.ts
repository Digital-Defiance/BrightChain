import { BlockMetadataErrorType } from '../../enumerations/blockMetadataErrorType';
import { StringNames } from '../../enumerations/stringNames';
import { TypedWithReasonError } from '../typedWithReasonError';

export class BlockMetadataError extends TypedWithReasonError<BlockMetadataErrorType> {
  public get reasonMap(): Record<BlockMetadataErrorType, StringNames> {
    return {
      [BlockMetadataErrorType.CreatorRequired]:
        StringNames.Error_BlockMetadataErrorCreatorRequired,
      [BlockMetadataErrorType.EncryptorRequired]:
        StringNames.Error_BlockMetadataErrorEncryptorRequired,
      [BlockMetadataErrorType.InvalidBlockMetadata]:
        StringNames.Error_BlockMetadataErrorInvalidBlockMetadata,
      [BlockMetadataErrorType.MetadataRequired]:
        StringNames.Error_BlockMetadataErrorMetadataRequired,
      [BlockMetadataErrorType.MissingRequiredMetadata]:
        StringNames.Error_BlockMetadataErrorMissingRequiredMetadata,
      [BlockMetadataErrorType.CreatorIdMismatch]:
        StringNames.Error_BlockMetadataErrorCreatorIdMismatch,
    };
  }
  constructor(type: BlockMetadataErrorType, _language?: string) {
    super(StringNames.Error_BlockMetadataTemplate, type, undefined);
    this.name = 'BlockMetadataError';
  }
}
