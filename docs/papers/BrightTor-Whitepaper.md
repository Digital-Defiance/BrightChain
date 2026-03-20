---
layout: default
title: "BrightTor: A Block-Based Anonymized Overlay Network Protocol for BrightChain"
parent: "Papers"
---
# BrightTor: A Block-Based Anonymized Overlay Network Protocol for BrightChain

**Version 1.0 — March 2026**

**Authors:** Jessica Mulein, Digital Defiance

---

## Abstract

BrightTor is an anonymized overlay network protocol that layers Tor-like onion routing on top of BrightChain's existing block storage, gossip, and cryptographic infrastructure. By encapsulating fixed-size cells as standard BrightChain blocks and storing forwarded traffic using Owner-Free Filesystem (OFFS) tuple whitening, BrightTor achieves a property unique among anonymity networks: relay nodes cannot distinguish circuit traffic from ordinary block storage activity. The protocol supports both store-and-forward and real-time streaming modes, enabling interactive applications over an anonymized network layer. This paper describes the protocol architecture, threat model, cell format, circuit construction, flow control, congestion signaling, hidden services, and security mitigations.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Background and Motivation](#2-background-and-motivation)
3. [Threat Model](#3-threat-model)
4. [Protocol Overview](#4-protocol-overview)
5. [Cell Format and Serialization](#5-cell-format-and-serialization)
6. [Onion Encryption and Layered Routing](#6-onion-encryption-and-layered-routing)
7. [Circuit Construction and Teardown](#7-circuit-construction-and-teardown)
8. [Traffic Classification and Prioritization](#8-traffic-classification-and-prioritization)
9. [Flow Control: The SENDME Protocol](#9-flow-control-the-sendme-protocol)
10. [Congestion Signaling](#10-congestion-signaling)
11. [Node Capacity and Admission Control](#11-node-capacity-and-admission-control)
12. [Streaming Data Transport](#12-streaming-data-transport)
13. [OFFS Tuple Integration](#13-offs-tuple-integration)
14. [Directory Authority and Consensus](#14-directory-authority-and-consensus)
15. [Relay Selection and Path Building](#15-relay-selection-and-path-building)
16. [Hidden Services](#16-hidden-services)
17. [Key Management and Rotation](#17-key-management-and-rotation)
18. [Security Analysis and Attack Mitigations](#18-security-analysis-and-attack-mitigations)
19. [Protocol Versioning](#19-protocol-versioning)
20. [Exit Policy Enforcement](#20-exit-policy-enforcement)
21. [BrightChain Integration](#21-brightchain-integration)
22. [Performance Considerations](#22-performance-considerations)
23. [Correctness Properties](#23-correctness-properties)
24. [Related Work](#24-related-work)
25. [Future Work](#25-future-work)
26. [Conclusion](#26-conclusion)

---

## 1. Introduction

Anonymity networks such as Tor have demonstrated the viability of onion-routed overlay networks for protecting user privacy on the internet. However, these systems operate as standalone infrastructure, requiring dedicated relay software, separate directory services, and purpose-built transport protocols. This separation creates a visible distinction between anonymity traffic and regular network activity, making it possible for network observers to identify and potentially block anonymity network usage.

BrightTor takes a fundamentally different approach. Rather than building a standalone anonymity network, BrightTor embeds onion routing directly into BrightChain's existing decentralized block storage network. Every cell of circuit traffic is indistinguishable from a regular BrightChain block at the storage and transport layers. Relay nodes store forwarded cells using BrightChain's Owner-Free Filesystem (OFFS) tuple whitening mechanism, which XOR-splits data into components that are individually indistinguishable from random data. This means a relay operator cannot determine whether any given block in their storage contains circuit traffic, regular file data, or random whitening material.

The protocol reuses BrightChain's ECIES (secp256k1) encryption, AES-256-GCM symmetric encryption, BIP39/BIP32 hierarchical deterministic key derivation, gossip-based block distribution, Bloom filter discovery, and pooled block storage. This avoids building a parallel network stack and allows BrightTor to inherit BrightChain's existing peer-to-peer infrastructure, node identity system, and resource tracking.

---

## 2. Background and Motivation

BrightChain is a decentralized block storage network built around the concept of Owner-Free storage. Data is split into fixed-size blocks, XOR-whitened into tuples where each component is individually meaningless, and distributed across participating nodes via a gossip protocol. No single node can determine the content of the data it stores, providing plausible deniability at the storage layer.

BrightChain already provides several primitives that are directly applicable to anonymity networking:

- **Fixed-size blocks** (512 bytes for `BlockSize.Message`) that are uniform and content-agnostic
- **OFFS tuple whitening** (Data ⊕ Random₁ ⊕ Random₂ = 0) for plausible deniability
- **ECIES encryption** (secp256k1) for asymmetric key exchange
- **AES-256-GCM** for authenticated symmetric encryption
- **BIP39/BIP32 key derivation** for deterministic identity management
- **Gossip protocol** with configurable fanout, TTL, batch processing, and Bloom filter pre-checks
- **Pooled block storage** with namespace isolation for separating data by purpose
- **Node resource tracking** for bandwidth, uptime, and reliability metrics
- **Discovery protocol** with Bloom filter pre-checks for efficient block location

The motivation for BrightTor is to leverage these existing primitives to create an anonymity layer where circuit traffic is not merely encrypted but is structurally indistinguishable from the network's regular operation. A network observer watching BrightChain traffic sees only fixed-size blocks being gossiped between nodes — the same activity that occurs during normal file storage and retrieval.

---

## 3. Threat Model

BrightTor is designed to protect against the following adversary capabilities:

**In scope:**
- A local network observer who can monitor traffic between a user and their guard node
- A compromised relay that attempts to correlate traffic across circuits
- A compromised exit node that observes plaintext traffic to destinations
- An adversary who controls a minority of directory authority nodes
- An adversary who attempts timing correlation attacks across circuit hops
- An adversary who attempts traffic volume analysis to identify circuit participants
- An adversary who attempts tagging attacks (modifying cell content to detect it downstream)
- An adversary who attempts denial-of-service via circuit creation flooding

**Out of scope:**
- A global passive adversary who can observe all network links simultaneously
- An adversary who controls a majority of directory authority nodes
- Side-channel attacks on the host operating system or hardware
- Application-layer information leaks (e.g., browser fingerprinting, DNS leaks)

BrightTor provides an additional property not present in traditional anonymity networks: relay-level plausible deniability. Because all circuit traffic is stored using OFFS tuple whitening, a relay operator who is compelled to produce the contents of their storage cannot determine which blocks contain circuit traffic and which contain regular data or random whitening material.

---

## 4. Protocol Overview

BrightTor operates as an overlay network within BrightChain. Participating nodes opt in to relay circuit traffic by publishing signed relay descriptors to the directory authority. Clients build 3-hop circuits (Guard → Middle → Exit) through the relay network, with each hop seeing only its immediate predecessor and successor. Traffic is onion-encrypted so that each relay can peel exactly one encryption layer, and the exit node delivers plaintext to the destination.

The protocol's key components are:

1. **Cells**: Fixed-size 512-byte transport units, identical in size to BrightChain's `BlockSize.Message` blocks
2. **Circuits**: Ordered sequences of 3 relay nodes forming an anonymized path
3. **Onion encryption**: Nested ECIES layers, one per hop, with forward secrecy via ephemeral keys
4. **Dual-mode transport**: Steganographic mode (gossip-batched, maximum indistinguishability) and direct relay mode (persistent TLS connections, low latency)
5. **SENDME flow control**: TCP-like windowed acknowledgment preventing fast senders from overwhelming slow relays
6. **Congestion signaling**: Explicit back-pressure signals from congested relays to upstream nodes
7. **OFFS tuple integration**: Cell blocks are XOR-whitened before storage, with lazy whitening and shared random block pools to reduce overhead
8. **Directory authority**: Automated multi-signature consensus documents listing active relays
9. **Hidden services**: Introduction points and rendezvous points enabling location-hidden services
10. **Gossip integration**: New announcement types (`tor_descriptor`, `tor_consensus`, `tor_congestion`) extend BrightChain's existing gossip protocol
11. **Bandwidth credit system**: Relay operators earn credits proportional to contributed bandwidth, creating a give-to-get economy

### Transport Modes

BrightTor defines two transport modes, selectable per-circuit by the originator:

**Steganographic mode** routes cells through BrightChain's gossip pipeline with full OFFS tuple whitening. Each cell is stored as a whitened block tuple in the `brighttor` pool and propagated via gossip announcements. This provides maximum indistinguishability — circuit traffic is structurally identical to regular block storage activity — at the cost of up to 1 second of batching latency per hop (~3 seconds round-trip for a 3-hop circuit). Use cases: circuit construction handshakes, hidden service rendezvous, store-and-forward messaging, and any scenario where indistinguishability is more important than latency.

**Direct relay mode** forwards cells over persistent TLS connections between relay daemons, bypassing the gossip pipeline entirely. Once a circuit is established (via steganographic mode for the handshake), the originator can upgrade the circuit to direct mode by sending a MODE_SWITCH control cell. In direct mode, cells are forwarded in-memory through the relay daemon's decrypt-forward pipeline without gossip batching latency. Per-hop latency drops to ~5-15ms (dominated by batched shuffled forwarding), giving a 3-hop round-trip of ~15-45ms — comparable to standard Tor. The trade-off: a network observer can distinguish direct relay traffic from gossip traffic by its connection pattern (persistent TLS sessions between known relay IPs). However, the cell content remains onion-encrypted, the circuit path remains hidden, and the observer cannot determine the traffic's purpose or destination.

**OFFS whitening invariant (both modes):** Regardless of transport mode, the relay daemon enforces a strict invariant: no un-whitened cell is ever written to persistent storage. In steganographic mode, every cell is whitened before block store persistence as part of the gossip pipeline. In direct mode, cells are forwarded in-memory without persistence — but if the relay needs to persist a cell for any reason (retransmission buffering, crash recovery journaling, memory pressure spill-to-disk), the cell is whitened through the OFFS tuple mechanism before being written. This ensures that relay-level plausible deniability is preserved regardless of transport mode: any cell that exists on disk is indistinguishable from random data. The only cells that exist un-whitened are in the relay daemon's process memory, which is cleared on forwarding and zeroized on circuit teardown.

The originator selects the mode based on the application's requirements:

| Use Case | Recommended Mode | Rationale |
|----------|-----------------|-----------|
| Interactive web browsing | Direct | Latency-sensitive; Tor-equivalent attribution model acceptable |
| Store-and-forward messaging | Steganographic | Full OFFS plausible deniability required |
| Circuit construction (CREATE/EXTEND) | Steganographic | Handshake must be indistinguishable |
| Hidden service rendezvous | Steganographic | Location hiding requires indistinguishability |
| Bulk file transfer | Direct | Throughput-sensitive; Tor-equivalent attribution acceptable |
| High-censorship environment | Steganographic | Observer must not detect anonymity usage |
| Legal-risk jurisdiction | Steganographic | Relay operator needs full plausible deniability |

### Attribution Model Comparison

The two transport modes provide fundamentally different attribution properties:

**Steganographic mode — OFFS plausible deniability:** Cells are whitened into OFFS tuples before leaving the relay. What appears on the network and in storage are gossip announcements referencing block IDs in the `brighttor` pool, where each block is indistinguishable from random data. No relay can prove that any predecessor sent a specific cell, because any node in the network could have published those blocks as part of normal storage activity. This is the property unique to BrightTor that no other anonymity network provides.

**Direct mode — Tor-equivalent attribution:** Cells are forwarded over persistent TLS connections between relay daemons. The next-hop relay knows the predecessor's identity (IP address and relay fingerprint) and can attribute specific cells to that predecessor. This is the same attribution model as standard Tor — the guard knows the originator, the middle knows the guard, the exit knows the middle. No single relay can determine the full circuit path, but each relay can identify its immediate predecessor. A compromised or compelled relay can testify about its predecessor's traffic.

The originator's choice of mode is a privacy/performance trade-off:
- When plausible deniability for relay operators is critical (legal risk, censorship resistance), use steganographic mode
- When latency matters more than relay-operator deniability (interactive browsing, bulk transfer), use direct mode
- Circuit construction always uses steganographic mode to prevent an observer from detecting circuit-building activity

A circuit may switch modes during its lifetime. The MODE_SWITCH cell is a CONTROL cell that instructs each relay to transition the circuit's forwarding path. The switch is atomic per-hop: each relay acknowledges the switch before the next hop is instructed.

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Originator Node                              │
│  Application → CircuitBuilder → OnionEncryptor → CellSerializer     │
│                                    → PooledBlockStore (brighttor)    │
│                                    → GossipService                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ cell blocks via gossip
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Guard Node                                   │
│  AdmissionController → RelayProcessor → OnionDecryptor               │
│  → TrafficClassifier (CONTROL|DATA) → FlowController                 │
│  → PooledBlockStore (brighttor) → GossipService                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ forwarded cells
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Middle Relay                                  │
│  RelayProcessor → OnionDecryptor → TrafficClassifier                 │
│  → PooledBlockStore (brighttor) → GossipService                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ forwarded cells
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Exit Node                                    │
│  RelayProcessor → OnionDecryptor → ExitPolicyEnforcer                │
│  → StreamManager → Destination Service / Clearnet                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Cell Format and Serialization

All BrightTor traffic is transported in fixed-size cells of exactly 512 bytes, matching BrightChain's `BlockSize.Message`. This size uniformity is critical: it makes circuit traffic indistinguishable from regular message blocks at the storage and transport layers.

### Binary Layout

```
Offset  Size   Field            Type       Description
──────  ─────  ───────────────  ─────────  ─────────────────────────────────
0       1      command          uint8      Cell command type
1       2      payloadLength    uint16BE   Actual payload bytes (0–496)
3       1      flags            uint8      Bitmask (BEGIN, END, CONNECTED)
4       4      streamId         uint32BE   Stream identifier within circuit
8       8      circuitId        uint64BE   Hop-scoped circuit identifier
16      496    payload          bytes      Payload + random padding to 496
```

The 16-byte header carries the cell command, payload length, flags, stream identifier, and a hop-scoped circuit identifier. The remaining 496 bytes carry the payload. When the actual payload is shorter than 496 bytes, the remainder is filled with cryptographically random bytes, ensuring that all cells are identical in size regardless of content.

### Cell Commands

| Command | Value | Traffic Class | Description |
|---------|-------|---------------|-------------|
| CREATE | 0x01 | CONTROL | Initiate circuit hop |
| CREATED | 0x02 | CONTROL | Acknowledge circuit hop |
| EXTEND | 0x03 | CONTROL | Extend circuit through relay |
| EXTENDED | 0x04 | CONTROL | Acknowledge circuit extension |
| DESTROY | 0x05 | CONTROL | Tear down circuit |
| DATA | 0x06 | DATA | Application payload |
| SENDME | 0x07 | CONTROL | Flow control acknowledgment |
| KEEPALIVE | 0x08 | CONTROL | Prevent idle timeout |
| CONGESTION | 0x09 | CONTROL | Congestion signal |
| INTRODUCE | 0x0A | CONTROL | Hidden service introduction |
| RENDEZVOUS | 0x0B | CONTROL | Hidden service rendezvous |
| ESTABLISH_INTRO | 0x0C | CONTROL | Register introduction point |
| ESTABLISH_RENDEZVOUS | 0x0D | CONTROL | Register rendezvous point |
| MODE_SWITCH | 0x0E | CONTROL | Switch transport mode (steganographic ↔ direct) |

### Validation

A cell with a `payloadLength` field exceeding 496 is rejected with a `MALFORMED_CELL` error. The serialization process is designed to satisfy a round-trip property: for any valid cell, serializing and then deserializing produces an equivalent cell.

---

## 6. Onion Encryption and Layered Routing

BrightTor uses nested ECIES encryption to provide layered routing. When the originator constructs a data cell for a circuit of N relays, it applies N encryption layers using each relay's Onion_Key in reverse path order: the exit node's key is applied first (innermost layer), and the guard node's key is applied last (outermost layer). Each layer uses a fresh ephemeral key pair, ensuring that compromise of one layer's key does not compromise other layers.

### Forward Path (Originator → Exit)

1. The originator encrypts the plaintext payload with the exit node's Onion_Key (ECIES)
2. The result is encrypted with the middle relay's Onion_Key
3. The result is encrypted with the guard node's Onion_Key
4. The triply-encrypted cell is sent to the guard node

Each relay peels exactly one layer:
- The guard decrypts with its private key, verifies the integrity tag, and forwards to the middle relay
- The middle relay decrypts with its private key, verifies, and forwards to the exit
- The exit decrypts the final layer, extracting the plaintext payload

### Return Path (Exit → Originator)

For response traffic, the process is reversed. The exit node encrypts the response with the shared key for its hop. Each intermediate relay adds one AES-256-GCM encryption layer using its shared key. The originator peels all layers to recover the plaintext.

### Integrity Verification

Each ECIES layer includes an integrity tag. If a relay fails to verify the integrity tag after decryption, it drops the cell silently and increments a per-predecessor error counter. No error response is sent to the predecessor, preventing information leakage about the decryption failure.

### Forward Secrecy

Each onion layer uses a distinct ephemeral key pair generated by the originator. Per-circuit symmetric keys are derived via HKDF-SHA3-256 from the Diffie-Hellman shared secret, producing separate forward and backward keys:

```
DH shared secret → HKDF-SHA3-256 →
  forward_key  (32 bytes, AES-256-GCM)
  backward_key (32 bytes, AES-256-GCM)
  forward_iv_seed  (12 bytes)
  backward_iv_seed (12 bytes)
```

---

## 7. Circuit Construction and Teardown

### Construction

Circuits are built incrementally through a telescoping handshake:

1. **Guard hop**: The originator sends a CREATE cell to the guard node containing an ECIES-encrypted half of a Diffie-Hellman handshake. The guard completes the handshake, derives an AES-256-GCM shared key, and responds with a CREATED cell.

2. **Middle hop**: The originator sends an EXTEND cell through the guard, containing an inner CREATE payload encrypted to the middle relay's Onion_Key. The guard forwards the inner CREATE to the middle relay, which completes its own DH handshake and responds with CREATED. The guard wraps this as an EXTENDED cell back to the originator.

3. **Exit hop**: The same EXTEND/EXTENDED process is repeated through the guard and middle relay to establish a shared key with the exit node.

Each hop is assigned a unique hop-scoped CircuitId. The guard sees CircuitId_A from the originator and CircuitId_B toward the middle relay. The middle relay sees CircuitId_B from the guard and CircuitId_C toward the exit. No single relay can correlate the full circuit path.

If any hop fails to respond within 30 seconds, the originator tears down the partial circuit by sending DESTROY cells to all established hops and retries with different relays.

### Teardown

When a circuit is no longer needed, the originator sends a DESTROY cell through the circuit. Each relay forwards the DESTROY to the next hop, clears its local circuit state (send window, key material, forwarding table entry), and releases associated resources within 1 second.

### Idle Management

- **Relay idle timeout**: If a relay receives no cell on a circuit for 300 seconds, it sends DESTROY in both directions and clears state.
- **Originator idle timeout**: If the originator detects 600 seconds of inactivity, it proactively tears down the circuit.
- **Keepalive**: The originator sends a KEEPALIVE cell on each active circuit at least every 120 seconds to prevent relay-side idle timeouts.
- **Key zeroization**: All circuit key material is zeroized from memory within 1 second of teardown.

---

## 8. Traffic Classification and Prioritization

BrightTor classifies every cell into one of two traffic classes:

- **CONTROL**: Circuit management commands (CREATE, CREATED, EXTEND, EXTENDED, DESTROY, KEEPALIVE, SENDME, CONGESTION, INTRODUCE, RENDEZVOUS, ESTABLISH_INTRO, ESTABLISH_RENDEZVOUS)
- **DATA**: Application payload (DATA command only)

Each relay maintains separate per-circuit queues for CONTROL and DATA traffic. When both queues contain cells, all CONTROL cells are processed before any DATA cell (strict priority). This ensures that circuit management remains responsive even under heavy data load.

If the DATA queue for a circuit exceeds its maximum depth, the relay drops the oldest DATA cells and sends a CONGESTION cell to the predecessor hop. CONTROL cells are never dropped due to DATA queue pressure.

---

## 9. Flow Control: The SENDME Protocol

BrightTor implements TCP-like windowed flow control to prevent fast senders from overwhelming slow relays.

### Window Management

When a circuit is established, both the originator and exit node initialize a Send_Window of 1000 Data_Cells (approximately 500 KB at 512 bytes per cell). The sender decrements the window by 1 for each Data_Cell transmitted. When the window reaches 0, the sender stops transmitting until a SENDME acknowledgment is received.

### SENDME Acknowledgment

When the receiver has consumed 100 Data_Cells since the last SENDME, it sends a SENDME cell to the sender, which increments the Send_Window by 100. This provides both end-to-end flow control (between originator and exit) and hop-by-hop flow control (each relay sends SENDME to its predecessor after forwarding 100 cells).

### Authenticated SENDME

Each SENDME cell contains a SHA3-256 digest of the last Data_Cell received. The sender verifies this digest against its own record, ensuring the receiver has actually processed the acknowledged cells rather than simply sending empty acknowledgments.

### Stall Detection

If no SENDME is received within 60 seconds after the Send_Window reaches 0, the sender treats the circuit as stalled and tears it down with a DESTROY cell.

---

## 10. Congestion Signaling

BrightTor provides explicit congestion signaling so that senders can reduce their transmission rate before packet loss occurs.

### Severity Levels

| Threshold | Severity | Sender Response |
|-----------|----------|-----------------|
| Queue > 70% capacity | WARNING | Reduce rate by 50% (multiplicative decrease) |
| Queue > 90% capacity | CRITICAL | Reduce rate by 75% |

### Recovery

When 10 seconds elapse without a CONGESTION cell on a previously throttled circuit, the originator increases the transmission rate by 10% of the original rate (additive increase), up to the original maximum. This AIMD (Additive Increase, Multiplicative Decrease) approach mirrors TCP congestion control principles.

### Congestion Cell Payload

Each CONGESTION cell includes the relay's current queue occupancy percentage and advertised bandwidth, allowing the originator to make informed rate adjustment decisions.

---

## 11. Node Capacity and Admission Control

### Relay Descriptors

Each BrightTor node publishes a signed descriptor to the directory authority containing:
- Identity_Key fingerprint
- Current Onion_Key
- Advertised bandwidth (derived from the node's measured upload and download capacity)
- Uptime and success rate (from the node's reliability metrics)
- Exit policy
- Supported protocol version
- Publication timestamp and signature

When a node's available bandwidth changes by more than 20%, an updated descriptor is published within 60 seconds.

### Admission Control

Each relay runs an admission controller that tracks active circuits and committed bandwidth. A new circuit is rejected when:

- **CAPACITY_EXCEEDED**: Accepting the circuit would cause total committed bandwidth to exceed 90% of advertised bandwidth
- **CIRCUITS_EXHAUSTED**: Active circuit count exceeds the configurable maximum (default: 5000)

Rejected CREATE cells receive a DESTROY response containing the current load percentage, which the originator factors into future relay selection.

### Memory Protection

When circuit buffer memory exceeds a configurable threshold (default: 512 MB), the node rejects all new CREATE cells and sends CONGESTION CRITICAL signals on the 10 circuits with the deepest DATA queues.

---

## 12. Streaming Data Transport

BrightTor supports multiplexed streams over established circuits, enabling real-time interactive applications.

### Stream Lifecycle

1. **Open**: The originator assigns a unique 32-bit stream ID and sends a DATA cell with a BEGIN flag containing the destination address and port.
2. **Connect**: The exit node establishes a TCP connection to the destination and responds with a CONNECTED flag.
3. **Transfer**: Application data is segmented into 496-byte chunks, packaged as Data_Cells with the stream's ID, and sent through the circuit respecting the Send_Window. The exit node reassembles chunks in order and writes to the TCP connection. Response data follows the reverse path.
4. **Close**: Either endpoint sends a DATA cell with an END flag. The peer closes the stream state and TCP connection.

### Error Handling

If the destination TCP connection fails, the exit node sends an END cell with an appropriate reason code:

| Condition | Reason Code |
|-----------|-------------|
| Connection refused | CONNECTION_REFUSED |
| Connection timeout | TIMEOUT |
| Connection reset | RESET |
| Exit policy rejection | EXIT_POLICY_REJECTED |

---

## 13. OFFS Tuple Integration

This is BrightTor's most distinctive feature. When a relay persists a cell to the block store, the cell block is whitened using BrightChain's existing OFFS tuple mechanism:

```
CellBlock ⊕ RandomBlock₁ ⊕ RandomBlock₂ = WhitenedBlock
```

All three component block IDs (the cell block and both random blocks) are stored in the "brighttor" pool and their IDs are transmitted to the next hop via the gossip protocol. The receiving node retrieves all three blocks from the pool and XORs them to reconstruct the original cell.

### Lazy Whitening

OFFS whitening is decoupled from the transport mode. The invariant is: **no un-whitened cell is ever written to persistent storage, regardless of transport mode.**

In steganographic mode, every cell is whitened as part of the gossip pipeline before block store persistence — this is the standard path.

In direct relay mode, cells are forwarded in-memory (received → decrypted → re-encrypted → sent) without touching the block store. These cells exist only in the relay daemon's process memory and are cleared immediately after forwarding. However, if the relay daemon needs to persist a cell to disk for any reason, whitening is applied first:

- **Retransmission buffer spill**: If the in-memory retransmission buffer exceeds a configurable threshold, overflow cells are whitened and written to the `brighttor` pool
- **Crash recovery journal**: If crash recovery journaling is enabled, cells are whitened before being written to the journal
- **Memory pressure**: If the OS signals memory pressure, the relay daemon whitens and persists in-flight cells before releasing memory

This design preserves the OFFS plausible deniability guarantee: any forensic examination of a relay's persistent storage (disk seizure, filesystem analysis) finds only whitened blocks that are indistinguishable from random data. The only un-whitened cells exist transiently in process memory, which is zeroized on circuit teardown and cleared after each forwarding operation.

### Shared Random Block Pool

Instead of generating 2 fresh cryptographically random blocks for every cell tuple, each relay maintains a pre-generated pool of random blocks in the `brighttor` pool namespace. Random blocks are generated in batches during idle periods via `bootstrapPool('brighttor', BlockSize.Message, batchSize)` and reused across multiple tuples.

A random block can safely participate in multiple tuples because the XOR of different data blocks with the same random blocks produces different whitened blocks — the whitening property depends on the data block being unique, not the random blocks. This reduces the per-cell storage overhead from 3 blocks to approximately 1.1 blocks (the cell block itself plus amortized random block generation).

The shared pool is periodically refreshed: random blocks older than 1 hour are replaced with fresh ones to limit the window of any potential statistical analysis.

### Self-Destructing Blocks

Tuple components are assigned a time-to-live (TTL) at creation. The block store enforces TTL expiration through a background sweep (configurable interval, default: 10 seconds) that deletes expired blocks. For steganographic-mode cells, the default TTL is 60 seconds — sufficient for retransmission but short enough to bound the storage footprint.

With lazy whitening, shared random pools, and self-destructing blocks, the steady-state storage overhead for a relay handling 1000 cells/second is:
- **Direct mode (normal operation)**: ~0 persistent storage (cells forwarded in-memory, whitened only on spill-to-disk)
- **Direct mode (with retransmission buffer spill)**: Proportional to spill rate, whitened at ~1.1x amplification
- **Steganographic mode**: ~90 MB (1000 cells/sec × 512 bytes × 1.1 amplification × 60 seconds retention + shared random pool overhead)

In all cases, any cell that reaches persistent storage is OFFS-whitened. The plausible deniability guarantee holds regardless of transport mode or storage trigger.

### Properties

- **Plausible deniability**: Any individual block is indistinguishable from random data. A relay operator cannot determine whether a block contains circuit traffic, regular file data, or random whitening material.
- **Pool isolation**: All circuit-related blocks and tuple components reside exclusively in a dedicated "brighttor" pool via the pooled block store interface, preventing cross-contamination with regular BrightChain storage.
- **Ephemeral retention**: Tuple components are retained for a configurable TTL (default: 60 seconds) to allow retransmission, then automatically deleted.
- **Statistical indistinguishability**: The byte distribution of whitened blocks is statistically indistinguishable from uniform random data.

This integration means that BrightTor traffic in steganographic mode is not merely encrypted — it is structurally embedded in the same storage and distribution mechanisms used by all BrightChain data. An observer cannot distinguish between a node that is relaying circuit traffic and one that is simply participating in normal block storage.

---

## 14. Directory Authority and Consensus

### Consensus Document

A set of designated directory authority nodes produces a new consensus document every 60 minutes. The document lists all active relays with their:
- Identity_Key fingerprint and current Onion_Key
- Advertised bandwidth and uptime
- Exit policy summary
- Flags: Guard, Exit, Stable, Fast, Running
- Last descriptor publication timestamp
- Minimum required protocol version

### Automated Multi-Signature

Each authority node signs the consensus independently — there is no human-in-the-loop quorum process. A configurable threshold of valid signatures is required before any node accepts the document. This design avoids the latency that would be introduced by requiring human approval while still providing Byzantine fault tolerance against a minority of compromised authorities.

### Validation

When a node starts up, it fetches the latest consensus from at least 2 directory authority nodes and verifies the multi-signature threshold before using the relay list. If verification fails, the node rejects the document and retries from different authorities.

### Relay Lifecycle

- **Joining**: A node publishes a signed descriptor via the `tor_descriptor` gossip announcement type. The directory authority validates the Identity_Key signature, checks that advertised bandwidth is within 2x of measured bandwidth, and confirms reachability.
- **Removal**: A relay unreachable for 3 consecutive consensus periods has its Running flag set to false and is removed from the consensus.

### Bandwidth Credit System

BrightTor uses a bandwidth credit system to incentivize relay operation and prevent free-riding. Credits are tracked per-node in the consensus document and enforced by relay admission control.

**Earning credits:** A relay earns credits proportional to the bandwidth it contributes to the network. Directory authorities periodically measure relay bandwidth through active probing (sending test cells through circuits that include the relay) and passive observation (tracking the relay's advertised vs. measured throughput). Credits accumulate at a rate of 1 credit per MB of verified relay throughput.

**Spending credits:** When an originator builds a circuit, each relay deducts credits from the originator's balance at a rate of 1 credit per MB of circuit traffic. The originator's credit balance is included in the consensus document and verified by relays during circuit construction. If the originator's balance is below a minimum threshold (default: 10 credits), relays may reject the CREATE cell with a CREDITS_INSUFFICIENT reason code.

**Bootstrap allowance:** New nodes receive an initial credit grant (default: 100 credits) to allow them to use the network while they begin contributing relay bandwidth. This prevents a chicken-and-egg problem where new nodes cannot use circuits because they have no credits and cannot earn credits because they have no circuits.

**No token or blockchain:** Credits are simple counters in the consensus document, attested by directory authority signatures. There is no on-chain token, no smart contract, and no transaction overhead. The directory authorities serve as the trusted credit ledger, which is acceptable because they already serve as the trusted relay directory.

---

## 15. Relay Selection and Path Building

### Bandwidth-Weighted Selection

The originator selects relays using bandwidth-weighted random selection: the probability of selecting a relay is proportional to its advertised bandwidth divided by the total advertised bandwidth of all eligible relays. This naturally distributes load toward higher-capacity nodes.

### Role Constraints

- **Guard nodes** are selected only from relays with the Guard flag
- **Exit nodes** are selected only from relays with the Exit flag
- **Middle relays** may be any eligible relay

### Diversity Requirements

No two relays in the same circuit may share the same /16 IP subnet prefix. This reduces the risk of a single network operator observing multiple hops of the same circuit.

### Guard Set

The originator maintains a persistent set of 3 guard nodes and rotates one guard every 30 days. This limits exposure to guard-level traffic analysis while providing stability for the first hop.

### Quality Preferences

For long-lived streams, the originator prefers relays with uptime above 95% and success rate above 98%. Unreachable relays are excluded from selection for 10 minutes after a failed connection attempt.

---

## 16. Hidden Services

BrightTor supports location-hidden services accessible only through the overlay network, identified by public key rather than network address.

### Address Derivation

A hidden service generates a long-term ed25519 key pair. The `.brighttor` address is derived as:

```
base32(SHA3-256(publicKey)) + ".brighttor"
```

This produces a 56-character base32 string suffixed with ".brighttor". The derivation is deterministic: the same key always produces the same address.

### Introduction Points

The hidden service selects 3 introduction points from the consensus, builds circuits to each, and sends ESTABLISH_INTRO cells to register its public key. Introduction points hold standing circuits for the hidden service and accept introduction requests from clients. If an introduction point receives no KEEPALIVE from the hidden service within 300 seconds, it discards the registration.

### Rendezvous Protocol

1. The client selects a rendezvous point, builds a circuit to it, and sends an ESTABLISH_RENDEZVOUS cell containing a 32-byte random cookie.
2. The client builds a separate circuit to one of the hidden service's introduction points and sends an INTRODUCE cell containing: the rendezvous point address, the cookie, and the first half of a Diffie-Hellman handshake — all encrypted to the hidden service's public key.
3. The hidden service receives the INTRODUCE cell, builds a circuit to the rendezvous point, and sends a RENDEZVOUS cell containing the cookie and the second half of the DH handshake.
4. The rendezvous point matches the cookie, splices the two circuits together, and enables bidirectional communication.

Neither the client nor the hidden service learns the other's network location. The rendezvous point sees only two circuits being spliced — it cannot determine the identities of either party.

---

## 17. Key Management and Rotation

### Identity Key

The Identity_Key is derived from BrightChain's existing BIP39/BIP32 hierarchical deterministic key derivation using path `m/44'/60'/1'/0/0` (coin_type 60 for Ethereum compatibility, account 1 for BrightTor separation). This provides deterministic, reproducible identity from a BIP39 mnemonic.

### Onion Key Rotation

A new Onion_Key pair (ECIES secp256k1) is generated every 7 days and published in an updated descriptor. For 24 hours after rotation, the node accepts CREATE cells encrypted with either the current or previous Onion_Key, accommodating descriptor propagation delay.

If the Onion_Key has been in use for more than 8 days without successful rotation, the node logs a critical warning and refuses new CREATE cells until the key is rotated.

### Per-Circuit Keys

Per-circuit symmetric keys are derived via HKDF-SHA3-256 from the Diffie-Hellman shared secret, producing separate forward and backward keys and IV seeds. All circuit key material is zeroized from memory within 1 second of circuit teardown, providing forward secrecy for completed circuits.

### Curve Selection Rationale

BrightTor uses two elliptic curve families for distinct purposes:

- **secp256k1 (ECIES)**: Used for Identity_Key, Onion_Key, and all onion encryption layers. This reuses BrightChain's existing ECIES infrastructure directly, avoiding the need for a second cryptographic stack for relay-to-relay communication.
- **ed25519**: Used exclusively for hidden service identity keys and `.brighttor` address derivation. This aligns with Tor v3's hidden service address format, enabling potential future interoperability with Tor hidden service directories and client libraries.

The two curve families serve non-overlapping purposes with no cross-contamination: secp256k1 keys are used for relay communication (encryption), while ed25519 keys are used for hidden service identity (signing and address derivation). This separation is deliberate — it allows BrightTor to reuse BrightChain's existing key infrastructure for relay operations while adopting the established standard for hidden service addressing.

---

## 18. Security Analysis and Attack Mitigations

### Timing Correlation Attacks

Each relay applies timing decorrelation through **batched shuffled forwarding**: incoming cells are accumulated in a buffer for a random interval uniformly distributed between 5 and 15 milliseconds, then the entire batch is forwarded in a cryptographically random order. This provides substantially stronger decorrelation than per-cell random delay because it breaks the ordering relationship between input and output cells.

**Quantitative analysis:** At a cell arrival rate of R cells/second, the batch window of [5ms, 15ms] accumulates an average of R × 0.01 cells per batch. The adversary must correctly match each input cell to its output cell within the shuffled batch:

| Arrival Rate | Avg Batch Size | Correlation Probability (per cell) | Notes |
|-------------|---------------|-----------------------------------|-------|
| 100 cells/sec | 1 cell | ~1.0 | Trivial correlation — insufficient traffic |
| 500 cells/sec | 5 cells | ~0.2 | Moderate protection |
| 1000 cells/sec | 10 cells | ~0.1 | Strong protection — requires multi-cell statistical analysis |
| 5000 cells/sec | 50 cells | ~0.02 | Very strong — correlation requires sustained observation |

At aggregate relay throughput above 500 cells/second (across all circuits), batched shuffled forwarding provides meaningful timing decorrelation. Below this threshold, the relay falls back to per-cell random delay of [0, 10ms] as a baseline defense. The consensus document tracks relay throughput, and the originator can prefer high-throughput relays for circuits where timing resistance is important.

This analysis assumes a local adversary observing a single relay's input and output (the threat model's scope). A global passive adversary who can observe all network links simultaneously remains out of scope.

### Anonymity Set and Network Size

The indistinguishability property of steganographic mode depends on the `brighttor` pool existing on a sufficient number of nodes. If only relay nodes maintain a `brighttor` pool, the pool's existence is itself a signal that the node participates in BrightTor.

**Mitigation — Cover pool activity:** Every BrightChain node (not just BrightTor relays) generates background `brighttor` pool activity at a low, configurable rate (default: 1 block store/retrieve operation per 30 seconds). This ensures the `brighttor` pool exists on all nodes with non-zero block counts, making pool existence a non-signal.

**Minimum relay threshold:** The consensus document specifies a minimum relay count (default: 20) before circuits can be built. Below this threshold, the network operates in bootstrap mode where only steganographic store-and-forward is available and the directory authority publishes a warning flag. This prevents the network from operating with an anonymity set too small to provide meaningful protection.

**Anonymity set size:** In steganographic mode, the anonymity set for a given cell is the set of all nodes that could plausibly be the cell's origin. With cover pool activity on all nodes and gossip-based propagation (where any node could have originated or forwarded any block), the anonymity set equals the number of BrightChain nodes with active `brighttor` pools — which, with cover activity enabled, is the entire network.

### Traffic Volume Analysis

The originator injects cover traffic (empty DATA cells with random padding) at a configurable rate (default: 1 cell per 10 seconds per circuit). This provides a baseline of traffic on idle circuits, making it harder to determine when real data is being transmitted.

### Circuit Creation Flooding

CREATE cells are rate-limited to a maximum of 10 per second per predecessor node. If a predecessor sends more than 50 failed CREATE handshakes within 60 seconds, it is blocked for 300 seconds.

### Tagging Attacks

If a relay detects more than 100 integrity tag failures from the same predecessor within 60 seconds, it temporarily blocks cells from that predecessor for 60 seconds. This mitigates attacks where an adversary modifies cell content at one hop and observes the modification at another.

### Destination Isolation

The originator uses a different circuit for each distinct destination (hostname:port pair), preventing exit-level traffic correlation across destinations.

### Memory Hygiene

All cell payload data is cleared from memory after forwarding. Only circuit state metadata (CircuitId mappings, keys, counters) is retained. Circuit key material is zeroized within 1 second of teardown.

### Relay-Level Plausible Deniability

Through the OFFS whitening invariant, all cells that reach persistent storage are XOR-whitened before being written, regardless of transport mode. Any individual block in a relay's storage is indistinguishable from random data. This provides a property unique to BrightTor: even if a relay's storage is seized, the contents cannot be attributed to circuit traffic.

In direct relay mode, cells that are forwarded purely in-memory never reach persistent storage and are cleared from process memory immediately after forwarding. Circuit key material is zeroized within 1 second of teardown. A live memory forensics attack could potentially recover in-flight cells from the relay daemon's process memory, but this requires real-time access to the running process — a significantly higher bar than disk seizure. The threat model explicitly scopes this as a host-level side-channel attack (out of scope).

---

## 19. Protocol Versioning

BrightTor includes a versioning mechanism to allow the protocol to evolve without breaking backward compatibility.

- Each relay includes a protocol version number (uint16, starting at 1) in its descriptor
- CREATE cells include the originator's supported version range [min_version, max_version]
- The relay selects the highest mutually supported version and includes it in the CREATED response
- If there is no version overlap, the relay responds with DESTROY + VERSION_MISMATCH
- The consensus document includes a minimum required protocol version; the originator excludes relays below this minimum from circuit selection

---

## 20. Exit Policy Enforcement

Exit nodes maintain an ordered list of ACCEPT and REJECT rules, each specifying an IP address range (CIDR notation) and port range. When a DATA cell with a BEGIN flag arrives, the exit node evaluates the destination against the rules in order, applying the first match.

If the policy rejects the destination, the exit node responds with an END cell containing EXIT_POLICY_REJECTED without establishing a connection. The exit node publishes a summary of its policy in its descriptor (accepted port ranges), allowing originators to pre-filter exit nodes that support the desired destination before circuit construction.

---

## 21. BrightChain Integration

A key design goal of BrightTor is that it requires no architectural remodeling of BrightChain's existing infrastructure. All integration points are additive extensions to existing interfaces. The gossip service, pooled block store, OFFS tuple mechanism, discovery protocol, peer provider, ECIES encryption, member identity, and node resource tracking all accommodate BrightTor without modification to their current contracts.

### Integration Points

| BrightChain Component | BrightTor Usage | Integration Mechanism |
|----------------------|-----------------|----------------------|
| Gossip service (`BlockAnnouncement`) | Cell block distribution, descriptor/consensus propagation | Additive type union: 3 new announcement types added to existing `type` discriminator |
| Pooled block store (`IPooledBlockStore`) | Dedicated "brighttor" pool for all circuit data | Pool creation via existing `putInPool('brighttor', ...)` — no schema changes |
| Block tuple (`InMemoryBlockTuple`) | Cell whitening for plausible deniability | Existing 3-block XOR mechanism (TUPLE.SIZE = 3) already handles 512-byte cells |
| Discovery protocol (`IDiscoveryProtocol`) | Block location with Bloom filter pre-checks | Existing pool-scoped discovery via `discoverBlock(blockId, 'brighttor')` |
| Peer provider (`IPeerProvider`) | All peer-to-peer communication | Existing `sendAnnouncementBatch` with optional `EncryptedBatchPayload` for ECIES-encrypted batches |
| ECIES module | Onion layer encryption/decryption | Direct reuse — no changes required |
| Member identity (BIP39/BIP32) | Node identity with derived keys | Direct reuse — BrightTor derives its Identity_Key at path `m/44'/60'/1'/0/0` |
| Node resources (`NodeResources`) | Bandwidth, uptime, and reliability tracking for relay descriptors | Direct reuse of `bandwidth.up`, `bandwidth.down`, `reliability.uptime`, `reliability.successRate` |
| CBL document storage | Descriptor storage as signed CBLs | Direct reuse — no changes required |

### Gossip Protocol Extensions

BrightChain's `BlockAnnouncement` interface uses a discriminated type union for its `type` field. BrightTor extends this union additively with three new values. The existing announcement types (`add`, `remove`, `ack`, `pool_deleted`, `cbl_index_update`, `cbl_index_delete`, `head_update`, `acl_update`, `pool_announce`, `pool_remove`, `quorum_proposal`, `quorum_vote`) remain unchanged. The three additions are:

- **`tor_descriptor`**: Relay descriptor publication. Carries a signed relay descriptor as the announcement payload. Propagated using the existing high-priority gossip configuration (fanout=7, ttl=7) already defined for priority messages. The peer provider's ECIES-encrypted batch capability is used for descriptor payloads that contain sensitive key material.
- **`tor_consensus`**: Consensus document distribution. Multi-signature verified by receiving nodes before acceptance. Cached locally using the existing gossip batch pipeline.
- **`tor_congestion`**: Network-wide congestion advisory. Updates the local relay capacity cache so the circuit builder can avoid congested relays during path selection.

All BrightTor announcements flow through the existing gossip batch pipeline, respecting the configured `maxBatchSize` (100) and `batchIntervalMs` (1000ms). The `validateBlockAnnouncement` function is extended with validation rules for the three new types, following the same pattern used by existing announcement types (e.g., `quorum_proposal` requires `quorumProposal` metadata, `tor_descriptor` requires `torDescriptor` metadata).

### Pooled Block Store Usage

The pooled block store already supports arbitrary pool creation through its namespace-based isolation mechanism. Pool identifiers follow the pattern `[a-zA-Z0-9_-]{1,64}`, and `brighttor` is a valid pool ID. BrightTor creates this pool on first use via `putInPool('brighttor', cellData)` — no pool registration or schema migration is needed.

Pool-scoped operations used by BrightTor:
- `putInPool('brighttor', ...)` / `getFromPool('brighttor', ...)` for cell block storage and retrieval
- `getRandomBlocksFromPool('brighttor', 2)` for sourcing XOR whitening material within the pool
- `bootstrapPool('brighttor', BlockSize.Message, count)` for seeding the pool with random blocks at startup
- `listBlocksInPool('brighttor', ...)` for tuple component enumeration during reconstruction

Pool isolation ensures that BrightTor's cell blocks, whitening material, and tuple components never cross-contaminate with regular BrightChain storage pools.

### OFFS Tuple Mechanism

The existing `InMemoryBlockTuple` class operates on tuples of exactly 3 blocks (TUPLE.SIZE = 3) and performs byte-level XOR across all blocks. For BrightTor cell whitening:

1. The relay generates 2 cryptographically random 512-byte blocks within the `brighttor` pool
2. An `InMemoryBlockTuple` is constructed from the cell block and the 2 random blocks, with `poolId = 'brighttor'`
3. The tuple's `xor()` method produces the whitened block (CellBlock ⊕ Random₁ ⊕ Random₂)
4. All 3 component block IDs are transmitted; the receiving node reconstructs the original cell by XORing the 3 retrieved blocks

This is the same mechanism used for all OFFS whitening in BrightChain. No modifications to `InMemoryBlockTuple` are required.

### Discovery Protocol Usage

The discovery protocol already supports pool-scoped queries. When a relay needs to locate a cell block's tuple components, it calls `discoverBlock(blockId, 'brighttor')`, which uses pool-scoped Bloom filters (`getPeerPoolScopedBloomFilter`) to pre-check which peers are likely to hold the block before making direct queries. This avoids querying peers that have no BrightTor data.

### Language Considerations

The protocol specification is language-agnostic at the wire and data-model level. The existing BrightChain TypeScript infrastructure (gossip service, pooled block store, discovery protocol, ECIES encryption, member identity) does not need to be rewritten in another language for BrightTor to function. These layers handle storage, distribution, discovery, and identity — operations where TypeScript's performance characteristics are adequate.

The relay cell-forwarding hot path — the component that receives cells, peels an onion layer, and forwards to the next hop with minimal latency — is the performance-critical component that benefits from a systems language implementation (Rust or C) capable of raw socket I/O, kernel-level packet handling, constant-time cryptographic operations, explicit memory management for key zeroization, and low-latency cell forwarding without garbage collection pauses. This relay component communicates with the BrightChain infrastructure through well-defined protocol boundaries (cell serialization format, gossip announcement schema, pool-scoped block storage API) rather than requiring tight coupling to the TypeScript runtime.

---

## 22. Performance Considerations

### Cell Size Trade-offs

The choice of 512 bytes (BlockSize.Message) as the cell size represents a trade-off between overhead and indistinguishability. Smaller cells increase per-byte overhead due to the 16-byte header, but they map directly to BrightChain's smallest standard block size, maximizing the pool of regular traffic that circuit cells blend into. For bulk data transfer, the 496-byte payload per cell yields approximately 96.9% payload efficiency.

### Flow Control Tuning

The default Send_Window of 1000 cells (approximately 496 KB of payload) provides sufficient buffering for interactive applications while limiting the amount of unacknowledged data in flight. The SENDME threshold of 100 cells balances acknowledgment overhead against responsiveness: at full throughput, a SENDME is sent approximately every 49.6 KB of payload consumed.

### Congestion Response

The AIMD congestion control (50% decrease on WARNING, 75% on CRITICAL, +10% additive increase after 10 seconds) is deliberately conservative. In an anonymity network, aggressive retransmission or rate recovery could create traffic patterns that aid timing analysis. The 10-second recovery interval provides a smooth ramp-up that is less distinguishable from normal traffic variation.

### OFFS Tuple Overhead

In steganographic mode, each persisted cell generates approximately 1.1 blocks in the "brighttor" pool (the cell block itself plus amortized shared random block overhead), down from 3x with naive per-cell random block generation. With the default 60-second TTL and self-destructing blocks, the steady-state storage footprint at 1000 steganographic-mode cells/second is approximately 90 MB.

In direct relay mode, cells are forwarded in-memory without persistence under normal conditions. When cells do spill to disk (retransmission buffer overflow, crash recovery, memory pressure), they are whitened at the same ~1.1x amplification rate. The typical relay's persistent storage overhead in direct mode is minimal — dominated by occasional spill events rather than continuous whitening.

The OFFS whitening invariant (no un-whitened cell on persistent storage) is maintained in both modes. The storage overhead difference between modes reflects how often cells reach disk, not whether they are whitened when they do.

The 512 MB circuit buffer memory limit (which triggers admission control rejection) applies to in-memory circuit state (send windows, queues, key material), not to the `brighttor` pool's disk-backed storage. These are separate resource pools with independent limits.

### Gossip Propagation Latency

In steganographic mode, cell blocks are distributed via BrightChain's gossip protocol with its existing batch pipeline (maxBatchSize=100, batchIntervalMs=1000ms). This introduces up to 1 second of batching latency per hop. For a 3-hop circuit, the worst-case gossip-induced latency is approximately 3 seconds per round trip. This is acceptable for store-and-forward messaging, circuit construction handshakes, and hidden service rendezvous.

In direct relay mode, cells bypass the gossip pipeline entirely and are forwarded over persistent TLS connections between relay daemons. Per-hop latency drops to ~1-5ms, giving a 3-hop round-trip of ~3-15ms — comparable to standard Tor performance and suitable for interactive web browsing and bulk file transfer.

### Runtime Architecture and Latency Budget

BrightTor's performance characteristics are determined by a clear separation between two runtime domains operating at fundamentally different timescales:

**Slow path (BrightChain node, TypeScript):** Storage, gossip, discovery, and identity operations. These are I/O-bound — block store reads/writes are key-value lookups with namespace prefixes, gossip propagation is batched network I/O on 1-second intervals, and Bloom filter discovery is bitwise operations on fixed-size arrays. Node.js handles I/O-bound work effectively because libuv delegates to the operating system. The gossip batch interval (1000ms) is the dominant latency factor in this path, not the runtime language. Express is not in the cell-forwarding path at all — it serves the node's management API and peer communication endpoints.

**Fast path (Relay daemon, Rust or C):** Cell reception, onion layer decryption/encryption (AES-256-GCM), circuit table lookup, flow control window management, and cell forwarding. This tight loop must handle thousands of cells per second with sub-millisecond per-cell latency. It requires constant-time cryptographic operations (to prevent timing side channels), explicit memory management (for key zeroization guarantees), and no garbage collection pauses.

The relay daemon communicates with the co-located BrightChain node through a local interface (IPC socket or localhost REST) for two purposes:
1. **Block persistence:** Writing cell blocks and tuple components to the `brighttor` pool via `putInPool` / `getFromPool`
2. **Gossip submission:** Queuing `tor_descriptor`, `tor_consensus`, and `tor_congestion` announcements for batch propagation

This communication is asynchronous and non-blocking from the relay daemon's perspective — the daemon does not wait for block persistence to complete before forwarding a cell. The BrightChain node's storage and gossip operations happen on their own timescale (seconds) without blocking the relay's cell-forwarding timescale (microseconds).

**Latency budget per hop (direct relay mode):**

| Operation | Timescale | Runtime |
|-----------|-----------|---------|
| Cell reception (network read) | ~0.1 ms | Relay daemon (Rust/C) |
| Onion layer decrypt (AES-256-GCM) | ~0.01 ms | Relay daemon (Rust/C) |
| Circuit table lookup | ~0.001 ms | Relay daemon (Rust/C) |
| Flow control window check | ~0.001 ms | Relay daemon (Rust/C) |
| Batched shuffled forwarding delay | 5–15 ms | Relay daemon (Rust/C) |
| Cell forwarding (network write) | ~0.1 ms | Relay daemon (Rust/C) |

**Additional latency in steganographic mode:**

| Operation | Timescale | Runtime |
|-----------|-----------|---------|
| Block persistence (OFFS whitening) | ~1–5 ms | BrightChain node (TypeScript) |
| Gossip batch queue | ~0.1 ms | BrightChain node (TypeScript) |
| Gossip batch flush | up to 1000 ms | BrightChain node (TypeScript) |

In direct mode, the relay daemon's synchronous per-cell budget is approximately 5–15 ms (dominated by the batched shuffled forwarding delay). In steganographic mode, the gossip batch flush adds up to 1000 ms per hop. Block persistence happens asynchronously and does not block forwarding in either mode.

### Deployment Topology

A BrightTor-participating node runs the following server processes:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Physical Host                             │
│                                                                  │
│  ┌──────────────────────────────────┐                            │
│  │   BrightChain Node (TypeScript)  │                            │
│  │   ─────────────────────────────  │                            │
│  │   • Pooled block store           │                            │
│  │   • Gossip service               │                            │
│  │   • Discovery protocol           │                            │
│  │   • Member identity / keys       │                            │
│  │   • Node resource tracking       │                            │
│  │   • Management API (Express)     │                            │
│  └──────────────┬───────────────────┘                            │
│                 │ local IPC / localhost REST                      │
│  ┌──────────────┴───────────────────┐                            │
│  │   Relay Daemon (Rust or C)       │                            │
│  │   ─────────────────────────────  │                            │
│  │   • Cell reception / forwarding  │                            │
│  │   • Onion encrypt / decrypt      │                            │
│  │   • Circuit state management     │                            │
│  │   • Admission control            │                            │
│  │   • Flow control (SENDME)        │                            │
│  │   • Congestion signaling         │                            │
│  │   • Traffic classification       │                            │
│  └──────────────────────────────────┘                            │
│                                                                  │
│  ┌──────────────────────────────────┐  (directory authority       │
│  │   Directory Authority (optional) │   nodes only)               │
│  │   ─────────────────────────────  │                            │
│  │   • Descriptor validation        │                            │
│  │   • Consensus document assembly  │                            │
│  │   • Multi-signature coordination │                            │
│  │   • Relay liveness tracking      │                            │
│  │   • Flag computation             │                            │
│  └──────────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

**BrightChain Node** (existing, TypeScript): Already deployed. Requires only additive changes — 3 new gossip announcement types in the `BlockAnnouncement` type union and usage of the `brighttor` pool. No new server process, no architectural changes.

**Relay Daemon** (new, Rust or C): The only new server that every BrightTor-participating node must run. Handles all performance-critical cell forwarding. Communicates with the co-located BrightChain node for block persistence and gossip submission. This is the primary implementation effort.

**Directory Authority Server** (new, language-flexible): Only runs on designated authority nodes (a small, fixed set). Produces signed consensus documents on a 60-minute cycle. Not latency-sensitive — could be implemented in TypeScript, Rust, or any language with access to the signing keys and the BrightChain node's gossip service. A lightweight process with minimal resource requirements.

**Hidden Service Support**: Not a separate server. Hidden service logic (introduction point management, ESTABLISH_INTRO/RENDEZVOUS cell handling) is implemented as a module within the relay daemon, activated when a node opts in to hosting hidden services.

### Configuration Defaults Summary

| Parameter | Default | Rationale |
|-----------|---------|-----------|
| Cell size | 512 bytes | Matches BlockSize.Message for indistinguishability |
| Circuit hops | 3 | Standard anonymity/performance trade-off |
| Default transport mode | Direct | Latency-sensitive by default; steganographic for handshakes |
| Send window | 1000 cells (~496 KB) | Sufficient for interactive use |
| SENDME threshold | 100 cells | Balance between overhead and responsiveness |
| SENDME timeout | 60 seconds | Detect stalled circuits |
| Relay idle timeout | 300 seconds | Free resources from abandoned circuits |
| Originator idle timeout | 600 seconds | Proactive cleanup |
| Keepalive interval | 120 seconds | Prevent relay-side idle timeout |
| Max circuits per node | 5000 | Resource protection |
| Bandwidth overcommit | 90% | Leave headroom for bursts |
| Congestion WARNING | 70% queue depth | Early warning |
| Congestion CRITICAL | 90% queue depth | Urgent back-pressure |
| Onion key rotation | 7 days | Forward secrecy |
| Onion key grace period | 24 hours | Descriptor propagation delay |
| Consensus interval | 60 minutes | Freshness vs. overhead |
| Guard set size | 3 nodes | Limit guard-level exposure |
| Guard rotation | 30 days | Stability vs. diversity |
| Cover traffic | 1 cell / 10 seconds | Baseline traffic on idle circuits |
| Cover pool activity | 1 op / 30 seconds | Ensure brighttor pool exists on all nodes |
| CREATE rate limit | 10/sec per predecessor | DoS protection |
| Tuple retention TTL | 60 seconds | Retransmission window |
| Batched forwarding delay | 5–15 ms uniform | Timing decorrelation via shuffled batches |
| Circuit buffer memory limit | 512 MB | Memory protection (in-memory circuit state) |
| Shared random pool refresh | 1 hour | Limit statistical analysis window |
| Block TTL sweep interval | 10 seconds | Self-destructing block cleanup |
| Initial credit grant | 100 credits | Bootstrap allowance for new nodes |
| Minimum credit threshold | 10 credits | Minimum balance to build circuits |
| Minimum relay count | 20 | Network bootstrap threshold |

---

## 23. Correctness Properties

BrightTor defines 40 formal correctness properties that serve as the bridge between the protocol specification and machine-verifiable guarantees. Each property is a universal statement about system behavior that must hold across all valid inputs. These properties are designed to be validated through property-based testing (PBT) using randomized input generation, in any language that supports a PBT framework.

Selected properties are summarized below (the full set is maintained in the design specification):

**Cell Layer:**
1. Cell serialization round-trip: serialize then deserialize produces an equivalent cell
2. Serialized cell size invariant: output is always exactly 512 bytes
3. Cell diagnostic completeness: diagnostic string contains all header fields

**Encryption Layer:**
4. Onion encryption round-trip: N layers of encryption followed by N layers of decryption recovers the original plaintext
5. Reverse-path round-trip: exit encrypts, relays add layers, originator peels all layers to recover the response
6. Ephemeral key uniqueness: each onion layer uses a distinct ephemeral key pair

**Circuit Layer:**
7. Relay selection subnet diversity: no two relays in a circuit share a /16 subnet
8. Hop-scoped CircuitId uniqueness: all CircuitIds across hops are distinct

**Flow Control:**
11. Send window management: window = 1000 − K after K transmissions; blocked at 0
12. SENDME trigger threshold: SENDME sent after every 100 cells consumed
13. Authenticated SENDME digest: SHA3-256 of last cell received, verifiable by sender

**Congestion:**
14. Severity thresholds: WARNING at >70%, CRITICAL at >90%
15. Rate adjustment: 50% decrease on WARNING, 75% on CRITICAL, +10% additive increase

**Storage:**
20. OFFS tuple round-trip: whitening then reconstruction recovers original cell data
21. Pool isolation: all tuple components reside exclusively in "brighttor" pool
22. Whitened block indistinguishability: byte distribution indistinguishable from uniform random

**Hidden Services:**
26. Address derivation determinism: same key always produces same .brighttor address
27. Rendezvous cookie matching: matching cookie splices circuits; non-matching rejected

**Key Management:**
28. Identity key determinism: same BIP39 mnemonic always produces same key pair
29. Onion key grace period: both current and previous keys accepted within 24 hours of rotation
30. Per-circuit key determinism: same DH shared secret always produces same derived keys

---

## 24. Related Work

BrightTor builds on a substantial body of work in anonymous communication systems. This section positions BrightTor relative to existing approaches.

**Tor** (Dingledine, Mathewson, Syverson, 2004) is the most widely deployed anonymity network, providing onion-routed circuits with telescoping handshakes, directory authorities, and hidden services. BrightTor adopts Tor's circuit construction model, SENDME flow control, and directory authority structure. The key difference is that Tor operates as standalone infrastructure — Tor traffic is distinguishable from non-Tor traffic at the network level. BrightTor embeds circuit traffic into an existing storage network, achieving structural indistinguishability in steganographic mode. BrightTor's dual-mode transport provides Tor-comparable latency in direct mode while offering a steganographic mode that Tor lacks entirely.

**I2P** (Invisible Internet Project) uses garlic routing (bundling multiple messages into a single encrypted payload) and unidirectional tunnels rather than bidirectional circuits. I2P is designed primarily for internal services rather than exit traffic to the clearnet. BrightTor supports both internal hidden services and exit traffic, and its OFFS tuple integration provides relay-level plausible deniability that I2P does not offer.

**Nym** (Diaz, Halpin, 2021) uses a mixnet architecture with Sphinx packet format and Poisson mixing to provide strong timing decorrelation at the cost of higher latency. Nym's approach to timing resistance is more rigorous than BrightTor's batched shuffled forwarding, but Nym requires a separate staking token economy and does not integrate with an existing storage network. BrightTor's steganographic mode provides a different trade-off: weaker timing guarantees but structural indistinguishability at the storage layer.

**HORNET** (Chen et al., 2015) achieves high-speed onion routing by moving per-packet cryptographic state into the packet headers themselves, allowing relays to be stateless for data forwarding. This enables line-rate forwarding but sacrifices the ability to do per-circuit flow control and congestion signaling. BrightTor maintains per-circuit state (necessary for SENDME flow control and admission control) but offloads the performance-critical forwarding to a systems-language relay daemon.

**Loopix** (Piotrowska et al., 2017) is a mix-based architecture that uses Poisson mixing, cover traffic, and loop traffic to provide strong sender-receiver unlinkability. Loopix provides stronger anonymity guarantees than BrightTor against traffic analysis but at significantly higher latency (seconds to minutes). BrightTor's direct relay mode provides sub-15ms round-trip latency, making it suitable for interactive applications that Loopix cannot support.

**Unique contributions of BrightTor:**
- Structural indistinguishability: circuit traffic is stored using the same OFFS tuple mechanism as regular data, making it indistinguishable at the storage layer (no other system provides this)
- Relay-level plausible deniability: relay operators cannot determine whether blocks in their storage contain circuit traffic
- Dual-mode transport: steganographic mode for maximum indistinguishability, direct mode for Tor-comparable latency
- Zero-infrastructure bootstrap: BrightTor reuses BrightChain's existing gossip, storage, discovery, and identity systems rather than building parallel infrastructure
- Bandwidth credit system: incentivizes relay operation without requiring a separate token economy

---

## 25. Future Work

Several areas are identified for future development:

- **Standalone library**: Extract protocol-only types and serialization into a standalone library with no BrightChain dependency, enabling third-party implementations in any language
- **Path selection improvements**: Machine learning-based relay selection incorporating historical performance data
- **Multi-path circuits**: Splitting traffic across multiple circuits for improved throughput and resilience
- **Pluggable transports**: Obfuscation layers that make BrightTor traffic resistant to deep packet inspection
- **Mobile client optimizations**: Reduced circuit construction overhead and battery-aware keepalive scheduling
- **Poisson mixing mode**: An optional third transport mode using Poisson-distributed delays (similar to Loopix) for applications that require stronger timing guarantees than batched shuffled forwarding provides
- **Cross-network bridge relays**: Bridge nodes that connect BrightTor circuits to the Tor network, allowing BrightTor users to access Tor hidden services and vice versa
- **Bandwidth measurement probes**: Active probing by directory authorities to verify advertised bandwidth claims independently of self-reported metrics

---

## 26. Conclusion

BrightTor demonstrates that an anonymity network can be deeply integrated into a decentralized storage system rather than operating as standalone infrastructure. By encapsulating onion-routed traffic as standard BrightChain blocks and leveraging OFFS tuple whitening for relay-level plausible deniability, BrightTor achieves a property not present in existing anonymity networks: circuit traffic is structurally indistinguishable from regular network activity at the storage, transport, and observation layers.

The dual-mode transport architecture resolves the fundamental tension between indistinguishability and usability. Steganographic mode provides maximum indistinguishability for censorship-resistant communication, while direct relay mode delivers Tor-comparable latency for interactive applications. The originator selects the appropriate mode per-circuit, and circuits can switch modes during their lifetime.

The protocol provides the core anonymity guarantees expected of an onion routing system — multi-hop circuits with per-hop encryption, forward secrecy, hidden services, and traffic analysis mitigations — while adding relay-level plausible deniability through XOR-based block whitening, quantitative timing decorrelation through batched shuffled forwarding, and a bandwidth credit system that incentivizes relay operation without requiring a separate token economy.

Lazy whitening, shared random block pools, and self-destructing blocks reduce the storage overhead of OFFS tuple integration from a naive 3x amplification to approximately 1.1x for steganographic traffic and zero for direct-mode traffic. Cover pool activity on all BrightChain nodes ensures that the `brighttor` pool's existence is not a signal of relay participation, preserving the anonymity set at network scale.

BrightTor's 40 formal correctness properties provide a rigorous foundation for implementation verification through property-based testing, ensuring that the protocol's guarantees are not merely specified but are continuously validated against randomized inputs.

BrightTor integrates with BrightChain's existing infrastructure through purely additive extensions — three new gossip announcement types, a dedicated storage pool, and reuse of the OFFS tuple, discovery, ECIES, identity, and resource tracking systems — requiring no architectural remodeling of the existing codebase. This positions BrightTor as a natural evolution of the BrightChain ecosystem toward a fully anonymized internet layer, with the relay cell-forwarding hot path as the only component that warrants a systems language implementation for performance-critical packet handling.

---

*This document is a living specification. Protocol parameters, security mitigations, and architectural decisions may evolve as implementation experience and security analysis provide new insights.*
