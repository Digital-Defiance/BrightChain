---
title: "Home"
layout: "home"
nav_order: 0
---

# BrightChain Documentation

Welcome to the BrightChain documentation. This index organizes all project documents by topic so you can quickly find what you need.

> For hands-on guides, start with the [Walkthroughs](/docs/walkthroughs).

---

## Table of Contents

### Overview & Vision
High-level project descriptions, the academic paper, and comparison analyses.

| Document | Description |
|----------|-------------|
| [BrightChain Summary](/docs/overview/brightchain-summary) | Project abstract, problem statement, and solution overview |
| [BrightChain Writeup](/docs/overview/brightchain-writeup) | Extended narrative covering history, analogies, and ecosystem vision |
| [Academic Paper Draft](/docs/overview/brightchain-paper) | Formal paper: "BrightChain: A Unified Cryptographic Platform for Privacy-Preserving Decentralized Applications" |
| [OFF System Comparison](/docs/overview/off-system-comparison) | Side-by-side analysis of BrightChain vs. the original OFF System |

### Architecture & Design
Core architecture rules, block hierarchy, and system-wide design decisions.

| Document | Description |
|----------|-------------|
| [Architecture Rules](/docs/architecture/architecture-rules) | Dependency direction rules and ServiceLocator patterns |
| [Block Hierarchy](/docs/architecture/block-hierarchy) | Block type taxonomy: BaseBlock, RawDataBlock, CBL, Encrypted, etc. |
| [Block Metadata](/docs/architecture/block-metadata) | Metadata structure for temperature tracking, location, and access patterns |
| [Data Temperature & Location](/docs/architecture/data-temperature-and-location) | Temperature classification (Frozen → Viral) and location management |
| [TUPLE Storage Architecture](/docs/architecture/tuple-storage-architecture) | OFF-compliant TUPLE storage model for plausible deniability |
| [Pool-Based Storage Isolation](/docs/architecture/pool-based-storage-isolation) | Namespace isolation specification for multi-tenant block storage |

### Storage System
Storage pools, credits, markets, and file storage mechanics.

| Document | Description |
|----------|-------------|
| [Storage Overview](./storage/storage-overview) | Simplified explanation of file → block → XOR → store pipeline |
| [Storage Pools Architecture](./storage/storage-pools-architecture) | Pool concepts, lifecycle, encryption modes, and cross-node coordination |
| [Storage Pools API](./storage/storage-pools-api) | Public API reference for IPooledBlockStore, adapters, and error types |
| [Storage Credits](./storage/storage-credits) | Joule-based credit system for resource allocation |
| [Storage Market](./storage/storage-market) | Dynamic marketplace for storage pricing, bids, and offers |
| [Member Storage](./storage/member-storage) | Public/private CBL split for member data |

### Cryptography & Security
Encryption, key management, voting security, and cryptographic analyses.

| Document | Description |
|----------|-------------|
| [Block Encryption Review](./security/block-encryption-review) | End-to-end code review of block and encryption systems |
| [ECIES-Paillier Bridge Analysis](./security/ecies-paillier-bridge-analysis) | Security analysis of the novel ECIES-to-Paillier key derivation |
| [Key Rotation Strategies](./security/key-rotation-strategies) | Challenges and solutions for key rotation in distributed encrypted storage |
| [Voting Security Best Practices](./security/voting-security-best-practices) | Production security guidelines for the VotingService |
| [EncryptedBlock](./security/encrypted-block) | EncryptedBlock class API reference |
| [EncryptedOwnedDataBlock](./security/encrypted-owned-data-block) | EncryptedOwnedDataBlock class API reference |

### Governance & Voting
Quorum system, voting architecture, and brokered anonymity.

| Document | Description |
|----------|-------------|
| [Quorum System](./governance/quorum-system) | Technical deep-dive: Shamir's Secret Sharing, threshold governance |
| [Quorum Overview](./governance/quorum-overview) | High-level quorum overview with implementation status |
| [Voting System Architecture](./governance/voting-system-architecture) | 15+ voting methods, Paillier homomorphic encryption, audit logs |
| [Node Management & Voting](./governance/node-management) | Node types, states, and participation in governance |

### Energy Economy
Joule-based energy tracking, operation costs, and economic protocol.

| Document | Description |
|----------|-------------|
| [Energy Economy Protocol](./energy/energy-economy-protocol) | Full protocol specification for the Joule-based economy |
| [Network Operation Costs](./energy/network-operation-costs) | Cost table for node, block, and metadata operations |

### Networking & Protocols
Network implementation, gossip delivery, UPnP, and client protocols.

