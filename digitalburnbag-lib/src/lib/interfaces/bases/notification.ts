import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * A real-time or queued notification for file platform events.
 */
export interface INotification<TID extends PlatformID> {
  id: TID;
  type:
    | 'share_accessed'
    | 'file_downloaded'
    | 'file_previewed'
    | 'quorum_requested'
    | 'canary_triggered';
  targetId: TID;
  targetType: 'file' | 'folder';
  actorId?: TID;
  /** "Anonymous" for anonymous links */
  actorName?: string;
  /** Human-readable notification message */
  message: string;
  /** Whether the notification has been read */
  read: boolean;
  timestamp: Date | string;
  createdAt: Date | string;
  metadata: Record<string, unknown>;
}

/**
 * Per-file/folder notification preferences for a file owner.
 */
export interface INotificationPreferences {
  enabled: boolean;
  /** Notify on these access types only (empty = all) */
  accessTypes: ('view' | 'download' | 'preview')[];
  /** Notify via WebSocket, email, or both */
  channels: ('websocket' | 'email')[];
}
