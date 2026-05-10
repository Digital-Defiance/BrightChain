/**
 * Unit tests for RichTextEditor component.
 *
 * Tests: toolbar button presence (bold, italic, underline, ol, ul, link),
 * keyboard accessibility (Tab/Enter/Space), fallback to TextField on init failure.
 *
 * Requirements: 4.2, 4.6
 */

import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';

// Import after mocks
import RichTextEditor, { type RichTextEditorProps } from '../RichTextEditor';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Controlled mock editor object — tests can override via `mockEditorInstance`
let mockEditorInstance: Record<string, unknown> | null = {};

function createMockEditor() {
  const chainMethods: Record<string, () => Record<string, unknown>> = {};
  const chain: Record<string, unknown> = new Proxy(chainMethods, {
    get: (_target, prop) => {
      if (prop === 'run') return jest.fn();
      // Every chain method returns the chain itself
      return () => chain;
    },
  });

  return {
    getHTML: jest.fn(() => '<p>test</p>'),
    getText: jest.fn(() => 'test'),
    isDestroyed: false,
    isActive: jest.fn(() => false),
    chain: jest.fn(() => chain),
    commands: {
      setContent: jest.fn(),
    },
  };
}

// Reset the mock editor before each test
beforeEach(() => {
  mockEditorInstance = createMockEditor();
});

jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => mockEditorInstance),
  EditorContent: jest.fn(
    ({ 'data-testid': testId }: { 'data-testid'?: string }) => (
      <div data-testid={testId ?? 'editor-content'}>Editor content area</div>
    ),
  ),
}));

jest.mock('@tiptap/starter-kit', () => ({
  __esModule: true,
  default: { configure: jest.fn(() => ({})) },
}));

jest.mock('@tiptap/extension-underline', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@tiptap/extension-link', () => ({
  __esModule: true,
  default: { configure: jest.fn(() => ({})) },
}));

const mockEngine = {
  translate: jest.fn((_componentId: string, key: string) => key),
  translateEnum: jest.fn((_enumType: unknown, value: unknown) => String(value)),
  registerIfNotExists: jest.fn(),
  registerStringKeyEnum: jest.fn(),
};

jest.mock('@brightchain/brightchain-lib', () => ({
  getBrightChainI18nEngine: () => mockEngine,
}));

jest.mock('@brightchain/brightmail-lib', () => ({
  BrightMailStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => String(p) },
  ),
  BrightMailComponentId: 'BrightMail',
}));

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
    currentLanguage: 'en-US',
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const defaultProps: RichTextEditorProps = {
  value: '<p>Hello</p>',
  onChange: jest.fn(),
};

function renderEditor(overrides: Partial<RichTextEditorProps> = {}) {
  return render(<RichTextEditor {...defaultProps} {...overrides} />);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('RichTextEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEditorInstance = createMockEditor();
  });

  // ── Requirement 4.2: Toolbar button presence ────────────────────────────

  describe('toolbar buttons', () => {
    it('renders the rich-text-editor container', () => {
      renderEditor();
      expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    });

    it('renders the formatting toolbar', () => {
      renderEditor();
      expect(screen.getByTestId('formatting-toolbar')).toBeInTheDocument();
    });

    it('renders the Bold toolbar button with correct aria-label', () => {
      renderEditor();
      const btn = screen.getByTestId('toolbar-bold');
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('aria-label', 'RichText_Bold');
    });

    it('renders the Italic toolbar button with correct aria-label', () => {
      renderEditor();
      const btn = screen.getByTestId('toolbar-italic');
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('aria-label', 'RichText_Italic');
    });

    it('renders the Underline toolbar button with correct aria-label', () => {
      renderEditor();
      const btn = screen.getByTestId('toolbar-underline');
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('aria-label', 'RichText_Underline');
    });

    it('renders the Ordered List toolbar button with correct aria-label', () => {
      renderEditor();
      const btn = screen.getByTestId('toolbar-orderedList');
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('aria-label', 'RichText_OrderedList');
    });

    it('renders the Unordered List toolbar button with correct aria-label', () => {
      renderEditor();
      const btn = screen.getByTestId('toolbar-bulletList');
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('aria-label', 'RichText_UnorderedList');
    });

    it('renders the Link toolbar button with correct aria-label', () => {
      renderEditor();
      const btn = screen.getByTestId('toolbar-link');
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('aria-label', 'RichText_Link');
    });

    it('renders all 6 toolbar buttons', () => {
      renderEditor();
      const toolbar = screen.getByTestId('formatting-toolbar');
      const buttons = toolbar.querySelectorAll('button');
      expect(buttons).toHaveLength(6);
    });
  });

  // ── Requirement 4.6: Keyboard accessibility ─────────────────────────────

  describe('keyboard accessibility', () => {
    it('toolbar buttons have tabIndex={0} for keyboard navigation', () => {
      renderEditor();
      const testIds = [
        'toolbar-bold',
        'toolbar-italic',
        'toolbar-underline',
        'toolbar-orderedList',
        'toolbar-bulletList',
        'toolbar-link',
      ];
      for (const id of testIds) {
        const btn = screen.getByTestId(id);
        expect(btn).toHaveAttribute('tabindex', '0');
      }
    });

    it('toolbar buttons respond to click events', () => {
      renderEditor();
      const boldBtn = screen.getByTestId('toolbar-bold');
      fireEvent.click(boldBtn);

      // The mock editor's chain() should have been called
      expect(
        (mockEditorInstance as Record<string, unknown>)['chain'],
      ).toHaveBeenCalled();
    });

    it('formatting toolbar has role="toolbar" for assistive technology', () => {
      renderEditor();
      const toolbar = screen.getByTestId('formatting-toolbar');
      expect(toolbar).toHaveAttribute('role', 'toolbar');
    });

    it('formatting toolbar has an accessible aria-label', () => {
      renderEditor();
      const toolbar = screen.getByTestId('formatting-toolbar');
      expect(toolbar).toHaveAttribute('aria-label', 'RichText_ToolbarLabel');
    });
  });

  // ── Fallback to TextField on init failure ───────────────────────────────

  describe('fallback behavior', () => {
    it('renders fallback TextField when useEditor returns null', () => {
      // Simulate Tiptap failing to initialize
      mockEditorInstance = null;

      jest.useFakeTimers();
      const { unmount } = renderEditor();

      // Advance past the 100ms fallback timer, wrapped in act to flush state updates
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(screen.getByTestId('rich-text-fallback')).toBeInTheDocument();

      unmount();
      jest.useRealTimers();
    });

    it('fallback TextField does not render the formatting toolbar', () => {
      mockEditorInstance = null;

      jest.useFakeTimers();
      const { container, unmount } = renderEditor();

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // The fallback should be present, toolbar should not
      expect(screen.getByTestId('rich-text-fallback')).toBeInTheDocument();
      expect(
        container.querySelector('[data-testid="formatting-toolbar"]'),
      ).not.toBeInTheDocument();

      unmount();
      jest.useRealTimers();
    });
  });
});
