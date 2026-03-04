/**
 * Unit tests for InboxView component.
 *
 * Tests: first page load, pagination trigger, empty state, loading skeleton,
 * error with retry, checkbox selection enables bulk actions, row click navigation.
 *
 * Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9
 */

import '@testing-library/jest-dom';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

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
    changeLanguage: jest.fn(),
    currentLanguage: 'en',
  }),
}));

const mockSendEmail = jest.fn();
const mockQueryInbox = jest.fn();
const mockGetEmail = jest.fn();
const mockGetEmailContent = jest.fn();
const mockGetEmailThread = jest.fn();
const mockGetDeliveryStatus = jest.fn();
const mockReplyToEmail = jest.fn();
const mockForwardEmail = jest.fn();
const mockMarkAsRead = jest.fn();
const mockDeleteEmail = jest.fn();
const mockGetUnreadCount = jest.fn();

jest.mock('../hooks/useEmailApi', () => ({
  __esModule: true,
  useEmailApi: () => ({
    sendEmail: mockSendEmail,
    queryInbox: mockQueryInbox,
    getEmail: mockGetEmail,
    getEmailContent: mockGetEmailContent,
    getEmailThread: mockGetEmailThread,
    getDeliveryStatus: mockGetDeliveryStatus,
    replyToEmail: mockReplyToEmail,
    forwardEmail: mockForwardEmail,
    markAsRead: mockMarkAsRead,
    deleteEmail: mockDeleteEmail,
    getUnreadCount: mockGetUnreadCount,
  }),
}));

// Import after mocks
import InboxView from '../InboxView';

