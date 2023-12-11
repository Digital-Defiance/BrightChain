# Requirements Document

## Introduction

BrightChat's navigation and direct message creation UX has two gaps. First, the BrightChat section in the application's TopMenu/SideMenu is static — it only shows "BrightChat" (home), "Groups", and "Channels". Unlike BrightHub, which dynamically populates the sidebar with the user's subscribed hubs via the `useBrightHubMenuItems` hook, BrightChat does not show the user's servers in the menu. Users must navigate into BrightChat and use the ServerRail to find their servers, adding unnecessary friction.

Second, the ConversationListView's "+ New Message" button navigates to `/brightchat/conversation/new`, but no route handles that path. The `CreateDMDialog` component exists in `brightchat-react-components` with full search, deduplication, and conversation creation logic, but it is not wired to any user-facing trigger — the `BrightChatApp` renders it with `open={createDMOpen}` but nothing sets `createDMOpen` to `true`. Users currently have no way to start a new direct message conversation.

This feature addresses both problems: dynamic server menu items following the BrightHub pattern, and a working DM creation flow using the existing `CreateDMDialog`.

## Glossary

- **TopMenu**: The application-level top navigation bar rendered by `express-suite-react-components`, which displays feature menus (BrightMail, BrightHub, BrightChat, etc.) as expandable dropdown sections.
- **SideMenu**: The collapsible sidebar navigation rendered alongside the TopMenu, showing menu items registered via `MenuProvider` with `MenuTypes.SideMenu`.
- **Menu_Provider**: The React context provider (`MenuProvider`) that accepts an array of `IMenuConfig` objects and distributes menu items to TopMenu and SideMenu.
- **IMenuConfig**: The configuration interface for a feature menu section, containing a `menuType`, `menuIcon`, `priority`, and an array of `IMenuOption` items.
- **IMenuOption**: An individual menu item with `id`, `label`, `icon`, `link`, `index`, `includeOnMenus`, and `requiresAuth` properties.
- **BrightChat_Menu_Config**: The `IMenuConfig` object for BrightChat, built in `brightchain-react/src/app/app.tsx` within the `InnerApp` component.
- **Server_Menu_Hook**: A new React hook (analogous to `useBrightHubMenuItems`) that generates `IMenuOption` items from the user's server list for inclusion in the BrightChat menu.
- **Chat_API**: The authenticated API client (`chatApi`) used by BrightChat components to call backend endpoints (e.g., `listServers`, `sendDirectMessage`).
- **ConversationListView**: The BrightChat component displaying the user's direct message conversations with a "+ New Message" button.
- **CreateDMDialog**: The MUI Dialog component for initiating a new direct message, featuring user search, deduplication, and conversation creation.
- **BrightChatApp**: The smart wrapper component (`BrightChatApp.tsx`) that manages BrightChat state (servers, channels, dialogs) and renders the layout with an `Outlet` for child routes.
- **Server_Rail**: The 72px vertical icon strip in BrightChatLayout displaying server icons for navigation.
- **User_Search_Endpoint**: A backend API endpoint that returns a list of users matching a search query, used to populate the CreateDMDialog user list.

## Requirements

### Requirement 1: Dynamic Server Menu Items Hook

**User Story:** As a developer, I want a reusable hook that generates BrightChat server menu items from a server list, so that the menu can be dynamically populated following the same pattern as `useBrightHubMenuItems`.

#### Acceptance Criteria

1. THE Server_Menu_Hook SHALL accept a menu type, an array of `IServer<string>` objects, and a starting index as parameters, and return an object containing an `options` array of `IMenuOption` items and a `nextIndex` number.
2. THE Server_Menu_Hook SHALL generate one `IMenuOption` per server, with `id` set to `brightchat-server-{serverId}`, `link` set to `/brightchat/server/{serverId}`, `requiresAuth` set to `true`, and `includeOnMenus` containing both the provided menu type and `MenuTypes.SideMenu`.
3. THE Server_Menu_Hook SHALL use the server's `name` property as the menu item `label`.
4. THE Server_Menu_Hook SHALL limit the number of server menu items to a maximum of 5 servers to prevent menu overflow.
5. THE Server_Menu_Hook SHALL increment the index by 10 for each server item and return the next available index as `nextIndex`.

### Requirement 2: Fetch User Servers for Menu

**User Story:** As a user, I want the BrightChat menu to show my servers, so that I can navigate directly to a server from the application sidebar without entering BrightChat first.

#### Acceptance Criteria

