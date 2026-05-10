/**
 * PasswordGeneratorPage — Standalone password generator page.
 *
 * Wraps PasswordGeneratorWidget in a page layout with BreadcrumbNav.
 * Accessible from `/brightpass/tools/generator`.
 *
 * Requirements: 6.6
 */

import { BrightPassStrings } from '@brightchain/brightpass-lib';
import { Container, Typography } from '@mui/material';
import React from 'react';
import BreadcrumbNav from '../components/BreadcrumbNav';
import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';
import PasswordGeneratorWidget from '../widgets/PasswordGeneratorWidget';

const PasswordGeneratorPage: React.FC = () => {
  const { t } = useBrightPassTranslation();

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <BreadcrumbNav />
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        {t(BrightPassStrings.PasswordGen_Title)}
      </Typography>
      <PasswordGeneratorWidget />
    </Container>
  );
};

export default PasswordGeneratorPage;
