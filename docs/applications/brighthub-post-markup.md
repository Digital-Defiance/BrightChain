---
title: "BrightHub Social Network - Font Awesome Post Markup Syntax"
parent: "Applications"
nav_order: 4
---
## Icon Markup

- Basic Icon: `{{heart}}` renders as a regular heart icon
- Styled Icon: `{{solid heart}}` renders as a solid heart icon

### Available Styles and Families

The first token in the markup can be any FA7 style or family name.
Family tokens automatically expand to the correct CSS class pair
(e.g. `chisel` → `fa-chisel fa-regular`).

**Styles**: solid, regular, light, thin, duotone, brands, semibold

**Families** (each has a single default style):

| Family | Default Style | Example Markup | CSS Output |
|---|---|---|---|
| classic | *(implicit)* | `{{solid heart}}` | `fa-solid fa-heart` |
| sharp | *(use compound)* | `{{sharpsolid heart}}` | `fa-sharp fa-solid fa-heart` |
| sharp-duotone | solid | `{{sharp-duotone heart}}` | `fa-sharp-duotone fa-solid fa-heart` |
| chisel | regular | `{{chisel heart}}` | `fa-chisel fa-regular fa-heart` |
| etch | solid | `{{etch heart}}` | `fa-etch fa-solid fa-heart` |
| graphite | thin | `{{graphite heart}}` | `fa-graphite fa-thin fa-heart` |
| jelly | regular | `{{jelly heart}}` | `fa-jelly fa-regular fa-heart` |
| jelly-duo | regular | `{{jelly-duo heart}}` | `fa-jelly-duo fa-regular fa-heart` |
| jelly-fill | regular | `{{jelly-fill heart}}` | `fa-jelly-fill fa-regular fa-heart` |
| notdog | solid | `{{notdog heart}}` | `fa-notdog fa-solid fa-heart` |
| notdog-duo | solid | `{{notdog-duo heart}}` | `fa-notdog-duo fa-solid fa-heart` |
| slab | regular | `{{slab heart}}` | `fa-slab fa-regular fa-heart` |
| slab-press | regular | `{{slab-press heart}}` | `fa-slab-press fa-regular fa-heart` |
| thumbprint | light | `{{thumbprint heart}}` | `fa-thumbprint fa-light fa-heart` |
| utility | semibold | `{{utility heart}}` | `fa-utility fa-semibold fa-heart` |
| utility-duo | semibold | `{{utility-duo heart}}` | `fa-utility-duo fa-semibold fa-heart` |
| utility-fill | semibold | `{{utility-fill heart}}` | `fa-utility-fill fa-semibold fa-heart` |
| whiteboard | semibold | `{{whiteboard heart}}` | `fa-whiteboard fa-semibold fa-heart` |

**Compound tokens** (legacy shorthand for sharp family):
sharpsolid, sharpregular, sharplight, sharpthin

**Compound tokens** (duotone variants):
duotoneregular, duotonelight, duotonethin

**Compound tokens** (sharp-duotone variants):
sharpduotonesolid, sharpduotoneregular, sharpduotonelight, sharpduotonethin

### Sizes

**Relative (t-shirt)**: 2xs, xs, sm, lg, xl, 2xl

**Literal**: 1x, 2x, 3x, 4x, 5x, 6x, 7x, 8x, 9x, 10x

Size Example: `{{solid heart lg}}` renders a large solid heart icon

### Animations

spin, spin-reverse, spin-pulse, pulse (deprecated alias), beat, beat-fade, bounce, fade, flip, shake

Animation Example: `{{solid heart spin}}` renders a spinning solid heart icon

### Rotation & Flipping

rotate-90, rotate-180, rotate-270, rotate-by, flip-horizontal, flip-vertical, flip-both

### Fixed Width & Utilities

fw, width-auto, border, pull-start, pull-end, pull-left (legacy), pull-right (legacy)

### Stacking & Duotone

stack-1x, stack-2x, inverse, swap-opacity

### Lists

li, ul

### Combined Usage

`{{solid heart lg spin}}` renders a large, spinning, solid heart icon

### Custom Styled Icon

`{{solid heart; color: red; font-size: 20px;}}` renders as a red, 20px solid heart icon. CSS styles are added after a semicolon.

### Custom Style Order

When using icons, follow this order:

1. Icon style/family (optional, e.g., solid, jelly, sharp-duotone)
2. Icon name (required, e.g., heart, gear)
3. Additional properties (optional, e.g., lg, spin, flip-horizontal)
4. Semicolon (;) — only if adding CSS styles
5. CSS styles (optional)

Examples:

- Basic: `{{heart}}`
- With style: `{{solid heart}}`
- With family: `{{jelly heart}}`
- With properties: `{{heart lg spin}}`
- With CSS: `{{heart; color: red; font-size: 20px;}}`
- Full example: `{{solid heart lg spin; color: red; font-size: 20px;}}`
- Specialty family: `{{chisel star bounce; color: blue}}`

Remember: Only the icon name is required. All other elements are optional.

### Disallowed CSS Properties

For security, these CSS properties are blocked in custom styles: display, position, top, left, right, bottom, z-index, margin, padding.

## Character Counting

- Emoji: Each emoji counts as 1 character
- Unicode Characters: Each Unicode character counts as 1 character
- Icon Markup: Valid icon markup (e.g., {{heart}}) counts as 1 character
- Newlines: Each newline (CR/LF) counts as 1 character
- Links: Each link counts as 1 character, plus the visible text

## Blog Post Formatting

Blog posts support full Markdown syntax in addition to the custom icon markup. This includes:

- Headers (# H1, ## H2, etc.)
- Code blocks (`code`)
- Tables
- And more!

Note: HTML tags are stripped for security reasons. Use Markdown and icon markup for formatting.

For more detailed styling options, refer to the [FontAwesome Style Cheatsheet](https://docs.fontawesome.com/web/style/style-cheatsheet). Our markup is a custom shorthand for this.
