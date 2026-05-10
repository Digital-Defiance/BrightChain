/**
 * Unit tests for FontAwesomeIconPicker component.
 *
 * Validates dialog rendering, search filtering, style selection,
 * icon selection callback, and "Remove Icon" behaviour.
 */

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tBranded: (key: string) => {
      // Return human-readable strings for the icon picker keys so assertions
      // remain readable while still exercising the i18n path.
      const map: Record<string, string> = {
        IconPicker_Title: 'Choose an Icon',
        IconPicker_SearchPlaceholder: 'Search icons...',
        IconPicker_NoMatchTemplate: 'No icons match "{0}"',
        IconPicker_Cancel: 'Cancel',
        IconPicker_RemoveIcon: 'Remove Icon',
        IconPicker_CurrentLabel: 'Current:',
      };
      return map[key] ?? key;
    },
    tComponent: (_: string, key: string) => key,
  }),
}));

import { fireEvent, render, screen } from '@testing-library/react';
import FontAwesomeIconPicker from '../FontAwesomeIconPicker';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('FontAwesomeIconPicker', () => {
  it('renders the dialog when open is true', () => {
    render(
      <FontAwesomeIconPicker
        open={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByTestId('fa-icon-picker-dialog')).toBeTruthy();
    expect(screen.getByText('Choose an Icon')).toBeTruthy();
  });

  it('does not render dialog content when open is false', () => {
    render(
      <FontAwesomeIconPicker
        open={false}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('fa-icon-picker-dialog')).toBeNull();
  });

  it('shows search input', () => {
    render(
      <FontAwesomeIconPicker
        open={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByTestId('fa-icon-search')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search icons...')).toBeTruthy();
  });

  it('shows style selector chips', () => {
    render(
      <FontAwesomeIconPicker
        open={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByText('Solid')).toBeTruthy();
    expect(screen.getByText('Regular')).toBeTruthy();
    expect(screen.getByText('Light')).toBeTruthy();
    expect(screen.getByText('Brands')).toBeTruthy();
  });

  it('calls onSelect with the correct FA class when an icon is clicked', () => {
    const onSelect = jest.fn();
    render(
      <FontAwesomeIconPicker
        open={true}
        onClose={jest.fn()}
        onSelect={onSelect}
      />,
    );

    // Search for "heart" to ensure it appears in the filtered results
    const searchInput = screen.getByPlaceholderText('Search icons...');
    fireEvent.change(searchInput, { target: { value: 'heart' } });

    const heartBtn = screen.getByTestId('fa-icon-heart');
    fireEvent.click(heartBtn);

    // Default style is solid
    expect(onSelect).toHaveBeenCalledWith('fa-solid fa-heart');
  });

  it('shows "Remove Icon" button when currentFaClass is provided', () => {
    render(
      <FontAwesomeIconPicker
        open={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        currentFaClass="fa-solid fa-star"
      />,
    );

    expect(screen.getByTestId('fa-icon-clear')).toBeTruthy();
    expect(screen.getByText('Remove Icon')).toBeTruthy();
  });

  it('calls onSelect with empty string when "Remove Icon" is clicked', () => {
    const onSelect = jest.fn();
    render(
      <FontAwesomeIconPicker
        open={true}
        onClose={jest.fn()}
        onSelect={onSelect}
        currentFaClass="fa-solid fa-star"
      />,
    );

    fireEvent.click(screen.getByTestId('fa-icon-clear'));
    expect(onSelect).toHaveBeenCalledWith('');
  });

  it('filters icons based on search input', () => {
    render(
      <FontAwesomeIconPicker
        open={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    // The default view shows the first 120 icons alphabetically.
    // "abacus" and "acorn" are early in the alphabet and should be visible.
    expect(screen.getByTestId('fa-icon-abacus')).toBeTruthy();
    expect(screen.getByTestId('fa-icon-acorn')).toBeTruthy();

    // Type "abac" in the search input — should match "abacus" but not "acorn"
    const searchInput = screen.getByPlaceholderText('Search icons...');
    fireEvent.change(searchInput, { target: { value: 'abac' } });

    // abacus should still be visible
    expect(screen.getByTestId('fa-icon-abacus')).toBeTruthy();

    // acorn should no longer be visible
    expect(screen.queryByTestId('fa-icon-acorn')).toBeNull();
  });

  it('shows brand icons when Brands style is selected', () => {
    render(
      <FontAwesomeIconPicker
        open={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    );

    // Click the "Brands" chip
    fireEvent.click(screen.getByText('Brands'));

    // The icon grid should contain brand icons from the kit
    const grid = screen.getByTestId('fa-icon-grid');
    const iconButtons = grid.querySelectorAll('[data-testid^="fa-icon-"]');

    // Should show many brand icons (the kit has 587 brands, capped at 120)
    expect(iconButtons.length).toBeGreaterThan(10);
  });
});
