import React from 'react';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';
import './SkipLink.css';

export const SkipLink: React.FC = () => {
  const { t } = useShowcaseI18n();
  return (
    <a href="#main-content" className="skip-link">
      {t(ShowcaseStrings.SkipLink_Text)}
    </a>
  );
};
