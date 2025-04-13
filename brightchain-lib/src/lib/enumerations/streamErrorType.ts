export enum StreamErrorType {
  BlockSizeRequired = 'BlockSizeRequired',
  WhitenedBlockSourceRequired = 'WhitenedBlockSourceRequired',
  RandomBlockSourceRequired = 'RandomBlockSourceRequired',
  InputMustBeBuffer = 'InputMustBeBuffer',
  FailedToGetRandomBlock = 'FailedToGetRandomBlock',
  FailedToGetWhiteningBlock = 'FailedToGetWhiteningBlock',
  IncompleteEncryptedBlock = 'IncompleteEncryptedBlock',
}
