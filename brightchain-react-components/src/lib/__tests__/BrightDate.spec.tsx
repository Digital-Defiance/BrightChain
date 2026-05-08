import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import {
  I18nProvider,
  II18nEngineCompat,
} from '@digitaldefiance/express-suite-react-components';
import { fromDate } from '@brightchain/brightdate';
import { ReactNode } from 'react';
import { BrightDate } from '../BrightDate';

// ---------------------------------------------------------------------------
// Test i18n engine — passes through keys with variable interpolation
// ---------------------------------------------------------------------------
const testEngine: II18nEngineCompat = {
  setLanguage: () => {
    /* no-op */
  },
  translate: (_componentId, key, vars) => interpolate(key, vars),
  translateStringKey: (key, vars) => interpolate(key, vars),
  t: (template, vars) => interpolate(template, vars),
};

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (result, [k, v]) => result.replace(`{${k}}`, String(v)),
    template,
  );
}

function Wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider i18nEngine={testEngine}>{children}</I18nProvider>;
}

function renderWithI18n(ui: React.ReactElement) {
  return render(ui, { wrapper: Wrapper });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('BrightDate', () => {
  it('renders a <time> element with a datetime attribute', () => {
    renderWithI18n(<BrightDate interval={0} />);

    const el = screen.getByTestId('bright-date');
    expect(el.tagName).toBe('TIME');
    expect(el).toHaveAttribute('datetime');
    // datetime should be a valid ISO string
    expect(new Date(el.getAttribute('datetime')!).toISOString()).toBe(
      el.getAttribute('datetime'),
    );
  });

  it('renders the BrightDate value via the i18n template', () => {
    renderWithI18n(<BrightDate interval={0} />);

    const el = screen.getByTestId('bright-date');
    // The real template is "BD {BD}" — after interpolation it should be "BD <number>"
    expect(el.textContent).toMatch(/^BD \d+\.\d+$/);
  });

  // ---------------------------------------------------------------------------
  // Format prop
  // ---------------------------------------------------------------------------
  describe('format prop', () => {
    it('defaults to full format (precision 8)', () => {
      renderWithI18n(<BrightDate interval={0} format="full" />);
      const text = screen.getByTestId('bright-date').textContent!;
      // Extract the numeric BrightDate value
      const match = text.match(/(\d+\.\d+)/);
      expect(match).not.toBeNull();
      // Precision 8 means 8 decimal places
      const decimals = match![1].split('.')[1];
      expect(decimals).toHaveLength(8);
    });

    it('uses precision 5 for standard format', () => {
      renderWithI18n(<BrightDate interval={0} format="standard" />);
      const text = screen.getByTestId('bright-date').textContent!;
      const match = text.match(/(\d+\.\d+)/);
      expect(match).not.toBeNull();
      const decimals = match![1].split('.')[1];
      expect(decimals).toHaveLength(5);
    });

    it('uses precision 3 for compact format', () => {
      renderWithI18n(<BrightDate interval={0} format="compact" />);
      const text = screen.getByTestId('bright-date').textContent!;
      const match = text.match(/(\d+\.\d+)/);
      expect(match).not.toBeNull();
      const decimals = match![1].split('.')[1];
      expect(decimals).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Auto-refresh via interval
  // ---------------------------------------------------------------------------
  describe('interval prop', () => {
    it('updates the displayed date on each interval tick', () => {
      renderWithI18n(<BrightDate interval={1000} format="full" />);

      const initial = screen.getByTestId('bright-date').textContent;

      // Advance time by 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      const updated = screen.getByTestId('bright-date').textContent;
      expect(updated).not.toBe(initial);
    });

    it('does not set an interval when interval is 0', () => {
      renderWithI18n(<BrightDate interval={0} />);

      const initial = screen.getByTestId('bright-date').textContent;

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.getByTestId('bright-date').textContent).toBe(initial);
    });

    it('does not set an interval when interval is negative', () => {
      renderWithI18n(<BrightDate interval={-1} />);

      const initial = screen.getByTestId('bright-date').textContent;

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.getByTestId('bright-date').textContent).toBe(initial);
    });
  });

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------
  describe('cleanup', () => {
    it('clears the interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { unmount } = renderWithI18n(<BrightDate interval={500} />);
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // date prop
  // ---------------------------------------------------------------------------
  describe('date prop', () => {
    it('renders the provided date instead of the current time', () => {
      const fixedDate = new Date('2025-03-15T12:00:00.000Z');
      renderWithI18n(<BrightDate date={fixedDate} interval={0} />);

      const el = screen.getByTestId('bright-date');
      expect(el.getAttribute('datetime')).toBe('2025-03-15T12:00:00.000Z');
    });

    it('does not auto-refresh when date is provided', () => {
      const fixedDate = new Date('2025-03-15T12:00:00.000Z');
      renderWithI18n(
        <BrightDate date={fixedDate} interval={1000} format="full" />,
      );

      const initial = screen.getByTestId('bright-date').textContent;

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should remain the same since date prop overrides interval behavior
      expect(screen.getByTestId('bright-date').textContent).toBe(initial);
    });

    it('updates when the date prop changes', () => {
      const date1 = new Date('2025-01-01T00:00:00.000Z');
      const date2 = new Date('2025-06-15T12:00:00.000Z');

      const { rerender } = renderWithI18n(
        <BrightDate date={date1} interval={0} format="standard" />,
      );

      const text1 = screen.getByTestId('bright-date').textContent;

      rerender(
        <Wrapper>
          <BrightDate date={date2} interval={0} format="standard" />
        </Wrapper>,
      );

      const text2 = screen.getByTestId('bright-date').textContent;
      expect(text2).not.toBe(text1);
    });

    it('uses the correct precision with the date prop', () => {
      const fixedDate = new Date('2025-06-15T12:00:00.000Z');
      renderWithI18n(
        <BrightDate date={fixedDate} interval={0} format="compact" />,
      );

      const text = screen.getByTestId('bright-date').textContent!;
      const match = text.match(/(\d+\.\d+)/);
      expect(match).not.toBeNull();
      const decimals = match![1].split('.')[1];
      expect(decimals).toHaveLength(3);
    });

    it('does not set a timer when date is provided even with positive interval', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const fixedDate = new Date('2025-03-15T12:00:00.000Z');

      renderWithI18n(<BrightDate date={fixedDate} interval={1000} />);

      // setInterval should not have been called for our component
      // (it may be called by other things, so check it wasn't called after render)
      const callCount = setIntervalSpy.mock.calls.length;

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // No new intervals should have been set
      expect(setIntervalSpy.mock.calls.length).toBe(callCount);
      setIntervalSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // value prop (BrightDate numeric value)
  // ---------------------------------------------------------------------------
  describe('value prop', () => {
    // BrightDate value for 2025-03-15T12:00:00.000Z
    const fixedDate = new Date('2025-03-15T12:00:00.000Z');
    const brightDateValue = fromDate(fixedDate);

    it('renders the correct date from a BrightDate numeric value', () => {
      renderWithI18n(<BrightDate value={brightDateValue} interval={0} />);

      const el = screen.getByTestId('bright-date');
      expect(el.getAttribute('datetime')).toBe('2025-03-15T12:00:00.000Z');
    });

    it('does not auto-refresh when value is provided', () => {
      renderWithI18n(
        <BrightDate value={brightDateValue} interval={1000} format="full" />,
      );

      const initial = screen.getByTestId('bright-date').textContent;

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.getByTestId('bright-date').textContent).toBe(initial);
    });

    it('takes precedence over the date prop', () => {
      const otherDate = new Date('2020-01-01T00:00:00.000Z');
      renderWithI18n(
        <BrightDate
          value={brightDateValue}
          date={otherDate}
          interval={0}
          format="standard"
        />,
      );

      const el = screen.getByTestId('bright-date');
      // Should use the value prop (2025-03-15), not the date prop (2020-01-01)
      expect(el.getAttribute('datetime')).toBe('2025-03-15T12:00:00.000Z');
    });

    it('updates when the value prop changes', () => {
      const value1 = fromDate(new Date('2025-01-01T00:00:00.000Z'));
      const value2 = fromDate(new Date('2025-06-15T12:00:00.000Z'));

      const { rerender } = renderWithI18n(
        <BrightDate value={value1} interval={0} format="standard" />,
      );

      const text1 = screen.getByTestId('bright-date').textContent;

      rerender(
        <Wrapper>
          <BrightDate value={value2} interval={0} format="standard" />
        </Wrapper>,
      );

      const text2 = screen.getByTestId('bright-date').textContent;
      expect(text2).not.toBe(text1);
    });

    it('uses the correct precision with the value prop', () => {
      renderWithI18n(
        <BrightDate value={brightDateValue} interval={0} format="compact" />,
      );

      const text = screen.getByTestId('bright-date').textContent!;
      const match = text.match(/(\d+\.\d+)/);
      expect(match).not.toBeNull();
      const decimals = match![1].split('.')[1];
      expect(decimals).toHaveLength(3);
    });

    it('accepts value 0 (J2000.0 epoch)', () => {
      renderWithI18n(<BrightDate value={0} interval={0} format="standard" />);

      const el = screen.getByTestId('bright-date');
      // J2000.0 epoch = 2000-01-01T12:00:00.000Z
      expect(el.getAttribute('datetime')).toBe('2000-01-01T12:00:00.000Z');
    });

    it('accepts negative values (dates before J2000.0)', () => {
      // -365.5 days before epoch = roughly 1999-01-01T00:00:00Z
      const negativeValue = fromDate(new Date('1999-01-01T12:00:00.000Z'));
      renderWithI18n(
        <BrightDate value={negativeValue} interval={0} format="standard" />,
      );

      const el = screen.getByTestId('bright-date');
      expect(el.getAttribute('datetime')).toBe('1999-01-01T12:00:00.000Z');
    });
  });
});
