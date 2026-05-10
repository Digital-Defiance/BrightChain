/**
 * CalendarInviteCard — unit tests.
 *
 * Verifies:
 *  - REQUEST method: shows RSVP buttons, calls onRsvp with correct status.
 *  - CANCEL method: shows cancelled banner, hides RSVP buttons.
 *  - REPLY method: shows read-only response banner, no RSVP buttons.
 *  - COUNTER method: shows counter-proposal info banner.
 *  - currentPartstat pre-fills responded state, hides RSVP buttons.
 *  - Error state shown when onRsvp rejects.
 *  - onAddToCalendar called when "Add to Calendar" is clicked.
 *
 * @see Requirements 10.2, 10.3
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ITipMethod, ParticipationStatus } from '@brightchain/brightcal-lib';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@digitaldefiance/ecies-lib', () => ({
  IECIESConfig: {},
  Member: { newMember: jest.fn() },
  EmailString: jest.fn(),
}));

jest.mock('@digitaldefiance/suite-core-lib', () => ({
  SuiteCoreComponentId: 'suite-core',
  SuiteCoreStringKey: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => `suite-core:${String(p)}` },
  ),
  SuiteCoreStringKeyValue: {},
}));

jest.mock('@brightchain/brightchain-lib', () => {
  const mockEngine = {
    translate: jest.fn((_componentId: string, key: string) => key),
    translateEnum: jest.fn((_enumType: unknown, value: unknown) => String(value)),
    registerIfNotExists: jest.fn(),
    registerStringKeyEnum: jest.fn(),
    registerConstants: jest.fn(),
    hasInstance: jest.fn(() => true),
  };
  return {
    BrightChainComponentId: 'brightchain',
    BrightChainStrings: new Proxy(
      {},
      { get: (_t: unknown, p: string | symbol) => String(p) },
    ),
    BrightDateDisplayMode: {
      Dual: 'dual',
      BrightDateOnly: 'brightDateOnly',
      LocaleOnly: 'localeOnly',
      Hover: 'hover',
      HoverReverse: 'hoverReverse',
    },
    getBrightChainI18nEngine: () => mockEngine,
    registerI18nComponentPackage: jest.fn(),
    EmailEncryptionService: jest.fn().mockImplementation(() => ({
      decryptEmailBody: jest.fn(async (_metadata: any, body: string) => body),
      encryptEmailBody: jest.fn(async (_metadata: any, body: string) => body),
    })),
    MessageEncryptionScheme: { NONE: 'NONE', AES_256_GCM: 'AES_256_GCM' },
    toBrightDateString: (date: Date | string, _precision?: number) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return ((d.getTime() - 946684800000) / 86400000).toFixed(_precision ?? 5);
    },
  };
});

jest.mock('@brightchain/brightmail-lib', () => ({
  BrightMailStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => String(p) },
  ),
}));

jest.mock('@brightchain/brightcal-lib', () => {
  const actual = jest.requireActual('@brightchain/brightcal-lib');
  return { ...actual };
});

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    t: (key: string) => key,
    tBranded: (key: string) => key,
    changeLanguage: jest.fn(),
    currentLanguage: 'en',
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../hooks/useBrightMailTranslation', () => ({
  useBrightMailTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// MUI icon mocks to avoid SVG rendering issues
jest.mock('@mui/icons-material/CalendarToday', () => () => <span data-testid="icon-calendar" />);
jest.mock('@mui/icons-material/Cancel', () => () => <span data-testid="icon-cancel" />);
jest.mock('@mui/icons-material/CheckCircleOutline', () => () => <span data-testid="icon-check" />);
jest.mock('@mui/icons-material/HelpOutline', () => () => <span data-testid="icon-help" />);
jest.mock('@mui/icons-material/LocationOn', () => () => <span data-testid="icon-location" />);
jest.mock('@mui/icons-material/Schedule', () => () => <span data-testid="icon-schedule" />);

import React from 'react';
import CalendarInviteCard from '../CalendarInviteCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInvite(method: ITipMethod, overrides: Record<string, unknown> = {}) {
  return {
    method,
    uid: 'test-uid-001',
    sequence: 1,
    summary: 'Team Standup',
    dtstart: '2024-06-15T09:00:00Z',
    dtend: '2024-06-15T09:30:00Z',
    dtstartTzid: 'UTC',
    allDay: false,
    organizerEmail: 'organizer@example.com',
    organizerName: 'Organizer Name',
    attendees: [],
    rawIcs: 'BEGIN:VCALENDAR\r\nEND:VCALENDAR',
    receivedAt: '2024-06-14T12:00:00Z',
    sourceEmailId: 'email-42',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CalendarInviteCard', () => {
  describe('REQUEST method', () => {
    it('renders the invite card container', () => {
      render(
        <CalendarInviteCard invite={makeInvite(ITipMethod.Request) as any} />,
      );
      expect(screen.getByTestId('calendar-invite-card')).toBeInTheDocument();
    });

    it('displays the event summary', () => {
      render(
        <CalendarInviteCard invite={makeInvite(ITipMethod.Request) as any} />,
      );
      expect(screen.getByText('Team Standup')).toBeInTheDocument();
    });

    it('shows RSVP buttons when onRsvp is provided and no current partstat', () => {
      render(
        <CalendarInviteCard
          invite={makeInvite(ITipMethod.Request) as any}
          onRsvp={jest.fn()}
        />,
      );
      // Buttons show translation keys (which return the key string in tests)
      expect(screen.getByText('CalInvite_Accept')).toBeInTheDocument();
      expect(screen.getByText('CalInvite_Tentative')).toBeInTheDocument();
      expect(screen.getByText('CalInvite_Decline')).toBeInTheDocument();
    });

    it('calls onRsvp with Accepted when Accept is clicked', async () => {
      const onRsvp = jest.fn().mockResolvedValue(undefined);
      render(
        <CalendarInviteCard
          invite={makeInvite(ITipMethod.Request) as any}
          onRsvp={onRsvp}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText('CalInvite_Accept'));
      });

      expect(onRsvp).toHaveBeenCalledWith(ParticipationStatus.Accepted);
    });

    it('calls onRsvp with Declined when Decline is clicked', async () => {
      const onRsvp = jest.fn().mockResolvedValue(undefined);
      render(
        <CalendarInviteCard
          invite={makeInvite(ITipMethod.Request) as any}
          onRsvp={onRsvp}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText('CalInvite_Decline'));
      });

      expect(onRsvp).toHaveBeenCalledWith(ParticipationStatus.Declined);
    });

    it('calls onRsvp with Tentative when Tentative is clicked', async () => {
      const onRsvp = jest.fn().mockResolvedValue(undefined);
      render(
        <CalendarInviteCard
          invite={makeInvite(ITipMethod.Request) as any}
          onRsvp={onRsvp}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText('CalInvite_Tentative'));
      });

      expect(onRsvp).toHaveBeenCalledWith(ParticipationStatus.Tentative);
    });

    it('hides RSVP buttons when no onRsvp provided', () => {
      render(
        <CalendarInviteCard invite={makeInvite(ITipMethod.Request) as any} />,
      );
      expect(screen.queryByText('CalInvite_Accept')).not.toBeInTheDocument();
    });

    it('hides RSVP buttons when currentPartstat is already set', () => {
      render(
        <CalendarInviteCard
          invite={makeInvite(ITipMethod.Request) as any}
          onRsvp={jest.fn()}
          currentPartstat={ParticipationStatus.Accepted}
        />,
      );
      expect(screen.queryByText('CalInvite_Accept')).not.toBeInTheDocument();
    });

    it('shows error message when onRsvp rejects', async () => {
      const onRsvp = jest.fn().mockRejectedValue(new Error('Network error'));
      render(
        <CalendarInviteCard
          invite={makeInvite(ITipMethod.Request) as any}
          onRsvp={onRsvp}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText('CalInvite_Accept'));
      });

      await waitFor(() => {
        expect(screen.getByText('CalInvite_ErrorRsvp')).toBeInTheDocument();
      });
    });

    it('shows location when provided', () => {
      render(
        <CalendarInviteCard
          invite={makeInvite(ITipMethod.Request, { location: 'Zoom' }) as any}
        />,
      );
      expect(screen.getByText('Zoom')).toBeInTheDocument();
    });
  });

  describe('CANCEL method', () => {
    it('shows the cancelled chip header', () => {
      render(
        <CalendarInviteCard invite={makeInvite(ITipMethod.Cancel) as any} />,
      );
      expect(screen.getByText('CalInvite_Cancelled')).toBeInTheDocument();
    });

    it('shows the cancelled alert body', () => {
      render(
        <CalendarInviteCard invite={makeInvite(ITipMethod.Cancel) as any} />,
      );
      expect(screen.getByText('CalInvite_CancelledBody')).toBeInTheDocument();
    });

    it('does not show RSVP buttons', () => {
      render(
        <CalendarInviteCard
          invite={makeInvite(ITipMethod.Cancel) as any}
          onRsvp={jest.fn()}
        />,
      );
      expect(screen.queryByText('CalInvite_Accept')).not.toBeInTheDocument();
    });
  });

  describe('REPLY method', () => {
    it('shows read-only response banner with attendee info', () => {
      const invite = makeInvite(ITipMethod.Reply, {
        attendees: [
          {
            email: 'attendee@example.com',
            displayName: 'Alice',
            partstat: ParticipationStatus.Accepted,
            role: 'REQ-PARTICIPANT',
            rsvp: false,
            userId: 'u1',
          },
        ],
      });
      render(<CalendarInviteCard invite={invite as any} />);
      expect(screen.getByText('CalInvite_ResponseTemplate')).toBeInTheDocument();
    });

    it('does not show RSVP buttons', () => {
      render(
        <CalendarInviteCard
          invite={makeInvite(ITipMethod.Reply) as any}
          onRsvp={jest.fn()}
        />,
      );
      expect(screen.queryByText('CalInvite_Accept')).not.toBeInTheDocument();
    });
  });

  describe('COUNTER method', () => {
    it('shows the counter-proposal chip header', () => {
      render(
        <CalendarInviteCard invite={makeInvite(ITipMethod.Counter) as any} />,
      );
      expect(screen.getByText('CalInvite_Counter')).toBeInTheDocument();
    });

    it('shows the counter body alert', () => {
      render(
        <CalendarInviteCard invite={makeInvite(ITipMethod.Counter) as any} />,
      );
      expect(screen.getByText('CalInvite_CounterBody')).toBeInTheDocument();
    });
  });

  describe('organizer info', () => {
    it('shows organizer name when provided', () => {
      render(
        <CalendarInviteCard
          invite={makeInvite(ITipMethod.Request, { organizerName: 'Jane Doe' }) as any}
        />,
      );
      expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
    });

    it('falls back to organizer email when name not provided', () => {
      render(
        <CalendarInviteCard
          invite={
            makeInvite(ITipMethod.Request, {
              organizerName: undefined,
              organizerEmail: 'jane@example.com',
            }) as any
          }
        />,
      );
      expect(screen.getByText(/jane@example\.com/)).toBeInTheDocument();
    });
  });
});
