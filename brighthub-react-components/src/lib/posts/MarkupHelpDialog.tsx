/**
 * MarkupHelpDialog Component
 *
 * Displays a tabbed reference guide for post formatting and icon markup
 * syntax. Content is derived from the post-markup and font-markup docs,
 * rendered via the same markdown pipeline used for blog posts.
 *
 * Tab 1: General post formatting (character counting, markdown, icon overview)
 * Tab 2: Detailed Font Awesome icon markup reference
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import { parseMarkdown } from '@brightchain/brighthub-lib';
import { Close } from '@mui/icons-material';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
} from '@mui/material';
import { type SyntheticEvent, useMemo, useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** General post formatting help — kept in sync with docs/brighthub/post-markup.md */
const POST_HELP_MD = `
## Icon Markup

- Basic Icon: \`{{heart}}\` renders as a regular heart icon
- Styled Icon: \`{{solid heart}}\` renders as a solid heart icon

### Available Styles and Families

The first token in the markup can be any FA7 style or family:

**Styles**: solid, regular, light, thin, duotone, brands, semibold

**Families**: classic, sharp, sharp-duotone, chisel, etch, graphite, jelly, jelly-duo, jelly-fill, notdog, notdog-duo, slab, slab-press, thumbprint, utility, utility-duo, utility-fill, whiteboard

**Legacy**: sharpsolid (expands to \`fa-sharp fa-solid\`)

### Sizes

**Relative (t-shirt)**: 2xs, xs, sm, lg, xl, 2xl

**Literal**: 1x, 2x, 3x, 4x, 5x, 6x, 7x, 8x, 9x, 10x

### Animations

spin, spin-reverse, spin-pulse, pulse (deprecated alias), beat, beat-fade, bounce, fade, flip, shake

### Rotation & Flipping

rotate-90, rotate-180, rotate-270, rotate-by, flip-horizontal, flip-vertical, flip-both

### Utilities

fw, width-auto, border, pull-start, pull-end, stack-1x, stack-2x, inverse, swap-opacity, li, ul

### Custom Style Order

1. Icon style/family (optional, e.g., solid, jelly, sharp-duotone)
2. Icon name (required, e.g., heart, gear)
3. Additional properties (optional, e.g., lg, spin)
4. Semicolon (;) — only if adding CSS styles
5. CSS styles (optional)

Examples:

- \`{{heart}}\`
- \`{{solid heart}}\`
- \`{{heart lg spin}}\`
- \`{{solid heart lg spin; color: red; font-size: 20px;}}\`

## Character Counting

- Emoji: Each emoji counts as 1 character
- Unicode Characters: Each Unicode character counts as 1 character
- Icon Markup: Valid icon markup (e.g., \`{{heart}}\`) counts as 1 character
- Newlines: Each newline (CR/LF) counts as 1 character
- Links: Each link counts as 1 character, plus the visible text

## Blog Post Formatting

Blog posts support full Markdown syntax in addition to the custom icon markup. This includes:

- Headers (# H1, ## H2, etc.)
- Code blocks
- Tables
- And more!

Note: HTML tags are stripped for security reasons. Use Markdown and icon markup for formatting.
`.trim();

