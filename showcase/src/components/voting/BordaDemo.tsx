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
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const BordaDemo = () => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
  const [voters] = useState(['USA', 'France', 'Japan', 'Brazil', 'Kenya']);
  const [votes, setVotes] = useState<Map<string, number[]>>(new Map());
  const [results, setResults] = useState<PollResults | null>(null);
  const { isInitializing, setIsInitializing, isTallying, withTallying } =
    useVotingDemo();
  const [showIntro, setShowIntro] = useState(true);

  const candidates = [
    { name: 'Paris', emoji: '🗼', description: 'City of Light' },
    { name: 'Tokyo', emoji: '🗾', description: 'Rising Sun' },
    { name: 'Los Angeles', emoji: '🌴', description: 'City of Angels' },
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
      <LoadingSpinner message="Initializing cryptographic voting system..." />
    );

  if (showIntro) {
    return (
      <div className="voting-demo">
        <div className="election-intro">
          <div className="intro-header">
            <span className="intro-emoji">🏆</span>
            <h3>Olympic Host City Selection!</h3>
          </div>
          <div className="intro-story">
            <p>
              🌍 <strong>IOC Committee Room:</strong> Five nations must choose
              the next Olympic host city. But everyone has preferences!
            </p>
            <p>
              🎯 <strong>Borda Count</strong> gives points based on ranking: 1st
              place = 3 points, 2nd = 2 points, 3rd = 1 point.
            </p>
            <p className="intro-challenge">
              💡 This rewards consensus picks over polarizing choices. The city
              with the most total points wins!
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            🏅 Start Voting!
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {isTallying && <LoadingSpinner message="Decrypting votes..." />}
      <div className="voting-demo">
        <div className="demo-header">
          <h3>🏆 Borda Count - Olympic Host Selection</h3>
          <p className="election-tagline">
            📊 Rank all cities. Points = consensus!
          </p>
        </div>

        {!results ? (
          <>
            <div className="candidates-section">
              <h4>Candidate Cities</h4>
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
                IOC Members ({votes.size}/{voters.length} voted)
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
                    {hasVoted && <div className="vote-cast">✓ Ranked!</div>}
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
                {isTallying ? '🔓 Decrypting votes...' : '🏅 Count Points!'}
              </button>
            )}
          </>
        ) : (
          <div className="results-section">
            <h4>🎉 Olympic Host Announced!</h4>
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
                    <span>{points} points</span>
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
              New Vote
            </button>
          </div>
        )}
      </div>
    </>
  );
};
