/**
 * PaperKeyTemplate — Printable paper key template with BrightChain branding.
 *
 * Displays the 24-word paper key in a grid layout with QR code,
 * security warnings, and a print button.
 *
 * Requirements: 9.3, 9.9
 */

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
          BrightChain Paper Key
        </Typography>
        {memberName && (
          <Typography variant="subtitle1" color="text.secondary">
            {memberName}
          </Typography>
        )}
        {createdAt && (
          <Typography variant="caption" color="text.secondary">
            Generated: {createdAt.toLocaleDateString()}
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Security Warning */}
      <Alert severity="error" sx={{ mb: 3 }}>
        KEEP THIS SAFE. This paper key is the only way to recover your
        BrightChain identity. Store it in a secure location. Never share it.
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
        aria-label="Paper key words"
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
            Scan to import:
          </Typography>
          <Box>
            <img
              src={qrCodeDataUrl}
              alt="Paper key QR code"
              style={{ maxWidth: 200, border: '1px solid #ccc', padding: 8 }}
            />
          </Box>
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Security Notes */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Security recommendations:
      </Typography>
      <Box component="ul" sx={{ pl: 2, mb: 3 }}>
        <li>
          <Typography variant="body2" color="text.secondary">
            Store in a fireproof safe or safety deposit box
          </Typography>
        </li>
        <li>
          <Typography variant="body2" color="text.secondary">
            Consider splitting across multiple locations
          </Typography>
        </li>
        <li>
          <Typography variant="body2" color="text.secondary">
            Never store digitally or take a screenshot
          </Typography>
        </li>
        <li>
          <Typography variant="body2" color="text.secondary">
            Never share with anyone, including BrightChain support
          </Typography>
        </li>
      </Box>

      {/* Print Button (hidden in print) */}
      <Box sx={{ textAlign: 'center', '@media print': { display: 'none' } }}>
        <Button variant="contained" onClick={handlePrint} size="large">
          Print This Template
        </Button>
      </Box>
    </Paper>
  );
};
