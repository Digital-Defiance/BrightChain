/**
 * Thrown by `AssetAccountStore.reserve()` when
 * `balance - reserved < requestedAmount`.
 *
 * @see asset-account-store-generalization spec, Requirement 4.3.
 */
export class InsufficientAvailableBalanceError extends Error {
  constructor(
    public readonly assetId: string,
    public readonly requested: bigint,
    public readonly available: bigint,
    message?: string,
  ) {
    super(
      message ??
        `Insufficient available balance for asset '${assetId}': requested ${requested.toString()}, available ${available.toString()}.`,
    );
    this.name = 'InsufficientAvailableBalanceError';
    Object.setPrototypeOf(this, InsufficientAvailableBalanceError.prototype);
  }
}
