/**
 * @fileoverview Hydration schemas for RBAC collections.
 *
 * Each schema implements IHydrationSchema<TStored, TTyped> and can be
 * passed directly to `db.model()` to get automatic serialize/rehydrate
 * on reads and writes.
 *
 * These are parameterized by an IIdProvider<TID> since the typed side
 * uses platform-specific ID types (GuidV4Buffer, ObjectId, etc.).
 */

export { createEnergyAccountHydrationSchema } from './energyAccountHydration';
export {
  createMnemonicHydrationSchema,
  createRoleHydrationSchema,
  createUserHydrationSchema,
  createUserRoleHydrationSchema,
} from './rbacHydration';
