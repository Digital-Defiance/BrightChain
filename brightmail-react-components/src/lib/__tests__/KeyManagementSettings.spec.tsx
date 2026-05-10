/**
 * Unit tests for KeyManagementSettings component.
 *
 * Tests: upload flow with valid/invalid certificate files, delete action,
 * display of certificate metadata.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import type { MessageEncryptionScheme } from '@brightchain/brightchain-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { KeyManagementSettingsProps } from '../KeyManagementSettings';
import KeyManagementSettings from '../KeyManagementSettings';

// ─── Mocks ──────────────────────────────────────────────────────────────────

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
  MessageEncryptionScheme: {
    NONE: 'none',
    SHARED_KEY: 'shared_key',
    RECIPIENT_KEYS: 'recipient_keys',
    S_MIME: 's_mime',
    GPG: 'gpg',
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

const VALID_PEM = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJALRiMLAh0ESOMA0GCSqGSIb3DQEBCwUAMBExDzANBgNVBAMMBnRl
c3RDQTAYHQ0yNTAxMDEwMDAwMDBaFw0yNjAxMDEwMDAwMDBaMBExDzANBgNVBAMM
BnRlc3RDQTBcMA0GCSqGSIb3DQEBAQUAAw==
-----END CERTIFICATE-----`;

const INVALID_PEM = 'not a certificate at all';

const VALID_GPG = `-----BEGIN PGP PUBLIC KEY BLOCK-----

mQENBGABCDEBCAC1234567890abcdef
=ABCD
-----END PGP PUBLIC KEY BLOCK-----`;

const INVALID_GPG = 'not a gpg key';

// ─── Helpers ────────────────────────────────────────────────────────────────

const defaultProps: KeyManagementSettingsProps = {
  onUpdate: jest.fn().mockResolvedValue(undefined),
  hasGpgPrivateKey: false,
  hasSmimePrivateKey: false,
  onGenerateGpgKeyPair: jest.fn().mockResolvedValue(undefined),
  onExportGpgPublicKey: jest.fn().mockResolvedValue(''),
  onImportSmimePkcs12: jest.fn().mockResolvedValue(undefined),
  onPublishGpgKey: jest.fn().mockResolvedValue(undefined),
  onImportGpgByEmail: jest.fn().mockResolvedValue(undefined),
  defaultEncryptionPreference: 'none' as MessageEncryptionScheme,
  onSetDefaultPreference: jest.fn().mockResolvedValue(undefined),
};

function renderSettings(overrides: Partial<KeyManagementSettingsProps> = {}) {
  return render(<KeyManagementSettings {...defaultProps} {...overrides} />);
}

/**
 * Creates a mock File with the given text content.
 */
function createTextFile(content: string, name: string): File {
  const file = new File([content], name, { type: 'application/x-pem-file' });
  // Ensure .text() works in jsdom
  file.text = () => Promise.resolve(content);
  return file;
}

/**
 * Simulates uploading a file to a hidden input.
 */
function uploadFile(input: HTMLElement, file: File) {
  fireEvent.change(input, { target: { files: [file] } });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('KeyManagementSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Requirement 6.1: Renders both sections ────────────────────────────

  it('renders the key management settings container', () => {
    renderSettings();
    expect(screen.getByTestId('key-management-settings')).toBeInTheDocument();
  });

  it('shows prompt when smimeCertificate is undefined', () => {
    renderSettings();
    expect(screen.getByTestId('smime-no-cert-prompt')).toHaveTextContent(
      'KeyMgmt_NoSmimeCert',
    );
  });

  it('shows prompt when gpgPublicKey is undefined', () => {
    renderSettings();
    expect(screen.getByTestId('gpg-no-keypair-prompt')).toHaveTextContent(
      'KeyMgmt_NoGpgKeypair',
    );
  });

  // ── Requirement 6.2: Upload valid S/MIME certificate ──────────────────

  it('calls onUpdate with certificate content when a valid PEM is uploaded', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    renderSettings({ onUpdate });

    const input = screen.getByTestId('smime-file-input');
    const file = createTextFile(VALID_PEM, 'cert.pem');
    uploadFile(input, file);

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({
        smimeCertificate: VALID_PEM,
      });
    });
  });

  // ── Requirement 6.3: Reject invalid S/MIME certificate ────────────────

  it('shows error when an invalid certificate file is uploaded', async () => {
    renderSettings();

    const input = screen.getByTestId('smime-file-input');
    const file = createTextFile(INVALID_PEM, 'bad.pem');
    uploadFile(input, file);

    await waitFor(() => {
      expect(screen.getByTestId('smime-error')).toHaveTextContent(
        'KeyMgmt_ErrorInvalidCert',
      );
    });
  });

  // ── Requirement 6.2: Upload valid GPG key ─────────────────────────────

  it('calls onUpdate with key content when a valid GPG key is uploaded', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    renderSettings({ onUpdate });

    const input = screen.getByTestId('gpg-file-input');
    const file = createTextFile(VALID_GPG, 'key.asc');
    uploadFile(input, file);

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({
        gpgPublicKey: VALID_GPG,
      });
    });
  });

  // ── Requirement 6.3: Reject invalid GPG key ──────────────────────────

  it('shows error when an invalid GPG key file is uploaded', async () => {
    renderSettings();

    const input = screen.getByTestId('gpg-file-input');
    const file = createTextFile(INVALID_GPG, 'bad.asc');
    uploadFile(input, file);

    await waitFor(() => {
      expect(screen.getByTestId('gpg-error')).toHaveTextContent(
        'KeyMgmt_ErrorInvalidKey',
      );
    });
  });

  // ── Requirement 6.4: Display certificate metadata ─────────────────────

  it('displays S/MIME metadata when certificate is present', () => {
    renderSettings({ smimeCertificate: VALID_PEM });
    expect(screen.getByTestId('smime-metadata')).toBeInTheDocument();
    expect(screen.getByText('Format: X.509 PEM')).toBeInTheDocument();
  });

  it('displays GPG metadata when key is present', () => {
    renderSettings({ gpgPublicKey: VALID_GPG });
    expect(screen.getByTestId('gpg-metadata')).toBeInTheDocument();
    expect(screen.getByText('Format: ASCII-armored PGP')).toBeInTheDocument();
  });

  // ── Requirement 6.5: Delete certificate ───────────────────────────────

  it('calls onUpdate with null to delete S/MIME certificate', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    renderSettings({ smimeCertificate: VALID_PEM, onUpdate });

    fireEvent.click(screen.getByTestId('smime-delete-btn'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({ smimeCertificate: null });
    });
  });

  it('calls onUpdate with null to delete GPG key', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    renderSettings({ gpgPublicKey: VALID_GPG, onUpdate });

    fireEvent.click(screen.getByTestId('gpg-delete-btn'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({ gpgPublicKey: null });
    });
  });

  // ── Requirement 6.1: Upload button text changes ───────────────────────

  it('shows "Replace Certificate" when certificate exists', () => {
    renderSettings({ smimeCertificate: VALID_PEM });
    expect(screen.getByTestId('smime-upload-btn')).toHaveTextContent(
      'KeyMgmt_ReplaceCertificate',
    );
  });

  it('shows "Import Certificate (PEM)" when no certificate exists', () => {
    renderSettings();
    expect(screen.getByTestId('smime-upload-btn')).toHaveTextContent(
      'KeyMgmt_ImportCertPem',
    );
  });
});
