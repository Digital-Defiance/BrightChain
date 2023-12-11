---
title: "BrightChat API Reference"
parent: "API Reference"
nav_order: 11
permalink: /api-reference/brightchat-api/
---

# BrightChat API Reference

Complete HTTP API reference for BrightChat, BrightChain's real-time communication system. BrightChat provides three communication modes — direct messages, group chats, and channels — with end-to-end encryption (ECIES + AES-256-GCM) and role-based permissions.

## API Sections

- [Direct Messages](#direct-messages-apiconversations) — `/api/conversations`
- [Groups](#groups-apigroups) — `/api/groups`
- [Channels](#channels-apichannels) — `/api/channels`

---

# Direct Messages (`/api/conversations`)

Person-to-person encrypted messaging with conversation promotion to groups.

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Send a direct message |
| GET | `/` | List conversations (paginated) |
| GET | `/:conversationId/messages` | Get messages (cursor-based pagination) |
| DELETE | `/:conversationId/messages/:messageId` | Delete a message |
| POST | `/:conversationId/promote` | Promote conversation to a group |

---

## POST /

Send a direct message. If no conversation exists between the two members, one is created automatically. Each message is encrypted with the recipient's secp256k1 public key using ECIES.

**Request:**
```json
{
  "recipientId": "member-uuid-2",
  "content": "Hey, are you free for a call?"
}
```

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "id": "message-uuid",
    "conversationId": "conv-uuid",
    "senderId": "member-uuid-1",
    "recipientId": "member-uuid-2",
    "encryptedContent": "...",
    "createdAt": "2026-03-13T10:00:00.000Z"
  },
  "message": "Message sent"
}
```

Privacy-preserving error handling: blocked and non-existent members produce indistinguishable error responses to prevent enumeration.

**Errors:**
- `400` — Missing required fields (`recipientId`, `content`)
- `404` — Recipient not reachable (blocked or non-existent)

---

## GET /

List conversations for the authenticated member, sorted by most recent activity.

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
    "items": [
      {
        "id": "conv-uuid",
        "participants": ["member-uuid-1", "member-uuid-2"],
        "lastMessageAt": "2026-03-13T10:00:00.000Z",
        "lastMessagePreview": "Hey, are you free..."
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": true
  },
  "message": "Conversations listed"
}
```

**Errors:**
- `401` — Not authenticated

---

## GET /:conversationId/messages

Get messages in a conversation with cursor-based pagination. Messages are returned in chronological order.

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
    "items": [
      {
        "id": "message-uuid",
        "senderId": "member-uuid-1",
        "encryptedContent": "...",
        "createdAt": "2026-03-13T10:00:00.000Z"
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": false
  },
  "message": "Messages retrieved"
}
```

**Errors:**
- `403` — Not a participant in this conversation
- `404` — Conversation not found

---

## DELETE /:conversationId/messages/:messageId

Delete a message. Only the message author can delete their own messages.

**200 Response:**
```json
{
  "status": "success",
  "data": { "deleted": true },
  "message": "Message deleted"
}
```

**Errors:**
- `403` — Not the message author
- `404` — Conversation or message not found

---

## POST /:conversationId/promote

Promote a direct message conversation to a group chat. The full message history is preserved. Additional members can be added during promotion.

**Request:**
```json
{
  "newMemberIds": ["member-uuid-3", "member-uuid-4"]
}
```

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "groupId": "group-uuid",
    "name": "Group Chat",
    "members": ["member-uuid-1", "member-uuid-2", "member-uuid-3", "member-uuid-4"],
    "promotedFromConversation": "conv-uuid"
  },
  "message": "Conversation promoted to group"
}
```

**Errors:**
- `400` — Missing required field (`newMemberIds` must be a non-empty array)
- `403` — Not a participant
- `404` — Conversation not found
- `500` — Group promotion not configured

---

# Groups (`/api/groups`)

Multi-member encrypted group conversations with role-based permissions. Groups use a shared AES-256-GCM symmetric key that is encrypted per-member using ECIES, with automatic key rotation on membership changes.

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create a group |
| GET | `/:groupId` | Get group metadata |
| POST | `/:groupId/messages` | Send a message |
| GET | `/:groupId/messages` | Get message history |
| POST | `/:groupId/members` | Add members |
| DELETE | `/:groupId/members/:memberId` | Remove a member |
| POST | `/:groupId/leave` | Leave the group |
| PUT | `/:groupId/roles/:memberId` | Assign a role |
| POST | `/:groupId/messages/:messageId/reactions` | Add a reaction |
| DELETE | `/:groupId/messages/:messageId/reactions/:reactionId` | Remove a reaction |
| PUT | `/:groupId/messages/:messageId` | Edit a message |
| POST | `/:groupId/messages/:messageId/pin` | Pin a message |
| DELETE | `/:groupId/messages/:messageId/pin` | Unpin a message |

---

## POST /

Create a new group chat.

**Request:**
```json
{
  "name": "Project Alpha",
  "memberIds": ["member-uuid-2", "member-uuid-3"]
}
```

The creator is automatically added as the group owner.

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "id": "group-uuid",
    "name": "Project Alpha",
    "creatorId": "member-uuid-1",
    "members": [
      { "memberId": "member-uuid-1", "role": "owner", "joinedAt": "2026-03-13T10:00:00.000Z" },
      { "memberId": "member-uuid-2", "role": "member", "joinedAt": "2026-03-13T10:00:00.000Z" },
      { "memberId": "member-uuid-3", "role": "member", "joinedAt": "2026-03-13T10:00:00.000Z" }
    ],
    "createdAt": "2026-03-13T10:00:00.000Z"
  },
  "message": "Group created"
}
```

**Errors:**
- `400` — Missing required fields (`name`, `memberIds`)

---

## GET /:groupId

Get group metadata including member list and roles.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "id": "group-uuid",
    "name": "Project Alpha",
    "creatorId": "member-uuid-1",
    "members": [
      { "memberId": "member-uuid-1", "role": "owner", "joinedAt": "2026-03-13T10:00:00.000Z" },
      { "memberId": "member-uuid-2", "role": "admin", "joinedAt": "2026-03-13T10:00:00.000Z" }
    ],
    "createdAt": "2026-03-13T10:00:00.000Z",
    "lastMessageAt": "2026-03-13T14:30:00.000Z"
  },
  "message": "Group retrieved"
}
```

