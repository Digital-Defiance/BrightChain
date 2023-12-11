/**
 * Thrown when an asset amount input is negative, non-finite, or otherwise
 * cannot be represented as a non-negative microunit `bigint`.
 *
 * @see asset-account-store-generalization spec, Error Handling table.
 */
export class InvalidAmountError extends Error {
  constructor(
    message = 'Invalid asset amount: must be a finite, non-negative number.',
    public readonly value?: unknown,
  ) {
    super(message);
    this.name = 'InvalidAmountError';
    Object.setPrototypeOf(this, InvalidAmountError.prototype);
  }
}
