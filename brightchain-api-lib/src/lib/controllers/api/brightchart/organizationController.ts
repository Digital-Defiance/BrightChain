import { ADMIN, getRoleCodeDisplay } from '@brightchain/brightchart-lib';
import type { BrightDb } from '@brightchain/db';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  routeConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { SchemaCollection } from '../../../enumerations/schema-collection';
import { IBrightChainApplication } from '../../../interfaces/application';
import { DefaultBackendIdType } from '../../../shared-types';
import {
  forbiddenError,
  handleError,
  notFoundError,
  validationError,
} from '../../../utils/errorResponse';
import { BaseController } from '../../base';

type OrgApiResponse = IApiMessageResponse | ApiErrorResponse;

interface OrganizationHandlers extends TypedHandlers {
  createOrganization: ApiRequestHandler<OrgApiResponse>;
  listOrganizations: ApiRequestHandler<OrgApiResponse>;
  getOrganization: ApiRequestHandler<OrgApiResponse>;
  updateOrganization: ApiRequestHandler<OrgApiResponse>;
  listOrgMembers: ApiRequestHandler<OrgApiResponse>;
}

/**
 * Organization management controller.
 *
 * Provides CRUD endpoints for FHIR Organizations including
 * creation with auto-admin role, listing, updating, and member listing.
 *
 * ## Endpoints
 *
 * ### POST /   — Create organization
 * ### GET /    — List active organizations (paginated, searchable)
 * ### GET /:id — Get single organization
 * ### PUT /:id — Update organization (org admin only)
 * ### GET /:id/members — List org members grouped by role (org admin only)
 *
 * @requirements 1.1, 1.2, 1.3, 2.1, 2.4, 8.1, 8.2, 8.3, 8.4
 */
