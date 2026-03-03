/**
 * BrightPassApiService — typed service wrapping all 20 BrightPass REST API
 * endpoints.
 *
 * Uses the existing `authenticatedApi` axios instance for all requests.
 * Extracts the `data` payload from success responses and throws
 * `IBrightPassError` on error responses. On 401, the existing axios
 * interceptor handles the logout flow.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.6
 */

import type {
  AuditLogEntry,
  EmergencyAccessConfig,
  EncryptedShare,
  EntryPropertyRecord,
  EntrySearchQuery,
  IAutofillPayload,
  IBreachCheckResult,
  IBrightPassError,
  IDecryptedVault,
  IGeneratedPassword,
  IPasswordGenerationOptions,
  ITotpCode,
  ITotpValidation,
  ImportFormat,
  ImportResult,
  VaultEntry,
  VaultMetadata,
} from '@brightchain/brightchain-lib';
import { AxiosInstance, isAxiosError } from 'axios';

interface BrightPassSuccessResponse<T = Record<string, unknown>> {
  success: true;
  data: T;
}

function extractData<T>(responseData: BrightPassSuccessResponse<T>): T {
  return responseData.data;
}

function throwBrightPassError(error: unknown): never {
  if (isAxiosError(error) && error.response) {
    const body = error.response.data as Record<string, unknown> | undefined;
    const bpError: IBrightPassError = {
      code: (body?.code as string) ?? `HTTP_${error.response.status}`,
      message:
        (body?.message as string) ??
        (body?.error as string) ??
        error.message,
      details: (body?.details as Record<string, unknown>) ?? undefined,
    };
    throw bpError;
  }
  const bpError: IBrightPassError = {
    code: 'NETWORK_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
  };
  throw bpError;
}

const BASE = '/brightpass';

