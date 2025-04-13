import { LoadingSpinner } from "./LoadingSpinner";
import { useVotingDemo } from "./useVotingDemo";
import { useState, useEffect } from 'react';

export const ConsensusDemo = () => {
  const { isInitializing, setIsInitializing, isTallying, withTallying } = useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);
  const [voters] = useState(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack']);
  const [votes, setVotes] = useState<Map<string, boolean>>(new Map());
  const [results, setResults] = useState<any>(null);
  const threshold = 0.95; // 95%

  const castVote = (voter: string, support: boolean) => {
    setVotes(new Map(votes.set(voter, support)));
  };

  const tallyVotes = () => withTallying(async () => {
    const supportCount = Array.from(votes.values()).filter(v => v).length;
    const percent = supportCount / votes.size;
    const passes = percent >= threshold;
    setResults({ supportCount, percent, passes });
  });

  const reset = () => {
    setVotes(new Map());
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
            <span className="intro-emoji">🤝</span>
            <h3>Consensus Decision Making!</h3>
          </div>
          <div className="intro-story">
            <p>🏕️ <strong>The Scenario:</strong> A small co-op needs to make a major decision. Everyone's voice matters!</p>
            <p>🤝 <strong>Consensus Voting:</strong> Requires 95%+ agreement. One or two objections can block the proposal.</p>
            <div className="intro-stakes security-warning">
              <p>⚠️ <strong>INSECURE METHOD:</strong> No privacy - everyone sees who supports/opposes!</p>
              <p>🎯 <strong>Why use it?</strong> Small groups where trust and unity are more important than privacy.</p>
            </div>
            <p className="intro-challenge">🌍 Used in co-ops, intentional communities, and consensus-based organizations!</p>
          </div>
          <button onClick={() => setShowIntro(false)} className="start-election-btn">
            🤝 Start Voting!
          </button>
        </div>
      </div>
    );
  }

  const supportCount = Array.from(votes.values()).filter(v => v).length;
  const currentPercent = votes.size > 0 ? (supportCount / votes.size) * 100 : 0;
  const requiredVotes = Math.ceil(voters.length * threshold);

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>🤝 Consensus Voting - Co-op Decision</h3>
        <p className="election-tagline">🎯 Requires {(threshold * 100).toFixed(0)}% agreement ({requiredVotes}/{voters.length} members)</p>
      </div>

      <div className="security-warning-banner">
        ⚠️ INSECURE: No privacy - all votes are visible to build consensus!
      </div>

      {!results && (
        <>
          <div className="consensus-question">
            <h4>Proposal: Should we invest $50k in solar panels?</h4>
            <p>This is a major financial decision requiring near-unanimous support.</p>
          </div>

          <div className="consensus-tracker">
            <h5>📊 Live Consensus Tracker</h5>
            <div className="consensus-bar">
              <div className="consensus-support" style={{ width: `${currentPercent}%` }}>
                {supportCount > 0 && <span>{supportCount} Support</span>}
              </div>
              <div className="consensus-threshold" style={{ left: `${threshold * 100}%` }}>
                <span>{(threshold * 100).toFixed(0)}%</span>
              </div>
            </div>
            <p className="consensus-status">
              {currentPercent >= threshold * 100 ?
                `✅ CONSENSUS REACHED (${supportCount}/${votes.size})` :
                `❌ Need ${requiredVotes - supportCount} more to reach consensus`
              }
            </p>
          </div>

          <div className="voters-section">
            <h4>Co-op Members ({votes.size}/{voters.length} voted)</h4>
            <div className="consensus-votes">
              {voters.map(voter => {
                const hasVoted = votes.has(voter);
                const vote = votes.get(voter);
                
                return (
                  <div key={voter} className={`consensus-voter ${hasVoted ? (vote ? 'support' : 'oppose') : ''}`}>
                    <strong>{voter}</strong>
                    {hasVoted ? (
                      <span className="vote-display">
                        {vote ? '✅ Support' : '❌ Oppose'}
                      </span>
                    ) : (
                      <div className="vote-buttons">
                        <button onClick={() => castVote(voter, true)} className="vote-btn yes-btn">
                          ✅ Support
                        </button>
                        <button onClick={() => castVote(voter, false)} className="vote-btn no-btn">
                          ❌ Oppose
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {votes.size > 0 && (
            <button onClick={tallyVotes} className="tally-btn" disabled={isTallying}>
              {isTallying ? '🔓 Decrypting votes...' : '🤝 Check Consensus!'}
            </button>
          )}
        </>
      )}

      {results && (
        <div className="results-section">
          <h4>🤝 Consensus Result!</h4>
          
          <div className="tally-visualization">
            <h5>📊 Final Count</h5>
            <p className="tally-explain">
              Required: {requiredVotes}/{voters.length} ({(threshold * 100).toFixed(0)}%)<br/>
              Actual: {results.supportCount}/{votes.size} ({(results.percent * 100).toFixed(1)}%)
            </p>
          </div>

          <div className="consensus-final">
            <div className="consensus-result-bar">
              <div className="final-support" style={{ width: `${results.percent * 100}%` }}>
                ✅ {results.supportCount} Support
              </div>
              <div className="final-oppose" style={{ width: `${(1 - results.percent) * 100}%` }}>
                ❌ {votes.size - results.supportCount} Oppose
              </div>
            </div>
            <div className="threshold-marker" style={{ left: `${threshold * 100}%` }}>
              ⬆️ {(threshold * 100).toFixed(0)}% Threshold
            </div>
          </div>

          <div className="referendum-outcome">
            <h3>{results.passes ? '✅ CONSENSUS ACHIEVED!' : '❌ CONSENSUS FAILED!'}</h3>
            <p>
              {results.passes ?
                `The proposal passes with ${results.supportCount} members supporting (${(results.percent * 100).toFixed(1)}%)` :
                `Failed to reach ${(threshold * 100).toFixed(0)}% threshold. ${votes.size - results.supportCount} member(s) opposed, blocking consensus.`
              }
            </p>
            {!results.passes && (
              <div className="consensus-note">
                <p>💡 In consensus decision-making, even one or two objections matter. The group must address concerns or modify the proposal.</p>
              </div>
            )}
          </div>

          <button onClick={reset} className="reset-btn">New Proposal</button>
        </div>
      )}
    </div>
  );
};
