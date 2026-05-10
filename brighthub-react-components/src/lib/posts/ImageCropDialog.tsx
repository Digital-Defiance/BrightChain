/**
 * ImageCropDialog — MUI Dialog for cropping an image before staging.
 *
 * Uses react-easy-crop for the crop UI with a rectangular guide and free-form
 * aspect ratio. On confirm, extracts the cropped region via canvas and passes
 * the resulting Blob to the parent via onCropComplete. The author can also
 * skip cropping entirely.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */
import { BrightHubStrings } from '@brightchain/brighthub-lib';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import { FC, memo, useCallback, useEffect, useState } from 'react';
import type { Area, Point } from 'react-easy-crop';
import Cropper from 'react-easy-crop';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ImageCropDialogProps {
  open: boolean;
  onClose: () => void;
  /** The image file to crop */
  imageFile: File;
  /** Called with the cropped image blob when confirmed */
  onCropComplete: (croppedBlob: Blob) => void;
  /** Called when the author skips cropping */
  onSkip: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const MIN_SCALE = 10;
const MAX_SCALE = 100;
const DEFAULT_SCALE = 100;
const PREVIEW_MAX_HEIGHT = 200;

/** Aspect ratio presets. `null` means use the image's natural ratio. */
const ASPECT_OPTIONS = [
  { label: 'Free', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract the cropped region from an image using a canvas element.
 * Returns a Blob of the cropped area in the original image's MIME type.
 * @param scalePercent - Output scale as a percentage (1-100). 100 = original crop size.
 */
async function getCroppedBlob(
  imageSrc: string,
  cropPixels: Area,
  mimeType: string,
  scalePercent = 100,
): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = (err) => reject(err);
    image.src = imageSrc;
  });

  // Clamp crop area to image bounds
  const sx = Math.max(0, cropPixels.x);
  const sy = Math.max(0, cropPixels.y);
  const sw = Math.min(cropPixels.width, image.naturalWidth - sx);
  const sh = Math.min(cropPixels.height, image.naturalHeight - sy);

  // If the crop covers the full image (or nearly), use full dimensions
  const isFullImage =
    sx <= 1 &&
    sy <= 1 &&
    sw >= image.naturalWidth - 1 &&
    sh >= image.naturalHeight - 1;

  const finalW = isFullImage ? image.naturalWidth : Math.max(1, sw);
  const finalH = isFullImage ? image.naturalHeight : Math.max(1, sh);
  const finalX = isFullImage ? 0 : sx;
  const finalY = isFullImage ? 0 : sy;

  // Apply output scale
  const scaleFactor = Math.max(0.01, Math.min(1, scalePercent / 100));
  const outW = Math.max(1, Math.round(finalW * scaleFactor));
  const outH = Math.max(1, Math.round(finalH * scaleFactor));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas 2d context');
  }

  ctx.drawImage(image, finalX, finalY, finalW, finalH, 0, 0, outW, outH);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob returned null'));
        }
      },
      mimeType,
      0.92,
    );
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

