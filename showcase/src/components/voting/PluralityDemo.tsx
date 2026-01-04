import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';
import { useState, useEffect } from 'react';
import { VoteEncoder, PollFactory, PollTallier, Member, MemberType, EmailString, ImmutableAuditLog, ECIESService } from '@digitaldefiance/ecies-lib';
import type { Poll, PollResults } from '@digitaldefiance/ecies-lib';

export const PluralityDemo = () => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
  const [auditLog, setAuditLog] = useState<ImmutableAuditLog | null>(null);
  const [voters] = useState(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']);
  const [votes, setVotes] = useState<Map<string, number>>(new Map());
  const [results, setResults] = useState<PollResults | null>(null);
  const { isInitializing, setIsInitializing, isTallying, withTallying } = useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const candidates = [
    { name: 'Green Energy Initiative', emoji: '🌱', description: 'Invest in renewable energy infrastructure' },
    { name: 'Public Transit Expansion', emoji: '🚇', description: 'Build new subway lines and bus routes' },
    { name: 'Affordable Housing Program', emoji: '🏘️', description: 'Subsidize housing for low-income families' },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const eciesService = new ECIESService();
        const { member } = Member.newMember(eciesService, MemberType.System, 'Election Authority', new EmailString('authority@example.com'));
        await member.deriveVotingKeys();
        setAuthority(member as Member);
        
        const audit = new ImmutableAuditLog(member);
        setAuditLog(audit);
        
        const newPoll = PollFactory.createPlurality(
          candidates.map(c => c.name),
          member
        );
        setPoll(newPoll);
        
        // Record poll creation in audit log
        audit.recordPollCreated(newPoll.id, {
          method: 'plurality',
          choices: candidates.map(c => c.name),
        });
      } catch (e) {
        console.error('Init failed:', e);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const castVote = async (voterName: string, candidateIndex: number) => {
    if (!poll || !authority?.votingPublicKey || !auditLog) return;
    
    const encoder = new VoteEncoder(authority.votingPublicKey);
    const vote = encoder.encodePlurality(candidateIndex, candidates.length);
    
    const voterEcies = new ECIESService();
    const { member: voter } = Member.newMember(voterEcies, MemberType.User, voterName, new EmailString(`${voterName.toLowerCase()}@example.com`));
    poll.vote(voter, vote);
    
    // Record vote in audit log with hashed voter ID
    const voterIdHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(voter.id)));
    auditLog.recordVoteCast(poll.id, voterIdHash);
    
    setVotes(new Map(votes.set(voterName, candidateIndex)));
  };

  const tallyVotes = () => withTallying(async () => {
    if (!poll || !authority?.votingPrivateKey || !authority?.votingPublicKey || !auditLog) return;
    
    poll.close();
    const tallier = new PollTallier(authority, authority.votingPrivateKey, authority.votingPublicKey);
    const result = tallier.tally(poll);
    setResults(result);
    
    // Record poll closure in audit log
    auditLog.recordPollClosed(poll.id, {
      totalVotes: votes.size,
      winner: result.choices[result.winner!],
    });
  });

  const reset = () => {
    if (!authority) return;
    const newPoll = PollFactory.createPlurality(candidates.map(c => c.name), authority);
    setPoll(newPoll);
    setVotes(new Map());
    setResults(null);
    
    const audit = new ImmutableAuditLog(authority);
    setAuditLog(audit);
    audit.recordPollCreated(newPoll.id, {
      method: 'plurality',
      choices: candidates.map(c => c.name),
    });
  };

  if (isInitializing) return <LoadingSpinner message="Initializing cryptographic voting system..." />;

  if (showIntro) {
    return (
      <div className="voting-demo">
        <div className="election-intro">
          <div className="intro-header">
            <span className="intro-emoji">🗳️</span>
            <h3>Welcome to Riverside City Budget Election!</h3>
          </div>
          <div className="intro-story">
            <p>The city council has allocated $50 million for a major initiative, but they can't decide which project to fund. That's where YOU come in!</p>
            <p><strong>The situation:</strong> Three proposals are on the ballot. Each has passionate supporters, but only ONE can win.</p>
            <div className="intro-stakes">
              <div className="stake-item">
                <span>🌱</span>
                <p><strong>Team Green</strong> wants solar panels on every public building</p>
              </div>
              <div className="stake-item">
                <span>🚇</span>
                <p><strong>Transit Advocates</strong> are pushing for a new subway line</p>
              </div>
              <div className="stake-item">
                <span>🏘️</span>
                <p><strong>Housing Coalition</strong> demands affordable homes for 500 families</p>
              </div>
            </div>
            <p className="intro-challenge">You'll cast votes for 5 citizens. Each vote is <strong>encrypted</strong> - not even the election officials can see individual ballots until the final tally. This is how real democracies should work!</p>
          </div>
          <button onClick={() => setShowIntro(false)} className="start-election-btn">
            🎯 Start the Election!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>🗳️ Plurality Voting - Riverside City Budget</h3>
        <p className="election-tagline">🏛️ One vote per person. Highest votes wins. Democracy in action!</p>
      </div>

      {!results ? (
        <>
          <div className="candidates-section">
            <h4>City Budget Priorities</h4>
            <div className="candidates-grid">
              {candidates.map((candidate, idx) => (
                <div key={idx} className="candidate-card">
                  <div className="candidate-emoji">{candidate.emoji}</div>
                  <h5>{candidate.name}</h5>
                  <p>{candidate.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="voters-section">
            <h4>👥 Citizens Voting ({votes.size}/{voters.length} have voted)</h4>
            <p className="voter-instruction">Click a proposal to cast each citizen's vote. Remember: their choice is encrypted and private!</p>
            <div className="voters-grid">
              {voters.map(voter => (
                <div key={voter} className="voter-card">
                  <strong>{voter}</strong>
                  {votes.has(voter) ? (
                    <div className="vote-cast">✓ Voted for {candidates[votes.get(voter)!].emoji}</div>
                  ) : (
                    <div className="vote-buttons">
                      {candidates.map((c, idx) => (
                        <button key={idx} onClick={() => castVote(voter, idx)} className="vote-btn">
                          {c.emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {votes.size > 0 && (
            <>
              <button onClick={tallyVotes} className="tally-btn" disabled={isTallying}>
                {isTallying ? '🔓 Decrypting votes...' : '📦 Close Polls & Count Votes!'}
              </button>
              <button onClick={() => setShowAuditLog(!showAuditLog)} className="audit-btn" style={{ marginLeft: '10px' }}>
                🔍 {showAuditLog ? 'Hide' : 'Show'} Audit Log
              </button>
            </>
          )}
          
          {showAuditLog && auditLog && (
            <div className="audit-log-section" style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
              <h4>🔒 Immutable Audit Log (Requirement 1.1)</h4>
              <p style={{ fontSize: '0.9em', color: '#666' }}>Cryptographically signed, hash-chained audit trail</p>
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {auditLog.getEntries().map((entry, idx) => (
                  <div key={idx} style={{ padding: '8px', margin: '5px 0', background: 'white', borderRadius: '4px', fontSize: '0.85em' }}>
                    <div><strong>#{entry.sequence}</strong> - {entry.eventType}</div>
                    <div style={{ color: '#666' }}>Timestamp: {new Date(entry.timestamp / 1000).toLocaleString()}</div>
                    {entry.metadata && <div style={{ color: '#888', fontSize: '0.9em' }}>{JSON.stringify(entry.metadata)}</div>}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '10px', padding: '10px', background: auditLog.verifyChain() ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>
                <strong>Chain Integrity:</strong> {auditLog.verifyChain() ? '✅ Valid' : '❌ Compromised'}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="results-section">
          <h4>🎉 The People Have Spoken!</h4>
          <p className="results-intro">After decrypting all votes, here's what Riverside chose:</p>
          
          <div className="tally-visualization">
            <h5>📊 Vote Tally Process</h5>
            <p className="tally-explain">Each encrypted vote was homomorphically added together, then decrypted to reveal the totals:</p>
          </div>
          {candidates.map((candidate, idx) => {
            const tally = Number(results.tallies[idx]);
            const percentage = (tally / votes.size) * 100;
            const isWinner = idx === results.winner;
            
            return (
              <div key={idx} className={`result-bar ${isWinner ? 'winner' : ''}`}>
                <div className="result-header">
                  <span>{candidate.emoji} {candidate.name}</span>
                  <span>{tally} votes ({percentage.toFixed(0)}%)</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
          <button onClick={reset} className="reset-btn">Run Another Election</button>
        </div>
      )}
    </div>
  );
};
