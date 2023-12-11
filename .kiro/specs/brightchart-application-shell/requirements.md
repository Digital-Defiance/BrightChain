# Requirements Document: BrightChart Application Shell

## Introduction

This module establishes the BrightChart Application Shell — the set of React components, contexts, and route definitions that serve as the unified entry point for all BrightChart users within the existing `brightchain-react` application. Rather than creating a separate Nx application, BrightChart follows the same pattern as BrightMail, BrightPass, BrightHub, BrightChat, and Digital Burnbag: interfaces live in `brightchart-lib`, UI components live in `brightchart-react-components`, and routes are wired into `brightchain-react` via `brightchart-routes.tsx`.

The authenticated user's healthcare role (from the healthcare role layer) and SMART on FHIR v2 scopes determine which views, navigation items, and actions are available. BrightChart uses a `BrightChartLayout` component (analogous to `BrightMailLayout`) that provides its own sub-navigation, permission gating, and workspace switching within the existing BrightChain app shell.

This module consumes the React components from all prior modules (Modules 1–7) and composes them into role-aware workspaces:

- **Clinician Workspace**: Patient list, encounter dashboard, clinical timeline, note editor, order entry, prescription pad, results viewer, schedule calendar — the full clinical toolkit.
- **Patient Portal**: Personal demographics, clinical timeline (read-only), medication list, allergy list, appointment list, upcoming appointment booking, lab results, billing statements, secure messaging.
- **Front Desk Workspace**: Schedule calendar, appointment booking, patient check-in (appointment → encounter bridge), insurance card entry, eligibility verification, waitlist management.
- **Billing Workspace**: Superbill/charge capture, claim builder, claim submission tracking, EOB viewer, patient ledger, fee schedule management.
- **Admin Workspace**: User/role management, ACL configuration, audit log viewer, specialty profile configuration, workflow state configuration, fee schedule management.

The Specialty Adapter drives the entire shell: switching from BrightChart Medical to BrightChart Dental to BrightChart Vet changes the navigation labels, available note templates, billing codes, scheduling defaults, and workflow states — all from configuration, not code changes.

The implementation adds components to `brightchart-react-components`, interfaces to `brightchart-lib`, and routes to `brightchain-react/src/app/brightchart-routes.tsx`. The existing `brightchart-app` Nx application directory is removed since it is not needed.

## Glossary

- **BrightChartLayout**: The top-level layout component (rendered inside `brightchain-react`) providing BrightChart-specific sub-navigation, permission gating, and workspace switching. Analogous to `BrightMailLayout`.
- **Workspace**: A role-specific collection of views and navigation items (e.g., Clinician Workspace, Patient Portal).
- **Permission_Gate**: A React component that conditionally renders children based on the authenticated user's permissions (healthcare role + SMART scopes + pool ACL permissions).
- **Navigation_Config**: A data structure defining the navigation items, routes, and required permissions for each workspace, driven by the active specialty profile.
- **Active_Context**: The current application context including: authenticated member, active healthcare role, active specialty profile, active encounter (if in a clinical session), and active patient (if viewing a patient chart).
- **Patient_Chart**: The clinician-facing view of a single patient's complete record — demographics, clinical timeline, problem list, medication list, allergy list, encounters, documents, orders, results, and billing.
- **Patient_Portal**: The patient-facing view of their own record — demographics, clinical timeline (read-only), medications, allergies, appointments, results, and billing statements.

## Requirements

### Requirement 1: BrightChart Layout and Authentication Integration

**User Story:** As any BrightChart user, I want to access BrightChart as a section within the BrightChain application, with my healthcare role determining which workspace I see.

#### Acceptance Criteria

