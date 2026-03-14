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
  FilterableConnectionList,
  ListTimelineFilter,
} from './ListTimelineFilter';

const makeLists = (): FilterableConnectionList[] => [
  { _id: 'list-1', name: 'Close Friends', memberCount: 12 },
  { _id: 'list-2', name: 'Work', memberCount: 30 },
  { _id: 'list-3', name: 'Gaming', memberCount: 5 },
];

describe('ListTimelineFilter', () => {
  it('renders the title', () => {
    render(
      <ListTimelineFilter
        lists={makeLists()}
        selectedListId={null}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByText('ListTimelineFilter_Title')).toBeInTheDocument();
  });

  it('renders the "All connections" default option', () => {
    render(
      <ListTimelineFilter
        lists={makeLists()}
        selectedListId={null}
        onChange={jest.fn()}
      />,
    );

    // The select should display the "All connections" text when nothing is selected
    expect(
      screen.getByText('ListTimelineFilter_AllConnections'),
    ).toBeInTheDocument();
  });

  it('renders all list options in the dropdown', () => {
    const { baseElement } = render(
      <ListTimelineFilter
        lists={makeLists()}
        selectedListId={null}
        onChange={jest.fn()}
      />,
    );

    // Open the select dropdown
    const selectButton = baseElement.querySelector(
      '[data-testid="list-timeline-select"] .MuiSelect-select',
    )!;
    fireEvent.mouseDown(selectButton);

    expect(screen.getByTestId('list-option-all')).toBeInTheDocument();
    expect(screen.getByTestId('list-option-list-1')).toBeInTheDocument();
    expect(screen.getByTestId('list-option-list-2')).toBeInTheDocument();
    expect(screen.getByTestId('list-option-list-3')).toBeInTheDocument();
  });

  it('calls onChange with list ID when a list is selected', () => {
    const onChange = jest.fn();
    const { baseElement } = render(
      <ListTimelineFilter
        lists={makeLists()}
        selectedListId={null}
        onChange={onChange}
      />,
    );

    // Open the select dropdown
    const selectButton = baseElement.querySelector(
      '[data-testid="list-timeline-select"] .MuiSelect-select',
    )!;
    fireEvent.mouseDown(selectButton);

    // Click a list option
    fireEvent.click(screen.getByTestId('list-option-list-2'));

    expect(onChange).toHaveBeenCalledWith('list-2');
  });

  it('calls onChange with null when "All connections" is selected', () => {
    const onChange = jest.fn();
    const { baseElement } = render(
      <ListTimelineFilter
        lists={makeLists()}
        selectedListId="list-1"
        onChange={onChange}
      />,
    );

    // Open the select dropdown
    const selectButton = baseElement.querySelector(
      '[data-testid="list-timeline-select"] .MuiSelect-select',
    )!;
    fireEvent.mouseDown(selectButton);

    fireEvent.click(screen.getByTestId('list-option-all'));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows clear filter button when a list is selected', () => {
    render(
      <ListTimelineFilter
        lists={makeLists()}
        selectedListId="list-1"
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('list-timeline-clear')).toBeInTheDocument();
  });

  it('hides clear filter button when no list is selected', () => {
    render(
      <ListTimelineFilter
        lists={makeLists()}
        selectedListId={null}
        onChange={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('list-timeline-clear')).not.toBeInTheDocument();
  });

  it('calls onChange with null when clear button is clicked', () => {
    const onChange = jest.fn();
    render(
      <ListTimelineFilter
        lists={makeLists()}
        selectedListId="list-2"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByTestId('list-timeline-clear'));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('renders with empty lists', () => {
    render(
      <ListTimelineFilter
        lists={[]}
        selectedListId={null}
        onChange={jest.fn()}
      />,
    );

    expect(
      screen.getByText('ListTimelineFilter_AllConnections'),
    ).toBeInTheDocument();
  });

  it('disables the select when disabled prop is true', () => {
    const { baseElement } = render(
      <ListTimelineFilter
        lists={makeLists()}
        selectedListId={null}
        onChange={jest.fn()}
        disabled
      />,
    );

    const selectInput = baseElement.querySelector(
      '[data-testid="list-timeline-select"] .MuiSelect-select',
    );
    expect(selectInput).toHaveAttribute('aria-disabled', 'true');
  });
});
