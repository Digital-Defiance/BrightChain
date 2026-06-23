/**
 * BrightNexus routes — BSLP geo registry dApp (authenticated publish, public lookup via API).
 */

import { BrightNexusLocationPage } from '@brightchain/brightnexus-react-components';
import { PrivateRoute } from '@digitaldefiance/express-suite-react-components';
import { Box, CircularProgress } from '@mui/material';
import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

const LoadingFallback: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" mt={4}>
    <CircularProgress />
  </Box>
);

export const BrightNexusRoutes: React.FC = () => (
  <Suspense fallback={<LoadingFallback />}>
    <Routes>
      <Route
        path="/"
        element={
          <PrivateRoute>
            <BrightNexusLocationPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default BrightNexusRoutes;
