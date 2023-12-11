# Implementation Plan: BrightHub Profile Enhancements

## Overview

Implement rich bio support (markdown + icon markup, configurable length) and pinned post functionality across the shared interfaces, database schemas, backend environment config, bio processing function, and React frontend components. Tasks are ordered so each layer builds on the previous: shared interfaces first, then DB schemas, then backend config, then the bio parser with property tests, then frontend components.

## Tasks

- [x] 1. Update shared interfaces in `brighthub-lib`
  - [x] 1.1 Add `formattedBio` and `pinnedPostId` to `IBaseUserProfile`
    - In `brighthub-lib/src/lib/interfaces/base-user-profile.ts`, update the `bio` field comment to reflect the new configurable max length (no longer hardcoded 160)
    - Add `formattedBio?: string` — optional, stores pre-rendered HTML of the bio
    - Add `pinnedPostId?: TId` — optional, uses the same generic `TId` as `_id`
    - _Requirements: 1.1, 1.3, 4.1_

  - [x] 1.2 Add `isPinned` to `IBasePostData`
    - In `brighthub-lib/src/lib/interfaces/base-post-data.ts`, add `isPinned?: boolean` — optional, `true` when this post is pinned to the author's profile
    - _Requirements: 4.3_

- [x] 2. Update database schemas in `brightchain-db`
  - [x] 2.1 Update `USER_PROFILES_SCHEMA` in `users.schema.ts`
    - Change `bio` property `maxLength` from `160` to `2000` (schema-level safety net; runtime uses env var)
    - Add `formattedBio: { type: 'string' }` as an optional property
    - Add `pinnedPostId: { type: 'string' }` as an optional property
    - _Requirements: 1.2, 1.4, 4.2_

  - [x] 2.2 Update `POSTS_SCHEMA` in `posts.schema.ts`
    - Add `isPinned: { type: 'boolean' }` as an optional property in the `properties` map
    - Add a compound index `{ fields: { authorId: 1, isPinned: 1 } }` to the `indexes` array to enable efficient pinned-post lookup per user
    - _Requirements: 4.4_

- [x] 3. Add environment variable support to `brightchain-api-lib`
  - [x] 3.1 Add `profileLength` and `profilePinnedPostEnabled` to the `Environment` class
    - In `brightchain-api-lib/src/lib/environment.ts`, add two private fields: `_profileLength: number` and `_profilePinnedPostEnabled: boolean`
    - In the constructor, read `BRIGHTHUB_PROFILE_LENGTH`: parse as a positive integer; if missing, non-numeric, zero, or negative, fall back to `2000` and log a `[ warning ]` message (matching the existing warning style in the file)
    - Read `BRIGHTHUB_PROFILE_PINNED_POST`: treat any value other than `'false'` as `true` (feature enabled by default)
    - Add public getters `profileLength` and `profilePinnedPostEnabled`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

  - [x] 3.2 Write unit tests for `Environment` profile fields
    - Test file: `brightchain-api-lib/src/lib/environment.spec.ts` (or alongside the existing test file)
    - `BRIGHTHUB_PROFILE_LENGTH` parses a valid positive integer string correctly
    - `BRIGHTHUB_PROFILE_LENGTH` defaults to `2000` when the variable is unset
    - `BRIGHTHUB_PROFILE_LENGTH` falls back to `2000` for `"abc"`, `"-5"`, and `"0"`
    - `BRIGHTHUB_PROFILE_PINNED_POST` returns `true` when set to `"true"` or when unset
    - `BRIGHTHUB_PROFILE_PINNED_POST` returns `false` when set to `"false"`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

  - [x] 3.3 Write property test for `Environment` profile length parsing (Property 10)
    - Test file: co-located with the unit tests above
    - **Property 10: Environment variable profile length parsing**
    - **Validates: Requirements 7.1, 7.6**
    - Use `fast-check` to generate random strings (valid positive integers, negative integers, zero, non-numeric strings) as the `BRIGHTHUB_PROFILE_LENGTH` value
    - Assert: if the string represents a valid positive integer, `profileLength` equals that integer; otherwise `profileLength` equals `2000`
    - Minimum 100 iterations
    - Tag: `Feature: brighthub-profile-enhancements, Property 10: Environment variable profile length parsing`

