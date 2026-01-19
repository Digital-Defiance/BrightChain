import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

export type CameraView =
  | 'overview'
  | 'encoding'
  | 'soup'
  | 'reconstruction'
  | 'detail';

interface CameraTransitionProps {
  currentView: CameraView;
  children: React.ReactNode;
  duration?: number;
  className?: string;
}

const viewTransitions: Record<CameraView, any> = {
  overview: {
    scale: 1,
    x: 0,
    y: 0,
    rotateX: 0,
    rotateY: 0,
  },
  encoding: {
    scale: 1.1,
    x: -100,
    y: -50,
    rotateX: 5,
    rotateY: -5,
  },
  soup: {
    scale: 1.2,
    x: 0,
    y: 100,
    rotateX: -10,
    rotateY: 0,
  },
  reconstruction: {
    scale: 1.1,
    x: 100,
    y: -50,
    rotateX: 5,
    rotateY: 5,
  },
  detail: {
    scale: 1.5,
    x: 0,
    y: 0,
    rotateX: 0,
    rotateY: 0,
  },
};

export const CameraTransition: React.FC<CameraTransitionProps> = ({
  currentView,
  children,
  duration = 0.8,
  className = '',
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), duration * 1000);
    return () => clearTimeout(timer);
  }, [currentView, duration]);

  return (
    <div
      className={`camera-container ${className}`}
      style={{ perspective: '1000px' }}
    >
      <motion.div
        className="camera-view"
        animate={viewTransitions[currentView]}
        transition={{
          duration,
          ease: [0.43, 0.13, 0.23, 0.96], // Custom easing for smooth camera movement
        }}
        style={{
          transformStyle: 'preserve-3d',
          width: '100%',
          height: '100%',
        }}
      >
        {children}
      </motion.div>

      {isTransitioning && (
        <motion.div
          className="camera-transition-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration / 2 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(circle, rgba(0, 255, 136, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}
    </div>
  );
};

interface CameraControlsProps {
  currentView: CameraView;
  onViewChange: (view: CameraView) => void;
  className?: string;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  currentView,
  onViewChange,
  className = '',
}) => {
  const views: { view: CameraView; label: string; icon: string }[] = [
    { view: 'overview', label: 'Overview', icon: '🌐' },
    { view: 'encoding', label: 'Encoding', icon: '📝' },
    { view: 'soup', label: 'Soup', icon: '🥫' },
    { view: 'reconstruction', label: 'Reconstruction', icon: '🔧' },
    { view: 'detail', label: 'Detail', icon: '🔍' },
  ];

  return (
    <div className={`camera-controls ${className}`}>
      <div className="camera-controls-label">Camera View:</div>
      <div className="camera-controls-buttons">
        {views.map(({ view, label, icon }) => (
          <motion.button
            key={view}
            className={`camera-control-btn ${currentView === view ? 'active' : ''}`}
            onClick={() => onViewChange(view)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="camera-control-icon">{icon}</span>
            <span className="camera-control-label">{label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
