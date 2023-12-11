# Implementation Plan: BrightChart Application Shell

## Overview

This plan implements the BrightChart Application Shell — the set of React components, contexts, hooks, and route definitions that compose all BrightChart modules into a unified, role-aware clinical application. Following the established monorepo pattern (same as BrightMail, BrightHub, etc.), implementation adds interfaces to `brightchart-lib`, components to `brightchart-react-components`, and routes to `brightchain-react/src/app/brightchart-routes.tsx`. No separate Nx application is created; the empty `brightchart-app` directory is removed.

## Tasks

- [x] 1. Add missing permission ACLs to brightchart-lib
  - [x] 1.1 Create `brightchart-lib/src/lib/orders/access/orderAcl.ts` defining `OrderPermission` enum (OrderRead, OrderWrite, OrderAdmin), `IOrderACL` interface extending IPoolACL, `hasOrderPermission` helper, and `SMART_ORDER_SCOPE_MAPPINGS`. Create `index.ts` barrel. Follow the exact pattern of `encounterAcl.ts`.
    - _Requirements: 2.1_

  - [x] 1.2 Create `brightchart-lib/src/lib/scheduling/access/schedulingAcl.ts` defining `SchedulingPermission` enum (SchedulingRead, SchedulingWrite, SchedulingAdmin), `ISchedulingACL` interface extending IPoolACL, `hasSchedulingPermission` helper, and `SMART_SCHEDULING_SCOPE_MAPPINGS`. Create `index.ts` barrel.
    - _Requirements: 2.1_

  - [x] 1.3 Create `brightchart-lib/src/lib/billing/access/billingAcl.ts` defining `BillingPermission` enum (BillingRead, BillingWrite, BillingSubmit, BillingAdmin), `IBillingACL` interface extending IPoolACL, `hasBillingPermission` helper, and `SMART_BILLING_SCOPE_MAPPINGS`. Create `index.ts` barrel.
    - _Requirements: 2.1_

  - [x] 1.4 Update the barrel exports in `brightchart-lib/src/lib/orders/index.ts`, `brightchart-lib/src/lib/scheduling/index.ts`, and `brightchart-lib/src/lib/billing/index.ts` to re-export the new access modules.
    - _Requirements: 2.1_

- [x] 2. Add shell interfaces to brightchart-lib
  - [x] 2.1 Create `brightchart-lib/src/lib/shell/activeContext.ts` defining the `IActiveContext<TID>` interface with: member (IMemberContext shape — memberId, username, type), healthcareRoles, activeRole, specialtyProfile, activePatient, activeEncounter, setActivePatient, setActiveEncounter, switchRole.
    - _Requirements: 1.5_

  - [x] 2.2 Create `brightchart-lib/src/lib/shell/navigationTypes.ts` defining `INavigationItem` and `INavigationConfig` interfaces.
    - _Requirements: 3.1, 3.2_

  - [x] 2.3 Create `brightchart-lib/src/lib/shell/notificationTypes.ts` defining `INotification` interface and `NotificationType` enum.
    - _Requirements: 13.1_

  - [x] 2.4 Create `brightchart-lib/src/lib/shell/index.ts` barrel and update `brightchart-lib/src/index.ts` to re-export `./lib/shell/index`.
    - _Requirements: 14.1_

- [x] 3. Context providers (in brightchart-react-components)
  - [x] 3.1 Create `brightchart-react-components/src/lib/shell/contexts/ActiveContext.tsx` implementing the ActiveContext React context provider. Holds authenticated member, healthcare roles, active role, active specialty profile, active patient, active encounter. Provides setActivePatient, setActiveEncounter, switchRole methods.
    - _Requirements: 1.5_

  - [x] 3.2 Create `brightchart-react-components/src/lib/shell/contexts/PermissionContext.tsx` implementing the permission context provider. Resolves the user's effective permissions from: healthcare role → SMART scopes → pool ACL permissions (all permission enums). Exposes hasPermission, hasAnyPermission, hasAllPermissions.
    - _Requirements: 2.2, 2.4_

  - [x] 3.3 Create `brightchart-react-components/src/lib/shell/contexts/SpecialtyContext.tsx` implementing the specialty context provider. Holds the active ISpecialtyProfile and provides it to all child components.
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 3.4 Create `brightchart-react-components/src/lib/shell/contexts/NotificationContext.tsx` implementing the notification context provider. Holds INotification[], provides addNotification, markAsRead, getUnreadCount. Filters notifications by user role/permissions.
    - _Requirements: 13.1, 13.4_

