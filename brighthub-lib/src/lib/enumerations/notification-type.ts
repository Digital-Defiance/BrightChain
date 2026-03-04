/**
 * Types of notifications in the BrightHub system
 */
export enum NotificationType {
  /** Someone liked your post */
  Like = 'like',
  /** Someone replied to your post */
  Reply = 'reply',
  /** Someone mentioned you in a post */
  Mention = 'mention',
  /** Someone followed you */
  Follow = 'follow',
  /** Someone sent you a follow request */
  FollowRequest = 'follow_request',
  /** Someone reposted your post */
  Repost = 'repost',
  /** Someone quoted your post */
  Quote = 'quote',
  /** You received a new direct message */
  NewMessage = 'new_message',
  /** You received a message request */
  MessageRequest = 'message_request',
  /** Someone reacted to your message */
  MessageReaction = 'message_reaction',
  /** System alert (account-related) */
  SystemAlert = 'system_alert',
  /** Security-related notification (password changes, login alerts, etc.) */
  SecurityAlert = 'security_alert',
  /** Feature announcement or product update */
  FeatureAnnouncement = 'feature_announcement',
  /** Reminder to reconnect with an inactive connection */
  ReconnectReminder = 'reconnect_reminder',
}
