import React from 'react';
import { motion } from 'framer-motion';

interface AmbientAnimationsProps {
  type?: 'floating' | 'pulsing' | 'breathing' | 'shimmer';
  intensity?: 'low' | 'medium' | 'high';
  children: React.ReactNode;
  className?: string;
}

const animationVariants = {
  floating: {
    low: {
      y: [0, -5, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
    medium: {
      y: [0, -10, 0],
      x: [0, 5, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
    high: {
      y: [0, -15, 0],
      x: [0, 10, 0],
      rotate: [0, 2, 0],
      transition: {
        duration: 2.5,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
  },
  pulsing: {
    low: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
    medium: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
    high: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
  },
  breathing: {
    low: {
      opacity: [0.8, 1, 0.8],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
    medium: {
      opacity: [0.7, 1, 0.7],
      scale: [0.98, 1, 0.98],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
    high: {
      opacity: [0.6, 1, 0.6],
      scale: [0.95, 1, 0.95],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
  },
  shimmer: {
    low: {
      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      transition: {
        duration: 5,
        repeat: Infinity,
        ease: 'linear' as const,
      },
    },
    medium: {
      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'linear' as const,
      },
    },
    high: {
      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'linear' as const,
      },
    },
  },
};

export const AmbientAnimation: React.FC<AmbientAnimationsProps> = ({
  type = 'floating',
  intensity = 'medium',
  children,
  className = '',
}) => {
  const animation = animationVariants[type][intensity];

  return (
    <motion.div
      className={`ambient-animation ${type} ${intensity} ${className}`}
      animate={animation}
    >
      {children}
    </motion.div>
  );
};

interface IdleStateAnimationProps {
  children: React.ReactNode;
  className?: string;
}

export const IdleStateAnimation: React.FC<IdleStateAnimationProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`idle-state-animation ${className}`}>
      <motion.div
        animate={{
          y: [0, -8, 0],
          rotate: [0, 1, -1, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        }}
      >
        {children}
      </motion.div>
      
      {/* Subtle glow effect */}
      <motion.div
        className="idle-glow"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120%',
          height: '120%',
          background: 'radial-gradient(circle, rgba(0, 255, 136, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: -1,
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        }}
      />
    </div>
  );
};

interface BackgroundAmbientProps {
  className?: string;
}

export const BackgroundAmbient: React.FC<BackgroundAmbientProps> = ({
  className = '',
}) => {
  return (
    <div className={`background-ambient ${className}`}>
      {/* Floating orbs */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="ambient-orb"
          style={{
            position: 'absolute',
            width: `${50 + i * 20}px`,
            height: `${50 + i * 20}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${
              i % 2 === 0 ? 'rgba(0, 255, 136, 0.1)' : 'rgba(0, 153, 255, 0.1)'
            } 0%, transparent 70%)`,
            left: `${10 + i * 20}%`,
            top: `${20 + i * 15}%`,
            pointerEvents: 'none',
            filter: 'blur(20px)',
          }}
          animate={{
            x: [0, 30, -30, 0],
            y: [0, -40, 40, 0],
            scale: [1, 1.2, 0.8, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut' as const,
            delay: i * 0.5,
          }}
        />
      ))}
    </div>
  );
};
