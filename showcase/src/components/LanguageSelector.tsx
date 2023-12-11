import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import {
  supportedLanguages,
  useShowcaseI18n,
} from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';
import './LanguageSelector.css';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t, isLoading } = useShowcaseI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = supportedLanguages.find((l) => l.code === language);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: typeof language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="language-selector" ref={containerRef}>
      <button
        className={`language-selector-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t(ShowcaseStrings.Lang_Select)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={isLoading}
      >
        <span className="lang-icon">🌐</span>
        <span className="lang-code">
          {currentLang?.nativeName.split(' ')[0] ?? 'EN'}
        </span>
        <span className={`lang-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            className="language-dropdown"
            role="listbox"
            aria-label={t(ShowcaseStrings.Lang_Select)}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {supportedLanguages.map((lang) => (
              <li key={lang.code}>
                <button
                  className={`language-option ${language === lang.code ? 'active' : ''}`}
                  onClick={() => handleSelect(lang.code)}
                  role="option"
                  aria-selected={language === lang.code}
                >
                  <span className="lang-native">{lang.nativeName}</span>
                  {language === lang.code && (
                    <span className="lang-check">✓</span>
                  )}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};
