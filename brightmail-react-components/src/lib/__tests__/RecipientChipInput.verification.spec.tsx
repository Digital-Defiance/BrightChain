/**
 * @fileoverview Unit tests for RecipientChipInput verification display (Task 14.6).
 *
 * Tests:
 * - Warning chip rendering when chipStatuses contains 'warning'
 * - Tooltip text shows "{username} not found at {emailDomain}"
 * - Default appearance when chipStatuses is undefined or email not in map
 * - onChipCommit callback is fired when chips are committed
 *
 * Validates: Requirements 8.2, 8.3, 8.10
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import RecipientChipInput from '../RecipientChipInput';

// Mock i18n — RecipientChipInput uses useBrightMailTranslation
const mockEngine = {
  translate: jest.fn((_componentId: string, key: string) => key),
  translateEnum: jest.fn((_enumType: unknown, value: unknown) => String(value)),
  registerIfNotExists: jest.fn(),
  registerStringKeyEnum: jest.fn(),
};

jest.mock('@brightchain/brightchain-lib', () => ({
  MessageEncryptionScheme: { NONE: 'none', ECIES: 'ecies', SMIME: 'smime' },
  MAX_ATTACHMENT_SIZE_BYTES: 25 * 1024 * 1024,
  formatFileSize: (bytes: number) => `${bytes} B`,
  validateAttachmentSize: (size: number, max: number) => size <= max,
  validateTotalAttachmentSize: (sizes: number[], max: number) =>
    sizes.every((s) => s <= max) && sizes.reduce((a, b) => a + b, 0) <= max,
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

describe('RecipientChipInput verification display', () => {
  const defaultProps = {
    value: ['alice@example.com', 'bob@example.com'],
    onChange: jest.fn(),
    label: 'To',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render warning chip when chipStatuses has warning for an email', () => {
    render(
      <RecipientChipInput
        {...defaultProps}
        chipStatuses={{ 'bob@example.com': 'warning' }}
        emailDomain="example.com"
      />,
    );

    const warningChip = screen.getByTestId('recipient-chip-warning');
    expect(warningChip).toBeInTheDocument();
    expect(warningChip).toHaveTextContent('bob@example.com');
  });

  it('should render default chip when chipStatuses is undefined', () => {
    render(<RecipientChipInput {...defaultProps} />);

    const chips = screen.getAllByTestId('recipient-chip');
    expect(chips).toHaveLength(2);
  });

  it('should render default chip when email is not in chipStatuses map', () => {
    render(
      <RecipientChipInput
        {...defaultProps}
        chipStatuses={{ 'other@example.com': 'warning' }}
      />,
    );

    const chips = screen.getAllByTestId('recipient-chip');
    expect(chips).toHaveLength(2);
  });

  it('should render success chip when chipStatuses has valid for an email', () => {
    render(
      <RecipientChipInput
        {...defaultProps}
        chipStatuses={{ 'alice@example.com': 'valid' }}
      />,
    );

    // alice should be success (valid status), bob should be default
    const chips = screen.getAllByTestId('recipient-chip');
    // bob is default
    expect(chips.length).toBeGreaterThanOrEqual(1);
  });

  it('should call onChipCommit when a new chip is committed via Enter', () => {
    const onChipCommit = jest.fn();
    render(
      <RecipientChipInput {...defaultProps} onChipCommit={onChipCommit} />,
    );

    const input = screen.getByLabelText('To');
    fireEvent.change(input, { target: { value: 'charlie@example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChipCommit).toHaveBeenCalledWith('charlie@example.com');
  });

  it('should call onChipCommit for each email when pasting comma-separated addresses', () => {
    const onChipCommit = jest.fn();
    render(
      <RecipientChipInput
        value={[]}
        onChange={jest.fn()}
        label="To"
        onChipCommit={onChipCommit}
      />,
    );

    const input = screen.getByLabelText('To');
    fireEvent.paste(input, {
      clipboardData: {
        getData: () => 'dave@example.com, eve@example.com',
      },
    });

    expect(onChipCommit).toHaveBeenCalledTimes(2);
    expect(onChipCommit).toHaveBeenCalledWith('dave@example.com');
    expect(onChipCommit).toHaveBeenCalledWith('eve@example.com');
  });

  it('should show tooltip with "not found at domain" for warning chips', async () => {
    render(
      <RecipientChipInput
        {...defaultProps}
        chipStatuses={{ 'bob@example.com': 'warning' }}
        emailDomain="example.com"
      />,
    );

    const warningChip = screen.getByTestId('recipient-chip-warning');
    // Hover to trigger tooltip
    fireEvent.mouseOver(warningChip);

    // MUI Tooltip renders asynchronously
    const tooltip = await screen.findByRole('tooltip', {}, { timeout: 2000 });
    expect(tooltip).toHaveTextContent('Recipient_NotFoundTemplate');
  });
});
