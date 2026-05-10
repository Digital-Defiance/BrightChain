/**
 * Unit tests for FontAwesome icon picker integration in CreateServerDialog.
 *
 * Tests the "Pick Icon" button visibility and the FA picker dialog opening.
 * The actual icon selection flow is tested in FontAwesomeIconPicker.spec.tsx.
 */

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tBranded: (key: string) => key,
    tComponent: (_: string, key: string) => key,
  }),
}));

jest.mock('@brightchain/brightchain-lib', () => ({
  PresenceStatus: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    IDLE: 'idle',
    DO_NOT_DISTURB: 'dnd',
  },
  DefaultRole: {
    OWNER: 'owner',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    MEMBER: 'member',
  },
  DEFAULT_SERVER_ICON_CONFIG: {
    maxFileSizeBytes: 5 * 1024 * 1024,
    outputSizePx: 256,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
    outputMimeType: 'image/png',
  },
  CONSTANTS: {
    BRIGHTCHAT: {
      FONTAWESOME_MAX_DISPLAY: 120,
      FONTAWESOME_ICON_GRID_SIZE: 40,
    },
  },
  isAllowedIconFileSize: () => true,
  isAllowedIconMimeType: () => true,
}));

jest.mock('react-easy-crop', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef(function MockCropper() {
      return React.createElement('div');
    }),
  };
});

import { fireEvent, render, screen } from '@testing-library/react';
import CreateServerDialog from '../CreateServerDialog';

const mockServer = {
  id: 'srv-1',
  name: 'Test',
  ownerId: 'u1',
  memberIds: ['u1'],
  channelIds: ['ch-1'],
  categories: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function renderDialog(
  overrides: Partial<Parameters<typeof CreateServerDialog>[0]> = {},
) {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onCreated: jest.fn(),
    createServer: jest.fn().mockResolvedValue(mockServer),
    ...overrides,
  };
  return {
    ...render(<CreateServerDialog {...defaultProps} />),
    props: defaultProps,
  };
}

describe('CreateServerDialog — FontAwesome icon picker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "Pick Icon" button in the create dialog', () => {
    renderDialog();
    expect(screen.getByText('Pick Icon')).toBeTruthy();
  });

  it('opens FontAwesomeIconPicker when "Pick Icon" is clicked', () => {
    renderDialog();

    expect(screen.queryByTestId('fa-icon-picker-dialog')).toBeNull();

    fireEvent.click(screen.getByText('Pick Icon'));

    expect(screen.getByTestId('fa-icon-picker-dialog')).toBeTruthy();
  });

  it('shows "Or choose a FontAwesome icon:" label', () => {
    renderDialog();
    expect(
      screen.getByText('Or choose a FontAwesome icon:'),
    ).toBeTruthy();
  });
});
