# Requirements Document

## Introduction

This feature provides a development-environment seeding mechanism for the Organization Role Management system. Currently, after spinning up the devcontainer, developers must manually create organizations, assign healthcare roles, and generate invitations through the API before they can test the UI or API flows. This seed script populates the BrightDb `organizations`, `healthcare_roles`, and `invitations` collections with representative sample data so that the Role Switcher, Active Context, patient registration, and invitation redemption flows are immediately testable. The seed is idempotent — running it multiple times produces the same result without creating duplicates.

## Glossary

- **Seed_Script**: A TypeScript module that inserts predefined development data into BrightDb collections. Executed via a `yarn` command.
- **Dev_User**: The BrightChain member identity available in the local devcontainer environment, used as the `createdBy` and `memberId` reference for seeded records.
- **BrightDb**: The project's database layer, accessed through `SchemaCollection` enum entries and the `db.collection()` API pattern.
- **Organization**: A FHIR Organization resource stored in the `organizations` BrightDb collection, as defined by `IOrganization` in `brightchart-lib`.
- **Healthcare_Role**: An `IHealthcareRole`-derived record stored in the `healthcare_roles` BrightDb collection, linking a member to an Organization with a SNOMED CT role code.
- **Invitation**: A time-limited, single-use token stored in the `invitations` BrightDb collection, as defined by `IInvitation` in `brightchart-lib`.
- **Seed_Data_Module**: A TypeScript file exporting the static seed data arrays (organizations, healthcare roles, invitations) with deterministic identifiers.
- **Idempotent_Upsert**: An insert-or-skip operation that checks for an existing record by `_id` before inserting, preventing duplicate entries on repeated runs.

## Requirements

### Requirement 1: Seed Script Entry Point

**User Story:** As a developer, I want a single yarn command to seed the development database with sample organizations, roles, and invitations, so that I can start testing immediately after setting up the devcontainer.

#### Acceptance Criteria

1. THE Seed_Script SHALL be executable via `yarn seed:org-roles` from the workspace root.
2. WHEN the Seed_Script is executed, THE Seed_Script SHALL connect to the local BrightDb instance using the same connection configuration as the development API server.
3. WHEN the Seed_Script completes successfully, THE Seed_Script SHALL log a summary indicating the number of organizations, healthcare roles, and invitations that were inserted or skipped.
4. IF the Seed_Script encounters a connection error, THEN THE Seed_Script SHALL log a descriptive error message and exit with a non-zero exit code.

### Requirement 2: Sample Organization Seeding

**User Story:** As a developer, I want pre-configured sample organizations with different enrollment modes, so that I can test both open-enrollment and invite-only registration flows without manual setup.

#### Acceptance Criteria

1. WHEN the Seed_Script is executed, THE Seed_Script SHALL insert at least three Organization records into the `organizations` collection: "Sunrise Family Practice" with enrollment mode `open`, "Downtown Dental Clinic" with enrollment mode `invite-only`, and "City Veterinary Hospital" with enrollment mode `open`.
2. THE seeded Organization records SHALL conform to the `ORGANIZATION_SCHEMA` with all required fields populated: `_id`, `name`, `active` (set to true), `enrollmentMode`, `createdBy` (set to the Dev_User identifier), `createdAt`, and `updatedAt`.
3. WHEN an Organization record with the same `_id` already exists in the collection, THE Seed_Script SHALL skip that record without modifying the existing data.

### Requirement 3: Sample Healthcare Role Seeding

**User Story:** As a developer, I want the dev user to have different healthcare roles at different organizations, so that I can test the Role Switcher, multi-organization context, and role-specific UI behavior.

#### Acceptance Criteria

