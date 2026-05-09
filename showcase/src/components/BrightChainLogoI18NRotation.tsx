import { CONSTANTS } from '@brightchain/brightchain-lib';
import { FC, useEffect, useMemo, useState } from 'react';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';
import { BrightChainLogoI18N } from './BrightChainLogoI18N';

export interface BrightChainLogoI18NRotationProps {
  primaryColor?: string;
  primarySecondaryBreak?: boolean;
  secondaryColor?: string;
  taglineColor?: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
}

export const BrightChainLogoI18NRotation: FC<
  BrightChainLogoI18NRotationProps
> = ({
  primaryColor: brightColor = CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK,
  primarySecondaryBreak = false,
  secondaryColor: chainColor = CONSTANTS.THEME_COLORS.CHAIN_BLUE_LIGHT,
  taglineColor = '#ffffff',
  className,
  style,
  width = 3151,
  height = 649,
}) => {
  const slogans = useMemo(
    () => [
      ShowcaseStrings.Slogan_Math_Search_Warrant,
      ShowcaseStrings.Slogan_Signal_Belongs_To_You,
      ShowcaseStrings.Slogan_Defiance_By_Design,
      ShowcaseStrings.Slogan_BrightChain_Privacy,
      ShowcaseStrings.Slogan_Speak_Freely,
      ShowcaseStrings.Slogan_Distributed_By_Many,
      ShowcaseStrings.Slogan_Truth_In_The_Signal,
      ShowcaseStrings.Slogan_Ideas_Paper_Trail,
    ],
    [],
  );
  const { t } = useShowcaseI18n();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slogans.length);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [slogans.length]);

  return (
    <BrightChainLogoI18N
      primaryColor={brightColor}
      primarySecondaryBreak={primarySecondaryBreak}
      taglineColor={taglineColor}
      taglineText={t(slogans[currentIndex])}
      secondaryColor={chainColor}
      className={className}
      style={style}
      width={width}
      height={height}
    />
  );
};
