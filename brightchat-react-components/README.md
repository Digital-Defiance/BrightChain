# @brightchain/brightchat-react-components

#
<!--
  NOTE: This documentation is auto-synced with the implementation.
  Any changes to the code should be reflected here immediately.
  If you update the code, update this file as well.
-->
#
<!--
  NOTE: This documentation is auto-synced with the implementation.
  Any changes to the code should be reflected here immediately.
  If you update the code, update this file as well.
-->
#
<!--
  NOTE: This documentation is auto-synced with the implementation.
  Any changes to the code should be reflected here immediately.
  If you update the code, update this file as well.
-->
#
<!--
  NOTE: This documentation is auto-synced with the implementation.
  Any changes to the code should be reflected here immediately.
  If you update the code, update this file as well.
-->
#
<!--
  NOTE: This documentation is auto-synced with the implementation.
  Any changes to the code should be reflected here immediately.
  If you update the code, update this file as well.
-->

React component library for **BrightChat** — the real-time communication frontend for [BrightChain](https://github.com/Digital-Defiance/BrightChain). Provides direct messages, group chats, and channel-based conversations with WebSocket-driven live updates.

## Architecture

```
BrightChatProvider (context)
  └─ BrightChatLayout (responsive shell)
       ├─ ChatSidebar (navigation drawer)
       ├─ <Outlet /> (routed views)
       │    ├─ ConversationListView
       │    ├─ GroupListView
       │    ├─ ChannelListView
       │    └─ MessageThreadView + ComposeArea
       └─ Detail panel (≥1280px)
```

**Key layers:**

| Layer | Module | Purpose |
|-------|--------|---------|
| Context | `BrightChatContext.tsx` | Shared UI state — active chat, sidebar, compose area, presence |
| API Client | `services/chatApi.ts` | Typed factory wrapping Axios for all REST endpoints |
| WebSocket | `hooks/useChatWebSocket.ts` | Real-time event subscription (messages, typing, reactions, presence) |
| Hook | `hooks/useChatApi.ts` | Memoized API client via `useAuthenticatedApi()` |

## Components

| Component | File | Description |
|-----------|------|-------------|
| `BrightChatProvider` | `BrightChatContext.tsx` | Context provider for sidebar state (sessionStorage-persisted), compose state machine, presence status, and active chat context |
| `BrightChatLayout` | `BrightChatLayout.tsx` | Three-panel layout with ServerRail, ChannelSidebar, ChatArea, and sub-AppBar breadcrumb navigation |
| `ChatSidebar` | `ChatSidebar.tsx` | Navigation drawer with Conversations / Groups / Channels sections, active route highlighting, unread badges |
| `ConversationListView` | `ConversationListView.tsx` | DM conversations sorted by `lastMessageAt` desc, cursor-based pagination |
| `GroupListView` | `GroupListView.tsx` | Member's groups with name, member count, last activity |
| `ChannelListView` | `ChannelListView.tsx` | Discoverable channels (public + private visibility), "Join" action for public channels |
| `MessageThreadView` | `MessageThreadView.tsx` | Shared message view for all three context types — chronological messages, typing indicators, reactions, pin/edit indicators, real-time updates via WebSocket |
| `ComposeArea` | `ComposeArea.tsx` | Message input with context-aware endpoint routing, empty input validation, privacy-preserving 404 errors |

## Routes

All routes are nested under `/brightchat` and wrapped in `PrivateRoute` + `Suspense`:

| Route | View |
|-------|------|
| `/brightchat` | `ConversationListView` (index) |
| `/brightchat/groups` | `GroupListView` |
| `/brightchat/channels` | `ChannelListView` |
| `/brightchat/conversation/:conversationId` | `MessageThreadView` (conversation) |
| `/brightchat/group/:groupId` | `MessageThreadView` (group) |
| `/brightchat/channel/:channelId` | `MessageThreadView` (channel) |

## Usage

Wrap your app (or route subtree) with `BrightChatProvider`, then use the exported hooks and components:

```tsx
import {
  BrightChatProvider,
  BrightChatLayout,
  ConversationListView,
  MessageThreadView,
  useBrightChat,
  useChatApi,
  useChatWebSocket,
} from '@brightchain/brightchat-react-components';
```

The API client is created automatically from the authenticated Axios instance:

```tsx
const chatApi = useChatApi();

// Send a direct message
await chatApi.sendDirectMessage({ recipientId: '...', content: 'Hello!' });

// List conversations with pagination
const result = await chatApi.listConversations({ cursor, limit: 20 });
```

Subscribe to real-time events:

```tsx
useChatWebSocket({
  onMessageSent: (msg) => setMessages((prev) => [msg, ...prev]),
  onTypingStart: ({ memberId }) => setTyping((s) => new Set(s).add(memberId)),
  onPresenceChanged: ({ memberId, status }) => updatePresence(memberId, status),
});
```

## API Client

`createChatApiClient(api: AxiosInstance)` returns a fully typed client covering:

- **Conversations** — `sendDirectMessage`, `listConversations`, `getConversationMessages`, `deleteMessage`, `promoteToGroup`
- **Groups** — `createGroup`, `getGroup`, `sendGroupMessage`, `getGroupMessages`, `addGroupMembers`, `removeGroupMember`, `leaveGroup`, `assignGroupRole`, reactions, edit, pin/unpin
- **Channels** — `createChannel`, `listChannels`, `getChannel`, `updateChannel`, `deleteChannel`, `joinChannel`, `leaveChannel`, `sendChannelMessage`, `getChannelMessages`, `searchChannelMessages`, `createInvite`, `redeemInvite`, `assignChannelRole`, `muteChannelMember`, `kickChannelMember`, reactions, edit, pin/unpin

All methods return typed `IApiEnvelope<T>` responses. Errors are extracted via `handleApiCall` — no raw Axios errors leak to callers.

## WebSocket Events

The `useChatWebSocket` hook handles all `CommunicationEventType` events:

| Event | Handler | Effect |
|-------|---------|--------|
| `message_sent` | `onMessageSent` | Prepend new message to thread |
| `message_edited` | `onMessageEdited` | Update message content in place |
| `message_deleted` | `onMessageDeleted` | Remove message from thread |
| `typing_start` / `typing_stop` | `onTypingStart` / `onTypingStop` | Show/hide typing indicators |
| `reaction_added` / `reaction_removed` | `onReactionAdded` / `onReactionRemoved` | Update message reactions |
| `presence_changed` | `onPresenceChanged` | Update member presence status |
| `member_joined` / `member_left` | `onMemberJoined` / `onMemberLeft` | Update member lists |

Reconnection uses exponential backoff. Malformed payloads are logged and silently ignored.

## Testing

The library includes both unit tests and property-based tests (via [fast-check](https://github.com/dubzzz/fast-check)):

- **12 test suites** across unit and property test files
- **94+ tests** covering components, services, hooks, and routing
- **22 correctness properties** validating universal invariants (sorting, state machines, round-trips, endpoint routing, error handling)

Test files live in `src/lib/__tests__/`:

| File | Coverage |
|------|----------|
| `BrightChatContext.spec.ts` | Context provider, error on misuse, sessionStorage fallback |
| `BrightChatContext.property.ts` | Sidebar round-trip, compose state machine, presence round-trip |
| `chatApi.spec.ts` | All API methods, HTTP verbs, URLs, error codes |
| `chatApi.property.ts` | Role assignment, channel update fields, reaction routing, pagination, error handling |
| `ConversationListView.spec.tsx` | Conversation sorting by activity |
| `GroupListView.spec.tsx` | Group list required fields |
| `ChannelListView.spec.tsx` | Channel visibility filtering |
| `MessageThreadView.spec.tsx` | Chronological ordering, edit/pin indicators |
| `websocket.property.ts` | All 7 WebSocket event properties |
| `privacyErrors.property.ts` | Privacy-preserving 404 error messages |
| `searchResults.property.ts` | Search result relevance ordering |
| `routes.spec.tsx` | Route → component mapping, PrivateRoute wrapping |

## Build Commands

```bash
# Build
yarn nx build brightchat-react-components

# Test
yarn nx test brightchat-react-components

# Lint
yarn nx lint brightchat-react-components
```

## Dependencies

| Dependency | Role |
|------------|------|
| `@brightchain/brightchain-lib` | Shared data types (`IConversation`, `IGroup`, `IChannel`, `ICommunicationMessage`, enums) |
| `@brightchain/brightchat-lib` | Request parameter interfaces (`SendDirectMessageParams`, etc.) |
| `@digitaldefiance/express-suite-react-components` | `PrivateRoute`, `useAuthenticatedApi`, `AuthenticatedApiProvider` |
| `@mui/material` | UI components (Drawer, Box, IconButton, etc.) |
| `react-router-dom` | Client-side routing (`useParams`, `Outlet`, `Routes`) |

## License

MIT — [Digital Defiance](https://github.com/Digital-Defiance)
