# Implementation Plan: BrightChain VFS Explorer

## Overview

Build the BrightChain VFS Explorer VS Code extension incrementally, starting with project scaffolding and shared types, then layering in core infrastructure (settings, auth, API client), followed by providers (tree, filesystem), UI components (webview, status bar, search, versions), and finally wiring everything together in the extension entry point. Each task builds on the previous, ensuring no orphaned code.

## Tasks

- [x] 1. Scaffold project structure and shared types
  - [x] 1.1 Create the `vscode-brightchain-vfs-explorer` Nx workspace package
    - Create `vscode-brightchain-vfs-explorer/` directory with `project.json` (Nx config with build, test, lint targets), `tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json`
    - Create `package.json` with VS Code extension manifest including `contributes` section (commands, views, viewsContainers, viewsWelcome, configuration, menus, activationEvents) as specified in the design
    - Add `vscode-brightchain-vfs-explorer` to root `package.json` workspaces array
    - Configure Jest with `jest.config.ts` including fast-check support
    - _Requirements: 1.1, 15.1_

  - [x] 1.2 Define extension-local TypeScript interfaces and types
    - Create `src/api/types.ts` with `IFolderContentsDTO`, `IInitUploadParams`, `IUploadSessionDTO`, `IChunkReceipt`, `IDirectChallengePayload`, `ISearchFilters`, `ISearchResultsDTO`, `IFileMetadataUpdate`
    - Create `src/auth/types.ts` with `IAuthState`, `AuthEvent`, `WebviewToHostMessage`, `HostToWebviewMessage`, `ConnectionState`
    - Create `src/providers/tree-item.ts` with `BrightchainTreeItem` class stub
    - Create `src/util/disposable.ts` with disposable management helper
    - _Requirements: 2.3, 3.3, 6.5, 7.3, 11.1, 12.4_

  - [x] 1.3 Implement URI parse/build utilities
    - Create `src/util/uri.ts` with `IParsedBrightchainUri`, `parseBrightchainUri`, `toFileUri`, `toFolderUri` as specified in the design's URI Encoding Scheme section
    - Handle edge cases: URI-encoded file names, root folder URI, missing segments
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

  - [x] 1.4 Write property test for URI round-trip encoding
    - **Property 1: URI round-trip encoding**
    - Create `src/test/property/uri-roundtrip.property.test.ts`
    - Generate arbitrary UUID strings and non-empty file names; verify `toFileUri` → `parseBrightchainUri` recovers original id and name; verify `toFolderUri` → `parseBrightchainUri` recovers original id with type `'folder'`
    - **Validates: Requirements 6.1, 6.2, 6.4, 6.5**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement SettingsManager and MetadataCache
  - [x] 3.1 Implement SettingsManager
    - Create `src/services/settings-manager.ts` with `SettingsManager` class
    - Read `brightchainVfsExplorer.apiHostUrl` from `vscode.workspace.getConfiguration()` with default `https://brightchain.org`
    - Implement `validateAndApplyHostUrl` that shows a warning for non-`brightchain.org` hostnames and reverts on dismiss
    - Listen for `vscode.workspace.onDidChangeConfiguration` and emit `onConfigChanged`
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Write property test for non-brightchain.org hostname warning
    - **Property 2: Non-brightchain.org hostnames trigger warning**
    - Create `src/test/property/settings-warning.property.test.ts`
    - Generate arbitrary URL strings; verify that URLs with hostname !== `brightchain.org` trigger warning, and URLs with hostname === `brightchain.org` do not
    - **Validates: Requirements 1.3**

  - [x] 3.3 Implement MetadataCache
    - Create `src/services/metadata-cache.ts` with `MetadataCache` class
    - Implement TTL-based cache (30s default) for `FileStat` and directory contents
    - Implement `invalidate(id)` and `invalidateAll()` methods
    - _Requirements: 6.2, 6.4, 6.5_

  - [x] 3.4 Write property test for MetadataCache TTL
    - **Property 24: MetadataCache respects TTL**
    - Create `src/test/property/cache-ttl.property.test.ts`
    - Generate arbitrary cache entries and TTL values; verify retrieval before TTL returns data, retrieval after TTL returns undefined
    - **Validates: Requirements 6.2, 6.4, 6.5**

