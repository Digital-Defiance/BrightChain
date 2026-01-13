import React, { useState, useCallback, useRef, useEffect } from 'react';
// Use main import - the library should handle browser compatibility
import { BrightChain, FileReceipt, BlockInfo, BlockSize } from '@brightchain/brightchain-lib';
import './BrightChainSoupDemo.css';

interface ProcessStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  details?: string;
}

const SoupCan: React.FC<{ 
  block: BlockInfo; 
  isAnimating?: boolean;
  onClick?: () => void;
}> = ({ block, isAnimating = false, onClick }) => (
  <div 
    className={`soup-can ${isAnimating ? 'animating' : ''}`}
    style={{
      backgroundColor: `hsl(${block.index * 137.5 % 360}, 70%, 60%)`,
    }}
    title={`Block ${block.index}: ${block.size} bytes\nID: ${block.id.substring(0, 8)}...`}
    onClick={onClick}
  >
    <div className="can-emoji">🥫</div>
    <div className="can-index">#{block.index}</div>
    <div className="can-size">{block.size}b</div>
  </div>
);

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

const FileCard: React.FC<{ 
  receipt: FileReceipt; 
  onRetrieve: () => void; 
  onDownload: () => void;
  onBlockClick: (block: BlockInfo) => void;
  animatingBlockId?: string;
}> = ({ receipt, onRetrieve, onDownload, onBlockClick, animatingBlockId }) => (
  <div className="file-card">
    <div className="file-header">
      <span>📄</span>
      <h3 className="file-title">{receipt.fileName}</h3>
    </div>
    <div className="file-info">
      Size: {receipt.originalSize} bytes | Blocks: {receipt.blockCount}
    </div>
    
    <div className="soup-container">
      <div className="soup-header">
        <span>🥫</span>
        Block Soup Cans:
      </div>
      <div className="soup-grid">
        {receipt.blocks.map(block => (
          <SoupCan 
            key={block.id} 
            block={block} 
            isAnimating={animatingBlockId === block.id}
            onClick={() => onBlockClick(block)}
          />
        ))}
      </div>
    </div>
    
    <div className="file-actions">
      <button onClick={onRetrieve} className="action-btn primary">
        <span>📥</span>
        Retrieve File
      </button>
      <button onClick={onDownload} className="action-btn secondary">
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
);

export const BrightChainSoupDemo: React.FC = () => {
  const [brightChain, setBrightChain] = useState<BrightChain | null>(null);
  const [receipts, setReceipts] = useState<FileReceipt[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [animatingBlockId, setAnimatingBlockId] = useState<string>();
  const [selectedBlock, setSelectedBlock] = useState<BlockInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize BrightChain when component mounts
    try {
      // Browser version doesn't need complex initialization
      setBrightChain(new BrightChain(BlockSize.Small));
    } catch (error) {
      console.error('Failed to initialize BrightChain:', error);
    }
  }, []);

  const updateStep = (id: string, updates: Partial<ProcessStep>) => {
    setProcessSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ));
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!brightChain) {
      console.error('BrightChain not initialized');
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
        
      } catch (error) {
        console.error('Failed to store file:', error);
        setProcessSteps(prev => prev.map(step => 
          step.status === 'processing' ? { ...step, status: 'error' } : step
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
      console.error('BrightChain not initialized');
      return;
    }
    
    try {
      // Animate blocks during retrieval
      for (const block of receipt.blocks) {
        setAnimatingBlockId(block.id);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      setAnimatingBlockId(undefined);

      const fileData = await brightChain.retrieveFile(receipt);
      const blob = new Blob([new Uint8Array(fileData)]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = receipt.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to retrieve file:', error);
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
    setAnimatingBlockId(block.id);
    setTimeout(() => setAnimatingBlockId(undefined), 1000);
  }, []);

  return (
    <div className="brightchain-demo">
      <div className="demo-header">
        <h1 className="demo-title">BrightChain Block Soup Demo</h1>
        <p className="demo-subtitle">
          Upload files to see them transformed into colorful soup cans (blocks) with full process visualization!
        </p>
      </div>
      
      {!brightChain ? (
        <div className="loading-container">
          <div className="upload-icon">⚙️</div>
          <p className="loading-text">Initializing BrightChain...</p>
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

            {/* Stored Files */}
            <div className="storage-section">
              <h2 className="storage-header">
                <span>🗃️</span>
                Block Soup Storage ({receipts.length} files)
              </h2>
              {receipts.length === 0 ? (
                <div className="storage-empty">
                  No files stored yet. Upload some files to see the magic! ✨
                </div>
              ) : (
                receipts.map(receipt => (
                  <FileCard
                    key={receipt.id}
                    receipt={receipt}
                    onRetrieve={() => handleRetrieve(receipt)}
                    onDownload={() => handleDownloadCBL(receipt)}
                    onBlockClick={handleBlockClick}
                    animatingBlockId={animatingBlockId}
                  />
                ))
              )}
            </div>
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
          </div>
        </div>
      )}
    </div>
  );
};