1. THE `brightchart-react-components` library SHALL export a `BrightChartLayout` component that serves as the layout wrapper for all BrightChart routes, following the same pattern as `BrightMailLayout`.
2. THE `BrightChartLayout` SHALL integrate with the existing BrightChain authentication system (`useAuth` from `@digitaldefiance/express-suite-react-components`) — no separate login page is needed.
3. AFTER the user navigates to `/brightchart`, THE `BrightChartLayout` SHALL resolve the user's healthcare role(s) from the healthcare role layer (IHealthcareRole) and their SMART on FHIR v2 scopes.
4. THE `BrightChartLayout` SHALL select the appropriate workspace based on the user's primary healthcare role: Physician/Dentist/Veterinarian → Clinician Workspace, Patient → Patient Portal, Medical Assistant/Nurse → Clinician Workspace (with reduced permissions), Admin → Admin Workspace. Users with multiple roles SHALL be able to switch between workspaces.
5. THE `BrightChartLayout` SHALL maintain an Active_Context (React context provider) containing: authenticated member, active healthcare role, active specialty profile, active patient (if selected), and active encounter (if in session).
6. THE `BrightChartLayout` SHALL support session timeout awareness by consuming the existing BrightChain session management.

### Requirement 2: Permission-Based View Rendering

**User Story:** As a developer, I want a permission gating system that conditionally renders UI elements based on the user's permissions, so that the same components can be reused across roles with appropriate access control.

#### Acceptance Criteria

