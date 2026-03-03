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
import ComposeView from '../ComposeView';

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
  it('renders all form fields with labels', () => {
    render(<ComposeView />);

    expect(screen.getByLabelText('BrightMail_Compose_To')).toBeInTheDocument();
    expect(screen.getByLabelText('BrightMail_Compose_Cc')).toBeInTheDocument();
    expect(screen.getByLabelText('BrightMail_Compose_Bcc')).toBeInTheDocument();
    expect(screen.getByLabelText('BrightMail_Compose_Subject')).toBeInTheDocument();
    expect(screen.getByLabelText('BrightMail_Compose_Body')).toBeInTheDocument();
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

    const toField = screen.getByLabelText('BrightMail_Compose_To');
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

    const toField = screen.getByLabelText('BrightMail_Compose_To');
    fireEvent.change(toField, { target: { value: 'user@example.com' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'));
    });

    // Success snackbar should appear
    await waitFor(() => {
      expect(
        screen.getByText('BrightMail_Compose_SendSuccess'),
      ).toBeInTheDocument();
    });

    // onClose called after timeout
    await waitFor(
      () => {
        expect(onClose).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  /**
   * Requirement 4.5: Send failure retains form data
   */
  it('retains form data and shows error on send failure', async () => {
    mockedApi.sendEmail.mockRejectedValue(new Error('Network error'));

    render(<ComposeView />);

    const toField = screen.getByLabelText('BrightMail_Compose_To');
    const subjectField = screen.getByLabelText(
      'BrightMail_Compose_Subject',
    );

    fireEvent.change(toField, { target: { value: 'user@example.com' } });
    fireEvent.change(subjectField, { target: { value: 'Test Subject' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'));
    });

    // Error snackbar should appear
    await waitFor(() => {
      expect(
        screen.getByText('BrightMail_Compose_SendError'),
      ).toBeInTheDocument();
    });

    // Form data retained
    expect(toField).toHaveValue('user@example.com');
    expect(subjectField).toHaveValue('Test Subject');
  });

  /**
   * Requirement 5.4: Reply pre-fill
   */
  it('pre-fills form for reply with original sender, Re: subject, quoted body', () => {
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

    const toField = screen.getByLabelText('BrightMail_Compose_To');
    const subjectField = screen.getByLabelText(
      'BrightMail_Compose_Subject',
    );
    const bodyField = screen.getByLabelText('BrightMail_Compose_Body');

    expect(toField).toHaveValue('alice@example.com');
    expect(subjectField).toHaveValue('Re: Hello');
    const bodyValue = (bodyField as HTMLTextAreaElement).value;
    expect(bodyValue).toContain('> Original message');
  });

  /**
   * Requirement 5.5: Forward pre-fill
   */
  it('pre-fills form for forward with Fwd: subject, empty To, quoted body', () => {
    const forwardFrom = {
      subject: 'Hello',
      textBody: 'Original message',
    };

    render(<ComposeView forwardFrom={forwardFrom} />);

    const toField = screen.getByLabelText('BrightMail_Compose_To');
    const subjectField = screen.getByLabelText(
      'BrightMail_Compose_Subject',
    );
    const bodyField = screen.getByLabelText('BrightMail_Compose_Body');

    expect(toField).toHaveValue('');
    expect(subjectField).toHaveValue('Fwd: Hello');
    const bodyValue = (bodyField as HTMLTextAreaElement).value;
    expect(bodyValue).toContain('> Original message');
  });

  /**
   * Requirement 4.7: Validation message uses i18n
   */
  it('shows validation message when To has invalid input', () => {
    render(<ComposeView />);

    const toField = screen.getByLabelText('BrightMail_Compose_To');
    fireEvent.change(toField, { target: { value: 'not-an-email' } });

    expect(
      screen.getByText('BrightMail_Compose_InvalidRecipient'),
    ).toBeInTheDocument();
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
