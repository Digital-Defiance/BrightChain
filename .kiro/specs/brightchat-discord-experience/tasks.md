# Implementation Plan: BrightChat Discord Experience

## Overview

This plan implements a Discord-style Server concept and three-panel navigation UI for BrightChat. Work proceeds bottom-up: data interfaces → service logic → API controller → frontend state → UI components, ensuring each step builds on the previous with no orphaned code.

## Tasks

- [x] 1. Define Server data interfaces in brightchain-lib
  - [x] 1.1 Create IServer, IServerCategory, IServerInviteToken, and IServerUpdate interfaces
    - Add `brightchain-lib/src/lib/interfaces/communication/server.ts`
    - Define `IServer<TId, TData>` with fields: id, name, iconUrl, ownerId, memberIds, channelIds, categories, createdAt, updatedAt
    - Define `IServerCategory<TId>` with fields: id, name, position, channelIds
    - Define `IServerInviteToken<TId>` with fields: token, serverId, createdBy, createdAt, expiresAt, maxUses, currentUses
    - Define `IServerUpdate` with optional name, iconUrl, categories
    - Export from `brightchain-lib/src/lib/interfaces/communication.ts` barrel
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Extend IChannel with optional serverId field
    - Add `serverId?: TId` to the existing `IChannel<TId, TData>` interface in `brightchain-lib/src/lib/interfaces/communication.ts`
    - _Requirements: 1.4_

  - [x] 1.3 Add Server response types to communicationResponses.ts
    - Add `ICreateServerResponse`, `IListServersResponse`, `IGetServerResponse`, `IUpdateServerResponse`, `IDeleteServerResponse`, `IAddServerMembersResponse`, `IRemoveServerMemberResponse`, `ICreateServerInviteResponse`, `IRedeemServerInviteResponse`
    - Export from barrel
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2_

  - [x] 1.4 Extend IChatStorageProvider with servers and serverInvites collections
    - Add `readonly servers: IChatCollection<IServer>` and `readonly serverInvites: IChatCollection<IServerInviteToken>` to `IChatStorageProvider`
    - _Requirements: 1.1, 2.1_

  - [x] 1.5 Add new WebSocket event types for server events
    - Add `SERVER_CHANNEL_CREATED`, `SERVER_CHANNEL_DELETED`, `SERVER_MEMBER_JOINED`, `SERVER_MEMBER_REMOVED`, `SERVER_UPDATED` to `CommunicationEventType` enum
    - Add `IServerChannelCreatedEvent`, `IServerChannelDeletedEvent`, `IServerMemberJoinedEvent`, `IServerMemberRemovedEvent` interfaces to `communicationEvents.ts`
    - Update the `CommunicationEvent` union type
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 2. Implement ServerService in brightchain-lib
  - [x] 2.1 Create ServerService class with CRUD operations
    - Add `brightchain-lib/src/lib/services/communication/serverService.ts`
    - Implement constructor accepting channelService, storageProvider, eventEmitter
    - Implement `createServer` (generates default "General" category + "general" channel)
    - Implement `getServer`, `updateServer`, `deleteServer`, `listServersForMember`
    - Add error classes: `ServerNotFoundError`, `ServerPermissionError`, `NotServerMemberError`, `ServerNameValidationError`, `MemberAlreadyInServerError`
    - Export from `brightchain-lib/src/lib/services/communication/index.ts`
    - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.2 Implement membership management in ServerService
    - Implement `addMembers` (validates caller role, adds to memberIds, no duplicates)
    - Implement `removeMember` (validates caller role, removes from server and all server channels, emits event)
    - Implement `getMemberRole`
    - _Requirements: 2.7, 2.8_

  - [x] 2.3 Implement invite system in ServerService
    - Implement `createInvite` (generates unique token, optional expiration and maxUses)
    - Implement `redeemInvite` (validates token, checks expiration/maxUses, adds user to server)
    - Add error classes: `ServerInviteExpiredError`, `ServerInviteNotFoundError`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.4 Implement channel management within server
    - Implement `createChannelInServer` (creates channel via ChannelService, assigns serverId, adds to category)
    - Implement `removeChannelFromServer` (deletes channel, removes from category, emits event)
    - _Requirements: 1.3, 1.4, 7.2_

  - [x] 2.5 Write property tests for ServerService (Properties 1-8)
    - **Property 1: Server creation produces default category and channel**
    - **Property 2: Channel serverId matches parent server**
    - **Property 3: Server listing membership filter**
    - **Property 4: Server mutation authorization**
    - **Property 5: Adding members grows server membership**
    - **Property 6: Member removal cascades to server channels**
    - **Property 7: Invite token uniqueness**
    - **Property 8: Invite redemption round-trip with max-use enforcement**
    - **Validates: Requirements 1.3, 1.4, 2.2, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3**

  - [x] 2.6 Write unit tests for ServerService
    - Test server CRUD happy paths
    - Test error conditions (not found, permission denied, name validation)
    - Test cascade delete (server + all channels)
    - _Requirements: 1.1, 1.3, 2.1, 2.4, 2.5, 2.6_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add Server request params to brightchat-lib
  - [x] 4.1 Create server request parameter interfaces
    - Add `CreateServerParams`, `UpdateServerParams`, `CreateServerInviteParams`, `AddServerMembersParams` to `brightchat-lib/src/lib/interfaces/chatRequests.ts`
    - Export from `brightchat-lib/src/index.ts`
    - _Requirements: 2.1, 2.4, 2.7, 3.1_

