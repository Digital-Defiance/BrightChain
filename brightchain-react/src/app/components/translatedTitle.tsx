// src/app/components/TranslatedTitle.tsx

import { StringNames } from '@brightchain/brightchain-lib';
import { FC, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppTranslation } from '../../i18n-provider';

const TranslatedTitle: FC = () => {
  const { i18n } = useTranslation();
  const { t } = useAppTranslation();

  useEffect(() => {
    const updateTitle = () => {
      document.title = t(StringNames.Common_Site);
    };

    updateTitle();

    // Listen for language changes
    i18n.on('languageChanged', updateTitle);

    // Cleanup listener on component unmount
    return () => {
      i18n.off('languageChanged', updateTitle);
    };
  }, [t, i18n]);

  return null;
};

export default TranslatedTitle;
