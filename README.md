[![Codacy Badge](https://app.codacy.com/project/badge/Grade/e3f269c473254e0aa9d8f49acb0686ac)](https://app.codacy.com/gh/Digital-Defiance/BrightChain/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

<div align="center">
  <img src="./brightchain-react/src/assets/images/BrightChain-Square-white.png" />
</div>

# BrightChain: Next-Generation Decentralized Infrastructure

BrightChain represents a revolutionary approach to blockchain technology, combining advanced cryptography with innovative governance mechanisms. Built on Ethereum's foundation but departing from traditional proof-of-work systems, BrightChain delivers a comprehensive suite of decentralized services designed for security, privacy, and democratic participation.

NOTE: The brightchain-api portion of the repo is currently a mess and incomplete- it is largely code i brought over from another project. It will not progress much until I get the library part of the code more complete (getting very close!) and I have just worked out the details of a document interface (Mongoose style Document) that I hope to use with the block store. Once I can store user accounts and whatnot, I will work on the API.

## Core Features

BrightChain integrates several groundbreaking technologies:

- **Advanced Blockchain Architecture**: Built on Ethereum's foundation but engineered without proof-of-work constraints, offering improved efficiency and sustainability
- **Decentralized Storage**: A peer-to-peer distributed file system enabling secure, resilient data storage across the network
- **Identity Management**: A sophisticated decentralized identity provider ensuring user privacy and control
- **Owner-Free File System**: Implementation of OFF System principles for secure resource sharing with legal compliance
- **Cryptographic Voting**: Secure electoral infrastructure utilizing Paillier encryption and ECDH-derived keys
- **Enhanced File Security**: State-of-the-art encryption combining ECIES for key derivation with AES-256-GCM for file security
- **Digital Governance Framework**: Revolutionary quorum-based system supporting configurable majority requirements for secret reconstruction

## Innovative Security Features

### Brokered Anonymity

BrightChain introduces "Brokered Anonymity," a sophisticated privacy mechanism that enables anonymous operations while maintaining accountability through encrypted identity information. This information can only be reconstructed through majority quorum consensus, typically in response to legal processes like FISA warrants. After a specified period, this identifying information becomes permanently inaccessible, ensuring long-term privacy protection.

### Quorum-Based Security

The system implements advanced document sealing and unsealing mechanisms, allowing groups to protect sensitive information with customizable threshold requirements for access restoration. This feature ensures both security and flexibility in document management.

## Technical Implementation

BrightChain is currently implemented as an NX monorepo, with the core functionality contained in the "brightchain-lib" project. The system incorporates:

- **Authentication**: Robust implementation using BIP39/32 and SECP256k1
- **Encryption**: Advanced ECIES encryption utilizing user-specific keys
- **Data Integrity**: Verified block-level integrity with XOR functionality
- **Democratic Systems**: Integrated voting mechanisms using Paillier encryption

## Development Status

BrightChain is currently in pre-alpha stage, with several key components under active development:

- **Core Library**: Near completion with verified data integrity at block level
- **Block Generation**: Ongoing development of complex generation and reconstruction processes
- **API Development**: Initial framework established, pending completion of core library features
- **Quorum Implementation**: Advanced stages of development for document management features

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

- [BrightChain Summary](./docs/BrightChain%20Summary.md): High-level system overview
- [Brightchain Writeup](./docs/Brightchain%20Writeup.md): Detailed technical documentation

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
