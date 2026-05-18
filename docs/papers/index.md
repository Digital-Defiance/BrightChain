---
title: "Papers"
nav_order: 17
has_children: true
---
# BrightChain Papers

The BrightChain project is documented through a series of companion papers, each covering a specific aspect of the platform. The main platform paper provides the architectural overview; companion papers provide detailed specifications for individual subsystems and applications.

## Platform

- [BrightChain](brightchain) — The main platform paper describing the unified architecture: TUPLE storage, ECIES cryptographic backbone, ECDH-to-Paillier key bridge, Brokered Anonymity, gossip protocol, governance, and the application ecosystem.

## Cryptographic Foundations

- [ECDH-to-Paillier Bridge](paillier-bridge) — Detailed algorithmic specification of the deterministic key bridge construction, including byte-level DRBG state, reproducible test vectors, and extended security analysis.
- [ECIES-Lib](ecies-lib) — The Elliptic Curve Integrated Encryption Scheme library that serves as the cryptographic foundation for the entire platform.
- [BrightChain Crypto Sessions](brightchain-crypto-sessions) — Server-side key custody for end-to-end encrypted suites: sliding-TTL `CryptoSessionStore` and the `useSessionEstablish` / `useSessionUnlock` middlewares that let users authenticate once per session instead of once per request.

## Applications

- [Digital Burnbag](digital-burnbag-vault) — Cryptographic vaults with provable destruction and non-access verification for whistleblower protection, journalist source protection, and secure data disposal.
- [BrightChart Practice Records Portability Standard](brightchart-open-standard) — A FHIR R4-based open standard for full-fidelity EMR data portability across medical, dental, and veterinary practices.
- [BrightPass](brightpass) — A decentralized password manager with VCBL (Vault Constituent Block List) architecture on privacy-preserving block storage.
- [BrightDB](brightdb) — A MongoDB-compatible document database over content-addressable block storage.
- [BSH](bsh) - BrightShell is the essential bridge between the theoretical papers of the Bright Spacetime Standard and the practical reality of daily engineering. It transforms BrightDate from an abstract specification into a living, breathing toolset.

## Networking

- [BrightTor](BrightTor-Whitepaper) — An anonymized overlay network protocol that layers Tor-like onion routing on top of BrightChain's block storage and gossip infrastructure.

## Science/Core

The goal of these three standards is to eliminate the mathematical "debt" of legacy time and geographic systems by replacing them with a unified, high-performance framework based on the speed of light. By synchronizing space and time into a single decimal-SI scale, they enable distributed systems to calculate location, distance, and network latency with unprecedented speed and precision.

- [BrightDate](brightdate-specification) - BrightDate is the temporal foundation that replaces fragmented calendars with a single, decimal count of days since the J2000 epoch, providing a perfectly smooth timeline for distributed systems.
- [Bright Space Standard](bright-space-standard) - BrightSpace uses those decimal units to create a fixed, 3D coordinate grid anchored to the center of the Earth, eliminating the complex math and "polar errors" found in traditional latitude and longitude.
- [Bright Spacetime Standard](bright-spacetime-standard) - Bright Spacetime is the overarching mathematical framework that unifies the two, setting the speed of light to 1 so that distance and time are measured with the exact same ruler.

---

{% assign pages = site.pages | where_exp: "page", "page.parent == 'Papers'" | sort: "nav_order" %}
{% for page in pages %}
- [{{ page.title }}]({{ page.url | relative_url }})
{% endfor %}
