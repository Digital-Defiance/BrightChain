# Implementation Plan: BrightChat Encryption Indicators

## Overview

Add visual encryption indicators across the BrightChat frontend (Channel Sidebar, Message Thread Header, Compose Area, Sub-AppBar Breadcrumb, Server Rail) and key rotation system messages. Implementation lives in `brightchat-react-components` with a shared interface/enum addition in `brightchain-lib`. All indicators use MUI theme-aware styling, ARIA accessibility attributes, and `data-testid` attributes.

## Tasks

- [x] 1. Add shared types and enum in brightchain-lib
  - [x] 1.1 Add `KEY_ROTATED` value to `CommunicationEventType` enum in `brightchain-lib/src/lib/enumerations/communication.ts`
    - Add `KEY_ROTATED = 'communication:key_rotated'` to the enum
    - _Requirements: 6.1_

  - [x] 1.2 Create `IKeyRotationEvent` interface in brightchain-lib
    - Create or update the events interface file with `IKeyRotationEvent` containing `contextId`, `contextType`, `reason`, `newEpoch`, and `timestamp` fields
    - Export the interface from the brightchain-lib barrel
    - _Requirements: 6.1, 6.2_

- [x] 2. Create shared EncryptionBanner component
  - [x] 2.1 Create `EncryptionBanner.tsx` in `brightchat-react-components/src/lib/`
    - Render `LockIcon` (aria-hidden since adjacent text conveys meaning) + `Typography` caption "End-to-end encrypted" in a horizontal row
    - Apply `role="status"`, `aria-label="This conversation is end-to-end encrypted"`
    - Style with `text.secondary` color, `caption` variant, bottom border using theme `divider` color
    - Set `data-testid="encryption-banner"`
    - Accept optional `testId` prop for override
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 7.2, 7.3, 8.1, 8.3, 9.2_

  - [x] 2.2 Write unit tests for EncryptionBanner
    - Test that banner renders lock icon and "End-to-end encrypted" text
    - Test `role="status"` and `aria-label` attributes
    - Test `data-testid="encryption-banner"`
    - Test that LockIcon has `aria-hidden="true"`
    - Test theme-aware styling in light and dark mode
    - _Requirements: 2.2, 2.3, 2.4, 7.1, 7.2, 7.3, 8.1, 9.2_

- [x] 3. Create KeyRotationNotice component and applyKeyRotation helper
  - [x] 3.1 Create `KeyRotationNotice.tsx` in `brightchat-react-components/src/lib/`
    - Accept `reason` (`'member_joined' | 'member_left' | 'member_removed'`) and `timestamp` props
    - Render `LockIcon` + descriptive text per reason (e.g., "Encryption key updated — a member joined")
    - Apply `role="status"`, `aria-live="polite"`, `userSelect: 'none'`
    - Style with `caption` variant, `text.secondary` color, centered alignment, no bubble background
    - Set `data-testid="key-rotation-notice"`
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 7.1, 7.4, 8.1, 9.6_

  - [x] 3.2 Create `KeyRotationNoticeItem` type and `applyKeyRotation` pure function
    - Define `KeyRotationNoticeItem` and `ThreadItem` types in `useChatWebSocket.ts` (or a dedicated utils file)
    - Implement `applyKeyRotation(items, notice)` that inserts a key rotation notice into a chronologically sorted list and returns a new sorted array
    - Export the function for testing
    - _Requirements: 6.1_

  - [x] 3.3 Write unit tests for KeyRotationNotice component
    - Test rendering for each reason type (`member_joined`, `member_left`, `member_removed`)
    - Test `role="status"` and `aria-live="polite"` attributes
    - Test `data-testid="key-rotation-notice"`
    - Test non-selectability (`userSelect: 'none'`)
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 9.6_

  - [x] 3.4 Write property test for applyKeyRotation — Property 4: Key rotation notice is inserted in chronological order
    - **Property 4: Key rotation notice is inserted in chronological order**
    - **Validates: Requirements 6.1**
    - Use `fast-check` to generate random sorted thread item lists and random key rotation notices
    - Assert the output of `applyKeyRotation` is still chronologically sorted and contains the new notice

- [x] 4. Checkpoint — Ensure shared components build and tests pass
  - Run `yarn nx build brightchain-lib` and `yarn nx build brightchat-react-components` to verify compilation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add encryption icon to Channel Sidebar
  - [x] 5.1 Modify `ChannelSidebar.tsx` to add Lock icon per channel
    - Add `LockIcon` (14px, `text.secondary`) between `TagIcon` and channel name in each `ListItemButton`
    - Wrap `LockIcon` in MUI `Tooltip` with title "End-to-end encrypted"
    - Set `aria-label="End-to-end encrypted"` on the `LockIcon`
    - Set `data-testid="encryption-icon-channel"` on the `LockIcon`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 8.1, 8.3, 9.1_

  - [x] 5.2 Write unit tests for ChannelSidebar encryption icon
    - Test lock icon presence, 14px size, `text.secondary` color
    - Test `aria-label` and tooltip text
    - Test `data-testid="encryption-icon-channel"`
    - _Requirements: 1.2, 1.3, 1.4, 9.1_

  - [x] 5.3 Write property test — Property 1: Every channel row renders a lock icon
    - **Property 1: Every channel row renders a lock icon**
    - **Validates: Requirements 1.1**
    - Use `fast-check` to generate random channel/category arrays
    - Render `ChannelSidebar` and assert lock icon count matches visible (non-collapsed) channel count

