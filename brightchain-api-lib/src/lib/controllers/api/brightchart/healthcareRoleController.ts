import {
  ADMIN,
  DENTIST,
  getRoleCodeDisplay,
  MEDICAL_ASSISTANT,
  PATIENT,
  PHYSICIAN,
  REGISTERED_NURSE,
  VETERINARIAN,
} from '@brightchain/brightchart-lib';
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
import { orgAdminGuard } from '../../../middlewares/orgAdminGuard';
import { DefaultBackendIdType } from '../../../shared-types';
import {
  forbiddenError,
  handleError,
  notFoundError,
  validationError,
} from '../../../utils/errorResponse';
import { BaseController } from '../../base';

type RoleApiResponse = IApiMessageResponse | ApiErrorResponse;

interface HealthcareRoleHandlers extends TypedHandlers {
  getMyRoles: ApiRequestHandler<RoleApiResponse>;
  assignStaff: ApiRequestHandler<RoleApiResponse>;
  registerPatient: ApiRequestHandler<RoleApiResponse>;
  removeRole: ApiRequestHandler<RoleApiResponse>;
}

/**
 * Valid SNOMED CT practitioner role codes for staff assignment.
 * PATIENT is excluded — patients are registered via the /patient endpoint.
 */
const VALID_PRACTITIONER_CODES = new Set([
  PHYSICIAN,
  REGISTERED_NURSE,
  MEDICAL_ASSISTANT,
  DENTIST,
  VETERINARIAN,
  ADMIN,
]);

/**
 * Healthcare Role management controller.
 *
 * Provides endpoints for retrieving, assigning, and removing healthcare roles
 * following FHIR PractitionerRole conventions with SNOMED CT codes.
 *
 * ## Endpoints
 *
 * ### GET /         — Get my healthcare roles
 * ### POST /staff   — Assign staff role (org admin only)
 * ### POST /patient — Register patient (self-service or staff-initiated)
 * ### DELETE /:id   — Remove role (org admin only)
 *
 * @requirements 6.1, 3.1, 4.1, 7.1
 */
