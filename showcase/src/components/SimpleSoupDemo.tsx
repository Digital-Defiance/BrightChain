import React, { useState, useCallback } from 'react';
import { BrightChain, FileReceipt, BlockInfo } from '@brightchain/brightchain-lib';
import { BlockSize } from '@brightchain/brightchain-lib';

const SoupCan: React.FC<{ block: BlockInfo }> = ({ block }) => (
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
      cursor: 'pointer',
      border: '2px solid #333',
      fontSize: '10px',
      color: 'white',
      textShadow: '1px 1px 1px rgba(0,0,0,0.5)'
    }}
    title={`Block ${block.index}: ${block.size} bytes`}
  >
    <div>#{block.index}</div>
    <div>{block.size}b</div>
  </div>
);

const FileCard: React.FC<{ 
  receipt: FileReceipt; 
  onRetrieve: () => void; 
  onDownload: () => void; 
}> = ({ receipt, onRetrieve, onDownload }) => (
  <div style={{ 
    border: '1px solid #ccc', 
    borderRadius: '8px', 
    padding: '16px', 
    margin: '8px',
    backgroundColor: '#f9f9f9'
  }}>
    <h3>🥫 {receipt.fileName}</h3>
    <p>Size: {receipt.originalSize} bytes | Blocks: {receipt.blockCount}</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '12px' }}>
      {receipt.blocks.map(block => (
        <SoupCan key={block.id} block={block} />
      ))}
    </div>
    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
      <button onClick={onRetrieve}>📥 Retrieve File</button>
      <button onClick={onDownload}>📄 Download CBL</button>
    </div>
    <details>
      <summary>🧲 Magnet URL</summary>
      <input 
        type="text" 
        value={receipt.magnetUrl} 
        readOnly 
        style={{ width: '100%', fontSize: '12px', marginTop: '4px' }}
        onClick={(e) => e.currentTarget.select()}
      />
    </details>
  </div>
);

export const SimpleSoupDemo: React.FC = () => {
  const [brightChain] = useState(() => new BrightChain(BlockSize.Small));
  const [receipts, setReceipts] = useState<FileReceipt[]>([]);
  const [dragOver, setDragOver] = useState(false);

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

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🥫 BrightChain Block Soup Demo</h1>
      <p>Upload files to see them broken into colorful soup cans (blocks)!</p>
      
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
          type="file"
          multiple
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          style={{ marginTop: '10px' }}
        />
      </div>

      <div>
        <h2>🗃️ Stored Files ({receipts.length})</h2>
        {receipts.length === 0 ? (
          <p>No files stored yet. Upload some files to see the magic! ✨</p>
        ) : (
          receipts.map(receipt => (
            <FileCard
              key={receipt.id}
              receipt={receipt}
              onRetrieve={() => handleRetrieve(receipt)}
              onDownload={() => handleDownloadCBL(receipt)}
            />
          ))
        )}
      </div>
    </div>
  );
};