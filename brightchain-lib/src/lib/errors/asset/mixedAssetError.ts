/**
 * Thrown when an aggregate / sum helper receives records of differing
 * `assetId`. The asset-account store forbids silent mixing of assets in
 * arithmetic so that joule, postage, etc. cannot collide in a single total.
 *
 * @see asset-account-store-generalization spec, Requirement 3.6.
 */
export class MixedAssetError extends Error {
  constructor(
    public readonly assetIds: readonly string[],
    message?: string,
  ) {
    super(
      message ??
        `Cannot aggregate balances across mixed assets: [${assetIds.join(', ')}].`,
    );
    this.name = 'MixedAssetError';
    Object.setPrototypeOf(this, MixedAssetError.prototype);
  }
}
