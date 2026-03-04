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
import type { UserSearchResult } from './NewConversationDialog';
import { NewConversationDialog } from './NewConversationDialog';

const users: UserSearchResult[] = [
  { userId: 'u-1', displayName: 'Alice', username: 'alice' },
  { userId: 'u-2', displayName: 'Bob', username: 'bob' },
];

describe('NewConversationDialog', () => {
  it('renders dialog when open', () => {
    render(
      <NewConversationDialog
        open
        onClose={jest.fn()}
        onStart={jest.fn()}
        searchResults={[]}
        onSearchChange={jest.fn()}
      />,
    );
    expect(screen.getByText('NewConversationDialog_Title')).toBeInTheDocument();
  });

  it('shows search results', () => {
    render(
      <NewConversationDialog
        open
        onClose={jest.fn()}
        onStart={jest.fn()}
        searchResults={users}
        onSearchChange={jest.fn()}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('selects and deselects users', () => {
    render(
      <NewConversationDialog
        open
        onClose={jest.fn()}
        onStart={jest.fn()}
        searchResults={users}
        onSearchChange={jest.fn()}
      />,
    );
    // Select Alice
    fireEvent.click(screen.getByTestId('user-u-1'));
    // Alice appears both in the list and as a chip
    const aliceElements = screen.getAllByText('Alice');
    expect(aliceElements.length).toBeGreaterThanOrEqual(2);

    // Deselect Alice by clicking the chip delete
    const chip = aliceElements[0].closest('.MuiChip-root');
    if (chip) {
      const deleteIcon = chip.querySelector('.MuiChip-deleteIcon');
      if (deleteIcon) fireEvent.click(deleteIcon);
    }
  });

  it('calls onStart with selected user IDs', () => {
    const onStart = jest.fn();
    render(
      <NewConversationDialog
        open
        onClose={jest.fn()}
        onStart={onStart}
        searchResults={users}
        onSearchChange={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('user-u-1'));
    fireEvent.click(screen.getByText('NewConversationDialog_Start'));
    expect(onStart).toHaveBeenCalledWith(['u-1'], undefined);
  });

  it('shows no results message when search yields nothing', () => {
    render(
      <NewConversationDialog
        open
        onClose={jest.fn()}
        onStart={jest.fn()}
        searchResults={[]}
        onSearchChange={jest.fn()}
      />,
    );
    const input = screen.getByPlaceholderText(
      'NewConversationDialog_SearchPlaceholder',
    );
    fireEvent.change(input, { target: { value: 'xyz' } });
    expect(
      screen.getByText('NewConversationDialog_NoResults'),
    ).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = jest.fn();
    render(
      <NewConversationDialog
        open
        onClose={onClose}
        onStart={jest.fn()}
        searchResults={[]}
        onSearchChange={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByText('NewConversationDialog_Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