1. WHEN the user is authenticated, THE BrightChat_Menu_Config SHALL fetch the user's servers from the Chat_API `listServers` endpoint.
2. WHEN the server list is fetched successfully, THE BrightChat_Menu_Config SHALL pass the server list to the Server_Menu_Hook to generate dynamic menu items.
3. THE BrightChat_Menu_Config SHALL include the dynamically generated server menu items after the static "BrightChat", "Groups", and "Channels" items in the options array.
4. IF the `listServers` API call fails, THEN THE BrightChat_Menu_Config SHALL render the menu with only the static items (BrightChat, Groups, Channels) and log no user-visible error.
5. WHEN the user is not authenticated, THE BrightChat_Menu_Config SHALL not attempt to fetch servers.

### Requirement 3: Server Route Registration

**User Story:** As a user, I want to navigate to `/brightchat/server/{serverId}` from the menu and see the server's channels, so that the dynamic menu links resolve to a working view.

#### Acceptance Criteria

1. THE BrightChat routes SHALL include a route for `server/:serverId` that renders within the BrightChatApp layout.
2. WHEN the `server/:serverId` route is active, THE BrightChatApp SHALL set the `activeServerId` state to the `serverId` from the URL parameter, causing the ChannelSidebar to display the server's channels.
3. WHEN the `server/:serverId` route is active and the server has channels, THE BrightChatApp SHALL display the server's channel list in the ChannelSidebar.

### Requirement 4: DM Creation via Dialog

**User Story:** As a user, I want the "+ New Message" button to open the CreateDMDialog instead of navigating to a dead route, so that I can start a new direct message conversation.

#### Acceptance Criteria

1. WHEN the user clicks the "+ New Message" button in the ConversationListView, THE ConversationListView SHALL open the CreateDMDialog instead of navigating to `/brightchat/conversation/new`.
2. THE ConversationListView SHALL receive an `onNewMessage` callback prop that triggers the CreateDMDialog to open.
3. THE BrightChatApp SHALL pass the `onNewMessage` callback to the ConversationListView that sets `createDMOpen` to `true`.
4. WHEN the CreateDMDialog is closed (via Cancel or successful conversation creation), THE BrightChatApp SHALL set `createDMOpen` to `false`.

### Requirement 5: User List for DM Creation

**User Story:** As a user, I want to search for and select other users when creating a new direct message, so that I can find the person I want to message.

#### Acceptance Criteria

1. WHEN the CreateDMDialog opens, THE BrightChatApp SHALL provide a list of available users to the CreateDMDialog's `users` prop.
2. THE Chat_API SHALL expose a `searchUsers` method that accepts a search query string and returns an array of objects containing `id`, `displayName`, and optional `avatarUrl` fields.
3. THE BrightChatApp SHALL fetch the user list from the User_Search_Endpoint when the CreateDMDialog opens and pass the results to the dialog.
4. THE BrightChatApp SHALL pass the current user's ID to the CreateDMDialog's `currentUserId` prop from the authenticated user context.
5. IF the user search API call fails, THEN THE CreateDMDialog SHALL display an empty user list and the user search field SHALL remain functional for retry on subsequent input.

### Requirement 6: DM Deduplication and Navigation

**User Story:** As a user, I want to be taken to an existing conversation if I try to message someone I already have a conversation with, so that duplicate conversations are not created.

#### Acceptance Criteria

1. THE BrightChatApp SHALL pass the user's existing conversations to the CreateDMDialog's `existingConversations` prop.
2. WHEN the user selects a recipient who already has an existing 1:1 conversation with the current user, THE CreateDMDialog SHALL navigate to the existing conversation instead of creating a new one.
3. WHEN a new conversation is successfully created, THE BrightChatApp SHALL navigate to `/brightchat/conversation/{conversationId}`.

### Requirement 7: User Search API Endpoint

**User Story:** As a frontend developer, I want a backend API endpoint that returns searchable user data, so that the CreateDMDialog can populate its user list.

#### Acceptance Criteria

1. THE User_Search_Endpoint SHALL be accessible at `GET /brightchat/users/search` with a `query` query parameter.
2. WHEN a `query` parameter is provided, THE User_Search_Endpoint SHALL return users whose display name contains the query string (case-insensitive partial match).
3. WHEN no `query` parameter is provided, THE User_Search_Endpoint SHALL return a default list of users (up to 20).
4. THE User_Search_Endpoint SHALL return each user as an object with `id` (string), `displayName` (string), and `avatarUrl` (optional string) fields.
5. THE User_Search_Endpoint SHALL require authentication and return a 401 status code for unauthenticated requests.
6. THE User_Search_Endpoint SHALL exclude the requesting user from the results.

### Requirement 8: Conversation List Refresh After DM Creation

**User Story:** As a user, I want the conversation list to update after I create a new direct message, so that I can see the new conversation without manually refreshing.

#### Acceptance Criteria

1. WHEN a new conversation is created via the CreateDMDialog, THE ConversationListView SHALL refresh its conversation list to include the newly created conversation.
2. WHEN the user navigates back to the ConversationListView from a newly created conversation, THE ConversationListView SHALL display the new conversation in the list sorted by most recent activity.
