# Requirements Document

## Introduction

This feature adds React UI components for Organization Role Management to the BrightChart EHR system. The backend API is fully implemented with endpoints for organization CRUD, healthcare role assignment, patient registration, and invitation management. This spec covers the user-facing components that consume those endpoints: organization creation, discovery/listing, settings management, member management, patient registration flows, invitation management, and staff assignment. All components live in the `brightchart-react-components` package and follow existing patterns using `useAuthenticatedApi`, `ActiveContext`, and Material UI.

## Glossary

- **Organization_UI**: The set of React components for creating, browsing, and managing Organizations in the BrightChart frontend.
- **Organization_List_Page**: A page component that displays a paginated, searchable list of active Organizations with their enrollment mode.
- **Organization_Create_Dialog**: A modal dialog component for creating a new Organization with a name and optional contact information.
- **Organization_Settings_Page**: An admin-only page component for updating an Organization's name, enrollment mode, and active status.
- **Members_Management_Page**: An admin-only page component for viewing Organization members grouped by role, assigning staff roles, and removing roles.
- **Patient_Registration_Flow**: A set of UI components that guide a BrightChain member through registering as a patient at an Organization, handling both open enrollment and invite-only flows.
- **Invitation_Management_Panel**: A UI panel for Organization admins and practitioners to create invitation tokens, view active invitations, and copy tokens to the clipboard.
- **Staff_Assignment_Form**: A form component for Organization admins to assign practitioner roles (Physician, Nurse, Medical Assistant, Dentist, Veterinarian, Admin) to BrightChain members.
- **Invitation_Redeem_Form**: A form component for BrightChain members to enter and redeem an invitation token.
- **API_Hook**: A custom React hook that wraps `useAuthenticatedApi` to call a specific backend endpoint and manage loading, error, and data states.
- **Active_Context**: The React context (`ActiveContextProvider`) that holds the authenticated member's active Healthcare_Role, organization name, and patient reference.
- **Role_Switcher**: The existing header component that displays the active Healthcare_Role and allows switching between roles.
- **Enrollment_Mode**: A per-Organization setting (`open` or `invite-only`) that determines whether patients can self-register.

## Requirements

### Requirement 1: Organization Creation Dialog

**User Story:** As a BrightChain member, I want a dialog to create a new organization, so that I can establish a practice directly from the UI.

#### Acceptance Criteria

1. WHEN a BrightChain member opens the Organization_Create_Dialog, THE Organization_UI SHALL display a form with a required name text field and optional contact information fields (phone, email, address).
2. WHEN the member submits the Organization_Create_Dialog with a valid name, THE Organization_UI SHALL send a POST request to `/brightchart/organizations` using the API_Hook and display a success message upon receiving a 201 response.
3. WHEN the backend returns a 201 response after organization creation, THE Organization_UI SHALL close the dialog, refresh the organization list, and trigger a refetch of the member's healthcare roles so the new ADMIN role appears in the Role_Switcher.
4. IF the member submits the Organization_Create_Dialog with an empty name field, THEN THE Organization_UI SHALL display an inline validation error on the name field and prevent form submission.
5. IF the backend returns a 400 validation error, THEN THE Organization_UI SHALL display the error message from the response body within the dialog.
6. WHILE the POST request is in progress, THE Organization_UI SHALL disable the submit button and display a loading indicator.

### Requirement 2: Organization Listing and Discovery Page

**User Story:** As a BrightChain member, I want to browse active organizations, so that I can find a practice to register at or discover organizations I belong to.

#### Acceptance Criteria

