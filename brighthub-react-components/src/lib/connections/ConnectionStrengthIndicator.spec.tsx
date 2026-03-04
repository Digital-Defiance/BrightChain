// Mock @brightchain/brightchain-lib to avoid the full ECIES/GUID init chain.
jest.mock('@brightchain/brightchain-lib', () => ({
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

import { ConnectionStrength } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ConnectionStrengthIndicator } from './ConnectionStrengthIndicator';

describe('ConnectionStrengthIndicator', () => {
  it('renders with Strong strength', () => {
    render(
      <ConnectionStrengthIndicator strength={ConnectionStrength.Strong} />,
    );

    expect(
      screen.getByTestId('connection-strength-indicator'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('strength-label')).toHaveTextContent(
      'ConnectionStrengthIndicator_Strong',
    );
  });

  it('renders with Moderate strength', () => {
    render(
      <ConnectionStrengthIndicator strength={ConnectionStrength.Moderate} />,
    );

    expect(screen.getByTestId('strength-label')).toHaveTextContent(
      'ConnectionStrengthIndicator_Moderate',
    );
  });

  it('renders with Weak strength', () => {
    render(<ConnectionStrengthIndicator strength={ConnectionStrength.Weak} />);

    expect(screen.getByTestId('strength-label')).toHaveTextContent(
      'ConnectionStrengthIndicator_Weak',
    );
  });

  it('renders with Dormant strength', () => {
    render(
      <ConnectionStrengthIndicator strength={ConnectionStrength.Dormant} />,
    );

    expect(screen.getByTestId('strength-label')).toHaveTextContent(
      'ConnectionStrengthIndicator_Dormant',
    );
  });

  it('renders the visual dot indicator', () => {
    render(
      <ConnectionStrengthIndicator strength={ConnectionStrength.Strong} />,
    );

    expect(screen.getByTestId('strength-dot')).toBeInTheDocument();
  });

  it('has proper aria-label for accessibility', () => {
    render(
      <ConnectionStrengthIndicator strength={ConnectionStrength.Strong} />,
    );

    expect(
      screen.getByLabelText('ConnectionStrengthIndicator_AriaLabel'),
    ).toBeInTheDocument();
  });
});
