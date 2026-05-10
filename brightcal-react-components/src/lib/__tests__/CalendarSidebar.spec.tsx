import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock(
  '@digitaldefiance/express-suite-react-components',
  () => require('./helpers/i18nMock').expressSuiteReactComponentsMock,
);

import type { ICalendarCollectionDTO } from '@brightchain/brightcal-lib';
import type { CalendarSidebarProps } from '../components/CalendarSidebar';
import { CalendarSidebar } from '../components/CalendarSidebar';

// Mock global fetch
const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

const ownedCalendar: ICalendarCollectionDTO = {
  id: 'cal-owned-1',
  ownerId: 'user-1',
  displayName: 'Personal',
  color: '#3b82f6',
  description: 'My personal calendar',
  isDefault: true,
  isSubscription: false,
  defaultPermission: 'viewer' as any,
  dateCreated: '2024-01-01T00:00:00Z',
} as any;

const ownedCalendar2: ICalendarCollectionDTO = {
  id: 'cal-owned-2',
  ownerId: 'user-1',
  displayName: 'Work',
  color: '#ef4444',
  description: 'Work calendar',
  isDefault: false,
  isSubscription: false,
  defaultPermission: 'viewer' as any,
  dateCreated: '2024-01-01T00:00:00Z',
} as any;

const sharedCalendar: ICalendarCollectionDTO = {
  id: 'cal-shared-1',
  ownerId: 'user-2',
  displayName: 'Team Calendar',
  color: '#22c55e',
  description: 'Shared team calendar',
  isDefault: false,
  isSubscription: false,
  defaultPermission: 'viewer' as any,
  dateCreated: '2024-01-01T00:00:00Z',
} as any;

const allCalendars = [ownedCalendar, ownedCalendar2, sharedCalendar];

const defaultProps: CalendarSidebarProps = {
  calendars: allCalendars,
  visibilitySet: new Set(['cal-owned-1', 'cal-owned-2', 'cal-shared-1']),
  onVisibilityChange: jest.fn(),
  apiBaseUrl: 'http://localhost:3000',
  authToken: 'test-token',
  onCalendarsChanged: jest.fn(),
  userId: 'user-1',
};

beforeEach(() => {
  mockFetch.mockReset();
  jest.clearAllMocks();
});

