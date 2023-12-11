# Requirements Document

## Introduction

BrightChain needs a cross-cutting "Friends" system that is distinct from the existing follow/connection graph in brighthub-lib. While follows are asymmetric (A follows B), friendship is a symmetric, mutual relationship that requires consent from both parties. The Friends system lives in brightchain-lib so that every dApp (brightHub, brightChat, brightCal, brightMail, brightPass, brightChart, digitalburnbag, etc.) can consume it through a single shared API. This enables features like "share calendar with friends," "chat with friends," and "friends-only posts" across the entire platform.

## Glossary

- **Friends_Service**: The shared service interface in brightchain-lib that manages friend relationships, friend requests, and friend queries across all dApps.
- **Friends_API**: The Node.js/Express API layer in brightchain-api-lib that exposes the Friends_Service over HTTP REST endpoints.
- **Friend_Relationship**: A symmetric, mutual connection between two members where both parties have explicitly consented. Identified by a unique pair of member IDs.
- **Friend_Request**: A pending invitation from one member to another proposing a Friend_Relationship. Requires explicit acceptance or rejection by the recipient.
- **Friend_Request_Status**: The state of a Friend_Request: `pending`, `accepted`, `rejected`, or `cancelled`.
- **Member_ID**: The unique identifier for a BrightChain member. Represented as `string` on the frontend and `GuidV4Buffer`/`Uint8Array` on the backend, following the existing `TId` generic pattern.
- **Friendship_Status**: The computed relationship state between two members from the perspective of a querying member: `none`, `pending_sent`, `pending_received`, `friends`.
- **dApp**: A BrightChain application (brightHub, brightChat, brightCal, etc.) that consumes the Friends_Service.
- **Block_Check**: A guard that prevents friend operations between members where one has blocked the other, delegating to the existing block system.

## Requirements

### Requirement 1: Send Friend Request

**User Story:** As a BrightChain member, I want to send a friend request to another member, so that I can establish a mutual friendship.

#### Acceptance Criteria

1. WHEN a member sends a friend request to another member, THE Friends_Service SHALL create a Friend_Request with status `pending` and record the requester Member_ID, recipient Member_ID, optional message, and creation timestamp.
2. IF the requester Member_ID equals the recipient Member_ID, THEN THE Friends_Service SHALL reject the request with a `SELF_REQUEST_NOT_ALLOWED` error.
3. IF a Friend_Relationship already exists between the two members, THEN THE Friends_Service SHALL reject the request with an `ALREADY_FRIENDS` error.
4. IF a pending Friend_Request already exists from the requester to the recipient, THEN THE Friends_Service SHALL reject the request with a `REQUEST_ALREADY_EXISTS` error.
5. IF a pending Friend_Request already exists from the recipient to the requester, THEN THE Friends_Service SHALL automatically accept both requests and create the Friend_Relationship.
6. IF the recipient has blocked the requester or the requester has blocked the recipient, THEN THE Friends_Service SHALL reject the request with a `USER_BLOCKED` error.

### Requirement 2: Accept Friend Request

**User Story:** As a BrightChain member, I want to accept a friend request, so that I can become friends with the requester.

#### Acceptance Criteria

1. WHEN a member accepts a pending Friend_Request addressed to the member, THE Friends_Service SHALL update the Friend_Request status to `accepted` and create a Friend_Relationship between the two members.
2. WHEN a Friend_Relationship is created, THE Friends_Service SHALL record the creation timestamp and both Member_IDs.
3. IF the Friend_Request does not exist or is not in `pending` status, THEN THE Friends_Service SHALL reject the operation with a `REQUEST_NOT_FOUND` error.
4. IF the accepting member is not the recipient of the Friend_Request, THEN THE Friends_Service SHALL reject the operation with an `UNAUTHORIZED` error.

### Requirement 3: Reject Friend Request

**User Story:** As a BrightChain member, I want to reject a friend request, so that I can decline unwanted friendship invitations.

#### Acceptance Criteria

1. WHEN a member rejects a pending Friend_Request addressed to the member, THE Friends_Service SHALL update the Friend_Request status to `rejected`.
2. IF the Friend_Request does not exist or is not in `pending` status, THEN THE Friends_Service SHALL reject the operation with a `REQUEST_NOT_FOUND` error.
3. IF the rejecting member is not the recipient of the Friend_Request, THEN THE Friends_Service SHALL reject the operation with an `UNAUTHORIZED` error.

### Requirement 4: Cancel Friend Request

**User Story:** As a BrightChain member, I want to cancel a friend request I sent, so that I can withdraw my invitation before it is acted upon.

#### Acceptance Criteria

1. WHEN a member cancels a pending Friend_Request that the member sent, THE Friends_Service SHALL update the Friend_Request status to `cancelled`.
2. IF the Friend_Request does not exist or is not in `pending` status, THEN THE Friends_Service SHALL reject the operation with a `REQUEST_NOT_FOUND` error.
3. IF the cancelling member is not the requester of the Friend_Request, THEN THE Friends_Service SHALL reject the operation with an `UNAUTHORIZED` error.

