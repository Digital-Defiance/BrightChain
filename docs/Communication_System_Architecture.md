# Communication System Architecture

## Overview

BrightChain's Communication System transforms the platform into a "Discord meets Signal" experience, providing Discord-competitive features with Signal-grade end-to-end encryption. Built on top of BrightChain's existing encrypted messaging infrastructure (MessagePassingService, EventNotificationSystem, ECIES encryption), the system delivers three communication modes: direct messaging, group chats, and channels.

## Architecture

The Communication System consists of three API controllers and five supporting services, all integrated into the `brightchain-api-lib` package:

### Controllers
- **DirectMessageController** (`/api/conversations`) - Person-to-person encrypted messaging
- **GroupController** (`/api/groups`) - Multi-member group chats with shared encryption
- **ChannelController** (`/api/channels`) - Topic-based community channels (Discord/IRC-style)

### Services
- **ConversationService** - Direct message conversation management and promotion to groups
- **GroupService** - Group lifecycle, membership, and encrypted messaging
- **ChannelService** - Channel creation, visibility, invites, and messaging
- **PresenceService** - Online/offline/idle/DND status tracking and broadcasting
- **PermissionService** - Role-based access control for groups and channels

### Integration Points
All controllers build on existing BrightChain infrastructure:
- **MessagePassingService** - Message storage and routing
- **EventNotificationSystem** - Real-time WebSocket event delivery
- **ECIES + AES-256-GCM** - End-to-end encryption
- **BaseController** - Consistent API patterns and authentication

## Communication Modes

### Direct Messages (Conversations)

Person-to-person encrypted messaging with conversation promotion:

- **Encryption**: Each message encrypted with recipient's public key (ECIES)
- **Conversation Listing**: Paginated inbox sorted by most recent activity
- **Message History**: Chronological message retrieval with cursor-based pagination
- **Promotion**: Seamlessly convert conversations to groups by adding participants

**Key Features:**
- End-to-end encryption per message
- Privacy-preserving error responses (blocked/non-existent members indistinguishable)
- Message deletion (author only)
- Conversation-to-group promotion preserves full message history

### Group Chats

Multi-member encrypted group conversations:

- **Shared Key**: Single symmetric key encrypted per-member using ECIES
- **Key Rotation**: Automatic key rotation when members join/leave
- **Roles**: Owner, admin, moderator, member with configurable permissions
- **Message History**: Full history available to all current members

**Key Features:**
- Encrypted group messaging with shared symmetric keys
- Role-based permissions (message management, member management, moderation)
- Message editing with history preservation
- Message pinning
- Emoji reactions
- Member muting and removal
- Automatic key rotation on membership changes

### Channels

Topic-based community spaces with advanced access control:

- **Visibility Modes**: Public (listed, joinable), Private (listed, invite-only), Secret (unlisted, invite-only), Invisible (hidden from non-members)
- **Invite System**: Time-limited, usage-limited invite tokens
- **Roles**: Owner, admin, moderator, member with granular permissions
- **Message Search**: Full-text search within channel history

**Key Features:**
- Four visibility modes for flexible access control
- Invite token system with expiry and usage limits
- Role-based moderation (mute, kick, message deletion)
- Message search across channel history
- Topic and metadata management
- History visibility control for new members

## Security Model

### End-to-End Encryption

**Direct Messages:**
- Each message encrypted with recipient's SECP256k1 public key (ECIES)
- No shared keys required
- Perfect forward secrecy per message

**Groups & Channels:**
- Single AES-256-GCM symmetric key per group/channel
- Symmetric key encrypted per-member using ECIES
- Key rotation on membership changes ensures forward secrecy
- Departed members cannot decrypt future messages

### Privacy Features

**Brokered Anonymity:**
- All communication metadata encrypted
- Identity information reconstructable only via quorum consensus
- Time-limited identity retention

**Information Leakage Prevention:**
- Blocked/non-existent member errors indistinguishable
- Invisible channels never appear in listings for non-members
- Invite token errors don't reveal channel details

### Key Management

