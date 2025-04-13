import { VotingMethod } from '@digitaldefiance/ecies-lib';
import './VotingSelector.css';

interface VotingSelectorProps {
  selectedMethod: VotingMethod;
  onMethodChange: (method: VotingMethod) => void;
}

const votingMethods = [
  { method: VotingMethod.Plurality, name: 'Plurality', category: 'secure', emoji: '🗳️' },
  { method: VotingMethod.Approval, name: 'Approval', category: 'secure', emoji: '✅' },
  { method: VotingMethod.Weighted, name: 'Weighted', category: 'secure', emoji: '⚖️' },
  { method: VotingMethod.Borda, name: 'Borda Count', category: 'secure', emoji: '🏆' },
  { method: VotingMethod.Score, name: 'Score Voting', category: 'secure', emoji: '⭐' },
  { method: VotingMethod.YesNo, name: 'Yes/No', category: 'secure', emoji: '👍' },
  { method: VotingMethod.YesNoAbstain, name: 'Yes/No/Abstain', category: 'secure', emoji: '🤷' },
  { method: VotingMethod.Supermajority, name: 'Supermajority', category: 'secure', emoji: '🎯' },
  { method: VotingMethod.RankedChoice, name: 'Ranked Choice (IRV)', category: 'multi-round', emoji: '🔄' },
  { method: VotingMethod.TwoRound, name: 'Two-Round', category: 'multi-round', emoji: '2️⃣' },
  { method: VotingMethod.STAR, name: 'STAR', category: 'multi-round', emoji: '⭐🔄' },
  { method: VotingMethod.STV, name: 'STV', category: 'multi-round', emoji: '📊' },
  { method: VotingMethod.Quadratic, name: 'Quadratic', category: 'insecure', emoji: '²' },
  { method: VotingMethod.Consensus, name: 'Consensus', category: 'insecure', emoji: '🤝' },
  { method: VotingMethod.ConsentBased, name: 'Consent-Based', category: 'insecure', emoji: '🙋' },
];

export const VotingSelector = ({ selectedMethod, onMethodChange }: VotingSelectorProps) => {
  const secureMethod = votingMethods.filter(m => m.category === 'secure');
  const multiRound = votingMethods.filter(m => m.category === 'multi-round');
  const insecure = votingMethods.filter(m => m.category === 'insecure');

  return (
    <div className="voting-selector">
      <h3>Select Voting Method</h3>
      
      <div className="method-category">
        <h4>✅ Fully Secure (Single-round, Privacy-preserving)</h4>
        <div className="method-grid">
          {secureMethod.map(({ method, name, emoji }) => (
            <button
              key={method}
              className={`method-btn ${selectedMethod === method ? 'active' : ''}`}
              onClick={() => onMethodChange(method)}
            >
              <span className="method-emoji">{emoji}</span>
              <span className="method-name">{name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="method-category">
        <h4>⚠️ Multi-Round (Requires intermediate decryption)</h4>
        <div className="method-grid">
          {multiRound.map(({ method, name, emoji }) => (
            <button
              key={method}
              className={`method-btn ${selectedMethod === method ? 'active' : ''}`}
              onClick={() => onMethodChange(method)}
            >
              <span className="method-emoji">{emoji}</span>
              <span className="method-name">{name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="method-category">
        <h4>❌ Insecure (No privacy - special cases only)</h4>
        <div className="method-grid">
          {insecure.map(({ method, name, emoji }) => (
            <button
              key={method}
              className={`method-btn ${selectedMethod === method ? 'active' : ''}`}
              onClick={() => onMethodChange(method)}
            >
              <span className="method-emoji">{emoji}</span>
              <span className="method-name">{name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
