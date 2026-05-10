import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';
import type {
  IFolderExportOptionsDTO,
  IFolderExportResultDTO,
} from '../interfaces';

/** Common MIME type filter presets */
const MIME_PRESETS = [
  { label: 'PDF', value: 'application/pdf' },
  { label: 'Images', value: 'image/*' },
  { label: 'Video', value: 'video/*' },
  { label: 'Text / Markdown', value: 'text/*' },
  {
    label: 'Office Documents',
    value: 'application/vnd.openxmlformats-officedocument.*',
  },
] as const;

export interface IFolderExportDialogProps {
  /** Whether the dialog is visible */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** The folder ID to export */
  folderId: string;
  /** Display name for the folder */
  folderName: string;
  /** Callback that performs the actual export API call */
  onExport: (
    folderId: string,
    options?: IFolderExportOptionsDTO,
  ) => Promise<IFolderExportResultDTO>;
}

type DialogState = 'configure' | 'exporting' | 'complete' | 'error';

/**
 * Format a byte count into a human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    units.length - 1,
  );
  const value = bytes / Math.pow(k, i);
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

/**
 * Dialog component for exporting a folder to TCBL format.
 *
 * Provides filter configuration, progress indication, and result summary
 * including a "Copy Recipe" action for the generated TCBL recipe.
 */
