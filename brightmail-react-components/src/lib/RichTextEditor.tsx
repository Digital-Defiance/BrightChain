/**
 * RichTextEditor — WYSIWYG email body editor wrapping Tiptap with MUI-styled toolbar.
 *
 * Provides bold, italic, underline, ordered list, unordered list, and link
 * formatting controls. Sanitizes pasted HTML via Tiptap's schema (strips
 * scripts, event handlers). Falls back to a plain MUI TextField if Tiptap
 * fails to initialize.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.6
 */

import { BrightMailStrings } from '@brightchain/brightmail-lib';
import FormatBold from '@mui/icons-material/FormatBold';
import FormatItalic from '@mui/icons-material/FormatItalic';
import FormatListBulleted from '@mui/icons-material/FormatListBulleted';
import FormatListNumbered from '@mui/icons-material/FormatListNumbered';
import FormatUnderlined from '@mui/icons-material/FormatUnderlined';
import InsertLink from '@mui/icons-material/InsertLink';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  FC,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useBrightMailTranslation } from './hooks/useBrightMailTranslation';

// ─── Pure utility functions (exported for property testing) ─────────────────

/**
 * Strips script tags, event handler attributes, and javascript: URIs from HTML.
 * This is a supplementary sanitizer — Tiptap's schema already strips most
 * unsafe content, but this provides an extra layer for property testing.
 */
export function sanitizeHtml(html: string): string {
  // Remove <script> tags and their content (case-insensitive, handles attributes)
  let result = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    '',
  );
  // Remove self-closing script tags
  result = result.replace(/<script\b[^>]*\/>/gi, '');
  // Remove orphaned opening script tags (no closing tag)
  result = result.replace(/<script\b[^>]*>/gi, '');

  // Remove inline event handler attributes (onclick, onerror, onload, onmouseover, etc.)
  result = result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // Remove javascript: URIs in href/src/action attributes
  result = result.replace(
    /(href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi,
    '',
  );
  // Also handle unquoted javascript: URIs
  result = result.replace(/(href|src|action)\s*=\s*javascript:[^\s>]*/gi, '');

  return result;
}

/**
 * Extracts plain text content from HTML, removing all tags.
 * Preserves text node content while stripping all markup.
 */
