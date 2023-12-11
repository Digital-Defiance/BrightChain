# Font Awesome Icon Markup Syntax

The icon markup syntax provides a flexible way to insert Font Awesome icons into text with optional styling. The syntax is enclosed in double curly braces `{{ }}`.

## Basic Syntax

```
{{iconName}}
```

- Renders as `fa-regular fa-iconName`
- Example: `{{heart}}` becomes `<i class="fa-regular fa-heart" style="display: inline-block;"></i>`

## Specifying Icon Style

```
{{style iconName}}
```

The first token can be any valid Font Awesome 7 style or family name.
Family tokens automatically expand to the correct CSS class pair
(e.g. `chisel` → `fa-chisel fa-regular`).

**Styles** (apply within a family):
solid, regular, light, thin, duotone, brands, semibold

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

Examples:
- `{{solid heart}}` becomes `<i class="fa-solid fa-heart" style="display: inline-block;"></i>`
- `{{sharpsolid heart}}` becomes `<i class="fa-sharp fa-solid fa-heart" style="display: inline-block;"></i>`
- `{{sharplight heart}}` becomes `<i class="fa-sharp fa-light fa-heart" style="display: inline-block;"></i>`
- `{{duotoneregular gear}}` becomes `<i class="fa-duotone fa-regular fa-gear" style="display: inline-block;"></i>`
- `{{sharpduotonesolid star}}` becomes `<i class="fa-sharp-duotone fa-solid fa-star" style="display: inline-block;"></i>`
- `{{jelly gear}}` becomes `<i class="fa-jelly fa-regular fa-gear" style="display: inline-block;"></i>`
- `{{chisel star}}` becomes `<i class="fa-chisel fa-regular fa-star" style="display: inline-block;"></i>`
- `{{utility bolt}}` becomes `<i class="fa-utility fa-semibold fa-bolt" style="display: inline-block;"></i>`

## Additional Classes

```
{{style iconName additionalClass1 additionalClass2 ...}}
```

Additional classes are prefixed with `fa-` automatically. The full list:

**Relative sizing (t-shirt sizes)**: 2xs, xs, sm, lg, xl, 2xl

**Literal sizing**: 1x, 2x, 3x, 4x, 5x, 6x, 7x, 8x, 9x, 10x

**Animations**: spin, spin-reverse, spin-pulse, pulse (deprecated alias for spin-pulse), beat, beat-fade, bounce, fade, flip, shake

**Rotation & flipping**: rotate-90, rotate-180, rotate-270, rotate-by, flip-horizontal, flip-vertical, flip-both

**Fixed width & canvas**: fw, width-auto

**Bordered & pulled**: border, pull-start, pull-end, pull-left (legacy), pull-right (legacy)

**Stacking**: stack-1x, stack-2x, inverse

**Duotone**: swap-opacity

**Lists**: li, ul

Example: `{{solid heart lg spin}}` becomes `<i class="fa-solid fa-heart fa-lg fa-spin" style="display: inline-block;"></i>`

## Custom Styling

```
{{style iconName additionalClasses; style1; style2; ...}}
```

- CSS styles can be added after a semicolon
- Example: `{{solid heart; color: red; font-size: 20px;}}` becomes `<i class="fa-solid fa-heart" style="display: inline-block; color: red; font-size: 20px;"></i>`
- Example: `{{chisel star bounce; color: blue}}` becomes `<i class="fa-chisel fa-regular fa-star fa-bounce" style="display: inline-block; color: blue"></i>`

## Important Notes

1. The `display: inline-block;` style is always included and cannot be overridden.
2. Multiple icons can be used in a single string.
3. Invalid markup is left untouched in the output.
4. The parser sanitizes and validates CSS styles for security.
5. Certain CSS properties are disallowed: display, position, top, left, right, bottom, z-index, margin, padding.
6. Icon names and prefixes are derived at runtime from the Font Awesome kit — they update automatically when the kit is upgraded.
