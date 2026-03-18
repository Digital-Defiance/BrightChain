---
title: "BrightHub API Reference"
parent: "API Reference"
nav_order: 12
permalink: /api-reference/brighthub-api/
---

# BrightHub API Reference

Complete HTTP API reference for BrightHub, BrightChain's decentralized social network. BrightHub provides community hubs with trust tiers, threaded discussions, user profiles with follow/block mechanics, timelines, direct messaging with message requests, connection management (lists, categories), and a full notification system.

## API Sections

- [Posts](#posts-apibrighthubposts) — `/api/brighthub/posts`
- [Hubs](#hubs-apibrighthubhubs) — `/api/brighthub/hubs`
- [Timeline & Search](#timeline--search-apibrighthub) — `/api/brighthub/timeline`, `/api/brighthub/search`, `/api/brighthub/hashtag`
- [User Profiles](#user-profiles-apibrighthubusers) — `/api/brighthub/users`
- [Messaging](#messaging-apibrighthubmessages) — `/api/brighthub/messages`
- [Connections](#connections-apibrighthub) — `/api/brighthub/lists`, `/api/brighthub/connections`
- [Notifications](#notifications-apibrighthubnotifications) — `/api/brighthub/notifications`

---

# Posts (`/api/brighthub/posts`)

Microblogging and long-form hub discussions with support for original posts, replies, reposts, and quote posts. Posts support media attachments (max 4), mentions, hashtags, and hub-restricted visibility. Timeline posts (without `hubIds`) have a 280-character limit; hub posts (with `hubIds`) allow up to 10,000 characters for long-form discussions. Editing is allowed within a 15-minute window.

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create a new post |
| GET | `/:id` | Get a single post |
| GET | `/:id/thread` | Get a thread by root post ID |
| PUT | `/:id` | Edit a post |
| DELETE | `/:id` | Delete a post |
| POST | `/:id/like` | Like a post |
| DELETE | `/:id/like` | Unlike a post |
| POST | `/:id/repost` | Repost a post |
| POST | `/:id/quote` | Create a quote post |
| POST | `/:id/report` | Report a post |
| GET | `/reports` | Get post reports (moderation queue) |
| POST | `/reports/:reportId/review` | Review a report (moderator) |
| POST | `/:id/upvote` | Upvote a post |
| POST | `/:id/downvote` | Downvote a post |

---

## POST /

Create a new post. Supports original posts, replies (via `parentPostId`), and hub-restricted visibility (via `hubIds`).

**Request:**
```json
{
  "authorId": "user-uuid-1",
  "content": "Hello BrightHub! #firstpost",
  "parentPostId": "post-uuid-parent",
  "mediaAttachments": [
    {
      "url": "https://cdn.example.com/image.jpg",
      "mimeType": "image/jpeg",
      "size": 204800,
      "width": 1200,
      "height": 800,
      "altText": "A scenic landscape"
    }
  ],
  "hubIds": ["hub-uuid-1"]
}
```

Only `authorId` and `content` are required. `parentPostId` makes this a reply. `hubIds` restricts visibility to members of those hubs. Up to 4 media attachments are allowed.

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "post-uuid",
    "authorId": "user-uuid-1",
    "content": "Hello BrightHub! #firstpost",
    "formattedContent": "Hello BrightHub! <a href=\"/hashtag/firstpost\">#firstpost</a>",
    "postType": "original",
    "mediaAttachments": [],
    "mentions": [],
    "hashtags": ["firstpost"],
    "likeCount": 0,
    "repostCount": 0,
    "replyCount": 0,
    "quoteCount": 0,
    "isEdited": false,
    "isDeleted": false,
    "createdAt": "2026-03-13T10:00:00.000Z",
    "updatedAt": "2026-03-13T10:00:00.000Z",
    "createdBy": "user-uuid-1",
    "updatedBy": "user-uuid-1"
  },
  "message": "Post created"
}
```

**Errors:**
- `400` — Missing required fields (`authorId`, `content`), content too long, too many attachments (max 4), attachment too large, or invalid media format
- `404` — Parent post not found (when replying)

---

## GET /:id

Retrieve a single post by its ID.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "post-uuid",
    "authorId": "user-uuid-1",
    "content": "Hello BrightHub!",
    "formattedContent": "Hello BrightHub!",
    "postType": "original",
    "mediaAttachments": [],
    "mentions": [],
    "hashtags": [],
    "likeCount": 5,
    "repostCount": 2,
    "replyCount": 1,
    "quoteCount": 0,
    "isEdited": false,
    "isDeleted": false,
    "createdAt": "2026-03-13T10:00:00.000Z",
    "updatedAt": "2026-03-13T10:00:00.000Z",
    "createdBy": "user-uuid-1",
    "updatedBy": "user-uuid-1"
  },
  "message": "OK"
}
```

**Errors:**
- `404` — Post not found

---

## GET /:id/thread

Retrieve a full thread starting from the root post, including all nested replies.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "rootPost": {
      "_id": "post-uuid",
      "authorId": "user-uuid-1",
      "content": "What do you think about decentralized social?",
      "formattedContent": "What do you think about decentralized social?",
      "postType": "original",
      "mediaAttachments": [],
      "mentions": [],
      "hashtags": [],
      "likeCount": 12,
      "repostCount": 3,
      "replyCount": 2,
      "quoteCount": 1,
      "isEdited": false,
      "isDeleted": false,
      "createdAt": "2026-03-13T10:00:00.000Z",
      "updatedAt": "2026-03-13T10:00:00.000Z",
      "createdBy": "user-uuid-1",
      "updatedBy": "user-uuid-1"
    },
    "replies": [
      {
        "_id": "reply-uuid-1",
        "authorId": "user-uuid-2",
        "content": "Love it!",
        "postType": "reply",
        "parentPostId": "post-uuid",
        "likeCount": 3,
        "replyCount": 0,
        "createdAt": "2026-03-13T10:05:00.000Z"
      }
    ],
    "replyCount": 2,
    "participantCount": 3
  },
  "message": "OK"
}
```

**Errors:**
- `400` — Max thread depth exceeded
- `404` — Post not found

---

## PUT /:id

Edit a post. Only the original author can edit, and only within the 15-minute edit window after creation.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "content": "Updated content within the edit window"
}
```

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "post-uuid",
    "authorId": "user-uuid-1",
    "content": "Updated content within the edit window",
    "isEdited": true,
    "editedAt": "2026-03-13T10:10:00.000Z",
    "createdAt": "2026-03-13T10:00:00.000Z",
    "updatedAt": "2026-03-13T10:10:00.000Z"
  },
  "message": "Post updated"
}
```

**Errors:**
- `400` — Missing required fields (`userId`, `content`), content too long
- `403` — Not the post author, or edit window expired (15 minutes)
- `404` — Post not found

---

## DELETE /:id

Soft-delete a post. Cascades to associated interactions (likes, reposts). Only the author can delete.

**Request:**
```json
{
  "userId": "user-uuid-1"
}
```

**204 Response:** *(empty body)*

**Errors:**
- `400` — Post already deleted
- `403` — Not the post author
- `404` — Post not found

---

## POST /:id/like

Like a post.

**Request:**
```json
{
  "userId": "user-uuid-2"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Post liked"
}
```

**Errors:**
- `400` — Already liked
- `404` — Post not found

---

## DELETE /:id/like

Remove a like from a post.

**Request:**
```json
{
  "userId": "user-uuid-2"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Post unliked"
}
```

**Errors:**
- `400` — Not liked
- `404` — Post not found

---

## POST /:id/repost

Repost another user's post. Creates a new post of type `repost`.

**Request:**
```json
{
  "userId": "user-uuid-2"
}
```

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "repost-uuid",
    "authorId": "user-uuid-2",
    "postType": "repost",
    "quotedPostId": "post-uuid",
    "createdAt": "2026-03-13T11:00:00.000Z"
  },
  "message": "Repost created"
}
```

**Errors:**
- `400` — Already reposted
- `404` — Original post not found

---

## POST /:id/quote

Create a quote post — a repost with added commentary.

**Request:**
```json
{
  "userId": "user-uuid-2",
  "commentary": "This is a great take on decentralization!"
}
```

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "quote-uuid",
    "authorId": "user-uuid-2",
    "content": "This is a great take on decentralization!",
    "postType": "quote",
    "quotedPostId": "post-uuid",
    "createdAt": "2026-03-13T11:05:00.000Z"
  },
  "message": "Quote post created"
}
```

**Errors:**
- `400` — Missing required field (`commentary`)
- `404` — Quoted post not found

---

## POST /:id/report

Report a post for policy violations.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "reason": "Spam or misleading content",
  "hubId": "hub-uuid"
}
```

