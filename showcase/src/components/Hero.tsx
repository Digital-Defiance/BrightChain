import { motion } from 'framer-motion';
import { FaGithub, FaNewspaper } from 'react-icons/fa';
import { GiCookingPot } from 'react-icons/gi';
import { Link } from 'react-router-dom';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';
import { AnimatedParticles } from './AnimatedParticles';
import './Hero.css';
import { ScrollIndicator } from './ScrollIndicator';

interface HeroProps {
  scrollY: number;
}

const Hero = ({ scrollY }: HeroProps) => {
  const { t } = useShowcaseI18n();
  const parallaxOffset = scrollY * 0.5;

  return (
    <section className="hero" id="home">
      <div
        className="hero-background"
        style={{ transform: `translateY(${parallaxOffset}px)` }}
      >
        <AnimatedParticles particleCount={60} speed={0.3} />
      </div>

      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="hero-badge"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <span className="badge-text">{t(ShowcaseStrings.Hero_Badge)}</span>
        </motion.div>

        <motion.h1
          className="hero-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <img
            src="https://raw.githubusercontent.com/Digital-Defiance/BrightChain/main/brightchain-react/src/assets/images/brightchain-tx-white.png"
            style={{ height: 137 }}
          />
        </motion.h1>

        <motion.p
          className="hero-description"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          {t(ShowcaseStrings.Hero_Description_P1)}
          <br />
          <br />
          <strong>{t(ShowcaseStrings.Hero_Description_NotCrypto)}</strong>{' '}
          {t(ShowcaseStrings.Hero_Description_P2)}
          <br />
          <span className="hero-highlight">
            {t(ShowcaseStrings.Hero_Highlight)}
          </span>
        </motion.p>

        <motion.div
          className="hero-cta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          <a href="#demo" className="btn btn-primary">
            <GiCookingPot />
            {t(ShowcaseStrings.Hero_CTA_InteractiveDemo)}
          </a>
          <Link to="/demo" className="btn btn-secondary">
            <GiCookingPot />
            {t(ShowcaseStrings.Hero_CTA_SoupDemo)}
          </Link>
          <a
            href="https://github.com/Digital-Defiance/BrightChain"
            className="btn btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaGithub />
            {t(ShowcaseStrings.Hero_CTA_GitHub)}
          </a>
          <a
            href="/blog"
            className="btn btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaNewspaper />
            {t(ShowcaseStrings.Hero_CTA_Blog)}
          </a>
        </motion.div>
      </motion.div>

      <ScrollIndicator targetId="demo" showProgress={false} />
    </section>
  );
};

export default Hero;
