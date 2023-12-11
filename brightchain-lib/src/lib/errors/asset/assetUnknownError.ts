/**
 * Thrown by strict-mode formatters or registry lookups when an `assetId` is
 * not recognized. The default `formatAssetAmount` falls back to a raw
 * representation rather than throwing.
 *
 * @see asset-account-store-generalization spec, Error Handling table.
 */
export class AssetUnknownError extends Error {
  constructor(
    public readonly assetId: string,
    message?: string,
  ) {
    super(message ?? `Unknown asset: '${assetId}'.`);
    this.name = 'AssetUnknownError';
    Object.setPrototypeOf(this, AssetUnknownError.prototype);
  }
}
