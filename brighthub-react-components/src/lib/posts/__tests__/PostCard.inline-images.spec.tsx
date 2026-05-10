/**
 * Unit tests for PostCard inline image rendering.
 *
 * Feature: brighthub-post-images
 * Requirements: 8.2, 8.3, 9.1
 *
 * Tests that PostCard renders inline images from formattedContent HTML
 * and that no separate media grid is rendered for posts with inline images.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@brightchain/brighthub-lib', () => ({
  ...jest.requireActual('@brightchain/brighthub-lib'),
  __esModule: true,
  BrightHubStrings: new Proxy(
    {},
    { get: (_target: unknown, prop: string) => String(prop) },
  ),
  BrightHubComponentId: 'BrightHub',
}));

jest.mock('../../hooks/useBrightHubTranslation', () => ({
  useBrightHubTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) {
        return Object.entries(params).reduce(
          (acc, [k, v]) => acc.replace(`{{${k}}}`, v),
          key,
        );
      }
      return key;
    },
  }),
}));

import type {
  IBaseMediaAttachment,
  IBasePostData,
  IBaseUserProfile,
} from '@brightchain/brighthub-lib';
import { PostType } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import PostCard from '../PostCard';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PERMANENT_FILE_ID_1 = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const PERMANENT_FILE_ID_2 = 'f9e8d7c6-b5a4-4210-fedc-ba0987654321';
const PERMANENT_URL_1 = `/api/post-images/${PERMANENT_FILE_ID_1}`;
const PERMANENT_URL_2 = `/api/post-images/${PERMANENT_FILE_ID_2}`;

function createPost(
  overrides: Partial<IBasePostData<string>> = {},
): IBasePostData<string> {
  return {
    _id: 'post-1',
    authorId: 'user-1',
    content: 'Hello world',
    formattedContent: '<p>Hello world</p>',
    postType: PostType.Original,
    mediaAttachments: [],
    mentions: [],
    hashtags: [],
    likeCount: 0,
    repostCount: 0,
    replyCount: 0,
    quoteCount: 0,
    isEdited: false,
    isBlogPost: false,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    ...overrides,
  };
}

function createAuthor(
  overrides: Partial<IBaseUserProfile<string>> = {},
): IBaseUserProfile<string> {
  return {
    _id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    bio: '',
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    isVerified: false,
    isProtected: false,
    approveFollowersMode: 0 as any,
    privacySettings: {} as any,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMediaAttachment(
  overrides: Partial<IBaseMediaAttachment<string>> = {},
): IBaseMediaAttachment<string> {
  return {
    _id: PERMANENT_FILE_ID_1,
    url: PERMANENT_URL_1,
    mimeType: 'image/jpeg',
    size: 102400,
    width: 800,
    height: 600,
    altText: 'Test image',
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PostCard inline image rendering', () => {
  const author = createAuthor();

  /**
   * Requirement 8.2: When a post has inline images in formattedContent,
   * render images inline within the HTML content and not display a separate media grid.
   */
  describe('inline image rendering from formattedContent', () => {
    it('renders inline images from formattedContent HTML', () => {
      const post = createPost({
        formattedContent: `<p>Check out this photo:</p><img src="${PERMANENT_URL_1}" alt="A sunset" loading="lazy" style="max-width: 100%" /><p>Beautiful, right?</p>`,
        mediaAttachments: [
          createMediaAttachment({
            altText: 'A sunset',
          }),
        ],
      });

      const { container } = render(<PostCard post={post} author={author} />);

      // The inline image should be rendered from the formattedContent HTML
      const img = container.querySelector(`img[src="${PERMANENT_URL_1}"]`);
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'A sunset');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('renders multiple inline images from formattedContent', () => {
      const post = createPost({
        formattedContent: `<p>Two images:</p><img src="${PERMANENT_URL_1}" alt="First" loading="lazy" style="max-width: 100%" /><p>And another:</p><img src="${PERMANENT_URL_2}" alt="Second" loading="lazy" style="max-width: 100%" />`,
        mediaAttachments: [
          createMediaAttachment({
            _id: PERMANENT_FILE_ID_1,
            url: PERMANENT_URL_1,
            altText: 'First',
          }),
          createMediaAttachment({
            _id: PERMANENT_FILE_ID_2,
            url: PERMANENT_URL_2,
            altText: 'Second',
          }),
        ],
      });

      const { container } = render(<PostCard post={post} author={author} />);

      const images = container.querySelectorAll(
        'img[src^="/api/post-images/"]',
      );
      expect(images).toHaveLength(2);
      expect(images[0]).toHaveAttribute('alt', 'First');
      expect(images[1]).toHaveAttribute('alt', 'Second');
    });

    it('renders formattedContent with permanent URL images correctly', () => {
      const post = createPost({
        formattedContent: `<p>Here is an image with <strong>bold text</strong> around it:</p><img src="${PERMANENT_URL_1}" alt="Photo" loading="lazy" style="max-width: 100%" /><p>End of post.</p>`,
        mediaAttachments: [createMediaAttachment({ altText: 'Photo' })],
      });

      const { container } = render(<PostCard post={post} author={author} />);

      // Verify the image is rendered inline within the content
      const img = container.querySelector(`img[src="${PERMANENT_URL_1}"]`);
      expect(img).toBeInTheDocument();

      // Verify surrounding text content is also rendered
      expect(container.textContent).toContain('bold text');
      expect(container.textContent).toContain('End of post.');
    });
  });

  /**
   * Requirement 8.3: PostCard determines rendering mode based on whether
   * formattedContent contains <img> tags with permanent URLs.
   * No separate media grid should be rendered for posts with inline images.
   */
  describe('no separate media grid for inline image posts', () => {
    it('does not render a media grid when post has inline images in formattedContent', () => {
      const post = createPost({
        formattedContent: `<p>Inline image:</p><img src="${PERMANENT_URL_1}" alt="Inline" loading="lazy" style="max-width: 100%" />`,
        mediaAttachments: [createMediaAttachment()],
      });

      const { container } = render(<PostCard post={post} author={author} />);

      // There should be no grid-based media rendering
      // The old grid used a Box with display: grid and rendered images from mediaAttachments
      // With inline images, only the formattedContent img tags should exist
      const allImages = container.querySelectorAll('img');
      // Only the inline image from formattedContent + the author avatar
      const postImages = Array.from(allImages).filter((img) =>
        img.getAttribute('src')?.startsWith('/api/post-images/'),
      );
      expect(postImages).toHaveLength(1);
      expect(postImages[0]).toHaveAttribute('src', PERMANENT_URL_1);
    });

    it('does not render a separate media grid even with multiple mediaAttachments', () => {
      const post = createPost({
        formattedContent: `<p>Two inline images:</p><img src="${PERMANENT_URL_1}" alt="First" /><img src="${PERMANENT_URL_2}" alt="Second" />`,
        mediaAttachments: [
          createMediaAttachment({
            _id: PERMANENT_FILE_ID_1,
            url: PERMANENT_URL_1,
          }),
          createMediaAttachment({
            _id: PERMANENT_FILE_ID_2,
            url: PERMANENT_URL_2,
          }),
        ],
      });

      const { container } = render(<PostCard post={post} author={author} />);

      // Only the 2 inline images from formattedContent should exist (no grid duplicates)
      const postImages = Array.from(container.querySelectorAll('img')).filter(
        (img) => img.getAttribute('src')?.startsWith('/api/post-images/'),
      );
      expect(postImages).toHaveLength(2);
    });

    it('does not render a media grid when mediaAttachments is non-empty but formattedContent has no images', () => {
      // Edge case: mediaAttachments exist but formattedContent has no img tags
      // With the grid removed, these attachments are simply not rendered as a grid
      const post = createPost({
        formattedContent: '<p>Text only post</p>',
        mediaAttachments: [createMediaAttachment()],
      });

      const { container } = render(<PostCard post={post} author={author} />);

      // No post images should be rendered (grid is removed)
      const postImages = Array.from(container.querySelectorAll('img')).filter(
        (img) => img.getAttribute('src')?.startsWith('/api/post-images/'),
      );
      expect(postImages).toHaveLength(0);
    });
  });

  /**
   * Requirement 9.1: Inline images render with max-width: 100%.
   */
  describe('inline image display attributes', () => {
    it('renders inline images with style and loading attributes from formattedContent', () => {
      const post = createPost({
        formattedContent: `<img src="${PERMANENT_URL_1}" alt="Responsive" loading="lazy" style="max-width: 100%" />`,
        mediaAttachments: [createMediaAttachment({ altText: 'Responsive' })],
      });

      const { container } = render(<PostCard post={post} author={author} />);

      const img = container.querySelector(`img[src="${PERMANENT_URL_1}"]`);
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('loading', 'lazy');
      expect(img).toHaveAttribute('style', 'max-width: 100%');
    });
  });

  /**
   * Verify that a post with no media at all renders correctly.
   */
  describe('posts without images', () => {
    it('renders a text-only post without any image elements', () => {
      const post = createPost({
        formattedContent: '<p>Just text, no images.</p>',
        mediaAttachments: [],
      });

      const { container } = render(<PostCard post={post} author={author} />);

      // Only the avatar image should exist
      const postImages = Array.from(container.querySelectorAll('img')).filter(
        (img) => img.getAttribute('src')?.startsWith('/api/post-images/'),
      );
      expect(postImages).toHaveLength(0);
      expect(container.textContent).toContain('Just text, no images.');
    });
  });
});
