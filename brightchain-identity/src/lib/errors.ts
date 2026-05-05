/**
 * Error type raised by the BrightChain identity layer for invalid input,
 * decryption failures, or missing dependencies.
 */
export class BrightChainIdentityError extends Error {
  public override readonly name = 'BrightChainIdentityError';

  constructor(message: string, public override readonly cause?: unknown) {
    super(message);
  }
}
