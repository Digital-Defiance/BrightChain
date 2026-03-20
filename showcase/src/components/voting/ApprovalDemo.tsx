import type {
  Poll,
  PollConfiguration,
  PollResults,
} from '@digitaldefiance/ecies-lib';
import {
  ECIESService,
  EmailString,
  getEnhancedIdProvider,
  Member,
  MemberType,
  PollEventLogger,
  PollFactory,
  PollTallier,
  VoteEncoder,
} from '@digitaldefiance/ecies-lib';
import { useEffect, useState } from 'react';
import { useShowcaseI18n } from '../../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../../i18n/showcaseStrings';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const ApprovalDemo = () => {
  const { t } = useShowcaseI18n();
  const provider = getEnhancedIdProvider<Uint8Array>();
  const [poll, setPoll] = useState<Poll<Uint8Array> | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
  const [eventLogger, setEventLogger] = useState<PollEventLogger | null>(null);
  const [voters] = useState(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']);
  const [votes, setVotes] = useState<Map<string, number[]>>(new Map());
  const [submittedVoters, setSubmittedVoters] = useState<Set<string>>(
    new Set(),
  );
  const [results, setResults] = useState<PollResults | null>(null);
  const { isInitializing, setIsInitializing, isTallying, withTallying } =
    useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);
  const [showEventLog, setShowEventLog] = useState(false);

  const candidates = [
    {
      name: 'TypeScript',
      emoji: '🔷',
      description: t(ShowcaseStrings.Appr_Cand1_Desc),
    },
    {
      name: 'Python',
      emoji: '🐍',
      description: t(ShowcaseStrings.Appr_Cand2_Desc),
    },
    {
      name: 'Rust',
      emoji: '🦀',
      description: t(ShowcaseStrings.Appr_Cand3_Desc),
    },
    {
      name: 'Go',
      emoji: '🐹',
      description: t(ShowcaseStrings.Appr_Cand4_Desc),
    },
    {
      name: 'Java',
      emoji: '☕',
      description: t(ShowcaseStrings.Appr_Cand5_Desc),
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
        const logger = new PollEventLogger(provider);
        setEventLogger(logger);

        const newPoll = PollFactory.createApproval(
          candidates.map((c) => c.name),
          member,
        );
        setPoll(newPoll);

        // Log poll creation
        const config: PollConfiguration = {
          method: 'approval',
          choices: candidates.map((c) => c.name),
        };
        logger.logPollCreated(newPoll.id, member.id, config);
      } catch (e) {
        console.error('Init failed:', e);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCandidate = (voterName: string, candidateIndex: number) => {
    const currentVotes = votes.get(voterName) || [];
    const newVotes = currentVotes.includes(candidateIndex)
      ? currentVotes.filter((i) => i !== candidateIndex)
      : [...currentVotes, candidateIndex];

    setVotes(new Map(votes.set(voterName, newVotes)));
  };

  const submitVote = async (voterName: string) => {
    if (!poll || !authority?.votingPublicKey || !eventLogger) return;

    const selectedIndices = votes.get(voterName) || [];
    const encoder = new VoteEncoder(authority.votingPublicKey);
    const vote = encoder.encodeApproval(selectedIndices, candidates.length);

    const voterEcies = new ECIESService();
    const { member: voter } = Member.newMember(
      voterEcies,
      MemberType.User,
      voterName,
      new EmailString(`${voterName.toLowerCase()}@example.com`),
    );
    poll.vote(voter, vote);

    // Log vote cast with anonymized token
    const voterToken = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new Uint8Array(voter.id)),
    );
    eventLogger.logVoteCast(poll.id, voterToken, {
      voterName: voterName,
      selectedCount: selectedIndices.length,
    });
  };

  const tallyVotes = () =>
    withTallying(async () => {
      if (
        !poll ||
        !authority?.votingPrivateKey ||
        !authority?.votingPublicKey ||
        !eventLogger
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

      // Log poll closure with tally hash
      const tallyData = result.tallies.map((t) => t.toString()).join(',');
      const tallyHash = new Uint8Array(
        await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(tallyData),
        ),
      );
      eventLogger.logPollClosed(poll.id, tallyHash, {
        totalVotes: votedVoters.length,
        winner: result.choices[result.winner!],
      });
    });

  const reset = () => {
    if (!authority) return;
    const newPoll = PollFactory.createApproval(
      candidates.map((c) => c.name),
      authority,
    );
    setPoll(newPoll);
    setVotes(new Map());
    setSubmittedVoters(new Set());
    setResults(null);

    const logger = new PollEventLogger<Uint8Array>(provider);
    setEventLogger(logger);
    const config: PollConfiguration = {
      method: 'approval',
      choices: candidates.map((c) => c.name),
    };
    logger.logPollCreated(newPoll.id, authority.id, config);
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
            <span className="intro-emoji">✅</span>
            <h3>{t(ShowcaseStrings.Appr_IntroTitle)}</h3>
          </div>
          <div className="intro-story">
            <p>
              <strong>{t(ShowcaseStrings.Appr_IntroStory)}</strong>
            </p>
            <p>{t(ShowcaseStrings.Appr_IntroApprovalVoting)}</p>
            <div className="intro-stakes">
              <p>{t(ShowcaseStrings.Appr_IntroStakes)}</p>
              <p>{t(ShowcaseStrings.Appr_IntroWinner)}</p>
            </div>
            <p className="intro-challenge">
              {t(ShowcaseStrings.Appr_IntroChallenge)}
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            {t(ShowcaseStrings.Appr_StartBtn)}
          </button>
        </div>
      </div>
    );
  }

  const votedVoters = Array.from(submittedVoters);

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>{t(ShowcaseStrings.Appr_DemoTitle)}</h3>
        <p className="election-tagline">
          {t(ShowcaseStrings.Appr_DemoTagline)}
        </p>
      </div>

      {!results ? (
        <>
          <div className="candidates-section">
            <h4>{t(ShowcaseStrings.Appr_CandidatesTitle)}</h4>
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
              {t(ShowcaseStrings.Appr_VotersTitle)
                .replace('{VOTED}', String(votedVoters.length))
                .replace('{TOTAL}', String(voters.length))}
            </h4>
            {voters.map((voter) => {
              const hasVoted = votedVoters.includes(voter);
              const selections = votes.get(voter) || [];

              return (
                <div key={voter} className="voter-card approval-voter">
                  <div className="voter-header">
                    <strong>{voter}</strong>
                    {hasVoted && (
                      <span className="voted-badge">
                        {t(ShowcaseStrings.Appr_VotedBadge)}
                      </span>
                    )}
                  </div>

                  {!hasVoted && (
                    <>
                      <div className="approval-grid">
                        {candidates.map((c, idx) => (
                          <button
                            key={idx}
                            onClick={() => toggleCandidate(voter, idx)}
                            className={`approval-btn ${selections.includes(idx) ? 'selected' : ''}`}
                          >
                            {c.emoji} {c.name}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => submitVote(voter)}
                        disabled={selections.length === 0}
                        className="submit-vote-btn"
                      >
                        {t(ShowcaseStrings.Appr_SubmitBtn).replace(
                          '{COUNT}',
                          String(selections.length),
                        )}
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
                  : t(ShowcaseStrings.Appr_TallyBtn)}
              </button>
              <button
                onClick={() => setShowEventLog(!showEventLog)}
                className="event-log-btn"
                style={{ marginLeft: '10px' }}
              >
                📊{' '}
                {showEventLog
                  ? t(ShowcaseStrings.Vote_HideEventLog)
                  : t(ShowcaseStrings.Vote_ShowEventLog)}
              </button>
            </>
          )}

          {showEventLog && eventLogger && poll && (
            <div
              className="event-log-section"
              style={{
                marginTop: '20px',
                padding: '15px',
                background: '#f5f5f5',
                borderRadius: '8px',
              }}
            >
              <h4>{t(ShowcaseStrings.Vote_EventLogTitle)}</h4>
              <p style={{ fontSize: '0.9em', color: '#666' }}>
                {t(ShowcaseStrings.Vote_EventLogDesc)}
              </p>
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {eventLogger.getEventsForPoll(poll.id).map((event, idx) => (
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <strong>
                        #{event.sequence} - {event.eventType}
                      </strong>
                      <span style={{ color: '#666', fontSize: '0.9em' }}>
                        {new Date(event.timestamp / 1000).toLocaleTimeString()}
                      </span>
                    </div>
                    {event.configuration && (
                      <div
                        style={{
                          color: '#666',
                          fontSize: '0.9em',
                          marginTop: '4px',
                        }}
                      >
                        Method: {event.configuration.method}, Choices:{' '}
                        {event.configuration.choices.length}
                      </div>
                    )}
                    {event.voterToken && (
                      <div style={{ color: '#888', fontSize: '0.85em' }}>
                        {t(ShowcaseStrings.Vote_VoterToken)}{' '}
                        {Array.from(event.voterToken.slice(0, 4))
                          .map((b) => b.toString(16).padStart(2, '0'))
                          .join('')}
                        ...
                      </div>
                    )}
                    {event.metadata && (
                      <div style={{ color: '#888', fontSize: '0.85em' }}>
                        {JSON.stringify(event.metadata)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  background: eventLogger.verifySequence()
                    ? '#d4edda'
                    : '#f8d7da',
                  borderRadius: '4px',
                }}
              >
                <strong>{t(ShowcaseStrings.Vote_SequenceIntegrity)}</strong>{' '}
                {eventLogger.verifySequence()
                  ? t(ShowcaseStrings.Vote_SequenceValid)
                  : t(ShowcaseStrings.Vote_SequenceGaps)}
              </div>
              <div
                style={{ marginTop: '5px', fontSize: '0.85em', color: '#666' }}
              >
                {t(ShowcaseStrings.Vote_TotalEventsTemplate).replace(
                  '{COUNT}',
                  String(eventLogger.getEventsForPoll(poll.id).length),
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="results-section">
          <h4>{t(ShowcaseStrings.Vote_ResultsTitle)}</h4>
          {candidates.map((candidate, idx) => {
            const tally = Number(results.tallies[idx]);
            const percentage = (tally / votedVoters.length) * 100;
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
                    {t(ShowcaseStrings.Vote_ApprovalsTemplate)
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
