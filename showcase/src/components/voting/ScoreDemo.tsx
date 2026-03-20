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
import { useShowcaseI18n } from '../../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../../i18n/showcaseStrings';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const ScoreDemo = () => {
  const { t } = useShowcaseI18n();
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
    {
      name: 'Stellar Odyssey',
      emoji: '🚀',
      genre: t(ShowcaseStrings.Score_Genre_SciFi),
    },
    {
      name: 'Midnight in Paris',
      emoji: '🎭',
      genre: t(ShowcaseStrings.Score_Genre_Romance),
    },
    {
      name: 'Code Warriors',
      emoji: '💻',
      genre: t(ShowcaseStrings.Score_Genre_Thriller),
    },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <LoadingSpinner message={t(ShowcaseStrings.Vote_InitializingCrypto)} />
    );

  return (
    <>
      {(isTallying || isSubmitting) && (
        <LoadingSpinner
          message={
            isTallying
              ? t(ShowcaseStrings.Vote_DecryptingVotes)
              : t(ShowcaseStrings.Score_EncryptingVote)
          }
        />
      )}
      <div className="voting-demo">
        {showIntro ? (
          <div className="election-intro">
            <div className="intro-header">
              <span className="intro-emoji">⭐</span>
              <h3>{t(ShowcaseStrings.Score_IntroTitle)}</h3>
            </div>
            <div className="intro-story">
              <p>
                🎬 <strong>{t(ShowcaseStrings.Score_IntroStoryAcademy)}</strong>
              </p>
              <p>
                ⭐ <strong>{t(ShowcaseStrings.Score_IntroStoryScoring)}</strong>
              </p>
              <p className="intro-challenge">
                🎯 {t(ShowcaseStrings.Score_IntroChallenge)}
              </p>
            </div>
            <button
              onClick={() => setShowIntro(false)}
              className="start-election-btn"
            >
              {t(ShowcaseStrings.Score_StartBtn)}
            </button>
          </div>
        ) : (
          <>
            <div className="demo-header">
              <h3>{t(ShowcaseStrings.Score_DemoTitle)}</h3>
              <p className="election-tagline">
                {t(ShowcaseStrings.Score_DemoTagline)}
              </p>
            </div>

            {!results ? (
              <>
                <div className="candidates-section">
                  <h4>{t(ShowcaseStrings.Score_NominatedFilms)}</h4>
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
                    <h4>
                      {t(ShowcaseStrings.Score_VoterRatingsTemplate).replace(
                        '{VOTER}',
                        voters[currentVoter],
                      )}
                    </h4>
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
                          <span>{t(ShowcaseStrings.Score_Label_Terrible)}</span>
                          <span>{t(ShowcaseStrings.Score_Label_Average)}</span>
                          <span>
                            {t(ShowcaseStrings.Score_Label_Masterpiece)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={submitScores}
                      className="submit-vote-btn"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? t(ShowcaseStrings.Score_Encrypting)
                        : t(ShowcaseStrings.Score_SubmitTemplate)
                            .replace('{CURRENT}', String(currentVoter + 1))
                            .replace('{TOTAL}', String(voters.length))}
                    </button>
                  </div>
                )}

                {votes.size > 0 && (
                  <div className="votes-cast-summary">
                    <h5>
                      {t(ShowcaseStrings.Score_CriticsRatedTemplate)
                        .replace('{COUNT}', String(votes.size))
                        .replace('{TOTAL}', String(voters.length))}
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
                      ? t(ShowcaseStrings.Vote_DecryptingVotes)
                      : t(ShowcaseStrings.Score_TallyBtn)}
                  </button>
                )}
              </>
            ) : (
              <div className="results-section">
                <h4>{t(ShowcaseStrings.Score_ResultsTitle)}</h4>

                <div className="tally-visualization">
                  <h5>{t(ShowcaseStrings.Score_TallyTitle)}</h5>
                  <p className="tally-explain">
                    {t(ShowcaseStrings.Score_TallyExplain).replace(
                      '{COUNT}',
                      String(voters.length),
                    )}
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
                        <span>
                          {t(ShowcaseStrings.Score_AverageTemplate).replace(
                            '{AVG}',
                            avgScore.toFixed(2),
                          )}
                        </span>
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
                  {t(ShowcaseStrings.Score_ResetBtn)}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
