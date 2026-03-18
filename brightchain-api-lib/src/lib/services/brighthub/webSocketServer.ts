/**
 * BrightHub WebSocket Handler
 *
 * Plugs into ClientWebSocketServer via registerMessageHandler().
 * Handles all BrightHub real-time messaging and notification events.
 *
 * @see Requirements: 49.1-49.7, 52.4, 52.5
 */

import type {
  IBaseConversation,
  IBaseDirectMessage,
  IBaseMessageReaction,
  IBaseNotification,
  ISendMessageOptions,
} from '@brightchain/brighthub-lib';

/** Room name for a conversation channel */
export function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}

/** Room name for a user's notification channel */
export function notificationRoom(userId: string): string {
  return `notifications:${userId}`;
}

/** Room name for a hub's post feed channel */
export function hubRoom(hubId: string): string {
  return `hub:${hubId}`;
}

/** Subset of ClientWebSocketServer API used by this handler */
export interface IClientWsBridge {
  joinRoom(ws: unknown, room: string): void;
  leaveRoom(ws: unknown, room: string): void;
  broadcastToRoom(room: string, payload: unknown): void;
  broadcastToRoomExcept(
    room: string,
    payload: unknown,
    excludeWs: unknown,
  ): void;
  sendToMember(memberId: string, payload: unknown): void;
  isMemberOnline(memberId: string): boolean;
  registerMessageHandler(
    messageType: string,
    handler: (
      ws: unknown,
      session: { memberContext: { memberId: string } },
      message: unknown,
    ) => void,
  ): void;
}

/** Dependencies injected into the WebSocket handler */
export interface WebSocketHandlerDeps {
  sendMessage: (
    conversationId: string,
    senderId: string,
    content: string,
    options?: ISendMessageOptions,
  ) => Promise<IBaseDirectMessage<string>>;
  markAsRead: (conversationId: string, userId: string) => Promise<void>;
  isParticipant: (conversationId: string, userId: string) => Promise<boolean>;
}

type WsSession = { memberContext: { memberId: string } };

/**
 * Handles BrightHub real-time messaging and notification events.
 *
 * Client -> Server message format:
 *   { type: "brighthub:message:send", conversationId, content, options? }
 *   { type: "brighthub:message:typing", conversationId }
 *   { type: "brighthub:message:read", conversationId }
 *   { type: "brighthub:subscribe", conversationId? | room: "notifications" }
 *   { type: "brighthub:unsubscribe", conversationId? }
 */
