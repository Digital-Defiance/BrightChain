# WebSocket Message Handlers for Block Availability and Discovery Protocol

## Overview

This module implements WebSocket message handlers for the Block Availability and Discovery Protocol. It provides a unified interface for handling discovery queries, gossip announcements, and heartbeat messages.

## Components

### Message Types

**Location:** `brightchain-api/src/enumerations/websocketMessageType.ts`

Defines three categories of WebSocket messages:
- **Discovery Protocol**: Bloom filter requests/responses, block queries, manifest requests/responses
- **Gossip Protocol**: Block announcements, block removals, announcement batches
- **Heartbeat Protocol**: Ping/pong messages

### Message Interfaces

**Location:** `brightchain-api/src/interfaces/websocketMessages.ts`

Defines TypeScript interfaces for all WebSocket messages with proper typing for payloads, timestamps, and request IDs.

### WebSocket Handler Service

**Location:** `brightchain-api/src/services/websocketHandler.ts`

The main service that handles incoming WebSocket messages and routes them to appropriate handlers.

## Usage

### Initialization

```typescript
import { WebSocketHandler } from './services/websocketHandler';
import {
  BlockRegistry,
  DiscoveryProtocol,
  GossipService,
  HeartbeatMonitor,
  AvailabilityService,
} from '@brightchain/brightchain-api-lib';

// Initialize dependencies
const blockRegistry = new BlockRegistry(/* ... */);
const discoveryProtocol = new DiscoveryProtocol(/* ... */);
const gossipService = new GossipService(/* ... */);
const heartbeatMonitor = new HeartbeatMonitor(/* ... */);
const availabilityService = new AvailabilityService(/* ... */);

// Create WebSocket handler
const wsHandler = new WebSocketHandler({
  localNodeId: 'node-123',
  blockRegistry,
  discoveryProtocol,
  gossipService,
  heartbeatMonitor,
  availabilityService,
});
```

### Registering Connections

The handler uses an abstract `IWebSocketConnection` interface, allowing it to work with any WebSocket implementation (Socket.io, native WebSocket, etc.):

```typescript
// Example with a generic WebSocket connection
const connection: IWebSocketConnection = {
  id: 'connection-123',
  send: (message) => {
    // Send message over WebSocket
    ws.send(JSON.stringify(message));
  },
  on: (event, handler) => {
    // Register event handler
    ws.addEventListener(event, handler);
  },
  off: (event, handler) => {
    // Unregister event handler
    ws.removeEventListener(event, handler);
  },
};

wsHandler.registerConnection(connection);
```

### Broadcasting Messages

```typescript
// Broadcast to all connected peers
wsHandler.broadcast({
  type: GossipMessageType.BLOCK_ANNOUNCEMENT,
  payload: {
    blockId: 'block-456',
    nodeId: 'node-123',
    ttl: 3,
  },
  timestamp: new Date().toISOString(),
});

// Send to specific connection
wsHandler.sendToConnection('connection-123', message);
```

## Message Flow

### Discovery Protocol

1. **Bloom Filter Query**
   - Peer sends `BLOOM_FILTER_REQUEST`
   - Handler exports Bloom filter from registry
   - Responds with `BLOOM_FILTER_RESPONSE` containing filter data

2. **Block Query**
   - Peer sends `BLOCK_QUERY` with block ID
   - Handler checks local registry
   - Responds with `BLOCK_QUERY_RESPONSE` indicating presence

3. **Manifest Request**
   - Peer sends `MANIFEST_REQUEST`
   - Handler exports complete manifest from registry
   - Responds with `MANIFEST_RESPONSE` containing all block IDs

### Gossip Protocol

1. **Block Announcement**
   - Peer sends `BLOCK_ANNOUNCEMENT`
   - Handler updates location metadata in availability service
   - Forwards to gossip service for propagation

2. **Block Removal**
   - Peer sends `BLOCK_REMOVAL`
   - Handler removes location from availability service
   - Forwards to gossip service for propagation

3. **Announcement Batch**
   - Peer sends `ANNOUNCEMENT_BATCH` with multiple announcements
   - Handler processes each announcement
   - Updates location metadata and forwards to gossip service

### Heartbeat Protocol

1. **Ping/Pong**
   - Peer sends `PING`
   - Handler immediately responds with `PONG`
   - Used by HeartbeatMonitor to detect connectivity

## Integration with Existing Infrastructure

### Socket.io Integration (Example)

```typescript
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketHandler } from './services/websocketHandler';

const io = new SocketIOServer(httpServer);
const wsHandler = new WebSocketHandler(/* config */);

io.on('connection', (socket) => {
  // Wrap Socket.io socket in IWebSocketConnection interface
  const connection: IWebSocketConnection = {
    id: socket.id,
    send: (message) => socket.emit('message', message),
    on: (event, handler) => socket.on(event, handler),
    off: (event, handler) => socket.off(event, handler),
  };

  wsHandler.registerConnection(connection);

  socket.on('disconnect', () => {
    wsHandler.unregisterConnection(socket.id);
  });
});
```

### Native WebSocket Integration (Example)

```typescript
import { WebSocketServer } from 'ws';
import { WebSocketHandler } from './services/websocketHandler';

const wss = new WebSocketServer({ port: 8080 });
const wsHandler = new WebSocketHandler(/* config */);

wss.on('connection', (ws) => {
  const connectionId = generateUniqueId();

  const connection: IWebSocketConnection = {
    id: connectionId,
    send: (message) => ws.send(JSON.stringify(message)),
    on: (event, handler) => {
      if (event === 'message') {
        ws.on('message', (data) => {
          handler(JSON.parse(data.toString()));
        });
      } else if (event === 'disconnect') {
        ws.on('close', handler);
      }
    },
    off: (event, handler) => {
      ws.off(event, handler);
    },
  };

  wsHandler.registerConnection(connection);

  ws.on('close', () => {
    wsHandler.unregisterConnection(connectionId);
  });
});
```

## Testing

Unit tests are provided in `websocketHandler.spec.ts` covering:
- Connection management
- Discovery protocol handlers
- Gossip protocol handlers
- Heartbeat handlers
- Broadcasting functionality

Run tests:
```bash
npx nx test brightchain-api --testFile=websocketHandler.spec.ts
```

## Requirements Validation

This implementation satisfies the following requirements:

- **4.2**: Bloom filter queries for efficient discovery
- **5.1, 5.2, 5.3**: Block discovery protocol with direct queries
- **6.1, 6.2, 6.5**: Gossip-based block announcements and removals
- **7.1**: Heartbeat monitoring with ping/pong

## Next Steps

To complete the integration:

1. **Choose WebSocket Library**: Decide between Socket.io, native WebSocket, or another library
2. **Add to Application**: Integrate WebSocketHandler into the main application startup
3. **Configure Endpoints**: Set up WebSocket endpoints in the API
4. **Add Authentication**: Implement authentication for WebSocket connections
5. **Add Rate Limiting**: Implement rate limiting to prevent abuse
6. **Add Monitoring**: Add metrics and logging for WebSocket activity
