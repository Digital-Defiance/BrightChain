# Implementation Plan: BrightChain Friends System

## Overview

Implement a cross-cutting Friends system in the BrightChain Nx monorepo. Core enumerations, data interfaces, error types, and the `IFriendsService` / `IFriendsSuggestionProvider` contracts go in `brightchain-lib`. Database schemas go in `brightchain-db`. The Express controller and API response types go in `brightchain-api-lib`. Each dApp (BrightChat, BrightHub, BrightPass, Digital Burnbag, BrightCal) then integrates via its own lib and/or React component library. All code is TypeScript; tests use Jest + fast-check v4.7.0.

## Tasks

- [x] 1. Create shared enumerations, data interfaces, and error types in brightchain-lib
  - [x] 1.1 Create `FriendRequestStatus` enum in `brightchain-lib/src/lib/enumerations/friend-request-status.ts`
    - Values: `Pending`, `Accepted`, `Rejected`, `Cancelled`
    - Export from brightchain-lib barrel
    - _Requirements: 1.1, 11.2_

  - [x] 1.2 Create `FriendshipStatus` enum in `brightchain-lib/src/lib/enumerations/friendship-status.ts`
    - Values: `None`, `PendingSent`, `PendingReceived`, `Friends`
    - Export from brightchain-lib barrel
    - _Requirements: 8.1, 11.2_

  - [x] 1.3 Create `FriendsErrorCode` enum in `brightchain-lib/src/lib/enumerations/friends-error-code.ts`
    - Values: `SelfRequestNotAllowed`, `AlreadyFriends`, `RequestAlreadyExists`, `RequestNotFound`, `NotFriends`, `UserBlocked`, `Unauthorized`
    - Export from brightchain-lib barrel
    - _Requirements: 1.2, 1.3, 1.4, 1.6, 2.3, 2.4, 3.2, 3.3, 4.2, 4.3, 5.2_

  - [x] 1.4 Create `FriendsServiceError` class in `brightchain-lib/src/lib/errors/friends-service-error.ts`
    - Extends `Error`, takes `FriendsErrorCode` and message
    - Export from brightchain-lib barrel
    - _Requirements: 1.2, 1.3, 1.4, 1.6_

  - [x] 1.5 Create `IBaseFriendship<TId>` interface in `brightchain-lib/src/lib/interfaces/friends/base-friendship.ts`
    - Fields: `_id`, `memberIdA`, `memberIdB`, `createdAt` (conditional type on TId)
    - Export from brightchain-lib barrel
    - _Requirements: 11.1_

  - [x] 1.6 Create `IBaseFriendRequest<TId>` interface in `brightchain-lib/src/lib/interfaces/friends/base-friend-request.ts`
    - Fields: `_id`, `requesterId`, `recipientId`, `message?`, `status`, `createdAt`
    - Export from brightchain-lib barrel
    - _Requirements: 11.2_

  - [x] 1.7 Create `IPaginationOptions` and `IPaginatedResult<T>` in brightchain-lib if not already shared
    - Re-export or extract from brighthub-lib's `user-profile-service.ts` definitions
    - _Requirements: 6.2, 7.3, 9.2_

  - [x] 1.8 Create `IFriendsService` interface in `brightchain-lib/src/lib/interfaces/friends/friends-service.ts`
    - Methods: `sendFriendRequest`, `acceptFriendRequest`, `rejectFriendRequest`, `cancelFriendRequest`, `removeFriend`, `getFriends`, `getReceivedFriendRequests`, `getSentFriendRequests`, `getFriendshipStatus`, `areFriends`, `getMutualFriends`, `onUserBlocked`
    - Include `IFriendRequestResult` return type
    - Export from brightchain-lib barrel
    - _Requirements: 11.3_

  - [x] 1.9 Create `IFriendsSuggestionProvider` interface in `brightchain-lib/src/lib/interfaces/friends/friends-suggestion-provider.ts`
    - Method: `getFriendSuggestions(userId, searchQuery?, options?)`
    - Export from brightchain-lib barrel
    - _Requirements: 14.3, 16.1, 17.1, 18.2_

  - [x] 1.10 Write unit tests for compile-time type checks in `brightchain-lib/src/lib/__tests__/friends-types.spec.ts`
    - Verify `IBaseFriendship<string>`, `IBaseFriendRequest<string>`, `IFriendsService` compile correctly
    - Verify enum values match expected strings
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 2. Create database schemas in brightchain-db
  - [x] 2.1 Create `brightchain_friendships` schema in `brightchain-db/src/lib/schemas/brightchain/friends.schema.ts`
    - Define `FRIENDSHIPS_COLLECTION`, `FRIENDSHIPS_SCHEMA` following `CollectionSchema` pattern
    - Unique compound index on `(memberIdA, memberIdB)`
    - Query indexes on `memberIdA` and `memberIdB` with `createdAt` descending
    - Export from brightchain-db barrel
    - _Requirements: 12.1, 12.3, 12.4_

  - [x] 2.2 Create `brightchain_friend_requests` schema in the same file (or adjacent)
    - Define `FRIEND_REQUESTS_COLLECTION`, `FRIEND_REQUESTS_SCHEMA`
    - Indexes: `(recipientId, status, createdAt)`, `(requesterId, status, createdAt)`, unique `(requesterId, recipientId)`
    - Export from brightchain-db barrel
    - _Requirements: 12.2, 12.3, 12.4_

  - [x] 2.3 Write unit tests for schema definitions in `brightchain-db/src/lib/__tests__/friends-schema.spec.ts`
    - Verify collection names use `brightchain_` prefix
    - Verify required fields and index configurations
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement FriendsService core logic
  - [x] 4.1 Create `sortPair` utility in `brightchain-lib/src/lib/utils/sort-pair.ts`
    - Lexicographic sort of two member IDs for symmetric storage
    - Export from brightchain-lib barrel
    - _Requirements: 12.1_

  - [x] 4.2 Implement `FriendsService` class in `brightchain-api-lib/src/lib/services/friends-service.ts`
    - Inject database collections and `IUserProfileService` (for block checks)
    - Implement `sendFriendRequest`: validate self-request, block check, already-friends check, duplicate check, reciprocal auto-accept
    - Implement `acceptFriendRequest`: validate pending status, authorization, create friendship with sorted pair
    - Implement `rejectFriendRequest`: validate pending status, authorization, update status
    - Implement `cancelFriendRequest`: validate pending status, authorization, update status
    - Implement `removeFriend`: validate friendship exists, delete record
    - Implement `getFriends`: query both `memberIdA` and `memberIdB` columns, merge, paginate, return totalCount
    - Implement `getReceivedFriendRequests` / `getSentFriendRequests`: filter by status=pending
    - Implement `getFriendshipStatus` / `areFriends`: check friendship first, then pending requests
    - Implement `getMutualFriends`: compute intersection of friend sets
    - Implement `onUserBlocked`: remove friendship, cancel pending requests in both directions
    - _Requirements: 1.1–1.6, 2.1–2.4, 3.1–3.3, 4.1–4.3, 5.1–5.3, 6.1–6.3, 7.1–7.3, 8.1–8.3, 9.1–9.3, 10.1–10.3_

  - [x] 4.3 Write property test: send request creates valid pending record
    - **Property 1: Send request creates a valid pending record**
    - **Validates: Requirements 1.1**

  - [x] 4.4 Write property test: self-requests are always rejected
    - **Property 2: Self-requests are always rejected**
    - **Validates: Requirements 1.2**

  - [x] 4.5 Write property test: duplicate friend requests are rejected
    - **Property 3: Duplicate friend requests are rejected**
    - **Validates: Requirements 1.4**

  - [x] 4.6 Write property test: already-friends requests are rejected
    - **Property 4: Already-friends requests are rejected**
    - **Validates: Requirements 1.3**

  - [x] 4.7 Write property test: reciprocal requests auto-accept into friendship
    - **Property 5: Reciprocal requests auto-accept into friendship**
    - **Validates: Requirements 1.5**

  - [x] 4.8 Write property test: blocked members cannot send friend requests
    - **Property 6: Blocked members cannot send friend requests**
    - **Validates: Requirements 1.6, 10.3**

  - [x] 4.9 Write property test: accepting a request creates a valid friendship
    - **Property 7: Accepting a request creates a valid friendship**
    - **Validates: Requirements 2.1, 2.2**

  - [x] 4.10 Write property test: only the authorized party can act on a request
    - **Property 8: Only the authorized party can act on a request**
    - **Validates: Requirements 2.4, 3.3, 4.3**

  - [x] 4.11 Write property test: rejecting a request updates status to rejected
    - **Property 9: Rejecting a request updates status to rejected**
    - **Validates: Requirements 3.1**

  - [x] 4.12 Write property test: cancelling a request updates status to cancelled
    - **Property 10: Cancelling a request updates status to cancelled**
    - **Validates: Requirements 4.1**

  - [x] 4.13 Write property test: remove friendship round-trip
    - **Property 11: Remove friendship round-trip**
    - **Validates: Requirements 5.1, 5.3**

