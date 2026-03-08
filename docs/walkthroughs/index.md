---
title: "Walkthroughs"
nav_order: 14
has_children: true
parent: "Home"
---

# BrightChain Walkthroughs

Welcome to the BrightChain walkthrough series. These guides take you from understanding the architecture to building and deploying your own decentralized applications on the BrightChain platform.

## The BrightChain Ecosystem

BrightChain is a modular, privacy-preserving decentralized platform. Its ecosystem includes several purpose-built components:

- **BrightDB** — A MongoDB-like document database backed by the Owner-Free Filesystem block store.
- **BrightPass** — Decentralized identity and authentication built on BIP39/32 key derivation.
- **BrightMail** — Privacy-preserving messaging over the BrightChain network.
- **BrightHub** — A social and collaboration platform for the BrightChain community.
- **BrightStack** — The full-stack dApp development paradigm: BrightChain + Express + React + Node.js.

## Guides

| # | Guide | Difficulty | Est. Time | Description |
|---|-------|------------|-----------|-------------|
| 00 | [Architecture Overview](./00-architecture-overview) | Beginner | 20 minutes | Understand BrightChain's layered architecture, the TUPLE storage model, and how the Nx packages fit together. |
| 01 | [Quickstart](./01-quickstart) | Beginner | 15 minutes | Clone the repo, install prerequisites, and run your first BrightDB query in under fifteen minutes. |
| 02 | [Node Setup](./02-node-setup) | Intermediate | 30 minutes | Configure and start a Regular Storage Node or Quorum Node and join the decentralized network. |
| 03 | [Storage Pools](./03-storage-pools) | Intermediate | 30 minutes | Create and manage Storage Pools for tenant isolation, encryption, and cross-node coordination. |
| 04 | [BrightDB Usage](./04-brightdb-usage) | Intermediate | 45 minutes | Master CRUD operations, query operators, indexes, transactions, aggregation, and the Express middleware. |
| 05 | [Building a dApp](./05-building-a-dapp) | Advanced | 60 minutes | Build a full-stack decentralized application on BrightStack with identity integration and pool isolation. |
| 06 | [Troubleshooting & FAQ](./06-troubleshooting-faq) | Beginner | 10 minutes | Resolve common installation failures, runtime errors, and find diagnostic commands. |
| 07 | [Cloud Storage Providers](./07-cloud-storage-providers) | Intermediate | 45 minutes | Use S3 or Azure Blob as a block store for BrightChain. |
| 08 | [Joining the Network](./08-joining-the-network) | Intermediate | 45 minutes | Spin up a node, connect to the BrightChain network, join storage pools, and understand Quorum admission. |

## Suggested Reading Order

Start with the **Architecture Overview** to understand the big picture, then follow the **Quickstart** to get a local environment running. From there, explore the intermediate guides in order (Node Setup → Storage Pools → BrightDB Usage) before tackling the advanced dApp guide. If you're a prospective node operator, read **Joining the Network** after Node Setup. Keep the **Troubleshooting & FAQ** handy as a reference throughout.
