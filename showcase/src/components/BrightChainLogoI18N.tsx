import { CONSTANTS } from '@brightchain/brightchain-lib';
import { BrightChainLogo } from '@brightchain/brightchain-react-components';
import React from 'react';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';

export interface BrightChainLogoI18NProps {
  primaryColor?: string;
  primarySecondaryBreak?: boolean;
  secondaryColor?: string;
  taglineColor?: string;
  taglineText?: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
}

export const BrightChainLogoI18N: React.FC<BrightChainLogoI18NProps> = ({
  primaryColor: brightColor = CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK,
  primarySecondaryBreak = false,
  secondaryColor: chainColor = CONSTANTS.THEME_COLORS.CHAIN_BLUE_LIGHT,
  taglineColor = '#ffffff',
  taglineText,
  className,
  style,
  width,
  height = 600,
}) => {
  const { t, language } = useShowcaseI18n();

  // Use the reactive currentLanguage from the i18n engine
  // so the logo updates when the language dropdown changes.
  const languageCode = language ?? 'en-US';

  type LogoBrandConfig = {
    first: { text: string; color: 'primary' | 'secondary' };
    second: { text: string; color: 'primary' | 'secondary' };
    break: boolean;
  };

  const logoBrandConfig: Record<string, LogoBrandConfig> = {
    'en-US': {
      first: {
        text: t(ShowcaseStrings.Common_Bright, undefined, 'en-US'),
        color: 'primary',
      },
      second: {
        text: t(ShowcaseStrings.Common_Chain, undefined, 'en-US'),
        color: 'secondary',
      },
      break: false,
    },
    'en-GB': {
      first: {
        text: t(ShowcaseStrings.Common_Bright, undefined, 'en-GB'),
        color: 'primary',
      },
      second: {
        text: t(ShowcaseStrings.Common_Chain, undefined, 'en-GB'),
        color: 'secondary',
      },
      break: false,
    },
    de: {
      first: {
        text: t(ShowcaseStrings.Common_Bright, undefined, 'de'),
        color: 'primary',
      },
      second: {
        text: t(ShowcaseStrings.Common_Chain, undefined, 'de'),
        color: 'secondary',
      },
      break: false,
    },
    ja: {
      first: {
        text: t(ShowcaseStrings.Common_Bright, undefined, 'ja'),
        color: 'primary',
      },
      second: {
        text: t(ShowcaseStrings.Common_Chain, undefined, 'ja'),
        color: 'secondary',
      },
      break: false,
    },
    'zh-CN': {
      first: {
        text: t(ShowcaseStrings.Common_Bright, undefined, 'zh-CN'),
        color: 'primary',
      },
      second: {
        text: t(ShowcaseStrings.Common_Chain, undefined, 'zh-CN'),
        color: 'secondary',
      },
      break: false,
    },
    // Adjective-after-noun languages: "Chain" first, "Bright" second
    fr: {
      first: {
        text: t(ShowcaseStrings.Common_Chain, undefined, 'fr'),
        color: 'secondary',
      },
      second: {
        text: t(ShowcaseStrings.Common_Bright, undefined, 'fr'),
        color: 'primary',
      },
      break: false,
    },
    es: {
      first: {
        text: t(ShowcaseStrings.Common_Chain, undefined, 'es'),
        color: 'secondary',
      },
      second: {
        text: t(ShowcaseStrings.Common_Bright, undefined, 'es'),
        color: 'primary',
      },
      break: false,
    },
    // Same order as English, but needs space (not a compound word)
    uk: {
      first: {
        text: t(ShowcaseStrings.Common_Bright, undefined, 'uk'),
        color: 'primary',
      },
      second: {
        text: t(ShowcaseStrings.Common_Chain, undefined, 'uk'),
        color: 'secondary',
      },
      break: true,
    },
  };

  const primaryText =
    logoBrandConfig[languageCode]?.first.text ??
    logoBrandConfig['en-US']?.first.text;
  const secondaryText =
    logoBrandConfig[languageCode]?.second.text ??
    logoBrandConfig['en-US']?.second.text;

  return BrightChainLogo({
    primaryColor: brightColor,
    primaryText: primaryText,
    primarySecondaryBreak,
    secondaryColor: chainColor,
    secondaryText: secondaryText,
    taglineColor,
    taglineText:
      taglineText ??
      t(
        ShowcaseStrings.Common_PrivacyParticipationPower,
        undefined,
        languageCode,
      ),
    className,
    style,
    width,
    height,
  });
};
