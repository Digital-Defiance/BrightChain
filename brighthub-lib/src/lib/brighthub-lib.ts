/// <reference path="./markdown-it-plugins.d.ts" />
import MarkdownIt from 'markdown-it';
import markdownItAbbr from 'markdown-it-abbr';
import markdownItContainer from 'markdown-it-container';
import markdownItDeflist from 'markdown-it-deflist';
import markdownItFootnote from 'markdown-it-footnote';
import markdownItMark from 'markdown-it-mark';
import markdownItToc from 'markdown-it-table-of-contents';
import markdownItTaskLists from 'markdown-it-task-lists';
import sanitizeHtml from 'sanitize-html';
import { v4 } from 'uuid';
import {
  isValidIconMarkup,
  parseIconMarkup,
  stripIconMarkup,
} from './font-awesome/font-awesome';
import customFootnote from './markdownit-footnote-currenturl';

const markdownItPlugins = [
  { plugin: markdownItTaskLists, options: { enabled: true } },
  { plugin: markdownItMark },
  { plugin: markdownItToc },
  { plugin: markdownItDeflist },
  { plugin: markdownItContainer, options: 'info' },
  { plugin: markdownItAbbr },
  { plugin: markdownItFootnote },
  { plugin: customFootnote },
];

/**
 * Makes a data:// URL from a base64 encoded binary blob string containing a PNG image
 * @param imageBase64Json String containing b64_json
 */
export function makeDataUrl(imageBase64Json: string): string {
  return `data:image/png;base64,${imageBase64Json}`;
}

// /**
//  * Given an input image size, return the closest image size our AI can process
//  * @param size
//  * @returns
//  */
// export function closestImageSize(size: number): CreateImageRequestSizeEnum {
//   // If size is greater than or equal to 1024, return 1024
//   // If size is greater than or equal to 768, return 1024 (round up)
//   // If size is greater than or equal to 512, return 512
//   // If size is greater than or equal to 256, return 512 (round up)
//   // If size is less than or equal to 384, return 256
//   if (size >= 1024 || (size >= 768 && size < 1024)) {
//     return CreateImageRequestSizeEnum._1024x1024;
//   } else if (size >= 512 || (size >= 256 && size < 512)) {
//     return CreateImageRequestSizeEnum._512x512;
//   }
//   return CreateImageRequestSizeEnum._256x256;
// }

/**
 * Converts an image data url to a File object
 * @param imageDataUrl
 * @param filename
 * @returns
 */
export function imageDataUrlToFile(
  imageDataUrl: string,
  filename = 'image.png',
): File {
  if (!imageDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('Invalid image data URL');
  }
  // Extract the base64 data from the URL
  const base64Data = imageDataUrl.split(',')[1];
  // Convert base64 to binary data
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  // Create a blob from the binary data
  const imageBlob = new Blob([byteArray], { type: 'image/png' });
  // Convert the blob to a file
  const imageFile = new File([imageBlob], filename, { type: 'image/png' });
  return imageFile;
}

/**
 * Converts a markdown string to HTML
 * @param markdown
 * @returns
 */
export function parseMarkdown(
  markdown: string,
  docId?: string,
  currentUrl?: string,
): string {
  const md = MarkdownIt('default').set({
    breaks: true,
    html: true,
    linkify: true,
    typographer: true,
    xhtmlOut: true,
  });

  markdownItPlugins.forEach(({ plugin, options }) => {
    if (options !== undefined) {
      md.use(plugin, options);
    } else {
      md.use(plugin);
    }
  });

  const env = {
    docId: docId ? docId : v4(),
    currentUrl: currentUrl ? currentUrl : '',
  };

  return md.render(markdown, env);
}

/**
 * Strips HTML tags/attributes, parses markdown, then parses our custom icon markup
 * @param content
 * @returns
 */
