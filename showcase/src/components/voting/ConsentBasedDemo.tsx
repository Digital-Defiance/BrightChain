/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const ConsentBasedDemo = () => {
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
  }, []);

  if (isInitializing)
    return (
      <LoadingSpinner message="Initializing cryptographic voting system..." />
    );

  if (showIntro) {
    return (
      <div className="voting-demo">
        <div className="election-intro">
          <div className="intro-header">
            <span className="intro-emoji">🙋</span>
            <h3>Consent-Based Decision Making!</h3>
          </div>
          <div className="intro-story">
            <p>
              🏢 <strong>Sociocracy:</strong> A worker cooperative needs to make
              decisions that everyone can live with.
            </p>
            <p>
              🙋 <strong>Consent-Based:</strong> Not about agreement - it's
              about "no strong objections". Can you live with this?
            </p>
            <div className="intro-stakes security-warning">
              <p>
                ⚠️ <strong>INSECURE METHOD:</strong> No privacy - objections
                must be heard and addressed!
              </p>
              <p>
                🎯 <strong>The Question:</strong> "Do you have a principled
                objection that would harm the organization?"
              </p>
            </div>
            <p className="intro-challenge">
              🌍 Used in sociocratic organizations, holacracy, and collaborative
              workplaces!
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            🙋 Start Process!
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
        <h3>🙋 Consent-Based - Worker Co-op</h3>
        <p className="election-tagline">
          🤝 No strong objections = consent achieved
        </p>
      </div>

      <div className="security-warning-banner">
        ⚠️ INSECURE: No privacy - objections are shared openly for discussion!
      </div>

      {!results && (
        <>
          <div className="consent-question">
            <h4>Proposal: Implement 4-day work week starting next month</h4>
            <p>
              <strong>The Question:</strong> Do you have a{' '}
              <em>principled objection</em> that would harm our organization?
            </p>
            <p className="consent-note">
              Note: "I prefer 5 days" is not a principled objection. "This would
              bankrupt us" is.
            </p>
          </div>

          <div className="consent-tracker">
            <div className="consent-summary">
              <div className="consent-stat">
                <span className="stat-number">{consentCount}</span>
                <span className="stat-label">✅ Consent</span>
              </div>
              <div className="consent-stat objection">
                <span className="stat-number">{objectionCount}</span>
                <span className="stat-label">🚫 Objections</span>
              </div>
            </div>
            {objectionCount > 0 && (
              <p className="objection-warning">
                ⚠️ {objectionCount} principled objection(s) raised - proposal
                must be modified or withdrawn
              </p>
            )}
          </div>

          <div className="voters-section">
            <h4>
              Circle Members ({votes.size}/{voters.length} responded)
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
                          <span className="consent-badge">✅ No Objection</span>
                        ) : (
                          <div className="objection-display">
                            <span className="objection-badge">
                              🚫 Principled Objection
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
                          ✅ No Objection
                        </button>
                        <button
                          onClick={() => {
                            const objection = prompt(
                              `${voter}, what is your principled objection?`,
                            );
                            if (objection) castVote(voter, false, objection);
                          }}
                          className="vote-btn objection-btn"
                        >
                          🚫 Object
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
              {isTallying ? '🔓 Decrypting votes...' : '🙋 Check for Consent!'}
            </button>
          )}
        </>
      )}

      {results && (
        <div className="results-section">
          <h4>🙋 Consent Process Result!</h4>

          <div className="tally-visualization">
            <h5>📊 Consent Check</h5>
            <p className="tally-explain">
              Consent achieved if zero principled objections
              <br />
              Objections raised: {results.objections.length}
            </p>
          </div>

          <div className="consent-final">
            <div className="consent-breakdown">
              <div className="consent-group">
                <h5>✅ No Objections ({consentCount})</h5>
                <p>These members can live with the proposal</p>
              </div>
              {results.objections.length > 0 && (
                <div className="objection-group">
                  <h5>
                    🚫 Principled Objections ({results.objections.length})
                  </h5>
                  {Array.from(votes.entries())
                    .filter(([_, v]) => !v.consent)
                    .map(([voter, v]) => (
                      <div key={voter} className="objection-item">
                        <strong>{voter}:</strong>
                        <p>"{v.objection || 'Objection raised'}"</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="referendum-outcome">
            <h3>
              {results.passes ? '✅ CONSENT ACHIEVED!' : '🚫 CONSENT BLOCKED!'}
            </h3>
            <p>
              {results.passes
                ? `All ${votes.size} members gave consent (no principled objections). The proposal moves forward.`
                : `${results.objections.length} principled objection(s) raised. The circle must address concerns before proceeding.`}
            </p>
            {!results.passes && (
              <div className="consent-note">
                <h5>💡 Next Steps in Sociocracy:</h5>
                <ul>
                  <li>Listen to objections fully</li>
                  <li>Modify proposal to address concerns</li>
                  <li>Re-test for consent with updated proposal</li>
                  <li>If objections persist, proposal is withdrawn</li>
                </ul>
              </div>
            )}
          </div>

          <button onClick={reset} className="reset-btn">
            New Proposal
          </button>
        </div>
      )}
    </div>
  );
};
