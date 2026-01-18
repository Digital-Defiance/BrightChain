# BrightChain Messaging System Architecture

## Overview

The BrightChain Messaging System provides secure, decentralized message passing built on top of the Owner-Free Filesystem block store. Messages are stored as immutable blocks and can be encrypted, routed to multiple recipients, and queried efficiently.

## Core Principles

1. **Block-Based Storage**: Messages are stored as blocks in the BrightChain block store, leveraging the same XOR-based obfuscation as file data
2. **Immutable Messages**: Once created, message content blocks cannot be modified (metadata can be updated)
3. **Flexible Sizing**: Messages automatically use appropriately-sized blocks (Small/Medium/Large/Huge) or span multiple blocks (CBL)
4. **Privacy-Preserving**: Optional encryption with recipient-specific keys or shared keys
5. **Delivery Tracking**: Persistent metadata tracks delivery status and acknowledgments per recipient

## Architecture Components

### 1. Message Storage Layer

#### MessageCBLService
Handles message creation and storage:
- Validates message options (size, recipients, encryption)
- Selects appropriate block size or creates CBL for large messages
- Applies optional encryption (shared key or per-recipient)
- Stores message blocks with metadata
- Returns message handle (block ID or CBL)

#### Block Size Selection
- **Small** (1KB): Short text messages
- **Medium** (64KB): Standard messages, small attachments
- **Large** (1MB): Documents, images
- **Huge** (16MB): Large files, videos
- **CBL**: Multi-block messages for content > 16MB

### 2. Message Metadata

#### IMessageMetadata
Extends block metadata with message-specific fields:
```typescript
{
  messageType: string           // Application-defined type
  senderId: string              // Node ID of sender
  recipients: string[]          // Target node IDs (empty = broadcast)
  priority: MessagePriority     // LOW | NORMAL | HIGH
  deliveryStatus: Map           // Status per recipient
  acknowledgments: Map          // Ack timestamps per recipient
  encryptionScheme: string      // NONE | SHARED_KEY | RECIPIENT_KEYS
  isCBL: boolean               // Multi-block message flag
  cblBlockIds?: string[]       // Block IDs for reconstruction
}
```

#### Storage Implementations
- **MemoryMessageMetadataStore**: In-memory Map-based storage (brightchain-lib)
- **DiskMessageMetadataStore**: File-based JSON storage (brightchain-api-lib)
  - Metadata files: `{blockId}.mm.json`
  - Persists delivery status and acknowledgments
  - Efficient directory scanning for queries

### 3. Message Routing

#### MessageRouter
Routes messages to recipients:
- **Direct Routing**: Single recipient delivery
- **Broadcast Routing**: All nodes receive message
- **Forwarding**: Relay messages through intermediate nodes
- Tracks delivery status per recipient
- Emits routing events (sent, delivered, failed)

#### Delivery Status Flow
```
PENDING → IN_TRANSIT → DELIVERED
                    ↓
                  FAILED
```

### 4. Message Encryption

#### MessageEncryptionService
Provides encryption options:
- **None**: Plaintext messages (still obfuscated by block store)
- **Shared Key**: Single key encrypts for all recipients
- **Recipient Keys**: Per-recipient encryption using ECIES

Encryption applied before block storage, ensuring end-to-end security.

### 5. Message Querying

#### Query Operations
- `queryMessages()`: Filter by sender, recipient, type, date range, priority
- `getMessagesByRecipient()`: Efficient recipient-based lookup with pagination
- `getMessagesBySender()`: Sender-based lookup with pagination
- `getMessageContent()`: Retrieve and optionally decrypt message content

#### Query Performance
- Directory-based scanning for disk storage
- Map-based filtering for memory storage
- Pagination support (limit/offset or page/pageSize)
- Indexed by sender and recipient for efficient lookups

### 6. Event System

#### WebSocket Integration
Real-time message events via WebSocket:
- `message:sent` - Message created and stored
- `message:delivered` - Recipient received message
- `message:acknowledged` - Recipient acknowledged message
- `message:failed` - Delivery failed

#### Event Handler
- Validates WebSocket connections
- Routes events to connected clients
- Filters events by recipient permissions
- Handles connection lifecycle

### 7. Configuration

