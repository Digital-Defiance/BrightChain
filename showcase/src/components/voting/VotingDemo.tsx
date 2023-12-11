import { VotingMethod } from '@digitaldefiance/ecies-lib';
import { useEffect, useState } from 'react';
import { useShowcaseI18n } from '../../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../../i18n/showcaseStrings';
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
  const { t } = useShowcaseI18n();
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
            <h3>
              {t(ShowcaseStrings.Vote_ComingSoon, { METHOD: selectedMethod })}
            </h3>
            <p>{t(ShowcaseStrings.Vote_ComingSoonDesc)}</p>
          </div>
        );
    }
  };

  return (
    <div className="voting-demo-container">
      <div className="voting-intro">
        <h2>{t(ShowcaseStrings.Vote_Title)}</h2>
        <p>{t(ShowcaseStrings.Vote_TitleDesc)}</p>
        <div className="security-badges">
          <span className="badge secure">
            {t(ShowcaseStrings.Vote_BadgeHomomorphic)}
          </span>
          <span className="badge secure">
            {t(ShowcaseStrings.Vote_BadgeReceipts)}
          </span>
          <span className="badge secure">
            {t(ShowcaseStrings.Vote_BadgeRoleSeparation)}
          </span>
          <span className="badge secure">
            {t(ShowcaseStrings.Vote_BadgeTests)}
          </span>
        </div>
      </div>

      <VotingSelector
        selectedMethod={selectedMethod}
        onMethodChange={handleMethodChange}
      />

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{t(ShowcaseStrings.Vote_LoadingDemo)}</p>
        </div>
      ) : (
        renderDemo()
      )}
    </div>
  );
};
