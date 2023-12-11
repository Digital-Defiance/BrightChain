# Requirements Document

## Introduction

The BrightChain VFS Explorer is a VS Code extension that provides a native file system explorer for the BrightChain / Digital Burnbag file platform. The extension integrates with the Digital Burnbag API to let users authenticate, browse folders, upload and download files, preview content, manage versions, and search — all from within VS Code. It exposes a VS Code TreeView for folder navigation, a FileSystemProvider for native editor integration (open, save, drag-and-drop), a Webview-based login UI for authentication flows, and status bar indicators for connection state. The extension is a greenfield project within the existing Nx monorepo.

## Glossary

- **VFS_Explorer**: The VS Code extension providing the BrightChain virtual file system explorer
- **API_Client**: The HTTP client module within the extension responsible for all communication with the Digital Burnbag API endpoints
- **Auth_Manager**: The module responsible for managing authentication state, token storage, and token refresh within the extension
- **Tree_Provider**: The VS Code TreeDataProvider implementation that renders the BrightChain folder hierarchy in the Explorer sidebar
- **FS_Provider**: The VS Code FileSystemProvider implementation that maps BrightChain files and folders to the `brightchain://` URI scheme for native VS Code file operations
- **Login_Webview**: The Webview panel that renders the authentication UI, supporting password login and mnemonic direct-challenge login
- **Settings_Manager**: The module that reads and validates extension settings from VS Code configuration, including the API host URL
- **Status_Indicator**: The VS Code status bar item that displays the current connection state (disconnected, connecting, connected, error)
- **Token_Store**: The secure storage layer using VS Code SecretStorage API for persisting JWT tokens across sessions
- **Progress_Reporter**: The module that uses VS Code Progress API to display upload and download progress notifications
- **Version_Panel**: The Webview panel or QuickPick UI that displays file version history and allows version restore or download
- **Search_Provider**: The module that integrates with the Digital Burnbag search API and presents results in a VS Code QuickPick or TreeView

## Requirements

### Requirement 1: Extension Activation and Configuration

**User Story:** As a developer, I want the BrightChain VFS Explorer to activate in VS Code and provide configurable settings, so that I can connect to the correct API host.

#### Acceptance Criteria

1. WHEN VS Code loads the VFS_Explorer extension, THE VFS_Explorer SHALL register the Tree_Provider, FS_Provider, and all commands without errors
2. THE Settings_Manager SHALL expose a `brightchainVfsExplorer.apiHostUrl` configuration setting with a default value of `https://brightchain.org`
3. WHEN a user changes the `apiHostUrl` setting to a value whose hostname is not `brightchain.org`, THE Settings_Manager SHALL display a warning notification stating that a non-default API host is configured and ask the user to confirm the change
4. WHEN a user confirms the non-default API host warning, THE Settings_Manager SHALL persist the new value and THE API_Client SHALL use the updated URL for subsequent requests
5. WHEN a user dismisses the non-default API host warning without confirming, THE Settings_Manager SHALL revert the setting to its previous value

### Requirement 2: Mnemonic Direct-Challenge Authentication

**User Story:** As a user, I want to log in using my mnemonic phrase via the ECIES direct-challenge flow, so that I can authenticate securely without transmitting my mnemonic to the server.

#### Acceptance Criteria

1. WHEN a user selects the "Login with Mnemonic" option in the Login_Webview, THE Login_Webview SHALL display a form requesting the mnemonic phrase and either a username or email address
2. WHEN the user submits the mnemonic login form, THE Auth_Manager SHALL derive the ECIES key pair from the mnemonic phrase entirely on the client side
3. WHEN the ECIES key pair is derived, THE Auth_Manager SHALL construct a direct-challenge payload containing time (8 bytes), nonce (32 bytes), and server signature, sign the entire challenge buffer with the derived ECIES private key, and send a POST request to `/api/user/direct-challenge` with the challenge hex, signature hex, and username or email
4. WHEN the `/api/user/direct-challenge` endpoint returns a successful IApiLoginResponse, THE Auth_Manager SHALL extract the JWT token and store it in the Token_Store using VS Code SecretStorage
5. WHEN the direct-challenge login succeeds, THE Auth_Manager SHALL emit an authentication-changed event so that the Tree_Provider refreshes and the Status_Indicator updates to "Connected"
6. IF the `/api/user/direct-challenge` endpoint returns an error, THEN THE Login_Webview SHALL display the error message to the user without exposing internal details
7. THE Auth_Manager SHALL clear the mnemonic phrase and derived private key from memory immediately after the authentication request completes (success or failure)

