import { BlockMetadataErrorType } from '../../enumerations/blockMetadataErrorType';
import { BrightChainStrings } from '../../enumerations/brightChainStrings';
import { TypedWithReasonError } from '../typedWithReasonError';

export class BlockMetadataError extends TypedWithReasonError<BlockMetadataErrorType> {
  public get reasonMap(): Record<BlockMetadataErrorType, BrightChainStrings> {
    return {
      [BlockMetadataErrorType.CreatorRequired]:
        BrightChainStrings.Error_BlockMetadataErrorCreatorRequired,
      [BlockMetadataErrorType.EncryptorRequired]:
        BrightChainStrings.Error_BlockMetadataErrorEncryptorRequired,
      [BlockMetadataErrorType.InvalidBlockMetadata]:
        BrightChainStrings.Error_BlockMetadataErrorInvalidBlockMetadata,
      [BlockMetadataErrorType.MetadataRequired]:
        BrightChainStrings.Error_BlockMetadataErrorMetadataRequired,
      [BlockMetadataErrorType.MissingRequiredMetadata]:
        BrightChainStrings.Error_BlockMetadataErrorMissingRequiredMetadata,
      [BlockMetadataErrorType.CreatorIdMismatch]:
        BrightChainStrings.Error_BlockMetadataErrorCreatorIdMismatch,
    };
  }
  constructor(type: BlockMetadataErrorType, _language?: string) {
    super(BrightChainStrings.Error_BlockMetadataTemplate, type, undefined);
    this.name = 'BlockMetadataError';
  }
}
