import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * WebSocket message types for the burnbag real-time sync channel.
 *
 * These messages flow between the server (ClientWebSocketServer room)
 * and the desktop sync client (WebSocketSyncTransport).
 */

/** Server -> Client: a file or folder was changed remotely. */
export interface ISyncWsFileChanged<TID extends PlatformID> {
  type: 'burnbag:file_changed';
  fileId: TID;
  folderId: TID;
  fileName: string;
  changeType: 'created' | 'modified' | 'deleted' | 'moved' | 'renamed';
  remoteVersionHash: string;
  modifiedBy: TID;
  timestamp: string;
}

/** Server -> Client: a folder was created or deleted. */
export interface ISyncWsFolderChanged<TID extends PlatformID> {
  type: 'burnbag:folder_changed';
  folderId: TID;
  parentFolderId: TID;
  folderName: string;
  changeType: 'created' | 'deleted' | 'renamed' | 'moved';
  modifiedBy: TID;
  timestamp: string;
}

/** Server -> Client: ACL or share permissions changed for a file/folder. */
export interface ISyncWsPermissionChanged<TID extends PlatformID> {
  type: 'burnbag:permission_changed';
  targetId: TID;
  targetType: 'file' | 'folder';
  changeType: 'granted' | 'revoked' | 'modified';
  affectedUserId: TID;
  timestamp: string;
}

/** Server -> Client: a file was destroyed (vault destroyed). */
export interface ISyncWsFileDestroyed<TID extends PlatformID> {
  type: 'burnbag:file_destroyed';
  fileId: TID;
  destroyedBy: TID;
  timestamp: string;
}

/** Client -> Server: subscribe to sync events for a user. */
export interface ISyncWsSubscribe {
  type: 'burnbag:subscribe';
  userId: string;
}

/** Client -> Server: unsubscribe from sync events. */
export interface ISyncWsUnsubscribe {
  type: 'burnbag:unsubscribe';
}

/** Server -> Client: subscription confirmed. */
export interface ISyncWsSubscribed {
  type: 'burnbag:subscribed';
  userId: string;
  room: string;
}

/** Union of all sync WebSocket messages. */
export type SyncWsMessage<TID extends PlatformID> =
  | ISyncWsFileChanged<TID>
  | ISyncWsFolderChanged<TID>
  | ISyncWsPermissionChanged<TID>
  | ISyncWsFileDestroyed<TID>
  | ISyncWsSubscribe
  | ISyncWsUnsubscribe
  | ISyncWsSubscribed;

/** Type guard for sync WS messages. */
export function isSyncWsMessage(msg: unknown): msg is SyncWsMessage<string> {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    typeof (msg as { type: unknown }).type === 'string' &&
    (msg as { type: string }).type.startsWith('burnbag:')
  );
}

/** Get the room name for a user's sync channel. */
export function getSyncRoomName(userId: string): string {
  return `burnbag:sync:${userId}`;
}
