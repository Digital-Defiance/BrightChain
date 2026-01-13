import { motion } from 'framer-motion';
import { FaGithub, FaNewspaper } from 'react-icons/fa';
import { GiCookingPot } from 'react-icons/gi';
import { Link } from 'react-router-dom';
import './Hero.css';

interface HeroProps {
  scrollY: number;
}

const Hero = ({ scrollY }: HeroProps) => {
  const parallaxOffset = scrollY * 0.5;

  return (
    <section className="hero" id="home">
      <div
        className="hero-background"
        style={{ transform: `translateY(${parallaxOffset}px)` }}
      >
        <div className="particles" />
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
          <span className="badge-text">
            🌟 Next-Generation Decentralized Infrastructure
          </span>
        </motion.div>

        <motion.h1
          className="hero-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          BrightChain
        </motion.h1>

        <motion.h2
          className="hero-subtitle gradient-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          Revolutionary Blockchain Without the Waste
        </motion.h2>

        <motion.p
          className="hero-description"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          Decentralized storage, homomorphic voting, and brokered anonymity—all
          powered by
          <br />
          advanced cryptography and innovative governance mechanisms.
          <br />
          <span className="hero-highlight">
            🔐 ECIES + AES-256-GCM • 🗳️ Homomorphic Voting • 🌐 P2P Storage • 🎭
            Brokered Anonymity • ⚡ Zero Mining Waste
          </span>
        </motion.p>

        <motion.div
          className="hero-cta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          <Link
            to="/minimal"
            className="btn btn-primary"
          >
            <GiCookingPot />
            🥫 Working Demo
          </Link>
          <Link
            to="/demo"
            className="btn btn-secondary"
          >
            <GiCookingPot />
            Full Demo
          </Link>
          <Link
            to="/soup"
            className="btn btn-secondary"
          >
            <GiCookingPot />
            Simple Demo
          </Link>
          <a
            href="https://github.com/Digital-Defiance/BrightChain"
            className="btn btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaGithub />
            View on GitHub
          </a>
          <a
            href="/blog"
            className="btn btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaNewspaper />
            Blog
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        className="scroll-indicator"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <div className="mouse">
          <div className="wheel" />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
