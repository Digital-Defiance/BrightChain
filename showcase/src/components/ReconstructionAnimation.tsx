/* eslint-disable @nx/enforce-module-boundaries */
import { FileReceipt } from '@brightchain/brightchain-lib';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';
import './ReconstructionAnimation.css';

export interface ReconstructionAnimationProps {
  receipt: FileReceipt;
  blockSize: number;
  isEducationalMode?: boolean;
  animationSpeed?: number;
  onCBLProcessed?: (blockIds: string[]) => void;
  onBlockSelected?: (blockId: string, index: number) => void;
  onBlockRetrieved?: (blockId: string, index: number) => void;
  onChecksumValidated?: (blockId: string, isValid: boolean) => void;
  onFileReassembled?: (fileData: Uint8Array) => void;
  onAnimationComplete?: () => void;
}

interface AnimationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'complete';
  progress: number;
}

interface ReconstructionBlock {
  id: string;
  index: number;
  checksum: string;
  size: number;
  color: string;
  position: { x: number; y: number };
  status:
    | 'pending'
    | 'selecting'
    | 'selected'
    | 'retrieving'
    | 'retrieved'
    | 'validating'
    | 'validated'
    | 'error';
  isValid?: boolean;
}

export const ReconstructionAnimation: React.FC<
  ReconstructionAnimationProps
