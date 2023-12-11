import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@digitaldefiance/ecies-lib', () => ({
  IECIESConfig: {},
  Member: { newMember: jest.fn() },
  EmailString: jest.fn(),
  CrcService: jest.fn().mockImplementation(() => ({
    crc16: jest.fn(() => new Uint8Array(2)),
  })),
}));

jest.mock('@digitaldefiance/suite-core-lib', () => ({
  SuiteCoreComponentId: 'suite-core',
  SuiteCoreStringKey: new Proxy(
    {},
    { get: (_target, prop) => `suite-core:${String(prop)}` },
  ),
  SuiteCoreStringKeyValue: {},
}));

// Mock useAuthenticatedApi
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useAuth: jest.fn(() => ({ admin: false })),
  useI18n: () => ({ tBranded: (k: string) => k, t: (k: string) => k }),
  useAuthenticatedApi: jest.fn(() => ({
    defaults: { baseURL: 'http://test-api' },
  })),
  createAuthenticatedApiClient: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  })),
}));

jest.mock('@brightchain/brightchain-lib', () => ({
  BrightChainStrings: new Proxy({}, { get: (_target, prop) => String(prop) }),
  CONSTANTS: {
    THEME_COLORS: {
      CHAIN_BLUE: '#1976d2',
      CHAIN_BLUE_LIGHT: '#42a5f5',
      CHAIN_BLUE_DARK: '#1565c0',
      BRIGHT_CYAN: '#00bcd4',
      BRIGHT_CYAN_LIGHT: '#4dd0e1',
      BRIGHT_CYAN_DARK: '#0097a7',
      ERROR_RED: '#d32f2f',
      ALERT_ORANGE: '#ed6c02',
      SECURE_GREEN: '#2e7d32',
    },
  },
}));

// Mock FontAwesome
jest.mock(
  '@awesome.me/kit-a20d532681/icons/classic/solid',
  () =>
    new Proxy(
      {},
      {
        get: (_target, prop) => ({
          iconName: String(prop),
          prefix: 'fas',
          icon: [0, 0, [], '', ''],
        }),
      },
    ),
);
jest.mock(
  '@awesome.me/kit-a20d532681/icons/classic/thin',
  () =>
    new Proxy(
      {},
      {
        get: (_target, prop) => ({
          iconName: String(prop),
          prefix: 'fat',
          icon: [0, 0, [], '', ''],
        }),
      },
    ),
);
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ icon }: { icon: { iconName: string } }) => (
    <span data-testid={`fa-${icon?.iconName ?? 'unknown'}`} />
  ),
}));

