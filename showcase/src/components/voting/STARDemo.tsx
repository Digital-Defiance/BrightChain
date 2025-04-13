import { useState, useEffect } from 'react';
import { PollFactory, Member, MemberType, EmailString, ECIESService } from '@digitaldefiance/ecies-lib';
import type { Poll } from '@digitaldefiance/ecies-lib';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const STARDemo = () => {
  const { isInitializing, setIsInitializing, isTallying, withTallying } = useVotingDemo();
  const [_poll, setPoll] = useState<Poll | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
  const [voters] = useState(['Voter 1', 'Voter 2', 'Voter 3', 'Voter 4', 'Voter 5', 'Voter 6', 'Voter 7']);
  const [currentVoter, setCurrentVoter] = useState(0);
  const [currentScores, setCurrentScores] = useState<number[]>([5, 5, 5, 5]);
  const [votes, setVotes] = useState<Map<string, number[]>>(new Map());
  const [scoreResults, setScoreResults] = useState<{ idx: number; totalScore: number; avgScore: number }[] | null>(null);
  const [runoffResults, setRunoffResults] = useState<{ winner: number; loser: number; winnerVotes: number; loserVotes: number } | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  const candidates = [
    { name: 'Alex Rivera', emoji: '🎨', platform: 'Arts & Culture' },
    { name: 'Jordan Lee', emoji: '🌱', platform: 'Environment' },
    { name: 'Sam Taylor', emoji: '💼', platform: 'Economy' },
    { name: 'Casey Morgan', emoji: '🏥', platform: 'Healthcare' },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const eciesService = new ECIESService();
        const { member } = Member.newMember(eciesService, MemberType.System, 'Election Board', new EmailString('board@election.gov'));
        await member.deriveVotingKeys();
        setAuthority(member as Member);
        const newPoll = PollFactory.create(candidates.map(c => c.name), 'star' as any, member);
        setPoll(newPoll);
      } catch (e) {
        console.error('Init failed:', e);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const submitScores = () => {
    const voterName = voters[currentVoter];
    setVotes(new Map(votes.set(voterName, [...currentScores])));
    if (currentVoter < voters.length - 1) {
      setCurrentVoter(currentVoter + 1);
      setCurrentScores([5, 5, 5, 5]);
    }
  };

  const runSTAR = () => withTallying(async () => {
    // Step 1: Score phase - find top 2 by total score
    const scores = candidates.map((_, idx) => {
      const totalScore = Array.from(votes.values()).reduce((sum, voterScores) => sum + voterScores[idx], 0);
      return { idx, totalScore, avgScore: totalScore / votes.size };
    });
    scores.sort((a, b) => b.totalScore - a.totalScore);
    setScoreResults(scores);

    // Step 2: Automatic Runoff - count head-to-head preferences
    const top1 = scores[0].idx;
    const top2 = scores[1].idx;
    let top1Wins = 0;
    let top2Wins = 0;

    Array.from(votes.values()).forEach(voterScores => {
      if (voterScores[top1] > voterScores[top2]) top1Wins++;
      else if (voterScores[top2] > voterScores[top1]) top2Wins++;
      // Ties don't count for either
    });

    setRunoffResults({
      winner: top1Wins > top2Wins ? top1 : top2,
      loser: top1Wins > top2Wins ? top2 : top1,
      winnerVotes: Math.max(top1Wins, top2Wins),
      loserVotes: Math.min(top1Wins, top2Wins),
    });
  });

  const reset = () => {
    if (!authority) return;
    const newPoll = PollFactory.create(candidates.map(c => c.name), 'star' as any, authority);
    setPoll(newPoll);
    setVotes(new Map());
    setScoreResults(null);
    setRunoffResults(null);
    setCurrentVoter(0);
    setCurrentScores([5, 5, 5, 5]);
  };

  if (isInitializing) return <LoadingSpinner message="Initializing cryptographic voting system..." />;

  if (showIntro) {
    return (
      <div className="voting-demo">
        <div className="election-intro">
          <div className="intro-header">
            <span className="intro-emoji">⭐🔄</span>
            <h3>STAR Voting - Best of Both Worlds!</h3>
          </div>
          <div className="intro-story">
            <p>🌟 <strong>STAR = Score Then Automatic Runoff</strong></p>
            <p>⭐ <strong>Step 1:</strong> Score all candidates 0-5 stars (like rating movies!)</p>
            <p>🔄 <strong>Step 2:</strong> Top 2 by total score go to automatic runoff. Your scores determine your preference!</p>
            <div className="intro-stakes">
              <p>🎯 <strong>The Magic:</strong> You can give high scores to multiple candidates, but the runoff ensures majority support</p>
              <p>💡 <strong>Example:</strong> You rate Alex=5, Jordan=4, Sam=2, Casey=1. If Alex & Jordan are top 2, your vote goes to Alex!</p>
            </div>
            <p className="intro-challenge">⚠️ Combines score voting's expressiveness with runoff's majority requirement!</p>
          </div>
          <button onClick={() => setShowIntro(false)} className="start-election-btn">
            ⭐ Start Rating!
          </button>
        </div>
      </div>
    );
  }

  const hasVoted = currentVoter >= voters.length || votes.size === voters.length;

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>⭐🔄 STAR Voting - City Council</h3>
        <p className="election-tagline">⭐ Score, then automatic runoff!</p>
      </div>

      {!scoreResults && (
        <>
          <div className="candidates-section">
            <h4>Candidates</h4>
            <div className="candidates-grid">
              {candidates.map((c, idx) => (
                <div key={idx} className="candidate-card">
                  <div className="candidate-emoji">{c.emoji}</div>
                  <h5>{c.name}</h5>
                  <p>{c.platform}</p>
                </div>
              ))}
            </div>
          </div>

          {!hasVoted && (
            <div className="score-voting-section">
              <h4>⭐ {voters[currentVoter]}'s Ratings (0-5 stars)</h4>
              {candidates.map((c, idx) => (
                <div key={idx} className="score-slider">
                  <div className="score-header">
                    <span>{c.emoji} {c.name}</span>
                    <span className="score-value">{'⭐'.repeat(currentScores[idx])}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={currentScores[idx]}
                    onChange={(e) => {
                      const newScores = [...currentScores];
                      newScores[idx] = parseInt(e.target.value);
                      setCurrentScores(newScores);
                    }}
                    className="score-range"
                  />
                </div>
              ))}
              <button onClick={submitScores} className="submit-vote-btn">
                Submit Ratings ({currentVoter + 1}/{voters.length})
              </button>
            </div>
          )}

          {votes.size > 0 && hasVoted && (
            <button onClick={runSTAR} className="tally-btn" disabled={isTallying}>
              {isTallying ? '🔓 Decrypting votes...' : '⭐🔄 Run STAR Algorithm!'}
            </button>
          )}
        </>
      )}

      {scoreResults && !runoffResults && (
        <div className="star-phase">
          <h4>⭐ Phase 1: Score Totals</h4>
          
          <div className="tally-visualization">
            <h5>📊 Adding Up All Scores</h5>
            <p className="tally-explain">Finding top 2 candidates by total score...</p>
          </div>

          {scoreResults.map((result, rank) => {
            const isTopTwo = rank < 2;
            return (
              <div key={result.idx} className={`result-bar ${isTopTwo ? 'top-two' : ''}`}>
                <div className="result-header">
                  <span>{candidates[result.idx].emoji} {candidates[result.idx].name}</span>
                  <span>{result.totalScore} points ({result.avgScore.toFixed(2)} avg)</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(result.totalScore / (votes.size * 5)) * 100}%` }} />
                </div>
                {isTopTwo && <span className="badge">→ Runoff</span>}
              </div>
            );
          })}

          <div className="star-transition">
            <h3>🔄 Automatic Runoff Phase</h3>
            <p>Top 2 advance! Now checking head-to-head preferences...</p>
            <button onClick={() => {
              // Trigger runoff calculation
              const top1 = scoreResults[0].idx;
              const top2 = scoreResults[1].idx;
              let top1Wins = 0;
              let top2Wins = 0;

              Array.from(votes.values()).forEach(voterScores => {
                if (voterScores[top1] > voterScores[top2]) top1Wins++;
                else if (voterScores[top2] > voterScores[top1]) top2Wins++;
              });

              setRunoffResults({
                winner: top1Wins > top2Wins ? top1 : top2,
                loser: top1Wins > top2Wins ? top2 : top1,
                winnerVotes: Math.max(top1Wins, top2Wins),
                loserVotes: Math.min(top1Wins, top2Wins),
              });
            }} className="tally-btn">
              ▶️ Run Automatic Runoff!
            </button>
          </div>
        </div>
      )}

      {runoffResults && scoreResults && (
        <div className="results-section">
          <h4>🎉 STAR Winner!</h4>
          
          <div className="tally-visualization">
            <h5>🔄 Phase 2: Automatic Runoff</h5>
            <p className="tally-explain">Comparing {candidates[scoreResults[0].idx].name} vs {candidates[scoreResults[1].idx].name} using voter preferences:</p>
          </div>

          <div className="runoff-comparison">
            <div className={`runoff-candidate ${runoffResults.winner === scoreResults[0].idx ? 'winner' : ''}`}>
              <div className="candidate-emoji-large">{candidates[scoreResults[0].idx].emoji}</div>
              <h3>{candidates[scoreResults[0].idx].name}</h3>
              <p className="runoff-votes">
                {runoffResults.winner === scoreResults[0].idx ? runoffResults.winnerVotes : runoffResults.loserVotes} voters preferred
              </p>
            </div>
            <div className="vs-divider">VS</div>
            <div className={`runoff-candidate ${runoffResults.winner === scoreResults[1].idx ? 'winner' : ''}`}>
              <div className="candidate-emoji-large">{candidates[scoreResults[1].idx].emoji}</div>
              <h3>{candidates[scoreResults[1].idx].name}</h3>
              <p className="runoff-votes">
                {runoffResults.winner === scoreResults[1].idx ? runoffResults.winnerVotes : runoffResults.loserVotes} voters preferred
              </p>
            </div>
          </div>

          <div className="winner-announcement">
            <h2>🏆 {candidates[runoffResults.winner].name} Wins!</h2>
            <p>Won the automatic runoff {runoffResults.winnerVotes} to {runoffResults.loserVotes}</p>
          </div>

          <button onClick={reset} className="reset-btn">New Election</button>
        </div>
      )}
    </div>
  );
};
