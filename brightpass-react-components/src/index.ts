// ── Context ──────────────────────────────────────────────────────────
export {
  BrightPassContext,
  BrightPassProvider,
  DEFAULT_AUTO_LOCK_MS,
  HIDDEN_TAB_LOCK_MS,
  useBrightPass,
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
export {
  matchSiteUrl,
  useBrightPassAutofill,
} from './lib/hooks/useBrightPassAutofill';
export type { UseBrightPassAutofillResult } from './lib/hooks/useBrightPassAutofill';
export {
  isAllowedOrigin,
  useBrightPassExtensionBridge,
} from './lib/hooks/useBrightPassExtensionBridge';
export type {
  UseBrightPassExtensionBridgeOptions,
  UseBrightPassExtensionBridgeResult,
} from './lib/hooks/useBrightPassExtensionBridge';
export { useBrightPassTranslation } from './lib/hooks/useBrightPassTranslation';

// ── Views ────────────────────────────────────────────────────────────
export { default as BrightPassLayout } from './lib/views/BrightPassLayout';
export {
  default as AuditLogView,
  filterAuditEntries,
  formatAuditEntry,
  sortAuditEntries,
} from './lib/views/AuditLogView';
export type { AuditEntry } from './lib/views/AuditLogView';
export { default as PasswordGeneratorPage } from './lib/views/PasswordGeneratorPage';
export { default as VaultDetailView } from './lib/views/VaultDetailView';
export { default as VaultListView } from './lib/views/VaultListView';

// ── Components ───────────────────────────────────────────────────────
export {
  default as BreadcrumbNav,
  buildBreadcrumbs,
} from './lib/components/BreadcrumbNav';
export type { BreadcrumbItem } from './lib/components/BreadcrumbNav';
export { default as CreateVaultDialog } from './lib/components/CreateVaultDialog';
export type { CreateVaultDialogProps } from './lib/components/CreateVaultDialog';
export { default as EntryDetailView } from './lib/components/EntryDetailView';
export type { EntryDetailViewProps } from './lib/components/EntryDetailView';
export { default as EntryForm } from './lib/components/EntryForm';
export type { EntryFormProps } from './lib/components/EntryForm';
export { default as MasterPasswordPrompt } from './lib/components/MasterPasswordPrompt';
export type { MasterPasswordPromptProps } from './lib/components/MasterPasswordPrompt';
export {
  default as SearchBar,
  filterEntries,
} from './lib/components/SearchBar';
export type { SearchBarProps } from './lib/components/SearchBar';

// ── Widgets ──────────────────────────────────────────────────────────
export {
  default as BreachCheckWidget,
  formatBreachMessage,
} from './lib/widgets/BreachCheckWidget';
export {
  default as PasswordGeneratorWidget,
  classifyStrength,
} from './lib/widgets/PasswordGeneratorWidget';
export {
  default as TOTPWidget,
  calculateRemainingSeconds,
  formatTotpCode,
  isValidBase32,
  isValidOtpauthUri,
  isValidTotpSecret,
} from './lib/widgets/TOTPWidget';

// ── Dialogs ──────────────────────────────────────────────────────────
export {
  default as EmergencyAccessDialog,
  validateThreshold,
} from './lib/dialogs/EmergencyAccessDialog';
export {
  default as ImportDialog,
  formatImportSummary,
  getAcceptedFileTypes,
} from './lib/dialogs/ImportDialog';
export { default as ShareDialog } from './lib/dialogs/ShareDialog';