export class HealthcareRoleController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  RoleApiResponse,
  HealthcareRoleHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/', {
        handlerKey: 'getMyRoles',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('post', '/staff', {
        handlerKey: 'assignStaff',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('post', '/patient', {
        handlerKey: 'registerPatient',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/:id', {
        handlerKey: 'removeRole',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      getMyRoles: this.handleGetMyRoles.bind(this),
      assignStaff: this.handleAssignStaff.bind(this),
      registerPatient: this.handleRegisterPatient.bind(this),
      removeRole: this.handleRemoveRole.bind(this),
    };
  }

  // ── Helpers ──

  private getDb(): BrightDb | undefined {
    return this.application.services.has('db')
      ? (this.application.services.get('db') as BrightDb)
      : undefined;
  }

  /**
   * Check whether a member holds an active practitioner or admin role at an org.
   */
  private async isStaffAtOrg(
    db: BrightDb,
    memberId: string,
    organizationId: string,
  ): Promise<boolean> {
    const rolesCol = db.collection(SchemaCollection.HealthcareRole);
    const now = new Date().toISOString();
    const role = await rolesCol.findOne({
      memberId,
      organizationId,
      roleCode: { $ne: PATIENT },
      $or: [
        { 'period.end': { $exists: false } },
        { 'period.end': null },
        { 'period.end': { $gt: now } },
      ],
    } as never);
    return role !== null && role !== undefined;
  }

  // ── Handlers ──

  /**
   * GET / — Get my healthcare roles
   * @requirements 6.1, 6.2, 6.3, 6.4
   */
  private async handleGetMyRoles(
    req: unknown,
  ): Promise<{ statusCode: number; response: RoleApiResponse }> {
    try {
      const request = req as {
        memberContext?: { memberId: string };
      };

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

      const rolesCol = db.collection(SchemaCollection.HealthcareRole);
      const now = new Date().toISOString();

      // Query active roles for this member
      const activeRoles = await rolesCol
        .find({
          memberId,
          $or: [
            { 'period.end': { $exists: false } },
            { 'period.end': null },
            { 'period.end': { $gt: now } },
          ],
        } as never)
        .toArray();

      // Resolve organization display names
      const orgsCol = db.collection(SchemaCollection.Organization);
      const mapped = await Promise.all(
        activeRoles.map(async (role) => {
          const doc = role as Record<string, unknown>;
          const orgId = doc['organizationId'] as string;
          const org = await orgsCol.findOne({ _id: orgId });
          const orgName = org
            ? ((org as Record<string, unknown>)['name'] as string)
            : undefined;

          return {
            roleCode: doc['roleCode'],
            roleDisplay: doc['roleDisplay'],
            specialty: doc['specialty'],
            organization: {
              reference: `Organization/${orgId}`,
              display: orgName,
            },
            practitioner: doc['practitionerRef']
              ? {
                  reference: `Practitioner/${doc['practitionerRef']}`,
                  display: doc['practitionerRef'],
                }
              : undefined,
            patient: doc['patientRef']
              ? {
                  reference: `Patient/${doc['patientRef']}`,
                  display: doc['patientRef'],
                }
              : undefined,
            period: doc['period'],
          };
        }),
      );

      return {
        statusCode: 200,
        response: {
          success: true,
          data: mapped,
        } as unknown as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /staff — Assign staff role
   * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 2.5
   */
  private async handleAssignStaff(
    req: unknown,
  ): Promise<{ statusCode: number; response: RoleApiResponse }> {
    try {
      const request = req as {
        body?: {
          memberId?: string;
          roleCode?: string;
          organizationId?: string;
        };
        memberContext?: { memberId: string };
      };

      const callerMemberId = request.memberContext?.memberId;
      if (!callerMemberId) {
        return validationError('Authentication required');
      }

      const {
        memberId: targetMemberId,
        roleCode,
        organizationId,
      } = request.body ?? {};

      if (!targetMemberId) {
        return validationError('memberId is required');
      }
      if (!roleCode) {
        return validationError('roleCode is required');
      }
      if (!organizationId) {
        return validationError('organizationId is required');
      }

      const db = this.getDb();
      if (!db) {
        return {
          statusCode: 503,
          response: { message: 'Database unavailable' } as ApiErrorResponse,
        };
      }

      // Org admin guard
      const isAdmin = await orgAdminGuard(db, callerMemberId, organizationId);
      if (!isAdmin) {
        return forbiddenError(
          'Member does not hold ADMIN role at this organization',
        );
      }

      // Validate role code
      if (!VALID_PRACTITIONER_CODES.has(roleCode)) {
        const validCodes = Array.from(VALID_PRACTITIONER_CODES).map(
          (code) => `${code} (${getRoleCodeDisplay(code)})`,
        );
        return {
          statusCode: 400,
          response: {
            success: false,
            error: {
              code: 'INVALID_ROLE_CODE',
              message: `Invalid role code. Valid practitioner codes: ${validCodes.join(', ')}`,
            },
          } as unknown as ApiErrorResponse,
        };
      }

      // Validate org is active
      const orgsCol = db.collection(SchemaCollection.Organization);
      const org = await orgsCol.findOne({ _id: organizationId });
      if (!org || !(org as Record<string, unknown>)['active']) {
        return {
          statusCode: 400,
          response: {
            success: false,
            error: {
              code: 'INACTIVE_ORGANIZATION',
              message: 'Organization is not active',
            },
          } as unknown as ApiErrorResponse,
        };
      }

      // Check for duplicate
      const rolesCol = db.collection(SchemaCollection.HealthcareRole);
      const now = new Date().toISOString();
      const existing = await rolesCol.findOne({
        memberId: targetMemberId,
        roleCode,
        organizationId,
        $or: [
          { 'period.end': { $exists: false } },
          { 'period.end': null },
          { 'period.end': { $gt: now } },
        ],
      } as never);

      if (existing) {
        return {
          statusCode: 409,
          response: {
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'Member already holds this role at this organization',
            },
          } as unknown as ApiErrorResponse,
        };
      }

      // Create the role
      const roleId = crypto.randomUUID();
      const roleDoc: Record<string, unknown> = {
        _id: roleId,
        memberId: targetMemberId,
        roleCode,
        roleDisplay: getRoleCodeDisplay(roleCode),
        organizationId,
        practitionerRef: targetMemberId,
        period: { start: now },
        createdBy: callerMemberId,
        createdAt: now,
        updatedAt: now,
      };

      await rolesCol.insertOne(roleDoc as never);

      return {
        statusCode: 201,
        response: {
          success: true,
          data: roleDoc,
        } as unknown as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /patient — Register patient
   * @requirements 4.1, 4.2, 4.3, 4.4, 4.5, 2.2, 2.3
   */
  private async handleRegisterPatient(
    req: unknown,
  ): Promise<{ statusCode: number; response: RoleApiResponse }> {
    try {
      const request = req as {
        body?: {
          organizationId?: string;
          targetMemberId?: string;
          invitationToken?: string;
        };
        memberContext?: { memberId: string };
      };

      const callerMemberId = request.memberContext?.memberId;
      if (!callerMemberId) {
        return validationError('Authentication required');
      }

      const { organizationId, targetMemberId, invitationToken } =
        request.body ?? {};

      if (!organizationId) {
        return validationError('organizationId is required');
      }

      const db = this.getDb();
      if (!db) {
        return {
          statusCode: 503,
          response: { message: 'Database unavailable' } as ApiErrorResponse,
        };
      }

      // Resolve the org
      const orgsCol = db.collection(SchemaCollection.Organization);
      const org = await orgsCol.findOne({ _id: organizationId });
      if (!org) {
        return notFoundError('Organization', organizationId);
      }
      const orgDoc = org as Record<string, unknown>;

      // Determine the patient member ID
      let patientMemberId: string;
      let isStaffInitiated = false;

      if (targetMemberId) {
        // Staff-initiated registration — caller must be admin or practitioner
        const callerIsStaff = await this.isStaffAtOrg(
          db,
          callerMemberId,
          organizationId,
        );
        if (!callerIsStaff) {
          return forbiddenError(
            'Only admin or practitioner staff can register patients on behalf of others',
          );
        }
        patientMemberId = targetMemberId;
        isStaffInitiated = true;
      } else {
        // Self-registration
        patientMemberId = callerMemberId;
      }

      // Enrollment mode check (only for self-registration)
      if (!isStaffInitiated) {
        const enrollmentMode = orgDoc['enrollmentMode'] as string;

        if (enrollmentMode === 'invite-only') {
          if (!invitationToken) {
            return {
              statusCode: 403,
              response: {
                success: false,
                error: {
                  code: 'INVITATION_REQUIRED',
                  message:
                    'Organization requires an invitation for registration',
                },
              } as unknown as ApiErrorResponse,
            };
          }

          // Validate and redeem invitation
          const invCol = db.collection(SchemaCollection.Invitation);
          const invitation = await invCol.findOne({ token: invitationToken });

          if (!invitation) {
            return {
              statusCode: 410,
              response: {
                success: false,
                error: {
                  code: 'GONE',
                  message: 'Invitation token is invalid',
                },
              } as unknown as ApiErrorResponse,
            };
          }

          const invDoc = invitation as Record<string, unknown>;

          // Check if already used
          if (invDoc['usedBy']) {
            return {
              statusCode: 410,
              response: {
                success: false,
                error: {
                  code: 'GONE',
                  message: 'Invitation has already been redeemed',
                },
              } as unknown as ApiErrorResponse,
            };
          }

          // Check if expired
          const expiresAt = invDoc['expiresAt'] as string;
          if (new Date(expiresAt) < new Date()) {
            return {
              statusCode: 410,
              response: {
                success: false,
                error: {
                  code: 'GONE',
                  message: 'Invitation has expired',
                },
              } as unknown as ApiErrorResponse,
            };
          }

          // Mark invitation as used
          const now = new Date().toISOString();
          await invCol.updateOne(
            { token: invitationToken },
            { $set: { usedBy: callerMemberId, usedAt: now } },
          );
        }
      }

      // Check for duplicate patient role
      const rolesCol = db.collection(SchemaCollection.HealthcareRole);
      const now = new Date().toISOString();
      const existingPatient = await rolesCol.findOne({
        memberId: patientMemberId,
        roleCode: PATIENT,
        organizationId,
        $or: [
          { 'period.end': { $exists: false } },
          { 'period.end': null },
          { 'period.end': { $gt: now } },
        ],
      } as never);

      if (existingPatient) {
        return {
          statusCode: 409,
          response: {
            success: false,
            error: {
              code: 'CONFLICT',
              message:
                'Member already holds a PATIENT role at this organization',
            },
          } as unknown as ApiErrorResponse,
        };
      }

      // Create the patient role
      const roleId = crypto.randomUUID();
      const roleDoc: Record<string, unknown> = {
        _id: roleId,
        memberId: patientMemberId,
        roleCode: PATIENT,
        roleDisplay: getRoleCodeDisplay(PATIENT),
        organizationId,
        patientRef: patientMemberId,
        period: { start: now },
        createdBy: callerMemberId,
        createdAt: now,
        updatedAt: now,
      };

      await rolesCol.insertOne(roleDoc as never);

      return {
        statusCode: 201,
        response: {
          success: true,
          data: roleDoc,
        } as unknown as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * DELETE /:id — Remove role (soft-delete)
   * @requirements 7.1, 7.2, 7.3, 7.4
   */
  private async handleRemoveRole(
    req: unknown,
  ): Promise<{ statusCode: number; response: RoleApiResponse }> {
    try {
      const request = req as {
        params?: { id?: string };
        body?: { organizationId?: string };
        memberContext?: { memberId: string };
      };

      const callerMemberId = request.memberContext?.memberId;
      if (!callerMemberId) {
        return validationError('Authentication required');
      }

      const roleId = request.params?.id;
      if (!roleId) {
        return validationError('Role ID is required');
      }

      const db = this.getDb();
      if (!db) {
        return {
          statusCode: 503,
          response: { message: 'Database unavailable' } as ApiErrorResponse,
        };
      }

      const rolesCol = db.collection(SchemaCollection.HealthcareRole);

      // Find the role
      const role = await rolesCol.findOne({ _id: roleId });
      if (!role) {
        return notFoundError('HealthcareRole', roleId);
      }

      const roleDoc = role as Record<string, unknown>;
      const organizationId = roleDoc['organizationId'] as string;

      // Org admin guard
      const isAdmin = await orgAdminGuard(db, callerMemberId, organizationId);
      if (!isAdmin) {
        return forbiddenError(
          'Member does not hold ADMIN role at this organization',
        );
      }

      // Verify role belongs to the org (already confirmed by finding it with the orgId)
      // Check if already soft-deleted
      const period = roleDoc['period'] as { start: string; end?: string };
      if (period.end && new Date(period.end) < new Date()) {
        return notFoundError('HealthcareRole', roleId);
      }

      // Check if this is the last ADMIN role at the org
      if (roleDoc['roleCode'] === ADMIN) {
        const now = new Date().toISOString();
        const activeAdmins = await rolesCol
          .find({
            organizationId,
            roleCode: ADMIN,
            $or: [
              { 'period.end': { $exists: false } },
              { 'period.end': null },
              { 'period.end': { $gt: now } },
            ],
          } as never)
          .toArray();

        if (activeAdmins.length <= 1) {
          return {
            statusCode: 400,
            response: {
              success: false,
              error: {
                code: 'LAST_ADMIN',
                message: 'Organization must retain at least one administrator',
              },
            } as unknown as ApiErrorResponse,
          };
        }
      }

      // Soft-delete: set period.end
      const now = new Date().toISOString();
      await rolesCol.updateOne(
        { _id: roleId },
        { $set: { 'period.end': now, updatedAt: now } },
      );

      return {
        statusCode: 200,
        response: {
          success: true,
          data: { _id: roleId, 'period.end': now },
        } as unknown as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
