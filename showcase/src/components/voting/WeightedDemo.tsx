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
import { useEffect, useState } from 'react';
import { useShowcaseI18n } from '../../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../../i18n/showcaseStrings';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const WeightedDemo = () => {
  const { t } = useShowcaseI18n();
  const [poll, setPoll] = useState<Poll<Uint8Array> | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
  const [results, setResults] = useState<PollResults | null>(null);
  const { isInitializing, setIsInitializing, isTallying, withTallying } =
    useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);

  const shareholders = [
    { name: 'Venture Capital Fund', shares: 450n, emoji: '🏦' },
    { name: 'Founder Alice', shares: 300n, emoji: '👩‍💼' },
    { name: 'Founder Bob', shares: 150n, emoji: '👨‍💼' },
    { name: 'Employee Pool', shares: 75n, emoji: '👥' },
    { name: 'Angel Investor', shares: 25n, emoji: '👼' },
  ];

  const proposals = [
    {
      name: 'Expand to Asia',
      emoji: '🌏',
      description: t(ShowcaseStrings.Weight_Proposal1_Desc),
    },
    {
      name: 'Acquire Competitor',
      emoji: '🤝',
      description: t(ShowcaseStrings.Weight_Proposal2_Desc),
    },
    {
      name: 'Go Public (IPO)',
      emoji: '📈',
      description: t(ShowcaseStrings.Weight_Proposal3_Desc),
    },
  ];

  const [votes, setVotes] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const init = async () => {
      try {
        const eciesService = new ECIESService();
        const { member } = Member.newMember(
          eciesService,
          MemberType.System,
          'Board Secretary',
          new EmailString('secretary@company.com'),
        );
        await member.deriveVotingKeys();
        setAuthority(member as Member);

        const maxWeight = 1000n;
        const newPoll = PollFactory.createWeighted(
          proposals.map((p) => p.name),
          member,
          maxWeight,
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

  const castVote = (
    shareholderName: string,
    shares: bigint,
    proposalIndex: number,
  ) => {
    if (!poll || !authority?.votingPublicKey) return;

    const encoder = new VoteEncoder(authority.votingPublicKey);
    const vote = encoder.encodeWeighted(
      proposalIndex,
      shares,
      proposals.length,
    );

    const voterEcies = new ECIESService();
    const { member: voter } = Member.newMember(
      voterEcies,
      MemberType.User,
      shareholderName,
      new EmailString(
        `${shareholderName.toLowerCase().replace(/\s/g, '')}@company.com`,
      ),
    );
    poll.vote(voter, vote);

    setVotes(new Map(votes.set(shareholderName, proposalIndex)));
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
    const newPoll = PollFactory.createWeighted(
      proposals.map((p) => p.name),
      authority,
      1000n,
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
            <span className="intro-emoji">⚖️</span>
            <h3>{t(ShowcaseStrings.Weight_IntroTitle)}</h3>
          </div>
          <div className="intro-story">
            <p>
              💼 <strong>{t(ShowcaseStrings.Weight_IntroStoryScene)}</strong>
            </p>
            <p>
              📈 <strong>{t(ShowcaseStrings.Weight_IntroStoryTwist)}</strong>
            </p>
            <div className="intro-stakes">
              <div className="stake-item">
                <span>🏛️</span>
                <p>
                  <strong>Expand to Asia?</strong>{' '}
                  {t(ShowcaseStrings.Weight_StakeExpand)}
                </p>
              </div>
              <div className="stake-item">
                <span>🤝</span>
                <p>
                  <strong>Acquire competitor?</strong>{' '}
                  {t(ShowcaseStrings.Weight_StakeAcquire)}
                </p>
              </div>
              <div className="stake-item">
                <span>📈</span>
                <p>
                  <strong>Go public?</strong>{' '}
                  {t(ShowcaseStrings.Weight_StakeIPO)}
                </p>
              </div>
            </div>
            <p className="intro-challenge">
              🔒 {t(ShowcaseStrings.Weight_IntroChallenge)}
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            {t(ShowcaseStrings.Weight_StartBtn)}
          </button>
        </div>
      </div>
    );
  }

  const totalShares = shareholders.reduce((sum, s) => sum + s.shares, 0n);

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>{t(ShowcaseStrings.Weight_DemoTitle)}</h3>
        <p className="election-tagline">
          {t(ShowcaseStrings.Weight_DemoTagline)}
        </p>
      </div>

      {!results ? (
        <>
          <div className="candidates-section">
            <h4>{t(ShowcaseStrings.Weight_ProposalsTitle)}</h4>
            <div className="candidates-grid">
              {proposals.map((proposal, idx) => (
                <div key={idx} className="candidate-card">
                  <div className="candidate-emoji">{proposal.emoji}</div>
                  <h5>{proposal.name}</h5>
                  <p>{proposal.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="voters-section">
            <h4>
              {t(ShowcaseStrings.Weight_ShareholdersTemplate)
                .replace('{VOTED}', String(votes.size))
                .replace('{TOTAL}', String(shareholders.length))}
            </h4>
            <div className="weighted-voters">
              {shareholders.map((shareholder) => {
                const sharePercent = Number(
                  (shareholder.shares * 100n) / totalShares,
                );

                return (
                  <div key={shareholder.name} className="weighted-voter-card">
                    <div className="shareholder-info">
                      <div className="shareholder-header">
                        <span className="shareholder-emoji">
                          {shareholder.emoji}
                        </span>
                        <strong>{shareholder.name}</strong>
                      </div>
                      <div className="shares-info">
                        {t(ShowcaseStrings.Weight_ShareInfoTemplate)
                          .replace('{SHARES}', shareholder.shares.toString())
                          .replace('{PERCENT}', String(sharePercent))}
                      </div>
                    </div>

                    {votes.has(shareholder.name) ? (
                      <div className="vote-cast">
                        {t(ShowcaseStrings.Weight_VoteCastTemplate)
                          .replace(
                            '{EMOJI}',
                            proposals[votes.get(shareholder.name)!].emoji,
                          )
                          .replace(
                            '{NAME}',
                            proposals[votes.get(shareholder.name)!].name,
                          )}
                      </div>
                    ) : (
                      <div className="vote-buttons">
                        {proposals.map((p, idx) => (
                          <button
                            key={idx}
                            onClick={() =>
                              castVote(
                                shareholder.name,
                                shareholder.shares,
                                idx,
                              )
                            }
                            className="vote-btn weighted"
                          >
                            {p.emoji} {p.name}
                          </button>
                        ))}
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
                : t(ShowcaseStrings.Weight_TallyBtn)}
            </button>
          )}
        </>
      ) : (
        <div className="results-section">
          <h4>{t(ShowcaseStrings.Weight_ResultsTitle)}</h4>
          {proposals.map((proposal, idx) => {
            const tally = results.tallies[idx];
            const percentage = Number((tally * 100n) / totalShares);
            const isWinner = idx === results.winner;

            return (
              <div
                key={idx}
                className={`result-bar ${isWinner ? 'winner' : ''}`}
              >
                <div className="result-header">
                  <span>
                    {proposal.emoji} {proposal.name}
                  </span>
                  <span>
                    {t(ShowcaseStrings.Weight_SharesTemplate)
                      .replace('{TALLY}', tally.toString())
                      .replace('{PERCENT}', percentage.toFixed(1))}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="weighted-note">
            {t(ShowcaseStrings.Weight_WinnerNoteTemplate).replace(
              '{PERCENT}',
              String(
                Number((results.tallies[results.winner!] * 100n) / totalShares),
              ),
            )}
          </div>
          <button onClick={reset} className="reset-btn">
            {t(ShowcaseStrings.Weight_ResetBtn)}
          </button>
        </div>
      )}
    </div>
  );
};