> = ({
  receipt,
  blockSize,
  isEducationalMode = false,
  animationSpeed = 1,
  onCBLProcessed,
  onBlockSelected,
  onBlockRetrieved,
  onChecksumValidated,
  onFileReassembled,
  onAnimationComplete,
}) => {
  const { t } = useShowcaseI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [blocks, setBlocks] = useState<ReconstructionBlock[]>([]);
  const [cblData, setCBLData] = useState<string[]>([]);
  const [reassemblyProgress, setReassemblyProgress] = useState(0);
  const [downloadReady, setDownloadReady] = useState(false);
  const hasStartedRef = useRef(false);
  const [animationSteps, setAnimationSteps] = useState<AnimationStep[]>([
    {
      id: 'cbl-processing',
      name: t(ShowcaseStrings.Recon_Step_ProcessCBL),
      description: t(ShowcaseStrings.Recon_Step_ProcessCBL_Desc),
      status: 'pending',
      progress: 0,
    },
    {
      id: 'block-selection',
      name: t(ShowcaseStrings.Recon_Step_SelectBlocks),
      description: t(ShowcaseStrings.Recon_Step_SelectBlocks_Desc),
      status: 'pending',
      progress: 0,
    },
    {
      id: 'block-retrieval',
      name: t(ShowcaseStrings.Recon_Step_RetrieveBlocks),
      description: t(ShowcaseStrings.Recon_Step_RetrieveBlocks_Desc),
      status: 'pending',
      progress: 0,
    },
    {
      id: 'validation',
      name: t(ShowcaseStrings.Recon_Step_ValidateChecksums),
      description: t(ShowcaseStrings.Recon_Step_ValidateChecksums_Desc),
      status: 'pending',
      progress: 0,
    },
    {
      id: 'reassembly',
      name: t(ShowcaseStrings.Recon_Step_Reassemble),
      description: t(ShowcaseStrings.Recon_Step_Reassemble_Desc),
      status: 'pending',
      progress: 0,
    },
    {
      id: 'download-ready',
      name: t(ShowcaseStrings.Recon_Step_DownloadReady),
      description: t(ShowcaseStrings.Recon_Step_DownloadReady_Desc),
      status: 'pending',
      progress: 0,
    },
  ]);

  // Generate a deterministic color for a block based on its index
  const generateBlockColor = useCallback((index: number): string => {
    const hue = (index * 137.508) % 360; // Golden angle approximation
    return `hsl(${hue}, 70%, 60%)`;
  }, []);

  // Calculate block positions in a grid layout
  const calculateBlockPosition = useCallback(
    (index: number, total: number): { x: number; y: number } => {
      const cols = Math.ceil(Math.sqrt(total));
      const row = Math.floor(index / cols);
      const col = index % cols;
      return {
        x: col * 80 + 40,
        y: row * 100 + 50,
      };
    },
    [],
  );

  // Step 1: Process CBL
  const processCBL = useCallback(async () => {
    setCurrentStep(0);
    updateStepStatus(0, 'active', 0);

    try {
      // Extract block IDs from CBL
      const blockIds: string[] = [];
      for (let i = 0; i < receipt.blockCount; i++) {
        blockIds.push(`block-${i}-${receipt.id}`);
      }

      setCBLData(blockIds);

      // Simulate CBL processing progress
      for (let progress = 0; progress <= 100; progress += 20) {
        updateStepStatus(0, 'active', progress);
        await delay(100 / animationSpeed);
      }

      // Call callback if provided
      if (onCBLProcessed) {
        onCBLProcessed(blockIds);
      }

      updateStepStatus(0, 'complete', 100);
      return blockIds;
    } catch (error) {
      console.error('Failed to process CBL:', error);
      throw error;
    }
  }, [receipt, animationSpeed, onCBLProcessed]);

  // Step 2: Select blocks
  const selectBlocks = useCallback(
    async (blockIds: string[]) => {
      setCurrentStep(1);
      updateStepStatus(1, 'active', 0);

      // Clear any previous blocks before starting
      setBlocks([]);

      const newBlocks: ReconstructionBlock[] = [];

      for (let i = 0; i < blockIds.length; i++) {
        const blockId = blockIds[i];

        const block: ReconstructionBlock = {
          id: blockId,
          index: i,
          checksum: `checksum-${i}`,
          size: blockSize,
          color: generateBlockColor(i),
          position: calculateBlockPosition(i, blockIds.length),
          status: 'selecting',
        };

        newBlocks.push(block);
        // Replace entire array with newBlocks so far to avoid duplicates
        setBlocks([...newBlocks]);

        // Call callback if provided
        if (onBlockSelected) {
          onBlockSelected(blockId, i);
        }

        // Update progress
        const progress = ((i + 1) / blockIds.length) * 100;
        updateStepStatus(1, 'active', progress);

        // Educational mode: slower animation
        const selectionDelay = isEducationalMode ? 400 : 150;
        await delay(selectionDelay / animationSpeed);

        // Update block status to selected
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId ? { ...b, status: 'selected' } : b,
          ),
        );
      }

      updateStepStatus(1, 'complete', 100);
      return newBlocks;
    },
    [
      blockSize,
      generateBlockColor,
      calculateBlockPosition,
      onBlockSelected,
      isEducationalMode,
      animationSpeed,
    ],
  );

  // Step 3: Retrieve blocks
  const retrieveBlocks = useCallback(
    async (blocksToRetrieve: ReconstructionBlock[]) => {
      setCurrentStep(2);
      updateStepStatus(2, 'active', 0);

      for (let i = 0; i < blocksToRetrieve.length; i++) {
        const block = blocksToRetrieve[i];

        // Update block status to retrieving
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === block.id ? { ...b, status: 'retrieving' } : b,
          ),
        );

        // Simulate retrieval delay
        const retrievalDelay = isEducationalMode ? 300 : 100;
        await delay(retrievalDelay / animationSpeed);

        // Update block status to retrieved
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === block.id ? { ...b, status: 'retrieved' } : b,
          ),
        );

        // Call callback if provided
        if (onBlockRetrieved) {
          onBlockRetrieved(block.id, i);
        }

        // Update progress
        const progress = ((i + 1) / blocksToRetrieve.length) * 100;
        updateStepStatus(2, 'active', progress);
      }

      updateStepStatus(2, 'complete', 100);
    },
    [onBlockRetrieved, isEducationalMode, animationSpeed],
  );

  // Step 4: Validate checksums
  const validateChecksums = useCallback(
    async (blocksToValidate: ReconstructionBlock[]) => {
      setCurrentStep(3);
      updateStepStatus(3, 'active', 0);

      for (let i = 0; i < blocksToValidate.length; i++) {
        const block = blocksToValidate[i];

        // Update block status to validating
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === block.id ? { ...b, status: 'validating' } : b,
          ),
        );

        // Simulate checksum validation
        const validationDelay = isEducationalMode ? 500 : 120;
        await delay(validationDelay / animationSpeed);

        // All blocks are valid in this demo
        const isValid = true;

        // Update block status to validated
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === block.id ? { ...b, status: 'validated', isValid } : b,
          ),
        );

        // Call callback if provided
        if (onChecksumValidated) {
          onChecksumValidated(block.id, isValid);
        }

        // Update progress
        const progress = ((i + 1) / blocksToValidate.length) * 100;
        updateStepStatus(3, 'active', progress);
      }

      updateStepStatus(3, 'complete', 100);
    },
    [onChecksumValidated, isEducationalMode, animationSpeed],
  );

  // Step 5: Reassemble file
  const reassembleFile = useCallback(async () => {
    setCurrentStep(4);
    updateStepStatus(4, 'active', 0);

    // Simulate file reassembly progress
    for (let progress = 0; progress <= 100; progress += 10) {
      setReassemblyProgress(progress);
      updateStepStatus(4, 'active', progress);
      await delay(100 / animationSpeed);
    }

    // Create mock file data
    const fileData = new Uint8Array(receipt.originalSize);

    // Call callback if provided
    if (onFileReassembled) {
      onFileReassembled(fileData);
    }

    updateStepStatus(4, 'complete', 100);
    return fileData;
  }, [receipt.originalSize, onFileReassembled, animationSpeed]);

  // Step 6: Download ready
  const showDownloadReady = useCallback(async () => {
    setCurrentStep(5);
    updateStepStatus(5, 'active', 0);

    // Simulate download ready animation
    for (let progress = 0; progress <= 100; progress += 25) {
      updateStepStatus(5, 'active', progress);
      await delay(50 / animationSpeed);
    }

    setDownloadReady(true);
    updateStepStatus(5, 'complete', 100);
  }, [animationSpeed]);

  // Helper function to update step status
  const updateStepStatus = useCallback(
    (
      stepIndex: number,
      status: 'pending' | 'active' | 'complete',
      progress: number,
    ) => {
      setAnimationSteps((prev) =>
        prev.map((step, index) =>
          index === stepIndex ? { ...step, status, progress } : step,
        ),
      );
    },
    [],
  );

  // Helper function for delays
  const delay = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  // Start the animation sequence
  const startAnimation = useCallback(async () => {
    try {
      const blockIds = await processCBL();
      const selectedBlocks = await selectBlocks(blockIds);
      await retrieveBlocks(selectedBlocks);
      await validateChecksums(selectedBlocks);
      await reassembleFile();
      await showDownloadReady();

      // Animation complete
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    } catch (error) {
      console.error('Reconstruction animation sequence failed:', error);
    }
  }, [
    processCBL,
    selectBlocks,
    retrieveBlocks,
    validateChecksums,
    reassembleFile,
    showDownloadReady,
    onAnimationComplete,
  ]);

  // Start animation when component mounts
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    startAnimation();
  }, [startAnimation]);

  return (
    <div className="reconstruction-animation">
      <div className="animation-header">
        <h3>{t(ShowcaseStrings.Recon_Title)}</h3>
        <p>{t(ShowcaseStrings.Recon_Subtitle)}</p>
      </div>

      {/* Animation Steps Progress */}
      <div className="animation-steps">
        {animationSteps.map((step, index) => (
          <motion.div
            key={step.id}
            className={`animation-step ${step.status} ${currentStep === index ? 'current' : ''}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="step-indicator">
              <div className="step-number">{index + 1}</div>
              <div className="step-status-icon">
                {step.status === 'complete' && '✅'}
                {step.status === 'active' && '⏳'}
                {step.status === 'pending' && '⭕'}
              </div>
            </div>
            <div className="step-content">
              <div className="step-name">{step.name}</div>
              <div className="step-description">{step.description}</div>
              {step.status === 'active' && (
                <div className="step-progress-bar">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${step.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* File Receipt Information */}
      <div className="file-visualization">
        <div className="file-info">
          <div className="file-icon">📄</div>
          <div className="file-details">
            <div className="file-name">{receipt.fileName}</div>
            <div className="file-size">{receipt.originalSize} bytes</div>
            <div className="file-blocks">{receipt.blockCount} blocks</div>
          </div>
        </div>

        {/* CBL Data Visualization */}
        {cblData.length > 0 && currentStep >= 0 && (
          <motion.div
            className="cbl-container"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="cbl-header">
              <h4>{t(ShowcaseStrings.Recon_CBLTitle)}</h4>
              <p>{t(ShowcaseStrings.Recon_CBLSubtitle)}</p>
            </div>
            <div className="cbl-data">
              {cblData.map((blockId, index) => (
                <motion.div
                  key={blockId}
                  className="cbl-entry"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className="cbl-index">#{index}</span>
                  <span className="cbl-id">{blockId.substring(0, 20)}...</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Blocks Visualization */}
        <AnimatePresence>
          {blocks.length > 0 && (
            <motion.div
              className="blocks-container"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5 }}
            >
              <div className="blocks-header">
                <h4>
                  {t(ShowcaseStrings.Recon_BlocksTemplate, {
                    COUNT: String(blocks.length),
                  })}
                </h4>
                <p>{t(ShowcaseStrings.Recon_BlocksSubtitle)}</p>
              </div>
              <div className="blocks-grid">
                {blocks.map((block, index) => (
                  <motion.div
                    key={block.id}
                    className={`reconstruction-block ${block.status}`}
                    style={{ backgroundColor: block.color }}
                    initial={{ opacity: 0, scale: 0, rotate: 180 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{
                      delay: index * 0.1,
                      duration: 0.5,
                      type: 'spring',
                      stiffness: 100,
                    }}
                    whileHover={{ scale: 1.1, rotate: -5 }}
                  >
                    <div className="block-index">#{block.index}</div>
                    <div className="block-status-indicator">
                      {block.status === 'pending' && '⭕'}
                      {block.status === 'selecting' && '🔍'}
                      {block.status === 'selected' && '✓'}
                      {block.status === 'retrieving' && '📥'}
                      {block.status === 'retrieved' && '✓'}
                      {block.status === 'validating' && '🔐'}
                      {block.status === 'validated' && block.isValid
                        ? '✅'
                        : '❌'}
                    </div>
                    <div className="block-size">{block.size}B</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reassembly Progress */}
        {currentStep >= 4 && (
          <motion.div
            className="reassembly-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="reassembly-header">
              <h4>{t(ShowcaseStrings.Recon_ReassemblyTitle)}</h4>
              <p>{t(ShowcaseStrings.Recon_ReassemblySubtitle)}</p>
            </div>
            <div className="reassembly-progress-bar">
              <motion.div
                className="reassembly-progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${reassemblyProgress}%` }}
                transition={{ duration: 0.3 }}
              />
              <span className="reassembly-progress-text">
                {reassemblyProgress}%
              </span>
            </div>
          </motion.div>
        )}

        {/* Download Ready Confirmation */}
        {downloadReady && (
          <motion.div
            className="download-ready-container"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <div className="download-ready-icon">✅</div>
            <h3>{t(ShowcaseStrings.Recon_Complete)}</h3>
            <p>{t(ShowcaseStrings.Recon_ReadyForDownload)}</p>
            <div className="download-ready-details">
              <div className="detail-item">
                <span className="detail-label">
                  {t(ShowcaseStrings.Recon_FileName)}
                </span>
                <span className="detail-value">{receipt.fileName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">
                  {t(ShowcaseStrings.Recon_Size)}
                </span>
                <span className="detail-value">
                  {receipt.originalSize} bytes
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">
                  {t(ShowcaseStrings.Recon_Blocks)}
                </span>
                <span className="detail-value">{receipt.blockCount}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Educational Mode Information */}
        {isEducationalMode && currentStep < animationSteps.length && (
          <motion.div
            className="educational-info"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="educational-header">
              <span>🎓</span>
              <h4>{t(ShowcaseStrings.Recon_WhatsHappening)}</h4>
            </div>
            <div className="educational-content">
              <p>
                <strong>{animationSteps[currentStep]?.name}</strong>
              </p>
              <p>{animationSteps[currentStep]?.description}</p>
              {currentStep === 0 && (
                <div className="technical-details">
                  <p>
                    <strong>{t(ShowcaseStrings.Recon_TechDetails)}</strong>
                  </p>
                  <ul>
                    <li>{t(ShowcaseStrings.Recon_CBLContainsRefs)}</li>
                    <li>
                      {t(ShowcaseStrings.Recon_BlockCountTemplate, {
                        COUNT: String(receipt.blockCount),
                      })}
                    </li>
                    <li>
                      {t(ShowcaseStrings.Recon_OriginalSizeTemplate, {
                        SIZE: String(receipt.originalSize),
                      })}
                    </li>
                  </ul>
                </div>
              )}
              {currentStep === 1 && (
                <div className="technical-details">
                  <p>
                    <strong>{t(ShowcaseStrings.Recon_BlockSelection)}</strong>
                  </p>
                  <ul>
                    <li>{t(ShowcaseStrings.Recon_IdentifyingBlocks)}</li>
                    <li>{t(ShowcaseStrings.Recon_SelectedByChecksums)}</li>
                    <li>{t(ShowcaseStrings.Recon_AllBlocksRequired)}</li>
                  </ul>
                </div>
              )}
              {currentStep === 3 && (
                <div className="technical-details">
                  <p>
                    <strong>
                      {t(ShowcaseStrings.Recon_ChecksumValidation)}
                    </strong>
                  </p>
                  <ul>
                    <li>{t(ShowcaseStrings.Recon_EnsuresNotCorrupted)}</li>
                    <li>{t(ShowcaseStrings.Recon_ComparesChecksums)}</li>
                    <li>{t(ShowcaseStrings.Recon_InvalidBlocksFail)}</li>
                  </ul>
                </div>
              )}
              {currentStep === 4 && (
                <div className="technical-details">
                  <p>
                    <strong>{t(ShowcaseStrings.Recon_FileReassembly)}</strong>
                  </p>
                  <ul>
                    <li>{t(ShowcaseStrings.Recon_CombinedInOrder)}</li>
                    <li>{t(ShowcaseStrings.Recon_PaddingRemoved)}</li>
                    <li>{t(ShowcaseStrings.Recon_ReconstructedByteForByte)}</li>
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
