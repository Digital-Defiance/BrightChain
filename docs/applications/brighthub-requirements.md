---
title: "Requirements Document"
parent: "Applications"
nav_order: 2
---
# Requirements Document

## Introduction

BrightHub is a Twitter-like social network module for the BrightChain ecosystem. It provides decentralized social networking capabilities including posts, threads, replies, likes, reposts, follows, and rich text formatting with markdown, emojis, and FontAwesome icons. The module integrates with the existing BrightChain blockchain/database infrastructure and follows the established Nx monorepo patterns.

## Glossary

- **BrightHub_System**: The complete social network module encompassing all libraries, services, and components
- **Post_Service**: Backend service handling post creation, retrieval, and management
- **Thread_Service**: Backend service managing threaded conversations and replies
- **User_Profile_Service**: Backend service managing user profiles and social connections
- **Feed_Service**: Backend service generating personalized and public feeds
- **Connection_Service**: Backend service managing connection lists, categories, and relationship features
- **Discovery_Service**: Backend service providing connection recommendations and suggestions
- **Text_Formatter**: Service that processes markdown, emojis, and FontAwesome icons in post content
- **Post**: A single social media message with optional media attachments
- **Thread**: A hierarchical conversation consisting of a root post and its replies
- **Reply**: A post that responds to another post within a thread
- **Repost**: Sharing another user's post to one's own followers
- **Quote_Post**: A repost that includes additional commentary
- **Like**: An endorsement action on a post
- **Follow**: A subscription relationship between users
- **Connection**: A follow relationship with additional metadata (category, notes, priority)
- **Connection_List**: A user-created grouping of connections for organization and filtering
- **Connection_Category**: A predefined or custom classification for connections (close friends, professional, etc.)
- **Hub**: A private group of connections who can see exclusive content
- **Priority_Connection**: A connection whose posts are always shown first in timeline
- **Quiet_Mode**: A connection setting that shows posts but suppresses notifications
- **Connection_Note**: A private note attached to a connection visible only to the note creator
- **Connection_Strength**: A calculated metric based on interaction frequency between users
- **Mutual_Connection**: A user who is followed by both the current user and another user
- **Messaging_Service**: Backend service handling direct messages, conversations, and message requests
- **Conversation**: A direct message thread between two or more users
- **Direct_Message**: A private message sent between users within a conversation
- **Group_Conversation**: A conversation with three or more participants
- **Message_Request**: A pending message from a non-follower awaiting acceptance
- **Message_Reaction**: An emoji reaction attached to a specific message
- **Read_Receipt**: An indicator showing when a message was seen by recipients
- **Typing_Indicator**: A real-time signal showing when a user is composing a message
- **Message_Thread**: A reply chain within a conversation responding to a specific message
- **Conversation_Archive**: A hidden conversation that can be restored later
- **Pinned_Conversation**: A conversation marked for quick access at the top of the inbox
- **Timeline**: A chronological feed of posts from followed users
- **Mention**: A reference to another user using @username syntax
- **Hashtag**: A topic tag using #topic syntax
- **Notification_Provider**: React context provider that manages notification state and subscriptions across the application
- **Notification_Service**: Backend service handling notification creation, delivery, and management
- **Notification_Bell**: UI component in TopMenu displaying notification icon with unread badge
- **Notification_Dropdown**: UI panel showing recent notifications when bell is clicked
- **Notification_Category**: Classification of notifications (social, messages, connections, system)
- **Notification_Preferences**: User settings controlling notification delivery by category and channel
- **Notification_Channel**: Delivery method for notifications (in-app, email, push)
- **Notification_Group**: Aggregated notifications of the same type (e.g., "5 people liked your post")
- **Quiet_Hours**: Time period during which notifications are suppressed
- **Do_Not_Disturb**: Mode that suppresses all non-critical notifications
- **Post_DTO**: Data Transfer Object for posts between frontend and backend
- **IBasePostData<TId>**: Generic interface for post data supporting different ID types
- **IBaseConnectionList<TId>**: Generic interface for connection list data
- **IBaseConnectionCategory<TId>**: Generic interface for connection category data
- **IBaseHub<TId>**: Generic interface for hub/close friends data

## Requirements

### Requirement 1: Post Creation and Management

**User Story:** As a user, I want to create, edit, and delete posts, so that I can share content with my followers.

#### Acceptance Criteria

1. WHEN a user submits valid post content, THE Post_Service SHALL create a new post and return the Post_DTO
2. WHEN a user submits post content exceeding 280 characters, THE Post_Service SHALL reject the request with a validation error
3. WHEN a user submits empty post content, THE Post_Service SHALL reject the request with a validation error
4. WHEN a user requests to edit their own post within 15 minutes of creation, THE Post_Service SHALL update the post content and mark it as edited
5. WHEN a user requests to edit a post older than 15 minutes, THE Post_Service SHALL reject the request with a time limit error
6. WHEN a user requests to delete their own post, THE Post_Service SHALL soft-delete the post and cascade to associated interactions
7. IF a user attempts to edit or delete another user's post, THEN THE Post_Service SHALL reject the request with an authorization error
8. THE Post_Service SHALL store posts in the brightchain-db threading database

### Requirement 2: Thread and Reply Management

**User Story:** As a user, I want to reply to posts and view threaded conversations, so that I can engage in discussions.

#### Acceptance Criteria

1. WHEN a user submits a reply to an existing post, THE Thread_Service SHALL create a reply post linked to the parent post
2. WHEN a user requests a thread view, THE Thread_Service SHALL return the root post and all nested replies in hierarchical order
3. THE Thread_Service SHALL support reply nesting up to 10 levels deep
4. WHEN a reply exceeds the maximum nesting depth, THE Thread_Service SHALL attach the reply to the deepest allowed parent
5. WHEN a parent post is deleted, THE Thread_Service SHALL preserve replies with a "parent deleted" indicator
6. THE Thread_Service SHALL track reply counts for each post

### Requirement 3: Social Interactions (Likes, Reposts, Quotes)

**User Story:** As a user, I want to like, repost, and quote posts, so that I can engage with and share content.

#### Acceptance Criteria

1. WHEN a user likes a post, THE Post_Service SHALL record the like and increment the post's like count
2. WHEN a user unlikes a post, THE Post_Service SHALL remove the like and decrement the post's like count
3. WHEN a user reposts a post, THE Post_Service SHALL create a repost entry visible to the user's followers
4. WHEN a user creates a quote post, THE Post_Service SHALL create a new post containing the quoted post reference and user commentary
5. THE Post_Service SHALL prevent duplicate likes from the same user on the same post
6. THE Post_Service SHALL prevent duplicate reposts from the same user of the same post
7. WHEN a user requests their interaction status on a post, THE Post_Service SHALL return whether the user has liked and/or reposted the post

### Requirement 4: User Following System

**User Story:** As a user, I want to follow and unfollow other users, so that I can curate my timeline.

#### Acceptance Criteria

1. WHEN a user follows another user, THE User_Profile_Service SHALL create a follow relationship and update follower/following counts
2. WHEN a user unfollows another user, THE User_Profile_Service SHALL remove the follow relationship and update counts
3. THE User_Profile_Service SHALL prevent users from following themselves
4. WHEN a user requests their followers list, THE User_Profile_Service SHALL return a paginated list of follower profiles
5. WHEN a user requests their following list, THE User_Profile_Service SHALL return a paginated list of followed user profiles
6. THE User_Profile_Service SHALL support pagination with cursor-based navigation for follower/following lists
7. WHEN a user enables approve followers mode, THE User_Profile_Service SHALL require approval for new follow requests
8. WHEN a follow request is received for a protected account, THE User_Profile_Service SHALL create a pending request with optional custom message
9. WHEN a user approves a follow request, THE User_Profile_Service SHALL create the follow relationship and notify the requester
10. WHEN a user rejects a follow request, THE User_Profile_Service SHALL delete the request and optionally notify the requester
11. THE User_Profile_Service SHALL support granular approve mode (approve all, approve from mutuals only, approve none)

### Requirement 5: Timeline and Feed Generation

**User Story:** As a user, I want to view my personalized timeline and explore public content, so that I can discover and consume content.

#### Acceptance Criteria

1. WHEN a user requests their home timeline, THE Feed_Service SHALL return posts from followed users in reverse chronological order
2. WHEN a user requests the public timeline, THE Feed_Service SHALL return recent public posts from all users
3. THE Feed_Service SHALL support cursor-based pagination for all timeline requests
4. THE Feed_Service SHALL include reposts and quote posts in timeline results
5. WHEN a user requests a specific user's profile feed, THE Feed_Service SHALL return that user's posts and reposts
6. THE Feed_Service SHALL exclude posts from blocked users in timeline results
7. THE Feed_Service SHALL return a maximum of 50 posts per timeline request
8. WHEN a user requests timeline filtered by connection list, THE Feed_Service SHALL return only posts from list members
9. WHEN a user requests timeline filtered by connection category, THE Feed_Service SHALL return only posts from categorized connections
10. THE Feed_Service SHALL display posts from priority connections before other posts in the timeline
11. THE Feed_Service SHALL include hub-restricted posts when the requesting user is a hub member
12. WHEN a user has active temporary mutes, THE Feed_Service SHALL exclude muted users' posts from timeline

