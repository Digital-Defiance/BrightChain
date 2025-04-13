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

export const SupermajorityDemo = () => {
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
      <LoadingSpinner message="Initializing cryptographic voting system..." />
    );

  if (showIntro) {
    return (
      <div className="voting-demo">
        <div className="election-intro">
          <div className="intro-header">
            <span className="intro-emoji">🎯</span>
            <h3>Constitutional Amendment Vote!</h3>
          </div>
          <div className="intro-story">
            <p>
              🏛️ <strong>The Stakes:</strong> Amending the Constitution requires
              more than a simple majority. We need a SUPERMAJORITY!
            </p>
            <p>
              🎯 <strong>2/3 Threshold:</strong> At least 66.67% must vote YES
              for the amendment to pass. This protects against hasty changes.
            </p>
            <div className="intro-stakes">
              <p>
                📜 <strong>The Amendment:</strong> "Add term limits for all
                federal judges"
              </p>
              <p>
                ⚠️ <strong>High Bar:</strong> 6 out of 9 states must ratify
                (simple majority isn't enough!)
              </p>
            </div>
            <p className="intro-challenge">
              🌎 Used for constitutional changes, treaty ratifications, and
              impeachment trials.
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            🗳️ Start Ratification!
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
        <h3>🎯 Supermajority - Constitutional Amendment</h3>
        <p className="election-tagline">
          📊 Requires {(threshold * 100).toFixed(0)}% to pass ({requiredVotes}/
          {voters.length} states)
        </p>
      </div>

      {!results ? (
        <>
          <div className="supermajority-tracker">
            <h4>📊 Live Threshold Tracker</h4>
            <div className="threshold-bar">
              <div
                className="threshold-progress"
                style={{ width: `${yesPercent}%` }}
              >
                {yesVotes > 0 && <span>{yesVotes} YES</span>}
              </div>
              <div
                className="threshold-line"
                style={{ left: `${threshold * 100}%` }}
              >
                <span className="threshold-label">
                  {(threshold * 100).toFixed(0)}% Required
                </span>
              </div>
            </div>
            <p className="threshold-status">
              {yesPercent >= threshold * 100
                ? `✅ Currently PASSING (${yesVotes}/${votes.size} = ${yesPercent.toFixed(1)}%)`
                : `❌ Currently FAILING (${yesVotes}/${votes.size} = ${yesPercent.toFixed(1)}%) - Need ${requiredVotes - yesVotes} more YES`}
            </p>
          </div>

          <div className="voters-section">
            <h4>
              State Legislatures ({votes.size}/{voters.length} voted)
            </h4>
            <div className="voters-grid">
              {voters.map((voter) => (
                <div key={voter} className="voter-card">
                  <strong>{voter}</strong>
                  {votes.has(voter) ? (
                    <div className="vote-cast">
                      ✓ {votes.get(voter) === 0 ? '✅ RATIFY' : '❌ REJECT'}
                    </div>
                  ) : (
                    <div className="yesno-buttons">
                      <button
                        onClick={() => castVote(voter, 0)}
                        className="vote-btn yes-btn"
                      >
                        ✅ RATIFY
                      </button>
                      <button
                        onClick={() => castVote(voter, 1)}
                        className="vote-btn no-btn"
                      >
                        ❌ REJECT
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
              {isTallying ? '🔓 Decrypting votes...' : '📜 Final Count!'}
            </button>
          )}
        </>
      ) : (
        <div className="results-section">
          <h4>🏛️ Amendment Results!</h4>

          <div className="tally-visualization">
            <h5>📊 Supermajority Calculation</h5>
            <p className="tally-explain">
              Required: {requiredVotes}/{voters.length} states (
              {(threshold * 100).toFixed(0)}%)
              <br />
              Actual: {Number(results.tallies[0])}/{votes.size} states (
              {((Number(results.tallies[0]) / votes.size) * 100).toFixed(1)}%)
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
                ✅ {Number(results.tallies[0])} RATIFY
              </div>
              <div
                className="final-no"
                style={{
                  width: `${(Number(results.tallies[1]) / votes.size) * 100}%`,
                }}
              >
                ❌ {Number(results.tallies[1])} REJECT
              </div>
            </div>
            <div
              className="threshold-marker"
              style={{ left: `${threshold * 100}%` }}
            >
              ⬆️ {(threshold * 100).toFixed(0)}% Threshold
            </div>
          </div>

          <div className="referendum-outcome">
            <h3>
              {Number(results.tallies[0]) >= requiredVotes
                ? '✅ AMENDMENT RATIFIED!'
                : '❌ AMENDMENT FAILS!'}
            </h3>
            <p>
              {Number(results.tallies[0]) >= requiredVotes
                ? `The amendment passes with ${Number(results.tallies[0])} states (${((Number(results.tallies[0]) / votes.size) * 100).toFixed(1)}%)`
                : `Failed to reach ${(threshold * 100).toFixed(0)}% threshold. Only ${Number(results.tallies[0])} of ${requiredVotes} required states ratified.`}
            </p>
          </div>
          <button onClick={reset} className="reset-btn">
            New Amendment
          </button>
        </div>
      )}
    </div>
  );
};