1. WHEN a BrightChain member navigates to the Organization_List_Page, THE Organization_UI SHALL send a GET request to `/brightchart/organizations` and display the results in a paginated list.
2. THE Organization_List_Page SHALL display each Organization's name and enrollment mode (shown as a chip or badge indicating "Open" or "Invite Only").
3. WHEN the member types in the search field, THE Organization_List_Page SHALL debounce the input by 300 milliseconds and send a GET request to `/brightchart/organizations?search={query}` to filter results by name.
4. WHEN the member clicks a pagination control, THE Organization_List_Page SHALL request the corresponding page from the API using the `page` and `limit` query parameters.
5. WHILE the API request is in progress, THE Organization_List_Page SHALL display a loading skeleton or spinner in place of the list content.
6. IF the API returns an empty result set, THEN THE Organization_List_Page SHALL display an empty state message indicating no organizations were found.
7. WHEN the member clicks on an Organization in the list, THE Organization_List_Page SHALL navigate to a detail view or show a contextual action menu with options to register as a patient (for open orgs) or enter an invitation token (for invite-only orgs).
8. THE Organization_List_Page SHALL include a button to open the Organization_Create_Dialog for creating a new organization.

### Requirement 3: Organization Settings Page (Admin Only)

**User Story:** As an Organization_Admin, I want a settings page for my organization, so that I can update the name, enrollment mode, and active status.

#### Acceptance Criteria

1. WHEN an Organization_Admin navigates to the Organization_Settings_Page for an Organization, THE Organization_UI SHALL send a GET request to `/brightchart/organizations/:id` and populate the form with the current name, enrollment mode, and active status.
2. WHEN the Organization_Admin modifies fields and submits the form, THE Organization_UI SHALL send a PUT request to `/brightchart/organizations/:id` with only the changed fields and display a success notification upon receiving a 200 response.
3. THE Organization_Settings_Page SHALL display the enrollment mode as a toggle or select control with options "Open" and "Invite Only", with a description explaining the effect of each mode.
4. THE Organization_Settings_Page SHALL display the active status as a toggle switch, with a warning message when the admin attempts to deactivate the organization.
5. IF the backend returns a 403 forbidden error, THEN THE Organization_UI SHALL display an access denied message and prevent further edits.
6. WHILE the PUT request is in progress, THE Organization_UI SHALL disable the submit button and display a loading indicator.
7. IF the backend returns a 400 or 404 error, THEN THE Organization_UI SHALL display the error message from the response body.

### Requirement 4: Organization Members Management Page (Admin Only)

**User Story:** As an Organization_Admin, I want to view and manage members at my organization, so that I can see who holds which roles, assign new staff, and remove roles.

#### Acceptance Criteria

1. WHEN an Organization_Admin navigates to the Members_Management_Page, THE Organization_UI SHALL send a GET request to `/brightchart/organizations/:id/members` and display the results grouped by role code, with each group showing the role display name as a section header.
2. THE Members_Management_Page SHALL display each member's identifier and role display name within the appropriate role group.
3. WHEN the Organization_Admin clicks a "Remove Role" action on a member's role entry, THE Organization_UI SHALL display a confirmation dialog, and upon confirmation send a DELETE request to `/brightchart/healthcare-roles/:roleId`.
4. IF the backend returns a 400 error with code `LAST_ADMIN` when removing a role, THEN THE Organization_UI SHALL display a message indicating the organization must retain at least one administrator.
5. WHEN a role is successfully removed, THE Members_Management_Page SHALL refresh the member list to reflect the change.
6. THE Members_Management_Page SHALL include a button to open the Staff_Assignment_Form for assigning new staff roles.
7. THE Members_Management_Page SHALL include a button to open the Invitation_Management_Panel for creating invitations.
8. IF the backend returns a 403 forbidden error, THEN THE Organization_UI SHALL display an access denied message instead of the member list.

### Requirement 5: Patient Registration Flow

**User Story:** As a BrightChain member, I want to register as a patient at an organization, so that I can access the Patient Portal scoped to that organization.

#### Acceptance Criteria

