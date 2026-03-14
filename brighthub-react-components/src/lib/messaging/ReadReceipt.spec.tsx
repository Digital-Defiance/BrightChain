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

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ReadReceipt } from './ReadReceipt';

describe('ReadReceipt', () => {
  it('renders sent status with single check', () => {
    render(<ReadReceipt status="sent" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('ReadReceipt_AriaLabel')).toBeInTheDocument();
  });

  it('renders delivered status', () => {
    render(<ReadReceipt status="delivered" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders seen status with timestamp', () => {
    render(<ReadReceipt status="seen" seenAt="2:30 PM" />);
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
  });
});
