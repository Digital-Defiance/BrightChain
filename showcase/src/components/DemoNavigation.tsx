import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStringKey, ShowcaseStrings } from '../i18n/showcaseStrings';
import './DemoNavigation.css';
import { LanguageSelector } from './LanguageSelector';

import brightchainTxImg from '../assets/images/brightchain-tx-white.png';

export type DemoMode =
  | 'home'
  | 'interactive'
  | 'soup'
  | 'minimal'
  | 'blog'
  | 'ledger'
  | 'faq';

interface NavigationItem {
  id: DemoMode;
  label: ShowcaseStringKey;
  description: ShowcaseStringKey;
  icon: string;
  path: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: ShowcaseStrings.Nav_Home,
    description: ShowcaseStrings.Nav_Home_Description,
    icon: '🏠',
    path: '/',
  },
  {
    id: 'soup',
    label: ShowcaseStrings.Nav_SoupDemo,
    description: ShowcaseStrings.Nav_SoupDemo_Description,
    icon: '🥫',
    path: '/demo',
  },
  {
    id: 'ledger',
    label: ShowcaseStrings.Nav_Ledger,
    description: ShowcaseStrings.Nav_Ledger_Description,
    icon: '⛓️',
    path: '/ledger',
  },
  {
    id: 'blog',
    label: ShowcaseStrings.Nav_Blog,
    description: ShowcaseStrings.Nav_Blog_Description,
    icon: '📝',
    path: '/blog',
  },
  {
    id: 'faq',
    label: ShowcaseStrings.Nav_FAQ,
    description: ShowcaseStrings.Nav_FAQ_Description,
    icon: '❓',
    path: '/faq',
  },
];

interface ExternalLink {
  label: ShowcaseStringKey;
  description: ShowcaseStringKey;
  icon: string;
  href: string;
}

const externalLinks: ExternalLink[] = [
  {
    label: ShowcaseStrings.Nav_Docs,
    description: ShowcaseStrings.Nav_Docs_Description,
    icon: '📚',
    href: '/docs/',
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
  const { t } = useShowcaseI18n();
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
          <img
            src={brightchainTxImg}
            alt="BrightChain"
            style={{ height: '36px' }}
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="nav-items desktop">
          {navigationItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleNavClick(item)}
              title={t(item.description)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{t(item.label)}</span>
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
              title={t(link.description)}
            >
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{t(link.label)}</span>
            </a>
          ))}
          <LanguageSelector />
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={t(ShowcaseStrings.Nav_ToggleMenu)}
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
                  <span className="nav-label">{t(item.label)}</span>
                  <span className="nav-description">{t(item.description)}</span>
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
                  <span className="nav-label">{t(link.label)}</span>
                  <span className="nav-description">{t(link.description)}</span>
                </div>
              </a>
            ))}
            <div className="mobile-language-selector">
              <LanguageSelector />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
