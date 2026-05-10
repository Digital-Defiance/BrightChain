import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock(
  '@digitaldefiance/express-suite-react-components',
  () => require('./helpers/i18nMock').expressSuiteReactComponentsMock,
);

import type {
  ICalendarCollectionDTO,
  ICalendarEventDTO,
} from '@brightchain/brightcal-lib';
import {
  EventTransparency,
  EventVisibility,
  ParticipationStatus,
} from '@brightchain/brightcal-lib';
import {
  AgendaView,
  CalendarWidget,
  DayView,
  EventDetailPopover,
  EventEditor,
  FreeBusyGrid,
  MiniCalendar,
  MonthView,
  ResponsiveCalendarLayout,
  WeekView,
} from '../components';
import type { FreeBusyAttendee } from '../components/FreeBusyGrid';

// --- Test fixtures ---

const mockCalendar: ICalendarCollectionDTO = {
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

const mockEvent: ICalendarEventDTO = {
  id: 'evt-1',
  calendarId: 'cal-1',
  uid: '550e8400-e29b-41d4-a716-446655440000',
  sequence: 0,
  summary: 'Team Standup',
  description: 'Daily standup meeting',
  location: 'Room 101',
  dtstart: '2024-06-15T09:00:00Z',
  dtend: '2024-06-15T09:30:00Z',
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
      partstat: ParticipationStatus.Accepted,
      role: 'REQ-PARTICIPANT',
      rsvp: true,
    },
  ],
  reminders: [],
  dateModified: '2024-06-15T00:00:00Z',
  dateCreated: '2024-06-01T00:00:00Z',
} as any;

// --- CalendarWidget tests ---

