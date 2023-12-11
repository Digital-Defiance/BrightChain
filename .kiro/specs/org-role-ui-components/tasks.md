# Implementation Plan: Organization Role UI Components

## Overview

Implement the React UI layer for Organization Role Management in `brightchart-react-components/src/lib/organizations/`. This includes a typed API service client (following the `createEmailApiClient` pattern), reusable query hooks, 8 page/dialog components using Material UI, routing with admin guards, and role refresh wiring through `ActiveContext`. All components consume the existing backend API endpoints and shared DTOs from `brightchart-lib`.

## Tasks

- [x] 1. Create API service layer and `useOrgApi` hook
  - [x] 1.1 Create `organizations/services/orgApi.ts` with `createOrgApiClient` factory
    - Implement `handleApiCall` wrapper (or import from shared location) for `IApiEnvelope` unwrapping
    - Implement all typed methods: `listOrganizations`, `getOrganization`, `createOrganization`, `updateOrganization`, `getOrgMembers`, `assignStaff`, `registerPatient`, `removeRole`, `createInvitation`, `redeemInvitation`
    - Export `OrgListParams`, `OrgListResponse`, `OrgMembersResponse` interfaces
    - Export `OrgApiClient` type alias
    - Follow the `createEmailApiClient` pattern from `brightmail-react-components`
    - _Requirements: 9.4, 9.5_

  - [x] 1.2 Create `organizations/hooks/useOrgApi.ts`
    - Memoize `createOrgApiClient(api)` via `useAuthenticatedApi` and `useMemo`
    - _Requirements: 9.4_

  - [x] 1.3 Write property test for API client endpoint correctness (`__tests__/orgApi.property.spec.ts`)
    - **Property 6: API client methods call correct endpoints**
    - Generate random valid DTOs with `fast-check`, verify each method calls the correct HTTP method and URL path on the Axios mock
    - **Validates: Requirements 9.4**

- [x] 2. Create query hooks
  - [x] 2.1 Create `organizations/hooks/useOrganizations.ts`
    - Implement `useOrganizations(params?: OrgListParams)` returning `{ data, loading, error, refetch }`
    - Fetch on mount and when `params` change; debounce not handled here (component handles debounce)
    - _Requirements: 9.1_

  - [x] 2.2 Create `organizations/hooks/useOrganization.ts`
    - Implement `useOrganization(id: string)` returning `{ data, loading, error, refetch }`
    - Fetch on mount and when `id` changes
    - _Requirements: 9.2_

  - [x] 2.3 Create `organizations/hooks/useOrgMembers.ts`
    - Implement `useOrgMembers(orgId: string)` returning `{ data, loading, error, refetch }`
    - Data is `OrgMembersResponse` with members grouped by role code
    - _Requirements: 9.3_

  - [x] 2.4 Write property test for query hook interface shape (`__tests__/useOrganizations.property.spec.ts`)
    - **Property 5: Query hooks expose consistent interface shape**
    - For each hook, verify the result always has `data`, `loading` (boolean), `error` (string | null), and `refetch` (function)
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [x] 3. Wire `refetchRoles` into ActiveContext
  - [x] 3.1 Add `refetchRoles` to `IActiveContext` interface in `brightchart-lib/src/lib/shell/activeContext.ts`
    - Add optional `refetchRoles?: () => void` to the interface
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 3.2 Update `ActiveContextProvider` in `brightchart-react-components/src/lib/shell/contexts/ActiveContext.tsx`
    - Accept `refetchRoles` as an optional prop and include it in the context value
    - _Requirements: 11.4_

  - [x] 3.3 Update `BrightChartLayout` to pass `refetchRoles` through to `ActiveContextProvider`
    - Accept `refetchRoles` in `BrightChartLayoutProps` and forward it
    - _Requirements: 11.4_

- [x] 4. Checkpoint
  - Ensure all tests pass (`yarn nx test brightchart-react-components --testPathPatterns=organizations`), ask the user if questions arise.

