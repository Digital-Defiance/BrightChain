import {
  AvailabilityState,
  CommunicationContextType,
  CommunicationEvent,
  CommunicationEventType,
  IMessageMetadata,
  PresenceStatus,
} from '@brightchain/brightchain-lib';
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

export type EventType =
  | MessageEventType
  | BlockEventType
  | PartitionEventType
  | CommunicationEventType;

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
  | IPartitionExitedEvent
  | CommunicationEvent;

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

  // ─── Communication event emitters ─────────────────────────────────────

  /**
   * Emit a message sent event.
   * @requirements 7.1
   */
  emitMessageSent(
    contextType: CommunicationContextType,
    contextId: string,
    messageId: string,
    senderId: string,
  ): void {
    const event: CommunicationEvent = {
      type: CommunicationEventType.MESSAGE_SENT,
      timestamp: new Date(),
      contextType,
      contextId,
      data: { messageId, senderId },
    };
    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit a message deleted event.
   * @requirements 7.1
   */
  emitMessageDeleted(
    contextType: CommunicationContextType,
    contextId: string,
    messageId: string,
    deletedBy: string,
  ): void {
    const event: CommunicationEvent = {
      type: CommunicationEventType.MESSAGE_DELETED,
      timestamp: new Date(),
      contextType,
      contextId,
      data: { messageId, deletedBy },
    };
    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit a typing indicator event (start or stop).
   * @requirements 7.2
   */
  emitTypingEvent(
    eventType:
      | CommunicationEventType.TYPING_START
      | CommunicationEventType.TYPING_STOP,
    contextType: CommunicationContextType,
    contextId: string,
    memberId: string,
  ): void {
    const event: CommunicationEvent = {
      type: eventType,
      timestamp: new Date(),
      contextType,
      contextId,
      data: { memberId },
    };
    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit a presence changed event.
   * @requirements 7.3
   */
  emitPresenceChanged(
    contextType: CommunicationContextType,
    contextId: string,
    memberId: string,
    status: PresenceStatus,
  ): void {
    const event: CommunicationEvent = {
      type: CommunicationEventType.PRESENCE_CHANGED,
      timestamp: new Date(),
      contextType,
      contextId,
      data: { memberId, status },
    };
    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit a reaction added or removed event.
   * @requirements 7.5
   */
  emitReactionEvent(
    eventType:
      | CommunicationEventType.REACTION_ADDED
      | CommunicationEventType.REACTION_REMOVED,
    contextType: CommunicationContextType,
    contextId: string,
    messageId: string,
    memberId: string,
    emoji: string,
    reactionId: string,
  ): void {
    const event: CommunicationEvent = {
      type: eventType,
      timestamp: new Date(),
      contextType,
      contextId,
      data: { messageId, memberId, emoji, reactionId },
    };
    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit a message edited event.
   * @requirements 7.1
   */
  emitMessageEdited(
    contextType: CommunicationContextType,
    contextId: string,
    messageId: string,
    memberId: string,
  ): void {
    const event: CommunicationEvent = {
      type: CommunicationEventType.MESSAGE_EDITED,
      timestamp: new Date(),
      contextType,
      contextId,
      data: { messageId, memberId },
    };
    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit a message pinned or unpinned event.
   * @requirements 7.1
   */
  emitMessagePinEvent(
    eventType:
      | CommunicationEventType.MESSAGE_PINNED
      | CommunicationEventType.MESSAGE_UNPINNED,
    contextType: CommunicationContextType,
    contextId: string,
    messageId: string,
    memberId: string,
  ): void {
    const event: CommunicationEvent = {
      type: eventType,
      timestamp: new Date(),
      contextType,
      contextId,
      data: { messageId, memberId },
    };
    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit a member joined event.
   * @requirements 7.1
   */
  emitMemberJoined(
    contextType: CommunicationContextType,
    contextId: string,
    memberId: string,
  ): void {
    const event: CommunicationEvent = {
      type: CommunicationEventType.MEMBER_JOINED,
      timestamp: new Date(),
      contextType,
      contextId,
      data: { memberId },
    };
    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit a member left event.
   * @requirements 7.1
   */
  emitMemberLeft(
    contextType: CommunicationContextType,
    contextId: string,
    memberId: string,
  ): void {
    const event: CommunicationEvent = {
      type: CommunicationEventType.MEMBER_LEFT,
      timestamp: new Date(),
      contextType,
      contextId,
      data: { memberId },
    };
    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit a member kicked event.
   * @requirements 7.1
   */
  emitMemberKicked(
    contextType: CommunicationContextType,
    contextId: string,
    memberId: string,
    kickedBy: string,
  ): void {
    const event: CommunicationEvent = {
      type: CommunicationEventType.MEMBER_KICKED,
      timestamp: new Date(),
      contextType,
      contextId,
      data: { memberId, kickedBy },
    };
    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit a member muted event.
   * @requirements 7.1
   */
  emitMemberMuted(
    contextType: CommunicationContextType,
    contextId: string,
    memberId: string,
    mutedBy: string,
    durationMs: number,
  ): void {
    const event: CommunicationEvent = {
      type: CommunicationEventType.MEMBER_MUTED,
      timestamp: new Date(),
      contextType,
      contextId,
      data: { memberId, mutedBy, durationMs },
    };
    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit a group created event.
   * @requirements 7.1
   */
  emitGroupCreated(
    contextId: string,
    groupId: string,
    creatorId: string,
    memberIds: string[],
  ): void {
    const event: CommunicationEvent = {
      type: CommunicationEventType.GROUP_CREATED,
      timestamp: new Date(),
      contextType: 'group',
      contextId,
      data: { groupId, creatorId, memberIds },
    };
    this.addToHistory(event);
    this.broadcastEvent(event);
  }

  /**
   * Emit a channel updated event.
   * @requirements 7.1
   */
  emitChannelUpdated(
    contextId: string,
    channelId: string,
    updatedBy: string,
  ): void {
    const event: CommunicationEvent = {
      type: CommunicationEventType.CHANNEL_UPDATED,
      timestamp: new Date(),
      contextType: 'channel',
      contextId,
      data: { channelId, updatedBy },
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
    return Object.values(MessageEventType).includes(
      event.type as MessageEventType,
    );
  }

  private isBlockEvent(
    event: SystemEvent,
  ): event is IBlockAvailabilityEvent | IBlockReplicatedEvent {
    return Object.values(BlockEventType).includes(event.type as BlockEventType);
  }

  private isCommunicationEvent(
    event: SystemEvent,
  ): event is CommunicationEvent {
    return Object.values(CommunicationEventType).includes(
      event.type as CommunicationEventType,
    );
  }
}
