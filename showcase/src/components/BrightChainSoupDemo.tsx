import React, { useState, useCallback, useRef, useEffect } from 'react';
// Use session-isolated BrightChain implementation
import { BlockSize, FileReceipt, BlockInfo } from '@brightchain/brightchain-lib';
import { SessionIsolatedBrightChain } from './SessionIsolatedBrightChain';
import { EnhancedSoupVisualization } from './EnhancedSoupVisualization';
import './BrightChainSoupDemo.css';

interface ProcessStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  details?: string;
}

const ProcessStepIndicator: React.FC<{ step: ProcessStep }> = ({ step }) => {
  const getIcon = () => {
    switch (step.status) {
      case 'complete': return '✅';
      case 'processing': return '⏳';
      case 'error': return '❌';
      default: return '⭕';
    }
  };

  return (
    <div className={`process-step ${step.status}`}>
      <span className="step-icon">{getIcon()}</span>
      <div className="step-content">
        <div className="step-name">{step.name}</div>
        {step.details && <div className="step-details">{step.details}</div>}
      </div>
    </div>
  );
};

export const BrightChainSoupDemo: React.FC = () => {
  const [brightChain, setBrightChain] = useState<SessionIsolatedBrightChain | null>(null);
  const [receipts, setReceipts] = useState<FileReceipt[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [animatingBlockIds, setAnimatingBlockIds] = useState<string[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<BlockInfo | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const updateStep = (id: string, updates: Partial<ProcessStep>) => {
    setProcessSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ));
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!brightChain) {
      console.error('SessionIsolatedBrightChain not initialized');
      return;
    }
    
    setIsProcessing(true);
    
    for (const file of Array.from(files)) {
      const steps: ProcessStep[] = [
        { id: 'read', name: 'Reading file', status: 'pending' },
        { id: 'chunk', name: 'Breaking into chunks', status: 'pending' },
        { id: 'pad', name: 'Padding blocks', status: 'pending' },
        { id: 'hash', name: 'Calculating checksums', status: 'pending' },
        { id: 'store', name: 'Storing in block soup', status: 'pending' },
        { id: 'cbl', name: 'Creating CBL metadata', status: 'pending' },
        { id: 'magnet', name: 'Generating magnet URL', status: 'pending' }
      ];
      
      setProcessSteps(steps);

      try {
        // Step 1: Read file
        updateStep('read', { status: 'processing', details: `Reading ${file.name} (${file.size} bytes)` });
        await new Promise(resolve => setTimeout(resolve, 500));
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        updateStep('read', { status: 'complete' });

        // Step 2: Break into chunks
        updateStep('chunk', { status: 'processing', details: `Block size: ${BlockSize.Small} bytes` });
        await new Promise(resolve => setTimeout(resolve, 300));
        const chunkCount = Math.ceil(uint8Array.length / (BlockSize.Small as number));
        updateStep('chunk', { status: 'complete', details: `Created ${chunkCount} chunks` });

        // Step 3: Pad blocks
        updateStep('pad', { status: 'processing', details: 'Adding random padding to blocks' });
        await new Promise(resolve => setTimeout(resolve, 300));
        updateStep('pad', { status: 'complete' });

        // Step 4: Calculate checksums
        updateStep('hash', { status: 'processing', details: 'SHA-512 checksums for each block' });
        await new Promise(resolve => setTimeout(resolve, 400));
        updateStep('hash', { status: 'complete' });

        // Step 5: Store in block soup
        updateStep('store', { status: 'processing', details: 'Adding soup cans to memory store' });
        await new Promise(resolve => setTimeout(resolve, 500));
        const receipt = await brightChain.storeFile(uint8Array, file.name);
        updateStep('store', { status: 'complete', details: `${receipt.blockCount} blocks stored` });

        // Step 6: Create CBL
        updateStep('cbl', { status: 'processing', details: 'Creating Constituent Block List' });
        await new Promise(resolve => setTimeout(resolve, 300));
        updateStep('cbl', { status: 'complete', details: `CBL: ${receipt.cblData.length} bytes` });

        // Step 7: Generate magnet URL
        updateStep('magnet', { status: 'processing', details: 'Creating magnet link' });
        await new Promise(resolve => setTimeout(resolve, 200));
        updateStep('magnet', { status: 'complete', details: 'Ready for sharing!' });

        setReceipts(prev => [...prev, receipt]);
        
        // Update debug info
        setDebugInfo(brightChain.getDebugInfo());
        
      } catch (error) {
        console.error('Failed to store file:', error);
        setProcessSteps(prev => prev.map(step => 
          step.status === 'processing' ? { ...step, status: 'error', details: error instanceof Error ? error.message : 'Unknown error' } : step
        ));
      }
    }
    
    setIsProcessing(false);
    setTimeout(() => setProcessSteps([]), 3000);
  }, [brightChain]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleRetrieve = useCallback(async (receipt: FileReceipt) => {
    if (!brightChain) {
      console.error('SessionIsolatedBrightChain not initialized');
      return;
    }
    
    try {
      // Animate blocks during retrieval
      const blockIds = receipt.blocks.map(b => b.id);
      setAnimatingBlockIds(blockIds);
      
      // Animate each block sequentially
      for (const block of receipt.blocks) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const fileData = await brightChain.retrieveFile(receipt);
      const blob = new Blob([new Uint8Array(fileData)]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = receipt.fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log(`File "${receipt.fileName}" retrieved and downloaded successfully`);
    } catch (error) {
      console.error('Failed to retrieve file:', error);
      alert(`Failed to retrieve file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAnimatingBlockIds([]);
    }
  }, [brightChain]);

  const handleDownloadCBL = useCallback((receipt: FileReceipt) => {
    const cblBlob = new Blob([new Uint8Array(receipt.cblData)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(cblBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receipt.fileName}.cbl`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleBlockClick = useCallback((block: BlockInfo) => {
    setSelectedBlock(block);
    setAnimatingBlockIds([block.id]);
    setTimeout(() => setAnimatingBlockIds([]), 1000);
  }, []);

  const handleFileSelect = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
  }, []);

  return (
    <div className="brightchain-demo">
      <div className="demo-header">
        <h1 className="demo-title">BrightChain Block Soup Demo</h1>
        <p className="demo-subtitle">
          Upload files to see them transformed into colorful soup cans (blocks) with full process visualization!
        </p>
        <p className="session-info">
          <strong>Session:</strong> {debugInfo?.sessionId?.substring(0, 20)}... 
          <span className="session-note">(Data clears on page refresh)</span>
        </p>
      </div>
      
      {!brightChain ? (
        <div className="loading-container">
          <div className="upload-icon">⚙️</div>
          <p className="loading-text">Initializing SessionIsolatedBrightChain...</p>
        </div>
      ) : (
        <div className="demo-grid">
          <div>
            {/* Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`upload-area ${dragOver ? 'drag-over' : ''}`}
            >
              <span className="upload-icon">📁</span>
              <p className="upload-text">Drop files here or click to upload</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="upload-input"
                disabled={isProcessing}
                style={{ display: 'none' }}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="upload-input"
                disabled={isProcessing}
              >
                Choose Files
              </button>
            </div>

            {/* Enhanced Soup Visualization */}
            <EnhancedSoupVisualization
              files={receipts}
              selectedFileId={selectedFileId}
              onFileSelect={handleFileSelect}
              onBlockClick={handleBlockClick}
              animatingBlockIds={animatingBlockIds}
              showConnections={true}
            />

            {/* File Actions */}
            {receipts.length > 0 && (
              <div className="file-actions-section">
                <h3 className="actions-header">
                  <span>⚡</span>
                  File Actions
                </h3>
                <div className="actions-grid">
                  {receipts.map(receipt => (
                    <div key={receipt.id} className="action-card">
                      <div className="action-card-header">
                        <span>📄</span>
                        <h4>{receipt.fileName}</h4>
                      </div>
                      <div className="action-buttons">
                        <button 
                          onClick={() => handleRetrieve(receipt)} 
                          className="action-btn primary"
                          disabled={isProcessing}
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
                      <details className="magnet-details">
                        <summary className="magnet-summary">🧲 Magnet URL</summary>
                        <input 
                          type="text" 
                          value={receipt.magnetUrl} 
                          readOnly 
                          className="magnet-input"
                          onClick={(e) => e.currentTarget.select()}
                        />
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="demo-sidebar">
            {/* Process Steps */}
            {processSteps.length > 0 && (
              <div className="process-steps">
                <h3 className="process-header">
                  <span>🔄</span>
                  Processing Steps
                </h3>
                {processSteps.map(step => (
                  <ProcessStepIndicator key={step.id} step={step} />
                ))}
              </div>
            )}

            {/* Selected Block Info */}
            {selectedBlock && (
              <div className="block-details">
                <h3 className="block-details-header">
                  <span>🥫</span>
                  Block Details
                </h3>
                <div className="block-info">
                  <p><strong>Index:</strong> #{selectedBlock.index}</p>
                  <p><strong>Size:</strong> {selectedBlock.size} bytes</p>
                  <p><strong>ID:</strong></p>
                  <div className="block-id">{selectedBlock.id}</div>
                  <p>
                    <strong>Color:</strong>
                    <span 
                      className="block-color-swatch"
                      style={{ 
                        backgroundColor: `hsl(${selectedBlock.index * 137.5 % 360}, 70%, 60%)`
                      }}
                    />
                  </p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="stats-panel">
              <h3 className="stats-header">
                <span>📊</span>
                Soup Stats
              </h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span>Total Files:</span>
                  <span className="stat-value">{receipts.length}</span>
                </div>
                <div className="stat-item">
                  <span>Total Blocks:</span>
                  <span className="stat-value">{receipts.reduce((sum, r) => sum + r.blockCount, 0)}</span>
                </div>
                <div className="stat-item">
                  <span>Block Size:</span>
                  <span className="stat-value">{BlockSize.Small} bytes</span>
                </div>
              </div>
            </div>

            {/* Debug Panel */}
            {debugInfo && (
              <div className="debug-panel">
                <h3 className="debug-header">
                  <span>🔧</span>
                  Session Debug
                </h3>
                <div className="debug-info">
                  <p><strong>Session ID:</strong></p>
                  <div className="session-id">{debugInfo.sessionId}</div>
                  <p><strong>Blocks in Memory:</strong> {debugInfo.blockCount}</p>
                  <p><strong>Block Size:</strong> {debugInfo.blockSize} bytes</p>
                  {debugInfo.blockIds.length > 0 && (
                    <>
                      <p><strong>Block IDs:</strong></p>
                      <div className="block-ids">
                        {debugInfo.blockIds.map((id: string, index: number) => (
                          <div key={index} className="block-id-item">{id}</div>
                        ))}
                      </div>
                    </>
                  )}
                  <button 
                    onClick={() => {
                      if (brightChain) {
                        brightChain.clearSession();
                        setReceipts([]);
                        setDebugInfo(brightChain.getDebugInfo());
                        console.log('Session cleared manually');
                      }
                    }}
                    className="clear-session-btn"
                  >
                    Clear Session
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};