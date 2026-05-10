/**
 * IconCropDialog — MUI Dialog for selecting, cropping, and staging a server icon.
 *
 * Uses react-easy-crop for the crop UI with a circular guide and 1:1 aspect ratio.
 * On file select, stages the raw file via chatApi.stageFile(), then displays
 * the crop preview from the staging previewUrl. On confirm, passes the
 * commitToken to the parent via onCropComplete.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 9.1, 9.2, 9.3, 9.4, 9.6
 */
import type { ITempUploadResponse } from '@brightchain/brightchain-lib';
import {
  DEFAULT_SERVER_ICON_CONFIG,
  isAllowedIconFileSize,
} from '@brightchain/brightchain-lib';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import {
  ChangeEvent,
  FC,
  KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Area, Point } from 'react-easy-crop';
import Cropper from 'react-easy-crop';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IconCropDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the commit token and preview URL after staging succeeds */
  onImageStaged: (commitToken: string, previewUrl: string) => void;
  /** Called when the user confirms the crop — passes commit token to parent */
  onCropComplete: (commitToken: string) => void;
  /** Optional initial preview URL for re-cropping an existing staged file */
  initialPreviewUrl?: string;
  /** Optional initial commit token (for re-opening with an already-staged file) */
  initialCommitToken?: string;
  /** Chat API client with stageFile method */
  chatApi: {
    stageFile: (file: File) => Promise<ITempUploadResponse>;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PREVIEW_SIZE = 48;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const ACCEPTED_TYPES = DEFAULT_SERVER_ICON_CONFIG.allowedMimeTypes.join(',');

// ─── Component ──────────────────────────────────────────────────────────────

const IconCropDialog: FC<IconCropDialogProps> = ({
  open,
  onClose,
  onImageStaged,
  onCropComplete,
  initialPreviewUrl,
  initialCommitToken,
  chatApi,
}) => {
  const { tBranded: t } = useI18n();

  // Staging state
  const [commitToken, setCommitToken] = useState<string | null>(
    initialCommitToken ?? null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialPreviewUrl ?? null,
  );
  const [staging, setStaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Crop state
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial values when dialog opens
  useEffect(() => {
    if (open) {
      setCommitToken(initialCommitToken ?? null);
      setPreviewUrl(initialPreviewUrl ?? null);
      setError(null);
      setCrop({ x: 0, y: 0 });
      setZoom(MIN_ZOOM);
      setCroppedAreaPixels(null);
      if (!initialPreviewUrl) {
        setStaging(false);
      }
    }
  }, [open, initialCommitToken, initialPreviewUrl]);

  // ─── File selection ─────────────────────────────────────────────────

  const handleFileSelect = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Client-side size validation (Req 5.10)
      if (!isAllowedIconFileSize(file.size)) {
        setError(t(BrightChatStrings.Server_Icon_FileTooLarge));
        return;
      }

      setError(null);
      setStaging(true);

      try {
        const response = await chatApi.stageFile(file);
        setCommitToken(response.commitToken);
        setPreviewUrl(response.previewUrl);
        setCrop({ x: 0, y: 0 });
        setZoom(MIN_ZOOM);
        onImageStaged(response.commitToken, response.previewUrl);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t(BrightChatStrings.Server_Icon_StagingFailed),
        );
      } finally {
        setStaging(false);
      }
    },
    [chatApi, onImageStaged, t],
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ─── Crop callbacks ─────────────────────────────────────────────────

  const handleCropChange = useCallback((location: Point) => {
    setCrop(location);
  }, []);

  const handleZoomChange = useCallback(
    (_: Event | React.SyntheticEvent, value: number | number[]) => {
      setZoom(value as number);
    },
    [],
  );

  const handleCropAreaComplete = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    [],
  );

  // ─── Confirm / Cancel ───────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    if (commitToken) {
      onCropComplete(commitToken);
    }
  }, [commitToken, onCropComplete]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // ─── Keyboard support (Req 9.2) ────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && commitToken && !staging) {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [commitToken, staging, handleConfirm, handleCancel],
  );

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      aria-labelledby="icon-crop-dialog-title"
      onKeyDown={handleKeyDown}
    >
      <DialogTitle id="icon-crop-dialog-title">
        {t(BrightChatStrings.Server_Icon_CropTitle)}
      </DialogTitle>

      <DialogContent>
        {/* Hidden file input (Req 9.1) */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          aria-label={t(BrightChatStrings.Server_Icon_UploadLabel)}
          data-testid="icon-file-input"
        />

        {/* Status region for screen readers (Req 9.4) */}
        <Box
          aria-live="polite"
          role="status"
          sx={{ position: 'absolute', left: -9999 }}
        >
          {staging && t(BrightChatStrings.Server_Icon_Uploading)}
          {error && error}
        </Box>

        {/* Browse / Drop area */}
        {!previewUrl && !staging && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              gap: 2,
            }}
          >
            <Button
              variant="outlined"
              onClick={handleBrowseClick}
              disabled={staging}
            >
              {t(BrightChatStrings.Server_Icon_DropOrBrowse)}
            </Button>
          </Box>
        )}

        {/* Loading indicator during staging (Req 5.8) */}
        {staging && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              gap: 2,
            }}
          >
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary">
              {t(BrightChatStrings.Server_Icon_Uploading)}
            </Typography>
          </Box>
        )}

        {/* Crop area (Req 5.2, 5.3, 5.4) */}
        {previewUrl && !staging && (
          <>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: 300,
                bgcolor: 'grey.900',
                borderRadius: 1,
                overflow: 'hidden',
              }}
              data-testid="crop-container"
            >
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={handleCropChange}
                onZoomChange={setZoom}
                onCropComplete={handleCropAreaComplete}
              />
            </Box>

            {/* Zoom slider (Req 5.3) */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <Typography variant="body2" id="zoom-slider-label">
                {t(BrightChatStrings.Server_Icon_ZoomLabel)}
              </Typography>
              <Slider
                value={zoom}
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={ZOOM_STEP}
                onChange={handleZoomChange}
                aria-labelledby="zoom-slider-label"
                data-testid="zoom-slider"
                sx={{ flex: 1 }}
              />
            </Box>

            {/* Circular preview at 48px (Req 5.5, 9.3) */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <Avatar
                src={previewUrl}
                alt={t(BrightChatStrings.Server_Icon_PreviewAlt)}
                sx={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                data-testid="icon-preview"
              />
              <Typography variant="body2" color="text.secondary">
                {t(BrightChatStrings.Server_Icon_PreviewAlt)}
              </Typography>
            </Box>

            {/* Re-select file button */}
            <Box sx={{ mt: 2 }}>
              <Button variant="text" size="small" onClick={handleBrowseClick}>
                {t(BrightChatStrings.Server_Icon_Change)}
              </Button>
            </Box>
          </>
        )}

        {/* Error display (Req 5.9) */}
        {error && (
          <Typography
            color="error"
            variant="body2"
            sx={{ mt: 1 }}
            data-testid="icon-crop-error"
          >
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel} disabled={staging}>
          {t(BrightChatStrings.Server_Icon_CropCancel)}
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!commitToken || staging}
        >
          {t(BrightChatStrings.Server_Icon_CropConfirm)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(IconCropDialog);
