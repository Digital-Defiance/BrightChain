import { motion } from 'framer-motion';
import { FC, useEffect, useMemo } from 'react';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';
import './SloganRotation.css';

export const SloganRotation: FC = () => {
  const slogans = useMemo(
    () => [
      ShowcaseStrings.Slogan_Math_Search_Warrant,
      ShowcaseStrings.Slogan_Where_State_Sees_Noise,
      ShowcaseStrings.Slogan_Building_World_Where_Ideas_Have_No_Borders,
      ShowcaseStrings.Slogan_Defiance_By_Design,
    ],
    [],
  );
  const { t } = useShowcaseI18n();

  useEffect(() => {
    let currentIndex = 0;
    const sloganElement = document.querySelector(
      '.badge-slogan',
    ) as HTMLElement;

    if (!sloganElement) return;

    const rotateSlogan = () => {
      sloganElement.textContent = t(slogans[currentIndex]);
      currentIndex = (currentIndex + 1) % slogans.length;
    };

    rotateSlogan(); // Show the first slogan immediately
    const intervalId = setInterval(rotateSlogan, 5000); // Change every 5 seconds

    return () => clearInterval(intervalId);
  }, [slogans, t]);

  return (
    <motion.div
      className="hero-badge-slogan"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.6 }}
    >
      <span className="badge-slogan">{t(slogans[0])}</span>
    </motion.div>
  );
};