### Requirement 6: Rich Text Formatting

**User Story:** As a user, I want to format my posts with markdown, emojis, and icons, so that I can create expressive content.

#### Acceptance Criteria

1. WHEN post content contains markdown syntax, THE Text_Formatter SHALL parse and render the markdown to HTML
2. WHEN post content contains emoji shortcodes, THE Text_Formatter SHALL convert shortcodes to Unicode emoji characters
3. WHEN post content contains FontAwesome icon syntax, THE Text_Formatter SHALL render the appropriate icon elements
4. THE Text_Formatter SHALL sanitize HTML output to prevent XSS attacks
5. THE Text_Formatter SHALL preserve raw content for editing while providing formatted content for display
6. FOR ALL valid post content, parsing then formatting then extracting raw text SHALL produce equivalent semantic content (round-trip property)

### Requirement 7: Mentions and Hashtags

**User Story:** As a user, I want to mention other users and use hashtags, so that I can reference people and topics.

#### Acceptance Criteria

1. WHEN post content contains @username mentions, THE Post_Service SHALL extract and validate mentioned usernames
2. WHEN a valid mention is detected, THE Post_Service SHALL create a notification for the mentioned user
3. WHEN post content contains #hashtag tags, THE Post_Service SHALL extract and index hashtags for search
4. WHEN a user searches for a hashtag, THE Feed_Service SHALL return posts containing that hashtag
5. THE Post_Service SHALL support up to 10 mentions per post
6. THE Post_Service SHALL support up to 10 hashtags per post

### Requirement 8: User Profile Management

**User Story:** As a user, I want to manage my profile information, so that others can learn about me.

#### Acceptance Criteria

1. WHEN a user updates their display name, THE User_Profile_Service SHALL validate and store the new display name
2. WHEN a user updates their bio, THE User_Profile_Service SHALL validate the bio does not exceed 160 characters
3. WHEN a user updates their profile picture, THE User_Profile_Service SHALL validate the image format and store the reference
4. WHEN a user updates their header image, THE User_Profile_Service SHALL validate the image format and store the reference
5. THE User_Profile_Service SHALL support profile location and website URL fields
6. WHEN a user requests another user's profile, THE User_Profile_Service SHALL return the public profile data including follower/following counts

### Requirement 9: Notification System Core

**User Story:** As a user, I want to receive notifications for interactions, so that I can stay informed about activity on my content.

#### Acceptance Criteria

1. WHEN a user's post receives a like, THE Notification_Service SHALL create a notification for the post author with category "social"
2. WHEN a user's post receives a reply, THE Notification_Service SHALL create a notification for the post author with category "social"
3. WHEN a user is mentioned in a post, THE Notification_Service SHALL create a notification for the mentioned user with category "social"
4. WHEN a user gains a new follower, THE Notification_Service SHALL create a notification for the followed user with category "connections"
5. WHEN a user's post is reposted or quoted, THE Notification_Service SHALL create a notification for the post author with category "social"
6. WHEN a user requests their notifications, THE Notification_Service SHALL return notifications in reverse chronological order with pagination
7. THE Notification_Service SHALL support marking notifications as read individually or in bulk
8. WHEN a user requests notifications filtered by connection list, THE Notification_Service SHALL return only notifications from list members
9. WHEN a user requests notifications filtered by connection category, THE Notification_Service SHALL return only notifications from categorized connections
10. WHILE quiet mode is enabled for a connection, THE Notification_Service SHALL suppress notifications from that connection
11. WHEN a user receives a follow request, THE Notification_Service SHALL create a notification with category "connections" and the optional custom message
12. WHEN a connection the user hasn't interacted with in 30 days posts, THE Notification_Service SHALL optionally create a "reconnect" reminder notification with category "connections"
13. THE Notification_Service SHALL assign each notification to exactly one Notification_Category
14. THE Notification_Service SHALL store a click-through URL for each notification linking to the relevant content

### Requirement 10: Search Functionality

**User Story:** As a user, I want to search for posts and users, so that I can discover content and people.

#### Acceptance Criteria

1. WHEN a user searches with a text query, THE BrightHub_System SHALL return matching posts containing the query terms
2. WHEN a user searches with a hashtag, THE BrightHub_System SHALL return posts tagged with that hashtag
3. WHEN a user searches for users, THE BrightHub_System SHALL return user profiles matching the query by username or display name
4. THE BrightHub_System SHALL support combined search returning both posts and users
5. THE BrightHub_System SHALL support pagination for all search results

### Requirement 11: API Endpoints

**User Story:** As a developer, I want RESTful API endpoints, so that I can integrate BrightHub with frontend applications.

#### Acceptance Criteria

1. THE BrightHub_System SHALL expose POST /api/brighthub/posts for creating posts
2. THE BrightHub_System SHALL expose GET /api/brighthub/posts/:id for retrieving a single post
3. THE BrightHub_System SHALL expose DELETE /api/brighthub/posts/:id for deleting posts
4. THE BrightHub_System SHALL expose POST /api/brighthub/posts/:id/like for liking posts
5. THE BrightHub_System SHALL expose POST /api/brighthub/posts/:id/repost for reposting
6. THE BrightHub_System SHALL expose GET /api/brighthub/timeline/home for home timeline
7. THE BrightHub_System SHALL expose GET /api/brighthub/timeline/public for public timeline
8. THE BrightHub_System SHALL expose GET /api/brighthub/users/:id for user profiles
9. THE BrightHub_System SHALL expose POST /api/brighthub/users/:id/follow for following users
10. THE BrightHub_System SHALL expose GET /api/brighthub/notifications for user notifications
11. THE BrightHub_System SHALL expose GET /api/brighthub/search for search functionality
12. THE BrightHub_System SHALL return appropriate HTTP status codes for success and error responses

### Requirement 12: React Component Library

**User Story:** As a frontend developer, I want reusable React components, so that I can build the BrightHub UI efficiently.

#### Acceptance Criteria

1. THE brighthub-react-components library SHALL provide a PostCard component for displaying individual posts
2. THE brighthub-react-components library SHALL provide a PostComposer component for creating new posts
3. THE brighthub-react-components library SHALL provide a Timeline component for displaying feeds
4. THE brighthub-react-components library SHALL provide a ThreadView component for displaying threaded conversations
5. THE brighthub-react-components library SHALL provide a UserProfileCard component for displaying user information
6. THE brighthub-react-components library SHALL provide a NotificationList component for displaying notifications
7. THE brighthub-react-components library SHALL provide a SearchResults component for displaying search results
8. THE brighthub-react-components library SHALL provide a FollowButton component for follow/unfollow actions
9. THE brighthub-react-components library SHALL provide a LikeButton component for like/unlike actions
10. THE brighthub-react-components library SHALL provide a RepostButton component for repost actions
11. All components SHALL support theming through a BrightHubThemeProvider
12. All components SHALL be accessible and comply with ARIA guidelines
13. All components SHALL use i18n for all user-facing strings via `useI18n` hook with `tComponent(BrightHubComponentId, key)` — no hardcoded display text (see Requirement 61)

### Requirement 13: Type System and Interfaces

**User Story:** As a developer, I want strongly-typed interfaces, so that I can ensure type safety across frontend and backend.

#### Acceptance Criteria

1. THE brighthub-lib library SHALL define IBasePostData<TId> generic interface for post data
2. THE brighthub-lib library SHALL define IBaseUserProfile<TId> generic interface for user profiles
3. THE brighthub-lib library SHALL define IBaseThread<TId> generic interface for thread data
4. THE brighthub-lib library SHALL define IBaseNotification<TId> generic interface for notifications
5. THE brighthub-lib library SHALL define IBaseFollow<TId> generic interface for follow relationships
6. THE brighthub-lib library SHALL define IBaseLike<TId> generic interface for like interactions
7. THE brighthub-lib library SHALL define IBaseRepost<TId> generic interface for repost interactions
8. THE brightchain-api-lib library SHALL define API response types extending Express Response with BrightHub data interfaces
9. All enumerations for post types, notification types, and interaction types SHALL be defined in brighthub-lib

### Requirement 14: Database Schema

**User Story:** As a developer, I want a well-defined database schema, so that I can store and query social network data efficiently.

#### Acceptance Criteria

1. THE brightchain-db library SHALL define a posts collection schema with content, author, timestamps, and interaction counts
2. THE brightchain-db library SHALL define a threads collection schema linking posts in parent-child relationships
3. THE brightchain-db library SHALL define a follows collection schema for user follow relationships
4. THE brightchain-db library SHALL define a likes collection schema for post likes
5. THE brightchain-db library SHALL define a reposts collection schema for repost tracking
6. THE brightchain-db library SHALL define a notifications collection schema for user notifications
7. THE brightchain-db library SHALL define appropriate indexes for timeline queries, user lookups, and search operations
8. All schemas SHALL support the BrightChain block-based storage model

### Requirement 15: End-to-End Testing

**User Story:** As a developer, I want comprehensive E2E tests, so that I can ensure the system works correctly.

#### Acceptance Criteria

