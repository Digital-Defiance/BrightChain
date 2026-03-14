/**
 * BrightChatRoutes — Route definitions for the BrightChat real-time communication system.
 *
 * All routes are relative (rendered inside a parent `<Route path="/brightchat/*">`).
 * Wrapped in PrivateRoute for auth enforcement.
 *
 * Routes:
 *   /brightchat                              → ConversationListView (index)
 *   /brightchat/groups                       → GroupListView
 *   /brightchat/channels                     → ChannelListView
 *   /brightchat/conversation/:conversationId → MessageThreadView (conversation)
 *   /brightchat/group/:groupId               → MessageThreadView (group)
 *   /brightchat/channel/:channelId           → MessageThreadView (channel)
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 1.5
 */

import {
  BrightChatLayout,
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
          <Route element={<BrightChatLayout />}>
            <Route index element={<ConversationListView />} />
            <Route path="groups" element={<GroupListView />} />
            <Route path="channels" element={<ChannelListView />} />
            <Route path="conversation/:conversationId" element={<MessageThreadView contextType="conversation" />} />
            <Route path="group/:groupId" element={<MessageThreadView contextType="group" />} />
            <Route path="channel/:channelId" element={<MessageThreadView contextType="channel" />} />
          </Route>
        </Routes>
      </Suspense>
    </PrivateRoute>
  );
};

export default BrightChatRoutes;
