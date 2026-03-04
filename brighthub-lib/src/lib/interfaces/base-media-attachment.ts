/**
 * Media attachment for posts and messages
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseMediaAttachment<TId> {
  /** Unique identifier for the attachment */
  _id: TId;
  /** URL to the media file */
  url: string;
  /** MIME type of the media (e.g., 'image/jpeg', 'image/png', 'image/gif', 'image/webp') */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Width in pixels (for images) */
  width?: number;
  /** Height in pixels (for images) */
  height?: number;
  /** Alt text for accessibility */
  altText?: string;
  /** Blurhash for placeholder display */
  blurhash?: string;
}