1. WHILE an Organization has Enrollment_Mode set to "open", WHEN a BrightChain member clicks "Register as Patient" on the Organization_List_Page, THE Patient_Registration_Flow SHALL send a POST request to `/brightchart/healthcare-roles/patient` with the organization ID and display a success message upon receiving a 201 response.
2. WHILE an Organization has Enrollment_Mode set to "invite-only", WHEN a BrightChain member clicks "Register" on the Organization_List_Page, THE Patient_Registration_Flow SHALL display the Invitation_Redeem_Form prompting the member to enter an invitation token.
3. WHEN the member submits the Invitation_Redeem_Form with a token, THE Patient_Registration_Flow SHALL send a POST request to `/brightchart/healthcare-roles/patient` with the organization ID and invitation token.
4. WHEN patient registration succeeds with a 201 response, THE Patient_Registration_Flow SHALL trigger a refetch of the member's healthcare roles so the new PATIENT role appears in the Role_Switcher.
5. IF the backend returns a 403 error with code `INVITATION_REQUIRED`, THEN THE Patient_Registration_Flow SHALL display a message indicating the organization requires an invitation and show the Invitation_Redeem_Form.
6. IF the backend returns a 409 conflict error, THEN THE Patient_Registration_Flow SHALL display a message indicating the member is already registered as a patient at the organization.
7. IF the backend returns a 410 gone error when redeeming an invitation, THEN THE Patient_Registration_Flow SHALL display a message indicating the invitation has expired or already been used.
8. WHILE the registration request is in progress, THE Patient_Registration_Flow SHALL disable the submit button and display a loading indicator.

### Requirement 6: Invitation Management Panel

**User Story:** As an Organization_Admin or Practitioner, I want to create and manage invitation tokens, so that I can onboard new staff or patients in a controlled manner.

#### Acceptance Criteria

1. WHEN an Organization_Admin or Practitioner opens the Invitation_Management_Panel, THE Organization_UI SHALL display a form with a role code selector (listing all valid role codes: Physician, Registered Nurse, Medical Assistant, Dentist, Veterinarian, Admin, Patient) and an optional target email field.
2. WHEN the user submits the invitation creation form, THE Organization_UI SHALL send a POST request to `/brightchart/invitations` with the organization ID, selected role code, and optional target email, and display the generated token upon receiving a 201 response.
3. WHEN the invitation token is displayed, THE Invitation_Management_Panel SHALL provide a "Copy to Clipboard" button that copies the token string to the system clipboard and displays a confirmation tooltip.
4. THE Invitation_Management_Panel SHALL display the expiration date of the created invitation (7 days from creation).
5. IF the backend returns a 403 forbidden error, THEN THE Invitation_Management_Panel SHALL display a message indicating the user does not have permission to create invitations at the organization.
6. IF the backend returns a 400 error with code `INVALID_ROLE_CODE`, THEN THE Invitation_Management_Panel SHALL display the error message listing valid role codes.
7. WHILE the POST request is in progress, THE Invitation_Management_Panel SHALL disable the submit button and display a loading indicator.

### Requirement 7: Staff Assignment Form (Admin Only)

**User Story:** As an Organization_Admin, I want to assign practitioner roles to BrightChain members, so that physicians, nurses, and other staff can access the clinical workspace at my organization.

#### Acceptance Criteria

1. WHEN an Organization_Admin opens the Staff_Assignment_Form, THE Organization_UI SHALL display a form with a member ID text field and a role code selector listing valid practitioner role codes (Physician, Registered Nurse, Medical Assistant, Dentist, Veterinarian, Admin).
2. WHEN the admin submits the Staff_Assignment_Form, THE Organization_UI SHALL send a POST request to `/brightchart/healthcare-roles/staff` with the member ID, role code, and organization ID.
3. WHEN the backend returns a 201 response, THE Staff_Assignment_Form SHALL display a success message, clear the form fields, and trigger a refresh of the Members_Management_Page.
4. IF the backend returns a 409 conflict error, THEN THE Staff_Assignment_Form SHALL display a message indicating the member already holds the selected role at the organization.
5. IF the backend returns a 400 error with code `INVALID_ROLE_CODE`, THEN THE Staff_Assignment_Form SHALL display the error message listing valid practitioner role codes.
6. IF the backend returns a 400 error with code `INACTIVE_ORGANIZATION`, THEN THE Staff_Assignment_Form SHALL display a message indicating the organization is not active.
7. IF the backend returns a 403 forbidden error, THEN THE Staff_Assignment_Form SHALL display an access denied message.
8. WHILE the POST request is in progress, THE Staff_Assignment_Form SHALL disable the submit button and display a loading indicator.

### Requirement 8: Invitation Redemption (Standalone)

