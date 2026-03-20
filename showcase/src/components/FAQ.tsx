import { Link } from 'react-router-dom';
import './FAQ.css';

function FAQ() {
  return (
    <div className="faq-wrapper">
      <div className="faq-container">
        <div className="faq-header">
          <h1>BrightChain FAQ</h1>
          <p>The Evolutionary Successor to the Owner-Free FileSystem</p>
        </div>

        <div className="faq-content">
          <div className="faq-item">
            <h2>1. What is BrightChain?</h2>
            <p>
              <strong>BrightChain</strong> is a decentralized, high-performance
              "Owner-Free" data infrastructure. It is the architectural
              successor to the{' '}
              <strong>Owner-Free File System (OFFSystem)</strong>, modernized
              for 2026 hardware environments including Apple Silicon and NVMe
              storage.
            </p>
          </div>

          <div className="faq-item">
            <h2>2. How does BrightChain differ from the original OFFSystem?</h2>
            <p>
              BrightChain honors the "Owner-Free" philosophy of its predecessor
              while introducing critical modernizations:
            </p>
            <ul>
              <li>
                <strong>Opt-in Redundancy:</strong> Users may request their
                blocks be stored with higher durability utilizing Reed-Solomon
                encoding.
              </li>
              <li>
                <strong>Recovery Performance:</strong> Utilizing{' '}
                <strong>@digitaldefiance/node-rs-accelerate</strong>, the system
                leverages GPU/NPU hardware to perform Reed-Solomon recovery
                operations at speeds up to <strong>30+ GB/s</strong>.
              </li>
              <li>
                <strong>Scalability:</strong> Through{' '}
                <strong>Super CBLs (Constituent Block Lists)</strong>, the
                system uses recursive indexing to support effectively unlimited
                file sizes with O(log N) retrieval efficiency.
              </li>
              <li>
                <strong>Identity:</strong> Integration of{' '}
                <strong>BIP39/32</strong> allows for secure, mnemonic-based
                identity and hierarchical deterministic key management.
              </li>
              <li>
                <strong>Opt-in Encryption:</strong> Users can optionally layer{' '}
                <strong>ECIES encryption</strong> on top of their data, making
                use of the Ethereum keyspace/identity HDKey system.
              </li>
            </ul>
          </div>

          <div className="faq-item">
            <h2>3. How is data "Owner-Free"?</h2>
            <p>
              BrightChain uses a multi-layered cryptographic approach to ensure
              no single node "hosts" a file in a legal or practical sense:
            </p>
            <ul>
              <li>
                <strong>The XOR Baseline:</strong> Every block is processed
                through simple XOR operations, making raw data at rest
                indistinguishable from random noise.
              </li>
              <li>
                <strong>The Recipe:</strong> To reconstruct a file, a user needs
                the Recipe — the specific spatial map of block order.
              </li>
              <li>
                <strong>Opt-in Encryption:</strong> Users can optionally layer{' '}
                <strong>ECIES encryption</strong> on top of their data. Without
                the Recipe, the data remains disordered and, if opted-in,
                cryptographically locked.
              </li>
            </ul>
          </div>

          <div className="faq-item">
            <h2>
              4. What is the <strong>"Tuple-Tradeoff"</strong>, and what does it
              provide?
            </h2>
            <p>
              The <strong>"Tuple-Tradeoff"</strong> is the deliberate balance
              between the overhead of "Owner-Free" sharding and the unparalleled
              legal and economic benefits it provides to the network.
            </p>
            <h3>The The Legal Advantage: Plausible Deniability</h3>
            <p>
              By sharding data into nearly random tuples (blocks) through XOR
              mixing, users who contribute storage are hosting data that is
              mathematically indistinguishable from noise.
            </p>
            <ul>
              <li>
                The Result: Because a single node cannot reconstruct a coherent
                file without the "Recipe," it is technically and legally
                impossible to claim that a specific node operator is "hosting"
                or "distributing" any specific content. This provides the
                ultimate layer of Plausible Deniability for participants.
              </li>
            </ul>
            <h3>The Economic Advantage: Efficiency vs. Proof-of-Work</h3>
            <p>
              While "Owner-Free" sharding does introduce a minor storage
              overhead, it is negligible when compared to the massive energy and
              hardware costs of traditional Proof-of-Work (PoW) or
              Proof-of-Stake (PoS) networks.
            </p>
            <ul>
              <li>
                The Result: BrightChain achieves high-performance data integrity
                without burning "Joules" on wasteful hashing competitions. This
                makes the network highly competitive, offering low-latency
                performance at a fraction of the cost of legacy blockchains.
              </li>
            </ul>
            <h3>The Trade-off Summary:</h3>
            <p>
              Users accept a slight increase in data "shards" in exchange for a
              zero-liability hosting environment and an ultra-low-cost
              infrastructure. This makes BrightChain the most viable platform
              for decentralized storage in highly regulated or
              resource-constrained environments.
            </p>
          </div>

          <div className="faq-item">
            <h2>
              5. How does BrightChain differ from traditional blockchains?
            </h2>
            <p>
              Technically, BrightChain is a decentralized block-store rather
              than a single, monolithic blockchain. While traditional
              blockchains are the ledger, BrightChain provides the underlying
              infrastructure to host and support multiple hybrid Merkle tree
              ledgers simultaneously. We use block-chaining as a structural
              method to reconstruct files, but the system is designed to be a
              high-performance foundation that can power many different
              blockchains and dApps on top of a unified, "Owner-Free" storage
              layer.
            </p>
          </div>

          <div className="faq-item">
            <h2>6. What is the role of Reed-Solomon (RS) in BrightChain?</h2>
            <p>
              While XOR handles the privacy and "Owner-Free" status of the data,{' '}
              <strong>Reed-Solomon Erasure Coding</strong> is an opt-in layer
              for <strong>Recoverability</strong>.
            </p>
            <ul>
              <li>
                <strong>Redundancy:</strong> RS allows a file to be
                reconstructed even if multiple hosting nodes go offline.
              </li>
              <li>
                <strong>The Trade-off:</strong> RS adds computational overhead
                and storage requirements compared to simple XOR. Users must
                choose their level of redundancy based on the importance of the
                data and their available "Joules."
              </li>
            </ul>
          </div>

          <div className="faq-item">
            <h2>7. What is a "Joule"?</h2>
            <p>
              A <strong>Joule</strong> is the unit of account for work and
              resource consumption within the BrightChain ecosystem.
            </p>
            <ul>
              <li>
                <strong>Cost-Basis:</strong> Every action — storing data,
                performing XOR mixing, or encoding Reed-Solomon shards — has a
                projected cost in Joules.
              </li>
              <li>
                <strong>Resource Management:</strong> Users must weigh the Joule
                cost of high-redundancy storage against the value of their data.
              </li>
            </ul>
          </div>

          <div className="faq-item">
            <h2>8. How are Joules obtained?</h2>
            <p>
              Joules are earned through a <strong>Work-for-Work</strong> model.
              Users obtain Joules by contributing resources back to the network:
            </p>
            <ul>
              <li>
                <strong>Storage:</strong> Hosting encrypted blocks for other
                peers.
              </li>
              <li>
                <strong>Computation:</strong> Providing CPU/GPU/NPU cycles to
                perform encoding or recovery tasks for the collective.
              </li>
            </ul>
            <p>
              This ensures the network remains a self-sustaining energy economy
              where contribution equals capacity.
            </p>
          </div>

          <div className="faq-item">
            <h2>9. How is Anonymity Maintained?</h2>
            <p>
              BrightChain employs <strong>Brokered Anonymity</strong>.
            </p>
            <ul>
              <li>
                <strong>On-Chain:</strong> All actions are anonymous to the
                general network.
              </li>
              <li>
                <strong>The Quorum:</strong> Identity is cryptographically tied
                to a <strong>Governance Quorum</strong>. This ensures that while
                a user's data and actions are private, the community maintains a
                "Social Layer" of accountability via Shamir's Secret Sharing and
                Homomorphic Voting.
              </li>
            </ul>
          </div>

          <div className="faq-item">
            <h2>10. What is BrightDB and how does it work?</h2>
            <p>
              <strong>BrightDB</strong> is the high-level document-store layer
              built directly on top of the BrightChain block-store. It provides
              a structured way to store, query, and manage complex data objects
              without a central database server.
            </p>

            <h3>How it Works</h3>
            <ul>
              <li>
                <strong>Document-Oriented Storage:</strong> Similar to NoSQL
                databases, BrightDB stores data as "Documents" sharded into
                encrypted blocks and distributed across the network.
              </li>
              <li>
                <strong>Immutable Versioning:</strong> Every change to a
                document is recorded as a new entry with a cryptographically
                verifiable history.
              </li>
              <li>
                <strong>Decentralized Indexing:</strong> A distributed indexing
                system allows nodes to find and reconstruct specific documents
                across the DHT without a central "Master" node.
              </li>
              <li>
                <strong>Quorum-Based Access:</strong> Access to specific
                databases or collections can be governed by a Quorum, requiring
                cryptographic approval from authorized signers.
              </li>
            </ul>

            <h3>Why it Matters</h3>
            <p>
              Most dApps struggle because they store "heavy" data on centralized
              servers. <strong>BrightDB</strong> keeps data decentralized,
              owner-free, and high-performance — enabling truly serverless
              applications that are as fast as traditional web apps but as
              secure as a blockchain.
            </p>
          </div>

          <div className="faq-item">
            <h2>11. What dApps launched with BrightChain?</h2>
            <p>
              BrightChain launched with a core suite of "Bright-Apps" designed
              to replace centralized, data-harvesting services with secure,
              sovereign alternatives.
            </p>

            <div className="faq-sub-section">
              <div>
                <img
                  src="https://github.com/Digital-Defiance/BrightChain/blob/main/brightchain-react/src/assets/images/brightmail.png?raw=true"
                  style={{ height: '40px' }}
                />
              </div>
              <h3>Sovereign Communication</h3>
              <p>
                A fully RFC-compliant email system bridging traditional SMTP and
                decentralized storage. Unlike standard email providers,
                BrightMail shards every message into the "Owner-Free"
                block-store with support for end-to-end encrypted "Dark Mode"
                messaging.
              </p>
            </div>

            <div className="faq-sub-section">
              <div>
                <img
                  src="https://github.com/Digital-Defiance/BrightChain/blob/main/brightchain-react/src/assets/images/brighthub.png?raw=true"
                  style={{ height: '40px' }}
                />
              </div>
              <h3>Social Network and Soverign Graph</h3>
              <p>
                <strong>The Concept:</strong> A decentralized,
                censorship-resistant social networking platform that mirrors the
                fluidity of legacy "Feeds" without the central surveillance or
                algorithmic manipulation.
              </p>
              <p>
                <strong>The Difference:</strong> Every post, "Like," and
                relationship is stored as an immutable, sharded document within
                BrightDB. Because it leverages the Joule Economy, there are no
                ads—users contribute a micro-fraction of computation or storage
                to "boost" their voice or sustain their community’s history.
              </p>
              <p>
                <strong>The Power of Quorums:</strong> Moderation isn't handled
                by a corporate "Safety Team." Instead, communities are governed
                by Governance Quorums. Rules are cryptographically enforced, and
                community standards are voted on via Homomorphic Voting,
                ensuring that a group's digital space remains truly "Owner-Free"
                and self-determined.
              </p>
            </div>

            <div className="faq-sub-section">
              <div>
                <img
                  src="https://github.com/Digital-Defiance/BrightChain/blob/main/brightchain-react/src/assets/images/brightpass.png?raw=true"
                  style={{ height: '40px' }}
                />
              </div>
              <h3>Zero-Knowledge Vault</h3>
              <p>
                A password and identity management system where your vault
                exists as distributed encrypted blocks. Access is governed by
                your <strong>BIP39 mnemonic</strong>, and every credential
                change is versioned and verifiable via BrightDB.
              </p>
            </div>

            <div className="faq-sub-section">
              <div>
                <img
                  src="https://github.com/Digital-Defiance/BrightChain/blob/main/brightchain-react/src/assets/images/brightchat.png?raw=true"
                  style={{ height: '40px' }}
                />
              </div>
              <h3>Resilient Community</h3>
              <p>
                A real-time communications platform with persistent channels,
                voice, and media sharing. Community governance is managed via
                Quorums, and GPU-accelerated recovery ensures chat history is
                never lost.
              </p>
            </div>
          </div>

          <div className="faq-item">
            <h2>
              12. What is Paillier encryption and how does it enable private
              voting?
            </h2>
            <p>
              Paillier is a public-key encryption scheme with a special property
              called additive homomorphism — you can add encrypted values
              together without ever decrypting them. If you encrypt a
              &quot;1&quot; for Candidate A and someone else encrypts a
              &quot;1&quot; for Candidate A, you can multiply those ciphertexts
              together and the result, when decrypted, is &quot;2.&quot; Nobody
              ever sees an individual ballot. In BrightChain&apos;s voting
              system, each vote is encrypted with a Paillier public key, the
              encrypted ballots are homomorphically aggregated into a single
              ciphertext per candidate, and only the final tally is decrypted —
              never any individual vote.
            </p>
            <p>
              For added security, the Paillier private key can be split across
              multiple guardians using threshold cryptography, so no single
              party can decrypt the tally alone. This approach works natively
              for common voting methods like plurality, approval, and scored
              voting, where tallying is just addition. Methods that require
              elimination rounds (like ranked-choice) need intermediate
              decryptions between rounds, and some methods (like quadratic
              voting) can&apos;t be done homomorphically at all.
            </p>
          </div>

          <div className="faq-item">
            <h2>13. What does the Paillier Bridge do?</h2>
            <p>
              The Paillier Bridge is a deterministic key derivation construction
              that lets you derive Paillier homomorphic encryption keys directly
              from your existing ECDH (Elliptic Curve Diffie-Hellman) key pair.
            </p>
            <p>
              Instead of managing two separate key pairs — one for
              identity/authentication (ECC) and one for homomorphic vote
              encryption (Paillier) — the bridge pipes your ECDH shared secret
              through HKDF and HMAC-DRBG to deterministically generate the large
              primes needed for a 3072-bit Paillier key. This means your entire
              cryptographic identity, including your voting keys, can be
              recovered from a single 32-byte ECC private key. The bridge is
              one-way (you can&apos;t reverse a Paillier key back to the EC
              key), fully deterministic (same input always yields the same
              output), and achieves 128-bit security consistent with NIST
              recommendations.
            </p>
            <p>
              See our{' '}
              <a href="https://github.brightchain.org/docs/papers/paillier-bridge.html">
                paper
              </a>{' '}
              on the topic for more information.
            </p>
          </div>
        </div>

        <div className="faq-footer">
          <Link to="/" className="back-link">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default FAQ;
