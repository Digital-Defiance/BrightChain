/**
 * Unit tests for ComposeModal maximize/restore behavior.
 *
 * Tests: maximize button visibility on mobile vs desktop, backdrop rendering
 * in full-window mode, maximize button icon changes between states.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// Import after mocks
import { ComposeModalInner, type ComposeModalProps } from '../ComposeModal';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Track the current useMediaQuery return value so tests can toggle mobile/desktop
let mockIsMobile = false;

jest.mock('@mui/material/useMediaQuery', () => jest.fn(() => mockIsMobile));

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

jest.mock('@brightchain/brightchain-lib', () => ({
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
  toBrightDateString: (date: Date | string, _precision?: number) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return ((d.getTime() - 946684800000) / 86400000).toFixed(_precision ?? 5);
  },
  MessageEncryptionScheme: {
    NONE: 'none',
    SHARED_KEY: 'shared_key',
    RECIPIENT_KEYS: 'recipient_keys',
    S_MIME: 's_mime',
  },
  MAX_ATTACHMENT_SIZE_BYTES: 25 * 1024 * 1024,
  formatFileSize: (bytes: number) => `${bytes} B`,
  validateAttachmentSize: (size: number, max: number) => size <= max,
  validateTotalAttachmentSize: (sizes: number[], max: number) =>
    sizes.every((s: number) => s <= max) &&
    sizes.reduce((a: number, b: number) => a + b, 0) <= max,
  getBrightChainI18nEngine: () => ({
    translate: (_componentId: string, key: string) => key,
    translateEnum: (_enumType: unknown, value: unknown) => String(value),
    registerIfNotExists: jest.fn(),
    registerStringKeyEnum: jest.fn(),
  }),
}));

jest.mock('@brightchain/brightmail-lib', () => ({
  BrightMailStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => String(p) },
  ),
}));

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    t: (key: string) => key,
    tBranded: (key: string) => key,
    changeLanguage: jest.fn(),
    currentLanguage: 'en',
  }),
}));

// Mock Tiptap to avoid JSDOM issues
jest.mock('@tiptap/react', () => ({
  useEditor: () => null,
  EditorContent: () => null,
}));
jest.mock('@tiptap/starter-kit', () => ({
  __esModule: true,
  default: { configure: jest.fn() },
}));
jest.mock('@tiptap/extension-underline', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('@tiptap/extension-link', () => ({
  __esModule: true,
  default: { configure: jest.fn() },
}));

jest.mock('../hooks/useEmailApi', () => ({
  __esModule: true,
  useEmailApi: () => ({
    sendEmail: jest.fn(),
    queryInbox: jest.fn(),
    getEmail: jest.fn(),
    getEmailContent: jest.fn(),
    getEmailThread: jest.fn(),
    getDeliveryStatus: jest.fn(),
    replyToEmail: jest.fn(),
    forwardEmail: jest.fn(),
    markAsRead: jest.fn(),
    deleteEmail: jest.fn(),
    getUnreadCount: jest.fn(),
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const defaultProps: ComposeModalProps = {
  open: true,
  minimized: false,
  maximized: false,
  onClose: jest.fn(),
  onMinimize: jest.fn(),
  onToggleMaximize: jest.fn(),
};

function renderModal(overrides: Partial<ComposeModalProps> = {}) {
  return render(<ComposeModalInner {...defaultProps} {...overrides} />);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ComposeModal maximize behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMobile = false;
  });

  // ── Requirement 2.1: Maximize button visible on desktop ───────────────

  it('renders the maximize button on desktop', () => {
    mockIsMobile = false;
    renderModal();

    const maximizeBtn = screen.getByTestId('compose-maximize-btn');
    expect(maximizeBtn).toBeInTheDocument();
  });

  // ── Requirement 2.6: Maximize button hidden on mobile (≤600px) ────────

  it('hides the maximize button on mobile viewports', () => {
    mockIsMobile = true;
    renderModal();

    expect(
      screen.queryByTestId('compose-maximize-btn'),
    ).not.toBeInTheDocument();
  });

  // ── Requirement 2.6: Maximize button hidden when minimized ────────────

  it('hides the maximize button when the modal is minimized', () => {
    mockIsMobile = false;
    renderModal({ minimized: true });

    expect(
      screen.queryByTestId('compose-maximize-btn'),
    ).not.toBeInTheDocument();
  });

  // ── Requirement 2.5: Backdrop rendered in full-window mode ────────────

  it('renders a semi-transparent backdrop when maximized', () => {
    mockIsMobile = false;
    renderModal({ maximized: true });

    const backdrop = screen.getByTestId('compose-maximize-backdrop');
    expect(backdrop).toBeInTheDocument();
  });

  it('does not render a backdrop when not maximized', () => {
    mockIsMobile = false;
    renderModal({ maximized: false });

    expect(
      screen.queryByTestId('compose-maximize-backdrop'),
    ).not.toBeInTheDocument();
  });

  // ── Requirement 2.3: Icon changes between maximize and restore ────────

  it('shows OpenInFull icon when not maximized', () => {
    mockIsMobile = false;
    renderModal({ maximized: false });

    const maximizeBtn = screen.getByTestId('compose-maximize-btn');
    expect(maximizeBtn).toHaveAttribute('aria-label', 'ComposeModal_Maximize');
  });

  it('shows CloseFullscreen icon when maximized', () => {
    mockIsMobile = false;
    renderModal({ maximized: true });

    const maximizeBtn = screen.getByTestId('compose-maximize-btn');
    expect(maximizeBtn).toHaveAttribute(
      'aria-label',
      'ComposeModal_RestoreDown',
    );
  });

  // ── Requirement 2.2: Full-window mode renders as centered overlay ─────

  it('renders the modal as a dialog in maximized mode', () => {
    mockIsMobile = false;
    renderModal({ maximized: true });

    const modal = screen.getByTestId('compose-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute('role', 'dialog');
  });
});
