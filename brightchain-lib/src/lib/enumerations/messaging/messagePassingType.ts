/**
 * WebSocket message types for message passing system.
 *
 * @remarks
 * All message passing types use the 'message:' prefix to avoid
 * conflicts with existing WebSocket message types.
 *
 * @see Requirements 8.1, 8.5, 13.4
 */
export enum MessagePassingType {
  MESSAGE_SEND = 'message:send',
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_ACK = 'message:ack',
  MESSAGE_QUERY = 'message:query',
  MESSAGE_QUERY_RESPONSE = 'message:query_response',
  EVENT_SUBSCRIBE = 'message:event_subscribe',
  EVENT_UNSUBSCRIBE = 'message:event_unsubscribe',
  EVENT_NOTIFICATION = 'message:event_notification',
}
