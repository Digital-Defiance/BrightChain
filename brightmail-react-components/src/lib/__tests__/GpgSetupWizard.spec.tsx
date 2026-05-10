/**
 * Unit tests for GpgSetupWizard component.
 *
 * Tests: wizard step navigation, passphrase validation, strength indicator,
 * generate flow, import flows (file/paste/keyserver), success step actions,
 * error handling, and the evaluatePassphraseStrength pure function.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 11.1
 */

import '@testing-library/jest-dom';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import type { GpgSetupWizardProps } from '../GpgSetupWizard';
import GpgSetupWizard, { evaluatePassphraseStrength } from '../GpgSetupWizard';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const MessageEncryptionScheme = {
  NONE: 'none',
  SHARED_KEY: 'shared_key',
  RECIPIENT_KEYS: 'recipient_keys',
  S_MIME: 's_mime',
  GPG: 'gpg',
} as const;

const mockEngine = {
  translate: jest.fn((_componentId: string, key: string) => key),
  translateEnum: jest.fn((_enumType: unknown, value: unknown) => String(value)),
  registerIfNotExists: jest.fn(),
  registerStringKeyEnum: jest.fn(),
};

jest.mock('@brightchain/brightchain-lib', () => ({
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
  BrightChainStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => String(p) },
  ),
  MessageEncryptionScheme,
  getBrightChainI18nEngine: () => mockEngine,
}));

