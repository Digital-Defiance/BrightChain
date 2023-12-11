# Requirements Document

## Introduction

This feature enhances BrightHub user profiles with two new capabilities: upgrading the existing 160-character plain text `bio` field to support markdown formatting and FontAwesome icon markup with a configurable length limit, and a pinned post that lets users showcase a single post at the top of their profile. Both features are controlled by environment variables for configurability.

## Glossary

- **Bio_Field**: The existing `bio` field on `IBaseUserProfile`, upgraded from a 160-character plain text field to a markdown-rendered field supporting standard markdown formatting and FontAwesome icon markup via the `{{ style iconName [classes] [; CSS] }}` syntax. Maximum length is controlled by the BRIGHTHUB_PROFILE_LENGTH environment variable.
- **Formatted_Bio**: The `formattedBio` field on `IBaseUserProfile` that stores the pre-rendered HTML output of the Bio_Field content.
- **Pinned_Post**: A single post selected by a user to be displayed prominently at the top of their profile page, above the regular post timeline.
- **Profile_Service**: The backend service responsible for managing user profile data, including the Bio_Field and Pinned_Post fields.
- **Profile_Renderer**: The frontend component responsible for rendering user profile information, including markdown parsing and icon markup rendering for the Bio_Field.
- **Post_Service**: The backend service responsible for managing post data, including pinned post state.
- **Icon_Markup**: The custom FontAwesome icon syntax used throughout BrightHub: `{{ style iconName [classes] [; CSS] }}` (e.g., `{{ solid heart lg spin; color: red; }}`).
- **Markdown_Parser**: The existing `parseMarkdown()` function in `brighthub-lib` that converts markdown text to HTML using markdown-it with plugins.
- **Environment_Manager**: The `Environment` class in `brightchain-api-lib` that reads and exposes environment variable configuration.
- **BRIGHTHUB_PROFILE_LENGTH**: An environment variable that controls the maximum character length of the Bio_Field content (default: 2000).
- **BRIGHTHUB_PROFILE_PINNED_POST**: An environment variable (true/false) that enables or disables the Pinned_Post feature.

## Requirements

### Requirement 1: Bio Field Data Model Upgrade

**User Story:** As a developer, I want the existing `bio` field on the user profile interface and database schema to support markdown content with a configurable length limit, so that the data layer supports rich profile content.

#### Acceptance Criteria

1. THE IBaseUserProfile interface SHALL retain the existing `bio` field of type `string`, changing its maximum length from 160 characters to the value configured by BRIGHTHUB_PROFILE_LENGTH.
2. THE USER_PROFILES_SCHEMA SHALL update the `bio` property maximum length from 160 to the value determined by the BRIGHTHUB_PROFILE_LENGTH configuration value.
3. THE IBaseUserProfile interface SHALL include a `formattedBio` field of type `string` that is optional, for storing pre-rendered HTML output of the Bio_Field.
4. THE USER_PROFILES_SCHEMA SHALL include a `formattedBio` property of type `string` for storing pre-rendered HTML output of the Bio_Field.
5. WHEN a user profile is created without a `bio` value, THE Profile_Service SHALL store an empty string as the default value for `bio`.

### Requirement 2: Bio Field Content Processing

**User Story:** As a user, I want to write my profile bio using markdown and FontAwesome icons, so that I can create a visually rich profile description.

#### Acceptance Criteria

1. WHEN a `bio` value is submitted, THE Profile_Service SHALL parse the content using the Markdown_Parser to produce HTML.
2. WHEN a `bio` value is submitted, THE Profile_Service SHALL parse Icon_Markup within the content to produce FontAwesome HTML elements.
3. WHEN a `bio` value is submitted, THE Profile_Service SHALL sanitize the raw input by stripping embedded HTML tags before markdown and icon parsing.
4. WHEN a `bio` value is submitted, THE Profile_Service SHALL store the resulting HTML in the `formattedBio` field.
5. THE Profile_Service SHALL reject image-related markdown syntax (inline images and image reference links) within the `bio` content.
6. WHEN a `bio` value exceeds the configured BRIGHTHUB_PROFILE_LENGTH limit, THE Profile_Service SHALL reject the submission with a validation error.
7. FOR ALL valid `bio` values, parsing then rendering then extracting text content SHALL preserve the original text content (round-trip property for markdown parsing).

### Requirement 3: Bio Field Rendering

**User Story:** As a user, I want to see rich markdown-formatted bios on profiles, so that I can learn more about other users through their expressive profile content.

#### Acceptance Criteria

1. WHEN a user profile with a non-empty `formattedBio` is displayed, THE Profile_Renderer SHALL render the `formattedBio` as HTML content in the profile bio section.
2. THE Profile_Renderer SHALL render FontAwesome icon HTML elements with the correct CSS classes and inline styles as produced by the Icon_Markup parser.
3. THE Profile_Renderer SHALL apply word-break styling to the Bio_Field section to prevent content overflow.

### Requirement 4: Pinned Post Data Model

**User Story:** As a developer, I want the user profile and post data models to support a pinned post reference, so that the data layer can track which post a user has pinned.