**Key Rotation Triggers:**
- Member removal (by admin/moderator)
- Member voluntary departure
- Member kick

**Key Rotation Process:**
1. Generate new symmetric key
2. Encrypt new key for all remaining members
3. Update group/channel metadata
4. Broadcast key rotation event

## Real-Time Features

### WebSocket Events

The Communication System extends EventNotificationSystem with new event types:

**Message Events:**
- `communication:message_sent` - New message in conversation/group/channel
- `communication:message_edited` - Message content updated
- `communication:message_deleted` - Message removed

**Interaction Events:**
- `communication:typing_start` - Member started typing
- `communication:typing_stop` - Member stopped typing
- `communication:reaction_added` - Emoji reaction added
- `communication:reaction_removed` - Emoji reaction removed

**Moderation Events:**
- `communication:message_pinned` - Message pinned
- `communication:message_unpinned` - Message unpinned
- `communication:member_muted` - Member muted
- `communication:member_kicked` - Member removed

**Membership Events:**
- `communication:member_joined` - New member added
- `communication:member_left` - Member departed
- `communication:group_created` - New group created
- `communication:channel_updated` - Channel settings changed

**Presence Events:**
- `communication:presence_changed` - Member status updated (online/offline/idle/DND)

### Presence System

**Status Types:**
- `online` - Active and available
- `offline` - Disconnected
- `idle` - Inactive for configured duration
- `dnd` - Do not disturb (suppresses notifications)

**Broadcast Scope:**
- Presence changes only broadcast to members sharing contexts
- Prevents presence enumeration attacks
- Automatic status updates on WebSocket connect/disconnect

## Permission System

### Default Roles

| Role | Permissions |
|------|-------------|
| **Owner** | All permissions (full control) |
| **Admin** | Send messages, delete any message, manage members, create invites, pin messages, mute/kick members |
| **Moderator** | Send messages, delete any message, pin messages, mute/kick members |
| **Member** | Send messages, delete own messages |

### Permission Types

- `SEND_MESSAGES` - Post messages to group/channel
- `DELETE_OWN_MESSAGES` - Remove own messages
- `DELETE_ANY_MESSAGE` - Remove any member's messages
- `MANAGE_MEMBERS` - Add/remove members
- `MANAGE_ROLES` - Assign roles to members
- `MANAGE_CHANNEL` - Update channel settings (visibility, topic)
- `CREATE_INVITES` - Generate invite tokens
- `PIN_MESSAGES` - Pin/unpin messages
- `MUTE_MEMBERS` - Temporarily prevent members from messaging
- `KICK_MEMBERS` - Remove members from group/channel

### Permission Enforcement

All actions validated before execution:
1. Extract member ID from authenticated session
2. Retrieve member's role in context (group/channel)
3. Check if role grants required permission
4. Execute action if authorized, return 403 if denied

## Data Models

### Conversation
```typescript
interface IConversation {
  id: string;
  participants: [string, string]; // exactly two member IDs
  createdAt: Date;
  lastMessageAt: Date;
  lastMessagePreview?: string; // encrypted preview
}
```

### Group
```typescript
interface IGroup {
  id: string;
  name: string;
  creatorId: string;
  members: IGroupMember[];
  encryptedSharedKey: Map<string, string>; // memberId -> encrypted key
  createdAt: Date;
  lastMessageAt: Date;
  promotedFromConversation?: string;
}

interface IGroupMember {
  memberId: string;
  role: DefaultRole;
  joinedAt: Date;
  mutedUntil?: Date;
}
```

### Channel
```typescript
interface IChannel {
  id: string;
  name: string; // unique, lowercase, no spaces
  topic: string;
  creatorId: string;
  visibility: ChannelVisibility;
  members: IChannelMember[];
  encryptedSharedKey: Map<string, string>;
  createdAt: Date;
  lastMessageAt: Date;
  pinnedMessageIds: string[];
  historyVisibleToNewMembers: boolean;
}

enum ChannelVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  SECRET = 'secret',
  INVISIBLE = 'invisible',
}
```

