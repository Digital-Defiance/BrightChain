/**
 * OrganizationRoutes — Route definitions for the organizations module.
 *
 * Provides routes for the organization list, invitation redemption,
 * and org-scoped admin pages (settings, members) guarded by OrgAdminGuard.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.5
 *
 * @module organizations/OrganizationRoutes
 */

import { ADMIN } from '@brightchain/brightchart-lib';
import React from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import { AccessDenied } from '../shell/components/AccessDenied';
import { useActiveContext } from '../shell/contexts/ActiveContext';
import { InvitationRedeemForm } from './components/InvitationRedeemForm';
import { MembersManagementPage } from './components/MembersManagementPage';
import { OrganizationListPage } from './components/OrganizationListPage';
import { OrganizationSettingsPage } from './components/OrganizationSettingsPage';

// ─── OrgAdminGuard ──────────────────────────────────────────────────────────

export interface OrgAdminGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard that checks whether the active role is ADMIN at the
 * organization identified by the `:orgId` route param.
 *
 * Renders AccessDenied if the active role is not ADMIN or does not
 * match the target organization.
 */
export const OrgAdminGuard: React.FC<OrgAdminGuardProps> = ({ children }) => {
  const { orgId } = useParams<{ orgId: string }>();
  const { activeRole } = useActiveContext();

  const isAdmin = activeRole.roleCode === ADMIN;
  const orgRef = activeRole.organization?.reference;
  const matchesOrg = orgRef === `Organization/${orgId}`;

  if (isAdmin && matchesOrg) {
    return <>{children}</>;
  }

  return <AccessDenied />;
};

// ─── Route wrappers ─────────────────────────────────────────────────────────

/** Extracts :orgId and renders OrganizationSettingsPage */
const SettingsRoute: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  return <OrganizationSettingsPage organizationId={orgId!} />;
};

/** Extracts :orgId and renders MembersManagementPage */
const MembersRoute: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  return <MembersManagementPage organizationId={orgId!} />;
};

/** Wrapper for InvitationRedeemForm on the standalone redeem route */
const RedeemRoute: React.FC = () => {
  return (
    <InvitationRedeemForm
      onRedeemed={() => {
        // Success is handled by the form's own success message display
      }}
    />
  );
};

// ─── OrganizationRoutes ─────────────────────────────────────────────────────

export const OrganizationRoutes: React.FC = () => (
  <Routes>
    {/* Public to all authenticated members */}
    <Route index element={<OrganizationListPage />} />
    <Route path="redeem" element={<RedeemRoute />} />

    {/* Org-scoped admin routes — guarded by role check */}
    <Route
      path=":orgId/settings"
      element={
        <OrgAdminGuard>
          <SettingsRoute />
        </OrgAdminGuard>
      }
    />
    <Route
      path=":orgId/members"
      element={
        <OrgAdminGuard>
          <MembersRoute />
        </OrgAdminGuard>
      }
    />
  </Routes>
);

export default OrganizationRoutes;
