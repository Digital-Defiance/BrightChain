import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  ECIESService,
  ISimpleKeyPair,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import {
  FaLock,
  FaUnlock,
  FaKey,
  FaExchangeAlt,
} from 'react-icons/fa';
import { VotingDemo } from './voting/VotingDemo';
import './Demo.css';

const Demo = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [service] = useState(() => new ECIESService());
  const [aliceKeys, setAliceKeys] = useState<ISimpleKeyPair | null>(null);
  const [bobKeys, setBobKeys] = useState<ISimpleKeyPair | null>(null);
  const [message, setMessage] = useState('Hello, secure world!');
  const [encryptedData, setEncryptedData] = useState<Uint8Array | null>(null);
  const [decryptedMessage, setDecryptedMessage] = useState<string>('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [keyGenError, setKeyGenError] = useState<string | null>(null);

  useEffect(() => {
    const generateKeys = async () => {
      try {
        const aliceMnemonic = service.generateNewMnemonic();
        const alice = service.mnemonicToSimpleKeyPair(aliceMnemonic);
        setAliceKeys(alice);

        const bobMnemonic = service.generateNewMnemonic();
        const bob = service.mnemonicToSimpleKeyPair(bobMnemonic);
        setBobKeys(bob);
      } catch (error) {
        console.error('Key generation failed:', error);
        setKeyGenError(
          'Browser compatibility issue - crypto functions not available.',
        );
        const mockAlice = {
          privateKey: new Uint8Array(32).fill(1),
          publicKey: new Uint8Array(33).fill(2),
        };
        const mockBob = {
          privateKey: new Uint8Array(32).fill(3),
          publicKey: new Uint8Array(33).fill(4),
        };
        setAliceKeys(mockAlice);
        setBobKeys(mockBob);
      }
    };
    generateKeys();
  }, [service]);

  const handleEncrypt = async () => {
    if (!bobKeys || !message) return;
    setIsEncrypting(true);
    try {
      const messageBytes = new TextEncoder().encode(message);
      const encrypted = await service.encryptSimpleOrSingle(
        false,
        bobKeys.publicKey,
        messageBytes,
      );
      setEncryptedData(encrypted);
      setDecryptedMessage('');
    } catch (error) {
      console.error('Encryption failed:', error);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDecrypt = async () => {
    if (!bobKeys || !encryptedData) return;
    setIsDecrypting(true);
    try {
      const decrypted = await service.decryptSimpleOrSingleWithHeader(
        false,
        bobKeys.privateKey,
        encryptedData,
      );
      setDecryptedMessage(new TextDecoder().decode(decrypted));
    } catch (error) {
      console.error('Decryption failed:', error);
      setDecryptedMessage('Error: Decryption failed');
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <section className="demo-section" id="demo" ref={ref}>
      <motion.div
        className="demo-container"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
      >
        <h2 className="section-title">
          Interactive <span className="gradient-text">Demo</span>
        </h2>
        <p className="features-subtitle">
          Visualizing ECIES encryption capabilities
        </p>
        <p
          className="demo-disclaimer"
          style={{
            textAlign: 'center',
            maxWidth: '800px',
            margin: '0 auto 2rem',
            opacity: 0.8,
            fontSize: '0.9rem',
          }}
        >
          <em>
            Note: This visualization uses{' '}
            <code>@digitaldefiance/ecies-lib</code> (the browser library) for
            demonstration purposes. <code>@digitaldefiance/node-ecies-lib</code>{' '}
            provides identical functionality with the same API for Node.js
            server applications. Both libraries are binary-compatible, so data
            encrypted with one can be decrypted by the other.
          </em>
        </p>

        {keyGenError && (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(255,0,0,0.1)',
              border: '1px solid red',
              borderRadius: '8px',
              color: '#ff6b6b',
              marginBottom: '2rem',
            }}
          >
            <p>
              <strong>Error:</strong> {keyGenError}
            </p>
          </div>
        )}

        <div className="demo-grid">
          {/* Alice's Side */}
          <motion.div
            className="demo-card"
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            <h3>
              <FaKey /> Alice (Sender)
            </h3>
            {aliceKeys && (
              <div className="key-display">
                <span className="key-label">Public Key:</span>
                {uint8ArrayToHex(aliceKeys.publicKey)}
              </div>
            )}
            <div className="demo-input-group">
              <label>Message to Encrypt:</label>
              <textarea
                className="demo-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter a secret message..."
              />
            </div>
            <button
              className="demo-btn"
              onClick={handleEncrypt}
              disabled={isEncrypting || !bobKeys}
            >
              {isEncrypting ? (
                'Encrypting...'
              ) : (
                <>
                  <FaLock /> Encrypt for Bob
                </>
              )}
            </button>
          </motion.div>

          {/* Bob's Side */}
          <motion.div
            className="demo-card"
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.4 }}
          >
            <h3>
              <FaKey /> Bob (Receiver)
            </h3>
            {bobKeys && (
              <div className="key-display">
                <span className="key-label">Public Key:</span>
                {uint8ArrayToHex(bobKeys.publicKey)}
              </div>
            )}
            {encryptedData && (
              <div className="demo-result">
                <h4>
                  <FaExchangeAlt /> Encrypted Payload:
                </h4>
                <div className="hex-display">
                  {uint8ArrayToHex(encryptedData)}
                </div>
              </div>
            )}
            <div style={{ marginTop: '1rem' }}>
              <button
                className="demo-btn"
                onClick={handleDecrypt}
                disabled={isDecrypting || !encryptedData}
                style={{ background: 'var(--accent-color)' }}
              >
                {isDecrypting ? (
                  'Decrypting...'
                ) : (
                  <>
                    <FaUnlock /> Decrypt Message
                  </>
                )}
              </button>
            </div>
            {decryptedMessage && (
              <div className="demo-result" style={{ marginTop: '1rem' }}>
                <h4>Decrypted Message:</h4>
                <div
                  className="demo-textarea"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  {decryptedMessage}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        <VotingDemo />
      </motion.div>
    </section>
  );
};

export default Demo;
