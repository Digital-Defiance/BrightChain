import type { Poll, PollResults } from '@digitaldefiance/ecies-lib';
import {
  ECIESService,
  EmailString,
  ImmutableAuditLog,
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

export const PluralityDemo = () => {
  const { t } = useShowcaseI18n();

  const [poll, setPoll] = useState<Poll<Uint8Array> | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
  const [auditLog, setAuditLog] =
    useState<ImmutableAuditLog<Uint8Array> | null>(null);
  const [voters] = useState(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']);
  const [votes, setVotes] = useState<Map<string, number>>(new Map());
  const [results, setResults] = useState<PollResults | null>(null);
  const { isInitializing, setIsInitializing, isTallying, withTallying } =
    useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const candidates = [
    {
      name: t(ShowcaseStrings.Plur_Cand1_Name),
      emoji: '🌱',
      description: t(ShowcaseStrings.Plur_Cand1_Desc),
    },
    {
      name: t(ShowcaseStrings.Plur_Cand2_Name),
      emoji: '🚇',
      description: t(ShowcaseStrings.Plur_Cand2_Desc),
    },
    {
      name: t(ShowcaseStrings.Plur_Cand3_Name),
      emoji: '🏘️',
      description: t(ShowcaseStrings.Plur_Cand3_Desc),
    },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const eciesService = new ECIESService();
        const { member } = Member.newMember(
          eciesService,
          MemberType.System,
          'Election Authority',
          new EmailString('authority@example.com'),
        );
        await member.deriveVotingKeys();
        setAuthority(member as Member);

        const audit = new ImmutableAuditLog(member);
        setAuditLog(audit);

        const newPoll = PollFactory.createPlurality(
          candidates.map((c) => c.name),
          member,
        );
        setPoll(newPoll);

        // Record poll creation in audit log
        audit.recordPollCreated(newPoll.id, {
          method: 'plurality',
          choices: candidates.map((c) => c.name),
        });
      } catch (e) {
        console.error('Init failed:', e);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const castVote = async (voterName: string, candidateIndex: number) => {
    if (!poll || !authority?.votingPublicKey || !auditLog) return;

    const encoder = new VoteEncoder(authority.votingPublicKey);
    const vote = encoder.encodePlurality(candidateIndex, candidates.length);

    const voterEcies = new ECIESService();
    const { member: voter } = Member.newMember(
      voterEcies,
      MemberType.User,
      voterName,
      new EmailString(`${voterName.toLowerCase()}@example.com`),
    );
    poll.vote(voter, vote);

    // Record vote in audit log with hashed voter ID
    const voterIdHash = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new Uint8Array(voter.id)),
    );
    auditLog.recordVoteCast(poll.id, voterIdHash);

    setVotes(new Map(votes.set(voterName, candidateIndex)));
  };

  const tallyVotes = () =>
    withTallying(async () => {
      if (
        !poll ||
        !authority?.votingPrivateKey ||
        !authority?.votingPublicKey ||
        !auditLog
      )
        return;

      poll.close();
      const tallier = new PollTallier(
        authority,
        authority.votingPrivateKey,
        authority.votingPublicKey,
      );
      const result = tallier.tally(poll);
      setResults(result);

      // Record poll closure in audit log
      auditLog.recordPollClosed(poll.id, {
        totalVotes: votes.size,
        winner: result.choices[result.winner!],
      });
    });

  const reset = () => {
    if (!authority) return;
    const newPoll = PollFactory.createPlurality(
      candidates.map((c) => c.name),
      authority,
    );
    setPoll(newPoll);
    setVotes(new Map());
    setResults(null);

    const audit = new ImmutableAuditLog(authority);
    setAuditLog(audit);
    audit.recordPollCreated(newPoll.id, {
      method: 'plurality',
      choices: candidates.map((c) => c.name),
    });
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
            <span className="intro-emoji">🗳️</span>
            <h3>{t(ShowcaseStrings.Plur_IntroTitle)}</h3>
          </div>
          <div className="intro-story">
            <p>{t(ShowcaseStrings.Plur_IntroStory)}</p>
            <p>
              <strong>{t(ShowcaseStrings.Plur_IntroSituation)}</strong>
            </p>
            <div className="intro-stakes">
              <div className="stake-item">
                <span>🌱</span>
                <p>{t(ShowcaseStrings.Plur_IntroTeamGreen)}</p>
              </div>
              <div className="stake-item">
                <span>🚇</span>
                <p>{t(ShowcaseStrings.Plur_IntroTransit)}</p>
              </div>
              <div className="stake-item">
                <span>🏘️</span>
                <p>{t(ShowcaseStrings.Plur_IntroHousing)}</p>
              </div>
            </div>
            <p className="intro-challenge">
              {t(ShowcaseStrings.Plur_IntroChallenge)}
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            {t(ShowcaseStrings.Vote_StartElection)}
          </button>
        </div>
      </div>
    );
  }

  const votedVoters = voters.filter((v) => votes.has(v));

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>{t(ShowcaseStrings.Plur_DemoTitle)}</h3>
        <p className="election-tagline">
          {t(ShowcaseStrings.Plur_DemoTagline)}
        </p>
      </div>

      {!results ? (
        <>
          <div className="candidates-section">
            <h4>{t(ShowcaseStrings.Plur_CandidatesTitle)}</h4>
            <div className="candidates-grid">
              {candidates.map((candidate, idx) => (
                <div key={idx} className="candidate-card">
                  <div className="candidate-emoji">{candidate.emoji}</div>
                  <h5>{candidate.name}</h5>
                  <p>{candidate.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="voters-section">
            <h4>
              {t(ShowcaseStrings.Vote_CitizensVotingTemplate)
                .replace('{VOTED}', String(votedVoters.length))
                .replace('{TOTAL}', String(voters.length))}
            </h4>
            <p className="voter-instruction">
              {t(ShowcaseStrings.Plur_VoterInstruction)}
            </p>
            <div className="voters-grid">
              {voters.map((voter) => (
                <div key={voter} className="voter-card">
                  <strong>{voter}</strong>
                  {votes.has(voter) ? (
                    <div className="vote-cast">
                      {t(ShowcaseStrings.Vote_VotedTemplate).replace(
                        '{CHOICE}',
                        candidates[votes.get(voter)!].name,
                      )}
                    </div>
                  ) : (
                    <div className="vote-buttons">
                      {candidates.map((c, idx) => (
                        <button
                          key={idx}
                          onClick={() => castVote(voter, idx)}
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

          {votes.size > 0 && (
            <>
              <button
                onClick={tallyVotes}
                className="tally-btn"
                disabled={isTallying}
              >
                {isTallying
                  ? t(ShowcaseStrings.Vote_DecryptingVotes)
                  : t(ShowcaseStrings.Plur_ClosePollsBtn)}
              </button>
              <button
                onClick={() => setShowAuditLog(!showAuditLog)}
                className="audit-btn"
                style={{ marginLeft: '10px' }}
              >
                {showAuditLog
                  ? t(ShowcaseStrings.Vote_HideAuditLog)
                  : t(ShowcaseStrings.Vote_ShowAuditLog)}
              </button>
            </>
          )}

          {showAuditLog && auditLog && (
            <div
              className="audit-log-section"
              style={{
                marginTop: '20px',
                padding: '15px',
                background: '#f5f5f5',
                borderRadius: '8px',
              }}
            >
              <h4>{t(ShowcaseStrings.Vote_AuditLogTitle)}</h4>
              <p style={{ fontSize: '0.9em', color: '#666' }}>
                {t(ShowcaseStrings.Vote_AuditLogDesc)}
              </p>
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {auditLog.getEntries().map((entry, idx) => (
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
                      <strong>#{entry.sequence}</strong> - {entry.eventType}
                    </div>
                    <div style={{ color: '#666' }}>
                      Timestamp:{' '}
                      {new Date(entry.timestamp / 1000).toLocaleString()}
                    </div>
                    {entry.metadata && (
                      <div style={{ color: '#888', fontSize: '0.9em' }}>
                        {JSON.stringify(entry.metadata)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  background: auditLog.verifyChain() ? '#d4edda' : '#f8d7da',
                  borderRadius: '4px',
                }}
              >
                <strong>{t(ShowcaseStrings.Vote_ChainIntegrity)}</strong>{' '}
                {auditLog.verifyChain()
                  ? t(ShowcaseStrings.Vote_ChainValid)
                  : t(ShowcaseStrings.Vote_ChainCompromised)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="results-section">
          <h4>{t(ShowcaseStrings.Plur_ResultsTitle)}</h4>
          <p className="results-intro">
            {t(ShowcaseStrings.Plur_ResultsIntro)}
          </p>

          <div className="tally-visualization">
            <h5>{t(ShowcaseStrings.Plur_TallyTitle)}</h5>
            <p className="tally-explain">
              {t(ShowcaseStrings.Plur_TallyExplain)}
            </p>
          </div>
          {candidates.map((candidate, idx) => {
            const tally = Number(results.tallies[idx]);
            const percentage = (tally / votes.size) * 100;
            const isWinner = idx === results.winner;

            return (
              <div
                key={idx}
                className={`result-bar ${isWinner ? 'winner' : ''}`}
              >
                <div className="result-header">
                  <span>
                    {candidate.emoji} {candidate.name}
                  </span>
                  <span>
                    {t(ShowcaseStrings.Vote_VotesTemplate)
                      .replace('{COUNT}', String(tally))
                      .replace('{PERCENT}', percentage.toFixed(0))}
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
          <button onClick={reset} className="reset-btn">
            {t(ShowcaseStrings.Vote_RunAnotherElection)}
          </button>
        </div>
      )}
    </div>
  );
};
