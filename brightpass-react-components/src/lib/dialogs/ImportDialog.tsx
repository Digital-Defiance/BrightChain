/**
 * ImportDialog — imports credentials from other password managers.
 *
 * Provides a format selector, file upload input with correct MIME type/extension
 * per format, base64-encodes the file and calls the import endpoint, then
 * displays a summary with counts and errors.
 *
 * Exports pure helpers `getAcceptedFileTypes` and `formatImportSummary`
 * for property-based testing (Properties 14, 15).
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import type { ImportFormat, ImportResult } from '@brightchain/brightchain-lib';
import { BrightPassStrings } from '@brightchain/brightchain-lib';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import React, { useCallback, useRef, useState } from 'react';

import { useBrightPassApi } from '../hooks/useBrightPassApi';
import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';

/**
 * Maps an ImportFormat to the accepted file extensions and MIME types.
 * Exported for property-based testing (Property 14).
 */
export function getAcceptedFileTypes(format: string): {
  extensions: string[];
  mimeTypes: string[];
} {
  switch (format) {
    case '1password_1pux':
      return { extensions: ['.1pux'], mimeTypes: [] };
    case '1password_csv':
    case 'lastpass_csv':
    case 'bitwarden_csv':
    case 'chrome_csv':
    case 'firefox_csv':
      return { extensions: ['.csv'], mimeTypes: ['text/csv'] };
    case 'bitwarden_json':
    case 'dashlane_json':
      return { extensions: ['.json'], mimeTypes: ['application/json'] };
    case 'keepass_xml':
      return {
        extensions: ['.xml'],
        mimeTypes: ['application/xml', 'text/xml'],
      };
    default:
      return { extensions: [], mimeTypes: [] };
  }
}

/**
 * Formats an import result into a summary object.
 * Exported for property-based testing (Property 15).
 */
export function formatImportSummary(result: {
  imported: number;
  skipped: number;
  errors: string[];
}): { total: number; hasErrors: boolean } {
  return {
    total: result.imported + result.skipped,
    hasErrors: result.errors.length > 0,
  };
}

const FORMAT_OPTIONS: { value: ImportFormat; label: string }[] = [
  { value: '1password_1pux', label: '1Password (1PUX)' },
  { value: '1password_csv', label: '1Password (CSV)' },
  { value: 'lastpass_csv', label: 'LastPass (CSV)' },
  { value: 'bitwarden_json', label: 'Bitwarden (JSON)' },
  { value: 'bitwarden_csv', label: 'Bitwarden (CSV)' },
  { value: 'chrome_csv', label: 'Chrome (CSV)' },
  { value: 'firefox_csv', label: 'Firefox (CSV)' },
  { value: 'keepass_xml', label: 'KeePass (XML)' },
  { value: 'dashlane_json', label: 'Dashlane (JSON)' },
];

interface ImportDialogProps {
  /** The vault ID to import entries into. */
  vaultId: string;
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback when the dialog should close. */
  onClose: () => void;
  /** Called after a successful import so the parent can refresh. */
  onImportComplete?: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  vaultId,
  open,
  onClose,
  onImportComplete,
}) => {
  const { t } = useBrightPassTranslation();
  const brightPassApi = useBrightPassApi();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<ImportFormat>('1password_1pux');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setFormat('1password_1pux');
      setSelectedFile(null);
      setLoading(false);
      setError(null);
      setResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  // Reset file when format changes
  const handleFormatChange = useCallback((newFormat: ImportFormat) => {
    setFormat(newFormat);
    setSelectedFile(null);
    setError(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      setError(null);
      setResult(null);

      if (file) {
        const accepted = getAcceptedFileTypes(format);
        const fileExt = file.name
          .substring(file.name.lastIndexOf('.'))
          .toLowerCase();
        const extMatch = accepted.extensions.includes(fileExt);
        const mimeMatch =
          accepted.mimeTypes.length === 0 ||
          accepted.mimeTypes.includes(file.type);

        if (!extMatch && !mimeMatch) {
          setError(t(BrightPassStrings.Import_InvalidFormat));
          setSelectedFile(null);
          return;
        }
      }

      setSelectedFile(file);
    },
    [format, t],
  );

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const fileBase64 = btoa(binary);

      const importResult = await brightPassApi.importEntries(
        vaultId,
        format,
        fileBase64,
      );
      setResult(importResult);
      onImportComplete?.();
    } catch {
      setError(t(BrightPassStrings.Import_Error));
    } finally {
      setLoading(false);
    }
  }, [selectedFile, vaultId, format, t, onImportComplete]);

  const accepted = getAcceptedFileTypes(format);
  const acceptString = [...accepted.extensions, ...accepted.mimeTypes].join(
    ',',
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {t(BrightPassStrings.Import_Title)}
          <IconButton
            aria-label={t(BrightPassStrings.Import_Close)}
            onClick={onClose}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Format selector */}
          <Select
            value={format}
            onChange={(e) => handleFormatChange(e.target.value as ImportFormat)}
            fullWidth
            size="small"
            disabled={loading}
            aria-label={t(BrightPassStrings.Import_SelectFormat)}
          >
            {FORMAT_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>

          {/* File upload */}
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadFileIcon />}
            disabled={loading}
          >
            {selectedFile
              ? selectedFile.name
              : t(BrightPassStrings.Import_Upload)}
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept={acceptString}
              onChange={handleFileChange}
            />
          </Button>

          {error && <Alert severity="error">{error}</Alert>}

          {/* Import summary */}
          {result && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t(BrightPassStrings.Import_Summary)}
              </Typography>
              <Typography variant="body2">
                {t(BrightPassStrings.Import_Imported, {
                  COUNT: String(result.successfulImports),
                })}
              </Typography>
              <Typography variant="body2">
                {t(BrightPassStrings.Import_Skipped, {
                  COUNT: String(result.totalRecords - result.successfulImports),
                })}
              </Typography>
              {result.errors.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {result.errors.map((err, idx) => (
                    <Alert severity="warning" key={idx} sx={{ mb: 0.5 }}>
                      {t(BrightPassStrings.Import_Errors, {
                        INDEX: String(err.recordIndex),
                        MESSAGE: err.error,
                      })}
                    </Alert>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t(BrightPassStrings.Import_Close)}
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={loading || !selectedFile || result !== null}
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {t(BrightPassStrings.Import_Import)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;
