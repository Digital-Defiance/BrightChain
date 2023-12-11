import { BrightChainStrings, CONSTANTS } from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import React from 'react';
import BrightChainLogo from './BrightChainLogo';

export interface BrightChainLogoI18NProps {
  primaryColor?: string;
  primarySecondaryBreak?: boolean;
  secondaryColor?: string;
  taglineColor?: string;
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
  className,
  style,
  width = 3151,
  height = 649,
}) => {
  const { tBranded: t, currentLanguage } = useI18n();

  // Use the reactive currentLanguage from the i18n engine
  // so the logo updates when the language dropdown changes.
  const languageCode = currentLanguage ?? 'en-US';

  type LogoBrandConfig = {
    first: { text: string; color: 'primary' | 'secondary' };
    second: { text: string; color: 'primary' | 'secondary' };
    break: boolean;
  };

  const logoBrandConfig: Record<string, LogoBrandConfig> = {
    'en-US': {
      first: {
        text: t(BrightChainStrings.Common_Bright, undefined, 'en-US'),
        color: 'primary',
      },
      second: {
        text: t(BrightChainStrings.Common_Chain, undefined, 'en-US'),
        color: 'secondary',
      },
      break: false,
    },
    'en-GB': {
      first: {
        text: t(BrightChainStrings.Common_Bright, undefined, 'en-GB'),
        color: 'primary',
      },
      second: {
        text: t(BrightChainStrings.Common_Chain, undefined, 'en-GB'),
        color: 'secondary',
      },
      break: false,
    },
    de: {
      first: {
        text: t(BrightChainStrings.Common_Bright, undefined, 'de'),
        color: 'primary',
      },
      second: {
        text: t(BrightChainStrings.Common_Chain, undefined, 'de'),
        color: 'secondary',
      },
      break: false,
    },
    ja: {
      first: {
        text: t(BrightChainStrings.Common_Bright, undefined, 'ja'),
        color: 'primary',
      },
      second: {
        text: t(BrightChainStrings.Common_Chain, undefined, 'ja'),
        color: 'secondary',
      },
      break: false,
    },
    'zh-CN': {
      first: {
        text: t(BrightChainStrings.Common_Bright, undefined, 'zh-CN'),
        color: 'primary',
      },
      second: {
        text: t(BrightChainStrings.Common_Chain, undefined, 'zh-CN'),
        color: 'secondary',
      },
      break: false,
    },
    // Adjective-after-noun languages: "Chain" first, "Bright" second
    fr: {
      first: {
        text: t(BrightChainStrings.Common_Chain, undefined, 'fr'),
        color: 'secondary',
      },
      second: {
        text: t(BrightChainStrings.Common_Bright, undefined, 'fr'),
        color: 'primary',
      },
      break: false,
    },
    es: {
      first: {
        text: t(BrightChainStrings.Common_Chain, undefined, 'es'),
        color: 'secondary',
      },
      second: {
        text: t(BrightChainStrings.Common_Bright, undefined, 'es'),
        color: 'primary',
      },
      break: false,
    },
    // Same order as English, but needs space (not a compound word)
    uk: {
      first: {
        text: t(BrightChainStrings.Common_Bright, undefined, 'uk'),
        color: 'primary',
      },
      second: {
        text: t(BrightChainStrings.Common_Chain, undefined, 'uk'),
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
    taglineText: t(
      BrightChainStrings.Common_PrivacyParticipationPower,
      undefined,
      languageCode,
    ),
    className,
    style,
    width,
    height,
  });
};
