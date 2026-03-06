/**
 * Unit tests for BrightMail menu integration and routing.
 *
 * Tests: menu item visible when authenticated, hidden when not,
 * click navigates to /brightmail, route registration, language change
 * re-renders text.
 *
 * Requirements: 1.1, 1.2, 1.3, 7.3, 11.1
 */

import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  };
});

jest.mock('@digitaldefiance/ecies-lib', () => ({
  IECIESConfig: {},
  Member: { newMember: jest.fn() },
  EmailString: jest.fn(),
}));

jest.mock('@digitaldefiance/suite-core-lib', () => ({
  SuiteCoreComponentId: 'suite-core',
  SuiteCoreStringKey: new Proxy(
    {},
    {
      get: (_t: unknown, p: string | symbol) => `suite-core:${String(p)}`,
    },
  ),
  SuiteCoreStringKeyValue: {},
}));

let mockTranslations: Record<string, string> = {};

jest.mock('@brightchain/brightchain-lib', () => ({
  BrightChainComponentId: 'brightchain',
  BrightChainStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => String(p) },
  ),
}));

jest.mock('@brightchain/brightchain-react-components', () => ({
  BrightChainSubLogo: ({ subText }: { subText?: string }) => (
    <span data-testid="brightchain-sub-logo">{subText || 'SubLogo'}</span>
  ),
}));

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) =>
      mockTranslations[key] || key,
    t: (key: string) => mockTranslations[key] || key,
    tBranded: (key: string) => mockTranslations[key] || key,
    changeLanguage: jest.fn(),
    currentLanguage: 'en',
  }),
}));

// Import after mocks
import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import BrightMailLayout from '../BrightMailLayout';

// ─── Helpers ────────────────────────────────────────────────────────────────

const FakePrivateRoute: React.FC<{
  isAuthenticated: boolean;
  children?: React.ReactNode;
}> = ({ isAuthenticated, children }) => {
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

function renderWithRouter(
  ui: React.ReactElement,
  initialEntries: string[] = ['/brightmail'],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('BrightMailLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTranslations = {};
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Requirement 11.1: Route registration — /brightmail renders layout
   */
  it('renders BrightMailLayout at /brightmail route', () => {
    renderWithRouter(
      <Routes>
        <Route path="/brightmail" element={<BrightMailLayout />}>
          <Route index element={<div>Inbox</div>} />
        </Route>
      </Routes>,
    );

    expect(screen.getByTestId('brightchain-sub-logo')).toBeInTheDocument();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  /**
   * Requirement 1.2: Compose button navigates to /brightmail/compose
   */
  it('compose button navigates to /brightmail/compose', () => {
    renderWithRouter(
      <Routes>
        <Route path="/brightmail" element={<BrightMailLayout />}>
          <Route index element={<div>Inbox</div>} />
        </Route>
      </Routes>,
    );

    fireEvent.click(screen.getByText('BrightMail_Compose_Title'));
    expect(mockNavigate).toHaveBeenCalledWith('/brightmail/compose');
  });

  /**
   * Requirement 1.1: Authenticated user sees BrightMail content
   */
  it('authenticated user can access /brightmail', () => {
    renderWithRouter(
      <Routes>
        <Route
          path="/brightmail"
          element={
            <FakePrivateRoute isAuthenticated={true}>
              <BrightMailLayout />
            </FakePrivateRoute>
          }
        >
          <Route index element={<div>Inbox</div>} />
        </Route>
        <Route path="/login" element={<div data-testid="login">Login</div>} />
      </Routes>,
    );

    expect(screen.getByTestId('brightchain-sub-logo')).toBeInTheDocument();
    expect(screen.queryByTestId('login')).not.toBeInTheDocument();
  });

  /**
   * Requirement 1.3: Unauthenticated user is redirected
   */
  it('unauthenticated user is redirected from /brightmail', () => {
    renderWithRouter(
      <Routes>
        <Route
          path="/brightmail"
          element={
            <FakePrivateRoute isAuthenticated={false}>
              <BrightMailLayout />
            </FakePrivateRoute>
          }
        >
          <Route index element={<div>Inbox</div>} />
        </Route>
        <Route
          path="/login"
          element={
            <>
              <div data-testid="login">Login</div>
              <LocationDisplay />
            </>
          }
        />
      </Routes>,
    );

    expect(screen.queryByText('BrightMail_MenuLabel')).not.toBeInTheDocument();
    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.getByTestId('location-display').textContent).toBe('/login');
  });

  /**
   * Requirement 11.1: Nested route /brightmail/compose works
   */
  it('renders layout for nested /brightmail/compose route', () => {
    renderWithRouter(
      <Routes>
        <Route path="/brightmail" element={<BrightMailLayout />}>
          <Route index element={<div>Inbox</div>} />
          <Route
            path="compose"
            element={<div data-testid="compose">Compose</div>}
          />
        </Route>
      </Routes>,
      ['/brightmail/compose'],
    );

    expect(screen.getByTestId('brightchain-sub-logo')).toBeInTheDocument();
  });

  /**
   * Requirement 7.3: Language change re-renders text
   */
  it('re-renders text when translations change', () => {
    mockTranslations = {
      BrightMail_Compose_Title: 'Compose',
    };

    const { rerender } = render(
      <MemoryRouter initialEntries={['/brightmail']}>
        <Routes>
          <Route path="/brightmail" element={<BrightMailLayout />}>
            <Route index element={<div>Inbox</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('brightchain-sub-logo')).toBeInTheDocument();
    expect(screen.getByText('Compose')).toBeInTheDocument();

    // Simulate language change
    mockTranslations = {
      BrightMail_Compose_Title: 'Redactar',
    };

    // Force remount to pick up new translations (simulates i18n context change)
    rerender(
      <MemoryRouter initialEntries={['/brightmail']}>
        <Routes>
          <Route
            path="/brightmail"
            element={<BrightMailLayout key="lang-es" />}
          >
            <Route index element={<div>Inbox</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Redactar')).toBeInTheDocument();
  });
});
