import React, { useState, useCallback } from 'react';
import { 
  MemoryBlockStore, 
  RawDataBlock, 
  BlockSize, 
  ChecksumService,
  ServiceLocator,
  uint8ArrayToHex,
  BlockService,
  Member
} from '@brightchain/brightchain-lib';

// Initialize services
const checksumService = new ChecksumService();
ServiceLocator.setServiceProvider({ checksumService } as any);

// Create a simple member for demo
const demoMember = new Member('demo-user', 'demo@example.com');

interface SoupCan {
  id: string;
  label: string;
  data: Uint8Array;
  isOriginal?: boolean;
  isRandom?: boolean;
  isResult?: boolean;
}

export const BrightChainSoupDemo: React.FC = () => {
  const [blockStore] = useState(() => {
    const store = new MemoryBlockStore(BlockSize.Small);
    BlockService.initialize(store);
    return store;
  });
  const [blockService] = useState(() => new BlockService());
  const [message, setMessage] = useState('Hello BrightChain!');
  const [soupCans, setSoupCans] = useState<SoupCan[]>([]);
  const [recipe, setRecipe] = useState<string[]>([]);
  const [reconstructed, setReconstructed] = useState<string>('');
  const [originalLength, setOriginalLength] = useState<number>(0);

  const textToUint8Array = (text: string): Uint8Array => {
    return new TextEncoder().encode(text);
  };

  const uint8ArrayToText = (data: Uint8Array): string => {
    return new TextDecoder().decode(data);
  };

  const xorArrays = (a: Uint8Array, b: Uint8Array): Uint8Array => {
    const result = new Uint8Array(Math.max(a.length, b.length));
    for (let i = 0; i < result.length; i++) {
      result[i] = (a[i] || 0) ^ (b[i] || 0);
    }
    return result;
  };

  const generateRandomData = (length: number): Uint8Array => {
    const data = new Uint8Array(length);
    crypto.getRandomValues(data);
    return data;
  };

  const createSoupCan = async (label: string, data: Uint8Array, type: 'original' | 'random' | 'result'): Promise<SoupCan> => {
    const block = new RawDataBlock(BlockSize.Small, data);
    await blockStore.put(block.idChecksum, data);
    
    return {
      id: uint8ArrayToHex(block.idChecksum),
      label,
      data,
      isOriginal: type === 'original',
      isRandom: type === 'random',
      isResult: type === 'result'
    };
  };

  const brightenMessage = useCallback(async () => {
    const messageData = textToUint8Array(message);
    setOriginalLength(messageData.length);
    
    try {
      // Use the complete OFFS workflow like the original tests
      const result = await blockService.ingestFile(
        messageData,
        false, // createECBL
        false, // encrypt
        demoMember,
        undefined, // recipient
        'message.txt'
      );
      
      // Create soup cans for visualization
      const newCans: SoupCan[] = [];
      
      // Show original message (will be discarded in real OFFS)
      const originalCan = await createSoupCan('Original Message', messageData, 'original');
      newCans.push(originalCan);
      
      // Show the CBL as the recipe
      const cblCan = await createSoupCan('CBL Recipe', result.data, 'result');
      newCans.push(cblCan);
      
      // Show some random whitener blocks if available
      if (blockStore.getRandomBlocks) {
        const randomBlocks = await blockStore.getRandomBlocks(3);
        for (let i = 0; i < randomBlocks.length; i++) {
          const randomBlock = await blockStore.getData(randomBlocks[i]);
          const can = await createSoupCan(
            `Whitener ${String.fromCharCode(65 + i)}`, 
            randomBlock.data, 
            'random'
          );
          newCans.push(can);
        }
      }
      
      setSoupCans(newCans);
      setRecipe([uint8ArrayToHex(result.idChecksum)]);
      setReconstructed('');
    } catch (error) {
      console.error('Error brightening message:', error);
    }
  }, [message, blockService, blockStore]);

  const reconstructMessage = useCallback(async () => {
    if (recipe.length === 0 || originalLength === 0) return;

    try {
      // For now, just show that we have the CBL stored
      setReconstructed('CBL created and stored! (Full reconstruction coming soon)');
    } catch (error) {
      console.error('Reconstruction failed:', error);
      setReconstructed('Error: Could not reconstruct message');
    }
  }, [recipe, originalLength]);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🥫 BrightChain Soup Can Demo</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>The Soup Market Analogy</h2>
        <p>
          BrightChain stores your data like soup cans in a market. Your original message 
          gets mixed with random "soup flavors" using XOR operations, making it look completely 
          random. Only with the right recipe can you reconstruct your original message!
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>
          Your Secret Message: 
          <input 
            type="text" 
            value={message} 
            onChange={(e) => setMessage(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px', width: '200px' }}
          />
        </label>
        <button 
          onClick={brightenMessage}
          style={{ marginLeft: '10px', padding: '5px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '3px' }}
        >
          🥫 Brighten Message
        </button>
      </div>

      {soupCans.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Soup Cans in the Market</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {soupCans.map((can) => (
              <div 
                key={can.id}
                style={{
                  border: '2px solid',
                  borderColor: can.isOriginal ? '#ff4444' : can.isRandom ? '#4444ff' : '#44ff44',
                  borderRadius: '8px',
                  padding: '10px',
                  minWidth: '150px',
                  backgroundColor: can.isOriginal ? '#ffe6e6' : can.isRandom ? '#e6e6ff' : '#e6ffe6'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {can.label}
                </div>
                <div style={{ fontSize: '10px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  ID: {can.id.substring(0, 16)}...
                </div>
                <div style={{ fontSize: '10px', marginTop: '5px' }}>
                  Data: {Array.from(can.data.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')}...
                </div>
                {can.isOriginal && <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px' }}>⚠️ Discarded after brightening</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {recipe.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Your Secret Recipe</h3>
          <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', fontFamily: 'monospace' }}>
            Recipe: {recipe.map(id => id.substring(0, 8)).join(' + ')}
          </div>
          <button 
            onClick={reconstructMessage}
            style={{ marginTop: '10px', padding: '5px 15px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '3px' }}
          >
            🔓 Reconstruct Message
          </button>
        </div>
      )}

      {reconstructed && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Reconstructed Message</h3>
          <div style={{ 
            backgroundColor: reconstructed === message ? '#d4edda' : '#f8d7da', 
            padding: '10px', 
            borderRadius: '5px',
            border: `1px solid ${reconstructed === message ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            <strong>Result:</strong> "{reconstructed}"
            {reconstructed === message && <span style={{ color: '#155724', marginLeft: '10px' }}>✅ Perfect match!</span>}
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '5px' }}>
        <h3>How it Works</h3>
        <ol>
          <li><strong>Original Message:</strong> Your secret data (red can)</li>
          <li><strong>Random Cans:</strong> Generated random data (blue cans)</li>
          <li><strong>XOR Operation:</strong> Message ⊕ Random A ⊕ Random B ⊕ Random C = Result Z</li>
          <li><strong>Storage:</strong> Only random cans and result are stored publicly</li>
          <li><strong>Reconstruction:</strong> Random A ⊕ Random B ⊕ Random C ⊕ Result Z = Original Message</li>
        </ol>
        <p><strong>Security:</strong> Without the complete recipe, the data appears completely random!</p>
      </div>
    </div>
  );
};