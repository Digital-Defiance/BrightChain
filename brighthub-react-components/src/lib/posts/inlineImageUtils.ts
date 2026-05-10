/**
 * Utility functions for inline image markdown manipulation in PostComposer.
 *
 * These are extracted as pure functions for testability.
 */

import { MARKDOWN_IMAGE_PATTERN } from '@brightchain/brighthub-lib';

/**
 * Updates the alt text of a specific markdown image identified by its URL.
 *
 * Finds the first occurrence of `![...](url)` matching the given URL
 * and replaces the alt text portion with `newAltText`.
 *
 * @param content - The full textarea content string
 * @param url - The image URL to match (must match exactly)
 * @param newAltText - The new alt text to set
 * @returns The updated content string, or the original if no match found
 */
export function updateAltText(
  content: string,
  url: string,
  newAltText: string,
): string {
  // Escape special regex characters in the URL for safe matching
  const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedUrl}\\)`);
  return content.replace(pattern, `![${newAltText}](${url})`);
}

/**
 * Extracts all markdown images from content as an array of { alt, url, index } objects.
 *
 * @param content - The full textarea content string
 * @returns Array of image entries with alt text, URL, and character index
 */
export function extractMarkdownImages(
  content: string,
): Array<{ alt: string; url: string; index: number }> {
  const images: Array<{ alt: string; url: string; index: number }> = [];
  const regex = new RegExp(MARKDOWN_IMAGE_PATTERN.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    images.push({
      alt: match[1],
      url: match[2],
      index: match.index,
    });
  }
  return images;
}
