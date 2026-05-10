import type {
  ISyncWsFileChanged,
  ISyncWsFileDestroyed,
  ISyncWsFolderChanged,
  ISyncWsSubscribed,
} from '@brightchain/digitalburnbag-lib';
import { getSyncRoomName } from '@brightchain/digitalburnbag-lib';
import type { WebSocket } from 'ws';

/**
 * Minimal interface for the parts of ClientWebSocketServer we need.
 * Avoids a hard import dependency on the full server class.
 */
export interface ISyncBroadcastTarget {
  registerMessageHandler(
    messageType: string,
    handler: (
      ws: WebSocket,
      session: Readonly<{ memberContext: { memberId: string } }>,
      message: unknown,
    ) => void,
  ): void;
  joinRoom(ws: WebSocket, room: string): void;
  leaveRoom(ws: WebSocket, room: string): void;
  broadcastToRoom(room: string, payload: unknown): void;
}

/**
 * Server-side broadcaster for burnbag sync events.
 *
 * Registers with ClientWebSocketServer to handle `burnbag:subscribe`
 * and `burnbag:unsubscribe` messages from desktop sync clients.
 * Provides methods for controllers/services to broadcast file/folder
 * change events to all subscribed clients for a given user.
 *
 * Usage:
 *   const broadcaster = new SyncEventBroadcaster(clientWsServer);
 *   // Later, when a file changes:
 *   broadcaster.notifyFileChanged(userId, { ... });
 */
export class SyncEventBroadcaster {
  constructor(private readonly wsServer: ISyncBroadcastTarget) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.wsServer.registerMessageHandler(
      'burnbag:subscribe',
      (ws, session, message) => {
        const _msg = message as { type: string; userId?: string };
        // Use the authenticated member's ID for the room (ignore any userId in the message
        // to prevent subscribing to another user's events)
        const room = getSyncRoomName(session.memberContext.memberId);
        this.wsServer.joinRoom(ws, room);

        const confirmation: ISyncWsSubscribed = {
          type: 'burnbag:subscribed',
          userId: session.memberContext.memberId,
          room,
        };
        // Send confirmation directly to the subscribing client
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((ws as any).readyState === 1 /* OPEN */) {
            ws.send(JSON.stringify(confirmation));
          }
        } catch {
          // Connection may be closing
        }
      },
    );

    this.wsServer.registerMessageHandler(
      'burnbag:unsubscribe',
      (ws, session) => {
        const room = getSyncRoomName(session.memberContext.memberId);
        this.wsServer.leaveRoom(ws, room);
      },
    );
  }

  /**
   * Broadcast a file change event to all sync clients for a user.
   */
  notifyFileChanged(
    userId: string,
    event: Omit<ISyncWsFileChanged<string>, 'type'>,
  ): void {
    const room = getSyncRoomName(userId);
    this.wsServer.broadcastToRoom(room, {
      type: 'burnbag:file_changed',
      ...event,
    });
  }

  /**
   * Broadcast a folder change event to all sync clients for a user.
   */
  notifyFolderChanged(
    userId: string,
    event: Omit<ISyncWsFolderChanged<string>, 'type'>,
  ): void {
    const room = getSyncRoomName(userId);
    this.wsServer.broadcastToRoom(room, {
      type: 'burnbag:folder_changed',
      ...event,
    });
  }

  /**
   * Broadcast a file destroyed event to all sync clients for a user.
   */
  notifyFileDestroyed(
    userId: string,
    event: Omit<ISyncWsFileDestroyed<string>, 'type'>,
  ): void {
    const room = getSyncRoomName(userId);
    this.wsServer.broadcastToRoom(room, {
      type: 'burnbag:file_destroyed',
      ...event,
    });
  }
}
