# Requirements Document

## Introduction

This feature defines the Lumen–BrightChain Client Protocol: a set of REST endpoints, a client-facing WebSocket channel, shared DTO interfaces, and a pool discovery protocol that together allow the Lumen GUI client to introspect and interact with a BrightChain node. The protocol builds on the existing `brightchain-api` Express server, `WebSocketMessageServer`, `GossipService`, `AvailabilityService`, and `PoolACL` infrastructure. It does NOT emulate MongoDB's wire protocol; instead it provides a purpose-built API tailored to BrightChain's unique semantics.

Access to the protocol is tiered by `MemberType` (the existing `User`, `Admin`, `System` enum from `@digitaldefiance/ecies-lib`). Regular users can only access public data and their own resources. Admin and System members can perform advanced introspection such as querying peer nodes, viewing all pools, and triggering network-wide discovery.

## Glossary

- **Lumen_Client**: The React/MUI/Capacitor GUI application that connects to a BrightChain node as an authenticated end-user client.
- **BrightChain_API**: The Express-based HTTP and WebSocket server (`brightchain-api`) that serves both node-to-node gossip and client-facing requests.
- **Client_WebSocket_Channel**: A JWT-authenticated WebSocket connection used by Lumen_Client for real-time event subscriptions, distinct from the ECIES-authenticated node gossip WebSocket.
- **Pool**: A logical grouping of blocks with shared access control, encryption settings, and membership.
- **Pool_Discovery_Service**: A service that queries connected peers for their pool lists and aggregates results, respecting ACL and encryption constraints.
- **Node_Introspection_API**: REST endpoints that expose node health, peer connections, pool listings, block store statistics, and energy account status to authenticated clients.
- **Client_Event**: A typed envelope delivered over the Client_WebSocket_Channel carrying real-time notifications (block events, pool changes, energy updates, peer events).
- **Pool_ACL**: The access control list governing which members may read, write, replicate, or administer a pool.
- **Energy_Account**: A per-member balance tracking storage contributions and consumption on the BrightChain network.
- **Block_Store_Statistics**: Aggregate metrics about the local block store including capacity, usage, and block counts by type.
- **TID**: A generic type parameter used across shared interfaces to support both string-based frontend DTOs and binary backend representations (e.g., `Uint8Array`, `GuidV4Buffer`).
- **MemberType**: The existing enum (`User`, `Admin`, `System`) from `@digitaldefiance/ecies-lib` that classifies authenticated members. Carried in the JWT payload and checked by the existing `requireMemberTypes` middleware.
- **Public_Endpoint**: An endpoint accessible to any authenticated member regardless of MemberType.
- **Admin_Endpoint**: An endpoint restricted to members with MemberType `Admin` or `System`.

## Requirements

### Requirement 1: Role-Based Access Tiers for Client Protocol

**User Story:** As a node operator, I want the client protocol to enforce role-based access tiers, so that regular users can only access public data and their own resources while administrators can perform advanced introspection.

#### Acceptance Criteria

1. THE Node_Introspection_API SHALL classify each endpoint as either a Public_Endpoint or an Admin_Endpoint.
2. WHEN a member with MemberType `User` requests an Admin_Endpoint, THE Node_Introspection_API SHALL reject the request with a 403 Forbidden response.
3. WHEN a member with MemberType `Admin` or `System` requests an Admin_Endpoint, THE Node_Introspection_API SHALL process the request normally.
4. THE following endpoints SHALL be classified as Public_Endpoints: node health status, the member's own energy account, pools the member has Pool_ACL Read permission on, and public block retrieval.
5. THE following endpoints SHALL be classified as Admin_Endpoints: connected peers listing, block store statistics, pool discovery across remote nodes, and network topology queries.

### Requirement 2: Node Status and Health Introspection

**User Story:** As a Lumen_Client user, I want to query the BrightChain node's health and status, so that I can verify the node is operational and view its capabilities.

#### Acceptance Criteria

1. WHEN an authenticated Lumen_Client sends a GET request to the node status endpoint (Public_Endpoint), THE Node_Introspection_API SHALL return the node's health status, uptime, software version, and supported capabilities.
2. WHEN an unauthenticated request is sent to the node status endpoint, THE Node_Introspection_API SHALL reject the request with a 401 Unauthorized response.
3. WHEN the node is in partition mode and the requesting member has MemberType `Admin` or `System`, THE Node_Introspection_API SHALL include the partition status and list of disconnected peers in the status response.
4. WHEN the node is in partition mode and the requesting member has MemberType `User`, THE Node_Introspection_API SHALL include the partition status but omit the list of disconnected peers.

