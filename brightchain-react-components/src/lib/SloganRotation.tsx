import { motion } from 'framer-motion';
import { FC, useEffect, useMemo, useState } from 'react';
import './SloganRotation.scss';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { BrightChainStrings } from '@brightchain/brightchain-lib';

export const SloganRotation: FC = () => {
  const slogans = useMemo(
    () => [
      BrightChainStrings.Slogan_Math_Search_Warrant,
      BrightChainStrings.Slogan_Signal_Belongs_To_You,
      BrightChainStrings.Slogan_Defiance_By_Design,
      BrightChainStrings.Slogan_BrightChain_Privacy,
      BrightChainStrings.Slogan_Speak_Freely,
      BrightChainStrings.Slogan_Distributed_By_Many,
      BrightChainStrings.Slogan_Truth_In_The_Signal,
      BrightChainStrings.Slogan_Ideas_Paper_Trail,
    ],
    [],
  );
  const { tBranded: t } = useI18n();
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