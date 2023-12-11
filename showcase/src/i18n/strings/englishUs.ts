import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import { ShowcaseStringKey, ShowcaseStrings } from '../showcaseStrings';

export const ShowcaseAmericanEnglishStrings: ComponentStrings<ShowcaseStringKey> =
  {
    // Navigation
    [ShowcaseStrings.Nav_Home]: 'Home',
    [ShowcaseStrings.Nav_SoupDemo]: 'Soup Demo',
    [ShowcaseStrings.Nav_Ledger]: 'Ledger',
    [ShowcaseStrings.Nav_Blog]: 'Blog',
    [ShowcaseStrings.Nav_FAQ]: 'FAQ',
    [ShowcaseStrings.Nav_Docs]: 'Docs',
    [ShowcaseStrings.Nav_Home_Description]: 'Main showcase page',
    [ShowcaseStrings.Nav_SoupDemo_Description]:
      'Interactive block soup visualization',
    [ShowcaseStrings.Nav_Ledger_Description]:
      'Blockchain ledger with governance',
    [ShowcaseStrings.Nav_Blog_Description]: 'BrightChain blog and updates',
    [ShowcaseStrings.Nav_FAQ_Description]: 'Frequently asked questions',
    [ShowcaseStrings.Nav_Docs_Description]: 'Project documentation',
    [ShowcaseStrings.Nav_ToggleMenu]: 'Toggle menu',
    [ShowcaseStrings.FAQ_TopSecret_Logo_Alt]: 'Top Secret dApp',
    [ShowcaseStrings.FAQ_BrightChat_Logo_Alt]: 'BrightChat Logo',
    [ShowcaseStrings.FAQ_BrightCal_Logo_Alt]: 'BrightCal Logo',
    [ShowcaseStrings.FAQ_BrightID_Logo_Alt]: 'BrightID Logo',
    [ShowcaseStrings.FAQ_BrightHub_Logo_Alt]: 'BrightHub Logo',
    [ShowcaseStrings.FAQ_BrightMail_Logo_Alt]: 'BrightMail Logo',
    [ShowcaseStrings.FAQ_BrightPass_Logo_Alt]: 'BrightPass Logo',
    [ShowcaseStrings.FAQ_CanaryProtocol_Logo_Alt]: 'Canary Protocol Logo',
    [ShowcaseStrings.FAQ_DigitalBurnbag_Logo_Alt]: 'Digital Burnbag Logo',

    // Language Selector
    [ShowcaseStrings.Lang_Select]: 'Language',
    [ShowcaseStrings.Lang_EN_US]: 'English (US)',
    [ShowcaseStrings.Lang_EN_GB]: 'English (UK)',
    [ShowcaseStrings.Lang_ES]: 'Español',
    [ShowcaseStrings.Lang_FR]: 'Français',
    [ShowcaseStrings.Lang_DE]: 'Deutsch',
    [ShowcaseStrings.Lang_ZH_CN]: '中文',
    [ShowcaseStrings.Lang_JA]: '日本語',
    [ShowcaseStrings.Lang_UK]: 'Українська',

    // FAQ Page
    [ShowcaseStrings.FAQ_ModeAriaLabel]: 'FAQ mode',
    [ShowcaseStrings.FAQ_Gild_Character]: 'Gild Character',
    [ShowcaseStrings.FAQ_Phix_Character]: 'Phix Character',
    [ShowcaseStrings.FAQ_SwitchToModeTemplate]: 'Switch to {MODE} FAQ',
    [ShowcaseStrings.FAQ_Title_Technical]: 'BrightChain FAQ',
    [ShowcaseStrings.FAQ_Title_Ecosystem]: 'The BrightChain Universe',
    [ShowcaseStrings.FAQ_Subtitle_Technical]:
      'The Evolutionary Successor to the Owner-Free FileSystem',
    [ShowcaseStrings.FAQ_Subtitle_Ecosystem]:
      'Meet the Mascots, the Mission, and the Ecosystem',
    [ShowcaseStrings.FAQ_Toggle_Technical]: 'Technical',
    [ShowcaseStrings.FAQ_Toggle_Ecosystem]: 'Ecosystem',
    [ShowcaseStrings.FAQ_Toggle_Technical_Sublabel]: 'Gild guards the details',
    [ShowcaseStrings.FAQ_Toggle_Ecosystem_Sublabel]: 'Phix reveals the vision',
    [ShowcaseStrings.FAQ_BackToHome]: '← Back to Home',

    // FAQ Technical Questions
    [ShowcaseStrings.FAQ_Tech_Q1_Title]: '1. What is BrightChain?',
    [ShowcaseStrings.FAQ_Tech_Q1_Answer]:
      'BrightChain is a decentralized, high-performance "Owner-Free" data infrastructure. It is the architectural successor to the Owner-Free File System (OFFSystem), modernized for 2026 hardware environments including Apple Silicon and NVMe storage.',

    [ShowcaseStrings.FAQ_Tech_Q2_Title]:
      '2. How does BrightChain differ from the original OFFSystem?',
    [ShowcaseStrings.FAQ_Tech_Q2_Intro]:
      'BrightChain honors the "Owner-Free" philosophy of its predecessor while introducing critical modernizations:',
    [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy_Label]: 'Opt-in Redundancy',
    [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy]:
      'Users may request their blocks be stored with higher durability utilizing Reed-Solomon encoding.',
    [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance_Label]:
      'Recovery Performance',
    [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance]:
      'Utilizing @digitaldefiance/node-rs-accelerate, the system leverages GPU/NPU hardware to perform Reed-Solomon recovery operations at speeds up to 30+ GB/s.',
    [ShowcaseStrings.FAQ_Tech_Q2_Scalability_Label]: 'Scalability',
    [ShowcaseStrings.FAQ_Tech_Q2_Scalability]:
      'Through Super CBLs (Constituent Block Lists), the system uses recursive indexing to support effectively unlimited file sizes with O(log N) retrieval efficiency.',
    [ShowcaseStrings.FAQ_Tech_Q2_Identity_Label]: 'Identity',
    [ShowcaseStrings.FAQ_Tech_Q2_Identity]:
      'Integration of BIP39/32 allows for secure, mnemonic-based identity and hierarchical deterministic key management.',
    [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption_Label]: 'Opt-in Encryption',
    [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption]:
      'Users can optionally layer ECIES encryption on top of their data, making use of the Ethereum keyspace/identity HDKey system.',

    [ShowcaseStrings.FAQ_Tech_Q3_Title]: '3. How is data "Owner-Free"?',
    [ShowcaseStrings.FAQ_Tech_Q3_Intro]:
      'BrightChain uses a multi-layered cryptographic approach to ensure no single node "hosts" a file in a legal or practical sense:',
    [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline_Label]: 'The XOR Baseline',
    [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline]:
      'Every block is processed through simple XOR operations, making raw data at rest indistinguishable from random noise.',
    [ShowcaseStrings.FAQ_Tech_Q3_Recipe_Label]: 'The Recipe',
    [ShowcaseStrings.FAQ_Tech_Q3_Recipe]:
      'To reconstruct a file, a user needs the Recipe — the specific spatial map of block order.',
    [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption_Label]: 'Opt-in Encryption',
    [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption]:
      'Users can optionally layer ECIES encryption on top of their data. Without the Recipe, the data remains disordered and, if opted-in, cryptographically locked.',

    [ShowcaseStrings.FAQ_Tech_Q4_Title]:
      '4. What is the "Tuple-Tradeoff", and what does it provide?',
    [ShowcaseStrings.FAQ_Tech_Q4_Intro]:
      'The "Tuple-Tradeoff" is the deliberate balance between the overhead of "Owner-Free" sharding and the unparalleled legal and economic benefits it provides to the network.',
    [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantage]:
      'The Legal Advantage: Plausible Deniability',
    [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantageText]:
      'By sharding data into nearly random tuples (blocks) through XOR mixing, users who contribute storage are hosting data that is mathematically indistinguishable from noise.',
    [ShowcaseStrings.FAQ_Tech_Q4_LegalResult]:
      'The Result: Because a single node cannot reconstruct a coherent file without the "Recipe," it is technically and legally impossible to claim that a specific node operator is "hosting" or "distributing" any specific content. This provides the ultimate layer of Plausible Deniability for participants.',
    [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantage]:
      'The Economic Advantage: Efficiency vs. Proof-of-Work',
    [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantageText]:
      'While "Owner-Free" sharding does introduce a minor storage overhead, it is negligible when compared to the massive energy and hardware costs of traditional Proof-of-Work (PoW) or Proof-of-Stake (PoS) networks.',
    [ShowcaseStrings.FAQ_Tech_Q4_EconomicResult]:
      'The Result: BrightChain achieves high-performance data integrity without burning "Joules" on wasteful hashing competitions. This makes the network highly competitive, offering low-latency performance at a fraction of the cost of legacy blockchains.',
    [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummary]: 'The Trade-off Summary:',
    [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummaryText]:
      'Users accept a slight increase in data "shards" in exchange for a zero-liability hosting environment and an ultra-low-cost infrastructure. This makes BrightChain the most viable platform for decentralized storage in highly regulated or resource-constrained environments.',

    [ShowcaseStrings.FAQ_Tech_Q5_Title]:
      '5. How does BrightChain differ from traditional blockchains?',
    [ShowcaseStrings.FAQ_Tech_Q5_Answer]:
      'Technically, BrightChain is a decentralized block-store rather than a single, monolithic blockchain. While traditional blockchains are the ledger, BrightChain provides the underlying infrastructure to host and support multiple hybrid Merkle tree ledgers simultaneously. We use block-chaining as a structural method to reconstruct files, but the system is designed to be a high-performance foundation that can power many different blockchains and dApps on top of a unified, "Owner-Free" storage layer.',

    [ShowcaseStrings.FAQ_Tech_Q6_Title]:
      '6. What is the role of Reed-Solomon (RS) in BrightChain?',
    [ShowcaseStrings.FAQ_Tech_Q6_Intro]:
      'While XOR handles the privacy and "Owner-Free" status of the data, Reed-Solomon Erasure Coding is an opt-in layer for Recoverability.',
    [ShowcaseStrings.FAQ_Tech_Q6_Redundancy_Label]: 'Redundancy',
    [ShowcaseStrings.FAQ_Tech_Q6_Redundancy]:
      'RS allows a file to be reconstructed even if multiple hosting nodes go offline.',
    [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff_Label]: 'The Trade-off',
    [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff]:
      'RS adds computational overhead and storage requirements compared to simple XOR. Users must choose their level of redundancy based on the importance of the data and their available "Joules."',

    [ShowcaseStrings.FAQ_Tech_Q7_Title]: '7. What is a "Joule"?',
    [ShowcaseStrings.FAQ_Tech_Q7_Intro]:
      'A Joule is the unit of account for work and resource consumption within the BrightChain ecosystem.',
    [ShowcaseStrings.FAQ_Tech_Q7_CostBasis_Label]: 'Cost-Basis',
    [ShowcaseStrings.FAQ_Tech_Q7_CostBasis]:
      'Every action — storing data, performing XOR mixing, or encoding Reed-Solomon shards — has a projected cost in Joules.',
    [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement_Label]:
      'Resource Management',
    [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement]:
      'Users must weigh the Joule cost of high-redundancy storage against the value of their data.',

    [ShowcaseStrings.FAQ_Tech_Q8_Title]: '8. How are Joules obtained?',
    [ShowcaseStrings.FAQ_Tech_Q8_Intro]:
      'Joules are earned through a Work-for-Work model. Users obtain Joules by contributing resources back to the network:',
    [ShowcaseStrings.FAQ_Tech_Q8_Storage_Label]: 'Storage',
    [ShowcaseStrings.FAQ_Tech_Q8_Storage]:
      'Hosting encrypted blocks for other peers.',
    [ShowcaseStrings.FAQ_Tech_Q8_Computation_Label]: 'Computation',
    [ShowcaseStrings.FAQ_Tech_Q8_Computation]:
      'Providing CPU/GPU/NPU cycles to perform encoding or recovery tasks for the collective.',
    [ShowcaseStrings.FAQ_Tech_Q8_Conclusion]:
      'This ensures the network remains a self-sustaining energy economy where contribution equals capacity.',

    [ShowcaseStrings.FAQ_Tech_Q9_Title]: '9. How is Anonymity Maintained?',
    [ShowcaseStrings.FAQ_Tech_Q9_Intro]:
      'BrightChain employs Brokered Anonymity.',
    [ShowcaseStrings.FAQ_Tech_Q9_OnChain_Label]: 'On-Chain',
    [ShowcaseStrings.FAQ_Tech_Q9_OnChain]:
      'All actions are anonymous to the general network.',
    [ShowcaseStrings.FAQ_Tech_Q9_BrightTrust_Label]: 'The BrightTrust',
    [ShowcaseStrings.FAQ_Tech_Q9_BrightTrust]:
      'Identity is cryptographically tied to a Governance BrightTrust. This ensures that while a user\'s data and actions are private, the community maintains a "Social Layer" of accountability via Shamir\'s Secret Sharing and Homomorphic Voting.',

    [ShowcaseStrings.FAQ_Tech_Q10_Title]:
      '10. What is BrightDB and how does it work?',
    [ShowcaseStrings.FAQ_Tech_Q10_Intro]:
      'BrightDB is the high-level document-store layer built directly on top of the BrightChain block-store. It provides a structured way to store, query, and manage complex data objects without a central database server.',
    [ShowcaseStrings.FAQ_Tech_Q10_HowItWorks]: 'How it Works',
    [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented_Label]:
      'Document-Oriented Storage',
    [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented]:
      'Similar to NoSQL databases, BrightDB stores data as "Documents" sharded into encrypted blocks and distributed across the network.',
    [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning_Label]:
      'Immutable Versioning',
    [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning]:
      'Every change to a document is recorded as a new entry with a cryptographically verifiable history.',
    [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing_Label]:
      'Decentralized Indexing',
    [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing]:
      'A distributed indexing system allows nodes to find and reconstruct specific documents across the DHT without a central "Master" node.',
    [ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess_Label]:
      'BrightTrust-Based Access',
    [ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess]:
      'Access to specific databases or collections can be governed by a BrightTrust, requiring cryptographic approval from authorized signers.',
    [ShowcaseStrings.FAQ_Tech_Q10_WhyItMatters]: 'Why it Matters',
    [ShowcaseStrings.FAQ_Tech_Q10_WhyItMattersText]:
      'Most dApps struggle because they store "heavy" data on centralized servers. BrightDB keeps data decentralized, owner-free, and high-performance — enabling truly serverless applications that are as fast as traditional web apps but as secure as a blockchain.',

    [ShowcaseStrings.FAQ_Tech_Q11_Title]:
      '11. What dApps launched with BrightChain?',
    [ShowcaseStrings.FAQ_Tech_Q11_Intro]:
      'BrightChain launched with a core suite of "Bright-Apps" designed to replace centralized, data-harvesting services with secure, sovereign alternatives.',
    [ShowcaseStrings.FAQ_BrightDB_Logo_Alt]: 'BrightDB Logo',
    [ShowcaseStrings.FAQ_BrightChart_Logo_Alt]: 'BrightChart Logo',
    [ShowcaseStrings.FAQ_BrightVote_Logo_Alt]: 'BrightVote Logo',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Title]:
      'Patient-Owned Medical Records',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Text]:
      'An electronic health record where the patient holds the keys. BrightChart stores FHIR R4-compliant medical data as encrypted blocks on BrightChain — no central database to breach. Patients grant granular access to providers via BrightTrust delegation, and every access event is recorded in an immutable audit trail. Supports medical, dental, and veterinary practices from a single codebase.',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightCal_Title]:
      'Shared and Personal Calendar Management',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightCal_Text]:
      'A calendar system where the owner holds the keys. BrightCal enables secure, encrypted scheduling with fine-grained access control. Events are stored as encrypted blocks. All calendar data is immutable and recoverable, with support for recurring events, reminders, and integration with traditional calendar systems.',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Title]: 'Sovereign Communication',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Text]:
      'A fully RFC-compliant email system bridging traditional SMTP and decentralized storage. Unlike standard email providers, BrightMail shards every message into the "Owner-Free" block-store with support for end-to-end encrypted "Dark Mode" messaging.',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Title]:
      'Social Network and Sovereign Graph',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept_Label]: 'The Concept',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept]:
      'A decentralized, censorship-resistant social networking platform that mirrors the fluidity of legacy "Feeds" without the central surveillance or algorithmic manipulation.',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference_Label]: 'The Difference',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference]:
      'Every post, "Like," and relationship is stored as an immutable, sharded document within BrightDB. Because it leverages the Joule Economy, there are no ads—users contribute a micro-fraction of computation or storage to "boost" their voice or sustain their community\'s history.',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts_Label]:
      'The Power of BrightTrusts',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts]:
      'Moderation isn\'t handled by a corporate "Safety Team." Instead, communities are governed by Governance BrightTrusts. Rules are cryptographically enforced, and community standards are voted on via Homomorphic Voting, ensuring that a group\'s digital space remains truly "Owner-Free" and self-determined.',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Title]: 'Zero-Knowledge Vault',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Text]:
      'A password and identity management system where your vault exists as distributed encrypted blocks. Access is governed by your BIP39 mnemonic, and every credential change is versioned and verifiable via BrightDB.',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Title]: 'Resilient Community',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Text]:
      'A real-time communications platform with persistent channels, voice, and media sharing. Community governance is managed via Quorums, and GPU-accelerated recovery ensures chat history is never lost.',
    [ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Title]:
      'Digital Burnbag / Canary Protocol',
    [ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Text]:
      'A specialized file-sharing and encryption platform designed for high-stakes data. It utilizes "Smart Vaults" that can be programmed to permanently destroy the "Recipe" (the map and keys) or release it to specific parties under verifiable conditions—such as a "Dead Man\'s Switch," a timed release, or a Quorum consensus. It is the ultimate tool for whistleblowers, legal professionals, and anyone requiring guaranteed data expiration.',

    [ShowcaseStrings.FAQ_Tech_Q12_Title]:
      '12. What is Paillier encryption and how does it enable private voting?',
    [ShowcaseStrings.FAQ_Tech_Q12_Answer]:
      'Paillier is a public-key encryption scheme with a special property called additive homomorphism — you can add encrypted values together without ever decrypting them. If you encrypt a "1" for Candidate A and someone else encrypts a "1" for Candidate A, you can multiply those ciphertexts together and the result, when decrypted, is "2." Nobody ever sees an individual ballot. In BrightChain\'s voting system, each vote is encrypted with a Paillier public key, the encrypted ballots are homomorphically aggregated into a single ciphertext per candidate, and only the final tally is decrypted — never any individual vote. For added security, the Paillier private key can be split across multiple guardians using threshold cryptography, so no single party can decrypt the tally alone. This approach works natively for common voting methods like plurality, approval, and scored voting, where tallying is just addition. Methods that require elimination rounds (like ranked-choice) need intermediate decryptions between rounds, and some methods (like quadratic voting) can\'t be done homomorphically at all.',

    [ShowcaseStrings.FAQ_Tech_Q13_Title]:
      '13. What does the Paillier Bridge do?',
    [ShowcaseStrings.FAQ_Tech_Q13_Answer]:
      "The Paillier Bridge is a deterministic key derivation construction that lets you derive Paillier homomorphic encryption keys directly from your existing ECDH (Elliptic Curve Diffie-Hellman) key pair. Instead of managing two separate key pairs — one for identity/authentication (ECC) and one for homomorphic vote encryption (Paillier) — the bridge pipes your ECDH shared secret through HKDF and HMAC-DRBG to deterministically generate the large primes needed for a 3072-bit Paillier key. This means your entire cryptographic identity, including your voting keys, can be recovered from a single 32-byte ECC private key. The bridge is one-way (you can't reverse a Paillier key back to the EC key), fully deterministic (same input always yields the same output), and achieves 128-bit security consistent with NIST recommendations.",
    [ShowcaseStrings.FAQ_Tech_Q13_PaperLink]:
      'See our paper on the topic for more information.',

    [ShowcaseStrings.FAQ_Tech_Q14_Title]:
      "14. Isn't BrightChain just another Decentralized Storage (dWS) like IPFS?",
    [ShowcaseStrings.FAQ_Tech_Q14_Answer]:
      'No. IPFS is a "Public Library" designed for content discovery and persistence. BrightChain is a "Sovereign Vault." While IPFS focuses on finding data via CIDs, BrightChain focuses on Owner-Free Status and High-Speed Recovery. In BrightChain, data is sharded so thoroughly that no single node "owns" or even "knows" what it is hosting.',

    [ShowcaseStrings.FAQ_Tech_Q15_Title]:
      '15. How does the "Performance" differ from IPFS?',
    [ShowcaseStrings.FAQ_Tech_Q15_Answer]:
      'IPFS is "Best-Effort" and often high-latency. BrightChain is built for the Apple Silicon (M4 Max) Era. By using @digitaldefiance/node-rs-accelerate, we achieve 30+ GB/s recovery speeds. We don\'t just "fetch" files; we use hardware-accelerated Reed-Solomon to re-materialize data from shards at bus speeds.',

    [ShowcaseStrings.FAQ_Tech_Q16_Title]:
      '16. What about Privacy in BrightChain vs IPFS?',
    [ShowcaseStrings.FAQ_Tech_Q16_Answer]:
      'IPFS is transparent by default; if you have the hash, you can see the file. BrightChain uses an XOR Baseline. Data is functionally "Shredded" (like the Digital Burnbag logo) before it ever touches the network. Privacy isn\'t a "plugin" — it is the mechanical state of the data.',

    [ShowcaseStrings.FAQ_Tech_Q17_Title]:
      '17. How do the BrightChain and IPFS Economies compare?',
    [ShowcaseStrings.FAQ_Tech_Q17_Answer]:
      'IPFS relies on Filecoin (a heavy, external blockchain) for incentives. BrightChain uses the Joule. It\'s a "Thermal" unit of account that measures actual work (CPU/NPU cycles) and resource consumption. It is built-in, low-overhead, and directly tied to the "Energy" of the network.',

    // FAQ Ecosystem Questions
    [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Title]:
      '🔗 What is BrightChain, really?',
    [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Answer]:
      'BrightChain is infrastructure for a world where your data belongs to you — not to a platform, not to a corporation, not to anyone who happens to run the server. It\'s a decentralized storage layer where every file is sharded, mixed, and scattered across the network so that no single node ever "hosts" your data in any meaningful sense. The result is a system where privacy isn\'t a feature you toggle on — it\'s the default state of the architecture. We call it "Owner-Free" because once your data enters BrightChain, no one owns the pieces. Only you hold the Recipe to put them back together.',

    [ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Title]: 'What is Digital Burnbag?',
    [ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Answer]:
      'In intelligence agencies, a "burn bag" is a container for classified documents marked for destruction — you drop them in, and they\'re incinerated with a verifiable chain of custody. Digital Burnbag brings that concept to data. When you rename, move, or destroy data in BrightChain, the system performs a "phoenix-cycle": it copies the data into its new state, then cryptographically incinerates the old one. Nothing is simply deleted — it is reborn. The old state is provably gone, and the new state is provably intact. This is the product layer of BrightChain, where the mascots Gild and Phix live and work.',

    [ShowcaseStrings.FAQ_Eco_CanaryProtocol_Title]:
      'What is the Canary Protocol?',
    [ShowcaseStrings.FAQ_Eco_CanaryProtocol_Answer]:
      "The name comes from the canary in the coal mine — the early warning system that chirps when something is wrong. The Canary Protocol watches your feeds, your APIs — anything that gives a heartbeat on whether you're alive, whether things are proceeding the way you intend. The second things don't go according to plan and your canary dies (sorry, Gild!), the file or folder is toast — verifiably destroyed. It also works in reverse: log in with a duress code, or set up a rule through a pre-ordained provider, and your data can destruct on those conditions too. It's all about rules and conditions. If things don't go according to plan, Gild gets it. It may also monitor network integrity, but its core purpose is conditional destruction: your data burns when the rules say it should. Our mascot Gild is the living embodiment of this protocol: a golden canary who watches over your data with obsessive vigilance. The existing Burnbag/Canary Protocol logo — a golden canary with a flame tail — is both mascots in one mark. Gild is the golden body; Phix is the flame.",

    [ShowcaseStrings.FAQ_Eco_MeetTheCast]: 'Meet the Cast',

    [ShowcaseStrings.FAQ_Eco_Volta_Title]: 'Volta — The Spark',
    [ShowcaseStrings.FAQ_Eco_Volta_Tagline]: 'The High-Voltage Architect',
    [ShowcaseStrings.FAQ_Eco_Volta_Description]:
      'Named after Alessandro Volta, inventor of the battery, Volta is a living spark — a jagged, neon-blue geometric fox made of pure, crackling electricity. She\'s the Provider: she generates and pushes Joules through the system, eager to power every operation at full blast. Hyperactive, generous with energy, and slightly reckless, Volta thinks conservation is boring. "You want 20 terajoules? Done. What else?" In the UI, she crackles near the Joule-meter, and during heavy operations she glows white-hot, vibrating with the desire to execute. She represents the pure, chaotic potential — the desire to act.',
    [ShowcaseStrings.FAQ_Eco_Volta_Alt]:
      'Volta mascot — a neon-blue geometric fox made of electricity',

    [ShowcaseStrings.FAQ_Eco_Ohm_Title]: 'Ohm — The Anchor',
    [ShowcaseStrings.FAQ_Eco_Ohm_Tagline]: 'The Stoic Monk of Resistance',
    [ShowcaseStrings.FAQ_Eco_Ohm_Description]:
      'Named after Georg Ohm, who defined electrical resistance, Ohm is the brake to Volta\'s accelerator. A heavy, stone-like sloth-turtle with a glowing Omega symbol integrated into his shell, he moves slowly and deliberately. His mantra: "Ohm mani padme ohm." While Volta zaps around like a caffeinated fox, Ohm sits in a deep, grounded lotus position, vibrating at a perfect 60Hz hum, centering the entire system. He\'s calm, skeptical, and armed with dry wit — the accountant who actually reads the receipts. Not opposed to spending, just opposed to waste. When energy levels red-line, he performs a "Resistive Meditation," placing a heavy stone paw on the progress bar and turning the current from blue to a calm, deep amber. He represents grounded wisdom — the discipline to act correctly.',
    [ShowcaseStrings.FAQ_Eco_Ohm_Alt]:
      'Ohm mascot — a stone-like sloth-turtle with a glowing Omega symbol',

    [ShowcaseStrings.FAQ_Eco_Gild_Title]: 'Gild — The Witness',
    [ShowcaseStrings.FAQ_Eco_Gild_Tagline]: 'The Golden Canary Guardian',
    [ShowcaseStrings.FAQ_Eco_Gild_Description]:
      "A vain, golden canary obsessed with his pristine yellow coat. Gild is the guardian — he watches over your data, chirps warnings, and keeps things safe. Think Duolingo owl energy: encouraging, occasionally guilt-trippy, but fundamentally on your side. The catch? Gild lives in a coal mine. Every file operation kicks up Soot, and he gets dirty constantly. Uploading 50 files? He's covered in ash, frantically preening, muttering about his feathers. His soot level is a passive indicator of system activity — idle system means a pristine, smugly grooming Gild; heavy usage means a filthy, fuming canary. He's fastidious, dramatic, and long-suffering. \"I just preened! Now I'm a chimney sweep because you can't spell Documents.\" He is the golden body of the Burnbag/Canary Protocol logo — the logo without the fire.",
    [ShowcaseStrings.FAQ_Eco_Gild_Alt]:
      'Gild mascot — a golden canary guardian',

    [ShowcaseStrings.FAQ_Eco_Phix_Title]: 'Phix — The Rebirth',
    [ShowcaseStrings.FAQ_Eco_Phix_Tagline]: 'The Destroyer-Creator',
    [ShowcaseStrings.FAQ_Eco_Phix_Description]:
      '"Phix" = "fix" + "phoenix." Gild\'s evil twin. Same bird silhouette, but his feathers glow ember-red, his eyes narrow like hot coals, and he grins like he\'s about to enjoy this way too much. Phix is the Enforcer — he consumes Joules to incinerate old data states and rises with the new ones. Where Gild is annoyed by fire, Phix IS fire. He appears during rename operations, canary-triggered cascades — anything where data dies and is reborn. But Phix is also just about plain old destruction. He\'s the pyro standing there with the match whenever you\'re ready to torch something, happy to lend a hand. Delete a file? Phix is grinning. Wipe a folder? He\'s already lit. While he takes gleeful joy in destruction, he still finds pride in creation too — rising from the ashes with something new is his whole thing. Gleeful, chaotic, the arsonist in the fire department who loves his job a little too much. When a user triggers a rename, Gild steps aside and Phix emerges — grinning, glowing, ready to burn. He is the flame of the Burnbag/Canary Protocol logo — the logo without the gold.',
    [ShowcaseStrings.FAQ_Eco_Phix_Alt]:
      "Phix mascot — an ember-red phoenix, Gild's fiery twin",

    [ShowcaseStrings.FAQ_Eco_TheEconomy]: 'The Economy',

    [ShowcaseStrings.FAQ_Eco_Joules_Title]: '⚡ What are Joules?',
    [ShowcaseStrings.FAQ_Eco_Joules_Answer]:
      "Joules are BrightChain's unit of energy — not a speculative cryptocurrency, but a measure of real work and contribution. Visually, they're tiny neon-blue lightning bolt tokens that flow, accumulate, and deplete like coins in a game. Volta generates them, Ohm regulates their flow through his gate, and operations consume them. Every action in BrightChain has a Joule cost — from a near-zero metadata rename to a million-Joule full-cycle re-encryption. Users earn Joules through a Work-for-Work model: contribute storage or computation to the network, and you earn the capacity to use it. The Joule-meter in the UI shows your energy budget, with little sparks visibly flowing from Volta through Ohm's gate into your operations.",

    [ShowcaseStrings.FAQ_Eco_Soot_Title]: '💨 What is Soot?',
    [ShowcaseStrings.FAQ_Eco_Soot_Answer]:
      "Soot is the visible consequence of every operation — the \"carbon footprint\" of your digital actions. It's not a currency you spend; it's a cost you can't avoid. Whenever Phix burns data, he produces Soot — dark particles and smoke clouds that accumulate on Gild's golden feathers. The more you do, the dirtier Gild gets. Light usage leaves a smudge here and there; heavy usage turns him pitch-black and indignant. Soot represents karma in the BrightChain ecosystem: every action leaves a mark, and someone has to wear it. In Ohm's words: \"Volta gives you the energy, Phix turns it into heat, and Gild wears the consequences. I just make sure we don't waste more than we have to.\"",

    [ShowcaseStrings.FAQ_Eco_BigPicture]: 'The Big Picture',

    [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Title]:
      '🌐 How does it all fit together?',
    [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Answer]:
      "The ecosystem is a two-tiered system. At the platform level, BrightChain runs on the tension between Volta (the Spender) and Ohm (the Saver), with Joules flowing between them as the energy currency. At the product level, Digital Burnbag runs on the tension between Phix (the Destroyer-Creator) and Gild (the Guardian), with Soot as the unavoidable consequence. When a burnbag operation fires, all four characters interact: Volta reaches for Joules, Ohm evaluates the cost and reluctantly lets them through, Phix catches the energy and erupts, and Gild gets blasted with the resulting soot. The Canary Protocol is the integrity thread running through everything — Gild's watchful eye ensuring that every transformation is legitimate. The Burnbag/Canary Protocol logo tells the origin story: Gild and Phix are the same bird. One is the body, the other is the fire. The logo is the moment they overlap — the canary that's already burning, the phoenix that hasn't fully emerged yet.",

    [ShowcaseStrings.FAQ_Eco_Beliefs_Title]:
      '🧘 What does BrightChain believe in?',
    [ShowcaseStrings.FAQ_Eco_Beliefs_Answer]:
      "Energy is conserved. Actions have consequences. Data has weight. Every character in the BrightChain ecosystem maps to a deeper principle: Volta is the Spark — pure, chaotic potential and the desire to act. Ohm is the Anchor — grounded wisdom and the discipline to act correctly. Joules are the Flow — the spirit moving between them. Phix is the Rebirth — the transformative fire at the end of the path. Gild is the Witness — the one who suffers the earthly soot of our attachments (and our typos). Soot is the Karma — the visible cost that cannot be avoided. Together they form a closed loop: Volta provides the energy, Ohm ensures it's spent wisely, Phix transforms the state, and Gild carries the weight. Nothing is free. Nothing is wasted. Everything leaves a mark.",

    [ShowcaseStrings.FAQ_Eco_MascotsInAction_Title]:
      '🎨 Where can I see the mascots in action?',
    [ShowcaseStrings.FAQ_Eco_MascotsInAction_Answer]:
      "The mascots are woven throughout the product experience. Gild appears during file browsing, uploading, and sharing — his soot level passively reflecting how much activity is happening. When you trigger a rename or destroy operation, Gild steps aside and Phix emerges with the [ Phix ] button: it smolders dark with a faint amber glow, ignites on hover, catches fire on click, and shows a furnace-style progress bar as ash particles stream from source to destination. Volta and Ohm live in the platform-wide Joule-meter, with Volta crackling near the energy gauge and Ohm stepping in during expensive operations to perform his Resistive Meditation — turning the progress bar from neon-blue to a calm amber. Soot accumulates visibly on Gild's feathers throughout your session. Coming soon: mascot appearances on error pages, loading screens, confirmation dialogs scaled to operation severity, and yes — merch.",

    // Hero Section
    [ShowcaseStrings.Hero_Badge]: '🌟 The Decentralized App Platform',
    [ShowcaseStrings.Hero_Description_P1]:
      'BrightChain revolutionizes data storage using the "Bright Block Soup" concept. Your files are broken into blocks and mixed with random data using XOR operations, making them appear completely random while maintaining perfect security.',
    [ShowcaseStrings.Hero_Description_NotCrypto]: 'Not a cryptocurrency.',
    [ShowcaseStrings.Hero_Description_P2]:
      'No coins, no mining, no proof of work. BrightChain values real contributions of storage and compute, tracked in Joules — a unit tied to real-world energy costs, not market speculation.',
    [ShowcaseStrings.Hero_Highlight]:
      '🔒 Owner-Free Storage • ⚡ Energy Efficient • 🌐 Decentralized • 🎭 Anonymous yet Accountable • 🗳️ Homomorphic Voting • 💾 Storage Over Power',
    [ShowcaseStrings.Hero_CTA_InteractiveDemo]: '🧪 Interactive Demo',
    [ShowcaseStrings.Hero_CTA_SoupDemo]: '🥫 BrightChain Soup Demo',
    [ShowcaseStrings.Hero_CTA_GitHub]: 'View on GitHub',
    [ShowcaseStrings.Hero_CTA_Blog]: 'Blog',

    // Components Section
    [ShowcaseStrings.Comp_Title_Revolutionary]: 'Revolutionary',
    [ShowcaseStrings.Comp_Title_Features]: 'Features',
    [ShowcaseStrings.Comp_Title_Capabilities]: '& Capabilities',
    [ShowcaseStrings.Comp_Subtitle]:
      'The Decentralized App Platform — advanced cryptography, decentralized storage, and democratic governance',
    [ShowcaseStrings.Comp_Intro_Heading]:
      'BrightChain revolutionizes data storage using the "Bright Block Soup" concept — combining advanced cryptography, decentralized storage, and democratic governance.',
    [ShowcaseStrings.Comp_Intro_P1]:
      'Your files are broken into blocks and mixed with random data using XOR operations, making them appear completely random while maintaining perfect security. From homomorphic voting to brokered anonymity, from distributed file storage to brightTrust-based governance, BrightChain offers everything needed for the next generation of decentralized applications.',
    [ShowcaseStrings.Comp_Problem_Title]:
      '❌ The Problems with Traditional Blockchain',
    [ShowcaseStrings.Comp_Problem_1]:
      'Massive energy waste from proof-of-work mining',
    [ShowcaseStrings.Comp_Problem_2]:
      'Wasted storage capacity on billions of devices',
    [ShowcaseStrings.Comp_Problem_3]: 'No privacy-preserving voting mechanisms',
    [ShowcaseStrings.Comp_Problem_4]:
      'Anonymity without accountability leads to abuse',
    [ShowcaseStrings.Comp_Problem_5]:
      'Expensive on-chain storage limits applications',
    [ShowcaseStrings.Comp_Problem_6]:
      'Node operators face legal liability for stored content',
    [ShowcaseStrings.Comp_Problem_Result]:
      "Blockchain technology that's environmentally destructive, legally risky, and functionally limited.",
    [ShowcaseStrings.Comp_Solution_Title]: '✅ The BrightChain Solution',
    [ShowcaseStrings.Comp_Solution_P1]:
      'BrightChain eliminates mining waste by using proof-of-work only for throttling, not consensus. The Owner-Free File System provides legal immunity by storing only XOR-randomized blocks. Homomorphic voting enables privacy-preserving elections, while brokered anonymity balances privacy with accountability.',
    [ShowcaseStrings.Comp_Solution_P2]:
      "Built on Ethereum's keyspace but engineered without proof-of-work constraints, BrightChain monetizes unused storage on personal devices, creating a sustainable P2P network. The BrightTrust system provides democratic governance with mathematical security guarantees.",
    [ShowcaseStrings.Comp_VP_OwnerFree_Title]: '🔒 Owner-Free Storage',
    [ShowcaseStrings.Comp_VP_OwnerFree_Desc]:
      'Cryptographic randomness removes storage liability — no single block contains identifiable content',
    [ShowcaseStrings.Comp_VP_EnergyEfficient_Title]: '⚡ Energy Efficient',
    [ShowcaseStrings.Comp_VP_EnergyEfficient_Desc]:
      'No wasteful proof-of-work mining — all computation serves useful purposes',
    [ShowcaseStrings.Comp_VP_Decentralized_Title]: '🌐 Decentralized',
    [ShowcaseStrings.Comp_VP_Decentralized_Desc]:
      'Distributed across the network — IPFS-like P2P storage utilizing wasted space on personal devices',
    [ShowcaseStrings.Comp_VP_Anonymous_Title]: '🎭 Anonymous yet Accountable',
    [ShowcaseStrings.Comp_VP_Anonymous_Desc]:
      'Privacy with moderation capabilities — brokered anonymity via BrightTrust consensus',
    [ShowcaseStrings.Comp_VP_Voting_Title]: '🗳️ Homomorphic Voting',
    [ShowcaseStrings.Comp_VP_Voting_Desc]:
      'Privacy-preserving elections with vote tallying that never reveals individual votes',
    [ShowcaseStrings.Comp_VP_BrightTrust_Title]: '🔒 BrightTrust Governance',
    [ShowcaseStrings.Comp_VP_BrightTrust_Desc]:
      'Democratic decision-making with configurable thresholds and mathematical security',
    [ShowcaseStrings.Comp_VP_BrightStack_Title]: '🚀 Build with BrightStack',
    [ShowcaseStrings.Comp_VP_BrightStack_Desc]:
      'BrightChain + Express + React + Node — swap MongoDB for BrightDB, keep everything else',
    [ShowcaseStrings.Comp_ProjectPage]: 'Project Page',

    // Demo Section
    [ShowcaseStrings.Demo_Title_Interactive]: 'Interactive',
    [ShowcaseStrings.Demo_Title_Demo]: 'Demo',
    [ShowcaseStrings.Demo_Subtitle]:
      'Visualizing ECIES encryption capabilities',
    [ShowcaseStrings.Demo_Disclaimer]:
      'Note: This visualization uses @digitaldefiance/ecies-lib (the browser library) for demonstration purposes. @digitaldefiance/node-ecies-lib provides identical functionality with the same API for Node.js server applications. Both libraries are binary-compatible, so data encrypted with one can be decrypted by the other.',
    [ShowcaseStrings.Demo_Alice_Title]: 'Alice (Sender)',
    [ShowcaseStrings.Demo_Alice_PublicKey]: 'Public Key:',
    [ShowcaseStrings.Demo_Alice_MessageLabel]: 'Message to Encrypt:',
    [ShowcaseStrings.Demo_Alice_Placeholder]: 'Enter a secret message...',
    [ShowcaseStrings.Demo_Alice_Encrypting]: 'Encrypting...',
    [ShowcaseStrings.Demo_Alice_EncryptForBob]: 'Encrypt for Bob',
    [ShowcaseStrings.Demo_Bob_Title]: 'Bob (Receiver)',
    [ShowcaseStrings.Demo_Bob_PublicKey]: 'Public Key:',
    [ShowcaseStrings.Demo_Bob_EncryptedPayload]: 'Encrypted Payload:',
    [ShowcaseStrings.Demo_Bob_Decrypting]: 'Decrypting...',
    [ShowcaseStrings.Demo_Bob_DecryptMessage]: 'Decrypt Message',
    [ShowcaseStrings.Demo_Bob_DecryptedMessage]: 'Decrypted Message:',
    [ShowcaseStrings.Demo_Error]: 'Error:',

    // About Section
    [ShowcaseStrings.About_Title_BuiltWith]: 'Built with',
    [ShowcaseStrings.About_Title_By]: 'by Digital Defiance',
    [ShowcaseStrings.About_Subtitle]:
      'Open source innovation in decentralized infrastructure',
    [ShowcaseStrings.About_Vision_Title]: 'Our Vision',
    [ShowcaseStrings.About_Vision_P1]:
      'At Digital Defiance, we believe in empowering individuals and organizations with truly decentralized infrastructure that respects privacy, promotes sustainability, and enables democratic participation.',
    [ShowcaseStrings.About_Vision_P2]:
      'BrightChain revolutionizes data storage using the "Bright Block Soup" concept. Your files are broken into blocks and mixed with random data using XOR operations, making them appear completely random while maintaining perfect security. By eliminating mining waste, monetizing unused storage, and implementing features like homomorphic voting and brokered anonymity, we\'ve created a platform that works for everyone.',
    [ShowcaseStrings.About_Vision_NotCrypto]:
      'Not a Cryptocurrency. When you hear "blockchain," you probably think Bitcoin. BrightChain has no currency, no proof of work, and no mining. Instead of burning energy to mint coins, BrightChain values real contributions of storage and compute. Those contributions are tracked in a unit called the Joule, which is tied to real-world energy costs by formula — not market speculation. You can\'t mine Joules or trade them; they reflect actual resource costs, and we refine that formula over time.',
    [ShowcaseStrings.About_Vision_StorageDensity]:
      "The Storage vs. Power Density Advantage: Every blockchain has waste somewhere. BrightChain cuts down on waste in every way possible, but does have some overhead in the way of its storage mechanism. However, storage is one of the areas that has been the most cost-effective and where we've achieved massive density in recent years, whereas datacenters are struggling to achieve the needed power density for CPU requirements of blockchains and AI. The tradeoff of minimal storage overhead for anonymity and absolution of concern from copyright lawsuits and the like, or hosting inappropriate material, enables everyone to be all in and make the most out of our vast storage resources spread out across the globe.",
    [ShowcaseStrings.About_BrightStack_P1]:
      'BrightStack is the full-stack paradigm for decentralized apps: BrightChain + Express + React + Node. If you know the MERN stack, you already know BrightStack — just swap MongoDB for BrightDB.',
    [ShowcaseStrings.About_BrightStack_P2]:
      'BrightDB is a MongoDB-like document database on the Owner-Free Filesystem with full CRUD, queries, indexes, transactions, and aggregation pipelines. Same patterns you use with MongoDB — collections, find, insert, update — but every document is stored as privacy-preserving whitened blocks.',
    [ShowcaseStrings.About_BrightStack_P3]:
      'BrightPass, BrightMail, and BrightHub were all built on BrightStack, proving that decentralized app development can be as easy as traditional full-stack.',
    [ShowcaseStrings.About_OpenSource]:
      '100% Open Source. BrightChain is fully open source under the MIT License. Build your own dApps on BrightStack and contribute to the decentralized future.',
    [ShowcaseStrings.About_WorkInProgress]:
      'BrightChain is a work in progress. Presently, we aim to leave the build stable on a daily basis, but things can slip through the cracks and BrightChain is not yet mature. We apologize for any inconvenience or instability.',
    [ShowcaseStrings.About_OtherImpl_Title]: 'Other Implementations',
    [ShowcaseStrings.About_OtherImpl_P1]:
      "While this TypeScript/Node.js implementation is the primary and most mature version of BrightChain, a parallel C++ core library with macOS/iOS UI is in development. This native implementation brings BrightChain's privacy and security features to Apple platforms. Both repositories are in early development and not yet ready for production use.",
    [ShowcaseStrings.About_OtherImpl_P1_Before]:
      'While this TypeScript/Node.js implementation is the primary and most mature version of BrightChain, a parallel ',
    [ShowcaseStrings.About_OtherImpl_P1_CppLink]: 'C++ core library',
    [ShowcaseStrings.About_OtherImpl_P1_AppleLink]: 'macOS/iOS UI',
    [ShowcaseStrings.About_OtherImpl_P1_After]:
      " is in development. This native implementation brings BrightChain's privacy and security features to Apple platforms. Both repositories are in early development and not yet ready for production use.",
    [ShowcaseStrings.About_Feature_OwnerFree_Title]: 'Owner-Free Storage',
    [ShowcaseStrings.About_Feature_OwnerFree_Desc]:
      'Cryptographic randomness removes storage liability. No single block contains identifiable content, providing legal immunity for node operators.',
    [ShowcaseStrings.About_Feature_EnergyEfficient_Title]: 'Energy Efficient',
    [ShowcaseStrings.About_Feature_EnergyEfficient_Desc]:
      'No wasteful proof-of-work mining. All computation serves useful purposes — storage, verification, and network operations.',
    [ShowcaseStrings.About_Feature_Anonymous_Title]:
      'Anonymous yet Accountable',
    [ShowcaseStrings.About_Feature_Anonymous_Desc]:
      'Privacy with moderation capabilities. Brokered anonymity balances privacy with accountability via BrightTrust consensus.',
    [ShowcaseStrings.About_CTA_Title]: 'Join the Revolution',
    [ShowcaseStrings.About_CTA_Desc]:
      'Help us build the future of decentralized infrastructure. Contribute to BrightChain, report issues, or star us on GitHub to show your support for sustainable blockchain technology.',
    [ShowcaseStrings.About_CTA_InteractiveDemo]: '🥫 Interactive Demo',
    [ShowcaseStrings.About_CTA_LearnMore]: 'Learn More',
    [ShowcaseStrings.About_CTA_GitHub]: 'Visit BrightChain on GitHub',
    [ShowcaseStrings.About_CTA_Docs]: 'Read the Documentation',
    [ShowcaseStrings.About_Footer_CopyrightTemplate]:
      '© {YEAR} Digital Defiance. Made with ❤️ for the development community.',

    // Voting Demo - Common
    [ShowcaseStrings.Vote_InitializingCrypto]:
      'Initializing cryptographic voting system...',
    [ShowcaseStrings.Vote_DecryptingVotes]: '🔓 Decrypting votes...',
    [ShowcaseStrings.Vote_LoadingDemo]: 'Loading voting demo...',
    [ShowcaseStrings.Vote_RunAnotherElection]: 'Run Another Election',
    [ShowcaseStrings.Vote_StartElection]: '🎯 Start the Election!',
    [ShowcaseStrings.Vote_ComingSoon]: '🚧 {METHOD} Demo',
    [ShowcaseStrings.Vote_ComingSoonDesc]:
      'This voting method is fully implemented in the library.',
    [ShowcaseStrings.Vote_CitizensVotingTemplate]:
      '👥 Citizens Voting ({VOTED}/{TOTAL} have voted)',
    [ShowcaseStrings.Vote_CastVotesTemplate]:
      'Cast Votes ({VOTED}/{TOTAL} voted)',
    [ShowcaseStrings.Vote_VotedTemplate]: '✓ Voted for {CHOICE}',
    [ShowcaseStrings.Vote_ResultsTitle]: '🏆 Results',
    [ShowcaseStrings.Vote_VotesTemplate]: '{COUNT} votes ({PERCENT}%)',
    [ShowcaseStrings.Vote_ApprovalsTemplate]: '{COUNT} approvals ({PERCENT}%)',
    [ShowcaseStrings.Vote_ShowAuditLog]: '🔍 Show Audit Log',
    [ShowcaseStrings.Vote_HideAuditLog]: '🔍 Hide Audit Log',
    [ShowcaseStrings.Vote_ShowEventLog]: '📊 Show Event Log',
    [ShowcaseStrings.Vote_HideEventLog]: '📊 Hide Event Log',
    [ShowcaseStrings.Vote_AuditLogTitle]:
      '🔒 Immutable Audit Log (Requirement 1.1)',
    [ShowcaseStrings.Vote_AuditLogDesc]:
      'Cryptographically signed, hash-chained audit trail',
    [ShowcaseStrings.Vote_ChainIntegrity]: 'Chain Integrity:',
    [ShowcaseStrings.Vote_ChainValid]: '✅ Valid',
    [ShowcaseStrings.Vote_ChainCompromised]: '❌ Compromised',
    [ShowcaseStrings.Vote_EventLogTitle]: '📊 Event Logger (Requirement 1.3)',
    [ShowcaseStrings.Vote_EventLogDesc]:
      'Comprehensive event tracking with microsecond timestamps and sequence numbers',
    [ShowcaseStrings.Vote_SequenceIntegrity]: 'Sequence Integrity:',
    [ShowcaseStrings.Vote_SequenceValid]: '✅ Valid',
    [ShowcaseStrings.Vote_SequenceGaps]: '❌ Gaps Detected',
    [ShowcaseStrings.Vote_TotalEventsTemplate]: 'Total Events: {COUNT}',
    [ShowcaseStrings.Vote_Timestamp]: 'Timestamp:',
    [ShowcaseStrings.Vote_VoterToken]: 'Voter Token:',

    // Voting Demo - Wrapper
    [ShowcaseStrings.Vote_Title]: '🗳️ Government-Grade Voting System',
    [ShowcaseStrings.Vote_TitleDesc]:
      'Explore our comprehensive cryptographic voting library with 15 different voting methods. Each demo shows real-world use cases with homomorphic encryption ensuring vote privacy.',
    [ShowcaseStrings.Vote_BadgeHomomorphic]: '✅ Homomorphic Encryption',
    [ShowcaseStrings.Vote_BadgeReceipts]: '🔐 Verifiable Receipts',
    [ShowcaseStrings.Vote_BadgeRoleSeparation]: '🛡️ Role Separation',
    [ShowcaseStrings.Vote_BadgeTests]: '🧪 900+ Tests',

    // Voting Selector
    [ShowcaseStrings.VoteSel_Title]: 'Select Voting Method',
    [ShowcaseStrings.VoteSel_SecureCategory]:
      '✅ Fully Secure (Single-round, Privacy-preserving)',
    [ShowcaseStrings.VoteSel_MultiRoundCategory]:
      '⚠️ Multi-Round (Requires intermediate decryption)',
    [ShowcaseStrings.VoteSel_InsecureCategory]:
      '❌ Insecure (No privacy - special cases only)',

    // Voting Method Names
    [ShowcaseStrings.VoteMethod_Plurality]: 'Plurality',
    [ShowcaseStrings.VoteMethod_Approval]: 'Approval',
    [ShowcaseStrings.VoteMethod_Weighted]: 'Weighted',
    [ShowcaseStrings.VoteMethod_BordaCount]: 'Borda Count',
    [ShowcaseStrings.VoteMethod_ScoreVoting]: 'Score Voting',
    [ShowcaseStrings.VoteMethod_YesNo]: 'Yes/No',
    [ShowcaseStrings.VoteMethod_YesNoAbstain]: 'Yes/No/Abstain',
    [ShowcaseStrings.VoteMethod_Supermajority]: 'Supermajority',
    [ShowcaseStrings.VoteMethod_RankedChoice]: 'Ranked Choice (IRV)',
    [ShowcaseStrings.VoteMethod_TwoRound]: 'Two-Round',
    [ShowcaseStrings.VoteMethod_STAR]: 'STAR',
    [ShowcaseStrings.VoteMethod_STV]: 'STV',
    [ShowcaseStrings.VoteMethod_Quadratic]: 'Quadratic',
    [ShowcaseStrings.VoteMethod_Consensus]: 'Consensus',
    [ShowcaseStrings.VoteMethod_ConsentBased]: 'Consent-Based',

    // Plurality Demo
    [ShowcaseStrings.Plur_IntroTitle]:
      'Welcome to Riverside City Budget Election!',
    [ShowcaseStrings.Plur_IntroStory]:
      "The city council has allocated $50 million for a major initiative, but they can't decide which project to fund. That's where YOU come in!",
    [ShowcaseStrings.Plur_IntroSituation]:
      'Three proposals are on the ballot. Each has passionate supporters, but only ONE can win.',
    [ShowcaseStrings.Plur_IntroTeamGreen]:
      'Team Green wants solar panels on every public building',
    [ShowcaseStrings.Plur_IntroTransit]:
      'Transit Advocates are pushing for a new subway line',
    [ShowcaseStrings.Plur_IntroHousing]:
      'Housing Coalition demands affordable homes for 500 families',
    [ShowcaseStrings.Plur_IntroChallenge]:
      "You'll cast votes for 5 citizens. Each vote is encrypted - not even the election officials can see individual ballots until the final tally. This is how real democracies should work!",
    [ShowcaseStrings.Plur_DemoTitle]:
      '🗳️ Plurality Voting - Riverside City Budget',
    [ShowcaseStrings.Plur_DemoTagline]:
      '🏛️ One vote per person. Highest votes wins. Democracy in action!',
    [ShowcaseStrings.Plur_CandidatesTitle]: 'City Budget Priorities',
    [ShowcaseStrings.Plur_VoterInstruction]:
      "Click a proposal to cast each citizen's vote. Remember: their choice is encrypted and private!",
    [ShowcaseStrings.Plur_ClosePollsBtn]: '📦 Close Polls & Count Votes!',
    [ShowcaseStrings.Plur_ResultsTitle]: '🎉 The People Have Spoken!',
    [ShowcaseStrings.Plur_ResultsIntro]:
      "After decrypting all votes, here's what Riverside chose:",
    [ShowcaseStrings.Plur_TallyTitle]: '📊 Vote Tally Process',
    [ShowcaseStrings.Plur_TallyExplain]:
      'Each encrypted vote was homomorphically added together, then decrypted to reveal the totals:',
    [ShowcaseStrings.Plur_Cand1_Name]: 'Green Energy Initiative',
    [ShowcaseStrings.Plur_Cand1_Desc]:
      'Invest in renewable energy infrastructure',
    [ShowcaseStrings.Plur_Cand2_Name]: 'Public Transit Expansion',
    [ShowcaseStrings.Plur_Cand2_Desc]: 'Build new subway lines and bus routes',
    [ShowcaseStrings.Plur_Cand3_Name]: 'Affordable Housing Program',
    [ShowcaseStrings.Plur_Cand3_Desc]:
      'Subsidize housing for low-income families',

    // Approval Demo
    [ShowcaseStrings.Appr_IntroTitle]: "TechCorp's Big Decision!",
    [ShowcaseStrings.Appr_IntroStory]:
      '📢 Emergency Team Meeting: "We need to pick our tech stack for the next 5 years, but everyone has different opinions!"',
    [ShowcaseStrings.Appr_IntroApprovalVoting]:
      "The CTO has a brilliant idea: Approval Voting. Instead of fighting over ONE language, everyone can vote for ALL the languages they'd be happy working with.",
    [ShowcaseStrings.Appr_IntroStakes]:
      "🤔 The twist: You can approve as many or as few as you want. Love TypeScript AND Python? Vote for both! Only trust Rust? That's your vote!",
    [ShowcaseStrings.Appr_IntroWinner]:
      "🎯 The winner: Whichever language gets the most approvals becomes the team's primary language.",
    [ShowcaseStrings.Appr_IntroChallenge]:
      'This is how the UN elects its Secretary-General. No vote splitting, no strategic games - just honest preferences!',
    [ShowcaseStrings.Appr_StartBtn]: "🚀 Let's Vote!",
    [ShowcaseStrings.Appr_DemoTitle]:
      '✅ Approval Voting - TechCorp Stack Selection',
    [ShowcaseStrings.Appr_DemoTagline]:
      '👍 Vote for ALL languages you approve. Most approvals wins!',
    [ShowcaseStrings.Appr_CandidatesTitle]:
      "Team's Preferred Programming Languages",
    [ShowcaseStrings.Appr_Cand1_Desc]: 'Type-safe JavaScript superset',
    [ShowcaseStrings.Appr_Cand2_Desc]: 'Versatile scripting language',
    [ShowcaseStrings.Appr_Cand3_Desc]: 'Memory-safe systems language',
    [ShowcaseStrings.Appr_Cand4_Desc]: 'Fast concurrent language',
    [ShowcaseStrings.Appr_Cand5_Desc]: 'Enterprise platform',
    [ShowcaseStrings.Appr_VotersTitle]: 'Cast Votes ({VOTED}/{TOTAL} voted)',
    [ShowcaseStrings.Appr_SubmitBtn]: 'Submit ({COUNT} selected)',
    [ShowcaseStrings.Appr_TallyBtn]: 'Tally Votes & Reveal Results',
    [ShowcaseStrings.Appr_VotedBadge]: '✓ Voted',

    // Borda Demo
    [ShowcaseStrings.Borda_IntroTitle]: 'Olympic Host City Selection!',
    [ShowcaseStrings.Borda_IntroStory]:
      '🌍 IOC Committee Room: Five nations must choose the next Olympic host city. But everyone has preferences!',
    [ShowcaseStrings.Borda_IntroPoints]:
      '🎯 Borda Count gives points based on ranking: 1st place = 3 points, 2nd = 2 points, 3rd = 1 point.',
    [ShowcaseStrings.Borda_IntroChallenge]:
      '💡 This rewards consensus picks over polarizing choices. The city with the most total points wins!',
    [ShowcaseStrings.Borda_StartBtn]: '🏅 Start Voting!',
    [ShowcaseStrings.Borda_DemoTitle]:
      '🏆 Borda Count - Olympic Host Selection',
    [ShowcaseStrings.Borda_DemoTagline]:
      '📊 Rank all cities. Points = consensus!',
    [ShowcaseStrings.Borda_CandidatesTitle]: 'Candidate Cities',
    [ShowcaseStrings.Borda_Cand1_Desc]: 'City of Light',
    [ShowcaseStrings.Borda_Cand2_Desc]: 'Rising Sun',
    [ShowcaseStrings.Borda_Cand3_Desc]: 'City of Angels',
    [ShowcaseStrings.Borda_VotersTitle]: 'IOC Members ({VOTED}/{TOTAL} voted)',
    [ShowcaseStrings.Borda_RankedBadge]: '✓ Ranked!',
    [ShowcaseStrings.Borda_TallyBtn]: '🏅 Count Points!',
    [ShowcaseStrings.Borda_ResultsTitle]: '🎉 Olympic Host Announced!',
    [ShowcaseStrings.Borda_PointsTemplate]: '{COUNT} points',
    [ShowcaseStrings.Borda_NewVoteBtn]: 'New Vote',

    // Message Passing Demo
    [ShowcaseStrings.Msg_Title]: '💬 BrightChain Message Passing Demo',
    [ShowcaseStrings.Msg_Subtitle]:
      'Send messages stored as CBL blocks in the soup!',
    [ShowcaseStrings.Msg_Initializing]: 'Initializing...',
    [ShowcaseStrings.Msg_SendTitle]: 'Send Message',
    [ShowcaseStrings.Msg_FromLabel]: 'From:',
    [ShowcaseStrings.Msg_ToLabel]: 'To:',
    [ShowcaseStrings.Msg_Placeholder]: 'Type your message...',
    [ShowcaseStrings.Msg_SendBtn]: '📤 Send Message',
    [ShowcaseStrings.Msg_ListTitleTemplate]: '📬 Messages ({COUNT})',
    [ShowcaseStrings.Msg_NoMessages]:
      'No messages yet. Send your first message! ✨',
    [ShowcaseStrings.Msg_From]: 'From:',
    [ShowcaseStrings.Msg_To]: 'To:',
    [ShowcaseStrings.Msg_Message]: 'Message:',
    [ShowcaseStrings.Msg_RetrieveBtn]: '📥 Retrieve from Soup',
    [ShowcaseStrings.Msg_SendFailed]: 'Failed to send message:',
    [ShowcaseStrings.Msg_RetrieveFailed]: 'Failed to retrieve message:',
    [ShowcaseStrings.Msg_ContentTemplate]: 'Message content: {CONTENT}',

    // Ledger Demo
    [ShowcaseStrings.Ledger_Title]: '⛓️ Blockchain Ledger',
    [ShowcaseStrings.Ledger_Subtitle]:
      'An append-only, cryptographically chained, digitally signed ledger with role-based governance. Add entries, manage signers, and validate the chain.',
    [ShowcaseStrings.Ledger_Initializing]:
      'Generating SECP256k1 key pairs for signers…',
    [ShowcaseStrings.Ledger_Entries]: 'Entries',
    [ShowcaseStrings.Ledger_ActiveSigners]: 'Active Signers',
    [ShowcaseStrings.Ledger_Admins]: 'Admins',
    [ShowcaseStrings.Ledger_BrightTrust]: 'BrightTrust',
    [ShowcaseStrings.Ledger_ValidateChain]: '🔍 Validate Chain',
    [ShowcaseStrings.Ledger_Reset]: '🔄 Reset',
    [ShowcaseStrings.Ledger_ActiveSigner]: '🔑 Active Signer',
    [ShowcaseStrings.Ledger_AppendEntry]: '📝 Append Entry',
    [ShowcaseStrings.Ledger_PayloadLabel]: 'Payload (text)',
    [ShowcaseStrings.Ledger_PayloadPlaceholder]: 'Enter data…',
    [ShowcaseStrings.Ledger_AppendBtn]: 'Append to Chain',
    [ShowcaseStrings.Ledger_AuthorizedSigners]: '👥 Authorized Signers',
    [ShowcaseStrings.Ledger_Suspend]: 'Suspend',
    [ShowcaseStrings.Ledger_Reactivate]: 'Reactivate',
    [ShowcaseStrings.Ledger_ToAdmin]: '→ Admin',
    [ShowcaseStrings.Ledger_ToWriter]: '→ Writer',
    [ShowcaseStrings.Ledger_Retire]: 'Retire',
    [ShowcaseStrings.Ledger_NewSignerPlaceholder]: 'New signer name',
    [ShowcaseStrings.Ledger_AddSigner]: '+ Add Signer',
    [ShowcaseStrings.Ledger_EventLog]: '📋 Event Log',
    [ShowcaseStrings.Ledger_Chain]: '⛓️ Chain',
    [ShowcaseStrings.Ledger_Genesis]: '🌱 Genesis',
    [ShowcaseStrings.Ledger_Governance]: '⚖️ Governance',
    [ShowcaseStrings.Ledger_Data]: '📄 Data',
    [ShowcaseStrings.Ledger_EntryDetails]: 'Entry #{SEQ} Details',
    [ShowcaseStrings.Ledger_Type]: 'Type',
    [ShowcaseStrings.Ledger_Sequence]: 'Sequence',
    [ShowcaseStrings.Ledger_Timestamp]: 'Timestamp',
    [ShowcaseStrings.Ledger_EntryHash]: 'Entry Hash',
    [ShowcaseStrings.Ledger_PreviousHash]: 'Previous Hash',
    [ShowcaseStrings.Ledger_NullGenesis]: 'null (genesis)',
    [ShowcaseStrings.Ledger_Signer]: 'Signer',
    [ShowcaseStrings.Ledger_SignerKey]: 'Signer Key',
    [ShowcaseStrings.Ledger_Signature]: 'Signature',
    [ShowcaseStrings.Ledger_PayloadSize]: 'Payload Size',
    [ShowcaseStrings.Ledger_Payload]: 'Payload',
    [ShowcaseStrings.Ledger_BytesTemplate]: '{COUNT} bytes',

    // SkipLink
    [ShowcaseStrings.SkipLink_Text]: 'Skip to main content',

    // ScrollIndicator
    [ShowcaseStrings.Scroll_Explore]: 'Scroll to explore',

    // CompatibilityWarning
    [ShowcaseStrings.Compat_Title]: '⚠️ Browser Compatibility Notice',
    [ShowcaseStrings.Compat_DismissAriaLabel]: 'Dismiss warning',
    [ShowcaseStrings.Compat_BrowserNotice]:
      'Your browser ({BROWSER} {VERSION}) may not support all features of this demo.',
    [ShowcaseStrings.Compat_CriticalIssues]: 'Critical Issues:',
    [ShowcaseStrings.Compat_Warnings]: 'Warnings:',
    [ShowcaseStrings.Compat_RecommendedActions]: 'Recommended Actions:',
    [ShowcaseStrings.Compat_Recommendation]:
      'For the best experience, please use the latest version of Chrome, Firefox, Safari, or Edge.',

    // DebugPanel
    [ShowcaseStrings.Debug_Title]: 'Debug Panel',
    [ShowcaseStrings.Debug_OpenTitle]: 'Open Debug Panel',
    [ShowcaseStrings.Debug_CloseTitle]: 'Close Debug Panel',
    [ShowcaseStrings.Debug_BlockStore]: 'Block Store',
    [ShowcaseStrings.Debug_SessionId]: 'Session ID:',
    [ShowcaseStrings.Debug_BlockCount]: 'Block Count:',
    [ShowcaseStrings.Debug_TotalSize]: 'Total Size:',
    [ShowcaseStrings.Debug_LastOperation]: 'Last Operation:',
    [ShowcaseStrings.Debug_BlockIdsTemplate]: 'Block IDs ({COUNT})',
    [ShowcaseStrings.Debug_ClearSession]: 'Clear Session',
    [ShowcaseStrings.Debug_AnimationState]: 'Animation State',
    [ShowcaseStrings.Debug_Playing]: 'Playing',
    [ShowcaseStrings.Debug_Paused]: 'Paused',
    [ShowcaseStrings.Debug_StatusPlaying]: '▶️ Playing',
    [ShowcaseStrings.Debug_StatusPaused]: '⏸️ Paused',
    [ShowcaseStrings.Debug_Speed]: 'Speed:',
    [ShowcaseStrings.Debug_Frame]: 'Frame:',
    [ShowcaseStrings.Debug_Sequence]: 'Sequence:',
    [ShowcaseStrings.Debug_Progress]: 'Progress:',
    [ShowcaseStrings.Debug_Performance]: 'Performance',
    [ShowcaseStrings.Debug_FrameRate]: 'Frame Rate:',
    [ShowcaseStrings.Debug_FrameTime]: 'Frame Time:',
    [ShowcaseStrings.Debug_DroppedFrames]: 'Dropped Frames:',
    [ShowcaseStrings.Debug_Memory]: 'Memory:',
    [ShowcaseStrings.Debug_Sequences]: 'Sequences:',
    [ShowcaseStrings.Debug_Errors]: 'Errors:',

    // ReconstructionAnimation
    [ShowcaseStrings.Recon_Title]: '🔄 File Reconstruction Animation',
    [ShowcaseStrings.Recon_Subtitle]:
      'Watch as blocks are reassembled into your original file',
    [ShowcaseStrings.Recon_Step_ProcessCBL]: 'Processing CBL',
    [ShowcaseStrings.Recon_Step_ProcessCBL_Desc]:
      'Reading Constituent Block List metadata',
    [ShowcaseStrings.Recon_Step_SelectBlocks]: 'Selecting Blocks',
    [ShowcaseStrings.Recon_Step_SelectBlocks_Desc]:
      'Identifying required blocks from soup',
    [ShowcaseStrings.Recon_Step_RetrieveBlocks]: 'Retrieving Blocks',
    [ShowcaseStrings.Recon_Step_RetrieveBlocks_Desc]:
      'Collecting blocks from storage',
    [ShowcaseStrings.Recon_Step_ValidateChecksums]: 'Validating Checksums',
    [ShowcaseStrings.Recon_Step_ValidateChecksums_Desc]:
      'Verifying block integrity',
    [ShowcaseStrings.Recon_Step_Reassemble]: 'Reassembling File',
    [ShowcaseStrings.Recon_Step_Reassemble_Desc]:
      'Combining blocks and removing padding',
    [ShowcaseStrings.Recon_Step_DownloadReady]: 'Download Ready',
    [ShowcaseStrings.Recon_Step_DownloadReady_Desc]:
      'File reconstruction complete',
    [ShowcaseStrings.Recon_CBLTitle]: '📋 Constituent Block List',
    [ShowcaseStrings.Recon_CBLSubtitle]: 'Block references extracted from CBL',
    [ShowcaseStrings.Recon_BlocksTemplate]: '🥫 Blocks ({COUNT})',
    [ShowcaseStrings.Recon_BlocksSubtitle]:
      'Blocks being retrieved and validated',
    [ShowcaseStrings.Recon_ReassemblyTitle]: '🔧 File Reassembly',
    [ShowcaseStrings.Recon_ReassemblySubtitle]:
      'Combining blocks and removing padding',
    [ShowcaseStrings.Recon_Complete]: 'File Reconstruction Complete!',
    [ShowcaseStrings.Recon_ReadyForDownload]: 'Your file is ready for download',
    [ShowcaseStrings.Recon_FileName]: 'File Name:',
    [ShowcaseStrings.Recon_Size]: 'Size:',
    [ShowcaseStrings.Recon_Blocks]: 'Blocks:',
    [ShowcaseStrings.Recon_WhatsHappening]: "What's Happening Now",
    [ShowcaseStrings.Recon_TechDetails]: 'Technical Details:',
    [ShowcaseStrings.Recon_CBLContainsRefs]:
      'CBL contains references to all blocks',
    [ShowcaseStrings.Recon_BlockCountTemplate]: 'Block count: {COUNT}',
    [ShowcaseStrings.Recon_OriginalSizeTemplate]:
      'Original file size: {SIZE} bytes',
    [ShowcaseStrings.Recon_BlockSelection]: 'Block Selection:',
    [ShowcaseStrings.Recon_IdentifyingBlocks]: 'Identifying blocks in the soup',
    [ShowcaseStrings.Recon_SelectedByChecksums]:
      'Blocks are selected by their checksums',
    [ShowcaseStrings.Recon_AllBlocksRequired]:
      'All blocks must be present for reconstruction',
    [ShowcaseStrings.Recon_ChecksumValidation]: 'Checksum Validation:',
    [ShowcaseStrings.Recon_EnsuresNotCorrupted]:
      "Ensures blocks haven't been corrupted",
    [ShowcaseStrings.Recon_ComparesChecksums]:
      'Compares stored checksum with calculated checksum',
    [ShowcaseStrings.Recon_InvalidBlocksFail]:
      'Invalid blocks would cause reconstruction to fail',
    [ShowcaseStrings.Recon_FileReassembly]: 'File Reassembly:',
    [ShowcaseStrings.Recon_CombinedInOrder]:
      'Blocks are combined in correct order',
    [ShowcaseStrings.Recon_PaddingRemoved]: 'Random padding is removed',
    [ShowcaseStrings.Recon_ReconstructedByteForByte]:
      'Original file is reconstructed byte-for-byte',

    // AnimatedBrightChainDemo
    [ShowcaseStrings.Anim_Title]: 'Animated BrightChain Block Soup Demo',
    [ShowcaseStrings.Anim_Subtitle]:
      'Experience the BrightChain process with step-by-step animations and educational content!',
    [ShowcaseStrings.Anim_Initializing]:
      'Initializing Animated BrightChain Demo...',
    [ShowcaseStrings.Anim_PauseAnimation]: 'Pause Animation',
    [ShowcaseStrings.Anim_PlayAnimation]: 'Play Animation',
    [ShowcaseStrings.Anim_ResetAnimation]: 'Reset Animation',
    [ShowcaseStrings.Anim_SpeedTemplate]: 'Speed: {SPEED}x',
    [ShowcaseStrings.Anim_PerfMonitor]: '🔧 Performance Monitor',
    [ShowcaseStrings.Anim_FrameRate]: 'Frame Rate:',
    [ShowcaseStrings.Anim_FrameTime]: 'Frame Time:',
    [ShowcaseStrings.Anim_DroppedFrames]: 'Dropped Frames:',
    [ShowcaseStrings.Anim_Memory]: 'Memory:',
    [ShowcaseStrings.Anim_Sequences]: 'Sequences:',
    [ShowcaseStrings.Anim_Errors]: 'Errors:',
    [ShowcaseStrings.Anim_DropFilesOrClick]:
      'Drop files here or click to upload',
    [ShowcaseStrings.Anim_ChooseFiles]: 'Choose Files',
    [ShowcaseStrings.Anim_StorageTemplate]:
      'Block Soup Storage ({COUNT} files)',
    [ShowcaseStrings.Anim_NoFilesYet]:
      'No files stored yet. Upload some files to see the animated magic! ✨',
    [ShowcaseStrings.Anim_RetrieveFile]: 'Retrieve File',
    [ShowcaseStrings.Anim_DownloadCBL]: 'Download CBL',
    [ShowcaseStrings.Anim_SizeTemplate]:
      'Size: {SIZE} bytes | Blocks: {BLOCKS}',
    [ShowcaseStrings.Anim_EncodingAnimation]: 'Encoding Animation',
    [ShowcaseStrings.Anim_ReconstructionAnimation]: 'Reconstruction Animation',
    [ShowcaseStrings.Anim_CurrentStep]: 'Current Step',
    [ShowcaseStrings.Anim_DurationTemplate]: 'Duration: {DURATION}ms',
    [ShowcaseStrings.Anim_BlockDetails]: 'Block Details',
    [ShowcaseStrings.Anim_Index]: 'Index:',
    [ShowcaseStrings.Anim_Size]: 'Size:',
    [ShowcaseStrings.Anim_Id]: 'ID:',
    [ShowcaseStrings.Anim_Stats]: 'Animation Stats',
    [ShowcaseStrings.Anim_TotalFiles]: 'Total Files:',
    [ShowcaseStrings.Anim_TotalBlocks]: 'Total Blocks:',
    [ShowcaseStrings.Anim_AnimationSpeed]: 'Animation Speed:',
    [ShowcaseStrings.Anim_Session]: 'Session:',
    [ShowcaseStrings.Anim_DataClearsOnRefresh]: '(Data clears on page refresh)',
    [ShowcaseStrings.Anim_WhatsHappening]: "What's happening:",
    [ShowcaseStrings.Anim_Duration]: 'Duration:',

    // BrightChainSoupDemo
    [ShowcaseStrings.Soup_Title]: 'BrightChain Demo',
    [ShowcaseStrings.Soup_Subtitle]:
      'Store files and messages as blocks in the decentralized block soup. Everything becomes colorful soup cans!',
    [ShowcaseStrings.Soup_Initializing]:
      'Initializing SessionIsolatedBrightChain...',
    [ShowcaseStrings.Soup_StoreInSoup]: 'Store Data in Block Soup',
    [ShowcaseStrings.Soup_StoreFiles]: '📁 Store Files',
    [ShowcaseStrings.Soup_DropFilesOrClick]:
      'Drop files here or click to upload',
    [ShowcaseStrings.Soup_ChooseFiles]: 'Choose Files',
    [ShowcaseStrings.Soup_StoreCBLWithMagnet]:
      '🔐 Store CBL in soup with magnet URL',
    [ShowcaseStrings.Soup_StoreCBLInfo]:
      'Stores the CBL in the block soup using XOR whitening and generates a shareable magnet URL. Without this, you get the CBL file directly.',
    [ShowcaseStrings.Soup_StoreMessages]: '💬 Store Messages',
    [ShowcaseStrings.Soup_From]: 'From:',
    [ShowcaseStrings.Soup_To]: 'To:',
    [ShowcaseStrings.Soup_Message]: 'Message:',
    [ShowcaseStrings.Soup_TypeMessage]: 'Type your message...',
    [ShowcaseStrings.Soup_SendToSoup]: '📤 Send Message to Soup',
    [ShowcaseStrings.Soup_CBLStoredInSoup]: '🔐 CBL Stored in Soup',
    [ShowcaseStrings.Soup_SuperCBLUsed]: '📊 Super CBL Used',
    [ShowcaseStrings.Soup_HierarchyDepth]: 'Hierarchy Depth:',
    [ShowcaseStrings.Soup_SubCBLs]: 'Sub-CBLs:',
    [ShowcaseStrings.Soup_LargeFileSplit]:
      'Large file split into hierarchical structure',
    [ShowcaseStrings.Soup_CBLStoredInfo]:
      'Your CBL has been stored in the block soup as two XOR components. Use this magnet URL to retrieve the file:',
    [ShowcaseStrings.Soup_Component1]: 'Component 1:',
    [ShowcaseStrings.Soup_Component2]: 'Component 2:',
    [ShowcaseStrings.Soup_Copy]: '📋 Copy',
    [ShowcaseStrings.Soup_RetrieveFromSoup]: 'Retrieve from Soup',
    [ShowcaseStrings.Soup_UploadCBLFile]: 'Upload CBL File',
    [ShowcaseStrings.Soup_UseMagnetURL]: 'Use Magnet URL',
    [ShowcaseStrings.Soup_CBLUploadInfo]:
      'Upload a .cbl file to reconstruct the original file from the block soup. The blocks must already be in the soup for reconstruction to work.',
    [ShowcaseStrings.Soup_ChooseCBLFile]: 'Choose CBL File',
    [ShowcaseStrings.Soup_MagnetURLInfo]:
      'Paste a magnet URL to retrieve the file. The magnet URL references the whitened CBL components stored in the soup.',
    [ShowcaseStrings.Soup_MagnetPlaceholder]:
      'magnet:?xt=urn:brightchain:cbl&bs=...&b1=...&b2=...',
    [ShowcaseStrings.Soup_Load]: 'Load',
    [ShowcaseStrings.Soup_MessagePassing]: 'Message Passing',
    [ShowcaseStrings.Soup_HideMessagePanel]: 'Hide Message Panel',
    [ShowcaseStrings.Soup_ShowMessagePanel]: 'Show Message Panel',
    [ShowcaseStrings.Soup_SendMessage]: 'Send Message',
    [ShowcaseStrings.Soup_MessagesTemplate]: '📬 Messages ({COUNT})',
    [ShowcaseStrings.Soup_NoMessagesYet]:
      'No messages yet. Send your first message! ✨',
    [ShowcaseStrings.Soup_RetrieveFromSoupBtn]: '📥 Retrieve from Soup',
    [ShowcaseStrings.Soup_StoredMessages]: 'Stored Messages',
    [ShowcaseStrings.Soup_StoredFilesAndMessages]: 'Stored Files & Messages',
    [ShowcaseStrings.Soup_RemoveFromList]: 'Remove from list',
    [ShowcaseStrings.Soup_RemoveConfirmTemplate]:
      'Remove "{NAME}" from the list? (Blocks will remain in the soup)',
    [ShowcaseStrings.Soup_RetrieveFile]: '📥 Retrieve File',
    [ShowcaseStrings.Soup_DownloadCBL]: 'Download CBL',
    [ShowcaseStrings.Soup_RetrieveMessage]: '📥 Retrieve Message',
    [ShowcaseStrings.Soup_MagnetURL]: '🧲 Magnet URL',
    [ShowcaseStrings.Soup_WhitenedCBLInfo]:
      'Whitened CBL magnet URL (use "Use Magnet URL" to retrieve)',
    [ShowcaseStrings.Soup_ProcessingSteps]: 'Processing Steps',
    [ShowcaseStrings.Soup_CBLStorageSteps]: 'CBL Storage Steps',
    [ShowcaseStrings.Soup_BlockDetails]: 'Block Details',
    [ShowcaseStrings.Soup_Index]: 'Index:',
    [ShowcaseStrings.Soup_Size]: 'Size:',
    [ShowcaseStrings.Soup_Id]: 'ID:',
    [ShowcaseStrings.Soup_Color]: 'Color:',
    [ShowcaseStrings.Soup_SoupStats]: 'Soup Stats',
    [ShowcaseStrings.Soup_TotalFiles]: 'Total Files:',
    [ShowcaseStrings.Soup_TotalBlocks]: 'Total Blocks:',
    [ShowcaseStrings.Soup_BlockSize]: 'Block Size:',
    [ShowcaseStrings.Soup_SessionDebug]: 'Session Debug',
    [ShowcaseStrings.Soup_SessionId]: 'Session ID:',
    [ShowcaseStrings.Soup_BlocksInMemory]: 'Blocks in Memory:',
    [ShowcaseStrings.Soup_BlockIds]: 'Block IDs:',
    [ShowcaseStrings.Soup_ClearSession]: 'Clear Session',
    [ShowcaseStrings.Soup_Session]: 'Session:',
    [ShowcaseStrings.Soup_DataClearsOnRefresh]: '(Data clears on page refresh)',

    // EnhancedSoupVisualization
    [ShowcaseStrings.ESV_SelectFile]: 'Select a file to highlight its blocks:',
    [ShowcaseStrings.ESV_BlockSoup]: 'Block Soup',
    [ShowcaseStrings.ESV_ShowingConnections]: 'Showing connections for:',
    [ShowcaseStrings.ESV_EmptySoup]: 'Empty Soup',
    [ShowcaseStrings.ESV_EmptySoupHint]:
      'Upload some files to see them transformed into colorful soup cans!',
    [ShowcaseStrings.ESV_FileStats]: '{blocks} blocks • {size} bytes',

    // Score Voting Demo
    [ShowcaseStrings.Score_IntroTitle]: 'Film Critics Awards Night!',
    [ShowcaseStrings.Score_IntroStoryAcademy]:
      'Three films are nominated for Best Picture. Critics must rate each one independently.',
    [ShowcaseStrings.Score_IntroStoryScoring]:
      'Rate each film 0-10. Love one, hate another? Score them honestly! The highest average wins.',
    [ShowcaseStrings.Score_IntroChallenge]:
      "Unlike ranking, you can give multiple films high scores if they're all great!",
    [ShowcaseStrings.Score_StartBtn]: '🎬 Start Rating!',
    [ShowcaseStrings.Score_DemoTitle]: '⭐ Score Voting - Best Picture',
    [ShowcaseStrings.Score_DemoTagline]:
      '🎬 Rate each film 0-10. Highest average wins!',
    [ShowcaseStrings.Score_NominatedFilms]: 'Nominated Films',
    [ShowcaseStrings.Score_Genre_SciFi]: 'Sci-Fi Epic',
    [ShowcaseStrings.Score_Genre_Romance]: 'Romance Drama',
    [ShowcaseStrings.Score_Genre_Thriller]: 'Tech Thriller',
    [ShowcaseStrings.Score_VoterRatingsTemplate]: "🎭 {VOTER}'s Ratings",
    [ShowcaseStrings.Score_Label_Terrible]: '0 - Terrible',
    [ShowcaseStrings.Score_Label_Average]: '5 - Average',
    [ShowcaseStrings.Score_Label_Masterpiece]: '10 - Masterpiece',
    [ShowcaseStrings.Score_SubmitTemplate]:
      'Submit Ratings ({CURRENT}/{TOTAL})',
    [ShowcaseStrings.Score_Encrypting]: '🔐 Encrypting...',
    [ShowcaseStrings.Score_EncryptingVote]: 'Encrypting vote...',
    [ShowcaseStrings.Score_CriticsRatedTemplate]:
      '📋 Critics Who Rated: {COUNT}/{TOTAL}',
    [ShowcaseStrings.Score_TallyBtn]: '🏆 Calculate Averages!',
    [ShowcaseStrings.Score_ResultsTitle]: '🎉 And the Winner Is...',
    [ShowcaseStrings.Score_TallyTitle]: '📊 Score Averaging Process',
    [ShowcaseStrings.Score_TallyExplain]:
      "Each film's scores were added and divided by {COUNT} critics:",
    [ShowcaseStrings.Score_AverageTemplate]: '{AVG}/10 average',
    [ShowcaseStrings.Score_ResetBtn]: 'New Awards',

    // Weighted Voting Demo
    [ShowcaseStrings.Weight_IntroTitle]: 'Boardroom Drama at StartupCo!',
    [ShowcaseStrings.Weight_IntroStoryScene]:
      "It's the annual shareholder meeting. The company is worth $100M and everyone wants a say in what happens next.",
    [ShowcaseStrings.Weight_IntroStoryTwist]:
      'Not all votes are equal. The VC fund owns 45% of shares. The founders own 30% and 15%. Employees and angels own the rest.',
    [ShowcaseStrings.Weight_StakeExpand]: 'Huge growth potential, but risky',
    [ShowcaseStrings.Weight_StakeAcquire]:
      'Eliminate competition, but expensive',
    [ShowcaseStrings.Weight_StakeIPO]: 'IPO means liquidity, but scrutiny',
    [ShowcaseStrings.Weight_IntroChallenge]:
      "Each vote is weighted by shares owned. The VC fund's vote counts 18x more than the angel investor's. That's corporate democracy!",
    [ShowcaseStrings.Weight_StartBtn]: '📄 Enter the Boardroom',
    [ShowcaseStrings.Weight_DemoTitle]:
      '⚖️ Weighted Voting - StartupCo Board Meeting',
    [ShowcaseStrings.Weight_DemoTagline]:
      '💰 Your shares = Your voting power. Welcome to corporate governance!',
    [ShowcaseStrings.Weight_ProposalsTitle]: 'Strategic Proposals',
    [ShowcaseStrings.Weight_Proposal1_Desc]:
      'Open offices in Tokyo and Singapore',
    [ShowcaseStrings.Weight_Proposal2_Desc]: 'Merge with TechStartup Inc.',
    [ShowcaseStrings.Weight_Proposal3_Desc]: 'List on NASDAQ next quarter',
    [ShowcaseStrings.Weight_ShareholdersTemplate]:
      'Shareholders ({VOTED}/{TOTAL} voted)',
    [ShowcaseStrings.Weight_ShareInfoTemplate]: '{SHARES} shares ({PERCENT}%)',
    [ShowcaseStrings.Weight_VoteCastTemplate]: '✓ Voted for {EMOJI} {NAME}',
    [ShowcaseStrings.Weight_TallyBtn]: 'Tally Weighted Votes',
    [ShowcaseStrings.Weight_ResultsTitle]: '🏆 Results (by Share Weight)',
    [ShowcaseStrings.Weight_SharesTemplate]: '{TALLY} shares ({PERCENT}%)',
    [ShowcaseStrings.Weight_WinnerNoteTemplate]:
      '💡 The winning proposal received {PERCENT}% of total shares',
    [ShowcaseStrings.Weight_ResetBtn]: 'Run Another Vote',

    // Yes/No Demo
    [ShowcaseStrings.YN_IntroTitle]: 'National Referendum!',
    [ShowcaseStrings.YN_IntroQuestion]:
      '🏛️ The Question: "Should our country adopt a 4-day work week?"',
    [ShowcaseStrings.YN_IntroStory]:
      '📊 Yes/No Referendum: The simplest form of democracy. One question, two choices, majority rules.',
    [ShowcaseStrings.YN_IntroYesCampaign]:
      '✅ YES Campaign: Better work-life balance, increased productivity, happier citizens!',
    [ShowcaseStrings.YN_IntroNoCampaign]:
      '❌ NO Campaign: Economic risk, business disruption, untested policy!',
    [ShowcaseStrings.YN_IntroChallenge]:
      '🗳️ Used for Brexit, Scottish independence, and constitutional changes worldwide.',
    [ShowcaseStrings.YN_StartBtn]: '🗳️ Vote Now!',
    [ShowcaseStrings.YN_DemoTitle]: '👍 Yes/No Referendum - 4-Day Work Week',
    [ShowcaseStrings.YN_DemoTagline]:
      '🗳️ One question. Two choices. Democracy decides.',
    [ShowcaseStrings.YN_ReferendumQuestion]:
      'Should we adopt a 4-day work week?',
    [ShowcaseStrings.YN_CitizensVotingTemplate]:
      'Citizens Voting ({VOTED}/{TOTAL} voted)',
    [ShowcaseStrings.YN_VotedYes]: '✓ Voted 👍 YES',
    [ShowcaseStrings.YN_VotedNo]: '✓ Voted 👎 NO',
    [ShowcaseStrings.YN_BtnYes]: '👍 YES',
    [ShowcaseStrings.YN_BtnNo]: '👎 NO',
    [ShowcaseStrings.YN_TallyBtn]: '📊 Count the Votes!',
    [ShowcaseStrings.YN_ResultsTitle]: '🎉 Referendum Results!',
    [ShowcaseStrings.YN_LabelYes]: 'YES',
    [ShowcaseStrings.YN_LabelNo]: 'NO',
    [ShowcaseStrings.YN_MotionPasses]: '✅ Motion PASSES!',
    [ShowcaseStrings.YN_MotionFails]: '❌ Motion FAILS!',
    [ShowcaseStrings.YN_OutcomePass]:
      'The people have spoken: We adopt the 4-day work week!',
    [ShowcaseStrings.YN_OutcomeFail]:
      'The people have spoken: We keep the 5-day work week.',
    [ShowcaseStrings.YN_ResetBtn]: 'New Referendum',

    // Yes/No/Abstain Demo
    [ShowcaseStrings.YNA_IntroTitle]: 'UN Security Council Resolution!',
    [ShowcaseStrings.YNA_IntroResolution]:
      '🌍 The Resolution: "Should the UN impose sanctions on Country X for human rights violations?"',
    [ShowcaseStrings.YNA_IntroStory]:
      "🤷 Yes/No/Abstain: Sometimes you're not ready to decide. Abstentions don't count toward the total but are recorded.",
    [ShowcaseStrings.YNA_IntroYes]: '✅ YES: Impose sanctions immediately',
    [ShowcaseStrings.YNA_IntroNo]: '❌ NO: Reject the resolution',
    [ShowcaseStrings.YNA_IntroAbstain]:
      "🤷 ABSTAIN: Neutral - don't want to take a side",
    [ShowcaseStrings.YNA_IntroChallenge]:
      '🏛️ Used in UN votes, parliamentary procedures, and board meetings worldwide.',
    [ShowcaseStrings.YNA_StartBtn]: '🌎 Cast Votes!',
    [ShowcaseStrings.YNA_DemoTitle]: '🤷 Yes/No/Abstain - UN Resolution',
    [ShowcaseStrings.YNA_DemoTagline]:
      '🌍 Three choices: Support, Oppose, or Stay Neutral',
    [ShowcaseStrings.YNA_ReferendumQuestion]: 'Impose sanctions on Country X?',
    [ShowcaseStrings.YNA_CouncilVotingTemplate]:
      'Security Council Members ({VOTED}/{TOTAL} voted)',
    [ShowcaseStrings.YNA_VotedYes]: '✓ 👍 YES',
    [ShowcaseStrings.YNA_VotedNo]: '✓ 👎 NO',
    [ShowcaseStrings.YNA_VotedAbstain]: '✓ 🤷 ABSTAIN',
    [ShowcaseStrings.YNA_BtnYes]: '👍 YES',
    [ShowcaseStrings.YNA_BtnNo]: '👎 NO',
    [ShowcaseStrings.YNA_BtnAbstain]: '🤷 ABSTAIN',
    [ShowcaseStrings.YNA_TallyBtn]: '📊 Tally Resolution!',
    [ShowcaseStrings.YNA_ResultsTitle]: '🌎 Resolution Results!',
    [ShowcaseStrings.YNA_TallyTitle]: '📊 Vote Counting',
    [ShowcaseStrings.YNA_TallyExplain]:
      "Abstentions are recorded but don't count toward the decision. Winner needs majority of YES/NO votes:",
    [ShowcaseStrings.YNA_LabelYes]: 'YES',
    [ShowcaseStrings.YNA_LabelNo]: 'NO',
    [ShowcaseStrings.YNA_LabelAbstain]: 'ABSTAIN',
    [ShowcaseStrings.YNA_AbstainNote]: 'Not counted in decision',
    [ShowcaseStrings.YNA_ResolutionPasses]: '✅ Resolution PASSES!',
    [ShowcaseStrings.YNA_ResolutionFails]: '❌ Resolution FAILS!',
    [ShowcaseStrings.YNA_DecidingVotesTemplate]:
      'Deciding votes: {DECIDING} | Abstentions: {ABSTENTIONS}',
    [ShowcaseStrings.YNA_ResetBtn]: 'New Resolution',

    // Supermajority Demo
    [ShowcaseStrings.Super_IntroTitle]: 'Constitutional Amendment Vote!',
    [ShowcaseStrings.Super_IntroStakes]:
      '🏛️ The Stakes: Amending the Constitution requires more than a simple majority. We need a SUPERMAJORITY!',
    [ShowcaseStrings.Super_IntroThreshold]:
      '🎯 2/3 Threshold: At least 66.67% must vote YES for the amendment to pass. This protects against hasty changes.',
    [ShowcaseStrings.Super_IntroAmendment]:
      '📜 The Amendment: "Add term limits for all federal judges"',
    [ShowcaseStrings.Super_IntroHighBar]:
      "⚠️ High Bar: 6 out of 9 states must ratify (simple majority isn't enough!)",
    [ShowcaseStrings.Super_IntroChallenge]:
      '🌎 Used for constitutional changes, treaty ratifications, and impeachment trials.',
    [ShowcaseStrings.Super_StartBtn]: '🗳️ Start Ratification!',
    [ShowcaseStrings.Super_DemoTitle]:
      '🎯 Supermajority - Constitutional Amendment',
    [ShowcaseStrings.Super_DemoTaglineTemplate]:
      '📊 Requires {PERCENT}% to pass ({REQUIRED}/{TOTAL} states)',
    [ShowcaseStrings.Super_TrackerTitle]: '📊 Live Threshold Tracker',
    [ShowcaseStrings.Super_YesCountTemplate]: '{COUNT} YES',
    [ShowcaseStrings.Super_RequiredTemplate]: '{PERCENT}% Required',
    [ShowcaseStrings.Super_StatusPassingTemplate]:
      '✅ Currently PASSING ({YES}/{TOTAL} = {PERCENT}%)',
    [ShowcaseStrings.Super_StatusFailingTemplate]:
      '❌ Currently FAILING ({YES}/{TOTAL} = {PERCENT}%) - Need {NEED} more YES',
    [ShowcaseStrings.Super_LegislaturesTemplate]:
      'State Legislatures ({VOTED}/{TOTAL} voted)',
    [ShowcaseStrings.Super_VotedRatify]: '✓ ✅ RATIFY',
    [ShowcaseStrings.Super_VotedReject]: '✓ ❌ REJECT',
    [ShowcaseStrings.Super_BtnRatify]: '✅ RATIFY',
    [ShowcaseStrings.Super_BtnReject]: '❌ REJECT',
    [ShowcaseStrings.Super_TallyBtn]: '📜 Final Count!',
    [ShowcaseStrings.Super_ResultsTitle]: '🏛️ Amendment Results!',
    [ShowcaseStrings.Super_CalcTitle]: '📊 Supermajority Calculation',
    [ShowcaseStrings.Super_CalcRequiredTemplate]:
      'Required: {REQUIRED}/{TOTAL} states ({PERCENT}%)',
    [ShowcaseStrings.Super_CalcActualTemplate]:
      'Actual: {ACTUAL}/{VOTED} states ({PERCENT}%)',
    [ShowcaseStrings.Super_RatifyCountTemplate]: '✅ {COUNT} RATIFY',
    [ShowcaseStrings.Super_RejectCountTemplate]: '❌ {COUNT} REJECT',
    [ShowcaseStrings.Super_ThresholdTemplate]: '⬆️ {PERCENT}% Threshold',
    [ShowcaseStrings.Super_AmendmentRatified]: '✅ AMENDMENT RATIFIED!',
    [ShowcaseStrings.Super_AmendmentFails]: '❌ AMENDMENT FAILS!',
    [ShowcaseStrings.Super_OutcomePassTemplate]:
      'The amendment passes with {COUNT} states ({PERCENT}%)',
    [ShowcaseStrings.Super_OutcomeFailTemplate]:
      'Failed to reach {THRESHOLD}% threshold. Only {ACTUAL} of {REQUIRED} required states ratified.',
    [ShowcaseStrings.Super_ResetBtn]: 'New Amendment',

    // Ranked Choice Demo
    [ShowcaseStrings.RC_IntroTitle]: 'The Great Political Showdown!',
    [ShowcaseStrings.RC_IntroStory]:
      "🏛️ Election Night Special: Four parties are battling for control. But here's the twist - nobody wants vote splitting to hand victory to their least favorite!",
    [ShowcaseStrings.RC_IntroRCV]:
      '🧠 Ranked Choice Voting to the rescue! Instead of picking just one, you rank ALL candidates from favorite to least favorite.',
    [ShowcaseStrings.RC_IntroHowItWorks]:
      "🔥 How it works: If nobody gets 50%+ in round 1, we eliminate the last-place candidate and transfer their votes to voters' 2nd choices. Repeat until someone wins!",
    [ShowcaseStrings.RC_IntroWhyCool]:
      '✨ Why it\'s cool: You can vote your heart in round 1 without "wasting" your vote. Your backup choices kick in if your favorite gets eliminated.',
    [ShowcaseStrings.RC_IntroChallenge]:
      '🌎 Used in Australia, Maine, Alaska, and NYC! Watch the instant runoff happen before your eyes.',
    [ShowcaseStrings.RC_StartBtn]: '🗳️ Start Ranking!',
    [ShowcaseStrings.RC_DemoTitle]:
      '🔄 Ranked Choice Voting - National Election',
    [ShowcaseStrings.RC_DemoTagline]:
      '🎯 Rank them ALL! No spoilers, no regrets, just democracy.',
    [ShowcaseStrings.RC_PartiesTitle]: 'Political Parties',
    [ShowcaseStrings.RC_Cand1_Platform]: 'Universal healthcare, climate action',
    [ShowcaseStrings.RC_Cand2_Platform]: 'Lower taxes, traditional values',
    [ShowcaseStrings.RC_Cand3_Platform]: 'Individual freedom, small government',
    [ShowcaseStrings.RC_Cand4_Platform]:
      'Environmental protection, sustainability',
    [ShowcaseStrings.RC_RankPreferencesTemplate]:
      'Rank Your Preferences ({VOTED}/{TOTAL} voted)',
    [ShowcaseStrings.RC_VotedBadge]: '✓ Voted',
    [ShowcaseStrings.RC_AddToRanking]: 'Add to ranking:',
    [ShowcaseStrings.RC_SubmitBallot]: 'Submit Ballot',
    [ShowcaseStrings.RC_RunInstantRunoff]: 'Run Instant Runoff',
    [ShowcaseStrings.RC_ShowBulletinBoard]: '📜 Show Bulletin Board',
    [ShowcaseStrings.RC_HideBulletinBoard]: '📜 Hide Bulletin Board',
    [ShowcaseStrings.RC_BulletinBoardTitle]:
      '📜 Public Bulletin Board (Requirement 1.2)',
    [ShowcaseStrings.RC_BulletinBoardDesc]:
      'Transparent, append-only vote publication with Merkle tree verification',
    [ShowcaseStrings.RC_EntryTemplate]: 'Entry #{SEQ}',
    [ShowcaseStrings.RC_EncryptedVote]: 'Encrypted Vote:',
    [ShowcaseStrings.RC_VoterHash]: 'Voter Hash:',
    [ShowcaseStrings.RC_Verified]: '✅ Verified',
    [ShowcaseStrings.RC_Invalid]: '❌ Invalid',
    [ShowcaseStrings.RC_MerkleTree]: 'Merkle Tree:',
    [ShowcaseStrings.RC_MerkleValid]: '✅ Valid',
    [ShowcaseStrings.RC_MerkleCompromised]: '❌ Compromised',
    [ShowcaseStrings.RC_TotalEntries]: 'Total Entries:',
    [ShowcaseStrings.RC_ResultsTitle]: '🏆 Instant Runoff Results',
    [ShowcaseStrings.RC_EliminationRounds]: 'Elimination Rounds',
    [ShowcaseStrings.RC_RoundTemplate]: 'Round {ROUND}',
    [ShowcaseStrings.RC_Eliminated]: 'Eliminated',
    [ShowcaseStrings.RC_Winner]: 'Winner!',
    [ShowcaseStrings.RC_FinalWinner]: 'Final Winner',
    [ShowcaseStrings.RC_WonAfterRoundsTemplate]: 'Won after {COUNT} round(s)',

    // Two-Round Demo
    [ShowcaseStrings.TR_IntroTitle]: 'Presidential Election - Two Rounds!',
    [ShowcaseStrings.TR_IntroSystem]:
      '🗳️ The System: Four candidates compete. If nobody gets 50%+ in Round 1, the top 2 face off in Round 2!',
    [ShowcaseStrings.TR_IntroWhyTwoRounds]:
      '🎯 Why Two Rounds? Ensures the winner has majority support, not just plurality. Used in France, Brazil, and many presidential elections.',
    [ShowcaseStrings.TR_IntroRound1]:
      '📊 Round 1: Vote for your favorite among all 4 candidates',
    [ShowcaseStrings.TR_IntroRound2]:
      '🔄 Round 2: If needed, choose between the top 2 finishers',
    [ShowcaseStrings.TR_IntroChallenge]:
      "⚠️ This requires intermediate decryption between rounds - votes aren't private between rounds!",
    [ShowcaseStrings.TR_StartBtn]: '🗳️ Start Round 1!',
    [ShowcaseStrings.TR_DemoTitle]:
      '2️⃣ Two-Round Voting - Presidential Election',
    [ShowcaseStrings.TR_TaglineRound1]: '🔄 Round 1: Choose your favorite',
    [ShowcaseStrings.TR_TaglineRound2]: '🔄 Round 2: Final runoff!',
    [ShowcaseStrings.TR_Round1Candidates]: 'Round 1 Candidates',
    [ShowcaseStrings.TR_Cand1_Party]: 'Progressive Party',
    [ShowcaseStrings.TR_Cand2_Party]: 'Conservative Party',
    [ShowcaseStrings.TR_Cand3_Party]: 'Tech Forward',
    [ShowcaseStrings.TR_Cand4_Party]: 'Justice Coalition',
    [ShowcaseStrings.TR_VotersTemplate]: 'Voters ({VOTED}/{TOTAL} voted)',
    [ShowcaseStrings.TR_VotedForTemplate]: '✓ Voted for {EMOJI}',
    [ShowcaseStrings.TR_CountRound1]: '📊 Count Round 1 Votes!',
    [ShowcaseStrings.TR_Round1Results]: '🗳️ Round 1 Results',
    [ShowcaseStrings.TR_Round1TallyTitle]: '📊 First Round Tally',
    [ShowcaseStrings.TR_Round1TallyExplain]:
      'Checking if anyone got 50%+ majority...',
    [ShowcaseStrings.TR_AdvanceRound2]: '→ Round 2',
    [ShowcaseStrings.TR_EliminatedBadge]: 'Eliminated',
    [ShowcaseStrings.TR_NoMajority]: '🔄 No Majority! Runoff Required!',
    [ShowcaseStrings.TR_TopTwoAdvance]: 'Top 2 candidates advance to Round 2:',
    [ShowcaseStrings.TR_StartRound2]: '▶️ Start Round 2 Runoff!',
    [ShowcaseStrings.TR_Round2Runoff]: '🔥 Round 2 Runoff',
    [ShowcaseStrings.TR_Round1ResultTemplate]: 'Round 1: {VOTES} votes',
    [ShowcaseStrings.TR_FinalVoteTemplate]:
      'Final Vote ({VOTED}/{TOTAL} voted)',
    [ShowcaseStrings.TR_FinalCount]: '🏆 Final Count!',
    [ShowcaseStrings.TR_ElectionWinner]: '🎉 Election Winner!',
    [ShowcaseStrings.TR_Round2TallyTitle]: '📊 Round 2 Final Tally',
    [ShowcaseStrings.TR_Round2TallyExplain]:
      'Head-to-head runoff between top 2 candidates:',
    [ShowcaseStrings.TR_WinnerAnnouncementTemplate]: '🏆 {NAME} Wins!',
    [ShowcaseStrings.TR_WinnerSecuredTemplate]:
      'Secured {VOTES} votes ({PERCENT}%) in the runoff',
    [ShowcaseStrings.TR_NewElection]: 'New Election',

    // STAR Demo
    [ShowcaseStrings.STAR_IntroTitle]: 'STAR Voting - Best of Both Worlds!',
    [ShowcaseStrings.STAR_IntroAcronym]:
      '🌟 STAR = Score Then Automatic Runoff',
    [ShowcaseStrings.STAR_IntroStep1]:
      '⭐ Step 1: Score all candidates 0-5 stars (like rating movies!)',
    [ShowcaseStrings.STAR_IntroStep2]:
      '🔄 Step 2: Top 2 by total score go to automatic runoff. Your scores determine your preference!',
    [ShowcaseStrings.STAR_IntroMagic]:
      '🎯 The Magic: You can give high scores to multiple candidates, but the runoff ensures majority support',
    [ShowcaseStrings.STAR_IntroExample]:
      '💡 Example: You rate Alex=5, Jordan=4, Sam=2, Casey=1. If Alex & Jordan are top 2, your vote goes to Alex!',
    [ShowcaseStrings.STAR_IntroChallenge]:
      "⚠️ Combines score voting's expressiveness with runoff's majority requirement!",
    [ShowcaseStrings.STAR_StartBtn]: '⭐ Start Rating!',
    [ShowcaseStrings.STAR_DemoTitle]: '⭐🔄 STAR Voting - City Council',
    [ShowcaseStrings.STAR_DemoTagline]: '⭐ Score, then automatic runoff!',
    [ShowcaseStrings.STAR_CandidatesTitle]: 'Candidates',
    [ShowcaseStrings.STAR_Cand1_Platform]: 'Arts & Culture',
    [ShowcaseStrings.STAR_Cand2_Platform]: 'Environment',
    [ShowcaseStrings.STAR_Cand3_Platform]: 'Economy',
    [ShowcaseStrings.STAR_Cand4_Platform]: 'Healthcare',
    [ShowcaseStrings.STAR_RatingsTemplate]: "⭐ {VOTER}'s Ratings (0-5 stars)",
    [ShowcaseStrings.STAR_SubmitRatingsTemplate]:
      'Submit Ratings ({CURRENT}/{TOTAL})',
    [ShowcaseStrings.STAR_RunSTAR]: '⭐🔄 Run STAR Algorithm!',
    [ShowcaseStrings.STAR_Phase1Title]: '⭐ Phase 1: Score Totals',
    [ShowcaseStrings.STAR_Phase1TallyTitle]: '📊 Adding Up All Scores',
    [ShowcaseStrings.STAR_Phase1TallyExplain]:
      'Finding top 2 candidates by total score...',
    [ShowcaseStrings.STAR_PointsTemplate]: '{TOTAL} points ({AVG} avg)',
    [ShowcaseStrings.STAR_RunoffBadge]: '→ Runoff',
    [ShowcaseStrings.STAR_AutoRunoffPhase]: '🔄 Automatic Runoff Phase',
    [ShowcaseStrings.STAR_TopTwoAdvance]:
      'Top 2 advance! Now checking head-to-head preferences...',
    [ShowcaseStrings.STAR_RunAutoRunoff]: '▶️ Run Automatic Runoff!',
    [ShowcaseStrings.STAR_WinnerTitle]: '🎉 STAR Winner!',
    [ShowcaseStrings.STAR_Phase2Title]: '🔄 Phase 2: Automatic Runoff',
    [ShowcaseStrings.STAR_Phase2ExplainTemplate]:
      'Comparing {NAME1} vs {NAME2} using voter preferences:',
    [ShowcaseStrings.STAR_VotersPreferred]: 'voters preferred',
    [ShowcaseStrings.STAR_VS]: 'VS',
    [ShowcaseStrings.STAR_WinnerAnnouncementTemplate]: '🏆 {NAME} Wins!',
    [ShowcaseStrings.STAR_WonRunoffTemplate]:
      'Won the automatic runoff {WINNER} to {LOSER}',
    [ShowcaseStrings.STAR_NewElection]: 'New Election',

    // STV Demo
    [ShowcaseStrings.STV_IntroTitle]: 'STV - Proportional Representation!',
    [ShowcaseStrings.STV_IntroGoal]:
      '🏛️ The Goal: Elect 3 representatives that reflect the diversity of voter preferences!',
    [ShowcaseStrings.STV_IntroSTV]:
      '📊 STV (Single Transferable Vote): Rank candidates. Votes transfer when your top choice wins or is eliminated.',
    [ShowcaseStrings.STV_IntroQuotaTemplate]:
      '🎯 Quota: Need {QUOTA} votes to win a seat (Droop quota: {VOTERS}/(3+1) + 1)',
    [ShowcaseStrings.STV_IntroTransfers]:
      '🔄 Transfers: Surplus votes from winners and votes from eliminated candidates transfer to next preferences',
    [ShowcaseStrings.STV_IntroChallenge]:
      '🌍 Used in Ireland, Australia Senate, and many city councils for fair representation!',
    [ShowcaseStrings.STV_StartBtn]: '📊 Start Ranking!',
    [ShowcaseStrings.STV_DemoTitle]: '📊 STV - City Council ({SEATS} seats)',
    [ShowcaseStrings.STV_DemoTaglineTemplate]:
      '🎯 Quota: {QUOTA} votes needed per seat',
    [ShowcaseStrings.STV_PartiesRunning]: 'Parties Running',
    [ShowcaseStrings.STV_RankingTemplate]: "📝 {VOTER}'s Ranking",
    [ShowcaseStrings.STV_RankingInstruction]:
      'Click to add candidates in order of preference:',
    [ShowcaseStrings.STV_SubmitRankingTemplate]:
      'Submit Ranking ({CURRENT}/{TOTAL})',
    [ShowcaseStrings.STV_RunSTVCount]: '📊 Run STV Count!',
    [ShowcaseStrings.STV_CouncilElected]: '🏛️ Council Elected!',
    [ShowcaseStrings.STV_CountingTitle]: '📊 STV Counting Process',
    [ShowcaseStrings.STV_CountingExplainTemplate]:
      'Quota: {QUOTA} votes | Seats: {SEATS}\nFirst preference count determines initial winners',
    [ShowcaseStrings.STV_QuotaMet]: '(Quota met!)',
    [ShowcaseStrings.STV_ElectedBadge]: '✓ ELECTED',
    [ShowcaseStrings.STV_ElectedReps]: '🎉 Elected Representatives',
    [ShowcaseStrings.STV_ElectedExplainTemplate]:
      '💡 These {COUNT} parties each met the quota of {QUOTA} votes and won seats on the council!',
    [ShowcaseStrings.STV_NewElection]: 'New Election',

    // Quadratic Voting Demo
    [ShowcaseStrings.Quad_IntroTitle]: 'Quadratic Voting - Budget Allocation!',
    [ShowcaseStrings.Quad_IntroChallenge]:
      '💰 The Challenge: $1.4M budget, 4 projects. How do we measure intensity of preference?',
    [ShowcaseStrings.Quad_IntroQuadratic]:
      '² Quadratic Voting: Each vote costs votes² credits. 1 vote = 1 credit, 2 votes = 4 credits, 3 votes = 9 credits!',
    [ShowcaseStrings.Quad_IntroInsecure]:
      '⚠️ INSECURE METHOD: Requires non-homomorphic operations (square root). Individual votes are visible!',
    [ShowcaseStrings.Quad_IntroWhyUse]:
      '🎯 Why use it? Prevents wealthy voters from dominating. Shows preference intensity, not just yes/no.',
    [ShowcaseStrings.Quad_IntroUsedIn]:
      '💡 Used in Colorado House, Taiwanese vTaiwan platform, and corporate governance experiments!',
    [ShowcaseStrings.Quad_StartBtn]: '💰 Start Allocating!',
    [ShowcaseStrings.Quad_DemoTitle]: '² Quadratic Voting - City Budget',
    [ShowcaseStrings.Quad_DemoTagline]:
      '💰 100 voice credits. Votes cost votes²!',
    [ShowcaseStrings.Quad_InsecureBanner]:
      '⚠️ INSECURE: This method cannot use homomorphic encryption. Votes are visible!',
    [ShowcaseStrings.Quad_BudgetProjects]: 'Budget Projects',
    [ShowcaseStrings.Quad_Proj1_Name]: 'New Park',
    [ShowcaseStrings.Quad_Proj1_Desc]: '$500k',
    [ShowcaseStrings.Quad_Proj2_Name]: 'Library Renovation',
    [ShowcaseStrings.Quad_Proj2_Desc]: '$300k',
    [ShowcaseStrings.Quad_Proj3_Name]: 'Community Center',
    [ShowcaseStrings.Quad_Proj3_Desc]: '$400k',
    [ShowcaseStrings.Quad_Proj4_Name]: 'Street Repairs',
    [ShowcaseStrings.Quad_Proj4_Desc]: '$200k',
    [ShowcaseStrings.Quad_BudgetTemplate]:
      "💰 {VOTER}'s Budget ({REMAINING} credits left)",
    [ShowcaseStrings.Quad_VotesTemplate]:
      '{VOTES} votes (costs {COST} credits)',
    [ShowcaseStrings.Quad_CostExplanationTemplate]:
      'Next vote costs {NEXT_COST} credits (from {CURRENT} to {NEXT_TOTAL})',
    [ShowcaseStrings.Quad_BudgetSummaryTemplate]:
      'Total Cost: {USED}/100 credits',
    [ShowcaseStrings.Quad_SubmitTemplate]:
      'Submit Allocation ({CURRENT}/{TOTAL})',
    [ShowcaseStrings.Quad_CalculateTotals]: '💰 Calculate Totals!',
    [ShowcaseStrings.Quad_ResultsTitle]: '💰 Budget Allocation Results!',
    [ShowcaseStrings.Quad_TallyTitle]: '📊 Quadratic Vote Totals',
    [ShowcaseStrings.Quad_TallyExplain]:
      "Each project's total votes (not credits) determines funding priority:",
    [ShowcaseStrings.Quad_TotalVotesTemplate]: '{TOTAL} total votes',
    [ShowcaseStrings.Quad_TopPriority]: '🏆 Top Priority',
    [ShowcaseStrings.Quad_ExplanationTitle]: '💡 How Quadratic Voting Worked',
    [ShowcaseStrings.Quad_ExplanationP1]:
      'The quadratic cost prevented anyone from dominating a single project. To cast 10 votes costs 100 credits (your entire budget!), but spreading 5 votes each on 2 projects only costs 50 credits total.',
    [ShowcaseStrings.Quad_ExplanationResult]:
      'Result: Projects with broad, intense support win over projects with narrow, extreme support.',
    [ShowcaseStrings.Quad_ResetBtn]: 'New Budget Vote',

    // Consensus Demo
    [ShowcaseStrings.Cons_IntroTitle]: 'Consensus Decision Making!',
    [ShowcaseStrings.Cons_IntroScenario]:
      "🏕️ The Scenario: A small co-op needs to make a major decision. Everyone's voice matters!",
    [ShowcaseStrings.Cons_IntroConsensus]:
      '🤝 Consensus Voting: Requires 95%+ agreement. One or two objections can block the proposal.',
    [ShowcaseStrings.Cons_IntroInsecure]:
      '⚠️ INSECURE METHOD: No privacy - everyone sees who supports/opposes!',
    [ShowcaseStrings.Cons_IntroWhyUse]:
      '🎯 Why use it? Small groups where trust and unity are more important than privacy.',
    [ShowcaseStrings.Cons_IntroUsedIn]:
      '🌍 Used in co-ops, intentional communities, and consensus-based organizations!',
    [ShowcaseStrings.Cons_StartBtn]: '🤝 Start Voting!',
    [ShowcaseStrings.Cons_DemoTitle]: '🤝 Consensus Voting - Co-op Decision',
    [ShowcaseStrings.Cons_DemoTaglineTemplate]:
      '🎯 Requires {PERCENT}% agreement ({REQUIRED}/{TOTAL} members)',
    [ShowcaseStrings.Cons_InsecureBanner]:
      '⚠️ INSECURE: No privacy - all votes are visible to build consensus!',
    [ShowcaseStrings.Cons_Proposal]:
      'Proposal: Should we invest $50k in solar panels?',
    [ShowcaseStrings.Cons_ProposalDesc]:
      'This is a major financial decision requiring near-unanimous support.',
    [ShowcaseStrings.Cons_TrackerTitle]: '📊 Live Consensus Tracker',
    [ShowcaseStrings.Cons_SupportTemplate]: '{COUNT} Support',
    [ShowcaseStrings.Cons_ConsensusReachedTemplate]:
      '✅ CONSENSUS REACHED ({SUPPORT}/{TOTAL})',
    [ShowcaseStrings.Cons_NeedMoreTemplate]:
      '❌ Need {NEEDED} more to reach consensus',
    [ShowcaseStrings.Cons_MembersTemplate]:
      'Co-op Members ({VOTED}/{TOTAL} voted)',
    [ShowcaseStrings.Cons_Support]: '✅ Support',
    [ShowcaseStrings.Cons_Oppose]: '❌ Oppose',
    [ShowcaseStrings.Cons_BtnSupport]: '✅ Support',
    [ShowcaseStrings.Cons_BtnOppose]: '❌ Oppose',
    [ShowcaseStrings.Cons_CheckConsensus]: '🤝 Check Consensus!',
    [ShowcaseStrings.Cons_ResultsTitle]: '🤝 Consensus Result!',
    [ShowcaseStrings.Cons_FinalCountTitle]: '📊 Final Count',
    [ShowcaseStrings.Cons_RequiredTemplate]:
      'Required: {REQUIRED}/{TOTAL} ({PERCENT}%)',
    [ShowcaseStrings.Cons_ActualTemplate]:
      'Actual: {SUPPORT}/{VOTED} ({ACTUAL_PERCENT}%)',
    [ShowcaseStrings.Cons_SupportCountTemplate]: '✅ {COUNT} Support',
    [ShowcaseStrings.Cons_OpposeCountTemplate]: '❌ {COUNT} Oppose',
    [ShowcaseStrings.Cons_ThresholdTemplate]: '⬆️ {PERCENT}% Threshold',
    [ShowcaseStrings.Cons_ConsensusAchieved]: '✅ CONSENSUS ACHIEVED!',
    [ShowcaseStrings.Cons_ConsensusFailed]: '❌ CONSENSUS FAILED!',
    [ShowcaseStrings.Cons_OutcomePassTemplate]:
      'The proposal passes with {COUNT} members supporting ({PERCENT}%)',
    [ShowcaseStrings.Cons_OutcomeFailTemplate]:
      'Failed to reach {THRESHOLD}% threshold. {OPPOSE} member(s) opposed, blocking consensus.',
    [ShowcaseStrings.Cons_FailNote]:
      '💡 In consensus decision-making, even one or two objections matter. The group must address concerns or modify the proposal.',
    [ShowcaseStrings.Cons_ResetBtn]: 'New Proposal',

    // Consent-Based Demo
    [ShowcaseStrings.Consent_IntroTitle]: 'Consent-Based Decision Making!',
    [ShowcaseStrings.Consent_IntroSociocracy]:
      '🏢 Sociocracy: A worker cooperative needs to make decisions that everyone can live with.',
    [ShowcaseStrings.Consent_IntroConsentBased]:
      '🙋 Consent-Based: Not about agreement - it\'s about "no strong objections". Can you live with this?',
    [ShowcaseStrings.Consent_IntroInsecure]:
      '⚠️ INSECURE METHOD: No privacy - objections must be heard and addressed!',
    [ShowcaseStrings.Consent_IntroQuestion]:
      '🎯 The Question: "Do you have a principled objection that would harm the organization?"',
    [ShowcaseStrings.Consent_IntroUsedIn]:
      '🌍 Used in sociocratic organizations, holacracy, and collaborative workplaces!',
    [ShowcaseStrings.Consent_StartBtn]: '🙋 Start Process!',
    [ShowcaseStrings.Consent_DemoTitle]: '🙋 Consent-Based - Worker Co-op',
    [ShowcaseStrings.Consent_DemoTagline]:
      '🤝 No strong objections = consent achieved',
    [ShowcaseStrings.Consent_InsecureBanner]:
      '⚠️ INSECURE: No privacy - objections are shared openly for discussion!',
    [ShowcaseStrings.Consent_ProposalTitle]:
      'Proposal: Implement 4-day work week starting next month',
    [ShowcaseStrings.Consent_ProposalQuestion]:
      'Do you have a principled objection that would harm our organization?',
    [ShowcaseStrings.Consent_ProposalNote]:
      '"I prefer 5 days" is not a principled objection. "This would bankrupt us" is.',
    [ShowcaseStrings.Consent_ConsentCount]: '✅ Consent',
    [ShowcaseStrings.Consent_ObjectionCount]: '🚫 Objections',
    [ShowcaseStrings.Consent_ObjectionWarningTemplate]:
      '⚠️ {COUNT} principled objection(s) raised - proposal must be modified or withdrawn',
    [ShowcaseStrings.Consent_MembersTemplate]:
      'Circle Members ({RESPONDED}/{TOTAL} responded)',
    [ShowcaseStrings.Consent_NoObjection]: '✅ No Objection',
    [ShowcaseStrings.Consent_PrincipledObjection]: '🚫 Principled Objection',
    [ShowcaseStrings.Consent_BtnNoObjection]: '✅ No Objection',
    [ShowcaseStrings.Consent_BtnObject]: '🚫 Object',
    [ShowcaseStrings.Consent_ObjectionPromptTemplate]:
      '{VOTER}, what is your principled objection?',
    [ShowcaseStrings.Consent_CheckConsent]: '🙋 Check for Consent!',
    [ShowcaseStrings.Consent_ResultsTitle]: '🙋 Consent Process Result!',
    [ShowcaseStrings.Consent_ConsentCheckTitle]: '📊 Consent Check',
    [ShowcaseStrings.Consent_ConsentCheckExplainTemplate]:
      'Consent achieved if zero principled objections\nObjections raised: {COUNT}',
    [ShowcaseStrings.Consent_NoObjectionsGroup]: '✅ No Objections ({COUNT})',
    [ShowcaseStrings.Consent_NoObjectionsDesc]:
      'These members can live with the proposal',
    [ShowcaseStrings.Consent_ObjectionsGroupTemplate]:
      '🚫 Principled Objections ({COUNT})',
    [ShowcaseStrings.Consent_ObjectionRaised]: 'Objection raised',
    [ShowcaseStrings.Consent_ConsentAchieved]: '✅ CONSENT ACHIEVED!',
    [ShowcaseStrings.Consent_ConsentBlocked]: '🚫 CONSENT BLOCKED!',
    [ShowcaseStrings.Consent_OutcomePassTemplate]:
      'All {COUNT} members gave consent (no principled objections). The proposal moves forward.',
    [ShowcaseStrings.Consent_OutcomeFailTemplate]:
      '{COUNT} principled objection(s) raised. The circle must address concerns before proceeding.',
    [ShowcaseStrings.Consent_NextStepsTitle]: '💡 Next Steps in Sociocracy:',
    [ShowcaseStrings.Consent_NextStep1]: 'Listen to objections fully',
    [ShowcaseStrings.Consent_NextStep2]: 'Modify proposal to address concerns',
    [ShowcaseStrings.Consent_NextStep3]:
      'Re-test for consent with updated proposal',
    [ShowcaseStrings.Consent_NextStep4]:
      'If objections persist, proposal is withdrawn',
    [ShowcaseStrings.Consent_ResetBtn]: 'New Proposal',

    // Blog
    [ShowcaseStrings.Blog_Title]: 'BrightChain Blog',
    [ShowcaseStrings.Blog_Subtitle]: 'Thoughts, tutorials, and updates',
    [ShowcaseStrings.Blog_Loading]: 'Loading posts...',
    [ShowcaseStrings.Blog_NewPost]: '+ New Post',
    [ShowcaseStrings.Blog_NoPosts]: 'No blog posts yet. Check back soon!',
    [ShowcaseStrings.Blog_NewBadge]: '✨ New',
    [ShowcaseStrings.Blog_ByAuthorTemplate]: 'By {AUTHOR}',
    [ShowcaseStrings.Blog_BackToHome]: '← Back to Home',

    // BlogPost.tsx
    [ShowcaseStrings.BlogPost_Loading]: 'Loading post...',
    [ShowcaseStrings.BlogPost_NotFoundTitle]: 'Post Not Found',
    [ShowcaseStrings.BlogPost_NotFoundDesc]:
      "The blog post you're looking for doesn't exist.",
    [ShowcaseStrings.BlogPost_BackToBlog]: '← Back to Blog',
    [ShowcaseStrings.BlogPost_NewBanner]:
      '✨ This post was just published! It will appear in the blog list after the next site deployment.',
    [ShowcaseStrings.BlogPost_ByAuthorTemplate]: 'By {AUTHOR}',

    // Components.tsx feature cards
    [ShowcaseStrings.Feat_BrightDB_Desc]:
      'MongoDB-competitive document database storing data on the Owner-Free Filesystem. Every document transparently stored as whitened blocks with TUPLE architecture for plausible deniability.',
    [ShowcaseStrings.Feat_BrightDB_Cat]: 'Storage',
    [ShowcaseStrings.Feat_BrightDB_Tech1]: 'Document Store',
    [ShowcaseStrings.Feat_BrightDB_Tech2]: 'ACID Transactions',
    [ShowcaseStrings.Feat_BrightDB_Tech3]: 'Aggregation Pipeline',
    [ShowcaseStrings.Feat_BrightDB_HL1]:
      'MongoDB-like API: collections, CRUD, queries, indexes, transactions',
    [ShowcaseStrings.Feat_BrightDB_HL2]:
      '15 query operators: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $regex, $exists, $and, $or, $not, $nor, $elemMatch',
    [ShowcaseStrings.Feat_BrightDB_HL3]:
      'Aggregation pipeline: $match, $group, $sort, $limit, $skip, $project, $unwind, $count, $addFields, $lookup',
    [ShowcaseStrings.Feat_BrightDB_HL4]:
      'Single-field, compound, and unique indexes with B-tree structures',
    [ShowcaseStrings.Feat_BrightDB_HL5]:
      'Multi-document ACID transactions with commit/abort and optimistic concurrency',
    [ShowcaseStrings.Feat_BrightDB_HL6]:
      'Change streams for real-time insert/update/delete event subscriptions',
    [ShowcaseStrings.Feat_BrightDB_HL7]:
      'Express REST middleware for drop-in API access to collections',
    [ShowcaseStrings.Feat_BrightDB_HL8]:
      'TTL indexes for automatic document expiration',
    [ShowcaseStrings.Feat_BrightDB_HL9]:
      'Schema validation with strict/moderate levels and default values',
    [ShowcaseStrings.Feat_BrightDB_HL10]:
      'Full-text search with weighted fields and $text operator',
    [ShowcaseStrings.Feat_BrightDB_HL11]:
      'Copy-on-write storage: blocks never deleted, only mappings updated',
    [ShowcaseStrings.Feat_BrightDB_HL12]:
      'Every document stored as 3-block TUPLE (data + 2 randomizers) for plausible deniability',
    [ShowcaseStrings.Feat_BrightDBPools_Title]: 'BrightDB Pools',
    [ShowcaseStrings.Feat_BrightDBPools_Desc]:
      'Lightweight namespace-isolated storage pools that logically partition blocks without separate physical storage. Each pool enforces its own ACL, encryption, and whitening boundaries — enabling multi-tenant, multi-application data isolation on a single BrightChain node.',
    [ShowcaseStrings.Feat_BrightDBPools_Cat]: 'Storage',
    [ShowcaseStrings.Feat_BrightDBPools_Tech1]: 'Namespace Isolation',
    [ShowcaseStrings.Feat_BrightDBPools_Tech2]: 'Pool ACLs',
    [ShowcaseStrings.Feat_BrightDBPools_Tech3]: 'Gossip Discovery',
    [ShowcaseStrings.Feat_BrightDBPools_HL1]:
      'Namespace-prefixed storage keys (poolId:hash) — logical isolation without physical separation',
    [ShowcaseStrings.Feat_BrightDBPools_HL2]:
      'Per-pool ACLs with Read, Write, Replicate, and Admin permissions enforced at the store layer',
    [ShowcaseStrings.Feat_BrightDBPools_HL3]:
      'Pool-scoped XOR whitening: tuples never cross pool boundaries, preserving per-pool plausible deniability',
    [ShowcaseStrings.Feat_BrightDBPools_HL4]:
      'Gossip-based pool discovery across peers with configurable query timeouts and caching',
    [ShowcaseStrings.Feat_BrightDBPools_HL5]:
      'Pool bootstrap seeding: generate cryptographic random blocks as whitening material for new pools',
    [ShowcaseStrings.Feat_BrightDBPools_HL6]:
      'Safe deletion validation — checks cross-pool XOR dependencies before removing a pool',
    [ShowcaseStrings.Feat_BrightDBPools_HL7]:
      'Pool-scoped Bloom filters and manifests for efficient peer reconciliation',
    [ShowcaseStrings.Feat_BrightDBPools_HL8]:
      'Multi-admin quorum governance: ACL updates require >50% admin signatures',
    [ShowcaseStrings.Feat_BrightDBPools_HL9]:
      'Public read/write flags for open pools, or locked-down member-only access',
    [ShowcaseStrings.Feat_OFFS_Title]: 'Owner-Free File System (OFFS)',
    [ShowcaseStrings.Feat_OFFS_Desc]:
      "Building on the original Owner-Free File System concept, BrightChain takes OFFS to the next level. We've added ECIES asymmetric encryption, Reed-Solomon Forward Error Correction parity blocks for redundancy and durability, and a digital blockchain ledger. On this foundation, Digital Burnbag leverages the unique properties of OFFS to enable guaranteed file destruction without the contents ever having been read. See our Digital Burnbag Vault whitepaper for the full mathematical details.",
    [ShowcaseStrings.Feat_OFFS_Cat]: 'Storage',
    [ShowcaseStrings.Feat_OFFS_Tech1]: 'ECIES Encryption',
    [ShowcaseStrings.Feat_OFFS_Tech2]: 'Reed-Solomon FEC',
    [ShowcaseStrings.Feat_OFFS_Tech3]: 'Blockchain Ledger',
    [ShowcaseStrings.Feat_OFFS_HL1]:
      'Based on the original OFFS concept — files XOR-mixed with random data so no single block contains identifiable content',
    [ShowcaseStrings.Feat_OFFS_HL2]:
      'Enhanced with ECIES asymmetric encryption for a cryptographic security layer beyond XOR obfuscation',
    [ShowcaseStrings.Feat_OFFS_HL3]:
      'Reed-Solomon FEC parity blocks provide redundancy and durability even if nodes go offline',
    [ShowcaseStrings.Feat_OFFS_HL4]:
      'Digital blockchain ledger maintains tamper-evident records of all block operations',
    [ShowcaseStrings.Feat_OFFS_HL5]:
      'Digital Burnbag guarantees file destruction without the contents ever being accessed — provable via the ledger',
    [ShowcaseStrings.Feat_OFFS_HL6]:
      'Novel mathematics detailed in the Digital Burnbag Vault whitepaper — https://github.brightchain.org/docs/papers/digital-burnbag-vault/',
    [ShowcaseStrings.Feat_Messaging_Title]: 'Messaging System',
    [ShowcaseStrings.Feat_Messaging_Desc]:
      'Secure, decentralized message passing with encryption, routing, delivery tracking, and gossip protocol for epidemic-style propagation. Built on the block store with WebSocket real-time delivery.',
    [ShowcaseStrings.Feat_Messaging_Cat]: 'Network',
    [ShowcaseStrings.Feat_Messaging_Tech1]: 'Gossip Protocol',
    [ShowcaseStrings.Feat_Messaging_Tech2]: 'ECIES',
    [ShowcaseStrings.Feat_Messaging_Tech3]: 'WebSocket',
    [ShowcaseStrings.Feat_Messaging_Tech4]: 'Bloom Filters',
    [ShowcaseStrings.Feat_Messaging_HL1]:
      'Encrypted message passing with per-recipient or shared key encryption',
    [ShowcaseStrings.Feat_Messaging_HL2]:
      'Epidemic-style gossip propagation with priority-based delivery',
    [ShowcaseStrings.Feat_Messaging_HL3]:
      'Automatic retry with exponential backoff for failed deliveries',
    [ShowcaseStrings.Feat_Messaging_HL4]:
      'Bloom filter-based discovery protocol for efficient block location',
    [ShowcaseStrings.Feat_Messaging_HL5]:
      'Real-time WebSocket events for message delivery and acknowledgments',
    [ShowcaseStrings.Feat_Messaging_HL6]:
      'Persistent delivery tracking with per-recipient status',
    [ShowcaseStrings.Feat_BrightMail_Desc]:
      'RFC 5322/2045 compliant email with threading, BCC privacy, attachments, inbox operations, and delivery tracking. Full email composition, sending, and retrieval built on messaging infrastructure.',
    [ShowcaseStrings.Feat_BrightMail_Cat]: 'Network',
    [ShowcaseStrings.Feat_BrightMail_Tech1]: 'RFC 5322',
    [ShowcaseStrings.Feat_BrightMail_Tech2]: 'RFC 2045',
    [ShowcaseStrings.Feat_BrightMail_Tech3]: 'MIME',
    [ShowcaseStrings.Feat_BrightMail_Tech4]: 'Threading',
    [ShowcaseStrings.Feat_BrightMail_HL1]:
      'RFC-compliant Internet Message Format with MIME support',
    [ShowcaseStrings.Feat_BrightMail_HL2]:
      'Threading via In-Reply-To and References headers',
    [ShowcaseStrings.Feat_BrightMail_HL3]:
      'BCC privacy with cryptographically separated copies per recipient',
    [ShowcaseStrings.Feat_BrightMail_HL4]:
      'Multiple attachments with Content-ID for inline images',
    [ShowcaseStrings.Feat_BrightMail_HL5]:
      'Inbox operations: query, filter, sort, search with pagination',
    [ShowcaseStrings.Feat_BrightMail_HL6]:
      'Per-recipient delivery tracking via gossip acknowledgments',
    [ShowcaseStrings.Feat_BrightMail_HL7]:
      'Multiple encryption schemes: ECIES, shared key, S/MIME',
    [ShowcaseStrings.Feat_BrightMail_HL8]:
      'Digital signatures for sender authentication',
    [ShowcaseStrings.Feat_BrightMail_HL9]:
      'Forward/reply with RFC-compliant Resent-* headers',
    [ShowcaseStrings.Feat_BrightCal_Desc]:
      'Google Calendar-competitive shared calendar system integrated with BrightMail. iCal/CalDAV compatible, end-to-end encrypted events, granular sharing permissions, meeting booking, and conflict detection.',
    [ShowcaseStrings.Feat_BrightCal_Cat]: 'Network',
    [ShowcaseStrings.Feat_BrightCal_Tech1]: 'iCal/RFC 5545',
    [ShowcaseStrings.Feat_BrightCal_Tech2]: 'CalDAV',
    [ShowcaseStrings.Feat_BrightCal_Tech3]: 'ECIES Encryption',
    [ShowcaseStrings.Feat_BrightCal_Tech4]: 'iTIP/iMIP',
    [ShowcaseStrings.Feat_BrightCal_HL1]:
      'RFC 5545 iCalendar format with full VEVENT, VTODO, VJOURNAL, and VFREEBUSY support',
    [ShowcaseStrings.Feat_BrightCal_HL2]:
      'CalDAV server protocol for native sync with Apple Calendar, Thunderbird, and Android',
    [ShowcaseStrings.Feat_BrightCal_HL3]:
      'End-to-end encrypted events stored as ECIES-encrypted blocks in the Owner-Free Filesystem',
    [ShowcaseStrings.Feat_BrightCal_HL4]:
      'Granular sharing: view free/busy only, view details, edit, or delegate per-calendar per-user',
    [ShowcaseStrings.Feat_BrightCal_HL5]:
      'Meeting invitations via iTIP/iMIP with BrightMail integration and RSVP tracking',
    [ShowcaseStrings.Feat_BrightCal_HL6]:
      'Conflict detection and availability queries across shared calendars with free/busy aggregation',
    [ShowcaseStrings.Feat_BrightCal_HL7]:
      'Booking pages with configurable availability windows, buffer times, and confirmation flows',
    [ShowcaseStrings.Feat_BrightCal_HL8]:
      'Recurring event support with RRULE, EXDATE, and per-occurrence override handling',
    [ShowcaseStrings.Feat_BrightCal_HL9]:
      'Multi-timezone display with automatic DST handling and per-event timezone pinning',
    [ShowcaseStrings.Feat_BrightCal_HL10]:
      'Day/week/month/agenda UI widgets with drag-and-drop rescheduling and inline editing',
    [ShowcaseStrings.Feat_BrightChat_Desc]:
      'Discord-competitive communication platform with Signal-grade end-to-end encryption. Direct messaging, group chats, and channels with real-time presence, typing indicators, and role-based permissions.',
    [ShowcaseStrings.Feat_BrightChat_Cat]: 'Network',
    [ShowcaseStrings.Feat_BrightChat_Tech1]: 'E2E Encryption',
    [ShowcaseStrings.Feat_BrightChat_Tech2]: 'WebSocket',
    [ShowcaseStrings.Feat_BrightChat_Tech3]: 'Key Rotation',
    [ShowcaseStrings.Feat_BrightChat_Tech4]: 'RBAC',
    [ShowcaseStrings.Feat_BrightChat_HL1]:
      'Direct messaging for person-to-person encrypted conversations',
    [ShowcaseStrings.Feat_BrightChat_HL2]:
      'Group chats with shared encryption and automatic key rotation',
    [ShowcaseStrings.Feat_BrightChat_HL3]:
      'Channels with four visibility modes: public/private/secret/invisible',
    [ShowcaseStrings.Feat_BrightChat_HL4]:
      'Real-time presence system: online/offline/idle/DND',
    [ShowcaseStrings.Feat_BrightChat_HL5]:
      'Role-based permissions: Owner/Admin/Moderator/Member',
    [ShowcaseStrings.Feat_BrightChat_HL6]:
      'Typing indicators, reactions, and message edits via WebSocket',
    [ShowcaseStrings.Feat_BrightChat_HL7]:
      'Time-limited, usage-limited invite tokens for channels',
    [ShowcaseStrings.Feat_BrightChat_HL8]:
      'Full-text message search within channel history',
    [ShowcaseStrings.Feat_BrightChat_HL9]:
      'Seamless conversation promotion from DMs to groups',
    [ShowcaseStrings.Feat_BrightPass_Desc]:
      '1Password-competitive password keychain with VCBL architecture for efficient encrypted credential storage. TOTP/2FA, breach detection, emergency access, and import from major password managers.',
    [ShowcaseStrings.Feat_BrightPass_Cat]: 'Identity',
    [ShowcaseStrings.Feat_BrightPass_Tech1]: 'VCBL',
    [ShowcaseStrings.Feat_BrightPass_Tech2]: 'TOTP',
    [ShowcaseStrings.Feat_BrightPass_Tech3]: 'AES-256-GCM',
    [ShowcaseStrings.Feat_BrightPass_Tech4]: 'Shamir Sharing',
    [ShowcaseStrings.Feat_BrightPass_HL1]:
      'VCBL (Vault Constituent Block List) for efficient encrypted storage',
    [ShowcaseStrings.Feat_BrightPass_HL2]:
      'Multiple entry types: login, secure note, credit card, identity',
    [ShowcaseStrings.Feat_BrightPass_HL3]:
      'Cryptographically secure password generation with constraints',
    [ShowcaseStrings.Feat_BrightPass_HL4]:
      'TOTP/2FA support with QR code generation for authenticators',
    [ShowcaseStrings.Feat_BrightPass_HL5]:
      'k-anonymity breach detection via Have I Been Pwned API',
    [ShowcaseStrings.Feat_BrightPass_HL6]:
      'Append-only encrypted audit logging for all vault operations',
    [ShowcaseStrings.Feat_BrightPass_HL7]:
      "Emergency access via Shamir's Secret Sharing for recovery",
    [ShowcaseStrings.Feat_BrightPass_HL8]:
      'Multi-member vault sharing with ECIES per-recipient encryption',
    [ShowcaseStrings.Feat_BrightPass_HL9]:
      'Import from 1Password, LastPass, Bitwarden, Chrome, Firefox, KeePass, Dashlane',
    [ShowcaseStrings.Feat_BrightPass_HL10]:
      'Browser extension autofill API ready',
    [ShowcaseStrings.Feat_BrightVote_Desc]:
      'Privacy-preserving elections using Paillier homomorphic encryption with ECDH-derived keys. Supports 15+ voting methods from simple plurality to complex ranked choice with government compliance features.',
    [ShowcaseStrings.Feat_BrightVote_Cat]: 'Governance',
    [ShowcaseStrings.Feat_BrightVote_Tech1]: 'Paillier Encryption',
    [ShowcaseStrings.Feat_BrightVote_Tech2]: 'ECDH',
    [ShowcaseStrings.Feat_BrightVote_Tech3]: 'Homomorphic Cryptography',
    [ShowcaseStrings.Feat_BrightVote_HL1]:
      'ECDH-to-Paillier bridge derives homomorphic keys from ECDSA/ECDH keys',
    [ShowcaseStrings.Feat_BrightVote_HL2]:
      'Privacy-preserving vote aggregation via homomorphic addition',
    [ShowcaseStrings.Feat_BrightVote_HL3]:
      '15+ voting methods: Plurality, Approval, Weighted, Borda, Score, Ranked Choice, IRV, STAR, STV, Quadratic, Consensus, etc.',
    [ShowcaseStrings.Feat_BrightVote_HL4]:
      'Security classifications: fully homomorphic, multi-round, insecure',
    [ShowcaseStrings.Feat_BrightVote_HL5]:
      'Government compliance: immutable audit logs, public bulletin board, verifiable receipts',
    [ShowcaseStrings.Feat_BrightVote_HL6]:
      'Hierarchical aggregation: Precinct → County → State → National',
    [ShowcaseStrings.Feat_BrightVote_HL7]:
      '128-bit security level with Miller-Rabin primality testing (256 rounds)',
    [ShowcaseStrings.Feat_BrightVote_HL8]:
      'Cross-platform determinism (Node.js and browser environments)',
    [ShowcaseStrings.Feat_BrightVote_HL9]:
      'Timing attack resistance with constant-time operations',
    [ShowcaseStrings.Feat_BrightHub_Desc]:
      'Twitter-competitive decentralized social network with unique FontAwesome icon markup syntax. Posts, threads, DMs, connection lists, hubs for privacy, and real-time notifications via WebSocket.',
    [ShowcaseStrings.Feat_BrightHub_Cat]: 'Network',
    [ShowcaseStrings.Feat_BrightHub_Tech1]: 'WebSocket',
    [ShowcaseStrings.Feat_BrightHub_Tech2]: 'Real-time Messaging',
    [ShowcaseStrings.Feat_BrightHub_Tech3]: 'Connection Management',
    [ShowcaseStrings.Feat_BrightHub_HL1]:
      'Posts with 280-char limit, markdown, and unique {{icon}} syntax for FontAwesome',
    [ShowcaseStrings.Feat_BrightHub_HL2]:
      'Threaded conversations with 10-level nesting and reply hierarchies',
    [ShowcaseStrings.Feat_BrightHub_HL3]:
      'Connection lists, categories, and hubs for organizing relationships',
    [ShowcaseStrings.Feat_BrightHub_HL4]:
      'Direct messaging with read receipts, typing indicators, and reactions',
    [ShowcaseStrings.Feat_BrightHub_HL5]:
      'Group conversations (up to 50 participants) with admin roles',
    [ShowcaseStrings.Feat_BrightHub_HL6]:
      'Message requests for non-followers with accept/decline workflow',
    [ShowcaseStrings.Feat_BrightHub_HL7]:
      'Real-time notifications via WebSocket with smart grouping',
    [ShowcaseStrings.Feat_BrightHub_HL8]:
      'Notification preferences: quiet hours, DND mode, per-category settings',
    [ShowcaseStrings.Feat_BrightHub_HL9]:
      'Protected accounts with follow request approval workflow',
    [ShowcaseStrings.Feat_BrightHub_HL10]:
      'Connection insights: strength calculation, mutual connections, suggestions',
    [ShowcaseStrings.Feat_BrightHub_HL11]:
      'Hub-based content visibility for private group sharing',
    [ShowcaseStrings.Feat_BrightHub_HL12]:
      'Rich text formatting with XSS prevention and emoji support',
    [ShowcaseStrings.Feat_Anonymity_Title]: 'Brokered Anonymity & BrightTrust',
    [ShowcaseStrings.Feat_Anonymity_Desc]:
      "Sophisticated privacy mechanism enabling anonymous operations while maintaining accountability. Identity information encrypted and split using Shamir's Secret Sharing, reconstructable only through majority BrightTrust consensus.",
    [ShowcaseStrings.Feat_Anonymity_Cat]: 'Governance',
    [ShowcaseStrings.Feat_Anonymity_Tech1]: "Shamir's Secret Sharing",
    [ShowcaseStrings.Feat_Anonymity_Tech2]: 'Forward Error Correction',
    [ShowcaseStrings.Feat_Anonymity_Tech3]: 'BrightTrust Consensus',
    [ShowcaseStrings.Feat_Anonymity_HL1]:
      'Post anonymously with encrypted identity backup',
    [ShowcaseStrings.Feat_Anonymity_HL2]:
      'Identity shards distributed across ~24 BrightTrust members',
    [ShowcaseStrings.Feat_Anonymity_HL3]:
      'Majority vote required to reconstruct identity information',
    [ShowcaseStrings.Feat_Anonymity_HL4]:
      'Time-limited accountability - data expires after statute of limitations',
    [ShowcaseStrings.Feat_Anonymity_HL5]:
      'Legal compliance mechanism for FISA warrants and court orders',
    [ShowcaseStrings.Feat_Anonymity_HL6]:
      'Permanent privacy protection after expiration period',
    [ShowcaseStrings.Feat_Encryption_Title]: 'Advanced Encryption Stack',
    [ShowcaseStrings.Feat_Encryption_Desc]:
      'State-of-the-art encryption combining ECIES for key derivation with AES-256-GCM for file security. Complete cryptosystem with BIP39/32 authentication and SECP256k1 elliptic curve cryptography.',
    [ShowcaseStrings.Feat_Encryption_Cat]: 'Cryptography',
    [ShowcaseStrings.Feat_Encryption_Tech1]: 'ECIES',
    [ShowcaseStrings.Feat_Encryption_Tech2]: 'AES-256-GCM',
    [ShowcaseStrings.Feat_Encryption_Tech3]: 'BIP39/32',
    [ShowcaseStrings.Feat_Encryption_Tech4]: 'SECP256k1',
    [ShowcaseStrings.Feat_Encryption_HL1]:
      'ECIES encryption with user-specific key derivation',
    [ShowcaseStrings.Feat_Encryption_HL2]:
      'AES-256-GCM for authenticated file encryption',
    [ShowcaseStrings.Feat_Encryption_HL3]:
      'BIP39/32 mnemonic-based authentication',
    [ShowcaseStrings.Feat_Encryption_HL4]:
      'SECP256k1 elliptic curve (Ethereum-compatible keyspace)',
    [ShowcaseStrings.Feat_Encryption_HL5]:
      'Verified block-level data integrity with XOR functionality',
    [ShowcaseStrings.Feat_Encryption_HL6]:
      'Cross-platform cryptographic operations',
    [ShowcaseStrings.Feat_Storage_Title]: 'Decentralized Storage Network',
    [ShowcaseStrings.Feat_Storage_Desc]:
      'Peer-to-peer distributed file system that monetizes unused storage on personal devices. IPFS-like architecture with energy-efficient proof-of-work and reputation-based incentives.',
    [ShowcaseStrings.Feat_Storage_Cat]: 'Network',
    [ShowcaseStrings.Feat_Storage_Tech1]: 'P2P Networks',
    [ShowcaseStrings.Feat_Storage_Tech2]: 'DHT',
    [ShowcaseStrings.Feat_Storage_Tech3]: 'Block Replication',
    [ShowcaseStrings.Feat_Storage_HL1]:
      'Utilize wasted storage space on personal computers and devices',
    [ShowcaseStrings.Feat_Storage_HL2]:
      'Distributed Hash Table (DHT) for efficient block tracking',
    [ShowcaseStrings.Feat_Storage_HL3]:
      'Configurable block durability and accessibility requirements',
    [ShowcaseStrings.Feat_Storage_HL4]:
      'Dynamic replication based on block usefulness and access patterns',
    [ShowcaseStrings.Feat_Storage_HL5]:
      'Energy-efficient alternative to traditional proof-of-work mining',
    [ShowcaseStrings.Feat_Storage_HL6]:
      'Storage credits and bandwidth compensation for node operators',
    [ShowcaseStrings.Feat_Sealing_Title]: 'BrightTrust-Based Document Sealing',
    [ShowcaseStrings.Feat_Sealing_Desc]:
      'Advanced document protection with customizable threshold requirements for access restoration. Groups can seal sensitive information requiring configurable majority consensus to unseal.',
    [ShowcaseStrings.Feat_Sealing_Cat]: 'Governance',
    [ShowcaseStrings.Feat_Sealing_Tech1]: 'Threshold Cryptography',
    [ShowcaseStrings.Feat_Sealing_Tech2]: 'Secret Sharing',
    [ShowcaseStrings.Feat_Sealing_Tech3]: 'Multi-Party Computation',
    [ShowcaseStrings.Feat_Sealing_HL1]:
      'Seal documents with configurable quorum thresholds (e.g., 3-of-5, 7-of-10)',
    [ShowcaseStrings.Feat_Sealing_HL2]:
      'Distributed shard storage across trusted BrightTrust members',
    [ShowcaseStrings.Feat_Sealing_HL3]:
      'Mathematical guarantee of security until threshold reached',
    [ShowcaseStrings.Feat_Sealing_HL4]:
      'Flexible unsealing for legal compliance or group decisions',
    [ShowcaseStrings.Feat_Sealing_HL5]:
      'Supports organizational governance and compliance workflows',
    [ShowcaseStrings.Feat_Sealing_HL6]:
      'Time-based expiration for automatic privacy protection',
    [ShowcaseStrings.Feat_BrightID_Desc]:
      'Sophisticated identity management ensuring user privacy and control. Support for registered aliases, anonymous posting, and cryptographic identity verification.',
    [ShowcaseStrings.Feat_BrightID_Cat]: 'Identity',
    [ShowcaseStrings.Feat_BrightID_Tech1]: 'Public Key Infrastructure',
    [ShowcaseStrings.Feat_BrightID_Tech2]: 'BIP39/32',
    [ShowcaseStrings.Feat_BrightID_Tech3]: 'Identity Management',
    [ShowcaseStrings.Feat_BrightID_HL1]:
      'BIP39/32 mnemonic-based identity generation',
    [ShowcaseStrings.Feat_BrightID_HL2]:
      'Multiple registered aliases per user account',
    [ShowcaseStrings.Feat_BrightID_HL3]:
      'Anonymous posting with optional identity recovery',
    [ShowcaseStrings.Feat_BrightID_HL4]:
      'Public key-based authentication (SECP256k1)',
    [ShowcaseStrings.Feat_BrightID_HL5]:
      'Forward Error Correction for identity backup',
    [ShowcaseStrings.Feat_BrightID_HL6]:
      'Privacy-preserving identity verification',
    [ShowcaseStrings.Feat_Reputation_Title]: 'Reputation & Energy Tracking',
    [ShowcaseStrings.Feat_Reputation_Desc]:
      'Revolutionary reputation system that tracks energy costs in Joules. Good actors enjoy minimal proof-of-work requirements while bad actors face increased computational burdens.',
    [ShowcaseStrings.Feat_Reputation_Cat]: 'Network',
    [ShowcaseStrings.Feat_Reputation_Tech1]: 'Proof of Work',
    [ShowcaseStrings.Feat_Reputation_Tech2]: 'Reputation Systems',
    [ShowcaseStrings.Feat_Reputation_Tech3]: 'Energy Accounting',
    [ShowcaseStrings.Feat_Reputation_HL1]:
      'Energy costs measured in actual Joules for real-world correlation',
    [ShowcaseStrings.Feat_Reputation_HL2]:
      'Dynamic proof-of-work based on user reputation',
    [ShowcaseStrings.Feat_Reputation_HL3]:
      'Content creators rewarded as their content is consumed',
    [ShowcaseStrings.Feat_Reputation_HL4]:
      'Bad actors throttled with increased computational requirements',
    [ShowcaseStrings.Feat_Reputation_HL5]:
      'Storage and bandwidth costs tracked and compensated',
    [ShowcaseStrings.Feat_Reputation_HL6]:
      'Incentivizes positive contributions and quality content',
    [ShowcaseStrings.Feat_BlockTemp_Title]: 'Block Temperature & Lifecycle',
    [ShowcaseStrings.Feat_BlockTemp_Desc]:
      "Intelligent block management with hot/cold storage tiers. Frequently accessed blocks stay 'hot' with high replication, while unused blocks cool down and may expire.",
    [ShowcaseStrings.Feat_BlockTemp_Cat]: 'Storage',
    [ShowcaseStrings.Feat_BlockTemp_Tech1]: 'Storage Tiering',
    [ShowcaseStrings.Feat_BlockTemp_Tech2]: 'Block Lifecycle',
    [ShowcaseStrings.Feat_BlockTemp_Tech3]: 'Access Patterns',
    [ShowcaseStrings.Feat_BlockTemp_HL1]:
      "'Keep Until At Least' contracts for minimum storage duration",
    [ShowcaseStrings.Feat_BlockTemp_HL2]:
      'Block usefulness increases with access, staleness decreases',
    [ShowcaseStrings.Feat_BlockTemp_HL3]:
      'Dynamic replication based on access patterns and temperature',
    [ShowcaseStrings.Feat_BlockTemp_HL4]:
      'Auto-extension of contracts for frequently accessed blocks',
    [ShowcaseStrings.Feat_BlockTemp_HL5]:
      'Energy credits returned for blocks that prove useful',
    [ShowcaseStrings.Feat_BlockTemp_HL6]:
      'Configurable durability and accessibility requirements',
    [ShowcaseStrings.Feat_ZeroMining_Title]: 'Zero Mining Waste',
    [ShowcaseStrings.Feat_ZeroMining_Desc]:
      "Built on Ethereum's foundation but engineered without proof-of-work constraints. All computational work serves useful purposes - storage, verification, and network operations.",
    [ShowcaseStrings.Feat_ZeroMining_Cat]: 'Network',
    [ShowcaseStrings.Feat_ZeroMining_Tech1]: 'Ethereum Keyspace',
    [ShowcaseStrings.Feat_ZeroMining_Tech2]: 'Efficient Consensus',
    [ShowcaseStrings.Feat_ZeroMining_Tech3]: 'Green Blockchain',
    [ShowcaseStrings.Feat_ZeroMining_HL1]:
      'No wasteful mining - all computation serves useful purposes',
    [ShowcaseStrings.Feat_ZeroMining_HL2]:
      'Ethereum-compatible keyspace and cryptography (SECP256k1)',
    [ShowcaseStrings.Feat_ZeroMining_HL3]:
      'Proof-of-work used only for transaction throttling',
    [ShowcaseStrings.Feat_ZeroMining_HL4]:
      'Energy-efficient consensus mechanisms',
    [ShowcaseStrings.Feat_ZeroMining_HL5]:
      'Sustainable blockchain without environmental impact',
    [ShowcaseStrings.Feat_ZeroMining_HL6]:
      'Focus on storage and computation, not artificial scarcity',
    [ShowcaseStrings.Feat_CrossPlatform_Title]: 'Cross-Platform Determinism',
    [ShowcaseStrings.Feat_CrossPlatform_Desc]:
      'Identical cryptographic operations across Node.js and browser environments. Deterministic key generation ensures consistent results regardless of platform.',
    [ShowcaseStrings.Feat_CrossPlatform_Cat]: 'Cryptography',
    [ShowcaseStrings.Feat_CrossPlatform_Tech1]: 'Node.js',
    [ShowcaseStrings.Feat_CrossPlatform_Tech2]: 'Browser Crypto',
    [ShowcaseStrings.Feat_CrossPlatform_Tech3]: 'Deterministic Algorithms',
    [ShowcaseStrings.Feat_CrossPlatform_HL1]:
      'Unified cryptographic operations across platforms',
    [ShowcaseStrings.Feat_CrossPlatform_HL2]:
      'Deterministic random bit generation (HMAC-DRBG)',
    [ShowcaseStrings.Feat_CrossPlatform_HL3]:
      'Consistent Paillier key derivation from ECDH keys',
    [ShowcaseStrings.Feat_CrossPlatform_HL4]:
      'Browser and Node.js compatibility',
    [ShowcaseStrings.Feat_CrossPlatform_HL5]:
      'Reproducible cryptographic results',
    [ShowcaseStrings.Feat_CrossPlatform_HL6]:
      'Cross-platform testing and verification',
    [ShowcaseStrings.Feat_Contracts_Title]: 'Digital Contracts & Governance',
    [ShowcaseStrings.Feat_Contracts_Desc]:
      'Smart contract capabilities for decentralized applications. BrightTrust-based governance with configurable voting thresholds for network decisions and policy enforcement.',
    [ShowcaseStrings.Feat_Contracts_Cat]: 'Governance',
    [ShowcaseStrings.Feat_Contracts_Tech1]: 'Smart Contracts',
    [ShowcaseStrings.Feat_Contracts_Tech2]: 'Governance',
    [ShowcaseStrings.Feat_Contracts_Tech3]: 'Voting Systems',
    [ShowcaseStrings.Feat_Contracts_HL1]:
      'Digital contract execution on decentralized network',
    [ShowcaseStrings.Feat_Contracts_HL2]:
      'BrightTrust-based decision making for network governance',
    [ShowcaseStrings.Feat_Contracts_HL3]:
      'Configurable majority requirements for different actions',
    [ShowcaseStrings.Feat_Contracts_HL4]:
      'Homomorphic voting for privacy-preserving governance',
    [ShowcaseStrings.Feat_Contracts_HL5]:
      'Reputation-weighted voting mechanisms',
    [ShowcaseStrings.Feat_Contracts_HL6]:
      'Transparent and auditable governance processes',
    [ShowcaseStrings.Feat_SecretsJS_Title]: 'Secrets.js (fork)',
    [ShowcaseStrings.Feat_SecretsJS_Desc]:
      "Enhanced implementation of Shamir's Secret Sharing for secure data splitting and reconstruction. Pure TypeScript with native browser support, cryptographically audited, and optimized for splitting any secret (passwords, keys, files) into threshold-recoverable shares.",
    [ShowcaseStrings.Feat_SecretsJS_Cat]: 'Cryptography',
    [ShowcaseStrings.Feat_SecretsJS_Tech1]: "Shamir's Secret Sharing",
    [ShowcaseStrings.Feat_SecretsJS_Tech2]: 'Data Security',
    [ShowcaseStrings.Feat_SecretsJS_Tech3]: 'TypeScript',
    [ShowcaseStrings.Feat_SecretsJS_Tech4]: 'CSPRNG',
    [ShowcaseStrings.Feat_SecretsJS_HL1]:
      'Divide secrets into n shares with configurable t-of-n threshold recovery',
    [ShowcaseStrings.Feat_SecretsJS_HL2]:
      'Information-theoretically secure - shares below threshold reveal no information',
    [ShowcaseStrings.Feat_SecretsJS_HL3]:
      'Cure53 security audit (July 2019) with zero issues found',
    [ShowcaseStrings.Feat_SecretsJS_HL4]:
      'Native browser support without polyfills (crypto.getRandomValues)',
    [ShowcaseStrings.Feat_SecretsJS_HL5]:
      'Cross-platform deterministic operations (Node.js and browser)',
    [ShowcaseStrings.Feat_SecretsJS_HL6]:
      'Full TypeScript support with comprehensive type definitions',
    [ShowcaseStrings.Feat_SecretsJS_HL7]:
      'Convert passwords, files, and keys to/from hex with automatic padding',
    [ShowcaseStrings.Feat_SecretsJS_HL8]:
      'Generate new shares dynamically from existing shares',
    [ShowcaseStrings.Feat_SecretsJS_HL9]:
      'Configurable Galois field (3-20 bits) supporting up to 1,048,575 shares',
    [ShowcaseStrings.Feat_Burnbag_Desc]:
      'Zero-knowledge secure storage with automated fail-safe protocols. Cryptographic erasure destroys the Recipe (map + keys), rendering scattered encrypted blocks permanently unrecoverable on trigger.',
    [ShowcaseStrings.Feat_Burnbag_Cat]: 'Cryptography',
    [ShowcaseStrings.Feat_Burnbag_Tech1]: 'Cryptographic Erasure',
    [ShowcaseStrings.Feat_Burnbag_Tech2]: "Dead Man's Switch",
    [ShowcaseStrings.Feat_Burnbag_Tech3]: 'Canary Protocol',
    [ShowcaseStrings.Feat_Burnbag_HL1]:
      'Zero-knowledge architecture: service provider cannot access user data under normal circumstances',
    [ShowcaseStrings.Feat_Burnbag_HL2]:
      'Cryptographic erasure: destroying the Recipe makes scattered blocks permanently unrecoverable',
    [ShowcaseStrings.Feat_Burnbag_HL3]:
      "Dead man's switch: heartbeat monitoring triggers automatic Recipe destruction on inactivity",
    [ShowcaseStrings.Feat_Burnbag_HL4]:
      'Canary Protocol: rules engine with third-party API monitoring (Twitter, Fitbit, Google, GitHub)',
    [ShowcaseStrings.Feat_Burnbag_HL5]:
      'Duress detection: special duress codes trigger destruction protocols instead of normal access',
    [ShowcaseStrings.Feat_Burnbag_HL6]:
      'Configurable protocol actions: file deletion, data distribution, public disclosure, or custom responses',
    [ShowcaseStrings.Feat_Burnbag_HL7]:
      'Dual key architecture: user-controlled BIP39 keys plus optional system escrow keys for protocol execution',
    [ShowcaseStrings.Feat_Burnbag_HL8]:
      'Succession quorum: pre-authorized trusted contacts for secure data release or recovery',
    [ShowcaseStrings.Feat_Burnbag_HL9]:
      'Mutation-on-read: any unauthorized Recipe access triggers permanent, immutable ledger mutation',
    [ShowcaseStrings.Feat_Burnbag_HL10]:
      'Configurable trust levels: zero-trust, conditional trust, or hybrid per-file sensitivity',
    [ShowcaseStrings.Feat_Burnbag_HL11]:
      'Multi-language support: English, French, Spanish, Ukrainian, and Mandarin Chinese',
    [ShowcaseStrings.Feat_Burnbag_HL12]:
      'ECIES encryption with secp256k1 keys and AES-256-GCM for file security',

    // BrightChart (EMR) Feature
    [ShowcaseStrings.Feat_BrightChart_Desc]:
      'A patient-owned electronic medical record built on BrightChain cryptography. Your health data stays yours — encrypted, decentralized, and accessible only with your keys.',
    [ShowcaseStrings.Feat_BrightChart_Cat]: 'Identity',
    [ShowcaseStrings.Feat_BrightChart_Tech1]: 'Owner-Free EMR',
    [ShowcaseStrings.Feat_BrightChart_Tech2]: 'End-to-End Encryption',
    [ShowcaseStrings.Feat_BrightChart_Tech3]: 'Patient-Controlled Access',
    [ShowcaseStrings.Feat_BrightChart_HL1]:
      'Patient owns and controls all medical records via cryptographic keys',
    [ShowcaseStrings.Feat_BrightChart_HL2]:
      'End-to-end encrypted health data stored on BrightChain — no central server to breach',
    [ShowcaseStrings.Feat_BrightChart_HL3]:
      'Granular consent: share specific records with providers using BrightTrust delegation',
    [ShowcaseStrings.Feat_BrightChart_HL4]:
      'Immutable audit trail for every access, edit, and share event',
    [ShowcaseStrings.Feat_BrightChart_HL5]:
      'Portable across providers — no vendor lock-in, no data hostage',
    [ShowcaseStrings.Feat_BrightChart_HL6]:
      'Emergency access via Shamir secret sharing with configurable quorum',
    [ShowcaseStrings.Feat_BrightChart_HL7]:
      'Versioned medical history with cryptographic integrity verification',
    [ShowcaseStrings.Feat_BrightChart_HL8]:
      'Provider-signed entries ensure authenticity of diagnoses and prescriptions',
    [ShowcaseStrings.Feat_BrightChart_HL9]:
      'Offline-capable: encrypted records cached locally, synced when connected',
    [ShowcaseStrings.Feat_BrightChart_HL10]:
      'Built-in Digital Burnbag for sensitive records requiring guaranteed destruction',
    [ShowcaseStrings.Feat_BrightChart_HL11]:
      'Interoperable data layer designed for FHIR-compatible health record exchange',
    [ShowcaseStrings.Feat_BrightChart_HL12]:
      'Zero-knowledge proofs enable insurance verification without exposing full medical history',

    // Remaining alert/sub-component strings
    [ShowcaseStrings.Soup_Time]: 'Time',
    [ShowcaseStrings.Soup_AlertRetrieveFailed]:
      'Failed to retrieve file: {ERROR}',
    [ShowcaseStrings.Soup_AlertUploadCBLOnly]: 'Please upload a .cbl file',
    [ShowcaseStrings.Soup_AlertCBLLoaded]:
      'CBL loaded! File: {NAME} ({BLOCKS} blocks). You can now retrieve the file if all blocks are in the soup.',
    [ShowcaseStrings.Soup_AlertParseCBLFailed]: 'Failed to parse CBL: {ERROR}',
    [ShowcaseStrings.Soup_AlertReconstructed]:
      'File reconstructed successfully! Size: {SIZE} bytes. The file has been downloaded and added to receipts.',
    [ShowcaseStrings.Soup_AlertMagnetFailed]:
      'Failed to process magnet URL: {ERROR}',
    [ShowcaseStrings.Soup_AlertMessageSent]: 'Message sent and stored in soup!',
    [ShowcaseStrings.Soup_AlertSendFailed]: 'Failed to send message: {ERROR}',
    [ShowcaseStrings.Soup_AlertMessageRetrieved]:
      'Message retrieved from soup: {TEXT}',
    [ShowcaseStrings.Soup_AlertRetrieveMessageFailed]:
      'Failed to retrieve message: {ERROR}',
    [ShowcaseStrings.Soup_AlertCopied]: 'Magnet URL copied to clipboard!',
    [ShowcaseStrings.Anim_PauseBtn]: 'Pause Animation',
    [ShowcaseStrings.Anim_PlayBtn]: 'Play Animation',
    [ShowcaseStrings.Anim_ResetBtn]: 'Reset Animation',
    [ShowcaseStrings.Anim_SpeedLabel]: 'Speed: {SPEED}x',
    [ShowcaseStrings.Anim_PerfTitle]: '🔧 Performance Monitor',
    [ShowcaseStrings.Anim_PerfFrameRate]: 'Frame Rate:',
    [ShowcaseStrings.Anim_PerfFrameTime]: 'Frame Time:',
    [ShowcaseStrings.Anim_PerfDropped]: 'Dropped Frames:',
    [ShowcaseStrings.Anim_PerfMemory]: 'Memory:',
    [ShowcaseStrings.Anim_PerfSequences]: 'Sequences:',
    [ShowcaseStrings.Anim_PerfErrors]: 'Errors:',
    [ShowcaseStrings.Anim_WhatHappening]: "What's happening:",
    [ShowcaseStrings.Anim_DurationLabel]: 'Duration:',
    [ShowcaseStrings.Anim_SizeInfo]: 'Size: {SIZE} bytes | Blocks: {BLOCKS}',

    // Educational/Encoding components
    [ShowcaseStrings.Edu_CloseTooltip]: 'Close tooltip',
    [ShowcaseStrings.Edu_WhatsHappening]: "🔍 What's Happening",
    [ShowcaseStrings.Edu_WhyItMatters]: '💡 Why It Matters',
    [ShowcaseStrings.Edu_TechnicalDetails]: '⚙️ Technical Details',
    [ShowcaseStrings.Edu_RelatedConcepts]: '🔗 Related Concepts',
    [ShowcaseStrings.Edu_VisualCues]: '👁️ Visual Cues',
    [ShowcaseStrings.Edu_GetHelp]: 'Get help with this step',
    [ShowcaseStrings.Edu_UnderstandContinue]: '✅ I Understand - Continue',
    [ShowcaseStrings.Edu_SkipStep]: '⏭️ Skip This Step',
    [ShowcaseStrings.Edu_GlossaryTitle]: '📚 BrightChain Concept Glossary',
    [ShowcaseStrings.Edu_CloseGlossary]: 'Close glossary',
    [ShowcaseStrings.Edu_BackToGlossary]: '← Back to Glossary',
    [ShowcaseStrings.Edu_Definition]: 'Definition',
    [ShowcaseStrings.Edu_TechnicalDefinition]: 'Technical Definition',
    [ShowcaseStrings.Edu_Examples]: 'Examples',
    [ShowcaseStrings.Edu_RelatedTerms]: 'Related Terms',
    [ShowcaseStrings.Edu_SearchPlaceholder]: 'Search concepts...',
    [ShowcaseStrings.Edu_ProcessOverview]: 'Process Overview',
    [ShowcaseStrings.Edu_WhatWeAccomplished]: 'What We Accomplished',
    [ShowcaseStrings.Edu_TechnicalOutcomes]: 'Technical Outcomes',
    [ShowcaseStrings.Edu_WhatsNext]: "What's Next?",
    [ShowcaseStrings.Edu_LearningProgress]: 'Learning Progress',
    [ShowcaseStrings.Edu_StepsCompleted]:
      '{COMPLETED} of {TOTAL} steps completed',
    [ShowcaseStrings.Enc_Title]: '🎬 File Encoding Animation',
    [ShowcaseStrings.Enc_Subtitle]:
      'Watch as your file is transformed into BrightChain blocks',
    [ShowcaseStrings.Enc_ChunksTitle]: '📦 File Chunks ({COUNT})',
    [ShowcaseStrings.Enc_ChunksSubtitle]:
      'Each chunk will become a block in the soup',
    [ShowcaseStrings.Enc_EduWhatsHappening]: "🎓 What's Happening Now",
    [ShowcaseStrings.Enc_TechDetails]: 'Technical Details:',
    [ShowcaseStrings.Enc_BlockSizeInfo]: 'Block size: {SIZE} bytes',
    [ShowcaseStrings.Enc_ExpectedChunks]: 'Expected chunks: {COUNT}',
    [ShowcaseStrings.Enc_ChunkBecomesBlock]:
      'Each chunk becomes one block in the soup',
    [ShowcaseStrings.Enc_WhyPadding]: 'Why Padding?',
    [ShowcaseStrings.Enc_PaddingSameSize]: 'All blocks must be the same size',
    [ShowcaseStrings.Enc_PaddingPreventsAnalysis]:
      'Random padding prevents data analysis',
    [ShowcaseStrings.Enc_PaddingRemoved]:
      'Padding is removed during reconstruction',
    [ShowcaseStrings.Enc_ChecksumPurpose]: 'Checksum Purpose:',
    [ShowcaseStrings.Enc_EnsuresIntegrity]: 'Ensures data integrity',
    [ShowcaseStrings.Enc_UniqueIdentifier]: 'Used as unique block identifier',
    [ShowcaseStrings.Enc_EnablesVerification]:
      'Enables verification during retrieval',

    // ProcessCompletionSummary
    [ShowcaseStrings.Edu_KeyLearningPoints]: '🧠 Key Learning Points',
    [ShowcaseStrings.Edu_CloseSummary]: 'Close summary',
    [ShowcaseStrings.Edu_Overview]: 'Overview',
    [ShowcaseStrings.Edu_Achievements]: 'Achievements',
    [ShowcaseStrings.Edu_Technical]: 'Technical',
    [ShowcaseStrings.Edu_NextSteps]: 'Next Steps',
    [ShowcaseStrings.Edu_Previous]: '← Previous',
    [ShowcaseStrings.Edu_Next]: 'Next →',
    [ShowcaseStrings.Edu_Finish]: 'Finish',

    // EducationalModeControls
    [ShowcaseStrings.Edu_EducationalMode]: '🎓 Educational Mode',
    [ShowcaseStrings.Edu_AnimationSpeed]: 'Animation Speed:',
    [ShowcaseStrings.Edu_SpeedVerySlow]: '0.25x (Very Slow)',
    [ShowcaseStrings.Edu_SpeedSlow]: '0.5x (Slow)',
    [ShowcaseStrings.Edu_SpeedModerate]: '0.75x (Moderate)',
    [ShowcaseStrings.Edu_SpeedNormal]: '1x (Normal)',
    [ShowcaseStrings.Edu_SpeedFast]: '1.5x (Fast)',
    [ShowcaseStrings.Edu_SpeedVeryFast]: '2x (Very Fast)',
    [ShowcaseStrings.Edu_StepByStep]: 'Step-by-Step Mode',
    [ShowcaseStrings.Edu_ShowTooltips]: 'Show Tooltips',
    [ShowcaseStrings.Edu_ShowExplanations]: 'Show Explanations',
    [ShowcaseStrings.Edu_AutoAdvance]: 'Auto Advance Steps',

    // Privacy Policy Page
    [ShowcaseStrings.PP_Title]: 'Privacy Policy',
    [ShowcaseStrings.PP_LastUpdated]: 'Last Updated: April 20, 2026',
    [ShowcaseStrings.PP_BackToHome]: '← Back to Home',

    // Section 1: Introduction
    [ShowcaseStrings.PP_S1_Title]: '1. Introduction',
    [ShowcaseStrings.PP_S1_P1]:
      'BrightChain is an open-source decentralized platform operated by Digital Defiance, a 501(c)(3) nonprofit organization ("we," "us," or "our"). This Privacy Policy describes how we collect, use, store, and disclose information when you use the BrightChain platform, website, applications, and related services (collectively, the "Services").',
    [ShowcaseStrings.PP_S1_P2]:
      'By accessing or using the Services you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree, you must not use the Services.',

    // Section 2: How BrightChain Works
    [ShowcaseStrings.PP_S2_Title]:
      '2. How BrightChain Works — Architectural Context',
    [ShowcaseStrings.PP_S2_P1]:
      'BrightChain is built on the Owner-Free Filesystem (OFF) model. All data stored on the network is broken into fixed-size blocks, XOR\'d with cryptographically random blocks (a process called "TUPLE whitening"), and distributed across participating nodes. As a result:',
    [ShowcaseStrings.PP_S2_Li1]:
      'Individual blocks are indistinguishable from random data and cannot be read without the complete set of constituent blocks and the corresponding Constituent Block List (CBL).',
    [ShowcaseStrings.PP_S2_Li2]:
      'Data may optionally be encrypted with Elliptic Curve Integrated Encryption Scheme (ECIES) using AES-256-GCM, providing per-recipient confidentiality on top of the plausible deniability provided by TUPLE whitening.',
    [ShowcaseStrings.PP_S2_Li3]:
      'Node operators — including Digital Defiance — generally cannot determine the content, ownership, or nature of any individual block stored on the network.',
    [ShowcaseStrings.PP_S2_P2]:
      'This architecture means that the privacy protections described in this policy are, in many cases, enforced by mathematics rather than by policy alone.',

    // Section 3: Information We Collect
    [ShowcaseStrings.PP_S3_Title]: '3. Information We Collect',
    [ShowcaseStrings.PP_S3_1_Title]: '3.1 Account Information',
    [ShowcaseStrings.PP_S3_1_P1]:
      'When you create a BrightChain account we collect a username, email address, and your public cryptographic key (derived from your BIP39 mnemonic). We do not collect, store, or have access to your mnemonic phrase or private keys.',
    [ShowcaseStrings.PP_S3_2_Title]: '3.2 User-Generated Content',
    [ShowcaseStrings.PP_S3_2_P1]:
      'Files, messages, credentials, and other content you store on the network are broken into TUPLE-whitened blocks. We do not have the ability to read, reconstruct, or inspect this content. If you use optional ECIES encryption, the content is additionally encrypted for specific recipients and is inaccessible to anyone — including us — without the corresponding private key.',
    [ShowcaseStrings.PP_S3_3_Title]: '3.3 Automatically Collected Information',
    [ShowcaseStrings.PP_S3_3_P1]:
      'When you interact with our web-based Services we may automatically collect standard server log data, including IP addresses, browser type, referring URLs, pages visited, and timestamps. This information is used solely for operational purposes (security monitoring, abuse prevention, and service reliability) and is retained for no more than 90 days.',
    [ShowcaseStrings.PP_S3_4_Title]: '3.4 Blockchain Ledger Entries',
    [ShowcaseStrings.PP_S3_4_P1]:
      'Certain operations (vault creation, vault reads, vault destruction, governance votes) are recorded on an append-only blockchain ledger. These entries contain operation type, timestamp, and cryptographic hashes — not the content of the underlying data. Ledger entries are immutable by design and cannot be deleted.',

    // Section 4: How We Use Information
    [ShowcaseStrings.PP_S4_Title]: '4. How We Use Information',
    [ShowcaseStrings.PP_S4_P1]: 'We use the information we collect to:',
    [ShowcaseStrings.PP_S4_Li1]:
      'Provide, maintain, and improve the Services',
    [ShowcaseStrings.PP_S4_Li2]:
      'Authenticate users and manage accounts',
    [ShowcaseStrings.PP_S4_Li3]:
      'Detect and prevent fraud, abuse, and security incidents',
    [ShowcaseStrings.PP_S4_Li4]:
      'Comply with applicable legal obligations',
    [ShowcaseStrings.PP_S4_Li5]:
      'Communicate with you about the Services (e.g., service announcements, security alerts)',
    [ShowcaseStrings.PP_S4_P2]:
      'We do not sell, rent, or trade your personal information to third parties. We do not use your data for advertising or profiling.',

    // Section 5: Data Storage and Security
    [ShowcaseStrings.PP_S5_Title]: '5. Data Storage and Security',
    [ShowcaseStrings.PP_S5_P1]:
      'User-generated content is stored as TUPLE-whitened blocks distributed across the decentralized network. Account metadata (username, email, public key) is stored in our operational databases with industry-standard security measures including encryption at rest and in transit.',
    [ShowcaseStrings.PP_S5_P2]:
      'Once data is stored as whitened blocks and distributed to the network, other participants\u2019 data may become dependent on those same blocks through the XOR whitening process. This means that deleting individual blocks may be technically impossible without impacting other users\u2019 data. However, reconstructing a file requires the Constituent Block List (CBL) \u2014 the ordered recipe of block identifiers. Without the CBL, the distributed blocks are computationally indistinguishable from random data and cannot be reassembled. Deleting or destroying the CBL is sufficient to render the underlying data permanently inaccessible.',
    [ShowcaseStrings.PP_S5_P3]:
      'CBLs may be stored in various locations depending on the application. Digital Burnbag stores CBLs within its vault system backed by BrightDB. Users may also retain CBLs as MagnetURL references. In all cases, destroying the CBL \u2014 regardless of where it is stored \u2014 is the effective mechanism for data erasure, even when the underlying blocks persist on the network.',

    // Section 6: Cryptographic Protections
    [ShowcaseStrings.PP_S6_Title]:
      '6. Cryptographic Protections and Limitations',
    [ShowcaseStrings.PP_S6_P1]:
      'BrightChain employs strong cryptographic protections including SHA3-512 hashing, ECIES with secp256k1, AES-256-GCM symmetric encryption, HMAC-SHA3-512 seals, and Paillier homomorphic encryption for privacy-preserving voting. These protections are enforced by the protocol and are not dependent on our cooperation or goodwill.',
    [ShowcaseStrings.PP_S6_P2]:
      'When used correctly, BrightChain can provide very strong privacy protections. However, we make no guarantee that any specific cryptographic algorithm will remain secure indefinitely. Advances in computing (including quantum computing) may affect the security of current cryptographic primitives. Users are responsible for understanding the protections available to them and configuring their use of the Services accordingly.',

    // Section 7: Law Enforcement
    [ShowcaseStrings.PP_S7_Title]:
      '7. Law Enforcement and Legal Requests',
    [ShowcaseStrings.PP_S7_P1]:
      'Digital Defiance operates as a network carrier and infrastructure provider. We comply with valid legal process, including subpoenas, court orders, and search warrants issued by courts of competent jurisdiction, to the extent technically feasible.',
    [ShowcaseStrings.PP_S7_P2]:
      'However, due to the architectural design of BrightChain:',
    [ShowcaseStrings.PP_S7_Li1]:
      'We generally cannot produce the content of user-generated data stored as TUPLE-whitened blocks, because we do not possess the CBLs or decryption keys necessary to reconstruct or decrypt that data.',
    [ShowcaseStrings.PP_S7_Li2]:
      'We can produce account metadata (username, email, public key) and server log data to the extent we retain it.',
    [ShowcaseStrings.PP_S7_Li3]:
      'Blockchain ledger entries are immutable and may be produced in response to valid legal process.',
    [ShowcaseStrings.PP_S7_Li4]:
      'If a Digital Burnbag vault has been cryptographically destroyed, the destruction proof is the only remaining artifact — it proves the data is gone, not what the data contained.',
    [ShowcaseStrings.PP_S7_P3]:
      'We will notify affected users of legal requests to the extent permitted by law. We reserve the right to challenge legal requests that we believe are overbroad, legally deficient, or otherwise improper.',

    // Section 8: Brokered Anonymity
    [ShowcaseStrings.PP_S8_Title]: '8. Brokered Anonymity',
    [ShowcaseStrings.PP_S8_P1]:
      'BrightChain supports a "Brokered Anonymity" protocol in which a user\'s real identity may be sealed using Shamir\'s Secret Sharing and distributed among BrightTrust governance members. Identity recovery requires a threshold vote of BrightTrust members and is subject to a configurable statute of limitations, after which the identity shards are permanently deleted and the real identity becomes irrecoverable. This mechanism is designed to balance privacy with accountability under collective governance.',

    // Section 9: Third-Party Services
    [ShowcaseStrings.PP_S9_Title]: '9. Third-Party Services',
    [ShowcaseStrings.PP_S9_P1]:
      'Certain features (such as canary protocol activity monitoring) may integrate with third-party services (e.g., GitHub, Fitbit, Slack). Your use of those integrations is governed by the respective third-party privacy policies. We access only the minimum information necessary to provide the requested functionality (e.g., recent activity timestamps for dead man\'s switch monitoring) and do not store third-party credentials on our servers — authentication is handled via OAuth tokens that you may revoke at any time.',

    // Section 10: Children\'s Privacy
    [ShowcaseStrings.PP_S10_Title]: "10. Children's Privacy",
    [ShowcaseStrings.PP_S10_P1]:
      'The Services are not directed to children under the age of 13 (or the applicable age of digital consent in your jurisdiction). We do not knowingly collect personal information from children. If we learn that we have collected personal information from a child, we will take steps to delete that information promptly.',

    // Section 11: International Users
    [ShowcaseStrings.PP_S11_Title]: '11. International Users',
    [ShowcaseStrings.PP_S11_P1]:
      'Digital Defiance is based in the United States. If you access the Services from outside the United States, your information may be transferred to, stored in, and processed in the United States or other jurisdictions where our infrastructure operates. By using the Services, you consent to such transfer and processing.',
    [ShowcaseStrings.PP_S11_1_Title]:
      '11.1 European Economic Area (EEA) and United Kingdom',
    [ShowcaseStrings.PP_S11_1_P1]:
      "If you are located in the EEA or UK, you may have rights under the General Data Protection Regulation (GDPR) or UK GDPR, including the right to access, rectify, erase, restrict processing of, and port your personal data, and the right to object to processing. To exercise these rights, contact us at the address below. Note that certain data (blockchain ledger entries, distributed TUPLE blocks) may be technically impossible to erase due to the decentralized and immutable nature of the system. BrightChain's provable destruction capability (via Digital Burnbag) is designed to support GDPR Article 17 right-to-erasure compliance for user-controlled data.",

    // Section 12: Data Retention
    [ShowcaseStrings.PP_S12_Title]: '12. Data Retention',
    [ShowcaseStrings.PP_S12_P1]:
      'Account metadata is retained for as long as your account is active or as needed to provide the Services. Server logs are retained for up to 90 days. Blockchain ledger entries are retained indefinitely as part of the immutable ledger. TUPLE-whitened blocks are retained on the network according to storage contract terms and energy balance economics; blocks whose storage contracts expire and are not renewed may be garbage-collected by nodes.',

    // Section 13: Disclaimer
    [ShowcaseStrings.PP_S13_Title]:
      '13. Disclaimer of Warranties and Limitation of Liability',
    [ShowcaseStrings.PP_S13_P1]:
      'THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.',
    [ShowcaseStrings.PP_S13_P2]:
      'DIGITAL DEFIANCE, ITS OFFICERS, DIRECTORS, EMPLOYEES, VOLUNTEERS, AND CONTRIBUTORS (INCLUDING JESSICA MULEIN) SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICES; (B) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICES; (C) ANY CONTENT OBTAINED FROM THE SERVICES; (D) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT; OR (E) THE FAILURE OF ANY CRYPTOGRAPHIC MECHANISM, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY, WHETHER OR NOT WE HAVE BEEN INFORMED OF THE POSSIBILITY OF SUCH DAMAGE.',
    [ShowcaseStrings.PP_S13_P3]:
      'IN NO EVENT SHALL THE AGGREGATE LIABILITY OF DIGITAL DEFIANCE AND ITS OFFICERS, DIRECTORS, EMPLOYEES, VOLUNTEERS, AND CONTRIBUTORS FOR ALL CLAIMS RELATING TO THE SERVICES EXCEED THE GREATER OF ONE HUNDRED U.S. DOLLARS (US $100.00) OR THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.',
    [ShowcaseStrings.PP_S13_P4]:
      'SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN WARRANTIES OR LIABILITY. IN SUCH JURISDICTIONS, OUR LIABILITY SHALL BE LIMITED TO THE GREATEST EXTENT PERMITTED BY LAW.',

    // Section 14: Indemnification
    [ShowcaseStrings.PP_S14_Title]: '14. Indemnification',
    [ShowcaseStrings.PP_S14_P1]:
      'You agree to indemnify, defend, and hold harmless Digital Defiance, its officers, directors, employees, volunteers, and contributors (including Jessica Mulein) from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys\' fees) arising out of or in any way connected with your access to or use of the Services, your violation of this Privacy Policy, or your violation of any applicable law or the rights of any third party.',

    // Section 15: Governing Law
    [ShowcaseStrings.PP_S15_Title]:
      '15. Governing Law and Dispute Resolution',
    [ShowcaseStrings.PP_S15_P1]:
      'This Privacy Policy shall be governed by and construed in accordance with the laws of the State of Washington, United States, without regard to its conflict of law provisions. Any dispute arising out of or relating to this Privacy Policy or the Services shall be resolved exclusively in the state or federal courts located in King County, Washington, and you consent to the personal jurisdiction of such courts.',

    // Section 16: Open Source
    [ShowcaseStrings.PP_S16_Title]: '16. Open Source',
    [ShowcaseStrings.PP_S16_P1_Before]:
      'BrightChain is open-source software. The source code is publicly available at ',
    [ShowcaseStrings.PP_S16_P1_LinkText]:
      'github.com/Digital-Defiance/BrightChain',
    [ShowcaseStrings.PP_S16_P1_After]:
      '. You are encouraged to review the code to verify the privacy properties described in this policy. The cryptographic protections described herein are implemented in the codebase and are verifiable by inspection.',

    // Section 17: Changes
    [ShowcaseStrings.PP_S17_Title]: '17. Changes to This Policy',
    [ShowcaseStrings.PP_S17_P1]:
      'We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the Services with a revised "Last Updated" date. Your continued use of the Services after the effective date of any changes constitutes your acceptance of the revised policy.',

    // Section 18: Contact
    [ShowcaseStrings.PP_S18_Title]: '18. Contact Us',
    [ShowcaseStrings.PP_S18_P1]:
      'If you have questions about this Privacy Policy or wish to exercise your data protection rights, please contact:',
    [ShowcaseStrings.PP_S18_OrgName]: 'Digital Defiance',
    [ShowcaseStrings.PP_S18_EmailLabel]: 'Email:',
    [ShowcaseStrings.PP_S18_WebLabel]: 'Web:',
  };