**Errors:**
- `403` — Not a group member
- `404` — Group not found

---

## POST /:groupId/messages

Send a message to the group. The message is encrypted with the group's shared symmetric key.

**Request:**
```json
{
  "content": "Meeting at 3pm today"
}
```

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "id": "message-uuid",
    "groupId": "group-uuid",
    "senderId": "member-uuid-1",
    "encryptedContent": "...",
    "createdAt": "2026-03-13T14:30:00.000Z"
  },
  "message": "Message sent"
}
```

**Errors:**
- `400` — Missing required field (`content`)
- `403` — Not a group member, or member is muted
- `404` — Group not found

---

## GET /:groupId/messages

Get message history with cursor-based pagination.

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
    "items": [
      {
        "id": "message-uuid",
        "senderId": "member-uuid-1",
        "encryptedContent": "...",
        "createdAt": "2026-03-13T14:30:00.000Z",
        "editedAt": null,
        "pinned": false,
        "reactions": []
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": true
  },
  "message": "Messages retrieved"
}
```

**Errors:**
- `403` — Not a group member
- `404` — Group not found

---

## POST /:groupId/members

Add one or more members to the group. Triggers automatic key rotation — a new shared symmetric key is generated and encrypted for all members (including new ones).

**Request:**
```json
{
  "memberIds": ["member-uuid-4", "member-uuid-5"]
}
```

**200 Response:**
```json
{
  "status": "success",
  "data": { "added": ["member-uuid-4", "member-uuid-5"] },
  "message": "Members added"
}
```

