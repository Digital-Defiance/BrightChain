# Implementation Plan: BrightHub Post Images (Inline)

## Overview

This plan implements inline image support for BrightHub posts, replacing the grid-based media attachment model. Work proceeds bottom-up: shared utilities first (brighthub-lib), then backend services (brightchain-api-lib), then frontend components (brighthub-react-components). Each layer builds on the previous, and checkpoints ensure incremental validation.

## Tasks

- [x] 1. Shared URL utilities and constants (brighthub-lib)
  - [x] 1.1 Create `brighthub-lib/src/lib/utils/inlineImageUrls.ts` with URL pattern constants and utility functions
    - Define `STAGING_URL_PATTERN`, `PERMANENT_URL_PATTERN`, `MARKDOWN_IMAGE_PATTERN` regexes
    - Define `MAX_INLINE_IMAGES = 20`, `INLINE_IMAGE_MIME_TYPES`, `MAX_IMAGE_DIMENSION = 4096`
    - Implement `extractStagingTokens(content)`, `extractPermanentFileIds(content)`, `countInlineImages(content)`
    - Implement `isStagingUrl(url)`, `isPermanentUrl(url)`, `stripExternalImageUrls(content)`
    - Export all from the brighthub-lib barrel file
    - _Requirements: 2.1, 5.1, 11.1, 11.2, 11.4, 14.1_

  - [x] 1.2 Write property tests for `extractStagingTokens`
    - **Property 6: Staging URL extraction correctness**
    - **Validates: Requirements 5.1**
    - Test file: `brighthub-lib/src/lib/utils/__tests__/inlineImageUrls.property.spec.ts`
    - Use `fast-check` to generate content with mixed staging, permanent, and arbitrary URLs
    - Verify only staging UUID tokens are returned

  - [x] 1.3 Write property tests for `isStagingUrl` validation
    - **Property 12: Staging URL validation**
    - **Validates: Requirements 11.1**
    - Test file: `brighthub-lib/src/lib/utils/__tests__/inlineImageUrls.property.spec.ts`
    - Use `fast-check` to generate valid UUID v4 strings and near-miss strings
    - Verify `isStagingUrl` returns true only for exact pattern matches

  - [x] 1.4 Write property tests for `stripExternalImageUrls`
    - **Property 13: External URL stripping**
    - **Validates: Requirements 11.2, 11.4**
    - Test file: `brighthub-lib/src/lib/utils/__tests__/inlineImageUrls.property.spec.ts`
    - Verify staging and permanent image markdown preserved, external URLs stripped, non-image text unchanged

  - [x] 1.5 Write property test for vault container naming convention
    - **Property 11: Vault container naming convention**
    - **Validates: Requirements 10.3, 10.4**
    - Test file: `brighthub-lib/src/lib/utils/__tests__/inlineImageUrls.property.spec.ts`
    - Verify `hub-{hubId}-images` and `user-{userId}-post-images` naming is deterministic

  - [x] 1.6 Write unit tests for URL utility edge cases
    - Test file: `brighthub-lib/src/lib/utils/__tests__/inlineImageUrls.spec.ts`
    - Test `countInlineImages` with 0, 1, 20, 21 images
    - Test `isStagingUrl` / `isPermanentUrl` with empty string, partial match, wrong UUID version
    - Test `extractStagingTokens` with no matches, duplicates, mixed content
    - _Requirements: 2.1, 5.1, 11.1_

- [x] 2. Add new error codes to PostErrorCode enum (brighthub-lib)
  - [x] 2.1 Add `TooManyInlineImages`, `StagedImageExpired`, and `ImageCommitFailed` to `PostErrorCode` in `brighthub-lib/src/lib/interfaces/post-service.ts`
    - `TooManyInlineImages = 'TOO_MANY_INLINE_IMAGES'`
    - `StagedImageExpired = 'STAGED_IMAGE_EXPIRED'`
    - `ImageCommitFailed = 'IMAGE_COMMIT_FAILED'`
    - _Requirements: 2.4, 5.5, 5.7_

- [x] 3. Update `parsePostContent` for inline image rendering (brighthub-lib)
  - [x] 3.1 Modify `parsePostContent()` to enhance `<img>` tags with `loading="lazy"` and `style="max-width: 100%"` attributes
    - Add a post-processing phase after markdown parsing
    - Ensure `alt=""` is present when alt text is empty
    - Do not modify existing markdown-to-HTML conversion logic
    - _Requirements: 3.1, 3.4, 4.3, 4.4, 9.1, 9.2_

  - [x] 3.2 Write property test for `parsePostContent` image rendering
    - **Property 4: Markdown image rendering with correct attributes**
    - **Validates: Requirements 3.1, 3.4, 4.3, 4.4, 9.1, 9.2**
    - Test file: `brighthub-lib/src/lib/__tests__/brighthub-lib.inline-images.property.spec.ts`
    - Use `fast-check` to generate markdown image syntax with various alt texts and URLs
    - Verify output HTML contains `<img>` with correct `src`, `alt`, `loading="lazy"`, and `style="max-width: 100%"`

