/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BreachDetector,
  EncryptedShare,
  ImportFormat,
  PasswordGenerator,
  TOTPEngine,
} from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  ControllerRegistry,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import {
  BrightPassService,
  EmergencyAccessError,
  EntryNotFoundError,
  VaultAuthenticationError,
  VaultNotFoundError,
} from '../../services/brightpass';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';
import { SessionsController } from './sessions';

// ─── Response Interfaces ────────────────────────────────────────

interface IBrightPassDataResponse {
  success: true;
  data: Record<string, unknown>;
  [key: string]: any; // index signature for ApiResponse compatibility
}

type BrightPassApiResponse = IBrightPassDataResponse | ApiErrorResponse;

// ─── Handler Types ──────────────────────────────────────────────

interface BrightPassHandlers extends TypedHandlers {
  createVault: ApiRequestHandler<BrightPassApiResponse>;
  listVaults: ApiRequestHandler<BrightPassApiResponse>;
  openVault: ApiRequestHandler<BrightPassApiResponse>;
  deleteVault: ApiRequestHandler<BrightPassApiResponse>;
  createEntry: ApiRequestHandler<BrightPassApiResponse>;
  getEntry: ApiRequestHandler<BrightPassApiResponse>;
  updateEntry: ApiRequestHandler<BrightPassApiResponse>;
  deleteEntry: ApiRequestHandler<BrightPassApiResponse>;
  searchEntries: ApiRequestHandler<BrightPassApiResponse>;
  generatePassword: ApiRequestHandler<BrightPassApiResponse>;
  generateTotp: ApiRequestHandler<BrightPassApiResponse>;
  validateTotp: ApiRequestHandler<BrightPassApiResponse>;
  breachCheck: ApiRequestHandler<BrightPassApiResponse>;
  autofill: ApiRequestHandler<BrightPassApiResponse>;
  getAuditLog: ApiRequestHandler<BrightPassApiResponse>;
  shareVault: ApiRequestHandler<BrightPassApiResponse>;
  revokeShare: ApiRequestHandler<BrightPassApiResponse>;
  configureEmergencyAccess: ApiRequestHandler<BrightPassApiResponse>;
  recoverWithShares: ApiRequestHandler<BrightPassApiResponse>;
  importEntries: ApiRequestHandler<BrightPassApiResponse>;
}

// ─── Typed Request Interfaces ───────────────────────────────────

interface VaultCreateBody {
  name: string;
  masterPassword: string;
}

interface VaultOpenBody {
  masterPassword: string;
}

interface VaultIdParams {
  vaultId: string;
}

interface EntryIdParams extends VaultIdParams {
  entryId: string;
}

// ─── Helper ─────────────────────────────────────────────────────

class AuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthenticationRequiredError';
  }
}

function mapBrightPassError(error: unknown): {
  statusCode: number;
  response: ApiErrorResponse;
} {
  if (error instanceof AuthenticationRequiredError) {
    return unauthorizedError();
  }
  if (error instanceof VaultNotFoundError) {
    return notFoundError('Vault', 'unknown');
  }
  if (error instanceof VaultAuthenticationError) {
    return unauthorizedError(error.message);
  }
  if (error instanceof EntryNotFoundError) {
    return notFoundError('Entry', 'unknown');
  }
  if (error instanceof EmergencyAccessError) {
    return validationError(error.message);
  }
  return handleError(error);
}

function ok(data: Record<string, unknown>): {
  statusCode: number;
  response: IBrightPassDataResponse;
} {
  return { statusCode: 200, response: { success: true, data } };
}

// ─── Controller ─────────────────────────────────────────────────

/**
 * BrightPassController — REST API for the BrightPass password manager.
 *
 * Provides endpoints for vault CRUD, entry CRUD, search, password generation,
 * TOTP, breach detection, autofill, audit log, sharing, emergency access, and import.
 *
 * All routes require JWT authentication.
 *
 * @requirements 5.1–5.11
 */
export class BrightPassController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  BrightPassApiResponse,
  BrightPassHandlers,
  CoreLanguageCode
