import {
  createDefaultBlockMetadata,
  MessageEncryptionScheme,
  MessagePriority,
  type BlockId,
} from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiRequestHandler,
  BaseController,
  JsonResponse,
} from '@digitaldefiance/node-express-suite';
import { createHash, randomBytes } from 'crypto';
import { Request, Response } from 'express';
import {
  IChatMessageSentEventPayload,
  IMovePieceEventPayload,
  RoomManager,
} from 'subspace-lattice';
import { IBrightChainApplication } from '../../interfaces';
import { IApiMessageMetadata } from '../../interfaces/messageMetadata';
import {
  EventNotificationSystem,
  MessageEventType,
} from '../../services/eventNotificationSystem';
import { MessagePassingService } from '../../services/messagePassingService';

/** Shape of req.user as set by the JWT auth middleware. */
interface IRequestUser {
  id?: string;
  memberId?: string;
}

type SubspaceLatticeApiResponseType = JsonResponse;

interface ISubspaceLatticeHandlers<TID extends PlatformID> {
  createRoom: ApiRequestHandler<SubspaceLatticeApiResponseType>;
  getRoomByCode: ApiRequestHandler<SubspaceLatticeApiResponseType>;
  joinRoomByCode: ApiRequestHandler<SubspaceLatticeApiResponseType>;
  movePiece: ApiRequestHandler<SubspaceLatticeApiResponseType>;
  sendChat: ApiRequestHandler<SubspaceLatticeApiResponseType>;
}

export class SubspaceLatticeController<
  TID extends PlatformID,
> extends BaseController<
  SubspaceLatticeApiResponseType,
  ISubspaceLatticeHandlers<TID>,
  'en',
  TID,
  IBrightChainApplication<TID>
