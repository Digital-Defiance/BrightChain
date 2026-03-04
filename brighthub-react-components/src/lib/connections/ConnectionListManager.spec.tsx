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

import { ConnectionVisibility } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConnectionListManager } from './ConnectionListManager';

const makeLists = () => [
  {
    _id: 'list-1',
    ownerId: 'user-1',
    name: 'Close Friends',
    description: 'My closest connections',
    visibility: ConnectionVisibility.Private,
    memberCount: 12,
    followerCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    _id: 'list-2',
    ownerId: 'user-1',
    name: 'Work',
    visibility: ConnectionVisibility.Public,
    memberCount: 5,
    followerCount: 3,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
];

describe('ConnectionListManager', () => {
  it('renders list of connection lists', () => {
    const lists = makeLists();
    render(<ConnectionListManager lists={lists} />);

    expect(screen.getByText('Close Friends')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('My closest connections')).toBeInTheDocument();
  });

  it('shows empty state when no lists', () => {
    render(<ConnectionListManager lists={[]} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('opens create dialog when create button is clicked', () => {
    render(<ConnectionListManager lists={[]} />);

    const createBtn = screen.getByRole('button', {
      name: 'ConnectionListManager_CreateList',
    });
    fireEvent.click(createBtn);

    // Dialog title should appear (the create variant)
    const dialogTitles = screen.getAllByText(
      'ConnectionListManager_CreateList',
    );
    // Button text + dialog heading
    expect(dialogTitles.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onDeleteList callback', () => {
    const onDeleteList = jest.fn();
    const lists = makeLists();
    render(<ConnectionListManager lists={lists} onDeleteList={onDeleteList} />);

    // Click the first delete button
    const deleteButtons = screen.getAllByLabelText(
      'ConnectionListManager_DeleteList',
    );
    fireEvent.click(deleteButtons[0]);

    // Confirm deletion in the dialog
    const confirmBtn = screen.getByText(
      'ConnectionListManager_DeleteConfirmAction',
    );
    fireEvent.click(confirmBtn);

    expect(onDeleteList).toHaveBeenCalledWith('list-1');
  });

  it('displays visibility indicators', () => {
    const lists = makeLists();
    render(<ConnectionListManager lists={lists} />);

    expect(screen.getByTestId('visibility-private')).toBeInTheDocument();
    expect(screen.getByTestId('visibility-public')).toBeInTheDocument();
  });
});
