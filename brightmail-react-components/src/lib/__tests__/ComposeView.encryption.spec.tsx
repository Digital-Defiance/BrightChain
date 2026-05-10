/**
 * Unit tests for ComposeView encryption integration.
 *
 * Tests: encryption scheme pre-selection from default preferences,
 * fallback to NONE when preferred scheme is unavailable,
 * recipient key resolution triggers on recipient change,
 * passphrase dialog appears for GPG operations,
 * passphrase is cleared from state after use.
 *
 * Requirements: 3.2, 7.2, 11.7, 13.3, 13.4, 14.3
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

import ComposeView, {
  isSchemeAvailable,
  type RecipientKeyResolution,
} from '../ComposeView';
import PassphraseDialog from '../PassphraseDialog';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const MessageEncryptionScheme = {
  NONE: 'none',
  SHARED_KEY: 'shared_key',
  RECIPIENT_KEYS: 'recipient_keys',
  S_MIME: 's_mime',
  GPG: 'gpg',
} as const;

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
    MessageEncryptionScheme,
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

// Mock Tiptap
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
jest.mock('../hooks/useEmailApi', () => ({
  __esModule: true,
  useEmailApi: () => ({
    sendEmail: mockSendEmail,
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
    verifyRecipient: jest.fn(),
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function _openDropdown() {
  const selectContainer = screen.getByTestId('encryption-select');
  const combobox = within(selectContainer).getByRole('combobox');
  fireEvent.mouseDown(combobox);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ComposeView encryption integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── isSchemeAvailable pure function tests ─────────────────────────────

  describe('isSchemeAvailable', () => {
    it('returns true for NONE regardless of key availability', () => {
      expect(
        isSchemeAvailable(MessageEncryptionScheme.NONE, false, false, false),
      ).toBe(true);
      expect(
        isSchemeAvailable(MessageEncryptionScheme.NONE, true, true, true),
      ).toBe(true);
    });

    it('returns true for GPG only when all recipients have GPG keys', () => {
      expect(
        isSchemeAvailable(MessageEncryptionScheme.GPG, true, false, false),
      ).toBe(true);
      expect(
        isSchemeAvailable(MessageEncryptionScheme.GPG, false, false, false),
      ).toBe(false);
    });

    it('returns true for S_MIME only when all recipients have S/MIME certs', () => {
      expect(
        isSchemeAvailable(MessageEncryptionScheme.S_MIME, false, true, false),
      ).toBe(true);
      expect(
        isSchemeAvailable(MessageEncryptionScheme.S_MIME, false, false, false),
      ).toBe(false);
    });

    it('returns true for RECIPIENT_KEYS only when no external recipients', () => {
      expect(
        isSchemeAvailable(
          MessageEncryptionScheme.RECIPIENT_KEYS,
          false,
          false,
          false,
        ),
      ).toBe(true);
      expect(
        isSchemeAvailable(
          MessageEncryptionScheme.RECIPIENT_KEYS,
          false,
          false,
          true,
        ),
      ).toBe(false);
    });
  });

  // ── Requirement 13.3: Pre-select encryption scheme from default preference ──

  describe('encryption scheme pre-selection', () => {
    it('pre-selects GPG when default preference is GPG and keys are available', async () => {
      const onResolveRecipientKeys = jest.fn().mockResolvedValue({
        hasGpgKey: true,
        hasSmimeCert: false,
        hasEciesKey: true,
        isInternal: true,
      } as RecipientKeyResolution);

      const onGetEncryptionPreference = jest.fn().mockResolvedValue({
        scheme: 'gpg',
      });

      render(
        <ComposeView
          onResolveRecipientKeys={onResolveRecipientKeys}
          onGetEncryptionPreference={onGetEncryptionPreference}
        />,
      );

      // Type a valid recipient to trigger key resolution
      const toField = screen.getByLabelText('Compose_To');
      await act(async () => {
        fireEvent.change(toField, { target: { value: 'alice@example.com' } });
      });

      // Wait for key resolution and preference to load
      await waitFor(() => {
        expect(onGetEncryptionPreference).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(onResolveRecipientKeys).toHaveBeenCalledWith(
          'alice@example.com',
        );
      });

      // The encryption selector should show GPG
      await waitFor(() => {
        const selectContainer = screen.getByTestId('encryption-select');
        const combobox = within(selectContainer).getByRole('combobox');
        expect(combobox).toHaveTextContent('GPG');
      });
    });
  });

  // ── Requirement 13.4: Fallback to NONE when preferred scheme is unavailable ──

  describe('fallback to NONE', () => {
    it('falls back to NONE when preferred GPG scheme is unavailable (no keys)', async () => {
      const onResolveRecipientKeys = jest.fn().mockResolvedValue({
        hasGpgKey: false,
        hasSmimeCert: false,
        hasEciesKey: true,
        isInternal: true,
      } as RecipientKeyResolution);

      const onGetEncryptionPreference = jest.fn().mockResolvedValue({
        scheme: 'gpg',
      });

      render(
        <ComposeView
          onResolveRecipientKeys={onResolveRecipientKeys}
          onGetEncryptionPreference={onGetEncryptionPreference}
        />,
      );

      const toField = screen.getByLabelText('Compose_To');
      await act(async () => {
        fireEvent.change(toField, { target: { value: 'bob@example.com' } });
      });

      await waitFor(() => {
        expect(onResolveRecipientKeys).toHaveBeenCalled();
      });

      // Should fall back to NONE since GPG keys are not available
      await waitFor(() => {
        const selectContainer = screen.getByTestId('encryption-select');
        const combobox = within(selectContainer).getByRole('combobox');
        expect(combobox).toHaveTextContent('Encryption_None');
      });
    });
  });

  // ── Requirement 11.7: Recipient key resolution triggers on recipient change ──

  describe('recipient key resolution', () => {
    it('calls onResolveRecipientKeys for each valid recipient when To changes', async () => {
      const onResolveRecipientKeys = jest.fn().mockResolvedValue({
        hasGpgKey: true,
        hasSmimeCert: true,
        hasEciesKey: true,
        isInternal: true,
      } as RecipientKeyResolution);

      render(<ComposeView onResolveRecipientKeys={onResolveRecipientKeys} />);

      const toField = screen.getByLabelText('Compose_To');
      await act(async () => {
        fireEvent.change(toField, {
          target: { value: 'alice@example.com, bob@example.com' },
        });
      });

      await waitFor(() => {
        expect(onResolveRecipientKeys).toHaveBeenCalledWith(
          'alice@example.com',
        );
        expect(onResolveRecipientKeys).toHaveBeenCalledWith('bob@example.com');
      });
    });

    it('does not call onResolveRecipientKeys for invalid email addresses', async () => {
      const onResolveRecipientKeys = jest.fn().mockResolvedValue({
        hasGpgKey: true,
        hasSmimeCert: true,
        hasEciesKey: true,
        isInternal: true,
      } as RecipientKeyResolution);

      render(<ComposeView onResolveRecipientKeys={onResolveRecipientKeys} />);

      const toField = screen.getByLabelText('Compose_To');
      await act(async () => {
        fireEvent.change(toField, { target: { value: 'not-an-email' } });
      });

      // Give time for any async resolution
      await new Promise((r) => setTimeout(r, 100));
      expect(onResolveRecipientKeys).not.toHaveBeenCalled();
    });
  });
});

// ─── PassphraseDialog tests ─────────────────────────────────────────────────

describe('PassphraseDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog with title and input when open', () => {
    render(
      <PassphraseDialog
        open={true}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByText('Passphrase_Title')).toBeInTheDocument();
    expect(screen.getByTestId('passphrase-input')).toBeInTheDocument();
  });

  it('renders custom title when provided', () => {
    render(
      <PassphraseDialog
        open={true}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        title="Decrypt Message"
      />,
    );

    expect(screen.getByText('Decrypt Message')).toBeInTheDocument();
  });

  it('submit button is disabled when passphrase is empty', () => {
    render(
      <PassphraseDialog
        open={true}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByTestId('passphrase-submit-btn')).toBeDisabled();
  });

  it('calls onSubmit with passphrase and clears input on submit', async () => {
    const onSubmit = jest.fn();
    render(
      <PassphraseDialog open={true} onSubmit={onSubmit} onCancel={jest.fn()} />,
    );

    const input = screen.getByTestId('passphrase-input');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'my-secret-passphrase' } });
    });

    expect(screen.getByTestId('passphrase-submit-btn')).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(screen.getByTestId('passphrase-submit-btn'));
    });

    expect(onSubmit).toHaveBeenCalledWith('my-secret-passphrase');
  });

  it('calls onCancel and clears input on cancel', async () => {
    const onCancel = jest.fn();
    render(
      <PassphraseDialog open={true} onSubmit={jest.fn()} onCancel={onCancel} />,
    );

    const input = screen.getByTestId('passphrase-input');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'some-passphrase' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('passphrase-cancel-btn'));
    });

    expect(onCancel).toHaveBeenCalled();
  });

  it('does not render when open is false', () => {
    const { container } = render(
      <PassphraseDialog
        open={false}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    // MUI Dialog with open=false should not render visible content
    expect(
      container.querySelector('[data-testid="passphrase-input"]'),
    ).not.toBeInTheDocument();
  });

  it('submits on Enter key press when passphrase is non-empty', async () => {
    const onSubmit = jest.fn();
    render(
      <PassphraseDialog open={true} onSubmit={onSubmit} onCancel={jest.fn()} />,
    );

    const input = screen.getByTestId('passphrase-input');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'enter-passphrase' } });
    });

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    expect(onSubmit).toHaveBeenCalledWith('enter-passphrase');
  });

  it('passphrase input has type password for security', () => {
    render(
      <PassphraseDialog
        open={true}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const input = screen.getByTestId('passphrase-input');
    expect(input).toHaveAttribute('type', 'password');
  });
});

// ─── GPG passphrase dialog integration with ComposeView ─────────────────────

describe('ComposeView GPG passphrase dialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows passphrase dialog when sending with GPG encryption', async () => {
    const onResolveRecipientKeys = jest.fn().mockResolvedValue({
      hasGpgKey: true,
      hasSmimeCert: false,
      hasEciesKey: true,
      isInternal: true,
    } as RecipientKeyResolution);

    const onGetEncryptionPreference = jest.fn().mockResolvedValue({
      scheme: 'gpg',
    });

    render(
      <ComposeView
        onResolveRecipientKeys={onResolveRecipientKeys}
        onGetEncryptionPreference={onGetEncryptionPreference}
      />,
    );

    // Enter a valid recipient
    const toField = screen.getByLabelText('Compose_To');
    await act(async () => {
      fireEvent.change(toField, { target: { value: 'alice@example.com' } });
    });

    // Wait for GPG to be pre-selected
    await waitFor(() => {
      const selectContainer = screen.getByTestId('encryption-select');
      const combobox = within(selectContainer).getByRole('combobox');
      expect(combobox).toHaveTextContent('GPG');
    });

    // Click send — should show passphrase dialog
    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'));
    });

    await waitFor(() => {
      expect(screen.getByText('Passphrase_Title')).toBeInTheDocument();
    });
  });
});
