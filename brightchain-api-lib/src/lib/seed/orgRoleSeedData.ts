/**
 * Seed Data Module: Organization Role Dev Seeding
 *
 * Exports deterministic seed data for organizations, healthcare roles,
 * and invitations. Used by the seed runner and integration tests.
 *
 * All IDs and timestamps are fixed constants — no runtime generation.
 *
 * @module seed/orgRoleSeedData
 */

import {
  ADMIN,
  PHYSICIAN,
  PATIENT,
  ROLE_CODE_DISPLAY,
} from '@brightchain/brightchart-lib';
import type { IOrganization } from '@brightchain/brightchart-lib';
import type { IHealthcareRoleDocument } from '@brightchain/brightchart-lib';
import type { IInvitation } from '@brightchain/brightchart-lib';

// ── Deterministic IDs ───────────────────────────────────────────

/** Default dev user ID used when MEMBER_ID env var is not set. */
export const DEV_USER_ID = 'seed-dev-user-00000000-0000-0001';

/** Organization ID: Sunrise Family Practice */
export const ORG_SUNRISE_ID = 'seed-org-sunrise-00000000-0001';
/** Organization ID: Downtown Dental Clinic */
export const ORG_DOWNTOWN_ID = 'seed-org-downtown-0000000-0002';
/** Organization ID: City Veterinary Hospital */
export const ORG_CITYVET_ID = 'seed-org-cityvet-00000000-0003';

/** Healthcare role ID: ADMIN @ Sunrise */
export const ROLE_ADMIN_SUNRISE_ID = 'seed-role-admin-sunrise-0001';
/** Healthcare role ID: PHYSICIAN @ Downtown */
export const ROLE_PHYSICIAN_DOWNTOWN_ID = 'seed-role-phys-downtown-002';
/** Healthcare role ID: PATIENT @ City Vet */
export const ROLE_PATIENT_CITYVET_ID = 'seed-role-patient-cityvet-03';

/** Healthcare role ID: PATIENT @ Sunrise */
export const ROLE_PATIENT_SUNRISE_ID = 'seed-role-patient-sunrise-04';

/** Invitation ID: Downtown Dental, PATIENT role */
export const INV_DOWNTOWN_PATIENT_ID = 'seed-inv-downtown-patient-01';
/** Invitation token: Downtown Dental, PATIENT role */
export const INV_DOWNTOWN_PATIENT_TOKEN =
  'seed-invite-downtown-patient-token-001';

/** Invitation ID: Sunrise Family Practice, PATIENT role */
export const INV_SUNRISE_PATIENT_ID = 'seed-inv-sunrise-patient-01';
/** Invitation token: Sunrise Family Practice, PATIENT role */
export const INV_SUNRISE_PATIENT_TOKEN =
  'seed-invite-sunrise-patient-token-001';

// ── Fixed timestamps ────────────────────────────────────────────

const FIXED_CREATED_AT = '2025-01-01T00:00:00.000Z';
const FIXED_UPDATED_AT = '2025-01-01T00:00:00.000Z';
const FIXED_PERIOD_START = '2025-01-01T00:00:00.000Z';

// ── Helper ──────────────────────────────────────────────────────

/**
 * Returns the dev user member ID.
 * Uses the `MEMBER_ID` environment variable if set, otherwise falls back
 * to the deterministic {@link DEV_USER_ID}.
 */
export function getDevUserId(): string {
  return process.env['MEMBER_ID'] ?? DEV_USER_ID;
}

// ── Seed Organizations ──────────────────────────────────────────

export const SEED_ORGANIZATIONS: IOrganization[] = [
  {
    _id: ORG_SUNRISE_ID,
    name: 'Sunrise Family Practice',
    active: true,
    enrollmentMode: 'open',
    createdBy: DEV_USER_ID,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
  },
  {
    _id: ORG_DOWNTOWN_ID,
    name: 'Downtown Dental Clinic',
    active: true,
    enrollmentMode: 'invite-only',
    createdBy: DEV_USER_ID,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
  },
  {
    _id: ORG_CITYVET_ID,
    name: 'City Veterinary Hospital',
    active: true,
    enrollmentMode: 'open',
    createdBy: DEV_USER_ID,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
  },
];

// ── Seed Healthcare Roles ───────────────────────────────────────

export const SEED_HEALTHCARE_ROLES: IHealthcareRoleDocument[] = [
  {
    _id: ROLE_ADMIN_SUNRISE_ID,
    memberId: DEV_USER_ID,
    roleCode: ADMIN,
    roleDisplay: ROLE_CODE_DISPLAY[ADMIN],
    organizationId: ORG_SUNRISE_ID,
    practitionerRef: DEV_USER_ID,
    period: { start: FIXED_PERIOD_START },
    createdBy: DEV_USER_ID,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
  },
  {
    _id: ROLE_PHYSICIAN_DOWNTOWN_ID,
    memberId: DEV_USER_ID,
    roleCode: PHYSICIAN,
    roleDisplay: ROLE_CODE_DISPLAY[PHYSICIAN],
    organizationId: ORG_DOWNTOWN_ID,
    practitionerRef: DEV_USER_ID,
    period: { start: FIXED_PERIOD_START },
    createdBy: DEV_USER_ID,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
  },
  {
    _id: ROLE_PATIENT_CITYVET_ID,
    memberId: DEV_USER_ID,
    roleCode: PATIENT,
    roleDisplay: ROLE_CODE_DISPLAY[PATIENT],
    organizationId: ORG_CITYVET_ID,
    patientRef: DEV_USER_ID,
    period: { start: FIXED_PERIOD_START },
    createdBy: DEV_USER_ID,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
  },
  {
    _id: ROLE_PATIENT_SUNRISE_ID,
    memberId: DEV_USER_ID,
    roleCode: PATIENT,
    roleDisplay: ROLE_CODE_DISPLAY[PATIENT],
    organizationId: ORG_SUNRISE_ID,
    patientRef: DEV_USER_ID,
    period: { start: FIXED_PERIOD_START },
    createdBy: DEV_USER_ID,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_UPDATED_AT,
  },
];

// ── Seed Invitations ────────────────────────────────────────────

export const SEED_INVITATIONS: IInvitation[] = [
  {
    _id: INV_DOWNTOWN_PATIENT_ID,
    token: INV_DOWNTOWN_PATIENT_TOKEN,
    organizationId: ORG_DOWNTOWN_ID,
    roleCode: PATIENT,
    createdBy: DEV_USER_ID,
    expiresAt: '2099-12-31T23:59:59.000Z',
    createdAt: FIXED_CREATED_AT,
  },
  {
    _id: INV_SUNRISE_PATIENT_ID,
    token: INV_SUNRISE_PATIENT_TOKEN,
    organizationId: ORG_SUNRISE_ID,
    roleCode: PATIENT,
    createdBy: DEV_USER_ID,
    expiresAt: '2099-12-31T23:59:59.000Z',
    createdAt: FIXED_CREATED_AT,
  },
];