The `hubId` field is optional — include it when reporting a post within a specific hub context.

**200 Response:**
```json
{
  "status": "success",
  "message": "Post reported"
}
```

**Errors:**
- `400` — Missing required field (`reason`)
- `404` — Post not found

---

## GET /reports

Get post reports for the moderation queue. Admin/moderator endpoint.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `pending` (default), `reviewed`, `dismissed`, `actioned` |
| `hubId` | string | Filter by hub (for hub-scoped moderation) |
| `limit` | number | Results per page (default 50) |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "reports": [
      {
        "_id": "report-uuid",
        "postId": "post-uuid",
        "reporterId": "user-uuid-2",
        "reason": "Spam or misleading content",
        "hubId": "hub-uuid",
        "status": "pending",
        "createdAt": "2026-03-13T14:30:00.000Z"
      }
    ]
  },
  "message": "OK"
}
```

**Report Statuses:**

| Status | Description |
|--------|-------------|
| `pending` | Awaiting moderator review |
| `reviewed` | Reviewed but no action taken |
| `dismissed` | Report dismissed as invalid |
| `actioned` | Action taken (post removed, user warned, etc.) |

---

## POST /reports/:reportId/review

Review a post report. Moderator/admin action.

**Request:**
```json
{
  "reviewerId": "user-uuid-1",
  "action": "dismiss"
}
```

The `action` field must be `"dismiss"` or `"action"`.

**200 Response:**
```json
{
  "status": "success",
  "message": "Report dismissed"
}
```

**Errors:**
- `400` — Missing or invalid fields

---

## POST /:id/upvote

Upvote a post. Used for hub posts with the voting system. Increments `upvoteCount` and `score`.

**Request:**
```json
{
  "userId": "user-uuid-2"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Post upvoted"
}
```

**Errors:**
- `404` — Post not found

---

## POST /:id/downvote

Downvote a post. Used for hub posts with the voting system. Increments `downvoteCount` and decrements `score`.

**Request:**
```json
{
  "userId": "user-uuid-2"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Post downvoted"
}
```

**Errors:**
- `404` — Post not found

---

## Post Types

| Type | Description |
|------|-------------|
| `original` | Standard post created by the user |
| `reply` | Reply to another post (has `parentPostId`) |
| `repost` | Repost of another user's post |
| `quote` | Quote post with additional commentary |

---

# Hubs (`/api/brighthub/hubs`)

Community spaces with trust tiers, nested sub-hubs, moderator management, and self-service membership. Hubs are the core organizational unit of BrightHub — topic-scoped spaces where users post long-form threaded discussions.

## Trust Tiers

| Tier | Description |
|------|-------------|
| `open` | Anyone can view and post |
| `verified` | Only BrightChain-verified identities can post |
| `encrypted` | Content encrypted and visible only to members |

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create a hub |
| GET | `/` | Get user's subscribed hubs |
| GET | `/explore` | Explore and discover public hubs |
| GET | `/:idOrSlug` | Get hub detail by ID or slug |
| PUT | `/:id` | Update hub settings |
| POST | `/:idOrSlug/join` | Join a hub |
| POST | `/:idOrSlug/leave` | Leave a hub |
| POST | `/:id/members` | Add members to a hub (owner) |
| DELETE | `/:id/members` | Remove members from a hub (owner) |
| POST | `/:id/moderators` | Add a moderator (owner) |
| DELETE | `/:id/moderators` | Remove a moderator (owner) |
| GET | `/:id/sub-hubs` | Get sub-hubs |
| GET | `/hubs/:hubId/posts`* | Get hub feed with sort support |
| POST | `/:id/ban` | Ban a user from a hub (moderator) |
| POST | `/:id/unban` | Unban a user from a hub (moderator) |
| GET | `/:id/banned` | Get banned users list (moderator) |
| GET | `/:id/members-list` | Get hub members with profiles |
| GET | `/:id/leaderboard` | Get hub reputation leaderboard |
| POST | `/:id/warn` | Warn a user in a hub (graduated moderation) |
| POST | `/:id/temp-ban` | Temporarily ban a user from a hub |
| POST | `/:id/remove-post` | Remove a post from a hub (moderator) |
| POST | `/:id/transfer` | Transfer hub ownership |
| DELETE | `/:id` | Delete a hub (owner only) |

\* Hub feed endpoint is on the `/api/brighthub` base path (timeline controller).

---

## POST /

Create a new hub. The creator becomes the owner and first moderator automatically.

**Request:**
```json
{
  "ownerId": "user-uuid-1",
  "name": "Programming",
  "slug": "programming",
  "description": "Discuss all things code",
  "rules": "1. Be respectful\n2. Stay on topic",
  "trustTier": "open",
  "parentHubId": null,
  "icon": "💻"
}
```

Only `ownerId` and `name` are required. `slug` is auto-generated from name if omitted. `parentHubId` creates a sub-hub (one level of nesting only).

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "hub-uuid",
    "ownerId": "user-uuid-1",
    "slug": "programming",
    "name": "Programming",
    "description": "Discuss all things code",
    "rules": "1. Be respectful\n2. Stay on topic",
    "memberCount": 1,
    "postCount": 0,
    "isDefault": false,
    "trustTier": "open",
    "moderatorIds": ["user-uuid-1"],
    "createdAt": "2026-03-13T10:00:00.000Z"
  },
  "message": "Hub created"
}
```

**Errors:**
- `400` — Missing required fields, slug already taken, invalid parent hub, sub-hub nesting too deep

---

## GET /

Get hubs the authenticated user is a member of (subscribed hubs).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required) |

**200 Response:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "hub-uuid",
      "slug": "programming",
      "name": "Programming",
      "description": "Discuss all things code",
      "memberCount": 1250,
      "postCount": 8430,
      "trustTier": "open",
      "createdAt": "2026-01-15T12:00:00.000Z"
    }
  ],
  "message": "OK"
}
```

---

## GET /explore

Discover public hubs with optional search and sorting.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sort` | string | Sort order: `trending` (default), `new`, `suggested` |
| `q` | string | Search query (filters by name, description, slug) |
| `limit` | number | Results per page (default 20) |
| `userId` | string | Optional user ID for personalized suggestions |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "hubs": [
      {
        "_id": "hub-uuid",
        "slug": "programming",
        "name": "Programming",
        "description": "Discuss all things code",
        "memberCount": 1250,
        "postCount": 8430,
        "trustTier": "open",
        "createdAt": "2026-01-15T12:00:00.000Z"
      }
    ]
  },
  "message": "OK"
}
```

---

## GET /:idOrSlug

Get hub detail by ID or slug. Returns hub metadata, membership status, and sub-hubs.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | Optional user ID (to check membership) |
| `sort` | string | Post sort order: `hot`, `new`, `top` |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "hub": {
      "_id": "hub-uuid",
      "slug": "programming",
      "name": "Programming",
      "description": "Discuss all things code",
      "rules": "1. Be respectful\n2. Stay on topic",
      "memberCount": 1250,
      "postCount": 8430,
      "trustTier": "open",
      "moderatorIds": ["user-uuid-1"],
      "createdAt": "2026-01-15T12:00:00.000Z"
    },
    "isMember": true,
    "subHubs": [
      {
        "_id": "sub-hub-uuid",
        "slug": "rust",
        "name": "Rust",
        "parentHubId": "hub-uuid",
        "memberCount": 340
      }
    ]
  },
  "message": "OK"
}
```

