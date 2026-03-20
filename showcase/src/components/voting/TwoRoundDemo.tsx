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

export const TwoRoundDemo = () => {
  const { t } = useShowcaseI18n();
  const { isInitializing, setIsInitializing, withTallying } = useVotingDemo();
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
    'Jack',
  ]);
  const [round1Votes, setRound1Votes] = useState<Map<string, number>>(
    new Map(),
  );
  const [round2Votes, setRound2Votes] = useState<Map<string, number>>(
    new Map(),
  );
  const [round1Results, setRound1Results] = useState<PollResults | null>(null);
  const [round2Results, setRound2Results] = useState<PollResults | null>(null);
  const [currentRound, setCurrentRound] = useState<1 | 2>(1);
  const [topTwo, setTopTwo] = useState<number[]>([]);
  const [showIntro, setShowIntro] = useState(true);

  const candidates = [
    {
      name: 'Maria Santos',
      emoji: '👩‍💼',
      party: t(ShowcaseStrings.TR_Cand1_Party),
    },
    {
      name: 'John Smith',
      emoji: '👨‍💼',
      party: t(ShowcaseStrings.TR_Cand2_Party),
    },
    { name: 'Li Wei', emoji: '👨‍🔬', party: t(ShowcaseStrings.TR_Cand3_Party) },
    {
      name: 'Aisha Khan',
      emoji: '👩‍⚖️',
      party: t(ShowcaseStrings.TR_Cand4_Party),
    },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const eciesService = new ECIESService();
        const { member } = Member.newMember(
          eciesService,
          MemberType.System,
          'Electoral Commission',
          new EmailString('commission@election.gov'),
        );
        await member.deriveVotingKeys();
        setAuthority(member as Member);
        const newPoll = PollFactory.createPlurality(
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

  const castRound1Vote = (voterName: string, candidateIdx: number) => {
    if (!poll || !authority?.votingPublicKey) return;
    const encoder = new VoteEncoder(authority.votingPublicKey);
    const vote = encoder.encodePlurality(candidateIdx, candidates.length);
    const eciesService = new ECIESService();
    const { member: voter } = Member.newMember(
      eciesService,
      MemberType.User,
      voterName,
      new EmailString(`${voterName.toLowerCase()}@example.com`),
    );
    poll.vote(voter, vote);
    setRound1Votes(new Map(round1Votes.set(voterName, candidateIdx)));
  };

  const tallyRound1 = () =>
    withTallying(async () => {
      if (!poll || !authority?.votingPrivateKey || !authority?.votingPublicKey)
        return;
      poll.close();
      const tallier = new PollTallier(
        authority,
        authority.votingPrivateKey,
        authority.votingPublicKey,
      );
      const results = tallier.tally(poll);
      setRound1Results(results);
      const tallies = results.tallies.map((t, idx) => ({
        idx,
        votes: Number(t),
      }));
      tallies.sort((a, b) => b.votes - a.votes);
      setTopTwo([tallies[0].idx, tallies[1].idx]);
    });

  const startRound2 = () => {
    if (!authority || topTwo.length !== 2) return;
    const runoffCandidates = topTwo.map((idx) => candidates[idx].name);
    const newPoll = PollFactory.createPlurality(runoffCandidates, authority);
    setPoll(newPoll);
    setCurrentRound(2);
  };

  const castRound2Vote = (voterName: string, topTwoIdx: number) => {
    if (!poll || !authority?.votingPublicKey) return;
    const encoder = new VoteEncoder(authority.votingPublicKey);
    const vote = encoder.encodePlurality(topTwoIdx, 2);
    const eciesService = new ECIESService();
    const { member: voter } = Member.newMember(
      eciesService,
      MemberType.User,
      voterName,
      new EmailString(`${voterName.toLowerCase()}@example.com`),
    );
    poll.vote(voter, vote);
    setRound2Votes(new Map(round2Votes.set(voterName, topTwoIdx)));
  };

  const tallyRound2 = () =>
    withTallying(async () => {
      if (!poll || !authority?.votingPrivateKey || !authority?.votingPublicKey)
        return;
      poll.close();
      const tallier = new PollTallier(
        authority,
        authority.votingPrivateKey,
        authority.votingPublicKey,
      );
      const results = tallier.tally(poll);
      setRound2Results(results);
    });

  const reset = () => {
    if (!authority) return;
    const newPoll = PollFactory.createPlurality(
      candidates.map((c) => c.name),
      authority,
    );
    setPoll(newPoll);
    setRound1Votes(new Map());
    setRound2Votes(new Map());
    setRound1Results(null);
    setRound2Results(null);
    setCurrentRound(1);
    setTopTwo([]);
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
            <span className="intro-emoji">2️⃣</span>
            <h3>{t(ShowcaseStrings.TR_IntroTitle)}</h3>
          </div>
          <div className="intro-story">
            <p>{t(ShowcaseStrings.TR_IntroSystem)}</p>
            <p>{t(ShowcaseStrings.TR_IntroWhyTwoRounds)}</p>
            <div className="intro-stakes">
              <p>{t(ShowcaseStrings.TR_IntroRound1)}</p>
              <p>{t(ShowcaseStrings.TR_IntroRound2)}</p>
            </div>
            <p className="intro-challenge">
              {t(ShowcaseStrings.TR_IntroChallenge)}
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            {t(ShowcaseStrings.TR_StartBtn)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>{t(ShowcaseStrings.TR_DemoTitle)}</h3>
        <p className="election-tagline">
          {currentRound === 1
            ? t(ShowcaseStrings.TR_TaglineRound1)
            : t(ShowcaseStrings.TR_TaglineRound2)}
        </p>
      </div>

      {currentRound === 1 && !round1Results && (
        <>
          <div className="candidates-section">
            <h4>{t(ShowcaseStrings.TR_Round1Candidates)}</h4>
            <div className="candidates-grid">
              {candidates.map((c, idx) => (
                <div key={idx} className="candidate-card">
                  <div className="candidate-emoji">{c.emoji}</div>
                  <h5>{c.name}</h5>
                  <p>{c.party}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="voters-section">
            <h4>
              {t(ShowcaseStrings.TR_VotersTemplate)
                .replace('{VOTED}', String(round1Votes.size))
                .replace('{TOTAL}', String(voters.length))}
            </h4>
            <div className="voters-grid">
              {voters.map((voter) => (
                <div key={voter} className="voter-card">
                  <strong>{voter}</strong>
                  {round1Votes.has(voter) ? (
                    <div className="vote-cast">
                      {t(ShowcaseStrings.TR_VotedForTemplate).replace(
                        '{EMOJI}',
                        candidates[round1Votes.get(voter)!].emoji,
                      )}
                    </div>
                  ) : (
                    <div className="vote-buttons">
                      {candidates.map((c, idx) => (
                        <button
                          key={idx}
                          onClick={() => castRound1Vote(voter, idx)}
                          className="vote-btn"
                        >
                          {c.emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {round1Votes.size > 0 && (
            <button onClick={tallyRound1} className="tally-btn">
              {t(ShowcaseStrings.TR_CountRound1)}
            </button>
          )}
        </>
      )}

      {round1Results && !round2Results && (
        <div className="round-results">
          <h4>{t(ShowcaseStrings.TR_Round1Results)}</h4>

          <div className="tally-visualization">
            <h5>{t(ShowcaseStrings.TR_Round1TallyTitle)}</h5>
            <p className="tally-explain">
              {t(ShowcaseStrings.TR_Round1TallyExplain)}
            </p>
          </div>

          {candidates.map((c, idx) => {
            const votes = Number(round1Results.tallies[idx]);
            const percent = (votes / round1Votes.size) * 100;
            const isTopTwo = topTwo.includes(idx);

            return (
              <div
                key={idx}
                className={`result-bar ${isTopTwo ? 'top-two' : 'eliminated'}`}
              >
                <div className="result-header">
                  <span>
                    {c.emoji} {c.name}
                  </span>
                  <span>
                    {t(ShowcaseStrings.Vote_VotesTemplate)
                      .replace('{COUNT}', String(votes))
                      .replace('{PERCENT}', percent.toFixed(1))}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {isTopTwo && (
                  <span className="badge">
                    {t(ShowcaseStrings.TR_AdvanceRound2)}
                  </span>
                )}
                {!isTopTwo && (
                  <span className="badge eliminated-badge">
                    {t(ShowcaseStrings.TR_EliminatedBadge)}
                  </span>
                )}
              </div>
            );
          })}

          <div className="runoff-announcement">
            <h3>{t(ShowcaseStrings.TR_NoMajority)}</h3>
            <p>{t(ShowcaseStrings.TR_TopTwoAdvance)}</p>
            <div className="runoff-candidates">
              {topTwo.map((idx) => (
                <div key={idx} className="runoff-card">
                  <span className="runoff-emoji">{candidates[idx].emoji}</span>
                  <strong>{candidates[idx].name}</strong>
                  <span>{Number(round1Results.tallies[idx])} votes</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={startRound2} className="tally-btn">
            {t(ShowcaseStrings.TR_StartRound2)}
          </button>
        </div>
      )}

      {currentRound === 2 && !round2Results && (
        <>
          <div className="runoff-section">
            <h4>{t(ShowcaseStrings.TR_Round2Runoff)}</h4>
            <div className="runoff-candidates-large">
              {topTwo.map((idx) => (
                <div key={idx} className="runoff-candidate-large">
                  <div className="candidate-emoji-large">
                    {candidates[idx].emoji}
                  </div>
                  <h3>{candidates[idx].name}</h3>
                  <p>{candidates[idx].party}</p>
                  <p className="round1-result">
                    {t(ShowcaseStrings.TR_Round1ResultTemplate).replace(
                      '{VOTES}',
                      String(Number(round1Results!.tallies[idx])),
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="voters-section">
            <h4>
              {t(ShowcaseStrings.TR_FinalVoteTemplate)
                .replace('{VOTED}', String(round2Votes.size))
                .replace('{TOTAL}', String(voters.length))}
            </h4>
            <div className="voters-grid">
              {voters.map((voter) => (
                <div key={voter} className="voter-card">
                  <strong>{voter}</strong>
                  {round2Votes.has(voter) ? (
                    <div className="vote-cast">
                      {t(ShowcaseStrings.TR_VotedForTemplate).replace(
                        '{EMOJI}',
                        candidates[topTwo[round2Votes.get(voter)!]].emoji,
                      )}
                    </div>
                  ) : (
                    <div className="vote-buttons">
                      {topTwo.map((idx, topTwoIdx) => (
                        <button
                          key={idx}
                          onClick={() => castRound2Vote(voter, topTwoIdx)}
                          className="vote-btn"
                        >
                          {candidates[idx].emoji} {candidates[idx].name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {round2Votes.size > 0 && (
            <button onClick={tallyRound2} className="tally-btn">
              {t(ShowcaseStrings.TR_FinalCount)}
            </button>
          )}
        </>
      )}

      {round2Results && (
        <div className="results-section">
          <h4>{t(ShowcaseStrings.TR_ElectionWinner)}</h4>

          <div className="tally-visualization">
            <h5>{t(ShowcaseStrings.TR_Round2TallyTitle)}</h5>
            <p className="tally-explain">
              {t(ShowcaseStrings.TR_Round2TallyExplain)}
            </p>
          </div>

          {topTwo.map((idx, topTwoIdx) => {
            const votes = Number(round2Results.tallies[topTwoIdx]);
            const percent = (votes / round2Votes.size) * 100;
            const isWinner = topTwoIdx === round2Results.winner;

            return (
              <div
                key={idx}
                className={`result-bar ${isWinner ? 'winner' : ''}`}
              >
                <div className="result-header">
                  <span>
                    {candidates[idx].emoji} {candidates[idx].name}
                  </span>
                  <span>
                    {t(ShowcaseStrings.Vote_VotesTemplate)
                      .replace('{COUNT}', String(votes))
                      .replace('{PERCENT}', percent.toFixed(1))}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}

          <div className="winner-announcement">
            <h2>
              {t(ShowcaseStrings.TR_WinnerAnnouncementTemplate).replace(
                '{NAME}',
                candidates[topTwo[round2Results.winner!]].name,
              )}
            </h2>
            <p>
              {t(ShowcaseStrings.TR_WinnerSecuredTemplate)
                .replace(
                  '{VOTES}',
                  String(Number(round2Results.tallies[round2Results.winner!])),
                )
                .replace(
                  '{PERCENT}',
                  (
                    (Number(round2Results.tallies[round2Results.winner!]) /
                      round2Votes.size) *
                    100
                  ).toFixed(1),
                )}
            </p>
          </div>

          <button onClick={reset} className="reset-btn">
            {t(ShowcaseStrings.TR_NewElection)}
          </button>
        </div>
      )}
    </div>
  );
};
