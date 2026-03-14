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

import { NotificationCategory } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { NotificationCategoryFilter } from './NotificationCategoryFilter';

describe('NotificationCategoryFilter', () => {
  it('renders all category chips', () => {
    render(
      <NotificationCategoryFilter
        selectedCategories={[]}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId('filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-social')).toBeInTheDocument();
    expect(screen.getByTestId('filter-messages')).toBeInTheDocument();
    expect(screen.getByTestId('filter-connections')).toBeInTheDocument();
    expect(screen.getByTestId('filter-system')).toBeInTheDocument();
  });

  it('highlights "All" when no categories selected', () => {
    render(
      <NotificationCategoryFilter
        selectedCategories={[]}
        onChange={jest.fn()}
      />,
    );
    const allChip = screen.getByTestId('filter-all');
    expect(allChip).toHaveClass('MuiChip-filled');
  });

  it('calls onChange with category when a chip is clicked', () => {
    const onChange = jest.fn();
    render(
      <NotificationCategoryFilter
        selectedCategories={[]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('filter-social'));
    expect(onChange).toHaveBeenCalledWith([NotificationCategory.Social]);
  });

  it('removes category when already selected chip is clicked', () => {
    const onChange = jest.fn();
    render(
      <NotificationCategoryFilter
        selectedCategories={[NotificationCategory.Social]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('filter-social'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('resets to all when "All" chip is clicked', () => {
    const onChange = jest.fn();
    render(
      <NotificationCategoryFilter
        selectedCategories={[NotificationCategory.Social]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('filter-all'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('supports multiple category selection', () => {
    const onChange = jest.fn();
    render(
      <NotificationCategoryFilter
        selectedCategories={[NotificationCategory.Social]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('filter-messages'));
    expect(onChange).toHaveBeenCalledWith([
      NotificationCategory.Social,
      NotificationCategory.Messages,
    ]);
  });
});
