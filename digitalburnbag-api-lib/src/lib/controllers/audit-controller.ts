import type {
  IAuditEntryBase,
  IAuditService,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID as NodePlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  BaseController,
  routeConfig,
  type ApiErrorResponse,
  type ApiRequestHandler,
  type IApiMessageResponse,
  type IApplication,
  type IStatusCodeResponse,
  type TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import type { Request as ExpressRequest } from 'express';

/** Convert a TID to a hex string for JSON-safe responses. */
function sid<TID extends PlatformID>(value: TID | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return Buffer.from(value).toString('hex');
  }
  return String(value);
}

/** Serialize an audit entry so TID fields become hex strings. */

function serializeAuditEntry<TID extends PlatformID>(
  entry: IAuditEntryBase<TID>,
) {
  return {
    ...entry,
    actorId: entry.actorId ? sid<TID>(entry.actorId) : null,
    targetId: entry.targetId ? sid<TID>(entry.targetId) : null,
    ledgerEntryHash: entry.ledgerEntryHash
      ? Buffer.from(entry.ledgerEntryHash).toString('hex')
      : null,
  };
}

type BurnbagResponse = IApiMessageResponse | ApiErrorResponse;

export interface IAuditControllerDeps<TID extends PlatformID> {
  auditService: IAuditService<TID>;
}

interface IAuditHandlers extends TypedHandlers {
  exportAuditLog: ApiRequestHandler<BurnbagResponse>;
  generateComplianceReport: ApiRequestHandler<BurnbagResponse>;
  queryAuditLog: ApiRequestHandler<BurnbagResponse>;
}

export class AuditController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  BurnbagResponse,
  IAuditHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IAuditControllerDeps<TID>;

  constructor(application: IApplication<TID>, deps: IAuditControllerDeps<TID>) {
    super(application);
    this.deps = deps;
  }

  protected initRouteDefinitions(): void {
    const auth = { useAuthentication: true, useCryptoAuthentication: false };
    this.routeDefinitions = [
      routeConfig('get', '/export', {
        handlerKey: 'exportAuditLog',
        ...auth,
      }),
      routeConfig('post', '/compliance-report', {
        handlerKey: 'generateComplianceReport',
        ...auth,
      }),
      routeConfig('get', '/', { handlerKey: 'queryAuditLog', ...auth }),
    ];
    this.handlers = {
      exportAuditLog: this.handleExportAuditLog.bind(this),
      generateComplianceReport: this.handleGenerateComplianceReport.bind(this),
      queryAuditLog: this.handleQueryAuditLog.bind(this),
    };
  }

  private async handleExportAuditLog(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const {
      actorId,
      targetId,
      operationType,
      dateFrom,
      dateTo,
      page,
      pageSize,
    } = req.query;
    const exported = await this.deps.auditService.exportAuditLog({
      actorId: actorId as unknown as TID | undefined,
      targetId: targetId as unknown as TID | undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      operationType: operationType as any,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    // Serialize TID fields in each entry for JSON-safe transport
    const serialized = Array.isArray(exported)
      ? exported.map(serializeAuditEntry)
      : exported;
    return {
      statusCode: 200,
      response: serialized as unknown as IApiMessageResponse,
    };
  }

  private async handleGenerateComplianceReport(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const {
      dateFrom,
      dateTo,
      includeAccessPatterns,
      includeDestructionEvents,
      includeSharingActivity,
      includeNonAccessProofs,
    } = req.body;
    const report = await this.deps.auditService.generateComplianceReport({
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      includeAccessPatterns,
      includeDestructionEvents,
      includeSharingActivity,
      includeNonAccessProofs,
    });
    return {
      statusCode: 200,
      response: report as unknown as IApiMessageResponse,
    };
  }

  private async handleQueryAuditLog(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const {
      actorId,
      targetId,
      operationType,
      dateFrom,
      dateTo,
      page,
      pageSize,
    } = req.query;
    const entries = await this.deps.auditService.queryAuditLog({
      actorId: actorId as unknown as TID | undefined,
      targetId: targetId as unknown as TID | undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      operationType: operationType as any,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    // Serialize TID fields in each entry for JSON-safe transport
    const serialized = Array.isArray(entries)
      ? entries.map(serializeAuditEntry)
      : entries;
    return {
      statusCode: 200,
      response: serialized as unknown as IApiMessageResponse,
    };
  }
}
