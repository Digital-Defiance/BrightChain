/**
 * BrightMailRoutes — Route definitions for the BrightMail email system.
 *
 * All routes are relative (rendered inside a parent `<Route path="/brightmail/*">`).
 * Wrapped in PrivateRoute for auth enforcement.
 *
 * Routes:
 *   /brightmail                → InboxView
 *   /brightmail/compose        → ComposeView
 *   /brightmail/thread/:id     → ThreadView
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import { BrightMailLayout, ComposeView, InboxView, ThreadView } from '@brightchain/brightmail-react-components';
import { PrivateRoute } from '@digitaldefiance/express-suite-react-components';
import { Box, CircularProgress } from '@mui/material';
import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

const LoadingFallback: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" mt={4}>
    <CircularProgress />
  </Box>
);

export const BrightMailRoutes: React.FC = () => {
  return (
    <PrivateRoute>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route element={<BrightMailLayout />}>
            <Route index element={<InboxView />} />
            <Route path="compose" element={<ComposeView />} />
            <Route path="thread/:messageId" element={<ThreadView />} />
          </Route>
        </Routes>
      </Suspense>
    </PrivateRoute>
  );
};

export default BrightMailRoutes;
