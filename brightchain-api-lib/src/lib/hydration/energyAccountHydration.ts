/**
 * @fileoverview IHydrationSchema for EnergyAccount ↔ IEnergyAccountDto.
 *
 * Uses EnergyAccount.fromDto() and account.toDto() which already exist
 * in brightchain-lib. This factory simply wraps them as an IHydrationSchema
 * for use with the Model system.
 */

import type {
  IEnergyAccountDto,
  IHydrationSchema,
} from '@brightchain/brightchain-lib';
import { EnergyAccount } from '@brightchain/brightchain-lib';

/**
 * Create a hydration schema for the energy_accounts collection.
 *
 * - hydrate: IEnergyAccountDto → EnergyAccount (via EnergyAccount.fromDto)
 * - dehydrate: EnergyAccount → IEnergyAccountDto (via account.toDto)
 */
export function createEnergyAccountHydrationSchema(): IHydrationSchema<
  IEnergyAccountDto,
  EnergyAccount
> {
  return {
    hydrate: (stored: IEnergyAccountDto) => EnergyAccount.fromDto(stored),
    dehydrate: (typed: EnergyAccount) => typed.toDto(),
  };
}
