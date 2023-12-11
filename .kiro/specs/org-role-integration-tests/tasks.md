# Implementation Plan: Organization Role Integration Tests

## Overview

Create integration tests that exercise multi-controller flows across OrganizationController, HealthcareRoleController, and InvitationController using a shared in-memory database, plus hook integration tests for `useHealthcareRoles`. The implementation starts with a shared helpers module to eliminate duplication, then builds the property-based integration test file (11 properties), and finally the hook integration test file (4 example-based tests).

## Tasks

- [x] 1. Create shared integration test helpers module
  - [x] 1.1 Create `crossController.integration.helpers.ts` in `brightchain-api-lib/src/lib/controllers/api/brightchart/`
    - Extract and consolidate the `createInMemoryDb()` function from the existing property spec files (use the most complete version from `healthcareRoleController.property.spec.ts` which supports `$or`, `$ne`, `$exists`, `$gt`, `$regex/$options`, dot-notation, `find().skip().limit().toArray()`)
    - Export `createMockApplication(db)` that wires the in-memory DB to a mock `IBrightChainApplication`
    - Export `createIntegrationControllers(db?)` that instantiates all three controllers (`OrganizationController`, `HealthcareRoleController`, `InvitationController`) against a single shared DB and returns `{ db, orgHandlers, roleHandlers, invHandlers }`
    - Export typed handler interfaces: `OrgHandlers`, `RoleHandlers`, `InvHandlers`
    - Export helper functions: `createOrg`, `setEnrollmentMode`, `assignStaff`, `registerPatient`, `createInvitation`, `redeemInvitation`, `getMyRoles`
    - Export shared fast-check arbitraries: `memberIdArb`, `orgNameArb`, `validPractitionerCodeArb`, `validInvitationRoleCodeArb`, `enrollmentModeArb`
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 5.1, 5.2, 5.3, 5.4_

- [x] 2. Implement cross-controller integration property tests (Properties 1–5)
  - [x] 2.1 Create `crossController.integration.property.spec.ts` with Property 1: End-to-end lifecycle produces correct roles across controllers
    - Create the spec file in `brightchain-api-lib/src/lib/controllers/api/brightchart/`
    - Import helpers from `crossController.integration.helpers`
    - Implement Property 1: for any valid org name, admin, staff, and patient members, create org → assign staff → register patient → GET roles for each member; verify (a) auto-admin role retrievable for admin, (b) staff role has correct orgId, (c) PATIENT role has correct orgId and patientRef
    - Use `fc.asyncProperty` with `numRuns: 100`
    - Tag: `Feature: org-role-integration-tests, Property 1: End-to-end lifecycle produces correct roles across controllers`
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 2.2 Implement Property 2: Organization display name round-trip across controllers
    - For any set of org names and role assignments across multiple orgs, GET roles SHALL return each role with `organization.display` exactly matching the org name from creation
    - Tag: `Feature: org-role-integration-tests, Property 2: Organization display name round-trip across controllers`
    - _Requirements: 1.3, 1.4, 5.2_

  - [x] 2.3 Implement Property 3: Invitation redemption creates retrievable role with correct data
    - For any valid org, invitation role code, and redeeming member, create invitation → redeem → GET roles; verify role is retrievable with correct `organization.display` and `roleCode`
    - Tag: `Feature: org-role-integration-tests, Property 3: Invitation redemption creates retrievable role with correct data`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.4 Implement Property 4: Re-redemption of used invitation returns 410
    - For any valid invitation redeemed once, second redemption SHALL return 410 GONE with no additional role created
    - Tag: `Feature: org-role-integration-tests, Property 4: Re-redemption of used invitation returns 410`
    - _Requirements: 2.4_

  - [x] 2.5 Implement Property 5: Invite-only patient registration via invitation token
    - For any invite-only org with a PATIENT invitation, redeeming via patient registration endpoint SHALL create a PATIENT role retrievable via GET
    - Tag: `Feature: org-role-integration-tests, Property 5: Invite-only patient registration via invitation token`
    - _Requirements: 2.5_

- [x] 3. Checkpoint - Ensure backend integration tests pass for Properties 1–5
  - Run `yarn nx test brightchain-api-lib --testPathPatterns="crossController.integration"` and ensure all tests pass. Ask the user if questions arise.

