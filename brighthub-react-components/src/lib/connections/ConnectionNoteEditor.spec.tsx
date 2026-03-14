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

import { IBaseConnectionNote } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConnectionNoteEditor } from './ConnectionNoteEditor';

const makeNote = (
  overrides: Partial<IBaseConnectionNote<string>> = {},
): IBaseConnectionNote<string> => ({
  _id: 'note-1',
  userId: 'user-1',
  connectionId: 'conn-1',
  note: 'Met at the conference last year.',
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  ...overrides,
});

describe('ConnectionNoteEditor', () => {
  it('renders with existing note content', () => {
    const note = makeNote();
    render(<ConnectionNoteEditor note={note} onSave={jest.fn()} />);

    const textarea = screen.getByTestId('note-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Met at the conference last year.');
  });

  it('shows character count', () => {
    const note = makeNote({ note: 'Hello' });
    render(<ConnectionNoteEditor note={note} onSave={jest.fn()} />);

    expect(screen.getByTestId('char-count')).toHaveTextContent('5/500');
  });

  it('enforces 500 character limit', () => {
    const longText = 'a'.repeat(501);
    render(<ConnectionNoteEditor onSave={jest.fn()} />);

    const textarea = screen.getByTestId('note-textarea');
    fireEvent.change(textarea, { target: { value: longText } });

    expect(screen.getByTestId('char-count')).toHaveTextContent('501/500');
    // Save button should be disabled when over limit
    expect(screen.getByTestId('save-note-button')).toBeDisabled();
  });

  it('calls onSave with note text', () => {
    const onSave = jest.fn();
    render(<ConnectionNoteEditor onSave={onSave} />);

    const textarea = screen.getByTestId('note-textarea');
    fireEvent.change(textarea, { target: { value: 'New note content' } });
    fireEvent.click(screen.getByTestId('save-note-button'));

    expect(onSave).toHaveBeenCalledWith('New note content');
  });

  it('calls onDelete callback after confirmation', () => {
    const onDelete = jest.fn();
    const note = makeNote();
    render(
      <ConnectionNoteEditor
        note={note}
        onSave={jest.fn()}
        onDelete={onDelete}
      />,
    );

    // Click delete button to open confirmation dialog
    fireEvent.click(screen.getByTestId('delete-note-button'));
    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();

    // Confirm deletion
    fireEvent.click(screen.getByTestId('delete-confirm-button'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no note exists', () => {
    render(<ConnectionNoteEditor onSave={jest.fn()} />);

    expect(screen.getByTestId('note-empty-state')).toBeInTheDocument();
  });

  it('disables controls when disabled prop is true', () => {
    const note = makeNote();
    render(
      <ConnectionNoteEditor
        note={note}
        onSave={jest.fn()}
        onDelete={jest.fn()}
        disabled
      />,
    );

    expect(screen.getByTestId('note-textarea')).toBeDisabled();
    expect(screen.getByTestId('save-note-button')).toBeDisabled();
    expect(screen.getByTestId('delete-note-button')).toBeDisabled();
  });
});
