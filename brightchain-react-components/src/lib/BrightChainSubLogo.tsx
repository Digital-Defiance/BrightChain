import { CONSTANTS } from '@brightchain/brightchain-lib';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import './BrightChainLogo.scss';

export interface BrightChainSubLogoProps {
  subText: string;
  icon?: IconProp;
  iconHeight?: number | string;
  brightColor?: string;
  subColor?: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
}

export const BrightChainSubLogo: React.FC<BrightChainSubLogoProps> = ({
  subText,
  icon,
  brightColor = CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK,
  subColor: subColor = CONSTANTS.THEME_COLORS.CHAIN_BLUE_LIGHT,
  className,
  style,
  width = 200,
  height = 40,
  iconHeight = 32,
}) => (
  <div
    className={className}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '3px',
      height,
      ...style,
    }}
  > 
    {icon !== undefined && (
    <FontAwesomeIcon
      icon={icon}
      style={{ fontSize: iconHeight, color: brightColor }}
    />)}
    <span
      style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
        fontSize: `${Number(height) * 0.6}px`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: brightColor }}>Bright</span>
      <span style={{ color: subColor }}>{subText}</span>
    </span>
  </div>
);

export default BrightChainSubLogo;
