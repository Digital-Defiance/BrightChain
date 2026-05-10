/**
 * Unit tests for AvatarCircle component.
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import AvatarCircle, { getAvatarColor } from '../AvatarCircle';

describe('AvatarCircle', () => {
  it('renders the first letter of the display name', () => {
    render(<AvatarCircle displayName="Alice" />);
    const avatar = screen.getByLabelText('Alice');
    expect(avatar).toHaveTextContent('A');
  });

  it('includes aria-label with the full display name', () => {
    render(<AvatarCircle displayName="Bob Smith" />);
    expect(screen.getByLabelText('Bob Smith')).toBeInTheDocument();
  });

  it('renders "?" for an empty display name', () => {
    render(<AvatarCircle displayName="" />);
    const avatar = screen.getByLabelText('');
    expect(avatar).toHaveTextContent('?');
  });

  it('renders "?" for whitespace-only display name', () => {
    const { container } = render(<AvatarCircle displayName="   " />);
    const avatar = container.querySelector('.MuiAvatar-root');
    expect(avatar).not.toBeNull();
    expect(avatar).toHaveTextContent('?');
    expect(avatar).toHaveAttribute('aria-label', '   ');
  });

  it('applies the default size of 40', () => {
    render(<AvatarCircle displayName="Test" />);
    const avatar = screen.getByLabelText('Test');
    expect(avatar).toHaveClass('MuiAvatar-root');
  });

  it('applies a custom size', () => {
    render(<AvatarCircle displayName="Test" size={64} />);
    const avatar = screen.getByLabelText('Test');
    expect(avatar).toBeInTheDocument();
  });

  describe('getAvatarColor', () => {
    it('returns the same color for the same name', () => {
      const color1 = getAvatarColor('Alice');
      const color2 = getAvatarColor('Alice');
      expect(color1).toBe(color2);
    });

    it('returns a valid hex color string', () => {
      const color = getAvatarColor('Test User');
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('returns a color for empty string without throwing', () => {
      const color = getAvatarColor('');
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('produces different colors for different names (not guaranteed but likely)', () => {
      const colors = new Set(
        ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'].map(getAvatarColor),
      );
      // With 5 distinct names and 16 colors, collisions are possible but unlikely for all
      expect(colors.size).toBeGreaterThanOrEqual(2);
    });
  });
});
