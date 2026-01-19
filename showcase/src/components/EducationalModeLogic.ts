/**
 * Pure business logic for Educational Mode
 * This class contains all the educational mode logic without React dependencies,
 * making it easier to test with property-based testing.
 */

import { AnimationController, ProcessStep } from './AnimationController';

/**
 * Educational mode configuration
 */
export interface EducationalModeConfig {
  enabled: boolean;
  speedMultiplier: number;
  stepByStepMode: boolean;
  showTooltips: boolean;
  showExplanations: boolean;
  showGlossary: boolean;
  autoAdvance: boolean;
  pauseBetweenSteps: boolean;
}

/**
 * Step explanation with educational details
 */
export interface StepExplanation {
  title: string;
  description: string;
  whatsHappening: string;
  whyItMatters: string;
  technicalDetails: string;
  relatedConcepts: string[];
  visualCues: string[];
}

/**
 * Concept definition for glossary
 */
export interface ConceptDefinition {
  term: string;
  definition: string;
  technicalDefinition: string;
  examples: string[];
  relatedTerms: string[];
  importance: 'low' | 'medium' | 'high';
}

/**
 * Process completion summary
 */
export interface ProcessSummary {
  processType: 'encoding' | 'reconstruction';
  title: string;
  description: string;
  keyAchievements: string[];
  technicalOutcomes: string[];
  nextSteps: string[];
  learningPoints: string[];
}

/**
 * Educational content
 */
export interface EducationalContent {
  stepExplanations: Map<string, StepExplanation>;
  conceptGlossary: Map<string, ConceptDefinition>;
  processCompletionSummaries: Map<string, ProcessSummary>;
}

/**
 * Educational mode state
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
 * Default educational content
 */