1. THE brightchain-api-e2e library SHALL include tests for all post CRUD operations
2. THE brightchain-api-e2e library SHALL include tests for thread and reply operations
3. THE brightchain-api-e2e library SHALL include tests for like, repost, and quote operations
4. THE brightchain-api-e2e library SHALL include tests for follow/unfollow operations
5. THE brightchain-api-e2e library SHALL include tests for timeline generation
6. THE brightchain-api-e2e library SHALL include tests for notification creation and retrieval
7. THE brightchain-api-e2e library SHALL include tests for search functionality
8. THE brightchain-react-e2e library SHALL include Playwright tests for PostComposer component
9. THE brightchain-react-e2e library SHALL include Playwright tests for Timeline component
10. THE brightchain-react-e2e library SHALL include Playwright tests for ThreadView component
11. THE brightchain-react-e2e library SHALL include Playwright tests for user profile interactions
12. THE brightchain-react-e2e library SHALL include Playwright tests for notification interactions

### Requirement 16: Integration with Existing Text Formatting Library

**User Story:** As a developer, I want to integrate the existing text formatting library, so that I can reuse proven markdown, emoji, and icon handling code.

#### Acceptance Criteria

1. THE Text_Formatter SHALL integrate the existing markdown-it based formatting logic
2. THE Text_Formatter SHALL integrate the existing emoji shortcode conversion logic
3. THE Text_Formatter SHALL integrate the existing FontAwesome icon rendering logic
4. THE Text_Formatter SHALL expose a unified API for formatting post content
5. THE Text_Formatter SHALL be usable in both Node.js (backend) and browser (frontend) environments
6. FOR ALL formatted content, the Text_Formatter SHALL produce consistent output across Node.js and browser environments

### Requirement 17: Media Attachments

**User Story:** As a user, I want to attach images to my posts, so that I can share visual content.

#### Acceptance Criteria

1. WHEN a user attaches images to a post, THE Post_Service SHALL validate image formats (JPEG, PNG, GIF, WebP)
2. THE Post_Service SHALL support up to 4 image attachments per post
3. WHEN images are attached, THE Post_Service SHALL store image references in the post data
4. THE Post_Service SHALL validate that total attachment size does not exceed 20MB per post
5. IF an invalid image format is attached, THEN THE Post_Service SHALL reject the request with a validation error

### Requirement 18: Block and Mute Functionality

**User Story:** As a user, I want to block and mute other users, so that I can control my experience.

#### Acceptance Criteria

1. WHEN a user blocks another user, THE User_Profile_Service SHALL prevent the blocked user from viewing the blocker's content
2. WHEN a user blocks another user, THE User_Profile_Service SHALL remove any existing follow relationship
3. WHEN a user mutes another user, THE Feed_Service SHALL exclude the muted user's posts from the muting user's timeline
4. WHEN a user unmutes another user, THE Feed_Service SHALL restore the unmuted user's posts to the timeline
5. THE User_Profile_Service SHALL provide endpoints to list blocked and muted users
6. THE User_Profile_Service SHALL support unblocking users


### Requirement 19: Connection Lists Management

**User Story:** As a user, I want to create and manage custom connection lists, so that I can organize my connections and filter my experience.

#### Acceptance Criteria

1. WHEN a user creates a connection list, THE Connection_Service SHALL create the list with a name, description, and visibility setting
2. WHEN a user adds a connection to a list, THE Connection_Service SHALL create the list membership and update list counts
3. WHEN a user removes a connection from a list, THE Connection_Service SHALL remove the membership and update counts
4. THE Connection_Service SHALL support bulk add operations for adding multiple users to a list in a single request
5. THE Connection_Service SHALL support bulk remove operations for removing multiple users from a list in a single request
6. WHEN a user requests their lists, THE Connection_Service SHALL return all lists with member counts
7. WHEN a user requests list members, THE Connection_Service SHALL return a paginated list of member profiles
8. THE Connection_Service SHALL support up to 100 custom lists per user
9. THE Connection_Service SHALL support up to 5000 members per list
10. WHEN a user deletes a list, THE Connection_Service SHALL remove all memberships and the list itself
11. THE Connection_Service SHALL support list visibility options: private, followers-only, and public
12. WHEN a list is public, THE Connection_Service SHALL allow other users to follow the list

### Requirement 20: Connection Categories

**User Story:** As a user, I want to categorize my connections, so that I can quickly identify relationship types.

#### Acceptance Criteria

1. THE Connection_Service SHALL provide default categories: Close Friends, Family, Professional, Acquaintances, and Interests
2. WHEN a user creates a custom category, THE Connection_Service SHALL create the category with name and optional color/icon
3. WHEN a user assigns a category to a connection, THE Connection_Service SHALL update the connection metadata
4. THE Connection_Service SHALL support multiple categories per connection
5. WHEN a user requests connections by category, THE Connection_Service SHALL return a paginated list of matching connections
6. THE Connection_Service SHALL support up to 20 custom categories per user
7. WHEN a user deletes a custom category, THE Connection_Service SHALL remove the category assignment from all connections
8. THE Connection_Service SHALL support bulk category assignment for multiple connections

### Requirement 21: Connection Notes

**User Story:** As a user, I want to add private notes to my connections, so that I can remember context about people I follow.

#### Acceptance Criteria

1. WHEN a user adds a note to a connection, THE Connection_Service SHALL store the note visible only to the note creator
2. WHEN a user updates a connection note, THE Connection_Service SHALL update the stored note content
3. WHEN a user deletes a connection note, THE Connection_Service SHALL remove the note
4. THE Connection_Service SHALL support notes up to 500 characters per connection
5. WHEN a user views a connection's profile, THE Connection_Service SHALL include the private note if one exists
6. THE Connection_Service SHALL support searching connections by note content
7. IF a user unfollows a connection, THEN THE Connection_Service SHALL preserve the note for potential re-follow

### Requirement 22: Connection Import and Export

**User Story:** As a user, I want to import and export my connection lists, so that I can backup and migrate my social graph.

#### Acceptance Criteria

1. WHEN a user requests a connection export, THE Connection_Service SHALL generate a JSON file containing all connections with metadata
2. WHEN a user requests a list export, THE Connection_Service SHALL generate a JSON file containing list members and settings
3. WHEN a user imports a connection file, THE Connection_Service SHALL validate the format and create follow relationships for valid usernames
4. WHEN a user imports a list file, THE Connection_Service SHALL create the list and add existing connections as members
5. THE Connection_Service SHALL support CSV format for simple username-only imports
6. IF an imported username does not exist, THEN THE Connection_Service SHALL skip the entry and include it in an error report
7. THE Connection_Service SHALL rate-limit import operations to prevent abuse

### Requirement 23: Priority Connections

**User Story:** As a user, I want to mark certain connections as priority, so that I never miss their posts.

#### Acceptance Criteria

1. WHEN a user marks a connection as priority, THE Connection_Service SHALL update the connection priority flag
2. WHEN a user requests their timeline, THE Feed_Service SHALL display posts from priority connections first
3. THE Connection_Service SHALL support up to 50 priority connections per user
4. WHEN a user removes priority status from a connection, THE Connection_Service SHALL update the flag and restore normal timeline ordering
5. WHEN a user requests their priority connections, THE Connection_Service SHALL return a list of all priority-marked connections
6. THE Feed_Service SHALL visually distinguish priority connection posts in the timeline

### Requirement 24: Quiet Mode for Connections

**User Story:** As a user, I want to set quiet mode for specific connections, so that I can see their posts without receiving notifications.

#### Acceptance Criteria

1. WHEN a user enables quiet mode for a connection, THE Connection_Service SHALL update the connection quiet flag
2. WHILE quiet mode is enabled for a connection, THE BrightHub_System SHALL suppress all notifications from that connection
3. WHILE quiet mode is enabled, THE Feed_Service SHALL continue to include the connection's posts in the timeline
4. WHEN a user disables quiet mode for a connection, THE BrightHub_System SHALL resume notifications from that connection
5. WHEN a user requests their quiet connections, THE Connection_Service SHALL return a list of all quiet-mode connections

### Requirement 25: Temporary Mute with Auto-Unmute

**User Story:** As a user, I want to temporarily mute connections with automatic unmute, so that I can take breaks without permanent changes.

#### Acceptance Criteria

1. WHEN a user sets a temporary mute, THE Connection_Service SHALL store the mute with an expiration timestamp
2. THE Connection_Service SHALL support mute durations: 1 hour, 8 hours, 24 hours, 7 days, and 30 days
3. WHEN a temporary mute expires, THE Connection_Service SHALL automatically remove the mute and restore normal behavior
4. WHILE a temporary mute is active, THE Feed_Service SHALL exclude the muted connection's posts from timeline
5. WHEN a user requests their muted connections, THE Connection_Service SHALL return mute status including expiration times
6. THE Connection_Service SHALL support converting temporary mutes to permanent mutes
7. THE Connection_Service SHALL support early unmute before expiration

### Requirement 26: Connection Discovery and Suggestions

**User Story:** As a user, I want to discover new connections based on my network and interests, so that I can grow my social graph.

#### Acceptance Criteria

1. WHEN a user requests connection suggestions, THE Discovery_Service SHALL return users based on mutual connections
2. THE Discovery_Service SHALL calculate suggestion scores based on number of mutual connections
3. WHEN a user has followed hashtags or interests, THE Discovery_Service SHALL suggest users who frequently post about those topics
4. THE Discovery_Service SHALL provide "Similar to" suggestions based on a specified user's followers and following
5. THE Discovery_Service SHALL exclude already-followed users, blocked users, and muted users from suggestions
6. THE Discovery_Service SHALL support pagination for suggestion results
7. WHEN a user dismisses a suggestion, THE Discovery_Service SHALL exclude that user from future suggestions for 30 days
8. THE Discovery_Service SHALL refresh suggestions daily based on network changes

