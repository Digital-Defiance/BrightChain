/**
 * AdminWorkspace — Root component for the admin workspace.
 *
 * @module shell/workspaces/admin/AdminWorkspace
 */

import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { OrganizationRoutes } from '../../../organizations/OrganizationRoutes';
import { AuditLogViewer } from './AuditLogViewer';
import { RoleConfiguration } from './RoleConfiguration';
import { SpecialtyConfiguration } from './SpecialtyConfiguration';
import { UserManagement } from './UserManagement';

export const AdminWorkspace: React.FC = () => {
  return (
    <Routes>
      <Route index element={<UserManagement />} />
      <Route path="users" element={<UserManagement />} />
      <Route path="roles" element={<RoleConfiguration />} />
      <Route path="audit" element={<AuditLogViewer />} />
      <Route path="specialty" element={<SpecialtyConfiguration />} />
      <Route path="organizations/*" element={<OrganizationRoutes />} />
    </Routes>
  );
};
