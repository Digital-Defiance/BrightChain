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
              <strong>BrightChain</strong> embodies this vision by reimagining
              blockchain technology from the ground up. By eliminating mining
              waste, monetizing unused storage, and implementing revolutionary
              features like homomorphic voting and brokered anonymity, we've
              created a platform that works for everyone—from individual users
              to global organizations.
            </p>
            <p>
              Built on <strong>Ethereum's keyspace</strong> but departing from
              traditional proof-of-work systems, BrightChain combines the{' '}
              <strong>Owner-Free File System</strong> for legal protection with
              advanced cryptography (ECIES, AES-256-GCM, Paillier homomorphic
              encryption) to deliver unprecedented capabilities.
            </p>
            <p className="highlight-text">
              <FaCode /> <strong>100% Open Source.</strong> BrightChain is
              freely available under the MIT License. Every line of code is open
              for inspection, improvement, and contribution. Join us in building
              the future of decentralized infrastructure.
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
              <h4>Open Source First</h4>
              <p>
                MIT licensed and community-driven. Every line of code is open
                for inspection, improvement, and contribution.
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
              <h4>Revolutionary Technology</h4>
              <p>
                Cutting-edge cryptography, homomorphic voting, and decentralized
                storage that pushes the boundaries of what's possible.
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
              <h4>Community Driven</h4>
              <p>
                Built for the people, by the people. We listen to feedback and
                continuously improve based on real-world needs.
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
            <a
              href="https://github.com/Digital-Defiance/BrightChain/blob/main/docs/BrightChain%20Summary.md"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
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
          </p>
        </div>
      </motion.div>
    </section>
  );
};

export default About;
