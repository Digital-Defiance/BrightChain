import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks — follow the same pattern as app.spec.tsx
// ---------------------------------------------------------------------------

// Mock ecies-lib to prevent heavy crypto/i18n initialization
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

// useAuth mock — we control the return value per test
const mockUseAuth = jest.fn();

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
  useI18n: () => ({
    tBranded: (key: string) => key,
    t: (key: string) => key,
  }),
  createAuthenticatedApiClient: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  })),
}));

// authenticatedApi mock
const mockGet = jest.fn();
const mockPut = jest.fn();
jest.mock('../../services/authenticatedApi', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));

// Mock brightchain-lib — provide enums and types the components need
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
  HealthStatus: {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    UNHEALTHY: 'unhealthy',
    STARTING: 'starting',
  },
  NodeStatus: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    UNREACHABLE: 'unreachable',
  },
  NodeIdSource: {
    AVAILABILITY_SERVICE: 'availability_service',
    SYSTEM_IDENTITY: 'system_identity',
    ENVIRONMENT: 'environment',
    GENERATED: 'generated',
  },
}));

// Mock FontAwesome — render icon names as text for easy assertion
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

// Mock MUI — lightweight stubs
jest.mock('@mui/material', () => {
  const actual: Record<string, unknown> = {};
  // Simple pass-through wrappers for layout components
  const passThrough = (name: string) => {
    const Comp = ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div data-testid={name} {...filterDomProps(props)}>
        {children}
      </div>
    );
    Comp.displayName = name;
    return Comp;
  };

  // Filter out non-DOM props to avoid React warnings
  const filterDomProps = (props: Record<string, unknown>) => {
    const domProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        key.startsWith('data-') ||
        key.startsWith('aria-') ||
        key === 'className' ||
        key === 'id' ||
        key === 'role' ||
        key === 'onClick' ||
        key === 'onChange' ||
        key === 'disabled'
      ) {
        domProps[key] = value;
      }
    }
    return domProps;
  };

  actual.Box = passThrough('Box');
  actual.Card = passThrough('Card');
  actual.CardContent = passThrough('CardContent');
  actual.Container = passThrough('Container');
  actual.Grid = passThrough('Grid');
  actual.Typography = ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <span data-testid="Typography" {...filterDomProps(props)}>
      {children}
    </span>
  );
  actual.Chip = ({
    label,
    ...props
  }: { label?: string } & Record<string, unknown>) => (
    <span data-testid="Chip" {...filterDomProps(props)}>
      {label}
    </span>
  );
  actual.Tooltip = ({ children }: React.PropsWithChildren) => <>{children}</>;
  actual.IconButton = ({
    children,
    onClick,
    ...props
  }: React.PropsWithChildren<
    { onClick?: () => void } & Record<string, unknown>
  >) => (
    <button
      data-testid="IconButton"
      onClick={onClick}
      {...filterDomProps(props)}
    >
      {children}
    </button>
  );
  actual.Button = ({
    children,
    onClick,
    ...props
  }: React.PropsWithChildren<
    { onClick?: () => void } & Record<string, unknown>
  >) => (
    <button onClick={onClick} {...filterDomProps(props)}>
      {children}
    </button>
  );
  actual.Table = passThrough('Table');
  actual.TableHead = passThrough('TableHead');
  actual.TableBody = passThrough('TableBody');
  actual.TableRow = passThrough('TableRow');
  actual.TableCell = passThrough('TableCell');
  actual.Select = ({
    children,
    onChange,
    value,
  }: React.PropsWithChildren<{
    onChange?: (e: { target: { value: string } }) => void;
    value?: string;
  }>) => (
    <select
      data-testid="Select"
      value={value}
      onChange={(e) => onChange?.({ target: { value: e.target.value } })}
    >
      {children}
    </select>
  );
  actual.MenuItem = ({
    children,
    value,
  }: React.PropsWithChildren<{ value?: string }>) => (
    <option value={value}>{children}</option>
  );
  actual.Dialog = ({
    children,
    open,
  }: React.PropsWithChildren<{ open?: boolean }>) =>
    open ? <div data-testid="Dialog">{children}</div> : null;
  actual.DialogTitle = passThrough('DialogTitle');
  actual.DialogContent = passThrough('DialogContent');
  actual.DialogContentText = passThrough('DialogContentText');
  actual.DialogActions = passThrough('DialogActions');

  return actual;
});

