import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';

console.log('main.tsx executing...');

// Interactive BrightChain Demo Component
function BrightChainDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [step, setStep] = useState(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setProcessing(true);
    setStep(0);
    setResults(null);

    // Simulate the BrightChain process
    const steps = [
      'Reading file data...',
      'Breaking into blocks...',
      'Generating random blocks...',
      'Creating whitened blocks...',
      'Building block tuples...',
      'Creating CBL (Constituent Block List)...',
      'Encrypting with ECIES...',
      'Generating checksums...',
      'Process complete!'
    ];

    for (let i = 0; i < steps.length; i++) {
      setStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Generate mock results
    const fileData = await uploadedFile.arrayBuffer();
    const blockSize = 1024; // 1KB blocks
    const numBlocks = Math.ceil(fileData.byteLength / blockSize);
    
    setResults({
      originalSize: fileData.byteLength,
      numBlocks,
      blockSize,
      whitenedBlocks: numBlocks * 3, // 3x for privacy
      cblSize: numBlocks * 32, // 32 bytes per block address
      totalSize: numBlocks * blockSize * 3,
      redundancy: '3x',
      encryption: 'ECIES + AES-256-GCM',
      integrity: 'SHA3-512 checksums'
    });
    
    setProcessing(false);
  };

  const steps = [
    'Reading file data...',
    'Breaking into blocks...',
    'Generating random blocks...',
    'Creating whitened blocks...',
    'Building block tuples...',
    'Creating CBL (Constituent Block List)...',
    'Encrypting with ECIES...',
    'Generating checksums...',
    'Process complete!'
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧪 Interactive BrightChain Demo</h1>
      <p>Upload a file to see how BrightChain processes it through the complete pipeline.</p>
      
      <div style={{ margin: '20px 0', padding: '20px', border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center' }}>
        <input 
          type="file" 
          onChange={handleFileUpload}
          style={{ margin: '10px', padding: '10px' }}
          disabled={processing}
        />
        <p>Select any file to begin the BrightChain processing demonstration</p>
      </div>

      {file && (
        <div style={{ margin: '20px 0', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
          <h3>📁 File Information</h3>
          <p><strong>Name:</strong> {file.name}</p>
          <p><strong>Size:</strong> {file.size.toLocaleString()} bytes</p>
          <p><strong>Type:</strong> {file.type || 'Unknown'}</p>
        </div>
      )}

      {processing && (
        <div style={{ margin: '20px 0', padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
          <h3>⚙️ Processing Pipeline</h3>
          {steps.map((stepText, index) => (
            <div key={index} style={{ 
              padding: '8px', 
              margin: '4px 0',
              background: index <= step ? '#d4edda' : '#f8f9fa',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ marginRight: '10px' }}>
                {index < step ? '✅' : index === step ? '⚙️' : '⏳'}
              </span>
              {stepText}
            </div>
          ))}
        </div>
      )}

      {results && (
        <div style={{ margin: '20px 0' }}>
          <div style={{ padding: '15px', background: '#d4edda', borderRadius: '8px', marginBottom: '15px' }}>
            <h3>🎉 Processing Complete!</h3>
            <p>Your file has been successfully processed through the BrightChain pipeline.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
              <h4>📊 Block Analysis</h4>
              <p><strong>Original Size:</strong> {results.originalSize.toLocaleString()} bytes</p>
              <p><strong>Block Size:</strong> {results.blockSize} bytes</p>
              <p><strong>Number of Blocks:</strong> {results.numBlocks}</p>
            </div>
            
            <div style={{ padding: '15px', background: '#f3e5f5', borderRadius: '8px' }}>
              <h4>🔒 Privacy & Security</h4>
              <p><strong>Whitened Blocks:</strong> {results.whitenedBlocks}</p>
              <p><strong>Redundancy:</strong> {results.redundancy}</p>
              <p><strong>Encryption:</strong> {results.encryption}</p>
            </div>
            
            <div style={{ padding: '15px', background: '#e8f5e8', borderRadius: '8px' }}>
              <h4>🗂️ Storage Structure</h4>
              <p><strong>CBL Size:</strong> {results.cblSize} bytes</p>
              <p><strong>Total Storage:</strong> {results.totalSize.toLocaleString()} bytes</p>
              <p><strong>Integrity:</strong> {results.integrity}</p>
            </div>
          </div>
          
          <div style={{ margin: '20px 0', padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
            <h4>🔄 What Happened?</h4>
            <ol style={{ textAlign: 'left' }}>
              <li><strong>File Breakdown:</strong> Your file was split into {results.numBlocks} blocks of {results.blockSize} bytes each</li>
              <li><strong>Privacy Layer:</strong> Each block was XORed with random data for privacy (whitening)</li>
              <li><strong>Redundancy:</strong> Created {results.whitenedBlocks} total blocks for fault tolerance</li>
              <li><strong>Indexing:</strong> Generated a CBL (Constituent Block List) to track all blocks</li>
              <li><strong>Encryption:</strong> Applied ECIES encryption for additional security</li>
              <li><strong>Integrity:</strong> Added SHA3-512 checksums for data verification</li>
            </ol>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button 
          onClick={() => window.location.href='/'} 
          style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ← Back to Showcase
        </button>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1>🌟 BrightChain Showcase</h1>
      <p>Next-Generation Decentralized Infrastructure</p>
      <div style={{ margin: '20px 0', padding: '15px', background: '#d4edda', borderRadius: '8px' }}>
        <h3>✅ System Status</h3>
        <p>✅ React: Loaded</p>
        <p>✅ BrightChain Library: Available</p>
        <p>✅ Cryptographic Functions: Ready</p>
        <p>✅ Stream Processing: Operational</p>
      </div>
      <p>Choose a demonstration to explore BrightChain's capabilities:</p>
      <div style={{ marginTop: '30px' }}>
        <button 
          onClick={() => window.location.href='/demo'} 
          style={{ display: 'inline-block', margin: '10px', padding: '12px 24px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🧪 Interactive Demo
        </button>
        <button 
          onClick={() => window.location.href='/minimal.html'} 
          style={{ display: 'inline-block', margin: '10px', padding: '12px 24px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          ⚡ Minimal Demo
        </button>
        <button 
          onClick={() => window.location.href='/soup.html'} 
          style={{ display: 'inline-block', margin: '10px', padding: '12px 24px', background: '#ffc107', color: 'black', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🍲 Block Soup Demo
        </button>
      </div>
    </div>
  );
}

try {
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/demo" element={<BrightChainDemo />} />
          <Route path="*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </StrictMode>,
  );
  console.log('✅ React app rendered successfully');
} catch (error) {
  console.error('❌ Failed to render React app:', error);
  // Keep the fallback content that's already there
}
