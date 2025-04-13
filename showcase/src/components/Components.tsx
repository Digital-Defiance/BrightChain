import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import "./Components.css";

interface Feature {
  title: string;
  description: string;
  icon: string;
  tech: string[];
  highlights: string[];
  category: "Storage" | "Cryptography" | "Governance" | "Network" | "Identity";
}

const features: Feature[] = [
  {
    title: "Owner-Free File System (OFFS)",
    icon: "🗄️",
    description:
      "Revolutionary distributed storage that breaks files into blocks and XORs them with random data. No single block contains identifiable content, providing legal immunity for node operators while enabling secure, decentralized file storage.",
    tech: ["XOR Encryption", "Distributed Storage", "SHA-512"],
    category: "Storage",
    highlights: [
      "Files split into source blocks and merged with random data via XOR",
      "Original blocks discarded - only randomized blocks stored",
      "Constituent Block Lists (CBL) track block relationships",
      "Blocks identified by SHA-512 hash - automatic deduplication",
      "Multi-use blocks can be part of multiple files simultaneously",
      "Legal protection for node operators - no identifiable content stored",
    ],
  },
  {
    title: "Homomorphic Voting System",
    icon: "🗳️",
    description:
      "Privacy-preserving elections using Paillier homomorphic encryption with ECDH-derived keys. Vote tallying without revealing individual votes through cryptographic homomorphic addition.",
    tech: ["Paillier Encryption", "ECDH", "Homomorphic Cryptography"],
    category: "Governance",
    highlights: [
      "ECDH-to-Paillier bridge derives homomorphic keys from ECDSA/ECDH keys",
      "Privacy-preserving vote aggregation via homomorphic addition",
      "128-bit security level with Miller-Rabin primality testing (256 rounds)",
      "Cross-platform determinism (Node.js and browser environments)",
      "Timing attack resistance with constant-time operations",
      "Deterministic random bit generation using HMAC-DRBG",
    ],
  },
  {
    title: "Brokered Anonymity & Quorum",
    icon: "🎭",
    description:
      "Sophisticated privacy mechanism enabling anonymous operations while maintaining accountability. Identity information encrypted and split using Shamir's Secret Sharing, reconstructable only through majority quorum consensus.",
    tech: ["Shamir's Secret Sharing", "Forward Error Correction", "Quorum Consensus"],
    category: "Governance",
    highlights: [
      "Post anonymously with encrypted identity backup",
      "Identity shards distributed across ~24 quorum members",
      "Majority vote required to reconstruct identity information",
      "Time-limited accountability - data expires after statute of limitations",
      "Legal compliance mechanism for FISA warrants and court orders",
      "Permanent privacy protection after expiration period",
    ],
  },
  {
    title: "Advanced Encryption Stack",
    icon: "🔐",
    description:
      "State-of-the-art encryption combining ECIES for key derivation with AES-256-GCM for file security. Complete cryptosystem with BIP39/32 authentication and SECP256k1 elliptic curve cryptography.",
    tech: ["ECIES", "AES-256-GCM", "BIP39/32", "SECP256k1"],
    category: "Cryptography",
    highlights: [
      "ECIES encryption with user-specific key derivation",
      "AES-256-GCM for authenticated file encryption",
      "BIP39/32 mnemonic-based authentication",
      "SECP256k1 elliptic curve (Ethereum-compatible keyspace)",
      "Verified block-level data integrity with XOR functionality",
      "Cross-platform cryptographic operations",
    ],
  },
  {
    title: "Decentralized Storage Network",
    icon: "🌐",
    description:
      "Peer-to-peer distributed file system that monetizes unused storage on personal devices. IPFS-like architecture with energy-efficient proof-of-work and reputation-based incentives.",
    tech: ["P2P Networks", "DHT", "Block Replication"],
    category: "Network",
    highlights: [
      "Utilize wasted storage space on personal computers and devices",
      "Distributed Hash Table (DHT) for efficient block tracking",
      "Configurable block durability and accessibility requirements",
      "Dynamic replication based on block usefulness and access patterns",
      "Energy-efficient alternative to traditional proof-of-work mining",
      "Storage credits and bandwidth compensation for node operators",
    ],
  },
  {
    title: "Quorum-Based Document Sealing",
    icon: "🔒",
    description:
      "Advanced document protection with customizable threshold requirements for access restoration. Groups can seal sensitive information requiring configurable majority consensus to unseal.",
    tech: ["Threshold Cryptography", "Secret Sharing", "Multi-Party Computation"],
    category: "Governance",
    highlights: [
      "Seal documents with configurable quorum thresholds (e.g., 3-of-5, 7-of-10)",
      "Distributed shard storage across trusted quorum members",
      "Mathematical guarantee of security until threshold reached",
      "Flexible unsealing for legal compliance or group decisions",
      "Supports organizational governance and compliance workflows",
      "Time-based expiration for automatic privacy protection",
    ],
  },
  {
    title: "Decentralized Identity Provider",
    icon: "🎭",
    description:
      "Sophisticated identity management ensuring user privacy and control. Support for registered aliases, anonymous posting, and cryptographic identity verification.",
    tech: ["Public Key Infrastructure", "BIP39/32", "Identity Management"],
    category: "Identity",
    highlights: [
      "BIP39/32 mnemonic-based identity generation",
      "Multiple registered aliases per user account",
      "Anonymous posting with optional identity recovery",
      "Public key-based authentication (SECP256k1)",
      "Forward Error Correction for identity backup",
      "Privacy-preserving identity verification",
    ],
  },
  {
    title: "Reputation & Energy Tracking",
    icon: "⚡",
    description:
      "Revolutionary reputation system that tracks energy costs in Joules. Good actors enjoy minimal proof-of-work requirements while bad actors face increased computational burdens.",
    tech: ["Proof of Work", "Reputation Systems", "Energy Accounting"],
    category: "Network",
    highlights: [
      "Energy costs measured in actual Joules for real-world correlation",
      "Dynamic proof-of-work based on user reputation",
      "Content creators rewarded as their content is consumed",
      "Bad actors throttled with increased computational requirements",
      "Storage and bandwidth costs tracked and compensated",
      "Incentivizes positive contributions and quality content",
    ],
  },
  {
    title: "Block Temperature & Lifecycle",
    icon: "🌡️",
    description:
      "Intelligent block management with hot/cold storage tiers. Frequently accessed blocks stay 'hot' with high replication, while unused blocks cool down and may expire.",
    tech: ["Storage Tiering", "Block Lifecycle", "Access Patterns"],
    category: "Storage",
    highlights: [
      "'Keep Until At Least' contracts for minimum storage duration",
      "Block usefulness increases with access, staleness decreases",
      "Dynamic replication based on access patterns and temperature",
      "Auto-extension of contracts for frequently accessed blocks",
      "Energy credits returned for blocks that prove useful",
      "Configurable durability and accessibility requirements",
    ],
  },
  {
    title: "Zero Mining Waste",
    icon: "♻️",
    description:
      "Built on Ethereum's foundation but engineered without proof-of-work constraints. All computational work serves useful purposes - storage, verification, and network operations.",
    tech: ["Ethereum Keyspace", "Efficient Consensus", "Green Blockchain"],
    category: "Network",
    highlights: [
      "No wasteful mining - all computation serves useful purposes",
      "Ethereum-compatible keyspace and cryptography (SECP256k1)",
      "Proof-of-work used only for transaction throttling",
      "Energy-efficient consensus mechanisms",
      "Sustainable blockchain without environmental impact",
      "Focus on storage and computation, not artificial scarcity",
    ],
  },
  {
    title: "Cross-Platform Determinism",
    icon: "🔄",
    description:
      "Identical cryptographic operations across Node.js and browser environments. Deterministic key generation ensures consistent results regardless of platform.",
    tech: ["Node.js", "Browser Crypto", "Deterministic Algorithms"],
    category: "Cryptography",
    highlights: [
      "Unified cryptographic operations across platforms",
      "Deterministic random bit generation (HMAC-DRBG)",
      "Consistent Paillier key derivation from ECDH keys",
      "Browser and Node.js compatibility",
      "Reproducible cryptographic results",
      "Cross-platform testing and verification",
    ],
  },
  {
    title: "Digital Contracts & Governance",
    icon: "📜",
    description:
      "Smart contract capabilities for decentralized applications. Quorum-based governance with configurable voting thresholds for network decisions and policy enforcement.",
    tech: ["Smart Contracts", "Governance", "Voting Systems"],
    category: "Governance",
    highlights: [
      "Digital contract execution on decentralized network",
      "Quorum-based decision making for network governance",
      "Configurable majority requirements for different actions",
      "Homomorphic voting for privacy-preserving governance",
      "Reputation-weighted voting mechanisms",
      "Transparent and auditable governance processes",
    ],
  },
];