/** Detailed icon markup reference — kept in sync with docs/brighthub/font-markup.md */
const ICON_HELP_MD = `
# Font Awesome Icon Markup Syntax

The icon markup syntax provides a flexible way to insert Font Awesome icons into text with optional styling. The syntax is enclosed in double curly braces \`{{ }}\`.

## Basic Syntax

\`\`\`
{{iconName}}
\`\`\`

- Renders as \`fa-regular fa-iconName\`
- Example: \`{{heart}}\` becomes \`<i class="fa-regular fa-heart" style="display: inline-block;"></i>\`

## Specifying Icon Style

\`\`\`
{{style iconName}}
\`\`\`

The first token can be any valid Font Awesome 7 style or family name:

**Styles** (apply within a family):
solid, regular, light, thin, duotone, brands, semibold

**Families**:
classic, sharp, sharp-duotone, chisel, etch, graphite, jelly, jelly-duo, jelly-fill, notdog, notdog-duo, slab, slab-press, thumbprint, utility, utility-duo, utility-fill, whiteboard

**Legacy compound**:
sharpsolid (expands to \`fa-sharp fa-solid\`)

Examples:
- \`{{solid heart}}\` becomes \`<i class="fa-solid fa-heart" style="display: inline-block;"></i>\`
- \`{{sharpsolid heart}}\` becomes \`<i class="fa-sharp fa-solid fa-heart" style="display: inline-block;"></i>\`
- \`{{jelly gear}}\` becomes \`<i class="fa-jelly fa-gear" style="display: inline-block;"></i>\`

## Additional Classes

\`\`\`
{{style iconName additionalClass1 additionalClass2 ...}}
\`\`\`

Additional classes are prefixed with \`fa-\` automatically. The full list:

**Relative sizing (t-shirt sizes)**: 2xs, xs, sm, lg, xl, 2xl

**Literal sizing**: 1x, 2x, 3x, 4x, 5x, 6x, 7x, 8x, 9x, 10x

**Animations**: spin, spin-reverse, spin-pulse, pulse (deprecated alias for spin-pulse), beat, beat-fade, bounce, fade, flip, shake

**Rotation & flipping**: rotate-90, rotate-180, rotate-270, rotate-by, flip-horizontal, flip-vertical, flip-both

**Fixed width & canvas**: fw, width-auto

**Bordered & pulled**: border, pull-start, pull-end, pull-left (legacy), pull-right (legacy)

**Stacking**: stack-1x, stack-2x, inverse

**Duotone**: swap-opacity

**Lists**: li, ul

Example: \`{{solid heart lg spin}}\` becomes \`<i class="fa-solid fa-heart fa-lg fa-spin" style="display: inline-block;"></i>\`

## Custom Styling

\`\`\`
{{style iconName additionalClasses; style1; style2; ...}}
\`\`\`

- CSS styles can be added after a semicolon
- Example: \`{{solid heart; color: red; font-size: 20px;}}\` becomes \`<i class="fa-solid fa-heart" style="display: inline-block; color: red; font-size: 20px;"></i>\`

## Important Notes

1. The \`display: inline-block;\` style is always included and cannot be overridden.
2. Multiple icons can be used in a single string.
3. Invalid markup is left untouched in the output.
4. The parser sanitizes and validates CSS styles for security.
5. Certain CSS properties are disallowed: display, position, top, left, right, bottom, z-index, margin, padding.
6. Icon names and prefixes are derived at runtime from the Font Awesome kit — they update automatically when the kit is upgraded.
`.trim();

/** Shared sx for the rendered markdown content area */
const contentSx = {
  '& h1': { mt: 1, mb: 1, fontSize: '1.35rem' },
  '& h2': { mt: 2, mb: 1, fontSize: '1.25rem' },
  '& h3': { mt: 1.5, mb: 0.5, fontSize: '1.1rem' },
  '& p': { my: 0.5 },
  '& code': {
    bgcolor: 'action.hover',
    px: 0.5,
    borderRadius: 0.5,
    fontSize: '0.875em',
  },
  '& pre': {
    bgcolor: 'action.hover',
    p: 1.5,
    borderRadius: 1,
    overflow: 'auto',
    '& code': { bgcolor: 'transparent', p: 0 },
  },
  '& ol, & ul': { pl: 3 },
  '& li': { mb: 0.25 },
  wordBreak: 'break-word',
} as const;

export interface MarkupHelpDialogProps {
  open: boolean;
  onClose: () => void;
  /** Which tab to open initially: 0 = post formatting, 1 = icon markup */
  initialTab?: number;
}

export function MarkupHelpDialog({
  open,
  onClose,
  initialTab = 0,
}: MarkupHelpDialogProps) {
  const { t } = useBrightHubTranslation();
  const [tab, setTab] = useState(initialTab);

  const postHtml = useMemo(() => parseMarkdown(POST_HELP_MD), []);
  const iconHtml = useMemo(() => parseMarkdown(ICON_HELP_MD), []);

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-label={t(BrightHubStrings.PostComposer_MarkupHelpAriaLabel)}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 0,
        }}
      >
        {t(BrightHubStrings.PostComposer_MarkupHelp)}
        <IconButton
          onClick={onClose}
          size="small"
          aria-label={t(BrightHubStrings.PostComposer_MarkupHelpClose)}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <Tabs
        value={tab}
        onChange={handleTabChange}
        sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={t(BrightHubStrings.PostComposer_MarkupHelpTabPost)} />
        <Tab label={t(BrightHubStrings.PostComposer_MarkupHelpTabIcons)} />
      </Tabs>
      <DialogContent dividers sx={{ pt: 1 }}>
        <Box
          role="tabpanel"
          hidden={tab !== 0}
          sx={contentSx}
          dangerouslySetInnerHTML={tab === 0 ? { __html: postHtml } : undefined}
        />
        <Box
          role="tabpanel"
          hidden={tab !== 1}
          sx={contentSx}
          dangerouslySetInnerHTML={tab === 1 ? { __html: iconHtml } : undefined}
        />
      </DialogContent>
    </Dialog>
  );
}

export default MarkupHelpDialog;