// ---------------------------------------------------------------------------
// Imports (must come after mocks)
// ---------------------------------------------------------------------------
import AdminDashboardPage from './AdminDashboardPage';
import AdminUserManagementPanel from './AdminUserManagementPanel';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const makeDashboardData = (overrides: Record<string, unknown> = {}) => ({
  nodes: [
    {
      nodeId: 'node-1',
      status: 'online',
      capabilities: ['block_storage'],
      lastSeen: '2025-01-01T00:00:00.000Z',
    },
  ],
  localNodeId: 'node-1',
  nodeIdSource: 'environment',
  hostname: 'test-host',
  disconnectedPeers: [],
  lumenClientCount: 2,
  lumenClientSessions: [
    { memberId: 'm1', username: 'alice', memberType: 'User', rooms: ['room1'] },
    { memberId: 'm2', username: 'bob', memberType: 'User', rooms: [] },
  ],
  nodeConnectionCount: 1,
  connectedNodeIds: ['node-2'],
  system: {
    heapUsedBytes: 52_428_800, // 50 MB
    heapTotalBytes: 104_857_600, // 100 MB
    rssBytes: 157_286_400, // 150 MB
    externalBytes: 8_388_608, // 8 MB
    uptimeSeconds: 3600,
    nodeVersion: 'v20.11.0',
    appVersion: '0.13.0',
  },
  db: {
    users: 42,
    roles: 5,
    usersByStatus: { active: 38, locked: 2, pendingEmailVerification: 2 },
  },
  brightTrust: {
    active: true,
    memberCount: 3,
    threshold: 2,
    members: [{ name: 'Member-a1b2c3d4', role: 'admin' }],
  },
  pools: [{ poolId: 'brightTrust-system' }],
  dependencies: {
    blockStore: { name: 'blockStore', status: 'healthy', latencyMs: 12 },
    messageService: { name: 'messageService', status: 'healthy', latencyMs: 5 },
    webSocketServer: {
      name: 'webSocketServer',
      status: 'healthy',
      latencyMs: 2,
    },
  },
  blockStore: {
    totalBlocks: 1024,
    totalSizeBytes: 536_870_912,
    countByDurability: { standard: 800, high_durability: 200, ephemeral: 24 },
  },
  hub: { totalPosts: 156, activeUsersLast30Days: 12 },
  chat: { totalConversations: 45, totalMessages: 2340 },
  pass: { totalVaults: 18, sharedVaults: 3 },
  mail: { totalEmails: 890, deliveryFailures: 5, emailsLast24Hours: 42 },
  timestamp: '2025-01-16T10:00:00.000Z',
  ...overrides,
});