export const createDefaultEducationalContent = (): EducationalContent => ({
  stepExplanations: new Map([
    [
      'file-read',
      {
        title: 'Reading File',
        description: 'Loading file data into memory for processing',
        whatsHappening:
          'The system is reading your file from disk and loading it into memory as binary data.',
        whyItMatters:
          'This is the first step in the BrightChain process. We need the file data in memory to break it into blocks.',
        technicalDetails:
          'The file is read as an ArrayBuffer and converted to a Uint8Array for binary manipulation.',
        relatedConcepts: ['binary-data', 'memory-management', 'file-system'],
        visualCues: [
          'File icon animation',
          'Progress bar showing read progress',
        ],
      },
    ],
    [
      'chunking',
      {
        title: 'Breaking into Chunks',
        description: 'Dividing the file into fixed-size segments',
        whatsHappening:
          'The file data is being divided into equal-sized chunks that will become the foundation for blocks.',
        whyItMatters:
          'Fixed-size chunks ensure uniform block sizes, which is essential for the distributed storage system.',
        technicalDetails:
          'Data is split using array slicing with a predetermined block size (e.g., 1024 bytes).',
        relatedConcepts: [
          'block-size',
          'data-segmentation',
          'distributed-storage',
        ],
        visualCues: [
          'File splitting animation',
          'Chunk size indicators',
          'Visual separators',
        ],
      },
    ],
    [
      'padding',
      {
        title: 'Adding Padding',
        description: 'Adding random data to reach uniform block size',
        whatsHappening:
          'Random data is being added to the last chunk to ensure all blocks are exactly the same size.',
        whyItMatters:
          'Uniform block sizes prevent information leakage about file structure and improve security.',
        technicalDetails:
          'Cryptographically secure random bytes are appended using crypto.getRandomValues().',
        relatedConcepts: ['cryptographic-padding', 'security', 'randomization'],
        visualCues: [
          'Random data visualization',
          'Block size equalization',
          'Padding indicators',
        ],
      },
    ],
    [
      'checksum',
      {
        title: 'Calculating Checksums',
        description: 'Computing SHA-512 hashes for each block',
        whatsHappening:
          'Each block is being processed through a cryptographic hash function to create a unique fingerprint.',
        whyItMatters:
          "Checksums ensure data integrity and allow verification that blocks haven't been corrupted.",
        technicalDetails:
          'SHA-512 hashing algorithm produces a 512-bit hash for each block, providing strong integrity guarantees.',
        relatedConcepts: ['cryptographic-hashing', 'data-integrity', 'sha-512'],
        visualCues: [
          'Hash calculation progress',
          'Checksum generation animation',
          'Mathematical visualization',
        ],
      },
    ],
    [
      'storage',
      {
        title: 'Storing Blocks',
        description: 'Adding blocks to the soup storage system',
        whatsHappening:
          'The processed blocks are being stored in the distributed "soup" where they mix with other file blocks.',
        whyItMatters:
          'The soup storage system provides redundancy and makes it impossible to identify which blocks belong together.',
        technicalDetails:
          'Blocks are stored with their checksums as identifiers in a key-value store.',
        relatedConcepts: ['distributed-storage', 'block-soup', 'redundancy'],
        visualCues: [
          'Soup can creation',
          'Block placement animation',
          'Storage confirmation',
        ],
      },
    ],
    [
      'cbl-creation',
      {
        title: 'Creating CBL',
        description: 'Generating Constituent Block List metadata',
        whatsHappening:
          'A metadata file is being created that contains the list of block IDs needed to reconstruct your file.',
        whyItMatters:
          'The CBL is like a recipe that tells the system which blocks to collect and how to reassemble them.',
        technicalDetails:
          'CBL contains block checksums, order information, and reconstruction parameters in a compact format.',
        relatedConcepts: ['metadata', 'block-list', 'file-reconstruction'],
        visualCues: [
          'Metadata compilation',
          'Block reference collection',
          'CBL structure visualization',
        ],
      },
    ],
    [
      'magnet-url',
      {
        title: 'Generating Magnet URL',
        description: 'Creating a shareable link for file access',
        whatsHappening:
          'A magnet URL is being generated that contains the CBL data and allows others to retrieve your file.',
        whyItMatters:
          'Magnet URLs provide a decentralized way to share files without relying on central servers.',
        technicalDetails:
          'The magnet URL encodes the CBL data using base64 encoding in a standardized URI format.',
        relatedConcepts: ['magnet-links', 'decentralization', 'file-sharing'],
        visualCues: [
          'URL generation',
          'Link creation animation',
          'Sharing indicator',
        ],
      },
    ],
    [
      'cbl-processing',
      {
        title: 'Processing CBL',
        description: 'Reading Constituent Block List metadata',
        whatsHappening:
          'The system is reading the CBL to understand which blocks are needed to reconstruct the file.',
        whyItMatters:
          'The CBL contains all the information needed to find and reassemble the original file from the soup.',
        technicalDetails:
          'CBL data is parsed to extract block checksums, order information, and reconstruction parameters.',
        relatedConcepts: [
          'metadata-parsing',
          'block-list',
          'file-reconstruction',
        ],
        visualCues: [
          'CBL reading animation',
          'Metadata extraction',
          'Block list display',
        ],
      },
    ],
    [
      'block-selection',
      {
        title: 'Selecting Blocks',
        description: 'Identifying required blocks from the soup',
        whatsHappening:
          'The system is searching through the soup to find all the blocks listed in the CBL.',
        whyItMatters:
          'We need to locate every single block to successfully reconstruct the original file.',
        technicalDetails:
          'Block selection uses checksum matching to identify the correct blocks from the storage system.',
        relatedConcepts: [
          'block-identification',
          'checksum-matching',
          'soup-navigation',
        ],
        visualCues: [
          'Block highlighting',
          'Search animation',
          'Selection indicators',
        ],
      },
    ],
    [
      'block-retrieval',
      {
        title: 'Retrieving Blocks',
        description: 'Collecting blocks from storage',
        whatsHappening:
          'The identified blocks are being retrieved from the soup and prepared for reassembly.',
        whyItMatters:
          'All blocks must be successfully retrieved before the file can be reconstructed.',
        technicalDetails:
          'Blocks are fetched from storage using their checksum identifiers and loaded into memory.',
        relatedConcepts: [
          'data-retrieval',
          'block-collection',
          'memory-loading',
        ],
        visualCues: [
          'Block collection animation',
          'Retrieval progress',
          'Assembly preparation',
        ],
      },
    ],
    [
      'validation',
      {
        title: 'Validating Checksums',
        description: 'Verifying block integrity',
        whatsHappening:
          'Each retrieved block is being verified against its expected checksum to ensure data integrity.',
        whyItMatters:
          "Checksum validation ensures that the blocks haven't been corrupted and are safe to use.",
        technicalDetails:
          'SHA-512 hashes are recalculated for each block and compared against the stored checksums.',
        relatedConcepts: [
          'data-integrity',
          'checksum-verification',
          'corruption-detection',
        ],
        visualCues: [
          'Validation progress',
          'Checksum comparison',
          'Integrity indicators',
        ],
      },
    ],
    [
      'reassembly',
      {
        title: 'Reassembling File',
        description: 'Combining blocks and removing padding',
        whatsHappening:
          'The validated blocks are being combined in the correct order and padding is being removed.',
        whyItMatters:
          'This final step reconstructs your original file exactly as it was before encoding.',
        technicalDetails:
          'Blocks are concatenated in order, then padding bytes are stripped to restore the original file.',
        relatedConcepts: [
          'file-reconstruction',
          'padding-removal',
          'data-assembly',
        ],
        visualCues: [
          'Block combination',
          'Padding removal',
          'File reconstruction progress',
        ],
      },
    ],
  ]),

  conceptGlossary: new Map([
    [
      'binary-data',
      {
        term: 'Binary Data',
        definition: 'Information stored as sequences of 0s and 1s',
        technicalDefinition:
          'Data represented in base-2 format, where each bit can be either 0 or 1',
        examples: ['File contents', 'Images', 'Documents', 'Programs'],
        relatedTerms: ['bytes', 'bits', 'encoding'],
        importance: 'high',
      },
    ],
    [
      'block-size',
      {
        term: 'Block Size',
        definition: 'The fixed size that all data blocks must have',
        technicalDefinition:
          'A predetermined number of bytes that standardizes block dimensions for storage efficiency',
        examples: ['1024 bytes', '2048 bytes', '4096 bytes'],
        relatedTerms: ['chunking', 'padding', 'storage-efficiency'],
        importance: 'high',
      },
    ],
    [
      'cryptographic-hashing',
      {
        term: 'Cryptographic Hashing',
        definition:
          'A mathematical function that converts data into a fixed-size string',
        technicalDefinition:
          'A one-way function that produces a deterministic, fixed-length output from variable-length input',
        examples: ['SHA-256', 'SHA-512', 'MD5'],
        relatedTerms: ['checksums', 'data-integrity', 'security'],
        importance: 'high',
      },
    ],
    [
      'distributed-storage',
      {
        term: 'Distributed Storage',
        definition: 'A system where data is stored across multiple locations',
        technicalDefinition:
          'A storage architecture that spreads data across multiple nodes to improve reliability and availability',
        examples: [
          'Cloud storage',
          'Peer-to-peer networks',
          'Blockchain storage',
        ],
        relatedTerms: ['redundancy', 'decentralization', 'fault-tolerance'],
        importance: 'medium',
      },
    ],
    [
      'block-soup',
      {
        term: 'Block Soup',
        definition: 'A mixed collection of data blocks from different files',
        technicalDefinition:
          'A storage system where blocks from multiple files are intermixed to prevent pattern recognition',
        examples: [
          'Mixed file blocks',
          'Randomized storage',
          'Anonymous data pool',
        ],
        relatedTerms: ['privacy', 'security', 'distributed-storage'],
        importance: 'high',
      },
    ],
  ]),

  processCompletionSummaries: new Map([
    [
      'encoding',
      {
        processType: 'encoding',
        title: 'File Encoding Complete! 🎉',
        description:
          'Your file has been successfully broken down into secure, distributed blocks.',
        keyAchievements: [
          'File divided into uniform blocks',
          'Cryptographic checksums generated',
          'Blocks stored in the soup',
          'CBL metadata created',
          'Magnet URL generated for sharing',
        ],
        technicalOutcomes: [
          'Data is now distributed and secure',
          'File integrity is protected by checksums',
          'Original file structure is hidden',
          'Decentralized access is enabled',
        ],
        nextSteps: [
          'Share the magnet URL with others',
          'Store the CBL file safely',
          'Use the CBL to retrieve your file later',
        ],
        learningPoints: [
          'BrightChain breaks files into anonymous blocks',
          'Checksums ensure data integrity',
          'The soup provides security through obscurity',
          'CBL files are the key to reconstruction',
        ],
      },
    ],
    [
      'reconstruction',
      {
        processType: 'reconstruction',
        title: 'File Reconstruction Complete! 🎉',
        description:
          'Your original file has been successfully reassembled from the block soup.',
        keyAchievements: [
          'CBL metadata processed',
          'All required blocks located',
          'Block integrity verified',
          'Original file reconstructed',
          'File ready for download',
        ],
        technicalOutcomes: [
          'Data integrity maintained throughout process',
          'All blocks successfully validated',
          'Original file perfectly restored',
          'No data corruption detected',
        ],
        nextSteps: [
          'Download your reconstructed file',
          'Verify the file contents',
          'Share the magnet URL with others if desired',
        ],
        learningPoints: [
          'BrightChain can perfectly reconstruct files',
          'Checksum validation ensures data integrity',
          'The soup system preserves all data',
          'Decentralized storage is reliable',
        ],
      },
    ],
  ]),
});