### Requirement 27: Connection Strength Indicators

**User Story:** As a user, I want to see connection strength indicators, so that I can understand my relationship activity levels.

#### Acceptance Criteria

1. THE Discovery_Service SHALL calculate connection strength based on interaction frequency (likes, replies, mentions)
2. THE Discovery_Service SHALL categorize strength as: Strong, Moderate, Weak, or Dormant
3. WHEN a user views a connection's profile, THE Discovery_Service SHALL display the connection strength indicator
4. THE Discovery_Service SHALL update connection strength calculations weekly
5. WHEN a user requests connections sorted by strength, THE Connection_Service SHALL return connections ordered by strength score
6. THE Discovery_Service SHALL factor in recency of interactions when calculating strength

### Requirement 28: Mutual Connections Display

**User Story:** As a user, I want to see mutual connections when viewing profiles, so that I can understand shared social context.

#### Acceptance Criteria

1. WHEN a user views another user's profile, THE Connection_Service SHALL display mutual connections count
2. WHEN a user requests mutual connections, THE Connection_Service SHALL return a paginated list of users followed by both parties
3. THE Connection_Service SHALL display up to 3 mutual connection avatars on profile previews
4. WHEN viewing a non-followed user, THE Connection_Service SHALL highlight mutual connections as social proof
5. THE Connection_Service SHALL cache mutual connection calculations for performance

### Requirement 29: Connection History and Insights

**User Story:** As a user, I want to see my connection history and interaction insights, so that I can understand my relationships over time.

#### Acceptance Criteria

1. WHEN a user views a connection's profile, THE Connection_Service SHALL display when the follow relationship was created
2. THE Connection_Service SHALL track and display interaction statistics: total likes given, replies exchanged, mentions
3. WHEN a user requests "haven't interacted" connections, THE Connection_Service SHALL return connections with no interactions in 30 days
4. THE Connection_Service SHALL provide weekly connection activity summaries via notification
5. WHEN a user requests connection insights, THE Connection_Service SHALL return top interacted connections for the period
6. THE Connection_Service SHALL support insight periods: 7 days, 30 days, 90 days, and all time

### Requirement 30: Hubs and Close Friends Content

**User Story:** As a user, I want to share content exclusively with specific hubs, so that I can control who sees sensitive posts.

#### Acceptance Criteria

1. WHEN a user creates a hub, THE Connection_Service SHALL create the hub with name and member list
2. WHEN a user adds a connection to a hub, THE Connection_Service SHALL update hub membership
3. WHEN a user creates a post with hub visibility, THE Post_Service SHALL restrict visibility to hub members only
4. THE Post_Service SHALL support multiple hub selection for post visibility
5. WHEN a non-hub member requests a hub-restricted post, THE Post_Service SHALL return a not-found or access-denied response
6. THE Connection_Service SHALL support a default "Close Friends" hub for quick access
7. WHEN a user views their timeline, THE Feed_Service SHALL include hub-restricted posts from hubs they belong to
8. THE Feed_Service SHALL visually indicate hub-restricted posts to the viewer
9. THE Connection_Service SHALL support up to 10 hubs per user
10. THE Connection_Service SHALL support up to 150 members per hub

### Requirement 31: Granular Privacy Controls

**User Story:** As a user, I want granular privacy controls for my connections, so that I can manage my visibility precisely.

#### Acceptance Criteria

1. WHEN a user configures privacy settings, THE User_Profile_Service SHALL support hiding follower count from public view
2. WHEN a user configures privacy settings, THE User_Profile_Service SHALL support hiding following count from public view
3. WHEN a user configures privacy settings, THE User_Profile_Service SHALL support hiding followers list from non-followers
4. WHEN a user configures privacy settings, THE User_Profile_Service SHALL support hiding following list from non-followers
5. THE User_Profile_Service SHALL support per-list visibility overrides
6. WHEN a user enables "approve followers" mode, THE User_Profile_Service SHALL require approval for all new followers
7. THE User_Profile_Service SHALL support "approve from non-mutuals only" mode for selective approval

### Requirement 32: Block and Mute Inheritance for Lists

**User Story:** As a user, I want block and mute settings to apply to my lists, so that blocked users cannot access my curated content.

#### Acceptance Criteria

1. WHEN a user blocks another user, THE Connection_Service SHALL automatically remove the blocked user from all lists owned by the blocker
2. WHEN a user blocks another user, THE Connection_Service SHALL prevent the blocked user from viewing the blocker's public lists
3. WHEN a user blocks another user, THE Connection_Service SHALL prevent the blocked user from following the blocker's lists
4. WHEN a user mutes another user, THE Feed_Service SHALL exclude the muted user's posts from list-filtered timelines
5. IF a blocked user is added to a list via import, THEN THE Connection_Service SHALL skip the blocked user and report the skip

### Requirement 33: Connection List Following

**User Story:** As a user, I want to follow other users' public lists, so that I can discover curated content without following individuals.

#### Acceptance Criteria

1. WHEN a user follows a public list, THE Connection_Service SHALL create a list subscription
2. WHEN a user requests a list timeline, THE Feed_Service SHALL return posts from all list members in reverse chronological order
3. THE Connection_Service SHALL notify list owners when their list gains a new follower
4. WHEN a list owner updates list membership, THE Connection_Service SHALL reflect changes for all list followers
5. WHEN a user unfollows a list, THE Connection_Service SHALL remove the subscription
6. THE Connection_Service SHALL support pagination for followed lists
7. WHEN a list owner makes a public list private, THE Connection_Service SHALL remove all external subscriptions

### Requirement 34: Connection Management API Endpoints

**User Story:** As a developer, I want API endpoints for connection management features, so that I can build rich connection experiences.

#### Acceptance Criteria

1. THE BrightHub_System SHALL expose POST /api/brighthub/lists for creating connection lists
2. THE BrightHub_System SHALL expose GET /api/brighthub/lists for retrieving user's lists
3. THE BrightHub_System SHALL expose PUT /api/brighthub/lists/:id for updating list details
4. THE BrightHub_System SHALL expose DELETE /api/brighthub/lists/:id for deleting lists
5. THE BrightHub_System SHALL expose POST /api/brighthub/lists/:id/members for adding members to lists
6. THE BrightHub_System SHALL expose DELETE /api/brighthub/lists/:id/members for removing members from lists
7. THE BrightHub_System SHALL expose POST /api/brighthub/lists/:id/members/bulk for bulk member operations
8. THE BrightHub_System SHALL expose GET /api/brighthub/connections/categories for retrieving categories
9. THE BrightHub_System SHALL expose POST /api/brighthub/connections/:id/note for adding connection notes
10. THE BrightHub_System SHALL expose GET /api/brighthub/connections/suggestions for connection suggestions
11. THE BrightHub_System SHALL expose GET /api/brighthub/connections/mutual/:userId for mutual connections
12. THE BrightHub_System SHALL expose POST /api/brighthub/connections/:id/priority for setting priority status
13. THE BrightHub_System SHALL expose POST /api/brighthub/connections/:id/quiet for setting quiet mode
14. THE BrightHub_System SHALL expose POST /api/brighthub/connections/:id/mute/temporary for temporary mutes
15. THE BrightHub_System SHALL expose GET /api/brighthub/connections/export for exporting connections
16. THE BrightHub_System SHALL expose POST /api/brighthub/connections/import for importing connections
17. THE BrightHub_System SHALL expose POST /api/brighthub/hubs for creating hubs
18. THE BrightHub_System SHALL expose GET /api/brighthub/hubs for retrieving user's hubs
19. THE BrightHub_System SHALL expose GET /api/brighthub/connections/:id/insights for connection insights
20. THE BrightHub_System SHALL expose GET /api/brighthub/follow-requests for pending follow requests
21. THE BrightHub_System SHALL expose POST /api/brighthub/follow-requests/:id/approve for approving requests
22. THE BrightHub_System SHALL expose POST /api/brighthub/follow-requests/:id/reject for rejecting requests

### Requirement 35: Connection Management React Components

**User Story:** As a frontend developer, I want React components for connection management, so that I can build the connection UI efficiently.

#### Acceptance Criteria

1. THE brighthub-react-components library SHALL provide a ConnectionListManager component for creating and managing lists
2. THE brighthub-react-components library SHALL provide a ConnectionListCard component for displaying list previews
3. THE brighthub-react-components library SHALL provide a ConnectionCategorySelector component for assigning categories
4. THE brighthub-react-components library SHALL provide a ConnectionNoteEditor component for adding/editing notes
5. THE brighthub-react-components library SHALL provide a ConnectionSuggestions component for displaying suggestions
6. THE brighthub-react-components library SHALL provide a MutualConnections component for displaying mutual connections
7. THE brighthub-react-components library SHALL provide a ConnectionStrengthIndicator component for displaying strength
8. THE brighthub-react-components library SHALL provide a HubManager component for managing hubs
9. THE brighthub-react-components library SHALL provide a HubSelector component for post visibility selection
10. THE brighthub-react-components library SHALL provide a FollowRequestList component for managing pending requests
11. THE brighthub-react-components library SHALL provide a ConnectionPrivacySettings component for privacy controls
12. THE brighthub-react-components library SHALL provide a TemporaryMuteDialog component for setting timed mutes
13. THE brighthub-react-components library SHALL provide a ConnectionInsights component for displaying interaction stats
14. THE brighthub-react-components library SHALL provide a ListTimelineFilter component for filtering timeline by list
15. All connection components SHALL support theming through BrightHubThemeProvider
16. All connection components SHALL be accessible and comply with ARIA guidelines
17. All connection components SHALL use i18n for all user-facing strings via `useI18n` hook with `tComponent(BrightHubComponentId, key)` — no hardcoded display text (see Requirement 61)

