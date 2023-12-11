# BrightChart Menu Role Gating Bugfix Design

## Overview

The BrightChart EHR UI has a critical access control bug where all authenticated non-patient users receive `ALL_PERMISSIONS` regardless of their actual role, and workspace routes have no role-based guards. This means a REGISTERED_NURSE sees admin menu items, a PHYSICIAN can URL-navigate to `/brightchart/admin/*`, and when the backend API is unreachable every user gets a default PHYSICIAN role with full permissions.

The fix targets three root causes: (1) replace the blanket `ALL_PERMISSIONS` grant in `permissionsForRole()` with role-specific permission sets, (2) add a `RoleGuardedRoute` component that enforces role checks on each workspace route in `brightchart-routes.tsx`, and (3) change the fallback logic to grant PATIENT (most restrictive) instead of PHYSICIAN when the healthcare-roles API is unreachable.

## Glossary

- **Bug_Condition (C)**: The condition where a user's active role does not match the permissions or workspace access they are granted — specifically when `permissionsForRole()` returns `ALL_PERMISSIONS` for any non-patient role, or when a workspace route renders without verifying the user's role code
- **Property (P)**: The desired behavior where each role receives only its designated permission set, and each workspace route only renders for users holding an authorized role code
- **Preservation**: Existing behavior that must remain unchanged — valid role holders accessing their authorized workspaces, RoleSwitcher functionality, navigation item filtering via `requiredPermissions`, patient portal self-only access, and API-provided role resolution
- **`permissionsForRole()`**: The function in `useHealthcareRoles.ts` that maps a role code to a permission string array — currently returns `ALL_PERMISSIONS` for all non-patient roles
- **`RoleGuardedRoute`**: A new route wrapper component (to be created alongside `PermissionGuardedRoute`) that checks the user's active role code against a list of allowed role codes before rendering children
- **Workspace Route**: A top-level route segment under `/brightchart/` (clinician, portal, front-desk, billing, admin) that maps to a specific workspace component
- **SNOMED CT Role Code**: The string constant identifying a healthcare role (e.g., PHYSICIAN = '309343006', ADMIN = '394572006')

## Bug Details

### Bug Condition

The bug manifests in three distinct scenarios: (1) when `permissionsForRole()` is called with any non-patient role code and returns `ALL_PERMISSIONS` instead of role-appropriate permissions, causing the sidebar permission filter in `buildNavItems()` to be a no-op; (2) when any authenticated user navigates to a workspace URL and the route renders without checking whether the user's active role is authorized for that workspace; (3) when the backend healthcare-roles API is unreachable and the fallback logic grants PHYSICIAN + ALL_PERMISSIONS to every authenticated user.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { roleCode: string, targetWorkspace: string, apiReachable: boolean }
  OUTPUT: boolean

  // Condition 1: Permission over-grant
  permissionOverGrant := input.roleCode != PATIENT
                         AND permissionsForRole(input.roleCode) == ALL_PERMISSIONS
                         AND permissionsForRole(input.roleCode) != expectedPermissionsForRole(input.roleCode)

  // Condition 2: Workspace route bypass
  routeBypass := NOT isRoleAuthorizedForWorkspace(input.roleCode, input.targetWorkspace)
                 AND workspaceRouteRenders(input.roleCode, input.targetWorkspace)

  // Condition 3: Fallback over-grant
  fallbackOverGrant := NOT input.apiReachable
                       AND fallbackRole() == PHYSICIAN

  RETURN permissionOverGrant OR routeBypass OR fallbackOverGrant
