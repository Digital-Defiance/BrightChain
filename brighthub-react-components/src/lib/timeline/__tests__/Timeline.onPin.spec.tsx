/**
 * Unit tests for Timeline component — onPin prop pass-through to PostCard.
 *
 * Verifies that the pin button renders when onPin and currentUserId are
 * provided, does not render when onPin is absent, and calls onPin with
 * the correct post ID when clicked.
 */

jest.mock('@brightchain/brighthub-lib', () => ({
  ...jest.requireActual('@brightchain/brighthub-lib'),
  BrightHubStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string) => String(p) },
  ),
  BrightHubComponentId: 'BrightHub',
}));

jest.mock('../../hooks/useBrightHubTranslation', () => ({
  useBrightHubTranslation: () => ({ t: (key: string) => key }),
}));

import { PostType } from '@brightchain/brighthub-lib';
import { fireEvent, render, screen } from '@testing-library/react';
import Timeline from '../../timeline/Timeline';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createPost(overrides = {}) {
  return {
    _id: 'post-1',
    authorId: 'user-1',
    content: 'Test',
    formattedContent: '<p>Test</p>',
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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Timeline — onPin prop', () => {
  it('renders pin button on posts when onPin and currentUserId are provided', () => {
    render(
      <Timeline
        posts={[createPost()]}
        onPin={jest.fn()}
        currentUserId="user-1"
        onReport={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Pin post to profile')).toBeTruthy();
  });

  it('does not render pin button when onPin is not provided', () => {
    render(
      <Timeline
        posts={[createPost()]}
        currentUserId="user-1"
        onReport={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText('Pin post to profile')).toBeNull();
  });

  it('calls onPin with the correct post ID when pin button is clicked', () => {
    const onPin = jest.fn();

    render(
      <Timeline
        posts={[createPost()]}
        onPin={onPin}
        currentUserId="user-1"
        onReport={jest.fn()}
      />,
    );

    const pinButton = screen.getByLabelText('Pin post to profile');
    fireEvent.click(pinButton);

    expect(onPin).toHaveBeenCalledTimes(1);
    expect(onPin).toHaveBeenCalledWith('post-1');
  });
});