- [x] 4. Checkpoint — Shared library validation
  - Ensure all brighthub-lib tests pass (`npx nx test brighthub-lib`), ask the user if questions arise.

- [x] 5. Implement URL Rewriter service (brightchain-api-lib)
  - [x] 5.1 Create `brightchain-api-lib/src/lib/services/brighthub/urlRewriterService.ts`
    - Implement `UrlRewriterService` class with `rewriteContent()` method
    - Strip external image URLs, extract staging tokens, validate count ≤ 20
    - For each staging token: read record, check expiry, read file, compute processing params (EXIF strip, resize if >4096px), commit to vault, build media attachment record
    - Replace staging URLs with `/api/post-images/{fileId}` permanent URLs
    - Implement rollback on partial commit failure (best-effort delete of committed images)
    - Handle vault container creation: `hub-{hubId}-images` for hub posts, `user-{userId}-post-images` for top-level posts
    - Cache container ID after first commit for subsequent images in same post
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 10.1, 10.2, 10.3, 10.4_

  - [x] 5.2 Write property test for backend image count limit
    - **Property 3: Backend image count limit enforcement**
    - **Validates: Requirements 2.4**
    - Test file: `brightchain-api-lib/src/lib/services/brighthub/__tests__/urlRewriterService.property.spec.ts`
    - Verify rewriter accepts content with ≤ 20 staging URLs and throws `TooManyInlineImages` for > 20

  - [x] 5.3 Write property test for URL rewriting correctness
    - **Property 7: URL rewriting produces correct permanent URLs and media attachments**
    - **Validates: Requirements 5.3, 5.6**
    - Test file: `brightchain-api-lib/src/lib/services/brighthub/__tests__/urlRewriterService.property.spec.ts`
    - Mock staging/vault services; verify rewritten content has zero staging URLs, N permanent URLs, and N media attachment records

  - [x] 5.4 Write property test for image processing parameters
    - **Property 8: Image processing parameters correctness**
    - **Validates: Requirements 6.1, 6.2, 6.3**
    - Test file: `brightchain-api-lib/src/lib/services/brighthub/__tests__/urlRewriterService.property.spec.ts`
    - Verify EXIF strip always true, resize only when dimension > 4096, aspect ratio preserved, format unchanged

  - [x] 5.5 Write unit tests for URL Rewriter service
    - Test file: `brightchain-api-lib/src/lib/services/brighthub/__tests__/urlRewriterService.spec.ts`
    - Test happy path with mocked dependencies
    - Test rollback on partial commit failure (fail on 2nd of 3 images)
    - Test expired staging file handling
    - Test container creation for hub context vs user context
    - _Requirements: 5.1–5.7, 6.1–6.3, 10.1–10.4_

- [x] 6. Update TextFormatter sanitization (brightchain-api-lib)
  - [x] 6.1 Modify `TextFormatter` `SANITIZE_CONFIG` to allow `<img>` tags with whitelisted attributes
    - Add `img` to `allowedTags`
    - Add `img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'style']` to `allowedAttributes`
    - Add `transformTags` for `img` that validates `src` against `isPermanentUrl()` — strip tag if URL is not a permanent URL
    - Ensure `loading="lazy"` and `style="max-width: 100%"` are set on allowed img tags
    - _Requirements: 11.3, 14.2_

  - [x] 6.2 Write unit tests for TextFormatter inline image sanitization
    - Test file: `brightchain-api-lib/src/lib/services/brighthub/__tests__/textFormatter.inline-images.spec.ts`
    - Test that img tags with permanent URLs are preserved
    - Test that img tags with external URLs are stripped
    - Test that img tags with staging URLs are stripped (only permanent allowed in formatted output)
    - _Requirements: 11.3_

- [x] 7. Implement PostImageController serving endpoint (brightchain-api-lib)
  - [x] 7.1 Create `brightchain-api-lib/src/lib/controllers/api/brighthub/postImageController.ts`
    - Implement `GET /api/post-images/:fileId` route
    - Look up file in vault by fileId, return file bytes with correct `Content-Type`
    - Set `Cache-Control: public, max-age=31536000, immutable` and `ETag` headers
    - Return 404 if file not found
    - Apply vault access audit middleware to the route
    - _Requirements: 9.1, 14.2_

  - [x] 7.2 Register the PostImageController route in the Express app router
    - Wire the new route into the existing API route configuration
    - _Requirements: 14.2_

  - [x] 7.3 Write unit tests for PostImageController
    - Test file: `brightchain-api-lib/src/lib/controllers/api/brighthub/__tests__/postImageController.spec.ts`
    - Test successful image serving with correct headers
    - Test 404 for unknown fileId
    - Test that vault access audit middleware is applied
    - _Requirements: 9.1_