**Errors:**
- `400` — Missing required field (`memberIds`)
- `403` — Insufficient permissions (`MANAGE_MEMBERS` required)
- `404` — Group not found
- `409` — Member already in group

---

## DELETE /:groupId/members/:memberId

Remove a member from the group. Triggers key rotation so the removed member cannot decrypt future messages.

**200 Response:**
```json
{
  "status": "success",
  "data": { "removed": "member-uuid-4" },
  "message": "Member removed"
}
```

**Errors:**
- `403` — Insufficient permissions (`MANAGE_MEMBERS` required)
- `404` — Group not found

---

## POST /:groupId/leave

Voluntarily leave a group. Triggers key rotation.

**200 Response:**
```json
{
  "status": "success",
  "data": { "left": true },
  "message": "Left group"
}
```

**Errors:**
- `403` — Not a group member
- `404` — Group not found

---

## PUT /:groupId/roles/:memberId

Assign a role to a group member. Requires the `MANAGE_ROLES` permission (owner or admin).

**Request:**
```json
{
  "role": "moderator"
}
```

**Available roles:** `owner`, `admin`, `moderator`, `member`

**200 Response:**
```json
{
  "status": "success",
  "data": { "memberId": "member-uuid-2", "role": "moderator" },
  "message": "Role assigned"
}
```

**Errors:**
- `400` — Missing required field (`role`)
- `403` — Missing permission: `manage_roles`
- `404` — Group not found

---

## POST /:groupId/messages/:messageId/reactions

Add an emoji reaction to a message.

**Request:**
```json
{
  "emoji": "👍"
}
```

**201 Response:**
```json
{
  "status": "success",
  "data": { "reactionId": "reaction-uuid", "emoji": "👍" },
  "message": "Reaction added"
}
```

**Errors:**
- `400` — Missing required field (`emoji`)
- `403` — Not a group member
- `404` — Group or message not found

---

## DELETE /:groupId/messages/:messageId/reactions/:reactionId

Remove a reaction. Only the member who added the reaction can remove it.

**200 Response:**
```json
{
  "status": "success",
  "data": { "removed": true },
  "message": "Reaction removed"
}
```

**Errors:**
- `403` — Not the reaction author
- `404` — Group, message, or reaction not found

---

## PUT /:groupId/messages/:messageId

Edit a message. Only the original author can edit. Edit history is preserved.

