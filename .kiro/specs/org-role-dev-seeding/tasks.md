# Implementation Plan: Organization Role Dev Seeding

## Overview

This plan implements a development-environment seed script that populates BrightDb `organizations`, `healthcare_roles`, and `invitations` collections with representative sample data. The seed data module lives in `brightchain-api-lib` for reuse by tests and dev utilities. The CLI entry point is an Nx application under `tools/seed-org-roles`, following the same bootstrap pattern as `brightchain-inituserdb`. All code is TypeScript; the package manager is yarn.

## Tasks

- [x] 1. Create the seed data module
  - [x] 1.1 Create `brightchain-api-lib/src/lib/seed/orgRoleSeedData.ts`
    - Export deterministic ID constants: `DEV_USER_ID`, `ORG_SUNRISE_ID`, `ORG_DOWNTOWN_ID`, `ORG_CITYVET_ID`, `ROLE_ADMIN_SUNRISE_ID`, `ROLE_PHYSICIAN_DOWNTOWN_ID`, `ROLE_PATIENT_CITYVET_ID`, `INV_DOWNTOWN_PATIENT_ID`, `INV_DOWNTOWN_PATIENT_TOKEN`
    - Export `getDevUserId()` that returns `process.env.MEMBER_ID ?? DEV_USER_ID`
    - Import `ADMIN`, `PHYSICIAN`, `PATIENT`, `ROLE_CODE_DISPLAY` from `@brightchain/brightchart-lib` — do NOT duplicate SNOMED CT codes
    - Export typed `SEED_ORGANIZATIONS: IOrganization[]` with three orgs: Sunrise (open), Downtown (invite-only), City Vet (open) — all fields per `ORGANIZATION_SCHEMA` required list
    - Export typed `SEED_HEALTHCARE_ROLES: IHealthcareRoleDocument[]` with three roles: ADMIN@Sunrise (with `practitionerRef`), PHYSICIAN@Downtown (with `practitionerRef`), PATIENT@CityVet (with `patientRef`) — all fields per `HEALTHCARE_ROLE_SCHEMA` required list
    - Export typed `SEED_INVITATIONS: IInvitation[]` with one invitation for Downtown Dental, PATIENT role, `expiresAt` = `2099-12-31T23:59:59.000Z`, `usedBy`/`usedAt` unset
    - Use fixed ISO timestamps for `createdAt`/`updatedAt` (no `new Date()` at runtime)
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.4, 4.1, 4.2, 4.3, 5.3, 6.1, 6.2, 6.3, 6.4_

  - [x] 1.2 Export seed data module from `brightchain-api-lib` barrel
    - Add re-export in the appropriate barrel/index file so consumers can import from `@brightchain/brightchain-api-lib`
    - _Requirements: 6.1, 6.2_

  - [x] 1.3 Write property test: Seed record schema conformance (Property 1)
    - **Property 1: Seed record schema conformance**
    - For any seed record in the seed data arrays, all required fields defined in the corresponding `CollectionSchema` SHALL be present and non-null/non-undefined
    - Validate `SEED_ORGANIZATIONS` against `ORGANIZATION_SCHEMA.required`, `SEED_HEALTHCARE_ROLES` against `HEALTHCARE_ROLE_SCHEMA.required`, `SEED_INVITATIONS` against `INVITATION_SCHEMA.required`
    - Test file: `brightchain-api-lib/src/lib/seed/orgRoleSeedData.spec.ts`
    - Run: `yarn nx test brightchain-api-lib --testPathPatterns orgRoleSeedData`
    - **Validates: Requirements 2.2, 3.2, 4.2**

  - [x] 1.4 Write property test: Deterministic identifiers are stable across accesses (Property 3)
    - **Property 3: Deterministic identifiers are stable across accesses**
    - Access seed data module N times (fast-check integer N ∈ [2, 50]), verify all exported `_id` values, the invitation token, and the dev user ID are identical strings across every access
    - Test file: `brightchain-api-lib/src/lib/seed/orgRoleSeedData.spec.ts`
    - Run: `yarn nx test brightchain-api-lib --testPathPatterns orgRoleSeedData`
    - **Validates: Requirements 5.3**

  - [x] 1.5 Write unit tests for seed data module
    - Verify three organizations with correct names and enrollment modes (Req 2.1)
    - Verify ADMIN role at Sunrise has `practitionerRef`, PHYSICIAN at Downtown, PATIENT at City Vet has `patientRef` (Req 3.1, 3.4)
    - Verify invitation is unredeemed with far-future expiry and PATIENT role code (Req 4.1, 4.3)
    - Verify role codes match imported constants from `brightchart-lib` (Req 6.3)
    - Verify `getDevUserId()` returns default and respects `MEMBER_ID` env var (Req 6.4)
    - Test file: `brightchain-api-lib/src/lib/seed/orgRoleSeedData.spec.ts`
    - Run: `yarn nx test brightchain-api-lib --testPathPatterns orgRoleSeedData`
    - _Requirements: 2.1, 3.1, 3.4, 4.1, 4.3, 6.3, 6.4_

