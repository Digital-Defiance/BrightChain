import {
  BlockInfo,
  BlockSize,
  FileReceipt,
} from '@brightchain/brightchain-lib';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ProcessStep } from './AnimationController';
import './BrightChainSoupDemo.css';
import {
  EducationalModeProvider,
  useEducationalModeContext,
} from './EducationalModeProvider';
import {
  ConceptGlossaryModal,
  ContextualHelpButton,
  EducationalTooltip,
  StepExplanationPanel,
} from './EducationalTooltips';
import { EncodingAnimation } from './EncodingAnimation';
import {
  EducationalModeControls,
  EducationalProgressIndicator,
  ProcessCompletionSummary,
} from './ProcessCompletionSummary';
import { ReconstructionAnimation } from './ReconstructionAnimation';
import { SessionIsolatedBrightChain } from './SessionIsolatedBrightChain';
import { useAnimationController } from './useAnimationController';

interface AnimatedProcessStepProps {
  step: ProcessStep;
  isEducationalMode: boolean;
  onStepClick?: () => void;
}

const AnimatedProcessStep: React.FC<AnimatedProcessStepProps> = ({
  step,
  isEducationalMode,
  onStepClick,
}) => {
  const getIcon = () => {
    switch (step.status) {
      case 'complete':
        return '✅';
      case 'active':
        return '⏳';
      case 'error':
        return '❌';
      default:
        return '⭕';
    }
  };

  const getProgressBar = () => {
    if (step.status === 'active') {
      return (
        <div className="step-progress">
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`animated-process-step ${step.status} ${isEducationalMode ? 'educational' : ''}`}
      onClick={onStepClick}
    >
      <span className="step-icon">{getIcon()}</span>
      <div className="step-content">
        <div className="step-name">
          {step.name}
          {isEducationalMode && <ContextualHelpButton stepId={step.id} />}
        </div>
        <div className="step-description">{step.description}</div>
        {getProgressBar()}
        {isEducationalMode && step.status === 'active' && (
          <div className="educational-tooltip">
            <p>
              🎓 <strong>What's happening:</strong> {step.description}
            </p>
            <p>
              ⏱️ <strong>Duration:</strong> {step.duration}ms
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface AnimationControlsProps {
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

const AnimationControls: React.FC<AnimationControlsProps> = ({
  isPlaying,
  speed,
  onPlay,
  onPause,
  onReset,
  onSpeedChange,
}) => {
  return (
    <div className="animation-controls">
      <div className="playback-controls">
        <button
          onClick={isPlaying ? onPause : onPlay}
          className={`control-btn ${isPlaying ? 'pause' : 'play'}`}
          title={isPlaying ? 'Pause Animation' : 'Play Animation'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <button
          onClick={onReset}
          className="control-btn reset"
          title="Reset Animation"
        >
          🔄
        </button>
      </div>

      <div className="speed-control">
        <label htmlFor="speed-slider">Speed: {speed}x</label>
        <input
          id="speed-slider"
          type="range"
          min="0.25"
          max="2"
          step="0.25"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="speed-slider"
        />
      </div>
    </div>
  );
};

interface PerformanceMonitorProps {
  frameRate: number;
  averageFrameTime: number;
  droppedFrames: number;
  memoryUsage: number;
  sequenceCount: number;
  errorCount: number;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  frameRate,
  averageFrameTime,
  droppedFrames,
  memoryUsage,
  sequenceCount,
  errorCount,
}) => {
  const getPerformanceStatus = () => {
    if (frameRate >= 30) return 'good';
    if (frameRate >= 20) return 'warning';
    return 'poor';
  };

  return (
    <div className="performance-monitor">
      <h4>🔧 Performance Monitor</h4>
      <div className="performance-grid">
        <div className={`performance-item ${getPerformanceStatus()}`}>
          <span>Frame Rate:</span>
          <span>{frameRate} fps</span>
        </div>
        <div className="performance-item">
          <span>Frame Time:</span>
          <span>{averageFrameTime}ms</span>
        </div>
        <div className="performance-item">
          <span>Dropped Frames:</span>
          <span>{droppedFrames}</span>
        </div>
        {memoryUsage > 0 && (
          <div className="performance-item">
            <span>Memory:</span>
            <span>{memoryUsage}MB</span>
          </div>
        )}
        <div className="performance-item">
          <span>Sequences:</span>
          <span>{sequenceCount}</span>
        </div>
        {errorCount > 0 && (
          <div className="performance-item error">
            <span>Errors:</span>
            <span>{errorCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const AnimatedBrightChainDemoContent: React.FC = () => {
  const [brightChain, setBrightChain] =
    useState<SessionIsolatedBrightChain | null>(null);
  const [receipts, setReceipts] = useState<FileReceipt[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<BlockInfo | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    sessionId: string;
    blockCount: number;
    blockSize: number;
    blockIds: string[];
  } | null>(null);
  const [currentEncodingFile, setCurrentEncodingFile] = useState<File | null>(
    null,
  );
  const [currentReconstructionReceipt, setCurrentReconstructionReceipt] =
    useState<FileReceipt | null>(null);
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);
  const [completionProcessType, setCompletionProcessType] = useState<
    'encoding' | 'reconstruction'
  >('encoding');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Animation controller hook
  const {
    animationState,
    currentSequence,
    currentStep,
    performanceMetrics,
    isInitialized,
    playEncodingAnimation,
    playReconstructionAnimation,
    setSpeed,
    pause,
    resume,
    reset,
  } = useAnimationController();

  // Educational mode context
  const { config: educationalConfig } = useEducationalModeContext();

  useEffect(() => {
    // Initialize SessionIsolatedBrightChain when component mounts
    try {
      const newBrightChain = new SessionIsolatedBrightChain(BlockSize.Small);
      setBrightChain(newBrightChain);
      setDebugInfo(newBrightChain.getDebugInfo());

      console.log('SessionIsolatedBrightChain initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SessionIsolatedBrightChain:', error);
    }
  }, []);

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      if (!brightChain || !isInitialized) {
        console.error('BrightChain or AnimationController not initialized');
        return;
      }

      for (const file of Array.from(files)) {
        try {
          // Set current encoding file for animation
          setCurrentEncodingFile(file);

          // Start animation sequence
          await playEncodingAnimation(file);

          // Perform actual BrightChain operations
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const receipt = await brightChain.storeFile(uint8Array, file.name);

          setReceipts((prev) => [...prev, receipt]);
          setDebugInfo(brightChain.getDebugInfo());

          // Clear current encoding file
          setCurrentEncodingFile(null);

          // Show completion summary if in educational mode
          if (educationalConfig.enabled) {
            setCompletionProcessType('encoding');
            setShowCompletionSummary(true);
          }
        } catch (error) {
          console.error('Failed to store file:', error);
          setCurrentEncodingFile(null);
        }
      }
    },
    [
      brightChain,
      isInitialized,
      playEncodingAnimation,
      educationalConfig.enabled,
    ],
  );

  const handleRetrieve = useCallback(
    async (receipt: FileReceipt) => {
      if (!brightChain || !isInitialized) {
        console.error('BrightChain or AnimationController not initialized');
        return;
      }

      try {
        // Set current reconstruction receipt for animation
        setCurrentReconstructionReceipt(receipt);

        // Start reconstruction animation
        await playReconstructionAnimation(receipt);

        // Perform actual BrightChain retrieval
        const fileData = await brightChain.retrieveFile(receipt);
        const blob = new Blob([new Uint8Array(fileData)]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = receipt.fileName;
        a.click();
        URL.revokeObjectURL(url);

        console.log(
          `File "${receipt.fileName}" retrieved and downloaded successfully`,
        );

        // Clear current reconstruction receipt
        setCurrentReconstructionReceipt(null);

        // Show completion summary if in educational mode
        if (educationalConfig.enabled) {
          setCompletionProcessType('reconstruction');
          setShowCompletionSummary(true);
        }
      } catch (error) {
        console.error('Failed to retrieve file:', error);
        setCurrentReconstructionReceipt(null);
        alert(
          `Failed to retrieve file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    [
      brightChain,
      isInitialized,
      playReconstructionAnimation,
      educationalConfig.enabled,
    ],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload],
  );

  const handleDownloadCBL = useCallback((receipt: FileReceipt) => {
    const cblBlob = new Blob([new Uint8Array(receipt.cblData)], {
      type: 'application/octet-stream',
    });
    const url = URL.createObjectURL(cblBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receipt.fileName}.cbl`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleBlockClick = useCallback((_block: BlockInfo) => {
    // Block click handler - currently unused but kept for future functionality
  }, []);

  if (!isInitialized || !brightChain) {
    return (
      <div className="loading-container">
        <div className="upload-icon">⚙️</div>
        <p className="loading-text">
          Initializing Animated BrightChain Demo...
        </p>
      </div>
    );
  }

  return (
    <div className="animated-brightchain-demo">
      <div className="demo-header">
        <h1 className="demo-title">Animated BrightChain Block Soup Demo</h1>
        <p className="demo-subtitle">
          Experience the BrightChain process with step-by-step animations and
          educational content!
        </p>
        <p className="session-info">
          <strong>Session:</strong> {debugInfo?.sessionId?.substring(0, 20)}...
          <span className="session-note">(Data clears on page refresh)</span>
        </p>
      </div>

      {/* Educational Mode Controls */}
      <EducationalModeControls />

      {/* Animation Controls */}
      <AnimationControls
        isPlaying={animationState.isPlaying}
        speed={animationState.speed}
        onPlay={resume}
        onPause={pause}
        onReset={reset}
        onSpeedChange={setSpeed}
      />

      {/* Educational Progress Indicator */}
      <EducationalProgressIndicator />

      {/* Step Explanation Panel */}
      <StepExplanationPanel />

      <div className="demo-grid">
        <div>
          {/* Encoding Animation */}
          {currentEncodingFile && (
            <EncodingAnimation
              file={currentEncodingFile}
              blockSize={BlockSize.Small}
              isEducationalMode={educationalConfig.enabled}
              animationSpeed={animationState.speed}
              onAnimationComplete={() => {
                console.log('Encoding animation completed');
              }}
            />
          )}

          {/* Reconstruction Animation */}
          {currentReconstructionReceipt && (
            <ReconstructionAnimation
              receipt={currentReconstructionReceipt}
              blockSize={BlockSize.Small}
              isEducationalMode={educationalConfig.enabled}
              animationSpeed={animationState.speed}
              onAnimationComplete={() => {
                console.log('Reconstruction animation completed');
              }}
            />
          )}

          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            className={`upload-area ${dragOver ? 'drag-over' : ''}`}
          >
            <span className="upload-icon">📁</span>
            <p className="upload-text">Drop files here or click to upload</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) =>
                e.target.files && handleFileUpload(e.target.files)
              }
              className="upload-input"
              disabled={animationState.isPlaying}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="upload-input"
              disabled={animationState.isPlaying}
            >
              Choose Files
            </button>
          </div>

          {/* Stored Files */}
          <div className="storage-section">
            <h2 className="storage-header">
              <span>🗃️</span>
              Block Soup Storage ({receipts.length} files)
            </h2>
            {receipts.length === 0 ? (
              <div className="storage-empty">
                No files stored yet. Upload some files to see the animated
                magic! ✨
              </div>
            ) : (
              receipts.map((receipt) => (
                <div key={receipt.id} className="file-card">
                  <div className="file-header">
                    <span>📄</span>
                    <h3 className="file-title">{receipt.fileName}</h3>
                  </div>
                  <div className="file-info">
                    Size: {receipt.originalSize} bytes | Blocks:{' '}
                    {receipt.blockCount}
                  </div>

                  <div className="file-actions">
                    <button
                      onClick={() => handleRetrieve(receipt)}
                      className="action-btn primary"
                      disabled={animationState.isPlaying}
                    >
                      <span>📥</span>
                      Retrieve File
                    </button>
                    <button
                      onClick={() => handleDownloadCBL(receipt)}
                      className="action-btn secondary"
                    >
                      <span>📄</span>
                      Download CBL
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="demo-sidebar">
          {/* Current Animation Sequence */}
          {currentSequence && (
            <div className="animation-sequence">
              <h3 className="sequence-header">
                <span>🎬</span>
                {currentSequence.type === 'encoding'
                  ? 'Encoding Animation'
                  : 'Reconstruction Animation'}
              </h3>
              {currentSequence.steps.map((step) => (
                <AnimatedProcessStep
                  key={step.id}
                  step={step}
                  isEducationalMode={educationalConfig.enabled}
                />
              ))}
            </div>
          )}

          {/* Current Step Details */}
          {currentStep && (
            <div className="current-step-details">
              <h3 className="step-details-header">
                <span>⚡</span>
                Current Step
              </h3>
              <div className="step-info">
                <h4>{currentStep.name}</h4>
                <p>{currentStep.description}</p>
                <div className="step-timing">
                  Duration: {currentStep.duration / animationState.speed}ms
                </div>
              </div>
            </div>
          )}

          {/* Performance Monitor */}
          <PerformanceMonitor {...performanceMetrics} />

          {/* Selected Block Info */}
          {selectedBlock && (
            <div className="block-details">
              <h3 className="block-details-header">
                <span>🥫</span>
                Block Details
              </h3>
              <div className="block-info">
                <p>
                  <strong>Index:</strong> #{selectedBlock.index}
                </p>
                <p>
                  <strong>Size:</strong> {selectedBlock.size} bytes
                </p>
                <p>
                  <strong>ID:</strong>
                </p>
                <div className="block-id">{selectedBlock.id}</div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="stats-panel">
            <h3 className="stats-header">
              <span>📊</span>
              Animation Stats
            </h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span>Total Files:</span>
                <span className="stat-value">{receipts.length}</span>
              </div>
              <div className="stat-item">
                <span>Total Blocks:</span>
                <span className="stat-value">
                  {receipts.reduce((sum, r) => sum + r.blockCount, 0)}
                </span>
              </div>
              <div className="stat-item">
                <span>Animation Speed:</span>
                <span className="stat-value">{animationState.speed}x</span>
              </div>
              <div className="stat-item">
                <span>Frame Rate:</span>
                <span className="stat-value">
                  {performanceMetrics.frameRate} fps
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Educational Tooltips */}
      <EducationalTooltip />

      {/* Concept Glossary Modal */}
      <ConceptGlossaryModal />

      {/* Process Completion Summary */}
      <ProcessCompletionSummary
        processType={completionProcessType}
        isVisible={showCompletionSummary}
        onClose={() => setShowCompletionSummary(false)}
      />
    </div>
  );
};

export const AnimatedBrightChainDemo: React.FC = () => {
  const { controller } = useAnimationController();

  return (
    <EducationalModeProvider animationController={controller}>
      <AnimatedBrightChainDemoContent />
    </EducationalModeProvider>
  );
};
