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
import { ConversationSearch } from './ConversationSearch';

describe('ConversationSearch', () => {
  it('renders search input', () => {
    render(<ConversationSearch onSearch={jest.fn()} />);
    expect(
      screen.getByPlaceholderText('ConversationSearch_Placeholder'),
    ).toBeInTheDocument();
  });

  it('calls onSearch when typing', () => {
    const onSearch = jest.fn();
    render(<ConversationSearch onSearch={onSearch} />);
    const input = screen.getByPlaceholderText('ConversationSearch_Placeholder');
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(onSearch).toHaveBeenCalledWith('hello');
  });

  it('shows result count when provided', () => {
    const onSearch = jest.fn();
    render(<ConversationSearch onSearch={onSearch} resultCount={5} />);
    // Type something to trigger the result display
    const input = screen.getByPlaceholderText('ConversationSearch_Placeholder');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(
      screen.getByText('ConversationSearch_ResultCountTemplate'),
    ).toBeInTheDocument();
  });

  it('shows no results message', () => {
    const onSearch = jest.fn();
    render(<ConversationSearch onSearch={onSearch} resultCount={0} />);
    const input = screen.getByPlaceholderText('ConversationSearch_Placeholder');
    fireEvent.change(input, { target: { value: 'xyz' } });
    expect(
      screen.getByText('ConversationSearch_NoResults'),
    ).toBeInTheDocument();
  });

  it('clears search when clear button is clicked', () => {
    const onSearch = jest.fn();
    render(<ConversationSearch onSearch={onSearch} />);
    const input = screen.getByPlaceholderText('ConversationSearch_Placeholder');
    fireEvent.change(input, { target: { value: 'test' } });
    const clearBtn = screen.getByLabelText('ConversationSearch_Clear');
    fireEvent.click(clearBtn);
    expect(onSearch).toHaveBeenLastCalledWith('');
  });
});
