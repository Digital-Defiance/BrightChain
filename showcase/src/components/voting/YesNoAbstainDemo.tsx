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

export const YesNoAbstainDemo = () => {
  const { t } = useShowcaseI18n();

  const [poll, setPoll] = useState<Poll<Uint8Array> | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
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
  ]);
  const [votes, setVotes] = useState<Map<string, number>>(new Map());
  const [results, setResults] = useState<PollResults | null>(null);
  const { isInitializing, setIsInitializing, isTallying, withTallying } =
    useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const eciesService = new ECIESService();
        const { member } = Member.newMember(
          eciesService,
          MemberType.System,
          'UN Assembly',
          new EmailString('assembly@un.org'),
        );
        await member.deriveVotingKeys();
        setAuthority(member as Member);
        const newPoll = PollFactory.create(
          ['Yes', 'No', 'Abstain'],
          'yes-no-abstain' as any,
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
    const vote = encoder.encodePlurality(choice, 3);
    const eciesService = new ECIESService();
    const { member: voter } = Member.newMember(
      eciesService,
      MemberType.User,
      voterName,
      new EmailString(`${voterName.toLowerCase()}@example.com`),
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
      ['Yes', 'No', 'Abstain'],
      'yes-no-abstain' as any,
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
            <span className="intro-emoji">🤷</span>
            <h3>{t(ShowcaseStrings.YNA_IntroTitle)}</h3>
          </div>
          <div className="intro-story">
            <p>
              <strong>{t(ShowcaseStrings.YNA_IntroResolution)}</strong>
            </p>
            <p>{t(ShowcaseStrings.YNA_IntroStory)}</p>
            <div className="intro-stakes">
              <p>{t(ShowcaseStrings.YNA_IntroYes)}</p>
              <p>{t(ShowcaseStrings.YNA_IntroNo)}</p>
              <p>{t(ShowcaseStrings.YNA_IntroAbstain)}</p>
            </div>
            <p className="intro-challenge">
              {t(ShowcaseStrings.YNA_IntroChallenge)}
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            {t(ShowcaseStrings.YNA_StartBtn)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>{t(ShowcaseStrings.YNA_DemoTitle)}</h3>
        <p className="election-tagline">{t(ShowcaseStrings.YNA_DemoTagline)}</p>
      </div>

      {!results ? (
        <>
          <div className="referendum-question">
            <h4>{t(ShowcaseStrings.YNA_ReferendumQuestion)}</h4>
          </div>

          <div className="voters-section">
            <h4>
              {t(ShowcaseStrings.YNA_CouncilVotingTemplate)
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
                        ? t(ShowcaseStrings.YNA_VotedYes)
                        : votes.get(voter) === 1
                          ? t(ShowcaseStrings.YNA_VotedNo)
                          : t(ShowcaseStrings.YNA_VotedAbstain)}
                    </div>
                  ) : (
                    <div className="abstain-buttons">
                      <button
                        onClick={() => castVote(voter, 0)}
                        className="vote-btn yes-btn"
                      >
                        {t(ShowcaseStrings.YNA_BtnYes)}
                      </button>
                      <button
                        onClick={() => castVote(voter, 1)}
                        className="vote-btn no-btn"
                      >
                        {t(ShowcaseStrings.YNA_BtnNo)}
                      </button>
                      <button
                        onClick={() => castVote(voter, 2)}
                        className="vote-btn abstain-btn"
                      >
                        {t(ShowcaseStrings.YNA_BtnAbstain)}
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
                : t(ShowcaseStrings.YNA_TallyBtn)}
            </button>
          )}
        </>
      ) : (
        <div className="results-section">
          <h4>{t(ShowcaseStrings.YNA_ResultsTitle)}</h4>

          <div className="tally-visualization">
            <h5>{t(ShowcaseStrings.YNA_TallyTitle)}</h5>
            <p className="tally-explain">
              {t(ShowcaseStrings.YNA_TallyExplain)}
            </p>
          </div>

          <div className="abstain-results">
            <div
              className={`abstain-result ${results.winner === 0 ? 'winner' : ''}`}
            >
              <span className="abstain-emoji">👍</span>
              <h3>{t(ShowcaseStrings.YNA_LabelYes)}</h3>
              <p className="abstain-count">
                {t(ShowcaseStrings.Vote_VotesTemplate)
                  .replace('{COUNT}', String(Number(results.tallies[0])))
                  .replace(
                    '{PERCENT}',
                    (
                      (Number(results.tallies[0]) /
                        (Number(results.tallies[0]) +
                          Number(results.tallies[1]))) *
                      100
                    ).toFixed(1),
                  )}
              </p>
            </div>
            <div
              className={`abstain-result ${results.winner === 1 ? 'winner' : ''}`}
            >
              <span className="abstain-emoji">👎</span>
              <h3>{t(ShowcaseStrings.YNA_LabelNo)}</h3>
              <p className="abstain-count">
                {t(ShowcaseStrings.Vote_VotesTemplate)
                  .replace('{COUNT}', String(Number(results.tallies[1])))
                  .replace(
                    '{PERCENT}',
                    (
                      (Number(results.tallies[1]) /
                        (Number(results.tallies[0]) +
                          Number(results.tallies[1]))) *
                      100
                    ).toFixed(1),
                  )}
              </p>
            </div>
            <div className="abstain-result neutral">
              <span className="abstain-emoji">🤷</span>
              <h3>{t(ShowcaseStrings.YNA_LabelAbstain)}</h3>
              <p className="abstain-count">
                {t(ShowcaseStrings.Vote_VotesTemplate)
                  .replace('{COUNT}', String(Number(results.tallies[2])))
                  .replace('{PERCENT}', '—')}
              </p>
              <p className="abstain-note">
                {t(ShowcaseStrings.YNA_AbstainNote)}
              </p>
            </div>
          </div>

          <div className="referendum-outcome">
            <h3>
              {results.winner === 0
                ? t(ShowcaseStrings.YNA_ResolutionPasses)
                : t(ShowcaseStrings.YNA_ResolutionFails)}
            </h3>
            <p>
              {t(ShowcaseStrings.YNA_DecidingVotesTemplate)
                .replace(
                  '{DECIDING}',
                  String(
                    Number(results.tallies[0]) + Number(results.tallies[1]),
                  ),
                )
                .replace('{ABSTENTIONS}', String(Number(results.tallies[2])))}
            </p>
          </div>
          <button onClick={reset} className="reset-btn">
            {t(ShowcaseStrings.YNA_ResetBtn)}
          </button>
        </div>
      )}
    </div>
  );
};
