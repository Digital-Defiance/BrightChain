import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  ECIESService,
  VotingService,
  ISimpleKeyPair,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import type { KeyPair } from 'paillier-bigint';
import {
  FaLock,
  FaUnlock,
  FaKey,
  FaExchangeAlt,
  FaVoteYea,
  FaUserFriends,
  FaChartBar,
  FaReceipt,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
} from 'react-icons/fa';
import './Demo.css';

interface VoteReceipt {
  voterId: string;
  voteCommitment: string; // Hash of encrypted vote
  timestamp: number;
  receiptCode: string; // Unique verification code
}

interface Voter {
  name: string;
  keys: ISimpleKeyPair;
  vote: string | null;
  encryptedVotes: Map<string, bigint>;
  hasVoted: boolean;
  receipt: VoteReceipt | null;
}

interface Candidate {
  name: string;
  emoji: string;
  encryptedTally: bigint | null;
  decryptedTally: number | null;
}

const Demo = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [service] = useState(() => new ECIESService());
  const [aliceKeys, setAliceKeys] = useState<ISimpleKeyPair | null>(null);
  const [bobKeys, setBobKeys] = useState<ISimpleKeyPair | null>(null);
  const [message, setMessage] = useState('Hello, secure world!');
  const [encryptedData, setEncryptedData] = useState<Uint8Array | null>(null);
  const [decryptedMessage, setDecryptedMessage] = useState<string>('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [keyGenError, setKeyGenError] = useState<string | null>(null);

  // Voting Demo State
  const [votingService, setVotingService] = useState<VotingService | null>(
    null,
  );
  const [electionKeys, setElectionKeys] = useState<KeyPair | null>(null);
  const [isDerivingVotingKeys, setIsDerivingVotingKeys] = useState(false);
  const [votingError, setVotingError] = useState<string | null>(null);

  // Multi-voter election state
  const [voters, setVoters] = useState<Voter[]>([]);
  const [candidates] = useState<Candidate[]>([
    {
      name: 'Alice Anderson',
      emoji: '👩‍💼',
      encryptedTally: null,
      decryptedTally: null,
    },
    {
      name: 'Bob Builder',
      emoji: '👷',
      encryptedTally: null,
      decryptedTally: null,
    },
    {
      name: 'Carol Chen',
      emoji: '👩‍🔬',
      encryptedTally: null,
      decryptedTally: null,
    },
  ]);
  const [electionPhase, setElectionPhase] = useState<
    'voting' | 'tallying' | 'results'
  >('voting');
  const [selectedVoter, setSelectedVoter] = useState<number>(0);
  const [tallyResults, setTallyResults] = useState<Map<string, number>>(
    new Map(),
  );
  const [bulletinBoard, setBulletinBoard] = useState<VoteReceipt[]>([]);
  const [showVerification, setShowVerification] = useState(false);
  const [tamperedVoterIndex, setTamperedVoterIndex] = useState<number | null>(
    null,
  );
  const [tamperDetected, setTamperDetected] = useState(false);

  useEffect(() => {
    const generateKeys = async () => {
      try {
        const aliceMnemonic = service.generateNewMnemonic();
        const alice = service.mnemonicToSimpleKeyPair(aliceMnemonic);
        setAliceKeys(alice);

        const bobMnemonic = service.generateNewMnemonic();
        const bob = service.mnemonicToSimpleKeyPair(bobMnemonic);
        setBobKeys(bob);
      } catch (error) {
        console.error('Key generation failed:', error);
        setKeyGenError(
          'Browser compatibility issue - crypto functions not available.',
        );
        const mockAlice = {
          privateKey: new Uint8Array(32).fill(1),
          publicKey: new Uint8Array(33).fill(2),
        };
        const mockBob = {
          privateKey: new Uint8Array(32).fill(3),
          publicKey: new Uint8Array(33).fill(4),
        };
        setAliceKeys(mockAlice);
        setBobKeys(mockBob);
      }
    };
    generateKeys();
  }, [service]);

  useEffect(() => {
    const initVotingService = async () => {
      try {
        const svc = VotingService.getInstance();
        setVotingService(svc);
      } catch (error) {
        console.error('Failed to initialize voting service:', error);
        setVotingError(
          'Voting demo unavailable - paillier-bigint dependency missing',
        );
      }
    };
    initVotingService();
  }, []);

  // Initialize election with voters
  useEffect(() => {
    const initElection = async () => {
      if (!votingService || !service) return;

      setIsDerivingVotingKeys(true);
      setVotingError(null);

      try {
        // Generate election authority keys (used for tallying)
        const electionMnemonic = service.generateNewMnemonic();
        const electionIdentity =
          service.mnemonicToSimpleKeyPair(electionMnemonic);

        const keys = await votingService.deriveVotingKeysFromECDH(
          electionIdentity.privateKey,
          electionIdentity.publicKey,
          { keypairBitLength: 2048, primeTestIterations: 64 },
        );
        setElectionKeys(keys);

        // Create voters with their own ECDH identities
        const voterNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
        const newVoters: Voter[] = [];

        for (const name of voterNames) {
          const mnemonic = service.generateNewMnemonic();
          const voterKeys = service.mnemonicToSimpleKeyPair(mnemonic);
          newVoters.push({
            name,
            keys: voterKeys,
            vote: null,
            encryptedVotes: new Map(),
            hasVoted: false,
            receipt: null,
          });
        }

        setVoters(newVoters);
      } catch (e) {
        console.error('Failed to initialize election', e);
        setVotingError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setIsDerivingVotingKeys(false);
      }
    };
    initElection();
  }, [votingService, service]);

  // Generate a cryptographic commitment (hash) for vote verification
  const generateVoteCommitment = (
    encryptedVotes: Map<string, bigint>,
  ): string => {
    const voteString = Array.from(encryptedVotes.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([candidate, vote]) => `${candidate}:${vote.toString()}`)
      .join('|');

    // Simple hash function for demo purposes
    let hash = 0;
    for (let i = 0; i < voteString.length; i++) {
      const char = voteString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  };

  const castVote = (candidateName: string) => {
    if (!electionKeys) return;

    const voter = voters[selectedVoter];
    if (voter.hasVoted) return;

    // Create encrypted votes: 1 for chosen candidate, 0 for others
    const encryptedVotes = new Map<string, bigint>();

    for (const candidate of candidates) {
      const voteValue = candidate.name === candidateName ? 1n : 0n;
      const encrypted = electionKeys.publicKey.encrypt(voteValue);
      encryptedVotes.set(candidate.name, encrypted);
    }

    const updatedVoters = [...voters];
    updatedVoters[selectedVoter] = {
      ...voter,
      vote: candidateName,
      encryptedVotes,
      hasVoted: true,
      receipt: null,
    };

    // Generate receipt for vote verification
    const commitment = generateVoteCommitment(encryptedVotes);
    const receipt: VoteReceipt = {
      voterId: voter.name,
      voteCommitment: commitment,
      timestamp: Date.now(),
      receiptCode: `${voter.name.substring(0, 2).toUpperCase()}-${commitment.substring(0, 6)}`,
    };

    updatedVoters[selectedVoter].receipt = receipt;

    // Add to public bulletin board
    setBulletinBoard((prev) => [...prev, receipt]);

    setVoters(updatedVoters);

    // Stay on current voter to show their receipt
    // (removed auto-advance to next voter)
  };

  const tallyVotes = () => {
    if (!electionKeys) return;
    setElectionPhase('tallying');
    setTamperDetected(false);

    // First, verify all votes against bulletin board
    let allValid = true;
    for (const voter of voters) {
      if (voter.hasVoted && voter.receipt) {
        const currentCommitment = generateVoteCommitment(voter.encryptedVotes);
        if (currentCommitment !== voter.receipt.voteCommitment) {
          allValid = false;
          setTamperDetected(true);
          break;
        }
      }
    }

    if (!allValid) {
      return; // Don't proceed with tally if tampering detected
    }

    // Homomorphically add all encrypted votes for each candidate
    const tallies = new Map<string, bigint>();

    for (const candidate of candidates) {
      let encryptedSum: bigint | null = null;

      for (const voter of voters) {
        if (voter.hasVoted) {
          const voterEncryptedVote = voter.encryptedVotes.get(candidate.name);
          if (voterEncryptedVote !== undefined) {
            if (encryptedSum === null) {
              encryptedSum = voterEncryptedVote;
            } else {
              // Homomorphic addition - multiply ciphertexts!
              encryptedSum = electionKeys.publicKey.addition(
                encryptedSum,
                voterEncryptedVote,
              );
            }
          }
        }
      }

      if (encryptedSum !== null) {
        tallies.set(candidate.name, encryptedSum);
      }
    }

    // Update candidates with encrypted tallies
    candidates.forEach((c) => {
      c.encryptedTally = tallies.get(c.name) || null;
    });
  };

  const revealResults = () => {
    if (!electionKeys) return;

    const results = new Map<string, number>();

    for (const candidate of candidates) {
      if (candidate.encryptedTally !== null) {
        const decrypted = electionKeys.privateKey.decrypt(
          candidate.encryptedTally,
        );
        candidate.decryptedTally = Number(decrypted);
        results.set(candidate.name, Number(decrypted));
      }
    }

    setTallyResults(results);
    setElectionPhase('results');
  };

  const resetElection = () => {
    setVoters(
      voters.map((v) => ({
        ...v,
        vote: null,
        encryptedVotes: new Map(),
        hasVoted: false,
        receipt: null,
      })),
    );
    candidates.forEach((c) => {
      c.encryptedTally = null;
      c.decryptedTally = null;
    });
    setTallyResults(new Map());
    setElectionPhase('voting');
    setSelectedVoter(0);
    setBulletinBoard([]);
    setShowVerification(false);
    setTamperedVoterIndex(null);
    setTamperDetected(false);
  };

  // Simulate vote tampering for demonstration
  const simulateTampering = () => {
    if (!electionKeys || voters.length === 0) return;

    // Pick a random voter who has voted
    const votedVoters = voters
      .map((v, idx) => ({ voter: v, idx }))
      .filter(({ voter }) => voter.hasVoted);
    if (votedVoters.length === 0) return;

    const randomVoted =
      votedVoters[Math.floor(Math.random() * votedVoters.length)];
    const voterIndex = randomVoted.idx;

    // Change their vote without updating the receipt
    const updatedVoters = [...voters];
    const newEncryptedVotes = new Map<string, bigint>();

    // Pick a different candidate
    const originalVote = updatedVoters[voterIndex].vote;
    const otherCandidates = candidates.filter((c) => c.name !== originalVote);
    const newCandidate =
      otherCandidates[Math.floor(Math.random() * otherCandidates.length)];

    for (const candidate of candidates) {
      const voteValue = candidate.name === newCandidate.name ? 1n : 0n;
      const encrypted = electionKeys.publicKey.encrypt(voteValue);
      newEncryptedVotes.set(candidate.name, encrypted);
    }

    updatedVoters[voterIndex].encryptedVotes = newEncryptedVotes;
    updatedVoters[voterIndex].vote = newCandidate.name;
    // Note: receipt stays the same - this is the tampering!

    setVoters(updatedVoters);
    setTamperedVoterIndex(voterIndex);
  };

  const verifyVote = (receipt: VoteReceipt) => {
    const voter = voters.find((v) => v.name === receipt.voterId);
    if (!voter || !voter.hasVoted) return false;

    const currentCommitment = generateVoteCommitment(voter.encryptedVotes);
    return currentCommitment === receipt.voteCommitment;
  };

  const getWinner = () => {
    let maxVotes = -1;
    let winner = '';
    tallyResults.forEach((votes, name) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        winner = name;
      }
    });
    return { winner, votes: maxVotes };
  };

  const handleEncrypt = async () => {
    if (!bobKeys || !message) return;
    setIsEncrypting(true);
    try {
      const messageBytes = new TextEncoder().encode(message);
      const encrypted = await service.encryptSimpleOrSingle(
        false,
        bobKeys.publicKey,
        messageBytes,
      );
      setEncryptedData(encrypted);
      setDecryptedMessage('');
    } catch (error) {
      console.error('Encryption failed:', error);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDecrypt = async () => {
    if (!bobKeys || !encryptedData) return;
    setIsDecrypting(true);
    try {
      const decrypted = await service.decryptSimpleOrSingleWithHeader(
        false,
        bobKeys.privateKey,
        encryptedData,
      );
      setDecryptedMessage(new TextDecoder().decode(decrypted));
    } catch (error) {
      console.error('Decryption failed:', error);
      setDecryptedMessage('Error: Decryption failed');
    } finally {
      setIsDecrypting(false);
    }
  };

  const votedCount = voters.filter((v) => v.hasVoted).length;

  return (
    <section className="demo-section" id="demo" ref={ref}>
      <motion.div
        className="demo-container"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
      >
        <h2 className="section-title">
          Interactive <span className="gradient-text">Demo</span>
        </h2>
        <p className="features-subtitle">
          Visualizing ECIES encryption capabilities
        </p>
        <p
          className="demo-disclaimer"
          style={{
            textAlign: 'center',
            maxWidth: '800px',
            margin: '0 auto 2rem',
            opacity: 0.8,
            fontSize: '0.9rem',
          }}
        >
          <em>
            Note: This visualization uses{' '}
            <code>@digitaldefiance/ecies-lib</code> (the browser library) for
            demonstration purposes. <code>@digitaldefiance/node-ecies-lib</code>{' '}
            provides identical functionality with the same API for Node.js
            server applications. Both libraries are binary-compatible, so data
            encrypted with one can be decrypted by the other.
          </em>
        </p>

        {keyGenError && (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(255,0,0,0.1)',
              border: '1px solid red',
              borderRadius: '8px',
              color: '#ff6b6b',
              marginBottom: '2rem',
            }}
          >
            <p>
              <strong>Error:</strong> {keyGenError}
            </p>
          </div>
        )}

        <div className="demo-grid">
          {/* Alice's Side */}
          <motion.div
            className="demo-card"
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            <h3>
              <FaKey /> Alice (Sender)
            </h3>
            {aliceKeys && (
              <div className="key-display">
                <span className="key-label">Public Key:</span>
                {uint8ArrayToHex(aliceKeys.publicKey)}
              </div>
            )}
            <div className="demo-input-group">
              <label>Message to Encrypt:</label>
              <textarea
                className="demo-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter a secret message..."
              />
            </div>
            <button
              className="demo-btn"
              onClick={handleEncrypt}
              disabled={isEncrypting || !bobKeys}
            >
              {isEncrypting ? (
                'Encrypting...'
              ) : (
                <>
                  <FaLock /> Encrypt for Bob
                </>
              )}
            </button>
          </motion.div>

          {/* Bob's Side */}
          <motion.div
            className="demo-card"
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.4 }}
          >
            <h3>
              <FaKey /> Bob (Receiver)
            </h3>
            {bobKeys && (
              <div className="key-display">
                <span className="key-label">Public Key:</span>
                {uint8ArrayToHex(bobKeys.publicKey)}
              </div>
            )}
            {encryptedData && (
              <div className="demo-result">
                <h4>
                  <FaExchangeAlt /> Encrypted Payload:
                </h4>
                <div className="hex-display">
                  {uint8ArrayToHex(encryptedData)}
                </div>
              </div>
            )}
            <div style={{ marginTop: '1rem' }}>
              <button
                className="demo-btn"
                onClick={handleDecrypt}
                disabled={isDecrypting || !encryptedData}
                style={{ background: 'var(--accent-color)' }}
              >
                {isDecrypting ? (
                  'Decrypting...'
                ) : (
                  <>
                    <FaUnlock /> Decrypt Message
                  </>
                )}
              </button>
            </div>
            {decryptedMessage && (
              <div className="demo-result" style={{ marginTop: '1rem' }}>
                <h4>Decrypted Message:</h4>
                <div
                  className="demo-textarea"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  {decryptedMessage}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Election Demo */}
        <motion.div
          className="demo-card"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6 }}
          style={{ marginTop: '2rem', maxWidth: '100%' }}
        >
          <h3>
            <FaVoteYea /> Private Election Demo
          </h3>
          <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
            This demo simulates a private election using homomorphic encryption.
            Each voter casts an encrypted ballot. The election authority can
            tally all votes{' '}
            <strong>without ever seeing individual ballots</strong>.
          </p>
          <div
            style={{
              padding: '1rem',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '8px',
              borderLeft: '4px solid #3b82f6',
              marginBottom: '1rem',
            }}
          >
            <h5 style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              🌍 Real-World Applications
            </h5>
            <p style={{ fontSize: '0.85rem', opacity: 0.9, margin: 0 }}>
              These cryptographic techniques are used in real voting systems
              like <strong>Helios Voting</strong> (open-source verifiable
              voting), <strong>Scantegrity</strong> (used in Takoma Park, MD
              elections), and <strong>Estonia's i-Voting</strong> system. This
              demo shows three key features: <strong>vote verification</strong>{' '}
              (voters can check their vote was counted),{' '}
              <strong>tamper detection</strong> (cryptographic commitments catch
              any changes), and <strong>end-to-end verifiability</strong>{' '}
              (anyone can audit the election without compromising privacy).
            </p>
          </div>

          {!votingService && !votingError && (
            <div
              style={{
                padding: '1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
              }}
            >
              Initializing voting service...
            </div>
          )}

          {votingError && (
            <div
              style={{
                padding: '1rem',
                background: 'rgba(255,0,0,0.1)',
                border: '1px solid red',
                borderRadius: '8px',
                color: '#ff6b6b',
                marginBottom: '1rem',
              }}
            >
              <p>
                <strong>Error:</strong> {votingError}
              </p>
            </div>
          )}

          {isDerivingVotingKeys && (
            <div
              style={{
                padding: '1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
              }}
            >
              🔐 Generating election keys (this may take a moment)...
            </div>
          )}

          {electionKeys && voters.length > 0 && (
            <div className="election-container">
              {/* Election Status Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <FaUserFriends style={{ marginRight: '0.5rem' }} />
                  <strong>Voters:</strong> {votedCount}/{voters.length} cast
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {electionPhase === 'voting' && votedCount > 0 && (
                    <button
                      className="demo-btn"
                      onClick={tallyVotes}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      <FaChartBar /> Tally Votes
                    </button>
                  )}
                  {electionPhase !== 'voting' && (
                    <button
                      className="demo-btn"
                      onClick={resetElection}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem',
                        background: '#666',
                      }}
                    >
                      Reset Election
                    </button>
                  )}
                </div>
              </div>

              {/* Voting Phase */}
              {electionPhase === 'voting' && (
                <>
                  {/* Voter Selection */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontWeight: 'bold',
                      }}
                    >
                      Select Voter:
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      {voters.map((voter, idx) => (
                        <button
                          key={voter.name}
                          onClick={() => setSelectedVoter(idx)}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            border:
                              selectedVoter === idx
                                ? '2px solid var(--primary-color)'
                                : '2px solid transparent',
                            background: voter.hasVoted
                              ? 'rgba(74, 222, 128, 0.2)'
                              : selectedVoter === idx
                                ? 'var(--primary-color)'
                                : 'rgba(255,255,255,0.1)',
                            color: voter.hasVoted ? '#4ade80' : 'white',
                            cursor: 'pointer',
                            opacity: voter.hasVoted ? 0.9 : 1,
                          }}
                        >
                          {voter.name} {voter.hasVoted && '✓'}
                        </button>
                      ))}
                    </div>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        opacity: 0.6,
                        marginTop: '0.5rem',
                        marginBottom: 0,
                      }}
                    >
                      {voters[selectedVoter]?.hasVoted
                        ? 'Click any voter to view their receipt'
                        : 'Select a voter to cast their ballot'}
                    </p>
                  </div>

                  {/* Current Voter's Ballot */}
                  {!voters[selectedVoter]?.hasVoted && (
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <h4 style={{ marginBottom: '1rem' }}>
                        🗳️ {voters[selectedVoter]?.name}'s Ballot
                      </h4>
                      <p
                        style={{
                          fontSize: '0.85rem',
                          opacity: 0.7,
                          marginBottom: '1rem',
                        }}
                      >
                        Click a candidate to cast your encrypted vote. Your
                        choice will be hidden from everyone, including the
                        election authority.
                      </p>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fit, minmax(150px, 1fr))',
                          gap: '1rem',
                        }}
                      >
                        {candidates.map((candidate) => (
                          <button
                            key={candidate.name}
                            onClick={() => castVote(candidate.name)}
                            className="demo-btn"
                            style={{
                              padding: '1.5rem 1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            <span style={{ fontSize: '2rem' }}>
                              {candidate.emoji}
                            </span>
                            <span>{candidate.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {voters[selectedVoter]?.hasVoted && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '2rem',
                        background: 'rgba(74, 222, 128, 0.1)',
                        borderRadius: '12px',
                      }}
                    >
                      <p style={{ color: '#4ade80', fontSize: '1.2rem' }}>
                        ✓ {voters[selectedVoter]?.name} has voted!
                      </p>
                      <p
                        style={{
                          fontSize: '0.85rem',
                          opacity: 0.7,
                          marginTop: '0.5rem',
                        }}
                      >
                        Their vote is encrypted and cannot be viewed by anyone.
                      </p>

                      {/* Vote Receipt */}
                      {voters[selectedVoter]?.receipt && (
                        <div
                          style={{
                            marginTop: '1.5rem',
                            padding: '1.5rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            border: '2px dashed rgba(74, 222, 128, 0.3)',
                          }}
                        >
                          <h5
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              marginBottom: '1rem',
                              fontSize: '1.1rem',
                            }}
                          >
                            <FaReceipt /> {voters[selectedVoter].name}'s Vote
                            Receipt
                          </h5>
                          <div
                            style={{
                              fontSize: '0.9rem',
                              textAlign: 'left',
                              fontFamily: 'monospace',
                              background: 'rgba(0,0,0,0.2)',
                              padding: '1rem',
                              borderRadius: '6px',
                            }}
                          >
                            <div style={{ marginBottom: '0.5rem' }}>
                              <strong>Receipt Code:</strong>{' '}
                              <span style={{ color: '#4ade80' }}>
                                {voters[selectedVoter].receipt.receiptCode}
                              </span>
                            </div>
                            <div style={{ marginBottom: '0.5rem' }}>
                              <strong>Commitment:</strong>{' '}
                              <span style={{ color: '#3b82f6' }}>
                                {voters[selectedVoter].receipt.voteCommitment}
                              </span>
                            </div>
                            <div>
                              <strong>Timestamp:</strong>{' '}
                              {new Date(
                                voters[selectedVoter].receipt.timestamp,
                              ).toLocaleString()}
                            </div>
                          </div>
                          <p
                            style={{
                              fontSize: '0.8rem',
                              opacity: 0.7,
                              marginTop: '1rem',
                              marginBottom: 0,
                              lineHeight: '1.4',
                            }}
                          >
                            💡 This receipt proves {voters[selectedVoter].name}
                            's vote was recorded. The commitment is a
                            cryptographic hash that will detect any tampering.
                            Save this to verify the vote later!
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Verification & Tampering Tools */}
                  {votedCount > 0 && (
                    <div
                      style={{
                        marginTop: '1.5rem',
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        className="demo-btn"
                        onClick={() => setShowVerification(!showVerification)}
                        style={{
                          flex: 1,
                          minWidth: '200px',
                          background: '#3b82f6',
                        }}
                      >
                        <FaShieldAlt />{' '}
                        {showVerification
                          ? 'Hide Verification'
                          : 'Verify Votes'}
                      </button>
                      {electionPhase === 'voting' && (
                        <button
                          className="demo-btn"
                          onClick={simulateTampering}
                          style={{
                            flex: 1,
                            minWidth: '200px',
                            background: '#ef4444',
                          }}
                        >
                          <FaExclamationTriangle /> Simulate Tampering
                        </button>
                      )}
                    </div>
                  )}

                  {/* Verification Panel */}
                  {showVerification && (
                    <div
                      style={{
                        marginTop: '1.5rem',
                        padding: '1.5rem',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '12px',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                      }}
                    >
                      <h4
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '1rem',
                        }}
                      >
                        <FaShieldAlt /> Public Bulletin Board
                      </h4>
                      <p
                        style={{
                          fontSize: '0.85rem',
                          opacity: 0.8,
                          marginBottom: '1rem',
                        }}
                      >
                        All vote receipts are published here. Anyone can verify
                        their vote was recorded correctly by checking their
                        receipt code.
                      </p>

                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {bulletinBoard.map((receipt, idx) => {
                          const isValid = verifyVote(receipt);
                          const isTampered =
                            tamperedVoterIndex !== null &&
                            voters[tamperedVoterIndex]?.name ===
                              receipt.voterId;

                          return (
                            <div
                              key={idx}
                              style={{
                                padding: '1rem',
                                background: isValid
                                  ? 'rgba(74, 222, 128, 0.1)'
                                  : 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '8px',
                                border: `1px solid ${isValid ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                fontSize: '0.85rem',
                                fontFamily: 'monospace',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '0.5rem',
                                }}
                              >
                                <strong>{receipt.receiptCode}</strong>
                                {isValid ? (
                                  <span
                                    style={{
                                      color: '#4ade80',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                    }}
                                  >
                                    <FaCheckCircle /> Valid
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      color: '#ef4444',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                    }}
                                  >
                                    <FaExclamationTriangle /> TAMPERED
                                  </span>
                                )}
                              </div>
                              <div
                                style={{ opacity: 0.7, fontSize: '0.75rem' }}
                              >
                                Voter: {receipt.voterId} | Commitment:{' '}
                                {receipt.voteCommitment}
                              </div>
                              {isTampered && (
                                <div
                                  style={{
                                    marginTop: '0.5rem',
                                    padding: '0.5rem',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  ⚠️ This vote was altered after being cast! The
                                  cryptographic commitment doesn't match the
                                  current encrypted vote.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div
                        style={{
                          marginTop: '1rem',
                          padding: '1rem',
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                        }}
                      >
                        <strong>How it works:</strong>
                        <ul
                          style={{
                            marginTop: '0.5rem',
                            paddingLeft: '1.5rem',
                            opacity: 0.8,
                          }}
                        >
                          <li>
                            Each vote generates a cryptographic commitment
                            (hash)
                          </li>
                          <li>
                            The commitment is published on a public bulletin
                            board
                          </li>
                          <li>
                            Voters can verify their vote wasn't changed by
                            checking the commitment
                          </li>
                          <li>
                            Any tampering will cause the verification to fail
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Tamper Detection Alert */}
              {tamperDetected && (
                <div
                  style={{
                    padding: '1.5rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    borderRadius: '12px',
                    border: '2px solid #ef4444',
                    marginBottom: '1.5rem',
                  }}
                >
                  <h4
                    style={{
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <FaExclamationTriangle /> Election Tampering Detected!
                  </h4>
                  <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    One or more votes have been altered after being cast. The
                    cryptographic commitments on the bulletin board don't match
                    the current encrypted votes.
                  </p>
                  <p style={{ fontSize: '0.85rem', opacity: 0.8, margin: 0 }}>
                    This demonstrates how end-to-end verifiable voting systems
                    can detect tampering, even by election officials or system
                    administrators.
                  </p>
                </div>
              )}

              {/* Tallying Phase */}
              {electionPhase === 'tallying' && (
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      padding: '2rem',
                      borderRadius: '12px',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <h4 style={{ marginBottom: '1rem' }}>
                      🔐 Encrypted Tallies
                    </h4>
                    <p
                      style={{
                        fontSize: '0.85rem',
                        opacity: 0.7,
                        marginBottom: '1.5rem',
                      }}
                    >
                      All votes have been homomorphically added together. The
                      numbers below are the encrypted totals - they reveal
                      nothing about individual votes or even the final counts.
                    </p>
                    {candidates.map((candidate) => (
                      <div
                        key={candidate.name}
                        style={{
                          marginBottom: '1rem',
                          padding: '1rem',
                          background: 'rgba(0,0,0,0.2)',
                          borderRadius: '8px',
                        }}
                      >
                        <strong>
                          {candidate.emoji} {candidate.name}
                        </strong>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            marginTop: '0.5rem',
                            opacity: 0.6,
                            maxHeight: '60px',
                            overflow: 'hidden',
                          }}
                        >
                          {candidate.encryptedTally?.toString().slice(0, 200)}
                          ...
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="demo-btn"
                    onClick={revealResults}
                    style={{ background: 'var(--accent-color)' }}
                  >
                    <FaUnlock /> Decrypt & Reveal Results
                  </button>
                </div>
              )}

              {/* Results Phase */}
              {electionPhase === 'results' && (
                <div>
                  <div
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(59, 130, 246, 0.1))',
                      padding: '2rem',
                      borderRadius: '12px',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <h4 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                      🏆 Election Results
                    </h4>

                    {/* Winner announcement */}
                    {(() => {
                      const { winner, votes } = getWinner();
                      const winnerCandidate = candidates.find(
                        (c) => c.name === winner,
                      );
                      return (
                        <div
                          style={{
                            textAlign: 'center',
                            marginBottom: '2rem',
                            padding: '1.5rem',
                            background: 'rgba(74, 222, 128, 0.15)',
                            borderRadius: '12px',
                            border: '2px solid #4ade80',
                          }}
                        >
                          <span style={{ fontSize: '3rem' }}>
                            {winnerCandidate?.emoji}
                          </span>
                          <h3 style={{ color: '#4ade80', margin: '0.5rem 0' }}>
                            {winner} Wins!
                          </h3>
                          <p style={{ opacity: 0.8 }}>
                            with {votes} vote{votes !== 1 ? 's' : ''}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Vote breakdown */}
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {candidates
                        .sort(
                          (a, b) =>
                            (b.decryptedTally || 0) - (a.decryptedTally || 0),
                        )
                        .map((candidate, idx) => {
                          const percentage =
                            votedCount > 0
                              ? ((candidate.decryptedTally || 0) / votedCount) *
                                100
                              : 0;
                          const isWinner = idx === 0;
                          return (
                            <div
                              key={candidate.name}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                              }}
                            >
                              <span
                                style={{ fontSize: '1.5rem', width: '40px' }}
                              >
                                {candidate.emoji}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '0.25rem',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: isWinner ? 'bold' : 'normal',
                                    }}
                                  >
                                    {candidate.name}
                                  </span>
                                  <span
                                    style={{
                                      color: isWinner ? '#4ade80' : 'inherit',
                                    }}
                                  >
                                    {candidate.decryptedTally} vote
                                    {candidate.decryptedTally !== 1
                                      ? 's'
                                      : ''}{' '}
                                    ({percentage.toFixed(0)}%)
                                  </span>
                                </div>
                                <div
                                  style={{
                                    height: '8px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${percentage}%`,
                                      background: isWinner
                                        ? '#4ade80'
                                        : 'var(--primary-color)',
                                      transition: 'width 0.5s ease',
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Privacy explanation */}
                  <div
                    style={{
                      padding: '1rem',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '8px',
                      borderLeft: '4px solid #3b82f6',
                    }}
                  >
                    <h5 style={{ marginBottom: '0.5rem' }}>
                      🔒 Privacy Preserved
                    </h5>
                    <p style={{ fontSize: '0.85rem', opacity: 0.8, margin: 0 }}>
                      The election authority only learned the final totals.
                      Individual votes remain completely private - there's no
                      way to determine how any specific voter cast their ballot,
                      even with access to all the encrypted data.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Demo;