- [x] 8. Integrate URL Rewriter into PostService (brightchain-api-lib)
  - [x] 8.1 Update `PostService.createPost()` to call URL Rewriter before formatting
    - Strip external image URLs from content
    - Validate inline image count ≤ 20
    - Call `urlRewriter.rewriteContent()` to commit staged images and rewrite URLs
    - Use rewritten content for formatting
    - Store returned `mediaAttachments` on the post record
    - _Requirements: 5.1–5.6, 10.1, 10.2_

  - [x] 8.2 Update `PostService.editPost()` to handle new and removed inline images
    - Extract staging URLs (new images) and permanent URLs (existing images) from edited content
    - Call URL Rewriter for new staging URLs only
    - Merge new media attachments with retained ones
    - Remove media attachment records for images no longer in content
    - Do not re-commit or re-process existing permanent URLs
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 8.3 Write property test for edit metadata cleanup
    - **Property 9: Edit removes metadata for deleted images**
    - **Validates: Requirements 7.3**
    - Test file: `brightchain-api-lib/src/lib/services/brighthub/__tests__/urlRewriterService.property.spec.ts`
    - Verify that after edit, mediaAttachments contains only records for permanent URLs still in content

  - [x] 8.4 Write property test for edit skipping permanent URLs
    - **Property 10: Edit does not re-commit permanent URLs**
    - **Validates: Requirements 7.4**
    - Test file: `brightchain-api-lib/src/lib/services/brighthub/__tests__/urlRewriterService.property.spec.ts`
    - Verify exactly K commit calls for K new staging URLs, zero for existing permanent URLs

  - [x] 8.5 Write unit tests for PostService inline image integration
    - Test file: `brightchain-api-lib/src/lib/services/brighthub/__tests__/postService.inline-images.spec.ts`
    - Test `createPost` with inline images end-to-end (mocked URL Rewriter)
    - Test `editPost` adding new images, removing images, and unchanged images
    - _Requirements: 5.1–5.6, 7.1–7.4_

- [x] 9. Checkpoint — Backend validation
  - Ensure all brightchain-api-lib tests pass (`npx nx test brightchain-api-lib`), ask the user if questions arise.

