/* eslint-disable @nx/enforce-module-boundaries, @typescript-eslint/no-explicit-any */
import { BlockInfo } from '@brightchain/brightchain-lib';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import './EncodingAnimation.css';

export interface EncodingAnimationProps {
  file: File;
  blockSize: number;
  isEducationalMode?: boolean;
  animationSpeed?: number;
  onChunkCreated?: (chunk: Uint8Array, index: number) => void;
  onPaddingAdded?: (block: Uint8Array, index: number) => void;
  onChecksumCalculated?: (checksum: string, index: number) => void;
  onBlockStored?: (blockInfo: BlockInfo) => void;
  onAnimationComplete?: () => void;
}

interface AnimationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'complete';
  progress: number;
}

interface FileChunk {
  id: string;
  data: Uint8Array;
  originalSize: number;
  paddedSize: number;
  checksum?: string;
  color: string;
  position: { x: number; y: number };
}

export const EncodingAnimation: React.FC<EncodingAnimationProps> = ({
  file,
  blockSize,
  isEducationalMode = false,
  animationSpeed = 1,
  onChunkCreated,
  onPaddingAdded,
  onChecksumCalculated,
  onBlockStored,
  onAnimationComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [chunks, setChunks] = useState<FileChunk[]>([]);
  const [_fileData, setFileData] = useState<Uint8Array | null>(null);
  const [animationSteps, setAnimationSteps] = useState<AnimationStep[]>([
    {
      id: 'file-read',
      name: 'Reading File',
      description: 'Loading file data into memory for processing',
      status: 'pending',
      progress: 0,
    },
    {
      id: 'chunking',
      name: 'Breaking into Chunks',
      description: 'Dividing file into fixed-size segments',
      status: 'pending',
      progress: 0,
    },
    {
      id: 'padding',
      name: 'Adding Padding',
      description: 'Adding random data to reach uniform block size',
      status: 'pending',
      progress: 0,
    },
    {
      id: 'checksum',
      name: 'Calculating Checksums',
      description: 'Computing SHA-512 hashes for each block',
      status: 'pending',
      progress: 0,
    },
    {
      id: 'storage',
      name: 'Storing Blocks',
      description: 'Adding blocks to the soup storage',
      status: 'pending',
      progress: 0,
    },
    {
      id: 'cbl-creation',
      name: 'Creating CBL',
      description: 'Generating Constituent Block List metadata',
      status: 'pending',
      progress: 0,
    },
    {
      id: 'magnet-url',
      name: 'Generating Magnet URL',
      description: 'Creating shareable magnet link',
      status: 'pending',
      progress: 0,
    },
  ]);

  // Generate a deterministic color for a chunk based on its index
  const generateChunkColor = useCallback((index: number): string => {
    const hue = (index * 137.508) % 360; // Golden angle approximation
    return `hsl(${hue}, 70%, 60%)`;
  }, []);

  // Calculate chunk positions in a grid layout
  const calculateChunkPosition = useCallback(
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

  // Step 1: Read file data
  const readFileData = useCallback(async () => {
    setCurrentStep(0);
    updateStepStatus(0, 'active', 0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      setFileData(data);

      // Simulate reading progress
      for (let progress = 0; progress <= 100; progress += 10) {
        updateStepStatus(0, 'active', progress);
        await delay(50 / animationSpeed);
      }

      updateStepStatus(0, 'complete', 100);
      return data;
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  }, [file, animationSpeed]);

  // Step 2: Break file into chunks
  const createChunks = useCallback(
    async (data: Uint8Array) => {
      setCurrentStep(1);
      updateStepStatus(1, 'active', 0);

      const newChunks: FileChunk[] = [];
      const totalChunks = Math.ceil(data.length / blockSize);

      for (let i = 0; i < data.length; i += blockSize) {
        const chunkData = data.slice(i, Math.min(i + blockSize, data.length));
        const chunkIndex = Math.floor(i / blockSize);

        const chunk: FileChunk = {
          id: `chunk-${chunkIndex}`,
          data: chunkData,
          originalSize: chunkData.length,
          paddedSize: blockSize,
          color: generateChunkColor(chunkIndex),
          position: calculateChunkPosition(chunkIndex, totalChunks),
        };

        newChunks.push(chunk);
        setChunks((prev) => [...prev, chunk]);

        // Call callback if provided
        if (onChunkCreated) {
          onChunkCreated(chunkData, chunkIndex);
        }

        // Update progress
        const progress = ((chunkIndex + 1) / totalChunks) * 100;
        updateStepStatus(1, 'active', progress);

        // Educational mode: slower animation
        const chunkDelay = isEducationalMode ? 300 : 100;
        await delay(chunkDelay / animationSpeed);
      }

      updateStepStatus(1, 'complete', 100);
      return newChunks;
    },
    [
      blockSize,
      generateChunkColor,
      calculateChunkPosition,
      onChunkCreated,
      isEducationalMode,
      animationSpeed,
    ],
  );

  // Step 3: Add padding to chunks
  const addPadding = useCallback(
    async (chunksToProcess: FileChunk[]) => {
      setCurrentStep(2);
      updateStepStatus(2, 'active', 0);

      const paddedChunks = [...chunksToProcess];

      for (let i = 0; i < paddedChunks.length; i++) {
        const chunk = paddedChunks[i];

        if (chunk.originalSize < blockSize) {
          // Create padded data
          const paddedData = new Uint8Array(blockSize);
          paddedData.set(chunk.data);

          // Add random padding
          const paddingStart = chunk.originalSize;
          const paddingData = new Uint8Array(blockSize - paddingStart);
          crypto.getRandomValues(paddingData);
          paddedData.set(paddingData, paddingStart);

          // Update chunk
          chunk.data = paddedData;

          // Call callback if provided
          if (onPaddingAdded) {
            onPaddingAdded(paddedData, i);
          }
        }

        // Update progress
        const progress = ((i + 1) / paddedChunks.length) * 100;
        updateStepStatus(2, 'active', progress);

        // Educational mode: show padding animation
        if (isEducationalMode && chunk.originalSize < blockSize) {
          await delay(400 / animationSpeed);
        } else {
          await delay(50 / animationSpeed);
        }
      }

      setChunks(paddedChunks);
      updateStepStatus(2, 'complete', 100);
      return paddedChunks;
    },
    [blockSize, onPaddingAdded, isEducationalMode, animationSpeed],
  );

  // Step 4: Calculate checksums
  const calculateChecksums = useCallback(
    async (chunksToProcess: FileChunk[]) => {
      setCurrentStep(3);
      updateStepStatus(3, 'active', 0);

      const chunksWithChecksums = [...chunksToProcess];

      for (let i = 0; i < chunksWithChecksums.length; i++) {
        const chunk = chunksWithChecksums[i];

        // Calculate SHA-256 checksum (simplified for demo)
        const hashBuffer = await crypto.subtle.digest(
          'SHA-256',
          chunk.data.slice(),
        );
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const checksum = hashArray
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        chunk.checksum = checksum;

        // Call callback if provided
        if (onChecksumCalculated) {
          onChecksumCalculated(checksum, i);
        }

        // Update progress
        const progress = ((i + 1) / chunksWithChecksums.length) * 100;
        updateStepStatus(3, 'active', progress);

        // Educational mode: show checksum calculation
        const checksumDelay = isEducationalMode ? 500 : 100;
        await delay(checksumDelay / animationSpeed);
      }

      setChunks(chunksWithChecksums);
      updateStepStatus(3, 'complete', 100);
      return chunksWithChecksums;
    },
    [onChecksumCalculated, isEducationalMode, animationSpeed],
  );

  // Step 5: Store blocks in soup
  const storeBlocks = useCallback(
    async (chunksToProcess: FileChunk[]) => {
      setCurrentStep(4);
      updateStepStatus(4, 'active', 0);

      for (let i = 0; i < chunksToProcess.length; i++) {
        const chunk = chunksToProcess[i];

        // Create block info
        const blockInfo: BlockInfo = {
          id: chunk.checksum || `block-${i}`,
          checksum: new Uint8Array(32) as any, // Simplified for demo - cast to avoid type issues
          size: chunk.originalSize,
          index: i,
        };

        // Call callback if provided
        if (onBlockStored) {
          onBlockStored(blockInfo);
        }

        // Update progress
        const progress = ((i + 1) / chunksToProcess.length) * 100;
        updateStepStatus(4, 'active', progress);

        // Educational mode: show block storage animation
        const storageDelay = isEducationalMode ? 300 : 80;
        await delay(storageDelay / animationSpeed);
      }

      updateStepStatus(4, 'complete', 100);
    },
    [onBlockStored, isEducationalMode, animationSpeed],
  );

  // Step 6: Create CBL
  const createCBL = useCallback(async () => {
    setCurrentStep(5);
    updateStepStatus(5, 'active', 0);

    // Simulate CBL creation progress
    for (let progress = 0; progress <= 100; progress += 20) {
      updateStepStatus(5, 'active', progress);
      await delay(100 / animationSpeed);
    }

    updateStepStatus(5, 'complete', 100);
  }, [animationSpeed]);

  // Step 7: Generate magnet URL
  const generateMagnetURL = useCallback(async () => {
    setCurrentStep(6);
    updateStepStatus(6, 'active', 0);

    // Simulate magnet URL generation
    for (let progress = 0; progress <= 100; progress += 25) {
      updateStepStatus(6, 'active', progress);
      await delay(50 / animationSpeed);
    }

    updateStepStatus(6, 'complete', 100);
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
      const data = await readFileData();
      const chunksData = await createChunks(data);
      const paddedChunks = await addPadding(chunksData);
      const chunksWithChecksums = await calculateChecksums(paddedChunks);
      await storeBlocks(chunksWithChecksums);
      await createCBL();
      await generateMagnetURL();

      // Animation complete
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    } catch (error) {
      console.error('Animation sequence failed:', error);
    }
  }, [
    readFileData,
    createChunks,
    addPadding,
    calculateChecksums,
    storeBlocks,
    createCBL,
    generateMagnetURL,
    onAnimationComplete,
  ]);

  // Start animation when component mounts
  useEffect(() => {
    startAnimation();
  }, [startAnimation]);

  return (
    <div className="encoding-animation">
      <div className="animation-header">
        <h3>🎬 File Encoding Animation</h3>
        <p>Watch as your file is transformed into BrightChain blocks</p>
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

      {/* File Visualization */}
      <div className="file-visualization">
        <div className="file-info">
          <div className="file-icon">📄</div>
          <div className="file-details">
            <div className="file-name">{file.name}</div>
            <div className="file-size">{file.size} bytes</div>
            <div className="file-type">{file.type || 'Unknown type'}</div>
          </div>
        </div>

        {/* Chunks Visualization */}
        <AnimatePresence>
          {chunks.length > 0 && (
            <motion.div
              className="chunks-container"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5 }}
            >
              <div className="chunks-header">
                <h4>📦 File Chunks ({chunks.length})</h4>
                <p>Each chunk will become a block in the soup</p>
              </div>
              <div className="chunks-grid">
                {chunks.map((chunk, index) => (
                  <motion.div
                    key={chunk.id}
                    className={`chunk-block ${currentStep >= 2 && chunk.originalSize < blockSize ? 'padded' : ''} ${currentStep >= 3 && chunk.checksum ? 'checksummed' : ''}`}
                    style={{ backgroundColor: chunk.color }}
                    initial={{ opacity: 0, scale: 0, rotate: -180 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{
                      delay: index * 0.1,
                      duration: 0.5,
                      type: 'spring',
                      stiffness: 100,
                    }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <div className="chunk-index">#{index}</div>
                    <div className="chunk-size">
                      {chunk.originalSize}
                      {chunk.originalSize < blockSize && currentStep >= 2 && (
                        <span className="padding-indicator">
                          +{blockSize - chunk.originalSize}
                        </span>
                      )}
                    </div>
                    {chunk.checksum && currentStep >= 3 && (
                      <div className="chunk-checksum" title={chunk.checksum}>
                        ✓ {chunk.checksum.substring(0, 8)}...
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              <h4>What's Happening Now</h4>
            </div>
            <div className="educational-content">
              <p>
                <strong>{animationSteps[currentStep]?.name}</strong>
              </p>
              <p>{animationSteps[currentStep]?.description}</p>
              {currentStep === 1 && (
                <div className="technical-details">
                  <p>
                    <strong>Technical Details:</strong>
                  </p>
                  <ul>
                    <li>Block size: {blockSize} bytes</li>
                    <li>Expected chunks: {Math.ceil(file.size / blockSize)}</li>
                    <li>Each chunk becomes one block in the soup</li>
                  </ul>
                </div>
              )}
              {currentStep === 2 && (
                <div className="technical-details">
                  <p>
                    <strong>Why Padding?</strong>
                  </p>
                  <ul>
                    <li>All blocks must be the same size</li>
                    <li>Random padding prevents data analysis</li>
                    <li>Padding is removed during reconstruction</li>
                  </ul>
                </div>
              )}
              {currentStep === 3 && (
                <div className="technical-details">
                  <p>
                    <strong>Checksum Purpose:</strong>
                  </p>
                  <ul>
                    <li>Ensures data integrity</li>
                    <li>Used as unique block identifier</li>
                    <li>Enables verification during retrieval</li>
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