- [x] 4. Permission system components (in brightchart-react-components)
  - [x] 4.1 Create `brightchart-react-components/src/lib/shell/components/PermissionGate.tsx`. Props: requiredPermissions (string[]), requireAll (boolean, default true), fallback (ReactNode), children. Consumes PermissionContext to evaluate permissions.
    - _Requirements: 2.1, 2.3_

  - [x] 4.2 Create `brightchart-react-components/src/lib/shell/hooks/usePermissions.ts` returning hasPermission, hasAnyPermission, hasAllPermissions, permissions set, role, and scopes.
    - _Requirements: 2.4_

  - [x] 4.3 Create `brightchart-react-components/src/lib/shell/components/PermissionGuardedRoute.tsx` — React Router route wrapper that checks permissions before rendering. Redirects to AccessDenied when denied.
    - _Requirements: 2.5_

  - [x] 4.4 Create `brightchart-react-components/src/lib/shell/components/AccessDenied.tsx` — page explaining the user lacks permission, with a "Go Back" button.
    - _Requirements: 2.5_

- [x] 5. BrightChartLayout and shell components
  - [x] 5.1 Create `brightchart-react-components/src/lib/shell/BrightChartLayout.tsx` — the main layout component (analogous to BrightMailLayout). Uses `<Outlet />` for child routes. Provides: responsive sidebar/bottom navigation, sub-header bar (workspace title, notification bell, role switcher, connectivity indicator), and main content area. Wraps children in ActiveContext, PermissionContext, SpecialtyContext, NotificationContext providers. Adapts layout for desktop (sidebar), tablet (collapsible sidebar), mobile (bottom nav).
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 11.1_

  - [x] 5.2 Create `brightchart-react-components/src/lib/shell/components/Header/ChartHeader.tsx`, `NotificationBell.tsx`, `RoleSwitcher.tsx`, `ConnectivityIndicator.tsx`.
    - _Requirements: 1.4, 12.1, 13.2_

  - [x] 5.3 Create `brightchart-react-components/src/lib/shell/hooks/useActiveContext.ts`, `useSpecialty.ts`, `useNotifications.ts` — convenience hooks wrapping the context consumers.
    - _Requirements: 1.5, 10.3, 13.1_

- [x] 6. Navigation system
  - [x] 6.1 Create `brightchart-react-components/src/lib/shell/config/navigationConfigs.ts` defining predefined INavigationConfig objects for each workspace: clinicianNav, patientPortalNav, frontDeskNav, billingNav, adminNav. Each item has requiredPermissions. Labels are specialty-aware (parameterized by specialty profile).
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 6.2 Create `brightchart-react-components/src/lib/shell/components/Navigation/Sidebar.tsx` — desktop/tablet sidebar rendering INavigationItem[] with permission-based visibility, active route highlighting, collapsible sub-items, and badge support.
    - _Requirements: 3.3, 3.4_

  - [x] 6.3 Create `brightchart-react-components/src/lib/shell/components/Navigation/BottomNav.tsx` — mobile bottom tab navigation with top-level workspace items.
    - _Requirements: 11.1_

- [x] 7. Clinician Workspace
  - [x] 7.1 Create `brightchart-react-components/src/lib/shell/workspaces/clinician/ClinicianWorkspace.tsx` — workspace root with sub-routing for patient list, patient chart, encounter dashboard, schedule, inbox.
    - _Requirements: 4.1_

  - [x] 7.2 Create `brightchart-react-components/src/lib/shell/workspaces/clinician/PatientListView.tsx` — wraps PatientSearchForm (Module 1) with PermissionGate(PatientRead). Displays search results, click navigates to patient chart.
    - _Requirements: 4.1_

  - [x] 7.3 Create `brightchart-react-components/src/lib/shell/workspaces/clinician/PatientChart.tsx` — tabbed view aggregating all module components for a single patient: Demographics, Clinical Timeline, Problems, Medications, Allergies, Encounters, Documents, Orders, Results, Appointments, Insurance, Billing. Each tab gated by appropriate permissions. Patient header bar with name/age/gender/MRN/allergies.
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.4 Create `brightchart-react-components/src/lib/shell/workspaces/clinician/EncounterDashboard.tsx` — today's encounters. Shows scheduled appointments, in-progress encounters, pending tasks.
    - _Requirements: 4.1, 4.2_

  - [x] 7.5 Create `brightchart-react-components/src/lib/shell/workspaces/clinician/InboxView.tsx` — pending results, unsigned notes, messages. Each section gated.
    - _Requirements: 4.1_

  - [x] 7.6 Create `brightchart-react-components/src/lib/shell/components/PatientHeader.tsx` — reusable patient header bar with name, age, gender, MRN, high-criticality allergies highlighted, photo placeholder.
    - _Requirements: 6.2_

