/**
 * Unit tests for ReadingPane component.
 *
 * Tests: placeholder when no email selected, ThreadView rendering when
 * email is selected via MemoryRouter, remount on emailId change.
 *
 * Requirements: 1.6
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';

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

const mockGetEmailThread = jest.fn();
const mockMarkAsRead = jest.fn();

jest.mock('../hooks/useEmailApi', () => ({
  __esModule: true,
  useEmailApi: () => ({
    sendEmail: jest.fn(),
    queryInbox: jest.fn(),
    getEmail: jest.fn(),
    getEmailContent: jest.fn(),
    getEmailThread: mockGetEmailThread,
    getDeliveryStatus: jest.fn(),
    replyToEmail: jest.fn(),
    forwardEmail: jest.fn(),
    markAsRead: mockMarkAsRead,
    deleteEmail: jest.fn(),
    getUnreadCount: jest.fn(),
  }),
}));

const mockOpenCompose = jest.fn();

jest.mock('../BrightMailContext', () => ({
  useBrightMail: () => ({
    openCompose: mockOpenCompose,
    sidebarOpen: true,
    setSidebarOpen: jest.fn(),
    composeModal: { status: 'closed' },
    minimizeCompose: jest.fn(),
    closeCompose: jest.fn(),
    selectedEmailId: null,
    setSelectedEmailId: jest.fn(),
  }),
}));

// Import after mocks
import ReadingPane from '../ReadingPane';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeThreadEmail(
  id: string,
  subject = 'Test Subject',
  dateStr = '2024-06-15T10:00:00Z',
) {
  return {
    messageId: id,
    from: {
      localPart: 'alice',
      domain: 'example.com',
      displayName: 'Alice',
      get address() {
        return `${this.localPart}@${this.domain}`;
      },
    },
    to: [
      {
        localPart: 'bob',
        domain: 'example.com',
        displayName: 'Bob',
        get address() {
          return `${this.localPart}@${this.domain}`;
        },
      },
    ],
    cc: [],
    subject,
    date: new Date(dateStr),
    textBody: 'Hello from the thread',
    readReceipts: new Map([['user1', new Date()]]),
    deliveryReceipts: new Map(),
    customHeaders: new Map(),
    deliveryStatus: new Map(),
    acknowledgments: new Map(),
    mimeVersion: '1.0',
    contentType: {
      type: 'text',
      subtype: 'plain',
      parameters: new Map(),
      get mediaType() {
        return 'text/plain';
      },
    },
    messageType: 'email',
    senderId: 'test',
    recipients: [],
    priority: 1,
    encryptionScheme: 'none',
    isCBL: false,
    blockId: 'test-block',
    createdAt: new Date(),
    expiresAt: null,
    durabilityLevel: 0,
    parityBlockIds: [],
    accessCount: 0,
    lastAccessedAt: new Date(),
    replicationStatus: 0,
    targetReplicationFactor: 0,
    replicaNodeIds: [],
    size: 0,
    checksum: 'test',
  } as any;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ReadingPane', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Requirement 1.6: Shows placeholder when no email is selected
   */
  it('renders placeholder text when emailId is null', () => {
    render(<ReadingPane emailId={null} />);

    expect(screen.getByTestId('reading-pane-placeholder')).toBeInTheDocument();
    expect(screen.getByText('Select an email to read')).toBeInTheDocument();
  });

  /**
   * Requirement 1.6: Displays ThreadView inline when an email is selected
   */
  it('renders ThreadView via MemoryRouter when emailId is provided', async () => {
    const emails = [makeThreadEmail('msg-rp-1', 'Reading Pane Thread')];
    mockGetEmailThread.mockResolvedValue(emails);
    mockMarkAsRead.mockResolvedValue({} as any);

    await act(async () => {
      render(<ReadingPane emailId="msg-rp-1" />);
    });

    // ThreadView should be rendered inside the reading pane
    expect(screen.getByTestId('reading-pane-thread')).toBeInTheDocument();

    // ThreadView fetches the thread using the messageId from MemoryRouter params
    expect(mockGetEmailThread).toHaveBeenCalledWith('msg-rp-1');

    // Wait for thread content to appear
    await waitFor(() => {
      expect(screen.getByTestId('thread-view')).toBeInTheDocument();
    });
  });

  /**
   * Requirement 1.6: Remounts ThreadView when emailId changes
   */
  it('remounts ThreadView when emailId changes', async () => {
    const email1 = [makeThreadEmail('msg-a', 'Thread A')];
    const email2 = [makeThreadEmail('msg-b', 'Thread B')];
    mockGetEmailThread
      .mockResolvedValueOnce(email1)
      .mockResolvedValueOnce(email2);
    mockMarkAsRead.mockResolvedValue({} as any);

    const { rerender } = render(<ReadingPane emailId="msg-a" />);

    await waitFor(() => {
      expect(mockGetEmailThread).toHaveBeenCalledWith('msg-a');
    });

    // Change the emailId — MemoryRouter should remount with new route
    await act(async () => {
      rerender(<ReadingPane emailId="msg-b" />);
    });

    await waitFor(() => {
      expect(mockGetEmailThread).toHaveBeenCalledWith('msg-b');
    });

    expect(mockGetEmailThread).toHaveBeenCalledTimes(2);
  });

  /**
   * Switching from selected email back to null shows placeholder
   */
  it('shows placeholder when emailId changes from a value to null', async () => {
    const emails = [makeThreadEmail('msg-c')];
    mockGetEmailThread.mockResolvedValue(emails);
    mockMarkAsRead.mockResolvedValue({} as any);

    const { rerender } = render(<ReadingPane emailId="msg-c" />);

    await waitFor(() => {
      expect(screen.getByTestId('reading-pane-thread')).toBeInTheDocument();
    });

    rerender(<ReadingPane emailId={null} />);

    expect(screen.getByTestId('reading-pane-placeholder')).toBeInTheDocument();
    expect(screen.getByText('Select an email to read')).toBeInTheDocument();
    expect(screen.queryByTestId('reading-pane-thread')).not.toBeInTheDocument();
  });
});
