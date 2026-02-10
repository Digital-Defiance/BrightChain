[![Codacy Badge](https://app.codacy.com/project/badge/Grade/e3f269c473254e0aa9d8f49acb0686ac)](https://app.codacy.com/gh/Digital-Defiance/BrightChain/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

<div align="center">
  <img src="./brightchain-react/src/assets/images/BrightChain-Square-white.png" />
</div>

# BrightChain: Privacy. Participation. Power.

## Next-Generation Decentralized Infrastructure

BrightChain represents a revolutionary approach to blockchain technology, combining advanced cryptography with innovative governance mechanisms. Built on Ethereum's foundation but departing from traditional proof-of-work systems, BrightChain delivers a comprehensive suite of decentralized services designed for security, privacy, and democratic participation.

## Vision: A Platform for Digital Society

BrightChain has evolved beyond a blockchain alternative into a complete platform for building decentralized digital societies. The system provides all essential infrastructure for secure, private, and democratic online communities:

- **Foundation**: Owner-Free Filesystem with plausible deniability, unlimited file sizes via Super CBL, and BIP39/32 identity management
- **Communication**: Encrypted messaging with gossip protocol, RFC-compliant email, and Discord-competitive chat with Signal-grade encryption
- **Applications**: BrightPass password manager (1Password-competitive), real-time communication (DMs, groups, channels), and secure collaboration tools
- **Governance**: Homomorphic voting with 15+ methods, quorum-based decision-making, and privacy-preserving elections with verifiable results
- **Security**: Brokered anonymity (accountability via quorum consensus), end-to-end encryption everywhere, and enterprise-grade credential management

**The Storage vs. Power Density Advantage**: Every blockchain has waste somewhere. BrightChain cuts down on waste in every way possible, but does have some overhead in the way of its storage mechanism. However, storage is one of the areas that has been the most cost-effective and where we've achieved massive density in recent years, whereas datacenters are struggling to achieve the needed power density for CPU requirements of blockchains and AI. The tradeoff of minimal storage overhead for anonymity and absolution of concern from copyright lawsuits and the like, or hosting inappropriate material, enables everyone to be all in and make the most out of our vast storage resources spread out across the globe.

## Core Features

BrightChain integrates several groundbreaking technologies:

- **Advanced Blockchain Architecture**: Built on Ethereum's keyspace and foundation but engineered without proof-of-work constraints, offering improved efficiency and sustainability
- **Hierarchical Storage System**: Super CBL (Constituent Block List) architecture enabling efficient storage of files of any size through recursive hierarchical structures
- **Decentralized Storage**: A peer-to-peer distributed file system enabling secure, resilient data storage across the network
- **Messaging System**: Secure, decentralized message passing with encryption, routing, delivery tracking, and gossip protocol for epidemic-style propagation built on the block store
- **Email System**: RFC 5322/2045 compliant email with threading, BCC privacy, attachments, inbox operations, delivery tracking, and multiple encryption schemes (ECIES, shared key, S/MIME)
- **Communication System**: Discord-competitive communication platform with Signal-grade encryption, featuring direct messaging, group chats, and channels with real-time presence, typing indicators, role-based permissions, and four visibility modes
- **BrightPass Password Manager**: Next-generation password keychain with vault management, TOTP/2FA, breach detection, and emergency access using VCBL (Vault Constituent Block List) architecture for efficient encrypted credential storage. Supports import from 1Password, LastPass, Bitwarden, Chrome, Firefox, KeePass, and Dashlane
- **Identity Management**: A sophisticated decentralized identity provider ensuring user privacy and control
- **Owner-Free File System**: Complete TUPLE storage implementation (3-block storage: data + 2 randomizers) for true plausible deniability and legal protection
- **Homomorphic Voting System**: Revolutionary cryptographic voting infrastructure utilizing Paillier homomorphic encryption with ECDH-derived keys, enabling secure vote tallying without revealing individual votes. Supports 15+ voting methods from simple plurality to complex ranked choice, with government compliance features including immutable audit logs, public bulletin board, and verifiable receipts
- **Enhanced File Security**: State-of-the-art encryption combining ECIES for key derivation with AES-256-GCM for file security
- **Digital Governance Framework**: Revolutionary quorum-based system supporting configurable majority requirements for secret reconstruction

## Innovative Security Features

### Brokered Anonymity

BrightChain introduces "Brokered Anonymity," a sophisticated privacy mechanism that enables anonymous operations while maintaining accountability through encrypted identity information. This information can only be reconstructed through majority quorum consensus, typically in response to legal processes like FISA warrants. After a specified period, this identifying information becomes permanently inaccessible, ensuring long-term privacy protection.

### Homomorphic Voting System

BrightChain implements a cutting-edge homomorphic voting system that enables secure, privacy-preserving elections. The system features:

- **ECDH-to-Paillier Bridge**: Novel cryptographic bridge that derives Paillier homomorphic encryption keys from existing ECDSA/ECDH keys
- **Privacy-Preserving Tallying**: Vote aggregation without revealing individual votes through homomorphic addition
- **Cross-Platform Determinism**: Identical cryptographic operations across Node.js and browser environments
- **Cryptographic Security**: 128-bit security level with Miller-Rabin primality testing (256 rounds, error probability < 2^-512)
- **Timing Attack Resistance**: Constant-time operations and deterministic random bit generation (HMAC-DRBG)

### Quorum-Based Security

The system implements advanced document sealing and unsealing mechanisms, allowing groups to protect sensitive information with customizable threshold requirements for access restoration. This feature ensures both security and flexibility in document management.

## Technical Implementation

BrightChain is currently implemented as an NX monorepo, with the core functionality contained in the "brightchain-lib" project. The system incorporates:

- **Authentication**: Robust implementation using BIP39/32 and SECP256k1
- **Identity Management**: Complete Member system with public/private key pairs and document storage
- **Encryption**: Advanced ECIES encryption with AES-256-GCM and multi-recipient support
- **TUPLE Storage**: All data stored as 3-block TUPLEs for complete Owner-Free Filesystem compliance
- **Data Integrity**: Verified block-level integrity with SHA3-512 checksums and XOR functionality
- **Super CBL Architecture**: Hierarchical Constituent Block Lists enabling unlimited file sizes through recursive sub-CBL structures with automatic threshold detection
- **Message Passing**: Complete messaging system with encryption, routing, delivery tracking, and WebSocket events
- **Quorum Governance**: Full Shamir's Secret Sharing implementation for document sealing with configurable thresholds (2 to 1,048,575 members)
- **Homomorphic Voting**: Integrated Paillier homomorphic encryption system with ECDH-to-Paillier key bridge for privacy-preserving vote aggregation
- **Forward Error Correction**: Reed-Solomon erasure coding for data recovery and redundancy
- **Cross-Platform Cryptography**: Unified cryptographic operations across Node.js and browser environments with deterministic key generation
- **Modular Architecture**: Extends base cryptographic constants from [@digitaldefiance](https://github.com/Digital-Defiance) libraries, ensuring consistency and reducing duplication

### Constants Architecture

BrightChain follows a layered constants architecture:

- **brightchain-lib**: Extends `@digitaldefiance/ecies-lib` for core cryptographic constants
- **brightchain-api-lib**: Extends `@digitaldefiance/node-express-suite` for API and Express constants
- **BrightChain-specific**: Only defines blockchain-specific constants (CBL, FEC, TUPLE, SEALING, VOTING, etc.)

This architecture ensures:
- Single source of truth for cryptographic constants
- Reduced code duplication
- Consistent security practices across the @digitaldefiance ecosystem
- Easy maintenance and updates

## Development Status

BrightChain is currently in pre-alpha stage with **70-80% of core functionality complete**. Major achievements include:

### ✅ Completed Components
- **Owner-Free Filesystem**: Complete TUPLE storage implementation (3 blocks per data item) for true plausible deniability
- **Super CBL System**: Hierarchical storage supporting unlimited file sizes through recursive sub-CBLs
- **Identity Management**: Full member system with BIP39/32 key derivation and SECP256k1 cryptography
- **Quorum Governance**: Complete Shamir's Secret Sharing implementation with configurable thresholds
- **Homomorphic Voting**: Paillier encryption with ECDH-to-Paillier bridge for privacy-preserving elections. Supports 15+ voting methods (Plurality, Approval, Weighted, Borda, Score, Ranked Choice, IRV, STAR, STV, Quadratic, Consensus, etc.) with government compliance features (immutable audit logs, public bulletin board, verifiable receipts, hierarchical aggregation)
- **Messaging System**: Complete encrypted messaging with routing, delivery tracking, gossip protocol (epidemic-style propagation with priority-based delivery, automatic retry with exponential backoff), discovery protocol (Bloom filter-based block location), and WebSocket transport
- **Email System**: RFC 5322/2045 compliant email with threading (In-Reply-To/References), BCC privacy (cryptographically separated copies), attachments (multiple with Content-ID support), inbox operations (query/filter/sort/search with pagination), delivery tracking (per-recipient via gossip), encryption (ECIES per-recipient, shared key, S/MIME), signatures (digital signatures for authentication), and forward/reply (RFC-compliant with Resent-* headers)
- **Communication System**: Discord-competitive platform with Signal-grade encryption. Features direct messaging (person-to-person encrypted), group chats (multi-member with shared encryption and key rotation), channels (topic-based with four visibility modes: public/private/secret/invisible), presence system (online/offline/idle/DND), role-based permissions (Owner/Admin/Moderator/Member), real-time events (typing indicators, reactions, edits via WebSocket), invite system (time-limited, usage-limited tokens), message search, and conversation promotion (DMs to groups)
- **BrightPass Password Manager**: 1Password-competitive keychain with VCBL architecture, multiple entry types (login/note/card/identity), password generation (cryptographically secure with constraints), TOTP/2FA (with QR codes), breach detection (k-anonymity via Have I Been Pwned), audit logging (append-only encrypted), emergency access (Shamir's Secret Sharing), vault sharing (multi-member with ECIES), import support (1Password, LastPass, Bitwarden, Chrome, Firefox, KeePass, Dashlane), and browser extension autofill API
- **Encryption Suite**: ECIES + AES-256-GCM with multi-recipient support
- **Forward Error Correction**: Reed-Solomon erasure coding for data recovery
- **Block Store**: Content-addressed storage with SHA3-512 checksums and automatic deduplication

### ⚠️ In Progress
- **Reputation System**: Algorithms designed but not yet implemented
- **Network Layer**: P2P infrastructure partially complete
- **Economic Model**: Storage market and energy tracking concepts defined
- **Smart Contracts**: Planned CIL/CLR-based contract system

## Getting Started

### Prerequisites

- Docker Desktop (optional)
- NodeJS 20+ (if not using Docker)

### Installation Steps

1. Clone the repository
2. Open in VSCode
3. For Docker users:
   - Install Dev Container extension
   - Select "Remote-Containers: Reopen in Container"
4. Run `yarn` in repository root and brightchain-lib
5. Execute tests: `npx nx test brightchain-lib`

## Documentation

For comprehensive understanding:

- **Core Architecture**:
  - [BrightChain Summary](./docs/BrightChain%20Summary.md): High-level system overview
  - [Brightchain Writeup](./docs/Brightchain%20Writeup.md): Detailed technical documentation
  - [TUPLE Storage Architecture](./docs/TUPLE_Storage_Architecture.md): Complete OFF compliance with 3-block storage
  - [OFF System Comparison Analysis](./docs/OFF_System_Comparison_Analysis.md): Detailed comparison with Owner-Free File System and "government in a box" assessment

- **Communication & Messaging**:
  - [Messaging System Architecture](./docs/Messaging%20System%20Architecture.md): Message passing and event system design
  - [Gossip Delivery Protocol](./docs/Gossip_Delivery_Protocol.md): Epidemic-style message propagation with priority-based delivery and automatic retry
  - [Communication System Architecture](./docs/Communication_System_Architecture.md): Discord-style communication with end-to-end encryption

- **Applications**:
  - [BrightPass Password Manager](./docs/BrightPass_Password_Manager.md): Secure password keychain with VCBL architecture and emergency access
  - [Voting System Architecture](./docs/Voting_System_Architecture.md): Homomorphic voting with 15+ methods and government compliance

- **Development**:
  - [Implementation Roadmap](./docs/ImplementationRoadmap.md): Development roadmap and future plans

## Development Tools

This project leverages Nx build system for enhanced development efficiency. For detailed information about working with Nx:

### Code Generation

```bash
nx list                    # View available plugins
nx list <plugin-name>      # View plugin-specific generators
```

### Task Execution

```bash
nx <target> <project>                      # Single target
nx run-many -t <target1> <target2>        # Multiple targets
nx run-many -t <target1> <target2> -p <proj1> <proj2>  # Filtered projects
```

### Editor Integration

Enhance your development experience with [Nx Console extensions](https://nx.dev/nx-console), providing:

- Autocomplete support
- Task & generator UI
- VSCode, IntelliJ, and Vim LSP support

### Deployment

Build your application with:

```bash
nx build demoapp
```

Build artifacts will be available in the `dist/` directory.

### CI Integration

Nx supports advanced CI features:

- [Remote caching](https://nx.dev/core-features/share-your-cache)
- [Distributed task execution](https://nx.dev/nx-cloud/features/distribute-task-execution)
- [CI setup documentation](https://nx.dev/recipes/ci)

## Community and Support

Join the Nx community:

- [Community Portal](https://nx.dev/community)
- [YouTube Channel](https://www.youtube.com/@nxdevtools)
- [Twitter](https://twitter.com/nxdevtools)

## The Revolution Network

BrightChain is the technology behind **The Revolution Network**—a protocol and ecosystem designed to bring out the best in collaborators through incentive-driven participation. Users are rewarded for philanthropic behavior, quality content, and resource contributions while aberrant behaviors are disincentivized through proof-of-work throttling and reputation penalties.

The platform provides:
- **True Anonymity with Accountability**: Brokered anonymity via quorum consensus
- **Democratic Moderation**: Community-driven governance with configurable thresholds
- **Privacy by Design**: Owner-Free Filesystem with plausible deniability
- **Secure Communication**: Signal-grade encryption across all channels
- **Democratic Decision-Making**: Privacy-preserving voting with verifiable results
- **Personal Security**: Enterprise-grade password management

BrightChain is not just a blockchain alternative—it's a complete platform for building the next generation of digital societies, where privacy, security, and democracy are fundamental rights, not afterthoughts.
