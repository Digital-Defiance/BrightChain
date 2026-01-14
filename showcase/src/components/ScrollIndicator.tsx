import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './ScrollIndicator.css';

interface ScrollIndicatorProps {
  targetId?: string;
  showProgress?: boolean;
}

export const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({ 
  targetId = 'demo',
  showProgress = false 
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      
      setScrollProgress(progress);
      setIsVisible(scrollTop < 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      {isVisible && (
        <motion.div
          className="scroll-indicator"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          onClick={handleClick}
        >
          <motion.div
            className="scroll-mouse"
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            <div className="mouse-body">
              <div className="mouse-wheel" />
            </div>
          </motion.div>
          <div className="scroll-text">Scroll to explore</div>
        </motion.div>
      )}

      {showProgress && (
        <motion.div
          className="scroll-progress"
          style={{ width: `${scrollProgress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${scrollProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      )}
    </>
  );
};