### Requirement 5: Remove Friend

**User Story:** As a BrightChain member, I want to remove an existing friend, so that I can end a friendship without blocking the other member.

#### Acceptance Criteria

1. WHEN a member removes a friend, THE Friends_Service SHALL delete the Friend_Relationship between the two members.
2. IF no Friend_Relationship exists between the two members, THEN THE Friends_Service SHALL reject the operation with a `NOT_FRIENDS` error.
3. WHEN a Friend_Relationship is removed, THE Friends_Service SHALL allow either member to send a new Friend_Request in the future.

### Requirement 6: Query Friends List

**User Story:** As a BrightChain member, I want to retrieve my friends list, so that I can see all my current friends.

#### Acceptance Criteria

1. WHEN a member queries the friends list, THE Friends_Service SHALL return a paginated list of Friend_Relationships for the member, ordered by creation timestamp descending.
2. THE Friends_Service SHALL support cursor-based pagination with a configurable page size for friends list queries.
3. THE Friends_Service SHALL return the total friend count alongside the paginated results.

### Requirement 7: Query Friend Requests

**User Story:** As a BrightChain member, I want to view my pending friend requests (both sent and received), so that I can manage my invitations.

#### Acceptance Criteria

1. WHEN a member queries received friend requests, THE Friends_Service SHALL return a paginated list of Friend_Requests with status `pending` where the member is the recipient, ordered by creation timestamp descending.
2. WHEN a member queries sent friend requests, THE Friends_Service SHALL return a paginated list of Friend_Requests with status `pending` where the member is the requester, ordered by creation timestamp descending.
3. THE Friends_Service SHALL support cursor-based pagination with a configurable page size for friend request queries.

### Requirement 8: Check Friendship Status

**User Story:** As a dApp, I want to check the friendship status between two members, so that I can gate features based on friendship (e.g., friends-only calendar sharing, friends-only chat).

#### Acceptance Criteria

1. WHEN a dApp queries the Friendship_Status between two members, THE Friends_Service SHALL return one of: `none`, `pending_sent`, `pending_received`, or `friends`.
2. THE Friends_Service SHALL resolve the Friendship_Status by checking for an existing Friend_Relationship first, then checking for pending Friend_Requests.
3. WHEN a dApp queries whether two members are friends, THE Friends_Service SHALL provide a boolean convenience method that returns `true` only when a Friend_Relationship exists.

### Requirement 9: Mutual Friends

**User Story:** As a BrightChain member, I want to see mutual friends between myself and another member, so that I can discover shared connections.

#### Acceptance Criteria

1. WHEN a member queries mutual friends with another member, THE Friends_Service SHALL return a paginated list of members who have Friend_Relationships with both queried members.
2. THE Friends_Service SHALL support cursor-based pagination with a configurable page size for mutual friends queries.
3. THE Friends_Service SHALL return the total mutual friend count alongside the paginated results.

### Requirement 10: Block Interaction with Friends System

**User Story:** As a BrightChain member, I want blocking a member to automatically clean up any friend relationship or pending request, so that blocked members have no friend-level access.

#### Acceptance Criteria

1. WHEN a member blocks another member, THE Friends_Service SHALL remove any existing Friend_Relationship between the two members.
2. WHEN a member blocks another member, THE Friends_Service SHALL cancel any pending Friend_Requests between the two members (in either direction).
3. WHILE a block exists between two members, THE Friends_Service SHALL prevent any new Friend_Requests between the two members.

### Requirement 11: Shared Data Interfaces

**User Story:** As a developer, I want the Friends system interfaces to live in brightchain-lib with the generic TId pattern, so that all dApps (frontend and backend) can consume them with type safety.

#### Acceptance Criteria

1. THE Friends_Service SHALL define `IBaseFriendship<TId>` in brightchain-lib containing both Member_IDs, a unique relationship identifier, and a creation timestamp, following the existing `IBaseFollow<TId>` pattern.
2. THE Friends_Service SHALL define `IBaseFriendRequest<TId>` in brightchain-lib containing requester Member_ID, recipient Member_ID, optional message, Friend_Request_Status, and creation timestamp, following the existing `IBaseFollowRequest<TId>` pattern.
3. THE Friends_Service SHALL define `IFriendsService` in brightchain-lib as a platform-agnostic interface that all dApps can depend on.
4. THE Friends_API SHALL define API response types in brightchain-api-lib that extend Express Response and carry the brightchain-lib data interfaces as the response body.

### Requirement 12: Database Schema

**User Story:** As a developer, I want dedicated database collections for friendships and friend requests, so that the Friends system has its own storage independent of the brighthub follow system.

#### Acceptance Criteria

