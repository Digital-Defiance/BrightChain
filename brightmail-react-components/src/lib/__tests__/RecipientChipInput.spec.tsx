/**
 * Unit tests for RecipientChipInput component.
 *
 * Tests chip creation, removal, error styling, paste handling,
 * and aria-live announcements.
 */

import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import RecipientChipInput, { isValidEmail } from '../RecipientChipInput';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockEngine = {
  translate: jest.fn((_componentId: string, key: string) => key),
  translateEnum: jest.fn((_enumType: unknown, value: unknown) => String(value)),
  registerIfNotExists: jest.fn(),
  registerStringKeyEnum: jest.fn(),
};

jest.mock('@brightchain/brightchain-lib', () => ({
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

afterEach(() => {
  cleanup();
});

// ─── isValidEmail unit tests ────────────────────────────────────────────────

describe('isValidEmail', () => {
  it('returns true for a standard email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('returns true for email with subdomain', () => {
    expect(isValidEmail('user@mail.example.com')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('returns false for string without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('returns false for string with no domain dot', () => {
    expect(isValidEmail('user@example')).toBe(false);
  });

  it('returns false for string with empty local part', () => {
    expect(isValidEmail('@example.com')).toBe(false);
  });

  it('returns false for string with multiple @', () => {
    expect(isValidEmail('user@@example.com')).toBe(false);
  });

  it('returns false for domain ending with dot', () => {
    expect(isValidEmail('user@example.')).toBe(false);
  });
});

// ─── Component rendering ───────────────────────────────────────────────────

describe('RecipientChipInput', () => {
  const defaultProps = {
    value: [] as string[],
    onChange: jest.fn(),
    label: 'To',
  };

  function renderChipInput(props: Partial<typeof defaultProps> = {}) {
    return render(<RecipientChipInput {...defaultProps} {...props} />);
  }

  it('renders with the correct data-testid', () => {
    renderChipInput();
    expect(screen.getByTestId('recipient-chip-input')).toBeInTheDocument();
  });

  it('renders the text input with the given label', () => {
    renderChipInput({ label: 'To' });
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });

  it('renders the aria-live region', () => {
    renderChipInput();
    expect(screen.getByTestId('recipient-aria-live')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  // ─── Chip creation ──────────────────────────────────────────────────────

  it('calls onChange with new email on Enter key', () => {
    const onChange = jest.fn();
    renderChipInput({ onChange });

    const input = screen.getByLabelText('To');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['test@example.com']);
  });

  it('calls onChange with new email on Tab key', () => {
    const onChange = jest.fn();
    renderChipInput({ onChange });

    const input = screen.getByLabelText('To');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.keyDown(input, { key: 'Tab' });

    expect(onChange).toHaveBeenCalledWith(['test@example.com']);
  });

  it('calls onChange with new email on comma key', () => {
    const onChange = jest.fn();
    renderChipInput({ onChange });

    const input = screen.getByLabelText('To');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.keyDown(input, { key: ',' });

    expect(onChange).toHaveBeenCalledWith(['test@example.com']);
  });

  it('appends to existing value array', () => {
    const onChange = jest.fn();
    renderChipInput({
      value: ['first@example.com'],
      onChange,
    });

    const input = screen.getByLabelText('To');
    fireEvent.change(input, { target: { value: 'second@example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith([
      'first@example.com',
      'second@example.com',
    ]);
  });

  it('does not commit empty input on Enter', () => {
    const onChange = jest.fn();
    renderChipInput({ onChange });

    const input = screen.getByLabelText('To');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  // ─── Chip rendering ────────────────────────────────────────────────────

  it('renders valid email chips with data-testid="recipient-chip"', () => {
    renderChipInput({ value: ['valid@example.com'] });
    expect(screen.getByTestId('recipient-chip')).toBeInTheDocument();
    expect(screen.getByText('valid@example.com')).toBeInTheDocument();
  });

  it('renders invalid email chips with data-testid="recipient-chip-error"', () => {
    renderChipInput({ value: ['notanemail'] });
    expect(screen.getByTestId('recipient-chip-error')).toBeInTheDocument();
  });

  // ─── Chip removal ──────────────────────────────────────────────────────

  it('calls onChange without the removed chip when delete is clicked', () => {
    const onChange = jest.fn();
    renderChipInput({
      value: ['a@b.com', 'c@d.com'],
      onChange,
    });

    // Click the delete button on the first chip
    const chips = screen.getAllByTestId('recipient-chip');
    const deleteButton = chips[0].querySelector(
      '.MuiChip-deleteIcon',
    ) as HTMLElement;
    fireEvent.click(deleteButton);

    expect(onChange).toHaveBeenCalledWith(['c@d.com']);
  });

  // ─── Paste handling ─────────────────────────────────────────────────────

  it('splits pasted comma-separated emails into multiple chips', () => {
    const onChange = jest.fn();
    renderChipInput({ onChange });

    const input = screen.getByLabelText('To');
    fireEvent.paste(input, {
      clipboardData: {
        getData: () => 'a@b.com, c@d.com, invalid',
      },
    });

    expect(onChange).toHaveBeenCalledWith(['a@b.com', 'c@d.com', 'invalid']);
  });

  // ─── Backspace removes last chip ────────────────────────────────────────

  it('removes the last chip on Backspace when input is empty', () => {
    const onChange = jest.fn();
    renderChipInput({
      value: ['a@b.com', 'c@d.com'],
      onChange,
    });

    const input = screen.getByLabelText('To');
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith(['a@b.com']);
  });

  // ─── Aria-live announcements ────────────────────────────────────────────

  it('announces chip addition via aria-live region', () => {
    const onChange = jest.fn();
    renderChipInput({ onChange });

    const input = screen.getByLabelText('To');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const liveRegion = screen.getByTestId('recipient-aria-live');
    expect(liveRegion.textContent).toContain('Recipient_AddedOneTemplate');
  });

  it('announces chip removal via aria-live region', () => {
    const onChange = jest.fn();
    renderChipInput({
      value: ['a@b.com'],
      onChange,
    });

    const input = screen.getByLabelText('To');
    fireEvent.keyDown(input, { key: 'Backspace' });

    const liveRegion = screen.getByTestId('recipient-aria-live');
    expect(liveRegion.textContent).toContain('Recipient_RemovedTemplate');
  });
});
