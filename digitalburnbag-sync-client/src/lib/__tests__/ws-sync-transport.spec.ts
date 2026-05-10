import { isSyncWsMessage } from '@brightchain/digitalburnbag-lib';
import WebSocket from 'ws';
import {
  ISyncChangeHandler,
  IWebSocketSyncTransportOptions,
  WebSocketSyncTransport,
} from '../adapters/ws-sync-transport';

jest.mock('ws');

const MockWebSocket = WebSocket as unknown as jest.Mock;

function createMockWsInstance() {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  const instance = {
    on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1,
    listeners,
  };
  return instance;
}

function triggerEvent(
  instance: ReturnType<typeof createMockWsInstance>,
  event: string,
  ...args: unknown[]
) {
  const cbs = instance.listeners[event] ?? [];
  for (const cb of cbs) cb(...args);
}

describe('WebSocketSyncTransport', () => {
  let transport: WebSocketSyncTransport;
  let handler: jest.Mocked<ISyncChangeHandler>;
  let mockWs: ReturnType<typeof createMockWsInstance>;

  const defaultOptions: IWebSocketSyncTransportOptions = {
    wsUrl: 'wss://api.example.com',
    authToken: 'test-jwt-token',
    userId: 'user-123',
    reconnectDelayMs: 100,
    maxReconnectAttempts: 3,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    handler = {
      onFileChanged: jest.fn(),
      onFolderChanged: jest.fn(),
      onFileDestroyed: jest.fn(),
    };

    mockWs = createMockWsInstance();
    MockWebSocket.mockImplementation(() => mockWs);
    Object.defineProperty(WebSocket, 'OPEN', { value: 1, configurable: true });

    transport = new WebSocketSyncTransport(defaultOptions);
    transport.setHandler(handler);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Sanity check that the type guard works in this test environment
  it('isSyncWsMessage should recognize burnbag messages', () => {
    const msg = { type: 'burnbag:file_changed', fileId: 'f1' };
    expect(isSyncWsMessage(msg)).toBe(true);
    expect(isSyncWsMessage({ type: 'other' })).toBe(false);
  });

  it('should connect with auth token in URL', () => {
    transport.connect();
    expect(MockWebSocket).toHaveBeenCalledWith(
      `wss://api.example.com?token=${encodeURIComponent('test-jwt-token')}`,
    );
  });

  it('should subscribe to sync room on open', () => {
    transport.connect();
    triggerEvent(mockWs, 'open');

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'burnbag:subscribe', userId: 'user-123' }),
    );
    expect(transport.connected).toBe(true);
  });

  it('should dispatch file_changed to handler', () => {
    transport.connect();
    triggerEvent(mockWs, 'open');

    const msg = {
      type: 'burnbag:file_changed',
      fileId: 'f1',
      folderId: 'folder1',
      fileName: 'test.txt',
      changeType: 'modified',
      remoteVersionHash: 'abc123',
      modifiedBy: 'user-456',
      timestamp: '2025-01-01T00:00:00Z',
    };

    // Verify the type guard works on this message
    expect(isSyncWsMessage(msg)).toBe(true);

    // The ws library delivers message data — try both string and Buffer
    triggerEvent(mockWs, 'message', Buffer.from(JSON.stringify(msg)));

    expect(handler.onFileChanged).toHaveBeenCalledTimes(1);
    expect(handler.onFileChanged).toHaveBeenCalledWith(msg);
  });

  it('should dispatch folder_changed to handler', () => {
    transport.connect();
    triggerEvent(mockWs, 'open');

    const msg = {
      type: 'burnbag:folder_changed',
      folderId: 'folder1',
      parentFolderId: 'root',
      folderName: 'New Folder',
      changeType: 'created',
      modifiedBy: 'user-456',
      timestamp: '2025-01-01T00:00:00Z',
    };
    triggerEvent(mockWs, 'message', Buffer.from(JSON.stringify(msg)));

    expect(handler.onFolderChanged).toHaveBeenCalledWith(msg);
  });

  it('should dispatch file_destroyed to handler', () => {
    transport.connect();
    triggerEvent(mockWs, 'open');

    const msg = {
      type: 'burnbag:file_destroyed',
      fileId: 'f1',
      destroyedBy: 'user-456',
      timestamp: '2025-01-01T00:00:00Z',
    };
    triggerEvent(mockWs, 'message', Buffer.from(JSON.stringify(msg)));

    expect(handler.onFileDestroyed).toHaveBeenCalledWith(msg);
  });

  it('should ignore non-JSON messages', () => {
    transport.connect();
    triggerEvent(mockWs, 'open');
    triggerEvent(mockWs, 'message', Buffer.from('not-json'));

    expect(handler.onFileChanged).not.toHaveBeenCalled();
  });

  it('should ignore non-burnbag messages', () => {
    transport.connect();
    triggerEvent(mockWs, 'open');
    triggerEvent(
      mockWs,
      'message',
      Buffer.from(JSON.stringify({ type: 'other:event' })),
    );

    expect(handler.onFileChanged).not.toHaveBeenCalled();
  });

  it('should send unsubscribe and close on disconnect', () => {
    transport.connect();
    triggerEvent(mockWs, 'open');

    transport.disconnect();

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'burnbag:unsubscribe' }),
    );
    expect(mockWs.close).toHaveBeenCalled();
    expect(transport.connected).toBe(false);
  });

  it('should attempt reconnection on unexpected close', () => {
    transport.connect();
    triggerEvent(mockWs, 'open');

    const mockWs2 = createMockWsInstance();
    MockWebSocket.mockImplementation(() => mockWs2);

    triggerEvent(mockWs, 'close');
    expect(transport.connected).toBe(false);

    jest.advanceTimersByTime(100);
    expect(MockWebSocket).toHaveBeenCalledTimes(2);
  });

  it('should not reconnect after intentional disconnect', () => {
    transport.connect();
    triggerEvent(mockWs, 'open');

    transport.disconnect();
    triggerEvent(mockWs, 'close');

    jest.advanceTimersByTime(10000);
    expect(MockWebSocket).toHaveBeenCalledTimes(1);
  });

  it('should stop reconnecting after maxReconnectAttempts', () => {
    transport.connect();
    triggerEvent(mockWs, 'open');

    for (let i = 0; i < 3; i++) {
      const nextMock = createMockWsInstance();
      MockWebSocket.mockImplementation(() => nextMock);

      triggerEvent(mockWs, 'close');
      jest.advanceTimersByTime(100 * Math.pow(2, i));
      mockWs = nextMock;
    }

    expect(MockWebSocket).toHaveBeenCalledTimes(4);

    triggerEvent(mockWs, 'close');
    jest.advanceTimersByTime(60000);
    expect(MockWebSocket).toHaveBeenCalledTimes(4);
  });

  it('should handle subscribed confirmation silently', () => {
    transport.connect();
    triggerEvent(mockWs, 'open');

    triggerEvent(
      mockWs,
      'message',
      Buffer.from(
        JSON.stringify({
          type: 'burnbag:subscribed',
          userId: 'user-123',
          room: 'burnbag:sync:user-123',
        }),
      ),
    );

    expect(handler.onFileChanged).not.toHaveBeenCalled();
    expect(handler.onFolderChanged).not.toHaveBeenCalled();
    expect(handler.onFileDestroyed).not.toHaveBeenCalled();
  });

  it('should not connect twice if already connected', () => {
    transport.connect();
    transport.connect();
    expect(MockWebSocket).toHaveBeenCalledTimes(1);
  });

  it('should not dispatch when no handler is set', () => {
    const transport2 = new WebSocketSyncTransport(defaultOptions);
    transport2.connect();
    triggerEvent(mockWs, 'open');

    triggerEvent(
      mockWs,
      'message',
      Buffer.from(
        JSON.stringify({
          type: 'burnbag:file_changed',
          fileId: 'f1',
          folderId: 'folder1',
          fileName: 'test.txt',
          changeType: 'modified',
          remoteVersionHash: 'abc',
          modifiedBy: 'u1',
          timestamp: '2025-01-01T00:00:00Z',
        }),
      ),
    );
  });
});