- [x] 4. Implement authentication layer
  - [x] 4.1 Implement TokenStore
    - Create `src/auth/token-store.ts` with `TokenStore` class wrapping VS Code `SecretStorage`
    - Implement `store(token)`, `get()`, `clear()` methods
    - _Requirements: 4.1_

  - [x] 4.2 Write property test for token persistence round-trip
    - **Property 8: Token persistence round-trip**
    - Create `src/test/property/token-roundtrip.property.test.ts`
    - Generate arbitrary JWT-like strings; verify `store()` then `get()` returns identical string
    - **Validates: Requirements 4.1**

  - [x] 4.3 Implement AuthManager
    - Create `src/auth/auth-manager.ts` with `AuthManager` class extending `vscode.Disposable`
    - Implement `mnemonicLogin`: derive ECIES key pair from mnemonic, construct challenge (time 8 bytes + nonce 32 bytes + server signature), sign with private key, POST to `/api/user/direct-challenge`, store token, emit `auth-changed`, zero mnemonic and private key
    - Implement `passwordLogin`: POST credentials, store token, emit `auth-changed`
    - Implement `restoreSession`: check stored token expiration, restore if valid, clear if expired
    - Implement `logout`: clear token, emit `auth-changed` with `authenticated: false`
    - Implement `handleUnauthorized`: clear token, set state to unauthenticated
    - Implement `getToken` accessor
    - _Requirements: 2.1–2.7, 3.1–3.4, 4.1–4.5_

  - [x] 4.4 Write property tests for AuthManager
    - [x] 4.4.1 Property test: mnemonic key derivation
      - **Property 3: Mnemonic key derivation produces valid key pair**
      - Create `src/test/property/key-derivation.property.test.ts`
      - **Validates: Requirements 2.2**
    - [x] 4.4.2 Property test: challenge payload byte layout
      - **Property 4: Challenge payload has correct byte layout**
      - Create `src/test/property/challenge-layout.property.test.ts`
      - **Validates: Requirements 2.3**
    - [x] 4.4.3 Property test: sensitive key material zeroed
      - **Property 5: Sensitive key material is zeroed after login attempt**
      - Create `src/test/property/key-zeroing.property.test.ts`
      - **Validates: Requirements 2.7**
    - [x] 4.4.4 Property test: successful login stores token and emits event
      - **Property 6: Successful login stores token and emits auth-changed**
      - Create `src/test/property/login-stores-token.property.test.ts`
      - **Validates: Requirements 2.4, 2.5, 3.3**
    - [x] 4.4.5 Property test: login error messages do not expose internals
      - **Property 7: Login error messages do not expose internals**
      - Create `src/test/property/error-no-internals.property.test.ts`
      - **Validates: Requirements 2.6, 3.4**
    - [x] 4.4.6 Property test: session restore respects token expiration
      - **Property 9: Session restore respects token expiration**
      - Create `src/test/property/session-restore.property.test.ts`
      - **Validates: Requirements 4.2, 4.3**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement ApiClient with retry and error handling
  - [x] 6.1 Implement ApiClient core with HTTP, auth header injection, and retry logic
    - Create `src/api/api-client.ts` with `ApiClient` class
    - Implement private `request<T>` method with: auth header injection from `AuthManager.getToken()`, exponential backoff for 5xx (max 2 retries, `baseDelayMs * 2^attempt`), Retry-After handling for 429, 401 delegation to `AuthManager.handleUnauthorized()`
    - Implement all public methods: file CRUD (`getFileContent`, `getFileMetadata`, `updateFile`, `deleteFile`), folder operations (`getFolderContents`, `getFolderPath`, `createFolder`, `moveItem`), chunked upload (`initUpload`, `uploadChunk`, `finalizeUpload`), versions (`getVersions`, `restoreVersion`), search (`searchFiles`), auth endpoints (`directChallenge`, `passwordLogin`)
    - _Requirements: 6.2, 6.3, 6.6, 6.7, 6.8, 7.3, 7.6, 9.1, 9.3, 10.2, 14.1, 14.2, 14.3_

  - [x] 6.2 Write property tests for ApiClient retry behavior
    - [x] 6.2.1 Property test: 401 triggers token clearance
      - **Property 10: 401 response triggers token clearance**
      - Create `src/test/property/unauthorized-clears.property.test.ts`
      - **Validates: Requirements 4.4**
    - [x] 6.2.2 Property test: chunk upload retry limit
      - **Property 16: Chunk upload retries do not exceed maximum**
      - Create `src/test/property/chunk-retry-limit.property.test.ts`
      - **Validates: Requirements 7.6, 14.3**
    - [x] 6.2.3 Property test: rate-limit Retry-After
      - **Property 17: Rate-limit (429) respects Retry-After header**
      - Create `src/test/property/rate-limit-retry.property.test.ts`
      - **Validates: Requirements 14.2**
    - [x] 6.2.4 Property test: exponential backoff for 5xx
      - **Property 18: 5xx errors trigger exponential backoff retries**
      - Create `src/test/property/exponential-backoff.property.test.ts`
      - **Validates: Requirements 14.3**

