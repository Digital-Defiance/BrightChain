# Requirements Document

## Introduction

BrightChat currently has a mature backend supporting direct messages, groups, and channels, but the frontend lacks a Discord-like user experience. This feature introduces a "Server" concept as an organizational container for channels, adds frontend UI for creating DM conversations and servers, implements Discord-style navigation (server icon rail → channel list → chat area), and surfaces user presence indicators throughout the interface.

## Glossary

- **Server**: An organizational container that groups related channels together, analogous to a Discord server. A Server has a name, icon, owner, members, and one or more Channels.
- **Channel**: A communication context within a Server where members can send messages. Maps to the existing `IChannel` interface.
- **DM_Conversation**: A direct message thread between exactly two users. Maps to the existing `IConversation` interface.
- **Server_Rail**: A vertical icon strip on the far left of the layout displaying Server icons and navigation shortcuts (Home, Create Server).
- **Channel_Sidebar**: A secondary sidebar within a Server view listing all Channels belonging to that Server, grouped by category.
- **Channel_Category**: A named grouping of Channels within a Server for organizational purposes (e.g., "Text Channels", "Voice Channels").
- **Server_Settings_Panel**: A UI panel for managing Server metadata, members, roles, and Channel Categories.
- **Create_Server_Dialog**: A modal dialog for creating a new Server with name, icon, and initial channel configuration.
- **Create_DM_Dialog**: A modal dialog for initiating a new direct message conversation by selecting a user.
- **Presence_Indicator**: A visual badge showing a user's online status (online, idle, do not disturb, offline).
- **Navigation_Layout**: The three-panel Discord-style layout: Server_Rail | Channel_Sidebar | Chat_Area.
- **Chat_Area**: The main content area displaying the message thread and compose input for the active context.
- **BrightChat_Frontend**: The React component library (`brightchat-react-components`) providing the BrightChat UI.
- **BrightChat_API**: The backend REST API serving conversations, groups, and channels.
- **Server_Service**: The backend service responsible for Server CRUD operations and membership management.

## Requirements

### Requirement 1: Server Data Model

**User Story:** As a developer, I want a Server data model that acts as an organizational container for channels, so that users can group related channels together like Discord servers.

#### Acceptance Criteria

1. THE Server data model SHALL define an `IServer<TId, TData>` interface in brightchain-lib with fields: id, name, iconUrl, ownerId, memberIds, channelIds, categories, createdAt, and updatedAt
2. THE Server data model SHALL define an `IServerCategory<TId>` interface with fields: id, name, position, and channelIds for organizing channels within a Server
3. WHEN a Server is created, THE Server_Service SHALL generate a default "general" Channel and a default "General" Channel_Category containing that Channel
4. THE Server data model SHALL enforce that every Channel belongs to exactly one Server via a serverId field on IChannel

### Requirement 2: Server Backend API

**User Story:** As a developer, I want REST API endpoints for Server CRUD operations, so that the frontend can create, read, update, and delete Servers.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/servers`, THE BrightChat_API SHALL create a new Server with the provided name and icon, assign the requesting user as owner, and return the created Server
2. WHEN a GET request is sent to `/servers`, THE BrightChat_API SHALL return a paginated list of Servers the authenticated user is a member of
3. WHEN a GET request is sent to `/servers/:serverId`, THE BrightChat_API SHALL return the Server metadata including its categories and channel list
4. WHEN a PUT request is sent to `/servers/:serverId`, THE BrightChat_API SHALL update the Server name, icon, or categories if the requesting user has owner or admin role
5. WHEN a DELETE request is sent to `/servers/:serverId`, THE BrightChat_API SHALL delete the Server and all associated Channels if the requesting user is the owner
6. IF a non-owner attempts to delete a Server, THEN THE BrightChat_API SHALL return a 403 Forbidden error
7. WHEN a POST request is sent to `/servers/:serverId/members`, THE BrightChat_API SHALL add the specified users to the Server membership
8. WHEN a DELETE request is sent to `/servers/:serverId/members/:memberId`, THE BrightChat_API SHALL remove the specified user from the Server and all its Channels

### Requirement 3: Server Invite System

**User Story:** As a user, I want to invite others to my Server via invite links, so that people can join my community easily.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/servers/:serverId/invites`, THE BrightChat_API SHALL generate a unique invite token with optional expiration and max-use limits
2. WHEN a POST request is sent to `/servers/:serverId/invites/:token/redeem`, THE BrightChat_API SHALL add the authenticated user to the Server if the token is valid and not expired
3. IF an invite token has exceeded its max uses, THEN THE BrightChat_API SHALL return a 410 Gone error
4. IF an invite token has expired, THEN THE BrightChat_API SHALL return a 410 Gone error

