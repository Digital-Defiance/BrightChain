import {
  ADMIN,
  DENTIST,
  MEDICAL_ASSISTANT,
  PATIENT,
  PHYSICIAN,
  REGISTERED_NURSE,
  ROLE_CODE_DISPLAY,
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
import { DefaultBackendIdType } from '../../../shared-types';
import {
  forbiddenError,
  handleError,
  validationError,
} from '../../../utils/errorResponse';
import { BaseController } from '../../base';

type InvitationApiResponse = IApiMessageResponse | ApiErrorResponse;

interface InvitationHandlers extends TypedHandlers {
  createInvitation: ApiRequestHandler<InvitationApiResponse>;
  redeemInvitation: ApiRequestHandler<InvitationApiResponse>;
}

/**
 * Valid SNOMED CT role codes for invitations.
 * Includes all practitioner codes PLUS PATIENT, since invitations
 * can be used to onboard patients as well.
 */
const VALID_INVITATION_ROLE_CODES = new Set([
  PHYSICIAN,
  REGISTERED_NURSE,
  MEDICAL_ASSISTANT,
  DENTIST,
  VETERINARIAN,
  ADMIN,
  PATIENT,
]);

/**
 * Invitation management controller.
 *
 * Provides endpoints for creating and redeeming invitation tokens
 * for controlled onboarding of staff and patients to organizations.
 *
 * ## Endpoints
 *
 * ### POST /       — Create invitation (org admin or practitioner)
 * ### POST /redeem — Redeem invitation token (any authenticated member)
 *
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export class InvitationController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  InvitationApiResponse,
  InvitationHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/', {
        handlerKey: 'createInvitation',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('post', '/redeem', {
        handlerKey: 'redeemInvitation',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      createInvitation: this.handleCreateInvitation.bind(this),
      redeemInvitation: this.handleRedeemInvitation.bind(this),
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
   * Used to authorize invitation creation (admin OR any practitioner staff).
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
   * POST / — Create invitation
   * @requirements 5.1, 5.2, 5.6
   */
  private async handleCreateInvitation(
    req: unknown,
  ): Promise<{ statusCode: number; response: InvitationApiResponse }> {
    try {
      const request = req as {
        body?: {
          organizationId?: string;
          roleCode?: string;
          targetEmail?: string;
        };
        memberContext?: { memberId: string };
      };

      const callerMemberId = request.memberContext?.memberId;
      if (!callerMemberId) {
        return validationError('Authentication required');
      }

      const { organizationId, roleCode, targetEmail } = request.body ?? {};

      if (!organizationId) {
        return validationError('organizationId is required');
      }
      if (!roleCode) {
        return validationError('roleCode is required');
      }

      const db = this.getDb();
      if (!db) {
        return {
          statusCode: 503,
          response: { message: 'Database unavailable' } as ApiErrorResponse,
        };
      }

      // Authorization: caller must be admin or practitioner at the org
      const isStaff = await this.isStaffAtOrg(
        db,
        callerMemberId,
        organizationId,
      );
      if (!isStaff) {
        return forbiddenError(
          'Member does not hold an ADMIN or practitioner role at this organization',
        );
      }

      // Validate role code (all practitioner codes + PATIENT)
      if (!VALID_INVITATION_ROLE_CODES.has(roleCode)) {
        const validCodes = Array.from(VALID_INVITATION_ROLE_CODES).map(
          (code) => `${code} (${ROLE_CODE_DISPLAY[code]})`,
        );
        return {
          statusCode: 400,
          response: {
            success: false,
            error: {
              code: 'INVALID_ROLE_CODE',
              message: `Invalid role code. Valid codes: ${validCodes.join(', ')}`,
            },
          } as unknown as ApiErrorResponse,
        };
      }

      // Generate unique token and set expiry to 7 days
      const token = crypto.randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const invDoc: Record<string, unknown> = {
        _id: crypto.randomUUID(),
        token,
        organizationId,
        roleCode,
        createdBy: callerMemberId,
        expiresAt: expiresAt.toISOString(),
        createdAt: now.toISOString(),
      };

      if (targetEmail) {
        invDoc['targetEmail'] = targetEmail;
      }

      const invCol = db.collection(SchemaCollection.Invitation);
      await invCol.insertOne(invDoc as never);

      return {
        statusCode: 201,
        response: {
          success: true,
          data: invDoc,
        } as unknown as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /redeem — Redeem invitation token
   * @requirements 5.3, 5.4, 5.5
   */
  private async handleRedeemInvitation(
    req: unknown,
  ): Promise<{ statusCode: number; response: InvitationApiResponse }> {
    try {
      const request = req as {
        body?: { token?: string };
        memberContext?: { memberId: string };
      };

      const callerMemberId = request.memberContext?.memberId;
      if (!callerMemberId) {
        return validationError('Authentication required');
      }

      const { token } = request.body ?? {};
      if (!token) {
        return validationError('token is required');
      }

      const db = this.getDb();
      if (!db) {
        return {
          statusCode: 503,
          response: { message: 'Database unavailable' } as ApiErrorResponse,
        };
      }

      const invCol = db.collection(SchemaCollection.Invitation);
      const invitation = await invCol.findOne({ token });

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
        { token },
        { $set: { usedBy: callerMemberId, usedAt: now } },
      );

      // Create the corresponding healthcare role
      const roleCode = invDoc['roleCode'] as string;
      const organizationId = invDoc['organizationId'] as string;
      const isPatient = roleCode === PATIENT;

      const roleId = crypto.randomUUID();
      const roleDoc: Record<string, unknown> = {
        _id: roleId,
        memberId: callerMemberId,
        roleCode,
        roleDisplay: ROLE_CODE_DISPLAY[roleCode] ?? roleCode,
        organizationId,
        period: { start: now },
        createdBy: callerMemberId,
        createdAt: now,
        updatedAt: now,
      };

      if (isPatient) {
        roleDoc['patientRef'] = callerMemberId;
      } else {
        roleDoc['practitionerRef'] = callerMemberId;
      }

      const rolesCol = db.collection(SchemaCollection.HealthcareRole);
      await rolesCol.insertOne(roleDoc as never);

      return {
        statusCode: 201,
        response: {
          success: true,
          data: { invitation: invDoc, role: roleDoc },
        } as unknown as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
