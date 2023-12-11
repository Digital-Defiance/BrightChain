import { MemberStore } from '@brightchain/brightchain-lib';
import { IIdProvider } from '@digitaldefiance/ecies-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  ApiResponse,
  IApiMessageResponse,
  IStatusCodeResponse,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import {
  IMemberProfileResponse,
  IMemberProfileUpdateRequest,
  IMemberPublicProfileResponse,
} from '../../interfaces/member';
import { IRequestUser } from '../../interfaces/request-user';
import { DefaultBackendIdType } from '../../shared-types';
import { BaseController } from '../base';

/**
 * Helper type for member request with typed properties
 */
interface IMemberRequestData {
  params?: { memberId?: string };
  user?: IRequestUser<string>;
  body?: IMemberProfileUpdateRequest;
}

interface IMembersHandlers {
  [key: string]: ApiRequestHandler<ApiResponse>;
  getMembers: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getMemberProfile: ApiRequestHandler<ApiResponse>;
  updateMemberProfile: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  >;
}

/**
 * Controller for member operations
 */
export class MembersController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  IApiMessageResponse | ApiErrorResponse,
  IMembersHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.handlers = {
      getMembers: this.handleGetMembers.bind(this),
      getMemberProfile: this.handleGetMemberProfile.bind(this),
      updateMemberProfile: this.handleUpdateMemberProfile.bind(this),
    };
  }

  private async handleGetMembers(
    _req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    return {
      statusCode: 200,
      response: {
        message: 'Members not implemented yet',
      },
    };
  }

  private async handleGetMemberProfile(
    req: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  ): Promise<IStatusCodeResponse<ApiResponse>> {
    // Cast to typed interface for internal use
    const request = req as IMemberRequestData;
    try {
      const memberStore =
        this.application.services.get<MemberStore<TID>>('memberStore');
      if (!memberStore) {
        return {
          statusCode: 500,
          response: {
            message: 'MemberStore service not available',
            error: 'MemberStore service not available',
          },
        };
      }

      // Get member ID from request params or authenticated user
      const memberId = request.params?.memberId || request.user?.id;
      if (!memberId) {
        return {
          statusCode: 400,
          response: {
            message: 'Member ID is required',
            error: 'Member ID is required',
          },
        };
      }

      // Resolve the canonical idProvider from the service container
      const idProvider = this.application.services.get('idProvider') as
        | IIdProvider<TID>
        | undefined;

      if (!idProvider) {
        return {
          statusCode: 500,
          response: {
            message: 'ID provider service not available',
            error: 'ID_PROVIDER_UNAVAILABLE',
          },
        };
      }

      // Validate the member ID before converting — reject invalid formats with HTTP 400
      const parsedId = idProvider.parseSafe(memberId);
      if (parsedId === undefined || parsedId === null) {
        return {
          statusCode: 400,
          response: {
            message: 'Invalid member ID format',
            error: 'INVALID_ID',
          },
        };
      }

      const memberIdBytes = idProvider.idFromString(memberId);

      // Fetch profile data
      const { publicProfile, privateProfile } =
        await memberStore.getMemberProfile(memberIdBytes as TID);

      // Convert to response format
      const response: IMemberProfileResponse = {
        publicProfile: publicProfile
          ? {
              id: idProvider.toString(publicProfile.id, 'hex'),
              status: publicProfile.status,
              reputation: publicProfile.reputation,
              storageQuota: publicProfile.storageQuota.toString(),
              storageUsed: publicProfile.storageUsed.toString(),
              lastActive: publicProfile.lastActive.toISOString(),
              dateCreated: publicProfile.dateCreated.toISOString(),
              dateUpdated: publicProfile.dateUpdated.toISOString(),
            }
          : (null as unknown as IMemberPublicProfileResponse),
      } as IMemberProfileResponse;

      // Include private profile only if requested by the member themselves
      if (privateProfile && request.user?.id === memberId) {
        response.privateProfile = {
          id: idProvider.toString(privateProfile.id, 'hex'),
          trustedPeers: privateProfile.trustedPeers.map((peerId) =>
            idProvider.toString(peerId, 'hex'),
          ),
          blockedPeers: privateProfile.blockedPeers.map((peerId) =>
            idProvider.toString(peerId, 'hex'),
          ),
          settings: privateProfile.settings,
          activityLog: privateProfile.activityLog.map((entry) => ({
            action: entry.action,
            timestamp: entry.timestamp.toISOString(),
            details: entry.details,
          })),
          dateCreated: privateProfile.dateCreated.toISOString(),
          dateUpdated: privateProfile.dateUpdated.toISOString(),
        };
      }

      return {
        statusCode: 200,
        response: response as unknown as ApiResponse,
      };
    } catch (error) {
      console.error('Error fetching member profile:', error);
      return {
        statusCode: 500,
        response: {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to fetch member profile',
          error:
            error instanceof Error
              ? error.message
              : 'Failed to fetch member profile',
        },
      };
    }
  }

  private async handleUpdateMemberProfile(
    req: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    // Cast to typed interface for internal use
    const request = req as IMemberRequestData;
    try {
      const memberStore =
        this.application.services.get<MemberStore<TID>>('memberStore');
      if (!memberStore) {
        return {
          statusCode: 500,
          response: {
            message: 'MemberStore service not available',
            error: 'MemberStore service not available',
          },
        };
      }

      // Only allow members to update their own profile
      const memberId = request.user?.id;
      if (!memberId) {
        return {
          statusCode: 401,
          response: {
            message: 'Authentication required',
            error: 'Authentication required',
          },
        };
      }

      const updateRequest = request.body;
      if (!updateRequest) {
        return {
          statusCode: 400,
          response: {
            message: 'Update request body is required',
            error: 'Update request body is required',
          },
        };
      }

      // TODO: Implement actual profile update logic
      // This will involve:
      // 1. Fetching current MemberProfileDocument
      // 2. Applying updates (settings, trusted/blocked peers)
      // 3. Generating new CBLs
      // 4. Storing updated profile blocks
      // 5. Updating member index

      return {
        statusCode: 501,
        response: {
          message:
            'Profile update functionality not yet fully implemented - requires CBL deserialization',
          error: 'NOT_IMPLEMENTED',
        },
      };
    } catch (error) {
      console.error('Error updating member profile:', error);
      return {
        statusCode: 500,
        response: {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to update member profile',
          error:
            error instanceof Error
              ? error.message
              : 'Failed to update member profile',
        },
      };
    }
  }
}