- [x] 4. Implement `parseBioContent()` in `brighthub-lib`
  - [x] 4.1 Add `parseBioContent()` to `brighthub-lib/src/lib/brighthub-lib.ts`
    - Before the pipeline, check for inline image syntax `/!\[([^\]]*)\]\(([^)]+)\)/` and reference image syntax `/!\[([^\]]*)\]\[([^\]]*)\]/`; throw a descriptive error if either is found
    - Check that `getCharacterCount(content, true)` is ≤ `maxLength`; throw a validation error with key `bio_exceeds_max_length` if exceeded
    - Phase 1: `sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} })` — strip all embedded HTML
    - Phase 2: `parseMarkdown(content)` — bios always use full markdown (no `isBlogPost` branch)
    - Phase 3: `parseIconMarkup(content)` — convert `{{ }}` icon syntax to FontAwesome `<i>` elements
    - Omit the `<img>` enhancement step (images are rejected before the pipeline)
    - Signature: `export function parseBioContent(content: string, maxLength: number): string`
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

  - [x] 4.2 Write unit tests for `parseBioContent()`
    - Test file: `brighthub-lib/src/lib/brighthub-lib.spec.ts` (co-located)
    - Empty string input returns empty or minimal HTML without throwing
    - Plain text (no markdown) produces expected HTML output
    - Bold/italic/link markdown produces correct HTML tags
    - Valid icon markup `{{ solid heart }}` produces `<i class="fa-solid fa-heart" ...>`
    - Mixed markdown and icon markup renders both correctly
    - Inline image `![alt](url)` throws an error
    - Reference image `![alt][ref]` throws an error
    - Bio exceeding `maxLength` throws a validation error
    - Bio at exactly `maxLength` characters is accepted
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

  - [x] 4.3 Write property test for bio length validation (Property 1)
    - **Property 1: Bio length validation**
    - **Validates: Requirements 1.1, 2.6**
    - Generate random alphanumeric strings (0–5000 chars) and random positive `maxLength` values (1–5000)
    - Assert: `parseBioContent` accepts the bio if and only if its character count ≤ `maxLength`
    - Minimum 100 iterations
    - Tag: `Feature: brighthub-profile-enhancements, Property 1: Bio length validation`

  - [x] 4.4 Write property test for bio round-trip text preservation (Property 2)
    - **Property 2: Bio content round-trip text preservation**
    - **Validates: Requirements 2.7**
    - Generate random alphanumeric strings with markdown formatting (bold, italic, links — no images, no raw HTML)
    - Parse through `parseBioContent()`, extract text content from the resulting HTML (strip tags), compare whitespace-normalized text to the original
    - Minimum 100 iterations
    - Tag: `Feature: brighthub-profile-enhancements, Property 2: Bio content round-trip text preservation`

  - [x] 4.5 Write property test for bio HTML sanitization (Property 3)
    - **Property 3: Bio HTML sanitization**
    - **Validates: Requirements 2.3**
    - Generate random strings with injected HTML tags (`<script>`, `<div>`, `<b>`, etc.)
    - Assert: none of the original raw HTML tags survive in the output of `parseBioContent()`
    - Minimum 100 iterations
    - Tag: `Feature: brighthub-profile-enhancements, Property 3: Bio HTML sanitization`

  - [x] 4.6 Write property test for bio image markdown rejection (Property 4)
    - **Property 4: Bio image markdown rejection**
    - **Validates: Requirements 2.5**
    - Generate random strings with `![randomAlt](randomUrl)` or `![randomAlt][randomRef]` injected at random positions
    - Assert: `parseBioContent()` always throws for any such input, regardless of surrounding content
    - Minimum 100 iterations
    - Tag: `Feature: brighthub-profile-enhancements, Property 4: Bio image markdown rejection`

  - [x] 4.7 Write property test for bio icon markup rendering (Property 5)
    - **Property 5: Bio icon markup rendering**
    - **Validates: Requirements 2.1, 2.2**
    - Generate random valid icon names from `FontAwesomeIconNames` and random styles from `FontAwesomeIconStyleStrings`, embed in random surrounding text
    - Assert: output of `parseBioContent()` contains a `<i>` element with the correct `fa-` CSS classes for each valid icon markup instance
    - Minimum 100 iterations
    - Tag: `Feature: brighthub-profile-enhancements, Property 5: Bio icon markup rendering`

- [x] 5. Checkpoint — verify bio processing layer
  - Ensure all tests pass for tasks 1–4: `npx nx test brighthub-lib --testPathPatterns brighthub-lib.spec` and `npx nx test brightchain-api-lib`
  - Ask the user if any questions arise before proceeding to frontend work.