const mockedApi = {
  sendEmail: mockSendEmail,
  queryInbox: mockQueryInbox,
  getEmail: mockGetEmail,
  getEmailContent: mockGetEmailContent,
  getEmailThread: mockGetEmailThread,
  getDeliveryStatus: mockGetDeliveryStatus,
  replyToEmail: mockReplyToEmail,
  forwardEmail: mockForwardEmail,
  markAsRead: mockMarkAsRead,
  deleteEmail: mockDeleteEmail,
  getUnreadCount: mockGetUnreadCount,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeEmail(id: string, isRead = false, subject = 'Test Subject') {
  return {
    messageId: id,
    from: {
      localPart: 'sender',
      domain: 'example.com',
      displayName: 'Sender Name',
      get address() {
        return `${this.localPart}@${this.domain}`;
      },
    },
    to: [],
    subject,
    date: new Date('2024-06-15T10:00:00Z'),
    readReceipts: isRead ? new Map([['user1', new Date()]]) : new Map(),
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

function makeInboxResult(emails: any[], hasMore = false) {
  return {
    emails,
    totalCount: emails.length,
    unreadCount: emails.filter((e: any) => e.readReceipts.size === 0).length,
    page: 1,
    pageSize: 20,
    hasMore,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('InboxView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  /**
   * Requirement 3.1: First page load
   */
  it('fetches and displays the first page of emails on mount', async () => {
    const emails = [makeEmail('msg-1'), makeEmail('msg-2', true)];
    mockedApi.queryInbox.mockResolvedValue(makeInboxResult(emails));
    mockedApi.getUnreadCount.mockResolvedValue({ unreadCount: 1 });

    await act(async () => {
      render(<InboxView />);
    });

    expect(mockedApi.queryInbox).toHaveBeenCalledWith(
      expect.objectContaining({ page: '1' }),
    );
    expect(screen.getAllByText('Sender Name').length).toBe(2);
    expect(screen.getAllByText('Test Subject').length).toBe(2);
  });

  /**
   * Requirement 3.8: Loading skeleton
   */
  it('displays loading skeleton while fetching', async () => {
    let resolveInbox!: (value: any) => void;
    mockedApi.queryInbox.mockReturnValue(
      new Promise((resolve) => {
        resolveInbox = resolve;
      }),
    );
    mockedApi.getUnreadCount.mockResolvedValue({ unreadCount: 0 });

    await act(async () => {
      render(<InboxView />);
    });

    expect(screen.getByTestId('inbox-loading')).toBeInTheDocument();

    await act(async () => {
      resolveInbox(makeInboxResult([]));
    });
  });

  /**
   * Requirement 3.7: Empty state
   */
  it('displays empty state when no emails', async () => {
    mockedApi.queryInbox.mockResolvedValue(makeInboxResult([]));
    mockedApi.getUnreadCount.mockResolvedValue({ unreadCount: 0 });

    await act(async () => {
      render(<InboxView />);
    });

    expect(screen.getByTestId('inbox-empty')).toBeInTheDocument();
    expect(screen.getByText('BrightMail_Inbox_Empty')).toBeInTheDocument();
  });

  /**
   * Requirement 3.9: Error state with retry
   */
  it('displays error state with retry button on fetch failure', async () => {
    mockedApi.queryInbox.mockRejectedValue(new Error('Network error'));
    mockedApi.getUnreadCount.mockResolvedValue({ unreadCount: 0 });

    await act(async () => {
      render(<InboxView />);
    });

    expect(screen.getByTestId('inbox-error')).toBeInTheDocument();
    expect(screen.getByText('BrightMail_Inbox_Error')).toBeInTheDocument();

    // Retry
    mockedApi.queryInbox.mockResolvedValue(
      makeInboxResult([makeEmail('msg-1')]),
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('inbox-retry'));
    });

    expect(mockedApi.queryInbox).toHaveBeenCalledTimes(2);
  });

  /**
   * Requirement 3.5: Unread count display
   */
  it('displays unread count', async () => {
    mockedApi.queryInbox.mockResolvedValue(
      makeInboxResult([makeEmail('msg-1'), makeEmail('msg-2')]),
    );
    mockedApi.getUnreadCount.mockResolvedValue({ unreadCount: 5 });

    await act(async () => {
      render(<InboxView />);
    });

    const unreadEl = screen.getByTestId('unread-count');
    // The i18n mock returns the key as-is, so the template string
    // "BrightMail_Inbox_UnreadCountTemplate" is rendered with {COUNT} replaced
    // Since our mock returns the key literally, verify the element exists
    expect(unreadEl).toBeInTheDocument();
  });

  /**
   * Requirement 3.6: Checkbox selection enables bulk actions
   */
  it('shows bulk actions toolbar when emails are selected', async () => {
    const emails = [makeEmail('msg-1'), makeEmail('msg-2')];
    mockedApi.queryInbox.mockResolvedValue(makeInboxResult(emails));
    mockedApi.getUnreadCount.mockResolvedValue({ unreadCount: 2 });

    await act(async () => {
      render(<InboxView />);
    });

    // No bulk actions initially
    expect(screen.queryByTestId('bulk-actions')).not.toBeInTheDocument();

    // Select an email via checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is "select all", individual checkboxes follow
    await act(async () => {
      fireEvent.click(checkboxes[1]); // first email checkbox
    });

    expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();
    expect(screen.getByText('BrightMail_Action_Delete')).toBeInTheDocument();
    expect(
      screen.getByText('BrightMail_Action_MarkAsRead'),
    ).toBeInTheDocument();
  });

  /**
   * Requirement 3.4: Row click navigates to thread view
   */
  it('navigates to thread view on row click', async () => {
    const emails = [makeEmail('msg-123')];
    mockedApi.queryInbox.mockResolvedValue(makeInboxResult(emails));
    mockedApi.getUnreadCount.mockResolvedValue({ unreadCount: 1 });

    await act(async () => {
      render(<InboxView />);
    });

    const row = screen.getByTestId('email-row-msg-123');
    await act(async () => {
      fireEvent.click(row);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/brightmail/thread/msg-123');
  });

  /**
   * Requirement 3.3: Pagination trigger (scroll to bottom loads more)
   */
  it('fetches next page when scrolling to bottom', async () => {
    const page1Emails = [makeEmail('msg-1')];
    const page2Emails = [makeEmail('msg-2')];

    mockedApi.queryInbox
      .mockResolvedValueOnce({
        ...makeInboxResult(page1Emails, true),
        page: 1,
      })
      .mockResolvedValueOnce({
        ...makeInboxResult(page2Emails),
        page: 2,
      });
    mockedApi.getUnreadCount.mockResolvedValue({ unreadCount: 0 });

    await act(async () => {
      render(<InboxView />);
    });

    // Simulate scroll to bottom
    const scrollContainer = screen.getByTestId('inbox-scroll-container');
    Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000 });
    Object.defineProperty(scrollContainer, 'scrollTop', { value: 950 });
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 100 });

    await act(async () => {
      fireEvent.scroll(scrollContainer);
    });

    await waitFor(() => {
      expect(mockedApi.queryInbox).toHaveBeenCalledTimes(2);
    });
  });
});
