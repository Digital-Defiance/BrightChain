import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock(
  '@digitaldefiance/express-suite-react-components',
  () => require('./helpers/i18nMock').expressSuiteReactComponentsMock,
);

import type { HolidayCatalogProps } from '../components/HolidayCatalog';
import { HolidayCatalog } from '../components/HolidayCatalog';

// Mock global fetch
const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

const sampleEntries = [
  {
    id: 'us-holidays',
    displayName: 'US Holidays',
    description: 'Federal holidays in the United States',
    region: 'North America',
    category: 'Public Holidays',
    icsUrl: 'https://calendar.google.com/calendar/ical/en.usa/public/basic.ics',
  },
  {
    id: 'uk-holidays',
    displayName: 'UK Holidays',
    description: 'Bank holidays in the United Kingdom',
    region: 'Europe',
    category: 'Public Holidays',
    icsUrl: 'https://calendar.google.com/calendar/ical/en.uk/public/basic.ics',
  },
  {
    id: 'german-holidays',
    displayName: 'German Holidays',
    description: 'Public holidays in Germany',
    region: 'Europe',
    category: 'Public Holidays',
    icsUrl:
      'https://calendar.google.com/calendar/ical/de.german/public/basic.ics',
  },
  {
    id: 'jewish-holidays',
    displayName: 'Jewish Holidays',
    description: 'Major Jewish holidays',
    region: 'Religious',
    category: 'Religious Holidays',
    icsUrl:
      'https://calendar.google.com/calendar/ical/en.jewish/public/basic.ics',
  },
];

const defaultProps: HolidayCatalogProps = {
  isOpen: true,
  onClose: jest.fn(),
  subscribedCalendarUrls: new Set<string>(),
  apiBaseUrl: 'http://localhost:3000',
  authToken: 'test-token',
  onSubscribed: jest.fn(),
};

beforeEach(() => {
  mockFetch.mockReset();
  jest.clearAllMocks();
});

describe('HolidayCatalog', () => {
  describe('grouping by region', () => {
    it('renders entries grouped by region', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleEntries,
      });

      await act(async () => {
        render(<HolidayCatalog {...defaultProps} />);
      });

      // Should have region headings
      expect(screen.getByText('North America')).toBeInTheDocument();
      expect(screen.getByText('Europe')).toBeInTheDocument();
      expect(screen.getByText('Religious')).toBeInTheDocument();

      // Europe group should contain both UK and German holidays
      const europeList = screen.getByLabelText('Europe holidays');
      expect(europeList).toHaveTextContent('UK Holidays');
      expect(europeList).toHaveTextContent('German Holidays');
    });

    it('does not render when isOpen is false', () => {
      render(<HolidayCatalog {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('search filter', () => {
    it('narrows results when search query is entered', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleEntries,
      });

      await act(async () => {
        render(<HolidayCatalog {...defaultProps} />);
      });

      // All entries visible initially
      expect(screen.getByText('US Holidays')).toBeInTheDocument();
      expect(screen.getByText('UK Holidays')).toBeInTheDocument();

      // Type a search query
      fireEvent.change(screen.getByLabelText('Search holiday calendars'), {
        target: { value: 'jewish' },
      });

      // Only Jewish Holidays should remain
      expect(screen.getByText('Jewish Holidays')).toBeInTheDocument();
      expect(screen.queryByText('US Holidays')).not.toBeInTheDocument();
      expect(screen.queryByText('UK Holidays')).not.toBeInTheDocument();
    });

    it('filters case-insensitively by region', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleEntries,
      });

      await act(async () => {
        render(<HolidayCatalog {...defaultProps} />);
      });

      fireEvent.change(screen.getByLabelText('Search holiday calendars'), {
        target: { value: 'europe' },
      });

      expect(screen.getByText('UK Holidays')).toBeInTheDocument();
      expect(screen.getByText('German Holidays')).toBeInTheDocument();
      expect(screen.queryByText('US Holidays')).not.toBeInTheDocument();
    });
  });

  describe('Add button', () => {
    it('calls subscribe when "Add" button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleEntries,
      });

      await act(async () => {
        render(<HolidayCatalog {...defaultProps} />);
      });

      // Mock the subscribe call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-cal', displayName: 'US Holidays' }),
      });

      await act(async () => {
        fireEvent.click(screen.getByLabelText('Add Event US Holidays'));
      });

      // Verify subscribe was called with the correct URL
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/cal/calendars/subscribe-to-feed',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            url: 'https://calendar.google.com/calendar/ical/en.usa/public/basic.ics',
            displayName: 'US Holidays',
            refreshInterval: 60,
          }),
        }),
      );
    });
  });

  describe('Subscribed badge', () => {
    it('shows "Subscribed" badge for already-subscribed entries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleEntries,
      });

      const subscribedUrls = new Set([
        'https://calendar.google.com/calendar/ical/en.usa/public/basic.ics',
      ]);

      await act(async () => {
        render(
          <HolidayCatalog
            {...defaultProps}
            subscribedCalendarUrls={subscribedUrls}
          />,
        );
      });

      // US Holidays should show "Subscribed" badge, not "Add" button
      expect(screen.getByText('Subscribed')).toBeInTheDocument();
      expect(
        screen.queryByLabelText('Add Event US Holidays'),
      ).not.toBeInTheDocument();

      // Other entries should still have "Add" buttons
      expect(
        screen.getByLabelText('Add Event UK Holidays'),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('Add Event German Holidays'),
      ).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('displays error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await act(async () => {
        render(<HolidayCatalog {...defaultProps} />);
      });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
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
        render(<HolidayCatalog {...defaultProps} onClose={onClose} />);
      });

      fireEvent.click(screen.getByLabelText('Close holiday catalog'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', async () => {
      const onClose = jest.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await act(async () => {
        render(<HolidayCatalog {...defaultProps} onClose={onClose} />);
      });

      fireEvent.click(screen.getByRole('presentation'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