- [x] 5. Implement FriendsService query and status methods with property tests
  - [x] 5.1 Write property test: friends list is ordered and complete
    - **Property 12: Friends list is ordered and complete**
    - **Validates: Requirements 6.1, 6.2**

  - [x] 5.2 Write property test: paginated results include accurate total count
    - **Property 13: Paginated results include accurate total count**
    - **Validates: Requirements 6.3, 9.3**

  - [x] 5.3 Write property test: received/sent request queries return only pending requests for the correct party
    - **Property 14: Received/sent request queries return only pending requests for the correct party**
    - **Validates: Requirements 7.1, 7.2**

  - [x] 5.4 Write property test: friendship status reflects actual relationship state
    - **Property 15: Friendship status reflects actual relationship state**
    - **Validates: Requirements 8.1, 8.3**

  - [x] 5.5 Write property test: mutual friends equals the intersection of friend sets
    - **Property 16: Mutual friends equals the intersection of friend sets**
    - **Validates: Requirements 9.1, 9.2**

  - [x] 5.6 Write property test: blocking cleans up all friend data
    - **Property 17: Blocking cleans up all friend data**
    - **Validates: Requirements 10.1, 10.2**

  - [x] 5.7 Write unit tests for edge cases in `brightchain-api-lib/src/lib/__tests__/friends-service.spec.ts`
    - Non-existent or non-pending request operations (Requirements 2.3, 3.2, 4.2, 5.2)
    - Friendship status priority when both friendship and pending request exist (Requirement 8.2)
    - _Requirements: 2.3, 3.2, 4.2, 5.2, 8.2_

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create API response types and FriendsController in brightchain-api-lib
  - [x] 7.1 Create API response types in `brightchain-api-lib/src/lib/interfaces/responses/api-friends-response.ts`
    - `ApiFriendshipResponse`, `ApiFriendRequestResponse`, `ApiFriendsListResponse`, `ApiFriendRequestsListResponse`, `ApiFriendshipStatusResponse`, `ApiMutualFriendsResponse`
    - All extend `IApiMessageResponse`
    - Export from brightchain-api-lib barrel
    - _Requirements: 11.4_

  - [x] 7.2 Create `FriendsController` in `brightchain-api-lib/src/lib/controllers/friends-controller.ts`
    - POST `/friends/requests` — send friend request
    - POST `/friends/requests/:requestId/accept` — accept request
    - POST `/friends/requests/:requestId/reject` — reject request
    - POST `/friends/requests/:requestId/cancel` — cancel request
    - DELETE `/friends/:friendId` — remove friend
    - GET `/friends` — list friends (cursor, limit query params)
    - GET `/friends/requests/received` — received requests
    - GET `/friends/requests/sent` — sent requests
    - GET `/friends/status/:userId` — friendship status
    - GET `/friends/mutual/:userId` — mutual friends
    - All routes require JWT middleware
    - Map `FriendsServiceError` codes to HTTP status codes (400, 403, 404, 409)
    - Validate request params with `express-validator`
    - Export from brightchain-api-lib barrel
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 7.3 Write unit tests for FriendsController in `brightchain-api-lib/src/lib/__tests__/friends-controller.spec.ts`
    - Test each endpoint returns correct response shape
    - Test error code to HTTP status mapping
    - Test unauthenticated requests return 401
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 8. Implement IFriendsSuggestionProvider
  - [x] 8.1 Create `FriendsSuggestionProvider` implementation in `brightchain-api-lib/src/lib/services/friends-suggestion-provider.ts`
    - Wraps `IFriendsService.getFriends()` with case-insensitive substring search filtering on display name and username
    - Returns empty result when user has no friends
    - _Requirements: 14.3, 16.1, 17.1, 18.2_

  - [x] 8.2 Write property test: friend search filtering returns correct subset
    - **Property 18: Friend search filtering returns correct subset**
    - **Validates: Requirements 14.3**

