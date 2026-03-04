/**
 * BrightPassRoutes — Route definitions for the BrightPass password manager.
 *
 * All routes are relative (rendered inside a parent `<Route path="/brightpass/*">`).
 * Wrapped in BrightPassProvider for vault state and PrivateRoute for auth enforcement.
 *
 * Routes:
 *   /brightpass                          → VaultListView
 *   /brightpass/vault/:vaultId           → VaultDetailView
 *   /brightpass/vault/:vaultId/audit     → AuditLogView
 *   /brightpass/tools/generator          → PasswordGeneratorPage
 *
 * Requirements: 14.1, 14.2
 */

import { PrivateRoute } from '@digitaldefiance/express-suite-react-components';
import { Box, CircularProgress } from '@mui/material';
import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { BrightPassProvider } from './context/BrightPassProvider';

// Lazy-loaded view components for code splitting.
// These will be implemented in later tasks; the lazy() calls will resolve
// once the corresponding files are created.
const VaultListView = lazy(() => import('./views/VaultListView'));
const VaultDetailView = lazy(() => import('./views/VaultDetailView'));
const AuditLogView = lazy(() => import('./views/AuditLogView'));
const PasswordGeneratorPage = lazy(
  () => import('./views/PasswordGeneratorPage'),
);

const LoadingFallback: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" mt={4}>
    <CircularProgress />
  </Box>
);

const BrightPassRoutes: React.FC = () => {
  return (
    <BrightPassProvider>
      <PrivateRoute>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route index element={<VaultListView />} />
            <Route path="vault/:vaultId" element={<VaultDetailView />} />
            <Route path="vault/:vaultId/audit" element={<AuditLogView />} />
            <Route path="tools/generator" element={<PasswordGeneratorPage />} />
          </Routes>
        </Suspense>
      </PrivateRoute>
    </BrightPassProvider>
  );
};

export default BrightPassRoutes;
