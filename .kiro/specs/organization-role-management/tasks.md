# Implementation Plan: Organization Role Management

## Overview

This plan implements FHIR Organization, Healthcare Role, and Invitation CRUD in the BrightChain API, replacing the hardcoded fallback in `useHealthcareRoles` with persisted, multi-organization role data. Implementation follows existing codebase patterns: `CollectionSchema` definitions in `brightchain-api-lib/src/lib/interfaces/storage/`, controllers extending `BaseController`, `routeConfig`-based route definitions, and `SchemaCollection` enum extension in `brightchain-node-express-suite`. All code is TypeScript.

## Tasks

- [x] 1. Extend SchemaCollection enum and define storage schemas
  - [x] 1.1 Add Organization, HealthcareRole, and Invitation entries to the SchemaCollection enum
    - Edit `brightchain-node-express-suite/src/lib/enumerations/schema-collection.ts`
    - Add `Organization = 'organizations'`, `HealthcareRole = 'healthcare_roles'`, `Invitation = 'invitations'`
    - _Requirements: 10.4_

  - [x] 1.2 Create the Organization collection schema
    - Create `brightchain-api-lib/src/lib/interfaces/storage/organizationSchema.ts`
    - Define `ORGANIZATION_SCHEMA: CollectionSchema` with fields: `_id`, `name`, `type`, `telecom`, `address`, `active`, `enrollmentMode`, `createdBy`, `createdAt`, `updatedAt`
    - Include indexes on `name` and `active`
    - Import `CollectionSchema` from `./document-types`
    - _Requirements: 10.1, 1.4_

  - [x] 1.3 Create the Healthcare Role collection schema
    - Create `brightchain-api-lib/src/lib/interfaces/storage/healthcareRoleSchema.ts`
    - Define `HEALTHCARE_ROLE_SCHEMA: CollectionSchema` with fields: `_id`, `memberId`, `roleCode`, `roleDisplay`, `specialty`, `organizationId`, `practitionerRef`, `patientRef`, `period`, `createdBy`, `createdAt`, `updatedAt`
    - Include indexes on `memberId`, `organizationId`, and unique compound index on `(memberId, roleCode, organizationId)`
    - _Requirements: 10.2_

  - [x] 1.4 Create the Invitation collection schema
    - Create `brightchain-api-lib/src/lib/interfaces/storage/invitationSchema.ts`
    - Define `INVITATION_SCHEMA: CollectionSchema` with fields: `_id`, `token`, `organizationId`, `roleCode`, `targetEmail`, `createdBy`, `expiresAt`, `usedBy`, `usedAt`, `createdAt`
    - Include unique index on `token`, indexes on `organizationId` and `expiresAt`
    - _Requirements: 10.3_

  - [x] 1.5 Write unit tests for schema definitions
    - Verify each schema has all required fields, correct types, and expected indexes
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 2. Define shared interfaces and DTOs in brightchart-lib
  - [x] 2.1 Create IOrganization interface
    - Create `brightchart-lib/src/lib/organizations/organization.ts`
    - Define `IOrganization` with fields from the design: `_id`, `name`, `type`, `telecom`, `address`, `active`, `enrollmentMode`, `createdBy`, `createdAt`, `updatedAt`
    - Use existing FHIR datatypes (`ICodeableConcept`, `IContactPoint`, `IAddress`) from `brightchart-lib/src/lib/fhir/datatypes.ts`
    - _Requirements: 1.4, 10.1_

  - [x] 2.2 Create IInvitation interface
    - Create `brightchart-lib/src/lib/organizations/invitation.ts`
    - Define `IInvitation` with fields: `_id`, `token`, `organizationId`, `roleCode`, `targetEmail`, `createdBy`, `expiresAt`, `usedBy`, `usedAt`, `createdAt`
    - _Requirements: 10.3, 5.1_

  - [x] 2.3 Create IHealthcareRoleDocument interface
    - Create `brightchart-lib/src/lib/roles/healthcareRoleDocument.ts`
    - Define `IHealthcareRoleDocument` extending the stored document shape: `_id`, `memberId`, `roleCode`, `roleDisplay`, `specialty`, `organizationId`, `practitionerRef`, `patientRef`, `period`, `createdBy`, `createdAt`, `updatedAt`
    - _Requirements: 10.2_

  - [x] 2.4 Create request/response DTO interfaces
    - Create `brightchart-lib/src/lib/organizations/organizationDtos.ts`
    - Define `ICreateOrganizationRequest`, `IUpdateOrganizationRequest`, `IAssignStaffRequest`, `IRegisterPatientRequest`, `ICreateInvitationRequest`, `IRedeemInvitationRequest`
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 5.3_

  - [x] 2.5 Export all new interfaces from brightchart-lib barrel
    - Update `brightchart-lib/src/index.ts` (or relevant barrel file) to export the new interfaces
    - _Requirements: 1.4, 10.1, 10.2, 10.3_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement OrganizationController
  - [x] 4.1 Create the OrganizationController class
    - Create `brightchain-api-lib/src/lib/controllers/api/brightchart/organizationController.ts`
    - Extend `BaseController` following the `AdminUserController` pattern with `routeConfig`, `TypedHandlers`, and handler methods
    - Define handler interface with: `createOrganization`, `listOrganizations`, `getOrganization`, `updateOrganization`, `listOrgMembers`
    - Wire `initRouteDefinitions` with `useAuthentication: true` for all routes
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.4, 8.1, 8.2, 8.3, 8.4_

  - [x] 4.2 Implement POST / — Create organization handler
    - Validate required `name` field (return 400 if missing)
    - Generate UUID `_id`, set `active=true`, `enrollmentMode='open'`, timestamps
    - Insert into `organizations` collection via BrightDb
    - Auto-create ADMIN healthcare role (code `394572006`) for the creating member in `healthcare_roles` collection
    - Return created organization in `{ success: true, data }` envelope
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 4.3 Implement GET / — List organizations handler
    - Query `organizations` collection for `active: true`
    - Support `?search=` query param for case-insensitive partial name match
    - Support `?page=` and `?limit=` for pagination
    - Include `enrollmentMode` in response
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 4.4 Implement GET /:id — Get single organization handler
    - Fetch organization by `_id`, return 404 if not found
    - _Requirements: 8.1_

  - [x] 4.5 Implement PUT /:id — Update organization handler
    - Call `orgAdminGuard` to verify caller is org admin (403 if not)
    - Update only specified fields, preserve others, advance `updatedAt`
    - Handle `active=false` to mark org inactive
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.6 Implement GET /:id/members — List org members handler
    - Call `orgAdminGuard` to verify caller is org admin
    - Query `healthcare_roles` for active roles at this org (no `period.end` or `period.end` in future)
    - Group results by `roleCode`
    - _Requirements: 8.4_

  - [x] 4.7 Write property test: Organization creation produces complete record with auto-admin
    - **Property 1: Organization creation produces a complete record with auto-admin**
    - **Validates: Requirements 1.1, 1.2, 1.4, 3.5**

  - [x] 4.8 Write property test: Organization update preserves unchanged fields
    - **Property 2: Organization update preserves unchanged fields**
    - **Validates: Requirements 2.1**

  - [x] 4.9 Write property test: Organization listing returns only active orgs with search filtering
    - **Property 15: Organization listing returns only active orgs with search filtering**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 5. Implement orgAdminGuard middleware
  - [x] 5.1 Create the orgAdminGuard function
    - Create `brightchain-api-lib/src/lib/middlewares/orgAdminGuard.ts`
    - Accept `req`, `res`, `next`, `db`, and `organizationId` parameters
    - Query `healthcare_roles` for an active ADMIN role (code `394572006`) where `memberId` matches the authenticated member and `organizationId` matches the target org
    - Return 403 if no matching active admin role found
    - _Requirements: 2.4, 3.4, 5.6, 7.2_

  - [x] 5.2 Write property test: Org-scoped mutation authorization
    - **Property 3: Org-scoped mutation authorization**
    - **Validates: Requirements 2.4, 3.4, 5.6, 7.2**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement HealthcareRoleController
  - [x] 7.1 Create the HealthcareRoleController class
    - Create `brightchain-api-lib/src/lib/controllers/api/brightchart/healthcareRoleController.ts`
    - Extend `BaseController` with handlers: `getMyRoles`, `assignStaff`, `registerPatient`, `removeRole`
    - Wire `initRouteDefinitions` with `useAuthentication: true`
    - _Requirements: 6.1, 3.1, 4.1, 7.1_

  - [x] 7.2 Implement GET / — Get my healthcare roles handler
    - Query `healthcare_roles` by `memberId` matching authenticated member
    - Filter out roles with `period.end` in the past
    - For each role, resolve `organizationId` against `organizations` collection to populate `organization.display`
    - Map stored documents to `IHealthcareRole` shape (with `organization`, `practitioner`, `patient` references)
    - Return empty array with 200 if no roles found
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.3 Implement POST /staff — Assign staff role handler
    - Call `orgAdminGuard` to verify caller is org admin
    - Validate `roleCode` against recognized SNOMED CT practitioner codes (return 400 with valid codes if invalid)
    - Validate target org is active (return 400 if inactive)
    - Check for duplicate `(memberId, roleCode, organizationId)` (return 409 if exists)
    - Create healthcare role document with `practitionerRef`, `period.start`, timestamps
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 2.5_

  - [x] 7.4 Implement POST /patient — Register patient handler
    - If request includes `targetMemberId` and caller is admin/practitioner at org: staff-initiated registration (bypass enrollment mode)
    - If self-registration: check org `enrollmentMode` — allow if `open`, reject with 403 if `invite-only` and no valid invitation token
    - If invitation token provided: validate and redeem it (mark as used)
    - Check for duplicate patient role (return 409)
    - Create healthcare role with `roleCode=PATIENT`, `patientRef`, `period.start`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 2.2, 2.3_

  - [x] 7.5 Implement DELETE /:id — Remove role handler
    - Call `orgAdminGuard` to verify caller is org admin
    - Verify role exists and belongs to the org (return 404 if not)
    - Check if this is the last ADMIN role at the org (return 400 if so)
    - Soft-delete by setting `period.end` to current timestamp
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 7.6 Write property test: Enrollment mode governs patient self-registration
    - **Property 4: Enrollment mode governs patient self-registration**
    - **Validates: Requirements 2.2, 2.3, 4.1, 4.3**

  - [x] 7.7 Write property test: Inactive organizations reject new role assignments
    - **Property 5: Inactive organizations reject new role assignments**
    - **Validates: Requirements 2.5**

  - [x] 7.8 Write property test: Staff role creation with valid SNOMED CT codes
    - **Property 6: Staff role creation with valid SNOMED CT codes**
    - **Validates: Requirements 3.1, 3.2, 3.5**

  - [x] 7.9 Write property test: Duplicate role detection
    - **Property 7: Duplicate role detection**
    - **Validates: Requirements 3.3, 4.5**

  - [x] 7.10 Write property test: Staff-initiated patient registration bypasses enrollment mode
    - **Property 8: Staff-initiated patient registration bypasses enrollment mode**
    - **Validates: Requirements 4.4**

  - [x] 7.11 Write property test: Healthcare role retrieval returns active roles with populated org names
    - **Property 12: Healthcare role retrieval returns active roles with populated org names**
    - **Validates: Requirements 6.1, 6.2, 6.4**

  - [x] 7.12 Write property test: Role soft-delete sets period.end
    - **Property 13: Role soft-delete sets period.end**
    - **Validates: Requirements 7.1**

  - [x] 7.13 Write property test: Last admin guard
    - **Property 14: Last admin guard**
    - **Validates: Requirements 7.4**

  - [x] 7.14 Write property test: Multi-organization and multi-role coexistence
    - **Property 16: Multi-organization and multi-role coexistence**
    - **Validates: Requirements 9.1, 9.2**

  - [x] 7.15 Write property test: Organization members listing grouped by role code
    - **Property 17: Organization members listing grouped by role code**
    - **Validates: Requirements 8.4**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement InvitationController
  - [x] 9.1 Create the InvitationController class
    - Create `brightchain-api-lib/src/lib/controllers/api/brightchart/invitationController.ts`
    - Extend `BaseController` with handlers: `createInvitation`, `redeemInvitation`
    - Wire `initRouteDefinitions` with `useAuthentication: true`
    - _Requirements: 5.1, 5.3_

  - [x] 9.2 Implement POST / — Create invitation handler
    - Verify caller holds ADMIN or practitioner role at the org (403 if not)
    - Validate `roleCode` is a recognized SNOMED CT code
    - Generate unique token (e.g. `crypto.randomUUID()`)
    - Set `expiresAt` to 7 days from now
    - Insert into `invitations` collection
    - Return the token
    - _Requirements: 5.1, 5.2, 5.6_

  - [x] 9.3 Implement POST /redeem — Redeem invitation handler
    - Look up invitation by `token`
    - Return 410 if already used (`usedBy` is set) or expired (`expiresAt` in the past)
    - Mark invitation as used: set `usedBy` and `usedAt`
    - Create the corresponding healthcare role based on `roleCode`
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 9.4 Write property test: Invitation creation invariants
    - **Property 9: Invitation creation invariants**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 9.5 Write property test: Invitation redemption marks as used
    - **Property 10: Invitation redemption marks as used**
    - **Validates: Requirements 5.3**

  - [x] 9.6 Write property test: Used or expired invitations are rejected
    - **Property 11: Used or expired invitations are rejected**
    - **Validates: Requirements 5.4, 5.5**

