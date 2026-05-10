import { useTheme as useMuiTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  BrightHubThemeProvider,
  useBrightHubTheme,
} from './BrightHubThemeProvider';

describe('BrightHubThemeProvider', () => {
  it('should render children', () => {
    render(
      <BrightHubThemeProvider>
        <div data-testid="child">Test Child</div>
      </BrightHubThemeProvider>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should provide theme context with default light mode', () => {
    const TestComponent = () => {
      const theme = useBrightHubTheme();
      return <div data-testid="mode">{theme.mode}</div>;
    };

    render(
      <BrightHubThemeProvider>
        <TestComponent />
      </BrightHubThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('should support dark mode as default', () => {
    const TestComponent = () => {
      const theme = useBrightHubTheme();
      return <div data-testid="mode">{theme.mode}</div>;
    };

    render(
      <BrightHubThemeProvider defaultMode="dark">
        <TestComponent />
      </BrightHubThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it('should provide MUI theme through MuiThemeProvider', () => {
    const TestComponent = () => {
      const muiTheme = useMuiTheme();
      return (
        <div data-testid="primary-color">{muiTheme.palette.primary.main}</div>
      );
    };

    render(
      <BrightHubThemeProvider>
        <TestComponent />
      </BrightHubThemeProvider>,
    );

    expect(screen.getByTestId('primary-color')).toHaveTextContent('#1DA1F2');
  });

  it('should toggle mode correctly', () => {
    const TestComponent = () => {
      const { mode, toggleMode } = useBrightHubTheme();
      return (
        <>
          <div data-testid="mode">{mode}</div>
          <button data-testid="toggle" onClick={toggleMode}>
            Toggle
          </button>
        </>
      );
    };

    render(
      <BrightHubThemeProvider>
        <TestComponent />
      </BrightHubThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    fireEvent.click(screen.getByTestId('toggle'));
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it('should update MUI theme when mode changes', () => {
    const TestComponent = () => {
      const { toggleMode } = useBrightHubTheme();
      const muiTheme = useMuiTheme();
      return (
        <>
          <div data-testid="palette-mode">{muiTheme.palette.mode}</div>
          <button data-testid="toggle" onClick={toggleMode}>
            Toggle
          </button>
        </>
      );
    };

    render(
      <BrightHubThemeProvider>
        <TestComponent />
      </BrightHubThemeProvider>,
    );

    expect(screen.getByTestId('palette-mode')).toHaveTextContent('light');
    fireEvent.click(screen.getByTestId('toggle'));
    expect(screen.getByTestId('palette-mode')).toHaveTextContent('dark');
  });

  it('should expose muiTheme in context', () => {
    const TestComponent = () => {
      const { muiTheme } = useBrightHubTheme();
      return <div data-testid="has-theme">{muiTheme ? 'yes' : 'no'}</div>;
    };

    render(
      <BrightHubThemeProvider>
        <TestComponent />
      </BrightHubThemeProvider>,
    );

    expect(screen.getByTestId('has-theme')).toHaveTextContent('yes');
  });

  it('should throw error when useBrightHubTheme is used outside provider', () => {
    const TestComponent = () => {
      useBrightHubTheme();
      return null;
    };

    // Suppress console.error for this test
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      'useBrightHubTheme must be used within a BrightHubThemeProvider',
    );

    consoleSpy.mockRestore();
  });
});