### Requirement 36: Connection Type System Interfaces

**User Story:** As a developer, I want strongly-typed interfaces for connection features, so that I can ensure type safety.

#### Acceptance Criteria

1. THE brighthub-lib library SHALL define IBaseConnectionList<TId> generic interface for connection lists
2. THE brighthub-lib library SHALL define IBaseConnectionCategory<TId> generic interface for categories
3. THE brighthub-lib library SHALL define IBaseConnectionNote<TId> generic interface for connection notes
4. THE brighthub-lib library SHALL define IBaseHub<TId> generic interface for hubs
5. THE brighthub-lib library SHALL define IBaseFollowRequest<TId> generic interface for follow requests
6. THE brighthub-lib library SHALL define IBaseConnectionInsights<TId> generic interface for insights data
7. THE brighthub-lib library SHALL define IBaseConnectionSuggestion<TId> generic interface for suggestions
8. THE brighthub-lib library SHALL define ConnectionStrength enumeration with Strong, Moderate, Weak, and Dormant values
9. THE brighthub-lib library SHALL define ConnectionVisibility enumeration with Private, FollowersOnly, and Public values
10. THE brighthub-lib library SHALL define MuteDuration enumeration with predefined duration values
11. THE brightchain-api-lib library SHALL define API response types for all connection endpoints

### Requirement 37: Connection Database Schema

**User Story:** As a developer, I want database schemas for connection features, so that I can store and query connection data efficiently.

#### Acceptance Criteria

1. THE brightchain-db library SHALL define a connection_lists collection schema with name, description, visibility, and owner
2. THE brightchain-db library SHALL define a connection_list_members collection schema linking lists to users
3. THE brightchain-db library SHALL define a connection_categories collection schema with name, color, and icon
4. THE brightchain-db library SHALL define a connection_notes collection schema with note content and connection reference
5. THE brightchain-db library SHALL define a hubs collection schema with name and owner
6. THE brightchain-db library SHALL define a hub_members collection schema linking hubs to users
7. THE brightchain-db library SHALL define a follow_requests collection schema with requester, target, message, and status
8. THE brightchain-db library SHALL define a connection_metadata collection schema for priority, quiet mode, and category assignments
9. THE brightchain-db library SHALL define a temporary_mutes collection schema with expiration timestamps
10. THE brightchain-db library SHALL define a connection_interactions collection schema for tracking interaction history
11. THE brightchain-db library SHALL define appropriate indexes for list queries, category filters, and suggestion calculations
12. All connection schemas SHALL support the BrightChain block-based storage model

### Requirement 38: Connection Feature E2E Testing

**User Story:** As a developer, I want E2E tests for connection features, so that I can ensure the connection system works correctly.

#### Acceptance Criteria

1. THE brightchain-api-e2e library SHALL include tests for connection list CRUD operations
2. THE brightchain-api-e2e library SHALL include tests for bulk member add/remove operations
3. THE brightchain-api-e2e library SHALL include tests for connection category assignment
4. THE brightchain-api-e2e library SHALL include tests for connection notes CRUD operations
5. THE brightchain-api-e2e library SHALL include tests for hub creation and membership
6. THE brightchain-api-e2e library SHALL include tests for hub-restricted post visibility
7. THE brightchain-api-e2e library SHALL include tests for follow request workflow
8. THE brightchain-api-e2e library SHALL include tests for priority connection timeline ordering
9. THE brightchain-api-e2e library SHALL include tests for quiet mode notification suppression
10. THE brightchain-api-e2e library SHALL include tests for temporary mute expiration
11. THE brightchain-api-e2e library SHALL include tests for connection suggestions generation
12. THE brightchain-api-e2e library SHALL include tests for mutual connections calculation
13. THE brightchain-api-e2e library SHALL include tests for connection import/export
14. THE brightchain-api-e2e library SHALL include tests for block/mute inheritance on lists
15. THE brightchain-react-e2e library SHALL include Playwright tests for ConnectionListManager component
16. THE brightchain-react-e2e library SHALL include Playwright tests for HubManager component
17. THE brightchain-react-e2e library SHALL include Playwright tests for ConnectionSuggestions component
18. THE brightchain-react-e2e library SHALL include Playwright tests for FollowRequestList component
19. THE brightchain-react-e2e library SHALL include Playwright tests for ConnectionPrivacySettings component


### Requirement 39: Direct Messaging Core

**User Story:** As a user, I want to send and receive direct messages with other users, so that I can have private conversations.

#### Acceptance Criteria

1. WHEN a user sends a message to another user, THE Messaging_Service SHALL create a conversation if one does not exist and deliver the message
2. WHEN a user sends a message in an existing conversation, THE Messaging_Service SHALL append the message to the conversation thread
3. WHEN a user edits their own message within 15 minutes of sending, THE Messaging_Service SHALL update the message content and mark it as edited
4. WHEN a user deletes their own message, THE Messaging_Service SHALL soft-delete the message and display "Message deleted" placeholder
5. WHEN a recipient opens a conversation, THE Messaging_Service SHALL mark all unread messages as read and update read receipts
6. WHEN a user is typing in a conversation, THE Messaging_Service SHALL broadcast a typing indicator to other participants
7. WHEN a user stops typing for 3 seconds, THE Messaging_Service SHALL remove the typing indicator
8. WHEN a user adds an emoji reaction to a message, THE Messaging_Service SHALL attach the reaction and notify the message author
9. WHEN a user removes their reaction from a message, THE Messaging_Service SHALL remove the reaction
10. THE Messaging_Service SHALL support up to 10 unique emoji reactions per message
11. WHEN a user searches within a conversation, THE Messaging_Service SHALL return messages matching the query with context
12. THE Messaging_Service SHALL store messages in the brightchain-db with encryption at rest

### Requirement 40: Group Messaging

**User Story:** As a user, I want to create group conversations with multiple participants, so that I can communicate with several people at once.

#### Acceptance Criteria

1. WHEN a user creates a group conversation, THE Messaging_Service SHALL create the group with specified participants and optional name
2. WHEN a group creator sets a group name, THE Messaging_Service SHALL store and display the name to all participants
3. WHEN a group creator sets a group avatar, THE Messaging_Service SHALL validate the image and store the reference
4. WHEN a group admin adds a participant, THE Messaging_Service SHALL add the user and notify existing participants
5. WHEN a group admin removes a participant, THE Messaging_Service SHALL remove the user and notify remaining participants
6. WHEN a user leaves a group, THE Messaging_Service SHALL remove the user and notify remaining participants
7. THE Messaging_Service SHALL support up to 50 participants per group conversation
8. WHEN a group creator creates the group, THE Messaging_Service SHALL assign them as the initial admin
9. WHEN a group admin promotes another participant to admin, THE Messaging_Service SHALL update their role
10. WHEN a group admin demotes another admin, THE Messaging_Service SHALL update their role to participant
11. THE Messaging_Service SHALL prevent the last admin from leaving without assigning a new admin
12. WHEN all participants leave a group, THE Messaging_Service SHALL archive the group conversation

### Requirement 41: Message Content and Formatting

**User Story:** As a user, I want to send rich content in my messages, so that I can communicate expressively.

#### Acceptance Criteria

1. WHEN a user sends a text message, THE Text_Formatter SHALL process markdown, emojis, and FontAwesome icons
2. WHEN a user attaches images to a message, THE Messaging_Service SHALL validate formats (JPEG, PNG, GIF, WebP) and store references
3. THE Messaging_Service SHALL support up to 10 image attachments per message
4. WHEN a message contains a URL, THE Messaging_Service SHALL generate a link preview with title, description, and thumbnail
5. WHEN a user replies to a specific message, THE Messaging_Service SHALL create a threaded reply linking to the original message
6. WHEN a user forwards a message, THE Messaging_Service SHALL create a copy in the target conversation with "Forwarded" indicator
7. THE Messaging_Service SHALL validate that total attachment size does not exceed 25MB per message
8. IF an invalid attachment format is provided, THEN THE Messaging_Service SHALL reject the request with a validation error
9. THE Messaging_Service SHALL support message content up to 2000 characters

### Requirement 42: Message Requests and Privacy

**User Story:** As a user, I want to control who can message me, so that I can protect my privacy and avoid unwanted contact.

#### Acceptance Criteria

