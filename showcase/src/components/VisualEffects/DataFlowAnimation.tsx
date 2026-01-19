import { motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface DataFlowAnimationProps {
  from: Point;
  to: Point;
  color?: string;
  duration?: number;
  particleCount?: number;
  onComplete?: () => void;
  className?: string;
}

export const DataFlowAnimation: React.FC<DataFlowAnimationProps> = ({
  from,
  to,
  color = '#00ff88',
  duration = 1.5,
  particleCount = 5,
  onComplete,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pathLength, setPathLength] = useState(0);

  // Calculate control points for smooth curve
  const controlPoint1 = {
    x: from.x + (to.x - from.x) * 0.25,
    y: from.y - Math.abs(to.y - from.y) * 0.5,
  };

  const controlPoint2 = {
    x: from.x + (to.x - from.x) * 0.75,
    y: to.y - Math.abs(to.y - from.y) * 0.5,
  };

  const pathData = `M ${from.x} ${from.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${to.x} ${to.y}`;

  useEffect(() => {
    if (svgRef.current) {
      const path = svgRef.current.querySelector('path');
      if (path) {
        setPathLength(path.getTotalLength());
      }
    }
  }, [from, to]);

  useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(onComplete, duration * 1000);
      return () => clearTimeout(timer);
    }
  }, [duration, onComplete]);

  return (
    <svg
      ref={svgRef}
      className={`data-flow-animation ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 8,
      }}
    >
      {/* Path line */}
      <motion.path
        d={pathData}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeDasharray={pathLength}
        strokeDashoffset={pathLength}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: duration * 0.3, ease: 'easeOut' }}
        opacity={0.3}
      />

      {/* Animated particles */}
      {Array.from({ length: particleCount }).map((_, i) => (
        <motion.circle
          key={i}
          r="4"
          fill={color}
          initial={{ offsetDistance: '0%', opacity: 0 }}
          animate={{
            offsetDistance: '100%',
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration,
            delay: i * (duration / particleCount),
            ease: 'easeInOut',
          }}
          style={{
            offsetPath: `path('${pathData}')`,
            filter: `drop-shadow(0 0 4px ${color})`,
          }}
        />
      ))}

      {/* Glow effect at destination */}
      <motion.circle
        cx={to.x}
        cy={to.y}
        r="8"
        fill={color}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 0.5, 0], scale: [0, 2, 0] }}
        transition={{
          duration: 0.5,
          delay: duration - 0.5,
          ease: 'easeOut',
        }}
      />
    </svg>
  );
};

interface MultiFlowAnimationProps {
  flows: Array<{
    from: Point;
    to: Point;
    color?: string;
    delay?: number;
  }>;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

export const MultiFlowAnimation: React.FC<MultiFlowAnimationProps> = ({
  flows,
  duration = 1.5,
  onComplete,
  className = '',
}) => {
  const [completedFlows, setCompletedFlows] = useState(0);

  useEffect(() => {
    if (completedFlows === flows.length && onComplete) {
      onComplete();
    }
  }, [completedFlows, flows.length, onComplete]);

  return (
    <div className={`multi-flow-animation ${className}`}>
      {flows.map((flow, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: flow.delay || 0 }}
        >
          <DataFlowAnimation
            from={flow.from}
            to={flow.to}
            color={flow.color}
            duration={duration}
            onComplete={() => setCompletedFlows((prev) => prev + 1)}
          />
        </motion.div>
      ))}
    </div>
  );
};