**Request:**
```json
{
  "content": "Meeting at 4pm today (updated)"
}
```

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "id": "message-uuid",
    "senderId": "member-uuid-1",
    "encryptedContent": "...",
    "createdAt": "2026-03-13T14:30:00.000Z",
    "editedAt": "2026-03-13T14:35:00.000Z",
    "editHistory": [
      { "content": "...", "editedAt": "2026-03-13T14:30:00.000Z" }
    ]
  },
  "message": "Message edited"
}
```

**Errors:**
- `400` — Missing required field (`content`)
- `403` — Not the message author
- `404` — Group or message not found

---

## POST /:groupId/messages/:messageId/pin

Pin a message to the group. Requires `PIN_MESSAGES` permission.

**200 Response:**
```json
{
  "status": "success",
  "data": { "pinned": true },
  "message": "Message pinned"
}
```

**Errors:**
- `403` — Insufficient permissions
- `404` — Group or message not found

---

## DELETE /:groupId/messages/:messageId/pin

Unpin a message. Requires `PIN_MESSAGES` permission.

**200 Response:**
```json
{
  "status": "success",
  "data": { "unpinned": true },
  "message": "Message unpinned"
}
```

**Errors:**
- `403` — Insufficient permissions
- `404` — Group or message not found

---

# Channels (`/api/channels`)

Topic-based community spaces with four visibility modes, invite tokens, and granular role-based moderation. Channels use a shared AES-256-GCM symmetric key encrypted per-member via ECIES, identical to groups.

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create a channel |
| GET | `/` | List discoverable channels |
| GET | `/:channelId` | Get channel metadata |
| PUT | `/:channelId` | Update channel settings |
| DELETE | `/:channelId` | Delete a channel |
| POST | `/:channelId/join` | Join a channel |
| POST | `/:channelId/leave` | Leave a channel |
| POST | `/:channelId/messages` | Send a message |
| GET | `/:channelId/messages` | Get message history |
| GET | `/:channelId/messages/search` | Search messages |
| POST | `/:channelId/invites` | Generate an invite token |
| POST | `/:channelId/invites/:token/redeem` | Redeem an invite token |
| PUT | `/:channelId/roles/:memberId` | Assign a role |
| POST | `/:channelId/messages/:messageId/reactions` | Add a reaction |
| DELETE | `/:channelId/messages/:messageId/reactions/:reactionId` | Remove a reaction |
| PUT | `/:channelId/messages/:messageId` | Edit a message |
| POST | `/:channelId/messages/:messageId/pin` | Pin a message |
| DELETE | `/:channelId/messages/:messageId/pin` | Unpin a message |
| POST | `/:channelId/mute/:memberId` | Mute a member |
| POST | `/:channelId/kick/:memberId` | Kick a member |

---

## POST /

Create a new channel.

**Request:**
```json
{
  "name": "general",
  "topic": "General discussion",
  "visibility": "public"
}
```

**Visibility modes:**

| Mode | Listed | Joinable | Description |
|------|--------|----------|-------------|
| `public` | Yes | Yes | Anyone can discover and join |
| `private` | Yes | Invite only | Visible in listings but requires invite |
| `secret` | No | Invite only | Not listed, requires invite link |
| `invisible` | No | Invite only | Hidden from non-members entirely |

The `name` and `visibility` fields are required. Channel names must be unique, lowercase, and contain no spaces.

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "id": "channel-uuid",
    "name": "general",
    "topic": "General discussion",
    "visibility": "public",
    "creatorId": "member-uuid-1",
    "members": [
      { "memberId": "member-uuid-1", "role": "owner", "joinedAt": "2026-03-13T10:00:00.000Z" }
    ],
    "createdAt": "2026-03-13T10:00:00.000Z",
    "historyVisibleToNewMembers": true
  },
  "message": "Channel created"
}
```

**Errors:**
- `400` — Missing required fields (`name`, `visibility`)
- `409` — Channel name already taken

---

## GET /

List channels discoverable by the authenticated member. Public and private channels appear in listings; secret and invisible channels do not.

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
    "items": [
      {
        "id": "channel-uuid",
        "name": "general",
        "topic": "General discussion",
        "visibility": "public",
        "memberCount": 42,
        "lastMessageAt": "2026-03-13T14:30:00.000Z"
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": true
  },
  "message": "Channels listed"
}
```

---

## GET /:channelId

Get channel metadata including member list, settings, and pinned messages.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "id": "channel-uuid",
    "name": "general",
    "topic": "General discussion",
    "visibility": "public",
    "creatorId": "member-uuid-1",
    "members": [
      { "memberId": "member-uuid-1", "role": "owner", "joinedAt": "2026-03-13T10:00:00.000Z" }
    ],
    "pinnedMessageIds": ["msg-uuid-1"],
    "historyVisibleToNewMembers": true,
    "createdAt": "2026-03-13T10:00:00.000Z",
    "lastMessageAt": "2026-03-13T14:30:00.000Z"
  },
  "message": "Channel retrieved"
}
```

**Errors:**
- `403` — Not a channel member (for non-public channels)
- `404` — Channel not found

---

## PUT /:channelId

Update channel settings. Requires `MANAGE_CHANNEL` permission.

**Request:**
```json
{
  "name": "general-chat",
  "topic": "Updated topic",
  "visibility": "private",
  "historyVisibleToNewMembers": false
}
```

