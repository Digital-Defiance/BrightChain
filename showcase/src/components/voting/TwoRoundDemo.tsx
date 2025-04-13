import { useState, useEffect } from 'react';
import { VoteEncoder, PollFactory, PollTallier, Member, MemberType, EmailString, ECIESService } from '@digitaldefiance/ecies-lib';
import type { Poll, PollResults } from '@digitaldefiance/ecies-lib';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const TwoRoundDemo = () => {
  const { isInitializing, setIsInitializing, withTallying } = useVotingDemo();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
  const [voters] = useState(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack']);
  const [round1Votes, setRound1Votes] = useState<Map<string, number>>(new Map());
  const [round2Votes, setRound2Votes] = useState<Map<string, number>>(new Map());
  const [round1Results, setRound1Results] = useState<PollResults | null>(null);
  const [round2Results, setRound2Results] = useState<PollResults | null>(null);
  const [currentRound, setCurrentRound] = useState<1 | 2>(1);
  const [topTwo, setTopTwo] = useState<number[]>([]);
  const [showIntro, setShowIntro] = useState(true);

  const candidates = [
    { name: 'Maria Santos', emoji: '👩‍💼', party: 'Progressive Party' },
    { name: 'John Smith', emoji: '👨‍💼', party: 'Conservative Party' },
    { name: 'Li Wei', emoji: '👨‍🔬', party: 'Tech Forward' },
    { name: 'Aisha Khan', emoji: '👩‍⚖️', party: 'Justice Coalition' },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const eciesService = new ECIESService();
        const { member } = Member.newMember(eciesService, MemberType.System, 'Electoral Commission', new EmailString('commission@election.gov'));
        await member.deriveVotingKeys();
        setAuthority(member as Member);
        const newPoll = PollFactory.createPlurality(candidates.map(c => c.name), member);
        setPoll(newPoll);
      } catch (e) {
        console.error('Init failed:', e);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const castRound1Vote = (voterName: string, candidateIdx: number) => {
    if (!poll || !authority?.votingPublicKey) return;
    const encoder = new VoteEncoder(authority.votingPublicKey);
    const vote = encoder.encodePlurality(candidateIdx, candidates.length);
    const eciesService = new ECIESService();
    const { member: voter } = Member.newMember(eciesService, MemberType.User, voterName, new EmailString(`${voterName.toLowerCase()}@example.com`));
    poll.vote(voter, vote);
    setRound1Votes(new Map(round1Votes.set(voterName, candidateIdx)));
  };

  const tallyRound1 = () => withTallying(async () => {
    if (!poll || !authority?.votingPrivateKey || !authority?.votingPublicKey) return;
    poll.close();
    const tallier = new PollTallier(authority, authority.votingPrivateKey, authority.votingPublicKey);
    const results = tallier.tally(poll);
    setRound1Results(results);
    
    // Find top 2
    const tallies = results.tallies.map((t, idx) => ({ idx, votes: Number(t) }));
    tallies.sort((a, b) => b.votes - a.votes);
    setTopTwo([tallies[0].idx, tallies[1].idx]);
  });

  const startRound2 = () => {
    if (!authority || topTwo.length !== 2) return;
    const runoffCandidates = topTwo.map(idx => candidates[idx].name);
    const newPoll = PollFactory.createPlurality(runoffCandidates, authority);
    setPoll(newPoll);
    setCurrentRound(2);
  };

  const castRound2Vote = (voterName: string, topTwoIdx: number) => {
    if (!poll || !authority?.votingPublicKey) return;
    const encoder = new VoteEncoder(authority.votingPublicKey);
    const vote = encoder.encodePlurality(topTwoIdx, 2);
    const eciesService = new ECIESService();
    const { member: voter } = Member.newMember(eciesService, MemberType.User, voterName, new EmailString(`${voterName.toLowerCase()}@example.com`));
    poll.vote(voter, vote);
    setRound2Votes(new Map(round2Votes.set(voterName, topTwoIdx)));
  };

  const tallyRound2 = () => withTallying(async () => {
    if (!poll || !authority?.votingPrivateKey || !authority?.votingPublicKey) return;
    poll.close();
    const tallier = new PollTallier(authority, authority.votingPrivateKey, authority.votingPublicKey);
    const results = tallier.tally(poll);
    setRound2Results(results);
  });

  const reset = () => {
    if (!authority) return;
    const newPoll = PollFactory.createPlurality(candidates.map(c => c.name), authority);
    setPoll(newPoll);
    setRound1Votes(new Map());
    setRound2Votes(new Map());
    setRound1Results(null);
    setRound2Results(null);
    setCurrentRound(1);
    setTopTwo([]);
  };

  if (isInitializing) return <LoadingSpinner message="Initializing cryptographic voting system..." />;

  if (showIntro) {
    return (
      <div className="voting-demo">
        <div className="election-intro">
          <div className="intro-header">
            <span className="intro-emoji">2️⃣</span>
            <h3>Presidential Election - Two Rounds!</h3>
          </div>
          <div className="intro-story">
            <p>🗳️ <strong>The System:</strong> Four candidates compete. If nobody gets 50%+ in Round 1, the top 2 face off in Round 2!</p>
            <p>🎯 <strong>Why Two Rounds?</strong> Ensures the winner has majority support, not just plurality. Used in France, Brazil, and many presidential elections.</p>
            <div className="intro-stakes">
              <p>📊 <strong>Round 1:</strong> Vote for your favorite among all 4 candidates</p>
              <p>🔄 <strong>Round 2:</strong> If needed, choose between the top 2 finishers</p>
            </div>
            <p className="intro-challenge">⚠️ This requires intermediate decryption between rounds - votes aren't private between rounds!</p>
          </div>
          <button onClick={() => setShowIntro(false)} className="start-election-btn">
            🗳️ Start Round 1!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>2️⃣ Two-Round Voting - Presidential Election</h3>
        <p className="election-tagline">🔄 Round {currentRound}: {currentRound === 1 ? 'Choose your favorite' : 'Final runoff!'}</p>
      </div>

      {currentRound === 1 && !round1Results && (
        <>
          <div className="candidates-section">
            <h4>Round 1 Candidates</h4>
            <div className="candidates-grid">
              {candidates.map((c, idx) => (
                <div key={idx} className="candidate-card">
                  <div className="candidate-emoji">{c.emoji}</div>
                  <h5>{c.name}</h5>
                  <p>{c.party}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="voters-section">
            <h4>Voters ({round1Votes.size}/{voters.length} voted)</h4>
            <div className="voters-grid">
              {voters.map(voter => (
                <div key={voter} className="voter-card">
                  <strong>{voter}</strong>
                  {round1Votes.has(voter) ? (
                    <div className="vote-cast">✓ Voted for {candidates[round1Votes.get(voter)!].emoji}</div>
                  ) : (
                    <div className="vote-buttons">
                      {candidates.map((c, idx) => (
                        <button key={idx} onClick={() => castRound1Vote(voter, idx)} className="vote-btn">
                          {c.emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {round1Votes.size > 0 && (
            <button onClick={tallyRound1} className="tally-btn">
              📊 Count Round 1 Votes!
            </button>
          )}
        </>
      )}

      {round1Results && !round2Results && (
        <div className="round-results">
          <h4>🗳️ Round 1 Results</h4>
          
          <div className="tally-visualization">
            <h5>📊 First Round Tally</h5>
            <p className="tally-explain">Checking if anyone got 50%+ majority...</p>
          </div>

          {candidates.map((c, idx) => {
            const votes = Number(round1Results.tallies[idx]);
            const percent = (votes / round1Votes.size) * 100;
            const isTopTwo = topTwo.includes(idx);
            
            return (
              <div key={idx} className={`result-bar ${isTopTwo ? 'top-two' : 'eliminated'}`}>
                <div className="result-header">
                  <span>{c.emoji} {c.name}</span>
                  <span>{votes} votes ({percent.toFixed(1)}%)</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${percent}%` }} />
                </div>
                {isTopTwo && <span className="badge">→ Round 2</span>}
                {!isTopTwo && <span className="badge eliminated-badge">Eliminated</span>}
              </div>
            );
          })}

          <div className="runoff-announcement">
            <h3>🔄 No Majority! Runoff Required!</h3>
            <p>Top 2 candidates advance to Round 2:</p>
            <div className="runoff-candidates">
              {topTwo.map(idx => (
                <div key={idx} className="runoff-card">
                  <span className="runoff-emoji">{candidates[idx].emoji}</span>
                  <strong>{candidates[idx].name}</strong>
                  <span>{Number(round1Results.tallies[idx])} votes</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={startRound2} className="tally-btn">
            ▶️ Start Round 2 Runoff!
          </button>
        </div>
      )}

      {currentRound === 2 && !round2Results && (
        <>
          <div className="runoff-section">
            <h4>🔥 Round 2 Runoff</h4>
            <div className="runoff-candidates-large">
              {topTwo.map((idx) => (
                <div key={idx} className="runoff-candidate-large">
                  <div className="candidate-emoji-large">{candidates[idx].emoji}</div>
                  <h3>{candidates[idx].name}</h3>
                  <p>{candidates[idx].party}</p>
                  <p className="round1-result">Round 1: {Number(round1Results!.tallies[idx])} votes</p>
                </div>
              ))}
            </div>
          </div>

          <div className="voters-section">
            <h4>Final Vote ({round2Votes.size}/{voters.length} voted)</h4>
            <div className="voters-grid">
              {voters.map(voter => (
                <div key={voter} className="voter-card">
                  <strong>{voter}</strong>
                  {round2Votes.has(voter) ? (
                    <div className="vote-cast">✓ Voted for {candidates[topTwo[round2Votes.get(voter)!]].emoji}</div>
                  ) : (
                    <div className="vote-buttons">
                      {topTwo.map((idx, topTwoIdx) => (
                        <button key={idx} onClick={() => castRound2Vote(voter, topTwoIdx)} className="vote-btn">
                          {candidates[idx].emoji} {candidates[idx].name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {round2Votes.size > 0 && (
            <button onClick={tallyRound2} className="tally-btn">
              🏆 Final Count!
            </button>
          )}
        </>
      )}

      {round2Results && (
        <div className="results-section">
          <h4>🎉 Election Winner!</h4>
          
          <div className="tally-visualization">
            <h5>📊 Round 2 Final Tally</h5>
            <p className="tally-explain">Head-to-head runoff between top 2 candidates:</p>
          </div>

          {topTwo.map((idx, topTwoIdx) => {
            const votes = Number(round2Results.tallies[topTwoIdx]);
            const percent = (votes / round2Votes.size) * 100;
            const isWinner = topTwoIdx === round2Results.winner;
            
            return (
              <div key={idx} className={`result-bar ${isWinner ? 'winner' : ''}`}>
                <div className="result-header">
                  <span>{candidates[idx].emoji} {candidates[idx].name}</span>
                  <span>{votes} votes ({percent.toFixed(1)}%)</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}

          <div className="winner-announcement">
            <h2>🏆 {candidates[topTwo[round2Results.winner!]].name} Wins!</h2>
            <p>Secured {Number(round2Results.tallies[round2Results.winner!])} votes ({((Number(round2Results.tallies[round2Results.winner!]) / round2Votes.size) * 100).toFixed(1)}%) in the runoff</p>
          </div>

          <button onClick={reset} className="reset-btn">New Election</button>
        </div>
      )}
    </div>
  );
};
