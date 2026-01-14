import { describe, it, expect } from 'vitest';
import { EducationalModeLogic } from './EducationalModeLogic';
import { AnimationController } from './AnimationController';

/**
 * Property Test for Educational Mode Behavior
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * Property 4: Educational Mode Behavior
 * For any process when educational mode is enabled, the animation engine should slow down animations,
 * display explanatory content, provide tooltips for technical concepts, and show completion summaries.
 */

describe('Educational Mode Behavior Property Tests', () => {

  /**
   * Property: Educational mode slows down animations
   * Requirement 3.1: WHEN educational mode is enabled, THE Animation_Engine SHALL slow down all processes
   */
  it('property: educational mode slows down animations to configured speed', () => {
    // Test multiple speed values
    const speedValues = [0.1, 0.25, 0.5, 0.75, 1.0];

    speedValues.forEach((speedMultiplier) => {
      const controller = new AnimationController();
      const logic = new EducationalModeLogic(controller);

      // Configure speed multiplier
      logic.updateConfig({ speedMultiplier });

      // Enable educational mode
      logic.enableEducationalMode();

      // Verify educational mode is enabled
      const state = logic.getState();
      expect(state.config.enabled).toBe(true);

      // Verify speed is set to the configured multiplier
      expect(state.config.speedMultiplier).toBe(speedMultiplier);

      // Verify animation controller speed is updated
      const controllerState = controller.getState();
      expect(controllerState.speed).toBe(speedMultiplier);
    });
  });

  /**
   * Property: Educational mode displays explanatory content for each step
   * Requirement 3.2: WHEN each step begins, THE Animation_Engine SHALL display explanatory text
   */
  it('property: educational mode provides explanations for all process steps', () => {
    const stepIds = [
      'file-read',
      'chunking',
      'padding',
      'checksum',
      'storage',
      'cbl-creation',
      'magnet-url',
      'cbl-processing',
      'block-selection',
      'block-retrieval',
      'validation',
      'reassembly',
    ];

    stepIds.forEach((stepId) => {
      const controller = new AnimationController();
      const logic = new EducationalModeLogic(controller);

      // Enable educational mode
      logic.enableEducationalMode();

      // Verify explanation exists for the step
      const state = logic.getState();
      const explanation = state.content.stepExplanations.get(stepId);
      expect(explanation).toBeDefined();

      // Verify explanation has required fields
      if (explanation) {
        expect(explanation.title).toBeTruthy();
        expect(explanation.description).toBeTruthy();
        expect(explanation.whatsHappening).toBeTruthy();
        expect(explanation.whyItMatters).toBeTruthy();
        expect(explanation.technicalDetails).toBeTruthy();
        expect(Array.isArray(explanation.relatedConcepts)).toBe(true);
        expect(Array.isArray(explanation.visualCues)).toBe(true);
      }
    });
  });

  /**
   * Property: Educational mode provides tooltips for technical concepts
   * Requirement 3.3: WHEN technical concepts are introduced, THE Animation_Engine SHALL provide tooltips
   */
  it('property: educational mode provides glossary definitions for all concepts', () => {
    const conceptKeys = [
      'binary-data',
      'block-size',
      'cryptographic-hashing',
      'distributed-storage',
      'block-soup',
    ];

    conceptKeys.forEach((conceptKey) => {
      const controller = new AnimationController();
      const logic = new EducationalModeLogic(controller);

      // Enable educational mode
      logic.enableEducationalMode();

      // Verify concept definition exists
      const state = logic.getState();
      const concept = state.content.conceptGlossary.get(conceptKey);
      expect(concept).toBeDefined();

      // Verify concept has required fields
      if (concept) {
        expect(concept.term).toBeTruthy();
        expect(concept.definition).toBeTruthy();
        expect(concept.technicalDefinition).toBeTruthy();
        expect(Array.isArray(concept.examples)).toBe(true);
        expect(Array.isArray(concept.relatedTerms)).toBe(true);
        expect(['low', 'medium', 'high']).toContain(concept.importance);
      }
    });
  });

  /**
   * Property: Educational mode shows completion summaries
   * Requirement 3.5: WHEN the process completes, THE Animation_Engine SHALL provide a summary
   */
  it('property: educational mode provides completion summaries for all process types', () => {
    const processTypes: Array<'encoding' | 'reconstruction'> = ['encoding', 'reconstruction'];

    processTypes.forEach((processType) => {
      const controller = new AnimationController();
      const logic = new EducationalModeLogic(controller);

      // Enable educational mode
      logic.enableEducationalMode();

      // Verify summary exists for process type
      const state = logic.getState();
      const summary = state.content.processCompletionSummaries.get(processType);
      expect(summary).toBeDefined();

      // Verify summary has required fields
      if (summary) {
        expect(summary.processType).toBe(processType);
        expect(summary.title).toBeTruthy();
        expect(summary.description).toBeTruthy();
        expect(Array.isArray(summary.keyAchievements)).toBe(true);
        expect(summary.keyAchievements.length).toBeGreaterThan(0);
        expect(Array.isArray(summary.technicalOutcomes)).toBe(true);
        expect(summary.technicalOutcomes.length).toBeGreaterThan(0);
        expect(Array.isArray(summary.nextSteps)).toBe(true);
        expect(summary.nextSteps.length).toBeGreaterThan(0);
        expect(Array.isArray(summary.learningPoints)).toBe(true);
        expect(summary.learningPoints.length).toBeGreaterThan(0);
      }
    });
  });

  /**
   * Property: Step-by-step mode pauses between steps and requires acknowledgment
   * Requirement 3.1, 3.2: Educational mode allows detailed observation with user acknowledgment
   */
  it('property: step-by-step mode pauses and waits for user acknowledgment', () => {
    const configs = [
      { stepByStepMode: true, pauseBetweenSteps: true, autoAdvance: false },
      { stepByStepMode: false, pauseBetweenSteps: false, autoAdvance: true },
      { stepByStepMode: true, pauseBetweenSteps: false, autoAdvance: false },
    ];

    configs.forEach((config) => {
      const controller = new AnimationController();
      const logic = new EducationalModeLogic(controller);

      // Enable educational mode with config
      logic.enableEducationalMode();
      logic.updateConfig(config);

      // Simulate step start
      const mockStep = {
        id: 'test-step',
        name: 'Test Step',
        description: 'Test description',
        status: 'active' as const,
        duration: 1000,
      };

      logic.onStepStart(mockStep);

      // Verify behavior based on configuration
      const state = logic.getState();
      if (config.stepByStepMode && config.pauseBetweenSteps) {
        // Should be awaiting user acknowledgment
        expect(state.awaitingUserAcknowledgment).toBe(true);
        expect(state.currentStep).toEqual(mockStep);

        // Acknowledge step
        logic.acknowledgeStep();

        // Should no longer be awaiting
        const newState = logic.getState();
        expect(newState.awaitingUserAcknowledgment).toBe(false);
      } else if (config.autoAdvance) {
        // Should not pause for acknowledgment
        expect(state.awaitingUserAcknowledgment).toBe(false);
      }
    });
  });

  /**
   * Property: Educational mode configuration is persistent and consistent
   * Requirement 3.1, 3.3, 3.4: Configuration controls all educational features
   */
  it('property: educational mode configuration controls all features consistently', () => {
    const configs = [
      {
        enabled: true,
        speedMultiplier: 0.5,
        stepByStepMode: true,
        showTooltips: true,
        showExplanations: true,
        showGlossary: true,
        autoAdvance: false,
        pauseBetweenSteps: true,
      },
      {
        enabled: false,
        speedMultiplier: 1.0,
        stepByStepMode: false,
        showTooltips: false,
        showExplanations: false,
        showGlossary: false,
        autoAdvance: true,
        pauseBetweenSteps: false,
      },
    ];

    configs.forEach((config) => {
      const controller = new AnimationController();
      const logic = new EducationalModeLogic(controller);

      // Update configuration
      if (config.enabled) {
        logic.enableEducationalMode();
      }
      logic.updateConfig(config);

      // Verify all configuration values are applied
      const state = logic.getState();
      expect(state.config.enabled).toBe(config.enabled);
      expect(state.config.speedMultiplier).toBe(config.speedMultiplier);
      expect(state.config.stepByStepMode).toBe(config.stepByStepMode);
      expect(state.config.showTooltips).toBe(config.showTooltips);
      expect(state.config.showExplanations).toBe(config.showExplanations);
      expect(state.config.showGlossary).toBe(config.showGlossary);
      expect(state.config.autoAdvance).toBe(config.autoAdvance);
      expect(state.config.pauseBetweenSteps).toBe(config.pauseBetweenSteps);
    });
  });

  /**
   * Property: Disabling educational mode restores normal speed
   * Requirement 3.1: Educational mode can be toggled on/off
   */
  it('property: disabling educational mode restores normal animation speed', () => {
    const educationalSpeeds = [0.1, 0.5, 0.75];

    educationalSpeeds.forEach((educationalSpeed) => {
      const controller = new AnimationController();
      const logic = new EducationalModeLogic(controller);

      // Enable educational mode with custom speed
      logic.updateConfig({ speedMultiplier: educationalSpeed });
      logic.enableEducationalMode();

      // Verify educational speed is applied
      expect(controller.getState().speed).toBe(educationalSpeed);

      // Disable educational mode
      logic.disableEducationalMode();

      // Verify normal speed is restored
      const state = logic.getState();
      expect(state.config.enabled).toBe(false);
      expect(controller.getState().speed).toBe(1.0);
    });
  });

  /**
   * Property: Educational content is comprehensive and complete
   * Requirement 3.2, 3.3, 3.4: All educational content is available
   */
  it('property: educational content covers all process steps and concepts', () => {
    const controller = new AnimationController();
    const logic = new EducationalModeLogic(controller);

    logic.enableEducationalMode();

    const state = logic.getState();

    // Verify step explanations exist for all common steps
    const requiredSteps = [
      'file-read',
      'chunking',
      'padding',
      'checksum',
      'storage',
      'cbl-creation',
      'magnet-url',
    ];

    requiredSteps.forEach((stepId) => {
      const explanation = state.content.stepExplanations.get(stepId);
      expect(explanation).toBeDefined();
      expect(explanation?.title).toBeTruthy();
      expect(explanation?.whatsHappening).toBeTruthy();
      expect(explanation?.whyItMatters).toBeTruthy();
      expect(explanation?.technicalDetails).toBeTruthy();
    });

    // Verify glossary has essential concepts
    const requiredConcepts = [
      'binary-data',
      'block-size',
      'cryptographic-hashing',
      'distributed-storage',
      'block-soup',
    ];

    requiredConcepts.forEach((conceptKey) => {
      const concept = state.content.conceptGlossary.get(conceptKey);
      expect(concept).toBeDefined();
      expect(concept?.term).toBeTruthy();
      expect(concept?.definition).toBeTruthy();
      expect(concept?.technicalDefinition).toBeTruthy();
    });

    // Verify summaries exist for both process types
    expect(state.content.processCompletionSummaries.get('encoding')).toBeDefined();
    expect(state.content.processCompletionSummaries.get('reconstruction')).toBeDefined();
  });
});