**Errors:**
- `404` — Hub not found

---

## PUT /:id

Update hub settings. Requires owner or moderator role.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "name": "Programming & CS",
  "description": "Updated description",
  "rules": "Updated rules",
  "trustTier": "verified",
  "icon": "🖥️"
}
```

All fields except `userId` are optional.

**200 Response:**
```json
{
  "status": "success",
  "data": { "_id": "hub-uuid", "name": "Programming & CS" },
  "message": "Hub updated"
}
```

**Errors:**
- `403` — Not the hub owner or moderator
- `404` — Hub not found

---

## POST /:idOrSlug/join

Join a hub. Any user can join open hubs.

**Request:**
```json
{
  "userId": "user-uuid-2"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Joined hub"
}
```

**Errors:**
- `400` — Already a member
- `404` — Hub not found

---

## POST /:idOrSlug/leave

Leave a hub. The hub owner cannot leave (must transfer ownership or delete).

**Request:**
```json
{
  "userId": "user-uuid-2"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Left hub"
}
```

**Errors:**
- `403` — Hub owner cannot leave
- `404` — Hub not found

---

## POST /:id/moderators

Add a moderator to a hub. Only the hub owner can add moderators.

**Request:**
```json
{
  "ownerId": "user-uuid-1",
  "userId": "user-uuid-2"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Moderator added"
}
```

**Errors:**
- `403` — Not the hub owner
- `404` — Hub not found

---

## DELETE /:id/moderators

Remove a moderator from a hub. Only the hub owner can remove moderators.

**Request:**
```json
{
  "ownerId": "user-uuid-1",
  "userId": "user-uuid-2"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Moderator removed"
}
```

**Errors:**
- `403` — Not the hub owner
- `404` — Hub not found

---

## GET /:id/sub-hubs

Get sub-hubs of a parent hub.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "hubs": [
      {
        "_id": "sub-hub-uuid",
        "slug": "rust",
        "name": "Rust",
        "parentHubId": "hub-uuid",
        "memberCount": 340,
        "postCount": 1200,
        "trustTier": "open"
      }
    ]
  },
  "message": "OK"
}
```

---

## POST /:id/ban

Ban a user from a hub. Removes their membership and prevents re-joining. Requires moderator or owner role.

**Request:**
```json
{
  "moderatorId": "user-uuid-1",
  "userId": "user-uuid-3"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "User banned from hub"
}
```

**Errors:**
- `403` — Not a moderator/owner, or trying to ban the owner
- `404` — Hub not found

---

## POST /:id/unban

Unban a user from a hub. Requires moderator or owner role.

**Request:**
```json
{
  "moderatorId": "user-uuid-1",
  "userId": "user-uuid-3"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "User unbanned from hub"
}
```

**Errors:**
- `403` — Not a moderator/owner
- `404` — Hub not found

---

## POST /:id/warn

Issue a warning to a user in a hub (graduated moderation — step 1). Warnings are recorded but don't prevent the user from posting or joining.

**Request:**
```json
{
  "moderatorId": "user-uuid-1",
  "userId": "user-uuid-3",
  "reason": "Please follow the hub rules"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Warning issued"
}
```

**Errors:**
- `403` — Not a moderator/owner
- `404` — Hub not found

---

## POST /:id/temp-ban

Temporarily ban a user from a hub (graduated moderation — step 2). The user is removed from membership and cannot rejoin until the ban expires.

**Request:**
```json
{
  "moderatorId": "user-uuid-1",
  "userId": "user-uuid-3",
  "durationDays": 7,
  "reason": "Repeated rule violations"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "User temporarily banned for 7 days"
}
```

**Errors:**
- `403` — Not a moderator/owner
- `404` — Hub not found

---

## Moderation Severity Levels

| Severity | Effect | Duration |
|----------|--------|----------|
| `warning` | Recorded in moderation log, no restrictions | Permanent record |
| `temp_ban` | Removed from hub, cannot rejoin until expiry | Configurable (days) |
| `permanent_ban` | Removed from hub, cannot rejoin | Until manually unbanned |

---

## GET /:id/banned

Get the list of banned users for a hub. Requires moderator or owner role.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | Moderator/owner user ID (required) |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "bannedUsers": [
      {
        "_id": "ban-uuid",
        "hubId": "hub-uuid",
        "userId": "user-uuid-3",
        "bannedBy": "user-uuid-1",
        "bannedAt": "2026-03-13T14:30:00.000Z"
      }
    ]
  },
  "message": "OK"
}
```

**Errors:**
- `403` — Not a moderator/owner
- `404` — Hub not found

---

## POST /:id/remove-post

Remove a post from a hub. Strips the hub's ID from the post's `hubIds` array. Requires moderator or owner role.

**Request:**
```json
{
  "moderatorId": "user-uuid-1",
  "postId": "post-uuid"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Post removed from hub"
}
```

**Errors:**
- `400` — Missing required fields
- `403` — Not a moderator/owner
- `404` — Hub not found

---

## POST /:id/transfer

Transfer hub ownership to another member. Only the current owner can transfer.

**Request:**
```json
{
  "ownerId": "user-uuid-1",
  "newOwnerId": "user-uuid-2"
}
```

**200 Response:**
```json
{
  "status": "success",
  "data": { "_id": "hub-uuid", "ownerId": "user-uuid-2" },
  "message": "Ownership transferred"
}
```

**Errors:**
- `403` — Not the hub owner, or new owner is not a member
- `404` — Hub not found

---

## DELETE /:id

Delete a hub and all its memberships. Only the hub owner can delete. Cannot delete the default hub.

**Request:**
```json
{
  "ownerId": "user-uuid-1"
}
```

**204 Response:** *(empty body)*

**Errors:**
- `400` — Cannot delete default hub
- `403` — Not the hub owner
- `404` — Hub not found

---

## GET /:id/members-list

Get hub members with their profile information.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "_id": "user-uuid-1",
        "username": "alice",
        "displayName": "Alice",
        "profilePictureUrl": "https://cdn.example.com/alice.jpg"
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": false
  },
  "message": "OK"
}
```

---

## GET /:id/leaderboard

Get the hub reputation leaderboard — top contributors ranked by score.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "leaderboard": [
      {
        "userId": "user-uuid-1",
        "hubId": "hub-uuid",
        "score": 450,
        "postCount": 32,
        "upvotesReceived": 520,
        "lastActiveAt": "2026-03-13T14:30:00.000Z"
      },
      {
        "userId": "user-uuid-2",
        "hubId": "hub-uuid",
        "score": 280,
        "postCount": 18,
        "upvotesReceived": 310,
        "lastActiveAt": "2026-03-12T10:00:00.000Z"
      }
    ]
  },
  "message": "OK"
}
```

---

## GET /hubs/:hubId/posts

Get posts within a hub with sort support. This endpoint is on the `/api/brighthub` base path (timeline controller).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | Optional requesting user ID (for blocked user filtering) |
| `sort` | string | Sort order: `new` (default), `hot`, `top`, `controversial` |
| `topWindow` | string | Time window for `top` sort: `day`, `week` (default), `month`, `all` |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |

**Sort Algorithms:**

| Sort | Algorithm |
|------|-----------|
| `new` | Reverse chronological (newest first) |
| `hot` | Score decay: `(likes + replies + reposts) / (age_hours + 2)^1.5` |
| `top` | Total engagement: `likes + reposts + replies`, filtered by time window |
| `controversial` | Balanced votes: `totalVotes / (1 + |score|)` — high engagement with near-zero net score |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "posts": [
      {
        "_id": "post-uuid",
        "authorId": "user-uuid-1",
        "content": "Long-form hub discussion...",
        "hubIds": ["hub-uuid"],
        "likeCount": 42,
        "replyCount": 15,
        "createdAt": "2026-03-13T10:00:00.000Z"
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": true
  },
  "message": "OK"
}
```

