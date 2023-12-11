# Implementation Plan: Patient Portal Registration

## Overview

Extend the existing seed data with a PATIENT role at Sunrise and a Sunrise invitation, then create a CLI test script that chains the patient-portal registration APIs together. Tests use fast-check (property-based) and Jest (unit) following existing patterns in `orgRoleSeedData.spec.ts`.

## Tasks

- [x] 1. Extend seed data with new patient role and invitation constants
  - [x] 1.1 Add new constants and seed records to `orgRoleSeedData.ts`
    - Add `ROLE_PATIENT_SUNRISE_ID`, `INV_SUNRISE_PATIENT_ID`, `INV_SUNRISE_PATIENT_TOKEN` constants
    - Add PATIENT role at Sunrise to `SEED_HEALTHCARE_ROLES` array with `patientRef: DEV_USER_ID`
    - Add Sunrise PATIENT invitation to `SEED_INVITATIONS` array with far-future expiry
    - Export all new constants
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.2 Write property test for extended seed data schema conformance
    - **Property 1: Patient registration creates a role with patientRef**
    - Extend existing property test in `orgRoleSeedData.spec.ts` to cover the new PATIENT role record has all `HEALTHCARE_ROLE_SCHEMA` required fields and `patientRef` is set
    - Extend existing invitation schema test to cover the new Sunrise invitation
    - Import new constants (`ROLE_PATIENT_SUNRISE_ID`, `INV_SUNRISE_PATIENT_ID`, `INV_SUNRISE_PATIENT_TOKEN`)
    - **Validates: Requirements 1.3, 1.4**

  - [x] 1.3 Write unit tests for new seed data records
    - Verify `SEED_HEALTHCARE_ROLES` now contains 4 roles (was 3)
    - Verify new PATIENT role at Sunrise has correct `roleCode`, `organizationId`, `patientRef`, and no `practitionerRef`
    - Verify `SEED_INVITATIONS` now contains 2 invitations (was 1)
    - Verify new Sunrise invitation has correct `organizationId`, `roleCode`, `token`, and far-future `expiresAt`
    - Verify new constants are deterministic strings matching expected values
    - _Requirements: 1.3, 1.4, 1.5_

- [x] 2. Checkpoint - Verify seed data changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create CLI test script for end-to-end verification
  - [x] 3.1 Create `scripts/test-patient-portal-flow.ts` with CLI argument parsing
    - Create the `scripts/` directory and new TypeScript file
    - Parse `--base-url` (required) and `--token` (optional, falls back to `AUTH_TOKEN` env var) CLI arguments
    - Define `TestStep` and `StepResult` interfaces
    - Implement `runStep` function using Node.js built-in `fetch`
    - Log step name + HTTP status code for each step to stdout
    - _Requirements: 8.1, 8.3_

  - [x] 3.2 Implement the test step pipeline in the CLI script
    - Define sequential test steps: create org → assign provider → create invitation → register patient → fetch roles → verify
    - Each step uses response data from previous steps (e.g., org ID from step 1 feeds into step 2)
    - Validate each response status code against expected value
    - On any failure, log error details and exit with non-zero code
    - On all-pass, log success summary and exit with code 0
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

  - [x] 3.3 Write property test for CLI step logger output
    - **Property 10: CLI step logger includes step name and status code**
    - For any generated step name (non-empty string) and HTTP status code (100–599), the log output contains both values
    - Extract the logging function as a testable pure function
    - Use fast-check to generate arbitrary step names and status codes
    - **Validates: Requirements 8.3**

  - [x] 3.4 Write unit tests for CLI script step execution logic
    - Test that `--base-url` and `--token` arguments are parsed correctly
    - Test that missing `--base-url` causes a non-zero exit
    - Test `runStep` with mocked `fetch` for success (expected status) and failure (unexpected status) cases
    - Test that the pipeline stops on first failure (fail-fast behavior)
    - Test exit code 0 when all steps pass, non-zero when any step fails
    - _Requirements: 8.1, 8.4, 8.5_

- [x] 4. Checkpoint - Verify CLI script and all tests
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The design uses TypeScript throughout — all code and tests use TypeScript
- Property tests use `fast-check` (already in the project) with minimum 100 iterations
- Unit tests use Jest following existing patterns in `orgRoleSeedData.spec.ts`
- The CLI script uses Node.js built-in `fetch` (Node 18+), no new dependencies
- Existing API controllers, UI components, and hooks are already implemented and verified — this spec only adds seed data and the CLI test script
- Run seed data tests via: `yarn nx test brightchain-api-lib --testPathPatterns="orgRoleSeedData"`
- Run CLI script tests via: `yarn nx test brightchain-api-lib --testPathPatterns="test-patient-portal-flow"` (or from the scripts test location)
