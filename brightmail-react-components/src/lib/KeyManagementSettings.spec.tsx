/**
 * Unit tests for KeyManagementSettings enhancements.
 *
 * Tests: GPG subsection rendering (generate button, metadata, export/delete),
 * S/MIME subsection rendering (import prompt, metadata, expired warning, delete),
 * default encryption preference selector.
 *
 * Requirements: 1.3, 1.5, 6.3, 6.4, 12.2, 12.3, 12.4, 12.5, 12.6
 */

import '@testing-library/jest-dom';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { KeyManagementSettingsProps } from './KeyManagementSettings';
import KeyManagementSettings from './KeyManagementSettings';

// ─── Mocks ──────────────────────────────────────────────────────────────────

import type {
  IGpgKeyMetadata,
  ISmimeCertificateMetadata,
  MessageEncryptionScheme as MessageEncryptionSchemeType,
} from '@brightchain/brightchain-lib';

// Use var for values referenced inside jest.mock factories (jest.mock is hoisted
// above const/let declarations, causing temporal dead zone errors with const).
// eslint-disable-next-line no-var
var mockEngine = {
  translate: jest.fn((_componentId: string, key: string) => key),
  translateEnum: jest.fn((_enumType: unknown, value: unknown) => String(value)),
  registerIfNotExists: jest.fn(),
  registerStringKeyEnum: jest.fn(),
};

// Local reference for use in test assertions (not inside jest.mock factory)
const MessageEncryptionScheme = {
  NONE: 'none' as MessageEncryptionSchemeType,
  SHARED_KEY: 'shared_key' as MessageEncryptionSchemeType,
  RECIPIENT_KEYS: 'recipient_keys' as MessageEncryptionSchemeType,
  S_MIME: 's_mime' as MessageEncryptionSchemeType,
  GPG: 'gpg' as MessageEncryptionSchemeType,
};

jest.mock('@brightchain/brightchain-lib', () => ({
  BrightDateDisplayMode: {
    Dual: 'dual',
    BrightDateOnly: 'brightDateOnly',
    LocaleOnly: 'localeOnly',
    Hover: 'hover',
    HoverReverse: 'hoverReverse',
  },
  BrightChainStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => String(p) },
  ),
  MessageEncryptionScheme: {
    NONE: 'none',
    SHARED_KEY: 'shared_key',
    RECIPIENT_KEYS: 'recipient_keys',
    S_MIME: 's_mime',
    GPG: 'gpg',
  },
  toBrightDateString: (date: Date | string, _precision?: number) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return ((d.getTime() - 946684800000) / 86400000).toFixed(3);
  },
  getBrightChainI18nEngine: () => mockEngine,
}));

jest.mock('@brightchain/brightmail-lib', () => ({
  BrightMailStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => String(p) },
  ),
  BrightMailComponentId: 'BrightMail',
}));

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
    currentLanguage: 'en-US',
  }),
}));

// ─── Test data ──────────────────────────────────────────────────────────────

const mockGpgKeyMetadata: IGpgKeyMetadata = {
  keyId: 'ABCD1234EFGH5678',
  fingerprint: 'ABCD1234EFGH5678ABCD1234EFGH5678ABCD1234',
  createdAt: new Date('2024-01-15'),
  expiresAt: null,
  userId: 'Test User <test@example.com>',
  algorithm: 'rsa4096',
};

const mockSmimeCertMetadata: ISmimeCertificateMetadata = {
  subject: 'CN=Test User, O=Example Corp',
  issuer: 'CN=Example CA',
  serialNumber: '01AB23CD',
  validFrom: new Date('2024-01-01'),
  validTo: new Date('2025-12-31'),
  emailAddresses: ['test@example.com'],
  fingerprint: 'AA:BB:CC:DD:EE:FF',
  isExpired: false,
};

