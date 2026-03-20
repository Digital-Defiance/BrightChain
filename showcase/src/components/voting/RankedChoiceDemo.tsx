import type { Poll, PollResults } from '@digitaldefiance/ecies-lib';
import {
  ECIESService,
  EmailString,
  Member,
  MemberType,
  PollFactory,
  PollTallier,
  PublicBulletinBoard,
  VoteEncoder,
} from '@digitaldefiance/ecies-lib';
import { useEffect, useState } from 'react';
import { useShowcaseI18n } from '../../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../../i18n/showcaseStrings';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const RankedChoiceDemo = () => {
  const { t } = useShowcaseI18n();
  const [poll, setPoll] = useState<Poll<Uint8Array> | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
  const [bulletinBoard, setBulletinBoard] =
    useState<PublicBulletinBoard | null>(null);
  const [voters] = useState([
    'Alice',
    'Bob',
    'Charlie',
    'Diana',
    'Eve',
    'Frank',
    'Grace',
  ]);
  const [votes, setVotes] = useState<Map<string, number[]>>(new Map());
  const [submittedVoters, setSubmittedVoters] = useState<Set<string>>(
    new Set(),
  );
  const [results, setResults] = useState<PollResults | null>(null);
  const { isInitializing, setIsInitializing, isTallying, withTallying } =
    useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);
  const [showBulletinBoard, setShowBulletinBoard] = useState(false);

  const candidates = [
    {
      name: 'Progressive Party',
      emoji: '🟢',
      platform: t(ShowcaseStrings.RC_Cand1_Platform),
    },
    {
      name: 'Conservative Party',
      emoji: '🔵',
      platform: t(ShowcaseStrings.RC_Cand2_Platform),
    },
    {
      name: 'Libertarian Party',
      emoji: '🟡',
      platform: t(ShowcaseStrings.RC_Cand3_Platform),
    },
    {
      name: 'Green Party',
      emoji: '🌿',
      platform: t(ShowcaseStrings.RC_Cand4_Platform),
    },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const eciesService = new ECIESService();
        const { member } = Member.newMember(
          eciesService,
          MemberType.System,
          'Election Commission',
          new EmailString('commission@election.gov'),
        );
        await member.deriveVotingKeys();
        setAuthority(member as Member);

        const board = new PublicBulletinBoard(member);
        setBulletinBoard(board);

        const newPoll = PollFactory.createRankedChoice(
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

  const moveUp = (voterName: string, index: number) => {
    if (index === 0) return;
    const rankings = [...(votes.get(voterName) || [])];
    [rankings[index - 1], rankings[index]] = [
      rankings[index],
      rankings[index - 1],
    ];
    setVotes(new Map(votes.set(voterName, rankings)));
  };

  const moveDown = (voterName: string, index: number) => {
    const rankings = votes.get(voterName) || [];
    if (index === rankings.length - 1) return;
    const newRankings = [...rankings];
    [newRankings[index], newRankings[index + 1]] = [
      newRankings[index + 1],
      newRankings[index],
    ];
    setVotes(new Map(votes.set(voterName, newRankings)));
  };

  const addCandidate = (voterName: string, candidateIndex: number) => {
    const rankings = votes.get(voterName) || [];
    if (rankings.includes(candidateIndex)) return;
    setVotes(new Map(votes.set(voterName, [...rankings, candidateIndex])));
  };

  const removeCandidate = (voterName: string, index: number) => {
    const rankings = [...(votes.get(voterName) || [])];
    rankings.splice(index, 1);
    setVotes(new Map(votes.set(voterName, rankings)));
  };

  const submitVote = async (voterName: string) => {
    if (!poll || !authority?.votingPublicKey || !bulletinBoard) return;

    const rankings = votes.get(voterName) || [];
    const encoder = new VoteEncoder(authority.votingPublicKey);
    const vote = encoder.encodeRankedChoice(rankings, candidates.length);

    const eciesService = new ECIESService();
    const { member: voter } = Member.newMember(
      eciesService,
      MemberType.User,
      voterName,
      new EmailString(`${voterName.toLowerCase()}@example.com`),
    );
    poll.vote(voter, vote);

    const voterIdHash = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new Uint8Array(voter.id)),
    );
    const encryptedVote = vote.encrypted;
    bulletinBoard.publishVote(poll.id, encryptedVote, voterIdHash);

    setSubmittedVoters(new Set(submittedVoters).add(voterName));
  };

  const tallyVotes = () =>
    withTallying(async () => {
      if (
        !poll ||
        !authority?.votingPrivateKey ||
        !authority?.votingPublicKey ||
        !bulletinBoard
      )
        return;

      poll.close();
      const tallier = new PollTallier(
        authority,
        authority.votingPrivateKey,
        authority.votingPublicKey,
      );
      const result = tallier.tally(poll);

      console.log('Tally Results:', {
        winner: result.winner,
        rounds: result.rounds?.map((r) => ({
          round: r.round,
          tallies: r.tallies.map((t) => t.toString()),
          eliminated: r.eliminated,
          winner: r.winner,
        })),
        finalTallies: result.tallies.map((t) => t.toString()),
        voterCount: result.voterCount,
      });

      setResults(result);

      const allVotes = Array.from(bulletinBoard.getEntries(poll.id)).map(
        (e) => e.encryptedVote,
      );
      bulletinBoard.publishTally(
        poll.id,
        result.tallies,
        result.choices,
        allVotes,
      );
    });

  const reset = () => {
    if (!authority) return;
    const newPoll = PollFactory.createRankedChoice(
      candidates.map((c) => c.name),
      authority,
    );
    setPoll(newPoll);
    setVotes(new Map());
    setSubmittedVoters(new Set());
    setResults(null);
    setBulletinBoard(new PublicBulletinBoard(authority));
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
            <span className="intro-emoji">🔄</span>
            <h3>{t(ShowcaseStrings.RC_IntroTitle)}</h3>
          </div>
          <div className="intro-story">
            <p>{t(ShowcaseStrings.RC_IntroStory)}</p>
            <p>{t(ShowcaseStrings.RC_IntroRCV)}</p>
            <div className="intro-stakes">
              <p>{t(ShowcaseStrings.RC_IntroHowItWorks)}</p>
              <p>{t(ShowcaseStrings.RC_IntroWhyCool)}</p>
            </div>
            <p className="intro-challenge">
              {t(ShowcaseStrings.RC_IntroChallenge)}
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            {t(ShowcaseStrings.RC_StartBtn)}
          </button>
        </div>
      </div>
    );
  }

  const votedVoters = Array.from(submittedVoters);

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>{t(ShowcaseStrings.RC_DemoTitle)}</h3>
        <p className="election-tagline">{t(ShowcaseStrings.RC_DemoTagline)}</p>
      </div>

      {!results ? (
        <>
          <div className="candidates-section">
            <h4>{t(ShowcaseStrings.RC_PartiesTitle)}</h4>
            <div className="candidates-grid">
              {candidates.map((candidate, idx) => (
                <div key={idx} className="candidate-card">
                  <div className="candidate-emoji">{candidate.emoji}</div>
                  <h5>{candidate.name}</h5>
                  <p>{candidate.platform}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="voters-section">
            <h4>
              {t(ShowcaseStrings.RC_RankPreferencesTemplate)
                .replace('{VOTED}', String(votedVoters.length))
                .replace('{TOTAL}', String(voters.length))}
            </h4>
            {voters.map((voter) => {
              const hasVoted = submittedVoters.has(voter);
              const rankings = votes.get(voter) || [];
              const availableCandidates = candidates.filter(
                (_, idx) => !rankings.includes(idx),
              );

              return (
                <div key={voter} className="voter-card ranked-voter">
                  <div className="voter-header">
                    <strong>{voter}</strong>
                    {hasVoted && (
                      <span className="voted-badge">
                        {t(ShowcaseStrings.RC_VotedBadge)}
                      </span>
                    )}
                  </div>

                  {!hasVoted && (
                    <>
                      <div className="rankings-list">
                        {rankings.map((candidateIdx, rankIdx) => (
                          <div key={rankIdx} className="ranking-item">
                            <span className="rank-number">#{rankIdx + 1}</span>
                            <span className="rank-candidate">
                              {candidates[candidateIdx].emoji}{' '}
                              {candidates[candidateIdx].name}
                            </span>
                            <div className="rank-controls">
                              <button
                                onClick={() => moveUp(voter, rankIdx)}
                                disabled={rankIdx === 0}
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveDown(voter, rankIdx)}
                                disabled={rankIdx === rankings.length - 1}
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => removeCandidate(voter, rankIdx)}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {availableCandidates.length > 0 && (
                        <div className="add-candidates">
                          <label>{t(ShowcaseStrings.RC_AddToRanking)}</label>
                          <div className="candidate-buttons">
                            {availableCandidates.map((c) => {
                              const candidateIdx = candidates.indexOf(c);
                              return (
                                <button
                                  key={candidateIdx}
                                  onClick={() =>
                                    addCandidate(voter, candidateIdx)
                                  }
                                  className="add-candidate-btn"
                                >
                                  {c.emoji} {c.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => submitVote(voter)}
                        disabled={rankings.length === 0}
                        className="submit-vote-btn"
                      >
                        {t(ShowcaseStrings.RC_SubmitBallot)}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {votedVoters.length > 0 && (
            <>
              <button
                onClick={tallyVotes}
                className="tally-btn"
                disabled={isTallying}
              >
                {isTallying
                  ? t(ShowcaseStrings.Vote_DecryptingVotes)
                  : t(ShowcaseStrings.RC_RunInstantRunoff)}
              </button>
              <button
                onClick={() => setShowBulletinBoard(!showBulletinBoard)}
                className="bulletin-btn"
                style={{ marginLeft: '10px' }}
              >
                {showBulletinBoard
                  ? t(ShowcaseStrings.RC_HideBulletinBoard)
                  : t(ShowcaseStrings.RC_ShowBulletinBoard)}
              </button>
            </>
          )}

          {showBulletinBoard && bulletinBoard && poll && (
            <div
              className="bulletin-board-section"
              style={{
                marginTop: '20px',
                padding: '15px',
                background: '#f5f5f5',
                borderRadius: '8px',
              }}
            >
              <h4>{t(ShowcaseStrings.RC_BulletinBoardTitle)}</h4>
              <p style={{ fontSize: '0.9em', color: '#666' }}>
                {t(ShowcaseStrings.RC_BulletinBoardDesc)}
              </p>
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {bulletinBoard.getEntries(poll.id).map((entry, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px',
                      margin: '5px 0',
                      background: 'white',
                      borderRadius: '4px',
                      fontSize: '0.85em',
                    }}
                  >
                    <div>
                      <strong>
                        {t(ShowcaseStrings.RC_EntryTemplate).replace(
                          '{SEQ}',
                          String(entry.sequence),
                        )}
                      </strong>
                    </div>
                    <div style={{ color: '#666' }}>
                      {t(ShowcaseStrings.RC_EncryptedVote)} [
                      {entry.encryptedVote
                        .slice(0, 2)
                        .map((v) => v.toString().slice(0, 8))
                        .join(', ')}
                      ...]
                    </div>
                    <div style={{ color: '#888', fontSize: '0.8em' }}>
                      {t(ShowcaseStrings.RC_VoterHash)}{' '}
                      {Array.from(entry.voterIdHash.slice(0, 4))
                        .map((b) => b.toString(16).padStart(2, '0'))
                        .join('')}
                      ...
                    </div>
                    <div
                      style={{
                        color: bulletinBoard.verifyEntry(entry)
                          ? '#28a745'
                          : '#dc3545',
                        fontSize: '0.8em',
                      }}
                    >
                      {bulletinBoard.verifyEntry(entry)
                        ? t(ShowcaseStrings.RC_Verified)
                        : t(ShowcaseStrings.RC_Invalid)}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  background: bulletinBoard.verifyMerkleTree()
                    ? '#d4edda'
                    : '#f8d7da',
                  borderRadius: '4px',
                }}
              >
                <strong>{t(ShowcaseStrings.RC_MerkleTree)}</strong>{' '}
                {bulletinBoard.verifyMerkleTree()
                  ? t(ShowcaseStrings.RC_MerkleValid)
                  : t(ShowcaseStrings.RC_MerkleCompromised)}
              </div>
              <div
                style={{ marginTop: '5px', fontSize: '0.85em', color: '#666' }}
              >
                {t(ShowcaseStrings.RC_TotalEntries)}{' '}
                {bulletinBoard.getEntries(poll.id).length}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="results-section">
          <h4>{t(ShowcaseStrings.RC_ResultsTitle)}</h4>

          {results.rounds && results.rounds.length > 0 && (
            <div className="rounds-section">
              <h5>{t(ShowcaseStrings.RC_EliminationRounds)}</h5>
              {results.rounds.map((round, roundIdx) => {
                const eliminatedInPriorRounds = new Set(
                  results
                    .rounds!.slice(0, roundIdx)
                    .map((r) => r.eliminated)
                    .filter((e) => e !== undefined),
                );

                return (
                  <div key={roundIdx} className="round-result">
                    <strong>
                      {t(ShowcaseStrings.RC_RoundTemplate).replace(
                        '{ROUND}',
                        String(round.round),
                      )}
                    </strong>
                    <div className="round-tallies">
                      {candidates.map((candidate, idx) => {
                        const tally = Number(round.tallies[idx]);
                        const isEliminated = round.eliminated === idx;
                        const isWinner = round.winner === idx;
                        const wasEliminatedBefore =
                          eliminatedInPriorRounds.has(idx);

                        if (wasEliminatedBefore) return null;

                        return (
                          <div
                            key={idx}
                            className={`round-tally ${isEliminated ? 'eliminated' : ''} ${isWinner ? 'winner' : ''}`}
                          >
                            <span>
                              {candidate.emoji} {candidate.name}
                            </span>
                            <span>
                              {t(ShowcaseStrings.Vote_VotesTemplate)
                                .replace('{COUNT}', String(tally))
                                .replace('{PERCENT}', '')}
                            </span>
                            {isEliminated && (
                              <span className="eliminated-badge">
                                {t(ShowcaseStrings.RC_Eliminated)}
                              </span>
                            )}
                            {isWinner && (
                              <span className="winner-badge">
                                {t(ShowcaseStrings.RC_Winner)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="final-result">
            <h5>{t(ShowcaseStrings.RC_FinalWinner)}</h5>
            <div className="winner-card">
              <span className="winner-emoji">
                {candidates[results.winner!].emoji}
              </span>
              <h3>{candidates[results.winner!].name}</h3>
              <p>
                {t(ShowcaseStrings.RC_WonAfterRoundsTemplate).replace(
                  '{COUNT}',
                  String(results.rounds?.length || 1),
                )}
              </p>
            </div>
          </div>

          <button onClick={reset} className="reset-btn">
            {t(ShowcaseStrings.Vote_RunAnotherElection)}
          </button>
        </div>
      )}
    </div>
  );
};
