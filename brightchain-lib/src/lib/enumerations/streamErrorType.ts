import { StringNames } from './stringNames';

export enum StreamErrorType {
  BlockSizeRequired = 'BlockSizeRequired',
  WhitenedBlockSourceRequired = 'WhitenedBlockSourceRequired',
  RandomBlockSourceRequired = 'RandomBlockSourceRequired',
  InputMustBeBuffer = 'InputMustBeBuffer',
  FailedToGetRandomBlock = 'FailedToGetRandomBlock',
  FailedToGetWhiteningBlock = 'FailedToGetWhiteningBlock',
  IncompleteEncryptedBlock = 'IncompleteEncryptedBlock',
}

export const StreamErrorTypes: {
  [key in StreamErrorType]: StringNames;
} = {
  [StreamErrorType.BlockSizeRequired]:
    StringNames.Error_StreamErrorBlockSizeRequired,
  [StreamErrorType.WhitenedBlockSourceRequired]:
    StringNames.Error_StreamErrorWhitenedBlockSourceRequired,
  [StreamErrorType.RandomBlockSourceRequired]:
    StringNames.Error_StreamErrorRandomBlockSourceRequired,
  [StreamErrorType.InputMustBeBuffer]:
    StringNames.Error_StreamErrorInputMustBeBuffer,
  [StreamErrorType.FailedToGetRandomBlock]:
    StringNames.Error_StreamErrorFailedToGetRandomBlock,
  [StreamErrorType.FailedToGetWhiteningBlock]:
    StringNames.Error_StreamErrorFailedToGetWhiteningBlock,
  [StreamErrorType.IncompleteEncryptedBlock]:
    StringNames.Error_StreamErrorIncompleteEncryptedBlock,
};
