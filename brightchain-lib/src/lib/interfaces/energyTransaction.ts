import { OperationType } from '../enumerations/operationType';
import { Checksum } from '../types/checksum';

/**
 * Metadata for an asset transaction (asset-agnostic canonical name).
 */
export interface IAssetTransactionMetadata {
  dataSize?: number;
  duration?: number;
  redundancy?: number;
  proofOfWork?: number;
}

/**
 * @deprecated Renamed to {@link IAssetTransactionMetadata}. Re-exported as
 * an alias for backward compatibility.
 */
export type IEnergyTransactionMetadata = IAssetTransactionMetadata;

/**
 * Asset-agnostic transaction record.
 * `amount` is denominated in microunits of the named `assetId`.
 * The `assetId` field is part of the signing payload (req 6.4) so that a
 * transaction signed for one asset cannot be replayed against another.
 */
export interface IAssetTransaction {
  readonly id: Checksum;
  readonly timestamp: Date;
  readonly source: Checksum;
  readonly destination: Checksum;
  /** Asset identifier — e.g. `'joule'` for energy credits. */
  readonly assetId: string;
  /** Amount in microunits of the named asset. */
  readonly amount: bigint;
  readonly operationType: OperationType;
  readonly blockId?: Checksum;
  readonly metadata: IAssetTransactionMetadata;
  readonly signature: Uint8Array;
}

/**
 * Joule-denominated energy transaction — alias narrowing {@link IAssetTransaction}
 * to `assetId: 'joule'`. Preserved for backward compatibility of all existing
 * call sites.
 */
export type EnergyTransaction = IAssetTransaction & {
  readonly assetId: 'joule';
};
