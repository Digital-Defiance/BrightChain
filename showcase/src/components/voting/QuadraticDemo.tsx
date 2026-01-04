import { LoadingSpinner } from "./LoadingSpinner";
import { useVotingDemo } from "./useVotingDemo";
import { useState, useEffect } from 'react';

export const QuadraticDemo = () => {
  const { isInitializing, setIsInitializing, isTallying, withTallying } = useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);
  const [voters] = useState(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']);
  const [currentVoter, setCurrentVoter] = useState(0);
  const [voteAllocations, setVoteAllocations] = useState<number[]>([0, 0, 0, 0]);
  const [allVotes, setAllVotes] = useState<Map<string, number[]>>(new Map());
  const [results, setResults] = useState<any>(null);
  const budget = 100; // Voice credits

  const projects = [
    { name: 'New Park', emoji: '🌳', description: '$500k' },
    { name: 'Library Renovation', emoji: '📚', description: '$300k' },
    { name: 'Community Center', emoji: '🏢', description: '$400k' },
    { name: 'Street Repairs', emoji: '🛣️', description: '$200k' },
  ];

  const calculateCost = (votes: number) => votes * votes;
  const totalCost = voteAllocations.reduce((sum, v) => sum + calculateCost(v), 0);
  const remaining = budget - totalCost;

  const adjustVotes = (idx: number, delta: number) => {
    const newVotes = [...voteAllocations];
    newVotes[idx] = Math.max(0, newVotes[idx] + delta);
    const newCost = newVotes.reduce((sum, v) => sum + calculateCost(v), 0);
    if (newCost <= budget) {
      setVoteAllocations(newVotes);
    }
  };

  const submitVotes = () => {
    setAllVotes(new Map(allVotes.set(voters[currentVoter], [...voteAllocations])));
    if (currentVoter < voters.length - 1) {
      setCurrentVoter(currentVoter + 1);
      setVoteAllocations([0, 0, 0, 0]);
    }
  };

  const tallyVotes = () => withTallying(async () => {
    const totals = projects.map((_, idx) => 
      Array.from(allVotes.values()).reduce((sum, votes) => sum + votes[idx], 0)
    );
    setResults({ totals });
  });

  const reset = () => {
    setAllVotes(new Map());
    setCurrentVoter(0);
    setVoteAllocations([0, 0, 0, 0]);
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
            <span className="intro-emoji">²</span>
            <h3>Quadratic Voting - Budget Allocation!</h3>
          </div>
          <div className="intro-story">
            <p>💰 <strong>The Challenge:</strong> $1.4M budget, 4 projects. How do we measure intensity of preference?</p>
            <p>² <strong>Quadratic Voting:</strong> Each vote costs votes² credits. 1 vote = 1 credit, 2 votes = 4 credits, 3 votes = 9 credits!</p>
            <div className="intro-stakes security-warning">
              <p>⚠️ <strong>INSECURE METHOD:</strong> Requires non-homomorphic operations (square root). Individual votes are visible!</p>
              <p>🎯 <strong>Why use it?</strong> Prevents wealthy voters from dominating. Shows preference intensity, not just yes/no.</p>
            </div>
            <p className="intro-challenge">💡 Used in Colorado House, Taiwanese vTaiwan platform, and corporate governance experiments!</p>
          </div>
          <button onClick={() => setShowIntro(false)} className="start-election-btn">
            💰 Start Allocating!
          </button>
        </div>
      </div>
    );
  }

  const hasVoted = currentVoter >= voters.length || allVotes.size === voters.length;

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>² Quadratic Voting - City Budget</h3>
        <p className="election-tagline">💰 100 voice credits. Votes cost votes²!</p>
      </div>

      <div className="security-warning-banner">
        ⚠️ INSECURE: This method cannot use homomorphic encryption. Votes are visible!
      </div>

      {!results && (
        <>
          <div className="candidates-section">
            <h4>Budget Projects</h4>
            <div className="candidates-grid">
              {projects.map((p, idx) => (
                <div key={idx} className="candidate-card">
                  <div className="candidate-emoji">{p.emoji}</div>
                  <h5>{p.name}</h5>
                  <p>{p.description}</p>
                </div>
              ))}
            </div>
          </div>

          {!hasVoted && (
            <div className="quadratic-section">
              <h4>💰 {voters[currentVoter]}'s Budget ({remaining} credits left)</h4>
              
              {projects.map((p, idx) => {
                const votes = voteAllocations[idx];
                const cost = calculateCost(votes);
                
                return (
                  <div key={idx} className="quadratic-item">
                    <div className="quadratic-header">
                      <span>{p.emoji} {p.name}</span>
                      <span className="quadratic-votes">{votes} votes (costs {cost} credits)</span>
                    </div>
                    <div className="quadratic-controls">
                      <button onClick={() => adjustVotes(idx, -1)} disabled={votes === 0}>-</button>
                      <div className="vote-squares">
                        {Array.from({ length: Math.max(votes, 1) }).map((_, i) => (
                          <div key={i} className={`vote-square ${i < votes ? 'filled' : ''}`} />
                        ))}
                      </div>
                      <button onClick={() => adjustVotes(idx, 1)} disabled={remaining < (2 * votes + 1)}>+</button>
                    </div>
                    <div className="cost-explanation">
                      Next vote costs {2 * votes + 1} credits (from {cost} to {calculateCost(votes + 1)})
                    </div>
                  </div>
                );
              })}

              <div className="budget-summary">
                <strong>Total Cost:</strong> {totalCost}/100 credits
              </div>

              <button onClick={submitVotes} disabled={totalCost === 0} className="submit-vote-btn">
                Submit Allocation ({currentVoter + 1}/{voters.length})
              </button>
            </div>
          )}

          {hasVoted && (
            <button onClick={tallyVotes} className="tally-btn" disabled={isTallying}>
              {isTallying ? '🔓 Decrypting votes...' : '💰 Calculate Totals!'}
            </button>
          )}
        </>
      )}

      {results && (
        <div className="results-section">
          <h4>💰 Budget Allocation Results!</h4>
          
          <div className="tally-visualization">
            <h5>📊 Quadratic Vote Totals</h5>
            <p className="tally-explain">
              Each project's total votes (not credits) determines funding priority:
            </p>
          </div>

          {projects.map((p, idx) => {
            const totalVotes = results.totals[idx];
            const maxVotes = Math.max(...results.totals);
            const isWinner = totalVotes === maxVotes;
            
            return (
              <div key={idx} className={`result-bar ${isWinner ? 'winner' : ''}`}>
                <div className="result-header">
                  <span>{p.emoji} {p.name}</span>
                  <span>{totalVotes} total votes</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(totalVotes / (maxVotes || 1)) * 100}%` }} />
                </div>
                {isWinner && <span className="badge">🏆 Top Priority</span>}
              </div>
            );
          })}

          <div className="quadratic-explanation">
            <h5>💡 How Quadratic Voting Worked</h5>
            <p>The quadratic cost prevented anyone from dominating a single project. To cast 10 votes costs 100 credits (your entire budget!), but spreading 5 votes each on 2 projects only costs 50 credits total.</p>
            <p><strong>Result:</strong> Projects with broad, intense support win over projects with narrow, extreme support.</p>
          </div>

          <button onClick={reset} className="reset-btn">New Budget Vote</button>
        </div>
      )}
    </div>
  );
};