### Requirement 4: Discord-Style Navigation Layout

**User Story:** As a user, I want a Discord-like three-panel navigation layout, so that I can quickly switch between Servers, Channels, and conversations.

#### Acceptance Criteria

1. THE BrightChat_Frontend SHALL render a Navigation_Layout with three panels: Server_Rail (leftmost, 72px wide), Channel_Sidebar (secondary, 240px wide), and Chat_Area (remaining width)
2. THE Server_Rail SHALL display circular Server icons vertically, a Home icon at the top for DM conversations, and a "Create Server" button at the bottom
3. WHEN a user clicks a Server icon in the Server_Rail, THE BrightChat_Frontend SHALL display that Server's Channel_Sidebar showing its channels grouped by Channel_Category
4. WHEN a user clicks the Home icon in the Server_Rail, THE BrightChat_Frontend SHALL display the DM conversation list in the Channel_Sidebar position
5. WHEN a user clicks a Channel in the Channel_Sidebar, THE BrightChat_Frontend SHALL display the message thread for that Channel in the Chat_Area
6. WHILE the viewport width is less than 768px, THE BrightChat_Frontend SHALL collapse the Server_Rail and Channel_Sidebar into a hamburger menu overlay
7. THE Navigation_Layout SHALL support keyboard navigation between Server_Rail items using Arrow keys and Enter to select

### Requirement 5: Create Server Dialog

**User Story:** As a user, I want a dialog to create new Servers, so that I can set up communities for different topics.

#### Acceptance Criteria

1. WHEN the user clicks the "Create Server" button in the Server_Rail, THE BrightChat_Frontend SHALL open the Create_Server_Dialog
2. THE Create_Server_Dialog SHALL require a Server name (1-100 characters) and optionally accept an icon image upload
3. WHEN the user submits the Create_Server_Dialog with valid input, THE BrightChat_Frontend SHALL call the Server creation API and add the new Server to the Server_Rail
4. IF the Server creation API returns an error, THEN THE Create_Server_Dialog SHALL display the error message without closing the dialog
5. WHEN a Server is successfully created, THE BrightChat_Frontend SHALL navigate the user to the new Server's default "general" Channel

### Requirement 6: Create DM Conversation Dialog

**User Story:** As a user, I want a dialog to start new direct message conversations, so that I can privately message other users.

#### Acceptance Criteria

1. WHEN the user clicks the "New Message" button in the DM conversation list, THE BrightChat_Frontend SHALL open the Create_DM_Dialog
2. THE Create_DM_Dialog SHALL provide a searchable user list filtered by the typed query
3. WHEN the user selects a recipient and confirms, THE BrightChat_Frontend SHALL call the send direct message API to initiate the conversation
4. IF a conversation already exists with the selected recipient, THEN THE BrightChat_Frontend SHALL navigate to the existing conversation instead of creating a duplicate
5. WHEN a new DM conversation is initiated, THE BrightChat_Frontend SHALL navigate the user to the new conversation's message thread

### Requirement 7: Channel Management Within Servers

**User Story:** As a Server owner or admin, I want to create and manage channels within my Server, so that I can organize discussions by topic.

#### Acceptance Criteria

