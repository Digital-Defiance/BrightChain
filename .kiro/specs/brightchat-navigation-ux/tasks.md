# Implementation Plan: BrightChat Navigation UX

## Overview

This plan implements two additive UX improvements: dynamic server menu items in the TopMenu/SideMenu via a new `useBrightChatMenuItems` hook (mirroring `useBrightHubMenuItems`), and a working DM creation flow by wiring the existing `CreateDMDialog` to the "+ New Message" button. A backend user search endpoint and a new route for `server/:serverId` complete the feature.

## Tasks

- [x] 1. Create `useBrightChatMenuItems` hook and helpers
  - [x] 1.1 Create `generateBrightChatMenuOptions` pure helper and `useBrightChatMenuItems` hook
    - Create `brightchat-react-components/src/lib/hooks/useBrightChatMenuItems.ts`
    - Extract a pure `generateBrightChatMenuOptions(chatMenu, servers, startingIndex)` function (for direct PBT testing) that returns `{ options: IMenuOption[]; nextIndex: number }`
    - Wrap it in a `useBrightChatMenuItems` hook using `useMemo` keyed on `[chatMenu, servers, startingIndex]`
    - Each server generates an `IMenuOption` with `id: brightchat-server-{server.id}`, `link: /brightchat/server/{server.id}`, `label: server.name`, `requiresAuth: true`, `includeOnMenus: [chatMenu, MenuTypes.SideMenu]`
    - Limit to max 5 servers, increment index by 10 per server
    - Export both the hook and the pure helper from the barrel (`brightchat-react-components/src/index.ts`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Write property test: Hook generates correct menu option fields (Property 1)
    - **Property 1: Hook generates correct menu option fields**
    - Use `fast-check` to generate random `IServer<string>` arrays and a menu type
    - Assert each option has correct `id`, `link`, `label`, `requiresAuth`, and `includeOnMenus`
    - Test the pure `generateBrightChatMenuOptions` function directly
    - **Validates: Requirements 1.2, 1.3**

  - [x] 1.3 Write property test: Hook limits output to maximum 5 servers (Property 2)
    - **Property 2: Hook limits output to maximum 5 servers**
    - Use `fast-check` to generate server arrays of varying lengths (0 to N)
    - Assert `options.length === Math.min(servers.length, 5)`
    - **Validates: Requirements 1.4**

  - [x] 1.4 Write property test: Hook index arithmetic is correct (Property 3)
    - **Property 3: Hook index arithmetic is correct**
    - Use `fast-check` to generate random starting indices and server arrays
    - Assert i-th option has `index === startingIndex + (i * 10)` and `nextIndex === startingIndex + (min(servers.length, 5) * 10)`
    - **Validates: Requirements 1.1, 1.5**

- [x] 2. Add `searchUsers` method to chatApi and backend endpoint
  - [x] 2.1 Add `searchUsers` method to `chatApi.ts`
    - Add a `searchUsers` method to `createChatApiClient` in `brightchat-react-components/src/lib/services/chatApi.ts`
    - Signature: `searchUsers(query?: string)` calling `GET /brightchat/users/search` with `{ params: { query } }`
    - Add the corresponding response type `ISearchUsersResponse` to `brightchain-lib` (interface with `users: Array<{ id: string; displayName: string; avatarUrl?: string }>`)
    - _Requirements: 5.2, 7.1, 7.4_

  - [x] 2.2 Create `UserSearchController` in `brightchain-api-lib`
    - Create `brightchain-api-lib/src/lib/controllers/api/userSearch.ts`
    - Follow the existing controller pattern (extend `BaseController`, define route definitions)
    - Implement `GET /` handler that accepts optional `query` query parameter
    - Return users whose `displayName` contains the query (case-insensitive partial match)
    - Return up to 20 users when no query is provided
    - Exclude the requesting user from results
    - Require authentication (return 401 for unauthenticated requests)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 2.3 Wire `UserSearchController` into the API router
    - In `brightchain-api-lib/src/lib/routers/api.ts`, instantiate `UserSearchController` and mount at `/brightchat/users/search` inside the BrightChat feature guard
    - _Requirements: 7.1_

  - [x] 2.4 Write property test: User search returns matching users with correct fields (Property 5)
    - **Property 5: User search returns matching users with correct fields**
    - Use `fast-check` to generate user arrays and query strings
    - Test the pure filtering logic: assert only users whose `displayName` contains the query (case-insensitive) are returned, and each has `id`, `displayName`, and optional `avatarUrl`
    - **Validates: Requirements 7.2, 7.4**

  - [x] 2.5 Write property test: User search excludes requesting user (Property 6)
    - **Property 6: User search excludes requesting user**
    - Use `fast-check` to generate user arrays including the requesting user
    - Assert the requesting user's ID never appears in results
    - **Validates: Requirements 7.6**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Wire DM creation flow in ConversationListView and BrightChatApp
  - [x] 4.1 Add `onNewMessage` callback prop to `ConversationListView`
    - Update `ConversationListView` to accept an optional `onNewMessage?: () => void` prop
    - When `onNewMessage` is provided, the "+ New Message" button calls it instead of `navigate('/brightchat/conversation/new')`
    - Maintain backward compatibility: if `onNewMessage` is not provided, fall back to existing navigation
    - _Requirements: 4.1, 4.2_

  - [x] 4.2 Wire `CreateDMDialog` in `BrightChatApp`
    - Add `handleNewMessage` callback that sets `createDMOpen = true`
    - Add `useEffect` to fetch users via `chatApi.searchUsers('')` when `createDMOpen` becomes `true`
    - Pass `currentUserId` from `useAuth().userData.id` to `CreateDMDialog`
    - Map existing conversations from `chatApi.listConversations()` to `DMConversation[]` and pass as `existingConversations`
    - Pass `onNewMessage={handleNewMessage}` to `ConversationListView` via Outlet context or direct render
    - On conversation start, navigate to `/brightchat/conversation/{conversationId}`
    - When dialog closes, set `createDMOpen = false`
    - _Requirements: 4.3, 4.4, 5.1, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 8.1, 8.2_

  - [x] 4.3 Write property test: Existing conversation deduplication (Property 4)
    - **Property 4: Existing conversation deduplication**
    - Use `fast-check` to generate conversation lists and recipient IDs
    - Test the pure `findExistingConversation` helper from `CreateDMDialog.helpers.ts`
    - Assert: if a 2-participant conversation exists with both currentUser and recipient, it returns that ID; otherwise returns `null`
    - **Validates: Requirements 6.1, 6.2**

- [x] 5. Add `server/:serverId` route and URL param sync
  - [x] 5.1 Add `server/:serverId` route to `brightchat-routes.tsx`
    - Add `<Route path="server/:serverId" element={<ConversationListView />} />` inside the `<Route element={<BrightChatApp />}>` group
    - _Requirements: 3.1_

  - [x] 5.2 Update `BrightChatApp` to read `serverId` from URL params
    - Use `useParams()` to read `serverId` from the URL
    - Sync `serverId` to `activeServerId` state so the ChannelSidebar displays the server's channels
    - _Requirements: 3.2, 3.3_

- [x] 6. Integrate `useBrightChatMenuItems` in `app.tsx`
  - [x] 6.1 Fetch BrightChat servers and build dynamic menu in `InnerApp`
    - Import `useBrightChatMenuItems` from `@brightchain/brightchat-react-components`
    - Add state + `useEffect` to fetch BrightChat servers via `chatApi.listServers()` (similar to existing `subscribedHubs` pattern)
    - Call `useBrightChatMenuItems(chatMenu, chatServers, nextIndex + 15)` after the static BrightChat items
    - Spread returned options into `brightChatMenuConfig.options`
    - Handle fetch failure silently — render menu with only static items
    - Guard fetch behind authentication check
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The pure helper `generateBrightChatMenuOptions` is extracted specifically for direct PBT testing without React rendering
- The existing `findExistingConversation` and `filterUsersByQuery` helpers in `CreateDMDialog.helpers.ts` are already exported and ready for PBT
- Use `yarn nx test` with `--testPathPatterns` (plural) for running tests
