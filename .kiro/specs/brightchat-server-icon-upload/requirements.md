# Requirements Document

## Introduction

BrightChat servers currently accept an `iconUrl` as a plain text string — users must manually paste an external URL. This feature replaces that workflow with a proper image upload experience: a frontend crop/trim tool, server-side image processing, and storage of the icon as a public CBL asset within a dedicated Digital Burnbag vault container per server. The result is a self-hosted, immutable icon served from the platform's own storage layer, eliminating reliance on external image hosts.

## Glossary

- **Server_Icon**: The image displayed in the Server_Rail and Server_Settings_Panel representing a BrightChat server. Currently an optional external URL; this feature makes it an uploaded, cropped, and platform-hosted image.
- **Icon_Vault_Container**: A public Digital Burnbag vault container created per server to hold its icon asset (and future server assets like banners). Uses `VaultVisibility.Public` so the icon is readable by anyone.
- **Icon_Asset**: The processed (cropped, resized) image file stored as a Digital Burnbag file within the Icon_Vault_Container. Referenced by its file metadata ID.
- **Icon_Crop_Dialog**: A frontend dialog component that allows users to select an image file, crop it to a square aspect ratio with pan/zoom controls, and preview the result before uploading.
- **Server_Icon_API**: New REST API endpoints on the server controller for uploading, serving, and removing server icons.
- **Image_Processing**: Server-side resizing and format normalization of uploaded icon images using the `sharp` library. Outputs a 256×256 PNG.
- **Burnbag_Upload_Pipeline**: The existing Digital Burnbag chunked upload flow (init → chunk → finalize) used to store the processed icon in the vault.
- **Icon_Serving_Endpoint**: A public GET endpoint that retrieves the icon image from the vault and serves it with appropriate cache headers.
- **Server_Rail**: The 72px vertical icon strip in the BrightChat layout that displays server icons (existing component, no changes needed to rendering logic).
- **Server_Settings_Panel**: The settings drawer for server configuration (existing component, will be modified to replace the text field with the upload UI).
- **Create_Server_Dialog**: The dialog for creating new servers (existing component, will be modified to replace the text field with the upload UI).

## Requirements

### Requirement 1: Server Data Model Extension

**User Story:** As a developer, I want the server data model to track icon storage metadata alongside the display URL, so that the platform can manage icon lifecycle through the vault system.

#### Acceptance Criteria

1. THE `IServer` interface SHALL add an optional `iconAssetId: TId` field that references the Digital Burnbag file metadata ID of the uploaded icon
2. THE `IServer` interface SHALL add an optional `iconVaultContainerId: TId` field that references the vault container holding the server's icon
3. THE existing `iconUrl` field SHALL remain on `IServer` for backward compatibility and SHALL be populated with the serving endpoint URL when an icon is uploaded
4. THE `IServerUpdate` interface SHALL add optional `iconAssetId` and `iconVaultContainerId` fields
5. WHEN a server has an `iconAssetId`, THE `iconUrl` field SHALL point to the icon serving endpoint: `/api/servers/{serverId}/icon`

### Requirement 2: Server Icon Upload API

**User Story:** As a server owner or admin, I want to upload an image as my server's icon through the API, so that the icon is stored securely on the platform.

#### Acceptance Criteria

1. WHEN a POST request with a multipart/form-data body containing an image file is sent to `/api/servers/:serverId/icon`, THE Server_Icon_API SHALL accept the upload if the requesting user has owner or admin role
2. THE Server_Icon_API SHALL reject uploads where the file MIME type is not one of: `image/png`, `image/jpeg`, `image/gif`, `image/webp`
3. THE Server_Icon_API SHALL reject uploads where the raw file size exceeds 5MB
4. WHEN the upload is accepted, THE Server_Icon_API SHALL resize the image to 256×256 pixels (square, cover-fit) and convert it to PNG format using the `sharp` library
5. WHEN the image is processed, THE Server_Icon_API SHALL create or reuse the server's Icon_Vault_Container (named `brightchat-server-{serverId}-assets`, `VaultVisibility.Public`)
6. WHEN the vault container is ready, THE Server_Icon_API SHALL store the processed image via the Burnbag_Upload_Pipeline and update the server's `iconAssetId`, `iconVaultContainerId`, and `iconUrl` fields
7. IF a previous icon exists, THE Server_Icon_API SHALL replace the old file in the vault (upload new version) rather than creating additional files
8. THE Server_Icon_API SHALL return the updated `IServer` object in the response
9. IF the requesting user does not have owner or admin role, THE Server_Icon_API SHALL return a 403 Forbidden error

### Requirement 3: Server Icon Serving

**User Story:** As any user viewing a server, I want the server icon to load quickly from a platform URL, so that I don't depend on external image hosts.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/servers/:serverId/icon`, THE Icon_Serving_Endpoint SHALL return the icon image bytes with `Content-Type: image/png`
2. THE Icon_Serving_Endpoint SHALL set `Cache-Control: public, max-age=86400, immutable` to enable browser and CDN caching
3. THE Icon_Serving_Endpoint SHALL set an `ETag` header derived from the `iconAssetId` to support conditional requests
4. IF the server has no uploaded icon (`iconAssetId` is undefined), THE Icon_Serving_Endpoint SHALL return a 404 Not Found response
5. THE Icon_Serving_Endpoint SHALL NOT require authentication (icons are public assets)
6. IF the request includes an `If-None-Match` header matching the current `ETag`, THE Icon_Serving_Endpoint SHALL return 304 Not Modified

### Requirement 4: Server Icon Removal