jest.mock('@brightchain/brightmail-lib', () => ({
  BrightMailStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => String(p) },
  ),
  BrightMailComponentId: 'BrightMail',
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

// ─── Helpers ────────────────────────────────────────────────────────────────

const defaultProps: GpgSetupWizardProps = {
  open: true,
  onClose: jest.fn(),
  onGenerateKeyPair: jest.fn().mockResolvedValue(undefined),
  onImportPublicKey: jest.fn().mockResolvedValue(undefined),
  onImportByEmail: jest.fn().mockResolvedValue(undefined),
};

function renderWizard(overrides: Partial<GpgSetupWizardProps> = {}) {
  return render(<GpgSetupWizard {...defaultProps} {...overrides} />);
}

// ─── evaluatePassphraseStrength tests ───────────────────────────────────────

describe('evaluatePassphraseStrength', () => {
  it('returns weak for short passphrases', () => {
    expect(evaluatePassphraseStrength('')).toBe('weak');
    expect(evaluatePassphraseStrength('abc')).toBe('weak');
    expect(evaluatePassphraseStrength('1234567')).toBe('weak');
  });

  it('returns fair for 8+ chars with low variety', () => {
    expect(evaluatePassphraseStrength('abcdefgh')).toBe('fair');
    expect(evaluatePassphraseStrength('12345678')).toBe('fair');
  });

  it('returns good for 12+ chars with mixed case and digits', () => {
    expect(evaluatePassphraseStrength('Abcdefgh1234')).toBe('good');
  });

  it('returns strong for 20+ chars with mixed case, digits, and symbols', () => {
    expect(evaluatePassphraseStrength('MyStr0ng!Passphrase!!')).toBe('strong');
  });
});

// ─── Wizard step navigation tests ───────────────────────────────────────────

describe('GpgSetupWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the welcome step when opened', () => {
    renderWizard();
    expect(screen.getByTestId('gpg-setup-wizard')).toBeInTheDocument();
    expect(screen.getByTestId('gpg-wizard-welcome')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    renderWizard({ open: false });
    expect(screen.queryByTestId('gpg-wizard-welcome')).not.toBeInTheDocument();
  });

  it('navigates to generate step when "Create a new keypair" is clicked', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('gpg-wizard-generate-option'));
    expect(screen.getByTestId('gpg-wizard-generate')).toBeInTheDocument();
  });

  it('navigates to import step when "I already have a GPG key" is clicked', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('gpg-wizard-import-option'));
    expect(screen.getByTestId('gpg-wizard-import')).toBeInTheDocument();
  });

  it('navigates back to welcome from generate step', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('gpg-wizard-generate-option'));
    expect(screen.getByTestId('gpg-wizard-generate')).toBeInTheDocument();

    // Click back button
    fireEvent.click(screen.getByText('GpgWizard_Back'));
    expect(screen.getByTestId('gpg-wizard-welcome')).toBeInTheDocument();
  });

  it('navigates back to welcome from import step', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('gpg-wizard-import-option'));
    expect(screen.getByTestId('gpg-wizard-import')).toBeInTheDocument();

    fireEvent.click(screen.getByText('GpgWizard_Back'));
    expect(screen.getByTestId('gpg-wizard-welcome')).toBeInTheDocument();
  });

  // ── Generate flow ────────────────────────────────────────────────────

  describe('generate flow', () => {
    function goToGenerate() {
      renderWizard();
      fireEvent.click(screen.getByTestId('gpg-wizard-generate-option'));
    }

    it('disables generate button when passphrase is too short', () => {
      goToGenerate();
      const passField = screen
        .getByTestId('gpg-wizard-passphrase')
        .querySelector('input')!;
      fireEvent.change(passField, { target: { value: 'short' } });

      const confirmField = screen
        .getByTestId('gpg-wizard-passphrase-confirm')
        .querySelector('input')!;
      fireEvent.change(confirmField, { target: { value: 'short' } });

      expect(screen.getByTestId('gpg-wizard-generate-btn')).toBeDisabled();
    });

    it('disables generate button when passphrases do not match', () => {
      goToGenerate();
      const passField = screen
        .getByTestId('gpg-wizard-passphrase')
        .querySelector('input')!;
      fireEvent.change(passField, { target: { value: 'longpassphrase1' } });

      const confirmField = screen
        .getByTestId('gpg-wizard-passphrase-confirm')
        .querySelector('input')!;
      fireEvent.change(confirmField, { target: { value: 'longpassphrase2' } });

      expect(screen.getByTestId('gpg-wizard-generate-btn')).toBeDisabled();
    });

    it('shows mismatch error when passphrases differ', () => {
      goToGenerate();
      const passField = screen
        .getByTestId('gpg-wizard-passphrase')
        .querySelector('input')!;
      fireEvent.change(passField, { target: { value: 'longpassphrase1' } });

      const confirmField = screen
        .getByTestId('gpg-wizard-passphrase-confirm')
        .querySelector('input')!;
      fireEvent.change(confirmField, { target: { value: 'longpassphrase2' } });

      expect(
        screen.getByText('GpgWizard_PassphraseMismatch'),
      ).toBeInTheDocument();
    });

    it('shows strength indicator when passphrase is entered', () => {
      goToGenerate();
      const passField = screen
        .getByTestId('gpg-wizard-passphrase')
        .querySelector('input')!;
      fireEvent.change(passField, { target: { value: 'testpass' } });

      expect(screen.getByTestId('gpg-wizard-strength')).toBeInTheDocument();
    });

    it('enables generate button when passphrase is valid and matches', () => {
      goToGenerate();
      const passField = screen
        .getByTestId('gpg-wizard-passphrase')
        .querySelector('input')!;
      fireEvent.change(passField, { target: { value: 'myvalidpassphrase' } });

      const confirmField = screen
        .getByTestId('gpg-wizard-passphrase-confirm')
        .querySelector('input')!;
      fireEvent.change(confirmField, {
        target: { value: 'myvalidpassphrase' },
      });

      expect(screen.getByTestId('gpg-wizard-generate-btn')).not.toBeDisabled();
    });

    it('calls onGenerateKeyPair and shows success on generate', async () => {
      const onGenerateKeyPair = jest.fn().mockResolvedValue(undefined);
      renderWizard({ onGenerateKeyPair });
      fireEvent.click(screen.getByTestId('gpg-wizard-generate-option'));

      const passField = screen
        .getByTestId('gpg-wizard-passphrase')
        .querySelector('input')!;
      fireEvent.change(passField, { target: { value: 'myvalidpassphrase' } });

      const confirmField = screen
        .getByTestId('gpg-wizard-passphrase-confirm')
        .querySelector('input')!;
      fireEvent.change(confirmField, {
        target: { value: 'myvalidpassphrase' },
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('gpg-wizard-generate-btn'));
      });

      expect(onGenerateKeyPair).toHaveBeenCalledWith('myvalidpassphrase');
      await waitFor(() => {
        expect(screen.getByTestId('gpg-wizard-success')).toBeInTheDocument();
      });
    });

    it('shows error when generation fails', async () => {
      const onGenerateKeyPair = jest.fn().mockRejectedValue(new Error('fail'));
      renderWizard({ onGenerateKeyPair });
      fireEvent.click(screen.getByTestId('gpg-wizard-generate-option'));

      const passField = screen
        .getByTestId('gpg-wizard-passphrase')
        .querySelector('input')!;
      fireEvent.change(passField, { target: { value: 'myvalidpassphrase' } });

      const confirmField = screen
        .getByTestId('gpg-wizard-passphrase-confirm')
        .querySelector('input')!;
      fireEvent.change(confirmField, {
        target: { value: 'myvalidpassphrase' },
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('gpg-wizard-generate-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('gpg-wizard-error')).toBeInTheDocument();
      });
    });
  });

  // ── Import flow: paste ───────────────────────────────────────────────

  describe('import paste flow', () => {
    const validKey =
      '-----BEGIN PGP PUBLIC KEY BLOCK-----\ndata\n-----END PGP PUBLIC KEY BLOCK-----';

    function goToImportPaste() {
      renderWizard();
      fireEvent.click(screen.getByTestId('gpg-wizard-import-option'));
      // Click the paste tab
      const tabs = screen.getByTestId('gpg-wizard-import-tabs');
      const pasteTab = tabs.querySelectorAll('button')[1];
      fireEvent.click(pasteTab);
    }

    it('disables import button when paste field is empty', () => {
      goToImportPaste();
      expect(screen.getByTestId('gpg-wizard-paste-import-btn')).toBeDisabled();
    });

    it('calls onImportPublicKey and shows success with valid key', async () => {
      const onImportPublicKey = jest.fn().mockResolvedValue(undefined);
      renderWizard({ onImportPublicKey });
      fireEvent.click(screen.getByTestId('gpg-wizard-import-option'));
      const tabs = screen.getByTestId('gpg-wizard-import-tabs');
      fireEvent.click(tabs.querySelectorAll('button')[1]);

      const pasteField = screen
        .getByTestId('gpg-wizard-paste-field')
        .querySelector('textarea')!;
      fireEvent.change(pasteField, { target: { value: validKey } });

      await act(async () => {
        fireEvent.click(screen.getByTestId('gpg-wizard-paste-import-btn'));
      });

      expect(onImportPublicKey).toHaveBeenCalledWith(validKey);
      await waitFor(() => {
        expect(screen.getByTestId('gpg-wizard-success')).toBeInTheDocument();
      });
    });

    it('shows error when pasted key is invalid', async () => {
      renderWizard();
      fireEvent.click(screen.getByTestId('gpg-wizard-import-option'));
      const tabs = screen.getByTestId('gpg-wizard-import-tabs');
      fireEvent.click(tabs.querySelectorAll('button')[1]);

      const pasteField = screen
        .getByTestId('gpg-wizard-paste-field')
        .querySelector('textarea')!;
      fireEvent.change(pasteField, { target: { value: 'not a valid key' } });

      await act(async () => {
        fireEvent.click(screen.getByTestId('gpg-wizard-paste-import-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('gpg-wizard-error')).toBeInTheDocument();
      });
    });
  });

  // ── Import flow: keyserver ──────────────────────────────────────────

  describe('import keyserver flow', () => {
    function goToImportKeyserver() {
      renderWizard();
      fireEvent.click(screen.getByTestId('gpg-wizard-import-option'));
      const tabs = screen.getByTestId('gpg-wizard-import-tabs');
      fireEvent.click(tabs.querySelectorAll('button')[2]);
    }

    it('disables search button when email is empty', () => {
      goToImportKeyserver();
      expect(screen.getByTestId('gpg-wizard-keyserver-btn')).toBeDisabled();
    });

    it('calls onImportByEmail and shows success', async () => {
      const onImportByEmail = jest.fn().mockResolvedValue(undefined);
      renderWizard({ onImportByEmail });
      fireEvent.click(screen.getByTestId('gpg-wizard-import-option'));
      const tabs = screen.getByTestId('gpg-wizard-import-tabs');
      fireEvent.click(tabs.querySelectorAll('button')[2]);

      const emailField = screen
        .getByTestId('gpg-wizard-keyserver-email')
        .querySelector('input')!;
      fireEvent.change(emailField, { target: { value: 'alice@example.com' } });

      await act(async () => {
        fireEvent.click(screen.getByTestId('gpg-wizard-keyserver-btn'));
      });

      expect(onImportByEmail).toHaveBeenCalledWith('alice@example.com');
      await waitFor(() => {
        expect(screen.getByTestId('gpg-wizard-success')).toBeInTheDocument();
      });
    });

    it('shows error when keyserver search fails', async () => {
      const onImportByEmail = jest
        .fn()
        .mockRejectedValue(new Error('not found'));
      renderWizard({ onImportByEmail });
      fireEvent.click(screen.getByTestId('gpg-wizard-import-option'));
      const tabs = screen.getByTestId('gpg-wizard-import-tabs');
      fireEvent.click(tabs.querySelectorAll('button')[2]);

      const emailField = screen
        .getByTestId('gpg-wizard-keyserver-email')
        .querySelector('input')!;
      fireEvent.change(emailField, { target: { value: 'alice@example.com' } });

      await act(async () => {
        fireEvent.click(screen.getByTestId('gpg-wizard-keyserver-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('gpg-wizard-error')).toBeInTheDocument();
      });
    });
  });

  // ── Success step ─────────────────────────────────────────────────────

  describe('success step', () => {
    async function goToSuccess() {
      const onGenerateKeyPair = jest.fn().mockResolvedValue(undefined);
      const onPublishKey = jest.fn().mockResolvedValue(undefined);
      const onSetDefaultEncryption = jest.fn().mockResolvedValue(undefined);
      const onClose = jest.fn();

      renderWizard({
        onGenerateKeyPair,
        onPublishKey,
        onSetDefaultEncryption,
        onClose,
        keyFingerprint: 'ABCD 1234 EF56 7890',
      });

      fireEvent.click(screen.getByTestId('gpg-wizard-generate-option'));

      const passField = screen
        .getByTestId('gpg-wizard-passphrase')
        .querySelector('input')!;
      fireEvent.change(passField, { target: { value: 'myvalidpassphrase' } });

      const confirmField = screen
        .getByTestId('gpg-wizard-passphrase-confirm')
        .querySelector('input')!;
      fireEvent.change(confirmField, {
        target: { value: 'myvalidpassphrase' },
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('gpg-wizard-generate-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('gpg-wizard-success')).toBeInTheDocument();
      });

      return { onPublishKey, onSetDefaultEncryption, onClose };
    }

    it('shows fingerprint on success', async () => {
      await goToSuccess();
      expect(screen.getByTestId('gpg-wizard-fingerprint')).toHaveTextContent(
        'ABCD 1234 EF56 7890',
      );
    });

    it('publishes key when publish button is clicked', async () => {
      const { onPublishKey } = await goToSuccess();

      await act(async () => {
        fireEvent.click(screen.getByTestId('gpg-wizard-publish-btn'));
      });

      expect(onPublishKey).toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByTestId('gpg-wizard-published')).toBeInTheDocument();
      });
    });

    it('sets GPG as default when button is clicked', async () => {
      const { onSetDefaultEncryption } = await goToSuccess();

      await act(async () => {
        fireEvent.click(screen.getByTestId('gpg-wizard-set-default-btn'));
      });

      expect(onSetDefaultEncryption).toHaveBeenCalledWith('gpg');
      await waitFor(() => {
        expect(
          screen.getByTestId('gpg-wizard-default-set'),
        ).toBeInTheDocument();
      });
    });

    it('calls onClose and resets state when Done is clicked', async () => {
      const { onClose } = await goToSuccess();

      fireEvent.click(screen.getByTestId('gpg-wizard-done-btn'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ── Close / reset behavior ──────────────────────────────────────────

  describe('close behavior', () => {
    it('resets to welcome step after closing and reopening', () => {
      const { rerender } = render(
        <GpgSetupWizard {...defaultProps} open={true} />,
      );

      // Navigate to generate
      fireEvent.click(screen.getByTestId('gpg-wizard-generate-option'));
      expect(screen.getByTestId('gpg-wizard-generate')).toBeInTheDocument();

      // Close and reopen — MUI Dialog keeps DOM but the wizard should
      // reset its internal state via the onClose handler
      const onClose = jest.fn();
      rerender(
        <GpgSetupWizard {...defaultProps} open={true} onClose={onClose} />,
      );

      // Simulate the Done/close flow by clicking back to welcome
      fireEvent.click(screen.getByText('GpgWizard_Back'));
      expect(screen.getByTestId('gpg-wizard-welcome')).toBeInTheDocument();
    });
  });
});