export function parsePostContent(
  content: string,
  isBlogPost: boolean,
  docId?: string,
  currentUrl?: string,
): string {
  // Phase 1: Strip HTML
  // we strip the html first because we don't support HTML in posts,
  // but our syntax is too close to markdown so it gets parsed as HTML
  content = sanitizeHtml(content, {
    allowedTags: [], // Strip all tags
    allowedAttributes: {}, // Strip all attributes
  });

  // Phase 2: Parse markdown or add line breaks
  if (isBlogPost) {
    content = parseMarkdown(content, docId, currentUrl);
  } else {
    // Replace newlines with <br> tags for non-blog posts
    content = content.replace(/\n/g, '<br />');
  }

  // Phase 3: Parse our custom icon syntax
  content = parseIconMarkup(content);

  // Trim leading/trailing whitespace
  content = content.trim();

  return content;
}

/**
 * Prepares content for character count by replacing or stripping HTML tags.
 * - Replaces valid icon markup with a bullet character.
 * - Replaces <br> tags with newline characters.
 * - Replaces <a> tags with a bullet character for the URL and includes the text content.
 * - Replaces <img> tags with their alt text or a bullet character if alt is not present.
 * - Strips all other HTML tags and attributes.
 * - Replaces CRLF pairs with a single newline character.
 * @param input
 * @param isBlogPost
 * @returns
 */
export function prepareContentForCharacterCount(
  input: string,
  isBlogPost: boolean,
): string {
  // Replace valid icon markup with a bullet character for character counting
  input = input.replace(/\{\{[^}]+\}\}/g, (match) => {
    return isValidIconMarkup(match) ? '•' : match;
  });

  // process markdown if it's a blog post
  if (isBlogPost) {
    input = parseMarkdown(input);
  }

  // Replace <br> tags with newline characters for counting
  input = input.replace(/<br\s*\/?>\s*\n*/gi, '\n');

  // Replace <a> tags with their URLs and text content
  input = input.replace(/<a\s+href="[^"]*">([^<]*)<\/a>/gi, (match, p1) => {
    return '•' + p1;
  });

  // Replace <img> tags with their alt text or a bullet character
  input = input.replace(/<img\s+[^>]*alt="([^"]*)"[^>]*>/gi, (match, p1) => {
    return p1 || '•';
  });

  // strip HTML for character counting
  input = sanitizeHtml(input, {
    allowedTags: [], // Strip all tags
    allowedAttributes: {}, // Strip all attributes
  });

  // Replace CRLF pairs with a single newline character
  input = input.replace(/\r\n/g, '\n');

  // remove excess whitespace
  input = input.trim();

  return input;
}

/**
 * Custom character counter:
 * 1) emoji are 1 count
 * 2) unicode characters are 1 count each
 * 3) our special icon markup {{xxx}} is 1 count. But we only want to recognize valid {{ }} icon codes, and ignore any invalid ones. See parseIconMarkup.
 * 4) CR/LF counts as 1 count
 * 5) links are 1 count each
 * @param {string} input - The input string to count characters from.
 * @returns {number} - The total character count.
 */
export function getCharacterCount(input: string, isBlogPost: boolean): number {
  input = prepareContentForCharacterCount(input, isBlogPost);

  // Use Array.from to handle Unicode characters properly
  const characters = Array.from(input);

  return characters.length;
}

/**
 * Sanitizes whitespace in a string by replacing sequential whitespace with single space
 * @param input
 * @returns
 */
export function sanitizeWhitespace(input: string): string {
  // replace all whitespace with a single space
  return input.replace(/\s+/g, ' ').trim();
}

/**
 * Sanitized whitespace and strips icon markup prior to submission to AI
 * @param input
 * @returns
 */
export function sanitizeForAi(input: string): string {
  const sanitized = sanitizeWhitespace(input);
  const stripped = stripIconMarkup(sanitized);
  return stripped;
}

/**
 * Gets the timezone offset in minutes for a given timezone.
 * @param timezone
 * @returns
 */
export function getTimezoneOffset(timezone: string): number {
  const date = new Date();
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (utcDate.getTime() - tzDate.getTime()) / 60000;
}

/**
 * Checks if a timezone is valid
 * @param timezone
 * @returns
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    // If the timezone is invalid, getTimezoneOffset will throw an error
    getTimezoneOffset(timezone);
    return true;
  } catch {
    return false;
  }
}