**User Story:** As a BrightChain member, I want to redeem an invitation token directly, so that I can join an organization when I receive an invitation link or code outside of the organization listing flow.

#### Acceptance Criteria

1. WHEN a BrightChain member navigates to the invitation redemption route, THE Organization_UI SHALL display the Invitation_Redeem_Form with a single text field for the invitation token.
2. WHEN the member submits the Invitation_Redeem_Form, THE Organization_UI SHALL send a POST request to `/brightchart/invitations/redeem` with the token.
3. WHEN the backend returns a 201 response, THE Invitation_Redeem_Form SHALL display a success message indicating the role that was assigned and the organization name, and trigger a refetch of the member's healthcare roles.
4. IF the backend returns a 410 gone error, THEN THE Invitation_Redeem_Form SHALL display a message indicating the invitation has expired or already been redeemed.
5. WHILE the POST request is in progress, THE Invitation_Redeem_Form SHALL disable the submit button and display a loading indicator.

### Requirement 9: API Hooks for Organization Management

**User Story:** As a developer, I want reusable React hooks for all organization management API calls, so that components can share data-fetching logic and loading/error state management.

#### Acceptance Criteria

1. THE Organization_UI SHALL provide a `useOrganizations` hook that fetches the paginated organization list from `GET /brightchart/organizations` with support for search and pagination parameters, and exposes `data`, `loading`, `error`, and `refetch` properties.
2. THE Organization_UI SHALL provide a `useOrganization` hook that fetches a single organization from `GET /brightchart/organizations/:id` and exposes `data`, `loading`, `error`, and `refetch` properties.
3. THE Organization_UI SHALL provide a `useOrgMembers` hook that fetches organization members from `GET /brightchart/organizations/:id/members` and exposes `data` (grouped by role code), `loading`, `error`, and `refetch` properties.
4. THE Organization_UI SHALL provide mutation functions (or hooks) for `createOrganization`, `updateOrganization`, `assignStaff`, `registerPatient`, `createInvitation`, `redeemInvitation`, and `removeRole` that call the corresponding API endpoints and return the response data or error.
5. WHEN any API_Hook receives a 401 unauthorized response, THE Organization_UI SHALL defer to the existing authentication error handling in `useAuthenticatedApi`.

### Requirement 10: Navigation and Routing Integration

**User Story:** As a BrightChain member, I want organization management pages integrated into the application navigation, so that I can access them from the appropriate workspace.

#### Acceptance Criteria

1. THE Organization_UI SHALL add an "Organizations" route to the application that renders the Organization_List_Page, accessible to all authenticated members.
2. THE Organization_UI SHALL add organization settings and members management routes under the admin workspace, accessible only when the active role is ADMIN at the target organization.
3. THE Organization_UI SHALL add an invitation redemption route accessible to all authenticated members.
4. WHEN a member with an ADMIN role at an organization navigates to that organization's detail view, THE Organization_UI SHALL display navigation links to the Organization_Settings_Page and Members_Management_Page.
5. WHEN a member without an ADMIN role at an organization navigates to an admin-only route for that organization, THE Organization_UI SHALL display the AccessDenied component.

### Requirement 11: Role Refresh After Mutations

**User Story:** As a BrightChain member, I want the Role_Switcher to update immediately after I create an organization, register as a patient, or redeem an invitation, so that I can switch to my new role without refreshing the page.

#### Acceptance Criteria

1. WHEN an organization is successfully created (Requirement 1, criterion 3), THE Organization_UI SHALL call the `refetch` function from `useHealthcareRoles` to reload the member's roles from the API.
2. WHEN a patient registration succeeds (Requirement 5, criterion 4), THE Organization_UI SHALL call the `refetch` function from `useHealthcareRoles` to reload the member's roles from the API.
3. WHEN an invitation is successfully redeemed (Requirement 8, criterion 3), THE Organization_UI SHALL call the `refetch` function from `useHealthcareRoles` to reload the member's roles from the API.
4. WHEN the `useHealthcareRoles` refetch completes, THE Active_Context SHALL update the `healthcareRoles` array and the Role_Switcher SHALL display the newly added role.
