/**
 * Unit tests for MnemonicRegistrationInput component.
 *
 * Tests: toggle reveals input, form submission, client-side validation,
 * backend error display, no errors when absent.
 *
 * Validates: Requirements 8.1, 8.2, 8.4, 9.1, 9.2, 9.3
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MnemonicRegistrationInput } from '../lib/identity/MnemonicRegistrationInput';

const MnemonicRegex =
  /^(?:\w+\s){11}\w+$|^(?:\w+\s){14}\w+$|^(?:\w+\s){17}\w+$|^(?:\w+\s){20}\w+$|^(?:\w+\s){23}\w+$/i;

const VALID_12_WORD =
  'abandon ability able about above absent absorb abstract absurd abuse access accident';

describe('MnemonicRegistrationInput', () => {
  let onMnemonicChange: jest.Mock;

  beforeEach(() => {
    onMnemonicChange = jest.fn();
  });

  it('hides mnemonic input by default', () => {
    render(
      <MnemonicRegistrationInput
        onMnemonicChange={onMnemonicChange}
        mnemonicRegex={MnemonicRegex}
      />,
    );

    expect(screen.queryByTestId('mnemonic-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('mnemonic-toggle')).toBeInTheDocument();
  });

  it('reveals mnemonic input when toggle is checked', () => {
    render(
      <MnemonicRegistrationInput
        onMnemonicChange={onMnemonicChange}
        mnemonicRegex={MnemonicRegex}
      />,
    );

    fireEvent.click(screen.getByTestId('mnemonic-toggle'));
    expect(screen.getByTestId('mnemonic-input')).toBeInTheDocument();
  });

  it('calls onMnemonicChange with trimmed value for valid mnemonic', () => {
    render(
      <MnemonicRegistrationInput
        onMnemonicChange={onMnemonicChange}
        mnemonicRegex={MnemonicRegex}
      />,
    );

    fireEvent.click(screen.getByTestId('mnemonic-toggle'));
    fireEvent.change(screen.getByTestId('mnemonic-input'), {
      target: { value: VALID_12_WORD },
    });

    expect(onMnemonicChange).toHaveBeenCalledWith(VALID_12_WORD);
  });

  it('calls onMnemonicChange(undefined) for invalid mnemonic', () => {
    render(
      <MnemonicRegistrationInput
        onMnemonicChange={onMnemonicChange}
        mnemonicRegex={MnemonicRegex}
      />,
    );

    fireEvent.click(screen.getByTestId('mnemonic-toggle'));
    fireEvent.change(screen.getByTestId('mnemonic-input'), {
      target: { value: 'not a valid mnemonic' },
    });

    expect(onMnemonicChange).toHaveBeenCalledWith(undefined);
  });

  it('displays client-side validation error for invalid mnemonic', () => {
    render(
      <MnemonicRegistrationInput
        onMnemonicChange={onMnemonicChange}
        mnemonicRegex={MnemonicRegex}
      />,
    );

    fireEvent.click(screen.getByTestId('mnemonic-toggle'));
    fireEvent.change(screen.getByTestId('mnemonic-input'), {
      target: { value: 'bad input' },
    });

    expect(screen.getByTestId('mnemonic-error')).toHaveTextContent(
      'Invalid mnemonic format',
    );
  });

  it('displays backend error via error prop', () => {
    render(
      <MnemonicRegistrationInput
        onMnemonicChange={onMnemonicChange}
        mnemonicRegex={MnemonicRegex}
        error="This mnemonic is already in use"
      />,
    );

    // Backend error only shows when input is visible
    fireEvent.click(screen.getByTestId('mnemonic-toggle'));
    expect(screen.getByTestId('mnemonic-error')).toHaveTextContent(
      'This mnemonic is already in use',
    );
  });

  it('shows no errors when mnemonic is absent (toggle off)', () => {
    render(
      <MnemonicRegistrationInput
        onMnemonicChange={onMnemonicChange}
        mnemonicRegex={MnemonicRegex}
      />,
    );

    expect(screen.queryByTestId('mnemonic-error')).not.toBeInTheDocument();
  });

  it('clears mnemonic and errors when toggle is unchecked', () => {
    render(
      <MnemonicRegistrationInput
        onMnemonicChange={onMnemonicChange}
        mnemonicRegex={MnemonicRegex}
      />,
    );

    // Toggle on, enter value, toggle off
    fireEvent.click(screen.getByTestId('mnemonic-toggle'));
    fireEvent.change(screen.getByTestId('mnemonic-input'), {
      target: { value: VALID_12_WORD },
    });
    fireEvent.click(screen.getByTestId('mnemonic-toggle'));

    expect(onMnemonicChange).toHaveBeenLastCalledWith(undefined);
    expect(screen.queryByTestId('mnemonic-input')).not.toBeInTheDocument();
  });

  it('calls onMnemonicChange(undefined) when input is cleared', () => {
    render(
      <MnemonicRegistrationInput
        onMnemonicChange={onMnemonicChange}
        mnemonicRegex={MnemonicRegex}
      />,
    );

    fireEvent.click(screen.getByTestId('mnemonic-toggle'));
    fireEvent.change(screen.getByTestId('mnemonic-input'), {
      target: { value: VALID_12_WORD },
    });
    fireEvent.change(screen.getByTestId('mnemonic-input'), {
      target: { value: '' },
    });

    expect(onMnemonicChange).toHaveBeenLastCalledWith(undefined);
  });
});
