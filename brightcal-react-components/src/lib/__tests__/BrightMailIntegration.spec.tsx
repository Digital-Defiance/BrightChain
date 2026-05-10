import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock(
  '@digitaldefiance/express-suite-react-components',
  () => require('./helpers/i18nMock').expressSuiteReactComponentsMock,
);

import type { ICalendarEventDTO } from '@brightchain/brightcal-lib';
import {
  EventTransparency,
  EventVisibility,
  ParticipationStatus,
} from '@brightchain/brightcal-lib';
import {
  CalendarSidebar,
  ComposeEventAction,
  InlineEventCard,
} from '../components';
import type { ComposeRecipient } from '../components/ComposeEventAction';

// --- Test fixtures ---

const mockEvent: ICalendarEventDTO = {
  id: 'evt-1',
  calendarId: 'cal-1',
  uid: '550e8400-e29b-41d4-a716-446655440000',
  sequence: 0,
  summary: 'Project Kickoff',
  description: 'Kickoff meeting for Q3 project',
  location: 'Conference Room A',
  dtstart: '2024-06-15T14:00:00Z',
  dtend: '2024-06-15T15:00:00Z',
  dtstartTzid: 'America/New_York',
  allDay: false,
  visibility: EventVisibility.Public,
  transparency: EventTransparency.Opaque,
  status: 'CONFIRMED',
  organizerId: 'user-1',
  attendees: [
    {
      email: 'alice@example.com',
      displayName: 'Alice',
      partstat: ParticipationStatus.NeedsAction,
      role: 'REQ-PARTICIPANT' as const,
      rsvp: true,
    },
    {
      email: 'bob@example.com',
      displayName: 'Bob',
      partstat: ParticipationStatus.Accepted,
      role: 'OPT-PARTICIPANT' as const,
      rsvp: true,
    },
  ],
  reminders: [],
  dateModified: '2024-06-15T00:00:00Z',
  dateCreated: '2024-06-01T00:00:00Z',
} as any;

const mockUpdatedEvent: ICalendarEventDTO = {
  ...mockEvent,
  sequence: 2,
} as any;

// --- InlineEventCard tests ---

