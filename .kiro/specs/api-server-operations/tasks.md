# Implementation Plan: API Server Operations

## Overview

This implementation plan covers completing the BrightChain API Server Operations feature. The work is organized into logical phases: core infrastructure (error handling, health), message passing integration, Super CBL endpoints, node discovery and sync, WebSocket integration, completing stubbed endpoints, and documentation.

## Tasks

- [x] 1. Set up error handling infrastructure and request ID middleware
  - [x] 1.1 Create request ID middleware that generates UUID v4 for each request
    - Add middleware to attach requestId to request context
    - Ensure requestId is included in response headers
    - _Requirements: 9.5_
  
  - [x] 1.2 Create standardized error response utilities
    - Implement createApiErrorResponse function with code, message, details, requestId, timestamp
    - Create error factory functions for each error type (validation, notFound, unauthorized, etc.)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [x] 1.3 Write property test for error response consistency
    - **Property 19: Error Response Consistency**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [x] 2. Implement HealthController
  - [x] 2.1 Create HealthController with basic health endpoint
    - Implement GET /api/health returning status, uptime, timestamp, version
    - Ensure response time under 100ms
    - _Requirements: 6.1, 6.4_
  
  - [x] 2.2 Implement detailed health endpoint with dependency checks
    - Implement GET /api/health/detailed with blockStore, messageService, webSocketServer status
    - Return 503 when critical dependencies are unhealthy
    - _Requirements: 6.2, 6.3_
  
  - [x] 2.3 Add startup state handling
    - Return 503 with "starting" status during initialization
    - _Requirements: 6.5_
  
  - [x] 2.4 Write property tests for health endpoints
    - **Property 13: Health Endpoint Response Structure**
    - **Property 14: Health Endpoint Response Time**
    - **Validates: Requirements 6.1, 6.2, 6.4**

- [x] 3. Checkpoint - Ensure infrastructure tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement MessagesController
  - [x] 4.1 Create MessagesController integrating MessagePassingService
    - Implement POST /api/messages for sending messages
    - Implement GET /api/messages/:id for retrieving messages
    - Implement GET /api/messages for querying with filters
    - Implement DELETE /api/messages/:id for deletion
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 4.2 Integrate MessagesController into ApiRouter
    - Add router.use('/messages', messagesController.router)
    - Initialize MessagePassingService with required dependencies
    - _Requirements: 1.6_
  
  - [x] 4.3 Write property tests for message operations
    - **Property 1: Message Round-Trip Consistency**
    - **Property 2: Message Query Filter Correctness**
    - **Property 3: Message Deletion Removes Access**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 5. Implement SCBLController
  - [x] 5.1 Create SCBLController for Super CBL operations
    - Implement POST /api/scbl/store for storing large files
    - Use existing makeSuperCblHeader and parseSuperCblHeader from CBLService
    - Return magnetUrl and metadata (hierarchyDepth, subCblCount)
    - _Requirements: 2.1, 2.3_
  
  - [x] 5.2 Implement Super CBL retrieval
    - Implement GET /api/scbl/retrieve with magnetUrl parameter
    - Recursively reconstruct file from sub-CBLs
    - Handle missing sub-CBL errors with 404
    - _Requirements: 2.2, 2.4_
  
  - [x] 5.3 Implement durability level propagation
    - Ensure all sub-CBLs inherit the specified durability level
    - _Requirements: 2.5_
  
  - [x] 5.4 Write property tests for Super CBL operations
    - **Property 4: Super CBL Round-Trip with Metadata**
    - **Property 5: Super CBL Durability Propagation**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**

- [x] 6. Checkpoint - Ensure message and SCBL tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement NodesController
  - [x] 7.1 Create NodesController for node management
    - Implement GET /api/nodes listing connected peers
    - Implement GET /api/nodes/:nodeId for node details
    - Use existing DiscoveryProtocol and AvailabilityService
    - _Requirements: 3.1, 3.2_
  
  - [x] 7.2 Implement block discovery endpoint
    - Implement POST /api/nodes/discover with blockId
    - Return locations array with nodeId, latency, lastSeen
    - _Requirements: 3.3_
  
  - [x] 7.3 Implement node registration for WebSocket auth
    - Implement POST /api/nodes/register with nodeId and publicKey
    - Store public key for WebSocket authentication
    - _Requirements: 3.4, 3.5_
  
  - [x] 7.4 Write property tests for node operations
    - **Property 6: Node Discovery Returns Valid Locations**
    - **Property 7: Node Registration Enables Authentication**
    - **Validates: Requirements 3.3, 3.4**

