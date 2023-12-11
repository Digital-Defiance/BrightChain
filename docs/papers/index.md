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

## Applications

- [Digital Burnbag](digital-burnbag-vault) — Cryptographic vaults with provable destruction and non-access verification for whistleblower protection, journalist source protection, and secure data disposal.
- [BrightChart Practice Records Portability Standard](brightchart-open-standard) — A FHIR R4-based open standard for full-fidelity EMR data portability across medical, dental, and veterinary practices.
- [BrightPass](brightpass) — A decentralized password manager with VCBL (Vault Constituent Block List) architecture on privacy-preserving block storage.
- [BrightDB](brightdb) — A MongoDB-compatible document database over content-addressable block storage.

## Networking

- [BrightTor](BrightTor-Whitepaper) — An anonymized overlay network protocol that layers Tor-like onion routing on top of BrightChain's block storage and gossip infrastructure.

---

{% assign pages = site.pages | where_exp: "page", "page.parent == 'Papers'" | sort: "nav_order" %}
{% for page in pages %}
- [{{ page.title }}]({{ page.url | relative_url }})
{% endfor %}
