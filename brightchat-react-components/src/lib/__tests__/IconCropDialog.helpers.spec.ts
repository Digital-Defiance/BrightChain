/**
 * Unit tests for cropImageToFile with a stubbed Image and canvas.
 */
import {
  DEFAULT_SERVER_ICON_CONFIG,
  isAllowedIconFileSize,
} from '@brightchain/brightchain-lib';
import {
  cropImageToFile,
  CROPPED_ICON_FILE_NAME,
  CROPPED_ICON_MIME_TYPE,
  IconCropError,
} from '../IconCropDialog.helpers';

interface ImageStub {
  naturalWidth: number;
  naturalHeight: number;
}
let imageBehaviour: 'load' | 'error' = 'load';
let imageSize: ImageStub = { naturalWidth: 1000, naturalHeight: 1000 };
// jsdom never loads images, so the real HTMLImageElement prototype is given a
// `src` setter that fires onload/onerror, and fixed natural dimensions.
const imageProto = HTMLImageElement.prototype;
const originalSrc = Object.getOwnPropertyDescriptor(imageProto, 'src');
const originalNaturalWidth = Object.getOwnPropertyDescriptor(
  imageProto,
  'naturalWidth',
);
const originalNaturalHeight = Object.getOwnPropertyDescriptor(
  imageProto,
  'naturalHeight',
);
function restoreProperty(
  name: 'src' | 'naturalWidth' | 'naturalHeight',
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(imageProto, name, descriptor);
  } else {
    Reflect.deleteProperty(imageProto, name);
  }
}
const drawImage = jest.fn();
// A real canvas element whose context and export methods are replaced.
const canvas = document.createElement('canvas');
const getContext = jest.fn();
const toBlob = jest.fn();
canvas.getContext = getContext;
canvas.toBlob = toBlob;
let createElementSpy: jest.SpyInstance;
beforeEach(() => {
  imageBehaviour = 'load';
  imageSize = { naturalWidth: 1000, naturalHeight: 1000 };
  canvas.width = 0;
  canvas.height = 0;
  drawImage.mockReset();
  getContext.mockReset().mockReturnValue({ drawImage });
  toBlob
    .mockReset()
    .mockImplementation((cb: BlobCallback) =>
      cb(new Blob(['x'], { type: CROPPED_ICON_MIME_TYPE })),
    );
  Object.defineProperty(imageProto, 'naturalWidth', {
    configurable: true,
    get: () => imageSize.naturalWidth,
  });
  Object.defineProperty(imageProto, 'naturalHeight', {
    configurable: true,
    get: () => imageSize.naturalHeight,
  });
  Object.defineProperty(imageProto, 'src', {
    configurable: true,
    set(this: HTMLImageElement) {
      queueMicrotask(() =>
        imageBehaviour === 'load'
          ? this.onload?.(new Event('load'))
          : this.onerror?.(new Event('error')),
      );
    },
  });
  const realCreate = document.createElement.bind(document);
  createElementSpy = jest
    .spyOn(document, 'createElement')
    .mockImplementation((tag: string, options?: ElementCreationOptions) =>
      tag === 'canvas' ? canvas : realCreate(tag, options),
    );
});
afterEach(() => {
  restoreProperty('src', originalSrc);
  restoreProperty('naturalWidth', originalNaturalWidth);
  restoreProperty('naturalHeight', originalNaturalHeight);
  createElementSpy.mockRestore();
});
const area = { x: 0, y: 0, width: 100, height: 100 };

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (err) {
    return err instanceof IconCropError ? err.code : 'other';
  }
  return undefined;
}

describe('cropImageToFile', () => {
  it('returns a PNG File with the icon name and type', async () => {
    const file = await cropImageToFile('/preview', area);
    expect(file.name).toBe(CROPPED_ICON_FILE_NAME);
    expect(file.type).toBe(CROPPED_ICON_MIME_TYPE);
    expect(toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      CROPPED_ICON_MIME_TYPE,
    );
  });

  it('draws the selected area without scaling when it is below the icon size', async () => {
    expect(DEFAULT_SERVER_ICON_CONFIG.outputSizePx).toBeGreaterThan(100);
    await cropImageToFile('/preview', {
      x: 10,
      y: 20,
      width: 100,
      height: 100,
    });
    expect(canvas.width).toBe(100);
    expect(canvas.height).toBe(100);
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      10,
      20,
      100,
      100,
      0,
      0,
      100,
      100,
    );
  });

  it('scales a large selection down to the server icon size', async () => {
    const outputSize = DEFAULT_SERVER_ICON_CONFIG.outputSizePx;
    const selection = outputSize * 4;
    imageSize = { naturalWidth: selection, naturalHeight: selection };
    await cropImageToFile('/preview', {
      x: 0,
      y: 0,
      width: selection,
      height: selection,
    });
    expect(canvas.width).toBe(outputSize);
    expect(canvas.height).toBe(outputSize);
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      selection,
      selection,
      0,
      0,
      outputSize,
      outputSize,
    );
  });

  it('rejects with load-failed when the image cannot be loaded', async () => {
    imageBehaviour = 'error';
    expect(await codeOf(cropImageToFile('/preview', area))).toBe('load-failed');
  });

  it('rejects with empty-area when the selection is outside the image', async () => {
    expect(
      await codeOf(
        cropImageToFile('/preview', { x: 5000, y: 0, width: 10, height: 10 }),
      ),
    ).toBe('empty-area');
  });

  it('rejects with no-canvas-context when getContext returns null', async () => {
    getContext.mockReturnValue(null);
    expect(await codeOf(cropImageToFile('/preview', area))).toBe(
      'no-canvas-context',
    );
  });

  it('rejects with export-failed when toBlob yields null', async () => {
    toBlob.mockImplementation((cb: BlobCallback) => cb(null));
    expect(await codeOf(cropImageToFile('/preview', area))).toBe(
      'export-failed',
    );
  });

  it('rejects with too-large when the exported blob exceeds the size limit', async () => {
    const limit = DEFAULT_SERVER_ICON_CONFIG.maxFileSizeBytes;
    expect(isAllowedIconFileSize(limit)).toBe(true);
    expect(isAllowedIconFileSize(limit + 1)).toBe(false);
    const big = new Blob([new Uint8Array(limit + 1)]);
    toBlob.mockImplementation((cb: BlobCallback) => cb(big));
    expect(await codeOf(cropImageToFile('/preview', area))).toBe('too-large');
  });
});
