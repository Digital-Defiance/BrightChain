import { ADMIN } from '@brightchain/brightchart-lib';
import type { BrightDb } from '@brightchain/db';
import { SchemaCollection } from '../enumerations/schema-collection';

/**
 * Standalone reusable guard that checks whether a member holds an active
 * ADMIN healthcare role (SNOMED CT 394572006) at the given organization.
 *
 * An "active" role means:
 * - `period.end` does not exist, OR
 * - `period.end` is null, OR
 * - `period.end` is in the future
 *
 * @param db - BrightDb instance
 * @param memberId - The authenticated member's ID
 * @param organizationId - The target organization ID
 * @returns `true` if the member is an active org admin, `false` otherwise
 *
 * @requirements 2.4, 3.4, 5.6, 7.2
 */
export async function orgAdminGuard(
  db: BrightDb,
  memberId: string,
  organizationId: string,
): Promise<boolean> {
  const rolesCol = db.collection(SchemaCollection.HealthcareRole);
  const now = new Date().toISOString();

  const adminRole = await rolesCol.findOne({
    memberId,
    organizationId,
    roleCode: ADMIN,
    $or: [
      { 'period.end': { $exists: false } },
      { 'period.end': null },
      { 'period.end': { $gt: now } },
    ],
  } as never);

  return adminRole !== null && adminRole !== undefined;
}
