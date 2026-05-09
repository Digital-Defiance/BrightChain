import { motion } from 'framer-motion';
import { FC, useEffect, useMemo, useState } from 'react';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';
import './SloganRotation.css';

export const SloganRotation: FC = () => {
  const slogans = useMemo(
    () => [
      ShowcaseStrings.Slogan_Math_Search_Warrant,
      ShowcaseStrings.Slogan_Signal_Belongs_To_You,
      ShowcaseStrings.Slogan_Defiance_By_Design,
      ShowcaseStrings.Slogan_BrightChain_Privacy,
      ShowcaseStrings.Slogan_Speak_Freely,
      ShowcaseStrings.Slogan_Distributed_By_Many,
      ShowcaseStrings.Slogan_Truth_In_The_Signal,
      ShowcaseStrings.Slogan_Ideas_Paper_Trail,
    ],
    [],
  );
  const { t } = useShowcaseI18n();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slogans.length);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [slogans.length]);

  return (
    <motion.div
      className="hero-badge-slogan"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.6 }}
    >
      <span className="badge-slogan">{t(slogans[currentIndex])}</span>
    </motion.div>
  );
};