export function extractPlainText(html: string): string {
  // Replace <br> and block-level closing tags with newlines for readability
  let result = html.replace(/<br\s*\/?>/gi, '\n');
  result = result.replace(/<\/(?:p|div|li|h[1-6]|blockquote|tr)>/gi, '\n');
  // Remove all remaining HTML tags
  result = result.replace(/<[^>]*>/g, '');
  // Decode common HTML entities
  result = result.replace(/&amp;/g, '&');
  result = result.replace(/&lt;/g, '<');
  result = result.replace(/&gt;/g, '>');
  result = result.replace(/&quot;/g, '"');
  result = result.replace(/&#39;/g, "'");
  result = result.replace(/&nbsp;/g, ' ');
  // Collapse multiple consecutive newlines
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RichTextEditorProps {
  /** Current HTML content */
  value: string;
  /** Called when content changes with both HTML and plain text */
  onChange: (html: string, text: string) => void;
}

// ─── Toolbar ────────────────────────────────────────────────────────────────

interface ToolbarButtonConfig {
  icon: typeof FormatBold;
  command: string;
  /** Tiptap mark/node name for active state detection */
  activeName: string;
}

const TOOLBAR_BUTTONS: ToolbarButtonConfig[] = [
  { icon: FormatBold, command: 'bold', activeName: 'bold' },
  {
    icon: FormatItalic,
    command: 'italic',
    activeName: 'italic',
  },
  {
    icon: FormatUnderlined,
    command: 'underline',
    activeName: 'underline',
  },
  {
    icon: FormatListNumbered,
    command: 'orderedList',
    activeName: 'orderedList',
  },
  {
    icon: FormatListBulleted,
    command: 'bulletList',
    activeName: 'bulletList',
  },
  {
    icon: InsertLink,
    command: 'link',
    activeName: 'link',
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

const RichTextEditor: FC<RichTextEditorProps> = ({ value, onChange }) => {
  const theme = useTheme();
  const { t } = useBrightMailTranslation();
  const [fallback, setFallback] = useState(false);
  const [fallbackValue, setFallbackValue] = useState(value);
  const isInternalUpdate = useRef(false);

  // Map toolbar button commands to translated labels
  const toolbarButtonLabels = useMemo<Record<string, string>>(
    () => ({
      bold: t(BrightMailStrings.RichText_Bold),
      italic: t(BrightMailStrings.RichText_Italic),
      underline: t(BrightMailStrings.RichText_Underline),
      orderedList: t(BrightMailStrings.RichText_OrderedList),
      bulletList: t(BrightMailStrings.RichText_UnorderedList),
      link: t(BrightMailStrings.RichText_Link),
    }),
    [t],
  );

  // Tiptap extensions
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        // StarterKit includes bold, italic, bulletList, orderedList, etc.
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
    ],
    [],
  );

  let editor = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    editor = useEditor({
      extensions,
      content: value,
      onUpdate: ({ editor: ed }) => {
        const html = ed.getHTML();
        const text = ed.getText();
        isInternalUpdate.current = true;
        onChange(html, text);
      },
    });
  } catch (err) {
    // Tiptap failed to initialize — fall back to plain TextField
    console.error('RichTextEditor: Tiptap failed to initialize', err);
    if (!fallback) {
      setFallback(true);
    }
  }

  // Sync external value changes into the editor
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  // Detect editor initialization failure after mount
  useEffect(() => {
    if (!editor && !fallback) {
      // Give Tiptap a tick to initialize, then fall back
      const timer = setTimeout(() => {
        if (!editor) {
          console.error(
            'RichTextEditor: Tiptap editor did not initialize, falling back to TextField',
          );
          setFallback(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [editor, fallback]);

  const handleToolbarAction = useCallback(
    (command: string) => {
      if (!editor) return;
      switch (command) {
        case 'bold':
          editor.chain().focus().toggleBold().run();
          break;
        case 'italic':
          editor.chain().focus().toggleItalic().run();
          break;
        case 'underline':
          editor.chain().focus().toggleUnderline().run();
          break;
        case 'orderedList':
          editor.chain().focus().toggleOrderedList().run();
          break;
        case 'bulletList':
          editor.chain().focus().toggleBulletList().run();
          break;
        case 'link': {
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
          } else {
            const url = window.prompt(t(BrightMailStrings.RichText_EnterUrl));
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }
          break;
        }
        default:
          break;
      }
    },
    [editor],
  );

  // ─── Fallback: plain TextField ──────────────────────────────────────────

  if (fallback) {
    return (
      <TextField
        data-testid="rich-text-fallback"
        multiline
        minRows={4}
        fullWidth
        value={fallbackValue}
        onChange={(e) => {
          const text = e.target.value;
          setFallbackValue(text);
          onChange(text, text);
        }}
        placeholder={t(BrightMailStrings.RichText_Placeholder)}
        variant="outlined"
      />
    );
  }

  // ─── Tiptap editor ─────────────────────────────────────────────────────

  return (
    <Box data-testid="rich-text-editor">
      {/* Formatting Toolbar — keyboard-accessible (Requirement 4.6) */}
      <Box
        data-testid="formatting-toolbar"
        role="toolbar"
        aria-label={t(BrightMailStrings.RichText_ToolbarLabel)}
        sx={{
          display: 'flex',
          gap: 0.25,
          borderBottom: `1px solid ${theme.palette.divider}`,
          pb: 0.5,
          mb: 0.5,
        }}
      >
        {TOOLBAR_BUTTONS.map((btn) => {
          const Icon = btn.icon;
          const isActive = editor?.isActive(btn.activeName) ?? false;
          const label = toolbarButtonLabels[btn.command] ?? btn.command;
          return (
            <Tooltip key={btn.command} title={label}>
              <IconButton
                data-testid={`toolbar-${btn.command}`}
                aria-label={label}
                aria-pressed={isActive}
                size="small"
                color={isActive ? 'primary' : 'default'}
                onClick={() => handleToolbarAction(btn.command)}
                tabIndex={0}
              >
                <Icon fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        })}
      </Box>

      {/* Editor content area styled to match MUI TextField */}
      <Box
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          p: 1,
          minHeight: 120,
          '& .ProseMirror': {
            outline: 'none',
            minHeight: 100,
            '& p': { margin: 0 },
            '& ul, & ol': { paddingLeft: theme.spacing(3) },
          },
          '& .ProseMirror:focus': {
            outline: 'none',
          },
          '&:focus-within': {
            borderColor: theme.palette.primary.main,
            borderWidth: 2,
          },
        }}
      >
        <EditorContent editor={editor} data-testid="editor-content" />
      </Box>
    </Box>
  );
};

export default memo(RichTextEditor);