| Document | Description |
|----------|-------------|
| [Network Implementation](./networking/network-implementation) | Technology stack: Express, Socket.io, WebSocket options |
| [Gossip Delivery Protocol](./networking/gossip-delivery-protocol) | Epidemic-style gossip propagation for decentralized message delivery |
| [Lumen Client Protocol](./networking/lumen-client-protocol) | REST + WebSocket protocol between Lumen GUI and BrightChain node |
| [Lumen Implementation Guide](./networking/lumen-implementation-guide) | Step-by-step guide for the Lumen client team |
| [UPnP Architecture](./networking/upnp-architecture) | UPnP port mapping subsystem: API, flows, and security |
| [UPnP Configuration](./networking/upnp-configuration) | Quick-start guide for enabling UPnP |
| [UPnP Manual Testing](./networking/upnp-manual-testing) | Testing UPnP port mapping with a real router |

### Messaging & Communication
Message passing, email, gossip delivery, and the communication platform.

| Document | Description |
|----------|-------------|
| [Messaging System Architecture](./messaging/messaging-system-architecture) | Block-based message storage, routing, and delivery tracking |
| [Message Passing API](./messaging/message-passing-api) | MessageCBLService, MessageRouter, and EventNotificationSystem API |
| [Communication System Architecture](./messaging/communication-system-architecture) | "Discord meets Signal" — DMs, groups, and channels |
| [Email System Architecture](./messaging/email-system-architecture) | Decentralized RFC 5322-compliant email on encrypted block storage |

### Identity & Keybase Features
Paper keys, device provisioning, identity proofs, and user guides.

| Document | Description |
|----------|-------------|
| [Keybase Features Architecture](./identity/keybase-features-architecture) | System architecture for Keybase-inspired features |
| [Keybase Features Developer Guide](./identity/keybase-features-developer-guide) | Service reference and integration patterns |
| [Keybase Features User Guide](./identity/keybase-features-user-guide) | End-user guide: paper keys, device management, identity proofs |
| [BrightPass Password Manager](./identity/brightpass-password-manager) | VCBL-based password vault built on BrightChain encryption |

### Applications
BrightHub social network and other application-layer designs.

| Document | Description |
|----------|-------------|
| [BrightHub Design](./applications/brighthub-design) | Technical design for the Twitter-like social network module |
| [BrightHub Requirements](./applications/brighthub-requirements) | Full requirements document for BrightHub |

### API Reference
Class and service documentation for core library types.

| Document | Description |
|----------|-------------|
| [StaticHelpersChecksum](./api-reference/static-helpers-checksum) | Checksum calculation utilities (SHA3-512) |
| [StaticHelpersTuple](./api-reference/static-helpers-tuple) | Block tuple utilities (XOR, whitening, parity) |
| [CrcService](./api-reference/crc-service) | CRC8, CRC16, CRC32 checksum service |
| [EmailString](./api-reference/email-string) | Validated email address class |
| [Flags](./api-reference/flags) | Language flag mappings |
| [HanselGretelBreadCrumbTrail](./api-reference/hansel-gretel-breadcrumb-trail) | Breadcrumb tracing for debugging |

### Test Documentation
Test specifications and coverage documentation.

| Document | Description |
|----------|-------------|
| [StaticHelpersChecksum Tests](./test-docs/static-helpers-checksum-spec) | Unit test documentation for checksum helpers |
| [StaticHelpersECIES Tests](./test-docs/static-helpers-ecies-spec) | Unit test documentation for ECIES helpers |

### Roadmaps & Implementation Status
Planning documents, progress reports, and implementation logs.

| Document | Description |
|----------|-------------|
| [Roadmap](./roadmaps/roadmap) | Project roadmap with short/medium/long-term goals |
| [Solo Developer Roadmap](./roadmaps/solo-developer-roadmap) | Strategic roadmap for solo development with AI assistance |
| [Implementation Roadmap](./roadmaps/implementation-roadmap) | Phased implementation plan (TEL, replication, etc.) |
| [Auth + Energy Implementation Plan](./roadmaps/auth-energy-implementation-plan) | Plan for auth system with energy accounts |
| [Week 1 Energy Foundation](./roadmaps/week-1-energy-foundation) | Week 1 progress on energy economy implementation |
| [Auth Implementation Complete](./roadmaps/auth-implementation-complete) | Auth + energy system completion report |
| [React Implementation Complete](./roadmaps/react-implementation-complete) | Auth + React frontend completion report |
| [Email Service Integration](./roadmaps/email-service-integration) | AWS SES email integration completion report |

### Walkthroughs
Step-by-step guides from beginner to advanced.

| # | Guide | Difficulty | Time |
|---|-------|------------|------|
| 00 | [Architecture Overview](./walkthroughs/00-architecture-overview) | Beginner | 20 min |
| 01 | [Quickstart](./walkthroughs/01-quickstart) | Beginner | 15 min |
| 02 | [Node Setup](./walkthroughs/02-node-setup) | Intermediate | 30 min |
| 03 | [Storage Pools](./walkthroughs/03-storage-pools) | Intermediate | 30 min |
| 04 | [BrightDB Usage](./walkthroughs/04-brightdb-usage) | Intermediate | 45 min |
| 05 | [Building a dApp](./walkthroughs/05-building-a-dapp) | Advanced | 60 min |
| 06 | [Troubleshooting & FAQ](./walkthroughs/06-troubleshooting-faq) | Beginner | 10 min |