- [x] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. BrightChat integration — DM recipient picker friends suggestions
  - [x] 10.1 Create `FriendsSuggestionSection` component in `brightchat-react-components/src/lib/components/FriendsSuggestionSection.tsx`
    - Calls `IFriendsSuggestionProvider.getFriendSuggestions(currentUserId, searchQuery)`
    - Renders "Friends" section above other suggestion sources
    - Filters as user types in search field
    - Omits section entirely when user has no friends
    - Selecting a friend populates `SendDirectMessageParams.recipientId`
    - Export from brightchat-react-components barrel
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 10.2 Write unit tests for BrightChat FriendsSuggestionSection in `brightchat-react-components/src/lib/__tests__/FriendsSuggestionSection.spec.tsx`
    - Test section renders above other sources when friends exist
    - Test section omitted when no friends
    - Test search filtering
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 11. BrightHub integration — profile, discovery, and post visibility
  - [x] 11.1 Add `MutualFriends` value to `SuggestionReason` enum in `brighthub-lib/src/lib/enumerations/suggestion-reason.ts`
    - _Requirements: 15.2_

  - [x] 11.2 Add optional `friendCount` field to `IBaseUserProfile` in `brighthub-lib/src/lib/interfaces/base-user-profile.ts`
    - _Requirements: 15.1_

  - [x] 11.3 Add `friendCount` field to user profile schema in `brightchain-db/src/lib/schemas/brighthub/users.schema.ts`
    - Type: number, minimum: 0, default: 0
    - _Requirements: 15.1_

  - [x] 11.4 Update `FriendsService` to increment/decrement `friendCount` on both members when a friendship is created or removed
    - _Requirements: 15.1_

  - [x] 11.5 Extend `IDiscoveryService.getSuggestions()` implementation to query `IFriendsService.getMutualFriends()` and factor mutual friend count into suggestion scoring
    - Set `reason: SuggestionReason.MutualFriends` and populate `mutualConnectionCount`
    - _Requirements: 15.2_

  - [x] 11.6 Add `friends_only` to post visibility options and implement feed query filter using `IFriendsService.areFriends()`
    - _Requirements: 15.3_

  - [x] 11.7 Add "Friends" tab to profile view that calls `IFriendsService.getFriends(profileUserId)` and respects `hideFriendsFromNonFriends` privacy flag
    - Add `hideFriendsFromNonFriends` to `IBasePrivacySettings` and user profile schema
    - _Requirements: 15.4_

  - [x] 11.8 Write property test: mutual friends boost discovery suggestions
    - **Property 19: Mutual friends boost discovery suggestions**
    - **Validates: Requirements 15.2**

  - [x] 11.9 Write property test: friends-only post visibility gate
    - **Property 20: Friends-only post visibility gate**
    - **Validates: Requirements 15.3**

  - [x] 11.10 Write unit tests for BrightHub integration
    - Profile displays friendCount
    - Friends tab respects privacy settings
    - _Requirements: 15.1, 15.4_