- [x] 5. Implement OrganizationCreateDialog component
  - [x] 5.1 Create `organizations/components/OrganizationCreateDialog.tsx`
    - Material UI `Dialog` with form: required name field, optional phone/email/address fields
    - Client-side validation: reject empty/whitespace-only name with inline error
    - Call `orgApi.createOrganization()` on submit; show loading indicator, disable button
    - On 201 success: close dialog, call `onCreated` callback, call `refetchRoles()` from `useActiveContext()`
    - Display server error messages (400) inline in the dialog
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 11.1_

  - [x] 5.2 Write property test for empty/whitespace name validation (`__tests__/OrganizationCreateDialog.property.spec.ts`)
    - **Property 1: Empty/whitespace name validation rejection**
    - Generate arbitrary whitespace-only strings with `fast-check`, verify form rejects without calling API
    - **Validates: Requirements 1.4**

  - [x] 5.3 Write unit tests for OrganizationCreateDialog (`__tests__/OrganizationCreateDialog.spec.tsx`)
    - Test: renders form fields, submits valid data, shows validation error for empty name, shows API error, loading state disables button
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 6. Implement OrganizationListPage component
  - [x] 6.1 Create `organizations/components/OrganizationListPage.tsx`
    - Paginated list using `useOrganizations` hook
    - Display each org's name and enrollment mode as a chip ("Open" / "Invite Only")
    - Search field with 300ms debounce
    - Pagination controls using `page` and `limit` query params
    - Loading skeleton while fetching; empty state message when no results
    - Click on org: contextual actions (register as patient for open, enter token for invite-only)
    - Button to open `OrganizationCreateDialog`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 6.2 Write property test for org list item rendering (`__tests__/OrganizationListPage.property.spec.ts`)
    - **Property 2: Organization list item renders name and enrollment mode**
    - Generate random `IOrganization` objects, verify rendered output contains name and correct enrollment chip
    - **Validates: Requirements 2.2**

  - [x] 6.3 Write unit tests for OrganizationListPage (`__tests__/OrganizationListPage.spec.tsx`)
    - Test: renders org list, search debounce, pagination, empty state, create button, click actions
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 7. Implement OrganizationSettingsPage component
  - [x] 7.1 Create `organizations/components/OrganizationSettingsPage.tsx`
    - Fetch org via `useOrganization(orgId)` from route param; populate form
    - Enrollment mode as toggle/select ("Open" / "Invite Only") with description
    - Active status as toggle switch with deactivation warning
    - Submit sends PUT with only changed fields; loading indicator on submit
    - Handle 403 (access denied), 400/404 (show error message)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 7.2 Write property test for settings update payload (`__tests__/OrganizationSettingsPage.property.spec.ts`)
    - **Property 3: Settings update sends only changed fields**
    - Generate random subsets of changed fields, verify PUT body contains exactly those fields
    - **Validates: Requirements 3.2**

  - [x] 7.3 Write unit tests for OrganizationSettingsPage (`__tests__/OrganizationSettingsPage.spec.tsx`)
    - Test: populates form, submits changes, enrollment mode toggle, active status warning, 403 handling, 400/404 errors
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 8. Implement MembersManagementPage component
  - [x] 8.1 Create `organizations/components/MembersManagementPage.tsx`
    - Fetch members via `useOrgMembers(orgId)`; display grouped by role code with section headers
    - Each member shows identifier and role display name
    - "Remove Role" action with confirmation dialog; DELETE to `/brightchart/healthcare-roles/:roleId`
    - Handle `LAST_ADMIN` error (400) with specific message
    - Refresh member list after successful removal
    - Buttons to open `StaffAssignmentForm` and `InvitationManagementPanel`
    - Handle 403 with access denied message
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 8.2 Write property test for member grouping (`__tests__/MembersManagementPage.property.spec.ts`)
    - **Property 4: Members grouped by role code with correct details**
    - Generate random sets of `IHealthcareRoleDocument` objects, verify grouping and display
    - **Validates: Requirements 4.1, 4.2**

  - [x] 8.3 Write unit tests for MembersManagementPage (`__tests__/MembersManagementPage.spec.tsx`)
    - Test: renders grouped members, remove role confirmation, LAST_ADMIN error, 403 handling, buttons present
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 9. Checkpoint
  - Ensure all tests pass (`yarn nx test brightchart-react-components --testPathPatterns=organizations`), ask the user if questions arise.

