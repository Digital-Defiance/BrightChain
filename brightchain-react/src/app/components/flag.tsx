import { LanguageFlags, StringLanguages } from '@BrightChain/brightchain-lib';
import { Box, SxProps, Theme } from '@mui/material';
import { FC } from 'react';

export interface FlagProps {
  language: StringLanguages;
  sx?: SxProps<Theme>;
}

/**
 * A simple component to display a flag icon for a given language.
 *
 * Props:
 *   language: The language to display a flag for, as a StringLanguages enum value.
 *   sx: Optional styles to apply to the component.
 *
 * Returns a Box component with an SVG flag icon from flagcdn.com as a ::before pseudo-element.
 * The flag is sized to 1.5rem by default, but can be overridden by passing a custom sx prop.
 * The component also includes an aria-label for accessibility, set to `Flag for <language>`.
 */
export const Flag: FC<FlagProps> = ({ language, sx }) => {
  if (!LanguageFlags[language]) {
    return null;
  }
  const flagContent = LanguageFlags[language];
  return (
    <Box
      component="span"
      aria-label={`Flag for ${language}`}
      sx={{
        fontSize: '1.5rem', // Adjust size as needed
        lineHeight: 1,
        verticalAlign: 'middle',
        '&::before': {
          content: `" "`,
          display: 'inline-block',
          width: '1em',
          height: '1em',
          backgroundImage: `url(https://flagcdn.com/${flagContent.toLowerCase()}.svg)`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        },
        ...sx, // This allows passing additional styles through props
      }}
    />
  );
};
