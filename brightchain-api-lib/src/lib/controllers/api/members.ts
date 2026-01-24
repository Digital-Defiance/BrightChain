import { MemberStore, uint8ArrayToHex } from '@brightchain/brightchain-lib';
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
import { DefaultBackendIdType } from '../../shared-types';
import { BaseController } from '../base';

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
    req: any,
  ): Promise<IStatusCodeResponse<ApiResponse>> {
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
      const memberId = (req as any).params?.memberId || (req as any).user?.id;
      if (!memberId) {
        return {
          statusCode: 400,
          response: {
            message: 'Member ID is required',
            error: 'Member ID is required',
          },
        };
      }

      // Convert string ID to TID type
      const idProvider = this.application.services.get('idProvider') as any;
      const memberIdBytes = idProvider?.fromString
        ? idProvider.fromString(memberId)
        : Buffer.from(memberId, 'hex');

      // Fetch profile data
      const { publicProfile, privateProfile } =
        await memberStore.getMemberProfile(memberIdBytes as TID);

      // Convert to response format
      const response: IMemberProfileResponse = {
        publicProfile: publicProfile
          ? {
              id: uint8ArrayToHex(
                idProvider?.toBytes
                  ? idProvider.toBytes(publicProfile.id)
                  : (publicProfile.id as Uint8Array),
              ),
              status: publicProfile.status,
              reputation: publicProfile.reputation,
              storageQuota: publicProfile.storageQuota.toString(),
              storageUsed: publicProfile.storageUsed.toString(),
              lastActive: publicProfile.lastActive.toISOString(),
              dateCreated: publicProfile.dateCreated.toISOString(),
              dateUpdated: publicProfile.dateUpdated.toISOString(),
            }
          : (null as unknown as IMemberPublicProfileResponse), // Fallback for TypeScript
      } as IMemberProfileResponse;

      // Include private profile only if requested by the member themselves
      if (privateProfile && (req as any).user?.id === memberId) {
        response.privateProfile = {
          id: uint8ArrayToHex(
            idProvider?.toBytes
              ? idProvider.toBytes(privateProfile.id)
              : (privateProfile.id as Uint8Array),
          ),
          trustedPeers: privateProfile.trustedPeers.map((peerId) =>
            uint8ArrayToHex(
              idProvider?.toBytes
                ? idProvider.toBytes(peerId)
                : (peerId as Uint8Array),
            ),
          ),
          blockedPeers: privateProfile.blockedPeers.map((peerId) =>
            uint8ArrayToHex(
              idProvider?.toBytes
                ? idProvider.toBytes(peerId)
                : (peerId as Uint8Array),
            ),
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
            error instanceof Error ? error.message : 'Failed to fetch member profile',
        },
      };
    }
  }

  private async handleUpdateMemberProfile(
    req: any,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
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
      const memberId = (req as any).user?.id;
      if (!memberId) {
        return {
          statusCode: 401,
          response: {
            message: 'Authentication required',
            error: 'Authentication required',
          },
        };
      }

      const updateRequest = req.body as IMemberProfileUpdateRequest;
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
            error instanceof Error ? error.message : 'Failed to update member profile',
        },
      };
    }
  }
}
