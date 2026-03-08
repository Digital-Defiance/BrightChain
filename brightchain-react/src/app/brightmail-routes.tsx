/**
 * BrightMailRoutes — Route definitions for the BrightMail email system.
 *
 * All routes are relative (rendered inside a parent `<Route path="/brightmail/*">`).
 * Wrapped in PrivateRoute for auth enforcement.
 *
 * Routes:
 *   /brightmail                → InboxView (inbox folder)
 *   /brightmail/sent           → InboxView (sent folder)
 *   /brightmail/drafts         → InboxView (drafts folder)
 *   /brightmail/trash          → InboxView (trash folder)
 *   /brightmail/thread/:id     → ThreadView
 *
 * Compose is handled by ComposeModal overlay (no dedicated route).
 *
 * Requirements: 1.3, 1.7, 3.1, 3.2, 3.3
 */

import { BrightMailLayout, InboxView, ThreadView } from '@brightchain/brightmail-react-components';
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
            <Route path="sent" element={<InboxView folder="sent" />} />
            <Route path="drafts" element={<InboxView folder="drafts" />} />
            <Route path="trash" element={<InboxView folder="trash" />} />
            <Route path="thread/:messageId" element={<ThreadView />} />
          </Route>
        </Routes>
      </Suspense>
    </PrivateRoute>
  );
};

export default BrightMailRoutes;