1. WHEN a non-follower sends a message to a user, THE Messaging_Service SHALL create a message request instead of delivering directly
2. WHEN a user views their message requests, THE Messaging_Service SHALL return pending requests with sender info and message preview
3. WHEN a user accepts a message request, THE Messaging_Service SHALL create a conversation and deliver the pending message
4. WHEN a user declines a message request, THE Messaging_Service SHALL delete the request without notifying the sender
5. WHEN a user blocks another user, THE Messaging_Service SHALL prevent the blocked user from sending messages or requests
6. WHEN a user blocks another user with existing conversation, THE Messaging_Service SHALL archive the conversation for both parties
7. WHEN a user mutes a conversation, THE Messaging_Service SHALL suppress notifications for that conversation
8. WHEN a user unmutes a conversation, THE Messaging_Service SHALL restore notifications for that conversation
9. WHEN a user reports a message, THE Messaging_Service SHALL flag the message for review and optionally block the sender
10. WHEN a user reports a conversation, THE Messaging_Service SHALL flag all messages from the reported user for review
11. THE Messaging_Service SHALL integrate with the existing block system in brightchain-db
12. WHEN a mutual follow relationship exists, THE Messaging_Service SHALL deliver messages directly without request

### Requirement 43: Conversation Management

**User Story:** As a user, I want to organize and manage my conversations, so that I can find important messages easily.

#### Acceptance Criteria

1. WHEN a user requests their conversation list, THE Messaging_Service SHALL return conversations sorted by most recent activity
2. THE Messaging_Service SHALL include unread message count for each conversation in the list
3. WHEN a user pins a conversation, THE Messaging_Service SHALL display it at the top of the conversation list
4. THE Messaging_Service SHALL support up to 10 pinned conversations per user
5. WHEN a user unpins a conversation, THE Messaging_Service SHALL restore normal sorting for that conversation
6. WHEN a user archives a conversation, THE Messaging_Service SHALL hide it from the main inbox
7. WHEN a user views archived conversations, THE Messaging_Service SHALL return all archived conversations
8. WHEN a user unarchives a conversation, THE Messaging_Service SHALL restore it to the main inbox
9. WHEN a user deletes a conversation, THE Messaging_Service SHALL remove it from the user's view while preserving it for other participants
10. WHEN a user searches conversations, THE Messaging_Service SHALL return matching conversations by participant name or message content
11. THE Messaging_Service SHALL support cursor-based pagination for conversation lists

### Requirement 44: Messaging React Components

**User Story:** As a frontend developer, I want React components for messaging, so that I can build the messaging UI efficiently.

#### Acceptance Criteria

1. THE brighthub-react-components library SHALL provide a MessagingInbox component for displaying the conversation list
2. THE brighthub-react-components library SHALL provide a ConversationView component for displaying message threads
3. THE brighthub-react-components library SHALL provide a MessageComposer component for creating and sending messages
4. THE brighthub-react-components library SHALL provide a MessageRequestsList component for managing message requests
5. THE brighthub-react-components library SHALL provide a MessageBubble component for displaying individual messages
6. THE brighthub-react-components library SHALL provide a TypingIndicator component for showing typing status
7. THE brighthub-react-components library SHALL provide a ReadReceipt component for showing seen status
8. THE brighthub-react-components library SHALL provide a MessageReactions component for displaying and adding reactions
9. THE brighthub-react-components library SHALL provide a GroupConversationSettings component for managing group details
10. THE brighthub-react-components library SHALL provide a NewConversationDialog component for starting conversations
11. THE brighthub-react-components library SHALL provide a ConversationSearch component for searching messages
12. THE brighthub-react-components library SHALL provide a MessagingMenuBadge component for top menu integration with unread count
13. All messaging components SHALL support theming through BrightHubThemeProvider
14. All messaging components SHALL be accessible and comply with ARIA guidelines
15. All messaging components SHALL use i18n for all user-facing strings via `useI18n` hook with `tComponent(BrightHubComponentId, key)` — no hardcoded display text (see Requirement 61)

### Requirement 45: Messaging API Endpoints

**User Story:** As a developer, I want RESTful API endpoints for messaging, so that I can integrate messaging with frontend applications.

#### Acceptance Criteria

1. THE BrightHub_System SHALL expose GET /api/brighthub/messages/conversations for retrieving conversation list
2. THE BrightHub_System SHALL expose POST /api/brighthub/messages/conversations for creating new conversations
3. THE BrightHub_System SHALL expose GET /api/brighthub/messages/conversations/:id for retrieving a single conversation with messages
4. THE BrightHub_System SHALL expose DELETE /api/brighthub/messages/conversations/:id for deleting a conversation
5. THE BrightHub_System SHALL expose POST /api/brighthub/messages/conversations/:id/messages for sending a message
6. THE BrightHub_System SHALL expose PUT /api/brighthub/messages/:messageId for editing a message
7. THE BrightHub_System SHALL expose DELETE /api/brighthub/messages/:messageId for deleting a message
8. THE BrightHub_System SHALL expose POST /api/brighthub/messages/:messageId/reactions for adding a reaction
9. THE BrightHub_System SHALL expose DELETE /api/brighthub/messages/:messageId/reactions/:emoji for removing a reaction
10. THE BrightHub_System SHALL expose POST /api/brighthub/messages/conversations/:id/read for marking messages as read
11. THE BrightHub_System SHALL expose POST /api/brighthub/messages/conversations/:id/typing for sending typing indicator
12. THE BrightHub_System SHALL expose GET /api/brighthub/messages/requests for retrieving message requests
13. THE BrightHub_System SHALL expose POST /api/brighthub/messages/requests/:id/accept for accepting a request
14. THE BrightHub_System SHALL expose POST /api/brighthub/messages/requests/:id/decline for declining a request
15. THE BrightHub_System SHALL expose POST /api/brighthub/messages/conversations/:id/pin for pinning a conversation
16. THE BrightHub_System SHALL expose DELETE /api/brighthub/messages/conversations/:id/pin for unpinning a conversation
17. THE BrightHub_System SHALL expose POST /api/brighthub/messages/conversations/:id/archive for archiving a conversation
18. THE BrightHub_System SHALL expose POST /api/brighthub/messages/conversations/:id/unarchive for unarchiving a conversation
19. THE BrightHub_System SHALL expose POST /api/brighthub/messages/conversations/:id/mute for muting notifications
20. THE BrightHub_System SHALL expose DELETE /api/brighthub/messages/conversations/:id/mute for unmuting notifications
21. THE BrightHub_System SHALL expose POST /api/brighthub/messages/:messageId/report for reporting a message
22. THE BrightHub_System SHALL expose GET /api/brighthub/messages/conversations/:id/search for searching within a conversation
23. THE BrightHub_System SHALL expose GET /api/brighthub/messages/search for searching across all conversations
24. THE BrightHub_System SHALL expose POST /api/brighthub/messages/conversations/:id/participants for adding group participants
25. THE BrightHub_System SHALL expose DELETE /api/brighthub/messages/conversations/:id/participants/:userId for removing group participants
26. THE BrightHub_System SHALL expose PUT /api/brighthub/messages/conversations/:id/settings for updating group settings
27. THE BrightHub_System SHALL expose POST /api/brighthub/messages/:messageId/forward for forwarding a message
28. THE BrightHub_System SHALL return appropriate HTTP status codes for success and error responses

### Requirement 46: Messaging Type System Interfaces

**User Story:** As a developer, I want strongly-typed interfaces for messaging features, so that I can ensure type safety.

#### Acceptance Criteria

1. THE brighthub-lib library SHALL define IBaseConversation<TId> generic interface for conversations
2. THE brighthub-lib library SHALL define IBaseDirectMessage<TId> generic interface for messages
3. THE brighthub-lib library SHALL define IBaseMessageRequest<TId> generic interface for message requests
4. THE brighthub-lib library SHALL define IBaseMessageReaction<TId> generic interface for reactions
5. THE brighthub-lib library SHALL define IBaseReadReceipt<TId> generic interface for read receipts
6. THE brighthub-lib library SHALL define IBaseGroupConversation<TId> generic interface extending IBaseConversation
7. THE brighthub-lib library SHALL define IBaseMessageThread<TId> generic interface for threaded replies
8. THE brighthub-lib library SHALL define ConversationType enumeration with Direct and Group values
9. THE brighthub-lib library SHALL define MessageRequestStatus enumeration with Pending, Accepted, and Declined values
10. THE brighthub-lib library SHALL define GroupParticipantRole enumeration with Admin and Participant values
11. THE brighthub-lib library SHALL define ConversationStatus enumeration with Active, Archived, and Muted values
12. THE brightchain-api-lib library SHALL define API response types for all messaging endpoints

### Requirement 47: Messaging Database Schema

**User Story:** As a developer, I want database schemas for messaging features, so that I can store and query messaging data efficiently.

#### Acceptance Criteria

