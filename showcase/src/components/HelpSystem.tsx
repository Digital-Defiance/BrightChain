import React, { useState, useEffect } from 'react';
import './HelpSystem.css';

/**
 * Help topic interface
 */
export interface HelpTopic {
  id: string;
  title: string;
  category: 'getting-started' | 'concepts' | 'features' | 'troubleshooting';
  content: string;
  relatedTopics: string[];
  keywords: string[];
}

/**
 * Help system props
 */
export interface HelpSystemProps {
  visible: boolean;
  onClose: () => void;
  initialTopic?: string;
}

/**
 * Default help topics
 */
const defaultHelpTopics: HelpTopic[] = [
  {
    id: 'what-is-brightchain',
    title: 'What is BrightChain?',
    category: 'getting-started',
    content: `BrightChain is a revolutionary distributed file storage system that breaks files into anonymous blocks and stores them in a "soup" of mixed data. This approach provides enhanced privacy, security, and decentralization.

Key features:
• Files are broken into fixed-size blocks
• Blocks are mixed with other files' blocks
• Cryptographic checksums ensure data integrity
• Decentralized storage with no central authority
• Magnet URLs enable easy file sharing`,
    relatedTopics: ['how-encoding-works', 'block-soup-concept', 'security-features'],
    keywords: ['brightchain', 'distributed', 'storage', 'blockchain', 'decentralized']
  },
  {
    id: 'how-encoding-works',
    title: 'How File Encoding Works',
    category: 'concepts',
    content: `File encoding in BrightChain follows a multi-step process:

1. **Chunking**: The file is divided into fixed-size segments
2. **Padding**: Random data is added to ensure uniform block sizes
3. **Checksum Calculation**: SHA-512 hashes are computed for each block
4. **Storage**: Blocks are added to the distributed soup
5. **CBL Creation**: A Constituent Block List is generated with block references
6. **Magnet URL**: A shareable link is created for file access

This process ensures your file is secure, distributed, and easily retrievable.`,
    relatedTopics: ['what-is-brightchain', 'cbl-explained', 'checksum-verification'],
    keywords: ['encoding', 'chunking', 'padding', 'checksum', 'cbl']
  },
  {
    id: 'block-soup-concept',
    title: 'Understanding the Block Soup',
    category: 'concepts',
    content: `The "Block Soup" is the heart of BrightChain's security model. Instead of storing files as complete units, BrightChain mixes blocks from different files together in a shared storage pool.

Benefits:
• **Privacy**: Impossible to identify which blocks belong together without the CBL
• **Security**: No single point of failure or attack
• **Efficiency**: Deduplication of identical blocks
• **Anonymity**: File structure and relationships are hidden

Think of it like a giant puzzle where pieces from thousands of different puzzles are mixed together. Only with the right "recipe" (CBL) can you find and assemble your specific pieces.`,
    relatedTopics: ['what-is-brightchain', 'security-features', 'cbl-explained'],
    keywords: ['soup', 'blocks', 'privacy', 'security', 'mixing']
  },
  {
    id: 'cbl-explained',
    title: 'What is a CBL?',
    category: 'concepts',
    content: `A Constituent Block List (CBL) is a metadata file that contains all the information needed to reconstruct a file from the block soup.

The CBL includes:
• List of block checksums (identifiers)
• Order in which blocks should be assembled
• Original file size and padding information
• Reconstruction parameters

**Important**: The CBL is like a treasure map - keep it safe! Without the CBL, your file cannot be reconstructed from the soup. The magnet URL contains the CBL data in an encoded format.`,
    relatedTopics: ['how-encoding-works', 'magnet-urls', 'file-reconstruction'],
    keywords: ['cbl', 'metadata', 'block list', 'reconstruction']
  },
  {
    id: 'magnet-urls',
    title: 'Using Magnet URLs',
    category: 'features',
    content: `Magnet URLs are shareable links that contain the CBL data needed to retrieve files from the BrightChain network.

How to use magnet URLs:
1. **Encoding**: After encoding a file, you receive a magnet URL
2. **Sharing**: Share the URL with anyone who needs access to the file
3. **Reconstruction**: Paste the magnet URL to retrieve and reconstruct the file

Magnet URLs are:
• Self-contained (no central server needed)
• Portable (work across different BrightChain implementations)
• Secure (only those with the URL can access the file)

**Tip**: Save your magnet URLs in a secure location. They are the only way to retrieve your files!`,
    relatedTopics: ['cbl-explained', 'file-reconstruction', 'sharing-files'],
    keywords: ['magnet', 'url', 'sharing', 'link', 'retrieval']
  },
  {
    id: 'file-reconstruction',
    title: 'How File Reconstruction Works',
    category: 'concepts',
    content: `File reconstruction is the process of reassembling your original file from the block soup using a CBL or magnet URL.

The reconstruction process:
1. **CBL Processing**: The system reads the block list from the CBL/magnet URL
2. **Block Selection**: Required blocks are identified in the soup
3. **Block Retrieval**: Blocks are collected from storage
4. **Validation**: Each block's checksum is verified for integrity
5. **Reassembly**: Blocks are combined in the correct order
6. **Padding Removal**: Random padding is stripped to restore the original file

The result is a perfect copy of your original file, byte-for-byte identical.`,
    relatedTopics: ['cbl-explained', 'checksum-verification', 'magnet-urls'],
    keywords: ['reconstruction', 'retrieval', 'reassembly', 'download']
  },
  {
    id: 'checksum-verification',
    title: 'Checksum Verification',
    category: 'concepts',
    content: `Checksums are cryptographic hashes that ensure data integrity throughout the BrightChain process.

How checksums work:
• Each block is processed through SHA-512 hashing
• The resulting 512-bit hash is unique to that block's content
• Any change to the block produces a completely different hash
• During reconstruction, checksums are recalculated and compared

**Security**: Checksums make it virtually impossible for corrupted or tampered data to go undetected. If a block's checksum doesn't match, the system knows the data has been compromised.`,
    relatedTopics: ['security-features', 'how-encoding-works', 'file-reconstruction'],
    keywords: ['checksum', 'hash', 'sha-512', 'integrity', 'verification']
  },
  {
    id: 'security-features',
    title: 'Security Features',
    category: 'features',
    content: `BrightChain provides multiple layers of security:

**Data Integrity**:
• SHA-512 checksums detect any data corruption
• Verification happens automatically during reconstruction

**Privacy**:
• Files are broken into anonymous blocks
• Block relationships are hidden in the soup
• Only CBL holders can reconstruct files

**Decentralization**:
• No central authority controls the data
• No single point of failure
• Resistant to censorship and takedowns

**Cryptographic Security**:
• Secure random padding prevents pattern analysis
• Deterministic hashing ensures consistency
• Future versions will support encryption`,
    relatedTopics: ['block-soup-concept', 'checksum-verification', 'what-is-brightchain'],
    keywords: ['security', 'privacy', 'encryption', 'integrity', 'decentralization']
  },
  {
    id: 'troubleshooting-missing-blocks',
    title: 'Troubleshooting: Missing Blocks',
    category: 'troubleshooting',
    content: `If you encounter "missing blocks" errors during reconstruction:

**Common causes**:
1. **Page refresh**: The demo uses in-memory storage that clears on refresh
2. **Different session**: Blocks from a previous session are not available
3. **Incomplete encoding**: The file wasn't fully encoded before attempting reconstruction

**Solutions**:
• Re-encode the file in the current session
• Don't refresh the page between encoding and reconstruction
• Ensure the encoding process completes before saving the magnet URL
• Check the debug panel to see available blocks

**Note**: In a production BrightChain network, blocks would be persistently stored across multiple nodes, eliminating this issue.`,
    relatedTopics: ['file-reconstruction', 'demo-limitations', 'block-soup-concept'],
    keywords: ['error', 'missing', 'blocks', 'troubleshooting', 'refresh']
  },
  {
    id: 'demo-limitations',
    title: 'Demo Limitations',
    category: 'troubleshooting',
    content: `This demo has some limitations compared to a full BrightChain implementation:

**Storage**:
• Uses in-memory storage (clears on page refresh)
• Limited to browser memory capacity
• No persistent storage across sessions

**Network**:
• Single-node operation (no distributed network)
• No peer-to-peer communication
• No redundancy or replication

**Features**:
• No encryption (blocks are stored in plain text)
• No authentication or access control
• Simplified block management

**Purpose**: This demo is designed for education and demonstration. A production BrightChain network would include persistent storage, distributed nodes, encryption, and many other features.`,
    relatedTopics: ['what-is-brightchain', 'troubleshooting-missing-blocks'],
    keywords: ['limitations', 'demo', 'memory', 'storage', 'production']
  }
];