1. THE `brightchart-react-components` SHALL export a `PermissionGate` component that accepts: requiredPermissions (array of permission strings from any module's permission enums — PatientPermission, ClinicalPermission, EncounterPermission, DocumentPermission, OrderPermission, SchedulingPermission, BillingPermission), requireAll (boolean, default true — whether all or any permissions are required), and fallback (optional ReactNode to render when permission is denied).
2. THE PermissionGate SHALL evaluate permissions by checking the user's SMART scopes and the relevant pool ACL (PatientACL, ClinicalACL, EncounterACL, DocumentACL, OrderACL, SchedulingACL, BillingACL) for the required permissions.
3. WHEN the user has the required permissions, THE PermissionGate SHALL render its children. WHEN the user lacks permissions, THE PermissionGate SHALL render the fallback (or nothing).
4. THE `brightchart-react-components` SHALL export a `usePermissions()` hook that returns: hasPermission(permission): boolean, hasAnyPermission(permissions): boolean, hasAllPermissions(permissions): boolean, and the current user's resolved permission set.
5. THE `brightchart-react-components` SHALL export a `PermissionGuardedRoute` component for React Router that redirects to an "access denied" view when the user lacks route-level permissions.

### Requirement 3: Navigation and Routing

**User Story:** As any BrightChart user, I want navigation that shows only the sections I have access to, organized by my role and specialty.

#### Acceptance Criteria

1. THE `brightchart-lib` SHALL define an `INavigationConfig` interface with fields: items (array of INavigationItem), specialtyCode (string), roleCode (string).
2. THE `INavigationItem` interface SHALL have fields: id (string), label (string), icon (string or ReactNode), route (string), requiredPermissions (string[]), children (optional INavigationItem[] for sub-navigation), badge (optional ReactNode for notification counts), and visible (boolean, computed from permissions).
3. THE `BrightChartLayout` SHALL provide predefined navigation configs for each workspace: Clinician (Patients, Schedule, Inbox, Reports), Patient Portal (My Health, Appointments, Messages, Billing), Front Desk (Schedule, Check-In, Waitlist, Insurance), Billing (Superbills, Claims, Payments, Ledger), Admin (Users, Roles, Audit, Settings).
4. THE navigation SHALL be specialty-aware: labels and available items change based on the active specialty profile (e.g., "Patients" becomes "Clients" in veterinary, "Operatory View" appears in dental).
5. THE `brightchart-routes.tsx` in `brightchain-react` SHALL use React Router for client-side routing with lazy-loaded workspace modules for performance.

### Requirement 4: Clinician Workspace

**User Story:** As a clinician (physician, dentist, veterinarian, nurse, MA), I want a workspace with all the clinical tools I need to see patients, write notes, enter orders, and manage my schedule.

#### Acceptance Criteria

1. THE Clinician Workspace SHALL include the following views, each gated by appropriate permissions:
   - **Patient List**: Searchable patient list using PatientSearchForm (Module 1). Requires PatientPermission.Read.
   - **Patient Chart**: Full patient record view (see Requirement 6). Requires PatientPermission.Read + ClinicalPermission.ClinicalRead.
   - **Encounter Dashboard**: Today's encounters using EncounterList + EncounterWorkflowBoard (Module 3). Requires EncounterPermission.EncounterRead.
   - **Schedule**: Provider's schedule using ScheduleCalendar (Module 6). Requires SchedulingPermission.SchedulingRead.
   - **Inbox/Tasks**: Pending results, unsigned notes, messages. Requires DocumentPermission.DocumentRead + OrderPermission.OrderRead.
2. THE Clinician Workspace SHALL display a "Today's Patients" summary on the dashboard showing: scheduled appointments, in-progress encounters, and pending tasks (unsigned notes, unreviewed results).
3. THE Clinician Workspace SHALL support quick-launch actions: New Encounter, New Note, New Order, New Prescription — each gated by the appropriate write permission.
4. THE Clinician Workspace navigation SHALL adapt to specialty: dental adds "Operatory View" and "Treatment Plans", veterinary adds "Species Filter" and "Farm Calls".

### Requirement 5: Patient Portal

**User Story:** As a patient, I want a portal where I can view my health records, manage appointments, see test results, and review billing statements.

#### Acceptance Criteria

1. THE Patient Portal SHALL include the following views, all scoped to the authenticated patient's own data:
   - **My Health Summary**: ClinicalTimeline (Module 2) showing the patient's clinical data in reverse chronological order. Read-only.
   - **Medications**: MedicationList (Module 2) showing current and past medications. Read-only.
   - **Allergies**: AllergyList (Module 2) showing allergy/intolerance records. Read-only.
   - **Conditions**: ConditionList (Module 2) showing active and resolved conditions. Read-only.
   - **Appointments**: List of upcoming and past appointments using EncounterList/appointment data (Module 6). Patients can request new appointments.
   - **Test Results**: ResultsList + ResultsViewer (Module 5) showing lab and diagnostic results. Read-only with abnormal flagging.
   - **Documents**: DocumentList (Module 4) showing clinical notes and documents shared with the patient. Read-only.
   - **Billing**: PatientLedgerView (Module 7) showing charges, payments, and balance. Read-only.
2. THE Patient Portal SHALL enforce that patients can ONLY view their own data — the Active_Context patient ID SHALL always equal the authenticated member's patient ID.
3. THE Patient Portal SHALL display a health summary dashboard with: next appointment, active medications count, recent results (with abnormal flags), and outstanding balance.
4. THE Patient Portal SHALL support patient self-scheduling: viewing available slots and requesting appointments (emitting an Appointment with status "proposed" for staff confirmation).
5. THE Patient Portal navigation SHALL use patient-friendly language: "My Health" not "Clinical Timeline", "Test Results" not "DiagnosticReports", "Bills & Payments" not "Patient Ledger".

### Requirement 6: Patient Chart (Clinician View)

**User Story:** As a clinician, I want a comprehensive patient chart view that aggregates all clinical data for a single patient across all modules.

#### Acceptance Criteria

1. THE Patient Chart SHALL be a tabbed or sectioned view containing:
   - **Demographics**: PatientDemographicsCard (Module 1) with edit capability (gated by PatientPermission.Write).
   - **Clinical Timeline**: ClinicalTimeline (Module 2) with all clinical resources.
   - **Problems**: ConditionList (Module 2) with add/edit (gated by ClinicalPermission.ClinicalWrite).
   - **Medications**: MedicationList (Module 2) + active prescriptions from OrderList (Module 5).
   - **Allergies**: AllergyList (Module 2) with add/edit (gated by ClinicalPermission.ClinicalWrite).
   - **Encounters**: EncounterList (Module 3) with encounter detail drill-down.
   - **Documents**: DocumentList (Module 4) with note creation (gated by DocumentPermission.DocumentWrite).
   - **Orders**: OrderList (Module 5) with order entry (gated by OrderPermission.OrderWrite).
   - **Results**: ResultsList (Module 5) with results viewer.
   - **Appointments**: Upcoming appointments from scheduling data (Module 6).
   - **Insurance**: Coverage list with InsuranceCardEditor (Module 7, gated by BillingPermission.BillingWrite).
   - **Billing**: PatientLedgerView (Module 7, gated by BillingPermission.BillingRead).
2. THE Patient Chart SHALL display a header bar with: patient name, age, gender, MRN, active allergies (high-criticality highlighted), and photo placeholder.
3. THE Patient Chart SHALL support starting a new encounter from the chart (creating an Encounter linked to the patient).
4. THE Patient Chart SHALL accept the active specialty profile and pass it to all child components for specialty-aware rendering.

### Requirement 7: Front Desk Workspace

**User Story:** As front desk staff, I want a workspace focused on scheduling, patient check-in, and insurance verification.

#### Acceptance Criteria

1. THE Front Desk Workspace SHALL include:
   - **Schedule View**: ScheduleCalendar (Module 6) for all providers/locations. Requires SchedulingPermission.SchedulingRead.
   - **Check-In**: EncounterCheckInForm (Module 3) for transitioning appointments to encounters. Requires EncounterPermission.EncounterWrite.
   - **Appointment Booking**: AppointmentBookingForm (Module 6). Requires SchedulingPermission.SchedulingWrite.
   - **Waitlist**: WaitlistManager (Module 6). Requires SchedulingPermission.SchedulingWrite.
   - **Insurance**: InsuranceCardEditor + EligibilityChecker (Module 7). Requires BillingPermission.BillingWrite.
   - **Patient Registration**: PatientCreateEditForm (Module 1). Requires PatientPermission.Write.
2. THE Front Desk Workspace dashboard SHALL show: today's appointment count, checked-in patients, waitlist count, and pending eligibility verifications.

### Requirement 8: Billing Workspace

**User Story:** As a billing specialist, I want a workspace focused on charge capture, claim management, and payment processing.

#### Acceptance Criteria

1. THE Billing Workspace SHALL include:
   - **Superbills**: List of encounter superbills with SuperbillForm (Module 7). Requires BillingPermission.BillingWrite.
   - **Claims**: Claim list with ClaimBuilder (Module 7). Requires BillingPermission.BillingWrite.
   - **Claim Tracking**: Submitted claim status dashboard. Requires BillingPermission.BillingRead.
   - **EOBs**: EOB list with EOBViewer (Module 7). Requires BillingPermission.BillingRead.
   - **Payments**: Payment posting interface. Requires BillingPermission.BillingWrite.
   - **Patient Ledger**: PatientLedgerView (Module 7). Requires BillingPermission.BillingRead.
   - **Fee Schedules**: Fee schedule viewer/editor. Requires BillingPermission.BillingAdmin.
2. THE Billing Workspace dashboard SHALL show: unbilled encounters, pending claims, denied claims requiring action, and today's payment total.

### Requirement 9: Admin Workspace

**User Story:** As an administrator, I want a workspace for managing users, roles, permissions, audit logs, and system configuration.

#### Acceptance Criteria

1. THE Admin Workspace SHALL include:
   - **User Management**: List of BrightChain members with healthcare role assignment. Requires PatientPermission.Admin.
   - **Role Configuration**: Healthcare role editor with SMART scope assignment. Requires PatientPermission.Admin.
   - **ACL Management**: Pool ACL editors for all module pools (patient, clinical, encounter, document, order, scheduling, billing). Requires the respective Admin permission for each pool.
   - **Audit Log Viewer**: Searchable audit log across all modules. Requires ClinicalPermission.ClinicalAdmin.
   - **Specialty Configuration**: Active specialty profile selector and workflow state editor (Module 3). Requires EncounterPermission.EncounterAdmin.
   - **System Settings**: Fee schedule management, reminder configuration, e-prescribing settings. Requires BillingPermission.BillingAdmin.
2. THE Admin Workspace SHALL be accessible only to users with at least one Admin-level permission.

### Requirement 10: Specialty-Driven Theming and Labeling

**User Story:** As a practice owner, I want the application to reflect my specialty (medical, dental, veterinary) in its branding, terminology, and available features.

#### Acceptance Criteria

1. THE `BrightChartLayout` SHALL accept an active ISpecialtyProfile (from Module 2) that drives: sub-application title ("BrightChart Medical" / "BrightChart Dental" / "BrightChart Vet"), navigation labels, available note templates, billing code systems, scheduling defaults, and workflow states.
2. THE `BrightChartLayout` SHALL support switching specialty profiles at the admin level (not per-session — this is a practice-wide setting).
3. THE `BrightChartLayout` SHALL pass the active specialty profile to all workspace views and child components via React context.
4. THE `BrightChartLayout` SHALL support specialty-specific color themes: medical (blue), dental (teal), veterinary (green) — configurable via CSS custom properties.

### Requirement 11: Responsive Layout and Accessibility

**User Story:** As any user, I want the application to work on desktop, tablet, and mobile devices, and to be accessible to users with disabilities.

#### Acceptance Criteria

1. THE `BrightChartLayout` SHALL use a responsive layout that adapts to desktop (sidebar navigation + main content), tablet (collapsible sidebar + main content), and mobile (bottom navigation + full-width content).
2. THE `BrightChartLayout` SHALL meet WCAG 2.1 AA accessibility guidelines including: keyboard navigation, screen reader support (ARIA labels), sufficient color contrast, focus indicators, and skip-to-content links.
3. THE `BrightChartLayout` SHALL support a high-contrast mode toggle for clinical environments with varying lighting.
4. ALL interactive elements SHALL have visible focus states and be operable via keyboard alone.

### Requirement 12: Offline Indicator and Sync Status

**User Story:** As a clinician working in environments with intermittent connectivity, I want to see the application's online/offline status and sync state.

#### Acceptance Criteria

1. THE `BrightChartLayout` SHALL display a persistent connectivity indicator showing online/offline status.
2. WHEN offline, THE `BrightChartLayout` SHALL display a banner indicating which features are available from the offline cache (from Module 1's IOfflineCache) and which require connectivity.
3. WHEN connectivity is restored, THE `BrightChartLayout` SHALL display sync progress and any conflict notifications.

### Requirement 13: Notification System

**User Story:** As any user, I want in-app notifications for events relevant to my role (new results, unsigned notes, appointment reminders, claim status changes).

#### Acceptance Criteria

1. THE `brightchart-lib` SHALL define an `INotification` interface with fields: id (string), type (NotificationType: result, note, appointment, claim, message, system), title (string), body (string), timestamp (Date), read (boolean), actionRoute (optional string — route to navigate to when clicked), priority (normal, urgent).
2. THE `BrightChartLayout` SHALL provide a notification bell/badge in the sub-header showing unread notification count.
3. THE `BrightChartLayout` SHALL provide a notification panel listing recent notifications with mark-as-read and click-to-navigate functionality.
4. THE notification types SHALL be permission-gated: clinicians see result/note notifications, patients see appointment/result notifications, billing staff see claim notifications.

### Requirement 14: Library Structure

**User Story:** As a developer, I want the BrightChart shell organized following the established workspace patterns.

#### Acceptance Criteria

1. THE BrightChart shell SHALL follow the same pattern as BrightMail, BrightHub, etc.: interfaces in `brightchart-lib`, components in `brightchart-react-components`, routes in `brightchain-react/src/app/brightchart-routes.tsx`.
2. THE `brightchart-react-components` SHALL organize shell code under: `src/lib/shell/` (BrightChartLayout, contexts, permission components), `src/lib/shell/workspaces/` (clinician, patient, frontDesk, billing, admin), `src/lib/shell/components/` (shared shell components — navigation, notifications, headers), and `src/lib/shell/hooks/` (usePermissions, useActiveContext, useSpecialty, useNotifications).
3. THE `brightchart-routes.tsx` SHALL use lazy loading for workspace modules to minimize initial bundle size.
4. THE empty `brightchart-app` directory SHALL be removed since it is not needed.
