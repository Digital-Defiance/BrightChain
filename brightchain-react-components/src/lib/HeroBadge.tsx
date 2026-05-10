import { motion } from 'framer-motion';
import { FC } from 'react';
import './HeroBadge.css';

export interface HeroBadgeProps {
  text: string;
}

export const HeroBadge: FC<HeroBadgeProps> = ({ text }) => {
  return (
    <motion.div
      className="hero-badge-widget"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.6 }}
    >
      <span className="badge-text-widget">{text}</span>
    </motion.div>
  );
};