### Requirement 3: Password Authentication

**User Story:** As a user, I want to log in using my username and password, so that I have an alternative authentication method.

#### Acceptance Criteria

1. WHEN a user selects the "Login with Password" option in the Login_Webview, THE Login_Webview SHALL display a form requesting username (or email) and password
2. WHEN the user submits the password login form, THE Auth_Manager SHALL send the credentials to the appropriate API login endpoint over HTTPS
3. WHEN the password login endpoint returns a successful response with a JWT token, THE Auth_Manager SHALL store the token in the Token_Store and emit an authentication-changed event
4. IF the password login endpoint returns an authentication error, THEN THE Login_Webview SHALL display a descriptive error message to the user

### Requirement 4: Token Persistence and Session Management

**User Story:** As a user, I want my authentication session to persist across VS Code restarts, so that I do not need to log in every time I open VS Code.

#### Acceptance Criteria

1. THE Token_Store SHALL persist JWT tokens using the VS Code SecretStorage API so that tokens survive extension restarts and VS Code restarts
2. WHEN the VFS_Explorer extension activates and a stored JWT token exists, THE Auth_Manager SHALL validate the token expiration and, if valid, restore the authenticated session without requiring user interaction
3. IF a stored JWT token has expired, THEN THE Auth_Manager SHALL clear the token from the Token_Store and set the Status_Indicator to "Disconnected"
4. WHEN the API_Client receives a 401 Unauthorized response from any API call, THE Auth_Manager SHALL clear the stored token, set the Status_Indicator to "Disconnected", and prompt the user to re-authenticate
5. WHEN a user executes the "BrightChain: Logout" command, THE Auth_Manager SHALL clear the JWT token from the Token_Store, reset the Tree_Provider to an empty state, and set the Status_Indicator to "Disconnected"

### Requirement 5: Folder Browsing via TreeView

**User Story:** As a user, I want to browse my BrightChain folders and files in the VS Code Explorer sidebar, so that I can navigate my virtual file system visually.

#### Acceptance Criteria

1. WHEN the user is authenticated, THE Tree_Provider SHALL fetch the root folder contents from `GET /folders/{rootFolderId}/contents` and display them as a tree in the VS Code Explorer sidebar panel titled "BrightChain"
2. WHEN a user expands a folder node in the tree, THE Tree_Provider SHALL fetch that folder's contents from `GET /folders/{folderId}/contents` and display child files and subfolders
3. THE Tree_Provider SHALL display each item with an appropriate icon (folder icon for folders, file-type icon for files based on MIME type) and label (file or folder name)
4. WHEN a user selects a file node in the tree, THE VFS_Explorer SHALL open the file using the FS_Provider URI scheme (`brightchain://`) so that VS Code handles it as a native file open
5. THE Tree_Provider SHALL display the folder breadcrumb path via `GET /folders/{folderId}/path` when a user navigates into a subfolder
6. WHEN the user right-clicks a folder node, THE Tree_Provider SHALL present context menu actions including "New Folder", "Upload File", and "Refresh"
7. WHEN the user right-clicks a file node, THE Tree_Provider SHALL present context menu actions including "Download", "Delete", "View Versions", and "Copy Path"

### Requirement 6: FileSystemProvider Integration

**User Story:** As a developer, I want BrightChain files to behave like native files in VS Code, so that I can open, edit, and save them using standard VS Code workflows.

#### Acceptance Criteria

1. THE FS_Provider SHALL register a FileSystemProvider for the `brightchain://` URI scheme so that VS Code can open, read, and write BrightChain files natively
2. WHEN VS Code calls `readFile` on a `brightchain://` URI, THE FS_Provider SHALL download the file content from `GET /files/{fileId}` and return the decrypted bytes
3. WHEN VS Code calls `writeFile` on a `brightchain://` URI, THE FS_Provider SHALL upload the new content to the API using the chunked upload flow (POST `/upload/init`, PUT `/upload/{sessionId}/chunk/{index}`, POST `/upload/{sessionId}/finalize`) as a new version of the existing file
4. WHEN VS Code calls `readDirectory` on a `brightchain://` URI, THE FS_Provider SHALL return the folder contents from `GET /folders/{folderId}/contents` as an array of `[name, FileType]` tuples
5. WHEN VS Code calls `stat` on a `brightchain://` URI, THE FS_Provider SHALL return file metadata from `GET /files/{fileId}/metadata` mapped to a VS Code `FileStat` object (type, ctime, mtime, size)
6. WHEN VS Code calls `delete` on a `brightchain://` URI, THE FS_Provider SHALL call `DELETE /files/{fileId}` to soft-delete the file
7. WHEN VS Code calls `createDirectory` on a `brightchain://` URI, THE FS_Provider SHALL call `POST /folders` to create the folder
8. WHEN VS Code calls `rename` on a `brightchain://` URI, THE FS_Provider SHALL call `PUT /files/{fileId}` or `POST /folders/{folderId}/move` to rename or move the item
9. THE FS_Provider SHALL fire `onDidChangeFile` events when file or folder operations complete so that the Tree_Provider and open editors stay synchronized