---

# Timeline & Search (`/api/brighthub`)

Timelines, user feeds, hashtag feeds, and search. All timeline endpoints return paginated post lists and support `sort` (`new`, `hot`, `top`) and `topWindow` (`day`, `week`, `month`, `all`) query parameters.

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/timeline/home` | Get home timeline |
| GET | `/timeline/public` | Get public timeline |
| GET | `/users/:id/feed` | Get a user's post feed |
| GET | `/hashtag/:tag` | Get posts by hashtag |
| GET | `/search` | Search posts and users |

---

## GET /timeline/home

Returns posts from followed users in reverse chronological order. Supports filtering by connection list or category, and excluding muted users.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | Authenticated user ID (required) |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |
| `listId` | string | Filter to posts from a specific connection list |
| `categoryId` | string | Filter to posts from a specific category |
| `excludeMuted` | boolean | Exclude posts from muted connections |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "posts": [
      {
        "_id": "post-uuid",
        "authorId": "user-uuid-2",
        "content": "Good morning!",
        "postType": "original",
        "likeCount": 3,
        "repostCount": 0,
        "replyCount": 1,
        "quoteCount": 0,
        "createdAt": "2026-03-13T08:00:00.000Z"
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": true
  },
  "message": "OK"
}
```

**Errors:**
- `400` — Missing required query parameter (`userId`)
- `404` — User not found

---

## GET /timeline/public

Returns recent public posts from all users. No authentication required, but passing `userId` enables personalization (e.g., excluding blocked users).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | Optional requesting user ID |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |

**200 Response:** Same shape as home timeline.

---

## GET /users/:id/feed

Get a specific user's post feed. Respects privacy settings — protected accounts only show posts to followers.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `requestingUserId` | string | Optional viewer's user ID (for privacy checks) |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |

**200 Response:** Same shape as home timeline.

**Errors:**
- `404` — User not found

---

## GET /hashtag/:tag

Get posts containing a specific hashtag.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | Optional requesting user ID |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |

**200 Response:** Same shape as home timeline.

---

## GET /search

Search posts and users. Queries starting with `#` search by hashtag.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (required) |
| `userId` | string | Optional requesting user ID |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |

**200 Response:** Same shape as home timeline.

**Errors:**
- `400` — Missing required query parameter (`q`)

---

# User Profiles (`/api/brighthub/users`)

User profiles with follow/unfollow, block/unblock, and privacy settings. Protected accounts require follow approval.

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:id` | Get user profile |
| PUT | `/:id` | Update user profile |
| POST | `/:id/follow` | Follow a user |
| DELETE | `/:id/follow` | Unfollow a user |
| POST | `/:id/block` | Block a user |
| DELETE | `/:id/block` | Unblock a user |

---

## GET /:id

Get a user's public profile. Pass `requesterId` to get relationship-aware data.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `requesterId` | string | Optional viewer's user ID |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "user-uuid",
    "username": "alice",
    "displayName": "Alice",
    "bio": "Building the decentralized future",
    "profilePictureUrl": "https://cdn.example.com/alice.jpg",
    "headerImageUrl": "https://cdn.example.com/alice-header.jpg",
    "location": "San Francisco",
    "websiteUrl": "https://alice.dev",
    "followerCount": 1200,
    "followingCount": 350,
    "postCount": 890,
    "isVerified": true,
    "isProtected": false,
    "approveFollowersMode": "approve_none",
    "privacySettings": {
      "hideFollowerCount": false,
      "hideFollowingCount": false,
      "hideFollowersFromNonFollowers": false,
      "hideFollowingFromNonFollowers": false,
      "allowDmsFromNonFollowers": true,
      "showOnlineStatus": true,
      "showReadReceipts": true
    },
    "createdAt": "2025-01-15T12:00:00.000Z"
  },
  "message": "OK"
}
```

**Errors:**
- `404` — User not found

---

## PUT /:id

Update user profile fields. All fields are optional — only provided fields are updated.

**Request:**
```json
{
  "userId": "user-uuid",
  "displayName": "Alice B.",
  "bio": "Updated bio (max 160 chars)",
  "location": "New York",
  "websiteUrl": "https://alice.dev",
  "approveFollowersMode": "approve_non_mutuals"
}
```

**Approve Followers Modes:**

| Mode | Description |
|------|-------------|
| `approve_all` | Require approval for all follow requests |
| `approve_non_mutuals` | Only require approval for non-mutual follows |
| `approve_none` | Auto-approve all (public account) |

**200 Response:**
```json
{
  "status": "success",
  "message": "Profile updated"
}
```

**Errors:**
- `400` — Validation error (bio too long, invalid URL, etc.)
- `404` — User not found

---

## POST /:id/follow

Follow a user. If the target account is protected, a follow request is created instead of an immediate follow.

**Request:**
```json
{
  "followerId": "user-uuid-1",
  "message": "Hi, I'd love to connect!"
}
```

The `message` field is optional and only used when a follow request is created (for protected accounts).

**200 Response (immediate follow):**
```json
{
  "status": "success",
  "message": "Now following user"
}
```

**200 Response (follow request created):**
```json
{
  "status": "success",
  "message": "Follow request created"
}
```

**Errors:**
- `400` — Already following, cannot follow self, or already requested
- `404` — User not found

---

## DELETE /:id/follow

Unfollow a user.

**Request:**
```json
{
  "followerId": "user-uuid-1"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Unfollowed user"
}
```

**Errors:**
- `400` — Not following this user
- `404` — User not found

---

## POST /:id/block

Block a user. Blocking automatically unfollows in both directions and prevents future interactions.

**Request:**
```json
{
  "userId": "user-uuid-1"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "User blocked"
}
```

**Errors:**
- `400` — Already blocked, or cannot block self
- `404` — User not found

---

## DELETE /:id/block

Unblock a user.

**Request:**
```json
{
  "userId": "user-uuid-1"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "User unblocked"
}
```

**Errors:**
- `400` — Not blocked
- `404` — User not found

---

# Messaging (`/api/brighthub/messages`)

Direct and group messaging with message requests, reactions, read receipts, typing indicators, conversation management (pin, archive, mute), search, and message forwarding. Non-mutual follows require a message request before a conversation can be created.

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| **Conversations** | | |
| GET | `/conversations` | List conversations |
| POST | `/conversations` | Create a conversation |
| GET | `/conversations/:id` | Get a conversation |
| DELETE | `/conversations/:id` | Delete a conversation |
| **Messages** | | |
| POST | `/conversations/:id/messages` | Send a message |
| PUT | `/:messageId` | Edit a message |
| DELETE | `/:messageId` | Delete a message |
| POST | `/:messageId/forward` | Forward a message |
| **Reactions** | | |
| POST | `/:messageId/reactions` | Add a reaction |
| DELETE | `/:messageId/reactions/:emoji` | Remove a reaction |
| **Read Receipts & Typing** | | |
| POST | `/conversations/:id/read` | Mark messages as read |
| POST | `/conversations/:id/typing` | Send typing indicator |
| **Message Requests** | | |
| GET | `/requests` | Get message requests |
| POST | `/requests/:id/accept` | Accept a message request |
| POST | `/requests/:id/decline` | Decline a message request |
| **Conversation Management** | | |
| POST | `/conversations/:id/pin` | Pin a conversation |
| DELETE | `/conversations/:id/pin` | Unpin a conversation |
| POST | `/conversations/:id/archive` | Archive a conversation |
| POST | `/conversations/:id/unarchive` | Unarchive a conversation |
| POST | `/conversations/:id/mute` | Mute a conversation |
| DELETE | `/conversations/:id/mute` | Unmute a conversation |
| **Reporting** | | |
| POST | `/:messageId/report` | Report a message |
| **Search** | | |
| GET | `/conversations/:id/search` | Search within a conversation |
| GET | `/search` | Search all conversations |
| **Group Management** | | |
| POST | `/conversations/:id/participants` | Add participants |
| DELETE | `/conversations/:id/participants/:userId` | Remove a participant |
| PUT | `/conversations/:id/settings` | Update group settings |