- [x] 8. Patient Portal
  - [x] 8.1 Create `brightchart-react-components/src/lib/shell/workspaces/patient/PatientPortal.tsx` — workspace root. On mount, sets activePatient to the authenticated user's patient ID (enforcing self-only access). Sub-routing for health summary, medications, allergies, appointments, results, documents, billing.
    - _Requirements: 5.1, 5.2_

  - [x] 8.2 Create `brightchart-react-components/src/lib/shell/workspaces/patient/MyHealthSummary.tsx` — dashboard with: next appointment, active medications count, recent results (abnormal flagged), outstanding balance. Below: ClinicalTimeline (Module 2) read-only.
    - _Requirements: 5.1, 5.3_

  - [x] 8.3 Create `brightchart-react-components/src/lib/shell/workspaces/patient/MyAppointments.tsx` — upcoming and past appointments. Self-scheduling: view available slots, request appointment (status: proposed).
    - _Requirements: 5.1, 5.4_

  - [x] 8.4 Create `brightchart-react-components/src/lib/shell/workspaces/patient/MyResults.tsx` — results read-only with abnormal flagging.
    - _Requirements: 5.1_

  - [x] 8.5 Create `brightchart-react-components/src/lib/shell/workspaces/patient/MyBilling.tsx` — billing read-only.
    - _Requirements: 5.1_

  - [x] 8.6 Apply patient-friendly labels throughout the portal: "My Health" not "Clinical Timeline", "Test Results" not "DiagnosticReports", "Bills & Payments" not "Patient Ledger".
    - _Requirements: 5.5_

- [x] 9. Front Desk Workspace
  - [x] 9.1 Create `brightchart-react-components/src/lib/shell/workspaces/frontDesk/FrontDeskWorkspace.tsx` — workspace root with sub-routing for schedule, check-in, booking, waitlist, insurance, registration. Dashboard with today's counts.
    - _Requirements: 7.1, 7.2_

  - [x] 9.2 Create `brightchart-react-components/src/lib/shell/workspaces/frontDesk/CheckInView.tsx` — wraps EncounterCheckInForm (Module 3) for transitioning appointments to encounters.
    - _Requirements: 7.1_

  - [x] 9.3 Create `brightchart-react-components/src/lib/shell/workspaces/frontDesk/RegistrationView.tsx` — wraps PatientCreateEditForm (Module 1) for new patient registration.
    - _Requirements: 7.1_

- [x] 10. Billing Workspace
  - [x] 10.1 Create `brightchart-react-components/src/lib/shell/workspaces/billing/BillingWorkspace.tsx` — workspace root with sub-routing for superbills, claims, claim tracking, EOBs, payments, ledger, fee schedules. Dashboard with unbilled/pending/denied counts.
    - _Requirements: 8.1, 8.2_

  - [x] 10.2 Create `brightchart-react-components/src/lib/shell/workspaces/billing/ClaimTrackingView.tsx` — submitted claim status dashboard showing claim lifecycle states.
    - _Requirements: 8.1_

  - [x] 10.3 Create `brightchart-react-components/src/lib/shell/workspaces/billing/PaymentPostingView.tsx` — interface for posting payments from EOBs to patient ledgers.
    - _Requirements: 8.1_

