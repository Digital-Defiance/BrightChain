import { CONSTANTS } from '@brightchain/brightchain-lib';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { ReactNode } from 'react';
import './BrightChainLogo.scss';

export interface BrightChainSubLogoProps {
  leadText?: string;
  subText: string;
  icon?: IconProp;
  iconColor?: string;
  customIcon?: ReactNode;
  iconHeight?: number | string;
  leadColor?: string;
  subColor?: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  additionalText?: string;
  additionalColor?: string;
  altText?: string;
}

export const BrightChainSubLogo: React.FC<BrightChainSubLogoProps> = ({
  leadText,
  subText,
  icon,
  iconColor: iconColor = CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK,
  customIcon,
  leadColor: leadColor = CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK,
  subColor: subColor = CONSTANTS.THEME_COLORS.CHAIN_BLUE_LIGHT,
  className,
  style,
  width: _width = 200,
  height = 40,
  iconHeight = 32,
  additionalText,
  additionalColor,
  altText,
}) => (
  <div
    role="img"
    aria-label={altText}
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
        style={{ fontSize: iconHeight, color: iconColor }}
      />
    )}
    {customIcon !== undefined && customIcon}
    <span
      style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
        fontSize: `${Number(height) * 0.6}px`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: leadColor }}>{leadText ?? 'Bright'}</span>
      <span style={{ color: subColor }}>{subText}</span>
      {additionalText !== undefined && (
        <span style={{ color: additionalColor ?? subColor }}>
          {' '}
          {additionalText}
        </span>
      )}
    </span>
  </div>
);

export default BrightChainSubLogo;
