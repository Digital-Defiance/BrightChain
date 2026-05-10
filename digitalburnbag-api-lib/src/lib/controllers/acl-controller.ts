import type { ACLService } from '@brightchain/digitalburnbag-lib';
import {
  DigitalBurnbagStrings,
  getDigitalBurnbagTranslation,
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

/** Serialize an ACL entry so TID fields become hex strings. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeACLEntry<TID extends PlatformID>(entry: any) {
  return {
    ...entry,
    principalId: entry.principalId ? sid<TID>(entry.principalId) : null,
    customPermissionSetId: entry.customPermissionSetId
      ? sid<TID>(entry.customPermissionSetId)
      : undefined,
  };
}

/** Serialize an ACL response (object with entries array). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeACLResponse<TID extends PlatformID>(acl: any) {
  if (acl && Array.isArray(acl.entries)) {
    return { ...acl, entries: acl.entries.map(serializeACLEntry<TID>) };
  }
  if (Array.isArray(acl)) {
    return acl.map(serializeACLEntry<TID>);
  }
  return acl;
}

/** Serialize a permission set so TID fields become hex strings. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePermissionSet<TID extends PlatformID>(ps: any) {
  return {
    ...ps,
    id: ps.id ? sid<TID>(ps.id) : undefined,
    organizationId: ps.organizationId ? sid<TID>(ps.organizationId) : undefined,
    createdBy: ps.createdBy ? sid<TID>(ps.createdBy) : undefined,
  };
}

type BurnbagResponse = IApiMessageResponse | ApiErrorResponse;

export interface IACLControllerDeps<TID extends PlatformID> {
  aclService: ACLService<TID>;
  parseId: (idString: string) => TID;
}

interface IACLHandlers extends TypedHandlers {
  createPermissionSet: ApiRequestHandler<BurnbagResponse>;
  listPermissionSets: ApiRequestHandler<BurnbagResponse>;
  getEffectivePermission: ApiRequestHandler<BurnbagResponse>;
  getACL: ApiRequestHandler<BurnbagResponse>;
  setACL: ApiRequestHandler<BurnbagResponse>;
}

export class ACLController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  BurnbagResponse,
  IACLHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IACLControllerDeps<TID>;

  constructor(application: IApplication<TID>, deps: IACLControllerDeps<TID>) {
    super(application);
    this.deps = deps;
  }

  private safeParseId(idString: string | undefined): TID | undefined {
    if (!idString) return undefined;
    try {
      return this.deps.parseId(idString);
    } catch {
      return undefined;
    }
  }

  protected initRouteDefinitions(): void {
    const auth = { useAuthentication: true, useCryptoAuthentication: false };
    this.routeDefinitions = [
      routeConfig('post', '/permission-sets', {
        handlerKey: 'createPermissionSet',
        ...auth,
      }),
      routeConfig('get', '/permission-sets', {
        handlerKey: 'listPermissionSets',
        ...auth,
      }),
      routeConfig('get', '/:targetType/:targetId/effective/:principalId', {
        handlerKey: 'getEffectivePermission',
        ...auth,
      }),
      routeConfig('get', '/:targetType/:targetId', {
        handlerKey: 'getACL',
        ...auth,
      }),
      routeConfig('put', '/:targetType/:targetId', {
        handlerKey: 'setACL',
        ...auth,
      }),
    ];
    this.handlers = {
      createPermissionSet: this.handleCreatePermissionSet.bind(this),
      listPermissionSets: this.handleListPermissionSets.bind(this),
      getEffectivePermission: this.handleGetEffectivePermission.bind(this),
      getACL: this.handleGetACL.bind(this),
      setACL: this.handleSetACL.bind(this),
    };
  }

  private async handleCreatePermissionSet(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId)
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as BurnbagResponse,
      };
    const { name, flags, organizationId } = req.body;
    const permissionSet = await this.deps.aclService.createPermissionSet(
      { name, flags, organizationId },
      requesterId,
    );
    return {
      statusCode: 201,
      response: serializePermissionSet(
        permissionSet,
      ) as unknown as IApiMessageResponse,
    };
  }

  private async handleListPermissionSets(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const organizationId = req.query.organizationId as unknown as
      | TID
      | undefined;
    const sets = await this.deps.aclService.listPermissionSets(organizationId);
    return {
      statusCode: 200,
      response: (Array.isArray(sets)
        ? sets.map((s) => serializePermissionSet(s))
        : sets) as unknown as IApiMessageResponse,
    };
  }

  private async handleGetEffectivePermission(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const targetType = req.params.targetType as 'file' | 'folder';
    const targetId = this.safeParseId(req.params.targetId as string);
    if (!targetId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidTargetId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const principalId = this.safeParseId(req.params.principalId as string);
    if (!principalId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidPrincipalId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const effective = await this.deps.aclService.getEffectivePermission(
      targetId,
      targetType,
      principalId,
      {
        ipAddress: req.ip ?? '0.0.0.0',
        timestamp: new Date(),
      },
    );
    return {
      statusCode: 200,
      response: effective as unknown as IApiMessageResponse,
    };
  }

  private async handleGetACL(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const targetType = req.params.targetType as 'file' | 'folder';
    const targetId = this.safeParseId(req.params.targetId as string);
    if (!targetId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidTargetId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const acl = await this.deps.aclService.getACL(targetId, targetType);
    // Return empty entries array if no ACL document exists for this target
    const response = acl ? serializeACLResponse(acl) : { entries: [] };
    return {
      statusCode: 200,
      response: response as unknown as IApiMessageResponse,
    };
  }

  private async handleSetACL(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId)
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as BurnbagResponse,
      };
    const targetType = req.params.targetType as 'file' | 'folder';
    const targetId = this.safeParseId(req.params.targetId as string);
    if (!targetId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidTargetId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    await this.deps.aclService.setACL(
      targetId,
      targetType,
      req.body,
      requesterId,
    );
    return {
      statusCode: 200,
      response: { updated: true } as unknown as IApiMessageResponse,
    };
  }
}
