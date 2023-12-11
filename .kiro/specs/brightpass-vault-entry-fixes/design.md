# BrightPass Vault Entry Fixes — Bugfix Design

## Overview

Two related bugs break the core create-vault-then-add-entry flow in BrightPass. Bug 1: `CreateVaultDialog.onSubmit` discards the `VaultMetadata` returned by `createVault()`, never calls `unlockVault()`, and never navigates — leaving the user on the vault list with a locked vault. Bug 2: `VaultDetailView` navigates to `/brightpass/vaults/{id}/entries/new` (plural) but routes use `/brightpass/vault/{id}` (singular), and no `entries/new` route exists at all. The fix captures the vault ID, unlocks and navigates after creation, corrects the plural/singular mismatch, and adds the missing route.

## Glossary

- **Bug_Condition (C)**: The set of inputs/actions that trigger either bug — submitting the create-vault form, or clicking "Add Entry" in VaultDetailView
- **Property (P)**: The desired post-fix behavior — auto-unlock + navigate after vault creation; correct route match for entry creation
- **Preservation**: Existing behaviors that must remain unchanged — cancel/error flows, manual unlock via MasterPasswordPrompt, all other routes, lock-vault flow
- **`createVault()`**: Method on `BrightPassApiService` (`BrightPassApiService.ts`) that POSTs to `/brightpass/vaults` and returns `VaultMetadata` (including `id`)
- **`unlockVault()`**: Method on `BrightPassContextValue` (`BrightPassProvider.tsx`) that calls `openVault()` and stores decrypted vault state in context
- **`VaultMetadata`**: Interface from `brightchain-lib` containing vault `id`, `name`, `ownerId`, timestamps, `entryCount`, `sharedWith`, `vcblBlockId`

## Bug Details

### Bug Condition

The bugs manifest in two distinct but related scenarios within the vault creation and entry management flow.

**Bug 1** triggers when a user successfully submits the `CreateVaultDialog` form. The `onSubmit` handler awaits `createVault()` but discards its return value, never calls `unlockVault()`, and never calls `navigate()`. The user is returned to the vault list with the new vault locked.

**Bug 2** triggers when a user clicks "Add Entry" in `VaultDetailView`. The `onClick` handler navigates to `/brightpass/vaults/${vaultId}/entries/new` (plural `vaults`), but the route tree uses singular `vault`. Additionally, no route definition exists for the `entries/new` sub-path.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type UserAction
  OUTPUT: boolean

  // Bug 1: Vault creation completes but vault is not unlocked/navigated
  IF input.action == "SUBMIT_CREATE_VAULT_FORM"
     AND createVaultApiCall(input.name, input.masterPassword).succeeds
  THEN RETURN TRUE

  // Bug 2a: "Add Entry" navigates to wrong URL (plural path segment)
  IF input.action == "CLICK_ADD_ENTRY"
     AND navigationTarget(input).contains("/vaults/")  // plural
  THEN RETURN TRUE

  // Bug 2b: No route matches entries/new even with correct singular path
  IF input.action == "NAVIGATE"
     AND input.url MATCHES "/brightpass/vault/{id}/entries/new"
     AND NOT routeExists(input.url)
  THEN RETURN TRUE

  RETURN FALSE
