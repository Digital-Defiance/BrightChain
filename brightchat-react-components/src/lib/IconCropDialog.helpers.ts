/**
 * Helpers for IconCropDialog: cut the user's crop selection out of the staged
 * image so the server receives the cropped icon, not the original.
 *
 * The server only resizes at commit (cover-fit to a square), so without this
 * the selection would be replaced by a centre crop.
 */
import {
  DEFAULT_SERVER_ICON_CONFIG,
  isAllowedIconFileSize,
} from '@brightchain/brightchain-lib';
import type { Area } from 'react-easy-crop';

/** File name used when staging the cropped icon. */
export const CROPPED_ICON_FILE_NAME = 'server-icon.png';
/** PNG keeps transparency and matches the server's icon output format. */
export const CROPPED_ICON_MIME_TYPE = 'image/png';

/** Why cropping failed; the dialog maps each code to a translated message. */
export type IconCropErrorCode =
  | 'load-failed'
  | 'empty-area'
  | 'no-canvas-context'
  | 'export-failed'
  | 'too-large';

export class IconCropError extends Error {
  constructor(
    public readonly code: IconCropErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'IconCropError';
  }
}

/**
 * Clamp a crop rectangle to the image bounds, rounding to whole pixels.
 * Returns null when nothing of the image remains inside the rectangle.
 */
export function clampCropArea(
  area: Area,
  imageWidth: number,
  imageHeight: number,
): Area | null {
  // Clamp each edge independently, so an overhang trims the area instead of
  // shifting it onto pixels the user did not select.
  const left = Math.max(0, Math.round(area.x));
  const top = Math.max(0, Math.round(area.y));
  const right = Math.min(imageWidth, Math.round(area.x + area.width));
  const bottom = Math.min(imageHeight, Math.round(area.y + area.height));
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return null;
  return { x: left, y: top, width, height };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Required so the canvas is not tainted when the preview is served from
    // another origin with CORS headers.
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new IconCropError('load-failed', 'Failed to load image for cropping'),
      );
    image.src = src;
  });
}

/**
 * Draw the selected area of `imageSrc` to a canvas and return it as a PNG file.
 * The output is scaled down to the server's icon size (never up), so a large
 * photo cannot exceed the server's upload limit. Rejects with an
 * IconCropError when the image cannot be loaded, the area is empty, the canvas
 * cannot be exported (for example a cross-origin preview without CORS), or the
 * result is still over the server's size limit.
 */
export async function cropImageToFile(
  imageSrc: string,
  cropPixels: Area,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const area = clampCropArea(
    cropPixels,
    image.naturalWidth,
    image.naturalHeight,
  );
  if (!area)
    throw new IconCropError('empty-area', 'Crop area is outside the image');

  const canvas = document.createElement('canvas');
  const scale = Math.min(
    1,
    DEFAULT_SERVER_ICON_CONFIG.outputSizePx / Math.max(area.width, area.height),
  );
  const outputWidth = Math.max(1, Math.round(area.width * scale));
  const outputHeight = Math.max(1, Math.round(area.height * scale));
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');
  if (!context)
    throw new IconCropError(
      'no-canvas-context',
      'Canvas 2D context is unavailable',
    );
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new IconCropError('export-failed', 'Canvas export failed')),
      CROPPED_ICON_MIME_TYPE,
    );
  });
  if (!isAllowedIconFileSize(blob.size)) {
    throw new IconCropError('too-large', 'Cropped icon exceeds the size limit');
  }
  return new File([blob], CROPPED_ICON_FILE_NAME, {
    type: CROPPED_ICON_MIME_TYPE,
  });
}
