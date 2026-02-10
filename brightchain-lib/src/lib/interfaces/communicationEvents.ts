/**
 * Communication event interfaces for real-time WebSocket events.
 *
 * These shared interfaces define the payloads for communication events
 * (typing indicators, reactions, edits, pins, member changes, etc.)
 * broadcast via the EventNotificationSystem.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */

import {
  CommunicationEventType,
  PresenceStatus,
} from '../enumerations/communication';

/**
 * Context type for communication events — identifies whether the event
 * occurred in a conversation, group, or channel.
 */
export type CommunicationContextType = 'conversation' | 'group' | 'channel';

/**
 * Base interface for all communication events.
 */
export interface ICommunicationEventBase {
  type: CommunicationEventType;
  timestamp: Date;
  contextType: CommunicationContextType;
  contextId: string;
}

/**
 * Typing indicator event (start or stop).
 * Requirement 7.2: broadcast typing indicator to other participants.
 */
export interface ITypingEvent extends ICommunicationEventBase {
  type:
    | CommunicationEventType.TYPING_START
    | CommunicationEventType.TYPING_STOP;
  data: {
    memberId: string;
  };
}

/**
 * Presence change event.
 * Requirement 7.3: broadcast status change to shared-context members.
 */
export interface IPresenceChangedEvent extends ICommunicationEventBase {
  type: CommunicationEventType.PRESENCE_CHANGED;
  data: {
    memberId: string;
    status: PresenceStatus;
  };
}

/**
 * Reaction added/removed event.
 * Requirement 7.5: broadcast reaction event to all participants.
 */
export interface IReactionEvent extends ICommunicationEventBase {
  type:
    | CommunicationEventType.REACTION_ADDED
    | CommunicationEventType.REACTION_REMOVED;
  data: {
    messageId: string;
    memberId: string;
    emoji: string;
    reactionId: string;
  };
}

/**
 * Message edited event.
 * Requirement 7.1: broadcast edit event to participants.
 */
export interface IMessageEditedEvent extends ICommunicationEventBase {
  type: CommunicationEventType.MESSAGE_EDITED;
  data: {
    messageId: string;
    memberId: string;
  };
}

/**
 * Message pinned/unpinned event.
 * Requirement 7.1: broadcast pin event to participants.
 */
export interface IMessagePinEvent extends ICommunicationEventBase {
  type:
    | CommunicationEventType.MESSAGE_PINNED
    | CommunicationEventType.MESSAGE_UNPINNED;
  data: {
    messageId: string;
    memberId: string;
  };
}

/**
 * Member joined event (group or channel).
 * Requirement 7.1: broadcast member change events.
 */
export interface IMemberJoinedEvent extends ICommunicationEventBase {
  type: CommunicationEventType.MEMBER_JOINED;
  data: {
    memberId: string;
  };
}

/**
 * Member left event (group or channel).
 */
export interface IMemberLeftEvent extends ICommunicationEventBase {
  type: CommunicationEventType.MEMBER_LEFT;
  data: {
    memberId: string;
  };
}

/**
 * Member kicked event (group or channel).
 */
export interface IMemberKickedEvent extends ICommunicationEventBase {
  type: CommunicationEventType.MEMBER_KICKED;
  data: {
    memberId: string;
    kickedBy: string;
  };
}

/**
 * Member muted event (group or channel).
 */
export interface IMemberMutedEvent extends ICommunicationEventBase {
  type: CommunicationEventType.MEMBER_MUTED;
  data: {
    memberId: string;
    mutedBy: string;
    durationMs: number;
  };
}

/**
 * Group created event.
 */
export interface IGroupCreatedEvent extends ICommunicationEventBase {
  type: CommunicationEventType.GROUP_CREATED;
  data: {
    groupId: string;
    creatorId: string;
    memberIds: string[];
  };
}

/**
 * Channel updated event (visibility, topic, name change).
 */
export interface IChannelUpdatedEvent extends ICommunicationEventBase {
  type: CommunicationEventType.CHANNEL_UPDATED;
  data: {
    channelId: string;
    updatedBy: string;
  };
}

/**
 * Union type of all communication events.
 */
export type CommunicationEvent =
  | ITypingEvent
  | IPresenceChangedEvent
  | IReactionEvent
  | IMessageEditedEvent
  | IMessagePinEvent
  | IMessageSentEvent
  | IMessageDeletedEvent
  | IMemberJoinedEvent
  | IMemberLeftEvent
  | IMemberKickedEvent
  | IMemberMutedEvent
  | IGroupCreatedEvent
  | IChannelUpdatedEvent;

/**
 * Message sent event — emitted when a new message is sent.
 * Requirement 7.1: deliver message event to WebSocket connections.
 */
export interface IMessageSentEvent extends ICommunicationEventBase {
  type: CommunicationEventType.MESSAGE_SENT;
  data: {
    messageId: string;
    senderId: string;
  };
}

/**
 * Message deleted event — emitted when a message is deleted.
 * Requirement 7.1: broadcast deletion event to participants.
 */
export interface IMessageDeletedEvent extends ICommunicationEventBase {
  type: CommunicationEventType.MESSAGE_DELETED;
  data: {
    messageId: string;
    deletedBy: string;
  };
}
