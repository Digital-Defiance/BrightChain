import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlockInfo } from '@brightchain/brightchain-lib';

interface EnhancedSoupCanProps {
  block: BlockInfo;
  isAnimating?: boolean;
  isHighlighted?: boolean;
  isSelected?: boolean;
  showConnectionLines?: boolean;
  connectedBlocks?: string[];
  onClick?: (block: BlockInfo) => void;
  onHover?: (block: BlockInfo | null) => void;
  position?: { x: number; y: number };
  fileId?: string;
}

interface InformationPanelProps {
  block: BlockInfo;
  visible: boolean;
  position: { x: number; y: number };
  fileId?: string;
}

const InformationPanel: React.FC<InformationPanelProps> = ({ 
  block, 
  visible, 
  position, 
  fileId 
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="information-panel"
          style={{
            position: 'fixed',
            left: position.x + 10,
            top: position.y - 10,
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          <div className="glass-morphism-panel">
            <div className="panel-header">
              <span className="block-emoji">🥫</span>
              <h4>Block #{block.index}</h4>
            </div>
            <div className="panel-content">
              <div className="info-row">
                <span className="label">ID:</span>
                <span className="value monospace">{block.id.substring(0, 12)}...</span>
              </div>
              <div className="info-row">
                <span className="label">Size:</span>
                <span className="value">{block.size} bytes</span>
              </div>
              {fileId && (
                <div className="info-row">
                  <span className="label">File:</span>
                  <span className="value">{fileId}</span>
                </div>
              )}
              <div className="info-row">
                <span className="label">Color:</span>
                <div 
                  className="color-swatch"
                  style={{ 
                    backgroundColor: `hsl(${block.index * 137.5 % 360}, 70%, 60%)`
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const EnhancedSoupCan: React.FC<EnhancedSoupCanProps> = ({
  block,
  isAnimating = false,
  isHighlighted = false,
  isSelected = false,
  showConnectionLines = false,
  connectedBlocks = [],
  onClick,
  onHover,
  position = { x: 0, y: 0 },
  fileId
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 });
  const canRef = useRef<HTMLDivElement>(null);

  const baseColor = `hsl(${block.index * 137.5 % 360}, 70%, 60%)`;
  const highlightedColor = `hsl(${block.index * 137.5 % 360}, 90%, 70%)`;
  const selectedColor = `hsl(${block.index * 137.5 % 360}, 95%, 75%)`;

  const getCanColor = () => {
    if (isSelected) return selectedColor;
    if (isHighlighted) return highlightedColor;
    return baseColor;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(block);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPanelPosition({
      x: rect.right,
      y: rect.top
    });
    setShowPanel(true);
    onHover?.(block);
  };

  const handleMouseLeave = () => {
    setShowPanel(false);
    onHover?.(null);
  };

  return (
    <>
      <motion.div
        ref={canRef}
        className={`enhanced-soup-can ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''} ${isAnimating ? 'animating' : ''}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          backgroundColor: getCanColor(),
          position: 'relative',
          cursor: 'pointer'
        }}
      >
        {/* Glass morphism overlay */}
        <div className="glass-overlay" />
        
        {/* Can content */}
        <div className="can-content">
          <motion.div 
            className="can-emoji"
            animate={{ 
              rotate: isAnimating ? [0, 10, -10, 0] : 0 
            }}
            transition={{ 
              duration: 0.5, 
              repeat: isAnimating ? Infinity : 0,
              repeatType: "loop"
            }}
          >
            🥫
          </motion.div>
          <div className="can-index">#{block.index}</div>
          <div className="can-size">{block.size}b</div>
        </div>

        {/* Selection indicator */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              className="selection-ring"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>

        {/* Highlight glow */}
        <AnimatePresence>
          {isHighlighted && (
            <motion.div
              className="highlight-glow"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>

        {/* Connection indicators */}
        {showConnectionLines && connectedBlocks.length > 0 && (
          <div className="connection-indicators">
            {connectedBlocks.map((connectedId, index) => (
              <motion.div
                key={connectedId}
                className="connection-dot"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.2 }}
                style={{
                  position: 'absolute',
                  top: `${20 + index * 15}%`,
                  right: '-5px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-primary)',
                  boxShadow: '0 0 4px rgba(0, 255, 136, 0.6)'
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Information Panel */}
      <InformationPanel
        block={block}
        visible={showPanel}
        position={panelPosition}
        fileId={fileId}
      />
    </>
  );
};

export default EnhancedSoupCan;