---

## GET /conversations

List conversations for the authenticated user, sorted by most recent activity.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required, or via Bearer token) |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "conversations": [
      {
        "_id": "conv-uuid",
        "type": "direct",
        "participantIds": ["user-uuid-1", "user-uuid-2"],
        "lastMessageAt": "2026-03-13T14:30:00.000Z",
        "lastMessagePreview": "See you tomorrow!",
        "createdAt": "2026-03-10T09:00:00.000Z",
        "updatedAt": "2026-03-13T14:30:00.000Z"
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": true
  },
  "message": "OK"
}
```

---

## POST /conversations

Create a new conversation. For direct conversations between non-mutual follows, a message request is created instead.

**Request (direct):**
```json
{
  "userId": "user-uuid-1",
  "otherUserId": "user-uuid-2"
}
```

**Request (group):**
```json
{
  "userId": "user-uuid-1",
  "type": "group",
  "participantIds": ["user-uuid-1", "user-uuid-2", "user-uuid-3"],
  "name": "Project Team"
}
```

**Conversation Types:**

| Type | Description |
|------|-------------|
| `direct` | One-on-one conversation |
| `group` | Multi-participant conversation with admin roles |

**201 Response (conversation created):**
```json
{
  "status": "success",
  "data": {
    "_id": "conv-uuid",
    "type": "direct",
    "participantIds": ["user-uuid-1", "user-uuid-2"],
    "createdAt": "2026-03-13T10:00:00.000Z",
    "updatedAt": "2026-03-13T10:00:00.000Z"
  },
  "message": "Conversation created"
}
```

**200 Response (message request created — non-mutual follows):**
```json
{
  "status": "success",
  "data": {
    "_id": "request-uuid",
    "senderId": "user-uuid-1",
    "recipientId": "user-uuid-2",
    "messagePreview": "",
    "status": "pending",
    "createdAt": "2026-03-13T10:00:00.000Z"
  },
  "message": "Message request created"
}
```

**Errors:**
- `400` — Missing required fields, invalid group name, group participant limit exceeded, conversation already exists
- `403` — User blocked

---

## GET /conversations/:id

Get a conversation with its metadata.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required, or via Bearer token) |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "conv-uuid",
    "type": "group",
    "participantIds": ["user-uuid-1", "user-uuid-2", "user-uuid-3"],
    "name": "Project Team",
    "avatarUrl": "https://cdn.example.com/group.jpg",
    "lastMessageAt": "2026-03-13T14:30:00.000Z",
    "createdAt": "2026-03-10T09:00:00.000Z",
    "updatedAt": "2026-03-13T14:30:00.000Z"
  },
  "message": "OK"
}
```

**Errors:**
- `403` — Not a participant
- `404` — Conversation not found

---

## DELETE /conversations/:id

Delete a conversation for the authenticated user.

**204 Response:** *(empty body)*

**Errors:**
- `403` — Not a participant
- `404` — Conversation not found

---

## POST /conversations/:id/messages

Send a message in a conversation. Supports attachments, replies, and forwarded messages.

**Request:**
```json
{
  "senderId": "user-uuid-1",
  "content": "Hello!",
  "attachments": [],
  "replyToMessageId": "msg-uuid-parent"
}
```

Only `content` is required (plus `senderId` or Bearer token). `replyToMessageId` creates a threaded reply.

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "msg-uuid",
    "conversationId": "conv-uuid",
    "senderId": "user-uuid-1",
    "content": "Hello!",
    "createdAt": "2026-03-13T14:30:00.000Z"
  },
  "message": "Message sent"
}
```

**Errors:**
- `400` — Missing required field (`content`), content too long, too many attachments
- `403` — Not a participant, or user blocked
- `404` — Conversation not found

---

## PUT /:messageId

Edit a message. Only the original sender can edit. Subject to an edit window.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "content": "Hello! (edited)"
}
```

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "msg-uuid",
    "senderId": "user-uuid-1",
    "content": "Hello! (edited)",
    "editedAt": "2026-03-13T14:35:00.000Z",
    "createdAt": "2026-03-13T14:30:00.000Z"
  },
  "message": "Message edited"
}
```

**Errors:**
- `400` — Missing required field (`content`), edit window expired
- `403` — Not the message author
- `404` — Message not found

---

## DELETE /:messageId

Delete a message. Only the sender can delete their own messages.

**204 Response:** *(empty body)*

**Errors:**
- `400` — Message already deleted
- `403` — Not the message author
- `404` — Message not found

---

## POST /:messageId/forward

Forward a message to another conversation.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "targetConversationId": "conv-uuid-2"
}
```

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "forwarded-msg-uuid",
    "conversationId": "conv-uuid-2",
    "senderId": "user-uuid-1",
    "forwardedFromId": "msg-uuid",
    "createdAt": "2026-03-13T15:00:00.000Z"
  },
  "message": "Message forwarded"
}
```

**Errors:**
- `400` — Missing required field (`targetConversationId`)
- `403` — Not a participant in the target conversation
- `404` — Message or target conversation not found

---

## POST /:messageId/reactions

Add an emoji reaction to a message.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "emoji": "👍"
}
```

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "messageId": "msg-uuid",
    "userId": "user-uuid-1",
    "emoji": "👍"
  },
  "message": "Reaction added"
}
```

**Errors:**
- `400` — Missing required field (`emoji`), reaction already exists, reaction limit exceeded
- `403` — Not a participant
- `404` — Message not found

---

## DELETE /:messageId/reactions/:emoji

Remove a reaction from a message. The `:emoji` parameter is URL-encoded.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required, or via Bearer token) |

**200 Response:**
```json
{
  "status": "success",
  "message": "Reaction removed"
}
```

**Errors:**
- `404` — Reaction not found

---

## POST /conversations/:id/read

Mark messages in a conversation as read. If `messageId` is omitted, marks the latest message as read.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "messageId": "msg-uuid"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Marked as read"
}
```

---

## POST /conversations/:id/typing

Send a typing indicator to other participants in the conversation.

**Request:**
```json
{
  "userId": "user-uuid-1"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Typing indicator sent"
}
```

---

## GET /requests

Get pending message requests for the authenticated user.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required, or via Bearer token) |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "requests": [
      {
        "_id": "request-uuid",
        "senderId": "user-uuid-3",
        "recipientId": "user-uuid-1",
        "messagePreview": "Hi, I saw your post about...",
        "status": "pending",
        "createdAt": "2026-03-13T09:00:00.000Z"
      }
    ],
    "hasMore": false
  },
  "message": "OK"
}
```

**Message Request Statuses:**

| Status | Description |
|--------|-------------|
| `pending` | Awaiting acceptance |
| `accepted` | Accepted — conversation created |
| `declined` | Declined by recipient |

---

## POST /requests/:id/accept

Accept a message request. Creates a direct conversation with the sender.

**Request:**
```json
{
  "userId": "user-uuid-1"
}
```

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "conv-uuid",
    "type": "direct",
    "participantIds": ["user-uuid-1", "user-uuid-3"],
    "createdAt": "2026-03-13T10:00:00.000Z"
  },
  "message": "Message request accepted"
}
```

**Errors:**
- `404` — Message request not found

---

## POST /requests/:id/decline

Decline a message request.

**200 Response:**
```json
{
  "status": "success",
  "message": "Message request declined"
}
```

**Errors:**
- `404` — Message request not found

---

## POST /conversations/:id/pin

Pin a conversation to the top of the conversation list.

**200 Response:**
```json
{
  "status": "success",
  "message": "Conversation pinned"
}
```

**Errors:**
- `400` — Already pinned, or pin limit exceeded
- `404` — Conversation not found

---

## DELETE /conversations/:id/pin

Unpin a conversation.

**200 Response:**
```json
{
  "status": "success",
  "message": "Conversation unpinned"
}
```

**Errors:**
- `400` — Not pinned
- `404` — Conversation not found

