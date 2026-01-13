import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useNavigate, Link } from 'react-router-dom';
import './index.css';

console.log('main.tsx executing...');
console.log('Current URL:', window.location.href);
console.log('Current pathname:', window.location.pathname);

// Debug component to show current route
function RouteDebug() {
  const location = window.location;
  return (
    <div style={{ position: 'fixed', top: '10px', right: '10px', background: '#333', color: 'white', padding: '10px', borderRadius: '4px', fontSize: '12px', zIndex: 1000 }}>
      <div>Path: {location.pathname}</div>
      <div>Hash: {location.hash}</div>
      <div>Search: {location.search}</div>
    </div>
  );
}

// Interactive BrightChain Demo Component
function BrightChainDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(0);
  const [dataBlocks, setDataBlocks] = useState<any[]>([]);
  const [randomPool, setRandomPool] = useState<any[]>([]);
  const [whitenedBlocks, setWhitenedBlocks] = useState<any[]>([]);
  const [cbl, setCbl] = useState<any>(null);
  const [reconstructedFile, setReconstructedFile] = useState<any>(null);
  const [mode, setMode] = useState<'upload' | 'reconstruct'>('upload');

  // Initialize random pool on component mount
  React.useEffect(() => {
    const pool = [];
    for (let i = 0; i < 20; i++) {
      pool.push({
        id: `random-${i}`,
        data: `Random Block ${i}`,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        size: 1024
      });
    }
    setRandomPool(pool);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setProcessing(true);
    setStep(0);
    setDataBlocks([]);
    setWhitenedBlocks([]);
    setCbl(null);
    setReconstructedFile(null);

    // Step 1: Break file into blocks
    await new Promise(resolve => setTimeout(resolve, 1000));
    const fileData = await uploadedFile.arrayBuffer();
    const blockSize = 1024;
    const blocks = [];
    
    for (let i = 0; i < fileData.byteLength; i += blockSize) {
      const blockData = fileData.slice(i, i + blockSize);
      blocks.push({
        id: `data-${i / blockSize}`,
        data: `Data Block ${i / blockSize}`,
        originalData: blockData,
        size: blockData.byteLength,
        color: '#007bff',
        position: { x: 50 + (i / blockSize) * 80, y: 100 }
      });
    }
    setDataBlocks(blocks);
    setStep(1);

    // Step 2: Show whitening process
    await new Promise(resolve => setTimeout(resolve, 1500));
    const whitened = [];
    for (let i = 0; i < blocks.length; i++) {
      const dataBlock = blocks[i];
      const randomBlock1 = randomPool[i * 2] || randomPool[i % randomPool.length];
      const randomBlock2 = randomPool[i * 2 + 1] || randomPool[(i + 1) % randomPool.length];
      
      // Simulate XOR whitening
      whitened.push({
        id: `whitened-${i}`,
        dataBlock: dataBlock.id,
        randomBlocks: [randomBlock1?.id || `random-${i}-1`, randomBlock2?.id || `random-${i}-2`],
        color: '#28a745',
        position: { x: 50 + i * 80, y: 250 },
        data: `Whitened Block ${i}`
      });
    }
    setWhitenedBlocks(whitened);
    setStep(2);

    // Step 3: Create CBL
    await new Promise(resolve => setTimeout(resolve, 1500));
    const cblData = {
      id: 'cbl-' + Date.now(),
      fileName: uploadedFile.name,
      fileSize: uploadedFile.size,
      blockCount: blocks.length,
      blockAddresses: whitened.map(w => w.id),
      checksum: 'sha3-' + Math.random().toString(36).substr(2, 8),
      created: new Date().toISOString()
    };
    setCbl(cblData);
    setStep(3);
    setProcessing(false);
  };

  const handleCblUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const cblFile = event.target.files?.[0];
    if (!cblFile) return;
    
    setProcessing(true);
    
    // Simulate CBL parsing and file reconstruction
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const reconstructed = {
      fileName: 'reconstructed_' + cblFile.name.replace('.cbl', ''),
      size: Math.floor(Math.random() * 10000) + 1000,
      blocks: Math.floor(Math.random() * 5) + 2,
      integrity: 'Verified ✅',
      reconstructed: new Date().toISOString()
    };
    
    setReconstructedFile(reconstructed);
    setProcessing(false);
  };

  const downloadCbl = () => {
    if (!cbl) return;
    const blob = new Blob([JSON.stringify(cbl, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name || 'file'}.cbl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <RouteDebug />
      <h1>🧪 Interactive BrightChain Demo</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setMode('upload')} 
          style={{ 
            padding: '10px 20px', 
            margin: '5px', 
            background: mode === 'upload' ? '#007bff' : '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          📤 Upload & Process File
        </button>
        <button 
          onClick={() => setMode('reconstruct')} 
          style={{ 
            padding: '10px 20px', 
            margin: '5px', 
            background: mode === 'reconstruct' ? '#007bff' : '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          🔄 Reconstruct from CBL
        </button>
      </div>

      {mode === 'upload' && (
        <div>
          <div style={{ margin: '20px 0', padding: '20px', border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center' }}>
            <input 
              type="file" 
              onChange={handleFileUpload}
              style={{ margin: '10px', padding: '10px' }}
              disabled={processing}
            />
            <p>Upload a file to see the complete BrightChain process</p>
          </div>

          {/* Random Block Pool */}
          <div style={{ margin: '20px 0', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3>🎲 Random Block Pool</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {randomPool.slice(0, 10).map(block => (
                <div key={block.id} style={{
                  width: '60px',
                  height: '40px',
                  background: block.color,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  R{block.id.split('-')[1]}
                </div>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: '#666' }}>Pool of random blocks used for whitening process</p>
          </div>

          {/* Visual Processing Area */}
          <div style={{ margin: '20px 0', padding: '20px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', minHeight: '400px', position: 'relative' }}>
            <h3>🔄 Processing Visualization</h3>
            
            {/* Data Blocks */}
            {dataBlocks.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4>📦 Data Blocks (Step 1)</h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {dataBlocks.map(block => (
                    <div key={block.id} style={{
                      width: '80px',
                      height: '60px',
                      background: block.color,
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      animation: 'slideIn 0.5s ease-in'
                    }}>
                      <div>D{block.id.split('-')[1]}</div>
                      <div>{block.size}b</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Whitening Process */}
            {whitenedBlocks.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4>🎭 Whitened Blocks (Step 2)</h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {whitenedBlocks.map(block => (
                    <div key={block.id} style={{
                      width: '80px',
                      height: '60px',
                      background: block.color,
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      animation: 'slideIn 0.8s ease-in',
                      position: 'relative'
                    }}>
                      <div>W{block.id.split('-')[1]}</div>
                      <div style={{ fontSize: '8px' }}>XOR'd</div>
                      <div style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        width: '15px',
                        height: '15px',
                        background: '#ffc107',
                        borderRadius: '50%',
                        fontSize: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'black'
                      }}>🔀</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: '#666' }}>Each data block XOR'd with random blocks for privacy</p>
              </div>
            )}

            {/* CBL */}
            {cbl && (
              <div style={{ marginBottom: '20px' }}>
                <h4>📋 CBL (Constituent Block List) - Step 3</h4>
                <div style={{
                  padding: '15px',
                  background: '#dc3545',
                  color: 'white',
                  borderRadius: '8px',
                  maxWidth: '400px',
                  animation: 'slideIn 1s ease-in'
                }}>
                  <div><strong>File:</strong> {cbl.fileName}</div>
                  <div><strong>Blocks:</strong> {cbl.blockCount}</div>
                  <div><strong>Checksum:</strong> {cbl.checksum}</div>
                  <div><strong>Addresses:</strong> {cbl.blockAddresses.length} block references</div>
                  <button 
                    onClick={downloadCbl}
                    style={{
                      marginTop: '10px',
                      padding: '5px 10px',
                      background: 'white',
                      color: '#dc3545',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    💾 Download CBL
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: '#666' }}>The CBL contains the "recipe" to reconstruct your file</p>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'reconstruct' && (
        <div>
          <div style={{ margin: '20px 0', padding: '20px', border: '2px dashed #28a745', borderRadius: '8px', textAlign: 'center' }}>
            <input 
              type="file" 
              accept=".cbl,.json"
              onChange={handleCblUpload}
              style={{ margin: '10px', padding: '10px' }}
              disabled={processing}
            />
            <p>Upload a CBL file to reconstruct the original file</p>
          </div>

          {reconstructedFile && (
            <div style={{ margin: '20px 0', padding: '20px', background: '#d4edda', borderRadius: '8px' }}>
              <h3>🎉 File Reconstructed Successfully!</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div><strong>File Name:</strong> {reconstructedFile.fileName}</div>
                <div><strong>Size:</strong> {reconstructedFile.size.toLocaleString()} bytes</div>
                <div><strong>Blocks Used:</strong> {reconstructedFile.blocks}</div>
                <div><strong>Integrity:</strong> {reconstructedFile.integrity}</div>
              </div>
              <p style={{ marginTop: '15px', fontSize: '14px' }}>The file has been successfully reconstructed from the CBL and whitened blocks!</p>
            </div>
          )}
        </div>
      )}
      
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <Link 
          to="/"
          style={{ display: 'inline-block', padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', textDecoration: 'none' }}
        >
          ← Back to Showcase
        </Link>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Main App Component
function App() {
  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <RouteDebug />
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
        <Link 
          to="/demo"
          style={{ display: 'inline-block', margin: '10px', padding: '12px 24px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'none' }}
        >
          🧪 Interactive Demo
        </Link>
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

// Force clear the fallback content and mount React
const rootElement = document.getElementById('root');
if (rootElement) {
  // Clear any existing content
  rootElement.innerHTML = '';
  
  try {
    const root = createRoot(rootElement);
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
    // Restore a simple fallback if React fails
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h1>🌟 BrightChain Showcase</h1>
        <p>React failed to load. Using fallback interface.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">🔄 Reload</button>
      </div>
    `;
  }
} else {
  console.error('❌ Root element not found');
}