const mockExpiredSmimeCertMetadata: ISmimeCertificateMetadata = {
  ...mockSmimeCertMetadata,
  validTo: new Date('2023-01-01'),
  isExpired: true,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const defaultProps: KeyManagementSettingsProps = {
  onUpdate: jest.fn().mockResolvedValue(undefined),
  hasGpgPrivateKey: false,
  hasSmimePrivateKey: false,
  onGenerateGpgKeyPair: jest.fn().mockResolvedValue(undefined),
  onExportGpgPublicKey: jest
    .fn()
    .mockResolvedValue(
      '-----BEGIN PGP PUBLIC KEY BLOCK-----\ntest\n-----END PGP PUBLIC KEY BLOCK-----',
    ),
  onImportSmimePkcs12: jest.fn().mockResolvedValue(undefined),
  onPublishGpgKey: jest.fn().mockResolvedValue(undefined),
  onImportGpgByEmail: jest.fn().mockResolvedValue(undefined),
  defaultEncryptionPreference: MessageEncryptionScheme.NONE,
  onSetDefaultPreference: jest.fn().mockResolvedValue(undefined),
};

function renderSettings(overrides: Partial<KeyManagementSettingsProps> = {}) {
  return render(<KeyManagementSettings {...defaultProps} {...overrides} />);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('KeyManagementSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GPG subsection ────────────────────────────────────────────────────

  describe('GPG subsection', () => {
    it('renders generate button when no keypair exists', () => {
      renderSettings();
      expect(screen.getByTestId('gpg-generate-btn')).toBeInTheDocument();
      expect(screen.getByTestId('gpg-no-keypair-prompt')).toHaveTextContent(
        'KeyMgmt_NoGpgKeypair',
      );
    });

    it('renders GPG key metadata when gpgKeyMetadata is provided', () => {
      renderSettings({
        gpgKeyMetadata: mockGpgKeyMetadata,
        hasGpgPrivateKey: true,
      });
      const metadataBox = screen.getByTestId('gpg-key-metadata');
      expect(metadataBox).toBeInTheDocument();
      expect(screen.getByText(/Key ID: ABCD1234EFGH5678/)).toBeInTheDocument();
      expect(
        screen.getByText(/Test User <test@example.com>/),
      ).toBeInTheDocument();
    });

    it('renders export and delete buttons when keypair exists', () => {
      renderSettings({
        gpgKeyMetadata: mockGpgKeyMetadata,
        hasGpgPrivateKey: true,
      });
      expect(screen.getByTestId('gpg-export-btn')).toBeInTheDocument();
      expect(screen.getByTestId('gpg-delete-btn')).toBeInTheDocument();
    });

    it('renders publish to keyserver button when keypair exists', () => {
      renderSettings({
        gpgKeyMetadata: mockGpgKeyMetadata,
        hasGpgPrivateKey: true,
      });
      expect(screen.getByTestId('gpg-publish-btn')).toBeInTheDocument();
    });

    it('does not render generate button when keypair exists', () => {
      renderSettings({
        gpgKeyMetadata: mockGpgKeyMetadata,
        hasGpgPrivateKey: true,
      });
      expect(screen.queryByTestId('gpg-generate-btn')).not.toBeInTheDocument();
    });

    it('shows passphrase input when generate button is clicked', () => {
      renderSettings();
      fireEvent.click(screen.getByTestId('gpg-generate-btn'));
      expect(screen.getByTestId('gpg-passphrase-input')).toBeInTheDocument();
    });

    it('calls onGenerateGpgKeyPair when passphrase is entered and confirmed', async () => {
      const onGenerateGpgKeyPair = jest.fn().mockResolvedValue(undefined);
      renderSettings({ onGenerateGpgKeyPair });

      fireEvent.click(screen.getByTestId('gpg-generate-btn'));

      const input = screen
        .getByTestId('gpg-passphrase-field')
        .querySelector('input')!;
      fireEvent.change(input, { target: { value: 'my-passphrase' } });
      fireEvent.click(screen.getByTestId('gpg-generate-confirm-btn'));

      await waitFor(() => {
        expect(onGenerateGpgKeyPair).toHaveBeenCalledWith('my-passphrase');
      });
    });

    it('calls onUpdate with null to delete GPG key', async () => {
      const onUpdate = jest.fn().mockResolvedValue(undefined);
      renderSettings({
        gpgKeyMetadata: mockGpgKeyMetadata,
        hasGpgPrivateKey: true,
        onUpdate,
      });

      fireEvent.click(screen.getByTestId('gpg-delete-btn'));

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith({ gpgPublicKey: null });
      });
    });
  });

  // ── S/MIME subsection ─────────────────────────────────────────────────

  describe('S/MIME subsection', () => {
    it('renders import prompt when no certificate exists', () => {
      renderSettings();
      expect(screen.getByTestId('smime-no-cert-prompt')).toHaveTextContent(
        'KeyMgmt_NoSmimeCert',
      );
    });

    it('renders S/MIME certificate metadata when smimeCertMetadata is provided', () => {
      renderSettings({
        smimeCertMetadata: mockSmimeCertMetadata,
        hasSmimePrivateKey: true,
      });
      const metadataBox = screen.getByTestId('smime-cert-metadata');
      expect(metadataBox).toBeInTheDocument();
      expect(
        screen.getByText(/CN=Test User, O=Example Corp/),
      ).toBeInTheDocument();
      expect(screen.getByText(/CN=Example CA/)).toBeInTheDocument();
      expect(screen.getByText(/01AB23CD/)).toBeInTheDocument();
    });

    it('renders delete button when certificate exists', () => {
      renderSettings({
        smimeCertMetadata: mockSmimeCertMetadata,
        hasSmimePrivateKey: true,
      });
      expect(screen.getByTestId('smime-delete-btn')).toBeInTheDocument();
    });

    it('shows expired certificate warning when isExpired is true', () => {
      renderSettings({
        smimeCertMetadata: mockExpiredSmimeCertMetadata,
        hasSmimePrivateKey: true,
      });
      expect(screen.getByTestId('smime-expired-warning')).toBeInTheDocument();
      expect(screen.getByTestId('smime-expired-warning')).toHaveTextContent(
        'KeyMgmt_CertExpired',
      );
    });

    it('does not show expired warning when certificate is valid', () => {
      renderSettings({
        smimeCertMetadata: mockSmimeCertMetadata,
        hasSmimePrivateKey: true,
      });
      expect(
        screen.queryByTestId('smime-expired-warning'),
      ).not.toBeInTheDocument();
    });

    it('renders PKCS#12 import button', () => {
      renderSettings();
      expect(screen.getByTestId('pkcs12-upload-btn')).toBeInTheDocument();
    });

    it('calls onUpdate with null to delete S/MIME certificate', async () => {
      const onUpdate = jest.fn().mockResolvedValue(undefined);
      renderSettings({
        smimeCertMetadata: mockSmimeCertMetadata,
        hasSmimePrivateKey: true,
        onUpdate,
      });

      fireEvent.click(screen.getByTestId('smime-delete-btn'));

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith({ smimeCertificate: null });
      });
    });
  });

  // ── Default encryption preference ─────────────────────────────────────

  describe('Default encryption preference', () => {
    it('renders the preference selector', () => {
      renderSettings();
      expect(
        screen.getByTestId('default-encryption-pref-select'),
      ).toBeInTheDocument();
    });

    it('displays the current preference value', () => {
      renderSettings({
        defaultEncryptionPreference: MessageEncryptionScheme.GPG,
      });
      const selectContainer = screen.getByTestId(
        'default-encryption-pref-select',
      );
      const combobox = within(selectContainer).getByRole('combobox');
      expect(combobox).toHaveTextContent('Encryption_GPG');
    });

    it('calls onSetDefaultPreference when preference is changed', async () => {
      const onSetDefaultPreference = jest.fn().mockResolvedValue(undefined);
      renderSettings({ onSetDefaultPreference });

      const selectContainer = screen.getByTestId(
        'default-encryption-pref-select',
      );
      const combobox = within(selectContainer).getByRole('combobox');
      fireEvent.mouseDown(combobox);

      const listbox = screen.getByRole('listbox');
      const gpgOption = within(listbox).getByText('Encryption_GPG');
      fireEvent.click(gpgOption);

      await waitFor(() => {
        expect(onSetDefaultPreference).toHaveBeenCalledWith(
          MessageEncryptionScheme.GPG,
        );
      });
    });
  });
});