- [x] 10. Create BrightChartRouter and mount controllers in ApiRouter
  - [x] 10.1 Create BrightChartRouter
    - Create `brightchain-api-lib/src/lib/routers/brightchart.ts`
    - Extend `BaseRouter`, instantiate `OrganizationController`, `HealthcareRoleController`, `InvitationController`
    - Mount: `/organizations` → OrganizationController, `/healthcare-roles` → HealthcareRoleController, `/invitations` → InvitationController
    - _Requirements: 6.1, 8.1_

  - [x] 10.2 Mount BrightChartRouter in ApiRouter
    - Edit `brightchain-api-lib/src/lib/routers/api.ts`
    - Import and instantiate `BrightChartRouter`
    - Mount at `/brightchart`: `this.router.use('/brightchart', brightchartRouter.router)`
    - _Requirements: 6.1_

- [x] 11. Wire frontend useHealthcareRoles to live API
  - [x] 11.1 Update useHealthcareRoles to consume live API response
    - Edit `brightchart-react-components/src/lib/shell/hooks/useHealthcareRoles.ts`
    - The hook already calls `GET /brightchart/healthcare-roles` and falls back to defaults
    - Ensure the API response shape (`IHealthcareRole[]` with `organization.display` populated) maps correctly to the existing `IHealthcareRole` interface consumed by `ActiveContext` and `RoleSwitcher`
    - Verify the fallback path still works when the API returns no roles
    - _Requirements: 6.1, 6.2, 9.3, 9.4_

  - [x] 11.2 Write unit tests for useHealthcareRoles API integration
    - Test that roles from API response populate ActiveContext correctly
    - Test that RoleSwitcher renders "roleDisplay — organization.display" for each role
    - Test fallback behavior when API returns empty array
    - _Requirements: 9.3, 9.4_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use `fast-check` and validate universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- All controllers follow the existing `BaseController` + `routeConfig` + `TypedHandlers` pattern used throughout `brightchain-api-lib`
- Schemas follow the `CollectionSchema` pattern in `brightchain-api-lib/src/lib/interfaces/storage/`
- Shared interfaces go in `brightchart-lib`, API-specific code in `brightchain-api-lib`