/**
 * Help System Component
 */
export const HelpSystem: React.FC<HelpSystemProps> = ({
  visible,
  onClose,
  initialTopic
}) => {
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTopics, setFilteredTopics] = useState<HelpTopic[]>(defaultHelpTopics);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (initialTopic) {
      const topic = defaultHelpTopics.find(t => t.id === initialTopic);
      if (topic) {
        setSelectedTopic(topic);
      }
    }
  }, [initialTopic]);

  useEffect(() => {
    let filtered = defaultHelpTopics;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(term) ||
        t.content.toLowerCase().includes(term) ||
        t.keywords.some(k => k.toLowerCase().includes(term))
      );
    }

    setFilteredTopics(filtered);
  }, [searchTerm, selectedCategory]);

  const handleTopicClick = (topic: HelpTopic) => {
    setSelectedTopic(topic);
  };

  const handleRelatedTopicClick = (topicId: string) => {
    const topic = defaultHelpTopics.find(t => t.id === topicId);
    if (topic) {
      setSelectedTopic(topic);
    }
  };

  const handleBackToList = () => {
    setSelectedTopic(null);
  };

  if (!visible) return null;

  return (
    <div className="help-system-overlay" onClick={onClose}>
      <div className="help-system-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-system-header">
          <h2>📖 BrightChain Help Center</h2>
          <button
            className="help-close-button"
            onClick={onClose}
            aria-label="Close help"
          >
            ×
          </button>
        </div>

        <div className="help-system-content">
          {selectedTopic ? (
            <div className="help-topic-detail">
              <button
                className="help-back-button"
                onClick={handleBackToList}
              >
                ← Back to Topics
              </button>

              <div className="help-topic-card">
                <div className={`help-category-badge ${selectedTopic.category}`}>
                  {selectedTopic.category.replace('-', ' ')}
                </div>
                <h3>{selectedTopic.title}</h3>
                <div className="help-topic-content">
                  {selectedTopic.content.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>

                {selectedTopic.relatedTopics.length > 0 && (
                  <div className="help-related-topics">
                    <h4>Related Topics</h4>
                    <div className="help-related-links">
                      {selectedTopic.relatedTopics.map(topicId => {
                        const relatedTopic = defaultHelpTopics.find(t => t.id === topicId);
                        return relatedTopic ? (
                          <button
                            key={topicId}
                            className="help-related-link"
                            onClick={() => handleRelatedTopicClick(topicId)}
                          >
                            {relatedTopic.title}
                          </button>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="help-topics-list">
              <div className="help-search-section">
                <input
                  type="text"
                  placeholder="Search help topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="help-search-input"
                />

                <div className="help-category-filters">
                  <button
                    className={`help-category-filter ${selectedCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('all')}
                  >
                    All Topics
                  </button>
                  <button
                    className={`help-category-filter ${selectedCategory === 'getting-started' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('getting-started')}
                  >
                    Getting Started
                  </button>
                  <button
                    className={`help-category-filter ${selectedCategory === 'concepts' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('concepts')}
                  >
                    Concepts
                  </button>
                  <button
                    className={`help-category-filter ${selectedCategory === 'features' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('features')}
                  >
                    Features
                  </button>
                  <button
                    className={`help-category-filter ${selectedCategory === 'troubleshooting' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('troubleshooting')}
                  >
                    Troubleshooting
                  </button>
                </div>
              </div>

              <div className="help-topics-grid">
                {filteredTopics.map(topic => (
                  <div
                    key={topic.id}
                    className="help-topic-card clickable"
                    onClick={() => handleTopicClick(topic)}
                  >
                    <div className={`help-category-badge ${topic.category}`}>
                      {topic.category.replace('-', ' ')}
                    </div>
                    <h4>{topic.title}</h4>
                    <p className="help-topic-preview">
                      {topic.content.substring(0, 120)}...
                    </p>
                  </div>
                ))}
              </div>

              {filteredTopics.length === 0 && (
                <div className="help-no-results">
                  <p>No help topics found matching "{searchTerm}"</p>
                  <button
                    className="help-clear-search"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Help Button Component
 */
export interface HelpButtonProps {
  onClick: () => void;
  className?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ onClick, className = '' }) => {
  return (
    <button
      className={`help-button ${className}`}
      onClick={onClick}
      title="Open Help Center"
      aria-label="Open Help Center"
    >
      ❓ Help
    </button>
  );
};
