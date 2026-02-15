/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CanUnlockResult,
  IQuorumMember,
  QuorumDocumentInfo,
  QuorumError,
  QuorumMemberMetadata,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import {
  EmailString,
  Member,
  MemberType,
  SecureString,
  ShortHexGuid,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { GuidV4Buffer } from '@digitaldefiance/node-ecies-lib/src/types/guid-versions';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  routeConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { QuorumServiceWrapper } from '../../services/quorum';
import { DefaultBackendIdType } from '../../shared-types';
import {
  createApiErrorResult,
  ErrorCode,
  handleError,
  mapQuorumError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';
import { SessionsController } from './sessions';

/**
 * Error codes for quorum API operations
 * @deprecated Use ErrorCode from '../../utils/errorResponse' instead
 */
export enum QuorumErrorCode {
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  INSUFFICIENT_SHARES = 'INSUFFICIENT_SHARES',
  SHARE_DECRYPTION_FAILED = 'SHARE_DECRYPTION_FAILED',
  INVALID_MEMBER_COUNT = 'INVALID_MEMBER_COUNT',
  INVALID_THRESHOLD = 'INVALID_THRESHOLD',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// === Request/Response Interfaces ===

interface AddMemberRequest {
  body: {
    name: string;
    email?: string;
    role?: string;
  };
}

interface AddMemberResponse extends IApiMessageResponse {
  member: SerializedQuorumMember;
  mnemonic: string; // Return mnemonic so user can recover their key
  [key: string]: any;
}

interface ListMembersResponse extends IApiMessageResponse {
  members: SerializedQuorumMember[];
  [key: string]: any;
}

interface RemoveMemberRequest {
  params: {
    memberId: string;
  };
}

interface RemoveMemberResponse extends IApiMessageResponse {
  success: boolean;
  memberId: string;
  [key: string]: any;
}

interface SealDocumentRequest {
  body: {
    document: unknown;
    memberIds: string[];
    sharesRequired?: number;
  };
}

interface SealDocumentResponse extends IApiMessageResponse {
  documentId: string;
  memberIds: string[];
  sharesRequired: number;
  createdAt: string;
  [key: string]: any;
}

interface UnsealDocumentRequest {
  params: {
    documentId: string;
  };
  body: {
    memberCredentials: Array<{
      memberId: string;
      mnemonic: string;
    }>;
  };
}

interface UnsealDocumentResponse extends IApiMessageResponse {
  document: unknown;
  [key: string]: any;
}

interface GetDocumentRequest {
  params: {
    documentId: string;
  };
}

interface GetDocumentResponse extends IApiMessageResponse {
  document: QuorumDocumentInfo;
  [key: string]: any;
}

interface CanUnlockRequest {
  params: {
    documentId: string;
  };
  query: {
    memberIds: string; // comma-separated
  };
}

interface CanUnlockResponse extends IApiMessageResponse, CanUnlockResult {
  [key: string]: any;
}

/**
 * Serialized quorum member for API responses
 */
interface SerializedQuorumMember {
  id: string;
  publicKey: string; // hex encoded
  metadata: QuorumMemberMetadata;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Serialize a quorum member for API response
 */
function serializeMember<TID extends PlatformID>(
  member: IQuorumMember<TID>,
): SerializedQuorumMember {
  return {
    id: member.id,
    publicKey: Buffer.from(member.publicKey).toString('hex'),
    metadata: member.metadata,
    isActive: member.isActive,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

type QuorumApiResponse =
  | AddMemberResponse
  | ListMembersResponse
  | RemoveMemberResponse
  | SealDocumentResponse
  | UnsealDocumentResponse
  | GetDocumentResponse
  | CanUnlockResponse
  | ApiErrorResponse;

interface QuorumHandlers extends TypedHandlers {
  addMember: ApiRequestHandler<AddMemberResponse | ApiErrorResponse>;
  listMembers: ApiRequestHandler<ListMembersResponse | ApiErrorResponse>;
  removeMember: ApiRequestHandler<RemoveMemberResponse | ApiErrorResponse>;
  sealDocument: ApiRequestHandler<SealDocumentResponse | ApiErrorResponse>;
  unsealDocument: ApiRequestHandler<UnsealDocumentResponse | ApiErrorResponse>;
  getDocument: ApiRequestHandler<GetDocumentResponse | ApiErrorResponse>;
  canUnlock: ApiRequestHandler<CanUnlockResponse | ApiErrorResponse>;
}

/**
 * Controller for quorum operations including member management
 * and document sealing/unsealing.
 *
 * Provides REST API endpoints for managing quorum members and performing
 * secure multi-party document operations using Shamir's Secret Sharing.
 *
 * ## Endpoints
 *
 * ### Member Management
 *
 * #### POST /api/quorum/members
 * Add a new member to the quorum with generated cryptographic keys.
 *
 * **Request Body:**
 * - `name` (string, required): Member's display name
 * - `email` (string, optional): Member's email address
 * - `role` (string, optional): Member's role in the quorum
 *
 * **Response:** Member details and mnemonic for key recovery
 *
 * #### GET /api/quorum/members
 * List all active quorum members.
 *
 * **Response:** Array of member objects with public keys and metadata
 *
 * #### DELETE /api/quorum/members/:memberId
 * Remove a member from the quorum (deactivate).
 *
 * **Parameters:**
 * - `memberId` (string, required): Member's unique identifier
 *
 * **Response:** Success confirmation
 *
 * ### Document Operations
 *
 * #### POST /api/quorum/documents/seal
 * Seal a document using Shamir's Secret Sharing.
 *
 * **Request Body:**
 * - `document` (any, required): Document to seal (JSON-serializable)
 * - `memberIds` (string[], required): Array of member IDs (minimum 2)
 * - `sharesRequired` (number, optional): Threshold for unsealing (default: all members)
 *
 * **Response:** Document ID and sealing metadata
 *
 * #### POST /api/quorum/documents/:documentId/unseal
 * Unseal a document using member shares.
 *
 * **Parameters:**
 * - `documentId` (string, required): Document's unique identifier
 *
 * **Request Body:**
 * - `memberIds` (string[], required): Array of member IDs providing shares
 *
 * **Response:** Original document content
 *
 * #### GET /api/quorum/documents/:documentId
 * Get metadata for a sealed document.
 *
 * **Parameters:**
 * - `documentId` (string, required): Document's unique identifier
 *
 * **Response:** Document metadata (member IDs, threshold, creation date)
 *
 * #### GET /api/quorum/documents/:documentId/can-unlock
 * Check if a set of members can unlock a document.
 *
 * **Parameters:**
 * - `documentId` (string, required): Document's unique identifier
 *
 * **Query Parameters:**
 * - `memberIds` (string, required): Comma-separated list of member IDs
 *
 * **Response:** Unlock status and share count information
 *
 * @requirements 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.1, 10.2, 10.3, 10.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */
export class QuorumController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  QuorumApiResponse,
  QuorumHandlers,
  CoreLanguageCode
> {
  private quorumServiceWrapper: QuorumServiceWrapper<TID>;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
    this.quorumServiceWrapper = new QuorumServiceWrapper(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      // Member management endpoints
      routeConfig('post', '/members', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'addMember',
      }),
      routeConfig('get', '/members', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'listMembers',
      }),
      routeConfig('delete', '/members/:memberId', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'removeMember',
      }),
      // Document sealing/unsealing endpoints
      routeConfig('post', '/documents/seal', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'sealDocument',
      }),
      routeConfig('post', '/documents/:documentId/unseal', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'unsealDocument',
      }),
      routeConfig('get', '/documents/:documentId', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'getDocument',
      }),
      routeConfig('get', '/documents/:documentId/can-unlock', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'canUnlock',
      }),
    ];

    this.handlers = {
      addMember: this.handleAddMember.bind(this),
      listMembers: this.handleListMembers.bind(this),
      removeMember: this.handleRemoveMember.bind(this),
      sealDocument: this.handleSealDocument.bind(this),
      unsealDocument: this.handleUnsealDocument.bind(this),
      getDocument: this.handleGetDocument.bind(this),
      canUnlock: this.handleCanUnlock.bind(this),
    };
  }

  // === Member Management Handlers ===

  /**
   * POST /api/quorum/members
   * Add a new member to the quorum with generated cryptographic keys.
   *
   * Creates a new member with ECIES key pair and adds them to the quorum.
   * The mnemonic phrase is returned for key recovery - it should be stored
   * securely by the user as it cannot be retrieved later.
   *
   * @param req - Request containing member name and optional metadata
   * @returns Member details and mnemonic on success
   *
   * @example
   * ```json
   * // Request
   * POST /api/quorum/members
   * {
   *   "name": "Alice",
   *   "email": "alice@example.com",
   *   "role": "admin"
   * }
   *
   * // Response
   * {
   *   "message": "Member added successfully",
   *   "member": {
   *     "id": "abc123...",
   *     "publicKey": "04...",
   *     "metadata": { "name": "Alice", "email": "alice@example.com", "role": "admin" },
   *     "isActive": true,
   *     "createdAt": "2025-01-16T10:00:00Z",
   *     "updatedAt": "2025-01-16T10:00:00Z"
   *   },
   *   "mnemonic": "word1 word2 word3..."
   * }
   * ```
   */
  private async handleAddMember(
    req: Parameters<ApiRequestHandler<AddMemberResponse | ApiErrorResponse>>[0],
  ) {
    try {
      const { name, email, role } = (req as unknown as AddMemberRequest).body;

      // Validate required fields
      if (!name) {
        return validationError('Missing required field: name');
      }

      // Create a new member with generated keys
      const eciesService =
        ServiceProvider.getInstance<GuidV4Buffer>().eciesService;
      const emailString = email
        ? new EmailString(email)
        : new EmailString(
            `${name.toLowerCase().replace(/\s+/g, '.')}@placeholder.local`,
          );
      const memberWithMnemonic = Member.newMember<GuidV4Buffer>(
        eciesService,
        MemberType.User,
        name,
        emailString,
      );

      const metadata: QuorumMemberMetadata = {
        name,
        email,
        role,
      };

      const quorumService = this.quorumServiceWrapper.getService();
      const quorumMember = await quorumService.addMember(
        memberWithMnemonic.member,
        metadata,
      );

      return {
        statusCode: 201,
        response: {
          message: 'Member added successfully',
          member: serializeMember(quorumMember),
          mnemonic: memberWithMnemonic.mnemonic.value ?? '',
        },
      };
    } catch (_error) {
      if (_error instanceof QuorumError) {
        return mapQuorumError(_error);
      }
      return handleError(_error);
    }
  }

  /**
   * GET /api/quorum/members
   * List all active quorum members.
   *
   * Returns all members that are currently active in the quorum.
   * Inactive (removed) members are not included in the response.
   *
   * @param _req - Request (no parameters required)
   * @returns Array of member objects on success
   *
   * @example
   * ```json
   * // Request
   * GET /api/quorum/members
   *
   * // Response
   * {
   *   "message": "Members retrieved successfully",
   *   "members": [
   *     {
   *       "id": "abc123...",
   *       "publicKey": "04...",
   *       "metadata": { "name": "Alice", "role": "admin" },
   *       "isActive": true,
   *       "createdAt": "2025-01-16T10:00:00Z",
   *       "updatedAt": "2025-01-16T10:00:00Z"
   *     }
   *   ]
   * }
   * ```
   */
  private async handleListMembers(
    _req: Parameters<ApiRequestHandler<ListMembersResponse | ApiErrorResponse>>[0],
  ) {
    try {
      const quorumService = this.quorumServiceWrapper.getService();
      const members = await quorumService.listMembers();

      return {
        statusCode: 200,
        response: {
          message: 'Members retrieved successfully',
          members: members.map(serializeMember),
        },
      };
    } catch (_error) {
      if (_error instanceof QuorumError) {
        return mapQuorumError(_error);
      }
      return handleError(_error);
    }
  }

  /**
   * DELETE /api/quorum/members/:memberId
   * Remove a member from the quorum (deactivate).
   *
   * Marks the member as inactive. The member's access to existing documents
   * they are part of is preserved, but they cannot be added to new documents.
   *
   * @param req - Request containing the member ID parameter
   * @returns Success confirmation on success, or 404 if not found
   *
   * @example
   * ```json
   * // Request
   * DELETE /api/quorum/members/abc123...
   *
   * // Response
   * {
   *   "message": "Member removed successfully",
   *   "success": true,
   *   "memberId": "abc123..."
   * }
   * ```
   */
  private async handleRemoveMember(
    req: Parameters<ApiRequestHandler<RemoveMemberResponse | ApiErrorResponse>>[0],
  ) {
    try {
      const { memberId } = (req as unknown as RemoveMemberRequest).params;

      if (!memberId) {
        return validationError('Missing required parameter: memberId');
      }

      const quorumService = this.quorumServiceWrapper.getService();
      await quorumService.removeMember(memberId as ShortHexGuid);

      return {
        statusCode: 200,
        response: {
          message: 'Member removed successfully',
          success: true,
          memberId,
        },
      };
    } catch (_error) {
      if (_error instanceof QuorumError) {
        return mapQuorumError(_error);
      }
      return handleError(_error);
    }
  }

  // === Document Sealing/Unsealing Handlers ===

  /**
   * POST /api/quorum/documents/seal
   * Seal a document using Shamir's Secret Sharing.
   *
   * Encrypts the document with a randomly generated symmetric key, then splits
   * the key into shares using Shamir's Secret Sharing. Each share is encrypted
   * with the corresponding member's public key.
   *
   * @param req - Request containing document, member IDs, and optional threshold
   * @returns Document ID and sealing metadata on success
   *
   * @example
   * ```json
   * // Request
   * POST /api/quorum/documents/seal
   * {
   *   "document": { "secret": "data", "value": 42 },
   *   "memberIds": ["member1...", "member2...", "member3..."],
   *   "sharesRequired": 2
   * }
   *
   * // Response
   * {
   *   "message": "Document sealed successfully",
   *   "documentId": "doc123...",
   *   "memberIds": ["member1...", "member2...", "member3..."],
   *   "sharesRequired": 2,
   *   "createdAt": "2025-01-16T10:00:00Z"
   * }
   * ```
   */
  private async handleSealDocument(
    req: Parameters<ApiRequestHandler<SealDocumentResponse | ApiErrorResponse>>[0],
  ) {
    try {
      const { document, memberIds, sharesRequired } = (
        req as unknown as SealDocumentRequest
      ).body;

      // Validate required fields
      if (document === undefined) {
        return validationError('Missing required field: document');
      }

      if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
        return createApiErrorResult(
          400,
          ErrorCode.INVALID_MEMBER_COUNT,
          'At least 2 member IDs are required for sealing',
        );
      }

      // Validate threshold if provided
      if (sharesRequired !== undefined) {
        if (sharesRequired < 2) {
          return createApiErrorResult(
            400,
            ErrorCode.INVALID_THRESHOLD,
            'sharesRequired must be at least 2',
          );
        }
        if (sharesRequired > memberIds.length) {
          return createApiErrorResult(
            400,
            ErrorCode.INVALID_THRESHOLD,
            'sharesRequired cannot exceed the number of members',
          );
        }
      }

      // Get the agent (authenticated member) from session
      const sessionsController =
        this.application.getController<SessionsController>('sessions');
      let agent: Member<GuidV4Buffer> | null;
      try {
        const sessionMember = sessionsController.getMemberFromSession(
          (req.headers as any).authorization as string,
        );
        // Cast to GuidV4 member type - the session controller returns a generic Member
        agent = sessionMember as unknown as Member<GuidV4Buffer>;
      } catch {
        return unauthorizedError();
      }

      if (!agent) {
        return unauthorizedError();
      }

      const quorumService = this.quorumServiceWrapper.getService();
      const result = await quorumService.sealDocument(
        agent,
        document,
        memberIds as ShortHexGuid[],
        sharesRequired,
      );

      return {
        statusCode: 201,
        response: {
          message: 'Document sealed successfully',
          documentId: result.documentId,
          memberIds: result.memberIds,
          sharesRequired: result.sharesRequired,
          createdAt: result.createdAt.toISOString(),
        },
      };
    } catch (_error) {
      if (_error instanceof QuorumError) {
        return mapQuorumError(_error);
      }
      return handleError(_error);
    }
  }

  /**
   * POST /api/quorum/documents/:documentId/unseal
   * Unseal a document using member credentials (mnemonics).
   *
   * Recovers member private keys from provided mnemonics, then uses them
   * to decrypt shares and reconstruct the original document.
   *
   * Note: This endpoint requires the QuorumService to have the document
   * loaded in memory. For disk-persisted documents, the full reconstruction
   * is not yet implemented.
   *
   * @param req - Request containing document ID and member credentials
   * @returns Original document on success
   *
   * @example
   * ```json
   * // Request
   * POST /api/quorum/documents/doc123.../unseal
   * {
   *   "memberCredentials": [
   *     { "memberId": "member1...", "mnemonic": "word1 word2 word3..." },
   *     { "memberId": "member2...", "mnemonic": "word4 word5 word6..." }
   *   ]
   * }
   *
   * // Response
   * {
   *   "message": "Document unsealed successfully",
   *   "document": { "secret": "data", "value": 42 }
   * }
   * ```
   */
  private async handleUnsealDocument(
    req: Parameters<ApiRequestHandler<UnsealDocumentResponse | ApiErrorResponse>>[0],
  ) {
    try {
      const { documentId } = (req as unknown as UnsealDocumentRequest).params;
      const { memberCredentials } = (req as unknown as UnsealDocumentRequest)
        .body;

      if (!documentId) {
        return validationError('Missing required parameter: documentId');
      }

      if (
        !memberCredentials ||
        !Array.isArray(memberCredentials) ||
        memberCredentials.length === 0
      ) {
        return validationError(
          'Missing required field: memberCredentials (array of {memberId, mnemonic})',
        );
      }

      // Validate each credential has required fields
      for (const cred of memberCredentials) {
        if (!cred.memberId || !cred.mnemonic) {
          return validationError(
            'Each memberCredential must have memberId and mnemonic',
          );
        }
      }

      const quorumService = this.quorumServiceWrapper.getService();

      // Check if document exists and if we have enough shares
      const docInfo = await quorumService.getDocument(
        documentId as ShortHexGuid,
      );
      if (!docInfo) {
        return notFoundError('Document', documentId);
      }

      // Check if provided members can unlock the document
      const memberIds = memberCredentials.map(
        (c) => c.memberId as ShortHexGuid,
      );
      const canUnlockResult = await quorumService.canUnlock(
        documentId as ShortHexGuid,
        memberIds,
      );

      if (!canUnlockResult.canUnlock) {
        return createApiErrorResult(
          400,
          ErrorCode.INSUFFICIENT_SHARES,
          `Insufficient shares: provided ${canUnlockResult.sharesProvided}, required ${canUnlockResult.sharesRequired}`,
        );
      }

      // Recover members with private keys from mnemonics
      const eciesService =
        ServiceProvider.getInstance<GuidV4Buffer>().eciesService;
      const membersWithPrivateKey: Member<GuidV4Buffer>[] = [];

      for (const cred of memberCredentials) {
        // Get the stored member info to get their metadata
        const storedMember = await quorumService.getMember(
          cred.memberId as ShortHexGuid,
        );
        if (!storedMember) {
          return notFoundError('Member', cred.memberId);
        }

        // Recover wallet from mnemonic - need to wrap string in SecureString
        const secureString = new SecureString(cred.mnemonic);
        const { wallet } = eciesService.walletAndSeedFromMnemonic(secureString);
        const recoveredPublicKey = new Uint8Array(wallet.getPublicKey());

        // Verify the recovered public key matches the stored one
        if (
          uint8ArrayToHex(recoveredPublicKey) !==
          uint8ArrayToHex(storedMember.publicKey)
        ) {
          return createApiErrorResult(
            400,
            ErrorCode.SHARE_DECRYPTION_FAILED,
            `Mnemonic does not match member ${cred.memberId}`,
          );
        }

        // Create a member with the recovered private key
        const email = storedMember.metadata.email
          ? new EmailString(storedMember.metadata.email)
          : new EmailString(
              `${storedMember.metadata.name?.toLowerCase().replace(/\s+/g, '.') ?? 'unknown'}@placeholder.local`,
            );

        // Use Member.newMember and then replace the wallet
        // This is a workaround since Member constructor may not accept wallet directly
        const { member: tempMember } = Member.newMember<GuidV4Buffer>(
          eciesService,
          MemberType.User,
          storedMember.metadata.name ?? 'Unknown',
          email,
        );

        // Create a member-like object with the recovered wallet's private key
        // The unsealDocument method needs members with privateKey access
        const recoveredMember = Object.create(tempMember);
        Object.defineProperty(recoveredMember, 'privateKey', {
          get: () => new Uint8Array(wallet.getPrivateKey()),
          configurable: true,
        });
        Object.defineProperty(recoveredMember, 'publicKey', {
          get: () => recoveredPublicKey,
          configurable: true,
        });

        membersWithPrivateKey.push(recoveredMember);
      }

      // Unseal the document
      const unsealedDocument = await quorumService.unsealDocument(
        documentId as ShortHexGuid,
        membersWithPrivateKey,
      );

      return {
        statusCode: 200,
        response: {
          message: 'Document unsealed successfully',
          document: unsealedDocument,
        },
      };
    } catch (_error) {
      if (_error instanceof QuorumError) {
        return mapQuorumError(_error);
      }
      return handleError(_error);
    }
  }

  /**
   * GET /api/quorum/documents/:documentId
   * Get metadata for a sealed document.
   *
   * Returns information about the document including which members have access
   * and how many shares are required to unseal it.
   *
   * @param req - Request containing the document ID parameter
   * @returns Document metadata on success, or 404 if not found
   *
   * @example
   * ```json
   * // Request
   * GET /api/quorum/documents/doc123...
   *
   * // Response
   * {
   *   "message": "Document retrieved successfully",
   *   "document": {
   *     "id": "doc123...",
   *     "memberIds": ["member1...", "member2...", "member3..."],
   *     "sharesRequired": 2,
   *     "createdAt": "2025-01-16T10:00:00Z",
   *     "creatorId": "creator..."
   *   }
   * }
   * ```
   */
  private async handleGetDocument(
    req: Parameters<ApiRequestHandler<GetDocumentResponse | ApiErrorResponse>>[0],
  ) {
    try {
      const { documentId } = (req as unknown as GetDocumentRequest).params;

      if (!documentId) {
        return validationError('Missing required parameter: documentId');
      }

      const quorumService = this.quorumServiceWrapper.getService();
      const document = await quorumService.getDocument(
        documentId as ShortHexGuid,
      );

      if (!document) {
        return notFoundError('Document', documentId);
      }

      return {
        statusCode: 200,
        response: {
          message: 'Document retrieved successfully',
          document,
        },
      };
    } catch (_error) {
      if (_error instanceof QuorumError) {
        return mapQuorumError(_error);
      }
      return handleError(_error);
    }
  }

  /**
   * GET /api/quorum/documents/:documentId/can-unlock
   * Check if a set of members can unlock a document.
   *
   * Determines whether the provided members have enough shares to meet
   * the threshold required to unseal the document.
   *
   * @param req - Request containing document ID and member IDs query parameter
   * @returns Unlock status and share count information
   *
   * @example
   * ```json
   * // Request
   * GET /api/quorum/documents/doc123.../can-unlock?memberIds=member1,member2
   *
   * // Response
   * {
   *   "message": "Can-unlock check completed",
   *   "canUnlock": true,
   *   "sharesProvided": 2,
   *   "sharesRequired": 2,
   *   "missingMembers": ["member3..."]
   * }
   * ```
   */
  private async handleCanUnlock(
    req: Parameters<ApiRequestHandler<CanUnlockResponse | ApiErrorResponse>>[0],
  ) {
    try {
      const { documentId } = (req as unknown as CanUnlockRequest).params;
      const { memberIds: memberIdsStr } = (req as unknown as CanUnlockRequest)
        .query;

      if (!documentId) {
        return validationError('Missing required parameter: documentId');
      }

      if (!memberIdsStr) {
        return validationError(
          'Missing required query parameter: memberIds (comma-separated)',
        );
      }

      const memberIds = memberIdsStr
        .split(',')
        .map((id) => id.trim()) as ShortHexGuid[];

      const quorumService = this.quorumServiceWrapper.getService();
      const result = await quorumService.canUnlock(
        documentId as ShortHexGuid,
        memberIds,
      );

      return {
        statusCode: 200,
        response: {
          message: 'Can-unlock check completed',
          ...result,
        },
      };
    } catch (_error) {
      if (_error instanceof QuorumError) {
        return mapQuorumError(_error);
      }
      return handleError(_error);
    }
  }
}
