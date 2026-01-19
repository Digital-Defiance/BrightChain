import React, { useCallback, useEffect, useState } from 'react';
import './InteractiveTutorial.css';

/**
 * Tutorial step interface
 */
export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // CSS selector for element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'upload' | 'wait' | 'observe';
  actionDescription?: string;
  completionCriteria?: () => boolean;
  skippable: boolean;
}

/**
 * Tutorial props
 */
export interface InteractiveTutorialProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Default tutorial steps
 */
const defaultTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to BrightChain! 👋',
    description:
      "This interactive tutorial will guide you through the BrightChain demo. You'll learn how to encode files, explore the block soup, and reconstruct files from blocks.",
    position: 'center',
    skippable: true,
  },
  {
    id: 'file-upload',
    title: 'Upload a File',
    description:
      'Start by uploading a file to encode. Click the file upload area or drag and drop a file. Try a small text file for your first time!',
    targetElement: '.file-upload-zone',
    position: 'bottom',
    action: 'upload',
    actionDescription: 'Upload a file to continue',
    skippable: false,
  },
  {
    id: 'encoding-process',
    title: 'Watch the Encoding',
    description:
      'Your file is being broken down into blocks! Watch as it goes through chunking, padding, checksum calculation, and storage. Each step is crucial for the BrightChain process.',
    targetElement: '.encoding-animation',
    position: 'right',
    action: 'observe',
    actionDescription: 'Observe the encoding animation',
    skippable: false,
  },
  {
    id: 'block-soup',
    title: 'Explore the Block Soup',
    description:
      'These colorful "soup cans" represent your file blocks mixed with others. Hover over them to see details, or click to inspect individual blocks.',
    targetElement: '.soup-visualization',
    position: 'top',
    action: 'click',
    actionDescription: 'Click on a soup can to inspect it',
    skippable: true,
  },
  {
    id: 'cbl-magnet',
    title: 'Your Magnet URL',
    description:
      'This magnet URL contains the "recipe" (CBL) to reconstruct your file. Save it! You\'ll need it to retrieve your file from the soup.',
    targetElement: '.magnet-url-display',
    position: 'bottom',
    action: 'observe',
    actionDescription: 'Review your magnet URL',
    skippable: true,
  },
  {
    id: 'reconstruction',
    title: 'Reconstruct Your File',
    description:
      "Now let's get your file back! Paste the magnet URL or upload the CBL file to start reconstruction. Watch as blocks are collected and reassembled.",
    targetElement: '.reconstruction-zone',
    position: 'bottom',
    action: 'click',
    actionDescription: 'Start file reconstruction',
    skippable: true,
  },
  {
    id: 'educational-mode',
    title: 'Try Educational Mode',
    description:
      'Want to learn more? Enable Educational Mode to slow down animations, see detailed explanations, and explore technical concepts at your own pace.',
    targetElement: '.educational-mode-toggle',
    position: 'left',
    action: 'click',
    actionDescription: 'Toggle educational mode',
    skippable: true,
  },
  {
    id: 'completion',
    title: 'Tutorial Complete! 🎉',
    description:
      "You've learned the basics of BrightChain! Feel free to experiment with different files, explore the help system, or dive deeper into educational mode. Happy exploring!",
    position: 'center',
    skippable: true,
  },
];

/**
 * Interactive Tutorial Component
 */
