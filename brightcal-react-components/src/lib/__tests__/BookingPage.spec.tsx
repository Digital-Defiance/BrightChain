import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock(
  '@digitaldefiance/express-suite-react-components',
  () => require('./helpers/i18nMock').expressSuiteReactComponentsMock,
);

import type {
  IAppointmentTypeDTO,
  IBookingPageDTO,
  IBookingQuestion,
} from '@brightchain/brightcal-lib';
import type { BookingSlot } from '../components';
import { BookingForm, BookingPageView } from '../components';

// --- Test fixtures ---

const mockAppointmentType: IAppointmentTypeDTO = {
  name: '30-Minute Meeting',
  durationMinutes: 30,
  bufferMinutes: 10,
  availableWindows: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
  questions: [],
};

const mockBookingPage: IBookingPageDTO = {
  id: 'bp-1',
  ownerId: 'user-1',
  slug: 'john-doe',
  title: 'Book a Meeting with John',
  description: 'Pick a time that works for you.',
  appointmentTypes: [mockAppointmentType],
  minNoticeMinutes: 240,
  maxAdvanceDays: 30,
  active: true,
  dateCreated: '2024-01-01T00:00:00Z',
} as any;

const mockSlots: BookingSlot[] = [
  { start: '2024-06-15T09:00:00Z', end: '2024-06-15T09:30:00Z' },
  { start: '2024-06-15T10:00:00Z', end: '2024-06-15T10:30:00Z' },
  { start: '2024-06-15T14:00:00Z', end: '2024-06-15T14:30:00Z' },
];

const mockQuestions: IBookingQuestion[] = [
  { label: 'Company', type: 'text', required: true },
  { label: 'Notes', type: 'textarea', required: false },
];

// --- BookingPageView tests ---

describe('BookingPageView', () => {
  const defaultProps = {
    bookingPage: mockBookingPage,
    selectedDate: new Date(2024, 5, 15),
    appointmentType: mockAppointmentType,
    slots: mockSlots,
    onSlotSelect: jest.fn(),
    onDateChange: jest.fn(),
  };

  it('renders without crashing', () => {
    render(<BookingPageView {...defaultProps} />);
    expect(
      screen.getByRole('region', { name: /booking page/i }),
    ).toBeInTheDocument();
  });

  it('displays booking page title and description', () => {
    render(<BookingPageView {...defaultProps} />);
    expect(screen.getByText('Book a Meeting with John')).toBeInTheDocument();
    expect(
      screen.getByText('Pick a time that works for you.'),
    ).toBeInTheDocument();
  });

  it('displays appointment type info', () => {
    render(<BookingPageView {...defaultProps} />);
    expect(screen.getByText(/30-Minute Meeting/)).toBeInTheDocument();
    expect(screen.getByText(/30 min/)).toBeInTheDocument();
  });

  it('renders available time slots', () => {
    render(<BookingPageView {...defaultProps} />);
    const slotButtons = screen.getAllByRole('listitem');
    expect(slotButtons).toHaveLength(3);
  });

  it('calls onSlotSelect when a slot is clicked', () => {
    const onSlotSelect = jest.fn();
    render(<BookingPageView {...defaultProps} onSlotSelect={onSlotSelect} />);
    const slotButtons = screen.getAllByRole('listitem');
    fireEvent.click(slotButtons[0]);
    expect(onSlotSelect).toHaveBeenCalledWith(mockSlots[0]);
  });

  it('shows empty state when no slots available', () => {
    render(<BookingPageView {...defaultProps} slots={[]} />);
    expect(screen.getByText(/no available slots/i)).toBeInTheDocument();
  });

  it('navigates to next day', () => {
    const onDateChange = jest.fn();
    render(<BookingPageView {...defaultProps} onDateChange={onDateChange} />);
    fireEvent.click(screen.getByLabelText('Next day'));
    expect(onDateChange).toHaveBeenCalled();
    const newDate: Date = onDateChange.mock.calls[0][0];
    expect(newDate.getDate()).toBe(16);
  });

  it('navigates to previous day', () => {
    const onDateChange = jest.fn();
    render(<BookingPageView {...defaultProps} onDateChange={onDateChange} />);
    fireEvent.click(screen.getByLabelText('Previous day'));
    expect(onDateChange).toHaveBeenCalled();
    const newDate: Date = onDateChange.mock.calls[0][0];
    expect(newDate.getDate()).toBe(14);
  });
});

// --- BookingForm tests ---

describe('BookingForm', () => {
  const defaultProps = {
    appointmentType: mockAppointmentType,
    selectedSlot: mockSlots[0],
    questions: [] as IBookingQuestion[],
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  };

  it('renders without crashing', () => {
    render(<BookingForm {...defaultProps} />);
    expect(screen.getByLabelText('Booking form')).toBeInTheDocument();
  });

  it('renders name and email fields', () => {
    render(<BookingForm {...defaultProps} />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders custom questions', () => {
    render(<BookingForm {...defaultProps} questions={mockQuestions} />);
    expect(screen.getByLabelText('Company')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
  });

  it('renders textarea for textarea-type questions', () => {
    render(<BookingForm {...defaultProps} questions={mockQuestions} />);
    const notesField = screen.getByLabelText('Notes');
    expect(notesField.tagName).toBe('TEXTAREA');
  });

  it('calls onSubmit with form data', () => {
    const onSubmit = jest.fn();
    render(<BookingForm {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.submit(screen.getByLabelText('Booking form'));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane@example.com',
      answers: {},
    });
  });

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = jest.fn();
    render(<BookingForm {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('displays appointment type and slot summary', () => {
    render(<BookingForm {...defaultProps} />);
    expect(screen.getByText(/30-Minute Meeting/)).toBeInTheDocument();
    expect(screen.getByText(/30 min/)).toBeInTheDocument();
  });
});