- [x] 6. Update `UserProfileCard` to render `formattedBio` as HTML
  - In `brighthub-react-components/src/lib/profiles/UserProfileCard.tsx`, replace the existing bio `Typography` block with a `Box` that uses `dangerouslySetInnerHTML`
  - Render `formattedBio` when present; fall back to plain `bio` for legacy profiles that haven't been re-processed
  - Apply `sx={{ mt: 1, wordBreak: 'break-word', '& p': { m: 0 }, '& p:last-child': { mb: 0 } }}` to the bio `Box` — matches the `PostCard` pattern for `formattedContent`
  - Condition the section on `(user.formattedBio || user.bio)` being truthy
  - _Requirements: 3.1, 3.2, 3.3_

  - [x] 6.1 Write unit tests for `UserProfileCard` bio rendering
    - Test file: `brighthub-react-components/src/lib/profiles/UserProfileCard.spec.tsx`
    - Renders `formattedBio` as HTML (via `dangerouslySetInnerHTML`) when `formattedBio` is present
    - Falls back to plain `bio` text when `formattedBio` is absent
    - Renders nothing in the bio section when both `bio` and `formattedBio` are empty/absent
    - Bio section has `wordBreak: 'break-word'` styling applied
    - _Requirements: 3.1, 3.3_

- [x] 7. Create `PinnedPostSection` component
  - [x] 7.1 Create `brighthub-react-components/src/lib/profiles/PinnedPostSection.tsx`
    - Define `PinnedPostSectionProps` interface with: `pinnedPost: IBasePostData<string>`, `author: IBaseUserProfile<string>`, `featureEnabled: boolean`, `isSelf?: boolean`, `onUnpin?: (postId: string) => void`, `onPostClick?: (postId: string) => void`
    - Return `null` if `!featureEnabled` or `pinnedPost.isDeleted`
    - Render a header row with a `PushPin` MUI icon and a "Pinned" label using `useBrightHubTranslation()`
    - Delegate post rendering to the existing `PostCard` component, passing `pinnedPost` and `author`
    - When `isSelf` is `true` and `onUnpin` is provided, render an "Unpin" action button that calls `onUnpin(pinnedPost._id)`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.2 Write unit tests for `PinnedPostSection`
    - Test file: `brighthub-react-components/src/lib/profiles/PinnedPostSection.spec.tsx`
    - Renders the pinned post with a pin indicator when `featureEnabled` is `true` and post is not deleted
    - Renders nothing when `featureEnabled` is `false`
    - Renders nothing when `pinnedPost.isDeleted` is `true`
    - Shows the unpin button when `isSelf` is `true` and `onUnpin` is provided
    - Does not show the unpin button when `isSelf` is `false`
    - Calls `onUnpin` with the correct post ID when the unpin button is clicked
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Add i18n string keys for profile enhancements
  - [x] 8.1 Add new keys to `BrightHubStrings` enum
    - In `brighthub-lib/src/lib/enumerations/brightHubStrings.ts`, add the following key groups:
    - `PinnedPostSection_Pinned`, `PinnedPostSection_Unpin`, `PinnedPostSection_AriaLabel`
    - `EditProfileDialog_Title`, `EditProfileDialog_DisplayName`, `EditProfileDialog_Bio`, `EditProfileDialog_BioPlaceholder`, `EditProfileDialog_BioCharCountTemplate`, `EditProfileDialog_BioPreview`, `EditProfileDialog_Location`, `EditProfileDialog_WebsiteUrl`, `EditProfileDialog_Save`, `EditProfileDialog_Cancel`, `EditProfileDialog_Saving`, `EditProfileDialog_ErrorBioTooLong`, `EditProfileDialog_ErrorBioContainsImage`
    - `UserProfileCard_EditProfile`
    - _Requirements: 8.1, 9.8_

  - [x] 8.2 Add English (US) translations
    - In `brighthub-lib/src/lib/i18n/strings/englishUs.ts`, add translations for all new keys from 8.1
    - `PinnedPostSection_Pinned`: `'Pinned'`, `PinnedPostSection_Unpin`: `'Unpin'`, `PinnedPostSection_AriaLabel`: `'Pinned post'`
    - `EditProfileDialog_Title`: `'Edit Profile'`, `EditProfileDialog_DisplayName`: `'Display name'`, `EditProfileDialog_Bio`: `'Bio'`, `EditProfileDialog_BioPlaceholder`: `'Tell people about yourself. Markdown and icons supported.'`, `EditProfileDialog_BioCharCountTemplate`: `'{CURRENT}/{MAX}'`, `EditProfileDialog_BioPreview`: `'Preview'`, `EditProfileDialog_Location`: `'Location'`, `EditProfileDialog_WebsiteUrl`: `'Website'`, `EditProfileDialog_Save`: `'Save'`, `EditProfileDialog_Cancel`: `'Cancel'`, `EditProfileDialog_Saving`: `'Saving\u2026'`, `EditProfileDialog_ErrorBioTooLong`: `'Bio exceeds the maximum length of {MAX} characters.'`, `EditProfileDialog_ErrorBioContainsImage`: `'Bio cannot contain image markdown syntax.'`
    - `UserProfileCard_EditProfile`: `'Edit Profile'`
    - _Requirements: 8.1, 9.8_

  - [x] 8.3 Add English (UK) translations
    - In `brighthub-lib/src/lib/i18n/strings/englishUK.ts`, add the same translations as 8.2 (UK English is identical for these strings)
    - _Requirements: 8.1, 9.8_

