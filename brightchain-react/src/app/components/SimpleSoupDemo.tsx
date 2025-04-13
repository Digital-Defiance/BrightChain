import React, { useState, useCallback } from 'react';
import { 
  MemoryBlockStore, 
  RawDataBlock, 
  RandomBlock,
  BlockSize, 
  ChecksumService,
  ServiceLocator,
  uint8ArrayToHex,
  TUPLE
} from '@brightchain/brightchain-lib';

// Initialize services
const checksumService = new ChecksumService();
ServiceLocator.setServiceProvider({ checksumService } as any);

interface SoupCan {
  id: string;
  label: string;
  data: Uint8Array;
  type: 'original' | 'random' | 'whitened' | 'cbl';
}

export const SimpleSoupDemo: React.FC = () => {
  const [blockStore] = useState(() => new MemoryBlockStore({ blockSize: BlockSize.Small }));
  const [message, setMessage] = useState('Hello BrightChain!');
  const [soupCans, setSoupCans] = useState<SoupCan[]>([]);
  const [recipe, setRecipe] = useState<string[]>([]);
  const [reconstructed, setReconstructed] = useState<string>('');

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

  const brightenMessage = useCallback(async () => {
    try {
      const messageData = textToUint8Array(message);
      const blockSize = BlockSize.Small;
      const newCans: SoupCan[] = [];
      const newRecipe: string[] = [];

      // 1. Show original message (will be discarded)
      newCans.push({
        id: 'original',
        label: 'Original Message',
        data: messageData,
        type: 'original'
      });

      // 2. Generate whitener blocks (TUPLE.SIZE - 1 = 3)
      const whiteners: RandomBlock[] = [];
      for (let i = 0; i < TUPLE.SIZE - 1; i++) {
        const whitener = RandomBlock.new(blockSize, new Date());
        whiteners.push(whitener);
        
        // Store whitener in block store
        await blockStore.setData(whitener);
        newRecipe.push(uint8ArrayToHex(whitener.idChecksum));
        
        newCans.push({
          id: uint8ArrayToHex(whitener.idChecksum),
          label: `Whitener ${String.fromCharCode(65 + i)}`,
          data: whitener.data,
          type: 'random'
        });
      }

      // 3. XOR original with all whiteners to create whitened block
      let whitenedData = new Uint8Array(messageData);
      for (const whitener of whiteners) {
        whitenedData = xorArrays(whitenedData, whitener.data);
      }

      // 4. Create and store whitened block
      const whitenedBlock = new RawDataBlock(blockSize, whitenedData, new Date());
      await blockStore.setData(whitenedBlock);
      newRecipe.push(uint8ArrayToHex(whitenedBlock.idChecksum));

      newCans.push({
        id: uint8ArrayToHex(whitenedBlock.idChecksum),
        label: 'Whitened Block',
        data: whitenedData,
        type: 'whitened'
      });

      // 5. Create CBL (recipe)
      const cblData = new TextEncoder().encode(JSON.stringify({
        blockIds: newRecipe,
        originalLength: messageData.length,
        tupleSize: TUPLE.SIZE
      }));
      
      const cblBlock = new RawDataBlock(blockSize, cblData, new Date());
      await blockStore.setData(cblBlock);

      newCans.push({
        id: uint8ArrayToHex(cblBlock.idChecksum),
        label: 'CBL Recipe',
        data: cblData,
        type: 'cbl'
      });

      setSoupCans(newCans);
      setRecipe([uint8ArrayToHex(cblBlock.idChecksum)]);
      setReconstructed('');
    } catch (error) {
      console.error('Error brightening message:', error);
    }
  }, [message, blockStore]);

  const reconstructMessage = useCallback(async () => {
    if (recipe.length === 0) return;

    try {
      // 1. Get CBL
      const cblBlock = await blockStore.getData(recipe[0] as any);
      const cblData = JSON.parse(uint8ArrayToText(cblBlock.data));

      // 2. Retrieve all blocks from recipe
      const blocks: Uint8Array[] = [];
      for (const blockId of cblData.blockIds) {
        const block = await blockStore.getData(blockId as any);
        blocks.push(block.data);
      }

      // 3. XOR all blocks together to reconstruct original
      // Last block is the whitened block, others are whiteners
      let result = blocks[blocks.length - 1]; // Start with whitened block
      for (let i = 0; i < blocks.length - 1; i++) {
        result = xorArrays(result, blocks[i]);
      }

      // 4. Trim to original length and decode
      const trimmed = result.slice(0, cblData.originalLength);
      setReconstructed(uint8ArrayToText(trimmed));
    } catch (error) {
      console.error('Reconstruction failed:', error);
      setReconstructed('Error: Could not reconstruct message');
    }
  }, [recipe, blockStore]);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🥫 BrightChain Owner Free Filesystem Demo</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>The Complete OFFS Workflow</h2>
        <p>
          This demonstrates the complete Owner Free Filesystem workflow that BrightChain implements:
          <br />1. Break message into blocks, 2. Generate random whiteners, 3. XOR to whiten, 
          4. Store only whitened + randoms, 5. Create CBL recipe, 6. Reconstruct perfectly!
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
          🥫 Brighten Message (OFFS)
        </button>
      </div>

      {soupCans.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Blocks in Memory Store</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {soupCans.map((can) => (
              <div 
                key={can.id}
                style={{
                  border: '2px solid',
                  borderColor: can.type === 'original' ? '#ff4444' : 
                              can.type === 'random' ? '#4444ff' : 
                              can.type === 'whitened' ? '#ff8800' : '#44ff44',
                  borderRadius: '8px',
                  padding: '10px',
                  minWidth: '150px',
                  backgroundColor: can.type === 'original' ? '#ffe6e6' : 
                                  can.type === 'random' ? '#e6e6ff' : 
                                  can.type === 'whitened' ? '#fff0e6' : '#e6ffe6'
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
                {can.type === 'original' && <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px' }}>⚠️ Never stored (OFFS principle)</div>}
                {can.type === 'whitened' && <div style={{ color: '#ff8800', fontSize: '12px', marginTop: '5px' }}>🔒 Looks random but contains data</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {recipe.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>CBL Recipe (Constituent Block List)</h3>
          <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', fontFamily: 'monospace' }}>
            CBL ID: {recipe[0].substring(0, 16)}...
          </div>
          <button 
            onClick={reconstructMessage}
            style={{ marginTop: '10px', padding: '5px 15px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '3px' }}
          >
            🔓 Reconstruct from CBL
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
            {reconstructed === message && <span style={{ color: '#155724', marginLeft: '10px' }}>✅ Perfect OFFS reconstruction!</span>}
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '5px' }}>
        <h3>Owner Free Filesystem (OFFS) Workflow</h3>
        <ol>
          <li><strong>Original Message:</strong> Your secret data (never stored)</li>
          <li><strong>Generate Whiteners:</strong> Create {TUPLE.SIZE - 1} random blocks</li>
          <li><strong>XOR Operation:</strong> Message ⊕ Whitener A ⊕ Whitener B ⊕ Whitener C = Whitened Block</li>
          <li><strong>Storage:</strong> Store only whiteners + whitened block (all look random)</li>
          <li><strong>CBL Creation:</strong> Create recipe with block IDs and metadata</li>
          <li><strong>Reconstruction:</strong> Whitener A ⊕ Whitener B ⊕ Whitener C ⊕ Whitened = Original</li>
        </ol>
        <p><strong>Security:</strong> No individual block reveals anything about your data!</p>
      </div>
    </div>
  );
};