- [x] 2. Implement the SeedLogger interface and ConsoleSeedLogger
  - [x] 2.1 Create `brightchain-api-lib/src/lib/seed/orgRoleSeedRunner.ts` with SeedLogger interface and ConsoleSeedLogger
    - Define `SeedLogger` interface with methods: `inserted(collection, id, label)`, `skipped(collection, id)`, `summary(result)`, `error(message, err?)`
    - Define `SeedResult` interface with `{ organizations: { inserted, skipped }, healthcareRoles: { inserted, skipped }, invitations: { inserted, skipped } }`
    - Implement `ConsoleSeedLogger` class that writes to `console.log` / `console.error`
    - Summary format: include exact inserted/skipped counts for each collection
    - _Requirements: 1.3, 7.1, 7.2, 7.3_

  - [x] 2.2 Write property test: Summary log contains correct counts (Property 4)
    - **Property 4: Summary log contains correct counts**
    - Generate random inserted/skipped count tuples via fast-check, construct a `SeedResult`, call `ConsoleSeedLogger.summary()`, verify the output string contains the exact counts for all three collections
    - Test file: `brightchain-api-lib/src/lib/seed/orgRoleSeedRunner.spec.ts`
    - Run: `yarn nx test brightchain-api-lib --testPathPatterns orgRoleSeedRunner`
    - **Validates: Requirements 1.3, 7.3**

  - [x] 2.3 Write property test: Operation log contains record identifier and action (Property 5)
    - **Property 5: Operation log contains record identifier and action**
    - Generate random record metadata (id string, collection name, label) via fast-check, call `ConsoleSeedLogger.inserted()` and `ConsoleSeedLogger.skipped()`, verify log output contains the record `_id`, and for inserts also contains the collection name and label
    - Test file: `brightchain-api-lib/src/lib/seed/orgRoleSeedRunner.spec.ts`
    - Run: `yarn nx test brightchain-api-lib --testPathPatterns orgRoleSeedRunner`
    - **Validates: Requirements 7.1, 7.2**

- [x] 3. Implement the seed runner function
  - [x] 3.1 Implement `seedOrgRoles(db, logger?)` in `brightchain-api-lib/src/lib/seed/orgRoleSeedRunner.ts`
    - Implement `upsertRecord` helper: `findOne({ _id })` → if found skip, else `insertOne`
    - Seed in order: organizations → healthcare roles → invitations
    - Access collections via `db.collection(SchemaCollection.Organization)`, `db.collection(SchemaCollection.HealthcareRole)`, `db.collection(SchemaCollection.Invitation)`
    - Track inserted/skipped counts per collection, return `SeedResult`
    - Call `logger.inserted()` / `logger.skipped()` for each record
    - Call `logger.summary()` at the end
    - Default to `ConsoleSeedLogger` if no logger provided
    - _Requirements: 1.3, 2.3, 3.3, 4.4, 5.1, 5.2, 7.1, 7.2, 7.3_

  - [x] 3.2 Write property test: Idempotent upsert preserves existing data (Property 2)
    - **Property 2: Idempotent upsert preserves existing data**
    - Generate random subsets of seed records as "pre-existing" via fast-check, mock `findOne` to return truthy for pre-existing IDs and null for others, mock `insertOne`, run `seedOrgRoles`, verify: only missing records get `insertOne` called, pre-existing records are untouched, inserted + skipped = total seed count
    - Test file: `brightchain-api-lib/src/lib/seed/orgRoleSeedRunner.spec.ts`
    - Run: `yarn nx test brightchain-api-lib --testPathPatterns orgRoleSeedRunner`
    - **Validates: Requirements 2.3, 3.3, 4.4, 5.1, 5.2**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create the CLI entry point and Nx project
  - [x] 5.1 Scaffold the `tools/seed-org-roles` Nx application
    - Create `tools/seed-org-roles/src/main.ts` as the CLI entry point
    - Create `tools/seed-org-roles/project.json` following the `brightchain-inituserdb` pattern (esbuild executor, node platform, `serve` target with `@nx/js:node`)
    - Create `tools/seed-org-roles/tsconfig.json`, `tools/seed-org-roles/tsconfig.app.json`
    - Add `tools/seed-org-roles` to root `package.json` workspaces array if not already covered by `"tools"` glob
    - _Requirements: 1.1_

  - [x] 5.2 Implement `main.ts` — bootstrap, seed, exit
    - Call `configureBrightChainApp` with `skipAutoSeed: true`
    - Connect `BrightChainDatabasePlugin`
    - Call `seedOrgRoles(plugin.brightDb)` with `ConsoleSeedLogger`
    - On success: log summary, disconnect, `process.exit(0)`
    - On error: log `[seed:org-roles] ERROR: <description>`, disconnect, `process.exit(1)`
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 5.3 Add `seed:org-roles` script to root `package.json`
    - Add `"seed:org-roles": "npx nx run tools-seed-org-roles:serve"` to the `scripts` section
    - _Requirements: 1.1_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use `fast-check` (already in devDependencies) and validate universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- The seed data module is in `brightchain-api-lib` (Node.js-specific) per workspace conventions
- The CLI entry point follows the `brightchain-inituserdb` Nx project pattern
- Use `yarn nx test brightchain-api-lib --testPathPatterns <pattern>` to run targeted tests
