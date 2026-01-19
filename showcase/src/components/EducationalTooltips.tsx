/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import { useEducationalModeContext } from './EducationalModeProvider';
import './EducationalTooltips.css';

/**
 * Tooltip position calculation
 */
interface TooltipPosition {
  x: number;
  y: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Educational Tooltip Component
 */
export const EducationalTooltip: React.FC = () => {
  const { currentTooltip, content, hideTooltip, showGlossary } =
    useEducationalModeContext();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<TooltipPosition>({
    x: 0,
    y: 0,
    placement: 'top',
  });

  useEffect(() => {
    if (!currentTooltip || !tooltipRef.current) return;

    const calculatePosition = () => {
      const tooltip = tooltipRef.current!;
      const rect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const _viewportHeight = window.innerHeight;

      let { x, y } = currentTooltip.position;
      let placement: 'top' | 'bottom' | 'left' | 'right' = 'top';

      // Adjust for viewport boundaries
      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 10;
        placement = 'left';
      }
      if (y - rect.height < 0) {
        y = currentTooltip.position.y + 30;
        placement = 'bottom';
      }
      if (x < 0) {
        x = 10;
        placement = 'right';
      }

      setPosition({ x, y, placement });
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [currentTooltip]);

  if (!currentTooltip) return null;

  const explanation = content.stepExplanations.get(currentTooltip.stepId);
  if (!explanation) return null;

  const handleConceptClick = (concept: string) => {
    showGlossary(concept);
  };

  return (
    <div
      ref={tooltipRef}
      className={`educational-tooltip ${position.placement}`}
      style={{
        left: position.x,
        top: position.y,
        position: 'fixed',
        zIndex: 1000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="tooltip-header">
        <h4 className="tooltip-title">{explanation.title}</h4>
        <button
          className="tooltip-close"
          onClick={hideTooltip}
          aria-label="Close tooltip"
        >
          ×
        </button>
      </div>

      <div className="tooltip-content">
        <div className="tooltip-section">
          <h5>🔍 What's Happening</h5>
          <p>{explanation.whatsHappening}</p>
        </div>

        <div className="tooltip-section">
          <h5>💡 Why It Matters</h5>
          <p>{explanation.whyItMatters}</p>
        </div>

        <div className="tooltip-section">
          <h5>⚙️ Technical Details</h5>
          <p>{explanation.technicalDetails}</p>
        </div>

        {explanation.relatedConcepts.length > 0 && (
          <div className="tooltip-section">
            <h5>🔗 Related Concepts</h5>
            <div className="concept-links">
              {explanation.relatedConcepts.map((concept) => (
                <button
                  key={concept}
                  className="concept-link"
                  onClick={() => handleConceptClick(concept)}
                >
                  {concept.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {explanation.visualCues.length > 0 && (
          <div className="tooltip-section">
            <h5>👁️ Visual Cues</h5>
            <ul className="visual-cues">
              {explanation.visualCues.map((cue, index) => (
                <li key={index}>{cue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="tooltip-arrow" />
    </div>
  );
};

/**
 * Contextual Help Button Component
 */
interface ContextualHelpButtonProps {
  stepId: string;
  position?: { x: number; y: number };
  className?: string;
}

export const ContextualHelpButton: React.FC<ContextualHelpButtonProps> = ({
  stepId,
  position,
  className = '',
}) => {
  const { showTooltip, config } = useEducationalModeContext();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    if (!config.enabled || !config.showTooltips) return;

    let tooltipPosition = position;
    if (!tooltipPosition && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      tooltipPosition = {
        x: rect.left + rect.width / 2,
        y: rect.top,
      };
    }

    if (tooltipPosition) {
      showTooltip(stepId, tooltipPosition);
    }
  };

  if (!config.enabled || !config.showTooltips) return null;

  return (
    <button
      ref={buttonRef}
      className={`contextual-help-button ${className}`}
      onClick={handleClick}
      title="Get help with this step"
      aria-label={`Get help with ${stepId}`}
    >
      ❓
    </button>
  );
};

/**
 * Step Explanation Panel Component
 */
export const StepExplanationPanel: React.FC = () => {
  const {
    currentExplanation,
    awaitingUserAcknowledgment,
    acknowledgeStep,
    skipStep,
    config,
    showGlossary,
  } = useEducationalModeContext();

  if (!config.enabled || !config.showExplanations || !currentExplanation) {
    return null;
  }

  const handleConceptClick = (concept: string) => {
    showGlossary(concept);
  };

  return (
    <div className="step-explanation-panel">
      <div className="explanation-header">
        <h3 className="explanation-title">
          <span className="step-icon">🎓</span>
          {currentExplanation.title}
        </h3>
      </div>

      <div className="explanation-content">
        <div className="explanation-section">
          <h4>🔍 What's Happening</h4>
          <p>{currentExplanation.whatsHappening}</p>
        </div>

        <div className="explanation-section">
          <h4>💡 Why It Matters</h4>
          <p>{currentExplanation.whyItMatters}</p>
        </div>

        <div className="explanation-section">
          <h4>⚙️ Technical Details</h4>
          <p>{currentExplanation.technicalDetails}</p>
        </div>

        {currentExplanation.relatedConcepts.length > 0 && (
          <div className="explanation-section">
            <h4>🔗 Related Concepts</h4>
            <div className="concept-links">
              {currentExplanation.relatedConcepts.map((concept) => (
                <button
                  key={concept}
                  className="concept-link"
                  onClick={() => handleConceptClick(concept)}
                >
                  {concept.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {awaitingUserAcknowledgment && (
        <div className="explanation-actions">
          <button className="action-btn primary" onClick={acknowledgeStep}>
            ✅ I Understand - Continue
          </button>
          <button className="action-btn secondary" onClick={skipStep}>
            ⏭️ Skip This Step
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Concept Glossary Modal Component
 */
export const ConceptGlossaryModal: React.FC = () => {
  const {
    showGlossaryModal,
    selectedConcept,
    content,
    hideGlossary,
    showGlossary,
    config,
  } = useEducationalModeContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredConcepts, setFilteredConcepts] = useState<
    Array<[string, any]>
  >([]);

  useEffect(() => {
    if (!showGlossaryModal) return;

    const concepts = Array.from(content.conceptGlossary.entries());
    if (searchTerm) {
      const filtered = concepts.filter(
        ([key, concept]) =>
          key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          concept.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
          concept.definition.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredConcepts(filtered);
    } else {
      setFilteredConcepts(concepts);
    }
  }, [showGlossaryModal, searchTerm, content.conceptGlossary]);

  if (!config.enabled || !config.showGlossary || !showGlossaryModal) {
    return null;
  }

  const selectedConceptData = selectedConcept
    ? content.conceptGlossary.get(selectedConcept)
    : null;

  return (
    <div className="glossary-modal-overlay" onClick={hideGlossary}>
      <div className="glossary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="glossary-header">
          <h2>📚 BrightChain Concept Glossary</h2>
          <button
            className="modal-close"
            onClick={hideGlossary}
            aria-label="Close glossary"
          >
            ×
          </button>
        </div>

        <div className="glossary-content">
          {selectedConceptData ? (
            <div className="concept-detail">
              <button className="back-button" onClick={() => setSearchTerm('')}>
                ← Back to Glossary
              </button>

              <div className="concept-card">
                <h3 className="concept-term">{selectedConceptData.term}</h3>
                <div
                  className={`importance-badge ${selectedConceptData.importance}`}
                >
                  {selectedConceptData.importance} importance
                </div>

                <div className="concept-section">
                  <h4>Definition</h4>
                  <p>{selectedConceptData.definition}</p>
                </div>

                <div className="concept-section">
                  <h4>Technical Definition</h4>
                  <p>{selectedConceptData.technicalDefinition}</p>
                </div>

                {selectedConceptData.examples.length > 0 && (
                  <div className="concept-section">
                    <h4>Examples</h4>
                    <ul>
                      {selectedConceptData.examples.map((example, index) => (
                        <li key={index}>{example}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedConceptData.relatedTerms.length > 0 && (
                  <div className="concept-section">
                    <h4>Related Terms</h4>
                    <div className="related-terms">
                      {selectedConceptData.relatedTerms.map((term) => (
                        <button
                          key={term}
                          className="related-term"
                          onClick={() => showGlossary(term)}
                        >
                          {term.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glossary-list">
              <div className="search-section">
                <input
                  type="text"
                  placeholder="Search concepts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="concepts-grid">
                {filteredConcepts.map(([key, concept]) => (
                  <div
                    key={key}
                    className="concept-card clickable"
                    onClick={() => showGlossary(key)}
                  >
                    <h4 className="concept-term">{concept.term}</h4>
                    <div className={`importance-badge ${concept.importance}`}>
                      {concept.importance}
                    </div>
                    <p className="concept-preview">{concept.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