export class BrightHubWebSocketHandler {
  constructor(
    private readonly bridge: IClientWsBridge,
    private readonly deps: WebSocketHandlerDeps,
  ) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    const h: [string, (ws: unknown, s: WsSession, m: unknown) => void][] = [
      [
        'brighthub:message:send',
        (ws, s, m) => this.handleSendMessage(ws, s, m),
      ],
      ['brighthub:message:typing', (ws, s, m) => this.handleTyping(ws, s, m)],
      ['brighthub:message:read', (_ws, s, m) => this.handleMarkAsRead(s, m)],
      ['brighthub:subscribe', (ws, s, m) => this.handleSubscribe(ws, s, m)],
      ['brighthub:unsubscribe', (ws, _s, m) => this.handleUnsubscribe(ws, m)],
    ];
    for (const [type, handler] of h) {
      this.bridge.registerMessageHandler(type, handler);
    }
  }

  // -- Client -> Server handlers --

  private async handleSendMessage(
    ws: unknown,
    session: WsSession,
    message: unknown,
  ): Promise<void> {
    const msg = message as {
      conversationId?: string;
      content?: string;
      options?: ISendMessageOptions;
    };
    if (!msg.conversationId || !msg.content) {
      this.sendError(ws, 'Missing conversationId or content');
      return;
    }
    try {
      const sent = await this.deps.sendMessage(
        msg.conversationId,
        session.memberContext.memberId,
        msg.content,
        msg.options,
      );
      this.broadcastNewMessage(sent);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Send failed';
      this.sendError(ws, errMsg);
    }
  }

  private handleTyping(
    ws: unknown,
    session: WsSession,
    message: unknown,
  ): void {
    const msg = message as { conversationId?: string };
    if (!msg.conversationId) return;
    this.bridge.broadcastToRoomExcept(
      conversationRoom(msg.conversationId),
      {
        type: 'conversation:typing',
        conversationId: msg.conversationId,
        userId: session.memberContext.memberId,
      },
      ws,
    );
  }

  private async handleMarkAsRead(
    session: WsSession,
    message: unknown,
  ): Promise<void> {
    const msg = message as { conversationId?: string };
    if (!msg.conversationId) return;
    try {
      await this.deps.markAsRead(
        msg.conversationId,
        session.memberContext.memberId,
      );
      this.bridge.broadcastToRoom(conversationRoom(msg.conversationId), {
        type: 'conversation:read',
        conversationId: msg.conversationId,
        userId: session.memberContext.memberId,
        lastReadAt: new Date().toISOString(),
      });
    } catch {
      // Silently ignore read receipt failures
    }
  }

  private async handleSubscribe(
    ws: unknown,
    session: WsSession,
    message: unknown,
  ): Promise<void> {
    const msg = message as { room?: string; conversationId?: string; hubId?: string };
    if (msg.conversationId) {
      const ok = await this.deps.isParticipant(
        msg.conversationId,
        session.memberContext.memberId,
      );
      if (!ok) {
        this.sendError(ws, 'Not a participant');
        return;
      }
      this.bridge.joinRoom(ws, conversationRoom(msg.conversationId));
    } else if (msg.room === 'notifications') {
      this.bridge.joinRoom(
        ws,
        notificationRoom(session.memberContext.memberId),
      );
    } else if (msg.hubId) {
      this.bridge.joinRoom(ws, hubRoom(msg.hubId));
    }
  }

  private handleUnsubscribe(ws: unknown, message: unknown): void {
    const msg = message as { conversationId?: string; hubId?: string };
    if (msg.conversationId) {
      this.bridge.leaveRoom(ws, conversationRoom(msg.conversationId));
    } else if (msg.hubId) {
      this.bridge.leaveRoom(ws, hubRoom(msg.hubId));
    }
  }

  // -- Server -> Client broadcast helpers --

  broadcastNewMessage(message: IBaseDirectMessage<string>): void {
    this.bridge.broadcastToRoom(conversationRoom(message.conversationId), {
      type: 'message:new',
      message,
    });
  }

  broadcastEditedMessage(message: IBaseDirectMessage<string>): void {
    this.bridge.broadcastToRoom(conversationRoom(message.conversationId), {
      type: 'message:edited',
      message,
    });
  }

  broadcastDeletedMessage(messageId: string, conversationId: string): void {
    this.bridge.broadcastToRoom(conversationRoom(conversationId), {
      type: 'message:deleted',
      messageId,
      conversationId,
    });
  }

  broadcastReactionUpdate(
    messageId: string,
    conversationId: string,
    reactions: IBaseMessageReaction<string>[],
  ): void {
    this.bridge.broadcastToRoom(conversationRoom(conversationId), {
      type: 'message:reaction',
      messageId,
      reactions,
    });
  }

  broadcastConversationUpdated(conversation: IBaseConversation<string>): void {
    this.bridge.broadcastToRoom(conversationRoom(conversation._id), {
      type: 'conversation:updated',
      conversation,
    });
  }

  broadcastNotification(notification: IBaseNotification<string>): void {
    this.bridge.sendToMember(notification.recipientId, {
      type: 'notification:new',
      notification,
    });
  }

  broadcastNotificationRead(userId: string, notificationId: string): void {
    this.bridge.sendToMember(userId, {
      type: 'notification:read',
      notificationId,
    });
  }

  broadcastNotificationDeleted(userId: string, notificationId: string): void {
    this.bridge.sendToMember(userId, {
      type: 'notification:deleted',
      notificationId,
    });
  }

  broadcastNotificationCount(userId: string, unreadCount: number): void {
    this.bridge.sendToMember(userId, {
      type: 'notification:count',
      unreadCount,
    });
  }

  /**
   * Broadcast a new post to all subscribers of the hub(s) it belongs to.
   */
  broadcastNewHubPost(post: { _id: string; hubIds?: string[]; authorId: string }): void {
    if (!post.hubIds || post.hubIds.length === 0) return;
    for (const hid of post.hubIds) {
      this.bridge.broadcastToRoom(hubRoom(hid), {
        type: 'hub:post:new',
        post,
      });
    }
  }

  isUserOnline(userId: string): boolean {
    return this.bridge.isMemberOnline(userId);
  }

  // -- Utilities --

  private sendError(ws: unknown, message: string): void {
    try {
      (ws as { send(data: string): void }).send(
        JSON.stringify({ type: 'error', message }),
      );
    } catch {
      // Connection may be closed
    }
  }
}

/** Factory function */
export function createBrightHubWebSocketHandler(
  bridge: IClientWsBridge,
  deps: WebSocketHandlerDeps,
): BrightHubWebSocketHandler {
  return new BrightHubWebSocketHandler(bridge, deps);
}