describe('InlineEventCard', () => {
  it('renders event summary', () => {
    render(<InlineEventCard event={mockEvent} />);
    expect(screen.getByText('Project Kickoff')).toBeInTheDocument();
  });

  it('renders event location', () => {
    render(<InlineEventCard event={mockEvent} />);
    expect(screen.getByText('Conference Room A')).toBeInTheDocument();
  });

  it('renders event description', () => {
    render(<InlineEventCard event={mockEvent} />);
    expect(
      screen.getByText('Kickoff meeting for Q3 project'),
    ).toBeInTheDocument();
  });

  it('renders attendee names', () => {
    render(<InlineEventCard event={mockEvent} />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  it('renders RSVP buttons when callbacks provided', () => {
    render(
      <InlineEventCard
        event={mockEvent}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onTentative={jest.fn()}
      />,
    );
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Tentative')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });

  it('does not render RSVP buttons when no callbacks', () => {
    render(<InlineEventCard event={mockEvent} />);
    expect(screen.queryByText('Accept')).not.toBeInTheDocument();
  });

  it('calls onAccept when Accept is clicked', () => {
    const onAccept = jest.fn();
    render(<InlineEventCard event={mockEvent} onAccept={onAccept} />);
    fireEvent.click(screen.getByText('Accept'));
    expect(onAccept).toHaveBeenCalledWith(mockEvent);
  });

  it('calls onDecline when Decline is clicked', () => {
    const onDecline = jest.fn();
    render(<InlineEventCard event={mockEvent} onDecline={onDecline} />);
    fireEvent.click(screen.getByText('Decline'));
    expect(onDecline).toHaveBeenCalledWith(mockEvent);
  });

  it('calls onTentative when Tentative is clicked', () => {
    const onTentative = jest.fn();
    render(<InlineEventCard event={mockEvent} onTentative={onTentative} />);
    fireEvent.click(screen.getByText('Tentative'));
    expect(onTentative).toHaveBeenCalledWith(mockEvent);
  });

  it('shows update badge when isUpdate is true', () => {
    render(<InlineEventCard event={mockUpdatedEvent} isUpdate={true} />);
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('does not show update badge for new events', () => {
    render(<InlineEventCard event={mockEvent} isUpdate={false} />);
    expect(screen.queryByText('Updated')).not.toBeInTheDocument();
  });

  it('has proper aria-label', () => {
    render(<InlineEventCard event={mockEvent} />);
    expect(
      screen.getByRole('article', { name: /Project Kickoff/ }),
    ).toBeInTheDocument();
  });
});

// --- CalendarSidebar tests (updated for multi-calendar rewrite) ---

// Mock global fetch for CalendarSidebar hooks
const mockFetchIntegration = jest.fn();
(globalThis as any).fetch = mockFetchIntegration;

const mockCalendar: import('@brightchain/brightcal-lib').ICalendarCollectionDTO =
  {
    id: 'cal-1',
    ownerId: 'user-1',
    displayName: 'Personal',
    color: '#3b82f6',
    description: 'My personal calendar',
    isDefault: true,
    isSubscription: false,
    defaultPermission: 'viewer' as any,
    dateCreated: '2024-01-01T00:00:00Z',
  } as any;

const mockSharedCalendar: import('@brightchain/brightcal-lib').ICalendarCollectionDTO =
  {
    id: 'cal-2',
    ownerId: 'user-2',
    displayName: 'Team Calendar',
    color: '#22c55e',
    description: 'Shared team calendar',
    isDefault: false,
    isSubscription: false,
    defaultPermission: 'viewer' as any,
    dateCreated: '2024-01-01T00:00:00Z',
  } as any;

describe('CalendarSidebar', () => {
  const defaultProps = {
    calendars: [mockCalendar, mockSharedCalendar],
    visibilitySet: new Set(['cal-1', 'cal-2']),
    onVisibilityChange: jest.fn(),
    apiBaseUrl: 'http://localhost:3000',
    authToken: 'test-token',
    onCalendarsChanged: jest.fn(),
    userId: 'user-1',
    selectedDate: new Date(2024, 5, 15),
    onDateSelect: jest.fn(),
  };

  beforeEach(() => {
    mockFetchIntegration.mockReset();
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CalendarSidebar {...defaultProps} />);
    expect(
      screen.getByRole('complementary', { name: /calendar sidebar/i }),
    ).toBeInTheDocument();
  });

  it('renders calendar display names', () => {
    render(<CalendarSidebar {...defaultProps} />);
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Team Calendar')).toBeInTheDocument();
  });

  it('renders My Calendars section for owned calendars', () => {
    render(<CalendarSidebar {...defaultProps} />);
    expect(screen.getByText('My Calendars')).toBeInTheDocument();
  });

  it('renders Other Calendars section for shared calendars', () => {
    render(<CalendarSidebar {...defaultProps} />);
    expect(screen.getByText('Other Calendars')).toBeInTheDocument();
  });

  it('calls onVisibilityChange when a calendar toggle is clicked', () => {
    const onVisibilityChange = jest.fn();
    render(
      <CalendarSidebar
        {...defaultProps}
        onVisibilityChange={onVisibilityChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('Toggle Personal'));
    expect(onVisibilityChange).toHaveBeenCalled();
  });

  it('renders Add Calendar button', () => {
    render(<CalendarSidebar {...defaultProps} />);
    expect(screen.getByText('Add Calendar')).toBeInTheDocument();
  });

  it('renders Subscribe to Calendar button', () => {
    render(<CalendarSidebar {...defaultProps} />);
    expect(screen.getByText('Subscribe to Calendar')).toBeInTheDocument();
  });
});

// --- ComposeEventAction tests ---

describe('ComposeEventAction', () => {
  const mockRecipients: ComposeRecipient[] = [
    { email: 'alice@example.com', displayName: 'Alice' },
    { email: 'bob@example.com', displayName: 'Bob' },
  ];

  it('renders the Add Event button', () => {
    render(
      <ComposeEventAction
        recipients={mockRecipients}
        onCreateEvent={jest.fn()}
      />,
    );
    expect(screen.getByText('Add Event')).toBeInTheDocument();
  });

  it('calls onCreateEvent with recipients when clicked', () => {
    const onCreateEvent = jest.fn();
    render(
      <ComposeEventAction
        recipients={mockRecipients}
        onCreateEvent={onCreateEvent}
      />,
    );
    fireEvent.click(screen.getByText('Add Event'));
    expect(onCreateEvent).toHaveBeenCalledWith(mockRecipients);
  });

  it('has proper aria-label', () => {
    render(
      <ComposeEventAction
        recipients={mockRecipients}
        onCreateEvent={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Add calendar event')).toBeInTheDocument();
  });

  it('works with empty recipients', () => {
    const onCreateEvent = jest.fn();
    render(
      <ComposeEventAction recipients={[]} onCreateEvent={onCreateEvent} />,
    );
    fireEvent.click(screen.getByText('Add Event'));
    expect(onCreateEvent).toHaveBeenCalledWith([]);
  });
});
