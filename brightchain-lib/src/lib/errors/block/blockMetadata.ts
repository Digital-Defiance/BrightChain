import { BlockMetadataErrorType } from '../../enumerations/blockMetadataErrorType';
import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../../enumerations/brightChainStrings';
import { TypedWithReasonError } from '../typedWithReasonError';

export class BlockMetadataError extends TypedWithReasonError<BlockMetadataErrorType> {
  public get reasonMap(): Record<BlockMetadataErrorType, BrightChainStringKey> {
    return {
      [BlockMetadataErrorType.CreatorRequired]:
        BrightChainStrings.Error_BlockMetadataError_CreatorRequired,
      [BlockMetadataErrorType.EncryptorRequired]:
        BrightChainStrings.Error_BlockMetadataError_EncryptorRequired,
      [BlockMetadataErrorType.InvalidBlockMetadata]:
        BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadata,
      [BlockMetadataErrorType.MetadataRequired]:
        BrightChainStrings.Error_BlockMetadataError_MetadataRequired,
      [BlockMetadataErrorType.MissingRequiredMetadata]:
        BrightChainStrings.Error_BlockMetadataError_MissingRequiredMetadata,
      [BlockMetadataErrorType.CreatorIdMismatch]:
        BrightChainStrings.Error_BlockMetadataError_CreatorIdMismatch,
    };
  }
  constructor(type: BlockMetadataErrorType, _language?: string) {
    super(BrightChainStrings.Error_BlockMetadata_Template, type, undefined);
    this.name = 'BlockMetadataError';
  }
}
