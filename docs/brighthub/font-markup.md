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

The first token can be any valid Font Awesome 7 style or family name:

**Styles** (apply within a family):
solid, regular, light, thin, duotone, brands, semibold

**Families**:
classic, sharp, sharp-duotone, chisel, etch, graphite, jelly, jelly-duo, jelly-fill, notdog, notdog-duo, slab, slab-press, thumbprint, utility, utility-duo, utility-fill, whiteboard

**Legacy compound**:
sharpsolid (expands to `fa-sharp fa-solid`)

Examples:
- `{{solid heart}}` becomes `<i class="fa-solid fa-heart" style="display: inline-block;"></i>`
- `{{sharpsolid heart}}` becomes `<i class="fa-sharp fa-solid fa-heart" style="display: inline-block;"></i>`
- `{{jelly gear}}` becomes `<i class="fa-jelly fa-gear" style="display: inline-block;"></i>`

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

## Important Notes

1. The `display: inline-block;` style is always included and cannot be overridden.
2. Multiple icons can be used in a single string.
3. Invalid markup is left untouched in the output.
4. The parser sanitizes and validates CSS styles for security.
5. Certain CSS properties are disallowed: display, position, top, left, right, bottom, z-index, margin, padding.
6. Icon names and prefixes are derived at runtime from the Font Awesome kit — they update automatically when the kit is upgraded.