- [x] 10. Implement PatientRegistrationFlow and InvitationRedeemForm
  - [x] 10.1 Create `organizations/components/PatientRegistrationFlow.tsx`
    - For open enrollment: POST to `/brightchart/healthcare-roles/patient` with org ID
    - For invite-only: show `InvitationRedeemForm` to collect token, then POST with org ID + token
    - On 201 success: call `refetchRoles()` from `useActiveContext()`, call `onRegistered`
    - Handle 403 `INVITATION_REQUIRED` (show redeem form), 409 (already registered), 410 (expired invitation)
    - Loading indicator and disabled submit during request
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 11.2_

  - [x] 10.2 Create `organizations/components/InvitationRedeemForm.tsx`
    - Token text field (supports `initialToken` prop for URL pre-fill)
    - POST to `/brightchart/invitations/redeem` with token
    - On 201 success: display role name + org name, call `refetchRoles()`, call `onRedeemed`
    - Handle 410 (expired/redeemed), loading state
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 11.3_

  - [x] 10.3 Write unit tests for PatientRegistrationFlow (`__tests__/PatientRegistrationFlow.spec.tsx`)
    - Test: open enrollment registration, invite-only token prompt, 403/409/410 error handling, role refetch
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 10.4 Write unit tests for InvitationRedeemForm (`__tests__/InvitationRedeemForm.spec.tsx`)
    - Test: token field, submission, success message, 410 error, role refetch
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 11. Implement InvitationManagementPanel and StaffAssignmentForm
  - [x] 11.1 Create `organizations/components/InvitationManagementPanel.tsx`
    - Role code selector (Physician, Registered Nurse, Medical Assistant, Dentist, Veterinarian, Admin, Patient)
    - Optional target email field
    - POST to `/brightchart/invitations`; display generated token with "Copy to Clipboard" button
    - Show expiration date (7 days from creation)
    - Handle 403 (no permission), 400 `INVALID_ROLE_CODE`, loading state
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 11.2 Create `organizations/components/StaffAssignmentForm.tsx`
    - Member ID text field + role code selector (Physician, Registered Nurse, Medical Assistant, Dentist, Veterinarian, Admin)
    - POST to `/brightchart/healthcare-roles/staff` with member ID, role code, org ID
    - On 201 success: show success message, clear form, call `onAssigned`
    - Handle 409 (already assigned), 400 `INVALID_ROLE_CODE`, 400 `INACTIVE_ORGANIZATION`, 403, loading state
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [x] 11.3 Write unit tests for InvitationManagementPanel (`__tests__/InvitationManagementPanel.spec.tsx`)
    - Test: role selector, token display, clipboard copy, expiration, 403 handling
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 11.4 Write unit tests for StaffAssignmentForm (`__tests__/StaffAssignmentForm.spec.tsx`)
    - Test: form fields, submission, 409/400 error handling, success + form clear
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 12. Implement routing and navigation integration
  - [x] 12.1 Create `organizations/OrganizationRoutes.tsx` with `OrgAdminGuard`
    - `<Routes>` with: index → `OrganizationListPage`, `redeem` → `InvitationRedeemForm`, `:orgId/settings` → guarded `OrganizationSettingsPage`, `:orgId/members` → guarded `MembersManagementPage`
    - `OrgAdminGuard`: check active role is ADMIN at target org (from `:orgId` param); render `AccessDenied` if not
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

  - [x] 12.2 Create barrel export `organizations/index.ts`
    - Export all components, hooks, services, and route component
    - _Requirements: 10.1_

  - [x] 12.3 Integrate into admin navigation and workspace routing
    - Add "Organizations" nav item to `getAdminNav` in `navigationConfigs.ts`
    - Mount `OrganizationRoutes` at `organizations/*` in the admin workspace
    - Ensure admin-only routes show navigation links when active role is ADMIN
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 13. Final checkpoint
  - Ensure all tests pass (`yarn nx test brightchart-react-components --testPathPatterns=organizations`), ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All files go in `brightchart-react-components/src/lib/organizations/`
- Uses TypeScript throughout, following existing codebase patterns
- The `createOrgApiClient` factory follows the `createEmailApiClient` pattern from `brightmail-react-components`
- Property tests use `fast-check` with minimum 100 iterations per property
- Run tests with: `yarn nx test brightchart-react-components --testPathPatterns=organizations`
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
