# brightchat-lib

#
<!--
  NOTE: This documentation is auto-synced with the implementation.
  Any changes to the code should be reflected here immediately.
  If you update the code, update this file as well.
-->
#
<!--
  NOTE: This documentation is auto-synced with the implementation.
  Any changes to the code should be reflected here immediately.
  If you update the code, update this file as well.
-->
#
<!--
  NOTE: This documentation is auto-synced with the implementation.
  Any changes to the code should be reflected here immediately.
  If you update the code, update this file as well.
-->
#
<!--
  NOTE: This documentation is auto-synced with the implementation.
  Any changes to the code should be reflected here immediately.
  If you update the code, update this file as well.
-->
#
<!--
  NOTE: This documentation is auto-synced with the implementation.
  Any changes to the code should be reflected here immediately.
  If you update the code, update this file as well.
-->
Shared request interfaces for the **BrightChat** API. This library defines the typed parameter shapes used by the [brightchat-react-components](../brightchat-react-components) API client when calling BrightChat REST endpoints.

# @brightchain/brightchat-lib

Shared request interfaces for the **BrightChat** API. This library defines the typed parameter shapes used by the [brightchat-react-components](../brightchat-react-components) API client when calling BrightChat REST endpoints.

## Relationship to Other Packages

```
brightchain-lib          ← shared data types, enums, response interfaces (IConversation, DefaultRole, etc.)
    ↑
brightchat-lib           ← request parameter interfaces (this package)
    ↑
brightchat-react-components  ← React UI components, hooks, API client (consumer)
```

- **`@brightchain/brightchain-lib`** owns all shared data models (`IConversation`, `IGroup`, `IChannel`, `ICommunicationMessage`, `IReaction`, etc.) and enumerations (`DefaultRole`, `ChannelVisibility`, `PresenceStatus`, `CommunicationEventType`). These are NOT redefined here.
- **`@brightchain/brightchat-lib`** (this package) defines only the request parameter interfaces — the shapes of POST/PUT/DELETE request bodies sent to the BrightChat API.
- **`@brightchain/brightchat-react-components`** consumes both packages to build the typed `ChatApiClient`.

## Exported Interfaces

| Interface | Purpose |
|-----------|---------|
| `SendDirectMessageParams` | `POST /api/conversations` — recipientId + content |
| `CreateGroupParams` | `POST /api/groups` — name + memberIds |
| `SendMessageParams` | `POST .../messages` — content (used for group & channel messages) |
| `AddMembersParams` | `POST .../members` — memberIds array |
| `AssignRoleParams` | `PUT .../roles/:memberId` — role (`DefaultRole`) |
| `CreateChannelParams` | `POST /api/channels` — name, topic, visibility (`ChannelVisibility`) |
| `CreateInviteParams` | `POST .../invites` — optional maxUses, expiresInMs |
| `MuteMemberParams` | `POST .../mute/:memberId` — durationMs |
| `AddReactionParams` | `POST .../reactions` — emoji string |
| `EditMessageParams` | `PUT .../messages/:messageId` — updated content |
| `PromoteToGroupParams` | `POST .../promote` — newMemberIds for DM→group promotion |
| `PaginationParams` | Cursor-based pagination — optional cursor + limit |
| `SearchParams` | Extends `PaginationParams` with required query string |

## Usage

```typescript
import { SendDirectMessageParams, PaginationParams } from '@brightchain/brightchat-lib';

const params: SendDirectMessageParams = {
  recipientId: 'member-uuid',
  content: 'Hello!',
};
```

## Build Commands

```bash
yarn nx build brightchat-lib
yarn nx test brightchat-lib
yarn nx lint brightchat-lib
```

## License

MIT — [Digital Defiance](https://github.com/Digital-Defiance)