const Components = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="components section" id="components" ref={ref}>
      <motion.div
        className="components-container"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
      >
        <h2 className="section-title">
          Revolutionary <span className="gradient-text">Features</span> & Capabilities
        </h2>
        <p className="components-subtitle">
          Advanced cryptography, decentralized storage, and democratic governance for the next generation of blockchain
        </p>

        <motion.div
          className="suite-intro"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3>
            The <em>revolutionary</em> blockchain that combines <em>advanced cryptography</em>,{" "}
            <em>decentralized storage</em>, and <em>democratic governance</em>.
          </h3>
          <p>
            <strong>
              BrightChain reimagines blockchain technology from the ground up
            </strong>{" "}
            — eliminating mining waste while delivering unprecedented capabilities.
            From homomorphic voting to brokered anonymity, from distributed file storage
            to quorum-based governance, BrightChain offers{" "}
            <strong>everything needed</strong> for the next generation of decentralized applications.
          </p>
          <div className="problem-solution">
            <div className="problem">
              <h4>❌ The Problems with Traditional Blockchain</h4>
              <ul>
                <li>Massive energy waste from proof-of-work mining</li>
                <li>Wasted storage capacity on billions of devices</li>
                <li>No privacy-preserving voting mechanisms</li>
                <li>Anonymity without accountability leads to abuse</li>
                <li>Expensive on-chain storage limits applications</li>
                <li>Node operators face legal liability for stored content</li>
              </ul>
              <p>
                <strong>Result:</strong> Blockchain technology that's environmentally
                destructive, legally risky, and functionally limited.
              </p>
            </div>
            <div className="solution">
              <h4>✅ The BrightChain Solution</h4>
              <p>
                <strong>BrightChain</strong> eliminates mining waste by using{" "}
                <strong>proof-of-work only for throttling</strong>, not consensus.
                The <strong>Owner-Free File System</strong> provides legal immunity
                by storing only XOR-randomized blocks. <strong>Homomorphic voting</strong>{" "}
                enables privacy-preserving elections, while <strong>brokered anonymity</strong>{" "}
                balances privacy with accountability.
              </p>
              <p>
                Built on <strong>Ethereum's keyspace</strong> but engineered without
                proof-of-work constraints, BrightChain monetizes{" "}
                <strong>unused storage</strong> on personal devices, creating a
                sustainable P2P network. The <strong>quorum system</strong> provides
                democratic governance with mathematical security guarantees.
              </p>
            </div>
          </div>
          <div className="value-props">
            <div className="value-prop">
              <strong>♻️ Zero Mining Waste</strong>
              <p>
                All computation serves useful purposes - no wasteful mining,
                sustainable blockchain
              </p>
            </div>
            <div className="value-prop">
              <strong>🔐 Advanced Cryptography</strong>
              <p>
                ECIES + AES-256-GCM encryption, homomorphic voting, and
                cross-platform determinism
              </p>
            </div>
            <div className="value-prop">
              <strong>🌐 Decentralized Storage</strong>
              <p>
                IPFS-like P2P storage utilizing wasted space on personal devices
                with legal protection
              </p>
            </div>
            <div className="value-prop">
              <strong>🎭 Brokered Anonymity</strong>
              <p>
                Privacy with accountability - anonymous posting with time-limited
                identity recovery via quorum
              </p>
            </div>
            <div className="value-prop">
              <strong>🗳️ Homomorphic Voting</strong>
              <p>
                Privacy-preserving elections with vote tallying that never reveals
                individual votes
              </p>
            </div>
            <div className="value-prop">
              <strong>🔒 Quorum Governance</strong>
              <p>
                Democratic decision-making with configurable thresholds and
                mathematical security
              </p>
            </div>
          </div>
        </motion.div>

        <div className="components-grid">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="component-card card"
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1, duration: 0.6 }}
            >
              <div className="component-header">
                <div className="component-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <span
                  className={`component-badge ${feature.category.toLowerCase()}`}
                >
                  {feature.category}
                </span>
              </div>

              <p className="component-description">{feature.description}</p>

              <ul className="component-highlights">
                {feature.highlights.map((highlight, i) => (
                  <li key={i}>{highlight}</li>
                ))}
              </ul>

              <div className="component-tech">
                {feature.tech.map((tech) => (
                  <span key={tech} className="tech-badge">
                    {tech}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default Components;