> {
  private brightPassService: BrightPassService;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
    this.brightPassService = new BrightPassService();
  }

  private getAuthMemberId(req: { headers: any }): string {
    const sessionsController =
      this.application.getController<SessionsController>('sessions');
    try {
      const member = sessionsController.getMemberFromSession(
        (req.headers as any).authorization as string,
      );
      if (!member) {
        throw new Error('No member found');
      }
      return member.id.toString();
    } catch {
      throw new AuthenticationRequiredError();
    }
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      // Vault CRUD
      routeConfig('post', '/vaults', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'createVault',
        openapi: {
          summary: 'Create a vault',
          tags: ['BrightPass'],
          requestBody: { schema: 'CreateVaultRequest' },
          responses: { 200: { description: 'Vault created' } },
        },
      }),
      routeConfig('get', '/vaults', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'listVaults',
        openapi: {
          summary: 'List vaults',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Vault list' } },
        },
      }),
      routeConfig('post', '/vaults/:vaultId/open', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'openVault',
        openapi: {
          summary: 'Open a vault',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Vault opened' } },
        },
      }),
      routeConfig('delete', '/vaults/:vaultId', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'deleteVault',
        openapi: {
          summary: 'Delete a vault',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Vault deleted' } },
        },
      }),
      // Entry CRUD
      routeConfig('post', '/vaults/:vaultId/entries', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'createEntry',
        openapi: {
          summary: 'Add entry to vault',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Entry created' } },
        },
      }),
      routeConfig('get', '/vaults/:vaultId/entries/:entryId', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'getEntry',
        openapi: {
          summary: 'Get entry by ID',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Entry retrieved' } },
        },
      }),
      routeConfig('put', '/vaults/:vaultId/entries/:entryId', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'updateEntry',
        openapi: {
          summary: 'Update entry',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Entry updated' } },
        },
      }),
      routeConfig('delete', '/vaults/:vaultId/entries/:entryId', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'deleteEntry',
        openapi: {
          summary: 'Delete entry',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Entry deleted' } },
        },
      }),
      routeConfig('post', '/vaults/:vaultId/search', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'searchEntries',
        openapi: {
          summary: 'Search entries',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Search results' } },
        },
      }),
      // Utilities
      routeConfig('post', '/generate-password', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'generatePassword',
        openapi: {
          summary: 'Generate password',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Password generated' } },
        },
      }),
      routeConfig('post', '/totp/generate', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'generateTotp',
        openapi: {
          summary: 'Generate TOTP code',
          tags: ['BrightPass'],
          responses: { 200: { description: 'TOTP code' } },
        },
      }),
      routeConfig('post', '/totp/validate', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'validateTotp',
        openapi: {
          summary: 'Validate TOTP code',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Validation result' } },
        },
      }),
      routeConfig('post', '/breach-check', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'breachCheck',
        openapi: {
          summary: 'Check password breach status',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Breach check result' } },
        },
      }),
      routeConfig('post', '/vaults/:vaultId/autofill', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'autofill',
        openapi: {
          summary: 'Get autofill payload',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Autofill payload' } },
        },
      }),
      routeConfig('get', '/vaults/:vaultId/audit-log', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'getAuditLog',
        openapi: {
          summary: 'Get vault audit log',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Audit log entries' } },
        },
      }),
      // Sharing
      routeConfig('post', '/vaults/:vaultId/share', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'shareVault',
        openapi: {
          summary: 'Share vault',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Vault shared' } },
        },
      }),
      routeConfig('post', '/vaults/:vaultId/revoke-share', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'revokeShare',
        openapi: {
          summary: 'Revoke vault share',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Share revoked' } },
        },
      }),
      // Emergency access
      routeConfig('post', '/vaults/:vaultId/emergency-access', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'configureEmergencyAccess',
        openapi: {
          summary: 'Configure emergency access',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Emergency access configured' } },
        },
      }),
      routeConfig('post', '/vaults/:vaultId/emergency-recover', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'recoverWithShares',
        openapi: {
          summary: 'Recover vault with emergency shares',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Vault recovered' } },
        },
      }),
      // Import
      routeConfig('post', '/vaults/:vaultId/import', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'importEntries',
        openapi: {
          summary: 'Import entries from file',
          tags: ['BrightPass'],
          responses: { 200: { description: 'Import result' } },
        },
      }),
    ];

    ControllerRegistry.register(
      '/brightpass',
      'BrightPassController',
      this.routeDefinitions,
    );

    this.handlers = {
      createVault: this.handleCreateVault.bind(this),
      listVaults: this.handleListVaults.bind(this),
      openVault: this.handleOpenVault.bind(this),
      deleteVault: this.handleDeleteVault.bind(this),
      createEntry: this.handleCreateEntry.bind(this),
      getEntry: this.handleGetEntry.bind(this),
      updateEntry: this.handleUpdateEntry.bind(this),
      deleteEntry: this.handleDeleteEntry.bind(this),
      searchEntries: this.handleSearchEntries.bind(this),
      generatePassword: this.handleGeneratePassword.bind(this),
      generateTotp: this.handleGenerateTotp.bind(this),
      validateTotp: this.handleValidateTotp.bind(this),
      breachCheck: this.handleBreachCheck.bind(this),
      autofill: this.handleAutofill.bind(this),
      getAuditLog: this.handleGetAuditLog.bind(this),
      shareVault: this.handleShareVault.bind(this),
      revokeShare: this.handleRevokeShare.bind(this),
      configureEmergencyAccess: this.handleConfigureEmergencyAccess.bind(this),
      recoverWithShares: this.handleRecoverWithShares.bind(this),
      importEntries: this.handleImportEntries.bind(this),
    };
  }

  // ─── Vault CRUD Handlers ──────────────────────────────────────

  private handleCreateVault: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const memberId = this.getAuthMemberId(req);
      const { name, masterPassword } = (
        req as unknown as { body: VaultCreateBody }
      ).body;
      if (!name || !masterPassword) {
        return validationError('Missing required fields: name, masterPassword');
      }
      const metadata = await this.brightPassService.createVault(
        memberId,
        name,
        masterPassword,
      );
      return ok({ vault: metadata as any });
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  private handleListVaults: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const memberId = this.getAuthMemberId(req);
      const vaults = await this.brightPassService.listVaults(memberId);
      return ok({ vaults: vaults as any });
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  private handleOpenVault: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const memberId = this.getAuthMemberId(req);
      const { vaultId } = (req as unknown as { params: VaultIdParams }).params;
      const { masterPassword } = (req as unknown as { body: VaultOpenBody })
        .body;
      if (!masterPassword) {
        return validationError('Missing required field: masterPassword');
      }
      const vault = await this.brightPassService.openVault(
        memberId,
        vaultId,
        masterPassword,
      );
      return ok({ vault: vault as any });
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  private handleDeleteVault: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const memberId = this.getAuthMemberId(req);
      const { vaultId } = (req as unknown as { params: VaultIdParams }).params;
      const { masterPassword } = (req as unknown as { body: VaultOpenBody })
        .body;
      if (!masterPassword) {
        return validationError('Missing required field: masterPassword');
      }
      await this.brightPassService.deleteVault(
        memberId,
        vaultId,
        masterPassword,
      );
      return ok({ deleted: true });
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  // ─── Entry CRUD Handlers ──────────────────────────────────────

  private handleCreateEntry: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const { vaultId } = (req as unknown as { params: VaultIdParams }).params;
      const entry = (req as unknown as { body: any }).body;
      if (!entry || !entry.type || !entry.title) {
        return validationError('Missing required fields: type, title');
      }
      const created = await this.brightPassService.addEntry(vaultId, entry);
      return ok({ entry: created as any });
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  private handleGetEntry: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const { vaultId, entryId } = (req as unknown as { params: EntryIdParams })
        .params;
      const entry = await this.brightPassService.getEntry(vaultId, entryId);
      return ok({ entry: entry as any });
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  private handleUpdateEntry: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const { vaultId, entryId } = (req as unknown as { params: EntryIdParams })
        .params;
      const updates = (req as unknown as { body: any }).body;
      const updated = await this.brightPassService.updateEntry(
        vaultId,
        entryId,
        updates,
      );
      return ok({ entry: updated as any });
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  private handleDeleteEntry: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const { vaultId, entryId } = (req as unknown as { params: EntryIdParams })
        .params;
      await this.brightPassService.deleteEntry(vaultId, entryId);
      return ok({ deleted: true });
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  private handleSearchEntries: ApiRequestHandler<BrightPassApiResponse> =
    async (req) => {
      try {
        const { vaultId } = (req as unknown as { params: VaultIdParams })
          .params;
        const query = (req as unknown as { body: any }).body;
        const results = await this.brightPassService.searchEntries(
          vaultId,
          query,
        );
        return ok({ results: results as any });
      } catch (error) {
        return mapBrightPassError(error);
      }
    };

  // ─── Utility Handlers ─────────────────────────────────────────

  private handleGeneratePassword: ApiRequestHandler<BrightPassApiResponse> =
    async (req) => {
      try {
        const options = (req as unknown as { body: any }).body;
        // validate throws on invalid options
        PasswordGenerator.validate(options);
        const password = PasswordGenerator.generate(options);
        return ok({ password });
      } catch (error) {
        return mapBrightPassError(error);
      }
    };

  private handleGenerateTotp: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const { secret } = (req as unknown as { body: { secret: string } }).body;
      if (!secret) {
        return validationError('Missing required field: secret');
      }
      const code = TOTPEngine.generate(secret);
      return ok({ code });
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  private handleValidateTotp: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const { code, secret, window } = (
        req as unknown as {
          body: { code: string; secret: string; window?: number };
        }
      ).body;
      if (!code || !secret) {
        return validationError('Missing required fields: code, secret');
      }
      const valid = TOTPEngine.validate(code, secret, window);
      return ok({ valid });
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  private handleBreachCheck: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const { password } = (req as unknown as { body: { password: string } })
        .body;
      if (!password) {
        return validationError('Missing required field: password');
      }
      const result = await BreachDetector.check(password);
      return ok(result as any);
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  private handleAutofill: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const { vaultId } = (req as unknown as { params: VaultIdParams }).params;
      const { siteUrl } = (req as unknown as { body: { siteUrl: string } })
        .body;
      if (!siteUrl) {
        return validationError('Missing required field: siteUrl');
      }
      const payload = await this.brightPassService.getAutofillPayload(
        vaultId,
        siteUrl,
      );
      return ok(payload as any);
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  private handleGetAuditLog: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const { vaultId } = (req as unknown as { params: VaultIdParams }).params;
      const entries = await this.brightPassService.getAuditLog(vaultId);
      return ok({ entries: entries as any });
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  // ─── Sharing Handlers ─────────────────────────────────────────

  private handleShareVault: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const { vaultId } = (req as unknown as { params: VaultIdParams }).params;
      const { recipientMemberIds } = (
        req as unknown as { body: { recipientMemberIds: string[] } }
      ).body;
      if (!recipientMemberIds || !Array.isArray(recipientMemberIds)) {
        return validationError(
          'Missing required field: recipientMemberIds (array)',
        );
      }
      await this.brightPassService.shareVault(vaultId, recipientMemberIds);
      return ok({ shared: true });
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  private handleRevokeShare: ApiRequestHandler<BrightPassApiResponse> = async (
    req,
  ) => {
    try {
      const { vaultId } = (req as unknown as { params: VaultIdParams }).params;
      const { memberId } = (req as unknown as { body: { memberId: string } })
        .body;
      if (!memberId) {
        return validationError('Missing required field: memberId');
      }
      await this.brightPassService.revokeShare(vaultId, memberId);
      return ok({ revoked: true });
    } catch (error) {
      return mapBrightPassError(error);
    }
  };

  // ─── Emergency Access Handlers ────────────────────────────────

  private handleConfigureEmergencyAccess: ApiRequestHandler<BrightPassApiResponse> =
    async (req) => {
      try {
        const { vaultId } = (req as unknown as { params: VaultIdParams })
          .params;
        const { threshold, trustees } = (
          req as unknown as {
            body: { threshold: number; trustees: string[] };
          }
        ).body;
        if (!threshold || !trustees || !Array.isArray(trustees)) {
          return validationError(
            'Missing required fields: threshold, trustees (array)',
          );
        }
        const config = await this.brightPassService.configureEmergencyAccess(
          vaultId,
          threshold,
          trustees,
        );
        return ok(config as any);
      } catch (error) {
        return mapBrightPassError(error);
      }
    };

  private handleRecoverWithShares: ApiRequestHandler<BrightPassApiResponse> =
    async (req) => {
      try {
        const { vaultId } = (req as unknown as { params: VaultIdParams })
          .params;
        const { shares } = (
          req as unknown as { body: { shares: EncryptedShare[] } }
        ).body;
        if (!shares || !Array.isArray(shares)) {
          return validationError('Missing required field: shares (array)');
        }
        const vault = await this.brightPassService.recoverWithShares(
          vaultId,
          shares,
        );
        return ok({ vault: vault as any });
      } catch (error) {
        return mapBrightPassError(error);
      }
    };

  // ─── Import Handler ───────────────────────────────────────────

  private handleImportEntries: ApiRequestHandler<BrightPassApiResponse> =
    async (req) => {
      try {
        const { vaultId } = (req as unknown as { params: VaultIdParams })
          .params;
        const { format, fileContent } = (
          req as unknown as { body: { format: string; fileContent: string } }
        ).body;
        if (!format || !fileContent) {
          return validationError(
            'Missing required fields: format, fileContent',
          );
        }
        const buf = Buffer.from(fileContent, 'base64');
        const result = await this.brightPassService.importFromFile(
          vaultId,
          format as ImportFormat,
          buf,
        );
        return ok(result as any);
      } catch (error) {
        return mapBrightPassError(error);
      }
    };
}