---

## POST /conversations/:id/archive

Archive a conversation. Archived conversations are hidden from the main list.

**200 Response:**
```json
{
  "status": "success",
  "message": "Conversation archived"
}
```

**Errors:**
- `400` — Already archived
- `404` — Conversation not found

---

## POST /conversations/:id/unarchive

Unarchive a conversation.

**200 Response:**
```json
{
  "status": "success",
  "message": "Conversation unarchived"
}
```

**Errors:**
- `400` — Not archived
- `404` — Conversation not found

---

## POST /conversations/:id/mute

Mute a conversation. Muted conversations do not generate notifications.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "expiresAt": "2026-03-14T10:00:00.000Z"
}
```

The `expiresAt` field is optional. If omitted, the mute is permanent until manually unmuted.

**200 Response:**
```json
{
  "status": "success",
  "message": "Conversation muted"
}
```

**Errors:**
- `400` — Already muted
- `404` — Conversation not found

---

## DELETE /conversations/:id/mute

Unmute a conversation.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required, or via Bearer token) |

**200 Response:**
```json
{
  "status": "success",
  "message": "Conversation unmuted"
}
```

**Errors:**
- `400` — Not muted
- `404` — Conversation not found

---

## POST /:messageId/report

Report a message for policy violations.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "reason": "Spam or misleading content"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Message reported"
}
```

**Errors:**
- `400` — Missing required field (`reason`)

---

## GET /conversations/:id/search

Search messages within a specific conversation.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required, or via Bearer token) |
| `q` | string | Search query (required) |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "messages": [
      {
        "_id": "msg-uuid",
        "senderId": "user-uuid-2",
        "content": "matching message content",
        "createdAt": "2026-03-13T14:30:00.000Z"
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": false
  },
  "message": "OK"
}
```

**Errors:**
- `400` — Missing required query parameter (`q`)
- `403` — Not a participant
- `404` — Conversation not found

---

## GET /search

Search across all of the user's conversations.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required, or via Bearer token) |
| `q` | string | Search query (required) |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |

**200 Response:** Same shape as conversation search.

**Errors:**
- `400` — Missing required query parameters (`userId`, `q`)

---

## POST /conversations/:id/participants

Add participants to a group conversation. Requires admin role.

**Request:**
```json
{
  "adminId": "user-uuid-1",
  "userIds": ["user-uuid-4", "user-uuid-5"]
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Participants added"
}
```

**Errors:**
- `400` — Missing required field (`userIds`), participant limit exceeded, user already a participant
- `403` — Not an admin
- `404` — Conversation not found

---

## DELETE /conversations/:id/participants/:userId

Remove a participant from a group conversation. Requires admin role.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `adminId` | string | Admin user ID (required, or via Bearer token) |

**200 Response:**
```json
{
  "status": "success",
  "message": "Participant removed"
}
```

**Errors:**
- `400` — Last admin cannot be removed
- `403` — Not an admin
- `404` — Conversation not found

---

## PUT /conversations/:id/settings

Update group conversation settings. Requires admin role.

**Request:**
```json
{
  "adminId": "user-uuid-1",
  "name": "Updated Team Name",
  "avatarUrl": "https://cdn.example.com/new-avatar.jpg"
}
```

All fields except `adminId` are optional.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "conv-uuid",
    "type": "group",
    "name": "Updated Team Name",
    "avatarUrl": "https://cdn.example.com/new-avatar.jpg",
    "participantIds": ["user-uuid-1", "user-uuid-2", "user-uuid-3"]
  },
  "message": "Group settings updated"
}
```

**Errors:**
- `400` — Invalid group name
- `403` — Not an admin
- `404` — Conversation not found

---

## Group Participant Roles

| Role | Description |
|------|-------------|
| `admin` | Full control — manage participants, update settings |
| `participant` | Regular member — send/receive messages |

---

# Connections (`/api/brighthub`)

Connection management for organizing followed users into lists and categories. Includes connection notes, suggestions, mutual connections, priority settings, quiet mode, temporary mutes, import/export, and follow request management. Hub endpoints are documented in the [Hubs](#hubs-apibrighthubhubs) section.

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| **Lists** | | |
| POST | `/lists` | Create a connection list |
| GET | `/lists` | Get user's connection lists |
| PUT | `/lists/:id` | Update a connection list |
| DELETE | `/lists/:id` | Delete a connection list |
| POST | `/lists/:id/members` | Add members to a list |
| DELETE | `/lists/:id/members` | Remove members from a list |
| GET | `/lists/:id/members` | Get list members |
| POST | `/lists/:id/members/bulk` | Bulk add/remove members |
| **Connections** | | |
| GET | `/connections/categories` | Get connection categories |
| POST | `/connections/:id/note` | Add a note to a connection |
| GET | `/connections/suggestions` | Get connection suggestions |
| GET | `/connections/mutual/:userId` | Get mutual connections |
| POST | `/connections/:id/priority` | Set connection priority |
| POST | `/connections/:id/quiet` | Set quiet mode |
| POST | `/connections/:id/mute/temporary` | Set temporary mute |
| GET | `/connections/export` | Export connections |
| POST | `/connections/import` | Import connections |
| GET | `/connections/:id/insights` | Get connection insights |
| **Follow Requests** | | |
| GET | `/follow-requests` | Get pending follow requests |
| POST | `/follow-requests/:id/approve` | Approve a follow request |
| POST | `/follow-requests/:id/reject` | Reject a follow request |

---

## POST /lists

Create a connection list for organizing followed users.

**Request:**
```json
{
  "ownerId": "user-uuid-1",
  "name": "Close Friends",
  "description": "My inner circle",
  "visibility": "private"
}
```

Only `ownerId` and `name` are required.

**List Visibility:**

| Mode | Description |
|------|-------------|
| `private` | Only visible to the owner |
| `followers_only` | Visible to followers |
| `public` | Visible to everyone |

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "list-uuid",
    "ownerId": "user-uuid-1",
    "name": "Close Friends",
    "description": "My inner circle",
    "visibility": "private",
    "memberCount": 0,
    "followerCount": 0,
    "createdAt": "2026-03-13T10:00:00.000Z",
    "updatedAt": "2026-03-13T10:00:00.000Z"
  },
  "message": "List created"
}
```

**Errors:**
- `400` — Missing required fields (`ownerId`, `name`), list limit exceeded

---

## GET /lists

Get the user's connection lists.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required, also accepts `ownerId`) |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "lists": [
      {
        "_id": "list-uuid",
        "ownerId": "user-uuid-1",
        "name": "Close Friends",
        "visibility": "private",
        "memberCount": 12,
        "followerCount": 0,
        "createdAt": "2026-03-13T10:00:00.000Z",
        "updatedAt": "2026-03-13T10:00:00.000Z"
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": false
  },
  "message": "OK"
}
```

---

## PUT /lists/:id

Update a connection list. All fields except `ownerId` are optional.

**Request:**
```json
{
  "ownerId": "user-uuid-1",
  "name": "Best Friends",
  "description": "Updated description",
  "visibility": "followers_only"
}
```

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "list-uuid",
    "name": "Best Friends",
    "description": "Updated description",
    "visibility": "followers_only"
  },
  "message": "List updated"
}
```

**Errors:**
- `403` — Not the list owner
- `404` — List not found

---

## DELETE /lists/:id

Delete a connection list.

**Request:**
```json
{
  "ownerId": "user-uuid-1"
}
```

**204 Response:** *(empty body)*

**Errors:**
- `403` — Not the list owner
- `404` — List not found

---

## POST /lists/:id/members

Add members to a connection list.

**Request:**
```json
{
  "ownerId": "user-uuid-1",
  "userIds": ["user-uuid-2", "user-uuid-3"]
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Members added"
}
```

**Errors:**
- `400` — Missing required field (`userIds`), member limit exceeded
- `403` — Not the list owner
- `404` — List not found

---

## DELETE /lists/:id/members

Remove members from a connection list.

**Request:**
```json
{
  "ownerId": "user-uuid-1",
  "userIds": ["user-uuid-3"]
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Members removed"
}
```

**Errors:**
- `403` — Not the list owner
- `404` — List not found

---

## GET /lists/:id/members

Get members of a connection list with pagination.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "items": ["user-uuid-2", "user-uuid-3"],
    "cursor": "next-page-cursor",
    "hasMore": false
  },
  "message": "OK"
}
```