- [x] 5. Implement ServerController in brightchain-api-lib
  - [x] 5.1 Create ServerController extending BaseController
    - Add `brightchain-api-lib/src/lib/controllers/api/servers.ts`
    - Mount at `/brightchat/servers`
    - Implement routes: POST `/`, GET `/`, GET `/:serverId`, PUT `/:serverId`, DELETE `/:serverId`
    - Implement routes: POST `/:serverId/members`, DELETE `/:serverId/members/:memberId`
    - Implement routes: POST `/:serverId/invites`, POST `/:serverId/invites/:token/redeem`
    - Wire into `ApiRouter` in `brightchain-api-lib/src/lib/routers/api.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4_

  - [x] 5.2 Write integration tests for ServerController
    - Test server CRUD via HTTP
    - Test invite creation and redemption flow
    - Test authorization (403 for non-owner delete, non-admin update)
    - _Requirements: 2.1, 2.3, 2.6, 3.1, 3.2_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Extend frontend chatApi client with server endpoints
  - [x] 7.1 Add server API methods to createChatApiClient
    - Add `createServer`, `listServers`, `getServer`, `updateServer`, `deleteServer`
    - Add `addServerMembers`, `removeServerMember`
    - Add `createServerInvite`, `redeemServerInvite`
    - All methods use existing `handleApiCall` pattern
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 3.1, 3.2_

- [x] 8. Extend BrightChatContext with server navigation state
  - [x] 8.1 Add activeServerId and server channel caching to context
    - Add `activeServerId`, `setActiveServerId`, `serverChannels`, `serverCategories` to `BrightChatContextValue`
    - Implement sessionStorage persistence for `brightchat:activeServerId` and `brightchat:activeChannelId`
    - Implement server channel/category fetching when `activeServerId` changes
    - Implement state restoration on mount (with membership check)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 8.2 Write property tests for state management helpers (Properties 22-23)
    - **Property 22: SessionStorage navigation state round-trip**
    - **Property 23: Conditional state restoration based on membership**
    - **Validates: Requirements 11.3, 11.4**

- [x] 9. Extend useChatWebSocket with server event handlers
  - [x] 9.1 Add server event transform functions and WebSocket handlers
    - Implement `applyServerChannelCreated`, `applyServerChannelDeleted`, `applyServerMemberJoined`, `applyServerMemberRemoved` pure transform functions
    - Wire into existing `useChatWebSocket` hook to handle new event types
    - On `SERVER_MEMBER_REMOVED` where memberId is current user: remove server from list, navigate to Home
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 9.2 Write property tests for WebSocket state transforms (Properties 18-21)
    - **Property 18: Channel-created state transform**
    - **Property 19: Channel-deleted state transform**
    - **Property 20: Member-joined state transform**
    - **Property 21: Server removal on member-removed event**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

- [x] 10. Implement PresenceIndicator component
  - [x] 10.1 Create PresenceIndicator component
    - Add `brightchat-react-components/src/lib/PresenceIndicator.tsx`
    - Render colored dot badge based on PresenceStatus (green/yellow/red/gray)
    - Support `size` prop (small/medium)
    - Export from barrel
    - _Requirements: 9.1, 9.2_

  - [x] 10.2 Write property test for presence color mapping (Property 15)
    - **Property 15: Presence status color mapping**
    - **Validates: Requirements 9.2**

  - [x] 10.3 Write property tests for presence logic (Properties 16-17)
    - **Property 16: Presence change state transform**
    - **Property 17: DND notification suppression**
    - **Validates: Requirements 9.3, 9.5**

- [x] 11. Implement ServerRail component
  - [x] 11.1 Create ServerRail component
    - Add `brightchat-react-components/src/lib/ServerRail.tsx`
    - 72px wide vertical strip with circular server icons
    - Home icon at top, "+" Create Server button at bottom
    - Active server pill indicator
    - Keyboard navigation (ArrowUp/ArrowDown with wrapping)
    - Tooltip on hover for server names
    - Export from barrel
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7_

  - [x] 11.2 Write property test for keyboard navigation (Property 10)
    - **Property 10: Keyboard navigation index wrapping**
    - **Validates: Requirements 4.7**

  - [x] 11.3 Write unit tests for ServerRail
    - Test rendering of server icons
    - Test Home icon click navigates to DM view
    - Test active server highlighting
    - _Requirements: 4.2, 4.4_

- [x] 12. Implement ChannelSidebar component
  - [x] 12.1 Create ChannelSidebar component
    - Add `brightchat-react-components/src/lib/ChannelSidebar.tsx`
    - 240px wide panel with server name header and settings gear
    - Collapsible category sections with channel lists
    - "Create Channel" button visible only to admin/owner
    - Right-click context menu (Edit, Delete, Mute based on permissions)
    - Channel items with # prefix
    - _Requirements: 4.3, 4.5, 7.1, 7.3, 7.4, 7.5_

  - [x] 12.2 Write property test for role-based UI visibility (Property 14)
    - **Property 14: Role-based UI element visibility**
    - **Validates: Requirements 7.5, 8.5**

  - [x] 12.3 Write property test for channel-to-category grouping (Property 9)
    - **Property 9: Channel-to-category grouping**
    - **Validates: Requirements 4.3, 7.3**

  - [x] 12.4 Write unit tests for ChannelSidebar
    - Test category collapse/expand
    - Test context menu rendering
    - Test permission-based element hiding
    - _Requirements: 7.3, 7.4, 7.5_

- [x] 13. Implement DiscordLayout component
  - [x] 13.1 Create DiscordLayout replacing BrightChatLayout
    - Add `brightchat-react-components/src/lib/DiscordLayout.tsx`
    - Three-panel structure: ServerRail | ChannelSidebar | ChatArea
    - Responsive: collapse to hamburger overlay below 768px
    - Wrap with BrightChatProvider
    - Wire ServerRail/ChannelSidebar selection to context state
    - Export from barrel (alongside existing BrightChatLayout for backward compat)
    - _Requirements: 4.1, 4.6_

  - [x] 13.2 Write unit tests for DiscordLayout
    - Test three-panel rendering at desktop width
    - Test responsive collapse at mobile width
    - _Requirements: 4.1, 4.6_

- [x] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement CreateServerDialog component
  - [x] 15.1 Create CreateServerDialog component
    - Add `brightchat-react-components/src/lib/CreateServerDialog.tsx`
    - MUI Dialog with name input (1-100 chars validation) and optional icon upload
    - Inline validation feedback
    - Calls `chatApi.createServer()` on submit
    - Displays API error without closing dialog on failure
    - On success: closes dialog, calls `onCreated` callback
    - Export from barrel
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 15.2 Write property test for server name validation (Property 11)
    - **Property 11: Server name validation**
    - **Validates: Requirements 5.2**

  - [x] 15.3 Write unit tests for CreateServerDialog
    - Test dialog open/close
    - Test validation error display
    - Test API error display without closing
    - _Requirements: 5.1, 5.4_

- [x] 16. Implement CreateDMDialog component
  - [x] 16.1 Create CreateDMDialog component
    - Add `brightchat-react-components/src/lib/CreateDMDialog.tsx`
    - MUI Dialog with searchable user list (debounced input)
    - Filter users by display name (case-insensitive substring match)
    - Check for existing conversation before creating duplicate
    - Navigate to conversation thread on completion
    - Export from barrel
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 16.2 Write property tests for DM dialog logic (Properties 12-13)
    - **Property 12: User search filtering**
    - **Property 13: Conversation deduplication**
    - **Validates: Requirements 6.2, 6.4**

  - [x] 16.3 Write unit tests for CreateDMDialog
    - Test search filtering
    - Test existing conversation navigation
    - _Requirements: 6.2, 6.4_

- [x] 17. Implement ServerSettingsPanel component
  - [x] 17.1 Create ServerSettingsPanel component
    - Add `brightchat-react-components/src/lib/ServerSettingsPanel.tsx`
    - MUI Drawer with tabs: Overview, Members, Categories, Invites
    - Overview tab: edit name, icon
    - Members tab: list with role assignment (owner/admin/member), remove member
    - Categories tab: reorder, rename, create categories
    - Invites tab: generate new invite, view active invites
    - Calls `chatApi.updateServer()` on save
    - Hidden from non-owner/non-admin users
    - Export from barrel
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 17.2 Write unit tests for ServerSettingsPanel
    - Test tab rendering
    - Test role assignment controls
    - Test settings save API call
    - _Requirements: 8.1, 8.2, 8.4_

- [x] 18. Wire presence status UI controls
  - [x] 18.1 Add presence status dropdown to user profile area
    - Add a dropdown in the DiscordLayout user area allowing the user to set their own presence status
    - Wire to `setPresenceStatus` in BrightChatContext
    - Suppress notification popups when status is DO_NOT_DISTURB
    - _Requirements: 9.4, 9.5_

- [x] 19. Add i18n string keys for new UI elements
  - [x] 19.1 Add BrightChat string keys for server UI
    - Add keys to `brightchat-lib/src/lib/enumerations/brightChatStrings.ts` for: Server_Rail, Create_Server, Channel_Sidebar, Server_Settings, Create_Channel, Create_DM, Presence status labels, etc.
    - _Requirements: 4.2, 5.1, 6.1, 7.1, 8.1, 9.4_

- [x] 20. Final integration and wiring
  - [x] 20.1 Wire DiscordLayout into application routes
    - Update route configuration to use DiscordLayout as the primary BrightChat layout
    - Ensure ServerRail → ChannelSidebar → ChatArea navigation flow works end-to-end
    - Wire CreateServerDialog open from ServerRail "+" button
    - Wire CreateDMDialog open from DM list "New Message" button
    - Wire ServerSettingsPanel open from ChannelSidebar settings gear
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 6.1, 8.1_

  - [x] 20.2 Write integration tests for end-to-end navigation flow
    - Test server selection → channel list display → channel selection → message thread
    - Test Home → DM list display
    - Test real-time WebSocket event updates in UI
    - _Requirements: 4.3, 4.4, 4.5, 10.1, 10.2_

- [x] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (23 properties total)
- Unit tests validate specific examples and edge cases
- The existing `BrightChatLayout` is preserved for backward compatibility; `DiscordLayout` is the new primary layout