All fields are optional. Only provided fields are updated.

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "id": "channel-uuid",
    "name": "general-chat",
    "topic": "Updated topic",
    "visibility": "private",
    "historyVisibleToNewMembers": false
  },
  "message": "Channel updated"
}
```

**Errors:**
- `403` — Missing permission: `MANAGE_CHANNEL`
- `404` — Channel not found
- `409` — Channel name already taken

---

## DELETE /:channelId

Delete a channel and all its messages.

**200 Response:**
```json
{
  "status": "success",
  "data": { "deleted": true },
  "message": "Channel deleted"
}
```

**Errors:**
- `403` — Insufficient permissions
- `404` — Channel not found

---

## POST /:channelId/join

Join a public channel. Private, secret, and invisible channels require an invite token (use the redeem invite endpoint instead).

**200 Response:**
```json
{
  "status": "success",
  "data": { "joined": true },
  "message": "Joined channel"
}
```

**Errors:**
- `403` — Join denied (channel is not public)
- `404` — Channel not found
- `409` — Already a member

---

## POST /:channelId/leave

Leave a channel. Triggers key rotation so the departing member cannot decrypt future messages.

**200 Response:**
```json
{
  "status": "success",
  "data": { "left": true },
  "message": "Left channel"
}
```

**Errors:**
- `403` — Not a channel member
- `404` — Channel not found

---

## POST /:channelId/messages

Send a message to the channel. The message is encrypted with the channel's shared symmetric key.

**Request:**
```json
{
  "content": "Welcome everyone!"
}
```

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "id": "message-uuid",
    "channelId": "channel-uuid",
    "senderId": "member-uuid-1",
    "encryptedContent": "...",
    "createdAt": "2026-03-13T14:30:00.000Z"
  },
  "message": "Message sent"
}
```

**Errors:**
- `400` — Missing required field (`content`)
- `403` — Not a channel member, or member is muted
- `404` — Channel not found

---

## GET /:channelId/messages

Get message history with cursor-based pagination.

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
    "items": [
      {
        "id": "message-uuid",
        "senderId": "member-uuid-1",
        "encryptedContent": "...",
        "createdAt": "2026-03-13T14:30:00.000Z",
        "editedAt": null,
        "pinned": false,
        "reactions": []
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": true
  },
  "message": "Messages retrieved"
}
```

New members see history only if `historyVisibleToNewMembers` is enabled on the channel.

**Errors:**
- `403` — Not a channel member
- `404` — Channel not found

---

## GET /:channelId/messages/search

Full-text search across channel message history.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search text (required) |
| `cursor` | string | Opaque cursor for next page |
| `limit` | number | Results per page |

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": "message-uuid",
        "senderId": "member-uuid-1",
        "encryptedContent": "...",
        "createdAt": "2026-03-13T14:30:00.000Z",
        "relevanceScore": 0.95
      }
    ],
    "cursor": "next-page-cursor",
    "hasMore": false
  },
  "message": "Search results"
}
```

**Errors:**
- `400` — Missing required query parameter (`query`)
- `403` — Not a channel member
- `404` — Channel not found

---

## POST /:channelId/invites

Generate a time-limited, usage-limited invite token for the channel. Requires `CREATE_INVITES` permission.

**Request:**
```json
{
  "maxUses": 10,
  "expiresInMs": 86400000
}
```

Both fields are optional. If omitted, the invite has unlimited uses and no expiry.

**201 Response:**
```json
{
  "status": "success",
  "data": {
    "token": "invite-token-string",
    "channelId": "channel-uuid",
    "maxUses": 10,
    "usesRemaining": 10,
    "expiresAt": "2026-03-14T10:00:00.000Z",
    "createdBy": "member-uuid-1"
  },
  "message": "Invite created"
}
```

**Errors:**
- `403` — Missing permission: `CREATE_INVITES`
- `404` — Channel not found

---

## POST /:channelId/invites/:token/redeem

Redeem an invite token to join a channel. This is the only way to join private, secret, and invisible channels.

**200 Response:**
```json
{
  "status": "success",
  "data": { "redeemed": true },
  "message": "Invite redeemed"
}
```

