# Bugfix Requirements Document

## Introduction

Two related bugs in the BrightPass password manager degrade the vault creation and entry management workflows. Bug 1: after creating a new vault via `CreateVaultDialog`, the user is returned to the vault list instead of being auto-navigated to the newly created (already unlocked) vault, forcing a redundant manual unlock. Bug 2: clicking "Add Entry" in `VaultDetailView` navigates to a URL that doesn't match any defined route, rendering a blank page. Together these bugs break the core create-vault-then-add-entry flow.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user submits the CreateVaultDialog form to create a new vault THEN the system calls `brightPassApi.createVault()` but discards the returned `VaultMetadata` (containing the vault `id`), does not call `unlockVault()` from the BrightPass context, and does not navigate to the vault detail page — the user is returned to the vault list with the new vault in a locked state.

1.2 WHEN a user clicks "Add Entry" in VaultDetailView THEN the system navigates to `/brightpass/vaults/{vaultId}/entries/new` (using plural `vaults`) but the route definitions in `brightpass-routes.tsx` use the singular path `/brightpass/vault/:vaultId`, so the URL does not match any route and the page renders empty.

1.3 WHEN a user navigates to `/brightpass/vault/{vaultId}/entries/new` (corrected singular path) THEN the system still renders empty because no route is defined for the `entries/new` sub-path under `vault/:vaultId` in `brightpass-routes.tsx`.

### Expected Behavior (Correct)

2.1 WHEN a user submits the CreateVaultDialog form to create a new vault THEN the system SHALL capture the returned vault ID from `createVault()`, call `unlockVault()` with the vault ID and the master password already provided in the form, and navigate to `/brightpass/vault/{vaultId}` so the user lands directly in the unlocked vault detail view.

2.2 WHEN a user clicks "Add Entry" in VaultDetailView THEN the system SHALL navigate to `/brightpass/vault/{vaultId}/entries/new` using the singular `vault` path segment that matches the defined route structure.

2.3 WHEN a user navigates to `/brightpass/vault/{vaultId}/entries/new` THEN the system SHALL match a defined route and render the appropriate entry creation view (or a placeholder) instead of a blank page.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user cancels the CreateVaultDialog without submitting THEN the system SHALL CONTINUE TO close the dialog without creating a vault or navigating away from the vault list.

3.2 WHEN a user creates a vault and the API call fails THEN the system SHALL CONTINUE TO display the generic error message inside the dialog and keep the dialog open.

3.3 WHEN a user navigates to `/brightpass/vault/{vaultId}` for an existing vault that is not yet unlocked THEN the system SHALL CONTINUE TO display the MasterPasswordPrompt for manual unlock.

3.4 WHEN a user navigates to `/brightpass/vault/{vaultId}/audit` THEN the system SHALL CONTINUE TO render the AuditLogView as before.

3.5 WHEN a user navigates to `/brightpass/tools/generator` THEN the system SHALL CONTINUE TO render the PasswordGeneratorPage as before.

3.6 WHEN a user locks a vault from VaultDetailView THEN the system SHALL CONTINUE TO clear decrypted data and navigate back to `/brightpass`.

3.7 WHEN a user uses the MasterPasswordPrompt to unlock an existing vault THEN the system SHALL CONTINUE TO call `unlockVault()` and navigate to `/brightpass/vault/{vaultId}`.