/**
 * Pure business logic class for Educational Mode
 * This class contains no React dependencies and can be easily tested
 */
export class EducationalModeLogic {
  private state: EducationalModeState;
  private animationController: AnimationController | null;

  constructor(animationController?: AnimationController | null) {
    this.animationController = animationController || null;
    this.state = {
      config: {
        enabled: false,
        speedMultiplier: 0.5,
        stepByStepMode: true,
        showTooltips: true,
        showExplanations: true,
        showGlossary: true,
        autoAdvance: false,
        pauseBetweenSteps: true,
      },
      content: createDefaultEducationalContent(),
      currentStep: null,
      currentExplanation: null,
      awaitingUserAcknowledgment: false,
      completedSteps: new Set(),
      currentTooltip: null,
      showGlossaryModal: false,
      selectedConcept: null,
    };
  }

  /**
   * Get current state
   */
  getState(): EducationalModeState {
    return { ...this.state };
  }

  /**
   * Enable educational mode
   */
  enableEducationalMode(): void {
    this.state.config.enabled = true;
    if (this.animationController) {
      this.animationController.setSpeed(this.state.config.speedMultiplier);
    }
  }

  /**
   * Disable educational mode
   */
  disableEducationalMode(): void {
    this.state.config.enabled = false;
    if (this.animationController) {
      this.animationController.setSpeed(1.0);
    }
    this.state.awaitingUserAcknowledgment = false;
    this.state.currentExplanation = null;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EducationalModeConfig>): void {
    this.state.config = { ...this.state.config, ...newConfig };

    // Apply speed changes immediately
    if (newConfig.speedMultiplier !== undefined && this.animationController) {
      this.animationController.setSpeed(newConfig.speedMultiplier);
    }
  }