describe('CalendarWidget', () => {
  it('renders without crashing', () => {
    render(<CalendarWidget calendars={[mockCalendar]} events={[mockEvent]} />);
    expect(screen.getByRole('application')).toBeInTheDocument();
  });

  it('renders view mode buttons', () => {
    render(<CalendarWidget calendars={[]} events={[]} />);
    expect(screen.getByText('Month')).toBeInTheDocument();
    expect(screen.getByText('Week')).toBeInTheDocument();
    expect(screen.getByText('Day')).toBeInTheDocument();
    expect(screen.getByText('Agenda')).toBeInTheDocument();
  });

  it('switches view mode on button click', () => {
    const onViewChange = jest.fn();
    render(
      <CalendarWidget calendars={[]} events={[]} onViewChange={onViewChange} />,
    );
    fireEvent.click(screen.getByText('Week'));
    expect(onViewChange).toHaveBeenCalledWith('week');
  });

  it('marks the active view button with aria-pressed', () => {
    render(<CalendarWidget calendars={[]} events={[]} initialView="week" />);
    expect(screen.getByText('Week')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Month')).toHaveAttribute('aria-pressed', 'false');
  });

  // --- View rendering tests (Requirements 6.1–6.5) ---

  it('renders MonthView when view mode is month', () => {
    render(
      <CalendarWidget
        calendars={[mockCalendar]}
        events={[mockEvent]}
        initialView="month"
        initialDate={new Date(2024, 5, 15)}
      />,
    );
    // MonthView renders a grid with weekday headers
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('renders WeekView when view mode is week', () => {
    render(
      <CalendarWidget
        calendars={[mockCalendar]}
        events={[]}
        initialView="week"
        initialDate={new Date(2024, 5, 15)}
      />,
    );
    // WeekView renders time labels
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('renders DayView when view mode is day', () => {
    render(
      <CalendarWidget
        calendars={[mockCalendar]}
        events={[]}
        initialView="day"
        initialDate={new Date(2024, 5, 15)}
      />,
    );
    // DayView renders a heading with the full date
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('renders AgendaView when view mode is agenda', () => {
    render(
      <CalendarWidget
        calendars={[mockCalendar]}
        events={[]}
        initialView="agenda"
      />,
    );
    // AgendaView shows empty state when no events
    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
  });

  it('switches from month to week view and renders WeekView', () => {
    render(
      <CalendarWidget
        calendars={[mockCalendar]}
        events={[]}
        initialView="month"
        initialDate={new Date(2024, 5, 15)}
      />,
    );
    // Initially in month view — weekday headers visible
    expect(screen.getByText('Sun')).toBeInTheDocument();

    // Switch to week view
    fireEvent.click(screen.getByText('Week'));

    // WeekView time labels should now be visible
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('preserves current date when switching view modes', () => {
    const specificDate = new Date(2024, 5, 15);
    const onDateChange = jest.fn();
    render(
      <CalendarWidget
        calendars={[mockCalendar]}
        events={[]}
        initialView="month"
        initialDate={specificDate}
        onDateChange={onDateChange}
      />,
    );

    // Switch to day view — DayView should show the same date
    fireEvent.click(screen.getByText('Day'));
    // DayView renders a heading with the date; June 15, 2024 should appear
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('15');
    expect(heading.textContent).toContain('2024');

    // onDateChange should NOT have been called (date didn't change)
    expect(onDateChange).not.toHaveBeenCalled();
  });

  it('renders loading state', () => {
    render(<CalendarWidget calendars={[]} events={[]} loading={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    const onRetry = jest.fn();
    render(
      <CalendarWidget
        calendars={[]}
        events={[]}
        error="Network error"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
  });
});

// --- MonthView tests ---

describe('MonthView', () => {
  it('renders without crashing', () => {
    render(
      <MonthView
        date={new Date(2024, 5, 15)}
        events={[]}
        calendars={[mockCalendar]}
      />,
    );
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('renders weekday headers', () => {
    render(
      <MonthView date={new Date(2024, 5, 15)} events={[]} calendars={[]} />,
    );
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('calls onDayClick when a day is clicked', () => {
    const onDayClick = jest.fn();
    render(
      <MonthView
        date={new Date(2024, 5, 15)}
        events={[]}
        calendars={[]}
        onDayClick={onDayClick}
      />,
    );
    fireEvent.click(screen.getByText('15'));
    expect(onDayClick).toHaveBeenCalled();
  });
});

// --- WeekView tests ---

describe('WeekView', () => {
  it('renders without crashing', () => {
    render(
      <WeekView
        date={new Date(2024, 5, 15)}
        events={[]}
        calendars={[mockCalendar]}
      />,
    );
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('renders time labels', () => {
    render(
      <WeekView date={new Date(2024, 5, 15)} events={[]} calendars={[]} />,
    );
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });
});

// --- DayView tests ---

describe('DayView', () => {
  it('renders without crashing', () => {
    render(
      <DayView
        date={new Date(2024, 5, 15)}
        events={[]}
        calendars={[mockCalendar]}
      />,
    );
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('calls onTimeSlotClick when a slot is clicked', () => {
    const onTimeSlotClick = jest.fn();
    render(
      <DayView
        date={new Date(2024, 5, 15)}
        events={[]}
        calendars={[]}
        onTimeSlotClick={onTimeSlotClick}
      />,
    );
    // Click the first time slot (00:00)
    const slots = screen.getAllByRole('gridcell');
    fireEvent.click(slots[0]);
    expect(onTimeSlotClick).toHaveBeenCalled();
  });
});

// --- AgendaView tests ---

describe('AgendaView', () => {
  it('renders empty state when no events', () => {
    render(<AgendaView events={[]} calendars={[mockCalendar]} />);
    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
  });

  it('renders events in chronological order', () => {
    render(<AgendaView events={[mockEvent]} calendars={[mockCalendar]} />);
    expect(screen.getByText('Team Standup')).toBeInTheDocument();
  });

  it('calls onEventClick when an event is clicked', () => {
    const onEventClick = jest.fn();
    render(
      <AgendaView
        events={[mockEvent]}
        calendars={[mockCalendar]}
        onEventClick={onEventClick}
      />,
    );
    fireEvent.click(screen.getByText('Team Standup'));
    expect(onEventClick).toHaveBeenCalledWith(mockEvent);
  });
});

// --- MiniCalendar tests ---

describe('MiniCalendar', () => {
  it('renders without crashing', () => {
    render(
      <MiniCalendar
        selectedDate={new Date(2024, 5, 15)}
        onDateSelect={jest.fn()}
      />,
    );
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('navigates to previous month', () => {
    render(
      <MiniCalendar
        selectedDate={new Date(2024, 5, 15)}
        onDateSelect={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Previous month'));
    // Should now show May 2024
    expect(screen.getByText(/May/)).toBeInTheDocument();
  });

  it('navigates to next month', () => {
    render(
      <MiniCalendar
        selectedDate={new Date(2024, 5, 15)}
        onDateSelect={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Next month'));
    expect(screen.getByText(/July/)).toBeInTheDocument();
  });

  it('calls onDateSelect when a day is clicked', () => {
    const onDateSelect = jest.fn();
    render(
      <MiniCalendar
        selectedDate={new Date(2024, 5, 15)}
        onDateSelect={onDateSelect}
      />,
    );
    // Click day 20
    const day20Buttons = screen.getAllByText('20');
    fireEvent.click(day20Buttons[0]);
    expect(onDateSelect).toHaveBeenCalled();
  });
});

// --- EventDetailPopover tests ---

describe('EventDetailPopover', () => {
  it('renders event details', () => {
    render(<EventDetailPopover event={mockEvent} onClose={jest.fn()} />);
    expect(screen.getByText('Team Standup')).toBeInTheDocument();
    expect(screen.getByText('Room 101')).toBeInTheDocument();
    expect(screen.getByText('Daily standup meeting')).toBeInTheDocument();
  });

  it('renders attendees', () => {
    render(<EventDetailPopover event={mockEvent} onClose={jest.fn()} />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<EventDetailPopover event={mockEvent} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders RSVP buttons when onRsvp is provided', () => {
    const onRsvp = jest.fn();
    render(
      <EventDetailPopover
        event={mockEvent}
        onClose={jest.fn()}
        onRsvp={onRsvp}
      />,
    );
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Tentative')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Accept'));
    expect(onRsvp).toHaveBeenCalledWith(
      mockEvent,
      ParticipationStatus.Accepted,
    );
  });
});

// --- EventEditor tests ---

describe('EventEditor', () => {
  it('renders create form when no event provided', () => {
    render(
      <EventEditor
        calendars={[mockCalendar]}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Create event')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders edit form when event is provided', () => {
    render(
      <EventEditor
        event={mockEvent}
        calendars={[mockCalendar]}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Edit event')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = jest.fn();
    render(
      <EventEditor
        calendars={[mockCalendar]}
        onSave={jest.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onSave with form data on submit', () => {
    const onSave = jest.fn();
    render(
      <EventEditor
        calendars={[mockCalendar]}
        onSave={onSave}
        onCancel={jest.fn()}
      />,
    );
    // Fill in required title
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'New Event' },
    });
    fireEvent.change(screen.getByLabelText('Start'), {
      target: { value: '2024-06-15T10:00' },
    });
    fireEvent.submit(screen.getByLabelText('Create event'));
    expect(onSave).toHaveBeenCalled();
    expect(onSave.mock.calls[0][0].summary).toBe('New Event');
  });
});

// --- FreeBusyGrid tests ---

describe('FreeBusyGrid', () => {
  const attendees: FreeBusyAttendee[] = [
    { id: 'user-1', displayName: 'Alice', email: 'alice@example.com' },
    { id: 'user-2', displayName: 'Bob', email: 'bob@example.com' },
  ];

  it('renders without crashing', () => {
    render(
      <FreeBusyGrid
        attendees={attendees}
        freeBusyData={new Map()}
        rangeStart={new Date('2024-06-15T08:00:00Z')}
        rangeEnd={new Date('2024-06-15T12:00:00Z')}
      />,
    );
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('renders attendee names', () => {
    render(
      <FreeBusyGrid
        attendees={attendees}
        freeBusyData={new Map()}
        rangeStart={new Date('2024-06-15T08:00:00Z')}
        rangeEnd={new Date('2024-06-15T12:00:00Z')}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});

// --- ResponsiveCalendarLayout tests ---

describe('ResponsiveCalendarLayout', () => {
  it('renders children', () => {
    render(
      <ResponsiveCalendarLayout>
        <div>Calendar Content</div>
      </ResponsiveCalendarLayout>,
    );
    expect(screen.getByText('Calendar Content')).toBeInTheDocument();
  });

  it('renders sidebar on desktop', () => {
    // Default window width is 1024 in jsdom
    render(
      <ResponsiveCalendarLayout sidebar={<div>Sidebar</div>}>
        <div>Content</div>
      </ResponsiveCalendarLayout>,
    );
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
  });
});