### Requirement 3: Connected Peers Listing

**User Story:** As an administrator, I want to see which peers are connected to my node, so that I can understand the network topology visible from my node.

#### Acceptance Criteria

1. WHEN an authenticated member with MemberType `Admin` or `System` sends a GET request to the peers endpoint (Admin_Endpoint), THE Node_Introspection_API SHALL return a list of connected peer nodes with their node IDs, connection status, and last-seen timestamps.
2. WHEN a peer connects or disconnects, THE Client_WebSocket_Channel SHALL emit a peer connection event to subscribed sessions belonging to members with MemberType `Admin` or `System`.
3. IF no peers are connected, THEN THE Node_Introspection_API SHALL return an empty list with a 200 OK response.

### Requirement 4: Local Pool Listing and Details

**User Story:** As a Lumen_Client user, I want to see which pools are active on my node and view their details, so that I can manage and monitor my storage pools.

#### Acceptance Criteria

1. WHEN an authenticated Lumen_Client sends a GET request to the pools endpoint (Public_Endpoint), THE Node_Introspection_API SHALL return a list of pools active on the local node that the requesting member has Read permission on according to Pool_ACL.
2. WHEN an authenticated Lumen_Client sends a GET request for a specific pool's details, THE Node_Introspection_API SHALL return the pool's block count, total size, member count, encryption status, and ACL summary.
3. IF the requesting member lacks Read permission on a pool, THEN THE Node_Introspection_API SHALL omit that pool from listing results and return 403 Forbidden for direct detail requests.
4. WHEN a pool's membership or metadata changes on the local node, THE Client_WebSocket_Channel SHALL emit a pool change event to subscribed clients who have Read permission on that pool.
5. WHEN a member with MemberType `Admin` or `System` requests the pools endpoint, THE Node_Introspection_API SHALL return all pools on the local node regardless of Pool_ACL membership.

### Requirement 5: Block Store Statistics

**User Story:** As an administrator, I want to view block store statistics, so that I can monitor storage capacity and usage on my node.

#### Acceptance Criteria

1. WHEN an authenticated member with MemberType `Admin` or `System` sends a GET request to the block store statistics endpoint (Admin_Endpoint), THE Node_Introspection_API SHALL return total capacity, current usage, available space, and block counts grouped by block type.
2. WHEN block store usage changes and crosses a configurable threshold, THE Client_WebSocket_Channel SHALL emit a storage alert event to subscribed sessions belonging to members with MemberType `Admin` or `System`.

### Requirement 6: Energy Account Status

**User Story:** As a Lumen_Client user, I want to view my energy account balance, so that I can track my storage contributions and consumption.

#### Acceptance Criteria

1. WHEN an authenticated Lumen_Client sends a GET request to the energy account endpoint (Public_Endpoint), THE Node_Introspection_API SHALL return the requesting member's current energy balance, available balance, earned total, spent total, and reserved amount.
2. WHEN the member's energy balance changes, THE Client_WebSocket_Channel SHALL emit an energy balance update event to the affected member's subscribed sessions.
3. IF a member requests another member's energy account and the requesting member lacks MemberType `Admin` or `System`, THEN THE Node_Introspection_API SHALL reject the request with a 403 Forbidden response.

### Requirement 7: Pool Discovery Across Connected Nodes

**User Story:** As an administrator, I want to discover pools available across all connected nodes in the network, so that I can find and manage pools beyond my local node.

#### Acceptance Criteria

1. WHEN an authenticated member with MemberType `Admin` or `System` sends a pool discovery request (Admin_Endpoint), THE Pool_Discovery_Service SHALL query connected peers for their pool lists and aggregate the results.
2. THE Pool_Discovery_Service SHALL only include pools in discovery results for which the requesting member has Read permission according to each pool's Pool_ACL.
3. WHEN a pool has encryption enabled and the requesting member lacks the decryption keys, THE Pool_Discovery_Service SHALL exclude that pool's metadata from discovery results.
4. WHEN pool discovery results are aggregated, THE Pool_Discovery_Service SHALL deduplicate pools that appear on multiple nodes and include the list of nodes hosting each pool.
5. IF a peer node is unreachable during discovery, THEN THE Pool_Discovery_Service SHALL include partial results from reachable peers and indicate which peers were unreachable.