### Requirement 7: File Upload with Progress

**User Story:** As a user, I want to upload files to BrightChain with visible progress, so that I know the status of my uploads.

#### Acceptance Criteria

1. WHEN a user triggers the "Upload File" command (via context menu, command palette, or drag-and-drop), THE VFS_Explorer SHALL open a native file picker dialog to select one or more local files
2. WHEN files are selected for upload, THE Progress_Reporter SHALL display a VS Code progress notification with a cancellable progress bar showing the upload percentage
3. WHEN uploading a file, THE API_Client SHALL use the chunked upload flow: POST `/upload/init` to create a session, PUT `/upload/{sessionId}/chunk/{index}` for each chunk, and POST `/upload/{sessionId}/finalize` to complete
4. WHEN each chunk upload completes, THE Progress_Reporter SHALL update the progress bar to reflect cumulative progress (chunks completed / total chunks)
5. WHEN the upload finalizes successfully, THE Tree_Provider SHALL refresh the target folder to display the newly uploaded file
6. IF a chunk upload fails, THEN THE API_Client SHALL retry the failed chunk up to 3 times before reporting the error to the user
7. IF the user cancels an in-progress upload, THEN THE API_Client SHALL stop sending chunks and THE Progress_Reporter SHALL dismiss the progress notification

### Requirement 8: File Download with Progress

**User Story:** As a user, I want to download files from BrightChain to my local machine with visible progress, so that I can save copies of my files locally.

#### Acceptance Criteria

1. WHEN a user triggers the "Download" command on a file node, THE VFS_Explorer SHALL open a native save dialog to choose the local destination path
2. WHEN a download destination is selected, THE API_Client SHALL request the file content from `GET /files/{fileId}` and stream it to the local file system
3. WHILE a download is in progress, THE Progress_Reporter SHALL display a VS Code progress notification showing download progress
4. WHEN the download completes, THE VFS_Explorer SHALL display an information notification with the saved file path and an "Open File" action
5. IF a download fails due to a network error, THEN THE VFS_Explorer SHALL display an error notification with the failure reason

### Requirement 9: File Version History

**User Story:** As a user, I want to view and manage version history for my BrightChain files, so that I can restore or download previous versions.

#### Acceptance Criteria

1. WHEN a user triggers the "View Versions" command on a file node, THE VFS_Explorer SHALL fetch the version list from `GET /files/{fileId}/versions` and display it in a QuickPick or Webview panel
2. THE Version_Panel SHALL display each version with its version number, timestamp, uploader name, and file size
3. WHEN a user selects a version and chooses "Restore", THE API_Client SHALL call `POST /files/{fileId}/versions/{versionId}/restore` and THE Tree_Provider SHALL refresh to reflect the restored version
4. WHEN a user selects a version and chooses "Download", THE VFS_Explorer SHALL download that specific version's content to a local file
5. IF a version is marked as permanently destroyed, THEN THE Version_Panel SHALL display that version as unavailable with a "Destroyed" label

### Requirement 10: File Search

**User Story:** As a user, I want to search for files across my BrightChain storage from within VS Code, so that I can quickly locate specific files.

#### Acceptance Criteria

1. WHEN a user executes the "BrightChain: Search Files" command, THE Search_Provider SHALL display a VS Code QuickPick input for the search query
2. WHEN the user types a search query, THE Search_Provider SHALL call `GET /files/search` with the query parameters and display matching results as QuickPick items with file name, path, and MIME type
3. WHEN the user selects a search result, THE VFS_Explorer SHALL open the file using the `brightchain://` URI scheme
4. THE Search_Provider SHALL support filtering by file type and folder path via QuickPick filter syntax

### Requirement 11: Connection Status Indicator

