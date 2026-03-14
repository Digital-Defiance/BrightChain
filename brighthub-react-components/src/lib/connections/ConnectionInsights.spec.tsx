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

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  ConnectionInsights,
  ConnectionInsightsData,
} from './ConnectionInsights';

const sampleData: ConnectionInsightsData = {
  interactions: 42,
  messages: 10,
  likes: 15,
  reposts: 7,
  replies: 10,
};

describe('ConnectionInsights', () => {
  it('renders title and period selector', () => {
    render(<ConnectionInsights period="7d" data={sampleData} />);

    expect(screen.getByText('ConnectionInsights_Title')).toBeInTheDocument();
    expect(screen.getByTestId('period-selector')).toBeInTheDocument();
  });

  it('renders all period options', () => {
    render(<ConnectionInsights period="7d" data={sampleData} />);

    expect(screen.getByTestId('period-7d')).toBeInTheDocument();
    expect(screen.getByTestId('period-30d')).toBeInTheDocument();
    expect(screen.getByTestId('period-90d')).toBeInTheDocument();
    expect(screen.getByTestId('period-all')).toBeInTheDocument();
  });

  it('displays interaction statistics when data is provided', () => {
    render(<ConnectionInsights period="30d" data={sampleData} />);

    expect(screen.getByTestId('stats-grid')).toBeInTheDocument();
    expect(screen.getByTestId('stat-interactions')).toHaveTextContent('42');
    expect(screen.getByTestId('stat-messages')).toHaveTextContent('10');
    expect(screen.getByTestId('stat-likes')).toHaveTextContent('15');
    expect(screen.getByTestId('stat-reposts')).toHaveTextContent('7');
    expect(screen.getByTestId('stat-replies')).toHaveTextContent('10');
  });

  it('shows empty state when no data is provided', () => {
    render(<ConnectionInsights period="7d" />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(
      screen.getByText('ConnectionInsights_EmptyState'),
    ).toBeInTheDocument();
  });

  it('shows loading spinner when loading with no data', () => {
    render(<ConnectionInsights period="7d" loading />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('calls onPeriodChange when a different period is selected', () => {
    const onPeriodChange = jest.fn();
    render(
      <ConnectionInsights
        period="7d"
        data={sampleData}
        onPeriodChange={onPeriodChange}
      />,
    );

    fireEvent.click(screen.getByTestId('period-90d'));
    expect(onPeriodChange).toHaveBeenCalledWith('90d');
  });

  it('does not call onPeriodChange when the same period is clicked', () => {
    const onPeriodChange = jest.fn();
    render(
      <ConnectionInsights
        period="7d"
        data={sampleData}
        onPeriodChange={onPeriodChange}
      />,
    );

    // Clicking the already-selected period yields null from MUI, which we ignore
    fireEvent.click(screen.getByTestId('period-7d'));
    expect(onPeriodChange).not.toHaveBeenCalled();
  });

  it('renders data-testid on root element', () => {
    render(<ConnectionInsights period="7d" data={sampleData} />);

    expect(screen.getByTestId('connection-insights')).toBeInTheDocument();
  });

  it('shows stats grid even while loading if data exists', () => {
    render(<ConnectionInsights period="7d" data={sampleData} loading />);

    expect(screen.getByTestId('stats-grid')).toBeInTheDocument();
  });
});
