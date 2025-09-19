// CurseFund-react/src/app/components/user-language-selector.tsx

import { StringLanguages } from '@brightchain/brightchain-lib';
import { Button, Menu, MenuItem } from '@mui/material';
import { FC, MouseEvent, useState } from 'react';
import { useAuth } from '../../auth-provider';
import { Flag } from './flag';

export const UserLanguageSelector: FC = () => {
  const { language, setLanguage } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (newLanguage: StringLanguages) => {
    setLanguage(newLanguage);
    handleClose();
  };

  return (
    <>
      <Button onClick={handleClick}>
        <Flag language={language} />
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {Object.values(StringLanguages).map((lang) => (
          <MenuItem key={lang} onClick={() => handleLanguageChange(lang)}>
            <Flag language={lang} sx={{ mr: 1 }} /> {lang}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
