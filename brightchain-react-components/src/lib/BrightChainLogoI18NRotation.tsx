import { FC, useEffect, useMemo, useState } from 'react';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { BrightChainStrings, CONSTANTS } from '@brightchain/brightchain-lib';
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

export const BrightChainLogoI18NRotation: FC<BrightChainLogoI18NRotationProps> = ({
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
      BrightChainStrings.Slogan_Math_Search_Warrant,
      BrightChainStrings.Slogan_Signal_Belongs_To_You,
      BrightChainStrings.Slogan_Defiance_By_Design,
      BrightChainStrings.Slogan_BrightChain_Privacy,
      BrightChainStrings.Slogan_Speak_Freely,
      BrightChainStrings.Slogan_Distributed_By_Many,
      BrightChainStrings.Slogan_Truth_In_The_Signal,
      BrightChainStrings.Slogan_Ideas_Paper_Trail,
    ],
    [],
  );
  const { tBranded: t } = useI18n();
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