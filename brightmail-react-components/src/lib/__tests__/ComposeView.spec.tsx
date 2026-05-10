/**
 * Unit tests for ComposeView component.
 *
 * Tests: form fields present with labels, send success closes form,
 * send failure retains data, attachment display, reply/forward pre-fill.
 *
 * Requirements: 4.1, 4.4, 4.5, 4.6, 5.4, 5.5, 12.3
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

// Import after mocks
import ComposeView from '../ComposeView';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
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
    getBrightChainI18nEngine: () => mockEngine,
    registerI18nComponentPackage: jest.fn(),
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
}));

// Mock Tiptap to avoid JSDOM issues with the editor
jest.mock('@tiptap/react', () => ({
  useEditor: () => null,
  EditorContent: ({ editor: _editor }: any) => (
    <div data-testid="tiptap-editor-content">editor content</div>
  ),
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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ComposeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Requirement 4.1: Form fields present with labels
   * Requirement 12.3: All form fields have visible labels
   */
  it('renders all form fields with labels', async () => {
    render(<ComposeView />);

    expect(screen.getByLabelText('Compose_To')).toBeInTheDocument();
    expect(screen.getByLabelText('Compose_Cc')).toBeInTheDocument();
    expect(screen.getByLabelText('Compose_Bcc')).toBeInTheDocument();
    expect(screen.getByLabelText('Compose_Subject')).toBeInTheDocument();
    // Body is now a RichTextEditor (falls back to TextField in test env after timeout)
    await waitFor(() => {
      expect(screen.getByTestId('rich-text-fallback')).toBeInTheDocument();
    });
    expect(screen.getByTestId('send-button')).toBeInTheDocument();
  });

  /**
   * Requirement 4.2: Send button disabled without valid recipient
   */
  it('send button is disabled when To field has no valid email', () => {
    render(<ComposeView />);

    const sendButton = screen.getByTestId('send-button');
    expect(sendButton).toBeDisabled();
  });

  /**
   * Requirement 4.2: Send button enabled with valid recipient
   */
  it('send button is enabled when To field has a valid email', () => {
    render(<ComposeView />);

    const toField = screen.getByLabelText('Compose_To');
    fireEvent.change(toField, { target: { value: 'user@example.com' } });

    const sendButton = screen.getByTestId('send-button');
    expect(sendButton).not.toBeDisabled();
  });

  /**
   * Requirement 4.4: Send success closes form
   */
  it('calls onClose after successful send', async () => {
    const onClose = jest.fn();
    mockedApi.sendEmail.mockResolvedValue({} as any);

    render(<ComposeView onClose={onClose} />);

    const toField = screen.getByLabelText('Compose_To');
    fireEvent.change(toField, { target: { value: 'user@example.com' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'));
    });

    // Success snackbar should appear
    await waitFor(() => {
      expect(screen.getByText('Compose_SendSuccess')).toBeInTheDocument();
    });

    // onClose called after timeout (ComposeView delays 4500ms so the success
    // snackbar can render to completion)
    await waitFor(
      () => {
        expect(onClose).toHaveBeenCalled();
      },
      { timeout: 6000 },
    );
  }, 10000);

  /**
   * Requirement 4.5: Send failure retains form data
   */
  it('retains form data and shows error on send failure', async () => {
    mockedApi.sendEmail.mockRejectedValue(new Error('Network error'));

    render(<ComposeView />);

    const toField = screen.getByLabelText('Compose_To');
    const subjectField = screen.getByLabelText('Compose_Subject');

    fireEvent.change(toField, { target: { value: 'user@example.com' } });
    fireEvent.change(subjectField, { target: { value: 'Test Subject' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'));
    });

    // Error snackbar should appear
    await waitFor(() => {
      expect(screen.getByText('Compose_SendError')).toBeInTheDocument();
    });

    // Form data retained
    expect(toField).toHaveValue('user@example.com');
    expect(subjectField).toHaveValue('Test Subject');
  });

  /**
   * Requirement 5.4: Reply pre-fill
   */
  it('pre-fills form for reply with original sender, Re: subject, quoted body', async () => {
    const replyTo = {
      from: {
        localPart: 'alice',
        domain: 'example.com',
        get address() {
          return `${this.localPart}@${this.domain}`;
        },
      } as any,
      subject: 'Hello',
      textBody: 'Original message',
    };

    render(<ComposeView replyTo={replyTo} />);

    const toField = screen.getByLabelText('Compose_To');
    const subjectField = screen.getByLabelText('Compose_Subject');

    expect(toField).toHaveValue('alice@example.com');
    expect(subjectField).toHaveValue('Re: Hello');

    // Wait for RichTextEditor fallback to render
    await waitFor(() => {
      expect(screen.getByTestId('rich-text-fallback')).toBeInTheDocument();
    });
    const bodyField = screen
      .getByTestId('rich-text-fallback')
      .querySelector('textarea');
    expect(bodyField?.value).toContain('> Original message');
  });

  /**
   * Requirement 5.5: Forward pre-fill
   */
  it('pre-fills form for forward with Fwd: subject, empty To, quoted body', async () => {
    const forwardFrom = {
      subject: 'Hello',
      textBody: 'Original message',
    };

    render(<ComposeView forwardFrom={forwardFrom} />);

    const toField = screen.getByLabelText('Compose_To');
    const subjectField = screen.getByLabelText('Compose_Subject');

    expect(toField).toHaveValue('');
    expect(subjectField).toHaveValue('Fwd: Hello');

    // Wait for RichTextEditor fallback to render
    await waitFor(() => {
      expect(screen.getByTestId('rich-text-fallback')).toBeInTheDocument();
    });
    const fwdBodyField = screen
      .getByTestId('rich-text-fallback')
      .querySelector('textarea');
    expect(fwdBodyField?.value).toContain('> Original message');
  });

  /**
   * Requirement 4.7: Validation message uses i18n
   */
  it('shows validation message when To has invalid input', () => {
    render(<ComposeView />);

    const toField = screen.getByLabelText('Compose_To');
    fireEvent.change(toField, { target: { value: 'not-an-email' } });

    expect(screen.getByText('Compose_InvalidRecipient')).toBeInTheDocument();
  });

  /**
   * Requirement 12.3: Cancel button present when onClose provided
   */
  it('shows cancel button when onClose is provided', () => {
    const onClose = jest.fn();
    render(<ComposeView onClose={onClose} />);

    const cancelButton = screen.getByTestId('cancel-button');
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });
});
