/**
 * Node event types
 */
export enum NodeEventType {
  STATUS_CHANGE = 'node:status',
  PEER_CONNECT = 'node:peer:connect',
  PEER_DISCONNECT = 'node:peer:disconnect',
  BLOCK_TEMPERATURE = 'node:block:temperature',
  BLOCK_LOCATION = 'node:block:location',
  SYNC_START = 'node:sync:start',
  SYNC_COMPLETE = 'node:sync:complete',
}
