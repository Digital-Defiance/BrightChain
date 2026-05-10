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

// Import after mocks
import ReadingPane from '../ReadingPane';

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

jest.mock('@brightchain/brightchain-lib', () => {
  const mockEngine = {
    translate: jest.fn((_componentId: string, key: string) => key),
    translateEnum: jest.fn((_enumType: unknown, value: unknown) =>
      String(value),
    ),
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
    getBrightChainI18nEngine: () => mockEngine,
    registerI18nComponentPackage: jest.fn(),
    EmailEncryptionService: jest.fn().mockImplementation(() => ({
      decryptEmailBody: jest.fn(async (_metadata: any, body: string) => body),
      encryptEmailBody: jest.fn(async (_metadata: any, body: string) => body),
    })),
    MessageEncryptionScheme: {
      NONE: 'NONE',
      AES_256_GCM: 'AES_256_GCM',
    },
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

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    t: (key: string) => key,
    tBranded: (key: string) => key,
    changeLanguage: jest.fn(),
    currentLanguage: 'en',
  }),
  useAuth: () => ({
    wallet: null,
    userData: { id: 'test-user-id', email: 'test@example.com' },
  }),
  useAuthenticatedApi: () => ({
    get: jest.fn().mockResolvedValue({ data: new Blob() }),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }),
}));

const mockEmailApi = {
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
};

jest.mock('../hooks/useEmailApi', () => ({
  __esModule: true,
  useEmailApi: () => mockEmailApi,
}));

const mockOpenCompose = jest.fn();

jest.mock('../BrightMailContext', () => ({
  useBrightMail: () => ({
    openCompose: mockOpenCompose,
    sidebarOpen: true,
    setSidebarOpen: jest.fn(),
    composeModal: { status: 'closed' },
    minimizeCompose: jest.fn(),
    toggleMaximize: jest.fn(),
    closeCompose: jest.fn(),
    selectedEmailId: null,
    setSelectedEmailId: jest.fn(),
  }),
}));

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

const mockedApi = mockEmailApi;

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
    expect(screen.getByText('ReadingPane_Placeholder')).toBeInTheDocument();
  });

  /**
   * Requirement 1.6: Displays ThreadView inline when an email is selected
   */
  it('renders ThreadView via MemoryRouter when emailId is provided', async () => {
    const emails = [makeThreadEmail('msg-rp-1', 'Reading Pane Thread')];
    mockedApi.getEmailThread.mockResolvedValue(emails);
    mockedApi.markAsRead.mockResolvedValue({} as any);

    await act(async () => {
      render(<ReadingPane emailId="msg-rp-1" />);
    });

    // ThreadView should be rendered inside the reading pane
    expect(screen.getByTestId('reading-pane-thread')).toBeInTheDocument();

    // ThreadView fetches the thread using the messageId from MemoryRouter params
    expect(mockedApi.getEmailThread).toHaveBeenCalledWith('msg-rp-1');

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
    mockedApi.getEmailThread
      .mockResolvedValueOnce(email1)
      .mockResolvedValueOnce(email2);
    mockedApi.markAsRead.mockResolvedValue({} as any);

    const { rerender } = render(<ReadingPane emailId="msg-a" />);

    await waitFor(() => {
      expect(mockedApi.getEmailThread).toHaveBeenCalledWith('msg-a');
    });

    // Change the emailId — MemoryRouter should remount with new route
    await act(async () => {
      rerender(<ReadingPane emailId="msg-b" />);
    });

    await waitFor(() => {
      expect(mockedApi.getEmailThread).toHaveBeenCalledWith('msg-b');
    });

    expect(mockedApi.getEmailThread).toHaveBeenCalledTimes(2);
  });

  /**
   * Switching from selected email back to null shows placeholder
   */
  it('shows placeholder when emailId changes from a value to null', async () => {
    const emails = [makeThreadEmail('msg-c')];
    mockedApi.getEmailThread.mockResolvedValue(emails);
    mockedApi.markAsRead.mockResolvedValue({} as any);

    const { rerender } = render(<ReadingPane emailId="msg-c" />);

    await waitFor(() => {
      expect(screen.getByTestId('reading-pane-thread')).toBeInTheDocument();
    });

    rerender(<ReadingPane emailId={null} />);

    expect(screen.getByTestId('reading-pane-placeholder')).toBeInTheDocument();
    expect(screen.getByText('ReadingPane_Placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('reading-pane-thread')).not.toBeInTheDocument();
  });
});
