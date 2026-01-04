import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';
import { useState, useEffect } from 'react';
import { VoteEncoder, PollFactory, PollTallier, Member, MemberType, EmailString, PollEventLogger, ECIESService } from '@digitaldefiance/ecies-lib';
import type { Poll, PollResults, PollConfiguration } from '@digitaldefiance/ecies-lib';

export const ApprovalDemo = () => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
  const [eventLogger, setEventLogger] = useState<PollEventLogger | null>(null);
  const [voters] = useState(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']);
  const [votes, setVotes] = useState<Map<string, number[]>>(new Map());
  const [submittedVoters, setSubmittedVoters] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<PollResults | null>(null);
  const { isInitializing, setIsInitializing, isTallying, withTallying } = useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);
  const [showEventLog, setShowEventLog] = useState(false);

  const candidates = [
    { name: 'TypeScript', emoji: '🔷', description: 'Type-safe JavaScript superset' },
    { name: 'Python', emoji: '🐍', description: 'Versatile scripting language' },
    { name: 'Rust', emoji: '🦀', description: 'Memory-safe systems language' },
    { name: 'Go', emoji: '🐹', description: 'Fast concurrent language' },
    { name: 'Java', emoji: '☕', description: 'Enterprise platform' },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const eciesService = new ECIESService();
        const { member } = Member.newMember(eciesService, MemberType.System, 'Election Authority', new EmailString('authority@example.com'));
        await member.deriveVotingKeys();
        setAuthority(member as Member);
        
        const logger = new PollEventLogger();
        setEventLogger(logger);
        
        const newPoll = PollFactory.createApproval(candidates.map(c => c.name), member);
        setPoll(newPoll);
        
        // Log poll creation
        const config: PollConfiguration = {
          method: 'approval',
          choices: candidates.map(c => c.name),
        };
        logger.logPollCreated(newPoll.id, member.id, config);
      } catch (e) {
        console.error('Init failed:', e);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const toggleCandidate = (voterName: string, candidateIndex: number) => {
    const currentVotes = votes.get(voterName) || [];
    const newVotes = currentVotes.includes(candidateIndex)
      ? currentVotes.filter(i => i !== candidateIndex)
      : [...currentVotes, candidateIndex];
    
    setVotes(new Map(votes.set(voterName, newVotes)));
  };

  const submitVote = async (voterName: string) => {
    if (!poll || !authority?.votingPublicKey || !eventLogger) return;
    
    const selectedIndices = votes.get(voterName) || [];
    const encoder = new VoteEncoder(authority.votingPublicKey);
    const vote = encoder.encodeApproval(selectedIndices, candidates.length);
    
    const voterEcies = new ECIESService();
    const { member: voter } = Member.newMember(voterEcies, MemberType.User, voterName, new EmailString(`${voterName.toLowerCase()}@example.com`));
    poll.vote(voter, vote);
    
    // Log vote cast with anonymized token
    const voterToken = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(voter.id)));
    eventLogger.logVoteCast(poll.id, voterToken, {
      voterName: voterName,
      selectedCount: selectedIndices.length,
    });
  };

  const tallyVotes = () => withTallying(async () => {
    if (!poll || !authority?.votingPrivateKey || !authority?.votingPublicKey || !eventLogger) return;
    
    poll.close();
    const tallier = new PollTallier(authority, authority.votingPrivateKey, authority.votingPublicKey);
    const result = tallier.tally(poll);
    setResults(result);
    
    // Log poll closure with tally hash
    const tallyData = result.tallies.map(t => t.toString()).join(',');
    const tallyHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(tallyData)));
    eventLogger.logPollClosed(poll.id, tallyHash, {
      totalVotes: votedVoters.length,
      winner: result.choices[result.winner!],
    });
  });

  const reset = () => {
    if (!authority) return;
    const newPoll = PollFactory.createApproval(candidates.map(c => c.name), authority);
    setPoll(newPoll);
    setVotes(new Map());
    setSubmittedVoters(new Set());
    setResults(null);
    
    const logger = new PollEventLogger();
    setEventLogger(logger);
    const config: PollConfiguration = {
      method: 'approval',
      choices: candidates.map(c => c.name),
    };
    logger.logPollCreated(newPoll.id, authority.id, config);
  };

  if (isInitializing) return <LoadingSpinner message="Initializing cryptographic voting system..." />;

  if (showIntro) {
    return (
      <div className="voting-demo">
        <div className="election-intro">
          <div className="intro-header">
            <span className="intro-emoji">✅</span>
            <h3>TechCorp's Big Decision!</h3>
          </div>
          <div className="intro-story">
            <p>📢 <strong>Emergency Team Meeting:</strong> "We need to pick our tech stack for the next 5 years, but everyone has different opinions!"</p>
            <p>The CTO has a brilliant idea: <strong>Approval Voting</strong>. Instead of fighting over ONE language, everyone can vote for ALL the languages they'd be happy working with.</p>
            <div className="intro-stakes">
              <p>🤔 <strong>The twist:</strong> You can approve as many or as few as you want. Love TypeScript AND Python? Vote for both! Only trust Rust? That's your vote!</p>
              <p>🎯 <strong>The winner:</strong> Whichever language gets the most approvals becomes the team's primary language.</p>
            </div>
            <p className="intro-challenge">This is how the UN elects its Secretary-General. No vote splitting, no strategic games - just honest preferences!</p>
          </div>
          <button onClick={() => setShowIntro(false)} className="start-election-btn">
            🚀 Let's Vote!
          </button>
        </div>
      </div>
    );
  }

  const votedVoters = Array.from(submittedVoters);

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>✅ Approval Voting - TechCorp Stack Selection</h3>
        <p className="election-tagline">👍 Vote for ALL languages you approve. Most approvals wins!</p>
      </div>

      {!results ? (
        <>
          <div className="candidates-section">
            <h4>Team's Preferred Programming Languages</h4>
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
            <h4>Cast Votes ({votedVoters.length}/{voters.length} voted)</h4>
            {voters.map(voter => {
              const hasVoted = votedVoters.includes(voter);
              const selections = votes.get(voter) || [];
              
              return (
                <div key={voter} className="voter-card approval-voter">
                  <div className="voter-header">
                    <strong>{voter}</strong>
                    {hasVoted && <span className="voted-badge">✓ Voted</span>}
                  </div>
                  
                  {!hasVoted && (
                    <>
                      <div className="approval-grid">
                        {candidates.map((c, idx) => (
                          <button
                            key={idx}
                            onClick={() => toggleCandidate(voter, idx)}
                            className={`approval-btn ${selections.includes(idx) ? 'selected' : ''}`}
                          >
                            {c.emoji} {c.name}
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={() => submitVote(voter)} 
                        disabled={selections.length === 0}
                        className="submit-vote-btn"
                      >
                        Submit ({selections.length} selected)
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {votedVoters.length > 0 && (
            <>
              <button onClick={tallyVotes} className="tally-btn" disabled={isTallying}>
                {isTallying ? '🔓 Decrypting votes...' : 'Tally Votes & Reveal Results'}
              </button>
              <button onClick={() => setShowEventLog(!showEventLog)} className="event-log-btn" style={{ marginLeft: '10px' }}>
                📊 {showEventLog ? 'Hide' : 'Show'} Event Log
              </button>
            </>
          )}
          
          {showEventLog && eventLogger && poll && (
            <div className="event-log-section" style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
              <h4>📊 Event Logger (Requirement 1.3)</h4>
              <p style={{ fontSize: '0.9em', color: '#666' }}>Comprehensive event tracking with microsecond timestamps and sequence numbers</p>
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {eventLogger.getEventsForPoll(poll.id).map((event, idx) => (
                  <div key={idx} style={{ padding: '8px', margin: '5px 0', background: 'white', borderRadius: '4px', fontSize: '0.85em' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>#{event.sequence} - {event.eventType}</strong>
                      <span style={{ color: '#666', fontSize: '0.9em' }}>
                        {new Date(event.timestamp / 1000).toLocaleTimeString()}
                      </span>
                    </div>
                    {event.configuration && (
                      <div style={{ color: '#666', fontSize: '0.9em', marginTop: '4px' }}>
                        Method: {event.configuration.method}, Choices: {event.configuration.choices.length}
                      </div>
                    )}
                    {event.voterToken && (
                      <div style={{ color: '#888', fontSize: '0.85em' }}>
                        Voter Token: {Array.from(event.voterToken.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('')}...
                      </div>
                    )}
                    {event.metadata && (
                      <div style={{ color: '#888', fontSize: '0.85em' }}>
                        {JSON.stringify(event.metadata)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '10px', padding: '10px', background: eventLogger.verifySequence() ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>
                <strong>Sequence Integrity:</strong> {eventLogger.verifySequence() ? '✅ Valid' : '❌ Gaps Detected'}
              </div>
              <div style={{ marginTop: '5px', fontSize: '0.85em', color: '#666' }}>
                Total Events: {eventLogger.getEventsForPoll(poll.id).length}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="results-section">
          <h4>🏆 Results</h4>
          {candidates.map((candidate, idx) => {
            const tally = Number(results.tallies[idx]);
            const percentage = (tally / votedVoters.length) * 100;
            const isWinner = idx === results.winner;
            
            return (
              <div key={idx} className={`result-bar ${isWinner ? 'winner' : ''}`}>
                <div className="result-header">
                  <span>{candidate.emoji} {candidate.name}</span>
                  <span>{tally} approvals ({percentage.toFixed(0)}%)</span>
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