**User Story:** As a server owner or admin, I want to remove the server icon, so that the server reverts to the default letter avatar.

#### Acceptance Criteria

1. WHEN a DELETE request is sent to `/api/servers/:serverId/icon`, THE Server_Icon_API SHALL clear the server's `iconAssetId`, `iconVaultContainerId`, and `iconUrl` fields if the requesting user has owner or admin role
2. WHEN the icon is removed, THE Server_Icon_API SHALL delete the icon file from the vault container
3. THE Server_Icon_API SHALL return the updated `IServer` object with `iconUrl` set to undefined
4. IF the requesting user does not have owner or admin role, THE Server_Icon_API SHALL return a 403 Forbidden error
5. IF the server has no uploaded icon, THE Server_Icon_API SHALL return a 404 Not Found response

### Requirement 5: Frontend Icon Crop Dialog

**User Story:** As a server owner or admin, I want to crop and preview my server icon before uploading, so that I can ensure it looks good at the circular display size.

#### Acceptance Criteria

1. THE Icon_Crop_Dialog SHALL provide a file picker that accepts image files (`image/png`, `image/jpeg`, `image/gif`, `image/webp`)
2. THE Icon_Crop_Dialog SHALL display the selected image in a crop area with a circular crop guide and 1:1 (square) aspect ratio lock
3. THE Icon_Crop_Dialog SHALL provide zoom controls (slider or pinch) allowing the user to zoom in/out on the image within the crop area
4. THE Icon_Crop_Dialog SHALL provide pan controls allowing the user to reposition the image within the crop area by dragging
5. THE Icon_Crop_Dialog SHALL display a circular preview of the cropped result at the actual display size (48px, matching Server_Rail icon size)
6. WHEN the user confirms the crop, THE Icon_Crop_Dialog SHALL produce a cropped image Blob and pass it to the upload callback
7. WHEN the user cancels, THE Icon_Crop_Dialog SHALL close without uploading and discard the selected image
8. THE Icon_Crop_Dialog SHALL display a loading indicator while the upload is in progress
9. IF the upload fails, THE Icon_Crop_Dialog SHALL display the error message inline without closing the dialog
10. THE Icon_Crop_Dialog SHALL reject files larger than 5MB before sending to the server, displaying a client-side validation error

### Requirement 6: Create Server Dialog Integration

**User Story:** As a user creating a new server, I want to optionally upload a server icon during creation, so that my server has a visual identity from the start.

#### Acceptance Criteria

1. THE Create_Server_Dialog SHALL replace the existing `iconUrl` text field with an icon upload area that opens the Icon_Crop_Dialog
2. THE icon upload area SHALL display a placeholder avatar (showing the first letter of the server name) when no icon is selected
3. WHEN the user selects and crops an icon, THE Create_Server_Dialog SHALL display the cropped preview in the upload area
4. WHEN the server is created, THE Create_Server_Dialog SHALL first create the server (without icon), then upload the icon via the Server_Icon_API if one was selected
5. IF the server creation succeeds but the icon upload fails, THE Create_Server_Dialog SHALL still close and navigate to the new server, displaying a non-blocking warning that the icon upload failed
6. THE icon upload SHALL remain optional — servers can be created without an icon

### Requirement 7: Server Settings Panel Integration

**User Story:** As a server owner or admin, I want to change or remove the server icon from the settings panel, so that I can update the server's visual identity.

#### Acceptance Criteria

1. THE Server_Settings_Panel Overview tab SHALL replace the existing `iconUrl` text field with an icon display area showing the current icon or a letter avatar placeholder
2. THE icon display area SHALL include a "Change Icon" button that opens the Icon_Crop_Dialog
3. THE icon display area SHALL include a "Remove Icon" button (visible only when an icon is set) that calls the icon removal API
4. WHEN a new icon is uploaded via the Icon_Crop_Dialog, THE Server_Settings_Panel SHALL immediately update the displayed icon preview
5. WHEN the icon is removed, THE Server_Settings_Panel SHALL immediately revert to the letter avatar placeholder
6. THE "Remove Icon" action SHALL display a confirmation prompt before proceeding

### Requirement 8: Internationalization

**User Story:** As a user in any supported locale, I want all icon upload UI text to be properly translated, so that the feature is accessible in my language.

#### Acceptance Criteria

1. THE feature SHALL add i18n string keys for all new UI text: file picker labels, crop dialog title/buttons, upload progress, error messages, remove confirmation, and validation messages
2. THE feature SHALL provide translations for all existing supported languages: English (US), Spanish, French, German, Japanese, Mandarin, and Ukrainian
3. ALL user-facing text in the Icon_Crop_Dialog, Create_Server_Dialog icon area, and Server_Settings_Panel icon area SHALL use i18n string lookups rather than hardcoded strings

### Requirement 9: Accessibility

**User Story:** As a user relying on assistive technology, I want the icon upload experience to be fully accessible, so that I can manage server icons using a keyboard or screen reader.

#### Acceptance Criteria

1. THE file picker button SHALL have an accessible label describing its purpose (e.g., "Upload server icon")
2. THE crop area SHALL be keyboard-navigable: arrow keys for pan, +/- for zoom, Enter to confirm, Escape to cancel
3. THE circular preview SHALL have an `alt` attribute describing the preview (e.g., "Server icon preview")
4. THE upload progress indicator SHALL have an `aria-live="polite"` region announcing upload status changes
5. THE remove icon confirmation dialog SHALL trap focus and be dismissible via Escape key
6. ALL interactive elements in the Icon_Crop_Dialog SHALL have visible focus indicators
