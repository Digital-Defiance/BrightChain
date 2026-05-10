import { BrightChainStrings } from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { CSSProperties, FC, ReactNode } from 'react';
import BrightChainSubLogo from './BrightChainSubLogo';

export interface SubspaceLatticeLogoI18NProps {
  icon?: IconProp;
  iconColor?: string;
  customIcon?: ReactNode;
  iconHeight?: number | string;
  leadColor?: string;
  subColor?: string;
  className?: string;
  style?: CSSProperties;
  width?: number | string;
  height?: number | string;
  additionalText?: string;
  additionalColor?: string;
  altText?: string;
}

export const SubspaceLatticeLogoI18N: FC<SubspaceLatticeLogoI18NProps> = ({
  icon,
  iconColor,
  customIcon,
  iconHeight,
  leadColor,
  subColor,
  className,
  style,
  width,
  height,
  additionalText,
  additionalColor,
  altText,
}) => {
  const { tBranded: t, currentLanguage } = useI18n();
  const languageOrderMap: Record<string, [string, string]> = {
    // SubspaceLattice
    'en-US': [t(BrightChainStrings.Subspace), t(BrightChainStrings.Lattice)],
    'en-GB': [t(BrightChainStrings.Subspace), t(BrightChainStrings.Lattice)],
    // TreillisSubspatial
    'fr': [t(BrightChainStrings.Lattice), t(BrightChainStrings.Subspace)],
    // SubraumGitter
    'de': [t(BrightChainStrings.Subspace), t(BrightChainStrings.Lattice)],
    // RedSubespacial
    'es': [t(BrightChainStrings.Lattice), t(BrightChainStrings.Subspace)],
    // サブスペース格子
    'ja': [t(BrightChainStrings.Subspace), t(BrightChainStrings.Lattice)],
    // 子空间格
    'zh-ZH': [t(BrightChainStrings.Subspace), t(BrightChainStrings.Lattice)],
    // ПідпросторРешітка
    'uk-UA': [t(BrightChainStrings.Subspace), t(BrightChainStrings.Lattice)],
  };
  const [leadText, subText] =
    languageOrderMap[currentLanguage] ?? languageOrderMap['en-US'];

  return (
    <BrightChainSubLogo
      leadText={leadText}
      subText={subText}
      icon={icon}
      iconColor={iconColor}
      customIcon={customIcon}
      iconHeight={iconHeight}
      leadColor={leadColor}
      subColor={subColor}
      className={className}
      style={style}
      width={width}
      height={height}
      additionalText={additionalText}
      additionalColor={additionalColor}
      altText={altText}
    />
  );
};
