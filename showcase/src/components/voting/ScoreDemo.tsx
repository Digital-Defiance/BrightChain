import type { Poll, PollResults } from '@digitaldefiance/ecies-lib';
import {
  ECIESService,
  EmailString,
  Member,
  MemberType,
  PollFactory,
  PollTallier,
} from '@digitaldefiance/ecies-lib';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const ScoreDemo = () => {
  const {
    isInitializing,
    setIsInitializing,
    isTallying,
    isSubmitting,
    withTallying,
    withSubmitting,
  } = useVotingDemo();
  const [poll, setPoll] = useState<Poll<Uint8Array> | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
  const [voters] = useState([
    'Critic A',
    'Critic B',
    'Critic C',
    'Critic D',
    'Critic E',
  ]);
  const [currentVoter, setCurrentVoter] = useState(0);
  const [currentScores, setCurrentScores] = useState<number[]>([5, 5, 5]);
  const [votes, setVotes] = useState<Map<string, number[]>>(new Map());
  const [results, setResults] = useState<PollResults | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  const movies = [
    { name: 'Stellar Odyssey', emoji: '🚀', genre: 'Sci-Fi Epic' },
    { name: 'Midnight in Paris', emoji: '🎭', genre: 'Romance Drama' },
    { name: 'Code Warriors', emoji: '💻', genre: 'Tech Thriller' },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const eciesService = new ECIESService();
        const { member } = Member.newMember(
          eciesService,
          MemberType.System,
          'Academy',
          new EmailString('academy@awards.com'),
        );
        await member.deriveVotingKeys();
        setAuthority(member as Member);
        const newPoll = PollFactory.create(
          movies.map((m) => m.name),
          'score' as any,
          member,
        );
        setPoll(newPoll);
      } catch (e) {
        console.error('Init failed:', e);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const submitScores = () =>
    withSubmitting(async () => {
      if (!poll || !authority?.votingPublicKey) return;
      const voterName = voters[currentVoter];
      setVotes(new Map(votes.set(voterName, [...currentScores])));
      if (currentVoter < voters.length - 1) {
        setCurrentVoter(currentVoter + 1);
        setCurrentScores([5, 5, 5]);
      }
    });

  const tallyVotes = () =>
    withTallying(async () => {
      if (!poll || !authority?.votingPrivateKey || !authority?.votingPublicKey)
        return;
      poll.close();
      const tallier = new PollTallier(
        authority,
        authority.votingPrivateKey,
        authority.votingPublicKey,
      );
      const result = tallier.tally(poll);
      setResults(result);
    });

  const reset = () => {
    if (!authority) return;
    const newPoll = PollFactory.create(
      movies.map((m) => m.name),
      'score' as any,
      authority,
    );
    setPoll(newPoll);
    setVotes(new Map());
    setResults(null);
    setCurrentVoter(0);
    setCurrentScores([5, 5, 5]);
  };

  const hasVoted =
    currentVoter >= voters.length || votes.size === voters.length;

  if (isInitializing)
    return (
      <LoadingSpinner message="Initializing cryptographic voting system..." />
    );

  return (
    <>
      {(isTallying || isSubmitting) && (
        <LoadingSpinner
          message={isTallying ? 'Decrypting votes...' : 'Encrypting vote...'}
        />
      )}
      <div className="voting-demo">
        {showIntro ? (
          <div className="election-intro">
            <div className="intro-header">
              <span className="intro-emoji">⭐</span>
              <h3>Film Critics Awards Night!</h3>
            </div>
            <div className="intro-story">
              <p>
                🎬 <strong>The Academy:</strong> Three films are nominated for
                Best Picture. Critics must rate each one independently.
              </p>
              <p>
                ⭐ <strong>Score Voting:</strong> Rate each film 0-10. Love one,
                hate another? Score them honestly! The highest average wins.
              </p>
              <p className="intro-challenge">
                🎯 Unlike ranking, you can give multiple films high scores if
                they're all great!
              </p>
            </div>
            <button
              onClick={() => setShowIntro(false)}
              className="start-election-btn"
            >
              🎬 Start Rating!
            </button>
          </div>
        ) : (
          <>
            <div className="demo-header">
              <h3>⭐ Score Voting - Best Picture</h3>
              <p className="election-tagline">
                🎬 Rate each film 0-10. Highest average wins!
              </p>
            </div>

            {!results ? (
              <>
                <div className="candidates-section">
                  <h4>Nominated Films</h4>
                  <div className="candidates-grid">
                    {movies.map((m, idx) => (
                      <div key={idx} className="candidate-card">
                        <div className="candidate-emoji">{m.emoji}</div>
                        <h5>{m.name}</h5>
                        <p>{m.genre}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {!hasVoted && (
                  <div className="score-voting-section">
                    <h4>🎭 {voters[currentVoter]}'s Ratings</h4>
                    {movies.map((movie, idx) => (
                      <div key={idx} className="score-slider">
                        <div className="score-header">
                          <span>
                            {movie.emoji} {movie.name}
                          </span>
                          <span className="score-value">
                            {currentScores[idx]}/10
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={currentScores[idx]}
                          onChange={(e) => {
                            const newScores = [...currentScores];
                            newScores[idx] = parseInt(e.target.value);
                            setCurrentScores(newScores);
                          }}
                          style={{
                            background: `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${(currentScores[idx] / 10) * 100}%, rgba(255, 255, 255, 0.1) ${(currentScores[idx] / 10) * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
                          }}
                          className="score-range"
                        />
                        <div className="score-labels">
                          <span>0 - Terrible</span>
                          <span>5 - Average</span>
                          <span>10 - Masterpiece</span>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={submitScores}
                      className="submit-vote-btn"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? '🔐 Encrypting...'
                        : `Submit Ratings (${currentVoter + 1}/${voters.length})`}
                    </button>
                  </div>
                )}

                {votes.size > 0 && (
                  <div className="votes-cast-summary">
                    <h5>
                      📋 Critics Who Rated: {votes.size}/{voters.length}
                    </h5>
                    {Array.from(votes.entries()).map(([voter, scores]) => (
                      <div key={voter} className="vote-summary">
                        <strong>{voter}:</strong>{' '}
                        {scores
                          .map((s, i) => `${movies[i].emoji}=${s}`)
                          .join(', ')}
                      </div>
                    ))}
                  </div>
                )}

                {hasVoted && (
                  <button
                    onClick={tallyVotes}
                    className="tally-btn"
                    disabled={isTallying}
                  >
                    {isTallying
                      ? '🔓 Decrypting votes...'
                      : '🏆 Calculate Averages!'}
                  </button>
                )}
              </>
            ) : (
              <div className="results-section">
                <h4>🎉 And the Winner Is...</h4>

                <div className="tally-visualization">
                  <h5>📊 Score Averaging Process</h5>
                  <p className="tally-explain">
                    Each film's scores were added and divided by {voters.length}{' '}
                    critics:
                  </p>
                </div>

                {movies.map((movie, idx) => {
                  const totalScore = Array.from(votes.values()).reduce(
                    (sum, scores) => sum + scores[idx],
                    0,
                  );
                  const avgScore = totalScore / votes.size;
                  const isWinner = idx === results.winner;

                  return (
                    <div
                      key={idx}
                      className={`result-bar ${isWinner ? 'winner' : ''}`}
                    >
                      <div className="result-header">
                        <span>
                          {movie.emoji} {movie.name}
                        </span>
                        <span>{avgScore.toFixed(2)}/10 average</span>
                      </div>
                      <div className="score-breakdown">
                        {Array.from(votes.entries()).map(([voter, scores]) => (
                          <span key={voter} className="individual-score">
                            {scores[idx]}
                          </span>
                        ))}
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${(avgScore / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <button onClick={reset} className="reset-btn">
                  New Awards
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