export class OrganizationController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  OrgApiResponse,
  OrganizationHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/', {
        handlerKey: 'createOrganization',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/', {
        handlerKey: 'listOrganizations',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/:id', {
        handlerKey: 'getOrganization',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('put', '/:id', {
        handlerKey: 'updateOrganization',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/:id/members', {
        handlerKey: 'listOrgMembers',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      createOrganization: this.handleCreateOrganization.bind(this),
      listOrganizations: this.handleListOrganizations.bind(this),
      getOrganization: this.handleGetOrganization.bind(this),
      updateOrganization: this.handleUpdateOrganization.bind(this),
      listOrgMembers: this.handleListOrgMembers.bind(this),
    };
  }

  // ── Helpers ──

  private getDb(): BrightDb | undefined {
    return this.application.services.has('db')
      ? (this.application.services.get('db') as BrightDb)
      : undefined;
  }

  /**
   * Inline org admin guard — checks whether the authenticated member
   * holds an active ADMIN healthcare role at the given organization.
   * Returns true if authorized, false otherwise.
   */
  private async isOrgAdmin(
    db: BrightDb,
    memberId: string,
    organizationId: string,
  ): Promise<boolean> {
    const rolesCol = db.collection(SchemaCollection.HealthcareRole);
    const now = new Date().toISOString();
    const adminRole = await rolesCol.findOne({
      memberId,
      organizationId,
      roleCode: ADMIN,
      $or: [
        { 'period.end': { $exists: false } },
        { 'period.end': null },
        { 'period.end': { $gt: now } },
      ],
    } as never);
    return adminRole !== null && adminRole !== undefined;
  }

  // ── Handlers ──

  /**
   * POST / — Create organization
   * @requirements 1.1, 1.2, 1.3, 1.4
   */
  private async handleCreateOrganization(
    req: unknown,
  ): Promise<{ statusCode: number; response: OrgApiResponse }> {
    try {
      const request = req as {
        body?: {
          name?: string;
          type?: Record<string, unknown>;
          telecom?: Record<string, unknown>[];
          address?: Record<string, unknown>[];
        };
        memberContext?: { memberId: string };
      };

      const name = request.body?.name;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return validationError('name is required');
      }

      const memberId = request.memberContext?.memberId;
      if (!memberId) {
        return validationError('Authentication required');
      }

      const db = this.getDb();
      if (!db) {
        return {
          statusCode: 503,
          response: { message: 'Database unavailable' } as ApiErrorResponse,
        };
      }

      const now = new Date().toISOString();
      const orgId = crypto.randomUUID();

      const orgDoc: Record<string, unknown> = {
        _id: orgId,
        name: name.trim(),
        active: true,
        enrollmentMode: 'open',
        createdBy: memberId,
        createdAt: now,
        updatedAt: now,
      };

      if (request.body?.type) orgDoc['type'] = request.body.type;
      if (request.body?.telecom) orgDoc['telecom'] = request.body.telecom;
      if (request.body?.address) orgDoc['address'] = request.body.address;

      const orgsCol = db.collection(SchemaCollection.Organization);
      await orgsCol.insertOne(orgDoc as never);

      // Auto-create ADMIN healthcare role for the creating member
      const roleId = crypto.randomUUID();
      const adminRoleDoc: Record<string, unknown> = {
        _id: roleId,
        memberId,
        roleCode: ADMIN,
        roleDisplay: getRoleCodeDisplay(ADMIN),
        organizationId: orgId,
        practitionerRef: memberId,
        period: { start: now },
        createdBy: memberId,
        createdAt: now,
        updatedAt: now,
      };

      const rolesCol = db.collection(SchemaCollection.HealthcareRole);
      await rolesCol.insertOne(adminRoleDoc as never);

      return {
        statusCode: 201,
        response: {
          success: true,
          data: orgDoc,
        } as unknown as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET / — List active organizations
   * @requirements 8.1, 8.2, 8.3
   */
  private async handleListOrganizations(
    req: unknown,
  ): Promise<{ statusCode: number; response: OrgApiResponse }> {
    try {
      const request = req as {
        query?: { search?: string; page?: string; limit?: string };
      };

      const db = this.getDb();
      if (!db) {
        return {
          statusCode: 503,
          response: { message: 'Database unavailable' } as ApiErrorResponse,
        };
      }

      const page = Math.max(1, parseInt(request.query?.page ?? '1', 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(request.query?.limit ?? '20', 10) || 20),
      );
      const search = request.query?.search;

      const orgsCol = db.collection(SchemaCollection.Organization);

      const filter: Record<string, unknown> = { active: true };
      if (search && search.trim().length > 0) {
        // Escape special regex characters in the search string
        const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter['name'] = { $regex: escaped, $options: 'i' };
      }

      const total = await orgsCol.countDocuments(filter);
      const skip = (page - 1) * limit;
      const docs = await orgsCol.find(filter).skip(skip).limit(limit).toArray();

      return {
        statusCode: 200,
        response: {
          success: true,
          data: docs,
          total,
          page,
          limit,
        } as unknown as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /:id — Get single organization
   * @requirements 8.1
   */
  private async handleGetOrganization(
    req: unknown,
  ): Promise<{ statusCode: number; response: OrgApiResponse }> {
    try {
      const request = req as { params?: { id?: string } };
      const id = request.params?.id;

      if (!id) {
        return validationError('Organization ID is required');
      }

      const db = this.getDb();
      if (!db) {
        return {
          statusCode: 503,
          response: { message: 'Database unavailable' } as ApiErrorResponse,
        };
      }

      const orgsCol = db.collection(SchemaCollection.Organization);
      const org = await orgsCol.findOne({ _id: id });

      if (!org) {
        return notFoundError('Organization', id);
      }

      return {
        statusCode: 200,
        response: {
          success: true,
          data: org,
        } as unknown as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * PUT /:id — Update organization (org admin only)
   * @requirements 2.1, 2.2, 2.3, 2.4, 2.5
   */
  private async handleUpdateOrganization(
    req: unknown,
  ): Promise<{ statusCode: number; response: OrgApiResponse }> {
    try {
      const request = req as {
        params?: { id?: string };
        body?: Record<string, unknown>;
        memberContext?: { memberId: string };
      };

      const id = request.params?.id;
      if (!id) {
        return validationError('Organization ID is required');
      }

      const memberId = request.memberContext?.memberId;
      if (!memberId) {
        return validationError('Authentication required');
      }

      const db = this.getDb();
      if (!db) {
        return {
          statusCode: 503,
          response: { message: 'Database unavailable' } as ApiErrorResponse,
        };
      }

      // Org admin guard
      const isAdmin = await this.isOrgAdmin(db, memberId, id);
      if (!isAdmin) {
        return forbiddenError(
          'Member does not hold ADMIN role at this organization',
        );
      }

      const orgsCol = db.collection(SchemaCollection.Organization);
      const existing = await orgsCol.findOne({ _id: id });
      if (!existing) {
        return notFoundError('Organization', id);
      }

      // Build update set from allowed fields only
      const allowedFields = [
        'name',
        'type',
        'telecom',
        'address',
        'active',
        'enrollmentMode',
      ];
      const updateSet: Record<string, unknown> = {};
      const body = request.body ?? {};

      for (const field of allowedFields) {
        if (field in body) {
          updateSet[field] = body[field];
        }
      }

      updateSet['updatedAt'] = new Date().toISOString();

      await orgsCol.updateOne({ _id: id }, { $set: updateSet });

      // Fetch updated document
      const updated = await orgsCol.findOne({ _id: id });

      return {
        statusCode: 200,
        response: {
          success: true,
          data: updated,
        } as unknown as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /:id/members — List org members grouped by role (org admin only)
   * @requirements 8.4
   */
  private async handleListOrgMembers(
    req: unknown,
  ): Promise<{ statusCode: number; response: OrgApiResponse }> {
    try {
      const request = req as {
        params?: { id?: string };
        memberContext?: { memberId: string };
      };

      const id = request.params?.id;
      if (!id) {
        return validationError('Organization ID is required');
      }

      const memberId = request.memberContext?.memberId;
      if (!memberId) {
        return validationError('Authentication required');
      }

      const db = this.getDb();
      if (!db) {
        return {
          statusCode: 503,
          response: { message: 'Database unavailable' } as ApiErrorResponse,
        };
      }

      // Org admin guard
      const isAdmin = await this.isOrgAdmin(db, memberId, id);
      if (!isAdmin) {
        return forbiddenError(
          'Member does not hold ADMIN role at this organization',
        );
      }

      const rolesCol = db.collection(SchemaCollection.HealthcareRole);
      const now = new Date().toISOString();

      // Query active roles at this org
      const activeRoles = await rolesCol
        .find({
          organizationId: id,
          $or: [
            { 'period.end': { $exists: false } },
            { 'period.end': null },
            { 'period.end': { $gt: now } },
          ],
        } as never)
        .toArray();

      // Group by roleCode
      const grouped: Record<string, Record<string, unknown>[]> = {};
      for (const role of activeRoles) {
        const doc = role as Record<string, unknown>;
        const code = doc['roleCode'] as string;
        if (!grouped[code]) {
          grouped[code] = [];
        }
        grouped[code].push(doc);
      }

      return {
        statusCode: 200,
        response: {
          success: true,
          data: grouped,
        } as unknown as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
