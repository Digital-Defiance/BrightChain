/**
 * Unit tests for CreateDMDialog component.
 *
 * Tests search filtering display and existing conversation navigation.
 *
 * Requirements: 6.2, 6.4
 */

jest.mock('@brightchain/brightchain-lib', () => ({
  PresenceStatus: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    IDLE: 'idle',
    DO_NOT_DISTURB: 'dnd',
  },
}));

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
  }),
}));

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { CreateDMDialogProps } from '../CreateDMDialog';
import CreateDMDialog from '../CreateDMDialog';

// ─── Helpers ────────────────────────────────────────────────────────────────

const testUsers = [
  { id: 'user-1', displayName: 'Alice Anderson' },
  { id: 'user-2', displayName: 'Bob Baker' },
  { id: 'user-3', displayName: 'Charlie Chen' },
];

function renderDialog(overrides: Partial<CreateDMDialogProps> = {}) {
  const defaultProps: CreateDMDialogProps = {
    open: true,
    onClose: jest.fn(),
    onConversationStarted: jest.fn(),
    currentUserId: 'current-user',
    users: testUsers,
    existingConversations: [],
    sendDirectMessage: jest.fn().mockResolvedValue('new-conv-id'),
    ...overrides,
  };
  return {
    ...render(<CreateDMDialog {...defaultProps} />),
    props: defaultProps,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CreateDMDialog', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the dialog when open is true', () => {
    renderDialog({ open: true });
    expect(screen.getByText('Create_DM_Title')).toBeTruthy();
    expect(screen.getByLabelText(/Create_DM_SearchLabel/i)).toBeTruthy();
  });

  it('does not render dialog content when open is false', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('Create_DM_Title')).toBeNull();
  });

  it('displays all users initially (Req 6.2)', () => {
    renderDialog();
    expect(screen.getByText('Alice Anderson')).toBeTruthy();
    expect(screen.getByText('Bob Baker')).toBeTruthy();
    expect(screen.getByText('Charlie Chen')).toBeTruthy();
  });

  it('filters users by search query after debounce (Req 6.2)', async () => {
    renderDialog();

    const searchInput = screen.getByLabelText(/Create_DM_SearchLabel/i);
    fireEvent.change(searchInput, { target: { value: 'alice' } });

    // Advance past debounce timer
    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Anderson')).toBeTruthy();
      expect(screen.queryByText('Bob Baker')).toBeNull();
      expect(screen.queryByText('Charlie Chen')).toBeNull();
    });
  });

  it('navigates to existing conversation instead of creating duplicate (Req 6.4)', async () => {
    const onConversationStarted = jest.fn();
    const sendDirectMessage = jest.fn();

    renderDialog({
      onConversationStarted,
      sendDirectMessage,
      existingConversations: [
        {
          id: 'existing-conv-42',
          participantIds: ['current-user', 'user-1'],
        },
      ],
    });

    // Select Alice
    fireEvent.click(screen.getByText('Alice Anderson'));

    // Confirm
    fireEvent.click(screen.getByText('Create_DM_StartConversation'));

    await waitFor(() => {
      // Should navigate to existing conversation
      expect(onConversationStarted).toHaveBeenCalledWith('existing-conv-42');
      // Should NOT call sendDirectMessage
      expect(sendDirectMessage).not.toHaveBeenCalled();
    });
  });

  it('calls sendDirectMessage when no existing conversation exists', async () => {
    const onConversationStarted = jest.fn();
    const sendDirectMessage = jest.fn().mockResolvedValue('new-conv-99');

    renderDialog({
      onConversationStarted,
      sendDirectMessage,
      existingConversations: [],
    });

    // Select Bob
    fireEvent.click(screen.getByText('Bob Baker'));

    // Confirm
    fireEvent.click(screen.getByText('Create_DM_StartConversation'));

    await waitFor(() => {
      expect(sendDirectMessage).toHaveBeenCalledWith('user-2');
      expect(onConversationStarted).toHaveBeenCalledWith('new-conv-99');
    });
  });

  it('calls onClose when Cancel is clicked', () => {
    const { props } = renderDialog();
    fireEvent.click(screen.getByText('Create_DM_Cancel'));
    expect(props.onClose).toHaveBeenCalled();
  });
});
