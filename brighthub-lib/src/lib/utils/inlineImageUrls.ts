// brighthub-lib/src/lib/utils/inlineImageUrls.ts

/**
 * Regex pattern matching staging preview URLs.
 * Format: /api/temp-upload/{uuid-v4}/preview
 */
export const STAGING_URL_PATTERN =
  /\/api\/temp-upload\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/preview/gi;

/**
 * Regex pattern matching permanent post image URLs.
 * Format: /api/post-images/{fileId}
 * The fileId can be a UUID v4 or a base64-encoded ID (from vault storage).
 * Stops at path separators, query strings, and whitespace.
 */
export const PERMANENT_URL_PATTERN =
  /\/api\/post-images\/([A-Za-z0-9_\-+=.]+)(?=[)\s"'?#]|$)/gi;

/**
 * Markdown image syntax regex — captures alt text and URL.
 * Matches: ![alt text](url)
 */
export const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g;

/** Maximum number of inline images per post (default) */
const DEFAULT_MAX_INLINE_IMAGES = 20;

/** Maximum image dimension in pixels before auto-resize (default) */
const DEFAULT_MAX_IMAGE_DIMENSION = 4096;

let _maxInlineImages = DEFAULT_MAX_INLINE_IMAGES;
let _maxImageDimension = DEFAULT_MAX_IMAGE_DIMENSION;

/** Current max inline images limit. */
export function getMaxInlineImages(): number {
  return _maxInlineImages;
}

/** Current max image dimension limit. */
export function getMaxImageDimension(): number {
  return _maxImageDimension;
}

/**
 * Override the default image limits at startup.
 * Call from the API layer after reading env vars.
 */
export function setImageLimits(opts: {
  maxInlineImages?: number;
  maxImageDimension?: number;
}): void {
  if (opts.maxInlineImages !== undefined && opts.maxInlineImages > 0) {
    _maxInlineImages = opts.maxInlineImages;
  }
  if (opts.maxImageDimension !== undefined && opts.maxImageDimension > 0) {
    _maxImageDimension = opts.maxImageDimension;
  }
}

/** Accepted image MIME types for inline images */
export const INLINE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

/**
 * Extract all staging commit tokens from markdown content.
 */
export function extractStagingTokens(content: string): string[] {
  const tokens: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(STAGING_URL_PATTERN.source, 'gi');
  while ((match = regex.exec(content)) !== null) {
    tokens.push(match[1]);
  }
  return tokens;
}

/**
 * Extract all permanent file IDs from markdown content.
 */
export function extractPermanentFileIds(content: string): string[] {
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(PERMANENT_URL_PATTERN.source, 'gi');
  while ((match = regex.exec(content)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

/**
 * Count the number of inline images (both staging and permanent) in content.
 */
export function countInlineImages(content: string): number {
  const regex = new RegExp(MARKDOWN_IMAGE_PATTERN.source, 'g');
  let count = 0;
  while (regex.exec(content) !== null) count++;
  return count;
}

/**
 * Check if a URL is a valid staging preview URL.
 */
export function isStagingUrl(url: string): boolean {
  const regex = new RegExp(`^${STAGING_URL_PATTERN.source}$`, 'i');
  return regex.test(url);
}

/**
 * Check if a URL is a valid permanent post image URL.
 */
export function isPermanentUrl(url: string): boolean {
  const regex = new RegExp(`^${PERMANENT_URL_PATTERN.source}$`, 'i');
  return regex.test(url);
}

/**
 * Check if a URL is an allowed post image URL (permanent or staging preview).
 * Used by the text formatter sanitizer to allow images that haven't been
 * committed to the vault yet (staging URLs) as well as permanent URLs.
 */
export function isAllowedImageUrl(url: string): boolean {
  return isPermanentUrl(url) || isStagingUrl(url);
}

/**
 * Strip image markdown whose URL is neither a staging URL nor a permanent URL.
 * Returns the content with external image markdown removed.
 */
export function stripExternalImageUrls(content: string): string {
  return content.replace(
    new RegExp(MARKDOWN_IMAGE_PATTERN.source, 'g'),
    (match, _alt, url) => {
      if (isStagingUrl(url) || isPermanentUrl(url)) return match;
      return ''; // Strip external image markdown
    },
  );
}

/**
 * Get the vault container name for a hub's post images.
 */
export function getHubImageContainerName(hubId: string): string {
  return `hub-${hubId}-images`;
}

/**
 * Get the vault container name for a user's post images (top-level posts).
 */
export function getUserImageContainerName(userId: string): string {
  return `user-${userId}-post-images`;
}
