import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

export interface IPreviewViewerProps {
  fileId: string;
  fileName: string;
  mimeType: string;
  /** @deprecated Use fetchContentUrl instead for authenticated access. */
  contentUrl?: string;
  /** Async function that returns an authenticated blob URL for the content. */
  fetchContentUrl?: () => Promise<string>;
  onClose: () => void;
  onDownload?: () => void;
  showWatermark?: boolean;
  watermarkText?: string;
}

export function PreviewViewer({
  fileName,
  mimeType,
  contentUrl: rawContentUrl,
  fetchContentUrl,
  onClose,
  onDownload,
  showWatermark = false,
  watermarkText,
}: IPreviewViewerProps) {
  const { tBranded: t } = useI18n();
  const [textContent, setTextContent] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolve the content URL — prefer authenticated fetch, fall back to raw URL
  useEffect(() => {
    let revoke: string | null = null;
    if (fetchContentUrl) {
      fetchContentUrl()
        .then((url) => {
          revoke = url;
          setBlobUrl(url);
        })
        .catch(() => setError(t(DigitalBurnbagStrings.Preview_LoadFailed)));
    } else if (rawContentUrl) {
      setBlobUrl(rawContentUrl);
    }
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [fetchContentUrl, rawContentUrl, t]);

  const contentUrl = blobUrl;

  useEffect(() => {
    if (mimeType.startsWith('text/') && contentUrl) {
      fetch(contentUrl)
        .then((r) => r.text())
        .then(setTextContent)
        .catch(() =>
          setTextContent(t(DigitalBurnbagStrings.Preview_LoadFailed)),
        );
    }
  }, [contentUrl, mimeType, t]);

  const renderContent = () => {
    if (error) {
      return (
        <Box textAlign="center" py={4}>
          <Typography color="error">{error}</Typography>
        </Box>
      );
    }
    if (!contentUrl) {
      return (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary">Loading…</Typography>
        </Box>
      );
    }
    if (mimeType.startsWith('image/')) {
      return (
        <Box
          component="img"
          src={contentUrl}
          alt={fileName}
          sx={{
            maxWidth: '100%',
            maxHeight: '70vh',
            objectFit: 'contain',
            display: 'block',
            mx: 'auto',
          }}
        />
      );
    }
    if (mimeType === 'application/pdf') {
      return (
        <Box
          component="iframe"
          src={contentUrl}
          title={fileName}
          sx={{ width: '100%', height: '70vh', border: 'none' }}
        />
      );
    }
    if (mimeType.startsWith('video/')) {
      return (
        <Box
          component="video"
          controls
          src={contentUrl}
          sx={{
            maxWidth: '100%',
            maxHeight: '70vh',
            display: 'block',
            mx: 'auto',
          }}
        >
          {t(DigitalBurnbagStrings.Preview_VideoNotSupported)}
        </Box>
      );
    }
    if (mimeType.startsWith('text/') && textContent !== null) {
      return (
        <Box
          component="pre"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '70vh',
            overflow: 'auto',
            p: 2,
            bgcolor: 'grey.50',
            borderRadius: 1,
          }}
        >
          {textContent}
        </Box>
      );
    }
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" gutterBottom>
          {fileName}
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          {t(DigitalBurnbagStrings.Preview_TypeLabel).replace(
            '{mimeType}',
            mimeType,
          )}
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          {t(DigitalBurnbagStrings.Preview_NotAvailable)}
        </Typography>
        {onDownload && (
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={onDownload}
            sx={{ mt: 2 }}
          >
            {t(DigitalBurnbagStrings.Preview_Download)}
          </Button>
        )}
      </Box>
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="preview-dialog-title"
    >
      <DialogTitle
        id="preview-dialog-title"
        sx={{ display: 'flex', alignItems: 'center' }}
      >
        <Typography variant="h6" component="span" sx={{ flexGrow: 1 }} noWrap>
          {fileName}
        </Typography>
        <IconButton
          onClick={onClose}
          aria-label={t(DigitalBurnbagStrings.Preview_CloseLabel)}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ position: 'relative' }}>
        {renderContent()}
        {showWatermark && watermarkText && (
          <Typography
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-30deg)',
              fontSize: '3rem',
              color: 'rgba(0,0,0,0.08)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {watermarkText}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        {onDownload && (
          <Button startIcon={<DownloadIcon />} onClick={onDownload}>
            {t(DigitalBurnbagStrings.Preview_Download)}
          </Button>
        )}
        <Button onClick={onClose}>
          {t(DigitalBurnbagStrings.Preview_Close)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
