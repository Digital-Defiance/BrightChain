/**
 * Unit tests for EncryptionSelector component.
 *
 * Tests: default value is NONE, all three options rendered, warning display
 * for missing recipient keys and missing sender certificate.
 *
 * Requirements: 5.1, 5.4, 5.5, 5.7
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';

// Import after mocks
import type { EncryptionSelectorProps } from '../EncryptionSelector';
import EncryptionSelector from '../EncryptionSelector';

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

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
    currentLanguage: 'en-US',
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const defaultProps: EncryptionSelectorProps = {
  value: MessageEncryptionScheme.NONE,
  onChange: jest.fn(),
  hasGpgKey: false,
  hasSmimeCert: false,
};

function renderSelector(overrides: Partial<EncryptionSelectorProps> = {}) {
  return render(<EncryptionSelector {...defaultProps} {...overrides} />);
}

/**
 * Opens the MUI Select dropdown by clicking the element with
 * role="combobox" inside the encryption-select test id container.
 */
function openDropdown() {
  const selectContainer = screen.getByTestId('encryption-select');
  const combobox = within(selectContainer).getByRole('combobox');
  fireEvent.mouseDown(combobox);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('EncryptionSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Requirement 5.1: Renders the encryption selector container ────────

  it('renders the encryption selector container', () => {
    renderSelector();
    expect(screen.getByTestId('encryption-selector')).toBeInTheDocument();
  });

  // ── Requirement 5.7: Default value is NONE ────────────────────────────

  it('shows "No Encryption" when value is NONE', () => {
    renderSelector({ value: MessageEncryptionScheme.NONE });
    const selectContainer = screen.getByTestId('encryption-select');
    const combobox = within(selectContainer).getByRole('combobox');
    expect(combobox).toHaveTextContent('Encryption_None');
  });

  // ── Requirement 5.1: All encryption options are available ──────────────

  it('renders all encryption options in the dropdown', () => {
    renderSelector({ hasGpgKey: false, hasSmimeCert: true });
    openDropdown();

    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    const labels = options.map((opt) => opt.textContent);

    expect(labels).toContain('Encryption_None');
    expect(labels).toContain('Encryption_ECIES');
    expect(labels).toContain('Encryption_GPG');
    expect(labels).toContain('Encryption_SMIME');
  });

  // ── Requirement 5.4: Recipient key warning with ECIES ────────────────

  it('shows recipient key warning when ECIES is selected and recipientWarnings is non-empty', () => {
    renderSelector({
      value: MessageEncryptionScheme.RECIPIENT_KEYS,
      recipientWarnings: ['alice@example.com'],
    });

    expect(screen.getByTestId('recipient-key-warning')).toBeInTheDocument();
  });

  // ── Requirement 5.4: Recipient key warning with S/MIME ────────────────

  it('shows recipient key warning when S/MIME is selected and recipientWarnings is non-empty', () => {
    renderSelector({
      value: MessageEncryptionScheme.S_MIME,
      recipientWarnings: ['bob@example.com'],
    });

    expect(screen.getByTestId('recipient-key-warning')).toBeInTheDocument();
  });

  // ── Requirement 5.4: No recipient key warning when NONE ───────────────

  it('does not show recipient key warning when NONE is selected', () => {
    renderSelector({
      value: MessageEncryptionScheme.NONE,
      recipientWarnings: ['alice@example.com'],
    });

    expect(
      screen.queryByTestId('recipient-key-warning'),
    ).not.toBeInTheDocument();
  });

  // ── Requirement 5.5: Sender cert warning with S/MIME ──────────────────

  it('shows sender cert warning when S/MIME is selected and senderCertMissing is true', () => {
    renderSelector({
      value: MessageEncryptionScheme.S_MIME,
      senderCertMissing: true,
    });

    expect(screen.getByTestId('sender-cert-warning')).toBeInTheDocument();
  });

  // ── Requirement 5.5: No sender cert warning with ECIES ───────────────

  it('does not show sender cert warning when ECIES is selected even if senderCertMissing is true', () => {
    renderSelector({
      value: MessageEncryptionScheme.RECIPIENT_KEYS,
      senderCertMissing: true,
    });

    expect(screen.queryByTestId('sender-cert-warning')).not.toBeInTheDocument();
  });
});
