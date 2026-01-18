/**
 * Message priority levels for routing and processing.
 * 
 * @remarks
 * Higher priority messages should be processed first.
 * 
 * @see Requirements 6.3, 6.4
 */
export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
}
