/**
 * Abstract event emitter interface for communication services.
 *
 * This interface decouples communication services from any specific
 * transport mechanism (WebSocket, EventSource, polling, etc.).
 * brightchain-api-lib provides a WebSocket-based implementation;
 * brightchain-react (or other clients) can supply browser-compatible ones.
 *
 * Requirements: 12.1, 12.2
 */

import {
  CommunicationEventType,
  PresenceStatus,
} from '../../enumerations/communication';
import { CommunicationContextType } from '../communicationEvents';

/**
 * Platform-agnostic event emitter for communication events.
 * Each method corresponds to a specific event type broadcast
 * by the communication services (conversation, group, channel).
 */
export interface ICommunicationEventEmitter {
  /** Emit when a new message is sent in a context. */
  emitMessageSent(
    contextType: CommunicationContextType,
    contextId: string,
    messageId: string,
    senderId: string,
  ): void;

  /** Emit when a message is deleted. */
  emitMessageDeleted(
    contextType: CommunicationContextType,
    contextId: string,
    messageId: string,
    deletedBy: string,
  ): void;

  /** Emit when a message is edited. */
  emitMessageEdited(
    contextType: CommunicationContextType,
    contextId: string,
    messageId: string,
    memberId: string,
  ): void;

  /** Emit a typing indicator event (start or stop). */
  emitTypingEvent(
    eventType:
      | CommunicationEventType.TYPING_START
      | CommunicationEventType.TYPING_STOP,
    contextType: CommunicationContextType,
    contextId: string,
    memberId: string,
  ): void;

  /** Emit when a member's presence status changes. */
  emitPresenceChanged(
    contextType: CommunicationContextType,
    contextId: string,
    memberId: string,
    status: PresenceStatus,
  ): void;

  /** Emit when a reaction is added or removed on a message. */
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
  ): void;

  /** Emit when a message is pinned or unpinned. */
  emitMessagePinEvent(
    eventType:
      | CommunicationEventType.MESSAGE_PINNED
      | CommunicationEventType.MESSAGE_UNPINNED,
    contextType: CommunicationContextType,
    contextId: string,
    messageId: string,
    memberId: string,
  ): void;

  /** Emit when a member joins a group or channel. */
  emitMemberJoined(
    contextType: CommunicationContextType,
    contextId: string,
    memberId: string,
  ): void;

  /** Emit when a member leaves a group or channel. */
  emitMemberLeft(
    contextType: CommunicationContextType,
    contextId: string,
    memberId: string,
  ): void;

  /** Emit when a member is kicked from a group or channel. */
  emitMemberKicked(
    contextType: CommunicationContextType,
    contextId: string,
    memberId: string,
    kickedBy: string,
  ): void;

  /** Emit when a member is muted in a group or channel. */
  emitMemberMuted(
    contextType: CommunicationContextType,
    contextId: string,
    memberId: string,
    mutedBy: string,
    durationMs: number,
  ): void;

  /** Emit when a new group is created. */
  emitGroupCreated(
    contextId: string,
    groupId: string,
    creatorId: string,
    memberIds: string[],
  ): void;

  /** Emit when a channel is updated (visibility, topic, name). */
  emitChannelUpdated(
    contextId: string,
    channelId: string,
    updatedBy: string,
  ): void;
}

/**
 * No-op event emitter for contexts where real-time events are not needed
 * (e.g., unit tests, CLI tools, or browser clients without live transport).
 */
export class NullEventEmitter implements ICommunicationEventEmitter {
  emitMessageSent(): void {
    /* no-op */
  }
  emitMessageDeleted(): void {
    /* no-op */
  }
  emitMessageEdited(): void {
    /* no-op */
  }
  emitTypingEvent(): void {
    /* no-op */
  }
  emitPresenceChanged(): void {
    /* no-op */
  }
  emitReactionEvent(): void {
    /* no-op */
  }
  emitMessagePinEvent(): void {
    /* no-op */
  }
  emitMemberJoined(): void {
    /* no-op */
  }
  emitMemberLeft(): void {
    /* no-op */
  }
  emitMemberKicked(): void {
    /* no-op */
  }
  emitMemberMuted(): void {
    /* no-op */
  }
  emitGroupCreated(): void {
    /* no-op */
  }
  emitChannelUpdated(): void {
    /* no-op */
  }
}
