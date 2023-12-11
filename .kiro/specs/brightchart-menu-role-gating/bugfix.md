# Bugfix Requirements Document

## Introduction

The BrightChart EHR application has a critical access control bug where menu items, navigation, and workspace routes are not properly gated by user role. Unauthenticated and patient-role users can see clinician, admin, billing, and front-desk navigation items they should not have access to. Additionally, any authenticated user can directly navigate to restricted workspace routes (e.g., `/brightchart/admin/*`) via URL, bypassing the intended role restrictions entirely. The root cause is twofold: (1) the `permissionsForRole()` function in `useHealthcareRoles.ts` grants `ALL_PERMISSIONS` to every non-patient role, making sidebar permission filtering a no-op, and (2) workspace routes in `brightchart-routes.tsx` have no role-based guards, allowing direct URL access to any workspace.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user has a PATIENT role THEN the system displays only patient portal navigation items, BUT any authenticated user with a non-patient role (e.g., a basic PHYSICIAN) receives ALL_PERMISSIONS including admin-level permissions (PatientPermission.Admin, ClinicalPermission.ClinicalAdmin, BillingPermission.BillingAdmin, etc.), causing all navigation items across all workspaces to be visible regardless of actual role

1.2 WHEN an authenticated user with a PHYSICIAN role navigates directly to `/brightchart/admin/*` via URL THEN the system renders the AdminWorkspace (Users, Roles, Audit Log, Specialty Config, Organizations) without any role check, exposing admin functionality to non-admin users

1.3 WHEN an authenticated user with a PATIENT role navigates directly to `/brightchart/clinician/*`, `/brightchart/billing/*`, `/brightchart/front-desk/*`, or `/brightchart/admin/*` via URL THEN the system renders those workspaces without verifying the user holds the appropriate role, exposing clinical, billing, front-desk, and admin data to patient-role users

1.4 WHEN the backend healthcare-roles API is unreachable THEN the system falls back to granting every authenticated user a PHYSICIAN role by default (in `useHealthcareRoles.ts` fallback logic), which combined with ALL_PERMISSIONS means any authenticated user gets full clinician and potentially admin access

1.5 WHEN a user with only a PHYSICIAN role uses the RoleSwitcher component THEN the system allows navigation to `/brightchart/admin` or `/brightchart/billing` workspaces without verifying the user actually holds ADMIN or billing-specific roles, because the workspace routes perform no role validation

### Expected Behavior (Correct)

2.1 WHEN a user has a PATIENT role THEN the system SHALL display only patient portal navigation items, AND WHEN a user has a PHYSICIAN role THEN the system SHALL display only clinician workspace navigation items appropriate to their actual permissions, AND WHEN a user has an ADMIN role THEN the system SHALL display admin workspace navigation items — each role SHALL receive only the permissions appropriate to that specific role code

2.2 WHEN an authenticated user navigates directly to `/brightchart/admin/*` via URL THEN the system SHALL verify the user holds an ADMIN role and SHALL deny access (redirect to their default workspace or show an access-denied page) if the user does not hold that role

2.3 WHEN an authenticated user navigates directly to any workspace route (`/brightchart/clinician/*`, `/brightchart/billing/*`, `/brightchart/front-desk/*`, `/brightchart/admin/*`) via URL THEN the system SHALL verify the user holds a role authorized for that workspace and SHALL deny access if the user's active role does not match

2.4 WHEN the backend healthcare-roles API is unreachable THEN the system SHALL fall back to the most restrictive role available from the auth context rather than granting PHYSICIAN access by default, ensuring unauthenticated or minimally-privileged users do not receive elevated permissions

2.5 WHEN a user attempts to switch roles via the RoleSwitcher THEN the system SHALL only allow navigation to workspaces that correspond to roles the user actually holds, and the target workspace route SHALL enforce role verification independently of the navigation layer

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user has a valid ADMIN role and navigates to `/brightchart/admin/*` THEN the system SHALL CONTINUE TO render the AdminWorkspace with full admin navigation items and functionality

3.2 WHEN a user has a valid PHYSICIAN role and navigates to `/brightchart/clinician/*` THEN the system SHALL CONTINUE TO render the ClinicianWorkspace with clinician navigation items (Patients, Encounters, Schedule, Inbox) and full clinical functionality

3.3 WHEN a user has a valid PATIENT role and navigates to `/brightchart/portal/*` THEN the system SHALL CONTINUE TO enforce self-only access via the activePatientRef check and render the patient portal (My Health, Appointments, Test Results, Bills & Payments)

3.4 WHEN a user has multiple valid roles THEN the system SHALL CONTINUE TO display the RoleSwitcher component and allow switching between those roles, navigating to the corresponding workspace for each role

3.5 WHEN a user has a valid role with appropriate permissions THEN the system SHALL CONTINUE TO filter navigation items based on requiredPermissions arrays defined in navigationConfigs.ts, showing only items the user is permitted to access

3.6 WHEN the backend healthcare-roles API returns valid role data THEN the system SHALL CONTINUE TO use the API-provided roles rather than fallback defaults, and the role resolution, specialty profile, and member context SHALL function as they do today
