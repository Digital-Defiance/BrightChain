import type {
  ISyncWsFileChanged,
  ISyncWsFileDestroyed,
  ISyncWsFolderChanged,
  SyncWsMessage,
} from '@brightchain/digitalburnbag-lib';
import { isSyncWsMessage } from '@brightchain/digitalburnbag-lib';
import WebSocket from 'ws';

/**
 * Callback for when a remote file change is received via WebSocket.
 */
export interface ISyncChangeHandler {
  onFileChanged(change: ISyncWsFileChanged<string>): void;
  onFolderChanged(change: ISyncWsFolderChanged<string>): void;
  onFileDestroyed(change: ISyncWsFileDestroyed<string>): void;
}

export interface IWebSocketSyncTransportOptions {
  /** WebSocket server URL (e.g. wss://api.brightchain.org) */
  wsUrl: string;
  /** JWT auth token */
  authToken: string;
  /** User ID to subscribe to sync events for */
  userId: string;
  /** Reconnect delay in ms (default: 3000) */
  reconnectDelayMs?: number;
  /** Max reconnect attempts (default: Infinity) */
  maxReconnectAttempts?: number;
}

/**
 * WebSocket transport for real-time sync event delivery.
 *
 * Connects to the BrightChain ClientWebSocketServer, authenticates via JWT,
 * subscribes to the user's burnbag sync room, and forwards incoming file/folder
 * change events to the registered handler.
 *
 * Includes automatic reconnection with exponential backoff.
 *
 * This replaces polling as the primary mechanism for detecting remote changes.
 * The SyncService still polls as a fallback when the WebSocket is disconnected.
 */
export class WebSocketSyncTransport {
  private ws: WebSocket | null = null;
  private handler: ISyncChangeHandler | null = null;
  private options: Required<IWebSocketSyncTransportOptions>;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private intentionallyClosed = false;
  private _connected = false;

  constructor(options: IWebSocketSyncTransportOptions) {
    this.options = {
      reconnectDelayMs: 3000,
      maxReconnectAttempts: Infinity,
      ...options,
    };
  }

  /** Register the handler that receives sync events. */
  setHandler(handler: ISyncChangeHandler): void {
    this.handler = handler;
  }

  /** Connect to the WebSocket server and subscribe to sync events. */
  connect(): void {
    if (this.ws) return;
    this.intentionallyClosed = false;

    const url = `${this.options.wsUrl}?token=${encodeURIComponent(this.options.authToken)}`;
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this._connected = true;
      this.reconnectAttempts = 0;

      // Subscribe to the user's sync room
      this.send({
        type: 'burnbag:subscribe',
        userId: this.options.userId,
      });
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (isSyncWsMessage(msg)) {
          this.handleMessage(msg as SyncWsMessage<string>);
        }
      } catch {
        // Ignore non-JSON or unrecognized messages
      }
    });

    this.ws.on('close', () => {
      this._connected = false;
      this.ws = null;
      if (!this.intentionallyClosed) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', () => {
      // Error is followed by close event — reconnect handled there
    });
  }

  /** Disconnect from the WebSocket server. */
  disconnect(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.ws) {
      this.send({ type: 'burnbag:unsubscribe' });
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
  }

  /** Whether the WebSocket is currently connected. */
  get connected(): boolean {
    return this._connected;
  }

  private send(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(msg: SyncWsMessage<string>): void {
    if (!this.handler) return;

    switch (msg.type) {
      case 'burnbag:file_changed':
        this.handler.onFileChanged(msg);
        break;
      case 'burnbag:folder_changed':
        this.handler.onFolderChanged(msg);
        break;
      case 'burnbag:file_destroyed':
        this.handler.onFileDestroyed(msg);
        break;
      case 'burnbag:subscribed':
        // Subscription confirmed — no action needed
        break;
      default:
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      return;
    }

    // Exponential backoff: delay * 2^attempts, capped at 60s
    const delay = Math.min(
      this.options.reconnectDelayMs * Math.pow(2, this.reconnectAttempts),
      60_000,
    );
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delay);
  }
}
