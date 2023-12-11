/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useShowcaseI18n } from '../../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../../i18n/showcaseStrings';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const QuadraticDemo = () => {
  const { t } = useShowcaseI18n();
  const { isInitializing, setIsInitializing, isTallying, withTallying } =
    useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);
  const [voters] = useState(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']);
  const [currentVoter, setCurrentVoter] = useState(0);
  const [voteAllocations, setVoteAllocations] = useState<number[]>([
    0, 0, 0, 0,
  ]);
  const [allVotes, setAllVotes] = useState<Map<string, number[]>>(new Map());
  const [results, setResults] = useState<any>(null);
  const budget = 100; // Voice credits

  const projects = [
    {
      name: t(ShowcaseStrings.Quad_Proj1_Name),
      emoji: '🌳',
      description: t(ShowcaseStrings.Quad_Proj1_Desc),
    },
    {
      name: t(ShowcaseStrings.Quad_Proj2_Name),
      emoji: '📚',
      description: t(ShowcaseStrings.Quad_Proj2_Desc),
    },
    {
      name: t(ShowcaseStrings.Quad_Proj3_Name),
      emoji: '🏢',
      description: t(ShowcaseStrings.Quad_Proj3_Desc),
    },
    {
      name: t(ShowcaseStrings.Quad_Proj4_Name),
      emoji: '🛣️',
      description: t(ShowcaseStrings.Quad_Proj4_Desc),
    },
  ];

  const calculateCost = (votes: number) => votes * votes;
  const totalCost = voteAllocations.reduce(
    (sum, v) => sum + calculateCost(v),
    0,
  );
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
    setAllVotes(
      new Map(allVotes.set(voters[currentVoter], [...voteAllocations])),
    );
    if (currentVoter < voters.length - 1) {
      setCurrentVoter(currentVoter + 1);
      setVoteAllocations([0, 0, 0, 0]);
    }
  };

  const tallyVotes = () =>
    withTallying(async () => {
      const totals = projects.map((_, idx) =>
        Array.from(allVotes.values()).reduce(
          (sum, votes) => sum + votes[idx],
          0,
        ),
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
            <span className="intro-emoji">²</span>
            <h3>{t(ShowcaseStrings.Quad_IntroTitle)}</h3>
          </div>
          <div className="intro-story">
            <p>{t(ShowcaseStrings.Quad_IntroChallenge)}</p>
            <p>{t(ShowcaseStrings.Quad_IntroQuadratic)}</p>
            <div className="intro-stakes security-warning">
              <p>{t(ShowcaseStrings.Quad_IntroInsecure)}</p>
              <p>{t(ShowcaseStrings.Quad_IntroWhyUse)}</p>
            </div>
            <p className="intro-challenge">
              {t(ShowcaseStrings.Quad_IntroUsedIn)}
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            {t(ShowcaseStrings.Quad_StartBtn)}
          </button>
        </div>
      </div>
    );
  }

  const hasVoted =
    currentVoter >= voters.length || allVotes.size === voters.length;

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>{t(ShowcaseStrings.Quad_DemoTitle)}</h3>
        <p className="election-tagline">
          {t(ShowcaseStrings.Quad_DemoTagline)}
        </p>
      </div>

      <div className="security-warning-banner">
        {t(ShowcaseStrings.Quad_InsecureBanner)}
      </div>

      {!results && (
        <>
          <div className="candidates-section">
            <h4>{t(ShowcaseStrings.Quad_BudgetProjects)}</h4>
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
              <h4>
                {t(ShowcaseStrings.Quad_BudgetTemplate, {
                  VOTER: voters[currentVoter],
                  REMAINING: String(remaining),
                })}
              </h4>

              {projects.map((p, idx) => {
                const votes = voteAllocations[idx];
                const cost = calculateCost(votes);

                return (
                  <div key={idx} className="quadratic-item">
                    <div className="quadratic-header">
                      <span>
                        {p.emoji} {p.name}
                      </span>
                      <span className="quadratic-votes">
                        {t(ShowcaseStrings.Quad_VotesTemplate, {
                          VOTES: String(votes),
                          COST: String(cost),
                        })}
                      </span>
                    </div>
                    <div className="quadratic-controls">
                      <button
                        onClick={() => adjustVotes(idx, -1)}
                        disabled={votes === 0}
                      >
                        -
                      </button>
                      <div className="vote-squares">
                        {Array.from({ length: Math.max(votes, 1) }).map(
                          (_, i) => (
                            <div
                              key={i}
                              className={`vote-square ${i < votes ? 'filled' : ''}`}
                            />
                          ),
                        )}
                      </div>
                      <button
                        onClick={() => adjustVotes(idx, 1)}
                        disabled={remaining < 2 * votes + 1}
                      >
                        +
                      </button>
                    </div>
                    <div className="cost-explanation">
                      {t(ShowcaseStrings.Quad_CostExplanationTemplate, {
                        NEXT_COST: String(2 * votes + 1),
                        CURRENT: String(cost),
                        NEXT_TOTAL: String(calculateCost(votes + 1)),
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="budget-summary">
                <strong>
                  {t(ShowcaseStrings.Quad_BudgetSummaryTemplate, {
                    USED: String(totalCost),
                  })}
                </strong>
              </div>

              <button
                onClick={submitVotes}
                disabled={totalCost === 0}
                className="submit-vote-btn"
              >
                {t(ShowcaseStrings.Quad_SubmitTemplate, {
                  CURRENT: String(currentVoter + 1),
                  TOTAL: String(voters.length),
                })}
              </button>
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
                : t(ShowcaseStrings.Quad_CalculateTotals)}
            </button>
          )}
        </>
      )}

      {results && (
        <div className="results-section">
          <h4>{t(ShowcaseStrings.Quad_ResultsTitle)}</h4>

          <div className="tally-visualization">
            <h5>{t(ShowcaseStrings.Quad_TallyTitle)}</h5>
            <p className="tally-explain">
              {t(ShowcaseStrings.Quad_TallyExplain)}
            </p>
          </div>

          {projects.map((p, idx) => {
            const totalVotes = results.totals[idx];
            const maxVotes = Math.max(...results.totals);
            const isWinner = totalVotes === maxVotes;

            return (
              <div
                key={idx}
                className={`result-bar ${isWinner ? 'winner' : ''}`}
              >
                <div className="result-header">
                  <span>
                    {p.emoji} {p.name}
                  </span>
                  <span>
                    {t(ShowcaseStrings.Quad_TotalVotesTemplate, {
                      TOTAL: String(totalVotes),
                    })}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(totalVotes / (maxVotes || 1)) * 100}%`,
                    }}
                  />
                </div>
                {isWinner && (
                  <span className="badge">
                    {t(ShowcaseStrings.Quad_TopPriority)}
                  </span>
                )}
              </div>
            );
          })}

          <div className="quadratic-explanation">
            <h5>{t(ShowcaseStrings.Quad_ExplanationTitle)}</h5>
            <p>{t(ShowcaseStrings.Quad_ExplanationP1)}</p>
            <p>
              <strong>{t(ShowcaseStrings.Quad_ExplanationResult)}</strong>
            </p>
          </div>

          <button onClick={reset} className="reset-btn">
            {t(ShowcaseStrings.Quad_ResetBtn)}
          </button>
        </div>
      )}
    </div>
  );
};
