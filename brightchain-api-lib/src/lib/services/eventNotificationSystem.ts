import { IMessageMetadata } from '@brightchain/brightchain-lib';
import { WebSocket } from 'ws';

export enum MessageEventType {
  MESSAGE_STORED = 'message:stored',
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_DELIVERED = 'message:delivered',
  MESSAGE_FAILED = 'message:failed',
}

export interface IMessageEvent {
  type: MessageEventType;
  timestamp: Date;
  metadata: IMessageMetadata;
}

export interface IEventFilter {
  types?: MessageEventType[];
  senderId?: string;
  recipientId?: string;
}

/**
 * Event Notification System for real-time message updates
 */
export class EventNotificationSystem {
  private subscriptions = new Map<WebSocket, IEventFilter>();
  private eventHistory: IMessageEvent[] = [];
  private readonly maxHistorySize = 1000;
  private readonly retentionMs = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Subscribe to message events
   */
  subscribe(ws: WebSocket, filter?: IEventFilter): void {
    this.subscriptions.set(ws, filter || {});

    ws.on('close', () => {
      this.subscriptions.delete(ws);
    });
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(ws: WebSocket): void {
    this.subscriptions.delete(ws);
  }

  /**
   * Emit event to subscribers
   */
  emit(type: MessageEventType, metadata: IMessageMetadata): void {
    const event: IMessageEvent = {
      type,
      timestamp: new Date(),
      metadata,
    };

    this.addToHistory(event);

    for (const [ws, filter] of this.subscriptions.entries()) {
      if (
        this.matchesFilter(event, filter) &&
        ws.readyState === WebSocket.OPEN
      ) {
        ws.send(JSON.stringify(event));
      }
    }
  }

  /**
   * Get event history
   */
  getEventHistory(filter?: IEventFilter, limit = 100): IMessageEvent[] {
    const cutoff = Date.now() - this.retentionMs;
    return this.eventHistory
      .filter((e) => e.timestamp.getTime() > cutoff)
      .filter((e) => !filter || this.matchesFilter(e, filter))
      .slice(-limit);
  }

  private addToHistory(event: IMessageEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  private matchesFilter(event: IMessageEvent, filter: IEventFilter): boolean {
    if (filter.types && !filter.types.includes(event.type)) {
      return false;
    }
    if (filter.senderId && event.metadata.senderId !== filter.senderId) {
      return false;
    }
    if (
      filter.recipientId &&
      !event.metadata.recipients?.includes(filter.recipientId)
    ) {
      return false;
    }
    return true;
  }
}