END FUNCTION
```

### Examples

- A user with REGISTERED_NURSE role sees admin navigation items (Users, Roles, Audit Log, Specialty Config, Organizations) because `permissionsForRole('224535009')` returns `ALL_PERMISSIONS` including `PatientPermission.Admin` and `ClinicalPermission.ClinicalAdmin`
- A user with PHYSICIAN role navigates to `/brightchart/admin/users` and the `AdminWorkspace` renders `UserManagement` without any role check — expected: AccessDenied page
- A user with PATIENT role navigates to `/brightchart/clinician/patients` and the `ClinicianWorkspace` renders `PatientListView` — expected: AccessDenied page
- When the backend API is down, a newly authenticated user with no prior roles gets PHYSICIAN fallback and can access all clinical workspaces — expected: PATIENT fallback with portal-only access
- A MEDICAL_ASSISTANT navigates to `/brightchart/billing/tracking` and sees claim tracking data — expected: AccessDenied (MEDICAL_ASSISTANT has no billing permissions in the corrected model)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- A user with a valid ADMIN role navigating to `/brightchart/admin/*` continues to see the full AdminWorkspace (Users, Roles, Audit Log, Specialty Config, Organizations)
- A user with a valid PHYSICIAN role navigating to `/brightchart/clinician/*` continues to see the ClinicianWorkspace (Patients, Encounters, Schedule, Inbox)
- A user with a valid PATIENT role navigating to `/brightchart/portal/*` continues to have self-only access enforced via `activePatientRef` and sees My Health, Appointments, Test Results, Bills & Payments
- The RoleSwitcher component continues to display for users with multiple roles and allows switching between them, navigating to the corresponding workspace
- Navigation items in `buildNavItems()` continue to be filtered by `requiredPermissions` arrays from `navigationConfigs.ts`
- When the backend healthcare-roles API returns valid role data, those API-provided roles are used instead of fallback defaults

**Scope:**
All inputs that do NOT involve the three bug conditions (permission over-grant, route bypass, fallback over-grant) should be completely unaffected by this fix. This includes:
- Valid role holders accessing their authorized workspaces
- Mouse/keyboard interactions within authorized workspaces
- Specialty-specific navigation items (dental, veterinary)
- Organization display in RoleSwitcher labels
- SMART scope resolution (currently empty, future feature)

## Hypothesized Root Cause

Based on the bug description and code analysis, the confirmed root causes are:

1. **Blanket Permission Grant in `permissionsForRole()`**: The function in `useHealthcareRoles.ts` (line ~73) uses a simple switch with only two cases — `PATIENT` returns `PATIENT_PERMISSIONS`, and `default` returns `ALL_PERMISSIONS`. This means PHYSICIAN, REGISTERED_NURSE, MEDICAL_ASSISTANT, DENTIST, VETERINARIAN, and ADMIN all receive identical full permissions including all Admin-level permissions. The `buildNavItems()` filter in `BrightChartLayout.tsx` calls `hasAllPermissions()` which always returns true for non-patient roles, making the sidebar filter a no-op.

2. **Missing Route Guards in `brightchart-routes.tsx`**: The workspace routes (lines ~72-77) are all direct `<Route>` elements inside the `BrightChartLayout` wrapper. The only auth check is `PrivateRoute` which verifies authentication but not role authorization. There is no `RoleGuardedRoute` or equivalent wrapper checking `activeRole.roleCode` against allowed roles for each workspace path.

3. **Overly Permissive Fallback Logic**: The `fallbackRoles` memo in `useHealthcareRoles.ts` (lines ~120-145) always pushes a PHYSICIAN role as the first element, making it the `initialRole`. Combined with `permissionsForRole()` returning `ALL_PERMISSIONS` for PHYSICIAN, any user whose API call fails gets full clinical access. The ADMIN fallback is gated behind `userData?.rolePrivileges?.admin`, but the PHYSICIAN fallback is unconditional.

4. **No Role-to-Workspace Authorization Map**: The codebase has `workspacePrefixForRole()` (maps role → URL prefix for navigation) but no inverse `allowedRolesForWorkspace()` (maps workspace → authorized roles). This missing mapping is needed for route guards.

## Correctness Properties

Property 1: Bug Condition - Role-Specific Permission Sets

_For any_ role code passed to `permissionsForRole()`, the returned permission array SHALL contain only the permissions designated for that specific role — PHYSICIAN gets clinical read/write, encounter read/write, document read/write, order read/write/sign, scheduling read/write, and patient read/write (no Admin-level permissions); REGISTERED_NURSE gets clinical read/write, encounter read/write, patient read, scheduling read/write, and document read (no orders, no billing, no admin); MEDICAL_ASSISTANT gets patient read/write, scheduling read/write, encounter read, and clinical read (no write on clinical/encounters, no orders, no billing, no admin); ADMIN gets ALL_PERMISSIONS; PATIENT gets PATIENT_PERMISSIONS; DENTIST and VETERINARIAN get the same set as PHYSICIAN.

**Validates: Requirements 2.1**

Property 2: Bug Condition - Workspace Route Role Enforcement

_For any_ combination of active role code and target workspace path, the route SHALL render the workspace component only when the role is in the authorized set for that workspace (`/brightchart/portal` → PATIENT only; `/brightchart/clinician` → PHYSICIAN, REGISTERED_NURSE, MEDICAL_ASSISTANT, DENTIST, VETERINARIAN; `/brightchart/admin` → ADMIN only; `/brightchart/front-desk` → PHYSICIAN, REGISTERED_NURSE, MEDICAL_ASSISTANT, DENTIST, VETERINARIAN; `/brightchart/billing` → PHYSICIAN, REGISTERED_NURSE, MEDICAL_ASSISTANT, DENTIST, VETERINARIAN, ADMIN), and SHALL render AccessDenied for all other role codes.

**Validates: Requirements 2.2, 2.3, 2.5**

Property 3: Bug Condition - Restrictive Fallback Role

_For any_ scenario where the healthcare-roles API is unreachable, the fallback logic SHALL assign PATIENT as the default role (not PHYSICIAN), ensuring the user receives only `PATIENT_PERMISSIONS` and can only access `/brightchart/portal`.

**Validates: Requirements 2.4**

Property 4: Preservation - Authorized Access Unchanged

_For any_ input where the user holds a valid role that IS authorized for the target workspace, the fixed code SHALL produce the same result as the original code — the workspace component renders, navigation items are visible based on `requiredPermissions`, and all workspace functionality works as before.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `brightchart-react-components/src/lib/shell/hooks/useHealthcareRoles.ts`

**Function**: `permissionsForRole()`

**Specific Changes**:
1. **Define role-specific permission constants**: Create `PHYSICIAN_PERMISSIONS`, `REGISTERED_NURSE_PERMISSIONS`, `MEDICAL_ASSISTANT_PERMISSIONS`, `ADMIN_PERMISSIONS` (same as current `ALL_PERMISSIONS`), `DENTIST_PERMISSIONS`, `VETERINARIAN_PERMISSIONS` arrays with appropriate permission subsets
   - PHYSICIAN: Patient R/W, Clinical R/W, Encounter R/W, Document R/W, Order R/W/Sign, Scheduling R/W (no Admin-level permissions, no Billing)
   - REGISTERED_NURSE: Patient R, Clinical R/W, Encounter R/W, Document R, Scheduling R/W (no orders, no billing, no admin)
   - MEDICAL_ASSISTANT: Patient R/W, Clinical R, Encounter R, Scheduling R/W, Document R (limited clinical scope)
   - ADMIN: ALL_PERMISSIONS (unchanged)
   - DENTIST/VETERINARIAN: Same as PHYSICIAN
   - PATIENT: PATIENT_PERMISSIONS (unchanged)

2. **Update `permissionsForRole()` switch statement**: Add explicit cases for each role code constant (PHYSICIAN, REGISTERED_NURSE, MEDICAL_ASSISTANT, ADMIN, DENTIST, VETERINARIAN) returning their specific permission set. The `default` case should return `PATIENT_PERMISSIONS` (most restrictive) instead of `ALL_PERMISSIONS`.

3. **Fix fallback logic**: Change the `fallbackRoles` memo to push a PATIENT role as the first (default) element instead of PHYSICIAN. Only add PHYSICIAN if `userData?.rolePrivileges` indicates clinical access. Keep the ADMIN fallback gated behind `userData?.rolePrivileges?.admin`.

---

**File**: `brightchart-react-components/src/lib/shell/components/RoleGuardedRoute.tsx` (NEW)

**Specific Changes**:
4. **Create `RoleGuardedRoute` component**: A new component similar to `PermissionGuardedRoute` that reads `activeRole.roleCode` from `useActiveContext()` and checks it against an `allowedRoles: string[]` prop. Renders children if authorized, `AccessDenied` if not.

---

**File**: `brightchain-react/src/app/brightchart-routes.tsx`

**Specific Changes**:
5. **Wrap each workspace route with `RoleGuardedRoute`**: Add role guards to each workspace route:
   - `clinician/*` → allowedRoles: [PHYSICIAN, REGISTERED_NURSE, MEDICAL_ASSISTANT, DENTIST, VETERINARIAN]
   - `portal/*` → allowedRoles: [PATIENT]
   - `front-desk/*` → allowedRoles: [PHYSICIAN, REGISTERED_NURSE, MEDICAL_ASSISTANT, DENTIST, VETERINARIAN]
   - `billing/*` → allowedRoles: [PHYSICIAN, REGISTERED_NURSE, MEDICAL_ASSISTANT, DENTIST, VETERINARIAN, ADMIN]
   - `admin/*` → allowedRoles: [ADMIN]

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests that call `permissionsForRole()` with each role code and assert the returned permissions match expected role-specific sets. Write route rendering tests that mount workspace routes with unauthorized roles and assert the workspace component renders (demonstrating the bug). Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Permission Over-Grant Test**: Call `permissionsForRole(REGISTERED_NURSE)` and assert it does NOT include `PatientPermission.Admin` — will fail on unfixed code because it returns `ALL_PERMISSIONS`
2. **Admin Route Bypass Test**: Render `/brightchart/admin/users` with PHYSICIAN role context and assert `UserManagement` renders — will succeed on unfixed code (demonstrating the bug)
3. **Patient Route Bypass Test**: Render `/brightchart/clinician/patients` with PATIENT role context and assert `PatientListView` renders — will succeed on unfixed code (demonstrating the bug)
4. **Fallback Role Test**: Mock API failure and assert `initialRole.roleCode` is PHYSICIAN — will succeed on unfixed code (demonstrating the bug)

**Expected Counterexamples**:
- `permissionsForRole(REGISTERED_NURSE)` returns 22 permissions (ALL_PERMISSIONS) instead of the expected ~10
- AdminWorkspace renders for PHYSICIAN role without any access denial
- ClinicianWorkspace renders for PATIENT role without any access denial
- Fallback assigns PHYSICIAN as default role for all users

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  // Permission fix check
  IF input.roleCode != PATIENT AND input.roleCode != ADMIN THEN
    perms := permissionsForRole_fixed(input.roleCode)
    ASSERT perms IS SUBSET OF expectedPermissionsForRole(input.roleCode)
    ASSERT perms DOES NOT CONTAIN any Admin-level permissions (unless roleCode == ADMIN)
  END IF

  // Route guard fix check
  IF NOT isRoleAuthorizedForWorkspace(input.roleCode, input.targetWorkspace) THEN
    result := renderRoute_fixed(input.roleCode, input.targetWorkspace)
    ASSERT result == AccessDenied
  END IF

  // Fallback fix check
  IF NOT input.apiReachable THEN
    role := resolveFallbackRole_fixed()
    ASSERT role.roleCode == PATIENT
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT permissionsForRole_original(input.roleCode) == permissionsForRole_fixed(input.roleCode)
         OR input.roleCode == PATIENT  // PATIENT permissions unchanged
  ASSERT renderRoute_original(input.roleCode, input.targetWorkspace)
         == renderRoute_fixed(input.roleCode, input.targetWorkspace)
         WHERE isRoleAuthorizedForWorkspace(input.roleCode, input.targetWorkspace)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many role/workspace/permission combinations automatically
- It catches edge cases like unknown role codes hitting the default branch
- It provides strong guarantees that authorized access paths are unchanged

**Test Plan**: Observe behavior on UNFIXED code first for authorized role/workspace combinations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **ADMIN Access Preservation**: Verify ADMIN role can still access `/brightchart/admin/*` and sees all admin navigation items after the fix
2. **PHYSICIAN Access Preservation**: Verify PHYSICIAN role can still access `/brightchart/clinician/*` and sees clinician navigation items after the fix
3. **PATIENT Portal Preservation**: Verify PATIENT role can still access `/brightchart/portal/*` with self-only access enforcement after the fix
4. **RoleSwitcher Preservation**: Verify RoleSwitcher continues to display for multi-role users and switching navigates to the correct workspace
5. **Navigation Filter Preservation**: Verify `buildNavItems()` still filters items by `requiredPermissions` — now more meaningful since permissions are role-specific
6. **API Role Resolution Preservation**: Verify that when the API returns valid roles, those roles are used (not fallback defaults)

### Unit Tests

- Test `permissionsForRole()` for each of the 7 role codes, asserting exact permission arrays
- Test `permissionsForRole()` with an unknown role code, asserting it returns `PATIENT_PERMISSIONS` (most restrictive default)
- Test `RoleGuardedRoute` renders children when role is in `allowedRoles`
- Test `RoleGuardedRoute` renders `AccessDenied` when role is NOT in `allowedRoles`
- Test fallback role resolution when API is unreachable — assert PATIENT is the default

### Property-Based Tests

- Generate random role codes from the 7 known constants and verify `permissionsForRole()` returns a permission set that is a subset of `ALL_PERMISSIONS` and matches the expected set for that role
- Generate random (roleCode, workspacePath) pairs and verify the route guard allows access if and only if the role is in the authorized set for that workspace
- Generate random unknown role code strings and verify `permissionsForRole()` returns `PATIENT_PERMISSIONS`

### Integration Tests

- Test full navigation flow: authenticate as PHYSICIAN → verify clinician workspace loads → navigate to `/brightchart/admin` → verify AccessDenied renders
- Test role switching flow: authenticate with PHYSICIAN + PATIENT roles → switch to PATIENT → verify portal loads → attempt URL navigation to `/brightchart/clinician` → verify AccessDenied
- Test fallback flow: mock API failure → verify user lands on patient portal with PATIENT permissions only
- Test that `buildNavItems()` with fixed `permissionsForRole()` produces correct nav items per role (e.g., REGISTERED_NURSE sees no billing or admin items)
