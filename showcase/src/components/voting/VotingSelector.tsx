import { VotingMethod } from '@digitaldefiance/ecies-lib';
import { useShowcaseI18n } from '../../i18n/ShowcaseI18nContext';
import { ShowcaseStringKey, ShowcaseStrings } from '../../i18n/showcaseStrings';
import './VotingSelector.css';

interface VotingSelectorProps {
  selectedMethod: VotingMethod;
  onMethodChange: (method: VotingMethod) => void;
}

const votingMethods: Array<{
  method: VotingMethod;
  nameKey: ShowcaseStringKey;
  category: string;
  emoji: string;
}> = [
  {
    method: VotingMethod.Plurality,
    nameKey: ShowcaseStrings.VoteMethod_Plurality,
    category: 'secure',
    emoji: '🗳️',
  },
  {
    method: VotingMethod.Approval,
    nameKey: ShowcaseStrings.VoteMethod_Approval,
    category: 'secure',
    emoji: '✅',
  },
  {
    method: VotingMethod.Weighted,
    nameKey: ShowcaseStrings.VoteMethod_Weighted,
    category: 'secure',
    emoji: '⚖️',
  },
  {
    method: VotingMethod.Borda,
    nameKey: ShowcaseStrings.VoteMethod_BordaCount,
    category: 'secure',
    emoji: '🏆',
  },
  {
    method: VotingMethod.Score,
    nameKey: ShowcaseStrings.VoteMethod_ScoreVoting,
    category: 'secure',
    emoji: '⭐',
  },
  {
    method: VotingMethod.YesNo,
    nameKey: ShowcaseStrings.VoteMethod_YesNo,
    category: 'secure',
    emoji: '👍',
  },
  {
    method: VotingMethod.YesNoAbstain,
    nameKey: ShowcaseStrings.VoteMethod_YesNoAbstain,
    category: 'secure',
    emoji: '🤷',
  },
  {
    method: VotingMethod.Supermajority,
    nameKey: ShowcaseStrings.VoteMethod_Supermajority,
    category: 'secure',
    emoji: '🎯',
  },
  {
    method: VotingMethod.RankedChoice,
    nameKey: ShowcaseStrings.VoteMethod_RankedChoice,
    category: 'multi-round',
    emoji: '🔄',
  },
  {
    method: VotingMethod.TwoRound,
    nameKey: ShowcaseStrings.VoteMethod_TwoRound,
    category: 'multi-round',
    emoji: '2️⃣',
  },
  {
    method: VotingMethod.STAR,
    nameKey: ShowcaseStrings.VoteMethod_STAR,
    category: 'multi-round',
    emoji: '⭐🔄',
  },
  {
    method: VotingMethod.STV,
    nameKey: ShowcaseStrings.VoteMethod_STV,
    category: 'multi-round',
    emoji: '📊',
  },
  {
    method: VotingMethod.Quadratic,
    nameKey: ShowcaseStrings.VoteMethod_Quadratic,
    category: 'insecure',
    emoji: '²',
  },
  {
    method: VotingMethod.Consensus,
    nameKey: ShowcaseStrings.VoteMethod_Consensus,
    category: 'insecure',
    emoji: '🤝',
  },
  {
    method: VotingMethod.ConsentBased,
    nameKey: ShowcaseStrings.VoteMethod_ConsentBased,
    category: 'insecure',
    emoji: '🙋',
  },
];

export const VotingSelector = ({
  selectedMethod,
  onMethodChange,
}: VotingSelectorProps) => {
  const { t } = useShowcaseI18n();
  const secureMethod = votingMethods.filter((m) => m.category === 'secure');
  const multiRound = votingMethods.filter((m) => m.category === 'multi-round');
  const insecure = votingMethods.filter((m) => m.category === 'insecure');

  return (
    <div className="voting-selector">
      <h3>{t(ShowcaseStrings.VoteSel_Title)}</h3>

      <div className="method-category">
        <h4>{t(ShowcaseStrings.VoteSel_SecureCategory)}</h4>
        <div className="method-grid">
          {secureMethod.map(({ method, nameKey, emoji }) => (
            <button
              key={method}
              className={`method-btn ${selectedMethod === method ? 'active' : ''}`}
              onClick={() => onMethodChange(method)}
            >
              <span className="method-emoji">{emoji}</span>
              <span className="method-name">{t(nameKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="method-category">
        <h4>{t(ShowcaseStrings.VoteSel_MultiRoundCategory)}</h4>
        <div className="method-grid">
          {multiRound.map(({ method, nameKey, emoji }) => (
            <button
              key={method}
              className={`method-btn ${selectedMethod === method ? 'active' : ''}`}
              onClick={() => onMethodChange(method)}
            >
              <span className="method-emoji">{emoji}</span>
              <span className="method-name">{t(nameKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="method-category">
        <h4>{t(ShowcaseStrings.VoteSel_InsecureCategory)}</h4>
        <div className="method-grid">
          {insecure.map(({ method, nameKey, emoji }) => (
            <button
              key={method}
              className={`method-btn ${selectedMethod === method ? 'active' : ''}`}
              onClick={() => onMethodChange(method)}
            >
              <span className="method-emoji">{emoji}</span>
              <span className="method-name">{t(nameKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
