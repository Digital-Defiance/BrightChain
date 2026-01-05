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
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const YesNoDemo = () => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
  const [voters] = useState([
    'Alice',
    'Bob',
    'Charlie',
    'Diana',
    'Eve',
    'Frank',
    'Grace',
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
          'Electoral Commission',
          new EmailString('commission@gov.uk'),
        );
        await member.deriveVotingKeys();
        setAuthority(member as Member);
        const newPoll = PollFactory.create(
          ['Yes', 'No'],
          'yes-no' as any,
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

  const castVote = (voterName: string, choice: number) => {
    if (!poll || !authority?.votingPublicKey) return;
    const encoder = new VoteEncoder(authority.votingPublicKey);
    const vote = encoder.encodePlurality(choice, 2);
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
      ['Yes', 'No'],
      'yes-no' as any,
      authority,
    );
    setPoll(newPoll);
    setVotes(new Map());
    setResults(null);
  };

  if (isInitializing)
    return (
      <LoadingSpinner message="Initializing cryptographic voting system..." />
    );

  if (showIntro) {
    return (
      <div className="voting-demo">
        <div className="election-intro">
          <div className="intro-header">
            <span className="intro-emoji">👍</span>
            <h3>National Referendum!</h3>
          </div>
          <div className="intro-story">
            <p>
              🏛️ <strong>The Question:</strong> "Should our country adopt a
              4-day work week?"
            </p>
            <p>
              📊 <strong>Yes/No Referendum:</strong> The simplest form of
              democracy. One question, two choices, majority rules.
            </p>
            <div className="intro-stakes">
              <p>
                ✅ <strong>YES Campaign:</strong> Better work-life balance,
                increased productivity, happier citizens!
              </p>
              <p>
                ❌ <strong>NO Campaign:</strong> Economic risk, business
                disruption, untested policy!
              </p>
            </div>
            <p className="intro-challenge">
              🗳️ Used for Brexit, Scottish independence, and constitutional
              changes worldwide.
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            🗳️ Vote Now!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>👍 Yes/No Referendum - 4-Day Work Week</h3>
        <p className="election-tagline">
          🗳️ One question. Two choices. Democracy decides.
        </p>
      </div>

      {!results ? (
        <>
          <div className="referendum-question">
            <h4>Should we adopt a 4-day work week?</h4>
          </div>

          <div className="voters-section">
            <h4>
              Citizens Voting ({votes.size}/{voters.length} voted)
            </h4>
            <div className="voters-grid">
              {voters.map((voter) => (
                <div key={voter} className="voter-card">
                  <strong>{voter}</strong>
                  {votes.has(voter) ? (
                    <div className="vote-cast">
                      ✓ Voted {votes.get(voter) === 0 ? '👍 YES' : '👎 NO'}
                    </div>
                  ) : (
                    <div className="yesno-buttons">
                      <button
                        onClick={() => castVote(voter, 0)}
                        className="vote-btn yes-btn"
                      >
                        👍 YES
                      </button>
                      <button
                        onClick={() => castVote(voter, 1)}
                        className="vote-btn no-btn"
                      >
                        👎 NO
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
              {isTallying ? '🔓 Decrypting votes...' : '📊 Count the Votes!'}
            </button>
          )}
        </>
      ) : (
        <div className="results-section">
          <h4>🎉 Referendum Results!</h4>
          <div className="yesno-results">
            <div
              className={`yesno-result ${results.winner === 0 ? 'winner' : ''}`}
            >
              <span className="yesno-emoji">👍</span>
              <h3>YES</h3>
              <p className="yesno-count">{Number(results.tallies[0])} votes</p>
              <p className="yesno-percent">
                {((Number(results.tallies[0]) / votes.size) * 100).toFixed(1)}%
              </p>
            </div>
            <div
              className={`yesno-result ${results.winner === 1 ? 'winner' : ''}`}
            >
              <span className="yesno-emoji">👎</span>
              <h3>NO</h3>
              <p className="yesno-count">{Number(results.tallies[1])} votes</p>
              <p className="yesno-percent">
                {((Number(results.tallies[1]) / votes.size) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="referendum-outcome">
            <h3>
              {results.winner === 0 ? '✅ Motion PASSES!' : '❌ Motion FAILS!'}
            </h3>
            <p>
              The people have spoken:{' '}
              {results.winner === 0
                ? 'We adopt the 4-day work week!'
                : 'We keep the 5-day work week.'}
            </p>
          </div>
          <button onClick={reset} className="reset-btn">
            New Referendum
          </button>
        </div>
      )}
    </div>
  );
};
