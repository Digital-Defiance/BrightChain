# Implementation Plan: BrightStack Standalone Documentation

## Overview

Create three documentation guides enabling developers to use BrightDB/BrightStack without joining the BrightChain network, plus update the guides index. All code examples use TypeScript. Each guide is a self-contained Markdown file with Jekyll front matter, placed in `docs/guides/`.

## Tasks

- [x] 1. Create the Single-Node Standalone Guide
  - [x] 1.1 Create `docs/guides/05-brightstack-standalone.md` with Jekyll front matter, introduction, prerequisites, and project setup sections
    - Add front matter with `title: "BrightStack Standalone Setup"`, `parent: "Guides"`, `nav_order: 20`
    - Write introduction explicitly stating no BrightChain node or network required
    - Document prerequisites: Node.js 20+, npm/yarn, no monorepo needed
    - Write project setup: `npm init`, install `@brightchain/db`, `express`, `cors`
    - _Requirements: 1.1, 1.7, 10.1_

  - [x] 1.2 Add Block Store Configuration section to the standalone guide
    - Document InMemoryDatabase for development with code example
    - Document LocalDiskStore (persistent file-based) for production with code example
    - Document PersistentHeadRegistry configuration with code example
    - Document storage directory structure and auto-creation behavior
    - _Requirements: 1.3, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 1.3 Add BrightDB Instance Creation and CRUD Operations sections
    - Write code example for creating a BrightDB instance and collections
    - Write complete code examples for all CRUD operations: insertOne, findOne, updateOne, deleteOne, insertMany, find, updateMany, deleteMany
    - _Requirements: 1.4, 1.5_

  - [x] 1.4 Add Schema Validation section
    - Document CollectionSchema with field types, required fields, defaults, enums, patterns
    - Write code example for nested object schemas and array item schemas
    - Write code example for Model with validation, showing ValidationError handling
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 1.5 Add Indexing section
    - Document single-field, compound, unique, sparse, and TTL indexes with code examples
    - Include guidance on when to create indexes based on query patterns
    - Document index rebuild behavior on restart with persistent block store
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 1.6 Add Transactions section
    - Write code example for DbSession manual control (startTransaction, commitTransaction, abortTransaction)
    - Write code example using `withTransaction` convenience helper
    - Document read-committed isolation level and implications
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 1.7 Add Aggregation Pipeline section
    - Document all 14 supported stages with code examples
    - Write a complete multi-stage pipeline example chaining at least four stages
    - Write a $lookup cross-collection join example
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 1.8 Add Express Middleware, React Frontend, and Change Streams sections
    - Write code example for mounting `createDbRouter` with REST endpoint table
    - Write minimal React frontend performing CRUD against the Express API
    - Document `watch()` usage for real-time change streams
    - _Requirements: 1.5, 1.6_

  - [x] 1.9 Add Production Deployment, Unavailable Features, Troubleshooting, and Next Steps sections
    - Write production deployment section with persistent storage, env vars, process management
    - Include production deployment checklist
    - Document unavailable features (gossip, discovery, replication) with pointer to cluster guide
    - Write troubleshooting section for common issues
    - Add cross-references to existing BrightDB Usage and Building a dApp walkthroughs
    - _Requirements: 1.8, 9.1, 9.2, 9.4, 10.5_

- [x] 2. Checkpoint - Review standalone guide completeness
  - Ensure all sections are present and code examples are complete and copy-pasteable, ask the user if questions arise.

- [x] 3. Create the Private Cluster Guide
  - [x] 3.1 Create `docs/guides/06-brightstack-private-cluster.md` with Jekyll front matter, introduction, prerequisites, and architecture overview
    - Add front matter with `title: "BrightStack Private Cluster"`, `parent: "Guides"`, `nav_order: 21`
    - Write introduction explicitly stating cluster does not participate in BrightChain network
    - Document prerequisites: multiple machines/containers, Node.js 20+, network connectivity
    - Include cluster architecture diagram showing nodes, pools, gossip connections
    - _Requirements: 2.1, 2.9, 10.2_

  - [x] 3.2 Add Private BrightPool and Gossip Configuration sections
    - Write code example for creating a private BrightPool scoped to cluster members
    - Document PooledStoreAdapter configuration
    - Write code example for configuring gossip with explicit peer lists (no public discovery)
    - _Requirements: 2.2, 2.3_

  - [x] 3.3 Add Reconciliation and Write Access Control sections
    - Write code example for configuring reconciliation for partition recovery
    - Document ACL configuration: writer lists, administrator lists
    - Document cluster rejecting unauthorized connection attempts
    - _Requirements: 2.4, 2.7_

  - [x] 3.4 Add Node Management sections (Adding and Removing nodes)
    - Document adding a node: ACL configuration, pool key distribution, initial sync
    - Document removing a node: ACL revocation, key rotation procedure
    - _Requirements: 2.5, 2.6_

  - [x] 3.5 Add Pool-Shared Encryption, Production Deployment, Troubleshooting, and Next Steps sections
    - Write code example for AES-256-GCM shared key encryption configuration
    - Include production deployment checklist: node redundancy, encryption, reconciliation scheduling, health monitoring
    - Write troubleshooting section
    - Add cross-references to networking docs and storage pools walkthrough
    - _Requirements: 2.8, 9.3_

- [x] 4. Checkpoint - Review cluster guide completeness
  - Ensure all sections are present and cluster isolation is clearly documented, ask the user if questions arise.

- [x] 5. Create the MERN Migration Reference
  - [x] 5.1 Create `docs/guides/07-mern-to-brightstack-migration.md` with Jekyll front matter, introduction, and connection comparison
    - Add front matter with `title: "MERN to BrightStack Migration"`, `parent: "Guides"`, `nav_order: 22`
    - Write introduction explaining BrightStack as a MERN replacement
    - Write side-by-side comparison of MongoDB connection strings vs BrightDB block store initialization
    - _Requirements: 3.2, 10.3_

  - [x] 5.2 Add Method Mapping Table and Schema Comparison sections
    - Create side-by-side table mapping MongoDB driver methods to BrightDB equivalents (connect, insertOne, findOne, find, updateOne, updateMany, deleteOne, deleteMany, aggregate, createIndex, watch)
    - Write side-by-side comparison of Mongoose schema definitions vs BrightDB CollectionSchema
    - _Requirements: 3.1, 3.3_

  - [x] 5.3 Add Route Handler Migration, Feature Support Matrix, and Persistence Differences sections
    - Write before/after Express route handler example migrated from MongoDB to BrightDB
    - Document feature support matrix: what's supported vs not yet supported
    - Document persistence differences: MongoDB disk-based vs BrightDB InMemoryDatabase/LocalDiskStore
    - _Requirements: 3.4, 3.5, 3.6_

- [x] 6. Update the Guides Index
  - [x] 6.1 Update `docs/guides/index.md` to include the three new guides
    - Add entries for guides 05, 06, and 07 to the table with descriptive titles that don't require prior BrightChain knowledge
    - Update the "Reading Order" section to mention the standalone guides
    - _Requirements: 10.4_

- [x] 7. Final checkpoint - Ensure all documents are complete
  - Verify all three guides and the index update are in place, ensure cross-references are consistent, ask the user if questions arise.

## Notes

- No tasks are marked optional since this feature produces documentation, not executable code with testable properties
- PBT is not applicable — deliverables are Markdown files, not algorithms or pure functions
- All code examples use TypeScript and reference `@brightchain/db` as an npm package
- Each task references specific requirements for traceability
- Checkpoints ensure incremental review of each guide before proceeding
