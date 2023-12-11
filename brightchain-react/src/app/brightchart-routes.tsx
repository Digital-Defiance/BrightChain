/**
 * BrightChartRoutes — Route definitions for the BrightChart EHR system.
 *
 * All routes are relative (rendered inside a parent `<Route path="/brightchart/*">`).
 * Wrapped in PrivateRoute for auth enforcement.
 *
 * Healthcare roles are resolved via the useHealthcareRoles hook, which
 * calls the backend API and falls back to RBAC-derived defaults when the
 * endpoint isn't available yet.
 *
 * Requirements: 1.1, 1.4, 3.5, 14.1, 14.3
 */

import {
  ADMIN,
  DENTIST,
  MEDICAL_ASSISTANT,
  PATIENT,
  PHYSICIAN,
  REGISTERED_NURSE,
  VETERINARIAN,
} from '@brightchain/brightchart-lib';
import {
  AdminWorkspace,
  BillingWorkspace,
  BrightChartLayout,
  ClinicianWorkspace,
  FrontDeskWorkspace,
  PatientPortal,
  RoleGuardedRoute,
  useHealthcareRoles,
} from '@brightchain/brightchart-react-components';
import { PrivateRoute } from '@digitaldefiance/express-suite-react-components';
import { Box, CircularProgress } from '@mui/material';
import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

const LoadingFallback: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" mt={4}>
    <CircularProgress />
  </Box>
);

/** Resolve the default workspace redirect path based on the user's primary role. */
function defaultWorkspaceForRole(roleCode: string): string {
  switch (roleCode) {
    case PATIENT:
      return '/brightchart/portal';
    case ADMIN:
      return '/brightchart/admin';
    default:
      return '/brightchart/clinician';
  }
}

/**
 * Inner component that consumes useHealthcareRoles (must be inside AuthProvider).
 */
const BrightChartRoutesInner: React.FC = () => {
  const {
    loading,
    member,
    healthcareRoles,
    initialRole,
    specialtyProfile,
    scopes,
    resolvedPermissions,
  } = useHealthcareRoles();

  if (loading) {
    return <LoadingFallback />;
  }

  const defaultPath = defaultWorkspaceForRole(initialRole.roleCode);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route
          element={
            <BrightChartLayout
              member={member}
              healthcareRoles={healthcareRoles}
              initialRole={initialRole}
              specialtyProfile={specialtyProfile}
              scopes={scopes}
              resolvedPermissions={resolvedPermissions}
            />
          }
        >
          <Route
            path="clinician/*"
            element={
              <RoleGuardedRoute
                allowedRoles={[
                  PHYSICIAN,
                  REGISTERED_NURSE,
                  MEDICAL_ASSISTANT,
                  DENTIST,
                  VETERINARIAN,
                ]}
              >
                <ClinicianWorkspace />
              </RoleGuardedRoute>
            }
          />
          <Route
            path="portal/*"
            element={
              <RoleGuardedRoute allowedRoles={[PATIENT]}>
                <PatientPortal />
              </RoleGuardedRoute>
            }
          />
          <Route
            path="front-desk/*"
            element={
              <RoleGuardedRoute
                allowedRoles={[
                  PHYSICIAN,
                  REGISTERED_NURSE,
                  MEDICAL_ASSISTANT,
                  DENTIST,
                  VETERINARIAN,
                ]}
              >
                <FrontDeskWorkspace />
              </RoleGuardedRoute>
            }
          />
          <Route
            path="billing/*"
            element={
              <RoleGuardedRoute
                allowedRoles={[
                  PHYSICIAN,
                  REGISTERED_NURSE,
                  MEDICAL_ASSISTANT,
                  DENTIST,
                  VETERINARIAN,
                  ADMIN,
                ]}
              >
                <BillingWorkspace />
              </RoleGuardedRoute>
            }
          />
          <Route
            path="admin/*"
            element={
              <RoleGuardedRoute allowedRoles={[ADMIN]}>
                <AdminWorkspace />
              </RoleGuardedRoute>
            }
          />
          {/* Default: redirect to the workspace matching the user's role */}
          <Route path="*" element={<Navigate to={defaultPath} replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export const BrightChartRoutes: React.FC = () => {
  return (
    <PrivateRoute>
      <BrightChartRoutesInner />
    </PrivateRoute>
  );
};

export default BrightChartRoutes;