**User Story:** As a user, I want to see the current connection status to BrightChain in the VS Code status bar, so that I know whether I am connected and authenticated.

#### Acceptance Criteria

1. THE Status_Indicator SHALL display a status bar item showing one of four states: "Disconnected" (no token), "Connecting" (authentication in progress), "Connected" (valid token, API reachable), or "Error" (token valid but API unreachable)
2. WHEN the user clicks the Status_Indicator, THE VFS_Explorer SHALL open the Login_Webview if the state is "Disconnected", or show a menu with "Logout" and "Refresh Connection" options if the state is "Connected"
3. WHILE the state is "Connected", THE Status_Indicator SHALL display the authenticated username alongside the connection icon
4. WHEN the Auth_Manager detects a token expiration or API unreachability, THE Status_Indicator SHALL update to the appropriate state within 5 seconds

### Requirement 12: Login Webview UI

**User Story:** As a user, I want a polished login interface within VS Code, so that I can authenticate using either mnemonic or password flows without leaving the editor.

#### Acceptance Criteria

1. WHEN the user triggers the "BrightChain: Login" command or clicks the "Disconnected" status bar item, THE VFS_Explorer SHALL open the Login_Webview as a VS Code Webview panel
2. THE Login_Webview SHALL present two authentication options: "Login with Mnemonic" (recommended) and "Login with Password"
3. THE Login_Webview SHALL validate form inputs on the client side before submission (non-empty fields, email format when email is provided)
4. THE Login_Webview SHALL communicate with the extension host exclusively through the VS Code Webview messaging API (postMessage / onDidReceiveMessage), and SHALL NOT make direct HTTP requests from the Webview context
5. WHILE an authentication request is in progress, THE Login_Webview SHALL display a loading indicator and disable the submit button to prevent duplicate submissions
6. WHEN authentication succeeds, THE Login_Webview SHALL close automatically

### Requirement 13: Folder Operations

**User Story:** As a user, I want to create, rename, move, and delete folders in my BrightChain file system from VS Code, so that I can organize my files.

#### Acceptance Criteria

1. WHEN a user executes the "New Folder" command on a folder node, THE VFS_Explorer SHALL prompt for a folder name via an InputBox and call `POST /folders` with the parent folder ID and name
2. WHEN a user drags a file or folder node to a different folder in the tree, THE FS_Provider SHALL call `POST /folders/{folderId}/move` to move the item and THE Tree_Provider SHALL refresh both the source and destination folders
3. WHEN a user deletes a folder via the context menu or keyboard shortcut, THE FS_Provider SHALL call the delete endpoint to soft-delete the folder
4. IF a folder creation fails because a folder with the same name already exists in the parent, THEN THE VFS_Explorer SHALL display an error notification with a descriptive message

### Requirement 14: Error Handling and Offline Resilience

**User Story:** As a user, I want clear error messages and graceful degradation when the API is unreachable, so that I understand what went wrong and can retry when connectivity is restored.

#### Acceptance Criteria

1. IF the API_Client cannot reach the API host (network error, DNS failure, timeout), THEN THE VFS_Explorer SHALL display an error notification with the failure reason and set the Status_Indicator to "Error"
2. WHEN the API_Client encounters a rate-limit response (HTTP 429), THE API_Client SHALL wait for the duration specified in the `Retry-After` header before retrying the request
3. IF an API request fails with an HTTP 5xx error, THEN THE API_Client SHALL retry the request up to 2 times with exponential backoff before reporting the error to the user
4. WHEN the API becomes reachable again after an error state, THE Status_Indicator SHALL transition back to "Connected" and THE Tree_Provider SHALL offer to refresh

### Requirement 15: Extension Commands Registration

**User Story:** As a user, I want all BrightChain operations available through the VS Code command palette, so that I can access any feature via keyboard.

#### Acceptance Criteria

1. THE VFS_Explorer SHALL register the following commands in the VS Code command palette: "BrightChain: Login", "BrightChain: Logout", "BrightChain: Upload File", "BrightChain: Download File", "BrightChain: Search Files", "BrightChain: View Version History", "BrightChain: New Folder", and "BrightChain: Refresh Explorer"
2. WHILE the user is not authenticated, THE VFS_Explorer SHALL disable all commands except "BrightChain: Login" and display a "Sign in to BrightChain" welcome message in the Tree_Provider panel
3. WHEN the user executes a disabled command while not authenticated, THE VFS_Explorer SHALL prompt the user to log in first