- [x] 7. Implement TreeProvider and TreeItem
  - [x] 7.1 Implement BrightchainTreeItem
    - Update `src/providers/tree-item.ts` with full `BrightchainTreeItem` implementation
    - Set `command` to open file via `brightchain://` URI for file items
    - Set `contextValue` to `'brightchain-file'` or `'brightchain-folder'` for context menus
    - Set appropriate collapsible state and icons
    - _Requirements: 5.3, 5.4, 5.6, 5.7_

  - [x] 7.2 Write property tests for TreeItem
    - [x] 7.2.1 Property test: file tree items produce correct URIs
      - **Property 13: File tree items produce correct open-file URIs**
      - Create `src/test/property/tree-item-uri.property.test.ts`
      - **Validates: Requirements 5.4, 10.3**
    - [x] 7.2.2 Property test: tree items have correct contextValue
      - **Property 14: Tree items have correct contextValue for menus**
      - Create `src/test/property/tree-item-context.property.test.ts`
      - **Validates: Requirements 5.3, 5.6, 5.7**

  - [x] 7.3 Implement BrightchainTreeProvider
    - Create `src/providers/tree-provider.ts` with `BrightchainTreeProvider` class implementing `vscode.TreeDataProvider<BrightchainTreeItem>`
    - Implement `getChildren`: return root folder contents when authenticated (via `ApiClient.getFolderContents`), empty array when not authenticated
    - Implement `getTreeItem`, `getParent`, `refresh` methods
    - Listen for `AuthManager.onAuthChanged` to refresh tree on auth state changes
    - Use `MetadataCache` for folder contents
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 8. Implement FileSystemProvider
  - [x] 8.1 Implement BrightchainFSProvider
    - Create `src/providers/fs-provider.ts` with `BrightchainFSProvider` class implementing `vscode.FileSystemProvider`
    - Implement `stat`: parse URI, fetch metadata via `ApiClient`, map `IFileMetadataDTO` to `vscode.FileStat` (type, ctime, mtime, size)
    - Implement `readDirectory`: parse folder URI, fetch contents, return `[name, FileType]` tuples
    - Implement `readFile`: parse file URI, fetch content via `ApiClient.getFileContent`
    - Implement `writeFile`: parse URI, execute chunked upload flow (init → chunks → finalize), fire `onDidChangeFile`
    - Implement `delete`: call `ApiClient.deleteFile`, fire `onDidChangeFile`
    - Implement `rename`: call `ApiClient.moveItem` or `updateFile`, fire `onDidChangeFile`
    - Implement `createDirectory`: call `ApiClient.createFolder`, fire `onDidChangeFile`
    - Implement `watch`: return no-op disposable
    - Use `MetadataCache` for stat and readDirectory
    - _Requirements: 6.1–6.9_

  - [x] 8.2 Write property tests for FSProvider mappings
    - [x] 8.2.1 Property test: file metadata maps to FileStat
      - **Property 11: File metadata maps correctly to VS Code FileStat**
      - Create `src/test/property/filestat-mapping.property.test.ts`
      - **Validates: Requirements 6.5**
    - [x] 8.2.2 Property test: folder contents map to tuples
      - **Property 12: Folder contents map to [name, FileType] tuples**
      - Create `src/test/property/dir-contents-mapping.property.test.ts`
      - **Validates: Requirements 6.4**
    - [x] 8.2.3 Property test: write operations fire change events
      - **Property 21: Write operations fire onDidChangeFile events**
      - Create `src/test/property/change-events.property.test.ts`
      - **Validates: Requirements 6.9**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement UI components
  - [x] 10.1 Implement StatusIndicator
    - Create `src/ui/status-indicator.ts` with `StatusIndicator` class
    - Create and manage a `vscode.StatusBarItem` showing connection state text and icon
    - Listen for `AuthManager.onAuthChanged` to update state
    - Set click command to `brightchain.login` when disconnected, show context menu when connected
    - Display username when connected
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 10.2 Write property test for StatusIndicator rendering
    - **Property 19: StatusIndicator renders correct state**
    - Create `src/test/property/status-indicator.property.test.ts`
    - Generate arbitrary `ConnectionState` values and optional usernames; verify correct text and command
    - **Validates: Requirements 11.1, 11.2, 11.3**

  - [x] 10.3 Implement ProgressReporter
    - Create `src/ui/progress-reporter.ts` with `ProgressReporter` class
    - Wrap `vscode.window.withProgress` for upload/download progress notifications
    - Support cancellation token forwarding
    - _Requirements: 7.2, 7.4, 7.7, 8.3_

  - [x] 10.4 Write property test for upload progress tracking
    - **Property 15: Upload progress tracks chunk completion**
    - Create `src/test/property/upload-progress.property.test.ts`
    - Generate arbitrary totalChunks > 0 and chunk index; verify progress fraction equals `(i + 1) / totalChunks`
    - **Validates: Requirements 7.4**

  - [x] 10.5 Implement LoginWebview
    - Create `src/ui/login-webview.ts` with `LoginWebview` class managing a `vscode.WebviewPanel`
    - Create `src/ui/webview-html/login.html` with mnemonic and password login forms, client-side validation, loading state
    - Implement `postMessage` / `onDidReceiveMessage` protocol per design's `WebviewToHostMessage` / `HostToWebviewMessage` types
    - Webview must NOT make direct HTTP requests; all auth flows go through extension host
    - Auto-close panel on successful login
    - _Requirements: 12.1–12.6_

  - [x] 10.6 Write property test for webview form validation
    - **Property 23: Webview form validation rejects invalid inputs**
    - Create `src/test/property/form-validation.property.test.ts`
    - Generate arbitrary form inputs; verify empty mnemonic or empty username+email rejects submission; verify empty password fields reject submission
    - **Validates: Requirements 12.3**

  - [x] 10.7 Implement SearchProvider
    - Create `src/services/search-provider.ts` with `SearchProvider` class
    - Show QuickPick input, call `ApiClient.searchFiles`, display results with file name/path/MIME type
    - Open selected result via `brightchain://` URI
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 10.8 Implement VersionPanel
    - Create `src/services/version-panel.ts` with `VersionPanel` class
    - Fetch versions via `ApiClient.getVersions`, display in QuickPick with version number, timestamp, uploader, size
    - Mark destroyed versions as unavailable with "Destroyed" label
    - Support "Restore" and "Download" actions
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 10.9 Write property test for version display
    - **Property 22: Version display includes required fields**
    - Create `src/test/property/version-display.property.test.ts`
    - Generate arbitrary `IFileVersionDTO` objects; verify QuickPick items include version number, timestamp, uploader, size; verify destroyed versions show "Destroyed" label
    - **Validates: Requirements 9.2, 9.5**

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Wire extension entry point and register commands
  - [x] 12.1 Implement extension entry point
    - Create `src/extension.ts` with `activate()` and `deactivate()` functions
    - Instantiate all components: SettingsManager, TokenStore, AuthManager, ApiClient, MetadataCache, TreeProvider, FSProvider, StatusIndicator, LoginWebview, SearchProvider, VersionPanel, ProgressReporter
    - Register TreeDataProvider for `'brightchain-explorer'` view
    - Register FileSystemProvider for `'brightchain'` scheme with `isCaseSensitive: true`
    - Register all 8 commands: `brightchain.login`, `brightchain.logout`, `brightchain.uploadFile`, `brightchain.downloadFile`, `brightchain.searchFiles`, `brightchain.viewVersions`, `brightchain.newFolder`, `brightchain.refreshExplorer`
    - Push all disposables to `context.subscriptions`
    - Call `authManager.restoreSession()` on activation
    - _Requirements: 1.1, 15.1, 15.2_

  - [x] 12.2 Implement command handlers with auth guard
    - Implement unauthenticated command guard: all commands except `brightchain.login` check `authManager.state.authenticated` and prompt login if false
    - Implement `brightchain.login`: open LoginWebview
    - Implement `brightchain.logout`: call `authManager.logout()`, reset tree
    - Implement `brightchain.uploadFile`: open file picker, execute chunked upload with ProgressReporter, refresh tree
    - Implement `brightchain.downloadFile`: open save dialog, stream file content to local FS with ProgressReporter
    - Implement `brightchain.searchFiles`: invoke SearchProvider
    - Implement `brightchain.viewVersions`: invoke VersionPanel
    - Implement `brightchain.newFolder`: show InputBox, call `apiClient.createFolder`, refresh tree
    - Implement `brightchain.refreshExplorer`: call `treeProvider.refresh()`
    - _Requirements: 4.5, 7.1, 7.5, 7.7, 8.1, 8.2, 8.4, 8.5, 13.1, 13.2, 13.3, 13.4, 15.1, 15.2, 15.3_

  - [x] 12.3 Write property tests for command guard and network errors
    - [x] 12.3.1 Property test: unauthenticated command guard
      - **Property 20: Unauthenticated command guard**
      - Create `src/test/property/unauth-guard.property.test.ts`
      - **Validates: Requirements 15.2, 15.3**
    - [x] 12.3.2 Property test: network errors set status to Error
      - **Property 25: Network errors set status to Error**
      - Create `src/test/property/network-error-status.property.test.ts`
      - **Validates: Requirements 14.1**

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (25 total)
- Unit tests validate specific examples and edge cases
- The extension uses TypeScript throughout, with fast-check for property-based tests and Jest as the test runner
- DTO interfaces are consumed from `digitalburnbag-lib` with `string` as the TID type parameter