**Errors:**
- `404` — Invite token not found
- `409` — Already a member
- `410` — Invite expired or fully used

---

## PUT /:channelId/roles/:memberId

Assign a role to a channel member. Requires `MANAGE_ROLES` permission.

**Request:**
```json
{
  "role": "moderator"
}
```

**Available roles:** `owner`, `admin`, `moderator`, `member`

**200 Response:**
```json
{
  "status": "success",
  "data": { "memberId": "member-uuid-2", "role": "moderator" },
  "message": "Role assigned"
}
```

**Errors:**
- `400` — Missing required field (`role`)
- `403` — Missing permission: `manage_roles`
- `404` — Channel not found

---

## POST /:channelId/messages/:messageId/reactions

Add an emoji reaction to a channel message.

**Request:**
```json
{
  "emoji": "🎉"
}
```

**201 Response:**
```json
{
  "status": "success",
  "data": { "reactionId": "reaction-uuid", "emoji": "🎉" },
  "message": "Reaction added"
}
```

**Errors:**
- `400` — Missing required field (`emoji`)
- `403` — Not a channel member
- `404` — Channel or message not found

---

## DELETE /:channelId/messages/:messageId/reactions/:reactionId

Remove a reaction from a channel message.

**200 Response:**
```json
{
  "status": "success",
  "data": { "removed": true },
  "message": "Reaction removed"
}
```

**Errors:**
- `403` — Not the reaction author
- `404` — Channel, message, or reaction not found

---

## PUT /:channelId/messages/:messageId

Edit a channel message. Only the original author can edit. Edit history is preserved.

**Request:**
```json
{
  "content": "Updated announcement"
}
```

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "id": "message-uuid",
    "senderId": "member-uuid-1",
    "encryptedContent": "...",
    "editedAt": "2026-03-13T15:00:00.000Z",
    "editHistory": [
      { "content": "...", "editedAt": "2026-03-13T14:30:00.000Z" }
    ]
  },
  "message": "Message edited"
}
```

**Errors:**
- `400` — Missing required field (`content`)
- `403` — Not the message author
- `404` — Channel or message not found

---

## POST /:channelId/messages/:messageId/pin

Pin a message in the channel. Requires `PIN_MESSAGES` permission.

**200 Response:**
```json
{
  "status": "success",
  "data": { "pinned": true },
  "message": "Message pinned"
}
```

**Errors:**
- `403` — Insufficient permissions
- `404` — Channel or message not found

---

## DELETE /:channelId/messages/:messageId/pin

Unpin a message. Requires `PIN_MESSAGES` permission.

**200 Response:**
```json
{
  "status": "success",
  "data": { "unpinned": true },
  "message": "Message unpinned"
}
```

**Errors:**
- `403` — Insufficient permissions
- `404` — Channel or message not found

---

## POST /:channelId/mute/:memberId

Temporarily mute a member, preventing them from sending messages for the specified duration. Requires `MUTE_MEMBERS` permission.

**Request:**
```json
{
  "durationMs": 3600000
}
```

The `durationMs` field is required and must be a positive number (milliseconds).

**200 Response:**
```json
{
  "status": "success",
  "data": {
    "muted": true,
    "until": "2026-03-13T15:00:00.000Z"
  },
  "message": "Member muted"
}
```

**Errors:**
- `400` — Missing or invalid field (`durationMs`)
- `403` — Missing permission: `MUTE_MEMBERS`
- `404` — Channel not found

---

## POST /:channelId/kick/:memberId

Remove a member from the channel. Triggers key rotation. Requires `KICK_MEMBERS` permission.

**200 Response:**
```json
{
  "status": "success",
  "data": { "kicked": true },
  "message": "Member kicked"
}
```

**Errors:**
- `403` — Missing permission: `KICK_MEMBERS`
- `404` — Channel not found

---

# Permission System

All group and channel actions are governed by role-based permissions.

## Default Roles

| Role | Permissions |
|------|-------------|
| Owner | All permissions (full control) |
| Admin | Send messages, delete any message, manage members, create invites, pin messages, mute/kick members |
| Moderator | Send messages, delete any message, pin messages, mute/kick members |
| Member | Send messages, delete own messages |

## Permission Types

| Permission | Description |
|------------|-------------|
| `SEND_MESSAGES` | Post messages |
| `DELETE_OWN_MESSAGES` | Remove own messages |
| `DELETE_ANY_MESSAGE` | Remove any member's messages |
| `MANAGE_MEMBERS` | Add/remove members |
| `MANAGE_ROLES` | Assign roles to members |
| `MANAGE_CHANNEL` | Update channel settings (visibility, topic) |
| `CREATE_INVITES` | Generate invite tokens |
| `PIN_MESSAGES` | Pin/unpin messages |
| `MUTE_MEMBERS` | Temporarily prevent members from messaging |
| `KICK_MEMBERS` | Remove members from group/channel |

---

# Encryption Model

## Direct Messages

Each message is encrypted with the recipient's secp256k1 public key using ECIES. No shared keys are required, providing perfect forward secrecy per message.

## Groups and Channels

A single AES-256-GCM symmetric key is used per group/channel. This key is encrypted per-member using ECIES:

```
Shared Key (AES-256-GCM)
    ↓
