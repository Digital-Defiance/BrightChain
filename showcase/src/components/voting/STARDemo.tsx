import type { Poll } from '@digitaldefiance/ecies-lib';
import {
  ECIESService,
  EmailString,
  Member,
  MemberType,
  PollFactory,
} from '@digitaldefiance/ecies-lib';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useShowcaseI18n } from '../../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../../i18n/showcaseStrings';
import { LoadingSpinner } from './LoadingSpinner';
import { useVotingDemo } from './useVotingDemo';

export const STARDemo = () => {
  const { t } = useShowcaseI18n();
  const { isInitializing, setIsInitializing, isTallying, withTallying } =
    useVotingDemo();
  const [_poll, setPoll] = useState<Poll<Uint8Array> | null>(null);
  const [authority, setAuthority] = useState<Member | null>(null);
  const [voters] = useState([
    'Voter 1',
    'Voter 2',
    'Voter 3',
    'Voter 4',
    'Voter 5',
    'Voter 6',
    'Voter 7',
  ]);
  const [currentVoter, setCurrentVoter] = useState(0);
  const [currentScores, setCurrentScores] = useState<number[]>([5, 5, 5, 5]);
  const [votes, setVotes] = useState<Map<string, number[]>>(new Map());
  const [scoreResults, setScoreResults] = useState<
    { idx: number; totalScore: number; avgScore: number }[] | null
  >(null);
  const [runoffResults, setRunoffResults] = useState<{
    winner: number;
    loser: number;
    winnerVotes: number;
    loserVotes: number;
  } | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  const candidates = [
    {
      name: 'Alex Rivera',
      emoji: '🎨',
      platform: t(ShowcaseStrings.STAR_Cand1_Platform),
    },
    {
      name: 'Jordan Lee',
      emoji: '🌱',
      platform: t(ShowcaseStrings.STAR_Cand2_Platform),
    },
    {
      name: 'Sam Taylor',
      emoji: '💼',
      platform: t(ShowcaseStrings.STAR_Cand3_Platform),
    },
    {
      name: 'Casey Morgan',
      emoji: '🏥',
      platform: t(ShowcaseStrings.STAR_Cand4_Platform),
    },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const eciesService = new ECIESService();
        const { member } = Member.newMember(
          eciesService,
          MemberType.System,
          'Election Board',
          new EmailString('board@election.gov'),
        );
        await member.deriveVotingKeys();
        setAuthority(member as Member);
        const newPoll = PollFactory.create(
          candidates.map((c) => c.name),
          'star' as any,
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

  const submitScores = () => {
    const voterName = voters[currentVoter];
    setVotes(new Map(votes.set(voterName, [...currentScores])));
    if (currentVoter < voters.length - 1) {
      setCurrentVoter(currentVoter + 1);
      setCurrentScores([5, 5, 5, 5]);
    }
  };

  const runSTAR = () =>
    withTallying(async () => {
      const scores = candidates.map((_, idx) => {
        const totalScore = Array.from(votes.values()).reduce(
          (sum, voterScores) => sum + voterScores[idx],
          0,
        );
        return { idx, totalScore, avgScore: totalScore / votes.size };
      });
      scores.sort((a, b) => b.totalScore - a.totalScore);
      setScoreResults(scores);

      const top1 = scores[0].idx;
      const top2 = scores[1].idx;
      let top1Wins = 0;
      let top2Wins = 0;

      Array.from(votes.values()).forEach((voterScores) => {
        if (voterScores[top1] > voterScores[top2]) top1Wins++;
        else if (voterScores[top2] > voterScores[top1]) top2Wins++;
      });

      setRunoffResults({
        winner: top1Wins > top2Wins ? top1 : top2,
        loser: top1Wins > top2Wins ? top2 : top1,
        winnerVotes: Math.max(top1Wins, top2Wins),
        loserVotes: Math.min(top1Wins, top2Wins),
      });
    });

  const reset = () => {
    if (!authority) return;
    const newPoll = PollFactory.create(
      candidates.map((c) => c.name),
      'star' as any,
      authority,
    );
    setPoll(newPoll);
    setVotes(new Map());
    setScoreResults(null);
    setRunoffResults(null);
    setCurrentVoter(0);
    setCurrentScores([5, 5, 5, 5]);
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
            <span className="intro-emoji">⭐🔄</span>
            <h3>{t(ShowcaseStrings.STAR_IntroTitle)}</h3>
          </div>
          <div className="intro-story">
            <p>
              <strong>{t(ShowcaseStrings.STAR_IntroAcronym)}</strong>
            </p>
            <p>
              <strong>{t(ShowcaseStrings.STAR_IntroStep1)}</strong>
            </p>
            <p>
              <strong>{t(ShowcaseStrings.STAR_IntroStep2)}</strong>
            </p>
            <div className="intro-stakes">
              <p>
                <strong>{t(ShowcaseStrings.STAR_IntroMagic)}</strong>
              </p>
              <p>
                <strong>{t(ShowcaseStrings.STAR_IntroExample)}</strong>
              </p>
            </div>
            <p className="intro-challenge">
              {t(ShowcaseStrings.STAR_IntroChallenge)}
            </p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="start-election-btn"
          >
            {t(ShowcaseStrings.STAR_StartBtn)}
          </button>
        </div>
      </div>
    );
  }

  const hasVoted =
    currentVoter >= voters.length || votes.size === voters.length;

  return (
    <div className="voting-demo">
      <div className="demo-header">
        <h3>{t(ShowcaseStrings.STAR_DemoTitle)}</h3>
        <p className="election-tagline">
          {t(ShowcaseStrings.STAR_DemoTagline)}
        </p>
      </div>

      {!scoreResults && (
        <>
          <div className="candidates-section">
            <h4>{t(ShowcaseStrings.STAR_CandidatesTitle)}</h4>
            <div className="candidates-grid">
              {candidates.map((c, idx) => (
                <div key={idx} className="candidate-card">
                  <div className="candidate-emoji">{c.emoji}</div>
                  <h5>{c.name}</h5>
                  <p>{c.platform}</p>
                </div>
              ))}
            </div>
          </div>

          {!hasVoted && (
            <div className="score-voting-section">
              <h4>
                {t(ShowcaseStrings.STAR_RatingsTemplate).replace(
                  '{VOTER}',
                  voters[currentVoter],
                )}
              </h4>
              {candidates.map((c, idx) => (
                <div key={idx} className="score-slider">
                  <div className="score-header">
                    <span>
                      {c.emoji} {c.name}
                    </span>
                    <span className="score-value">
                      {'⭐'.repeat(currentScores[idx])}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={currentScores[idx]}
                    onChange={(e) => {
                      const newScores = [...currentScores];
                      newScores[idx] = parseInt(e.target.value);
                      setCurrentScores(newScores);
                    }}
                    className="score-range"
                  />
                </div>
              ))}
              <button onClick={submitScores} className="submit-vote-btn">
                {t(ShowcaseStrings.STAR_SubmitRatingsTemplate)
                  .replace('{CURRENT}', String(currentVoter + 1))
                  .replace('{TOTAL}', String(voters.length))}
              </button>
            </div>
          )}

          {votes.size > 0 && hasVoted && (
            <button
              onClick={runSTAR}
              className="tally-btn"
              disabled={isTallying}
            >
              {isTallying
                ? t(ShowcaseStrings.Vote_DecryptingVotes)
                : t(ShowcaseStrings.STAR_RunSTAR)}
            </button>
          )}
        </>
      )}

      {scoreResults && !runoffResults && (
        <div className="star-phase">
          <h4>{t(ShowcaseStrings.STAR_Phase1Title)}</h4>

          <div className="tally-visualization">
            <h5>{t(ShowcaseStrings.STAR_Phase1TallyTitle)}</h5>
            <p className="tally-explain">
              {t(ShowcaseStrings.STAR_Phase1TallyExplain)}
            </p>
          </div>

          {scoreResults.map((result, rank) => {
            const isTopTwo = rank < 2;
            return (
              <div
                key={result.idx}
                className={`result-bar ${isTopTwo ? 'top-two' : ''}`}
              >
                <div className="result-header">
                  <span>
                    {candidates[result.idx].emoji} {candidates[result.idx].name}
                  </span>
                  <span>
                    {t(ShowcaseStrings.STAR_PointsTemplate)
                      .replace('{TOTAL}', String(result.totalScore))
                      .replace('{AVG}', result.avgScore.toFixed(2))}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(result.totalScore / (votes.size * 5)) * 100}%`,
                    }}
                  />
                </div>
                {isTopTwo && (
                  <span className="badge">
                    {t(ShowcaseStrings.STAR_RunoffBadge)}
                  </span>
                )}
              </div>
            );
          })}

          <div className="star-transition">
            <h3>{t(ShowcaseStrings.STAR_AutoRunoffPhase)}</h3>
            <p>{t(ShowcaseStrings.STAR_TopTwoAdvance)}</p>
            <button
              onClick={() => {
                const top1 = scoreResults[0].idx;
                const top2 = scoreResults[1].idx;
                let top1Wins = 0;
                let top2Wins = 0;

                Array.from(votes.values()).forEach((voterScores) => {
                  if (voterScores[top1] > voterScores[top2]) top1Wins++;
                  else if (voterScores[top2] > voterScores[top1]) top2Wins++;
                });

                setRunoffResults({
                  winner: top1Wins > top2Wins ? top1 : top2,
                  loser: top1Wins > top2Wins ? top2 : top1,
                  winnerVotes: Math.max(top1Wins, top2Wins),
                  loserVotes: Math.min(top1Wins, top2Wins),
                });
              }}
              className="tally-btn"
            >
              {t(ShowcaseStrings.STAR_RunAutoRunoff)}
            </button>
          </div>
        </div>
      )}

      {runoffResults && scoreResults && (
        <div className="results-section">
          <h4>{t(ShowcaseStrings.STAR_WinnerTitle)}</h4>

          <div className="tally-visualization">
            <h5>{t(ShowcaseStrings.STAR_Phase2Title)}</h5>
            <p className="tally-explain">
              {t(ShowcaseStrings.STAR_Phase2ExplainTemplate)
                .replace('{NAME1}', candidates[scoreResults[0].idx].name)
                .replace('{NAME2}', candidates[scoreResults[1].idx].name)}
            </p>
          </div>

          <div className="runoff-comparison">
            <div
              className={`runoff-candidate ${runoffResults.winner === scoreResults[0].idx ? 'winner' : ''}`}
            >
              <div className="candidate-emoji-large">
                {candidates[scoreResults[0].idx].emoji}
              </div>
              <h3>{candidates[scoreResults[0].idx].name}</h3>
              <p className="runoff-votes">
                {runoffResults.winner === scoreResults[0].idx
                  ? runoffResults.winnerVotes
                  : runoffResults.loserVotes}{' '}
                {t(ShowcaseStrings.STAR_VotersPreferred)}
              </p>
            </div>
            <div className="vs-divider">{t(ShowcaseStrings.STAR_VS)}</div>
            <div
              className={`runoff-candidate ${runoffResults.winner === scoreResults[1].idx ? 'winner' : ''}`}
            >
              <div className="candidate-emoji-large">
                {candidates[scoreResults[1].idx].emoji}
              </div>
              <h3>{candidates[scoreResults[1].idx].name}</h3>
              <p className="runoff-votes">
                {runoffResults.winner === scoreResults[1].idx
                  ? runoffResults.winnerVotes
                  : runoffResults.loserVotes}{' '}
                {t(ShowcaseStrings.STAR_VotersPreferred)}
              </p>
            </div>
          </div>

          <div className="winner-announcement">
            <h2>
              {t(ShowcaseStrings.STAR_WinnerAnnouncementTemplate).replace(
                '{NAME}',
                candidates[runoffResults.winner].name,
              )}
            </h2>
            <p>
              {t(ShowcaseStrings.STAR_WonRunoffTemplate)
                .replace('{WINNER}', String(runoffResults.winnerVotes))
                .replace('{LOSER}', String(runoffResults.loserVotes))}
            </p>
          </div>

          <button onClick={reset} className="reset-btn">
            {t(ShowcaseStrings.STAR_NewElection)}
          </button>
        </div>
      )}
    </div>
  );
};