- [x] 12. BrightPass integration — credential sharing picker
  - [x] 12.1 Create `FriendsSuggestionSection` component in `brightpass-react-components/src/lib/components/FriendsSuggestionSection.tsx`
    - Calls `IFriendsSuggestionProvider.getFriendSuggestions(currentUserId)`
    - Renders "Friends" section above other suggestion sources in sharing picker
    - Omits section when user has no friends
    - Export from brightpass-react-components barrel
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 12.2 Write unit tests for BrightPass FriendsSuggestionSection in `brightpass-react-components/src/lib/__tests__/FriendsSuggestionSection.spec.tsx`
    - Test section renders when friends exist, omitted when empty
    - _Requirements: 16.1, 16.2, 16.3_

- [x] 13. Digital Burnbag integration — sharing picker and batch share
  - [x] 13.1 Add `shareWithFriends()` method to `IShareService` interface in `digitalburnbag-lib/src/lib/interfaces/services/share-service.ts`
    - Signature: `shareWithFriends(params: Omit<IInternalShareParams<TID>, 'recipientId'>, userId: TID): Promise<{ sharedCount: number; failedCount: number }>`
    - _Requirements: 17.3_

  - [x] 13.2 Implement `shareWithFriends()` in `digitalburnbag-lib/src/lib/services/share-service.ts`
    - Call `IFriendsService.getFriends(userId)` to get all friends
    - Iterate and call `shareWithUser()` for each friend
    - Return success/failure counts
    - _Requirements: 17.3_

  - [x] 13.3 Create `FriendsSuggestionSection` component in `digitalburnbag-react-components/src/lib/components/FriendsSuggestionSection.tsx`
    - Renders "Friends" section in sharing picker above other sources
    - Includes "Share with Friends" quick action button
    - Omits both section and button when user has no friends
    - Export from digitalburnbag-react-components barrel
    - _Requirements: 17.1, 17.2, 17.4_

  - [x] 13.4 Write property test: share with friends batch covers all friends
    - **Property 21: Share with friends batch covers all friends**
    - **Validates: Requirements 17.3**

  - [x] 13.5 Write unit tests for Digital Burnbag integration
    - Sharing picker renders "Friends" section, hides when no friends
    - "Share with Friends" button hidden when no friends
    - _Requirements: 17.1, 17.2, 17.4_

