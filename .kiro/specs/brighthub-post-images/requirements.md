# Requirements Document

## Introduction

This feature replaces BrightHub's current grid-based media attachment model with inline images embedded directly in post markdown content. Today, posts support up to 4 images rendered as a grid below the text via the `mediaAttachments` array. With inline images, authors place images anywhere in the post body using standard markdown image syntax (`![alt text](url)`), preview them via the staging system during composition, and on publish the backend commits staged images to permanent vault storage and rewrites staging URLs to permanent serving URLs.

The feature integrates with the existing temporary upload staging system (`POST /api/temp-upload`), vault container infrastructure, and `parsePostContent()` markdown renderer. Existing posts with grid-based attachments continue to render correctly. New inline-image posts store committed image metadata in `mediaAttachments` for reference while the images themselves are rendered inline from the markdown content.

## Glossary

- **Post_Composer**: The React component (`PostComposer`) that provides the textarea-based post creation interface with formatting toolbar, media support, and preview.
- **Post_Card**: The React component (`PostCard`) that renders a single post with author info, formatted content, media attachments, and interaction buttons.
- **Staging_System**: The temporary upload staging infrastructure (`/api/temp-upload` endpoints) that accepts file uploads, serves preview URLs, and commits files to permanent vault storage.
- **Staging_URL**: A preview URL of the form `/api/temp-upload/{commitToken}/preview` that serves a staged file before it is committed to permanent storage.
- **Permanent_URL**: A vault-backed serving URL that serves a committed image file from the hub's vault container.
- **Commit_Token**: The UUID v4 identifier returned by the Staging_System that acts as both the staged file ID and bearer credential for preview access.
- **Vault_Container**: The Digital Burnbag storage container associated with a hub for storing committed public image assets.
- **Inline_Image**: An image embedded within the post markdown content using the syntax `![alt text](url)`, rendered as an `<img>` tag in the formatted HTML.
- **Media_Attachment_Record**: An entry in the `mediaAttachments` array of `IBasePostData` that stores metadata (file ID, URL, dimensions, alt text, MIME type) for a committed inline image.
- **URL_Rewriter**: The backend logic that scans post content for Staging_URLs, commits each staged file to the Vault_Container, and replaces the Staging_URLs with Permanent_URLs in the content before saving.
- **Post_Creation_API**: The backend API endpoint that handles new post creation, including content validation, URL rewriting, and image commitment.
- **Post_Edit_API**: The backend API endpoint that handles post editing within the 15-minute edit window, including processing newly added inline images.
- **Image_Processor**: The `processImage()` utility from `stagingImageProcessor.ts` that applies optional resize, format conversion, and EXIF stripping at commit time.
- **Content_Parser**: The `parsePostContent()` function in `brighthub-lib` that converts raw markdown content to sanitized HTML for display.
- **Edit_Window**: The 15-minute period after post creation during which the author can edit the post content.

## Requirements

### Requirement 1: Inline Image Insertion During Composition

**User Story:** As a post author, I want to insert images at any position within my post content, so that I can place images between paragraphs, after headings, or wherever they fit the narrative flow.

#### Acceptance Criteria

1. WHEN the author clicks the "Insert Image" button in the Post_Composer toolbar, THE Post_Composer SHALL open a file picker accepting image types `image/jpeg`, `image/png`, `image/gif`, and `image/webp`.
2. WHEN the author selects an image file, THE Post_Composer SHALL upload the file to the Staging_System via `POST /api/temp-upload` and receive a Commit_Token and Staging_URL.
3. WHEN the Staging_System returns a successful upload response, THE Post_Composer SHALL insert markdown image syntax `![](previewUrl)` at the current cursor position in the textarea.
4. WHEN the author has no cursor position in the textarea, THE Post_Composer SHALL append the markdown image syntax at the end of the content.
5. WHEN the author drags an image file onto the textarea, THE Post_Composer SHALL upload the file to the Staging_System and insert markdown image syntax at the drop position.
6. WHEN the author pastes image data from the clipboard, THE Post_Composer SHALL upload the pasted image to the Staging_System and insert markdown image syntax at the cursor position.
7. IF the Staging_System upload fails, THEN THE Post_Composer SHALL display an error message to the author and not insert any markdown image syntax.
8. WHILE an image upload is in progress, THE Post_Composer SHALL display a loading indicator at the insertion point.

### Requirement 2: Inline Image Limit

**User Story:** As a platform operator, I want to enforce a reasonable limit on the number of inline images per post, so that the system is not abused with excessive image uploads.

#### Acceptance Criteria

1. THE Post_Composer SHALL allow a maximum of 20 Inline_Images per post.
2. WHEN the post content already contains 20 Inline_Images, THE Post_Composer SHALL disable the "Insert Image" button and display a message indicating the limit has been reached.
3. WHEN the post content already contains 20 Inline_Images and the author attempts to drag or paste an image, THE Post_Composer SHALL reject the insertion and display a message indicating the limit has been reached.
4. THE Post_Creation_API SHALL reject posts containing more than 20 Staging_URLs in the content with an appropriate error code.