export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightedElement, setHighlightedElement] =
    useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [completed, setCompleted] = useState(false);

  const currentStep = defaultTutorialSteps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / defaultTutorialSteps.length) * 100;

  // Highlight target element
  useEffect(() => {
    if (!visible || !currentStep.targetElement) {
      setHighlightedElement(null);
      return;
    }

    const element = document.querySelector(
      currentStep.targetElement,
    ) as HTMLElement;
    if (element) {
      setHighlightedElement(element);

      // Calculate tooltip position
      const rect = element.getBoundingClientRect();
      let x = rect.left + rect.width / 2;
      let y = rect.top + rect.height / 2;

      switch (currentStep.position) {
        case 'top':
          y = rect.top - 20;
          break;
        case 'bottom':
          y = rect.bottom + 20;
          break;
        case 'left':
          x = rect.left - 20;
          break;
        case 'right':
          x = rect.right + 20;
          break;
        case 'center':
          x = window.innerWidth / 2;
          y = window.innerHeight / 2;
          break;
      }

      setTooltipPosition({ x, y });

      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [visible, currentStep, currentStepIndex]);

  // Check completion criteria
  useEffect(() => {
    if (!visible || !currentStep.completionCriteria) return;

    const checkCompletion = () => {
      if (currentStep.completionCriteria && currentStep.completionCriteria()) {
        handleNext();
      }
    };

    const interval = setInterval(checkCompletion, 500);
    return () => clearInterval(interval);
  }, [visible, currentStep]);

  const handleNext = useCallback(() => {
    if (currentStepIndex < defaultTutorialSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setCompleted(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  }, [currentStepIndex, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  if (!visible) return null;

  return (
    <>
      {/* Overlay with highlight cutout */}
      <div className="tutorial-overlay">
        {highlightedElement && (
          <div
            className="tutorial-highlight"
            style={{
              top: highlightedElement.getBoundingClientRect().top - 8,
              left: highlightedElement.getBoundingClientRect().left - 8,
              width: highlightedElement.getBoundingClientRect().width + 16,
              height: highlightedElement.getBoundingClientRect().height + 16,
            }}
          />
        )}
      </div>

      {/* Tutorial tooltip */}
      <div
        className={`tutorial-tooltip ${currentStep.position}`}
        style={{
          left: currentStep.position === 'center' ? '50%' : tooltipPosition.x,
          top: currentStep.position === 'center' ? '50%' : tooltipPosition.y,
          transform:
            currentStep.position === 'center'
              ? 'translate(-50%, -50%)'
              : 'none',
        }}
      >
        <div className="tutorial-header">
          <div className="tutorial-step-indicator">
            Step {currentStepIndex + 1} of {defaultTutorialSteps.length}
          </div>
          <div className="tutorial-progress-bar">
            <div
              className="tutorial-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="tutorial-content">
          <h3 className="tutorial-title">{currentStep.title}</h3>
          <p className="tutorial-description">{currentStep.description}</p>

          {currentStep.actionDescription && (
            <div className="tutorial-action">
              <span className="tutorial-action-icon">👉</span>
              <span className="tutorial-action-text">
                {currentStep.actionDescription}
              </span>
            </div>
          )}
        </div>

        <div className="tutorial-actions">
          {currentStepIndex > 0 && (
            <button
              className="tutorial-button secondary"
              onClick={handlePrevious}
            >
              ← Previous
            </button>
          )}

          {currentStep.skippable && (
            <button className="tutorial-button tertiary" onClick={handleSkip}>
              Skip Tutorial
            </button>
          )}

          <button className="tutorial-button primary" onClick={handleNext}>
            {currentStepIndex === defaultTutorialSteps.length - 1
              ? 'Finish'
              : 'Next →'}
          </button>
        </div>
      </div>

      {/* Completion celebration */}
      {completed && (
        <div className="tutorial-completion">
          <div className="tutorial-completion-content">
            <div className="tutorial-completion-icon">🎉</div>
            <h2>Tutorial Complete!</h2>
            <p>You're ready to explore BrightChain on your own.</p>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Tutorial Progress Tracker Component
 */
export interface TutorialProgressProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
}

export const TutorialProgress: React.FC<TutorialProgressProps> = ({
  currentStep,
  totalSteps,
  onStepClick,
}) => {
  return (
    <div className="tutorial-progress-tracker">
      {Array.from({ length: totalSteps }, (_, i) => (
        <button
          key={i}
          className={`tutorial-progress-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
          onClick={() => onStepClick && onStepClick(i)}
          aria-label={`Go to step ${i + 1}`}
        />
      ))}
    </div>
  );
};

/**
 * Tutorial Launcher Component
 */
export interface TutorialLauncherProps {
  onStart: () => void;
  className?: string;
}

export const TutorialLauncher: React.FC<TutorialLauncherProps> = ({
  onStart,
  className = '',
}) => {
  return (
    <button
      className={`tutorial-launcher ${className}`}
      onClick={onStart}
      title="Start Interactive Tutorial"
    >
      🎓 Start Tutorial
    </button>
  );
};
