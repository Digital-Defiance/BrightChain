/**
 * PaperKeyTemplate — Printable paper key template with BrightChain branding.
 *
 * Displays the 24-word paper key in a grid layout with QR code,
 * security warnings, and a print button.
 *
 * Requirements: 9.3, 9.9
 */

import {
  BrightChainStrings,
  toBrightDateString,
} from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Typography,
} from '@mui/material';
import { FC, useMemo } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaperKeyTemplateProps {
  /** The 24-word paper key */
  paperKey: string;
  /** Optional QR code data URL (base64 PNG) */
  qrCodeDataUrl?: string;
  /** Member display name */
  memberName?: string;
  /** Creation date */
  createdAt?: Date;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const PaperKeyTemplate: FC<PaperKeyTemplateProps> = ({
  paperKey,
  qrCodeDataUrl,
  memberName,
  createdAt,
}) => {
  const { tBranded: t } = useI18n();
  const words = useMemo(() => paperKey.split(' ').filter(Boolean), [paperKey]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Paper
      sx={{
        p: 4,
        maxWidth: 700,
        mx: 'auto',
        '@media print': { boxShadow: 'none', border: '1px solid #ccc' },
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t(BrightChainStrings.PaperKey_Title)}
        </Typography>
        {memberName && (
          <Typography variant="subtitle1" color="text.secondary">
            {memberName}
          </Typography>
        )}
        {createdAt && (
          <Typography variant="caption" color="text.secondary">
            {t(BrightChainStrings.PaperKey_GeneratedTemplate, {
              DATE: createdAt.toLocaleDateString(),
              BD: t(BrightChainStrings.Date_BrightDateTemplate, {
                BD: toBrightDateString(createdAt, 3),
              }),
            })}
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Security Warning */}
      <Alert severity="error" sx={{ mb: 3 }}>
        {t(BrightChainStrings.PaperKey_SecurityWarning)}
      </Alert>

      {/* Word Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1.5,
          mb: 3,
        }}
        role="list"
        aria-label={t(BrightChainStrings.PaperKey_WordsAriaLabel)}
      >
        {words.map((word, idx) => (
          <Chip
            key={idx}
            label={`${idx + 1}. ${word}`}
            variant="outlined"
            sx={{
              fontSize: '0.9rem',
              height: 36,
              justifyContent: 'flex-start',
            }}
            role="listitem"
          />
        ))}
      </Box>

      {/* QR Code */}
      {qrCodeDataUrl && (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            {t(BrightChainStrings.PaperKey_QrScanLabel)}
          </Typography>
          <Box>
            <img
              src={qrCodeDataUrl}
              alt={t(BrightChainStrings.PaperKey_QrAlt)}
              style={{ maxWidth: 200, border: '1px solid #ccc', padding: 8 }}
            />
          </Box>
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Security Notes */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t(BrightChainStrings.PaperKey_SecurityRecommendations)}
      </Typography>
      <Box component="ul" sx={{ pl: 2, mb: 3 }}>
        <li>
          <Typography variant="body2" color="text.secondary">
            {t(BrightChainStrings.PaperKey_Tip_Fireproof)}
          </Typography>
        </li>
        <li>
          <Typography variant="body2" color="text.secondary">
            {t(BrightChainStrings.PaperKey_Tip_Split)}
          </Typography>
        </li>
        <li>
          <Typography variant="body2" color="text.secondary">
            {t(BrightChainStrings.PaperKey_Tip_NoDigital)}
          </Typography>
        </li>
        <li>
          <Typography variant="body2" color="text.secondary">
            {t(BrightChainStrings.PaperKey_Tip_NeverShare)}
          </Typography>
        </li>
      </Box>

      {/* Print Button (hidden in print) */}
      <Box sx={{ textAlign: 'center', '@media print': { display: 'none' } }}>
        <Button variant="contained" onClick={handlePrint} size="large">
          {t(BrightChainStrings.PaperKey_PrintButton)}
        </Button>
      </Box>
    </Paper>
  );
};
