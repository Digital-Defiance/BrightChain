import React, { useEffect, useState } from 'react';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';
import { useEducationalModeContext } from './EducationalModeProvider';
import './ProcessCompletionSummary.css';

/**
 * Process Completion Summary Modal Props
 */
interface ProcessCompletionSummaryProps {
  processType: 'encoding' | 'reconstruction';
  isVisible: boolean;
  onClose: () => void;
}

/**
 * Process Completion Summary Modal Component
 */
export const ProcessCompletionSummary: React.FC<
  ProcessCompletionSummaryProps
> = ({ processType, isVisible, onClose }) => {
  const { t } = useShowcaseI18n();
  const { content, config } = useEducationalModeContext();
  const [currentSection, setCurrentSection] = useState<
    'overview' | 'achievements' | 'technical' | 'next'
  >('overview');

  const summary = content.processCompletionSummaries.get(processType);

  useEffect(() => {
    if (isVisible) {
      setCurrentSection('overview');
    }
  }, [isVisible]);

  if (!config.enabled || !isVisible || !summary) {
    return null;
  }

  const sections = [
    { id: 'overview', label: t(ShowcaseStrings.Edu_Overview), icon: '📋' },
    {
      id: 'achievements',
      label: t(ShowcaseStrings.Edu_Achievements),
      icon: '🎯',
    },
    { id: 'technical', label: t(ShowcaseStrings.Edu_Technical), icon: '⚙️' },
    { id: 'next', label: t(ShowcaseStrings.Edu_NextSteps), icon: '🚀' },
  ] as const;

  const renderSectionContent = () => {
    switch (currentSection) {
      case 'overview':
        return (
          <div className="summary-section">
            <h3>{t(ShowcaseStrings.Edu_ProcessOverview)}</h3>
            <p className="summary-description">{summary.description}</p>
            <div className="learning-points">
              <h4>{t(ShowcaseStrings.Edu_KeyLearningPoints)}</h4>
              <ul>
                {summary.learningPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'achievements':
        return (
          <div className="summary-section">
            <h3>{t(ShowcaseStrings.Edu_WhatWeAccomplished)}</h3>
            <div className="achievements-grid">
              {summary.keyAchievements.map((achievement, index) => (
                <div key={index} className="achievement-card">
                  <span className="achievement-icon">✅</span>
                  <span className="achievement-text">{achievement}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'technical':
        return (
          <div className="summary-section">
            <h3>{t(ShowcaseStrings.Edu_TechnicalOutcomes)}</h3>
            <div className="technical-outcomes">
              {summary.technicalOutcomes.map((outcome, index) => (
                <div key={index} className="outcome-item">
                  <span className="outcome-icon">⚡</span>
                  <span className="outcome-text">{outcome}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'next':
        return (
          <div className="summary-section">
            <h3>{t(ShowcaseStrings.Edu_WhatsNext)}</h3>
            <div className="next-steps">
              {summary.nextSteps.map((step, index) => (
                <div key={index} className="next-step-item">
                  <span className="step-number">{index + 1}</span>
                  <span className="step-text">{step}</span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="summary-modal-overlay" onClick={onClose}>
      <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="summary-header">
          <h2 className="summary-title">{summary.title}</h2>
          <button
            className="summary-close"
            onClick={onClose}
            aria-label={t(ShowcaseStrings.Edu_CloseSummary)}
          >
            ×
          </button>
        </div>

        <div className="summary-navigation">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`nav-button ${currentSection === section.id ? 'active' : ''}`}
              onClick={() => setCurrentSection(section.id)}
            >
              <span className="nav-icon">{section.icon}</span>
              <span className="nav-label">{section.label}</span>
            </button>
          ))}
        </div>

        <div className="summary-content">{renderSectionContent()}</div>

        <div className="summary-footer">
          <div className="progress-indicator">
            {sections.map((section, _index) => (
              <div
                key={section.id}
                className={`progress-dot ${currentSection === section.id ? 'active' : ''}`}
                onClick={() => setCurrentSection(section.id)}
              />
            ))}
          </div>

          <div className="summary-actions">
            <button
              className="action-btn secondary"
              onClick={() => {
                const currentIndex = sections.findIndex(
                  (s) => s.id === currentSection,
                );
                if (currentIndex > 0) {
                  setCurrentSection(sections[currentIndex - 1].id);
                }
              }}
              disabled={currentSection === 'overview'}
            >
              {t(ShowcaseStrings.Edu_Previous)}
            </button>

            <button
              className="action-btn primary"
              onClick={() => {
                const currentIndex = sections.findIndex(
                  (s) => s.id === currentSection,
                );
                if (currentIndex < sections.length - 1) {
                  setCurrentSection(sections[currentIndex + 1].id);
                } else {
                  onClose();
                }
              }}
            >
              {currentSection === 'next'
                ? t(ShowcaseStrings.Edu_Finish)
                : t(ShowcaseStrings.Edu_Next)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Educational Mode Controls Component
 */
export const EducationalModeControls: React.FC = () => {
  const { t } = useShowcaseI18n();
  const {
    config,
    enableEducationalMode,
    disableEducationalMode,
    updateConfig,
    setSpeedMultiplier,
  } = useEducationalModeContext();

  const speedOptions = [
    { value: 0.25, label: t(ShowcaseStrings.Edu_SpeedVerySlow) },
    { value: 0.5, label: t(ShowcaseStrings.Edu_SpeedSlow) },
    { value: 0.75, label: t(ShowcaseStrings.Edu_SpeedModerate) },
    { value: 1.0, label: t(ShowcaseStrings.Edu_SpeedNormal) },
    { value: 1.5, label: t(ShowcaseStrings.Edu_SpeedFast) },
    { value: 2.0, label: t(ShowcaseStrings.Edu_SpeedVeryFast) },
  ];

  return (
    <div className="educational-controls">
      <div className="control-group">
        <label className="control-label">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => {
              if (e.target.checked) {
                enableEducationalMode();
              } else {
                disableEducationalMode();
              }
            }}
            className="control-checkbox"
          />
          <span className="checkbox-custom"></span>
          🎓 {t(ShowcaseStrings.Edu_EducationalMode)}
        </label>
      </div>

      {config.enabled && (
        <>
          <div className="control-group">
            <label className="control-label">
              {t(ShowcaseStrings.Edu_AnimationSpeed)}
              <select
                value={config.speedMultiplier}
                onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                className="control-select"
              >
                {speedOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="control-group">
            <label className="control-label">
              <input
                type="checkbox"
                checked={config.stepByStepMode}
                onChange={(e) =>
                  updateConfig({ stepByStepMode: e.target.checked })
                }
                className="control-checkbox"
              />
              <span className="checkbox-custom"></span>
              {t(ShowcaseStrings.Edu_StepByStep)}
            </label>
          </div>

          <div className="control-group">
            <label className="control-label">
              <input
                type="checkbox"
                checked={config.showTooltips}
                onChange={(e) =>
                  updateConfig({ showTooltips: e.target.checked })
                }
                className="control-checkbox"
              />
              <span className="checkbox-custom"></span>
              {t(ShowcaseStrings.Edu_ShowTooltips)}
            </label>
          </div>

          <div className="control-group">
            <label className="control-label">
              <input
                type="checkbox"
                checked={config.showExplanations}
                onChange={(e) =>
                  updateConfig({ showExplanations: e.target.checked })
                }
                className="control-checkbox"
              />
              <span className="checkbox-custom"></span>
              {t(ShowcaseStrings.Edu_ShowExplanations)}
            </label>
          </div>

          <div className="control-group">
            <label className="control-label">
              <input
                type="checkbox"
                checked={config.autoAdvance}
                onChange={(e) =>
                  updateConfig({ autoAdvance: e.target.checked })
                }
                className="control-checkbox"
              />
              <span className="checkbox-custom"></span>
              {t(ShowcaseStrings.Edu_AutoAdvance)}
            </label>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Educational Progress Indicator Component
 */
export const EducationalProgressIndicator: React.FC = () => {
  const { t } = useShowcaseI18n();
  const { currentStep, completedSteps, config } = useEducationalModeContext();

  if (!config.enabled || !currentStep) {
    return null;
  }

  // This would typically come from the animation controller
  const allSteps = [
    'file-read',
    'chunking',
    'padding',
    'checksum',
    'storage',
    'cbl-creation',
    'magnet-url',
  ];

  const _currentIndex = allSteps.indexOf(currentStep.id);
  const progress = (completedSteps.size / allSteps.length) * 100;

  return (
    <div className="educational-progress">
      <div className="progress-header">
        <h4>{t(ShowcaseStrings.Edu_LearningProgress)}</h4>
        <span className="progress-text">
          {t(ShowcaseStrings.Edu_StepsCompleted, {
            COMPLETED: String(completedSteps.size),
            TOTAL: String(allSteps.length),
          })}
        </span>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-percentage">{Math.round(progress)}%</span>
      </div>

      <div className="step-indicators">
        {allSteps.map((stepId, index) => (
          <div
            key={stepId}
            className={`step-indicator ${
              completedSteps.has(stepId)
                ? 'completed'
                : stepId === currentStep.id
                  ? 'active'
                  : 'pending'
            }`}
            title={stepId.replace('-', ' ')}
          >
            {completedSteps.has(stepId) ? '✓' : index + 1}
          </div>
        ))}
      </div>
    </div>
  );
};