- [x] 6. Add encryption badge to Server Rail
  - [x] 6.1 Modify `ServerRail.tsx` to add Shield badge per server
    - Add a `ShieldBadge` (16px circular, `success.main` bg, white `VerifiedUserIcon`) overlaid on the bottom-right of each server `IconButton` using absolute positioning
    - Set `aria-label="Encrypted server"` and `data-testid="encryption-badge-server"` on the badge
    - Modify `Tooltip` title from `server.name` to `` `${server.name} · Encrypted` ``
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.1, 8.2, 8.3, 9.5_

  - [x] 6.2 Write unit tests for ServerRail encryption badge
    - Test shield badge presence, 16px size, `success.main` background, white icon
    - Test `aria-label="Encrypted server"` and `data-testid="encryption-badge-server"`
    - Test tooltip text includes " · Encrypted"
    - _Requirements: 5.2, 5.3, 5.4, 9.5_

  - [x] 6.3 Write property test — Property 2: Every server icon renders a shield badge
    - **Property 2: Every server icon renders a shield badge**
    - **Validates: Requirements 5.1**
    - Use `fast-check` to generate random server arrays
    - Render `ServerRail` and assert shield badge count matches server count

  - [x] 6.4 Write property test — Property 3: Server tooltip includes encryption suffix
    - **Property 3: Server tooltip includes encryption suffix**
    - **Validates: Requirements 5.4**
    - Use `fast-check` to generate random server names
    - Render `ServerRail` and assert each tooltip text equals `"{name} · Encrypted"`

- [x] 7. Update Compose Area with encryption placeholder
  - [x] 7.1 Modify `ComposeArea.tsx` to add encryption indicator
    - Change placeholder text from `"Type a message..."` to `"Type an encrypted message..."`
    - Add `LockIcon` in the placeholder area via `InputAdornment` startAdornment
    - Update `aria-label` to `"Encrypted message input"`
    - Set `data-testid="encryption-icon-compose"` on the `LockIcon`
    - _Requirements: 3.1, 3.2, 3.3, 7.1, 8.1, 8.3, 9.3_

  - [x] 7.2 Write unit tests for ComposeArea encryption indicator
    - Test updated placeholder text "Type an encrypted message..."
    - Test lock icon presence and `data-testid="encryption-icon-compose"`
    - Test `aria-label="Encrypted message input"` on the input
    - _Requirements: 3.1, 3.2, 3.3, 9.3_

- [x] 8. Add encryption icon to Sub-AppBar breadcrumb
  - [x] 8.1 Modify `BrightChatLayout.tsx` to add Lock icon in breadcrumb
    - After the `Breadcrumbs` component, conditionally render a `LockIcon` (16px, `inherit` color) when breadcrumb items length > 1 (active context)
    - Wrap in `Tooltip` with title "End-to-end encrypted"
    - Set `aria-label="End-to-end encrypted"` and `data-testid="encryption-icon-breadcrumb"`
    - Do NOT render when at BrightChat root (no active context)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 8.1, 8.3, 9.4_

  - [x] 8.2 Write unit tests for Sub-AppBar encryption icon
    - Test lock icon renders when viewing a channel/group/conversation
    - Test lock icon does NOT render at BrightChat root
    - Test 16px size, `inherit` color, tooltip text, `aria-label`
    - Test `data-testid="encryption-icon-breadcrumb"`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.4_

- [x] 9. Checkpoint — Ensure all indicator components build and tests pass
  - Run `yarn nx build brightchat-react-components` and `yarn nx test brightchat-react-components`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Integrate EncryptionBanner and KeyRotationNotice into MessageThreadView
  - [x] 10.1 Add EncryptionBanner to MessageThreadView
    - Insert `EncryptionBanner` at the top of the message area, after loading/error states and before the scrollable message list
    - Ensure it renders consistently for all three context types (conversation, group, channel)
    - _Requirements: 2.1, 2.5_

  - [x] 10.2 Wire up KEY_ROTATED WebSocket event in useChatWebSocket
    - Add `onKeyRotated` handler to `ChatWebSocketHandlers` interface
    - Add `KEY_ROTATED` event listener in the WebSocket connection setup using the `EVENT_HANDLER_MAP` pattern
    - Validate incoming event data; silently ignore malformed events with `console.warn` in dev mode
    - _Requirements: 6.1_

  - [x] 10.3 Render KeyRotationNotice in MessageThreadView message list
    - Use `applyKeyRotation` to insert `KeyRotationNoticeItem` into the thread items list when `onKeyRotated` fires
    - Add rendering logic in the message list loop to differentiate `KeyRotationNoticeItem` from regular messages using the `type` discriminator
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 10.4 Write unit tests for MessageThreadView encryption integration
    - Test EncryptionBanner renders at top of message area
    - Test EncryptionBanner renders for conversation, group, and channel context types
    - Test KeyRotationNotice appears in message list when a key rotation event is simulated
    - Test malformed KEY_ROTATED events are silently ignored
    - _Requirements: 2.1, 2.5, 6.1, 6.2_

- [x] 11. Accessibility and theming cross-check
  - [x] 11.1 Audit all encryption indicators for accessibility compliance
    - Verify every `Encryption_Indicator` has `aria-label` or `aria-labelledby`
    - Verify decorative icons (where adjacent text conveys meaning) have `aria-hidden="true"`
    - Verify `EncryptionBanner` uses `role="status"`
    - Verify `KeyRotationNotice` uses `aria-live="polite"`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 11.2 Write theming unit tests for light and dark mode
    - Render encryption indicators in both light and dark MUI themes
    - Verify theme-aware colors are applied (`text.secondary`, `success.main`, `inherit`)
    - Verify no hardcoded color values are used
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Run `yarn nx test brightchain-lib` and `yarn nx test brightchat-react-components`
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples, edge cases, and accessibility attributes
- All code changes are in TypeScript (React/MUI) within `brightchat-react-components` and `brightchain-lib`
