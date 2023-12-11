# Requirements Document

## Introduction

This feature adds integration and end-to-end tests for the Organization Role Management system implemented in the `brightchain-api-lib` and `brightchart-react-components` packages. The existing implementation has property-based unit tests covering individual controller handlers in isolation. These integration tests exercise multi-controller flows that span OrganizationController, HealthcareRoleController, and InvitationController working together against a shared in-memory database, verifying that the full lifecycle of organization creation, role assignment, invitation redemption, and role retrieval works correctly end-to-end. A separate test suite validates that the `useHealthcareRoles` hook correctly fetches from the live API shape and populates ActiveContext.

## Glossary

- **Integration_Test_Suite**: A Jest test file in `brightchain-api-lib` that exercises multi-controller flows by instantiating OrganizationController, HealthcareRoleController, and InvitationController against a shared in-memory BrightDb mock, calling handler methods sequentially to verify cross-controller data flow.
- **End_To_End_Flow**: A test scenario that creates an Organization, assigns a staff role, registers a patient, retrieves healthcare roles, and verifies the role data is correct — exercising the full lifecycle across all three controllers.
- **Invitation_Flow**: A test scenario that creates an invitation, redeems the invitation token, verifies the resulting healthcare role, and confirms that re-redemption returns a 410 gone error.
- **Hook_Integration_Test**: A Jest test in `brightchart-react-components` that verifies the `useHealthcareRoles` hook fetches from the API response shape matching HealthcareRoleController output and populates ActiveContext with the correct role data.
- **Shared_In_Memory_Db**: A single in-memory BrightDb mock instance shared across all three controllers within a test, enabling cross-controller data flow verification (documents inserted by one controller are visible to another).
- **Handler_Direct_Invocation**: The established testing pattern where controller handler methods are called directly with mock request objects, bypassing Express routing, to test business logic in isolation from HTTP transport.
- **OrganizationController**: The controller mounted at `/brightchart/organizations` providing CRUD for FHIR Organization resources.
- **HealthcareRoleController**: The controller mounted at `/brightchart/healthcare-roles` providing role retrieval, staff assignment, patient registration, and role removal.
- **InvitationController**: The controller mounted at `/brightchart/invitations` providing invitation creation and redemption.
- **ActiveContext**: The React context that holds the authenticated member's active healthcare role, organization name, and patient reference.

## Requirements

### Requirement 1: End-to-End Organization Lifecycle Flow

**User Story:** As a developer, I want an integration test that exercises the full organization lifecycle (create org → assign staff → register patient → retrieve roles → verify role data), so that I can verify all three controllers work together correctly with shared state.

#### Acceptance Criteria

1. WHEN the Integration_Test_Suite creates an Organization via OrganizationController, THEN assigns a staff role via HealthcareRoleController using the created Organization identifier, THE HealthcareRoleController SHALL successfully create the staff role with the correct organization reference.
2. WHEN the Integration_Test_Suite registers a patient via HealthcareRoleController at the Organization created in the same test, THE HealthcareRoleController SHALL successfully create a PATIENT role with the correct organization reference and patient reference.
3. WHEN the Integration_Test_Suite retrieves healthcare roles via HealthcareRoleController for a member who was assigned a staff role in the same test, THE response SHALL include the assigned role with organization.display populated from the Organization name stored by OrganizationController.
4. WHEN the Integration_Test_Suite retrieves healthcare roles for a member who holds roles at multiple Organizations created in the same test, THE response SHALL include all active roles across all Organizations with correct organization.display values for each.
5. WHEN the Integration_Test_Suite creates an Organization, THE auto-created ADMIN role SHALL be retrievable via HealthcareRoleController GET for the creating member, with organization.display matching the Organization name.

### Requirement 2: Invitation Lifecycle Flow

**User Story:** As a developer, I want an integration test that exercises the full invitation lifecycle (create invitation → redeem → verify role → attempt re-redeem), so that I can verify InvitationController and HealthcareRoleController work together correctly for invitation-based onboarding.

#### Acceptance Criteria

