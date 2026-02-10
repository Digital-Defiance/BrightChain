/**
 * Communication enumerations for the BrightChain communication API.
 * Requirements: 5.1, 6.1
 */

export enum DefaultRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

export enum Permission {
  SEND_MESSAGES = 'send_messages',
  DELETE_OWN_MESSAGES = 'delete_own_messages',
  DELETE_ANY_MESSAGE = 'delete_any_message',
  MANAGE_MEMBERS = 'manage_members',
  MANAGE_ROLES = 'manage_roles',
  MANAGE_CHANNEL = 'manage_channel',
  CREATE_INVITES = 'create_invites',
  PIN_MESSAGES = 'pin_messages',
  MUTE_MEMBERS = 'mute_members',
  KICK_MEMBERS = 'kick_members',
}

export enum ChannelVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  SECRET = 'secret',
  INVISIBLE = 'invisible',
}

export enum PresenceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  IDLE = 'idle',
  DO_NOT_DISTURB = 'dnd',
}

export enum CommunicationEventType {
  MESSAGE_SENT = 'communication:message_sent',
  MESSAGE_DELETED = 'communication:message_deleted',
  TYPING_START = 'communication:typing_start',
  TYPING_STOP = 'communication:typing_stop',
  PRESENCE_CHANGED = 'communication:presence_changed',
  REACTION_ADDED = 'communication:reaction_added',
  REACTION_REMOVED = 'communication:reaction_removed',
  MESSAGE_EDITED = 'communication:message_edited',
  MESSAGE_PINNED = 'communication:message_pinned',
  MESSAGE_UNPINNED = 'communication:message_unpinned',
  MEMBER_JOINED = 'communication:member_joined',
  MEMBER_LEFT = 'communication:member_left',
  MEMBER_KICKED = 'communication:member_kicked',
  MEMBER_MUTED = 'communication:member_muted',
  GROUP_CREATED = 'communication:group_created',
  CHANNEL_UPDATED = 'communication:channel_updated',
  MESSAGE_EXPIRED = 'communication:message_expired',
  MESSAGE_EXPLODED = 'communication:message_exploded',
  MESSAGE_READ_COUNT_EXCEEDED = 'communication:message_read_count_exceeded',
}

export const DEFAULT_ROLE_PERMISSIONS: Record<DefaultRole, Permission[]> = {
  [DefaultRole.OWNER]: Object.values(Permission),
  [DefaultRole.ADMIN]: [
    Permission.SEND_MESSAGES,
    Permission.DELETE_OWN_MESSAGES,
    Permission.DELETE_ANY_MESSAGE,
    Permission.MANAGE_MEMBERS,
    Permission.CREATE_INVITES,
    Permission.PIN_MESSAGES,
    Permission.MUTE_MEMBERS,
    Permission.KICK_MEMBERS,
  ],
  [DefaultRole.MODERATOR]: [
    Permission.SEND_MESSAGES,
    Permission.DELETE_OWN_MESSAGES,
    Permission.DELETE_ANY_MESSAGE,
    Permission.PIN_MESSAGES,
    Permission.MUTE_MEMBERS,
    Permission.KICK_MEMBERS,
  ],
  [DefaultRole.MEMBER]: [
    Permission.SEND_MESSAGES,
    Permission.DELETE_OWN_MESSAGES,
  ],
};
