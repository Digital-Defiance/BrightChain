import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@mui/material';
import React, { useCallback, useRef, useState } from 'react';

export interface IUploadNewVersionDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog should close */
  onClose: () => void;
  /** The file ID to upload a new version for */
  fileId: string;
  /** The current file name (for display) */
  fileName: string;
  /** The expected MIME type of the file */
  expectedMimeType: string;
  /** Called when the user selects a file to upload */
  onUpload: (fileId: string, file: File) => Promise<void>;
}

export function UploadNewVersionDialog({
  open,
  onClose,
  fileId,
  fileName,
  expectedMimeType,
  onUpload,
}: IUploadNewVersionDialogProps) {
  const { tBranded: t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Client-side MIME type check
      if (file.type && expectedMimeType && file.type !== expectedMimeType) {
        setError(
          t(DigitalBurnbagStrings.Upload_NewVersionMimeTypeMismatch)
            .replace('{expected}', expectedMimeType)
            .replace('{actual}', file.type),
        );
        setSelectedFile(null);
        e.target.value = '';
        return;
      }

      setError(null);
      setSelectedFile(file);
      e.target.value = '';
    },
    [expectedMimeType, t],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      await onUpload(fileId, selectedFile);
      setSelectedFile(null);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(DigitalBurnbagStrings.Upload_NewVersionFailed),
      );
    } finally {
      setUploading(false);
    }
  }, [selectedFile, fileId, onUpload, onClose, t]);

  const handleClose = useCallback(() => {
    if (uploading) return;
    setSelectedFile(null);
    setError(null);
    onClose();
  }, [uploading, onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t(DigitalBurnbagStrings.Upload_NewVersionTitle)}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(DigitalBurnbagStrings.Upload_NewVersionDesc)}
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          <strong>{fileName}</strong> ({expectedMimeType})
        </Typography>

        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {selectedFile ? (
          <Box
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <CloudUploadIcon color="primary" />
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {selectedFile.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </Typography>
          </Box>
        ) : (
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {t(DigitalBurnbagStrings.Upload_NewVersionSelect)}
          </Button>
        )}

        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={handleFileChange}
          aria-hidden
        />

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t(DigitalBurnbagStrings.Upload_NewVersionUploading)}
            </Typography>
            <LinearProgress />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          {t(DigitalBurnbagStrings.Common_Close)}
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
        >
          {t(DigitalBurnbagStrings.Upload_NewVersion)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
