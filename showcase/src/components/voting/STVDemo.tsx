/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useShowcaseI18n } from '../../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../../i18n/showcaseStrings';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const STVDemo = () => {
  const { t } = useShowcaseI18n();
  const { isInitializing, setIsInitializing, withTallying } = useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);
  const [voters] = useState([
    'V1',
    'V2',
    'V3',
    'V4',
    'V5',
    'V6',
    'V7',
    'V8',
    'V9',
    'V10',
    'V11',
    'V12',
  ]);
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

  const quota = Math.floor(voters.length / (seatsToFill + 1)) + 1;

  const toggleCandidate = (idx: number) => {
    if (currentRanking.includes(idx)) {
      setCurrentRanking(currentRanking.filter((i) => i !== idx));
    } else {
      setCurrentRanking([...currentRanking, idx]);
    }
  };

  const submitRanking = () => {
    setRankings(
      new Map(rankings.set(voters[currentVoter], [...currentRanking])),
    );
    if (currentVoter < voters.length - 1) {
      setCurrentVoter(currentVoter + 1);
      setCurrentRanking([]);
    }
  };

  const runSTV = () =>
    withTallying(async () => {
      const voteCount = candidates.map(() => 0);
      const elected: number[] = [];
      const rounds: any[] = [];

      rankings.forEach((ranking) => {
        if (ranking.length > 0) {
          voteCount[ranking[0]]++;
        }
      });

      rounds.push({
        round: 1,
        voteCount: [...voteCount],
        elected: [],
        eliminated: [],
      });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing)
    return (
      <LoadingSpinner message={t(ShowcaseStrings.Vote_InitializingCrypto)} />
    );

  if (showIntro) {
    return (
      <div className="voting-demo">
        <div className="election-intro">
          <div className="intro-header">
            <span className="intro-emoji">📊</span>
            <h3>{t(ShowcaseStrings.STV_IntroTitle)}</h3>
          </div>
          <div className="intro-story">
            <p>{t(ShowcaseStrings.STV_IntroGoal)}</p>
            <p>{t(ShowcaseStrings.STV_IntroSTV)}</p>
            <div className="intro-stakes">
              <p>
                {t(ShowcaseStrings.STV_IntroQuotaTemplate)
                  .replace('{QUOTA}', String(quota))
                  .replace('{VOTERS}', String(voters.length))}
              </p>
              <p>{t(ShowcaseStrings.STV_IntroTransfers)}</p>
            </div>
            <p className="intro-challenge">
              {t(ShowcaseStrings.STV_IntroChallenge)}
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            {t(ShowcaseStrings.STV_StartBtn)}
          </button>
        </div>
      </div>
    );
  }

  const hasVoted =
    currentVoter >= voters.length || rankings.size === voters.length;

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>
          {t(ShowcaseStrings.STV_DemoTitle).replace(
            '{SEATS}',
            String(seatsToFill),
          )}
        </h3>
        <p className="election-tagline">
          {t(ShowcaseStrings.STV_DemoTaglineTemplate).replace(
            '{QUOTA}',
            String(quota),
          )}
        </p>
      </div>

      {!results && (
        <>
          <div className="candidates-section">
            <h4>{t(ShowcaseStrings.STV_PartiesRunning)}</h4>
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
              <h4>
                {t(ShowcaseStrings.STV_RankingTemplate).replace(
                  '{VOTER}',
                  voters[currentVoter],
                )}
              </h4>
              <p>{t(ShowcaseStrings.STV_RankingInstruction)}</p>

              <div className="current-ranking">
                {currentRanking.map((idx, rank) => (
                  <div key={idx} className="ranking-item">
                    <span className="rank-number">#{rank + 1}</span>
                    <span>
                      {candidates[idx].emoji} {candidates[idx].name}
                    </span>
                    <button onClick={() => toggleCandidate(idx)}>✕</button>
                  </div>
                ))}
              </div>

              <div className="candidate-buttons">
                {candidates.map(
                  (c, idx) =>
                    !currentRanking.includes(idx) && (
                      <button
                        key={idx}
                        onClick={() => toggleCandidate(idx)}
                        className="add-candidate-btn"
                      >
                        {c.emoji} {c.name}
                      </button>
                    ),
                )}
              </div>

              <button
                onClick={submitRanking}
                disabled={currentRanking.length === 0}
                className="submit-vote-btn"
              >
                {t(ShowcaseStrings.STV_SubmitRankingTemplate)
                  .replace('{CURRENT}', String(currentVoter + 1))
                  .replace('{TOTAL}', String(voters.length))}
              </button>
            </div>
          )}

          {hasVoted && (
            <button onClick={runSTV} className="tally-btn">
              {t(ShowcaseStrings.STV_RunSTVCount)}
            </button>
          )}
        </>
      )}

      {results && (
        <div className="results-section">
          <h4>{t(ShowcaseStrings.STV_CouncilElected)}</h4>

          <div className="tally-visualization">
            <h5>{t(ShowcaseStrings.STV_CountingTitle)}</h5>
            <p className="tally-explain">
              {t(ShowcaseStrings.STV_CountingExplainTemplate)
                .replace('{QUOTA}', String(quota))
                .replace('{SEATS}', String(seatsToFill))}
            </p>
          </div>

          {candidates.map((c, idx) => {
            const votes = results.voteCount[idx];
            const isElected = results.elected.includes(idx);
            const metQuota = votes >= quota;

            return (
              <div
                key={idx}
                className={`result-bar ${isElected ? 'winner' : ''}`}
              >
                <div className="result-header">
                  <span>
                    {c.emoji} {c.name}
                  </span>
                  <span>
                    {votes} votes {metQuota && t(ShowcaseStrings.STV_QuotaMet)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${(votes / voters.length) * 100}%` }}
                  />
                  <div
                    className="quota-line"
                    style={{ left: `${(quota / voters.length) * 100}%` }}
                  />
                </div>
                {isElected && (
                  <span className="badge">
                    {t(ShowcaseStrings.STV_ElectedBadge)}
                  </span>
                )}
              </div>
            );
          })}

          <div className="stv-winners">
            <h3>{t(ShowcaseStrings.STV_ElectedReps)}</h3>
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
              {t(ShowcaseStrings.STV_ElectedExplainTemplate)
                .replace('{COUNT}', String(results.elected.length))
                .replace('{QUOTA}', String(quota))}
            </p>
          </div>

          <button onClick={reset} className="reset-btn">
            {t(ShowcaseStrings.STV_NewElection)}
          </button>
        </div>
      )}
    </div>
  );
};