export function FolderExportDialog({
  open,
  onClose,
  folderId,
  folderName,
  onExport,
}: IFolderExportDialogProps) {
  // --- state ---
  const [state, setState] = useState<DialogState>('configure');
  const [selectedMimeTypes, setSelectedMimeTypes] = useState<Set<string>>(
    new Set(),
  );
  const [maxDepth, setMaxDepth] = useState<string>('');
  const [excludePatterns, setExcludePatterns] = useState<string>('');
  const [result, setResult] = useState<IFolderExportResultDTO | null>(null);
  const [error, setError] = useState<string>('');
  const [skippedOpen, setSkippedOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- helpers ---
  const resetForm = useCallback(() => {
    setState('configure');
    setSelectedMimeTypes(new Set());
    setMaxDepth('');
    setExcludePatterns('');
    setResult(null);
    setError('');
    setSkippedOpen(false);
    setCopied(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const toggleMimeType = useCallback((mime: string) => {
    setSelectedMimeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(mime)) {
        next.delete(mime);
      } else {
        next.add(mime);
      }
      return next;
    });
  }, []);

  const buildOptions = useCallback((): IFolderExportOptionsDTO | undefined => {
    const opts: IFolderExportOptionsDTO = {};
    let hasOpts = false;

    if (selectedMimeTypes.size > 0) {
      opts.mimeTypeFilters = Array.from(selectedMimeTypes);
      hasOpts = true;
    }

    const depth = parseInt(maxDepth, 10);
    if (!isNaN(depth) && depth > 0) {
      opts.maxDepth = depth;
      hasOpts = true;
    }

    const patterns = excludePatterns
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);
    if (patterns.length > 0) {
      opts.excludePatterns = patterns;
      hasOpts = true;
    }

    return hasOpts ? opts : undefined;
  }, [selectedMimeTypes, maxDepth, excludePatterns]);

  const handleExport = useCallback(async () => {
    setState('exporting');
    setError('');
    try {
      const exportResult = await onExport(folderId, buildOptions());
      setResult(exportResult);
      setState('complete');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      setState('error');
    }
  }, [folderId, onExport, buildOptions]);

  const handleCopyRecipe = useCallback(async () => {
    if (!result?.recipe) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result.recipe));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: silent fail — clipboard may not be available
    }
  }, [result]);

  // --- render sections ---
  const renderConfigureContent = () => (
    <>
      <Typography variant="subtitle2" gutterBottom>
        File type filters
      </Typography>
      <FormGroup row>
        {MIME_PRESETS.map(({ label, value }) => (
          <FormControlLabel
            key={value}
            control={
              <Checkbox
                checked={selectedMimeTypes.has(value)}
                onChange={() => toggleMimeType(value)}
                size="small"
              />
            }
            label={label}
          />
        ))}
      </FormGroup>

      <TextField
        label="Max depth"
        type="number"
        size="small"
        fullWidth
        margin="normal"
        value={maxDepth}
        onChange={(e) => setMaxDepth(e.target.value)}
        slotProps={{
          htmlInput: {
            min: 1,
            'aria-label': 'Maximum folder recursion depth',
          },
        }}
        helperText="Leave empty for unlimited depth"
      />

      <TextField
        label="Exclude patterns"
        size="small"
        fullWidth
        margin="normal"
        multiline
        minRows={2}
        maxRows={5}
        value={excludePatterns}
        onChange={(e) => setExcludePatterns(e.target.value)}
        helperText="One glob pattern per line (e.g. *.tmp, drafts/**)"
        slotProps={{
          htmlInput: { 'aria-label': 'Exclude patterns, one per line' },
        }}
      />
    </>
  );

  const renderExportingContent = () => (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      py={4}
      gap={2}
    >
      <CircularProgress aria-label="Export in progress" />
      <Typography color="text.secondary">Exporting…</Typography>
    </Box>
  );

  const renderCompleteContent = () => {
    if (!result) return null;
    const { manifestSummary, skippedFiles } = result;
    return (
      <>
        <Alert severity="success" sx={{ mb: 2 }}>
          Export complete
        </Alert>

        <Typography variant="subtitle2" gutterBottom>
          Manifest summary
        </Typography>
        <Typography variant="body2" gutterBottom>
          {manifestSummary.entryCount}{' '}
          {manifestSummary.entryCount === 1 ? 'file' : 'files'} &middot;{' '}
          {formatBytes(manifestSummary.totalSizeBytes)}
        </Typography>

        {skippedFiles.length > 0 && (
          <>
            <Box
              display="flex"
              alignItems="center"
              mt={1}
              sx={{ cursor: 'pointer' }}
              onClick={() => setSkippedOpen((o) => !o)}
              role="button"
              aria-expanded={skippedOpen}
              aria-label="Toggle skipped files list"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSkippedOpen((o) => !o);
                }
              }}
            >
              <Typography variant="subtitle2">
                {skippedFiles.length} skipped{' '}
                {skippedFiles.length === 1 ? 'file' : 'files'}
              </Typography>
              {skippedOpen ? (
                <ExpandLessIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </Box>
            <Collapse in={skippedOpen}>
              <List dense disablePadding>
                {skippedFiles.map((sf) => (
                  <ListItem key={sf.fileId} disableGutters>
                    <ListItemText
                      primary={sf.relativePath}
                      secondary={sf.reason}
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}

        <Box display="flex" alignItems="center" mt={2} gap={1}>
          <Typography variant="subtitle2">TCBL Recipe</Typography>
          <Tooltip title={copied ? 'Copied!' : 'Copy recipe to clipboard'}>
            <IconButton
              size="small"
              onClick={handleCopyRecipe}
              aria-label="Copy recipe to clipboard"
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </>
    );
  };

  const renderErrorContent = () => (
    <Alert severity="error">{error || 'Export failed'}</Alert>
  );

  // --- dialog actions per state ---
  const renderActions = () => {
    switch (state) {
      case 'configure':
        return (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button variant="contained" onClick={handleExport}>
              Export
            </Button>
          </>
        );
      case 'exporting':
        return (
          <Button disabled onClick={handleClose}>
            Cancel
          </Button>
        );
      case 'complete':
        return <Button onClick={handleClose}>Close</Button>;
      case 'error':
        return (
          <>
            <Button onClick={handleClose}>Close</Button>
            <Button variant="contained" onClick={handleExport}>
              Retry
            </Button>
          </>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={state === 'exporting' ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="folder-export-dialog-title"
    >
      <DialogTitle id="folder-export-dialog-title">
        Export to TCBL — {folderName}
      </DialogTitle>
      <DialogContent dividers>
        {state === 'configure' && renderConfigureContent()}
        {state === 'exporting' && renderExportingContent()}
        {state === 'complete' && renderCompleteContent()}
        {state === 'error' && renderErrorContent()}
      </DialogContent>
      <DialogActions>{renderActions()}</DialogActions>
    </Dialog>
  );
}

export default FolderExportDialog;