1. WHEN the Seed_Script is executed, THE Seed_Script SHALL insert Healthcare_Role records linking the Dev_User to the seeded organizations: an ADMIN role (394572006) at "Sunrise Family Practice", a PHYSICIAN role (309343006) at "Downtown Dental Clinic", and a PATIENT role (116154003) at "City Veterinary Hospital".
2. THE seeded Healthcare_Role records SHALL conform to the `HEALTHCARE_ROLE_SCHEMA` with all required fields populated: `_id`, `memberId` (set to the Dev_User identifier), `roleCode`, `roleDisplay` (resolved from `ROLE_CODE_DISPLAY`), `organizationId` (referencing the corresponding seeded Organization), `period` (with `start` set and no `end`), `createdBy`, `createdAt`, and `updatedAt`.
3. WHEN a Healthcare_Role record with the same `_id` already exists in the collection, THE Seed_Script SHALL skip that record without modifying the existing data.
4. THE seeded ADMIN Healthcare_Role SHALL include a `practitionerRef` pointing to the Dev_User, and the seeded PATIENT Healthcare_Role SHALL include a `patientRef` pointing to the Dev_User.

### Requirement 4: Sample Invitation Seeding

**User Story:** As a developer, I want a pre-generated invitation token in the database, so that I can test the invitation redemption flow without first creating an invitation through the API.

#### Acceptance Criteria

1. WHEN the Seed_Script is executed, THE Seed_Script SHALL insert at least one Invitation record into the `invitations` collection, associated with the invite-only organization ("Downtown Dental Clinic"), with role code PATIENT (116154003) and a deterministic token value.
2. THE seeded Invitation record SHALL conform to the `INVITATION_SCHEMA` with all required fields populated: `_id`, `token`, `organizationId`, `roleCode`, `createdBy` (set to the Dev_User identifier), `expiresAt` (set to a date far in the future to avoid expiration during development), and `createdAt`.
3. THE seeded Invitation record SHALL have `usedBy` and `usedAt` unset, indicating the invitation is available for redemption.
4. WHEN an Invitation record with the same `_id` already exists in the collection, THE Seed_Script SHALL skip that record without modifying the existing data.

### Requirement 5: Idempotent Execution

**User Story:** As a developer, I want to run the seed script multiple times without creating duplicate data, so that I can safely re-run it after database resets or when onboarding new team members.

#### Acceptance Criteria

1. WHEN the Seed_Script is executed against a database that already contains all seeded records, THE Seed_Script SHALL skip all inserts and report that zero new records were created.
2. WHEN the Seed_Script is executed against a database that contains some but not all seeded records, THE Seed_Script SHALL insert only the missing records and skip the existing ones.
3. THE Seed_Script SHALL use deterministic `_id` values for all seeded records so that existence checks are consistent across runs.

### Requirement 6: Seed Data Module

**User Story:** As a developer, I want the seed data defined in a separate, importable TypeScript module, so that I can reference the same deterministic identifiers and values in integration tests and development utilities.

#### Acceptance Criteria

1. THE Seed_Data_Module SHALL export typed arrays of seed organizations, seed healthcare roles, and seed invitations, each conforming to the corresponding schema interface.
2. THE Seed_Data_Module SHALL export named constants for all deterministic identifiers (organization IDs, role IDs, invitation IDs, and the invitation token) so that tests and other scripts can reference them without hardcoding values.
3. THE Seed_Data_Module SHALL import role code constants and display names from `brightchart-lib/src/lib/roles/healthcareRoleCodes.ts` rather than duplicating the values.
4. THE Seed_Data_Module SHALL export a constant or function for the Dev_User member identifier, allowing it to be overridden for different environments.

### Requirement 7: Seed Script Logging

**User Story:** As a developer, I want clear console output when the seed script runs, so that I can verify what was inserted and diagnose any issues.

#### Acceptance Criteria

1. WHEN the Seed_Script inserts a record, THE Seed_Script SHALL log the collection name, record identifier, and a human-readable label (such as the organization name or role display).
2. WHEN the Seed_Script skips a record because it already exists, THE Seed_Script SHALL log that the record was skipped with its identifier.
3. WHEN the Seed_Script completes, THE Seed_Script SHALL log a summary line with counts: organizations inserted, organizations skipped, roles inserted, roles skipped, invitations inserted, invitations skipped.
