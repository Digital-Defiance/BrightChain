import type { Poll, PollResults } from '@digitaldefiance/ecies-lib';
import {
  ECIESService,
  EmailString,
  Member,
  MemberType,
  PollFactory,
  PollTallier,
  VoteEncoder,
} from '@digitaldefiance/ecies-lib';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useShowcaseI18n } from '../../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../../i18n/showcaseStrings';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const SupermajorityDemo = () => {
  const { t } = useShowcaseI18n();

  const [poll, setPoll] = useState<Poll<Uint8Array> | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
  const [voters] = useState([
    'State 1',
    'State 2',
    'State 3',
    'State 4',
    'State 5',
    'State 6',
    'State 7',
    'State 8',
    'State 9',
  ]);
  const [votes, setVotes] = useState<Map<string, number>>(new Map());
  const [results, setResults] = useState<PollResults | null>(null);
  const { isInitializing, setIsInitializing, isTallying, withTallying } =
    useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);
  const threshold = 2 / 3; // 66.67%

  useEffect(() => {
    const init = async () => {
      try {
        const eciesService = new ECIESService();
        const { member } = Member.newMember(
          eciesService,
          MemberType.System,
          'Constitutional Convention',
          new EmailString('convention@gov.us'),
        );
        await member.deriveVotingKeys();
        setAuthority(member as Member);
        const newPoll = PollFactory.create(
          ['Ratify', 'Reject'],
          'supermajority' as any,
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

  const castVote = (voterName: string, choice: number) => {
    if (!poll || !authority?.votingPublicKey) return;
    const encoder = new VoteEncoder(authority.votingPublicKey);
    const vote = encoder.encodePlurality(choice, 2);
    const eciesService = new ECIESService();
    const emailName = voterName.toLowerCase().replace(/\s+/g, '');
    const { member: voter } = Member.newMember(
      eciesService,
      MemberType.User,
      voterName,
      new EmailString(`${emailName}@example.com`),
    );
    poll.vote(voter, vote);
    setVotes(new Map(votes.set(voterName, choice)));
  };

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
      ['Ratify', 'Reject'],
      'supermajority' as any,
      authority,
    );
    setPoll(newPoll);
    setVotes(new Map());
    setResults(null);
  };

  if (isInitializing)
    return (
      <LoadingSpinner message={t(ShowcaseStrings.Vote_InitializingCrypto)} />
    );

  if (showIntro) {
    return (
      <div className="voting-demo">
        <div className="election-intro">
          <div className="intro-header">
            <span className="intro-emoji">🎯</span>
            <h3>{t(ShowcaseStrings.Super_IntroTitle)}</h3>
          </div>
          <div className="intro-story">
            <p>{t(ShowcaseStrings.Super_IntroStakes)}</p>
            <p>{t(ShowcaseStrings.Super_IntroThreshold)}</p>
            <div className="intro-stakes">
              <p>{t(ShowcaseStrings.Super_IntroAmendment)}</p>
              <p>{t(ShowcaseStrings.Super_IntroHighBar)}</p>
            </div>
            <p className="intro-challenge">
              {t(ShowcaseStrings.Super_IntroChallenge)}
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            {t(ShowcaseStrings.Super_StartBtn)}
          </button>
        </div>
      </div>
    );
  }

  const yesVotes = Array.from(votes.values()).filter((v) => v === 0).length;
  const yesPercent = votes.size > 0 ? (yesVotes / votes.size) * 100 : 0;
  const requiredVotes = Math.ceil(voters.length * threshold);

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>{t(ShowcaseStrings.Super_DemoTitle)}</h3>
        <p className="election-tagline">
          {t(ShowcaseStrings.Super_DemoTaglineTemplate)
            .replace('{PERCENT}', (threshold * 100).toFixed(0))
            .replace('{REQUIRED}', String(requiredVotes))
            .replace('{TOTAL}', String(voters.length))}
        </p>
      </div>

      {!results ? (
        <>
          <div className="supermajority-tracker">
            <h4>{t(ShowcaseStrings.Super_TrackerTitle)}</h4>
            <div className="threshold-bar">
              <div
                className="threshold-progress"
                style={{ width: `${yesPercent}%` }}
              >
                {yesVotes > 0 && (
                  <span>
                    {t(ShowcaseStrings.Super_YesCountTemplate).replace(
                      '{COUNT}',
                      String(yesVotes),
                    )}
                  </span>
                )}
              </div>
              <div
                className="threshold-line"
                style={{ left: `${threshold * 100}%` }}
              >
                <span className="threshold-label">
                  {t(ShowcaseStrings.Super_RequiredTemplate).replace(
                    '{PERCENT}',
                    (threshold * 100).toFixed(0),
                  )}
                </span>
              </div>
            </div>
            <p className="threshold-status">
              {yesPercent >= threshold * 100
                ? t(ShowcaseStrings.Super_StatusPassingTemplate)
                    .replace('{YES}', String(yesVotes))
                    .replace('{TOTAL}', String(votes.size))
                    .replace('{PERCENT}', yesPercent.toFixed(1))
                : t(ShowcaseStrings.Super_StatusFailingTemplate)
                    .replace('{YES}', String(yesVotes))
                    .replace('{TOTAL}', String(votes.size))
                    .replace('{PERCENT}', yesPercent.toFixed(1))
                    .replace('{NEED}', String(requiredVotes - yesVotes))}
            </p>
          </div>

          <div className="voters-section">
            <h4>
              {t(ShowcaseStrings.Super_LegislaturesTemplate)
                .replace('{VOTED}', String(votes.size))
                .replace('{TOTAL}', String(voters.length))}
            </h4>
            <div className="voters-grid">
              {voters.map((voter) => (
                <div key={voter} className="voter-card">
                  <strong>{voter}</strong>
                  {votes.has(voter) ? (
                    <div className="vote-cast">
                      {votes.get(voter) === 0
                        ? t(ShowcaseStrings.Super_VotedRatify)
                        : t(ShowcaseStrings.Super_VotedReject)}
                    </div>
                  ) : (
                    <div className="yesno-buttons">
                      <button
                        onClick={() => castVote(voter, 0)}
                        className="vote-btn yes-btn"
                      >
                        {t(ShowcaseStrings.Super_BtnRatify)}
                      </button>
                      <button
                        onClick={() => castVote(voter, 1)}
                        className="vote-btn no-btn"
                      >
                        {t(ShowcaseStrings.Super_BtnReject)}
                      </button>
                    </div>
                  )}
                </div>
              ))}
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
                : t(ShowcaseStrings.Super_TallyBtn)}
            </button>
          )}
        </>
      ) : (
        <div className="results-section">
          <h4>{t(ShowcaseStrings.Super_ResultsTitle)}</h4>

          <div className="tally-visualization">
            <h5>{t(ShowcaseStrings.Super_CalcTitle)}</h5>
            <p className="tally-explain">
              {t(ShowcaseStrings.Super_CalcRequiredTemplate)
                .replace('{REQUIRED}', String(requiredVotes))
                .replace('{TOTAL}', String(voters.length))
                .replace('{PERCENT}', (threshold * 100).toFixed(0))}
              <br />
              {t(ShowcaseStrings.Super_CalcActualTemplate)
                .replace('{ACTUAL}', String(Number(results.tallies[0])))
                .replace('{VOTED}', String(votes.size))
                .replace(
                  '{PERCENT}',
                  ((Number(results.tallies[0]) / votes.size) * 100).toFixed(1),
                )}
            </p>
          </div>

          <div className="supermajority-final">
            <div className="final-bar">
              <div
                className="final-yes"
                style={{
                  width: `${(Number(results.tallies[0]) / votes.size) * 100}%`,
                }}
              >
                {t(ShowcaseStrings.Super_RatifyCountTemplate).replace(
                  '{COUNT}',
                  String(Number(results.tallies[0])),
                )}
              </div>
              <div
                className="final-no"
                style={{
                  width: `${(Number(results.tallies[1]) / votes.size) * 100}%`,
                }}
              >
                {t(ShowcaseStrings.Super_RejectCountTemplate).replace(
                  '{COUNT}',
                  String(Number(results.tallies[1])),
                )}
              </div>
            </div>
            <div
              className="threshold-marker"
              style={{ left: `${threshold * 100}%` }}
            >
              {t(ShowcaseStrings.Super_ThresholdTemplate).replace(
                '{PERCENT}',
                (threshold * 100).toFixed(0),
              )}
            </div>
          </div>

          <div className="referendum-outcome">
            <h3>
              {Number(results.tallies[0]) >= requiredVotes
                ? t(ShowcaseStrings.Super_AmendmentRatified)
                : t(ShowcaseStrings.Super_AmendmentFails)}
            </h3>
            <p>
              {Number(results.tallies[0]) >= requiredVotes
                ? t(ShowcaseStrings.Super_OutcomePassTemplate)
                    .replace('{COUNT}', String(Number(results.tallies[0])))
                    .replace(
                      '{PERCENT}',
                      ((Number(results.tallies[0]) / votes.size) * 100).toFixed(
                        1,
                      ),
                    )
                : t(ShowcaseStrings.Super_OutcomeFailTemplate)
                    .replace('{THRESHOLD}', (threshold * 100).toFixed(0))
                    .replace('{ACTUAL}', String(Number(results.tallies[0])))
                    .replace('{REQUIRED}', String(requiredVotes))}
            </p>
          </div>
          <button onClick={reset} className="reset-btn">
            {t(ShowcaseStrings.Super_ResetBtn)}
          </button>
        </div>
      )}
    </div>
  );
};