- [x] 8. Implement SyncController
  - [x] 8.1 Create SyncController for replication operations
    - Implement POST /api/blocks/:blockId/replicate with targetNodeIds
    - Implement GET /api/blocks/:blockId/locations
    - Use existing AvailabilityService
    - _Requirements: 4.1, 4.2_
  
  - [x] 8.2 Implement sync request and reconciliation
    - Implement POST /api/sync/request with blockIds array
    - Implement POST /api/sync/reconcile triggering ReconciliationService
    - _Requirements: 4.3, 4.4_
  
  - [x] 8.3 Write property tests for sync operations
    - **Property 8: Replication Updates Block Locations**
    - **Property 9: Sync Request Partitions Block IDs**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 9. Checkpoint - Ensure node and sync tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Integrate WebSocket events with API operations
  - [x] 10.1 Connect API operations to EventNotificationSystem
    - Emit message:stored, message:delivered, message:failed events
    - Emit block:availability_changed events
    - Emit block:replicated events after replication
    - _Requirements: 4.5, 5.2, 5.4_
  
  - [x] 10.2 Implement WebSocket subscription filtering
    - Filter events by type, senderId, recipientId
    - Only send matching events to subscribers
    - _Requirements: 5.3_
  
  - [x] 10.3 Implement partition mode events
    - Emit partition:entered and partition:exited events
    - Include disconnectedPeers/reconnectedPeers in payload
    - _Requirements: 5.6_
  
  - [x] 10.4 Ensure proper cleanup on disconnect
    - Remove subscriptions when WebSocket closes
    - Clean up connection resources
    - _Requirements: 5.5_
  
  - [x] 10.5 Write property tests for WebSocket events
    - **Property 10: State Changes Emit WebSocket Events**
    - **Property 11: WebSocket Filter Enforcement**
    - **Property 12: WebSocket Cleanup on Disconnect**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

- [x] 11. Complete stubbed endpoints
  - [x] 11.1 Complete EnergyController transactions endpoint
    - Implement actual transaction history retrieval from EnergyLedger
    - Return transaction list with timestamps and amounts
    - _Requirements: 7.1_
  
  - [x] 11.2 Complete QuorumController unseal endpoint
    - Implement document unsealing with member private keys
    - Decrypt shares and reconstruct document
    - _Requirements: 7.2_
  
  - [x] 11.3 Complete UserController profile endpoints
    - Implement GET /api/user/profile with full member data
    - Implement PUT /api/user/profile for updates
    - Include energyBalance and reputation in response
    - _Requirements: 7.3, 7.4_
  
  - [x] 11.4 Write property tests for completed endpoints
    - **Property 15: Profile Round-Trip Consistency**
    - **Property 16: Quorum Seal-Unseal Round-Trip**
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 12. Checkpoint - Ensure all endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement authentication middleware enhancements
  - [x] 13.1 Enhance JWT validation middleware
    - @digitaldefiance/Node-ecies-lib has jwtAuthentication and cryptoAuthentication middleware we can extend
      - look in /Volumes/Code/express-suite/packages/digitaldefiance-node-express-suite
    - Return 401 for missing tokens on protected endpoints
    - Return 401 with expiration message for expired tokens
    - Attach member info to request context for valid tokens
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 13.2 Implement role-based access control
    - Add role checking for endpoints requiring specific permissions
    - Return 403 for insufficient permissions
    - _Requirements: 8.4_
  
  - [x] 13.3 Write property tests for authentication
    - **Property 17: Authentication Enforcement**
    - **Property 18: Role-Based Access Control**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [x] 14. Implement API documentation endpoint
  - [x] 14.1 Create DocsController with OpenAPI specification
    - Implement GET /api/docs returning OpenAPI JSON
    - Include all endpoints with request/response schemas
    - Include authentication requirements per endpoint
    - Include example requests and responses
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 14.2 Write property test for OpenAPI completeness
    - **Property 20: OpenAPI Specification Completeness**
    - **Validates: Requirements 10.2, 10.3, 10.4**

- [x] 15. Final integration and wiring
  - [x] 15.1 Update ApiRouter with all new controllers
    - Add MessagesController, SCBLController, NodesController, SyncController, HealthController, DocsController
    - Ensure proper initialization order
    - _Requirements: 1.6_
  
  - [x] 15.2 Update application startup to initialize all services
    - Initialize MessagePassingService with dependencies
    - Initialize DiscoveryProtocol and AvailabilityService
    - Wire WebSocket server to EventNotificationSystem
    - _Requirements: 5.1_

- [x] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including property tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript following existing codebase patterns
- All new controllers extend BaseController from the existing infrastructure
- Tests should be run with `nx run brightchain-api-lib:test`