### Requirement 3: Image Preview During Composition

**User Story:** As a post author, I want to see my inline images rendered in the preview panel while composing, so that I can verify image placement and appearance before publishing.

#### Acceptance Criteria

1. WHEN the author toggles the preview panel in the Post_Composer, THE Content_Parser SHALL render markdown image syntax `![alt text](url)` as `<img>` tags in the preview HTML.
2. WHEN the preview HTML contains `<img>` tags with Staging_URLs, THE Post_Composer preview panel SHALL load and display the images from the Staging_System preview endpoints.
3. WHEN a staged image has expired (Staging_System returns HTTP 410), THE Post_Composer preview panel SHALL display a placeholder indicating the image is no longer available.
4. THE Content_Parser SHALL render inline images with `loading="lazy"` and `style="max-width: 100%"` attributes for performance and responsive display.

### Requirement 4: Alt Text Support

**User Story:** As a post author, I want to add alt text to my inline images, so that the images are accessible to users with screen readers and comply with accessibility standards.

#### Acceptance Criteria

1. THE Post_Composer SHALL provide a mechanism for the author to edit the alt text of an inserted Inline_Image.
2. WHEN the author edits the alt text, THE Post_Composer SHALL update the markdown image syntax from `![old alt](url)` to `![new alt](url)` in the textarea content.
3. WHEN an Inline_Image has no alt text, THE Content_Parser SHALL render the `<img>` tag with an empty `alt=""` attribute.
4. WHEN an Inline_Image has alt text, THE Content_Parser SHALL render the `<img>` tag with the `alt` attribute set to the provided text.

### Requirement 5: Image Commit on Publish

**User Story:** As a platform operator, I want staged images to be committed to permanent vault storage when a post is published, so that images are served from durable storage and staging resources are freed.

#### Acceptance Criteria

1. WHEN a post is submitted for creation, THE Post_Creation_API SHALL scan the post content for all Staging_URLs matching the pattern `/api/temp-upload/{commitToken}/preview`.
2. WHEN Staging_URLs are found in the content, THE URL_Rewriter SHALL commit each staged file to the hub's Vault_Container using the Staging_System commit endpoint.
3. WHEN a staged file is committed, THE URL_Rewriter SHALL replace the Staging_URL in the post content with the Permanent_URL of the committed file.
4. WHEN all Staging_URLs have been committed and rewritten, THE Post_Creation_API SHALL save the post with the rewritten content.
5. WHEN a staged file commit fails for one image, THE Post_Creation_API SHALL roll back all committed images from that post and return an error to the client.
6. THE Post_Creation_API SHALL store a Media_Attachment_Record in the `mediaAttachments` array for each committed Inline_Image, containing the file ID, Permanent_URL, MIME type, file size, dimensions, and alt text.
7. IF a Staging_URL in the content references an expired staged file (Staging_System returns HTTP 410), THEN THE Post_Creation_API SHALL return an error indicating the image has expired and the author should re-upload.

### Requirement 6: Image Processing at Commit Time

**User Story:** As a platform operator, I want inline images to be optionally processed (resized, format-converted, EXIF-stripped) when committed, so that images are optimized for web delivery and user privacy is protected.

#### Acceptance Criteria

1. WHEN committing an Inline_Image, THE URL_Rewriter SHALL pass default processing parameters to the Staging_System commit endpoint to strip EXIF metadata.
2. WHEN committing an Inline_Image larger than 4096 pixels in either dimension, THE URL_Rewriter SHALL pass processing parameters to resize the image to fit within 4096x4096 pixels while preserving the aspect ratio.
3. THE Image_Processor SHALL preserve the original image format unless the author or system specifies a different output format.

### Requirement 7: Post Editing with Inline Images

**User Story:** As a post author, I want to add new inline images when editing a post within the 15-minute edit window, so that I can improve my post with additional visual content after publishing.

#### Acceptance Criteria

1. WHILE the Edit_Window has not expired, THE Post_Edit_API SHALL accept edited content containing new Staging_URLs.
2. WHEN edited content contains new Staging_URLs, THE URL_Rewriter SHALL commit the new staged files and rewrite the URLs, following the same process as post creation.
3. WHEN edited content removes previously committed Inline_Images (their Permanent_URLs are no longer present in the content), THE Post_Edit_API SHALL remove the corresponding Media_Attachment_Records from the `mediaAttachments` array.
4. THE Post_Edit_API SHALL not re-commit or re-process Permanent_URLs that are already present in the content from the original post.

### Requirement 8: Backward Compatibility with Grid-Based Attachments

**User Story:** As a platform user, I want existing posts with grid-based media attachments to continue displaying correctly, so that no content is lost or broken by the inline image feature.

#### Acceptance Criteria

