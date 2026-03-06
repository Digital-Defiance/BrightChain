import { motion } from 'framer-motion';
import { FaGithub, FaNewspaper } from 'react-icons/fa';
import { GiCookingPot } from 'react-icons/gi';
import { Link } from 'react-router-dom';
import { AnimatedParticles } from './AnimatedParticles';
import './Hero.css';
import { ScrollIndicator } from './ScrollIndicator';

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
          <span className="badge-text">🌟 The Decentralized App Platform</span>
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
          BrightChain revolutionizes data storage using the &ldquo;
          <a href="https://github.brightchain.org/docs/overview/brightchain-writeup.html">
            Bright Block Soup
          </a>
          &rdquo; concept. Your files are broken into blocks and mixed with
          random data using XOR operations, making them appear completely random
          while maintaining perfect security.
          <br />
          <br />
          <strong>Not a cryptocurrency.</strong> No coins, no mining, no proof
          of work. BrightChain values real contributions of storage and compute,
          tracked in Joules &mdash; a unit tied to real-world energy costs, not
          market speculation.
          <br />
          <span className="hero-highlight">
            🔒 Owner-Free Storage • ⚡ Energy Efficient • 🌐 Decentralized • 🎭
            Anonymous yet Accountable • 🗳️ Homomorphic Voting • 💾 Storage Over
            Power
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
            🧪 Interactive Demo
          </a>
          <Link to="/demo" className="btn btn-secondary">
            <GiCookingPot />
            🥫 BrightChain Soup Demo
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

      <ScrollIndicator targetId="demo" showProgress={false} />
    </section>
  );
};

export default Hero;
