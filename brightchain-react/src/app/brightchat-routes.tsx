/**
 * BrightChatRoutes — Route definitions for the BrightChat real-time communication system.
 *
 * Uses BrightChatLayout (via BrightChatApp) as the primary layout with
 * ServerRail → ChannelSidebar → ChatArea navigation flow.
 * BrightChatLayoutLegacy is preserved for backward compatibility.
 *
 * All routes are relative (rendered inside a parent `<Route path="/brightchat/*">`).
 * Wrapped in PrivateRoute for auth enforcement.
 *
 * Routes:
 *   /brightchat                              → ConversationListView (index / Home)
 *   /brightchat/groups                       → GroupListView
 *   /brightchat/channels                     → ChannelListView
 *   /brightchat/conversation/:conversationId → MessageThreadView (conversation)
 *   /brightchat/group/:groupId               → MessageThreadView (group)
 *   /brightchat/channel/:channelId           → MessageThreadView (channel)
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 6.1, 8.1, 11.1–11.7, 1.5
 */

import {
  BrightChatApp,
  ChannelListView,
  ConversationListView,
  GroupListView,
  MessageThreadView,
} from '@brightchain/brightchat-react-components';
import { PrivateRoute } from '@digitaldefiance/express-suite-react-components';
import { Box, CircularProgress } from '@mui/material';
import React, { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

const LoadingFallback: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" mt={4}>
    <CircularProgress />
  </Box>
);

export const BrightChatRoutes: React.FC = () => {
  return (
    <PrivateRoute>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route element={<BrightChatApp />}>
            <Route index element={<ConversationListView />} />
            <Route path="groups" element={<GroupListView />} />
            <Route path="channels" element={<ChannelListView />} />
            <Route
              path="conversation/:conversationId"
              element={<MessageThreadView contextType="conversation" />}
            />
            <Route
              path="group/:groupId"
              element={<MessageThreadView contextType="group" />}
            />
            <Route
              path="channel/:channelId"
              element={<MessageThreadView contextType="channel" />}
            />
          </Route>
        </Routes>
      </Suspense>
    </PrivateRoute>
  );
};

export default BrightChatRoutes;