1. THE brightchain-db library SHALL define a conversations collection schema with type, participants, name, avatar, and timestamps
2. THE brightchain-db library SHALL define a messages collection schema with conversation reference, sender, content, attachments, and timestamps
3. THE brightchain-db library SHALL define a message_requests collection schema with sender, recipient, message preview, and status
4. THE brightchain-db library SHALL define a message_reactions collection schema with message reference, user, and emoji
5. THE brightchain-db library SHALL define a read_receipts collection schema with conversation, user, and last read timestamp
6. THE brightchain-db library SHALL define a conversation_participants collection schema with conversation, user, role, and settings
7. THE brightchain-db library SHALL define a pinned_conversations collection schema with user and conversation reference
8. THE brightchain-db library SHALL define a archived_conversations collection schema with user and conversation reference
9. THE brightchain-db library SHALL define a muted_conversations collection schema with user, conversation, and optional expiration
10. THE brightchain-db library SHALL define a message_reports collection schema with reporter, message, reason, and status
11. THE brightchain-db library SHALL define indexes on conversations for participant lookups and recent activity sorting
12. THE brightchain-db library SHALL define indexes on messages for conversation queries and full-text search
13. THE brightchain-db library SHALL define indexes on message_requests for recipient lookups
14. All messaging schemas SHALL support the BrightChain block-based storage model

### Requirement 48: Messaging E2E Testing

**User Story:** As a developer, I want E2E tests for messaging features, so that I can ensure the messaging system works correctly.

#### Acceptance Criteria

1. THE brightchain-api-e2e library SHALL include tests for conversation creation (direct and group)
2. THE brightchain-api-e2e library SHALL include tests for sending, editing, and deleting messages
3. THE brightchain-api-e2e library SHALL include tests for message reactions add and remove
4. THE brightchain-api-e2e library SHALL include tests for read receipt updates
5. THE brightchain-api-e2e library SHALL include tests for message request workflow (create, accept, decline)
6. THE brightchain-api-e2e library SHALL include tests for group participant management (add, remove, role changes)
7. THE brightchain-api-e2e library SHALL include tests for conversation pinning and unpinning
8. THE brightchain-api-e2e library SHALL include tests for conversation archiving and unarchiving
9. THE brightchain-api-e2e library SHALL include tests for conversation muting and unmuting
10. THE brightchain-api-e2e library SHALL include tests for message search within conversations
11. THE brightchain-api-e2e library SHALL include tests for cross-conversation search
12. THE brightchain-api-e2e library SHALL include tests for message forwarding
13. THE brightchain-api-e2e library SHALL include tests for threaded replies
14. THE brightchain-api-e2e library SHALL include tests for block integration preventing messages
15. THE brightchain-api-e2e library SHALL include tests for message reporting
16. THE brightchain-react-e2e library SHALL include Playwright tests for MessagingInbox component
17. THE brightchain-react-e2e library SHALL include Playwright tests for ConversationView component
18. THE brightchain-react-e2e library SHALL include Playwright tests for MessageComposer component
19. THE brightchain-react-e2e library SHALL include Playwright tests for MessageRequestsList component
20. THE brightchain-react-e2e library SHALL include Playwright tests for GroupConversationSettings component
21. THE brightchain-react-e2e library SHALL include Playwright tests for NewConversationDialog component

### Requirement 49: Real-Time Messaging

**User Story:** As a user, I want real-time message delivery and notifications, so that I can have fluid conversations.

#### Acceptance Criteria

1. WHEN a message is sent, THE Messaging_Service SHALL deliver it to online recipients in real-time via WebSocket
2. WHEN a user comes online, THE Messaging_Service SHALL deliver any pending messages immediately
3. WHEN a typing indicator is sent, THE Messaging_Service SHALL broadcast it to conversation participants within 100ms
4. WHEN a message is read, THE Messaging_Service SHALL broadcast read receipt updates to the sender in real-time
5. WHEN a reaction is added or removed, THE Messaging_Service SHALL broadcast the update to conversation participants
6. WHEN a participant is added or removed from a group, THE Messaging_Service SHALL notify all participants in real-time
7. THE Messaging_Service SHALL maintain WebSocket connections with automatic reconnection on disconnect
8. WHEN a user receives a new message while offline, THE BrightHub_System SHALL create a notification upon next login

### Requirement 50: Messaging Notifications Integration

**User Story:** As a user, I want to receive notifications for messaging activity, so that I stay informed about new messages.

#### Acceptance Criteria

1. WHEN a user receives a new direct message, THE BrightHub_System SHALL create a notification for the recipient
2. WHEN a user receives a message in a group conversation, THE BrightHub_System SHALL create a notification for all participants except the sender
3. WHEN a user receives a message request, THE BrightHub_System SHALL create a notification for the recipient
4. WHEN a message request is accepted, THE BrightHub_System SHALL create a notification for the original sender
5. WHEN a user is added to a group conversation, THE BrightHub_System SHALL create a notification for the added user
6. WHILE a conversation is muted, THE BrightHub_System SHALL suppress notifications for that conversation
7. WHEN a user's message receives a reaction, THE BrightHub_System SHALL create a notification for the message author
8. THE BrightHub_System SHALL aggregate multiple message notifications from the same conversation within 5 minutes
9. THE BrightHub_System SHALL display unread message count badge in the top navigation menu
10. WHEN a user clears notifications, THE BrightHub_System SHALL mark messaging notifications as read but preserve unread message counts


### Requirement 51: Notification Center UI

**User Story:** As a user, I want a notification center in the top menu, so that I can quickly see and manage my notifications without leaving my current page.

#### Acceptance Criteria

1. THE Notification_Bell component SHALL display a bell icon in the TopMenu with an unread notification count badge
2. WHEN the unread count exceeds 99, THE Notification_Bell component SHALL display "99+"
3. WHEN the user clicks the Notification_Bell, THE Notification_Dropdown SHALL appear showing the 10 most recent notifications
4. THE Notification_Dropdown SHALL display each notification with actor avatar, action description, timestamp, and read/unread indicator
5. THE Notification_Dropdown SHALL include a "View all notifications" link navigating to the full notifications page
6. THE Notification_Dropdown SHALL include a "Mark all as read" action button
7. WHEN a new notification arrives, THE Notification_Bell SHALL update the badge count without page refresh
8. WHEN a new notification arrives while the dropdown is open, THE Notification_Dropdown SHALL prepend the new notification to the list
9. THE Notification_Dropdown SHALL close when the user clicks outside of it
10. THE Notification_Dropdown SHALL support keyboard navigation for accessibility

### Requirement 52: Modular Notification System Architecture

**User Story:** As a developer, I want a modular notification system, so that any component in the application can access and respond to notification state.

#### Acceptance Criteria

1. THE Notification_Provider context SHALL wrap the application and manage global notification state
2. THE Notification_Provider SHALL expose a useNotifications hook for accessing notification state and actions
3. THE useNotifications hook SHALL provide: notifications array, unreadCount, markAsRead, markAllAsRead, deleteNotification, and refreshNotifications functions
4. THE Notification_Provider SHALL establish a WebSocket subscription for real-time notification updates
5. WHEN the WebSocket connection is lost, THE Notification_Provider SHALL automatically reconnect with exponential backoff
6. THE Notification_Provider SHALL cache notifications locally and sync with server on reconnection
7. THE Notification_Provider SHALL support filtering notifications by Notification_Category
8. THE Notification_Provider SHALL emit events when notifications are received, allowing components to react independently
9. THE useNotifications hook SHALL provide a subscribe function for components to listen to specific notification types
10. THE Notification_Provider SHALL deduplicate notifications to prevent duplicate display

### Requirement 53: Notification Display Components

**User Story:** As a frontend developer, I want reusable notification display components, so that I can build consistent notification UIs across the application.

#### Acceptance Criteria

1. THE brighthub-react-components library SHALL provide a NotificationBell component for TopMenu integration
2. THE brighthub-react-components library SHALL provide a NotificationDropdown component for the quick-view panel
3. THE brighthub-react-components library SHALL provide a NotificationItem component for rendering individual notifications
4. THE brighthub-react-components library SHALL provide a NotificationList component for the full notifications page
5. THE brighthub-react-components library SHALL provide a NotificationPreferences component for managing notification settings
6. THE brighthub-react-components library SHALL provide a NotificationCategoryFilter component for filtering by category
7. THE NotificationItem component SHALL support click-through navigation to the relevant content
8. THE NotificationItem component SHALL display grouped notifications with expandable details (e.g., "5 people liked your post")
9. THE NotificationList component SHALL support infinite scroll pagination
10. THE NotificationList component SHALL support filtering by read/unread status
11. All notification components SHALL support theming through BrightHubThemeProvider
12. All notification components SHALL be accessible and comply with ARIA guidelines
13. All notification components SHALL use i18n for all user-facing strings via `useI18n` hook with `tComponent(BrightHubComponentId, key)` — no hardcoded display text (see Requirement 61)

### Requirement 54: Notification Actions

**User Story:** As a user, I want to manage my notifications, so that I can keep my notification list organized and relevant.

#### Acceptance Criteria

1. WHEN a user clicks a notification, THE Notification_Service SHALL mark it as read and navigate to the relevant content
2. WHEN a user clicks "Mark as read" on a notification, THE Notification_Service SHALL mark only that notification as read
3. WHEN a user clicks "Mark all as read", THE Notification_Service SHALL mark all notifications as read
4. WHEN a user deletes a notification, THE Notification_Service SHALL remove it from their notification list
5. WHEN a user clicks "Clear all", THE Notification_Service SHALL delete all notifications for that user
6. THE Notification_Service SHALL support bulk delete operations for selected notifications
7. WHEN a user hovers over a notification, THE NotificationItem SHALL display action buttons (mark read, delete)
8. THE Notification_Service SHALL support undo for delete operations within 5 seconds

### Requirement 55: Notification Categories and Grouping

