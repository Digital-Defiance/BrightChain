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

export const YesNoAbstainDemo = () => {
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
      <LoadingSpinner message="Initializing cryptographic voting system..." />
    );

  if (showIntro) {
    return (
      <div className="voting-demo">
        <div className="election-intro">
          <div className="intro-header">
            <span className="intro-emoji">🤷</span>
            <h3>UN Security Council Resolution!</h3>
          </div>
          <div className="intro-story">
            <p>
              🌍 <strong>The Resolution:</strong> "Should the UN impose
              sanctions on Country X for human rights violations?"
            </p>
            <p>
              🤷 <strong>Yes/No/Abstain:</strong> Sometimes you're not ready to
              decide. Abstentions don't count toward the total but are recorded.
            </p>
            <div className="intro-stakes">
              <p>
                ✅ <strong>YES:</strong> Impose sanctions immediately
              </p>
              <p>
                ❌ <strong>NO:</strong> Reject the resolution
              </p>
              <p>
                🤷 <strong>ABSTAIN:</strong> Neutral - don't want to take a side
              </p>
            </div>
            <p className="intro-challenge">
              🏛️ Used in UN votes, parliamentary procedures, and board meetings
              worldwide.
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            🌎 Cast Votes!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>🤷 Yes/No/Abstain - UN Resolution</h3>
        <p className="election-tagline">
          🌍 Three choices: Support, Oppose, or Stay Neutral
        </p>
      </div>

      {!results ? (
        <>
          <div className="referendum-question">
            <h4>Impose sanctions on Country X?</h4>
          </div>

          <div className="voters-section">
            <h4>
              Security Council Members ({votes.size}/{voters.length} voted)
            </h4>
            <div className="voters-grid">
              {voters.map((voter) => (
                <div key={voter} className="voter-card">
                  <strong>{voter}</strong>
                  {votes.has(voter) ? (
                    <div className="vote-cast">
                      ✓{' '}
                      {votes.get(voter) === 0
                        ? '👍 YES'
                        : votes.get(voter) === 1
                          ? '👎 NO'
                          : '🤷 ABSTAIN'}
                    </div>
                  ) : (
                    <div className="abstain-buttons">
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
                      <button
                        onClick={() => castVote(voter, 2)}
                        className="vote-btn abstain-btn"
                      >
                        🤷 ABSTAIN
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
              {isTallying ? '🔓 Decrypting votes...' : '📊 Tally Resolution!'}
            </button>
          )}
        </>
      ) : (
        <div className="results-section">
          <h4>🌎 Resolution Results!</h4>

          <div className="tally-visualization">
            <h5>📊 Vote Counting</h5>
            <p className="tally-explain">
              Abstentions are recorded but don't count toward the decision.
              Winner needs majority of YES/NO votes:
            </p>
          </div>

          <div className="abstain-results">
            <div
              className={`abstain-result ${results.winner === 0 ? 'winner' : ''}`}
            >
              <span className="abstain-emoji">👍</span>
              <h3>YES</h3>
              <p className="abstain-count">
                {Number(results.tallies[0])} votes
              </p>
              <p className="abstain-percent">
                {(
                  (Number(results.tallies[0]) /
                    (Number(results.tallies[0]) + Number(results.tallies[1]))) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>
            <div
              className={`abstain-result ${results.winner === 1 ? 'winner' : ''}`}
            >
              <span className="abstain-emoji">👎</span>
              <h3>NO</h3>
              <p className="abstain-count">
                {Number(results.tallies[1])} votes
              </p>
              <p className="abstain-percent">
                {(
                  (Number(results.tallies[1]) /
                    (Number(results.tallies[0]) + Number(results.tallies[1]))) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>
            <div className="abstain-result neutral">
              <span className="abstain-emoji">🤷</span>
              <h3>ABSTAIN</h3>
              <p className="abstain-count">
                {Number(results.tallies[2])} votes
              </p>
              <p className="abstain-note">Not counted in decision</p>
            </div>
          </div>

          <div className="referendum-outcome">
            <h3>
              {results.winner === 0
                ? '✅ Resolution PASSES!'
                : '❌ Resolution FAILS!'}
            </h3>
            <p>
              Deciding votes:{' '}
              {Number(results.tallies[0]) + Number(results.tallies[1])} |
              Abstentions: {Number(results.tallies[2])}
            </p>
          </div>
          <button onClick={reset} className="reset-btn">
            New Resolution
          </button>
        </div>
      )}
    </div>
  );
};