**Errors:**
- `404` — List not found

---

## POST /lists/:id/members/bulk

Bulk add or remove members from a list in a single operation.

**Request:**
```json
{
  "ownerId": "user-uuid-1",
  "action": "add",
  "userIds": ["user-uuid-4", "user-uuid-5"]
}
```

The `action` field must be `"add"` or `"remove"`.

**200 Response:**
```json
{
  "status": "success",
  "message": "Bulk add complete"
}
```

**Errors:**
- `400` — Missing or invalid field (`action`), missing `userIds`
- `403` — Not the list owner
- `404` — List not found

---

> **Note:** Hub endpoints have been moved to their own top-level section. See [Hubs (`/api/brighthub/hubs`)](#hubs-apibrighthubhubs) for the full hub API including explore, join/leave, moderator management, and sub-hubs. The legacy owner-managed hub member endpoints (`POST /hubs/:id/members`, `DELETE /hubs/:id/members`) remain available for backward compatibility.

---

## GET /connections/categories

Get the default connection categories for organizing connections.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required, also accepts `ownerId`) |

**200 Response:**
```json
{
  "status": "success",
  "data": [
    { "name": "Friends", "color": "#4CAF50" },
    { "name": "Family", "color": "#2196F3" },
    { "name": "Work", "color": "#FF9800" }
  ],
  "message": "OK"
}
```

---

## POST /connections/:id/note

Add a private note to a connection. Notes are only visible to the note author.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "note": "Met at the BrightChain conference"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Note added"
}
```

**Errors:**
- `400` — Missing required field (`note`), note too long

---

## GET /connections/suggestions

Get connection suggestions based on mutual connections and similar interests.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required) |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "suggestions": [
      {
        "userId": "user-uuid-5",
        "reason": "mutual_connections",
        "mutualCount": 3
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": false
  },
  "message": "OK"
}
```

**Suggestion Reasons:**

| Reason | Description |
|--------|-------------|
| `mutual_connections` | Shares mutual connections |
| `similar_interests` | Similar hashtag/interest overlap |
| `similar_to_user` | Similar to a specific user's network |

---

## GET /connections/mutual/:userId

Get mutual connections between the authenticated user and another user.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | Authenticated user ID (required) |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "mutualConnections": ["user-uuid-3", "user-uuid-4"],
    "cursor": "next-page-cursor",
    "hasMore": false
  },
  "message": "OK"
}
```

---

## POST /connections/:id/priority

Mark or unmark a connection as priority. Priority connections appear first in timelines and notifications.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "isPriority": true
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Priority set"
}
```

**Errors:**
- `400` — Priority limit exceeded

---

## POST /connections/:id/quiet

Enable or disable quiet mode for a connection. Quiet mode reduces notification frequency without fully muting.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "isQuiet": true
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Quiet mode enabled"
}
```

---

## POST /connections/:id/mute/temporary

Set a temporary mute on a connection for a predefined duration.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "duration": "24h"
}
```

**Mute Durations:**

| Duration | Description |
|----------|-------------|
| `1h` | 1 hour |
| `8h` | 8 hours |
| `24h` | 24 hours |
| `7d` | 7 days |
| `30d` | 30 days |
| `permanent` | Until manually unmuted |

**200 Response:**
```json
{
  "status": "success",
  "message": "Temporary mute set"
}
```

---

## GET /connections/export

Export all connections as structured data.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required) |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "connections": [
      { "userId": "user-uuid-2", "username": "bob", "followedAt": "2025-06-01T00:00:00.000Z" }
    ]
  },
  "message": "OK"
}
```

---

## POST /connections/import

Import connections from a JSON or CSV payload.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "data": [
    { "username": "charlie" },
    { "username": "diana" }
  ],
  "format": "json"
}
```

The `format` field is optional and defaults to `"json"`. Also accepts `"csv"`.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "imported": 2,
    "successful": 2,
    "created": 2
  },
  "message": "Import complete"
}
```

**Errors:**
- `400` — Missing required field (`data`), invalid import format, rate limited

---

## GET /connections/:id/insights

Get interaction insights for a specific connection over a time period.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required) |
| `period` | string | Time period: `7d`, `30d`, `90d` (default: `30d`) |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "connectionId": "user-uuid-2",
    "period": "30d",
    "interactionCount": 15,
    "strength": "strong"
  },
  "message": "OK"
}
```

**Connection Strengths:**

| Strength | Description |
|----------|-------------|
| `strong` | High interaction frequency |
| `moderate` | Moderate interaction frequency |
| `weak` | Low interaction frequency |
| `dormant` | No recent interactions |

---

## GET /follow-requests

Get pending follow requests for the authenticated user (for protected accounts).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required) |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "requests": [
      {
        "_id": "request-uuid",
        "followerId": "user-uuid-3",
        "targetId": "user-uuid-1",
        "status": "pending",
        "message": "Hi, I'd love to connect!",
        "createdAt": "2026-03-13T09:00:00.000Z"
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": false
  },
  "message": "OK"
}
```

**Follow Request Statuses:**

| Status | Description |
|--------|-------------|
| `pending` | Awaiting approval |
| `approved` | Approved — follower added |
| `rejected` | Rejected by target user |

---

## POST /follow-requests/:id/approve

Approve a pending follow request.

**Request:**
```json
{
  "userId": "user-uuid-1"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Follow request approved"
}
```

**Errors:**
- `404` — Follow request not found

---

## POST /follow-requests/:id/reject

Reject a pending follow request.

**Request:**
```json
{
  "userId": "user-uuid-1"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Follow request rejected"
}
```

**Errors:**
- `404` — Follow request not found

---

# Notifications (`/api/brighthub/notifications`)

Notification management with per-category filtering, batch operations, preferences, quiet hours, and Do Not Disturb mode.

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get notifications |
| GET | `/unread-count` | Get unread count |
| POST | `/:id/read` | Mark notification as read |
| POST | `/read-all` | Mark all as read |
| DELETE | `/:id` | Delete a notification |
| DELETE | `/` | Delete all notifications |
| GET | `/preferences` | Get notification preferences |
| PUT | `/preferences` | Update notification preferences |
| POST | `/preferences/quiet-hours` | Set quiet hours |
| POST | `/preferences/dnd` | Set Do Not Disturb |
| POST | `/system-alert` | Create a system alert (admin) |
| POST | `/reconnect-reminders` | Generate reconnect reminders (admin/cron) |

---

## GET /

Get notifications for the authenticated user with optional filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required) |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |
| `category` | string | Filter by category: `social`, `messages`, `connections`, `system` |
| `isRead` | boolean | Filter by read status |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "notifications": [
      {
        "_id": "notif-uuid",
        "recipientId": "user-uuid-1",
        "type": "like",
        "category": "social",
        "actorId": "user-uuid-2",
        "targetId": "post-uuid",
        "content": "Alice liked your post",
        "clickThroughUrl": "/posts/post-uuid",
        "isRead": false,
        "createdAt": "2026-03-13T14:30:00.000Z"
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": true
  },
  "message": "OK"
}
```

**Notification Types:**

| Type | Category | Description |
|------|----------|-------------|
| `like` | social | Someone liked your post |
| `reply` | social | Someone replied to your post |
| `mention` | social | Someone mentioned you |
| `repost` | social | Someone reposted your post |
| `quote` | social | Someone quoted your post |
| `follow` | connections | Someone followed you |
| `follow_request` | connections | Someone sent a follow request |
| `new_message` | messages | New direct message |
| `message_request` | messages | New message request |
| `message_reaction` | messages | Someone reacted to your message |
| `system_alert` | system | Account-related alert |
| `security_alert` | system | Security notification |
| `feature_announcement` | system | Product update |
| `reconnect_reminder` | connections | Reminder to reconnect with inactive connection |