1. WHEN a post has `mediaAttachments` entries but no Inline_Images in the `formattedContent`, THE Post_Card SHALL render the media attachments in the existing grid layout below the text content.
2. WHEN a post has Inline_Images in the `formattedContent` and corresponding Media_Attachment_Records in `mediaAttachments`, THE Post_Card SHALL render the images inline within the HTML content and not display a separate media grid.
3. THE Post_Card SHALL determine the rendering mode (grid vs. inline) based on whether the `formattedContent` contains `<img>` tags with Permanent_URLs.
4. THE `IBasePostData` interface SHALL retain the existing `mediaAttachments` field without breaking changes.

### Requirement 9: Inline Image Rendering in Post Display

**User Story:** As a post reader, I want inline images to display responsively within the post content, so that images look good on all screen sizes and do not break the layout.

#### Acceptance Criteria

1. THE Content_Parser SHALL render Inline_Images with a maximum width of 100% of the post content area.
2. THE Content_Parser SHALL render Inline_Images with `loading="lazy"` to defer loading of off-screen images.
3. THE Content_Parser SHALL render Inline_Images with explicit `width` and `height` attributes when dimensions are available in the Media_Attachment_Record, to prevent layout shift during loading.
4. WHEN a post reader clicks on an Inline_Image in the Post_Card, THE Post_Card SHALL display the image at its full resolution (this is a future enhancement placeholder; initial implementation renders images inline without click-to-expand).

### Requirement 10: Vault Container Management for Hub Images

**User Story:** As a platform architect, I want each hub to have a dedicated vault container for storing committed post images, so that images are organized by hub and access control is consistent.

#### Acceptance Criteria

1. WHEN a post with Inline_Images is created in a hub, THE Post_Creation_API SHALL commit the images to the hub's dedicated Vault_Container.
2. IF the hub does not yet have a dedicated Vault_Container for post images, THEN THE Post_Creation_API SHALL create one using the Staging_System commit endpoint's `createContainer` option with public visibility.
3. THE Vault_Container for hub post images SHALL use the naming convention `hub-{hubId}-images`.
4. WHEN a post with Inline_Images is created outside of a hub context (top-level post), THE Post_Creation_API SHALL commit the images to a user-scoped Vault_Container with the naming convention `user-{userId}-post-images`.

### Requirement 11: Content Sanitization for Inline Images

**User Story:** As a security engineer, I want inline image URLs in post content to be validated and sanitized, so that malicious URLs cannot be injected into posts.

#### Acceptance Criteria

1. THE Post_Creation_API SHALL only accept Staging_URLs matching the exact pattern `/api/temp-upload/{uuid}/preview` where `{uuid}` is a valid UUID v4 format.
2. THE Post_Creation_API SHALL reject post content containing external image URLs that are not Staging_URLs or Permanent_URLs.
3. THE Content_Parser SHALL sanitize `<img>` tag `src` attributes to only allow Permanent_URLs from the vault serving endpoints.
4. IF post content contains image markdown with a URL that is neither a Staging_URL nor a Permanent_URL, THEN THE Post_Creation_API SHALL strip the image markdown from the content before saving.

### Requirement 12: Staging URL Cleanup on Discard

**User Story:** As a platform operator, I want staged images to be cleaned up when a post composition is abandoned, so that staging storage is not consumed by unused uploads.

#### Acceptance Criteria

1. WHEN the author cancels or navigates away from the Post_Composer without submitting, THE Post_Composer SHALL call the Staging_System discard endpoint (`DELETE /api/temp-upload/{commitToken}`) for each uploaded image.
2. IF the Post_Composer cannot reach the discard endpoint (network error), THEN THE Staging_System's existing cleanup scheduler SHALL remove the expired staged files automatically.
3. THE Staging_System's default TTL of 1 hour SHALL provide sufficient time for post composition while ensuring abandoned uploads are cleaned up.

### Requirement 13: Image Crop and Resize During Composition

**User Story:** As a post author, I want to crop or resize an image before inserting it into my post, so that I can control the visual presentation without using external tools.

#### Acceptance Criteria

1. WHEN the author inserts an image, THE Post_Composer SHALL provide an optional crop/resize dialog before inserting the markdown syntax.
2. WHEN the author crops or resizes an image, THE Post_Composer SHALL upload the modified image data to the Staging_System (not the original file).
3. THE crop/resize dialog SHALL support free-form aspect ratio cropping.
4. THE crop/resize dialog SHALL display a preview of the cropped/resized result before confirming.

### Requirement 14: Shared Interface Placement

**User Story:** As a library maintainer, I want inline image interfaces and types to be defined in the correct workspace packages, so that shared types live in the appropriate libraries and platform-specific code lives in the corresponding platform libraries.

#### Acceptance Criteria

1. THE inline image URL pattern constants and validation utilities SHALL be defined in `brighthub-lib` so that both frontend and backend can consume them.
2. THE URL_Rewriter implementation and post creation/edit image processing logic SHALL be defined in `brightchain-api-lib` since they depend on Node.js and the Staging_System service.
3. THE Post_Composer inline image insertion logic and crop/resize dialog SHALL be defined in `brighthub-react-components` since they are React UI components.
4. THE `IBasePostData` interface modifications SHALL remain in `brighthub-lib` alongside the existing interface definition.