- [x] 4. Implement cross-controller integration property tests (Properties 6–8)
  - [x] 4.1 Implement Property 6: Non-admin member gets 403 on cross-controller staff assignment
    - For any org and non-admin member, attempting staff assignment SHALL return 403, verifying authorization reads from shared DB
    - Tag: `Feature: org-role-integration-tests, Property 6: Non-admin member gets 403 on cross-controller staff assignment`
    - _Requirements: 3.1_

  - [x] 4.2 Implement Property 7: Practitioner staff can create invitations cross-controller
    - For any org where a member holds a practitioner role assigned via HealthcareRoleController, that member SHALL be able to create invitations via InvitationController
    - Tag: `Feature: org-role-integration-tests, Property 7: Practitioner staff can create invitations cross-controller`
    - _Requirements: 3.2_

  - [x] 4.3 Implement Property 8: Soft-deleted admin role blocks org update cross-controller
    - For any org with two admins, soft-deleting one admin's role via HealthcareRoleController SHALL cause OrganizationController to return 403 when that member attempts org update
    - Tag: `Feature: org-role-integration-tests, Property 8: Soft-deleted admin role blocks org update cross-controller`
    - _Requirements: 3.3_

- [x] 5. Implement cross-controller integration property tests (Properties 9–11)
  - [x] 5.1 Implement Property 9: No cross-contamination between members' roles
    - For any valid sequence of org creation, staff assignments, and patient registrations, GET roles for each member SHALL return exactly that member's roles with no cross-contamination
    - Tag: `Feature: org-role-integration-tests, Property 9: No cross-contamination between members' roles`
    - _Requirements: 5.1_

  - [x] 5.2 Implement Property 10: Invitation-created role indistinguishable from direct assignment in GET response
    - For any valid role code, a role created via invitation redemption SHALL match a role created via direct assignment in the GET response (same `roleCode`, `roleDisplay`, `organization.display`, reference fields), except `createdBy`
    - Tag: `Feature: org-role-integration-tests, Property 10: Invitation-created role indistinguishable from direct assignment in GET response`
    - _Requirements: 5.3_

  - [x] 5.3 Implement Property 11: Organization members listing scoped to org only
    - For any set of multiple orgs with roles assigned across them, GET /:id/members for each org SHALL include only roles belonging to that org
    - Tag: `Feature: org-role-integration-tests, Property 11: Organization members listing scoped to org only`
    - _Requirements: 5.4_

- [x] 6. Checkpoint - Ensure all backend integration tests pass
  - Run `yarn nx test brightchain-api-lib --testPathPatterns="crossController.integration"` and ensure all 11 property tests pass. Ask the user if questions arise.

- [x] 7. Implement useHealthcareRoles hook integration tests
  - [x] 7.1 Create `useHealthcareRoles.integration.spec.tsx` in `brightchart-react-components/src/lib/shell/__tests__/`
    - Set up the test file with the same mock pattern as the existing `useHealthcareRoles.spec.tsx` (mock `useAuth`, `useAuthenticatedApi`, `useBrightChartTranslation`)
    - Reuse the `makeApiRole`, `ActiveContextWrapper`, `ActiveContextReader`, and `HookRenderer` helper patterns from the existing spec
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.2 Implement test: API roles populate ActiveContext with all roles
    - Mock API to return roles matching HealthcareRoleController output shape; verify ActiveContext has all roles with `organization.display` populated
    - _Requirements: 4.1_

  - [x] 7.3 Implement test: ActiveContext sets activeOrganizationName from initial role
    - Verify ActiveContext sets `activeOrganizationName` to the `organization.display` of the initial role
    - _Requirements: 4.2_

  - [x] 7.4 Implement test: Role switch updates activeOrganizationName and activePatientRef
    - Provide multiple roles, trigger a role switch, verify `activeOrganizationName` and `activePatientRef` update to reflect the newly selected role
    - _Requirements: 4.3_

  - [x] 7.5 Implement test: Empty API response falls back to default roles
    - Mock API to return empty array; verify hook falls back to default roles with `organization.display` set to "Default Practice"
    - _Requirements: 4.4_

- [x] 8. Final checkpoint - Ensure all integration tests pass
  - Run `yarn nx test brightchain-api-lib --testPathPatterns="crossController.integration"` and `yarn nx test brightchart-react-components --testPathPatterns="useHealthcareRoles.integration"`. Ensure all tests pass, ask the user if questions arise.

## Notes

- All backend property tests use `fast-check` with `numRuns: 100` per property
- The shared helpers module eliminates the duplicated in-memory DB mock across the three existing property spec files
- Each property test creates a fresh shared DB instance per test run to ensure isolation
- Hook integration tests are example-based (not property-based) since they test React state management with fixed API shapes
- Run commands: `yarn nx test brightchain-api-lib --testPathPatterns="crossController.integration"` and `yarn nx test brightchart-react-components --testPathPatterns="useHealthcareRoles.integration"`
