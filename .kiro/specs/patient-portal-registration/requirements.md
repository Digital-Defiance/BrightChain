# Requirements Document

## Introduction

This feature provides a complete, testable end-to-end workflow for registering a patient at an organization's patient portal. The existing infrastructure includes patient registration APIs, an invitation system, a patient registration UI, and the patient portal workspace. The gap is a streamlined developer/testing path that chains together: creating a patient under a provider at an organization, generating an invitation token, redeeming that token to register the patient, and verifying portal access. This spec covers a seed-and-script approach plus any missing glue to make the existing pieces work together for end-to-end testing.

## Glossary

- **Seed_Script**: A TypeScript script that populates the database with deterministic test data (organizations, roles, invitations) for development and testing purposes.
- **Organization**: A FHIR Organization resource stored in BrightDb representing a healthcare practice, clinic, or facility with an enrollment mode (`open` or `invite-only`).
- **Healthcare_Role**: A document in the `healthcare_roles` collection linking a BrightChain member to an Organization with a SNOMED CT role code (e.g., PHYSICIAN, PATIENT, ADMIN).
- **Patient_Resource**: A FHIR R4 Patient resource with BrightChain metadata, created via the MPI service when a member registers as a patient.
- **Invitation_Token**: A UUID-based token created by staff at an organization, scoped to a role code and organization, with a 7-day expiry, used for controlled onboarding.
- **Patient_Portal**: The patient workspace UI (`PatientPortal.tsx`) that locks the active patient to the authenticated user's own Patient resource and provides routes for health summary, appointments, results, and billing.
- **Provider_Role**: A Healthcare_Role with a practitioner role code (PHYSICIAN, DENTIST, etc.) that grants staff-level permissions at an Organization.
- **Enrollment_Mode**: A property on Organization controlling patient registration: `open` allows self-registration, `invite-only` requires a valid Invitation_Token.
- **ActiveContext**: The React context that holds the authenticated member, healthcare roles, active role, active patient, and active encounter for the BrightChart shell.
- **RoleSwitcher**: The UI component that allows a user to switch between their Healthcare_Roles, triggering ActiveContext updates.
- **Dev_User**: The deterministic test user identity used by the Seed_Script, resolved from the `MEMBER_ID` environment variable or falling back to `seed-dev-user-00000000-0000-0001`.

## Requirements

### Requirement 1: End-to-End Seed Scenario for Patient Portal Testing

**User Story:** As a developer, I want a single seed scenario that sets up a complete provider-patient-portal path, so that I can test the patient portal end-to-end without manual API calls.

#### Acceptance Criteria

1. WHEN the Seed_Script executes, THE Seed_Script SHALL create an Organization with Enrollment_Mode set to `invite-only` and an Organization with Enrollment_Mode set to `open`.
2. WHEN the Seed_Script executes, THE Seed_Script SHALL create a Provider_Role (PHYSICIAN) for the Dev_User at the `invite-only` Organization.
3. WHEN the Seed_Script executes, THE Seed_Script SHALL create a PATIENT Healthcare_Role for the Dev_User at the `open` Organization, including a valid `patientRef` pointing to the Dev_User's Patient_Resource.
4. WHEN the Seed_Script executes, THE Seed_Script SHALL create an unexpired Invitation_Token scoped to the PATIENT role at the `invite-only` Organization.
5. WHEN the Seed_Script executes, THE Seed_Script SHALL use deterministic IDs and timestamps so that repeated runs produce idempotent results.
6. IF the Seed_Script encounters an existing document with the same `_id`, THEN THE Seed_Script SHALL upsert the document rather than fail with a duplicate key error.

### Requirement 2: Patient Registration via Invitation Token

**User Story:** As a developer testing the patient portal, I want to register a patient at an invite-only organization using an invitation token, so that I can verify the full invite-only registration flow.

#### Acceptance Criteria

1. WHEN a valid Invitation_Token and Organization ID are submitted to `POST /brightchart/healthcare-roles/patient`, THE Healthcare_Role controller SHALL create a PATIENT Healthcare_Role for the authenticated member at the specified Organization.
2. WHEN a PATIENT Healthcare_Role is created, THE Healthcare_Role controller SHALL set the `patientRef` field to a reference to the member's Patient_Resource.
3. IF an expired Invitation_Token is submitted, THEN THE Healthcare_Role controller SHALL return HTTP 410 with error code `GONE` and a message indicating the invitation has expired.
4. IF an already-redeemed Invitation_Token is submitted, THEN THE Healthcare_Role controller SHALL return HTTP 410 with error code `GONE` and a message indicating the invitation has already been redeemed.
5. IF an Invitation_Token is submitted for an `open` Enrollment_Mode Organization, THEN THE Healthcare_Role controller SHALL ignore the token and register the patient directly.
6. WHEN a PATIENT Healthcare_Role is successfully created, THE Healthcare_Role controller SHALL return HTTP 201 with the created Healthcare_Role document in the response body.

### Requirement 3: Patient Registration via Open Enrollment

**User Story:** As a developer testing the patient portal, I want to register a patient at an open-enrollment organization without a token, so that I can verify the open enrollment registration flow.

#### Acceptance Criteria

