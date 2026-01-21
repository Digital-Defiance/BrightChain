/* eslint-disable @nx/enforce-module-boundaries */
import { BlockInfo, FileReceipt } from '@brightchain/brightchain-lib';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ConnectionLines } from './ConnectionLines';
import { EnhancedSoupCan } from './EnhancedSoupCan';
import './EnhancedSoupCan.css';

interface EnhancedSoupVisualizationProps {
  files: FileReceipt[];
  selectedFileId?: string;
  onFileSelect?: (fileId: string) => void;
  onBlockClick?: (block: BlockInfo) => void;
  animatingBlockIds?: string[];
  showConnections?: boolean;
  className?: string;
  allBlockIds?: string[];
  memberBlockIds?: string[]; // Member document blocks
}

interface FileButtonProps {
  file: FileReceipt;
  isSelected: boolean;
  onClick: () => void;
}

const FileButton: React.FC<FileButtonProps> = ({
  file,
  isSelected,
  onClick,
}) => {
  return (
    <motion.button
      className={`file-selector-btn ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="file-btn-content">
        <div className="file-icon">📄</div>
        <div className="file-info">
          <div className="file-name">{file.fileName}</div>
          <div className="file-stats">
            {file.blocks.length} blocks • {file.originalSize} bytes
          </div>
        </div>
      </div>
      {isSelected && (
        <motion.div
          className="selection-indicator"
          layoutId="fileSelection"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </motion.button>
  );
};

export const EnhancedSoupVisualization: React.FC<
  EnhancedSoupVisualizationProps
> = ({
  files,
  selectedFileId,
  onFileSelect,
  onBlockClick,
  animatingBlockIds = [],
  showConnections = true,
  className = '',
  allBlockIds = [],
  memberBlockIds = [],
}) => {
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [highlightedBlocks, setHighlightedBlocks] = useState<Set<string>>(
    new Set(),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Get blocks from files (with file association)
  const fileBlocks = files.flatMap((file) =>
    file.blocks.map((block) => ({ ...block, fileId: file.id })),
  );

  // Get orphaned blocks (blocks in store but not in any current file)
  const fileBlockIds = new Set(fileBlocks.map((b) => b.id));
  const memberBlockIdSet = new Set(memberBlockIds);
  const orphanedBlocks = allBlockIds
    .filter((id) => !fileBlockIds.has(id))
    .map((id, index) => ({
      id,
      checksum: null as unknown as BlockInfo['checksum'],
      size: 0,
      index,
      fileId: undefined,
      isMemberBlock: memberBlockIdSet.has(id),
    }));

  // Combine file blocks and orphaned blocks
  const allBlocks = [...fileBlocks, ...orphanedBlocks];

  // Update highlighted blocks when selection changes
  useEffect(() => {
    if (selectedFileId) {
      const selectedFile = files.find((f) => f.id === selectedFileId);
      if (selectedFile) {
        setHighlightedBlocks(new Set(selectedFile.blocks.map((b) => b.id)));
      }
    } else {
      setHighlightedBlocks(new Set());
    }
  }, [selectedFileId, files]);

  const handleFileSelect = useCallback(
    (fileId: string) => {
      onFileSelect?.(fileId);
    },
    [onFileSelect],
  );

  const handleBlockClick = useCallback(
    (block: BlockInfo) => {
      onBlockClick?.(block);
    },
    [onBlockClick],
  );

  const handleBlockHover = useCallback((block: BlockInfo | null) => {
    setHoveredBlockId(block?.id || null);
  }, []);

  const isBlockHighlighted = (blockId: string) => {
    return highlightedBlocks.has(blockId) || hoveredBlockId === blockId;
  };

  const isBlockSelected = (_blockId: string) => {
    // You could implement block selection logic here
    return false;
  };

  const isBlockAnimating = (blockId: string) => {
    return animatingBlockIds.includes(blockId);
  };

  const getConnectedBlocks = (blockId: string) => {
    if (!selectedFileId) return [];

    const selectedFile = files.find((f) => f.id === selectedFileId);
    if (!selectedFile) return [];

    const blockIndex = selectedFile.blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return [];

    const connected = [];
    if (blockIndex > 0) connected.push(selectedFile.blocks[blockIndex - 1].id);
    if (blockIndex < selectedFile.blocks.length - 1)
      connected.push(selectedFile.blocks[blockIndex + 1].id);

    return connected;
  };

  return (
    <div className={`enhanced-soup-visualization ${className}`}>
      {/* File Selector */}
      {files.length > 0 && (
        <div className="file-selector-container">
          <motion.h3
            className="selector-title"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            Select a file to highlight its blocks:
          </motion.h3>
          <div className="file-selector-grid">
            <AnimatePresence>
              {files.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <FileButton
                    file={file}
                    isSelected={selectedFileId === file.id}
                    onClick={() => handleFileSelect(file.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Block Soup Container */}
      <div ref={containerRef} className="soup-container-enhanced">
        <motion.div
          className="soup-header-enhanced"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <span className="soup-icon">🥫</span>
          <h3>Block Soup ({allBlocks.length} blocks)</h3>
          {selectedFileId && (
            <motion.div
              className="selection-info"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              Showing connections for:{' '}
              {files.find((f) => f.id === selectedFileId)?.fileName}
            </motion.div>
          )}
        </motion.div>

        <div className="soup-grid-enhanced">
          <AnimatePresence>
            {allBlocks.map((block, index) => (
              <motion.div
                key={block.id}
                data-block-id={block.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.05,
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                }}
                layout
              >
                <EnhancedSoupCan
                  block={block}
                  isAnimating={isBlockAnimating(block.id)}
                  isHighlighted={isBlockHighlighted(block.id)}
                  isSelected={isBlockSelected(block.id)}
                  showConnectionLines={
                    showConnections && selectedFileId === block.fileId
                  }
                  connectedBlocks={getConnectedBlocks(block.id)}
                  onClick={handleBlockClick}
                  onHover={handleBlockHover}
                  fileId={block.fileId}
                  isMemberBlock={
                    'isMemberBlock' in block ? block.isMemberBlock : false
                  }
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Connection Lines Overlay */}
        <ConnectionLines
          blocks={allBlocks}
          selectedFileId={selectedFileId}
          containerRef={containerRef}
          showConnections={showConnections}
          animateConnections={true}
        />

        {/* Empty State */}
        {allBlocks.length === 0 && (
          <motion.div
            className="empty-soup-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="empty-icon">🍲</div>
            <h4>Empty Soup</h4>
            <p>
              Upload some files to see them transformed into colorful soup cans!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EnhancedSoupVisualization;