**Notification Categories:**

| Category | Description |
|----------|-------------|
| `social` | Likes, replies, mentions, reposts, quotes |
| `messages` | Direct messages and message requests |
| `connections` | Follow-related notifications |
| `system` | System alerts and announcements |

---

## GET /unread-count

Get the total unread notification count for badge display.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required) |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "unreadCount": 7
  },
  "message": "OK"
}
```

---

## POST /:id/read

Mark a single notification as read.

**Request:**
```json
{
  "userId": "user-uuid-1"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Notification marked as read"
}
```

**Errors:**
- `403` — Not the notification recipient
- `404` — Notification not found

---

## POST /read-all

Mark all notifications as read for the authenticated user.

**Request:**
```json
{
  "userId": "user-uuid-1"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "All notifications marked as read"
}
```

---

## DELETE /:id

Delete a single notification.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required) |

**204 Response:** *(empty body)*

**Errors:**
- `403` — Not the notification recipient
- `404` — Notification not found

---

## DELETE /

Delete all notifications for the authenticated user.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required) |

**204 Response:** *(empty body)*

---

## GET /preferences

Get the user's notification preferences including per-category settings, channel settings, quiet hours, and DND configuration.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID (required) |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "userId": "user-uuid-1",
    "categorySettings": {
      "social": { "enabled": true, "channels": ["in_app", "push"] },
      "messages": { "enabled": true, "channels": ["in_app", "push", "email"] },
      "connections": { "enabled": true, "channels": ["in_app"] },
      "system": { "enabled": true, "channels": ["in_app", "email"] }
    },
    "channelSettings": {
      "in_app": true,
      "email": true,
      "push": true
    },
    "quietHours": {
      "enabled": false,
      "startTime": "22:00",
      "endTime": "08:00",
      "timezone": "America/New_York"
    },
    "dndConfig": {
      "enabled": false,
      "expiresAt": null
    },
    "soundEnabled": true
  },
  "message": "OK"
}
```

**Notification Channels:**

| Channel | Description |
|---------|-------------|
| `in_app` | In-app notifications |
| `email` | Email notifications |
| `push` | Push notifications |

**Errors:**
- `404` — Preferences not found (first-time user)

---

## PUT /preferences

Update notification preferences. All fields are optional — only provided fields are updated.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "categorySettings": {
    "social": { "enabled": true, "channels": ["in_app"] }
  },
  "channelSettings": {
    "push": false
  },
  "soundEnabled": false
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Preferences updated"
}
```

**Errors:**
- `400` — Invalid input

---

## POST /preferences/quiet-hours

Configure quiet hours. During quiet hours, notifications are silenced but still delivered when quiet hours end.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "enabled": true,
  "startTime": "22:00",
  "endTime": "08:00",
  "timezone": "America/New_York"
}
```

**200 Response:**
```json
{
  "status": "success",
  "message": "Quiet hours configured"
}
```

**Errors:**
- `400` — Invalid quiet hours configuration (e.g., missing timezone, invalid time format)

---

## POST /preferences/dnd

Enable or disable Do Not Disturb mode. DND suppresses all notifications until the specified expiry time or until manually disabled.

**Request:**
```json
{
  "userId": "user-uuid-1",
  "enabled": true,
  "expiresAt": "2026-03-14T08:00:00.000Z"
}
```

The `expiresAt` field is optional. If omitted, DND remains active until manually disabled.

**200 Response:**
```json
{
  "status": "success",
  "message": "Do Not Disturb configured"
}
```

**Errors:**
- `400` — Invalid DND configuration

---

## POST /system-alert

Create a system, security, or feature announcement notification for a specific user. Admin-only endpoint.

**Request:**
```json
{
  "recipientId": "user-uuid-1",
  "type": "system_alert",
  "content": "Your account has been verified"
}
```

**Notification Types for System Alerts:**

| Type | Description |
|------|-------------|
| `system_alert` | Account-related alert |
| `security_alert` | Security notification (password change, login from new device) |
| `feature_announcement` | Product update or new feature |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "notif-uuid",
    "recipientId": "user-uuid-1",
    "type": "system_alert",
    "content": "Your account has been verified",
    "isRead": false,
    "createdAt": "2026-03-13T10:00:00.000Z"
  },
  "message": "System alert created"
}
```

**Errors:**
- `400` — Missing required fields

---

## POST /reconnect-reminders

Generate reconnect reminder notifications for users with inactive connections. Intended to be called by a scheduled job (cron) or admin action.

**Request:**
```json
{
  "inactiveDays": 30
}
```

The `inactiveDays` field is optional (defaults to 30).

**200 Response:**
```json
{
  "status": "success",
  "message": "Generated 15 reconnect reminders"
}
```

---

# Real-Time Events

BrightHub delivers real-time updates via WebSocket (Socket.IO). Clients subscribe to specific conversations and notification streams.

## Server → Client Events

| Event | Description |
|-------|-------------|
| `message:new` | New message in a subscribed conversation |
| `message:edited` | Message content updated |
| `message:deleted` | Message removed |
| `message:reaction` | Reaction added or removed on a message |
| `conversation:typing` | User is typing in a conversation |
| `conversation:read` | User read messages in a conversation |
| `conversation:updated` | Conversation metadata changed (participants, settings) |
| `notification:new` | New notification created |
| `notification:read` | Notification marked as read |
| `notification:deleted` | Notification deleted |
| `notification:count` | Updated unread notification count |
| `hub:post:new` | New post in a subscribed hub |

## Client → Server Events

| Event | Description |
|-------|-------------|
| `message:send` | Send a message in a conversation |
| `message:typing` | Signal typing in a conversation |
| `message:read` | Mark a conversation as read |
| `subscribe:conversation` | Subscribe to real-time updates for a conversation |
| `unsubscribe:conversation` | Unsubscribe from a conversation |
| `subscribe:notifications` | Subscribe to notification updates |
| `unsubscribe:notifications` | Unsubscribe from notifications |
| `subscribe:hub` | Subscribe to real-time post updates for a hub (pass `hubId`) |
| `unsubscribe:hub` | Unsubscribe from a hub's post feed |

## Connection Constants

| Constant | Value | Description |
|----------|-------|-------------|
| Typing indicator latency | 100ms | Target broadcast latency for typing indicators |
| Reconnect delay | 1,000ms | Initial reconnection delay |
| Max reconnect delay | 30,000ms | Maximum delay with exponential backoff |
| Backoff multiplier | 2x | Exponential backoff factor |
| Max reconnect attempts | 10 | Maximum attempts before giving up |

---

# Standard Response Format

All BrightHub responses use the `IApiEnvelope<T>` wrapper:

```json
{
  "status": "success",
  "data": { ... },
  "message": "Human-readable description"
}
```

Error responses:

```json
{
  "status": "error",
  "error": {
    "code": "NOT_FOUND",
    "message": "Post not found"
  }
}
```

## Pagination

All list endpoints use cursor-based pagination:

```json
{
  "items": [ ... ],
  "cursor": "opaque-next-page-cursor",
  "hasMore": true
}
```

## Error Codes

| HTTP Status | Code | Condition |
|-------------|------|-----------|
| `200` | — | Successful read, update, or action |
| `201` | — | Resource created (post, conversation, reaction) |
| `204` | — | Resource deleted (no response body) |
| `400` | `VALIDATION_ERROR` | Invalid request payload, duplicate action, limit exceeded |
| `403` | `FORBIDDEN` | Insufficient permissions, not the author/owner, blocked user |
| `404` | `NOT_FOUND` | Resource not found |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

---

## Related Documentation

- [Authentication API Reference](./authentication-api.md)
- [BrightChat API Reference](./brightchat-api.md)
- [BrightMail API Reference](./brightmail-api.md)
- [BrightPass API Reference](./brightpass-api.md)