// ---------------------------------------------------------------------------
// AdminDashboardPage tests
// ---------------------------------------------------------------------------

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // Validates: Requirement 1.4
  it('renders access denied for non-admin users', () => {
    mockUseAuth.mockReturnValue({ admin: false });
    render(<AdminDashboardPage />);
    expect(screen.getByText('Admin_Dashboard_AccessDenied')).toBeTruthy();
    expect(
      screen.getByText('Admin_Dashboard_AccessDeniedDescription'),
    ).toBeTruthy();
  });

  // Validates: Requirement 10.1
  it('polls at 30-second intervals using setInterval', async () => {
    jest.useFakeTimers();
    mockUseAuth.mockReturnValue({ admin: true });

    const dashboardData = makeDashboardData();
    mockGet.mockResolvedValue({ data: dashboardData });

    render(<AdminDashboardPage />);

    // Initial fetch
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Advance 30s — second poll
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(mockGet).toHaveBeenCalledTimes(2);

    // Advance another 30s — third poll
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  // Validates: Requirement 10.3
  it('manual refresh button triggers immediate fetch', async () => {
    jest.useFakeTimers();
    mockUseAuth.mockReturnValue({ admin: true });

    const dashboardData = makeDashboardData();
    mockGet.mockResolvedValue({ data: dashboardData });

    render(<AdminDashboardPage />);

    // Wait for initial fetch
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Click refresh button
    const refreshBtn = screen.getByLabelText('refresh dashboard');
    await act(async () => {
      fireEvent.click(refreshBtn);
    });
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  // Validates: Requirement 10.2
  it('retains last-good data on error with error indicator', async () => {
    jest.useFakeTimers();
    mockUseAuth.mockReturnValue({ admin: true });

    const dashboardData = makeDashboardData();
    // First call succeeds
    mockGet.mockResolvedValueOnce({ data: dashboardData });

    render(<AdminDashboardPage />);

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    // Verify data rendered
    expect(screen.getByText(/test-host/)).toBeTruthy();

    // Second call fails
    mockGet.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    // Data should still be visible (retained)
    expect(screen.getByText(/test-host/)).toBeTruthy();
    // Error indicator should appear
    expect(screen.getByText(/Error/)).toBeTruthy();
  });

  // Validates: Requirement 5.4
  it('formats bytes to MB correctly', async () => {
    mockUseAuth.mockReturnValue({ admin: true });

    const dashboardData = makeDashboardData();
    mockGet.mockResolvedValue({ data: dashboardData });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      // 52428800 bytes = 50.00 MB
      expect(
        screen.getByText(/Admin_Dashboard_HeapUsed.*50\.00 MB/),
      ).toBeTruthy();
      // 104857600 bytes = 100.00 MB
      expect(
        screen.getByText(/Admin_Dashboard_HeapTotal.*100\.00 MB/),
      ).toBeTruthy();
      // 157286400 bytes = 150.00 MB
      expect(screen.getByText(/Admin_Dashboard_RSS.*150\.00 MB/)).toBeTruthy();
    });
  });

  // Validates: Requirement 12.6
  it('displays user status breakdown in DB Stats', async () => {
    mockUseAuth.mockReturnValue({ admin: true });

    const dashboardData = makeDashboardData();
    mockGet.mockResolvedValue({ data: dashboardData });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Active: 38/)).toBeTruthy();
      expect(screen.getByText(/Locked: 2/)).toBeTruthy();
      expect(screen.getByText(/Pending: 2/)).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// AdminUserManagementPanel tests
// ---------------------------------------------------------------------------

describe('AdminUserManagementPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const usersResponse = {
    data: {
      users: [
        {
          _id: 'u1',
          username: 'alice',
          email: 'alice@example.com',
          accountStatus: 'Active',
          emailVerified: true,
          lastLogin: '2025-01-15T12:00:00.000Z',
        },
        {
          _id: 'u2',
          username: 'bob',
          email: 'bob@example.com',
          accountStatus: 'AdminLock',
          emailVerified: false,
          lastLogin: null,
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
    },
  };

  // Validates: Requirement 12.6
  it('renders user table with correct data', async () => {
    mockGet.mockResolvedValue(usersResponse);

    render(<AdminUserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeTruthy();
      expect(screen.getByText('bob')).toBeTruthy();
      expect(screen.getByText('alice@example.com')).toBeTruthy();
      expect(screen.getByText('bob@example.com')).toBeTruthy();
    });
  });

  // Validates: Requirement 12.7
  it('changes status filter and re-fetches with query parameter', async () => {
    mockGet.mockResolvedValue(usersResponse);

    render(<AdminUserManagementPanel />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });

    // The initial call should have All (no status param)
    const initialCall = mockGet.mock.calls[0][0] as string;
    expect(initialCall).not.toContain('status=');

    // Change filter to "Locked"
    const select = screen.getByTestId('Select');
    await act(async () => {
      fireEvent.change(select, { target: { value: 'Locked' } });
    });

    await waitFor(() => {
      // Should have been called again with status=AdminLock
      const lastCall = mockGet.mock.calls[
        mockGet.mock.calls.length - 1
      ][0] as string;
      expect(lastCall).toContain('status=AdminLock');
    });
  });

  // Validates: Requirement 12.7
  it('shows confirmation dialog before locking a user', async () => {
    mockGet.mockResolvedValue(usersResponse);

    render(<AdminUserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeTruthy();
    });

    // Find the lock button for alice (Active user gets a lock/ban button)
    const lockButtons = screen.getAllByTestId('IconButton');
    // Click the first lock button (alice's row)
    await act(async () => {
      fireEvent.click(lockButtons[0]);
    });

    // Confirmation dialog should appear
    expect(screen.getByTestId('Dialog')).toBeTruthy();
    expect(screen.getByText(/Admin_Users_LockConfirmTemplate/)).toBeTruthy();
  });

  // Validates: Requirement 12.7
  it('lock button calls PUT endpoint with AdminLock status', async () => {
    mockGet.mockResolvedValue(usersResponse);
    mockPut.mockResolvedValue({ data: { success: true } });

    render(<AdminUserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeTruthy();
    });

    // Click lock button for alice
    const lockButtons = screen.getAllByTestId('IconButton');
    await act(async () => {
      fireEvent.click(lockButtons[0]);
    });

    // Confirm the dialog
    const confirmBtns = screen.getAllByText('Admin_Users_LockUserTitle');
    const confirmBtn = confirmBtns.find((el) => el.tagName === 'BUTTON')!;
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/admin/users/u1/status', {
        status: 'AdminLock',
      });
    });
  });

  // Validates: Requirement 12.7
  it('unlock button calls PUT endpoint with Active status', async () => {
    mockGet.mockResolvedValue(usersResponse);
    mockPut.mockResolvedValue({ data: { success: true } });

    render(<AdminUserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('bob')).toBeTruthy();
    });

    // Click unlock button for bob (AdminLock user gets unlock button)
    const unlockButtons = screen.getAllByTestId('IconButton');
    // bob's unlock button is the second IconButton
    await act(async () => {
      fireEvent.click(unlockButtons[1]);
    });

    // Confirm the dialog
    const confirmBtns = screen.getAllByText('Admin_Users_UnlockUserTitle');
    const confirmBtn = confirmBtns.find((el) => el.tagName === 'BUTTON')!;
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/admin/users/u2/status', {
        status: 'Active',
      });
    });
  });
});
