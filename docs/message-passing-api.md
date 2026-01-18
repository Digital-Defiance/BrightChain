# Message Passing and Event Notification API

## Overview

The BrightChain message passing system provides secure, decentralized messaging with event notifications.

## Core Services

### MessageCBLService

Creates and retrieves messages stored as CBL blocks.

```typescript
const service = new MessageCBLService(cblService, checksumService, blockStore, metadataStore);

// Create message
const { messageId } = await service.createMessage(content, creator, {
  messageType: 'chat',
  senderId: 'user1',
  recipients: ['user2', 'user3'],
  priority: MessagePriority.NORMAL,
  encryptionScheme: MessageEncryptionScheme.NONE,
});

// Retrieve message
const content = await service.getMessageContent(messageId);
const metadata = await service.getMessageMetadata(messageId);
```

### MessageRouter

Routes messages to recipients using direct or gossip strategies.

```typescript
const router = new MessageRouter(metadataStore, 'local-node-id');

// Route message
const result = await router.routeMessage(messageId, ['recipient1', 'recipient2']);
// Returns: { strategy, successfulRecipients, failedRecipients, errors }
```

### MessageMetadataStore

Stores and queries message metadata.

```typescript
// Query messages
const messages = await store.queryMessages({
  recipientId: 'user1',
  messageType: 'chat',
  page: 0,
  pageSize: 10,
});

// Update delivery status
await store.updateDeliveryStatus(messageId, recipientId, MessageDeliveryStatus.DELIVERED);

// Record acknowledgment
await store.recordAcknowledgment(messageId, recipientId, new Date());
```

## Configuration

```typescript
const config: IMessageSystemConfig = {
  enableMessageSizedBlocks: true,
  minMessageSizeThreshold: 256,
  maxMessageSizeThreshold: 1048576,
  paddingStrategy: 'zero',
  storageRetryAttempts: 3,
  storageRetryDelayMs: 1000,
  routingTimeoutMs: 30000,
  queryTimeoutMs: 5000,
  eventEmissionRetries: 3,
  defaultMessageTTLMs: 86400000,
  maxRecipientsPerMessage: 1000,
};
```

## Monitoring

```typescript
const metrics = new MessageMetricsCollector();
const logger = new MessageLogger(LogLevel.INFO);

// Pass to services
const service = new MessageCBLService(
  cblService, checksumService, blockStore, metadataStore,
  config, metrics, logger
);

// Get metrics
const stats = metrics.getMetrics();
console.log(`Success rate: ${metrics.getDeliverySuccessRate()}`);
console.log(`Avg latency: ${metrics.getAverageDeliveryLatency()}ms`);
```

## Error Handling

All services throw `MessageError` with specific error types:

- `INVALID_RECIPIENT`: Invalid recipient format
- `INVALID_MESSAGE_TYPE`: Invalid message type
- `MESSAGE_TOO_LARGE`: Message exceeds size limit
- `STORAGE_FAILED`: Storage operation failed after retries
- `DELIVERY_FAILED`: Message delivery failed
- `ENCRYPTION_FAILED`: Encryption operation failed
- `MESSAGE_NOT_FOUND`: Message not found

## WebSocket Message Types

### MESSAGE_SEND
```typescript
{
  type: 'message:send',
  messageId: string,
  content: Uint8Array,
  recipients: string[]
}
```

### MESSAGE_RECEIVED
```typescript
{
  type: 'message:received',
  messageId: string,
  senderId: string
}
```

### MESSAGE_ACK
```typescript
{
  type: 'message:ack',
  messageId: string,
  recipientId: string,
  status: MessageDeliveryStatus
}
```

### MESSAGE_QUERY
```typescript
{
  type: 'message:query',
  filters?: {
    recipientId?: string,
    senderId?: string,
    messageType?: string
  }
}
```

### EVENT_SUBSCRIBE
```typescript
{
  type: 'message:event_subscribe',
  filters?: {
    eventType?: string,
    senderId?: string,
    recipientId?: string
  }
}
```

## Environment Variables

```bash
MESSAGE_ENABLE_SIZED_BLOCKS=true
MESSAGE_MIN_SIZE_THRESHOLD=256
MESSAGE_MAX_SIZE_THRESHOLD=1048576
MESSAGE_PADDING_STRATEGY=zero
MESSAGE_STORAGE_RETRY_ATTEMPTS=3
MESSAGE_STORAGE_RETRY_DELAY_MS=1000
MESSAGE_ROUTING_TIMEOUT_MS=30000
MESSAGE_QUERY_TIMEOUT_MS=5000
MESSAGE_EVENT_EMISSION_RETRIES=3
MESSAGE_DEFAULT_TTL_MS=86400000
MESSAGE_MAX_RECIPIENTS=1000
```
