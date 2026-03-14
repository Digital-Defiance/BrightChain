// Mock @brightchain/brighthub-lib to avoid the full ECIES/GUID init chain.
jest.mock('@brightchain/brighthub-lib', () => ({
  __esModule: true,
  BrightHubStrings: new Proxy(
    {},
    { get: (_target: unknown, prop: string) => String(prop) },
  ),
  BrightHubComponentId: 'BrightHub',
}));

jest.mock('../hooks/useBrightHubTranslation', () => ({
  useBrightHubTranslation: () => ({
    t: (key: string, _vars?: Record<string, string>) => key,
  }),
}));

import { MuteDuration } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { TemporaryMuteDialog } from './TemporaryMuteDialog';

const defaultProps = {
  open: true,
  username: 'testuser',
  onClose: jest.fn(),
  onMute: jest.fn(),
};

describe('TemporaryMuteDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dialog with title and username', () => {
    render(<TemporaryMuteDialog {...defaultProps} />);

    expect(screen.getByTestId('temporary-mute-dialog')).toBeInTheDocument();
    expect(screen.getByText('TemporaryMuteDialog_Title')).toBeInTheDocument();
    expect(
      screen.getByText('TemporaryMuteDialog_MuteUserTemplate'),
    ).toBeInTheDocument();
  });

  it('renders all duration radio options', () => {
    render(<TemporaryMuteDialog {...defaultProps} />);

    expect(screen.getByTestId('duration-option-1h')).toBeInTheDocument();
    expect(screen.getByTestId('duration-option-8h')).toBeInTheDocument();
    expect(screen.getByTestId('duration-option-24h')).toBeInTheDocument();
    expect(screen.getByTestId('duration-option-7d')).toBeInTheDocument();
    expect(screen.getByTestId('duration-option-30d')).toBeInTheDocument();
    expect(screen.getByTestId('duration-option-permanent')).toBeInTheDocument();
  });

  it('defaults to 1 hour selection', () => {
    render(<TemporaryMuteDialog {...defaultProps} />);

    const oneHourRadio = screen
      .getByTestId('duration-option-1h')
      .querySelector('input[type="radio"]') as HTMLInputElement;
    expect(oneHourRadio.checked).toBe(true);
  });

  it('calls onMute with selected duration when Mute is clicked', () => {
    render(<TemporaryMuteDialog {...defaultProps} />);

    // Select 7 days
    const sevenDayRadio = screen
      .getByTestId('duration-option-7d')
      .querySelector('input[type="radio"]') as HTMLInputElement;
    fireEvent.click(sevenDayRadio);

    fireEvent.click(screen.getByTestId('mute-button'));
    expect(defaultProps.onMute).toHaveBeenCalledWith(MuteDuration.SevenDays);
  });

  it('calls onMute with permanent when permanent option is selected', () => {
    render(<TemporaryMuteDialog {...defaultProps} />);

    const permanentRadio = screen
      .getByTestId('duration-option-permanent')
      .querySelector('input[type="radio"]') as HTMLInputElement;
    fireEvent.click(permanentRadio);

    fireEvent.click(screen.getByTestId('mute-button'));
    expect(defaultProps.onMute).toHaveBeenCalledWith(MuteDuration.Permanent);
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<TemporaryMuteDialog {...defaultProps} />);

    fireEvent.click(screen.getByTestId('cancel-button'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when open is false', () => {
    render(<TemporaryMuteDialog {...defaultProps} open={false} />);

    expect(
      screen.queryByTestId('temporary-mute-dialog'),
    ).not.toBeInTheDocument();
  });

  it('renders Mute and Cancel action buttons', () => {
    render(<TemporaryMuteDialog {...defaultProps} />);

    expect(screen.getByTestId('mute-button')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
  });
});
