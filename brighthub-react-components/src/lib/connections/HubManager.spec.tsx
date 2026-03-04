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

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { HubManager } from './HubManager';

const makeHubs = () => [
  {
    _id: 'hub-1',
    ownerId: 'user-1',
    name: 'Close Friends',
    memberCount: 8,
    isDefault: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    _id: 'hub-2',
    ownerId: 'user-1',
    name: 'Gaming Crew',
    memberCount: 4,
    isDefault: false,
    createdAt: '2024-02-01T00:00:00Z',
  },
];

describe('HubManager', () => {
  it('renders list of hubs', () => {
    const hubs = makeHubs();
    render(<HubManager hubs={hubs} />);

    expect(screen.getByText('Close Friends')).toBeInTheDocument();
    expect(screen.getByText('Gaming Crew')).toBeInTheDocument();
  });

  it('shows empty state when no hubs', () => {
    render(<HubManager hubs={[]} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows default badge for default hubs', () => {
    const hubs = makeHubs();
    render(<HubManager hubs={hubs} />);

    expect(screen.getByTestId('default-badge')).toBeInTheDocument();
  });

  it('opens create dialog when create button is clicked', () => {
    render(<HubManager hubs={[]} />);

    const createBtn = screen.getByRole('button', {
      name: 'HubManager_CreateHub',
    });
    fireEvent.click(createBtn);

    // Dialog title should appear (the create variant)
    const dialogTitles = screen.getAllByText('HubManager_CreateHub');
    // Button text + dialog heading
    expect(dialogTitles.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onCreateHub callback', () => {
    const onCreateHub = jest.fn();
    render(<HubManager hubs={[]} onCreateHub={onCreateHub} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'HubManager_CreateHub' }),
    );

    // Fill in the name
    const nameInput = screen.getByLabelText('HubManager_HubName');
    fireEvent.change(nameInput, { target: { value: 'New Hub' } });

    // Submit
    fireEvent.click(screen.getByText('HubManager_Save'));

    expect(onCreateHub).toHaveBeenCalledWith({ name: 'New Hub' });
  });

  it('calls onDeleteHub callback', () => {
    const onDeleteHub = jest.fn();
    const hubs = makeHubs();
    render(<HubManager hubs={hubs} onDeleteHub={onDeleteHub} />);

    // Click the first delete button
    const deleteButtons = screen.getAllByLabelText('HubManager_DeleteHub');
    fireEvent.click(deleteButtons[0]);

    // Confirm deletion in the dialog
    const confirmBtn = screen.getByText('HubManager_DeleteConfirmAction');
    fireEvent.click(confirmBtn);

    expect(onDeleteHub).toHaveBeenCalledWith('hub-1');
  });

  it('calls onUpdateHub callback via edit dialog', () => {
    const onUpdateHub = jest.fn();
    const hubs = makeHubs();
    render(<HubManager hubs={hubs} onUpdateHub={onUpdateHub} />);

    // Click the first edit button
    const editButtons = screen.getAllByLabelText('HubManager_EditHub');
    fireEvent.click(editButtons[0]);

    // Change the name
    const nameInput = screen.getByLabelText('HubManager_HubName');
    fireEvent.change(nameInput, { target: { value: 'Best Friends' } });

    // Submit
    fireEvent.click(screen.getByText('HubManager_Save'));

    expect(onUpdateHub).toHaveBeenCalledWith('hub-1', { name: 'Best Friends' });
  });

  it('shows loading state', () => {
    render(<HubManager hubs={[]} loading />);

    expect(screen.getByLabelText('HubManager_Loading')).toBeInTheDocument();
  });

  it('displays member count chips', () => {
    const hubs = makeHubs();
    render(<HubManager hubs={hubs} />);

    const memberChips = screen.getAllByText('HubManager_MembersTemplate');
    expect(memberChips).toHaveLength(2);
  });
});
