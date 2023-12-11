/**
 * Seed Runner: Organization Role Dev Seeding
 *
 * Provides the `seedOrgRoles` function that performs idempotent
 * insert-or-skip operations for seed organizations, healthcare roles,
 * and invitations. Also exports the SeedLogger interface and
 * ConsoleSeedLogger implementation.
 *
 * @module seed/orgRoleSeedRunner
 */

import type { BrightDb } from '@brightchain/db';
import { SchemaCollection } from '../enumerations/schema-collection';
import {
  SEED_HEALTHCARE_ROLES,
  SEED_INVITATIONS,
  SEED_ORGANIZATIONS,
} from './orgRoleSeedData';

// ── Interfaces ──────────────────────────────────────────────────

/** Per-collection insert/skip counts. */
export interface SeedCollectionResult {
  inserted: number;
  skipped: number;
}

/** Aggregate result from a seed run. */
export interface SeedResult {
  organizations: SeedCollectionResult;
  healthcareRoles: SeedCollectionResult;
  invitations: SeedCollectionResult;
}

/** Logger abstraction for seed operations. */
export interface SeedLogger {
  inserted(collection: string, id: string, label: string): void;
  skipped(collection: string, id: string): void;
  summary(result: SeedResult): void;
  error(message: string, err?: unknown): void;
}

// ── ConsoleSeedLogger ───────────────────────────────────────────

/** Default SeedLogger that writes to console.log / console.error. */
export class ConsoleSeedLogger implements SeedLogger {
  inserted(collection: string, id: string, label: string): void {
    console.log(`[seed:org-roles] INSERT ${collection} ${id} — ${label}`);
  }

  skipped(collection: string, id: string): void {
    console.log(`[seed:org-roles] SKIP   ${collection} ${id} (already exists)`);
  }

  summary(result: SeedResult): void {
    console.log(
      `[seed:org-roles] Summary: ` +
        `organizations ${result.organizations.inserted} inserted / ${result.organizations.skipped} skipped, ` +
        `healthcareRoles ${result.healthcareRoles.inserted} inserted / ${result.healthcareRoles.skipped} skipped, ` +
        `invitations ${result.invitations.inserted} inserted / ${result.invitations.skipped} skipped`,
    );
  }

  error(message: string, err?: unknown): void {
    console.error(`[seed:org-roles] ERROR: ${message}`, err ?? '');
  }
}

// ── Upsert helper ───────────────────────────────────────────────

async function upsertRecord(
  collection: {
    findOne(filter: unknown): Promise<unknown>;
    insertOne(doc: unknown): Promise<unknown>;
  },
  record: Record<string, unknown>,
  collectionName: string,
  label: string,
  logger: SeedLogger,
): Promise<'inserted' | 'skipped'> {
  const existing = await collection.findOne({ _id: record['_id'] });
  if (existing) {
    logger.skipped(collectionName, record['_id'] as string);
    return 'skipped';
  }
  await collection.insertOne(record);
  logger.inserted(collectionName, record['_id'] as string, label);
  return 'inserted';
}

// ── Seed runner ─────────────────────────────────────────────────

/**
 * Seed organizations, healthcare roles, and invitations into BrightDb.
 *
 * Performs idempotent insert-or-skip for each seed record. Returns
 * aggregate counts. Uses {@link ConsoleSeedLogger} when no logger is
 * provided.
 */
export async function seedOrgRoles(
  db: BrightDb,
  logger: SeedLogger = new ConsoleSeedLogger(),
): Promise<SeedResult> {
  const result: SeedResult = {
    organizations: { inserted: 0, skipped: 0 },
    healthcareRoles: { inserted: 0, skipped: 0 },
    invitations: { inserted: 0, skipped: 0 },
  };

  // Organizations
  const orgCol = db.collection(SchemaCollection.Organization);
  for (const org of SEED_ORGANIZATIONS) {
    const outcome = await upsertRecord(
      orgCol as never,
      org as unknown as Record<string, unknown>,
      'organizations',
      org.name,
      logger,
    );
    result.organizations[outcome]++;
  }

  // Healthcare roles
  const roleCol = db.collection(SchemaCollection.HealthcareRole);
  for (const role of SEED_HEALTHCARE_ROLES) {
    const outcome = await upsertRecord(
      roleCol as never,
      role as unknown as Record<string, unknown>,
      'healthcare_roles',
      `${role.roleDisplay} @ ${role.organizationId}`,
      logger,
    );
    result.healthcareRoles[outcome]++;
  }

  // Invitations
  const invCol = db.collection(SchemaCollection.Invitation);
  for (const inv of SEED_INVITATIONS) {
    const outcome = await upsertRecord(
      invCol as never,
      inv as unknown as Record<string, unknown>,
      'invitations',
      `token=${inv.token}`,
      logger,
    );
    result.invitations[outcome]++;
  }

  logger.summary(result);
  return result;
}