  /**
   * Set speed multiplier
   */
  setSpeedMultiplier(speed: number): void {
    this.updateConfig({ speedMultiplier: speed });
  }

  /**
   * Acknowledge current step
   */
  acknowledgeStep(): void {
    this.state.awaitingUserAcknowledgment = false;
    if (this.state.currentStep) {
      this.state.completedSteps.add(this.state.currentStep.id);
    }
    // Resume animation if paused
    if (this.animationController && this.state.config.enabled) {
      this.animationController.resume();
    }
  }

  /**
   * Skip current step
   */
  skipStep(): void {
    this.state.awaitingUserAcknowledgment = false;
    if (this.state.currentStep) {
      this.state.completedSteps.add(this.state.currentStep.id);
    }
    // Resume animation
    if (this.animationController) {
      this.animationController.resume();
    }
  }

  /**
   * Repeat current step
   */
  repeatStep(): void {
    this.state.awaitingUserAcknowledgment = false;
    // Reset current step and replay
    if (this.animationController && this.state.currentStep) {
      this.animationController.reset();
    }
  }

  /**
   * Show tooltip
   */
  showTooltip(stepId: string, position: { x: number; y: number }): void {
    if (this.state.config.enabled && this.state.config.showTooltips) {
      this.state.currentTooltip = { stepId, position };
    }
  }

  /**
   * Hide tooltip
   */
  hideTooltip(): void {
    this.state.currentTooltip = null;
  }

  /**
   * Show glossary
   */
  showGlossary(concept?: string): void {
    if (this.state.config.enabled && this.state.config.showGlossary) {
      this.state.showGlossaryModal = true;
      this.state.selectedConcept = concept || null;
    }
  }

  /**
   * Hide glossary
   */
  hideGlossary(): void {
    this.state.showGlossaryModal = false;
    this.state.selectedConcept = null;
  }

  /**
   * Show process summary
   */
  showProcessSummary(processType: 'encoding' | 'reconstruction'): void {
    if (this.state.config.enabled) {
      // This would trigger a modal or overlay showing the process summary
      console.log('Show process summary for:', processType);
    }
  }

  /**
   * Handle step start
   */
  onStepStart(step: ProcessStep): void {
    if (!this.state.config.enabled) return;

    this.state.currentStep = step;
    const explanation = this.state.content.stepExplanations.get(step.id);
    this.state.currentExplanation = explanation || null;

    if (
      this.state.config.stepByStepMode &&
      this.state.config.pauseBetweenSteps
    ) {
      this.state.awaitingUserAcknowledgment = true;
      // Pause animation controller
      if (this.animationController) {
        this.animationController.pause();
      }
    }
  }

  /**
   * Handle step complete
   */
  onStepComplete(step: ProcessStep): void {
    if (!this.state.config.enabled) return;

    this.state.completedSteps.add(step.id);

    if (!this.state.config.stepByStepMode || this.state.config.autoAdvance) {
      this.state.currentStep = null;
      this.state.currentExplanation = null;
      this.state.awaitingUserAcknowledgment = false;
    }
  }
}
