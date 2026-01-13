import React, { useState, useCallback, useRef, useEffect } from 'react';

// Simple interfaces to avoid import issues
interface BlockInfo {
  id: string;
  checksum: Uint8Array;
  size: number;
  index: number;
}

interface FileReceipt {
  id: string;
  fileName: string;
  originalSize: number;
  blockCount: number;
  blocks: BlockInfo[];
  cblData: number[];
  magnetUrl: string;
}

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
    style={{
      width: '60px',
      height: '80px',
      backgroundColor: `hsl(${block.index * 137.5 % 360}, 70%, 60%)`,
      borderRadius: '8px',
      margin: '4px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: onClick ? 'pointer' : 'default',
      border: '2px solid #333',
      fontSize: '10px',
      color: 'white',
      textShadow: '1px 1px 1px rgba(0,0,0,0.5)',
      transform: isAnimating ? 'scale(1.1) rotate(5deg)' : 'scale(1)',
      transition: 'transform 0.3s ease',
      boxShadow: isAnimating ? '0 4px 8px rgba(0,0,0,0.3)' : 'none'
    }}
    title={`Block ${block.index}: ${block.size} bytes\nID: ${block.id.substring(0, 8)}...`}
    onClick={onClick}
  >
    <div>🥫</div>
    <div>#{block.index}</div>
    <div>{block.size}b</div>
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '8px',
      margin: '4px 0',
      backgroundColor: step.status === 'processing' ? '#e3f2fd' : '#f5f5f5',
      borderRadius: '4px',
      border: step.status === 'processing' ? '2px solid #2196f3' : '1px solid #ddd'
    }}>
      <span style={{ marginRight: '8px', fontSize: '16px' }}>{getIcon()}</span>
      <div>
        <strong>{step.name}</strong>
        {step.details && <div style={{ fontSize: '12px', color: '#666' }}>{step.details}</div>}
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
  <div style={{ 
    border: '1px solid #ccc', 
    borderRadius: '8px', 
    padding: '16px', 
    margin: '8px',
    backgroundColor: '#f9f9f9'
  }}>
    <h3>📄 {receipt.fileName}</h3>
    <p>Size: {receipt.originalSize} bytes | Blocks: {receipt.blockCount}</p>
    
    <div style={{ marginBottom: '12px' }}>
      <h4>🥫 Block Soup Cans:</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', border: '2px dashed #ccc', padding: '8px', borderRadius: '4px' }}>
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
    
    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
      <button onClick={onRetrieve} style={{ padding: '8px 16px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px' }}>
        📥 Retrieve File
      </button>
      <button onClick={onDownload} style={{ padding: '8px 16px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '4px' }}>
        📄 Download CBL
      </button>
    </div>
    
    <details>
      <summary>🧲 Magnet URL</summary>
      <input 
        type="text" 
        value={receipt.magnetUrl} 
        readOnly 
        style={{ width: '100%', fontSize: '12px', marginTop: '4px', padding: '4px' }}
        onClick={(e) => e.currentTarget.select()}
      />
    </details>
  </div>
);

export const SimpleBrightChainDemo: React.FC = () => {
  const [brightChain, setBrightChain] = useState<any>(null);
  const [receipts, setReceipts] = useState<FileReceipt[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [animatingBlockId, setAnimatingBlockId] = useState<string>();
  const [selectedBlock, setSelectedBlock] = useState<BlockInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize BrightChain when component mounts
    const initBrightChain = async () => {
      try {
        // Dynamic import to avoid build issues
        const { BrightChain, BlockSize } = await import('@brightchain/brightchain-lib');
        
        // Browser version doesn't need initialization
        setBrightChain(new BrightChain(BlockSize.Small));
      } catch (error) {
        console.error('Failed to initialize BrightChain:', error);
      }
    };
    
    initBrightChain();
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
        updateStep('chunk', { status: 'processing', details: `Block size: 8192 bytes` });
        await new Promise(resolve => setTimeout(resolve, 300));
        const chunkCount = Math.ceil(uint8Array.length / 8192);
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
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>🥫 BrightChain Block Soup Demo</h1>
      <p>Upload files to see them transformed into colorful soup cans (blocks) with full process visualization!</p>
      
      {!brightChain ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Initializing BrightChain...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
          <div>
            {/* Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              style={{
                border: `2px dashed ${dragOver ? '#007bff' : '#ccc'}`,
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                marginBottom: '20px',
                backgroundColor: dragOver ? '#f0f8ff' : '#fafafa'
              }}
            >
              <p>📁 Drop files here or click to upload</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                style={{ marginTop: '10px' }}
                disabled={isProcessing}
              />
            </div>

            {/* Stored Files */}
            <div>
              <h2>🗃️ Block Soup Storage ({receipts.length} files)</h2>
              {receipts.length === 0 ? (
                <p>No files stored yet. Upload some files to see the magic! ✨</p>
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

          {/* Process Steps & Block Info */}
          <div>
            {/* Process Steps */}
            {processSteps.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3>🔄 Processing Steps</h3>
                <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                  {processSteps.map(step => (
                    <ProcessStepIndicator key={step.id} step={step} />
                  ))}
                </div>
              </div>
            )}

            {/* Selected Block Info */}
            {selectedBlock && (
              <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <h3>🥫 Block Details</h3>
                <div style={{ fontSize: '14px' }}>
                  <p><strong>Index:</strong> #{selectedBlock.index}</p>
                  <p><strong>Size:</strong> {selectedBlock.size} bytes</p>
                  <p><strong>ID:</strong> <code style={{ fontSize: '10px' }}>{selectedBlock.id}</code></p>
                  <p><strong>Color:</strong> <span style={{ 
                    display: 'inline-block', 
                    width: '20px', 
                    height: '20px', 
                    backgroundColor: `hsl(${selectedBlock.index * 137.5 % 360}, 70%, 60%)`,
                    borderRadius: '4px',
                    verticalAlign: 'middle'
                  }}></span></p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '20px' }}>
              <h3>📊 Soup Stats</h3>
              <p>Total Files: {receipts.length}</p>
              <p>Total Blocks: {receipts.reduce((sum, r) => sum + r.blockCount, 0)}</p>
              <p>Block Size: 8192 bytes</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};