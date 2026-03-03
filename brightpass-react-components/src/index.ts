// ── Main entry (BrightPassRoutes) ─────────────────────────────────────
export { default as BrightPassRoutes } from './lib/BrightPassRoutes';

// ── Context ──────────────────────────────────────────────────────────
export {
  BrightPassProvider,
  useBrightPass,
  BrightPassContext,
  DEFAULT_AUTO_LOCK_MS,
  HIDDEN_TAB_LOCK_MS,
} from './lib/context/BrightPassProvider';
export type {
  BrightPassContextValue,
  BrightPassProviderProps,
  BrightPassVaultState,
} from './lib/context/BrightPassProvider';

// ── Services ─────────────────────────────────────────────────────────
export { default as BrightPassApiService } from './lib/services/BrightPassApiService';

// ── Hooks ────────────────────────────────────────────────────────────
export { useBrightPassApi } from './lib/hooks/useBrightPassApi';
export { useBrightPassTranslation } from './lib/hooks/useBrightPassTranslation';
export {
  useBrightPassAutofill,
  matchSiteUrl,
} from './lib/hooks/useBrightPassAutofill';
export type { UseBrightPassAutofillResult } from './lib/hooks/useBrightPassAutofill';
export {
  useBrightPassExtensionBridge,
  isAllowedOrigin,
} from './lib/hooks/useBrightPassExtensionBridge';
export type {
  UseBrightPassExtensionBridgeOptions,
  UseBrightPassExtensionBridgeResult,
} from './lib/hooks/useBrightPassExtensionBridge';

// ── Views ────────────────────────────────────────────────────────────
export { default as VaultListView } from './lib/views/VaultListView';
export { default as VaultDetailView } from './lib/views/VaultDetailView';
export { default as AuditLogView } from './lib/views/AuditLogView';
export {
  sortAuditEntries,
  filterAuditEntries,
  formatAuditEntry,
} from './lib/views/AuditLogView';
export type { AuditEntry } from './lib/views/AuditLogView';
export { default as PasswordGeneratorPage } from './lib/views/PasswordGeneratorPage';

// ── Components ───────────────────────────────────────────────────────
export { default as BreadcrumbNav } from './lib/components/BreadcrumbNav';
export { buildBreadcrumbs } from './lib/components/BreadcrumbNav';
export type { BreadcrumbItem } from './lib/components/BreadcrumbNav';
export { default as CreateVaultDialog } from './lib/components/CreateVaultDialog';
export type { CreateVaultDialogProps } from './lib/components/CreateVaultDialog';
export { default as MasterPasswordPrompt } from './lib/components/MasterPasswordPrompt';
export type { MasterPasswordPromptProps } from './lib/components/MasterPasswordPrompt';
export { default as EntryDetailView } from './lib/components/EntryDetailView';
export type { EntryDetailViewProps } from './lib/components/EntryDetailView';
export { default as EntryForm } from './lib/components/EntryForm';
export type { EntryFormProps } from './lib/components/EntryForm';
export { default as SearchBar } from './lib/components/SearchBar';
export { filterEntries } from './lib/components/SearchBar';
export type { SearchBarProps } from './lib/components/SearchBar';

// ── Widgets ──────────────────────────────────────────────────────────
export {
  default as PasswordGeneratorWidget,
  classifyStrength,
} from './lib/widgets/PasswordGeneratorWidget';
export {
  default as TOTPWidget,
  formatTotpCode,
  calculateRemainingSeconds,
  isValidBase32,
  isValidOtpauthUri,
  isValidTotpSecret,
} from './lib/widgets/TOTPWidget';
export {
  default as BreachCheckWidget,
  formatBreachMessage,
} from './lib/widgets/BreachCheckWidget';

// ── Dialogs ──────────────────────────────────────────────────────────
export { default as ShareDialog } from './lib/dialogs/ShareDialog';
export {
  default as EmergencyAccessDialog,
  validateThreshold,
} from './lib/dialogs/EmergencyAccessDialog';
export {
  default as ImportDialog,
  getAcceptedFileTypes,
  formatImportSummary,
} from './lib/dialogs/ImportDialog';
