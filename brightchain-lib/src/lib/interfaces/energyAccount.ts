import type { IAssetAccount, IAssetAccountDto } from './assetAccount';

/**
 * Energy account for tracking member's microjoule balance.
 *
 * @deprecated Use {@link IAssetAccount} with `assetId: 'joule'`.
 * Retained for backward compatibility during the asset-account-store-generalization refactor.
 */
export type IEnergyAccount = IAssetAccount & { readonly assetId: 'joule' };

/**
 * DTO for energy account serialization (bigint fields stored as decimal strings).
 *
 * @deprecated Use {@link IAssetAccountDto}.
 * Retained for backward compatibility during the asset-account-store-generalization refactor.
 */
export type IEnergyAccountDto = IAssetAccountDto;
