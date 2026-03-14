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
import type { AggregatedReaction } from './MessageReactions';
import { MessageReactions } from './MessageReactions';

const reactions: AggregatedReaction[] = [
  { emoji: '👍', count: 3, reacted: true },
  { emoji: '❤️', count: 1, reacted: false },
];

describe('MessageReactions', () => {
  it('renders reaction chips', () => {
    render(<MessageReactions reactions={reactions} />);
    expect(screen.getByTestId('reaction-👍')).toBeInTheDocument();
    expect(screen.getByTestId('reaction-❤️')).toBeInTheDocument();
  });

  it('calls onToggleReaction when a chip is clicked', () => {
    const onToggle = jest.fn();
    render(
      <MessageReactions reactions={reactions} onToggleReaction={onToggle} />,
    );
    fireEvent.click(screen.getByTestId('reaction-👍'));
    expect(onToggle).toHaveBeenCalledWith('👍');
  });

  it('renders add reaction button when callback provided', () => {
    const onAdd = jest.fn();
    render(<MessageReactions reactions={reactions} onAddReaction={onAdd} />);
    const addBtn = screen.getByLabelText('MessageReactions_AddReaction');
    fireEvent.click(addBtn);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('does not render add button when no callback', () => {
    render(<MessageReactions reactions={reactions} />);
    expect(
      screen.queryByLabelText('MessageReactions_AddReaction'),
    ).not.toBeInTheDocument();
  });
});