#### MessageSystemConfig
Configurable parameters:
- Block size thresholds (min/max for message-sized blocks)
- Retry attempts and delays
- Timeout values (routing, query, storage)
- Max recipients per message
- Padding strategy for message-sized blocks
- Event emission retry configuration

### 8. Monitoring & Observability

#### Metrics Collection
- Messages sent per second
- Delivery latency (p50, p95, p99)
- Delivery success rate
- Event emission latency
- Query performance
- Storage utilization

#### Logging
- Message creation (metadata only, no content)
- Routing decisions and paths
- Delivery failures with reasons
- Encryption failures
- Slow queries (configurable threshold)

#### Alerting
- High failure rate alerts
- High latency alerts
- Storage capacity alerts
- Event emission failure alerts

## Message Flow

### Send Message
```
1. Client → MessageCBLService.createMessage()
2. Validate options (size, recipients, encryption)
3. Select block size or create CBL
4. Apply encryption (if requested)
5. Store blocks in block store
6. Create message metadata
7. Store metadata in metadata store
8. Emit 'message:sent' event
9. Return message handle to client
```

### Route Message
```
1. MessageRouter.routeMessage()
2. Determine routing strategy (direct/broadcast/forward)
3. Update delivery status to IN_TRANSIT
4. Deliver to recipient nodes
5. Update delivery status to DELIVERED
6. Emit 'message:delivered' event
7. Handle failures → FAILED status
```

### Query Messages
```
1. Client → queryMessages(filters)
2. Scan metadata store (disk or memory)
3. Apply filters (sender, recipient, type, date, priority)
4. Apply pagination
5. Return matching message metadata
6. Client can retrieve content via getMessageContent()
```

### Acknowledge Message
```
1. Recipient → recordAcknowledgment()
2. Update acknowledgments Map
3. Update delivery status to DELIVERED
4. Persist metadata changes
5. Emit 'message:acknowledged' event
```

## Security Considerations

### Message Privacy
- Messages stored as obfuscated blocks (XOR with random data)
- Optional end-to-end encryption with ECIES
- Metadata stored separately from content
- Recipient-specific encryption prevents unauthorized access

### Delivery Tracking
- Delivery status tracked per recipient
- Acknowledgments require recipient authentication
- Failed deliveries logged for audit
- Metadata updates are sequential to prevent race conditions

### Access Control
- Sender authentication required for message creation
- Recipient authentication required for content retrieval
- Query results filtered by requester permissions
- WebSocket events filtered by connection permissions

## Performance Characteristics

### Storage
- Message-sized blocks: O(1) storage and retrieval
- CBL messages: O(n) where n = number of blocks
- Metadata queries: O(m) where m = total messages (can be optimized with indexes)

### Routing
- Direct routing: O(1) per recipient
- Broadcast routing: O(n) where n = number of nodes
- Forwarding: O(h) where h = hop count

### Encryption
- Shared key: O(1) encryption operation
- Recipient keys: O(r) where r = number of recipients

## Testing

### Property-Based Tests (37 test files, 3,700+ iterations)
- Message creation and storage correctness
- Encryption/decryption round-trips
- Routing delivery guarantees
- Query result consistency
- Metadata persistence across restarts
- Concurrent access patterns

### Integration Tests
- End-to-end message flow (send → route → deliver → ack)
- Broadcast message propagation
- Large message handling (CBL)
- WebSocket event delivery
- Error handling and recovery

### Performance Tests
- Message throughput (messages/second)
- Delivery latency percentiles
- Query performance with large datasets
- Scalability with increasing recipients

## Future Enhancements

### Planned Features
- Message expiration and automatic cleanup
- Priority-based routing and delivery
- Message threading and conversations
- Read receipts and typing indicators
- Offline message queuing
- Message search and full-text indexing

### Optimization Opportunities
- Bloom filters for recipient lookups
- LRU cache for frequently accessed messages
- Batch message operations
- Compressed message storage
- Sharded metadata stores for horizontal scaling

## References

- [Message Passing Requirements](../.kiro/specs/message-passing-and-events/requirements.md)
- [Owner-Free Filesystem](https://en.wikipedia.org/wiki/OFFSystem)
- [BrightChain Writeup](./BrightChain%20Writeup.md)
- [BrightChain Summary](./BrightChain%20Summary.md)
