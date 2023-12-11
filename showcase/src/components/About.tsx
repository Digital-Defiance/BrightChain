import { motion } from 'framer-motion';
import {
  FaCode,
  FaGithub,
  FaHeart,
  FaLightbulb,
  FaRocket,
  FaUsers,
} from 'react-icons/fa';
import { GiCookingPot } from 'react-icons/gi';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import buildWithBrightStackImg from '../assets/images/build-with-brightstack.png';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';
import './About.css';

const About = () => {
  const { t } = useShowcaseI18n();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="about section" id="about" ref={ref}>
      <motion.div
        className="about-container"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
      >
        <h2 className="section-title">
          {t(ShowcaseStrings.About_Title_BuiltWith)}{' '}
          <span className="gradient-text">❤️</span>{' '}
          {t(ShowcaseStrings.About_Title_By)}
        </h2>
        <p className="about-subtitle">{t(ShowcaseStrings.About_Subtitle)}</p>

        <div className="about-content">
          <motion.div
            className="about-main card"
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h3 className="about-heading">
              <FaRocket /> {t(ShowcaseStrings.About_Vision_Title)}
            </h3>
            <p>{t(ShowcaseStrings.About_Vision_P1)}</p>
            <p>{t(ShowcaseStrings.About_Vision_P2)}</p>
            <p>{t(ShowcaseStrings.About_Vision_NotCrypto)}</p>
            <p>{t(ShowcaseStrings.About_Vision_StorageDensity)}</p>

            <h3 className="about-heading" style={{ marginTop: '2rem' }}>
              <img height="40" width="397" src={buildWithBrightStackImg} />
            </h3>
            <p>{t(ShowcaseStrings.About_BrightStack_P1)}</p>
            <p>{t(ShowcaseStrings.About_BrightStack_P2)}</p>
            <p>{t(ShowcaseStrings.About_BrightStack_P3)}</p>
            <p className="highlight-text">
              <FaCode /> {t(ShowcaseStrings.About_OpenSource)}
            </p>
            <p>{t(ShowcaseStrings.About_WorkInProgress)}</p>

            <h3 className="about-heading" style={{ marginTop: '2rem' }}>
              <FaCode /> {t(ShowcaseStrings.About_OtherImpl_Title)}
            </h3>
            <p>
              {t(ShowcaseStrings.About_OtherImpl_P1_Before)}
              <a
                href="https://github.com/Digital-Defiance/brightchain-cpp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>{t(ShowcaseStrings.About_OtherImpl_P1_CppLink)}</strong>
              </a>{' '}
              <a
                href="https://github.com/Digital-Defiance/BrightChain-Apple"
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>
                  {t(ShowcaseStrings.About_OtherImpl_P1_AppleLink)}
                </strong>
              </a>
              {t(ShowcaseStrings.About_OtherImpl_P1_After)}
            </p>
          </motion.div>

          <div className="about-features">
            <motion.div
              className="feature-card card"
              initial={{ opacity: 0, x: -30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="feature-icon">
                <FaHeart />
              </div>
              <h4>{t(ShowcaseStrings.About_Feature_OwnerFree_Title)}</h4>
              <p>{t(ShowcaseStrings.About_Feature_OwnerFree_Desc)}</p>
            </motion.div>

            <motion.div
              className="feature-card card"
              initial={{ opacity: 0, x: -30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <div className="feature-icon">
                <FaCode />
              </div>
              <h4>{t(ShowcaseStrings.About_Feature_EnergyEfficient_Title)}</h4>
              <p>{t(ShowcaseStrings.About_Feature_EnergyEfficient_Desc)}</p>
            </motion.div>

            <motion.div
              className="feature-card card"
              initial={{ opacity: 0, x: -30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <div className="feature-icon">
                <FaUsers />
              </div>
              <h4>{t(ShowcaseStrings.About_Feature_Anonymous_Title)}</h4>
              <p>{t(ShowcaseStrings.About_Feature_Anonymous_Desc)}</p>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="about-cta"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <h3>{t(ShowcaseStrings.About_CTA_Title)}</h3>
          <p>{t(ShowcaseStrings.About_CTA_Desc)}</p>
          <div className="cta-buttons">
            <Link to="/demo" className="btn btn-primary">
              <GiCookingPot />
              {t(ShowcaseStrings.About_CTA_InteractiveDemo)}
            </Link>
            <a
              href="https://digitaldefiance.org"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <FaLightbulb />
              {t(ShowcaseStrings.About_CTA_LearnMore)}
            </a>
            <a
              href="https://github.com/Digital-Defiance/BrightChain"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <FaGithub />
              {t(ShowcaseStrings.About_CTA_GitHub)}
            </a>
            <a href="/docs/" className="btn btn-secondary">
              <FaCode />
              {t(ShowcaseStrings.About_CTA_Docs)}
            </a>
          </div>
        </motion.div>

        <div className="about-footer">
          <p>{t(ShowcaseStrings.About_Footer_CopyrightTemplate)}</p>
          <p className="footer-links">
            <a
              href="https://github.com/Digital-Defiance/BrightChain/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
            >
              MIT License
            </a>
            {' • '}
            <a
              href="https://github.com/Digital-Defiance/BrightChain"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            {' • '}
            <a
              href="https://www.npmjs.com/org/digitaldefiance"
              target="_blank"
              rel="noopener noreferrer"
            >
              NPM
            </a>
            {' • '}
            <a href="/demo" rel="noopener noreferrer">
              {t(ShowcaseStrings.Hero_CTA_SoupDemo)}
            </a>
            {' • '}
            <a href="/docs/">{t(ShowcaseStrings.Nav_Docs)}</a>
          </p>
        </div>
      </motion.div>
    </section>
  );
};

export default About;
