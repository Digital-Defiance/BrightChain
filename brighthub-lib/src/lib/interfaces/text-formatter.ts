/**
 * Result of formatting text content
 */
export interface IFormattedContent {
  /** The original raw content */
  raw: string;
  /** The formatted HTML content */
  formatted: string;
  /** Extracted @mentions (usernames without the @ prefix) */
  mentions: string[];
  /** Extracted #hashtags (tags without the # prefix) */
  hashtags: string[];
  /** Character count using smart counting rules */
  characterCount: number;
}

/**
 * Options for text formatting
 */
export interface IFormatOptions {
  /** Whether this is a blog post (enables full markdown) or a regular post (simple line breaks) */
  isBlogPost?: boolean;
  /** Optional document ID for markdown rendering */
  docId?: string;
  /** Optional current URL for footnote links */
  currentUrl?: string;
  /** Maximum allowed character count (default: 280 for posts, 2000 for messages) */
  maxCharacters?: number;
}

/**
 * Result of content validation
 */
export interface IValidationResult {
  /** Whether the content is valid */
  isValid: boolean;
  /** Error messages if validation failed */
  errors: string[];
}

/**
 * Interface for the Text_Formatter service
 * Provides unified API for formatting post content with markdown, emojis, and FontAwesome icons
 */
export interface ITextFormatter {
  /**
   * Format content with markdown, emojis, and FontAwesome icons
   * Also extracts mentions and hashtags
   * @param content Raw content to format
   * @param options Formatting options
   * @returns Formatted content with extracted metadata
   */
  format(content: string, options?: IFormatOptions): IFormattedContent;

  /**
   * Extract @mentions from content
   * @param content Content to extract mentions from
   * @returns Array of usernames (without @ prefix)
   */
  extractMentions(content: string): string[];

  /**
   * Extract #hashtags from content
   * @param content Content to extract hashtags from
   * @returns Array of hashtags (without # prefix)
   */
  extractHashtags(content: string): string[];

  /**
   * Sanitize content to prevent XSS attacks
   * @param content Content to sanitize
   * @returns Sanitized content
   */
  sanitize(content: string): string;

  /**
   * Get character count using smart counting rules
   * (emojis = 1, icons = 1, links = 1, etc.)
   * @param content Content to count
   * @param isBlogPost Whether this is a blog post
   * @returns Character count
   */
  getCharacterCount(content: string, isBlogPost?: boolean): number;

  /**
   * Validate content against formatting rules
   * @param content Content to validate
   * @param options Validation options
   * @returns Validation result
   */
  validate(content: string, options?: IFormatOptions): IValidationResult;
}
