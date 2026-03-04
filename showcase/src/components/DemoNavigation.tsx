import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './DemoNavigation.css';

export type DemoMode = 'home' | 'interactive' | 'soup' | 'minimal' | 'blog';

interface NavigationItem {
  id: DemoMode;
  label: string;
  icon: string;
  path: string;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: '🏠',
    path: '/',
    description: 'Main showcase page',
  },
  {
    id: 'soup',
    label: 'Soup Demo',
    icon: '🥫',
    path: '/demo',
    description: 'Interactive block soup visualization',
  },
  {
    id: 'blog',
    label: 'Blog',
    icon: '📝',
    path: '/blog',
    description: 'BrightChain blog and updates',
  },
];

const externalLinks = [
  {
    label: 'Docs',
    icon: '📚',
    href: '/docs/',
    description: 'Project documentation',
  },
];

interface DemoNavigationProps {
  currentMode?: DemoMode;
  onModeChange?: (mode: DemoMode) => void;
}

export const DemoNavigation: React.FC<DemoNavigationProps> = ({
  currentMode: _currentMode = 'home',
  onModeChange,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (item: NavigationItem) => {
    if (onModeChange) {
      onModeChange(item.id);
    }
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <motion.nav
      className={`demo-navigation ${isScrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">BrightChain</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="nav-items desktop">
          {navigationItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleNavClick(item)}
              title={item.description}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {isActive(item.path) && (
                <motion.div
                  className="nav-indicator"
                  layoutId="nav-indicator"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          ))}
          {externalLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="nav-item"
              title={link.description}
            >
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{link.label}</span>
            </a>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {navigationItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavClick(item)}
              >
                <span className="nav-icon">{item.icon}</span>
                <div className="nav-content">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-description">{item.description}</span>
                </div>
              </Link>
            ))}
            {externalLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="mobile-nav-item"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="nav-icon">{link.icon}</span>
                <div className="nav-content">
                  <span className="nav-label">{link.label}</span>
                  <span className="nav-description">{link.description}</span>
                </div>
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