- [x] 11. Admin Workspace
  - [x] 11.1 Create `brightchart-react-components/src/lib/shell/workspaces/admin/AdminWorkspace.tsx` — workspace root with sub-routing for users, roles, ACLs, audit, specialty config, settings. Accessible only with Admin-level permissions.
    - _Requirements: 9.1, 9.2_

  - [x] 11.2 Create `brightchart-react-components/src/lib/shell/workspaces/admin/UserManagement.tsx` — list BrightChain members, assign/edit healthcare roles.
    - _Requirements: 9.1_

  - [x] 11.3 Create `brightchart-react-components/src/lib/shell/workspaces/admin/RoleConfiguration.tsx` — edit healthcare roles, assign SMART scopes.
    - _Requirements: 9.1_

  - [x] 11.4 Create `brightchart-react-components/src/lib/shell/workspaces/admin/AuditLogViewer.tsx` — searchable audit log across all modules with date/user/operation filters.
    - _Requirements: 9.1_

  - [x] 11.5 Create `brightchart-react-components/src/lib/shell/workspaces/admin/SpecialtyConfiguration.tsx` — active specialty profile selector, workflow state editor, fee schedule management.
    - _Requirements: 9.1_

- [x] 12. Notification system components
  - [x] 12.1 Create `brightchart-react-components/src/lib/shell/components/Header/NotificationBell.tsx` — bell icon with unread count badge. Click opens notification panel.
    - _Requirements: 13.2_

  - [x] 12.2 Create `brightchart-react-components/src/lib/shell/components/NotificationPanel.tsx` — dropdown/slide-out panel listing recent notifications with: title, body, timestamp, read/unread styling, click-to-navigate. Mark-as-read on click.
    - _Requirements: 13.3_

- [x] 13. Offline indicator
  - [x] 13.1 Create `brightchart-react-components/src/lib/shell/components/Header/ConnectivityIndicator.tsx` — persistent online/offline indicator. When offline, displays banner with available/unavailable feature list. When reconnecting, shows sync progress.
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 14. Specialty theming
  - [x] 14.1 Create `brightchart-react-components/src/lib/shell/config/specialtyThemes.ts` defining CSS custom property sets for each specialty: medical (blue palette), dental (teal palette), veterinary (green palette). Applied via a ThemeProvider or CSS class on the layout root.
    - _Requirements: 10.4_

  - [x] 14.2 Integrate specialty-driven labels into navigation configs: "Patients" → "Clients" for vet, "Operatory View" added for dental, etc.
    - _Requirements: 3.4, 4.4, 10.1_

- [x] 15. Barrel exports and route wiring
  - [x] 15.1 Create `brightchart-react-components/src/lib/shell/index.ts` barrel exporting: BrightChartLayout, all contexts, all hooks, PermissionGate, PermissionGuardedRoute, AccessDenied, PatientHeader, navigation components, notification components, workspace components.
    - _Requirements: 14.1_

  - [x] 15.2 Update `brightchart-react-components/src/index.ts` to re-export `./lib/shell/index`.
    - _Requirements: 14.1_

  - [x] 15.3 Update `brightchain-react/src/app/brightchart-routes.tsx` to import `BrightChartLayout` from `@brightchain/brightchart-react-components` and define all routes with lazy-loaded workspace modules, wrapped in `PrivateRoute`. Follow the `BrightMailRoutes` pattern.
    - _Requirements: 14.1, 3.5_

  - [x] 15.4 Update the BrightChart menu config in `brightchain-react/src/app/app.tsx` to add sub-menu items for the main workspaces (Patients, Schedule, Billing, Admin) following the pattern of `brightMailMenuConfig`.
    - _Requirements: 3.3_

- [x] 16. Cleanup and accessibility
  - [x] 16.1 Remove the empty `brightchart-app` directory (it only contains `.empty` and `.git`). Remove it from `package.json` workspaces if listed. Remove any tsconfig path aliases pointing to it.
    - _Requirements: 14.4_

  - [x] 16.2 Audit all shell components for WCAG 2.1 AA compliance: keyboard navigation, ARIA labels, color contrast, focus indicators, skip-to-content link. Add high-contrast mode toggle.
    - _Requirements: 11.2, 11.3, 11.4_

- [x] 17. Build verification
  - [x] 17.1 Run `yarn nx run brightchart-lib:build` and `yarn nx run brightchart-react-components:build` to confirm the libraries compile. Run `yarn nx run brightchart-react-components:lint`. Verify lazy loading works for all workspace modules.
    - _Requirements: 14.1, 14.2, 14.3_