1. THE Friends_Service SHALL store Friend_Relationships in a `brightchain_friendships` collection with a unique compound index on the sorted pair of Member_IDs to enforce one friendship per pair.
2. THE Friends_Service SHALL store Friend_Requests in a `brightchain_friend_requests` collection with indexes supporting queries by requester, recipient, and status.
3. THE Friends_Service SHALL use the `brightchain_` collection prefix (not `brighthub_`) to indicate the collections are shared across all dApps.
4. THE Friends_Service SHALL define collection schemas in brightchain-db following the existing `CollectionSchema` pattern used by brighthub schemas.

### Requirement 13: Friends-Aware REST API

**User Story:** As a dApp developer, I want REST API endpoints for all friend operations, so that frontend applications and other services can interact with the Friends system over HTTP.

#### Acceptance Criteria

1. THE Friends_API SHALL expose endpoints for sending, accepting, rejecting, and cancelling Friend_Requests under a `/friends` route namespace.
2. THE Friends_API SHALL expose endpoints for removing friends, listing friends, and checking Friendship_Status under the `/friends` route namespace.
3. THE Friends_API SHALL expose an endpoint for querying mutual friends under the `/friends` route namespace.
4. THE Friends_API SHALL require authentication via the existing JWT middleware for all friend endpoints.
5. IF an unauthenticated request is made to any friend endpoint, THEN THE Friends_API SHALL return a 401 Unauthorized response.

### Requirement 14: BrightChat Friends Suggestions

**User Story:** As a BrightChat user, I want my friends to appear as suggested recipients when composing a new direct message, so that I can quickly start conversations with people I know.

#### Acceptance Criteria

1. WHEN a member opens the new Direct Message recipient picker, THE system SHALL display a "Friends" section listing the member's friends retrieved from the IFriendsService.
2. WHEN the recipient picker displays suggestions, THE system SHALL show the "Friends" section above other suggestion sources (e.g., recent conversations, followed users).
3. WHEN a member types in the recipient search field, THE system SHALL filter the friends list to match the search query against friend display names and usernames.
4. IF the member has no friends, THEN THE system SHALL omit the "Friends" section from the recipient picker rather than showing an empty section.

### Requirement 15: BrightHub Friends Integration

**User Story:** As a BrightHub user, I want to see friend information on profiles and have friends incorporated into the discovery system, so that I can leverage my friendships within the social network.

#### Acceptance Criteria

1. WHEN a member views a user profile, THE system SHALL display the user's friend count alongside the existing follower and following counts.
2. WHEN the IDiscoveryService generates connection suggestions, THE system SHALL incorporate mutual friends as a suggestion reason by adding a `MutualFriends` value to the `SuggestionReason` enum.
3. WHEN a member creates a post, THE system SHALL offer a "Friends Only" visibility option that restricts the post to members who have a Friend_Relationship with the author.
4. WHEN a member views a user profile, THE system SHALL display a "Friends" tab that lists the user's friends (subject to the viewed user's privacy settings).

### Requirement 16: BrightPass Friends Sharing

**User Story:** As a BrightPass user, I want my friends to appear as suggested recipients when sharing credentials or passwords, so that I can quickly share with trusted people.

#### Acceptance Criteria

1. WHEN a member initiates sharing of a credential or password entry, THE system SHALL display a "Friends" section in the recipient picker listing the member's friends retrieved from the IFriendsService.
2. WHEN the sharing recipient picker displays suggestions, THE system SHALL show the "Friends" section above other suggestion sources.
3. IF the member has no friends, THEN THE system SHALL omit the "Friends" section from the sharing recipient picker.

### Requirement 17: Digital Burnbag Friends Sharing

**User Story:** As a Digital Burnbag user, I want my friends to appear as suggested recipients when sharing files or vaults, and I want a quick action to share with all friends, so that I can easily share sensitive files with trusted people.

#### Acceptance Criteria

1. WHEN a member initiates sharing of a file or vault, THE system SHALL display a "Friends" section in the recipient picker listing the member's friends retrieved from the IFriendsService.
2. WHEN the sharing recipient picker displays suggestions, THE system SHALL show the "Friends" section above other suggestion sources.
3. THE system SHALL provide a "Share with Friends" quick action that shares the file or vault with all of the member's current friends in a single operation.
4. IF the member has no friends, THEN THE system SHALL omit the "Friends" section and the "Share with Friends" quick action from the sharing UI.

### Requirement 18: BrightCal Friends Integration

**User Story:** As a BrightCal user, I want to share calendar events with friends and invite friends to events, so that I can coordinate schedules with people I trust.

#### Acceptance Criteria

1. WHEN a member creates or edits a calendar event, THE system SHALL offer a "Friends Only" visibility option (extending the existing `EventVisibility` enum) that restricts event details to members who have a Friend_Relationship with the event organizer.
2. WHEN a member adds attendees to a calendar event, THE system SHALL display a "Friends" section in the attendee picker listing the member's friends retrieved from the IFriendsService.
3. WHEN the attendee picker displays suggestions, THE system SHALL show the "Friends" section above other suggestion sources.
4. IF the member has no friends, THEN THE system SHALL omit the "Friends" section from the attendee picker.
