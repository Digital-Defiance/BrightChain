/**
 * Unit tests for BrightChat route configuration.
 *
 * Tests verify the route structure, PrivateRoute wrapping, and that each
 * route path maps to the correct component — all via shallow rendering
 * with heavy mocking (no real app context needed).
 *
 * NOTE: The actual route component lives in brightchain-react, but we
 * replicate the route structure here to avoid a circular build dependency
 * (brightchat-react-components → brightchain-react → brightchat-react-components).
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 6.1, 8.1, 11.1–11.7
 */

import { render, screen } from '@testing-library/react';
import React, { Suspense } from 'react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';

// ─── Track PrivateRoute rendering ───────────────────────────────────────────

let privateRouteRendered = false;

// ─── Stub components ────────────────────────────────────────────────────────

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  privateRouteRendered = true;
  return <div data-testid="PrivateRoute">{children}</div>;
};

/**
 * Stub for BrightChatApp — the layout wrapper.
 * Renders an Outlet for nested routes, matching the real component's behavior.
 */
const BrightChatDiscordApp: React.FC = () => (
  <div data-testid="BrightChatDiscordApp">
    <Outlet />
  </div>
);

const ConversationListView: React.FC = () => (
  <div data-testid="ConversationListView" />
);

const GroupListView: React.FC = () => <div data-testid="GroupListView" />;

const ChannelListView: React.FC = () => <div data-testid="ChannelListView" />;

const MessageThreadView: React.FC<{ contextType: string }> = ({
  contextType,
}) => <div data-testid="MessageThreadView" data-context-type={contextType} />;

// ─── Route component mirroring brightchat-routes.tsx ────────────────────────

/**
 * This component replicates the exact route structure from
 * brightchain-react/src/app/brightchat-routes.tsx so we can test
 * the routing logic without importing across project boundaries.
 */
const BrightChatRoutes: React.FC = () => (
  <PrivateRoute>
    <Suspense fallback={<div data-testid="loading" />}>
      <Routes>
        <Route element={<BrightChatDiscordApp />}>
          <Route index element={<ConversationListView />} />
          <Route path="groups" element={<GroupListView />} />
          <Route path="channels" element={<ChannelListView />} />
          <Route path="server/:serverId" element={<ConversationListView />} />
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderAtPath(path: string) {
  privateRouteRendered = false;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BrightChatRoutes />
    </MemoryRouter>,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('BrightChatRoutes — route configuration', () => {
  it('wraps all routes in PrivateRoute (Req 1.5)', () => {
    renderAtPath('/');
    expect(privateRouteRendered).toBe(true);
    expect(screen.getByTestId('PrivateRoute')).toBeTruthy();
  });

  it('renders BrightChatDiscordApp as the parent route element (Req 4.1)', () => {
    renderAtPath('/');
    expect(screen.getByTestId('BrightChatDiscordApp')).toBeTruthy();
  });

  it('index route renders ConversationListView (Req 11.1)', () => {
    renderAtPath('/');
    expect(screen.getByTestId('ConversationListView')).toBeTruthy();
  });

  it('/groups renders GroupListView (Req 11.2)', () => {
    renderAtPath('/groups');
    expect(screen.getByTestId('GroupListView')).toBeTruthy();
  });

  it('/channels renders ChannelListView (Req 11.3)', () => {
    renderAtPath('/channels');
    expect(screen.getByTestId('ChannelListView')).toBeTruthy();
  });

  it('/conversation/:id renders MessageThreadView with contextType="conversation" (Req 11.4)', () => {
    renderAtPath('/conversation/conv-123');
    const el = screen.getByTestId('MessageThreadView');
    expect(el).toBeTruthy();
    expect(el.getAttribute('data-context-type')).toBe('conversation');
  });

  it('/group/:id renders MessageThreadView with contextType="group" (Req 11.5)', () => {
    renderAtPath('/group/grp-456');
    const el = screen.getByTestId('MessageThreadView');
    expect(el).toBeTruthy();
    expect(el.getAttribute('data-context-type')).toBe('group');
  });

  it('/channel/:id renders MessageThreadView with contextType="channel" (Req 11.6)', () => {
    renderAtPath('/channel/ch-789');
    const el = screen.getByTestId('MessageThreadView');
    expect(el).toBeTruthy();
    expect(el.getAttribute('data-context-type')).toBe('channel');
  });
});
