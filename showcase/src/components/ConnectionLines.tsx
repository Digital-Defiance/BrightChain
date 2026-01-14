import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlockInfo } from '@brightchain/brightchain-lib';

interface ConnectionPoint {
  x: number;
  y: number;
  blockId: string;
}

interface Connection {
  from: ConnectionPoint;
  to: ConnectionPoint;
  strength: number;
  type: 'sequential' | 'hierarchical' | 'associative';
}

interface ConnectionLinesProps {
  blocks: (BlockInfo & { fileId?: string })[];
  selectedFileId?: string;
  containerRef: React.RefObject<HTMLElement>;
  showConnections?: boolean;
  animateConnections?: boolean;
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  blocks,
  selectedFileId,
  containerRef,
  showConnections = true,
  animateConnections = true
}) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Update container bounds when container changes
  useEffect(() => {
    const updateBounds = () => {
      if (containerRef.current) {
        const bounds = containerRef.current.getBoundingClientRect();
        setContainerBounds(bounds);
      }
    };

    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [containerRef]);

  // Calculate connections when blocks or selection changes
  useEffect(() => {
    if (!showConnections || !selectedFileId || !containerBounds) {
      setConnections([]);
      return;
    }

    const selectedBlocks = blocks.filter(block => 
      (block as any).fileId === selectedFileId
    );

    if (selectedBlocks.length < 2) {
      setConnections([]);
      return;
    }

    // Find block positions in the DOM
    const blockPositions: ConnectionPoint[] = [];
    
    selectedBlocks.forEach(block => {
      const blockElement = document.querySelector(`[data-block-id="${block.id}"]`);
      if (blockElement) {
        const rect = blockElement.getBoundingClientRect();
        const containerRect = containerRef.current!.getBoundingClientRect();
        
        blockPositions.push({
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top,
          blockId: block.id
        });
      }
    });

    // Create sequential connections between consecutive blocks
    const newConnections: Connection[] = [];
    for (let i = 0; i < blockPositions.length - 1; i++) {
      newConnections.push({
        from: blockPositions[i],
        to: blockPositions[i + 1],
        strength: 1.0,
        type: 'sequential'
      });
    }

    setConnections(newConnections);
  }, [blocks, selectedFileId, containerBounds, showConnections, containerRef]);

  if (!showConnections || connections.length === 0 || !containerBounds) {
    return null;
  }

  const getConnectionColor = (connection: Connection) => {
    switch (connection.type) {
      case 'sequential':
        return 'var(--accent-primary)';
      case 'hierarchical':
        return 'var(--accent-secondary)';
      case 'associative':
        return '#8b5cf6';
      default:
        return 'var(--accent-primary)';
    }
  };

  const getStrokeWidth = (connection: Connection) => {
    return Math.max(2, connection.strength * 3);
  };

  const calculateControlPoints = (from: ConnectionPoint, to: ConnectionPoint) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Create curved path for better visual appeal
    const curvature = Math.min(distance * 0.3, 50);
    
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    
    // Perpendicular offset for curve
    const perpX = -dy / distance * curvature;
    const perpY = dx / distance * curvature;
    
    return {
      cp1x: from.x + dx * 0.3 + perpX,
      cp1y: from.y + dy * 0.3 + perpY,
      cp2x: to.x - dx * 0.3 + perpX,
      cp2y: to.y - dy * 0.3 + perpY
    };
  };

  const createPath = (connection: Connection) => {
    const { from, to } = connection;
    const { cp1x, cp1y, cp2x, cp2y } = calculateControlPoints(from, to);
    
    return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
  };

  return (
    <svg
      ref={svgRef}
      className="connection-lines-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'visible'
      }}
    >
      <defs>
        {/* Gradient definitions for connection lines */}
        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.8" />
          <stop offset="50%" stopColor="var(--accent-primary)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="0.8" />
        </linearGradient>
        
        {/* Glow filter for connections */}
        <filter id="connectionGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Arrow marker for directional connections */}
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="var(--accent-primary)"
            opacity="0.8"
          />
        </marker>
      </defs>

      <AnimatePresence>
        {connections.map((connection, index) => {
          const pathData = createPath(connection);
          const connectionId = `connection-${connection.from.blockId}-${connection.to.blockId}`;
          
          return (
            <g key={connectionId}>
              {/* Background glow line */}
              <motion.path
                d={pathData}
                stroke="var(--accent-primary)"
                strokeWidth={getStrokeWidth(connection) + 2}
                fill="none"
                opacity="0.3"
                filter="url(#connectionGlow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.3 }}
                exit={{ pathLength: 0, opacity: 0 }}
                transition={{
                  duration: animateConnections ? 0.8 : 0,
                  delay: animateConnections ? index * 0.2 : 0,
                  ease: "easeInOut"
                }}
              />
              
              {/* Main connection line */}
              <motion.path
                d={pathData}
                stroke="url(#connectionGradient)"
                strokeWidth={getStrokeWidth(connection)}
                fill="none"
                strokeDasharray="5,5"
                strokeLinecap="round"
                markerEnd="url(#arrowhead)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                exit={{ pathLength: 0, opacity: 0 }}
                transition={{
                  duration: animateConnections ? 1 : 0,
                  delay: animateConnections ? index * 0.2 : 0,
                  ease: "easeInOut"
                }}
              >
                {/* Animated dash movement */}
                {animateConnections && (
                  <animate
                    attributeName="stroke-dashoffset"
                    values="0;-10"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                )}
              </motion.path>
              
              {/* Connection strength indicator */}
              {connection.strength > 0.5 && (
                <motion.circle
                  cx={(connection.from.x + connection.to.x) / 2}
                  cy={(connection.from.y + connection.to.y) / 2}
                  r="3"
                  fill="var(--accent-primary)"
                  opacity="0.8"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.8 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: animateConnections ? index * 0.2 + 0.5 : 0
                  }}
                >
                  <animate
                    attributeName="r"
                    values="3;5;3"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </motion.circle>
              )}
            </g>
          );
        })}
      </AnimatePresence>
    </svg>
  );
};

export default ConnectionLines;