**User Story:** As a user, I want notifications organized by category and grouped by type, so that I can quickly understand my notification activity.

#### Acceptance Criteria

1. THE Notification_Service SHALL categorize notifications into: social, messages, connections, and system
2. THE social category SHALL include: likes, reposts, quotes, replies, and mentions
3. THE messages category SHALL include: new messages, message requests, and message reactions
4. THE connections category SHALL include: new followers, follow requests, and reconnect reminders
5. THE system category SHALL include: account alerts, security notifications, and feature announcements
6. WHEN multiple users perform the same action on the same content within 1 hour, THE Notification_Service SHALL group them into a single notification
7. THE grouped notification SHALL display the count and list of actors (e.g., "Alice, Bob, and 3 others liked your post")
8. WHEN a user expands a grouped notification, THE NotificationItem SHALL display individual actors with timestamps
9. THE Notification_Service SHALL support ungrouping notifications in user preferences
10. THE NotificationCategoryFilter component SHALL allow filtering the notification list by one or more categories

### Requirement 56: Notification Preferences

**User Story:** As a user, I want to control my notification preferences, so that I only receive notifications I care about.

#### Acceptance Criteria

1. THE NotificationPreferences component SHALL allow enabling/disabling notifications per Notification_Category
2. THE NotificationPreferences component SHALL allow configuring email notification preferences per category
3. THE NotificationPreferences component SHALL allow configuring push notification preferences per category (for future mobile support)
4. THE Notification_Service SHALL respect user preferences when creating notifications
5. WHEN a user enables Quiet_Hours, THE Notification_Service SHALL suppress in-app notifications during the specified time window
6. THE NotificationPreferences component SHALL allow setting Quiet_Hours start and end times with timezone support
7. WHEN a user enables Do_Not_Disturb mode, THE Notification_Service SHALL suppress all non-critical notifications
8. THE NotificationPreferences component SHALL allow setting Do_Not_Disturb duration (1 hour, 8 hours, 24 hours, until manually disabled)
9. THE Notification_Service SHALL still deliver critical system notifications (security alerts) even during Do_Not_Disturb
10. THE NotificationPreferences component SHALL allow configuring notification sound preferences (on/off, custom sounds)
11. THE Notification_Service SHALL store preferences in the user profile and sync across devices
12. WHEN preferences are updated, THE Notification_Provider SHALL immediately reflect the changes without page refresh

### Requirement 57: Notification API Endpoints

**User Story:** As a developer, I want RESTful API endpoints for notification management, so that I can integrate the notification system with frontend applications.

#### Acceptance Criteria

1. THE BrightHub_System SHALL expose GET /api/brighthub/notifications for retrieving paginated notifications
2. THE BrightHub_System SHALL expose GET /api/brighthub/notifications/unread-count for retrieving unread notification count
3. THE BrightHub_System SHALL expose POST /api/brighthub/notifications/:id/read for marking a notification as read
4. THE BrightHub_System SHALL expose POST /api/brighthub/notifications/read-all for marking all notifications as read
5. THE BrightHub_System SHALL expose DELETE /api/brighthub/notifications/:id for deleting a notification
6. THE BrightHub_System SHALL expose DELETE /api/brighthub/notifications for bulk deleting notifications
7. THE BrightHub_System SHALL expose GET /api/brighthub/notifications/preferences for retrieving notification preferences
8. THE BrightHub_System SHALL expose PUT /api/brighthub/notifications/preferences for updating notification preferences
9. THE BrightHub_System SHALL expose POST /api/brighthub/notifications/preferences/quiet-hours for setting quiet hours
10. THE BrightHub_System SHALL expose POST /api/brighthub/notifications/preferences/dnd for enabling/disabling Do Not Disturb
11. THE BrightHub_System SHALL expose WebSocket endpoint /ws/notifications for real-time notification delivery
12. THE BrightHub_System SHALL return appropriate HTTP status codes for success and error responses

### Requirement 58: Notification Type System Interfaces

**User Story:** As a developer, I want strongly-typed interfaces for notification features, so that I can ensure type safety across the notification system.

#### Acceptance Criteria

1. THE brighthub-lib library SHALL define IBaseNotification<TId> generic interface with id, type, category, actorId, targetId, content, read, createdAt, and clickThroughUrl fields
2. THE brighthub-lib library SHALL define IBaseNotificationGroup<TId> generic interface for grouped notifications with actors array and count
3. THE brighthub-lib library SHALL define IBaseNotificationPreferences<TId> generic interface for user notification settings
4. THE brighthub-lib library SHALL define NotificationCategory enumeration with Social, Messages, Connections, and System values
5. THE brighthub-lib library SHALL define NotificationType enumeration with Like, Reply, Mention, Follow, FollowRequest, Repost, Quote, NewMessage, MessageRequest, MessageReaction, SystemAlert values
6. THE brighthub-lib library SHALL define NotificationChannel enumeration with InApp, Email, and Push values
7. THE brighthub-lib library SHALL define INotificationProviderState interface for the context state
8. THE brighthub-lib library SHALL define INotificationActions interface for the context actions
9. THE brightchain-api-lib library SHALL define API response types for all notification endpoints
10. THE brighthub-lib library SHALL define IQuietHoursConfig interface with startTime, endTime, and timezone fields
11. THE brighthub-lib library SHALL define IDoNotDisturbConfig interface with enabled, duration, and expiresAt fields

### Requirement 59: Notification Database Schema Extensions

**User Story:** As a developer, I want database schema extensions for notification UI features, so that I can store notification preferences and grouping data.

#### Acceptance Criteria

1. THE brightchain-db library SHALL extend the notifications collection schema with category, clickThroughUrl, and groupId fields
2. THE brightchain-db library SHALL define a notification_preferences collection schema with userId, categorySettings, channelSettings, quietHours, and dndConfig
3. THE brightchain-db library SHALL define a notification_groups collection schema with groupKey, notificationIds, actorIds, and count
4. THE brightchain-db library SHALL define indexes on notifications for category filtering and unread queries
5. THE brightchain-db library SHALL define indexes on notification_preferences for user lookups
6. All notification schemas SHALL support the BrightChain block-based storage model

### Requirement 60: Notification UI E2E Testing

**User Story:** As a developer, I want E2E tests for notification UI features, so that I can ensure the notification system works correctly.

#### Acceptance Criteria

1. THE brightchain-api-e2e library SHALL include tests for notification CRUD operations
2. THE brightchain-api-e2e library SHALL include tests for notification preference updates
3. THE brightchain-api-e2e library SHALL include tests for notification grouping logic
4. THE brightchain-api-e2e library SHALL include tests for quiet hours enforcement
5. THE brightchain-api-e2e library SHALL include tests for Do Not Disturb mode
6. THE brightchain-api-e2e library SHALL include tests for real-time notification delivery via WebSocket
7. THE brightchain-react-e2e library SHALL include Playwright tests for NotificationBell component badge updates
8. THE brightchain-react-e2e library SHALL include Playwright tests for NotificationDropdown open/close behavior
9. THE brightchain-react-e2e library SHALL include Playwright tests for NotificationList infinite scroll
10. THE brightchain-react-e2e library SHALL include Playwright tests for NotificationPreferences form interactions
11. THE brightchain-react-e2e library SHALL include Playwright tests for notification click-through navigation
12. THE brightchain-react-e2e library SHALL include Playwright tests for mark as read and delete actions
13. THE brightchain-react-e2e library SHALL include Playwright tests for notification category filtering
14. THE brightchain-react-e2e library SHALL include Playwright tests for grouped notification expansion


### Requirement 61: Internationalization (i18n) Support

**User Story:** As a developer, I want all user-facing strings to be internationalized from the start, so that we avoid costly retrofitting and can support multiple languages.

#### Acceptance Criteria

1. THE brighthub-lib library SHALL define a BrightHubComponentId and BrightHubStrings enum following the existing `@digitaldefiance/i18n-lib` `createI18nStringKeys` pattern used by BrightChainStrings (already in place)
2. THE brighthub-lib library SHALL define i18n string keys for all user-facing text including error messages, validation messages, UI labels, and notification content templates
3. THE brighthub-lib library SHALL provide a `translate` helper function scoped to the BrightHub component, following the same pattern as brightchain-lib's `translate()` (already in place)
4. All React components in brighthub-react-components SHALL use the `useI18n` hook from `@digitaldefiance/express-suite-react-components` with `tComponent(BrightHubComponentId, key)` for all user-facing strings — no hardcoded display text
5. All API error messages and validation messages in brightchain-api-lib BrightHub services SHALL use BrightHubStrings keys via the translate function instead of hardcoded strings
6. All notification content strings SHALL use i18n template keys with variable substitution (e.g., `{ACTOR_NAME} liked your post`)
7. THE brighthub-lib library SHALL provide default English (en-US) translations for all string keys
8. All BrightHub i18n string keys SHALL follow the naming convention `BrightHub_{Component}_{Description}` (e.g., `BrightHub_PostComposer_CharacterLimitExceeded`)
9. THE brighthub-react-components test suite SHALL mock `useI18n` consistently, following the pattern established in brightmail-react-components tests
10. THE brighthub-lib library SHALL register its component config with the global i18n engine during initialization, following the `createBrightChainComponentConfig()` pattern (already in place)