class BrightPassApiService {
  private readonly api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async createVault(
    name: string,
    masterPassword: string,
  ): Promise<VaultMetadata> {
    try {
      const res = await this.api.post<
        BrightPassSuccessResponse<{ vault: VaultMetadata }>
      >(`${BASE}/vaults`, { name, masterPassword });
      return extractData(res.data).vault;
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async listVaults(): Promise<VaultMetadata[]> {
    try {
      const res = await this.api.get<
        BrightPassSuccessResponse<{ vaults: VaultMetadata[] }>
      >(`${BASE}/vaults`);
      return extractData(res.data).vaults;
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async openVault(
    vaultId: string,
    masterPassword: string,
  ): Promise<IDecryptedVault<string>> {
    try {
      const res = await this.api.post<
        BrightPassSuccessResponse<{ vault: IDecryptedVault<string> }>
      >(`${BASE}/vaults/${encodeURIComponent(vaultId)}/open`, {
        masterPassword,
      });
      return extractData(res.data).vault;
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async deleteVault(
    vaultId: string,
    masterPassword: string,
  ): Promise<void> {
    try {
      await this.api.delete(
        `${BASE}/vaults/${encodeURIComponent(vaultId)}`,
        { data: { masterPassword } },
      );
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async createEntry(
    vaultId: string,
    entry: VaultEntry,
  ): Promise<VaultEntry> {
    try {
      const res = await this.api.post<
        BrightPassSuccessResponse<{ entry: VaultEntry }>
      >(`${BASE}/vaults/${encodeURIComponent(vaultId)}/entries`, entry);
      return extractData(res.data).entry;
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async getEntry(vaultId: string, entryId: string): Promise<VaultEntry> {
    try {
      const res = await this.api.get<
        BrightPassSuccessResponse<{ entry: VaultEntry }>
      >(
        `${BASE}/vaults/${encodeURIComponent(vaultId)}/entries/${encodeURIComponent(entryId)}`,
      );
      return extractData(res.data).entry;
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async updateEntry(
    vaultId: string,
    entryId: string,
    entry: VaultEntry,
  ): Promise<VaultEntry> {
    try {
      const res = await this.api.put<
        BrightPassSuccessResponse<{ entry: VaultEntry }>
      >(
        `${BASE}/vaults/${encodeURIComponent(vaultId)}/entries/${encodeURIComponent(entryId)}`,
        entry,
      );
      return extractData(res.data).entry;
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async deleteEntry(vaultId: string, entryId: string): Promise<void> {
    try {
      await this.api.delete(
        `${BASE}/vaults/${encodeURIComponent(vaultId)}/entries/${encodeURIComponent(entryId)}`,
      );
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async searchEntries(
    vaultId: string,
    query: EntrySearchQuery,
  ): Promise<EntryPropertyRecord[]> {
    try {
      const res = await this.api.post<
        BrightPassSuccessResponse<{ results: EntryPropertyRecord[] }>
      >(`${BASE}/vaults/${encodeURIComponent(vaultId)}/search`, query);
      return extractData(res.data).results;
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async generatePassword(
    options: IPasswordGenerationOptions,
  ): Promise<IGeneratedPassword> {
    try {
      const res = await this.api.post<
        BrightPassSuccessResponse<{ password: IGeneratedPassword }>
      >(`${BASE}/generate-password`, options);
      return extractData(res.data).password;
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async generateTotp(secret: string): Promise<ITotpCode> {
    try {
      const res = await this.api.post<
        BrightPassSuccessResponse<{ code: ITotpCode }>
      >(`${BASE}/totp/generate`, { secret });
      return extractData(res.data).code;
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async validateTotp(secret: string, code: string): Promise<ITotpValidation> {
    try {
      const res = await this.api.post<
        BrightPassSuccessResponse<{ valid: boolean }>
      >(`${BASE}/totp/validate`, { secret, code });
      const data = extractData(res.data);
      return { valid: data.valid };
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async checkBreach(password: string): Promise<IBreachCheckResult> {
    try {
      const res = await this.api.post<
        BrightPassSuccessResponse<IBreachCheckResult>
      >(`${BASE}/breach-check`, { password });
      return extractData(res.data);
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async getAutofill(
    vaultId: string,
    siteUrl: string,
  ): Promise<IAutofillPayload<string>> {
    try {
      const res = await this.api.post<
        BrightPassSuccessResponse<IAutofillPayload<string>>
      >(`${BASE}/vaults/${encodeURIComponent(vaultId)}/autofill`, { siteUrl });
      return extractData(res.data);
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async getAuditLog(vaultId: string): Promise<AuditLogEntry[]> {
    try {
      const res = await this.api.get<
        BrightPassSuccessResponse<{ entries: AuditLogEntry[] }>
      >(`${BASE}/vaults/${encodeURIComponent(vaultId)}/audit-log`);
      return extractData(res.data).entries;
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async shareVault(vaultId: string, memberIds: string[]): Promise<void> {
    try {
      await this.api.post(
        `${BASE}/vaults/${encodeURIComponent(vaultId)}/share`,
        { recipientMemberIds: memberIds },
      );
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async revokeShare(vaultId: string, memberId: string): Promise<void> {
    try {
      await this.api.post(
        `${BASE}/vaults/${encodeURIComponent(vaultId)}/revoke-share`,
        { memberId },
      );
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async configureEmergencyAccess(
    vaultId: string,
    config: EmergencyAccessConfig,
  ): Promise<void> {
    try {
      await this.api.post(
        `${BASE}/vaults/${encodeURIComponent(vaultId)}/emergency-access`,
        { threshold: config.threshold, trustees: config.trustees },
      );
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async recoverWithShares(
    vaultId: string,
    shares: EncryptedShare[],
  ): Promise<IDecryptedVault<string>> {
    try {
      const res = await this.api.post<
        BrightPassSuccessResponse<{ vault: IDecryptedVault<string> }>
      >(`${BASE}/vaults/${encodeURIComponent(vaultId)}/emergency-recover`, { shares });
      return extractData(res.data).vault;
    } catch (error) {
      throwBrightPassError(error);
    }
  }

  async importEntries(
    vaultId: string,
    format: ImportFormat,
    fileBase64: string,
  ): Promise<ImportResult> {
    try {
      const res = await this.api.post<
        BrightPassSuccessResponse<ImportResult>
      >(`${BASE}/vaults/${encodeURIComponent(vaultId)}/import`, { format, fileContent: fileBase64 });
      return extractData(res.data);
    } catch (error) {
      throwBrightPassError(error);
    }
  }
}

export default BrightPassApiService;