### Message
```typescript
interface ICommunicationMessage {
  id: string;
  contextType: 'conversation' | 'group' | 'channel';
  contextId: string;
  senderId: string;
  encryptedContent: Buffer;
  createdAt: Date;
  editedAt?: Date;
  editHistory: Array<{ content: Buffer; editedAt: Date }>;
  deleted: boolean;
  deletedBy?: string;
  pinned: boolean;
  reactions: IReaction[];
}

interface IReaction {
  id: string;
  emoji: string;
  memberId: string;
  createdAt: Date;
}
```

## API Design

### Response Envelope

All API responses follow a consistent envelope format:

```typescript
interface IApiEnvelope<T> {
  status: 'success' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
```

### Pagination

Cursor-based pagination for all list endpoints:

```typescript
interface IPaginatedResult<T> {
  items: T[];
  cursor?: string; // opaque cursor for next page
  hasMore: boolean;
}
```

### Error Handling

| HTTP Status | Code | Usage |
|-------------|------|-------|
| 400 | `VALIDATION_ERROR` | Invalid request payload |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found (also used for privacy) |
| 409 | `CONFLICT` | Duplicate name, member already exists |
| 410 | `GONE` | Invite expired or fully used |
| 500 | `INTERNAL_ERROR` | Server error |

## Testing Strategy

### Property-Based Testing

The Communication System uses **fast-check** for property-based testing with 29 correctness properties covering:

- Encryption round-trip correctness
- Ordering guarantees (inbox, message history)
- Permission enforcement
- Key rotation consistency
- Pagination completeness
- Event delivery scope
- Privacy guarantees

Each property test runs minimum 100 iterations and references its design property with a tag comment.

### Unit Testing

Unit tests complement property tests with:
- Specific examples demonstrating correct behavior
- Edge cases (empty lists, maximum limits, zero-length messages)
- Error conditions (expired tokens, unauthorized actions)
- Integration points (controller → service → MessagePassingService)

## Integration with Existing Infrastructure

### MessagePassingService

The Communication System builds on MessagePassingService rather than replacing it:

- **Storage**: All messages stored via MessagePassingService
- **Routing**: Message delivery uses existing routing infrastructure
- **Encryption**: Leverages existing ECIES + AES-256-GCM implementation
- **Block Store**: Messages stored as encrypted blocks in BrightChain's block store

### EventNotificationSystem

Real-time features delivered through existing WebSocket infrastructure:

- **Event Types**: New communication event types added to existing system
- **Broadcast**: Uses existing event broadcast mechanisms
- **Subscriptions**: Members automatically subscribed to relevant contexts
- **Delivery**: WebSocket message delivery via existing WebSocketMessageServer

### Authentication

Uses existing BrightChain authentication:

- **BIP39/32**: Key derivation from mnemonic phrases
- **SECP256k1**: Public/private key pairs for identity
- **Member System**: Existing Member objects for identity management
- **Session Management**: Existing session handling and JWT tokens

## Development Status

The Communication System is currently in the design phase. Implementation will follow the existing BrightChain patterns:

- Extends `BaseController` for all API controllers
- Follows `brightchain-api-lib` service patterns
- Integrates with existing `ApiRouter` configuration
- Uses existing test infrastructure (Jest, fast-check)

## Future Enhancements

Potential future additions to the Communication System:

- **Voice/Video**: WebRTC-based encrypted voice and video calls
- **File Sharing**: Large file transfer with chunking and resumption
- **Message Threading**: Threaded conversations within channels
- **Custom Emojis**: User-uploaded emoji support
- **Bots/Webhooks**: Automated message posting and integrations
- **Message Scheduling**: Delayed message delivery
- **Read Receipts**: Optional read status tracking
- **Message Forwarding**: Cross-context message sharing

## Related Documentation

- [Messaging System Architecture](./Messaging%20System%20Architecture.md) - Underlying message passing infrastructure
- [TUPLE Storage Architecture](./TUPLE_Storage_Architecture.md) - Block storage foundation
- [BrightChain Summary](./BrightChain%20Summary.md) - Overall system overview
- [Implementation Roadmap](./ImplementationRoadmap.md) - Development timeline
