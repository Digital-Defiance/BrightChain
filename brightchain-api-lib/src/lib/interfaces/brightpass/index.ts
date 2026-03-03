/**
 * BrightPass API response interfaces.
 *
 * Each interface extends IApiMessageResponse (from node-express-suite) and
 * merges with the corresponding data shape returned by the BrightPass controller.
 * The base data types live in @brightchain/brightchain-lib following the
 * IBaseData<TID> workspace convention.
 */

import type { IApiMessageResponse } from '@digitaldefiance/node-express-suite';
import type {
  AuditLogEntry,
  AutofillPayload,
  DecryptedVault,
  EmergencyAccessConfig,
  EntryPropertyRecord,
  IBreachCheckResult,
  IGeneratedPassword,
  ImportResult,
  ITotpCode,
  ITotpValidation,
  VaultEntry,
  VaultMetadata,
} from '@brightchain/brightchain-lib';

// ─── Vault Responses ────────────────────────────────────────────

export interface IVaultCreateResponse extends IApiMessageResponse {
  data: { vault: VaultMetadata };
}

export interface IVaultListResponse extends IApiMessageResponse {
  data: { vaults: VaultMetadata[] };
}

export interface IVaultOpenResponse extends IApiMessageResponse {
  data: { vault: DecryptedVault };
}

export interface IVaultDeleteResponse extends IApiMessageResponse {
  data: { deleted: boolean };
}

// ─── Entry Responses ────────────────────────────────────────────

export interface IEntryCreateResponse extends IApiMessageResponse {
  data: { entry: VaultEntry };
}

export interface IEntryGetResponse extends IApiMessageResponse {
  data: { entry: VaultEntry };
}

export interface IEntryUpdateResponse extends IApiMessageResponse {
  data: { entry: VaultEntry };
}

export interface IEntryDeleteResponse extends IApiMessageResponse {
  data: { deleted: boolean };
}

export interface IEntrySearchResponse extends IApiMessageResponse {
  data: { results: EntryPropertyRecord[] };
}

// ─── Utility Responses ──────────────────────────────────────────

export interface IGeneratedPasswordResponse extends IApiMessageResponse {
  data: { password: IGeneratedPassword };
}

export interface ITotpGenerateResponse extends IApiMessageResponse {
  data: { code: ITotpCode };
}

export interface ITotpValidateResponse extends IApiMessageResponse {
  data: { valid: boolean };
}

export interface IBreachCheckResponse extends IApiMessageResponse {
  data: IBreachCheckResult;
}

export interface IAutofillResponse extends IApiMessageResponse {
  data: AutofillPayload;
}

// ─── Audit Responses ────────────────────────────────────────────

export interface IAuditLogResponse extends IApiMessageResponse {
  data: { entries: AuditLogEntry[] };
}

// ─── Sharing Responses ──────────────────────────────────────────

export interface IShareVaultResponse extends IApiMessageResponse {
  data: { shared: boolean };
}

export interface IRevokeShareResponse extends IApiMessageResponse {
  data: { revoked: boolean };
}

// ─── Emergency Access Responses ─────────────────────────────────

export interface IEmergencyAccessConfigResponse extends IApiMessageResponse {
  data: EmergencyAccessConfig;
}

export interface IEmergencyRecoverResponse extends IApiMessageResponse {
  data: { vault: DecryptedVault };
}

// ─── Import Responses ───────────────────────────────────────────

export interface IImportEntriesResponse extends IApiMessageResponse {
  data: ImportResult;
}