- [x] 14. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. BrightCal integration — event visibility and attendee picker
  - [x] 15.1 Add `FriendsOnly = 'FRIENDS_ONLY'` to `EventVisibility` enum in `brightcal-lib/src/lib/enums/EventVisibility.ts`
    - _Requirements: 18.1_

  - [x] 15.2 Update `filterEventByPermission()` in `brightcal-lib/src/lib/permissions/filterByPermission.ts`
    - Handle `FriendsOnly` visibility: check `IFriendsService.areFriends(organizerId, viewerId)`
    - Friends see full details; non-friends see free/busy only
    - _Requirements: 18.1_

  - [x] 15.3 Create `FriendsSuggestionSection` component in `brightcal-react-components/src/lib/components/FriendsSuggestionSection.tsx`
    - Renders "Friends" section in attendee picker above other sources
    - Omits section when user has no friends
    - Export from brightcal-react-components barrel
    - _Requirements: 18.2, 18.3, 18.4_

  - [x] 15.4 Write property test: friends-only calendar event visibility gate
    - **Property 22: Friends-only calendar event visibility gate**
    - **Validates: Requirements 18.1**

  - [x] 15.5 Write unit tests for BrightCal integration
    - Attendee picker renders "Friends" section above other sources, omits when empty
    - FriendsOnly event shows full details to friends, free/busy to non-friends
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [x] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 22 universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All commands should be run via `yarn nx` per workspace conventions
- Shared interfaces go in `brightchain-lib`; Node.js-specific code in `brightchain-api-lib`; database schemas in `brightchain-db`; React components in each dApp's `-react-components` library
- Property tests use `fast-check` v4.7.0 with in-memory mocks for the database layer
