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
import { NotificationItem } from './NotificationItem';

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

describe('NotificationItem', () => {
  it('renders notification content', () => {
    render(<NotificationItem notification={makeNotification()} />);
    expect(screen.getByText('Alice liked your post')).toBeInTheDocument();
  });

  it('shows unread indicator for unread notifications', () => {
    render(
      <NotificationItem notification={makeNotification({ isRead: false })} />,
    );
    expect(screen.getByTestId('unread-dot')).toBeInTheDocument();
  });

  it('hides unread indicator for read notifications', () => {
    render(
      <NotificationItem notification={makeNotification({ isRead: true })} />,
    );
    expect(screen.queryByTestId('unread-dot')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    const notif = makeNotification();
    render(<NotificationItem notification={notif} onClick={onClick} />);
    fireEvent.click(screen.getByText('Alice liked your post'));
    expect(onClick).toHaveBeenCalledWith(notif);
  });

  it('shows action buttons on hover', () => {
    const onMarkRead = jest.fn();
    const onDelete = jest.fn();
    render(
      <NotificationItem
        notification={makeNotification()}
        onMarkRead={onMarkRead}
        onDelete={onDelete}
      />,
    );
    fireEvent.mouseEnter(screen.getByLabelText('NotificationItem_AriaLabel'));
    expect(screen.getByTestId('mark-read-btn')).toBeInTheDocument();
    expect(screen.getByTestId('delete-btn')).toBeInTheDocument();
  });

  it('shows group toggle for grouped notifications', () => {
    render(
      <NotificationItem
        notification={makeNotification()}
        groupCount={3}
        groupItems={[
          makeNotification({ _id: 'g1', content: 'Group item 1' }),
          makeNotification({ _id: 'g2', content: 'Group item 2' }),
        ]}
      />,
    );
    expect(screen.getByTestId('group-toggle')).toBeInTheDocument();
  });

  it('expands group items on toggle click', () => {
    render(
      <NotificationItem
        notification={makeNotification()}
        groupCount={3}
        groupItems={[makeNotification({ _id: 'g1', content: 'Group item 1' })]}
      />,
    );
    fireEvent.click(screen.getByTestId('group-toggle'));
    expect(screen.getByTestId('group-items')).toBeInTheDocument();
    expect(screen.getByText('Group item 1')).toBeInTheDocument();
  });
});
