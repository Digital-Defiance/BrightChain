# Requirements Document

## Introduction

BrightChat provides end-to-end encryption (ECIES key wrapping with epoch-aware key rotation) for all conversations, groups, and channels. However, the frontend currently provides no visual indication of encryption status to users. This feature introduces subtle, non-intrusive visual indicators throughout the BrightChat UI that reassure users their communications are encrypted, differentiate BrightChat from unencrypted platforms, and surface key lifecycle events (such as key rotation on membership changes). All indicators must be accessible to screen readers and feel native to the existing MUI-based component library.

## Glossary

- **BrightChat_Frontend**: The React component library (`brightchat-react-components`) providing the BrightChat UI, built with MUI.
- **Encryption_Indicator**: A visual element (icon, badge, or text label) that communicates the encryption status of a communication context to the user.
- **Lock_Icon**: A small padlock icon (MUI `LockIcon`) used as the primary visual symbol for end-to-end encryption.
- **Shield_Badge**: A shield-shaped badge (MUI `ShieldIcon` or `VerifiedUserIcon`) used as an alternative or supplementary encryption indicator on server-level elements.
- **Key_Rotation_Notice**: A system message or inline notification displayed in a message thread when a key rotation event occurs (member join, leave, or removal).
- **Encryption_Tooltip**: A tooltip displayed on hover or focus of an Encryption_Indicator, providing a brief human-readable explanation of the encryption status.
- **Channel_Sidebar**: The 240px panel listing channels grouped by category within a server (`ChannelSidebar.tsx`).
- **Server_Rail**: The 72px vertical icon strip displaying server icons and navigation shortcuts (`ServerRail.tsx`).
- **Message_Thread_View**: The main message display area showing the message thread, header, and compose input (`MessageThreadView.tsx`).
- **Compose_Area**: The message input component at the bottom of a message thread (`ComposeArea.tsx`).
- **BrightChat_Layout**: The top-level layout component containing the sub-appbar breadcrumb (`BrightChatLayout.tsx`).
- **Sub_AppBar**: The breadcrumb navigation bar rendered below the main application bar in BrightChat_Layout.
- **Key_Epoch**: A version identifier for a channel's symmetric encryption key, incremented each time key rotation occurs.
- **Context_Type**: The type of communication context: conversation (DM), group, or channel.

## Requirements

### Requirement 1: Channel Sidebar Encryption Icon

**User Story:** As a user browsing channels in the sidebar, I want to see a lock icon next to each channel name, so that I can tell at a glance that the channel is end-to-end encrypted.

#### Acceptance Criteria

1. THE Channel_Sidebar SHALL render a Lock_Icon inline with each channel name, positioned between the existing TagIcon and the channel name text.
2. THE Lock_Icon in the Channel_Sidebar SHALL have a font size of 14px and use the `text.secondary` color from the MUI theme.
3. THE Lock_Icon in the Channel_Sidebar SHALL include an `aria-label` attribute with the value "End-to-end encrypted" for screen reader accessibility.
4. WHEN a user hovers over or focuses the Lock_Icon in the Channel_Sidebar, THE Channel_Sidebar SHALL display an Encryption_Tooltip with the text "End-to-end encrypted".

### Requirement 2: Message Thread Header Encryption Badge

**User Story:** As a user viewing a message thread, I want to see an encryption badge in the thread header area, so that I am reassured that the current conversation is encrypted.

#### Acceptance Criteria

1. THE Message_Thread_View SHALL render an Encryption_Indicator banner at the top of the message thread area, below any loading or error states and above the scrollable message list.
2. THE Encryption_Indicator banner SHALL display a Lock_Icon followed by the text "End-to-end encrypted" in a single horizontal row.
3. THE Encryption_Indicator banner SHALL use `caption` typography variant, `text.secondary` color, and a subtle bottom border matching the theme divider color.
4. THE Encryption_Indicator banner SHALL include `role="status"` and an `aria-label` of "This conversation is end-to-end encrypted" for screen reader accessibility.
5. THE Encryption_Indicator banner SHALL render consistently for all three Context_Types: conversation, group, and channel.

### Requirement 3: Compose Area Encryption Placeholder

**User Story:** As a user composing a message, I want the input placeholder to indicate encryption, so that I am reminded my message will be encrypted before sending.

#### Acceptance Criteria

1. THE Compose_Area SHALL display a Lock_Icon inline within the placeholder area of the text input field.
2. THE Compose_Area placeholder text SHALL read "Type an encrypted message..." instead of the current "Type a message..." text.
3. THE Compose_Area text input SHALL include an `aria-label` attribute with the value "Encrypted message input" to communicate encryption status to screen readers.

### Requirement 4: Sub-AppBar Breadcrumb Encryption Icon

**User Story:** As a user navigating BrightChat, I want to see a lock icon in the breadcrumb bar, so that the encryption status is visible at the top-level navigation.

#### Acceptance Criteria

