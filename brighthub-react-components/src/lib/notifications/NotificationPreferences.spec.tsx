jest.mock('@brightchain/brighthub-lib', () => ({
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

import type { IBaseNotificationPreferences } from '@brightchain/brighthub-lib';
import {
  NotificationCategory,
  NotificationChannel,
} from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { NotificationPreferences } from './NotificationPreferences';

const makePreferences = (
  overrides: Partial<IBaseNotificationPreferences<string>> = {},
): IBaseNotificationPreferences<string> => ({
  userId: 'user-1',
  categorySettings: {
    [NotificationCategory.Social]: {
      enabled: true,
      channels: {
        [NotificationChannel.InApp]: true,
        [NotificationChannel.Email]: true,
        [NotificationChannel.Push]: false,
      },
    },
    [NotificationCategory.Messages]: {
      enabled: true,
      channels: {
        [NotificationChannel.InApp]: true,
        [NotificationChannel.Email]: false,
        [NotificationChannel.Push]: false,
      },
    },
    [NotificationCategory.Connections]: {
      enabled: false,
      channels: {
        [NotificationChannel.InApp]: true,
        [NotificationChannel.Email]: false,
        [NotificationChannel.Push]: false,
      },
    },
    [NotificationCategory.System]: {
      enabled: true,
      channels: {
        [NotificationChannel.InApp]: true,
        [NotificationChannel.Email]: true,
        [NotificationChannel.Push]: true,
      },
    },
  },
  channelSettings: {
    [NotificationChannel.InApp]: true,
    [NotificationChannel.Email]: true,
    [NotificationChannel.Push]: false,
  },
  soundEnabled: true,
  ...overrides,
});

describe('NotificationPreferences', () => {
  it('renders preferences form', () => {
    render(<NotificationPreferences preferences={makePreferences()} />);
    expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
  });

  it('shows category toggles', () => {
    render(<NotificationPreferences preferences={makePreferences()} />);
    expect(screen.getByTestId('category-toggle-social')).toBeInTheDocument();
    expect(screen.getByTestId('category-toggle-messages')).toBeInTheDocument();
    expect(screen.getByTestId('category-toggle-system')).toBeInTheDocument();
  });

  it('shows channel toggles', () => {
    render(<NotificationPreferences preferences={makePreferences()} />);
    expect(screen.getByTestId('channel-toggle-in_app')).toBeInTheDocument();
    expect(screen.getByTestId('channel-toggle-email')).toBeInTheDocument();
    expect(screen.getByTestId('channel-toggle-push')).toBeInTheDocument();
  });

  it('shows quiet hours toggle', () => {
    render(<NotificationPreferences preferences={makePreferences()} />);
    expect(screen.getByTestId('quiet-hours-toggle')).toBeInTheDocument();
  });

  it('shows DND toggle', () => {
    render(<NotificationPreferences preferences={makePreferences()} />);
    expect(screen.getByTestId('dnd-toggle')).toBeInTheDocument();
  });

  it('shows sound toggle', () => {
    render(<NotificationPreferences preferences={makePreferences()} />);
    expect(screen.getByTestId('sound-toggle')).toBeInTheDocument();
  });

  it('calls onSave when save is clicked', () => {
    const onSave = jest.fn();
    render(
      <NotificationPreferences
        preferences={makePreferences()}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByTestId('save-preferences'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('expands quiet hours fields when enabled', () => {
    render(
      <NotificationPreferences
        preferences={makePreferences({
          quietHours: {
            enabled: true,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'America/New_York',
          },
        })}
      />,
    );
    expect(screen.getByTestId('quiet-hours-start')).toBeInTheDocument();
    expect(screen.getByTestId('quiet-hours-end')).toBeInTheDocument();
    expect(screen.getByTestId('quiet-hours-timezone')).toBeInTheDocument();
  });
});
