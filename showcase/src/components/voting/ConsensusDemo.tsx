/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useShowcaseI18n } from '../../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../../i18n/showcaseStrings';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const ConsensusDemo = () => {
  const { t } = useShowcaseI18n();
  const { isInitializing, setIsInitializing, isTallying, withTallying } =
    useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);
  const [voters] = useState([
    'Alice',
    'Bob',
    'Charlie',
    'Diana',
    'Eve',
    'Frank',
    'Grace',
    'Henry',
    'Iris',
    'Jack',
  ]);
  const [votes, setVotes] = useState<Map<string, boolean>>(new Map());
  const [results, setResults] = useState<any>(null);
  const threshold = 0.95; // 95%

  const castVote = (voter: string, support: boolean) => {
    setVotes(new Map(votes.set(voter, support)));
  };

  const tallyVotes = () =>
    withTallying(async () => {
      const supportCount = Array.from(votes.values()).filter((v) => v).length;
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

  if (isInitializing)
    return (
      <LoadingSpinner message={t(ShowcaseStrings.Vote_InitializingCrypto)} />
    );

  if (showIntro) {
    return (
      <div className="voting-demo">
        <div className="election-intro">
          <div className="intro-header">
            <span className="intro-emoji">🤝</span>
            <h3>{t(ShowcaseStrings.Cons_IntroTitle)}</h3>
          </div>
          <div className="intro-story">
            <p>{t(ShowcaseStrings.Cons_IntroScenario)}</p>
            <p>{t(ShowcaseStrings.Cons_IntroConsensus)}</p>
            <div className="intro-stakes security-warning">
              <p>{t(ShowcaseStrings.Cons_IntroInsecure)}</p>
              <p>{t(ShowcaseStrings.Cons_IntroWhyUse)}</p>
            </div>
            <p className="intro-challenge">
              {t(ShowcaseStrings.Cons_IntroUsedIn)}
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            {t(ShowcaseStrings.Cons_StartBtn)}
          </button>
        </div>
      </div>
    );
  }

  const supportCount = Array.from(votes.values()).filter((v) => v).length;
  const currentPercent = votes.size > 0 ? (supportCount / votes.size) * 100 : 0;
  const requiredVotes = Math.ceil(voters.length * threshold);

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>{t(ShowcaseStrings.Cons_DemoTitle)}</h3>
        <p className="election-tagline">
          {t(ShowcaseStrings.Cons_DemoTaglineTemplate, {
            PERCENT: (threshold * 100).toFixed(0),
            REQUIRED: String(requiredVotes),
            TOTAL: String(voters.length),
          })}
        </p>
      </div>

      <div className="security-warning-banner">
        {t(ShowcaseStrings.Cons_InsecureBanner)}
      </div>

      {!results && (
        <>
          <div className="consensus-question">
            <h4>{t(ShowcaseStrings.Cons_Proposal)}</h4>
            <p>{t(ShowcaseStrings.Cons_ProposalDesc)}</p>
          </div>

          <div className="consensus-tracker">
            <h5>{t(ShowcaseStrings.Cons_TrackerTitle)}</h5>
            <div className="consensus-bar">
              <div
                className="consensus-support"
                style={{ width: `${currentPercent}%` }}
              >
                {supportCount > 0 && (
                  <span>
                    {t(ShowcaseStrings.Cons_SupportTemplate, {
                      COUNT: String(supportCount),
                    })}
                  </span>
                )}
              </div>
              <div
                className="consensus-threshold"
                style={{ left: `${threshold * 100}%` }}
              >
                <span>{(threshold * 100).toFixed(0)}%</span>
              </div>
            </div>
            <p className="consensus-status">
              {currentPercent >= threshold * 100
                ? t(ShowcaseStrings.Cons_ConsensusReachedTemplate, {
                    SUPPORT: String(supportCount),
                    TOTAL: String(votes.size),
                  })
                : t(ShowcaseStrings.Cons_NeedMoreTemplate, {
                    NEEDED: String(requiredVotes - supportCount),
                  })}
            </p>
          </div>

          <div className="voters-section">
            <h4>
              {t(ShowcaseStrings.Cons_MembersTemplate, {
                VOTED: String(votes.size),
                TOTAL: String(voters.length),
              })}
            </h4>
            <div className="consensus-votes">
              {voters.map((voter) => {
                const hasVoted = votes.has(voter);
                const vote = votes.get(voter);

                return (
                  <div
                    key={voter}
                    className={`consensus-voter ${hasVoted ? (vote ? 'support' : 'oppose') : ''}`}
                  >
                    <strong>{voter}</strong>
                    {hasVoted ? (
                      <span className="vote-display">
                        {vote
                          ? t(ShowcaseStrings.Cons_Support)
                          : t(ShowcaseStrings.Cons_Oppose)}
                      </span>
                    ) : (
                      <div className="vote-buttons">
                        <button
                          onClick={() => castVote(voter, true)}
                          className="vote-btn yes-btn"
                        >
                          {t(ShowcaseStrings.Cons_BtnSupport)}
                        </button>
                        <button
                          onClick={() => castVote(voter, false)}
                          className="vote-btn no-btn"
                        >
                          {t(ShowcaseStrings.Cons_BtnOppose)}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {votes.size > 0 && (
            <button
              onClick={tallyVotes}
              className="tally-btn"
              disabled={isTallying}
            >
              {isTallying
                ? t(ShowcaseStrings.Vote_DecryptingVotes)
                : t(ShowcaseStrings.Cons_CheckConsensus)}
            </button>
          )}
        </>
      )}

      {results && (
        <div className="results-section">
          <h4>{t(ShowcaseStrings.Cons_ResultsTitle)}</h4>

          <div className="tally-visualization">
            <h5>{t(ShowcaseStrings.Cons_FinalCountTitle)}</h5>
            <p className="tally-explain">
              {t(ShowcaseStrings.Cons_RequiredTemplate, {
                REQUIRED: String(requiredVotes),
                TOTAL: String(voters.length),
                PERCENT: (threshold * 100).toFixed(0),
              })}
              <br />
              {t(ShowcaseStrings.Cons_ActualTemplate, {
                SUPPORT: String(results.supportCount),
                VOTED: String(votes.size),
                ACTUAL_PERCENT: (results.percent * 100).toFixed(1),
              })}
            </p>
          </div>

          <div className="consensus-final">
            <div className="consensus-result-bar">
              <div
                className="final-support"
                style={{ width: `${results.percent * 100}%` }}
              >
                {t(ShowcaseStrings.Cons_SupportCountTemplate, {
                  COUNT: String(results.supportCount),
                })}
              </div>
              <div
                className="final-oppose"
                style={{ width: `${(1 - results.percent) * 100}%` }}
              >
                {t(ShowcaseStrings.Cons_OpposeCountTemplate, {
                  COUNT: String(votes.size - results.supportCount),
                })}
              </div>
            </div>
            <div
              className="threshold-marker"
              style={{ left: `${threshold * 100}%` }}
            >
              {t(ShowcaseStrings.Cons_ThresholdTemplate, {
                PERCENT: (threshold * 100).toFixed(0),
              })}
            </div>
          </div>

          <div className="referendum-outcome">
            <h3>
              {results.passes
                ? t(ShowcaseStrings.Cons_ConsensusAchieved)
                : t(ShowcaseStrings.Cons_ConsensusFailed)}
            </h3>
            <p>
              {results.passes
                ? t(ShowcaseStrings.Cons_OutcomePassTemplate, {
                    COUNT: String(results.supportCount),
                    PERCENT: (results.percent * 100).toFixed(1),
                  })
                : t(ShowcaseStrings.Cons_OutcomeFailTemplate, {
                    THRESHOLD: (threshold * 100).toFixed(0),
                    OPPOSE: String(votes.size - results.supportCount),
                  })}
            </p>
            {!results.passes && (
              <div className="consensus-note">
                <p>{t(ShowcaseStrings.Cons_FailNote)}</p>
              </div>
            )}
          </div>

          <button onClick={reset} className="reset-btn">
            {t(ShowcaseStrings.Cons_ResetBtn)}
          </button>
        </div>
      )}
    </div>
  );
};