const ImageCropDialog: FC<ImageCropDialogProps> = ({
  open,
  onClose,
  imageFile,
  onCropComplete,
  onSkip,
}) => {
  const { t } = useBrightHubTranslation();

  // Crop state
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState<number | null>(null);
  const [naturalAspect, setNaturalAspect] = useState(4 / 3);
  const [scalePercent, setScalePercent] = useState(DEFAULT_SCALE);

  // Create object URL from the image file.
  // Uses useState + useEffect (not useMemo) so the URL is recreated after
  // React strict-mode's unmount/remount cycle. useMemo caches the value
  // across remounts, but the cleanup effect revokes it on the first unmount,
  // leaving a stale revoked URL on remount.
  const [imageObjectUrl, setImageObjectUrl] = useState('');

  useEffect(() => {
    if (!imageFile) {
      setImageObjectUrl('');
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImageObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setPreviewUrl(null);
      setConfirming(false);
      setSelectedAspect(null);
      setScalePercent(DEFAULT_SCALE);
    }
  }, [open]);

  // Clean up preview URL when it changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

      // Generate preview of the cropped result (Req 13.4)
      getCroppedBlob(
        imageObjectUrl,
        croppedPixels,
        imageFile.type || 'image/jpeg',
        scalePercent,
      )
        .then((blob) => {
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(blob);
          });
        })
        .catch(() => {
          // Preview generation is best-effort; don't block the user
        });
    },
    [imageObjectUrl, imageFile.type, scalePercent],
  );

  // Detect the image's natural aspect ratio
  const handleMediaLoaded = useCallback(
    (mediaSize: { naturalWidth: number; naturalHeight: number }) => {
      if (mediaSize.naturalHeight > 0) {
        setNaturalAspect(mediaSize.naturalWidth / mediaSize.naturalHeight);
      }
    },
    [],
  );

  // The effective aspect ratio for the cropper
  const effectiveAspect = selectedAspect ?? naturalAspect;

  // ─── Confirm / Skip / Cancel ────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setConfirming(true);
    try {
      const blob = await getCroppedBlob(
        imageObjectUrl,
        croppedAreaPixels,
        imageFile.type || 'image/jpeg',
        scalePercent,
      );
      onCropComplete(blob);
    } catch {
      // If cropping fails, fall back to skipping
      onSkip();
    } finally {
      setConfirming(false);
    }
  }, [
    croppedAreaPixels,
    imageObjectUrl,
    imageFile.type,
    onCropComplete,
    onSkip,
  ]);

  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      aria-labelledby="image-crop-dialog-title"
      data-testid="image-crop-dialog"
    >
      <DialogTitle id="image-crop-dialog-title">
        {t(BrightHubStrings.ImageCropDialog_Title)}
      </DialogTitle>

      <DialogContent>
        {/* Crop area (Req 13.1, 13.3) */}
        {imageObjectUrl && (
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
                image={imageObjectUrl}
                crop={crop}
                zoom={zoom}
                aspect={effectiveAspect}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                cropShape="rect"
                objectFit="contain"
                restrictPosition={false}
                onCropChange={handleCropChange}
                onZoomChange={setZoom}
                onCropComplete={handleCropAreaComplete}
                onMediaLoaded={handleMediaLoaded}
                data-testid="image-cropper"
              />
            </Box>

            {/* Aspect ratio selector */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 2 }}>
              {ASPECT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.label}
                  label={opt.label}
                  size="small"
                  variant={
                    selectedAspect === opt.value ? 'filled' : 'outlined'
                  }
                  color={
                    selectedAspect === opt.value ? 'primary' : 'default'
                  }
                  onClick={() => setSelectedAspect(opt.value)}
                  data-testid={`aspect-${opt.label}`}
                />
              ))}
            </Box>

            {/* Zoom slider */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <Typography variant="body2" id="image-zoom-slider-label">
                {t(BrightHubStrings.ImageCropDialog_ZoomLabel)}
              </Typography>
              <Slider
                value={zoom}
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={ZOOM_STEP}
                onChange={handleZoomChange}
                aria-labelledby="image-zoom-slider-label"
                data-testid="image-zoom-slider"
                sx={{ flex: 1 }}
              />
            </Box>

            {/* Output scale slider */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              <Typography variant="body2" id="image-scale-slider-label">
                Scale
              </Typography>
              <Slider
                value={scalePercent}
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={1}
                onChange={(_: Event | React.SyntheticEvent, v: number | number[]) =>
                  setScalePercent(v as number)
                }
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v}%`}
                aria-labelledby="image-scale-slider-label"
                data-testid="image-scale-slider"
                sx={{ flex: 1 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36 }}>
                {scalePercent}%
              </Typography>
            </Box>

            {/* Cropped preview (Req 13.4) */}
            {previewUrl && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  mt: 2,
                }}
                data-testid="crop-preview-container"
              >
                <Typography variant="body2" color="text.secondary">
                  {t(BrightHubStrings.ImageCropDialog_PreviewAlt)}
                </Typography>
                <Box
                  component="img"
                  src={previewUrl}
                  alt={t(BrightHubStrings.ImageCropDialog_PreviewAlt)}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: PREVIEW_MAX_HEIGHT,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                  }}
                  data-testid="crop-preview-image"
                />
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel} disabled={confirming}>
          {t(BrightHubStrings.ImageCropDialog_Cancel)}
        </Button>
        <Button
          variant="outlined"
          onClick={handleSkip}
          disabled={confirming}
          data-testid="crop-skip-button"
        >
          {t(BrightHubStrings.ImageCropDialog_Skip)}
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!croppedAreaPixels || confirming}
          data-testid="crop-confirm-button"
        >
          {t(BrightHubStrings.ImageCropDialog_Crop)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(ImageCropDialog);