1. WHEN the user is viewing a channel, group, or conversation context, THE Sub_AppBar SHALL render a Lock_Icon after the last breadcrumb item.
2. THE Lock_Icon in the Sub_AppBar SHALL have a font size of 16px and use the `inherit` color to match the breadcrumb text styling.
3. WHEN a user hovers over or focuses the Lock_Icon in the Sub_AppBar, THE Sub_AppBar SHALL display an Encryption_Tooltip with the text "End-to-end encrypted".
4. THE Lock_Icon in the Sub_AppBar SHALL include an `aria-label` attribute with the value "End-to-end encrypted".
5. WHEN the user is at the BrightChat root (no active context), THE Sub_AppBar SHALL NOT render the Lock_Icon.

### Requirement 5: Server Rail Encryption Badge

**User Story:** As a user viewing the server rail, I want to see a small shield badge on server icons, so that I can identify that all communications within a server are encrypted.

#### Acceptance Criteria

1. THE Server_Rail SHALL render a small Shield_Badge overlaid on the bottom-right corner of each server icon.
2. THE Shield_Badge SHALL be 16px in diameter with a `success.main` background color and a white icon, styled as a circular badge.
3. THE Shield_Badge SHALL include an `aria-label` attribute with the value "Encrypted server" for screen reader accessibility.
4. WHEN a user hovers over or focuses a server icon in the Server_Rail, THE existing server name Tooltip SHALL append " · Encrypted" to the tooltip text.

### Requirement 6: Key Rotation System Messages

**User Story:** As a user in a message thread, I want to see a system message when the encryption key is rotated, so that I understand why a key change occurred and that my conversation remains secure.

#### Acceptance Criteria

1. WHEN a key rotation event is received via WebSocket for the active context, THE Message_Thread_View SHALL insert a Key_Rotation_Notice as a system message in the message list at the chronological position of the event.
2. THE Key_Rotation_Notice SHALL display a Lock_Icon followed by descriptive text indicating the reason for rotation (e.g., "Encryption key updated — a member joined" or "Encryption key updated — a member left").
3. THE Key_Rotation_Notice SHALL use `caption` typography variant, `text.secondary` color, centered alignment, and a distinct visual style (no message bubble background) to differentiate the notice from user messages.
4. THE Key_Rotation_Notice SHALL include `role="status"` and an `aria-live="polite"` attribute so that screen readers announce the key rotation event without interrupting the user.
5. THE Key_Rotation_Notice SHALL NOT be selectable, editable, or deletable by users.

### Requirement 7: Encryption Indicator Accessibility

**User Story:** As a user relying on assistive technology, I want all encryption indicators to be announced by screen readers, so that I have equal awareness of encryption status as sighted users.

#### Acceptance Criteria

1. THE BrightChat_Frontend SHALL ensure every Encryption_Indicator (Lock_Icon, Shield_Badge, Encryption_Tooltip, Key_Rotation_Notice, and Encryption_Indicator banner) has an appropriate `aria-label` or `aria-labelledby` attribute.
2. THE BrightChat_Frontend SHALL ensure that all Encryption_Indicator icons used purely for decoration (where adjacent text already conveys the meaning) are marked with `aria-hidden="true"` to avoid redundant announcements.
3. THE BrightChat_Frontend SHALL ensure that the Encryption_Indicator banner in Message_Thread_View uses `role="status"` so that screen readers announce the encryption status when the thread loads.
4. THE BrightChat_Frontend SHALL ensure that Key_Rotation_Notice elements use `aria-live="polite"` so that screen readers announce rotation events without interrupting the current reading flow.

### Requirement 8: Encryption Indicator Theming Consistency

**User Story:** As a developer, I want encryption indicators to use theme-aware colors and sizing, so that the indicators adapt to light and dark mode and remain visually consistent with the rest of the BrightChat UI.

#### Acceptance Criteria

1. THE BrightChat_Frontend SHALL render all Lock_Icon instances using MUI theme palette colors (`text.secondary` for inline icons, `inherit` for breadcrumb icons) rather than hardcoded color values.
2. THE BrightChat_Frontend SHALL render the Shield_Badge using `success.main` from the MUI theme palette for the background and `success.contrastText` for the icon color.
3. THE BrightChat_Frontend SHALL size all encryption indicator icons using relative units or MUI `fontSize` props (`small`, or explicit pixel values consistent with adjacent elements) rather than absolute CSS values.
4. WHEN the MUI theme switches between light and dark mode, THE BrightChat_Frontend SHALL render all encryption indicators with appropriate contrast ratios (minimum 4.5:1 for text, 3:1 for graphical elements per WCAG 2.1 AA).

### Requirement 9: Encryption Indicator Data-TestId Attributes

**User Story:** As a developer writing tests, I want all encryption indicator elements to have consistent `data-testid` attributes, so that I can reliably select and assert on encryption indicators in automated tests.

#### Acceptance Criteria

1. THE Channel_Sidebar Lock_Icon SHALL have `data-testid="encryption-icon-channel"`.
2. THE Message_Thread_View Encryption_Indicator banner SHALL have `data-testid="encryption-banner"`.
3. THE Compose_Area Lock_Icon SHALL have `data-testid="encryption-icon-compose"`.
4. THE Sub_AppBar Lock_Icon SHALL have `data-testid="encryption-icon-breadcrumb"`.
5. THE Server_Rail Shield_Badge SHALL have `data-testid="encryption-badge-server"`.
6. THE Key_Rotation_Notice elements SHALL have `data-testid="key-rotation-notice"`.
