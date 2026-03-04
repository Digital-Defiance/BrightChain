jest.mock('@brightchain/brightchain-lib', () => ({
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
  }),
}));

import type { IBaseNotification } from '@brightchain/brighthub-lib';
import {
  NotificationCategory,
  NotificationType,
} from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { NotificationList } from './NotificationList';

const makeNotification = (
  overrides: Partial<IBaseNotification<string>> = {},
): IBaseNotification<string> => ({
  _id: 'notif-1',
  recipientId: 'user-1',
  type: NotificationType.Like,
  category: NotificationCategory.Social,
  actorId: 'actor-1',
  content: 'Alice liked your post',
  clickThroughUrl: '/posts/1',
  isRead: false,
  createdAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

describe('NotificationList', () => {
  it('renders notifications', () => {
    render(
      <NotificationList
        notifications={[
          makeNotification({ _id: 'n1', content: 'Notification 1' }),
          makeNotification({ _id: 'n2', content: 'Notification 2' }),
        ]}
      />,
    );
    expect(screen.getByText('Notification 1')).toBeInTheDocument();
    expect(screen.getByText('Notification 2')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    render(<NotificationList notifications={[]} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('filters by unread', () => {
    render(
      <NotificationList
        notifications={[
          makeNotification({ _id: 'n1', content: 'Unread', isRead: false }),
          makeNotification({ _id: 'n2', content: 'Read', isRead: true }),
        ]}
      />,
    );
    // Click the "Unread" tab
    fireEvent.click(screen.getByText('NotificationList_FilterUnread'));
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.queryByText('Read')).not.toBeInTheDocument();
  });

  it('filters by read', () => {
    render(
      <NotificationList
        notifications={[
          makeNotification({ _id: 'n1', content: 'Unread', isRead: false }),
          makeNotification({ _id: 'n2', content: 'Read', isRead: true }),
        ]}
      />,
    );
    fireEvent.click(screen.getByText('NotificationList_FilterRead'));
    expect(screen.queryByText('Unread')).not.toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
  });

  it('shows load more when hasMore is true', () => {
    render(
      <NotificationList notifications={[makeNotification()]} hasMore={true} />,
    );
    expect(screen.getByTestId('load-more')).toBeInTheDocument();
  });

  it('calls onLoadMore when load more is clicked', () => {
    const onLoadMore = jest.fn();
    render(
      <NotificationList
        notifications={[makeNotification()]}
        hasMore={true}
        onLoadMore={onLoadMore}
      />,
    );
    fireEvent.click(screen.getByTestId('load-more'));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('shows end of list when no more notifications', () => {
    render(
      <NotificationList notifications={[makeNotification()]} hasMore={false} />,
    );
    expect(screen.getByTestId('end-of-list')).toBeInTheDocument();
  });
});
