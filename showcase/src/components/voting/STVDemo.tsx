import { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const STVDemo = () => {
  const { isInitializing, setIsInitializing, withTallying } = useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);
  const [voters] = useState(['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12']);
  const [rankings, setRankings] = useState<Map<string, number[]>>(new Map());
  const [currentVoter, setCurrentVoter] = useState(0);
  const [currentRanking, setCurrentRanking] = useState<number[]>([]);
  const [results, setResults] = useState<any>(null);
  const seatsToFill = 3;

  const candidates = [
    { name: 'Red Party', emoji: '🔴', votes: 0 },
    { name: 'Blue Party', emoji: '🔵', votes: 0 },
    { name: 'Green Party', emoji: '🟢', votes: 0 },
    { name: 'Yellow Party', emoji: '🟡', votes: 0 },
    { name: 'Purple Party', emoji: '🟣', votes: 0 },
  ];

  const quota = Math.floor(voters.length / (seatsToFill + 1)) + 1; // Droop quota

  const toggleCandidate = (idx: number) => {
    if (currentRanking.includes(idx)) {
      setCurrentRanking(currentRanking.filter(i => i !== idx));
    } else {
      setCurrentRanking([...currentRanking, idx]);
    }
  };

  const submitRanking = () => {
    setRankings(new Map(rankings.set(voters[currentVoter], [...currentRanking])));
    if (currentVoter < voters.length - 1) {
      setCurrentVoter(currentVoter + 1);
      setCurrentRanking([]);
    }
  };

  const runSTV = () => withTallying(async () => {
    // Simplified STV simulation
    const voteCount = candidates.map(() => 0);
    const elected: number[] = [];
    const rounds: any[] = [];

    // Initial count - first preferences
    rankings.forEach(ranking => {
      if (ranking.length > 0) {
        voteCount[ranking[0]]++;
      }
    });

    rounds.push({ round: 1, voteCount: [...voteCount], elected: [], eliminated: [] });

    // Check for quota
    voteCount.forEach((votes, idx) => {
      if (votes >= quota && !elected.includes(idx)) {
        elected.push(idx);
      }
    });

    setResults({ elected, quota, rounds, voteCount });
  });

  const reset = () => {
    setRankings(new Map());
    setCurrentVoter(0);
    setCurrentRanking([]);
    setResults(null);
  };

  useEffect(() => {
    setIsInitializing(false);
  }, []);

  if (isInitializing) return <LoadingSpinner message="Initializing cryptographic voting system..." />;

  if (showIntro) {
    return (
      <div className="voting-demo">
        <div className="election-intro">
          <div className="intro-header">
            <span className="intro-emoji">📊</span>
            <h3>STV - Proportional Representation!</h3>
          </div>
          <div className="intro-story">
            <p>🏛️ <strong>The Goal:</strong> Elect 3 representatives that reflect the diversity of voter preferences!</p>
            <p>📊 <strong>STV (Single Transferable Vote):</strong> Rank candidates. Votes transfer when your top choice wins or is eliminated.</p>
            <div className="intro-stakes">
              <p>🎯 <strong>Quota:</strong> Need {quota} votes to win a seat (Droop quota: {voters.length}/(3+1) + 1)</p>
              <p>🔄 <strong>Transfers:</strong> Surplus votes from winners and votes from eliminated candidates transfer to next preferences</p>
            </div>
            <p className="intro-challenge">🌍 Used in Ireland, Australia Senate, and many city councils for fair representation!</p>
          </div>
          <button onClick={() => setShowIntro(false)} className="start-election-btn">
            📊 Start Ranking!
          </button>
        </div>
      </div>
    );
  }

  const hasVoted = currentVoter >= voters.length || rankings.size === voters.length;

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>📊 STV - City Council (3 seats)</h3>
        <p className="election-tagline">🎯 Quota: {quota} votes needed per seat</p>
      </div>

      {!results && (
        <>
          <div className="candidates-section">
            <h4>Parties Running</h4>
            <div className="candidates-grid">
              {candidates.map((c, idx) => (
                <div key={idx} className="candidate-card">
                  <div className="candidate-emoji">{c.emoji}</div>
                  <h5>{c.name}</h5>
                </div>
              ))}
            </div>
          </div>

          {!hasVoted && (
            <div className="stv-ranking-section">
              <h4>📝 {voters[currentVoter]}'s Ranking</h4>
              <p>Click to add candidates in order of preference:</p>
              
              <div className="current-ranking">
                {currentRanking.map((idx, rank) => (
                  <div key={idx} className="ranking-item">
                    <span className="rank-number">#{rank + 1}</span>
                    <span>{candidates[idx].emoji} {candidates[idx].name}</span>
                    <button onClick={() => toggleCandidate(idx)}>✕</button>
                  </div>
                ))}
              </div>

              <div className="candidate-buttons">
                {candidates.map((c, idx) => (
                  !currentRanking.includes(idx) && (
                    <button key={idx} onClick={() => toggleCandidate(idx)} className="add-candidate-btn">
                      {c.emoji} {c.name}
                    </button>
                  )
                ))}
              </div>

              <button onClick={submitRanking} disabled={currentRanking.length === 0} className="submit-vote-btn">
                Submit Ranking ({currentVoter + 1}/{voters.length})
              </button>
            </div>
          )}

          {hasVoted && (
            <button onClick={runSTV} className="tally-btn">
              📊 Run STV Count!
            </button>
          )}
        </>
      )}

      {results && (
        <div className="results-section">
          <h4>🏛️ Council Elected!</h4>
          
          <div className="tally-visualization">
            <h5>📊 STV Counting Process</h5>
            <p className="tally-explain">
              Quota: {quota} votes | Seats: {seatsToFill}<br/>
              First preference count determines initial winners
            </p>
          </div>

          {candidates.map((c, idx) => {
            const votes = results.voteCount[idx];
            const isElected = results.elected.includes(idx);
            const metQuota = votes >= quota;
            
            return (
              <div key={idx} className={`result-bar ${isElected ? 'winner' : ''}`}>
                <div className="result-header">
                  <span>{c.emoji} {c.name}</span>
                  <span>{votes} votes {metQuota && '(Quota met!)'}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(votes / voters.length) * 100}%` }} />
                  <div className="quota-line" style={{ left: `${(quota / voters.length) * 100}%` }} />
                </div>
                {isElected && <span className="badge">✓ ELECTED</span>}
              </div>
            );
          })}

          <div className="stv-winners">
            <h3>🎉 Elected Representatives</h3>
            <div className="winner-grid">
              {results.elected.map((idx: number) => (
                <div key={idx} className="stv-winner-card">
                  <span className="winner-emoji">{candidates[idx].emoji}</span>
                  <strong>{candidates[idx].name}</strong>
                  <span>{results.voteCount[idx]} votes</span>
                </div>
              ))}
            </div>
            <p className="stv-explanation">
              💡 These {results.elected.length} parties each met the quota of {quota} votes and won seats on the council!
            </p>
          </div>

          <button onClick={reset} className="reset-btn">New Election</button>
        </div>
      )}
    </div>
  );
};