> {
  private messagePassingService: MessagePassingService | null = null;
  private eventSystem: EventNotificationSystem | null = null;
  private roomManager: RoomManager<string> = new RoomManager<string>(
    () => randomBytes(16).toString('hex'),
  );

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
    this.initRouteDefinitions();
  }

  protected initRouteDefinitions(): void {
    // Arrow function class properties are not yet initialized when this method
    // is called from the BaseController constructor, so we wrap each handler
    // in a closure that dereferences this.handler at request time.
    this.router.post('/subspace-lattice/room', (req, res) =>
      this.createRoom(req, res),
    );
    this.router.get('/subspace-lattice/room/code/:roomCode', (req, res) =>
      this.getRoomByCode(req, res),
    );
    this.router.post('/subspace-lattice/room/code/:roomCode/join', (req, res) =>
      this.joinRoomByCode(req, res),
    );
    this.router.post('/subspace-lattice/room/:roomId/move', (req, res) =>
      this.movePiece(req, res),
    );
    this.router.post('/subspace-lattice/room/:roomId/chat', (req, res) =>
      this.sendChat(req, res),
    );
  }

  public setMessagePassingService(service: MessagePassingService): void {
    this.messagePassingService = service;
  }

  public setEventSystem(system: EventNotificationSystem): void {
    this.eventSystem = system;
  }

  public createRoom = async (
    req: Request,
    res: Response<SubspaceLatticeApiResponseType>,
  ): Promise<Response<SubspaceLatticeApiResponseType>> => {
    const { name, password } = req.body as { name?: string; password?: string };
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Room name is required' } as unknown as SubspaceLatticeApiResponseType);
    }

    const reqUser = (req as Request & { user?: IRequestUser }).user;
    const creatorId = reqUser?.memberId ?? reqUser?.id ?? 'anonymous';

    const room = this.roomManager.createRoom(name.trim(), creatorId, true, password);
    // Automatically join creator as white (first) player
    this.roomManager.joinRoom(room.id, creatorId, false, password);
    // Re-fetch the updated room to include the assigned player
    const updatedRoom = this.roomManager.getRoom(room.id);

    return res.status(201).json(updatedRoom as unknown as SubspaceLatticeApiResponseType);
  };

  /**
   * GET /subspace-lattice/room/code/:roomCode — fetch a room by its short code
   * so a client can hydrate state after a refresh.
   */
  public getRoomByCode = async (
    req: Request,
    res: Response<SubspaceLatticeApiResponseType>,
  ): Promise<Response<SubspaceLatticeApiResponseType>> => {
    const roomCode = String(req.params['roomCode'] ?? '').trim();
    if (!roomCode) {
      return res
        .status(400)
        .json({ error: 'Room code is required' } as unknown as SubspaceLatticeApiResponseType);
    }
    const room = this.roomManager.getRoomByCode(roomCode);
    if (!room) {
      return res
        .status(404)
        .json({ error: 'Room not found' } as unknown as SubspaceLatticeApiResponseType);
    }
    return res.status(200).json(room as unknown as SubspaceLatticeApiResponseType);
  };

  /**
   * POST /subspace-lattice/room/code/:roomCode/join — join a room by its short
   * code. The authenticated user fills the first open seat (white, then black);
   * if both are taken (or asObserver is true) they join as an observer.
   */
  public joinRoomByCode = async (
    req: Request,
    res: Response<SubspaceLatticeApiResponseType>,
  ): Promise<Response<SubspaceLatticeApiResponseType>> => {
    const roomCode = String(req.params['roomCode'] ?? '').trim();
    const { password, asObserver } = (req.body ?? {}) as {
      password?: string;
      asObserver?: boolean;
    };
    if (!roomCode) {
      return res
        .status(400)
        .json({ error: 'Room code is required' } as unknown as SubspaceLatticeApiResponseType);
    }
    const room = this.roomManager.getRoomByCode(roomCode);
    if (!room) {
      return res
        .status(404)
        .json({ error: 'Room not found' } as unknown as SubspaceLatticeApiResponseType);
    }
    const reqUser = (req as Request & { user?: IRequestUser }).user;
    const userId = reqUser?.memberId ?? reqUser?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ error: 'Unauthenticated' } as unknown as SubspaceLatticeApiResponseType);
    }
    // If already a participant, just return the current room state.
    const alreadyIn =
      room.whitePlayerId === userId ||
      room.blackPlayerId === userId ||
      room.observerIds.includes(userId);
    if (!alreadyIn) {
      const joinedAsPlayer = !asObserver && this.roomManager.joinRoom(
        room.id,
        userId,
        false,
        password,
      );
      if (!joinedAsPlayer) {
        // Room full or asObserver requested — fall back to observer.
        const joinedAsObserver = this.roomManager.joinRoom(
          room.id,
          userId,
          true,
          password,
        );
        if (!joinedAsObserver) {
          return res.status(403).json({
            error: 'Unable to join room (wrong password or observers disabled)',
          } as unknown as SubspaceLatticeApiResponseType);
        }
      }
    }
    const updatedRoom = this.roomManager.getRoom(room.id);
    return res.status(200).json(updatedRoom as unknown as SubspaceLatticeApiResponseType);
  };

  public movePiece = async (
    req: Request,
    res: Response<void>,
  ): Promise<Response<void>> => {
    const roomId = String(req.params['roomId'] ?? '');
    const movePayload: IMovePieceEventPayload<string> = req.body;
    const payloadBuffer = Buffer.from(JSON.stringify(movePayload));
    const blockId = randomBytes(32).toString('hex') as BlockId;
    const checksum = createHash('sha256').update(payloadBuffer).digest('hex');

    // Broadcast the move to other players in the room.
    this.messagePassingService?.sendMessage(
      Buffer.from(
        JSON.stringify({
          type: 'PIECE_MOVED',
          payload: movePayload,
        }),
      ),
      this.application.getNodeId().toString(),
      {
        messageType: 'PIECE_MOVED',
        senderId: this.application.getNodeId().toString(),
        recipients: [roomId],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      },
    );

    // Also broadcast via WebSocket to connected clients
    const metadata: IApiMessageMetadata = {
      ...createDefaultBlockMetadata(blockId, payloadBuffer.length, checksum),
      ...movePayload,
      roomId,
      messageType: 'PIECE_MOVED',
      senderId: this.application.getNodeId().toString(),
      recipients: [roomId],
      priority: MessagePriority.NORMAL,
      deliveryStatus: new Map(),
      acknowledgments: new Map(),
      encryptionScheme: MessageEncryptionScheme.NONE,
      isCBL: false,
    };
    this.eventSystem?.emit(MessageEventType.GAME_PIECE_MOVED, metadata);

    return res.status(204).send();
  };

  public sendChat = async (
    req: Request,
    res: Response<void>,
  ): Promise<Response<void>> => {
    const roomId = String(req.params['roomId'] ?? '');
    const chatPayload: IChatMessageSentEventPayload<string> = req.body;
    const payloadBuffer = Buffer.from(JSON.stringify(chatPayload));
    const blockId = randomBytes(32).toString('hex') as BlockId;
    const checksum = createHash('sha256').update(payloadBuffer).digest('hex');

    // Broadcast chat message
    this.messagePassingService?.sendMessage(
      Buffer.from(
        JSON.stringify({
          type: 'CHAT_MESSAGE_SENT',
          payload: chatPayload,
        }),
      ),
      this.application.getNodeId().toString(),
      {
        messageType: 'CHAT_MESSAGE_SENT',
        senderId: this.application.getNodeId().toString(),
        recipients: [roomId],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      },
    );

    const metadata: IApiMessageMetadata = {
      ...createDefaultBlockMetadata(blockId, payloadBuffer.length, checksum),
      ...chatPayload,
      roomId,
      messageType: 'CHAT_MESSAGE_SENT',
      senderId: this.application.getNodeId().toString(),
      recipients: [roomId],
      priority: MessagePriority.NORMAL,
      deliveryStatus: new Map(),
      acknowledgments: new Map(),
      encryptionScheme: MessageEncryptionScheme.NONE,
      isCBL: false,
    };
    this.eventSystem?.emit(MessageEventType.GAME_CHAT_MESSAGE, metadata);

    return res.status(204).send();
  };
}