- [x] 10. Refactor PostComposer for inline image insertion (brighthub-react-components)
  - [x] 10.1 Remove grid-based media attachment flow from PostComposer
    - Remove `mediaFiles` state, `mediaPreviews` state, `handleFileSelect` grid logic
    - Remove `MAX_ATTACHMENTS = 4` constant
    - Remove grid-based media preview rendering block
    - Remove `PostComposerSubmitData.mediaFiles` field
    - _Requirements: 14.3_

  - [x] 10.2 Add `stagingApi` prop and inline image insertion state to PostComposer
    - Add `stagingApi?: { stageFile, discardFile }` to `PostComposerProps`
    - Add `stagedTokens` state (string array) for cleanup tracking
    - Add `uploadingCount` state for loading indicators
    - Import `countInlineImages`, `MAX_INLINE_IMAGES` from brighthub-lib utils
    - _Requirements: 1.1, 1.2, 12.1, 14.3_

  - [x] 10.3 Implement toolbar button image insertion flow
    - On "Insert Image" click: open file picker (`image/jpeg,image/png,image/gif,image/webp`)
    - On file select: optionally open `ImageCropDialog`, then upload to staging API
    - On upload success: insert `![](previewUrl)` at current cursor position (or append if no cursor)
    - Show loading placeholder `![Uploading...](...)` during upload
    - Check `countInlineImages(content) < MAX_INLINE_IMAGES` before insertion; disable button and show tooltip at limit
    - On upload failure: show error snackbar, remove placeholder, do not insert markdown
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 2.1, 2.2_

  - [x] 10.4 Implement drag-and-drop image insertion
    - Add `onDrop` handler on the textarea
    - Extract image files from `DataTransfer`, upload each to staging API
    - Insert markdown at drop position
    - Respect image limit (reject with snackbar if at 20)
    - _Requirements: 1.5, 2.3_

  - [x] 10.5 Implement clipboard paste image insertion
    - Add `onPaste` handler on the textarea
    - Check `clipboardData.items` for image types, upload to staging API
    - Insert markdown at cursor position
    - Respect image limit (reject with snackbar if at 20)
    - _Requirements: 1.6, 2.3_

  - [x] 10.6 Implement alt text editing mechanism
    - Provide a way for the author to edit alt text of an inserted inline image
    - Update markdown from `![old alt](url)` to `![new alt](url)` in the content string
    - _Requirements: 4.1, 4.2_

  - [x] 10.7 Implement staging cleanup on discard/navigate away
    - On cancel or unmount: call `stagingApi.discardFile(token)` for each token in `stagedTokens`
    - Silent failure on discard errors (staging cleanup scheduler handles expiry)
    - _Requirements: 12.1, 12.2_

  - [x] 10.8 Write property test for markdown image insertion at cursor position
    - **Property 1: Markdown image insertion at cursor position**
    - **Validates: Requirements 1.3, 1.4**
    - Test file: `brighthub-react-components/src/lib/posts/__tests__/PostComposer.inline-images.property.spec.tsx`
    - Use `fast-check` to generate content strings and cursor positions
    - Verify inserted markdown appears at correct position with surrounding content unchanged

  - [x] 10.9 Write property test for frontend image count limit
    - **Property 2: Frontend image count limit enforcement**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - Test file: `brighthub-react-components/src/lib/posts/__tests__/PostComposer.inline-images.property.spec.tsx`
    - Verify insertion allowed when count < 20, rejected when count ≥ 20

  - [x] 10.10 Write property test for alt text update
    - **Property 5: Alt text update preserves URL and surrounding content**
    - **Validates: Requirements 4.2**
    - Test file: `brighthub-react-components/src/lib/posts/__tests__/PostComposer.inline-images.property.spec.tsx`
    - Verify URL unchanged, alt text replaced, surrounding content preserved

  - [x] 10.11 Write unit tests for PostComposer inline image features
    - Test file: `brighthub-react-components/src/lib/posts/__tests__/PostComposer.inline-images.spec.tsx`
    - Test toolbar button opens file picker
    - Test drag-and-drop triggers upload
    - Test paste triggers upload
    - Test loading indicator during upload
    - Test error display on upload failure
    - Test discard on cancel/unmount
    - Test image limit disables button at 20
    - _Requirements: 1.1–1.8, 2.1–2.3, 12.1_

- [x] 11. Create ImageCropDialog component (brighthub-react-components)
  - [x] 11.1 Create `brighthub-react-components/src/lib/posts/ImageCropDialog.tsx`
    - Install `react-easy-crop` in brighthub-react-components if not already present
    - Implement `ImageCropDialog` with free-form aspect ratio (`cropShape="rect"`, no fixed aspect)
    - Create object URL from image file for crop preview
    - On confirm: use canvas to extract cropped region as Blob, pass to `onCropComplete`
    - Provide "Skip" button that calls `onSkip` to bypass cropping
    - Display preview of cropped result before confirming
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 11.2 Write unit tests for ImageCropDialog
    - Test file: `brighthub-react-components/src/lib/posts/__tests__/ImageCropDialog.spec.tsx`
    - Test dialog renders with free-form aspect ratio
    - Test skip button bypasses cropping
    - Test confirm calls `onCropComplete` with a Blob
    - _Requirements: 13.1, 13.3, 13.4_

- [x] 12. Simplify PostCard for inline image rendering (brighthub-react-components)
  - [x] 12.1 Remove the grid-based media attachment rendering block from PostCard
    - Remove the `{post.mediaAttachments.length > 0 && ...}` grid rendering section
    - Inline images are already rendered via `dangerouslySetInnerHTML={{ __html: post.formattedContent }}`
    - No separate media grid needed — images appear inline from the HTML content
    - _Requirements: 8.2, 8.3, 14.3_

  - [x] 12.2 Write unit tests for PostCard inline image rendering
    - Test file: `brighthub-react-components/src/lib/posts/__tests__/PostCard.inline-images.spec.tsx`
    - Test that PostCard renders inline images from `formattedContent` HTML
    - Test that no separate media grid is rendered for posts with inline images
    - _Requirements: 8.2, 8.3, 9.1_

- [x] 13. Checkpoint — Frontend validation
  - Ensure all brighthub-react-components tests pass (`npx nx test brighthub-react-components`), ask the user if questions arise.

- [x] 14. Final checkpoint — Full integration validation
  - Run all three library test suites: `npx nx run-many -t test -p brighthub-lib brightchain-api-lib brighthub-react-components`
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each layer boundary
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- `fast-check` is used for all property-based tests; Jest in brighthub-lib and brightchain-api-lib, Vitest in brighthub-react-components
- `react-easy-crop` may need to be installed in brighthub-react-components (already available in brightchat-react-components)
- The vault access audit middleware is pre-built and should be applied to the PostImageController route
