import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock(
  '@digitaldefiance/express-suite-react-components',
  () => require('./helpers/i18nMock').expressSuiteReactComponentsMock,
);

import { CalendarPermissionLevel } from '@brightchain/brightcal-lib';
import type { SharingDialogProps } from '../components/SharingDialog';
import { SharingDialog } from '../components/SharingDialog';

// Mock global fetch
const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

const defaultProps: SharingDialogProps = {
  calendarId: 'cal-123',
  calendarName: 'Work Calendar',
  isOpen: true,
  onClose: jest.fn(),
  apiBaseUrl: 'http://localhost:3000',
  authToken: 'test-token',
};

const sampleShares = [
  {
    id: 'share-1',
    calendarId: 'cal-123',
    grantedToUserId: 'user-alice',
    permission: CalendarPermissionLevel.Editor,
    dateCreated: '2024-01-01T00:00:00Z',
  },
  {
    id: 'share-2',
    calendarId: 'cal-123',
    grantedToUserId: 'user-bob',
    permission: CalendarPermissionLevel.Viewer,
    dateCreated: '2024-01-02T00:00:00Z',
  },
];

beforeEach(() => {
  mockFetch.mockReset();
  jest.clearAllMocks();
});

describe('SharingDialog', () => {
  describe('share list rendering', () => {
    it('renders existing shares with user ID and permission level', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleShares,
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} />);
      });

      expect(screen.getByText('user-alice')).toBeInTheDocument();
      expect(screen.getByText('user-bob')).toBeInTheDocument();

      // Check permission labels within the shares list
      const sharesList = screen.getByLabelText('Shared users');
      expect(sharesList).toHaveTextContent('Editor');
      expect(sharesList).toHaveTextContent('Viewer');
    });

    it('renders empty state when no shares exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} />);
      });

      expect(screen.getByText(/No shares yet/)).toBeInTheDocument();
    });

    it('renders Revoke button for each share', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleShares,
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} />);
      });

      expect(screen.getByLabelText('Revoke user-alice')).toBeInTheDocument();
      expect(screen.getByLabelText('Revoke user-bob')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<SharingDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays the calendar name in the header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} />);
      });

      expect(screen.getByText(/Work Calendar/)).toBeInTheDocument();
    });
  });

  describe('share creation flow', () => {
    it('creates a new share when form is submitted', async () => {
      // First call: getShares on mount
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} />);
      });

      // Fill in the form
      const userInput = screen.getByLabelText('User ID');
      const permSelect = screen.getByLabelText('Permission level');

      fireEvent.change(userInput, { target: { value: 'user-charlie' } });
      fireEvent.change(permSelect, {
        target: { value: CalendarPermissionLevel.Editor },
      });

      // Mock the share creation call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'share-3',
          calendarId: 'cal-123',
          grantedToUserId: 'user-charlie',
          permission: CalendarPermissionLevel.Editor,
        }),
      });
      // Mock the refetch of shares after creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'share-3',
            calendarId: 'cal-123',
            grantedToUserId: 'user-charlie',
            permission: CalendarPermissionLevel.Editor,
          },
        ],
      });

      await act(async () => {
        fireEvent.submit(screen.getByLabelText('Share calendar form'));
      });

      // Verify the share API was called
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/cal/calendars/cal-123/shares',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            grantedToUserId: 'user-charlie',
            permission: CalendarPermissionLevel.Editor,
          }),
        }),
      );
    });

    it('provides permission level dropdown with Editor, Viewer, FreeBusyOnly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} />);
      });

      const permSelect = screen.getByLabelText('Permission level');
      const options = permSelect.querySelectorAll('option');

      expect(options).toHaveLength(3);
      expect(options[0]).toHaveValue(CalendarPermissionLevel.Editor);
      expect(options[1]).toHaveValue(CalendarPermissionLevel.Viewer);
      expect(options[2]).toHaveValue(CalendarPermissionLevel.FreeBusyOnly);
    });
  });

  describe('revoke flow', () => {
    it('revokes a share when Revoke button is clicked', async () => {
      // Initial getShares
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleShares,
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} />);
      });

      // Mock the revoke call
      mockFetch.mockResolvedValueOnce({ ok: true });
      // Mock the refetch after revoke
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [sampleShares[1]], // Only bob remains
      });

      await act(async () => {
        fireEvent.click(screen.getByLabelText('Revoke user-alice'));
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/cal/calendars/cal-123/shares/share-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('error display', () => {
    it('displays API errors inline without closing the dialog', async () => {
      // Initial getShares fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} />);
      });

      // Dialog should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Error should be displayed
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('displays share creation error inline', async () => {
      // Initial getShares succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} />);
      });

      // Fill in the form
      fireEvent.change(screen.getByLabelText('User ID'), {
        target: { value: 'user-invalid' },
      });

      // Mock share creation failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await act(async () => {
        fireEvent.submit(screen.getByLabelText('Share calendar form'));
      });

      // Dialog should still be open with error
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('public link', () => {
    it('copies public link to clipboard when "Copy Public Link" is clicked', async () => {
      // Initial getShares
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} />);
      });

      // Mock generatePublicLink
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ publicLink: 'https://cal.example.com/share/abc' }),
      });

      // Mock clipboard API
      const writeText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText },
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Copy Public Link'));
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/cal/calendars/cal-123/public-link',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(writeText).toHaveBeenCalledWith(
        'https://cal.example.com/share/abc',
      );
      expect(screen.getByText('Link copied to clipboard')).toBeInTheDocument();
    });

    it('shows "Revoke Public Link" button when public link exists', async () => {
      // Initial getShares returns a share with a public link
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'share-pub',
            calendarId: 'cal-123',
            grantedToUserId: 'user-alice',
            permission: CalendarPermissionLevel.Viewer,
            publicLink: 'https://cal.example.com/share/existing',
          },
        ],
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} />);
      });

      expect(screen.getByText('Revoke Public Link')).toBeInTheDocument();
    });

    it('revokes public link when "Revoke Public Link" is clicked', async () => {
      // Initial getShares returns a share with a public link
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'share-pub',
            calendarId: 'cal-123',
            grantedToUserId: 'user-alice',
            permission: CalendarPermissionLevel.Viewer,
            publicLink: 'https://cal.example.com/share/existing',
          },
        ],
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} />);
      });

      // Mock the revoke public link call
      mockFetch.mockResolvedValueOnce({ ok: true });

      await act(async () => {
        fireEvent.click(screen.getByText('Revoke Public Link'));
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/cal/calendars/cal-123/public-link',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('does not show "Revoke Public Link" when no public link exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} />);
      });

      expect(screen.queryByText('Revoke Public Link')).not.toBeInTheDocument();
    });
  });

  describe('dialog behavior', () => {
    it('calls onClose when close button is clicked', async () => {
      const onClose = jest.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} onClose={onClose} />);
      });

      fireEvent.click(screen.getByLabelText('Close sharing dialog'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', async () => {
      const onClose = jest.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await act(async () => {
        render(<SharingDialog {...defaultProps} onClose={onClose} />);
      });

      // Click the overlay (the presentation div)
      fireEvent.click(screen.getByRole('presentation'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