// Mock MUI
jest.mock('@mui/material/Box', () => ({
  __esModule: true,
  default: ({
    children,
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="Box">{children}</div>
  ),
}));

jest.mock('@mui/material/CircularProgress', () => ({
  __esModule: true,
  default: () => <div data-testid="CircularProgress" />,
}));

jest.mock('@mui/material/Typography', () => ({
  __esModule: true,
  default: ({
    children,
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <span data-testid="Typography">{children}</span>
  ),
}));

// ---------------------------------------------------------------------------
// Mock brightcal-react-components — capture hook args for assertions
// ---------------------------------------------------------------------------

const mockRefetchCalendars = jest.fn();
const mockRefetchEvents = jest.fn();
let capturedUseEventsArgs: Record<string, unknown> = {};
let mockCalendars: Array<Record<string, unknown>> = [];
let mockCalendarsLoading = false;

const mockCalendarSidebar = jest.fn(
  (props: Record<string, unknown>) => (
    <div data-testid="CalendarSidebar" data-calendars-count={String((props.calendars as unknown[]).length)}>
      <button
        data-testid="toggle-visibility"
        onClick={() => {
          const onVisibilityChange = props.onVisibilityChange as (s: Set<string>) => void;
          onVisibilityChange(new Set(['cal-1']));
        }}
      >
        Toggle
      </button>
    </div>
  ),
);

jest.mock('@brightchain/brightcal-react-components', () => ({
  CalendarSidebar: (props: Record<string, unknown>) => mockCalendarSidebar(props),
  CalendarWidget: (props: Record<string, unknown>) => (
    <div data-testid="CalendarWidget" data-events-count={String((props.events as unknown[]).length)} />
  ),
  ResponsiveCalendarLayout: ({
    children,
    sidebar,
  }: React.PropsWithChildren<{ sidebar: React.ReactNode }>) => (
    <div data-testid="ResponsiveCalendarLayout">
      <div data-testid="sidebar-slot">{sidebar}</div>
      <div data-testid="main-slot">{children}</div>
    </div>
  ),
  useCalendars: () => ({
    data: mockCalendars,
    loading: mockCalendarsLoading,
    error: null,
    refetch: mockRefetchCalendars,
  }),
  useEvents: (args: Record<string, unknown>) => {
    capturedUseEventsArgs = args;
    return {
      data: [],
      loading: false,
      error: null,
      refetch: mockRefetchEvents,
    };
  },
  loadVisibilitySet: jest.fn(() => null),
  saveVisibilitySet: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import CalendarPage from '../CalendarPage';
import {
  loadVisibilitySet,
  saveVisibilitySet,
} from '@brightchain/brightcal-react-components';

// ---------------------------------------------------------------------------
// Tests — Validates: Requirements 13.1, 13.2, 13.3
// ---------------------------------------------------------------------------

describe('CalendarPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedUseEventsArgs = {};
    mockCalendars = [
      { id: 'cal-1', displayName: 'Work', color: '#3b82f6', ownerId: 'u1', isDefault: true },
      { id: 'cal-2', displayName: 'Personal', color: '#ef4444', ownerId: 'u1', isDefault: false },
    ];
    mockCalendarsLoading = false;
    (loadVisibilitySet as jest.Mock).mockReturnValue(null);
  });

  // Validates: Requirement 13.1
  it('renders CalendarSidebar in the sidebar slot of ResponsiveCalendarLayout', () => {
    render(<CalendarPage />);

    expect(screen.getByTestId('ResponsiveCalendarLayout')).toBeTruthy();
    const sidebarSlot = screen.getByTestId('sidebar-slot');
    expect(sidebarSlot.querySelector('[data-testid="CalendarSidebar"]')).toBeTruthy();
  });

  // Validates: Requirement 13.2
  it('passes updated visibilitySet to useEvents calendarIds when sidebar toggles', async () => {
    (loadVisibilitySet as jest.Mock).mockReturnValue(new Set(['cal-1', 'cal-2']));

    render(<CalendarPage />);

    // Initially both calendars should be in calendarIds
    expect(capturedUseEventsArgs.calendarIds).toEqual(
      expect.arrayContaining(['cal-1', 'cal-2']),
    );

    // Simulate sidebar toggling to only cal-1
    const toggleBtn = screen.getByTestId('toggle-visibility');
    await act(async () => {
      toggleBtn.click();
    });

    // After toggle, calendarIds should only contain cal-1
    expect(capturedUseEventsArgs.calendarIds).toEqual(['cal-1']);
  });

  // Validates: Requirement 13.3 (1.5 — localStorage persistence)
  it('persists visibilitySet to localStorage on change', async () => {
    (loadVisibilitySet as jest.Mock).mockReturnValue(new Set(['cal-1', 'cal-2']));

    render(<CalendarPage />);

    const toggleBtn = screen.getByTestId('toggle-visibility');
    await act(async () => {
      toggleBtn.click();
    });

    expect(saveVisibilitySet).toHaveBeenCalledWith(new Set(['cal-1']));
  });

  // Validates: Requirement 1.4 — defaults to all calendar IDs when no persisted set
  it('initializes visibilitySet to all calendar IDs when localStorage is empty', async () => {
    (loadVisibilitySet as jest.Mock).mockReturnValue(null);

    render(<CalendarPage />);

    // The useEffect should initialize with all calendar IDs
    await waitFor(() => {
      expect(saveVisibilitySet).toHaveBeenCalledWith(
        new Set(['cal-1', 'cal-2']),
      );
    });
  });

  it('passes calendars and onCalendarsChanged to CalendarSidebar', () => {
    render(<CalendarPage />);

    expect(mockCalendarSidebar).toHaveBeenCalledWith(
      expect.objectContaining({
        calendars: mockCalendars,
        onCalendarsChanged: mockRefetchCalendars,
        apiBaseUrl: 'http://test-api',
      }),
    );
  });
});
