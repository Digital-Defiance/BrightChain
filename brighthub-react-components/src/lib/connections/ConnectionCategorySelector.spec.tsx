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

import { IBaseConnectionCategory } from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConnectionCategorySelector } from './ConnectionCategorySelector';

const makeCategory = (
  overrides: Partial<IBaseConnectionCategory<string>> = {},
): IBaseConnectionCategory<string> => ({
  _id: 'cat-1',
  ownerId: 'user-1',
  name: 'Close Friends',
  color: '#ff0000',
  icon: 'heart',
  isDefault: true,
  createdAt: '2024-01-15T00:00:00Z',
  ...overrides,
});

const categories: IBaseConnectionCategory<string>[] = [
  makeCategory(),
  makeCategory({
    _id: 'cat-2',
    name: 'Professional',
    color: '#0000ff',
    icon: undefined,
    isDefault: false,
  }),
  makeCategory({
    _id: 'cat-3',
    name: 'Family',
    color: undefined,
    icon: 'users',
    isDefault: false,
  }),
];

describe('ConnectionCategorySelector', () => {
  it('renders categories with names', () => {
    render(
      <ConnectionCategorySelector
        categories={categories}
        selectedCategoryIds={[]}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Close Friends')).toBeInTheDocument();
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('Family')).toBeInTheDocument();
  });

  it('shows selected state for selected categories', () => {
    render(
      <ConnectionCategorySelector
        categories={categories}
        selectedCategoryIds={['cat-1', 'cat-3']}
        onChange={jest.fn()}
      />,
    );

    const cb1 = screen
      .getByTestId('category-checkbox-cat-1')
      .querySelector('input');
    const cb2 = screen
      .getByTestId('category-checkbox-cat-2')
      .querySelector('input');
    const cb3 = screen
      .getByTestId('category-checkbox-cat-3')
      .querySelector('input');

    expect(cb1).toBeChecked();
    expect(cb2).not.toBeChecked();
    expect(cb3).toBeChecked();
  });

  it('calls onChange when category is toggled on', () => {
    const onChange = jest.fn();
    render(
      <ConnectionCategorySelector
        categories={categories}
        selectedCategoryIds={['cat-1']}
        onChange={onChange}
      />,
    );

    const cb2 = screen
      .getByTestId('category-checkbox-cat-2')
      .querySelector('input')!;
    fireEvent.click(cb2);

    expect(onChange).toHaveBeenCalledWith(['cat-1', 'cat-2']);
  });

  it('calls onChange when category is toggled off', () => {
    const onChange = jest.fn();
    render(
      <ConnectionCategorySelector
        categories={categories}
        selectedCategoryIds={['cat-1', 'cat-2']}
        onChange={onChange}
      />,
    );

    const cb1 = screen
      .getByTestId('category-checkbox-cat-1')
      .querySelector('input')!;
    fireEvent.click(cb1);

    expect(onChange).toHaveBeenCalledWith(['cat-2']);
  });

  it('displays color indicators', () => {
    render(
      <ConnectionCategorySelector
        categories={categories}
        selectedCategoryIds={[]}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('color-swatch-cat-1')).toBeInTheDocument();
    expect(screen.getByTestId('color-swatch-cat-2')).toBeInTheDocument();
    // cat-3 has no color
    expect(screen.queryByTestId('color-swatch-cat-3')).not.toBeInTheDocument();
  });

  it('shows disabled state', () => {
    const onChange = jest.fn();
    render(
      <ConnectionCategorySelector
        categories={categories}
        selectedCategoryIds={[]}
        onChange={onChange}
        disabled
      />,
    );

    const cb1 = screen
      .getByTestId('category-checkbox-cat-1')
      .querySelector('input');
    expect(cb1).toBeDisabled();

    // Clicking should not trigger onChange
    fireEvent.click(cb1!);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows default indicator for default categories', () => {
    render(
      <ConnectionCategorySelector
        categories={categories}
        selectedCategoryIds={[]}
        onChange={jest.fn()}
      />,
    );

    // cat-1 is default
    expect(screen.getByTestId('default-indicator-cat-1')).toBeInTheDocument();
    // cat-2 and cat-3 are not default
    expect(
      screen.queryByTestId('default-indicator-cat-2'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('default-indicator-cat-3'),
    ).not.toBeInTheDocument();
  });
});
