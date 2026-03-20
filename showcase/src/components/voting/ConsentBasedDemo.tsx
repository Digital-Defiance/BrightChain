/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useShowcaseI18n } from '../../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../../i18n/showcaseStrings';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const ConsentBasedDemo = () => {
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
  ]);
  const [votes, setVotes] = useState<
    Map<string, { consent: boolean; objection?: string }>
  >(new Map());
  const [results, setResults] = useState<any>(null);

  const castVote = (voter: string, consent: boolean, objection?: string) => {
    setVotes(new Map(votes.set(voter, { consent, objection })));
  };

  const tallyVotes = () =>
    withTallying(async () => {
      const objections = Array.from(votes.values()).filter((v) => !v.consent);
      const passes = objections.length === 0;
      setResults({ objections, passes });
    });

  const reset = () => {
    setVotes(new Map());
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
            <span className="intro-emoji">🙋</span>
            <h3>{t(ShowcaseStrings.Consent_IntroTitle)}</h3>
          </div>
          <div className="intro-story">
            <p>{t(ShowcaseStrings.Consent_IntroSociocracy)}</p>
            <p>{t(ShowcaseStrings.Consent_IntroConsentBased)}</p>
            <div className="intro-stakes security-warning">
              <p>{t(ShowcaseStrings.Consent_IntroInsecure)}</p>
              <p>{t(ShowcaseStrings.Consent_IntroQuestion)}</p>
            </div>
            <p className="intro-challenge">
              {t(ShowcaseStrings.Consent_IntroUsedIn)}
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            {t(ShowcaseStrings.Consent_StartBtn)}
          </button>
        </div>
      </div>
    );
  }

  const consentCount = Array.from(votes.values()).filter(
    (v) => v.consent,
  ).length;
  const objectionCount = Array.from(votes.values()).filter(
    (v) => !v.consent,
  ).length;

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>{t(ShowcaseStrings.Consent_DemoTitle)}</h3>
        <p className="election-tagline">
          {t(ShowcaseStrings.Consent_DemoTagline)}
        </p>
      </div>

      <div className="security-warning-banner">
        {t(ShowcaseStrings.Consent_InsecureBanner)}
      </div>

      {!results && (
        <>
          <div className="consent-question">
            <h4>{t(ShowcaseStrings.Consent_ProposalTitle)}</h4>
            <p>
              <strong>{t(ShowcaseStrings.Consent_ProposalQuestion)}</strong>
            </p>
            <p className="consent-note">
              {t(ShowcaseStrings.Consent_ProposalNote)}
            </p>
          </div>

          <div className="consent-tracker">
            <div className="consent-summary">
              <div className="consent-stat">
                <span className="stat-number">{consentCount}</span>
                <span className="stat-label">
                  {t(ShowcaseStrings.Consent_ConsentCount)}
                </span>
              </div>
              <div className="consent-stat objection">
                <span className="stat-number">{objectionCount}</span>
                <span className="stat-label">
                  {t(ShowcaseStrings.Consent_ObjectionCount)}
                </span>
              </div>
            </div>
            {objectionCount > 0 && (
              <p className="objection-warning">
                {t(ShowcaseStrings.Consent_ObjectionWarningTemplate, {
                  COUNT: String(objectionCount),
                })}
              </p>
            )}
          </div>

          <div className="voters-section">
            <h4>
              {t(ShowcaseStrings.Consent_MembersTemplate, {
                RESPONDED: String(votes.size),
                TOTAL: String(voters.length),
              })}
            </h4>
            <div className="consent-votes">
              {voters.map((voter) => {
                const hasVoted = votes.has(voter);
                const vote = votes.get(voter);

                return (
                  <div
                    key={voter}
                    className={`consent-voter ${hasVoted ? (vote?.consent ? 'consent' : 'objection') : ''}`}
                  >
                    <strong>{voter}</strong>
                    {hasVoted ? (
                      <div className="vote-display">
                        {vote?.consent ? (
                          <span className="consent-badge">
                            {t(ShowcaseStrings.Consent_NoObjection)}
                          </span>
                        ) : (
                          <div className="objection-display">
                            <span className="objection-badge">
                              {t(ShowcaseStrings.Consent_PrincipledObjection)}
                            </span>
                            {vote?.objection && (
                              <p className="objection-text">
                                "{vote.objection}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="consent-buttons">
                        <button
                          onClick={() => castVote(voter, true)}
                          className="vote-btn consent-btn"
                        >
                          {t(ShowcaseStrings.Consent_BtnNoObjection)}
                        </button>
                        <button
                          onClick={() => {
                            const objection = prompt(
                              t(
                                ShowcaseStrings.Consent_ObjectionPromptTemplate,
                                { VOTER: voter },
                              ),
                            );
                            if (objection) castVote(voter, false, objection);
                          }}
                          className="vote-btn objection-btn"
                        >
                          {t(ShowcaseStrings.Consent_BtnObject)}
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
                : t(ShowcaseStrings.Consent_CheckConsent)}
            </button>
          )}
        </>
      )}

      {results && (
        <div className="results-section">
          <h4>{t(ShowcaseStrings.Consent_ResultsTitle)}</h4>

          <div className="tally-visualization">
            <h5>{t(ShowcaseStrings.Consent_ConsentCheckTitle)}</h5>
            <p className="tally-explain">
              {t(ShowcaseStrings.Consent_ConsentCheckExplainTemplate, {
                COUNT: String(results.objections.length),
              })}
            </p>
          </div>

          <div className="consent-final">
            <div className="consent-breakdown">
              <div className="consent-group">
                <h5>
                  {t(ShowcaseStrings.Consent_NoObjectionsGroup, {
                    COUNT: String(consentCount),
                  })}
                </h5>
                <p>{t(ShowcaseStrings.Consent_NoObjectionsDesc)}</p>
              </div>
              {results.objections.length > 0 && (
                <div className="objection-group">
                  <h5>
                    {t(ShowcaseStrings.Consent_ObjectionsGroupTemplate, {
                      COUNT: String(results.objections.length),
                    })}
                  </h5>
                  {Array.from(votes.entries())
                    .filter(([_, v]) => !v.consent)
                    .map(([voter, v]) => (
                      <div key={voter} className="objection-item">
                        <strong>{voter}:</strong>
                        <p>
                          "
                          {v.objection ||
                            t(ShowcaseStrings.Consent_ObjectionRaised)}
                          "
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="referendum-outcome">
            <h3>
              {results.passes
                ? t(ShowcaseStrings.Consent_ConsentAchieved)
                : t(ShowcaseStrings.Consent_ConsentBlocked)}
            </h3>
            <p>
              {results.passes
                ? t(ShowcaseStrings.Consent_OutcomePassTemplate, {
                    COUNT: String(votes.size),
                  })
                : t(ShowcaseStrings.Consent_OutcomeFailTemplate, {
                    COUNT: String(results.objections.length),
                  })}
            </p>
            {!results.passes && (
              <div className="consent-note">
                <h5>{t(ShowcaseStrings.Consent_NextStepsTitle)}</h5>
                <ul>
                  <li>{t(ShowcaseStrings.Consent_NextStep1)}</li>
                  <li>{t(ShowcaseStrings.Consent_NextStep2)}</li>
                  <li>{t(ShowcaseStrings.Consent_NextStep3)}</li>
                  <li>{t(ShowcaseStrings.Consent_NextStep4)}</li>
                </ul>
              </div>
            )}
          </div>

          <button onClick={reset} className="reset-btn">
            {t(ShowcaseStrings.Consent_ResetBtn)}
          </button>
        </div>
      )}
    </div>
  );
};
