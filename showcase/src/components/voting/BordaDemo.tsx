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

export const BordaDemo = () => {
  const { t } = useShowcaseI18n();
  const [poll, setPoll] = useState<Poll<Uint8Array> | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
  const [voters] = useState(['USA', 'France', 'Japan', 'Brazil', 'Kenya']);
  const [votes, setVotes] = useState<Map<string, number[]>>(new Map());
  const [results, setResults] = useState<PollResults | null>(null);
  const { isInitializing, setIsInitializing, isTallying, withTallying } =
    useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);

  const candidates = [
    {
      name: 'Paris',
      emoji: '🗼',
      description: t(ShowcaseStrings.Borda_Cand1_Desc),
    },
    {
      name: 'Tokyo',
      emoji: '🗾',
      description: t(ShowcaseStrings.Borda_Cand2_Desc),
    },
    {
      name: 'Los Angeles',
      emoji: '🌴',
      description: t(ShowcaseStrings.Borda_Cand3_Desc),
    },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const eciesService = new ECIESService();
        const { member } = Member.newMember(
          eciesService,
          MemberType.System,
          'IOC',
          new EmailString('ioc@olympics.org'),
        );
        await member.deriveVotingKeys();
        setAuthority(member as Member);
        const newPoll = PollFactory.createBorda(
          candidates.map((c) => c.name),
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

  const submitRanking = (voterName: string, rankings: number[]) => {
    if (!poll || !authority?.votingPublicKey) return;
    const encoder = new VoteEncoder(authority.votingPublicKey);
    const vote = encoder.encodeBorda(rankings, candidates.length);
    const voterEcies = new ECIESService();
    const { member: voter } = Member.newMember(
      voterEcies,
      MemberType.User,
      voterName,
      new EmailString(`${voterName.toLowerCase()}@example.com`),
    );
    poll.vote(voter, vote);
    setVotes(new Map(votes.set(voterName, rankings)));
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
    const newPoll = PollFactory.createBorda(
      candidates.map((c) => c.name),
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
            <span className="intro-emoji">🏆</span>
            <h3>{t(ShowcaseStrings.Borda_IntroTitle)}</h3>
          </div>
          <div className="intro-story">
            <p>
              <strong>{t(ShowcaseStrings.Borda_IntroStory)}</strong>
            </p>
            <p>{t(ShowcaseStrings.Borda_IntroPoints)}</p>
            <p className="intro-challenge">
              {t(ShowcaseStrings.Borda_IntroChallenge)}
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            {t(ShowcaseStrings.Borda_StartBtn)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {isTallying && (
        <LoadingSpinner message={t(ShowcaseStrings.Vote_DecryptingVotes)} />
      )}
      <div className="voting-demo">
        <div className="demo-header">
          <h3>{t(ShowcaseStrings.Borda_DemoTitle)}</h3>
          <p className="election-tagline">
            {t(ShowcaseStrings.Borda_DemoTagline)}
          </p>
        </div>

        {!results ? (
          <>
            <div className="candidates-section">
              <h4>{t(ShowcaseStrings.Borda_CandidatesTitle)}</h4>
              <div className="candidates-grid">
                {candidates.map((c, idx) => (
                  <div key={idx} className="candidate-card">
                    <div className="candidate-emoji">{c.emoji}</div>
                    <h5>{c.name}</h5>
                    <p>{c.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="voters-section">
              <h4>
                {t(ShowcaseStrings.Borda_VotersTitle)
                  .replace('{VOTED}', String(votes.size))
                  .replace('{TOTAL}', String(voters.length))}
              </h4>
              {voters.map((voter) => {
                const hasVoted = votes.has(voter);
                return (
                  <div key={voter} className="voter-card">
                    <strong>{voter}</strong>
                    {!hasVoted && (
                      <div className="borda-quick-vote">
                        <button
                          onClick={() => submitRanking(voter, [0, 1, 2])}
                          className="vote-btn"
                        >
                          {candidates[0].emoji} → {candidates[1].emoji} →{' '}
                          {candidates[2].emoji}
                        </button>
                        <button
                          onClick={() => submitRanking(voter, [1, 0, 2])}
                          className="vote-btn"
                        >
                          {candidates[1].emoji} → {candidates[0].emoji} →{' '}
                          {candidates[2].emoji}
                        </button>
                        <button
                          onClick={() => submitRanking(voter, [2, 1, 0])}
                          className="vote-btn"
                        >
                          {candidates[2].emoji} → {candidates[1].emoji} →{' '}
                          {candidates[0].emoji}
                        </button>
                      </div>
                    )}
                    {hasVoted && (
                      <div className="vote-cast">
                        {t(ShowcaseStrings.Borda_RankedBadge)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {votes.size > 0 && (
              <button
                onClick={tallyVotes}
                className="tally-btn"
                disabled={isTallying}
              >
                {isTallying
                  ? t(ShowcaseStrings.Vote_DecryptingVotes)
                  : t(ShowcaseStrings.Borda_TallyBtn)}
              </button>
            )}
          </>
        ) : (
          <div className="results-section">
            <h4>{t(ShowcaseStrings.Borda_ResultsTitle)}</h4>
            {candidates.map((c, idx) => {
              const points = Number(results.tallies[idx]);
              const isWinner = idx === results.winner;
              return (
                <div
                  key={idx}
                  className={`result-bar ${isWinner ? 'winner' : ''}`}
                >
                  <div className="result-header">
                    <span>
                      {c.emoji} {c.name}
                    </span>
                    <span>
                      {t(ShowcaseStrings.Borda_PointsTemplate).replace(
                        '{COUNT}',
                        String(points),
                      )}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${(points / 15) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <button onClick={reset} className="reset-btn">
              {t(ShowcaseStrings.Borda_NewVoteBtn)}
            </button>
          </div>
        )}
      </div>
    </>
  );
};