describe('CalendarSidebar', () => {
  describe('calendar grouping', () => {
    it('renders "My Calendars" and "Other Calendars" sections', () => {
      render(<CalendarSidebar {...defaultProps} />);

      expect(screen.getByText('My Calendars')).toBeInTheDocument();
      expect(screen.getByText('Other Calendars')).toBeInTheDocument();
    });

    it('places owned calendars under "My Calendars"', () => {
      render(<CalendarSidebar {...defaultProps} />);

      const mySection = screen.getByLabelText('My Calendars');
      expect(mySection).toHaveTextContent('Personal');
      expect(mySection).toHaveTextContent('Work');
    });

    it('places shared calendars under "Other Calendars"', () => {
      render(<CalendarSidebar {...defaultProps} />);

      const otherSection = screen.getByLabelText('Other Calendars');
      expect(otherSection).toHaveTextContent('Team Calendar');
    });

    it('hides "Other Calendars" section when no shared calendars exist', () => {
      render(
        <CalendarSidebar
          {...defaultProps}
          calendars={[ownedCalendar, ownedCalendar2]}
        />,
      );

      expect(screen.getByText('My Calendars')).toBeInTheDocument();
      expect(screen.queryByText('Other Calendars')).not.toBeInTheDocument();
    });
  });

  describe('visibility toggles', () => {
    it('renders checkboxes for each calendar', () => {
      render(<CalendarSidebar {...defaultProps} />);

      expect(screen.getByLabelText('Toggle Personal')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle Work')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle Team Calendar')).toBeInTheDocument();
    });

    it('checks checkboxes for visible calendars', () => {
      render(<CalendarSidebar {...defaultProps} />);

      expect(screen.getByLabelText('Toggle Personal')).toBeChecked();
      expect(screen.getByLabelText('Toggle Work')).toBeChecked();
    });

    it('unchecks checkboxes for hidden calendars', () => {
      render(
        <CalendarSidebar
          {...defaultProps}
          visibilitySet={new Set(['cal-owned-1'])}
        />,
      );

      expect(screen.getByLabelText('Toggle Personal')).toBeChecked();
      expect(screen.getByLabelText('Toggle Work')).not.toBeChecked();
    });

    it('calls onVisibilityChange when a checkbox is toggled', () => {
      const onVisibilityChange = jest.fn();
      render(
        <CalendarSidebar
          {...defaultProps}
          onVisibilityChange={onVisibilityChange}
        />,
      );

      fireEvent.click(screen.getByLabelText('Toggle Personal'));

      expect(onVisibilityChange).toHaveBeenCalledTimes(1);
      const newSet = onVisibilityChange.mock.calls[0][0] as Set<string>;
      // Personal was visible, toggling should remove it
      expect(newSet.has('cal-owned-1')).toBe(false);
      expect(newSet.has('cal-owned-2')).toBe(true);
      expect(newSet.has('cal-shared-1')).toBe(true);
    });
  });

  describe('context menu', () => {
    it('opens context menu with correct options when ⋯ button is clicked', () => {
      render(<CalendarSidebar {...defaultProps} />);

      const menuBtn = screen.getByLabelText('Options for Work');
      fireEvent.click(menuBtn);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: 'Rename' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: 'Change Color' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: 'Delete' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: 'Share' }),
      ).toBeInTheDocument();
    });

    it('closes context menu when clicking outside', () => {
      render(<CalendarSidebar {...defaultProps} />);

      const menuBtn = screen.getByLabelText('Options for Work');
      fireEvent.click(menuBtn);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Click on the sidebar (outside the menu)
      fireEvent.click(screen.getByRole('complementary'));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('opens rename form when "Rename" is clicked', () => {
      render(<CalendarSidebar {...defaultProps} />);

      fireEvent.click(screen.getByLabelText('Options for Work'));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));

      expect(screen.getByLabelText('Rename calendar form')).toBeInTheDocument();
      expect(screen.getByLabelText('New calendar name')).toHaveValue('Work');
    });

    it('opens change color form when "Change Color" is clicked', () => {
      render(<CalendarSidebar {...defaultProps} />);

      fireEvent.click(screen.getByLabelText('Options for Work'));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Change Color' }));

      expect(
        screen.getByLabelText('Change calendar color form'),
      ).toBeInTheDocument();
    });
  });

  describe('Add Calendar form', () => {
    it('shows inline form when "Add Calendar" is clicked', () => {
      render(<CalendarSidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Add Calendar'));

      expect(screen.getByLabelText('Add calendar form')).toBeInTheDocument();
      expect(screen.getByLabelText('Calendar name')).toBeInTheDocument();
    });

    it('submits the form and calls createCalendar API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'cal-new',
          displayName: 'Fitness',
          color: '#22c55e',
        }),
      });

      render(<CalendarSidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Add Calendar'));

      const nameInput = screen.getByLabelText('Calendar name');
      fireEvent.change(nameInput, { target: { value: 'Fitness' } });

      // Select a color
      fireEvent.click(screen.getByLabelText('Color #22c55e'));

      await act(async () => {
        fireEvent.submit(screen.getByLabelText('Add calendar form'));
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/cal/calendars',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            displayName: 'Fitness',
            color: '#22c55e',
          }),
        }),
      );
    });

    it('hides the form when Cancel is clicked', () => {
      render(<CalendarSidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Add Calendar'));
      expect(screen.getByLabelText('Add calendar form')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));
      expect(
        screen.queryByLabelText('Add calendar form'),
      ).not.toBeInTheDocument();
    });
  });

  describe('default calendar delete protection', () => {
    it('shows error when trying to delete the default calendar', () => {
      render(<CalendarSidebar {...defaultProps} />);

      // Open context menu for the default calendar (Personal)
      fireEvent.click(screen.getByLabelText('Options for Personal'));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

      // Should show error, not confirmation dialog
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Cannot delete the default calendar',
      );
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('shows confirmation dialog for non-default calendar delete', () => {
      render(<CalendarSidebar {...defaultProps} />);

      fireEvent.click(screen.getByLabelText('Options for Work'));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to delete this calendar/),
      ).toBeInTheDocument();
    });

    it('calls deleteCalendar API when delete is confirmed', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(<CalendarSidebar {...defaultProps} />);

      fireEvent.click(screen.getByLabelText('Options for Work'));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

      await act(async () => {
        fireEvent.click(screen.getByText('Delete'));
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/cal/calendars/cal-owned-2',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('cancels delete when Cancel is clicked in confirmation', () => {
      render(<CalendarSidebar {...defaultProps} />);

      fireEvent.click(screen.getByLabelText('Options for Work'));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      fireEvent.click(screen.getAllByText('Cancel')[0]);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('renders Subscribe to Calendar button', () => {
      render(<CalendarSidebar {...defaultProps} />);
      expect(screen.getByText('Subscribe to Calendar')).toBeInTheDocument();
    });

    it('renders Browse Holiday Calendars button', () => {
      render(<CalendarSidebar {...defaultProps} />);
      expect(screen.getByText('Browse Holiday Calendars')).toBeInTheDocument();
    });

    it('shows subscribe form when Subscribe button is clicked', () => {
      render(<CalendarSidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Subscribe to Calendar'));
      expect(
        screen.getByLabelText('Subscribe to calendar form'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Calendar URL')).toBeInTheDocument();
    });

    it('calls onBrowseHolidays when Browse Holiday Calendars is clicked', () => {
      const onBrowseHolidays = jest.fn();
      render(
        <CalendarSidebar
          {...defaultProps}
          onBrowseHolidays={onBrowseHolidays}
        />,
      );

      fireEvent.click(screen.getByText('Browse Holiday Calendars'));
      expect(onBrowseHolidays).toHaveBeenCalledTimes(1);
    });
  });
});
