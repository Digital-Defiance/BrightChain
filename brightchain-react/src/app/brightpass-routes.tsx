/**
 * BrightPassRoutes — Route definitions for the BrightPass password manager.
 *
 * All routes are relative (rendered inside a parent `<Route path="/brightpass/*">`).
 * Wrapped in BrightPassProvider for vault state and PrivateRoute for auth enforcement.
 *
 * Routes:
 *   /brightpass                                  → VaultListView
 *   /brightpass/vault/:vaultId/entries/new       → EntryCreatePlaceholder
 *   /brightpass/vault/:vaultId                   → VaultDetailView
 *   /brightpass/vault/:vaultId/audit             → AuditLogView
 *   /brightpass/tools/generator                  → PasswordGeneratorPage
 *
 * Requirements: 14.1, 14.2
 */

import {
  AuditLogView,
  BrightPassLayout,
  BrightPassProvider,
  PasswordGeneratorPage,
  VaultDetailView,
  VaultListView,
} from '@brightchain/brightpass-react-components';
import { PrivateRoute } from '@digitaldefiance/express-suite-react-components';
import { Box, CircularProgress, Typography } from '@mui/material';
import React, { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

const EntryCreatePlaceholder: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" mt={4}>
    <Typography variant="h5">Create New Entry</Typography>
  </Box>
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
            <Route element={<BrightPassLayout />}>
              <Route index element={<VaultListView />} />
              <Route
                path="vault/:vaultId/entries/new"
                element={<EntryCreatePlaceholder />}
              />
              <Route path="vault/:vaultId" element={<VaultDetailView />} />
              <Route path="vault/:vaultId/audit" element={<AuditLogView />} />
              <Route
                path="tools/generator"
                element={<PasswordGeneratorPage />}
              />
            </Route>
          </Routes>
        </Suspense>
      </PrivateRoute>
    </BrightPassProvider>
  );
};

export default BrightPassRoutes;
