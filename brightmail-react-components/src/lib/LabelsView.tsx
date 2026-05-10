/**
 * LabelsView — Manage email labels/tags.
 *
 * Displays the user's custom labels and allows creating, editing,
 * and deleting labels for organizing emails.
 *
 * Requirements: 3.3
 */

import { BrightMailStrings } from '@brightchain/brightmail-lib';
import LabelIcon from '@mui/icons-material/Label';
import { Box, Typography } from '@mui/material';
import type { FC } from 'react';

import { useBrightMailTranslation } from './hooks/useBrightMailTranslation';

export interface LabelsViewProps {
  /** Optional initial labels to display */
  labels?: string[];
}

/**
 * LabelsView — placeholder for label management.
 * TODO: Wire up label CRUD operations when the labels API is implemented.
 */
const LabelsView: FC<LabelsViewProps> = () => {
  const { t } = useBrightMailTranslation();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <LabelIcon color="action" />
        <Typography variant="h5" component="h1">
          {t(BrightMailStrings.Nav_Labels)}
        </Typography>
      </Box>
      <Typography variant="body1" color="text.secondary">
        Label management is coming soon. Labels will allow you to organize your
        emails with custom tags.
      </Typography>
    </Box>
  );
};

export default LabelsView;
