import { AvailabilityState, IMessageMetadata } from '@brightchain/brightchain-lib';
import { WebSocket } from 'ws';

export enum MessageEventType {
  MESSAGE_STORED = 'message:stored',
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_DELIVERED = 'message:delivered',
  MESSAGE_FAILED = 'message:failed',
}

export enum BlockEventType {
  AVAILABILITY_CHANGED = 'block:availability_changed',
  REPLICATED = 'block:replicated',
}

export enum PartitionEventType {
  PARTITION_ENTERED = 'partition:entered',
  PARTITION_EXITED = 'partition:exited',
}

export type EventType = MessageEventType | BlockEventType | PartitionEventType;

export interface IMessageEvent {
  type: MessageEventType;
  timestamp: Date;
  metadata: IMessageMetadata;
}

export interface IBlockAvailabilityEvent {
  type: BlockEventType.AVAILABILITY_CHANGED;
  timestamp: Date;
  data: {
    blockId: string;
    oldState: AvailabilityState;
    newState: AvailabilityState;
  };
}

export interface IBlockReplicatedEvent {
  type: BlockEventType.REPLICATED;
  timestamp: Date;
  data: {
    blockId: string;
    targetNodeId: string;
    success: boolean;
    error?: string;
  };
}

export interface IPartitionEnteredEvent {
  type: PartitionEventType.PARTITION_ENTERED;
  timestamp: Date;
  data: {
    disconnectedPeers: string[];
  };
}

export interface IPartitionExitedEvent {
  type: PartitionEventType.PARTITION_EXITED;
  timestamp: Date;
  data: {
    reconnectedPeers: string[];
  };
}

export type SystemEvent =
  | IMessageEvent
  | IBlockAvailabilityEvent
  | IBlockReplicatedEvent
  | IPartitionEnteredEvent
  | IPartitionExitedEvent;

export interface IEventFilter {
  types?: EventType[];
  senderId?: string;
  recipientId?: string;
  blockId?: string;
}

/**
 * Event Notification System for real-time message, block, and partition updates
 * 
 * Supports:
 * - Message events: stored, received, delivered, failed
 * - Block events: availability_changed, replicated
 * - Partition events: entered, exited
 * 
 * @requirements 4.5, 5.2, 5.4
 */
export class EventNotificationSystem {
  private subscriptions = new Map<WebSocket, IEventFilter>();
  private eventHistory: SystemEvent[] = [];
  private readonly maxHistorySize = 1000;
  private readonly retentionMs = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Subscribe to events
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
   * Get the number of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Check if a WebSocket is subscribed
   */
  isSubscribed(ws: WebSocket): boolean {
    return this.subscriptions.has(ws);
  }

  /**
   * Emit message event to subscribers
   */
  emit(type: MessageEventType, metadata: IMessageMetadata): void {
    const event: IMessageEvent = {
      type,
      timestamp: new Date(),
      metadata,
    };

    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit block availability changed event
   * @requirements 5.4
   */
  emitBlockAvailabilityChanged(
    blockId: string,
    oldState: AvailabilityState,
    newState: AvailabilityState,
  ): void {
    const event: IBlockAvailabilityEvent = {
      type: BlockEventType.AVAILABILITY_CHANGED,
      timestamp: new Date(),
      data: {
        blockId,
        oldState,
        newState,
      },
    };

    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit block replicated event
   * @requirements 4.5
   */
  emitBlockReplicated(
    blockId: string,
    targetNodeId: string,
    success: boolean,
    error?: string,
  ): void {
    const event: IBlockReplicatedEvent = {
      type: BlockEventType.REPLICATED,
      timestamp: new Date(),
      data: {
        blockId,
        targetNodeId,
        success,
        error,
      },
    };

    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit partition entered event
   * @requirements 5.6
   */
  emitPartitionEntered(disconnectedPeers: string[]): void {
    const event: IPartitionEnteredEvent = {
      type: PartitionEventType.PARTITION_ENTERED,
      timestamp: new Date(),
      data: {
        disconnectedPeers,
      },
    };

    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit partition exited event
   * @requirements 5.6
   */
  emitPartitionExited(reconnectedPeers: string[]): void {
    const event: IPartitionExitedEvent = {
      type: PartitionEventType.PARTITION_EXITED,
      timestamp: new Date(),
      data: {
        reconnectedPeers,
      },
    };

    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Get event history
   */
  getEventHistory(filter?: IEventFilter, limit = 100): SystemEvent[] {
    const cutoff = Date.now() - this.retentionMs;
    return this.eventHistory
      .filter((e) => e.timestamp.getTime() > cutoff)
      .filter((e) => !filter || this.matchesFilter(e, filter))
      .slice(-limit);
  }

  private addToHistory(event: SystemEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  private broadcastEvent(event: SystemEvent): void {
    for (const [ws, filter] of this.subscriptions.entries()) {
      if (
        this.matchesFilter(event, filter) &&
        ws.readyState === WebSocket.OPEN
      ) {
        ws.send(JSON.stringify(event));
      }
    }
  }

  private matchesFilter(event: SystemEvent, filter: IEventFilter): boolean {
    // Check event type filter
    if (filter.types && filter.types.length > 0) {
      if (!filter.types.includes(event.type as EventType)) {
        return false;
      }
    }

    // For message events, check senderId and recipientId
    if (this.isMessageEvent(event)) {
      if (filter.senderId && event.metadata.senderId !== filter.senderId) {
        return false;
      }
      if (
        filter.recipientId &&
        !event.metadata.recipients?.includes(filter.recipientId)
      ) {
        return false;
      }
    }

    // For block events, check blockId
    if (this.isBlockEvent(event)) {
      if (filter.blockId && event.data.blockId !== filter.blockId) {
        return false;
      }
    }

    return true;
  }

  private isMessageEvent(event: SystemEvent): event is IMessageEvent {
    return Object.values(MessageEventType).includes(event.type as MessageEventType);
  }

  private isBlockEvent(
    event: SystemEvent,
  ): event is IBlockAvailabilityEvent | IBlockReplicatedEvent {
    return Object.values(BlockEventType).includes(event.type as BlockEventType);
  }
}