- [x] 9. Create `EditProfileDialog` component
  - [x] 9.1 Create `brighthub-react-components/src/lib/profiles/EditProfileDialog.tsx`
    - Define `EditProfileUpdates` interface: `{ displayName: string; bio: string; location?: string; websiteUrl?: string; }`
    - Define `EditProfileDialogProps`: `open: boolean`, `profile: IBaseUserProfile<string>`, `bioMaxLength: number`, `onSave: (updates: EditProfileUpdates) => Promise<void>`, `onClose: () => void`
    - Render a MUI `Dialog` with fields for `displayName` (required `TextField`), `bio` (multiline `TextField` with two tabs: Edit and Preview), `location` (optional `TextField`), `websiteUrl` (optional `TextField`)
    - Bio field: show live character count `{current}/{max}` below the field using `getCharacterCount(bio, true)` from `brighthub-lib`; turn the count red (`error` color) when over limit
    - Bio Preview tab: render `parseBioContent(bio, bioMaxLength)` output via `dangerouslySetInnerHTML` (catch errors and show the error message instead)
    - Validate on submit: bio length check and image markdown check — display localized errors using `useBrightHubTranslation()` keys from task 8.1
    - Submit button shows `EditProfileDialog_Saving` text and is disabled while `onSave` is in flight
    - Submit button disabled when `displayName` is empty or bio validation fails
    - Use `useBrightHubTranslation()` for all labels, placeholders, and error messages
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [x] 9.2 Wire "Edit Profile" button into `UserProfileCard`
    - In `brighthub-react-components/src/lib/profiles/UserProfileCard.tsx`, add an optional `onEditProfile?: () => void` prop
    - When `isSelf` is `true` and `onEditProfile` is provided, render an "Edit Profile" `Button` in the header row (alongside the existing `actionElement`)
    - Use `t(BrightHubStrings.UserProfileCard_EditProfile)` for the button label
    - _Requirements: 9.1_

  - [x] 9.3 Write unit tests for `EditProfileDialog`
    - Test file: `brighthub-react-components/src/lib/profiles/EditProfileDialog.spec.tsx`
    - Renders all form fields pre-populated with the profile data
    - Shows live character count for the bio field
    - Character count turns red when bio exceeds `bioMaxLength`
    - Submit button is disabled when `displayName` is empty
    - Submit button is disabled when bio exceeds `bioMaxLength`
    - Shows bio validation error when image markdown is entered
    - Calls `onSave` with correct `EditProfileUpdates` when form is submitted
    - Shows saving state (disabled button, saving label) while `onSave` is in flight
    - Calls `onClose` when Cancel is clicked
    - All user-facing strings use i18n keys (mock `useBrightHubTranslation` returning key as value)
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

- [x] 10. Final checkpoint — ensure all tests pass
  - Run `yarn nx run-many --target=test --projects=brighthub-lib,brightchain-api-lib,brighthub-react-components`
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` and must include a comment with the property number and tag from the design document
- Checkpoints ensure incremental validation before moving to the next layer
- Properties 6–9 (pin authorization, pin/unpin round-trip, at-most-one invariant, soft-delete rejection) are backend service-level properties — they are not included here because the `Post_Service` and `Profile_Service` backend implementations are out of scope for this task list, which covers only the data model, schema, environment config, shared lib function, and frontend components
