/**
 * Organizations module — barrel export
 *
 * Exports all components, hooks, services, and route component
 * for the Organization Role Management UI.
 *
 * Requirements: 10.1
 *
 * @module organizations
 */

// Route component
export { OrgAdminGuard, OrganizationRoutes } from './OrganizationRoutes';
export type { OrgAdminGuardProps } from './OrganizationRoutes';

// Components
export { InvitationManagementPanel } from './components/InvitationManagementPanel';
export type { InvitationManagementPanelProps } from './components/InvitationManagementPanel';
export { InvitationRedeemForm } from './components/InvitationRedeemForm';
export type { InvitationRedeemFormProps } from './components/InvitationRedeemForm';
export { MembersManagementPage } from './components/MembersManagementPage';
export type { MembersManagementPageProps } from './components/MembersManagementPage';
export { OrganizationCreateDialog } from './components/OrganizationCreateDialog';
export type { OrganizationCreateDialogProps } from './components/OrganizationCreateDialog';
export { OrganizationListPage } from './components/OrganizationListPage';
export { OrganizationSettingsPage } from './components/OrganizationSettingsPage';
export type { OrganizationSettingsPageProps } from './components/OrganizationSettingsPage';
export { PatientRegistrationFlow } from './components/PatientRegistrationFlow';
export type { PatientRegistrationFlowProps } from './components/PatientRegistrationFlow';
export { StaffAssignmentForm } from './components/StaffAssignmentForm';
export type { StaffAssignmentFormProps } from './components/StaffAssignmentForm';

// Hooks
export { useOrganization } from './hooks/useOrganization';
export { useOrganizations } from './hooks/useOrganizations';
export { useOrgApi } from './hooks/useOrgApi';
export { useOrgMembers } from './hooks/useOrgMembers';

// Services
export { createOrgApiClient, handleApiCall } from './services/orgApi';
export type {
  OrgApiClient,
  OrgListParams,
  OrgListResponse,
  OrgMembersResponse,
} from './services/orgApi';
