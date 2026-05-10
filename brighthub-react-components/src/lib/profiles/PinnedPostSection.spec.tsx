/**
 * Unit tests for PinnedPostSection component.
 *
 * Feature: brighthub-profile-enhancements
 * Requirements: 6.1, 6.2, 6.3, 6.4
 *
 * Tests that PinnedPostSection renders the pinned post with a pin indicator,
 * hides when the feature is disabled or the post is deleted, shows the unpin
 * button only for the profile owner, and calls onUnpin with the correct post ID.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock @brightchain/brightchain-lib to avoid the full ECIES/GUID init chain.
jest.mock('@brightchain/brightchain-lib', () => ({
  __esModule: true,
  BrightHubStrings: new Proxy(
    {},
    { get: (_target: unknown, prop: string) => String(prop) },
  ),
  BrightHubComponentId: 'BrightHub',
  i18nEngine: {
    registerEnum: jest.fn(() => ({})),
    translate: jest.fn((key: string) => key),
    translateEnum: jest.fn((_enumType: unknown, value: unknown) =>
      String(value),
    ),
  },
}));

jest.mock('@brightchain/brighthub-lib', () => ({
  ...jest.requireActual('@brightchain/brighthub-lib'),
  __esModule: true,
  BrightHubStrings: new Proxy(
    {},
    { get: (_target: unknown, prop: string) => String(prop) },
  ),
  BrightHubComponentId: 'BrightHub',
}));

jest.mock('../hooks/useBrightHubTranslation', () => ({
  useBrightHubTranslation: () => ({
    t: (key: string, _vars?: Record<string, string>) => key,
    tEnum: (_enumType: unknown, value: unknown) => String(value),
  }),
}));

// Mock PostCard to avoid deep dependency chains
jest.mock('../posts/PostCard', () => ({
  PostCard: ({ post }: { post: { _id: string } }) => (
    <div data-testid="post-card" data-post-id={post._id}>
      PostCard mock
    </div>
  ),
}));

import type {
  IBasePostData,
  IBaseUserProfile,
} from '@brightchain/brighthub-lib';
import { PostType } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render } from '@testing-library/react';
import { PinnedPostSection } from './PinnedPostSection';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PinnedPostSection', () => {
  const post = createPost();
  const author = createAuthor();

  /**
   * Requirement 6.1, 6.2: When featureEnabled is true and post is not deleted,
   * render the pinned post with a pin indicator.
   */
  it('renders the pinned post with a pin indicator when featureEnabled is true and post is not deleted', () => {
    const { getByTestId, getByText } = render(
      <PinnedPostSection
        pinnedPost={post}
        author={author}
        featureEnabled={true}
      />,
    );

    // The PostCard mock should be rendered
    expect(getByTestId('post-card')).toBeInTheDocument();

    // The "Pinned" label should be visible (pin indicator)
    expect(getByText('PinnedPostSection_Pinned')).toBeInTheDocument();
  });

  /**
   * Requirement 6.4: When featureEnabled is false, render nothing.
   */
  it('renders nothing when featureEnabled is false', () => {
    const { container } = render(
      <PinnedPostSection
        pinnedPost={post}
        author={author}
        featureEnabled={false}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  /**
   * Requirement 6.3: When pinnedPost.isDeleted is true, render nothing.
   */
  it('renders nothing when pinnedPost.isDeleted is true', () => {
    const deletedPost = createPost({ isDeleted: true });

    const { container } = render(
      <PinnedPostSection
        pinnedPost={deletedPost}
        author={author}
        featureEnabled={true}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  /**
   * Requirement 6.1: Shows the unpin button when isSelf is true and onUnpin is provided.
   */
  it('shows the unpin button when isSelf is true and onUnpin is provided', () => {
    const onUnpin = jest.fn();

    const { getByText } = render(
      <PinnedPostSection
        pinnedPost={post}
        author={author}
        featureEnabled={true}
        isSelf={true}
        onUnpin={onUnpin}
      />,
    );

    expect(getByText('PinnedPostSection_Unpin')).toBeInTheDocument();
  });

  /**
   * Requirement 6.1: Does not show the unpin button when isSelf is false.
   */
  it('does not show the unpin button when isSelf is false', () => {
    const onUnpin = jest.fn();

    const { queryByText } = render(
      <PinnedPostSection
        pinnedPost={post}
        author={author}
        featureEnabled={true}
        isSelf={false}
        onUnpin={onUnpin}
      />,
    );

    expect(queryByText('PinnedPostSection_Unpin')).not.toBeInTheDocument();
  });

  /**
   * Requirement 6.1: Calls onUnpin with the correct post ID when the unpin button is clicked.
   */
  it('calls onUnpin with the correct post ID when the unpin button is clicked', () => {
    const onUnpin = jest.fn();
    const pinnedPost = createPost({ _id: 'pinned-post-42' });

    const { getByText } = render(
      <PinnedPostSection
        pinnedPost={pinnedPost}
        author={author}
        featureEnabled={true}
        isSelf={true}
        onUnpin={onUnpin}
      />,
    );

    fireEvent.click(getByText('PinnedPostSection_Unpin'));

    expect(onUnpin).toHaveBeenCalledTimes(1);
    expect(onUnpin).toHaveBeenCalledWith('pinned-post-42');
  });
});