ECIES Encrypt for each member
    ↓
Member A: ECIES(SharedKey, PubKeyA)
Member B: ECIES(SharedKey, PubKeyB)
Member C: ECIES(SharedKey, PubKeyC)
```

## Key Rotation

Key rotation is triggered automatically when:
- A member is removed (by admin/moderator)
- A member voluntarily leaves
- A member is kicked

The rotation process:
1. Generate new symmetric key
2. Encrypt new key for all remaining members
3. Update group/channel metadata
4. Broadcast key rotation event via WebSocket

Departed members cannot decrypt messages sent after key rotation.

---

# Real-Time Events

BrightChat delivers real-time updates via WebSocket through the EventNotificationSystem.

## Event Types

| Event | Description |
|-------|-------------|
| `communication:message_sent` | New message in any context |
| `communication:message_edited` | Message content updated |
| `communication:message_deleted` | Message removed |
| `communication:typing_start` | Member started typing |
| `communication:typing_stop` | Member stopped typing |
| `communication:reaction_added` | Emoji reaction added |
| `communication:reaction_removed` | Emoji reaction removed |
| `communication:message_pinned` | Message pinned |
| `communication:message_unpinned` | Message unpinned |
| `communication:member_muted` | Member muted |
| `communication:member_kicked` | Member removed |
| `communication:member_joined` | New member added |
| `communication:member_left` | Member departed |
| `communication:group_created` | New group created |
| `communication:channel_updated` | Channel settings changed |
| `communication:presence_changed` | Member status updated |

## Presence Status

| Status | Description |
|--------|-------------|
| `online` | Active and available |
| `offline` | Disconnected |
| `idle` | Inactive for configured duration |
| `dnd` | Do not disturb (suppresses notifications) |

Presence changes are broadcast only to members sharing contexts (groups/channels) to prevent enumeration attacks.

---

# Standard Response Format

All BrightChat responses use the `IApiEnvelope<T>` wrapper:

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
    "message": "Group not found"
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
| `201` | — | Resource created (message sent, group created, reaction added) |
| `200` | — | Successful read or update |
| `400` | `VALIDATION_ERROR` | Invalid request payload |
| `403` | `FORBIDDEN` | Insufficient permissions or not a member |
| `404` | `NOT_FOUND` | Resource not found (also used for privacy-preserving errors) |
| `409` | `ALREADY_EXISTS` | Duplicate member or channel name |
| `410` | `GONE` | Invite expired or fully used |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

---

## Related Documentation

- [Communication System Architecture](../messaging/communication-system-architecture)
- [Messaging System Architecture](../messaging/messaging-system-architecture)
- [Authentication API Reference](./authentication-api)
- [Security Analysis](../guides/04-security-analysis)