1. WHEN an Organization ID for an `open` Enrollment_Mode Organization is submitted to `POST /brightchart/healthcare-roles/patient` without an Invitation_Token, THE Healthcare_Role controller SHALL create a PATIENT Healthcare_Role for the authenticated member.
2. WHEN a PATIENT Healthcare_Role is created via open enrollment, THE Healthcare_Role controller SHALL set the `patientRef` field to a reference to the member's Patient_Resource.
3. IF the authenticated member already has an active PATIENT Healthcare_Role at the specified Organization, THEN THE Healthcare_Role controller SHALL return HTTP 409 with error code `CONFLICT`.
4. IF the Organization is not found, THEN THE Healthcare_Role controller SHALL return HTTP 404 with an appropriate error message.

### Requirement 4: Staff-Initiated Patient Registration

**User Story:** As a provider at an organization, I want to register a patient on their behalf, so that I can onboard patients who cannot self-register.

#### Acceptance Criteria

1. WHEN a staff member submits a `targetMemberId` along with an Organization ID to `POST /brightchart/healthcare-roles/patient`, THE Healthcare_Role controller SHALL create a PATIENT Healthcare_Role for the target member at the specified Organization.
2. THE Healthcare_Role controller SHALL verify that the caller holds an active ADMIN or practitioner Provider_Role at the specified Organization before allowing staff-initiated registration.
3. IF the caller does not hold an active staff role at the Organization, THEN THE Healthcare_Role controller SHALL return HTTP 403 with a forbidden error message.
4. WHEN a staff-initiated PATIENT Healthcare_Role is created, THE Healthcare_Role controller SHALL bypass Enrollment_Mode checks since staff registration does not require an Invitation_Token.

### Requirement 5: Invitation Token Creation

**User Story:** As a provider or admin at an organization, I want to create invitation tokens for patients, so that I can control who registers at my invite-only organization.

#### Acceptance Criteria

1. WHEN a staff member submits an Organization ID and role code `116154003` (PATIENT) to `POST /brightchart/invitations`, THE Invitation controller SHALL create an Invitation_Token with a 7-day expiry.
2. THE Invitation controller SHALL verify that the caller holds an active ADMIN or practitioner Provider_Role at the specified Organization before allowing invitation creation.
3. WHEN an Invitation_Token is created, THE Invitation controller SHALL return HTTP 201 with the token value, Organization ID, role code, and expiry timestamp in the response body.
4. IF an invalid role code is submitted, THEN THE Invitation controller SHALL return HTTP 400 with a list of valid role codes.
5. IF the caller does not hold a staff role at the Organization, THEN THE Invitation controller SHALL return HTTP 403 with a forbidden error message.

### Requirement 6: Patient Portal Access After Registration

**User Story:** As a registered patient, I want to access the patient portal after registration, so that I can view my health information.

#### Acceptance Criteria

1. WHEN a member with an active PATIENT Healthcare_Role switches to that role via the RoleSwitcher, THE ActiveContext SHALL set `activePatientRef` to the `patient.reference` value from the Healthcare_Role.
2. WHEN the Patient_Portal mounts with a valid `activePatientRef`, THE Patient_Portal SHALL lock the `activePatient` to the authenticated user's own Patient_Resource and render the portal routes (health, appointments, results, billing).
3. IF the active role has no `patient.reference`, THEN THE Patient_Portal SHALL render the AccessDenied component.
4. WHEN the `useHealthcareRoles` hook fetches roles from `GET /brightchart/healthcare-roles`, THE hook SHALL return roles with `organization.display` populated from the Organization name and `patient.reference` populated for PATIENT roles.

### Requirement 7: Role Refresh After Patient Registration

**User Story:** As a user who just registered as a patient, I want my role list to update immediately, so that I can switch to the patient role without refreshing the page.

#### Acceptance Criteria

1. WHEN patient registration succeeds in the PatientRegistrationFlow component, THE PatientRegistrationFlow SHALL call `refetchRoles()` on the ActiveContext to trigger a re-fetch of Healthcare_Roles from the API.
2. WHEN `refetchRoles()` completes, THE `useHealthcareRoles` hook SHALL return the updated role list including the newly created PATIENT Healthcare_Role.
3. WHEN the updated role list is available, THE RoleSwitcher SHALL display the new PATIENT role as a selectable option.

### Requirement 8: CLI Test Script for End-to-End Verification

**User Story:** As a developer, I want a CLI script that exercises the full patient-portal registration flow against a running API, so that I can verify the end-to-end path works without using the UI.

#### Acceptance Criteria

1. THE CLI_Test_Script SHALL accept a base URL and optional authentication token as command-line arguments.
2. WHEN executed, THE CLI_Test_Script SHALL perform the following steps in sequence: create an Organization, assign a Provider_Role to the authenticated user, create an Invitation_Token for the PATIENT role, register a patient using the Invitation_Token, and fetch the user's Healthcare_Roles to verify the PATIENT role exists.
3. WHEN each step completes, THE CLI_Test_Script SHALL log the step name, HTTP status code, and relevant response data to stdout.
4. IF any step fails, THEN THE CLI_Test_Script SHALL log the error details and exit with a non-zero exit code.
5. WHEN all steps succeed, THE CLI_Test_Script SHALL log a summary confirming the patient portal registration path is functional and exit with exit code 0.
