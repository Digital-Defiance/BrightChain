import React, { useCallback, useState } from 'react';

// Simple mock implementation for demo purposes
class MockBrightChain {
  private blocks = new Map<string, { data: Uint8Array; size: number }>();

  async storeFile(data: Uint8Array, fileName: string) {
    const blockSize = 8192;
    const blocks = [];

    for (let i = 0; i < data.length; i += blockSize) {
      const chunk = data.slice(i, Math.min(i + blockSize, data.length));
      const id = this.generateId();

      this.blocks.set(id, { data: chunk, size: chunk.length });

      blocks.push({
        id,
        checksum: new Uint8Array(32), // Mock checksum
        size: chunk.length,
        index: blocks.length,
      });
    }

    return {
      id: this.generateId(),
      fileName,
      originalSize: data.length,
      blockCount: blocks.length,
      blocks,
      cblData: Array.from(
        new TextEncoder().encode(JSON.stringify({ fileName, blocks })),
      ),
      magnetUrl: `magnet:?xt=urn:brightchain:${this.generateId()}&dn=${fileName}`,
    };
  }

  async retrieveFile(receipt: any) {
    const chunks = [];
    for (const block of receipt.blocks) {
      const stored = this.blocks.get(block.id);
      if (stored) {
        chunks.push(stored.data.slice(0, block.size));
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

  private generateId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

const SoupCan: React.FC<{
  block: any;
  isAnimating?: boolean;
  onClick?: () => void;
}> = ({ block, isAnimating = false, onClick }) => (
  <div
    style={{
      width: '60px',
      height: '80px',
      backgroundColor: `hsl(${(block.index * 137.5) % 360}, 70%, 60%)`,
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
      boxShadow: isAnimating ? '0 4px 8px rgba(0,0,0,0.3)' : 'none',
    }}
    title={`Block ${block.index}: ${block.size} bytes`}
    onClick={onClick}
  >
    <div>🥫</div>
    <div>#{block.index}</div>
    <div>{block.size}b</div>
  </div>
);

export const MinimalSoupDemo: React.FC = () => {
  const [brightChain] = useState(() => new MockBrightChain());
  const [receipts, setReceipts] = useState<any[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [animatingBlockId, setAnimatingBlockId] = useState<string>();

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files)) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const receipt = await brightChain.storeFile(uint8Array, file.name);
          setReceipts((prev) => [...prev, receipt]);
        } catch (error) {
          console.error('Failed to store file:', error);
        }
      }
    },
    [brightChain],
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

  const handleRetrieve = useCallback(
    async (receipt: any) => {
      try {
        // Animate blocks during retrieval
        for (const block of receipt.blocks) {
          setAnimatingBlockId(block.id);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        setAnimatingBlockId(undefined);

        const fileData = await brightChain.retrieveFile(receipt);
        const blob = new Blob([fileData]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = receipt.fileName;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to retrieve file:', error);
      }
    },
    [brightChain],
  );

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🥫 BrightChain Block Soup Demo</h1>
      <p>Upload files to see them broken into colorful soup cans (blocks)!</p>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        style={{
          border: `2px dashed ${dragOver ? '#007bff' : '#ccc'}`,
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          marginBottom: '20px',
          backgroundColor: dragOver ? '#f0f8ff' : '#fafafa',
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
          receipts.map((receipt) => (
            <div
              key={receipt.id}
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '16px',
                margin: '8px',
                backgroundColor: '#f9f9f9',
              }}
            >
              <h3>📄 {receipt.fileName}</h3>
              <p>
                Size: {receipt.originalSize} bytes | Blocks:{' '}
                {receipt.blockCount}
              </p>

              <div style={{ marginBottom: '12px' }}>
                <h4>🥫 Block Soup Cans:</h4>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    border: '2px dashed #ccc',
                    padding: '8px',
                    borderRadius: '4px',
                  }}
                >
                  {receipt.blocks.map((block: any) => (
                    <SoupCan
                      key={block.id}
                      block={block}
                      isAnimating={animatingBlockId === block.id}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleRetrieve(receipt)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                }}
              >
                📥 Retrieve File
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
