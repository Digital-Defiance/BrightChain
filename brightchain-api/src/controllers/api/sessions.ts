import {
  ApiRequestHandler,
  BrightChainMember,
  ChecksumBuffer,
  EmailString,
  GuidV4,
  JsonResponse,
  MemberApiRequest,
  MemberType,
  RouteConfig,
  StaticHelpersVoting,
  TypedHandlers,
} from '@BrightChain/brightchain-lib';
import { randomBytes } from 'crypto';
import { Request } from 'express';
import { IApplication } from '../../interfaces/application';
import { BaseController } from '../base';
import { MembersController } from './members';

// Use Express.Request with proper type parameters
type ApiRequest = Request<
  {
    sessionId?: string;
  },
  Record<string, unknown>,
  {
    memberId: string;
    mnemonic: string;
  }
>;

interface SessionsResponse {
  [key: string]: JsonResponse | undefined;
  sessionToken?: string;
  success: boolean;
  message?: string;
}

interface SessionsHandlers extends TypedHandlers<SessionsResponse> {
  createSession: ApiRequestHandler<SessionsResponse>;
  deleteSession: ApiRequestHandler<SessionsResponse>;
}

interface SessionData {
  memberId: string;
  member: BrightChainMember; // Member with loaded private keys
  expiresAt: Date;
}

export class SessionsController extends BaseController<
  SessionsResponse,
  SessionsHandlers
> {
  private sessions: Map<string, SessionData>;
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(application: IApplication) {
    super(application);
    this.sessions = new Map();
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      {
        method: 'post',
        path: '/',
        handlerKey: 'createSession',
        useAuthentication: false,
      },
      {
        method: 'delete',
        path: '/:sessionId',
        handlerKey: 'deleteSession',
        useAuthentication: true,
      },
    ] as RouteConfig<SessionsResponse, SessionsHandlers>[];

    this.handlers = {
      createSession: this.handleCreateSession.bind(this),
      deleteSession: this.handleDeleteSession.bind(this),
    };
  }

  private async handleCreateSession(req: ApiRequest): Promise<{
    statusCode: number;
    response: SessionsResponse;
  }> {
    const { memberId, mnemonic } = req.body;

    if (!memberId || !mnemonic) {
      throw new Error('Invalid credentials');
    }

    // Get member data from members controller
    const membersController = this.application.getController(
      'members',
    ) as MembersController;
    const result = await membersController.handleGetMember({
      params: { memberId },
    } as MemberApiRequest);

    const { response } = result;
    if (!response.success) {
      throw new Error('User not found');
    }

    // Get member data from block store
    const checksumBuffer = Buffer.from(
      response.blockId || '',
      'hex',
    ) as ChecksumBuffer;
    const block = membersController.blockStore.getData(checksumBuffer);
    const memberData = block.data.toString();
    const memberJson = JSON.parse(memberData);

    const member = new BrightChainMember(
      memberJson.type as MemberType,
      memberJson.name,
      new EmailString(memberJson.contactEmail),
      Buffer.from(memberJson.publicKey, 'hex'),
      StaticHelpersVoting.bufferToVotingPublicKey(
        Buffer.from(memberJson.votingPublicKey, 'hex'),
      ),
      undefined, // privateKey will be loaded from mnemonic
      undefined, // wallet will be loaded from mnemonic
      memberJson.id ? new GuidV4(memberJson.id) : undefined,
      new Date(),
      new Date(),
      undefined,
    );

    try {
      // Load wallet and derive keys
      member.loadWallet(mnemonic);
    } catch (error) {
      throw new Error('Invalid credentials');
    }

    // Generate session token
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

    // Store session data
    this.sessions.set(sessionToken, {
      memberId,
      member,
      expiresAt,
    });

    return {
      statusCode: 200,
      response: {
        success: true,
        sessionToken,
        message: 'Session created successfully',
      },
    };
  }

  private async handleDeleteSession(req: ApiRequest): Promise<{
    statusCode: number;
    response: SessionsResponse;
  }> {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw new Error('Invalid session ID');
    }

    // Remove session
    this.sessions.delete(sessionId);

    return {
      statusCode: 200,
      response: {
        success: true,
        message: 'Session deleted successfully',
      },
    };
  }

  /**
   * Get member with loaded keys from session token
   * Used by other controllers to authenticate requests
   */
  public getMemberFromSession(sessionToken: string): BrightChainMember {
    const session = this.sessions.get(sessionToken);
    if (!session) {
      throw new Error('Invalid session token');
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionToken);
      throw new Error('Session expired');
    }

    return session.member;
  }

  /**
   * Clean up expired sessions
   * Should be called periodically
   */
  public cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(token);
      }
    }
  }
}
