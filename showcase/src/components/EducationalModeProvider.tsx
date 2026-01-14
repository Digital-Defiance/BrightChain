import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AnimationController, ProcessStep } from './AnimationController';
import {
  EducationalModeLogic,
  EducationalModeConfig,
  EducationalContent,
  StepExplanation,
  ConceptDefinition,
  ProcessSummary,
} from './EducationalModeLogic';

// Re-export types for backward compatibility
export type {
  EducationalModeConfig,
  EducationalContent,
  StepExplanation,
  ConceptDefinition,
  ProcessSummary,
};

/**
 * Educational mode context state
 */
export interface EducationalModeState {
  config: EducationalModeConfig;
  content: EducationalContent;
  currentStep: ProcessStep | null;
  currentExplanation: StepExplanation | null;
  awaitingUserAcknowledgment: boolean;
  completedSteps: Set<string>;
  currentTooltip: { stepId: string; position: { x: number; y: number } } | null;
  showGlossaryModal: boolean;
  selectedConcept: string | null;
}

/**
 * Educational mode context actions
 */
export interface EducationalModeActions {
  // Configuration
  enableEducationalMode: () => void;
  disableEducationalMode: () => void;
  updateConfig: (config: Partial<EducationalModeConfig>) => void;
  setSpeedMultiplier: (speed: number) => void;
  
  // Step management
  acknowledgeStep: () => void;
  skipStep: () => void;
  repeatStep: () => void;
  
  // Content management
  showTooltip: (stepId: string, position: { x: number; y: number }) => void;
  hideTooltip: () => void;
  showGlossary: (concept?: string) => void;
  hideGlossary: () => void;
  
  // Process management
  showProcessSummary: (processType: 'encoding' | 'reconstruction') => void;
  
  // Internal methods for animation controller integration
  onStepStart: (step: ProcessStep) => void;
  onStepComplete: (step: ProcessStep) => void;
}

/**
 * Educational mode context
 */
export interface EducationalModeContextType extends EducationalModeState, EducationalModeActions {}

const EducationalModeContext = createContext<EducationalModeContextType | null>(null);

/**
 * Educational Mode Provider Props
 */
export interface EducationalModeProviderProps {
  children: ReactNode;
  animationController?: AnimationController | null;
}

/**
 * Educational Mode Provider Component
 * This component wraps the pure EducationalModeLogic class and provides React context
 */
export const EducationalModeProvider: React.FC<EducationalModeProviderProps> = ({
  children,
  animationController
}) => {
  // Create the logic instance
  const [logic] = useState(() => new EducationalModeLogic(animationController));
  
  // Force re-render when state changes
  const [, forceUpdate] = useState({});
  const triggerUpdate = useCallback(() => forceUpdate({}), []);

  // Wrap all logic methods to trigger re-renders
  const enableEducationalMode = useCallback(() => {
    logic.enableEducationalMode();
    triggerUpdate();
  }, [logic, triggerUpdate]);

  const disableEducationalMode = useCallback(() => {
    logic.disableEducationalMode();
    triggerUpdate();
  }, [logic, triggerUpdate]);

  const updateConfig = useCallback((newConfig: Partial<EducationalModeConfig>) => {
    logic.updateConfig(newConfig);
    triggerUpdate();
  }, [logic, triggerUpdate]);

  const setSpeedMultiplier = useCallback((speed: number) => {
    logic.setSpeedMultiplier(speed);
    triggerUpdate();
  }, [logic, triggerUpdate]);

  const acknowledgeStep = useCallback(() => {
    logic.acknowledgeStep();
    triggerUpdate();
  }, [logic, triggerUpdate]);

  const skipStep = useCallback(() => {
    logic.skipStep();
    triggerUpdate();
  }, [logic, triggerUpdate]);

  const repeatStep = useCallback(() => {
    logic.repeatStep();
    triggerUpdate();
  }, [logic, triggerUpdate]);

  const showTooltip = useCallback((stepId: string, position: { x: number; y: number }) => {
    logic.showTooltip(stepId, position);
    triggerUpdate();
  }, [logic, triggerUpdate]);

  const hideTooltip = useCallback(() => {
    logic.hideTooltip();
    triggerUpdate();
  }, [logic, triggerUpdate]);

  const showGlossary = useCallback((concept?: string) => {
    logic.showGlossary(concept);
    triggerUpdate();
  }, [logic, triggerUpdate]);

  const hideGlossary = useCallback(() => {
    logic.hideGlossary();
    triggerUpdate();
  }, [logic, triggerUpdate]);

  const showProcessSummary = useCallback((processType: 'encoding' | 'reconstruction') => {
    logic.showProcessSummary(processType);
    triggerUpdate();
  }, [logic, triggerUpdate]);

  const onStepStart = useCallback((step: ProcessStep) => {
    logic.onStepStart(step);
    triggerUpdate();
  }, [logic, triggerUpdate]);

  const onStepComplete = useCallback((step: ProcessStep) => {
    logic.onStepComplete(step);
    triggerUpdate();
  }, [logic, triggerUpdate]);

  // Set up animation controller event listeners
  useEffect(() => {
    if (!animationController) return;

    animationController.on('step-started', onStepStart);
    animationController.on('step-completed', onStepComplete);

    return () => {
      animationController.off('step-started', onStepStart);
      animationController.off('step-completed', onStepComplete);
    };
  }, [animationController, onStepStart, onStepComplete]);

  // Get current state from logic
  const state = logic.getState();

  const contextValue: EducationalModeContextType = {
    // State
    ...state,
    
    // Actions
    enableEducationalMode,
    disableEducationalMode,
    updateConfig,
    setSpeedMultiplier,
    acknowledgeStep,
    skipStep,
    repeatStep,
    showTooltip,
    hideTooltip,
    showGlossary,
    hideGlossary,
    showProcessSummary,
    onStepStart,
    onStepComplete
  };

  return (
    <EducationalModeContext.Provider value={contextValue}>
      {children}
    </EducationalModeContext.Provider>
  );
};

/**
 * Hook to use educational mode context
 */
export const useEducationalModeContext = (): EducationalModeContextType => {
  const context = useContext(EducationalModeContext);
  if (!context) {
    throw new Error('useEducationalModeContext must be used within an EducationalModeProvider');
  }
  return context;
};