#### Acceptance Criteria

1. THE IBaseUserProfile interface SHALL include a `pinnedPostId` field of the generic TId type that is optional.
2. THE USER_PROFILES_SCHEMA SHALL include a `pinnedPostId` property of type `string` that is optional.
3. THE IBasePostData interface SHALL include an `isPinned` field of type `boolean` that is optional.
4. THE POSTS_SCHEMA SHALL include an `isPinned` property of type `boolean` that is optional.

### Requirement 5: Pinned Post Selection

**User Story:** As a user, I want to pin one of my posts to my profile, so that visitors see my most important content first.

#### Acceptance Criteria

1. WHEN a user requests to pin a post, THE Post_Service SHALL verify that the post belongs to the requesting user.
2. WHEN a user pins a post, THE Post_Service SHALL set the `isPinned` field to `true` on the target post.
3. WHEN a user pins a post while another post is already pinned, THE Post_Service SHALL set `isPinned` to `false` on the previously pinned post before pinning the new post.
4. WHEN a user pins a post, THE Profile_Service SHALL update the `pinnedPostId` field on the user profile to reference the pinned post.
5. WHEN a user unpins a post, THE Post_Service SHALL set the `isPinned` field to `false` on the post.
6. WHEN a user unpins a post, THE Profile_Service SHALL clear the `pinnedPostId` field on the user profile.
7. IF a user attempts to pin a post that does not belong to the user, THEN THE Post_Service SHALL reject the request with an authorization error.
8. IF a user attempts to pin a post that has been soft-deleted, THEN THE Post_Service SHALL reject the request with a validation error.

### Requirement 6: Pinned Post Display

**User Story:** As a user, I want to see pinned posts prominently on profiles, so that I can quickly find the content the profile owner considers most important.

#### Acceptance Criteria

1. WHEN a user profile with a `pinnedPostId` is displayed, THE Profile_Renderer SHALL display the pinned post above the regular post timeline.
2. THE Profile_Renderer SHALL display a visual indicator (label or icon) on the pinned post to distinguish the pinned post from regular posts.
3. WHEN the pinned post has been soft-deleted, THE Profile_Renderer SHALL omit the pinned post section from the profile view.
4. WHILE the BRIGHTHUB_PROFILE_PINNED_POST environment variable is set to `false`, THE Profile_Renderer SHALL hide the pinned post section from all profile views.

### Requirement 7: Environment Variable Configuration

**User Story:** As an administrator, I want environment variables to control profile enhancement features, so that I can configure feature availability and limits per deployment.

#### Acceptance Criteria

1. THE Environment_Manager SHALL read the `BRIGHTHUB_PROFILE_LENGTH` environment variable as a positive integer.
2. WHEN the `BRIGHTHUB_PROFILE_LENGTH` environment variable is not set, THE Environment_Manager SHALL use a default value of 2000 characters.
3. THE Environment_Manager SHALL read the `BRIGHTHUB_PROFILE_PINNED_POST` environment variable as a boolean string (`true` or `false`).
4. WHEN the `BRIGHTHUB_PROFILE_PINNED_POST` environment variable is not set, THE Environment_Manager SHALL default to `true` (feature enabled).
5. WHEN the `BRIGHTHUB_PROFILE_PINNED_POST` environment variable is set to `false`, THE Profile_Service SHALL reject requests to pin posts with a feature-disabled error.
6. WHEN the `BRIGHTHUB_PROFILE_LENGTH` environment variable contains a non-numeric or negative value, THE Environment_Manager SHALL fall back to the default value of 2000 and log a warning.

### Requirement 8: Bio Field Internationalization

**User Story:** As a user in any locale, I want profile bio UI labels and error messages to be translated, so that the feature is accessible in my language.

#### Acceptance Criteria

1. THE Profile_Renderer SHALL use the `useBrightHubTranslation` hook for all user-facing text labels related to the Bio_Field.
2. THE Profile_Service SHALL return translatable error keys for validation failures related to the Bio_Field content length and format.

### Requirement 9: Profile Editing

**User Story:** As a user, I want to edit my profile bio (and other profile fields) through a UI form, so that I can update my profile information including the new markdown bio.

#### Acceptance Criteria

1. WHEN a user views their own profile, THE Profile_Renderer SHALL display an "Edit Profile" button.
2. WHEN the "Edit Profile" button is clicked, THE Profile_Renderer SHALL open an edit dialog or form containing fields for `displayName`, `bio`, `location`, and `websiteUrl`.
3. THE bio field in the edit form SHALL display a live character count against the configured `maxLength`.
4. THE bio field in the edit form SHALL show a live markdown preview of the bio content.
5. WHEN the user submits the edit form with a bio that exceeds `maxLength`, THE Profile_Renderer SHALL display a localized validation error message.
6. WHEN the user submits the edit form with bio content containing image markdown syntax, THE Profile_Renderer SHALL display a localized validation error message.
7. WHEN the edit form is submitted successfully, THE Profile_Renderer SHALL close the dialog and reflect the updated profile data.
8. All labels, placeholders, and error messages in the edit form SHALL use the `useBrightHubTranslation` hook.
