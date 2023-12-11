/**
 * MessageOperationsService — shared message operation logic for Groups and Channels.
 *
 * Encapsulates edit, delete, pin/unpin, and reaction operations with
 * permission checks. Both GroupService and ChannelService delegate to
 * this service to avoid duplicating message operation logic.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.6
 */

import { v4 as uuidv4 } from 'uuid';
import { Permission } from '../../enumerations/communication';
import { ICommunicationMessage } from '../../interfaces/communication';
import { PermissionService } from './permissionService';

// ─── Error classes ──────────────────────────────────────────────────────────

export class MessageNotFoundError extends Error {
  constructor(messageId: string) {
    super(`Message ${messageId} not found`);
    this.name = 'MessageNotFoundError';
  }
}

export class MessageAuthorError extends Error {
  constructor() {
    super('You can only edit messages you authored');
    this.name = 'MessageAuthorError';
  }
}

export class MessagePermissionError extends Error {
  public readonly missingPermission: Permission;
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = 'MessagePermissionError';
    this.missingPermission = permission;
  }
}

export class MessageReactionNotFoundError extends Error {
  constructor(reactionId: string) {
    super(`Reaction ${reactionId} not found`);
    this.name = 'MessageReactionNotFoundError';
  }
}

/**
 * Context that holds a pinnedMessageIds list (both IGroup and IChannel).
 */
export interface IPinnableContext {
  pinnedMessageIds: string[];
}

/**
 * Shared message operations for edit, delete, pin, and reaction logic.
 * Callers are responsible for membership/existence checks on the context
 * (group or channel) before invoking these methods.
 */
export class MessageOperationsService {
  constructor(private readonly permissionService: PermissionService) {}

  /**
   * Edit a message authored by the requesting member.
   * Preserves previous content in editHistory.
   *
   * Requirement 9.1: update content, preserve edit history, set editedAt.
   */
  editMessage(
    messages: ICommunicationMessage[],
    messageId: string,
    memberId: string,
    newContent: string,
    messageNotFoundFactory: (id: string) => Error,
    authorErrorFactory: () => Error,
  ): ICommunicationMessage {
    const message = messages.find((m) => m.id === messageId);
    if (!message) throw messageNotFoundFactory(messageId);

    if (message.senderId !== memberId) {
      throw authorErrorFactory();
    }

    message.editHistory.push({
      content: message.encryptedContent,
      editedAt: new Date(),
    });

    message.encryptedContent = newContent;
    message.editedAt = new Date();

    return message;
  }

  /**
   * Delete a message. Authors can delete their own; moderators/admins
   * need DELETE_ANY_MESSAGE permission.
   *
   * Requirements 9.2, 9.3: mark as deleted, set deletedBy.
   */
  deleteMessage(
    messages: ICommunicationMessage[],
    contextId: string,
    messageId: string,
    memberId: string,
    messageNotFoundFactory: (id: string) => Error,
    permissionErrorFactory: (p: Permission) => Error,
  ): void {
    const message = messages.find((m) => m.id === messageId);
    if (!message) throw messageNotFoundFactory(messageId);

    const isAuthor = message.senderId === memberId;
    if (!isAuthor) {
      if (
        !this.permissionService.hasPermission(
          memberId,
          contextId,
          Permission.DELETE_ANY_MESSAGE,
        )
      ) {
        throw permissionErrorFactory(Permission.DELETE_ANY_MESSAGE);
      }
    }

    message.deleted = true;
    message.deletedBy = memberId;
  }

  /**
   * Pin a message. Requires PIN_MESSAGES permission.
   * Adds the message ID to the context's pinnedMessageIds list.
   *
   * Requirement 9.3: add to pinned messages list.
   */
  pinMessage(
    messages: ICommunicationMessage[],
    contextId: string,
    messageId: string,
    memberId: string,
    context: IPinnableContext,
    messageNotFoundFactory: (id: string) => Error,
    permissionErrorFactory: (p: Permission) => Error,
  ): void {
    if (
      !this.permissionService.hasPermission(
        memberId,
        contextId,
        Permission.PIN_MESSAGES,
      )
    ) {
      throw permissionErrorFactory(Permission.PIN_MESSAGES);
    }

    const message = messages.find((m) => m.id === messageId);
    if (!message) throw messageNotFoundFactory(messageId);

    message.pinned = true;
    if (!context.pinnedMessageIds.includes(messageId)) {
      context.pinnedMessageIds.push(messageId);
    }
  }

  /**
   * Unpin a message. Requires PIN_MESSAGES permission.
   * Removes the message ID from the context's pinnedMessageIds list.
   *
   * Requirement 9.3: remove from pinned messages list.
   */
  unpinMessage(
    messages: ICommunicationMessage[],
    contextId: string,
    messageId: string,
    memberId: string,
    context: IPinnableContext,
    messageNotFoundFactory: (id: string) => Error,
    permissionErrorFactory: (p: Permission) => Error,
  ): void {
    if (
      !this.permissionService.hasPermission(
        memberId,
        contextId,
        Permission.PIN_MESSAGES,
      )
    ) {
      throw permissionErrorFactory(Permission.PIN_MESSAGES);
    }

    const message = messages.find((m) => m.id === messageId);
    if (!message) throw messageNotFoundFactory(messageId);

    message.pinned = false;
    context.pinnedMessageIds = context.pinnedMessageIds.filter(
      (id) => id !== messageId,
    );
  }

  /**
   * Add a reaction to a message.
   *
   * Requirement 9.4: add reaction with emoji and member tracking.
   */
  addReaction(
    messages: ICommunicationMessage[],
    messageId: string,
    memberId: string,
    emoji: string,
    messageNotFoundFactory: (id: string) => Error,
  ): string {
    const message = messages.find((m) => m.id === messageId);
    if (!message) throw messageNotFoundFactory(messageId);

    const reactionId = uuidv4();
    message.reactions.push({
      id: reactionId,
      emoji,
      memberId,
      createdAt: new Date(),
    });

    return reactionId;
  }

  /**
   * Remove a reaction from a message.
   *
   * Requirement 9.4: remove reaction from message.
   */
  removeReaction(
    messages: ICommunicationMessage[],
    messageId: string,
    reactionId: string,
    messageNotFoundFactory: (id: string) => Error,
    reactionNotFoundFactory: (id: string) => Error,
  ): void {
    const message = messages.find((m) => m.id === messageId);
    if (!message) throw messageNotFoundFactory(messageId);

    const reactionIndex = message.reactions.findIndex(
      (r) => r.id === reactionId,
    );
    if (reactionIndex === -1) throw reactionNotFoundFactory(reactionId);

    message.reactions.splice(reactionIndex, 1);
  }
}
