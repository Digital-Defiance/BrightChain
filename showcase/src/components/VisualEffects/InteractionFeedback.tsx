import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';

interface InteractionFeedbackProps {
  children: React.ReactNode;
  type?: 'hover' | 'click' | 'focus';
  feedbackColor?: string;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
  onClick?: () => void;
  onHover?: (isHovered: boolean) => void;
}

const feedbackVariants = {
  hover: {
    low: {
      scale: 1.02,
      y: -2,
      boxShadow: '0 4px 12px rgba(0, 255, 136, 0.2)',
    },
    medium: {
      scale: 1.05,
      y: -4,
      boxShadow: '0 8px 24px rgba(0, 255, 136, 0.3)',
    },
    high: {
      scale: 1.08,
      y: -6,
      boxShadow: '0 12px 36px rgba(0, 255, 136, 0.4)',
    },
  },
  click: {
    low: {
      scale: 0.98,
    },
    medium: {
      scale: 0.95,
    },
    high: {
      scale: 0.92,
    },
  },
  focus: {
    low: {
      boxShadow: '0 0 0 2px rgba(0, 255, 136, 0.3)',
    },
    medium: {
      boxShadow: '0 0 0 3px rgba(0, 255, 136, 0.5)',
    },
    high: {
      boxShadow: '0 0 0 4px rgba(0, 255, 136, 0.7)',
    },
  },
};

export const InteractionFeedback: React.FC<InteractionFeedbackProps> = ({
  children,
  type = 'hover',
  feedbackColor = '#00ff88',
  intensity = 'medium',
  className = '',
  onClick,
  onHover,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover?.(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover?.(false);
  };

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    onClick?.();
  };

  return (
    <motion.div
      className={`interaction-feedback ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      whileHover={
        type === 'hover' ? feedbackVariants.hover[intensity] : undefined
      }
      whileTap={
        type === 'click' ? feedbackVariants.click[intensity] : undefined
      }
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {children}

      {/* Ripple effect on click */}
      <AnimatePresence>
        {isClicked && (
          <motion.div
            className="click-ripple"
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              height: '100%',
              borderRadius: 'inherit',
              border: `2px solid ${feedbackColor}`,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Hover glow */}
      <AnimatePresence>
        {isHovered && type === 'hover' && (
          <motion.div
            className="hover-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              top: -4,
              left: -4,
              right: -4,
              bottom: -4,
              background: `radial-gradient(circle, ${feedbackColor}20 0%, transparent 70%)`,
              borderRadius: 'inherit',
              pointerEvents: 'none',
              zIndex: -1,
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface HoverCardProps {
  children: React.ReactNode;
  className?: string;
}

export const HoverCard: React.FC<HoverCardProps> = ({
  children,
  className = '',
}) => {
  return (
    <motion.div
      className={`hover-card ${className}`}
      whileHover={{
        scale: 1.03,
        y: -4,
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
      }}
      transition={{
        duration: 0.3,
        ease: [0.43, 0.13, 0.23, 0.96],
      }}
      style={{
        background: 'rgba(17, 24, 39, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
        transition: 'border-color 0.3s ease',
      }}
    >
      {children}
    </motion.div>
  );
};

interface PulseIndicatorProps {
  color?: string;
  size?: number;
  className?: string;
}

export const PulseIndicator: React.FC<PulseIndicatorProps> = ({
  color = '#00ff88',
  size = 12,
  className = '',
}) => {
  return (
    <div
      className={`pulse-indicator ${className}`}
      style={{ position: 'relative', width: size, height: size }}
    >
      <motion.div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          position: 'absolute',
        }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [1, 0, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          position: 'absolute',
        }}
      />
    </div>
  );
};
