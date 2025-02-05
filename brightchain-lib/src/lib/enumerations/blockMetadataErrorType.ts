import { StringNames } from './stringNames';

export enum BlockMetadataErrorType {
  CreatorRequired = 'CreatorRequired',
  EncryptorRequired = 'EncryptorRequired',
  InvalidBlockMetadata = 'InvalidBlockMetadata',
  MetadataRequired = 'MetadataRequired',
}

export const BlockMetadataErrorTypes: {
  [key in BlockMetadataErrorType]: StringNames;
} = {
  [BlockMetadataErrorType.CreatorRequired]:
    StringNames.Error_BlockMetadataErrorCreatorRequired,
  [BlockMetadataErrorType.EncryptorRequired]:
    StringNames.Error_BlockMetadataErrorEncryptorRequired,
  [BlockMetadataErrorType.InvalidBlockMetadata]:
    StringNames.Error_BlockMetadataErrorInvalidBlockMetadata,
  [BlockMetadataErrorType.MetadataRequired]:
    StringNames.Error_BlockMetadataErrorMetadataRequired,
};