END FUNCTION
```

### Examples

- **Bug 1**: User fills in vault name "Work Passwords" and master password, clicks "Create Vault". API returns `VaultMetadata { id: "abc-123", name: "Work Passwords", ... }`. Expected: vault unlocks and user sees vault detail page at `/brightpass/vault/abc-123`. Actual: dialog closes, user sees vault list, vault "Work Passwords" appears locked.
- **Bug 2a**: User is viewing vault `abc-123` and clicks "Add Entry". Expected: navigation to `/brightpass/vault/abc-123/entries/new`. Actual: navigation to `/brightpass/vaults/abc-123/entries/new` (plural) — no route match, blank page.
- **Bug 2b**: Even if the URL were corrected to singular `/brightpass/vault/abc-123/entries/new`, no `<Route>` is defined for `vault/:vaultId/entries/new` in `brightpass-routes.tsx` — still a blank page.
- **Edge case**: User creates a vault but the API call fails — error is shown in dialog, no navigation occurs. This is correct existing behavior and must be preserved.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Cancelling `CreateVaultDialog` without submitting closes the dialog without side effects (Req 3.1)
- Failed `createVault()` API calls display the generic error inside the dialog and keep it open (Req 3.2)
- Navigating to `/brightpass/vault/{vaultId}` for a locked vault shows `MasterPasswordPrompt` (Req 3.3)
- `/brightpass/vault/{vaultId}/audit` continues to render `AuditLogView` (Req 3.4)
- `/brightpass/tools/generator` continues to render `PasswordGeneratorPage` (Req 3.5)
- Locking a vault clears decrypted data and navigates to `/brightpass` (Req 3.6)
- `MasterPasswordPrompt` unlock flow calls `unlockVault()` and navigates to `/brightpass/vault/{vaultId}` (Req 3.7)

**Scope:**
All inputs that do NOT involve (a) successful vault creation submission or (b) "Add Entry" navigation should be completely unaffected by this fix. This includes:
- Mouse clicks on other buttons (Lock Vault, Cancel, search, entry list items)
- All existing route navigations
- Vault list refresh, delete, share operations
- Auto-lock timer behavior

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Discarded Return Value in CreateVaultDialog** (Bug 1): Line `await brightPassApi.createVault(values.name, values.masterPassword)` in `CreateVaultDialog.tsx` does not capture the returned `VaultMetadata`. Without the vault `id`, the handler cannot call `unlockVault()` or `navigate()`. The `MasterPasswordPrompt` component demonstrates the correct pattern: it calls `unlockVault(vaultId, masterPassword)` then `navigate(\`/brightpass/vault/${vaultId}\`)`.

2. **Missing Dependencies in CreateVaultDialog** (Bug 1): The component does not import `useNavigate` from `react-router-dom` or `useBrightPass` from the context provider. These are required to perform unlock and navigation after creation.

3. **Plural/Singular URL Mismatch in VaultDetailView** (Bug 2a): The "Add Entry" `onClick` handler uses the string `/brightpass/vaults/${vaultId}/entries/new` with plural `vaults`, but `brightpass-routes.tsx` defines routes under `vault/:vaultId` (singular).

4. **Missing Route Definition** (Bug 2b): `brightpass-routes.tsx` has no `<Route>` for `vault/:vaultId/entries/new`. Even after fixing the URL, the navigation would still fail without this route.

## Correctness Properties

Property 1: Bug Condition — Auto-Unlock and Navigate After Vault Creation

_For any_ successful vault creation submission where `createVault()` returns a valid `VaultMetadata`, the fixed `CreateVaultDialog.onSubmit` SHALL capture the returned vault `id`, call `unlockVault(id, masterPassword)`, and navigate to `/brightpass/vault/{id}`, resulting in the user landing on the unlocked vault detail page.

**Validates: Requirements 2.1**

Property 2: Bug Condition — Correct Add Entry Navigation URL

_For any_ click on the "Add Entry" button in `VaultDetailView`, the fixed component SHALL navigate to `/brightpass/vault/{vaultId}/entries/new` using the singular `vault` path segment that matches the route definitions.

**Validates: Requirements 2.2**

Property 3: Bug Condition — Entry Creation Route Exists

_For any_ navigation to `/brightpass/vault/{vaultId}/entries/new`, the fixed route configuration SHALL match a defined route and render an appropriate entry creation view instead of a blank page.

**Validates: Requirements 2.3**

Property 4: Preservation — Unchanged Dialog Cancel and Error Behavior

_For any_ interaction with `CreateVaultDialog` that does NOT result in a successful `createVault()` call (cancel, validation failure, API error), the fixed component SHALL produce the same behavior as the original — closing without side effects on cancel, showing error on API failure — preserving all non-creation dialog flows.

**Validates: Requirements 3.1, 3.2**

Property 5: Preservation — Unchanged Routing and Vault Flows

_For any_ navigation or vault operation that does NOT involve vault creation submission or "Add Entry" click, the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing routes, lock/unlock flows, and UI interactions.

**Validates: Requirements 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `brightpass-react-components/src/lib/components/CreateVaultDialog.tsx`

**Function**: `onSubmit` (inside `useFormik` config)

**Specific Changes**:
1. **Add imports**: Import `useNavigate` from `react-router-dom` and `useBrightPass` from `../context/BrightPassProvider`
2. **Add hooks**: Call `const navigate = useNavigate()` and `const { unlockVault } = useBrightPass()` inside the component
3. **Capture return value**: Change `await brightPassApi.createVault(...)` to `const vaultMetadata = await brightPassApi.createVault(...)`
4. **Unlock vault**: After successful creation, call `await unlockVault(vaultMetadata.id, values.masterPassword)`
5. **Navigate to vault**: After unlock, call `navigate(\`/brightpass/vault/${vaultMetadata.id}\`)` — matching the pattern used by `MasterPasswordPrompt`
6. **Retain existing cleanup**: Keep `formik.resetForm()`, `onVaultCreated()`, and `onClose()` calls

---

**File**: `brightpass-react-components/src/lib/views/VaultDetailView.tsx`

**Function**: "Add Entry" button `onClick` handler

**Specific Changes**:
1. **Fix URL path**: Change `/brightpass/vaults/${vaultId}/entries/new` to `/brightpass/vault/${vaultId}/entries/new` (singular `vault`)

---

**File**: `brightchain-react/src/app/brightpass-routes.tsx`

**Function**: Route definitions inside `<Routes>`

**Specific Changes**:
1. **Add new route**: Add `<Route path="vault/:vaultId/entries/new" element={<EntryCreatePlaceholder />} />` (or the actual entry creation component if available) inside the `<Route element={<BrightPassLayout />}>` block, before the existing `vault/:vaultId` route to ensure specificity

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write component tests using React Testing Library that render `CreateVaultDialog` and `VaultDetailView` with mocked providers, simulate user actions, and assert on navigation and context calls. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Create Vault No Unlock Test**: Render `CreateVaultDialog`, mock `createVault()` to return `{ id: "test-id", ... }`, submit form — assert `unlockVault` was called (will fail on unfixed code)
2. **Create Vault No Navigate Test**: Same setup — assert `navigate` was called with `/brightpass/vault/test-id` (will fail on unfixed code)
3. **Add Entry Wrong URL Test**: Render `VaultDetailView` with unlocked vault, click "Add Entry" — assert `navigate` was called with singular `/brightpass/vault/{id}/entries/new` (will fail on unfixed code because it uses plural)
4. **Missing Route Test**: Render `BrightPassRoutes` and navigate to `/brightpass/vault/test-id/entries/new` — assert something renders (will fail on unfixed code)

**Expected Counterexamples**:
- `unlockVault` is never called after vault creation
- `navigate` is never called after vault creation
- `navigate` is called with `/brightpass/vaults/...` (plural) instead of `/brightpass/vault/...` (singular)
- No route matches `vault/:vaultId/entries/new`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  IF input.action == "SUBMIT_CREATE_VAULT_FORM" THEN
    result := CreateVaultDialog_fixed.onSubmit(input)
    ASSERT unlockVault.calledWith(returnedVaultId, input.masterPassword)
    ASSERT navigate.calledWith("/brightpass/vault/" + returnedVaultId)
  END IF

  IF input.action == "CLICK_ADD_ENTRY" THEN
    result := VaultDetailView_fixed.handleAddEntry(input)
    ASSERT navigate.calledWith("/brightpass/vault/" + vaultId + "/entries/new")
    ASSERT NOT navigate.calledWith(url containing "/vaults/")
  END IF

  IF input.action == "NAVIGATE" AND input.url MATCHES entries/new THEN
    rendered := renderRoute(input.url)
    ASSERT rendered IS NOT blank
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehavior(input) = fixedBehavior(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for cancel flows, error flows, existing route navigations, and lock/unlock operations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Dialog Cancel Preservation**: Observe that cancelling CreateVaultDialog resets form and closes without navigation on unfixed code, then verify this continues after fix
2. **Dialog Error Preservation**: Observe that API errors display the generic error message and keep dialog open on unfixed code, then verify this continues after fix
3. **Existing Route Preservation**: Observe that `/brightpass/vault/:vaultId`, `/brightpass/vault/:vaultId/audit`, and `/brightpass/tools/generator` all render correctly on unfixed code, then verify this continues after fix
4. **Lock Vault Preservation**: Observe that locking a vault clears state and navigates to `/brightpass` on unfixed code, then verify this continues after fix
5. **MasterPasswordPrompt Preservation**: Observe that manual unlock via MasterPasswordPrompt calls `unlockVault` and navigates correctly on unfixed code, then verify this continues after fix

### Unit Tests

- Test `CreateVaultDialog` onSubmit captures vault ID, calls `unlockVault`, and navigates on success
- Test `CreateVaultDialog` onSubmit does NOT call `unlockVault` or `navigate` on API failure
- Test `CreateVaultDialog` cancel resets form without side effects
- Test `VaultDetailView` "Add Entry" button navigates to correct singular URL
- Test route configuration matches `vault/:vaultId/entries/new` and renders a component

### Property-Based Tests

- Generate random vault names and master passwords, verify that successful creation always results in `unlockVault` + `navigate` being called with the correct vault ID
- Generate random vault IDs, verify that "Add Entry" navigation URL always uses singular `vault` path segment
- Generate random non-bug-condition inputs (cancel, error, other navigations), verify behavior is identical to unfixed code

### Integration Tests

- Test full create-vault flow: fill form → submit → verify vault unlocked in context → verify navigation to vault detail page
- Test full add-entry flow: unlock vault → click "Add Entry" → verify route matches and component renders
- Test that existing flows (manual unlock, lock vault, audit log, password generator) continue working end-to-end after all fixes are applied
