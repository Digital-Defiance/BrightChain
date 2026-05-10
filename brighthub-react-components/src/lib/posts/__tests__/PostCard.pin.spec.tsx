/**
 * Unit tests for PostCard pin/unpin button behavior.
 *
 * Tests that the pin button renders only for own posts when onPin is provided,
 * displays the correct icon and aria-label based on isPinned state,
 * and calls onPin with the post ID when clicked.
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
  IBasePostData,
  IBaseUserProfile,
} from '@brightchain/brighthub-lib';
import { PostType } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import PostCard from '../PostCard';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createPost(
  overrides: Partial<IBasePostData<string>> = {},
): IBasePostData<string> {
  return {
    _id: 'post-1',
    authorId: 'user-1',
    content: 'Test post',
    formattedContent: '<p>Test post</p>',
    postType: PostType.Original,
    mediaAttachments: [],
    mentions: [],
    hashtags: [],
    likeCount: 0,
    repostCount: 0,
    replyCount: 0,
    quoteCount: 0,
    isEdited: false,
    isBlogPost: true,
    isPinned: false,
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

describe('PostCard pin button', () => {
  const author = createAuthor();

  it('does not render pin button when onPin is not provided', () => {
    const post = createPost();

    render(
      <PostCard
        post={post}
        author={author}
        currentUserId="user-1"
        onReport={jest.fn()}
      />,
    );

    expect(
      screen.queryByLabelText('Pin post to profile'),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Unpin post')).not.toBeInTheDocument();
  });

  it('does not render pin button when currentUserId does not match post.authorId', () => {
    const post = createPost({ authorId: 'user-1' });

    render(
      <PostCard
        post={post}
        author={author}
        currentUserId="different-user"
        onPin={jest.fn()}
        onReport={jest.fn()}
      />,
    );

    expect(
      screen.queryByLabelText('Pin post to profile'),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Unpin post')).not.toBeInTheDocument();
  });

  it('renders pin button when onPin is provided and currentUserId matches authorId', () => {
    const post = createPost({ authorId: 'user-1', isPinned: false });

    render(
      <PostCard
        post={post}
        author={author}
        currentUserId="user-1"
        onPin={jest.fn()}
        onReport={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Pin post to profile')).toBeInTheDocument();
  });

  it('shows "Pin post to profile" aria-label when post.isPinned is false', () => {
    const post = createPost({ isPinned: false });

    render(
      <PostCard
        post={post}
        author={author}
        currentUserId="user-1"
        onPin={jest.fn()}
        onReport={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Pin post to profile')).toBeInTheDocument();
    expect(screen.queryByLabelText('Unpin post')).not.toBeInTheDocument();
  });

  it('shows "Unpin post" aria-label when post.isPinned is true', () => {
    const post = createPost({ isPinned: true });

    render(
      <PostCard
        post={post}
        author={author}
        currentUserId="user-1"
        onPin={jest.fn()}
        onReport={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Unpin post')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Pin post to profile'),
    ).not.toBeInTheDocument();
  });

  it('calls onPin with post._id when clicked', () => {
    const onPin = jest.fn();
    const post = createPost({ _id: 'post-42', isPinned: false });

    render(
      <PostCard
        post={post}
        author={author}
        currentUserId="user-1"
        onPin={onPin}
        onReport={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Pin post to profile'));

    expect(onPin).toHaveBeenCalledTimes(1);
    expect(onPin).toHaveBeenCalledWith('post-42');
  });
});
