/**
 * Unit tests for ThreadView component.
 *
 * Tests: thread load and display, mark as read on open, reply/forward
 * button behavior (now via openCompose context), delete from thread,
 * error state with back link, collapsible messages, inline reply box.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.3, 8.6
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
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
const mockParams: Record<string, string> = { messageId: 'msg-thread-1' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
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
import ThreadView from '../ThreadView';

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

function makeThreadEmail(
  id: string,
  isRead = false,
  subject = 'Thread Subject',
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
    cc: [
      {
        localPart: 'carol',
        domain: 'example.com',
        displayName: 'Carol',
        get address() {
          return `${this.localPart}@${this.domain}`;
        },
      },
    ],
    subject,
    date: new Date(dateStr),
    textBody: 'Hello from the thread',
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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ThreadView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockOpenCompose.mockClear();
  });

  /**
   * Requirement 6.1, 6.3: Thread load and display in chronological order
   * with collapsible messages — last message expanded, others collapsed.
   */
  it('fetches and displays thread emails in chronological order', async () => {
    const emails = [
      makeThreadEmail('msg-2', true, 'Re: Hello', '2024-06-16T10:00:00Z'),
      makeThreadEmail('msg-1', true, 'Hello', '2024-06-15T10:00:00Z'),
    ];
    mockedApi.getEmailThread.mockResolvedValue(emails);
    mockedApi.markAsRead.mockResolvedValue({} as any);

    await act(async () => {
      render(<ThreadView />);
    });

    expect(mockedApi.getEmailThread).toHaveBeenCalledWith('msg-thread-1');

    // Both messages rendered
    expect(screen.getByTestId('thread-message-msg-1')).toBeInTheDocument();
    expect(screen.getByTestId('thread-message-msg-2')).toBeInTheDocument();

    // Verify chronological order: msg-1 (earlier) should appear before msg-2
    const messages = screen
      .getByTestId('thread-view')
      .querySelectorAll('[data-testid^="thread-message-"]');
    expect(messages[0].getAttribute('data-testid')).toBe(
      'thread-message-msg-1',
    );
    expect(messages[1].getAttribute('data-testid')).toBe(
      'thread-message-msg-2',
    );

    // Verify sender name is visible in headers of both messages
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
    // Bob and Carol are in expanded content — only visible in the last (expanded) message
    expect(screen.getAllByText(/Bob/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Carol/).length).toBeGreaterThanOrEqual(1);
  });

  /**
   * Requirement 6.1, 6.3, 8.6: Collapse state and aria-expanded
   */
  it('renders last message expanded and earlier messages collapsed with aria-expanded', async () => {
    const emails = [
      makeThreadEmail('msg-1', true, 'Hello', '2024-06-15T10:00:00Z'),
      makeThreadEmail('msg-2', true, 'Re: Hello', '2024-06-16T10:00:00Z'),
    ];
    mockedApi.getEmailThread.mockResolvedValue(emails);
    mockedApi.markAsRead.mockResolvedValue({} as any);

    await act(async () => {
      render(<ThreadView />);
    });

    // msg-1 (earlier) should be collapsed
    const msg1 = screen.getByTestId('thread-message-msg-1');
    expect(msg1.getAttribute('aria-expanded')).toBe('false');

    // msg-2 (most recent) should be expanded
    const msg2 = screen.getByTestId('thread-message-msg-2');
    expect(msg2.getAttribute('aria-expanded')).toBe('true');
  });

  /**
   * Requirement 6.2: Click collapsed message to expand it
   */
  it('expands a collapsed message when its header is clicked', async () => {
    const emails = [
      makeThreadEmail('msg-1', true, 'Hello', '2024-06-15T10:00:00Z'),
      makeThreadEmail('msg-2', true, 'Re: Hello', '2024-06-16T10:00:00Z'),
    ];
    mockedApi.getEmailThread.mockResolvedValue(emails);
    mockedApi.markAsRead.mockResolvedValue({} as any);

    await act(async () => {
      render(<ThreadView />);
    });

    // msg-1 starts collapsed
    const msg1 = screen.getByTestId('thread-message-msg-1');
    expect(msg1.getAttribute('aria-expanded')).toBe('false');

    // Click the header to expand
    await act(async () => {
      fireEvent.click(screen.getByTestId('thread-header-msg-1'));
    });

    expect(msg1.getAttribute('aria-expanded')).toBe('true');
  });

  /**
   * Requirement 5.3: Auto mark-as-read on open
   */
  it('calls markAsRead for unread emails in the thread', async () => {
    const emails = [
      makeThreadEmail('msg-unread-1', false),
      makeThreadEmail('msg-read-1', true),
    ];
    mockedApi.getEmailThread.mockResolvedValue(emails);
    mockedApi.markAsRead.mockResolvedValue({} as any);

    await act(async () => {
      render(<ThreadView />);
    });

    // markAsRead should be called for the unread email only
    expect(mockedApi.markAsRead).toHaveBeenCalledWith('msg-unread-1');
    // The read email should NOT trigger markAsRead
    expect(mockedApi.markAsRead).not.toHaveBeenCalledWith('msg-read-1');
  });

  /**
   * Requirement 5.6: Delete from thread
   */
  it('deletes an email from the thread after confirmation', async () => {
    const emails = [
      makeThreadEmail('msg-del-1', true, 'Hello', '2024-06-15T10:00:00Z'),
      makeThreadEmail('msg-del-2', true, 'Re: Hello', '2024-06-16T10:00:00Z'),
    ];
    mockedApi.getEmailThread.mockResolvedValue(emails);
    mockedApi.markAsRead.mockResolvedValue({} as any);
    mockedApi.deleteEmail.mockResolvedValue({} as any);

    await act(async () => {
      render(<ThreadView />);
    });

    // msg-del-2 is the most recent (expanded), click delete on it
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-btn-msg-del-2'));
    });

    // Confirm dialog should appear
    expect(screen.getByText('BrightMail_Delete_Confirm')).toBeInTheDocument();

    // Confirm deletion — click the contained variant (confirm button in dialog)
    const confirmButtons = screen.getAllByText('BrightMail_Action_Delete');
    const dialogConfirmBtn = confirmButtons.find(
      (btn) => btn.closest('.MuiDialogActions-root') !== null,
    );
    await act(async () => {
      fireEvent.click(dialogConfirmBtn!);
    });

    expect(mockedApi.deleteEmail).toHaveBeenCalledWith('msg-del-2');

    // Email removed from view
    await waitFor(() => {
      expect(
        screen.queryByTestId('thread-message-msg-del-2'),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('thread-message-msg-del-1')).toBeInTheDocument();
  });

  /**
   * Requirement 5.7: Error state with back-to-inbox link
   */
  it('displays error state with back-to-inbox link on fetch failure', async () => {
    mockedApi.getEmailThread.mockRejectedValue(new Error('Thread not found'));

    await act(async () => {
      render(<ThreadView />);
    });

    expect(screen.getByTestId('thread-error')).toBeInTheDocument();
    expect(screen.getByText('BrightMail_Thread_Error')).toBeInTheDocument();

    const backLink = screen.getByTestId('back-to-inbox');
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/brightmail');
  });

  /**
   * Requirement 6.6: Reply button calls openCompose with reply prefill
   */
  it('calls openCompose with reply prefill when reply button is clicked', async () => {
    const emails = [makeThreadEmail('msg-reply-1', true, 'Hello')];
    mockedApi.getEmailThread.mockResolvedValue(emails);
    mockedApi.markAsRead.mockResolvedValue({} as any);

    await act(async () => {
      render(<ThreadView />);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('reply-btn-msg-reply-1'));
    });

    // openCompose should be called with reply prefill
    expect(mockOpenCompose).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'reply',
        to: ['alice@example.com'],
        subject: 'Re: Hello',
        inReplyTo: 'msg-reply-1',
      }),
    );
  });

  /**
   * Requirement 6.6: Forward button calls openCompose with forward prefill
   */
  it('calls openCompose with forward prefill when forward button is clicked', async () => {
    const emails = [makeThreadEmail('msg-fwd-1', true, 'Hello')];
    mockedApi.getEmailThread.mockResolvedValue(emails);
    mockedApi.markAsRead.mockResolvedValue({} as any);

    await act(async () => {
      render(<ThreadView />);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('forward-btn-msg-fwd-1'));
    });

    // openCompose should be called with forward prefill
    expect(mockOpenCompose).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'forward',
        to: [],
        subject: 'Fwd: Hello',
      }),
    );
  });

  /**
   * Requirement 6.5: Inline reply box below most recent message
   */
  it('displays inline reply box below the most recent message', async () => {
    const emails = [makeThreadEmail('msg-1', true, 'Hello')];
    mockedApi.getEmailThread.mockResolvedValue(emails);
    mockedApi.markAsRead.mockResolvedValue({} as any);

    await act(async () => {
      render(<ThreadView />);
    });

    expect(screen.getByTestId('inline-reply-box')).toBeInTheDocument();
    expect(screen.getByTestId('inline-reply-input')).toBeInTheDocument();
    expect(screen.getByTestId('inline-reply-send')).toBeInTheDocument();
  });

  /**
   * Loading state — skeleton loaders (Requirement 3.9, 7.4)
   */
  it('displays skeleton loaders while fetching thread', async () => {
    let resolveThread!: (value: any) => void;
    mockedApi.getEmailThread.mockReturnValue(
      new Promise((resolve) => {
        resolveThread = resolve;
      }),
    );

    await act(async () => {
      render(<ThreadView />);
    });

    expect(screen.getByTestId('thread-loading')).toBeInTheDocument();

    // Should render 3 skeleton message blocks
    expect(screen.getByTestId('thread-skeleton-0')).toBeInTheDocument();
    expect(screen.getByTestId('thread-skeleton-1')).toBeInTheDocument();
    expect(screen.getByTestId('thread-skeleton-2')).toBeInTheDocument();

    await act(async () => {
      resolveThread([]);
    });
  });

  /**
   * Requirement 6.4: Expanded messages show action toolbar with Tooltip labels
   */
  it('shows action toolbar with Reply, Forward, Delete on expanded messages', async () => {
    const emails = [makeThreadEmail('msg-1', true, 'Hello')];
    mockedApi.getEmailThread.mockResolvedValue(emails);
    mockedApi.markAsRead.mockResolvedValue({} as any);

    await act(async () => {
      render(<ThreadView />);
    });

    // Single message is the most recent, so it's expanded
    expect(screen.getByTestId('reply-btn-msg-1')).toBeInTheDocument();
    expect(screen.getByTestId('forward-btn-msg-1')).toBeInTheDocument();
    expect(screen.getByTestId('delete-btn-msg-1')).toBeInTheDocument();
  });

  /**
   * Requirement 6.3: Single-message thread renders expanded (no collapse)
   */
  it('renders a single-message thread fully expanded', async () => {
    const emails = [makeThreadEmail('msg-single', true, 'Solo Message')];
    mockedApi.getEmailThread.mockResolvedValue(emails);
    mockedApi.markAsRead.mockResolvedValue({} as any);

    await act(async () => {
      render(<ThreadView />);
    });

    const msg = screen.getByTestId('thread-message-msg-single');
    expect(msg.getAttribute('aria-expanded')).toBe('true');
  });
});
