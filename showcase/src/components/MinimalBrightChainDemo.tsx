import React, { useState, useCallback, useRef } from 'react';

// Minimal interfaces to avoid complex imports
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

// Simple block store implementation
class SimpleBlockStore {
  private blocks = new Map<string, Uint8Array>();
  
  async store(data: Uint8Array): Promise<string> {
    // Simple hash function for demo
    const id = Array.from(data.slice(0, 8))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    this.blocks.set(id, data);
    return id;
  }
  
  async retrieve(id: string): Promise<Uint8Array | null> {
    return this.blocks.get(id) || null;
  }
  
  size(): number {
    return this.blocks.size;
  }
}

// Simple BrightChain implementation for demo
class SimpleBrightChain {
  private blockStore = new SimpleBlockStore();
  private blockSize = 8192; // 8KB blocks
  
  async storeFile(fileData: Uint8Array, fileName = 'untitled'): Promise<FileReceipt> {
    const blocks: BlockInfo[] = [];
    
    // Split file into blocks
    for (let i = 0; i < fileData.length; i += this.blockSize) {
      const chunk = fileData.slice(i, Math.min(i + this.blockSize, fileData.length));
      const paddedChunk = new Uint8Array(this.blockSize);
      paddedChunk.set(chunk);
      
      // Fill remaining space with random data
      if (chunk.length < this.blockSize) {
        crypto.getRandomValues(paddedChunk.subarray(chunk.length));
      }
      
      const id = await this.blockStore.store(paddedChunk);
      
      blocks.push({
        id,
        checksum: paddedChunk.slice(0, 32), // Simple checksum
        size: chunk.length,
        index: blocks.length,
      });
    }
    
    // Create CBL data
    const cblData = new TextEncoder().encode(JSON.stringify({
      version: 1,
      fileName,
      originalSize: fileData.length,
      blockCount: blocks.length,
      blocks: blocks.map(b => ({ id: b.id, size: b.size })),
    }));
    
    const receiptId = crypto.getRandomValues(new Uint8Array(16))
      .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    
    return {
      id: receiptId,
      fileName,
      originalSize: fileData.length,
      blockCount: blocks.length,
      blocks,
      cblData: Array.from(cblData),
      magnetUrl: `magnet:?xt=urn:brightchain:${receiptId}&dn=${fileName}&xl=${fileData.length}`,
    };
  }
  
  async retrieveFile(receipt: FileReceipt): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    
    for (const blockInfo of receipt.blocks) {
      const blockData = await this.blockStore.retrieve(blockInfo.id);
      if (blockData) {
        chunks.push(blockData.slice(0, blockInfo.size));
      }
    }
    
    const result = new Uint8Array(receipt.originalSize);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }
  
  getStats() {
    return {
      totalBlocks: this.blockStore.size(),
      blockSize: this.blockSize,
    };
  }
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
    title={`Block ${block.index}: ${block.size} bytes\nID: ${block.id}`}
    onClick={onClick}
  >
    <div>🥫</div>
    <div>#{block.index}</div>
    <div>{block.size}b</div>
  </div>
);

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

export const MinimalBrightChainDemo: React.FC = () => {
  const [brightChain] = useState(() => new SimpleBrightChain());
  const [receipts, setReceipts] = useState<FileReceipt[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [animatingBlockId, setAnimatingBlockId] = useState<string>();
  const [selectedBlock, setSelectedBlock] = useState<BlockInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const receipt = await brightChain.storeFile(uint8Array, file.name);
        setReceipts(prev => [...prev, receipt]);
      } catch (error) {
        console.error('Failed to store file:', error);
      }
    }
  }, [brightChain]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleRetrieve = useCallback(async (receipt: FileReceipt) => {
    try {
      // Animate blocks during retrieval
      for (const block of receipt.blocks) {
        setAnimatingBlockId(block.id);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      setAnimatingBlockId(undefined);

      const fileData = await brightChain.retrieveFile(receipt);
      const blob = new Blob([new Uint8Array(Array.from(fileData))]);
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

  const stats = brightChain.getStats();

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>🥫 BrightChain Block Soup Demo</h1>
      <p>Upload files to see them transformed into colorful soup cans (blocks)!</p>
      
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

        {/* Block Info & Stats */}
        <div>
          {/* Selected Block Info */}
          {selectedBlock && (
            <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
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
          <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3>📊 Soup Stats</h3>
            <p>Total Files: {receipts.length}</p>
            <p>Total Blocks: {stats.totalBlocks}</p>
            <p>Block Size: {stats.blockSize} bytes</p>
          </div>
        </div>
      </div>
    </div>
  );
};