1. WHEN the Integration_Test_Suite creates an invitation via InvitationController for an Organization created via OrganizationController in the same test, THE InvitationController SHALL return a valid invitation token linked to the correct Organization and role code.
2. WHEN the Integration_Test_Suite redeems an invitation token via InvitationController, THE InvitationController SHALL create a healthcare role in the Shared_In_Memory_Db that is subsequently retrievable via HealthcareRoleController GET for the redeeming member.
3. WHEN the Integration_Test_Suite redeems an invitation token and then retrieves healthcare roles for the redeeming member, THE retrieved role SHALL have organization.display populated from the Organization name and the correct role code matching the invitation.
4. IF the Integration_Test_Suite attempts to redeem the same invitation token a second time, THEN THE InvitationController SHALL return a 410 gone status code with error code GONE.
5. WHEN the Integration_Test_Suite creates an invitation with role code PATIENT for an invite-only Organization, THEN redeems the invitation via the patient registration endpoint with the token, THE HealthcareRoleController SHALL create the PATIENT role and the role SHALL be retrievable via GET.

### Requirement 3: Cross-Controller Authorization Flow

**User Story:** As a developer, I want integration tests that verify authorization checks work correctly across controller boundaries, so that I can confirm that org admin guards and staff checks use the same shared role data.

#### Acceptance Criteria

1. WHEN the Integration_Test_Suite creates an Organization (granting the creator ADMIN role) and a second member attempts to assign staff via HealthcareRoleController at that Organization, THE HealthcareRoleController SHALL return a 403 forbidden error because the second member has no ADMIN role in the Shared_In_Memory_Db.
2. WHEN the Integration_Test_Suite creates an Organization and the ADMIN member assigns a staff role to a second member, THEN the second member attempts to create an invitation via InvitationController, THE InvitationController SHALL succeed because the second member holds a practitioner role in the Shared_In_Memory_Db.
3. WHEN the Integration_Test_Suite soft-deletes a member's ADMIN role via HealthcareRoleController, THEN that member attempts to update the Organization via OrganizationController, THE OrganizationController SHALL return a 403 forbidden error because the role's period.end is set.

### Requirement 4: useHealthcareRoles Hook API Integration

**User Story:** As a developer, I want tests that verify the useHealthcareRoles hook correctly consumes the API response shape produced by HealthcareRoleController and populates ActiveContext, so that I can confirm the frontend-backend contract is correct.

#### Acceptance Criteria

1. WHEN the Hook_Integration_Test mocks the API to return a response matching the HealthcareRoleController output shape (array of IHealthcareRole with organization.display populated), THE useHealthcareRoles hook SHALL populate ActiveContext with all returned roles.
2. WHEN the Hook_Integration_Test provides roles from the API response to ActiveContext, THE ActiveContext SHALL set activeOrganizationName to the organization.display of the initial role.
3. WHEN the Hook_Integration_Test provides multiple roles from the API response to ActiveContext and a role switch occurs, THE ActiveContext SHALL update activeOrganizationName and activePatientRef to reflect the newly selected role.
4. WHEN the Hook_Integration_Test mocks the API to return an empty array, THE useHealthcareRoles hook SHALL fall back to default roles with organization.display set to "Default Practice".

### Requirement 5: End-to-End Data Integrity Across Controllers

**User Story:** As a developer, I want property-based integration tests that verify data integrity is maintained when multiple controllers operate on the same shared database, so that I can catch subtle cross-controller data corruption issues.

#### Acceptance Criteria

1. FOR ALL valid sequences of (create org, assign N staff roles with distinct role codes, register M patients), THE HealthcareRoleController GET response for each member SHALL return exactly the roles assigned to that member, with no cross-contamination between members.
2. FOR ALL valid Organization names, WHEN the Integration_Test_Suite creates an Organization and retrieves roles for the admin member, THE organization.display field in the role response SHALL exactly match the Organization name provided at creation time.
3. FOR ALL valid invitation redemptions, THE healthcare role created by InvitationController redemption SHALL be indistinguishable (in the GET response) from a role created directly via HealthcareRoleController staff assignment, except for the createdBy field.
4. WHEN the Integration_Test_Suite creates multiple Organizations and assigns roles across them, THE Organization members listing (GET /:id/members) for each Organization SHALL include only roles belonging to that Organization, with no cross-Organization leakage.
