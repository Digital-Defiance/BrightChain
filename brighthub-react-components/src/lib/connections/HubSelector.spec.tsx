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

import { IBaseHub } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { HubSelector } from './HubSelector';

const makeHub = (
  overrides: Partial<IBaseHub<string>> = {},
): IBaseHub<string> => ({
  _id: 'hub-1',
  ownerId: 'user-1',
  name: 'Close Friends',
  memberCount: 12,
  isDefault: true,
  createdAt: '2024-01-15T00:00:00Z',
  ...overrides,
});

const hubs: IBaseHub<string>[] = [
  makeHub(),
  makeHub({
    _id: 'hub-2',
    name: 'Work Colleagues',
    memberCount: 8,
    isDefault: false,
  }),
  makeHub({
    _id: 'hub-3',
    name: 'Gaming Crew',
    memberCount: 25,
    isDefault: false,
  }),
];

describe('HubSelector', () => {
  it('renders hubs with names', () => {
    render(
      <HubSelector hubs={hubs} selectedHubIds={[]} onChange={jest.fn()} />,
    );

    expect(screen.getByText('Close Friends')).toBeInTheDocument();
    expect(screen.getByText('Work Colleagues')).toBeInTheDocument();
    expect(screen.getByText('Gaming Crew')).toBeInTheDocument();
  });

  it('displays member counts for each hub', () => {
    render(
      <HubSelector hubs={hubs} selectedHubIds={[]} onChange={jest.fn()} />,
    );

    expect(screen.getByTestId('hub-members-hub-1')).toBeInTheDocument();
    expect(screen.getByTestId('hub-members-hub-2')).toBeInTheDocument();
    expect(screen.getByTestId('hub-members-hub-3')).toBeInTheDocument();
  });

  it('shows selected state for selected hubs', () => {
    render(
      <HubSelector
        hubs={hubs}
        selectedHubIds={['hub-1', 'hub-3']}
        onChange={jest.fn()}
      />,
    );

    const cb1 = screen.getByTestId('hub-checkbox-hub-1').querySelector('input');
    const cb2 = screen.getByTestId('hub-checkbox-hub-2').querySelector('input');
    const cb3 = screen.getByTestId('hub-checkbox-hub-3').querySelector('input');

    expect(cb1).toBeChecked();
    expect(cb2).not.toBeChecked();
    expect(cb3).toBeChecked();
  });

  it('calls onChange when hub is toggled on', () => {
    const onChange = jest.fn();
    render(
      <HubSelector
        hubs={hubs}
        selectedHubIds={['hub-1']}
        onChange={onChange}
      />,
    );

    const cb2 = screen
      .getByTestId('hub-checkbox-hub-2')
      .querySelector('input')!;
    fireEvent.click(cb2);

    expect(onChange).toHaveBeenCalledWith(['hub-1', 'hub-2']);
  });

  it('calls onChange when hub is toggled off', () => {
    const onChange = jest.fn();
    render(
      <HubSelector
        hubs={hubs}
        selectedHubIds={['hub-1', 'hub-2']}
        onChange={onChange}
      />,
    );

    const cb1 = screen
      .getByTestId('hub-checkbox-hub-1')
      .querySelector('input')!;
    fireEvent.click(cb1);

    expect(onChange).toHaveBeenCalledWith(['hub-2']);
  });

  it('shows default badge for default hubs', () => {
    render(
      <HubSelector hubs={hubs} selectedHubIds={[]} onChange={jest.fn()} />,
    );

    expect(screen.getByTestId('hub-default-hub-1')).toBeInTheDocument();
    expect(screen.queryByTestId('hub-default-hub-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hub-default-hub-3')).not.toBeInTheDocument();
  });

  it('shows disabled state', () => {
    const onChange = jest.fn();
    render(
      <HubSelector
        hubs={hubs}
        selectedHubIds={[]}
        onChange={onChange}
        disabled
      />,
    );

    const cb1 = screen.getByTestId('hub-checkbox-hub-1').querySelector('input');
    expect(cb1).toBeDisabled();

    fireEvent.click(cb1!);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows empty state when no hubs available', () => {
    render(<HubSelector hubs={[]} selectedHubIds={[]} onChange={jest.fn()} />);

    expect(screen.getByTestId('no-hubs')).toBeInTheDocument();
  });

  it('shows "none selected" summary when no hubs selected', () => {
    render(
      <HubSelector hubs={hubs} selectedHubIds={[]} onChange={jest.fn()} />,
    );

    const summary = screen.getByTestId('hub-selection-summary');
    expect(summary).toHaveTextContent('HubSelector_NoneSelected');
  });

  it('shows selected count summary when hubs are selected', () => {
    render(
      <HubSelector
        hubs={hubs}
        selectedHubIds={['hub-1', 'hub-3']}
        onChange={jest.fn()}
      />,
    );

    const summary = screen.getByTestId('hub-selection-summary');
    expect(summary).toHaveTextContent('HubSelector_SelectedCountTemplate');
  });
});
