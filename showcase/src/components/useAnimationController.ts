import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimationController, AnimationState, AnimationSequence, ProcessStep, PerformanceMetrics } from './AnimationController';

/**
 * React hook for using AnimationController
 * Provides state management and event handling for animations
 */
export function useAnimationController() {
  const controllerRef = useRef<AnimationController | null>(null);
  const [animationState, setAnimationState] = useState<AnimationState>({
    isPlaying: false,
    currentFrame: 0,
    totalFrames: 0,
    speed: 1.0,
    direction: 'forward'
  });
  const [currentSequence, setCurrentSequence] = useState<AnimationSequence | null>(null);
  const [currentStep, setCurrentStep] = useState<ProcessStep | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    frameRate: 0,
    averageFrameTime: 0,
    droppedFrames: 0,
    memoryUsage: 0,
    sequenceCount: 0,
    errorCount: 0
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize controller
  useEffect(() => {
    if (!controllerRef.current) {
      controllerRef.current = new AnimationController();
      setIsInitialized(true);

      // Set up event listeners
      const controller = controllerRef.current;

      controller.on('sequence-started', ({ sequence }) => {
        setCurrentSequence(sequence);
        setAnimationState(controller.getState());
      });

      controller.on('sequence-completed', ({ sequence }) => {
        setCurrentSequence(null);
        setCurrentStep(null);
        setAnimationState(controller.getState());
      });

      controller.on('sequence-error', ({ sequence, error }) => {
        console.error('Animation sequence error:', error);
        setCurrentSequence(null);
        setCurrentStep(null);
        setAnimationState(controller.getState());
      });

      controller.on('step-started', ({ step }) => {
        setCurrentStep(step);
      });

      controller.on('step-completed', ({ step }) => {
        setCurrentStep(null);
      });

      controller.on('speed-changed', ({ speed }) => {
        setAnimationState(prev => ({ ...prev, speed }));
      });

      controller.on('animation-paused', () => {
        setAnimationState(controller.getState());
      });

      controller.on('animation-resumed', () => {
        setAnimationState(controller.getState());
      });

      controller.on('animation-reset', () => {
        setAnimationState(controller.getState());
        setCurrentStep(null);
      });
    }

    return () => {
      // Cleanup on unmount
      if (controllerRef.current) {
        controllerRef.current.reset();
      }
    };
  }, []);

  // Performance monitoring
  useEffect(() => {
    if (!controllerRef.current) return;

    const updateMetrics = () => {
      if (controllerRef.current) {
        setPerformanceMetrics(controllerRef.current.getPerformanceMetrics());
      }
    };

    const interval = setInterval(updateMetrics, 1000); // Update every second
    return () => clearInterval(interval);
  }, [isInitialized]);

  // Animation methods
  const playEncodingAnimation = useCallback(async (file: File) => {
    if (!controllerRef.current) {
      throw new Error('AnimationController not initialized');
    }
    return controllerRef.current.playEncodingAnimation(file);
  }, []);

  const playReconstructionAnimation = useCallback(async (receipt: any) => {
    if (!controllerRef.current) {
      throw new Error('AnimationController not initialized');
    }
    return controllerRef.current.playReconstructionAnimation(receipt);
  }, []);

  const setSpeed = useCallback((multiplier: number) => {
    if (!controllerRef.current) return;
    controllerRef.current.setSpeed(multiplier);
  }, []);

  const pause = useCallback(() => {
    if (!controllerRef.current) return;
    controllerRef.current.pause();
  }, []);

  const resume = useCallback(() => {
    if (!controllerRef.current) return;
    controllerRef.current.resume();
  }, []);

  const reset = useCallback(() => {
    if (!controllerRef.current) return;
    controllerRef.current.reset();
  }, []);

  return {
    // State
    animationState,
    currentSequence,
    currentStep,
    performanceMetrics,
    isInitialized,
    
    // Methods
    playEncodingAnimation,
    playReconstructionAnimation,
    setSpeed,
    pause,
    resume,
    reset,
    
    // Direct controller access for advanced usage
    controller: controllerRef.current
  };
}

/**
 * Hook for monitoring animation performance
 */
export function useAnimationPerformance(controller: AnimationController | null) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    frameRate: 0,
    averageFrameTime: 0,
    droppedFrames: 0,
    memoryUsage: 0,
    sequenceCount: 0,
    errorCount: 0
  });

  useEffect(() => {
    if (!controller) return;

    const updateMetrics = () => {
      setMetrics(controller.getPerformanceMetrics());
    };

    // Update metrics every second
    const interval = setInterval(updateMetrics, 1000);
    
    // Also update on animation events
    controller.on('step-completed', updateMetrics);
    controller.on('sequence-completed', updateMetrics);

    return () => {
      clearInterval(interval);
      controller.off('step-completed', updateMetrics);
      controller.off('sequence-completed', updateMetrics);
    };
  }, [controller]);

  return metrics;
}

/**
 * Hook for educational mode integration
 */
export function useEducationalMode(controller: AnimationController | null) {
  const [isEducationalMode, setIsEducationalMode] = useState(false);
  const [stepExplanations, setStepExplanations] = useState<Map<string, string>>(new Map());

  const enableEducationalMode = useCallback(() => {
    setIsEducationalMode(true);
    if (controller) {
      // Slow down animations for educational purposes
      controller.setSpeed(0.5);
    }
  }, [controller]);

  const disableEducationalMode = useCallback(() => {
    setIsEducationalMode(false);
    if (controller) {
      // Return to normal speed
      controller.setSpeed(1.0);
    }
  }, [controller]);

  const addStepExplanation = useCallback((stepId: string, explanation: string) => {
    setStepExplanations(prev => new Map(prev).set(stepId, explanation));
  }, []);

  const getStepExplanation = useCallback((stepId: string) => {
    return stepExplanations.get(stepId);
  }, [stepExplanations]);

  return {
    isEducationalMode,
    enableEducationalMode,
    disableEducationalMode,
    addStepExplanation,
    getStepExplanation
  };
}