1. WHEN a user with admin or owner role clicks "Create Channel" in the Channel_Sidebar, THE BrightChat_Frontend SHALL open a Create Channel dialog requesting name, topic, visibility, and category
2. WHEN the Create Channel form is submitted, THE BrightChat_Frontend SHALL call the channel creation API with the Server's ID and add the new Channel to the appropriate Channel_Category
3. THE Channel_Sidebar SHALL display channels grouped under their Channel_Category headers with collapsible sections
4. WHEN a user right-clicks a Channel in the Channel_Sidebar, THE BrightChat_Frontend SHALL show a context menu with options: Edit Channel, Delete Channel, and Mute Channel (based on user permissions)
5. IF a user without admin or owner role attempts to create or delete a Channel, THEN THE BrightChat_Frontend SHALL hide the create/delete UI elements from that user

### Requirement 8: Server Settings Panel

**User Story:** As a Server owner, I want a settings panel to manage my Server's configuration, members, and roles, so that I can administer my community.

#### Acceptance Criteria

1. WHEN a user with owner or admin role clicks the Server name or settings icon, THE BrightChat_Frontend SHALL open the Server_Settings_Panel
2. THE Server_Settings_Panel SHALL provide tabs for: Overview (name, icon), Members (list with role assignment), Categories (reorder, rename, create), and Invites (generate, view active)
3. WHEN the user modifies Server settings and saves, THE BrightChat_Frontend SHALL call the Server update API and reflect changes immediately in the UI
4. THE Members tab SHALL display each member with their role and provide controls to assign roles (owner, admin, member) or remove members
5. IF a non-owner or non-admin user attempts to access Server_Settings_Panel, THEN THE BrightChat_Frontend SHALL hide the settings entry point from that user

### Requirement 9: User Presence Indicators

**User Story:** As a user, I want to see the online status of other users, so that I know who is available for conversation.

#### Acceptance Criteria

1. THE BrightChat_Frontend SHALL display a Presence_Indicator (colored dot) on user avatars throughout the UI: in the DM list, member lists, and message threads
2. THE Presence_Indicator SHALL use the following colors: green for online, yellow for idle, red for do not disturb, and gray for offline
3. WHEN a user's presence status changes, THE BrightChat_Frontend SHALL update all visible Presence_Indicators for that user within 3 seconds via WebSocket events
4. THE BrightChat_Frontend SHALL allow the current user to set their own presence status via a dropdown in the user profile area
5. WHILE a user has set their status to "do not disturb", THE BrightChat_Frontend SHALL suppress notification popups for that user

### Requirement 10: Real-Time Server Updates

**User Story:** As a user, I want real-time updates when Server membership or channels change, so that my UI stays current without manual refresh.

#### Acceptance Criteria

1. WHEN a new Channel is created in a Server the user belongs to, THE BrightChat_Frontend SHALL add the Channel to the Channel_Sidebar in real time via WebSocket
2. WHEN a Channel is deleted from a Server the user belongs to, THE BrightChat_Frontend SHALL remove the Channel from the Channel_Sidebar in real time via WebSocket
3. WHEN a new member joins a Server the user belongs to, THE BrightChat_Frontend SHALL update the member count and member list in real time via WebSocket
4. WHEN the user is removed from a Server, THE BrightChat_Frontend SHALL remove the Server from the Server_Rail and navigate to the Home view

### Requirement 11: Server and Channel Context in State Management

**User Story:** As a developer, I want the BrightChat context to support Server and Channel navigation state, so that components can react to the active Server and Channel.

#### Acceptance Criteria

1. THE BrightChat_Frontend SHALL extend BrightChatContextValue with activeServerId (string or null) and setActiveServerId callback
2. WHEN activeServerId changes, THE BrightChat_Frontend SHALL fetch and cache the Server's channel list and categories
3. THE BrightChat_Frontend SHALL persist the last active Server and Channel to sessionStorage so navigation state survives page refreshes
4. WHEN the application loads, THE BrightChat_Frontend SHALL restore the previously active Server and Channel from sessionStorage if the user is still a member
