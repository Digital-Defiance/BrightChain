import { VotingMethod } from '@digitaldefiance/ecies-lib';
import { useEffect, useState } from 'react';
import { ApprovalDemo } from './ApprovalDemo';
import { BordaDemo } from './BordaDemo';
import { ConsensusDemo } from './ConsensusDemo';
import { ConsentBasedDemo } from './ConsentBasedDemo';
import { PluralityDemo } from './PluralityDemo';
import { QuadraticDemo } from './QuadraticDemo';
import { RankedChoiceDemo } from './RankedChoiceDemo';
import { ScoreDemo } from './ScoreDemo';
import { STARDemo } from './STARDemo';
import { STVDemo } from './STVDemo';
import { SupermajorityDemo } from './SupermajorityDemo';
import { TwoRoundDemo } from './TwoRoundDemo';
import './VotingDemo.css';
import { VotingSelector } from './VotingSelector';
import { WeightedDemo } from './WeightedDemo';
import { YesNoAbstainDemo } from './YesNoAbstainDemo';
import { YesNoDemo } from './YesNoDemo';

export const VotingDemo = () => {
  const [selectedMethod, setSelectedMethod] = useState<VotingMethod>(
    VotingMethod.Plurality,
  );
  const [isLoading, setIsLoading] = useState(true);

  const handleMethodChange = (method: VotingMethod) => {
    setIsLoading(true);
    setSelectedMethod(method);
    requestAnimationFrame(() => {
      setTimeout(() => setIsLoading(false), 100);
    });
  };

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const renderDemo = () => {
    switch (selectedMethod) {
      case VotingMethod.Plurality:
        return <PluralityDemo />;
      case VotingMethod.Approval:
        return <ApprovalDemo />;
      case VotingMethod.Weighted:
        return <WeightedDemo />;
      case VotingMethod.RankedChoice:
        return <RankedChoiceDemo />;
      case VotingMethod.Borda:
        return <BordaDemo />;
      case VotingMethod.Score:
        return <ScoreDemo />;
      case VotingMethod.YesNo:
        return <YesNoDemo />;
      case VotingMethod.YesNoAbstain:
        return <YesNoAbstainDemo />;
      case VotingMethod.Supermajority:
        return <SupermajorityDemo />;
      case VotingMethod.TwoRound:
        return <TwoRoundDemo />;
      case VotingMethod.STAR:
        return <STARDemo />;
      case VotingMethod.STV:
        return <STVDemo />;
      case VotingMethod.Quadratic:
        return <QuadraticDemo />;
      case VotingMethod.Consensus:
        return <ConsensusDemo />;
      case VotingMethod.ConsentBased:
        return <ConsentBasedDemo />;
      default:
        return (
          <div className="coming-soon">
            <h3>🚧 {selectedMethod} Demo</h3>
            <p>This voting method is fully implemented in the library.</p>
          </div>
        );
    }
  };

  return (
    <div className="voting-demo-container">
      <div className="voting-intro">
        <h2>🗳️ Government-Grade Voting System</h2>
        <p>
          Explore our comprehensive cryptographic voting library with 15
          different voting methods. Each demo shows real-world use cases with
          homomorphic encryption ensuring vote privacy.
        </p>
        <div className="security-badges">
          <span className="badge secure">✅ Homomorphic Encryption</span>
          <span className="badge secure">🔐 Verifiable Receipts</span>
          <span className="badge secure">🛡️ Role Separation</span>
          <span className="badge secure">🧪 900+ Tests</span>
        </div>
      </div>

      <VotingSelector
        selectedMethod={selectedMethod}
        onMethodChange={handleMethodChange}
      />

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading voting demo...</p>
        </div>
      ) : (
        renderDemo()
      )}
    </div>
  );
};
