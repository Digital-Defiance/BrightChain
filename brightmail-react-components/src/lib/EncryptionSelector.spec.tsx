/**
 * Unit tests for EncryptionSelector enhancements.
 *
 * Tests: getAvailableEncryptionOptions pure function, conditional option
 * visibility based on hasGpgKey/hasSmimeCert/hasExternalRecipients,
 * NONE always present, GPG sender key missing warning, recipient warnings.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';

import type { MessageEncryptionScheme as MessageEncryptionSchemeType } from '@brightchain/brightchain-lib';
import type { EncryptionSelectorProps } from './EncryptionSelector';
import EncryptionSelector, {
  getAvailableEncryptionOptions,
} from './EncryptionSelector';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const MessageEncryptionScheme: Record<string, MessageEncryptionSchemeType> = {
  NONE: 'none' as MessageEncryptionSchemeType,
  SHARED_KEY: 'shared_key' as MessageEncryptionSchemeType,
  RECIPIENT_KEYS: 'recipient_keys' as MessageEncryptionSchemeType,
  S_MIME: 's_mime' as MessageEncryptionSchemeType,
  GPG: 'gpg' as MessageEncryptionSchemeType,
};

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

function openDropdown() {
  const selectContainer = screen.getByTestId('encryption-select');
  const combobox = within(selectContainer).getByRole('combobox');
  fireEvent.mouseDown(combobox);
}

function getDropdownLabels(): string[] {
  const listbox = screen.getByRole('listbox');
  const options = within(listbox).getAllByRole('option');
  return options.map((opt) => opt.textContent ?? '');
}

// ─── getAvailableEncryptionOptions tests ────────────────────────────────────

describe('getAvailableEncryptionOptions', () => {
  it('always includes NONE', () => {
    const result = getAvailableEncryptionOptions(false, false, false);
    expect(result.some((o) => o.value === MessageEncryptionScheme.NONE)).toBe(
      true,
    );
  });

  it('always includes GPG regardless of hasGpgKey', () => {
    const without = getAvailableEncryptionOptions(false, false, false);
    expect(without.some((o) => o.value === MessageEncryptionScheme.GPG)).toBe(
      true,
    );

    const withGpg = getAvailableEncryptionOptions(true, false, false);
    expect(withGpg.some((o) => o.value === MessageEncryptionScheme.GPG)).toBe(
      true,
    );
  });

  it('includes S/MIME only when hasSmimeCert is true', () => {
    const without = getAvailableEncryptionOptions(false, false, false);
    expect(
      without.some((o) => o.value === MessageEncryptionScheme.S_MIME),
    ).toBe(false);

    const withSmime = getAvailableEncryptionOptions(false, true, false);
    expect(
      withSmime.some((o) => o.value === MessageEncryptionScheme.S_MIME),
    ).toBe(true);
  });

  it('includes ECIES when hasExternalRecipients is false', () => {
    const result = getAvailableEncryptionOptions(false, false, false);
    expect(
      result.some((o) => o.value === MessageEncryptionScheme.RECIPIENT_KEYS),
    ).toBe(true);
  });

  it('excludes ECIES when hasExternalRecipients is true', () => {
    const result = getAvailableEncryptionOptions(false, false, true);
    expect(
      result.some((o) => o.value === MessageEncryptionScheme.RECIPIENT_KEYS),
    ).toBe(false);
  });

  it('includes all options when all keys present and no external recipients', () => {
    const result = getAvailableEncryptionOptions(true, true, false);
    const values = result.map((o) => o.value);
    expect(values).toContain(MessageEncryptionScheme.NONE);
    expect(values).toContain(MessageEncryptionScheme.RECIPIENT_KEYS);
    expect(values).toContain(MessageEncryptionScheme.GPG);
    expect(values).toContain(MessageEncryptionScheme.S_MIME);
  });

  it('includes GPG and S/MIME but not ECIES when external recipients present', () => {
    const result = getAvailableEncryptionOptions(true, true, true);
    const values = result.map((o) => o.value);
    expect(values).toContain(MessageEncryptionScheme.NONE);
    expect(values).not.toContain(MessageEncryptionScheme.RECIPIENT_KEYS);
    expect(values).toContain(MessageEncryptionScheme.GPG);
    expect(values).toContain(MessageEncryptionScheme.S_MIME);
  });

  it('includes ECIES when hasExternalRecipients is undefined (defaults to internal)', () => {
    const result = getAvailableEncryptionOptions(false, false, undefined);
    expect(
      result.some((o) => o.value === MessageEncryptionScheme.RECIPIENT_KEYS),
    ).toBe(true);
  });
});

// ─── Component rendering tests ──────────────────────────────────────────────

describe('EncryptionSelector component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders NONE, ECIES, and GPG when no keys configured (GPG always visible)', () => {
    renderSelector({ hasGpgKey: false, hasSmimeCert: false });
    openDropdown();
    const labels = getDropdownLabels();
    expect(labels).toContain('Encryption_None');
    expect(labels).toContain('Encryption_ECIES');
    expect(labels).toContain('Encryption_GPG');
    expect(labels).not.toContain('Encryption_SMIME');
  });

  it('shows GPG option regardless of hasGpgKey', () => {
    renderSelector({ hasGpgKey: true });
    openDropdown();
    const labels = getDropdownLabels();
    expect(labels).toContain('Encryption_GPG');
  });

  it('shows S/MIME option when hasSmimeCert is true', () => {
    renderSelector({ hasSmimeCert: true });
    openDropdown();
    const labels = getDropdownLabels();
    expect(labels).toContain('Encryption_SMIME');
  });

  it('hides ECIES when hasExternalRecipients is true', () => {
    renderSelector({ hasExternalRecipients: true });
    openDropdown();
    const labels = getDropdownLabels();
    expect(labels).not.toContain('Encryption_ECIES');
  });

  it('always shows NONE', () => {
    renderSelector({
      hasGpgKey: true,
      hasSmimeCert: true,
      hasExternalRecipients: true,
    });
    openDropdown();
    const labels = getDropdownLabels();
    expect(labels).toContain('Encryption_None');
  });

  // ── Warning tests ─────────────────────────────────────────────────────

  it('shows GPG sender key missing warning when GPG selected and senderGpgKeyMissing', () => {
    renderSelector({
      value: MessageEncryptionScheme.GPG,
      hasGpgKey: true,
      senderGpgKeyMissing: true,
    });
    expect(screen.getByTestId('sender-gpg-key-warning')).toBeInTheDocument();
  });

  it('does not show GPG sender key warning when GPG not selected', () => {
    renderSelector({
      value: MessageEncryptionScheme.NONE,
      senderGpgKeyMissing: true,
    });
    expect(
      screen.queryByTestId('sender-gpg-key-warning'),
    ).not.toBeInTheDocument();
  });

  it('shows recipient key warning when GPG selected with recipientWarnings', () => {
    renderSelector({
      value: MessageEncryptionScheme.GPG,
      hasGpgKey: true,
      recipientWarnings: ['alice@example.com'],
    });
    expect(screen.getByTestId('recipient-key-warning')).toBeInTheDocument();
  });

  it('shows recipient key warning when S/MIME selected with recipientWarnings', () => {
    renderSelector({
      value: MessageEncryptionScheme.S_MIME,
      hasSmimeCert: true,
      recipientWarnings: ['bob@example.com'],
    });
    expect(screen.getByTestId('recipient-key-warning')).toBeInTheDocument();
  });

  it('shows external recipient warning when provided', () => {
    renderSelector({
      externalRecipientWarning:
        'ECIES is only available for internal recipients',
    });
    expect(
      screen.getByTestId('external-recipient-encryption-warning'),
    ).toBeInTheDocument();
  });
});
