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
import './About.css';

const About = () => {
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
          Built with <span className="gradient-text">❤️</span> by Digital
          Defiance
        </h2>
        <p className="about-subtitle">
          Open source innovation in decentralized infrastructure
        </p>

        <div className="about-content">
          <motion.div
            className="about-main card"
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h3 className="about-heading">
              <FaRocket /> Our Vision
            </h3>
            <p>
              At <strong>Digital Defiance</strong>, we believe in empowering
              individuals and organizations with truly decentralized
              infrastructure that respects privacy, promotes sustainability, and
              enables democratic participation.
            </p>
            <p>
              <strong>BrightChain</strong> revolutionizes data storage using the
              &ldquo;Bright Block Soup&rdquo; concept. Your files are broken
              into blocks and mixed with random data using XOR operations,
              making them appear completely random while maintaining perfect
              security. By eliminating mining waste, monetizing unused storage,
              and implementing features like homomorphic voting and brokered
              anonymity, we&rsquo;ve created a platform that works for everyone.
            </p>
            <p>
              <strong>Not a Cryptocurrency.</strong> When you hear
              &ldquo;blockchain,&rdquo; you probably think Bitcoin. BrightChain
              has no currency, no proof of work, and no mining. Instead of
              burning energy to mint coins, BrightChain values real
              contributions of storage and compute. Those contributions are
              tracked in a unit called the <strong>Joule</strong>, which is tied
              to real-world energy costs by formula &mdash; not market
              speculation. You can&rsquo;t mine Joules or trade them; they
              reflect actual resource costs, and we refine that formula over
              time.
            </p>
            <p>
              <strong>The Storage vs. Power Density Advantage</strong>: Every
              blockchain has waste somewhere. BrightChain cuts down on waste in
              every way possible, but does have some overhead in the way of its
              storage mechanism. However, storage is one of the areas that has
              been the most cost-effective and where we've achieved massive
              density in recent years, whereas datacenters are struggling to
              achieve the needed power density for CPU requirements of
              blockchains and AI. The tradeoff of minimal storage overhead for
              anonymity and absolution of concern from copyright lawsuits and
              the like, or hosting inappropriate material, enables everyone to
              be all in and make the most out of our vast storage resources
              spread out across the globe.
            </p>

            <h3 className="about-heading" style={{ marginTop: '2rem' }}>
              <img
                height="40"
                width="397"
                src="https://raw.githubusercontent.com/Digital-Defiance/BrightChain/main/brightchain-react/src/assets/images/build-with-brightstack.png"
              />
            </h3>
            <p>
              <strong>BrightStack</strong> is the full-stack paradigm for
              decentralized apps: BrightChain + Express + React + Node. If you
              know the MERN stack, you already know BrightStack &mdash; just
              swap MongoDB for <strong>BrightDB</strong>.
            </p>
            <p>
              <strong>BrightDB</strong> is a MongoDB-like document database on
              the Owner-Free Filesystem with full CRUD, queries, indexes,
              transactions, and aggregation pipelines. Same patterns you use
              with MongoDB &mdash; collections, find, insert, update &mdash; but
              every document is stored as privacy-preserving whitened blocks.
            </p>
            <p>
              BrightPass, BrightMail, and BrightHub were all built on
              BrightStack, proving that decentralized app development can be as
              easy as traditional full-stack.
            </p>
            <p className="highlight-text">
              <FaCode /> <strong>100% Open Source.</strong> BrightChain is fully
              open source under the MIT License. Build your own dApps on
              BrightStack and contribute to the decentralized future.
            </p>
            <p>BrightChain is a work in progress. Presently, we aim to leave the
              build stable on a daily basis, but things can slip through the
              cracks and BrightChain is not yet mature. We apologize for any
              inconvenience or instability.
            </p>

            <h3 className="about-heading" style={{ marginTop: '2rem' }}>
              <FaCode /> Other Implementations
            </h3>
            <p>
              While this TypeScript/Node.js implementation is the primary and
              most mature version of BrightChain, a parallel{' '}
              <a
                href="https://github.com/Digital-Defiance/brightchain-cpp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>C++ core library</strong>
              </a>{' '}
              with{' '}
              <a
                href="https://github.com/Digital-Defiance/BrightChain-Apple"
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>macOS/iOS UI</strong>
              </a>{' '}
              is in development. This native implementation brings BrightChain's
              privacy and security features to Apple platforms. Both
              repositories are in early development and not yet ready for
              production use.
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
              <h4>Owner-Free Storage</h4>
              <p>
                Cryptographic randomness removes storage liability. No single
                block contains identifiable content, providing legal immunity
                for node operators.
              </p>
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
              <h4>Energy Efficient</h4>
              <p>
                No wasteful proof-of-work mining. All computation serves useful
                purposes — storage, verification, and network operations.
              </p>
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
              <h4>Anonymous yet Accountable</h4>
              <p>
                Privacy with moderation capabilities. Brokered anonymity
                balances privacy with accountability via quorum consensus.
              </p>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="about-cta"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <h3>Join the Revolution</h3>
          <p>
            Help us build the future of decentralized infrastructure. Contribute
            to BrightChain, report issues, or star us on GitHub to show your
            support for sustainable blockchain technology.
          </p>
          <div className="cta-buttons">
            <Link to="/demo" className="btn btn-primary">
              <GiCookingPot />
              🥫 Interactive Demo
            </Link>
            <a
              href="https://digitaldefiance.org"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <FaLightbulb />
              Learn More
            </a>
            <a
              href="https://github.com/Digital-Defiance/BrightChain"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <FaGithub />
              Visit BrightChain on GitHub
            </a>
            <a href="/docs/" className="btn btn-secondary">
              <FaCode />
              Read the Documentation
            </a>
          </div>
        </motion.div>

        <div className="about-footer">
          <p>
            © {new Date().getFullYear()} Digital Defiance. Made with{' '}
            <span className="heart">❤️</span> for the development community.
          </p>
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
              Interactive Demo
            </a>
            {' • '}
            <a href="/docs/">Documentation</a>
          </p>
        </div>
      </motion.div>
    </section>
  );
};

export default About;