### Requirement 8: Pool Announcement via Gossip

**User Story:** As a node operator, I want my node to announce its pools to connected peers, so that pool discovery can function across the network.

#### Acceptance Criteria

1. WHEN a new pool is created or an existing pool's metadata changes on a node, THE GossipService SHALL broadcast a pool announcement to connected peers.
2. WHEN a pool has encryption enabled, THE GossipService SHALL encrypt the pool announcement metadata so that only members with valid pool keys can decrypt the pool information.
3. WHEN a node receives a pool announcement from a peer, THE Pool_Discovery_Service SHALL update its cached knowledge of remote pools.
4. WHEN a pool is deleted on a node, THE GossipService SHALL broadcast a pool removal announcement to connected peers.

### Requirement 9: Client WebSocket Channel

**User Story:** As a Lumen_Client user, I want a real-time WebSocket connection to my BrightChain node, so that I can receive live updates without polling.

#### Acceptance Criteria

1. WHEN a Lumen_Client opens a WebSocket connection to the client channel endpoint with a valid JWT token, THE BrightChain_API SHALL authenticate the connection and establish a Client_WebSocket_Channel session.
2. IF a Lumen_Client attempts to open a WebSocket connection with an invalid or expired JWT token, THEN THE BrightChain_API SHALL reject the connection with an authentication error.
3. WHEN a Client_WebSocket_Channel session is established, THE BrightChain_API SHALL allow the client to subscribe to specific event types using a subscription message.
4. WHEN a subscribed event occurs, THE Client_WebSocket_Channel SHALL deliver a Client_Event envelope containing the event type, payload, timestamp, and correlation ID to all subscribed sessions that have permission to receive that event.
5. WHEN a Client_WebSocket_Channel connection is idle beyond a configurable timeout, THE BrightChain_API SHALL send a ping frame and close the connection if no pong is received.
6. THE BrightChain_API SHALL maintain the Client_WebSocket_Channel as a separate WebSocket path from the node-to-node gossip WebSocket, using JWT authentication instead of ECIES authentication.
7. THE Client_WebSocket_Channel SHALL filter events based on the connected member's MemberType, delivering Admin_Endpoint events only to members with MemberType `Admin` or `System`.

### Requirement 10: Shared Client Protocol Interfaces

**User Story:** As a developer, I want well-defined shared interfaces for all client protocol data structures, so that both the Lumen frontend and BrightChain backend use consistent types.

#### Acceptance Criteria

1. THE brightchain-lib package SHALL define generic interfaces `INodeStatus<TID>`, `IPoolInfo<TID>`, `IPoolDiscoveryResult<TID>`, `INetworkTopology<TID>`, `IClientEvent<TID>`, and `IBlockStoreStats` using the TID generic parameter for DTO flexibility.
2. THE brightchain-api-lib package SHALL define API response wrapper interfaces extending `IApiMessageResponse` for each new endpoint, following the existing `IUserProfileApiResponse` pattern.
3. FOR ALL shared interfaces, serializing an instance to JSON and deserializing it back SHALL produce an equivalent object (round-trip property).

### Requirement 11: Client Authentication and Authorization

**User Story:** As a Lumen_Client user, I want secure authentication for all API and WebSocket interactions, so that my data and operations are protected.

#### Acceptance Criteria

1. THE Node_Introspection_API SHALL require a valid JWT bearer token for all endpoints, using the existing `requireAuth` middleware.
2. WHEN a pool-specific operation is requested, THE Node_Introspection_API SHALL verify the requesting member's permissions against the pool's Pool_ACL before returning data.
3. THE BrightChain_API SHALL distinguish between client connections (JWT-authenticated Lumen_Client sessions) and node connections (ECIES-authenticated peer nodes) on separate WebSocket paths.
4. IF a JWT token expires during an active Client_WebSocket_Channel session, THEN THE BrightChain_API SHALL notify the client with a token expiration event and close the connection after a grace period.
5. WHEN an Admin_Endpoint is accessed, THE Node_Introspection_API SHALL use the existing `requireMemberTypes` middleware to enforce MemberType `Admin` or `System`.
